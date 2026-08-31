#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
增量索引器：把指定文件加進「部署用輕量向量庫」vector_store.jsonl
==================================================================
為什麼不用 scripts/index_documents.py？
    那支腳本以 'w' 模式重寫整個 vector_store.jsonl，並掃描
    01_工程設施維護與資料 底下所有 PDF。跑一次會把部署庫從
    38 個檔案膨脹到數百個，Render 免費方案 512MB 記憶體撐不住。

為什麼不用 scripts/hlx_index_all.py？
    那支輸出的是本機全文庫（chunks_meta.jsonl，38,741 段），
    但 chunks_meta.jsonl / vectors.npy / bm25_index.pkl 都在
    .gitignore 內，不會部署。線上 AI 實際搜尋的是 vector_store.jsonl。

本腳本：只讀取、只 append，已索引過的檔案自動跳過（可重複執行）。

嵌入模型必須與既有向量一致
    實測：既有 1,649 筆向量以 all-MiniLM-L6-v2 產生（同文重算 cos=1.0000），
    而非 rag_backend.MODEL_NAME 宣告的 paraphrase-multilingual-MiniLM-L12-v2
    （同文 cos 僅 0.20~0.28）。此處固定用 all-MiniLM-L6-v2，
    確保新舊段落落在同一向量空間。

用法：
    python scripts/index_new_reports.py            # 索引預設清單
    python scripts/index_new_reports.py --dry-run  # 只列出會索引什麼
    python scripts/index_new_reports.py <路徑> ...  # 指定檔案
    python scripts/index_new_reports.py --force    # 已索引過也重做（先移除舊段落）
"""

from __future__ import annotations

import argparse
import json
import logging
import re
import shutil
import sys
import zipfile
from datetime import datetime
from pathlib import Path

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s",
                    datefmt="%H:%M:%S")
log = logging.getLogger("index-new")

PROJECT_ROOT   = Path(__file__).resolve().parent.parent
DATA_DIR       = PROJECT_ROOT / "webapp" / "data"
VECTOR_STORE   = DATA_DIR / "vector_store.jsonl"
MANIFEST_FILE  = DATA_DIR / "documents_manifest.json"

MODEL_NAME        = "all-MiniLM-L6-v2"   # 必須與既有向量一致，勿改
CHUNK_SIZE        = 800
CHUNK_OVERLAP     = 200
MIN_CHUNK_LENGTH  = 50
MIN_PAGE_KEEP     = 20   # 簡報頁常只有一行標題，仍需保留否則整頁消失

#  預設索引清單：使用者 2026-08-30 指定的「新增報告書」四份，
#  外加黑熊資料兩份簡報 —— 四份 PDF 幾乎只有石虎（黑熊合計 70 次），
#  黑熊的實際監測數據在簡報裡。
DEFAULT_TARGETS = [
    "01_工程設施維護與資料/新增報告書/1150430_臺中西部淺山保育軸帶烏溪流域保育軸帶石虎族群監測計畫期中報告(1).pdf",
    "01_工程設施維護與資料/新增報告書/115石虎期中審查_簡報.pdf",
    "01_工程設施維護與資料/新增報告書/東勢處大安溪與大甲溪野生動物資源永續利用及保育自主管理.pdf",
    "01_工程設施維護與資料/新增報告書/臺中市大甲溪流域東勢周圍山城社區友善環境產業輔導計畫2+成果報告.pdf",
    "01_工程設施維護與資料/黑熊資料/113瀕危物種保育行動研討會_大雪山黑熊2.1.pptx",
    "01_工程設施維護與資料/黑熊資料/115台八-標案簡報0113new-簡報版.pptx",
]


# -- 抽文字：PDF 逐頁、PPTX 逐張投影片 --------------------------------
def extract_pdf(path: Path) -> list:
    from pypdf import PdfReader
    out = []
    reader = PdfReader(str(path))
    for i, page in enumerate(reader.pages):
        try:
            text = page.extract_text() or ""
        except Exception as exc:
            log.warning("  第 %d 頁抽文字失敗：%s", i + 1, exc)
            continue
        if text.strip():
            out.append((i + 1, text))
    return out


def extract_pptx(path: Path) -> list:
    """逐張投影片抽文字。只取 <a:t> 文字節點，避免把 XML 標籤當內文。"""
    out = []
    entities = (("&amp;", "&"), ("&lt;", "<"), ("&gt;", ">"),
                ("&quot;", '"'), ("&apos;", "'"))
    with zipfile.ZipFile(path) as z:
        names = [n for n in z.namelist()
                 if re.fullmatch(r"ppt/slides/slide\d+\.xml", n)]
        names.sort(key=lambda s: int(re.findall(r"\d+", s)[-1]))
        for n in names:
            xml = z.read(n).decode("utf-8", "ignore")
            runs = re.findall(r"<a:t>(.*?)</a:t>", xml, flags=re.S)
            text = "\n".join(r.strip() for r in runs if r.strip())
            for a, b in entities:
                text = text.replace(a, b)
            if text.strip():
                out.append((int(re.findall(r"\d+", n)[-1]), text))
    return out


def extract(path: Path) -> list:
    ext = path.suffix.lower()
    if ext == ".pdf":
        return extract_pdf(path)
    if ext == ".pptx":
        return extract_pptx(path)
    raise ValueError("不支援的副檔名：" + ext)


# -- 分塊：沿用 index_documents.py 的段落邏輯 -------------------------
def chunk_text(text: str, max_len: int = CHUNK_SIZE,
               overlap: int = CHUNK_OVERLAP) -> list:
    paragraphs = []
    for para in text.split("\n\n"):
        para = para.strip()
        if not para or len(para) < MIN_CHUNK_LENGTH:
            continue
        #  原腳本只在段落邊界切，單一超長段落會整段變成一個 chunk。
        #  MiniLM 上限 256 token，超長段落的後半根本沒進向量，
        #  因此超過 max_len 的段落再做一次帶重疊的硬切。
        if len(para) <= max_len:
            paragraphs.append(para)
            continue
        step = max(1, max_len - overlap)
        for i in range(0, len(para), step):
            piece = para[i:i + max_len]
            if len(piece) >= MIN_CHUNK_LENGTH:
                paragraphs.append(piece)
            if i + max_len >= len(para):
                break

    chunks, cur, cur_len = [], [], 0
    for para in paragraphs:
        if cur and cur_len + len(para) > max_len:
            chunks.append("\n\n".join(cur))
            cur, cur_len = [para], len(para)
        else:
            cur.append(para)
            cur_len += len(para)
    if cur:
        chunks.append("\n\n".join(cur))
    return [c for c in chunks if c.strip()]


def chunk_page(text: str) -> list:
    """整頁分塊；若段落過濾後全空但原文仍有內容，整頁保留為一塊。"""
    chunks = chunk_text(text)
    if not chunks:
        flat = " ".join(text.split())
        if len(flat) >= MIN_PAGE_KEEP:
            return [flat]
    return chunks


# -- 主流程 ---------------------------------------------------------
def load_existing():
    """回傳（已索引檔名集合, 下一個 doc 序號, 全部原始行）。"""
    if not VECTOR_STORE.exists():
        return set(), 0, []
    seen, max_id, lines = set(), -1, []
    with VECTOR_STORE.open(encoding="utf-8") as f:
        for line in f:
            if not line.strip():
                continue
            lines.append(line)
            rec = json.loads(line)
            seen.add(rec.get("source_file", ""))
            m = re.findall(r"\d+", str(rec.get("id", "")))
            if m:
                max_id = max(max_id, int(m[-1]))
    return seen, max_id + 1, lines


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("targets", nargs="*", help="要索引的檔案（相對或絕對路徑）")
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--force", action="store_true", help="已索引過也重做")
    args = ap.parse_args()

    rels = args.targets or DEFAULT_TARGETS
    paths = []
    for r in rels:
        p = Path(r)
        if not p.is_absolute():
            p = PROJECT_ROOT / r
        if not p.exists():
            log.error("找不到檔案：%s", p)
            return 2
        paths.append(p)

    seen, next_id, existing_lines = load_existing()
    log.info("現有向量庫：%d 段落 / %d 個檔案", len(existing_lines), len(seen))

    todo = []
    for p in paths:
        if p.name in seen and not args.force:
            log.info("跳過（已索引）：%s", p.name)
            continue
        todo.append(p)

    if not todo:
        log.info("沒有需要索引的新檔案。")
        return 0

    log.info("待索引 %d 個檔案：", len(todo))
    for p in todo:
        log.info("  - %s", p.relative_to(PROJECT_ROOT))
    if args.dry_run:
        return 0

    from sentence_transformers import SentenceTransformer
    log.info("載入嵌入模型 %s ...", MODEL_NAME)
    model = SentenceTransformer(MODEL_NAME)

    #  --force 時先移除同名舊段落，避免重複
    if args.force:
        drop = set(p.name for p in todo)
        kept = [l for l in existing_lines
                if json.loads(l).get("source_file") not in drop]
        if len(kept) != len(existing_lines):
            log.info("--force：移除 %d 段舊段落", len(existing_lines) - len(kept))
            existing_lines = kept

    backup = VECTOR_STORE.with_suffix(
        ".jsonl.bak-" + datetime.now().strftime("%Y%m%d%H%M%S"))
    shutil.copy2(VECTOR_STORE, backup)
    log.info("已備份 -> %s", backup.name)

    new_lines = []
    added_docs = []
    doc_id = next_id
    for p in paths if args.force else todo:
        if p not in todo:
            continue
        pages = extract(p)
        if not pages:
            log.warning("  %s 抽不到文字，略過", p.name)
            continue
        unit = "投影片" if p.suffix.lower() == ".pptx" else "頁"
        label = "Slide" if p.suffix.lower() == ".pptx" else "Page"
        texts, metas = [], []
        for page_no, page_text in pages:
            for ci, chunk in enumerate(chunk_page(page_text)):
                texts.append(chunk)
                metas.append((page_no, ci))
        if not texts:
            log.warning("  %s 分塊後為空，略過", p.name)
            continue
        vectors = model.encode(texts, batch_size=32, show_progress_bar=False)
        n_chunks = 0
        for chunk, meta, vec in zip(texts, metas, vectors):
            page_no, ci = meta
            rec = {
                "id": "doc_%06d" % doc_id,
                "source_file": p.name,
                "source_path": str(p.relative_to(PROJECT_ROOT)),
                "page_number": str(page_no),
                "chunk_index": str(ci),
                "text": chunk[:500],
                "full_text": chunk,
                "vector": [round(float(x), 6) for x in vec],
                "timestamp": datetime.now().isoformat(),
                "section": "%s > %s %d > Chunk %d" % (p.name, label, page_no, ci),
            }
            new_lines.append(json.dumps(rec, ensure_ascii=False) + "\n")
            doc_id += 1
            n_chunks += 1
        added_docs.append({"name": p.name,
                           "path": str(p.relative_to(PROJECT_ROOT)),
                           "chunks": n_chunks, "pages": len(pages)})
        log.info("  %-50s %3d %s -> %3d 段", p.name[:50], len(pages), unit, n_chunks)

    tmp = VECTOR_STORE.with_suffix(".jsonl.tmp")
    with tmp.open("w", encoding="utf-8") as f:
        f.writelines(existing_lines)
        f.writelines(new_lines)
    tmp.replace(VECTOR_STORE)

    #  同步 manifest（部署庫的檔案清單）
    if MANIFEST_FILE.exists():
        manifest = json.loads(MANIFEST_FILE.read_text(encoding="utf-8"))
    else:
        manifest = {"model": MODEL_NAME, "documents": [], "total_chunks": 0}
    by_name = dict((d["name"], d) for d in manifest.get("documents", []))
    for d in added_docs:
        by_name[d["name"]] = d
    manifest["documents"] = list(by_name.values())
    manifest["total_chunks"] = len(existing_lines) + len(new_lines)
    manifest["model"] = MODEL_NAME
    manifest["timestamp"] = datetime.now().isoformat()
    MANIFEST_FILE.write_text(json.dumps(manifest, ensure_ascii=False, indent=2),
                             encoding="utf-8")

    log.info("=" * 58)
    log.info("完成：新增 %d 段，向量庫共 %d 段 / %d 個檔案",
             len(new_lines), len(existing_lines) + len(new_lines),
             len(manifest["documents"]))
    log.info("向量庫大小：%.1f MB", VECTOR_STORE.stat().st_size / 1024 / 1024)
    return 0


if __name__ == "__main__":
    sys.exit(main())
