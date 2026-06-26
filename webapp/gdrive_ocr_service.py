#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Google Drive OCR & Full-Text Index Service
- PDFs: pdfplumber text extraction (digital PDFs)
- Google Docs/Sheets/Slides: Drive API plain-text export
- Scanned PDFs: flagged as scan_only
- Stores index in webapp/data/gdrive_ocr_index.json
- BM25 keyword search (Chinese bigrams + domain terms)
"""
from __future__ import annotations

import io
import json
import logging
import math
import os
import re
import threading
from collections import Counter
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

logger = logging.getLogger(__name__)

_DATA_DIR   = Path(__file__).parent / 'data'
_INDEX_FILE = _DATA_DIR / 'gdrive_ocr_index.json'

_index_lock   = threading.Lock()
_index_status: Dict[str, Any] = {
    'running':       False,
    'progress':      0,
    'total':         0,
    'current_file':  '',
    'last_indexed':  None,
    'error':         None,
}

# ── MIME type filters ────────────────────────────────────────────────────────

_GOOGLE_DOCS = {
    'application/vnd.google-apps.document',
    'application/vnd.google-apps.spreadsheet',
    'application/vnd.google-apps.presentation',
}

_NATIVE_TEXT = {
    'text/plain',
    'text/csv',
}

_WORD_DOCS = {
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
}

_PDF_MIME = 'application/pdf'
_FOLDER_MIME = 'application/vnd.google-apps.folder'

_SKIP_EXTS = frozenset({
    '.asc', '.cche', '.geo', '.mesh_mb', '.mesh_pmt', '.mesh_wsp',
    '.b90', '.bank', '.bank_line', '.bnd', '.bed', '.bed1', '.bdl',
    '.hyd', '.cif', '.culvt', '.culvt_qt', '.flw_pmt', '.ch_bed',
    '.ch_ini', '.mesh', '.grd', '.prj', '.shx', '.dbf', '.shp',
    '.exe', '.dll', '.zip', '.rar', '.7z', '.tar', '.gz',
})

_MAX_FILE_BYTES = 12 * 1024 * 1024   # 12 MB
_MAX_PDF_PAGES  = 40


def _indexable(name: str, mime: str) -> bool:
    ext = Path(name).suffix.lower()
    if ext in _SKIP_EXTS:
        return False
    if mime == _FOLDER_MIME:
        return False
    if mime in _GOOGLE_DOCS or mime in _NATIVE_TEXT or mime in _WORD_DOCS:
        return True
    if mime == _PDF_MIME:
        return True
    return False


# ── Year extraction ──────────────────────────────────────────────────────────

def _extract_year(name: str) -> Optional[str]:
    m = re.search(r'(\d{3})年', name)
    if m:
        return m.group(1)
    m = re.search(r'(20\d{2})', name)
    if m:
        return m.group(1)
    return None


# ── Text extraction ──────────────────────────────────────────────────────────

def _extract_pdf_text(content: bytes) -> str:
    try:
        import pdfplumber
        with pdfplumber.open(io.BytesIO(content)) as pdf:
            pages_text: List[str] = []
            for page in pdf.pages[:_MAX_PDF_PAGES]:
                text = page.extract_text() or ''
                pages_text.append(text)
            return '\n'.join(pages_text)
    except Exception as exc:
        logger.warning('[OCR] pdfplumber 失敗: %s', exc)
        return ''


def _download_file(service, file_id: str, size_hint: int = 0) -> bytes:
    if size_hint > _MAX_FILE_BYTES:
        raise ValueError(f'檔案 {size_hint/1e6:.1f} MB 超過 {_MAX_FILE_BYTES/1e6:.0f} MB 限制')
    from googleapiclient.http import MediaIoBaseDownload
    req = service.files().get_media(fileId=file_id)
    buf = io.BytesIO()
    dl  = MediaIoBaseDownload(buf, req)
    done = False
    while not done:
        _, done = dl.next_chunk()
    return buf.getvalue()


def _extract_text(service, file_info: Dict) -> Tuple[str, str]:
    """Return (text, ocr_status). ocr_status ∈ {'success','scan_only','unsupported','failed'}"""
    fid  = file_info['id']
    mime = file_info['mimeType']
    size = int(file_info.get('size', 0) or 0)
    name = file_info['name']

    try:
        # Google Workspace docs → export as plain text
        if mime in _GOOGLE_DOCS:
            content = service.files().export(fileId=fid, mimeType='text/plain').execute()
            text    = content.decode('utf-8', errors='replace') if isinstance(content, bytes) else str(content)
            return text.strip(), 'success' if text.strip() else 'scan_only'

        # Plain text
        if mime in _NATIVE_TEXT:
            content = _download_file(service, fid, size)
            return content.decode('utf-8', errors='replace').strip(), 'success'

        # Word docs — try export via Drive conversion
        if mime in _WORD_DOCS:
            try:
                content = service.files().export(fileId=fid, mimeType='text/plain').execute()
                text = content.decode('utf-8', errors='replace') if isinstance(content, bytes) else str(content)
                return text.strip(), 'success' if text.strip() else 'scan_only'
            except Exception:
                return '', 'unsupported'

        # PDF
        if mime == _PDF_MIME:
            raw  = _download_file(service, fid, size)
            text = _extract_pdf_text(raw)
            if len(text.strip()) < 80:
                return text, 'scan_only'
            return text, 'success'

        return '', 'unsupported'

    except Exception as exc:
        logger.warning('[OCR] 提取失敗 %s: %s', name, exc)
        return '', 'failed'


# ── Text chunking ────────────────────────────────────────────────────────────

def _chunk_text(text: str, chunk_size: int = 450, overlap: int = 80) -> List[str]:
    text = re.sub(r'\s+', ' ', text).strip()
    if not text:
        return []
    if len(text) <= chunk_size:
        return [text]
    step   = max(1, chunk_size - overlap)
    return [text[i:i + chunk_size].strip() for i in range(0, len(text), step) if text[i:i + chunk_size].strip()]


# ── Drive file listing ───────────────────────────────────────────────────────

def _list_files(service, folder_id: str) -> List[Dict]:
    results    = []
    page_token = None
    q = f"'{folder_id}' in parents and trashed=false"
    while True:
        resp = service.files().list(
            q=q,
            fields='nextPageToken,files(id,name,mimeType,webViewLink,modifiedTime,size)',
            pageSize=200,
            pageToken=page_token,
        ).execute()
        for f in resp.get('files', []):
            if f['mimeType'] == _FOLDER_MIME:
                results.extend(_list_files(service, f['id']))
            else:
                results.append(f)
        page_token = resp.get('nextPageToken')
        if not page_token:
            break
    return results


# ── BM25 search ──────────────────────────────────────────────────────────────

_DOMAIN_TERMS = re.compile(
    r'\d+K\+\d+|溪構\d+(?:-\d+)?|平台\d+|樣站\d+|FD\d+|\d{3,4}年|[A-Za-z]{2,}|[0-9]+'
)

def _tokenize(text: str) -> List[str]:
    tokens = [m.group().lower() for m in _DOMAIN_TERMS.finditer(text)]
    chinese = re.sub(r'[^一-鿿]', ' ', text)
    for word in chinese.split():
        if len(word) >= 2:
            tokens.extend(word[i:i + 2] for i in range(len(word) - 1))
    return tokens


def _bm25_top(chunks: List[str], query: str, k1: float = 1.5, b: float = 0.75) -> Tuple[int, float]:
    """Return (best_chunk_index, score) for query against chunk list."""
    if not chunks:
        return -1, 0.0
    q_terms = _tokenize(query)
    if not q_terms:
        return -1, 0.0

    doc_freqs = [Counter(_tokenize(c)) for c in chunks]
    avgdl = sum(sum(d.values()) for d in doc_freqs) / len(doc_freqs) or 1.0
    N = len(chunks)

    df_cnt: Counter = Counter()
    for df in doc_freqs:
        for t in df:
            df_cnt[t] += 1

    idf = {
        t: math.log((N - f + 0.5) / (f + 0.5) + 1)
        for t, f in df_cnt.items()
    }

    best_idx, best_score = 0, 0.0
    for idx, df in enumerate(doc_freqs):
        dl = sum(df.values()) or 1
        score = sum(
            idf.get(t, 0) * df.get(t, 0) * (k1 + 1)
            / (df.get(t, 0) + k1 * (1 - b + b * dl / avgdl))
            for t in q_terms
        )
        if score > best_score:
            best_score = score
            best_idx   = idx
    return best_idx, best_score


# ── Index persistence ─────────────────────────────────────────────────────────

def _load_index() -> Dict:
    try:
        if _INDEX_FILE.exists():
            with open(_INDEX_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
    except Exception:
        pass
    return {'version': '1.0', 'documents': [], 'indexed_at': None, 'folder_id': ''}


def _save_index(idx: Dict) -> None:
    _DATA_DIR.mkdir(exist_ok=True)
    tmp = str(_INDEX_FILE) + '.tmp'
    with open(tmp, 'w', encoding='utf-8') as f:
        json.dump(idx, f, ensure_ascii=False, indent=2)
    os.replace(tmp, str(_INDEX_FILE))


# ── Main indexing task (runs in background thread) ────────────────────────────

def _do_index(folder_id: str) -> None:
    global _index_status

    # Get Drive service
    try:
        from webapp import drive_service as ds
        service = ds._get_service()
    except Exception as exc:
        with _index_lock:
            _index_status.update(running=False, error=f'Drive 認證失敗: {exc}')
        logger.error('[OCR] Drive 認證失敗: %s', exc)
        return

    with _index_lock:
        _index_status.update(progress=0, error=None, current_file='列舉雲端檔案中…')

    # List all files
    try:
        all_files  = _list_files(service, folder_id)
    except Exception as exc:
        with _index_lock:
            _index_status.update(running=False, error=f'列檔失敗: {exc}')
        return

    indexable = [f for f in all_files if _indexable(f['name'], f['mimeType'])]

    with _index_lock:
        _index_status['total'] = len(indexable)

    documents: List[Dict] = []
    for i, finfo in enumerate(indexable):
        with _index_lock:
            _index_status['progress']     = i + 1
            _index_status['current_file'] = finfo['name']

        text, status = _extract_text(service, finfo)
        chunks       = _chunk_text(text) if text.strip() else []
        year         = _extract_year(finfo['name'])

        documents.append({
            'id':          finfo['id'],
            'name':        finfo['name'],
            'mime':        finfo['mimeType'],
            'web_view':    finfo.get('webViewLink', ''),
            'modified':    finfo.get('modifiedTime', ''),
            'year':        year,
            'ocr_status':  status,
            'text_chars':  len(text),
            'chunks':      chunks,
            'indexed_at':  datetime.now().isoformat(),
        })
        logger.debug('[OCR] %d/%d %s → %s (%d chars)', i+1, len(indexable), finfo['name'], status, len(text))

    stats = {
        'success':     sum(1 for d in documents if d['ocr_status'] == 'success'),
        'scan_only':   sum(1 for d in documents if d['ocr_status'] == 'scan_only'),
        'unsupported': sum(1 for d in documents if d['ocr_status'] in ('unsupported', 'failed')),
    }

    idx = {
        'version':     '1.1',
        'folder_id':   folder_id,
        'indexed_at':  datetime.now().isoformat(),
        'total_files': len(indexable),
        'stats':       stats,
        'documents':   documents,
    }

    _save_index(idx)
    logger.info('[OCR] 索引完成：%d 個文件（成功 %d，掃描檔 %d）', len(indexable), stats['success'], stats['scan_only'])

    with _index_lock:
        _index_status.update(
            running=False,
            last_indexed=idx['indexed_at'],
            current_file='',
        )


def start_indexing(folder_id: str) -> bool:
    """Launch background indexing. Returns True if started, False if already running."""
    with _index_lock:
        if _index_status['running']:
            return False
        _index_status['running'] = True

    t = threading.Thread(target=_do_index, args=(folder_id,), daemon=True)
    t.start()
    return True


def get_status() -> Dict:
    idx = _load_index()
    with _index_lock:
        s = dict(_index_status)
    s['indexed_at']  = idx.get('indexed_at')
    s['total_docs']  = len(idx.get('documents', []))
    s['stats']       = idx.get('stats', {})
    s['folder_id']   = idx.get('folder_id', '')
    return s


# ── Public search API ─────────────────────────────────────────────────────────

def search(query: str, top_k: int = 5) -> List[Dict]:
    """BM25 full-text search on OCR index. Returns list of hit dicts."""
    idx  = _load_index()
    docs = idx.get('documents', [])
    if not docs or not query.strip():
        return []

    q_low    = query.lower()
    q_tokens = set(_tokenize(query))
    results: List[Dict] = []

    for doc in docs:
        name   = doc.get('name', '')
        chunks = doc.get('chunks', [])
        status = doc.get('ocr_status', '')

        # Score by filename match (always)
        fname_score = sum(0.8 for t in q_tokens if t in name.lower())

        if chunks and status == 'success':
            best_idx, chunk_score = _bm25_top(chunks, query)
            if chunk_score <= 0 and fname_score <= 0:
                continue
            best_chunk = chunks[best_idx] if 0 <= best_idx < len(chunks) else ''
            total_score = chunk_score + fname_score
        elif fname_score > 0:
            best_chunk  = f'（{"掃描檔案，文字索引不可用" if status == "scan_only" else "無可索引文字"}）'
            total_score = fname_score
        else:
            continue

        results.append({
            'doc_name':   name,
            'doc_id':     doc.get('id', ''),
            'web_view':   doc.get('web_view', ''),
            'year':       doc.get('year'),
            'chunk':      best_chunk[:350],
            'score':      total_score,
            'ocr_status': status,
        })

    if not results:
        return []

    # Normalize scores 0-1
    results.sort(key=lambda r: r['score'], reverse=True)
    max_s = results[0]['score'] or 1.0
    for r in results:
        r['score'] = round(min(0.98, r['score'] / max_s), 3)

    return results[:top_k]
