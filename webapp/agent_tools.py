"""
AI Agent 工具層：讓模型主動查詢平台資料，而非被動接收塞好的文字
======================================================================
原本的問答是「先檢索一堆文字塞進提示詞，再請模型作答」，模型拿到什麼就
只能講什麼，無法針對問題調閱需要的資料，也因此外圍才需要層層樣板攔截。

改為工具呼叫後，模型會依問題自行決定要查哪些資料。數字一律來自工具回傳的
權威 JSON，而非模型記憶，所以不需要關鍵字閘門覆寫答案。

資料來源分兩類：
  1. 前端 snapshot —— 設施、巡查、魚類調查、棲地。這些資料只存在瀏覽器
     localStorage 與 fish.js 常數中（後端 SQLite 為空），由前端隨請求送上。
  2. 後端檔案／既有函式 —— 維護合約、RAG 文件、評審手冊、網路檢索。
"""

from __future__ import annotations

import json
import logging
import re
from typing import Any, Callable, Dict, List, Optional

logger = logging.getLogger(__name__)

# 單一工具回傳的 JSON 上限，避免把 context 撐爆
MAX_TOOL_RESULT_CHARS = 4000


# ── 工具定義（OpenAI / OpenRouter function calling 格式）────────────────
TOOL_SCHEMAS: List[Dict[str, Any]] = [
    {
        "type": "function",
        "function": {
            "name": "query_facilities",
            "description": (
                "查詢橫流溪工程設施的現況、DER&U 評等、健康分數與維護策略。"
                "共 20 座：魚道9、防砂壩2、固床工3、平台4、護岸1、步道1。"
                "問到某座設施現況、哪些需要維護或緊急處理、設施清單統計時使用。\n"
                "DER&U 的 U 值代表急迫度：U1 例行觀察、U2 追蹤、U3 儘速處理、U4 立即處理。"
                "問「緊急」「優先處理」時應用 min_urgency=4（或併查 status=損壞），"
                "不要只查 status=需維護——後者是 U2~U3 的追蹤層級，並非緊急。"
                "要一次看全部設施時不要帶任何篩選參數。"
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "name": {"type": "string",
                             "description": "設施名稱或編號關鍵字，例如「溪構1-1」「粗石斜曲面」"},
                    "facility_type": {"type": "string",
                                      "description": "設施類別：魚道／防砂壩／固床工／平台／護岸／步道"},
                    "status": {"type": "string",
                               "description": "篩選狀態：正常／需維護／損壞"},
                    "min_urgency": {"type": "integer",
                                    "description": "只回傳 DER&U 的 U 值大於等於此數者（1~4）"},
                },
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "query_inspections",
            "description": (
                "查詢巡查紀錄（一般巡查、專業巡查-構造物調查、魚道檢核表、維護完工回報）。"
                "問到某設施巡查了幾次、發現什麼問題、最近一次巡查、待處理項目時使用。"
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "facility": {"type": "string", "description": "設施名稱關鍵字"},
                    "form_type": {"type": "string",
                                  "description": "表單類型：general_periodic／professional_structure／"
                                                 "professional_fishway／maintenance_completion"},
                    "year": {"type": "integer", "description": "西元年份，例如 2025"},
                    "status": {"type": "string", "description": "處理狀態：待處理／處理中／完成"},
                    "limit": {"type": "integer", "description": "回傳筆數上限，預設 8"},
                },
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "query_fish_surveys",
            "description": (
                "查詢歷年魚類調查場次與各物種尾數（民國103~114年，共51場次）。"
                "問到某魚種歷年趨勢、累計尾數、魚道建置前後比較時使用。"
                "注意：不同調查計畫的努力量不同，回傳結果會標示調查範圍與方法。"
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "species": {"type": "string",
                                "description": "物種中文名，例如「臺灣白甲魚」「粗首馬口鱲」"},
                    "year_from": {"type": "integer", "description": "起始西元年"},
                    "year_to": {"type": "integer", "description": "結束西元年"},
                    "pre_construct_only": {"type": "boolean",
                                           "description": "只取魚道建置前的基線場次"},
                },
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "query_maintenance",
            "description": (
                "查詢維護工程與開口合約資料：8 件工程、208 份監工日報、"
                "累計契約金額、5,660 張維護照片。問到維護經費、施工進度、"
                "工程項目、照片數量時使用。"
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {"type": "string", "description": "查詢關鍵字"},
                    "limit": {"type": "integer", "description": "回傳筆數上限，預設 5"},
                },
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "search_documents",
            "description": (
                "在歷年報告與技術文件全文中檢索（38,741 個段落，涵蓋整治規劃、"
                "成果報告、期中期末報告、生態調查報告）。問到報告內容、"
                "調查方法、設計依據、生態習性等文件記載事項時使用。"
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {"type": "string", "description": "檢索關鍵字"},
                    "top_k": {"type": "integer", "description": "回傳段落數，預設 5"},
                },
                "required": ["query"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "search_handbook",
            "description": (
                "查詢「公共設施維護管理獎評審委員問答準備手冊」：7 大評分構面、"
                "5 位委員（胡培中、李振卿、賴建宏、王宜達、張坤城）的背景與關注重點、"
                "28 組預期提問與建議回覆（含簡報頁碼）。"
                "問到評審、委員、金質獎、評分構面、簡報準備時使用。"
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {"type": "string", "description": "查詢關鍵字或委員姓名"},
                    "limit": {"type": "integer", "description": "回傳問答組數，預設 3"},
                },
                "required": ["query"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "web_search",
            "description": (
                "外部網路檢索。僅在平台資料查不到、且問題涉及一般專業知識、"
                "法規標準、業界基準或他案作法時使用。"
                "回傳內容不得用來覆蓋橫流溪的實測紀錄。"
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {"type": "string", "description": "搜尋關鍵字"},
                },
                "required": ["query"],
            },
        },
    },
]


# ── 工具實作 ──────────────────────────────────────────────────────────
def _match(text: Any, keyword: str) -> bool:
    return bool(keyword) and keyword.strip() in str(text or "")


def _urgency(item: Dict[str, Any]) -> int:
    """取設施或紀錄的 DER&U 緊急度 U 值。"""
    for key in ("deru_u", "u"):
        try:
            value = int(item.get(key) or 0)
            if value:
                return value
        except (TypeError, ValueError):
            continue
    match = re.search(r"U(\d)", str(item.get("derLevel") or ""))
    return int(match.group(1)) if match else 0


def _classify_status(item: Dict[str, Any]) -> str:
    """依最新評等判定設施狀態。

    這段分級邏輯原本寫在前端 `_buildLiveStatusAnswer`，同時也是那個
    「答非所問」樣板的來源。移到工具中成為單一事實來源後，模型可以拿到
    同樣正確的分級，但由模型決定要怎麼組織成回答。
    """
    status = str(item.get("status") or "").strip()
    urgency = _urgency(item)
    if status == "損壞" or urgency >= 4:
        return "損壞"
    if status == "需維護" or urgency in (2, 3):
        return "需維護"
    return status or "正常"


def query_facilities(snapshot: Dict[str, Any], name: str = "", facility_type: str = "",
                     status: str = "", min_urgency: int = 0) -> Dict[str, Any]:
    rows = list(snapshot.get("facilities") or [])
    if not rows:
        return {"error": "本次請求未帶入設施資料快照，無法查詢設施現況。"}

    out = []
    for item in rows:
        haystack = f"{item.get('name','')} {item.get('code','')} {item.get('type','')} {item.get('subType','')}"
        if name and not _match(haystack, name):
            continue
        if facility_type and not _match(haystack, facility_type):
            continue
        current = _classify_status(item)
        if status and current != status.strip():
            continue
        urgency = _urgency(item)
        if min_urgency and urgency < min_urgency:
            continue
        out.append({
            "名稱": item.get("name"),
            "類別": item.get("type"),
            "樁號": item.get("stationKm"),
            "狀態": current,
            "DER&U": item.get("derLevel"),
            "健康分數": item.get("riskScore") or item.get("healthScore"),
            "維護策略": item.get("maintenanceStrategy"),
            "最近評估": item.get("assessmentDate") or item.get("lastInspect"),
            "判斷依據": item.get("judgement_basis") or item.get("evaluationNotes"),
        })

    summary: Dict[str, int] = {}
    for row in out:
        summary[row["狀態"]] = summary.get(row["狀態"], 0) + 1
    return {"總數": len(out), "狀態統計": summary, "設施": out[:20]}


def query_inspections(snapshot: Dict[str, Any], facility: str = "", form_type: str = "",
                      year: Optional[int] = None, status: str = "",
                      limit: int = 8) -> Dict[str, Any]:
    rows = list(snapshot.get("inspections") or [])
    if not rows:
        try:
            from webapp import management_context
            rows = management_context.load_inspections()
        except Exception as exc:
            return {"error": f"無法讀取巡查資料：{exc}"}

    picked = []
    for item in rows:
        if facility and not _match(f"{item.get('facilityName','')}", facility):
            continue
        if form_type and str(item.get("formType") or "") != form_type.strip():
            continue
        if year and not str(item.get("date") or "").startswith(str(year)):
            continue
        if status and str(item.get("status") or "") != status.strip():
            continue
        picked.append(item)

    picked.sort(key=lambda r: str(r.get("date") or ""), reverse=True)

    by_type: Dict[str, int] = {}
    for item in picked:
        key = str(item.get("formType") or "未分類")
        by_type[key] = by_type.get(key, 0) + 1

    return {
        "符合筆數": len(picked),
        "表單類型統計": by_type,
        "紀錄": [{
            "日期": r.get("date"),
            "設施": r.get("facilityName"),
            "表單": r.get("formType"),
            "巡查人員": r.get("inspector"),
            "狀態": r.get("status"),
            "優先度": r.get("priority"),
            "DER&U": f"D{r.get('deru_d','-')}/E{r.get('deru_e','-')}"
                     f"/R{r.get('deru_r','-')}・U{r.get('deru_u','-')}",
            "發現": str(r.get("findings") or "")[:160],
            "處理": str(r.get("action") or "")[:120],
        } for r in picked[:max(1, min(int(limit or 8), 15))]],
    }


def query_fish_surveys(snapshot: Dict[str, Any], species: str = "",
                       year_from: Optional[int] = None, year_to: Optional[int] = None,
                       pre_construct_only: bool = False) -> Dict[str, Any]:
    surveys = list(snapshot.get("fishSurveys") or [])
    key_names: Dict[str, str] = dict(snapshot.get("fishKeyNames") or {})
    if not surveys:
        return {"error": "本次請求未帶入魚類調查快照，無法查詢歷年調查資料。"}

    name_to_key = {v: k for k, v in key_names.items()}
    target_key = ""
    if species:
        target_key = name_to_key.get(species.strip(), "")
        if not target_key:
            for cn, key in name_to_key.items():
                if species.strip() in cn or cn in species.strip():
                    target_key = key
                    break
        if not target_key:
            return {"error": f"查無物種「{species}」。可查詢的物種："
                             + "、".join(name_to_key.keys())}

    rows = []
    for item in surveys:
        year = item.get("year")
        if year_from and (year or 0) < year_from:
            continue
        if year_to and (year or 0) > year_to:
            continue
        if pre_construct_only and not item.get("preConstruct"):
            continue
        record = {
            "場次": str(item.get("label") or "").replace("\n", " "),
            "西元年": year,
            "月份": item.get("m"),
            "魚道建置前": bool(item.get("preConstruct")),
            "說明": str(item.get("note") or "")[:110],
        }
        if target_key:
            record["尾數"] = item.get(target_key, 0)
        else:
            record["各物種尾數"] = {key_names.get(k, k): item.get(k, 0)
                                    for k in key_names if item.get(k)}
        rows.append(record)

    result: Dict[str, Any] = {
        "符合場次": len(rows),
        "調查場次": rows[:24],
        "資料口徑": (
            "不同調查計畫的採樣範圍與努力量不同，不得直接加總比較；"
            "空白或 0 代表該場次未捕獲，不等同於該物種不存在；"
            "跨年度比較須說明樣點、季節與調查方法是否一致。"
        ),
    }
    if target_key:
        result["物種"] = key_names.get(target_key, species)
        result["該物種合計尾數"] = sum(int(r.get("尾數") or 0) for r in rows)
        result["捕獲場次數"] = sum(1 for r in rows if int(r.get("尾數") or 0) > 0)
    return result


def query_maintenance(query: str = "", limit: int = 5) -> Dict[str, Any]:
    try:
        from webapp import management_context
    except Exception:
        import management_context  # type: ignore
    try:
        data = management_context.build_management_context(query or "", limit=int(limit or 5))
        return {
            "統計": data.get("counts") or {},
            "摘要": str(data.get("context") or "")[:2500],
        }
    except Exception as exc:
        return {"error": f"維護資料查詢失敗：{type(exc).__name__}: {exc}"}


def search_documents(retriever: Callable[[str, int], List[Dict[str, Any]]],
                     query: str, top_k: int = 5) -> Dict[str, Any]:
    try:
        docs = retriever(query, max(1, min(int(top_k or 5), 8))) or []
    except Exception as exc:
        return {"error": f"文件檢索失敗：{type(exc).__name__}: {exc}"}
    return {"命中段落": len(docs), "段落": [{
        "來源檔案": d.get("source_file") or d.get("source"),
        "頁碼": d.get("page") or d.get("page_number") or "未標示",
        "內容": str(d.get("full_text") or d.get("preview") or d.get("text") or "")[:600],
    } for d in docs]}


def search_handbook(query: str, limit: int = 3) -> Dict[str, Any]:
    try:
        from webapp import answer_engine
    except Exception:
        import answer_engine  # type: ignore
    try:
        hits = answer_engine.search_handbook(query, limit=max(1, min(int(limit or 3), 5)))
        data = answer_engine.load_handbook()
    except Exception as exc:
        return {"error": f"手冊檢索失敗：{type(exc).__name__}: {exc}"}

    result: Dict[str, Any] = {"命中問答": len(hits), "問答": [{
        "委員": h.get("reviewer"),
        "題號": h.get("code"),
        "預期提問": h.get("question"),
        "建議回覆": h.get("answer"),
        "簡報頁碼": h.get("pages"),
    } for h in hits]}

    named = [r for r in (data.get("reviewers") or []) if str(r.get("姓名", "")) in query]
    if named:
        result["委員背景"] = named
    if re.search(r"評分|構面|指標", query):
        result["評分構面"] = data.get("criteria")
    if re.search(r"平台|模組|功能", query):
        result["平台模組"] = data.get("platformModules")
    return result


def web_search(searcher: Callable[[str, int], List[Dict[str, Any]]],
               query: str) -> Dict[str, Any]:
    try:
        results = searcher(query, 4) or []
    except Exception as exc:
        return {"error": f"網路檢索失敗：{type(exc).__name__}: {exc}"}
    if not results:
        return {"結果": [], "說明": "網路檢索無結果。"}
    return {"結果": [{
        "標題": r.get("title"),
        "摘要": str(r.get("body") or "")[:300],
        "網址": r.get("href"),
    } for r in results[:4]],
        "說明": "以上為外部網路資料，屬一般知識，不得覆蓋橫流溪實測紀錄。"}


# ── 派發 ──────────────────────────────────────────────────────────────
def execute_tool(name: str, arguments: Dict[str, Any], snapshot: Dict[str, Any],
                 retriever: Callable, searcher: Callable) -> str:
    """執行單一工具並回傳 JSON 字串。

    工具失敗時回傳含 error 的 JSON 而非拋出例外，讓模型能據實說明查無，
    而不是整個問答失敗。
    """
    args = arguments if isinstance(arguments, dict) else {}
    try:
        if name == "query_facilities":
            result = query_facilities(
                snapshot, str(args.get("name") or ""),
                str(args.get("facility_type") or ""), str(args.get("status") or ""),
                int(args.get("min_urgency") or 0))
        elif name == "query_inspections":
            result = query_inspections(
                snapshot, str(args.get("facility") or ""), str(args.get("form_type") or ""),
                args.get("year"), str(args.get("status") or ""), args.get("limit") or 8)
        elif name == "query_fish_surveys":
            result = query_fish_surveys(
                snapshot, str(args.get("species") or ""),
                args.get("year_from"), args.get("year_to"),
                bool(args.get("pre_construct_only")))
        elif name == "query_maintenance":
            result = query_maintenance(str(args.get("query") or ""), args.get("limit") or 5)
        elif name == "search_documents":
            result = search_documents(retriever, str(args.get("query") or ""),
                                      args.get("top_k") or 5)
        elif name == "search_handbook":
            result = search_handbook(str(args.get("query") or ""), args.get("limit") or 3)
        elif name == "web_search":
            result = web_search(searcher, str(args.get("query") or ""))
        else:
            result = {"error": f"未知的工具：{name}"}
    except Exception as exc:
        logger.warning("[AGENT_TOOL] %s 執行失敗：%s", name, exc)
        result = {"error": f"{type(exc).__name__}: {exc}"}

    text = json.dumps(result, ensure_ascii=False)
    if len(text) > MAX_TOOL_RESULT_CHARS:
        text = text[:MAX_TOOL_RESULT_CHARS] + "…（結果過長已截斷）"
    return text
