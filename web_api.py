#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
橫流溪流域智慧管理平台 - Web API
Hengliuxi Stream Smart Management Platform - Web API
"""

from flask import Flask, jsonify, request, send_file, send_from_directory, redirect
from flask_cors import CORS
from functools import wraps
from datetime import datetime
import json
import io
import csv
import os
import base64
from urllib.parse import quote
from database_manager import HengliuxiDatabase

# Import RAG blueprint
try:
    from webapp.rag_backend import register_rag_blueprint
    RAG_AVAILABLE = True
except (ImportError, OSError) as _rag_err:
    RAG_AVAILABLE = False
    print(f"[WARNING] RAG module not available ({type(_rag_err).__name__}: {_rag_err}). Some features may be disabled.")

try:
    from webapp.nlp_rag_api import register_nlp_rag_blueprint
    NLP_RAG_AVAILABLE = True
except (ImportError, OSError) as e:
    NLP_RAG_AVAILABLE = False
    print(f"[WARNING] NLP/RAG extension module not available: {e}")

PROJECT_ROOT = os.path.dirname(os.path.abspath(__file__))
WEBAPP_DIR = os.path.join(PROJECT_ROOT, 'webapp')
DB_PATH = os.path.join(PROJECT_ROOT, 'hengliuxi.db')

# OneDrive / SharePoint 雲端媒體設定（保留備用）
ONEDRIVE_SHARE_URL = os.environ.get('ONEDRIVE_SHARE_URL', '')
ONEDRIVE_BASE_FOLDER = os.environ.get('ONEDRIVE_BASE_FOLDER', '01_工程設施維護與資料')

# Google Drive 媒體設定
# webapp/data/gdrive_index.json 由 scripts/generate_gdrive_index.py 產生
GDRIVE_INDEX_PATH = os.path.join(PROJECT_ROOT, 'webapp', 'data', 'gdrive_index.json')
GDRIVE_BASE_FOLDER = os.environ.get('GDRIVE_BASE_FOLDER', '01_工程設施維護與資料')
_gdrive_index = None


def get_gdrive_index():
    """載入 Google Drive 路徑索引（首次呼叫時讀取一次）"""
    global _gdrive_index
    if _gdrive_index is None:
        if os.path.exists(GDRIVE_INDEX_PATH):
            with open(GDRIVE_INDEX_PATH, 'r', encoding='utf-8') as f:
                _gdrive_index = json.load(f)
            print(f"[INFO] Google Drive 索引載入完成，共 {len(_gdrive_index)} 筆")
        else:
            _gdrive_index = {}
    return _gdrive_index


def make_gdrive_url(media_path):
    """
    依 media_path 查詢 Google Drive 索引，回傳適合直接嵌入的 URL。
    PDF  → Google Drive 線上預覽頁
    圖片 → 直接圖片連結
    """
    norm = media_path.replace('\\', '/')
    base = GDRIVE_BASE_FOLDER.rstrip('/')
    relative = norm[len(base) + 1:] if norm.startswith(base + '/') else norm

    index = get_gdrive_index()
    file_id = index.get(relative)
    if not file_id:
        return None

    ext = os.path.splitext(relative)[1].lower()
    if ext == '.pdf':
        # Google Drive 內嵌 PDF 預覽
        return f"https://drive.google.com/file/d/{file_id}/preview"
    elif ext in ('.mp4', '.mov', '.avi', '.mkv', '.wmv'):
        # 影片：Google Drive 播放頁
        return f"https://drive.google.com/file/d/{file_id}/preview"
    else:
        # 圖片：使用 Google lh3 CDN 直連（可直接嵌入 <img> 標籤，不會跳轉到下載警告頁）
        return f"https://lh3.googleusercontent.com/d/{file_id}"


def make_onedrive_redirect_url(media_path):
    """
    將本地 media_path 轉換為 Microsoft Graph / SharePoint Shares API 下載 URL。
    支援 OneDrive 個人版 (1drv.ms) 及 SharePoint Online (*.sharepoint.com) 分享連結。
    media_path 例：01_工程設施維護與資料/巡查紀錄/file.pdf
    API：https://graph.microsoft.com/v1.0/shares/{id}/root:/{path}:/content
    """
    if not ONEDRIVE_SHARE_URL:
        return None

    # 標準化路徑分隔符
    norm = media_path.replace('\\', '/')

    # 移除 base folder 前綴（分享的就是這個資料夾本身）
    base = ONEDRIVE_BASE_FOLDER.rstrip('/')
    if norm.startswith(base + '/'):
        relative = norm[len(base) + 1:]
    else:
        relative = norm

    # 將完整分享連結（含 ?e= token）編碼為 base64url，供 Microsoft Graph Shares API 使用
    b64 = base64.b64encode(ONEDRIVE_SHARE_URL.encode('utf-8')).decode('utf-8')
    b64 = b64.rstrip('=').replace('+', '-').replace('/', '_')
    share_id = 'u!' + b64

    # Microsoft Graph Shares API（支援 OneDrive 及 SharePoint）
    encoded_path = quote(relative, safe='/')
    return f"https://graph.microsoft.com/v1.0/shares/{share_id}/root:/{encoded_path}:/content"
ALLOWED_MEDIA_EXTENSIONS = {
    '.pdf', '.mp4', '.mov', '.avi', '.mkv', '.wmv',
    '.jpg', '.jpeg', '.png', '.gif', '.webp',
    '.xlsx', '.xls', '.csv', '.json', '.md', '.qgis'
}

# 與 webapp/serve_static.py 的 NO_CACHE_EXTS 保持一致，避免瀏覽器快取舊版前端程式碼
NO_CACHE_EXTS = {'.html', '.js', '.mjs', '.json', '.jsonl', '.css'}

app = Flask(__name__, static_folder=WEBAPP_DIR, static_url_path='/webapp')
CORS(app, expose_headers='*')  # Expose all headers to ensure no fields are filtered


@app.after_request
def _disable_static_cache(response):
    """停用 /webapp 前端資源（HTML/JS/CSS/JSON）的瀏覽器快取，確保程式碼修改後立即生效。"""
    ext = os.path.splitext(request.path)[1].lower()
    if request.path.startswith('/webapp/') and ext in NO_CACHE_EXTS:
        response.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
        response.headers['Pragma'] = 'no-cache'
        response.headers['Expires'] = '0'
    return response

# Register RAG blueprint if available
if RAG_AVAILABLE:
    register_rag_blueprint(app)
    print("[INFO] RAG blueprint registered successfully")

if NLP_RAG_AVAILABLE:
    register_nlp_rag_blueprint(app)
    print("[INFO] NLP/RAG extension blueprint registered successfully")

# 直接在主 app 掛載 /api/smart-ask，確保路由一定存在
if NLP_RAG_AVAILABLE:
    try:
        from webapp.nlp_rag_api import smart_ask as _smart_ask_fn
        app.add_url_rule('/api/smart-ask', 'smart_ask_direct', _smart_ask_fn, methods=['POST'])
        print("[INFO] /api/smart-ask route registered directly")
    except Exception as _e:
        print(f"[WARNING] Could not register /api/smart-ask directly: {_e}")

# ── Google Drive OAuth2 自動上傳 ──────────────────────────────────────
try:
    from webapp.drive_service import (upload_inspection as _drive_upload,
                                       is_configured as _drive_configured,
                                       start_oauth_flow, finish_oauth_flow)
    DRIVE_SERVICE_AVAILABLE = True
    print(f"[INFO] Drive service 已載入，{'✅ Token 已授權' if _drive_configured() else '⚠ 尚未授權（請前往 /api/drive/authorize）'}")
except (ImportError, OSError) as _drive_err:
    DRIVE_SERVICE_AVAILABLE = False
    print(f"[WARNING] Drive service 無法載入：{_drive_err}")

def _drive_redirect_uri():
    return 'http://localhost:5000/api/drive/oauth-callback'

@app.route('/api/drive/authorize', methods=['GET'])
def api_drive_authorize():
    """產生 Google 授權頁面 URL 並重定向（一次性設定）"""
    from flask import redirect as flask_redirect, jsonify
    if not DRIVE_SERVICE_AVAILABLE:
        return jsonify({'error': 'Drive 模組未載入'}), 503
    import os
    secret_path = os.path.join(PROJECT_ROOT, 'webapp', 'data', 'gdrive_client_secret.json')
    if not os.path.exists(secret_path):
        return jsonify({
            'error': '找不到 gdrive_client_secret.json',
            'hint': '請至 Google Cloud Console 建立「OAuth 2.0 用戶端 ID（桌面應用程式）」並下載 JSON 存為 webapp/data/gdrive_client_secret.json'
        }), 400
    try:
        auth_url = start_oauth_flow(_drive_redirect_uri())
        return flask_redirect(auth_url)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/drive/oauth-callback', methods=['GET'])
def api_drive_oauth_callback():
    """Google OAuth2 回呼，儲存 Token 後顯示成功頁"""
    from flask import request, jsonify
    code = request.args.get('code')
    if not code:
        return '授權失敗：沒有收到 code 參數', 400
    try:
        finish_oauth_flow(code, _drive_redirect_uri())
        return '''<html><body style="font-family:sans-serif;text-align:center;padding:60px">
            <h2 style="color:#16a34a">✅ Google Drive 授權成功！</h2>
            <p>Token 已儲存，系統將自動上傳巡查資料至 Google Drive。</p>
            <p>請回到應用程式重新整理頁面。</p>
            <a href="http://localhost:5000/webapp/#" style="background:#1565c0;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:700">返回系統</a>
        </body></html>'''
    except Exception as e:
        return f'授權失敗：{e}', 500

@app.route('/api/drive/sync-inspection', methods=['POST'])
def api_drive_sync_inspection():
    """接收巡查資料並上傳/覆蓋至 Google Drive"""
    from flask import request, jsonify
    if not DRIVE_SERVICE_AVAILABLE:
        return jsonify({'success': False, 'error': 'Drive service 未安裝'}), 503
    try:
        from webapp.drive_service import is_configured
        if not is_configured():
            return jsonify({'success': False, 'error': '尚未授權', 'setup_needed': True}), 400
        body = request.get_json(force=True) or {}
        result = _drive_upload(
            body.get('data', {}),
            body.get('formType', ''),
            body.get('cloudFolder', '巡查資料管理'),
            body.get('filename', f'inspection_{body.get("formType","")}_{body.get("data",{}).get("date","")}.json')
        )
        return jsonify(result)
    except Exception as e:
        import traceback; traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/drive/status', methods=['GET'])
def api_drive_status():
    """回傳 Drive 授權狀態"""
    from flask import jsonify
    if not DRIVE_SERVICE_AVAILABLE:
        return jsonify({'available': False, 'configured': False, 'reason': 'module_unavailable'})
    try:
        configured = _drive_configured()
        return jsonify({'available': True, 'configured': configured,
                        'rootFolderId': '1k2s5HSd_R5GeCt05SOtJxn6UFSrbyoQ9',
                        'authorizeUrl': '/api/drive/authorize' if not configured else None})
    except Exception as e:
        return jsonify({'available': False, 'configured': False, 'reason': str(e)})

# ── 雙向同步存儲（本機 ↔ 雲端）──────────────────────────────────────
# 用 JSON 檔案儲存同步記錄，適合 Render.com 及本機兩用
_SYNC_DATA_DIR  = os.path.join(PROJECT_ROOT, 'webapp', 'data')
_SYNC_INSP_FILE = os.path.join(_SYNC_DATA_DIR, 'synced_inspections.json')
_SYNC_FAC_FILE  = os.path.join(_SYNC_DATA_DIR, 'synced_facilities.json')

def _sync_load(path):
    try:
        with open(path, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception:
        return []

def _sync_save(path, records):
    os.makedirs(_SYNC_DATA_DIR, exist_ok=True)
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(records, f, ensure_ascii=False, indent=2)

def _sync_merge(existing: list, incoming: list, id_key='id') -> list:
    """合併兩份記錄，相同 ID 以 updatedAt / syncedAt 較新者為準"""
    merged = {str(r.get(id_key)): r for r in existing if r.get(id_key)}
    for rec in incoming:
        rid = str(rec.get(id_key, ''))
        if not rid:
            continue
        ex = merged.get(rid)
        if ex is None:
            merged[rid] = rec
        else:
            t_new = rec.get('driveSyncedAt') or rec.get('syncedAt') or rec.get('date') or ''
            t_old = ex.get('driveSyncedAt') or ex.get('syncedAt') or ex.get('date') or ''
            if t_new >= t_old:
                merged[rid] = rec
    return list(merged.values())

@app.route('/api/sync/inspections', methods=['GET', 'POST', 'OPTIONS'])
def api_sync_inspections():
    """雙向巡查資料同步端點（本機 ↔ 雲端）"""
    if request.method == 'OPTIONS':
        return '', 204
    if request.method == 'GET':
        since = request.args.get('since', '')
        records = _sync_load(_SYNC_INSP_FILE)
        if since:
            records = [r for r in records
                       if (r.get('driveSyncedAt') or r.get('date') or '') >= since]
        return jsonify({
            'success': True,
            'count': len(records),
            'records': records,
            'serverTime': datetime.utcnow().isoformat() + 'Z'
        })
    # POST: 上傳並合併
    body = request.get_json(force=True) or {}
    incoming = body.get('records', [])
    if not isinstance(incoming, list):
        return jsonify({'success': False, 'error': 'records 必須為陣列'}), 400
    existing = _sync_load(_SYNC_INSP_FILE)
    merged   = _sync_merge(existing, incoming)
    _sync_save(_SYNC_INSP_FILE, merged)
    return jsonify({
        'success': True,
        'received': len(incoming),
        'total': len(merged),
        'serverTime': datetime.utcnow().isoformat() + 'Z'
    })

@app.route('/api/sync/facilities', methods=['GET', 'POST', 'OPTIONS'])
def api_sync_facilities():
    """雙向設施資料同步端點"""
    if request.method == 'OPTIONS':
        return '', 204
    if request.method == 'GET':
        records = _sync_load(_SYNC_FAC_FILE)
        return jsonify({'success': True, 'count': len(records), 'records': records,
                        'serverTime': datetime.utcnow().isoformat() + 'Z'})
    body = request.get_json(force=True) or {}
    incoming = body.get('records', [])
    existing = _sync_load(_SYNC_FAC_FILE)
    merged   = _sync_merge(existing, incoming)
    _sync_save(_SYNC_FAC_FILE, merged)
    return jsonify({'success': True, 'received': len(incoming), 'total': len(merged),
                    'serverTime': datetime.utcnow().isoformat() + 'Z'})

@app.route('/api/sync/status', methods=['GET'])
def api_sync_status():
    """回傳同步端點狀態"""
    insp  = _sync_load(_SYNC_INSP_FILE)
    fac   = _sync_load(_SYNC_FAC_FILE)
    return jsonify({
        'ok': True,
        'inspections': len(insp),
        'facilities': len(fac),
        'serverTime': datetime.utcnow().isoformat() + 'Z',
        'host': request.host
    })

# 初始化資料庫（使用絕對路徑確保雲端部署正確）
db = HengliuxiDatabase(DB_PATH)


@app.route('/', methods=['GET'])
def root_redirect():
    """Single entrypoint for external access."""
    return redirect('/webapp/', code=302)


@app.route('/webapp/', methods=['GET'])
def serve_webapp_index():
    """Serve frontend index from Flask."""
    return send_from_directory(WEBAPP_DIR, 'index.html')


@app.route('/webapp/<path:asset_path>', methods=['GET'])
def serve_webapp_assets(asset_path):
    """Serve frontend assets from Flask."""
    return send_from_directory(WEBAPP_DIR, asset_path)


@app.route('/media/<path:media_path>', methods=['GET', 'HEAD'])
def serve_project_media(media_path):
    """Serve project media files with path traversal protection."""
    normalized = os.path.normpath(media_path.replace('\\', os.sep).replace('/', os.sep))
    if normalized.startswith('..') or os.path.isabs(normalized):
        return jsonify({'error': 'invalid media path'}), 400

    full_path = os.path.abspath(os.path.join(PROJECT_ROOT, normalized))
    if not full_path.startswith(PROJECT_ROOT):
        return jsonify({'error': 'invalid media path'}), 400

    ext = os.path.splitext(full_path)[1].lower()
    if ext not in ALLOWED_MEDIA_EXTENSIONS:
        return jsonify({'error': 'unsupported media type'}), 403

    if not os.path.isfile(full_path):
        # 1. 優先查 Google Drive 索引
        gdrive_url = make_gdrive_url(media_path.replace('\\', '/'))
        if gdrive_url:
            return redirect(gdrive_url, code=302)
        # 2. 備用：OneDrive / SharePoint
        onedrive_url = make_onedrive_redirect_url(media_path.replace('\\', '/'))
        if onedrive_url:
            return redirect(onedrive_url, code=302)
        return jsonify({'error': 'media not found', 'path': media_path}), 404

    return send_file(full_path, conditional=True)

# API響應裝飾器
def api_response(f):
    """統一API響應格式"""
    @wraps(f)
    def decorated(*args, **kwargs):
        try:
            result = f(*args, **kwargs)
            return jsonify({
                'success': True,
                'data': result,
                'timestamp': datetime.now().isoformat()
            }), 200
        except Exception as e:
            return jsonify({
                'success': False,
                'error': str(e),
                'timestamp': datetime.now().isoformat()
            }), 500
    return decorated


# =====================================================
# 基礎信息API
# =====================================================

@app.route('/api/v1/health', methods=['GET'])
def health_check():
    """健康檢查端點"""
    return jsonify({
        'status': 'healthy',
        'service': 'Hengliuxi Stream Management Database API',
        'timestamp': datetime.now().isoformat()
    }), 200


@app.route('/api/v1/database-summary', methods=['GET'])
@api_response
def get_database_summary():
    """獲取資料庫摘要統計"""
    return db.get_database_summary()


# =====================================================
# 魚類調查API
# =====================================================

@app.route('/api/v1/fish-species', methods=['GET'])
@api_response
def list_fish_species():
    """獲取所有魚類物種"""
    return db.get_fish_species_list()


@app.route('/api/v1/fish-survey', methods=['POST'])
@api_response
def create_fish_survey():
    """新增魚類調查記錄"""
    data = request.get_json()
    if db.add_fish_survey(data):
        return {'message': '調查記錄新增成功', 'survey_id': data.get('survey_id')}
    else:
        raise Exception('新增魚類調查失敗')


@app.route('/api/v1/fish-survey/species/<species_id>', methods=['GET'])
@api_response
def get_fish_survey_by_species(species_id):
    """獲取某物種的所有調查記錄"""
    return db.get_survey_by_species(species_id)


@app.route('/api/v1/fish-monitoring-stats', methods=['GET'])
@api_response
def get_fish_monitoring_stats():
    """獲取魚類監測統計"""
    return db.get_fish_monitoring_stats()


@app.route('/api/v1/ecological-quality/<segment_id>', methods=['GET'])
@api_response
def get_ecological_quality(segment_id):
    """獲取段落生態品質指數"""
    return db.get_ecological_quality_index(segment_id)


# =====================================================
# 工程設施API
# =====================================================

@app.route('/api/v1/engineering-structures', methods=['GET'])
@api_response
def list_engineering_structures():
    """列出所有工程設施（含最新檢測狀況）"""
    return db.get_all_structures()


@app.route('/api/v1/engineering-structures/<structure_id>', methods=['GET'])
@api_response
def get_engineering_structure(structure_id):
    """獲取單一設施詳細資料"""
    result = db.get_structure_by_id(structure_id)
    if result is None:
        raise Exception(f'設施 {structure_id} 不存在')
    return result


@app.route('/api/v1/engineering-structures/<structure_id>', methods=['PUT'])
@api_response
def update_engineering_structure(structure_id):
    """更新設施狀況"""
    data = request.get_json() or {}
    if db.update_structure_condition(structure_id, data):
        return {'message': '設施資料已更新', 'structure_id': structure_id}
    raise Exception('更新失敗，請確認設施 ID 與欄位名稱')


@app.route('/api/v1/der-assessment/<structure_id>', methods=['GET'])
@api_response
def get_der_assessment(structure_id):
    """查詢設施 DER&U 評估歷史"""
    return db.get_der_assessment(structure_id)


@app.route('/api/v1/engineering-structures', methods=['POST'])
@api_response
def create_engineering_structure():
    """新增工程設施"""
    data = request.get_json()
    if db.add_engineering_structure(data):
        return {'message': '工程設施新增成功', 'structure_id': data.get('structure_id')}
    else:
        raise Exception('新增工程設施失敗')


@app.route('/api/v1/engineering-structures/segment/<segment_id>', methods=['GET'])
@api_response
def get_structures_by_segment(segment_id):
    """獲取段落內的所有設施"""
    return db.get_structures_by_segment(segment_id)


@app.route('/api/v1/structure-inspection', methods=['POST'])
@api_response
def create_structure_inspection():
    """新增設施檢測記錄"""
    data = request.get_json()
    if db.add_structure_inspection(data):
        return {'message': '檢測記錄新增成功', 'inspection_id': data.get('inspection_id')}
    else:
        raise Exception('新增設施檢測失敗')


@app.route('/api/v1/urgent-repairs', methods=['GET'])
@api_response
def get_urgent_repairs():
    """獲取緊急修復清單"""
    return db.get_urgent_repairs()


# =====================================================
# 巡查紀錄API
# =====================================================

@app.route('/api/v1/patrol-records', methods=['POST'])
@api_response
def create_patrol_record():
    """新增巡查紀錄"""
    data = request.get_json()
    if db.add_patrol_record(data):
        return {'message': '巡查紀錄新增成功', 'patrol_id': data.get('patrol_id')}
    else:
        raise Exception('新增巡查紀錄失敗')


@app.route('/api/v1/abnormality-assessment', methods=['POST'])
@api_response
def create_abnormality_assessment():
    """新增異常評估"""
    data = request.get_json()
    if db.add_abnormality_assessment(data):
        return {'message': '異常評估新增成功', 'assessment_id': data.get('assessment_id')}
    else:
        raise Exception('新增異常評估失敗')


@app.route('/api/v1/abnormality-summary', methods=['GET'])
@api_response
def get_abnormality_summary():
    """獲取異常統計摘要"""
    return db.get_abnormality_summary()


# =====================================================
# AI影像分析API
# =====================================================

@app.route('/api/v1/ai-image-analysis', methods=['POST'])
@api_response
def create_ai_image_analysis():
    """新增AI影像分析結果"""
    data = request.get_json()
    if db.add_ai_image_analysis(data):
        return {'message': 'AI分析結果新增成功', 'analysis_id': data.get('analysis_id')}
    else:
        raise Exception('新增AI影像分析失敗')


# =====================================================
# 數據匯出API
# =====================================================

@app.route('/api/v1/export/fish-survey/csv', methods=['GET'])
def export_fish_survey_csv():
    """匯出魚類調查數據為CSV"""
    query = """
        SELECT fs.survey_id, ss.segment_name, fs.survey_date,
               fsp.species_name_chn, fs.quantity, fs.avg_size,
               fs.survey_method, fs.surveyor_name
        FROM fish_survey fs
        JOIN stream_segments ss ON fs.segment_id = ss.segment_id
        JOIN fish_species fsp ON fs.species_id = fsp.species_id
        ORDER BY fs.survey_date DESC
    """

    output = io.StringIO()
    with db.get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(query)
        columns = [description[0] for description in cursor.description]
        rows = cursor.fetchall()

        writer = csv.writer(output)
        writer.writerow(columns)
        writer.writerows(rows)

    output.seek(0)
    return send_file(
        io.BytesIO(output.getvalue().encode('utf-8-sig')),
        mimetype='text/csv; charset=utf-8-sig',
        as_attachment=True,
        download_name=f'fish_survey_{datetime.now().strftime("%Y%m%d_%H%M%S")}.csv'
    )


@app.route('/api/v1/export/inspections/csv', methods=['GET'])
def export_inspections_csv():
    """匯出設施檢測數據為CSV"""
    query = """
        SELECT si.inspection_id, es.structure_name, ss.segment_name,
               si.inspection_date, si.condition_grade, si.deterioration_degree,
               si.risk_influence, si.overall_score, si.urgency_level,
               si.repair_status
        FROM structure_inspection si
        JOIN engineering_structures es ON si.structure_id = es.structure_id
        JOIN stream_segments ss ON es.segment_id = ss.segment_id
        ORDER BY si.inspection_date DESC
    """

    output = io.StringIO()
    with db.get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(query)
        columns = [description[0] for description in cursor.description]
        rows = cursor.fetchall()

        writer = csv.writer(output)
        writer.writerow(columns)
        writer.writerows(rows)

    output.seek(0)
    return send_file(
        io.BytesIO(output.getvalue().encode('utf-8-sig')),
        mimetype='text/csv; charset=utf-8-sig',
        as_attachment=True,
        download_name=f'inspections_{datetime.now().strftime("%Y%m%d_%H%M%S")}.csv'
    )


@app.route('/api/v1/export/urgent-repairs/csv', methods=['GET'])
def export_urgent_repairs_csv():
    """匯出緊急修復清單為CSV"""
    query = """
        SELECT * FROM v_urgent_repairs_needed
        ORDER BY inspection_date DESC
    """

    output = io.StringIO()
    with db.get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(query)
        columns = [description[0] for description in cursor.description]
        rows = cursor.fetchall()

        writer = csv.writer(output)
        writer.writerow(columns)
        writer.writerows(rows)

    output.seek(0)
    return send_file(
        io.BytesIO(output.getvalue().encode('utf-8-sig')),
        mimetype='text/csv; charset=utf-8-sig',
        as_attachment=True,
        download_name=f'urgent_repairs_{datetime.now().strftime("%Y%m%d_%H%M%S")}.csv'
    )


# =====================================================
# 查詢API
# =====================================================

@app.route('/api/v1/segments/<segment_id>/latest-inspection', methods=['GET'])
@api_response
def get_segment_latest_inspection(segment_id):
    """獲取段落最新檢測狀況"""
    return db.get_segment_latest_inspection(segment_id)


# =====================================================
# RAG 反饋 API
# =====================================================

@app.route('/api/v1/rag-feedback', methods=['POST'])
@api_response
def create_rag_feedback():
    """新增 RAG 答覆反饋"""
    data = request.get_json()
    if db.add_rag_feedback(data):
        return {
            'message': '反饋已記錄',
            'feedback_id': data.get('id'),
            'total_feedback': db.get_rag_feedback_count()
        }
    else:
        raise Exception('新增反饋失敗')


@app.route('/api/v1/rag-feedback/stats', methods=['GET'])
@api_response
def get_rag_feedback_stats():
    """獲取反饋統計"""
    return db.get_rag_feedback_stats()


@app.route('/api/v1/rag-feedback/list', methods=['GET'])
@api_response
def list_rag_feedback():
    """獲取反饋清單（分頁）"""
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 50, type=int)
    confidence_level = request.args.get('confidence_level', None)

    return db.get_rag_feedback_paginated(page, per_page, confidence_level)


# =====================================================
# 錯誤處理
# =====================================================

@app.errorhandler(404)
def not_found(error):
    """404錯誤處理"""
    return jsonify({
        'success': False,
        'error': '資源不存在',
        'timestamp': datetime.now().isoformat()
    }), 404


@app.errorhandler(500)
def internal_error(error):
    """500錯誤處理"""
    return jsonify({
        'success': False,
        'error': '內部伺服器錯誤',
        'timestamp': datetime.now().isoformat()
    }), 500


if __name__ == '__main__':
    debug = os.environ.get('FLASK_DEBUG', '0') == '1'
    app.run(
        host='0.0.0.0',
        port=int(os.environ.get('FLASK_PORT', '5000')),
        debug=debug,
        use_reloader=debug
    )
