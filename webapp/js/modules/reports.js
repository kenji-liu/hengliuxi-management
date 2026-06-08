// 報表分析模組
function renderReports() {
  const facilities = DB.getAll('facilities');
  const fish = DB.getAll('fish');
  const habitats = DB.getAll('habitats');
  const inspections = DB.getAll('inspections');

  document.getElementById('contentArea').innerHTML = `
    <div class="tabs">
      <button class="tab-btn active" onclick="switchReportTab('overview', this)">總覽統計</button>
      <button class="tab-btn" onclick="switchReportTab('facility', this)">設施分析</button>
      <button class="tab-btn" onclick="switchReportTab('ecology', this)">生態分析</button>
    </div>
    <div id="reportContent"></div>
  `;
  renderReportOverview(facilities, fish, habitats, inspections);
}

function switchReportTab(tab, btn) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  const f = DB.getAll('facilities'), fi = DB.getAll('fish'), h = DB.getAll('habitats'), i = DB.getAll('inspections');
  if (tab === 'overview') renderReportOverview(f, fi, h, i);
  else if (tab === 'facility') renderReportFacility(f, i);
  else renderReportEcology(fi, h);
}

function renderReportOverview(facilities, fish, habitats, inspections) {
  document.getElementById('reportContent').innerHTML = `
    <div class="report-grid">
      <div class="card" style="margin:0">
        <div class="card-header"><span class="card-title"><i class="fas fa-chart-pie"></i> 設施狀況</span></div>
        <div class="card-body"><div class="chart-container"><canvas id="rFacilityPie"></canvas></div></div>
      </div>
      <div class="card" style="margin:0">
        <div class="card-header"><span class="card-title"><i class="fas fa-chart-bar"></i> 魚類保育等級</span></div>
        <div class="card-body"><div class="chart-container"><canvas id="rFishConservation"></canvas></div></div>
      </div>
      <div class="card" style="margin:0">
        <div class="card-header"><span class="card-title"><i class="fas fa-chart-line"></i> 設施建造年度</span></div>
        <div class="card-body"><div class="chart-container"><canvas id="rFacilityYear"></canvas></div></div>
      </div>
      <div class="card" style="margin:0">
        <div class="card-header"><span class="card-title"><i class="fas fa-list-ol"></i> 巡查事項統計</span></div>
        <div class="card-body">
          ${[
            ['待處理', inspections.filter(i=>i.status==='待處理').length, 'warning'],
            ['處理中', inspections.filter(i=>i.status==='處理中').length, 'info'],
            ['已完成', inspections.filter(i=>i.status==='完成').length, 'success'],
            ['緊急事項', inspections.filter(i=>i.priority==='緊急').length, 'danger']
          ].map(([k,v,c]) => `
            <div style="margin-bottom:14px">
              <div class="flex items-center gap-2" style="justify-content:space-between;margin-bottom:6px">
                <span style="font-size:13px">${k}</span>
                <span class="badge badge-${c}">${v} 件</span>
              </div>
              <div class="progress-bar">
                <div class="progress-fill" style="width:${inspections.length>0?Math.round(v/inspections.length*100):0}%;background:var(--${c==='warning'?'warning':c==='info'?'secondary':c==='success'?'success':'danger'})"></div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  `;

  setTimeout(() => {
    const statusData = {
      '正常': facilities.filter(f=>f.status==='正常').length,
      '需維護': facilities.filter(f=>f.status==='需維護').length,
      '損壞': facilities.filter(f=>f.status==='損壞').length
    };
    new Chart(document.getElementById('rFacilityPie'), {
      type: 'doughnut',
      data: { labels: Object.keys(statusData), datasets: [{ data: Object.values(statusData), backgroundColor: ['#4caf50','#ff9800','#f44336'], borderWidth: 0 }] },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }
    });

    const conservationData = {};
    fish.forEach(f => { conservationData[f.conservation] = (conservationData[f.conservation] || 0) + f.count; });
    new Chart(document.getElementById('rFishConservation'), {
      type: 'bar',
      data: {
        labels: Object.keys(conservationData),
        datasets: [{ data: Object.values(conservationData), backgroundColor: ['#f44336','#ff9800','#00bcd4','#4caf50'], borderRadius: 4 }]
      },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }
    });

    const yearData = {};
    facilities.forEach(f => { if (f.year) yearData[f.year] = (yearData[f.year] || 0) + 1; });
    const years = Object.keys(yearData).sort();
    new Chart(document.getElementById('rFacilityYear'), {
      type: 'bar',
      data: { labels: years.map(y => `民國${y}年`), datasets: [{ label: '設施數', data: years.map(y => yearData[y]), backgroundColor: '#1a6b3c', borderRadius: 4 }] },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } } }
    });
  }, 100);
}

function renderReportFacility(facilities, inspections) {
  const subTypeColors = { '之字形魚道':'#1565c0','降壩魚道':'#0d47a1','潛越式魚道':'#00838f','階段式魚道':'#1976d2','斜坡魚道':'#0288d1','粗石斜曲面式魚道':'#4527a0','改良型舟通式魚道':'#00695c','固床工':'#827717','隔梳式固床工':'#558b2f','防砂構造物':'#795548','護岸':'#546e7a' };
  const bySubType = {};
  facilities.forEach(f => { const k = f.subType || f.type; bySubType[k] = (bySubType[k] || []).concat(f); });

  document.getElementById('reportContent').innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px">
      <div class="card" style="margin:0">
        <div class="card-header"><span class="card-title"><i class="fas fa-chart-bar"></i> 魚道子類型統計</span></div>
        <div class="card-body"><div class="chart-container"><canvas id="rSubTypeBar"></canvas></div></div>
      </div>
      <div class="card" style="margin:0">
        <div class="card-header"><span class="card-title"><i class="fas fa-chart-pie"></i> 設施類型比例</span></div>
        <div class="card-body"><div class="chart-container"><canvas id="rTypePie"></canvas></div></div>
      </div>
    </div>
    <div class="card">
      <div class="card-header"><span class="card-title"><i class="fas fa-list"></i> 子類型明細</span></div>
      <div class="card-body">
        ${Object.entries(bySubType).sort((a,b)=>b[1].length-a[1].length).map(([subType, items]) => {
          const avgCond = (items.reduce((s,f)=>s+(f.condition||0),0)/items.length).toFixed(1);
          const color = subTypeColors[subType] || '#455a64';
          const damaged = items.filter(f=>f.status==='損壞').length;
          const maint = items.filter(f=>f.status==='需維護').length;
          return `
            <div style="display:grid;grid-template-columns:auto 1fr auto auto;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid var(--border)">
              <span style="width:12px;height:12px;border-radius:50%;background:${color};display:inline-block;flex-shrink:0"></span>
              <span class="fw-600" style="font-size:14px">${subType}</span>
              <span style="font-size:12px;color:var(--text-muted)">平均 ${avgCond}★ · ${items.length} 座</span>
              <span>${damaged>0?`<span class="badge badge-danger">${damaged}損壞</span>`:maint>0?`<span class="badge badge-warning">${maint}需維護</span>`:`<span class="badge badge-success">正常</span>`}</span>
            </div>`;
        }).join('')}
      </div>
    </div>
    <div class="card">
      <div class="card-header"><span class="card-title"><i class="fas fa-exclamation-circle"></i> 需關注設施清單</span></div>
      <div class="card-body">
        <div class="table-container">
          <table>
            <thead><tr><th>設施名稱</th><th>子類型</th><th>里程</th><th>狀態</th><th>狀況評分</th><th>備註</th></tr></thead>
            <tbody>
              ${facilities.filter(f => f.status !== '正常' || f.condition <= 2).sort((a,b)=>(a.condition||5)-(b.condition||5)).map(f => `
                <tr>
                  <td class="fw-600">${f.name}</td>
                  <td><span style="background:${subTypeColors[f.subType]||'#455a64'};color:#fff;font-size:11px;padding:2px 7px;border-radius:10px">${f.subType||f.type}</span></td>
                  <td style="font-weight:700;color:#1565c0">${f.stationKm||'-'}</td>
                  <td><span class="badge badge-${f.status==='損壞'?'danger':'warning'}">${f.status}</span></td>
                  <td style="color:${f.condition<=2?'var(--danger)':'var(--warning)'}">${'★'.repeat(f.condition||0)}${'☆'.repeat(5-(f.condition||0))}</td>
                  <td class="truncate" style="max-width:200px" title="${f.note||''}">${(f.note||'-').substring(0,40)}${(f.note||'').length>40?'…':''}</td>
                </tr>
              `).join('') || '<tr><td colspan="6" style="text-align:center;color:var(--text-muted)">目前所有設施狀況良好</td></tr>'}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;

  setTimeout(() => {
    const stKeys = Object.keys(bySubType).sort((a,b)=>bySubType[b].length-bySubType[a].length);
    new Chart(document.getElementById('rSubTypeBar'), {
      type: 'bar',
      data: {
        labels: stKeys,
        datasets: [{ label: '數量', data: stKeys.map(k=>bySubType[k].length), backgroundColor: stKeys.map(k=>subTypeColors[k]||'#455a64'), borderRadius: 4 }]
      },
      options: { responsive:true, maintainAspectRatio:false, indexAxis:'y', plugins:{ legend:{display:false} }, scales:{ x:{ beginAtZero:true, ticks:{stepSize:1} } } }
    });
    const byType = {};
    facilities.forEach(f=>{ byType[f.type]=(byType[f.type]||0)+1; });
    const typeColors = { '魚道':'#1976d2','固床工':'#827717','防砂構造物':'#795548','護岸':'#546e7a' };
    new Chart(document.getElementById('rTypePie'), {
      type: 'doughnut',
      data: { labels: Object.keys(byType), datasets:[{ data:Object.values(byType), backgroundColor:Object.keys(byType).map(k=>typeColors[k]||'#9e9e9e'), borderWidth:0 }] },
      options: { responsive:true, maintainAspectRatio:false, plugins:{ legend:{ position:'bottom', labels:{font:{size:11}} } } }
    });
  }, 100);
}

function renderReportEcology(fish, habitats) {
  const totalFish = fish.reduce((s, f) => s + f.count, 0);
  document.getElementById('reportContent').innerHTML = `
    <div class="report-grid">
      <div class="card" style="margin:0">
        <div class="card-header"><span class="card-title"><i class="fas fa-fish"></i> 魚類多樣性</span></div>
        <div class="card-body">
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px">
            <div style="text-align:center;padding:12px;background:var(--surface2);border-radius:var(--radius)">
              <div class="fw-600" style="font-size:24px;color:var(--primary)">${fish.length}</div>
              <div class="text-muted">記錄物種數</div>
            </div>
            <div style="text-align:center;padding:12px;background:var(--surface2);border-radius:var(--radius)">
              <div class="fw-600" style="font-size:24px;color:var(--secondary)">${totalFish}</div>
              <div class="text-muted">調查總尾數</div>
            </div>
          </div>
          <div class="chart-container" style="height:220px"><canvas id="rFishPie"></canvas></div>
        </div>
      </div>
      <div class="card" style="margin:0">
        <div class="card-header"><span class="card-title"><i class="fas fa-leaf"></i> 棲地品質</span></div>
        <div class="card-body">
          ${habitats.map(h => `
            <div style="margin-bottom:12px">
              <div class="flex items-center gap-2" style="justify-content:space-between;margin-bottom:4px">
                <span style="font-size:13px;font-weight:500">${h.name}</span>
                <span style="font-size:12px;color:var(--text-muted)">${['','差','尚可','普通','良好','優良'][h.quality]}</span>
              </div>
              <div class="progress-bar">
                <div class="progress-fill" style="width:${h.quality*20}%;background:${['','#f44336','#ff9800','#ffc107','#8bc34a','#4caf50'][h.quality]}"></div>
              </div>
            </div>
          `).join('') || '<div class="empty-state"><i class="fas fa-leaf"></i><p>尚無棲地資料</p></div>'}
        </div>
      </div>
    </div>
    <div class="card">
      <div class="card-header"><span class="card-title"><i class="fas fa-shield-alt"></i> 保育魚類清單</span></div>
      <div class="card-body">
        <div class="table-container">
          <table>
            <thead><tr><th>物種</th><th>學名</th><th>保育等級</th><th>科別</th><th>調查尾數</th><th>位置</th></tr></thead>
            <tbody>
              ${fish.filter(f => f.conservation !== '一般').map(f => `
                <tr>
                  <td class="fw-600">${f.species}</td>
                  <td style="font-style:italic;color:var(--text-light)">${f.scientificName||'-'}</td>
                  <td><span class="badge badge-${f.conservation==='瀕危'?'danger':f.conservation==='易危'?'warning':'info'}">${f.conservation}</span></td>
                  <td>${f.family||'-'}</td>
                  <td>${f.count}</td>
                  <td>${f.location}</td>
                </tr>
              `).join('') || '<tr><td colspan="6" style="text-align:center;color:var(--text-muted)">無保育魚類記錄</td></tr>'}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;

  setTimeout(() => {
    new Chart(document.getElementById('rFishPie'), {
      type: 'pie',
      data: {
        labels: fish.map(f => f.species),
        datasets: [{ data: fish.map(f => f.count), backgroundColor: fish.map((_,i) => `hsl(${i * 50 + 120},60%,45%)`), borderWidth: 0 }]
      },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right', labels: { font: { size: 11 } } } } }
    });
  }, 100);
}
