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
from database_manager import HengliuxiDatabase

# Import RAG blueprint
try:
    from webapp.rag_backend import register_rag_blueprint
    RAG_AVAILABLE = True
except ImportError:
    RAG_AVAILABLE = False
    print("[WARNING] RAG module not available. Some features may be disabled.")

try:
    from webapp.nlp_rag_api import register_nlp_rag_blueprint
    NLP_RAG_AVAILABLE = True
except ImportError as e:
    NLP_RAG_AVAILABLE = False
    print(f"[WARNING] NLP/RAG extension module not available: {e}")

PROJECT_ROOT = os.path.dirname(os.path.abspath(__file__))
WEBAPP_DIR = os.path.join(PROJECT_ROOT, 'webapp')
ALLOWED_MEDIA_EXTENSIONS = {
    '.pdf', '.mp4', '.mov', '.avi', '.mkv', '.wmv',
    '.jpg', '.jpeg', '.png', '.gif', '.webp',
    '.xlsx', '.xls', '.csv', '.json', '.md', '.qgis'
}

app = Flask(__name__, static_folder=WEBAPP_DIR, static_url_path='/webapp')
CORS(app, expose_headers='*')  # Expose all headers to ensure no fields are filtered

# Register RAG blueprint if available
if RAG_AVAILABLE:
    register_rag_blueprint(app)
    print("[INFO] RAG blueprint registered successfully")

if NLP_RAG_AVAILABLE:
    register_nlp_rag_blueprint(app)
    print("[INFO] NLP/RAG extension blueprint registered successfully")

# 初始化資料庫
db = HengliuxiDatabase('hengliuxi.db')


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
