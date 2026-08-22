#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
橫流溪 RAG 檔案變更監控器
使用 watchdog 監控三個根目錄，檔案有變動時自動重新索引。

用法：
    python scripts/hlx_watcher.py

後台啟動（Windows PowerShell）：
    Start-Job { python scripts/hlx_watcher.py }

相依：
    pip install watchdog sentence-transformers pypdf2 python-docx
"""

import logging
import sys
import time
from pathlib import Path

SCRIPT_DIR = Path(__file__).parent
sys.path.insert(0, str(SCRIPT_DIR))

from hlx_rag_config import (
    SOURCE_ROOTS, SUPPORTED_EXTS, EXCLUDE_DIRS, EXCLUDE_SUFFIXES,
)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [WATCHER] %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger("hlx-watcher")

# 防抖：同一檔案 N 秒內只觸發一次索引
DEBOUNCE_SECONDS = 10
# 批次：累積 N 秒內的所有變更，一次重新索引
BATCH_SECONDS = 30


def run_index_for_file(changed_path: Path):
    """對單一檔案執行增量索引（只重索引這個檔案）"""
    import subprocess
    result = subprocess.run(
        [sys.executable, str(SCRIPT_DIR / "hlx_index_all.py")],
        capture_output=True, text=True,
    )
    if result.returncode == 0:
        log.info(f"重新索引完成（觸發：{changed_path.name}）")
    else:
        log.error(f"重新索引失敗：{result.stderr[:300]}")


def should_watch(path: Path) -> bool:
    if path.suffix.lower() not in SUPPORTED_EXTS:
        return False
    if path.suffix.lower() in EXCLUDE_SUFFIXES:
        return False
    for part in path.parts:
        if part in EXCLUDE_DIRS:
            return False
        if part.startswith("."):
            return False
    return True


try:
    from watchdog.events import FileSystemEventHandler
    from watchdog.observers import Observer
except ImportError:
    log.error("缺少 watchdog：pip install watchdog")
    sys.exit(1)


class HLXEventHandler(FileSystemEventHandler):
    def __init__(self):
        self._pending: dict[str, float] = {}  # path → last event time
        self._last_index: float = 0.0

    def _record(self, path_str: str):
        self._pending[path_str] = time.time()

    def on_modified(self, event):
        if not event.is_directory:
            p = Path(event.src_path)
            if should_watch(p):
                log.info(f"檔案已修改：{p.name}")
                self._record(str(p))

    def on_created(self, event):
        if not event.is_directory:
            p = Path(event.src_path)
            if should_watch(p):
                log.info(f"新增檔案：{p.name}")
                self._record(str(p))

    def on_deleted(self, event):
        if not event.is_directory:
            p = Path(event.src_path)
            if should_watch(p):
                log.info(f"刪除檔案：{p.name}（觸發完整重建）")
                self._record(str(p))

    def on_moved(self, event):
        if not event.is_directory:
            p = Path(event.dest_path)
            if should_watch(p):
                log.info(f"移動/重命名：{p.name}")
                self._record(str(p))

    def flush_pending(self):
        """每 BATCH_SECONDS 秒檢查一次，若有待處理的變更則觸發重新索引"""
        if not self._pending:
            return
        now = time.time()
        oldest = min(self._pending.values())
        if now - oldest < DEBOUNCE_SECONDS:
            return  # 還在防抖期間
        if now - self._last_index < BATCH_SECONDS:
            return  # 剛索引完，批次等待中

        changed = list(self._pending.keys())
        self._pending.clear()
        self._last_index = now
        log.info(f"觸發增量重新索引（{len(changed)} 個檔案變更）")
        try:
            run_index_for_file(Path(changed[0]))
        except Exception as e:
            log.error(f"索引失敗：{e}")


def main():
    handler = HLXEventHandler()
    observer = Observer()

    roots_watching = []
    for root in SOURCE_ROOTS:
        if root.exists():
            observer.schedule(handler, str(root), recursive=True)
            roots_watching.append(root)
            log.info(f"監控：{root}")
        else:
            log.warning(f"目錄不存在，跳過監控：{root}")

    if not roots_watching:
        log.error("沒有可用的監控目錄，退出。")
        sys.exit(1)

    observer.start()
    log.info(f"監控啟動，共 {len(roots_watching)} 個根目錄。")
    log.info(f"防抖時間={DEBOUNCE_SECONDS}s，批次間隔={BATCH_SECONDS}s")
    log.info("按 Ctrl+C 停止。")

    try:
        while True:
            time.sleep(5)
            handler.flush_pending()
    except KeyboardInterrupt:
        log.info("收到中斷信號，停止監控…")
        observer.stop()
    observer.join()
    log.info("監控已停止。")


if __name__ == "__main__":
    main()
