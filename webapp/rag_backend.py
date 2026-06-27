#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
璈急?皞?RAG 蝟餌絞 - Flask 敺垢璅∠?
Hengliuxi RAG System - Flask Backend Module

Provides RAG search and chat endpoints for intelligent document retrieval.
"""

import os
import json
import logging
import re
import base64
import urllib.request
import urllib.error
from urllib.parse import quote
from pathlib import Path
from typing import List, Dict, Any, Optional
from datetime import datetime

from flask import Blueprint, request, jsonify, send_file, abort
import numpy as np

# Add Anthropic API support for answer generation
try:
    from anthropic import Anthropic
except ImportError as e:
    logger_import = logging.getLogger(__name__)
    logger_import.warning(f"Anthropic SDK not installed: {e}")
    Anthropic = None

logger = logging.getLogger(__name__)

try:
    from sentence_transformers import SentenceTransformer
    from sklearn.metrics.pairwise import cosine_similarity
except ImportError as e:
    logger.error(f"Missing dependency: {e}")
    SentenceTransformer = None
    cosine_similarity = None

# Configuration
MODEL_NAME = 'paraphrase-multilingual-MiniLM-L12-v2'   # 多語言含繁中；比 all-MiniLM-L6-v2 更準
SIMILARITY_THRESHOLD = 0.22  # multilingual 模型的向量空間較 MiniLM 略密，適度提高閾值
TOP_K_RESULTS = 6          # 32GB RAM 可取更多片段，提升召回率
MAX_CONTEXT_CHARS = 2800   # 14B 模型 context window 充裕，可給更多參考片段
OLLAMA_BASE_URL = os.environ.get('OLLAMA_BASE_URL', 'http://localhost:11434').rstrip('/')
OLLAMA_MODEL = os.environ.get('OLLAMA_MODEL', 'qwen2.5:14b')   # 繁中理解最佳開源模型
OLLAMA_VISION_MODEL = os.environ.get('OLLAMA_VISION_MODEL', OLLAMA_MODEL)
OLLAMA_TIMEOUT = int(os.environ.get('OLLAMA_TIMEOUT', '240'))
GROQ_MODEL = os.environ.get('GROQ_MODEL', 'llama-3.3-70b-versatile')
GROQ_API_URL = os.environ.get('GROQ_API_URL', 'https://api.groq.com/openai/v1/chat/completions')

# Synonym expansion mapping for improved recall
QUERY_SYNONYMS = {
    '橫流溪': ['本流', '溪流'],
    '設施': ['工程設施', '構造物', '魚道'],
    '維護': ['保養', '巡檢', '修繕'],
    '巡查': ['巡檢', '檢查'],
    '魚類': ['魚種', '魚群'],
    '棲地': ['棲地環境', '生態環境'],
}

# ============================================================
# 升級 1：查詢智能分類 (NLP Query Classification)
# ============================================================
QUERY_TYPE_KEYWORDS = {
    'engineering': [
        '溪構', '固床工', '防砂壩', '魚道', '維護', '巡查', '損壞', '修繕',
        '平台', '護岸', '步道', '淤積', '裂縫', '鏽蝕', '崩塌', '沉陷',
        '檢查', '通報', '緊急', '工程', '施工', '結構'
    ],
    'ecology': [
        '魚類', '魚種', 'WUA', '棲地', '生態', '物種', '保育', '纓口臺鰍',
        '石魚賓', '吻鰕虎', '白甲魚', '爬岩鰍', '瘋鱨', '連通性', '流速',
        '水深', '底質', '植被', '產卵', '洄游', '二維模式', '棲地模式'
    ],
    'regulation': [
        '法規', '法律', '規範', '標準', '許可', '水利法', '環評', '規定',
        '條文', '罰則', '申請', '核准', '違規', '公告', '辦法', '要點'
    ],
    'gis': [
        '座標', '樁號', '位置', 'GIS', '地圖', 'K+', '里程', '定位',
        '圖層', '座標系', 'TWD97', '測量', '圖資', '空間', '區位'
    ],
}

QUERY_TYPE_LABELS = {
    'engineering': '工程維護',
    'ecology': '生態棲地',
    'regulation': '法規合規',
    'gis': 'GIS 定位',
    'general': '一般查詢',
}


def classify_query_type(query: str) -> str:
    """
    Classify query into domain type for targeted retrieval strategy.
    Returns: 'engineering' | 'ecology' | 'regulation' | 'gis' | 'general'
    """
    scores = {}
    for qtype, keywords in QUERY_TYPE_KEYWORDS.items():
        scores[qtype] = sum(1 for kw in keywords if kw in query)

    max_type = max(scores, key=scores.get)
    return max_type if scores[max_type] > 0 else 'general'


def get_query_boost_terms(query_type: str) -> List[str]:
    """Return priority keywords for a given query type to boost retrieval."""
    boosts = {
        'engineering': ['維護', '巡查', '溪構', '固床工', '魚道', '損壞'],
        'ecology': ['WUA', '棲地', '魚類', '物種', '連通性', '生態'],
        'regulation': ['法規', '規範', '標準', '條文', '水利法'],
        'gis': ['座標', '樁號', 'K+', 'GIS', '定位'],
        'general': [],
    }
    return boosts.get(query_type, [])


# ============================================================
# 升級 2：BM25 混合檢索 (Hybrid Search with RRF)
# ============================================================
import math
from collections import Counter as _Counter


def _tokenize_zh(text: str) -> List[str]:
    """
    Simple tokenizer for Chinese + domain terms.
    Extracts bigrams, domain-specific patterns, and numbers.
    """
    if not text:
        return []
    tokens = []
    # Extract domain-specific patterns first
    for match in re.finditer(
        r'\d+K\+\d+|溪構\d+(?:-\d+)?|平台\d+|樣站\d+|\d{3,4}年|'
        r'[A-Za-z]{2,}|[0-9]+(?:\.[0-9]+)?',
        text
    ):
        tokens.append(match.group().lower())
    # Chinese character bigrams
    chinese_chars = re.sub(r'[^一-鿿]', ' ', text)
    for word in chinese_chars.split():
        if len(word) >= 2:
            tokens.extend(word[i:i+2] for i in range(len(word) - 1))
        else:
            tokens.append(word)
    return tokens


class _SimpleBM25:
    """Lightweight BM25 implementation with no external dependencies."""

    def __init__(self, k1: float = 1.5, b: float = 0.75):
        self.k1 = k1
        self.b = b
        self._doc_freqs: List[_Counter] = []
        self._idf: Dict[str, float] = {}
        self._avgdl: float = 1.0
        self._nd: int = 0

    def fit(self, documents: List[str]) -> None:
        self._nd = len(documents)
        if self._nd == 0:
            return
        self._doc_freqs = [_Counter(_tokenize_zh(doc)) for doc in documents]
        total_len = sum(sum(df.values()) for df in self._doc_freqs)
        self._avgdl = total_len / self._nd

        df_count: Dict[str, int] = _Counter()
        for df in self._doc_freqs:
            for term in df:
                df_count[term] += 1

        self._idf = {
            term: math.log((self._nd - freq + 0.5) / (freq + 0.5) + 1)
            for term, freq in df_count.items()
        }

    def score(self, query: str, doc_idx: int) -> float:
        if doc_idx >= len(self._doc_freqs):
            return 0.0
        query_terms = _tokenize_zh(query)
        df = self._doc_freqs[doc_idx]
        dl = sum(df.values())
        score = 0.0
        for term in query_terms:
            if term not in self._idf:
                continue
            tf = df.get(term, 0)
            score += self._idf[term] * (
                tf * (self.k1 + 1)
            ) / (
                tf + self.k1 * (1 - self.b + self.b * dl / max(self._avgdl, 1))
            )
        return score

    def top_k(self, query: str, k: int = 10) -> List[tuple]:
        """Return (doc_idx, score) sorted by score descending."""
        scores = [(i, self.score(query, i)) for i in range(self._nd)]
        scores.sort(key=lambda x: x[1], reverse=True)
        return scores[:k]


# Global BM25 index (rebuilt when vector store loads)
_bm25_index: Optional[_SimpleBM25] = None
_bm25_doc_map: List[int] = []   # maps BM25 index → vector_store index


def build_bm25_index(vector_store: List[Dict[str, Any]]) -> None:
    """Build BM25 index from vector store (called once on first load)."""
    global _bm25_index, _bm25_doc_map

    target_docs = [doc for doc in vector_store if is_target_topic_doc(doc)]
    _bm25_doc_map = [i for i, doc in enumerate(vector_store) if is_target_topic_doc(doc)]

    texts = [
        " ".join([
            str(doc.get('text', '')),
            str(doc.get('full_text', '')),
            str(doc.get('section', '')),
        ])
        for doc in target_docs
    ]

    _bm25_index = _SimpleBM25()
    _bm25_index.fit(texts)
    logger.info(f"BM25 index built: {len(texts)} target documents")


def _rrf_score(rank: int, k: int = 60) -> float:
    """Reciprocal Rank Fusion score."""
    return 1.0 / (k + rank + 1)


def hybrid_search(
    query: str,
    top_k: int = TOP_K_RESULTS,
    threshold: float = SIMILARITY_THRESHOLD,
    bm25_weight: float = 0.35,
) -> List[Dict[str, Any]]:
    """
    Hybrid retrieval: vector search + BM25 combined with RRF.
    Falls back to vector-only if BM25 index unavailable.
    """
    global _bm25_index, _bm25_doc_map

    vector_store = load_vector_store()
    model = load_model()

    if vector_store is None or model is None:
        return []

    # Build BM25 lazily
    if _bm25_index is None:
        build_bm25_index(vector_store)

    # --- Vector search ---
    expanded_queries = expand_query(query)
    all_vector_scores: Dict[int, float] = {}

    for q in expanded_queries:
        qv = normalize_vector(model.encode(q, convert_to_numpy=True))
        for i, doc in enumerate(vector_store):
            if 'vector' not in doc or not is_target_topic_doc(doc):
                continue
            sim = float(np.dot(qv, normalize_vector(doc['vector'])))
            sim = apply_domain_rerank(query, doc, sim)
            if sim > all_vector_scores.get(i, -1):
                all_vector_scores[i] = sim

    # Filter by threshold and rank
    vector_ranked = sorted(
        [(idx, score) for idx, score in all_vector_scores.items() if score >= threshold],
        key=lambda x: x[1], reverse=True
    )

    # --- BM25 search ---
    bm25_ranked_raw = _bm25_index.top_k(query, k=top_k * 2) if _bm25_index else []
    # Map BM25 index back to vector_store index
    bm25_ranked = [((_bm25_doc_map[bi], bs)) for bi, bs in bm25_ranked_raw if bi < len(_bm25_doc_map)]

    # --- RRF fusion ---
    rrf_scores: Dict[int, float] = {}

    for rank, (idx, _) in enumerate(vector_ranked[:top_k * 2]):
        rrf_scores[idx] = rrf_scores.get(idx, 0) + (1 - bm25_weight) * _rrf_score(rank)

    for rank, (idx, _) in enumerate(bm25_ranked):
        rrf_scores[idx] = rrf_scores.get(idx, 0) + bm25_weight * _rrf_score(rank)

    # Sort by RRF score
    fused = sorted(rrf_scores.items(), key=lambda x: x[1], reverse=True)

    results = []
    for idx, rrf in fused[:top_k]:
        doc = vector_store[idx]
        vec_score = all_vector_scores.get(idx, 0.0)
        results.append(sanitize_doc_for_output(doc, max(vec_score, rrf)))

    return results

HABITAT_MODEL_CONTEXT = """平台棲地二維模式量化資料：
第 I 區，0K+460-0K+560，常流水面積 15122.75 m2，關聯 0K+460、0K+560 防砂壩；WUA：臺灣石魚賓 2.200%/332.65 m2，臺灣白甲魚 1.802%/272.43 m2，臺灣間爬岩鰍 1.728%/261.27 m2，纓口臺鰍 6.387%/965.93 m2，明潭吻鰕虎 3.357%/507.74 m2，短臀瘋鱨 2.428%/367.23 m2。
第 II 區，0K+740，常流水面積 10658.05 m2，關聯階梯式魚道；WUA：臺灣石魚賓 5.30%/565.321 m2，臺灣白甲魚 2.64%/281.549 m2，臺灣間爬岩鰍 2.12%/226.074 m2，纓口臺鰍 6.22%/663.449 m2，明潭吻鰕虎 6.11%/651.461 m2，短臀瘋鱨 1.21%/129.152 m2。
第 III 區，1K+000，常流水面積 13364.68 m2，關聯階梯式魚道；WUA：臺灣石魚賓 3.493%/466.79 m2，臺灣白甲魚 2.54%/339.62 m2，臺灣間爬岩鰍 2.67%/357.06 m2，纓口臺鰍 9.37%/1252.73 m2，明潭吻鰕虎 4.70%/629.37 m2，短臀瘋鱨 1.628%/217.64 m2。
第 IV 區，1K+170-1K+225，常流水面積 13326.51 m2，關聯 1K+170 階梯式魚道與 1K+225 固床工；WUA：臺灣石魚賓 3.60%/479.38 m2，臺灣白甲魚 2.66%/354.52 m2，臺灣間爬岩鰍 1.80%/240.95 m2，纓口臺鰍 4.68%/623.06 m2，明潭吻鰕虎 5.11%/680.28 m2，短臀瘋鱨 1.19%/158.10 m2。
第 V 區，1K+315-1K+400，常流水面積 15776.91 m2，關聯 1K+315 階梯式魚道、1K+400 粗石斜曲面及改良型舟通式魚道；WUA：臺灣石魚賓 4.337%/684.30 m2，臺灣白甲魚 2.992%/472.04 m2，臺灣間爬岩鰍 2.640%/416.51 m2，纓口臺鰍 5.046%/796.03 m2，明潭吻鰕虎 4.787%/755.25 m2，短臀瘋鱨 1.11%/174.80 m2。
管理判讀：第 III 區纓口臺鰍 WUA 最高 9.37%，第 I 區下游深槽及防砂壩銜接須注意連續性，第 II 至 IV 區需檢核魚道上下游緩流避難帶，第 V 區應維持上游魚道出口、深槽與淺瀨覓食區連續。"""

# Paths
PROJECT_ROOT = Path(__file__).parent.parent
VECTOR_STORE_FILE = PROJECT_ROOT / 'webapp' / 'data' / 'vector_store.jsonl'
METADATA_INDEX_FILE = PROJECT_ROOT / 'webapp' / 'data' / 'metadata_index.json'
MANIFEST_FILE = PROJECT_ROOT / 'webapp' / 'data' / 'documents_manifest.json'

# Create Blueprint
rag = Blueprint('rag', __name__, url_prefix='/api/rag')

# Global model and vector store
_model = None
_vector_store = None
_metadata_index = None

MOJIBAKE_HINTS = ('?', '�', '\ue000', '\uf8ff')


def looks_garbled(text: str) -> bool:
    """Heuristic to detect mojibake-like text."""
    if not text:
        return False
    control_chars = sum(1 for ch in text if ord(ch) < 32 and ch not in ('\n', '\r', '\t'))
    if control_chars > 0:
        return True
    if any(ch in text for ch in MOJIBAKE_HINTS):
        return True
    pua_count = sum(1 for ch in text if 0xE000 <= ord(ch) <= 0xF8FF)
    return pua_count >= 2


def try_fix_mojibake(text: str) -> str:
    """Try common mojibake recovery paths."""
    if not text or not looks_garbled(text):
        return text

    candidates = [text]
    for src, dst in (('cp950', 'utf-8'), ('latin1', 'utf-8'), ('cp1252', 'utf-8')):
        try:
            candidates.append(text.encode(src, errors='ignore').decode(dst, errors='ignore'))
        except Exception:
            pass

    best = max(candidates, key=lambda s: sum(1 for ch in s if '\u4e00' <= ch <= '\u9fff'))
    return best if best.strip() else text


def normalize_source_name(doc: Dict[str, Any]) -> str:
    """Prefer a readable file name and try to recover garbled names."""
    source_file = doc.get('source_file') or ''
    source_path = doc.get('source_path') or ''

    if source_path:
        fixed_path = try_fix_mojibake(source_path)
        fixed_name = Path(fixed_path.replace('\\', '/')).name
        if fixed_name:
            return try_fix_mojibake(fixed_name)

    return try_fix_mojibake(source_file) or 'Unknown'


def clean_preview_text(text: str) -> str:
    """Return a display-safe preview text."""
    if not text:
        return ''
    fixed = try_fix_mojibake(text)
    # Collapse noisy whitespace/newlines for chat preview.
    fixed = re.sub(r'\s+', ' ', fixed).strip()
    return fixed


def sanitize_doc_for_output(doc: Dict[str, Any], score: float) -> Dict[str, Any]:
    """Sanitize one retrieved doc before returning to frontend."""
    source_name = normalize_source_name(doc)
    preview_raw = doc.get('text', '')[:200]
    preview = clean_preview_text(preview_raw)

    if looks_garbled(preview):
        preview = f'內容可能有編碼異常，請直接查看來源文件：{source_name}'

    source_path = try_fix_mojibake(doc.get('source_path', ''))
    encoded_path = quote(source_path, safe='')
    safe_href = f"/api/rag/document?source_path={encoded_path}&page={doc.get('page_number', 1)}"

    return {
        'id': doc.get('id'),
        'source_file': source_name,
        'source_path': source_path,
        'page': doc.get('page_number'),
        'text': doc.get('full_text', doc.get('text', '')),
        'preview': preview,
        'score': float(score),
        'section': try_fix_mojibake(doc.get('section', '')),
        'chunk_index': doc.get('chunk_index', 0),
        'source_href': safe_href
    }


EXCLUDED_FILE_KEYWORDS = ('封面', 'cover')
EXCLUDED_TEXT_KEYWORDS = ('封面',)
TARGET_TOPIC_KEYWORDS = ('橫流溪',)
TARGET_SOURCE_HINTS = (
    '01_工程設施維護與資料',
    '110年_東勢',
    '107~108年度橫流溪整治規劃設計監造與監測調查委託技術服務案',
    '113年東勢處水域友善監測追蹤',
    '維護管理手冊',
    '成果報告',
)


def is_target_topic_doc(doc: Dict[str, Any]) -> bool:
    """Keep only Hengliuxi-related chunks for RAG retrieval."""
    source_name = normalize_source_name(doc).lower()
    source_path = try_fix_mojibake(doc.get('source_path', '')).lower()
    text = try_fix_mojibake(doc.get('text', '')).lower()
    full_text = try_fix_mojibake(doc.get('full_text', '')).lower()

    # Drop cover-like files/chunks.
    if any(k in source_name for k in EXCLUDED_FILE_KEYWORDS):
        return False
    if any(k in source_path for k in EXCLUDED_FILE_KEYWORDS):
        return False
    if any(k in text for k in EXCLUDED_TEXT_KEYWORDS):
        return False

    # Include chunks clearly related to 橫流溪 keyword.
    haystacks = (source_name, source_path, text, full_text)
    if any(any(topic in h for topic in TARGET_TOPIC_KEYWORDS) for h in haystacks):
        return True

    # Fallback: include expected report/source paths to avoid false negatives
    # when the chunk itself is table-of-contents or heading without "橫流溪".
    if any(hint.lower() in source_path for hint in TARGET_SOURCE_HINTS):
        return True
    if any(hint.lower() in source_name for hint in TARGET_SOURCE_HINTS):
        return True

    return False


def resolve_source_path(source_path: str) -> Path:
    """Resolve and validate source file path under project root."""
    if not source_path:
        raise FileNotFoundError("Missing source path")
    candidate = (PROJECT_ROOT / source_path).resolve()
    root = PROJECT_ROOT.resolve()
    if not str(candidate).startswith(str(root)):
        raise PermissionError("Path outside project root")
    if not candidate.exists() or not candidate.is_file():
        raise FileNotFoundError("Source file not found")
    return candidate


def load_model():
    """Load embedding model (lazy loading)."""
    global _model
    if _model is None:
        if SentenceTransformer is None:
            logger.warning("sentence-transformers not available, RAG features disabled")
            return None
        try:
            logger.info(f"Loading model: {MODEL_NAME}")
            _model = SentenceTransformer(MODEL_NAME)
        except Exception as e:
            logger.error(f"Failed to load model: {e}")
            return None
    return _model


def load_vector_store():
    """Load vector store from JSONL file (lazy loading)."""
    global _vector_store, _metadata_index

    if _vector_store is not None:
        return _vector_store

    if not VECTOR_STORE_FILE.exists():
        logger.warning(f"Vector store not found at {VECTOR_STORE_FILE}")
        return None

    try:
        logger.info("Loading vector store...")
        _vector_store = []
        with open(VECTOR_STORE_FILE, 'r', encoding='utf-8') as f:
            for line_idx, line in enumerate(f):
                try:
                    doc = json.loads(line)
                    # Convert vector to numpy array for faster computation
                    if 'vector' in doc:
                        doc['vector'] = np.array(doc['vector'], dtype=np.float32)
                    _vector_store.append(doc)
                except json.JSONDecodeError as e:
                    logger.warning(f"Skipped invalid JSON at line {line_idx}: {e}")

        logger.info(f"??Loaded {len(_vector_store)} document chunks")

        # Load metadata index
        if METADATA_INDEX_FILE.exists():
            with open(METADATA_INDEX_FILE, 'r', encoding='utf-8') as f:
                _metadata_index = json.load(f)
        else:
            _metadata_index = {}

        return _vector_store
    except Exception as e:
        logger.error(f"Failed to load vector store: {e}")
        return None


def normalize_vector(vector: np.ndarray) -> np.ndarray:
    """Normalize vector for cosine similarity."""
    norm = np.linalg.norm(vector)
    if norm == 0:
        return vector
    return vector / norm


def expand_query(query: str) -> List[str]:
    """
    Expand query using synonyms to improve recall.
    Returns list of expanded query variants.
    """
    expanded = [query]  # Original query

    for key, synonyms in QUERY_SYNONYMS.items():
        if key in query:
            for syn in synonyms:
                expanded_query = query.replace(key, syn)
                if expanded_query not in expanded:
                    expanded.append(expanded_query)

    return expanded


def extract_domain_terms(text: str) -> List[str]:
    """Extract facility, station and domain terms for light reranking."""
    if not text:
        return []

    patterns = [
        r'\d+K\+\d+',
        r'溪構\d+(?:-\d+)?',
        r'平台\d+',
        r'樣站\d+',
        r'\d{2,3}年',
        r'魚道|防砂壩|固床工|平台|步道|護岸|集水井|排水|棲地|深槽|緩流|淺瀨|WUA|流速|水深|面積|健康指數|維護|巡查|損壞|淤積'
    ]
    terms = []
    for pattern in patterns:
        terms.extend(re.findall(pattern, text, flags=re.IGNORECASE))
    return list(dict.fromkeys(str(t).lower() for t in terms if t))


def apply_domain_rerank(query: str, doc: Dict[str, Any], similarity: float) -> float:
    """Boost exact facility/station/domain matches without replacing vector search."""
    query_terms = extract_domain_terms(query)
    if not query_terms:
        return float(similarity)

    haystack = " ".join([
        str(doc.get('source_file', '')),
        str(doc.get('section', '')),
        str(doc.get('text', '')),
        str(doc.get('full_text', ''))
    ]).lower()

    matched = sum(1 for term in query_terms if term in haystack)
    exact_boost = min(0.12, matched * 0.035)
    numeric_boost = 0.03 if matched and re.search(r'\d', haystack) else 0
    return float(min(0.99, similarity + exact_boost + numeric_boost))


def search_similar(query: str, top_k: int = TOP_K_RESULTS, threshold: float = SIMILARITY_THRESHOLD) -> List[Dict[str, Any]]:
    """
    Search for documents similar to the query.

    Args:
        query: User query text
        top_k: Number of top results to return
        threshold: Minimum similarity score

    Returns:
        List of similar documents with scores
    """
    model = load_model()
    vector_store = load_vector_store()

    if model is None or vector_store is None or len(vector_store) == 0:
        logger.warning("RAG system not initialized properly")
        return []

    try:
        # Expand query with synonyms
        expanded_queries = expand_query(query)
        logger.info(f"Query expansion: {len(expanded_queries)} variants")

        # Collect results from all query variants
        all_similarities = {}  # doc_id -> best_score

        for q in expanded_queries:
            # Encode expanded query
            query_vector = model.encode(q, convert_to_numpy=True)
            query_vector = normalize_vector(query_vector)

            # Compute similarities
            for i, doc in enumerate(vector_store):
                if 'vector' not in doc:
                    continue
                doc_vector = normalize_vector(doc['vector'])

                # Cosine similarity
                similarity = np.dot(query_vector, doc_vector)

                similarity = apply_domain_rerank(query, doc, similarity)

                # Track best score for each document
                if i not in all_similarities:
                    all_similarities[i] = similarity
                else:
                    all_similarities[i] = max(all_similarities[i], similarity)

        # Sort by best similarity score
        sorted_results = sorted(all_similarities.items(), key=lambda x: x[1], reverse=True)

        # Filter and return top results
        results = []
        for idx, score in sorted_results:
            if score < threshold:
                break

            doc = vector_store[idx]
            if not is_target_topic_doc(doc):
                continue
            results.append(sanitize_doc_for_output(doc, score))
            if len(results) >= top_k:
                break

        logger.info(f"Found {len(results)} relevant documents for query (with expansion)")
        return results

    except Exception as e:
        logger.error(f"Search failed: {e}")
        return []


def format_sources(docs: List[Dict[str, Any]]) -> str:
    """Format documents as source citations."""
    if not docs:
        return "沒有找到可用來源。"

    citations = []
    for i, doc in enumerate(docs, 1):
        page = doc.get('page', '?')
        source = doc.get('source_file', 'Unknown')
        score = doc.get('score', 0)
        citation = f"來源 {i}: {source} (第 {page} 頁，相關度 {score:.2%})"
        citations.append(citation)

    return '\n'.join(citations)


def build_structured_citations(docs: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Build structured citation objects for frontend rendering."""
    citations = []
    for i, doc in enumerate(docs, 1):
        citations.append({
            'index': i,
            'source_file': doc.get('source_file', 'Unknown'),
            'source_path': doc.get('source_path', ''),
            'page': doc.get('page', '?'),
            'section': doc.get('section', ''),
            'score': float(doc.get('score', 0)),
            'preview': doc.get('preview', ''),
            'source_href': doc.get('source_href', '')
        })
    return citations


def extract_quantitative_evidence(text: str, limit: int = 12) -> List[str]:
    """Extract compact numeric evidence candidates for the LLM answer."""
    if not text:
        return []

    patterns = [
        r'\d+K\+\d+',
        r'\d+(?:\.\d+)?\s*(?:%|％)',
        r'\d+(?:\.\d+)?\s*(?:m²|㎡|平方公尺|公頃|m/s|cm|mm|m|℃)',
        r'(?:WUA|可使用面積|水深|流速|面積|高程|長度|高度|寬度|數量|尾數|座標|TWD97)[^。；;\n]{0,36}\d[^。；;\n]{0,24}'
    ]

    items = []
    for pattern in patterns:
        items.extend(re.findall(pattern, text, flags=re.IGNORECASE))

    cleaned = []
    for item in items:
        value = item if isinstance(item, str) else " ".join(item)
        value = re.sub(r'\s+', ' ', value).strip()
        if value and value not in cleaned:
            cleaned.append(value)
        if len(cleaned) >= limit:
            break
    return cleaned


def get_curated_context(query: str) -> str:
    """Return platform-managed structured facts that complement vector hits."""
    if not query:
        return ""

    keywords = ('WUA', 'wua', '二維', '棲地', '模式', '模擬', '魚道上下游', '深槽', '緩流', '淺瀨')
    if any(keyword in query for keyword in keywords):
        return HABITAT_MODEL_CONTEXT
    return ""


def is_habitat_model_query(query: str) -> bool:
    """Detect questions that should use deterministic habitat-model analysis."""
    keywords = ('WUA', 'wua', '二維', '棲地模式', '模式模擬', '河川棲地', '可使用面積')
    return any(keyword in (query or '') for keyword in keywords)


def generate_habitat_model_answer() -> str:
    """Return a concise quantified answer for the platform habitat-model table."""
    return (
        "量化判讀：\n"
        "第 I 區 0K+460-0K+560，常流水面積 15122.75 m2，最高為纓口臺鰍 6.387%/965.93 m2，最低為臺灣間爬岩鰍 1.728%/261.27 m2。\n"
        "第 II 區 0K+740，常流水面積 10658.05 m2，最高為纓口臺鰍 6.22%/663.449 m2，明潭吻鰕虎 6.11%/651.461 m2 接近，最低為短臀瘋鱨 1.21%/129.152 m2。\n"
        "第 III 區 1K+000，常流水面積 13364.68 m2，纓口臺鰍 9.37%/1252.73 m2 為五區最高，最低為短臀瘋鱨 1.628%/217.64 m2。\n"
        "第 IV 區 1K+170-1K+225，常流水面積 13326.51 m2，最高為明潭吻鰕虎 5.11%/680.28 m2，最低為短臀瘋鱨 1.19%/158.10 m2。\n"
        "第 V 區 1K+315-1K+400，常流水面積 15776.91 m2，最高為纓口臺鰍 5.046%/796.03 m2，最低為短臀瘋鱨 1.11%/174.80 m2。\n"
        "管理判斷：\n"
        "第 III 區是纓口臺鰍核心可用棲地，應優先維持深槽與緩流避難帶；第 II、IV 區明潭吻鰕虎表現較佳，代表岸邊緩流與底質條件需保留。\n"
        "第 I 區與第 V 區分別銜接下游防砂壩及上游魚道群，管理重點是確認魚道上下游是否連續形成深槽、緩流避難帶與淺瀨覓食區。\n"
        "處置建議：\n"
        "巡查時以第 III 區、第 V 區作為優先熱區，紀錄淤積、沖刷、斷流與魚道出入口水深；若 WUA 低於約 2% 的魚種棲地持續集中，應檢討局部流速、底質與遮蔭改善。"
    )


def is_ollama_timeout_answer(answer: str) -> bool:
    """Detect local model failure text and switch to deterministic RAG summary."""
    text = answer or ""
    return any(token in text for token in ("本地模型錯誤", "timed out", "無法連接本地模型", "模型返回空答案"))


def generate_rag_fallback_answer(query: str, docs: List[Dict[str, Any]], query_type: str = 'general') -> str:
    """Create a concise management answer from retrieved snippets when Ollama is slow."""
    joined = "\n".join(str(doc.get('text') or doc.get('preview') or '')[:500] for doc in docs[:5])
    numbers = extract_quantitative_evidence(joined, limit=8)
    chainages = re.findall(r'\d+K\+\d+', query + "\n" + joined)
    facility_terms = []
    for pattern in (r'溪構\s*\d+(?:-\d+)?', r'平台\s*\d+', r'防砂壩', r'固床工', r'魚道', r'護岸', r'步道'):
        facility_terms.extend(re.findall(pattern, query + "\n" + joined))
    facility_terms = list(dict.fromkeys([re.sub(r'\s+', '', x) for x in facility_terms if x]))[:5]

    if query_type == 'engineering':
        risk_words = [word for word in ('裂縫', '淘空', '淘刷', '位移', '沉陷', '背填土方流失', '腐朽', '外框斷裂', '植生覆蓋不良', '淤積') if word in joined or word in query]
        risk_text = "、".join(risk_words[:5]) if risk_words else "本次檢索未確認明確損壞型態，需以現地巡查補強判讀"
        num_text = "；".join(numbers[:5]) if numbers else "本次檢索未提供可量化數值"
        loc_text = "、".join(list(dict.fromkeys(chainages))[:5]) if chainages else "本次問題未取得明確樁號"
        fac_text = "、".join(facility_terms) if facility_terms else "查詢設施"
        return (
            f"量化判讀：{fac_text} 的檢索重點落在 {loc_text}；可用量化線索為 {num_text}。目前可辨識的外觀或維護關鍵詞為 {risk_text}。\n"
            "管理判斷：本次 RAG 已取得維護手冊與橫流溪設施位置相關片段，但本機 Ollama 文字生成逾時，因此先以檢索結果作保守判讀；若現地照片或巡查紀錄已有淘空、裂縫、位移或背填流失，應提高至現場複核等級。\n"
            "處置建議：建議優先補齊最近巡查日期、照片、DER&U 評分與維護完成時間；巡查時量測裂縫寬度、淘刷深度、基礎裸露範圍與排水功能，並將結果回填至維護管理資料。"
        )

    if query_type == 'ecology':
        num_text = "；".join(numbers[:6]) if numbers else "本次檢索未提供可量化數值"
        return (
            f"量化判讀：本次檢索到的生態棲地量化線索為 {num_text}。\n"
            "管理判斷：生態資料應作為棲地影響、魚道連通性與復育評估使用，不直接納入工程健康指數。\n"
            "處置建議：請以二維水理模擬棲地環境、魚道上下游深槽連續性、緩流避難帶與淺瀨覓食區作為後續比對重點。"
        )

    num_text = "；".join(numbers[:6]) if numbers else "本次檢索未提供可量化數值"
    return (
        f"量化判讀：本次 RAG 檢索取得 {len(docs)} 筆相關片段；量化線索為 {num_text}。\n"
        "管理判斷：本機 Ollama 文字生成逾時，系統改以檢索片段提供保守分析，適合作為初步判讀。\n"
        "處置建議：請補充設施名稱、樁號、巡查照片或 DER&U 評分，可提高回答精準度。"
    )


def classify_answer_confidence(docs: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Classify RAG answer confidence based on retrieval quality.

    Three confidence levels:
    - HIGH (≥0.75): Direct recommendation, multiple high-quality sources
    - MEDIUM (0.60-0.75): Suggest human verification, single or medium-quality sources
    - LOW (<0.60): Manual check required, low similarity scores
    - NONE (no docs): Refuse and guide for more data
    """
    if not docs:
        return {
            'confidence_level': 'none',
            'confidence_score': 0.0,
            'answer_policy': 'refuse',
            'policy_label': '❌ 無依據拒答',
            'message': '文檔中未找到相關信息',
            'action': 'REJECT_AND_GUIDE',
            'recommendations': [
                '查無相關資料，建議換個關鍵字再試。',
                '可嘗試：保育魚類、巡查紀錄、設施損壞、黑熊監測、生態調查'
            ]
        }

    # Calculate confidence metrics
    scores = [float(doc.get('score', 0) or 0) for doc in docs]
    top_score = max(scores) if scores else 0
    avg_top3 = sum(sorted(scores, reverse=True)[:3]) / min(len(scores), 3) if scores else 0
    doc_diversity = len(set(doc.get('source_file', '') for doc in docs))

    # Weighted confidence score (0-100)
    confidence_score = round(min(100, max(0, (top_score * 0.7 + avg_top3 * 0.3) * 100)), 1)

    # Classification logic
    if top_score >= 0.75 and doc_diversity >= 2:
        return {
            'confidence_level': 'high',
            'confidence_score': confidence_score,
            'answer_policy': 'direct_recommendation',
            'policy_label': '✅ 高信心 - 可直接作為初步建議',
            'message': f'答覆基於 {len(docs)} 個相關文檔，平均相似度 {avg_top3:.1%}',
            'action': 'ACCEPT',
            'recommendations': [
                '答覆質量高，可直接參考',
                '涉及施工、法規或預算決策時仍需由承辦人複核',
                '所有引用段落均可透過來源連結回查原文'
            ]
        }

    elif top_score >= 0.60:
        return {
            'confidence_level': 'medium',
            'confidence_score': confidence_score,
            'answer_policy': 'human_verify',
            'policy_label': '⚠️ 中信心 - 建議與原始文檔對比',
            'message': f'檢索了 {len(docs)} 個文檔片段，相似度 {top_score:.1%}',
            'action': 'VERIFY',
            'recommendations': [
                '建議與原始文檔對比，確認細節準確性',
                '特別關注日期、數值、專業術語的一致性',
                '可使用一鍵回查原文功能檢查上下文'
            ]
        }

    else:  # top_score < 0.60
        return {
            'confidence_level': 'low',
            'confidence_score': confidence_score,
            'answer_policy': 'manual_check',
            'policy_label': '⛔ 低信心 - 強烈建議人工確認',
            'message': f'檢索相似度 {top_score:.1%}，低於推薦門檻',
            'action': 'MANUAL_CHECK',
            'recommendations': [
                '檢索結果相似度偏低，強烈建議人工確認',
                '請直接查看引用的原始文檔和完整上下文',
                '如果無法確認，請補充更多查詢條件重新搜索'
            ]
        }


def prepare_rag_context(docs: List[Dict[str, Any]], query: str = "") -> str:
    """Prepare retrieved documents as context for LLM."""
    curated_context = get_curated_context(query)
    if not docs and not curated_context:
        return ""

    context_parts = []
    total_chars = 0

    if curated_context:
        context_parts.append(f"平台結構化資料：\n{curated_context}\n")
        total_chars += len(context_parts[-1])

    for doc in docs:
        text = clean_preview_text(doc.get('full_text', doc.get('text', ''))[:750])
        page = doc.get('page', '?')
        source = doc.get('source_file', 'Unknown')
        numbers = extract_quantitative_evidence(text, limit=8)
        numbers_text = f"\n量化資料候選：{'；'.join(numbers)}" if numbers else ""

        part = f"來源：{source}\n頁碼：{page}\n內容：{text}{numbers_text}\n"

        if total_chars + len(part) > MAX_CONTEXT_CHARS:
            break

        context_parts.append(part)
        total_chars += len(part)

    return "\n---\n".join(context_parts)


def get_ollama_status() -> Dict[str, Any]:
    """Return local Ollama connectivity and model availability."""
    try:
        with urllib.request.urlopen(f"{OLLAMA_BASE_URL}/api/tags", timeout=5) as response:
            payload = json.loads(response.read().decode("utf-8"))
        models = [m.get("name") or m.get("model") for m in payload.get("models", [])]
        text_available = OLLAMA_MODEL in models
        vision_available = OLLAMA_VISION_MODEL in models
        return {
            "connected": True,
            "base_url": OLLAMA_BASE_URL,
            "model": OLLAMA_MODEL,
            "vision_model": OLLAMA_VISION_MODEL,
            "available_models": [m for m in models if m],
            "model_available": text_available,
            "vision_model_available": vision_available,
            "ready": text_available and vision_available,
            "recommended_command": f"ollama run {OLLAMA_MODEL}"
        }
    except Exception as e:
        return {
            "connected": False,
            "base_url": OLLAMA_BASE_URL,
            "model": OLLAMA_MODEL,
            "vision_model": OLLAMA_VISION_MODEL,
            "available_models": [],
            "model_available": False,
            "vision_model_available": False,
            "ready": False,
            "recommended_command": f"ollama run {OLLAMA_MODEL}",
            "error": str(e)[:160]
        }


def get_groq_status() -> Dict[str, Any]:
    """Return Groq configuration status without exposing secrets."""
    key_present = bool(os.environ.get("GROQ_API_KEY", "").strip())
    return {
        "configured": key_present,
        "model": GROQ_MODEL,
        "api_url": GROQ_API_URL,
        "vision_model": os.environ.get("GROQ_VISION_MODEL", "meta-llama/llama-4-scout-17b-16e-instruct"),
        "ready": key_present,
    }


def get_management_context_for_query(query: str, limit: int = 6) -> Dict[str, Any]:
    """Load latest inspection and maintenance context for AI grounding."""
    try:
        from webapp import management_context as mgmt
    except Exception:
        try:
            import management_context as mgmt
        except Exception:
            return {"context": "", "evidence": [], "counts": {}}
    try:
        return mgmt.build_management_context(query, limit=limit)
    except Exception as exc:
        logger.warning("Failed to build management context: %s", exc)
        return {"context": "", "evidence": [], "counts": {}}


def _get_ocr_status_for_rag() -> Dict[str, Any]:
    """Return Drive OCR index status if available."""
    try:
        from webapp import gdrive_ocr_service as ocr
    except Exception:
        try:
            import gdrive_ocr_service as ocr
        except Exception:
            return {"available": False}
    try:
        status = ocr.get_status()
        return {
            "available": True,
            "running": bool(status.get("running")),
            "indexed_at": status.get("indexed_at"),
            "total_docs": status.get("total_docs", 0),
            "stats": status.get("stats", {}),
            "folder_id": status.get("folder_id", ""),
        }
    except Exception as exc:
        return {"available": False, "error": str(exc)[:160]}


def clean_generated_answer(text: str) -> str:
    """Remove citation-like wording from model output while keeping analysis."""
    if not text:
        return text

    cleaned = re.sub(r'根據[「『《][^」』》]+[」』》](?:中的內容)?[，,]?\s*', '', text)
    cleaned = re.sub(r'[「『《][^」』》]*(?:\.pdf|成果報告|管理維護手冊)[^」』》]*[」』》](?:中的內容)?', '資料', cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r'根據(?:提供的)?(?:文件|文檔|資料|報告)(?:內容)?[，,]?\s*', '', cleaned)
    cleaned = re.sub(r'(?:\.pdf|PDF)', '', cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r'\n\s*\n+', '\n', cleaned)
    return cleaned.strip()


def generate_answer_with_groq(query: str, context: str, query_type: str = 'general', history: str = '') -> str:
    """Generate answer with Groq OpenAI-compatible API when GROQ_API_KEY exists."""
    key = os.environ.get("GROQ_API_KEY", "").strip()
    if not key:
        return ""

    domain_label = QUERY_TYPE_LABELS.get(query_type, "一般查詢")
    history_block = f"\n【對話歷史】\n{history}\n" if history and history.strip() else ""
    prompt = f"""你是「橫流溪 AI 助理」，請整合 RAG 文件、雲端 OCR 全文、最新巡查資料與維護管理資料回答。
問題類型：{domain_label}

嚴格規則：
1. 僅依據下方上下文回答，不捏造數值。
2. 回答不要列出 PDF 檔名、頁碼或引用來源，直接提出分析成果。
3. 若有日期、DER&U、維護時間、處理階段、照片數、金額、魚道通行狀態或設施名稱，必須量化呈現。
4. 工程設施、巡查資料、維護管理資料與生態資料需分開判讀，不把魚類資料當作工程健康指數直接因子。
5. 回答格式固定為「量化判讀」「管理判斷」「處置建議」三段，每段 1 至 3 點，段落間距要緊湊。
{history_block}
【上下文】
{context}

【使用者問題】
{query}

請以繁體中文、具體且可執行的方式回答："""

    payload = json.dumps({
        "model": GROQ_MODEL,
        "messages": [
            {"role": "system", "content": "你是專業工程維護與生態資料分析助理，使用繁體中文，答案具體、保守、可執行。"},
            {"role": "user", "content": prompt},
        ],
        "temperature": 0.2,
        "max_tokens": 900,
    }).encode("utf-8")

    req = urllib.request.Request(
        GROQ_API_URL,
        data=payload,
        headers={"Content-Type": "application/json", "Authorization": f"Bearer {key}"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=45) as response:
            result = json.loads(response.read().decode("utf-8"))
        text = result.get("choices", [{}])[0].get("message", {}).get("content", "")
        return clean_generated_answer(text.strip()) if text else ""
    except Exception as exc:
        logger.warning("Groq generation failed: %s", str(exc)[:180])
        return ""


def generate_answer_with_ollama(query: str, context: str, query_type: str = 'general', history: str = '') -> str:
    """
    Generate answer using local Ollama LLM based on retrieved context.
    Fully offline - no internet connection required.
    Uses only Python built-in urllib (no external dependencies).

    Args:
        query: User's original question
        context: Prepared context from RAG search results
        query_type: Classified query domain (engineering/ecology/regulation/gis/general)
        history: Prior conversation turns as formatted string

    Returns:
        Generated answer text, or error message if generation fails
    """
    import urllib.request
    import urllib.error
    import json as json_lib

    ollama_url = f"{OLLAMA_BASE_URL}/api/chat"

    # ============================================================
    # 升級 3：查詢類型自適應提示詞 (Query-Type-Aware Prompting)
    # ============================================================
    DOMAIN_FOCUS = {
        'engineering': (
            "本次問題屬於【工程維護】類型。"
            "優先聚焦：設施名稱/樁號、損壞描述、巡查記錄、維修建議、緊急程度判斷。"
            "量化判讀須包含：損壞程度、影響位置（樁號）、發現日期。"
            "管理判斷須說明：是否需要緊急通報、維修優先級。"
            "處置建議須具體說明施工或修繕方式。"
        ),
        'ecology': (
            "本次問題屬於【生態棲地】類型。"
            "優先聚焦：魚種 WUA 百分比/面積、棲地連通性評估、物種保育等級、繁殖期影響。"
            "量化判讀須包含：各物種 WUA 數值（%與 m²）、常流水面積、高低排名。"
            "管理判斷須說明：棲地是否滿足目標物種最低需求。"
            "處置建議須針對魚道、深槽、緩流帶、底質改善提出具體措施。"
        ),
        'regulation': (
            "本次問題屬於【法規合規】類型。"
            "優先聚焦：具體法條名稱/條次、施工標準數值、環評要求、違規罰則。"
            "量化判讀須包含：法定標準數值（如跌水高度 ≤0.5m、SS <100mg/L）。"
            "管理判斷須說明：是否符合規定、哪些項目有違規風險。"
            "處置建議須列出申請流程或改善期限。"
        ),
        'gis': (
            "本次問題屬於【GIS 定位】類型。"
            "優先聚焦：TWD97 座標、樁號（K+）、GPS 誤差、設施位置比對結果。"
            "量化判讀須包含：座標值、樁號里程、位置偏差距離。"
            "管理判斷須說明：定位是否準確、是否有衝突或異常。"
            "處置建議須說明座標更新或測量複核方式。"
        ),
        'general': (
            "本次問題屬於【一般查詢】類型。"
            "盡量從上下文提取量化資料；若上下文資訊多元，先聚焦最有數值支撐的面向。"
        ),
    }

    domain_instruction = DOMAIN_FOCUS.get(query_type, DOMAIN_FOCUS['general'])

    # History block (only include if non-empty)
    history_block = ""
    if history and history.strip():
        history_block = f"\n【對話歷史（僅供參考，以最新問題為主）】\n{history}\n"

    prompt = f"""你是「橫流溪 AI 助理」，任務是根據 RAG 檢索到的橫流溪文件內容，提供工程維護、GIS、生態棲地與魚道管理的具體分析。

{domain_instruction}

嚴格規則：
1. 僅能依據「文檔上下文」回答，不得編造文件外資訊。
2. 若上下文不足，請直接說明「目前檢索內容不足以判定」，並指出需要補充的資料。
3. 使用繁體中文，回答要具體、可執行，避免空泛摘要；每句盡量對應一個設施、樁號、位置、風險或處置。
4. 絕對不要輸出報告名稱、PDF 檔名、章節頁碼、引用格式或「根據《...》」等來源描述；直接給分析成果。
5. 工程設施、地滑監測、生態棲地要分開判讀，不得把魚類資料當作工程健康指數直接因子。
6. 必須優先使用上下文中的量化資料，例如百分比、面積、水深、流速、樁號、座標、年份、數量；若上下文沒有數值，明確寫「本次檢索未提供可量化數值」。
7. 回答格式固定為「量化判讀」「管理判斷」「處置建議」三段，每段 1 至 3 點；段落之間不要空行，不要使用 Markdown 標題符號。
8. 多區或多物種比較時，不要逐一列全部物種；每區只列最高 WUA、最低 WUA、常流水面積與關鍵管理判斷。
9. 回答以 280 至 460 字為原則；除非使用者要求，不要寫長篇摘要。
{history_block}
【文檔上下文】
{context}

【用戶問題】
{query}

請根據上述文檔內容回答："""

    try:
        payload = json_lib.dumps({
            "model": OLLAMA_MODEL,
            "messages": [{"role": "user", "content": prompt}],
            "stream": False,
            "think": False,
            "keep_alive": "10m",
            "options": {
                "temperature": 0.2,
                "top_p": 0.9,
                "num_ctx": 4096,
                "num_predict": 170
            }
        }).encode("utf-8")

        req = urllib.request.Request(
            ollama_url,
            data=payload,
            headers={"Content-Type": "application/json"},
            method="POST"
        )

        with urllib.request.urlopen(req, timeout=OLLAMA_TIMEOUT) as response:
            result = json_lib.loads(response.read().decode("utf-8"))
            answer_text = (
                result.get("message", {}).get("content", "")
                or result.get("response", "")
                or result.get("message", {}).get("thinking", "")
            )
            logger.info(f"Ollama ({OLLAMA_MODEL}) generated {len(answer_text)} characters")
            return clean_generated_answer(answer_text) if answer_text else "模型返回空答案，請稍後重試"

    except urllib.error.URLError as e:
        logger.error(f"Cannot connect to Ollama: {e}")
        return "無法連接本地模型，請確認 Ollama 正在執行"
    except Exception as e:
        logger.error(f"Ollama error: {e}")
        return f"本地模型錯誤：{str(e)[:100]}"


def generate_answer_with_claude(query: str, context: str) -> str:
    """Backward-compatible wrapper; generation now uses local Ollama."""
    return generate_answer_with_ollama(query, context)


def _strip_data_url_image(image_base64: str) -> str:
    """Normalize data URL or raw base64 image payload for Ollama."""
    if not image_base64:
        return ""
    text = image_base64.strip()
    if "," in text and text[:32].lower().startswith("data:image"):
        text = text.split(",", 1)[1]
    # Validate early so endpoint can return a clear message.
    base64.b64decode(text, validate=True)
    return text


def _safe_int(value: Any, default: int, min_value: int, max_value: int) -> int:
    try:
        num = int(round(float(value)))
    except Exception:
        num = default
    return max(min_value, min(max_value, num))


def _safe_float(value: Any, default: float, min_value: float, max_value: float) -> float:
    try:
        num = float(value)
    except Exception:
        num = default
    return max(min_value, min(max_value, num))


def _extract_json_object(text: str) -> Dict[str, Any]:
    """Parse model JSON, tolerating small extra text around it."""
    if not text:
        raise ValueError("empty model response")
    try:
        return json.loads(text)
    except Exception:
        match = re.search(r"\{[\s\S]*\}", text)
        if not match:
            raise
        return json.loads(match.group(0))


def _vision_priority_from_deru(d: int, e: int, r: int) -> Dict[str, Any]:
    score = d * 0.4 + e * 0.25 + r * 0.35
    if d <= 0 or score <= 1.5:
        return {"u": 1, "priority": "低", "label": "U1 定期巡查", "score": round(score, 2)}
    if score <= 2.5:
        return {"u": 2, "priority": "中", "label": "U2 追蹤觀察", "score": round(score, 2)}
    if score <= 3.2:
        return {"u": 3, "priority": "高", "label": "U3 優先維護", "score": round(score, 2)}
    return {"u": 4, "priority": "緊急", "label": "U4 緊急處置", "score": round(score, 2)}


def normalize_vision_inspection(raw: Dict[str, Any], image_name: str = "", facility_name: str = "", findings_text: str = "") -> Dict[str, Any]:
    """Normalize Ollama vision JSON into the frontend inspection analysis schema."""
    d = _safe_int(raw.get("d", raw.get("deru_d")), 1, 0, 4)
    e = _safe_int(raw.get("e", raw.get("deru_e")), 1, 1, 4)
    r = _safe_int(raw.get("r", raw.get("deru_r")), 1, 1, 4)
    deru = _vision_priority_from_deru(d, e, r)

    features = raw.get("deterioration_features") or raw.get("features") or raw.get("damage_features") or []
    if isinstance(features, str):
        features = [part.strip() for part in re.split(r"[、,;；\n]", features) if part.strip()]
    if not isinstance(features, list):
        features = []
    features = [str(item).strip() for item in features if str(item).strip()][:8]
    if not features:
        features = ["影像未明確辨識到異常特徵，建議人工覆核"]

    coverage = _safe_float(
        raw.get("damage_coverage", raw.get("damage_coverage_percent", raw.get("coverage_percent"))),
        0.0,
        0.0,
        100.0
    )
    confidence = _safe_float(raw.get("confidence", raw.get("confidence_score")), 0.72, 0.0, 1.0)
    if confidence > 1:
        confidence = confidence / 100

    abnormal_regions = _safe_int(
        raw.get("abnormal_regions", raw.get("abnormal_region_count", raw.get("regions"))),
        0 if coverage == 0 else max(1, min(4, len(features))),
        0,
        12
    )

    raw_structure_type_hint = str(raw.get("structure_type") or raw.get("structureType") or "").strip()
    context_text = " ".join([facility_name, findings_text, image_name, " ".join(features), raw_structure_type_hint]).lower()
    is_revetment = bool(re.search(r"護岸|revetment|bank|坡腳|岸坡|水際|溪岸|擋土|坡面|漿砌石|塊石|石砌坡|河岸|堤岸", context_text))
    has_scour_signal = bool(re.search(r"淘刷|淘空|沖刷|裸露|掏空|空洞|基礎外露|坡腳流失|scour|undercut|erosion|washout", context_text))
    if is_revetment and (has_scour_signal or coverage <= 8):
        features = [f for f in features if not re.search(r"未明確|未見|無明顯|正常", f)]
        if not any(re.search(r"淘刷|淘空|沖刷|裸露|坡腳|scour|undercut|erosion", f) for f in features):
            features.insert(0, "護岸坡腳淘刷/基礎裸露疑慮")
        coverage = max(coverage, 22.0 if has_scour_signal else 18.0)
        abnormal_regions = max(abnormal_regions, 1)
        d = max(d, 3 if has_scour_signal else 2)
        e = max(e, 3 if coverage > 25 else 2)
        r = max(r, 3 if has_scour_signal else 2)
        confidence = max(confidence, 0.78)
        deru = _vision_priority_from_deru(d, e, r)

    raw_appearance = raw.get("appearance_checklist") or raw.get("appearanceChecklist") or {}
    if not isinstance(raw_appearance, dict):
        raw_appearance = {}

    def _appearance_flag(*keys: str) -> bool:
        for key in keys:
            if key not in raw_appearance:
                continue
            value = raw_appearance.get(key)
            if isinstance(value, bool):
                return value
            if isinstance(value, (int, float)):
                return value > 0
            text_value = str(value).strip()
            if re.search(r"■|true|yes|是|有|觀察|高度疑似|疑似|明顯", text_value, re.IGNORECASE):
                return True
        return False

    feature_text = " ".join(features)
    appearance_checklist = {
        "good": _appearance_flag("good", "良好"),
        "crack": _appearance_flag("crack", "裂縫") or bool(re.search(r"裂|crack", feature_text, re.IGNORECASE)),
        "abrasion": _appearance_flag("abrasion", "磨蝕") or bool(re.search(r"磨蝕|磨耗|剝蝕|abrasion", feature_text, re.IGNORECASE)),
        "scour": _appearance_flag("scour", "淘空") or bool(re.search(r"淘刷|淘空|沖刷|裸露|掏空|空洞|scour|undercut|erosion", feature_text, re.IGNORECASE)),
        "overturn": _appearance_flag("overturn", "傾倒") or bool(re.search(r"傾倒|倒塌|傾斜", feature_text)),
        "settlement": _appearance_flag("settlement", "沉陷") or bool(re.search(r"沉陷|下陷", feature_text)),
        "deformation": _appearance_flag("deformation", "錯動變形") or bool(re.search(r"錯動|變形|鼓出|破碎|不連續", feature_text)),
        "displacement": _appearance_flag("displacement", "位移") or bool(re.search(r"位移|滑移|移動", feature_text)),
        "backfillLoss": _appearance_flag("backfillLoss", "backfill_loss", "填土（石）流失", "填土石流失") or bool(re.search(r"填土|填石|土石流失|鬆散|沖溝", feature_text)),
        "decay": _appearance_flag("decay", "腐朽") or bool(re.search(r"腐朽|腐爛|木構", feature_text)),
        "fireDamage": _appearance_flag("fireDamage", "fire_damage", "火害") or bool(re.search(r"火害|燒灼|焦黑|碳化", feature_text)),
        "frameBreak": _appearance_flag("frameBreak", "frame_break", "外框斷裂") or bool(re.search(r"外框|框架|斷裂|破損|脫落", feature_text)),
        "poorVegetation": _appearance_flag("poorVegetation", "poor_vegetation", "植生覆蓋不良") or bool(re.search(r"植生覆蓋不良|裸露坡面", feature_text)),
        "other": _appearance_flag("other", "其他"),
        "otherText": str(raw_appearance.get("otherText") or raw_appearance.get("other_text") or raw_appearance.get("其他") or "").strip(),
    }
    if any(value is True for key, value in appearance_checklist.items() if key not in ("good", "other")):
        appearance_checklist["good"] = False
    elif abnormal_regions == 0 and coverage <= 0:
        appearance_checklist["good"] = True
    if not appearance_checklist["otherText"] and appearance_checklist["other"]:
        appearance_checklist["otherText"] = "影像中另有需現場複核之可疑狀況"
    if is_revetment and appearance_checklist["scour"]:
        appearance_checklist["backfillLoss"] = True

    structure_type = str(raw.get("structure_type") or raw.get("structureType") or "").strip()
    # 若模型回傳「其他／無法判定」等無效值則視為空
    if structure_type in ("其他／無法判定", "其他/無法判定", "無法判定", "其他", ""):
        structure_type = ""
    if not structure_type:
        type_text = " ".join([facility_name, feature_text])
        if re.search(r"護岸|岸坡|revetment|坡面|漿砌石|塊石護坡|石砌坡|河岸|堤岸", type_text, re.IGNORECASE):
            structure_type = "護岸"
        elif re.search(r"擋土", type_text):
            structure_type = "擋土牆"
        elif re.search(r"固床", type_text):
            structure_type = "固床工"
        elif re.search(r"防砂", type_text):
            structure_type = "防砂壩"
        elif re.search(r"排水|管涵|溝", type_text):
            structure_type = "排水構造"
        elif re.search(r"石籠|蛇籠", type_text):
            structure_type = "蛇籠／石籠"
        elif re.search(r"砌石", type_text):
            structure_type = "砌石構造"
        # 視覺特徵推論：淘刷/石塊異常/基礎裸露 → 大機率護岸
        elif is_revetment or has_scour_signal or re.search(r"淘刷|淘空|坡腳|石塊|基礎裸露|坡腳流失|水際", feature_text):
            structure_type = "護岸"
        # 壩體特徵
        elif re.search(r"壩頂|壩體|護坦|跌水|消能", feature_text):
            structure_type = "固床工"
        else:
            structure_type = "無法判定"
    # 若結構類型解析為護岸但 is_revetment 尚未觸發，補觸發一次
    if structure_type == "護岸" and not is_revetment:
        is_revetment = True
        if has_scour_signal:
            coverage = max(coverage, 22.0)
            abnormal_regions = max(abnormal_regions, 1)
            d = max(d, 2)
            e = max(e, 2)
            r = max(r, 2)
            confidence = max(confidence, 0.78)
            deru = _vision_priority_from_deru(d, e, r)

    severity_grade = str(raw.get("severity_grade") or raw.get("severityGrade") or "").strip().upper()
    if severity_grade not in ("A", "B", "C", "D"):
        if deru["u"] >= 4 or d >= 4 or r >= 4 or coverage >= 50:
            severity_grade = "D"
        elif deru["u"] >= 3 or d >= 3 or r >= 3 or coverage >= 15:
            severity_grade = "C"
        elif abnormal_regions > 0 or coverage > 0:
            severity_grade = "B"
        else:
            severity_grade = "A"

    confidence_label = str(raw.get("confidence_label") or raw.get("confidenceLabel") or "").strip()
    if confidence_label not in ("低", "中", "高"):
        confidence_label = "高" if confidence >= 0.82 else "中" if confidence >= 0.65 else "低"

    findings = str(raw.get("findings_suggestion") or raw.get("summary") or "").strip()
    if not findings:
        findings = f"AI影像輔助判讀：{ '、'.join(features) }；估計異常範圍約{coverage:.0f}%，建議列為{deru['priority']}優先度。"

    action = str(raw.get("action_suggestion") or raw.get("recommendation") or "").strip()
    if not action:
        if deru["priority"] == "緊急":
            action = "建議立即安排現地複查、量測損壞範圍，必要時先行封閉或臨時導排，並排入搶修。"
        elif deru["priority"] == "高":
            action = "建議加密巡查，補拍同角度照片，比對劣化趨勢並安排修復評估。"
        else:
            action = "建議納入後續巡查追蹤，維持照片紀錄與例行維護。"

    reasoning = str(raw.get("reasoning") or raw.get("reason") or "").strip()
    if not reasoning:
        if abnormal_regions > 0:
            reasoning = f"照片中可見或疑似{'、'.join(features)}，研判可能對應外觀檢視異常項目；惟受限於照片角度、遮蔽或解析度，仍建議現場複核。"
        else:
            reasoning = "照片中未見明顯結構異常；惟照片判釋仍受角度、遮蔽或解析度限制，建議依例行巡查追蹤。"

    recommendations = raw.get("recommendations") or raw.get("follow_up") or []
    if isinstance(recommendations, str):
        recommendations = [part.strip() for part in re.split(r"[；;\n]", recommendations) if part.strip()]
    if not isinstance(recommendations, list):
        recommendations = []
    recommendations = [str(item).strip() for item in recommendations if str(item).strip()][:3]
    if not recommendations:
        if severity_grade in ("C", "D"):
            recommendations = ["補拍異常位置近照與上下游方向照片", "現場量測淘刷、裂縫、沉陷或位移範圍", "確認構造物是否仍具導流、防沖或支撐功能"]
        else:
            recommendations = ["維持例行巡查與同角度照片比對", "必要時補拍基礎或牆腳位置"]

    limitations = str(raw.get("limitations") or raw.get("model_notes") or raw.get("notes") or "").strip()
    if not limitations:
        limitations = "本結果僅作為照片判釋初步篩選，不能取代技師、工程人員或現場勘查。"

    return {
        "version": "Ollama-Vision-Inspection-1.0",
        "analysedAt": datetime.now().isoformat(),
        "imageName": image_name or str(raw.get("image_name") or "巡查影像"),
        "abnormalRegions": abnormal_regions,
        "damageCoverage": round(coverage, 1),
        "deteriorationFeatures": features,
        "confidence": round(confidence, 3),
        "priority": deru["priority"],
        "deru": {
            "d": d,
            "e": e,
            "r": r,
            "u": deru["u"],
            "score": deru["score"],
            "label": deru["label"]
        },
        "appearanceChecklist": appearance_checklist,
        "structureType": structure_type,
        "severityGrade": severity_grade,
        "confidenceLabel": confidence_label,
        "reasoning": reasoning,
        "recommendations": recommendations,
        "limitations": limitations,
        "findingsSuggestion": findings,
        "actionSuggestion": action,
        "modelNotes": limitations,
    }


def analyze_inspection_image_with_ollama(
    image_base64: str,
    facility_name: str = "",
    findings: str = "",
    weather: str = "",
    image_name: str = "",
) -> Dict[str, Any]:
    """Call Ollama vision model and return normalized inspection analysis."""
    image_payload = _strip_data_url_image(image_base64)
    prompt = f"""分析橫流溪工程設施巡查照片，回傳 JSON，不要 Markdown。
設施：{facility_name or "未提供"}　天氣：{weather or "未提供"}　巡查文字：{findings or "未提供"}

【構造物類型辨識規則 — 必須優先判斷】
• 沿溪岸石塊坡面/混凝土護面/漿砌石坡 → structure_type="護岸"（石塊看似自然分布仍屬護岸）
• 橫跨溪床混凝土壩體（有跌水面/消能池） → "固床工"或"防砂壩"
• 格網籠狀填石（格賓籠） → "蛇籠／石籠"
• 不確定時：若照片有溪岸坡面 → 優先輸出"護岸"而非"其他／無法判定"

【護岸異常重點（坡腳淘刷 ≠ 土砂淤積）】
• 坡腳石塊鬆脫/基礎部位裸露/水際線下方空洞 → scour=true, D≥2, E≥2, R≥2
• 坡面石塊位移/傾斜/整排脫落 → displacement=true, D≥3
• 河道內土砂堆積 = 淤積問題（不等於護岸損壞）；坡腳淘刷才是護岸異常
• 坡腳淘刷+土石流失 → 雙重勾選 scour=true + backfillLoss=true
評分：D0-4損壞程度，E1-4損壞範圍（<5%/5-25%/25-50%/>50%），R1-4風險（低/追蹤/影響功能/阻斷安全）。

JSON欄位（直接給值，不加說明文字）：
{{"abnormal_regions":整數,"damage_coverage":數字,"deterioration_features":["護岸坡腳淘刷/基礎裸露"等具體描述],"structure_type":"護岸/擋土牆/固床工/防砂壩/排水構造/邊坡保護設施/蛇籠／石籠/砌石構造/其他／無法判定","appearance_checklist":{{"good":bool,"crack":bool,"abrasion":bool,"scour":bool,"overturn":bool,"settlement":bool,"deformation":bool,"displacement":bool,"backfillLoss":bool,"decay":bool,"fireDamage":bool,"frameBreak":bool,"poorVegetation":bool,"other":bool,"otherText":""}},"d":0-4,"e":1-4,"r":1-4,"confidence":0-1,"confidence_label":"低/中/高","severity_grade":"A/B/C/D","reasoning":"繁體中文2句（描述照片可見什麼、判斷依據）","recommendations":["建議1","建議2"],"findings_suggestion":"一句摘要","action_suggestion":"一句建議"}}"""

    payload = json.dumps({
        "model": OLLAMA_VISION_MODEL,
        "prompt": prompt,
        "images": [image_payload],
        "stream": False,
        "think": False,
        "format": "json",
        "keep_alive": "10m",
        "options": {
            "temperature": 0.1,
            "top_p": 0.8,
            "num_ctx": 4096,
            "num_predict": 520
        }
    }).encode("utf-8")

    req = urllib.request.Request(
        f"{OLLAMA_BASE_URL}/api/generate",
        data=payload,
        headers={"Content-Type": "application/json"},
        method="POST"
    )

    with urllib.request.urlopen(req, timeout=OLLAMA_TIMEOUT) as response:
        result = json.loads(response.read().decode("utf-8"))

    model_text = result.get("response", "")
    parsed = _extract_json_object(model_text)
    normalized = normalize_vision_inspection(parsed, image_name=image_name, facility_name=facility_name, findings_text=findings)
    normalized.update({
        "provider": "ollama",
        "model": OLLAMA_VISION_MODEL,
        "inferenceMode": "ollama_vision_realtime",
        "isTraining": False,
        "rawModelResponse": model_text[:1200],
    })
    return normalized


# ============================================================
# 升級 4：多輪對話記憶 (Multi-turn Dialogue Memory)
# ============================================================
import time as _time

# In-memory conversation store: {session_id: [{"role": "user"|"assistant", "content": str, "ts": float}]}
_conversation_store: Dict[str, List[Dict[str, Any]]] = {}
_MAX_HISTORY_TURNS = 3          # how many prior Q-A pairs to inject
_SESSION_TTL_SECONDS = 1800     # expire sessions after 30 minutes of inactivity
_MAX_HISTORY_CHARS = 800        # cap history injected into prompt


def _prune_expired_sessions() -> None:
    """Remove sessions that have been idle beyond TTL (called lazily)."""
    now = _time.time()
    expired = [sid for sid, turns in _conversation_store.items()
               if turns and (now - turns[-1].get('ts', 0)) > _SESSION_TTL_SECONDS]
    for sid in expired:
        del _conversation_store[sid]


def get_conversation_history(session_id: str) -> str:
    """
    Return the last N turns of a session as a formatted string for prompt injection.
    Returns empty string if no history or unknown session.
    """
    if not session_id or session_id not in _conversation_store:
        return ""

    turns = _conversation_store[session_id]
    # Take last MAX_HISTORY_TURNS pairs (user + assistant)
    recent = turns[-(2 * _MAX_HISTORY_TURNS):]

    lines = []
    total_chars = 0
    for entry in recent:
        role_label = "用戶" if entry.get("role") == "user" else "助理"
        snippet = entry.get("content", "")[:300]
        line = f"{role_label}：{snippet}"
        total_chars += len(line)
        if total_chars > _MAX_HISTORY_CHARS:
            break
        lines.append(line)

    return "\n".join(lines)


def update_conversation(session_id: str, query: str, answer: str) -> None:
    """Append a Q-A pair to the session store."""
    if not session_id:
        return

    _prune_expired_sessions()

    if session_id not in _conversation_store:
        _conversation_store[session_id] = []

    now = _time.time()
    _conversation_store[session_id].append({"role": "user", "content": query, "ts": now})
    _conversation_store[session_id].append({"role": "assistant", "content": answer, "ts": now})

    # Keep store bounded
    if len(_conversation_store[session_id]) > _MAX_HISTORY_TURNS * 2 + 2:
        _conversation_store[session_id] = _conversation_store[session_id][-((_MAX_HISTORY_TURNS + 1) * 2):]


# ============================================================================
# Flask Routes
# ============================================================================

@rag.route('/search', methods=['POST'])
def search():
    """
    Search for relevant documents.

    Request JSON:
        {
            "query": "皞芣?11 ?閬?雿雁霅瘀?",
            "top_k": 8,
            "threshold": 0.6
        }

    Returns:
        {
            "results": [...],
            "count": 5,
            "query": "...",
            "status": "success"
        }
    """
    logger.info("DEBUG: /api/rag/search endpoint called!")
    try:
        data = request.get_json() or {}
        query = data.get('query', '').strip()

        if not query:
            return jsonify({
                'status': 'error',
                'message': 'Empty query',
                'results': []
            }), 400

        top_k = data.get('top_k', TOP_K_RESULTS)
        threshold = data.get('threshold', SIMILARITY_THRESHOLD)

        results = search_similar(query, top_k=top_k, threshold=threshold)

        return jsonify({
            'status': 'success',
            'query': query,
            'count': len(results),
            'results': results,
            'timestamp': datetime.now().isoformat()
        })

    except Exception as e:
        logger.error(f"Search endpoint error: {e}")
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500


@rag.route('/chat', methods=['POST'])
def chat():
    """
    RAG chat endpoint - search and prepare context for Claude.

    Request JSON:
        {
            "query": "皞芣?11 ?閬?雿雁霅瘀?",
            "use_claude": true
        }

    Returns:
        {
            "status": "success",
            "query": "...",
            "sources": [...],
            "context": "...",
            "source_citations": "..."
        }
    """
    try:
        data = request.get_json() or {}
        query = data.get('query', '').strip()

        if not query:
            return jsonify({
                'status': 'error',
                'message': 'Empty query'
            }), 400

        # ── 升級 1：查詢分類 ─────────────────────────────
        query_type = classify_query_type(query)
        query_type_label = QUERY_TYPE_LABELS.get(query_type, '一般查詢')
        logger.info(f"Query type: {query_type} ({query_type_label})")

        # ── 升級 4：多輪對話記憶 ─────────────────────────
        session_id = data.get('session_id', '').strip() or None
        history = get_conversation_history(session_id) if session_id else ''

        # ── 升級 2：BM25 混合檢索 ────────────────────────
        results = hybrid_search(query, top_k=TOP_K_RESULTS, threshold=SIMILARITY_THRESHOLD)
        curated_context = get_curated_context(query)
        management_payload = get_management_context_for_query(query, limit=6)
        management_context_text = (management_payload.get("context") or "").strip()

        logger.info(f"hybrid_search returned {len(results)} results")

        if not results and not curated_context and not management_context_text:
            confidence = classify_answer_confidence([])
            response_data = {
                'status': 'success',
                'query': query,
                'answer': '目前未檢索到足以支持分析的橫流溪內容。請改用更具體的關鍵字，例如「溪構5-2」、「魚道維護」、「平台設施」、「棲地二維模式」或「巡查異常」。',
                'sources': [],
                'context': '',
                'source_citations': '沒有找到可用來源。',
                'structured_citations': [],
                'has_context': False,
                'inference_mode': 'rag_ollama',
                'llm_provider': 'ollama',
                'llm_model': OLLAMA_MODEL,
                'groq': get_groq_status(),
                'management_context': management_payload.get("counts", {}),
                'is_training': False,
                'query_type': query_type,
                'query_type_label': query_type_label,
            }
            response_data.update(confidence)
            return jsonify(response_data)

        if not results and (curated_context or management_context_text):
            context = prepare_rag_context([], query)
            if management_context_text:
                context = "\n---\n".join([f"最新巡查與維護管理資料：\n{management_context_text}", context]).strip()
            used_habitat_template = is_habitat_model_query(query)
            answer_text = (
                generate_habitat_model_answer()
                if used_habitat_template
                else generate_answer_with_groq(query, context, query_type=query_type, history=history)
            )
            llm_provider = 'platform' if used_habitat_template else ('groq' if answer_text else 'ollama')
            llm_model = '平台二維水理棲地結構化資料' if used_habitat_template else (GROQ_MODEL if answer_text else OLLAMA_MODEL)
            if not answer_text and not used_habitat_template:
                answer_text = generate_answer_with_ollama(query, context, query_type=query_type, history=history)
            if is_ollama_timeout_answer(answer_text):
                answer_text = generate_rag_fallback_answer(query, [], query_type=query_type)
            if session_id:
                update_conversation(session_id, query, answer_text)
            confidence = {
                'confidence_level': 'medium',
                'confidence_score': 65.0,
                'answer_policy': 'human_verify',
                'policy_label': '⚠️ 中信心 - 依平台結構化資料回答',
                'message': '使用平台已建置的結構化棲地二維模式數據，建議與原始圖表複核。',
                'action': 'VERIFY',
                'recommendations': ['涉及審查或設計調整時，請與原始二維模式圖表交叉確認。']
            }
            response_data = {
                'status': 'success',
                'query': query,
                'answer': answer_text,
                'sources': [],
                'context': context,
                'source_citations': '使用平台結構化資料。',
                'structured_citations': [],
                'management_evidence': management_payload.get("evidence", []),
                'management_context': management_payload.get("counts", {}),
                'has_context': True,
                'inference_mode': 'rag_groq' if llm_provider == 'groq' else 'rag_ollama',
                'llm_provider': llm_provider,
                'llm_model': llm_model,
                'groq': get_groq_status(),
                'is_training': False,
                'timestamp': datetime.now().isoformat(),
                'query_type': query_type,
                'query_type_label': query_type_label,
                'session_id': session_id,
            }
            response_data.update(confidence)
            return jsonify(response_data)

        # ── 升級 3：結構化分析報告（透過 query_type-aware prompt）──
        context = prepare_rag_context(results, query)
        if management_context_text:
            context = "\n---\n".join([f"最新巡查與維護管理資料：\n{management_context_text}", context]).strip()
        citations = format_sources(results)
        structured_citations = build_structured_citations(results)
        confidence = classify_answer_confidence(results)

        used_habitat_template = is_habitat_model_query(query)
        answer_text = (
            generate_habitat_model_answer()
            if used_habitat_template
            else generate_answer_with_groq(query, context, query_type=query_type, history=history)
        )
        llm_provider = 'platform' if used_habitat_template else ('groq' if answer_text else 'ollama')
        llm_model = '平台二維水理棲地結構化資料' if used_habitat_template else (GROQ_MODEL if answer_text else OLLAMA_MODEL)
        if not answer_text and not used_habitat_template:
            answer_text = generate_answer_with_ollama(query, context, query_type=query_type, history=history)
        if is_ollama_timeout_answer(answer_text):
            answer_text = generate_rag_fallback_answer(query, results, query_type=query_type)

        # ── 升級 4：保存對話記憶 ────────────────────────
        if session_id:
            update_conversation(session_id, query, answer_text)

        response_data = {
            'status': 'success',
            'query': query,
            'answer': answer_text,
            'sources': results,
            'context': context,
            'source_citations': citations,
            'structured_citations': structured_citations,
            'management_evidence': management_payload.get("evidence", []),
            'management_context': management_payload.get("counts", {}),
            'has_context': len(context) > 0,
            'inference_mode': 'rag_groq' if llm_provider == 'groq' else 'rag_ollama',
            'llm_provider': llm_provider,
            'llm_model': llm_model,
            'groq': get_groq_status(),
            'is_training': False,
            'timestamp': datetime.now().isoformat(),
            'query_type': query_type,
            'query_type_label': query_type_label,
            'session_id': session_id,
            'confidence_level': confidence.get('confidence_level', 'unknown'),
            'confidence_score': confidence.get('confidence_score', 0),
            'policy_label': confidence.get('policy_label', ''),
            'message': confidence.get('message', ''),
            'action': confidence.get('action', ''),
            'recommendations': confidence.get('recommendations', []),
            'answer_policy': confidence.get('answer_policy', ''),
            'verification_marker': 'NLP_RAG_V4',
        }

        return jsonify(response_data)

    except Exception as e:
        logger.error(f"Chat endpoint error: {e}")
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500


@rag.route('/vision-inspection', methods=['POST'])
def vision_inspection():
    """
    Ollama vision endpoint for patrol image recognition and DER&U assist scoring.

    Request JSON:
        {
            "image_base64": "data:image/jpeg;base64,...",
            "image_name": "inspection.jpg",
            "facility_name": "溪構5-2 潛越式魚道",
            "findings": "入口淤積堵塞...",
            "weather": "颱風後"
        }
    """
    try:
        data = request.get_json() or {}
        image_base64 = (data.get("image_base64") or data.get("image") or "").strip()
        if not image_base64:
            return jsonify({
                "status": "error",
                "message": "缺少 image_base64，請先上傳巡查影像。"
            }), 400

        analysis = analyze_inspection_image_with_ollama(
            image_base64=image_base64,
            image_name=str(data.get("image_name") or ""),
            facility_name=str(data.get("facility_name") or ""),
            findings=str(data.get("findings") or ""),
            weather=str(data.get("weather") or ""),
        )

        return jsonify({
            "status": "success",
            "analysis": analysis,
            "ollama": {
                "base_url": OLLAMA_BASE_URL,
                "vision_model": OLLAMA_VISION_MODEL,
                "connected": True
            },
            "timestamp": datetime.now().isoformat()
        })

    except urllib.error.URLError as e:
        logger.error(f"Ollama vision connection error: {e}")
        return jsonify({
            "status": "error",
            "message": "無法連接 Ollama vision 模型，請確認 Ollama 已啟動且已安裝 vision 模型。",
            "fallback_allowed": True,
            "ollama": {
                "base_url": OLLAMA_BASE_URL,
                "vision_model": OLLAMA_VISION_MODEL,
                "connected": False
            },
            "detail": str(e)[:200]
        }), 503
    except Exception as e:
        logger.error(f"Vision inspection endpoint error: {e}")
        return jsonify({
            "status": "error",
            "message": str(e)[:220],
            "fallback_allowed": True,
            "ollama": {
                "base_url": OLLAMA_BASE_URL,
                "vision_model": OLLAMA_VISION_MODEL,
                "connected": False
            }
        }), 500


@rag.route('/documents', methods=['GET'])
def list_documents():
    """
    List all indexed documents.

    Returns:
        {
            "status": "success",
            "documents": [...],
            "manifest": {...}
        }
    """
    try:
        if not MANIFEST_FILE.exists():
            return jsonify({
                'status': 'success',
                'documents': [],
                'manifest': None
            })

        with open(MANIFEST_FILE, 'r', encoding='utf-8') as f:
            manifest = json.load(f)

        return jsonify({
            'status': 'success',
            'documents': manifest.get('documents', []),
            'manifest': manifest,
            'total_chunks': manifest.get('total_chunks', 0)
        })

    except Exception as e:
        logger.error(f"List documents error: {e}")
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500


@rag.route('/status', methods=['GET'])
def status():
    """
    Check RAG system status.

    Returns:
        {
            "status": "ready|not_ready",
            "model_loaded": bool,
            "vector_store_loaded": bool,
            "chunk_count": int
        }
    """
    try:
        vector_store = load_vector_store()

        chunk_count = len(vector_store) if vector_store else 0
        # Status should be a cheap health check. Do not initialize the embedding
        # model here, otherwise Render/local status panels can stall before any
        # user query is made.
        model_loaded = _model is not None
        is_ready = vector_store is not None and chunk_count > 0

        return jsonify({
            'status': 'ready' if is_ready else 'not_ready',
            'model_loaded': model_loaded,
            'model_lazy_load': True,
            'vector_store_loaded': vector_store is not None,
            'chunk_count': chunk_count,
            'model_name': MODEL_NAME,
            'ollama': get_ollama_status(),
            'groq': get_groq_status(),
            'management_context': get_management_context_for_query('', limit=3).get('counts', {}),
            'ocr': _get_ocr_status_for_rag(),
            'vector_store_path': str(VECTOR_STORE_FILE),
            'inference_mode': 'rag_groq_ollama' if get_groq_status().get('configured') else 'rag_ollama',
            'is_training': False,
            'nlp_features': [
                '中文查詢語意解析',
                '橫流溪領域詞與同義詞擴展',
                '設施名稱、樁號、年份與量化數值抽取',
                '工程設施、地滑監測、生態棲地分流判讀'
            ],
            'rag_features': [
                '文件切塊與向量化',
                '語意向量檢索',
                '設施/樁號/量化線索重排序',
                '信心分級與拒答機制',
                'Ollama 本機即時推論'
            ],
            'timestamp': datetime.now().isoformat()
        })

    except Exception as e:
        logger.error(f"Status check error: {e}")
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500


# ============================================================================
# Registration helper
# ============================================================================

def register_rag_blueprint(app):
    """Register RAG blueprint with Flask app."""
    app.register_blueprint(rag)
    logger.info("RAG blueprint registered successfully")


@rag.route('/test-confidence', methods=['GET'])
def test_confidence():
    """Test endpoint to verify confidence fields are returned correctly."""
    confidence = {
        'confidence_level': 'high',
        'confidence_score': 85.5,
        'policy_label': '✅ High Confidence',
        'message': 'Test message',
        'action': 'ACCEPT',
        'recommendations': ['Test 1', 'Test 2'],
        'answer_policy': 'direct_recommendation'
    }

    response = jsonify(confidence)
    print(f"DEBUG: test-confidence response keys: {list(confidence.keys())}", flush=True)
    return response


@rag.route('/document', methods=['GET'])
def open_document():
    """
    Open source document by source_path and optional page.
    Use with frontend hyperlinks for traceable evidence navigation.
    """
    source_path = (request.args.get('source_path') or '').strip()
    page = request.args.get('page', '1').strip()
    try:
        page_num = int(page)
    except ValueError:
        page_num = 1

    try:
        resolved = resolve_source_path(source_path)
    except PermissionError:
        abort(403)
    except FileNotFoundError:
        abort(404)

    response = send_file(str(resolved), as_attachment=False)
    if resolved.suffix.lower() == '.pdf':
        response.headers['Content-Type'] = 'application/pdf'
        response.headers['X-Source-Page'] = str(max(1, page_num))
    return response
