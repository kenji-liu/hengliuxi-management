#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""NLP + Hybrid RAG + Local AI API extension for the Hengliuxi platform.

This module adds structured endpoints required by
NLP_RAG_LocalAI_Codex_強化說明.md while reusing the existing rag_backend
retrieval, Ollama generation, and confidence policy.
"""

from __future__ import annotations

from datetime import datetime
import html
import json
import logging
import os
import re
import sqlite3
import time
import urllib.parse
import urllib.request
from typing import Any, Dict, List, Optional

from flask import Blueprint, jsonify, request

try:
    from webapp import rag_backend
except Exception:  # pragma: no cover - handled at runtime by status endpoint
    rag_backend = None

try:
    from webapp import management_context
except Exception:  # pragma: no cover - optional runtime context
    management_context = None

try:
    from webapp import answer_engine
except Exception:  # pragma: no cover - optional runtime context
    try:
        import answer_engine  # type: ignore
    except Exception:
        answer_engine = None

try:
    from webapp import agent_tools
except Exception:  # pragma: no cover - optional runtime context
    try:
        import agent_tools  # type: ignore
    except Exception:
        agent_tools = None

try:
    from webapp import retrieval as doc_retrieval
except Exception:  # pragma: no cover - optional runtime context
    try:
        import retrieval as doc_retrieval  # type: ignore
    except Exception:
        doc_retrieval = None

try:
    from webapp.ai_model_config import public_modes, resolve_mode
except Exception:
    from ai_model_config import public_modes, resolve_mode


nlp_rag = Blueprint("nlp_rag", __name__, url_prefix="/api")


INTENT_RULES = {
    "engineering_facility_query": {
        "label": "工程設施查詢",
        "keywords": ["設施", "構造物", "溪構", "魚道", "固床工", "防砂壩", "護岸", "平台", "步道", "維護", "巡查"],
    },
    "inspection_damage_query": {
        "label": "巡查異常與損壞查詢",
        "keywords": ["巡查", "異常", "損壞", "裂縫", "磨損", "淘空", "淘刷", "淤積", "沉陷", "位移", "DER", "DER&U"],
    },
    "ecology_habitat_query": {
        "label": "溪流生態與棲地查詢",
        "keywords": ["魚類", "魚種", "棲地", "生態", "WUA", "水深", "流速", "深槽", "緩流", "淺瀨", "二維水理"],
    },
    "gis_query": {
        "label": "GIS 空間定位查詢",
        "keywords": ["GIS", "地圖", "圖層", "座標", "TWD97", "樁號", "里程", "K+", "定位"],
    },
    "risk_query": {
        "label": "風險與健康指數評估",
        "keywords": ["風險", "健康", "優先", "維護急迫", "U3", "高異常", "中異常", "低異常", "嚴重"],
    },
}


SPECIES_TERMS = [
    "臺灣石魚賓",
    "台灣石魚賓",
    "臺灣白甲魚",
    "台灣白甲魚",
    "臺灣間爬岩鰍",
    "台灣間爬岩鰍",
    "纓口臺鰍",
    "纓口台鰍",
    "明潭吻鰕虎",
    "短臀瘋鱨",
    "短吻紅斑吻鰕虎",
]

STRUCTURE_TYPE_TERMS = [
    "魚道",
    "固床工",
    "防砂壩",
    "護岸",
    "平台",
    "步道",
    "排水",
    "擋土牆",
    "邊坡",
    "集水井",
]

DAMAGE_TERMS = [
    "裂縫",
    "磨蝕",
    "磨損",
    "淘空",
    "淘刷",
    "傾倒",
    "沉陷",
    "錯動",
    "變形",
    "位移",
    "填土流失",
    "填石流失",
    "腐朽",
    "外框斷裂",
    "植生覆蓋不良",
    "淤積",
]


SCHEMA_SQL = """
CREATE TABLE IF NOT EXISTS documents (
  id INTEGER PRIMARY KEY,
  file_name TEXT NOT NULL,
  file_type TEXT,
  source_path TEXT,
  year TEXT,
  created_at TEXT,
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS document_chunks (
  id INTEGER PRIMARY KEY,
  document_id INTEGER,
  chunk_text TEXT NOT NULL,
  page INTEGER,
  section TEXT,
  metadata TEXT,
  embedding_id TEXT
);

CREATE TABLE IF NOT EXISTS structures (
  id INTEGER PRIMARY KEY,
  structure_id TEXT UNIQUE,
  name TEXT,
  type TEXT,
  river TEXT DEFAULT '橫流溪',
  mileage TEXT,
  longitude REAL,
  latitude REAL,
  status TEXT,
  health_score REAL
);

CREATE TABLE IF NOT EXISTS inspection_records (
  id INTEGER PRIMARY KEY,
  structure_id TEXT,
  inspection_date TEXT,
  abnormal_type TEXT,
  severity TEXT,
  description TEXT,
  recommendation TEXT,
  inspector TEXT
);

CREATE TABLE IF NOT EXISTS fish_records (
  id INTEGER PRIMARY KEY,
  year TEXT,
  station_id TEXT,
  river TEXT DEFAULT '橫流溪',
  species_name TEXT,
  scientific_name TEXT,
  count INTEGER,
  habitat_type TEXT,
  longitude REAL,
  latitude REAL
);

CREATE TABLE IF NOT EXISTS habitat_records (
  id INTEGER PRIMARY KEY,
  station_id TEXT,
  river TEXT DEFAULT '橫流溪',
  survey_date TEXT,
  habitat_type TEXT,
  substrate TEXT,
  water_depth REAL,
  velocity REAL,
  vegetation TEXT,
  description TEXT
);

CREATE TABLE IF NOT EXISTS photo_analysis (
  id INTEGER PRIMARY KEY,
  photo_id TEXT,
  structure_id TEXT,
  photo_path TEXT,
  detected_type TEXT,
  severity TEXT,
  confidence REAL,
  bbox TEXT,
  description TEXT
);

CREATE TABLE IF NOT EXISTS rag_logs (
  id INTEGER PRIMARY KEY,
  user_query TEXT,
  parsed_intent TEXT,
  retrieved_sources TEXT,
  answer TEXT,
  confidence REAL,
  created_at TEXT
);

CREATE TABLE IF NOT EXISTS ai_usage_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp TEXT NOT NULL,
  user_question TEXT NOT NULL,
  selected_mode TEXT,
  resolved_mode TEXT,
  actual_model TEXT,
  provider TEXT,
  input_tokens INTEGER DEFAULT 0,
  output_tokens INTEGER DEFAULT 0,
  estimated_cost REAL DEFAULT 0,
  response_time REAL DEFAULT 0,
  rag_chunk_count INTEGER DEFAULT 0,
  answer_success INTEGER DEFAULT 0,
  error_type TEXT
);
""".strip()


_AI_USAGE_DB = os.environ.get(
    "AI_USAGE_DB",
    os.path.join(os.path.dirname(__file__), "data", "ai_usage.sqlite3"),
)


def _usage_db() -> sqlite3.Connection:
    os.makedirs(os.path.dirname(_AI_USAGE_DB) or ".", exist_ok=True)
    conn = sqlite3.connect(_AI_USAGE_DB, timeout=5)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.executescript(SCHEMA_SQL)
    return conn


def _log_ai_usage(record: Dict[str, Any]) -> None:
    try:
        with _usage_db() as conn:
            conn.execute(
                """INSERT INTO ai_usage_logs (
                    timestamp, user_question, selected_mode, resolved_mode,
                    actual_model, provider, input_tokens, output_tokens,
                    estimated_cost, response_time, rag_chunk_count,
                    answer_success, error_type
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (
                    _now(), _as_text(record.get("user_question")),
                    _as_text(record.get("selected_mode")), _as_text(record.get("resolved_mode")),
                    _as_text(record.get("actual_model")), _as_text(record.get("provider")),
                    int(record.get("input_tokens") or 0), int(record.get("output_tokens") or 0),
                    float(record.get("estimated_cost") or 0), float(record.get("response_time") or 0),
                    int(record.get("rag_chunk_count") or 0), 1 if record.get("answer_success") else 0,
                    _as_text(record.get("error_type")),
                ),
            )
    except Exception as exc:
        logging.getLogger(__name__).warning("[AI_USAGE] log failed: %s", exc)


def _now() -> str:
    return datetime.now().isoformat()


def _as_text(value: Any) -> str:
    return str(value or "").strip()


def _unique(items: List[str]) -> List[str]:
    seen = set()
    out = []
    for item in items:
        if item and item not in seen:
            out.append(item)
            seen.add(item)
    return out


def _extract_entities(query: str) -> Dict[str, Any]:
    years = _unique(re.findall(r"(?:10[7-9]|11[0-9]|20\d{2})年?", query))
    mileages = _unique(re.findall(r"\d+K\+\d+", query, flags=re.IGNORECASE))
    structure_names = _unique(re.findall(r"溪構\d+(?:-\d+)?|平台\d+|樣站\d+|FD\d+", query, flags=re.IGNORECASE))
    structure_types = [term for term in STRUCTURE_TYPE_TERMS if term in query]
    species = [term for term in SPECIES_TERMS if term in query]
    damage_types = [term for term in DAMAGE_TERMS if term in query]
    risk_level = None
    for key in ["嚴重", "高", "中", "低", "緊急", "優先"]:
        if key in query:
            risk_level = key
            break

    return {
        "river_name": "橫流溪" if "橫流溪" in query or not re.search(r"[^\s]+溪", query) else None,
        "structure_name": structure_names,
        "structure_id": structure_names,
        "structure_type": structure_types,
        "mileage": mileages,
        "year": years,
        "species": species,
        "habitat_type": [t for t in ["深槽", "深潭", "緩流", "淺瀨", "急流", "底質", "水深", "流速"] if t in query],
        "damage_type": damage_types,
        "risk_level": risk_level,
        "location": mileages,
        "data_source": [t for t in ["PDF", "報告", "GIS", "巡查", "照片", "二維水理"] if t.lower() in query.lower()],
    }


def parse_query(query: str) -> Dict[str, Any]:
    q = _as_text(query)
    scores = {}
    for intent, rule in INTENT_RULES.items():
        scores[intent] = sum(1 for kw in rule["keywords"] if kw.lower() in q.lower())
    intent = max(scores, key=scores.get) if scores else "general_query"
    if scores.get(intent, 0) == 0:
        intent = "general_query"
    label = INTENT_RULES.get(intent, {}).get("label", "一般綜合查詢")
    entities = _extract_entities(q)
    filters = {
        "river": entities.get("river_name") or "橫流溪",
        "year": entities.get("year"),
        "structure_type": entities.get("structure_type"),
        "structure_id": entities.get("structure_id"),
        "mileage": entities.get("mileage"),
        "species": entities.get("species"),
        "damage_type": entities.get("damage_type"),
        "risk_level": entities.get("risk_level"),
    }
    rewrite_terms = []
    for key in ("structure_name", "structure_type", "mileage", "species", "damage_type", "habitat_type"):
        value = entities.get(key)
        if isinstance(value, list):
            rewrite_terms.extend(value)
        elif value:
            rewrite_terms.append(str(value))
    rewritten_query = " ".join(_unique(["橫流溪", label, q] + rewrite_terms))
    return {
        "query": q,
        "intent": intent,
        "intent_label": label,
        "entities": entities,
        "filters": filters,
        "rewritten_query": rewritten_query,
        "timestamp": _now(),
    }


def _doc_to_evidence(doc: Dict[str, Any]) -> Dict[str, Any]:
    text = _as_text(doc.get("preview") or doc.get("text"))
    if len(text) > 260:
        text = text[:260] + "..."
    return {
        "source": doc.get("source_file") or "平台資料",
        "page": doc.get("page"),
        "section": doc.get("section") or "",
        "date": doc.get("date") or doc.get("survey_date") or doc.get("year") or "",
        "facility": doc.get("facility") or doc.get("facility_name") or doc.get("structure_name") or "",
        "record_type": doc.get("record_type") or doc.get("document_type") or doc.get("type") or "",
        "chunk_id": doc.get("chunk_id") or doc.get("id") or doc.get("embedding_id") or "",
        "quote": text,
        "confidence": round(float(doc.get("score") or 0), 3),
        "source_href": doc.get("source_href"),
    }


def _infer_related_features(docs: List[Dict[str, Any]], parsed: Dict[str, Any]) -> List[Dict[str, Any]]:
    features = []
    names = parsed.get("entities", {}).get("structure_name") or []
    mileages = parsed.get("entities", {}).get("mileage") or []
    types = parsed.get("entities", {}).get("structure_type") or []
    for i, name in enumerate(names[:5]):
        features.append({
            "structure_id": name,
            "structure_type": types[0] if types else None,
            "location": mileages[i] if i < len(mileages) else None,
            "coordinate": None,
        })
    if features:
        return features

    haystack = "\n".join(_as_text(d.get("text")) for d in docs[:5])
    inferred = _unique(re.findall(r"溪構\d+(?:-\d+)?|平台\d+|\d+K\+\d+|FD\d+", haystack, flags=re.IGNORECASE))
    for item in inferred[:5]:
        features.append({
            "structure_id": item,
            "structure_type": types[0] if types else None,
            "location": item if "K+" in item else None,
            "coordinate": None,
        })
    return features


def _evaluate_confidence(docs: List[Dict[str, Any]]) -> Dict[str, Any]:
    if not docs:
        return {
            "confidence": 0,
            "confidence_level": "none",
            "answer_policy": "refuse_or_request_more_data",
            "policy_label": "無依據：需補齊資料或改用更具體問題",
        }
    avg_score = sum(float(d.get("score") or 0) for d in docs) / len(docs)
    if avg_score >= 0.65:
        level, policy, label = "high", "direct_recommendation", "高信心：可直接提出建議"
    elif avg_score >= 0.45:
        level, policy, label = "medium", "human_verify", "中信心：建議人工複核"
    else:
        level, policy, label = "low", "human_confirm_required", "低信心：僅供線索參考"
    return {
        "confidence": round(avg_score, 3),
        "confidence_level": level,
        "answer_policy": policy,
        "policy_label": label,
    }


def _risk_from_query_and_docs(parsed: Dict[str, Any], docs: List[Dict[str, Any]]) -> Dict[str, Any]:
    q = parsed.get("query", "")
    text = q + "\n" + "\n".join(_as_text(d.get("text"))[:800] for d in docs[:4])
    severe_terms = ["嚴重", "淘空", "淘刷", "基礎裸露", "懸空", "D3", "E3", "R3", "U3", "高異常"]
    medium_terms = ["裂縫", "磨損", "磨蝕", "淤積", "沉陷", "位移", "中異常", "D2", "E2", "R2"]
    if any(term in text for term in severe_terms):
        risk_level = "高"
        action = "建議列入優先複查與維護排程，必要時補拍基礎、上下游與近照並量測損壞範圍。"
    elif any(term in text for term in medium_terms):
        risk_level = "中"
        action = "建議列入近期巡查追蹤，確認異常是否擴大並補充照片紀錄。"
    elif docs:
        risk_level = "低"
        action = "建議維持例行巡查，持續累積照片與維護紀錄。"
    else:
        risk_level = "未知"
        action = "未取得足夠檢索依據，請補充設施名稱、樁號或巡查照片。"
    return {
        "risk_level": risk_level,
        "reason": "依查詢語意、檢索片段與異常關鍵詞進行保守初判；不取代現場複核或技師判定。",
        "recommended_action": action,
    }


def _summarize_answer(answer: str) -> str:
    answer = re.sub(r"\s+", " ", _as_text(answer))
    if not answer:
        return ""
    parts = re.split(r"[。！？]", answer)
    summary = "。".join(p for p in parts[:2] if p).strip()
    return summary + ("。" if summary and not summary.endswith("。") else "")


def _fallback_answer(parsed: Dict[str, Any], docs: List[Dict[str, Any]]) -> str:
    if not docs:
        return "目前未檢索到足以支持判斷的橫流溪資料，請補充設施名稱、樁號、魚種、年度或巡查照片後再查詢。"
    points = []
    for doc in docs[:3]:
        preview = _as_text(doc.get("preview") or doc.get("text"))
        if preview:
            points.append(preview[:120])
    return "根據目前檢索到的橫流溪資料，初步判讀重點如下：" + "；".join(points)


def _structured_response(query: str, use_llm: bool = True, top_k: int = 8) -> Dict[str, Any]:
    parsed = parse_query(query)
    docs: List[Dict[str, Any]] = []
    answer = ""
    retrieval_mode = "local_keyword_bm25_fallback"

    if rag_backend is not None:
        vector_first = os.environ.get("NLP_RAG_VECTOR_FIRST", "0") == "1"
        model_already_loaded = getattr(rag_backend, "_model", None) is not None
        if vector_first or model_already_loaded:
            try:
                docs = rag_backend.hybrid_search(parsed["rewritten_query"], top_k=top_k)
                if docs:
                    retrieval_mode = "hybrid_search_vector_bm25_metadata"
            except Exception:
                docs = []

        if not docs:
            docs = _local_keyword_retrieve(parsed["rewritten_query"], top_k=top_k)
        elif answer_engine is not None:
            docs = answer_engine.filter_retrieved_docs(query, docs, limit=top_k)

        if use_llm and docs:
            try:
                context = rag_backend.prepare_rag_context(docs, parsed["rewritten_query"])
                query_type = rag_backend.classify_query_type(query)
                answer = rag_backend.generate_answer_with_ollama(query, context, query_type=query_type)
            except Exception:
                answer = ""

    if not answer:
        answer = _fallback_answer(parsed, docs)

    confidence = _evaluate_confidence(docs)
    evidence = [_doc_to_evidence(doc) for doc in docs[:8]]
    response = {
        "answer": answer,
        "summary": _summarize_answer(answer),
        "evidence": evidence,
        "related_features": _infer_related_features(docs, parsed),
        "risk_assessment": _risk_from_query_and_docs(parsed, docs),
        "confidence": confidence,
        "suggested_follow_up": [
            "若涉及維護決策，請補充巡查日期、設施名稱與近照。",
            "若涉及 GIS 判讀，請補充樁號或座標以縮小檢索範圍。",
            "若檢索信心偏低，建議人工回查原始報告或巡查紀錄。",
        ],
        "parsed_query": parsed,
        "retrieval": {
            "mode": retrieval_mode,
            "top_k": top_k,
            "result_count": len(docs),
        },
        "llm": {
            "provider": "ollama_local",
            "model": getattr(rag_backend, "OLLAMA_MODEL", None) if rag_backend else None,
            "is_training": False,
            "inference_mode": "RAG 即時推論",
        },
        "timestamp": _now(),
    }
    return response


def _local_keyword_retrieve(query: str, top_k: int = 8) -> List[Dict[str, Any]]:
    """文件檢索。

    優先使用 webapp/retrieval.py 的 BM25（含 IDF 權重與長度正規化，
    並可在設定 JINA_API_KEY 時融合向量語意檢索）。
    該模組不可用時才退回下方的關鍵字計次法。
    """
    if doc_retrieval is not None and doc_retrieval.is_ready():
        try:
            # 先多取候選，再用問題概念做第二道閘門；BM25 原始分數可能
            # 讓只提到「橫流溪／魚道」的泛用段落排在真正答案前面。
            hits = doc_retrieval.search(query, top_k=max(top_k * 3, 12))
            if hits:
                if answer_engine is not None:
                    hits = answer_engine.filter_retrieved_docs(query, hits, limit=top_k)
                return hits[:max(1, int(top_k or 8))]
        except Exception as exc:
            logging.getLogger(__name__).warning("[RETRIEVAL] 檢索失敗，退回關鍵字比對：%s", exc)

    if rag_backend is None:
        return []
    try:
        store = rag_backend.load_vector_store() or []
    except Exception:
        return []
    if not store:
        return []

    query_terms = _query_terms(query)
    if not query_terms:
        return []

    scored: List[tuple] = []
    for doc in store:
        try:
            if hasattr(rag_backend, "is_target_topic_doc") and not rag_backend.is_target_topic_doc(doc):
                continue
        except Exception:
            pass
        haystack = " ".join([
            _as_text(doc.get("source_file")),
            _as_text(doc.get("source_path")),
            _as_text(doc.get("section")),
            _as_text(doc.get("text")),
            _as_text(doc.get("full_text")),
        ]).lower()
        if not haystack:
            continue
        exact = sum(1 for term in query_terms if term.lower() in haystack)
        # query_terms 已包含中文雙字詞；再對每個詞執行 haystack.split() 會讓
        # 3.8 萬筆索引每題重複切詞數十萬次，是問答延遲的主要來源。
        score = exact * 1.0
        if "橫流溪" in haystack:
            score += 0.25
        if score > 0:
            scored.append((score, doc))

    scored.sort(key=lambda item: item[0], reverse=True)
    results = []
    max_score = scored[0][0] if scored else 1.0
    candidate_docs = []
    for raw_score, doc in scored:
        normalized = min(0.88, max(0.2, raw_score / max(max_score, 1.0)))
        try:
            candidate_docs.append(rag_backend.sanitize_doc_for_output(doc, normalized))
        except Exception:
            copied = dict(doc)
            copied["score"] = normalized
            copied["preview"] = _as_text(doc.get("text"))[:220]
            candidate_docs.append(copied)
    if answer_engine is not None:
        candidate_docs = answer_engine.filter_retrieved_docs(
            query, candidate_docs, limit=top_k)
    return candidate_docs[:max(1, int(top_k or 8))]


def _query_terms(query: str) -> List[str]:
    terms = []
    terms.extend(re.findall(r"\d+K\+\d+|溪構\d+(?:-\d+)?|平台\d+|樣站\d+|FD\d+|\d{3,4}年", query, flags=re.IGNORECASE))
    for group in (STRUCTURE_TYPE_TERMS, DAMAGE_TERMS, SPECIES_TERMS):
        terms.extend(term for term in group if term in query)
    for term in re.findall(r"[\u4e00-\u9fff]{2,}", query):
        if term not in ("橫流溪",):
            terms.extend(term[i:i + 2] for i in range(max(1, len(term) - 1)))
    terms.append("橫流溪")
    return _unique([t for t in terms if t])


@nlp_rag.route("/nlp/parse", methods=["POST"])
def nlp_parse() -> Any:
    data = request.get_json() or {}
    query = _as_text(data.get("query") or data.get("question"))
    if not query:
        return jsonify({"status": "error", "message": "缺少 query"}), 400
    return jsonify({"status": "success", "data": parse_query(query)})


@nlp_rag.route("/rag/query", methods=["POST"])
def rag_query() -> Any:
    data = request.get_json() or {}
    query = _as_text(data.get("query") or data.get("question"))
    if not query:
        return jsonify({"status": "error", "message": "缺少 query"}), 400
    top_k = int(data.get("top_k") or 8)
    use_llm = bool(data.get("use_llm", True))
    return jsonify({"status": "success", "data": _structured_response(query, use_llm=use_llm, top_k=top_k)})


@nlp_rag.route("/structure/ask", methods=["POST"])
def structure_ask() -> Any:
    data = request.get_json() or {}
    query = _as_text(data.get("query") or data.get("question"))
    structure_id = _as_text(data.get("structure_id") or data.get("facility_id"))
    structure_name = _as_text(data.get("structure_name") or data.get("facility_name"))
    if not query and not structure_id and not structure_name:
        return jsonify({"status": "error", "message": "缺少 query 或 structure_id"}), 400
    composed = " ".join(x for x in ["橫流溪 工程設施", structure_id, structure_name, query] if x)
    return jsonify({"status": "success", "data": _structured_response(composed, use_llm=True, top_k=8)})


@nlp_rag.route("/risk/evaluate", methods=["POST"])
def risk_evaluate() -> Any:
    data = request.get_json() or {}
    query = _as_text(data.get("query") or data.get("description") or data.get("finding"))
    if not query:
        bits = [
            _as_text(data.get("structure_name")),
            _as_text(data.get("structure_type")),
            _as_text(data.get("damage_type")),
            _as_text(data.get("severity")),
            _as_text(data.get("inspection_note")),
        ]
        query = " ".join(x for x in bits if x)
    if not query:
        return jsonify({"status": "error", "message": "缺少可評估內容"}), 400
    payload = _structured_response(query, use_llm=False, top_k=6)
    return jsonify({
        "status": "success",
        "data": {
            "risk_assessment": payload["risk_assessment"],
            "confidence": payload["confidence"],
            "parsed_query": payload["parsed_query"],
            "evidence": payload["evidence"],
            "health_score_hint": _health_score_hint(payload["risk_assessment"]["risk_level"]),
            "timestamp": _now(),
        },
    })


def _health_score_hint(risk_level: str) -> Dict[str, Any]:
    mapping = {
        "高": (0, 45, "優先維護"),
        "中": (46, 70, "近期複查"),
        "低": (71, 90, "例行追蹤"),
        "未知": (None, None, "補齊資料"),
    }
    low, high, action = mapping.get(risk_level, mapping["未知"])
    return {"range": [low, high], "management_action": action}


@nlp_rag.route("/rag/reindex", methods=["POST"])
def rag_reindex() -> Any:
    if rag_backend is None:
        return jsonify({"status": "error", "message": "rag_backend 未載入"}), 503
    try:
        rag_backend._vector_store = None
        rag_backend._metadata_index = None
        rag_backend._bm25_index = None
        store = rag_backend.load_vector_store()
        if store is not None:
            rag_backend.build_bm25_index(store)
        return jsonify({
            "status": "success",
            "message": "RAG 索引已重新載入",
            "chunk_count": len(store or []),
            "timestamp": _now(),
        })
    except Exception as exc:
        return jsonify({"status": "error", "message": str(exc)}), 500


@nlp_rag.route("/sources/<source_id>", methods=["GET"])
def get_source(source_id: str) -> Any:
    if rag_backend is None:
        return jsonify({"status": "error", "message": "rag_backend 未載入"}), 503
    store = rag_backend.load_vector_store() or []
    for doc in store:
        if _as_text(doc.get("id")) == source_id:
            return jsonify({"status": "success", "data": rag_backend.sanitize_doc_for_output(doc, float(doc.get("score") or 0))})
    return jsonify({"status": "error", "message": "找不到來源片段"}), 404


@nlp_rag.route("/rag/schema", methods=["GET"])
def rag_schema() -> Any:
    return jsonify({
        "status": "success",
        "schema_sql": SCHEMA_SQL,
        "tables": [
            "documents",
            "document_chunks",
            "structures",
            "inspection_records",
            "fish_records",
            "habitat_records",
            "photo_analysis",
            "rag_logs",
        ],
        "timestamp": _now(),
    })


@nlp_rag.route("/llm/generate", methods=["POST"])
def llm_generate() -> Any:
    data = request.get_json() or {}
    prompt = _as_text(data.get("prompt") or data.get("query"))
    context = _as_text(data.get("context"))
    if not prompt:
        return jsonify({"status": "error", "message": "缺少 prompt"}), 400
    if rag_backend is None:
        return jsonify({"status": "error", "message": "rag_backend 未載入"}), 503
    try:
        answer = rag_backend.generate_answer_with_ollama(prompt, context, query_type="general")
        return jsonify({
            "status": "success",
            "data": {
                "answer": answer,
                "summary": _summarize_answer(answer),
                "llm_provider": "ollama_local",
                "llm_model": getattr(rag_backend, "OLLAMA_MODEL", None),
                "is_training": False,
                "timestamp": _now(),
            },
        })
    except Exception as exc:
        return jsonify({"status": "error", "message": str(exc)}), 503


@nlp_rag.route("/rag/localai-status", methods=["GET"])
def localai_status() -> Any:
    payload: Dict[str, Any] = {
        "status": "ready" if rag_backend is not None else "not_ready",
        "rag_backend_loaded": rag_backend is not None,
        "api_endpoints": [
            "POST /api/nlp/parse",
            "POST /api/rag/query",
            "POST /api/rag/reindex",
            "POST /api/llm/generate",
            "POST /api/structure/ask",
            "POST /api/risk/evaluate",
            "GET /api/sources/{source_id}",
            "GET /api/rag/schema",
        ],
        "features": {
            "nlp_parse": True,
            "hybrid_search": rag_backend is not None,
            "local_ollama": False,
            "confidence_policy": True,
            "gis_related_features": True,
            "is_training": False,
        },
        "timestamp": _now(),
    }
    if rag_backend is not None:
        try:
            payload["ollama"] = rag_backend.get_ollama_status()
            payload["features"]["local_ollama"] = bool(payload["ollama"].get("connected"))
        except Exception as exc:
            payload["ollama"] = {"connected": False, "error": str(exc)}
        try:
            store = rag_backend.load_vector_store()
            payload["chunk_count"] = len(store or [])
        except Exception:
            payload["chunk_count"] = 0
    return jsonify(payload)


# ─────────────────────────────────────────────────────────────────────────────
#  網路搜尋 + 本機資料 + Ollama 綜合推論  /api/smart-ask
# ─────────────────────────────────────────────────────────────────────────────

def _ddgs_client():
    """取得可用的 DuckDuckGo 用戶端。

    duckduckgo_search 已更名為 ddgs，舊名稱雖仍可 import 但查詢一律回傳空結果，
    這使得「查無平台資料時以網路補充」的設計長期失效卻沒有任何錯誤訊息。
    因此優先採用新套件，並在兩者皆不可用時明確記錄。
    """
    for module_name in ("ddgs", "duckduckgo_search"):
        try:
            module = __import__(module_name, fromlist=["DDGS"])
            return getattr(module, "DDGS"), module_name
        except Exception:
            continue
    return None, ""


def _scoped_web_query(query: str) -> str:
    """Constrain external search to the Hengliuxi context when appropriate."""
    text = _as_text(query)
    if not text or answer_engine is None:
        return text
    try:
        if answer_engine.is_hengliuxi_query(text) and "橫流溪" not in text:
            return f"橫流溪 臺中市和平區 大甲溪 {text}"
    except Exception:
        pass
    return text


def _filter_web_results(query: str, results: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Keep only external results that address the requested topic.

    Search engines frequently return a plausible-looking but unrelated result
    for short Chinese queries.  A result must contain a query concept and, for
    a site-specific query, either location context or more than one matching
    topic concept.
    """
    if not results:
        return []
    if answer_engine is None:
        return results[:6]

    kept: List[Dict[str, Any]] = []
    required = set()
    try:
        required = answer_engine._required_concepts(query)
    except Exception:
        pass
    for result in results:
        title = _as_text(result.get("title"))
        body = _as_text(result.get("body") or result.get("snippet"))
        href = _as_text(result.get("href") or result.get("url"))
        searchable = f"{title}\n{body}\n{href}"
        loose = answer_engine.relevance_score(
            query, searchable, require_all=False)
        strict = answer_engine.relevance_score(query, searchable, require_all=True)
        if loose <= 0:
            continue
        has_location = any(term in searchable for term in (
            "橫流溪", "大甲溪", "臺中市和平區", "台中市和平區", "東勢"))
        access_query = bool(re.search(r"下溪|下去|進場|怎麼走|如何到|到達|路線|周邊環境|交通|人員", query))
        has_access_context = bool(re.search(r"步道|道路|路線|進場|溪床|岸側|地形|交通|位置", searchable))
        if required and strict <= 0 and not (access_query and has_location and has_access_context):
            continue
        if not has_location and loose < 2:
            continue
        kept.append(result)
        if len(kept) >= 6:
            break
    return kept


def _web_search_ddg(query: str, max_results: int = 6) -> List[Dict[str, Any]]:
    """DuckDuckGo 免費搜尋（不需 API Key）。"""
    _log = logging.getLogger(__name__)
    ddgs_cls, module_name = _ddgs_client()
    if ddgs_cls is None:
        _log.warning("[WEB] 未安裝 ddgs 套件，網路補充功能停用")
        return []

    try:
        with ddgs_cls() as ddgs:
            results = list(ddgs.text(
                _scoped_web_query(query),
                max_results=max_results,
                region="tw-zh",
                safesearch="moderate",
            ))
        results = _filter_web_results(query, results)
        if not results:
            _log.info("[WEB] %s 查無結果：%s", module_name, query[:40])
        return results
    except Exception as exc:
        _log.warning("[WEB] %s 搜尋失敗 %s: %s", module_name, type(exc).__name__, exc)
        return []


def _format_web_results(results: List[Dict[str, Any]]) -> str:
    if not results:
        return ""
    parts = []
    for r in results:
        title = _as_text(r.get("title"))
        body  = _as_text(r.get("body"))[:350]
        if title or body:
            parts.append(f"• {title}\n  {body}")
    return "\n\n".join(parts[:5])


DEFAULT_PLATFORM_URL = os.environ.get(
    "HLX_PLATFORM_URL",
    "https://hengliuxi-management.onrender.com/webapp/",
)


def _fetch_url_text(url: str, timeout: int = 8, max_chars: int = 2200) -> str:
    """Fetch a web page and extract compact readable text without extra deps."""
    if not url:
        return ""
    parsed = urllib.parse.urlparse(url)
    if parsed.scheme not in ("http", "https"):
        return ""
    try:
        req = urllib.request.Request(
            url,
            headers={
                "User-Agent": "Hengliuxi-RAG/1.0 (+https://hengliuxi-management.onrender.com/webapp/)",
                "Accept": "text/html,application/xhtml+xml,text/plain;q=0.8,*/*;q=0.5",
            },
        )
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            raw = resp.read(max_chars * 6)
            charset = resp.headers.get_content_charset() or "utf-8"
        text = raw.decode(charset, errors="ignore")
        text = re.sub(r"(?is)<(script|style|noscript|svg|canvas).*?</\1>", " ", text)
        text = re.sub(r"(?is)<[^>]+>", " ", text)
        text = html.unescape(text)
        text = re.sub(r"\s+", " ", text).strip()
        return text[:max_chars]
    except Exception:
        return ""


# 線上平台頁面在短時間內不會變動，快取避免每次問答多花數秒重抓。
_platform_page_cache: Dict[str, Any] = {}
_PLATFORM_PAGE_TTL = float(os.environ.get("PLATFORM_PAGE_TTL", "180"))
_platform_ctx_cache: Dict[str, Any] = {}


def _fetch_platform_page_cached(url: str) -> str:
    entry = _platform_page_cache.get(url)
    if entry and time.time() - entry["at"] < _PLATFORM_PAGE_TTL:
        return entry["text"]
    text = _fetch_url_text(url, timeout=5)
    _platform_page_cache[url] = {"text": text, "at": time.time()}
    return text


def _fetch_platform_url_context(query: str, platform_url: str = "") -> Dict[str, Any]:
    """Read the public platform URL and same-origin management API for grounding."""
    url = _as_text(platform_url) or DEFAULT_PLATFORM_URL
    parsed = urllib.parse.urlparse(url)
    if parsed.scheme not in ("http", "https") or not parsed.netloc:
        return {"context": "", "evidence": [], "url": url}

    origin = f"{parsed.scheme}://{parsed.netloc}"
    evidence: List[Dict[str, Any]] = []
    parts: List[str] = []

    page_text = _fetch_platform_page_cached(url)
    if page_text and (
            answer_engine is None or
            answer_engine.is_relevant_text(query, page_text, strict=True)):
        parts.append(f"線上平台頁面：{url}\n頁面可讀文字摘要：{page_text}")
        evidence.append({
            "type": "platform_page",
            "title": "橫流溪管理平台線上頁面",
            "url": url,
            "summary": page_text[:180],
        })

    # If the deployed platform exposes the management context API, prefer it
    # because it reflects synced inspection and maintenance records more accurately
    # than static SPA HTML.
    try:
        payload = json.dumps({"query": query, "limit": 6}).encode("utf-8")
        req = urllib.request.Request(
            f"{origin}/api/management/latest-context",
            data=payload,
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=8) as resp:
            data = json.loads(resp.read().decode("utf-8", errors="ignore"))
        ctx = _as_text(data.get("context"))
        if data.get("status") == "success" and ctx:
            parts.append(f"線上平台最新管理 API：{origin}/api/management/latest-context\n{ctx[:2200]}")
            evidence.extend(list(data.get("evidence") or [])[:6])
    except Exception:
        pass

    return {
        "context": "\n\n".join(parts),
        "evidence": evidence[:8],
        "url": url,
    }


_AGENT_SYSTEM_PROMPT = """你是「橫流溪工程設施維護與生態資料管理」的專業幕僚，服務對象是
林業保育署臺中分署與工程顧問團隊。回答會被用於金質獎評審簡報與維護決策，正確性重於完整性。

【工作方式】
你有一組工具可以查詢平台資料。請先查詢本案資料，再作答；不可因平台有最新摘要
就直接貼出與問題無關的統計。若第一次查詢沒有直接命中，先用 search_documents
以問題的工程／生態／環境詞彙再查一次；仍不足時，才用 web_search，且搜尋字串必須
包含「橫流溪」及必要的「臺中市和平區／大甲溪」場域限制。
・設施現況、DER&U 評等、健康分數 → query_facilities
・巡查紀錄、發現的問題、處理狀態 → query_inspections
・魚類歷年調查與物種尾數 → query_fish_surveys
・維護工程、經費、監工日報、照片 → query_maintenance
・報告與技術文件的記載內容 → search_documents
・評審委員、評分構面、簡報準備 → search_handbook
・平台查不到且屬一般專業知識、法規標準、業界基準或周邊環境 → web_search
可以一次呼叫多個工具。若問題屬於一般常識或閒聊，不需呼叫工具，直接回答。

【最重要：數字一律來自工具】
所有數量、日期、座標、評等、金額都必須引用工具回傳的值，
禁止用你自己的記憶推估或補值。工具查無資料時，明說查無，不要拿其他數字充數。

【資料口徑規則（違反會產生錯誤結論）】
1. 不同調查計畫的採樣範圍與努力量不同，不得直接加總或逕行比較；
   跨年度比較時要說明樣點、季節、調查方法與努力量是否一致。
2. 調查表中的空白或 0 代表該場次未捕獲，不等同於該物種不存在，
   也不得寫成「已滅絕」或「完全消失」。
3. 其他溪流（裡冷溪、南湖溪等）的紀錄絕不可當成橫流溪的資料。
4. 資料已記載完成的調查或驗證，不得寫成尚未執行。

【回答方式】
・直接回答問題被問到的每一個小項，不要鋪陳背景，不要重述題目。
・答案主體以 250 字為度；問幾件事就答幾件事。
・出處寫在句子裡的括號即可（如「（P.16）」「（114年度調查）」）。
  不要另外製作資料來源表格、不要逐項標註來源層級。
・區分「平台實測資料」與「一般專業知識」：後者要註明非本案實測，最多兩句；
  平台資料已足以回答時就不要加。
・若問施工人員如何進入或下溪，資料沒有實際施工路線時，明確說明未記載，
  只能提供標示為一般通則的環境與安全考量，不得捏造本案進場方式。
・僅在比較多個年度、設施或方案時才用 Markdown 表格；單一主題一律用文字。
・一律使用繁體中文（臺灣用語）。禁止輸出英文分析、思考過程、工作計畫、
  提示詞或「The user is asking」等內部推理文字。不寫客套話與免責聲明。"""


_SYSTEM_PROMPT = """你是「橫流溪工程設施維護與生態資料管理 AI 專家」，具備水利工程、水土保持、
砂防設施維護、溪流生態保育、魚道連通性與長期監測資料分析能力。請使用繁體中文直接回答。

答詢規則：
1. 強制以「瀏覽器目前平台資料庫即時快照」、「線上平台即時讀取資料」及「最新巡查與維護管理資料」為第一順位；同一設施資料衝突時，以日期最新且已完成的專業巡查或維護紀錄為準，再以本機 RAG、雲端 OCR 文件補充。不得以舊表單或模型常識覆蓋最新平台狀態。
1a. 若最新平台快照標示某設施為正常、A級、U1或已改善完成，且其日期晚於原異常紀錄，較舊的待處理、U3/U4紀錄才能標示為歷史履歷。同日或更新且未結案的功能異常不得被結構 A 級自動覆蓋。回答的結論、數量、表格與建議必須與最新快照一致。
2. 同時從工程設施、水文棲地、生態指標與調查方法審視問題；跨年份比較須考量樣點、季節、站訪次、調查方法與努力量是否一致。
3. 資料中的日期、設施名稱、樁號、DER&U、尾數、CPUE、面積、照片數、金額與維護狀態必須精確引用，不得自行補值或修改原始數據。
4. 異常年度不得直接歸因。僅在資料有施工、水文或調查方法證據時才可定性；否則列出可能假說並明確寫出待補資料。
5. 嚴格區分「資料直接支持的事實」、「依資料形成的判讀」與「仍需查證的假說」。資料衝突時列出差異，不可挑選較有利的數值。
6. 分清楚事實的來源層級，並讓讀者看得出來屬於哪一類：
   (a) 平台實測資料 — 橫流溪的巡查、維護、生態調查、設施評等等具體紀錄，
       一律以參考資料為準，引用時附上日期、數量或設施編號等依據。
       這類內容嚴禁使用模型記憶補造巡查、工程、維護、日期、設施或數值。
   (b) 一般專業知識 — 水利工程、水土保持、魚類與植物生態的通用知識
       （如某魚種的棲地偏好、某工法的一般特性）。參考資料沒有記載時可以回答，
       但必須明講這是通則而非本案實測，例如「就一般生態習性而言…（非本案實測資料）」，
       並儘量指出橫流溪既有資料能否呼應該通則。
   (c) 尚無資料 — 屬於橫流溪特定事實、參考資料查無、又不屬可靠通則者，
       明確回答「目前資料庫中沒有足夠資料可以確認」，並指出可從哪份報告或模組取得。
   絕不可因為缺乏本案資料，就改用不相關的統計數字（如巡查件數、照片張數）充當答案。
6a. 來源標示要輕，不要喧賓奪主。出處寫在句子裡的括號即可（如「（P.16）」），
    禁止另外製作「資料層級」「待補資料說明」等表格或段落——那會把真正的答案淹沒。
    缺資料就用一句話帶過並指出可向何處調閱；一般專業知識只在確實有助益時補充，
    最多兩句。答案主體以 250 字為度，問幾件事就答幾件事。
6b. 參考資料已由系統依問題相關性篩選。只能使用與問題直接相關的片段；若沒有直接片段，
    先回答「目前資料庫未記載」，再使用標示為「環境背景／一般通則」或「外部資料」的內容。
    不得以最新巡查筆數、照片張數、契約金額或其他不相關統計填補答案。
7. 回答開頭先直接回答問題，再視需要補充工程或生態判讀。若資料互相矛盾，列出日期、來源與差異，不得自行挑選有利數值。
8. 不使用客套開場，不輸出思考過程，不宣稱模型正在訓練，不把 RAG 即時推論描述為模型學習或微調。回答務求精簡、清楚，讓一般管理人員也能理解。"""


def _strip_reasoning_preamble(text: str) -> str:
    """移除模型洩漏在答案前面的英文推理與偽造的工具呼叫標記。

    部分模型（實測 nemotron 系列）會先用英文覆述一遍工具結果與分析步驟，
    之後才接上繁體中文答案；也有模型在不該呼叫工具時吐出 <tool_call> 文字。
    直接把整段丟給使用者會很難閱讀，但整段判定為失敗又會浪費一次可用的回答，
    因此在此擷取真正的中文答案部分。
    """
    value = _as_text(text).strip()
    if not value:
        return ""

    # 偽造的工具呼叫標記（模型在 tool_choice=none 時仍想查資料）
    value = re.sub(r"(?is)<tool_call>.*?</tool_call>", " ", value)
    value = re.sub(r"(?is)<function=[^>]*>.*?</function>", " ", value)
    # 常見的思考區塊標記
    value = re.sub(r"(?is)<think(?:ing)?>.*?</think(?:ing)?>", " ", value)

    lines = value.split("\n")
    for index, line in enumerate(lines):
        cjk = len(re.findall(r"[㐀-鿿]", line))
        # 找到第一行「實質中文」就從那裡開始
        if cjk >= 8 and cjk / max(len(line.strip()), 1) >= 0.25:
            if index == 0:
                break
            head = "\n".join(lines[:index])
            head_cjk = len(re.findall(r"[㐀-鿿]", head))
            head_latin = len(re.findall(r"[A-Za-z]", head))
            # 只有在前段「確實是英文敘述」時才捨棄。
            # 若只看中文字數，像「**風險分析**」這種合法的中文小標
            # （字數少）會被誤判為雜訊而刪掉。
            if head_latin >= 40 and head_latin > head_cjk * 3:
                return "\n".join(lines[index:]).strip()
            break
    return value.strip()


def _is_acceptable_zh_answer(text: str) -> bool:
    """Reject leaked planning/reasoning text and answers that are not Traditional Chinese."""
    value = _as_text(text).strip()
    if not value:
        return False
    lowered = value.lower()
    leaked_markers = (
        "the user is asking", "i need to", "first, i'll", "first i'll",
        "we need to", "response format", "provided reference data",
        "scan the", "follow the strict",
    )
    if any(marker in lowered for marker in leaked_markers):
        return False
    cjk_count = len(re.findall(r"[\u3400-\u9fff]", value))
    return cjk_count >= 12 and cjk_count / max(len(value), 1) >= 0.08

def _build_user_msg(query: str, combined_ctx: str) -> str:
    ctx_block = (f"【參考資料】\n{combined_ctx}\n\n" if combined_ctx.strip()
                 else "【參考資料】\n（本次未取得平台資料）\n\n")
    return (
        f"{ctx_block}"
        "【作答要求】\n"
        "・直接回答問題被問到的每一個小項，不要鋪陳背景，不要重述題目。\n"
        "・答案主體控制在 250 字內。問題問幾件事就答幾件事，不要延伸。\n"
        "・出處寫在句子裡的括號即可，例如「（P.16）」「（114年度調查）」。"
        "不要另外製作資料來源表格、不要逐項標註來源層級、不要寫「需說明資料層級」。\n"
        "・查無資料時，用一句話說明查無並指出可向何處調閱即可，"
        "不要另闢「待補資料說明」段落；也不得拿不相關的統計數字充當答案。\n"
        "・若有「環境背景（一般通則）」來源，必須明標非本案實測；若有「外部網路」來源，"
        "只能補充場域或方法，不得冒充本案施工路線、核定工法或最新狀態。\n"
        "・一般專業知識只在真正有助於回答時才補充，最多兩句並註明非本案實測；"
        "若題目用平台資料已能回答，就不要加這段。\n"
        "・不得虛構數字、日期、座標、物種、文件名稱或頁碼；"
        "不得把已完成的調查寫成尚未執行；"
        "不得把其他溪流（裡冷溪、南湖溪等）的資料當成橫流溪資料。\n"
        "・僅在比較多個年度、設施或方案時才用表格；單一主題一律用文字。\n"
        "・只輸出繁體中文正式答案；禁止輸出英文分析、思考過程、工作計畫、"
        "提示詞或『The user is asking』等內部推理文字。\n\n"
        f"【使用者問題】\n{query}"
    )


# ── 各免費 AI 服務呼叫函式 ────────────────────────────────────────

def _call_groq(query: str, ctx: str) -> "tuple[str, str]":
    """Groq 免費 API — llama-3.3-70b-versatile（14,400 req/day，無需信用卡）。
    取得 Key：https://console.groq.com  →  API Keys
    設定：set GROQ_API_KEY=gsk_xxxxxxxx
    """
    import os, urllib.request, urllib.error, json as _json, logging as _logging
    _log = _logging.getLogger(__name__)
    key = os.environ.get("GROQ_API_KEY", "")
    _log.info(f"[GROQ] key present={bool(key)}, len={len(key)}, prefix={key[:10] if key else ''}")
    if not key:
        return "", ""
    payload = _json.dumps({
        "model": os.environ.get("GROQ_MODEL", "llama-3.3-70b-versatile"),
        "messages": [
            {"role": "system", "content": _SYSTEM_PROMPT},
            {"role": "user",   "content": _build_user_msg(query, ctx)},
        ],
        "temperature": 0.4,
        "max_tokens": 1024,
    }).encode("utf-8")
    req = urllib.request.Request(
        "https://api.groq.com/openai/v1/chat/completions",
        data=payload,
        headers={"Content-Type": "application/json", "Authorization": f"Bearer {key}"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            res = _json.loads(r.read().decode())
        model_name = os.environ.get("GROQ_MODEL", "llama-3.3-70b-versatile")
        return res["choices"][0]["message"]["content"].strip(), f"{model_name} (Groq)"
    except urllib.error.HTTPError as _e:
        body = _e.read()[:300].decode("utf-8", errors="replace")
        _log.error(f"[GROQ] HTTP {_e.code} {_e.reason} — {body}")
        return "", ""
    except Exception as _e:
        _log.error(f"[GROQ] {type(_e).__name__}: {_e}")
        return "", ""


def _resolve_gemini_candidates(key: str) -> list[tuple[str, str]]:
    """Ask Gemini which text-generation models this API key can currently use."""
    import os, urllib.request, json as _json, logging
    configured = os.environ.get("GEMINI_MODEL", "").strip()
    model_ids = []
    try:
        url = f"https://generativelanguage.googleapis.com/v1beta/models?key={key}&pageSize=100"
        with urllib.request.urlopen(url, timeout=15) as response:
            payload = _json.loads(response.read().decode("utf-8"))
        for item in payload.get("models", []):
            methods = item.get("supportedGenerationMethods", [])
            model_id = str(item.get("name", "")).removeprefix("models/")
            lowered = model_id.lower()
            if (
                model_id and "generateContent" in methods and "gemini" in lowered
                and "flash" in lowered and not any(word in lowered for word in ("image", "tts", "live"))
            ):
                model_ids.append(model_id)
    except Exception as exc:
        logging.getLogger(__name__).warning("[GEMINI] model discovery failed: %s", exc)

    # Stable text models first, then previews; higher version ids sort first.
    model_ids = sorted(set(model_ids), key=lambda value: ("preview" not in value, value), reverse=True)
    # 以帳戶即時回報的模型為準；1.5 系列已下架，不再放入固定候選清單。
    ordered = (
        ([configured] if configured else [])
        + model_ids
        + ["gemini-2.5-flash", "gemini-2.5-flash-lite", "gemini-3-flash-preview"]
    )
    candidates = []
    for model_id in ordered:
        for api_version in ("v1beta", "v1"):
            candidate = (model_id, api_version)
            if model_id and candidate not in candidates:
                candidates.append(candidate)
    return candidates


def _call_gemini(query: str, ctx: str) -> "tuple[str, str]":
    """Google Gemini 免費 API（優先 gemini-2.0-flash，備用 gemini-1.5-flash）。
    取得 Key：https://aistudio.google.com  →  Get API key
    設定：set GOOGLE_API_KEY=AQ.xxxxxxxx
    """
    import os, urllib.request, urllib.error, json as _json, logging
    _log = logging.getLogger(__name__)
    key = os.environ.get("GOOGLE_API_KEY", "")
    if not key:
        return "", ""

    payload = _json.dumps({
        "contents": [{"parts": [{"text": f"{_SYSTEM_PROMPT}\n\n{_build_user_msg(query, ctx)}"}]}],
        "generationConfig": {"temperature": 0.15, "maxOutputTokens": 2048},
    }).encode("utf-8")

    candidates = _resolve_gemini_candidates(key)
    for model, api_ver in candidates:
        url = f"https://generativelanguage.googleapis.com/{api_ver}/models/{model}:generateContent?key={key}"
        req = urllib.request.Request(url, data=payload, headers={"Content-Type": "application/json"}, method="POST")
        try:
            with urllib.request.urlopen(req, timeout=30) as r:
                res = _json.loads(r.read().decode())
            text = res["candidates"][0]["content"]["parts"][0]["text"].strip()
            _log.info(f"[GEMINI] ✓ 使用 {model} ({api_ver})")
            return text, f"{model} (Google)"
        except urllib.error.HTTPError as e:
            body = e.read().decode("utf-8", errors="ignore")
            _log.warning(f"[GEMINI] {model}/{api_ver} HTTP {e.code}: {body[:150]}")
        except Exception as e:
            _log.warning(f"[GEMINI] {model}/{api_ver} 錯誤: {e}")

    return "", ""


_CLAUDE_MODEL_CACHE = ""


def _resolve_claude_model(key: str) -> str:
    """Resolve an available Claude model instead of relying on a stale hard-coded id."""
    global _CLAUDE_MODEL_CACHE
    import os, urllib.request, json as _json, logging
    configured = (os.environ.get("ANTHROPIC_MODEL") or os.environ.get("CLAUDE_MODEL") or "").strip()
    if configured:
        return configured
    if _CLAUDE_MODEL_CACHE:
        return _CLAUDE_MODEL_CACHE
    req = urllib.request.Request(
        "https://api.anthropic.com/v1/models?limit=100",
        headers={
            "x-api-key": key,
            "anthropic-version": "2023-06-01",
            "Content-Type": "application/json",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=15) as r:
            payload = _json.loads(r.read().decode("utf-8"))
        model_ids = [str(item.get("id", "")) for item in payload.get("data", []) if item.get("id")]
        preferred = [m for m in model_ids if "sonnet" in m.lower()]
        if not preferred:
            preferred = [m for m in model_ids if "haiku" in m.lower()]
        if preferred or model_ids:
            _CLAUDE_MODEL_CACHE = (preferred or model_ids)[0]
    except Exception as exc:
        logging.getLogger(__name__).warning("[CLAUDE] model discovery failed: %s", exc)
    return _CLAUDE_MODEL_CACHE


def _call_claude(query: str, ctx: str) -> "tuple[str, str]":
    """Anthropic Messages API fallback. Keys and resolved model ids are never returned."""
    import os, urllib.request, urllib.error, json as _json, logging
    _log = logging.getLogger(__name__)
    key = (os.environ.get("ANTHROPIC_API_KEY") or os.environ.get("CLAUDE_API_KEY") or "").strip()
    if not key:
        return "", ""
    model = _resolve_claude_model(key)
    if not model:
        _log.warning("[CLAUDE] no available model found")
        return "", ""
    payload = _json.dumps({
        "model": model,
        "max_tokens": 1024,
        "temperature": 0.4,
        "system": _SYSTEM_PROMPT,
        "messages": [{"role": "user", "content": _build_user_msg(query, ctx)}],
    }).encode("utf-8")
    req = urllib.request.Request(
        "https://api.anthropic.com/v1/messages",
        data=payload,
        headers={
            "x-api-key": key,
            "anthropic-version": "2023-06-01",
            "Content-Type": "application/json",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            response = _json.loads(r.read().decode("utf-8"))
        text_parts = [item.get("text", "") for item in response.get("content", []) if item.get("type") == "text"]
        text = "\n".join(part for part in text_parts if part).strip()
        if text:
            return text, f"{model} (Claude)"
        return "", ""
    except urllib.error.HTTPError as exc:
        body = exc.read()[:300].decode("utf-8", errors="replace")
        _log.error("[CLAUDE] HTTP %s - %s", exc.code, body)
    except Exception as exc:
        _log.error("[CLAUDE] %s: %s", type(exc).__name__, exc)
    return "", ""


# OpenRouter 上次成功的模型（免費模型常下架，記住可用的可省下重試時間）
_OR_LAST_GOOD: Dict[str, str] = {"model": ""}
_OR_VISION_LAST_GOOD: Dict[str, str] = {"model": ""}
_OLLAMA_UNAVAILABLE_UNTIL: Dict[str, float] = {"until": 0.0}


def _call_openrouter_mode(query: str, ctx: str, config: Dict[str, Any]) -> Dict[str, Any]:
    """Call one configured OpenRouter mode with a server-side fallback model."""
    import os, urllib.request, urllib.error, json as _json, logging
    _log = logging.getLogger(__name__)
    key = os.environ.get("OPENROUTER_API_KEY", "")
    if not key:
        return {"answer": "", "provider": "openrouter", "error_type": "key_not_set"}

    models = []
    for candidate in (config.get("model"), config.get("fallback_model")):
        candidate = _as_text(candidate)
        if candidate and candidate not in models:
            models.append(candidate)
    if not models:
        return {"answer": "", "provider": "openrouter", "error_type": "model_not_set"}

    payload_data: Dict[str, Any] = {
        "messages": [
            {"role": "system", "content": _SYSTEM_PROMPT},
            {"role": "user", "content": _build_user_msg(query, ctx)},
        ],
        "temperature": float(config.get("temperature") or 0.2),
        "max_tokens": int(config.get("max_tokens") or 800),
        "reasoning": {"exclude": True},
        "usage": {"include": True},
    }
    if len(models) > 1:
        payload_data["models"] = models
    else:
        payload_data["model"] = models[0]

    started = time.perf_counter()
    req = urllib.request.Request(
        "https://openrouter.ai/api/v1/chat/completions",
        data=_json.dumps(payload_data).encode("utf-8"),
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {key}",
            "HTTP-Referer": "https://hengliuxi-management.onrender.com",
            "X-Title": "Hengliu Creek Management Platform",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=float(config.get("timeout") or 28)) as response:
            result = _json.loads(response.read().decode("utf-8"))
        text = _as_text(result.get("choices", [{}])[0].get("message", {}).get("content"))
        usage = dict(result.get("usage") or {})
        actual_model = _as_text(result.get("model")) or models[0]
        if not _is_acceptable_zh_answer(text):
            return {
                "answer": "", "provider": "openrouter", "actual_model": actual_model,
                "response_time": round(time.perf_counter() - started, 3),
                "error_type": "invalid_answer",
            }
        _OR_LAST_GOOD["model"] = actual_model
        return {
            "answer": text,
            "provider": "openrouter",
            "actual_model": actual_model,
            "display_name": f"{actual_model} (OpenRouter)",
            "input_tokens": int(usage.get("prompt_tokens") or 0),
            "output_tokens": int(usage.get("completion_tokens") or 0),
            "estimated_cost": float(usage.get("cost") or 0),
            "response_time": round(time.perf_counter() - started, 3),
            "fallback_used": actual_model != models[0],
            "error_type": "",
        }
    except urllib.error.HTTPError as exc:
        body = exc.read()[:180].decode("utf-8", errors="replace")
        _log.warning("[OPENROUTER] HTTP %s: %s", exc.code, body)
        return {
            "answer": "", "provider": "openrouter",
            "response_time": round(time.perf_counter() - started, 3),
            "error_type": f"http_{exc.code}",
        }
    except Exception as exc:
        _log.warning("[OPENROUTER] %s", exc)
        return {
            "answer": "", "provider": "openrouter",
            "response_time": round(time.perf_counter() - started, 3),
            "error_type": type(exc).__name__.lower(),
        }


def _call_openrouter(query: str, ctx: str) -> "tuple[str, str]":
    """Compatibility wrapper used by the provider health endpoint."""
    result = _call_openrouter_mode(query, ctx, resolve_mode("pro", query))
    return _as_text(result.get("answer")), _as_text(result.get("display_name"))


def _call_ollama_synthesis(query: str, combined_ctx: str) -> str:
    """Ollama 本機推論；smart-ask 預設使用較快的 7B 模型避免前端逾時。"""
    import os, urllib.request, json as _json
    if rag_backend is None:
        return ""
    base = getattr(rag_backend, "OLLAMA_BASE_URL", "http://localhost:11434").rstrip("/")

    now = time.time()
    if now < _OLLAMA_UNAVAILABLE_UNTIL.get("until", 0.0):
        return ""

    # 先以短逾時確認服務在線。Ollama 是最後一道保底，若它其實不可用
    # （雲端部署常見），不該讓使用者為此多等一次完整的推論逾時。
    model = os.environ.get("OLLAMA_SMART_MODEL", "qwen2.5:7b")
    try:
        with urllib.request.urlopen(f"{base}/api/tags", timeout=1) as _probe:
            tags = _json.loads(_probe.read().decode("utf-8"))
        installed = {
            str(item.get("name") or item.get("model") or "").strip()
            for item in tags.get("models", [])
        }
        # Ollama process being online does not mean the configured model exists.
        # Skip immediately instead of waiting for a failed generation request.
        if model not in installed and model.split(":", 1)[0] not in {
            name.split(":", 1)[0] for name in installed
        }:
            _OLLAMA_UNAVAILABLE_UNTIL["until"] = now + 300.0
            logging.getLogger(__name__).info(
                "[OLLAMA] 模型 %s 尚未安裝，略過本機推論", model
            )
            return ""
    except Exception:
        _OLLAMA_UNAVAILABLE_UNTIL["until"] = now + 300.0
        logging.getLogger(__name__).info("[OLLAMA] 服務不可用，略過本機推論")
        return ""

    ollama_url = f"{base}/api/chat"
    # Ollama 僅作最後備援；忙碌時不應讓互動問答長時間卡住。
    # 超時後會立即改用同一批 RAG 片段產生本機知識庫答案。
    timeout = min(
        float(os.environ.get("OLLAMA_SMART_TIMEOUT", "8")),
        8.0,
        float(getattr(rag_backend, "OLLAMA_TIMEOUT", 240)),
    )
    prompt_context = combined_ctx[:8000]
    payload = _json.dumps({
        "model": model,
        "messages": [
            {"role": "system", "content": _SYSTEM_PROMPT},
            {"role": "user",   "content": _build_user_msg(query, prompt_context)},
        ],
        "stream": False,
        "options": {"temperature": 0.4, "num_ctx": 3072, "num_predict": 512},
    }).encode("utf-8")
    req = urllib.request.Request(
        ollama_url, data=payload,
        headers={"Content-Type": "application/json"}, method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            res = _json.loads(resp.read().decode())
        return (res.get("message", {}).get("content", "") or res.get("response", "")).strip()
    except Exception:
        _OLLAMA_UNAVAILABLE_UNTIL["until"] = time.time() + 300.0
        return ""


def _run_parallel(tasks: "Dict[str, Any]", timeout: float = 20.0) -> Dict[str, Any]:
    """併行執行多個彼此獨立的取資料函式。

    任一路失敗或逾時只影響該路（回傳 None），不會拖垮整個問答；
    這讓 smart-ask 的總等待時間從「各路相加」降為「最慢的一路」。
    """
    from concurrent.futures import ThreadPoolExecutor, as_completed

    out: Dict[str, Any] = {name: None for name in tasks}
    if not tasks:
        return out

    _log = logging.getLogger(__name__)
    pool = ThreadPoolExecutor(max_workers=len(tasks))
    futures = {pool.submit(fn): name for name, fn in tasks.items()}
    try:
        for future in as_completed(futures, timeout=timeout):
            name = futures[future]
            try:
                out[name] = future.result()
            except Exception as exc:
                _log.warning("[PARALLEL] %s 失敗：%s: %s", name, type(exc).__name__, exc)
    except Exception:
        pending = [futures[f] for f in futures if not f.done()]
        _log.warning("[PARALLEL] 逾時 %.0fs，未完成：%s", timeout, pending)
        for future in futures:
            if not future.done():
                future.cancel()
    finally:
        # 不在 context manager 結束時等待逾時工作，避免名義上的 timeout 仍卡住回覆。
        pool.shutdown(wait=False, cancel_futures=True)
    return out


# ── AI 服務健康度快取 ─────────────────────────────────────────────────
# Groq 被 Cloudflare 依 ASN 封鎖、Gemini 額度耗盡等狀況會持續一段時間；
# 每次問答都重試會固定浪費數十秒。失敗後讓該服務冷卻，成功者優先。
_PROVIDER_HEALTH: Dict[str, Dict[str, float]] = {}
_PROVIDER_COOLDOWN = float(os.environ.get("AI_PROVIDER_COOLDOWN", "600"))  # 秒
_PROVIDER_MAX_COOLDOWN = 3600.0


def _provider_mark(provider_key: str, ok: bool) -> None:
    entry = _PROVIDER_HEALTH.setdefault(provider_key, {"fails": 0.0, "until": 0.0, "ok_at": 0.0})
    now = time.time()
    if ok:
        entry.update(fails=0.0, until=0.0, ok_at=now)
        return
    entry["fails"] += 1
    # 連續失敗則指數延長冷卻（10 分 → 20 分 → 40 分，上限 1 小時）
    backoff = min(_PROVIDER_COOLDOWN * (2 ** (entry["fails"] - 1)), _PROVIDER_MAX_COOLDOWN)
    entry["until"] = now + backoff


def _provider_is_cooling(provider_key: str) -> bool:
    entry = _PROVIDER_HEALTH.get(provider_key)
    return bool(entry and time.time() < entry.get("until", 0.0))


def _provider_health_order(priority: "List[str]") -> "List[str]":
    """最近成功過的服務排前面，其餘維持原設定順序。"""
    def sort_key(name: str):
        entry = _PROVIDER_HEALTH.get(name) or {}
        return (-entry.get("ok_at", 0.0), priority.index(name))
    return sorted(priority, key=sort_key)


@nlp_rag.route("/ai-providers/reset", methods=["POST"])
def ai_providers_reset() -> Any:
    """清除 AI 服務冷卻狀態（設定新 API Key 後可立即重試）。"""
    cleared = sorted(_PROVIDER_HEALTH.keys())
    _PROVIDER_HEALTH.clear()
    _platform_ctx_cache.clear()
    return jsonify({"status": "success", "cleared": cleared, "timestamp": _now()})


def _ai_synthesis(query: str, combined_ctx: str) -> "tuple[str, str, str]":
    """自動選用可用的免費 AI 服務，依序嘗試：
    Groq → Gemini → Claude → OpenRouter → Ollama（本機）
    回傳 (answer, provider_key, display_name)
    """
    import os, logging
    _log = logging.getLogger(__name__)

    # 列出目前環境變數狀態（啟動時一次）
    key_status = {
        "GROQ":        bool(os.environ.get("GROQ_API_KEY")),
        "GOOGLE":      bool(os.environ.get("GOOGLE_API_KEY")),
        "CLAUDE":      bool(os.environ.get("ANTHROPIC_API_KEY") or os.environ.get("CLAUDE_API_KEY")),
        "OPENROUTER":  bool(os.environ.get("OPENROUTER_API_KEY")),
    }
    _log.info(f"[AI_SYNTHESIS] Key status: {key_status}")

    provider_functions = {
        "gemini": _call_gemini,
        "claude": _call_claude,
        "groq": _call_groq,
        "openrouter": _call_openrouter,
    }
    priority = [
        name.strip().lower()
        for name in os.environ.get(
            "AI_PROVIDER_PRIORITY", "openrouter,gemini,claude,groq"
        ).split(",")
        if name.strip().lower() in provider_functions
    ]

    provider_key_names = {
        "gemini": "GOOGLE", "claude": "CLAUDE",
        "groq": "GROQ", "openrouter": "OPENROUTER",
    }

    # 上次成功的服務優先重試，避免每次都從頭嘗試已失效的服務
    healthy_first = _provider_health_order(priority)
    for provider_key in healthy_first:
        if _provider_is_cooling(provider_key):
            _log.info(f"[AI_SYNTHESIS] ⏭ 跳過 {provider_key}（冷卻中，稍早失敗）")
            continue
        fn = provider_functions[provider_key]
        text, display = fn(query, combined_ctx)
        if text:
            _log.info(f"[AI_SYNTHESIS] ✓ 使用 {display}")
            _provider_mark(provider_key, ok=True)
            return text, provider_key, display
        # 只對「有 Key 但呼叫失敗」的服務啟動冷卻。未設 Key 的服務會立即返回、
        # 本來就不耗時；若冷卻它，之後補上的新 Key 會被忽略一段時間。
        has_key = key_status.get(provider_key_names[provider_key], False)
        if has_key:
            _log.info(f"[AI_SYNTHESIS] ✗ {provider_key} 呼叫失敗，進入冷卻")
            _provider_mark(provider_key, ok=False)
        else:
            _log.info(f"[AI_SYNTHESIS] ✗ {provider_key} 未設定 API Key")

    # 本機 Ollama fallback
    _log.info("[AI_SYNTHESIS] 嘗試 Ollama 本機...")
    text = _call_ollama_synthesis(query, combined_ctx)
    if text:
        model = os.environ.get("OLLAMA_SMART_MODEL", "qwen2.5:7b")
        _log.info(f"[AI_SYNTHESIS] ✓ 使用 Ollama ({model})")
        return text, "ollama", f"{model} (Ollama 本機)"

    _log.warning("[AI_SYNTHESIS] ✗ 所有 AI 服務皆無回應，使用本機知識庫 fallback")
    return "", "none", ""


# OpenCode Zen：第二個免費模型閘道，用於 OpenRouter 額度不足或
# 打到「每日免費模型上限」時接手。模型 ID 與 OpenRouter 不同（無 nvidia/ 等前綴）。
ZEN_ENDPOINT = "https://opencode.ai/zen/v1/chat/completions"
# Cloudflare 會依用戶端指紋阻擋（error 1010），必須帶瀏覽器 User-Agent 才能連線。
_BROWSER_UA = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
               "(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36")

ZEN_FREE_MODELS = [
    "nemotron-3.5-lightning-free",
    "hy3-free",
    "mimo-v2.5-free",
    "nemotron-3-ultra-free",
]


# OpenCode Go：訂閱制模型方案。Go 使用獨立端點與 Go API key，
# 模型 ID 不使用 OpenRouter 的 provider 前綴。
GO_ENDPOINT = "https://opencode.ai/zen/go/v1/chat/completions"


def _opencode_go_key() -> str:
    """Read the Go key without exposing it; keep the old name as a migration alias."""
    return (os.environ.get("OPENCODE_GO_API_KEY") or
            os.environ.get("OPENCODE_ZEN_API_KEY") or "").strip()


def _zen_chat(messages: "List[Dict[str, Any]]", config: Dict[str, Any],
              tools: "Optional[List[Dict[str, Any]]]" = None,
              endpoint: str = "", model: str = "",
              provider_name: str = "opencode_zen") -> Dict[str, Any]:
    """呼叫 OpenCode Zen / Go（OpenAI 相容端點，共用同一把金鑰）。"""
    import urllib.request, urllib.error, json as _json
    _log = logging.getLogger(__name__)
    key = _opencode_go_key()
    if not key:
        return {"error_type": "zen_key_not_set"}

    endpoint = endpoint or ZEN_ENDPOINT
    model = (model
             or os.environ.get("ZEN_MODEL", "").strip()
             or _as_text(config.get("zen_model"))
             or ZEN_FREE_MODELS[0])
    payload: Dict[str, Any] = {
        "model": model,
        "messages": messages,
        "temperature": float(config.get("temperature") or 0.2),
        "max_tokens": int(config.get("max_tokens") or 800),
    }
    if tools:
        payload["tools"] = tools
        payload["tool_choice"] = "auto"

    started = time.perf_counter()
    req = urllib.request.Request(
        endpoint, data=_json.dumps(payload).encode("utf-8"),
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {key}",
            "User-Agent": _BROWSER_UA,
        },
        method="POST")
    try:
        with urllib.request.urlopen(req, timeout=float(config.get("timeout") or 28)) as response:
            result = _json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        body = exc.read()[:200].decode("utf-8", "replace")
        _log.warning("[%s] HTTP %s: %s", provider_name.upper(), exc.code, body)
        return {"error_type": f"zen_http_{exc.code}", "detail": body}
    except Exception as exc:
        _log.warning("[%s] %s: %s", provider_name.upper(), type(exc).__name__, exc)
        return {"error_type": f"zen_{type(exc).__name__}"}

    choice = (result.get("choices") or [{}])[0]
    usage = dict(result.get("usage") or {})
    return {
        "message": choice.get("message") or {},
        "actual_model": _as_text(result.get("model")) or model,
        "provider": provider_name,
        "input_tokens": int(usage.get("prompt_tokens") or 0),
        "output_tokens": int(usage.get("completion_tokens") or 0),
        "estimated_cost": 0.0,
        "response_time": round(time.perf_counter() - started, 3),
        "models": [model],
    }


def _agent_chat(messages: "List[Dict[str, Any]]", config: Dict[str, Any],
                tools: "Optional[List[Dict[str, Any]]]" = None) -> Dict[str, Any]:
    """Agent 專用的唯一雲端模型路由：OpenCode Go。"""
    if not _opencode_go_key():
        return {"error_type": "opencode_go_key_not_set"}
    go_model = (_as_text(config.get("go_model")) or
                os.environ.get("OPENCODE_GO_MODEL", "minimax-m3").strip() or
                "minimax-m3")
    return _zen_chat(messages, config, tools=tools,
                     endpoint=GO_ENDPOINT, model=go_model,
                     provider_name="opencode_go")


def _openrouter_chat(messages: "List[Dict[str, Any]]", config: Dict[str, Any],
                     tools: "Optional[List[Dict[str, Any]]]" = None,
                     tool_choice: str = "auto") -> Dict[str, Any]:
    """呼叫 OpenRouter chat completions，支援工具呼叫。

    與 _call_openrouter_mode 的差異：接受完整 messages 串列（含 tool 角色訊息），
    並回傳原始 message 物件供 Agent 迴圈判斷是否還要繼續呼叫工具。
    """
    import urllib.request, urllib.error, json as _json
    _log = logging.getLogger(__name__)
    key = os.environ.get("OPENROUTER_API_KEY", "")
    if not key:
        return {"error_type": "key_not_set"}

    models = []
    for candidate in (config.get("model"), config.get("fallback_model")):
        candidate = _as_text(candidate)
        if candidate and candidate not in models:
            models.append(candidate)
    if not models:
        return {"error_type": "model_not_set"}

    payload: Dict[str, Any] = {
        "messages": messages,
        "temperature": float(config.get("temperature") or 0.2),
        "max_tokens": int(config.get("max_tokens") or 800),
        "reasoning": {"exclude": True},
        "usage": {"include": True},
    }
    if len(models) > 1:
        payload["models"] = models
    else:
        payload["model"] = models[0]
    if tools:
        payload["tools"] = tools
        # 最後一輪用 "none"：工具宣告仍保留，但要求模型直接作答。
        # 若改成完全不帶 tools，模型仍會想查資料，於是在文字中吐出偽造的
        # <tool_call> 標記而非答案。
        payload["tool_choice"] = tool_choice

    started = time.perf_counter()
    req = urllib.request.Request(
        "https://openrouter.ai/api/v1/chat/completions",
        data=_json.dumps(payload).encode("utf-8"),
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {key}",
            "HTTP-Referer": "https://hengliuxi-management.onrender.com",
            "X-Title": "Hengliu Creek Management Platform",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=float(config.get("timeout") or 28)) as response:
            result = _json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        body = exc.read()[:200].decode("utf-8", "replace")
        _log.warning("[AGENT] OpenRouter HTTP %s: %s", exc.code, body)
        return {"error_type": f"http_{exc.code}", "detail": body}
    except Exception as exc:
        _log.warning("[AGENT] OpenRouter %s: %s", type(exc).__name__, exc)
        return {"error_type": type(exc).__name__}

    choice = (result.get("choices") or [{}])[0]
    usage = dict(result.get("usage") or {})
    return {
        "message": choice.get("message") or {},
        "actual_model": _as_text(result.get("model")) or models[0],
        "input_tokens": int(usage.get("prompt_tokens") or 0),
        "output_tokens": int(usage.get("completion_tokens") or 0),
        "estimated_cost": float(usage.get("cost") or 0.0),
        "response_time": round(time.perf_counter() - started, 3),
        "models": models,
    }


def _run_agent(query: str, snapshot: Dict[str, Any], grounding: str,
               config: Dict[str, Any], max_rounds: int = 2) -> Dict[str, Any]:
    """工具呼叫式 Agent：讓模型自行決定要查哪些資料，再統整作答。

    相較於「先檢索一堆文字塞進提示詞」的舊做法，這裡模型拿到的數字都來自
    工具回傳的權威 JSON，因此不需要再用關鍵字閘門覆寫答案。
    """
    import json as _json
    _log = logging.getLogger(__name__)
    started = time.perf_counter()

    if agent_tools is None:
        return {"answer": "", "error_type": "agent_tools_unavailable"}

    # 只給簡短定位資訊，不預先塞入大量檢索文字。
    # 實測若把舊流程的 6000 字 context 一起送上，模型會直接從那段文字作答而不呼叫工具，
    # 等於退回「檢索後塞提示詞」的老路，失去 Agent 主動查詢的意義。
    user_content = f"【使用者問題】\n{query}"
    if grounding.strip():
        user_content = (f"【背景定位（僅供判斷要查什麼，數據仍須以工具回傳為準）】\n"
                        f"{grounding.strip()[:800]}\n\n{user_content}")

    messages: List[Dict[str, Any]] = [
        {"role": "system", "content": _AGENT_SYSTEM_PROMPT},
        {"role": "user", "content": user_content},
    ]

    totals = {"input_tokens": 0, "output_tokens": 0, "estimated_cost": 0.0}
    actual_model = ""
    tools_used: List[str] = []

    # 第 1 輪只是「決定要查哪些資料」，屬於路由決策，不需要動用最貴最慢的模型；
    # 實測快速模型 1.8 秒即可正確選出工具與參數，而高階模型要十餘秒。
    # 真正需要品質的是最後統整那一輪，仍使用使用者選定的模式模型。
    router_config = dict(config)
    router_model = os.environ.get("AI_AGENT_ROUTER_MODEL", "").strip() \
        or _as_text(config.get("fallback_model")) or _as_text(config.get("model"))
    router_config.update(model=router_model, fallback_model="",
                         max_tokens=400, timeout=max(20.0, float(config.get("timeout") or 28)))
    # Zen 上的模型各有所長（實測）：lightning 選工具最快但統整會夾雜英文推理，
    # ultra 統整乾淨卻較慢。因此路由用快的、統整用穩的。
    router_config["zen_model"] = (os.environ.get("ZEN_ROUTER_MODEL", "").strip()
                                  or "nemotron-3.5-lightning-free")
    router_config["go_model"] = (os.environ.get("OPENCODE_GO_ROUTER_MODEL", "").strip()
                                 or os.environ.get("OPENCODE_GO_MODEL", "").strip()
                                 or "minimax-m3")

    # 最後一輪要把多個工具結果統整成完整答案，輸出空間需比單次問答寬裕，
    # 否則會出現句子講到一半被截斷的情形。
    # 統整輸入較大（含工具結果），逾時需比路由輪寬鬆，否則慢速模型會讀取逾時。
    answer_config = dict(config)
    answer_config["max_tokens"] = max(int(config.get("max_tokens") or 800), 1000)
    answer_config["timeout"] = max(float(config.get("timeout") or 28), 60.0)
    answer_config["go_model"] = (os.environ.get("OPENCODE_GO_MODEL", "").strip()
                                 or "minimax-m3")

    for round_index in range(max_rounds):
        # 最後一輪不再提供工具，強制模型產出答案
        is_last = round_index == max_rounds - 1
        if is_last:
            # 最後一輪不帶工具定義，並明確要求直接作答。
            # 若只是拿掉 tools 而沒有這句指示，模型會在文字中吐出偽造的
            # <tool_call> 標記而非答案。
            messages.append({
                "role": "user",
                "content": "請根據以上工具回傳的資料，用繁體中文直接作答，不要再呼叫工具。",
            })
        result = _agent_chat(
            messages,
            answer_config if is_last else router_config,
            tools=None if is_last else agent_tools.TOOL_SCHEMAS)

        if result.get("error_type"):
            return {"answer": "", "provider": "opencode_go",
                    "error_type": result["error_type"],
                    "response_time": round(time.perf_counter() - started, 3),
                    **totals}

        actual_model = result.get("actual_model") or actual_model
        for key in totals:
            totals[key] += result.get(key, 0)

        message = result.get("message") or {}
        tool_calls = message.get("tool_calls") or []

        if not tool_calls:
            # 清掉洩漏的英文推理與偽造的工具呼叫標記，只留真正的中文答案
            text = _strip_reasoning_preamble(message.get("content"))
            if not _is_acceptable_zh_answer(text):
                # 非最後一輪就放棄會讓整個 Agent 失效：路由用的快速模型有時會
                # 略過工具直接作答，且品質不符。此時應交給最後一輪的高品質模型
                # 重新產出，而不是直接退回保底樣板。
                if not is_last:
                    messages.append({
                        "role": "user",
                        "content": "請改用繁體中文重新作答；若需要平台資料，"
                                   "請先呼叫對應工具取得後再回答。",
                    })
                    continue
                return {"answer": "", "provider": "opencode_go",
                        "actual_model": actual_model, "error_type": "invalid_answer",
                        "response_time": round(time.perf_counter() - started, 3), **totals}
            _OR_LAST_GOOD["model"] = actual_model
            return {
                "answer": text,
                "provider": "opencode_go",
                "actual_model": actual_model,
                "display_name": f"{actual_model} (Agent)",
                "tools_used": tools_used,
                "response_time": round(time.perf_counter() - started, 3),
                "fallback_used": actual_model != (result.get("models") or [""])[0],
                "error_type": "",
                **totals,
            }

        # 並行執行本輪所有工具呼叫
        messages.append(message)
        tasks = {}
        for index, call in enumerate(tool_calls[:5]):
            fn = call.get("function") or {}
            name = _as_text(fn.get("name"))
            try:
                args = _json.loads(fn.get("arguments") or "{}")
            except Exception:
                args = {}
            tools_used.append(name)
            tasks[f"{index}:{call.get('id')}:{name}"] = (
                lambda n=name, a=args: agent_tools.execute_tool(
                    n, a, snapshot, _local_keyword_retrieve, _web_search_ddg))

        _log.info("[AGENT] 第 %d 輪呼叫工具：%s", round_index + 1, tools_used)
        outputs = _run_parallel(tasks, timeout=25.0)
        for task_key, output in outputs.items():
            _, call_id, name = task_key.split(":", 2)
            messages.append({
                "role": "tool",
                "tool_call_id": call_id,
                "content": _as_text(output) or _json.dumps(
                    {"error": f"{name} 未回傳結果"}, ensure_ascii=False),
            })

    return {"answer": "", "provider": "opencode_go", "actual_model": actual_model,
            "error_type": "no_answer_after_tools", "tools_used": tools_used,
            "response_time": round(time.perf_counter() - started, 3), **totals}


def _ai_synthesis_mode(query: str, combined_ctx: str, config: Dict[str, Any]) -> Dict[str, Any]:
    """Use the selected OpenCode Go model without cross-provider retries."""
    started = time.perf_counter()
    if not _opencode_go_key():
        return {"answer": "", "provider": "opencode_go",
                "error_type": "opencode_go_key_not_set",
                "response_time": round(time.perf_counter() - started, 3)}

    messages = [
        {"role": "system", "content": _SYSTEM_PROMPT},
        {"role": "user", "content": _build_user_msg(query, combined_ctx)},
    ]
    go_model = (_as_text(config.get("go_model")) or
                os.environ.get("OPENCODE_GO_MODEL", "minimax-m3").strip() or
                "minimax-m3")
    result = _zen_chat(messages, config, endpoint=GO_ENDPOINT,
                       model=go_model, provider_name="opencode_go")
    text = _strip_reasoning_preamble(
        (result.get("message") or {}).get("content") or ""
    )
    if _is_acceptable_zh_answer(text):
        result.update({
            "answer": text,
            "provider": "opencode_go",
            "display_name": f"{go_model} (OpenCode Go)",
            "fallback_used": False,
            "error_type": "",
        })
        return result
    result["answer"] = ""
    result["provider"] = "opencode_go"
    result["error_type"] = result.get("error_type") or "invalid_answer"
    result["response_time"] = round(time.perf_counter() - started, 3)
    return result


@nlp_rag.route("/ai/model-config", methods=["GET"])
def ai_model_config_public() -> Any:
    go_key_ready = bool(_opencode_go_key())
    return jsonify({
        "status": "success",
        "default_mode": "pro",
        "modes": public_modes(),
        "provider": "opencode_go",
        "provider_label": "OpenCode Go",
        "opencode_go_ready": go_key_ready,
        "opencode_go_model": os.environ.get("OPENCODE_GO_MODEL", "minimax-m3"),
        "rag_ready": rag_backend is not None,
        "timestamp": _now(),
    })


@nlp_rag.route("/ai/usage-summary", methods=["GET"])
def ai_usage_summary() -> Any:
    """Return aggregate usage only; raw user questions are never exposed."""
    days = max(1, min(365, int(request.args.get("days", 30))))
    try:
        with _usage_db() as conn:
            summary = conn.execute(
                """SELECT COUNT(*) AS questions,
                          COALESCE(SUM(input_tokens), 0) AS input_tokens,
                          COALESCE(SUM(output_tokens), 0) AS output_tokens,
                          COALESCE(SUM(estimated_cost), 0) AS estimated_cost,
                          COALESCE(AVG(response_time), 0) AS average_response_time,
                          COALESCE(AVG(rag_chunk_count), 0) AS average_rag_chunks,
                          COALESCE(SUM(answer_success), 0) AS successful_answers
                   FROM ai_usage_logs
                   WHERE timestamp >= datetime('now', ?)""",
                (f"-{days} days",),
            ).fetchone()
            modes = conn.execute(
                """SELECT resolved_mode AS mode, COUNT(*) AS questions,
                          COALESCE(SUM(estimated_cost), 0) AS estimated_cost
                   FROM ai_usage_logs
                   WHERE timestamp >= datetime('now', ?)
                   GROUP BY resolved_mode ORDER BY questions DESC""",
                (f"-{days} days",),
            ).fetchall()
        return jsonify({
            "status": "success", "days": days,
            "summary": dict(summary or {}),
            "by_mode": [dict(row) for row in modes],
            "timestamp": _now(),
        })
    except Exception as exc:
        logging.getLogger(__name__).warning("[AI_USAGE] summary failed: %s", exc)
        return jsonify({"status": "error", "message": "用量摘要暫時無法取得"}), 503


# ── OCR Drive Index (lazy import to avoid startup failure) ───────────────────
_ocr_svc = None

def _get_ocr_svc():
    global _ocr_svc
    if _ocr_svc is None:
        try:
            from webapp import gdrive_ocr_service as _m
            _ocr_svc = _m
        except Exception:
            try:
                import gdrive_ocr_service as _m
                _ocr_svc = _m
            except Exception:
                pass
    return _ocr_svc

_OCR_FOLDER_ID = os.environ.get("GDRIVE_FOLDER_ID", "1k2s5HSd_R5GeCt05SOtJxn6UFSrbyoQ9")


@nlp_rag.route("/ocr/index-drive", methods=["POST"])
def ocr_index_drive() -> Any:
    """觸發 Google Drive 文件全文索引（背景執行）。
    可選帶入 groq_key 供掃描 PDF/圖說/照片的視覺 OCR 使用（僅存記憶體）。"""
    svc = _get_ocr_svc()
    if svc is None:
        return jsonify({"status": "error", "message": "OCR 模組未載入"}), 503
    data       = request.get_json(silent=True) or {}
    vision_key = _as_text(data.get("groq_key") or data.get("vision_key")) or None
    folder_id  = _as_text(data.get("folder_id") or data.get("drive_folder_id")) or _OCR_FOLDER_ID
    folder_url = _as_text(data.get("folder_url") or data.get("drive_folder_url"))
    if folder_url:
        m = re.search(r"/folders/([A-Za-z0-9_-]+)", folder_url)
        if m:
            folder_id = m.group(1)
    started    = svc.start_indexing(folder_id, vision_key=vision_key)
    vision_note = "（含掃描檔/照片視覺 OCR）" if vision_key else "（僅數位文字；未提供 Groq Key，掃描檔將以視覺降級）"
    if started:
        return jsonify({"status": "success", "message": f"索引建立中{vision_note}，請稍候（可能需要 5-15 分鐘）…", "started": True})
    return jsonify({"status": "success", "message": "索引執行中，請稍後查詢狀態", "started": False})


@nlp_rag.route("/ocr/status", methods=["GET"])
def ocr_status() -> Any:
    """取得 OCR 索引狀態與統計。"""
    svc = _get_ocr_svc()
    if svc is None:
        return jsonify({"status": "error", "message": "OCR 模組未載入"}), 503
    return jsonify({"status": "success", "data": svc.get_status()})


@nlp_rag.route("/ocr/search", methods=["POST"])
def ocr_search() -> Any:
    """對 Drive OCR 索引進行關鍵字搜尋。"""
    svc = _get_ocr_svc()
    if svc is None:
        return jsonify({"status": "error", "message": "OCR 模組未載入"}), 503
    data  = request.get_json() or {}
    query = _as_text(data.get("query") or data.get("q"))
    top_k = max(1, min(10, int(data.get("top_k") or 5)))
    if not query:
        return jsonify({"status": "error", "message": "缺少 query"}), 400
    results = svc.search(query, top_k=top_k)
    return jsonify({
        "status":    "success",
        "query":     query,
        "results":   results,
        "count":     len(results),
        "timestamp": _now(),
    })


@nlp_rag.route("/management/latest-context", methods=["GET", "POST"])
def management_latest_context() -> Any:
    """Return latest inspection + maintenance context for AI grounding."""
    if management_context is None:
        return jsonify({"status": "error", "message": "管理上下文模組未載入"}), 503
    data = request.get_json(silent=True) or {}
    query = _as_text(data.get("query") or request.args.get("query") or "")
    limit = max(1, min(10, int(data.get("limit") or request.args.get("limit") or 6)))
    ctx = management_context.build_management_context(query, limit=limit)
    return jsonify({
        "status": "success",
        "query": query,
        "context": ctx.get("context", ""),
        "evidence": ctx.get("evidence", []),
        "counts": ctx.get("counts", {}),
        "timestamp": _now(),
    })


def _management_fallback_answer(
    query: str,
    evidence: List[Dict[str, Any]],
    counts: Dict[str, Any],
) -> str:
    """Build a deterministic answer when no generative model is available."""
    inspections = [e for e in evidence if e.get("type") == "inspection"][:4]
    maint = [e for e in evidence if e.get("type") == "maintenance"][:4]

    query_text = _as_text(query)
    if re.search(r"魚", query_text) and re.search(
            r"往上游|往下游|上溯|溯游|怎麼知道|如何確認|通行", query_text):
        lines = ["依橫流溪相關魚道巡查紀錄："]
        for item in inspections:
            lines.append(
                f"- {item.get('date', '')}｜{item.get('title', '')}｜{item.get('summary', '')}"
            )
        if inspections:
            lines.append(
                "判讀：上述紀錄以魚道現場觀察與通行結果作為證據；若要確認特定日期或魚種數量，"
                "仍應回查原始魚道檢核表與調查報告。"
            )
        return "\n".join(lines)

    asks_statistics = bool(re.search(r"統計|多少|幾筆|幾件|幾座|照片|金額|經費|日報", query_text))
    lines = ["依與本題直接相關的巡查與維護資料判讀："]
    if asks_statistics:
        stats = []
        if re.search(r"巡查|紀錄|幾筆|統計", query_text):
            stats.append(f"相關巡查紀錄 {len(inspections)} 筆")
        if re.search(r"工程|維護|修補|修復|施工|幾件|統計", query_text):
            stats.append(f"相關維護工程 {len(maint)} 件")
        if re.search(r"日報", query_text):
            stats.append(f"施工日誌 {counts.get('maintenance_reports', 0)} 份")
        if re.search(r"照片", query_text):
            stats.append(f"維護照片 {counts.get('maintenance_photos', 0)} 張")
        if stats:
            lines.append("資料量化：" + "、".join(stats) + "。")

    if inspections:
        lines.append("相關巡查重點：")
        for item in inspections:
            lines.append(
                f"- {item.get('date', '')}｜{item.get('title', '')}｜"
                f"{item.get('form_type', '巡查')}｜狀態 {item.get('status', '未標示')}｜"
                f"優先度 {item.get('priority', '未標示')}｜{item.get('summary', '')}"
            )

    if maint:
        lines.append("相關維護工程：")
        for item in maint:
            amount = f"｜金額 {item.get('amount')}" if item.get("amount") else ""
            lines.append(
                f"- {item.get('date', '')}｜{item.get('title', '')}{amount}｜"
                f"{item.get('summary', '')}"
            )

    if inspections or maint:
        lines.append(
            "管理建議：涉及現場處置時，請以最新專業巡查、魚道檢核表及核定施工計畫確認，"
            "不要以本段摘要取代現勘。"
        )
    return "\n".join(lines)


def _retrieval_method_fallback_answer(query: str, docs: List[Dict[str, Any]]) -> str:
    """Turn a relevant fish-movement retrieval hit into a direct answer."""
    if not docs or not re.search(r"往上游|往下游|上溯|溯游|怎麼知道.*魚|如何確認.*魚", query):
        return ""
    return (
        "依橫流溪魚道調查資料，判斷魚是否往上游的作法，是在魚道上游進水口（出口）"
        "附近設置箱型陷阱與圍網，記錄捕獲或通行情形，再與下游及不同日期的調查結果比對。"
        "目前檢索片段可確認這套調查方法，但未提供本題指定日期、魚種與尾數，不能僅據此"
        "宣稱某一尾魚已完成上溯；詳細結果應回查魚道檢核表與原始調查紀錄。"
    )


def _smalltalk_answer(query: str) -> str:
    """Return a deterministic reply for short social messages.

    These messages must not enter RAG retrieval: the platform snapshot always
    contains facility data, so an unrelated greeting could otherwise be paired
    with a valid but irrelevant engineering passage.
    """
    normalized = re.sub(r"[\s，。！？!?、~～]+", "", _as_text(query)).lower()
    if not normalized or len(normalized) > 24:
        return ""

    if normalized in {"生日快樂", "祝你生日快樂", "祝大家生日快樂"}:
        return "生日快樂！祝福今天過生日的人平安順心、事事如意。"
    if normalized in {"你好", "您好", "嗨", "哈囉", "hello", "hi", "早安", "午安", "晚安"}:
        return "您好！我是橫流溪管理平台 AI 助理，可以協助查詢工程設施、巡查維護、魚道與生態監測資料。"
    if normalized in {"謝謝", "感謝", "謝謝你", "感謝你", "辛苦了"}:
        return "不客氣！需要查詢橫流溪工程、巡查、維護或生態資料時，都可以直接告訴我。"
    if normalized in {"再見", "掰掰", "bye", "下次見"}:
        return "再見！祝您今天順利。"
    if normalized in {"你是誰", "請問你是誰", "你可以做什麼", "你會做什麼"}:
        return "我是橫流溪管理平台 AI 助理，主要協助查詢工程設施、巡查維護、魚道與生態監測資料。"
    return ""


@nlp_rag.route("/smart-ask", methods=["POST"])
def smart_ask() -> Any:
    """
    智慧問答端點：
      1. 本機 RAG、平台、巡查維護與 Drive OCR 先行
      2. 本案資料不足時才以 DuckDuckGo 限定範圍補充
      3. AI 綜合推論；模型失敗時只回傳相關證據或環境通則
    """
    request_started = time.perf_counter()
    data    = request.get_json() or {}
    query   = _as_text(data.get("query") or data.get("question"))
    mode_config = resolve_mode(_as_text(data.get("ai_mode")) or "pro", query)
    top_k = int(mode_config.get("top_k") or 4)
    use_web_raw = data.get("use_web", "auto")
    if isinstance(use_web_raw, bool):
        use_web_requested = use_web_raw
    else:
        use_web_text = str(use_web_raw).strip().lower()
        if use_web_text == "auto":
            use_web_requested = "auto"
        else:
            use_web_requested = use_web_text not in ("0", "false", "no", "off")
    # 網路補充必須在本機資料檢索之後決定；舊流程在多路資料並行時先查
    # 網路，模型容易把搜尋結果或泛用平台頁面誤當成橫流溪答案。
    use_web = False
    include_cloud_ocr = str(data.get("include_cloud_ocr", "true")).lower() not in ("0", "false", "no")
    platform_url = _as_text(data.get("platform_url") or data.get("source_url")) or DEFAULT_PLATFORM_URL
    include_platform_url = str(data.get("include_platform_url", "true")).lower() not in ("0", "false", "no")
    client_platform_ctx = _as_text(data.get("client_platform_context"))[:24000]
    # 結構化快照：設施、巡查、魚類調查等資料僅存在瀏覽器端，由前端隨請求送上，
    # 供 Agent 的工具查詢。舊版的文字快照仍相容保留，作為背景說明使用。
    client_snapshot = data.get("client_snapshot")
    if not isinstance(client_snapshot, dict):
        client_snapshot = {}

    if not query:
        return jsonify({"status": "error", "message": "缺少 query"}), 400

    # 純閒聊不應強制套用橫流溪文件。這條快速通道不檢索、不呼叫模型，
    # 因此不會產生 OpenRouter 費用，也避免低相關片段造成答非所問。
    smalltalk_answer = _smalltalk_answer(query)
    if smalltalk_answer:
        response_time = round(time.perf_counter() - request_started, 3)
        usage = {
            "selected_mode": mode_config.get("requested_mode"),
            "selected_mode_label": mode_config.get("requested_label"),
            "resolved_mode": mode_config.get("mode"),
            "resolved_mode_label": mode_config.get("label"),
            "auto_selected": bool(mode_config.get("auto_selected")),
            "actual_model": "未呼叫模型",
            "provider": "conversation_guard",
            "input_tokens": 0,
            "output_tokens": 0,
            "estimated_cost": 0.0,
            "response_time": response_time,
            "rag_chunk_count": 0,
            "fallback_used": False,
        }
        _log_ai_usage({
            "user_question": query,
            **usage,
            "answer_success": True,
            "error_type": "",
        })
        return jsonify({
            "status": "success",
            "answer": smalltalk_answer,
            "llm_provider": "conversation_guard",
            "llm_model": "純閒聊快速回覆",
            "web_search_used": False,
            "web_sources": [],
            "platform_context_used": False,
            "client_platform_context_used": False,
            "platform_evidence": [],
            "local_evidence": [],
            "ocr_citations": [],
            "management_evidence": [],
            "management_counts": {},
            "structured_citations": [],
            "ai_usage": usage,
            "selected_mode": mode_config.get("requested_mode"),
            "resolved_mode": mode_config.get("mode"),
            "confidence_level": "high",
            "confidence_score": 100,
            "message": "純閒聊快速回覆（未呼叫模型與 RAG）",
            "timestamp": _now(),
        })

    # ── 0. 意圖判斷：決定要取哪些來源、是否需要網路檢索 ────────
    intent: Dict[str, Any] = {"intent": "general", "label": "一般查詢", "weights": {}}
    if answer_engine is not None:
        try:
            intent = answer_engine.route_intent(query)
        except Exception as exc:
            logging.getLogger(__name__).warning("[ANSWER] 意圖判斷失敗：%s", exc)

    # ── 1~4. 本案資料來源並行擷取（網路補充在本機檢索後才啟動） ──
    # 這四步彼此獨立；先取得本案資料，才能判斷是否真的需要外部內容。
    def _task_platform() -> Dict[str, Any]:
        if not include_platform_url:
            return {}
        return _fetch_platform_url_context(query, platform_url)

    def _task_local() -> List[Dict[str, Any]]:
        if rag_backend is None:
            return []
        # 多磁碟備份可能含有同一份報告；多取一些候選後再去重，
        # 避免相同片段占滿 Top K 而排擠真正不同的證據。
        return _local_keyword_retrieve(query, top_k=min(15, top_k * 3))

    def _task_ocr() -> Dict[str, Any]:
        ocr_svc = _get_ocr_svc()
        if not include_cloud_ocr or ocr_svc is None:
            return {}
        status = dict(ocr_svc.get_status() or {})
        started = False
        if int(status.get("total_docs") or 0) == 0 and not bool(status.get("running")):
            folder_id = _OCR_FOLDER_ID
            folder_url = _as_text(data.get("folder_url") or data.get("drive_folder_url"))
            if folder_url:
                m = re.search(r"/folders/([A-Za-z0-9_-]+)", folder_url)
                if m:
                    folder_id = m.group(1)
            started = bool(ocr_svc.start_indexing(folder_id))
            status = dict(ocr_svc.get_status() or {})
        return {"status": status, "started": started,
                "hits": ocr_svc.search(query, top_k=top_k) or []}

    def _task_management() -> Dict[str, Any]:
        if management_context is None:
            return {}
        # 管理摘要只在問題真的涉及巡查／維護／設施時查詢；例如「魚往
        # 上游」不應因平台有 77 筆巡查紀錄就被塞入最新巡查清單。
        management_query = re.search(
                r"巡查|巡檢|檢查|檢核|維護|維修|修補|修復|補強|搶修|施工|工程|"
                r"異常|缺失|通報|監工|日報|合約|經費|照片|完工|進度|待處理|管理",
                query, flags=re.IGNORECASE)
        movement_query = re.search(r"魚", query) and re.search(
            r"上游|下游|往上|往下|上溯|下溯|洄游|溯游|通行", query,
            flags=re.IGNORECASE)
        if not management_query and not movement_query:
            return {}
        return management_context.build_management_context(query, limit=top_k) or {}

    results = _run_parallel({
        "platform":   _task_platform,
        "local":      _task_local,
        "ocr":        _task_ocr,
        "management": _task_management,
    })

    # 1. 線上平台 URL 即時資料
    platform_payload: Dict[str, Any] = results.get("platform") or {}
    platform_ctx_raw = _as_text(platform_payload.get("context"))
    platform_ctx = platform_ctx_raw
    if answer_engine is not None:
        platform_ctx = answer_engine.scope_context_to_query(
            query, platform_ctx_raw, max_chars=6500)
    platform_evidence: List[Dict[str, Any]] = list(platform_payload.get("evidence") or [])
    if answer_engine is not None:
        platform_evidence = [
            item for item in platform_evidence
            if answer_engine.is_relevant_text(
                query,
                " ".join(_as_text(item.get(key)) for key in
                          ("title", "summary", "quote", "description")),
            )
        ]
    scoped_client_ctx = client_platform_ctx
    if answer_engine is not None:
        scoped_client_ctx = answer_engine.scope_context_to_query(
            query, client_platform_ctx, max_chars=6500)

    # 2. 本機 RAG 補充
    local_candidates: List[Dict[str, Any]] = results.get("local") or []
    if answer_engine is not None:
        local_candidates = answer_engine.filter_retrieved_docs(
            query, local_candidates, limit=max(top_k, 1))
    local_docs: List[Dict[str, Any]] = []
    local_seen = set()
    for item in local_candidates:
        content = _as_text(item.get("full_text") or item.get("preview") or item.get("text"))
        # 同一份報告常以不同檔名／備份路徑入庫；以內容去重，避免
        # 重複片段佔滿 context。
        dedupe_key = re.sub(r"\s+", "", content[:420]).lower()
        if dedupe_key in local_seen:
            continue
        local_seen.add(dedupe_key)
        local_docs.append(item)
        if len(local_docs) >= top_k:
            break
    local_evidence = [_doc_to_evidence(d) for d in local_docs[:top_k]]
    local_ctx = "\n\n".join(
        (
            f"【本機文件 {index}：{_as_text(d.get('source_file') or d.get('source') or '橫流溪資料庫')}"
            f"；頁碼 {_as_text(d.get('page') or d.get('page_number') or '未標示')}】\n"
            f"{_as_text(d.get('full_text') or d.get('preview') or d.get('text'))[:650]}"
        )
        for index, d in enumerate(local_docs[:top_k], 1)
    ) if local_docs else ""

    # 3. Drive OCR 全文搜尋
    ocr_payload: Dict[str, Any] = results.get("ocr") or {}
    ocr_status_data: Dict[str, Any] = dict(ocr_payload.get("status") or {})
    ocr_index_started = bool(ocr_payload.get("started"))
    ocr_citations: List[Dict[str, Any]] = []
    ocr_parts: List[str] = []
    ocr_hits = list(ocr_payload.get("hits") or [])
    if answer_engine is not None:
        ocr_hits = [
            h for h in ocr_hits
            if answer_engine.is_relevant_text(
                query,
                f"{_as_text(h.get('doc_name'))}\n{_as_text(h.get('chunk'))}",
            )
        ]
    for h in ocr_hits:
        snippet = _as_text(h.get("chunk"))[:450]
        doc_name = _as_text(h.get("doc_name"))
        year_tag = f"（{h['year']}年）" if h.get("year") else ""
        ocr_parts.append(f"【文件：{doc_name}{year_tag}】\n{snippet}")
        ocr_citations.append({
            "title":   doc_name,
            "href":    h.get("web_view", ""),
            "year":    h.get("year"),
            "score":   h.get("score", 0),
            "snippet": snippet[:120],
        })
    ocr_ctx = "\n\n".join(ocr_parts)

    # 4. 最新巡查與維護管理資料
    mgmt: Dict[str, Any] = results.get("management") or {}
    management_ctx = _as_text(mgmt.get("context"))
    management_evidence: List[Dict[str, Any]] = list(mgmt.get("evidence") or [])
    management_counts: Dict[str, Any] = dict(mgmt.get("counts") or {})

    # ── 6. 依意圖篩選來源後組合 context ───────────────────────
    # 過去不論問題內容都把所有來源塞進 context，導致問魚類棲地卻回巡查統計。
    # 現在先判斷意圖，只納入與問題相關的來源，不相關者明確排除。
    handbook_ctx = ""
    if answer_engine is not None and intent.get("intent") == "review":
        try:
            handbook_ctx = answer_engine.handbook_reference(query)
        except Exception as exc:
            logging.getLogger(__name__).warning("[ANSWER] 手冊檢索失敗：%s", exc)

    # ── 5. 只有本案資料不足或使用者明示時才查外部網路 ─────────────
    # 這裡刻意放在本機 RAG、OCR、巡查與手冊檢索之後，確保「資料庫優先」。
    direct_context_chars = sum(len(value) for value in (
        scoped_client_ctx, platform_ctx, local_ctx, ocr_ctx,
        management_ctx, handbook_ctx))
    if answer_engine is not None:
        use_web = answer_engine.needs_web_search(
            query, intent, direct_context_chars, use_web_requested)
    else:
        use_web = bool(use_web_requested is True)
    web_results: List[Dict[str, Any]] = (
        _filter_web_results(query, _web_search_ddg(query, max_results=6))
        if use_web else []
    )
    web_ctx = _format_web_results(web_results) if web_results else ""

    # ── 6. 資料不足時補充環境脈絡，而非拿別的統計數字填空 ───────
    environment_ctx = ""
    if answer_engine is not None:
        evidence_text = "\n".join(
            value for value in (scoped_client_ctx, platform_ctx, local_ctx, ocr_ctx,
                                management_ctx, handbook_ctx, web_ctx) if value)
        if answer_engine.needs_environment_context(query, evidence_text):
            environment_ctx = answer_engine.build_environment_context(query)

    platform_context = scoped_client_ctx or platform_ctx[:6500]

    raw_sources = {
        "platform":   platform_context,
        "management": management_ctx[:3500] if management_evidence else "",
        # 平台快照已經是單一經過相關性篩選的來源，不要再以 facility
        # 名義複製同一段文字，避免模型把同一證據誤認成兩份資料。
        "facility":   "",
        "ecology":    ocr_ctx,
        "docs":       local_ctx,
        "handbook":   handbook_ctx,
        "web":        web_ctx,
        "environment": environment_ctx,
    }

    dropped_sources: List[str] = []
    if answer_engine is not None:
        weights = dict(intent.get("weights") or {})
        # 只有已通過問題相關性過濾的快照才保留；不再因為它來自瀏覽器
        # 就無條件以最高權重塞入模型。
        if platform_context:
            weights["platform"] = max(weights.get("platform", 0.0), 0.8)
        if (management_evidence and re.search(r"魚", query) and re.search(
                r"往上游|往下游|上溯|溯游|怎麼知道|如何確認|通行", query)):
            # 生態意圖預設不帶管理資料，但魚類上溯的現場巡查是直接證據，
            # 與一般「最新巡查摘要」不同，應納入模型 context。
            weights["management"] = max(weights.get("management", 0.0), 0.8)
        used_sources, dropped_sources = answer_engine.filter_sources(raw_sources, weights)
    else:
        used_sources = {k: v for k, v in raw_sources.items() if (v or "").strip()}

    combined_ctx_parts = []
    for name, text in used_sources.items():
        label = (answer_engine.SOURCE_LABELS.get(name, name)
                 if answer_engine is not None else name)
        note = "（外部資料，不得覆蓋橫流溪原始紀錄）" if name == "web" else ""
        combined_ctx_parts.append(f"===== 來源：{label}{note} =====\n{text}")
    combined_ctx = "\n\n".join(combined_ctx_parts)

    # ── 7. 推論：優先走工具呼叫式 Agent ───────────────────────────
    evidence_count = (
        len(local_evidence) + len(ocr_citations) + len(management_evidence)
        + len(platform_evidence) + len(web_results)
    )
    if platform_context.strip():
        evidence_count += 1

    # Agent 由模型自行決定要查哪些資料，因此不可在工具執行前依 evidence_count
    # 判斷「資料不足」——那個判斷屬於舊的「先檢索再作答」流程。
    ai_result: Dict[str, Any] = {}
    if agent_tools is not None and client_snapshot:
        page_info = (client_snapshot.get("page") or {}) if client_snapshot else {}
        counts = (client_snapshot.get("counts") or {}) if client_snapshot else {}
        grounding = (f"使用者目前所在頁面：{_as_text(page_info.get('section')) or '未標示'}。"
                     f"平台現有設施 {counts.get('facilities', '?')} 座、"
                     f"巡查紀錄 {counts.get('inspections', '?')} 筆、"
                     f"魚類調查 {counts.get('fishSurveys', '?')} 場次。")
        if environment_ctx:
            grounding += (
                "\n系統已判定本題缺少本案直接環境／進場資料；以下脈絡只屬一般通則，"
                "不得當成本案核定工法：\n" + environment_ctx[:1800]
            )
        ai_result = _run_agent(query, client_snapshot, grounding, mode_config)

    if not _as_text(ai_result.get("answer")):
        # Agent 不可用或未能作答時，退回既有的單次推論流程
        if not combined_ctx.strip() and evidence_count == 0:
            ai_result = {
                "answer": "目前資料庫中沒有足夠資料可以確認。請補充設施名稱、樁號、巡查日期或調查年度後再查詢。",
                "provider": "rag_guard",
                "actual_model": "未呼叫模型",
                "display_name": "RAG 資料不足保護",
                "input_tokens": 0,
                "output_tokens": 0,
                "estimated_cost": 0.0,
                "response_time": round(time.perf_counter() - request_started, 3),
                "fallback_used": False,
                "error_type": "insufficient_evidence",
            }
        else:
            ai_result = _ai_synthesis_mode(query, combined_ctx, mode_config)
    answer = _as_text(ai_result.get("answer"))
    if answer and answer_engine is not None:
        # 模型即使收到正確 context，仍可能回到「最新巡查摘要」等泛用答案；
        # 這種答案不得直接顯示，改走同一問題的相關證據保底。
        try:
            if not answer_engine.is_answer_relevant(query, answer):
                logging.getLogger(__name__).warning(
                    "[ANSWER] 丟棄疑似答非所問的模型輸出：%s", query[:80])
                answer = ""
                ai_result["error_type"] = "off_topic_answer"
        except Exception as exc:
            logging.getLogger(__name__).warning("[ANSWER] 相關性檢查失敗：%s", exc)
    provider_key = _as_text(ai_result.get("provider")) or "none"
    provider_display = _as_text(ai_result.get("display_name") or ai_result.get("actual_model"))

    # 註：原本這裡有一段 platform_guard，會在特定關鍵字命中時
    # 用樣板整段覆蓋 AI 的答案，藉此避免模型講錯魚道現況。
    # 改為工具呼叫式 Agent 後，設施數據直接來自 query_facilities 工具回傳的
    # 權威 JSON，模型無從竄改，因此不再需要這層覆寫，也不會再誤觸。

    # ── 7a. AI 失敗時的保底輸出 ──────────────────────────────────
    # 保底只能呈現「與本題相關」的檢索結果。過去不論問什麼都輸出巡查統計，
    # 才會出現問魚類棲地卻回「巡查紀錄 77 筆、照片 5660 張」這種答非所問。
    if not answer:
        weights = intent.get("weights", {})
        movement_query = bool(re.search(r"魚", query) and re.search(
            r"往上游|往下游|上溯|溯游|怎麼知道|如何確認|通行", query))
        if movement_query and management_evidence:
            weights = dict(weights)
            weights["management"] = max(weights.get("management", 0.0), 0.8)
        prefix = ("（AI 推論服務目前無法使用，以下為與本題相關的直接檢索結果，"
                  "尚未經過整理與研判，請對照原始文件確認。）\n\n")
        # 保底來源依本題的意圖權重排序，確保委員題先用手冊、生態題先用文件，
        # 而不是一律拿巡查統計充數。
        candidates = []
        if environment_ctx:
            candidates.append((
                "environment_context", environment_ctx, "橫流溪周邊環境脈絡",
                lambda text: text,
            ))
        retrieval_method_answer = _retrieval_method_fallback_answer(query, local_docs)
        if retrieval_method_answer:
            candidates.append((
                "retrieval_method", retrieval_method_answer, "本機調查方法判讀",
                lambda text: text,
            ))
        candidates.extend([
            ("handbook", handbook_ctx, "評審問答準備手冊",
             lambda text: prefix + text),
            ("local_kb", local_ctx, "本機知識庫（未經 AI 整理）",
             lambda text: prefix + text),
            ("web", web_ctx, "外部網路補充資料",
             lambda text: "（外部資料補充，非橫流溪實測或核定工法，請人工複核。）\n\n" + text),
        ])
        if management_evidence:
            candidates.append(
                ("management_context", management_ctx, "巡查與維護資料保底回答",
                 lambda _text: _management_fallback_answer(
                     query, management_evidence, management_counts))
            )
        weight_of = {"handbook": "handbook", "local_kb": "docs",
                     "management_context": "management", "environment_context": "environment",
                     "web": "web", "retrieval_method": "docs"}
        # 有「進場／下溪」問題時，環境脈絡比泛用管理統計更直接。
        environment_first = bool(environment_ctx and answer_engine and
                                  answer_engine.needs_environment_context(
                                      query, local_ctx + management_ctx + web_ctx))
        candidates.sort(
            key=lambda item: (
                1 if movement_query and item[0] == "management_context" else 0,
                1 if environment_first and item[0] == "environment_context" else 0,
                weights.get(weight_of[item[0]], 0.4)), reverse=True)

        for key, text, display, render in candidates:
            if (text or "").strip() and weights.get(weight_of[key], 0.4) >= 0.25:
                answer = render(text)
                provider_key, provider_display = key, display
                break

        if not answer:
            answer = (
                f"目前查無與「{query}」直接相關的橫流溪資料，AI 推論服務也暫時無法使用，"
                "因此無法提供研判。\n\n"
                "建議改以更具體的條件重問（例如指定設施編號、年度或物種名稱），"
                "或改查「生態資料庫」「工程設計書架」等模組的原始報告。"
            )
            provider_key, provider_display = "none", "查無相關資料"

    if not answer:
        answer = (
            f"目前查無與「{query}」直接相關的橫流溪資料，"
            "周邊環境與外部資料也不足以支持可靠判斷。"
            "請補充設施名稱、樁號、日期或照片後再查詢。"
        )
        provider_key, provider_display = "none", "無可用 AI"

    web_sources_out = [
        {"title": r.get("title", ""), "href": r.get("href", ""), "body": _as_text(r.get("body"))[:120]}
        for r in web_results[:4]
    ]

    platform_part = "線上平台資料＋ " if platform_context else ""
    web_part  = f"網路搜尋（{len(web_results)} 筆）＋ " if web_results else ""
    ocr_part  = f"雲端文件 {len(ocr_citations)} 筆 ＋ " if ocr_citations else ""
    ai_part   = provider_display or "本機知識庫"
    ocr_running_part = "雲端OCR索引建立中 ＋ " if ocr_index_started or ocr_status_data.get("running") else ""
    msg       = f"{platform_part}{web_part}{ocr_part}{ocr_running_part}本機資料 ＋ {ai_part}"

    structured_citations: List[Dict[str, Any]] = []
    # 最新且具結構欄位的管理資料優先列為來源。
    for item in management_evidence:
        structured_citations.append({
            "source_file": item.get("source") or item.get("title") or "最新巡查與維護紀錄",
            "page": item.get("page") or 1,
            "preview": item.get("quote") or item.get("summary") or item.get("description") or "",
            "score": item.get("confidence") or 0.82,
            "source_href": item.get("source_href") or item.get("href") or "",
            "record_id": item.get("record_id") or item.get("id") or "",
            "source_type": item.get("type") or "管理資料",
        })
    for item in local_evidence:
        structured_citations.append({
            "source_file": item.get("source") or "橫流溪資料庫",
            "page": item.get("page") or 1,
            "section": item.get("section") or "",
            "preview": item.get("quote") or "",
            "score": item.get("confidence") or 0,
            "source_href": item.get("source_href") or "",
            "chunk_id": item.get("chunk_id") or "",
            "source_type": "本機 RAG",
        })
    for item in ocr_citations:
        structured_citations.append({
            "source_file": item.get("title") or "雲端 OCR 文件",
            "page": item.get("page") or 1,
            "preview": item.get("snippet") or "",
            "score": item.get("score") or 0,
            "source_href": item.get("href") or "",
            "source_type": "雲端 OCR",
        })
    if not structured_citations and platform_context.strip():
        structured_citations.append({
            "source_file": "橫流溪管理平台即時資料庫",
            "page": 1,
            "preview": platform_context[:220],
            "score": 0.9,
            "source_href": platform_url,
            "source_type": "平台即時資料",
        })
    structured_citations = structured_citations[:top_k]

    total_response_time = round(time.perf_counter() - request_started, 3)
    usage = {
        "selected_mode": mode_config.get("requested_mode"),
        "selected_mode_label": mode_config.get("requested_label"),
        "resolved_mode": mode_config.get("mode"),
        "resolved_mode_label": mode_config.get("label"),
        "auto_selected": bool(mode_config.get("auto_selected")),
        "actual_model": _as_text(ai_result.get("actual_model")) or provider_display,
        "provider": provider_key,
        "input_tokens": int(ai_result.get("input_tokens") or 0),
        "output_tokens": int(ai_result.get("output_tokens") or 0),
        "estimated_cost": round(float(ai_result.get("estimated_cost") or 0), 8),
        "response_time": total_response_time,
        "rag_chunk_count": len(structured_citations),
        "fallback_used": bool(ai_result.get("fallback_used")),
    }
    _log_ai_usage({
        "user_question": query,
        **usage,
        "answer_success": bool(answer),
        "error_type": ai_result.get("error_type"),
    })

    if provider_key == "environment_context":
        answer_confidence_level, answer_confidence_score = "low", 35
        answer_policy_label = "一般通則，非本案施工紀錄"
    elif provider_key == "retrieval_method":
        answer_confidence_level, answer_confidence_score = "medium", 60
        answer_policy_label = "依調查方法初步判讀，請回查原始紀錄"
    else:
        answer_confidence_level = "high" if structured_citations and answer else ("low" if answer else "none")
        answer_confidence_score = 90 if structured_citations and answer else (45 if answer else 0)
        answer_policy_label = "RAG 專業回答" if structured_citations else "資料不足提醒"

    return jsonify({
        "status":           "success",
        "answer":           answer,
        "llm_provider":     provider_key,
        "llm_model":        provider_display,
        "web_search_used":  bool(web_results),
        "web_sources":      web_sources_out,
        "platform_url":      platform_url,
        "platform_context_used": bool(platform_context),
        "client_platform_context_used": bool(scoped_client_ctx),
        "environment_context_used": bool(environment_ctx),
        "platform_evidence": platform_evidence,
        "local_evidence":   local_evidence,
        "ocr_citations":    ocr_citations,
        "ocr_status":       ocr_status_data,
        "ocr_index_started": ocr_index_started,
        "management_evidence": management_evidence,
        "management_counts": management_counts,
        "structured_citations": structured_citations,
        "ai_usage": usage,
        "selected_mode": mode_config.get("requested_mode"),
        "resolved_mode": mode_config.get("mode"),
        "confidence_level": answer_confidence_level,
        "confidence_score": answer_confidence_score,
        "policy_label":     answer_policy_label,
        "message":          msg,
        "timestamp":        _now(),
    })


@nlp_rag.route("/photo-assess", methods=["POST"])
def photo_assess():
    """照片損壞評估 — 使用 OpenRouter 免費視覺模型。
    接受 multipart/form-data（欄位 photo + question）
    或 application/json（image_base64, mime_type, question）。
    """
    import base64 as _b64, os, urllib.request, urllib.error, json as _json, logging
    _log = logging.getLogger(__name__)
    try:
        # ── 取得圖片 ─────────────────────────────────────────────
        mime_type, image_b64 = "image/jpeg", ""
        ct = request.content_type or ""
        if "multipart" in ct:
            photo = request.files.get("photo")
            if not photo:
                return jsonify({"status": "error", "message": "未收到 'photo' 欄位"}), 400
            image_b64 = _b64.b64encode(photo.read()).decode("ascii")
            mime_type = photo.content_type or "image/jpeg"
        else:
            body = request.get_json(silent=True) or {}
            image_b64 = body.get("image_base64", "")
            mime_type = body.get("mime_type", "image/jpeg")
        if not image_b64:
            return jsonify({"status": "error", "message": "未收到圖片資料"}), 400

        question = (
            (request.form.get("question") if request.form else None)
            or (request.get_json(silent=True) or {}).get("question")
            or "請評估照片中的設施損壞狀況"
        )

        # ── 評估提示詞 ────────────────────────────────────────────
        system_text = (
            "你是橫流溪水利工程設施專業巡查員，具備 DER&U 評估能力。"
            "請以繁體中文分析照片中的設施狀況：\n"
            "1. **損壞類型**：裂縫、淘空、位移、鏽蝕、堵塞、生態廊道阻礙、外觀正常等\n"
            "2. **損壞程度**：輕微 / 中等 / 嚴重（說明理由）\n"
            "3. **緊急程度**：可繼續觀察 / 近期需維護（3個月內）/ 需立即處理\n"
            "4. **建議處置**：具體維修方式或下一步行動\n"
            "若照片不清晰或無法判斷，請說明原因並請使用者補拍。"
        )

        # ── 依序嘗試免費視覺模型 ─────────────────────────────────
        or_key = os.environ.get("OPENROUTER_API_KEY", "")
        if not or_key:
            return jsonify({"status": "error", "message": "未設定 OPENROUTER_API_KEY"}), 503

        # 免費視覺模型會不定期下架；`openrouter/free` 由 OpenRouter 自動路由到
        # 當下可用的免費模型，放第一順位可大幅降低「全部失敗」的機率。
        vision_models = [
            (os.environ.get("OPENROUTER_VISION_MODEL", "").strip(), "指定視覺模型"),
            ("openrouter/free",                                "OpenRouter Free Router"),
            ("meta-llama/llama-3.2-11b-vision-instruct:free",  "llama-3.2-11b-vision"),
            ("qwen/qwen2.5-vl-7b-instruct:free",               "qwen2.5-vl-7b"),
            ("qwen/qwen2-vl-72b-instruct:free",                "qwen2-vl-72b"),
            ("mistralai/mistral-small-3.2-24b-instruct:free",  "mistral-small-3.2-24b"),
        ]
        vision_models = [(m, n) for m, n in vision_models if m]
        if _OR_VISION_LAST_GOOD["model"]:
            vision_models.sort(key=lambda mv: mv[0] != _OR_VISION_LAST_GOOD["model"])
        last_err = ""
        for model_id, display_name in vision_models:
            payload = _json.dumps({
                "model": model_id,
                "messages": [{"role": "user", "content": [
                    {"type": "text", "text": f"{system_text}\n\n問題：{question}"},
                    {"type": "image_url", "image_url": {
                        "url": f"data:{mime_type};base64,{image_b64}"
                    }},
                ]}],
                "max_tokens": 1000,
            }).encode("utf-8")
            req = urllib.request.Request(
                "https://openrouter.ai/api/v1/chat/completions", data=payload,
                headers={
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {or_key}",
                    "HTTP-Referer": "https://hengliuxi-management.onrender.com",
                    "X-Title": "Hengliuxi Management Platform",
                }, method="POST")
            try:
                with urllib.request.urlopen(req, timeout=60) as r:
                    res = _json.loads(r.read().decode())
                answer = res["choices"][0]["message"]["content"].strip()
                if answer:
                    _log.info(f"[PHOTO_ASSESS] ✓ {model_id}")
                    _OR_VISION_LAST_GOOD["model"] = model_id
                    return jsonify({
                        "status": "success",
                        "assessment": answer,
                        "model": display_name,
                        "timestamp": _now(),
                    })
            except urllib.error.HTTPError as e:
                if _OR_VISION_LAST_GOOD["model"] == model_id:
                    _OR_VISION_LAST_GOOD["model"] = ""
                last_err = f"HTTP {e.code}: {e.read()[:120].decode('utf-8','replace')}"
                _log.warning(f"[PHOTO_ASSESS] {model_id} {last_err}")
            except Exception as e:
                last_err = str(e)
                _log.warning(f"[PHOTO_ASSESS] {model_id} 錯誤: {e}")
        return jsonify({"status": "error", "message": f"視覺模型均失敗：{last_err}"}), 503
    except Exception as e:
        _log.error(f"[PHOTO_ASSESS] 未預期錯誤: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500


@nlp_rag.route("/ai-check", methods=["GET"])
def ai_check():
    """快速診斷端點：只測試平台目前啟用的 OpenCode Go。"""
    import os, urllib.request, urllib.error, json as _json, logging
    _log = logging.getLogger(__name__)
    results = {}

    go_key = _opencode_go_key()
    go_model = os.environ.get("OPENCODE_GO_MODEL", "minimax-m3").strip() or "minimax-m3"
    if go_key:
        try:
            payload = _json.dumps({
                "model": go_model,
                "messages": [{"role": "user", "content": "請只回答：OK"}],
                "max_tokens": 20,
            }).encode("utf-8")
            req = urllib.request.Request(
                GO_ENDPOINT, data=payload,
                headers={
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {go_key}",
                    "User-Agent": _BROWSER_UA,
                }, method="POST")
            with urllib.request.urlopen(req, timeout=20) as r:
                response = _json.loads(r.read().decode("utf-8"))
            results["opencode_go"] = f"✓ OK ({response.get('model') or go_model})"
        except urllib.error.HTTPError as e:
            results["opencode_go"] = f"✗ HTTP {e.code}: {e.read()[:160].decode('utf-8','replace')}"
        except Exception as e:
            results["opencode_go"] = f"✗ {type(e).__name__}: {e}"
    else:
        results["opencode_go"] = "✗ key not set（請在 Render 設定 OPENCODE_GO_API_KEY）"

    # Ollama（Render 通常未部署；本機服務可作為穩定備援）
    try:
        ollama_base = (
            getattr(rag_backend, "OLLAMA_BASE_URL", "http://localhost:11434")
            if rag_backend else "http://localhost:11434"
        ).rstrip("/")
        with urllib.request.urlopen(f"{ollama_base}/api/tags", timeout=3) as r:
            ollama_payload = _json.loads(r.read().decode("utf-8"))
        available_models = [str(item.get("name", "")) for item in ollama_payload.get("models", [])]
        configured_ollama = os.environ.get("OLLAMA_SMART_MODEL", "qwen2.5:7b")
        if configured_ollama in available_models:
            results["ollama"] = f"✓ OK ({configured_ollama})"
        else:
            results["ollama"] = f"✗ model not found ({configured_ollama})"
    except Exception as e:
        results["ollama"] = f"✗ unavailable: {type(e).__name__}"
    results["local_kb"] = "✓ ready"

    _log.info(f"[AI_CHECK] {results}")
    return jsonify({"status": "ok", "providers": results, "timestamp": _now()})


def register_nlp_rag_blueprint(app: Any) -> None:
    app.register_blueprint(nlp_rag)
