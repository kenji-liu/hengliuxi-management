#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""重新取得 Google Drive 授權，更新 webapp/data/gdrive_oauth_token.json。

何時需要執行
------------
上傳腳本出現以下訊息時：

    google.auth.exceptions.RefreshError:
    ('invalid_grant: Token has been expired or revoked.', ...)

代表 refresh token 已過期或被撤銷。Google 對「測試中」狀態的 OAuth 應用，
refresh token 有效期僅七天；帳號改密碼、移除應用授權亦會使其失效。

為什麼平台沒有備援
------------------
webapp/drive_service.py 支援服務帳號，但服務帳號沒有自己的雲端硬碟容量，
必須寫入「共用雲端硬碟」才有作用。本專案未設定共用硬碟
（shared_drive_id() 為空），因此 OAuth 是唯一可行路徑。

用法
----
    python scripts/reauth_gdrive.py

執行後會開啟瀏覽器，請以「擁有該雲端硬碟資料夾的 Google 帳號」登入並同意授權。
授權完成後 token 會寫回 webapp/data/gdrive_oauth_token.json，
接著即可重跑：

    python scripts/upload_y115_maintenance_to_gdrive.py

注意：本程式不會讀取或儲存你的密碼，登入完全在 Google 的網頁上進行。
"""
from __future__ import annotations

import json
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(ROOT, 'webapp', 'data')
SECRET_PATH = os.path.join(DATA_DIR, 'gdrive_client_secret.json')
TOKEN_PATH = os.path.join(DATA_DIR, 'gdrive_oauth_token.json')

#  與 webapp/drive_service.py 的 _SCOPES 一致；不一致會導致取得的 token
#  權限不足，上傳時才失敗。
SCOPES = ['https://www.googleapis.com/auth/drive']


def main() -> int:
    if not os.path.exists(SECRET_PATH):
        print(f'找不到用戶端密鑰檔：{SECRET_PATH}')
        print('請先於 Google Cloud Console 下載 OAuth 用戶端 JSON 並放到該路徑。')
        return 1

    try:
        from google_auth_oauthlib.flow import InstalledAppFlow
    except ImportError:
        print('缺少套件，請先執行：pip install google-auth-oauthlib')
        return 1

    #  備份舊 token，授權失敗時仍可還原
    if os.path.exists(TOKEN_PATH):
        backup = TOKEN_PATH + '.bak'
        with open(TOKEN_PATH, 'rb') as src, open(backup, 'wb') as dst:
            dst.write(src.read())
        print(f'已備份舊 token → {backup}')

    print('即將開啟瀏覽器，請以擁有該雲端硬碟資料夾的 Google 帳號登入並同意授權…')
    flow = InstalledAppFlow.from_client_secrets_file(SECRET_PATH, SCOPES)
    #  prompt='consent' 強制重新發放 refresh token；省略時 Google 可能只回
    #  access token，導致下次仍然無法更新。
    creds = flow.run_local_server(port=0, prompt='consent')

    if not creds.refresh_token:
        print('警告：這次授權沒有取得 refresh token，過一小時後又會失效。')
        print('請至 https://myaccount.google.com/permissions 移除本應用的授權後重試。')

    with open(TOKEN_PATH, 'w', encoding='utf-8') as f:
        json.dump(json.loads(creds.to_json()), f, ensure_ascii=False, indent=2)

    print(f'\n授權完成，token 已寫入：{TOKEN_PATH}')
    print('接著執行：python scripts/upload_y115_maintenance_to_gdrive.py')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
