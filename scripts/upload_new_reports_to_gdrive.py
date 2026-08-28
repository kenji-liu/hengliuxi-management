#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
上傳 新增報告書 資料夾內的 4 份 PDF 至 Google Drive，
並更新 webapp/data/gdrive_index.json。
"""

import sys
import os
import json

# 讓 drive_service 能被 import
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
WEBAPP_DIR   = os.path.join(PROJECT_ROOT, 'webapp')
sys.path.insert(0, WEBAPP_DIR)

from googleapiclient.http import MediaFileUpload
from drive_service import _get_service, _find_or_create_folder, _find_existing_file, GDRIVE_ROOT_FOLDER_ID

# ── 設定 ──────────────────────────────────────────────────────────────────
LOCAL_BASE = os.path.join(PROJECT_ROOT, '01_工程設施維護與資料', '新增報告書')
INDEX_PATH = os.path.join(WEBAPP_DIR, 'data', 'gdrive_index.json')
GDRIVE_SUBFOLDER = '新增報告書'   # 在 Drive 根目錄下建立或找到此子資料夾

FILES = [
    '1150430_臺中西部淺山保育軸帶烏溪流域保育軸帶石虎族群監測計畫期中報告(1).pdf',
    '115石虎期中審查_簡報.pdf',
    '東勢處大安溪與大甲溪野生動物資源永續利用及保育自主管理.pdf',
    '臺中市大甲溪流域東勢周圍山城社區友善環境產業輔導計畫2+成果報告.pdf',
]

def main():
    print('[1/3] 連線 Google Drive ...')
    service = _get_service()

    print(f'[2/3] 確認 Drive 資料夾：{GDRIVE_SUBFOLDER}')
    folder_id = _find_or_create_folder(service, GDRIVE_SUBFOLDER, GDRIVE_ROOT_FOLDER_ID)
    print(f'      folder_id = {folder_id}')

    # 讀取現有 index
    with open(INDEX_PATH, encoding='utf-8') as f:
        index = json.load(f)

    print('[3/3] 上傳 PDF ...')
    new_entries = {}
    for fname in FILES:
        local_path = os.path.join(LOCAL_BASE, fname)
        if not os.path.isfile(local_path):
            print(f'  [跳過] 找不到本機檔案：{local_path}')
            continue

        size_mb = os.path.getsize(local_path) / 1024 / 1024
        print(f'  上傳中：{fname}  ({size_mb:.1f} MB)')

        # 若 Drive 已有同名檔，更新；否則新增
        existing_id, _ = _find_existing_file(service, fname, folder_id)
        media = MediaFileUpload(local_path, mimetype='application/pdf', resumable=True)

        if existing_id:
            result = service.files().update(
                fileId=existing_id,
                media_body=media,
                fields='id,name'
            ).execute()
            action = '已更新'
        else:
            result = service.files().create(
                body={'name': fname, 'parents': [folder_id]},
                media_body=media,
                fields='id,name'
            ).execute()
            action = '新增'

        file_id = result['id']
        index_key = f'{GDRIVE_SUBFOLDER}/{fname}'
        new_entries[index_key] = file_id
        print(f'    [{action}] id={file_id}  key={index_key}')

    # 更新 index
    index.update(new_entries)
    with open(INDEX_PATH, 'w', encoding='utf-8') as f:
        json.dump(index, f, ensure_ascii=False, indent=2)

    print(f'\n完成！共更新 {len(new_entries)} 筆至 gdrive_index.json')
    for k, v in new_entries.items():
        print(f'  "{k}": "{v}"')

if __name__ == '__main__':
    main()
