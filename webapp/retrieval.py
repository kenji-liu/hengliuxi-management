"""
文件檢索：BM25 關鍵字檢索 ＋（可選）向量語意檢索
======================================================================
原本的 _local_keyword_retrieve 只是「數關鍵字出現幾次」，沒有 IDF 權重，
也沒有文件長度正規化：常見詞與罕見詞同分，長文件天然佔優，
因此「粗首馬口鱲」這種罕見專有名詞的訊號會被淹沒。

本模組改用 BM25，並在具備查詢向量時以 RRF 融合語意檢索結果。

記憶體考量（Render 免費方案僅 512 MB）：
  ・原始 vector_store.jsonl 整包載入需約 1,037 MB —— 不可行
  ・改讀 scripts/build_vector_index.py 產生的分離索引：
      chunks_meta.jsonl  內文與來源（不含向量）
      vectors.npy        以 mmap 讀取，不佔常駐記憶體
  ・BM25 只需詞頻統計，不需要向量，因此無金鑰時仍可運作
"""

from __future__ import annotations

import array
import io
import json
import logging
import math
import os
import re
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)

_DATA_DIR = os.path.join(os.path.dirname(__file__), "data")
META_PATH = os.path.join(_DATA_DIR, "chunks_meta.jsonl")
VECTORS_PATH = os.path.join(_DATA_DIR, "vectors.npy")
INDEX_PATH = os.path.join(_DATA_DIR, "bm25_index.pkl")

# BM25 參數（採常用預設值）
_K1 = 1.5
_B = 0.75

_index: Dict[str, Any] = {}


def _tokenize(text: str) -> List[str]:
    """中文取雙字滑窗、英數取詞。

    中文沒有空白分詞，雙字視窗是不依賴外部斷詞套件的穩健作法；
    專有名詞（如「粗首馬口鱲」）會被拆成數個雙字詞，仍能透過
    多個罕見詞同時命中而取得高分。
    """
    tokens = re.findall(r"[A-Za-z0-9][A-Za-z0-9._+-]*", text.lower())
    for block in re.findall(r"[㐀-鿿]+", text):
        if len(block) == 1:
            tokens.append(block)
            continue
        tokens += [block[i:i + 2] for i in range(len(block) - 1)]
    return tokens


def is_ready() -> bool:
    return os.path.exists(META_PATH)


# 開發過程產生的文件（規劃書、進度報告、設定檔）不是專案資料，
# 混在知識庫中會讓「步道妥善率」這類查詢命中 PHASE_2_3_PLAN.md 之類的檔案。
_JUNK_SOURCE = re.compile(
    r"(PHASE_|_REPORT\.md|_PLAN\.md|README|CHECKLIST|_GUIDE\.md|IMPLEMENTATION"
    r"|ACTION_ITEMS|_STATUS|TEST_|OPTIMIZATION|SETUP|manifest|metadata_index"
    r"|package|requirements|maintenance_contracts|synced_inspections"
    r"|maintenance_photo_index|quality_benchmark|gdrive_index|\.json$|\.jsonl$"
    r"|\.sqlite3?$|\.py$|\.js$)", re.I)


def is_project_source(source_file: str) -> bool:
    return not _JUNK_SOURCE.search(str(source_file or ""))


def load_index() -> Dict[str, Any]:
    """載入 BM25 索引。

    只在記憶體保留檢索所需的統計量（詞→(列,詞頻)），內文不常駐，
    命中後才依位元組位移回檔案讀取。這是能在 512 MB 內處理
    38,741 筆文件的關鍵。
    """
    if _index:
        return _index
    if not os.path.exists(META_PATH):
        logger.warning("[RETRIEVAL] 找不到 %s，請先執行 scripts/build_vector_index.py", META_PATH)
        return {}

    # 已預建的索引檔可直接載入，省去每次啟動重新掃描
    if os.path.exists(INDEX_PATH):
        try:
            import pickle
            with open(INDEX_PATH, "rb") as handle:
                _index.update(pickle.load(handle))
            logger.info("[RETRIEVAL] 載入預建索引：%d 筆", _index.get("count", 0))
            return _index
        except Exception as exc:
            logger.warning("[RETRIEVAL] 預建索引載入失敗，改為即時建立：%s", exc)
            _index.clear()

    _index.update(build_index())
    return _index


def build_index() -> Dict[str, Any]:
    """掃描 chunks_meta.jsonl 建立 BM25 統計量（內文不保留）。"""
    docs: List[Dict[str, Any]] = []
    doc_freq: Dict[str, int] = {}
    postings: Dict[str, List[tuple]] = {}
    total_len = 0
    offset = 0

    with io.open(META_PATH, "rb") as raw:
        for row, raw_line in enumerate(raw):
            line_offset = offset
            offset += len(raw_line)
            try:
                meta = json.loads(raw_line.decode("utf-8").strip() or "{}")
            except Exception:
                continue

            source_file = str(meta.get("source_file") or meta.get("source_path") or "")
            if not is_project_source(source_file):
                continue

            text = str(meta.get("text") or "")
            if not text:
                continue
            # 檔名也納入檢索：不少查詢是以報告名稱指定來源
            tokens = _tokenize(f"{source_file} {text}")
            if not tokens:
                continue

            doc_id = len(docs)
            counts: Dict[str, int] = {}
            for token in tokens:
                counts[token] = counts.get(token, 0) + 1
            for token, count in counts.items():
                # 扁平 array('i') 交錯存 (doc_id, freq)：
                # 以 tuple 串列儲存時，每筆約需 72 bytes，全庫達數百 MB；
                # 改用 4 bytes 的整數陣列可將倒排表壓到十分之一以下。
                entry = postings.get(token)
                if entry is None:
                    entry = array.array("i")
                    postings[token] = entry
                entry.append(doc_id)
                entry.append(count)
                doc_freq[token] = doc_freq.get(token, 0) + 1

            docs.append({
                "row": int(meta.get("row", row)),
                "offset": line_offset,
                "source_file": source_file,
                "category": meta.get("category") or "",
                "length": len(tokens),
            })
            total_len += len(tokens)

    if not docs:
        return {}

    logger.info("[RETRIEVAL] BM25 索引完成：%d 筆、%d 個詞", len(docs), len(postings))
    return {
        "docs": docs,
        # 過濾雜訊後 docs 的索引已不等於 vectors.npy 的列號，需要對應表
        "row_to_doc": {d["row"]: i for i, d in enumerate(docs)},
        "postings": postings,
        "doc_freq": doc_freq,
        "avg_len": total_len / len(docs),
        "count": len(docs),
    }


def read_text(doc: Dict[str, Any]) -> str:
    """依位元組位移讀回該筆內文（避免全部常駐記憶體）。"""
    try:
        with io.open(META_PATH, "rb") as handle:
            handle.seek(int(doc.get("offset") or 0))
            meta = json.loads(handle.readline().decode("utf-8").strip() or "{}")
        return str(meta.get("text") or "")
    except Exception:
        return ""


def bm25_search(query: str, top_k: int = 8) -> List[Dict[str, Any]]:
    """BM25 檢索。分數含 IDF 權重與文件長度正規化。"""
    index = load_index()
    if not index:
        return []

    docs = index["docs"]
    postings = index["postings"]
    doc_freq = index["doc_freq"]
    avg_len = index["avg_len"]
    total = index["count"]

    scores: Dict[int, float] = {}
    for token in set(_tokenize(query)):
        entries = postings.get(token)
        if not entries:
            continue
        hits = len(entries) // 2          # 交錯存放，兩個整數為一筆
        # 出現在超過一半文件的詞（如「橫流」「溪流」）幾乎無鑑別力，跳過
        if hits > total * 0.5:
            continue
        idf = math.log(1 + (total - hits + 0.5) / (hits + 0.5))
        for i in range(0, len(entries), 2):
            doc_id = entries[i]
            freq = entries[i + 1]
            length = docs[doc_id]["length"]
            denom = freq + _K1 * (1 - _B + _B * length / avg_len)
            scores[doc_id] = scores.get(doc_id, 0.0) + idf * freq * (_K1 + 1) / denom

    ranked = sorted(scores.items(), key=lambda item: item[1], reverse=True)
    out: List[Dict[str, Any]] = []
    for doc_id, score in ranked:
        if not is_project_source(docs[doc_id].get("source_file", "")):
            continue
        out.append({**docs[doc_id], "score": round(score, 4),
                    "text": read_text(docs[doc_id])})
        if len(out) >= top_k:
            break
    return out


def vector_search(query_vector, top_k: int = 8) -> List[Dict[str, Any]]:
    """以 mmap 讀取向量矩陣做餘弦相似度檢索。

    向量已於建索引時正規化，因此單次矩陣乘法即為相似度。
    mmap 讓 113 MB 的矩陣不必常駐記憶體。
    """
    index = load_index()
    if not index or not os.path.exists(VECTORS_PATH):
        return []
    try:
        import numpy as np
        matrix = np.load(VECTORS_PATH, mmap_mode="r")
        query = np.asarray(query_vector, dtype=np.float32)
        norm = float(np.linalg.norm(query)) or 1.0
        sims = matrix @ (query / norm)
        top = np.argpartition(-sims, min(top_k * 3, len(sims) - 1))[:top_k * 3]
        top = top[np.argsort(-sims[top])]
        docs = index["docs"]
        row_to_doc = index.get("row_to_doc") or {}
        out = []
        for row in top:
            doc_id = row_to_doc.get(int(row))
            if doc_id is None:      # 該列屬於已過濾掉的開發文件
                continue
            doc = docs[doc_id]
            if not is_project_source(doc.get("source_file", "")):
                continue
            out.append({**doc, "score": round(float(sims[int(row)]), 4),
                        "text": read_text(doc)})
            if len(out) >= top_k:
                break
        return out
    except Exception as exc:
        logger.warning("[RETRIEVAL] 向量檢索失敗：%s", exc)
        return []


def _embed_query(query: str) -> Optional[List[float]]:
    """以 Jina API 取得查詢向量（向量庫即以 jina-embeddings-v3 建立）。"""
    key = os.environ.get("JINA_API_KEY", "").strip()
    if not key:
        return None
    import urllib.request, urllib.error
    payload = json.dumps({
        "model": os.environ.get("JINA_EMBED_MODEL", "jina-embeddings-v3"),
        "task": "retrieval.query",
        "input": [query[:2000]],
    }).encode("utf-8")
    req = urllib.request.Request(
        "https://api.jina.ai/v1/embeddings", data=payload,
        headers={"Content-Type": "application/json", "Authorization": f"Bearer {key}"},
        method="POST")
    try:
        with urllib.request.urlopen(req, timeout=15) as response:
            data = json.loads(response.read().decode("utf-8"))
        return data["data"][0]["embedding"]
    except Exception as exc:
        logger.warning("[RETRIEVAL] 查詢向量取得失敗：%s", exc)
        return None


def hybrid_search(query: str, top_k: int = 6) -> List[Dict[str, Any]]:
    """BM25 ＋（可選）向量檢索，以 RRF 融合。

    無 JINA_API_KEY 時退化為純 BM25 —— 仍遠優於原本的關鍵字計次。
    """
    keyword_hits = bm25_search(query, top_k=top_k * 2)

    query_vector = _embed_query(query)
    if not query_vector:
        return keyword_hits[:top_k]

    vector_hits = vector_search(query_vector, top_k=top_k * 2)
    if not vector_hits:
        return keyword_hits[:top_k]

    # Reciprocal Rank Fusion：兩種排名各自貢獻，避免任一方分數尺度主導結果
    fused: Dict[int, Dict[str, Any]] = {}
    for rank, hit in enumerate(keyword_hits):
        entry = fused.setdefault(hit["row"], {**hit, "rrf": 0.0})
        entry["rrf"] += 1.0 / (60 + rank)
    for rank, hit in enumerate(vector_hits):
        entry = fused.setdefault(hit["row"], {**hit, "rrf": 0.0})
        entry["rrf"] += 1.0 / (60 + rank)

    ranked = sorted(fused.values(), key=lambda d: d["rrf"], reverse=True)
    return ranked[:top_k]


def _dedupe(hits: List[Dict[str, Any]], limit: int) -> List[Dict[str, Any]]:
    """濾除重複段落。

    來源文件本身就含大量重複內容（同一份報告的頁首頁尾、重複附表），
    不去重會讓同一段話佔掉數個名額，白白消耗模型的 context。
    以「檔名＋內文前 120 字（去空白）」為識別鍵。
    """
    seen = set()
    out: List[Dict[str, Any]] = []
    for hit in hits:
        text = re.sub(r"\s+", "", str(hit.get("text") or ""))[:120]
        key = (str(hit.get("source_file") or ""), text)
        if key in seen:
            continue
        seen.add(key)
        out.append(hit)
        if len(out) >= limit:
            break
    return out


def search(query: str, top_k: int = 6) -> List[Dict[str, Any]]:
    """對外檢索入口，回傳格式與既有 _local_keyword_retrieve 相容。"""
    # 多取一些再去重，避免去重後不足 top_k
    hits = _dedupe(hybrid_search(query, top_k=top_k * 3), top_k)
    return [{
        "source_file": h.get("source_file"),
        "source_path": h.get("source_file"),
        "category": h.get("category"),
        "text": h.get("text"),
        "full_text": h.get("text"),
        "preview": str(h.get("text") or "")[:200],
        "score": h.get("score") or round(h.get("rrf", 0.0), 5),
        "page": "未標示",
    } for h in hits]
