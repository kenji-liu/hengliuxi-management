# -*- coding: utf-8 -*-
"""意圖路由（Intent Router）
======================================================================
問題進來的第一步：判斷這題要查哪些資料，而不是每題都把所有資料庫與
所有 RAG collection 掃一遍。

舊流程不論問什麼都會並行執行「線上平台頁面抓取＋本機 RAG 檢索＋Drive
OCR 搜尋＋維護管理彙整」四路，再把結果全部塞進提示詞。其中本機 RAG 的
向量庫有 410 MB／38,741 行，Drive OCR 還要走外網，光這兩項就佔掉大半
等待時間 —— 而問「溪構11 現在 DER&U 多少」根本用不到任何一項。

本模組只做分類，不做檢索也不呼叫模型（純正規式，耗時 < 1 ms），輸出：

    intents   : 命中的意圖清單，允許多重意圖
    primary   : 權重最高者
    sources   : 哪幾路前置檢索要跑（其餘直接跳過）
    tools     : 建議 Agent 優先使用的工具
    fast_path : 是否走快速通道（略過工具選擇輪，直接統整作答）

「快速通道」不等於「樣板回答」。工程設施名稱、數量、日期、最近巡查等
問題仍然由模型作答、數字仍然來自工具回傳的權威 JSON，只是省掉「讓模型
自己想要查什麼」那一輪 LLM 往返 —— 因為這類問題要查什麼是確定的。
"""

from __future__ import annotations

import re
from typing import Any, Dict, List

# ════════════════════════════════════════════════════════════════════════
#  意圖規則
# ════════════════════════════════════════════════════════════════════════
#  weight  : 命中一次的加權（具名實體給高分，泛用動詞給低分）
#  sources : 該意圖需要的前置檢索來源
#  tools   : 該意圖對應的 Agent 工具
INTENT_RULES: List[Dict[str, Any]] = [
    {
        "intent": "facility",
        "label": "工程設施",
        "patterns": [
            r"溪[構溝]\s*\d+(?:-\d+)?", r"防砂壩", r"固床工", r"護岸", r"平[臺台]\s*\d?",
            r"步道", r"構造物", r"設施", r"工程物", r"擋土", r"消能",
            r"\d+K\+\d+", r"樁號", r"里程",
            r"幾座", r"幾處", r"多少座", r"哪些設施", r"清單", r"一覽",
        ],
        "sources": [],
        "tools": ["query_facilities"],
    },
    {
        "intent": "inspection",
        "label": "巡查紀錄",
        "patterns": [
            r"巡查", r"巡檢", r"檢測", r"調查表", r"檢查表", r"表單",
            r"定期", r"不定期", r"專業巡查", r"一般性",
            r"最近一次", r"上一次", r"最新一次", r"何時檢查", r"什麼時候查",
            r"檢查日期", r"巡查日期", r"檢測日期",
        ],
        "sources": ["management"],
        "tools": ["query_inspections"],
    },
    {
        "intent": "deru",
        "label": "DER&U 與風險",
        "patterns": [
            r"DER\s*&?\s*U", r"DER", r"劣化", r"風險", r"健康度", r"健康分",
            r"評分", r"分數", r"等級", r"[ABC][12]?級", r"\bA1\b", r"\bB1\b", r"\bU[1-4]\b",
            r"緊急", r"優先處理", r"待處理", r"急迫", r"高風險", r"低風險",
        ],
        "sources": [],
        "tools": ["query_facilities"],
    },
    {
        "intent": "maintenance",
        "label": "維護管理",
        "patterns": [
            r"維護", r"維修", r"修補", r"修復", r"補強", r"搶修", r"改善",
            r"施工", r"工項", r"開口合約", r"合約", r"經費", r"預算", r"金額",
            r"監工", r"日報", r"完工", r"進度", r"清淤", r"疏濬", r"清除",
            r"處理過", r"做過什麼", r"保養",
        ],
        "sources": ["management"],
        "tools": ["query_maintenance", "query_inspections"],
    },
    {
        "intent": "fishpass",
        "label": "魚道",
        "patterns": [
            r"魚道", r"魚梯", r"通行", r"洄游", r"上溯", r"溯游", r"連通",
            r"潛越", r"階段式", r"之字形", r"降壩", r"舟通", r"粗石斜曲面", r"斜坡式",
            r"FW\s*\d", r"魚能不能", r"魚上得去",
        ],
        "sources": [],
        "tools": ["query_facilities", "query_fish_surveys"],
    },
    {
        "intent": "ecology",
        "label": "生態調查",
        "patterns": [
            r"魚類", r"魚種", r"物種", r"生態", r"棲地", r"生物",
            r"蝦", r"蟹", r"底棲", r"水[生棲]", r"陸域", r"鳥", r"兩棲", r"爬蟲",
            r"多樣性", r"豐[富度]", r"優勢種", r"原生", r"外來",
            r"保育", r"紅皮書", r"瀕危", r"近危", r"易危", r"受脅",
            r"電捕", r"採樣", r"調查[了成]?幾", r"尾數", r"幾尾",
            # 常見物種名（具名實體，加權見下）
            r"[臺台]灣白甲魚", r"明潭吻[鰕蝦]虎", r"粗首馬口[鱲鱲]", r"[鏟臺台]頜魚",
            r"石[賓濱]", r"[鯝鮈]魚", r"[鰍鰻]",
        ],
        "sources": ["local", "ocr"],
        "tools": ["query_fish_surveys", "search_documents"],
    },
    {
        "intent": "report",
        "label": "歷年報告",
        "patterns": [
            r"成果報告", r"報告書", r"報告", r"技術服務", r"設計書", r"設計圖",
            r"文件", r"原文", r"頁碼", r"出處", r"引用", r"依據哪",
            r"第\s*\d+\s*[頁章節]", r"手冊", r"規範", r"辦法", r"要點",
            r"1\d{2}\s*年.*(?:報告|調查|成果)",
        ],
        "sources": ["local", "ocr"],
        "tools": ["search_documents"],
    },
    {
        "intent": "comprehensive",
        "label": "綜合分析",
        "patterns": [
            r"綜合", r"整體", r"全面", r"通盤", r"統整", r"彙整",
            r"分析", r"比較", r"對照", r"趨勢", r"變化", r"演變",
            r"評估", r"研判", r"為什麼", r"原因", r"影響", r"關聯",
            r"建議", r"策略", r"規劃", r"怎麼看", r"如何評",
            r"歷年", r"跨年", r"逐年", r"這幾年", r"長期",
        ],
        "sources": ["local", "management"],
        "tools": [],          # 交由模型自行決定，不預設限縮
    },
]

#  現況型問題：問的是「到今天為止的最新有效狀態」，不是歷史紀錄。
#  這種題目最容易出錯 —— 舊年度成果報告文字完整、相似度高，會蓋過一行
#  簡短的最新巡查，於是早已改善的異常被當成目前問題答出去。
#  命中時 prefer_latest=True，Agent 必須先呼叫 query_current_status，
#  歷年報告只能作為原因與歷程的補充。
_CURRENT_RE = re.compile(
    r"目前|現在|現況|最新|最近|如今|當前|"
    r"是否仍|還有沒有|有沒有問題|有什麼異常|哪些異常|哪座需要|哪些需要|"
    r"需要維護|待處理|尚未處理|是否已|有無改善|完成維護了嗎|處理好了嗎")


#  具名實體（設施編號、樁號、物種名）比泛用動詞更能決定意圖，因此加權較高。
_NAMED_ENTITY_RE = re.compile(
    r"溪[構溝]\s*\d+(?:-\d+)?|\d+K\+\d+|DER\s*&?\s*U|FW\s*\d|"
    r"[臺台]灣白甲魚|明潭吻[鰕蝦]虎|粗首馬口[鱲鱲]")

#  需要深度推理的訊號：出現任一個就不走快速通道。
_DEEP_RE = re.compile(
    r"分析|比較|對照|趨勢|變化|演變|評估|研判|為什麼|原因|影響|關聯|"
    r"建議|策略|規劃|怎麼看|如何|歷年|跨年|逐年|綜合|整體|全面|通盤|"
    r"說明理由|請詳述|完整|詳細")

#  快速通道允許的意圖：這些問題「要查什麼」是確定的，不需要模型先想一輪。
_FAST_INTENTS = {"facility", "inspection", "deru", "maintenance", "fishpass"}

ALL_SOURCES = ("local", "ocr", "management", "platform", "handbook", "web")


def route(query: str) -> Dict[str, Any]:
    """判斷問題意圖並決定要查哪些來源。純正規式，不呼叫模型。"""
    text = (query or "").strip()
    scores: Dict[str, float] = {}
    matched: Dict[str, List[str]] = {}

    for rule in INTENT_RULES:
        score, hits = 0.0, []
        for pattern in rule["patterns"]:
            for found in re.findall(pattern, text, flags=re.IGNORECASE):
                token = found if isinstance(found, str) else str(found)
                #  具名實體 2.5 分、一般關鍵字 1 分
                score += 2.5 if _NAMED_ENTITY_RE.search(token) else 1.0
                if token:
                    hits.append(token)
        if score > 0:
            scores[rule["intent"]] = score
            matched[rule["intent"]] = sorted(set(hits))

    if not scores:
        #  完全沒命中：當作綜合題，讓 Agent 自行判斷要查什麼
        return {
            "intents": ["comprehensive"],
            "primary": "comprehensive",
            "labels": ["綜合分析"],
            "scores": {},
            "matched": {},
            "sources": {"local": True, "management": True,
                        "ocr": False, "platform": False,
                        "handbook": False, "web": False},
            "tools": [],
            "fast_path": False,
            "current_status": False,
            "prefer_latest": False,
            "include_maintenance_after_inspection": False,
            "historical_data": "normal",
            "reason": "未命中任何意圖關鍵字，改採綜合查詢",
        }

    #  多重意圖：最高分者為主，達到最高分 40% 以上者一併保留。
    #  例：「溪構11目前DER&U多少？最近有沒有維護？」→ facility + deru + maintenance
    best = max(scores, key=lambda k: scores[k])
    #  門檻取「最高分的 30%」與「1.0 分」之中較小者：多重意圖題常有一個
    #  強命中（DER&U）搭配一個弱命中（維護），若只用比例門檻，弱的那一個
    #  會被主意圖的高分擠掉，等於漏查使用者明講的第二個問題。
    threshold = min(scores[best] * 0.3, 1.0)
    intents = [name for name, value in
               sorted(scores.items(), key=lambda kv: -kv[1]) if value >= threshold]

    by_name = {rule["intent"]: rule for rule in INTENT_RULES}
    labels = [by_name[name]["label"] for name in intents]

    #  來源聯集：只要有一個命中的意圖需要，該路檢索就跑；其餘略過。
    sources = {name: False for name in ALL_SOURCES}
    for name in intents:
        for source in by_name[name]["sources"]:
            sources[source] = True

    #  工具建議：依意圖順序去重，供快速通道直接執行。
    tools: List[str] = []
    for name in intents:
        for tool in by_name[name]["tools"]:
            if tool not in tools:
                tools.append(tool)

    #  現況型判斷獨立於意圖分類：它決定「用哪個時間點的資料」，
    #  而不是「查哪一類資料」。工程類問題才適用（生態調查沒有現況／歷史之分）。
    current_status = bool(_CURRENT_RE.search(text)) and any(
        name in ("facility", "inspection", "deru", "maintenance", "fishpass")
        for name in intents)

    #  快速通道條件（三者皆須成立）：
    #    1. 問題不長 —— 長問句通常含多個子題
    #    2. 沒有深度推理訊號
    #    3. 所有命中意圖都在可快速回答的範圍內，且已有明確工具可查
    fast_path = (len(text) <= 40
                 and not _DEEP_RE.search(text)
                 and bool(intents)
                 and all(name in _FAST_INTENTS for name in intents)
                 and bool(tools))

    if current_status:
        #  現況題一律先查最新有效現況；歷年報告降為次要，不得當成現況答案
        tools = ["query_current_status"] + [t for t in tools
                                            if t != "query_current_status"]
        labels = ["目前現況"] + labels
        sources["local"] = sources.get("local", False) and not fast_path
        sources["ocr"] = False

    return {
        "intents": intents,
        "primary": best,
        "labels": labels,
        "scores": {k: round(v, 1) for k, v in scores.items()},
        "matched": {k: matched[k] for k in intents if k in matched},
        "sources": sources,
        "tools": tools,
        "fast_path": fast_path,
        #  現況型問題的三個旗標，供後端決定資料優先權與 RAG 時間加權
        "current_status": current_status,
        "prefer_latest": current_status,
        "include_maintenance_after_inspection": current_status,
        "historical_data": "secondary" if current_status else "normal",
        "reason": ("現況型問題：以最新有效現況為主，歷年資料僅作補充"
                   if current_status else
                   ("符合快速通道：查詢對象明確且不需跨年度推理"
                    if fast_path else "需要完整檢索與推理")),
    }


def status_message(routed: Dict[str, Any]) -> str:
    """給前端顯示的來源說明，例如「正在查詢巡查與DER&U資料」。"""
    labels = routed.get("labels") or []
    if not labels:
        return "正在查詢平台資料"
    return "正在查詢" + "、".join(labels[:3]) + "資料"
