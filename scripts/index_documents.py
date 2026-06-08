#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
橫流溪 RAG 系統 - 文檔索引化腳本
Document Indexing for Hengliuxi RAG System

This script extracts text from PDF documents and creates vector embeddings
for the RAG (Retrieval Augmented Generation) system.
"""

import os
import json
from pathlib import Path
from datetime import datetime
import logging

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='[%(asctime)s] %(levelname)s: %(message)s'
)
logger = logging.getLogger(__name__)

try:
    from sentence_transformers import SentenceTransformer
    import PyPDF2
except ImportError as e:
    logger.error(f"Missing dependency: {e}")
    logger.error("Please run: pip install sentence-transformers PyPDF2 scikit-learn")
    exit(1)

# Configuration
MODEL_NAME = 'all-MiniLM-L6-v2'  # Local, offline, Chinese-friendly
PROJECT_ROOT = Path(__file__).parent.parent
PDF_DIRECTORIES = [
    PROJECT_ROOT / '01_工程設施維護與資料',
]
OUTPUT_DIR = PROJECT_ROOT / 'webapp' / 'data'
VECTOR_STORE_FILE = OUTPUT_DIR / 'vector_store.jsonl'
METADATA_INDEX_FILE = OUTPUT_DIR / 'metadata_index.json'
MANIFEST_FILE = OUTPUT_DIR / 'documents_manifest.json'

# Chunking parameters
CHUNK_SIZE = 800  # tokens
CHUNK_OVERLAP = 200  # tokens
MIN_CHUNK_LENGTH = 50  # characters

# Priority PDF files to index first
PRIORITY_PDFS = [
    '02_本文_11312管理維護手冊_V1_合併(1).pdf',
    '橫流溪棲地連通性及周邊設施維護管理(1).pdf',
    '宜專一線維護管理計畫_合併.pdf',
]


def extract_text_from_pdf(pdf_path):
    """
    Extract text from a PDF file.

    Args:
        pdf_path: Path to the PDF file

    Returns:
        List of tuples: (page_number, text)
    """
    try:
        pages_text = []
        with open(pdf_path, 'rb') as f:
            reader = PyPDF2.PdfReader(f)
            for page_num, page in enumerate(reader.pages):
                text = page.extract_text()
                if text.strip():
                    pages_text.append((page_num + 1, text))
        logger.info(f"✓ Extracted {len(pages_text)} pages from {pdf_path.name}")
        return pages_text
    except Exception as e:
        logger.error(f"✗ Failed to extract from {pdf_path.name}: {e}")
        return []


def chunk_text(text, max_tokens=CHUNK_SIZE, overlap_tokens=CHUNK_OVERLAP):
    """
    Split text into overlapping chunks at paragraph boundaries.

    Args:
        text: Text to chunk
        max_tokens: Maximum tokens per chunk
        overlap_tokens: Token overlap between chunks

    Returns:
        List of text chunks
    """
    # Split by paragraphs (double newlines)
    paragraphs = text.split('\n\n')
    chunks = []
    current_chunk = []
    current_length = 0

    for para in paragraphs:
        para = para.strip()
        if not para or len(para) < MIN_CHUNK_LENGTH:
            continue

        # Rough token estimation: Chinese ~1 char = 1 token, English ~4 chars = 1 token
        para_length = len(para)

        if current_length + para_length > max_tokens and current_chunk:
            # Flush current chunk
            chunk_text = '\n\n'.join(current_chunk)
            if chunk_text.strip():
                chunks.append(chunk_text)

            # Start new chunk with overlap
            if len(current_chunk) > 1:
                current_chunk = [current_chunk[-1], para]
                current_length = len(current_chunk[-2]) + para_length
            else:
                current_chunk = [para]
                current_length = para_length
        else:
            current_chunk.append(para)
            current_length += para_length

    # Add last chunk
    if current_chunk:
        chunk_text = '\n\n'.join(current_chunk)
        if chunk_text.strip():
            chunks.append(chunk_text)

    return chunks


def load_model():
    """Load sentence transformer model."""
    logger.info(f"Loading embedding model: {MODEL_NAME}")
    try:
        model = SentenceTransformer(MODEL_NAME)
        logger.info("✓ Model loaded successfully")
        return model
    except Exception as e:
        logger.error(f"✗ Failed to load model: {e}")
        raise


def index_documents():
    """Main indexing function."""

    # Create output directory
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    # Load model
    model = load_model()

    # Collect PDFs to index
    pdf_files = []
    for pdf_dir in PDF_DIRECTORIES:
        if pdf_dir.exists():
            pdf_files.extend(pdf_dir.rglob('*.pdf'))

    # Sort by priority
    priority_set = set(PRIORITY_PDFS)
    pdf_files.sort(key=lambda x: (x.name not in priority_set, x.name))

    logger.info(f"Found {len(pdf_files)} PDF files to index")

    # Index documents
    doc_id = 0
    documents_manifest = {
        'timestamp': datetime.now().isoformat(),
        'model': MODEL_NAME,
        'documents': [],
        'total_chunks': 0
    }

    metadata_index = {}

    with open(VECTOR_STORE_FILE, 'w', encoding='utf-8') as store_file:
        for pdf_path in pdf_files:
            if not pdf_path.exists():
                continue

            logger.info(f"\nIndexing: {pdf_path.name}")

            # Extract text
            pages = extract_text_from_pdf(pdf_path)
            if not pages:
                continue

            doc_chunks = 0
            for page_num, page_text in pages:
                # Split into chunks
                chunks = chunk_text(page_text)

                for chunk_idx, chunk_text_content in enumerate(chunks):
                    # Generate vector
                    try:
                        vector = model.encode(chunk_text_content)
                    except Exception as e:
                        logger.error(f"Failed to encode chunk: {e}")
                        continue

                    # Create document entry
                    doc_entry = {
                        'id': f"doc_{doc_id:06d}",
                        'source_file': pdf_path.name,
                        'source_path': str(pdf_path.relative_to(PROJECT_ROOT)),
                        'page_number': page_num,
                        'chunk_index': chunk_idx,
                        'text': chunk_text_content[:500],  # Store first 500 chars as preview
                        'full_text': chunk_text_content,
                        'vector': vector.tolist(),
                        'timestamp': datetime.now().isoformat(),
                        'section': f"{pdf_path.name} > Page {page_num} > Chunk {chunk_idx}"
                    }

                    # Write to JSONL file
                    store_file.write(json.dumps(doc_entry, ensure_ascii=False) + '\n')

                    # Update metadata index
                    if pdf_path.name not in metadata_index:
                        metadata_index[pdf_path.name] = []
                    metadata_index[pdf_path.name].append({
                        'doc_id': f"doc_{doc_id:06d}",
                        'page': page_num,
                        'chunk': chunk_idx
                    })

                    doc_id += 1
                    doc_chunks += 1

            if doc_chunks > 0:
                documents_manifest['documents'].append({
                    'name': pdf_path.name,
                    'path': str(pdf_path.relative_to(PROJECT_ROOT)),
                    'chunks': doc_chunks,
                    'pages': len(pages)
                })

    # Update manifest
    documents_manifest['total_chunks'] = doc_id

    # Save metadata index
    with open(METADATA_INDEX_FILE, 'w', encoding='utf-8') as f:
        json.dump(metadata_index, f, ensure_ascii=False, indent=2)

    # Save manifest
    with open(MANIFEST_FILE, 'w', encoding='utf-8') as f:
        json.dump(documents_manifest, f, ensure_ascii=False, indent=2)

    logger.info(f"\n{'='*60}")
    logger.info(f"✓ Indexing complete!")
    logger.info(f"  Total chunks: {doc_id}")
    logger.info(f"  Total documents: {len(documents_manifest['documents'])}")
    logger.info(f"  Vector store: {VECTOR_STORE_FILE}")
    logger.info(f"  Metadata index: {METADATA_INDEX_FILE}")
    logger.info(f"  Manifest: {MANIFEST_FILE}")
    logger.info(f"{'='*60}\n")


if __name__ == '__main__':
    try:
        index_documents()
    except Exception as e:
        logger.error(f"Fatal error: {e}", exc_info=True)
        exit(1)
