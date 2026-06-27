#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Latest inspection and maintenance context for AI answers.

This module keeps the RAG prompt grounded in the newest operational records:
- webapp/data/synced_inspections.json
- webapp/data/maintenance_contracts.json
- webapp/data/maintenance_photo_index.json

It is intentionally lightweight and read-only so both local Flask and Render can
use the same context without mutating user data.
"""
from __future__ import annotations

import json
import re
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional, Tuple

DATA_DIR = Path(__file__).parent / "data"
INSPECTIONS_FILE = DATA_DIR / "synced_inspections.json"
MAINTENANCE_CONTRACTS_FILE = DATA_DIR / "maintenance_contracts.json"
MAINTENANCE_PHOTO_INDEX_FILE = DATA_DIR / "maintenance_photo_index.json"


def _load_json(path: Path, default: Any) -> Any:
    try:
        if path.exists():
            with open(path, "r", encoding="utf-8") as f:
                return json.load(f)
    except Exception:
        return default
    return default


def _as_text(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, str):
        return value.strip()
    return str(value).strip()


def _looks_mojibake(text: str) -> bool:
    if not text:
        return False
    return ("Ã" in text or "å" in text or "æ" in text or "ç" in text) and not re.search(r"[\u4e00-\u9fff]", text)


def _fix_mojibake(text: str) -> str:
    if not isinstance(text, str) or not _looks_mojibake(text):
        return text
    for src in ("latin1", "cp1252"):
        try:
            fixed = text.encode(src, errors="ignore").decode("utf-8", errors="ignore")
            if sum(1 for ch in fixed if "\u4e00" <= ch <= "\u9fff") > 1:
                return fixed
        except Exception:
            pass
    return text


def _parse_date(value: Any) -> Tuple[str, datetime]:
    text = _as_text(value)
    if not text:
        return "", datetime.min
    normalized = text.replace("/", "-")
    if re.match(r"^\d{3}\.\d{1,2}\.\d{1,2}$", normalized):
        y, m, d = normalized.split(".")
        normalized = f"{int(y) + 1911:04d}-{int(m):02d}-{int(d):02d}"
    elif re.match(r"^\d{3}-\d{1,2}-\d{1,2}$", normalized):
        y, m, d = normalized.split("-")
        normalized = f"{int(y) + 1911:04d}-{int(m):02d}-{int(d):02d}"
    try:
        return normalized[:10], datetime.fromisoformat(normalized.replace("Z", "+00:00").split("+", 1)[0])
    except Exception:
        m = re.search(r"(20\d{2})[-.](\d{1,2})[-.](\d{1,2})", normalized)
        if m:
            s = f"{m.group(1)}-{int(m.group(2)):02d}-{int(m.group(3)):02d}"
            try:
                return s, datetime.fromisoformat(s)
            except Exception:
                pass
    return text, datetime.min


def _record_sort_date(record: Dict[str, Any]) -> Tuple[str, datetime]:
    for key in ("driveSyncedAt", "updatedAt", "syncedAt", "date", "inspectionDate", "createdAt"):
        label, dt = _parse_date(record.get(key))
        if dt != datetime.min:
            return label, dt
    return "", datetime.min


def _query_terms(query: str) -> List[str]:
    terms = re.findall(r"\d+K\+\d+|溪構\d+(?:-\d+)?|平台\d+|[A-Za-z0-9]{2,}|[\u4e00-\u9fff]{2,}", query or "")
    expanded: List[str] = []
    for term in terms:
        expanded.append(term.lower())
        if len(term) >= 4 and re.search(r"[\u4e00-\u9fff]", term):
            expanded.extend(term[i:i + 2].lower() for i in range(len(term) - 1))
    return list(dict.fromkeys(expanded))


def _matches_query(record: Dict[str, Any], query: str) -> bool:
    terms = _query_terms(query)
    if not terms:
        return True
    hay = " ".join(_as_text(v) for v in record.values() if not isinstance(v, (list, dict))).lower()
    return any(t in hay for t in terms)


def _is_readable_inspection(record: Dict[str, Any]) -> bool:
    content = " ".join(
        _as_text(record.get(k))
        for k in ("facilityName", "facility_name", "sourceType", "inspectionItem", "findings", "action", "status")
    )
    cjk = sum(1 for ch in content if "\u4e00" <= ch <= "\u9fff")
    question_marks = content.count("?")
    if cjk == 0 and question_marks >= 3:
        return False
    return True


def _priority_rank(record: Dict[str, Any]) -> int:
    priority = _as_text(record.get("priority") or record.get("risk") or record.get("severity"))
    status = _as_text(record.get("status"))
    u = int(float(record.get("deru_u") or 0)) if str(record.get("deru_u") or "").replace(".", "", 1).isdigit() else 0
    if "緊急" in priority or u >= 4:
        return 5
    if "高" in priority or u == 3:
        return 4
    if status in ("待處理", "處理中") or u == 2:
        return 3
    if "中" in priority:
        return 2
    return 1


def load_inspections() -> List[Dict[str, Any]]:
    rows = _load_json(INSPECTIONS_FILE, [])
    return rows if isinstance(rows, list) else []


def load_maintenance_contracts() -> Dict[str, Any]:
    data = _load_json(MAINTENANCE_CONTRACTS_FILE, {})
    return data if isinstance(data, dict) else {}


def load_maintenance_photo_index() -> Dict[str, Any]:
    data = _load_json(MAINTENANCE_PHOTO_INDEX_FILE, {})
    return data if isinstance(data, dict) else {}


def summarize_latest_inspections(query: str = "", limit: int = 6) -> Tuple[str, List[Dict[str, Any]]]:
    rows = [row for row in load_inspections() if _is_readable_inspection(row)]
    if not rows:
        return "", []

    scored = []
    for row in rows:
        date_label, dt = _record_sort_date(row)
        match_bonus = 2 if _matches_query(row, query) else 0
        scored.append((match_bonus, dt, _priority_rank(row), date_label, row))
    scored.sort(key=lambda x: (x[0], x[1], x[2]), reverse=True)

    selected = scored[: max(1, limit)]
    lines = [f"最新巡查資料：共 {len(rows)} 筆，同步來源為 webapp/data/synced_inspections.json。"]
    evidence: List[Dict[str, Any]] = []
    for _, _, _, date_label, row in selected:
        facility = _as_text(row.get("facilityName") or row.get("facility_name") or row.get("facilityId") or "未命名設施")
        form_type = _as_text(row.get("inspectionItem") or row.get("sourceType") or row.get("formType") or "巡查紀錄")
        deru = ""
        if any(k in row for k in ("deru_d", "deru_e", "deru_r", "deru_u")):
            deru = f"D{row.get('deru_d', '-')}/E{row.get('deru_e', '-')}/R{row.get('deru_r', '-')}/U{row.get('deru_u', '-')}"
        finding = _as_text(row.get("findings") or row.get("issue") or row.get("description"))[:130]
        action = _as_text(row.get("action") or row.get("recommendation") or row.get("maintenanceStrategy"))[:110]
        status = _as_text(row.get("status") or "-")
        priority = _as_text(row.get("priority") or "-")
        line = f"- {date_label or '-'}｜{facility}｜{form_type}｜狀態 {status}｜優先度 {priority}"
        if deru:
            line += f"｜DER&U {deru}"
        if finding:
            line += f"｜發現：{finding}"
        if action:
            line += f"｜建議：{action}"
        lines.append(line)
        evidence.append({
            "type": "inspection",
            "title": facility,
            "date": date_label,
            "status": status,
            "priority": priority,
            "form_type": form_type,
            "summary": finding,
        })
    return "\n".join(lines), evidence


def _format_money(value: Any) -> str:
    try:
        return f"{int(float(value)):,} 元"
    except Exception:
        return "-"


def summarize_maintenance(query: str = "", limit: int = 4) -> Tuple[str, List[Dict[str, Any]]]:
    contracts = load_maintenance_contracts()
    projects = contracts.get("projects", []) if isinstance(contracts, dict) else []
    if not isinstance(projects, list) or not projects:
        return "", []

    scored = []
    for project in projects:
        _, dt = _parse_date(project.get("date_end") or project.get("date_start"))
        match_bonus = 2 if _matches_query(project, query) else 0
        scored.append(((dt.timestamp() if dt != datetime.min else 0) + match_bonus * 10_000_000_000, project))
    scored.sort(key=lambda x: x[0], reverse=True)
    selected = [p for _, p in scored[: max(1, limit)]]

    total_amount = _format_money(contracts.get("total_contract_amount"))
    lines = [
        f"維護管理資料：共 {contracts.get('total_projects', len(projects))} 件維護/搶修工程，累計契約金額 {total_amount}，施工日誌 {contracts.get('total_reports', '-')} 份。"
    ]
    evidence: List[Dict[str, Any]] = []
    for p in selected:
        name = _fix_mojibake(_as_text(p.get("project_name") or "未命名維護案件"))
        start = _as_text(p.get("date_start") or "-")
        end = _as_text(p.get("date_end") or "-")
        amount = _format_money(p.get("contract_amount"))
        work_items = p.get("work_items", [])
        item_text = "、".join(
            f"{_as_text(w.get('name'))} {w.get('final_qty', '-')}{w.get('unit', '')}"
            for w in work_items[:3] if isinstance(w, dict)
        )
        key_notes = p.get("notes_analysis", {}).get("key_notes", []) if isinstance(p.get("notes_analysis"), dict) else []
        note_text = "；".join(f"{n.get('date')}: {n.get('text')}" for n in key_notes[-2:] if isinstance(n, dict))
        line = f"- {start}至{end}｜{name}｜金額 {amount}"
        if item_text:
            line += f"｜主要工項：{item_text}"
        if note_text:
            line += f"｜進度摘要：{note_text}"
        lines.append(line)
        evidence.append({
            "type": "maintenance",
            "title": name,
            "date": end or start,
            "amount": amount,
            "summary": item_text or note_text,
        })

    photo_idx = load_maintenance_photo_index()
    if photo_idx:
        total_images = photo_idx.get("totalImages") or photo_idx.get("total_images")
        total_cases = photo_idx.get("totalCases") or photo_idx.get("total_cases")
        if total_images or total_cases:
            lines.append(f"維護照片索引：共 {total_cases or '-'} 案、{total_images or '-'} 張照片，可供維修前/中/後比對。")
    return "\n".join(lines), evidence


def build_management_context(query: str = "", limit: int = 6) -> Dict[str, Any]:
    inspection_text, inspection_evidence = summarize_latest_inspections(query, limit=limit)
    maintenance_text, maintenance_evidence = summarize_maintenance(query, limit=max(3, min(5, limit)))
    parts = [p for p in (inspection_text, maintenance_text) if p.strip()]
    return {
        "context": "\n\n".join(parts),
        "evidence": inspection_evidence + maintenance_evidence,
        "counts": get_status(),
    }


def get_status() -> Dict[str, Any]:
    all_inspections = load_inspections()
    inspections = [row for row in all_inspections if _is_readable_inspection(row)]
    contracts = load_maintenance_contracts()
    photo_index = load_maintenance_photo_index()
    latest_label = ""
    if inspections:
        latest_label, _ = max((_record_sort_date(r) for r in inspections), key=lambda x: x[1])
    return {
        "inspection_records": len(inspections),
        "inspection_records_raw": len(all_inspections),
        "latest_inspection": latest_label,
        "maintenance_projects": contracts.get("total_projects", 0) if isinstance(contracts, dict) else 0,
        "maintenance_reports": contracts.get("total_reports", 0) if isinstance(contracts, dict) else 0,
        "maintenance_photos": photo_index.get("totalImages", 0) if isinstance(photo_index, dict) else 0,
        "maintenance_cases": photo_index.get("totalCases", 0) if isinstance(photo_index, dict) else 0,
    }
