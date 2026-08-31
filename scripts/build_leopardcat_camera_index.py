#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""石虎自動相機樣點座標 → 與橫流溪的空間關係
================================================================
為什麼要做：
    問「石虎在橫流溪的出現次數」時，只靠文字比對「橫流溪」三個字並不可靠
    —— 石虎族群監測期中報告全份沒出現過「橫流溪」，但它到底離橫流溪多遠、
    有沒有涵蓋，文字回答不了。樣點有 TWD97 座標，用距離判斷才有依據。

資料來源（皆為報告原文表格，非推估）：
    附錄1（P.86–87）烏溪流域保育軸帶及大里溪流域紅外線自動相機樣點
                    欄位：編號 / X(TWD97) / Y(TWD97) / 起始日期 / 流域 / 石虎紀錄
    附錄3（P.88–90）臺中西部淺山森林保育軸帶紅外線自動相機樣點
                    欄位：編號 / X / Y / 海拔 / 起始日期 / 分區 / 石虎紀錄

輸出 webapp/data/leopardcat_cameras.json，並寫進部署用向量庫，
讓 AI 能回答「最近的石虎相機樣點離橫流溪多遠」這類空間問題。

口徑限制（依 CLAUDE.md）：
  ・距離是本腳本以樣點座標與橫流溪設施座標計算的衍生值，不是報告原始數據，
    輸出時一律標示為「計算值」。
  ・「石虎紀錄 有/無」照抄報告表格，不得改寫。
  ・不得因為某樣點靠近橫流溪，就把它的紀錄說成橫流溪的紀錄。
"""

from __future__ import annotations

import io
import json
import math
import re
import shutil
import sys
from datetime import datetime
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
DATA_DIR     = PROJECT_ROOT / "webapp" / "data"
BASELINE     = DATA_DIR / "agent_baseline.json"
OUT_JSON     = DATA_DIR / "leopardcat_cameras.json"
VECTOR_STORE = DATA_DIR / "vector_store.jsonl"
REPORT = (PROJECT_ROOT / "01_工程設施維護與資料" / "新增報告書" /
          "1150430_臺中西部淺山保育軸帶烏溪流域保育軸帶石虎族群監測計畫期中報告(1).pdf")

EMBED_MODEL = "all-MiniLM-L6-v2"
SOURCE_FILE = "石虎自動相機樣點與橫流溪距離（座標計算）"


# ── TWD97 (TM2, 中央經線 121°) → WGS84 ──────────────────────────
#  GRS80 橢球，與 webapp/js/lib/twd97-transform.js 同一組參數。
def twd97_to_wgs84(x: float, y: float):
    a, b = 6378137.0, 6356752.314245
    lon0 = math.radians(121.0)
    k0, dx = 0.9999, 250000.0
    e = 1 - (b ** 2) / (a ** 2)
    e2 = e / (1 - e)

    x -= dx
    M = y / k0
    mu = M / (a * (1 - e / 4 - 3 * e ** 2 / 64 - 5 * e ** 3 / 256))
    e1 = (1 - math.sqrt(1 - e)) / (1 + math.sqrt(1 - e))
    j1 = 3 * e1 / 2 - 27 * e1 ** 3 / 32
    j2 = 21 * e1 ** 2 / 16 - 55 * e1 ** 4 / 32
    j3 = 151 * e1 ** 3 / 96
    j4 = 1097 * e1 ** 4 / 512
    fp = (mu + j1 * math.sin(2 * mu) + j2 * math.sin(4 * mu)
          + j3 * math.sin(6 * mu) + j4 * math.sin(8 * mu))

    c1 = e2 * math.cos(fp) ** 2
    t1 = math.tan(fp) ** 2
    r1 = a * (1 - e) / (1 - e * math.sin(fp) ** 2) ** 1.5
    n1 = a / math.sqrt(1 - e * math.sin(fp) ** 2)
    d = x / (n1 * k0)

    q1 = n1 * math.tan(fp) / r1
    q2 = d ** 2 / 2
    q3 = (5 + 3 * t1 + 10 * c1 - 4 * c1 ** 2 - 9 * e2) * d ** 4 / 24
    q4 = (61 + 90 * t1 + 298 * c1 + 45 * t1 ** 2 - 3 * c1 ** 2 - 252 * e2) * d ** 6 / 720
    lat = fp - q1 * (q2 - q3 + q4)

    q5 = d
    q6 = (1 + 2 * t1 + c1) * d ** 3 / 6
    q7 = (5 - 2 * c1 + 28 * t1 - 3 * c1 ** 2 + 8 * e2 + 24 * t1 ** 2) * d ** 5 / 120
    lon = lon0 + (q5 - q6 + q7) / math.cos(fp)
    return math.degrees(lat), math.degrees(lon)


def haversine_km(lat1, lon1, lat2, lon2):
    r = 6371.0088
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp = math.radians(lat2 - lat1)
    dl = math.radians(lon2 - lon1)
    h = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * r * math.asin(math.sqrt(h))


# ── 解析報告附錄表格 ─────────────────────────────────────────────
#  附錄1：編號 X Y 日期 流域 石虎紀錄
ROW_A1 = re.compile(
    r"([A-Z]{2,4}\d+(?:-\d+)?)\s+(\d{6})\s+(\d{7})\s+"
    r"(\d{4}/\d{1,2}/\d{1,2})\s+(\S+?)\s+(有|無)")
#  附錄3：編號 X Y 海拔 日期 分區 石虎紀錄
ROW_A3 = re.compile(
    r"([A-Z]{2,4}\d+(?:-\d+)?)\s+(\d{6})\s+(\d{7})\s+(\d{1,4})\s+"
    r"(\d{4}/\d{1,2}/\d{1,2})\s+(\S+?)\s+(有|無)")


def parse_report(pdf_path: Path):
    import fitz
    doc = fitz.open(str(pdf_path))
    points = []
    seen = set()
    for i, page in enumerate(doc):
        text = " ".join(page.get_text().split())
        for m in ROW_A3.finditer(text):
            code, x, y, elev, start, zone, rec = m.groups()
            if code in seen:
                continue
            seen.add(code)
            points.append({"編號": code, "twd97X": int(x), "twd97Y": int(y),
                           "海拔": int(elev), "起始日期": start,
                           "分區或流域": zone, "石虎紀錄": rec,
                           "來源": "附錄3 臺中西部淺山森林保育軸帶",
                           "頁碼": i + 1})
        for m in ROW_A1.finditer(text):
            code, x, y, start, basin, rec = m.groups()
            if code in seen:
                continue
            seen.add(code)
            points.append({"編號": code, "twd97X": int(x), "twd97Y": int(y),
                           "海拔": None, "起始日期": start,
                           "分區或流域": basin, "石虎紀錄": rec,
                           "來源": "附錄1 烏溪流域保育軸帶及大里溪流域",
                           "頁碼": i + 1})
    doc.close()
    return points


def main() -> int:
    if not REPORT.exists():
        print("找不到報告：%s" % REPORT)
        return 2

    facilities = [f for f in json.loads(BASELINE.read_text(encoding="utf-8"))
                  .get("facilities", [])
                  if f.get("lat") and f.get("lng")]
    if not facilities:
        print("agent_baseline.json 沒有含座標的設施，無法計算距離")
        return 2
    lat0 = sum(f["lat"] for f in facilities) / len(facilities)
    lon0 = sum(f["lng"] for f in facilities) / len(facilities)
    print("橫流溪設施 %d 座，重心 %.6f, %.6f" % (len(facilities), lat0, lon0))

    points = parse_report(REPORT)
    print("解析到 %d 個相機樣點" % len(points))
    if not points:
        return 1

    for p in points:
        lat, lon = twd97_to_wgs84(p["twd97X"], p["twd97Y"])
        p["lat"], p["lng"] = round(lat, 6), round(lon, 6)
        nearest = min(facilities,
                      key=lambda f: haversine_km(lat, lon, f["lat"], f["lng"]))
        p["距橫流溪最近設施"] = nearest.get("name")
        p["距離公里"] = round(haversine_km(lat, lon, nearest["lat"], nearest["lng"]), 2)

    points.sort(key=lambda p: p["距離公里"])
    with_cat = [p for p in points if p["石虎紀錄"] == "有"]
    payload = {
        "說明": ("石虎族群監測計畫期中報告附錄之自動相機樣點座標，"
                 "與橫流溪工程設施的距離。距離為以座標計算之衍生值，"
                 "非報告原始數據；石虎紀錄有/無照抄報告表格。"
                 "樣點靠近橫流溪不等於該筆紀錄屬於橫流溪。"),
        "來源報告": REPORT.name,
        "橫流溪設施座標來源": "webapp/data/agent_baseline.json",
        "產生時間": datetime.now().isoformat(timespec="seconds"),
        "樣點總數": len(points),
        "有石虎紀錄樣點數": len(with_cat),
        "最近樣點距離公里": points[0]["距離公里"],
        "最近有石虎紀錄樣點距離公里": with_cat[0]["距離公里"] if with_cat else None,
        "樣點": points,
    }
    OUT_JSON.write_text(json.dumps(payload, ensure_ascii=False, indent=1),
                        encoding="utf-8")
    print("已寫出 %s" % OUT_JSON.name)

    print("\n最近的 8 個樣點：")
    print("  %-10s %-9s %-6s %-8s %s" % ("編號", "分區/流域", "石虎", "距離km", "座標"))
    for p in points[:8]:
        print("  %-10s %-9s %-6s %-8.2f %.5f, %.5f"
              % (p["編號"], p["分區或流域"], p["石虎紀錄"], p["距離公里"],
                 p["lat"], p["lng"]))

    # ── 寫進部署用向量庫 ────────────────────────────────────────
    from sentence_transformers import SentenceTransformer
    model = SentenceTransformer(EMBED_MODEL)

    lines, max_id = [], -1
    for line in io.open(VECTOR_STORE, encoding="utf-8"):
        if not line.strip():
            continue
        rec = json.loads(line)
        if rec.get("source_file") == SOURCE_FILE:
            continue
        lines.append(line)
        m = re.findall(r"\d+", str(rec.get("id") or ""))
        if m:
            max_id = max(max_id, int(m[-1]))

    shutil.copy2(VECTOR_STORE, VECTOR_STORE.with_suffix(
        ".jsonl.bak-" + datetime.now().strftime("%Y%m%d%H%M%S")))

    head = (
        "【座標計算】石虎自動相機樣點與橫流溪的距離\n"
        "資料來源：%s 附錄1、附錄3 的樣點座標表（TWD97）；"
        "橫流溪設施座標取自平台資料庫。距離為計算值，非報告原始數據。\n"
        "全部 %d 個樣點中有 %d 個有石虎拍攝紀錄。"
        "距橫流溪最近的樣點是 %s（%s），相距 %.2f 公里；"
        "距橫流溪最近且有石虎紀錄的樣點相距 %.2f 公里。\n"
        "本報告的監測範圍不含橫流溪集水區，樣點靠近不代表該紀錄屬於橫流溪。\n"
        % (REPORT.name, len(points), len(with_cat),
           points[0]["編號"], points[0]["分區或流域"], points[0]["距離公里"],
           with_cat[0]["距離公里"] if with_cat else -1)
    )
    rows = ["編號｜分區或流域｜石虎紀錄｜距橫流溪公里｜緯度｜經度"]
    for p in points:
        rows.append("%s｜%s｜%s｜%.2f｜%.5f｜%.5f"
                    % (p["編號"], p["分區或流域"], p["石虎紀錄"],
                       p["距離公里"], p["lat"], p["lng"]))

    texts, chunk = [], []
    for row in rows[1:]:
        chunk.append(row)
        if len(chunk) >= 20:
            texts.append(head + rows[0] + "\n" + "\n".join(chunk))
            chunk = []
    if chunk:
        texts.append(head + rows[0] + "\n" + "\n".join(chunk))

    vectors = model.encode(texts, batch_size=8, show_progress_bar=False)
    doc_id = max_id + 1
    new_lines = []
    for idx, (text, vec) in enumerate(zip(texts, vectors)):
        new_lines.append(json.dumps({
            "id": "doc_%06d" % doc_id,
            "source_file": SOURCE_FILE,
            "source_path": "webapp/data/leopardcat_cameras.json",
            "page_number": "86-90",
            "chunk_index": str(idx),
            "text": text[:500],
            "full_text": text,
            "vector": [round(float(v), 6) for v in vec],
            "timestamp": datetime.now().isoformat(),
            "section": "%s > 第 %d 段" % (SOURCE_FILE, idx + 1),
        }, ensure_ascii=False) + "\n")
        doc_id += 1

    tmp = VECTOR_STORE.with_suffix(".jsonl.tmp")
    with tmp.open("w", encoding="utf-8") as f:
        f.writelines(lines)
        f.writelines(new_lines)
    tmp.replace(VECTOR_STORE)
    print("\n向量庫：%d + %d = %d 段"
          % (len(lines), len(new_lines), len(lines) + len(new_lines)))
    return 0


if __name__ == "__main__":
    sys.exit(main())
