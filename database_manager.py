#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
橫流溪流域棲地環保及設施智慧化管理資料庫管理系統
Database Manager for Hengliuxi Stream
"""

import sqlite3
import json
import csv
from datetime import datetime, date
from pathlib import Path
from typing import List, Dict, Any, Optional, Tuple
import logging
from contextlib import contextmanager

# 配置日誌
_log_handlers = [logging.StreamHandler()]
try:
    _log_handlers.insert(0, logging.FileHandler('database_operations.log', encoding='utf-8'))
except (PermissionError, OSError):
    pass

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=_log_handlers
)
logger = logging.getLogger(__name__)


class HengliuxiDatabase:
    """橫流溪資料庫管理類"""

    def __init__(self, db_path: str = 'hengliuxi.db'):
        """初始化資料庫連接

        Args:
            db_path: 資料庫文件路徑
        """
        self.db_path = db_path
        self.db_exists = Path(db_path).exists()

    @contextmanager
    def get_connection(self):
        """獲取資料庫連接上下文管理器"""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA foreign_keys = ON")
        try:
            yield conn
            conn.commit()
        except Exception as e:
            conn.rollback()
            logger.error(f"資料庫錯誤: {e}")
            raise
        finally:
            conn.close()

    def init_database(self, schema_path: str) -> bool:
        """從SQL文件初始化資料庫

        Args:
            schema_path: SQL架構文件路徑

        Returns:
            bool: 初始化是否成功
        """
        try:
            with open(schema_path, 'r', encoding='utf-8') as f:
                sql_script = f.read()

            with self.get_connection() as conn:
                cursor = conn.cursor()
                cursor.executescript(sql_script)

            logger.info(f"資料庫初始化成功: {self.db_path}")
            return True
        except Exception as e:
            logger.error(f"資料庫初始化失敗: {e}")
            return False

    # =====================================================
    # 魚類調查相關方法
    # =====================================================

    def add_fish_survey(self, survey_data: Dict[str, Any]) -> bool:
        """新增魚類調查記錄"""
        try:
            with self.get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    INSERT INTO fish_survey
                    (survey_id, segment_id, survey_date, species_id, quantity,
                     avg_size, survey_method, surveyor_name, observation)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    survey_data.get('survey_id'),
                    survey_data.get('segment_id'),
                    survey_data.get('survey_date'),
                    survey_data.get('species_id'),
                    survey_data.get('quantity', 0),
                    survey_data.get('avg_size'),
                    survey_data.get('survey_method'),
                    survey_data.get('surveyor_name'),
                    survey_data.get('observation')
                ))
            logger.info(f"添加魚類調查: {survey_data.get('survey_id')}")
            return True
        except Exception as e:
            logger.error(f"添加魚類調查失敗: {e}")
            return False

    def get_fish_species_list(self) -> List[Dict]:
        """獲取所有魚類物種"""
        try:
            with self.get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("SELECT * FROM fish_species ORDER BY species_name_chn")
                return [dict(row) for row in cursor.fetchall()]
        except Exception as e:
            logger.error(f"查詢魚類物種失敗: {e}")
            return []

    def get_survey_by_species(self, species_id: str) -> List[Dict]:
        """獲取某物種的所有調查記錄"""
        try:
            with self.get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    SELECT fs.*, ss.segment_name, fsp.species_name_chn
                    FROM fish_survey fs
                    JOIN stream_segments ss ON fs.segment_id = ss.segment_id
                    JOIN fish_species fsp ON fs.species_id = fsp.species_id
                    WHERE fs.species_id = ?
                    ORDER BY fs.survey_date DESC
                """, (species_id,))
                return [dict(row) for row in cursor.fetchall()]
        except Exception as e:
            logger.error(f"查詢物種調查記錄失敗: {e}")
            return []

    def get_ecological_quality_index(self, segment_id: str) -> Dict:
        """獲取段落生態品質指數"""
        try:
            with self.get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    SELECT * FROM v_ecological_quality_index
                    WHERE segment_id = ?
                """, (segment_id,))
                row = cursor.fetchone()
                return dict(row) if row else {}
        except Exception as e:
            logger.error(f"查詢生態品質指數失敗: {e}")
            return {}

    # =====================================================
    # 工程設施相關方法
    # =====================================================

    def add_engineering_structure(self, structure_data: Dict[str, Any]) -> bool:
        """新增工程設施"""
        try:
            with self.get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    INSERT INTO engineering_structures
                    (structure_id, segment_id, structure_type, structure_name,
                     chainage, longitude, latitude, construction_date, construction_method,
                     material, length, height, width, cost, design_unit,
                     construction_unit, custodian_unit, current_condition)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    structure_data.get('structure_id'),
                    structure_data.get('segment_id'),
                    structure_data.get('structure_type'),
                    structure_data.get('structure_name'),
                    structure_data.get('chainage'),
                    structure_data.get('longitude'),
                    structure_data.get('latitude'),
                    structure_data.get('construction_date'),
                    structure_data.get('construction_method'),
                    structure_data.get('material'),
                    structure_data.get('length'),
                    structure_data.get('height'),
                    structure_data.get('width'),
                    structure_data.get('cost', 0),
                    structure_data.get('design_unit'),
                    structure_data.get('construction_unit'),
                    structure_data.get('custodian_unit'),
                    structure_data.get('current_condition')
                ))
            logger.info(f"添加工程設施: {structure_data.get('structure_id')}")
            return True
        except Exception as e:
            logger.error(f"添加工程設施失敗: {e}")
            return False

    def add_structure_inspection(self, inspection_data: Dict[str, Any]) -> bool:
        """新增設施檢測記錄"""
        try:
            with self.get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    INSERT INTO structure_inspection
                    (inspection_id, structure_id, inspection_date, inspection_type,
                     inspector_name, condition_grade, deterioration_degree,
                     risk_influence, overall_score, findings, defect_description,
                     repair_recommendation, urgency_level, repair_status)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    inspection_data.get('inspection_id'),
                    inspection_data.get('structure_id'),
                    inspection_data.get('inspection_date'),
                    inspection_data.get('inspection_type'),
                    inspection_data.get('inspector_name'),
                    inspection_data.get('condition_grade'),
                    inspection_data.get('deterioration_degree', 0),
                    inspection_data.get('risk_influence', 0),
                    inspection_data.get('overall_score', 0),
                    inspection_data.get('findings'),
                    inspection_data.get('defect_description'),
                    inspection_data.get('repair_recommendation'),
                    inspection_data.get('urgency_level'),
                    inspection_data.get('repair_status', '待評估')
                ))
            logger.info(f"添加設施檢測: {inspection_data.get('inspection_id')}")
            return True
        except Exception as e:
            logger.error(f"添加設施檢測失敗: {e}")
            return False

    def get_structures_by_segment(self, segment_id: str) -> List[Dict]:
        """獲取段落內的所有設施"""
        try:
            with self.get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    SELECT es.*, ss.segment_name
                    FROM engineering_structures es
                    JOIN stream_segments ss ON es.segment_id = ss.segment_id
                    WHERE es.segment_id = ?
                    ORDER BY es.chainage
                """, (segment_id,))
                return [dict(row) for row in cursor.fetchall()]
        except Exception as e:
            logger.error(f"查詢段落設施失敗: {e}")
            return []

    def get_urgent_repairs(self) -> List[Dict]:
        """獲取緊急修復清單"""
        try:
            with self.get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("SELECT * FROM v_urgent_repairs_needed")
                return [dict(row) for row in cursor.fetchall()]
        except Exception as e:
            logger.error(f"查詢緊急修復清單失敗: {e}")
            return []

    # =====================================================
    # 巡查紀錄相關方法
    # =====================================================

    def add_patrol_record(self, patrol_data: Dict[str, Any]) -> bool:
        """新增巡查紀錄"""
        try:
            with self.get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    INSERT INTO patrol_records
                    (patrol_id, segment_id, patrol_date, patrol_time_start,
                     patrol_time_end, weather, patrol_personnel, patrol_method,
                     abnormality_found, summary, photos_count)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    patrol_data.get('patrol_id'),
                    patrol_data.get('segment_id'),
                    patrol_data.get('patrol_date'),
                    patrol_data.get('patrol_time_start'),
                    patrol_data.get('patrol_time_end'),
                    patrol_data.get('weather'),
                    patrol_data.get('patrol_personnel'),
                    patrol_data.get('patrol_method'),
                    patrol_data.get('abnormality_found', 0),
                    patrol_data.get('summary'),
                    patrol_data.get('photos_count', 0)
                ))
            logger.info(f"添加巡查紀錄: {patrol_data.get('patrol_id')}")
            return True
        except Exception as e:
            logger.error(f"添加巡查紀錄失敗: {e}")
            return False

    def add_abnormality_assessment(self, assessment_data: Dict[str, Any]) -> bool:
        """新增異常評估"""
        try:
            with self.get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    INSERT INTO abnormality_assessment
                    (assessment_id, patrol_id, structure_id, abnormality_type,
                     location_description, abnormality_description,
                     deterioration_degree, risk_influence, urgency_grade,
                     der_score, assessment_personnel, status)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    assessment_data.get('assessment_id'),
                    assessment_data.get('patrol_id'),
                    assessment_data.get('structure_id'),
                    assessment_data.get('abnormality_type'),
                    assessment_data.get('location_description'),
                    assessment_data.get('abnormality_description'),
                    assessment_data.get('deterioration_degree', 0),
                    assessment_data.get('risk_influence', 0),
                    assessment_data.get('urgency_grade'),
                    assessment_data.get('der_score', 0),
                    assessment_data.get('assessment_personnel'),
                    assessment_data.get('status', '待評估')
                ))
            logger.info(f"添加異常評估: {assessment_data.get('assessment_id')}")
            return True
        except Exception as e:
            logger.error(f"添加異常評估失敗: {e}")
            return False

    def get_abnormality_summary(self) -> List[Dict]:
        """獲取異常統計摘要"""
        try:
            with self.get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("SELECT * FROM v_abnormality_summary")
                return [dict(row) for row in cursor.fetchall()]
        except Exception as e:
            logger.error(f"查詢異常摘要失敗: {e}")
            return []

    # =====================================================
    # AI影像分析相關方法
    # =====================================================

    def add_ai_image_analysis(self, analysis_data: Dict[str, Any]) -> bool:
        """新增AI影像分析結果"""
        try:
            with self.get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    INSERT INTO ai_image_analysis
                    (analysis_id, abnormality_assessment_id, analysis_date,
                     original_image_path, processed_image_path, ai_model_version,
                     detected_abnormalities, confidence_score, defect_area,
                     damage_extent, deterioration_features, recommended_action,
                     status)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    analysis_data.get('analysis_id'),
                    analysis_data.get('abnormality_assessment_id'),
                    analysis_data.get('analysis_date', datetime.now()),
                    analysis_data.get('original_image_path'),
                    analysis_data.get('processed_image_path'),
                    analysis_data.get('ai_model_version'),
                    analysis_data.get('detected_abnormalities'),
                    analysis_data.get('confidence_score', 0),
                    analysis_data.get('defect_area', 0),
                    analysis_data.get('damage_extent'),
                    analysis_data.get('deterioration_features'),
                    analysis_data.get('recommended_action'),
                    analysis_data.get('status', '自動分析')
                ))
            logger.info(f"添加AI影像分析: {analysis_data.get('analysis_id')}")
            return True
        except Exception as e:
            logger.error(f"添加AI影像分析失敗: {e}")
            return False

    # =====================================================
    # 查詢和報表方法
    # =====================================================

    def get_segment_latest_inspection(self, segment_id: str) -> List[Dict]:
        """獲取段落最新檢測狀況"""
        try:
            with self.get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    SELECT * FROM v_segment_latest_inspection
                    WHERE segment_id = ?
                """, (segment_id,))
                return [dict(row) for row in cursor.fetchall()]
        except Exception as e:
            logger.error(f"查詢段落檢測狀況失敗: {e}")
            return []

    def get_fish_monitoring_stats(self) -> List[Dict]:
        """獲取魚類監測統計"""
        try:
            with self.get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("SELECT * FROM v_fish_monitoring_stats")
                return [dict(row) for row in cursor.fetchall()]
        except Exception as e:
            logger.error(f"查詢魚類監測統計失敗: {e}")
            return []

    def export_to_csv(self, query: str, output_file: str) -> bool:
        """匯出查詢結果為CSV"""
        try:
            with self.get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute(query)
                columns = [description[0] for description in cursor.description]
                rows = cursor.fetchall()

            with open(output_file, 'w', newline='', encoding='utf-8-sig') as f:
                writer = csv.writer(f)
                writer.writerow(columns)
                writer.writerows(rows)

            logger.info(f"數據已匯出至: {output_file}")
            return True
        except Exception as e:
            logger.error(f"匯出CSV失敗: {e}")
            return False

    def export_to_json(self, table_name: str, output_file: str) -> bool:
        """匯出表格為JSON"""
        try:
            with self.get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute(f"SELECT * FROM {table_name}")
                columns = [description[0] for description in cursor.description]
                rows = cursor.fetchall()

            data = [dict(zip(columns, row)) for row in rows]

            with open(output_file, 'w', encoding='utf-8') as f:
                json.dump(data, f, ensure_ascii=False, indent=2, default=str)

            logger.info(f"數據已匯出至: {output_file}")
            return True
        except Exception as e:
            logger.error(f"匯出JSON失敗: {e}")
            return False

    def get_all_structures(self) -> List[Dict]:
        """獲取所有工程設施（含最新檢測狀況）"""
        try:
            with self.get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    SELECT es.*,
                           ss.segment_name,
                           si.inspection_date AS last_inspection_date,
                           si.condition_grade,
                           si.deterioration_degree,
                           si.risk_influence,
                           si.overall_score,
                           si.urgency_level,
                           si.repair_status
                    FROM engineering_structures es
                    LEFT JOIN stream_segments ss ON es.segment_id = ss.segment_id
                    LEFT JOIN structure_inspection si ON si.inspection_id = (
                        SELECT inspection_id FROM structure_inspection
                        WHERE structure_id = es.structure_id
                        ORDER BY inspection_date DESC LIMIT 1
                    )
                    ORDER BY es.chainage
                """)
                return [dict(row) for row in cursor.fetchall()]
        except Exception as e:
            logger.error(f"查詢所有工程設施失敗: {e}")
            return []

    def get_structure_by_id(self, structure_id: str) -> Optional[Dict]:
        """獲取單一設施詳細資料（含所有檢測紀錄）"""
        try:
            with self.get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    SELECT es.*, ss.segment_name
                    FROM engineering_structures es
                    LEFT JOIN stream_segments ss ON es.segment_id = ss.segment_id
                    WHERE es.structure_id = ?
                """, (structure_id,))
                row = cursor.fetchone()
                if not row:
                    return None
                result = dict(row)
                cursor.execute("""
                    SELECT * FROM structure_inspection
                    WHERE structure_id = ?
                    ORDER BY inspection_date DESC
                """, (structure_id,))
                result['inspection_history'] = [dict(r) for r in cursor.fetchall()]
                return result
        except Exception as e:
            logger.error(f"查詢設施 {structure_id} 失敗: {e}")
            return None

    def update_structure_condition(self, structure_id: str, update_data: Dict[str, Any]) -> bool:
        """更新設施狀況與條件"""
        allowed = {'current_condition', 'notes', 'custodian_unit'}
        fields = {k: v for k, v in update_data.items() if k in allowed}
        if not fields:
            return False
        try:
            with self.get_connection() as conn:
                cursor = conn.cursor()
                set_clause = ', '.join(f"{k} = ?" for k in fields)
                values = list(fields.values()) + [structure_id]
                cursor.execute(
                    f"UPDATE engineering_structures SET {set_clause} WHERE structure_id = ?",
                    values
                )
                return cursor.rowcount > 0
        except Exception as e:
            logger.error(f"更新設施 {structure_id} 失敗: {e}")
            return False

    def get_der_assessment(self, structure_id: str) -> List[Dict]:
        """取得設施 DER&U 評估歷史（依日期降冪）"""
        try:
            with self.get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    SELECT inspection_id, inspection_date, inspector_name,
                           deterioration_degree, risk_influence, overall_score,
                           urgency_level, condition_grade, findings, repair_status
                    FROM structure_inspection
                    WHERE structure_id = ?
                    ORDER BY inspection_date DESC
                """, (structure_id,))
                return [dict(row) for row in cursor.fetchall()]
        except Exception as e:
            logger.error(f"查詢 DER&U 評估失敗: {e}")
            return []

    def get_database_summary(self) -> Dict[str, Any]:
        """獲取資料庫摘要統計"""
        try:
            with self.get_connection() as conn:
                cursor = conn.cursor()

                summary = {}

                # 統計各表數據量
                tables = [
                    'stream_segments', 'fish_species', 'fish_survey',
                    'engineering_structures', 'structure_inspection',
                    'patrol_records', 'abnormality_assessment'
                ]

                for table in tables:
                    cursor.execute(f"SELECT COUNT(*) FROM {table}")
                    summary[f'{table}_count'] = cursor.fetchone()[0]

                # 獲取最新巡查日期
                cursor.execute("SELECT MAX(patrol_date) FROM patrol_records")
                summary['latest_patrol_date'] = cursor.fetchone()[0]

                # 獲取待修復設施數
                cursor.execute("""
                    SELECT COUNT(*) FROM engineering_structures es
                    WHERE current_condition IN ('可', '不佳')
                """)
                summary['structures_need_repair'] = cursor.fetchone()[0]

                return summary
        except Exception as e:
            logger.error(f"查詢資料庫摘要失敗: {e}")
            return {}

    # =====================================================
    # RAG 反饋相關方法
    # =====================================================

    def create_rag_feedback_table(self) -> bool:
        """創建 RAG 反饋表"""
        try:
            with self.get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS rag_feedback (
                        id TEXT PRIMARY KEY,
                        conversation_id TEXT,
                        query_text TEXT,
                        answer_text TEXT,
                        confidence_level TEXT,
                        confidence_score REAL,
                        user_rating TEXT,
                        comment TEXT,
                        timestamp TEXT,
                        status TEXT DEFAULT 'submitted',
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                """)
            logger.info("RAG 反饋表創建成功")
            return True
        except Exception as e:
            logger.error(f"創建 RAG 反饋表失敗: {e}")
            return False

    def add_rag_feedback(self, feedback_data: Dict[str, Any]) -> bool:
        """新增反饋記錄"""
        try:
            with self.get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    INSERT INTO rag_feedback
                    (id, conversation_id, query_text, answer_text,
                     confidence_level, confidence_score, user_rating, comment, timestamp, status)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    feedback_data.get('id'),
                    feedback_data.get('conversationId'),
                    feedback_data.get('queryText'),
                    feedback_data.get('answerText'),
                    feedback_data.get('confidenceLevel'),
                    feedback_data.get('confidenceScore'),
                    feedback_data.get('userRating'),
                    feedback_data.get('comment'),
                    feedback_data.get('timestamp'),
                    feedback_data.get('status', 'submitted')
                ))
            logger.info(f"添加 RAG 反饋: {feedback_data.get('id')}")
            return True
        except Exception as e:
            logger.error(f"添加 RAG 反饋失敗: {e}")
            return False

    def get_rag_feedback_count(self, confidence_level: str = None) -> int:
        """獲取反饋總數"""
        try:
            with self.get_connection() as conn:
                cursor = conn.cursor()
                if confidence_level:
                    cursor.execute(
                        "SELECT COUNT(*) FROM rag_feedback WHERE confidence_level = ?",
                        (confidence_level,)
                    )
                else:
                    cursor.execute("SELECT COUNT(*) FROM rag_feedback")
                return cursor.fetchone()[0]
        except Exception as e:
            logger.error(f"查詢反饋計數失敗: {e}")
            return 0

    def get_rag_feedback_stats(self) -> Dict[str, Any]:
        """獲取反饋統計"""
        try:
            with self.get_connection() as conn:
                cursor = conn.cursor()

                # 總反饋數
                total = self.get_rag_feedback_count()

                # 按評分分佈
                cursor.execute("""
                    SELECT user_rating, COUNT(*) as count
                    FROM rag_feedback
                    GROUP BY user_rating
                """)
                rating_dist = {row[0]: row[1] for row in cursor.fetchall()}

                # 按信心等級分佈
                cursor.execute("""
                    SELECT confidence_level, COUNT(*) as count
                    FROM rag_feedback
                    GROUP BY confidence_level
                """)
                confidence_dist = {row[0]: row[1] for row in cursor.fetchall()}

                # 計算有幫助比例
                helpful_count = rating_dist.get('helpful', 0)
                helpful_ratio = (helpful_count / total * 100) if total > 0 else 0

                return {
                    'total_feedback': total,
                    'rating_distribution': rating_dist,
                    'confidence_distribution': confidence_dist,
                    'helpful_ratio': round(helpful_ratio, 2),
                    'status': '已收集' if total >= 50 else f'進行中 ({total}/50)'
                }
        except Exception as e:
            logger.error(f"查詢反饋統計失敗: {e}")
            return {
                'total_feedback': 0,
                'rating_distribution': {},
                'confidence_distribution': {},
                'helpful_ratio': 0,
                'status': '查詢失敗'
            }

    def get_rag_feedback_paginated(self, page: int = 1, per_page: int = 50,
                                   confidence_level: str = None) -> Dict[str, Any]:
        """分頁獲取反饋"""
        try:
            with self.get_connection() as conn:
                cursor = conn.cursor()

                # 構建查詢
                where_clause = ""
                params = []
                if confidence_level:
                    where_clause = " WHERE confidence_level = ?"
                    params.append(confidence_level)

                query = f"""
                    SELECT id, conversation_id, query_text, answer_text,
                           confidence_level, confidence_score, user_rating, comment, timestamp
                    FROM rag_feedback {where_clause}
                    ORDER BY created_at DESC
                    LIMIT ? OFFSET ?
                """
                offset = (page - 1) * per_page
                params.extend([per_page, offset])

                cursor.execute(query, params)
                feedback = [dict(row) for row in cursor.fetchall()]

                total = self.get_rag_feedback_count(confidence_level)

                return {
                    'page': page,
                    'per_page': per_page,
                    'total': total,
                    'feedback': feedback,
                    'pages': (total + per_page - 1) // per_page
                }
        except Exception as e:
            logger.error(f"查詢分頁反饋失敗: {e}")
            return {
                'page': page,
                'per_page': per_page,
                'total': 0,
                'feedback': [],
                'pages': 0
            }


if __name__ == '__main__':
    # 測試資料庫管理
    db = HengliuxiDatabase('hengliuxi.db')

    # 初始化資料庫
    if not db.db_exists:
        print("正在初始化資料庫...")
        if db.init_database('database_schema.sql'):
            print("✓ 資料庫初始化成功")
        else:
            print("✗ 資料庫初始化失敗")

    # 獲取摘要統計
    print("\n資料庫統計摘要:")
    summary = db.get_database_summary()
    for key, value in summary.items():
        print(f"  {key}: {value}")

    # 獲取魚類物種清單
    print("\n魚類物種清單:")
    species = db.get_fish_species_list()
    for sp in species:
        print(f"  - {sp['species_name_chn']} ({sp['species_name_sci']})")

    # 獲取緊急修復清單
    print("\n緊急修復設施:")
    urgent = db.get_urgent_repairs()
    for item in urgent:
        print(f"  - {item['structure_name']}: {item['defect_description']}")

    # 獲取異常統計
    print("\n異常統計摘要:")
    abnormality = db.get_abnormality_summary()
    for item in abnormality:
        print(f"  - {item['abnormality_type']}: {item['count']}件 (平均DER評分: {item['avg_der_score']})")
