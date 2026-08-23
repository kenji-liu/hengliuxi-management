"""
巡查／維護表單 PDF 產生器
======================================================================
將平台儲存的表單 JSON 紀錄，渲染成符合維護管理手冊格式的 PDF 表單。

支援表單：
  general_periodic        → 表3-1 一般性定期巡查表單
  professional_structure  → 表3-2 構造物調查表單
  professional_fishway    → 表3-3 魚道檢核表（附錄三）
  maintenance_completion  → 維護完工回報表單

字型：嵌入 PyMuPDF 內建的 Droid Sans Fallback（Apache-2.0，含完整 CJK 字符）。
      PyMuPDF 已是既有相依套件，故不需另外附帶字型檔，且 Windows／Render 產出一致。
      非嵌入式 CID 字型（如 MSung-Light）需閱讀器自備 Adobe CJK 字型，會在
      多數環境顯示亂碼，故不採用。
"""

from __future__ import annotations

import io
import logging
import os
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, List, Tuple

logger = logging.getLogger(__name__)

# ── reportlab ────────────────────────────────────────────────────────
try:
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.styles import ParagraphStyle
    from reportlab.lib.units import mm
    from reportlab.pdfbase import pdfmetrics
    from reportlab.pdfbase.ttfonts import TTFont
    from reportlab.platypus import (
        BaseDocTemplate, CondPageBreak, Frame, PageTemplate, Paragraph, Spacer,
        Table, TableStyle, KeepTogether,
    )
    REPORTLAB_AVAILABLE = True
except Exception as exc:  # pragma: no cover - 環境未安裝時降級
    REPORTLAB_AVAILABLE = False
    logger.warning("[form_pdf] reportlab 不可用：%s", exc)


CJK_FONT = "HLXSans"              # 內部字型代號（實際來源見 _ensure_font）
_FONT_READY = False

# 平台配色
C_PRIMARY = colors.HexColor("#0f766e")
C_HEAD_BG = colors.HexColor("#e6f4f1")
C_LABEL_BG = colors.HexColor("#f1f5f9")
C_LINE = colors.HexColor("#94a3b8")
C_TEXT = colors.HexColor("#1e293b")
C_MUTED = colors.HexColor("#64748b")
C_ALERT = colors.HexColor("#b91c1c")

TPE = timezone(timedelta(hours=8))


# ── 表單定義 ─────────────────────────────────────────────────────────
FORM_META: Dict[str, Dict[str, str]] = {
    "general_periodic": {
        "code": "表 3-1",
        "title": "一般性定期巡查表單",
        "folder": "巡查資料管理/一般巡查",
        "source": "維護管理手冊 表3-1",
    },
    "professional_structure": {
        "code": "表 3-2",
        "title": "構造物調查表單",
        "folder": "巡查資料管理/專業巡查/構造物調查表單",
        "source": "維護管理手冊 表3-2；107-108 成果報告 表5-1",
    },
    "professional_fishway": {
        "code": "表 3-3",
        "title": "魚道檢核表",
        "folder": "巡查資料管理/專業巡查/魚道檢核表",
        "source": "維護管理手冊 表3-3（附錄三）",
    },
    "maintenance_completion": {
        "code": "",
        "title": "維護完工回報表單",
        "folder": "巡查資料管理/維護完工回報",
        "source": "維護管理手冊 維護完工回報",
    },
}

_DEFAULT_META = {
    "code": "",
    "title": "巡查紀錄表單",
    "folder": "巡查資料管理",
    "source": "維護管理手冊",
}


def form_meta(form_type: str) -> Dict[str, str]:
    return FORM_META.get(form_type or "", _DEFAULT_META)


# ── 工具 ─────────────────────────────────────────────────────────────
def _cjk_font_bytes() -> bytes:
    """取得可嵌入 PDF 的繁體中文 TTF。

    優先使用 PyMuPDF 內建的 Droid Sans Fallback（Apache-2.0，含完整 CJK 字符，
    已是本專案既有相依套件），跨平台一致且不需另外附帶字型檔；
    取不到時再退回專案內或系統字型。
    """
    try:
        import fitz
        buf = fitz.Font("china-t").buffer
        if buf:
            return bytes(buf)
    except Exception as exc:
        logger.warning("[form_pdf] 無法取得 PyMuPDF 內建 CJK 字型：%s", exc)

    candidates = [
        os.path.join(os.path.dirname(__file__), "assets", "fonts", "NotoSansTC-Regular.ttf"),
        "/usr/share/fonts/truetype/droid/DroidSansFallbackFull.ttf",
        "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc",
        r"C:\Windows\Fonts\msjh.ttc",
        r"C:\Windows\Fonts\kaiu.ttf",
    ]
    for path in candidates:
        if os.path.exists(path):
            with open(path, "rb") as f:
                return f.read()
    raise RuntimeError("CJK_FONT_NOT_FOUND")


def _ensure_font() -> None:
    """註冊嵌入式繁中字型。粗體對應同一字型，避免 <b> 退回 Helvetica 產生亂碼。"""
    global _FONT_READY
    if _FONT_READY:
        return
    font_bytes = _cjk_font_bytes()
    pdfmetrics.registerFont(TTFont(CJK_FONT, io.BytesIO(font_bytes)))
    pdfmetrics.registerFont(TTFont(f"{CJK_FONT}-Bold", io.BytesIO(font_bytes)))
    pdfmetrics.registerFontFamily(
        CJK_FONT, normal=CJK_FONT, bold=f"{CJK_FONT}-Bold",
        italic=CJK_FONT, boldItalic=f"{CJK_FONT}-Bold")
    _FONT_READY = True


def _s(value: Any, dash: str = "─") -> str:
    """安全轉字串；空值回傳破折號。"""
    if value is None:
        return dash
    if isinstance(value, bool):
        return "是" if value else "否"
    if isinstance(value, (list, tuple)):
        items = [_s(v, "") for v in value if _s(v, "")]
        return "、".join(items) if items else dash
    if isinstance(value, dict):
        items = [f"{k}：{_s(v, '')}" for k, v in value.items() if _s(v, "")]
        return "；".join(items) if items else dash
    text = str(value).strip()
    return text if text else dash


def _esc(value: Any, dash: str = "─") -> str:
    """轉字串並跳脫 Paragraph 的 XML 標記。"""
    text = _s(value, dash)
    return (text.replace("&", "&amp;").replace("<", "&lt;")
                .replace(">", "&gt;").replace("\n", "<br/>"))


def _roc_date(value: Any) -> str:
    """西元日期字串 → 「民國 OOO 年 O 月 O 日（YYYY-MM-DD）」。"""
    raw = _s(value, "")
    if not raw:
        return "─"
    for fmt in ("%Y-%m-%d", "%Y/%m/%d", "%Y-%m-%dT%H:%M", "%Y-%m-%d %H:%M"):
        try:
            dt = datetime.strptime(raw[: len(fmt) + 2].strip(), fmt)
            return f"民國 {dt.year - 1911} 年 {dt.month} 月 {dt.day} 日（{dt:%Y-%m-%d}）"
        except ValueError:
            continue
    return raw


def _styles() -> Dict[str, ParagraphStyle]:
    _ensure_font()
    base = dict(fontName=CJK_FONT, textColor=C_TEXT, leading=13)
    return {
        "title": ParagraphStyle("t", fontName=CJK_FONT, fontSize=16, leading=21,
                                alignment=1, textColor=C_PRIMARY, spaceAfter=2),
        "subtitle": ParagraphStyle("st", fontName=CJK_FONT, fontSize=9, leading=13,
                                   alignment=1, textColor=C_MUTED, spaceAfter=8),
        "section": ParagraphStyle("sec", fontName=CJK_FONT, fontSize=11, leading=15,
                                  textColor=colors.white, leftIndent=4),
        "cell": ParagraphStyle("c", fontSize=9, **base),
        "label": ParagraphStyle("l", fontSize=9, textColor=colors.HexColor("#334155"),
                                fontName=CJK_FONT, leading=13),
        "alert": ParagraphStyle("a", fontSize=9, fontName=CJK_FONT, leading=13,
                                textColor=C_ALERT),
        "note": ParagraphStyle("n", fontSize=8, fontName=CJK_FONT, leading=11,
                               textColor=C_MUTED),
    }


def _section(title: str, st) -> Table:
    """區段標題列（實心底色）。"""
    tbl = Table([[Paragraph(_esc(title), st["section"])]],
                colWidths=[180 * mm], rowHeights=[6.4 * mm])
    tbl.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), C_PRIMARY),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 2),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
    ]))
    return tbl


def _block(title: str, content: Any, st) -> List[Any]:
    """區段標題＋內容。標題前預留最小空間，避免標題落單在頁尾。

    回傳 list（呼叫端以 += 展開），不使用 KeepTogether：
    巢狀 KeepTogether 在 reportlab 會誤判高度而整段跳頁留下大片空白。
    """
    items: List[Any] = [CondPageBreak(26 * mm), _section(title, st), Spacer(1, 2)]
    items += content if isinstance(content, list) else [content]
    items.append(Spacer(1, 4))
    return items


def _flatten(items: Any) -> List[Any]:
    """把 _block() 產生的巢狀 list 攤平成單一 flowable 序列。"""
    out: List[Any] = []
    for item in items:
        if isinstance(item, list):
            out.extend(_flatten(item))
        else:
            out.append(item)
    return out


def _kv_table(rows: List[Tuple[str, Any]], st, cols: int = 2) -> Table:
    """標籤/值表格。cols=2 表示一列放兩組標籤值。"""
    label_w, value_w = 30 * mm, 60 * mm
    if cols == 1:
        label_w, value_w = 30 * mm, 150 * mm

    data, spans = [], []
    buf: List[Any] = []
    for label, value in rows:
        full = str(label).startswith("*")           # 「*標籤」＝整列跨欄
        clean = str(label).lstrip("*")
        if full or cols == 1:
            if buf:                                  # 先收掉未滿的一列
                buf += [""] * (cols * 2 - len(buf))
                data.append(buf)
                buf = []
            spans.append(len(data))
            data.append([Paragraph(_esc(clean), st["label"]),
                         Paragraph(_esc(value), st["cell"]), "", ""])
            continue
        buf += [Paragraph(_esc(clean), st["label"]),
                Paragraph(_esc(value), st["cell"])]
        if len(buf) >= cols * 2:
            data.append(buf)
            buf = []
    if buf:
        buf += [""] * (cols * 2 - len(buf))
        data.append(buf)

    if not data:
        return Spacer(1, 0)

    widths = [label_w, value_w] * cols if cols == 2 else [label_w, value_w]
    tbl = Table(data, colWidths=widths, repeatRows=0)
    style = [
        ("GRID", (0, 0), (-1, -1), 0.6, C_LINE),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 5),
        ("RIGHTPADDING", (0, 0), (-1, -1), 5),
        ("TOPPADDING", (0, 0), (-1, -1), 3),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
        ("BACKGROUND", (0, 0), (0, -1), C_LABEL_BG),
    ]
    if cols == 2:
        style.append(("BACKGROUND", (2, 0), (2, -1), C_LABEL_BG))
    for r in spans:
        style.append(("SPAN", (1, r), (-1, r)))
        if cols == 2:
            style.append(("BACKGROUND", (2, r), (2, r), colors.white))
    tbl.setStyle(TableStyle(style))
    return tbl


def _grid_table(header: List[str], rows: List[List[Any]], widths: List[float], st) -> Table:
    data = [[Paragraph(f"<b>{_esc(h)}</b>", st["label"]) for h in header]]
    for row in rows:
        data.append([Paragraph(_esc(c), st["cell"]) for c in row])
    tbl = Table(data, colWidths=widths, repeatRows=1)
    tbl.setStyle(TableStyle([
        ("GRID", (0, 0), (-1, -1), 0.6, C_LINE),
        ("BACKGROUND", (0, 0), (-1, 0), C_HEAD_BG),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 5),
        ("RIGHTPADDING", (0, 0), (-1, -1), 5),
        ("TOPPADDING", (0, 0), (-1, -1), 3),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
    ]))
    return tbl


def _free_text(value: Any, st, min_h: float = 16 * mm) -> Table:
    tbl = Table([[Paragraph(_esc(value), st["cell"])]],
                colWidths=[180 * mm], rowHeights=[min_h])
    tbl.setStyle(TableStyle([
        ("GRID", (0, 0), (-1, -1), 0.6, C_LINE),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
    ]))
    return tbl


def _signature_block(data: Dict[str, Any], st) -> Table:
    inspector = _esc(data.get("inspector") or data.get("executor"))
    header = ["填表／檢查人員", "審核（主管）", "填表日期"]
    body = [inspector, "", _roc_date(data.get("date"))]
    tbl = Table([[Paragraph(f"<b>{h}</b>", st["label"]) for h in header],
                 [Paragraph(b, st["cell"]) for b in body]],
                colWidths=[60 * mm] * 3, rowHeights=[6.4 * mm, 14 * mm])
    tbl.setStyle(TableStyle([
        ("GRID", (0, 0), (-1, -1), 0.6, C_LINE),
        ("BACKGROUND", (0, 0), (-1, 0), C_LABEL_BG),
        ("VALIGN", (0, 1), (-1, 1), "BOTTOM"),
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("LEFTPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 1), (-1, 1), 5),
    ]))
    return tbl


def _deru_legend(st) -> Paragraph:
    return Paragraph(
        "DER&amp;U 評估說明：D＝損壞程度（0 無～4 嚴重）、E＝影響範圍（1 局部～4 全面）、"
        "R＝修復難易（1 易～4 難）、U＝緊急度（U1 例行觀察／U2 追蹤／U3 儘速處理／U4 立即處理）。",
        st["note"])


# ── 各表單內容 ───────────────────────────────────────────────────────
def _body_general(d: Dict[str, Any], st) -> List[Any]:
    """表3-1 一般性定期巡查表單。"""
    flow: List[Any] = [
        _block("一、基本資料", _kv_table([
            ("巡查日期", _roc_date(d.get("date"))),
            ("巡查人員", d.get("inspector")),
            ("設施名稱", d.get("facilityName")),
            ("設施編號", d.get("facilityId")),
        ], st), st),
    ]

    rows = d.get("gf_rows") or {}
    if isinstance(rows, dict) and rows:
        body = []
        for name, item in rows.items():
            item = item if isinstance(item, dict) else {}
            conds = item.get("conditions") or []
            abnormal = [c for c in conds if _s(c, "") and c != "正常"]
            body.append([
                name,
                "、".join(abnormal) if abnormal else "正常",
                item.get("treatment") or "定期巡查",
                item.get("notes"),
            ])
        flow.append(_block("二、各項設施巡查結果", _grid_table(
            ["巡查項目", "現況檢視", "處理方式", "備註"], body,
            [42 * mm, 52 * mm, 38 * mm, 48 * mm], st), st))

    flow += [
        _block("三、綜合研判", _kv_table([
            ("*巡查發現", d.get("findings")),
            ("*處理／建議", d.get("action")),
            ("處理狀態", d.get("status")),
            ("優先度", d.get("priority")),
        ], st), st),
        _block("四、備註", _free_text(d.get("remark") or d.get("notes"), st), st),
    ]
    return flow


def _body_structure(d: Dict[str, Any], st) -> List[Any]:
    """表3-2 構造物調查表單。"""
    env = d.get("sf_env") if isinstance(d.get("sf_env"), dict) else {}
    repair = d.get("sf_repairWork") if isinstance(d.get("sf_repairWork"), dict) else {}

    flow: List[Any] = [
        _block("一、基本資料", _kv_table([
            ("檢測日期", _roc_date(d.get("date"))),
            ("檢查人員", d.get("inspector")),
            ("調查單位", d.get("sf_unit")),
            ("構造物編號", d.get("sf_no")),
            ("構造物名稱", d.get("facilityName")),
            ("管理機關", d.get("sf_mgUnit")),
            ("縣市", d.get("sf_county")),
            ("鄉鎮區", d.get("sf_township")),
            ("事業區／林班", d.get("sf_forest")),
            ("TWD97 座標", f"X={_s(d.get('sf_x'))}　Y={_s(d.get('sf_y'))}"),
        ], st), st),

        _block("二、構造物概況", _kv_table([
            ("構造物型式", d.get("sf_structType")),
            ("主要材質", d.get("sf_mat")),
            ("*尺寸規模", d.get("sf_dims")),
        ], st), st),

        _block("三、周邊環境檢視", _kv_table([
            ("河岸狀況", env.get("riverBank")),
            ("邊坡狀況", env.get("slope")),
            ("步道狀況", env.get("trail")),
            ("排水設施", env.get("drainage")),
            ("指示標誌", env.get("trafficSign")),
            ("安全標誌", env.get("safetySign")),
        ], st), st),

        _block("四、外觀檢視與損壞原因", _kv_table([
            ("*外觀檢視結果", d.get("sf_visual") or "外觀良好，未發現異常"),
            ("*研判損壞原因", d.get("sf_dmgReasons") or "無（未發現損壞）"),
        ], st), st),
    ]

    items = d.get("sf_deruItems") or []
    body = []
    for it in items:
        it = it if isinstance(it, dict) else {}
        if not (_s(it.get("defectType"), "") or _s(it.get("note"), "") or it.get("d")):
            continue
        body.append([it.get("defectType") or "─", it.get("d"), it.get("e"),
                     it.get("r"), it.get("note")])
    if not body:
        body = [["未發現損壞項目", 0, 1, 1, "外觀良好、功能健全"]]

    flow += [
        _block("五、DER&U 損壞評估", [
            _grid_table(["損壞類型", "D 損壞", "E 影響", "R 修復", "說明"], body,
                        [50 * mm, 18 * mm, 18 * mm, 18 * mm, 76 * mm], st),
            Spacer(1, 3), _deru_legend(st),
        ], st),

        _block("六、綜合評定與處置", _kv_table([
            ("設施評級", d.get("sf_grade")),
            ("DER&U 綜合",
             f"D{_s(d.get('deru_d'), '0')}／E{_s(d.get('deru_e'), '1')}／"
             f"R{_s(d.get('deru_r'), '1')}・U{_s(d.get('deru_u'), '1')}"),
            ("ICS 等級", d.get("sf_icsGrade")),
            ("廊道連通性", d.get("sf_corridor")),
            ("處理方式", d.get("sf_treatment")),
            ("處理狀態", d.get("status")),
            ("優先度", d.get("priority")),
            ("預計完成", d.get("expectedCompletion")),
            ("實際完成", d.get("completedAt")),
            ("修復工法", repair.get("method")),
            ("修復規模", repair.get("scale")),
            ("預估經費", repair.get("cost")),
        ], st), st),

        _block("七、現場描述與建議",
               _free_text(d.get("sf_description") or d.get("findings"), st, 18 * mm), st),
    ]
    return flow


def _body_fishway(d: Dict[str, Any], st) -> List[Any]:
    """表3-3 魚道檢核表（附錄三）。"""
    repair = d.get("fw_repairWork") if isinstance(d.get("fw_repairWork"), dict) else {}

    flow: List[Any] = [
        _block("一、基本資料", _kv_table([
            ("檢核日期", _roc_date(d.get("date"))),
            ("檢核人員", d.get("inspector")),
            ("檢核單位", d.get("fw_unit")),
            ("魚道編號", d.get("fw_no")),
            ("魚道名稱", d.get("facilityName")),
            ("魚道型式", d.get("fw_fishwayType")),
            ("*TWD97 座標", f"X={_s(d.get('fw_x'))}　Y={_s(d.get('fw_y'))}"),
        ], st), st),
    ]

    items = d.get("fw_deruItems") or []
    body = []
    for it in items:
        it = it if isinstance(it, dict) else {}
        body.append([it.get("name") or "─", it.get("d"), it.get("e"),
                     it.get("r"), it.get("note")])
    if not body:
        body = [[n, 0, 1, 1, ""] for n in ("結構破損", "土砂淤積", "水位差異", "斷流")]

    flow += [
        _block("二、DER&U 四項檢核評估", [
            _grid_table(["檢核項目", "D 損壞", "E 影響", "R 修復", "說明"], body,
                        [40 * mm, 18 * mm, 18 * mm, 18 * mm, 86 * mm], st),
            Spacer(1, 3), _deru_legend(st),
        ], st),

        _block("三、整體評估", _kv_table([
            ("*維護等級", d.get("fw_grade")),
            ("DER&U 綜合",
             f"D{_s(d.get('deru_d'), '0')}／E{_s(d.get('deru_e'), '1')}／"
             f"R{_s(d.get('deru_r'), '1')}・U{_s(d.get('deru_u'), '1')}"),
            ("魚類通行觀察", d.get("fw_fishPresent")),
            ("處理方式", d.get("fw_treatment")),
            ("處理狀態", d.get("status")),
            ("優先度", d.get("priority")),
            ("修復工法", repair.get("method")),
            ("預估經費", repair.get("cost")),
        ], st), st),

        _block("四、現場描述",
               _free_text(d.get("fw_description") or d.get("findings"), st, 22 * mm), st),
        _block("五、備註", _free_text(d.get("fw_remark"), st, 14 * mm), st),
    ]
    return flow


def _body_maintenance(d: Dict[str, Any], st) -> List[Any]:
    """維護完工回報表單。"""
    flow: List[Any] = [
        _block("一、通報與執行資料", _kv_table([
            ("完工日期", _roc_date(d.get("date"))),
            ("維護設施", d.get("facilityName")),
            ("執行人員", d.get("executor") or d.get("inspector")),
            ("通報人", d.get("reporter")),
            ("通報單位", d.get("reportUnit")),
            ("通報時間", _s(d.get("reportTime"), "").replace("T", " ") or "─"),
        ], st), st),

        _block("二、維護前狀況", _free_text(d.get("beforeDesc"), st, 20 * mm), st),
        _block("三、維護工法與作業內容",
               _free_text(d.get("method") or d.get("action"), st, 20 * mm), st),
        _block("四、維護後狀況", _free_text(d.get("afterDesc"), st, 20 * mm), st),

        _block("五、完工評定", _kv_table([
            ("DER&U 評定",
             f"D{_s(d.get('deru_d'), '0')}／E{_s(d.get('deru_e'), '1')}／"
             f"R{_s(d.get('deru_r'), '1')}・U{_s(d.get('deru_u'), '1')}"),
            ("評定說明", d.get("deru_label")),
            ("處理狀態", d.get("status")),
            ("優先度", d.get("priority")),
            ("*對應巡查紀錄編號", d.get("relatedInspIds") or "無"),
        ], st), st),

        _block("六、後續追蹤事項", _free_text(d.get("followUp"), st, 18 * mm), st),
    ]
    return flow


_BODY_BUILDERS = {
    "general_periodic": _body_general,
    "professional_structure": _body_structure,
    "professional_fishway": _body_fishway,
    "maintenance_completion": _body_maintenance,
}


def _body_generic(d: Dict[str, Any], st) -> List[Any]:
    """未知表單型別：以欄位清單完整呈現，確保資料不遺漏。"""
    skip = {"photoDataUrls", "photos", "_syncedAt", "_formType"}
    rows = [(k, v) for k, v in d.items() if k not in skip and _s(v, "")]
    return [_block("表單內容", _kv_table([(k, v) for k, v in rows], st, cols=1), st)]


# ── 主要入口 ─────────────────────────────────────────────────────────
def render_form_pdf(data: Dict[str, Any], form_type: str = "") -> bytes:
    """把一筆表單紀錄渲染成 PDF bytes。"""
    if not REPORTLAB_AVAILABLE:
        raise RuntimeError("REPORTLAB_NOT_AVAILABLE")

    data = dict(data or {})
    form_type = form_type or _s(data.get("formType"), "")
    meta = form_meta(form_type)
    st = _styles()

    generated = datetime.now(TPE).strftime("%Y-%m-%d %H:%M")
    source_note = _s(data.get("sourcePdf") or data.get("pdfSource"), "") or meta["source"]
    heading = f"{meta['code']}　{meta['title']}".strip() if meta["code"] else meta["title"]

    def _page(canvas, doc):
        canvas.saveState()
        # 頁首細線
        canvas.setStrokeColor(C_PRIMARY)
        canvas.setLineWidth(1.6)
        canvas.line(15 * mm, A4[1] - 14 * mm, A4[0] - 15 * mm, A4[1] - 14 * mm)
        # 頁尾
        canvas.setFont(CJK_FONT, 7.5)
        canvas.setFillColor(C_MUTED)
        canvas.drawString(15 * mm, 10 * mm, f"資料來源：{source_note}")
        canvas.drawRightString(A4[0] - 15 * mm, 10 * mm,
                               f"產出：{generated}　第 {doc.page} 頁")
        canvas.setStrokeColor(C_LINE)
        canvas.setLineWidth(0.5)
        canvas.line(15 * mm, 13 * mm, A4[0] - 15 * mm, 13 * mm)
        canvas.restoreState()

    buf = io.BytesIO()
    doc = BaseDocTemplate(
        buf, pagesize=A4,
        leftMargin=15 * mm, rightMargin=15 * mm,
        topMargin=18 * mm, bottomMargin=16 * mm,
        title=f"{heading}－{_s(data.get('facilityName'), '')}",
        author="橫流溪工程設施維護與資料管理平台",
        subject=meta["source"],
    )
    frame = Frame(doc.leftMargin, doc.bottomMargin, doc.width, doc.height, id="main")
    doc.addPageTemplates([PageTemplate(id="form", frames=[frame], onPage=_page)])

    flow: List[Any] = [
        Paragraph(_esc(heading), st["title"]),
        Paragraph("橫流溪工程設施維護與資料管理平台　—　林業保育署臺中分署", st["subtitle"]),
    ]

    builder = _BODY_BUILDERS.get(form_type)
    flow += builder(data, st) if builder else _body_generic(data, st)

    flow += [Spacer(1, 6), KeepTogether([_signature_block(data, st)])]

    doc.build(_flatten(flow))
    return buf.getvalue()


def pdf_filename(data: Dict[str, Any], form_type: str = "") -> str:
    """產生與 Drive 一致的 PDF 檔名。"""
    form_type = form_type or _s(data.get("formType"), "")
    meta = form_meta(form_type)
    facility = _s(data.get("facilityName"), "全區")
    date = _s(data.get("date"), datetime.now(TPE).strftime("%Y-%m-%d"))
    for ch in '\\/:*?"<>|':
        facility = facility.replace(ch, "-")
        date = date.replace(ch, "-")
    return f"{meta['title']}_{facility.strip()}_{date.strip()}.pdf"
