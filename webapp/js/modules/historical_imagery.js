/* 橫流溪歷年影像：時間軸、GIS套疊、前後比對與AI摘要判讀 */
const HLX_HISTORY_YEARS = [102, 103, 104, 105, 106, 107, 108, 109, 110, 111, 112, 113, 114, 115];
let hlxHistoryState = {
  tab: 'timeline',
  activeYear: 115,
  beforeYear: 102,
  afterYear: 115,
  opacity: 62
};

function hlxHistoryPhase(year) {
  if (year <= 106) return { label: '整治前基準期', color: '#b45309', tone: '崩塌裸露、河道擾動與早期坡面狀態可作為長期比較基準。' };
  if (year <= 108) return { label: '魚道與工程建置期', color: '#2563eb', tone: '107～108 年完成魚道與周邊工程後，適合作為工程介入前後的比較節點。' };
  if (year <= 112) return { label: '復育與監測期', color: '#0f766e', tone: '工程後持續追蹤坡面植生、河道沖淤與設施周邊穩定情形。' };
  return { label: '近期維護判讀期', color: '#15803d', tone: '近期影像可用於比對維護後狀態、設施周邊淘刷與植生恢復趨勢。' };
}

function hlxHistorySummary(year = hlxHistoryState.activeYear) {
  const phase = hlxHistoryPhase(year);
  const next = year < 115 ? `${year + 1} 年` : '最新年度';
  return `目前選定 ${year} 年，屬於「${phase.label}」。判讀重點應放在崩塌裸露範圍、溪床沖淤、魚道上下游通水連續性與維護設施周邊植生恢復。建議與 ${next} 或 107～108 年工程建置期影像交叉比對，確認異常是否為短期水文事件或長期劣化趨勢。`;
}

function hlxHistoryCompareSummary(beforeYear = hlxHistoryState.beforeYear, afterYear = hlxHistoryState.afterYear) {
  const span = Math.abs(afterYear - beforeYear);
  const earlyYear = Math.min(beforeYear, afterYear);
  const lateYear = Math.max(beforeYear, afterYear);
  const beforePhase = hlxHistoryPhase(beforeYear).label;
  const afterPhase = hlxHistoryPhase(afterYear).label;
  let verdict = '屬跨年度長期追蹤組合，可用於判斷整治前後及維護成效。';
  if (earlyYear <= 106 && lateYear >= 113) verdict = '屬整治前基準與近期維護成果對照，最適合判斷崩塌地穩定、植生復育與工程長期效益。';
  else if (earlyYear <= 108 && lateYear >= 109) verdict = '屬工程建置前後對照，適合檢核魚道、固床工與防砂設施對河道穩定的影響。';
  else if (span <= 2) verdict = '屬短期變化對照，適合快速檢視近期豪雨、巡查或維護前後差異。';
  return `${beforeYear} 年（${beforePhase}）至 ${afterYear} 年（${afterPhase}）相隔 ${span} 年。${verdict} AI判讀建議優先比對裸露地是否縮小、河道是否偏移、溪床深槽是否連續，以及設施下游是否有新增淘刷或淤積。`;
}

function renderHistoricalImageryPanel(context = 'facilities') {
  const state = hlxHistoryState;
  const phase = hlxHistoryPhase(state.activeYear);
  const tabs = [
    { key: 'timeline', label: '時間軸', icon: 'fa-timeline' },
    { key: 'overlay', label: 'GIS套疊', icon: 'fa-layer-group' },
    { key: 'compare', label: '前後比對', icon: 'fa-code-compare' },
    { key: 'ai', label: 'AI摘要判讀', icon: 'fa-robot' }
  ];
  return `
    <section class="hlx-history-panel" data-context="${context}">
      <div class="hlx-history-head">
        <div>
          <div class="hlx-history-kicker"><i class="fas fa-images"></i> 橫流溪歷年影像時間軸分析</div>
          <h3>時間軸 + GIS套疊 + 前後比對 + AI摘要判讀</h3>
          <p>資料來源：橫流溪歷年影像.pptx，彙整 102～115 年影像序列；先以年度、工程期程與判讀重點建置平台展示。</p>
        </div>
        <div class="hlx-history-source">目前年度：<b>${state.activeYear}</b><span style="background:${phase.color}">${phase.label}</span></div>
      </div>

      <div class="hlx-history-tabs">
        ${tabs.map(tab => `
          <button class="${state.tab === tab.key ? 'active' : ''}" onclick="hlxHistorySwitchTab('${tab.key}')">
            <i class="fas ${tab.icon}"></i>${tab.label}
          </button>
        `).join('')}
      </div>

      <div id="hlxHistoryBody">
        ${renderHistoricalImageryBody()}
      </div>
    </section>
    ${renderHistoricalImageryStyles()}
  `;
}

function renderHistoricalImageryBody() {
  const state = hlxHistoryState;
  if (state.tab === 'overlay') return renderHlxHistoryOverlay();
  if (state.tab === 'compare') return renderHlxHistoryCompare();
  if (state.tab === 'ai') return renderHlxHistoryAi();
  return renderHlxHistoryTimeline();
}

function renderHlxHistoryTimeline() {
  const state = hlxHistoryState;
  return `
    <div class="hlx-history-grid">
      <div class="hlx-history-map">
        ${renderHlxMapScene(state.activeYear, state.opacity)}
      </div>
      <div class="hlx-history-side">
        <h4>年度時間軸</h4>
        <div class="hlx-year-timeline">
          ${HLX_HISTORY_YEARS.map(year => {
            const phase = hlxHistoryPhase(year);
            return `<button class="${year === state.activeYear ? 'active' : ''}" style="--phase:${phase.color}" onclick="hlxHistorySelectYear(${year})">${year}</button>`;
          }).join('')}
        </div>
        <div class="hlx-history-note">
          <b>${state.activeYear} 年判讀重點</b>
          <p>${hlxHistorySummary(state.activeYear)}</p>
        </div>
      </div>
    </div>
  `;
}

function renderHlxHistoryOverlay() {
  return `
    <div class="hlx-history-grid">
      <div class="hlx-history-map">
        ${renderHlxMapScene(hlxHistoryState.activeYear, hlxHistoryState.opacity)}
      </div>
      <div class="hlx-history-side">
        <h4>GIS套疊控制</h4>
        <label class="hlx-control-label">影像透明度 <b id="hlxOpacityText">${hlxHistoryState.opacity}%</b></label>
        <input type="range" min="20" max="90" value="${hlxHistoryState.opacity}" oninput="hlxHistoryUpdateOpacity(this.value)" style="width:100%">
        <div class="hlx-layer-list">
          <span><i class="fas fa-check-square"></i> 歷年影像範圍</span>
          <span><i class="fas fa-check-square"></i> 崩塌地判釋區</span>
          <span><i class="fas fa-check-square"></i> 工程設施點位</span>
          <span><i class="fas fa-check-square"></i> 河道與魚道位置</span>
        </div>
        <div class="hlx-history-note">
          <b>套疊用途</b>
          <p>將年度影像與設施點位疊合，可快速檢核魚道、防砂壩、固床工及平台周邊是否有河道偏移、淤積或淘刷熱區。</p>
        </div>
      </div>
    </div>
  `;
}

function renderHlxHistoryCompare() {
  const beforeOptions = HLX_HISTORY_YEARS.map(y => `<option value="${y}" ${y === hlxHistoryState.beforeYear ? 'selected' : ''}>${y} 年</option>`).join('');
  const afterOptions = HLX_HISTORY_YEARS.map(y => `<option value="${y}" ${y === hlxHistoryState.afterYear ? 'selected' : ''}>${y} 年</option>`).join('');
  return `
    <div class="hlx-compare-controls">
      <label>前期影像 <select onchange="hlxHistoryUpdateCompare('beforeYear', this.value)">${beforeOptions}</select></label>
      <label>後期影像 <select onchange="hlxHistoryUpdateCompare('afterYear', this.value)">${afterOptions}</select></label>
      <button class="btn btn-sm btn-primary" onclick="hlxHistorySwapCompare()"><i class="fas fa-right-left"></i> 交換</button>
    </div>
    <div class="hlx-compare-grid">
      <div><h4>${hlxHistoryState.beforeYear} 年</h4>${renderHlxMapScene(hlxHistoryState.beforeYear, 58)}</div>
      <div><h4>${hlxHistoryState.afterYear} 年</h4>${renderHlxMapScene(hlxHistoryState.afterYear, 74)}</div>
    </div>
    <div class="hlx-history-note compare">
      <b>前後比對摘要</b>
      <p>${hlxHistoryCompareSummary()}</p>
    </div>
  `;
}

function renderHlxHistoryAi() {
  return `
    <div class="hlx-ai-grid">
      <div class="hlx-ai-card">
        <h4><i class="fas fa-brain"></i> AI摘要判讀</h4>
        <p>${hlxHistoryCompareSummary()}</p>
        <ul>
          <li>工程設施：優先檢視魚道出入口、固床工下游與防砂壩壩趾是否有淘刷或淤積。</li>
          <li>GIS判讀：以設施點位為核心建立 50～100 m 緩衝區，套疊年度影像確認變化熱區。</li>
          <li>維護管理：若近期影像顯示裸露地擴大或河道貼近構造物，建議納入下一次專業巡查。</li>
        </ul>
      </div>
      <div class="hlx-ai-card green">
        <h4><i class="fas fa-clipboard-check"></i> 平台建置建議</h4>
        <p>後續可將每年度影像切片轉為 GeoTIFF 或 XYZ tile，透過同一控制列加入真實圖層透明度、時間滑桿與設施狀態同步更新。</p>
      </div>
    </div>
  `;
}

function renderHlxMapScene(year, opacity) {
  const phase = hlxHistoryPhase(year);
  const shift = Math.min(34, Math.max(4, (year - 102) * 2.4));
  return `
    <div class="hlx-map-scene">
      <div class="hlx-map-base"></div>
      <div class="hlx-river"></div>
      <div class="hlx-overlay-area" style="opacity:${Number(opacity) / 100};transform:translate(${shift}px, ${Math.round(shift / 3)}px) rotate(-8deg)"></div>
      <div class="hlx-facility-dot d1">魚道</div>
      <div class="hlx-facility-dot d2">防砂壩</div>
      <div class="hlx-facility-dot d3">固床工</div>
      <div class="hlx-map-badge" style="border-color:${phase.color};color:${phase.color}">${year} 年 ${phase.label}</div>
    </div>
  `;
}

function renderHistoricalImageryStyles() {
  if (document.getElementById('hlxHistoryStyles')) return '';
  return `
    <style id="hlxHistoryStyles">
      .hlx-history-panel{background:#fff;border:1px solid #dbeafe;border-radius:10px;padding:18px;margin:16px 0;box-shadow:0 8px 24px rgba(15,23,42,.06)}
      .hlx-history-head{display:flex;justify-content:space-between;gap:16px;align-items:flex-start;flex-wrap:wrap}
      .hlx-history-kicker{font-size:15px;font-weight:900;color:#0369a1;margin-bottom:6px}
      .hlx-history-head h3{font-size:24px;line-height:1.35;margin:0;color:#0f172a;font-weight:900}
      .hlx-history-head p{font-size:15px;color:#64748b;margin:6px 0 0}
      .hlx-history-source{font-size:15px;color:#334155;background:#f8fafc;border:1px solid #e2e8f0;border-radius:999px;padding:8px 12px}
      .hlx-history-source span{display:inline-block;color:#fff;border-radius:999px;padding:3px 8px;margin-left:8px;font-size:13px;font-weight:800}
      .hlx-history-tabs{display:flex;gap:8px;flex-wrap:wrap;margin:16px 0}
      .hlx-history-tabs button{border:1px solid #cbd5e1;background:#fff;color:#334155;border-radius:8px;padding:9px 14px;font-size:16px;font-weight:900;cursor:pointer}
      .hlx-history-tabs button.active{background:#0f766e;color:#fff;border-color:#0f766e}
      .hlx-history-grid{display:grid;grid-template-columns:minmax(420px,1.45fr) minmax(300px,.75fr);gap:16px}
      .hlx-history-map,.hlx-compare-grid>div{border:1px solid #dbeafe;border-radius:10px;background:#f8fafc;padding:10px}
      .hlx-map-scene{height:360px;border-radius:8px;position:relative;overflow:hidden;background:#1f2937}
      .hlx-map-base{position:absolute;inset:0;background:linear-gradient(135deg,#315a31 0%,#6b8f4e 28%,#193f2d 54%,#7a8c56 72%,#25425e 100%);filter:saturate(1.1)}
      .hlx-river{position:absolute;left:24%;top:-8%;width:30%;height:120%;background:linear-gradient(90deg,rgba(56,189,248,.2),rgba(14,165,233,.82),rgba(255,255,255,.32));border-radius:48% 42% 52% 40%;transform:rotate(18deg);box-shadow:0 0 0 6px rgba(255,255,255,.15)}
      .hlx-overlay-area{position:absolute;left:38%;top:12%;width:27%;height:62%;border:3px dashed #f59e0b;background:rgba(248,113,113,.28);border-radius:38% 62% 52% 46%}
      .hlx-facility-dot{position:absolute;background:#fff;border:2px solid #0f766e;color:#0f172a;border-radius:999px;padding:5px 8px;font-size:14px;font-weight:900;box-shadow:0 3px 10px rgba(0,0,0,.22)}
      .hlx-facility-dot.d1{left:49%;top:26%}.hlx-facility-dot.d2{left:43%;top:50%;border-color:#92400e}.hlx-facility-dot.d3{left:57%;top:62%;border-color:#64748b}
      .hlx-map-badge{position:absolute;left:12px;bottom:12px;background:#fff;border:2px solid;border-radius:8px;padding:7px 10px;font-size:15px;font-weight:900}
      .hlx-history-side{border:1px solid #e2e8f0;border-radius:10px;padding:14px;background:#fff}
      .hlx-history-side h4,.hlx-ai-card h4,.hlx-compare-grid h4{font-size:19px;margin:0 0 12px;color:#0f172a;font-weight:900}
      .hlx-year-timeline{display:grid;grid-template-columns:repeat(7,1fr);gap:8px}
      .hlx-year-timeline button{border:1px solid var(--phase);color:var(--phase);background:#fff;border-radius:8px;padding:8px 0;font-size:16px;font-weight:900;cursor:pointer}
      .hlx-year-timeline button.active{background:var(--phase);color:#fff}
      .hlx-history-note{margin-top:14px;padding:13px;border-left:4px solid #0f766e;background:#f0fdfa;border-radius:8px;color:#134e4a;font-size:16px;line-height:1.7}
      .hlx-history-note p{margin:6px 0 0}.hlx-history-note.compare{margin-top:12px}
      .hlx-layer-list{display:grid;gap:8px;margin:14px 0}.hlx-layer-list span{font-size:15px;color:#334155;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:9px}
      .hlx-control-label{display:flex;justify-content:space-between;font-size:16px;color:#334155;font-weight:900;margin-bottom:8px}
      .hlx-compare-controls{display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-bottom:12px}
      .hlx-compare-controls label{font-size:16px;font-weight:900;color:#334155}.hlx-compare-controls select{font-size:16px;padding:7px;border:1px solid #cbd5e1;border-radius:8px}
      .hlx-compare-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px}
      .hlx-ai-grid{display:grid;grid-template-columns:1.2fr .8fr;gap:14px}.hlx-ai-card{border:1px solid #bfdbfe;background:#eff6ff;border-radius:10px;padding:16px;font-size:16px;line-height:1.8;color:#1e3a8a}.hlx-ai-card.green{border-color:#bbf7d0;background:#f0fdf4;color:#14532d}.hlx-ai-card ul{margin:8px 0 0;padding-left:22px}
      @media (max-width: 980px){.hlx-history-grid,.hlx-compare-grid,.hlx-ai-grid{grid-template-columns:1fr}.hlx-map-scene{height:300px}.hlx-year-timeline{grid-template-columns:repeat(4,1fr)}}
    </style>
  `;
}

function hlxHistorySwitchTab(tab) {
  hlxHistoryState.tab = tab;
  hlxHistoryRefreshAll();
}

function hlxHistorySelectYear(year) {
  hlxHistoryState.activeYear = Number(year);
  hlxHistoryRefreshAll();
}

function hlxHistoryUpdateOpacity(value) {
  hlxHistoryState.opacity = Number(value);
  const text = document.getElementById('hlxOpacityText');
  if (text) text.textContent = `${hlxHistoryState.opacity}%`;
  document.querySelectorAll('.hlx-history-panel .hlx-overlay-area').forEach(el => {
    el.style.opacity = String(hlxHistoryState.opacity / 100);
  });
}

function hlxHistoryUpdateCompare(key, value) {
  hlxHistoryState[key] = Number(value);
  hlxHistoryRefreshAll();
}

function hlxHistorySwapCompare() {
  const before = hlxHistoryState.beforeYear;
  hlxHistoryState.beforeYear = hlxHistoryState.afterYear;
  hlxHistoryState.afterYear = before;
  hlxHistoryRefreshAll();
}

function hlxHistoryRefreshAll() {
  document.querySelectorAll('.hlx-history-panel').forEach(panel => {
    const context = panel.getAttribute('data-context') || 'facilities';
    panel.outerHTML = renderHistoricalImageryPanel(context);
  });
}
