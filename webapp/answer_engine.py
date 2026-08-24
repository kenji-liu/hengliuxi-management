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
        'intent': 'review',
        'label': '評審簡報與委員問答',
        'patterns': [
            r'評審|委員|金質獎|評分|構面|簡報|初評|問答準備|沙盤',
            r'胡培中|李振卿|賴建宏|王宜達|張坤城',
        ],
        'weights': {'handbook': 1.0, 'docs': 0.6, 'management': 0.3,
                    'facility': 0.3, 'ecology': 0.3, 'web': 0.0},
    },
    {
        'intent': 'ecology_fish',
        'label': '水域生態與魚類',
        'patterns': [
            r'魚類|魚種|水域生物|洄游|族群|尾數|捕獲|棲地|habitat',
            r'產卵|覓食|水深|流速|底質|溯游|通行',
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
            r'損壞|裂縫|淘空|沖蝕|位移|補強|妥善率',
        ],
        'terms': FACILITY_TERMS,
        'weights': {'facility': 1.0, 'management': 0.8, 'docs': 0.6,
                    'handbook': 0.3, 'ecology': 0.2, 'web': 0.2},
    },
    {
        'intent': 'inspection',
        'label': '巡查與維護管理',
        'patterns': [
            r'巡查|檢核|維護|搶修|缺失|施工|監工|日報|工程|經費|合約',
            r'頻率|處理|完工|待處理|進度|照片',
        ],
        'weights': {'management': 1.0, 'facility': 0.7, 'docs': 0.5,
                    'handbook': 0.3, 'ecology': 0.0, 'web': 0.2},
    },
]

_DEFAULT_WEIGHTS = {'docs': 1.0, 'ecology': 0.5, 'facility': 0.5,
                    'management': 0.4, 'handbook': 0.4, 'web': 0.6}

SOURCE_LABELS = {
    'handbook':   '評審委員問答準備手冊',
    'ecology':    '生態資料庫與生態調查報告',
    'facility':   '工程設施資料（DER&U、健康分數、座標）',
    'management': '巡查與維護管理紀錄',
    'docs':       '歷年報告與技術文件（RAG 檢索）',
    'platform':   '線上平台即時資料',
    'web':        '外部網路檢索',
}


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

    best = max(scores, key=lambda k: scores[k])
    rule = next(r for r in INTENT_RULES if r['intent'] == best)
    weights = dict(rule['weights'])

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

    terms = [t for t in query_terms(query) if t != '橫流溪']
    hits: List[Tuple[float, Dict[str, Any]]] = []

    for item in data.get('qa', []):
        haystack = f"{item.get('question','')}\n{item.get('answer','')}"
        score = sum(1.0 for t in terms if t in haystack)
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
    if intent.get('weights', {}).get('web', 0) >= 0.5 and local_chars < 1200:
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
先用 1～3 句直接回答問題本身，再視需要補充：
・依據：列出支持結論的具體數據與出處。
・研判：以工程或生態專業說明其意義與影響。
・建議：若問題涉及決策，給出可執行的下一步。
・資料限制：僅在確有缺漏、口徑不一致或資料衝突時列出。
涉及多年度、多方案或多設施的比較時，使用 Markdown 表格呈現。
答案要精簡到可以直接使用，不寫客套話與免責聲明。"""


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
