import json, os

BASE = os.path.join(os.path.dirname(__file__), '..')
path = os.path.join(BASE, 'webapp', 'data', 'maintenance_photo_index.json')

with open(path, 'r', encoding='utf-8') as f:
    data = json.load(f)

cases = data.get('cases', [])
first_case = cases[0]
print("First case:", json.dumps({k: v for k, v in first_case.items() if k != 'folders'}, ensure_ascii=False, indent=2)[:300])
print()
folders = first_case.get('folders', [])
if folders:
    print("First folder keys:", list(folders[0].keys()))
    first_folder = folders[0]
    print("First folder name:", repr(first_folder.get('name', '')))
    photos = first_folder.get('photos', [])
    if photos:
        print("Photo count in first folder:", len(photos))
        print("First 3 photo src values:")
        for p in photos[:3]:
            print("  src =", repr(p.get('src', '')))
    else:
        print("No 'photos' key, folder keys:", list(first_folder.keys()))
        # Check nested structure
        for k, v in first_folder.items():
            if isinstance(v, list) and v:
                print(f"  [{k}] list, first item:", repr(str(v[0])[:200]))
