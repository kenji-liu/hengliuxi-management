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

BASE      = Path(__file__).parent.parent
OUT_FILE  = BASE / "webapp" / "data" / "maintenance_photo_index.json"
IMG_EXT   = {'.jpg', '.jpeg', '.png', '.JPG', '.JPEG', '.PNG'}
#  影片一併納入索引（/media 路由本就允許 .mp4/.mov 等）
VID_EXT   = {'.mp4', '.MP4', '.mov', '.MOV', '.avi', '.AVI', '.mkv', '.MKV'}
MEDIA_EXT = IMG_EXT | VID_EXT

#  多個資料根目錄：歷年維護資料為原始來源，115年設施維護為後續新增批次。
#  每一項 = (根目錄, /media 前綴, 是否把根目錄本身視為單一期別)
#  flatCase 不為 None 時，整個根目錄視為「一個期別」，其子目錄即為工作資料夾；
#  用於 Google 雲端硬碟匯出的批次（外層資料夾名帶時間戳，不適合當期別名稱）。
_Y115 = (BASE / "01_工程設施維護與資料" / "115年設施維護" /
         "橫流溪工程-20260828T122219Z-1-001" / "橫流溪工程")
ROOTS = [
    {"dir": BASE / "01_工程設施維護與資料" / "維管計畫" / "歷年維護資料",
     "media": "/media/01_工程設施維護與資料/維管計畫/歷年維護資料",
     "flatCase": None},
    {"dir": _Y115,
     "media": ("/media/01_工程設施維護與資料/115年設施維護/"
               "橫流溪工程-20260828T122219Z-1-001/橫流溪工程"),
     "flatCase": "115年林業保育署臺中分署轄內搶修工程-橫流溪道路周邊環境整理工作(照片影片)"},
]

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
    #  工項名稱若描述「正在做的事」（施作、鋪設、載運、清運…），
    #  即為施工中的紀錄。僅在上面沒有任何明確前/中/後標示時才套用，
    #  純位置或器材名稱（如「未分類」「錄影」「牌面」）維持未分類，不強加階段。
    if re.search(r'施作|鋪設|載運|搬運|清運|採取|砍草|開挖|吊掛|拆除|'
                 r'刨木|回填|整理施作|工作$|作業', n):
        return 'during'
    return 'unknown'

# ── 建立相對 media URL ──
def media_url(abs_path, root_dir, media_base):
    rel = abs_path.relative_to(root_dir)
    parts = [p for p in rel.parts]
    encoded = "/".join(p.replace(" ", "%20") for p in parts)
    return f"{media_base}/{encoded}"

# ── 從資料夾自身或其上層目錄名稱萃取日期 ──
# 常見兩種排列：「日期／工項」（日期在上層，如 115.07.08/未分類）與
# 「工項／日期」（日期就在自己名稱，如 挖土機載運/111.07.25）。
# 若只看資料夾自己的名稱，前者的工項子目錄（未分類、機具載運…）抓不到
# 日期，會全部落到 extract_sort_key() 的預設值 99999999，導致同一批
# 資料完全失去時間順序（跨日期的「未分類」互相混在一起）。
# 因此由該目錄往上walk到 case_dir 為止，取第一個「自己名稱就能判讀出
# 日期」的層級；找不到才維持 99999999（例如根本沒有日期線索的資料夾）。
def find_date_key(dir_path, case_dir):
    cur = dir_path
    while True:
        key = extract_sort_key(cur.name)
        if key != 99999999:
            m = re.search(r'\d{3,4}[.\-/年]\d{1,2}[.\-/月]\d{1,2}', cur.name)
            return key, (m.group(0) if m else '')
        if cur == case_dir:
            return 99999999, ''
        cur = cur.parent

def build_photo(img_path, stage, folder_label, root_dir, media_base, sort_key, date_str):
    stat = img_path.stat()
    return {
        "name":     img_path.name,
        "sort":     sort_key,
        "src":      media_url(img_path, root_dir, media_base),
        "kind":     "video" if img_path.suffix in VID_EXT else "photo",
        "stage":    stage,
        "date":     date_str,
        "folder":   folder_label,
        "size":     stat.st_size,
        "modified": datetime.fromtimestamp(stat.st_mtime).strftime('%Y-%m-%d %H:%M:%S')
    }

# ── 主掃描 ──
cases = []

for _R in ROOTS:
  ROOT_DIR, MEDIA_BASE, _flat = _R["dir"], _R["media"], _R["flatCase"]
  if not ROOT_DIR.exists():
    print('（略過不存在的根目錄）', ROOT_DIR); continue
  _case_dirs = [ROOT_DIR] if _flat else [d for d in sorted(ROOT_DIR.iterdir()) if d.is_dir()]
  for case_dir in _case_dirs:
    if not case_dir.is_dir(): continue
    case_name  = _flat or case_dir.name
    case_sort  = extract_sort_key(case_name)
    folders    = []

    # 收集二層子目錄（work folder）
    sub_dirs = sorted([d for d in case_dir.rglob('*') if d.is_dir()], key=lambda d: extract_sort_key(d.name))
    # 也加入 case_dir 本身（含直屬圖片）
    all_dirs = [case_dir] + sub_dirs

    # 每個子目錄作為一個 folder 條目
    seen = set()
    for sub in all_dirs:
        imgs = [f for f in sub.iterdir() if f.is_file() and f.suffix in MEDIA_EXT] if sub.is_dir() else []
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

        folder_sort, date_str = find_date_key(sub, case_dir)

        photo_objs = [build_photo(img, stage, folder_label, ROOT_DIR, MEDIA_BASE, folder_sort, date_str)
                      for img in sorted(imgs)]

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

    # 案件名稱通常只有年份（例如「115年…」），同一年多個案件會並列成同一個 sort 值，
    # 排序就退化成比名稱。改以「案件內最早的資料夾日期」為準，才真正依時間排序。
    dated = [f['sort'] for f in folders if f['sort'] != 99999999]
    if dated:
        case_sort = min(dated)

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
    "totalVideos": sum(1 for c in cases for f in c['folders']
                       for L in (f['before'],f['during'],f['after'],f['unknown'])
                       for x in L if x.get('kind') == 'video'),
    "totalCases":  len(cases),
    "cases":       cases
}

OUT_FILE.parent.mkdir(parents=True, exist_ok=True)
with open(OUT_FILE, 'w', encoding='utf-8') as f:
    json.dump(result, f, ensure_ascii=False, separators=(',', ':'))

print(f"✅ 產生完成：{len(cases)} 個期別，共 {result['totalImages']} 張照片")
for c in cases:
    print(f"   {c['name'][:40]:<40} 共 {c['total']:>4} 張  前{c['before']} 中{c['during']} 後{c['after']} 未{c['unknown']}")
