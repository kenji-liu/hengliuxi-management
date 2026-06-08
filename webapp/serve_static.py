#!/usr/bin/env python3
"""
橫流溪智慧管理平台 — 穩定靜態檔案伺服器
特性：多執行緒、HTML/JS 停用快取、錯誤自動恢復、CORS 支援
"""
import http.server
import socketserver
import os
import sys
import time
import mimetypes
import threading

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 3000
# 伺服根目錄：webapp 的上層（project root）
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

NO_CACHE_EXTS = {'.html', '.js', '.mjs', '.json', '.jsonl', '.css'}

class HLXHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def do_GET(self):
        path = self.path.split('?')[0]  # 去除 query string
        # 重導向
        if path == '/':
            self.send_response(302)
            self.send_header('Location', '/webapp/')
            self.end_headers()
            return
        if path in ('/webapp', '/webapp/'):
            self.path = '/webapp/index.html'
        else:
            self.path = path
        return super().do_GET()

    def do_OPTIONS(self):
        self.send_response(204)
        self._add_cors()
        self.end_headers()

    def end_headers(self):
        self._add_cors()
        # 停用 HTML/JS/CSS 快取
        ext = os.path.splitext(self.path)[1].lower()
        if ext in NO_CACHE_EXTS:
            self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
            self.send_header('Pragma', 'no-cache')
            self.send_header('Expires', '0')
        else:
            self.send_header('Cache-Control', 'public, max-age=86400')
        super().end_headers()

    def _add_cors(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')

    def log_message(self, fmt, *args):
        # 只印非 200 請求，減少輸出雜訊
        code = args[1] if len(args) > 1 else '---'
        if str(code) not in ('200', '304'):
            print(f"[{code}] {args[0]}")

    def log_error(self, fmt, *args):
        pass  # 靜音連線重置錯誤


class ThreadedServer(socketserver.ThreadingMixIn, http.server.HTTPServer):
    daemon_threads = True
    allow_reuse_address = True


def run():
    retry = 0
    while True:
        try:
            server = ThreadedServer(('', PORT), HLXHandler)
            print(f"\n{'='*55}")
            print(f"  橫流溪智慧管理平台 伺服器已啟動")
            print(f"  前往: http://localhost:{PORT}/webapp/")
            print(f"  根目錄: {ROOT}")
            print(f"  按 Ctrl+C 停止")
            print(f"{'='*55}\n")
            retry = 0
            server.serve_forever()
        except OSError as e:
            retry += 1
            if 'Address already in use' in str(e) or '10048' in str(e):
                print(f"[ERR] Port {PORT} 被佔用，3秒後重試... (#{retry})")
            else:
                print(f"[ERR] 網路錯誤: {e}，3秒後重試... (#{retry})")
            time.sleep(3)
        except KeyboardInterrupt:
            print("\n[停止] 伺服器已手動關閉。")
            sys.exit(0)
        except Exception as e:
            retry += 1
            print(f"[ERR] 未預期錯誤: {e}，3秒後重試... (#{retry})")
            time.sleep(3)


if __name__ == '__main__':
    run()
