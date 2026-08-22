#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
從 webapp/js/db.js 提取 seed 巡查資料，輸出至 webapp/data/synced_inspections.json
讓 management_context.py 能正確讀取所有巡查記錄（含損壞、DER&U 評級）。
"""
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).parent.parent
DB_JS = ROOT / 'webapp' / 'js' / 'db.js'
OUT   = ROOT / 'webapp' / 'data' / 'synced_inspections.json'


def js_obj_to_dict(js_str: str) -> dict:
    """
    把 JS 物件字串轉成 Python dict。
    支援：unquoted keys, single-quote strings, trailing commas, // comments。
    """
    import json5  # noqa – try first
    return json5.loads(js_str)


def js_obj_to_dict_fallback(js_str: str) -> dict:
    """手工轉換：不依賴 json5。"""
    # 為 key 加引號（不含已有引號的）
    s = re.sub(r'(?<!["\w])(\b[a-zA-Z_$][a-zA-Z0-9_$]*\b)\s*:', r'"\1":', js_str)
    # 單引號 → 雙引號（注意跳脫）
    s = re.sub(r"(?<!\\)'", '"', s)
    # 移除行尾逗號
    s = re.sub(r',\s*([}\]])', r'\1', s)
    # 移除 // 注釋
    s = re.sub(r'//[^\n]*', '', s)
    return json.loads(s)


def extract_inspections(content: str) -> list:
    """
    在 inspections: [ ... ] 區塊中找到所有 { id: ..., facilityId: ..., ... } 物件。
    使用逐字元括號匹配，不受換行影響。
    """
    # 找到 inspections: [ 的起始位置（第二次出現，第一次是 defaults.inspections: []）
    starts = [m.start() for m in re.finditer(r'inspections\s*:\s*\[', content)]
    # 找含實際物件的那個 [ 開頭（即後面緊跟 { id: 的那個）
    start_idx = None
    for s in starts:
        preview = content[s:s+80]
        if '{ id:' in preview or '{\n' in preview:
            start_idx = s
            break
    if start_idx is None:
        start_idx = starts[-1] if starts else None

    if start_idx is None:
        print("ERROR: 找不到 inspections 區塊", file=sys.stderr)
        return []

    # 找到 '[' 的位置
    bracket_start = content.index('[', start_idx)
    depth = 0
    i = bracket_start
    while i < len(content):
        if content[i] == '[':
            depth += 1
        elif content[i] == ']':
            depth -= 1
            if depth == 0:
                break
        i += 1
    array_str = content[bracket_start:i+1]

    # 在陣列字串中找所有頂層 { } 物件
    records = []
    j = 0
    while j < len(array_str):
        if array_str[j] == '{':
            d = 0
            start = j
            while j < len(array_str):
                if array_str[j] == '{':
                    d += 1
                elif array_str[j] == '}':
                    d -= 1
                    if d == 0:
                        obj_str = array_str[start:j+1]
                        try:
                            try:
                                import json5
                                rec = json5.loads(obj_str)
                            except ImportError:
                                rec = js_obj_to_dict_fallback(obj_str)
                            records.append(rec)
                        except Exception as e:
                            print(f"  跳過一筆（解析失敗）: {e}", file=sys.stderr)
                        break
                j += 1
        j += 1
    return records


def main():
    print(f"讀取 {DB_JS}")
    content = DB_JS.read_text(encoding='utf-8')

    print("提取 inspections seed 資料...")
    records = extract_inspections(content)
    print(f"找到 {len(records)} 筆巡查記錄")

    if not records:
        print("ERROR: 沒有找到任何記錄，請檢查 db.js 格式", file=sys.stderr)
        sys.exit(1)

    # 統計損壞相關
    damage_keywords = ['裂縫', '損壞', '淘空', '位移', '破損', '沖刷', '異常', '堵塞', '鏽蝕']
    damage_records = [r for r in records if any(k in str(r.get('findings','')) for k in damage_keywords)]
    print(f"其中含損壞/異常記錄：{len(damage_records)} 筆")

    # 按日期排序
    records.sort(key=lambda r: str(r.get('date', '')), reverse=True)

    OUT.write_text(json.dumps(records, ensure_ascii=False, indent=2), encoding='utf-8')
    print(f"✓ 已寫出 {OUT}（{OUT.stat().st_size // 1024} KB）")

    # 印出損壞摘要
    print("\n=== 有損壞/異常記錄的設施 ===")
    for r in damage_records:
        print(f"  [{r.get('date','')}] {r.get('facilityName','')} "
              f"({r.get('inspectNo','')}) → {str(r.get('findings',''))[:60]}")


if __name__ == '__main__':
    main()
