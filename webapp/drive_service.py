"""
Google Drive 自動同步模組
支援兩種認證方式（優先順序）：
  1. 服務帳號（Service Account）— 適合 Render 雲端部署
     - 環境變數 GOOGLE_SERVICE_ACCOUNT_JSON（JSON 字串）
     - 或檔案 webapp/data/gdrive_service_account.json
  2. OAuth2 Refresh Token — 適合本機開發
     - webapp/data/gdrive_client_secret.json + gdrive_oauth_token.json
"""

import os
import json
import io
import logging

logger = logging.getLogger(__name__)

_DATA_DIR    = os.path.join(os.path.dirname(__file__), 'data')
_TOKEN_PATH  = os.path.join(_DATA_DIR, 'gdrive_oauth_token.json')
_SECRET_PATH = os.path.join(_DATA_DIR, 'gdrive_client_secret.json')
_SA_PATH     = os.path.join(_DATA_DIR, 'gdrive_service_account.json')
# Render Secret Files 掛載路徑（/etc/secrets/<filename>）
_SA_SECRET_FILE     = '/etc/secrets/gdrive_service_account.json'
_TOKEN_SECRET_FILE  = '/etc/secrets/gdrive_oauth_token.json'
_CLIENT_SECRET_FILE = '/etc/secrets/gdrive_client_secret.json'

GDRIVE_ROOT_FOLDER_ID = '1k2s5HSd_R5GeCt05SOtJxn6UFSrbyoQ9'
_SCOPES = ['https://www.googleapis.com/auth/drive']

_drive_service = None


def _load_sa_info() -> dict:
    """讀取服務帳號 JSON（優先順序：env var → Secret File → 本機檔案）"""
    # 1. 環境變數（需為有效 JSON 字串）
    env_val = os.environ.get('GOOGLE_SERVICE_ACCOUNT_JSON', '').strip()
    if env_val and env_val.startswith('{'):
        return json.loads(env_val)
    # 2. Render Secret Files（/etc/secrets/gdrive_service_account.json）
    if os.path.exists(_SA_SECRET_FILE):
        with open(_SA_SECRET_FILE, encoding='utf-8') as f:
            return json.load(f)
    # 3. 本機開發檔案
    if os.path.exists(_SA_PATH):
        with open(_SA_PATH, encoding='utf-8') as f:
            return json.load(f)
    raise RuntimeError('SA_NOT_FOUND')


def _resolve_path(secret_file: str, local_file: str) -> str | None:
    """優先 Render Secret Files，其次本機路徑"""
    if os.path.exists(secret_file):
        return secret_file
    if os.path.exists(local_file):
        return local_file
    return None


def _auth_mode() -> str:
    """回傳目前可用的認證模式：'oauth2' | 'service_account' | 'none'
    優先使用 OAuth2（個人 Drive），服務帳號作為備用"""
    # OAuth2（個人 Google 帳號，有儲存空間）
    token  = _resolve_path(_TOKEN_SECRET_FILE, _TOKEN_PATH)
    secret = _resolve_path(_CLIENT_SECRET_FILE, _SECRET_PATH)
    if token and secret:
        return 'oauth2'
    # 服務帳號（限 Shared Drive，個人 Drive 無配額）
    env_val = os.environ.get('GOOGLE_SERVICE_ACCOUNT_JSON', '').strip()
    if env_val and env_val.startswith('{'):
        return 'service_account'
    if os.path.exists(_SA_SECRET_FILE):
        return 'service_account'
    if os.path.exists(_SA_PATH):
        return 'service_account'
    if os.path.exists(_TOKEN_PATH) and os.path.exists(_SECRET_PATH):
        return 'oauth2'
    return 'none'


def is_configured() -> bool:
    return _auth_mode() != 'none'


def _get_service():
    global _drive_service
    if _drive_service is not None:
        return _drive_service

    mode = _auth_mode()

    if mode == 'service_account':
        from google.oauth2 import service_account
        from googleapiclient.discovery import build

        sa_info = _load_sa_info()
        creds = service_account.Credentials.from_service_account_info(
            sa_info, scopes=_SCOPES)
        _drive_service = build('drive', 'v3', credentials=creds)
        logger.info('[Drive] 服務帳號認證成功')
        return _drive_service

    elif mode == 'oauth2':
        from google.oauth2.credentials import Credentials
        from google.auth.transport.requests import Request
        from googleapiclient.discovery import build

        token_path = _resolve_path(_TOKEN_SECRET_FILE, _TOKEN_PATH)
        creds = Credentials.from_authorized_user_file(token_path, _SCOPES)
        if creds.expired and creds.refresh_token:
            creds.refresh(Request())
            # 刷新後只寫入本機檔案（Render Secret Files 為唯讀）
            if os.path.exists(_TOKEN_PATH):
                with open(_TOKEN_PATH, 'w', encoding='utf-8') as f:
                    f.write(creds.to_json())
            logger.info('[Drive] OAuth2 Token 已自動刷新')

        _drive_service = build('drive', 'v3', credentials=creds)
        logger.info('[Drive] OAuth2 認證成功')
        return _drive_service

    else:
        raise RuntimeError('DRIVE_NOT_CONFIGURED')


def _find_or_create_folder(service, name: str, parent_id: str) -> str:
    safe = name.replace("'", "\\'")
    query = (f"name='{safe}' and '{parent_id}' in parents and "
             "mimeType='application/vnd.google-apps.folder' and trashed=false")
    results = service.files().list(q=query, fields='files(id)', pageSize=5).execute()
    files = results.get('files', [])
    if files:
        return files[0]['id']
    meta = {'name': name,
            'mimeType': 'application/vnd.google-apps.folder',
            'parents': [parent_id]}
    folder = service.files().create(body=meta, fields='id').execute()
    logger.info(f'[Drive] 建立資料夾：{name}')
    return folder['id']


def _resolve_folder_path(service, path: str) -> str:
    current_id = GDRIVE_ROOT_FOLDER_ID
    for part in path.split('/'):
        part = part.strip()
        if part:
            current_id = _find_or_create_folder(service, part, current_id)
    return current_id


def _find_existing_file(service, filename: str, folder_id: str):
    safe = filename.replace("'", "\\'")
    query = f"name='{safe}' and '{folder_id}' in parents and trashed=false"
    results = service.files().list(q=query, fields='files(id,webViewLink)', pageSize=5).execute()
    files = results.get('files', [])
    if files:
        return files[0]['id'], files[0].get('webViewLink', '')
    return None, None


def upload_inspection(data: dict, form_type: str,
                      cloud_folder_path: str, filename: str) -> dict:
    from googleapiclient.http import MediaIoBaseUpload
    from datetime import datetime

    service = _get_service()
    folder_id = _resolve_folder_path(service, cloud_folder_path)

    payload = {k: v for k, v in data.items() if k != 'photoDataUrls'}
    payload['_syncedAt'] = datetime.utcnow().isoformat() + 'Z'
    payload['_formType'] = form_type

    content = json.dumps(payload, ensure_ascii=False, indent=2)
    media   = MediaIoBaseUpload(
        io.BytesIO(content.encode('utf-8')),
        mimetype='application/json', resumable=False)

    existing_id, existing_link = _find_existing_file(service, filename, folder_id)

    if existing_id:
        updated = service.files().update(
            fileId=existing_id, media_body=media,
            fields='id,webViewLink').execute()
        return {'success': True,
                'driveFileId':  updated['id'],
                'driveWebLink': updated.get('webViewLink', existing_link),
                'action': 'updated'}
    else:
        created = service.files().create(
            body={'name': filename, 'parents': [folder_id]},
            media_body=media, fields='id,webViewLink').execute()
        return {'success': True,
                'driveFileId':  created['id'],
                'driveWebLink': created.get('webViewLink', ''),
                'action': 'created'}


# ── OAuth2 流程（本機備用）─────────────────────────────────────────────
_TOKEN_URL = 'https://oauth2.googleapis.com/token'
_AUTH_URL  = 'https://accounts.google.com/o/oauth2/v2/auth'


def _load_client_secrets():
    path = _resolve_path(_CLIENT_SECRET_FILE, _SECRET_PATH)
    if not path:
        raise RuntimeError('找不到 gdrive_client_secret.json')
    with open(path, encoding='utf-8') as f:
        data = json.load(f)
    return data.get('web') or data.get('installed') or {}


def start_oauth_flow(redirect_uri: str) -> str:
    from urllib.parse import urlencode
    secrets = _load_client_secrets()
    params = {
        'client_id':     secrets['client_id'],
        'redirect_uri':  redirect_uri,
        'response_type': 'code',
        'scope':         ' '.join(_SCOPES),
        'access_type':   'offline',
        'prompt':        'consent',
    }
    return f"{_AUTH_URL}?{urlencode(params)}"


def finish_oauth_flow(code: str, redirect_uri: str):
    import requests
    secrets = _load_client_secrets()
    resp = requests.post(_TOKEN_URL, data={
        'code':          code,
        'client_id':     secrets['client_id'],
        'client_secret': secrets['client_secret'],
        'redirect_uri':  redirect_uri,
        'grant_type':    'authorization_code',
    })
    resp.raise_for_status()
    token_data = resp.json()
    if 'error' in token_data:
        raise RuntimeError(f"Token 交換失敗：{token_data}")

    from google.oauth2.credentials import Credentials
    creds = Credentials(
        token=token_data['access_token'],
        refresh_token=token_data.get('refresh_token'),
        token_uri=_TOKEN_URL,
        client_id=secrets['client_id'],
        client_secret=secrets['client_secret'],
        scopes=_SCOPES,
    )
    os.makedirs(_DATA_DIR, exist_ok=True)
    with open(_TOKEN_PATH, 'w', encoding='utf-8') as f:
        f.write(creds.to_json())
    global _drive_service
    _drive_service = None
    logger.info('[Drive] OAuth2 Token 已儲存')
