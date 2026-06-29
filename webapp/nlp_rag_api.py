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
import os
import re
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
""".strip()


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
        partial = sum(1 for term in query_terms if len(term) >= 2 and any(term[:2].lower() in h for h in haystack.split()))
        score = exact * 1.0 + partial * 0.15
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


def _fetch_platform_url_context(query: str, platform_url: str = "") -> Dict[str, Any]:
    """Read the public platform URL and same-origin management API for grounding."""
    url = _as_text(platform_url) or DEFAULT_PLATFORM_URL
    parsed = urllib.parse.urlparse(url)
    if parsed.scheme not in ("http", "https") or not parsed.netloc:
        return {"context": "", "evidence": [], "url": url}

    origin = f"{parsed.scheme}://{parsed.netloc}"
    evidence: List[Dict[str, Any]] = []
    parts: List[str] = []

    page_text = _fetch_url_text(url)
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


_SYSTEM_PROMPT = (
    "你是一位流利使用繁體中文的專業助理，擅長工程維護、生態保育與一般知識問答。"
    "回答時必須優先使用線上平台目前資料、最新巡查資料、維護管理資料、本機知識庫與雲端 OCR 文件。"
    "若資料內有日期、DER&U、維護工項、照片數、金額或數量，請直接量化回答。"
    "回答清晰自然、適當分段，不使用 Markdown 標題符號（#、##）。"
)

def _build_user_msg(query: str, combined_ctx: str) -> str:
    ctx_block = f"\n【參考資料】\n{combined_ctx}\n" if combined_ctx.strip() else ""
    return (
        f"{ctx_block}"
        f"【使用者問題】\n{query}\n\n"
        "請以繁體中文回答（200～500字，資料充分時可適當延伸）："
    )


# ── 各免費 AI 服務呼叫函式 ────────────────────────────────────────

def _call_groq(query: str, ctx: str) -> "tuple[str, str]":
    """Groq 免費 API — llama-3.3-70b-versatile（14,400 req/day，無需信用卡）。
    取得 Key：https://console.groq.com  →  API Keys
    設定：set GROQ_API_KEY=gsk_xxxxxxxx
    """
    import os, urllib.request, json as _json
    key = os.environ.get("GROQ_API_KEY", "")
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
    except Exception:
        return "", ""


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
        "generationConfig": {"temperature": 0.4, "maxOutputTokens": 1024},
    }).encode("utf-8")

    # 依序嘗試：2.0-flash → 2.5-flash-preview → 1.5-flash
    for model in ["gemini-2.0-flash", "gemini-2.5-flash-preview-05-20", "gemini-1.5-flash"]:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={key}"
        req = urllib.request.Request(url, data=payload, headers={"Content-Type": "application/json"}, method="POST")
        try:
            with urllib.request.urlopen(req, timeout=30) as r:
                res = _json.loads(r.read().decode())
            text = res["candidates"][0]["content"]["parts"][0]["text"].strip()
            _log.info(f"[GEMINI] ✓ 使用 {model}")
            return text, f"{model} (Google)"
        except urllib.error.HTTPError as e:
            body = e.read().decode("utf-8", errors="ignore")
            _log.warning(f"[GEMINI] {model} HTTP {e.code}: {body[:200]}")
        except Exception as e:
            _log.warning(f"[GEMINI] {model} 錯誤: {e}")

    return "", ""


def _call_openrouter(query: str, ctx: str) -> "tuple[str, str]":
    """OpenRouter 免費模型 — llama-3.1-8b-instruct:free（需先建立帳號）。
    取得 Key：https://openrouter.ai  →  Keys
    設定：set OPENROUTER_API_KEY=sk-or-xxxxxxxx
    """
    import os, urllib.request, json as _json
    key = os.environ.get("OPENROUTER_API_KEY", "")
    if not key:
        return "", ""
    payload = _json.dumps({
        "model": "meta-llama/llama-3.1-8b-instruct:free",
        "messages": [
            {"role": "system", "content": _SYSTEM_PROMPT},
            {"role": "user",   "content": _build_user_msg(query, ctx)},
        ],
        "temperature": 0.4,
        "max_tokens": 900,
    }).encode("utf-8")
    req = urllib.request.Request(
        "https://openrouter.ai/api/v1/chat/completions",
        data=payload,
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {key}",
            "HTTP-Referer": "http://localhost:5000",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            res = _json.loads(r.read().decode())
        return res["choices"][0]["message"]["content"].strip(), "llama-3.1-8b (OpenRouter)"
    except Exception:
        return "", ""


def _call_ollama_synthesis(query: str, combined_ctx: str) -> str:
    """Ollama 本機推論（qwen2.5:14b）— 最後一道防線。"""
    import os, urllib.request, json as _json
    if rag_backend is None:
        return ""
    ollama_url = f"{getattr(rag_backend, 'OLLAMA_BASE_URL', 'http://localhost:11434').rstrip('/')}/api/chat"
    model   = getattr(rag_backend, "OLLAMA_MODEL", "qwen2.5:14b")
    timeout = min(float(os.environ.get("OLLAMA_SMART_TIMEOUT", "5")), float(getattr(rag_backend, "OLLAMA_TIMEOUT", 240)))
    payload = _json.dumps({
        "model": model,
        "messages": [
            {"role": "system", "content": _SYSTEM_PROMPT},
            {"role": "user",   "content": _build_user_msg(query, combined_ctx)},
        ],
        "stream": False,
        "options": {"temperature": 0.4, "num_ctx": 4096},
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
        return ""


def _ai_synthesis(query: str, combined_ctx: str) -> "tuple[str, str, str]":
    """自動選用可用的免費 AI 服務，依序嘗試：
    Groq → Gemini → OpenRouter → Ollama（本機）
    回傳 (answer, provider_key, display_name)
    """
    import os, logging
    _log = logging.getLogger(__name__)

    # 列出目前環境變數狀態（啟動時一次）
    key_status = {
        "GROQ":        bool(os.environ.get("GROQ_API_KEY")),
        "GOOGLE":      bool(os.environ.get("GOOGLE_API_KEY")),
        "OPENROUTER":  bool(os.environ.get("OPENROUTER_API_KEY")),
    }
    _log.info(f"[AI_SYNTHESIS] Key status: {key_status}")

    for fn, provider_key in [
        (_call_groq,       "groq"),
        (_call_gemini,     "gemini"),
        (_call_openrouter, "openrouter"),
    ]:
        text, display = fn(query, combined_ctx)
        if text:
            _log.info(f"[AI_SYNTHESIS] ✓ 使用 {display}")
            return text, provider_key, display
        else:
            _log.info(f"[AI_SYNTHESIS] ✗ {provider_key} 未回應（Key 未設或呼叫失敗）")

    # 本機 Ollama fallback
    _log.info("[AI_SYNTHESIS] 嘗試 Ollama 本機...")
    text = _call_ollama_synthesis(query, combined_ctx)
    if text:
        model = getattr(rag_backend, "OLLAMA_MODEL", "qwen2.5:14b") if rag_backend else "qwen2.5:14b"
        _log.info(f"[AI_SYNTHESIS] ✓ 使用 Ollama ({model})")
        return text, "ollama", f"{model} (Ollama 本機)"

    _log.warning("[AI_SYNTHESIS] ✗ 所有 AI 服務皆無回應，使用本機知識庫 fallback")
    return "", "none", ""


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
    data    = request.get_json() or {}
    query   = _as_text(data.get("query") or data.get("question"))
    use_web = bool(data.get("use_web", True))
    include_cloud_ocr = str(data.get("include_cloud_ocr", "true")).lower() not in ("0", "false", "no")
    platform_url = _as_text(data.get("platform_url") or data.get("source_url")) or DEFAULT_PLATFORM_URL
    include_platform_url = str(data.get("include_platform_url", "true")).lower() not in ("0", "false", "no")

    if not query:
        return jsonify({"status": "error", "message": "缺少 query"}), 400

    # ── 1. 線上平台 URL 即時資料 ─────────────────────────────
    platform_ctx = ""
    platform_evidence: List[Dict[str, Any]] = []
    platform_payload: Dict[str, Any] = {}
    if include_platform_url:
        platform_payload = _fetch_platform_url_context(query, platform_url)
        platform_ctx = _as_text(platform_payload.get("context"))
        platform_evidence = list(platform_payload.get("evidence") or [])

    # ── 2. 網路搜尋 ──────────────────────────────────────────
    web_results: List[Dict[str, Any]] = []
    web_ctx     = ""
    if use_web:
        web_results = _web_search_ddg(query, max_results=6)
        web_ctx     = _format_web_results(web_results)

    # ── 3. 本機 RAG 補充 ──────────────────────────────────────
    local_ctx = ""
    local_evidence: List[Dict[str, Any]] = []
    if rag_backend is not None:
        try:
            local_docs = _local_keyword_retrieve(query, top_k=5)
            local_evidence = [_doc_to_evidence(d) for d in local_docs[:4]]
            if local_docs:
                local_ctx = "\n".join(
                    _as_text(d.get("preview") or d.get("text"))[:200]
                    for d in local_docs[:4]
                )
        except Exception:
            pass

    # ── 4. Drive OCR 全文搜尋 ────────────────────────────────
    ocr_ctx      = ""
    ocr_citations: List[Dict[str, Any]] = []
    ocr_status_data: Dict[str, Any] = {}
    ocr_index_started = False
    ocr_svc = _get_ocr_svc()
    if include_cloud_ocr and ocr_svc is not None:
        try:
            ocr_status_data = dict(ocr_svc.get_status() or {})
            if (
                int(ocr_status_data.get("total_docs") or 0) == 0
                and not bool(ocr_status_data.get("running"))
            ):
                folder_id = _OCR_FOLDER_ID
                folder_url = _as_text(data.get("folder_url") or data.get("drive_folder_url"))
                if folder_url:
                    m = re.search(r"/folders/([A-Za-z0-9_-]+)", folder_url)
                    if m:
                        folder_id = m.group(1)
                ocr_index_started = bool(ocr_svc.start_indexing(folder_id))
                ocr_status_data = dict(ocr_svc.get_status() or {})

            ocr_hits = ocr_svc.search(query, top_k=3)
            if ocr_hits:
                ocr_parts = []
                for h in ocr_hits:
                    snippet = _as_text(h.get("chunk"))[:300]
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
        except Exception:
            pass

    # ── 5. 最新巡查與維護管理資料 ──────────────────────────
    management_ctx = ""
    management_evidence: List[Dict[str, Any]] = []
    management_counts: Dict[str, Any] = {}
    if management_context is not None:
        try:
            mgmt = management_context.build_management_context(query, limit=6)
            management_ctx = _as_text(mgmt.get("context"))
            management_evidence = list(mgmt.get("evidence") or [])
            management_counts = dict(mgmt.get("counts") or {})
        except Exception:
            pass

    # ── 6. 組合 context ───────────────────────────────────────
    combined_ctx_parts = []
    if platform_ctx.strip():
        combined_ctx_parts.append(f"【線上平台即時讀取資料】\n{platform_ctx}")
    if management_ctx.strip():
        combined_ctx_parts.append(f"【最新巡查與維護管理資料】\n{management_ctx}")
    if web_ctx.strip():
        combined_ctx_parts.append(f"【網路搜尋結果（DuckDuckGo）】\n{web_ctx}")
    if local_ctx.strip():
        combined_ctx_parts.append(f"【橫流溪本機 RAG 資料】\n{local_ctx}")
    if ocr_ctx.strip():
        combined_ctx_parts.append(f"【橫流溪雲端文件庫（OCR 全文）】\n{ocr_ctx}")
    combined_ctx = "\n\n".join(combined_ctx_parts)

    # ── 7. AI 綜合推論（自動選用可用的免費服務）─────────────────
    answer, provider_key, provider_display = _ai_synthesis(query, combined_ctx)

    if not answer and management_ctx.strip():
        answer = _management_fallback_answer(query, management_evidence, management_counts)
        provider_key, provider_display = "management_context", "最新巡查與維護資料保底回答"

    if not answer:
        answer = _fallback_answer(parse_query(query), []) or (
            "目前所有 AI 服務皆無回應。\n"
            "請設定至少一組免費 API Key（GROQ_API_KEY / GOOGLE_API_KEY）"
            "或確認 Ollama 是否執行中（ollama serve）。"
        )
        provider_key, provider_display = "none", "無可用 AI"

    web_sources_out = [
        {"title": r.get("title", ""), "href": r.get("href", ""), "body": _as_text(r.get("body"))[:120]}
        for r in web_results[:4]
    ]

    platform_part = "線上平台資料＋ " if platform_ctx else ""
    web_part  = f"網路搜尋（{len(web_results)} 筆）＋ " if web_results else ""
    ocr_part  = f"雲端文件 {len(ocr_citations)} 筆 ＋ " if ocr_citations else ""
    ai_part   = provider_display or "本機知識庫"
    ocr_running_part = "雲端OCR索引建立中 ＋ " if ocr_index_started or ocr_status_data.get("running") else ""
    msg       = f"{platform_part}{web_part}{ocr_part}{ocr_running_part}本機資料 ＋ {ai_part}"

    return jsonify({
        "status":           "success",
        "answer":           answer,
        "llm_provider":     provider_key,
        "llm_model":        provider_display,
        "web_search_used":  bool(web_results),
        "web_sources":      web_sources_out,
        "platform_url":      platform_url,
        "platform_context_used": bool(platform_ctx),
        "platform_evidence": platform_evidence,
        "local_evidence":   local_evidence,
        "ocr_citations":    ocr_citations,
        "ocr_status":       ocr_status_data,
        "ocr_index_started": ocr_index_started,
        "management_evidence": management_evidence,
        "management_counts": management_counts,
        "confidence_level": "high" if answer else "none",
        "confidence_score": 90 if answer else 0,
        "policy_label":     "AI 綜合回答",
        "message":          msg,
        "timestamp":        _now(),
    })


def register_nlp_rag_blueprint(app: Any) -> None:
    app.register_blueprint(nlp_rag)
