#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""NLP + Hybrid RAG + Local AI API extension for the Hengliuxi platform.

This module adds structured endpoints required by
NLP_RAG_LocalAI_Codex_強化說明.md while reusing the existing rag_backend
retrieval, Ollama generation, and confidence policy.
"""

from __future__ import annotations

from datetime import datetime
import json
import os
import re
from typing import Any, Dict, List, Optional

from flask import Blueprint, jsonify, request

try:
    from webapp import rag_backend
except Exception:  # pragma: no cover - handled at runtime by status endpoint
    rag_backend = None


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


def register_nlp_rag_blueprint(app: Any) -> None:
    app.register_blueprint(nlp_rag)
