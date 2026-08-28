import json, os

BASE = os.path.join(os.path.dirname(__file__), '..')

# Load gdrive_index
with open(os.path.join(BASE, 'webapp', 'data', 'gdrive_index.json'), 'r', encoding='utf-8') as f:
    gdrive = json.load(f)

# Load maintenance_photo_index and extract all src paths
with open(os.path.join(BASE, 'webapp', 'data', 'maintenance_photo_index.json'), 'r', encoding='utf-8') as f:
    photo_data = json.load(f)

root = photo_data.get('root', '').replace('\\', '/')  # e.g. "01_工程設施維護與資料/維管計畫/歷年維護資料"
BASE_FOLDER = '01_工程設施維護與資料'

# Collect all photo src paths from maintenance_photo_index
photo_srcs = []
def extract_photos(obj):
    if isinstance(obj, dict):
        src = obj.get('src')
        if src and src.startswith('/media/'):
            photo_srcs.append(src[len('/media/'):])
        for v in obj.values():
            extract_photos(v)
    elif isinstance(obj, list):
        for item in obj:
            extract_photos(item)

extract_photos(photo_data)
print(f"Total photo src paths extracted: {len(photo_srcs)}")

# Check how many are found in gdrive_index
found = 0
not_found = []
for src in photo_srcs:
    # Strip base folder prefix
    norm = src.replace('\\', '/')
    base = BASE_FOLDER
    if norm.startswith(base + '/'):
        relative = norm[len(base) + 1:]
    else:
        relative = norm

    if relative in gdrive:
        found += 1
    else:
        not_found.append((src, relative))

print(f"Found in gdrive_index: {found}/{len(photo_srcs)}")
print()
if not_found:
    print("=== Sample NOT FOUND paths (first 5) ===")
    for src, rel in not_found[:5]:
        print("  media_path:", repr(src))
        print("  relative:  ", repr(rel))
        # Find closest match in gdrive
        fname = os.path.basename(rel)
        matches = [k for k in gdrive if os.path.basename(k) == fname]
        if matches:
            print("  GDRIVE matches by filename:", repr(matches[0]))
        print()
