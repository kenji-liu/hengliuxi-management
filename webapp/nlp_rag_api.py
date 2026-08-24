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
    """Offline fallback retrieval when embedding model is not available locally."""
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
    for raw_score, doc in scored[:top_k]:
        normalized = min(0.88, max(0.2, raw_score / max(max_score, 1.0)))
        try:
            results.append(rag_backend.sanitize_doc_for_output(doc, normalized))
        except Exception:
            copied = dict(doc)
            copied["score"] = normalized
            copied["preview"] = _as_text(doc.get("text"))[:220]
            results.append(copied)
    return results


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

def _web_search_ddg(query: str, max_results: int = 6) -> List[Dict[str, Any]]:
    """DuckDuckGo 免費搜尋（不需 API Key）。"""
    try:
        from duckduckgo_search import DDGS
        with DDGS() as ddgs:
            return list(ddgs.text(
                query,
                max_results=max_results,
                region="tw-zh",
                safesearch="moderate",
            ))
    except ImportError:
        return []          # duckduckgo-search 未安裝時靜默降級
    except Exception as exc:
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
    if page_text:
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


_SYSTEM_PROMPT = """你是「橫流溪工程設施維護與生態資料管理 AI 專家」，具備水利工程、水土保持、
砂防設施維護、溪流生態保育、魚道連通性與長期監測資料分析能力。請使用繁體中文直接回答。

答詢規則：
1. 強制以「瀏覽器目前平台資料庫即時快照」、「線上平台即時讀取資料」及「最新巡查與維護管理資料」為第一順位；同一設施資料衝突時，以日期最新且已完成的專業巡查或維護紀錄為準，再以本機 RAG、雲端 OCR 文件補充。不得以舊表單或模型常識覆蓋最新平台狀態。
1a. 若最新平台快照標示某設施為正常、A級、U1或已改善完成，且其日期晚於原異常紀錄，較舊的待處理、U3/U4紀錄才能標示為歷史履歷。同日或更新且未結案的功能異常不得被結構 A 級自動覆蓋。回答的結論、數量、表格與建議必須與最新快照一致。
2. 同時從工程設施、水文棲地、生態指標與調查方法審視問題；跨年份比較須考量樣點、季節、站訪次、調查方法與努力量是否一致。
3. 資料中的日期、設施名稱、樁號、DER&U、尾數、CPUE、面積、照片數、金額與維護狀態必須精確引用，不得自行補值或修改原始數據。
4. 異常年度不得直接歸因。僅在資料有施工、水文或調查方法證據時才可定性；否則列出可能假說並明確寫出待補資料。
5. 嚴格區分「資料直接支持的事實」、「依資料形成的判讀」與「仍需查證的假說」。資料衝突時列出差異，不可挑選較有利的數值。
6. 只依據本次提供的 RAG 參考資料作答。參考資料沒有支持時，明確回答「目前資料庫中沒有足夠資料可以確認。」；不得使用模型記憶補造巡查、工程、維護、日期、設施或數值。
7. 回答開頭先直接回答問題，再視需要補充工程或生態判讀。若資料互相矛盾，列出日期、來源與差異，不得自行挑選有利數值。
8. 不使用客套開場，不輸出思考過程，不宣稱模型正在訓練，不把 RAG 即時推論描述為模型學習或微調。回答務求精簡、清楚，讓一般管理人員也能理解。"""


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
    ctx_block = f"\n【參考資料】\n{combined_ctx}\n" if combined_ctx.strip() else ""
    return (
        f"{ctx_block}"
        f"【使用者問題】\n{query}\n\n"
        "請以繁體中文提出可直接用於管理決策的精簡回答，依問題需要使用下列結構：\n"
        "【回答】先用 1～3 句直接回答。\n"
        "【補充說明】只寫參考資料能支持的量化依據與工程、生態判讀；涉及兩個以上年度或方案時可使用 Markdown 表格。\n"
        "【資料限制】僅在有缺漏、口徑差異或衝突時列出。\n"
        "不可把資料已記載完成的調查或驗證寫成尚未執行。\n"
        "只輸出給使用者閱讀的繁體中文正式答案；禁止輸出英文分析、思考過程、工作計畫、提示詞或『The user is asking』等內部推理文字。"
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


def _ai_synthesis_mode(query: str, combined_ctx: str, config: Dict[str, Any]) -> Dict[str, Any]:
    """Use the selected OpenRouter mode and its configured model fallback.

    The legacy provider chain is opt-in only.  OpenRouter already performs the
    primary/fallback routing, so retrying unavailable Groq/Gemini/Claude/Ollama
    services would only increase latency and show confusing provider states.
    """
    started = time.perf_counter()
    result = _call_openrouter_mode(query, combined_ctx, config)
    if result.get("answer"):
        return result

    primary_error = _as_text(result.get("error_type"))
    _provider_mark("openrouter", ok=False)
    legacy_enabled = str(os.environ.get(
        "AI_ENABLE_LEGACY_PROVIDER_FALLBACK", "false"
    )).strip().lower() in {"1", "true", "yes", "on"}
    if not legacy_enabled:
        result["response_time"] = round(time.perf_counter() - started, 3)
        result["error_type"] = primary_error
        return result

    legacy_answer, provider_key, provider_display = _ai_synthesis(query, combined_ctx)
    elapsed = round(time.perf_counter() - started, 3)
    if legacy_answer:
        return {
            "answer": legacy_answer,
            "provider": provider_key,
            "actual_model": provider_display,
            "display_name": provider_display,
            "input_tokens": 0,
            "output_tokens": 0,
            "estimated_cost": 0.0,
            "response_time": elapsed,
            "fallback_used": True,
            "error_type": primary_error,
        }
    result["response_time"] = elapsed
    return result


@nlp_rag.route("/ai/model-config", methods=["GET"])
def ai_model_config_public() -> Any:
    return jsonify({
        "status": "success",
        "default_mode": "pro",
        "modes": public_modes(),
        "openrouter_ready": bool(os.environ.get("OPENROUTER_API_KEY")),
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

    lines = [
        "依目前最新同步的巡查資料與維護管理資料判讀：",
        (
            f"1. 資料量化：巡查紀錄 {counts.get('inspection_records', 0)} 筆"
            f"（最新日期 {counts.get('latest_inspection') or '未標示'}），"
            f"維護/搶修工程 {counts.get('maintenance_projects', 0)} 件，"
            f"施工日誌 {counts.get('maintenance_reports', 0)} 份，"
            f"照片 {counts.get('maintenance_photos', 0)} 張。"
        ),
    ]

    if inspections:
        lines.append("2. 最新巡查重點：")
        for item in inspections:
            lines.append(
                f"- {item.get('date', '')}｜{item.get('title', '')}｜"
                f"{item.get('form_type', '巡查')}｜狀態 {item.get('status', '未標示')}｜"
                f"優先度 {item.get('priority', '未標示')}｜{item.get('summary', '')}"
            )

    if maint:
        lines.append("3. 維護管理重點：")
        for item in maint:
            amount = f"｜金額 {item.get('amount')}" if item.get("amount") else ""
            lines.append(
                f"- {item.get('date', '')}｜{item.get('title', '')}{amount}｜"
                f"{item.get('summary', '')}"
            )

    lines.append(
        "4. 管理建議：優先追蹤狀態為待處理、處理中或緊急者，並以最新專業巡查或魚道檢核表作為設施狀態評估依據；"
        "已完成案件則納入後續定期巡查與照片比對。"
    )
    return "\n".join(lines)


@nlp_rag.route("/smart-ask", methods=["POST"])
def smart_ask() -> Any:
    """
    智慧問答端點：
      1. DuckDuckGo 網路搜尋（免費，繁中優先）
      2. 本機 RAG 補充橫流溪專屬資料
      3. Drive OCR 全文索引補充（歷年報告、掃描表單）
      4. AI 綜合推論 → 流暢繁中回答
    """
    request_started = time.perf_counter()
    data    = request.get_json() or {}
    query   = _as_text(data.get("query") or data.get("question"))
    mode_config = resolve_mode(_as_text(data.get("ai_mode")) or "pro", query)
    top_k = int(mode_config.get("top_k") or 4)
    use_web_raw = data.get("use_web", "auto")
    if isinstance(use_web_raw, bool):
        use_web = use_web_raw
    else:
        use_web_text = str(use_web_raw).strip().lower()
        if use_web_text == "auto":
            use_web = bool(re.search(r"網路|外部|最新法規|新聞|天氣|颱風|氣象|公開資料", query))
        else:
            use_web = use_web_text not in ("0", "false", "no", "off")
    include_cloud_ocr = str(data.get("include_cloud_ocr", "true")).lower() not in ("0", "false", "no")
    platform_url = _as_text(data.get("platform_url") or data.get("source_url")) or DEFAULT_PLATFORM_URL
    include_platform_url = str(data.get("include_platform_url", "true")).lower() not in ("0", "false", "no")
    client_platform_ctx = _as_text(data.get("client_platform_context"))[:24000]

    if not query:
        return jsonify({"status": "error", "message": "缺少 query"}), 400

    # ── 1~5. 五路資料來源並行擷取 ─────────────────────────────
    # 這五步彼此獨立，過去循序執行會把各自的網路等待時間相加；
    # 併行後總耗時降為最慢的一路。
    def _task_platform() -> Dict[str, Any]:
        if not include_platform_url:
            return {}
        return _fetch_platform_url_context(query, platform_url)

    def _task_web() -> List[Dict[str, Any]]:
        return _web_search_ddg(query, max_results=6) if use_web else []

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
        return management_context.build_management_context(query, limit=top_k) or {}

    results = _run_parallel({
        "platform":   _task_platform,
        "web":        _task_web,
        "local":      _task_local,
        "ocr":        _task_ocr,
        "management": _task_management,
    })

    # 1. 線上平台 URL 即時資料
    platform_payload: Dict[str, Any] = results.get("platform") or {}
    platform_ctx = _as_text(platform_payload.get("context"))
    platform_evidence: List[Dict[str, Any]] = list(platform_payload.get("evidence") or [])

    # 2. 網路搜尋
    web_results: List[Dict[str, Any]] = results.get("web") or []
    web_ctx = _format_web_results(web_results) if web_results else ""

    # 3. 本機 RAG 補充
    local_candidates: List[Dict[str, Any]] = results.get("local") or []
    local_docs: List[Dict[str, Any]] = []
    local_seen = set()
    for item in local_candidates:
        source_name = os.path.basename(_as_text(item.get("source_file") or item.get("source"))).lower()
        content = _as_text(item.get("full_text") or item.get("preview") or item.get("text"))
        dedupe_key = (source_name, re.sub(r"\s+", "", content[:320]).lower())
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

    # 4. Drive OCR 全文搜尋
    ocr_payload: Dict[str, Any] = results.get("ocr") or {}
    ocr_status_data: Dict[str, Any] = dict(ocr_payload.get("status") or {})
    ocr_index_started = bool(ocr_payload.get("started"))
    ocr_citations: List[Dict[str, Any]] = []
    ocr_parts: List[str] = []
    for h in (ocr_payload.get("hits") or []):
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

    # 5. 最新巡查與維護管理資料
    mgmt: Dict[str, Any] = results.get("management") or {}
    management_ctx = _as_text(mgmt.get("context"))
    management_evidence: List[Dict[str, Any]] = list(mgmt.get("evidence") or [])
    management_counts: Dict[str, Any] = dict(mgmt.get("counts") or {})

    # ── 6. 組合 context ───────────────────────────────────────
    combined_ctx_parts = []
    if client_platform_ctx.strip():
        combined_ctx_parts.append(
            "【瀏覽器目前平台資料庫即時快照（最高優先）】\n"
            + client_platform_ctx[:6500]
        )
    if platform_ctx.strip():
        combined_ctx_parts.append(f"【線上平台即時讀取資料】\n{platform_ctx[:3500]}")
    if management_ctx.strip():
        combined_ctx_parts.append(f"【最新巡查與維護管理資料】\n{management_ctx[:3500]}")
    if local_ctx.strip():
        combined_ctx_parts.append(f"【橫流溪本機 RAG 資料】\n{local_ctx}")
    if ocr_ctx.strip():
        combined_ctx_parts.append(f"【橫流溪雲端文件庫（OCR 全文）】\n{ocr_ctx}")
    if web_ctx.strip():
        combined_ctx_parts.append(f"【外部網路補充資料（不得覆蓋橫流溪原始紀錄）】\n{web_ctx}")
    combined_ctx = "\n\n".join(combined_ctx_parts)

    # ── 7. 指定模式推論；所有模式共用上方同一批 RAG 結果 ─────────
    evidence_count = (
        len(local_evidence) + len(ocr_citations) + len(management_evidence)
        + len(platform_evidence) + len(web_results)
    )
    if client_platform_ctx.strip():
        evidence_count += 1
    if not combined_ctx.strip() or evidence_count == 0:
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
    provider_key = _as_text(ai_result.get("provider")) or "none"
    provider_display = _as_text(ai_result.get("display_name") or ai_result.get("actual_model"))

    # 魚道緊急狀態屬於可由平台即時數據決定的事實，不讓模型改寫成相反結論。
    if client_platform_ctx and re.search(r"魚道", query) and re.search(r"緊急|優先|處理|維護|異常|狀態", query):
        summary_match = re.search(
            r"魚道設施共\s*(\d+)\s*座[^。\n]*?正常\s*(\d+)\s*座[^。\n]*?需維護\s*(\d+)\s*座[^。\n]*?損壞\s*(\d+)\s*座",
            client_platform_ctx,
        )
        summary_mode = "facility"
        if not summary_match:
            summary_match = re.search(
                r"共\s*(\d+)\s*座魚道[^。\n]*?正常\s*(\d+)\s*座[^。\n]*?"
                r"(?:需追蹤|需維護)\s*(\d+)\s*座[^。\n]*?(?:緊急|損壞)\s*(\d+)\s*座",
                client_platform_ctx,
            )
            summary_mode = "checklist"
        if summary_match:
            total, normal, maintenance, damaged = map(int, summary_match.groups())
            u4_names = []
            for match in re.finditer(
                r"([溪溝構\w\-]+(?:\s*[^\n。；]{0,20}?魚道)?)"
                r"[^。\n；]{0,35}?(?:D4/E4/R4・U4|U4)[^。\n；]{0,20}",
                client_platform_ctx,
            ):
                name = re.sub(r"^[【（(\s]+|[】）)\s]+$", "", match.group(1)).strip(" ：:")
                if name and name not in u4_names:
                    u4_names.append(name)
            for match in re.finditer(r"★緊急【([^】\n]{2,40})】", client_platform_ctx):
                name = match.group(1).strip()
                if name and name not in u4_names:
                    u4_names.append(name)
            followups = []
            for match in re.finditer(
                r"([溪溝構\w\-]+(?:\s*[^\n。；]{0,20}?魚道)?)"
                r"[^。\n；]{0,35}?(D\d/E\d/R\d・U[23])",
                client_platform_ctx,
            ):
                item = f"{match.group(1).strip(' ：:')}（{match.group(2)}）"
                if item not in followups:
                    followups.append(item)
            urgent_sentence = (
                f"需緊急處理的設施為{'、'.join(u4_names)}，其最新狀態為 U4 且尚未結案。"
                if u4_names else
                (f"目前有 {damaged} 座魚道標示為損壞，應優先進行現場複核與處置。" if damaged else "目前無 U4 或損壞魚道。")
            )
            followup_sentence = f"另有 {maintenance} 座需維護" + (f"：{'、'.join(followups[:4])}。" if followups else "，應持續追蹤。")
            answer = (
                f"依目前網頁平台的即時資料，魚道設施共 {total} 座："
                f"正常 {normal} 座、需維護 {maintenance} 座、損壞 {damaged} 座。"
                f"{urgent_sentence}{followup_sentence}"
                "以上為目前頁面最新表徵；較舊紀錄僅作履歷比對，不得覆蓋尚未結案的最新異常。"
            )
            provider_key = provider_key or "platform_guard"
            provider_display = f"{provider_display or '平台資料'}＋即時狀態一致性檢核"

    # ── 7a. AI 失敗時優先使用結構化巡查／維護資料，避免操作指南或
    #         舊版說明文件蓋過最新設施狀態。─────────────────────
    if not answer and management_ctx.strip():
        answer = _management_fallback_answer(query, management_evidence, management_counts)
        provider_key, provider_display = "management_context", "最新巡查與維護資料保底回答"

    # ── 7b. 結構化管理資料也無法回答時，才直接呈現文件 RAG 片段。──
    if not answer and local_ctx.strip():
        answer = f"根據橫流溪本機知識庫檢索結果：\n\n{local_ctx}\n\n（AI 推論服務目前無法使用，以上為直接檢索結果，建議對照原始文件確認詳細內容。）"
        provider_key, provider_display = "local_kb", "本機知識庫"

    if not answer:
        answer = _fallback_answer(parse_query(query), []) or (
            "目前所有 AI 服務皆無回應。\n"
            "請設定至少一組 API Key（GROQ_API_KEY / GOOGLE_API_KEY / ANTHROPIC_API_KEY）"
            "或確認 Ollama 是否執行中（ollama serve）。"
        )
        provider_key, provider_display = "none", "無可用 AI"

    web_sources_out = [
        {"title": r.get("title", ""), "href": r.get("href", ""), "body": _as_text(r.get("body"))[:120]}
        for r in web_results[:4]
    ]

    platform_part = "線上平台資料＋ " if (platform_ctx or client_platform_ctx) else ""
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
    if not structured_citations and client_platform_ctx.strip():
        structured_citations.append({
            "source_file": "橫流溪管理平台即時資料庫",
            "page": 1,
            "preview": client_platform_ctx[:220],
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

    return jsonify({
        "status":           "success",
        "answer":           answer,
        "llm_provider":     provider_key,
        "llm_model":        provider_display,
        "web_search_used":  bool(web_results),
        "web_sources":      web_sources_out,
        "platform_url":      platform_url,
        "platform_context_used": bool(platform_ctx or client_platform_ctx),
        "client_platform_context_used": bool(client_platform_ctx),
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
        "confidence_level": "high" if structured_citations and answer else ("low" if answer else "none"),
        "confidence_score": 90 if structured_citations and answer else (45 if answer else 0),
        "policy_label":     "RAG 專業回答" if structured_citations else "資料不足提醒",
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
    """快速診斷端點：測試所有 AI 供應商是否可用。"""
    import os, urllib.request, urllib.error, json as _json, logging
    _log = logging.getLogger(__name__)
    results = {}

    # Groq
    groq_key = os.environ.get("GROQ_API_KEY", "")
    if groq_key:
        try:
            payload = _json.dumps({"model": "llama-3.3-70b-versatile",
                "messages": [{"role": "user", "content": "hi"}],
                "max_tokens": 5}).encode()
            req = urllib.request.Request(
                "https://api.groq.com/openai/v1/chat/completions", data=payload,
                headers={"Content-Type": "application/json", "Authorization": f"Bearer {groq_key}"}, method="POST")
            with urllib.request.urlopen(req, timeout=10) as r:
                r.read()
            results["groq"] = "✓ OK"
        except urllib.error.HTTPError as e:
            results["groq"] = f"✗ HTTP {e.code}: {e.read()[:100].decode('utf-8','replace')}"
        except Exception as e:
            results["groq"] = f"✗ {type(e).__name__}: {e}"
    else:
        results["groq"] = "✗ key not set"

    # Gemini
    gemini_key = os.environ.get("GOOGLE_API_KEY", "")
    if gemini_key:
        try:
            payload = _json.dumps({"contents": [{"parts": [{"text": "hi"}]}],
                "generationConfig": {"maxOutputTokens": 5}}).encode()
            last_error = "no usable model"
            for model, api_version in _resolve_gemini_candidates(gemini_key):
                url = f"https://generativelanguage.googleapis.com/{api_version}/models/{model}:generateContent?key={gemini_key}"
                req = urllib.request.Request(url, data=payload,
                    headers={"Content-Type": "application/json"}, method="POST")
                try:
                    with urllib.request.urlopen(req, timeout=10) as r:
                        r.read()
                    results["gemini"] = f"✓ OK ({model})"
                    break
                except urllib.error.HTTPError as e:
                    body = e.read()[:200].decode("utf-8", "replace")
                    last_error = f"HTTP {e.code}: {body}"
                    # 429/403 are account-level restrictions; trying more models will not help.
                    if e.code in (403, 429):
                        break
            else:
                results["gemini"] = f"✗ {last_error}"
            if "gemini" not in results:
                results["gemini"] = f"✗ {last_error}"
        except Exception as e:
            results["gemini"] = f"✗ {type(e).__name__}: {e}"
    else:
        results["gemini"] = "✗ key not set"

    # Claude / Anthropic
    claude_key = (os.environ.get("ANTHROPIC_API_KEY") or os.environ.get("CLAUDE_API_KEY") or "").strip()
    if claude_key:
        try:
            model = _resolve_claude_model(claude_key)
            if not model:
                raise RuntimeError("no available model returned by Anthropic")
            payload = _json.dumps({
                "model": model,
                "max_tokens": 5,
                "messages": [{"role": "user", "content": "Reply OK"}],
            }).encode("utf-8")
            req = urllib.request.Request(
                "https://api.anthropic.com/v1/messages", data=payload,
                headers={
                    "Content-Type": "application/json",
                    "x-api-key": claude_key,
                    "anthropic-version": "2023-06-01",
                }, method="POST")
            with urllib.request.urlopen(req, timeout=15) as r:
                r.read()
            results["claude"] = f"✓ OK ({model})"
        except urllib.error.HTTPError as e:
            results["claude"] = f"✗ HTTP {e.code}: {e.read()[:160].decode('utf-8','replace')}"
        except Exception as e:
            results["claude"] = f"✗ {type(e).__name__}: {e}"
    else:
        results["claude"] = "✗ key not set"

    # OpenRouter — 實際呼叫測試
    or_key = os.environ.get("OPENROUTER_API_KEY", "")
    if or_key:
        try:
            or_payload = _json.dumps({
                "model": os.environ.get("OPENROUTER_MODEL", "").strip() or "openrouter/free",
                "messages": [{"role": "user", "content": "hi"}],
                "max_tokens": 5,
            }).encode()
            or_req = urllib.request.Request(
                "https://openrouter.ai/api/v1/chat/completions", data=or_payload,
                headers={
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {or_key}",
                    "HTTP-Referer": "https://hengliuxi-management.onrender.com",
                    "X-Title": "Hengliu Creek Management Platform",
                }, method="POST")
            with urllib.request.urlopen(or_req, timeout=15) as r:
                r.read()
            results["openrouter"] = "✓ OK (free router)"
        except urllib.error.HTTPError as e:
            results["openrouter"] = f"✗ HTTP {e.code}: {e.read()[:150].decode('utf-8','replace')}"
        except Exception as e:
            results["openrouter"] = f"✗ {type(e).__name__}: {e}"
    else:
        results["openrouter"] = "✗ key not set"

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
