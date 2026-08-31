#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""防砂壩計畫貯砂量概估（水土保持手冊法）

★ 本程式輸出為「平台影像概估值」，不是報告書載明的設計值。
  兩座防砂壩的有效壩高（H）不存在於任何專案文件中——維護管理手冊表 1-1
  只有編號、種類、材質、位置與坐標；107~108 年度成果報告全書 251 頁亦未載。
  因此 H 係以現場實拍照片、取已知河床寬度為比例尺概估而得。

  H 在公式中為平方項，主導計算結果：H 誤差 ±1 m 即造成貯砂量 ±35~40%。
  故本結果僅供量級判斷與相對比較，不得作為設計、報部或驗收依據；
  取得竣工圖或設計計算書後應以實際壩高重算。

方法（中華水土保持學會（2005）水土保持手冊，行政院農委會水土保持局）
----------------------------------------------------------------------
防砂壩上游淤砂達平衡後，淤砂面自壩頂溢流口起以「計畫堆積坡度 i_p」向上游
延伸，與原河床坡度 i₀ 相交處為淤砂末端。其縱斷面近似三角形：

    淤砂長度 L = H / (i₀ − i_p)
    計畫貯砂量 V = ½ × B × H × L = B × H² / ( 2 × (i₀ − i_p) )

    H  ：有效壩高（溢流口至原河床面）
    B  ：淤砂段平均河床寬度
    i₀ ：原河床坡度
    i_p：計畫堆積坡度，手冊建議取 (1/2 ~ 2/3) × i₀

本程式同時輸出 i_p 取 1/2 與 2/3 兩種情形，形成區間而非單一數值。

用法
----
    python scripts/estimate_sabo_capacity.py
    python scripts/estimate_sabo_capacity.py --h51 5.4 --h81 4.9
"""
from __future__ import annotations

import argparse

#  河床坡度：由 107~108 年度成果報告 圖 5-11 八個樁號之河床高程推算
#  0K+000 約 EL.543 m、1K+400 約 EL.621 m，高差 78 m / 1,400 m
BED_SLOPE = 78.0 / 1400.0

#  河床寬度：平台設施資料 width 欄（來源：107-108成果報告／維護管理手冊表5-1）
DAMS = [
    {"id": "溪構5-1", "station": "1K+000", "width": 15.0,
     "photo": "manual-p38-04", "h_default": 5.4},
    {"id": "溪構8-1", "station": "0K+460", "width": 16.0,
     "photo": "manual-p38-08", "h_default": 4.9},
]


def capacity(width: float, height: float, i0: float, ratio: float) -> tuple:
    """回傳 (計畫堆積坡度, 淤砂長度 m, 計畫貯砂量 m³)。"""
    ip = ratio * i0
    di = i0 - ip
    length = height / di
    vol = width * height ** 2 / (2 * di)
    return ip, length, vol


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--h51", type=float, default=None, help="溪構5-1 有效壩高 (m)")
    ap.add_argument("--h81", type=float, default=None, help="溪構8-1 有效壩高 (m)")
    ap.add_argument("--slope", type=float, default=BED_SLOPE, help="原河床坡度")
    args = ap.parse_args()

    override = {"溪構5-1": args.h51, "溪構8-1": args.h81}
    i0 = args.slope

    print("防砂壩計畫貯砂量概估　（水土保持手冊 2005）")
    print(f"原河床坡度 i₀ = {i0:.4f}（{i0*100:.2f}%，約 1/{1/i0:.0f}）"
          "　由成果報告圖 5-11 河床高程推算")
    print("=" * 78)
    print(f"{'設施':<9}{'樁號':<9}{'B(m)':>6}{'H(m)':>7}"
          f"{'淤砂長(m)':>11}{'貯砂量(m³)':>13}   計畫堆積坡度")
    print("-" * 78)

    totals = {0.5: 0.0, 2 / 3: 0.0}
    for d in DAMS:
        h = override[d["id"]] if override[d["id"]] else d["h_default"]
        src = "指定" if override[d["id"]] else "影像概估"
        for k, (ratio, label) in enumerate(((2 / 3, "2/3·i0"), (0.5, "1/2·i0"))):
            ip, L, V = capacity(d["width"], h, i0, ratio)
            totals[ratio] += V
            first = (k == 0)
            name = f"{d['id']}({src})" if first else ""
            st = d["station"] if first else ""
            bw = f"{d['width']:.0f}" if first else ""
            hh = f"{h:.1f}" if first else ""
            print(f"{name:<16}{st:<9}{bw:>6}{hh:>7}{L:>11.0f}{V:>13,.0f}   {label}")

    lo, hi = totals[0.5], totals[2 / 3]
    print("-" * 78)
    print(f"兩座合計　貯砂量區間：{lo:,.0f} ～ {hi:,.0f} m3")

    channel_107 = 138083
    print()
    print("與河道土砂來源分析對照（成果報告表 5-14）")
    print(f"  107 年全段河道土砂淤積量　　{channel_107:,} m3")
    print(f"  兩座防砂壩貯砂量佔比　　　　{lo/channel_107*100:.1f}% ～ "
          f"{hi/channel_107*100:.1f}%")

    print()
    print("有效壩高敏感度（H 為平方項，主導結果）")
    print(f"{'H 變動':<12}{'溪構5-1(m3)':>14}{'溪構8-1(m3)':>14}"
          f"{'合計(m3)':>13}{'相對基準':>10}")

    def totals_at(delta):
        vs = [capacity(d["width"],
                       (override[d["id"]] if override[d["id"]] else d["h_default"]) + delta,
                       i0, 2 / 3)[2] for d in DAMS]
        return vs, sum(vs)

    base = totals_at(0.0)[1]      # 先取基準，避免前幾列算不出百分比
    for delta in (-1.0, -0.5, 0.0, 0.5, 1.0):
        vs, tot = totals_at(delta)
        mark = "  ←基準" if delta == 0.0 else ""
        print(f"{delta:+.1f} m{'':<6}{vs[0]:>14,.0f}{vs[1]:>14,.0f}"
              f"{tot:>13,.0f}{(tot/base-1)*100:>9.0f}%{mark}")

    print()
    print("★ 以上為平台影像概估值，非報告書設計值。有效壩高未見於任何專案文件，")
    print("  係以現場實拍照片取已知河床寬度為比例尺推估；取得竣工圖後應重算。")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
