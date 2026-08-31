# -*- coding: utf-8 -*-
"""周邊生活服務查詢（OpenStreetMap Overpass API）

為什麼不用網路搜尋
------------------
問「附近有哪些便利商店／住宿」時，DuckDuckGo 回傳的是和平區、谷關、大甲溪
的維基百科條目，沒有任何店家；且免費搜尋會限流，實測線上曾回傳 0 筆。

Overpass 是 OpenStreetMap 的查詢介面，免費、免金鑰、無帳號，且本來就是為
「找附近的某類地點」而設計，回傳結果含店名與座標，可直接算出距離。實測
橫流溪 20 公里內取得 60 筆，最近的全家便利商店 11.1 公里、7-Eleven 16.4
公里、台灣中油 12.6 公里。

可靠性
------
公眾 Overpass 主站尖峰時會回 504，故本模組依序輪詢多個鏡像並重試。
與 DuckDuckGo 不同的是，這些鏡像互為備援，不會同時失效。

用途界線
--------
本模組只回答「周邊有什麼」，不涉及橫流溪本身的工程或生態資料——那些一律
以平台既有資料與文件檢索作答，不得以外部地圖資料替代。
"""
from __future__ import annotations

import json
import logging
import math
import re
import time
import urllib.parse
import urllib.request
from typing import Any, Dict, List

logger = logging.getLogger(__name__)

#  橫流溪中心點：溪構5-1 防砂壩（樁號 1K+000，TWD97 240812/2675353）
HLX_LAT, HLX_LNG = 24.183541, 120.909564

#  公眾 Overpass 鏡像；主站忙碌時依序改用其他站台
MIRRORS = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
    "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
]

#  問句關鍵詞 → OSM 標籤。山區店家稀疏，預設半徑取 20 公里（谷關、東勢一帶）
CATEGORIES = [
    (r"便利商店|超商|7-?11|全家|萊爾富|OK超商", ['node["shop"="convenience"]'], "便利商店"),
    (r"住宿|飯店|旅館|民宿|旅店|過夜", ['node["tourism"~"^(hotel|guest_house|hostel|motel)$"]'], "住宿"),
    (r"餐廳|吃飯|美食|小吃|用餐|餐飲", ['node["amenity"~"^(restaurant|cafe|fast_food)$"]'], "餐飲"),
    (r"加油站|加油", ['node["amenity"="fuel"]'], "加油站"),
    (r"醫院|診所|急診|就醫", ['node["amenity"~"^(hospital|clinic|doctors)$"]'], "醫療"),
    (r"藥局|藥房", ['node["amenity"="pharmacy"]'], "藥局"),
    (r"停車", ['node["amenity"="parking"]'], "停車"),
    (r"廁所|洗手間", ['node["amenity"="toilets"]'], "廁所"),
    (r"露營|營地", ['node["tourism"="camp_site"]'], "露營地"),
    (r"車站|客運|公車|接駁", ['node["highway"="bus_stop"]', 'node["railway"="station"]'], "交通"),
]

_TRIGGER = re.compile("|".join(p for p, _, _ in CATEGORIES))


def is_poi_query(text: str) -> bool:
    """判斷是否為周邊生活服務問題。"""
    return bool(_TRIGGER.search(str(text or "")))


def _haversine(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    r, rad = 6371.0, math.radians
    a = (math.sin((rad(lat2) - rad(lat1)) / 2) ** 2
         + math.cos(rad(lat1)) * math.cos(rad(lat2))
         * math.sin((rad(lng2) - rad(lng1)) / 2) ** 2)
    return 2 * r * math.asin(math.sqrt(a))


def _selectors_for(text: str) -> List[str]:
    picked, labels = [], []
    for pattern, sels, label in CATEGORIES:
        if re.search(pattern, text):
            picked.extend(sels)
            labels.append(label)
    if not picked:      # 泛稱「附近有什麼」時給最常用的三類
        picked = ['node["shop"="convenience"]',
                  'node["tourism"~"^(hotel|guest_house)$"]',
                  'node["amenity"="restaurant"]']
    return picked


def search_nearby(query: str, radius_m: int = 20000,
                  limit: int = 15) -> Dict[str, Any]:
    """查詢橫流溪周邊 POI，回傳依距離排序的清單。"""
    sels = _selectors_for(str(query or ""))
    body = "".join(f"{s}(around:{radius_m},{HLX_LAT},{HLX_LNG});" for s in sels)
    ql = f"[out:json][timeout:25];({body});out body 80;"

    for url in MIRRORS:
        for attempt in range(2):
            try:
                req = urllib.request.Request(
                    url, data=urllib.parse.urlencode({"data": ql}).encode(),
                    headers={"User-Agent": "Hengliuxi-Platform/1.0"})
                with urllib.request.urlopen(req, timeout=45) as resp:
                    elements = json.loads(resp.read()).get("elements", [])
                break
            except Exception as exc:
                logger.info("[POI] %s 第 %d 次失敗：%s",
                            url.split("/")[2], attempt + 1, type(exc).__name__)
                elements = None
                time.sleep(3)
        if elements is not None:
            break
    else:
        return {"error": "周邊地圖服務暫時無法連線，請稍後再試。", "items": []}

    rows = []
    for el in elements or []:
        tags = el.get("tags") or {}
        name = tags.get("name") or tags.get("brand")
        if not name:            # 無名稱者對使用者無意義，略過
            continue
        kind = (tags.get("shop") or tags.get("tourism")
                or tags.get("amenity") or tags.get("highway") or "")
        rows.append({
            "name": name,
            "type": kind,
            "km": round(_haversine(HLX_LAT, HLX_LNG,
                                   el.get("lat", 0), el.get("lon", 0)), 1),
            "osm": f"https://www.openstreetmap.org/node/{el.get('id')}",
        })
    rows.sort(key=lambda r: r["km"])
    return {
        "items": rows[:limit],
        "total_found": len(rows),
        "radius_km": radius_m / 1000,
        "origin": "橫流溪溪構5-1（樁號1K+000）",
        "source": "OpenStreetMap Overpass API（開放資料，免費）",
        "note": ("距離為與橫流溪的直線距離，非行車距離。橫流溪位於山區，"
                 "最近的商家多在谷關與東勢一帶。資料由 OpenStreetMap 社群"
                 "維護，可能與現況有出入，實際營業情形請去電確認。"),
    }
