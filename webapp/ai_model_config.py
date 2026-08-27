"""Central AI model routing for the Hengliu Creek RAG assistant."""

from __future__ import annotations

import os
import re
from copy import deepcopy
from typing import Any, Dict


MODE_LABELS = {
    "fast": "快速省錢",
    "pro": "專業問答",
    "deep": "深度分析",
    "auto": "AI 自動選擇",
}


# OpenCode Go 目前確認可用的穩定模型。三種 UI 模式保留不同輸出限制，
# 但共用同一個 Go 模型，避免每次問答在多個已失效供應商之間重試。
_GO_MODEL = "minimax-m3"

_DEFAULTS: Dict[str, Dict[str, Any]] = {
    "fast": {
        "model": _GO_MODEL,
        "fallback_model": "",
        "go_model": _GO_MODEL,
        "temperature": 0.20,
        "max_tokens": 500,
        "top_k": 3,
        "timeout": 18,
    },
    "pro": {
        "model": _GO_MODEL,
        "fallback_model": "",
        "go_model": _GO_MODEL,
        "temperature": 0.20,
        "max_tokens": 800,
        "top_k": 4,
        "timeout": 28,
    },
    "deep": {
        "model": _GO_MODEL,
        "fallback_model": "",
        "go_model": _GO_MODEL,
        "temperature": 0.15,
        "max_tokens": 1500,
        "top_k": 5,
        "timeout": 45,
    },
}


def _env_number(name: str, default: float, cast=float):
    try:
        return cast(os.environ.get(name, default))
    except (TypeError, ValueError):
        return cast(default)


def get_model_config(mode: str) -> Dict[str, Any]:
    """Return one normalized mode config without exposing any API key."""
    normalized = str(mode or "pro").strip().lower()
    if normalized not in MODE_LABELS:
        normalized = "pro"
    if normalized == "auto":
        normalized = "pro"

    config = deepcopy(_DEFAULTS[normalized])
    prefix = normalized.upper()
    config.update({
        "mode": normalized,
        "label": MODE_LABELS[normalized],
        "model": os.environ.get(f"AI_MODEL_{prefix}", config["model"]).strip(),
        "fallback_model": os.environ.get(
            f"AI_MODEL_{prefix}_FALLBACK", config["fallback_model"]
        ).strip(),
        "temperature": _env_number(
            f"AI_TEMPERATURE_{prefix}", config["temperature"], float
        ),
        "max_tokens": _env_number(
            f"AI_MAX_TOKENS_{prefix}", config["max_tokens"], int
        ),
        "top_k": max(3, min(5, _env_number(f"AI_TOP_K_{prefix}", config["top_k"], int))),
        "timeout": max(8, _env_number(f"AI_TIMEOUT_{prefix}", config["timeout"], int)),
    })
    return config


def choose_auto_mode(query: str) -> str:
    """Deterministic, auditable routing before any model call."""
    text = str(query or "")
    deep_patterns = (
        r"幫我分析|綜合(?:分析|判斷)|原因分析|改善策略|工程建議|多時期|跨年度|"
        r"多資料|損壞機制|風險分析|比較.+(?:年度|時期|方案)|整合.+資料"
    )
    fast_patterns = (
        r"哪一天|何時|有幾座|幾筆|幾尾|在哪裡|哪一個|巡查日期|是否有紀錄|"
        r"基本資料|座標|樁號|設施名稱"
    )
    pro_patterns = r"原因|為什麼|是否需要改善|魚道|防砂壩|護岸|生態|維護|巡查結果|DER&U"

    if re.search(deep_patterns, text):
        return "deep"
    if re.search(fast_patterns, text) and not re.search(pro_patterns, text):
        return "fast"
    return "pro"


def resolve_mode(selected_mode: str, query: str) -> Dict[str, Any]:
    requested = str(selected_mode or "pro").strip().lower()
    if requested not in MODE_LABELS:
        requested = "pro"
    actual_mode = choose_auto_mode(query) if requested == "auto" else requested
    config = get_model_config(actual_mode)
    config["requested_mode"] = requested
    config["requested_label"] = MODE_LABELS[requested]
    config["auto_selected"] = requested == "auto"
    return config


def public_modes() -> list[Dict[str, str]]:
    return [{"value": key, "label": label} for key, label in MODE_LABELS.items()]
