"""把 vector_store.jsonl 的新文件段落併入 chunks_meta.jsonl，再重建 BM25 索引
======================================================================
背景
----
本專案有兩套索引，內容並不相同：

  chunks_meta.jsonl  38,741 段。webapp/retrieval.py 的 BM25 就靠它，
                     設計上可在 Render 512 MB 內運作。但它從未上線
                     （.gitignore 第 78-81 行把它跟超過 GitHub 單檔
                     上限的 vectors.npy 一起排除了），且停在 2026-08-25。

  vector_store.jsonl  2,411 段。這是唯一上線的那份，由
                     scripts/index_new_reports.py 增量產生，含最新的
                     石虎深化分析、金質獎簡報版等文件。

因此線上只查得到 2,411 段，而且走的是 rag_backend 裡最原始的關鍵字
計次法，不是 BM25。

為什麼不能直接跑 build_vector_index.py
--------------------------------------
那支程式是「從 vector_store.jsonl 拆出 chunks_meta.jsonl」。當初的
vector_store.jsonl 是 410 MB／38,741 段／768 維；現在的只有 23 MB／
2,411 段／384 維。直接重跑會把 38,741 段洗成 2,411 段，且無法復原
（chunks_meta.jsonl 不在 git 裡）。

本程式改採合併：以既有 38,741 段為底，只補上不存在的段落。

安全性
------
  ・BM25 檢索不使用 vectors.npy 的 row 欄位（已實測），因此新增段落
    沒有對應向量列並不影響 BM25。
  ・以正規化後的 (source_file, text) 雜湊去重，不依賴兩邊不同的
    chunk_id／id 命名。
  ・先寫入暫存檔，全部成功才置換，避免中途失敗毀掉原檔。

用法：
    python scripts/merge_new_chunks_into_meta.py [--dry-run]
"""

from __future__ import annotations

import argparse
import hashlib
import io
import json
import os
import sys
import time
import unicodedata

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(ROOT, "webapp", "data")
META = os.path.join(DATA_DIR, "chunks_meta.jsonl")
STORE = os.path.join(DATA_DIR, "vector_store.jsonl")
BM25 = os.path.join(DATA_DIR, "bm25_index.pkl")


def norm(text: str) -> str:
    """NFKC 正規化並壓掉空白。

    來源文件經 Big5 轉換後常帶 CJK 相容字（U+F900-U+FAFF），同一段文字
    在兩個索引裡可能長得不同；不正規化會把同一段當成新段落重複收錄。
    """
    return "".join(unicodedata.normalize("NFKC", str(text or "")).split())


def key_of(source_file: str, text: str) -> str:
    raw = norm(source_file) + "\x00" + norm(text)
    return hashlib.sha1(raw.encode("utf-8")).hexdigest()


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true",
                    help="只統計會新增幾段，不寫檔")
    args = ap.parse_args()

    for path in (META, STORE):
        if not os.path.exists(path):
            print(f"找不到：{path}")
            return 1

    started = time.time()

    # 1) 既有段落的指紋
    seen: set[str] = set()
    existing = 0
    sources_before: set[str] = set()
    with io.open(META, encoding="utf-8") as fh:
        for line in fh:
            line = line.strip()
            if not line:
                continue
            try:
                d = json.loads(line)
            except Exception:
                continue
            existing += 1
            seen.add(key_of(d.get("source_file", ""), d.get("text", "")))
            sources_before.add(str(d.get("source_file") or ""))
    print(f"既有 chunks_meta：{existing:,} 段，{len(sources_before):,} 個來源檔")

    # 2) 掃 vector_store，挑出不存在的段落
    additions: list[dict] = []
    scanned = 0
    with io.open(STORE, encoding="utf-8") as fh:
        for line in fh:
            line = line.strip()
            if not line:
                continue
            try:
                d = json.loads(line)
            except Exception:
                continue
            scanned += 1
            # 內文優先取 full_text；先前 search_documents 只餵 preview
            # 造成假陰性，此處務必存最完整的一份
            text = d.get("full_text") or d.get("text") or ""
            src = d.get("source_file") or d.get("source_path") or ""
            if not norm(text):
                continue
            k = key_of(src, text)
            if k in seen:
                continue
            seen.add(k)
            rec = {
                "text": text,
                "source_file": src,
                "source_path": d.get("source_path") or "",
                "category": d.get("category") or "未分類",
                "chunk_id": d.get("id") or d.get("chunk_id") or "",
                "filetype": d.get("filetype") or os.path.splitext(str(src))[1].lstrip("."),
            }
            # 頁碼與章節是引註要用的，既有 schema 沒有就一併帶上
            if d.get("page_number") is not None:
                rec["page_number"] = d["page_number"]
            if d.get("section"):
                rec["section"] = d["section"]
            additions.append(rec)

    new_sources = sorted({a["source_file"] for a in additions} - sources_before)
    print(f"掃描 vector_store：{scanned:,} 段")
    print(f"將新增：{len(additions):,} 段，其中全新來源檔 {len(new_sources)} 個")
    for s in new_sources[:20]:
        print(f"    + {s}")
    if len(new_sources) > 20:
        print(f"    …另有 {len(new_sources)-20} 個")

    if args.dry_run:
        print("\n--dry-run：未寫入任何檔案")
        return 0
    if not additions:
        print("\n沒有新段落，chunks_meta.jsonl 不變動")
        return 0

    # 3) 先寫暫存檔，成功才置換
    tmp = META + ".tmp"
    with io.open(tmp, "w", encoding="utf-8", newline="\n") as out:
        with io.open(META, encoding="utf-8") as fh:
            for line in fh:
                if line.strip():
                    out.write(line if line.endswith("\n") else line + "\n")
        for rec in additions:
            out.write(json.dumps(rec, ensure_ascii=False) + "\n")
    os.replace(tmp, META)
    total = existing + len(additions)
    print(f"\nchunks_meta.jsonl 已更新：{existing:,} → {total:,} 段")

    # 4) 重建 BM25（純統計，不需要任何嵌入模型或 API）
    if os.path.exists(BM25):
        os.remove(BM25)
        print("已刪除舊的 bm25_index.pkl")
    sys.path.insert(0, ROOT)
    from webapp import retrieval as R
    R._index.clear()
    idx = R.build_index()
    import pickle
    with open(BM25, "wb") as handle:
        pickle.dump(idx, handle, protocol=pickle.HIGHEST_PROTOCOL)
    print(f"BM25 索引已重建：{idx.get('count', 0):,} 筆 "
          f"（{os.path.getsize(BM25)/1e6:.1f} MB）")

    print(f"\n耗時 {time.time()-started:.1f} 秒")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
