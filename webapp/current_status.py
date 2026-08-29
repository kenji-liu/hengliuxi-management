# -*- coding: utf-8 -*-
"""最新有效現況（current_status）
======================================================================
「目前現況」不是資料庫裡與問題最相似的那段文字，而是由

    最新現況 ＋ 最新巡查 ＋ 後續維護 ＋ 後續複查

依時間順序重建出來的最新有效狀態。

## 為什麼需要這個模組

工程管理的實際流程是：

    巡查發現異常 → DER&U 評估 → 維護派工 → 維護完成 → 後續複查 → 最新現況

但檢索是「找最像的文字」。舊年度成果報告寫得完整、用詞豐富，語意相似度
往往高過一行簡短的最新巡查紀錄，於是「115/03 魚道入口阻塞」會被當成現況
回答出去 —— 即使 115/03/20 已清除、115/05/15 複查通水正常。

只取「最後一筆」也不行：最後一筆可能是一般性巡查（範圍是全流域，不會逐座
記錄裂縫），也可能是維護完工紀錄（文字裡同樣有「淘空」兩個字，但講的是
已經處理掉的問題）。

因此本模組替每座設施建立事件時間軸，逐一判斷每個異常「到今天是否仍然成立」。

## 異常狀態四分類

    OPEN       巡查發現問題，之後沒有任何改善證據
    MAINTAINED 已有維護紀錄，但尚無後續巡查確認
    RESOLVED   已維護，且後續專業巡查確認未再出現
    RECURRED   曾改善，但後續巡查再次出現相同問題

回答「目前有哪些問題」時只列 OPEN 與 RECURRED；RESOLVED 屬歷史說明，
MAINTAINED 要註明「已完成維護，尚待後續巡查確認」。

## 刻意保守的地方

一般性定期巡查的表單範圍是「步道0K+000~1K+290」全流域七項設施，不會逐座
記錄單一構造物的裂縫。因此它**不足以**把某座設施的異常判定為已解除 ——
只有專業巡查（構造物調查表、魚道巡查）或明文寫出改善完成的紀錄才算複查
確認。寧可留在 MAINTAINED 讓人去現場複核，也不要憑一句「全段正常」就把
待處理案件關掉。

本模組不建立任何新資料表，資料一律取自既有的 facilities／inspections
快照與 maintenance_contracts.json。
"""

from __future__ import annotations

import json
import os
import re
from typing import Any, Dict, List, Optional

_DATA_DIR = os.path.join(os.path.dirname(__file__), "data")

# ════════════════════════════════════════════════════════════════════════
#  異常型態分類 —— 與前端 facilities.js 的 FAC_ISSUE_TYPES 逐條對應
# ════════════════════════════════════════════════════════════════════════
#  兩邊必須同步：畫面上的「異常型態分布」與 AI 回答的「目前異常」若用不同
#  規則歸類，同一座設施會出現兩種說法。
ISSUE_TYPES: List[Dict[str, Any]] = [
    {"key": "淤積", "label": "土砂淤積",
     "re": re.compile(r"淤積|淤塞|堆積|土石堆|阻塞|堵塞")},
    {"key": "淘刷", "label": "淘刷／基礎裸露",
     #  沖蝕／沖毀／土方流失：115年「既有涵管遭沖毀，致使護岸背填土方流失」
     #  與「木屑步道表層沖蝕」原本一個型態都比對不到，兩筆待處理案件因此
     #  在現況彙整中完全消失。
     "re": re.compile(r"淘空|掏空|淘刷|沖刷|沖蝕|沖毀|下刷|基礎裸露|"
                      r"基礎受.*侵蝕|侵蝕|流失|淘蝕")},
    {"key": "裂縫", "label": "裂縫／結構破損",
     "re": re.compile(r"裂縫|龜裂|破損|斷裂|剝落|損壞|毀損")},
    {"key": "鏽蝕", "label": "鏽蝕／材料劣化",
     "re": re.compile(r"鏽蝕|銹蝕|腐朽|耗損|損耗|磨耗|老化|劣化|護木漆")},
    {"key": "位移", "label": "構件位移",
     "re": re.compile(r"位移|偏移|滑動|傾斜|移位")},
    {"key": "植生", "label": "植生／雜草",
     "re": re.compile(r"雜草|植生|草生|樹木|漂流木")},
    {"key": "崩塌", "label": "崩塌／落石",
     "re": re.compile(r"崩塌|落石|坍方|滑落")},
]
ISSUE_LABEL = {t["key"]: t["label"] for t in ISSUE_TYPES}

#  病徵詞集合，否定判斷與正向比對共用（同 facilities.js 的 FAC_SYMPTOM）
_SYMPTOM = (r"(?:裂縫|龜裂|淘空|淘刷|沖刷|下刷|侵蝕|沖蝕|裸露|破損|損壞|剝落|斷裂|"
            r"鏽蝕|銹蝕|腐朽|磨蝕|磨耗|劣化|耗損|位移|偏移|傾斜|傾倒|沉陷|淤積|淤塞|"
            r"堆積|阻塞|堵塞|斷流|崩塌|落石|倒塌|異常|問題)")

#  否定片語：巡查文字常寫「無裂縫、磨蝕、淘空或傾倒等劣化情形」，
#  直接關鍵詞比對會反過來判成「有裂縫、有淘空」。先把整段否定敘述移除。
_NEGATION_RE = re.compile(
    r"(?:無|未見|未有|沒有|不見|未發現|未檢出|未出現|並無|尚無)"
    r"(?:明顯|顯著|重大|任何)?"
    r"[^，。；、\n]{0,6}?" + _SYMPTOM +
    r"(?:(?:、|或|及|與|和)" + _SYMPTOM + r")*"
    r"(?:等)?(?:[^，。；、\n]{0,6}?(?:情形|現象|之虞))?")

#  改善完成的用語（同 facilities.js 的 fac_isRestoredInspection）
_COMPLETION_RE = re.compile(
    r"維護完工|已完成改善|改善完成|修復完成|已修復|已恢復原始狀態|恢復原始狀態|"
    r"消能設施完善|功能已恢復|通水恢復|結案|完工")
_UNCLOSED_RE = re.compile(
    r"尚未改善|未完成|待處理|處理中|需優先|緊急處置|仍需改善|仍需修復|"
    r"仍有.*阻塞|仍有.*淘空|未恢復")

#  維護動作用語：出現在巡查的處理欄或維護工程的工項名稱
_MAINTENANCE_RE = re.compile(
    r"維護|維修|修補|修復|補強|回填|改善|清理|清除|清淤|疏濬|搶修|更換|加固|"
    r"整理|刨除|鋪設|砌護|灌漿")

#  只有專業巡查能把某座設施的異常判定為已解除。一般性定期巡查的表單範圍
#  是全流域七項設施，不會逐座記錄單一構造物的裂縫，不足以作為複查證據。
CONFIRMING_FORMS = {"professional_structure", "professional_fishway"}

#  維護工程的工作類別 → 可對應處理的異常型態
_PROJECT_ISSUE_HINTS = [
    (re.compile(r"清淤|土石|疏濬|淤積|溪床"), {"淤積"}),
    (re.compile(r"倒木|植被|砍草|雜草|樹木|刨木"), {"植生"}),
    (re.compile(r"護岸|基礎|回填|補強|保護工|消能"), {"淘刷", "裂縫"}),
    (re.compile(r"路面|步道|鋪設"), {"裂縫", "鏽蝕"}),
    (re.compile(r"崩塌|落石|擋土"), {"崩塌"}),
]


def strip_negated(text: str) -> str:
    """移除否定敘述，避免「無淘空情形」被判成有淘空。"""
    return _NEGATION_RE.sub(" ", str(text or ""))


#  判斷「有什麼異常」只能看觀察欄位。處置欄位寫的是要做什麼，
#  「建議進行環境整理」被當成植生異常、「建議清除倒木」被當成崩塌，
#  都會讓現況多出根本不存在的問題（實測平臺1 因此被標出三種異常）。
_OBSERVATION_KEYS = ("findings", "appearanceOther", "defectType", "notes")
_ALL_TEXT_KEYS = _OBSERVATION_KEYS + ("action", "repairMethod", "deru_label")


def _record_text(item: Dict[str, Any], keys=None) -> str:
    return " ".join(str(item.get(key) or "") for key in (keys or _ALL_TEXT_KEYS))


def issue_types_of(item: Dict[str, Any]) -> List[str]:
    """判斷一筆巡查紀錄「觀察到」哪些異常型態（已排除否定敘述）。"""
    text = strip_negated(_record_text(item, _OBSERVATION_KEYS))
    return [t["key"] for t in ISSUE_TYPES if t["re"].search(text)]


def is_resolution_record(item: Dict[str, Any]) -> bool:
    """這筆紀錄是不是「改善完成」的結案紀錄。

    結案紀錄的文字裡同樣有病徵詞（「完成基礎淘空修補」），但講的是已經
    處理掉的問題，不能算成現存異常。
    """
    text = _record_text(item)
    return bool(_COMPLETION_RE.search(text)) and not _UNCLOSED_RE.search(text)


# ════════════════════════════════════════════════════════════════════════
#  維護工程（全流域層級）
# ════════════════════════════════════════════════════════════════════════
_PROJECTS_CACHE: List[Dict[str, Any]] = []
_PROJECTS_MTIME: float = 0.0


def load_maintenance_projects() -> List[Dict[str, Any]]:
    """讀取工程開口合約統計，依檔案 mtime 自動重載。

    這些工程是全流域範圍（例如「橫流溪魚道及周邊環境整理工作」），合約
    本身沒有標到單一設施，因此只能當成「該期間確實有做過這類處置」的
    佐證，不能直接宣稱某座設施已修復 —— 輸出時一律標明範圍。
    """
    global _PROJECTS_CACHE, _PROJECTS_MTIME
    path = os.path.join(_DATA_DIR, "maintenance_contracts.json")
    try:
        mtime = os.path.getmtime(path)
    except OSError:
        return []
    if _PROJECTS_CACHE and mtime == _PROJECTS_MTIME:
        return _PROJECTS_CACHE
    try:
        with open(path, encoding="utf-8") as f:
            data = json.load(f)
        _PROJECTS_CACHE = list(data.get("projects") or [])
        _PROJECTS_MTIME = mtime
    except Exception:                                # noqa: BLE001
        _PROJECTS_CACHE = []
    return _PROJECTS_CACHE


def _project_issue_keys(project: Dict[str, Any]) -> set:
    """這個維護工程可能處理到哪些異常型態。"""
    text = " ".join([
        str(project.get("project_name") or ""),
        " ".join(str(c.get("name") or "") + str(c.get("detail") or "")
                 for c in (project.get("work_categories") or [])),
        " ".join(str(w.get("name") or "") for w in (project.get("work_items") or [])),
    ])
    keys = set()
    for pattern, issue_keys in _PROJECT_ISSUE_HINTS:
        if pattern.search(text):
            keys |= issue_keys
    return keys


# ════════════════════════════════════════════════════════════════════════
#  事件時間軸
# ════════════════════════════════════════════════════════════════════════
def _date(value: Any) -> str:
    """統一日期字串，方便字典序比較（資料一律 YYYY-MM-DD）。"""
    return str(value or "").strip()[:10]


#  護岸（facilityId 15）底下有 0K+510／1K+000／1K+170／1K+260 四處，
#  步道（facilityId 16）有六處樁號，同一個 facilityId 對應多個實體位置。
#  若不分開，2026-07-18「1K+000護岸現況良好」會把同日 0K+510 的
#  「背填土方流失待處理」判成已解除 —— 實測就是這樣把 B1-III 級待處理
#  案件從現況中消掉的。因此時間軸必須依樁號分流。
_STATION_RE = re.compile(r"(\d+)\s*K\s*\+\s*(\d+)")
GENERAL_SCOPE = "全流域"


def _raw_station(item: Dict[str, Any]) -> str:
    """取這筆紀錄實際指向的樁號。

    判定順序很重要：一般性定期巡查要先攔下來。它的 facilityName 是
    「橫流溪全段（步道0K+000~1K+290）」，若先去字串裡抓樁號，11 筆全流域
    巡查會被通通歸到 0K+000 這個不存在的位置上。
    也不從 facilityName 抓樁號 —— 那是設施自己的名稱，不是該筆紀錄的位置。
    """
    if str(item.get("formType") or "") == "general_periodic":
        return GENERAL_SCOPE
    #  只認 inspectNo。它是這筆紀錄的權威識別碼，樁號寫在裡面就代表這筆
    #  講的是那個位置（「橫流溪－115－0K+510護岸」）。
    #  position 不可信：平臺1 的 114 年紀錄 position 寫「1K+290步道」，
    #  那是敘述文字裡提到的步道範圍，不是平臺本身的位置（實際在 1K+400）。
    #  照 position 分流會把同一座平臺拆成兩條時間軸，115 年的「現況良好」
    #  就接不上 114 年的待處理案件。
    match = _STATION_RE.search(str(item.get("inspectNo") or ""))
    if match:
        return "%dK+%03d" % (int(match.group(1)), int(match.group(2)))
    return ""


def _station_metres(sub: str) -> Optional[int]:
    match = _STATION_RE.search(sub or "")
    return int(match.group(1)) * 1000 + int(match.group(2)) if match else None


def build_timeline(facility: Dict[str, Any],
                   inspections: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """把一座設施的巡查紀錄整理成依時間遞增的事件序列。"""
    fid = facility.get("id")
    rows = [r for r in inspections
            if str(r.get("facilityId")) == str(fid) and _date(r.get("date"))]
    rows.sort(key=lambda r: _date(r.get("date")))

    events = []
    for item in rows:
        #  護岸／步道的 inspectNo 帶樁號，會自然分流成各自的時間軸；
        #  單一構造物的 inspectNo 沒有樁號，全部落在同一條線上。
        sub = _raw_station(item)
        resolution = is_resolution_record(item)
        found = issue_types_of(item)
        status = str(item.get("status") or "").strip()
        level = str(item.get("level") or "")
        #  A 級且已結案的紀錄常會描述現地狀況（「邊坡陡峭且有土砂暫存坡面，
        #  有落石之虞」），那是觀察不是待辦缺失。把它算成目前異常會憑空
        #  多出根本沒有列管的案件。只有待處理／處理中，或評為 B／C 級者，
        #  才視為需要追蹤的缺失。
        is_defect = (status in ("待處理", "處理中")
                     or bool(re.match(r"[BC]", level)))
        events.append({
            "date": _date(item.get("date")),
            "sub": sub,
            "level": level,
            "isDefect": is_defect,
            "formType": str(item.get("formType") or ""),
            "confirming": str(item.get("formType") or "") in CONFIRMING_FORMS,
            "inspector": item.get("inspector") or "",
            "status": status or "完成",
            "open": status in ("待處理", "處理中"),
            #  結案紀錄裡的病徵詞指的是已處理掉的問題，不列入現存異常
            #  issues＝需要追蹤的缺失；observations＝只是描述現況的紀錄
            "issues": [] if (resolution or not is_defect) else found,
            "observations": found if (not resolution and not is_defect) else [],
            "fixed": found if resolution else [],
            "resolution": resolution,
            "completedAt": _date(item.get("completedAt")),
            "maintenanceStart": _date(item.get("maintenanceStart")),
            "hasMaintenanceAction": bool(_MAINTENANCE_RE.search(
                str(item.get("action") or "") + str(item.get("repairMethod") or ""))),
            "findings": str(item.get("findings") or "")[:200],
            "action": str(item.get("action") or "")[:160],
            "deru": (f"D{item.get('deru_d','-')}/E{item.get('deru_e','-')}"
                     f"/R{item.get('deru_r','-')}・U{item.get('deru_u','-')}"),
            "priority": item.get("priority") or "",
        })
    return events


def _classify_issue(issue_key: str, sub: str, sub_events: List[Dict[str, Any]],
                    all_events: List[Dict[str, Any]],
                    projects: List[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
    """判斷單一位置的單一異常型態，到今天是否仍然成立。

    sub_events 是同一個樁號（或同一座設施本體）的事件，只有這些能互相
    銷案；all_events 只用來找鄰近樁號的參考紀錄，不參與判定。
    """
    appearances = [e for e in sub_events if issue_key in e["issues"]]
    if not appearances:
        return None

    last = appearances[-1]
    later = [e for e in sub_events if e["date"] > last["date"]]

    #  ── 後續複查：同位置的專業巡查未再記錄此異常，或明文寫出改善完成 ──
    confirm = next((e for e in later
                    if (e["confirming"] and issue_key not in e["issues"])
                    or (e["resolution"] and issue_key in e["fixed"])), None)

    #  ── 後續維護：只採「這筆紀錄自己登載的完工事證」 ──
    #  維護工程合約是全流域範圍（「橫流溪道路周邊環境整理工作」），沒有標到
    #  單一設施。若拿它來把待處理案件降級，B1-III 級的「護岸背填土方流失」
    #  會因為同期有一份道路整理合約就被說成已維護 —— 那是推測，不是事證。
    #  合約只當成參考資訊附在 relatedProjects，不改變狀態。
    maintenance_date, maintenance_note = "", ""
    if last["completedAt"] and last["completedAt"] >= last["date"]:
        maintenance_date = last["completedAt"]
        maintenance_note = "巡查紀錄登載之完工日期"

    related_projects = []
    for project in projects:
        start, end = _date(project.get("date_start")), _date(project.get("date_end"))
        if not end or end < last["date"]:
            continue
        if issue_key not in _project_issue_keys(project):
            continue
        related_projects.append(
            f"{project.get('project_name')}（{start}～{end}）")
    related_projects = related_projects[:3]

    #  ── 再度發生：曾被同位置的專業巡查確認解除，之後又再出現 ──
    recurred, cleared_at = False, ""
    for event in sub_events:
        if issue_key in event["issues"]:
            if cleared_at and event["date"] > cleared_at:
                recurred = True
            cleared_at = ""
        elif event["confirming"] and not cleared_at:
            if any(a["date"] < event["date"] for a in appearances):
                cleared_at = event["date"]

    if recurred:
        state = "RECURRED"
    elif confirm:
        state = "RESOLVED"
    elif maintenance_date:
        state = "MAINTAINED"
    else:
        state = "OPEN"

    #  ── 鄰近樁號的後續紀錄：僅供人工判斷，不參與銷案 ──
    #  例：1K+263 護岸 2025-04-18 記錄基礎淘空，其後無同樁號複查；
    #  但 1K+260 護岸 2026-07-18 評為 A 級。兩者是否同一構造物必須現地
    #  確認，程式不得自行認定已改善。
    nearby = ""
    metres = _station_metres(sub)
    if state == "OPEN" and metres is not None:
        for event in all_events:
            other = _station_metres(event["sub"])
            if (other is None or event["sub"] == sub
                    or event["date"] <= last["date"] or not event["confirming"]):
                continue
            if abs(other - metres) <= 10 and issue_key not in event["issues"]:
                nearby = (f"鄰近樁號 {event['sub']} 於 {event['date']} 的專業巡查"
                          f"未記錄此異常；是否為同一構造物需現地確認，"
                          f"本系統不逕行認定已改善")
                break

    return {
        "location": sub or "設施本體",
        "issue": issue_key,
        "issueLabel": ISSUE_LABEL.get(issue_key, issue_key),
        "status": state,
        "firstSeen": appearances[0]["date"],
        "lastSeen": last["date"],
        "lastSeenForm": last["formType"],
        "lastSeenFindings": last["findings"],
        "lastSeenOpen": last["open"],
        "maintenanceDate": maintenance_date,
        "maintenanceNote": maintenance_note,
        #  同期的全流域維護工程，僅供參考；合約未標到單一設施，
        #  不得據此宣稱本項異常已處理
        "relatedProjects": related_projects,
        "followupDate": confirm["date"] if confirm else "",
        "followupForm": confirm["formType"] if confirm else "",
        #  後面只有一般性巡查跟著：那份表單不逐座記錄，不足以作為複查證據
        "onlyGeneralFollowup": bool(later) and not any(e["confirming"] for e in later),
        "nearbyNote": nearby,
        "occurrences": len(appearances),
    }


_STATE_NOTE = {
    "OPEN":       "巡查發現問題，之後無任何改善證據，屬目前異常",
    "RECURRED":   "曾改善但後續巡查再度出現，屬目前異常",
    "MAINTAINED": "已完成維護，尚待後續巡查確認",
    "RESOLVED":   "已維護且後續專業巡查確認改善，不列為目前異常",
}


def build_current_status(snapshot: Dict[str, Any],
                         facility_filter: str = "") -> List[Dict[str, Any]]:
    """替每座設施重建最新有效現況。

    回傳的每一筆就是「AI 回答現況型問題時該優先採用的那份資料」：
    設施最新狀態、最新巡查、後續維護、後續複查，以及每個異常的
    OPEN／MAINTAINED／RESOLVED／RECURRED 判定與其依據。
    """
    facilities = list(snapshot.get("facilities") or [])
    inspections = list(snapshot.get("inspections") or [])
    projects = load_maintenance_projects()

    out: List[Dict[str, Any]] = []
    for facility in facilities:
        haystack = " ".join(str(facility.get(k) or "") for k in
                            ("name", "code", "type", "subType", "location", "stationKm"))
        #  設施名稱的異寫比對（溪溝／溪構、台／臺）由 agent_tools 先正規化
        #  關鍵字，此處同步正規化被比對的字串，兩邊口徑才一致。
        haystack = haystack.replace("溪溝", "溪構").replace("台", "臺")
        if facility_filter and facility_filter.strip() not in haystack:
            continue

        events = build_timeline(facility, inspections)
        #  依位置分流後逐一判定；不同樁號的紀錄不得互相銷案
        issues: List[Dict[str, Any]] = []
        for sub in sorted({e["sub"] for e in events}):
            if sub == GENERAL_SCOPE:
                continue                       # 全流域巡查另外呈現
            sub_events = [e for e in events if e["sub"] == sub]
            for key in sorted({k for e in sub_events for k in e["issues"]}):
                item = _classify_issue(key, sub, sub_events, events, projects)
                if item:
                    issues.append(item)

        located = [e for e in events if e["sub"] != GENERAL_SCOPE]
        latest = located[-1] if located else None
        latest_professional = next((e for e in reversed(located) if e["confirming"]), None)
        latest_maintenance = max((x for x in issues if x["maintenanceDate"]),
                                 key=lambda x: x["maintenanceDate"], default=None)

        active = [x for x in issues if x["status"] in ("OPEN", "RECURRED")]
        pending = [x for x in issues if x["status"] == "MAINTAINED"]
        resolved = [x for x in issues if x["status"] == "RESOLVED"]

        #  全流域巡查中「非正常」的紀錄：範圍涵蓋七項設施，不能算成本座設施
        #  的異常，但也不該丟掉，改列為待人工釐清的通報
        creek_wide = [{
            "日期": e["date"], "狀態": e["status"], "內容": e["findings"][:140],
        } for e in events if e["sub"] == GENERAL_SCOPE and (e["open"] or e["issues"])]

        if active:
            headline = "目前異常：" + "、".join(
                f"{x['location']} {x['issueLabel']}"
                f"（{x['status']}，最後記錄 {x['lastSeen']}）" for x in active)
        elif pending:
            headline = "無確認中的目前異常；" + "、".join(
                f"{x['location']} {x['issueLabel']} 已完成維護、尚待複查" for x in pending)
        else:
            headline = "依最新專業巡查未發現待處理異常"

        out.append({
            "facility_id": facility.get("id"),
            "facility_name": facility.get("name"),
            "facility_type": facility.get("type"),
            "station": facility.get("stationKm"),
            "latest_status_date": _date(facility.get("assessmentDate")
                                        or facility.get("lastInspect")),
            "latest_status": facility.get("status"),
            "latest_inspection_date": latest["date"] if latest else "",
            "latest_inspection_form": latest["formType"] if latest else "",
            "latest_inspection_status": latest["status"] if latest else "",
            "latest_inspection_findings": latest["findings"] if latest else "",
            "latest_professional_date": (latest_professional["date"]
                                         if latest_professional else ""),
            "latest_professional_findings": (latest_professional["findings"]
                                             if latest_professional else ""),
            "latest_deru": facility.get("derLevel"),
            "latest_risk_level": facility.get("riskLevel"),
            "latest_maintenance_date": (latest_maintenance["maintenanceDate"]
                                        if latest_maintenance else ""),
            "latest_maintenance_action": (latest_maintenance["maintenanceNote"]
                                          if latest_maintenance else ""),
            "current_issues": active,
            "pending_confirmation": pending,
            "resolved_history": resolved,
            "creek_wide_reports": creek_wide,
            "current_status": headline,
            "current_status_source": (
                f"最新專業巡查 {latest_professional['date']}"
                if latest_professional else
                (f"最新巡查 {latest['date']}" if latest else "無巡查紀錄")),
            "inspection_count": len(events),
            "timeline": [{
                "日期": e["date"], "位置": e["sub"] or "設施本體",
                "表單": e["formType"], "狀態": e["status"],
                "異常": [ISSUE_LABEL.get(k, k) for k in e["issues"]],
                "已處理": [ISSUE_LABEL.get(k, k) for k in e["fixed"]],
                "發現": e["findings"][:110], "處理": e["action"][:90],
            } for e in events[-8:]],
        })

    return out


#  狀態代碼說明，隨工具結果一併交給模型，避免它自行解讀四種狀態的差別
STATUS_LEGEND = dict(_STATE_NOTE)
