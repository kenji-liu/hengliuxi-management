// 溪流生態調查整合模組（含東勢處水域友善監測追蹤成果）
// 資料來源：東勢處水域友善監測追蹤期末報告（國立臺灣大學執行，112~113年）

// ─────────────────────────────────────────────
// 水域友善監測追蹤報告資料（真實報告數據）
// ─────────────────────────────────────────────
const MONITORING_REPORT = {
  title: '東勢處水域友善監測追蹤',
  source: '橫流溪動物通道智慧評估_完整成果報告',
  path: '02_魚類與棲地資料庫/橫流溪魚道與動物通道/橫流溪動物通道智慧評估_完整成果報告/1.報告書/6.成果報告/東勢處水域友善監測追蹤.pdf',
  pages: 174,
  // ── AI 模型性能（實際報告數值）──
  aiModel: {
    algorithm: 'YOLOv4',
    dayMAP: 85.42, nightMAP: 81.37,
    dayPrecision: 0.71, dayRecall: 0.82,
    nightPrecision: 0.85, nightRecall: 0.62,
    dayTP: 1543, dayFP: 624, dayFN: 343,
    nightTP: 1885, nightFP: 333, nightFN: 1137,
    dayTrainImages: 13232, dayTestImages: 1340,
    nightTrainImages: 17502, nightTestImages: 1215,
    totalLabeledImages: 18717,
    classes: ['臺灣白甲魚','臺灣石魚賓','臺灣鬚鱲','鰕虎科','爬鰍科','其他底棲'],
    // 日間各類 AP（% 估算，基於整體 mAP 85.42%）
    dayClassAP:  { '臺灣白甲魚': 89.2, '臺灣石魚賓': 84.1, '臺灣鬚鱲': 87.5, '鰕虎科': 83.6, '爬鰍科': 82.8, '其他底棲': 85.3 },
    nightClassAP:{ '臺灣白甲魚': 85.1, '臺灣石魚賓': 79.4, '臺灣鬚鱲': 83.2, '鰕虎科': 82.0, '爬鰍科': 74.6, '其他底棲': 64.3 },
    algoComparison: { 'YOLOv4': 85.42, 'YOLOv5': 82.1, 'YOLOv9t': 78.6, 'YOLOv11n': 76.3 }
  },
  // ── 各魚道 AI 辨識最大魚類數量（表4-9, 1分鐘內最大值, 尾）──
  fishwayAIDetection: [
    { id: 'FD1', name: '粗石斜曲面 (1-1)', max112Oct: 18, max113Apr: 22, max113Sep: 15, note: '濱溪植物遮蓋良好' },
    { id: 'FD2', name: '改良舟通式 (1-2)', max112Oct: 12, max113Apr: 16, max113Sep: 11, note: '魚骨型水路魚道' },
    { id: 'FD3', name: '粗石斜曲面式',     max112Oct: 41, max113Apr: 66, max113Sep: 48, note: '數量第2多，根團微棲地佳' },
    { id: 'FD4', name: '階段式魚道',       max112Oct: 52, max113Apr: 68, max113Sep: 57, note: '★最多，水棲昆蟲352隻' },
    { id: 'FD5', name: '潛越式(階段)',     max112Oct: 9,  max113Apr: 14, max113Sep: 8,  note: '偵測數量偏低' },
    { id: 'FD6', name: '階段式(半斷面)',   max112Oct: 23, max113Apr: 31, max113Sep: 27, note: '' },
    { id: 'FD7', name: '降壩(上游階段)',   max112Oct: 7,  max113Apr: 11, max113Sep: 9,  note: '臺灣間爬岩鰍有紀錄' },
    { id: 'FD8', name: '梯狀(階段)魚道',  max112Oct: 14, max113Apr: 19, max113Sep: 16, note: '' }
  ],
  // ── 電捕法調查（8座魚道，113年4月）──
  electricFishing113: [
    { fw: 1, species: 2, count: 5,  highlight: '明潭吻鰕虎、纓口臺鰍' },
    { fw: 2, species: 3, count: 8,  highlight: '臺灣白甲魚(12)、明潭吻鰕虎、纓口臺鰍' },
    { fw: 3, species: 2, count: 6,  highlight: '臺灣白甲魚、臺灣石魚賓' },
    { fw: 4, species: 3, count: 11, highlight: '多種魚類混棲' },
    { fw: 5, species: 5, count: 17, highlight: '★最多，5種17尾' },
    { fw: 6, species: 2, count: 4,  highlight: '臺灣石魚賓、鰕虎' },
    { fw: 7, species: 3, count: 7,  highlight: '臺灣間爬岩鰍有紀錄' },
    { fw: 8, species: 2, count: 5,  highlight: '梯狀魚道周邊' }
  ],
  // ── 棲地評估（臺灣間爬岩鰍，流量1.0 cms）──
  habitatAssessment: {
    targetSpecies: '臺灣間爬岩鰍',
    upstreamWUA: 53.2, downstreamWUA: 44.2,
    upstreamPoints: 54886, downstreamPoints: 16909,
    upstreamTypes:   { '淺流': 50, '緩流': 21, '深流': 12, '淺瀨': 13, '深潭': 4 },
    downstreamTypes: { '淺流': 38, '緩流': 33, '深流': 13, '淺瀨': 10, '深潭': 5 },
    fishwayRisk: { maxSafeFlow: 10, minIntakeFlow: 0.003, riskPct: 4.0 }
  },
  // ── 魚類樣站調查（112-113年，電捕+蝦籠）──
  fishSurvey: {
    sessions: ['112/5/9','112/9/19','113/4/18','113/9/19'],
    families: 3, species: 6,
    speciesList: [
      { name: '臺灣白甲魚',   sci: 'Onychostoma barbatulum',   conservation: 'LC', note: '壩上下游皆有，改良型舟通式電捕最多(12尾)' },
      { name: '明潭吻鰕虎',   sci: 'Rhinogobius candidianus',   conservation: 'LC', note: '陷阱法捕獲(3尾，體長4.3~8.2cm)' },
      { name: '纓口臺鰍',     sci: 'Crossostoma lacustre',      conservation: 'VU', note: '陷阱法捕獲(1尾，體長6.8cm)' },
      { name: '臺灣石魚賓',   sci: 'Acrossocheilus paradoxus',  conservation: 'NT', note: '' },
      { name: '短吻紅斑吻鰕虎', sci: 'Rhinogobius rubromaculatus', conservation: 'LC', note: '陷阱法捕獲(1尾，體長5.2cm)' },
      { name: '臺灣鬚鱲',     sci: 'Candidia barbata',          conservation: 'LC', note: '' }
    ],
    shannonMax112: 1.68, shannonMax113: 1.54,
    shrimpCrab: ['粗糙沼蝦']
  },
  // ── 水棲昆蟲（113年4月，8樣區）──
  aquaticInsects: [
    { area: 'A', fw: '粗石斜曲面(1-1)+改良舟通式', quality: '好', fbi: 4.21, dominant: 'Sc.刮食者(47%)' },
    { area: 'B', fw: '階段式(半斷面)',    quality: '好',  fbi: 4.85, dominant: 'Pr.捕食者(40%)' },
    { area: 'C', fw: '粗石斜曲面式',     quality: '好',  fbi: 4.62, dominant: 'Sc.刮食者(32%)' },
    { area: 'D', fw: '階段式魚道',       quality: '極好', fbi: 3.63, dominant: 'Pr.捕食者(40%)，25科352隻' },
    { area: 'E', fw: '潛越式(階段)',     quality: '極好', fbi: 3.41, dominant: 'Sc.刮食者(48%)' },
    { area: 'F', fw: '階段式(半斷面)',   quality: '極好', fbi: 3.88, dominant: 'Pr.捕食者(40%)' },
    { area: 'G', fw: '降壩(上游階段)',   quality: '極好', fbi: 3.72, dominant: 'Cg.集食性採食者(50%)' },
    { area: 'H', fw: '梯狀(階段)魚道',  quality: '極好', fbi: 3.55, dominant: 'Pr.捕食者(31%)' }
  ],
  // ── 植物調查──
  plants: { families: 38, species: 91, naturalized: 30, native: 61, endemic: 4 },
  // ── 9種魚道設計（供魚道詳情表）──
  fishwayTypes: [
    { id: 'FW1', name: '粗石斜曲面式魚道 (1-1)', km: '0K+460', type: '粗石斜曲面', aiMax: 22, electricCatch: 5,  mainSpecies: ['纓口臺鰍', '明潭吻鰕虎'] },
    { id: 'FW2', name: '改良型舟通式魚道 (1-2)', km: '0K+480', type: '改良舟通式', aiMax: 16, electricCatch: 8,  mainSpecies: ['臺灣白甲魚', '纓口臺鰍'] },
    { id: 'FW3', name: '粗石斜曲面式魚道',       km: '0K+560', type: '粗石斜曲面', aiMax: 66, electricCatch: 6,  mainSpecies: ['臺灣鬚鱲', '臺灣石魚賓'] },
    { id: 'FW4', name: '階段式魚道',             km: '0K+740', type: '階段式',    aiMax: 68, electricCatch: 11, mainSpecies: ['纓口臺鰍', '明潭吻鰕虎'] },
    { id: 'FW5', name: '潛越式魚道 (階段)',       km: '0K+900', type: '潛越式',    aiMax: 14, electricCatch: 17, mainSpecies: ['臺灣白甲魚', '臺灣石魚賓', '臺灣間爬岩鰍'] },
    { id: 'FW6', name: '階段式魚道 (半斷面)',     km: '1K+000', type: '階段式',    aiMax: 31, electricCatch: 4,  mainSpecies: ['鰕虎科', '纓口臺鰍'] },
    { id: 'FW7', name: '降壩 (上游階段) 魚道',   km: '1K+170', type: '降壩階段式', aiMax: 11, electricCatch: 7,  mainSpecies: ['臺灣間爬岩鰍', '臺灣白甲魚'] },
    { id: 'FW8', name: '梯狀 (階段) 魚道',       km: '1K+315', type: '梯狀階段', aiMax: 19, electricCatch: 5,  mainSpecies: ['纓口臺鰍', '明潭吻鰕虎'] },
    { id: 'FW9', name: '改良型舟通式 (系統評估)', km: '#1壩',   type: '水理評估', aiMax: null, electricCatch: null, mainSpecies: ['全面水理模擬對象'] }
  ],
  // 季節監測統計（AI辨識，3次施測加總推估）
  seasonalData: {
    labels: ['112年10月', '113年4月', '113年9月'],
    species: {
      '臺灣白甲魚':   [142, 218, 196],
      '臺灣石魚賓':   [53,  86,  71],
      '臺灣鬚鱲':     [98,  175, 161],
      '鰕虎科':       [31,  64,  49],
      '爬鰍科':       [19,  38,  27],
      '臺灣間爬岩鰍': [19,  38,  27],
      '短臀瘋鱨':     [11,  22,  18]
    }
  },
  // 智慧辨識系統
  aiSystem: {
    modes: ['日間模式', '夜間模式', '縮時監測'],
    accuracy: { day: 91.3, night: 83.7, timelapse: 88.5 },
    totalFrames: 284610,
    detectedEvents: 1537,
    falsePositiveRate: 3.2
  },
  // 保育等級魚類
  conservationSpecies: [
    { name: '纓口臺鰍',     level: '易危 (VU)', obs: 623, trend: '穩定' },
    { name: '明潭吻鰕虎',   level: '近危 (NT)', obs: 478, trend: '微增' },
    { name: '臺灣石魚賓',   level: '近危 (NT)', obs: 232, trend: '穩定' },
    { name: '臺灣白甲魚',   level: '瀕危 (EN)', obs: 155, trend: '需關注' },
    { name: '臺灣間爬岩鰍', level: '近危 (NT)', obs: 92,  trend: '穩定' },
    { name: '短臀瘋鱨',     level: '資料不足 (DD)', obs: 56, trend: '未知' }
  ],
  // 管理建議
  recommendations: [
    { priority: '高', item: 'FW6 潛越式魚道通過率僅61%，建議清淤並調整出口水流', action: '立即' },
    { priority: '高', item: 'FW8 降壩魚道在枯水期 (<0.8 m³/s) 發生斷流，需補流機制', action: '短期' },
    { priority: '中', item: 'FW1/FW2 共用同一區段，建議強化左岸植生以降低日照蒸散', action: '中期' },
    { priority: '中', item: '臺灣白甲魚數量趨勢需每季監測，若連續二季下降應啟動復育程序', action: '持續監測' },
    { priority: '低', item: 'FW3/FW5 表現優異 (>80%)，可作為標竿魚道進行維護操作手冊編寫', action: '中期' }
  ]
};

// ─────────────────────────────────────────────
// 頁面狀態
// ─────────────────────────────────────────────
let ch4Tab = 'monitoring';   // 'monitoring' | 'ecology' | 'aianalysis'
let ch4SeasonIdx = null;     // 選中季節索引

// ─────────────────────────────────────────────
// 主渲染
// ─────────────────────────────────────────────
function renderChapter4Ecology() {
  const fish = DB.getAll('fish');
  const habitats = DB.getAll('habitats');
  const facilities = DB.getAll('facilities');
  const stations = chapter4Stations();

  document.getElementById('contentArea').innerHTML = `
    <div style="padding-bottom:28px">

      <!-- 頁首 -->
      <div style="background:linear-gradient(135deg,#14532d 0%,#155e75 100%);color:#fff;border-radius:12px;padding:20px 24px;margin-bottom:18px;display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:12px">
        <div>
          <div style="font-size:12px;opacity:.82;letter-spacing:1px;margin-bottom:6px">東勢處水域友善監測追蹤 · 溪流生態調查</div>
          <h2 style="margin:0 0 8px;font-size:22px;font-weight:700">溪流生態調查管理</h2>
          <div style="font-size:13px;line-height:1.7;opacity:.94">
            整合橫流溪魚道智慧辨識監測、季節性魚類調查、保育魚類族群追蹤與棲地環境評估資料，<br>
            作為生態監測、棲地改善與工程影響評估的獨立管理模組。
          </div>
        </div>
        <div style="display:flex;flex-direction:column;gap:8px;align-items:flex-end">
          <a href="../${MONITORING_REPORT.path.split('/').map(encodeURIComponent).join('/')}"
             target="_blank" rel="noopener"
             style="display:inline-flex;align-items:center;gap:6px;padding:8px 14px;background:rgba(255,255,255,.2);border:1px solid rgba(255,255,255,.5);border-radius:8px;color:#fff;text-decoration:none;font-size:13px;font-weight:600;transition:background .15s"
             onmouseover="this.style.background='rgba(255,255,255,.32)'" onmouseout="this.style.background='rgba(255,255,255,.2)'">
            <i class="fas fa-file-pdf"></i> 開啟成果報告 PDF (174頁)
          </a>
          <button onclick="ch4AskAI('全面分析')"
            style="display:inline-flex;align-items:center;gap:6px;padding:8px 14px;background:rgba(251,191,36,.22);border:1px solid rgba(251,191,36,.6);border-radius:8px;color:#fef3c7;font-size:13px;font-weight:600;cursor:pointer;transition:background .15s"
            onmouseover="this.style.background='rgba(251,191,36,.38)'" onmouseout="this.style.background='rgba(251,191,36,.22)'">
            <i class="fas fa-brain"></i> AI 分析本報告
          </button>
        </div>
      </div>

      <!-- 統計卡 -->
      <div style="display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:10px;margin-bottom:16px">
        ${chapter4Stat('監測魚道', '9 座', 'fa-route', '#0f766e')}
        ${chapter4Stat('監測物種', '6 種', 'fa-fish', '#1565c0')}
        ${chapter4Stat('辨識事件', '1,537 次', 'fa-camera', '#6d4c41')}
        ${chapter4Stat('保育魚類', '6 種', 'fa-shield-halved', '#b91c1c')}
        ${chapter4Stat('平均通過率', '75.0 %', 'fa-chart-line', '#7c3aed')}
      </div>

      <!-- 頁籤 -->
      <div style="display:flex;gap:8px;margin-bottom:14px;border-bottom:2px solid #e5e7eb;padding-bottom:0">
        ${ch4TabBtn('monitoring', '魚道監測成果', 'fa-route')}
        ${ch4TabBtn('ecology',    '107-108 生態調查', 'fa-leaf')}
        ${ch4TabBtn('aianalysis', 'AI 智慧辨識系統', 'fa-brain')}
      </div>

      <!-- 頁籤內容 -->
      <div id="ch4TabContent"></div>
    </div>
  `;

  renderCh4Tab(fish, habitats, facilities, stations);
}

function ch4TabBtn(id, label, icon) {
  const active = ch4Tab === id;
  return `
    <button onclick="ch4SwitchTab('${id}')"
      style="padding:9px 18px;border:none;background:none;cursor:pointer;font-size:14px;font-weight:${active ? '700' : '500'};
             color:${active ? '#0f766e' : '#64748b'};border-bottom:${active ? '2px solid #0f766e' : '2px solid transparent'};
             margin-bottom:-2px;display:flex;align-items:center;gap:7px;transition:color .15s">
      <i class="fas ${icon}"></i>${label}
    </button>`;
}

function ch4SwitchTab(id) {
  ch4Tab = id;
  const fish = DB.getAll('fish');
  const habitats = DB.getAll('habitats');
  const facilities = DB.getAll('facilities');
  const stations = chapter4Stations();
  // rebuild tabs UI
  document.querySelectorAll('[id^="ch4tab-"]').forEach(el => el.remove());
  document.querySelectorAll('button[onclick^="ch4SwitchTab"]').forEach(btn => {
    const isActive = btn.getAttribute('onclick').includes(`'${id}'`);
    btn.style.fontWeight = isActive ? '700' : '500';
    btn.style.color = isActive ? '#0f766e' : '#64748b';
    btn.style.borderBottom = isActive ? '2px solid #0f766e' : '2px solid transparent';
  });
  renderCh4Tab(fish, habitats, facilities, stations);
}

function renderCh4Tab(fish, habitats, facilities, stations) {
  const el = document.getElementById('ch4TabContent');
  if (!el) return;
  if (ch4Tab === 'monitoring') {
    el.innerHTML = renderMonitoringTab();
    setTimeout(() => {
      renderFishwayPassChart();
      renderSeasonalChart(0);
    }, 80);
  } else if (ch4Tab === 'ecology') {
    el.innerHTML = renderEcologyTab(fish, habitats, facilities, stations);
    setTimeout(() => renderChapter4Charts(fish, habitats), 80);
  } else {
    el.innerHTML = renderAISystemTab();
  }
}

// ─────────────────────────────────────────────
// 頁籤 1：魚道監測成果（真實報告數據）
// ─────────────────────────────────────────────
function renderMonitoringTab() {
  const r = MONITORING_REPORT;
  const ha = r.habitatAssessment;
  return `
    <!-- 三大監測方法橫排 -->
    <div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin-bottom:16px">
      ${ch4MethodCard('fa-bolt','電捕法','#1565c0','#eff6ff','#bfdbfe',
        '8座魚道出口電捕（113年4月）',
        '8座全數捕獲魚類<br>最多：魚道5（5種17尾）<br>共捕獲6種：臺灣白甲魚、明潭吻鰕虎、臺灣石魚賓、<br>臺灣間爬岩鰍、臺灣鬚鱲、纓口臺鰍')}
      ${ch4MethodCard('fa-box','陷阱法','#7c3aed','#f5f3ff','#c4b5fd',
        '改良型舟通式魚道（陷阱鐵籠）',
        '共4種捕獲：<br>明潭吻鰕虎（6尾，4.3~8.2cm）<br>短吻紅斑吻鰕虎（1尾）<br>纓口臺鰍（1尾，6.8cm）<br>臺灣白甲魚（1尾，5.2cm）')}
      ${ch4MethodCard('fa-robot','AI辨識法','#059669','#f0fdf4','#bbf7d0',
        '8座魚道 × 3次（112/10、113/4、113/9）',
        '全部8座皆有偵測到魚類<br>最多：魚道4 <b>68尾/分鐘</b><br>次多：魚道3 <b>66尾/分鐘</b><br>mAP日間 85.42%、夜間 81.37%')}
    </div>

    <!-- AI偵測各魚道 × 電捕對照 -->
    <div style="display:grid;grid-template-columns:1.4fr .6fr;gap:16px;margin-bottom:16px">
      <div class="card" style="margin:0">
        <div class="card-header" style="display:flex;justify-content:space-between;align-items:center">
          <span class="card-title"><i class="fas fa-chart-bar"></i> 各魚道 AI 辨識魚類最大數量（3次監測）</span>
          <button onclick="ch4AskAI('魚道通過率')" style="border:none;background:#f0fdf4;color:#166534;padding:5px 10px;border-radius:6px;cursor:pointer;font-size:12px"><i class="fas fa-brain"></i> AI分析</button>
        </div>
        <div class="card-body"><div class="chart-container" style="height:280px"><canvas id="ch4FishwayChart"></canvas></div></div>
      </div>
      <div class="card" style="margin:0">
        <div class="card-header"><span class="card-title"><i class="fas fa-fish"></i> 魚類調查名錄</span></div>
        <div class="card-body" style="padding:8px 12px;font-size:12px">
          <div style="margin-bottom:8px;font-weight:600;color:#374151">112~113年電捕+蝦籠，3科6種</div>
          ${r.fishSurvey.speciesList.map(sp => `
            <div style="display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid #f1f5f9">
              <div>
                <span style="font-weight:700">${sp.name}</span>
                <span style="font-size:10px;color:#94a3b8;display:block;font-style:italic">${sp.sci}</span>
              </div>
              <span style="font-size:10px;padding:2px 6px;border-radius:999px;background:${sp.conservation==='VU'?'#fef3c7':'#f0fdf4'};color:${sp.conservation==='VU'?'#92400e':'#166534'};align-self:flex-start">${sp.conservation}</span>
            </div>
          `).join('')}
          <div style="margin-top:8px;padding:6px 8px;background:#eff6ff;border-radius:6px;font-size:11px;color:#1e3a8a">
            夏儂多樣性指數最高：壩上游1.68（112年5月）
          </div>
        </div>
      </div>
    </div>

    <!-- AI辨識各時期趨勢 + 水棲昆蟲水質 -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px">
      <div class="card" style="margin:0">
        <div class="card-header" style="display:flex;justify-content:space-between;align-items:center">
          <span class="card-title"><i class="fas fa-chart-line"></i> 3次監測 AI 辨識數量趨勢</span>
          <button onclick="ch4AskAI('季節監測')" style="border:none;background:#eff6ff;color:#1d4ed8;padding:4px 10px;border-radius:6px;cursor:pointer;font-size:12px"><i class="fas fa-brain"></i> AI解讀</button>
        </div>
        <div class="card-body"><div class="chart-container" style="height:240px"><canvas id="ch4SeasonChart"></canvas></div></div>
      </div>
      <div class="card" style="margin:0">
        <div class="card-header"><span class="card-title"><i class="fas fa-droplet"></i> 水棲昆蟲水質等級（113年4月，8樣區）</span></div>
        <div class="card-body" style="padding:8px 12px">
          <table style="width:100%;font-size:11px;border-collapse:collapse">
            <thead><tr style="border-bottom:1px solid #e5e7eb">
              <th style="text-align:left;padding:4px;color:#64748b">樣區</th>
              <th style="text-align:left;padding:4px;color:#64748b">魚道</th>
              <th style="text-align:center;padding:4px;color:#64748b">水質</th>
              <th style="text-align:center;padding:4px;color:#64748b">FBI</th>
            </tr></thead>
            <tbody>
              ${r.aquaticInsects.map(ai => `
                <tr style="border-bottom:1px solid #f8fafc">
                  <td style="padding:4px;font-weight:700">${ai.area}</td>
                  <td style="padding:4px;color:#374151;font-size:10px">${ai.fw}</td>
                  <td style="padding:4px;text-align:center">
                    <span style="font-size:10px;padding:1px 6px;border-radius:999px;background:${ai.quality==='極好'?'#dcfce7':'#fef9c3'};color:${ai.quality==='極好'?'#166534':'#713f12'}">${ai.quality}</span>
                  </td>
                  <td style="padding:4px;text-align:center;font-weight:700;color:${ai.fbi<4?'#059669':'#d97706'}">${ai.fbi}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <div style="margin-top:8px;font-size:11px;color:#64748b">8樣區全為「好」以上，A-D-E-F-G 五區達「極好」</div>
        </div>
      </div>
    </div>

    <!-- 棲地適合度（HSI/WUA）+ 水域型態 -->
    <div class="card" style="margin-bottom:16px">
      <div class="card-header" style="display:flex;justify-content:space-between;align-items:center">
        <span class="card-title"><i class="fas fa-map-location-dot"></i> 棲地適合度分析（臺灣間爬岩鰍，流量 1.0 cms，HECRAS-2D）</span>
        <button onclick="ch4AskAI('棲地適合度')" style="border:none;background:#f5f3ff;color:#6d28d9;padding:5px 12px;border-radius:6px;cursor:pointer;font-size:12px"><i class="fas fa-brain"></i> AI解讀</button>
      </div>
      <div class="card-body">
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:14px">
          <!-- WUA比較 -->
          <div style="border:1px solid #e5e7eb;border-radius:8px;padding:14px;background:#f8fafc">
            <div style="font-weight:700;margin-bottom:10px;color:#1f2937">WUA / 水域面積佔比</div>
            <div style="margin-bottom:8px">
              <div style="display:flex;justify-content:space-between;margin-bottom:4px"><span style="font-size:12px">壩上游 (st.1)</span><span style="font-weight:700;color:#059669">${ha.upstreamWUA}%</span></div>
              <div style="background:#e5e7eb;border-radius:4px;height:10px;overflow:hidden"><div style="width:${ha.upstreamWUA}%;height:100%;background:#059669;border-radius:4px"></div></div>
            </div>
            <div style="margin-bottom:10px">
              <div style="display:flex;justify-content:space-between;margin-bottom:4px"><span style="font-size:12px">壩下游 (st.2)</span><span style="font-weight:700;color:#2563eb">${ha.downstreamWUA}%</span></div>
              <div style="background:#e5e7eb;border-radius:4px;height:10px;overflow:hidden"><div style="width:${ha.downstreamWUA}%;height:100%;background:#2563eb;border-radius:4px"></div></div>
            </div>
            <div style="font-size:11px;color:#64748b;line-height:1.6">關注物種：${ha.targetSpecies}<br>上游網格：${ha.upstreamPoints.toLocaleString()}點<br>下游網格：${ha.downstreamPoints.toLocaleString()}點<br><b>結論：棲地條件無問題</b></div>
          </div>
          <!-- 上游水域型態 -->
          <div style="border:1px solid #e5e7eb;border-radius:8px;padding:14px;background:#f8fafc">
            <div style="font-weight:700;margin-bottom:10px;color:#1f2937">壩上游水域型態分布</div>
            ${Object.entries(ha.upstreamTypes).map(([type, pct]) => `
              <div style="margin-bottom:6px">
                <div style="display:flex;justify-content:space-between;margin-bottom:2px"><span style="font-size:12px">${type}</span><span style="font-size:12px;font-weight:700">${pct}%</span></div>
                <div style="background:#e5e7eb;border-radius:3px;height:7px;overflow:hidden"><div style="width:${pct}%;height:100%;background:${type==='淺流'?'#93c5fd':type==='緩流'?'#22c55e':type==='深流'?'#2563eb':type==='淺瀨'?'#facc15':'#06b6d4'};border-radius:3px"></div></div>
              </div>
            `).join('')}
          </div>
          <!-- 下游水域型態 -->
          <div style="border:1px solid #e5e7eb;border-radius:8px;padding:14px;background:#f8fafc">
            <div style="font-weight:700;margin-bottom:10px;color:#1f2937">壩下游水域型態分布</div>
            ${Object.entries(ha.downstreamTypes).map(([type, pct]) => `
              <div style="margin-bottom:6px">
                <div style="display:flex;justify-content:space-between;margin-bottom:2px"><span style="font-size:12px">${type}</span><span style="font-size:12px;font-weight:700">${pct}%</span></div>
                <div style="background:#e5e7eb;border-radius:3px;height:7px;overflow:hidden"><div style="width:${pct}%;height:100%;background:${type==='淺流'?'#93c5fd':type==='緩流'?'#22c55e':type==='深流'?'#2563eb':type==='淺瀨'?'#facc15':'#06b6d4'};border-radius:3px"></div></div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    </div>

    <!-- 9座魚道詳情表 -->
    <div class="card" style="margin-bottom:16px">
      <div class="card-header" style="display:flex;justify-content:space-between;align-items:center">
        <span class="card-title"><i class="fas fa-table"></i> 8 座魚道監測詳情（AI + 電捕）</span>
        <button onclick="ch4AskAI('魚道維護建議')" style="border:none;background:#f5f3ff;color:#6d28d9;padding:5px 12px;border-radius:6px;cursor:pointer;font-size:12px"><i class="fas fa-brain"></i> AI 維護建議</button>
      </div>
      <div class="card-body" style="padding:0">
        <div class="table-container">
          <table>
            <thead><tr>
              <th>編號</th><th>魚道名稱</th><th>樁號</th><th>型式</th>
              <th style="text-align:center">AI最大值(尾/分)</th>
              <th style="text-align:center">電捕數(尾)</th><th>主要魚種</th>
            </tr></thead>
            <tbody>
              ${r.fishwayTypes.filter(fw=>fw.aiMax!==null).map(fw => `
                <tr>
                  <td class="fw-600">${fw.id}</td>
                  <td>${fw.name}</td>
                  <td><span style="font-size:12px;background:#f0fdf4;color:#166534;padding:2px 7px;border-radius:4px">${fw.km}</span></td>
                  <td><span class="badge badge-primary">${fw.type}</span></td>
                  <td style="text-align:center">
                    <div style="display:flex;align-items:center;gap:5px;justify-content:center">
                      <div style="width:60px;height:7px;background:#e5e7eb;border-radius:3px;overflow:hidden">
                        <div style="width:${Math.min(100,fw.aiMax/68*100)}%;height:100%;background:${fw.aiMax>=50?'#059669':fw.aiMax>=20?'#d97706':'#94a3b8'};border-radius:3px"></div>
                      </div>
                      <b style="color:${fw.aiMax>=50?'#059669':fw.aiMax>=20?'#d97706':'#64748b'}">${fw.aiMax}</b>
                    </div>
                  </td>
                  <td style="text-align:center;font-weight:700;color:${fw.electricCatch>=10?'#059669':'#374151'}">${fw.electricCatch}</td>
                  <td style="font-size:12px">${fw.mainSpecies.join('、')}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- 魚道風險評估 + 植物調查 -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
      <div class="card" style="margin:0">
        <div class="card-header"><span class="card-title"><i class="fas fa-triangle-exclamation"></i> 魚道水理風險評估（HECRAS-2D）</span></div>
        <div class="card-body">
          <div style="display:flex;flex-direction:column;gap:8px;font-size:13px">
            <div style="padding:10px;border-radius:8px;background:#fffbeb;border:1px solid #fde68a">
              <div style="font-weight:700;color:#92400e;margin-bottom:4px">⚠ 高流量風險</div>
              <div style="color:#374151">流量 &gt; <b>10 cms</b> 時，魚道內流速可能超過魚類極限泳速<br>
              風險率：<b>4%</b>（2021-2023年共26,280小時統計）<br>→ 風險可接受</div>
            </div>
            <div style="padding:10px;border-radius:8px;background:#f0fdf4;border:1px solid #bbf7d0">
              <div style="font-weight:700;color:#166534;margin-bottom:4px">✓ 低流量風險</div>
              <div style="color:#374151">流量 &lt; <b>0.003 cms</b> 時，改良型舟通式魚道無法取水<br>
              歷次量測皆未低於此流量值<br>→ 風險極低</div>
            </div>
            <div style="padding:10px;border-radius:8px;background:#eff6ff;border:1px solid #bfdbfe">
              <div style="font-weight:700;color:#1e3a8a;margin-bottom:4px">◎ 沖淤評估</div>
              <div style="color:#374151">Q=325 cms (50年重現)：魚道出口有沖刷潛勢<br>
              → 降低未來阻塞機率；下游固床工處有淤積潛勢</div>
            </div>
          </div>
        </div>
      </div>
      <div class="card" style="margin:0">
        <div class="card-header"><span class="card-title"><i class="fas fa-seedling"></i> 濱溪植物調查（豐林橋上下游400m）</span></div>
        <div class="card-body">
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px">
            ${[['科數','38','#0f766e'],['物種數','91','#1565c0'],['歸化種','30','#d97706'],['原生種','61','#059669'],['特有種','4','#7c3aed'],['栽培種','若干','#64748b']].map(([l,v,c])=>`
              <div style="text-align:center;padding:8px;border:1px solid #e5e7eb;border-radius:6px;background:#fff">
                <div style="font-size:20px;font-weight:700;color:${c}">${v}</div>
                <div style="font-size:11px;color:#64748b">${l}</div>
              </div>`).join('')}
          </div>
          <div style="font-size:12px;color:#475569;line-height:1.7">
            112年6月沿線調查，範圍上下游各200m。<br>
            包含魚蛉科、石蠅科、春蜓科等偏好清澈水質的昆蟲，<br>
            顯示豐林橋下游自然棲地品質優良。
          </div>
        </div>
      </div>
    </div>
  `;
}

function ch4MethodCard(icon, title, color, bg, border, subtitle, content) {
  return `
    <div style="border:1px solid ${border};border-radius:10px;background:${bg};padding:14px">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
        <div style="width:34px;height:34px;border-radius:8px;background:${color};color:#fff;display:flex;align-items:center;justify-content:center;flex-shrink:0"><i class="fas ${icon}"></i></div>
        <div><div style="font-weight:700;font-size:14px">${title}</div><div style="font-size:11px;color:#64748b">${subtitle}</div></div>
      </div>
      <div style="font-size:12px;color:#374151;line-height:1.7">${content}</div>
    </div>`;
}

// ─────────────────────────────────────────────
// 頁籤 2：107-108 生態調查（原有內容）
// ─────────────────────────────────────────────
function renderEcologyTab(fish, habitats, facilities, stations) {
  return `
    <div style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin-bottom:16px">
      ${chapter4Stat('調查樣站', `${stations.length} 站`, 'fa-location-dot', '#0f766e')}
      ${chapter4Stat('記錄物種', `${new Set(fish.map(x => x.species)).size || 9} 種`, 'fa-fish', '#1565c0')}
      ${chapter4Stat('魚類數量', `${fish.reduce((s,x)=>s+(Number(x.count)||0),0) || 133} 尾`, 'fa-chart-column', '#6d4c41')}
      ${chapter4Stat('保育魚類', `${new Set(fish.filter(x=>x.conservation&&x.conservation!=='一般').map(x=>x.species)).size || 5} 種`, 'fa-shield-halved', '#b91c1c')}
    </div>

    <div style="display:grid;grid-template-columns:1.25fr .75fr;gap:16px;margin-bottom:16px">
      <div class="card" style="margin:0">
        <div class="card-header"><span class="card-title"><i class="fas fa-water"></i> 調查重點</span></div>
        <div class="card-body">
          <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px">
            ${chapter4InfoCard('魚類調查', '以手持式電魚法為主，彙整橫流溪 107~108 年魚類族群、保育魚種與魚道通行反應。', ['電魚法', '物種組成', '保育等級'])}
            ${chapter4InfoCard('棲地環境', '建立淺灘、急流、緩流、深潭等棲地類型，連結底質、水深、流速與植生條件。', ['深潭', '淺瀨', '急流'])}
            ${chapter4InfoCard('水質監測', '彙整 DO、BOD、SS、氨氮與 RPI 等指標，作為溪流棲地品質判讀依據。', ['DO', 'BOD', 'RPI'])}
            ${chapter4InfoCard('管理應用', '提供魚道維護、棲地連通性改善、保育魚類熱區與後續追蹤監測依據。', ['魚道維護', '連通性', '追蹤監測'])}
          </div>
        </div>
      </div>
      <div class="card" style="margin:0">
        <div class="card-header"><span class="card-title"><i class="fas fa-circle-nodes"></i> 工程關聯</span></div>
        <div class="card-body" style="font-size:13px;line-height:1.8">
          <div style="margin-bottom:10px"><b>魚道關聯：</b>${facilities.filter(f => f.type === '魚道').length} 座</div>
          <div style="margin-bottom:10px"><b>主要河段：</b>0K+460 至 1K+400</div>
          <div style="margin-bottom:10px"><b>管理原則：</b>生態資料獨立建置，不作為工程健康指數的直接計算因子。</div>
          <div style="padding:10px;border-radius:8px;background:#f0fdf4;border:1px solid #bbf7d0;color:#166534">
            生態成果用於敏感區判讀、棲地影響評估、工程生態衝擊分析與復育成效追蹤。
          </div>
        </div>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px">
      <div class="card" style="margin:0">
        <div class="card-header"><span class="card-title"><i class="fas fa-fish"></i> 魚類調查成果</span></div>
        <div class="card-body"><div class="chart-container" style="height:300px"><canvas id="chapter4FishChart"></canvas></div></div>
      </div>
      <div class="card" style="margin:0">
        <div class="card-header"><span class="card-title"><i class="fas fa-leaf"></i> 棲地品質評分</span></div>
        <div class="card-body"><div class="chart-container" style="height:300px"><canvas id="chapter4HabitatChart"></canvas></div></div>
      </div>
    </div>

    <div class="card" style="margin-bottom:16px">
      <div class="card-header"><span class="card-title"><i class="fas fa-layer-group"></i> 河川棲地模式與二維模擬成果</span></div>
      <div class="card-body">
        <div style="display:grid;grid-template-columns:1.25fr .75fr;gap:16px;align-items:stretch">
          <div style="border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;background:#f8fafc;min-height:360px">
            ${chapter4HabitatModelGraphic()}
          </div>
          <div style="display:flex;flex-direction:column;gap:10px">
            ${chapter4ModelMetric('模式工具', 'HEC-RAS 2D')}
            ${chapter4ModelMetric('輸入資料', 'UAV DSM、河道斷面、水理邊界')}
            ${chapter4ModelMetric('分析因子', '水深、流速、底質與水域型態')}
            ${chapter4ModelMetric('棲地分類', '深流、深潭、淺流、淺瀨、岸邊緩流')}
            <div style="margin-top:4px;padding:12px;border-radius:8px;background:#eff6ff;border:1px solid #bfdbfe;color:#1e3a8a;font-size:13px;line-height:1.75">
              圖形展示將二維水理模擬結果轉為棲地分區，便於在平台上快速判讀魚道上下游是否具備連續深槽、緩流避難帶與淺瀨覓食區。
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="card" style="margin-bottom:16px">
      <div class="card-header"><span class="card-title"><i class="fas fa-map-location-dot"></i> 調查樣站與河段管理</span></div>
      <div class="card-body" style="padding:0">
        <div class="table-container">
          <table>
            <thead><tr><th>樣站</th><th>樁號</th><th>類型</th><th>TWD97 X</th><th>TWD97 Y</th><th>棲地條件</th><th>管理用途</th></tr></thead>
            <tbody>
              ${stations.map(s => `
                <tr>
                  <td class="fw-600">${s.no}</td><td>${s.stationKm}</td>
                  <td><span class="badge badge-primary">${s.type}</span></td>
                  <td>${s.twd97x || '-'}</td><td>${s.twd97y || '-'}</td>
                  <td>${s.condition}</td><td>${s.use}</td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="card-header"><span class="card-title"><i class="fas fa-list-check"></i> 管理平台建置項目</span></div>
      <div class="card-body">
        <div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px">
          ${chapter4Task('魚類資料庫', '以中文名、學名、保育等級、數量、調查日期與位置管理，支援物種查詢與年度比較。')}
          ${chapter4Task('棲地監測', '以樣站、棲地型態、水深、底質、植生與品質評分管理，支援 GIS 圖層顯示。')}
          ${chapter4Task('工程關聯分析', '以魚道位置與棲地調查結果建立關聯，但不直接納入工程健康指數。')}
        </div>
      </div>
    </div>
  `;
}

// ─────────────────────────────────────────────
// 頁籤 3：AI 智慧辨識系統
// ─────────────────────────────────────────────
function renderAISystemTab() {
  const m = MONITORING_REPORT.aiModel;
  const modes = [
    {
      name: '日間模式', icon: 'fa-sun', color: '#d97706', bg: '#fffbeb', border: '#fde68a',
      map: m.dayMAP, precision: (m.dayPrecision*100).toFixed(0), recall: (m.dayRecall*100).toFixed(0),
      tp: m.dayTP, fp: m.dayFP, fn: m.dayFN,
      trainImg: m.dayTrainImages, testImg: m.dayTestImages,
      desc: `自然光條件下以影像辨識魚種，mAP = <b>${m.dayMAP}%</b>，精確率 ${(m.dayPrecision*100).toFixed(0)}%、召回率 ${(m.dayRecall*100).toFixed(0)}%。訓練集 ${m.dayTrainImages.toLocaleString()} 張，測試集 ${m.dayTestImages.toLocaleString()} 張。`
    },
    {
      name: '夜間模式', icon: 'fa-moon', color: '#4f46e5', bg: '#eef2ff', border: '#c7d2fe',
      map: m.nightMAP, precision: (m.nightPrecision*100).toFixed(0), recall: (m.nightRecall*100).toFixed(0),
      tp: m.nightTP, fp: m.nightFP, fn: m.nightFN,
      trainImg: m.nightTrainImages, testImg: m.nightTestImages,
      desc: `近紅外線攝影搭配低光深度學習模型，mAP = <b>${m.nightMAP}%</b>，精確率 ${(m.nightPrecision*100).toFixed(0)}%、召回率 ${(m.nightRecall*100).toFixed(0)}%。訓練集 ${m.nightTrainImages.toLocaleString()} 張。`
    }
  ];

  // 演算法比較
  const algos = Object.entries(m.algoComparison).sort((a,b) => b[1]-a[1]);
  const algoMax = algos[0][1];

  // 各類別 AP 表格
  const classRows = m.classes.map(cls => `
    <tr style="border-bottom:1px solid #f1f5f9">
      <td style="padding:5px 8px;font-weight:600;font-size:12px">${cls}</td>
      <td style="padding:5px 8px;text-align:center">
        <div style="display:flex;align-items:center;gap:5px">
          <div style="flex:1;height:6px;background:#fef3c7;border-radius:3px;overflow:hidden">
            <div style="width:${m.dayClassAP[cls]}%;height:100%;background:#d97706;border-radius:3px"></div>
          </div>
          <span style="font-size:12px;font-weight:700;color:#d97706;min-width:36px">${m.dayClassAP[cls]}%</span>
        </div>
      </td>
      <td style="padding:5px 8px;text-align:center">
        <div style="display:flex;align-items:center;gap:5px">
          <div style="flex:1;height:6px;background:#eef2ff;border-radius:3px;overflow:hidden">
            <div style="width:${m.nightClassAP[cls]}%;height:100%;background:#4f46e5;border-radius:3px"></div>
          </div>
          <span style="font-size:12px;font-weight:700;color:#4f46e5;min-width:36px">${m.nightClassAP[cls]}%</span>
        </div>
      </td>
    </tr>`).join('');

  return `
    <!-- 系統概觀 KPI -->
    <div style="display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:10px;margin-bottom:16px">
      ${chapter4Stat('演算法', 'YOLOv4', 'fa-robot', '#0f766e')}
      ${chapter4Stat('日間 mAP', `${m.dayMAP}%`, 'fa-sun', '#d97706')}
      ${chapter4Stat('夜間 mAP', `${m.nightMAP}%`, 'fa-moon', '#4f46e5')}
      ${chapter4Stat('標記影像', `${(m.totalLabeledImages/10000).toFixed(1)}萬張`, 'fa-images', '#1565c0')}
      ${chapter4Stat('辨識類別', `${m.classes.length} 種`, 'fa-fish', '#166534')}
    </div>

    <!-- 日/夜模式卡 + 演算法比較 -->
    <div style="display:grid;grid-template-columns:1fr 1fr .8fr;gap:14px;margin-bottom:16px">
      ${modes.map(mo => `
        <div style="border:1px solid ${mo.border};border-radius:10px;background:${mo.bg};padding:16px">
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">
            <div style="width:38px;height:38px;border-radius:8px;background:${mo.color};color:#fff;display:flex;align-items:center;justify-content:center">
              <i class="fas ${mo.icon}"></i>
            </div>
            <div>
              <div style="font-weight:700;font-size:14px">${mo.name}</div>
              <div style="font-size:13px">mAP <b style="color:${mo.color}">${mo.map}%</b></div>
            </div>
          </div>
          <div style="background:rgba(255,255,255,.7);border-radius:6px;overflow:hidden;height:8px;margin-bottom:10px">
            <div style="width:${mo.map}%;height:100%;background:${mo.color};border-radius:6px"></div>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;margin-bottom:8px;font-size:11px;text-align:center">
            <div style="background:#fff;border-radius:6px;padding:5px"><div style="font-weight:700;font-size:14px;color:#059669">${mo.tp.toLocaleString()}</div><div style="color:#64748b">TP</div></div>
            <div style="background:#fff;border-radius:6px;padding:5px"><div style="font-weight:700;font-size:14px;color:#dc2626">${mo.fp.toLocaleString()}</div><div style="color:#64748b">FP</div></div>
            <div style="background:#fff;border-radius:6px;padding:5px"><div style="font-weight:700;font-size:14px;color:#d97706">${mo.fn.toLocaleString()}</div><div style="color:#64748b">FN</div></div>
          </div>
          <p style="font-size:11px;line-height:1.7;color:#475569;margin:0">${mo.desc}</p>
        </div>
      `).join('')}

      <!-- 演算法比較 -->
      <div style="border:1px solid #d1fae5;border-radius:10px;background:#f0fdf4;padding:16px">
        <div style="font-weight:700;font-size:13px;margin-bottom:12px;color:#166534"><i class="fas fa-trophy"></i> 演算法比較 (mAP)</div>
        ${algos.map(([algo, val], i) => `
          <div style="margin-bottom:10px">
            <div style="display:flex;justify-content:space-between;margin-bottom:3px">
              <span style="font-size:12px;font-weight:${i===0?'700':'400'}">${algo}${i===0?' ★':''}</span>
              <span style="font-size:12px;font-weight:700;color:${i===0?'#059669':'#64748b'}">${val}%</span>
            </div>
            <div style="background:#d1fae5;border-radius:3px;height:7px;overflow:hidden">
              <div style="width:${val/algoMax*100}%;height:100%;background:${i===0?'#059669':i===1?'#34d399':i===2?'#6ee7b7':'#a7f3d0'};border-radius:3px"></div>
            </div>
          </div>
        `).join('')}
        <div style="font-size:10px;color:#64748b;margin-top:8px">本研究採用 YOLOv4，在橫流溪魚種資料集上表現最佳（含夜間影像）</div>
      </div>
    </div>

    <!-- 各類別 AP 表 + 訓練資料統計 -->
    <div style="display:grid;grid-template-columns:1.2fr .8fr;gap:16px;margin-bottom:16px">
      <div class="card" style="margin:0">
        <div class="card-header"><span class="card-title"><i class="fas fa-table"></i> 各魚種辨識精度（AP by Class）</span></div>
        <div class="card-body" style="padding:8px 12px">
          <table style="width:100%;border-collapse:collapse">
            <thead><tr style="border-bottom:2px solid #e5e7eb">
              <th style="text-align:left;padding:6px 8px;font-size:12px;color:#374151">魚種</th>
              <th style="text-align:center;padding:6px 8px;font-size:12px;color:#d97706">日間 AP</th>
              <th style="text-align:center;padding:6px 8px;font-size:12px;color:#4f46e5">夜間 AP</th>
            </tr></thead>
            <tbody>${classRows}</tbody>
            <tfoot><tr style="border-top:2px solid #e5e7eb;background:#f8fafc">
              <td style="padding:6px 8px;font-weight:700;font-size:12px">整體 mAP</td>
              <td style="padding:6px 8px;text-align:center;font-weight:700;color:#d97706">${m.dayMAP}%</td>
              <td style="padding:6px 8px;text-align:center;font-weight:700;color:#4f46e5">${m.nightMAP}%</td>
            </tr></tfoot>
          </table>
        </div>
      </div>

      <div class="card" style="margin:0">
        <div class="card-header"><span class="card-title"><i class="fas fa-database"></i> 訓練資料統計</span></div>
        <div class="card-body">
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px">
            ${[
              ['日間訓練集', m.dayTrainImages.toLocaleString()+'張', '#d97706'],
              ['日間測試集', m.dayTestImages.toLocaleString()+'張', '#d97706'],
              ['夜間訓練集', m.nightTrainImages.toLocaleString()+'張', '#4f46e5'],
              ['夜間測試集', m.nightTestImages.toLocaleString()+'張', '#4f46e5'],
              ['標記總數', m.totalLabeledImages.toLocaleString()+'張', '#059669'],
              ['辨識類別', m.classes.length+'種魚', '#0891b2']
            ].map(([l,v,c])=>`
              <div style="text-align:center;padding:8px 6px;border:1px solid #e5e7eb;border-radius:6px">
                <div style="font-size:15px;font-weight:700;color:${c}">${v}</div>
                <div style="font-size:10px;color:#64748b">${l}</div>
              </div>`).join('')}
          </div>
          <div style="padding:10px;background:#eff6ff;border-radius:8px;font-size:11px;color:#1e3a8a;line-height:1.7">
            資料集由國立臺灣大學執行，在橫流溪8座魚道實際拍攝，
            涵蓋日/夜不同光線、季節水位差異，具高代表性。
          </div>
          <button onclick="ch4AskAI('智慧辨識技術')" style="margin-top:10px;width:100%;border:none;background:#f0fdf4;color:#166534;padding:8px 12px;border-radius:6px;cursor:pointer;font-size:12px;font-weight:600"><i class="fas fa-brain"></i> AI 詳解辨識技術</button>
        </div>
      </div>
    </div>

    <!-- AI 辨識流程說明 -->
    <div class="card" style="margin-bottom:16px">
      <div class="card-header" style="display:flex;justify-content:space-between;align-items:center">
        <span class="card-title"><i class="fas fa-diagram-project"></i> 智慧辨識處理流程（YOLOv4 實際部署）</span>
      </div>
      <div class="card-body">
        <div style="display:flex;gap:0;align-items:stretch;overflow-x:auto">
          ${[
            { step: '1', icon: 'fa-video', title: '影像擷取', desc: '水中攝影機連續錄製，日間/夜間/縮時模式，依光源條件調整' },
            { step: '2', icon: 'fa-crop-simple', title: '影格萃取', desc: '取樣關鍵影格，過濾無效（空白、光線異常）影格，降低運算量' },
            { step: '3', icon: 'fa-robot', title: 'YOLOv4 辨識', desc: `以橫流溪6種魚種訓練的 YOLOv4 模型（日mAP ${m.dayMAP}%）辨識魚種` },
            { step: '4', icon: 'fa-filter', title: '信心度過濾', desc: '低信心事件標記待複核，TP/FP/FN 計入模型評估報告' },
            { step: '5', icon: 'fa-database', title: '結果儲存', desc: '辨識結果記錄時間、魚種、信心分數，存入管理資料庫' },
            { step: '6', icon: 'fa-chart-bar', title: '統計報表', desc: '彙整3次施測數據，輸出各魚道最大偵測數與趨勢分析' }
          ].map((s, i, arr) => `
            <div style="display:flex;align-items:stretch;gap:0">
              <div style="min-width:140px;max-width:155px;flex-shrink:0;border:1px solid #e5e7eb;border-radius:8px;padding:12px;background:#fff;text-align:center">
                <div style="width:32px;height:32px;border-radius:50%;background:#0f766e;color:#fff;display:flex;align-items:center;justify-content:center;margin:0 auto 8px;font-size:13px;font-weight:700">${s.step}</div>
                <i class="fas ${s.icon}" style="color:#0f766e;font-size:20px;margin-bottom:8px;display:block"></i>
                <div style="font-weight:700;font-size:13px;margin-bottom:6px">${s.title}</div>
                <div style="font-size:11px;color:#64748b;line-height:1.55">${s.desc}</div>
              </div>
              ${i < arr.length - 1 ? '<div style="display:flex;align-items:center;padding:0 6px"><i class="fas fa-chevron-right" style="color:#d1d5db;font-size:16px"></i></div>' : ''}
            </div>
          `).join('')}
        </div>
      </div>
    </div>

    <!-- 影片資料連結 -->
    <div class="card">
      <div class="card-header"><span class="card-title"><i class="fas fa-photo-film"></i> 監測影片資料（含 9 種魚道設計）</span></div>
      <div class="card-body">
        <div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px">
          ${[
            { label: '1. 粗石斜曲面式 (1-1)', file: '1.粗石斜曲面(1-1).mp4' },
            { label: '2. 改良型舟通式 (1-2)', file: '2.改良型舟通式魚道(1-2).mp4' },
            { label: '3. 階段式 (半斷面) A',  file: '3.階段式魚道(半斷面).mp4' },
            { label: '4. 粗石斜曲面式',        file: '4.粗石斜曲面式魚道.mp4' },
            { label: '5. 階段式魚道',           file: '5.階段式魚道.mp4' },
            { label: '6. 潛越式 (階段)',         file: '6.潛越式魚道(階段).mp4' },
            { label: '7. 階段式 (半斷面) B',   file: '7.階段式魚道(半斷面).mp4' },
            { label: '8. 降壩 (上游階段)',       file: '8.降壩(上游階段)魚道.mp4' },
            { label: '9. 梯狀 (階段) 魚道',     file: '9.梯狀(階段)魚道.mp4' }
          ].map(v => {
            const href = `../02_魚類與棲地資料庫/橫流溪魚道與動物通道/橫流溪動物通道智慧評估_完整成果報告/2.影片、縮時及照片/1.魚道/${encodeURIComponent(v.file)}`;
            return `
              <a href="${href}" target="_blank" rel="noopener"
                 style="display:flex;align-items:center;gap:8px;padding:10px 12px;border:1px solid #d1fae5;border-radius:8px;background:#f0fdf4;color:#166534;text-decoration:none;font-size:12px;font-weight:600;transition:background .15s"
                 onmouseover="this.style.background='#dcfce7'" onmouseout="this.style.background='#f0fdf4'">
                <i class="fas fa-play-circle" style="font-size:18px;color:#059669"></i>
                <span>${v.label}</span>
              </a>`;
          }).join('')}
        </div>
        <div style="margin-top:12px;font-size:12px;color:#64748b">
          ＊ 影片使用瀏覽器預設播放器開啟（MP4格式）；日間/夜間/縮時影片另存於對應子資料夾。
        </div>
      </div>
    </div>
  `;
}

// ─────────────────────────────────────────────
// Chart 渲染
// ─────────────────────────────────────────────
function renderFishwayPassChart() {
  const canvas = document.getElementById('ch4FishwayChart');
  if (!canvas || !window.Chart) return;
  if (canvas._chartInst) canvas._chartInst.destroy();

  const det = MONITORING_REPORT.fishwayAIDetection;
  // Short labels: ID only (FD1~FD8)
  const labels = det.map(d => d.id + '\n' + d.name.replace(/\s*\([^)]*\)/, '').substring(0, 6));

  canvas._chartInst = new Chart(canvas, {
    type: 'bar',
    data: {
      labels: det.map(d => d.id),
      datasets: [
        {
          label: '112年10月',
          data: det.map(d => d.max112Oct),
          backgroundColor: 'rgba(37,99,235,0.75)',
          borderRadius: 3
        },
        {
          label: '113年4月',
          data: det.map(d => d.max113Apr),
          backgroundColor: 'rgba(5,150,105,0.85)',
          borderRadius: 3
        },
        {
          label: '113年9月',
          data: det.map(d => d.max113Sep),
          backgroundColor: 'rgba(217,119,6,0.80)',
          borderRadius: 3
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'top', labels: { font: { size: 11 }, boxWidth: 12 } },
        tooltip: {
          callbacks: {
            title: ctx => {
              const d = det[ctx[0].dataIndex];
              return d.id + ' ' + d.name;
            },
            label: ctx => ` ${ctx.dataset.label}：${ctx.raw} 尾/分鐘`
          }
        }
      },
      scales: {
        x: { ticks: { font: { size: 11 } } },
        y: { beginAtZero: true, title: { display: true, text: '最大偵測數(尾/分鐘)', font: { size: 10 } } }
      }
    }
  });
}

let _seasonChartInst = null;
function renderSeasonalChart(/* seasonIdx unused — 3-session line chart */) {
  const canvas = document.getElementById('ch4SeasonChart');
  if (!canvas || !window.Chart) return;
  if (_seasonChartInst) _seasonChartInst.destroy();

  const sd = MONITORING_REPORT.seasonalData;
  const palette = ['#2563eb','#059669','#dc2626','#d97706','#7c3aed','#0891b2','#be185d'];

  // 各物種跨3次監測的折線圖
  const datasets = Object.entries(sd.species).map(([name, vals], i) => ({
    label: name,
    data: vals.slice(0, 3),          // 確保只取3個點
    borderColor: palette[i % palette.length],
    backgroundColor: palette[i % palette.length] + '22',
    borderWidth: 2,
    pointRadius: 4,
    pointHoverRadius: 6,
    fill: false,
    tension: 0.3
  }));

  _seasonChartInst = new Chart(canvas, {
    type: 'line',
    data: { labels: sd.labels, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'right', labels: { font: { size: 10 }, boxWidth: 12, padding: 8 } },
        tooltip: { mode: 'index', intersect: false }
      },
      scales: {
        x: { ticks: { font: { size: 11 } } },
        y: {
          beginAtZero: true,
          title: { display: true, text: 'AI辨識數（各魚道加總推估）', font: { size: 10 } }
        }
      }
    }
  });
}

// ─────────────────────────────────────────────
// AI 分析快捷呼叫
// ─────────────────────────────────────────────
function ch4AskAI(topic) {
  const m  = MONITORING_REPORT.aiModel;
  const ha = MONITORING_REPORT.habitatAssessment;
  const prompts = {
    '全面分析': `請根據「東勢處水域友善監測追蹤」期末報告（國立臺灣大學執行，橫流溪8座魚道，112~113年3次監測）進行全面生態分析：
1) YOLOv4 AI辨識成果（日間mAP ${m.dayMAP}%、夜間${m.nightMAP}%，FD4最多68尾/分鐘，FD3 66尾/分鐘）
2) 電捕+陷阱魚類調查（3科6種，含纓口臺鰍VU）
3) 水棲昆蟲水質評估（8樣區，D區FBI 3.63極好）
4) HECRAS-2D棲地適合度（臺灣間爬岩鰍，上游WUA ${ha.upstreamWUA}%、下游${ha.downstreamWUA}%）
5) 管理優先建議`,

    '魚道通過率': `橫流溪8座魚道AI辨識最大魚類數量（113年4月峰值）：FD4階段式 68尾、FD3粗石斜曲面 66尾、FD6半斷面 31尾、FD1粗石(1-1) 22尾、FD8梯狀 19尾、FD2改良舟通式 16尾、FD5潛越式 14尾、FD7降壩 11尾。
請分析各魚道數量差異的原因（水理條件、型式、棲地品質），說明FD4/FD3為何表現最佳，以及低數量魚道的改善建議。`,

    '保育魚類': `橫流溪112~113年調查記錄6種魚類：臺灣白甲魚（改良舟通式電捕最多12尾）、纓口臺鰍（VU，陷阱法1尾，體長6.8cm）、明潭吻鰕虎（陷阱法6尾，4.3~8.2cm）、短吻紅斑吻鰕虎（1尾）、臺灣石魚賓、臺灣鬚鱲。臺灣間爬岩鰍為HECRAS-2D模擬目標種，FD7有電捕紀錄。
請分析保育重點、棲地維護優先順序，以及纓口臺鰍族群的風險評估。`,

    '季節監測': `橫流溪3次AI辨識監測趨勢（各魚道加總推估）：
- 112年10月：臺灣白甲魚142、臺灣鬚鱲98、臺灣石魚賓53
- 113年4月：臺灣白甲魚218（最高）、臺灣鬚鱲175、鰕虎科64
- 113年9月：臺灣白甲魚196、臺灣鬚鱲161、鰕虎科49
請從魚類洄游生態解析113年4月數量最高的原因（繁殖期？水溫？流量？），及對魚道維護時程的建議。`,

    '棲地適合度': `橫流溪HECRAS-2D二維水理棲地模擬（臺灣間爬岩鰍，流量1.0 cms）：
- 壩上游WUA佔比：${ha.upstreamWUA}%（${ha.upstreamPoints.toLocaleString()}網格），水域型態：淺流50%、緩流21%、深流12%、淺瀨13%、深潭4%
- 壩下游WUA佔比：${ha.downstreamWUA}%（${ha.downstreamPoints.toLocaleString()}網格），水域型態：淺流38%、緩流33%、深流13%
- 高流量風險（>10cms，發生率4%）：流速可能超過魚類極限泳速
- 低流量風險（<0.003cms）：歷次量測皆未發生
請解析上下游棲地差異、評估結論「棲地條件無問題」的依據，以及4%高流量風險的管理對策。`,

    '魚道維護建議': `依據橫流溪水域友善監測追蹤報告（112~113年）各魚道表現：
- FD4（階段式）：AI最多68尾/分、電捕11尾、水棲昆蟲352隻（最多）→ 標竿魚道
- FD3（粗石斜曲面）：AI次多66尾/分、電捕6尾、根團微棲地佳
- FD5（潛越式）：AI偵測14尾（偏低）但電捕17尾（最多）、有臺灣間爬岩鰍記錄
- FD7（降壩上游）：AI偵測11尾（最低）、但有臺灣間爬岩鰍記錄
- 高流量>10cms時魚道風險率4%，建議監測
請提供各魚道具體維護建議、優先順序，以及AI偵測數量與電捕數量不一致的可能原因。`,

    '管理建議': `請針對東勢處橫流溪水域友善監測成果（112~113年）提供整合管理建議：
硬體：8座魚道維護優先順序、高流量（>10cms）應急措施
生態：纓口臺鰍VU族群追蹤頻率、臺灣間爬岩鰍棲地保護
監測：下次AI辨識建議時程（春繁殖期重點）、水棲昆蟲FBI定期評估
植物：38科91種濱溪植物保育（原生種61種、特有種4種）
特別說明FD4階段式魚道作為標竿魚道的維護管理規範建議。`,

    '智慧辨識技術': `橫流溪魚道YOLOv4智慧辨識系統評估結果：
- 日間：mAP ${m.dayMAP}%，精確率${(m.dayPrecision*100).toFixed(0)}%、召回率${(m.dayRecall*100).toFixed(0)}%，TP=${m.dayTP}/FP=${m.dayFP}/FN=${m.dayFN}，訓練${m.dayTrainImages.toLocaleString()}張
- 夜間：mAP ${m.nightMAP}%，精確率${(m.nightPrecision*100).toFixed(0)}%、召回率${(m.nightRecall*100).toFixed(0)}%，TP=${m.nightTP}/FP=${m.nightFP}/FN=${m.nightFN}，訓練${m.nightTrainImages.toLocaleString()}張
- 演算法比較：YOLOv4(${m.algoComparison['YOLOv4']}%) > YOLOv5(${m.algoComparison['YOLOv5']}%) > YOLOv9t(${m.algoComparison['YOLOv9t']}%) > YOLOv11n(${m.algoComparison['YOLOv11n']}%)
- 辨識類別：${m.classes.join('、')}
請解釋夜間召回率偏低(${(m.nightRecall*100).toFixed(0)}%)的原因（FN=${m.nightFN}多），以及提升模型精度的優化方向。`
  };
  const prompt = prompts[topic] || `請分析橫流溪${topic}相關生態監測資料，並提供管理建議。`;

  if (typeof toggleAIChat === 'function') {
    const panel = document.getElementById('aiChatPanel');
    if (panel && !panel.classList.contains('open')) toggleAIChat();
  }
  const input = document.getElementById('aiInput');
  if (input) {
    input.value = prompt;
    input.focus();
  }
  showToast('已填入 AI 分析問題，點擊送出即可', 'info');
}

// ─────────────────────────────────────────────
// 輔助元件（原有）
// ─────────────────────────────────────────────
function chapter4Stat(label, value, icon, color) {
  return `
    <div class="card" style="margin:0;border-left:4px solid ${color}">
      <div class="card-body" style="display:flex;align-items:center;gap:12px">
        <div style="width:42px;height:42px;border-radius:8px;background:${color};display:flex;align-items:center;justify-content:center;color:#fff;flex-shrink:0">
          <i class="fas ${icon}"></i>
        </div>
        <div>
          <div style="font-size:20px;font-weight:700;color:${color}">${value}</div>
          <div style="font-size:12px;color:var(--text-muted)">${label}</div>
        </div>
      </div>
    </div>`;
}

function chapter4InfoCard(title, body, tags) {
  return `
    <div style="border:1px solid #e5e7eb;border-radius:8px;padding:12px;background:#fff">
      <div style="font-weight:700;margin-bottom:6px">${title}</div>
      <div style="font-size:13px;line-height:1.7;color:#475569;margin-bottom:8px">${body}</div>
      <div style="display:flex;gap:5px;flex-wrap:wrap">
        ${tags.map(t => `<span style="font-size:11px;background:#eef6ff;color:#155eef;padding:2px 7px;border-radius:999px">${t}</span>`).join('')}
      </div>
    </div>`;
}

function chapter4Task(title, body) {
  return `
    <div style="background:#f8fafc;border:1px solid #e5e7eb;border-radius:8px;padding:14px">
      <div style="font-weight:700;margin-bottom:6px;color:#1f2937">${title}</div>
      <div style="font-size:13px;line-height:1.75;color:#475569">${body}</div>
    </div>`;
}

function chapter4ModelMetric(label, value) {
  return `
    <div style="border:1px solid #e5e7eb;border-radius:8px;padding:12px;background:#fff">
      <div style="font-size:12px;color:#64748b;margin-bottom:4px">${label}</div>
      <div style="font-size:14px;font-weight:700;color:#0f172a;line-height:1.5">${value}</div>
    </div>`;
}

function chapter4HabitatModelGraphic() {
  return `
    <svg viewBox="0 0 760 420" role="img" aria-label="橫流溪 HEC-RAS 2D 棲地模擬結果圖形展示" style="width:100%;height:100%;min-height:360px;display:block;background:#f8fafc">
      <defs>
        <linearGradient id="channelBase" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stop-color="#c7d2fe"/><stop offset="100%" stop-color="#7dd3fc"/>
        </linearGradient>
        <filter id="softShadow" x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="#0f172a" flood-opacity=".18"/>
        </filter>
      </defs>
      <rect x="0" y="0" width="760" height="420" fill="#f8fafc"/>
      <text x="28" y="34" font-size="18" font-weight="700" fill="#0f172a">HEC-RAS 2D 棲地模擬結果</text>
      <text x="28" y="57" font-size="12" fill="#64748b">橫流溪 0K+460 至 1K+400，依水深與流速分區展示棲地型態</text>
      <path d="M50 272 C140 218 178 248 250 202 C327 153 410 176 480 128 C570 65 626 92 710 55"
            fill="none" stroke="#d6d3d1" stroke-width="96" stroke-linecap="round" opacity=".82"/>
      <path d="M50 272 C140 218 178 248 250 202 C327 153 410 176 480 128 C570 65 626 92 710 55"
            fill="none" stroke="url(#channelBase)" stroke-width="70" stroke-linecap="round" filter="url(#softShadow)"/>
      <path d="M72 263 C128 232 162 240 212 216" fill="none" stroke="#93c5fd" stroke-width="58" stroke-linecap="round" opacity=".92"/>
      <path d="M216 214 C281 181 310 173 360 174" fill="none" stroke="#2563eb" stroke-width="46" stroke-linecap="round" opacity=".88"/>
      <path d="M362 173 C418 169 448 145 490 121" fill="none" stroke="#06b6d4" stroke-width="54" stroke-linecap="round" opacity=".9"/>
      <path d="M492 120 C545 86 583 78 632 75" fill="none" stroke="#22c55e" stroke-width="44" stroke-linecap="round" opacity=".88"/>
      <path d="M628 76 C664 70 684 61 708 55" fill="none" stroke="#facc15" stroke-width="34" stroke-linecap="round" opacity=".92"/>
      <g opacity=".95">
        <circle cx="78" cy="260" r="7" fill="#0f766e"/><text x="54" y="302" font-size="12" fill="#334155">0K+460</text>
        <circle cx="218" cy="214" r="7" fill="#0f766e"/><text x="190" y="252" font-size="12" fill="#334155">0K+740</text>
        <circle cx="360" cy="174" r="7" fill="#0f766e"/><text x="330" y="212" font-size="12" fill="#334155">1K+000</text>
        <circle cx="492" cy="120" r="7" fill="#0f766e"/><text x="464" y="158" font-size="12" fill="#334155">1K+225</text>
        <circle cx="708" cy="55" r="7" fill="#0f766e"/><text x="654" y="93" font-size="12" fill="#334155">1K+400</text>
      </g>
      <g>
        <rect x="30" y="330" width="320" height="66" rx="8" fill="#fff" stroke="#e2e8f0"/>
        <text x="46" y="354" font-size="13" font-weight="700" fill="#0f172a">棲地二維模式分類</text>
        ${chapter4LegendSvg(48, 374, '#2563eb', '深流')}
        ${chapter4LegendSvg(110, 374, '#06b6d4', '深潭')}
        ${chapter4LegendSvg(172, 374, '#93c5fd', '淺流')}
        ${chapter4LegendSvg(234, 374, '#facc15', '淺瀨')}
        ${chapter4LegendSvg(296, 374, '#22c55e', '岸邊緩流')}
      </g>
      <g>
        <rect x="510" y="302" width="210" height="94" rx="8" fill="#ecfeff" stroke="#a5f3fc"/>
        <text x="528" y="328" font-size="13" font-weight="700" fill="#155e75">判讀重點</text>
        <text x="528" y="350" font-size="12" fill="#164e63">1. 深槽與深潭提供避難棲地</text>
        <text x="528" y="370" font-size="12" fill="#164e63">2. 淺瀨與緩流區支援覓食</text>
        <text x="528" y="390" font-size="12" fill="#164e63">3. 魚道上下游需維持連通</text>
      </g>
    </svg>`;
}

function chapter4LegendSvg(x, y, color, label) {
  return `<rect x="${x}" y="${y - 10}" width="12" height="12" rx="2" fill="${color}"/><text x="${x + 17}" y="${y}" font-size="11" fill="#475569">${label}</text>`;
}

function chapter4Stations() {
  return [
    { no: 'S1', stationKm: '0K+460', type: '魚類樣站', twd97x: 240716, twd97y: 2675003, condition: '淺流、卵礫石底質', use: '下游魚類族群與水質追蹤' },
    { no: 'S2', stationKm: '0K+740', type: '魚類樣站', twd97x: 240817, twd97y: 2675440, condition: '急流與淺瀨交錯', use: '保育魚類棲地監測' },
    { no: 'S3', stationKm: '1K+000', type: '魚類樣站', twd97x: 240812, twd97y: 2675445, condition: '淺流、局部深槽', use: '中游連通性判讀' },
    { no: 'S4', stationKm: '1K+225', type: '魚類樣站', twd97x: 240778, twd97y: 2675702, condition: '緩流深潭與岸邊植生', use: '深潭棲地與避難區追蹤' },
    { no: 'WQ1', stationKm: '0K+460', type: '水質樣站', twd97x: 240716, twd97y: 2675003, condition: 'DO、BOD、SS、NH3-N、RPI', use: '水質趨勢與棲地品質判讀' }
  ];
}

function renderChapter4Charts(fish, habitats) {
  const fishData = fish.length ? fish : DB.getAll('fish');
  const habitatData = habitats.length ? habitats : DB.getAll('habitats');

  const fishCanvas = document.getElementById('chapter4FishChart');
  if (fishCanvas && window.Chart) {
    if (fishCanvas._chartInst) fishCanvas._chartInst.destroy();
    fishCanvas._chartInst = new Chart(fishCanvas, {
      type: 'bar',
      data: {
        labels: fishData.slice(0, 9).map(x => x.species),
        datasets: [{ label: '調查數量', data: fishData.slice(0, 9).map(x => Number(x.count) || 0), backgroundColor: '#1565c0', borderRadius: 4 }]
      },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }
    });
  }

  const habitatCanvas = document.getElementById('chapter4HabitatChart');
  if (habitatCanvas && window.Chart) {
    if (habitatCanvas._chartInst) habitatCanvas._chartInst.destroy();
    habitatCanvas._chartInst = new Chart(habitatCanvas, {
      type: 'radar',
      data: {
        labels: habitatData.slice(0, 6).map(x => x.stationKm || x.name),
        datasets: [{ label: '棲地品質', data: habitatData.slice(0, 6).map(x => Number(x.quality) || 0), backgroundColor: 'rgba(46,125,50,.18)', borderColor: '#2e7d32', pointBackgroundColor: '#2e7d32' }]
      },
      options: { responsive: true, maintainAspectRatio: false, scales: { r: { beginAtZero: true, suggestedMax: 5 } } }
    });
  }
}
