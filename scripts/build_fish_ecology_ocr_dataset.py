from __future__ import annotations

import argparse
import json
import re
import sys
import zipfile
from collections import Counter, defaultdict
from pathlib import Path
from xml.etree import ElementTree as ET


if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")


SPECIES_ALIASES = {
    "臺灣白甲魚": "臺灣白甲魚",
    "臺灣鬚鱲": "臺灣鬚鱲",
    "臺灣石 魚賓": "臺灣石魚賓",
    "臺灣石魚賓": "臺灣石魚賓",
    "明潭吻鰕虎": "明潭吻鰕虎",
    "纓口臺鰍": "纓口臺鰍",
    "粗首馬口鱲": "粗首馬口鱲",
    "粗首馬口": "粗首馬口鱲",
    "粗手馬口": "粗首馬口鱲",
    "粗手馬口鱲": "粗首馬口鱲",
    "粗首馬口鱲公": "粗首馬口鱲",
    "粗首馬口鱲母": "粗首馬口鱲",
    "Zacco pachycephalus": "粗首馬口鱲",
    "Opsariichthys pachycephalus": "粗首馬口鱲",
    "臺灣間爬岩鰍": "臺灣間爬岩鰍",
    "短吻紅斑吻鰕虎": "短吻紅斑吻鰕虎",
    "短臀瘋鱨": "短臀瘋鱨",
    "香魚": "香魚",
    "埔里間爬岩鰍": "埔里間爬岩鰍",
    "其他": "其他",
}


def normalize_species_name(value: str) -> str:
    """合併明確同物種別名；不把臺灣馬口魚等疑義名稱自動併入。"""
    compact = re.sub(r"\s+", "", value).strip()
    compact = re.sub(r"[（(](?:公|母)[）)]$", "", compact)
    aliases = {re.sub(r"\s+", "", key): canonical for key, canonical in SPECIES_ALIASES.items()}
    return aliases.get(compact, value.strip())

TARGET_SPECIES = (
    "臺灣白甲魚",
    "臺灣石魚賓",
    "臺灣鬚鱲",
    "纓口臺鰍",
    "臺灣間爬岩鰍",
    "明潭吻鰕虎",
    "粗首馬口鱲",
    "短臀瘋鱨",
    "短吻紅斑吻鰕虎",
)


def ods_rows(path: Path) -> list[list[str]]:
    ns = {
        "office": "urn:oasis:names:tc:opendocument:xmlns:office:1.0",
        "table": "urn:oasis:names:tc:opendocument:xmlns:table:1.0",
        "text": "urn:oasis:names:tc:opendocument:xmlns:text:1.0",
    }
    repeat_col = f"{{{ns['table']}}}number-columns-repeated"
    office_value = f"{{{ns['office']}}}value"
    office_date = f"{{{ns['office']}}}date-value"
    with zipfile.ZipFile(path) as archive:
        root = ET.fromstring(archive.read("content.xml"))

    rows: list[list[str]] = []
    for row in root.findall(".//table:table-row", ns):
        values: list[str] = []
        for cell in list(row):
            if not cell.tag.endswith(("table-cell", "covered-table-cell")):
                continue
            parts = ["".join(p.itertext()).strip() for p in cell.findall(".//text:p", ns)]
            value = " ".join(part for part in parts if part).strip()
            if not value:
                value = str(cell.attrib.get(office_date) or cell.attrib.get(office_value) or "").strip()
            values.extend([value] * min(int(cell.attrib.get(repeat_col, "1")), 50))
        while values and not values[-1]:
            values.pop()
        if any(values):
            rows.append(values)
    return rows


def build_110_records(path: Path) -> list[dict[str, object]]:
    rows = ods_rows(path)
    header_index = next(i for i, row in enumerate(rows) if "魚種名" in row and "採樣年" in row)
    header = rows[header_index]
    col = {name: header.index(name) for name in ("溪流", "所屬河段", "採樣年", "採樣月", "採樣日", "魚種名")}
    grouped: dict[tuple[str, str], Counter[str]] = defaultdict(Counter)

    for row in rows[header_index + 1 :]:
        if len(row) <= max(col.values()) or row[col["溪流"]].strip() != "橫流溪":
            continue
        year = row[col["採樣年"]].strip()
        month = row[col["採樣月"]].strip()
        day = row[col["採樣日"]].strip()
        segment = row[col["所屬河段"]].strip() or "未註明河段"
        raw_species = row[col["魚種名"]].strip()
        species = normalize_species_name(raw_species)
        if not (year and month and day and species):
            continue
        grouped[(f"{year}/{int(float(month))}/{int(float(day))}", segment)][species] += 1

    records: list[dict[str, object]] = []
    def date_key(item: tuple[tuple[str, str], Counter[str]]) -> tuple[int, int, int, str]:
        (roc_date, segment), _ = item
        year, month, day = (int(part) for part in roc_date.split("/"))
        return year, month, day, segment

    for (roc_date, segment), counts in sorted(grouped.items(), key=date_key):
        total = sum(counts.values())
        target_total = sum(counts.get(name, 0) for name in TARGET_SPECIES)
        records.append(
            {
                "rocDate": roc_date,
                "date": f"{int(roc_date.split('/')[0]) + 1911}-{int(roc_date.split('/')[1]):02d}-{int(roc_date.split('/')[2]):02d}",
                "segment": segment,
                "counts": dict(sorted(counts.items())),
                "targetTotal": target_total,
                "supplementalTotal": total - target_total,
                "total": total,
            }
        )
    return records


def summarize_program(program: dict[str, object]) -> dict[str, object]:
    species = Counter()
    for record in program["records"]:
        species.update(record["counts"])
    total = sum(species.values())
    target_total = sum(species.get(name, 0) for name in TARGET_SPECIES)
    visits = len(program["records"])
    return {
        "total": total,
        "targetTotal": target_total,
        "supplementalTotal": total - target_total,
        "stationVisits": visits,
        "speciesRichness": sum(1 for value in species.values() if value > 0),
        "targetSpeciesRichness": sum(1 for name in TARGET_SPECIES if species.get(name, 0) > 0),
        "cpue": round(total / visits, 1) if visits else 0,
        "speciesTotals": dict(sorted(species.items())),
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="建立橫流溪魚類生態 OCR 補充資料層")
    parser.add_argument("source_dir", type=Path)
    parser.add_argument("json_output", type=Path)
    parser.add_argument("js_output", type=Path)
    args = parser.parse_args()

    programs: list[dict[str, object]] = [
        {
            "id": "forest-stream-108",
            "rocYear": 108,
            "title": "108年度森林溪流魚類監測（橫流溪上下游）",
            "source": "108年度溪流魚類監測調查計畫成果報告-東勢處.pdf",
            "evidence": "成果表格第26至29頁；逐列人工複核OCR",
            "scope": "橫流溪上、下游固定樣點；每季各1次",
            "records": [
                {"rocDate": "108/3/12", "date": "2019-03-12", "segment": "上游", "counts": {"臺灣鬚鱲": 15, "臺灣石魚賓": 12, "臺灣白甲魚": 10, "纓口臺鰍": 2}, "total": 39},
                {"rocDate": "108/3/13", "date": "2019-03-13", "segment": "下游", "counts": {"臺灣白甲魚": 14, "臺灣鬚鱲": 1, "臺灣石魚賓": 1}, "total": 16},
                {"rocDate": "108/6/20", "date": "2019-06-20", "segment": "上游", "counts": {"臺灣鬚鱲": 7, "明潭吻鰕虎": 1}, "total": 8, "note": "電魚器漏電，調查提前停止；不得與完整場次等量比較"},
                {"rocDate": "108/6/18", "date": "2019-06-18", "segment": "下游", "counts": {"臺灣白甲魚": 11, "臺灣石魚賓": 2}, "total": 13},
                {"rocDate": "108/8/28", "date": "2019-08-28", "segment": "上游", "counts": {"臺灣鬚鱲": 24, "臺灣白甲魚": 7, "纓口臺鰍": 2}, "total": 33},
                {"rocDate": "108/8/28", "date": "2019-08-28", "segment": "下游", "counts": {"臺灣白甲魚": 9, "臺灣鬚鱲": 1, "臺灣石魚賓": 1, "臺灣間爬岩鰍": 1}, "total": 12},
                {"rocDate": "108/12/11", "date": "2019-12-11", "segment": "上游", "counts": {"臺灣鬚鱲": 29, "臺灣白甲魚": 21, "臺灣石魚賓": 6, "明潭吻鰕虎": 1, "臺灣吻鰕虎": 1}, "total": 58},
                {"rocDate": "108/11/15", "date": "2019-11-15", "segment": "下游", "counts": {"臺灣白甲魚": 10, "臺灣石魚賓": 9, "臺灣鬚鱲": 7, "纓口臺鰍": 1}, "total": 27},
            ],
            "limitation": "本計畫為上下游固定樣點，與平台既有108年4站工程監測不是同一抽樣設計，僅獨立比較，不重複加總。",
        },
        {
            "id": "forest-stream-109",
            "rocYear": 109,
            "title": "109年度森林溪流魚類監測（可核對表單）",
            "source": "109年度溪流魚類監測調查計畫成果報告.docx",
            "evidence": "成果表格僅第一季橫流溪下游有可核對量化值",
            "scope": "橫流溪下游；本檔可確認1個完整數量場次",
            "records": [
                {"rocDate": "109/2/14", "date": "2020-02-14", "segment": "下游", "counts": {"臺灣白甲魚": 17, "臺灣石魚賓": 2}, "total": 19},
            ],
            "limitation": "其餘季別表格在本檔為空白，屬未取得量化值，不補成0尾，也不作全年總量推估。",
        },
        {
            "id": "forest-stream-110",
            "rocYear": 110,
            "title": "110年度溪流魚調查逐尾資料（橫流溪）",
            "source": "附件一110年溪流魚調查生態調查資料- 東勢處.ods",
            "evidence": "逐尾原始資料；依日期、河段及魚種重新統計",
            "scope": "橫流溪上、下游；9個站訪次",
            "records": build_110_records(args.source_dir / "附件一110年溪流魚調查生態調查資料- 東勢處.ods"),
            "limitation": "本檔為逐尾溪流監測資料，與魚道成效報告表5-3的6站樣站彙整口徑不同，僅獨立比較，不重複加總。",
        },
    ]

    for program in programs:
        program["summary"] = summarize_program(program)

    expected_totals = {
        "forest-stream-108": (206, 8),
        "forest-stream-109": (19, 1),
        "forest-stream-110": (481, 6),
    }
    for program in programs:
        expected_total, expected_visits = expected_totals[program["id"]]
        actual = program["summary"]
        if (actual["total"], actual["stationVisits"]) != (expected_total, expected_visits):
            raise ValueError(
                f"{program['id']} 核對失敗：預期 {expected_total}尾/{expected_visits}站訪次，"
                f"實得 {actual['total']}尾/{actual['stationVisits']}站訪次"
            )

    payload = {
        "schemaVersion": 1,
        "generatedOn": "2026-08-17",
        "title": "橫流溪魚類生態OCR補充調查資料",
        "sourceDirectory": "01_工程設施維護與資料/魚類生態",
        "policy": "不同調查計畫採樣範圍與努力量不同，獨立呈現，不與主趨勢直接加總；空白表格不視為0尾。",
        "targetSpecies": list(TARGET_SPECIES),
        "programs": programs,
    }

    args.json_output.parent.mkdir(parents=True, exist_ok=True)
    args.js_output.parent.mkdir(parents=True, exist_ok=True)
    json_text = json.dumps(payload, ensure_ascii=False, indent=2)
    args.json_output.write_text(json_text + "\n", encoding="utf-8")
    args.js_output.write_text("window.HLX_FISH_ECOLOGY_OCR = " + json_text + ";\n", encoding="utf-8")
    print(json.dumps({p["id"]: p["summary"] for p in programs}, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
