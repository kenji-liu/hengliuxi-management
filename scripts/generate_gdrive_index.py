#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Google Drive 檔案索引產生器
掃描指定資料夾的所有檔案，建立「相對路徑 → Drive 檔案ID」對應表
輸出：webapp/data/gdrive_index.json

使用方式：
  python scripts/generate_gdrive_index.py

需要先設定環境變數（或直接修改下方 CONFIG）：
  GDRIVE_API_KEY    : Google API Key
  GDRIVE_FOLDER_ID  : Google Drive 資料夾 ID（從分享連結取得）
"""

import os
import sys
import json
import time
import requests
from pathlib import Path

# ── 設定區（也可透過環境變數傳入）──────────────────────────────────────
API_KEY       = os.environ.get("GDRIVE_API_KEY", "")
ROOT_FOLDER_ID = os.environ.get("GDRIVE_FOLDER_ID", "")
OUTPUT_PATH   = Path(__file__).parent.parent / "webapp" / "data" / "gdrive_index.json"
# ─────────────────────────────────────────────────────────────────────────


def list_folder(folder_id: str, path_prefix: str = "") -> dict[str, str]:
    """遞迴列出資料夾內所有檔案，回傳 {相對路徑: fileId}"""
    index = {}
    page_token = None
    url = "https://www.googleapis.com/drive/v3/files"

    while True:
        params = {
            "q": f"'{folder_id}' in parents and trashed=false",
            "key": API_KEY,
            "fields": "nextPageToken,files(id,name,mimeType)",
            "pageSize": 1000,
            "orderBy": "name",
        }
        if page_token:
            params["pageToken"] = page_token

        try:
            resp = requests.get(url, params=params, timeout=30)
            resp.raise_for_status()
        except requests.RequestException as e:
            print(f"  ❌ API 錯誤：{e}")
            sys.exit(1)

        data = resp.json()

        if "error" in data:
            print(f"  ❌ Google API 錯誤：{data['error']['message']}")
            print("     請確認 API Key 正確，且已啟用 Google Drive API")
            sys.exit(1)

        for item in data.get("files", []):
            item_path = f"{path_prefix}/{item['name']}" if path_prefix else item["name"]

            if item["mimeType"] == "application/vnd.google-apps.folder":
                # 資料夾：遞迴進入
                print(f"  📁 {item_path}/")
                sub = list_folder(item["id"], item_path)
                index.update(sub)
                time.sleep(0.1)  # 避免過快觸發速率限制
            else:
                index[item_path] = item["id"]
                print(f"  📄 {item_path}")

        page_token = data.get("nextPageToken")
        if not page_token:
            break

    return index


def main():
    if not API_KEY:
        print("❌ 請設定 GDRIVE_API_KEY 環境變數")
        print("   取得方式：https://console.cloud.google.com/ → 憑證 → API 金鑰")
        sys.exit(1)

    if not ROOT_FOLDER_ID:
        print("❌ 請設定 GDRIVE_FOLDER_ID 環境變數")
        print("   取得方式：開啟 Google Drive 資料夾，URL 中 /folders/ 後面的字串")
        print("   例如：https://drive.google.com/drive/folders/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs")
        print("         GDRIVE_FOLDER_ID = 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs")
        sys.exit(1)

    print(f"🔍 開始掃描 Google Drive 資料夾：{ROOT_FOLDER_ID}")
    print(f"   輸出位置：{OUTPUT_PATH}")
    print()

    index = list_folder(ROOT_FOLDER_ID)

    print()
    print(f"✅ 掃描完成，共找到 {len(index)} 個檔案")

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump(index, f, ensure_ascii=False, indent=2)

    print(f"💾 已儲存至：{OUTPUT_PATH}")
    print()
    print("下一步：")
    print("  git add webapp/data/gdrive_index.json")
    print("  git commit -m '新增 Google Drive 檔案索引'")
    print("  git push")


if __name__ == "__main__":
    main()
