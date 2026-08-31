#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""陸域生物與陸域植物清單 → AI 答詢索引
================================================================
為什麼要做：
    平台自己整理的陸域物種清單（鳥類、兩棲爬蟲類、哺乳類、陸域昆蟲，
    含學名、保育等級與棲地備註）與植物優勢種資料，全部寫死在
    webapp/js/modules/fish.js 裡。這個檔案從來沒有進過向量庫，
    而且 answer_engine.filter_retrieved_docs 會把 .js 來源整批濾掉，
    所以 AI 的文件檢索完全看不到它 —— 使用者問特定陸域物種時，
    模型只能回「平台無資料」，但資料其實就在平台上。

    前端 client_snapshot 也只送 facilities／inspections／habitats／
    fishSurveys，沒有帶陸域物種清單。

作法：
    從 fish.js 解析 LAND_LIFE_DATA 與 VEG_DOMINANT，輸出
    webapp/data/terrestrial_species.json，並寫進部署用向量庫。
    每個物種各成一段可檢索文字，讓「某某species 有沒有紀錄」這類
    問題能直接命中。

口徑（依 CLAUDE.md）：
  ・內容照抄 fish.js 既有欄位，不新增、不推估、不改寫保育等級。
  ・每段標明資料來源欄位（source）與所屬調查，讓引用能追溯。
  ・清單本身即為「調查記錄到的物種」，未列出者不代表不存在，
    段落中一併寫明此限制，避免模型把「不在清單」講成「確定沒有」。

用法：
    python scripts/build_terrestrial_species_index.py
    python scripts/build_terrestrial_species_index.py --dry-run
"""

from __future__ import annotations

import argparse
import io
import json
import re
import shutil
import sys
from datetime import datetime
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
FISH_JS      = PROJECT_ROOT / "webapp" / "js" / "modules" / "fish.js"
DATA_DIR     = PROJECT_ROOT / "webapp" / "data"
OUT_JSON     = DATA_DIR / "terrestrial_species.json"
VECTOR_STORE = DATA_DIR / "vector_store.jsonl"

EMBED_MODEL = "all-MiniLM-L6-v2"
SRC_ANIMAL  = "橫流溪陸域生物物種清單"
SRC_PLANT   = "橫流溪陸域植物優勢種清單"

LIMIT_NOTE = ("本清單為歷次調查「記錄到」的物種；未列於清單者代表這幾次調查"
              "未記錄到，不等於該物種在橫流溪不存在，也不得寫成「已滅絕」"
              "或「完全沒有」。")


def _js_array(text: str, const_name: str) -> str:
    """取出 const NAME = [ ... ]; 的中括號內容（處理巢狀括號）。"""
    m = re.search(r"const\s+" + const_name + r"\s*=\s*\[", text)
    if not m:
        raise ValueError("找不到 " + const_name)
    start = m.end() - 1
    depth = 0
    for i in range(start, len(text)):
        if text[i] == "[":
            depth += 1
        elif text[i] == "]":
            depth -= 1
            if depth == 0:
                return text[start:i + 1]
    raise ValueError(const_name + " 括號未閉合")


def _fields(block: str) -> dict:
    """從一個 { ... } 片段抽出 key: 'value' 與 key: 數字／布林。"""
    out = {}
    for k, v in re.findall(r"(\w+)\s*:\s*'((?:[^'\\]|\\.)*)'", block):
        out[k] = v.replace("\\'", "'")
    for k, v in re.findall(r"(\w+)\s*:\s*(-?\d+(?:\.\d+)?)(?=\s*[,}])", block):
        out.setdefault(k, float(v) if "." in v else int(v))
    for k, v in re.findall(r"(\w+)\s*:\s*(true|false)(?=\s*[,}])", block):
        out.setdefault(k, v == "true")
    return out


def parse_land_life(text: str) -> list:
    """LAND_LIFE_DATA：每個 category 底下有 items 陣列。"""
    block = _js_array(text, "LAND_LIFE_DATA")
    groups = []
    #  以 category: 為界切開每一個分類
    starts = [m.start() for m in re.finditer(r"\{\s*\n?\s*category:", block)]
    starts.append(len(block))
    for a, b in zip(starts, starts[1:]):
        seg = block[a:b]
        head = seg[:seg.find("items:")] if "items:" in seg else seg
        meta = _fields(head)
        items = []
        if "items:" in seg:
            istart = seg.find("items:") + len("items:")
            depth = 0
            for i in range(istart, len(seg)):
                if seg[i] == "[":
                    depth += 1
                elif seg[i] == "]":
                    depth -= 1
                    if depth == 0:
                        istart_arr = seg.find("[", istart)
                        arr = seg[istart_arr:i + 1]
                        for row in re.findall(r"\{[^{}]*\}", arr):
                            f = _fields(row)
                            if f.get("name"):
                                items.append(f)
                        break
        if meta.get("category"):
            groups.append({
                "分類": meta.get("category"),
                "調查記錄種數": meta.get("count"),
                "資料來源": meta.get("source"),
                "摘要": meta.get("summary"),
                "物種": items,
            })
    return groups


def parse_vegetation(text: str) -> list:
    block = _js_array(text, "VEG_DOMINANT")
    rows = []
    for row in re.findall(r"\{[^{}]*\}", block):
        f = _fields(row)
        if f.get("name"):
            rows.append({
                "名稱": f.get("name"),
                "覆蓋度百分比": f.get("pct"),
                "科名": f.get("family"),
                "來源類型": f.get("type"),
                "入侵種": bool(f.get("invasive")),
                "特有種": bool(f.get("endemic")),
            })
    return rows


def build_texts(groups: list, veg: list) -> list:
    """每個物種一段，另加各分類與植物總表各一段。"""
    texts = []

    for g in groups:
        head = ("【橫流溪陸域生物－%s】調查記錄 %s 種。資料來源：%s\n%s\n%s"
                % (g["分類"], g.get("調查記錄種數"), g.get("資料來源") or "－",
                   g.get("摘要") or "", LIMIT_NOTE))
        lines = ["物種｜學名｜保育或分布狀態｜備註"]
        for it in g["物種"]:
            lines.append("%s｜%s｜%s｜%s" % (
                it.get("name", ""), it.get("sci", "－"),
                it.get("tag", "－"), it.get("note", "")))
        texts.append((SRC_ANIMAL, g["分類"], head + "\n" + "\n".join(lines)))
        #  逐種再各成一段，讓「問單一物種」能精準命中
        for it in g["物種"]:
            texts.append((SRC_ANIMAL, g["分類"], (
                "【橫流溪陸域生物】%s（%s）\n"
                "分類：%s｜狀態：%s\n"
                "橫流溪紀錄說明：%s\n"
                "資料來源：%s\n%s"
                % (it.get("name", ""), it.get("sci") or "學名未載",
                   g["分類"], it.get("tag") or "未標示",
                   it.get("note") or "清單僅列物種，未附個別紀錄說明",
                   g.get("資料來源") or "－", LIMIT_NOTE))))

    if veg:
        total = round(sum(float(v["覆蓋度百分比"] or 0) for v in veg), 2)
        head = ("【橫流溪陸域植物－優勢種】共列 %d 種，合計覆蓋度 %.2f%%。\n"
                "此為優勢種摘錄，非全區維管束植物名錄；覆蓋度為樣區調查值。\n%s"
                % (len(veg), total, LIMIT_NOTE))
        lines = ["植物｜科名｜覆蓋度%｜原生或歸化｜是否入侵種｜是否特有種"]
        for v in veg:
            lines.append("%s｜%s｜%s｜%s｜%s｜%s" % (
                v["名稱"], v["科名"], v["覆蓋度百分比"], v["來源類型"],
                "是" if v["入侵種"] else "否",
                "是" if v["特有種"] else "否"))
        texts.append((SRC_PLANT, "植物優勢種", head + "\n" + "\n".join(lines)))
        for v in veg:
            texts.append((SRC_PLANT, "植物優勢種", (
                "【橫流溪陸域植物】%s（%s）\n"
                "覆蓋度 %s%%｜%s｜%s｜%s\n%s"
                % (v["名稱"], v["科名"], v["覆蓋度百分比"], v["來源類型"],
                   "入侵種" if v["入侵種"] else "非入侵種",
                   "特有種" if v["特有種"] else "非特有種", LIMIT_NOTE))))
    return texts


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    text = FISH_JS.read_text(encoding="utf-8")
    groups = parse_land_life(text)
    veg = parse_vegetation(text)

    print("陸域生物分類 %d 類：" % len(groups))
    for g in groups:
        print("  %-8s 宣告 %s 種，實際解析 %d 種"
              % (g["分類"], g.get("調查記錄種數"), len(g["物種"])))
    print("陸域植物優勢種 %d 種" % len(veg))

    payload = {
        "說明": ("由 webapp/js/modules/fish.js 的 LAND_LIFE_DATA 與 "
                 "VEG_DOMINANT 匯出，內容照抄未改寫。"),
        "限制": LIMIT_NOTE,
        "產生時間": datetime.now().isoformat(timespec="seconds"),
        "陸域生物": groups,
        "陸域植物優勢種": veg,
    }
    texts = build_texts(groups, veg)
    print("將產生 %d 段可檢索文字" % len(texts))
    if args.dry_run:
        print("\n範例：\n" + texts[1][2][:300])
        return 0

    OUT_JSON.write_text(json.dumps(payload, ensure_ascii=False, indent=1),
                        encoding="utf-8")

    from sentence_transformers import SentenceTransformer
    model = SentenceTransformer(EMBED_MODEL)

    keep, max_id = [], -1
    for line in io.open(VECTOR_STORE, encoding="utf-8"):
        if not line.strip():
            continue
        rec = json.loads(line)
        if rec.get("source_file") in (SRC_ANIMAL, SRC_PLANT):
            continue
        keep.append(line)
        m = re.findall(r"\d+", str(rec.get("id") or ""))
        if m:
            max_id = max(max_id, int(m[-1]))

    shutil.copy2(VECTOR_STORE, VECTOR_STORE.with_suffix(
        ".jsonl.bak-" + datetime.now().strftime("%Y%m%d%H%M%S")))

    vectors = model.encode([t[2] for t in texts], batch_size=32,
                           show_progress_bar=False)
    new_lines = []
    doc_id = max_id + 1
    for (src, cat, body), vec in zip(texts, vectors):
        new_lines.append(json.dumps({
            "id": "doc_%06d" % doc_id,
            "source_file": src,
            "source_path": "webapp/data/terrestrial_species",
            "page_number": cat,
            "chunk_index": "0",
            "text": body[:500],
            "full_text": body,
            "vector": [round(float(v), 6) for v in vec],
            "timestamp": datetime.now().isoformat(),
            "section": "%s > %s" % (src, cat),
        }, ensure_ascii=False) + "\n")
        doc_id += 1

    tmp = VECTOR_STORE.with_suffix(".jsonl.tmp")
    with tmp.open("w", encoding="utf-8") as f:
        f.writelines(keep)
        f.writelines(new_lines)
    tmp.replace(VECTOR_STORE)

    print("向量庫：%d + %d = %d 段"
          % (len(keep), len(new_lines), len(keep) + len(new_lines)))
    return 0


if __name__ == "__main__":
    sys.exit(main())
