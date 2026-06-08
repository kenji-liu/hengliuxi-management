// 儀表板模組 — 全連動版
function renderDashboard() {
  const facilities  = DB.getAll('facilities');
  const fish        = DB.getAll('fish');
  const habitats    = DB.getAll('habitats');
  const inspections = DB.getAll('inspections');

  // ── 設施狀況統計 ────────────────────────────────────────
  const statusCount = {
    normal:      facilities.filter(f => f.status === '正常').length,
    maintenance: facilities.filter(f => f.status === '需維護').length,
    damaged:     facilities.filter(f => f.status === '損壞').length
  };

  // ── 維護優先度統計 ──────────────────────────────────────
  const priorityCount = {
    urgent: facilities.filter(f => f.maintenance_priority === '緊急').length,
    high:   facilities.filter(f => f.maintenance_priority === '高').length,
    medium: facilities.filter(f => f.maintenance_priority === '中').length,
    low:    facilities.filter(f => f.maintenance_priority === '低').length
  };

  // ── 巡查事項 ────────────────────────────────────────────
  const pending         = inspections.filter(i => i.status === '待處理' || i.status === '處理中');
  const urgentInspect   = pending.filter(i => i.priority === '緊急').length;

  // ── 魚類：唯一物種 ──────────────────────────────────────
  const uniqueSpecies    = new Set(fish.map(f => f.species)).size;
  const uniqueEndangered = new Set(
    fish.filter(f => f.conservation === '瀕危' || f.conservation === '易危').map(f => f.species)
  ).size;
  const uniqueNearThreat = new Set(
    fish.filter(f => f.conservation === '近危').map(f => f.species)
  ).size;
  const totalFishCount   = fish.reduce((s, f) => s + (f.count || 0), 0);

  // ── 設施類型定義 ────────────────────────────────────────
  const typeOrder = [
    { key: '魚道',   icon: '🐟', color: '#1565c0' },
    { key: '固床工', icon: '🏗️', color: '#00897b' },
    { key: '防砂壩', icon: '🛡️', color: '#6a1b9a' },
    { key: '護岸',   icon: '🪨', color: '#795548' },
    { key: '平台',   icon: '🏠', color: '#e65100' },
    { key: '步道',   icon: '🚶', color: '#558b2f' }
  ];

  // ── 快速模組連結 ─────────────────────────────────────────
  const quickLinks = [
    { page: 'facilities',     icon: 'fa-hard-hat',      label: '工程設施管理',  color: '#1565c0' },
    { page: 'inspection',     icon: 'fa-book-medical',  label: '維護管理資料',  color: '#c62828' },
    { page: 'fish',           icon: 'fa-fish',          label: '魚類資料庫',    color: '#0097a7' },
    { page: 'habitat',        icon: 'fa-tree',          label: '二維水理模擬棲地環境', color: '#2e7d32' },
    { page: 'gis-enhanced',   icon: 'fa-map',           label: 'GIS整合地圖',   color: '#6a1b9a' },
    { page: 'chapter4',       icon: 'fa-water',         label: '溪流生態調查',  color: '#0277bd' },
    { page: 'reports',        icon: 'fa-chart-bar',     label: '報表分析',      color: '#558b2f' },
    { page: 'ai-tech',        icon: 'fa-brain',         label: 'AI技術分析',    color: '#37474f' },
    { page: 'design-library', icon: 'fa-book-open',     label: '工程設計書架',  color: '#00695c' }
  ];

  document.getElementById('contentArea').innerHTML = `
    <!-- 頁面標題 -->
    <div style="padding:12px 0 16px;margin-bottom:18px;border-bottom:2px solid #1565c0">
      <h2 style="margin:0;font-size:22px;font-weight:700;color:#1565c0">橫流溪棲地連通性及周邊設施維護管理</h2>
      <div style="color:#64748b;font-size:12px;margin-top:4px">
        <i class="fas fa-info-circle"></i> 數字卡片、圖表、清單項目均可點擊跳轉至對應模組
        <span style="margin-left:12px">資料更新：${new Date().toLocaleDateString('zh-TW', {year:'numeric',month:'long',day:'numeric'})}</span>
      </div>
    </div>

    <!-- ① 六大指標卡片 -->
    <div class="stats-grid" style="margin-bottom:14px">

      <div class="stat-card" style="cursor:pointer" onclick="navigateTo('facilities')"
           title="前往工程設施管理">
        <div class="stat-icon green"><i class="fas fa-hard-hat"></i></div>
        <div>
          <div class="stat-value">${facilities.length}</div>
          <div class="stat-label">工程設施總數</div>
          <div style="font-size:11px;color:#64748b;margin-top:2px">
            魚道 ${facilities.filter(f=>f.type==='魚道').length}・固床工 ${facilities.filter(f=>f.type==='固床工').length}・防砂壩 ${facilities.filter(f=>f.type==='防砂壩').length}
          </div>
        </div>
      </div>

      <div class="stat-card" style="cursor:pointer" onclick="navigateTo('facilities')"
           title="前往設施狀況總覽">
        <div class="stat-icon ${statusCount.damaged > 0 ? 'red' : statusCount.maintenance > 0 ? 'orange' : 'green'}">
          <i class="fas fa-${statusCount.damaged > 0 ? 'exclamation-triangle' : 'check-circle'}"></i>
        </div>
        <div>
          <div class="stat-value">${statusCount.normal}</div>
          <div class="stat-label">設施狀況正常</div>
          <div style="font-size:11px;margin-top:2px">
            <span style="color:#f44336">損壞 ${statusCount.damaged}</span> ／
            <span style="color:#ff9800">需維護 ${statusCount.maintenance}</span>
          </div>
        </div>
      </div>

      <div class="stat-card" style="cursor:pointer" onclick="navigateTo('fish')"
           title="前往魚類資料庫">
        <div class="stat-icon blue"><i class="fas fa-fish"></i></div>
        <div>
          <div class="stat-value">${uniqueSpecies}</div>
          <div class="stat-label">魚類記錄物種</div>
          <div style="font-size:11px;color:#64748b;margin-top:2px">調查合計 ${totalFishCount} 尾</div>
        </div>
      </div>

      <div class="stat-card" style="cursor:pointer" onclick="navigateTo('fish')"
           title="前往保育魚類清單">
        <div class="stat-icon purple"><i class="fas fa-shield-alt"></i></div>
        <div>
          <div class="stat-value">${uniqueEndangered}</div>
          <div class="stat-label">易危以上物種</div>
          <div style="font-size:11px;color:#64748b;margin-top:2px">近危物種 ${uniqueNearThreat} 種</div>
        </div>
      </div>

      <div class="stat-card" style="cursor:pointer" onclick="navigateTo('habitat')"
           title="前往二維水理模擬棲地環境">
        <div class="stat-icon teal"><i class="fas fa-leaf"></i></div>
        <div>
          <div class="stat-value">${habitats.length}</div>
          <div class="stat-label">棲地調查樣區</div>
          <div style="font-size:11px;color:#64748b;margin-top:2px">含電魚及水質監測站</div>
        </div>
      </div>

      <div class="stat-card" style="cursor:pointer" onclick="navigateTo('inspection')"
           title="前往維護管理資料">
        <div class="stat-icon ${urgentInspect > 0 ? 'red' : pending.length > 0 ? 'orange' : 'green'}">
          <i class="fas fa-clipboard-list"></i>
        </div>
        <div>
          <div class="stat-value">${pending.length}</div>
          <div class="stat-label">待處理巡查事項</div>
          <div style="font-size:11px;margin-top:2px">
            ${urgentInspect > 0
              ? `<span style="color:#f44336">緊急 ${urgentInspect} 件</span>`
              : '<span style="color:#64748b">無緊急事項</span>'}
          </div>
        </div>
      </div>
    </div>

    <!-- ② 維護優先度快速摘要 -->
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:18px">
      ${[
        { label:'緊急維護', count: priorityCount.urgent, bg:'#fff1f2', border:'#fca5a5', color:'#dc2626' },
        { label:'高優先維護', count: priorityCount.high,   bg:'#fff7ed', border:'#fdba74', color:'#ea580c' },
        { label:'中優先維護', count: priorityCount.medium, bg:'#fefce8', border:'#fde047', color:'#ca8a04' },
        { label:'定期巡查',   count: priorityCount.low,   bg:'#f0fdf4', border:'#86efac', color:'#16a34a' }
      ].map(({label,count,bg,border,color}) => `
        <div onclick="navigateTo('facilities')" style="cursor:pointer;background:${bg};border:1px solid ${border};border-radius:8px;padding:10px 12px;text-align:center;transition:box-shadow 0.15s"
             onmouseover="this.style.boxShadow='0 2px 8px ${border}'" onmouseout="this.style.boxShadow='none'">
          <div style="font-size:26px;font-weight:800;color:${color};line-height:1.2">${count}</div>
          <div style="font-size:12px;color:${color};font-weight:600;margin-top:2px">${label}</div>
          <div style="font-size:11px;color:#64748b;margin-top:1px">點擊前往設施</div>
        </div>
      `).join('')}
    </div>

    <!-- ③ 圖表與清單 -->
    <div class="dashboard-grid">

      <!-- 設施狀況圓餅（可點擊） -->
      <div class="card">
        <div class="card-header">
          <span class="card-title"><i class="fas fa-chart-pie"></i> 設施狀況分布</span>
          <button class="btn btn-sm btn-outline" onclick="navigateTo('facilities')">
            <i class="fas fa-arrow-right"></i> 查看全部
          </button>
        </div>
        <div class="card-body">
          <div class="chart-container">
            <canvas id="facilityStatusChart" style="cursor:pointer" title="點擊前往設施管理"></canvas>
          </div>
          <div style="font-size:11px;color:#94a3b8;text-align:center;margin-top:4px">
            <i class="fas fa-hand-pointer"></i> 點擊圖表前往工程設施管理
          </div>
        </div>
      </div>

      <!-- 魚類族群（可點擊） -->
      <div class="card">
        <div class="card-header">
          <span class="card-title"><i class="fas fa-chart-bar"></i> 魚類族群數量</span>
          <button class="btn btn-sm btn-outline" onclick="navigateTo('fish')">
            <i class="fas fa-arrow-right"></i> 查看全部
          </button>
        </div>
        <div class="card-body">
          <div class="chart-container">
            <canvas id="fishCountChart" style="cursor:pointer" title="點擊前往魚類資料庫"></canvas>
          </div>
          <div style="font-size:11px;color:#94a3b8;text-align:center;margin-top:4px">
            🟠 易危 🟡 近危 🟢 一般 ｜ 點擊前往魚類資料庫
          </div>
        </div>
      </div>

      <!-- 最近巡查事項（可點擊） -->
      <div class="card">
        <div class="card-header">
          <span class="card-title"><i class="fas fa-bell"></i> 最近巡查事項</span>
          <button class="btn btn-sm btn-outline" onclick="navigateTo('inspection')">
            <i class="fas fa-arrow-right"></i> 查看全部
          </button>
        </div>
        <div class="card-body">
          ${pending.length === 0
            ? `<div class="empty-state">
                 <i class="fas fa-check-circle" style="color:var(--success)"></i>
                 <p>目前無待處理事項</p>
                 <button class="btn btn-sm btn-outline" onclick="navigateTo('inspection')">前往維護管理資料</button>
               </div>`
            : pending.slice(0, 4).map(i => `
                <div class="activity-item" style="cursor:pointer;border-radius:6px;padding:6px;margin:0 -6px;transition:background 0.12s"
                     onclick="navigateTo('inspection')"
                     onmouseover="this.style.background='#f1f5f9'"
                     onmouseout="this.style.background='transparent'"
                     title="前往維護管理資料">
                  <div class="activity-dot" style="background:${i.priority==='緊急'?'#f44336':i.priority==='高'?'ff9800':'var(--primary)'}"></div>
                  <div style="flex:1;min-width:0">
                    <div class="activity-text fw-600">${i.facilityName}</div>
                    <div class="activity-text" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">
                      ${(i.findings||'').substring(0,55)}${(i.findings||'').length>55?'…':''}
                    </div>
                    <div class="activity-time">
                      ${i.date} · ${i.inspector} ·
                      <span class="badge badge-${i.priority==='緊急'?'danger':i.priority==='高'?'warning':'default'}">${i.priority}</span>
                      <span class="badge badge-${i.status==='待處理'?'danger':i.status==='處理中'?'warning':'default'}" style="margin-left:3px">${i.status}</span>
                    </div>
                  </div>
                </div>
              `).join('')
          }
          ${pending.length > 4 ? `<div style="text-align:center;margin-top:8px;font-size:12px;color:#64748b">另有 ${pending.length-4} 筆未顯示，<a href="#" onclick="navigateTo('inspection');return false">查看全部</a></div>` : ''}
        </div>
      </div>

      <!-- 設施類型統計（可點擊） -->
      <div class="card">
        <div class="card-header">
          <span class="card-title"><i class="fas fa-tasks"></i> 設施類型統計</span>
          <button class="btn btn-sm btn-outline" onclick="navigateTo('facilities')">
            <i class="fas fa-arrow-right"></i> 前往管理
          </button>
        </div>
        <div class="card-body">
          ${typeOrder.map(({ key, icon, color }) => {
            const cnt = facilities.filter(f => f.type === key).length;
            const pct = facilities.length > 0 ? Math.round(cnt / facilities.length * 100) : 0;
            return `
              <div style="margin-bottom:13px;cursor:pointer;padding:4px 6px;border-radius:6px;transition:background 0.12s"
                   onclick="navigateTo('facilities')" title="前往${key}管理"
                   onmouseover="this.style.background='#f1f5f9'" onmouseout="this.style.background='transparent'">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
                  <span style="font-size:13px">${icon} ${key}</span>
                  <span style="font-size:13px;color:var(--text-light);font-weight:600">${cnt} 座 (${pct}%)</span>
                </div>
                <div class="progress-bar">
                  <div class="progress-fill" style="width:${pct}%;background:${color}"></div>
                </div>
              </div>`;
          }).join('')}
          <div style="margin-top:12px;padding-top:10px;border-top:1px solid #e2e8f0;font-size:12px;color:#64748b;display:flex;justify-content:space-between">
            <span>合計 ${facilities.length} 座</span>
            <span>0K+460 ～ 1K+400</span>
          </div>
        </div>
      </div>
    </div>

    <!-- ④ 快速跳轉面板 -->
    <div class="card" style="margin-top:16px">
      <div class="card-header">
        <span class="card-title"><i class="fas fa-th-large"></i> 快速前往各模組</span>
        <div style="font-size:12px;color:#64748b">點擊任一模組卡片直接跳轉</div>
      </div>
      <div class="card-body">
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px">
          ${quickLinks.map(({page,icon,label,color}) => `
            <div onclick="navigateTo('${page}')" title="前往${label}"
                 style="cursor:pointer;padding:14px 8px;border:1px solid #e2e8f0;border-radius:8px;text-align:center;transition:all 0.15s;background:#fff"
                 onmouseover="this.style.background='${color}12';this.style.borderColor='${color}';this.style.transform='translateY(-2px)'"
                 onmouseout="this.style.background='#fff';this.style.borderColor='#e2e8f0';this.style.transform='none'">
              <i class="fas ${icon}" style="font-size:24px;color:${color};margin-bottom:7px;display:block"></i>
              <div style="font-size:12px;color:#334155;font-weight:600;line-height:1.4">${label}</div>
            </div>
          `).join('')}
        </div>
      </div>
    </div>

    <!-- ⑤ 資料核實摘要 -->
    <div style="margin-top:14px;padding:12px 16px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;font-size:12px;color:#64748b;display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:8px">
      <div><i class="fas fa-database" style="color:#1565c0"></i> <b>設施</b>：${facilities.length} 座（正常 ${statusCount.normal} ／需維護 ${statusCount.maintenance} ／損壞 ${statusCount.damaged}）</div>
      <div><i class="fas fa-fish" style="color:#0097a7"></i> <b>魚類</b>：${uniqueSpecies} 物種（易危 ${uniqueEndangered} ／近危 ${uniqueNearThreat}）共 ${totalFishCount} 尾</div>
      <div><i class="fas fa-leaf" style="color:#2e7d32"></i> <b>棲地</b>：${habitats.length} 樣站（電魚 + 水質）</div>
      <div><i class="fas fa-clipboard" style="color:#c62828"></i> <b>巡查</b>：${inspections.length} 筆（待處理 ${pending.length} ／已完成 ${inspections.length - pending.length}）</div>
      <div><i class="fas fa-exclamation-triangle" style="color:#ea580c"></i> <b>維護優先</b>：緊急 ${priorityCount.urgent} ／高 ${priorityCount.high} ／中 ${priorityCount.medium} ／低 ${priorityCount.low}</div>
      <div><i class="fas fa-ruler-combined" style="color:#6a1b9a"></i> <b>範圍</b>：0K+460 ～ 1K+400（橫流溪全段）</div>
    </div>
  `;

  // ── 圖表渲染 ────────────────────────────────────────────
  setTimeout(() => {
    // 設施狀況圓餅
    const fcCtx = document.getElementById('facilityStatusChart');
    if (fcCtx) {
      new Chart(fcCtx, {
        type: 'doughnut',
        data: {
          labels: [`正常 (${statusCount.normal})`, `需維護 (${statusCount.maintenance})`, `損壞 (${statusCount.damaged})`],
          datasets: [{
            data: [statusCount.normal, statusCount.maintenance, statusCount.damaged],
            backgroundColor: ['#4caf50', '#ff9800', '#f44336'],
            borderWidth: 2
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'bottom', labels: { font: { size: 12 }, boxWidth: 14 } },
            tooltip: { callbacks: { label: ctx => ` ${ctx.label}：${ctx.raw} 座` } }
          },
          onClick: () => navigateTo('facilities')
        }
      });
    }

    // 魚類族群堆疊橫條圖
    const fishCtx = document.getElementById('fishCountChart');
    if (fishCtx) {
      const speciesByYear = {};
      const allYears = new Set();
      fish.forEach(f => {
        const year = f.date ? new Date(f.date).getFullYear() : '未知';
        allYears.add(year);
        if (!speciesByYear[f.species]) {
          speciesByYear[f.species] = { conservation: f.conservation, years: {} };
        }
        speciesByYear[f.species].years[year] = (speciesByYear[f.species].years[year] || 0) + (f.count || 0);
      });
      const sortedYears = Array.from(allYears).sort();
      const speciesLabels = Object.keys(speciesByYear);
      const palette = ['#1565c0', '#00897b', '#7b1fa2', '#c62828', '#f57f17', '#0097a7'];
      const datasets = sortedYears.map((year, idx) => ({
        label: `${year}年`,
        data: speciesLabels.map(sp => speciesByYear[sp].years[year] || 0),
        backgroundColor: palette[idx % palette.length],
        borderRadius: 3
      }));
      new Chart(fishCtx, {
        type: 'bar',
        data: {
          labels: speciesLabels.map(sp => {
            const c = speciesByYear[sp].conservation;
            const icon = c === '瀕危' ? '🔴' : c === '易危' ? '🟠' : c === '近危' ? '🟡' : '🟢';
            return `${icon} ${sp}`;
          }),
          datasets
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          indexAxis: 'y',
          plugins: {
            legend: { display: true, position: 'bottom', labels: { font: { size: 11 }, boxWidth: 12 } },
            tooltip: { callbacks: { label: ctx => ` ${ctx.dataset.label}：${ctx.parsed.x} 尾` } }
          },
          scales: {
            x: { stacked: true, grid: { display: false }, title: { display: true, text: '尾數', font: { size: 10 } } },
            y: { stacked: true, ticks: { font: { size: 10 } } }
          },
          onClick: () => navigateTo('fish')
        }
      });
    }
  }, 100);
}
