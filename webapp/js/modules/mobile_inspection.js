(function () {
  const checklistSpec = [
    { key: 'trail', title: '步道', options: ['正常', '伏倒木或落石', '道路中斷', '道路基礎淘空', '其他'] },
    { key: 'slope', title: '邊坡', options: ['正常', '裸露/崩塌', '其他'] },
    { key: 'platform', title: '平臺/護欄', options: ['正常', '斷裂或破損', '表面耗損', '本體歪斜', '其他'] },
    { key: 'revetment', title: '護岸', options: ['正常', '結構外觀破損', '基礎淘空', '其他'] },
    { key: 'fishway', title: '魚道/防砂設施', options: ['正常', '結構外觀破損', '基礎淘空', '土砂淤積', '水位差過大', '斷流', '流速異常', '其他'] },
    { key: 'signage', title: '告示牌/解說牌', options: ['正常', '基礎裸露', '鋼材鏽蝕', '結構外觀破損', '其他'] },
    { key: 'lifebuoy', title: '救生圈', options: ['正常', '遺失', '其他'] }
  ];

  const derOptions = [
    ['0', '0 無異常'],
    ['1', '1 輕微'],
    ['2', '2 中等'],
    ['3', '3 明顯'],
    ['4', '4 嚴重']
  ];

  const state = { photos: [], position: null, lastAnalysis: null };
  const $ = id => document.getElementById(id);

  function today() {
    return new Date().toISOString().slice(0, 10);
  }

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, ch => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[ch]));
  }

  function initFacilitySelect() {
    const select = $('facilitySelect');
    const facilities = DB.getAll('facilities');
    select.innerHTML = '<option value="">請選擇設施</option>' + facilities.map(f => {
      const label = [f.name, f.stationKm].filter(Boolean).join(' / ');
      return `<option value="${f.id}">${escapeHtml(label)}</option>`;
    }).join('');
  }

  function initDerSelects() {
    ['derD', 'derE', 'derR', 'derU'].forEach(id => {
      $(id).innerHTML = derOptions.map(([value, label]) => `<option value="${value}">${label}</option>`).join('');
    });
  }

  function renderChecklist() {
    $('checklist').innerHTML = checklistSpec.map(item => `
      <section class="check-item" data-key="${item.key}" data-title="${item.title}">
        <div class="check-title">
          <span>${item.title}</span>
          <select class="handling">
            <option>定期巡查</option>
            <option>自行處理</option>
            <option>異常通報</option>
          </select>
        </div>
        <div class="chip-grid">
          ${item.options.map((option, index) => `
            <label class="chip">
              <input type="checkbox" class="condition" value="${option}" ${index === 0 ? 'checked' : ''}>
              ${option}
            </label>
          `).join('')}
        </div>
      </section>
    `).join('');

    document.querySelectorAll('.condition').forEach(input => {
      input.addEventListener('change', event => {
        const group = event.target.closest('.check-item');
        const normal = group.querySelector('.condition[value="正常"]');
        if (event.target.value === '正常' && event.target.checked) {
          group.querySelectorAll('.condition').forEach(item => {
            if (item !== normal) item.checked = false;
          });
        }
        if (event.target.value !== '正常' && event.target.checked) normal.checked = false;
        if (![...group.querySelectorAll('.condition')].some(item => item.checked)) normal.checked = true;
        updateAnalysis();
      });
    });

    document.querySelectorAll('.handling').forEach(input => input.addEventListener('change', updateAnalysis));
  }

  function collectChecklist() {
    return [...document.querySelectorAll('.check-item')].map(section => ({
      key: section.dataset.key,
      title: section.dataset.title,
      conditions: [...section.querySelectorAll('.condition:checked')].map(input => input.value),
      handling: section.querySelector('.handling').value
    }));
  }

  function getSelectedFacility() {
    const id = Number($('facilitySelect').value);
    return DB.getById('facilities', id) || null;
  }

  function analyzeRecord() {
    const checklist = collectChecklist();
    const notes = `${$('findings').value} ${$('action').value}`;
    const abnormalItems = checklist.filter(item => !item.conditions.includes('正常'));
    const notifyItems = checklist.filter(item => item.handling === '異常通報');
    const urgentTerms = ['道路中斷', '基礎淘空', '裸露/崩塌', '斷裂或破損', '本體歪斜', '遺失', '斷流', '水位差過大'];
    const urgentHits = abnormalItems.flatMap(item => item.conditions.filter(cond => urgentTerms.includes(cond)));
    const textUrgent = /(淘空|崩塌|中斷|斷裂|破損|歪斜|遺失|斷流|水位差|大豪雨|地震)/.test(notes);
    const derScore = ['derD', 'derE', 'derR', 'derU'].map(id => Number($(id).value)).reduce((sum, value) => sum + value, 0);
    const fishwayImpact = abnormalItems.some(item => item.key === 'fishway' && item.conditions.some(cond => cond !== '正常'));

    let priority = '低';
    let status = '已完成';
    let recommendation = '列入例行追蹤，維持每月一般性巡查。';
    let levelClass = '';

    if (notifyItems.length || urgentHits.length || textUrgent || derScore >= 10 || Number($('derU').value) >= 3) {
      priority = '緊急';
      status = '待處理';
      recommendation = '建議異常通報，通知分署及專業人員依表3-2、表3-3進行專業巡查與修繕必要性評估。';
      levelClass = 'danger';
    } else if (abnormalItems.length || derScore >= 5 || fishwayImpact) {
      priority = '中';
      status = '處理中';
      recommendation = '建議列管追蹤；若工作站無法自行處理，轉為異常通報並安排專業檢測。';
      levelClass = 'warning';
    }

    if (fishwayImpact) {
      recommendation += ' 魚道或防砂設施異常可能影響縱向廊道，需檢核破損、淤積、水位差、斷流與流速。';
    }

    return { priority, status, recommendation, abnormalItems, notifyItems, derScore, checklist, levelClass };
  }

  function updateAnalysis() {
    const result = analyzeRecord();
    state.lastAnalysis = result;
    const box = $('analysisBox');
    box.className = `analysis-box ${result.levelClass}`;
    const abnormalText = result.abnormalItems.length
      ? result.abnormalItems.map(item => `${item.title}: ${item.conditions.join('、')}`).join('；')
      : '未勾選異常項目';
    box.innerHTML = `
      <strong>異常分析：${result.priority}優先</strong>
      <p>${escapeHtml(abnormalText)}</p>
      <p>DER&U 加總 ${result.derScore}，系統判定狀態為「${result.status}」。${result.recommendation}</p>
    `;
  }

  function handleLocate() {
    if (!navigator.geolocation) {
      $('geoStatus').textContent = '此裝置不支援 GPS 定位';
      return;
    }
    $('geoStatus').textContent = '正在取得定位...';
    navigator.geolocation.getCurrentPosition(
      pos => {
        state.position = {
          lat: Number(pos.coords.latitude.toFixed(6)),
          lng: Number(pos.coords.longitude.toFixed(6)),
          accuracy: Math.round(pos.coords.accuracy)
        };
        $('geoStatus').textContent = `GPS ${state.position.lat}, ${state.position.lng}，誤差約 ${state.position.accuracy} m`;
      },
      err => { $('geoStatus').textContent = `定位失敗：${err.message}`; },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 }
    );
  }

  function handlePhotos(event) {
    const files = [...event.target.files].slice(0, 6 - state.photos.length);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = e => {
        state.photos.push({ name: file.name, type: file.type, dataUrl: e.target.result, capturedAt: new Date().toISOString() });
        renderPhotos();
      };
      reader.readAsDataURL(file);
    });
    event.target.value = '';
  }

  function renderPhotos() {
    $('photoPreview').innerHTML = state.photos.map(photo => `<img src="${photo.dataUrl}" alt="${escapeHtml(photo.name)}">`).join('');
  }

  function buildFindings(analysis) {
    const checklistText = analysis.checklist.map(item => `${item.title}: ${item.conditions.join('、')} / ${item.handling}`).join('；');
    const gpsText = state.position ? `GPS ${state.position.lat},${state.position.lng} 誤差${state.position.accuracy}m` : '未取得GPS';
    return [
      `巡查種類：${$('inspectionType').selectedOptions[0].textContent}`,
      $('eventReason').value ? `事件原因：${$('eventReason').value}` : '',
      `手冊表3-1巡查項目：${checklistText}`,
      $('locationNote').value ? `位置補充：${$('locationNote').value}` : '',
      $('findings').value ? `現況補充：${$('findings').value}` : '',
      gpsText
    ].filter(Boolean).join('\n');
  }

  function saveRecord(event) {
    event.preventDefault();
    updateAnalysis();
    const facility = getSelectedFacility();
    if (!facility) {
      alert('請先選擇巡查設施');
      return;
    }

    const analysis = state.lastAnalysis || analyzeRecord();
    DB.insert('inspections', {
      facilityId: facility.id,
      facilityName: facility.name,
      date: $('inspectionDate').value,
      inspector: $('inspector').value,
      weather: $('weather').value,
      findings: buildFindings(analysis),
      action: $('action').value || analysis.recommendation,
      status: analysis.status,
      priority: analysis.priority,
      inspectionType: $('inspectionType').value,
      eventReason: $('eventReason').value,
      deru_d: Number($('derD').value),
      deru_e: Number($('derE').value),
      deru_r: Number($('derR').value),
      deru_u: Number($('derU').value),
      mobileSubmission: true,
      manualBasis: '維護管理手冊：表3-1一般性定期巡查表單、表3-2/3-3專業性巡查表單、DER&U初判',
      gps: state.position,
      photos: state.photos,
      aiImageAnalysis: {
        confidence: .72,
        source: 'mobile-rule-analysis',
        summary: analysis.recommendation,
        abnormalItems: analysis.abnormalItems
      }
    });

    alert('已儲存巡查紀錄');
    state.photos = [];
    state.position = null;
    $('inspectionForm').reset();
    $('inspectionDate').value = today();
    $('geoStatus').textContent = '尚未取得 GPS 定位';
    renderPhotos();
    renderChecklist();
    initDerSelects();
    updateAnalysis();
    renderRecent();
  }

  function renderRecent() {
    const records = DB.getAll('inspections')
      .filter(item => item.mobileSubmission)
      .sort((a, b) => String(b.createdAt || b.date).localeCompare(String(a.createdAt || a.date)))
      .slice(0, 5);
    $('recentList').innerHTML = records.length ? records.map(item => `
      <article class="recent-card">
        <strong>${escapeHtml(item.facilityName || '未命名設施')}</strong>
        <span>${escapeHtml(item.date || '-')} / ${escapeHtml(item.priority || '-')} / ${escapeHtml(item.status || '-')}</span>
      </article>
    `).join('') : '<p class="status-line">尚無手機填報紀錄</p>';
  }

  function exportMobileData() {
    const records = DB.getAll('inspections').filter(item => item.mobileSubmission);
    const blob = new Blob([JSON.stringify(records, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `hengliuxi-mobile-inspections-${today()}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function bindEvents() {
    $('locateBtn').addEventListener('click', handleLocate);
    $('photoInput').addEventListener('change', handlePhotos);
    $('analyzeBtn').addEventListener('click', updateAnalysis);
    $('exportBtn').addEventListener('click', exportMobileData);
    $('inspectionForm').addEventListener('submit', saveRecord);
    ['inspectionType', 'eventReason', 'findings', 'action', 'derD', 'derE', 'derR', 'derU'].forEach(id => {
      $(id).addEventListener('change', updateAnalysis);
      $(id).addEventListener('input', updateAnalysis);
    });
  }

  function init() {
    $('inspectionDate').value = today();
    initFacilitySelect();
    initDerSelects();
    renderChecklist();
    bindEvents();
    updateAnalysis();
    renderRecent();
  }

  init();
}());
