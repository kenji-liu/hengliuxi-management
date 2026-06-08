#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
重新產生 maintenance_photo_index.json
掃描 01_工程設施維護與資料/維管計畫/歷年維護資料 下所有圖片，
依資料夾名稱分類為 before / during / after / unknown
"""
import os, json, re
from datetime import datetime
from pathlib import Path

ROOT_DIR  = Path(__file__).parent.parent / "01_工程設施維護與資料" / "維管計畫" / "歷年維護資料"
OUT_FILE  = Path(__file__).parent.parent / "webapp" / "data" / "maintenance_photo_index.json"
MEDIA_BASE = "/media/01_工程設施維護與資料/維管計畫/歷年維護資料"
IMG_EXT   = {'.jpg', '.jpeg', '.png', '.JPG', '.JPEG', '.PNG'}

# ── 日期萃取（民國或西元）──
def extract_sort_key(text):
    t = str(text or '')
    m = re.search(r'(\d{3,4})[.\-_/年](\d{1,2})[.\-_/月](\d{1,2})', t)
    if m:
        y, mo, d = int(m.group(1)), int(m.group(2)), int(m.group(3))
        if y < 1911: y += 1911
        return y * 10000 + mo * 100 + d
    m = re.search(r'(\d{3,4})年', t)
    if m:
        y = int(m.group(1))
        return (y + 1911 if y < 1911 else y) * 10000
    m = re.search(r'第(\d+)[期次]', t)
    if m: return 19000000 + int(m.group(1))
    return 99999999

# ── 依資料夾名稱分類施工階段 ──
def classify_stage(folder_name):
    n = str(folder_name)
    if re.search(r'施工前|前置|會勘|前期|測量|勘查|before', n, re.I): return 'before'
    if re.search(r'施工中|施工進行|中期|during|進行中', n, re.I):       return 'during'
    if re.search(r'施工後|完成|驗收|after|結案',         n, re.I):       return 'after'
    # 資料夾名只含 前/中/後 單字
    if re.search(r'(?<![a-zA-Z\d])前(?![a-zA-Z\d])', n): return 'before'
    if re.search(r'(?<![a-zA-Z\d])中(?![a-zA-Z\d])', n): return 'during'
    if re.search(r'(?<![a-zA-Z\d])後(?![a-zA-Z\d])', n): return 'after'
    return 'unknown'

# ── 建立相對 media URL ──
def media_url(abs_path):
    rel = abs_path.relative_to(ROOT_DIR)
    parts = [p for p in rel.parts]
    encoded = "/".join(p.replace(" ", "%20") for p in parts)
    return f"{MEDIA_BASE}/{encoded}"

def build_photo(img_path, stage, folder_label):
    stat = img_path.stat()
    sort_key = extract_sort_key(img_path.parent.name) or extract_sort_key(img_path.name)
    m = re.search(r'\d{3,4}[.\-/年]\d{1,2}[.\-/月]\d{1,2}', img_path.parent.name)
    date_str = m.group(0) if m else ''
    return {
        "name":     img_path.name,
        "sort":     sort_key,
        "src":      media_url(img_path),
        "stage":    stage,
        "date":     date_str,
        "folder":   folder_label,
        "size":     stat.st_size,
        "modified": datetime.fromtimestamp(stat.st_mtime).strftime('%Y-%m-%d %H:%M:%S')
    }

# ── 主掃描 ──
cases = []

for case_dir in sorted(ROOT_DIR.iterdir()):
    if not case_dir.is_dir(): continue
    case_name  = case_dir.name
    case_sort  = extract_sort_key(case_name)
    folders    = []

    # 收集二層子目錄（work folder）
    sub_dirs = sorted([d for d in case_dir.rglob('*') if d.is_dir()], key=lambda d: extract_sort_key(d.name))
    # 也加入 case_dir 本身（含直屬圖片）
    all_dirs = [case_dir] + sub_dirs

    # 每個子目錄作為一個 folder 條目
    seen = set()
    for sub in all_dirs:
        imgs = [f for f in sub.iterdir() if f.is_file() and f.suffix in IMG_EXT] if sub.is_dir() else []
        if not imgs: continue
        # 避免重複
        key = str(sub)
        if key in seen: continue
        seen.add(key)

        # 決定階段（從路徑最深部分判斷）
        rel_parts = sub.relative_to(case_dir).parts if sub != case_dir else ()
        stage = 'unknown'
        for part in reversed(rel_parts):
            s = classify_stage(part)
            if s != 'unknown':
                stage = s
                break

        # 資料夾顯示名稱
        if sub == case_dir:
            folder_label = case_name
        else:
            rel = sub.relative_to(case_dir)
            folder_label = " / ".join(rel.parts)

        m = re.search(r'\d{3,4}[.\-年]\d{1,2}[.\-月]\d{1,2}', sub.name)
        date_str = m.group(0) if m else ''
        folder_sort = extract_sort_key(sub.name)

        photo_objs = [build_photo(img, stage, folder_label) for img in sorted(imgs)]

        bf = [p for p in photo_objs if p['stage'] == 'before']
        du = [p for p in photo_objs if p['stage'] == 'during']
        af = [p for p in photo_objs if p['stage'] == 'after']
        unk= [p for p in photo_objs if p['stage'] == 'unknown']

        folders.append({
            "name":    folder_label,
            "date":    date_str,
            "sort":    folder_sort,
            "total":   len(photo_objs),
            "before":  bf,
            "during":  du,
            "after":   af,
            "unknown": unk
        })

    if not folders: continue

    # 彙總整個 case 統計
    all_imgs = [p for f in folders for stage_list in [f['before'],f['during'],f['after'],f['unknown']] for p in stage_list]
    cases.append({
        "name":    case_name,
        "sort":    case_sort,
        "total":   len(all_imgs),
        "before":  sum(len(f['before'])  for f in folders),
        "during":  sum(len(f['during'])  for f in folders),
        "after":   sum(len(f['after'])   for f in folders),
        "unknown": sum(len(f['unknown']) for f in folders),
        "folders": sorted(folders, key=lambda x: x['sort'])
    })

cases.sort(key=lambda c: c['sort'])

result = {
    "root":        "01_工程設施維護與資料\\維管計畫\\歷年維護資料",
    "generatedAt": datetime.now().isoformat(),
    "sortMode":    "time-ascending",
    "totalImages": sum(c['total'] for c in cases),
    "totalCases":  len(cases),
    "cases":       cases
}

OUT_FILE.parent.mkdir(parents=True, exist_ok=True)
with open(OUT_FILE, 'w', encoding='utf-8') as f:
    json.dump(result, f, ensure_ascii=False, separators=(',', ':'))

print(f"✅ 產生完成：{len(cases)} 個期別，共 {result['totalImages']} 張照片")
for c in cases:
    print(f"   {c['name'][:40]:<40} 共 {c['total']:>4} 張  前{c['before']} 中{c['during']} 後{c['after']} 未{c['unknown']}")
