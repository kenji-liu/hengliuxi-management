// 二維水理模擬棲地環境模組 — 二維棲地模擬 + 調查記錄

// ── 二維棲地模擬資料（橫流溪棲地連通性評估，107-108年成果報告）──
const WUA_DATA = {
  species: [
    { id: 'stone_loach',  name: '纓口臺鰍',   color: '#1565c0', icon: '🐟', conservation: '易危(VU)' },
    { id: 'goby',         name: '明潭吻鰕虎', color: '#2e7d32', icon: '🐟', conservation: '近危(NT)' },
    { id: 'bitterling',   name: '臺灣石魚賓', color: '#6a1b9a', icon: '🐟', conservation: '近危(NT)' },
    { id: 'white_carp',   name: '臺灣白甲魚', color: '#e65100', icon: '🐟', conservation: '易危(EN)' },
    { id: 'climbing',     name: '臺灣間爬岩鰍', color: '#00838f', icon: '🐟', conservation: '近危(NT)' },
    { id: 'torrent_cat',  name: '短臀瘋鱨',   color: '#558b2f', icon: '🐟', conservation: '易危(VU)' },
  ],
  zones: [
    {
      id: 'I', label: '第 I 區', chainage: '0K+460 ~ 0K+560',
      waterArea: 15122.75,
      facilities: ['0K+460 防砂壩', '0K+560 防砂壩'],
      note: '下游防砂壩銜接段，需注意魚道連通性與深槽連續性',
      managementPriority: '中',
      wua: {
        stone_loach:  { pct: 6.387, area: 965.93 },
        goby:         { pct: 3.357, area: 507.74 },
        bitterling:   { pct: 2.200, area: 332.65 },
        white_carp:   { pct: 1.802, area: 272.43 },
        climbing:     { pct: 1.728, area: 261.27 },
        torrent_cat:  { pct: 2.428, area: 367.23 },
      }
    },
    {
      id: 'II', label: '第 II 區', chainage: '0K+740',
      waterArea: 10658.05,
      facilities: ['0K+740 階梯式魚道'],
      note: '纓口臺鰍與明潭吻鰕虎表現相近，代表岸邊緩流與底質條件良好',
      managementPriority: '中',
      wua: {
        stone_loach:  { pct: 6.22,  area: 663.449 },
        goby:         { pct: 6.11,  area: 651.461 },
        bitterling:   { pct: 5.30,  area: 565.321 },
        white_carp:   { pct: 2.64,  area: 281.549 },
        climbing:     { pct: 2.12,  area: 226.074 },
        torrent_cat:  { pct: 1.21,  area: 129.152 },
      }
    },
    {
      id: 'III', label: '第 III 區', chainage: '1K+000',
      waterArea: 13364.68,
      facilities: ['1K+000 階梯式魚道'],
      note: '纓口臺鰍 WUA 全區最高（9.37%），為核心棲地熱區，應優先維持深槽與緩流避難帶',
      managementPriority: '高',
      wua: {
        stone_loach:  { pct: 9.37,  area: 1252.73 },
        goby:         { pct: 4.70,  area: 629.37 },
        bitterling:   { pct: 3.493, area: 466.79 },
        white_carp:   { pct: 2.54,  area: 339.62 },
        climbing:     { pct: 2.67,  area: 357.06 },
        torrent_cat:  { pct: 1.628, area: 217.64 },
      }
    },
    {
      id: 'IV', label: '第 IV 區', chainage: '1K+170 ~ 1K+225',
      waterArea: 13326.51,
      facilities: ['1K+170 階梯式魚道', '1K+225 固床工'],
      note: '明潭吻鰕虎最優（5.11%），魚道上下游緩流避難帶需定期檢核',
      managementPriority: '高',
      wua: {
        stone_loach:  { pct: 4.68,  area: 623.06 },
        goby:         { pct: 5.11,  area: 680.28 },
        bitterling:   { pct: 3.60,  area: 479.38 },
        white_carp:   { pct: 2.66,  area: 354.52 },
        climbing:     { pct: 1.80,  area: 240.95 },
        torrent_cat:  { pct: 1.19,  area: 158.10 },
      }
    },
    {
      id: 'V', label: '第 V 區', chainage: '1K+315 ~ 1K+400',
      waterArea: 15776.91,
      facilities: ['1K+315 階梯式魚道', '1K+400 粗石斜曲面式魚道', '1K+400 改良型舟通式魚道'],
      note: '最上游魚道群，應維持魚道出口→深槽→淺瀨覓食區的連續棲地序列',
      managementPriority: '高',
      wua: {
        stone_loach:  { pct: 5.046, area: 796.03 },
        goby:         { pct: 4.787, area: 755.25 },
        bitterling:   { pct: 4.337, area: 684.30 },
        white_carp:   { pct: 2.992, area: 472.04 },
        climbing:     { pct: 2.640, area: 416.51 },
        torrent_cat:  { pct: 1.11,  area: 174.80 },
      }
    }
  ]
};

const HABITAT_REPORT_IMAGES = [
  { zone: 'I', title: '第 I 區：0K+460 ~ 0K+560 防砂壩河段', src: '/webapp/assets/habitat-report/habitat-zone-i.png' },
  { zone: 'II', title: '第 II 區：0K+740 階梯式魚道河段', src: '/webapp/assets/habitat-report/habitat-zone-ii.png' },
  { zone: 'III', title: '第 III 區：1K+000 階梯式魚道河段', src: '/webapp/assets/habitat-report/habitat-zone-iii.png' },
  { zone: 'IV', title: '第 IV 區：1K+170 ~ 1K+225 階梯式魚道與固床工河段', src: '/webapp/assets/habitat-report/habitat-zone-iv.png' },
  { zone: 'V', title: '第 V 區：1K+315 ~ 1K+400 上游魚道群河段', src: '/webapp/assets/habitat-report/habitat-zone-v.png' },
  { zone: 'HYD', title: '二維水理模擬綜合圖：水深、流速與底床變化', src: '/webapp/assets/habitat-report/habitat-hydraulic-summary.png' }
];

const HABITAT_TOTAL_WUA = [
  { speciesId: 'bitterling', species: '臺灣石魚賓', area: 2528.44, pct: 3.70, judgement: '中等可用棲地，五區分布較平均，需維持礫石縫隙與底部緩流。' },
  { speciesId: 'white_carp', species: '臺灣白甲魚', area: 1720.17, pct: 2.44, judgement: '整體適宜面積偏低，局部流速與深槽條件需持續追蹤。' },
  { speciesId: 'climbing', species: '臺灣間爬岩鰍', area: 1501.87, pct: 2.84, judgement: '屬吸附底棲型，適宜棲地零散，需保留急流礫石底質與低泥砂淤積環境。' },
  { speciesId: 'stone_loach', species: '纓口臺鰍', area: 4301.21, pct: 6.09, judgement: '全物種最高，顯示橫流溪仍具明顯底棲型魚類核心可用棲地。' },
  { speciesId: 'goby', species: '明潭吻鰕虎', area: 3224.10, pct: 4.72, judgement: '接近高適宜門檻，適宜棲地多集中於魚道與緩流避難帶周邊。' },
  { speciesId: 'torrent_cat', species: '短臀瘋鱨', area: 1046.93, pct: 1.53, judgement: '全物種最低，深潭岩縫型棲地不足，應優先確認深槽與岸邊遮蔽。' }
];

const HABITAT_ROUGHNESS = [
  ['4.0', '砂（sand）', 0.03],
  ['5.3', '小礫石（gravel）', 0.05],
  ['5.7', '卵石（cobble）', 0.07],
  ['6.5', '大卵石（large cobble）', 0.20],
  ['6.9', '小巨石（small boulder）', 0.30],
  ['7.2', '大巨石（large boulder）', 0.50],
  ['7.6', '岩石或樹木（rocks or trees）', 1.50]
];

let habitatTab = 'simulation'; // 'simulation' | 'report' | 'survey'
let selectedZone = null;
let selectedSpecies = 'stone_loach';

// ── 主渲染 ────────────────────────────────────────────────────────
function renderHabitat() {
  document.getElementById('contentArea').innerHTML = `
    <div style="display:flex;gap:0;margin-bottom:16px;border-bottom:2px solid #e2e8f0">
      <button id="tabSim" onclick="switchHabitatTab('simulation')"
        style="padding:10px 20px;border:none;background:${habitatTab==='simulation'?'var(--primary)':'transparent'};
               color:${habitatTab==='simulation'?'#fff':'var(--text-muted)'};font-weight:700;cursor:pointer;
               border-radius:8px 8px 0 0;font-size:14px;transition:all .2s">
        <i class="fas fa-chart-area"></i> 二維棲地模擬
      </button>
      <button id="tabSurvey" onclick="switchHabitatTab('survey')"
        style="padding:10px 20px;border:none;background:${habitatTab==='survey'?'var(--primary)':'transparent'};
               color:${habitatTab==='survey'?'#fff':'var(--text-muted)'};font-weight:700;cursor:pointer;
               border-radius:8px 8px 0 0;font-size:14px;transition:all .2s">
        <i class="fas fa-clipboard-list"></i> 現場調查記錄
      </button>
      <button id="tabReport" onclick="switchHabitatTab('report')"
        style="padding:10px 20px;border:none;background:${habitatTab==='report'?'var(--primary)':'transparent'};
               color:${habitatTab==='report'?'#fff':'var(--text-muted)'};font-weight:700;cursor:pointer;
               border-radius:8px 8px 0 0;font-size:14px;transition:all .2s">
        <i class="fas fa-file-alt"></i> 棲地模式報告
      </button>
    </div>
    <div id="habitatTabContent"></div>
  `;
  renderHabitatTabContent();
}

function switchHabitatTab(tab) {
  habitatTab = tab;
  renderHabitat();
}

function renderHabitatTabContent() {
  const el = document.getElementById('habitatTabContent');
  if (habitatTab === 'simulation') el.innerHTML = renderSimulationView();
  else if (habitatTab === 'report') el.innerHTML = renderHabitatReportView();
  else el.innerHTML = renderSurveyView();
  if (habitatTab === 'simulation') drawWuaChart();
}

// ── 二維模擬視圖 ──────────────────────────────────────────────────
function renderSimulationView() {
  const sp = WUA_DATA.species.find(s => s.id === selectedSpecies) || WUA_DATA.species[0];
  const maxPct = Math.max(...WUA_DATA.zones.map(z => z.wua[selectedSpecies]?.pct || 0));

  const speciesSelector = WUA_DATA.species.map(s => `
    <button onclick="selectSpecies('${s.id}')"
      style="padding:6px 12px;border:2px solid ${s.id===selectedSpecies?s.color:'#e2e8f0'};
             border-radius:20px;background:${s.id===selectedSpecies?s.color:'#fff'};
             color:${s.id===selectedSpecies?'#fff':'#334155'};cursor:pointer;font-size:12px;
             font-weight:600;white-space:nowrap;transition:all .2s">
      ${s.name}
    </button>`).join('');

  const zoneCards = WUA_DATA.zones.map(z => {
    const w = z.wua[selectedSpecies] || { pct: 0, area: 0 };
    const isMax = w.pct === maxPct && maxPct > 0;
    const priorityColor = { '高': '#c62828', '中': '#f57f17', '低': '#2e7d32' }[z.managementPriority] || '#64748b';
    const pctBar = Math.round((w.pct / (maxPct || 1)) * 100);

    return `
      <div onclick="selectZone('${z.id}')"
        style="border:2px solid ${selectedZone===z.id?sp.color:'#e2e8f0'};border-radius:10px;
               padding:14px;cursor:pointer;background:${selectedZone===z.id?sp.color+'11':'#fff'};
               transition:all .2s;position:relative">
        ${isMax ? `<div style="position:absolute;top:8px;right:8px;background:#f57f17;color:#fff;
                     font-size:10px;font-weight:700;padding:2px 7px;border-radius:10px">最高</div>` : ''}
        <div style="font-weight:700;font-size:13px;color:#1e293b;margin-bottom:2px">${z.label}</div>
        <div style="font-size:11px;color:#64748b;margin-bottom:8px">${z.chainage}</div>
        <div style="font-size:12px;color:#475569;margin-bottom:6px">
          常流水面積 <b>${z.waterArea.toLocaleString()}</b> m²
        </div>
        <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px">
          <div style="flex:1;height:8px;background:#e2e8f0;border-radius:4px">
            <div style="width:${pctBar}%;height:100%;background:${sp.color};border-radius:4px;transition:width .4s"></div>
          </div>
          <span style="font-weight:700;font-size:13px;color:${sp.color};width:46px;text-align:right">${w.pct.toFixed(2)}%</span>
        </div>
        <div style="font-size:11px;color:#64748b">WUA：${w.area.toFixed(1)} m²</div>
        <div style="margin-top:8px;font-size:11px">
          <span style="color:${priorityColor};font-weight:700;background:${priorityColor}18;
                       padding:1px 7px;border-radius:8px">管理${z.managementPriority}優先</span>
        </div>
      </div>`;
  }).join('');

  const zoneDetail = selectedZone ? (() => {
    const z = WUA_DATA.zones.find(z => z.id === selectedZone);
    if (!z) return '';
    const priorityColor = { '高': '#c62828', '中': '#f57f17', '低': '#2e7d32' }[z.managementPriority];
    const rows = WUA_DATA.species.map(s => {
      const w = z.wua[s.id] || { pct: 0, area: 0 };
      const allPcts = WUA_DATA.zones.map(zz => zz.wua[s.id]?.pct || 0);
      const isZoneMax = w.pct === Math.max(...allPcts);
      return `
        <tr style="border-bottom:1px solid #f0f0f0">
          <td style="padding:7px 10px;font-size:13px">
            <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${s.color};margin-right:6px"></span>
            ${s.name}
            <span style="font-size:10px;color:#94a3b8;margin-left:4px">${s.conservation}</span>
          </td>
          <td style="padding:7px 10px;font-weight:700;color:${s.color};font-size:13px">
            ${w.pct.toFixed(3)}%
            ${isZoneMax ? '<span style="font-size:10px;color:#f57f17;margin-left:4px">↑最高</span>' : ''}
          </td>
          <td style="padding:7px 10px;font-size:13px;color:#475569">${w.area.toFixed(2)} m²</td>
          <td style="padding:7px 10px">
            <div style="height:6px;background:#e2e8f0;border-radius:3px;min-width:80px">
              <div style="width:${Math.min(100,(w.pct/10)*100)}%;height:100%;background:${s.color};border-radius:3px"></div>
            </div>
          </td>
        </tr>`;
    }).join('');

    return `
      <div class="card" style="margin-top:16px">
        <div class="card-header">
          <span class="card-title">${z.label}（${z.chainage}）— 詳細 WUA 分析</span>
          <span style="font-size:12px;color:${priorityColor};font-weight:700;background:${priorityColor}18;padding:3px 10px;border-radius:10px">
            管理${z.managementPriority}優先
          </span>
        </div>
        <div class="card-body" style="padding:0">
          <table style="width:100%;border-collapse:collapse">
            <thead>
              <tr style="background:#f8fafc;font-size:12px;color:#64748b">
                <th style="padding:8px 10px;text-align:left;font-weight:600">魚種</th>
                <th style="padding:8px 10px;text-align:left;font-weight:600">WUA (%)</th>
                <th style="padding:8px 10px;text-align:left;font-weight:600">可使用面積 (m²)</th>
                <th style="padding:8px 10px;text-align:left;font-weight:600">相對量</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
          <div style="padding:12px 14px;background:#fffbeb;border-top:1px solid #fde68a;font-size:12px;color:#78350f;line-height:1.6">
            <b>管理判斷：</b>${z.note}
          </div>
          <div style="padding:10px 14px;background:#f0f9ff;border-top:1px solid #bae6fd;font-size:12px;color:#0c4a6e">
            <b>關聯設施：</b>${z.facilities.join('、')}
          </div>
        </div>
      </div>`;
  })() : '';

  return `
    <!-- 頁首說明 -->
    <div class="card" style="margin-bottom:16px;border-left:4px solid var(--primary)">
      <div class="card-body" style="padding:14px 16px">
        <div style="display:flex;align-items:flex-start;gap:12px;margin-bottom:12px">
          <div style="flex:1">
            <div style="font-weight:700;font-size:15px;margin-bottom:4px">
              橫流溪棲地二維模擬分析（107-108年成果報告）
            </div>
            <div style="font-size:12px;color:#64748b;line-height:1.7">
              本分析採用二維水理模型（2D Hydrodynamic Model）模擬橫流溪各河段在設計流量下的流速場與水深分布，
              再疊合各魚種的棲地適宜性曲線（HSC），計算出<b>加權可使用面積（WUA）</b>，
              作為各河段對保育魚類棲地品質的量化指標。
            </div>
          </div>
          <div style="text-align:center;background:var(--primary);color:#fff;border-radius:8px;
                      padding:10px 16px;min-width:80px;flex-shrink:0">
            <div style="font-size:22px;font-weight:700">5</div>
            <div style="font-size:11px">評估分區</div>
          </div>
        </div>

        <!-- WUA 判讀說明 -->
        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:12px 14px">
          <div style="font-weight:700;font-size:12px;color:#334155;margin-bottom:8px">
            📖 如何判讀 WUA 數據
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;font-size:12px">
            <div style="background:#fff;border-radius:6px;padding:10px;border-left:3px solid #1565c0">
              <div style="font-weight:700;color:#1565c0;margin-bottom:4px">WUA（%）是什麼？</div>
              <div style="color:#475569;line-height:1.6">
                「加權可使用面積」佔該區<b>常流水面積</b>的百分比。<br>
                例：纓口臺鰍 WUA 9.37%，表示第 III 區 13,364 m² 水面中，有 <b>1,253 m²</b> 的流速與水深條件符合纓口臺鰍的棲地需求。
              </div>
            </div>
            <div style="background:#fff;border-radius:6px;padding:10px;border-left:3px solid #2e7d32">
              <div style="font-weight:700;color:#2e7d32;margin-bottom:4px">數值如何判斷好壞？</div>
              <div style="color:#475569;line-height:1.6">
                <span style="color:#2e7d32;font-weight:700">≥ 5%</span>　棲地條件優良，魚類主要利用區<br>
                <span style="color:#f57f17;font-weight:700">2% – 5%</span>　棲地條件尚可，可供利用<br>
                <span style="color:#c62828;font-weight:700">&lt; 2%</span>　棲地條件不足，需檢討改善<br>
                <br>
                值越高代表該河段對該魚種的棲地適宜性越高。
              </div>
            </div>
            <div style="background:#fff;border-radius:6px;padding:10px;border-left:3px solid #e65100">
              <div style="font-weight:700;color:#e65100;margin-bottom:4px">WUA 與管理的關係</div>
              <div style="color:#475569;line-height:1.6">
                WUA 是決定<b>魚道維護優先順序</b>的量化依據：<br>
                • WUA 高的河段 → 優先保護，避免棲地劣化<br>
                • WUA 低的河段 → 檢討是否因設施阻隔、淤積或流量不足所致<br>
                • 颱風後若WUA顯著下降，應立即安排復原作業
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 魚種選擇器 -->
    <div style="margin-bottom:12px">
      <div style="font-size:12px;color:#64748b;margin-bottom:8px;font-weight:600">選擇魚種查看 WUA 分布：</div>
      <div style="display:flex;flex-wrap:wrap;gap:8px">${speciesSelector}</div>
    </div>

    <!-- 五區卡片 -->
    <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:12px;margin-bottom:16px">
      ${zoneCards}
    </div>

    <!-- WUA 比較圖 -->
    <div class="card" style="margin-bottom:16px">
      <div class="card-header">
        <span class="card-title">各區 WUA 比較圖（全物種）</span>
        <span style="font-size:12px;color:#64748b">數值為 WUA（%），越高代表棲地適宜性越佳</span>
      </div>
      <div class="card-body" style="padding:16px">
        <canvas id="wuaChart" height="200"></canvas>
      </div>
    </div>

    <!-- 區域詳細 -->
    ${zoneDetail}

    <!-- 管理建議摘要 -->
    <div class="card" style="margin-top:16px">
      <div class="card-header"><span class="card-title">棲地管理建議摘要</span></div>
      <div class="card-body">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
          <div style="background:#ffebee;border-left:4px solid #c62828;border-radius:6px;padding:12px">
            <div style="font-weight:700;color:#c62828;margin-bottom:6px">⚠️ 高優先管理區（第III、IV、V區）</div>
            <ul style="font-size:12px;color:#424242;margin:0;padding-left:16px;line-height:1.8">
              <li>第III區（1K+000）纓口臺鰍 WUA 全域最高 9.37%，應列為核心保育區</li>
              <li>第IV、V區魚道群密集，定期確認上下游緩流避難帶水深</li>
              <li>颱風後優先巡查魚道出口是否遭土砂堵塞</li>
            </ul>
          </div>
          <div style="background:#e8f5e9;border-left:4px solid #2e7d32;border-radius:6px;padding:12px">
            <div style="font-weight:700;color:#2e7d32;margin-bottom:6px">✅ 維護重點原則</div>
            <ul style="font-size:12px;color:#424242;margin:0;padding-left:16px;line-height:1.8">
              <li>WUA &lt; 2% 的魚種棲地若持續集中，應檢討局部流速與底質</li>
              <li>第I區下游防砂壩需確保魚道連通性與深槽連續</li>
              <li>各區淺瀨覓食區與緩流避難帶應維持連續不中斷</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderHabitatReportView() {
  const totalWaterArea = WUA_DATA.zones.reduce((sum, z) => sum + z.waterArea, 0);
  const bestSpecies = HABITAT_TOTAL_WUA.reduce((best, item) => item.pct > best.pct ? item : best, HABITAT_TOTAL_WUA[0]);
  const highPriorityZones = WUA_DATA.zones.filter(z => z.managementPriority === '高');
  const hydFigure = HABITAT_REPORT_IMAGES.find(i => i.zone === 'HYD');
  const zoneFigures = HABITAT_REPORT_IMAGES.filter(i => i.zone !== 'HYD');

  return `
    <div class="card" style="margin-bottom:16px;border-left:4px solid #0f766e">
      <div class="card-body" style="padding:18px">
        <div style="display:flex;gap:16px;align-items:flex-start;justify-content:space-between;flex-wrap:wrap">
          <div style="min-width:280px;flex:1">
            <div style="font-size:20px;font-weight:800;color:#0f172a;margin-bottom:6px">
              橫流溪河川棲地二維模式分析報告
            </div>
            <div style="font-size:13px;line-height:1.75;color:#475569">
              本頁將報告書中二維水理模擬、棲地適合度曲線與 WUA 定量成果整合至二維水理模擬棲地環境模組，
              用於判讀魚道上下游是否具備連續深槽、緩流避難帶與淺瀨覓食區。分析定位為管理輔助，
              可支援魚道巡查、棲地復育優先順序與颱風後快速檢核。
            </div>
          </div>
          <div style="display:grid;grid-template-columns:repeat(2,minmax(120px,1fr));gap:10px;min-width:320px">
            ${renderHabitatReportMetric('評估分區', '5 區', '0K+460 至 1K+400', '#0f766e')}
            ${renderHabitatReportMetric('常流水面積', `${totalWaterArea.toLocaleString(undefined, { maximumFractionDigits: 2 })} m²`, '五區合計', '#2563eb')}
            ${renderHabitatReportMetric('最高整體 WUA', `${bestSpecies.species} ${bestSpecies.pct.toFixed(2)}%`, `${bestSpecies.area.toLocaleString()} m²`, '#7c3aed')}
            ${renderHabitatReportMetric('優先管理區', highPriorityZones.map(z => z.label.replace('第 ', '')).join('、'), '魚道群與核心棲地', '#dc2626')}
          </div>
        </div>
      </div>
    </div>

    <div class="card" style="margin-bottom:16px">
      <div class="card-header">
        <span class="card-title"><i class="fas fa-project-diagram"></i> 模式建置與資料轉換邏輯</span>
      </div>
      <div class="card-body">
        <div style="display:grid;grid-template-columns:1.2fr .8fr;gap:16px;align-items:start">
          <div style="font-size:13px;line-height:1.85;color:#334155">
            <p style="margin:0 0 10px">
              模式以地形測量與河道邊界建立 <b>R2D_Bed</b>，再透過 <b>R2D_Mesh</b> 生成計算網格；
              模擬完成後輸出水深、流速與底床變化，並套疊魚類棲地適合度曲線（HSC），計算各物種在各分區的
              <b>Weighted Usable Area, WUA</b>。
            </p>
            <p style="margin:0">
              因此本平台不只呈現魚類調查點位，而是把水理條件轉成可管理的棲地分區：
              深槽代表枯水期與避難需求，緩流帶代表魚道上下游停棲與過渡空間，淺瀨與礫石底質則支援覓食與底棲活動。
            </p>
          </div>
          <div style="border:1px solid #e2e8f0;border-radius:8px;overflow:hidden">
            <table style="width:100%;border-collapse:collapse;font-size:12px">
              <thead>
                <tr style="background:#f8fafc;color:#475569">
                  <th style="padding:8px;text-align:left">底質編號</th>
                  <th style="padding:8px;text-align:left">底質等級</th>
                  <th style="padding:8px;text-align:right">粗糙高 H</th>
                </tr>
              </thead>
              <tbody>
                ${HABITAT_ROUGHNESS.map(r => `
                  <tr style="border-top:1px solid #edf2f7">
                    <td style="padding:7px 8px">${r[0]}</td>
                    <td style="padding:7px 8px">${r[1]}</td>
                    <td style="padding:7px 8px;text-align:right;font-weight:700">${r[2]}</td>
                  </tr>`).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>

    ${hydFigure ? renderHabitatReportFigure(hydFigure, '水深、流速、底床變化綜合判讀', `
      0K+460 防砂壩下游因基礎損壞形成深潭，0K+560 防砂壩上下游可見局部沖刷與深槽；0K+740、1K+000、1K+170、1K+315、1K+400 等魚道節點則是棲地連續性的主要檢核點。
      管理上應把「魚道入口、魚道出口、下游深槽與岸邊緩流帶」視為同一組連續功能單元，而非只檢查單一構造物外觀。
    `) : ''}

    <div class="card" style="margin-bottom:16px">
      <div class="card-header">
        <span class="card-title"><i class="fas fa-layer-group"></i> 五區棲地模式成果圖文判讀</span>
      </div>
      <div class="card-body" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(360px,1fr));gap:14px">
        ${zoneFigures.map(fig => {
          const zone = WUA_DATA.zones.find(z => z.id === fig.zone);
          return renderHabitatZoneReportCard(fig, zone);
        }).join('')}
      </div>
    </div>

    <div class="card" style="margin-bottom:16px">
      <div class="card-header">
        <span class="card-title"><i class="fas fa-table"></i> 物種 WUA 總量與管理判讀</span>
      </div>
      <div class="card-body" style="padding:0">
        <table style="width:100%;border-collapse:collapse;font-size:13px">
          <thead>
            <tr style="background:#f8fafc;color:#475569">
              <th style="padding:10px;text-align:left">物種</th>
              <th style="padding:10px;text-align:right">總可用面積</th>
              <th style="padding:10px;text-align:right">面積權重</th>
              <th style="padding:10px;text-align:left">具體判讀</th>
            </tr>
          </thead>
          <tbody>
            ${HABITAT_TOTAL_WUA.slice().sort((a, b) => b.pct - a.pct).map(item => {
              const species = WUA_DATA.species.find(s => s.id === item.speciesId);
              return `
                <tr style="border-top:1px solid #edf2f7">
                  <td style="padding:10px;font-weight:700;color:${species?.color || '#334155'}">${item.species}</td>
                  <td style="padding:10px;text-align:right">${item.area.toLocaleString()} m²</td>
                  <td style="padding:10px;text-align:right;font-weight:800">${item.pct.toFixed(2)}%</td>
                  <td style="padding:10px;color:#475569;line-height:1.6">${item.judgement}</td>
                </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>

    <div class="card">
      <div class="card-header">
        <span class="card-title"><i class="fas fa-clipboard-check"></i> 具體管理結論</span>
      </div>
      <div class="card-body">
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:12px">
          ${renderHabitatAction('1', '第 III 區列為核心棲地熱區', '1K+000 階梯式魚道河段纓口臺鰍 WUA 達 9.37%，為全區最高；颱風後應優先檢查深槽是否淤積、魚道出口是否阻塞。', '#dc2626')}
          ${renderHabitatAction('2', '第 IV、V 區維持魚道群連續性', '1K+170、1K+315、1K+400 魚道群需確認出口至深槽、緩流帶、淺瀨的連續路徑，避免單點完好但上下游棲地斷裂。', '#ea580c')}
          ${renderHabitatAction('3', '第 I 區補強低適宜物種棲地', '臺灣白甲魚與臺灣間爬岩鰍在第 I 區 WUA 低於 2%，應檢查防砂壩下游流速過高、底質淤積或岸邊避難帶不足。', '#2563eb')}
          ${renderHabitatAction('4', 'GIS 圖台建議新增四類棲地層', '建議將深槽、緩流避難帶、淺瀨覓食區、淤積沖刷熱區分層管理，並與魚道、固床工、防砂壩巡查紀錄連動。', '#0f766e')}
        </div>
      </div>
    </div>
  `;
}

function renderHabitatReportMetric(label, value, note, color) {
  return `
    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-left:4px solid ${color};border-radius:8px;padding:10px 12px">
      <div style="font-size:12px;color:#64748b;margin-bottom:3px">${label}</div>
      <div style="font-size:17px;font-weight:800;color:${color};line-height:1.25">${value}</div>
      <div style="font-size:11px;color:#64748b;margin-top:3px">${note}</div>
    </div>`;
}

function renderHabitatReportFigure(fig, title, text) {
  return `
    <div class="card" style="margin-bottom:16px">
      <div class="card-header">
        <span class="card-title"><i class="fas fa-image"></i> ${title}</span>
        <span style="font-size:12px;color:#64748b">點擊圖面可放大</span>
      </div>
      <div class="card-body">
        <div style="display:grid;grid-template-columns:minmax(300px,1.1fr) minmax(260px,.9fr);gap:14px;align-items:start">
          <img src="${fig.src}" alt="${fig.title}" onclick="openHabitatImageLightbox('${fig.src}', '${fig.title.replace(/'/g, '&#39;')}')"
               title="點擊放大"
               style="width:100%;border:1px solid #e2e8f0;border-radius:6px;display:block;cursor:zoom-in">
          <div>
            <div style="font-weight:800;color:#0f172a;margin-bottom:8px">${fig.title}</div>
            <div style="font-size:13px;color:#475569;line-height:1.8">${text}</div>
          </div>
        </div>
      </div>
    </div>`;
}

function renderHabitatZoneReportCard(fig, zone) {
  if (!zone) return '';
  const sorted = WUA_DATA.species
    .map(s => ({ ...s, ...(zone.wua[s.id] || { pct: 0, area: 0 }) }))
    .sort((a, b) => b.pct - a.pct);
  const top = sorted[0];
  const low = sorted.filter(s => s.pct < 2).map(s => s.name).join('、') || '無低於 2% 物種';
  const conclusion = habitatZoneConcreteConclusion(zone.id);

  return `
    <div style="border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;background:#fff">
      <img src="${fig.src}" alt="${fig.title}" onclick="openHabitatImageLightbox('${fig.src}', '${fig.title.replace(/'/g, '&#39;')}')"
           title="點擊放大"
           style="width:100%;aspect-ratio:16/9;object-fit:cover;object-position:top;border-bottom:1px solid #e2e8f0;cursor:zoom-in">
      <div style="padding:12px">
        <div style="font-weight:800;color:#0f172a;margin-bottom:4px">${fig.title}</div>
        <div style="font-size:12px;color:#64748b;margin-bottom:8px">
          常流水面積 ${zone.waterArea.toLocaleString()} m²｜關聯設施：${zone.facilities.join('、')}
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px">
          <div style="background:#ecfdf5;border-radius:6px;padding:8px">
            <div style="font-size:11px;color:#047857">最佳適宜物種</div>
            <div style="font-weight:800;color:#065f46">${top.name} ${top.pct.toFixed(3)}%</div>
            <div style="font-size:11px;color:#047857">${top.area.toLocaleString()} m²</div>
          </div>
          <div style="background:#fff7ed;border-radius:6px;padding:8px">
            <div style="font-size:11px;color:#c2410c">需追蹤項目</div>
            <div style="font-size:12px;font-weight:700;color:#9a3412">${low}</div>
          </div>
        </div>
        <div style="font-size:13px;color:#334155;line-height:1.75">${conclusion}</div>
      </div>
    </div>`;
}

function openHabitatImageLightbox(src, title) {
  const modal = document.getElementById('modal');
  document.getElementById('modalTitle').textContent = title || '棲地模式圖';
  document.getElementById('modalBody').innerHTML = `
    <div style="background:#0f172a;border-radius:8px;padding:10px;max-height:78vh;overflow:auto;text-align:center">
      <img src="${src}" alt="${title || '棲地模式圖'}"
           style="max-width:100%;height:auto;display:inline-block;border-radius:4px;background:#fff">
    </div>
    <div style="font-size:12px;color:#64748b;margin-top:8px;text-align:center">
      可使用滑鼠滾輪捲動查看完整圖面，點擊背景或右上角關閉。
    </div>
  `;
  document.getElementById('modalFooter').innerHTML = `
    <button class="btn btn-secondary" onclick="closeModal()">關閉</button>
  `;
  if (modal) {
    modal.style.maxWidth = '96vw';
    modal.style.width = '96vw';
    modal.style.maxHeight = '92vh';
  }
  openModal();
}

function habitatZoneConcreteConclusion(zoneId) {
  const text = {
    I: '第 I 區受 0K+460、0K+560 防砂壩影響，纓口臺鰍可用面積最高，但臺灣白甲魚與臺灣間爬岩鰍偏低。管理上應維持壩下深槽與岸邊緩流帶，並避免泥砂堆積使魚道上下游斷連。',
    II: '第 II 區 0K+740 階梯式魚道周邊，纓口臺鰍、明潭吻鰕虎與臺灣石魚賓均達 5% 以上，顯示此段具備較好的緩流避難與淺瀨覓食條件。巡查重點為魚道入口、出口水深及局部沖刷。',
    III: '第 III 區 1K+000 階梯式魚道為全區最重要核心棲地，纓口臺鰍 WUA 達 9.37%。此段應列為優先保全河段，維持連續深槽、低泥砂淤積與可通行水路。',
    IV: '第 IV 區 1K+170 至 1K+225 受階梯式魚道與固床工共同影響，明潭吻鰕虎 WUA 為本區最高。管理上應確認固床工下游是否形成過度跌水或淤積，並維持岸邊緩流避難帶。',
    V: '第 V 區 1K+315 至 1K+400 為上游魚道群，纓口臺鰍、明潭吻鰕虎與臺灣石魚賓均有中高適宜性。此段應以魚道群連續性為核心，確認出口接續深槽、淺瀨與岸邊緩流。'
  };
  return text[zoneId] || '';
}

function renderHabitatAction(no, title, text, color) {
  return `
    <div style="border:1px solid #e2e8f0;border-top:4px solid ${color};border-radius:8px;padding:12px;background:#fff">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
        <span style="display:inline-flex;align-items:center;justify-content:center;width:24px;height:24px;border-radius:50%;background:${color};color:#fff;font-weight:800;font-size:12px">${no}</span>
        <span style="font-weight:800;color:#0f172a">${title}</span>
      </div>
      <div style="font-size:13px;color:#475569;line-height:1.75">${text}</div>
    </div>`;
}

function selectSpecies(spId) {
  selectedSpecies = spId;
  renderHabitatTabContent();
}

function selectZone(zoneId) {
  selectedZone = selectedZone === zoneId ? null : zoneId;
  renderHabitatTabContent();
}

function drawWuaChart() {
  const canvas = document.getElementById('wuaChart');
  if (!canvas || !window.Chart) return;

  // Destroy previous chart instance if exists
  if (window._wuaChartInstance) {
    window._wuaChartInstance.destroy();
    window._wuaChartInstance = null;
  }

  const labels = WUA_DATA.zones.map(z => z.label);
  const datasets = WUA_DATA.species.map(sp => ({
    label: sp.name,
    data: WUA_DATA.zones.map(z => z.wua[sp.id]?.pct || 0),
    backgroundColor: sp.color + 'bb',
    borderColor: sp.color,
    borderWidth: 1.5,
    borderRadius: 4,
  }));

  window._wuaChartInstance = new Chart(canvas, {
    type: 'bar',
    data: { labels, datasets },
    options: {
      responsive: true,
      plugins: {
        legend: { position: 'right', labels: { font: { size: 11 }, boxWidth: 14 } },
        tooltip: {
          callbacks: {
            label: ctx => `${ctx.dataset.label}：${ctx.parsed.y.toFixed(3)}%`
          }
        }
      },
      scales: {
        x: { grid: { display: false } },
        y: {
          title: { display: true, text: 'WUA (%)', font: { size: 11 } },
          grid: { color: '#f0f0f0' }
        }
      }
    }
  });
}

// ── 現場調查記錄視圖 ──────────────────────────────────────────────
function renderSurveyView() {
  const data = DB.getAll('habitats');
  return `
    <div class="card">
      <div class="card-header">
        <span class="card-title"><i class="fas fa-clipboard-list"></i> 現場棲地調查記錄</span>
        <button class="btn btn-primary" onclick="openHabitatForm()"><i class="fas fa-plus"></i> 新增棲地</button>
      </div>
      <div class="card-body">
        <div id="habitatList">
          ${data.length === 0
            ? '<div class="empty-state"><i class="fas fa-tree"></i><p>尚無棲地資料</p></div>'
            : data.map(h => renderHabitatCard(h)).join('')}
        </div>
      </div>
    </div>
  `;
}

function renderHabitatCard(h) {
  const qualityColor = [,'#f44336','#ff9800','#ffc107','#8bc34a','#4caf50'][h.quality] || '#9e9e9e';
  const surveyBadge = h.surveyMethod === '水質採樣'
    ? `<span style="background:#00796b;color:#fff;font-size:11px;padding:2px 8px;border-radius:10px">💧 水質採樣</span>`
    : `<span style="background:#2e7d32;color:#fff;font-size:11px;padding:2px 8px;border-radius:10px">⚡ 電魚調查</span>`;
  const kmBadge = h.stationKm ? `<span style="background:#e3f2fd;color:#1565c0;font-size:11px;font-weight:700;padding:2px 8px;border-radius:10px">${h.stationKm}</span>` : '';
  const twd97Block = (h.twd97x && h.twd97y) ? `
    <div style="background:#f0f7f0;border:1px solid #c8e6c9;border-radius:6px;padding:8px 12px;margin-top:10px;font-size:12px">
      <span style="color:#2e7d32;font-weight:700">📐 TWD97：</span>
      <span style="font-family:monospace">X=${h.twd97x.toLocaleString()}，Y=${h.twd97y.toLocaleString()}</span>
      <span style="color:#888;margin-left:8px">（WGS84：${h.lat?.toFixed(4)}°N, ${h.lng?.toFixed(4)}°E）</span>
    </div>` : '';

  return `
    <div class="card" style="margin-bottom:12px;border-left:4px solid ${qualityColor}">
      <div class="card-body">
        <div class="flex items-center gap-3" style="margin-bottom:12px;flex-wrap:wrap">
          <span class="fw-600" style="font-size:15px">${h.name}</span>
          <span class="badge badge-primary">${h.type}</span>
          ${surveyBadge} ${kmBadge}
          <span style="margin-left:auto;font-size:13px;color:var(--text-muted)">${h.date}</span>
        </div>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;font-size:13px">
          <div><span class="text-muted">位置：</span>${h.location}</div>
          ${h.area != null ? `<div><span class="text-muted">面積：</span>${h.area} m²</div>` : ''}
          ${h.depth != null ? `<div><span class="text-muted">水深：</span>${h.depth} m</div>` : ''}
          <div><span class="text-muted">底質：</span>${h.substrate || '-'}</div>
          <div><span class="text-muted">植被：</span>${h.vegetation || '-'}</div>
          <div><span class="text-muted">品質：</span>
            <span style="color:${qualityColor};font-weight:600">${['','差','尚可','普通','良好','優良'][h.quality] || '-'}</span>
            <span style="color:${qualityColor}"> ${'★'.repeat(h.quality||0)}${'☆'.repeat(5-(h.quality||0))}</span>
          </div>
        </div>
        ${twd97Block}
        ${h.note ? `<div style="margin-top:10px;font-size:12px;padding:8px;background:var(--surface2);border-radius:4px;line-height:1.6">${h.note}</div>` : ''}
        <div style="margin-top:12px;display:flex;gap:8px">
          <button class="btn btn-sm btn-outline" onclick="openHabitatForm(${h.id})"><i class="fas fa-edit"></i> 編輯</button>
          <button class="btn btn-sm btn-outline" onclick="deleteHabitat(${h.id})" style="color:var(--danger)"><i class="fas fa-trash"></i> 刪除</button>
        </div>
      </div>
    </div>
  `;
}

function openHabitatForm(id = null) {
  const h = id ? DB.getById('habitats', id) : {};
  document.getElementById('modalTitle').textContent = id ? '編輯棲地資料' : '新增棲地調查';
  document.getElementById('modalBody').innerHTML = `
    <div class="form-grid">
      <div class="form-group"><label>棲地名稱 *</label><input id="h_name" type="text" value="${h.name || ''}" placeholder="例：上游礫石淺灘"></div>
      <div class="form-group"><label>棲地類型</label>
        <select id="h_type">
          ${['淺灘','急流淺灘','礫石淺灘','深潭','緩流深潭','緩流','急流','水質調查','其他'].map(t => `<option value="${t}" ${h.type===t?'selected':''}>${t}</option>`).join('')}
        </select>
      </div>
      <div class="form-group"><label>調查方法</label>
        <select id="h_surveyMethod">
          ${['電魚','水質採樣','目視調查'].map(m => `<option value="${m}" ${h.surveyMethod===m?'selected':''}>${m}</option>`).join('')}
        </select>
      </div>
      <div class="form-group"><label>樁號</label><input id="h_stationKm" type="text" value="${h.stationKm||''}" placeholder="0K+460"></div>
      <div class="form-group full-width"><label>位置描述 *</label><input id="h_location" type="text" value="${h.location || ''}"></div>
      <div class="form-group"><label>緯度 (WGS84)</label><input id="h_lat" type="number" step="0.0001" value="${h.lat || ''}"></div>
      <div class="form-group"><label>經度 (WGS84)</label><input id="h_lng" type="number" step="0.0001" value="${h.lng || ''}"></div>
      <div class="form-group"><label>TWD97 X</label><input id="h_twd97x" type="number" value="${h.twd97x||''}"></div>
      <div class="form-group"><label>TWD97 Y</label><input id="h_twd97y" type="number" value="${h.twd97y||''}"></div>
      <div class="form-group"><label>面積（m²）</label><input id="h_area" type="number" value="${h.area || ''}"></div>
      <div class="form-group"><label>水深（m）</label><input id="h_depth" type="number" step="0.1" value="${h.depth || ''}"></div>
      <div class="form-group"><label>底質</label>
        <select id="h_substrate">
          ${['礫石','卵石','砂礫混合','沙質','岩盤','其他'].map(s => `<option value="${s}" ${h.substrate===s?'selected':''}>${s}</option>`).join('')}
        </select>
      </div>
      <div class="form-group"><label>植被覆蓋</label>
        <select id="h_vegetation">
          ${['低','中','高'].map(v => `<option value="${v}" ${h.vegetation===v?'selected':''}>${v}</option>`).join('')}
        </select>
      </div>
      <div class="form-group"><label>棲地品質</label>
        <select id="h_quality">
          ${[1,2,3,4,5].map(n => `<option value="${n}" ${h.quality===n?'selected':''}>${n} - ${['差','尚可','普通','良好','優良'][n-1]}</option>`).join('')}
        </select>
      </div>
      <div class="form-group"><label>調查日期</label><input id="h_date" type="date" value="${h.date || ''}"></div>
      <div class="form-group"><label>資料來源</label><input id="h_source" type="text" value="${h.source||''}" placeholder="107-108成果報告"></div>
      <div class="form-group full-width"><label>備註</label><textarea id="h_note" rows="3">${h.note || ''}</textarea></div>
    </div>
  `;
  document.getElementById('modalFooter').innerHTML = `
    <button class="btn btn-outline" onclick="closeModal()">取消</button>
    <button class="btn btn-primary" onclick="saveHabitat(${id || 'null'})"><i class="fas fa-save"></i> 儲存</button>
  `;
  openModal();
}

function saveHabitat(id) {
  const name = document.getElementById('h_name').value.trim();
  const location = document.getElementById('h_location').value.trim();
  if (!name || !location) { showToast('請填寫必填欄位', 'error'); return; }
  const item = {
    name, location,
    type: document.getElementById('h_type').value,
    surveyMethod: document.getElementById('h_surveyMethod').value,
    stationKm: document.getElementById('h_stationKm').value.trim(),
    lat: parseFloat(document.getElementById('h_lat').value) || null,
    lng: parseFloat(document.getElementById('h_lng').value) || null,
    twd97x: parseFloat(document.getElementById('h_twd97x').value) || null,
    twd97y: parseFloat(document.getElementById('h_twd97y').value) || null,
    area: parseFloat(document.getElementById('h_area').value) || null,
    depth: parseFloat(document.getElementById('h_depth').value) || null,
    substrate: document.getElementById('h_substrate').value,
    vegetation: document.getElementById('h_vegetation').value,
    quality: parseInt(document.getElementById('h_quality').value),
    date: document.getElementById('h_date').value,
    source: document.getElementById('h_source').value.trim(),
    note: document.getElementById('h_note').value.trim()
  };
  if (id) { DB.update('habitats', id, item); showToast('棲地資料已更新', 'success'); }
  else { DB.insert('habitats', item); showToast('棲地資料已新增', 'success'); }
  closeModal();
  habitatTab = 'survey';
  renderHabitat();
}

function deleteHabitat(id) {
  const h = DB.getById('habitats', id);
  if (!confirm(`確定要刪除「${h?.name}」嗎？`)) return;
  DB.delete('habitats', id);
  showToast('棲地資料已刪除', 'info');
  renderHabitatTabContent();
}
