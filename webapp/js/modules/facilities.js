// 工程設施管理模組
let facilityPage = 1;
const facilityPageSize = 14;   // 卡片模式每頁 14 筆（2 欄 × 7 列）
let facilityFilter = { keyword: '', type: '', status: '' };
let facilityViewMode = 'cards';  // 'cards' 或 'map'
let facilityMapInstance = null;  // Leaflet 地圖物件
let facilityPrimaryCategory = 'fishway';

const FACILITY_PRIMARY_CATEGORIES = [
  {
    key: 'fishway',
    label: '魚道設施',
    icon: 'fa-fish',
    color: '#1565c0',
    bg: '#eff6ff',
    border: '#bfdbfe',
    description: '維持河川縱向連通性，彙整魚道型式、通水、淤積、阻塞與魚類通行影響。'
  },
  {
    key: 'checkdam',
    label: '防砂壩',
    icon: 'fa-water',
    color: '#795548',
    bg: '#fff7ed',
    border: '#fed7aa',
    description: '記錄壩體型式、上游淤積、下游沖刷、壩基淘刷與調砂功能。'
  },
  {
    key: 'gradecontrol',
    label: '固床工',
    icon: 'fa-layer-group',
    color: '#2e7d32',
    bg: '#f0fdf4',
    border: '#bbf7d0',
    description: '管理河床穩定、上下游高差、沖刷跌水、兩岸銜接與淘空裂縫狀況。'
  },
  {
    key: 'platform',
    label: '平台設施',
    icon: 'fa-vector-square',
    color: '#7c3aed',
    bg: '#f5f3ff',
    border: '#ddd6fe',
    description: '管理觀察平台、工作平台與眺望平台，追蹤木構腐朽、鋼構鏽蝕與基礎穩定性。'
  },
  {
    key: 'revetment',
    label: '護岸設施',
    icon: 'fa-border-all',
    color: '#546e7a',
    bg: '#f8fafc',
    border: '#cbd5e1',
    description: '管理混凝土護岸與塊石護岸，追蹤坡腳沖刷、塊石位移與局部裂縫狀況。'
  }
];

/* ── TWD97 TM2（EPSG:3826）→ WGS84（EPSG:4326）線性轉換 ──
   錨點：TWD97(240716, 2674967) → WGS84(24.1757°N, 120.9086°E)
   來源：wdms.moenv.gov.tw 環境部官方座標轉換服務驗證 + 衛星圖對位校正
   比例：緯度 9.0090e-6 deg/m，經度 9.8810e-6 deg/m
   精度：±1~2m（滿足工程設施管理需求）── */
function fac_twd97ToWgs84(tx, ty) {
  const ax = 240716, ay = 2674967;
  const alat = 24.1713, alng = 120.9086;
  return {
    lat: +(alat + (ty - ay) * 9.0090e-6).toFixed(5),
    lng: +(alng + (tx - ax) * 9.8810e-6).toFixed(5)
  };
}

/* ══════════════════════════════════════════════════════════════
   健康指數計算（4維度加權，參照農水路工程設施維護管理手冊）
   維度一：結構安全         40 分
   維度二：通水/通魚功能    30 分
   維度三：魚類通行效果     20 分
   維度四：周邊環境         10 分
   ══════════════════════════════════════════════════════════════ */
/* DER 等級顏色對照 */
function fac_derColor(level) {
  if (!level || level === '-') return { text: '#94a3b8', bg: '#f1f5f9', border: '#e2e8f0', label: '未評估' };
  const l = level.toUpperCase();
  if (l.startsWith('A')) return { text: '#166534', bg: '#dcfce7', border: '#86efac', label: '良好' };
  if (l.startsWith('B')) return { text: '#92400e', bg: '#fef3c7', border: '#fcd34d', label: '輕微缺失' };
  if (l.startsWith('C')) return { text: '#c2410c', bg: '#ffedd5', border: '#fdba74', label: '顯著缺失' };
  if (l.startsWith('D')) return { text: '#b91c1c', bg: '#fee2e2', border: '#fca5a5', label: '嚴重缺失' };
  if (l.startsWith('E')) return { text: '#7f1d1d', bg: '#fee2e2', border: '#f87171', label: '危險' };
  if (l.startsWith('R')) return { text: '#7c3aed', bg: '#f5f3ff', border: '#c4b5fd', label: '緊急修復' };
  return { text: '#475569', bg: '#f8fafc', border: '#e2e8f0', label: level };
}

function fac_health(f) {
  const c = f.condition || 3;
  const dmg = f.status === '損壞' ? 2 : f.status === '需維護' ? 1 : 0;

  // 維度一：結構安全 (40)
  const structBase = {5:40,4:32,3:24,2:14,1:5}[c];
  const struct = Math.max(0, structBase - (dmg === 2 ? 22 : dmg === 1 ? 9 : 0));

  // 維度二：通水/通魚功能 (30)
  const funcBase = {5:30,4:24,3:18,2:10,1:3}[c];
  const func = Math.max(0, funcBase - (dmg === 2 ? 18 : dmg === 1 ? 6 : 0));

  // 維度三：魚類通行效果 (20) — 魚道設施較嚴格
  const fishW = (f.type === '魚道') ? {5:20,4:16,3:12,2:6,1:2}[c] : {5:18,4:14,3:10,2:6,1:2}[c];
  const fish = Math.max(0, fishW - (dmg === 2 ? 14 : dmg === 1 ? 4 : 0));

  // 維度四：周邊環境 (10)
  const env = {5:10,4:8,3:6,2:3,1:1}[c];

  return Math.min(95, Math.max(15, struct + func + fish + env));
}

function fac_linkedInspections(f) {
  const fid = Number(f?.id);
  return DB.getAll('inspections')
    .filter(item => Number(item.facilityId) === fid)
    .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
}

function fac_inspectionLinkage(f) {
  const inspections = fac_linkedInspections(f);
  const openItems = inspections.filter(item => item.status !== '完成');
  const aiItems = inspections.filter(item => item.aiImageAnalysis);
  const maxU = inspections.reduce((max, item) => {
    const aiU = item.aiImageAnalysis?.deru?.u || 0;
    return Math.max(max, Number(item.deru_u || 0), Number(aiU || 0));
  }, 0);
  const maxDamage = aiItems.reduce((max, item) => Math.max(max, Number(item.aiImageAnalysis?.damageCoverage || 0)), 0);
  const maxConfidence = aiItems.reduce((max, item) => Math.max(max, Number(item.aiImageAnalysis?.confidence || 0)), 0);
  const latest = inspections[0] || null;
  const features = [...new Set(aiItems.flatMap(item => item.aiImageAnalysis?.deteriorationFeatures || []))].slice(0, 5);

  const baseHealth = fac_health(f);
  const penalty = Math.min(55,
    openItems.length * 3 +
    Math.max(0, maxU - 1) * 8 +
    (maxDamage >= 50 ? 12 : maxDamage >= 25 ? 8 : maxDamage >= 5 ? 4 : 0)
  );
  const linkedHealth = Math.max(5, Math.round(baseHealth - penalty));
  const riskScore = Math.min(100, Math.max(0, 100 - linkedHealth + openItems.length * 3 + Math.max(0, maxU - 2) * 6));
  const riskLevel = riskScore >= 75 || maxU >= 4
    ? { label: '高風險', className: 'danger', color: '#c62828', bg: '#ffebee' }
    : riskScore >= 50 || maxU >= 3
      ? { label: '中風險', className: 'warning', color: '#e65100', bg: '#fff3e0' }
      : { label: '低風險', className: 'success', color: '#2e7d32', bg: '#e8f5e9' };

  const recommendations = [];
  if (!inspections.length) {
    recommendations.push('尚無巡查紀錄，建議建立首次巡查與影像基準。');
  } else if (maxU >= 4 || maxDamage >= 50) {
    recommendations.push('建議列為優先處置設施，安排現地複核與維修排程。');
    recommendations.push('針對AI辨識之高損壞範圍，補拍近景影像並比對前次巡查。');
  } else if (maxU >= 3 || openItems.length >= 2) {
    recommendations.push('建議提高巡查頻率，追蹤裂縫、沖刷、淤積或構件劣化是否擴大。');
  } else {
    recommendations.push('目前巡查風險偏低，維持例行巡查並保留影像作為後續比對基準。');
  }
  if (features.length) recommendations.push(`主要異常特徵：${features.join('、')}。`);

  return {
    inspections,
    openItems,
    aiItems,
    latest,
    features,
    baseHealth,
    linkedHealth,
    maxU,
    maxDamage,
    maxConfidence,
    riskScore,
    riskLevel,
    recommendations
  };
}

function fac_renderInspectionLinkageMini(f) {
  const link = fac_inspectionLinkage(f);
  const aiLabel = link.aiItems.length ? `${link.aiItems.length} 筆AI` : '未AI分析';
  const derLabel = link.maxU ? `最高U${link.maxU}` : '尚無DER&U';
  return `
    <div style="border:1px solid #e2e8f0;background:#f8fafc;border-radius:8px;padding:8px;margin-bottom:10px">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:6px">
        <span style="font-size:11px;font-weight:800;color:#334155"><i class="fas fa-camera-retro"></i> 巡查連動分析</span>
        <span class="badge badge-${link.riskLevel.className}">${link.riskLevel.label}</span>
      </div>
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px;text-align:center;font-size:11px">
        <div><b>${link.inspections.length}</b><br><span style="color:#64748b">巡查</span></div>
        <div><b>${link.openItems.length}</b><br><span style="color:#64748b">未結</span></div>
        <div><b>${aiLabel}</b><br><span style="color:#64748b">影像</span></div>
        <div><b>${derLabel}</b><br><span style="color:#64748b">風險</span></div>
      </div>
      <div style="height:5px;background:#e2e8f0;border-radius:4px;overflow:hidden;margin-top:7px">
        <div style="height:100%;width:${link.linkedHealth}%;background:${link.riskLevel.color};border-radius:4px"></div>
      </div>
      <div style="font-size:10.5px;color:#64748b;margin-top:4px">連動健康分數 ${link.linkedHealth}%${link.maxDamage ? ` · 最大損壞範圍 ${link.maxDamage}%` : ''}</div>
    </div>
  `;
}

function fac_renderInspectionLinkageDetail(f) {
  const link = fac_inspectionLinkage(f);
  const recent = link.inspections.slice(0, 5);
  return `
    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:12px">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:10px">
        <div style="font-weight:800;color:#0f172a"><i class="fas fa-link"></i> 工程設施與巡查異常連動分析</div>
        <span class="badge badge-${link.riskLevel.className}">${link.riskLevel.label}</span>
      </div>
      <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:8px;margin-bottom:10px">
        ${fac_linkageMetric('原健康', `${link.baseHealth}%`)}
        ${fac_linkageMetric('連動後', `${link.linkedHealth}%`)}
        ${fac_linkageMetric('巡查數', `${link.inspections.length}筆`)}
        ${fac_linkageMetric('未完成', `${link.openItems.length}筆`)}
        ${fac_linkageMetric('AI影像', `${link.aiItems.length}筆`)}
      </div>
      <div style="font-size:12px;line-height:1.65;color:#334155;margin-bottom:8px">
        <b>最高DER&U：</b>${link.maxU ? `U${link.maxU}` : '尚無評分'}　
        <b>最大AI判讀損壞範圍：</b>${link.maxDamage ? `${link.maxDamage}%` : '尚無影像判讀'}　
        <b>最高信心：</b>${link.maxConfidence ? `${Math.round(link.maxConfidence * 100)}%` : '-'}
      </div>
      <div style="background:#fff;border-left:3px solid ${link.riskLevel.color};border-radius:0 6px 6px 0;padding:8px 10px;font-size:12px;line-height:1.7;color:#334155;margin-bottom:8px">
        ${link.recommendations.map(item => `<div>${item}</div>`).join('')}
      </div>
      ${recent.length ? `
        <div style="display:grid;gap:6px">
          ${recent.map(item => `
            <div style="background:#fff;border:1px solid #e5e7eb;border-radius:6px;padding:8px;font-size:12px">
              <div style="display:flex;justify-content:space-between;gap:8px;margin-bottom:3px">
                <b>${item.date || '-'}</b>
                <span>${item.aiImageAnalysis ? `AI ${Math.round((item.aiImageAnalysis.confidence || 0) * 100)}%` : '未AI分析'} · ${item.priority || '-'}</span>
              </div>
              <div style="color:#475569">${String(item.findings || '').slice(0, 120)}</div>
            </div>
          `).join('')}
        </div>` : '<div style="font-size:12px;color:#64748b">尚無巡查紀錄。</div>'}
    </div>
  `;
}

/* ── 清單列展開/收合 ── */
function facListToggle(id) {
  const body  = document.getElementById(id);
  const arrow = document.getElementById(id + '_arrow');
  if (!body) return;
  const open = body.style.display !== 'none' && body.style.display !== '';
  body.style.display  = open ? 'none' : 'block';
  if (arrow) arrow.style.transform = open ? '' : 'rotate(180deg)';
}

/* ── 詳情欄位列 ── */
function facDetailRow(label, value) {
  if (!value || value === '-' || value === '' || value === 'undefined') return '';
  return `<div style="display:flex;justify-content:space-between;gap:10px;padding:6px 0;border-bottom:1px solid #f1f5f9;font-size:14px">
    <span style="color:#64748b;white-space:nowrap">${label}</span>
    <span style="font-weight:700;color:#0f172a;text-align:right">${value}</span>
  </div>`;
}

function fac_linkageMetric(label, value) {
  return `
    <div style="background:#fff;border:1px solid #e2e8f0;border-radius:6px;padding:8px;text-align:center">
      <div style="font-size:11px;color:#64748b;font-weight:700">${label}</div>
      <div style="font-size:17px;color:#0f172a;font-weight:800;margin-top:2px">${value}</div>
    </div>
  `;
}

/* ── 健康指數判斷依據文字說明 ── */
function fac_judgment(f) {
  const hp = fac_health(f);
  const c = f.condition || 3;
  const parts = [];

  // 結構狀態
  const condMap = {
    5: '主體結構完整，無明顯裂縫或破損',
    4: '結構良好，局部有輕微磨損，尚在合理範圍',
    3: '局部出現損傷，需定期監控避免惡化',
    2: '明顯劣化，裂縫或沖刷情形需盡速維修',
    1: '嚴重破損，結構完整性不足，有安全疑慮'
  };
  parts.push(condMap[c] || condMap[3]);

  // 功能評估（依設施類型）
  if (f.type === '魚道' || f.subType?.includes('魚道')) {
    if (f.status === '損壞') parts.push('魚道通行功能喪失，嚴重影響水域棲地連通性，需緊急清淤或結構修復');
    else if (f.status === '需維護') parts.push('魚道局部淤積或損傷，通行功能受阻，建議清淤並檢查水流路徑');
    else parts.push('魚道流速與水深符合通行標準（流速 ≤1.0m/s），棲地連通性正常');
  } else if (f.subType?.includes('固床') || f.type === '固床工') {
    if (f.status === '損壞') parts.push('固床工下游局部沖刷嚴重，床面高程不穩，排水功能受影響');
    else if (f.status === '需維護') parts.push('固床工坡腳或翼牆有輕微損傷，建議補強以維持床面穩定');
    else parts.push('固床工床面穩定，下游無明顯沖刷，功能正常');
  } else if (f.subType?.includes('防砂') || f.type === '壩堰') {
    if (f.status === '損壞') parts.push('防砂壩攔砂功能喪失，需評估壩體結構安全並清除堵塞');
    else if (f.status === '需維護') parts.push('壩前有中度土砂淤積，可能影響後續調砂功能，建議清淤');
    else parts.push('防砂壩上游回淤正常，攔砂功能完整');
  }

  // 維護建議
  if (hp >= 80) parts.push('建議維持現行定期巡查頻率（每季一次）');
  else if (hp >= 60) parts.push('建議加密巡查（每月），列為追蹤設施');
  else if (hp >= 40) parts.push('建議本年度優先安排維護，提報預算申請');
  else parts.push('建議緊急處理，立即安排工程搶修並通報主管單位');

  return `判斷依據：${parts.join('；')}，故健康指數評定為 ${hp} 分。`;
}

/* ── 照片 Lightbox ── */
let _pvPhotos = [], _pvIdx = 0;
function openPhotoViewer(photos, idx) {
  if (!Array.isArray(photos) || photos.length === 0) return;
  _pvPhotos = photos;
  _pvIdx = Math.max(0, Math.min(idx, photos.length - 1));

  let el = document.getElementById('facilityPhotoViewer');
  if (!el) {
    el = document.createElement('div');
    el.id = 'facilityPhotoViewer';
    el.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.92);z-index:9999;display:none;align-items:center;justify-content:center;padding:20px;';
    el.innerHTML = `
      <div style="position:relative;display:flex;align-items:center;gap:16px;max-width:90vw;max-height:90vh;width:100%;">
        <button id="pvPrevBtn" style="background:rgba(255,255,255,0.15);border:none;color:#fff;width:48px;height:48px;border-radius:50%;cursor:pointer;font-size:24px;flex-shrink:0;transition:background 0.15s;outline:none">&#8249;</button>
        <div style="position:relative;flex:1;display:flex;align-items:center;justify-content:center;">
          <img id="pvImg" src="" style="max-width:80vw;max-height:80vh;object-fit:contain;border-radius:4px;display:block;user-select:none;">
          <div id="pvCounter" style="position:absolute;bottom:16px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,0.6);color:#fff;font-size:13px;padding:4px 12px;border-radius:12px;white-space:nowrap;"></div>
        </div>
        <button id="pvNextBtn" style="background:rgba(255,255,255,0.15);border:none;color:#fff;width:48px;height:48px;border-radius:50%;cursor:pointer;font-size:24px;flex-shrink:0;transition:background 0.15s;outline:none">&#8250;</button>
        <button id="pvCloseBtn" style="position:absolute;top:12px;right:12px;background:rgba(255,255,255,0.15);border:none;color:#fff;width:40px;height:40px;border-radius:50%;cursor:pointer;font-size:20px;transition:background 0.15s;outline:none">✕</button>
      </div>`;

    const prevBtn = el.querySelector('#pvPrevBtn');
    const nextBtn = el.querySelector('#pvNextBtn');
    const closeBtn = el.querySelector('#pvCloseBtn');

    prevBtn.addEventListener('click', (e) => { e.stopPropagation(); pvMove(-1); });
    nextBtn.addEventListener('click', (e) => { e.stopPropagation(); pvMove(1); });
    closeBtn.addEventListener('click', (e) => { e.stopPropagation(); el.style.display = 'none'; });

    prevBtn.addEventListener('mouseover', (e) => { e.target.style.background = 'rgba(255,255,255,0.25)'; });
    prevBtn.addEventListener('mouseout', (e) => { e.target.style.background = 'rgba(255,255,255,0.15)'; });
    nextBtn.addEventListener('mouseover', (e) => { e.target.style.background = 'rgba(255,255,255,0.25)'; });
    nextBtn.addEventListener('mouseout', (e) => { e.target.style.background = 'rgba(255,255,255,0.15)'; });
    closeBtn.addEventListener('mouseover', (e) => { e.target.style.background = 'rgba(255,255,255,0.25)'; });
    closeBtn.addEventListener('mouseout', (e) => { e.target.style.background = 'rgba(255,255,255,0.15)'; });

    el.addEventListener('click', (e) => { if (e.target === el) el.style.display = 'none'; });

    // 鍵盤控制
    el._handleKey = (e) => {
      if (el.style.display === 'none') return;
      if (e.key === 'ArrowLeft') { e.preventDefault(); pvMove(-1); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); pvMove(1); }
      else if (e.key === 'Escape') { e.preventDefault(); el.style.display = 'none'; }
    };

    document.body.appendChild(el);
  }

  el.style.display = 'flex';
  document.addEventListener('keydown', el._handleKey);
  _pvRender();
}
function _pvRender() {
  const img = document.getElementById('pvImg');
  const counter = document.getElementById('pvCounter');
  if (img) img.src = _pvPhotos[_pvIdx] || '';
  if (counter) counter.textContent = `${_pvIdx + 1} / ${_pvPhotos.length}`;
}
function pvMove(dir) {
  _pvIdx = (_pvIdx + dir + _pvPhotos.length) % _pvPhotos.length;
  _pvRender();
}

/* ── Google Maps 衛星圖連結 ── */
function fac_gmapUrl(lat, lng) {
  const point = `${Number(lat).toFixed(6)},${Number(lng).toFixed(6)}`;
  return `https://www.google.com/maps/place/${encodeURIComponent(point)}/@${point},18z/data=!3m1!1e3`;
}

function fac_photoUrl(f) {
  const photos = Array.isArray(f?.photos) ? f.photos.filter(Boolean) : [];
  return photos.find(src => String(src).startsWith('/webapp/')) || photos[0] || '';
}

function fac_renderFacilityThumb(f, color = '#455a64') {
  const photo = fac_photoUrl(f);
  const profile = fac_mapProfile(f);
  const fallbackDisplay = photo ? 'none' : 'flex';
  return `
    <div style="position:relative;height:138px;margin:-14px -16px 12px;border-radius:10px 10px 0 0;overflow:hidden;background:#e2e8f0">
      ${photo ? `<img src="${photo}" alt="${f.name} 工程縮圖" loading="lazy"
        style="width:100%;height:100%;object-fit:cover;display:block"
        onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">` : ''}
      <div style="display:${fallbackDisplay};width:100%;height:100%;align-items:center;justify-content:center;background:linear-gradient(135deg,#e2e8f0,#f8fafc);color:${color}">
        <div style="width:56px;height:56px;border-radius:16px;background:${color};color:#fff;display:flex;align-items:center;justify-content:center;box-shadow:0 8px 24px rgba(15,23,42,.18)">
          ${fac_mapSvg(profile.key)}
        </div>
      </div>
      <div style="position:absolute;left:10px;top:10px;background:rgba(15,23,42,.78);color:#fff;border-radius:999px;padding:3px 8px;font-size:11px;font-weight:800">
        ${profile.label || f.type || '工程設施'}
      </div>
      <div style="position:absolute;right:10px;bottom:10px;background:rgba(255,255,255,.92);color:#334155;border-radius:999px;padding:3px 8px;font-size:11px;font-weight:800;border:1px solid rgba(148,163,184,.5)">
        ${f.stationKm || '-'}
      </div>
    </div>
  `;
}

function fac_mapProfile(f) {
  if (typeof facilityEngineeringProfile === 'function') return facilityEngineeringProfile(f);
  const text = `${f.name || ''} ${f.type || ''} ${f.subType || ''}`;
  if (/魚道|擳/.test(text)) return { key: 'fishway', label: '魚道', color: '#1565c0' };
  if (/防砂|壩|固床/.test(text)) return { key: 'checkdam', label: '防砂/固床', color: '#795548' };
  if (/護岸/.test(text)) return { key: 'revetment', label: '護岸', color: '#546e7a' };
  if (/平台/.test(text)) return { key: 'platform', label: '平台', color: '#7c3aed' };
  if (/步道/.test(text)) return { key: 'trail', label: '步道', color: '#0f766e' };
  return { key: 'facility', label: f.type || '工程設施', color: '#455a64' };
}

function fac_mapSvg(key) {
  if (typeof facilityEngineeringSvg === 'function') return facilityEngineeringSvg(key);
  const icon = {
    fishway: 'fa-fish',
    checkdam: 'fa-water',
    gradecontrol: 'fa-layer-group',
    revetment: 'fa-border-all',
    platform: 'fa-vector-square',
    trail: 'fa-route',
    facility: 'fa-hard-hat'
  }[key] || 'fa-hard-hat';
  return `<i class="fas ${icon}"></i>`;
}

function fac_primaryCategoryInfo(key) {
  return FACILITY_PRIMARY_CATEGORIES.find(item => item.key === key)
    || { key, label: key, icon: 'fa-hard-hat', color: '#455a64', bg: '#f8fafc', border: '#e2e8f0', description: '' };
}

function fac_primaryCategoryOf(f) {
  const code = String(f?.code || f?.facilityNo || '').trim().toUpperCase();
  const text = `${f?.name || ''} ${f?.type || ''} ${f?.subType || ''} ${f?.stationKm || ''}`;
  // 魚道（溪構 1-1,1-2,2,3,4,5-2,6,7,8-2）
  if (['1-1','1-2','2','3','4','5-2','6','7','8-2'].includes(code.toLowerCase())) return 'fishway';
  // 防砂壩（溪構 5-1, 8-1）
  if (['5-1','8-1'].includes(code.toLowerCase())) return 'checkdam';
  // 固床工（溪構 9, 10, 11）
  if (['9','10','11'].includes(code.toLowerCase())) return 'gradecontrol';
  // 平台（P1~P4 或含「平台/平臺」）
  if (/^P\d+$/.test(code) || /平台|平臺/.test(text)) return 'platform';
  // 護岸（RA 或含「護岸」）
  if (code === 'RA' || /護岸/.test(text)) return 'revetment';
  // 文字比對備援
  if (/魚道/.test(text)) return 'fishway';
  if (/防砂|壩堰/.test(text)) return 'checkdam';
  if (/固床/.test(text)) return 'gradecontrol';
  return 'other';
}

function fac_primaryCategoryRows() {
  const facilities = DB.getAll('facilities');
  return FACILITY_PRIMARY_CATEGORIES.map(category => ({
    ...category,
    count: facilities.filter(item => fac_primaryCategoryOf(item) === category.key).length
  }));
}

function renderFacilityPrimaryCategories() {
  const rows = fac_primaryCategoryRows();
  const current = fac_primaryCategoryInfo(facilityPrimaryCategory);
  return `
    <div style="background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:20px;margin-bottom:16px;box-shadow:0 2px 10px rgba(15,23,42,.04)">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:16px">
        <div>
          <h3 style="margin:0;font-size:22px;font-weight:900;color:#0f172a">工程設施盤點基本資料</h3>
        </div>
        <div style="font-size:14px;color:${current.color};background:${current.bg};border:1px solid ${current.border};border-radius:999px;padding:8px 14px;font-weight:800">
          目前分類：${current.label}
        </div>
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:14px">
        ${rows.map(category => {
          const active = facilityPrimaryCategory === category.key;
          return `
            <button type="button"
                    onclick="selectFacilityPrimaryCategory('${category.key}')"
                    style="text-align:left;border:${active?'2px':'1px'} solid ${active?category.color:category.border};
                           background:${active?category.bg:'#fff'};border-radius:12px;padding:16px;cursor:pointer;
                           box-shadow:${active?'0 8px 22px rgba(15,23,42,.12)':'none'};
                           outline:none;transition:box-shadow .15s">
              <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:12px">
                <div style="width:48px;height:48px;border-radius:12px;background:${category.color};color:#fff;
                            display:flex;align-items:center;justify-content:center;font-size:22px;flex-shrink:0">
                  <i class="fas ${category.icon}"></i>
                </div>
                <div style="font-size:32px;font-weight:900;color:${category.color};line-height:1">${category.count}</div>
              </div>
              <div style="font-size:24px;font-weight:900;color:#0f172a;margin-bottom:4px">${category.label}</div>
              <div style="font-size:14px;font-weight:800;color:${category.color};margin-top:12px">
                ${active ? '▶ 目前檢視中' : '展開設施清單'}
              </div>
            </button>
          `;
        }).join('')}
      </div>
    </div>
  `;
}

function selectFacilityPrimaryCategory(key) {
  facilityPrimaryCategory = key;
  facilityFilter.type = '';
  facilityPage = 1;
  renderFacilities();
}

function fac_filterPrimaryCategory(data) {
  if (!facilityPrimaryCategory) return data;
  return data.filter(item => fac_primaryCategoryOf(item) === facilityPrimaryCategory);
}

function fac_inspectionType(item = {}) {
  const text = `${item.sourceType || ''} ${item.type || ''} ${item.inspector || ''} ${item.profession || ''}`;
  if (text.includes('專業') || text.includes('技師') || text.includes('DER&U') || text.includes('工程')) return 'professional';
  if (text.includes('護管') || text.includes('巡護') || text.includes('林班') || text.includes('日常')) return 'ranger';
  return 'general';
}

function fac_inspectionTypeLabel(type) {
  return {
    general: '一般巡查紀錄',
    professional: '專業巡查紀錄',
    ranger: '護管員巡查紀錄'
  }[type] || '一般巡查紀錄';
}

function fac_facilityLinkedMaintenanceCases(f) {
  const inspections = fac_linkedInspections(f);
  return inspections
    .filter(item => item.status !== '完成' || item.priority === '高' || item.priority === '緊急' || item.aiImageAnalysis || item.deru_u >= 2)
    .map((item, index) => ({
      id: `M-${String(f.id).padStart(2, '0')}-${String(index + 1).padStart(2, '0')}`,
      source: item.sourceType || (item.type === 'deru_assessment' ? 'DER&U評估' : '巡查資料'),
      reportDate: item.date || f.lastInspect || '-',
      type: item.aiImageAnalysis ? 'AI影像輔助判釋' : (item.deru_u >= 3 ? '補強或修復評估' : '例行追蹤處理'),
      action: item.action || item.recommendation || item.aiImageAnalysis?.actionSuggestion || f.evaluationNotes || f.maintenanceStrategy || '建議由巡查結果建立維護處理紀錄。',
      status: item.status || '待處理',
      completedAt: item.completedAt || item.maintenanceComplete || '',
      followUp: item.followUpDate || item.nextInspect || '',
      photos: [
        ...(Array.isArray(item.photoDataUrls) ? item.photoDataUrls : []),
        ...(Array.isArray(item.photos) ? item.photos : [])
      ].filter(Boolean)
    }));
}

function renderFacilityMaintenanceCategoryPanel() {
  const inspections = DB.getAll('inspections');
  const facilities = DB.getAll('facilities');
  const openInspections = inspections.filter(item => item.status !== '完成');
  const maintenanceTargets = facilities.filter(item =>
    item.status === '需維護' || item.status === '損壞' || item.maintenance_priority === '高' || item.maintenance_priority === '緊急'
  );
  return `
    <div style="background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:16px;margin-bottom:16px;box-shadow:0 2px 10px rgba(15,23,42,.04)">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:12px">
        <div>
          <h3 style="margin:0;font-size:16px;font-weight:900;color:#0f172a">維護管理資料</h3>
          <div style="font-size:12px;color:#475569;line-height:1.65;margin-top:4px">
            區分現地巡查、專業檢核與後續維修管理，形成「巡查資料 → 異常判斷 → 維護案件 → 處理紀錄 → 後續追蹤」流程。
          </div>
        </div>
        <span style="font-size:12px;color:#0f766e;background:#ecfdf5;border:1px solid #a7f3d0;border-radius:999px;padding:6px 10px;font-weight:800">
          巡查 ${inspections.length} 筆 / 待處理 ${openInspections.length} 筆
        </span>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <div style="border:1px solid #bfdbfe;border-left:4px solid #1565c0;background:#eff6ff;border-radius:10px;padding:12px">
          <div style="font-size:14px;font-weight:900;color:#1e3a8a;margin-bottom:8px"><i class="fas fa-clipboard-check"></i> 巡查資料</div>
          <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:9px">
            ${['general','professional','ranger'].map(type => `
              <div style="background:#fff;border:1px solid #dbeafe;border-radius:8px;padding:8px;text-align:center">
                <div style="font-size:18px;font-weight:900;color:#1565c0">${inspections.filter(item => fac_inspectionType(item) === type).length}</div>
                <div style="font-size:11px;color:#475569;margin-top:2px">${fac_inspectionTypeLabel(type).replace('紀錄','')}</div>
              </div>
            `).join('')}
          </div>
          <div style="font-size:12px;color:#334155;line-height:1.6">記錄巡查日期、人員、單位、外觀狀況、裂縫破損、淤積阻塞、淘刷、現況照片、初步異常判斷與建議處理方式。</div>
        </div>
        <div style="border:1px solid #fed7aa;border-left:4px solid #ea580c;background:#fff7ed;border-radius:10px;padding:12px">
          <div style="font-size:14px;font-weight:900;color:#9a3412;margin-bottom:8px"><i class="fas fa-screwdriver-wrench"></i> 維護管理資料</div>
          <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:9px">
            ${[
              ['維護案件', maintenanceTargets.length],
              ['改善處理', openInspections.length],
              ['後續追蹤', inspections.filter(item => item.followUpDate || item.status === '處理中').length]
            ].map(([label, count]) => `
              <div style="background:#fff;border:1px solid #fed7aa;border-radius:8px;padding:8px;text-align:center">
                <div style="font-size:18px;font-weight:900;color:#ea580c">${count}</div>
                <div style="font-size:11px;color:#475569;margin-top:2px">${label}</div>
              </div>
            `).join('')}
          </div>
          <div style="font-size:12px;color:#334155;line-height:1.6">追蹤維護案件、改善處理、清淤補強、維修前中後照片、處理結果、完成狀態、成效評估與再次巡查需求。</div>
        </div>
      </div>
    </div>
  `;
}

function renderFacilityDetailTabsGuide(f) {
  const link = fac_inspectionLinkage(f);
  const cases = fac_facilityLinkedMaintenanceCases(f);
  const tabs = ['基本資料', '工程屬性', '現況照片', '巡查資料', '維護管理資料', '異常判斷與判斷依據'];
  return `
    <div style="background:#fff;border:1px solid #e2e8f0;border-radius:10px;padding:12px">
      <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px">
        ${tabs.map((tab, index) => `
          <span style="font-size:12px;font-weight:800;padding:6px 9px;border-radius:999px;border:1px solid ${index >= 3 ? '#fed7aa' : '#dbeafe'};background:${index >= 3 ? '#fff7ed' : '#eff6ff'};color:${index >= 3 ? '#9a3412' : '#1e3a8a'}">${tab}</span>
        `).join('')}
      </div>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px">
        ${fac_linkageMetric('巡查資料', `${link.inspections.length}筆`)}
        ${fac_linkageMetric('維護案件', `${cases.length}件`)}
        ${fac_linkageMetric('異常判斷', f.anomaly_level || f.status || '-')}
      </div>
    </div>
  `;
}

function renderFacilityInspectionDataSection(f) {
  const inspections = fac_linkedInspections(f);
  const groups = ['general', 'professional', 'ranger'];
  return `
    <div style="background:#f8fbff;border:1px solid #bfdbfe;border-left:4px solid #1565c0;border-radius:10px;padding:12px">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;margin-bottom:10px">
        <div>
          <div style="font-size:15px;font-weight:900;color:#1e3a8a"><i class="fas fa-clipboard-check"></i> 巡查資料</div>
          <div style="font-size:12px;color:#475569;margin-top:3px">重點為發現問題、記錄現況、影像留存與初步異常判斷。</div>
        </div>
        <span style="font-size:12px;color:#1565c0;background:#fff;border:1px solid #bfdbfe;border-radius:999px;padding:5px 9px;font-weight:800">${inspections.length} 筆巡查</span>
      </div>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:10px">
        ${groups.map(type => {
          const rows = inspections.filter(item => fac_inspectionType(item) === type);
          const latest = rows[0];
          return `
            <div style="background:#fff;border:1px solid #dbeafe;border-radius:8px;padding:10px">
              <div style="font-size:13px;font-weight:900;color:#1e3a8a;margin-bottom:6px">${fac_inspectionTypeLabel(type)}</div>
              <div style="font-size:22px;font-weight:900;color:#1565c0">${rows.length}</div>
              <div style="font-size:11px;color:#64748b;margin-top:4px">最近日期：${latest?.date || '-'}</div>
              <div style="font-size:11px;color:#64748b;margin-top:2px">人員：${latest?.inspector || '-'}</div>
            </div>
          `;
        }).join('')}
      </div>
      ${inspections.length ? `
        <div style="display:grid;gap:7px">
          ${inspections.slice(0, 5).map(item => `
            <div style="background:#fff;border:1px solid #e2e8f0;border-radius:8px;padding:9px;font-size:12px">
              <div style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;margin-bottom:4px">
                <b>${fac_inspectionTypeLabel(fac_inspectionType(item))}｜${item.date || '-'}</b>
                <span style="color:#64748b">${item.inspector || '-'}｜${item.priority || '未分級'}｜${item.status || '-'}</span>
              </div>
              <div style="color:#334155;line-height:1.55">${String(item.findings || item.note || '尚無發現事項摘要。').slice(0, 130)}</div>
              <div style="color:#475569;line-height:1.55;margin-top:3px"><b>建議處理：</b>${item.action || item.recommendation || '依現況持續追蹤，必要時建立維護案件。'}</div>
            </div>
          `).join('')}
        </div>
      ` : '<div style="background:#fff;border:1px dashed #bfdbfe;border-radius:8px;padding:12px;font-size:12px;color:#64748b">尚無巡查資料，建議建立一般巡查紀錄並補齊現況照片。</div>'}
    </div>
  `;
}

function renderFacilityMaintenanceDataSection(f) {
  const cases = fac_facilityLinkedMaintenanceCases(f);
  return `
    <div style="background:#fff7ed;border:1px solid #fed7aa;border-left:4px solid #ea580c;border-radius:10px;padding:12px">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;margin-bottom:10px">
        <div>
          <div style="font-size:15px;font-weight:900;color:#9a3412"><i class="fas fa-screwdriver-wrench"></i> 維護管理資料</div>
          <div style="font-size:12px;color:#475569;margin-top:3px">重點為追蹤問題處理、改善成果、維修前後照片與後續管理狀態。</div>
        </div>
        <span style="font-size:12px;color:#ea580c;background:#fff;border:1px solid #fed7aa;border-radius:999px;padding:5px 9px;font-weight:800">${cases.length} 件維護案件</span>
      </div>
      ${cases.length ? `
        <div style="display:grid;gap:8px">
          ${cases.map(item => `
            <div style="background:#fff;border:1px solid #fed7aa;border-radius:8px;padding:10px;font-size:12px">
              <div style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;margin-bottom:5px">
                <b>${item.id}｜${item.type}</b>
                <span style="color:#9a3412;font-weight:800">${item.status}</span>
              </div>
              <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:7px;margin-bottom:6px;color:#475569">
                <div><b>異常來源：</b>${item.source}</div>
                <div><b>通報日期：</b>${item.reportDate}</div>
                <div><b>完成時間：</b>${item.completedAt || '尚未完成'}</div>
              </div>
              <div style="color:#334155;line-height:1.55"><b>維護內容：</b>${item.action}</div>
              <div style="color:#475569;line-height:1.55;margin-top:3px"><b>後續追蹤：</b>${item.followUp || '建議於下次巡查確認處理成效。'}　<b>照片：</b>${item.photos.length ? `${item.photos.length} 張` : '待補'}</div>
            </div>
          `).join('')}
        </div>
      ` : `
        <div style="background:#fff;border:1px dashed #fed7aa;border-radius:8px;padding:12px;font-size:12px;color:#64748b">
          尚無由巡查異常建立的維護案件；若巡查判定有裂縫、破損、淤積、阻塞或淘刷，應建立維護案件並追蹤處理狀態。
        </div>
      `}
      <div style="margin-top:10px;background:#fff;border:1px solid #fed7aa;border-radius:8px;padding:10px;font-size:12px;color:#334155;line-height:1.6">
        流程：巡查資料建立 → 異常判斷 → 建立維護管理案件 → 維護處理紀錄 → 維護後照片上傳 → 後續追蹤巡查 → 結案或持續列管。
      </div>
    </div>
  `;
}

function openFacilityInGisEnhanced(id) {
  const f = DB.getById('facilities', id);
  if (!f) return;
  window.HLX_PENDING_GIS_FACILITY_ID = id;
  navigateTo('gis-enhanced');
  setTimeout(() => {
    const lat = f.lat || (f.twd97x ? fac_twd97ToWgs84(f.twd97x, f.twd97y).lat : null);
    const lng = f.lng || (f.twd97x ? fac_twd97ToWgs84(f.twd97x, f.twd97y).lng : null);
    if (lat && lng && typeof gisEnhancedMap !== 'undefined' && gisEnhancedMap) {
      gisEnhancedMap.setView([lat, lng], Math.max(gisEnhancedMap.getZoom(), 17), { animate: true });
    }
    if (typeof showFacilityDetailModalById === 'function') showFacilityDetailModalById(id);
    window.HLX_PENDING_GIS_FACILITY_ID = null;
  }, 700);
}

function ensurePlatformRevetmentFacilities() {
  const facilities = DB.getAll('facilities');
  const textOf = item => `${item.name || ''} ${item.type || ''} ${item.subType || ''} ${item.code || ''}`;
  const hasPlatform = code => facilities.some(item => /平台|平臺|撟喳/.test(textOf(item)) && String(item.code || '').toUpperCase() === code);
  const hasRevetment = facilities.some(item => /護岸|霅瑕硫/.test(textOf(item)));
  const base = {
    type: '平台',
    subType: '維護平台',
    year: null,
    status: '正常',
    material: '木構/鋼構',
    condition: 4,
    lastInspect: null,
    source: '設施分佈圖資 / 維護管理盤點',
    derLevel: 'B1-I',
    assessmentDate: null,
    riskScore: 18,
    maintenanceStrategy: '定期巡查',
    retirementEligible: false,
    evaluationNotes: '維護平台供巡查、觀察與維護作業使用，應定期檢查木構腐朽、鋼構鏽蝕與基礎穩定性。',
    river_segment: '橫流溪中上游',
    anomaly_type: null,
    anomaly_level: '正常',
    maintenance_priority: '低'
  };
  [
    { code: 'P1', name: '平臺1', stationKm: '步道1K+290', lat: 24.186900, lng: 120.909335, twd97x: 240789, twd97y: 2675725, km_num: 1290, photos: ['/webapp/assets/report-photos/platform1-field.webp'] },
    { code: 'P2', name: '平臺2', stationKm: '步道1K+280', lat: 24.186819, lng: 120.909404, twd97x: 240796, twd97y: 2675716, km_num: 1280, photos: ['/webapp/assets/report-photos/platform2-field.webp'] },
    { code: 'P3', name: '平臺3', stationKm: '步道1K+225', lat: 24.186295, lng: 120.909513, twd97x: 240807, twd97y: 2675658, km_num: 1225, photos: ['/webapp/assets/report-photos/platform3-field.webp'] },
    { code: 'P4', name: '平臺4', stationKm: '步道1K+170', lat: 24.185835, lng: 120.909631, twd97x: 240819, twd97y: 2675607, km_num: 1170, photos: ['/webapp/assets/report-photos/platform4-field.webp'] }
  ].forEach(item => {
    const existing = facilities.find(f => /平台|平臺/.test(textOf(f)) && String(f.code || '').toUpperCase() === item.code.toUpperCase());
    if (existing) {
      // 已存在：僅更新照片路徑
      DB.update('facilities', existing.id, { photos: item.photos });
      return;
    }
    DB.insert('facilities', {
      ...base,
      ...item,
      location: item.name,
      judgement_basis: '依設施分佈圖資補齊平台設施，納入工程設施管理與巡查維護。',
      note: `${item.name}位於${item.stationKm}，納入平台型態工程設施管理。`
    });
  });

  if (!hasRevetment) {
    DB.insert('facilities', {
      name: '護岸',
      type: '護岸',
      subType: '混凝土護岸',
      code: 'RA',
      stationKm: '0K+400~1K+400',
      location: '橫流溪兩岸護岸',
      twd97x: null,
      twd97y: null,
      lat: 24.183500,
      lng: 120.909200,
      km_num: 400,
      year: 107,
      status: '正常',
      material: '混凝土/塊石',
      length: 1000,
      condition: 4,
      lastInspect: '2025-03-15',
      source: '維護管理計畫 / 年度盤點',
      derLevel: 'B1-I',
      assessmentDate: '2025-03-15',
      riskScore: 22,
      maintenanceStrategy: '預防式',
      retirementEligible: false,
      evaluationNotes: '護岸整體結構完整，仍需注意坡腳沖刷、塊石位移與局部裂縫。',
      river_segment: '橫流溪0K+400~1K+400',
      anomaly_type: null,
      anomaly_level: '正常',
      maintenance_priority: '低',
      judgement_basis: '護岸範圍0K+400~1K+400，全長約1000m，納入工程設施管理。',
      note: '橫流溪0K+400~1K+400兩岸護岸，保護溪岸免受洪水沖刷侵蝕。',
      photos: ['/webapp/assets/report-photos/manual-p39-05-665x498.jpg']
    });
  }
}

function renderPlatformRevetmentSummary() {
  const facilities = DB.getAll('facilities');
  const textOf = item => `${item.name || ''} ${item.type || ''} ${item.subType || ''}`;
  const platforms = facilities.filter(item => /平台|平臺|撟喳/.test(textOf(item)));
  const revetments = facilities.filter(item => /護岸|霅瑕硫/.test(textOf(item)));
  const platformStations = platforms.map(item => item.stationKm).filter(Boolean).join('、') || '-';
  const revetmentStations = revetments.map(item => item.stationKm).filter(Boolean).join('、') || '-';
  return `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px">
      <div style="background:#f5f3ff;border:1px solid #ddd6fe;border-left:4px solid #7c3aed;border-radius:8px;padding:12px">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:10px">
          <div>
            <div style="font-size:12px;color:#6d28d9;font-weight:800"><i class="fas fa-vector-square"></i> 平台設施</div>
            <div style="font-size:22px;font-weight:900;color:#4c1d95;margin-top:2px">${platforms.length} 處</div>
            <div style="font-size:12px;color:#64748b;margin-top:2px">位置：${platformStations}</div>
          </div>
          <button class="btn btn-sm btn-outline" onclick="document.getElementById('facilityTypeFilter').value='平台';filterFacilities()" style="font-size:12px">查看平台</button>
        </div>
      </div>
      <div style="background:#f8fafc;border:1px solid #cbd5e1;border-left:4px solid #546e7a;border-radius:8px;padding:12px">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:10px">
          <div>
            <div style="font-size:12px;color:#334155;font-weight:800"><i class="fas fa-border-all"></i> 護岸設施</div>
            <div style="font-size:22px;font-weight:900;color:#1f2937;margin-top:2px">${revetments.length} 處</div>
            <div style="font-size:12px;color:#64748b;margin-top:2px">範圍：${revetmentStations}</div>
          </div>
          <button class="btn btn-sm btn-outline" onclick="document.getElementById('facilityTypeFilter').value='護岸';filterFacilities()" style="font-size:12px">查看護岸</button>
        </div>
      </div>
    </div>
  `;
}

function renderFacilities() {
  ensurePlatformRevetmentFacilities();
  document.getElementById('contentArea').innerHTML = `
    <!-- 工程設施盤點基本資料標題 -->
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;flex-wrap:wrap;gap:8px">
      <div>
        <h2 style="margin:0;font-size:18px;font-weight:800;color:var(--text)">工程設施盤點基本資料</h2>
        <div style="font-size:12px;color:#64748b;margin-top:4px">工程設施管理模組主要入口，依工程類別展開設施清單與詳細資料。</div>
      </div>
      <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">
        <div style="display:flex;gap:6px;background:#f1f5f9;padding:6px;border-radius:8px">
          <button id="fvm_cards_btn"
                  onclick="switchFacilityViewMode('cards')"
                  style="font-size:16px;padding:8px 18px;border:none;border-radius:6px;cursor:pointer;font-weight:700;transition:all .15s;
                         background:${facilityViewMode==='cards'?'#1565c0':'transparent'};
                         color:${facilityViewMode==='cards'?'#fff':'#475569'}">
            <i class="fas fa-th"></i> 卡片檢視
          </button>
          <button id="fvm_map_btn"
                  onclick="switchFacilityViewMode('map')"
                  style="font-size:16px;padding:8px 18px;border:none;border-radius:6px;cursor:pointer;font-weight:700;transition:all .15s;
                         background:${facilityViewMode==='map'?'#1565c0':'transparent'};
                         color:${facilityViewMode==='map'?'#fff':'#475569'}">
            <i class="fas fa-map"></i> 地圖檢視
          </button>
        </div>
        <button class="btn btn-primary" onclick="openFacilityForm()" style="font-size:16px;padding:8px 20px">
          <i class="fas fa-plus"></i> 新增設施
        </button>
      </div>
    </div>

    ${renderFacilityPrimaryCategories()}

    <!-- 篩選列 -->


    <!-- 設施卡片格或地圖容器 -->
    <div id="facilitiesContainer"></div>
  `;

  if (facilityViewMode === 'cards') {
    loadFacilitiesTable();
  } else if (facilityViewMode === 'map') {
    loadFacilitiesMap();
  }
}

function filterFacilities() {
  facilityFilter.keyword = document.getElementById('facilitySearch').value;
  facilityFilter.type = document.getElementById('facilityTypeFilter').value;
  facilityFilter.status = document.getElementById('facilityStatusFilter').value;
  facilityPage = 1;
  if (facilityViewMode === 'cards') {
    loadFacilitiesTable();
  } else {
    loadFacilitiesMap();
  }
}

/* ── 切換檢視模式（卡片 ↔ 地圖）── */
function switchFacilityViewMode(mode) {
  facilityViewMode = mode;
  facilityPage = 1;
  // 更新按鈕高亮
  const bCards = document.getElementById('fvm_cards_btn');
  const bMap   = document.getElementById('fvm_map_btn');
  if (bCards) {
    bCards.style.background = mode === 'cards' ? '#1565c0' : 'transparent';
    bCards.style.color      = mode === 'cards' ? '#fff'    : '#475569';
  }
  if (bMap) {
    bMap.style.background = mode === 'map' ? '#1565c0' : 'transparent';
    bMap.style.color      = mode === 'map' ? '#fff'    : '#475569';
  }
  if (mode === 'cards') {
    loadFacilitiesTable();
  } else {
    loadFacilitiesMap();
  }
}

function sortFacilitiesByTableOrder(data) {
  return data.sort((a, b) => {
    const aOrder = Number.isFinite(Number(a.tableOrder)) ? Number(a.tableOrder) : 9999;
    const bOrder = Number.isFinite(Number(b.tableOrder)) ? Number(b.tableOrder) : 9999;
    if (aOrder !== bOrder) return aOrder - bOrder;
    return String(a.stationKm || '').localeCompare(String(b.stationKm || ''), 'zh-Hant');
  });
}

function loadFacilitiesTable() {
  let data = DB.getAll('facilities');
  data = fac_filterPrimaryCategory(data);
  if (facilityFilter.keyword) {
    const kw = facilityFilter.keyword.toLowerCase();
    data = data.filter(f =>
      f.name.toLowerCase().includes(kw) ||
      (f.location || '').toLowerCase().includes(kw) ||
      (f.stationKm || '').includes(kw) ||
      String(f.twd97x || '').includes(kw) ||
      String(f.twd97y || '').includes(kw)
    );
  }
  if (facilityFilter.type)   data = data.filter(f => f.type === facilityFilter.type);
  if (facilityFilter.status) data = data.filter(f => f.status === facilityFilter.status);
  data = sortFacilitiesByTableOrder(data);

  const total = data.length;
  const pages = Math.ceil(total / facilityPageSize) || 1;
  const start = (facilityPage - 1) * facilityPageSize;
  const pageData = data.slice(start, start + facilityPageSize);
  const activeCategory = fac_primaryCategoryInfo(facilityPrimaryCategory);

  const container = document.getElementById('facilitiesContainer');
  if (!pageData.length) {
    container.innerHTML = '<div class="empty-state"><i class="fas fa-search"></i><p>查無符合條件的設施</p></div>';
    return;
  }

  const subTypeColor = {
    '之字形魚道':'#1565c0','降壩魚道':'#0d47a1','潛越式魚道':'#00838f',
    '階段式魚道':'#1976d2','斜坡魚道':'#0288d1','粗石斜曲面式魚道':'#4527a0',
    '改良型舟通式魚道':'#00695c','固床工':'#827717','隔梳式固床工':'#558b2f',
    '階梯式固床工':'#33691e','防砂構造物':'#795548','護岸':'#546e7a',
    '步道':'#6d4c41','平台':'#8d6e63'
  };
  const statusColor  = { '正常':'#2e7d32','需維護':'#e65100','損壞':'#c62828' };
  const statusBg     = { '正常':'#e8f5e9','需維護':'#fff3e0','損壞':'#ffebee' };
  const barColor     = { '正常':'#1a6b3c','需維護':'#f57c00','損壞':'#d32f2f' };

  container.innerHTML = `
    <!-- 麵包屑 + 統計列 -->
    <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:16px;padding:14px 18px;
                background:${activeCategory.bg};border:1px solid ${activeCategory.border};border-left:5px solid ${activeCategory.color};border-radius:10px;flex-wrap:wrap">
      <div>
        <div style="font-size:14px;color:${activeCategory.color};font-weight:700;margin-bottom:5px">
          工程設施盤點基本資料 ＞ ${activeCategory.label}
        </div>
        <div style="font-size:22px;font-weight:900;color:#0f172a">${activeCategory.label}設施清單</div>
        <div style="font-size:14px;color:#475569;margin-top:5px">共 ${total} 筆 · 點選列可查看詳情、照片、巡查紀錄與維護建議</div>
      </div>
      <div style="display:flex;gap:10px;flex-wrap:wrap">
        ${['正常','需維護','損壞'].map(s => {
          const cnt = data.filter(f => f.status === s).length;
          const c = statusColor[s] || '#475569';
          const bg = statusBg[s] || '#f5f5f5';
          return `<div style="background:${bg};border:1px solid ${c}44;border-radius:10px;padding:12px 16px;text-align:center;min-width:76px">
            <div style="font-size:26px;font-weight:900;color:${c}">${cnt}</div>
            <div style="font-size:13px;color:${c};font-weight:700;margin-top:3px">${s}</div>
          </div>`;
        }).join('')}
      </div>
    </div>

    <!-- 設施清單（一列一筆）-->
    <div style="display:flex;flex-direction:column;gap:10px;margin-bottom:16px">
      ${pageData.map(f => {
        const stc = subTypeColor[f.subType] || '#455a64';
        const hp  = fac_health(f);
        const sc  = statusColor[f.status]  || '#555';
        const sbg = statusBg[f.status]     || '#f5f5f5';
        const bc  = barColor[f.status]     || '#1a6b3c';
        const lat = f.lat  || (f.twd97x ? fac_twd97ToWgs84(f.twd97x, f.twd97y).lat : null);
        const lng = f.lng  || (f.twd97x ? fac_twd97ToWgs84(f.twd97x, f.twd97y).lng : null);
        const gmUrl = lat ? fac_gmapUrl(lat, lng) : null;
        const link = fac_inspectionLinkage(f);
        const rid = `facrow_${f.id}`;

        return `
        <!-- 主列 -->
        <div style="background:#fff;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;
                    box-shadow:0 1px 4px rgba(15,23,42,.05);transition:box-shadow .15s"
             onmouseover="this.style.boxShadow='0 4px 16px rgba(15,23,42,.10)'"
             onmouseout="this.style.boxShadow='0 1px 4px rgba(15,23,42,.05)'">

          <!-- 點擊列主體 -->
          <div style="display:grid;grid-template-columns:auto auto 1fr auto auto;gap:0;align-items:stretch;cursor:pointer"
               onclick="facListToggle('${rid}')">

            <!-- 左色帶 -->
            <div style="width:7px;background:${stc};border-radius:12px 0 0 0"></div>

            <!-- 縮圖 -->
            <div style="width:90px;flex-shrink:0;overflow:hidden;position:relative;background:#f1f5f9">
              ${fac_photoUrl(f)
                ? `<img src="${fac_photoUrl(f)}" alt="${f.name}"
                     style="width:90px;height:100%;object-fit:cover;display:block;min-height:90px"
                     onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">`
                : ''}
              <div style="display:${fac_photoUrl(f)?'none':'flex'};width:90px;height:100%;min-height:90px;
                           align-items:center;justify-content:center;background:${stc}18;color:${stc}">
                <i class="fas ${activeCategory.icon}" style="font-size:26px"></i>
              </div>
            </div>

            <!-- 主要資訊 -->
            <div style="padding:16px 20px">
              <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:9px">
                <span style="font-size:21px;font-weight:900;color:#0f172a">${f.name}</span>
                <span style="background:${stc}18;color:${stc};border:1px solid ${stc}44;border-radius:999px;padding:4px 12px;font-size:14px;font-weight:700">${f.subType || f.type || '-'}</span>
                <span style="background:${sbg};color:${sc};border:1px solid ${sc}44;border-radius:999px;padding:4px 12px;font-size:14px;font-weight:700">${f.status}</span>
              </div>
              <div style="display:flex;gap:20px;flex-wrap:wrap;font-size:15px;color:#475569;align-items:center">
                <span><i class="fas fa-route" style="color:${activeCategory.color};margin-right:6px"></i><b style="color:#1565c0;font-size:16px">${f.stationKm || '-'}</b></span>
                <span><i class="fas fa-calendar" style="margin-right:6px"></i>${f.lastInspect || '未巡查'}</span>
                ${f.material ? `<span><i class="fas fa-cube" style="margin-right:6px"></i>${f.material}</span>` : ''}
                ${link.openItems.length > 0
                  ? `<span style="color:#dc2626;font-weight:700"><i class="fas fa-exclamation-circle" style="margin-right:5px"></i>未結案件 ${link.openItems.length} 筆</span>`
                  : ''}
              </div>
            </div>

            <!-- DER 評等 -->
            ${(() => {
              const der = fac_derColor(f.derLevel);
              const displayLevel = f.derLevel || '—';
              return `
              <div style="padding:14px 20px;display:flex;flex-direction:column;align-items:center;justify-content:center;border-left:1px solid #f1f5f9;min-width:110px;gap:6px">
                <div style="background:${der.bg};border:2px solid ${der.border};border-radius:12px;padding:6px 14px;text-align:center">
                  <div style="font-size:28px;font-weight:900;color:${der.text};line-height:1.1;letter-spacing:1px">${displayLevel}</div>
                </div>
                <div style="font-size:12px;color:${der.text};font-weight:700">${der.label}</div>
                <div style="font-size:11px;color:#94a3b8;font-weight:600">DER 評等</div>
              </div>`;
            })()}

            <!-- 展開箭頭 -->
            <div style="padding:0 18px;display:flex;align-items:center;border-left:1px solid #f1f5f9">
              <i id="${rid}_arrow" class="fas fa-chevron-down" style="color:#94a3b8;font-size:18px;transition:transform .2s"></i>
            </div>
          </div>

          <!-- 展開詳情區 -->
          <div id="${rid}" style="display:none;border-top:2px solid ${stc}22">
            <div style="padding:20px;display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px">

              <!-- 基本屬性 -->
              <div style="background:#f8fafc;border-radius:10px;padding:16px">
                <div style="font-size:15px;font-weight:800;color:#0f172a;margin-bottom:12px"><i class="fas fa-info-circle" style="color:${stc}"></i> 基本屬性</div>
                ${facDetailRow('里程', f.stationKm)}
                ${facDetailRow('型式', f.subType || f.type)}
                ${facDetailRow('建造年', f.year ? f.year + ' 年' : '-')}
                ${facDetailRow('材料', f.material)}
                ${facDetailRow('DER&U 等級', f.derLevel || '-')}
                ${f.length ? facDetailRow('長度', f.length + ' m') : ''}
                ${f.width  ? facDetailRow('寬度', f.width  + ' m') : ''}
              </div>

              <!-- 位置與巡查 -->
              <div style="background:#f8fafc;border-radius:10px;padding:16px">
                <div style="font-size:15px;font-weight:800;color:#0f172a;margin-bottom:12px"><i class="fas fa-map-pin" style="color:#1565c0"></i> 位置與巡查</div>
                ${facDetailRow('TWD97 X', f.twd97x ? f.twd97x.toLocaleString() : '-')}
                ${facDetailRow('TWD97 Y', f.twd97y ? f.twd97y.toLocaleString() : '-')}
                ${lat ? facDetailRow('WGS84', `${lat.toFixed(5)}°N, ${lng.toFixed(5)}°E`) : ''}
                ${facDetailRow('上次巡查', f.lastInspect || '-')}
                ${facDetailRow('巡查筆數', link.inspections.length + ' 筆')}
                ${facDetailRow('未結案件', link.openItems.length + ' 筆')}
                ${lat ? `<a href="${gmUrl}" target="_blank" onclick="event.stopPropagation()"
                  style="display:inline-flex;align-items:center;gap:6px;margin-top:10px;background:#4285f4;color:#fff;
                         font-size:14px;font-weight:700;padding:7px 14px;border-radius:8px;text-decoration:none">
                  <i class="fas fa-map-marker-alt"></i> Google 衛星圖
                </a>` : ''}
              </div>

              <!-- 狀態評估 -->
              <div style="background:#f8fafc;border-radius:10px;padding:16px">
                <div style="font-size:15px;font-weight:800;color:#0f172a;margin-bottom:12px"><i class="fas fa-chart-bar" style="color:${bc}"></i> 狀態評估</div>
                <div style="display:flex;align-items:baseline;gap:8px;margin-bottom:10px">
                  <span style="font-size:36px;font-weight:900;color:${bc}">${hp}</span>
                  <span style="font-size:15px;color:#64748b">/ 100 分</span>
                </div>
                <div style="height:10px;background:#e9ecef;border-radius:5px;overflow:hidden;margin-bottom:12px">
                  <div style="height:100%;width:${hp}%;background:${bc};border-radius:5px"></div>
                </div>
                ${facDetailRow('風險等級', link.riskLevel.label)}
                ${facDetailRow('維護策略', f.maintenanceStrategy || '-')}
                ${f.evaluationNotes ? `<div style="margin-top:10px;font-size:13px;color:#475569;border-left:3px solid ${stc};padding-left:9px;line-height:1.65">${f.evaluationNotes}</div>` : ''}
              </div>
            </div>

            <!-- 操作按鈕列 -->
            <div style="padding:14px 20px 18px;display:flex;gap:10px;border-top:2px solid ${stc}22;flex-wrap:wrap" onclick="event.stopPropagation()">
              <button class="btn btn-primary" onclick="viewFacility(${f.id})" style="font-size:15px;padding:10px 22px">
                <i class="fas fa-eye"></i> 完整詳情
              </button>
              <button class="btn btn-outline" onclick="analyzeFacility(${f.id})" style="font-size:15px;padding:10px 22px">
                🤖 AI 分析
              </button>
              <button class="btn btn-outline" onclick="openDERUAssessmentForm(${f.id})"
                style="font-size:15px;padding:10px 22px;background:${f.derLevel==='A1'?'#e8f5e9':f.derLevel==='B1-I'?'#fff3e0':'#ffebee'};
                       border-color:${f.derLevel==='A1'?'#4caf50':f.derLevel==='B1-I'?'#ff9800':'#f44336'}">
                📊 DER&U 評估
              </button>
              <button class="btn btn-outline" onclick="openFacilityForm(${f.id})" style="font-size:15px;padding:10px 18px">
                <i class="fas fa-edit"></i> 編輯
              </button>
              <button class="btn btn-outline" onclick="deleteFacility(${f.id})"
                style="font-size:15px;padding:10px 18px;color:var(--danger);border-color:var(--danger)">
                <i class="fas fa-trash"></i>
              </button>
            </div>
          </div>
        </div>`;
      }).join('')}
    </div>

    <!-- 分頁 -->
    <div style="display:flex;align-items:center;justify-content:space-between;margin-top:4px">
      <span style="font-size:15px;color:#64748b">共 ${total} 筆，第 ${facilityPage} / ${pages} 頁</span>
      <div class="pagination">
        ${facilityPage > 1 ? `<button class="page-btn" onclick="facilityPage=${facilityPage-1};loadFacilitiesTable()">上一頁</button>` : ''}
        ${Array.from({length: pages}, (_,i) => `<button class="page-btn ${i+1===facilityPage?'active':''}" onclick="facilityPage=${i+1};loadFacilitiesTable()">${i+1}</button>`).join('')}
        ${facilityPage < pages ? `<button class="page-btn" onclick="facilityPage=${facilityPage+1};loadFacilitiesTable()">下一頁</button>` : ''}
      </div>
    </div>
  `;
}

/* ── 地圖檢視模式 ── */
function loadFacilitiesMap() {
  let data = DB.getAll('facilities');
  data = fac_filterPrimaryCategory(data);
  if (facilityFilter.keyword) {
    const kw = facilityFilter.keyword.toLowerCase();
    data = data.filter(f =>
      f.name.toLowerCase().includes(kw) ||
      (f.location || '').toLowerCase().includes(kw) ||
      (f.stationKm || '').includes(kw) ||
      String(f.twd97x || '').includes(kw) ||
      String(f.twd97y || '').includes(kw)
    );
  }
  if (facilityFilter.type)   data = data.filter(f => f.type === facilityFilter.type);
  if (facilityFilter.status) data = data.filter(f => f.status === facilityFilter.status);
  data = sortFacilitiesByTableOrder(data);
  const activeCategory = fac_primaryCategoryInfo(facilityPrimaryCategory);

  const container = document.getElementById('facilitiesContainer');
  container.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:10px;padding:10px 12px;background:${activeCategory.bg};border:1px solid ${activeCategory.border};border-left:4px solid ${activeCategory.color};border-radius:8px;flex-wrap:wrap">
      <div style="font-size:13px;color:#1e3a8a;line-height:1.55">
        <b style="color:${activeCategory.color}"><i class="fas ${activeCategory.icon}"></i> 工程設施盤點基本資料 ＞ ${activeCategory.label}地圖定位</b>
        <span style="margin-left:8px">採用衛星影像底圖、工程名稱標註與一致工程類別圖示；點選設施可開啟詳情或定位至GIS整合地圖。</span>
      </div>
      <button class="btn btn-sm btn-primary" onclick="navigateTo('gis-enhanced')" style="font-size:12px">
        <i class="fas fa-map"></i> 開啟GIS整合地圖
      </button>
    </div>
    <div id="facilityMapContainer" style="width:100%;height:600px;border-radius:8px;border:1px solid #e8ecf0;background:#f9fafb">
      <div id="facilityLeafletMap" style="width:100%;height:100%;border-radius:8px"></div>
    </div>
    <div style="margin-top:12px;padding:12px;background:#f9fafb;border-radius:8px;border:1px solid #e8ecf0">
      <p style="margin:0;font-size:13px;color:#64748b">
        <i class="fas fa-info-circle"></i> 地圖上顯示 ${data.length} 筆設施 | 點擊標記查看詳情
      </p>
    </div>
  `;

  // 初始化地圖（延遲執行以確保 DOM 已準備）
  setTimeout(() => {
    initFacilityMap(data);
  }, 100);
}

/* ── Leaflet 地圖初始化 ── */
function initFacilityMap(facilities) {
  const mapContainer = document.getElementById('facilityLeafletMap');
  if (!mapContainer) return;

  // 銷毀舊地圖實例
  if (facilityMapInstance) {
    facilityMapInstance.remove();
    facilityMapInstance = null;
  }

  // 建立新地圖實例，中心點在溪流中游
  const centerLat = 24.183;
  const centerLng = 120.909;
  facilityMapInstance = L.map('facilityLeafletMap').setView([centerLat, centerLng], 14);

  // 使用 OpenStreetMap 作為底圖（Google Maps 需要 API key）
  L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    attribution: 'Tiles &copy; Esri',
    maxZoom: 18,
    maxNativeZoom: 18
  }).addTo(facilityMapInstance);
  L.tileLayer('https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; CARTO',
    subdomains: 'abcd',
    maxZoom: 18,
    opacity: 0.9
  }).addTo(facilityMapInstance);

  // 顏色方案
  const subTypeColor = {
    '之字形魚道':'#1565c0','降壩魚道':'#0d47a1','潛越式魚道':'#00838f',
    '階段式魚道':'#1976d2','斜坡魚道':'#0288d1','粗石斜曲面式魚道':'#4527a0',
    '改良型舟通式魚道':'#00695c','固床工':'#827717','隔梳式固床工':'#558b2f',
    '階梯式固床工':'#33691e','防砂構造物':'#795548','護岸':'#546e7a',
    '步道':'#6d4c41','平台':'#8d6e63'
  };
  const statusColor = { '正常':'#2e7d32','需維護':'#e65100','損壞':'#c62828' };

  // 新增設施標記
  const markers = [];
  facilities.forEach(f => {
    const lat = f.lat || (f.twd97x ? fac_twd97ToWgs84(f.twd97x, f.twd97y).lat : null);
    const lng = f.lng || (f.twd97x ? fac_twd97ToWgs84(f.twd97x, f.twd97y).lng : null);

    if (!lat || !lng) return;

    const profile = fac_mapProfile(f);
    const color = profile.color || subTypeColor[f.subType] || '#455a64';
    const hp = fac_health(f);
    const statusC = statusColor[f.status] || '#555';

    // 建立自訂標記圖示
    const icon = L.divIcon({
      html: `<div style="position:relative;width:150px;height:76px;pointer-events:none">
              <div style="position:absolute;left:54px;top:8px;background:${color};width:36px;height:36px;border-radius:10px;
                         display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:17px;
                         border:3px solid ${statusC};box-shadow:0 3px 10px rgba(15,23,42,0.35);pointer-events:auto">
                ${fac_mapSvg(profile.key)}
              </div>
              <div style="position:absolute;left:50%;top:48px;transform:translateX(-50%);white-space:nowrap;
                         background:rgba(15,23,42,0.82);color:#fff;border-radius:999px;padding:2px 7px;
                         font-size:11px;font-weight:800;box-shadow:0 2px 5px rgba(15,23,42,0.25)">
                ${f.name}
              </div>
            </div>`,
      iconSize: [150, 76],
      iconAnchor: [75, 26],
      popupAnchor: [0, -26],
      className: 'facility-marker'
    });

    const marker = L.marker([lat, lng], { icon }).addTo(facilityMapInstance);

    // 標記点擊彈窗
    const popupHtml = `
      <div style="min-width:200px;font-size:12px">
        <div style="font-weight:700;font-size:13px;margin-bottom:4px;color:#1a1a1a">${f.name}</div>
        <div style="margin-bottom:6px;padding-bottom:6px;border-bottom:1px solid #e8ecf0">
          <span style="background:${color};color:#fff;font-size:10px;padding:2px 6px;border-radius:4px">${profile.label || f.subType || f.type}</span>
          <span style="background:${statusC};color:#fff;font-size:10px;padding:2px 6px;border-radius:4px;margin-left:4px">${f.status}</span>
        </div>
        <div style="font-size:11px;color:#64748b;margin-bottom:2px">
          <span style="font-weight:600">里程:</span> ${f.stationKm || '-'}
        </div>
        <div style="font-size:11px;color:#64748b;margin-bottom:2px">
          <span style="font-weight:600">健康度:</span> ${hp}%
          <div style="height:3px;background:#e9ecef;border-radius:2px;margin-top:2px;overflow:hidden">
            <div style="height:100%;width:${hp}%;background:${statusColor[f.status] || '#1a6b3c'};border-radius:2px"></div>
          </div>
        </div>
        <div style="font-size:10px;color:#94a3b8;margin-top:4px;font-family:monospace">
          ${lat.toFixed(5)}° N, ${lng.toFixed(5)}° E
        </div>
        <div style="display:flex;gap:6px;margin-top:8px">
        <button class="btn btn-sm btn-primary" onclick="viewFacility(${f.id})" style="flex:1;font-size:11px">
          <i class="fas fa-eye"></i> 檢視詳情
        </button>
        <button class="btn btn-sm btn-outline" onclick="openFacilityInGisEnhanced(${f.id})" style="flex:1;font-size:11px"><i class="fas fa-map"></i> GIS定位</button>
        </div>
      </div>
    `;

    marker.bindPopup(popupHtml);
    marker.bindTooltip(`${f.name}<br><span style="font-size:10px">${f.stationKm || ''}</span>`, {
      permanent: false,
      direction: 'top',
      offset: [0, -24],
      className: 'facility-map-tooltip'
    });
    markers.push(marker);
  });

  // 自動縮放至所有標記
  if (markers.length > 0) {
    const group = new L.featureGroup(markers);
    facilityMapInstance.fitBounds(group.getBounds().pad(0.1));
  }
}

function openFacilityForm(id = null) {
  const f = id ? DB.getById('facilities', id) : {};
  const isEdit = !!id;
  document.getElementById('modalTitle').textContent = isEdit ? '編輯工程設施' : '新增工程設施';
  document.getElementById('modalBody').innerHTML = `
    <div class="form-grid">
      <div class="form-group"><label>設施名稱 *</label><input id="f_name" type="text" value="${f.name || ''}" placeholder="例：橫流溪1號護岸"></div>
      <div class="form-group"><label>設施類型 *</label>
        <select id="f_type">
          ${['護岸','防砂構造物','固床工','魚道','步道','平台'].map(t => `<option value="${t}" ${f.type===t?'selected':''}>${t}</option>`).join('')}
        </select>
      </div>
      <div class="form-group full-width"><label>位置描述 *</label><input id="f_location" type="text" value="${f.location || ''}" placeholder="例：橫流溪上游 0+200"></div>
      <div class="form-group"><label>緯度</label><input id="f_lat" type="number" step="0.0001" value="${f.lat || ''}" placeholder="24.3890"></div>
      <div class="form-group"><label>經度</label><input id="f_lng" type="number" step="0.0001" value="${f.lng || ''}" placeholder="120.8650"></div>
      <div class="form-group"><label>建造年度（民國）</label><input id="f_year" type="number" value="${f.year || ''}" placeholder="108"></div>
      <div class="form-group"><label>建造材料</label><input id="f_material" type="text" value="${f.material || ''}" placeholder="混凝土、石籠等"></div>
      <div class="form-group"><label>設施狀態</label>
        <select id="f_status">
          ${['正常','需維護','損壞'].map(s => `<option value="${s}" ${f.status===s?'selected':''}>${s}</option>`).join('')}
        </select>
      </div>
      <div class="form-group"><label>狀況評分（1-5）</label>
        <select id="f_condition">
          ${[1,2,3,4,5].map(n => `<option value="${n}" ${f.condition===n?'selected':''}>${n} 分${'★'.repeat(n)}</option>`).join('')}
        </select>
      </div>
      <div class="form-group"><label>最後巡查日期</label><input id="f_lastInspect" type="date" value="${f.lastInspect || ''}"></div>
      <div class="form-group full-width"><label>備註</label><textarea id="f_note" rows="3">${f.note || ''}</textarea></div>
    </div>
  `;
  document.getElementById('modalFooter').innerHTML = `
    <button class="btn btn-outline" onclick="closeModal()">取消</button>
    <button class="btn btn-primary" onclick="saveFacility(${id || 'null'})">
      <i class="fas fa-save"></i> 儲存
    </button>
  `;
  openModal();
}

/* ── 跨模組連動同步：設施資料更新後同步至所有巡查紀錄 ── */
function syncFacilityUpdatesToInspections(facilityId, newName) {
  if (!facilityId) return;
  const inspections = DB.getAll('inspections');
  let updated = 0;
  inspections.forEach(row => {
    const rid = Number(row.facilityId || row.facility_id);
    if (rid !== Number(facilityId)) return;
    const needsNameSync = newName && (row.facilityName !== newName || row.facility_name !== newName);
    if (needsNameSync) {
      DB.update('inspections', row.id, {
        facilityName:  newName,
        facility_name: newName
      });
      updated++;
    }
  });
  if (updated > 0) console.log(`[Sync] Updated facilityName in ${updated} inspection records for facility #${facilityId}`);
}

function saveFacility(id) {
  const name = document.getElementById('f_name').value.trim();
  const location = document.getElementById('f_location').value.trim();
  if (!name || !location) { showToast('請填寫必填欄位', 'error'); return; }

  const item = {
    name, location,
    type: document.getElementById('f_type').value,
    lat: parseFloat(document.getElementById('f_lat').value) || null,
    lng: parseFloat(document.getElementById('f_lng').value) || null,
    year: parseInt(document.getElementById('f_year').value) || null,
    material: document.getElementById('f_material').value.trim(),
    status: document.getElementById('f_status').value,
    condition: parseInt(document.getElementById('f_condition').value),
    lastInspect: document.getElementById('f_lastInspect').value,
    note: document.getElementById('f_note').value.trim(),
    photos: id ? (DB.getById('facilities', id)?.photos || []) : []
  };

  if (id) {
    DB.update('facilities', id, item);
    syncFacilityUpdatesToInspections(id, name); // ← 連動同步巡查名稱
    showToast('設施資料已更新，關聯巡查紀錄已同步', 'success');
  } else {
    DB.insert('facilities', item);
    showToast('設施已新增', 'success');
  }
  closeModal(); loadFacilitiesTable();
}

/* ══════════════════════════════════════════════════════════════
   健康指數重新評定模組
   ══════════════════════════════════════════════════════════════ */
function openHealthEvalModal(facilityId) {
  const f = DB.getById('facilities', facilityId);
  if (!f) return;

  const inspections = fac_linkedInspections(f);
  const link        = fac_inspectionLinkage(f);
  const currentHp   = fac_health(f);
  const currentC    = f.condition || 3;
  const currentS    = f.status || '正常';

  const condDesc = {
    5: '主體完整，無裂縫或破損，功能正常',
    4: '結構良好，局部輕微磨損，尚在合理範圍',
    3: '局部損傷，需定期監控避免惡化',
    2: '明顯劣化，裂縫或沖刷需盡速修復',
    1: '嚴重破損，結構完整性不足，有安全疑慮'
  };
  const bcColor = hp => hp >= 80 ? '#2e7d32' : hp >= 60 ? '#f57c00' : hp >= 40 ? '#e65100' : '#c62828';

  const recentInsp = inspections.slice(0, 3);
  const latestMaint = inspections.filter(i => i.status === '完成').slice(0, 2);

  document.getElementById('modalTitle').textContent = `健康指數重新評定 — ${f.name}`;
  document.getElementById('modal').style.maxWidth = '760px';
  document.getElementById('modal').style.width = '94vw';

  document.getElementById('modalBody').innerHTML = `
    <div style="display:grid;gap:16px;font-size:15px">

      <!-- 目前狀態 -->
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px">
        <div style="background:#f8fafc;border-radius:10px;padding:14px;text-align:center">
          <div style="font-size:13px;color:#64748b;margin-bottom:4px">目前健康指數</div>
          <div style="font-size:40px;font-weight:900;color:${bcColor(currentHp)}">${currentHp}</div>
        </div>
        <div style="background:#f8fafc;border-radius:10px;padding:14px;text-align:center">
          <div style="font-size:13px;color:#64748b;margin-bottom:4px">巡查連動後</div>
          <div style="font-size:40px;font-weight:900;color:${bcColor(link.linkedHealth)}">${link.linkedHealth}</div>
          <div style="font-size:12px;color:#64748b;margin-top:4px">${link.riskLevel.label}</div>
        </div>
        <div style="background:#f8fafc;border-radius:10px;padding:14px;text-align:center">
          <div style="font-size:13px;color:#64748b;margin-bottom:4px">待結案件</div>
          <div style="font-size:40px;font-weight:900;color:${link.openItems.length > 0 ? '#c62828' : '#2e7d32'}">${link.openItems.length}</div>
          <div style="font-size:12px;color:#64748b;margin-top:4px">筆未完成</div>
        </div>
      </div>

      <!-- 最新巡查摘要 -->
      ${recentInsp.length ? `
      <div style="background:#eff6ff;border:1px solid #bfdbfe;border-left:4px solid #1565c0;border-radius:10px;padding:14px">
        <div style="font-size:15px;font-weight:800;color:#1e3a8a;margin-bottom:10px">
          <i class="fas fa-clipboard-check"></i> 最新巡查紀錄（近 ${recentInsp.length} 筆）
        </div>
        ${recentInsp.map(item => `
          <div style="background:#fff;border:1px solid #dbeafe;border-radius:8px;padding:10px;margin-bottom:8px">
            <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:6px">
              <span style="font-size:14px;font-weight:700;color:#0f172a">${item.date || '-'}</span>
              <div style="display:flex;gap:6px">
                <span style="background:${item.status==='完成'?'#dcfce7':item.status==='處理中'?'#fef9c3':'#fee2e2'};
                             color:${item.status==='完成'?'#166534':item.status==='處理中'?'#854d0e':'#b91c1c'};
                             padding:2px 8px;border-radius:999px;font-size:12px;font-weight:700">${item.status}</span>
                <span style="background:#f1f5f9;color:#475569;padding:2px 8px;border-radius:999px;font-size:12px">${item.priority || '-'}</span>
              </div>
            </div>
            <div style="font-size:13px;color:#334155;line-height:1.6">${String(item.findings || '').slice(0, 120)}${item.findings?.length > 120 ? '…' : ''}</div>
            ${item.action ? `<div style="font-size:13px;color:#475569;margin-top:5px"><b>處理：</b>${String(item.action).slice(0, 80)}</div>` : ''}
          </div>
        `).join('')}
      </div>` : `
      <div style="background:#f8fafc;border:1px dashed #cbd5e1;border-radius:10px;padding:14px;font-size:14px;color:#64748b">
        <i class="fas fa-info-circle"></i> 尚無巡查紀錄，建議先完成現場巡查再評定健康指數。
      </div>`}

      <!-- 維護後成果 -->
      ${latestMaint.length ? `
      <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-left:4px solid #16a34a;border-radius:10px;padding:14px">
        <div style="font-size:15px;font-weight:800;color:#166534;margin-bottom:10px">
          <i class="fas fa-screwdriver-wrench"></i> 近期維護完成記錄
        </div>
        ${latestMaint.map(item => `
          <div style="background:#fff;border:1px solid #bbf7d0;border-radius:8px;padding:10px;margin-bottom:8px">
            <div style="font-size:14px;font-weight:700;color:#0f172a;margin-bottom:5px">${item.date || '-'} ｜ 完成</div>
            <div style="font-size:13px;color:#334155;line-height:1.6">${String(item.action || item.findings || '').slice(0, 120)}</div>
          </div>
        `).join('')}
      </div>` : ''}

      <!-- ── 評定調整區 ── -->
      <div style="background:#fff7ed;border:1px solid #fed7aa;border-left:4px solid #ea580c;border-radius:10px;padding:16px">
        <div style="font-size:16px;font-weight:800;color:#9a3412;margin-bottom:14px">
          <i class="fas fa-sliders-h"></i> 依巡查與維護成果調整評定
        </div>

        <!-- 結構狀況評分 -->
        <div style="margin-bottom:16px">
          <div style="font-size:15px;font-weight:700;color:#0f172a;margin-bottom:10px">
            結構狀況評分（目前：${currentC} 分）
          </div>
          <div style="display:grid;gap:6px">
            ${[5,4,3,2,1].map(score => `
              <label style="display:flex;align-items:flex-start;gap:10px;padding:10px 12px;border-radius:8px;cursor:pointer;
                            border:2px solid ${currentC===score?'#ea580c':'#e2e8f0'};
                            background:${currentC===score?'#fff7ed':'#fff'};transition:border-color .15s"
                     onmouseover="this.style.borderColor='#ea580c'"
                     onmouseout="this.style.borderColor=document.querySelector('input[name=heval_cond]:checked')?.value==${score}?'#ea580c':'#e2e8f0'">
                <input type="radio" name="heval_cond" value="${score}" ${currentC===score?'checked':''}
                       style="margin-top:3px;accent-color:#ea580c;flex-shrink:0" onchange="fac_calcHealthPreview()">
                <div>
                  <span style="font-size:15px;font-weight:800;color:#ea580c">${score} 分</span>
                  <span style="font-size:14px;color:#334155;margin-left:6px">— ${condDesc[score]}</span>
                </div>
              </label>`).join('')}
          </div>
        </div>

        <!-- 設施狀態 -->
        <div style="margin-bottom:16px">
          <div style="font-size:15px;font-weight:700;color:#0f172a;margin-bottom:8px">設施狀態（目前：${currentS}）</div>
          <div style="display:flex;gap:10px;flex-wrap:wrap">
            ${['正常','需維護','損壞'].map(s => {
              const sc = s==='損壞'?'#dc2626':s==='需維護'?'#f59e0b':'#16a34a';
              return `<label style="display:flex;align-items:center;gap:8px;padding:10px 16px;border:2px solid ${currentS===s?sc:'#e2e8f0'};
                                   border-radius:8px;cursor:pointer;background:${currentS===s?sc+'18':'#fff'};font-size:15px;font-weight:700;color:${sc}">
                <input type="radio" name="heval_status" value="${s}" ${currentS===s?'checked':''}
                       style="accent-color:${sc}" onchange="fac_calcHealthPreview()">
                ${s}
              </label>`;
            }).join('')}
          </div>
        </div>

        <!-- 評定說明 -->
        <div style="margin-bottom:14px">
          <div style="font-size:15px;font-weight:700;color:#0f172a;margin-bottom:6px">評定說明（巡查/維護依據）</div>
          <textarea id="heval_notes" rows="3" placeholder="說明評定依據，例如：巡查發現裂縫已修補完成，結構穩定；維護後水流通暢，恢復正常通行功能…"
            style="width:100%;padding:10px;border:1px solid #e2e8f0;border-radius:8px;font-size:14px;line-height:1.6;resize:vertical;box-sizing:border-box"
          >${f.evaluationNotes || ''}</textarea>
        </div>

        <!-- 即時預覽 -->
        <div style="background:#fff;border:1px solid #e2e8f0;border-radius:10px;padding:14px">
          <div style="font-size:14px;color:#64748b;margin-bottom:8px;font-weight:600">評定後健康指數預覽</div>
          <div style="display:flex;align-items:center;gap:16px">
            <div id="heval_preview_num" style="font-size:44px;font-weight:900;color:${bcColor(currentHp)}">${currentHp}</div>
            <div style="flex:1">
              <div style="height:12px;background:#e9ecef;border-radius:6px;overflow:hidden">
                <div id="heval_bar" style="height:100%;width:${currentHp}%;background:${bcColor(currentHp)};border-radius:6px;transition:width .3s,background .3s"></div>
              </div>
              <div id="heval_preview_desc" style="font-size:13px;color:#64748b;margin-top:6px">${fac_healthLabel(currentHp)}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  document.getElementById('modalFooter').innerHTML = `
    <button class="btn btn-outline" onclick="closeModal()" style="font-size:15px;padding:9px 20px">取消</button>
    <button class="btn btn-primary" onclick="saveHealthEval(${facilityId})" style="font-size:15px;padding:9px 22px">
      <i class="fas fa-check-circle"></i> 確認評定並儲存
    </button>
  `;

  openModal();

  // 初始化 radio 高亮
  setTimeout(() => {
    document.querySelectorAll('input[name="heval_cond"]').forEach(el => {
      el.addEventListener('change', () => {
        document.querySelectorAll('label:has(input[name="heval_cond"])').forEach(lb => {
          const checked = lb.querySelector('input')?.checked;
          lb.style.borderColor = checked ? '#ea580c' : '#e2e8f0';
          lb.style.background  = checked ? '#fff7ed' : '#fff';
        });
      });
    });
    document.querySelectorAll('input[name="heval_status"]').forEach(el => {
      el.addEventListener('change', () => {
        const statusColors = { '正常':'#16a34a','需維護':'#f59e0b','損壞':'#dc2626' };
        document.querySelectorAll('label:has(input[name="heval_status"])').forEach(lb => {
          const inp = lb.querySelector('input');
          const sc  = statusColors[inp?.value] || '#64748b';
          lb.style.borderColor = inp?.checked ? sc : '#e2e8f0';
          lb.style.background  = inp?.checked ? sc+'18' : '#fff';
        });
      });
    });
  }, 80);
}

function fac_healthLabel(hp) {
  if (hp >= 85) return '結構優良，維持定期巡查';
  if (hp >= 70) return '狀況良好，加強追蹤監測';
  if (hp >= 50) return '需追蹤改善，列入維護計畫';
  if (hp >= 30) return '高風險，優先排入維修';
  return '緊急處置，立即通報處理';
}

function fac_calcHealthPreview() {
  const condEl   = document.querySelector('input[name="heval_cond"]:checked');
  const statusEl = document.querySelector('input[name="heval_status"]:checked');
  if (!condEl || !statusEl) return;

  const condition = parseInt(condEl.value);
  const status    = statusEl.value;
  const hp = fac_health({ condition, status });

  const bc = hp >= 80 ? '#2e7d32' : hp >= 60 ? '#f57c00' : hp >= 40 ? '#e65100' : '#c62828';
  const numEl  = document.getElementById('heval_preview_num');
  const barEl  = document.getElementById('heval_bar');
  const descEl = document.getElementById('heval_preview_desc');
  if (numEl)  { numEl.textContent = hp; numEl.style.color = bc; }
  if (barEl)  { barEl.style.width = hp + '%'; barEl.style.background = bc; }
  if (descEl) descEl.textContent = fac_healthLabel(hp);
}

function saveHealthEval(facilityId) {
  const f = DB.getById('facilities', facilityId);
  if (!f) return;

  const condEl   = document.querySelector('input[name="heval_cond"]:checked');
  const statusEl = document.querySelector('input[name="heval_status"]:checked');
  const notes    = document.getElementById('heval_notes')?.value?.trim() || '';

  if (!condEl || !statusEl) { showToast('請完整選擇評分與狀態', 'warning'); return; }

  const newCondition = parseInt(condEl.value);
  const newStatus    = statusEl.value;
  const newHp        = fac_health({ condition: newCondition, status: newStatus });
  const today        = new Date().toISOString().split('T')[0];

  DB.update('facilities', facilityId, {
    condition:       newCondition,
    status:          newStatus,
    evaluationNotes: notes || f.evaluationNotes,
    judgement_basis: notes
      ? `${today} 依巡查與維護成果評定：${notes}（健康指數 ${newHp} 分）`
      : f.judgement_basis,
    lastHealthEval:  today,
    assessmentDate:  today
  });

  syncFacilityUpdatesToInspections(facilityId, f.name); // ← 連動同步
  showToast(`${f.name} 健康指數已更新為 ${newHp} 分，關聯資料已同步`, 'success');
  closeModal();
  loadFacilitiesTable();
}

function viewFacility(id) {
  const f = DB.getById('facilities', id);
  if (!f) return;
  const stars    = n => `<span style="color:#f59e0b">${'★'.repeat(n)}${'☆'.repeat(5-n)}</span>`;
  const scMap    = { '正常':'success','需維護':'warning','損壞':'danger' };
  const hp       = fac_health(f);
  const lat      = f.lat  || (f.twd97x ? fac_twd97ToWgs84(f.twd97x, f.twd97y).lat : null);
  const lng      = f.lng  || (f.twd97x ? fac_twd97ToWgs84(f.twd97x, f.twd97y).lng : null);
  const gmUrl    = lat ? fac_gmapUrl(lat, lng) : null;
  const barColor = { '正常':'#1a6b3c','需維護':'#f57c00','損壞':'#d32f2f' }[f.status] || '#1a6b3c';
  const activeCategory = fac_primaryCategoryInfo(fac_primaryCategoryOf(f));

  document.getElementById('modalTitle').textContent = `設施詳細資訊 — ${f.name}`;
  document.getElementById('modalBody').innerHTML = `
    <div style="display:grid;gap:12px">
      <div style="background:${activeCategory.bg};border:1px solid ${activeCategory.border};border-left:4px solid ${activeCategory.color};border-radius:8px;padding:10px 12px">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap">
          <div style="font-size:13px;font-weight:900;color:#0f172a">工程設施盤點基本資料 ＞ ${activeCategory.label} ＞ 設施詳細資訊</div>
          <span style="font-size:12px;font-weight:800;color:${activeCategory.color};background:#fff;border:1px solid ${activeCategory.border};border-radius:999px;padding:4px 9px">
            <i class="fas ${activeCategory.icon}"></i> ${activeCategory.label}
          </span>
        </div>
        <div style="font-size:12px;color:#475569;line-height:1.6;margin-top:5px">本頁彙整基本資料、工程屬性、空間定位、現況照片、巡查紀錄、異常判斷與維護管理建議。</div>
      </div>

      ${renderFacilityDetailTabsGuide(f)}

      <!-- ① 座標區塊（TWD97 → WGS84 → Google Maps） -->
      <div style="background:#e8f5e9;border:1px solid #a5d6a7;border-radius:8px;padding:12px 14px">
        <div style="font-size:11px;font-weight:700;color:#1b5e20;margin-bottom:8px;letter-spacing:0.5px">
          📐 座標資訊（TWD97 → WGS84 轉換）
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:12px">
          <div>
            <div style="color:#555;margin-bottom:2px">TWD97 X（橫坐標）</div>
            <div style="font-family:monospace;font-weight:700;color:#1a1a1a">${f.twd97x ? f.twd97x.toLocaleString() : '-'}</div>
          </div>
          <div>
            <div style="color:#555;margin-bottom:2px">TWD97 Y（縱坐標）</div>
            <div style="font-family:monospace;font-weight:700;color:#1a1a1a">${f.twd97y ? f.twd97y.toLocaleString() : '-'}</div>
          </div>
          <div>
            <div style="color:#555;margin-bottom:2px">WGS84 緯度 (°N)</div>
            <div style="font-family:monospace;font-weight:700;color:#0d47a1">${lat?.toFixed(5) || '-'}</div>
          </div>
          <div>
            <div style="color:#555;margin-bottom:2px">WGS84 經度 (°E)</div>
            <div style="font-family:monospace;font-weight:700;color:#0d47a1">${lng?.toFixed(5) || '-'}</div>
          </div>
        </div>
        ${gmUrl ? `
        <a href="${gmUrl}" target="_blank"
           style="display:inline-flex;align-items:center;gap:6px;margin-top:10px;
                  background:#4285f4;color:#fff;padding:6px 14px;border-radius:20px;
                  font-size:12px;font-weight:700;text-decoration:none">
          <i class="fas fa-map-marker-alt"></i>
          Google Maps 精確位置（衛星圖，zoom 18）
        </a>` : ''}
      </div>

      <!-- ② 基本資訊格 -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        ${f.stationKm ? `<div style="grid-column:1/-1;background:#e3f2fd;border-left:4px solid #1565c0;padding:8px 12px;border-radius:4px">
          <span style="font-size:13px;color:#1565c0;font-weight:700">📍 里程桩號：${f.stationKm}</span>
          ${f.source ? `<span style="font-size:11px;color:#888;margin-left:8px">📄 ${f.source}</span>` : ''}
        </div>` : ''}
        ${[
          ['設施子類型', f.subType || f.type],
          ['建造年度',   f.year ? `民國 ${f.year} 年` : '-'],
          ['位置描述',   f.location || '-'],
          ['建造材料',   f.material || '-'],
          ['狀況評分',   stars(f.condition || 0)],
          ['最後巡查',   f.lastInspect || '-']
        ].map(([k,v]) => `
          <div>
            <div style="font-size:11px;color:var(--text-muted);margin-bottom:3px">${k}</div>
            <div style="font-size:13px;font-weight:600">${v}</div>
          </div>`).join('')}
        <div style="grid-column:1/-1">
          <div style="font-size:11px;color:var(--text-muted);margin-bottom:4px">設施狀態</div>
          <span class="badge badge-${scMap[f.status]||'default'}" style="font-size:12px;padding:3px 10px">${f.status}</span>
        </div>
      </div>

      <!-- ③ 健康指數 + 判斷依據 -->
      <div style="background:#f8fafc;border-radius:8px;padding:12px">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">
          <span style="font-size:12px;font-weight:600;color:#475569">健康指數</span>
          <span style="font-size:16px;font-weight:700;color:${barColor}">${hp}%</span>
        </div>
        <div style="height:8px;background:#e2e8f0;border-radius:4px;overflow:hidden;margin-bottom:8px">
          <div style="height:100%;width:${hp}%;background:${barColor};border-radius:4px"></div>
        </div>
        <!-- 等級標籤 -->
        <div style="display:flex;gap:6px;margin-bottom:8px">
          ${[['≥80 優良','#2e7d32','#e8f5e9'],['60~79 良好','#1565c0','#e3f2fd'],['40~59 普通','#e65100','#fff3e0'],['<40 劣化','#c62828','#ffebee']].map(([label,c,bg]) =>
            `<span style="font-size:10px;padding:2px 7px;border-radius:8px;background:${bg};color:${c};font-weight:${hp>=(parseInt(label)||0)?700:400};border:1px solid ${c}${hp>=(parseInt(label)||0)?'':'44'}">${label}</span>`
          ).join('')}
        </div>
        <!-- 判斷依據 -->
        <div style="background:#fffde7;border-left:3px solid #f9a825;border-radius:0 6px 6px 0;padding:8px 10px;font-size:11.5px;line-height:1.7;color:#555">
          <strong style="color:#f57c00">⚖ 判斷依據</strong><br>${fac_judgment(f)}
        </div>
      </div>

      <!-- ④ 巡查資料與維護管理資料 -->
      ${renderFacilityInspectionDataSection(f)}
      ${renderFacilityMaintenanceDataSection(f)}
      ${fac_renderInspectionLinkageDetail(f)}

      ${f.note ? `<div style="font-size:12px;line-height:1.7;color:#444;padding:10px;background:#fafafa;border-radius:6px;border:1px solid #eee">${f.note}</div>` : ''}

      <!-- ⑤ 照片（可點選放大，左右切換） -->
      ${f.photos?.length ? `
      <div>
        <div style="font-size:12px;font-weight:600;color:#555;margin-bottom:6px">📷 現場照片（${f.photos.length} 張）<span style="font-size:10px;color:#aaa;font-weight:400;margin-left:4px">點擊可放大</span></div>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px" class="facility-photos-grid">
          ${f.photos.map((p,i) => `
            <div style="position:relative;cursor:pointer" class="facility-photo-thumb" data-photo-index="${i}">
              <img src="${p}" alt="照片${i+1}"
                   style="width:100%;aspect-ratio:1;object-fit:cover;border-radius:6px;border:2px solid #e0e0e0;transition:transform 0.15s;display:block"
                   onmouseover="this.style.transform='scale(1.03)'" onmouseout="this.style.transform=''"
                   onerror="this.parentElement.style.display='none'">
              <div style="position:absolute;bottom:4px;right:4px;background:rgba(0,0,0,0.5);color:#fff;font-size:10px;padding:1px 5px;border-radius:6px">🔍</div>
            </div>`).join('')}
        </div>
      </div>` : ''}
    </div>
  `;
  document.getElementById('modalFooter').innerHTML = `
    <button class="btn btn-outline" onclick="closeModal()">關閉</button>
    ${gmUrl ? `<a href="${gmUrl}" target="_blank" class="btn btn-outline" style="display:inline-flex;align-items:center;gap:6px;background:#4285f4;color:#fff;border-color:#4285f4"><i class="fas fa-map-marker-alt"></i> Google Maps</a>` : ''}
    <button class="btn btn-primary" onclick="closeModal();openFacilityForm(${id})"><i class="fas fa-edit"></i> 編輯</button>
  `;
  openModal();

  // 綁定照片點擊事件（延遲以確保DOM更新）
  setTimeout(() => {
    const photosGrid = document.querySelector('.facility-photos-grid');
    if (photosGrid && f.photos?.length) {
      photosGrid.querySelectorAll('.facility-photo-thumb').forEach(thumb => {
        thumb.addEventListener('click', (e) => {
          e.stopPropagation();
          const idx = parseInt(thumb.dataset.photoIndex) || 0;
          openPhotoViewer(f.photos, idx);
        });
      });
    }
  }, 10);
}

// AI 分析彈窗
function analyzeFacility(id) {
  const f = DB.getById('facilities', id);
  if (!f) return;
  const inspections = DB.getAll('inspections').filter(i => i.facilityId === id);
  const linkage = fac_inspectionLinkage(f);
  const statusColor = { '正常': 'success', '需維護': 'warning', '損壞': 'danger' };
  const riskScore = f.status === '損壞' ? 91 : f.status === '需維護' ? (f.condition <= 2 ? 74 : 55) : (f.condition <= 3 ? 38 : 18);
  const riskLevel = riskScore >= 80 ? { label: '高風險', color: '#c62828', bg: '#ffebee' }
    : riskScore >= 55 ? { label: '中風險', color: '#e65100', bg: '#fff3e0' }
    : { label: '低風險', color: '#2e7d32', bg: '#e8f5e9' };

  const docSources = {
    '魚道': ['107-108年成果報告（第4章）', '115年棲地連通性簡報', '114-115年巡查紀錄'],
    '固床工': ['107-108年成果報告（附錄二）', '114-115年巡查紀錄'],
    '防砂構造物': ['107-108年成果報告（第3章）', '維管手冊（設施維護篇）'],
    '步道': ['維護管理手冊（步道維護）', '巡查紀錄（步道）'],
    '平台': ['維護管理手冊（平台維護）', '巡查紀錄（平台）'],
    '護岸': ['107-108年成果報告（第3章）', '維管計畫（年度盤點）']
  };
  const sources = docSources[f.type] || ['107-108年成果報告'];

  const suggestions = f.status === '損壞'
    ? ['🔴 立即停止使用，安排緊急搶修', '🔴 通報上級單位並拍照記錄', '🔴 評估是否影響棲地連通性']
    : f.status === '需維護'
    ? ['🟠 本年度優先編列維護預算', '🟠 下次巡查時進行詳細量測', '🟠 比對前後期照片確認惡化趨勢']
    : ['✅ 維持現行定期巡查頻率', '✅ 下次巡查依維管手冊執行', '✅ 持續記錄環境因子變化'];

  document.getElementById('modalTitle').textContent = `AI 分析報告 — ${f.name}`;
  document.getElementById('modalBody').innerHTML = `
    <div style="display:flex;gap:12px;margin-bottom:16px;align-items:flex-start">
      <div style="flex:1;padding:14px;background:${riskLevel.bg};border-radius:8px;border-left:4px solid ${riskLevel.color}">
        <div style="font-size:12px;color:${riskLevel.color};font-weight:600;margin-bottom:4px">風險評分</div>
        <div style="font-size:32px;font-weight:700;color:${riskLevel.color}">${riskScore}</div>
        <div style="font-size:13px;color:${riskLevel.color}">${riskLevel.label}</div>
      </div>
      <div style="flex:2">
        <div style="font-size:13px;color:var(--text-muted);margin-bottom:6px">設施狀態</div>
        <span class="badge badge-${statusColor[f.status]||'default'}" style="font-size:13px;padding:4px 12px">${f.status}</span>
        <div style="margin-top:10px;font-size:13px"><b>最後巡查：</b>${f.lastInspect||'-'}</div>
        <div style="font-size:13px"><b>巡查紀錄：</b>${inspections.length} 筆</div>
      </div>
    </div>
    ${fac_renderInspectionLinkageDetail(f)}
    <div class="card" style="margin-bottom:12px">
      <div class="card-body" style="padding:12px">
        <div style="font-weight:600;margin-bottom:8px;font-size:13px">📁 資料來源文件</div>
        ${sources.map(s => `<div style="font-size:12px;padding:4px 8px;background:#f8fafc;border-radius:4px;margin-bottom:4px;color:var(--text-light)">📄 ${s}</div>`).join('')}
      </div>
    </div>
    <div class="card" style="margin-bottom:12px">
      <div class="card-body" style="padding:12px">
        <div style="font-weight:600;margin-bottom:8px;font-size:13px">🤖 AI 分析建議</div>
        ${suggestions.map(s => `<div style="font-size:13px;padding:4px 0;border-bottom:1px solid var(--border)">${s}</div>`).join('')}
      </div>
    </div>
    ${inspections.length > 0 ? `
    <div class="card" style="margin-bottom:0">
      <div class="card-body" style="padding:12px">
        <div style="font-weight:600;margin-bottom:8px;font-size:13px">📋 相關巡查紀錄</div>
        ${inspections.slice(0,3).map(ins => `
          <div style="padding:6px 0;border-bottom:1px solid var(--border);font-size:12px">
            <div class="fw-600">${ins.date} · ${ins.inspector}</div>
            <div style="color:var(--text-light);margin-top:2px">${ins.findings.substring(0,80)}...</div>
          </div>`).join('')}
      </div>
    </div>` : ''}
  `;
  document.getElementById('modalFooter').innerHTML = `
    <button class="btn btn-outline" onclick="closeModal()">關閉</button>
    <button class="btn btn-primary" onclick='closeModal();aiAsk(${JSON.stringify(f.name)})'>🌊 詢問 AI 助理</button>
  `;
  openModal();
}

/* ═══════════════════════════════════════════════════════════
   DER&U 異常評估與分級制度 (Disaster/Efficiency/Risk Assessment & Grading)
   ═══════════════════════════════════════════════════════════ */

function openDERUAssessmentForm(id = null) {
  const f = id ? DB.getById('facilities', id) : {};
  const isEdit = !!(f.derLevel);

  document.getElementById('modalTitle').textContent = `DER&U 評估 — ${f.name || '新增評估'}`;
  document.getElementById('modalBody').innerHTML = `
    <div class="form-grid">
      <div class="form-group"><label>設施名稱</label><input type="text" value="${f.name || ''}" readonly style="background:#f5f5f5;cursor:not-allowed"></div>
      <div class="form-group"><label>當前狀態</label><input type="text" value="${f.status || ''}" readonly style="background:#f5f5f5;cursor:not-allowed"></div>

      <div class="form-group"><label>DER 評等級 *</label>
        <select id="der_level">
          <option value="">-- 選擇評等級 --</option>
          <option value="A1" ${f.derLevel==='A1'?'selected':''}>A1 優良（Acceptable）</option>
          <option value="B1-I" ${f.derLevel==='B1-I'?'selected':''}>B1-I 輕度劣化（Incipient）</option>
          <option value="C4-C5" ${f.derLevel==='C4-C5'?'selected':''}>C4-C5 重度劣化（Considerable/Critical）</option>
        </select>
      </div>

      <div class="form-group"><label>風險評分（0-100）*</label>
        <input id="der_riskScore" type="number" min="0" max="100" value="${f.riskScore || 50}" placeholder="0">
      </div>

      <div class="form-group"><label>維護策略 *</label>
        <select id="der_strategy">
          <option value="">-- 選擇維護策略 --</option>
          <option value="升級式" ${f.maintenanceStrategy==='升級式'?'selected':''}>升級式（Upgrade）</option>
          <option value="反應式" ${f.maintenanceStrategy==='反應式'?'selected':''}>反應式（Reactive）</option>
          <option value="預防式" ${f.maintenanceStrategy==='預防式'?'selected':''}>預防式（Preventive）</option>
          <option value="定期式" ${f.maintenanceStrategy==='定期式'?'selected':''}>定期式（Scheduled）</option>
        </select>
      </div>

      <div class="form-group"><label>評估日期 *</label>
        <input id="der_date" type="date" value="${f.assessmentDate || new Date().toISOString().split('T')[0]}">
      </div>

      <div class="form-group"><label>
        <input type="checkbox" id="der_retirement" ${f.retirementEligible?'checked':''}>
        &nbsp; 符合退場條件
      </label></div>

      <div class="form-group full-width"><label>評估說明 *</label>
        <textarea id="der_notes" rows="4" placeholder="評估理由、關鍵指標、建議措施等">${f.evaluationNotes || ''}</textarea>
      </div>
    </div>
  `;

  document.getElementById('modalFooter').innerHTML = `
    <button class="btn btn-outline" onclick="closeModal()">取消</button>
    <button class="btn btn-primary" onclick="saveDERUAssessment(${id || 'null'})">
      <i class="fas fa-save"></i> 儲存評估
    </button>
  `;
  openModal();
}

function saveDERUAssessment(id) {
  const derLevel = document.getElementById('der_level').value.trim();
  const riskScore = document.getElementById('der_riskScore').value.trim();
  const strategy = document.getElementById('der_strategy').value.trim();
  const date = document.getElementById('der_date').value;
  const notes = document.getElementById('der_notes').value.trim();

  if (!derLevel || !riskScore || !strategy || !notes) {
    showToast('請完整填寫所有必填欄位', 'error');
    return;
  }

  const updates = {
    derLevel: derLevel,
    riskScore: parseInt(riskScore),
    maintenanceStrategy: strategy,
    assessmentDate: date,
    retirementEligible: document.getElementById('der_retirement').checked,
    evaluationNotes: notes
  };

  if (id) {
    DB.update('facilities', id, updates);
    // 同步巡查紀錄中的 DER&U 相關欄位
    const fac = DB.getById('facilities', id);
    if (fac) syncFacilityUpdatesToInspections(id, fac.name);
    showToast('DER&U 評估已更新，關聯資料已同步', 'success');
  } else {
    showToast('請先選擇設施', 'error');
    return;
  }
  closeModal();
  loadFacilitiesTable();
}

function deleteFacility(id) {
  const f = DB.getById('facilities', id);
  if (!confirm(`確定要刪除「${f?.name}」嗎？`)) return;
  DB.delete('facilities', id);
  showToast('設施已刪除', 'info');
  loadFacilitiesTable();
}
