"""
把 vector_store.jsonl 拆成可低記憶體使用的精簡索引
======================================================================
原始 vector_store.jsonl 為 410 MB／38,741 筆，每筆內嵌 768 維向量。
整包以 Python 物件載入需約 1,037 MB、耗時 21 秒 —— Render 免費方案
只有 512 MB，必然 OOM，這也是目前向量檢索形同虛設的原因之一。

改為兩個檔案分離儲存：
  vectors.npy      float32 陣列（約 113 MB），檢索時以 mmap 讀取，不佔常駐記憶體
  chunks_meta.jsonl 內文與來源（約 31 MB），不含向量

如此向量檢索與關鍵字檢索都能在記憶體限制內運作。

用法：
    python scripts/build_vector_index.py
"""

from __future__ import annotations

import io
import json
import os
import sys
import time

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(ROOT, "webapp", "data")
SRC = os.path.join(DATA_DIR, "vector_store.jsonl")
OUT_VECTORS = os.path.join(DATA_DIR, "vectors.npy")
OUT_META = os.path.join(DATA_DIR, "chunks_meta.jsonl")

# 只保留答詢與引註實際會用到的欄位，其餘（filename、source 等重複欄位）捨棄
KEEP_FIELDS = ("text", "source_file", "source_path", "category", "chunk_id", "filetype")


def main() -> int:
    import numpy as np

    if not os.path.exists(SRC):
        print(f"找不到來源：{SRC}")
        return 1

    started = time.time()
    vectors = []
    dim = 0
    kept = 0
    skipped = 0

    with io.open(SRC, encoding="utf-8") as src, \
            io.open(OUT_META, "w", encoding="utf-8", newline="") as meta_out:
        for line_no, line in enumerate(src, 1):
            line = line.strip()
            if not line:
                continue
            try:
                doc = json.loads(line)
            except Exception:
                skipped += 1
                continue

            vector = doc.get("vector")
            text = str(doc.get("text") or "").strip()
            if not vector or not text:
                skipped += 1
                continue
            if not dim:
                dim = len(vector)
            elif len(vector) != dim:
                skipped += 1
                continue

            vectors.append(np.asarray(vector, dtype=np.float32))
            meta = {k: doc.get(k) for k in KEEP_FIELDS if doc.get(k) is not None}
            meta["row"] = kept          # 與 vectors.npy 的列索引對應
            meta_out.write(json.dumps(meta, ensure_ascii=False) + "\n")
            kept += 1

            if line_no % 5000 == 0:
                print(f"  已處理 {line_no:,} 行…")

    if not kept:
        print("沒有可用的向量資料")
        return 1

    matrix = np.vstack(vectors)
    # 預先正規化：檢索時只需矩陣乘法即可得餘弦相似度，省去每次重算
    norms = np.linalg.norm(matrix, axis=1, keepdims=True)
    norms[norms == 0] = 1.0
    matrix = matrix / norms
    np.save(OUT_VECTORS, matrix)

    elapsed = time.time() - started
    print(f"完成（{elapsed:.1f} 秒）")
    print(f"  向量：{OUT_VECTORS}")
    print(f"         {matrix.shape[0]:,} × {matrix.shape[1]} float32"
          f"　{os.path.getsize(OUT_VECTORS)/2**20:.0f} MB")
    print(f"  內文：{OUT_META}")
    print(f"         {kept:,} 筆　{os.path.getsize(OUT_META)/2**20:.0f} MB")
    if skipped:
        print(f"  略過 {skipped:,} 筆（缺向量或內文）")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
