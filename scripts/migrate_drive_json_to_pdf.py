"""
把 Google Drive 上既有的 .json 表單轉換為 PDF 表單
======================================================================
早期版本把巡查表單以原始 JSON 上傳到 Drive，使用者點開看到的是程式碼
而不是表單。本腳本將既有 JSON 逐一轉成維護管理手冊格式的 PDF，並把
原始 JSON 移入同層 `_原始資料` 子資料夾保留（不刪除，可還原）。

用法：
    python scripts/migrate_drive_json_to_pdf.py --dry-run   # 先預覽
    python scripts/migrate_drive_json_to_pdf.py             # 實際執行
"""

from __future__ import annotations

import argparse
import io
import json
import logging
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from webapp import drive_service as D          # noqa: E402
from webapp.form_pdf import render_form_pdf    # noqa: E402

logging.basicConfig(level=logging.WARNING)

SKIP_FOLDER = '_原始資料'


def list_children(svc, folder_id: str) -> list:
    items, token = [], None
    while True:
        resp = svc.files().list(
            q=f"'{folder_id}' in parents and trashed=false",
            fields='nextPageToken,files(id,name,mimeType,parents)',
            pageSize=200, pageToken=token,
            supportsAllDrives=True, includeItemsFromAllDrives=True,
        ).execute()
        items += resp.get('files', [])
        token = resp.get('nextPageToken')
        if not token:
            return items


def collect_json_forms(svc, folder_id: str, path: str, depth: int = 0) -> list:
    """遞迴找出所有不在 _原始資料 底下的 .json 表單。"""
    found = []
    for item in list_children(svc, folder_id):
        is_dir = item['mimeType'].endswith('folder')
        child_path = f"{path}/{item['name']}"
        if is_dir:
            if item['name'] != SKIP_FOLDER and depth < 6:
                found += collect_json_forms(svc, item['id'], child_path, depth + 1)
        elif item['name'].lower().endswith('.json'):
            found.append({'id': item['id'], 'name': item['name'],
                          'folderId': folder_id, 'folder': path})
    return found


def download_json(svc, file_id: str) -> dict:
    data = svc.files().get_media(fileId=file_id, supportsAllDrives=True).execute()
    if isinstance(data, bytes):
        data = data.decode('utf-8', errors='replace')
    return json.loads(data)


def migrate_one(svc, entry: dict, dry_run: bool) -> tuple:
    """回傳 (狀態, 說明)。"""
    name = entry['name']
    pdf_name = name[:-5] + '.pdf' if name.lower().endswith('.json') else name + '.pdf'

    try:
        record = download_json(svc, entry['id'])
    except Exception as exc:
        return 'error', f'讀取 JSON 失敗：{type(exc).__name__}: {exc}'

    if not isinstance(record, dict):
        return 'skip', 'JSON 內容不是表單物件'

    form_type = str(record.get('_formType') or record.get('formType') or '')

    if dry_run:
        return 'dry', f'將產生 {pdf_name}（表單型別：{form_type or "未標示"}）'

    # ① 產生並上傳 PDF
    try:
        pdf_bytes = render_form_pdf(record, form_type)
        result = D._upload_bytes(svc, pdf_bytes, 'application/pdf',
                                 pdf_name, entry['folderId'])
    except Exception as exc:
        return 'error', f'PDF 產生／上傳失敗：{type(exc).__name__}: {exc}'

    # ② 把原始 JSON 移入 _原始資料（保留，不刪除）
    try:
        raw_id = D._find_or_create_folder(svc, SKIP_FOLDER, entry['folderId'])
        svc.files().update(
            fileId=entry['id'], addParents=raw_id,
            removeParents=entry['folderId'],
            fields='id', supportsAllDrives=True).execute()
    except Exception as exc:
        return 'partial', f'PDF 已建立（{result["action"]}），但 JSON 移動失敗：{exc}'

    return 'ok', f'{pdf_name}（{result["action"]}），JSON 已移入 {SKIP_FOLDER}'


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument('--dry-run', action='store_true', help='只預覽，不修改 Drive')
    parser.add_argument('--root', default='巡查資料管理',
                        help='要處理的子資料夾名稱（預設 巡查資料管理）')
    args = parser.parse_args()

    svc = D._get_service()
    root_id = D.root_folder_id()

    target = svc.files().list(
        q=f"name='{args.root}' and '{root_id}' in parents and trashed=false",
        fields='files(id,name)', supportsAllDrives=True,
        includeItemsFromAllDrives=True).execute().get('files', [])
    if not target:
        print(f'找不到資料夾「{args.root}」（根目錄 {root_id}）')
        return 1

    entries = collect_json_forms(svc, target[0]['id'], args.root)
    print(f'找到 {len(entries)} 份 JSON 表單'
          f'{"（預覽模式，不會修改）" if args.dry_run else ""}\n')

    counts = {}
    for index, entry in enumerate(entries, 1):
        status, message = migrate_one(svc, entry, args.dry_run)
        counts[status] = counts.get(status, 0) + 1
        mark = {'ok': 'OK  ', 'dry': '預覽', 'skip': '略過',
                'partial': '部分', 'error': '失敗'}.get(status, status)
        print(f'[{index:3d}/{len(entries)}] {mark} {entry["name"]}')
        if status in ('error', 'partial', 'skip'):
            print(f'          → {message}')

    print('\n---- 統計 ----')
    for status, count in sorted(counts.items()):
        print(f'{status}: {count}')
    return 0 if not counts.get('error') else 2


if __name__ == '__main__':
    raise SystemExit(main())
