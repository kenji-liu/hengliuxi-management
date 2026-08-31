#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""資料覆蓋率檢查：問 AI 之前，先確認資料庫裡到底有沒有那件事。

為什麼需要這支
--------------
AI 只能回答索引裡有的內容。實務上「答不準」有三種成因，這支負責診斷第一種：

  ① 資料進不了索引     ← 本工具檢查這一項
  ② 資料在但檢索找不到（異體字、同義詞不合）
  ③ 檢索找到但模型看不到全文（欄位取錯、段落截斷）

先前發生過的實例：問陸域物種一律「查無資料」，原因是 fish.js 從未被索引；
線上只有 2,411 段而本機有 40,861 段，原因是索引檔被 .gitignore 排除。
這些用肉眼看不出來，用本工具一跑就現形。

用法
----
    python scripts/hlx_check_coverage.py 計畫攔砂量 攔砂 淤砂
    python scripts/hlx_check_coverage.py --num 攔砂量 淤積量     # 只算「帶數字與單位」的段落
    python scripts/hlx_check_coverage.py --topic 橫流溪 石虎     # 限定同段須含指定主題詞

輸出說明
--------
  段數    命中的索引片段數；0 代表資料庫裡完全沒有這個詞
  來源檔  命中分布在幾個不同檔案；1 個代表證據單薄
  帶數值  命中段落中同時含數字與單位者；問「多少」類問題時，這欄是 0 就答不出量化結果

離開碼：任一關鍵詞為 0 段時回傳 1，可供批次檢核使用。
"""
from __future__ import annotations

import argparse
import io
import json
import os
import re
import sys
import unicodedata

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
META = os.path.join(ROOT, "webapp", "data", "chunks_meta.jsonl")
STORE = os.path.join(ROOT, "webapp", "data", "vector_store.jsonl")

#  數量詞：判斷段落是否含可用於回答「多少」的量化資訊
UNIT = re.compile(
    r"[\d,]+(?:\.\d+)?\s*(?:m3|m³|立方公尺|萬方|公噸|噸|公頃|ha|公尺|m|公里|km|"
    r"尾|株|種|座|處|次|％|%)")


def norm(s: str) -> str:
    """NFKC 正規化。來源文件經 Big5 轉換後常含 CJK 相容字（U+F900-U+FAFF），
    不正規化會讓「臺灣石魚賓」這類名稱明明在庫裡卻搜不到。"""
    return unicodedata.normalize("NFKC", str(s or ""))


def load_chunks():
    """優先讀 chunks_meta.jsonl（四萬段全文），無則退回 vector_store.jsonl。"""
    path = META if os.path.exists(META) else STORE
    if not os.path.exists(path):
        print(f"找不到索引檔：{META}")
        print("提示：chunks_meta.jsonl 在 .gitignore 內，若剛 clone 需先取得索引。")
        sys.exit(2)
    n = 0
    with io.open(path, encoding="utf-8") as fh:
        for line in fh:
            line = line.strip()
            if not line:
                continue
            try:
                d = json.loads(line)
            except Exception:
                continue
            n += 1
            yield norm(d.get("full_text") or d.get("text") or ""), \
                  str(d.get("source_file") or d.get("source") or "?")
    print(f"（索引來源：{os.path.basename(path)}，共 {n:,} 段）\n", file=sys.stderr)


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("keywords", nargs="+", help="要檢查的關鍵詞")
    ap.add_argument("--topic", default="", help="限定同段須含此主題詞，例如 橫流溪")
    ap.add_argument("--num", action="store_true", help="只統計帶數字與單位的段落")
    ap.add_argument("--show", type=int, default=2, help="每個關鍵詞列出幾則例句")
    args = ap.parse_args()

    kws = [norm(k) for k in args.keywords]
    topic = norm(args.topic)
    stat = {k: {"n": 0, "files": set(), "num": 0, "eg": []} for k in kws}

    for text, src in load_chunks():
        if topic and topic not in text:
            continue
        has_num = bool(UNIT.search(text))
        for k in kws:
            if k not in text:
                continue
            if args.num and not has_num:
                continue
            s = stat[k]
            s["n"] += 1
            s["files"].add(src[:44])
            if has_num:
                s["num"] += 1
            if len(s["eg"]) < args.show:
                i = text.index(k)
                s["eg"].append((src[:34],
                                re.sub(r"\s+", " ", text[max(0, i - 45):i + 75])))

    scope = f"（限定含「{args.topic}」）" if topic else ""
    print(f"關鍵詞覆蓋率{scope}")
    print("-" * 74)
    print(f"{'關鍵詞':<14}{'段數':>7}{'來源檔':>8}{'帶數值':>8}   判讀")
    print("-" * 74)
    missing = 0
    for k in kws:
        s = stat[k]
        if s["n"] == 0:
            verdict = "★ 資料庫沒有 —— AI 必定答不出來"
            missing += 1
        elif len(s["files"]) == 1:
            verdict = "只有單一來源，證據單薄"
        elif s["num"] == 0:
            verdict = "有敘述但無數值，答不了「多少」"
        else:
            verdict = "可支援作答"
        print(f"{k:<14}{s['n']:>7}{len(s['files']):>8}{s['num']:>8}   {verdict}")

    for k in kws:
        if stat[k]["eg"]:
            print(f"\n■ {k}")
            for src, eg in stat[k]["eg"]:
                print(f"   [{src}]\n     …{eg}…")

    if missing:
        print(f"\n有 {missing} 個關鍵詞在索引中完全不存在。")
        print("處理方式：找出含該資訊的文件 → 交由 scripts/index_new_reports.py 建索引；")
        print("若該資訊本來就不存在於任何文件，則不應期待 AI 回答，須先補做調查。")
    return 1 if missing else 0


if __name__ == "__main__":
    raise SystemExit(main())
