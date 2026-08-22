#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
橫流溪 RAG 系統 - 統一路徑與分類設定
所有索引腳本和 watcher 都從此檔讀取設定，不要直接改其他腳本的路徑。
"""

from pathlib import Path

# ── 三個資料根目錄 ──────────────────────────────────────────
SOURCE_ROOTS = [
    Path(r"C:\Users\kenji-PC\Desktop\橫流溪工程設施維護與資料管理作業 - CLaude"),
    Path(r"G:\叭哩叭哩噗計畫"),
    Path(r"G:\橫流溪工程設施維護與資料管理作業 - CLaude"),
]

# ── 輸出向量庫路徑（rag_backend.py 讀同一個位置）──────────
PROJECT_ROOT = Path(r"C:\Users\kenji-PC\Desktop\橫流溪工程設施維護與資料管理作業 - CLaude")
VECTOR_STORE_FILE  = PROJECT_ROOT / "webapp" / "data" / "vector_store.jsonl"
METADATA_FILE      = PROJECT_ROOT / "webapp" / "data" / "metadata_index.json"
INDEX_MANIFEST     = PROJECT_ROOT / "webapp" / "data" / "hlx_index_manifest.json"

# ── 支援的檔案類型 ───────────────────────────────────────────
SUPPORTED_EXTS = {".pdf", ".docx", ".doc", ".md", ".txt", ".json"}

# ── 強制排除的目錄或檔案關鍵字 ──────────────────────────────
EXCLUDE_DIRS = {
    ".git", "__pycache__", ".obsidian", "node_modules",
    "venv", ".venv", "tmp", "temp", "scratchpad",
    "integration_postgis", "rag_quality",
    "非橫流溪資料",  # G:\ 下明確標示不屬於橫流溪的資料夾
}
EXCLUDE_FILES = {
    "package-lock.json", "package.json", "tsconfig.json",
}
EXCLUDE_SUFFIXES = {".pyc", ".log", ".db", ".sqlite", ".jpg", ".png",
                    ".jpeg", ".gif", ".mp4", ".zip", ".xlsx", ".xls"}

# ── 七大分類：關鍵字 → 分類名稱 ──────────────────────────────
CATEGORY_RULES = [
    ("生態資料庫",     ["魚類", "魚種", "fish", "生態", "CPUE", "Shannon", "H'",
                       "纓口台鰍", "白甲魚", "石賓", "爬岩鰍", "物種", "電捕",
                       "Survey123", "台灣間爬岩鰍", "明潭吻鰕虎"]),
    ("工程設施管理",   ["溪構", "固床工", "防砂壩", "護岸", "DER", "DER&U",
                       "健康指數", "構造物", "工程設施", "FD", "魚道", "FD1",
                       "FD2", "FD3", "FD4", "FD5", "FD6", "FD7", "FD8"]),
    ("巡查資料管理",   ["巡查", "巡檢", "巡視", "檢查", "inspection",
                       "異常", "損壞", "裂縫", "沖刷", "淤積", "位移"]),
    ("維護管理資料",   ["維護", "修復", "完工", "施工", "保養", "清淤",
                       "maintenance", "修繕", "加固", "補強", "改善"]),
    ("工程設計書架",   ["設計書", "設計圖", "施工圖說", "規劃", "計畫書",
                       "成果報告", "竣工", "合約", "施工方法", "計算書"]),
    ("構造物現況",     ["現況", "狀態", "狀況", "現場", "照片", "紀錄",
                       "定期巡查", "季報", "年報", "緊急", "通報"]),
    ("生態系統",      ["棲地", "WUA", "流速", "水深", "底質", "濱溪",
                       "植生", "植物", "昆蟲", "FBI", "水質", "連通性"]),
]

# 分類權重（keyword 出現次數 × 此權重）
CATEGORY_WEIGHTS = {cat: 1.0 for cat, _ in CATEGORY_RULES}

# 高優先索引的檔案（優先處理，確保在向量庫最前面）
PRIORITY_FILES = [
    "橫流溪棲地連通性及周邊設施維護管理",
    "11312管理維護手冊",
    "魚道功能評估成果報告",
    "fish.js",
    "保育成效摘要",
    "橫流溪生態知識庫",
    "叭哩叭哩噗",
]

# ── 向量模型 ─────────────────────────────────────────────────
# 雲端模式：使用 Jina AI API，不需本機下載模型
# 本機 fallback：sentence-transformers 自動下載（約 430MB）
EMBED_MODEL = "jina-embeddings-v3"

# 分塊設定（與 rag_backend 的 SIMILARITY_THRESHOLD 配合）
CHUNK_SIZE    = 600   # 字元數（不是 token）
CHUNK_OVERLAP = 120   # 重疊字元數
MIN_CHUNK     = 40    # 最小有效塊
