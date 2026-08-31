#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""金質獎評審簡報「圖上內容」判讀，並寫進 AI 答詢索引
================================================================
問題：webapp/data/briefing_slides.json 逐頁抽的是簡報的文字方塊，
      但 110 頁裡有 55 頁（50%）文字幾乎只剩標題，實際資訊全在圖上
      —— 例如 P.87「社區林業-黑熊、石虎棲地保育」抽到的文字只有
      「社區林業-黑熊、石虎棲地保育／場域位置／場域位置」，
      黑熊活動範圍圖、石虎 OI 分布圖、自動相機照片全都沒進資料庫。
      AI 因此講得出這頁叫什麼，講不出裡面有什麼。

作法：用 OpenCode Go 的視覺模型逐頁判讀 PNG，只記錄「畫面上看得到的」
      文字、數字、圖例與標註，再寫回 briefing_slides.json 與
      部署用向量庫 vector_store.jsonl。

資料口徑（依 CLAUDE.md）：
  ・判讀結果一律標記【圖面AI判讀】，來源檔名加註「（圖面判讀）」，
    不得與簡報原始文字混為一談，也不得當成報告原始數據引用。
  ・提示詞明確要求「看不清楚就寫看不清楚」，禁止推測與補值。

用法：
    python scripts/analyze_briefing_slide_images.py --images <PNG資料夾>
    python scripts/analyze_briefing_slide_images.py --images ... --dry-run
    python scripts/analyze_briefing_slide_images.py --images ... --pages 87,42
    python scripts/analyze_briefing_slide_images.py --images ... --all   # 連文字頁也判讀
"""

from __future__ import annotations

import argparse
import base64
import io
import json
import logging
import os
import re
import shutil
import sys
import time
import urllib.error
import urllib.request
from datetime import datetime
from pathlib import Path

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s",
                    datefmt="%H:%M:%S")
log = logging.getLogger("slide-vision")

PROJECT_ROOT = Path(__file__).resolve().parent.parent
DATA_DIR     = PROJECT_ROOT / "webapp" / "data"
BRIEFING     = DATA_DIR / "briefing_slides.json"
VECTOR_STORE = DATA_DIR / "vector_store.jsonl"

GO_ENDPOINT  = "https://opencode.ai/zen/go/v1/chat/completions"
EMBED_MODEL  = "all-MiniLM-L6-v2"      # 必須與既有向量一致
#  文字扣掉標題後短於這個字數，就視為「內容在圖上」
THIN_TEXT_CHARS = 40
SOURCE_SUFFIX   = "（圖面判讀）"

PROMPT = (
    "這是一份台灣公部門工程簡報的一頁。請只描述你在畫面上「實際看得到」的內容，"
    "用繁體中文條列。\n\n"
    "務必記錄：\n"
    "1. 標題與所有文字標籤（含圖上的小字、圖例、圖說、頁碼）\n"
    "2. 所有數字與單位（座數、台數、公頃、公里、年份、金額、百分比、座標）\n"
    "3. 圖表類型與它在表達什麼（折線／長條／地圖／流程圖／照片），"
    "若有座標軸與圖例請寫出軸標題與圖例項目\n"
    "4. 地圖上的地名、範圍標註、圖示意義\n"
    "5. 照片內容（例如：紅外線相機夜拍的動物、工程設施、現場人員）\n\n"
    "嚴格規則：\n"
    "・只寫畫面上看得到的。看不清楚就寫「（字太小無法辨識）」，不要猜。\n"
    "・不要補充畫面以外的背景知識，不要推論因果，不要下結論。\n"
    "・數字必須照抄，不得換算或四捨五入。\n"
    "・若整頁只有裝飾圖或空白，直接回「本頁無可判讀資訊」。"
)


#  視覺模型會把罕用字讀錯，而魚名錯字會直接污染魚類答詢。
#  實測 P.26 圖例：「臺灣石鱝」→「臺灣石鮒」、「短臀瘋鱨」→「短臂蟹」
#  （把魚讀成螃蟹）。這裡只做「已知錯法 → 平台正式名」的定點更正，
#  不做模糊比對，避免自動改字反而製造新錯誤。
#  正式名稱以 webapp/data/agent_baseline.json 的 fishKeyNames 為準。
SPECIES_FIX = {
    "臺灣石鮒": "臺灣石魚賓",
    "台灣石鮒": "臺灣石魚賓",
    "臺灣石鱝": "臺灣石魚賓",
    "短臂蟹": "短臀瘋鱨",
    "短臀瘋鱧": "短臀瘋鱨",
    "粗首馬口鱲魚": "粗首馬口鱲",
}


def normalize_species(text: str) -> tuple:
    """回傳（更正後文字, 更正紀錄）。有更正時在文末加註，保持可稽核。"""
    fixed, changes = text, []
    for wrong, right in SPECIES_FIX.items():
        if wrong in fixed:
            fixed = fixed.replace(wrong, right)
            changes.append("%s→%s" % (wrong, right))
    if changes:
        fixed += ("\n（物種名稱已依平台正式魚名更正：%s）"
                  % "、".join(changes))
    return fixed, changes


def _key() -> str:
    return (os.environ.get("OPENCODE_GO_API_KEY")
            or os.environ.get("OPENCODE_ZEN_API_KEY") or "").strip()


def load_env() -> None:
    env = PROJECT_ROOT / ".env"
    if not env.exists():
        return
    for line in io.open(env, encoding="utf-8"):
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            k, v = line.split("=", 1)
            os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))


#  PowerPoint 匯出的檔名從 0 起算（投影片0.PNG ~ 投影片110.PNG 共 111 張），
#  而 briefing_slides.json 的 page 從 1 起算，因此要 +1 才對得上。
#  校準證據（人工比對兩張）：
#    投影片86.PNG = 「社區林業-黑熊、石虎棲地保育」= 索引 page 87
#    投影片87.PNG = 「社區林業-小花蔓潭蘭清除活動」= 索引 page 88
#  可用 --page-offset 覆寫，以防日後匯出工具改變起算方式。
PAGE_OFFSET = 1


def slide_number(path: Path, offset: int = PAGE_OFFSET):
    """檔名尾端數字 + offset = briefing_slides.json 的 page。"""
    m = re.findall(r"(\d+)", path.stem)
    return int(m[-1]) + offset if m else None


#  視覺模型會先用大量 token 思考才輸出。實測 max_tokens=1200 時
#  reasoning_tokens 就用掉 1200、finish_reason=length，content 全空。
#  額度必須留到足以「想完再寫完」。
VISION_MAX_TOKENS = 4000


def describe(image_path: Path, model: str, timeout: float = 180.0,
             max_tokens: int = VISION_MAX_TOKENS) -> dict:
    b64 = base64.b64encode(image_path.read_bytes()).decode("ascii")
    payload = {
        "model": model,
        "temperature": 0.0,          # 判讀要可重現，不要創意
        "max_tokens": int(max_tokens),
        "messages": [{"role": "user", "content": [
            {"type": "text", "text": PROMPT},
            {"type": "image_url",
             "image_url": {"url": "data:image/png;base64," + b64}},
        ]}],
    }
    req = urllib.request.Request(
        GO_ENDPOINT, data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json",
                 "Authorization": "Bearer " + _key(),
                 "User-Agent": "Mozilla/5.0"}, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            result = json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        return {"error": "HTTP %s: %s" % (exc.code,
                                          exc.read()[:200].decode("utf-8", "replace"))}
    except Exception as exc:
        return {"error": "%s: %s" % (type(exc).__name__, exc)}

    choice = (result.get("choices") or [{}])[0]
    text = str((choice.get("message") or {}).get("content") or "").strip()
    #  視覺模型也可能吐 <think>，一併清掉
    text = re.sub(r"(?is)<think(?:ing)?>.*?</think(?:ing)?>", " ", text)
    if re.search(r"(?i)</think(?:ing)?>", text):
        text = re.split(r"(?i)</think(?:ing)?>", text)[-1]
    return {"text": text.strip(),
            "finish_reason": choice.get("finish_reason"),
            "usage": result.get("usage") or {}}


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--images", required=True, help="PowerPoint 匯出的 PNG 資料夾")
    ap.add_argument("--model", default=os.environ.get(
        "OPENCODE_GO_VISION_MODEL", "deepseek-v4-flash-vision-exp"))
    ap.add_argument("--pages", default="", help="只判讀指定頁（逗號分隔）")
    ap.add_argument("--all", action="store_true", help="連文字充足的頁也判讀")
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--limit", type=int, default=0, help="最多判讀幾頁（試跑用）")
    ap.add_argument("--page-offset", type=int, default=PAGE_OFFSET,
                    help="檔名數字與簡報頁碼的差值（預設 1）")
    ap.add_argument("--rebuild-index-only", action="store_true",
                    help="不呼叫視覺模型，直接用 briefing_slides.json 既有的 "
                         "visual 欄位重建向量庫段落")
    args = ap.parse_args()

    load_env()
    if not _key():
        log.error("找不到 OPENCODE_GO_API_KEY / OPENCODE_ZEN_API_KEY")
        return 2

    brief = json.loads(BRIEFING.read_text(encoding="utf-8"))
    slides = brief.get("slides") or []
    by_page = {int(s["page"]): s for s in slides if s.get("page")}
    deck = brief.get("source") or "金質獎評審簡報.pptx"
    log.info("簡報：%s（索引 %d 頁 / 全 %s 頁）",
             deck, len(slides), brief.get("totalSlides"))

    img_dir = Path(args.images)
    images = {}
    for p in sorted(img_dir.glob("*.PNG")) + sorted(img_dir.glob("*.png")):
        n = slide_number(p, args.page_offset)
        if n:
            images[n] = p
    log.info("找到 %d 張投影片圖檔", len(images))
    if not images:
        log.error("資料夾內沒有 PNG：%s", img_dir)
        return 2

    if args.pages:
        want = [int(x) for x in re.findall(r"\d+", args.pages)]
    else:
        want = []
        for page in sorted(images):
            s = by_page.get(page)
            if s is None:
                want.append(page)          # 沒被文字索引收錄的頁，一定要判讀
                continue
            body = str(s.get("text") or "").replace(str(s.get("title") or ""), "").strip()
            if args.all or len(body) < THIN_TEXT_CHARS:
                want.append(page)
    want = [p for p in want if p in images]
    if args.limit:
        want = want[:args.limit]

    log.info("待判讀 %d 頁：%s%s", len(want),
             ", ".join(str(p) for p in want[:20]),
             " …" if len(want) > 20 else "")
    if args.dry_run:
        return 0

    results = {}
    failed = []
    if args.rebuild_index_only:
        log.info("--rebuild-index-only：略過視覺判讀，僅重建向量庫段落")
        want = []
    for i, page in enumerate(want, 1):
        t0 = time.time()
        r = describe(images[page], args.model)
        #  額度被思考吃光時 content 會是空的（finish_reason=length），
        #  加倍額度再試一次，不要直接丟掉這一頁。
        if (not r.get("text")) and r.get("finish_reason") == "length":
            log.info("  P.%-3d 額度用盡（思考過長），加倍重試", page)
            r = describe(images[page], args.model,
                         max_tokens=VISION_MAX_TOKENS * 2, timeout=300.0)
        if r.get("error") or not r.get("text"):
            log.warning("  P.%-3d 失敗：%s", page, r.get("error") or "空回應")
            failed.append(page)
            continue
        results[page] = r["text"]
        log.info("  P.%-3d %4.0fs %4d字  %s", page, time.time() - t0, len(r["text"]),
                 " ".join(r["text"].split())[:52])
        if i % 10 == 0:
            io.open(PROJECT_ROOT / "slide_vision_partial.json", "w",
                    encoding="utf-8").write(
                json.dumps(results, ensure_ascii=False, indent=1))

    log.info("判讀完成 %d 頁，失敗 %d 頁", len(results), len(failed))
    if not results and not args.rebuild_index_only:
        return 1

    # ── 寫回 briefing_slides.json ────────────────────────────────
    #  既有頁面也一併套用魚名更正（先前批次判讀時還沒有這道檢查）
    for slide in brief.get("slides", []):
        if slide.get("visual"):
            fixed, changed = normalize_species(slide["visual"])
            if changed:
                slide["visual"] = fixed
                log.info("  P.%-3s 魚名更正：%s", slide.get("page"),
                         "、".join(changed))
    for page, text in results.items():
        text, _ = normalize_species(text)
        s = by_page.get(page)
        if s is None:
            s = {"page": page, "title": "", "section": "", "text": "", "notes": ""}
            slides.append(s)
            by_page[page] = s
        s["visual"] = text
        s["visualModel"] = args.model
        s["visualAt"] = datetime.now().isoformat(timespec="seconds")
    brief["slides"] = sorted(slides, key=lambda x: int(x.get("page") or 0))
    brief["visualPages"] = sorted(results)
    BRIEFING.write_text(json.dumps(brief, ensure_ascii=False, indent=1),
                        encoding="utf-8")
    log.info("已更新 %s（%d 頁加上 visual 欄位）", BRIEFING.name, len(results))

    # ── 寫進部署用向量庫 ──────────────────────────────────────────
    from sentence_transformers import SentenceTransformer
    model = SentenceTransformer(EMBED_MODEL)

    source_file = Path(deck).stem + SOURCE_SUFFIX
    existing, max_id = [], -1
    for line in io.open(VECTOR_STORE, encoding="utf-8"):
        if not line.strip():
            continue
        rec = json.loads(line)
        if rec.get("source_file") == source_file:
            continue                      # 同來源舊段落先移除，避免重複
        existing.append(line)
        m = re.findall(r"\d+", str(rec.get("id") or ""))
        if m:
            max_id = max(max_id, int(m[-1]))

    backup = VECTOR_STORE.with_suffix(
        ".jsonl.bak-" + datetime.now().strftime("%Y%m%d%H%M%S"))
    shutil.copy2(VECTOR_STORE, backup)

    #  必須用 briefing_slides.json 裡「所有」有 visual 的頁重建，不能只寫本次
    #  results。因為上面已把同來源舊段落整批移除，若只寫本次結果，補跑 2 頁
    #  就會把先前完成的 54 頁從向量庫刪掉（實測發生過：2,300 段掉回 2,247 段）。
    all_visual_pages = sorted(int(s["page"]) for s in brief["slides"]
                              if s.get("visual") and s.get("page"))
    log.info("向量庫重建範圍：briefing_slides.json 中共 %d 頁有圖面判讀",
             len(all_visual_pages))

    texts, pages = [], []
    for page in all_visual_pages:
        s = by_page.get(page) or {}
        title = str(s.get("title") or "").strip()
        head = "【圖面AI判讀】%s P.%d" % (Path(deck).stem, page)
        if title:
            head += "　" + title
        #  取 slide 的 visual（含先前批次的結果），不能取本次 results，理由同上。
        texts.append(head + "\n" + str(s.get("visual") or ""))
        pages.append(page)

    vectors = model.encode(texts, batch_size=16, show_progress_bar=False)
    new_lines = []
    doc_id = max_id + 1
    for text, page, vec in zip(texts, pages, vectors):
        new_lines.append(json.dumps({
            "id": "doc_%06d" % doc_id,
            "source_file": source_file,
            "source_path": "webapp/data/briefing_slides.json",
            "page_number": str(page),
            "chunk_index": "0",
            "text": text[:500],
            "full_text": text,
            "vector": [round(float(x), 6) for x in vec],
            "timestamp": datetime.now().isoformat(),
            "section": "%s > Slide %d > 圖面判讀" % (source_file, page),
        }, ensure_ascii=False) + "\n")
        doc_id += 1

    tmp = VECTOR_STORE.with_suffix(".jsonl.tmp")
    with tmp.open("w", encoding="utf-8") as f:
        f.writelines(existing)
        f.writelines(new_lines)
    tmp.replace(VECTOR_STORE)

    log.info("向量庫：%d + %d = %d 段（備份 %s）",
             len(existing), len(new_lines), len(existing) + len(new_lines),
             backup.name)
    if failed:
        log.warning("以下頁面判讀失敗，未寫入：%s",
                    ", ".join(str(p) for p in failed))
    return 0


if __name__ == "__main__":
    sys.exit(main())
