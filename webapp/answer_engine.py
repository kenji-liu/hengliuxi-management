"""
橫流溪 AI 答詢核心：意圖路由、來源篩選與嚴謹作答規範
======================================================================
原先的問答把「所有資料來源」不分問題一律塞進 context，導致問魚類棲地
卻回巡查統計；AI 失敗時又以巡查數字當成答案輸出，形成答非所問。

本模組負責三件事：

1. 意圖判斷（route_intent）
   依問題判定屬於生態、設施、巡查維護、水質、評審簡報或一般知識，
   決定該取哪些資料來源、以及各來源的權重。

2. 相關性把關（filter_sources）
   來源必須與問題實際相關才會進入 context；不相關的一律排除，
   避免模型被無關數字帶偏。

3. 作答規範（build_messages）
   要求逐項標註依據、區分「平台實測資料」與「一般專業知識」，
   資料不足時必須明講，不得以其他數字充數。
"""

from __future__ import annotations

import json
import logging
import os
import re
from typing import Any, Dict, List, Tuple

logger = logging.getLogger(__name__)

_DATA_DIR = os.path.join(os.path.dirname(__file__), 'data')
_HANDBOOK_PATH = os.path.join(_DATA_DIR, 'review_handbook.json')


# ── 領域詞彙 ──────────────────────────────────────────────────────────
# 魚種名稱若不在詞庫中，會被斷詞切成無意義的雙字片段（如「粗首馬口鱲」
# 被切成「粗首/首馬/馬口/口鱲」），導致檢索命中錯誤文件。
FISH_SPECIES = [
    "粗首馬口鱲", "馬口魚", "臺灣石魚賓", "台灣石魚賓", "石魚賓",
    "臺灣白甲魚", "台灣白甲魚", "白甲魚",
    "臺灣間爬岩鰍", "台灣間爬岩鰍", "間爬岩鰍",
    "纓口臺鰍", "纓口台鰍", "臺灣纓口鰍",
    "明潭吻鰕虎", "短吻紅斑吻鰕虎", "短臀瘋鱨", "鰕虎",
    "何氏棘魞", "溪哥", "苦花", "鯝魚", "臺灣鏟頜魚",
    "拉氏清溪蟹", "日本絨螯蟹", "米蝦", "沼蝦",
]

LAND_SPECIES = [
    "穿山甲", "食蟹獴", "白鼻心", "臺灣山羌", "台灣山羌", "山羌",
    "臺灣獼猴", "臺灣野豬", "鼬獾", "臺灣野山羊", "藍腹鷴", "臺灣竹雞",
    "小花蔓澤蘭", "銀合歡", "大花咸豐草", "五節芒", "山黃麻", "九芎",
    "水柳", "楓香", "臺灣肖楠", "臺灣杉", "烏心石", "青剛櫟", "赤皮",
]

FACILITY_TERMS = [
    "魚道", "固床工", "防砂壩", "護岸", "平台", "步道", "擋土牆",
    "格框", "消能", "排水", "構造物", "設施",
]

REVIEWERS = ["胡培中", "李振卿", "賴建宏", "王宜達", "張坤城"]


# ── 意圖定義 ──────────────────────────────────────────────────────────
# weights：該意圖下各資料來源的權重（0 表示不採用）
INTENT_RULES: List[Dict[str, Any]] = [
    {
        'intent': 'report',
        'label': '指定報告與工程設計內容',
        'patterns': [
            r'成果報告|報告書|技術服務案|設計書架|設計重點|設計依據|報告內容',
        ],
        # 具名報告問題必須先讀報告；管理資料只用來回答題目明確要求的現況關聯。
        'weights': {'docs': 1.0, 'facility': 0.7, 'ecology': 0.5,
                    'management': 0.35, 'handbook': 0.2, 'web': 0.0},
    },
    {
        'intent': 'review',
        'label': '評審簡報與委員問答',
        'patterns': [
            r'評審|委員|金質獎|評分|構面|簡報|初評|問答準備|沙盤',
            r'胡培中|李振卿|賴建宏|王宜達|張坤城',
        ],
        # 評審題以手冊為主，但手冊未涵蓋的技術問題（如模型準確率的業界基準、
        # 法規標準、他案作法）需要外部資料補充，故保留網路檢索。
        'weights': {'handbook': 1.0, 'docs': 0.6, 'management': 0.3,
                    'facility': 0.3, 'ecology': 0.3, 'web': 0.5},
    },
    {
        'intent': 'ecology_fish',
        'label': '水域生態與魚類',
        'patterns': [
            r'魚|魚類|魚種|水域生物|洄游|族群|尾數|捕獲|棲地|habitat',
            r'產卵|覓食|水深|流速|底質|溯游|上溯|通行|上游|下游',
        ],
        'terms': FISH_SPECIES,
        'weights': {'ecology': 1.0, 'docs': 0.8, 'facility': 0.4,
                    'handbook': 0.3, 'management': 0.0, 'web': 0.7},
    },
    {
        'intent': 'ecology_land',
        'label': '陸域生態與植生',
        'patterns': [
            r'植物|植生|造林|樹種|外來種|入侵種|疏伐|林相|覆蓋率|NDVI',
            r'哺乳|鳥類|相機|OI值|碳匯|碳排|生物多樣性',
        ],
        'terms': LAND_SPECIES,
        'weights': {'ecology': 1.0, 'docs': 0.8, 'handbook': 0.4,
                    'management': 0.0, 'facility': 0.2, 'web': 0.6},
    },
    {
        'intent': 'water_quality',
        'label': '水質監測',
        'patterns': [r'水質|pH|酸鹼|溶氧|濁度|導電度|水溫|FBI|優養|藻類'],
        'weights': {'ecology': 0.8, 'docs': 1.0, 'handbook': 0.4,
                    'management': 0.0, 'facility': 0.2, 'web': 0.5},
    },
    {
        'intent': 'facility',
        'label': '工程設施與結構評估',
        'patterns': [
            r'DER&?U|健康分數|評等|等級|耐久|回彈錘|強度|座標|TWD97',
            r'損壞|裂縫|淘空|沖蝕|位移|修補|修復|補強|施工|進場|下溪|妥善率',
        ],
        'terms': FACILITY_TERMS,
        'weights': {'facility': 1.0, 'management': 0.8, 'docs': 0.6,
                    'handbook': 0.3, 'ecology': 0.2, 'web': 0.2},
    },
    {
        'intent': 'inspection',
        'label': '巡查與維護管理',
        'patterns': [
            r'巡查|檢核|維護|維修|修補|修復|搶修|缺失|施工|監工|日報|工程|經費|合約',
            r'頻率|處理|完工|待處理|進度|照片',
        ],
        'weights': {'management': 1.0, 'facility': 0.7, 'docs': 0.5,
                    'handbook': 0.3, 'ecology': 0.0, 'web': 0.2},
    },
]

_DEFAULT_WEIGHTS = {'docs': 1.0, 'ecology': 0.5, 'facility': 0.5,
                    'management': 0.4, 'handbook': 0.4, 'web': 0.6,
                    'environment': 0.5}

SOURCE_LABELS = {
    'handbook':   '評審委員問答準備手冊',
    'ecology':    '生態資料庫與生態調查報告',
    'facility':   '工程設施資料（DER&U、健康分數、座標）',
    'management': '巡查與維護管理紀錄',
    'docs':       '歷年報告與技術文件（RAG 檢索）',
    'platform':   '線上平台即時資料',
    'web':        '外部網路檢索',
    'environment': '橫流溪周邊環境脈絡（一般通則）',
}


# 查詢相關性不是只看「有沒有橫流溪」：橫流溪的每份巡查資料都可能含有
# 這個名稱，若只用它作為命中條件，任何問題都會被最新巡查摘要污染。
# 這些詞彙用來做輕量的 query/document gate，不取代 BM25 或向量檢索。
QUERY_CONCEPT_TERMS: Dict[str, Tuple[str, ...]] = {
    'facility': tuple(FACILITY_TERMS + ['構造物', '健康', '狀態', '現況', '風險']),
    'fishway': ('魚道', '魚梯', '魚道口', '魚道出口', '魚道入口'),
    'fish_movement': ('魚', '魚類', '魚種', '通行', '洄游', '溯游', '上溯',
                       '捕獲', '電捕', '陷阱', '相機', '標放'),
    'direction': ('上游', '下游', '往上', '往下', '上下游', '上溯', '下溯'),
    'repair': ('修補', '修復', '補強', '維修', '維護', '搶修', '清淤', '施工',
               '進場', '下溪', '導水', '擋水'),
    'inspection': ('巡查', '巡檢', '檢查', '檢核', '紀錄', '異常', '通報',
                   '缺失', '監工', '日報'),
    'ecology': ('生態', '棲地', '植生', '物種', '保育', '昆蟲', '植物', '動物'),
    'water_quality': ('水質', 'pH', '酸鹼', '溶氧', '濁度', '導電度', 'FBI'),
    'location': ('位置', '周邊', '環境', '地點', '座標', '樁號', '里程', '路線',
                 '交通', '和平區', '大甲溪'),
    'regulation': ('法規', '法律', '規範', '標準', '許可', '水利法', '環評', '規定',
                   '條文', '罰則', '申請', '核准', '違規', '公告', '辦法', '要點'),
    'review': ('評審', '委員', '金質獎', '評分', '構面', '簡報', '問答'),
}

_GENERIC_STAT_RE = re.compile(
    r'^(?:.*)?(?:共\s*\d+\s*(?:筆|件|座|張|種|場)|'
    r'(?:巡查|維護|魚類|設施|資料庫).{0,12}\d+\s*(?:筆|件|座|張|種|場))',
    re.IGNORECASE,
)
_UNREQUESTED_STAT_RE = re.compile(
    r'(?:巡查|維護|魚類|設施|照片|契約金額|施工日誌)[^。；;\n]{0,18}'
    r'\d[\d,]*(?:\.\d+)?\s*(?:筆|件|座|張|種|場|元|份)',
    re.IGNORECASE,
)


def _allows_statistics(query: str) -> bool:
    """這個問題是否本來就會用數量作答。

    _UNREQUESTED_STAT_RE 擋的是「問棲地卻回巡查 77 筆」那種拿統計充數的答案。
    但「目前哪些魚道需要緊急處理」這類列舉題，答案寫「需維護的魚道共 3 座」
    是切題的，不能一併擋掉 —— 實測 Agent 依工具回傳的正確答案曾因此被丟棄，
    使用者看到的反而是「查無相關資料」。
    """
    return bool(re.search(
        r'統計|多少|幾筆|數量|幾座|照片|總覽|全部|金額|經費|日報|'
        r'哪些|哪幾|哪一|列出|清單|有沒有|是否有|需要處理|需維護|待處理|'
        #  現況型問題（目前有哪些異常、是否已完成維護）的答案本來就會寫出
        #  項數與座數，那是切題的內容，不是拿統計充數
        r'目前|現在|現況|最新|最近|是否已|是否仍|完成維護|完成改善',
        str(query or '')))


def query_concepts(query: str) -> Dict[str, List[str]]:
    """Return concept groups and the terms actually present in a query."""
    text = str(query or '').strip().lower()
    return {
        group: [term for term in terms if term.lower() in text]
        for group, terms in QUERY_CONCEPT_TERMS.items()
        if any(term.lower() in text for term in terms)
    }


def is_hengliuxi_query(query: str) -> bool:
    """Whether a query belongs to the platform's subject area."""
    text = str(query or '').lower()
    if '橫流溪' in text:
        return True
    return bool(query_concepts(text))


def _specific_query_terms(query: str) -> List[str]:
    text = str(query or '')
    terms: List[str] = []
    terms.extend(re.findall(r'\d+K\+\d+|溪構\d+(?:-\d+)?|平台\d+|樣站\d+|FD\d+', text,
                           flags=re.IGNORECASE))
    for group in (FISH_SPECIES, LAND_SPECIES, FACILITY_TERMS, REVIEWERS):
        terms.extend(term for term in group if term in text)
    return list(dict.fromkeys(terms))


def _required_concepts(query: str) -> set[str]:
    """Concepts that must co-occur for a document to answer this query."""
    text = str(query or '').lower()
    concepts = query_concepts(text)
    required: set[str] = set()

    if '魚道' in text:
        required.add('fishway')
    if any(term in text for term in QUERY_CONCEPT_TERMS['repair']):
        required.add('repair')
    if any(term in text for term in QUERY_CONCEPT_TERMS['direction']):
        # 「魚往上游」需要同時看方向與魚類/通行證據，不能只因文件提到上游
        # 就視為答案。
        if '魚' in text or any(term in text for term in FISH_SPECIES):
            required.update(('direction', 'fish_movement'))
    return required


def relevance_score(query: str, text: str, source_name: str = '', require_all: bool = True) -> float:
    """Score lexical relevance independently from a retriever's raw score.

    The score is deliberately small and interpretable.  It is used as a gate,
    not as a replacement for semantic retrieval: exact named entities and
    co-occurring concepts matter more than the presence of the site name.
    """
    query_text = str(query or '').strip().lower()
    haystack = f'{source_name}\n{text or ""}'.lower()
    if not query_text or not haystack or not is_hengliuxi_query(query_text):
        return 0.0

    specific = _specific_query_terms(query_text)
    if specific and not any(term.lower() in haystack for term in specific):
        return 0.0

    concepts = query_concepts(query_text)
    matched_groups = {
        group for group, terms in concepts.items()
        if any(term.lower() in haystack for term in terms)
    }
    required = _required_concepts(query_text)
    if require_all and required and not required.issubset(matched_groups):
        return 0.0
    if not matched_groups:
        return 0.0

    score = float(len(matched_groups))
    for term in specific:
        if term.lower() in haystack:
            score += 3.0
    if '橫流溪' in query_text and '橫流溪' in haystack:
        score += 0.25
    if any(phrase in haystack for phrase in ('由下游往上游', '往上游通行', '魚道清淤', '魚道修補')):
        score += 0.5
    return score


def is_relevant_text(query: str, text: str, source_name: str = '', strict: bool = False) -> bool:
    """Check whether text is safe to pass to the answer model."""
    if strict:
        return relevance_score(query, text, source_name) > 0
    query_text = str(query or '').lower()
    if not is_hengliuxi_query(query_text):
        return False
    if _UNREQUESTED_STAT_RE.search(str(text or '').strip()) and not _allows_statistics(query_text):
        return False
    return relevance_score(query, text, source_name, require_all=False) > 0


def filter_retrieved_docs(query: str, docs: List[Dict[str, Any]], limit: int = 8) -> List[Dict[str, Any]]:
    """Remove retriever hits that do not contain the query's required concepts."""
    ranked = []
    for position, doc in enumerate(docs or []):
        source = str(doc.get('source_file') or doc.get('source') or '')
        # JSON/程式索引是平台實作資料，不是可直接引用的報告段落；其
        # 中的欄位名稱常同時包含多個主題，容易造成假命中。
        if re.search(r'\.(?:json|jsonl|sqlite3?|py|js)$', source, re.IGNORECASE):
            continue
        content = str(doc.get('full_text') or doc.get('text') or doc.get('preview') or '')
        score = relevance_score(query, content, source)
        if score <= 0:
            continue
        copied = dict(doc)
        copied['query_relevance'] = round(score, 3)
        ranked.append((score, float(doc.get('score') or 0), -position, copied))
    ranked.sort(key=lambda item: (item[0], item[1], item[2]), reverse=True)
    return [item[3] for item in ranked[:max(1, int(limit or 8))]]


def scope_context_to_query(query: str, text: str, max_chars: int = 6500) -> str:
    """Keep only query-related lines from a broad browser/platform snapshot."""
    if not text or not is_hengliuxi_query(query):
        return ''

    lines = str(text).splitlines()
    selected: List[str] = []
    current_header = ''
    current_hits: List[str] = []
    concepts = query_concepts(query)

    def flush() -> None:
        nonlocal current_header, current_hits
        if current_hits:
            if current_header:
                selected.append(current_header)
            selected.extend(current_hits)
        current_header, current_hits = '', []

    for raw_line in lines:
        line = raw_line.strip()
        if not line:
            continue
        if line.startswith('【'):
            flush()
            match = re.match(r'^(【[^】]+】)(.*)$', line)
            current_header = match.group(1) if match else line
            inline = match.group(2).strip() if match else ''
            if inline:
                if not ((_GENERIC_STAT_RE.search(inline) or _UNREQUESTED_STAT_RE.search(inline))
                        and not _allows_statistics(query)):
                    if not ('direction' in concepts and 'fish_movement' in concepts and
                            not re.search(r'上游|下游|往上|往下|上溯|下溯|通行|洄游|溯游|捕獲|電捕|陷阱|相機|標放', inline,
                                          flags=re.IGNORECASE)):
                        if is_relevant_text(query, inline):
                            current_hits.append(inline)
            continue
        # A count-only line is often the exact source of the original bug.
        # Keep it only when the user explicitly asks for a count or overview.
        if ((_GENERIC_STAT_RE.search(line) or _UNREQUESTED_STAT_RE.search(line))
                and not _allows_statistics(query)):
            continue
        # 「魚往上游」需要方向／通行證據；單純的魚道結構或巡查狀態
        # 不是這個問題的答案。
        if 'direction' in concepts and 'fish_movement' in concepts and not re.search(
                r'上游|下游|往上|往下|上溯|下溯|通行|洄游|溯游|捕獲|電捕|陷阱|相機|標放',
                line, flags=re.IGNORECASE):
            continue
        if is_relevant_text(query, line):
            current_hits.append(line)
    flush()

    result = '\n'.join(selected)
    return result[:max(0, int(max_chars or 6500))]


def needs_environment_context(query: str, evidence_text: str = '') -> bool:
    """Whether a safe environmental/general-practice supplement is needed."""
    text = str(query or '').lower()
    evidence = str(evidence_text or '').lower()
    if not is_hengliuxi_query(text):
        return False
    access_question = bool(re.search(r'下溪|下去|進場|怎麼走|如何到|到達|路線|周邊環境|交通|人員', text))
    movement_question = bool(re.search(r'往上游|往下游|上溯|溯游|怎麼知道.*魚|如何確認.*魚', text))
    if access_question:
        return not bool(re.search(r'施工人員|下溪|施工路線|岸側|導水|擋水|安全管制|進出路線|進場路線', evidence))
    if movement_question:
        return not bool(re.search(r'往上游|上游.*通行|上溯|電捕|陷阱|相機|標放', evidence))
    return not bool(evidence.strip())


def build_environment_context(query: str) -> str:
    """Build bounded environmental context when project evidence is incomplete.

    This is explicitly labelled as general context.  It must never be used to
    invent a project-specific route, construction method, or measurement.
    """
    text = str(query or '').lower()
    if not is_hengliuxi_query(text):
        return ''

    parts = [
        '【橫流溪環境背景（依既有調查資料）】橫流溪為大甲溪支流，魚類調查樣點位於臺中市和平區；工程設施資料涵蓋約 0K+460～1K+400。',
    ]
    if re.search(r'下溪|下去|進場|怎麼走|如何到|到達|路線|周邊環境|交通|人員|修補|修復|補強|施工', text):
        parts.append(
            '【施工進出通則（非本案施工紀錄）】目前資料庫未記載本次施工人員實際下溪路線、邊坡進出方式或核定安全計畫。就山區溪流維護的一般通則，應先由既有步道或岸側可達點進場，劃設警戒與上下游管制，依雨量、流量及水位評估；必要時導水或擋水後分段修補魚道。實際涉水、繩索、機具與人員配置仍須以現勘及核定施工計畫為準。'
        )
    if re.search(r'往上游|往下游|上溯|溯游|怎麼知道.*魚|如何確認.*魚', text):
        parts.append(
            '【魚類上溯判讀通則（非本案單次實測）】判定魚是否往上游，不宜只靠單次目視；通常應在魚道上游出口或下游入口設陷阱／圍網，搭配電捕、固定攝影或標放回捕，並比對上下游及不同日期的紀錄。橫流溪特定日期與魚種仍應以魚道檢核表及原始調查紀錄為準。'
        )
    return '\n'.join(parts)


def is_answer_relevant(query: str, answer: str) -> bool:
    """Reject a fluent answer that does not address the requested subject."""
    value = str(answer or '').strip()
    if not value:
        return False
    if not is_hengliuxi_query(query):
        return True
    if _UNREQUESTED_STAT_RE.search(value) and not _allows_statistics(query):
        return False
    if re.search(r'查無|未記載|沒有足夠|資料不足|無法確認', value) and is_hengliuxi_query(query):
        return True
    return is_relevant_text(query, value, strict=True)


def route_intent(query: str) -> Dict[str, Any]:
    """判斷問題意圖，回傳 {intent, label, weights, matchedTerms}。"""
    text = (query or '').strip()
    scores: Dict[str, float] = {}
    matched: Dict[str, List[str]] = {}

    for rule in INTENT_RULES:
        score, hits = 0.0, []
        for pattern in rule.get('patterns', []):
            found = re.findall(pattern, text, flags=re.IGNORECASE)
            if found:
                score += len(found)
                hits += [f for f in found if isinstance(f, str)]
        for term in rule.get('terms', []):
            if term in text:
                # 具名實體（魚種、設施名）比一般關鍵字更能決定意圖
                score += 2.5
                hits.append(term)
        if score > 0:
            scores[rule['intent']] = score
            matched[rule['intent']] = hits

    if not scores:
        return {'intent': 'general', 'label': '一般查詢',
                'weights': dict(_DEFAULT_WEIGHTS), 'matchedTerms': [],
                'scores': {}}

    # 明確提到評審／委員／金質獎時，手冊意圖優先於同時出現的魚道或
    # 設施詞，否則委員題會被誤路由到一般工程資料。
    if 'review' in scores and re.search(r'評審|委員|金質獎|評分|構面|簡報|初評|問答準備|沙盤', text):
        best = 'review'
    elif 'report' in scores and re.search(
            r'成果報告|報告書|技術服務案|設計書架|設計重點|設計依據|報告內容', text):
        best = 'report'
    else:
        best = max(scores, key=lambda k: scores[k])
    rule = next(r for r in INTENT_RULES if r['intent'] == best)
    weights = dict(rule['weights'])

    # 手冊若近乎逐字命中某一組預期提問，代表這題本來就是評審沙盤推演題，
    # 此時不論意圖判為何者，都應以手冊為主要依據。
    top = (search_handbook(text, limit=1) or [{}])[0].get('score', 0)
    if best != 'report' and top >= 12:
        weights['handbook'] = 1.0
    elif best != 'report' and top >= 5:
        weights['handbook'] = max(weights.get('handbook', 0.0), 0.7)

    # 次要意圖也納入：問題常同時橫跨兩個面向（例如「魚道損壞影響魚類通行嗎」）
    for intent, score in scores.items():
        if intent == best or score < scores[best] * 0.5:
            continue
        for source, weight in next(
                r for r in INTENT_RULES if r['intent'] == intent)['weights'].items():
            weights[source] = max(weights.get(source, 0.0), weight * 0.7)

    return {'intent': best, 'label': rule['label'], 'weights': weights,
            'matchedTerms': sorted(set(matched.get(best, []))), 'scores': scores}


def query_terms(query: str) -> List[str]:
    """擷取檢索關鍵詞。

    具名實體（魚種、陸域物種、設施、編號、年度）優先；只有在找不到
    足夠具名實體時，才退回雙字滑窗，避免產生「鱲他」「歡甚」這類雜訊詞。
    """
    text = (query or '')
    terms: List[str] = []

    terms += re.findall(r'\d+K\+\d+|溪構\d+(?:-\d+)?|平台\d+|樣站\d+|FD\d+|\d{3,4}年',
                        text, flags=re.IGNORECASE)
    for group in (FISH_SPECIES, LAND_SPECIES, FACILITY_TERMS, REVIEWERS):
        terms += [t for t in group if t in text]

    # 已命中的實體先從文字中挖掉，剩餘部分才做雙字滑窗；
    # 否則「粗首馬口鱲」會同時產生「粗首／首馬／馬口／口鱲」等碎片雜訊。
    remainder = text
    for term in sorted(set(terms), key=len, reverse=True):
        remainder = remainder.replace(term, '　')

    stop = set('他她它的了嗎呢吧啊喔哦嘛甚什麼怎樣如何是否可以請問我們你們有無會要'
               '這那些個並且或但因為所以之於在與和及對於能將把被就都還也很更最')
    for token in re.findall(r'[一-鿿]{2,}', remainder):
        if token == '橫流溪':
            continue
        for i in range(max(1, len(token) - 1)):
            bigram = token[i:i + 2]
            if len(bigram) == 2 and not (set(bigram) & stop):
                terms.append(bigram)

    seen, out = set(), []
    for term in terms + ['橫流溪']:
        if term and term not in seen:
            seen.add(term)
            out.append(term)
    return out


# ── 評審手冊檢索 ──────────────────────────────────────────────────────
_handbook_cache: Dict[str, Any] = {}


def load_handbook() -> Dict[str, Any]:
    if _handbook_cache:
        return _handbook_cache
    try:
        with open(_HANDBOOK_PATH, encoding='utf-8') as f:
            _handbook_cache.update(json.load(f))
    except Exception as exc:
        logger.info('[ANSWER] 評審手冊未載入：%s', exc)
    return _handbook_cache


def search_handbook(query: str, limit: int = 4) -> List[Dict[str, Any]]:
    """在手冊問答中找出最相關的幾組，並回傳可引用的段落。"""
    data = load_handbook()
    if not data:
        return []

    # 「評分構面有哪些」應回傳 criteria 結構，不要因「金質獎」兩字
    # 的雙字切詞誤命中一題委員問答。
    if (re.search(r'評分|構面|指標', query) and
            not re.search(r'委員|問答|提問|問題|建議|如何|為何|是否|準備', query)):
        return []

    terms = [t for t in query_terms(query) if t != '橫流溪']
    required = _required_concepts(query)
    query_groups = query_concepts(query)
    hits: List[Tuple[float, Dict[str, Any]]] = []

    for item in data.get('qa', []):
        question = str(item.get('question', ''))
        answer = str(item.get('answer', ''))
        question_groups = {
            group for group, group_terms in query_concepts(question).items()
            if group in required or group in query_groups
        }
        # 使用者若同時問「魚道」與「修補」，手冊題目本身也必須同時
        # 涵蓋這兩個概念；不要因建議回覆裡偶然出現相同詞就誤命中。
        if required and not required.issubset(question_groups):
            continue
        requested_repair_terms = query_groups.get('repair', [])
        strong_repair_terms = [term for term in requested_repair_terms
                               if term not in ('維護', '進場')]
        if strong_repair_terms and not any(
                term in question for term in
                ('修補', '修復', '補強', '維修', '搶修', '清淤', '施工')):
            continue
        question_haystack = f"{question}\n{answer}"
        score = sum(1.0 for t in terms if t in question_haystack)
        score += sum(1.5 for t in terms if t in question)
        if item.get('reviewer') and item['reviewer'] in query:
            score += 5.0
        if score > 0:
            hits.append((score, item))

    hits.sort(key=lambda x: x[0], reverse=True)
    out = []
    for score, item in hits[:limit]:
        out.append({
            'type': 'handbook_qa',
            'reviewer': item.get('reviewer', ''),
            'code': item.get('code', ''),
            'question': item.get('question', ''),
            'answer': item.get('answer', ''),
            'pages': item.get('pages', []),
            'score': round(score, 2),
        })
    return out


def handbook_reference(query: str) -> str:
    """組出手冊相關內容的 context 區塊（含委員背景、評分構面、平台模組）。"""
    data = load_handbook()
    if not data:
        return ''

    parts: List[str] = []

    named = [r for r in data.get('reviewers', []) if r.get('姓名', '') in query]
    if named:
        for r in named:
            parts.append(
                f"【委員背景】{r.get('姓名')}｜{r.get('職銜', r.get('背景',''))}\n"
                f"關注重點：{r.get('關注重點','')}\n"
                f"簡報建議：{r.get('簡報建議','')}")

    if re.search(r'評分|構面|指標|項目', query):
        rows = '\n'.join(f"・{c['指標']}：{c['評審項目']}" for c in data.get('criteria', []))
        if rows:
            parts.append(f"【金質獎公共設施維護管理獎 評分構面】\n{rows}")

    if re.search(r'平台|模組|功能|系統', query):
        rows = '\n'.join(f"・{m['模組']}：{m['內容概要']}"
                         for m in data.get('platformModules', []))
        if rows:
            parts.append(f"【橫流溪管理平台功能模組】\n{rows}")

    for qa in search_handbook(query):
        tag = f"{qa['reviewer']}委員 {qa['code']}".strip()
        pages = f"（簡報 P.{'、P.'.join(qa['pages'])}）" if qa['pages'] else ''
        parts.append(f"【手冊問答｜{tag}】{pages}\n"
                     f"預期提問：{qa['question']}\n"
                     f"建議回覆：{qa['answer']}")

    return '\n\n'.join(parts)


# ── 相關性把關 ────────────────────────────────────────────────────────
def filter_sources(sources: Dict[str, str], weights: Dict[str, float],
                   min_weight: float = 0.25) -> Tuple[Dict[str, str], List[str]]:
    """依意圖權重挑出要納入 context 的來源。

    回傳 (採用的來源, 被排除的來源名稱)。權重為 0 或低於門檻者一律排除，
    這是避免「問生態卻回巡查統計」的關鍵一步。
    """
    kept, dropped = {}, []
    for name, text in sources.items():
        if not (text or '').strip():
            continue
        if weights.get(name, _DEFAULT_WEIGHTS.get(name, 0.5)) < min_weight:
            dropped.append(name)
            continue
        kept[name] = text
    return kept, dropped


def needs_web_search(query: str, intent: Dict[str, Any],
                     local_chars: int, force: Any = 'auto') -> bool:
    """判斷是否需要外部網路檢索。

    除了使用者明示，另有兩種情況會自動啟用：
    問題明顯屬於平台資料庫涵蓋範圍之外（法規、標準、他案比較、學名生態習性），
    或本地檢索到的內容過少不足以支撐回答。
    """
    if isinstance(force, bool):
        return force
    text = str(force).strip().lower()
    if text not in ('auto', '', 'none'):
        return text not in ('0', 'false', 'no', 'off')

    if re.search(r'網路|外部|最新法規|新聞|天氣|颱風|氣象|公開資料|其他縣市|國外|案例比較',
                 query):
        return True
    # 生態習性、學名、分類等問題，平台資料庫多半只有調查數量而無生物學描述
    if re.search(r'習性|食性|生活史|產卵|繁殖|分類|學名|保育等級|適合|喜歡|偏好',
                 query):
        return True
    # 需要業界基準或標準值佐證的技術問題，平台只有本案數據、缺乏比較基準
    if re.search(r'準確率|誤判|召回率|基準值|標準值|門檻|規範|國家標準|國際標準'
                 r'|一般而言|通常|業界|文獻|研究指出|如何驗證|方法論',
                 query):
        return True
    # 「怎麼進場／怎麼下溪」不是單靠一般巡查數字就能回答的問題；先查
    # 本案資料，若沒有施工進出或周邊環境證據，再以限定在橫流溪場域的
    # 外部資料或一般通則補充。
    if re.search(r'下溪|下去|進場|怎麼走|如何到|到達|路線|周邊環境|交通|人員', query):
        return True
    # 平台資料完全沒有命中時，只有橫流溪主題問題才可啟動外部補充；
    # 一般閒聊或不相關問題不得因網站有資料而被送去搜尋。
    if local_chars <= 0 and is_hengliuxi_query(query):
        return True
    return False


# ── 作答規範 ──────────────────────────────────────────────────────────
SYSTEM_PROMPT = """你是「橫流溪工程設施維護與生態資料管理」的專業幕僚，
服務對象是林業保育署臺中分署與工程顧問團隊，回答會被用於金質獎評審簡報與
維護決策，因此正確性重於完整性。

【語言】一律使用繁體中文（臺灣用語）。禁止輸出英文分析、思考過程、
工作計畫、提示詞或「The user is asking」等內部推理文字。

【最重要的規則：分清楚資料的來源層級】
回答中的每一項事實都必須屬於下列三類之一，並讓讀者看得出來屬於哪一類：
1. 平台實測資料 — 參考資料中明確記載的數值、日期、座標、紀錄。
   引用時要附上依據，例如「（依 114 年度生態調查，累計 2,061 尾）」。
2. 一般專業知識 — 水利工程、生態學的通用知識，參考資料中沒有記載。
   必須明講這是通則，例如「就一般生態習性而言……（非本案實測資料）」。
3. 尚無資料 — 參考資料查無、且不屬於可靠通則者，直接說明查無，
   並指出可從哪裡取得。

【嚴禁】
- 不得虛構數字、日期、座標、物種、文件名稱或頁碼。
- 不得把不相關的統計數字當成答案。若問的是生態習性，不要回巡查件數。
- 不得把參考資料已記載完成的調查或驗證，寫成尚未執行。
- 不得將其他溪流（裡冷溪、南湖溪等）的資料當成橫流溪資料。

【回答結構】
先直接回答問題被問到的每一個小項，再視需要補充研判或建議。
答案主體以 250 字為度；問題問幾件事就答幾件事，不要延伸。

來源標示要輕：出處寫在句子裡的括號即可（如「（P.16）」「（114年度調查）」）。
禁止另外製作「資料層級」「待補資料說明」等表格或段落——那會把答案淹沒。
查無資料時用一句話說明並指出可向何處調閱即可。
一般專業知識只在真正有助於回答時才補充，最多兩句；
若平台資料已足以回答，就不要加這段。

僅在比較多個年度、設施或方案時才用 Markdown 表格；單一主題一律用文字。
不寫客套話與免責聲明。

【查無本案資料時】先說明橫流溪資料庫查無該項具體紀錄，再視問題需要
使用「周邊環境脈絡」或標示為外部資料的一般通則。外部資料只能補充
場域與方法，不能冒充橫流溪的實測、施工路線、核定工法或最新狀態。
若補充資料也不足，直接回答無法確認；絕不可貼上與問題無關的巡查筆數、
照片張數、契約金額或其他統計。"""


def build_user_message(query: str, sources: Dict[str, str],
                       intent: Dict[str, Any], dropped: List[str],
                       web_used: bool) -> str:
    """組出使用者訊息，讓模型清楚知道每段資料的來源與可信度。"""
    blocks = []
    for name, text in sources.items():
        label = SOURCE_LABELS.get(name, name)
        blocks.append(f"===== 來源：{label} =====\n{text}")

    context = '\n\n'.join(blocks) if blocks else '（本次未取得任何平台資料）'

    notes = [f"本題判定屬於「{intent.get('label','一般查詢')}」。"]
    if intent.get('matchedTerms'):
        notes.append('題目中的關鍵實體：' + '、'.join(intent['matchedTerms']) + '。')
    if dropped:
        notes.append('與本題無關而未提供的資料類別：'
                     + '、'.join(SOURCE_LABELS.get(d, d) for d in dropped)
                     + '（請勿臆測其內容，也不要拿來充當答案）。')
    if web_used:
        notes.append('本題已併用外部網路檢索，引用網路內容時請標明來自外部資料，'
                     '且不得用來覆蓋橫流溪的實測紀錄。')
    if not blocks:
        notes.append('若參考資料為空，請直接說明查無平台資料，'
                     '並清楚區分哪些部分是一般專業知識。')

    return (f"【參考資料】\n{context}\n\n"
            f"【作答提示】\n" + '\n'.join(f'・{n}' for n in notes) + '\n\n'
            f"【使用者問題】\n{query}")


def build_messages(query: str, sources: Dict[str, str], intent: Dict[str, Any],
                   dropped: List[str], web_used: bool) -> List[Dict[str, str]]:
    return [
        {'role': 'system', 'content': SYSTEM_PROMPT},
        {'role': 'user',
         'content': build_user_message(query, sources, intent, dropped, web_used)},
    ]
