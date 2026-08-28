#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""上傳 115年設施維護 的照片／影片至 Google Drive，並更新 gdrive_index.json。

線上（Render）的 /media 路由找不到本機檔案時會轉址到 Google Drive，
索引鍵為「相對 01_工程設施維護與資料/ 的路徑」。本機資料夾在 .gitignore 內，
不隨 git 部署，因此新批次必須上傳到雲端硬碟，線上才看得到。

用法：
    python scripts/upload_y115_maintenance_to_gdrive.py            # 只上傳照片
    python scripts/upload_y115_maintenance_to_gdrive.py --videos   # 含影片
    python scripts/upload_y115_maintenance_to_gdrive.py --dry-run  # 試算不上傳

已存在同名檔（同一 Drive 資料夾內）者略過，可重複執行續傳。
"""
import sys, os, json, argparse, time

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
WEBAPP_DIR = os.path.join(PROJECT_ROOT, 'webapp')
sys.path.insert(0, WEBAPP_DIR)

from googleapiclient.http import MediaFileUpload
from drive_service import _get_service, _find_or_create_folder, _find_existing_file, GDRIVE_ROOT_FOLDER_ID

BASE_REL = os.path.join('01_工程設施維護與資料', '115年設施維護')
LOCAL_BASE = os.path.join(PROJECT_ROOT, BASE_REL)
INDEX_PATH = os.path.join(WEBAPP_DIR, 'data', 'gdrive_index.json')
IMG_EXT = {'.jpg', '.jpeg', '.png'}
VID_EXT = {'.mp4', '.mov', '.avi', '.mkv'}
MIME = {'.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
        '.mp4': 'video/mp4', '.mov': 'video/quicktime',
        '.avi': 'video/x-msvideo', '.mkv': 'video/x-matroska'}


def collect(include_videos):
    exts = IMG_EXT | (VID_EXT if include_videos else set())
    out = []
    for root, _, files in os.walk(LOCAL_BASE):
        for f in sorted(files):
            ext = os.path.splitext(f)[1].lower()
            if ext not in exts:
                continue
            full = os.path.join(root, f)
            # 索引鍵：相對 01_工程設施維護與資料/ 的 POSIX 路徑
            rel = os.path.relpath(full, os.path.join(PROJECT_ROOT, '01_工程設施維護與資料'))
            out.append((full, rel.replace(os.sep, '/'), ext))
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--videos', action='store_true', help='一併上傳影片')
    ap.add_argument('--dry-run', action='store_true', help='只試算不上傳')
    ap.add_argument('--limit', type=int, default=0, help='最多上傳幾個檔（除錯用）')
    args = ap.parse_args()

    items = collect(args.videos)
    total_bytes = sum(os.path.getsize(p) for p, _, _ in items)
    print('待上傳 %d 個檔案，共 %.2f GB%s'
          % (len(items), total_bytes / 1024**3, '（含影片）' if args.videos else '（僅照片）'))

    with open(INDEX_PATH, encoding='utf-8') as f:
        index = json.load(f)
    todo = [it for it in items if it[1] not in index]
    print('索引中已存在 %d 個，實際需上傳 %d 個' % (len(items) - len(todo), len(todo)))
    if args.dry_run:
        for p, k, _ in todo[:5]:
            print('  範例鍵：', k)
        return
    if not todo:
        print('沒有需要上傳的檔案。'); return
    if args.limit:
        todo = todo[:args.limit]

    service = _get_service()
    # Drive 端資料夾快取：相對目錄 → folder_id（避免重複查詢）
    folder_cache = {'': _find_or_create_folder(service, '115年設施維護', GDRIVE_ROOT_FOLDER_ID)}

    def ensure_folder(rel_dir):
        if rel_dir in folder_cache:
            return folder_cache[rel_dir]
        parent_rel, name = os.path.split(rel_dir)
        parent_id = ensure_folder(parent_rel)
        fid = _find_or_create_folder(service, name, parent_id)
        folder_cache[rel_dir] = fid
        return fid

    ok = fail = 0
    t0 = time.time()
    for i, (path, key, ext) in enumerate(todo, 1):
        # key 形如 115年設施維護/A/B/檔名 → 去掉首段（Drive 上已是該資料夾）
        sub = os.path.dirname(key).split('/', 1)
        rel_dir = sub[1] if len(sub) > 1 else ''
        name = os.path.basename(key)
        try:
            folder_id = ensure_folder(rel_dir)
            existing, _ = _find_existing_file(service, name, folder_id)
            if existing:
                index[key] = existing
                ok += 1
            else:
                media = MediaFileUpload(path, mimetype=MIME.get(ext, 'application/octet-stream'),
                                        resumable=True)
                res = service.files().create(
                    body={'name': name, 'parents': [folder_id]},
                    media_body=media, fields='id').execute()
                index[key] = res['id']
                ok += 1
        except Exception as exc:                      # noqa: BLE001
            fail += 1
            print('  [失敗] %s → %s' % (name, str(exc)[:120]))
        if i % 25 == 0 or i == len(todo):
            el = time.time() - t0
            print('  進度 %d/%d  成功%d 失敗%d  已耗時 %.0f 秒' % (i, len(todo), ok, fail, el))
            with open(INDEX_PATH, 'w', encoding='utf-8') as f:
                json.dump(index, f, ensure_ascii=False)

    with open(INDEX_PATH, 'w', encoding='utf-8') as f:
        json.dump(index, f, ensure_ascii=False)
    print('完成：成功 %d、失敗 %d，索引共 %d 筆' % (ok, fail, len(index)))


if __name__ == '__main__':
    main()
