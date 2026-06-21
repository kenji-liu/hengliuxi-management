"""
Google Drive 自動同步模組（OAuth2 + Refresh Token）
- 一次授權後永久自動上傳，無需每次登入
- 上傳至使用者自己的 Google Drive（個人帳號適用）
- 自動建立資料夾結構 / 覆蓋更新已存在的檔案
- Token 存放：webapp/data/gdrive_oauth_token.json
- Client Secret：webapp/data/gdrive_client_secret.json
"""

import os
import json
import io
import logging

logger = logging.getLogger(__name__)

_DATA_DIR    = os.path.join(os.path.dirname(__file__), 'data')
_TOKEN_PATH  = os.path.join(_DATA_DIR, 'gdrive_oauth_token.json')
_SECRET_PATH = os.path.join(_DATA_DIR, 'gdrive_client_secret.json')

GDRIVE_ROOT_FOLDER_ID = '1k2s5HSd_R5GeCt05SOtJxn6UFSrbyoQ9'
_SCOPES = ['https://www.googleapis.com/auth/drive']

_drive_service = None


def is_configured() -> bool:
    """Token 已取得且 client_secret 存在"""
    return os.path.exists(_TOKEN_PATH) and os.path.exists(_SECRET_PATH)


def _get_service():
    global _drive_service
    if _drive_service is not None:
        return _drive_service
    try:
        from google.oauth2.credentials import Credentials
        from google.auth.transport.requests import Request
        from googleapiclient.discovery import build

        if not os.path.exists(_TOKEN_PATH):
            raise RuntimeError('TOKEN_MISSING')
        if not os.path.exists(_SECRET_PATH):
            raise RuntimeError('SECRET_MISSING')

        creds = Credentials.from_authorized_user_file(_TOKEN_PATH, _SCOPES)

        # 若 Token 過期，用 refresh_token 自動刷新
        if creds.expired and creds.refresh_token:
            creds.refresh(Request())
            with open(_TOKEN_PATH, 'w', encoding='utf-8') as f:
                f.write(creds.to_json())
            logger.info('[Drive] Token 已自動刷新')

        _drive_service = build('drive', 'v3', credentials=creds)
        return _drive_service
    except Exception as e:
        _drive_service = None
        raise


def _find_or_create_folder(service, name: str, parent_id: str) -> str:
    query = (f"name='{name}' and '{parent_id}' in parents and "
             "mimeType='application/vnd.google-apps.folder' and trashed=false")
    results = service.files().list(q=query, fields='files(id)', pageSize=5).execute()
    files = results.get('files', [])
    if files:
        return files[0]['id']
    meta = {'name': name, 'mimeType': 'application/vnd.google-apps.folder', 'parents': [parent_id]}
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
    query = f"name='{filename}' and '{folder_id}' in parents and trashed=false"
    results = service.files().list(q=query, fields='files(id,webViewLink)', pageSize=5).execute()
    files = results.get('files', [])
    if files:
        return files[0]['id'], files[0].get('webViewLink', '')
    return None, None


def upload_inspection(data: dict, form_type: str, cloud_folder_path: str, filename: str) -> dict:
    from googleapiclient.http import MediaIoBaseUpload
    service = _get_service()
    folder_id = _resolve_folder_path(service, cloud_folder_path)

    payload = {k: v for k, v in data.items() if k != 'photoDataUrls'}
    from datetime import datetime
    payload['_syncedAt'] = datetime.utcnow().isoformat() + 'Z'
    payload['_formType'] = form_type
    content  = json.dumps(payload, ensure_ascii=False, indent=2)
    media    = MediaIoBaseUpload(io.BytesIO(content.encode('utf-8')),
                                 mimetype='application/json', resumable=False)
    existing_id, existing_link = _find_existing_file(service, filename, folder_id)

    if existing_id:
        updated = service.files().update(
            fileId=existing_id, media_body=media, fields='id,webViewLink'
        ).execute()
        return {'success': True, 'driveFileId': updated['id'],
                'driveWebLink': updated.get('webViewLink', existing_link), 'action': 'updated'}
    else:
        created = service.files().create(
            body={'name': filename, 'parents': [folder_id]},
            media_body=media, fields='id,webViewLink'
        ).execute()
        return {'success': True, 'driveFileId': created['id'],
                'driveWebLink': created.get('webViewLink', ''), 'action': 'created'}


_TOKEN_URL = 'https://oauth2.googleapis.com/token'
_AUTH_URL  = 'https://accounts.google.com/o/oauth2/v2/auth'


def _load_client_secrets():
    with open(_SECRET_PATH, encoding='utf-8') as f:
        data = json.load(f)
    return data.get('web') or data.get('installed') or {}


def start_oauth_flow(redirect_uri: str) -> str:
    """產生 Google 授權 URL（純 HTTP，不使用 PKCE）"""
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
    """用授權碼直接換 Token（純 HTTP POST，無 PKCE）"""
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
    logger.info('[Drive] OAuth Token 已儲存')
