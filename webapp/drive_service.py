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
import re

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


def _available_modes() -> list:
    """依優先序列出目前可用的認證模式。"""
    modes = []
    env_sa = os.environ.get('GOOGLE_SERVICE_ACCOUNT_JSON', '').strip()
    has_sa = False
    if env_sa and env_sa.startswith('{'):
        try:
            has_sa = bool(json.loads(env_sa).get('client_email'))
        except Exception:
            has_sa = False
    has_sa = has_sa or os.path.exists(_SA_SECRET_FILE) or os.path.exists(_SA_PATH)
    if has_sa:
        modes.append('service_account')
    if os.environ.get('GDRIVE_REFRESH_TOKEN') and os.environ.get('GDRIVE_CLIENT_ID'):
        modes.append('oauth2_env')
    if (_resolve_path(_TOKEN_SECRET_FILE, _TOKEN_PATH)
            and _resolve_path(_CLIENT_SECRET_FILE, _SECRET_PATH)):
        modes.append('oauth2_file')

    # 服務帳號沒有自己的雲端硬碟容量，只有寫進共用雲端硬碟才有用。
    # 未設定共用硬碟時（個人 Google 帳號無法建立共用硬碟），OAuth 才是可行路徑，
    # 因此把服務帳號降到最後，避免每次都先撞一次 storageQuotaExceeded。
    if 'service_account' in modes and not shared_drive_id() and len(modes) > 1:
        modes = [m for m in modes if m != 'service_account'] + ['service_account']

    forced = os.environ.get('GDRIVE_AUTH_MODE', '').strip()
    if forced and forced in modes:
        modes = [forced] + [m for m in modes if m != forced]
    return modes


def _auth_mode() -> str:
    """目前優先採用的認證模式，無可用者回傳 'none'。"""
    modes = _available_modes()
    return modes[0] if modes else 'none'


def is_configured() -> bool:
    return _auth_mode() not in ('none',)


def _get_service(mode: str = ''):
    """建立 Drive service。未指定 mode 時使用優先序最高的可用模式並快取。"""
    global _drive_service
    if not mode:
        if _drive_service is not None:
            return _drive_service
        mode = _auth_mode()
        cache = True
    else:
        cache = False

    service = _build_service(mode)
    if cache:
        _drive_service = service
    return service


def _build_service(mode: str):
    if mode == 'oauth2_env':
        # 從環境變數直接建立 OAuth2 credentials（最適合 Render）
        from google.oauth2.credentials import Credentials
        from google.auth.transport.requests import Request
        from googleapiclient.discovery import build

        creds = Credentials(
            token=None,
            refresh_token=os.environ['GDRIVE_REFRESH_TOKEN'],
            token_uri=os.environ.get('GDRIVE_TOKEN_URI', 'https://oauth2.googleapis.com/token'),
            client_id=os.environ['GDRIVE_CLIENT_ID'],
            client_secret=os.environ['GDRIVE_CLIENT_SECRET'],
            scopes=_SCOPES,
        )
        creds.refresh(Request())
        logger.info('[Drive] OAuth2（env vars）認證成功')
        return build('drive', 'v3', credentials=creds)

    elif mode in ('oauth2_file', 'oauth2'):
        from google.oauth2.credentials import Credentials
        from google.auth.transport.requests import Request
        from googleapiclient.discovery import build

        token_path = _resolve_path(_TOKEN_SECRET_FILE, _TOKEN_PATH) or _TOKEN_PATH
        creds = Credentials.from_authorized_user_file(token_path, _SCOPES)
        if creds.expired and creds.refresh_token:
            creds.refresh(Request())
            if os.path.exists(_TOKEN_PATH):
                with open(_TOKEN_PATH, 'w', encoding='utf-8') as f:
                    f.write(creds.to_json())
            logger.info('[Drive] OAuth2 Token 已自動刷新')

        logger.info('[Drive] OAuth2（file）認證成功')
        return build('drive', 'v3', credentials=creds)

    elif mode == 'service_account':
        from google.oauth2 import service_account
        from googleapiclient.discovery import build

        sa_info = _load_sa_info()
        creds = service_account.Credentials.from_service_account_info(
            sa_info, scopes=_SCOPES)
        logger.info('[Drive] 服務帳號認證成功')
        return build('drive', 'v3', credentials=creds)

    else:
        raise RuntimeError('DRIVE_NOT_CONFIGURED')


def _normalize_drive_id(value: str) -> str:
    """把使用者可能直接貼上的 Drive 網址正規化成純 ID。

    設定環境變數時貼整串網址是很常見的操作，若原樣送進 API 會得到
    令人困惑的 404 File not found，因此在此統一處理。
    """
    text = (value or '').strip().strip('"\'')
    if not text:
        return ''
    if 'drive.google.com' in text:
        m = re.search(r'/(?:folders|drive/u/\d+/folders)/([A-Za-z0-9_-]+)', text)
        if m:
            return m.group(1)
        m = re.search(r'[?&]id=([A-Za-z0-9_-]+)', text)
        if m:
            return m.group(1)
    # 去掉可能殘留的查詢字串
    return text.split('?', 1)[0].rstrip('/')


def shared_drive_id() -> str:
    """設定中的共用雲端硬碟 ID（未使用共用硬碟時為空字串）。"""
    return _normalize_drive_id(os.environ.get('GDRIVE_SHARED_DRIVE_ID', ''))


_CONFIG_PATH = os.path.join(_DATA_DIR, 'gdrive_config.json')


def load_config() -> dict:
    """本機 Drive 設定（例如授權後實際可寫入的根資料夾）。"""
    try:
        with open(_CONFIG_PATH, encoding='utf-8') as f:
            data = json.load(f)
        return data if isinstance(data, dict) else {}
    except Exception:
        return {}


def save_config(**values) -> dict:
    """更新並寫回本機 Drive 設定。"""
    config = load_config()
    config.update({k: v for k, v in values.items() if v is not None})
    os.makedirs(_DATA_DIR, exist_ok=True)
    with open(_CONFIG_PATH, 'w', encoding='utf-8') as f:
        json.dump(config, f, ensure_ascii=False, indent=2)
    return config


def root_folder_id() -> str:
    """上傳的根資料夾。

    優先序：環境變數 GDRIVE_ROOT_FOLDER_ID（雲端部署用）→ 本機設定檔
    → 共用硬碟根目錄 → 內建常數。
    共用硬碟的根目錄 ID 等同該硬碟的 driveId。
    """
    explicit = _normalize_drive_id(os.environ.get('GDRIVE_ROOT_FOLDER_ID', ''))
    if explicit:
        return explicit
    configured = _normalize_drive_id(str(load_config().get('rootFolderId', '')))
    if configured:
        return configured
    return shared_drive_id() or GDRIVE_ROOT_FOLDER_ID


def _list_files(service, query: str, fields: str, page_size: int = 5):
    """files().list 包裝：帶齊共用雲端硬碟所需參數。

    未加 supportsAllDrives / includeItemsFromAllDrives 時，共用硬碟裡的項目
    不會出現在結果中，會被誤判為「不存在」而重複建立資料夾或檔案。
    """
    params = dict(q=query, fields=fields, pageSize=page_size,
                  supportsAllDrives=True, includeItemsFromAllDrives=True)
    drive_id = shared_drive_id()
    if drive_id:
        params.update(corpora='drive', driveId=drive_id)
    return service.files().list(**params).execute().get('files', [])


def _find_or_create_folder(service, name: str, parent_id: str) -> str:
    safe = name.replace("'", "\\'")
    query = (f"name='{safe}' and '{parent_id}' in parents and "
             "mimeType='application/vnd.google-apps.folder' and trashed=false")
    files = _list_files(service, query, 'files(id)')
    if files:
        return files[0]['id']
    meta = {'name': name,
            'mimeType': 'application/vnd.google-apps.folder',
            'parents': [parent_id]}
    folder = service.files().create(
        body=meta, fields='id', supportsAllDrives=True).execute()
    logger.info(f'[Drive] 建立資料夾：{name}')
    return folder['id']


def _resolve_folder_path(service, path: str) -> str:
    current_id = root_folder_id()
    for part in path.split('/'):
        part = part.strip()
        if part:
            current_id = _find_or_create_folder(service, part, current_id)
    return current_id


def _find_existing_file(service, filename: str, folder_id: str):
    safe = filename.replace("'", "\\'")
    query = f"name='{safe}' and '{folder_id}' in parents and trashed=false"
    files = _list_files(service, query, 'files(id,webViewLink)')
    if files:
        return files[0]['id'], files[0].get('webViewLink', '')
    return None, None


def service_account_email() -> str:
    """服務帳號信箱（要加入共用雲端硬碟的對象）。不含私鑰。"""
    try:
        return str(_load_sa_info().get('client_email', ''))
    except Exception:
        return ''


def diagnose() -> dict:
    """檢查 Drive 設定是否可實際寫入，並指出下一步該做什麼。"""
    report = {
        'authMode':            _auth_mode(),
        'serviceAccountEmail': service_account_email(),
        'sharedDriveId':       shared_drive_id(),
        'rootFolderId':        root_folder_id(),
        'sharedDrives':        [],
        'rootFolder':          {},
        'canWrite':            False,
        'nextStep':            '',
    }

    if report['authMode'] == 'none':
        report['nextStep'] = '尚未設定 Drive 認證（服務帳號 JSON 或 OAuth token）。'
        return report

    try:
        service = _get_service()
    except Exception as exc:
        report['nextStep'] = explain_drive_error(exc)
        return report

    # 服務帳號看得到哪些共用硬碟
    try:
        report['sharedDrives'] = [
            {'id': d.get('id'), 'name': d.get('name')}
            for d in service.drives().list(
                pageSize=20, fields='drives(id,name)').execute().get('drives', [])
        ]
    except Exception as exc:
        logger.info('[Drive] 無法列出共用硬碟：%s', exc)

    # 根資料夾在哪裡
    try:
        info = service.files().get(
            fileId=report['rootFolderId'],
            fields='id,name,driveId,mimeType', supportsAllDrives=True).execute()
        report['rootFolder'] = {
            'id': info.get('id'), 'name': info.get('name'),
            'driveId': info.get('driveId', ''),
            'inSharedDrive': bool(info.get('driveId')),
        }
    except Exception as exc:
        report['rootFolder'] = {'error': explain_drive_error(exc)}

    # 實際試寫一個小檔再刪除 — 這是唯一能確定「真的可以上傳」的方法
    try:
        from googleapiclient.http import MediaIoBaseUpload
        probe = service.files().create(
            body={'name': '_hlx_write_probe.txt', 'parents': [report['rootFolderId']]},
            media_body=MediaIoBaseUpload(io.BytesIO(b'probe'), mimetype='text/plain'),
            fields='id', supportsAllDrives=True).execute()
        service.files().delete(fileId=probe['id'], supportsAllDrives=True).execute()
        report['canWrite'] = True
        report['nextStep'] = '設定完成，可正常上傳 PDF 表單至 Drive。'
    except Exception as exc:
        report['canWrite'] = False
        report['nextStep'] = explain_drive_error(exc)
        report['hints'] = _setup_hints(report)

    return report


def _setup_hints(report: dict) -> list:
    """依診斷結果列出具體待辦，讓使用者知道確切卡在哪一步。"""
    hints = []
    sa = report.get('serviceAccountEmail') or '（無法讀取服務帳號信箱）'
    configured = report.get('sharedDriveId', '')

    if not report.get('sharedDrives'):
        hints.append(
            f'服務帳號 {sa} 尚未被加入任何共用雲端硬碟。'
            '請在共用雲端硬碟（不是一般資料夾）的「管理成員」中加入此帳號，'
            '權限選「內容管理者」。')

    if configured and configured not in [d['id'] for d in report.get('sharedDrives', [])]:
        hints.append(
            f'GDRIVE_SHARED_DRIVE_ID 目前為 {configured}，'
            '但它不是服務帳號可存取的共用雲端硬碟 ID。'
            '共用雲端硬碟的 ID 通常以 0A 開頭；'
            '若以 1 開頭，那是一般資料夾的 ID，不是共用硬碟。')

    root = report.get('rootFolder') or {}
    if root and not root.get('error') and not root.get('inSharedDrive'):
        hints.append(
            f"根資料夾「{root.get('name', '')}」位於「我的雲端硬碟」而非共用雲端硬碟；"
            '服務帳號在此沒有儲存容量，必須改指向共用硬碟內的資料夾。')

    return hints


def explain_drive_error(exc: Exception) -> str:
    """把 Google Drive API 的原始錯誤轉成可行動的中文提示。"""
    text = str(exc)
    if 'storageQuotaExceeded' in text or 'do not have storage quota' in text:
        return ('Google 服務帳號本身沒有雲端硬碟容量，無法上傳檔案。'
                '請改用「共用雲端硬碟（Shared Drive）」並將服務帳號加為成員，'
                '或改用 OAuth 授權（/api/drive/authorize）。')
    if 'invalid_grant' in text:
        return ('Google Drive 授權已過期或被撤銷，請重新授權：開啟 /api/drive/authorize。')
    if 'insufficientPermissions' in text or 'forbidden' in text.lower():
        return ('沒有此資料夾的寫入權限，請確認服務帳號或帳號已被加入該 Drive 資料夾的編輯者。')
    if 'DRIVE_NOT_CONFIGURED' in text or 'SA_NOT_FOUND' in text:
        return '尚未設定 Google Drive 認證，請先完成服務帳號或 OAuth 設定。'
    return text


def _render_form_pdf(payload: dict, form_type: str) -> bytes:
    """呼叫表單 PDF 產生器（相容套件內／獨立執行兩種匯入路徑）。"""
    try:
        from webapp.form_pdf import render_form_pdf
    except ImportError:
        from form_pdf import render_form_pdf              # type: ignore
    return render_form_pdf(payload, form_type)


def _upload_bytes(service, content: bytes, mimetype: str,
                  filename: str, folder_id: str) -> dict:
    """上傳／覆蓋單一檔案，回傳 (id, webViewLink, action)。"""
    from googleapiclient.http import MediaIoBaseUpload

    media = MediaIoBaseUpload(io.BytesIO(content), mimetype=mimetype, resumable=False)
    existing_id, existing_link = _find_existing_file(service, filename, folder_id)

    if existing_id:
        updated = service.files().update(
            fileId=existing_id, media_body=media, fields='id,webViewLink',
            supportsAllDrives=True).execute()
        return {'id': updated['id'],
                'link': updated.get('webViewLink', existing_link),
                'action': 'updated'}
    created = service.files().create(
        body={'name': filename, 'parents': [folder_id]},
        media_body=media, fields='id,webViewLink',
        supportsAllDrives=True).execute()
    return {'id': created['id'],
            'link': created.get('webViewLink', ''),
            'action': 'created'}


def upload_inspection(data: dict, form_type: str,
                      cloud_folder_path: str, filename: str) -> dict:
    """把一筆表單同步至 Drive。

    主檔為可直接閱讀的 PDF 表單；原始 JSON 另存於同層 `_原始資料` 子資料夾，
    供平台重新匯入使用，不對外當成表單本體呈現。
    """
    from datetime import datetime

    service = _get_service()
    folder_id = _resolve_folder_path(service, cloud_folder_path)

    payload = {k: v for k, v in data.items() if k != 'photoDataUrls'}
    payload['_syncedAt'] = datetime.utcnow().isoformat() + 'Z'
    payload['_formType'] = form_type

    base = filename.rsplit('.', 1)[0] if '.' in filename else filename

    # ── 主檔：PDF 表單 ────────────────────────────────────────────
    pdf_result, pdf_error = None, ''
    try:
        pdf_result = _upload_bytes(
            service, _render_form_pdf(payload, form_type),
            'application/pdf', f'{base}.pdf', folder_id)
    except Exception as exc:
        pdf_error = explain_drive_error(exc)
        logger.error('[Drive] PDF 產生／上傳失敗：%s（原始：%s）', pdf_error, exc)

    # ── 附檔：原始 JSON（存於 _原始資料 子資料夾）────────────────
    json_result = None
    try:
        raw_folder_id = _find_or_create_folder(service, '_原始資料', folder_id)
        json_result = _upload_bytes(
            service, json.dumps(payload, ensure_ascii=False, indent=2).encode('utf-8'),
            'application/json', f'{base}.json', raw_folder_id)
    except Exception as exc:
        logger.warning('[Drive] 原始 JSON 上傳失敗：%s', exc)

    primary = pdf_result or json_result
    if primary is None:
        return {'success': False,
                'error': pdf_error or 'Drive 上傳失敗（PDF 與 JSON 皆未成功）'}

    return {
        'success': True,
        'driveFileId':   primary['id'],
        'driveWebLink':  primary['link'],
        'action':        primary['action'],
        'format':        'PDF' if pdf_result else 'JSON',
        'pdfFileName':   f'{base}.pdf' if pdf_result else '',
        'jsonFileId':    json_result['id'] if json_result else '',
        'jsonWebLink':   json_result['link'] if json_result else '',
        'pdfError':      pdf_error,
    }


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
