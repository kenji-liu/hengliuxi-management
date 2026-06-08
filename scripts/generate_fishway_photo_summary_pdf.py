from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "05_重新組織的工程維護資料"
OUT_FILE = OUT_DIR / "魚道影像與搶修照片_資料彙整.pdf"

FONT_CANDIDATES = [
    Path(r"C:\Windows\Fonts\msjh.ttc"),
    Path(r"C:\Windows\Fonts\mingliu.ttc"),
    Path(r"C:\Windows\Fonts\NotoSansCJK-Regular.ttc"),
]

PAGE_W = 1240
PAGE_H = 1754
MARGIN = 90


def get_font_path() -> Path:
    for candidate in FONT_CANDIDATES:
        if candidate.exists():
            return candidate
    raise RuntimeError("No CJK font found")


FONT_PATH = get_font_path()


def font(size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(str(FONT_PATH), size=size, index=0)


def draw_wrapped(draw, text, xy, fnt, fill=(30, 41, 59), width=900, line_gap=12):
    x, y = xy
    lines = []
    for para in text.split("\n"):
        if not para:
            lines.append("")
            continue
        current = ""
        for ch in para:
            test = current + ch
            if draw.textlength(test, font=fnt) > width:
                if current:
                    lines.append(current)
                current = ch
            else:
                current = test
        if current:
            lines.append(current)
    for line in lines:
        draw.text((x, y), line, font=fnt, fill=fill)
        y += fnt.size + line_gap
    return y


def new_page(title, subtitle=None):
    image = Image.new("RGB", (PAGE_W, PAGE_H), "white")
    draw = ImageDraw.Draw(image)
    draw.rectangle((0, 0, PAGE_W, 120), fill=(21, 101, 192))
    draw.text((MARGIN, 34), title, font=font(42), fill="white")
    if subtitle:
        draw.text((MARGIN, 132), subtitle, font=font(24), fill=(71, 85, 105))
    return image, draw


def add_footer(draw, page_no):
    draw.line((MARGIN, PAGE_H - 90, PAGE_W - MARGIN, PAGE_H - 90), fill=(203, 213, 225), width=2)
    draw.text(
        (MARGIN, PAGE_H - 65),
        "橫流溪工程設計書架｜魚道影像與搶修照片 PDF 彙整",
        font=font(18),
        fill=(100, 116, 139),
    )
    draw.text((PAGE_W - MARGIN - 80, PAGE_H - 65), str(page_no), font=font(18), fill=(100, 116, 139))


def build_pdf():
    pages = []

    image, draw = new_page("魚道影像與搶修照片資料彙整", "建置用途：工程設計書架 PDF 化展示，非 PDF 附檔名自書架移除")
    y = 210
    summary = [
        ("資料來源", "橫流溪動物通道智慧評估完整成果、魚道監測多媒體、第3期與第8期搶修工程照片。"),
        ("資料彙總", "6份報告書、28項多媒體、1,537張搶修工程照片，總多媒體資源1,565項。"),
        ("搶修工程分類", "第3期1,211張工作照片，另有201部輔助錄影；第8期326張後續維護工作照片。"),
        ("監測魚道類型", "9種魚道設計，搭配日間、夜間、縮時3種監測模式。"),
    ]
    for key, value in summary:
        draw.rounded_rectangle((MARGIN, y, PAGE_W - MARGIN, y + 150), radius=18, fill=(248, 250, 252), outline=(226, 232, 240), width=2)
        draw.text((MARGIN + 28, y + 24), key, font=font(28), fill=(15, 23, 42))
        draw_wrapped(draw, value, (MARGIN + 28, y + 70), font(24), width=PAGE_W - 2 * MARGIN - 56)
        y += 178
    add_footer(draw, 1)
    pages.append(image)

    image, draw = new_page("一、資料彙總表", "報告書、多媒體與搶修照片之統一索引")
    y = 210
    rows = [
        ("報告書", "6份", "期初報告、3次期中報告、期末報告、成果報告"),
        ("魚道監測影片", "11部MP4", "對應9種魚道類型之影像展示"),
        ("日夜間監測", "2部", "動物通道24小時監測資料"),
        ("縮時影像", "4部AVI", "左岸2部、右岸2部"),
        ("現場照片", "11張JPG", "勘查與監測照片"),
        ("搶修工程照片", "1,537張", "第3期與第8期工作照片合計"),
    ]
    columns = [MARGIN, MARGIN + 280, MARGIN + 500, PAGE_W - MARGIN]
    draw.rectangle((MARGIN, y, PAGE_W - MARGIN, y + 58), fill=(236, 244, 255))
    for x, label in zip([columns[0] + 18, columns[1] + 18, columns[2] + 18], ["項目", "數量", "內容說明"]):
        draw.text((x, y + 16), label, font=font(22), fill=(30, 64, 175))
    y += 58
    for item, qty, note in rows:
        draw.rectangle((MARGIN, y, PAGE_W - MARGIN, y + 82), outline=(226, 232, 240), width=1)
        draw.text((columns[0] + 18, y + 24), item, font=font(21), fill=(15, 23, 42))
        draw.text((columns[1] + 18, y + 24), qty, font=font(21), fill=(2, 132, 199))
        draw_wrapped(draw, note, (columns[2] + 18, y + 18), font(19), width=columns[3] - columns[2] - 36, line_gap=8)
        y += 82
    add_footer(draw, 2)
    pages.append(image)

    image, draw = new_page("二、搶修工程照片分類", "第3期與第8期工作照片作為工程維護履歷")
    y = 210
    blocks = [
        ("第3期搶修工程", "1,211張工作照片｜115.01.02 至 115.03.03｜24個工作日", "以魚道及周邊環境整理、清潔與改善作業為主，適合用於施工歷程、前後對比、維護頻率與AI影像辨識訓練前資料盤點。"),
        ("第8期搶修工程", "326張工作照片｜115年度後續維護", "作為後續定期維護與環境整理工作紀錄，可與第3期資料比較維護後狀態、淤積回復、通道阻塞與環境變化。"),
        ("合計", "1,537張照片 + 第3期201部輔助錄影", "建議平台保留原始媒體於資料庫或檔案儲存區；工程設計書架僅展示本PDF彙整，避免非PDF附檔名混入書架。"),
    ]
    for title, stat, desc in blocks:
        draw.rounded_rectangle((MARGIN, y, PAGE_W - MARGIN, y + 220), radius=18, fill=(250, 250, 249), outline=(214, 211, 209), width=2)
        draw.text((MARGIN + 28, y + 24), title, font=font(30), fill=(124, 45, 18))
        draw.text((MARGIN + 28, y + 72), stat, font=font(24), fill=(194, 65, 12))
        draw_wrapped(draw, desc, (MARGIN + 28, y + 120), font(22), width=PAGE_W - 2 * MARGIN - 56)
        y += 255
    add_footer(draw, 3)
    pages.append(image)

    image, draw = new_page("三、監測魚道類型與模式", "9種魚道設計 + 日間、夜間、縮時三類監測")
    y = 210
    fishways = [
        "粗石斜曲面式魚道",
        "改良型舟通式魚道",
        "階段式魚道",
        "斜坡式魚道",
        "潛越式魚道",
        "降壩魚道",
        "之字形魚道",
        "階梯式魚道",
        "動物通道相關設計",
    ]
    for idx, name in enumerate(fishways, 1):
        x = MARGIN + ((idx - 1) % 3) * 350
        yy = y + ((idx - 1) // 3) * 100
        draw.rounded_rectangle((x, yy, x + 315, yy + 70), radius=14, fill=(240, 253, 244), outline=(187, 247, 208), width=2)
        draw.text((x + 18, yy + 20), f"{idx}. {name}", font=font(19), fill=(22, 101, 52))
    y += 350
    modes = [
        ("日間監測", "觀察魚道通行、通道入口狀態、施工與維護後可視條件。"),
        ("夜間監測", "補足夜行性或低干擾時段活動紀錄，支援全天候效能判讀。"),
        ("縮時監測", "快速檢視長時間水流、棲地、通道與施工活動變化。"),
    ]
    for title, desc in modes:
        draw.rounded_rectangle((MARGIN, y, PAGE_W - MARGIN, y + 135), radius=18, fill=(239, 246, 255), outline=(191, 219, 254), width=2)
        draw.text((MARGIN + 28, y + 22), title, font=font(26), fill=(30, 64, 175))
        draw_wrapped(draw, desc, (MARGIN + 28, y + 68), font(22), width=PAGE_W - 2 * MARGIN - 56)
        y += 160
    add_footer(draw, 4)
    pages.append(image)

    image, draw = new_page("四、平台建置原則", "工程設計書架僅展示 PDF，原始資料保留於後端資料區")
    y = 220
    rules = [
        "工程設計書架展示：僅保留本 PDF 彙整檔，移除書架中 XLSX、DOCX、CSV、MD 等非 PDF 連結。",
        "原始資料保存：統計表、分析報告、日期 CSV 與索引 MD 仍保留於檔案系統，作為後端匯入、資料庫建置與查核依據。",
        "AI/RAG 使用：可將本 PDF 納入文件檢索，提供量化回答；原始多媒體不直接放入書架，應以 metadata、縮圖、檔案路徑與標籤方式管理。",
        "後續擴充：若需展示照片或影片，建議新增「媒體庫」或「工程照片庫」模組，與工程設計書架分層管理。",
    ]
    for idx, rule in enumerate(rules, 1):
        draw.ellipse((MARGIN, y + 8, MARGIN + 42, y + 50), fill=(21, 101, 192))
        draw.text((MARGIN + 13, y + 12), str(idx), font=font(22), fill="white")
        y = draw_wrapped(draw, rule, (MARGIN + 65, y), font(24), width=PAGE_W - 2 * MARGIN - 65) + 28
    add_footer(draw, 5)
    pages.append(image)

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    pages[0].save(OUT_FILE, "PDF", resolution=150.0, save_all=True, append_images=pages[1:])
    return OUT_FILE


if __name__ == "__main__":
    path = build_pdf()
    print(path)
    print(path.stat().st_size)
