// 巡查紀錄模組

const INSPECTION_STATUS = ['待處理', '處理中', '完成'];
const INSPECTION_PRIORITY = ['低', '中', '高', '緊急'];

// ── 雙向同步設定 ──────────────────────────────────────────────────────
const CLOUD_SYNC_REMOTE_URL = 'https://hengliuxi-management.onrender.com';
const CLOUD_SYNC_LOCAL_URL  = (location.hostname === 'localhost' || location.hostname === '127.0.0.1')
  ? `${location.protocol}//${location.host}`
  : null;  // 雲端端本身不需要本機 URL

// 判斷同步目標：本機→推送到雲端；雲端→推送到自己（本機同步）
function _syncTargetUrl() {
  const isLocal = location.hostname === 'localhost' || location.hostname === '127.0.0.1';
  return isLocal ? CLOUD_SYNC_REMOTE_URL : null;
}

/** 自動同步：儲存後推送到雲端 */
async function cloudSyncPush(records) {
  const target = _syncTargetUrl();
  if (!target) return { skipped: true, reason: 'already_on_cloud' };
  try {
    const resp = await fetch(`${target}/api/sync/inspections`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ records: Array.isArray(records) ? records : [records] })
    });
    return await resp.json();
  } catch (e) {
    return { success: false, error: e.message };
  }
}

/** 從雲端拉取並合併至 localStorage */
async function cloudSyncPull(sinceDate) {
  const target = _syncTargetUrl() || CLOUD_SYNC_REMOTE_URL;
  const url = sinceDate
    ? `${target}/api/sync/inspections?since=${encodeURIComponent(sinceDate)}`
    : `${target}/api/sync/inspections`;
  const resp  = await fetch(url);
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  const data  = await resp.json();
  if (!data.success) throw new Error(data.error || 'sync failed');
  const remote = data.records || [];
  // 合併至 localStorage
  const local  = DB.getAll('inspections');
  const mergedMap = {};
  local.forEach(r => { mergedMap[r.id] = r; });
  let added = 0, updated = 0;
  remote.forEach(r => {
    if (!r.id) return;
    const ex = mergedMap[r.id];
    if (!ex) { DB.insert('inspections', r); added++; }
    else {
      const tNew = r.driveSyncedAt || r.date || '';
      const tOld = ex.driveSyncedAt || ex.date || '';
      if (tNew >= tOld) { DB.update('inspections', r.id, r); updated++; }
    }
  });
  return { remote: remote.length, added, updated };
}

/** 從指定 URL 拉取同步記錄並合併至 localStorage */
async function _pullFromUrl(syncUrl) {
  const resp = await fetch(syncUrl);
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  const data = await resp.json();
  if (!data.success) throw new Error(data.error || 'sync failed');
  const remote = data.records || [];
  const local = DB.getAll('inspections');
  const mergedMap = {};
  local.forEach(r => { mergedMap[String(r.id)] = r; });
  let added = 0, updated = 0;
  remote.forEach(r => {
    if (!r.id) return;
    const key = String(r.id);
    const ex = mergedMap[key];
    if (!ex) { DB.insert('inspections', r); added++; }
    else {
      const tNew = r.driveSyncedAt || r.date || '';
      const tOld = ex.driveSyncedAt || ex.date || '';
      if (tNew >= tOld) { DB.update('inspections', r.id, r); updated++; }
    }
  });
  return { remote: remote.length, added, updated };
}

/** 完整雙向同步（本機伺服器 + 雲端遠端） */
async function cloudSyncBidirectional() {
  const btn = document.getElementById('cloudSyncBtn');
  const badge = document.getElementById('cloudSyncBadge');
  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 同步中…'; }
  try {
    const localAll = DB.getAll('inspections');
    let totalAdded = 0, totalUpdated = 0, msg = '';

    // 1. 先從本機伺服器同步存儲拉取（含 insert_fishway_inspections.py 寫入的資料）
    const localServerUrl = `${location.protocol}//${location.host}/api/sync/inspections`;
    try {
      const localPull = await _pullFromUrl(localServerUrl);
      totalAdded   += localPull.added;
      totalUpdated += localPull.updated;
    } catch (e) { /* 本機端點不可用時靜默 */ }

    // 2. 推送本機所有記錄到遠端雲端（onrender.com）
    const target = _syncTargetUrl();
    if (target) {
      await cloudSyncPush(DB.getAll('inspections'));
      // 3. 從遠端雲端拉取
      try {
        const remotePull = await _pullFromUrl(`${target}/api/sync/inspections`);
        totalAdded   += remotePull.added;
        totalUpdated += remotePull.updated;
      } catch (e) { /* 遠端離線時靜默 */ }
      msg = `✅ 同步完成｜本機+雲端共合併 ${totalAdded+totalUpdated} 筆`;
    } else {
      msg = `✅ 本機同步完成｜合併 ${totalAdded+totalUpdated} 筆`;
    }

    showToast(msg, 'success');
    localStorage.setItem('lastCloudSync', new Date().toISOString());
    if (badge) badge.innerHTML = `<span style="color:#16a34a;font-size:11px">✅ ${new Date().toLocaleTimeString('zh-TW')}</span>`;
    // 同步完成後重算所有設施的 DER&U 評估，確保工程設施管理與巡查資料管理一致
    if (typeof fac_syncAllLatestProfessionalAssessments === 'function') {
      setTimeout(fac_syncAllLatestProfessionalAssessments, 200);
    }
    if (typeof renderInspection === 'function') renderInspection();
  } catch (e) {
    showToast(`同步失敗：${e.message}`, 'error');
    if (badge) badge.innerHTML = `<span style="color:#b91c1c;font-size:11px">❌ 同步失敗</span>`;
  } finally {
    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-cloud-upload-alt"></i> 雲端同步'; }
  }
}

/** 儲存巡查後自動推送到雲端（背景，不阻塞 UI） */
function _autoCloudPush(item) {
  const target = _syncTargetUrl();
  if (!target || !item) return;
  fetch(`${target}/api/sync/inspections`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ records: [item] })
  }).then(r => r.json()).then(d => {
    if (d.success) {
      const badge = document.getElementById('cloudSyncBadge');
      if (badge) badge.innerHTML = `<span style="color:#16a34a;font-size:11px">✅ 剛同步</span>`;
      localStorage.setItem('lastCloudSync', new Date().toISOString());
    }
  }).catch(() => {}); // 離線時靜默
}
const INSPECTION_GDRIVE_FOLDER_URL = 'https://drive.google.com/drive/folders/1k2s5HSd_R5GeCt05SOtJxn6UFSrbyoQ9?usp=drive_link';
const GDRIVE_UPLOAD_FOLDER_ID      = '1k2s5HSd_R5GeCt05SOtJxn6UFSrbyoQ9';
const INSPECTION_FORM_SYNC_META = {
  general_periodic: {
    category: 'general',
    label: '一般巡查',
    sourceType: '一般巡查表單',
    pdfTitle: '表3-1_一般性定期巡查表單.pdf',
    cloudFolder: '巡查資料管理/一般巡查'
  },
  professional_structure: {
    category: 'professional',
    label: '專業巡查-構造物調查表單',
    sourceType: '專業巡查-構造物調查表單',
    pdfTitle: '表3-2_構造物調查表單.pdf',
    cloudFolder: '巡查資料管理/專業巡查/構造物調查表單'
  },
  professional_fishway: {
    category: 'fishway',
    label: '魚道檢核表',
    sourceType: '專業巡查-魚道檢核表',
    pdfTitle: '表3-3_魚道檢核表.pdf',
    cloudFolder: '巡查資料管理/專業巡查/魚道檢核表'
  },
  maintenance_completion: {
    category: 'maintenance',
    label: '維護完工回報',
    sourceType: '維護完工回報表單',
    pdfTitle: '維護完工回報表單.pdf',
    cloudFolder: '巡查資料管理/維護完工回報'
  }
};

let currentInspectionAiImage = null;
let currentInspectionAiAnalysis = null;
let currentInspectionAiImageDataUrl = null;
let maintenancePhotoIndex = null;
let selectedMaintenanceCaseIndex = 0;
let selectedMaintenanceFolderIndex = 0;

const MAINTENANCE_MANUAL_BOOKS = [
  {
    year: '113',
    title: '管理維護手冊',
    type: '維護手冊',
    format: 'PDF',
    color: '#0f766e',
    summary: '工程設施基本資料、巡查程序、維護管理原則、異常判定與表單依據，作為平台維護管理主手冊。',
    tags: ['巡查', '維護管理', 'DER&U', '設施履歷'],
    path: '01_工程設施維護與資料/02_本文_11312管理維護手冊_V1_合併(1).pdf'
  },
  {
    year: '113',
    title: '棲地連通性及周邊設施維護管理',
    type: '維護管理資料',
    format: 'PDF',
    color: '#1565c0',
    summary: '彙整橫流溪魚道、護岸、步道、平台與周邊設施之維護管理資料，銜接工程設施與現地巡查。',
    tags: ['魚道', '護岸', '步道', '平台'],
    path: '01_工程設施維護與資料/橫流溪棲地連通性及周邊設施維護管理(1).pdf'
  },
  {
    year: '作業',
    title: '巡查紀錄與外觀檢視表',
    type: '平台表單',
    format: 'FORM',
    color: '#7c3aed',
    summary: '對應一般巡查、構造物外觀檢視、現場照片、處理狀態、維護時間與後續建議紀錄。',
    tags: ['外觀檢視', '巡查紀錄', '後續建議', '照片'],
    action: 'openInspectionForm'
  },
  {
    year: 'AI',
    title: 'DER&U與影像輔助評分',
    type: '輔助評分作業',
    format: 'AI',
    color: '#c2410c',
    summary: '整合AI影像辨識、異常範圍估算、D/E/R/U輔助評分與人工覆核流程，產出維護優先度。',
    tags: ['AI影像', '淘空', '裂縫', '優先維護'],
    action: 'scrollDeru'
  }
];

/* ── 橫流溪林業巡護管理（南勢社區林業計畫）文件清單 ── */
const FORESTRY_PATROL_BASE = '01_工程設施維護與資料/橫流溪林業巡護管理/';
const FORESTRY_PATROL_DOCS = [
  { year: '114', type: '計畫核定本',  file: '南勢-114年社區林業計畫核定本.pdf' },
  { year: '114', type: '結案計畫報表', file: '南勢-114年結案計畫報表.pdf' },
  { year: '113', type: '計畫核定本',  file: '南勢-113年社區林業計畫核定本.pdf' },
  { year: '113', type: '結案計畫報表', file: '南勢-113年結案計畫報表.pdf' },
  { year: '113', type: '成果報告',    file: '南勢-113年社區林業成果報告.pdf' },
  { year: '112', type: '計畫核定本',  file: '南勢-112年社區林業計畫核定本.pdf' },
  { year: '112', type: '結案計畫報表', file: '南勢-112年結案計畫報表.pdf' },
  { year: '111', type: '計畫核定本',  file: '南勢-111年社區林業計畫核定本.pdf' },
  { year: '111', type: '結案計畫報表', file: '南勢-111年結案計畫報表.pdf' },
  { year: '110', type: '計畫核定本',  file: '南勢-110年社區林業計畫核定本.pdf' },
  { year: '110', type: '結案計畫報表', file: '南勢-110年結案計畫報表.pdf' },
  { year: '106', type: '計畫核定本',  file: '1.106南勢社區林業計畫V2.pdf' },
  { year: '106', type: '成果報告',    file: '南勢-成果報告1061222第5版.pdf' },
];

function inspectionEscape(value) {
  return String(value ?? '').replace(/[&<>"']/g, ch => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[ch]));
}

function getInspectionStatus(item) {
  if (INSPECTION_STATUS.includes(item?.status)) return item.status;
  if (String(item?.status || '').includes('完成')) return '完成';
  if (String(item?.status || '').includes('處理')) return '處理中';
  return item?.deru_u >= 3 ? '處理中' : '待處理';
}

function getInspectionPriority(item) {
  if (INSPECTION_PRIORITY.includes(item?.priority)) return item.priority;
  if (item?.deru_u >= 4) return '緊急';
  if (item?.deru_u === 3) return '高';
  if (item?.deru_u === 2) return '中';
  return '低';
}

function inspectionFormSyncMeta(formType) {
  return INSPECTION_FORM_SYNC_META[formType] || {
    category: 'general',
    label: '巡查紀錄',
    sourceType: '巡查紀錄',
    pdfTitle: '巡查紀錄表單.pdf',
    cloudFolder: '巡查資料管理'
  };
}

function inspectionSanitizeFileName(value) {
  return String(value || '')
    .replace(/[\\/:*?"<>|]/g, '_')
    .replace(/\s+/g, '_')
    .slice(0, 80) || '未命名';
}

function inspectionPdfFileName(item, meta) {
  const date = inspectionSanitizeFileName(item.date || new Date().toISOString().slice(0, 10));
  const facility = inspectionSanitizeFileName(item.facilityName || item.facility_name || '全區');
  const label = inspectionSanitizeFileName(meta.label);
  return `${date}_${facility}_${label}.pdf`;
}

function inspectionDataClass(item = {}) {
  if (item.dataClass === 'inspection' || item.managementClass === 'inspection') return 'inspection';
  if (item.dataClass === 'maintenance' || item.managementClass === 'maintenance' || item.formType === 'maintenance_completion') return 'maintenance';
  return 'inspection';
}

function inspectionSourcePdfLabel(item = {}) {
  return item.sourcePdf || item.pdfSource || item.pdfFileName || item.pdfTemplate || item.cloudFileName || '';
}

function inspectionOcrText(item = {}) {
  return item.ocrText || item.ocr_text || item.extractedText || item.rawText || item.textContent || '';
}

function inspectionRecordIdentifier(item = {}, category = 'general', facilityId = null) {
  if (item.inspection_id) return item.inspection_id;
  if (item.inspectionId) return item.inspectionId;
  if (item.inspectNo) return item.inspectNo;
  const prefix = {
    general: 'GEN',
    professional: 'PRO',
    fishway: 'FW',
    ranger: 'RNG'
  }[category] || 'INS';
  const date = inspectionSanitizeFileName(item.date || new Date().toISOString().slice(0, 10));
  const fid = facilityId || item.facilityId || item.facility_id || 'NA';
  const rid = item.id || Date.now();
  return `${prefix}-${fid}-${date}-${rid}`;
}

function inspectionReclassSnapshot(item = {}) {
  return {
    id: item.id,
    inspection_id: item.inspection_id || item.inspectionId || '',
    dataClass: inspectionDataClass(item),
    formType: item.formType || '',
    inspectionCategory: item.inspectionCategory || '',
    linkedInspectionCategory: item.linkedInspectionCategory || item.sourceInspectionCategory || '',
    inspectionSubcategory: item.inspectionSubcategory || '',
    maintenanceCategory: item.maintenanceCategory || '',
    maintenanceType: item.maintenanceType || '',
    facilityId: item.facilityId || item.facility_id || null,
    facilityName: item.facilityName || item.facility_name || '',
    facilityType: item.facilityType || '',
    sourceType: item.sourceType || '',
    inspectionItem: item.inspectionItem || '',
    date: item.date || '',
    status: item.status || '',
    priority: item.priority || '',
    sourcePdf: inspectionSourcePdfLabel(item),
    sourcePage: item.sourcePage || '',
    pdfFileName: item.pdfFileName || '',
    cloudFolder: item.cloudFolder || '',
    ocrTextLength: inspectionOcrText(item).length,
    photoCount: Array.isArray(item.photos) ? item.photos.length : 0
  };
}

function inspectionCategoryMeta(category) {
  return {
    general: {
      formType: 'general_periodic',
      label: '一般巡查紀錄',
      sourceType: '一般巡查表單',
      classLabel: '一般巡查',
      subcategory: '一般巡查紀錄'
    },
    professional: {
      formType: 'professional_structure',
      label: '構造物調查表',
      sourceType: '專業巡查-構造物調查表',
      classLabel: '專業巡查',
      subcategory: '專業巡查紀錄'
    },
    fishway: {
      formType: 'professional_fishway',
      label: '魚道檢核表',
      sourceType: '專業巡查-魚道檢核表',
      classLabel: '魚道巡查資料',
      subcategory: '魚道巡查資料'
    },
    ranger: {
      formType: 'general_periodic',
      label: '護管員巡查紀錄',
      sourceType: '護管員巡查紀錄',
      classLabel: '護管員巡查',
      subcategory: '護管員巡查紀錄'
    }
  }[category] || {
    formType: 'general_periodic',
    label: '一般巡查紀錄',
    sourceType: '一般巡查表單',
    classLabel: '一般巡查',
    subcategory: '一般巡查紀錄'
  };
}

function inspectionMaintenanceCategoryLabel(category) {
  return {
    maintenance_case: '維護案件紀錄',
    improvement: '改善處理紀錄',
    dredging_reinforcement: '清淤或補強紀錄',
    maintenance_completion: '維護完工回報',
    follow_up: '後續追蹤紀錄'
  }[category] || '維護案件紀錄';
}

function inspectionFacilityTypeOptions(selectedType = '') {
  const standard = ['魚道', '防砂壩', '固床工', '平台', '護岸', '步道', '排水設施', '邊坡保護工', '其他'];
  const fromDb = DB.getAll('facilities').map(f => f.type).filter(Boolean);
  const types = Array.from(new Set([...standard, ...fromDb]));
  return types.map(type => `<option value="${inspectionEscape(type)}" ${type === selectedType ? 'selected' : ''}>${inspectionEscape(type)}</option>`).join('');
}

function openInspectionReclassificationForm(id, returnFacilityId = null) {
  const item = DB.getById('inspections', Number(id));
  if (!item) {
    showToast('找不到要重新歸類的資料', 'error');
    return;
  }
  const facilities = DB.getAll('facilities')
    .slice()
    .sort((a, b) => String(a.type || '').localeCompare(String(b.type || '')) || String(a.stationKm || '').localeCompare(String(b.stationKm || '')) || String(a.name || '').localeCompare(String(b.name || '')));
  const currentClass = inspectionDataClass(item);
  const currentType = inspectionRecordType(item);
  const currentInspectionCategory = item.linkedInspectionCategory || item.sourceInspectionCategory ||
    (item.formType === 'professional_structure' ? 'professional' :
     item.formType === 'professional_fishway' ? 'fishway' :
     item.formType === 'general_periodic' ? 'general' :
     currentType === 'maintenance' ? 'professional' : currentType);
  const currentFacilityId = Number(item.facilityId || item.facility_id || returnFacilityId || 0);
  const selectedFacility = DB.getById('facilities', currentFacilityId) || null;
  const currentFacilityType = item.facilityType || selectedFacility?.type || '';
  const currentMaintenanceCategory = item.maintenanceCategory || (item.formType === 'maintenance_completion' ? 'maintenance_completion' : 'maintenance_case');
  const history = Array.isArray(item.reclassificationHistory) ? item.reclassificationHistory : [];

  document.getElementById('modalTitle').textContent = `資料重新歸類 — ${item.facilityName || selectedFacility?.name || '未指定設施'}`;
  document.getElementById('modalBody').innerHTML = `
    <div style="display:grid;gap:14px">
      <div style="background:#eff6ff;border:1px solid #bfdbfe;border-left:4px solid #1565c0;border-radius:10px;padding:12px;color:#1e3a8a;line-height:1.7;font-size:14px">
        <b>用途：</b>當表單放錯在「巡查資料」或「維護管理資料」時，可重新指定資料大類、巡查類別、維護類別、設施類型與對應工程設施。儲存後會同步更新設施履歷、照片與最新狀態評估。
        <div style="margin-top:8px">
          <button type="button" onclick="inspectionApplyProfessionalReclassPreset()" style="border:1px solid #fdba74;background:#fff7ed;color:#9a3412;border-radius:999px;padding:6px 12px;font-size:13px;font-weight:800;cursor:pointer">
            <i class="fas fa-hard-hat"></i> 套用：巡查資料 ＞ 專業巡查
          </button>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <div class="form-group">
          <label>資料大類 *</label>
          <select id="rc_data_class">
            <option value="inspection" ${currentClass === 'inspection' ? 'selected' : ''}>巡查資料</option>
            <option value="maintenance" ${currentClass === 'maintenance' ? 'selected' : ''}>維護管理資料</option>
          </select>
        </div>
        <div class="form-group">
          <label>對應工程設施 facility_id *</label>
          <select id="rc_facility" onchange="inspectionReclassFacilityChanged(this.value)">
            <option value="">請選擇設施</option>
            ${facilities.map(f => `<option value="${f.id}" ${Number(f.id) === currentFacilityId ? 'selected' : ''}>${inspectionEscape(f.name)}｜${inspectionEscape(f.type || '-')}｜${inspectionEscape(f.stationKm || '-')}｜id:${f.id}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label>巡查類別</label>
          <select id="rc_inspection_category">
            <option value="general" ${currentInspectionCategory === 'general' ? 'selected' : ''}>一般巡查</option>
            <option value="professional" ${currentInspectionCategory === 'professional' ? 'selected' : ''}>專業巡查－構造物調查表</option>
            <option value="fishway" ${currentInspectionCategory === 'fishway' ? 'selected' : ''}>專業巡查－魚道檢核表</option>
            <option value="ranger" ${currentInspectionCategory === 'ranger' ? 'selected' : ''}>護管員巡查</option>
          </select>
        </div>
        <div class="form-group">
          <label>維護類別</label>
          <select id="rc_maintenance_category">
            <option value="maintenance_case" ${currentMaintenanceCategory === 'maintenance_case' ? 'selected' : ''}>維護案件紀錄</option>
            <option value="improvement" ${currentMaintenanceCategory === 'improvement' ? 'selected' : ''}>改善處理紀錄</option>
            <option value="dredging_reinforcement" ${currentMaintenanceCategory === 'dredging_reinforcement' ? 'selected' : ''}>清淤或補強紀錄</option>
            <option value="maintenance_completion" ${currentMaintenanceCategory === 'maintenance_completion' ? 'selected' : ''}>維護完工回報</option>
            <option value="follow_up" ${currentMaintenanceCategory === 'follow_up' ? 'selected' : ''}>後續追蹤紀錄</option>
          </select>
        </div>
        <div class="form-group">
          <label>設施類型</label>
          <select id="rc_facility_type">
            ${inspectionFacilityTypeOptions(currentFacilityType)}
          </select>
        </div>
        <div class="form-group">
          <label>異動原因</label>
          <input id="rc_reason" type="text" value="表單位置歸類修正" placeholder="例如：專業巡查誤放於維護資料">
        </div>
      </div>
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:12px;font-size:13px;color:#334155;line-height:1.7">
        <b>目前資料：</b>${inspectionEscape(item.inspectionItem || inspectionRecordTypeLabel(currentType))}｜
        日期 ${inspectionEscape(item.date || '-')}｜
        狀態 ${inspectionEscape(getInspectionStatus(item))}｜
        優先度 ${inspectionEscape(getInspectionPriority(item))}
        <div style="margin-top:6px;color:#64748b">${inspectionEscape(String(item.findings || item.action || '尚無摘要').slice(0, 160))}</div>
      </div>
      <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:10px;padding:12px;font-size:13px;color:#9a3412;line-height:1.7">
        <b>可追溯紀錄：</b>本筆已累計 ${history.length} 次重新歸類。此次儲存後會新增一筆前後差異快照，並將本筆資料標記為「待上傳」。
      </div>
    </div>
  `;
  document.getElementById('modalFooter').innerHTML = `
    <button class="btn btn-outline" onclick="closeModal()">取消</button>
    <button class="btn btn-primary" onclick="saveInspectionReclassification(${Number(id)}, ${returnFacilityId ? Number(returnFacilityId) : 'null'})">
      <i class="fas fa-save"></i> 儲存重新歸類
    </button>
  `;
  openModal();
}

function inspectionReclassFacilityChanged(facilityId) {
  const facility = DB.getById('facilities', Number(facilityId));
  const typeSelect = document.getElementById('rc_facility_type');
  if (facility?.type && typeSelect) typeSelect.value = facility.type;
}

function inspectionApplyProfessionalReclassPreset() {
  const dataClass = document.getElementById('rc_data_class');
  const category = document.getElementById('rc_inspection_category');
  const reason = document.getElementById('rc_reason');
  if (dataClass) dataClass.value = 'inspection';
  if (category) category.value = 'professional';
  if (reason && !/專業巡查/.test(reason.value || '')) {
    reason.value = '維護管理資料誤放，改列巡查資料＞專業巡查';
  }
}

function inspectionProfessionalStructureSourceText(item = {}) {
  return [
    item.sourceType,
    item.inspectionItem,
    item.inspectionClassLabel,
    item.inspectionSubcategory,
    item.pdfTemplate,
    item.pdfFileName,
    item.sourcePdf,
    item.pdfSource,
    item.cloudFolder,
    item.cloudTarget,
    item.structType,
    item.inspectNo
  ].filter(Boolean).join(' ');
}

function inspectionIsMisclassifiedProfessionalStructure(item = {}) {
  const isMaintenanceBucket = inspectionDataClass(item) === 'maintenance';
  if (!isMaintenanceBucket) return false;
  const sourceText = inspectionProfessionalStructureSourceText(item);
  const sourceLooksStructure = /專業巡查-構造物調查表|構造物調查表|構造物調查|專業性巡查表單.*構造物|附錄二/.test(sourceText);
  const formLooksStructure = item.formType === 'professional_structure' || item.type === 'professional_structure';
  return sourceLooksStructure || formLooksStructure;
}

function inspectionBatchReclassifyProfessionalStructureRecords() {
  const rows = DB.getAll('inspections');
  const candidates = rows.filter(inspectionIsMisclassifiedProfessionalStructure);
  if (!candidates.length) return 0;

  const now = new Date().toISOString();
  const meta = inspectionFormSyncMeta('professional_structure');
  const logs = [];

  candidates.forEach(row => {
    const fid = Number(row.facilityId || row.facility_id);
    const facility = DB.getById('facilities', fid);
    const before = inspectionReclassSnapshot(row);
    const sourcePdf = inspectionSourcePdfLabel(row);
    const ocrText = inspectionOcrText(row);
    const inspectionId = inspectionRecordIdentifier(row, 'professional', fid);
    const updates = {
      dataClass: 'inspection',
      dataClassLabel: '巡查資料',
      managementClass: 'inspection',
      formType: 'professional_structure',
      inspectionCategory: 'professional',
      linkedInspectionCategory: 'professional',
      sourceInspectionCategory: 'professional',
      inspectionClassLabel: '專業巡查',
      inspectionSubcategory: '專業巡查紀錄',
      inspectionItem: '構造物調查表',
      sourceType: '專業巡查-構造物調查表',
      inspection_id: inspectionId,
      inspectionId,
      facilityId: fid || row.facilityId || row.facility_id || null,
      facility_id: fid || row.facilityId || row.facility_id || null,
      facilityName: facility?.name || row.facilityName || row.facility_name || '',
      facility_name: facility?.name || row.facility_name || row.facilityName || '',
      facilityType: row.facilityType || facility?.type || '',
      stationKm: row.stationKm || facility?.stationKm || '',
      previousMaintenanceCategory: row.maintenanceCategory || '',
      previousMaintenanceType: row.maintenanceType || '',
      previousMaintenanceId: row.maintenance_id || row.maintenanceId || '',
      maintenanceCategory: '',
      maintenanceType: '',
      maintenance_id: '',
      maintenanceId: '',
      pdfFormat: 'PDF',
      pdfTemplate: meta.pdfTitle,
      pdfSource: sourcePdf,
      sourcePdf: row.sourcePdf || sourcePdf,
      cloudTarget: 'Google Drive',
      cloudFolder: meta.cloudFolder,
      cloudFolderUrl: INSPECTION_GDRIVE_FOLDER_URL,
      cloudSyncStatus: row.driveFileId || row.driveWebLink ? (row.cloudSyncStatus || '已上傳') : '待上傳',
      syncedToInspectionManagement: true,
      syncedToFacility: true,
      statusEvaluationSyncedAt: now,
      reclassifiedAt: now,
      reclassificationReason: '批次修正：維護管理資料誤歸類，改列巡查資料＞專業巡查＞構造物調查表',
      updatedAt: now
    };
    if (!row.pdfFileName) updates.pdfFileName = inspectionPdfFileName({ ...row, ...updates }, meta);
    if (ocrText && !row.ocrText) updates.ocrText = ocrText;

    const after = inspectionReclassSnapshot({ ...row, ...updates });
    const historyItem = {
      changedAt: now,
      reason: updates.reclassificationReason,
      before,
      after
    };
    updates.reclassificationHistory = [
      ...(Array.isArray(row.reclassificationHistory) ? row.reclassificationHistory : []),
      historyItem
    ];

    const saved = DB.update('inspections', row.id, updates);
    if (saved) {
      logs.push({
        inspectionId: row.id,
        changedAt: now,
        reason: updates.reclassificationReason,
        before,
        after,
        operator: '系統批次資料治理',
        sourcePage: '維護管理資料批次移轉'
      });
      syncInspectionRecordToFacility(saved, false);
    }
  });

  logs.forEach(log => DB.insert('reclassificationLogs', log));

  const affected = Array.from(new Set(candidates.map(row => Number(row.facilityId || row.facility_id)).filter(Boolean)));
  affected.forEach(fid => {
    const fac = DB.getById('facilities', fid);
    if (fac && typeof fac_syncLatestProfessionalAssessment === 'function') fac_syncLatestProfessionalAssessment(fac);
  });

  return candidates.length;
}

function saveInspectionReclassification(id, returnFacilityId = null) {
  const item = DB.getById('inspections', Number(id));
  if (!item) {
    showToast('找不到要更新的資料', 'error');
    return;
  }
  const dataClass = document.getElementById('rc_data_class')?.value || 'inspection';
  const inspectionCategory = document.getElementById('rc_inspection_category')?.value || 'general';
  const maintenanceCategory = document.getElementById('rc_maintenance_category')?.value || 'maintenance_case';
  const facilityId = Number(document.getElementById('rc_facility')?.value || 0);
  const facilityType = document.getElementById('rc_facility_type')?.value || '';
  const reason = document.getElementById('rc_reason')?.value || '表單位置歸類修正';
  const facility = DB.getById('facilities', facilityId);
  if (!facility) {
    showToast('請選擇有效的工程設施 facility_id', 'warning');
    return;
  }

  const before = inspectionReclassSnapshot(item);
  const now = new Date().toISOString();
  const categoryMeta = inspectionCategoryMeta(inspectionCategory);
  const maintenanceLabel = inspectionMaintenanceCategoryLabel(maintenanceCategory);
  const isMaintenance = dataClass === 'maintenance';
  const nextFormType = dataClass === 'maintenance' && maintenanceCategory === 'maintenance_completion'
    ? 'maintenance_completion'
    : categoryMeta.formType;
  const syncMeta = inspectionFormSyncMeta(nextFormType);
  const dataClassLabel = isMaintenance ? '維護管理資料' : '巡查資料';
  const sourcePdf = inspectionSourcePdfLabel(item);
  const ocrText = inspectionOcrText(item);
  const inspectionId = inspectionRecordIdentifier(item, inspectionCategory, facilityId);
  const cloudFolder = isMaintenance
    ? `巡查資料管理/維護管理資料/${maintenanceLabel}`
    : syncMeta.cloudFolder;

  const updates = {
    dataClass,
    dataClassLabel,
    managementClass: dataClass,
    formType: nextFormType,
    facilityId,
    facility_id: facilityId,
    facilityName: facility.name,
    facility_name: facility.name,
    facilityType: facilityType || facility.type || '',
    stationKm: facility.stationKm || item.stationKm || '',
    inspectionCategory: isMaintenance ? 'maintenance' : inspectionCategory,
    linkedInspectionCategory: inspectionCategory,
    sourceInspectionCategory: inspectionCategory,
    inspectionClassLabel: isMaintenance ? '維護管理資料' : categoryMeta.classLabel,
    inspectionSubcategory: isMaintenance ? maintenanceLabel : categoryMeta.subcategory,
    inspectionItem: isMaintenance ? maintenanceLabel : categoryMeta.label,
    inspection_id: isMaintenance ? '' : inspectionId,
    inspectionId: isMaintenance ? '' : inspectionId,
    maintenance_id: isMaintenance ? (item.maintenance_id || item.maintenanceId || `MNT-${facilityId}-${inspectionSanitizeFileName(item.date || now.slice(0, 10))}-${item.id || Date.now()}`) : '',
    maintenanceId: isMaintenance ? (item.maintenanceId || item.maintenance_id || `MNT-${facilityId}-${inspectionSanitizeFileName(item.date || now.slice(0, 10))}-${item.id || Date.now()}`) : '',
    maintenanceCategory: isMaintenance ? maintenanceCategory : '',
    maintenanceType: isMaintenance ? maintenanceLabel : '',
    sourceType: isMaintenance ? maintenanceLabel : categoryMeta.sourceType,
    pdfFormat: 'PDF',
    pdfTemplate: isMaintenance ? `${maintenanceLabel}.pdf` : (syncMeta.pdfTitle || categoryMeta.label),
    pdfSource: sourcePdf,
    sourcePdf: item.sourcePdf || sourcePdf,
    cloudTarget: 'Google Drive',
    cloudFolder,
    cloudFolderUrl: INSPECTION_GDRIVE_FOLDER_URL,
    cloudSyncStatus: '待上傳',
    syncedToInspectionManagement: true,
    syncedToFacility: true,
    statusEvaluationSyncedAt: now,
    updatedAt: now,
    reclassifiedAt: now,
    reclassificationReason: reason
  };
  if (ocrText && !item.ocrText) updates.ocrText = ocrText;
  if (!item.pdfFileName) {
    updates.pdfFileName = inspectionPdfFileName({ ...item, ...updates }, syncMeta);
  }

  const after = inspectionReclassSnapshot({ ...item, ...updates });
  const historyItem = { changedAt: now, reason, before, after };
  updates.reclassificationHistory = [
    ...(Array.isArray(item.reclassificationHistory) ? item.reclassificationHistory : []),
    historyItem
  ];

  const saved = DB.update('inspections', Number(id), updates);
  DB.insert('reclassificationLogs', {
    inspectionId: Number(id),
    changedAt: now,
    reason,
    before,
    after,
    operator: '平台使用者',
    sourcePage: returnFacilityId ? '工程設施詳細資訊' : '巡查資料管理'
  });

  if (saved) {
    syncInspectionRecordToFacility(saved);
    const affected = Array.from(new Set([Number(before.facilityId || 0), facilityId].filter(Boolean)));
    affected.forEach(fid => {
      const fac = DB.getById('facilities', fid);
      if (fac && typeof fac_syncLatestProfessionalAssessment === 'function') fac_syncLatestProfessionalAssessment(fac);
    });
  }
  showToast('資料重新歸類完成，已同步更新設施狀態評估', 'success');
  closeModal();
  if (returnFacilityId && typeof viewFacility === 'function') {
    setTimeout(() => viewFacility(Number(returnFacilityId)), 120);
  } else if (typeof renderInspection === 'function') {
    renderInspection();
  }
}

function prepareInspectionRecordForSync(item, formType = item?.formType, refreshSyncAt = false) {
  const meta = inspectionFormSyncMeta(formType);
  const now = new Date().toISOString();
  item.formType = formType || item.formType;
  item.inspectionItem = meta.label;
  item.inspectionCategory = meta.category;
  item.sourceType = meta.sourceType;
  item.pdfFormat = 'PDF';
  item.pdfTemplate = meta.pdfTitle;
  item.pdfFileName = item.pdfFileName || inspectionPdfFileName(item, meta);
  item.cloudTarget = 'Google Drive';
  item.cloudFolder = meta.cloudFolder;
  item.cloudFolderUrl = INSPECTION_GDRIVE_FOLDER_URL;
  item.cloudSyncStatus = item.cloudSyncStatus || '待上傳';
  item.cloudQueuedAt = item.cloudQueuedAt || now;
  item.syncedToInspectionManagement = true;
  item.syncedToFacility = !!item.facilityId;
  item.statusEvaluationSyncedAt = refreshSyncAt ? now : (item.statusEvaluationSyncedAt || now);
  item.uiStatus = getInspectionStatus(item);
  item.uiPriority = getInspectionPriority(item);
  return item;
}

function inspectionLinkedText(item = {}) {
  return [
    item.findings, item.action, item.recommendation, item.notes, item.afterDesc,
    item.method, item.followUp, item.sourceType, item.inspectionItem, item.formType,
    item.sf_functionComment, item.sf_overall, item.fw_generalComment,
    ...(Array.isArray(item.sf_deruItems) ? item.sf_deruItems.map(row => `${row.defectType || ''} ${row.note || ''}`) : []),
    ...(Array.isArray(item.fw_deruItems) ? item.fw_deruItems.map(row => `${row.name || ''} ${row.note || ''}`) : [])
  ].filter(Boolean).join(' ');
}

function inspectionIsRestoredRecord(item = {}) {
  const text = inspectionLinkedText(item);
  const hasCompletion = /維護完工|已完成改善|改善完成|修復完成|已修復|已恢復原始狀態|恢復原始狀態|消能設施完善|功能已恢復|通水恢復|結案|完工/.test(text);
  const hasUnclosed = /尚未改善|未完成|待處理|處理中|需優先|緊急處置|仍需改善|仍需修復|仍有.*阻塞|仍有.*淘空|未恢復/.test(text);
  return hasCompletion && !hasUnclosed;
}

function inspectionAuthorityRank(item = {}) {
  if (inspectionIsRestoredRecord(item)) return 90;
  if (item.formType === 'maintenance_completion') return 80;
  if (inspectionDataClass(item) === 'maintenance') return 75;
  if (item.formType === 'professional_fishway') return 70;
  if (item.formType === 'professional_structure') return 65;
  if (item.type === 'deru_assessment') return 60;
  if (item.formType === 'general_periodic') return 20;
  return 10;
}

function inspectionIsFacilityStatusCandidate(row = {}) {
  if (inspectionDataClass(row) === 'maintenance') return true;
  return [
    'maintenance_completion',
    'professional_structure',
    'professional_fishway',
    'general_periodic'
  ].includes(row.formType) || row.type === 'deru_assessment' || inspectionIsRestoredRecord(row);
}

function inspectionCompareForFacilityStatus(a = {}, b = {}) {
  const dateCmp = String(a.date || '').localeCompare(String(b.date || ''));
  if (dateCmp !== 0) return dateCmp;
  const rankCmp = inspectionAuthorityRank(a) - inspectionAuthorityRank(b);
  if (rankCmp !== 0) return rankCmp;
  return String(a.updatedAt || a.statusEvaluationSyncedAt || a.id || '')
    .localeCompare(String(b.updatedAt || b.statusEvaluationSyncedAt || b.id || ''));
}

function syncInspectionRecordToFacility(item, refreshSyncAt = true) {
  const facilityId = Number(item?.facilityId || item?.facility_id);
  if (!facilityId) return;
  const facility = DB.getById('facilities', facilityId);
  if (!facility) return;
  const now = new Date().toISOString();

  // 若使用者透過 DER&U 表單手動編輯，且日期比此巡查記錄新，則不覆寫
  // （手動評估優先；避免舊巡查記錄壓掉最新人工判定）
  const insDate = String(item.date || '');
  const manualDate = String(facility.derManualEditDate || '');
  if (manualDate && insDate && manualDate > insDate) {
    // 僅更新巡查同步時間戳，不動 DER 等級/狀態
    if (refreshSyncAt) DB.update('facilities', facilityId, { inspectionSyncAt: now });
    return;
  }

  // 取 D/E/R/U（優先用表單填寫值，缺則以公式推算）
  const restored = inspectionIsRestoredRecord(item);
  const d = restored ? 0 : Number(item.deru_d || 0);
  const e = restored ? 1 : Number(item.deru_e || 1);
  const r = restored ? 1 : Number(item.deru_r || 1);
  let u = restored ? 1 : Number(item.deru_u || 0);
  if (!u && typeof fac_deriveUrgency === 'function') u = fac_deriveUrgency(d, e, r).u;
  if (!u) u = 1;

  // 用與「工程設施管理」完全相同的公式換算等級／健康／狀態，確保兩邊一致
  const derLevel = (typeof fac_derLevelFromDeru === 'function')
    ? fac_derLevelFromDeru(d, e, r, u)
    : (d <= 0 && u <= 1 ? 'A1' : `D${d}/E${e}/R${r}・U${u}`);
  const health = restored ? 90 : (typeof fac_healthFromDeru === 'function')
    ? fac_healthFromDeru(d, e, r, String(item.findings || ''))
    : Math.max(15, 100 - u * 20);
  const facStatus = (u >= 4 || health < 35) ? '損壞'
                  : (u >= 2 || health < 75) ? '需維護' : '正常';
  const condition = health >= 85 ? 5 : health >= 70 ? 4 : health >= 50 ? 3 : health >= 30 ? 2 : 1;
  const priority = getInspectionPriority(item);

  const updates = {
    lastInspect: item.date || facility.lastInspect || '',
    assessmentDate: item.date || facility.assessmentDate || '',
    maintenance_priority: priority,
    status: facStatus,
    condition,
    derLevel,
    riskScore: Math.max(0, Math.min(100, Math.round(100 - health))),
    evaluationNotes: `${item.inspectionItem || inspectionRecordTypeLabel(inspectionRecordType(item))}：${item.findings || '已完成巡查資料更新'}${restored ? '；本筆紀錄判定為改善完成，設施狀態閉合為正常。' : ''}`,
    maintenanceStrategy: restored ? (item.action || '例行巡查維護') : (item.action || facility.maintenanceStrategy || '依巡查結果持續追蹤'),
    inspectionSyncAt: refreshSyncAt ? now : (facility.inspectionSyncAt || now)
  };
  const needsUpdate = Object.keys(updates).some(key => facility[key] !== updates[key]);
  if (needsUpdate) DB.update('facilities', facilityId, updates);
}

/**
 * 反向同步：設施盤點「正常/A1」→ 關聯巡查記錄更新為「完成」
 * 確保魚道檢核表/構造物調查表狀態與工程設施盤點一致
 */
/**
 * 反向同步：設施盤點「正常/A1」→ 關聯所有巡查記錄更新為「完成」
 * 不限 formType（含無 formType 的舊記錄），同時重置 deru 欄位
 * 避免高 deru_u 值再觸發設施狀態被改回「需維護」
 */
function syncFacilityStatusToInspections(silent = false) {
  if (silent && typeof DB !== 'undefined' && typeof DB.withoutCloudPush === 'function' && !DB._suppressCloudPush) {
    return DB.withoutCloudPush(() => syncFacilityStatusToInspections(true));
  }

  const facilities  = DB.getAll('facilities');
  const inspections = DB.getAll('inspections');
  const now         = new Date().toISOString();
  let updated = 0, cleaned = 0;

  // ── ① 設施狀態反向同步 ──────────────────────────────────────────
  // 設施「正常」（不限 A1）時，將其舊的待處理/處理中巡查記錄標為完成
  // 同時重置 deru 欄位，防止高 U 值再把設施改回「需維護」
  facilities.forEach(fac => {
    if (fac.status !== '正常') return; // 只要設施是正常即可，不限 A1

    const linked = inspections.filter(ins =>
      Number(ins.facilityId) === Number(fac.id) &&
      (ins.status === '待處理' || ins.status === '處理中')
    );

    linked.forEach(ins => {
      // 若記錄的最新巡查日期比設施 lastInspect 舊，視為已過時紀錄
      const insDate = ins.date || '';
      const facDate = fac.lastInspect || fac.assessmentDate || '';
      const isOutdated = !insDate || (facDate && insDate < facDate);

      if (isOutdated || fac.derLevel === 'A1') {
        DB.update('inspections', ins.id, {
          status:   '完成',
          priority: '低',
          deru_d: 0, deru_e: 1, deru_r: 1, deru_u: 1,
          deru_label: 'U1 定期巡查', deru_score: 0,
          facilityStatusSyncedAt: now
        });
        updated++;
      }
    });
  });

  // ── ② 清除舊記錄誤標的「待上傳」雲端狀態 ─────────────────────
  // Drive 整合啟用日：2026-06-01。此前的記錄不應顯示「待上傳」
  const DRIVE_START = '2026-06-01';
  inspections.forEach(ins => {
    const insDate = ins.date || ins.cloudQueuedAt || '';
    const isOldRecord = insDate && insDate < DRIVE_START;
    const hasValidDriveFile = !!(ins.driveFileId || ins.driveWebLink);

    if (isOldRecord && ins.cloudTarget === 'Google Drive' &&
        ins.cloudSyncStatus === '待上傳' && !hasValidDriveFile) {
      // 舊記錄清除誤標的 Drive 上傳狀態
      DB.update('inspections', ins.id, {
        cloudTarget:     null,
        cloudSyncStatus: null,
        cloudQueuedAt:   null,
        cloudFolderUrl:  null
      });
      cleaned++;
    }
  });

  if (!silent) {
    const msgs = [];
    if (updated > 0) msgs.push(`同步 ${updated} 筆狀態`);
    if (cleaned > 0) msgs.push(`清除 ${cleaned} 筆舊記錄誤標`);
    showToast(msgs.length ? `✅ ${msgs.join('、')}` : '巡查記錄已與設施盤點一致', 'success');
  }
  return { updated, cleaned };
}

function ensureInspectionSyncMetadata() {
  inspectionBatchReclassifyProfessionalStructureRecords();

  const rows = DB.getAll('inspections');

  // ① 補齊每筆巡查記錄的中繼資料（PDF／雲端標記等）
  rows.forEach(row => {
    if (!INSPECTION_FORM_SYNC_META[row.formType]) return;
    const prepared = prepareInspectionRecordForSync({ ...row }, row.formType, false);
    const updates = {};
    [
      'inspectionItem', 'inspectionCategory', 'sourceType', 'pdfFormat', 'pdfTemplate', 'pdfFileName',
      'cloudTarget', 'cloudFolder', 'cloudFolderUrl', 'cloudSyncStatus', 'cloudQueuedAt',
      'syncedToInspectionManagement', 'syncedToFacility', 'statusEvaluationSyncedAt'
    ].forEach(key => {
      if (row[key] !== prepared[key]) updates[key] = prepared[key];
    });
    if (Object.keys(updates).length) DB.update('inspections', row.id, updates);
  });

  // ② 設施狀態同步統一由 fac_syncAllLatestProfessionalAssessments 負責（單一權威）。
  //    以前這裡另以 syncInspectionRecordToFacility 迴圈寫入設施狀態，與盤點頁的
  //    fac_ 推導公式不同，導致兩頁互相覆寫、狀態震盪、且每次 render 都判定為 dirty
  //    而重複寫入 → 效能低落。改為只在此補齊巡查中繼資料，狀態交由 fac_ 統一推導。
  if (typeof fac_syncAllLatestProfessionalAssessments === 'function') {
    fac_syncAllLatestProfessionalAssessments();
  }
}

/* ── 巡查資料同步的版本閘門 ──────────────────────────────────────────
   ensureInspectionSyncMetadata / fac_syncAllLatestProfessionalAssessments
   都是「資料變異」而非「純渲染」操作，過去在每次 render（甚至一次頁面載入
   跑兩次）都執行，77 筆資料就吃掉 ~240ms。改為以資料簽章（筆數＋最新時間戳）
   判斷是否真的有變動，只在變動後同步一次，其餘 render 直接略過。          */
let _inspDataSyncSig = null;
function inspDataSyncSignature() {
  const ins = DB.getAll('inspections');
  const fac = DB.getAll('facilities');
  let insMax = '', facMax = '';
  for (const r of ins) { const t = String(r.updatedAt || r.date || r.id || ''); if (t > insMax) insMax = t; }
  for (const r of fac) { const t = String(r.professionalAssessmentSyncAt || r.updatedAt || r.id || ''); if (t > facMax) facMax = t; }
  return `${ins.length}|${insMax}|${fac.length}|${facMax}`;
}
function inspDataEnsureSynced(force = false) {
  const sig = inspDataSyncSignature();
  if (!force && sig === _inspDataSyncSig) return;
  syncDeruHistoryIntoInspectionRecords();
  ensureInspectionSyncMetadata(); // 內含 fac_syncAllLatestProfessionalAssessments（唯一狀態權威）
  // 同步過程可能推進時間戳，重算簽章後才穩定；下次 render 若無外部變動即略過。
  _inspDataSyncSig = inspDataSyncSignature();
}

function inspectionCloudSyncColor(status) {
  if (status === '已上傳') return { color: '#166534', bg: '#dcfce7', border: '#86efac' };
  if (status === '同步中' || status === '已排程') return { color: '#d97706', bg: '#fef3c7', border: '#fcd34d' };
  return { color: '#b91c1c', bg: '#fee2e2', border: '#fca5a5' };
}

function openInspectionDriveFolder() {
  window.open(INSPECTION_GDRIVE_FOLDER_URL, '_blank', 'noopener,noreferrer');
}

function queueInspectionDriveSync(type = 'all') {
  const rows = DB.getAll('inspections');
  let count = 0;
  rows.forEach(row => {
    if (!INSPECTION_FORM_SYNC_META[row.formType]) return;
    const category = inspectionFormSyncMeta(row.formType).category;
    if (type !== 'all' && category !== type) return;
    DB.update('inspections', row.id, {
      cloudTarget: 'Google Drive',
      cloudFolderUrl: INSPECTION_GDRIVE_FOLDER_URL,
      cloudSyncStatus: '待上傳',
      cloudQueuedAt: new Date().toISOString()
    });
    count += 1;
  });
  showToast(`已建立 ${count} 筆 Google Drive 待上傳同步項目`, 'success');
  renderInspection();
}

/* ════════════════════════════════════════════════════════════════
   Google Drive 上傳（OAuth2 GIS + Drive API v3 Multipart Upload）
   使用方式：首次點擊上傳按鈕時輸入 OAuth2 Client ID，之後每次
   session 會彈出 Google 授權視窗（或直接使用已登入帳號）。
   ════════════════════════════════════════════════════════════════ */

/** 取得 OAuth2 存取令牌（觸發 Google 登入彈窗，每次 session 一次） */
function _gdriveGetToken() {
  return new Promise((resolve, reject) => {
    const clientId = localStorage.getItem('GDRIVE_CLIENT_ID');
    if (!clientId) { reject(new Error('NO_CLIENT_ID')); return; }
    if (!window.google?.accounts?.oauth2) {
      // GIS 尚未載入，等候最多 3 秒
      let waited = 0;
      const t = setInterval(() => {
        waited += 200;
        if (window.google?.accounts?.oauth2) {
          clearInterval(t);
          _gdriveGetToken().then(resolve).catch(reject);
        } else if (waited > 3000) {
          clearInterval(t);
          reject(new Error('GIS_NOT_LOADED'));
        }
      }, 200);
      return;
    }
    google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: 'https://www.googleapis.com/auth/drive.file',
      callback: resp => resp.error ? reject(new Error(resp.error)) : resolve(resp.access_token)
    }).requestAccessToken({ prompt: '' });
  });
}

/**
 * 上傳一筆表單紀錄至 Google Drive（JSON 格式）
 * @param {Object} item      已儲存的巡查紀錄（含 id）
 * @param {string} formType  'professional_structure' | 'professional_fishway'
 */
async function uploadInspectionFileToDrive(item, formType) {
  const meta = INSPECTION_FORM_SYNC_META[formType] || {};
  const facilityName = (DB.getById('facilities', item.facilityId)?.name || '未知設施').replace(/[/\\:*?"<>|]/g, '-');
  const dateStr = (item.date || new Date().toISOString().split('T')[0]);
  const fileName = `${meta.label || formType}_${facilityName}_${dateStr}.json`;

  // 立即更新狀態為上傳中
  if (item.id) DB.update('inspections', item.id, {
    cloudTarget: 'Google Drive',
    cloudSyncStatus: '上傳中',
    cloudFolderUrl: INSPECTION_GDRIVE_FOLDER_URL,
    driveSyncFileName: fileName
  });

  try {
    const payload = { ...item };
    delete payload.photoDataUrls;

    // 呼叫後端 Service Account 上傳 API
    const res = await fetch('/api/drive/sync-inspection', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        data: payload,
        formType,
        cloudFolder: meta.cloudFolder || '巡查資料管理',
        filename: fileName
      })
    });

    const result = await res.json();

    if (!res.ok || !result.success) {
      // 服務帳號未設定時，顯示設定引導
      if (result.setup_needed) {
        _showDriveSetupGuide(item, formType, fileName);
        return;
      }
      throw new Error(result.error || `HTTP ${res.status}`);
    }

    const action = result.action === 'updated' ? '覆蓋更新' : '新建上傳';
    if (item.id) {
      DB.update('inspections', item.id, {
        cloudSyncStatus: '已上傳',
        driveFileId: result.driveFileId,
        driveWebLink: result.driveWebLink,
        driveSyncedAt: new Date().toISOString(),
        driveSyncAction: action
      });
    }
    showToast(`✅ Drive ${action}完成：${fileName}`, 'success');
    if (typeof renderInspection === 'function') renderInspection();

  } catch (err) {
    const isTokenErr = /invalid_grant|token.*expired|revoked|credentials/i.test(err.message);
    showToast(
      isTokenErr
        ? '⚠️ 巡查資料已儲存至本機及 Firebase 雲端，Google Drive 服務帳號憑證已過期，請聯絡管理者更新授權。'
        : `Drive 上傳未完成：${err.message}（資料已儲存於本機）`,
      'warning'
    );
    if (item.id) DB.update('inspections', item.id, { cloudSyncStatus: '待上傳' });
    console.warn('[GDrive Upload]', err.message);
  }
}

/** 服務帳號未設定時的引導彈窗 */
function _showDriveSetupGuide(pendingItem, pendingFormType, pendingFileName) {
  const driveFolder = INSPECTION_GDRIVE_FOLDER_URL;
  const meta = INSPECTION_FORM_SYNC_META[pendingFormType] || {};
  if (pendingItem) window._drivePendingItem = { item: pendingItem, formType: pendingFormType, meta, fileName: pendingFileName };

  document.getElementById('modalTitle').textContent = '設定 Google Drive 自動上傳';
  document.getElementById('modalBody').innerHTML = `
    <div style="padding:4px 0 8px">

      <!-- 狀態：尚未設定 -->
      <div style="background:#fff7ed;border:2px solid #fed7aa;border-left:4px solid #ea580c;border-radius:10px;padding:14px 16px;margin-bottom:16px">
        <div style="font-size:15px;font-weight:800;color:#9a3412;margin-bottom:6px">
          <i class="fas fa-key" style="margin-right:6px"></i>尚未設定服務帳號憑證
        </div>
        <div style="font-size:13px;color:#78350f;line-height:1.8">
          系統使用 Google 服務帳號自動上傳，免除每次手動授權。<br>
          設定完成後，儲存巡查資料時將<b>自動上傳並覆蓋更新至 Drive</b>。
        </div>
      </div>

      <!-- 設定步驟 -->
      <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;padding:14px 16px;margin-bottom:16px">
        <div style="font-size:14px;font-weight:800;color:#1e40af;margin-bottom:10px">
          <i class="fas fa-list-ol" style="margin-right:6px"></i>一次性設定步驟（管理員執行）
        </div>
        <div style="font-size:13px;color:#1e3a8a;line-height:2">
          <b>① </b><a href="https://console.cloud.google.com/apis/library/drive.googleapis.com" target="_blank" style="color:#1d4ed8;font-weight:700">Google Cloud Console</a> → 建立/選擇專案 → 啟用 <b>Google Drive API</b><br>
          <b>② </b>IAM 與管理 → <b>服務帳號</b> → 建立服務帳號（任意名稱）<br>
          <b>③ </b>建立 JSON 金鑰 → 下載後<b>重新命名為 <code style="background:#dbeafe;padding:1px 6px;border-radius:3px">gdrive_service_account.json</code></b><br>
          <b>④ </b>將檔案放至：<code style="background:#dbeafe;padding:1px 6px;border-radius:3px">webapp/data/gdrive_service_account.json</code><br>
          <b>⑤ </b>開啟下方 Drive 資料夾 → <b>共用</b> → 加入服務帳號 Email（<b>編輯者</b>）<br>
          <b>⑥ </b>重新啟動後端伺服器
        </div>
      </div>

      <!-- 立即手動上傳（備用） -->
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:12px 14px">
        <div style="font-size:13px;font-weight:700;color:#475569;margin-bottom:8px">
          <i class="fas fa-download" style="margin-right:5px"></i>設定前臨時方案：下載後手動上傳
        </div>
        ${pendingItem ? `
        <button onclick="_driveDownloadAndOpen()" style="width:100%;padding:10px;background:#0f766e;color:#fff;border:none;border-radius:8px;font-size:14px;font-weight:700;cursor:pointer;margin-bottom:8px">
          <i class="fas fa-download" style="margin-right:6px"></i>下載此筆資料 並開啟 Drive 資料夾
        </button>` : ''}
        <a href="${inspectionEscape(driveFolder)}" target="_blank"
          style="display:block;text-align:center;padding:8px;border:1px solid #bfdbfe;border-radius:7px;color:#1d4ed8;font-size:13px;text-decoration:none">
          <i class="fas fa-folder-open" style="margin-right:5px"></i>開啟 Google Drive 巡查資料管理資料夾
        </a>
      </div>
    </div>
  `;
  document.getElementById('modalFooter').innerHTML = `
    <button class="btn btn-outline" onclick="closeModal()">關閉</button>
  `;
  openModal();
}

/** Drive 同步彈窗：提供手動下載上傳 + 進階 OAuth2 設定兩種路徑 */
function _showGDriveClientIdSetup(pendingItem, pendingFormType) {
  const saved = localStorage.getItem('GDRIVE_CLIENT_ID') || '';
  const driveFolder = INSPECTION_GDRIVE_FOLDER_URL;
  const hasPending = pendingItem && pendingFormType;
  const meta = hasPending ? (INSPECTION_FORM_SYNC_META[pendingFormType] || {}) : {};

  document.getElementById('modalTitle').textContent = '同步至 Google Drive';
  document.getElementById('modalBody').innerHTML = `
    <div style="padding:4px 0 8px">

      <!-- 方法一：手動下載上傳（推薦・最簡單） -->
      <div style="background:#f0fdf4;border:2px solid #86efac;border-left:4px solid #16a34a;border-radius:10px;padding:16px;margin-bottom:16px">
        <div style="font-size:16px;font-weight:800;color:#15803d;margin-bottom:10px">
          <i class="fas fa-download" style="margin-right:7px"></i>方法一（推薦）：下載後手動上傳
        </div>
        <div style="font-size:14px;color:#166534;line-height:1.8;margin-bottom:12px">
          1. 點擊下方「<b>下載巡查資料</b>」取得 JSON 資料檔<br>
          2. 開啟 <a href="${inspectionEscape(driveFolder)}" target="_blank" style="color:#1d4ed8;font-weight:700"><i class="fas fa-folder-open"></i> Google Drive 巡查資料管理資料夾</a><br>
          3. 將下載的檔案上傳至對應子資料夾（${inspectionEscape(meta.cloudFolder || '巡查資料管理')}）
        </div>
        ${hasPending ? `
        <button onclick="_driveDownloadAndOpen()" style="padding:10px 20px;background:#16a34a;color:#fff;border:none;border-radius:8px;font-size:15px;font-weight:700;cursor:pointer;width:100%">
          <i class="fas fa-download" style="margin-right:6px"></i>下載巡查資料 並開啟 Drive 資料夾
        </button>` : `
        <a href="${inspectionEscape(driveFolder)}" target="_blank" style="display:block;text-align:center;padding:10px 20px;background:#16a34a;color:#fff;border-radius:8px;font-size:15px;font-weight:700;text-decoration:none">
          <i class="fas fa-folder-open" style="margin-right:6px"></i>開啟 Google Drive 巡查資料管理資料夾
        </a>`}
      </div>

      <!-- 方法二：OAuth2 自動上傳（進階） -->
      <details style="border:1px solid #e2e8f0;border-radius:8px;overflow:hidden">
        <summary style="padding:12px 16px;background:#f8fafc;cursor:pointer;font-size:14px;font-weight:700;color:#475569">
          <i class="fas fa-cog" style="margin-right:6px;color:#64748b"></i>方法二（進階）：設定 OAuth2 自動上傳
        </summary>
        <div style="padding:14px 16px;font-size:13px;color:#64748b;line-height:1.7">
          <div style="background:#fefce8;border:1px solid #fde68a;border-radius:6px;padding:10px;margin-bottom:12px;color:#92400e">
            ⚠ 需要 Google Cloud Console 帳號及建立 OAuth2 憑證，適合系統管理員設定。
          </div>
          <div style="margin-bottom:10px">
            1. 前往 <a href="https://console.cloud.google.com/apis/credentials" target="_blank" style="color:#1d4ed8;font-weight:700">Google Cloud Console → 憑證</a><br>
            2. 建立「OAuth 2.0 用戶端 ID」→ 類型選「<b>網頁應用程式</b>」<br>
            3. 已授權來源加入：<code style="background:#e0f2fe;padding:1px 5px;border-radius:3px">${location.origin}</code><br>
            4. 複製用戶端 ID 貼入下方
          </div>
          <div class="form-group" style="margin-bottom:6px">
            <label style="font-size:12px">OAuth 2.0 用戶端 ID</label>
            <input id="gdrive_client_id_input" type="text"
              placeholder="xxxxxxxxxx.apps.googleusercontent.com"
              value="${inspectionEscape(saved)}"
              style="font-size:12px;font-family:monospace">
          </div>
          <button onclick="
            const v = document.getElementById('gdrive_client_id_input')?.value.trim();
            if (!v) { showToast('請輸入用戶端 ID', 'error'); return; }
            localStorage.setItem('GDRIVE_CLIENT_ID', v);
            showToast('✅ 已儲存 Client ID，下次儲存時將自動上傳', 'success');
            closeModal();
          " style="padding:8px 16px;background:#1565c0;color:#fff;border:none;border-radius:6px;font-size:13px;font-weight:700;cursor:pointer">
            <i class="fas fa-save"></i> 儲存 Client ID
          </button>
          ${saved ? `<button onclick="localStorage.removeItem('GDRIVE_CLIENT_ID');showToast('已清除 Client ID','info');closeModal();" style="margin-left:8px;padding:8px 16px;background:#fff;color:#64748b;border:1px solid #e2e8f0;border-radius:6px;font-size:13px;cursor:pointer">清除</button>` : ''}
        </div>
      </details>
    </div>
  `;
  document.getElementById('modalFooter').innerHTML = `
    <button class="btn btn-outline" onclick="closeModal()">關閉</button>
  `;
  openModal();

  // 存 pending 資料供下載
  if (hasPending) window._drivePendingItem = { item: pendingItem, formType: pendingFormType, meta };
}

function _driveDownloadAndOpen() {
  const p = window._drivePendingItem;
  if (!p) return;
  const { item, formType, meta } = p;
  const facilityName = (DB.getById('facilities', item.facilityId)?.name || '未知設施').replace(/[/\\:*?"<>|]/g, '-');
  const dateStr = item.date || new Date().toISOString().split('T')[0];
  const fileName = `${meta.label || formType}_${facilityName}_${dateStr}.json`;
  const payload = { ...item };
  delete payload.photoDataUrls;
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = fileName; a.click();
  URL.revokeObjectURL(url);
  setTimeout(() => window.open(INSPECTION_GDRIVE_FOLDER_URL, '_blank'), 500);
  if (item.id) DB.update('inspections', item.id, { cloudSyncStatus: '手動上傳', cloudSyncNote: `已下載 ${fileName}，請手動上傳至 Drive` });
  closeModal();
  showToast(`✅ 已下載 ${fileName}，請上傳至 Google Drive`, 'success');
}

/** 手動重新上傳特定紀錄（卡片上的「上傳」按鈕） */
function reuploadInspectionToDrive(id) {
  const item = DB.getById('inspections', id);
  if (!item) { showToast('找不到紀錄', 'error'); return; }
  if (!INSPECTION_FORM_SYNC_META[item.formType]) {
    showToast('此類型不支援 Drive 上傳', 'warning'); return;
  }
  uploadInspectionFileToDrive(item, item.formType);
}

/** 批量上傳所有「待上傳」或「上傳失敗」的專業巡查記錄 */
async function batchUploadPendingToDrive() {
  const rows = DB.getAll('inspections');
  const pending = rows.filter(r =>
    INSPECTION_FORM_SYNC_META[r.formType] &&
    (!r.cloudSyncStatus || r.cloudSyncStatus === '待上傳' || r.cloudSyncStatus === '上傳失敗')
  );
  if (!pending.length) {
    showToast('沒有待上傳的記錄', 'info'); return;
  }
  showToast(`開始批量上傳 ${pending.length} 筆記錄…`, 'info');
  let ok = 0, fail = 0;
  for (const item of pending) {
    try {
      await uploadInspectionFileToDrive(item, item.formType);
      ok++;
    } catch (e) {
      fail++;
    }
    // 每筆間隔 500ms 避免 API 速率限制
    await new Promise(r => setTimeout(r, 500));
  }
  showToast(`批量上傳完成：✅ ${ok} 筆成功${fail ? `　❌ ${fail} 筆失敗` : ''}`, fail ? 'warning' : 'success');
  renderInspection();
}

/**
 * 全面同步修正（一鍵解決所有同步問題）
 * 1. 清除舊記錄誤標的「待上傳」狀態
 * 2. 依設施正常狀態關閉過時的待處理/處理中記錄
 * 3. 批量上傳真正需要上傳的近期記錄至 Google Drive
 */
async function fullInspectionSync() {
  showToast('🔄 正在執行全面同步修正…', 'info');

  // ① 以巡查為主軸強制重算設施狀態（單一權威）＋清除舊誤標
  inspDataEnsureSynced(true);
  const { updated, cleaned } = syncFacilityStatusToInspections(true);

  // ② 批量上傳近期待上傳記錄（2026-06-01 後的）
  const DRIVE_START = '2026-06-01';
  const rows = DB.getAll('inspections');
  const toUpload = rows.filter(r =>
    INSPECTION_FORM_SYNC_META[r.formType] &&
    (r.date || '') >= DRIVE_START &&
    (!r.cloudSyncStatus || r.cloudSyncStatus === '待上傳' || r.cloudSyncStatus === '上傳失敗') &&
    !r.driveFileId
  );

  let uploadOk = 0, uploadFail = 0;
  for (const item of toUpload) {
    try {
      await uploadInspectionFileToDrive(item, item.formType);
      uploadOk++;
    } catch(e) { uploadFail++; }
    await new Promise(r => setTimeout(r, 400));
  }

  // 結果摘要
  const msgs = [];
  if (updated > 0) msgs.push(`${updated} 筆狀態已同步為完成`);
  if (cleaned > 0) msgs.push(`${cleaned} 筆舊記錄誤標已清除`);
  if (uploadOk > 0) msgs.push(`${uploadOk} 筆已上傳至 Drive`);
  if (uploadFail > 0) msgs.push(`${uploadFail} 筆上傳失敗`);

  showToast(
    msgs.length ? `✅ 全面同步完成：${msgs.join('　')}` : '✅ 所有資料已是最新狀態',
    uploadFail > 0 ? 'warning' : 'success'
  );
  renderInspection();
}

/**
 * 清除重複巡查紀錄：以 inspectNo + formType 為主鍵。
 * 護岸、步道、平台會共用 facilityId，因此不可只用 facilityId + formType 去重。
 */
function cleanupDuplicateInspections() {
  const rows = DB.getAll('inspections');

  const keyOf = r => {
    if (typeof DB !== 'undefined' && typeof DB._inspectionDedupeKey === 'function') {
      return DB._inspectionDedupeKey(r);
    }
    const no = String(r.inspectNo || '').trim();
    const ft = r.formType || r.type || '';
    return no ? `NO:${no}|${ft}` : ['F', r.facilityId, r.date, ft, String(r.findings || '').trim()].join('|');
  };

  // 只針對可辨識為表單的巡查記錄去重；沒有表單類型的舊紀錄保留。
  const formRows = rows.filter(r => r.formType && INSPECTION_FORM_SYNC_META[r.formType]);

  // 按「巡查編號＋表單類型」分組，保留最新一筆，並避免誤刪不同樁號表單。
  const groups = {};
  formRows.forEach(r => {
    const key = keyOf(r);
    if (!groups[key]) groups[key] = [];
    groups[key].push(r);
  });

  const toDelete = [];
  const toKeep = [];
  Object.values(groups).forEach(group => {
    if (group.length <= 1) { toKeep.push(...group); return; }
    // 排序：最新的排前面
    group.sort((a, b) => {
      const ta = a.updatedAt || a.driveSyncedAt || a.date || '';
      const tb = b.updatedAt || b.driveSyncedAt || b.date || '';
      return tb.localeCompare(ta);
    });
    toKeep.push(group[0]);
    toDelete.push(...group.slice(1));
  });

  if (!toDelete.length) {
    showToast('沒有重複記錄需要清除', 'info');
    return;
  }

  if (!confirm(`找到 ${toDelete.length} 筆重複表單（依巡查編號與表單類型判定），確定刪除？`)) return;

  toDelete.forEach(r => DB.delete('inspections', r.id));
  showToast(`已清除 ${toDelete.length} 筆重複表單，保留 ${toKeep.length} 筆有效表單`, 'success');
  renderInspection();
}

function syncDeruHistoryIntoInspectionRecords() {
  const rows = DB.getAll('inspections');
  const facilities = DB.getAll('facilities');
  rows.forEach(row => {
    if (row.deru_d === undefined || row.deru_d === null) return;
    const isDeruAssessment = row.type === 'deru_assessment'
      || row.sourceType === 'DER&U評估'
      || (!!row.facility_name && row.deru_score !== undefined && !row.weather);
    const facility = facilities.find(f =>
      Number(f.id) === Number(row.facilityId || row.facility_id)
      || f.name === row.facilityName
      || f.name === row.facility_name
    );
    const facilityName = row.facilityName || row.facility_name || facility?.name || '未指定設施';
    const facilityId = row.facilityId || row.facility_id || facility?.id || null;
    const findings = row.findings || row.notes || `DER&U 評估紀錄：D${row.deru_d}/E${row.deru_e}/R${row.deru_r}，${row.deru_label || ''}`;
    const action = row.action || row.aiImageAnalysis?.actionSuggestion || '';
    const updates = {
      facilityId,
      facility_id: facilityId,
      facilityName,
      facility_name: facilityName,
      findings,
      action,
      maintenanceStart: row.maintenanceStart || row.date || '',
      sourceType: row.sourceType || (isDeruAssessment ? 'DER&U評估' : '巡查紀錄'),
      status: row.status || getInspectionStatus(row),
      priority: row.priority || getInspectionPriority(row)
    };
    const needsUpdate = Object.keys(updates).some(key => row[key] !== updates[key]);
    if (needsUpdate) DB.update('inspections', row.id, updates);
  });
}

function inspectionPriorityClass(priority) {
  return {
    '緊急': 'danger',
    '高': 'warning',
    '中': 'info',
    '低': 'default'
  }[priority] || 'default';
}

function inspectionStatusClass(status) {
  return {
    '完成': 'success',
    '處理中': 'info',
    '待處理': 'warning'
  }[status] || 'default';
}

function inspectionRecordType(item = {}) {
  if (inspectionDataClass(item) === 'maintenance') return 'maintenance';
  if (item.formType === 'general_periodic') return 'general';
  if (item.formType === 'professional_structure') return 'professional';
  if (item.formType === 'professional_fishway') return 'fishway';
  if (item.formType === 'maintenance_completion') return 'maintenance';
  const text = `${item.sourceType || ''} ${item.type || ''} ${item.inspector || ''} ${item.profession || ''}`;
  if (text.includes('魚道檢核')) return 'fishway';
  if (text.includes('專業') || text.includes('技師') || text.includes('技士') || text.includes('DER&U') || text.includes('工程')) return 'professional';
  if (text.includes('護管') || text.includes('巡護') || text.includes('林班') || text.includes('日常')) return 'ranger';
  return 'general';
}

function inspectionRecordTypeLabel(type) {
  return {
    general: '一般巡查紀錄',
    professional: '專業巡查紀錄',
    fishway: '魚道檢核表',
    maintenance: '維護管理資料',
    ranger: '護管員巡查紀錄'
  }[type] || '一般巡查紀錄';
}

/* ══════════════════════════════════════════════════════════════
   巡查資料管理 — 獨立頁面
   ══════════════════════════════════════════════════════════════ */

function renderInspectionMgmtPage() {
  // 同步統一由 renderInspectionDataManagement 內的版本閘門處理，避免一次載入同步兩次。
  document.getElementById('contentArea').innerHTML =
    renderManualInspectionGuide() +
    renderInspectionDataManagement(true);
}

/* ══════════════════════════════════════════════════════════════
   維護管理手冊 — 巡查機制與規範（源自 維護管理手冊 Ver1.0, 114年8月）
   ══════════════════════════════════════════════════════════════ */

/* 切換各區塊展開 / 收合 */
function mgToggle(id) {
  const body = document.getElementById(id);
  const chevron = document.getElementById(id + '_chev');
  if (!body) return;
  const open = body.style.display !== 'none';
  body.style.display = open ? 'none' : '';
  if (chevron) chevron.style.transform = open ? 'rotate(-90deg)' : 'rotate(0deg)';
}

function renderManualInspectionGuide() {
  /* ── 構造物基本資料 ── */
  const FACILITIES_DATA = [
    { id:'溪構1-1',  type:'粗石斜曲面式魚道', mat:'混凝土/塊石', loc:'1K+400', x:'240786', y:'2675695' },
    { id:'溪構1-2',  type:'改良型舟通式魚道', mat:'混凝土',       loc:'1K+400', x:'240773', y:'2675689' },
    { id:'溪構2',    type:'階段式魚道',         mat:'混凝土',       loc:'1K+315', x:'240819', y:'2675607' },
    { id:'溪構3',    type:'斜坡式魚道',         mat:'混凝土/塊石', loc:'1K+225', x:'240873', y:'2675532' },
    { id:'溪構4',    type:'階段式魚道',         mat:'混凝土/塊石', loc:'1K+170', x:'240832', y:'2675493' },
    { id:'溪構5-1',  type:'防砂壩',             mat:'混凝土',       loc:'1K+000', x:'240812', y:'2675353' },
    { id:'溪構5-2',  type:'潛越式魚道',         mat:'混凝土',       loc:'1K+000', x:'240812', y:'2675353' },
    { id:'溪構6',    type:'階段式魚道',         mat:'混凝土/塊石', loc:'0K+740', x:'240785', y:'2675146' },
    { id:'溪構7',    type:'降壩魚道',           mat:'混凝土',       loc:'0K+560', x:'240704', y:'2675063' },
    { id:'溪構8-1',  type:'防砂壩',             mat:'混凝土',       loc:'0K+460', x:'240716', y:'2674967' },
    { id:'溪構8-2',  type:'之字形魚道',         mat:'混凝土',       loc:'0K+460', x:'240716', y:'2674967' },
    { id:'溪構9',    type:'固床工',             mat:'混凝土',       loc:'1K+265', x:'240858', y:'2675575' },
    { id:'溪構10',   type:'固床工',             mat:'混凝土/塊石', loc:'1K+040', x:'240802', y:'2675390' },
    { id:'溪構11',   type:'階梯式固床工',       mat:'混凝土/塊石', loc:'0K+510', x:'240716', y:'2675013' },
  ];
  const fishPassCount = FACILITIES_DATA.filter(f => f.type.includes('魚道')).length;
  const sandDamCount  = FACILITIES_DATA.filter(f => f.type.includes('防砂壩')).length;
  const groundCount   = FACILITIES_DATA.filter(f => f.type.includes('固床工')).length;

  /* ── 巡查種類 ── */
  const INSP_TYPES = [
    {
      key: 'general', icon: 'fa-clipboard-check', color: '#1565c0', bg: '#eff6ff', border: '#2563eb',
      title: '一般性定期巡查', freq: '每月 1 次', personnel: '麗陽工作站護管員',
      timing: '由工作站依護管員工作期程安排',
      form: '表 3-1 一般性定期巡查表單',
      items: [
        { icon: 'fa-road',                 label: '步　道',       desc: '外觀完整性、路面暢通狀況，伏倒木或落石阻斷' },
        { icon: 'fa-mountain',             label: '邊　坡',       desc: '是否有明顯大面積裸露區域或崩塌' },
        { icon: 'fa-border-all',           label: '平臺／護欄',   desc: '外觀有無異常、斷裂、破損或歪斜' },
        { icon: 'fa-shield',               label: '護　岸',       desc: '外觀完整性、基礎是否有淘空現象' },
        { icon: 'fa-fish',                 label: '魚道／防砂設施', desc: '外觀完整、構造物土砂淤積、基礎淘空' },
        { icon: 'fa-triangle-exclamation', label: '危木、落石',   desc: '步道周邊樹木傾倒或落石危害' },
        { icon: 'fa-sign',                 label: '告示牌／救生圈', desc: '遺失或損毀情況確認' },
      ]
    },
    {
      key: 'professional', icon: 'fa-hard-hat', color: '#9a3412', bg: '#fff7ed', border: '#ea580c',
      title: '專業性定期巡查', freq: '每 2 年 1 次', personnel: '林業保育署臺中分署集水區治理科或委外團隊',
      timing: '巡查當年汛期前完成（汛期：每年 5 月 1 日 ～ 11 月 30 日）',
      form: '表 3-2 構造物調查表 ＋ 表 3-3 魚道檢核表',
      items: [
        { icon: 'fa-magnifying-glass', label: '定性（初步）檢測', desc: '外觀目測：裂縫、磨蝕、淘空、傾倒、沉陷、錯動、位移、背填流失等 13 項' },
        { icon: 'fa-ruler-combined',   label: '定量（進階）DER&U', desc: '劣化程度(D)、劣化範圍(E)、影響性(R)三指標計算 ICS 值' },
        { icon: 'fa-fish',             label: '魚道縱向廊道評估', desc: '魚道破損、土砂淤積、水位差過大、斷流、流速異常之影響判斷' },
        { icon: 'fa-clipboard-list',   label: '全面功能評估',     desc: '構造物整體狀況分級（A/B1-B3/C1-C5）及處理建議' },
      ]
    },
    {
      key: 'emergency', icon: 'fa-bell', color: '#7c2d12', bg: '#fff1f2', border: '#dc2626',
      title: '不定期緊急巡查', freq: '事件後立即啟動', personnel: '林業保育署臺中分署集水區治理科或委外團隊',
      timing: '事件發生後立即啟動，由分署緊急通報協調',
      form: '表 3-2 構造物調查表 ＋ 表 3-3 魚道檢核表',
      items: [
        { icon: 'fa-cloud-rain',      label: '大豪雨觸發',   desc: '24 小時累積雨量 ≥ 350 mm 或 3 小時累積雨量 ≥ 200 mm' },
        { icon: 'fa-house-crack',     label: '地震觸發',     desc: '震度達 五弱（≥5）以上之地震事件' },
        { icon: 'fa-person-digging',  label: '其他事故',     desc: '重要設施遭人為破壞，或已有設施損毀且可能擴大者' },
        { icon: 'fa-shield-halved',   label: '應急處理程序', desc: '封閉交通 → 警示設施 → 全面檢測 → 研擬修復方案 → 安全驗收' },
      ]
    }
  ];

  /* ── DER&U 評分系統 ── */
  const DERU_GRADES = [
    { label:'A 級',  color:'#16a34a', bg:'#f0fdf4', desc:'外觀良好或些微磨損，功能健全',      action:'例行維護（定期檢測）' },
    { label:'B1 級', color:'#1565c0', bg:'#eff6ff', desc:'重要工程，劣化範圍 ＜ 60%',        action:'進階(定量)DER&U 檢測，建檔管理' },
    { label:'B2 級', color:'#0891b2', bg:'#ecfeff', desc:'一般工程，30% ≤ 劣化 ＜ 60%',     action:'1～3 年內應處理維護（重建、補強）' },
    { label:'B3 級', color:'#0369a1', bg:'#f0f9ff', desc:'一般工程，劣化範圍 ＜ 30%',        action:'進入定期檢測系統' },
    { label:'C1 級', color:'#dc2626', bg:'#fff1f2', desc:'重要工程，劣化範圍 ≥ 80%',         action:'緊急（短時間）處理重建' },
    { label:'C2 級', color:'#e11d48', bg:'#fff1f2', desc:'重要工程，60% ≤ 劣化 ＜ 80%',     action:'1 年內應處理重建' },
    { label:'C3 級', color:'#9a3412', bg:'#fff7ed', desc:'一般工程，劣化 ≥ 60%，有保全對象', action:'1 年內應處理重建' },
    { label:'C4 級', color:'#b45309', bg:'#fffbeb', desc:'一般工程，劣化 ≥ 60%，無保全對象', action:'緩建或適當情形下重建' },
    { label:'C5 級', color:'#78716c', bg:'#fafaf9', desc:'原工程目的已有替代工程者',          action:'維持現況' },
  ];

  /* ── ICS 急迫性分級 ── */
  const ICS_LEVELS = [
    { range:'ICS ≥ 85',      grade:'I 級',   color:'#16a34a', action:'例行處理維護' },
    { range:'70 ≤ ICS ＜ 85', grade:'II 級',  color:'#d97706', action:'三年內必須處理維護' },
    { range:'40 ≤ ICS ＜ 70', grade:'III 級', color:'#ea580c', action:'一年內必須處理維護' },
    { range:'ICS ＜ 40',      grade:'IV 級',  color:'#dc2626', action:'緊急處理重建' },
  ];

  /* ── 劣化型態 ── */
  const DETERIORATION_TYPES = [
    { icon: 'fa-minus',             name:'裂縫',    desc:'混凝土開裂，影響承載與耐久性' },
    { icon: 'fa-eraser',            name:'磨蝕',    desc:'高速挾砂水流沖刷，表面剝離流失' },
    { icon: 'fa-circle-dot',        name:'淘空',    desc:'河水沖刷造成基礎流失、凹陷' },
    { icon: 'fa-rotate',            name:'傾倒',    desc:'地震/背填流失/承載不足致傾斜' },
    { icon: 'fa-down-long',         name:'沉陷',    desc:'底部土壤沖刷或承載不足下沉' },
    { icon: 'fa-wave-square',       name:'錯動變形', desc:'構造物凹陷、隆起、彎曲變形' },
    { icon: 'fa-arrows-left-right', name:'位移',    desc:'構造物水平移動偏離設計位置' },
    { icon: 'fa-droplet-slash',     name:'背填流失', desc:'護岸背填土方沖刷流失' },
    { icon: 'fa-tree',              name:'腐朽',    desc:'木材細胞壁被腐菌分解（白腐/褐腐）' },
    { icon: 'fa-fire',              name:'火害',    desc:'燃燒造成構造物損傷' },
    { icon: 'fa-link-slash',        name:'外框斷裂', desc:'蛇籠/箱籠線狀外框斷裂' },
    { icon: 'fa-seedling',          name:'植生不良', desc:'坡面植生覆蓋不足，易造成侵蝕' },
  ];

  /* ── 共用樣式：可折疊區塊標題列 ── */
  function sectionHeader(id, gradient, icon, iconColor, title, subtitle, defaultOpen = true) {
    const chevRot = defaultOpen ? 'rotate(0deg)' : 'rotate(-90deg)';
    return `
    <div onclick="mgToggle('${id}')" style="background:${gradient};padding:20px 28px;
         display:flex;align-items:center;justify-content:space-between;
         cursor:pointer;user-select:none;border-radius:${defaultOpen?'16px 16px 0 0':'16px'}">
      <div>
        <div style="font-size:26px;font-weight:900;color:#fff;display:flex;align-items:center;gap:12px">
          <i class="fas ${icon}" style="color:${iconColor}"></i>${title}
        </div>
        ${subtitle ? `<div style="font-size:17px;color:rgba(255,255,255,.75);margin-top:5px">${subtitle}</div>` : ''}
      </div>
      <i id="${id}_chev" class="fas fa-chevron-down"
         style="color:rgba(255,255,255,.85);font-size:22px;transition:transform .25s;transform:${chevRot}"></i>
    </div>`;
  }

  return `
  <!-- ══════════ 維護管理手冊 巡查機制規範 ══════════ -->
  <div style="margin-bottom:28px">

    <!-- ── 頂部橫幅（不可折） ── -->
    <div style="background:linear-gradient(135deg,#1e3a5f 0%,#0f4c81 50%,#1565c0 100%);
                border-radius:16px;padding:30px 36px;margin-bottom:20px;
                box-shadow:0 8px 32px rgba(15,23,42,.25);position:relative;overflow:hidden">
      <div style="position:absolute;right:-20px;top:-20px;width:200px;height:200px;
                  border-radius:50%;background:rgba(255,255,255,.06)"></div>
      <div style="position:absolute;right:80px;bottom:-50px;width:240px;height:240px;
                  border-radius:50%;background:rgba(255,255,255,.04)"></div>
      <div style="position:relative;z-index:1;display:flex;align-items:flex-start;
                  justify-content:space-between;gap:24px;flex-wrap:wrap">
        <div>
          <div style="font-size:17px;color:rgba(255,255,255,.75);margin-bottom:8px;letter-spacing:.5px">
            <i class="fas fa-book-open" style="margin-right:8px"></i>
            農業部林業及自然保育署臺中分署 ／ Ver1.0 ／ 114年8月
          </div>
          <h2 style="margin:0 0 10px;font-size:34px;font-weight:900;color:#fff;letter-spacing:-.3px">
            <i class="fas fa-hard-hat" style="color:#fbbf24;margin-right:12px"></i>橫流溪重要設施維護管理
          </h2>
          <div style="font-size:20px;color:rgba(255,255,255,.88);line-height:1.7">
            維護範圍：橫流溪 <strong style="color:#fbbf24">0K+460 ～ 1K+400</strong>
            ｜步道 0K+000 ～ 1K+290
          </div>
        </div>
        <div style="display:flex;gap:14px;flex-wrap:wrap">
          ${[
            [fishPassCount,'座魚道'],
            [sandDamCount, '座防砂壩'],
            [groundCount,  '座固床工'],
            [4,            '座觀景平臺'],
          ].map(([n,lbl])=>`
          <div style="background:rgba(255,255,255,.13);border:1px solid rgba(255,255,255,.22);
                      border-radius:14px;padding:16px 22px;text-align:center;min-width:88px">
            <div style="font-size:44px;font-weight:900;color:#fbbf24;line-height:1">${n}</div>
            <div style="font-size:16px;color:rgba(255,255,255,.85);margin-top:6px">${lbl}</div>
          </div>`).join('')}
        </div>
      </div>
    </div>

    <!-- ══ ① 巡查種類與機制 ══ -->
    <div style="border:2px solid #bfdbfe;border-radius:16px;margin-bottom:20px;
                box-shadow:0 4px 16px rgba(15,23,42,.07);overflow:hidden">
      ${sectionHeader('mg_insp','linear-gradient(90deg,#1e3a5f,#1565c0)',
        'fa-clipboard-list','#fbbf24','巡查種類與機制',
        '一般性 ／ 專業性 ／ 不定期（緊急）三類制度', false)}
      <div id="mg_insp" style="padding:24px;background:#fff;display:none">
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:18px">
          ${INSP_TYPES.map(t => `
          <div style="background:${t.bg};border:2px solid ${t.border};border-radius:14px;padding:24px">
            <!-- 卡片標頭 -->
            <div style="display:flex;align-items:center;gap:14px;margin-bottom:18px">
              <div style="width:60px;height:60px;border-radius:16px;background:${t.color};color:#fff;
                          display:flex;align-items:center;justify-content:center;font-size:26px;
                          box-shadow:0 4px 14px ${t.color}44;flex-shrink:0">
                <i class="fas ${t.icon}"></i>
              </div>
              <div>
                <div style="font-size:22px;font-weight:900;color:${t.color}">${t.title}</div>
                <div style="font-size:18px;font-weight:700;color:#0f172a;margin-top:3px">
                  <i class="fas fa-clock" style="margin-right:5px;opacity:.6"></i>${t.freq}
                </div>
              </div>
            </div>
            <!-- 巡查基本資訊 -->
            <div style="background:rgba(255,255,255,.75);border:1px solid rgba(0,0,0,.08);
                        border-radius:12px;padding:14px 16px;margin-bottom:18px">
              ${[
                ['fa-user-tie', '巡查人員', t.personnel],
                ['fa-calendar', '巡查時機', t.timing],
                ['fa-file-alt', '使用表格', t.form],
              ].map(([ic,lb,val])=>`
              <div style="display:flex;gap:8px;margin-bottom:8px;align-items:flex-start">
                <i class="fas ${ic}" style="color:${t.color};margin-top:4px;font-size:15px;flex-shrink:0"></i>
                <div style="font-size:17px;color:#1e293b;line-height:1.65">
                  <strong>${lb}：</strong>${val}
                </div>
              </div>`).join('')}
            </div>
            <!-- 巡查項目 -->
            <div style="font-size:17px;font-weight:800;color:${t.color};margin-bottom:10px;
                        padding-left:6px;border-left:4px solid ${t.color}">
              巡查項目 &amp; 重點
            </div>
            <div style="display:flex;flex-direction:column;gap:10px">
              ${t.items.map(item=>`
              <div style="display:flex;gap:12px;align-items:flex-start;
                          background:rgba(255,255,255,.65);border-radius:10px;padding:12px 14px">
                <div style="width:38px;height:38px;border-radius:10px;background:${t.color}1a;
                            color:${t.color};display:flex;align-items:center;justify-content:center;
                            flex-shrink:0;font-size:17px">
                  <i class="fas ${item.icon}"></i>
                </div>
                <div>
                  <div style="font-size:18px;font-weight:800;color:#0f172a">${item.label}</div>
                  <div style="font-size:16px;color:#475569;line-height:1.6;margin-top:3px">${item.desc}</div>
                </div>
              </div>`).join('')}
            </div>
            <!-- 新增表單按鈕 -->
            <div style="margin-top:16px;padding-top:14px;border-top:1px solid rgba(0,0,0,.08);display:flex;flex-direction:column;gap:8px">
              ${t.key === 'general' ? `
                <button onclick="openGeneralPeriodicForm()"
                  style="width:100%;padding:11px 14px;background:${t.color};color:#fff;border:none;border-radius:10px;font-size:17px;font-weight:800;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px">
                  <i class="fas fa-plus-circle"></i> 新增一般性巡查（附錄一）
                </button>
              ` : `
                <button onclick="openStructureInspectionForm()"
                  style="width:100%;padding:11px 14px;background:${t.color};color:#fff;border:none;border-radius:10px;font-size:17px;font-weight:800;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px">
                  <i class="fas fa-building"></i> 構造物調查表（附錄二）
                </button>
                <button onclick="openFishwayForm()"
                  style="width:100%;padding:11px 14px;background:#fff;color:${t.color};border:2px solid ${t.color};border-radius:10px;font-size:17px;font-weight:800;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px">
                  <i class="fas fa-fish"></i> 魚道檢核表（附錄三）
                </button>
              `}
            </div>
          </div>`).join('')}
        </div>
      </div>
    </div>

    <!-- ══ ② 構造物基本資料 ══ -->
    <div style="border:2px solid #c7d2fe;border-radius:16px;margin-bottom:20px;
                box-shadow:0 4px 16px rgba(15,23,42,.07);overflow:hidden">
      ${sectionHeader('mg_fac','linear-gradient(90deg,#0f172a,#1e3a5f)',
        'fa-list-check','#fbbf24','構造物基本資料（表 1-1）',
        `TWD97 坐標定位 ／ 共 ${FACILITIES_DATA.length} 座構造物`, false)}
      <div id="mg_fac" style="background:#fff;display:none">
        <div style="overflow-x:auto">
          <table style="width:100%;border-collapse:collapse">
            <thead>
              <tr style="background:#f1f5f9;border-bottom:3px solid #cbd5e1">
                ${['設施編號','設施種類','使用材質','位置樁號','TWD97 X','TWD97 Y'].map(h=>`
                <th style="padding:18px 22px;text-align:left;font-size:19px;font-weight:900;
                           color:#1e3a5f;white-space:nowrap">${h}</th>`).join('')}
              </tr>
            </thead>
            <tbody>
              ${FACILITIES_DATA.map((f, idx) => {
                const isFish = f.type.includes('魚道');
                const isSand = f.type.includes('防砂壩');
                const rowBg = idx % 2 === 0 ? '#fff' : '#f8fafc';
                const tagColor = isFish ? '#1565c0' : isSand ? '#9a3412' : '#166534';
                const tagBg = isFish ? '#eff6ff' : isSand ? '#fff7ed' : '#f0fdf4';
                return `
              <tr style="background:${rowBg};border-bottom:1px solid #e2e8f0"
                  onmouseover="this.style.background='#e0f2fe'" onmouseout="this.style.background='${rowBg}'">
                <td style="padding:16px 22px;font-size:20px;font-weight:900;color:#0f172a">${f.id}</td>
                <td style="padding:16px 22px">
                  <span style="background:${tagBg};color:${tagColor};border:1px solid ${tagColor}44;
                               border-radius:999px;padding:6px 16px;font-size:18px;font-weight:700">
                    ${f.type}
                  </span>
                </td>
                <td style="padding:16px 22px;font-size:17px;color:#475569">${f.mat}</td>
                <td style="padding:16px 22px;text-align:center;font-size:19px;font-weight:800;color:#0369a1">${f.loc}</td>
                <td style="padding:16px 22px;text-align:center;font-size:17px;color:#64748b;font-family:monospace">${f.x}</td>
                <td style="padding:16px 22px;text-align:center;font-size:17px;color:#64748b;font-family:monospace">${f.y}</td>
              </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>
        <div style="padding:14px 22px;background:#f8fafc;border-top:1px solid #e2e8f0;
                    display:flex;gap:16px;flex-wrap:wrap;align-items:center">
          ${[['魚道','#1565c0','#eff6ff'],['防砂壩','#9a3412','#fff7ed'],['固床工','#166534','#f0fdf4']].map(([label,color,bg])=>`
          <span style="background:${bg};color:${color};border:1px solid ${color}44;
                       border-radius:999px;padding:5px 16px;font-size:17px;font-weight:700">
            <i class="fas fa-circle" style="font-size:10px;margin-right:5px"></i>${label}
          </span>`).join('')}
          <span style="margin-left:auto;font-size:16px;color:#64748b">
            另有護岸（0K+400～1K+400）、步道（0K+000～1K+290）、平臺 1-4、告示牌、救生圈
          </span>
        </div>
      </div>
    </div>

    <!-- ══ ③ DER&U 功能評估等級 ══ -->
    <div style="border:2px solid #a5b4fc;border-radius:16px;margin-bottom:20px;
                box-shadow:0 4px 16px rgba(15,23,42,.07);overflow:hidden">
      ${sectionHeader('mg_deru','linear-gradient(90deg,#1e3a5f,#1565c0)',
        'fa-chart-bar','#fbbf24','構造物功能評估等級（DER&amp;U）',
        '劣化程度 D ／ 劣化範圍 E ／ 影響性 R ／ 急迫性 U', false)}
      <div id="mg_deru" style="padding:24px;background:#fff;display:none">
        <div style="display:flex;flex-direction:column;gap:12px">
          ${DERU_GRADES.map(g => `
          <div style="display:flex;align-items:center;gap:16px;background:${g.bg};
                      border:1px solid ${g.color}44;border-left:8px solid ${g.color};
                      border-radius:12px;padding:16px 20px">
            <div style="font-size:24px;font-weight:900;color:${g.color};min-width:72px">${g.label}</div>
            <div style="flex:1;display:flex;flex-wrap:wrap;gap:8px 32px;align-items:center">
              <div style="font-size:19px;font-weight:700;color:#0f172a">${g.desc}</div>
              <div style="font-size:18px;color:#475569">
                <i class="fas fa-arrow-right" style="color:${g.color};margin-right:6px"></i>${g.action}
              </div>
            </div>
          </div>`).join('')}
        </div>
      </div>
    </div>

    <!-- ══ ④ ICS 急迫性狀況指標 ══ -->
    <div style="border:2px solid #fcd34d;border-radius:16px;margin-bottom:20px;
                box-shadow:0 4px 16px rgba(15,23,42,.07);overflow:hidden">
      ${sectionHeader('mg_ics','linear-gradient(90deg,#1e3a5f,#0369a1)',
        'fa-tachometer-alt','#fbbf24','ICS 急迫性狀況指標',
        'ICS = Σ(Di · Ei · Ri) / n(Dmax · Emax · Rmax) × 100', false)}
      <div id="mg_ics" style="padding:24px;background:#fff;display:none">
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:16px">
          ${ICS_LEVELS.map(lvl => `
          <div style="border:2px solid ${lvl.color}55;border-top:8px solid ${lvl.color};
                      border-radius:14px;padding:22px 20px;text-align:center;background:${lvl.color}08">
            <div style="font-size:28px;font-weight:900;color:${lvl.color};margin-bottom:8px">${lvl.grade}</div>
            <div style="font-size:19px;font-weight:700;color:#64748b;margin-bottom:12px">${lvl.range}</div>
            <div style="background:${lvl.color};color:#fff;border-radius:8px;
                        padding:10px 14px;font-size:18px;font-weight:800">${lvl.action}</div>
          </div>`).join('')}
        </div>
      </div>
    </div>

    <!-- ══ ⑤ 魚道進階評估標準 ══ -->
    <div style="border:2px solid #7dd3fc;border-radius:16px;margin-bottom:20px;
                box-shadow:0 4px 16px rgba(15,23,42,.07);overflow:hidden">
      ${sectionHeader('mg_fish','linear-gradient(90deg,#0c4a6e,#0284c7)',
        'fa-fish','#fbbf24','魚道進階評估標準（表 3-14）',
        '四項定量指標 ／ 綠＝正常  橙＝注意  紅＝異常', false)}
      <div id="mg_fish" style="padding:24px;background:#fff;display:none">
        <!-- 欄位說明列 -->
        <div style="display:grid;grid-template-columns:180px 1fr 1fr 1fr;gap:12px;
                    margin-bottom:14px;padding:0 4px">
          <div style="font-size:18px;font-weight:800;color:#0369a1">評估項目</div>
          <div style="text-align:center;font-size:18px;font-weight:800;color:#166534">✓ 正常</div>
          <div style="text-align:center;font-size:18px;font-weight:800;color:#9a3412">⚠ 注意</div>
          <div style="text-align:center;font-size:18px;font-weight:800;color:#dc2626">✗ 異常</div>
        </div>
        <div style="display:flex;flex-direction:column;gap:12px">
          ${[
            { item:'本體結構破損', ok:'破損 ＜ 10%',    warn:'10 ～ 60%',  crit:'≥ 60%' },
            { item:'土砂淤積',     ok:'淤積 ＜ 25%',    warn:'25 ～ 75%',  crit:'≥ 75%' },
            { item:'水位差過大',   ok:'＜ 30 cm',        warn:'30 ～ 50 cm',crit:'≥ 50 cm' },
            { item:'流速適宜',     ok:'0.4 ～ 1.5 m/s', warn:'斷流',       crit:'＜0.4 或 ＞1.5 m/s' },
          ].map(row=>`
          <div style="display:grid;grid-template-columns:180px 1fr 1fr 1fr;gap:12px;align-items:stretch">
            <div style="font-size:19px;font-weight:800;color:#0f172a;display:flex;align-items:center;
                        padding:0 4px">${row.item}</div>
            <div style="text-align:center;background:#f0fdf4;border:2px solid #86efac;
                        border-radius:10px;padding:14px 10px;font-size:18px;font-weight:700;color:#166534">
              ✓ ${row.ok}</div>
            <div style="text-align:center;background:#fff7ed;border:2px solid #fdba74;
                        border-radius:10px;padding:14px 10px;font-size:18px;font-weight:700;color:#9a3412">
              ⚠ ${row.warn}</div>
            <div style="text-align:center;background:#fff1f2;border:2px solid #fca5a5;
                        border-radius:10px;padding:14px 10px;font-size:18px;font-weight:700;color:#dc2626">
              ✗ ${row.crit}</div>
          </div>`).join('')}
        </div>
      </div>
    </div>

    <!-- ══ ⑥ 劣化型態 13 種 ══ -->
    <div style="border:2px solid #93c5fd;border-radius:16px;margin-bottom:20px;
                box-shadow:0 4px 16px rgba(15,23,42,.07);overflow:hidden">
      ${sectionHeader('mg_det','linear-gradient(90deg,#1e3a5f,#3b82f6)',
        'fa-exclamation-triangle','#fbbf24','構造物外觀劣化型態一覽（13 種）',
        '外觀檢視勾選依據 ／ 圖 3-1 構造物外觀劣化型態示意圖', false)}
      <div id="mg_det" style="padding:24px;background:#fff;display:none">
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:14px">
          ${DETERIORATION_TYPES.map((d, i) => `
          <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:14px;
                      padding:18px;display:flex;gap:14px;align-items:flex-start">
            <div style="width:48px;height:48px;border-radius:12px;background:#1565c01a;
                        color:#1565c0;display:flex;align-items:center;justify-content:center;
                        flex-shrink:0;font-size:20px">
              <i class="fas ${d.icon}"></i>
            </div>
            <div>
              <div style="font-size:20px;font-weight:900;color:#0f172a">${i+1}. ${d.name}</div>
              <div style="font-size:17px;color:#475569;line-height:1.6;margin-top:4px">${d.desc}</div>
            </div>
          </div>`).join('')}
          <!-- 第13項 -->
          <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:14px;
                      padding:18px;display:flex;gap:14px;align-items:flex-start">
            <div style="width:48px;height:48px;border-radius:12px;background:#1565c01a;
                        color:#1565c0;display:flex;align-items:center;justify-content:center;
                        flex-shrink:0;font-size:20px">
              <i class="fas fa-question"></i>
            </div>
            <div>
              <div style="font-size:20px;font-weight:900;color:#0f172a">13. 其他</div>
              <div style="font-size:17px;color:#475569;line-height:1.6;margin-top:4px">
                除前述 12 項外之其他損壞型態
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ══ ⑦ 緊急應變（合併版）══ -->
    <div style="border:2px solid #fca5a5;border-radius:16px;overflow:hidden;
                box-shadow:0 6px 20px rgba(185,28,28,.15);margin-bottom:8px">
      ${sectionHeader('mg_emg','linear-gradient(135deg,#450a0a,#7f1d1d)',
        'fa-bell','#fbbf24','緊急應變處理流程　・　緊急聯絡',
        '封閉 → 警示 → 檢測 → 修復 → 驗收　｜　集水區治理科 (04) 2515-0855', false)}
      <div id="mg_emg" style="padding:24px;background:#fff;display:none">
        <div style="display:grid;grid-template-columns:1fr auto;gap:24px;align-items:start">

          <!-- 左：五步驟流程 -->
          <div style="display:flex;gap:0;flex-wrap:wrap;justify-content:flex-start;align-items:center">
            ${[
              { icon:'fa-ban',                   label:'封閉交通',  desc:'立即封閉本區，阻止人員進入' },
              { icon:'fa-triangle-exclamation',  label:'放置警示',  desc:'設置安全警示設施與圍籬' },
              { icon:'fa-magnifying-glass',       label:'組專業團隊', desc:'全面現場檢測，評估損壞' },
              { icon:'fa-file-pen',              label:'研擬修復',  desc:'依損壞分級制定修復方案' },
              { icon:'fa-check-circle',          label:'安全驗收',  desc:'確認結構安全後恢復通行' },
            ].map((s, i, arr) => `
            <div style="display:flex;align-items:center;flex-shrink:0">
              <div style="text-align:center;width:118px;padding:8px 0">
                <div style="width:64px;height:64px;border-radius:16px;background:#7f1d1d;
                            color:#fbbf24;display:flex;align-items:center;justify-content:center;
                            font-size:26px;margin:0 auto 10px;border:2px solid #fca5a5">
                  <i class="fas ${s.icon}"></i>
                </div>
                <div style="font-size:18px;font-weight:800;color:#0f172a">${s.label}</div>
                <div style="font-size:15px;color:#64748b;margin-top:4px;line-height:1.5">${s.desc}</div>
              </div>
              ${i < arr.length - 1 ? `
              <div style="width:34px;display:flex;flex-direction:column;align-items:center;flex-shrink:0">
                <div style="width:100%;height:3px;background:#fca5a5"></div>
                <i class="fas fa-chevron-right" style="color:#dc2626;font-size:16px;margin-top:-10px"></i>
              </div>` : ''}
            </div>`).join('')}
          </div>

          <!-- 右：緊急聯絡卡片 -->
          <div style="min-width:240px;display:flex;flex-direction:column;gap:12px">
            <div style="background:linear-gradient(135deg,#7f1d1d,#dc2626);border-radius:12px;
                        padding:14px 18px;display:flex;align-items:center;gap:10px">
              <i class="fas fa-phone" style="color:#fbbf24;font-size:20px"></i>
              <span style="font-size:22px;font-weight:900;color:#fff">緊急聯絡</span>
            </div>
            <div style="background:#fff1f2;border:1px solid #fca5a5;border-radius:12px;padding:14px 16px">
              <div style="font-size:15px;color:#64748b;margin-bottom:4px">聯絡單位</div>
              <div style="font-size:19px;font-weight:800;color:#0f172a">集水區治理科</div>
              <div style="font-size:17px;color:#475569;margin-top:3px">科長 ／ 技正（二員）</div>
            </div>
            <div style="background:#dc2626;border-radius:12px;padding:16px;text-align:center">
              <div style="font-size:15px;color:rgba(255,255,255,.8);margin-bottom:6px">緊急電話</div>
              <div style="font-size:26px;font-weight:900;color:#fff;letter-spacing:.5px">
                <i class="fas fa-phone" style="margin-right:8px"></i>(04) 2515-0855
              </div>
            </div>
            <div style="font-size:15px;color:#64748b;line-height:1.7;background:#f8fafc;
                        border-radius:10px;padding:12px 14px">
              緊急狀況時應立即以<strong>電話或即時通訊</strong>通知，並依應急預案啟動全面檢查。
            </div>
          </div>

        </div>
      </div>
    </div>

  </div>
  <!-- ══════════ 維護管理手冊結束 ══════════ -->
  `;
}

let inspDataTab = 'professional'; // 'all' | 'general' | 'professional' | 'fishway' | 'ranger'
let inspDataPage = 1;              // 目前頁碼（1 起算）
let inspDataPageSize = 30;         // 每頁筆數；0 = 全部不分頁

function inspDataGoToPage(p) {
  inspDataPage = Math.max(1, Number(p) || 1);
  inspDataMgmtRender();
  const wrap = document.getElementById('inspDbListWrapper');
  if (wrap && wrap.scrollIntoView) wrap.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
function inspDataSetPageSize(size) {
  inspDataPageSize = Number(size) || 0; // 0 代表「全部」
  inspDataPage = 1;
  inspDataMgmtRender();
}

/* ══════════════════════════════════════════════════════════════
   護管員巡查日誌（梁技正橫流溪巡查日誌，民國109-113年）
   來源：01_工程設施維護與資料/更新資料/梁技正橫流溪巡查日誌
   ══════════════════════════════════════════════════════════════ */
const _RANGER_BASE = '01_工程設施維護與資料/更新資料/梁技正橫流溪巡查日誌/';
function rangerInspHref(filename) {
  return '/media/' + _RANGER_BASE.split('/').map(encodeURIComponent).join('/') + encodeURIComponent(filename);
}
let _selectedRIRecord = 'ri-01';
function giRangerSelect(id) {
  _selectedRIRecord = id;
  document.querySelectorAll('[id^="ri_card_"]').forEach(card => {
    const active = card.id === 'ri_card_' + id;
    card.style.border    = `${active?'2px':'1px'} solid ${active?'#166534':'#e2e8f0'}`;
    card.style.background = active ? '#f0fdf4' : '#fff';
    card.style.borderLeft = `${active?4:4}px solid ${active?'#166534':'transparent'}`;
  });
  const rec = RANGER_INSP_RECORDS.find(r => r.id === id);
  if (!rec) return;
  const href = rangerInspHref(rec.pdf);
  const title = document.getElementById('ri_title');
  const meta  = document.getElementById('ri_meta');
  const link1 = document.getElementById('ri_link_1');
  const link2 = document.getElementById('ri_link_2');
  if (title) title.textContent = rec.title;
  if (meta)  meta.textContent  = `${rec.displayDate}｜橫流溪護管員巡查日誌｜PDF`;
  [link1, link2].forEach(a => { if (a) a.href = href; });
}

const RANGER_INSP_RECORDS = [
  // ── 民國109年（2020）──
  { id:'ri-01',  date:'2020-03-06', displayDate:'民國109年03月06日', pdf:'日報表_c31344_20200306.pdf' },
  { id:'ri-02',  date:'2020-04-22', displayDate:'民國109年04月22日', pdf:'日報表_c31344_20200422.pdf' },
  { id:'ri-03',  date:'2020-05-04', displayDate:'民國109年05月04日', pdf:'日報表_c31344_20200504.pdf' },
  { id:'ri-04',  date:'2020-05-06', displayDate:'民國109年05月06日', pdf:'日報表_c31344_20200506.pdf' },
  { id:'ri-05',  date:'2020-05-13', displayDate:'民國109年05月13日', pdf:'日報表_c31344_20200513.pdf' },
  { id:'ri-06',  date:'2020-07-02', displayDate:'民國109年07月02日', pdf:'日報表_c31344_20200702.pdf' },
  { id:'ri-07',  date:'2020-07-29', displayDate:'民國109年07月29日', pdf:'日報表_c31344_20200729.pdf' },
  { id:'ri-08',  date:'2020-08-03', displayDate:'民國109年08月03日', pdf:'日報表_c31344_20200803.pdf' },
  { id:'ri-09',  date:'2020-08-10', displayDate:'民國109年08月10日', pdf:'日報表_c31344_20200810.pdf' },
  { id:'ri-10',  date:'2020-09-07', displayDate:'民國109年09月07日', pdf:'日報表_c31344_20200907 (1).pdf' },
  { id:'ri-11',  date:'2020-09-22', displayDate:'民國109年09月22日', pdf:'日報表_c31344_20200922.pdf' },
  // ── 民國110年（2021）──
  { id:'ri-12',  date:'2021-01-11', displayDate:'民國110年01月11日', pdf:'日報表_c31344_20210111.pdf' },
  { id:'ri-13',  date:'2021-02-17', displayDate:'民國110年02月17日', pdf:'日報表_c31344_20210217.pdf' },
  { id:'ri-14',  date:'2021-04-26', displayDate:'民國110年04月26日', pdf:'日報表_c31344_20210426.pdf' },
  { id:'ri-15',  date:'2021-06-15', displayDate:'民國110年06月15日', pdf:'日報表_c31344_20210615.pdf' },
  { id:'ri-16',  date:'2021-08-05', displayDate:'民國110年08月05日', pdf:'日報表_c31344_20210805.pdf' },
  { id:'ri-17',  date:'2021-08-06', displayDate:'民國110年08月06日', pdf:'日報表_c31344_20210806.pdf' },
  { id:'ri-18',  date:'2021-08-25', displayDate:'民國110年08月25日', pdf:'日報表_c31344_20210825.pdf' },
  { id:'ri-19',  date:'2021-10-20', displayDate:'民國110年10月20日', pdf:'日報表_c31344_20211020.pdf' },
  { id:'ri-20',  date:'2021-12-01', displayDate:'民國110年12月01日', pdf:'日報表_c31344_20211201.pdf' },
  { id:'ri-21',  date:'2021-12-03', displayDate:'民國110年12月03日', pdf:'日報表_c31344_20211203.pdf' },
  // ── 民國111年（2022）──
  { id:'ri-22',  date:'2022-01-10', displayDate:'民國111年01月10日', pdf:'日報表_c31344_20220110.pdf' },
  { id:'ri-23',  date:'2022-03-14', displayDate:'民國111年03月14日', pdf:'日報表_c31344_20220314.pdf' },
  { id:'ri-24',  date:'2022-04-12', displayDate:'民國111年04月12日', pdf:'日報表_c31344_20220412.pdf' },
  { id:'ri-25',  date:'2022-04-27', displayDate:'民國111年04月27日', pdf:'日報表_c31344_20220427.pdf' },
  { id:'ri-26',  date:'2022-08-09', displayDate:'民國111年08月09日', pdf:'日報表_c31344_20220809.pdf' },
  { id:'ri-27',  date:'2022-08-10', displayDate:'民國111年08月10日', pdf:'日報表_c31344_20220810.pdf' },
  { id:'ri-28',  date:'2022-08-11', displayDate:'民國111年08月11日', pdf:'日報表_c31344_20220811.pdf' },
  { id:'ri-29',  date:'2022-08-19', displayDate:'民國111年08月19日', pdf:'日報表_c31344_20220819.pdf' },
  { id:'ri-30',  date:'2022-09-05', displayDate:'民國111年09月05日', pdf:'日報表_c31344_20220905.pdf' },
  { id:'ri-31',  date:'2022-09-13', displayDate:'民國111年09月13日', pdf:'日報表_c31344_20220913.pdf' },
  { id:'ri-32',  date:'2022-09-20', displayDate:'民國111年09月20日', pdf:'日報表_c31344_20220920.pdf' },
  { id:'ri-33',  date:'2022-10-12', displayDate:'民國111年10月12日', pdf:'日報表_c31344_20221012.pdf' },
  { id:'ri-34',  date:'2022-10-27', displayDate:'民國111年10月27日', pdf:'日報表_c31344_20221027.pdf' },
  { id:'ri-35',  date:'2022-11-23', displayDate:'民國111年11月23日', pdf:'日報表_c31344_20221123.pdf' },
  { id:'ri-36',  date:'2022-11-24', displayDate:'民國111年11月24日', pdf:'日報表_c31344_20221124.pdf' },
  { id:'ri-37',  date:'2022-11-29', displayDate:'民國111年11月29日', pdf:'日報表_c31344_20221129.pdf' },
  { id:'ri-38',  date:'2022-12-12', displayDate:'民國111年12月12日', pdf:'日報表_c31344_20221212.pdf' },
  { id:'ri-39',  date:'2022-12-19', displayDate:'民國111年12月19日', pdf:'日報表_c31344_20221219.pdf' },
  // ── 民國112年（2023）──
  { id:'ri-40',  date:'2023-01-30', displayDate:'民國112年01月30日', pdf:'日報表_c31344_20230130.pdf' },
  { id:'ri-41',  date:'2023-03-16', displayDate:'民國112年03月16日', pdf:'日報表_c31344_20230316.pdf' },
  { id:'ri-42',  date:'2023-04-17', displayDate:'民國112年04月17日', pdf:'日報表_c31344_20230417.pdf' },
  { id:'ri-43',  date:'2023-06-14', displayDate:'民國112年06月14日', pdf:'日報表_2023_06_14_c31344.pdf' },
  { id:'ri-44',  date:'2023-06-20', displayDate:'民國112年06月20日', pdf:'日報表_2023_06_20_c31344.pdf' },
  { id:'ri-45',  date:'2023-07-17', displayDate:'民國112年07月17日', pdf:'日報表_2023_07_17_c31344.pdf' },
  { id:'ri-46',  date:'2023-07-21', displayDate:'民國112年07月21日', pdf:'日報表_2023_07_21_c31344.pdf' },
  { id:'ri-47',  date:'2023-07-24', displayDate:'民國112年07月24日', pdf:'日報表_2023_07_24_c31344.pdf' },
  { id:'ri-48',  date:'2023-07-26', displayDate:'民國112年07月26日', pdf:'日報表_2023_07_26_c31344.pdf' },
  { id:'ri-49',  date:'2023-08-14', displayDate:'民國112年08月14日', pdf:'日報表_2023_08_14_c31344.pdf' },
  { id:'ri-50',  date:'2023-08-18', displayDate:'民國112年08月18日', pdf:'日報表_2023_08_18_c31344.pdf' },
  { id:'ri-51',  date:'2023-08-21', displayDate:'民國112年08月21日', pdf:'日報表_2023_08_21_c31344 (1).pdf' },
  { id:'ri-52',  date:'2023-08-29', displayDate:'民國112年08月29日', pdf:'日報表_2023_08_29_c31344.pdf' },
  { id:'ri-53',  date:'2023-09-18', displayDate:'民國112年09月18日', pdf:'日報表_2023_09_18_c31344.pdf' },
  { id:'ri-54',  date:'2023-09-21', displayDate:'民國112年09月21日', pdf:'日報表_2023_09_21_c31344.pdf' },
  { id:'ri-55',  date:'2023-12-29', displayDate:'民國112年12月29日', pdf:'日報表_2023_12_29_c31344.pdf' },
  // ── 民國113年（2024）──
  { id:'ri-56',  date:'2024-05-07', displayDate:'民國113年05月07日', pdf:'日報表_2024_05_07_c31344.pdf' },
  { id:'ri-57',  date:'2024-05-08', displayDate:'民國113年05月08日', pdf:'日報表_2024_05_08_c31344.pdf' },
  { id:'ri-58',  date:'2024-05-13', displayDate:'民國113年05月13日', pdf:'日報表_2024_05_13_c31344.pdf' },
  { id:'ri-59',  date:'2024-05-27', displayDate:'民國113年05月27日', pdf:'日報表_2024_05_27_c31344.pdf' },
  { id:'ri-60',  date:'2024-06-03', displayDate:'民國113年06月03日', pdf:'日報表_2024_06_03_c31344 (1).pdf' },
  { id:'ri-61',  date:'2024-07-02', displayDate:'民國113年07月02日', pdf:'日報表_2024_07_02_c31344.pdf' },
  { id:'ri-62',  date:'2024-07-15', displayDate:'民國113年07月15日', pdf:'日報表_2024_07_15_c31344.pdf' },
  { id:'ri-63',  date:'2024-07-16', displayDate:'民國113年07月16日', pdf:'日報表_2024_07_16_c31344.pdf' },
  { id:'ri-64',  date:'2024-07-17', displayDate:'民國113年07月17日', pdf:'日報表_2024_07_17_c31344.pdf' },
  { id:'ri-65',  date:'2024-07-30', displayDate:'民國113年07月30日', pdf:'日報表_2024_07_30_c31344 (1).pdf' },
  { id:'ri-66',  date:'2024-07-31', displayDate:'民國113年07月31日', pdf:'日報表_2024_07_31_c31344.pdf' },
  { id:'ri-67',  date:'2024-08-01', displayDate:'民國113年08月01日', pdf:'日報表_2024_08_01_c31344.pdf' },
  { id:'ri-68',  date:'2024-08-05', displayDate:'民國113年08月05日', pdf:'日報表_2024_08_05_c31344.pdf' },
  { id:'ri-69',  date:'2024-08-09', displayDate:'民國113年08月09日', pdf:'日報表_2024_08_09_c31344.pdf' },
  { id:'ri-70',  date:'2024-08-13', displayDate:'民國113年08月13日', pdf:'日報表_2024_08_13_c31344.pdf' },
  { id:'ri-71',  date:'2024-08-16', displayDate:'民國113年08月16日', pdf:'日報表_2024_08_16_c31344 (1).pdf' },
  { id:'ri-72',  date:'2024-08-19', displayDate:'民國113年08月19日', pdf:'日報表_2024_08_19_c31344 (1).pdf' },
  { id:'ri-73',  date:'2024-09-18', displayDate:'民國113年09月18日', pdf:'日報表_2024_09_18_c31344.pdf' },
  { id:'ri-74',  date:'2024-09-25', displayDate:'民國113年09月25日', pdf:'日報表_2024_09_25_c31344.pdf' },
  { id:'ri-75',  date:'2024-10-04', displayDate:'民國113年10月04日', pdf:'日報表_2024_10_04_c31344.pdf' },
  { id:'ri-76',  date:'2024-10-14', displayDate:'民國113年10月14日', pdf:'日報表_2024_10_14_c31344.pdf' },
  { id:'ri-77',  date:'2024-11-08', displayDate:'民國113年11月08日', pdf:'日報表_2024_11_08_c31344 (1).pdf' },
];

function renderRangerInspRecords() {
  const defaultRec = RANGER_INSP_RECORDS.find(r => r.id === _selectedRIRecord) || RANGER_INSP_RECORDS[0];
  const defaultHref = rangerInspHref(defaultRec.pdf);

  // 依年份分組（倒序，最新在上）
  const groups = {};
  RANGER_INSP_RECORDS.forEach(r => {
    const yr = r.displayDate.slice(0, 5) + '年';  // 民國XXX年
    if (!groups[yr]) groups[yr] = [];
    groups[yr].push(r);
  });

  return `
  <div class="card" style="margin-bottom:0">
    <div class="card-header" style="flex-wrap:wrap;gap:8px">
      <div>
        <div style="font-size:13px;color:#64748b;margin-bottom:3px">巡查資料管理 ＞ 護管員巡查</div>
        <span class="card-title" style="font-size:18px">
          <i class="fas fa-shield-halved" style="color:#166534"></i> 橫流溪護管員巡查日誌
        </span>
      </div>
      <div style="display:flex;align-items:center;gap:8px">
        <span style="font-size:14px;color:#166534;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:999px;padding:5px 12px;font-weight:700">
          共 ${RANGER_INSP_RECORDS.length} 份巡查日誌
        </span>
        <a id="ri_link_1" href="${defaultHref}" target="_blank" rel="noopener noreferrer"
          style="display:inline-flex;align-items:center;gap:6px;background:#166534;color:#fff;
                 padding:7px 16px;border-radius:8px;font-size:14px;font-weight:700;text-decoration:none">
          <i class="fas fa-up-right-from-square"></i> 點開閱讀 PDF
        </a>
      </div>
    </div>
    <div class="card-body" style="padding:16px">

      <!-- 來源說明 -->
      <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-left:4px solid #166534;border-radius:10px;
                  padding:12px 16px;margin-bottom:16px;font-size:14px;color:#14532d;line-height:1.65">
        <i class="fas fa-info-circle"></i>
        來源：<b>01_工程設施維護與資料 ／ 更新資料 ／ 橫流溪護管員巡查日誌</b>　·
        民國109年3月 ～ 113年11月 護管員巡查日誌。
        點選左側日誌可切換右側文件；PDF 已取消頁面內嵌預覽，請點開閱讀完整內容。
      </div>

      <!-- 左右分割 -->
      <div style="display:grid;grid-template-columns:300px 1fr;gap:14px;align-items:start">

        <!-- 左側：日誌清單 -->
        <div style="display:flex;flex-direction:column;gap:0;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;max-height:680px;overflow-y:auto">
          ${Object.entries(groups).sort((a,b)=>b[0].localeCompare(a[0])).map(([yr, recs]) => `
            <div style="background:#166534;color:#fff;padding:8px 14px;font-size:15px;font-weight:900;position:sticky;top:0;z-index:1">
              ${yr}（${recs.length} 份）
            </div>
            ${[...recs].reverse().map(r => {
              const active = r.id === _selectedRIRecord;
              return `
              <div id="ri_card_${r.id}"
                onclick="giRangerSelect('${r.id}')"
                style="padding:11px 14px;cursor:pointer;border-bottom:1px solid #f1f5f9;
                       background:${active?'#f0fdf4':'#fff'};
                       border-left:4px solid ${active?'#166534':'transparent'};
                       transition:background .12s"
                onmouseover="if('${r.id}'!=='${_selectedRIRecord}') this.style.background='#f8fafc'"
                onmouseout="if('${r.id}'!=='${_selectedRIRecord}') this.style.background='#fff'">
                <div style="display:flex;align-items:center;gap:8px">
                  <i class="fas fa-file-pdf" style="color:${active?'#166534':'#b91c1c'};font-size:13px;flex-shrink:0"></i>
                  <span style="font-size:15px;font-weight:${active?'800':'600'};color:${active?'#166534':'#0f172a'}">
                    ${r.displayDate}
                  </span>
                  <span style="margin-left:auto;background:#fee2e2;color:#b91c1c;font-size:11px;font-weight:800;padding:2px 7px;border-radius:5px">PDF</span>
                </div>
              </div>`;
            }).join('')}
          `).join('')}
        </div>

        <!-- 右側：文件資訊 -->
        <div style="position:sticky;top:16px;display:flex;flex-direction:column;gap:14px">

          <!-- 標題 -->
          <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap">
            <div style="font-size:22px;font-weight:800;color:#0f172a" id="ri_title">
              橫流溪護管員巡查日誌 ${defaultRec.displayDate}
            </div>
            <a id="ri_link_2" href="${defaultHref}" target="_blank" rel="noopener noreferrer"
              style="display:inline-flex;align-items:center;gap:8px;background:#166534;color:#fff;
                     padding:10px 20px;border-radius:8px;font-size:18px;font-weight:700;text-decoration:none;white-space:nowrap">
              <i class="fas fa-up-right-from-square"></i> 開啟原始 PDF
            </a>
          </div>

          <!-- 文件提示 -->
          <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:20px;
                      display:flex;align-items:center;gap:18px">
            <i class="fas fa-file-pdf" style="font-size:48px;color:#b91c1c;flex-shrink:0"></i>
            <div style="flex:1">
              <div style="font-size:18px;color:#64748b;margin-bottom:8px">
                已取消頁面內嵌預覽，請點開閱讀完整巡查日誌
              </div>
              <div id="ri_meta" style="font-size:16px;color:#94a3b8">
                ${defaultRec.displayDate}｜橫流溪護管員巡查日誌｜PDF
              </div>
            </div>
            <a id="ri_link_3" href="${defaultHref}" target="_blank" rel="noopener noreferrer"
              style="background:#166534;color:#fff;padding:12px 24px;border-radius:8px;
                     font-size:18px;font-weight:700;text-decoration:none;white-space:nowrap;flex-shrink:0">
              <i class="fas fa-up-right-from-square"></i> 點開閱讀 PDF
            </a>
          </div>

        </div>
      </div>
    </div>
  </div>`;
}

const INSP_TYPE_META = {
  general:      { label:'一般巡查',   color:'#1565c0', bg:'#eff6ff', border:'#bfdbfe', icon:'fa-clipboard-check' },
  professional: { label:'專業巡查',   color:'#9a3412', bg:'#fff7ed', border:'#fed7aa', icon:'fa-hard-hat' },
  fishway:      { label:'魚道檢核表', color:'#0f766e', bg:'#f0fdfa', border:'#99f6e4', icon:'fa-fish' },
  ranger:       { label:'護管員巡查', color:'#166534', bg:'#f0fdf4', border:'#bbf7d0', icon:'fa-shield-halved' },
  forestry:     { label:'林業巡護',   color:'#0f766e', bg:'#f0fdfa', border:'#99f6e4', icon:'fa-tree' },
  maintenance:  { label:'維護管理資料', color:'#7c3aed', bg:'#faf5ff', border:'#ddd6fe', icon:'fa-screwdriver-wrench' }
};

/* ══════════════════════════════════════════════════════════════
   一般性定期巡查紀錄（來源：01_工程設施維護與資料/巡查紀錄）
   ══════════════════════════════════════════════════════════════ */
const GENERAL_INSP_RECORDS = [
  {
    id: 'gi-01',
    title: '一般性定期巡查表單 114年10月27日',
    date: '114年10月', dateSort: '2025-10',
    type: '一般性定期巡查表單', format: 'PDF',
    size: '153 KB',
    condition: '各設施外觀正常，魚道水流通行順暢，步道扶手及護欄完整，無異常沖刷或土石堆積。',
    handling: '完成，無需立即處置。持續定期監測水位與設施外觀，下次巡查依排程執行。',
    tags: ['定期巡查', '114年', '10月'],
    path: '01_工程設施維護與資料/巡查紀錄/一般性定期巡查表單114.1027.pdf'
  },
  {
    id: 'gi-02',
    title: '一般性定期巡查表單 114年11月26日',
    date: '114年11月', dateSort: '2025-11',
    type: '一般性定期巡查表單', format: 'PDF',
    size: '1.4 MB',
    condition: '部分設施外觀發現輕微裂縫與破損，記錄各池格淤積情形，現場照片存檔，整體功能仍正常運作。',
    handling: '填列裂縫破損觀察記錄，列管追蹤。建議下次巡查確認裂縫是否擴大，必要時通報辦理修繕。',
    tags: ['定期巡查', '114年', '11月'],
    path: '01_工程設施維護與資料/巡查紀錄/一般性定期巡查表單1141126.pdf'
  },
  {
    id: 'gi-03',
    title: '一般性定期巡查表單 114年12月30日',
    date: '114年12月', dateSort: '2025-12',
    type: '一般性定期巡查表單', format: 'PDF',
    size: '1.7 MB',
    condition: '設施外觀整體狀況良好，現場照片記錄完整，水域生物觀察正常，無重大異常事項。',
    handling: '完成定期巡查，填報表單並拍照存檔。年底彙整巡查紀錄，提報年度維護管理成果。',
    tags: ['定期巡查', '114年', '12月'],
    path: '01_工程設施維護與資料/巡查紀錄/一般性定期巡查表單1141230.pdf'
  },
  {
    id: 'gi-04',
    title: '一般性定期巡查表單 115年1月',
    date: '115年1月', dateSort: '2026-01',
    type: '一般性定期巡查表單', format: 'PDF',
    size: '736 KB',
    condition: '各設施現況記錄完整，部分魚道基礎受冬季水位影響，發現溪構4及溪構5-2池格導流牆偏移，記錄異常位置與程度。',
    handling: '異常設施列入待處理，通知技術人員現場複查評估。其餘設施完成定期填報，現場照片存檔。',
    tags: ['定期巡查', '115年', '1月'],
    path: '01_工程設施維護與資料/巡查紀錄/一般性定期巡查表單11501.pdf'
  },
  {
    id: 'gi-05',
    title: '一般性定期巡查表單 115年2月',
    date: '115年2月', dateSort: '2026-02',
    type: '一般性定期巡查表單', format: 'PDF',
    size: '260 KB',
    condition: '設施外觀檢視正常，魚道水流通行良好，上月列管之裂縫未見明顯擴大，現況照片記錄完整。',
    handling: '完成巡查，現況照片存檔。持續列管追蹤前期發現之裂縫，建議下次巡查攜帶量尺複量。',
    tags: ['定期巡查', '115年', '2月'],
    path: '01_工程設施維護與資料/巡查紀錄/一般性定期巡查表單11502.pdf'
  },
  {
    id: 'gi-06',
    title: '一般性定期巡查表單 115年3月',
    date: '115年3月', dateSort: '2026-03',
    type: '一般性定期巡查表單', format: 'PDF',
    size: '256 KB',
    condition: '全區設施巡查，春季水量增加，各魚道水流量正常，觀察到臺灣白甲魚及纓口臺鰍成功通行，設施功能良好。',
    handling: '完成定期巡查。記錄魚類通行觀察，提供生態監測資料。設施現況正常，無需特別處置。',
    tags: ['定期巡查', '115年', '3月'],
    path: '01_工程設施維護與資料/巡查紀錄/一般性定期巡查表單11503.pdf'
  },
  {
    id: 'gi-07',
    title: '一般性定期巡查表單 115年4月',
    date: '115年4月', dateSort: '2026-04',
    type: '一般性定期巡查表單', format: 'PDF',
    size: '253 KB',
    condition: '春季巡查完成，設施整體外觀良好。溪構5-2入口處發現少量土石堆積，影響水流導引效果，已記錄位置與堆積量。',
    handling: '土石堆積列為待處置事項，排定清除作業。其餘設施完成填報，現場照片存檔，提報月報。',
    tags: ['定期巡查', '115年', '4月'],
    path: '01_工程設施維護與資料/巡查紀錄/一般性定期巡查表單11504.pdf'
  },
  {
    id: 'gi-08',
    title: '橫流溪野溪周邊環境 115年4月份巡查紀錄',
    date: '115年4月', dateSort: '2026-04',
    type: '野溪環境巡查紀錄', format: 'PDF',
    size: '230 KB',
    condition: '橫流溪野溪周邊植被覆蓋良好，護岸穩定，無明顯沖刷或崩塌，溪流水質清澈，周邊環境整體正常。',
    handling: '完成環境狀況巡查，現場照片存檔。建議持續監測雨季期間坡面穩定情形，必要時加強植生護坡。',
    tags: ['野溪', '周邊環境', '115年', '4月'],
    path: '01_工程設施維護與資料/巡查紀錄/橫流溪野溪周邊環境狀況115年4月份巡查紀錄.pdf'
  },
];

/* 目前選中的巡查紀錄 ID */
let _selectedGIRecord = 'gi-01';

function generalInspHref(path) {
  // Flask /media/ 路由負責從 project root 提供靜態媒體檔案
  return '/media/' + String(path || '').split('/').map(encodeURIComponent).join('/');
}

function giSelectRecord(id) {
  _selectedGIRecord = id;
  // 更新左側卡片高亮
  GENERAL_INSP_RECORDS.forEach(r => {
    const card = document.getElementById('gi_card_' + r.id);
    if (card) {
      const active = r.id === id;
      card.style.border       = `${active?'2px':'1px'} solid ${active?'#1565c0':'#e2e8f0'}`;
      card.style.background   = active ? '#eff6ff' : '#fff';
      card.style.boxShadow    = active ? '0 4px 14px rgba(21,101,192,.18)' : '0 1px 4px rgba(15,23,42,.05)';
    }
  });
  // 更新右側文件閱讀卡
  const rec = GENERAL_INSP_RECORDS.find(r => r.id === id);
  if (!rec) return;
  const href = generalInspHref(rec.path);

  const title     = document.getElementById('gi_pdf_title');
  const condition = document.getElementById('gi_condition');
  const handling  = document.getElementById('gi_handling');
  const meta      = document.getElementById('gi_pdf_meta');
  const hint      = document.getElementById('gi_pdf_hint');

  if (title)     title.textContent = rec.title;
  if (condition) condition.textContent = rec.condition || '-';
  if (handling)  handling.textContent  = rec.handling  || '-';
  if (meta)      meta.textContent  = `${rec.date}｜${rec.type}｜${rec.format}｜${rec.size}`;
  if (hint)      hint.textContent  = rec.format === 'PDF'
    ? '已取消頁面內嵌預覽，請點開閱讀完整文件'
    : '此格式請以新分頁或下載方式開啟。';

  ['gi_pdf_link', 'gi_pdf_link_2', 'gi_no_preview_link'].forEach(elId => {
    const a = document.getElementById(elId);
    if (!a) return;
    a.href = href;
    if (elId === 'gi_no_preview_link') a.textContent = `點開閱讀 ${rec.format}`;
  });
}

function renderGeneralInspRecords() {
  const defaultRec = GENERAL_INSP_RECORDS.find(r => r.id === _selectedGIRecord) || GENERAL_INSP_RECORDS[0];
  const defaultHref = generalInspHref(defaultRec.path);

  const typeIcon = type => {
    if (type.includes('表單')) return 'fa-file-pen';
    if (type.includes('維護')) return 'fa-screwdriver-wrench';
    if (type.includes('野溪')) return 'fa-water';
    if (type.includes('公文')) return 'fa-file-contract';
    return 'fa-clipboard-check';
  };

  // 依年份分組，排序
  const groups = {};
  GENERAL_INSP_RECORDS.forEach(r => {
    const yr = r.date.match(/^(\d{3}年)/)?.[1] || '其他';
    if (!groups[yr]) groups[yr] = [];
    groups[yr].push(r);
  });

  return `
  <div class="card" style="margin-bottom:0">
    <div class="card-header" style="flex-wrap:wrap;gap:8px">
      <div>
        <div style="font-size:13px;color:#64748b;margin-bottom:3px">巡查資料管理 ＞ 一般巡查</div>
        <span class="card-title" style="font-size:18px">
          <i class="fas fa-folder-open" style="color:#1565c0"></i> 一般性定期巡查紀錄
        </span>
      </div>
      <div style="display:flex;align-items:center;gap:8px">
        <span style="font-size:14px;color:#1565c0;background:#eff6ff;border:1px solid #bfdbfe;border-radius:999px;padding:5px 12px;font-weight:700">
          共 ${GENERAL_INSP_RECORDS.length} 份文件
        </span>
        <a id="gi_pdf_link" href="${defaultHref}" target="_blank" rel="noopener noreferrer"
          style="display:inline-flex;align-items:center;gap:6px;background:#1565c0;color:#fff;
                 padding:7px 16px;border-radius:8px;font-size:14px;font-weight:700;text-decoration:none">
          <i class="fas fa-up-right-from-square"></i> 點開閱讀 PDF
        </a>
      </div>
    </div>
    <div class="card-body" style="padding:16px">

      <!-- 來源說明 -->
      <div style="background:#eff6ff;border:1px solid #bfdbfe;border-left:4px solid #1565c0;border-radius:10px;
                  padding:12px 16px;margin-bottom:16px;font-size:14px;color:#1e3a8a;line-height:1.65">
        <i class="fas fa-info-circle"></i>
        來源：<b>01_工程設施維護與資料 ／ 巡查紀錄</b>　·
        114年10月 ～ 115年4月 一般性定期巡查表單、野溪環境巡查紀錄。
        點選左側紀錄可切換右側文件資訊；PDF 已取消頁面內嵌預覽，請點開閱讀完整內容與照片。
      </div>

      <!-- 左右分割：紀錄清單 + 文件閱讀卡 -->
      <div style="display:grid;grid-template-columns:300px 1fr;gap:14px;align-items:start">

        <!-- 左側：紀錄清單 -->
        <div style="display:flex;flex-direction:column;gap:0;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden">
          ${Object.entries(groups).sort((a,b)=>a[0].localeCompare(b[0])).map(([yr, recs]) => `
            <!-- 年份標題 -->
            <div style="background:#1565c0;color:#fff;padding:8px 14px;font-size:15px;font-weight:900">
              ${inspectionEscape(yr)}（${recs.length} 份）
            </div>
            ${recs.map(r => {
              const active = r.id === _selectedGIRecord;
              return `
              <div id="gi_card_${r.id}"
                onclick="giSelectRecord('${r.id}')"
                style="padding:12px 14px;cursor:pointer;border-bottom:1px solid #f1f5f9;
                       background:${active?'#eff6ff':'#fff'};
                       border-left:${active?'4px solid #1565c0':'4px solid transparent'};
                       box-shadow:${active?'inset 0 0 0 1px #bfdbfe':''};
                       transition:background .12s"
                onmouseover="if('${r.id}'!=='${_selectedGIRecord}') this.style.background='#f8fafc'"
                onmouseout="if('${r.id}'!=='${_selectedGIRecord}') this.style.background='#fff'">
                <div style="display:flex;align-items:center;gap:8px;margin-bottom:5px">
                  <i class="fas ${typeIcon(r.type)}" style="color:${active?'#1565c0':'#64748b'};font-size:14px;flex-shrink:0"></i>
                  <span style="font-size:15px;font-weight:${active?'800':'600'};color:${active?'#1565c0':'#0f172a'};line-height:1.35">${inspectionEscape(r.date)}</span>
                  <span style="margin-left:auto;background:${r.format==='PDF'?'#fee2e2':r.format==='PPTX'?'#fff7ed':'#dbeafe'};
                               color:${r.format==='PDF'?'#b91c1c':r.format==='PPTX'?'#c2410c':'#1e40af'};
                               font-size:11px;font-weight:800;padding:2px 7px;border-radius:5px">${r.format}</span>
                </div>
                <div style="font-size:13px;color:${active?'#334155':'#64748b'};line-height:1.45;padding-left:22px">${inspectionEscape(r.type)}</div>
                <div style="font-size:12px;color:#94a3b8;margin-top:2px;padding-left:22px">${r.size}</div>
              </div>`;
            }).join('')}
          `).join('')}
        </div>

        <!-- 右側：巡查內容卡 -->
        <div style="position:sticky;top:16px;display:flex;flex-direction:column;gap:14px">

          <!-- 標題列 -->
          <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap">
            <div style="font-size:22px;font-weight:800;color:#0f172a" id="gi_pdf_title">${inspectionEscape(defaultRec.title)}</div>
            <a id="gi_pdf_link_2" href="${defaultHref}" target="_blank" rel="noopener noreferrer"
              style="display:inline-flex;align-items:center;gap:8px;background:#1565c0;color:#fff;
                     padding:10px 20px;border-radius:8px;font-size:18px;font-weight:700;text-decoration:none;white-space:nowrap">
              <i class="fas fa-up-right-from-square"></i> 開啟原始${defaultRec.format}
            </a>
          </div>

          <!-- 兩欄：現況情形 ／ 處理情形 -->
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">

            <!-- 現況情形 -->
            <div style="border:2px solid #bfdbfe;border-radius:12px;overflow:hidden">
              <div style="background:#1565c0;color:#fff;padding:14px 18px;font-size:20px;font-weight:800;
                          display:flex;align-items:center;gap:9px">
                <i class="fas fa-binoculars"></i> 現況情形
              </div>
              <div id="gi_condition"
                style="padding:18px;font-size:18px;color:#334155;line-height:1.8;min-height:150px;background:#f8fafc">
                ${inspectionEscape(defaultRec.condition || '-')}
              </div>
            </div>

            <!-- 處理情形 -->
            <div style="border:2px solid #bbf7d0;border-radius:12px;overflow:hidden">
              <div style="background:#166534;color:#fff;padding:14px 18px;font-size:20px;font-weight:800;
                          display:flex;align-items:center;gap:9px">
                <i class="fas fa-clipboard-check"></i> 處理情形
              </div>
              <div id="gi_handling"
                style="padding:18px;font-size:18px;color:#334155;line-height:1.8;min-height:150px;background:#f0fdf4">
                ${inspectionEscape(defaultRec.handling || '-')}
              </div>
            </div>

          </div>

          <!-- PDF 連結提示 -->
          <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:20px;
                      display:flex;align-items:center;gap:18px">
            <i class="fas ${defaultRec.format === 'PDF' ? 'fa-file-pdf' : 'fa-file-powerpoint'}"
              style="font-size:48px;color:${defaultRec.format === 'PDF' ? '#b91c1c' : '#c2410c'};flex-shrink:0"></i>
            <div style="flex:1">
              <div id="gi_pdf_hint" style="font-size:18px;color:#64748b;margin-bottom:8px">
                ${defaultRec.format === 'PDF' ? '已取消頁面內嵌預覽，請點開閱讀完整文件' : '此格式請以新分頁或下載方式開啟。'}
              </div>
              <div id="gi_pdf_meta" style="font-size:16px;color:#94a3b8">
                ${defaultRec.date}｜${defaultRec.type}｜${defaultRec.format}｜${defaultRec.size}
              </div>
            </div>
            <a id="gi_no_preview_link" href="${defaultHref}" target="_blank" rel="noopener noreferrer"
              style="background:#1565c0;color:#fff;padding:12px 24px;border-radius:8px;
                     font-size:18px;font-weight:700;text-decoration:none;white-space:nowrap;flex-shrink:0">
              <i class="fas fa-up-right-from-square"></i>
              點開閱讀 ${defaultRec.format}
            </a>
          </div>

        </div>

      </div>
    </div>
  </div>`;
}

function renderInspectionDataManagement(standalone = false) {
  inspDataEnsureSynced(); // 版本閘門：僅在資料變動時才同步一次（見 inspDataEnsureSynced）
  const allInsp = DB.getAll('inspections');
  const facilities = DB.getAll('facilities');

  const enriched = allInsp.map(item => ({
    ...item,
    uiStatus:   getInspectionStatus(item),
    uiPriority: getInspectionPriority(item),
    uiType:     inspectionRecordType(item)
  })).sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));

  const byType = {
    general:      enriched.filter(i => i.uiType === 'general'),
    professional: enriched.filter(i => i.uiType === 'professional'),
    fishway:      enriched.filter(i => i.uiType === 'fishway'),
    maintenance:  enriched.filter(i => i.uiType === 'maintenance'),
    ranger:       enriched.filter(i => i.uiType === 'ranger')
  };

  // ── 統計 ──
  function typeStats(arr) {
    const pending  = arr.filter(i => i.uiStatus === '待處理').length;
    const progress = arr.filter(i => i.uiStatus === '處理中').length;
    const done     = arr.filter(i => i.uiStatus === '完成').length;
    const urgent   = arr.filter(i => i.uiPriority === '緊急' || i.uiPriority === '高').length;
    const latestDate = arr[0]?.date || '-';
    // 最多問題設施
    const facCount = {};
    arr.forEach(i => { const n = i.facilityName||i.facility_name||'未指定'; facCount[n] = (facCount[n]||0)+1; });
    const topFac = Object.entries(facCount).sort((a,b)=>b[1]-a[1])[0];
    return { total:arr.length, pending, progress, done, urgent, latestDate, topFac };
  }

  const all  = typeStats(enriched);
  const gs   = typeStats(byType.general);
  const ps   = typeStats(byType.professional);
  const fs   = typeStats(byType.fishway);
  const rs   = typeStats(byType.ranger);

  // ── 需維護設施速覽（橋接設施層與表單層統計口徑） ──
  // 僅依 status 篩選，對齊「工程設施盤點」的計數口徑（不含僅有 priority 高但狀態正常的設施）
  const needMaintFacs = facilities.filter(f =>
    f.status === '需維護' || f.status === '損壞'
  );
  const facPendingMap = {};
  enriched.filter(i => i.uiStatus === '待處理' || i.uiStatus === '處理中').forEach(i => {
    const fid = Number(i.facilityId);
    if (!fid) return;
    if (!facPendingMap[fid]) facPendingMap[fid] = { count: 0, tabs: new Set() };
    facPendingMap[fid].count++;
    facPendingMap[fid].tabs.add(i.uiType);
  });
  const tabLabelMap = { general:'一般巡查', professional:'專業巡查', fishway:'魚道檢核', maintenance:'維護完工', ranger:'護管員' };
  // 只統計 needMaintFacs 設施的待處理筆數，與工程設施盤點口徑一致
  const totalPendingInspCount = needMaintFacs.reduce((sum, f) => sum + (facPendingMap[f.id]?.count || 0), 0);
  // 尚無對應待處理表單的需維護設施（需優先關注）
  const facsWithNoPending = needMaintFacs.filter(f => !(facPendingMap[f.id]?.count > 0));

  // ── 趨勢（近 6 個月）──
  function monthTrend(arr) {
    const months = {};
    arr.forEach(i => {
      const m = String(i.date||'').slice(0,7);
      if (m) months[m] = (months[m]||0) + 1;
    });
    return Object.entries(months).sort((a,b)=>a[0].localeCompare(b[0])).slice(-6);
  }
  const trend = monthTrend(enriched);
  const maxTrend = Math.max(...trend.map(t=>t[1]), 1);

  // ── 目前 tab 資料 ──
  const tabData = inspDataTab === 'all' ? enriched
    : (byType[inspDataTab] || enriched);

  return `
  <div id="inspDataMgmtCard" ${standalone?'':'class="card" style="margin-bottom:16px"'}>
    ${standalone ? `
      <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:16px;flex-wrap:wrap;margin-bottom:24px">
        <div>
          <div style="font-size:18px;color:#64748b;margin-bottom:8px">維護管理資料 ＞ 巡查資料管理</div>
          <h2 style="margin:0;font-size:36px;font-weight:900;color:#0f172a">
            <i class="fas fa-clipboard-list" style="color:#1565c0;margin-right:10px"></i>巡查資料管理
          </h2>
          <div style="font-size:20px;color:#475569;margin-top:8px">整合一般巡查、專業巡查與魚道檢核表，並同步狀態評估成果、PDF表單與雲端待上傳資訊。</div>
        </div>
        <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center">
          <button class="btn btn-primary" onclick="openGeneralPeriodicForm()" style="font-size:18px;padding:12px 24px">
            <i class="fas fa-clipboard-check"></i> 一般性巡查
          </button>
          <button class="btn btn-outline" onclick="openStructureInspectionForm()" style="font-size:18px;padding:12px 24px;color:#9a3412;border-color:#fed7aa;background:#fff7ed">
            <i class="fas fa-building"></i> 構造物調查
          </button>
          <button class="btn btn-outline" onclick="openFishwayForm()" style="font-size:18px;padding:12px 24px;color:#0f766e;border-color:#99f6e4;background:#f0fdfa">
            <i class="fas fa-fish"></i> 魚道檢核
          </button>
          <button id="cloudSyncBtn" class="btn btn-outline" onclick="cloudSyncBidirectional()" style="font-size:18px;padding:12px 24px;color:#1d4ed8;border-color:#bfdbfe;background:#eff6ff;display:flex;align-items:center;gap:8px">
            <i class="fas fa-cloud-upload-alt"></i> 雲端同步
            <span id="cloudSyncBadge" style="font-size:12px;color:#64748b"></span>
          </button>
          <button class="btn btn-primary" onclick="batchUploadPendingToDrive()" style="font-size:18px;padding:12px 24px;background:#0f766e;border-color:#0f766e">
            <i class="fas fa-cloud-upload-alt"></i> 批量上傳至 Drive
          </button>
          <button class="btn btn-outline" onclick="cleanupDuplicateInspections()" style="font-size:18px;padding:12px 24px;color:#7c3aed;border-color:#c4b5fd;background:#f5f3ff">
            <i class="fas fa-broom"></i> 清除重複記錄
          </button>
          <button class="btn btn-primary" onclick="fullInspectionSync()" style="font-size:18px;padding:12px 24px;background:#0369a1;border-color:#0369a1">
            <i class="fas fa-magic"></i> 全面同步修正
          </button>
        </div>
      </div>` : `
      <div class="card-header" style="flex-wrap:wrap;gap:8px">
        <div>
          <div style="font-size:16px;color:#64748b;margin-bottom:4px">維護管理資料 ＞ 巡查資料管理</div>
          <span class="card-title" style="font-size:24px"><i class="fas fa-clipboard-list"></i> 巡查資料管理</span>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <button class="btn btn-primary" onclick="openGeneralPeriodicForm()" style="font-size:15px;padding:8px 16px">
            <i class="fas fa-clipboard-check"></i> 一般性
          </button>
          <button class="btn btn-outline" onclick="openStructureInspectionForm()" style="font-size:15px;padding:8px 16px;color:#9a3412;border-color:#fed7aa;background:#fff7ed">
            <i class="fas fa-building"></i> 構造物
          </button>
          <button class="btn btn-outline" onclick="openFishwayForm()" style="font-size:15px;padding:8px 16px;color:#0f766e;border-color:#99f6e4;background:#f0fdfa">
            <i class="fas fa-fish"></i> 魚道
          </button>
          <button class="btn btn-outline" onclick="cleanupDuplicateInspections()" style="font-size:15px;padding:8px 16px;color:#7c3aed;border-color:#c4b5fd;background:#f5f3ff">
            <i class="fas fa-broom"></i> 清除重複
          </button>
          <button class="btn btn-primary" onclick="fullInspectionSync()" style="font-size:15px;padding:8px 16px;background:#0369a1;border-color:#0369a1">
            <i class="fas fa-magic"></i> 全面同步
          </button>
        </div>
      </div>`}
    <div ${standalone?'':'class="card-body" style="padding:16px"'}>

      <!-- ── 需維護設施速覽（橋接設施層與表單層口徑）── -->
      ${needMaintFacs.length ? `
      <div style="background:#fff7ed;border:1px solid #fed7aa;border-left:4px solid #ea580c;border-radius:10px;padding:14px 16px;margin-bottom:18px">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:10px;flex-wrap:wrap">
          <div style="font-size:14px;font-weight:900;color:#9a3412">
            <i class="fas fa-exclamation-triangle" style="margin-right:7px"></i>需維護設施速覽
            <span style="font-size:12px;font-weight:500;color:#78350f;margin-left:8px">工程設施盤點：${needMaintFacs.length} 座需維護／損壞 ｜ 對應待處理巡查：${totalPendingInspCount} 筆${facsWithNoPending.length > 0 ? `　<span style="color:#dc2626;font-weight:800">⚠ ${facsWithNoPending.length} 座尚無待處理表單</span>` : '　✅ 各設施均有對應表單'}</span>
          </div>
          <span style="font-size:11px;color:#92400e;background:#fef3c7;border-radius:5px;padding:3px 8px">
            <i class="fas fa-info-circle" style="margin-right:4px"></i>魚道設施若用構造物調查表，待處理出現在「專業巡查」tab 而非「魚道檢核」tab
          </span>
        </div>
        <div style="overflow-x:auto">
          <table style="width:100%;border-collapse:collapse;font-size:12px;min-width:560px">
            <thead>
              <tr style="background:#fff3e0">
                <th style="padding:6px 10px;text-align:left;border-bottom:1px solid #fed7aa;color:#9a3412">設施名稱</th>
                <th style="padding:6px 10px;text-align:center;border-bottom:1px solid #fed7aa;color:#9a3412">設施狀態</th>
                <th style="padding:6px 10px;text-align:center;border-bottom:1px solid #fed7aa;color:#9a3412">優先度</th>
                <th style="padding:6px 10px;text-align:center;border-bottom:1px solid #fed7aa;color:#9a3412;white-space:nowrap">待處理巡查筆數</th>
                <th style="padding:6px 10px;text-align:left;border-bottom:1px solid #fed7aa;color:#9a3412">所在 Tab</th>
              </tr>
            </thead>
            <tbody>
              ${needMaintFacs.map(f => {
                const pm = facPendingMap[f.id] || { count: 0, tabs: new Set() };
                const tabLabels = [...pm.tabs].map(t => tabLabelMap[t] || t).join('、');
                const stColor = f.status === '損壞' ? '#dc2626' : f.status === '需維護' ? '#d97706' : '#0369a1';
                const stBg    = f.status === '損壞' ? '#fee2e2' : f.status === '需維護' ? '#fef9c3' : '#eff6ff';
                const prColor = f.maintenance_priority === '緊急' ? '#dc2626' : f.maintenance_priority === '高' ? '#ea580c' : '#64748b';
                const noPending = pm.count === 0;
                return `
                <tr style="border-bottom:1px solid #fed7aa22;background:${noPending ? '#fff1f2' : '#fff'}">
                  <td style="padding:7px 10px;font-weight:700;color:#0f172a">${f.name}${noPending ? ' <span style="font-size:10px;color:#dc2626;font-weight:800">缺表單</span>' : ''}</td>
                  <td style="padding:7px 10px;text-align:center">
                    <span style="background:${stBg};color:${stColor};border-radius:999px;padding:2px 8px;font-weight:700;font-size:11px">${f.status}</span>
                  </td>
                  <td style="padding:7px 10px;text-align:center;color:${prColor};font-weight:700">${f.maintenance_priority || '—'}</td>
                  <td style="padding:7px 10px;text-align:center">
                    ${pm.count > 0
                      ? `<span style="background:#fee2e2;color:#b91c1c;border-radius:999px;padding:2px 10px;font-weight:800">${pm.count} 筆</span>`
                      : `<span style="background:#fef2f2;color:#991b1b;border-radius:999px;padding:2px 10px;font-weight:800;border:1px dashed #fca5a5">⚠ 尚無</span>`}
                  </td>
                  <td style="padding:7px 10px;color:#475569;font-size:11px">
                    ${pm.count > 0
                      ? tabLabels
                      : `<span style="color:#dc2626;font-weight:700">尚無待處理表單——請新增巡查表單，或執行「全面同步修正」確認設施狀態是否仍需維護</span>`}
                  </td>
                </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>` : ''}

      <!-- ── 四類巡查統計橫排 ── -->
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px;margin-bottom:22px">
        ${['general','professional','fishway','ranger','forestry'].map(type => {
          const m   = INSP_TYPE_META[type];
          const s   = type==='general'?gs:type==='professional'?ps:type==='fishway'?fs:rs;
          const active = inspDataTab === type;

          // 共用卡片樣式常數
          const CARD_PAD = '18px', NUM_BIG = '44px', LBL = '22px', SUB_NUM = '26px',
                SUB_LBL = '14px', SRC = '13px', BTN = '16px', ICON_SZ = '48px', ICON_FS = '22px';

          // 一般巡查
          if (type === 'general') {
            const giSorted = [...GENERAL_INSP_RECORDS].sort((a,b)=>a.dateSort.localeCompare(b.dateSort));
            const generalTotal = GENERAL_INSP_RECORDS.length + gs.total;
            const giStart  = giSorted[0]?.date || '-';
            const giEnd    = giSorted[giSorted.length-1]?.date || '-';
            return `
            <div style="border:${active?'3px':'2px'} solid ${active?m.color:m.border};background:${active?m.bg:'#fff'};
                        border-radius:14px;padding:${CARD_PAD};cursor:pointer;transition:box-shadow .15s;
                        box-shadow:${active?'0 6px 20px rgba(15,23,42,.12)':'none'}"
                 onclick="inspSwitchTab('general')">
              <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
                <div style="width:${ICON_SZ};height:${ICON_SZ};border-radius:10px;background:${m.color};color:#fff;
                            display:flex;align-items:center;justify-content:center;font-size:${ICON_FS}">
                  <i class="fas ${m.icon}"></i>
                </div>
                <div style="font-size:${NUM_BIG};font-weight:900;color:${m.color};line-height:1">${generalTotal}</div>
              </div>
              <div style="font-size:${LBL};font-weight:900;color:#0f172a;margin-bottom:8px">${m.label}</div>
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:10px">
                <div style="text-align:center;background:#fff;border:1px solid #bfdbfe;border-radius:8px;padding:7px 4px">
                  <div style="font-size:${SUB_NUM};font-weight:900;color:${m.color}">${generalTotal}</div>
                  <div style="font-size:${SUB_LBL};color:#64748b;margin-top:2px">文件+表單</div>
                </div>
                <div style="text-align:center;background:#fff;border:1px solid #bfdbfe;border-radius:8px;padding:7px 4px">
                  <div style="font-size:11px;font-weight:800;color:${m.color};line-height:1.4">${giStart}<br>~ ${giEnd}</div>
                  <div style="font-size:${SUB_LBL};color:#64748b;margin-top:2px">巡查時間</div>
                </div>
              </div>
              <div style="font-size:${SRC};color:#64748b">來源：定期巡查PDF與平台填報表單</div>
              <div style="font-size:${BTN};font-weight:800;color:${m.color};margin-top:8px">
                ${active ? '▶ 目前篩選中' : '展開此類清單'}
              </div>
            </div>`;
          }

          // 林業巡護
          if (type === 'forestry') {
            const fpYears = [...new Set(FORESTRY_PATROL_DOCS.map(d => d.year))].sort();
            const fpStart = fpYears[0] ? `民國${fpYears[0]}年` : '-';
            const fpEnd   = fpYears[fpYears.length-1] ? `民國${fpYears[fpYears.length-1]}年` : '-';
            return `
            <div style="border:${active?'3px':'2px'} solid ${active?m.color:m.border};background:${active?m.bg:'#fff'};
                        border-radius:14px;padding:${CARD_PAD};cursor:pointer;transition:box-shadow .15s;
                        box-shadow:${active?'0 6px 20px rgba(15,23,42,.12)':'none'}"
                 onclick="inspSwitchTab('forestry')">
              <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
                <div style="width:${ICON_SZ};height:${ICON_SZ};border-radius:10px;background:${m.color};color:#fff;
                            display:flex;align-items:center;justify-content:center;font-size:${ICON_FS}">
                  <i class="fas ${m.icon}"></i>
                </div>
                <div style="font-size:${NUM_BIG};font-weight:900;color:${m.color};line-height:1">${FORESTRY_PATROL_DOCS.length}</div>
              </div>
              <div style="font-size:${LBL};font-weight:900;color:#0f172a;margin-bottom:8px">${m.label}</div>
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:10px">
                <div style="text-align:center;background:#fff;border:1px solid ${m.border};border-radius:8px;padding:7px 4px">
                  <div style="font-size:${SUB_NUM};font-weight:900;color:${m.color}">${FORESTRY_PATROL_DOCS.length}</div>
                  <div style="font-size:${SUB_LBL};color:#64748b;margin-top:2px">巡查次數</div>
                </div>
                <div style="text-align:center;background:#fff;border:1px solid ${m.border};border-radius:8px;padding:7px 4px">
                  <div style="font-size:11px;font-weight:800;color:${m.color};line-height:1.4">${fpStart}<br>~ ${fpEnd}</div>
                  <div style="font-size:${SUB_LBL};color:#64748b;margin-top:2px">巡查時間</div>
                </div>
              </div>
              <div style="font-size:${SRC};color:#64748b">來源：南勢社區林業計畫</div>
              <div style="font-size:${BTN};font-weight:800;color:${m.color};margin-top:8px">
                ${active ? '▶ 目前篩選中' : '展開此類清單'}
              </div>
            </div>`;
          }

          // 護管員巡查
          if (type === 'ranger') {
            return `
            <div style="border:${active?'3px':'2px'} solid ${active?m.color:m.border};background:${active?m.bg:'#fff'};
                        border-radius:14px;padding:${CARD_PAD};cursor:pointer;transition:box-shadow .15s;
                        box-shadow:${active?'0 6px 20px rgba(15,23,42,.12)':'none'}"
                 onclick="inspSwitchTab('ranger')">
              <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
                <div style="width:${ICON_SZ};height:${ICON_SZ};border-radius:10px;background:${m.color};color:#fff;
                            display:flex;align-items:center;justify-content:center;font-size:${ICON_FS}">
                  <i class="fas ${m.icon}"></i>
                </div>
                <div style="font-size:${NUM_BIG};font-weight:900;color:${m.color};line-height:1">${RANGER_INSP_RECORDS.length}</div>
              </div>
              <div style="font-size:${LBL};font-weight:900;color:#0f172a;margin-bottom:8px">${m.label}</div>
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:10px">
                <div style="text-align:center;background:#fff;border:1px solid ${m.border};border-radius:8px;padding:7px 4px">
                  <div style="font-size:${SUB_NUM};font-weight:900;color:${m.color}">${RANGER_INSP_RECORDS.length}</div>
                  <div style="font-size:${SUB_LBL};color:#64748b;margin-top:2px">巡查次數</div>
                </div>
                <div style="text-align:center;background:#fff;border:1px solid ${m.border};border-radius:8px;padding:7px 4px">
                  <div style="font-size:11px;font-weight:800;color:${m.color};line-height:1.4">民國109年3月<br>~ 113年11月</div>
                  <div style="font-size:${SUB_LBL};color:#64748b;margin-top:2px">巡查時間</div>
                </div>
              </div>
              <div style="font-size:${SRC};color:#64748b">來源：橫流溪護管員巡查日誌</div>
              <div style="font-size:${BTN};font-weight:800;color:${m.color};margin-top:8px">
                ${active ? '▶ 目前篩選中' : '展開此類清單'}
              </div>
            </div>`;
          }

          // 專業巡查（及其他 DB 類型）
          return `
          <div style="border:${active?'3px':'2px'} solid ${active?m.color:m.border};background:${active?m.bg:'#fff'};
                      border-radius:14px;padding:${CARD_PAD};cursor:pointer;transition:box-shadow .15s;
                      box-shadow:${active?'0 6px 20px rgba(15,23,42,.12)':'none'}"
               onclick="inspSwitchTab('${type}')">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
              <div style="width:${ICON_SZ};height:${ICON_SZ};border-radius:10px;background:${m.color};color:#fff;
                          display:flex;align-items:center;justify-content:center;font-size:${ICON_FS}">
                <i class="fas ${m.icon}"></i>
              </div>
              <div style="font-size:${NUM_BIG};font-weight:900;color:${m.color};line-height:1">${s.total}</div>
            </div>
            <div style="font-size:${LBL};font-weight:900;color:#0f172a;margin-bottom:8px">${m.label}</div>
            <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-bottom:10px">
              ${[['待處理',s.pending,'#b91c1c'],['處理中',s.progress,'#d97706'],['完成',s.done,'#16a34a']].map(([lb,cnt,cl])=>`
                <div style="text-align:center;background:#fff;border:1px solid ${cl}33;border-radius:8px;padding:7px 4px">
                  <div style="font-size:${SUB_NUM};font-weight:900;color:${cl}">${cnt}</div>
                  <div style="font-size:${SUB_LBL};color:#64748b;margin-top:2px">${lb}</div>
                </div>`).join('')}
            </div>
            <div style="font-size:${SRC};color:#64748b;line-height:1.6">
              <div>最新：${s.latestDate}</div>
              ${s.topFac ? `<div>最多問題：${s.topFac[0].slice(0,10)}（${s.topFac[1]}筆）</div>` : ''}
            </div>
            <div style="font-size:${BTN};font-weight:800;color:${m.color};margin-top:8px">
              ${active ? '▶ 目前篩選中' : '展開此類清單'}
            </div>
          </div>`;
        }).join('')}
      </div>


      <!-- ── 分頁籤 ── -->
      <div style="display:flex;gap:6px;margin-bottom:18px;border-bottom:3px solid #e5e7eb;padding-bottom:0;flex-wrap:wrap">
        ${[['general','一般巡查','#1565c0'],['professional','專業巡查','#9a3412'],['fishway','魚道檢核表','#0f766e'],['maintenance','維護完工回報','#7c3aed'],['ranger','護管員巡查','#166534'],['forestry','林業巡護','#0f766e']].map(([key,lbl,cl])=>`
          <button onclick="inspSwitchTab('${key}')"
            style="padding:13px 22px;border:none;background:none;cursor:pointer;font-size:20px;font-weight:${inspDataTab===key?'800':'500'};
                   color:${inspDataTab===key?cl:'#64748b'};border-bottom:${inspDataTab===key?`4px solid ${cl}`:'4px solid transparent'};
                   margin-bottom:-3px;display:flex;align-items:center;gap:8px">
            ${lbl}
            <span style="background:${inspDataTab===key?cl+'22':'#f1f5f9'};color:${inspDataTab===key?cl:'#64748b'};
                         border-radius:999px;padding:2px 10px;font-size:17px;font-weight:700">
              ${key==='all'?enriched.length:key==='general'?GENERAL_INSP_RECORDS.length + byType.general.length:key==='ranger'?RANGER_INSP_RECORDS.length:key==='forestry'?FORESTRY_PATROL_DOCS.length:key==='maintenance'?byType.maintenance.length:byType[key]?.length||0}
            </span>
          </button>`).join('')}
        <div style="margin-left:auto;display:flex;gap:8px;align-items:center;padding-bottom:4px">
          <select id="inspDataStatusFilter" onchange="inspDataPage=1;inspDataMgmtRender()" style="padding:9px 14px;border:1px solid #d5dde7;border-radius:8px;font-size:18px">
            <option value="">全部狀態</option>
            <option value="待處理">待處理</option>
            <option value="處理中">處理中</option>
            <option value="完成">完成</option>
          </select>
          <select id="inspDataPriorityFilter" onchange="inspDataPage=1;inspDataMgmtRender()" style="padding:9px 14px;border:1px solid #d5dde7;border-radius:8px;font-size:18px">
            <option value="">全部優先度</option>
            <option value="緊急">緊急</option>
            <option value="高">高</option>
            <option value="中">中</option>
            <option value="低">低</option>
          </select>
        </div>
      </div>

      <!-- ── 清單 ── -->
      <!-- 一般巡查：顯示實體文件清單 -->
      <div id="inspGenDocSection" style="${inspDataTab === 'general' ? '' : 'display:none'}">
        ${inspDataTab === 'general' ? renderGeneralInspRecords() : ''}
      </div>

      <!-- 護管員巡查：顯示日誌清單 -->
      <div id="inspRangerDocSection" style="${inspDataTab === 'ranger' ? '' : 'display:none'}">
        ${inspDataTab === 'ranger' ? renderRangerInspRecords() : ''}
      </div>

      <!-- 林業巡護：顯示文件清單 -->
      <div id="inspForestryDocSection" style="${inspDataTab === 'forestry' ? '' : 'display:none'}">
        ${inspDataTab === 'forestry' ? renderForestryPatrolSection() : ''}
      </div>

      <!-- 資料庫巡查清單（護管員/林業巡護 tab 不顯示） -->
      <div id="inspDbListWrapper" style="${(['ranger','forestry'].includes(inspDataTab)) ? 'display:none' : ''}">
        <div id="inspDataMgmtList">
          ${renderInspDataList(tabData)}
        </div>
      </div>

    </div>
  </div>`;
}

function inspSumCard(label, value, unit, color, bg, icon) {
  return `
    <div style="background:${bg};border:1px solid ${color}22;border-radius:10px;padding:14px;display:flex;align-items:center;gap:10px">
      <div style="width:40px;height:40px;border-radius:10px;background:${color}22;color:${color};display:flex;align-items:center;justify-content:center;flex-shrink:0">
        <i class="fas ${icon}" style="font-size:18px"></i>
      </div>
      <div>
        <div style="font-size:26px;font-weight:900;color:${color};line-height:1">${value}</div>
        <div style="font-size:13px;font-weight:600;color:#0f172a;margin-top:2px">${label}</div>
        <div style="font-size:11px;color:#64748b">${unit}</div>
      </div>
    </div>`;
}

function inspSwitchTab(tab) {
  inspDataTab = tab;
  inspDataPage = 1; // 切換表單類型時回到第 1 頁，並重新取得該類型完整總筆數
  inspDataMgmtRender();
  // 更新分頁籤高亮
  const card = document.getElementById('inspDataMgmtCard');
  if (!card) return;
  const TYPE_COLOR = {general:'#1565c0',professional:'#9a3412',fishway:'#0f766e',ranger:'#166534',forestry:'#0f766e'};
  card.querySelectorAll('[onclick^="inspSwitchTab"]').forEach(btn => {
    const btnKey = btn.getAttribute('onclick').match(/'([^']+)'/)?.[1];
    const cl = TYPE_COLOR[btnKey] || '#64748b';
    const active = btnKey === tab;
    btn.style.fontWeight = active ? '800' : '500';
    btn.style.color = active ? cl : '#64748b';
    btn.style.borderBottom = active ? `3px solid ${cl}` : '3px solid transparent';
  });
  // 更新類別卡高亮（含 forestry）
  card.querySelectorAll('[onclick^="inspSwitchTab(\'g"],[onclick^="inspSwitchTab(\'p"],[onclick^="inspSwitchTab(\'r"],[onclick^="inspSwitchTab(\'f"]').forEach(div => {
    const key = div.getAttribute('onclick').match(/'([^']+)'/)?.[1];
    if (!key) return;
    const m = INSP_TYPE_META[key];
    if (!m) return;
    const active = key === tab;
    div.style.border = `${active?'3px':'2px'} solid ${active?m.color:m.border}`;
    div.style.background = active ? m.bg : '#fff';
    div.style.boxShadow = active ? '0 6px 20px rgba(15,23,42,.12)' : 'none';
    const foot = div.querySelector('div:last-child');
    if (foot) foot.textContent = active ? '▶ 目前篩選中' : '展開此類清單';
  });
}

function inspDataMgmtRender() {
  const genSection      = document.getElementById('inspGenDocSection');
  const rangerSection   = document.getElementById('inspRangerDocSection');
  const forestrySection = document.getElementById('inspForestryDocSection');
  const dbWrapper       = document.getElementById('inspDbListWrapper');
  if (genSection) {
    genSection.style.display = inspDataTab === 'general' ? '' : 'none';
    genSection.innerHTML = inspDataTab === 'general' ? renderGeneralInspRecords() : '';
  }
  if (rangerSection) {
    rangerSection.style.display = inspDataTab === 'ranger' ? '' : 'none';
    rangerSection.innerHTML = inspDataTab === 'ranger' ? renderRangerInspRecords() : '';
  }
  if (forestrySection) {
    forestrySection.style.display = inspDataTab === 'forestry' ? '' : 'none';
    forestrySection.innerHTML = inspDataTab === 'forestry' ? renderForestryPatrolSection() : '';
  }
  if (dbWrapper) {
    dbWrapper.style.display = ['ranger','forestry'].includes(inspDataTab) ? 'none' : '';
  }

  const listEl = document.getElementById('inspDataMgmtList');
  if (!listEl) return;

  const allInsp = DB.getAll('inspections');
  const enriched = allInsp.map(item => ({
    ...item,
    uiStatus:   getInspectionStatus(item),
    uiPriority: getInspectionPriority(item),
    uiType:     inspectionRecordType(item)
  })).sort((a, b) => String(b.date||'').localeCompare(String(a.date||'')));

  let data = inspDataTab === 'all' ? enriched : enriched.filter(i => i.uiType === inspDataTab);

  const sf = document.getElementById('inspDataStatusFilter')?.value;
  const pf = document.getElementById('inspDataPriorityFilter')?.value;
  if (sf) data = data.filter(i => i.uiStatus === sf);
  if (pf) data = data.filter(i => i.uiPriority === pf);

  listEl.innerHTML = renderInspDataList(data);
}

function renderInspDataPager(total) {
  const sizeOptions = [10, 30, 50, 100, 0]; // 0 = 全部
  const sizeSel = `
    <select onchange="inspDataSetPageSize(this.value)" style="padding:6px 10px;border:1px solid #d5dde7;border-radius:8px;font-size:15px">
      ${sizeOptions.map(s => `<option value="${s}" ${inspDataPageSize===s?'selected':''}>${s===0?'全部':`每頁 ${s} 筆`}</option>`).join('')}
    </select>`;

  const pageSize = inspDataPageSize > 0 ? inspDataPageSize : total;
  const totalPages = pageSize > 0 ? Math.max(1, Math.ceil(total / pageSize)) : 1;
  const page = Math.min(Math.max(1, inspDataPage), totalPages);
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(total, page * pageSize);

  // 頁碼按鈕（最多顯示目前頁 ±2）
  let nums = '';
  if (inspDataPageSize > 0 && totalPages > 1) {
    const from = Math.max(1, page - 2), to = Math.min(totalPages, page + 2);
    const btn = (p, label = p, active = false, disabled = false) =>
      `<button ${disabled?'disabled':''} onclick="inspDataGoToPage(${p})"
        style="min-width:38px;padding:7px 11px;border:1px solid ${active?'#9a3412':'#d5dde7'};border-radius:8px;
               background:${active?'#9a3412':'#fff'};color:${active?'#fff':disabled?'#cbd5e1':'#334155'};
               font-size:15px;font-weight:${active?'800':'600'};cursor:${disabled?'not-allowed':'pointer'}">${label}</button>`;
    nums += btn(page - 1, '‹ 上一頁', false, page <= 1);
    if (from > 1) { nums += btn(1); if (from > 2) nums += `<span style="color:#94a3b8;padding:0 2px">…</span>`; }
    for (let p = from; p <= to; p++) nums += btn(p, p, p === page);
    if (to < totalPages) { if (to < totalPages - 1) nums += `<span style="color:#94a3b8;padding:0 2px">…</span>`; nums += btn(totalPages); }
    nums += btn(page + 1, '下一頁 ›', false, page >= totalPages);
  }

  return `
    <div style="display:flex;flex-wrap:wrap;gap:12px;align-items:center;justify-content:space-between;
                padding:14px 6px;border-top:1px solid #eef2f7;margin-top:6px">
      <div style="font-size:15px;color:#475569;font-weight:600">
        顯示第 <b style="color:#0f172a">${start}</b> – <b style="color:#0f172a">${end}</b> 筆，共 <b style="color:#9a3412">${total}</b> 筆
        ${inspDataPageSize>0 && totalPages>1 ? `（第 ${page} / ${totalPages} 頁）` : ''}
      </div>
      <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
        ${nums}
        ${sizeSel}
      </div>
    </div>`;
}

function renderInspDataList(data) {
  if (!data.length) return `
    <div style="text-align:center;padding:44px;color:#94a3b8">
      <i class="fas fa-clipboard" style="font-size:52px;margin-bottom:14px;display:block"></i>
      <div style="font-size:22px">查無巡查紀錄</div>
    </div>`;

  const total = data.length;
  const pageSize = inspDataPageSize > 0 ? inspDataPageSize : total;
  const totalPages = pageSize > 0 ? Math.max(1, Math.ceil(total / pageSize)) : 1;
  const page = Math.min(Math.max(1, inspDataPage), totalPages);
  const pageData = inspDataPageSize > 0 ? data.slice((page - 1) * pageSize, page * pageSize) : data;

  const topPager = renderInspDataPager(total);

  return topPager + pageData.map((item, idx) => {
    const m    = INSP_TYPE_META[item.uiType] || INSP_TYPE_META.general;
    const sc   = item.uiStatus==='完成'?'#16a34a':item.uiStatus==='處理中'?'#d97706':'#b91c1c';
    const sbg  = item.uiStatus==='完成'?'#dcfce7':item.uiStatus==='處理中'?'#fef9c3':'#fee2e2';
    const pc   = item.uiPriority==='緊急'?'#dc2626':item.uiPriority==='高'?'#ea580c':item.uiPriority==='中'?'#d97706':'#64748b';
    const rid  = `insp_row_${item.id}_${idx}`;
    const hasDeru = item.deru_d !== undefined && item.deru_d !== null;
    const hasAi   = !!item.aiImageAnalysis;
    const name = item.facilityName || item.facility_name || '未指定設施';
    const findings = String(item.findings || item.notes || '').slice(0, 100);
    const cloudStyle = inspectionCloudSyncColor(item.cloudSyncStatus || '待上傳');
    const pdfLabel = item.pdfFileName || item.pdfTemplate || '';

    return `
    <div style="background:#fff;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;margin-bottom:14px;
                box-shadow:0 2px 6px rgba(15,23,42,.05);transition:box-shadow .15s"
         onmouseover="this.style.boxShadow='0 6px 20px rgba(15,23,42,.11)'"
         onmouseout="this.style.boxShadow='0 2px 6px rgba(15,23,42,.05)'">

      <!-- 主列（點擊展開） -->
      <div style="display:grid;grid-template-columns:8px minmax(0,1fr) ${hasDeru ? 'auto ' : ''}auto auto;align-items:stretch;cursor:pointer"
           onclick="inspDataRowToggle('${rid}')">
        <div style="background:${m.color}"></div>
        <div style="padding:18px 20px">
          <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:10px">
            <span style="font-size:24px;font-weight:900;color:#0f172a">${inspectionEscape(name)}</span>
            <span style="background:${m.bg};color:${m.color};border:1px solid ${m.border};border-radius:999px;padding:5px 14px;font-size:17px;font-weight:700">
              <i class="fas ${m.icon}"></i> ${m.label}
            </span>
            <span style="background:${sbg};color:${sc};border-radius:999px;padding:5px 14px;font-size:17px;font-weight:700">${item.uiStatus}</span>
            <span style="background:${pc}18;color:${pc};border:1px solid ${pc}44;border-radius:999px;padding:5px 14px;font-size:17px;font-weight:700">${item.uiPriority}</span>
            ${hasDeru ? `<span style="background:#fff7ed;color:#9a3412;border:1px solid #fed7aa;border-radius:999px;padding:5px 14px;font-size:17px;font-weight:700">DER&amp;U ${item.deru_label||'U'+item.deru_u}</span>` : ''}
            ${hasAi   ? `<span style="background:#f0fdf4;color:#166534;border:1px solid #bbf7d0;border-radius:999px;padding:5px 14px;font-size:16px">🤖 AI分析</span>` : ''}
            ${item.pdfFormat ? `<span style="background:#fff1f2;color:#b91c1c;border:1px solid #fecaca;border-radius:999px;padding:5px 14px;font-size:16px;font-weight:700"><i class="fas fa-file-pdf"></i> PDF</span>` : ''}
            ${(item.cloudTarget && INSPECTION_FORM_SYNC_META[item.formType]) ? (item.driveWebLink
              ? `<a href="${item.driveWebLink}" target="_blank" rel="noopener noreferrer" style="text-decoration:none"><span style="background:${cloudStyle.bg};color:${cloudStyle.color};border:1px solid ${cloudStyle.border};border-radius:999px;padding:5px 14px;font-size:16px;font-weight:700;cursor:pointer"><i class="fas fa-cloud-upload-alt"></i> ${item.cloudSyncStatus || '已上傳'}</span></a>`
              : `<span style="background:${cloudStyle.bg};color:${cloudStyle.color};border:1px solid ${cloudStyle.border};border-radius:999px;padding:5px 14px;font-size:16px;font-weight:700"><i class="fas fa-cloud-upload-alt"></i> ${item.cloudSyncStatus || '待上傳'}</span>`)
            : ''}
          </div>
          <div style="display:flex;gap:22px;flex-wrap:wrap;font-size:18px;color:#475569;align-items:center">
            <span><i class="fas fa-calendar" style="margin-right:6px"></i><b>${item.date || '-'}</b></span>
            ${item.inspector ? `<span><i class="fas fa-user" style="margin-right:6px"></i>${inspectionEscape(item.inspector)}</span>` : ''}
            ${item.weather   ? `<span><i class="fas fa-cloud-sun" style="margin-right:6px"></i>${inspectionEscape(item.weather)}</span>` : ''}
          </div>
          ${findings ? `<div style="font-size:17px;color:#64748b;margin-top:8px;line-height:1.6">${inspectionEscape(findings)}${(item.findings||'').length>100?'…':''}</div>` : ''}
        </div>
        <!-- DER&U 快速指標 -->
        ${hasDeru ? `
        <div style="padding:18px 20px;border-left:1px solid #f1f5f9;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:7px;min-width:110px">
          <div style="display:flex;gap:5px;font-size:17px;font-weight:700">
            <span style="background:#dbeafe;color:#1e40af;padding:3px 8px;border-radius:5px">D${item.deru_d??'-'}</span>
            <span style="background:#dcfce7;color:#166534;padding:3px 8px;border-radius:5px">E${item.deru_e??'-'}</span>
            <span style="background:#fee2e2;color:#b91c1c;padding:3px 8px;border-radius:5px">R${item.deru_r??'-'}</span>
          </div>
          <div style="font-size:26px;font-weight:900;color:${item.deru_u>=4?'#dc2626':item.deru_u===3?'#ea580c':item.deru_u===2?'#d97706':'#16a34a'}">
            U${item.deru_u??'-'}
          </div>
        </div>` : ''}
        <!-- 刪除按鈕 -->
        <div style="padding:0 12px;display:flex;align-items:center;border-left:1px solid #f1f5f9">
          <button type="button"
            onclick="event.stopPropagation();deleteInspection(${item.id})"
            title="刪除此筆巡查紀錄"
            style="display:inline-flex;align-items:center;gap:6px;border:1px solid #fecaca;background:#fff1f2;color:#b91c1c;
                   border-radius:10px;padding:9px 13px;font-size:15px;font-weight:800;cursor:pointer;white-space:nowrap">
            <i class="fas fa-trash"></i> 刪除
          </button>
        </div>
        <!-- 展開箭頭 -->
        <div style="padding:0 20px;display:flex;align-items:center;border-left:1px solid #f1f5f9">
          <i id="${rid}_arrow" class="fas fa-chevron-down" style="color:#94a3b8;font-size:22px;transition:transform .2s"></i>
        </div>
      </div>

      <!-- 展開詳情 -->
      <div id="${rid}" style="display:none;border-top:2px solid ${m.color}22">
        ${(() => {
          // 取得關聯設施資料與照片
          const facility = DB.getAll('facilities').find(f => Number(f.id) === Number(item.facilityId || item.facility_id));
          const facPhotos = (facility?.photos || []).filter(p => p && String(p).startsWith('/webapp/'));
          const recPhotos = [
            ...(Array.isArray(item.photoDataUrls) ? item.photoDataUrls : []),
            ...(Array.isArray(item.photos) ? item.photos.filter(p => p && !String(p).startsWith('/02_') && !String(p).startsWith('/03_')) : [])
          ].filter(Boolean);
          const allPhotos = [...recPhotos, ...facPhotos];
          const source = facility?.source || item.source || item.sourceType || '平台資料庫（DB）';
          const stationKm = facility?.stationKm || item.stationKm || '';
          const facName   = facility?.name || name;

          return `
          <!-- 資訊 + 發現 二欄 -->
          <div style="padding:20px 22px 16px;display:grid;grid-template-columns:1fr 1fr;gap:18px;font-size:18px">
            <div style="background:#f8fafc;border-radius:12px;padding:18px">
              <div style="font-size:21px;font-weight:800;color:#0f172a;margin-bottom:14px">
                <i class="fas fa-info-circle" style="color:${m.color}"></i> 巡查資訊
              </div>
              ${inspDetailRow('設施名稱', facName)}
              ${stationKm ? inspDetailRow('里程樁號', stationKm) : ''}
              ${inspDetailRow('巡查日期', item.date)}
              ${inspDetailRow('巡查員', item.inspector)}
              ${inspDetailRow('天氣', item.weather)}
              ${inspDetailRow('類型', m.label)}
              ${item.inspectionItem ? inspDetailRow('巡查項目', item.inspectionItem) : ''}
              ${pdfLabel ? inspDetailRow('PDF表單', pdfLabel) : ''}
              ${item.sourcePdf ? inspDetailRow('來源PDF', item.sourcePdf) : ''}
              ${Array.isArray(item.reclassificationHistory) && item.reclassificationHistory.length ? inspDetailRow('重新歸類紀錄', `${item.reclassificationHistory.length} 次｜最近 ${String(item.reclassifiedAt || item.reclassificationHistory[item.reclassificationHistory.length - 1]?.changedAt || '').slice(0, 16).replace('T', ' ')}｜${item.reclassificationReason || item.reclassificationHistory[item.reclassificationHistory.length - 1]?.reason || ''}`) : ''}
              ${item.recordDateLabel ? inspDetailRow('表單日期標註', item.recordDateLabel) : ''}
              ${item.photoGroup ? inspDetailRow('照片整理分類', item.photoGroup) : ''}
              ${item.photoDateLabel ? inspDetailRow('照片日期', item.photoDateLabel) : ''}
              ${(item.cloudTarget && INSPECTION_FORM_SYNC_META[item.formType]) ? inspDetailRow('雲端同步', `${item.cloudTarget}／${item.cloudSyncStatus || '待上傳'}`) : ''}
              ${item.driveSyncedAt ? inspDetailRow('Drive 同步時間', item.driveSyncedAt.slice(0,16).replace('T',' ')) : ''}
              ${inspDetailRow('狀態', item.uiStatus)}
              ${inspDetailRow('優先度', item.uiPriority)}
              <!-- Drive 按鈕群 -->
              <div style="margin-top:12px;display:flex;flex-wrap:wrap;gap:8px">
                ${item.driveWebLink ? `
                  <a href="${item.driveWebLink}" target="_blank" rel="noopener noreferrer"
                    style="display:inline-flex;align-items:center;gap:6px;background:#f0fdf4;color:#166534;border:1px solid #86efac;border-radius:8px;padding:8px 14px;text-decoration:none;font-size:14px;font-weight:700">
                    <i class="fas fa-file-alt"></i> 開啟 Drive 檔案
                  </a>` : ''}
                ${INSPECTION_FORM_SYNC_META[item.formType] ? `
                  <button onclick="reuploadInspectionToDrive(${item.id})"
                    style="display:inline-flex;align-items:center;gap:6px;background:#eff6ff;color:#1d4ed8;border:1px solid #bfdbfe;border-radius:8px;padding:8px 14px;font-size:14px;font-weight:700;cursor:pointer">
                    <i class="fas fa-cloud-upload-alt"></i>
                    ${item.driveWebLink ? '重新上傳' : '上傳至 Drive'}
                  </button>` : ''}
                <a href="${INSPECTION_GDRIVE_FOLDER_URL}" target="_blank" rel="noopener noreferrer"
                  style="display:inline-flex;align-items:center;gap:6px;background:#fff;color:#475569;border:1px solid #e2e8f0;border-radius:8px;padding:8px 14px;text-decoration:none;font-size:14px;font-weight:600">
                  <i class="fas fa-folder-open"></i> 開啟雲端資料夾
                </a>
              </div>
              <!-- 資料來源 -->
              <div style="margin-top:14px;background:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;padding:14px">
                <div style="font-size:17px;font-weight:800;color:#1e3a8a;margin-bottom:7px">
                  <i class="fas fa-database"></i> 資料來源
                </div>
                <div style="font-size:17px;color:#334155;line-height:1.7">${inspectionEscape(source)}</div>
                ${facility?.derLevel ? `<div style="font-size:16px;color:#64748b;margin-top:5px">DER&amp;U 等級：<b>${inspectionEscape(facility.derLevel)}</b>　健康指數：<b>${typeof fac_health==='function'?fac_health(facility):'-'}</b></div>` : ''}
              </div>
            </div>
            <div style="background:#f8fafc;border-radius:12px;padding:18px">
              <div style="font-size:21px;font-weight:800;color:#0f172a;margin-bottom:14px">
                <i class="fas fa-search" style="color:${m.color}"></i> 發現與處理
              </div>
              ${item.findings ? `<div style="font-size:17px;color:#334155;line-height:1.7;margin-bottom:14px;border-left:4px solid ${m.color};padding-left:12px">${inspectionEscape(item.findings)}</div>` : ''}
              ${item.action   ? `<div style="font-size:17px;color:#475569;line-height:1.7;margin-bottom:14px"><b>處理建議：</b>${inspectionEscape(item.action)}</div>` : ''}
              ${hasDeru ? `
                <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:10px;padding:14px">
                  <div style="font-size:18px;font-weight:800;color:#9a3412;margin-bottom:10px">DER&amp;U 評分</div>
                  <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;text-align:center">
                    ${[['D',item.deru_d,'劣化','#1e40af'],['E',item.deru_e,'範圍','#166534'],['R',item.deru_r,'風險','#b91c1c'],['U',item.deru_u,'急迫','#9a3412']].map(([cd,val,lb,cl])=>`
                      <div style="background:#fff;border:1px solid ${cl}22;border-radius:8px;padding:10px">
                        <div style="font-size:28px;font-weight:900;color:${cl}">${cd}${val??'-'}</div>
                        <div style="font-size:16px;color:#64748b">${lb}</div>
                      </div>`).join('')}
                  </div>
                  ${item.deru_score !== undefined ? `<div style="font-size:17px;color:#64748b;margin-top:8px">加權分數：${item.deru_score}　等級：${item.deru_label||'-'}</div>` : ''}
                </div>` : ''}
            </div>
          </div>

          <!-- 現場照片 -->
          ${allPhotos.length ? `
          <div style="padding:0 22px 18px">
            <div style="font-size:21px;font-weight:800;color:#0f172a;margin-bottom:14px;display:flex;align-items:center;gap:10px">
              <i class="fas fa-camera" style="color:#0369a1"></i> 現場照片
              <span style="font-size:17px;color:#64748b;font-weight:400">（${allPhotos.length} 張 · 點擊放大）</span>
              ${recPhotos.length > 0 && facPhotos.length > 0 ? `<span style="font-size:16px;background:#dbeafe;color:#1e40af;border-radius:999px;padding:3px 12px">巡查 ${recPhotos.length} + 設施 ${facPhotos.length}</span>` : ''}
            </div>
            <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px">
              ${allPhotos.map((src, idx) => {
                const isBase64 = String(src).startsWith('data:');
                const label = idx < recPhotos.length ? '巡查照片' : '設施照片';
                const lc    = idx < recPhotos.length ? '#0369a1' : '#166534';
                const photoDate = idx < recPhotos.length ? (item.photoDateLabel || item.recordDateLabel || item.date || '') : '';
                return `
                  <button type="button"
                    onclick='(typeof openPhotoViewer==="function")?openPhotoViewer(${JSON.stringify(allPhotos)},${idx}):window.open("${isBase64?'':inspectionEscape(src)}","_blank")'
                    style="border:1px solid #e2e8f0;background:#f8fafc;border-radius:10px;padding:0;overflow:hidden;
                           cursor:pointer;aspect-ratio:4/3;position:relative;transition:box-shadow .15s"
                    onmouseover="this.style.boxShadow='0 4px 14px rgba(15,23,42,.14)'"
                    onmouseout="this.style.boxShadow=''">
                    <img src="${inspectionEscape(String(src))}" loading="lazy"
                      style="width:100%;height:100%;object-fit:cover;display:block"
                      onerror="this.parentElement.style.display='none'">
                    <div style="position:absolute;bottom:0;left:0;right:0;background:rgba(15,23,42,.6);color:#fff;
                                font-size:11px;padding:4px 7px;font-weight:700;color:${lc==='#0369a1'?'#bfdbfe':'#bbf7d0'}">
                      ${label}${photoDate ? `｜${inspectionEscape(photoDate)}` : ''}
                    </div>
                  </button>`;
              }).join('')}
            </div>
          </div>` : `
          <div style="padding:0 18px 14px">
            <div style="font-size:15px;font-weight:800;color:#0f172a;margin-bottom:8px;display:flex;align-items:center;gap:8px">
              <i class="fas fa-camera" style="color:#94a3b8"></i> 現場照片
            </div>
            <div style="border:2px dashed #e2e8f0;border-radius:10px;padding:18px;text-align:center;color:#94a3b8;font-size:14px">
              <i class="fas fa-camera-slash" style="font-size:28px;margin-bottom:8px;display:block"></i>
              此筆紀錄尚未上傳現場照片
              <div style="margin-top:8px">
                <button onclick="event.stopPropagation();openInspectionForm(${item.id})"
                  style="border:1px solid #1565c0;background:#eff6ff;color:#1565c0;border-radius:7px;padding:6px 14px;font-size:13px;cursor:pointer;font-weight:700">
                  <i class="fas fa-upload"></i> 補上照片
                </button>
              </div>
            </div>
          </div>`}

          <!-- 操作按鈕 -->
          <div style="padding:10px 18px 16px;display:flex;gap:8px;border-top:1px solid #f1f5f9;flex-wrap:wrap" onclick="event.stopPropagation()">
            <button class="btn btn-primary" onclick="viewInspectionRecord(${item.id})" style="font-size:14px;padding:8px 18px">
              <i class="fas fa-eye"></i> 完整詳情
            </button>
            <button class="btn btn-outline" onclick="showProfInspForm(${item.id})"
              style="font-size:14px;padding:8px 18px;background:#fff7ed;color:#9a3412;border-color:#fed7aa;font-weight:700">
              <i class="fas fa-file-alt"></i> 表單
            </button>
            <button class="btn btn-outline" onclick="openInspectionForm(${item.id})" style="font-size:14px;padding:8px 18px">
              <i class="fas fa-edit"></i> 編輯
            </button>
            <button class="btn btn-outline" onclick="openInspectionReclassificationForm(${item.id})"
              style="font-size:14px;padding:8px 18px;background:#faf5ff;color:#7c3aed;border-color:#ddd6fe;font-weight:700">
              <i class="fas fa-random"></i> 重新歸類
            </button>
            <button class="btn btn-outline" onclick="deleteInspection(${item.id})"
              style="font-size:14px;padding:8px 14px;color:var(--danger);border-color:var(--danger)">
              <i class="fas fa-trash"></i>
            </button>
          </div>`;
        })()}
      </div>
    </div>`;
  }).join('') + renderInspDataPager(total);
}

function inspDetailRow(label, value) {
  if (!value && value !== 0) return '';
  return `<div style="display:flex;justify-content:space-between;gap:8px;padding:10px 0;border-bottom:1px solid #f1f5f9;font-size:18px">
    <span style="color:#64748b;white-space:nowrap">${label}</span>
    <span style="font-weight:700;color:#0f172a;text-align:right">${inspectionEscape(String(value))}</span>
  </div>`;
}

function inspDataRowToggle(id) {
  const body  = document.getElementById(id);
  const arrow = document.getElementById(id + '_arrow');
  if (!body) return;
  const open  = body.style.display !== 'none' && body.style.display !== '';
  body.style.display  = open ? 'none' : 'block';
  if (arrow) arrow.style.transform = open ? '' : 'rotate(180deg)';
}

function showProfInspForm(id) {
  const item = DB.getAll('inspections').find(i => Number(i.id) === Number(id));
  if (!item) return;
  const facility = DB.getAll('facilities').find(f => Number(f.id) === Number(item.facilityId || item.facility_id));
  const name = facility?.name || item.facilityName || item.facility_name || '未指定設施';
  const stationKm = facility?.stationKm || item.stationKm || '-';
  const facType = facility?.type || '-';
  const hasDeru = item.deru_d !== undefined && item.deru_d !== null;
  const deruColor = item.deru_u >= 4 ? '#dc2626' : item.deru_u === 3 ? '#ea580c' : item.deru_u === 2 ? '#d97706' : '#16a34a';

  document.getElementById('modalTitle').textContent = `專業巡查表單 — ${name}`;
  document.getElementById('modal').style.maxWidth = '760px';
  document.getElementById('modal').style.width = '94vw';
  document.getElementById('modalBody').innerHTML = `
    <div id="profInspFormContent" style="font-size:16px;color:#0f172a">

      <!-- 表單標題 -->
      <div style="background:#9a3412;color:#fff;border-radius:10px;padding:18px 22px;margin-bottom:18px;text-align:center">
        <div style="font-size:13px;letter-spacing:2px;margin-bottom:4px;opacity:.85">林務局 橫流溪生態工程</div>
        <div style="font-size:22px;font-weight:900;letter-spacing:1px">專業巡查紀錄表單</div>
        <div style="font-size:13px;margin-top:4px;opacity:.85">Professional Inspection Record</div>
      </div>

      <!-- 基本資訊 -->
      <div style="border:1.5px solid #e2e8f0;border-radius:10px;overflow:hidden;margin-bottom:14px">
        <div style="background:#fff7ed;border-bottom:1.5px solid #fed7aa;padding:10px 16px;font-size:15px;font-weight:800;color:#9a3412">
          <i class="fas fa-hard-hat"></i> 一、工程設施基本資料
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:0">
          ${[
            ['設施名稱', name],
            ['設施類型', facType],
            ['里程樁號', stationKm],
            ['巡查日期', item.date || '-'],
            ['巡查人員', item.inspector || '-'],
            ['天氣狀況', item.weather || '-'],
          ].map(([lb, val], i) => `
            <div style="padding:12px 16px;${i % 2 === 1 ? 'border-left:1px solid #f1f5f9;' : ''}${i >= 2 ? 'border-top:1px solid #f1f5f9;' : ''}display:flex;gap:10px">
              <span style="color:#64748b;min-width:72px;font-size:14px">${lb}</span>
              <span style="font-weight:700;flex:1">${inspectionEscape(String(val))}</span>
            </div>`).join('')}
        </div>
      </div>

      <!-- 巡查發現 -->
      <div style="border:1.5px solid #e2e8f0;border-radius:10px;overflow:hidden;margin-bottom:14px">
        <div style="background:#fff7ed;border-bottom:1.5px solid #fed7aa;padding:10px 16px;font-size:15px;font-weight:800;color:#9a3412">
          <i class="fas fa-search"></i> 二、現況巡查發現
        </div>
        <div style="padding:16px">
          <div style="font-size:13px;color:#64748b;margin-bottom:6px">發現事項</div>
          <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:14px;min-height:60px;font-size:15px;line-height:1.8">
            ${item.findings ? inspectionEscape(item.findings) : '<span style="color:#94a3b8">（無紀錄）</span>'}
          </div>
          ${item.action ? `
          <div style="font-size:13px;color:#64748b;margin:12px 0 6px">建議處理措施</div>
          <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:14px;font-size:15px;line-height:1.8">
            ${inspectionEscape(item.action)}
          </div>` : ''}
        </div>
      </div>

      <!-- DER&U -->
      ${hasDeru ? `
      <div style="border:1.5px solid #e2e8f0;border-radius:10px;overflow:hidden;margin-bottom:14px">
        <div style="background:#fff7ed;border-bottom:1.5px solid #fed7aa;padding:10px 16px;font-size:15px;font-weight:800;color:#9a3412">
          <i class="fas fa-chart-bar"></i> 三、DER&amp;U 劣化評估
        </div>
        <div style="padding:16px">
          <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:14px">
            ${[
              ['D', item.deru_d, '損壞程度', '#1e40af', '#dbeafe'],
              ['E', item.deru_e, '損壞範圍', '#166534', '#dcfce7'],
              ['R', item.deru_r, '風險影響', '#b91c1c', '#fee2e2'],
              ['U', item.deru_u, '維護急迫', deruColor, '#fff7ed'],
            ].map(([cd, val, lb, cl, bg]) => `
              <div style="background:${bg};border:1.5px solid ${cl}33;border-radius:10px;padding:14px;text-align:center">
                <div style="font-size:32px;font-weight:900;color:${cl};line-height:1">${cd}${val ?? '-'}</div>
                <div style="font-size:12px;color:#64748b;margin-top:4px">${lb}</div>
              </div>`).join('')}
          </div>
          ${item.deru_score !== undefined ? `
          <div style="text-align:center;font-size:15px;color:#64748b">
            綜合評分：<b style="color:${deruColor};font-size:18px">${item.deru_score}</b>
            急迫等級：<b style="color:${deruColor};font-size:18px">${item.deru_label || '-'}</b>
          </div>` : ''}
        </div>
      </div>` : ''}

      <!-- 處理狀態 -->
      <div style="border:1.5px solid #e2e8f0;border-radius:10px;overflow:hidden;margin-bottom:14px">
        <div style="background:#fff7ed;border-bottom:1.5px solid #fed7aa;padding:10px 16px;font-size:15px;font-weight:800;color:#9a3412">
          <i class="fas fa-tasks"></i> ${hasDeru ? '四' : '三'}、處理狀態追蹤
        </div>
        <div style="display:grid;grid-template-columns:repeat(3,1fr)">
          ${[
            ['處理狀態', item.uiStatus || getInspectionStatus(item)],
            ['優先等級', item.uiPriority || getInspectionPriority(item)],
            ['預計完成', item.expectedCompletion || '-'],
          ].map(([lb, val], i) => `
            <div style="padding:14px 16px;${i > 0 ? 'border-left:1px solid #f1f5f9;' : ''}text-align:center">
              <div style="font-size:12px;color:#64748b;margin-bottom:6px">${lb}</div>
              <div style="font-size:17px;font-weight:800;color:#0f172a">${inspectionEscape(String(val || '-'))}</div>
            </div>`).join('')}
        </div>
      </div>

      <!-- 簽署欄 -->
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-top:6px">
        ${['巡查人員', '複核主管', '核准長官'].map(role => `
          <div style="border:1.5px solid #e2e8f0;border-radius:8px;padding:14px;text-align:center">
            <div style="font-size:12px;color:#64748b;margin-bottom:28px">${role}</div>
            <div style="border-top:1px solid #cbd5e1;padding-top:8px;font-size:12px;color:#94a3b8">簽名</div>
          </div>`).join('')}
      </div>

    </div>`;

  document.getElementById('modalFooter').innerHTML = `
    <button class="btn btn-outline" onclick="closeModal()">關閉</button>
    <button class="btn btn-primary" onclick="window.print()" style="background:#9a3412;border-color:#9a3412">
      <i class="fas fa-print"></i> 列印表單
    </button>
  `;
  openModal();
}

function viewInspectionRecord(id) {
  const item = DB.getAll('inspections').find(i => Number(i.id) === Number(id));
  if (!item) return;
  const m  = INSP_TYPE_META[inspectionRecordType(item)] || INSP_TYPE_META.general;
  const sc = getInspectionStatus(item);
  const p  = getInspectionPriority(item);
  document.getElementById('modalTitle').textContent = `巡查紀錄詳情 — ${item.facilityName || item.facility_name || ''}`;
  document.getElementById('modal').style.maxWidth = '680px';
  document.getElementById('modal').style.width = '92vw';
  document.getElementById('modalBody').innerHTML = `
    <div style="display:grid;gap:14px;font-size:20px">
      <div style="display:flex;gap:10px;flex-wrap:wrap">
        <span style="background:${m.bg};color:${m.color};border:1px solid ${m.border};border-radius:999px;padding:6px 16px;font-size:17px;font-weight:700"><i class="fas ${m.icon}"></i> ${m.label}</span>
        <span style="background:${sc==='完成'?'#dcfce7':sc==='處理中'?'#fef9c3':'#fee2e2'};color:${sc==='完成'?'#166534':sc==='處理中'?'#854d0e':'#b91c1c'};border-radius:999px;padding:6px 16px;font-size:17px;font-weight:700">${sc}</span>
        <span style="background:#f1f5f9;color:#475569;border-radius:999px;padding:6px 16px;font-size:17px;font-weight:700">${p}</span>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <div style="background:#f8fafc;border-radius:10px;padding:18px">
          ${inspDetailRow('設施', item.facilityName||item.facility_name)}
          ${inspDetailRow('日期', item.date)}
          ${inspDetailRow('巡查員', item.inspector)}
          ${inspDetailRow('天氣', item.weather)}
          ${inspDetailRow('優先度', p)}
          ${inspDetailRow('狀態', sc)}
        </div>
        <div style="background:#f8fafc;border-radius:10px;padding:18px">
          ${inspDetailRow('類型', m.label)}
          ${inspDetailRow('來源', item.sourceType)}
          ${Array.isArray(item.reclassificationHistory) && item.reclassificationHistory.length ? inspDetailRow('重新歸類', `${item.reclassificationHistory.length} 次｜${item.reclassificationReason || '分類修正'}`) : ''}
          ${item.deru_d !== undefined ? inspDetailRow('DER&U', `D${item.deru_d}/E${item.deru_e}/R${item.deru_r} U${item.deru_u}`) : ''}
          ${item.deru_score !== undefined ? inspDetailRow('加權分數', item.deru_score) : ''}
          ${item.deru_label ? inspDetailRow('急迫等級', item.deru_label) : ''}
        </div>
      </div>
      ${item.findings ? `<div style="background:#fff;border:1px solid #e2e8f0;border-radius:10px;padding:18px">
        <div style="font-size:20px;font-weight:800;color:#0f172a;margin-bottom:10px">發現事項</div>
        <div style="font-size:20px;color:#334155;line-height:1.7;white-space:pre-wrap">${inspectionEscape(item.findings)}</div>
      </div>` : ''}
      ${item.action ? `<div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:18px">
        <div style="font-size:20px;font-weight:800;color:#166534;margin-bottom:10px">處理建議</div>
        <div style="font-size:20px;color:#334155;line-height:1.7">${inspectionEscape(item.action)}</div>
      </div>` : ''}
    </div>`;
  document.getElementById('modalFooter').innerHTML = `
    <button class="btn btn-outline" onclick="closeModal()">關閉</button>
    <button class="btn btn-outline" onclick="openInspectionReclassificationForm(${item.id})" style="color:#7c3aed;border-color:#ddd6fe;background:#faf5ff"><i class="fas fa-random"></i> 重新歸類</button>
    <button class="btn btn-primary" onclick="closeModal();openInspectionForm(${item.id})"><i class="fas fa-edit"></i> 編輯</button>
  `;
  openModal();
}

function renderInspectionMaintenanceDataOverview() {
  const inspections = DB.getAll('inspections');
  const facilities = DB.getAll('facilities');
  const openInspections = inspections.filter(item => getInspectionStatus(item) !== '完成');
  const maintenanceTargets = facilities.filter(item =>
    item.status === '需維護' || item.status === '損壞' || item.maintenance_priority === '高' || item.maintenance_priority === '緊急'
  );
  return `
    <div class="card" style="margin-bottom:16px">
      <div class="card-header">
        <span class="card-title"><i class="fas fa-sitemap"></i> 維護管理資料分類</span>
        <span class="text-muted" style="font-size:12px">巡查資料與維護處理紀錄分開管理，避免現地紀錄與實際維修成果混合。</span>
      </div>
      <div class="card-body">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
          <div style="border:1px solid #bfdbfe;border-left:4px solid #1565c0;background:#eff6ff;border-radius:10px;padding:12px">
            <div style="font-size:15px;font-weight:900;color:#1e3a8a;margin-bottom:8px"><i class="fas fa-clipboard-check"></i> 巡查資料</div>
            <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:10px">
              ${['general','professional','fishway'].map(type => `
                <div style="background:#fff;border:1px solid #dbeafe;border-radius:8px;padding:8px;text-align:center">
                  <div style="font-size:20px;font-weight:900;color:#1565c0">${inspections.filter(item => inspectionRecordType(item) === type).length}</div>
                  <div style="font-size:11px;color:#475569;margin-top:2px">${inspectionRecordTypeLabel(type).replace('紀錄','')}</div>
                </div>
              `).join('')}
            </div>
            <div style="font-size:12px;color:#334155;line-height:1.65">
              用於記錄巡查日期、人員、單位、設施外觀、裂縫破損、淤積阻塞、淘刷、通水影響、現況照片、初步異常判斷與建議處理。
            </div>
          </div>
          <div style="border:1px solid #fed7aa;border-left:4px solid #ea580c;background:#fff7ed;border-radius:10px;padding:12px">
            <div style="font-size:15px;font-weight:900;color:#9a3412;margin-bottom:8px"><i class="fas fa-screwdriver-wrench"></i> 維護管理資料</div>
            <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:10px">
              ${[
                ['維護案件', maintenanceTargets.length],
                ['改善處理', openInspections.length],
                ['後續追蹤', inspections.filter(item => item.followUpDate || getInspectionStatus(item) === '處理中').length]
              ].map(([label, count]) => `
                <div style="background:#fff;border:1px solid #fed7aa;border-radius:8px;padding:8px;text-align:center">
                  <div style="font-size:20px;font-weight:900;color:#ea580c">${count}</div>
                  <div style="font-size:11px;color:#475569;margin-top:2px">${label}</div>
                </div>
              `).join('')}
            </div>
            <div style="font-size:12px;color:#334155;line-height:1.65">
              用於追蹤維護案件、改善處理、清淤補強、維修前中後照片、處理結果、完成狀態、成效評估與再次巡查需求。
            </div>
          </div>
        </div>
        <div style="margin-top:12px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:10px 12px;font-size:12px;color:#334155;line-height:1.6">
          流程：巡查資料建立 → 異常判斷 → 建立維護管理案件 → 維護處理紀錄 → 維護後照片上傳 → 後續追蹤巡查 → 結案或持續列管。
        </div>
      </div>
    </div>
  `;
}

function maintenanceStageLabel(stage) {
  return {
    before: '維修前',
    during: '維修中',
    after: '維修後',
    unknown: '未分類'
  }[stage] || '未分類';
}

function maintenanceStageColor(stage) {
  return {
    before: '#2563eb',
    during: '#ea580c',
    after: '#16a34a',
    unknown: '#64748b'
  }[stage] || '#64748b';
}

function maintenanceSortValue(text = '') {
  const value = String(text || '');
  const rocYearMatch = value.match(/(\d{3})年/);
  if (rocYearMatch) return (Number(rocYearMatch[1]) + 1911) * 10000;
  const fullYearMatch = value.match(/(\d{4})年/);
  if (fullYearMatch) return Number(fullYearMatch[1]) * 10000;
  const dateMatch = value.match(/(\d{3,4})[.\-_年](\d{1,2})[.\-_月](\d{1,2})/);
  if (dateMatch) {
    let year = Number(dateMatch[1]);
    if (year < 1911) year += 1911;
    const month = String(Number(dateMatch[2])).padStart(2, '0');
    const day = String(Number(dateMatch[3])).padStart(2, '0');
    return Number(`${year}${month}${day}`);
  }
  const yearMatch = value.match(/(\d{3,4})年/);
  if (yearMatch) {
    let year = Number(yearMatch[1]);
    if (year < 1911) year += 1911;
    return year * 10000;
  }
  const periodMatch = value.match(/第(\d+)[期次]/);
  return periodMatch ? 19000000 + Number(periodMatch[1]) : 99999999;
}

function maintenanceSortByTime(a, b) {
  const aSort = Number(a?.sort);
  const bSort = Number(b?.sort);
  const aTime = Number.isFinite(aSort) ? aSort : maintenanceSortValue(`${a?.date || ''} ${a?.name || ''}`);
  const bTime = Number.isFinite(bSort) ? bSort : maintenanceSortValue(`${b?.date || ''} ${b?.name || ''}`);
  if (aTime !== bTime) return aTime - bTime;
  return String(a?.name || '').localeCompare(String(b?.name || ''), 'zh-Hant', { numeric: true });
}

function normalizeMaintenancePhotoIndex(index) {
  if (!index?.cases) return index;
  index.cases.sort(maintenanceSortByTime);
  index.cases.forEach(item => {
    item.folders = item.folders || [];
    item.folders.sort(maintenanceSortByTime);
    item.folders.forEach(folder => {
      ['before', 'during', 'after', 'unknown'].forEach(stage => {
        folder[stage] = (folder[stage] || []).sort(maintenanceSortByTime);
      });
    });
  });
  return index;
}

/* 照片比對頁面狀態 */
let _maintCaseIdx    = 0;
let _maintStageTab   = 'all';   // 'all'|'before'|'during'|'after'|'unknown'
let _maintFolderIdx  = -1;      // -1 = 全部工作項目
let _maintPhotoPage  = 0;
const MAINT_PAGE_SIZE = 24;

function renderMaintenancePhotoArchiveSection() {
  return `
    <div class="card" style="margin-bottom:16px">
      <div class="card-header" style="flex-wrap:wrap;gap:8px">
        <span class="card-title" style="font-size:18px"><i class="fas fa-images"></i> 歷年維護照片</span>
        <span style="font-size:13px;color:#64748b">來源：01_工程設施維護與資料 ／ 維管計畫 ／ 歷年維護資料</span>
      </div>
      <div class="card-body" style="padding:16px">
        <div id="maintenancePhotoArchive">
          <div style="padding:24px;text-align:center;color:#64748b;font-size:15px">
            <i class="fas fa-spinner fa-spin" style="font-size:24px;margin-bottom:10px;display:block"></i>
            正在讀取歷年維護照片索引…
          </div>
        </div>
      </div>
    </div>
  `;
}

async function loadMaintenancePhotoArchive() {
  const el = document.getElementById('maintenancePhotoArchive');
  if (!el) return;
  try {
    if (!maintenancePhotoIndex) {
      const res = await fetch('/webapp/data/maintenance_photo_index.json', { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      maintenancePhotoIndex = normalizeMaintenancePhotoIndex(await res.json());
    }
    selectedMaintenanceCaseIndex = Math.min(selectedMaintenanceCaseIndex, Math.max(0, (maintenancePhotoIndex.cases || []).length - 1));
    const currentCase = maintenancePhotoIndex.cases?.[selectedMaintenanceCaseIndex];
    selectedMaintenanceFolderIndex = Math.min(selectedMaintenanceFolderIndex, Math.max(0, (currentCase?.folders || []).length - 1));
    renderMaintenancePhotoArchive();
  } catch (err) {
    el.innerHTML = `
      <div style="padding:14px;border:1px solid #fecaca;background:#fef2f2;border-radius:8px;color:#b91c1c;font-size:13px">
        無法讀取歷年維護照片索引：${inspectionEscape(err.message || err)}
      </div>
    `;
  }
}

/* ── 全新照片比對渲染 ────────────────────────────────────────────── */

function renderMaintenancePhotoArchive() {
  const el = document.getElementById('maintenancePhotoArchive');
  if (!el || !maintenancePhotoIndex) return;

  const cases = maintenancePhotoIndex.cases || [];
  if (!cases.length) {
    el.innerHTML = '<div class="empty-state"><i class="fas fa-images"></i><p>尚無維護照片索引</p></div>';
    return;
  }

  _maintCaseIdx   = Math.min(_maintCaseIdx, cases.length - 1);
  const c = cases[_maintCaseIdx];
  const folders = c.folders || [];

  // 收集當前顯示的照片
  const srcFolders = _maintFolderIdx < 0 ? folders : [folders[_maintFolderIdx]].filter(Boolean);
  let allPhotos = [];
  srcFolders.forEach(f => {
    const list = _maintStageTab === 'all'
      ? [...(f.before||[]), ...(f.during||[]), ...(f.after||[]), ...(f.unknown||[])]
      : (f[_maintStageTab] || []);
    allPhotos = allPhotos.concat(list);
  });

  const totalPages = Math.ceil(allPhotos.length / MAINT_PAGE_SIZE) || 1;
  _maintPhotoPage  = Math.min(_maintPhotoPage, totalPages - 1);
  const pagePhotos = allPhotos.slice(_maintPhotoPage * MAINT_PAGE_SIZE, (_maintPhotoPage + 1) * MAINT_PAGE_SIZE);

  // 各階段統計
  const stageCounts = {
    all:     srcFolders.reduce((s,f)=>s+f.total, 0),
    before:  srcFolders.reduce((s,f)=>s+(f.before||[]).length, 0),
    during:  srcFolders.reduce((s,f)=>s+(f.during||[]).length, 0),
    after:   srcFolders.reduce((s,f)=>s+(f.after||[]).length, 0),
    unknown: srcFolders.reduce((s,f)=>s+(f.unknown||[]).length, 0)
  };

  const stageColors = { before:'#2563eb', during:'#ea580c', after:'#16a34a', unknown:'#64748b' };
  const stageLabels = { before:'維修前', during:'維修中', after:'維修後', unknown:'未分類' };

  el.innerHTML = `
    <!-- ① 期別卡片選擇器 -->
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:10px;margin-bottom:18px">
      ${cases.map((item, idx) => {
        const active = idx === _maintCaseIdx;
        // 萃取年份（民國年 → 西元）
        const yearMatch = item.name.match(/(\d{3})年/);
        const rocYear   = yearMatch ? yearMatch[1] : null;
        const westYear  = rocYear ? parseInt(rocYear) + 1911 : null;
        // 從 folders 名稱萃取所有 YYY.MM.DD 日期，取最早與最晚
        const allDates = (item.folders || [])
          .flatMap(f => (f.name || '').match(/\d{3}\.\d{2}\.\d{2}/g) || [])
          .sort();
        const d0 = allDates[0] || null;
        const d1 = allDates[allDates.length - 1] || null;
        const fmtDate = d => { const [y,m,dd] = d.split('.'); return `${y}.${m}.${dd}`; };
        const dateRange = d0 && d1 && d0 !== d1 ? `${fmtDate(d0)} ～ ${fmtDate(d1)}` : d0 ? fmtDate(d0) : '';
        // 工程名稱摘要（移除期數、機關名）
        const summary = item.name
          .replace(/^第\d+[期次][^\d]*/, '')
          .replace(/轄內搶修工程|林業保育署臺中分署|東勢處|橫流溪/g, '')
          .trim().slice(0, 14);
        return `
          <button onclick="maintSwitchCase(${idx})"
            style="text-align:left;border:${active?'2px':'1px'} solid ${active?'#0f766e':'#e2e8f0'};
                   background:${active?'#f0fdf4':'#fff'};border-radius:12px;padding:14px 12px;cursor:pointer;
                   box-shadow:${active?'0 4px 14px rgba(15,118,110,.18)':'0 1px 4px rgba(15,23,42,.05)'};
                   transition:box-shadow .15s,border-color .15s"
            onmouseover="if(${!active}) this.style.borderColor='#0f766e',this.style.boxShadow='0 3px 10px rgba(15,118,110,.12)'"
            onmouseout="if(${!active}) this.style.borderColor='#e2e8f0',this.style.boxShadow='0 1px 4px rgba(15,23,42,.05)'">
            ${rocYear ? `
            <div style="font-size:22px;font-weight:900;color:${active?'#0f766e':'#0f172a'};line-height:1;margin-bottom:2px">
              ${rocYear}年
            </div>
            <div style="font-size:12px;font-weight:700;color:${active?'#0f766e':'#64748b'};margin-bottom:5px">
              ${westYear}
            </div>` : ''}
            ${dateRange ? `<div style="font-size:10px;color:${active?'#0f766e':'#94a3b8'};margin-bottom:4px;white-space:nowrap;overflow:hidden">${inspectionEscape(dateRange)}</div>` : ''}
            <div style="font-size:11px;color:#94a3b8;line-height:1.45;min-height:24px">${inspectionEscape(summary)}</div>
            <div style="margin-top:8px;display:flex;align-items:baseline;gap:5px">
              <span style="font-size:20px;font-weight:900;color:${active?'#0f766e':'#334155'}">${item.total}</span>
              <span style="font-size:12px;color:#94a3b8;font-weight:600">張</span>
            </div>
          </button>`;
      }).join('')}
    </div>

    <!-- ② 期別資訊列 -->
    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-left:5px solid #0f766e;border-radius:10px;padding:14px 18px;margin-bottom:14px;display:flex;align-items:flex-start;justify-content:space-between;gap:12px;flex-wrap:wrap">
      <div>
        <div style="font-size:19px;font-weight:900;color:#0f172a;margin-bottom:6px">${inspectionEscape(c.name)}</div>
        <div style="display:flex;gap:12px;flex-wrap:wrap;font-size:14px;color:#475569">
          <span><b style="color:#0f766e;font-size:18px">${c.total}</b> 張</span>
          <span style="color:#2563eb">● 維修前 ${c.before}</span>
          <span style="color:#ea580c">● 維修中 ${c.during}</span>
          <span style="color:#16a34a">● 維修後 ${c.after}</span>
          <span style="color:#94a3b8">● 未分類 ${c.unknown}</span>
        </div>
      </div>
      <!-- 工作項目篩選 -->
      <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
        <span style="font-size:14px;color:#475569;font-weight:600">工作項目：</span>
        <select onchange="maintSwitchFolder(parseInt(this.value))"
          style="padding:7px 12px;border:1px solid #d5dde7;border-radius:8px;font-size:14px;background:#fff;min-width:220px">
          <option value="-1" ${_maintFolderIdx<0?'selected':''}>全部（${folders.length} 個項目）</option>
          ${folders.map((f,i)=>`<option value="${i}" ${_maintFolderIdx===i?'selected':''}>${inspectionEscape(f.name.split(' / ').pop())} (${f.total}張)</option>`).join('')}
        </select>
      </div>
    </div>

    <!-- ③ 階段 Tabs + 計數 -->
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px">
      ${['all','before','during','after','unknown'].map(s => {
        const active = _maintStageTab === s;
        const lbl = s==='all'?'全部':stageLabels[s];
        const cnt = stageCounts[s];
        const cl  = s==='all'?'#0f172a':stageColors[s];
        return `
          <button onclick="maintSwitchStage('${s}')"
            style="display:flex;align-items:center;gap:8px;padding:9px 16px;border:${active?'2px':'1px'} solid ${active?cl:'#e2e8f0'};
                   background:${active?cl+'18':'#fff'};border-radius:999px;cursor:pointer;transition:.15s">
            <span style="font-size:15px;font-weight:${active?'800':'600'};color:${active?cl:'#64748b'}">${lbl}</span>
            <span style="background:${active?cl:'#f1f5f9'};color:${active?'#fff':'#64748b'};border-radius:999px;padding:2px 9px;font-size:13px;font-weight:700">${cnt}</span>
          </button>`;
      }).join('')}
    </div>

    <!-- ④ 照片格 -->
    ${pagePhotos.length ? `
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:10px;margin-bottom:14px">
        ${pagePhotos.map((photo, idx) => {
          const globalIdx = _maintPhotoPage * MAINT_PAGE_SIZE + idx;
          const sc = stageColors[photo.stage] || '#64748b';
          const sl = stageLabels[photo.stage] || photo.stage;
          return `
            <button type="button"
              onclick="maintOpenViewer(${globalIdx})"
              style="border:1px solid #e2e8f0;background:#fff;border-radius:10px;padding:0;overflow:hidden;cursor:pointer;
                     aspect-ratio:1;position:relative;transition:box-shadow .15s"
              onmouseover="this.style.boxShadow='0 4px 16px rgba(15,23,42,.14)'"
              onmouseout="this.style.boxShadow=''">
              <img src="${inspectionEscape(photo.src)}" alt="${inspectionAttr(photo.name)}" loading="lazy"
                style="width:100%;height:100%;object-fit:cover;display:block"
                onerror="this.style.display='none';this.parentElement.style.background='#f1f5f9'">
              <div style="position:absolute;bottom:0;left:0;right:0;background:rgba(15,23,42,.62);color:#fff;
                          font-size:11px;padding:4px 6px;display:flex;justify-content:space-between">
                <span style="color:${sc};font-weight:700">${sl}</span>
                <span style="opacity:.8;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:80px">${inspectionEscape(photo.name.replace(/\.[^.]+$/,''))}</span>
              </div>
            </button>`;
        }).join('')}
      </div>
    ` : `
      <div style="border:2px dashed #e2e8f0;border-radius:10px;padding:40px;text-align:center;color:#94a3b8">
        <i class="fas fa-images" style="font-size:40px;margin-bottom:12px;display:block"></i>
        <div style="font-size:16px">此篩選條件無照片</div>
      </div>
    `}

    <!-- ⑤ 分頁 -->
    ${totalPages > 1 ? `
      <div style="display:flex;align-items:center;justify-content:space-between;margin-top:4px;flex-wrap:wrap;gap:8px">
        <span style="font-size:14px;color:#64748b">
          共 <b>${allPhotos.length}</b> 張，每頁 ${MAINT_PAGE_SIZE} 張，第 ${_maintPhotoPage+1} / ${totalPages} 頁
        </span>
        <div style="display:flex;gap:6px">
          <button ${_maintPhotoPage===0?'disabled':''} onclick="maintChangePage(${_maintPhotoPage-1})"
            style="padding:7px 14px;border:1px solid #e2e8f0;border-radius:7px;background:#fff;cursor:pointer;font-size:14px;${_maintPhotoPage===0?'opacity:.4':''}">&lsaquo; 上頁</button>
          ${Array.from({length:Math.min(totalPages,7)},(_,i)=>{
            const pg = totalPages<=7 ? i : Math.max(0,Math.min(_maintPhotoPage-3,totalPages-7))+i;
            return `<button onclick="maintChangePage(${pg})"
              style="padding:7px 12px;border:${pg===_maintPhotoPage?'2px solid #0f766e':'1px solid #e2e8f0'};border-radius:7px;
                     background:${pg===_maintPhotoPage?'#f0fdf4':'#fff'};cursor:pointer;font-size:14px;
                     color:${pg===_maintPhotoPage?'#0f766e':'#334155'};font-weight:${pg===_maintPhotoPage?'800':'400'}">${pg+1}</button>`;
          }).join('')}
          <button ${_maintPhotoPage===totalPages-1?'disabled':''} onclick="maintChangePage(${_maintPhotoPage+1})"
            style="padding:7px 14px;border:1px solid #e2e8f0;border-radius:7px;background:#fff;cursor:pointer;font-size:14px;${_maintPhotoPage===totalPages-1?'opacity:.4':''}">下頁 &rsaquo;</button>
        </div>
      </div>` : `
      <div style="font-size:14px;color:#64748b;text-align:right">共 ${allPhotos.length} 張照片</div>`}
  `;
}

/* ── 照片比對互動 ── */
function maintSwitchCase(idx) {
  _maintCaseIdx   = Number(idx) || 0;
  _maintFolderIdx = -1;
  _maintStageTab  = 'all';
  _maintPhotoPage = 0;
  renderMaintenancePhotoArchive();
}

function maintSwitchFolder(idx) {
  _maintFolderIdx = Number(idx);
  _maintPhotoPage = 0;
  renderMaintenancePhotoArchive();
}

function maintSwitchStage(stage) {
  _maintStageTab  = stage;
  _maintPhotoPage = 0;
  renderMaintenancePhotoArchive();
}

function maintChangePage(pg) {
  _maintPhotoPage = Number(pg) || 0;
  renderMaintenancePhotoArchive();
  document.getElementById('maintenancePhotoArchive')?.scrollIntoView({ behavior:'smooth', block:'start' });
}

function maintOpenViewer(globalIdx) {
  const cases = maintenancePhotoIndex?.cases || [];
  const c = cases[_maintCaseIdx];
  const folders = c?.folders || [];
  const srcFolders = _maintFolderIdx < 0 ? folders : [folders[_maintFolderIdx]].filter(Boolean);
  let allPhotos = [];
  srcFolders.forEach(f => {
    const list = _maintStageTab === 'all'
      ? [...(f.before||[]), ...(f.during||[]), ...(f.after||[]), ...(f.unknown||[])]
      : (f[_maintStageTab] || []);
    allPhotos = allPhotos.concat(list);
  });
  const srcs = allPhotos.map(p => p.src);
  if (typeof openPhotoViewer === 'function') {
    openPhotoViewer(srcs, globalIdx);
  } else if (srcs[globalIdx]) {
    window.open(srcs[globalIdx], '_blank');
  }
}

// Kept for backward compatibility
function selectMaintenancePhotoCase(index)   { maintSwitchCase(index); }
function selectMaintenancePhotoFolder(index) { maintSwitchFolder(index); }

function openMaintenancePhotoViewer(photos, index = 0) {
  if (typeof openPhotoViewer === 'function') { openPhotoViewer(photos, index); return; }
  window.open(photos[index] || photos[0], '_blank');
}

function renderInspection() {
  document.getElementById('contentArea').innerHTML = `
    ${renderContractStatsSection()}
    ${renderMaintenancePhotoArchiveSection()}
  `;
  loadContractStats();
  loadMaintenancePhotoArchive();
  // 非同步偵測 Drive 服務帳號狀態，更新設定按鈕徽章
  _checkDriveStatus();
  // 顯示上次同步時間
  const lastSync = localStorage.getItem('lastCloudSync');
  const badge = document.getElementById('cloudSyncBadge');
  if (badge && lastSync) {
    const t = new Date(lastSync).toLocaleString('zh-TW', { month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit' });
    badge.innerHTML = `<span style="color:#64748b;font-size:11px">上次 ${t}</span>`;
  }
}

async function _checkDriveStatus() {
  try {
    const res = await fetch('/api/drive/status');
    const data = await res.json();
    const badge = document.getElementById('driveCfgBadge');
    const btn   = document.getElementById('driveCfgBtn');
    if (!badge || !btn) return;
    const configured = !!data.configured;
    const okBadge  = '<span style="background:#dcfce7;color:#166534;border-radius:999px;padding:1px 8px;font-size:12px;font-weight:700">✅ 已設定</span>';
    const warnBadge = '<span style="background:#fee2e2;color:#b91c1c;border-radius:999px;padding:1px 8px;font-size:12px;font-weight:700">⚠ 未設定</span>';
    if (badge) badge.innerHTML = configured ? okBadge : warnBadge;
    const badge2 = document.getElementById('driveCfgBadge2');
    if (badge2) badge2.innerHTML = configured ? okBadge : warnBadge;
    if (btn && configured) {
      btn.style.background = '#dcfce7';
      btn.style.borderColor = '#86efac';
      btn.style.color = '#15803d';
    }
  } catch (e) { /* 離線或後端不可用時靜默 */ }
}

/* ── 橫流溪林業巡護管理 ────────────────────────────────────────── */

let _forestryDocIdx = 0;

function forestryDocHrefOf(d) {
  return inspectionDocHref(FORESTRY_PATROL_BASE + d.file);
}

const FORESTRY_TYPE_STYLE = {
  '計畫核定本':  { color: '#0f766e', icon: 'fa-file-signature' },
  '結案計畫報表': { color: '#1565c0', icon: 'fa-file-invoice' },
  '成果報告':    { color: '#c2410c', icon: 'fa-flag-checkered' }
};

function renderForestryPatrolSection() {
  const years = [...new Set(FORESTRY_PATROL_DOCS.map(d => d.year))];
  const current = FORESTRY_PATROL_DOCS[_forestryDocIdx] || FORESTRY_PATROL_DOCS[0];
  const currentHref = forestryDocHrefOf(current);

  const yearBlocks = years.map(year => {
    const docs = FORESTRY_PATROL_DOCS
      .map((d, i) => ({ ...d, idx: i }))
      .filter(d => d.year === year);
    return `
      <div style="border:1px solid #e2e8f0;border-radius:10px;overflow:hidden">
        <div style="background:#f0fdf4;border-bottom:1px solid #dcfce7;padding:10px 14px;display:flex;align-items:center;gap:10px">
          <i class="fas fa-tree" style="color:#16a34a;font-size:20px"></i>
          <b style="font-size:20px;color:#14532d">${year} 年度</b>
          <span style="font-size:15px;color:#64748b">${docs.length} 份</span>
        </div>
        <div style="padding:6px;display:grid;gap:4px">
          ${docs.map(d => {
            const st = FORESTRY_TYPE_STYLE[d.type] || { color: '#475569', icon: 'fa-file-pdf' };
            const active = d.idx === _forestryDocIdx;
            return `
              <div class="forestry-doc-item" data-fidx="${d.idx}" onclick="forestrySelectDoc(${d.idx})"
                   style="display:flex;align-items:center;gap:8px;padding:8px 10px;border-radius:8px;cursor:pointer;
                          background:${active ? '#ecfdf5' : 'transparent'};border:1px solid ${active ? '#6ee7b7' : 'transparent'}"
                   onmouseover="if(!this.dataset.active)this.style.background='#f8fafc'"
                   onmouseout="if(!this.dataset.active)this.style.background=this.dataset.fidx==window._forestryActiveIdx?'#ecfdf5':'transparent'"
                   ${active ? 'data-active="1"' : ''}>
                <span style="background:${st.color}18;color:${st.color};border:1px solid ${st.color}44;border-radius:999px;padding:4px 12px;font-size:15px;font-weight:700;white-space:nowrap"><i class="fas ${st.icon}" style="margin-right:5px"></i>${d.type}</span>
                <span style="flex:1;font-size:18px;font-weight:600;color:#0f172a;line-height:1.45">${inspectionEscape(d.file.replace(/\.pdf$/i, ''))}</span>
                <i class="fas fa-chevron-right" style="font-size:14px;color:#94a3b8"></i>
              </div>`;
          }).join('')}
        </div>
      </div>`;
  }).join('');

  return `
    <div class="card" style="margin-bottom:16px">
      <div class="card-header" style="flex-wrap:wrap;gap:8px">
        <span class="card-title" style="font-size:23px"><i class="fas fa-shield-halved"></i> 橫流溪林業巡護管理</span>
        <span style="font-size:16px;color:#64748b">南勢社區林業計畫（106、110～114 年）：點選左側文件，右側直接預覽 PDF 內容</span>
      </div>
      <div class="card-body" style="padding:16px">
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:10px;margin-bottom:16px">
          ${inspectionManualMetric('巡護文件', FORESTRY_PATROL_DOCS.length, '份PDF', 'folder-open', '#16a34a', true)}
          ${inspectionManualMetric('計畫核定本', FORESTRY_PATROL_DOCS.filter(d => d.type === '計畫核定本').length, '份', 'file-signature', '#0f766e', true)}
          ${inspectionManualMetric('結案計畫報表', FORESTRY_PATROL_DOCS.filter(d => d.type === '結案計畫報表').length, '份', 'file-invoice', '#1565c0', true)}
          ${inspectionManualMetric('成果報告', FORESTRY_PATROL_DOCS.filter(d => d.type === '成果報告').length, '份', 'flag-checkered', '#c2410c', true)}
        </div>
        <div style="display:grid;grid-template-columns:minmax(380px,480px) 1fr;gap:14px;align-items:start">
          <!-- 左：文件清單 -->
          <div style="display:grid;gap:10px;max-height:680px;overflow-y:auto;padding-right:4px">
            ${yearBlocks}
          </div>
          <!-- 右：常駐 PDF 預覽 -->
          <div style="border:1px solid #e2e8f0;border-radius:10px;overflow:hidden;position:sticky;top:12px">
            <div style="background:#f8fafc;border-bottom:1px solid #e2e8f0;padding:10px 14px;display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap">
              <b id="forestryDocPreviewTitle" style="font-size:20px;color:#0f172a"><i class="fas fa-file-pdf" style="color:#dc2626;margin-right:8px"></i>${inspectionEscape(current.file.replace(/\.pdf$/i, ''))}</b>
              <a id="forestryDocOpenLink" class="btn btn-sm btn-outline" href="${currentHref}" target="_blank" rel="noopener noreferrer" style="font-size:15px"><i class="fas fa-up-right-from-square"></i> 新頁開啟</a>
            </div>
            <iframe id="forestryDocFrame" src="${currentHref}" style="width:100%;height:640px;border:none;display:block;background:#525659"></iframe>
          </div>
        </div>
      </div>
    </div>
  `;
}

function forestrySelectDoc(idx) {
  const d = FORESTRY_PATROL_DOCS[idx];
  if (!d) return;
  _forestryDocIdx = idx;
  window._forestryActiveIdx = idx;
  const href = forestryDocHrefOf(d);
  const frame = document.getElementById('forestryDocFrame');
  const label = document.getElementById('forestryDocPreviewTitle');
  const open  = document.getElementById('forestryDocOpenLink');
  if (frame) frame.src = href;
  if (label) label.innerHTML = `<i class="fas fa-file-pdf" style="color:#dc2626;margin-right:8px"></i>${inspectionEscape(d.file.replace(/\.pdf$/i, ''))}`;
  if (open)  open.href = href;
  document.querySelectorAll('.forestry-doc-item').forEach(el => {
    const active = Number(el.dataset.fidx) === idx;
    el.style.background = active ? '#ecfdf5' : 'transparent';
    el.style.borderColor = active ? '#6ee7b7' : 'transparent';
    if (active) el.dataset.active = '1'; else delete el.dataset.active;
  });
}

function renderMaintenanceManualShelf() {
  const manualCount = MAINTENANCE_MANUAL_BOOKS.filter(book => book.format === 'PDF').length;
  return `
    <div class="card" style="margin-bottom:16px">
      <div class="card-header">
        <span class="card-title"><i class="fas fa-book-medical"></i> 手冊管理維護資料</span>
        <span class="text-muted" style="font-size:12px">以書本型態管理維護手冊、巡查表單、AI評分作業與現場處理紀錄</span>
      </div>
      <div class="card-body">
        <div style="display:grid;grid-template-columns:220px 1fr;gap:14px;align-items:stretch">
          <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:14px;display:grid;gap:10px">
            ${inspectionManualMetric('上架手冊', manualCount, '本PDF', 'book-open', '#0f766e')}
            ${inspectionManualMetric('納管設施', DB.getAll('facilities').length, '筆', 'hard-hat', '#1565c0')}
            ${inspectionManualMetric('巡查紀錄', DB.getAll('inspections').length, '筆', 'clipboard-check', '#c2410c')}
            <div style="font-size:12px;line-height:1.65;color:#475569">
              手冊資料作為巡查、外觀檢視、DER&U評分與維護處理的依據；表單與AI結果仍需由人員覆核後存檔。
            </div>
          </div>
          <div>
            <div class="engineering-shelf" style="min-height:224px">
              ${MAINTENANCE_MANUAL_BOOKS.map((book, index) => renderMaintenanceManualBook(book, index)).join('')}
            </div>
            <div style="height:12px;background:linear-gradient(180deg,#cbd5e1,#94a3b8);border-radius:0 0 8px 8px;border:1px solid #94a3b8;border-top:none"></div>
          </div>
        </div>
      </div>
    </div>
  `;
}

function inspectionManualMetric(label, value, unit, icon, color, big = false) {
  const vSize = big ? 28 : 18;
  const lSize = big ? 16 : 12;
  const box   = big ? 44 : 34;
  return `
    <div style="display:flex;align-items:center;gap:10px;background:#fff;border:1px solid #e2e8f0;border-left:4px solid ${color};border-radius:8px;padding:10px">
      <span style="width:${box}px;height:${box}px;border-radius:8px;background:${color};color:#fff;display:flex;align-items:center;justify-content:center;font-size:${big ? 19 : 14}px"><i class="fas fa-${icon}"></i></span>
      <div><div style="font-size:${vSize}px;font-weight:900;color:#0f172a">${value}</div><div style="font-size:${lSize}px;color:#64748b">${label} ${unit}</div></div>
    </div>
  `;
}

function renderMaintenanceManualBook(book, index) {
  const color = book.color || ['#0f766e', '#1565c0', '#7c3aed', '#c2410c'][index % 4];
  const openAction = book.path
    ? `<a class="btn btn-sm btn-primary" href="${inspectionDocHref(book.path)}" target="_blank" rel="noopener noreferrer"><i class="fas fa-up-right-from-square"></i> 開啟</a>`
    : `<button class="btn btn-sm btn-primary" onclick="runMaintenanceManualAction('${inspectionEscape(book.action)}')"><i class="fas fa-arrow-right"></i> 前往</button>`;
  return `
    <article class="engineering-book" style="--book-color:${color}">
      <div class="book-spine">
        <div class="book-year">${inspectionEscape(book.year)}</div>
        <div class="book-title">${inspectionEscape(book.title)}</div>
        <div class="book-format">${inspectionEscape(book.format)}</div>
      </div>
      <div class="book-detail">
        <div style="display:flex;justify-content:space-between;gap:8px;margin-bottom:6px">
          <b>${inspectionEscape(book.title)}</b>
          <span class="badge badge-info">${inspectionEscape(book.format)}</span>
        </div>
        <div style="font-size:12px;color:#64748b;margin-bottom:6px">${inspectionEscape(book.year)} · ${inspectionEscape(book.type)}</div>
        <div style="font-size:12px;line-height:1.55;color:#475569;margin-bottom:8px">${inspectionEscape(book.summary)}</div>
        <div style="display:flex;gap:4px;flex-wrap:wrap;margin-bottom:10px">
          ${(book.tags || []).slice(0, 4).map(tag => `<span style="font-size:11px;background:#f1f5f9;color:#334155;padding:2px 6px;border-radius:12px">${inspectionEscape(tag)}</span>`).join('')}
        </div>
        <div style="display:flex;gap:6px;flex-wrap:wrap">
          ${openAction}
          <button class="btn btn-sm btn-outline" onclick="askMaintenanceManualAI('${inspectionAttr(book.title)}')">
            <i class="fas fa-brain"></i> 問AI
          </button>
        </div>
      </div>
    </article>
  `;
}

function inspectionDocHref(path) {
  // Flask /media/ 路由從 project root 提供靜態媒體檔案（serve.ps1 亦支援同一路徑）
  return '/media/' + String(path || '').split('/').map(encodeURIComponent).join('/');
}

function inspectionAttr(value) {
  return inspectionEscape(value).replace(/`/g, '&#96;');
}

function runMaintenanceManualAction(action) {
  if (action === 'openInspectionForm') return openInspectionForm();
  if (action === 'scrollDeru') {
    const title = Array.from(document.querySelectorAll('.card-title')).find(el => el.textContent.includes('DER&U'));
    title?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

function askMaintenanceManualAI(title) {
  if (typeof toggleAIChat === 'function') {
    const panel = document.getElementById('aiChatPanel');
    if (panel && !panel.classList.contains('open')) toggleAIChat();
  }
  const input = document.getElementById('aiInput');
  if (input) {
    input.value = `請依據「${title}」整理橫流溪維護管理重點、巡查判斷依據、DER&U評分注意事項與後續處理建議。`;
    input.focus();
  }
}

function renderInspectionAiOverview(aiAnalysed, total) {
  const rate = total ? Math.round((aiAnalysed / total) * 100) : 0;
  return `
    <div class="card">
      <div class="card-header">
        <span class="card-title"><i class="fas fa-camera-retro"></i> AI影像辨識與輔助評分分析</span>
        <button class="btn btn-sm btn-outline" onclick="openInspectionForm()"><i class="fas fa-upload"></i> 匯入巡查影像</button>
      </div>
      <div class="card-body">
        <div style="display:grid;grid-template-columns:1.3fr .9fr;gap:16px;align-items:stretch">
          <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px">
            ${inspectionAiMetric('影像分析覆蓋率', `${rate}%`, `${aiAnalysed}/${total || 0} 筆巡查`, 'camera-retro', '#1565c0')}
            ${inspectionAiMetric('判讀項目', '4 類', '裂縫、沖刷、淤積、劣化', 'search-location', '#7c3aed')}
            ${inspectionAiMetric('輸出成果', 'DER&U', '自動建議 D/E/R/U', 'chart-line', '#0f766e')}
          </div>
          <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:14px">
            <div style="font-weight:800;color:#0f172a;margin-bottom:8px">導入方式</div>
            <div style="display:grid;gap:8px;font-size:13px;line-height:1.55;color:#334155">
              <div><b>1. 影像辨識：</b>圈選異常區域，判讀裂縫、破損、淘空、淤積與鏽蝕特徵。</div>
              <div><b>2. 量化評分：</b>估算損壞範圍、劣化程度與功能影響，轉換為 DER&U 輔助分數。</div>
              <div><b>3. 人工覆核：</b>AI結果作為輔助建議，最後等級由巡查人員確認，降低主觀差異。</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

function inspectionAiMetric(label, value, note, icon, color) {
  return `
    <div style="border:1px solid #e2e8f0;border-radius:8px;padding:14px;background:#fff">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
        <span style="width:34px;height:34px;border-radius:8px;background:${color};color:#fff;display:inline-flex;align-items:center;justify-content:center">
          <i class="fas fa-${icon}"></i>
        </span>
        <span style="font-size:12px;color:#64748b;font-weight:700">${label}</span>
      </div>
      <div style="font-size:24px;font-weight:800;color:#0f172a">${value}</div>
      <div style="font-size:12px;color:#64748b;margin-top:2px">${note}</div>
    </div>
  `;
}

function inspectionStatusMapData() {
  const facilities = DB.getAll('facilities');
  return DB.getAll('inspections').map(item => {
    const facilityId = Number(item.facilityId || item.facility_id);
    const facility = facilities.find(f => Number(f.id) === facilityId);
    if (!facility?.lat || !facility?.lng) return null;
    return {
      ...item,
      facilityId,
      facilityName: item.facilityName || item.facility_name || facility.name || '-',
      lat: facility.lat,
      lng: facility.lng,
      facilityType: facility.type || facility.subType || '-',
      stationKm: facility.stationKm || '-',
      uiStatus: getInspectionStatus(item),
      uiPriority: getInspectionPriority(item),
      sourceLabel: item.type === 'deru_assessment' || item.sourceType === 'DER&U評估' ? 'DER&U評估' : '巡查'
    };
  }).filter(Boolean);
}

function renderInspectionStatusMapSection(inspections = []) {
  const statusCount = status => inspections.filter(item => getInspectionStatus(item) === status).length;
  const deruCount = inspections.filter(item => item.type === 'deru_assessment' || item.sourceType === 'DER&U評估').length;
  return `
    <div class="card">
      <div class="card-header">
        <span class="card-title"><i class="fas fa-map-location-dot"></i> 處理狀態分布圖</span>
        <span class="text-muted" style="font-size:12px">連動工程設施座標、巡查紀錄、DER&U評估與處理狀態</span>
      </div>
      <div class="card-body">
        <div style="display:grid;grid-template-columns:1.15fr .85fr;gap:14px;align-items:stretch">
          <div id="inspectionStatusMap" style="height:360px;border:1px solid #dbe3ea;border-radius:8px;background:#f8fafc;overflow:hidden"></div>
          <div style="display:grid;gap:10px">
            ${inspectionStatusMapMetric('待處理', statusCount('待處理'), '#f59e0b', 'clock')}
            ${inspectionStatusMapMetric('處理中', statusCount('處理中'), '#0891b2', 'spinner')}
            ${inspectionStatusMapMetric('完成', statusCount('完成'), '#16a34a', 'check')}
            ${inspectionStatusMapMetric('DER&U評估', deruCount, '#2563eb', 'clipboard-check')}
            <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:10px;font-size:12px;line-height:1.6;color:#475569">
              點位顏色依處理狀態顯示；點擊可查看設施名稱、巡查日期、優先度、外觀檢視及後續建議摘要。
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

function inspectionStatusMapMetric(label, value, color, icon) {
  return `
    <div style="display:flex;align-items:center;gap:10px;background:#fff;border:1px solid #e2e8f0;border-left:4px solid ${color};border-radius:8px;padding:10px">
      <span style="width:34px;height:34px;border-radius:8px;background:${color};color:#fff;display:flex;align-items:center;justify-content:center"><i class="fas fa-${icon}"></i></span>
      <div><div style="font-size:18px;font-weight:900;color:#0f172a">${value}</div><div style="font-size:12px;color:#64748b">${label}</div></div>
    </div>
  `;
}

function initInspectionStatusMap() {
  const el = document.getElementById('inspectionStatusMap');
  if (!el || typeof L === 'undefined') return;
  if (window.inspectionStatusMapInstance) {
    window.inspectionStatusMapInstance.remove();
    window.inspectionStatusMapInstance = null;
  }
  const points = inspectionStatusMapData();
  if (!points.length) {
    el.innerHTML = '<div style="height:100%;display:flex;align-items:center;justify-content:center;color:#94a3b8">尚無可定位的巡查紀錄</div>';
    return;
  }
  const map = L.map('inspectionStatusMap', {
    zoomControl: true,
    attributionControl: false,
    scrollWheelZoom: false
  }).setView([24.183, 120.909], 14);
  window.inspectionStatusMapInstance = map;
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19
  }).addTo(map);
  const colorMap = { '待處理': '#f59e0b', '處理中': '#0891b2', '完成': '#16a34a' };
  const bounds = [];
  points.forEach(item => {
    const color = colorMap[item.uiStatus] || '#64748b';
    bounds.push([item.lat, item.lng]);
    const icon = L.divIcon({
      className: 'inspection-status-marker',
      html: `<div style="width:24px;height:24px;border-radius:999px;background:${color};border:3px solid #fff;box-shadow:0 3px 10px rgba(15,23,42,.35);display:flex;align-items:center;justify-content:center;color:#fff;font-size:11px;font-weight:900">${item.sourceLabel === 'DER&U評估' ? 'D' : '巡'}</div>`,
      iconSize: [24, 24],
      iconAnchor: [12, 12]
    });
    const popup = `
      <div style="min-width:220px;font-size:12px;line-height:1.6">
        <div style="font-weight:800;color:#0f172a;margin-bottom:4px">${inspectionEscape(item.facilityName)}</div>
        <div><b>來源：</b>${inspectionEscape(item.sourceLabel)}　<b>狀態：</b>${inspectionEscape(item.uiStatus)}</div>
        <div><b>優先度：</b>${inspectionEscape(item.uiPriority)}　<b>日期：</b>${inspectionEscape(item.date || '-')}</div>
        <div><b>類型：</b>${inspectionEscape(item.facilityType)}　<b>樁號：</b>${inspectionEscape(item.stationKm)}</div>
        <div style="margin-top:5px;color:#475569"><b>外觀：</b>${inspectionEscape(inspectionAppearanceTableSummary(item))}</div>
        <div style="color:#475569"><b>建議：</b>${inspectionEscape(inspectionRecommendationTableSummary(item))}</div>
      </div>`;
    L.marker([item.lat, item.lng], { icon }).bindPopup(popup).addTo(map);
  });
  if (bounds.length > 1) map.fitBounds(bounds, { padding: [28, 28], maxZoom: 15 });
  setTimeout(() => map.invalidateSize(), 120);
}

function loadInspectionTable() {
  let data = DB.getAll('inspections').map(item => ({
    ...item,
    facilityName: item.facilityName || item.facility_name || '-',
    facilityId: item.facilityId || item.facility_id || null,
    findings: item.findings || item.notes || (item.type === 'deru_assessment' ? 'DER&U 工程設施評估紀錄' : ''),
    uiStatus: getInspectionStatus(item),
    uiPriority: getInspectionPriority(item)
  }));
  const sf = document.getElementById('inspStatusFilter')?.value;
  const pf = document.getElementById('inspPriorityFilter')?.value;
  const af = document.getElementById('inspAiFilter')?.value;
  if (sf) data = data.filter(i => i.uiStatus === sf);
  if (pf) data = data.filter(i => i.uiPriority === pf);
  if (af === 'yes') data = data.filter(i => i.aiImageAnalysis);
  if (af === 'no') data = data.filter(i => !i.aiImageAnalysis);

  const order = { '緊急': 0, '高': 1, '中': 2, '低': 3 };
  data.sort((a, b) => (order[a.uiPriority] ?? 4) - (order[b.uiPriority] ?? 4));

  const statusBadge = s => `<span class="badge badge-${inspectionStatusClass(s)}">${s}</span>`;
  const priorityBadge = p => `<span class="badge badge-${inspectionPriorityClass(p)}">${p}</span>`;

  document.getElementById('inspectionTable').innerHTML = data.length ? `
    <div class="table-container">
      <table>
        <thead>
          <tr><th>來源</th><th>設施名稱</th><th>巡查日期</th><th>維護時間</th><th>完成時間</th><th>巡查人員</th><th>發現事項</th><th>外觀檢視</th><th>後續建議</th><th>AI影像</th><th>優先度</th><th>處理狀態</th><th>操作</th></tr>
        </thead>
        <tbody>
          ${data.map(item => `
            <tr>
              <td>${item.sourceType === 'DER&U評估' || item.type === 'deru_assessment'
                ? '<span class="badge badge-primary">DER&U評估</span>'
                : '<span class="badge badge-default">巡查</span>'}</td>
              <td class="fw-600">${inspectionEscape(item.facilityName)}</td>
              <td>${inspectionEscape(item.date || '-')}</td>
              <td>${inspectionEscape(item.maintenanceStart || item.date || '-')}</td>
              <td>${inspectionEscape(inspectionExpectedCompletion(item))}</td>
              <td>${inspectionEscape(item.inspector || '-')}</td>
              <td class="truncate">${inspectionEscape(item.findings || '-')}</td>
              <td class="truncate">${inspectionEscape(inspectionAppearanceTableSummary(item))}</td>
              <td class="truncate">${inspectionEscape(inspectionRecommendationTableSummary(item))}</td>
              <td>${item.aiImageAnalysis ? `<span class="badge badge-primary">${Math.round(item.aiImageAnalysis.confidence * 100)}% 信心</span>` : '<span class="text-muted">未分析</span>'}</td>
              <td>${priorityBadge(item.uiPriority)}</td>
              <td>${statusBadge(item.uiStatus)}</td>
              <td>
                <button class="btn btn-sm btn-outline btn-icon" onclick="viewInspection(${item.id})" title="查看"><i class="fas fa-eye"></i></button>
                <button class="btn btn-sm btn-outline btn-icon" onclick="openInspectionForm(${item.id})" title="編輯"><i class="fas fa-edit"></i></button>
                <button class="btn btn-sm btn-outline btn-icon" onclick="openInspectionReclassificationForm(${item.id})" title="資料重新歸類" style="color:#7c3aed"><i class="fas fa-random"></i></button>
                <button class="btn btn-sm btn-outline btn-icon" onclick="deleteInspection(${item.id})" title="刪除" style="color:var(--danger)"><i class="fas fa-trash"></i></button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  ` : '<div class="empty-state"><i class="fas fa-clipboard"></i><p>查無巡查紀錄</p></div>';
}

function openInspectionForm(id = null, preFacilityId = null) {
  const ins = id ? DB.getById('inspections', id) : {};
  if (id && ins?.formType === 'general_periodic') return openGeneralPeriodicForm(ins.facilityId || null, id);
  if (id && ins?.formType === 'professional_structure') return openStructureInspectionForm(ins.facilityId || null, id);
  if (id && ins?.formType === 'professional_fishway') return openFishwayForm(ins.facilityId || null, id);
  if (id && ins?.formType === 'maintenance_completion') return openMaintenanceCompletionForm(ins.facilityId || null, id);
  const facilities = DB.getAll('facilities');
  const _preFacId = preFacilityId ? Number(preFacilityId) : null;
  currentInspectionAiImage = null;
  currentInspectionAiAnalysis = ins?.aiImageAnalysis || null;
  currentInspectionAiImageDataUrl = null;

  document.getElementById('modalTitle').textContent = id ? '編輯巡查紀錄' : '新增巡查紀錄';
  document.getElementById('modalBody').innerHTML = `
    <div class="form-grid">
      <div class="form-group full-width"><label>設施名稱 *</label>
        <select id="ins_facility">
          <option value="">請選擇設施</option>
          ${facilities.map(f => `<option value="${f.id}" data-name="${inspectionEscape(f.name)}" ${(Number(ins.facilityId) || _preFacId) === Number(f.id) ? 'selected' : ''}>${inspectionEscape(f.name)}</option>`).join('')}
        </select>
      </div>
      <div class="form-group"><label>巡查日期 *</label><input id="ins_date" type="date" value="${ins.date || new Date().toISOString().split('T')[0]}"></div>
      <div class="form-group"><label>巡查人員</label><input id="ins_inspector" type="text" value="${inspectionEscape(ins.inspector || '')}"></div>
      <div class="form-group"><label>天氣</label>
        <select id="ins_weather">
          ${['晴', '陰', '雨', '豪雨後', '颱風後'].map(w => `<option value="${w}" ${ins.weather === w ? 'selected' : ''}>${w}</option>`).join('')}
        </select>
      </div>
      <div class="form-group"><label>優先度</label>
        <select id="ins_priority">
          ${INSPECTION_PRIORITY.map(p => `<option value="${p}" ${getInspectionPriority(ins) === p ? 'selected' : ''}>${p}</option>`).join('')}
        </select>
      </div>
      <div class="form-group"><label>處理狀態</label>
        <select id="ins_status">
          ${INSPECTION_STATUS.map(s => `<option value="${s}" ${getInspectionStatus(ins) === s ? 'selected' : ''}>${s}</option>`).join('')}
        </select>
      </div>
      <div class="form-group"><label>維護開始時間</label><input id="ins_maintenanceStart" type="date" value="${ins.maintenanceStart || ins.date || ''}"></div>
      <div class="form-group"><label>預計完成時間</label><input id="ins_expectedCompletion" type="date" value="${ins.expectedCompletion || ''}"></div>
      <div class="form-group"><label>實際完成時間</label><input id="ins_completedAt" type="date" value="${ins.completedAt || ins.completionDate || ''}"></div>
      <div class="form-group full-width"><label>發現事項 *</label><textarea id="ins_findings" rows="3">${inspectionEscape(ins.findings || '')}</textarea></div>
      <div class="form-group full-width"><label>處理建議</label><textarea id="ins_action" rows="2">${inspectionEscape(ins.action || '')}</textarea></div>
    </div>

    ${renderInspectionAiFormPanel(ins)}

    <div style="border-top:2px solid var(--primary);margin:16px 0 12px;padding-top:14px">
      <div style="font-weight:700;color:var(--primary);margin-bottom:10px;font-size:14px">DER&U 輔助評分</div>
      <div class="form-grid" style="grid-template-columns:1fr 1fr 1fr 1fr">
        <div class="form-group">
          <label>D 損壞程度</label>
          <select id="ins_d" onchange="derCalc()">
            <option value="0" ${(ins.deru_d || 0) == 0 ? 'selected' : ''}>D0 無明顯損壞</option>
            <option value="1" ${(ins.deru_d || 0) == 1 ? 'selected' : ''}>D1 輕微劣化</option>
            <option value="2" ${(ins.deru_d || 0) == 2 ? 'selected' : ''}>D2 中度損壞</option>
            <option value="3" ${(ins.deru_d || 0) == 3 ? 'selected' : ''}>D3 明顯損壞</option>
            <option value="4" ${(ins.deru_d || 0) == 4 ? 'selected' : ''}>D4 嚴重損壞</option>
          </select>
          <small style="color:#64748b;font-size:11px">依裂縫、破損、淘空、鏽蝕與淤積程度判定。</small>
        </div>
        <div class="form-group">
          <label>E 損壞範圍</label>
          <select id="ins_e" onchange="derCalc()">
            <option value="1" ${(ins.deru_e || 1) == 1 ? 'selected' : ''}>E1 局部小於5%</option>
            <option value="2" ${(ins.deru_e || 1) == 2 ? 'selected' : ''}>E2 約5-25%</option>
            <option value="3" ${(ins.deru_e || 1) == 3 ? 'selected' : ''}>E3 約25-50%</option>
            <option value="4" ${(ins.deru_e || 1) == 4 ? 'selected' : ''}>E4 超過50%</option>
          </select>
          <small style="color:#64748b;font-size:11px">AI估算異常面積比例，巡查人員可覆核調整。</small>
        </div>
        <div class="form-group">
          <label>R 風險影響</label>
          <select id="ins_r" onchange="derCalc()">
            <option value="1" ${(ins.deru_r || 1) == 1 ? 'selected' : ''}>R1 功能影響低</option>
            <option value="2" ${(ins.deru_r || 1) == 2 ? 'selected' : ''}>R2 需追蹤</option>
            <option value="3" ${(ins.deru_r || 1) == 3 ? 'selected' : ''}>R3 影響通行或排洪</option>
            <option value="4" ${(ins.deru_r || 1) == 4 ? 'selected' : ''}>R4 有安全或阻斷風險</option>
          </select>
          <small style="color:#64748b;font-size:11px">考量設施功能、位置、棲地連通與現地安全。</small>
        </div>
        <div class="form-group">
          <label>U 維護急迫性</label>
          <div id="deru_result" style="padding:8px;border-radius:6px;background:#f1f5f9;border:1px solid #e2e8f0;text-align:center;min-height:36px;font-weight:700;font-size:13px">-</div>
          <div id="deru_score_display" style="font-size:11px;color:#64748b;text-align:center;margin-top:3px">分數：-</div>
        </div>
      </div>
    </div>
  `;

  document.getElementById('modalFooter').innerHTML = `
    <button class="btn btn-outline" onclick="closeModal()">取消</button>
    <button class="btn btn-secondary" onclick="runInspectionAiAnalysis()"><i class="fas fa-camera-retro"></i> AI影像分析</button>
    <button class="btn btn-primary" onclick="saveInspection(${id || 'null'})"><i class="fas fa-save"></i> 儲存</button>
  `;
  openModal();
  derCalc();
  renderInspectionAiAnalysis(currentInspectionAiAnalysis);
}

function renderInspectionAiFormPanel(ins) {
  return `
    <div style="border-top:2px solid #1565c0;margin:16px 0 12px;padding-top:14px">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:10px">
        <div style="font-weight:700;color:#1565c0;font-size:14px">AI 影像輔助評分</div>
        <button class="btn btn-sm btn-outline" type="button" onclick="runInspectionAiAnalysis()"><i class="fas fa-wand-magic-sparkles"></i> 執行AI分析</button>
      </div>
      <div style="display:grid;grid-template-columns:260px 1fr;gap:14px;align-items:stretch">
        <div style="border:1px dashed #94a3b8;border-radius:8px;background:#f8fafc;padding:12px;display:grid;gap:10px">
          <input id="ins_ai_image" type="file" accept="image/*" onchange="handleInspectionImageUpload(event)">
          <div id="ins_ai_preview" style="height:150px;border-radius:8px;background:#e2e8f0;display:flex;align-items:center;justify-content:center;overflow:hidden;color:#64748b;font-size:12px">
            ${ins?.aiImageName ? inspectionEscape(ins.aiImageName) : '尚未匯入影像'}
          </div>
          <small style="color:#64748b;line-height:1.45">支援現場照片、裂縫照片、魚道堵塞照片、護岸淘空照片。分析結果仍需人工覆核。</small>
        </div>
        <div id="ins_ai_result"></div>
      </div>
    </div>
  `;
}

function handleInspectionImageUpload(event) {
  const file = event.target.files?.[0];
  currentInspectionAiImage = file || null;
  currentInspectionAiImageDataUrl = null;
  currentInspectionAiAnalysis = null;
  const preview = document.getElementById('ins_ai_preview');
  if (!file || !preview) return;

  const reader = new FileReader();
  reader.onload = () => {
    currentInspectionAiImageDataUrl = String(reader.result || '');
    preview.innerHTML = `<img src="${reader.result}" alt="巡查影像預覽" style="width:100%;height:100%;object-fit:cover">`;
  };
  reader.readAsDataURL(file);
  renderInspectionAiAnalysis(null);
}

function resizeInspectionImageForVision(file, maxSize = 960, quality = 0.84) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        const scale = Math.min(1, maxSize / Math.max(img.width || maxSize, img.height || maxSize));
        const width = Math.max(1, Math.round((img.width || maxSize) * scale));
        const height = Math.max(1, Math.round((img.height || maxSize) * scale));
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d', { alpha: false });
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = String(reader.result || '');
    };
    reader.readAsDataURL(file);
  });
}

async function runInspectionAiAnalysis() {
  const facilityEl = document.getElementById('ins_facility');
  const facilityName = facilityEl?.options[facilityEl.selectedIndex]?.dataset?.name || '';
  const findings = document.getElementById('ins_findings')?.value || '';
  const weather = document.getElementById('ins_weather')?.value || '';
  const fileName = currentInspectionAiImage?.name || '';

  let analysis = null;
  if (currentInspectionAiImageDataUrl) {
    renderInspectionAiAnalysis({
      loading: true,
      imageName: fileName || '巡查影像',
      provider: 'ollama',
      model: 'vision'
    });
    try {
      const visionImageBase64 = currentInspectionAiImage
        ? await resizeInspectionImageForVision(currentInspectionAiImage)
        : currentInspectionAiImageDataUrl;
      analysis = await analyzeInspectionImageWithOllamaVision({
        imageBase64: visionImageBase64,
        imageName: fileName,
        facilityName,
        findings,
        weather
      });
    } catch (error) {
      console.warn('[Inspection AI] Ollama vision unavailable, fallback to local scoring:', error);
      showToast('Ollama vision 未回應，改用本機規則輔助評分', 'warning');
    }
  }

  if (!analysis) {
    analysis = buildInspectionAiAnalysis({ facilityName, findings, weather, fileName });
    analysis.provider = 'local_rule_fallback';
    analysis.model = 'inspection-rule-assist';
    analysis.inferenceMode = 'local_rule_fallback';
  }
  analysis = applyInspectionDomainOverrides(analysis, {
    facilityName,
    findings,
    weather,
    fileName,
    hasImage: !!currentInspectionAiImageDataUrl
  });

  currentInspectionAiAnalysis = analysis;

  document.getElementById('ins_d').value = String(analysis.deru.d);
  document.getElementById('ins_e').value = String(analysis.deru.e);
  document.getElementById('ins_r').value = String(analysis.deru.r);
  document.getElementById('ins_priority').value = analysis.priority;
  derCalc();

  const findingsEl = document.getElementById('ins_findings');
  if (findingsEl && !findingsEl.value.trim()) {
    findingsEl.value = analysis.findingsSuggestion;
  }

  const actionEl = document.getElementById('ins_action');
  if (actionEl && !actionEl.value.trim()) {
    actionEl.value = analysis.actionSuggestion;
  }

  renderInspectionAiAnalysis(analysis);
  showToast(analysis.provider === 'ollama' ? 'Ollama vision 影像辨識完成，已帶入輔助評分建議' : 'AI輔助評分完成，已帶入 DER&U 建議', 'success');
}

function inspectionApiBases() {
  return window.HLX_API_BASE ? [window.HLX_API_BASE] : ['http://localhost:5000', 'http://localhost:5051', '', 'http://localhost:5050'];
}

async function analyzeInspectionImageWithOllamaVision({ imageBase64, imageName, facilityName, findings, weather }) {
  let lastError = null;
  for (const base of inspectionApiBases()) {
    try {
      const res = await fetchInspectionJsonWithTimeout(`${base}/api/rag/vision-inspection`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image_base64: imageBase64,
          image_name: imageName,
          facility_name: facilityName,
          findings,
          weather
        })
      }, 90000);
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.status !== 'success' || !data.analysis) {
        throw new Error(data.message || `Ollama vision HTTP ${res.status}`);
      }
      return data.analysis;
    } catch (error) {
      lastError = error;
    }
  }
  try {
    return await analyzeInspectionImageDirectWithOllama({ imageBase64, imageName, facilityName, findings, weather });
  } catch (error) {
    lastError = error;
  }
  throw lastError || new Error('Ollama vision API unavailable');
}

function stripInspectionDataUrlImage(imageBase64) {
  return String(imageBase64 || '').replace(/^data:image\/[a-zA-Z0-9.+-]+;base64,/, '');
}

async function fetchInspectionJsonWithTimeout(url, options, timeoutMs = 90000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

function parseInspectionJsonObject(text) {
  const raw = String(text || '').trim();
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch (_) {
    const start = raw.indexOf('{');
    const end = raw.lastIndexOf('}');
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(raw.slice(start, end + 1));
      } catch (_) {
        return {};
      }
    }
  }
  return {};
}

const INSPECTION_APPEARANCE_ITEMS = [
  { key: 'good', label: '良好' },
  { key: 'crack', label: '裂縫' },
  { key: 'abrasion', label: '磨蝕' },
  { key: 'scour', label: '淘空' },
  { key: 'overturn', label: '傾倒' },
  { key: 'settlement', label: '沉陷' },
  { key: 'deformation', label: '錯動變形' },
  { key: 'displacement', label: '位移' },
  { key: 'backfillLoss', label: '填土（石）流失' },
  { key: 'decay', label: '腐朽' },
  { key: 'fireDamage', label: '火害' },
  { key: 'frameBreak', label: '外框斷裂' },
  { key: 'poorVegetation', label: '植生覆蓋不良' },
  { key: 'other', label: '其他' }
];

const INSPECTION_APPEARANCE_LABELS = {
  good: '良好',
  crack: '裂縫',
  abrasion: '磨蝕',
  scour: '淘空',
  overturn: '傾倒',
  settlement: '沉陷',
  deformation: '錯動變形',
  displacement: '位移',
  backfillLoss: '填土（石）流失',
  decay: '腐朽',
  fireDamage: '火害',
  frameBreak: '外框斷裂',
  poorVegetation: '植生覆蓋不良',
  other: '其他'
};

function inspectionAppearanceLabel(item) {
  return INSPECTION_APPEARANCE_LABELS[item?.key] || item?.label || '';
}

function buildInspectionAppearanceChecklist(features = [], rawChecklist = {}, goodDefault = false) {
  const text = [
    ...features,
    rawChecklist?.other || rawChecklist?.other_text || ''
  ].join(' ');
  const picked = {
    good: !!rawChecklist.good || goodDefault,
    crack: !!rawChecklist.crack || /裂縫|裂隙|龜裂|crack/.test(text),
    abrasion: !!rawChecklist.abrasion || /磨蝕|磨耗|剝蝕|表面侵蝕|鋼筋外露|abrasion|wear/.test(text),
    scour: !!rawChecklist.scour || /淘空|淘刷|沖刷|掏空|基礎裸露|坡腳|scour|undercut|erosion/.test(text),
    overturn: !!rawChecklist.overturn || /傾倒|倒塌|傾斜|overturn|collapse/.test(text),
    settlement: !!rawChecklist.settlement || /沉陷|下陷|凹陷|settlement/.test(text),
    deformation: !!rawChecklist.deformation || /錯動|變形|鼓出|破碎|排列不連續|deformation/.test(text),
    displacement: !!rawChecklist.displacement || /位移|滑移|移動|displacement/.test(text),
    backfillLoss: !!rawChecklist.backfillLoss || !!rawChecklist.backfill_loss || /填土|填石|背填|土砂流失|材料流失|流失|空洞/.test(text),
    decay: !!rawChecklist.decay || /腐朽|腐爛|木材劣化|decay|rot/.test(text),
    fireDamage: !!rawChecklist.fireDamage || !!rawChecklist.fire_damage || /火害|燒灼|焦黑|碳化|fire/.test(text),
    frameBreak: !!rawChecklist.frameBreak || !!rawChecklist.frame_break || /外框斷裂|框架破損|護框|格框|蛇籠框|frame/.test(text),
    poorVegetation: !!rawChecklist.poorVegetation || !!rawChecklist.poor_vegetation || /植生覆蓋不良|植生稀疏|裸露坡面/.test(text),
    other: !!rawChecklist.other || /植生過度覆蓋|排水孔阻塞|漂流木|河道淤積|護欄破損/.test(text)
  };
  const hasAbnormal = Object.keys(picked).some(key => key !== 'good' && picked[key]);
  picked.good = !hasAbnormal && picked.good;
  picked.otherText = rawChecklist.otherText || rawChecklist.other_text || (
    /植生過度覆蓋/.test(text) ? '植生過度覆蓋影響檢視' : ''
  );
  return picked;
}

function inferInspectionStructureType(facilityName = '', features = []) {
  const text = `${facilityName} ${features.join(' ')}`;
  if (/護岸|revetment|溪岸|坡腳|坡面|岸坡|漿砌石|塊石護坡|石砌坡|水際|河岸/.test(text)) return '護岸';
  if (/擋土牆|retaining|擋土/.test(text)) return '擋土牆';
  if (/固床工/.test(text)) return '固床工';
  if (/防砂壩/.test(text)) return '防砂壩';
  if (/排水|管涵|水溝|箱涵/.test(text)) return '排水構造';
  if (/邊坡|護坡/.test(text)) return '邊坡保護設施';
  if (/蛇籠|石籠/.test(text)) return '蛇籠／石籠';
  if (/砌石/.test(text)) return '砌石構造';
  if (/魚道/.test(text)) return '其他';
  // 視覺特徵推論：淘刷/石塊位移/基礎裸露等 → 大機率為護岸
  if (/淘刷|淘空|坡腳|石塊.{0,5}位移|石塊.{0,5}鬆脫|基礎裸露|沖刷/.test(text)) return '護岸';
  return '無法判定';
}

function inspectionSeverityGrade(analysis) {
  const u = Number(analysis?.deru?.u || 0);
  const d = Number(analysis?.deru?.d || 0);
  const r = Number(analysis?.deru?.r || 0);
  const coverage = Number(analysis?.damageCoverage || 0);
  const regions = Number(analysis?.abnormalRegions || 0);
  if (u >= 4 || d >= 4 || r >= 4 || coverage >= 50) return 'D';
  if (u >= 3 || d >= 3 || r >= 3 || coverage >= 15) return 'C';
  if (regions > 0 || coverage > 0) return 'B';
  return 'A';
}

function inspectionSeverityLabel(grade) {
  return {
    A: 'A：未見明顯異常',
    B: 'B：輕微異常，建議例行追蹤',
    C: 'C：明顯異常，建議列入現場複查',
    D: 'D：嚴重異常，疑似已影響構造物功能，建議優先複查'
  }[grade] || '無法判定';
}

function inspectionConfidenceLabel(confidence) {
  const score = Number(confidence || 0);
  if (score >= 0.82) return '高';
  if (score >= 0.65) return '中';
  return '低';
}

function normalizeInspectionRecommendations(value, fallback) {
  if (Array.isArray(value)) return value.map(item => String(item || '').trim()).filter(Boolean).slice(0, 3);
  if (typeof value === 'string' && value.trim()) {
    return value.split(/[；;\n]/).map(item => item.trim()).filter(Boolean).slice(0, 3);
  }
  return fallback ? [fallback] : ['補拍近照與基礎或牆腳位置，並安排現場複核。'];
}

function applyInspectionDomainOverrides(analysis, context = {}) {
  if (!analysis) return analysis;
  const text = [
    context.facilityName,
    context.findings,
    context.weather,
    context.fileName,
    ...(analysis.deteriorationFeatures || [])
  ].join(' ').toLowerCase();
  const isDamScourReference = /防砂壩|壩體|壩基|dam|check dam|sabo/.test(text)
    && /淘刷|淘空|沖刷|掏空|空洞|懸空|裸露|鋼筋外露|基礎外露|scour|undercut|erosion|void|防砂壩-淘空/.test(text);
  if (isDamScourReference) {
    const features = (analysis.deteriorationFeatures || [])
      .filter(item => !/未見明顯|無明顯|正常|例行/.test(String(item)));
    if (!features.some(item => /防砂壩|壩基|淘刷|淘空|懸空|鋼筋|scour|undercut|void/.test(String(item)))) {
      features.unshift('防砂壩壩基/下游面嚴重淘空淘刷，混凝土構件疑似懸空或失去支撐');
    }
    const damageCoverage = Math.max(Number(analysis.damageCoverage || 0), 45);
    const d = 4;
    const e = Math.max(Number(analysis.deru?.e || 1), 3);
    const r = 4;
    const deru = DERU_MATRIX.urgency(d, e, r);
    const appearanceChecklist = buildInspectionAppearanceChecklist(
      features,
      { ...(analysis.appearanceChecklist || {}), scour: true, backfillLoss: true, deformation: true },
      false
    );
    return {
      ...analysis,
      abnormalRegions: Math.max(Number(analysis.abnormalRegions || 0), 1),
      damageCoverage,
      deteriorationFeatures: features,
      confidence: Math.max(Number(analysis.confidence || 0.6), 0.88),
      priority: '緊急',
      deru: { d, e, r, u: deru.u, score: Number(deru.score.toFixed(2)), label: deru.label },
      appearanceChecklist,
      structureType: '防砂壩',
      severityGrade: 'D',
      confidenceLabel: '高',
      reasoning: '照片中可見或疑似防砂壩下游溢流面、壩基或混凝土構件下方出現大範圍空洞與淘刷，局部構件可能已失去支撐；此型態依校準案例歸類為嚴重淘空/淘刷，仍建議現場複核確認範圍與結構安全。',
      recommendations: ['立即安排現場複查並量測淘空長度、深度與懸空範圍', '檢查壩基、翼牆、消能池與下游河床是否持續沖刷', '評估臨時警戒、導流、基礎補強或緊急修復需求'],
      limitations: '本結果為照片判釋初步篩選，不能取代技師、工程人員或現場勘查。',
      findingsSuggestion: `AI影像輔助判讀：防砂壩壩基或下游面疑似嚴重淘空/淘刷，估計異常範圍約${damageCoverage}%，建議 D${d}/E${e}/R${r}，列為緊急優先度並立即現場複核。`,
      actionSuggestion: '建議立即補拍壩基下方、下游消能池、左右岸翼牆與近距離空洞照片；現場量測淘空深度與構件懸空範圍，必要時啟動緊急修復或封控。',
      modelNotes: `${analysis.modelNotes || ''} 已套用「防砂壩-淘空」嚴重校準案例。`.trim()
    };
  }
  const isGroundsillScourReference = /固床工|床固工|groundsill|grade control|bed sill/.test(text)
    && /淘刷|淘空|沖刷|掏空|空洞|懸空|下游側|基礎外露|板塊|底部|scour|undercut|erosion|void|固床工-淘空/.test(text);
  if (isGroundsillScourReference) {
    const features = (analysis.deteriorationFeatures || [])
      .filter(item => !/未見明顯|無明顯|正常|例行/.test(String(item)));
    if (!features.some(item => /固床工|淘刷|淘空|下游側|底部|懸空|scour|undercut|void/.test(String(item)))) {
      features.unshift('固床工下游側/底部嚴重淘空淘刷，構造物或板塊下方疑似懸空');
    }
    const damageCoverage = Math.max(Number(analysis.damageCoverage || 0), 38);
    const d = 4;
    const e = Math.max(Number(analysis.deru?.e || 1), 3);
    const r = 4;
    const deru = DERU_MATRIX.urgency(d, e, r);
    const appearanceChecklist = buildInspectionAppearanceChecklist(
      features,
      { ...(analysis.appearanceChecklist || {}), scour: true, backfillLoss: true, deformation: true, displacement: true },
      false
    );
    return {
      ...analysis,
      abnormalRegions: Math.max(Number(analysis.abnormalRegions || 0), 1),
      damageCoverage,
      deteriorationFeatures: features,
      confidence: Math.max(Number(analysis.confidence || 0.6), 0.88),
      priority: '緊急',
      deru: { d, e, r, u: deru.u, score: Number(deru.score.toFixed(2)), label: deru.label },
      appearanceChecklist,
      structureType: '固床工',
      severityGrade: 'D',
      confidenceLabel: '高',
      reasoning: '照片中可見或疑似固床工下游側及底部有明顯空洞、沖刷淘空或構造物懸空現象，研判可能影響固床、防沖與河床穩定功能；此型態依校準案例歸類為嚴重淘空/淘刷，仍建議現場複核。',
      recommendations: ['立即安排現場複查並量測固床工下游淘空長度、深度與懸空範圍', '檢查固床工底部、翼牆及上下游河床是否持續沖刷或位移', '評估基礎補強、塊石回填、消能保護或緊急修復需求'],
      limitations: '本結果為照片判釋初步篩選，不能取代技師、工程人員或現場勘查。',
      findingsSuggestion: `AI影像輔助判讀：固床工下游側或底部疑似嚴重淘空/淘刷，估計異常範圍約${damageCoverage}%，建議 D${d}/E${e}/R${r}，列為緊急優先度並立即現場複核。`,
      actionSuggestion: '建議立即補拍固床工下游側、底部空洞、左右岸接合處與上下游河床照片；現場量測淘空深度與構造物懸空範圍，必要時啟動基礎補強或緊急修復。',
      modelNotes: `${analysis.modelNotes || ''} 已套用「固床工-淘空」嚴重校準案例。`.trim()
    };
  }
  const isGroundsillCrackAbrasionReference = /固床工|床固工|groundsill|grade control|bed sill|固床工-裂隙磨損/.test(text)
    && /裂隙|裂縫|龜裂|磨損|磨蝕|剝蝕|接縫|破損|abrasion|wear|crack|joint/.test(text);
  if (isGroundsillCrackAbrasionReference) {
    const features = (analysis.deteriorationFeatures || [])
      .filter(item => !/未見明顯|無明顯|正常|例行/.test(String(item)));
    if (!features.some(item => /固床工|裂隙|裂縫|磨損|磨蝕|接縫|crack|abrasion|wear/.test(String(item)))) {
      features.unshift('固床工側牆/接縫處裂隙與表面磨損，局部混凝土邊角破損');
    }
    const hasVoidSignal = /淘刷|淘空|空洞|懸空|基礎外露|scour|undercut|void/.test(text);
    const damageCoverage = Math.max(Number(analysis.damageCoverage || 0), hasVoidSignal ? 28 : 18);
    const d = Math.max(Number(analysis.deru?.d || 1), hasVoidSignal ? 3 : 2);
    const e = Math.max(Number(analysis.deru?.e || 1), damageCoverage > 25 ? 3 : 2);
    const r = Math.max(Number(analysis.deru?.r || 1), hasVoidSignal ? 3 : 2);
    const deru = DERU_MATRIX.urgency(d, e, r);
    const priority = deru.u >= 4 ? '緊急' : deru.u === 3 ? '高' : deru.u === 2 ? '中' : '低';
    const appearanceChecklist = buildInspectionAppearanceChecklist(
      features,
      { ...(analysis.appearanceChecklist || {}), crack: true, abrasion: true, deformation: hasVoidSignal },
      false
    );
    return {
      ...analysis,
      abnormalRegions: Math.max(Number(analysis.abnormalRegions || 0), 1),
      damageCoverage,
      deteriorationFeatures: features,
      confidence: Math.max(Number(analysis.confidence || 0.6), 0.82),
      priority,
      deru: { d, e, r, u: deru.u, score: Number(deru.score.toFixed(2)), label: deru.label },
      appearanceChecklist,
      structureType: '固床工',
      severityGrade: inspectionSeverityGrade({ deru: { d, e, r, u: deru.u }, damageCoverage, abnormalRegions: 1 }),
      confidenceLabel: '高',
      reasoning: '照片中可見或疑似固床工側牆、接縫或邊角處有裂隙、破損與表面磨蝕現象，研判對應「裂縫」及「磨蝕」項目；若現場確認裂隙後方已有空洞或淘刷，需提高為淘空類風險。',
      recommendations: ['補拍裂隙近照並量測裂縫寬度、長度與深度', '檢查接縫後方是否有空洞、滲水或淘刷擴大', '安排混凝土修補、接縫封補或局部防沖保護評估'],
      limitations: '本結果為照片判釋初步篩選，不能取代技師、工程人員或現場勘查。',
      findingsSuggestion: `AI影像輔助判讀：固床工疑似裂隙與磨損，估計異常範圍約${damageCoverage}%，建議 D${d}/E${e}/R${r}，列為${priority}優先度並現場複核。`,
      actionSuggestion: '建議現場量測裂隙尺寸、確認是否伴隨滲水或背後淘刷；若裂隙持續擴大或接縫後方形成空洞，應升級為優先修復。',
      modelNotes: `${analysis.modelNotes || ''} 已套用「固床工-裂隙磨損」校準案例。`.trim()
    };
  }
  // 護岸判斷：文字關鍵字 OR AI 已辨識結構類型 OR 蛇籠石籠（同樣有坡腳淘刷風險）
  const isRevetment = /護岸|revetment|bank|坡腳|岸坡|水際|溪岸|擋土|坡面|漿砌石|塊石護坡|石砌坡/.test(text)
    || analysis.structureType === '護岸'
    || analysis.structureType === '蛇籠／石籠'
    || analysis.structureType === '砌石構造';
  // 淘刷信號：文字關鍵字 OR 外觀清單已勾選淘空 OR backfillLoss
  const hasScourSignal = /淘刷|淘空|沖刷|裸露|掏空|空洞|基礎外露|坡腳流失|scour|undercut|erosion|washout/.test(text)
    || analysis.appearanceChecklist?.scour === true
    || analysis.appearanceChecklist?.backfillLoss === true;

  // 觸發條件：護岸結構 + (有淘刷信號 OR 有上傳圖片)
  if (!isRevetment || (!hasScourSignal && !context.hasImage)) return analysis;

  const features = (analysis.deteriorationFeatures || [])
    .filter(item => !/未見明顯|無明顯|正常|例行/.test(String(item)));
  if (!features.some(item => /淘刷|淘空|沖刷|裸露|坡腳|scour|undercut|erosion/.test(String(item)))) {
    features.unshift('護岸坡腳淘刷/基礎裸露疑慮');
  }

  const rawCoverage = Number(analysis.damageCoverage || 0);
  const damageCoverage = Math.max(rawCoverage, hasScourSignal ? 22 : 18);
  const d = Math.max(Number(analysis.deru?.d || 1), hasScourSignal ? 3 : 2);
  const e = Math.max(Number(analysis.deru?.e || 1), damageCoverage > 25 ? 3 : 2);
  const r = Math.max(Number(analysis.deru?.r || 1), hasScourSignal ? 3 : 2);
  const deru = DERU_MATRIX.urgency(d, e, r);
  const priority = deru.u >= 4 ? '緊急' : deru.u === 3 ? '高' : deru.u === 2 ? '中' : '低';
  const abnormalRegions = Math.max(Number(analysis.abnormalRegions || 0), 1);
  const appearanceChecklist = buildInspectionAppearanceChecklist(
    features,
    { ...(analysis.appearanceChecklist || {}), scour: true, backfillLoss: true },
    false
  );
  const normalizedAnalysis = { deru: { d, e, r, u: deru.u }, damageCoverage, abnormalRegions };
  const severityGrade = inspectionSeverityGrade(normalizedAnalysis);

  return {
    ...analysis,
    abnormalRegions,
    damageCoverage,
    deteriorationFeatures: features,
    confidence: Math.max(Number(analysis.confidence || 0.6), hasScourSignal ? 0.84 : 0.78),
    priority,
    deru: { d, e, r, u: deru.u, score: Number(deru.score.toFixed(2)), label: deru.label },
    appearanceChecklist,
    structureType: analysis.structureType || inferInspectionStructureType(context.facilityName || '', features),
    severityGrade,
    confidenceLabel: inspectionConfidenceLabel(Math.max(Number(analysis.confidence || 0.6), hasScourSignal ? 0.84 : 0.78)),
    reasoning: `照片中可見或疑似護岸水際坡腳淘刷、基礎裸露或填土石流失跡象，研判可能對應「淘空」與「填土（石）流失」項目；惟受限於照片角度、遮蔽或解析度，仍建議現場複核。`,
    recommendations: ['補拍護岸基礎與牆腳近照', '現場量測淘刷長度、深度與坡腳裸露範圍', '檢查護岸是否仍具防沖與支撐功能'],
    limitations: '本結果僅作為照片判釋初步篩選，不能取代技師、工程人員或現場勘查。',
    findingsSuggestion: /未見明顯|無明顯/.test(String(analysis.findingsSuggestion || ''))
      ? `AI影像輔助判讀：護岸水際坡腳疑有淘刷或基礎裸露，估計異常範圍約${damageCoverage}%，建議列為${priority}優先度並人工覆核。`
      : (analysis.findingsSuggestion || `AI影像輔助判讀：護岸坡腳淘刷/基礎裸露疑慮，估計異常範圍約${damageCoverage}%。`),
    actionSuggestion: `建議以同角度重拍並量測淘刷長度、深度與坡腳裸露範圍；短期加密巡查，若淘刷持續擴大，應安排塊石補強、基腳保護或局部回填。`,
    modelNotes: `${analysis.modelNotes || ''} 已套用護岸淘刷專屬判讀規則。`.trim()
  };
}

function normalizeOllamaVisionInspection(raw, { imageName, facilityName, findings }) {
  const clamp = (value, min, max) => Math.max(min, Math.min(max, Number(value) || min));
  const abnormalRegions = Math.round(clamp(raw.abnormal_regions ?? raw.abnormalRegions, 0, 8));
  const damageCoverage = Math.round(clamp(raw.damage_coverage ?? raw.damageCoverage, 0, 100));
  const d = Math.round(clamp(raw.deru_d ?? raw.d, damageCoverage > 35 ? 3 : 1, 4));
  const e = Math.round(clamp(raw.deru_e ?? raw.e, damageCoverage > 50 ? 4 : damageCoverage > 25 ? 3 : damageCoverage > 5 ? 2 : 1, 4));
  const r = Math.round(clamp(raw.deru_r ?? raw.r, abnormalRegions >= 3 ? 3 : 1, 4));
  const deru = DERU_MATRIX.urgency(d, e, r);
  const features = Array.isArray(raw.deterioration_features)
    ? raw.deterioration_features
    : Array.isArray(raw.deteriorationFeatures)
      ? raw.deteriorationFeatures
      : [];
  const cleanFeatures = features.map(item => String(item || '').trim()).filter(Boolean).slice(0, 6);
  if (!cleanFeatures.length) cleanFeatures.push('影像中未見明顯重大異常，建議由巡查人員複核確認');
  const priority = deru.u >= 4 ? INSPECTION_PRIORITY[3] : deru.u === 3 ? INSPECTION_PRIORITY[2] : deru.u === 2 ? INSPECTION_PRIORITY[1] : INSPECTION_PRIORITY[0];
  const suggestion = String(raw.findings_suggestion || raw.findingsSuggestion || findings || '').trim();
  const action = String(raw.action_suggestion || raw.actionSuggestion || '').trim();
  const confidence = clamp(raw.confidence, 0.55, 0.95);
  const baseAnalysis = { deru: { d, e, r, u: deru.u }, damageCoverage, abnormalRegions };
  const appearanceChecklist = buildInspectionAppearanceChecklist(
    cleanFeatures,
    raw.appearance_checklist || raw.appearanceChecklist || {},
    abnormalRegions === 0 && damageCoverage <= 0
  );

  return {
    version: 'Ollama-Vision-Inspection-1.0',
    analysedAt: new Date().toISOString(),
    provider: 'ollama',
    model: 'gemma4:12b (browser direct)',
    inferenceMode: 'ollama_vision_realtime',
    imageName: imageName || 'inspection-image',
    facilityName: facilityName || '',
    abnormalRegions,
    damageCoverage,
    deteriorationFeatures: cleanFeatures,
    confidence,
    priority,
    deru: { d, e, r, u: deru.u, score: Number(deru.score.toFixed(2)), label: deru.label },
    findingsSuggestion: suggestion || `AI影像辨識初判：${cleanFeatures.join('、')}；估計異常範圍約${damageCoverage}%。`,
    actionSuggestion: action || (deru.u >= 3
      ? '建議安排現地複核，確認裂縫、沖刷、淤積或構件劣化範圍，必要時提高巡查頻率並納入維修排序。'
      : '建議維持例行巡查，持續比對後續影像與現況紀錄。'),
    appearanceChecklist,
    structureType: raw.structure_type || raw.structureType || inferInspectionStructureType(facilityName, cleanFeatures),
    severityGrade: raw.severity_grade || raw.severityGrade || inspectionSeverityGrade(baseAnalysis),
    confidenceLabel: raw.confidence_label || raw.confidenceLabel || inspectionConfidenceLabel(confidence),
    reasoning: String(raw.reasoning || raw.reason || suggestion || `照片中可見${cleanFeatures.join('、')}；惟受限於照片角度、遮蔽或解析度，仍建議現場複核。`).trim(),
    recommendations: normalizeInspectionRecommendations(raw.recommendations, action),
    limitations: String(raw.limitations || '本結果僅作為照片判釋初步篩選，不能取代技師、工程人員或現場勘查。').trim()
  };
}

async function analyzeInspectionImageDirectWithOllama({ imageBase64, imageName, facilityName, findings, weather }) {
  const prompt = [
    'You are an engineering inspection vision assistant for Hengliuxi stream facilities (橫流溪). Return strict JSON only, no markdown.',
    `Facility: ${facilityName || 'unknown'}  Weather: ${weather || 'unknown'}  Inspector notes: ${findings || 'none'}`,
    '',
    '=== STRUCTURE TYPE IDENTIFICATION (critical) ===',
    'Stone/concrete slope face along a river or stream = 護岸 (revetment). Even if boulders look natural, a constructed bank protection slope = 護岸.',
    'Gabion/wire-mesh cage filled with stones = 蛇籠／石籠.',
    'Concrete dam across the streambed (with plunge pool or energy dissipator) = 固床工 or 防砂壩.',
    'L-shaped or gravity concrete wall retaining earth = 擋土牆.',
    'When uncertain between 護岸 and 無法判定, ALWAYS choose 護岸 if there is any waterway slope or bank visible.',
    '',
    '=== REVETMENT SCOUR DETECTION ===',
    'For any revetment/bank photo: focus on slope toe at the waterline. Look for: boulders missing at base, voids under stones, exposed foundation, gaps in stone facing, soil loss behind stones.',
    'IMPORTANT: river sediment deposits in the channel (土砂淤積) are NOT the same as slope-toe scour (坡腳淘刷). If you see bank stones with voids or tipping, that is scour.',
    'If toe scour or undercutting is visible: scour=true, damage_coverage≥15, deru_d≥2, deru_e≥2, deru_r≥2.',
    'If foundation/toe stones are clearly exposed near flowing water: deru_d=3, deru_r=3.',
    '',
    '=== CALIBRATED REFERENCE CASE: 防砂壩-淘空.png ===',
    'The user provided a labeled reference photo: the blue outlined area below a check dam / concrete dam shows large undercutting, a void/cavity under the concrete apron or dam base, exposed/unsupported concrete and possible rebar. This damage type is 淘空或淘刷 and the severity is 嚴重級別.',
    'For similar images: structure_type="防砂壩"; appearance_checklist.scour=true; appearance_checklist.backfillLoss=true; appearance_checklist.deformation=true when the slab/base is unsupported; deru_d=4, deru_e=3 or 4 depending on extent, deru_r=4; severity_grade="D"; confidence should be high if the void is clearly visible.',
    'Do not downgrade this pattern to minor erosion or normal sediment. Treat large cavities under dam/apron concrete as function-threatening scour.',
    '',
    '=== CALIBRATED REFERENCE CASE: 固床工-淘空.png ===',
    'The user provided a labeled reference photo: the blue outlined area at a groundsill/bed sill (固床工) shows undercutting/scour under the downstream edge or slab, with a visible cavity below the concrete member. This damage type is 淘空或淘刷 and the severity is 嚴重級別.',
    'For similar images: structure_type="固床工"; appearance_checklist.scour=true; appearance_checklist.backfillLoss=true; appearance_checklist.deformation=true; appearance_checklist.displacement=true if the slab/block appears unsupported or shifted; deru_d=4, deru_e=3 or 4 depending on extent, deru_r=4; severity_grade="D"; confidence should be high if the void under the structure is clearly visible.',
    'Do not treat a visible cavity under the downstream edge of a groundsill as only low-flow exposure. It is function-threatening scour because it may reduce bed stabilization and cause progressive undermining.',
    '',
    '=== CALIBRATED REFERENCE CASE: 固床工-裂隙磨損.jpg ===',
    'The user provided a labeled reference photo: blue outlined areas on a groundsill/bed sill show cracks, joint separation, local edge damage and abrasion/wear on concrete surfaces. This damage type is 裂隙磨損, not necessarily severe scour unless a void under the structure is visible.',
    'For similar images: structure_type="固床工"; appearance_checklist.crack=true; appearance_checklist.abrasion=true; if there is joint separation or edge breakage set deru_d=2 or 3, deru_e=2 or 3 depending on length/extent, deru_r=2 or 3. If cracks are accompanied by undercutting/voids, upgrade to the 固床工-淘空 severe case.',
    'Reason conservatively: mark as needing field verification, measure crack width/length, check whether water seepage or hidden scour exists behind the crack.',
    '',
    '=== SCORING ===',
    'deru_d: 0=none 1=minor 2=moderate 3=severe 4=critical',
    'deru_e: 1=<5% 2=5-25% 3=25-50% 4=>50% of structure affected',
    'deru_r: 1=low 2=monitor 3=function-impaired 4=safety-critical',
    '',
    '=== JSON OUTPUT ===',
    '{"structure_type":"護岸/擋土牆/固床工/防砂壩/排水構造/邊坡保護設施/蛇籠／石籠/砌石構造/其他/無法判定","appearance_checklist":{"good":false,"crack":false,"abrasion":false,"scour":false,"overturn":false,"settlement":false,"deformation":false,"displacement":false,"backfillLoss":false,"decay":false,"fireDamage":false,"frameBreak":false,"poorVegetation":false,"other":false,"otherText":""},"abnormal_regions":0,"damage_coverage":0,"deterioration_features":["具體描述，例：護岸坡腳淘刷/石塊鬆脫/基礎裸露"],"deru_d":0,"deru_e":1,"deru_r":1,"severity_grade":"A","confidence":0.7,"confidence_label":"中","reasoning":"繁體中文2句（描述照片可見內容與判斷依據）","recommendations":["建議1","建議2"],"findings_suggestion":"一句摘要","action_suggestion":"一句建議"}'
  ].join('\n');

  const res = await fetchInspectionJsonWithTimeout('http://localhost:11434/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'gemma4:12b',
      prompt,
      images: [stripInspectionDataUrlImage(imageBase64)],
      stream: false,
      think: false,
      format: 'json',
      options: { temperature: 0.1, top_p: 0.8, num_predict: 520 }
    })
  }, 180000);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Ollama direct HTTP ${res.status}`);
  }
  const raw = parseInspectionJsonObject(data.response || data.message?.content || '');
  return normalizeOllamaVisionInspection(raw, { imageName, facilityName, findings });
}

function buildInspectionAiAnalysis({ facilityName, findings, weather, fileName }) {
  const text = `${facilityName} ${findings} ${weather} ${fileName}`.toLowerCase();
  const features = [];
  let severity = 1;
  let coverage = 6;
  let risk = 1;

  const addFeature = (feature, s, c, r) => {
    features.push(feature);
    severity = Math.max(severity, s);
    coverage = Math.max(coverage, c);
    risk = Math.max(risk, r);
  };

  if (/防砂壩-淘空|防砂壩.*(淘空|淘刷|沖刷|掏空|空洞|懸空|鋼筋外露|基礎外露)|壩基.*(淘空|淘刷|沖刷|懸空|空洞)|check dam.*(scour|undercut|void)/.test(text)) {
    addFeature('防砂壩壩基/下游面嚴重淘空淘刷，混凝土構件疑似懸空或失去支撐', 4, 45, 4);
  }
  if (/固床工-淘空|固床工.*(淘空|淘刷|沖刷|掏空|空洞|懸空|基礎外露|下游側|底部)|床固工.*(淘空|淘刷|空洞|懸空)|groundsill.*(scour|undercut|void)/.test(text)) {
    addFeature('固床工下游側/底部嚴重淘空淘刷，構造物或板塊下方疑似懸空', 4, 38, 4);
  }
  if (/固床工-裂隙磨損|固床工.*(裂隙|裂縫|龜裂|磨損|磨蝕|接縫|破損)|床固工.*(裂隙|裂縫|磨損|磨蝕)|groundsill.*(crack|abrasion|wear|joint)/.test(text)) {
    addFeature('固床工側牆/接縫處裂隙與表面磨損，局部混凝土邊角破損', 2, 18, 2);
  }
  if (/裂|crack|破損|剝落|裸露/.test(text)) addFeature('裂縫/表面破損', 3, 18, 3);
  if (/淘刷|淘空|沖刷|掏空|空洞|坡腳|水際|護岸|revetment|scour|undercut|erosion|washout|基礎|裸露/.test(text)) addFeature('護岸坡腳淘刷/基礎裸露疑慮', 3, 22, 3);
  if (/淤積|堵塞|土砂|sediment|阻塞/.test(text)) addFeature('土砂淤積/通道堵塞', 3, 35, 4);
  if (/鏽|腐朽|耗損|rust|護欄|平臺|平台/.test(text)) addFeature('材料劣化/鏽蝕腐朽', 2, 14, 2);
  if (/豪雨|颱風|暴雨|災後/.test(text)) {
    coverage += 8;
    risk = Math.max(risk, 3);
  }
  if (/魚道|防砂|護岸|固床/.test(text)) risk = Math.max(risk, 2);
  if (!features.length) features.push('未見明顯異常，建議維持定期巡查');

  const d = severity >= 4 ? 4 : severity >= 3 ? 3 : severity >= 2 ? 2 : 1;
  const e = coverage > 50 ? 4 : coverage > 25 ? 3 : coverage > 5 ? 2 : 1;
  const r = risk;
  const deru = DERU_MATRIX.urgency(d, e, r);
  const priority = deru.u >= 4 ? '緊急' : deru.u === 3 ? '高' : deru.u === 2 ? '中' : '低';
  const confidence = currentInspectionAiImage ? 0.82 : 0.68;
  const abnormalRegions = features.length === 1 && features[0].includes('未見') ? 0 : Math.min(4, features.length + (coverage > 25 ? 1 : 0));
  const damageCoverage = Math.min(78, coverage);
  const appearanceChecklist = buildInspectionAppearanceChecklist(features, {}, abnormalRegions === 0);
  const baseAnalysis = { deru: { d, e, r, u: deru.u }, damageCoverage, abnormalRegions };
  const structureType = inferInspectionStructureType(facilityName, features);
  const severityGrade = inspectionSeverityGrade(baseAnalysis);

  return {
    version: 'AI-Vision-Assist-1.0',
    analysedAt: new Date().toISOString(),
    imageName: fileName || '未指定影像',
    abnormalRegions,
    damageCoverage,
    deteriorationFeatures: features,
    confidence,
    priority,
    deru: { d, e, r, u: deru.u, score: Number(deru.score.toFixed(2)), label: deru.label },
    findingsSuggestion: `AI影像輔助判讀：${features.join('、')}；估計異常範圍約${damageCoverage}%，建議列為${priority}優先度。`,
    actionSuggestion: priority === '緊急'
      ? '建議立即安排現地複查、量測損壞範圍，必要時先行封閉或臨時導排，並排入搶修。'
      : priority === '高'
        ? '建議加密巡查，補拍同角度照片，比對劣化趨勢並安排修復評估。'
        : '建議納入後續巡查追蹤，維持照片紀錄與例行維護。',
    appearanceChecklist,
    structureType,
    severityGrade,
    confidenceLabel: inspectionConfidenceLabel(confidence),
    reasoning: abnormalRegions > 0
      ? `照片中可見或疑似${features.join('、')}，研判可能對應外觀檢視異常項目；惟受限於照片角度、遮蔽或解析度，仍建議現場複核。`
      : '照片中未見明顯結構異常；惟照片判釋仍受角度、遮蔽或解析度限制，建議依例行巡查追蹤。',
    recommendations: priority === '高' || priority === '緊急'
      ? ['補拍異常位置近照與上下游方向照片', '現場量測淘刷、裂縫、沉陷或位移範圍', '確認構造物是否仍具導流、防沖或支撐功能']
      : ['維持例行巡查與同角度照片比對', '必要時補拍基礎或牆腳位置'],
    limitations: '本結果僅作為照片判釋初步篩選，不能取代技師、工程人員或現場勘查。'
  };
}

function renderInspectionAppearanceReport(analysis) {
  if (!analysis) return '';
  const features = Array.isArray(analysis.deteriorationFeatures) ? analysis.deteriorationFeatures : [];
  const checklist = analysis.appearanceChecklist || buildInspectionAppearanceChecklist(features, {}, Number(analysis.abnormalRegions || 0) === 0);
  const grade = analysis.severityGrade || inspectionSeverityGrade(analysis);
  const confidenceLabel = analysis.confidenceLabel || inspectionConfidenceLabel(analysis.confidence);
  const recommendations = normalizeInspectionRecommendations(analysis.recommendations, analysis.actionSuggestion);
  const structureType = analysis.structureType || inferInspectionStructureType(analysis.facilityName || '', features);
  const reasoning = analysis.reasoning || (
    Number(analysis.abnormalRegions || 0) > 0
      ? `照片中可見或疑似${features.map(inspectionEscape).join('、')}，研判可能對應外觀檢視異常項目；惟受限於照片角度、遮蔽或解析度，仍建議現場複核。`
      : '照片中未見明顯結構異常；惟照片判釋仍受角度、遮蔽或解析度限制，建議依例行巡查追蹤。'
  );
  const gradeReason = {
    A: '照片判釋未見明顯異常，建議維持例行巡查。',
    B: '照片判釋有輕微或局部異常，建議例行追蹤並保存同角度照片。',
    C: '照片判釋已有明顯異常跡象，建議列入現場複查並量測範圍。',
    D: '照片判釋疑似已影響構造物功能或支撐條件，建議優先安排現場複查。'
  }[grade] || '照片資訊不足，建議現場複核。';
  const checklistHtml = INSPECTION_APPEARANCE_ITEMS.map(item => {
    const checked = checklist[item.key] ? '■' : '□';
    const label = item.key === 'other'
      ? `其他：${inspectionEscape(checklist.otherText || '＿＿＿＿＿＿')}`
      : inspectionEscape(inspectionAppearanceLabel(item));
    return `<div>${checked} ${label}</div>`;
  }).join('');

  return `
    <div style="margin-top:12px;background:#fff;border:1px solid #cbd5e1;border-radius:8px;padding:12px;font-size:13px;line-height:1.55;color:#334155">
      <div style="display:flex;justify-content:space-between;gap:10px;align-items:flex-start;margin-bottom:8px">
        <div style="font-weight:700;color:#0f172a">構造物類型：${inspectionEscape(structureType)}</div>
        <div style="display:flex;gap:6px;align-items:center">
          <span class="badge badge-${grade === 'D' ? 'danger' : grade === 'C' ? 'warning' : grade === 'B' ? 'info' : 'success'}">${inspectionEscape(inspectionSeverityLabel(grade))}</span>
          <span class="badge badge-primary">信心：${inspectionEscape(confidenceLabel)}</span>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:12px;margin-bottom:10px">
        <div>
          <div style="font-weight:700;color:#1565c0;margin-bottom:5px">外觀檢視勾選</div>
          <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:3px 10px">${checklistHtml}</div>
        </div>
        <div>
          <div style="font-weight:700;color:#1565c0;margin-bottom:5px">後續建議</div>
          <ul style="margin:0;padding-left:18px">${recommendations.map(item => `<li>${inspectionEscape(item)}</li>`).join('')}</ul>
          <div style="margin-top:8px;font-size:12px;color:#64748b">${inspectionEscape(reasoning)}</div>
        </div>
      </div>
    </div>
  `;
}

function renderInspectionAppearanceChecklistPanel(analysis) {
  if (!analysis) return '';
  const features = Array.isArray(analysis.deteriorationFeatures) ? analysis.deteriorationFeatures : [];
  const checklist = analysis.appearanceChecklist || buildInspectionAppearanceChecklist(features, {}, Number(analysis.abnormalRegions || 0) === 0);
  const checkedItems = INSPECTION_APPEARANCE_ITEMS
    .filter(item => item.key !== 'good' && checklist[item.key])
    .map(item => inspectionAppearanceLabel(item));
  const structureType = analysis.structureType || inferInspectionStructureType(analysis.facilityName || '', features);
  const grade = analysis.severityGrade || inspectionSeverityGrade(analysis);
  const confidenceLabel = analysis.confidenceLabel || inspectionConfidenceLabel(analysis.confidence);
  const recommendations = normalizeInspectionRecommendations(analysis.recommendations, analysis.actionSuggestion).slice(0, 3);

  return `
    <div style="margin-top:12px;background:#fff;border:1px solid #bfdbfe;border-radius:8px;padding:12px">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:10px">
        <div style="font-weight:800;color:#0f172a">構造物類型：${inspectionEscape(structureType || '無法判定')}</div>
        <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap">
          <span class="badge badge-${grade === 'D' ? 'danger' : grade === 'C' ? 'warning' : grade === 'B' ? 'info' : 'success'}">${inspectionEscape(inspectionSeverityLabel(grade))}</span>
          <span class="badge badge-success">信心：${inspectionEscape(confidenceLabel)}</span>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:14px">
        <div>
          <div style="font-size:12px;color:#1565c0;font-weight:800;margin-bottom:8px">外觀檢視勾選</div>
          <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:5px 12px;font-size:12px;color:#334155">
            ${INSPECTION_APPEARANCE_ITEMS.map(item => {
              const checked = !!checklist[item.key];
              const label = item.key === 'other' && checklist.otherText
                ? `${inspectionAppearanceLabel(item)}：${inspectionEscape(checklist.otherText)}`
                : inspectionAppearanceLabel(item);
              return `<label style="display:flex;align-items:center;gap:5px;min-width:0">
                <input type="checkbox" ${checked ? 'checked' : ''} disabled style="margin:0">
                <span style="${checked ? 'font-weight:800;color:#0f172a' : 'color:#64748b'}">${inspectionEscape(label)}</span>
              </label>`;
            }).join('')}
          </div>
        </div>
        <div>
          <div style="font-size:12px;color:#1565c0;font-weight:800;margin-bottom:8px">後續建議</div>
          <ul style="margin:0;padding-left:18px;font-size:12px;line-height:1.7;color:#334155">
            ${(recommendations.length ? recommendations : ['維持例行巡查，並以前後角度照片比對劣化變化。'])
              .map(item => `<li>${inspectionEscape(item)}</li>`).join('')}
          </ul>
          <div style="font-size:12px;color:#64748b;line-height:1.6;margin-top:8px">
            已勾選：${inspectionEscape(checkedItems.length ? checkedItems.join('、') : '未見明顯異常')}
          </div>
        </div>
      </div>
    </div>
  `;
}

function inspectionAppearanceSnapshotFromAnalysis(analysis) {
  if (!analysis) return null;
  const features = Array.isArray(analysis.deteriorationFeatures) ? analysis.deteriorationFeatures : [];
  const checklist = analysis.appearanceChecklist || buildInspectionAppearanceChecklist(features, {}, Number(analysis.abnormalRegions || 0) === 0);
  const recommendations = normalizeInspectionRecommendations(analysis.recommendations, analysis.actionSuggestion);
  const structureType = analysis.structureType || inferInspectionStructureType(analysis.facilityName || '', features);
  const severityGrade = analysis.severityGrade || inspectionSeverityGrade(analysis);
  const confidenceLabel = analysis.confidenceLabel || inspectionConfidenceLabel(analysis.confidence);
  const reasoning = analysis.reasoning || (
    Number(analysis.abnormalRegions || 0) > 0
      ? `照片中可見或疑似${features.join('、')}，研判可能對應外觀檢視異常項目；惟受限於照片角度、遮蔽或解析度，仍建議現場複核。`
      : '照片中未見明顯結構異常；惟照片判釋仍受角度、遮蔽或解析度限制，建議依例行巡查追蹤。'
  );
  return {
    structureType,
    appearanceChecklist: checklist,
    appearanceRecommendations: recommendations,
    appearanceReasoning: reasoning,
    appearanceSeverityGrade: severityGrade,
    appearanceSeverityLabel: inspectionSeverityLabel(severityGrade),
    appearanceConfidenceLabel: confidenceLabel,
    appearanceUpdatedAt: new Date().toISOString()
  };
}

function persistInspectionAiAssessment(id) {
  const item = DB.getById('inspections', id);
  if (!item || !item.aiImageAnalysis) {
    showToast('此筆巡查尚無可儲存的AI評估結果', 'warning');
    return;
  }
  const snapshot = inspectionAppearanceSnapshotFromAnalysis(item.aiImageAnalysis);
  const deru = item.aiImageAnalysis.deru || {};
  const updates = {
    ...snapshot,
    findings: item.findings || item.aiImageAnalysis.findingsSuggestion || '',
    action: item.action || item.aiImageAnalysis.actionSuggestion || '',
    deru_d: Number.isFinite(Number(deru.d)) ? Number(deru.d) : item.deru_d,
    deru_e: Number.isFinite(Number(deru.e)) ? Number(deru.e) : item.deru_e,
    deru_r: Number.isFinite(Number(deru.r)) ? Number(deru.r) : item.deru_r,
    deru_u: Number.isFinite(Number(deru.u)) ? Number(deru.u) : item.deru_u,
    deru_score: Number.isFinite(Number(deru.score)) ? Number(deru.score) : item.deru_score,
    deru_label: deru.label || item.deru_label,
    priority: item.aiImageAnalysis.priority || item.priority,
    sourceType: item.sourceType || '巡查紀錄'
  };
  DB.update('inspections', id, updates);
  showToast('AI評估結果已存入巡查紀錄', 'success');
  viewInspection(id);
  if (typeof loadInspectionTable === 'function') loadInspectionTable();
}

function renderInspectionStoredAppearance(item) {
  const snapshot = item.appearanceChecklist ? item : inspectionAppearanceSnapshotFromAnalysis(item.aiImageAnalysis);
  if (!snapshot) return '';
  const checklist = snapshot.appearanceChecklist || {};
  const recommendations = Array.isArray(snapshot.appearanceRecommendations)
    ? snapshot.appearanceRecommendations
    : normalizeInspectionRecommendations(snapshot.appearanceRecommendations, item.action);
  const checkedItems = INSPECTION_APPEARANCE_ITEMS
    .filter(entry => checklist[entry.key])
    .map(entry => entry.key === 'other'
      ? `其他：${checklist.otherText || '需補充'}`
      : inspectionAppearanceLabel(entry));
  return `
    <div style="border-top:2px solid #0f766e;padding-top:12px">
      <div style="font-weight:800;color:#0f766e;margin-bottom:8px">構造物外觀檢視及後續建議</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <div style="background:#f8fafc;border:1px solid #d1fae5;border-radius:8px;padding:10px">
          <div style="font-size:12px;color:#64748b;margin-bottom:6px">外觀檢視勾選</div>
          <div style="font-size:13px;line-height:1.65;color:#334155">
            <b>構造物類型：</b>${inspectionEscape(snapshot.structureType || item.structureType || '未判定')}<br>
            <b>初判等級：</b>${inspectionEscape(snapshot.appearanceSeverityLabel || inspectionSeverityLabel(snapshot.appearanceSeverityGrade || 'A'))}<br>
            <b>勾選項目：</b>${inspectionEscape(checkedItems.length ? checkedItems.join('、') : '未見明顯異常')}
          </div>
        </div>
        <div style="background:#fff;border:1px solid #d1fae5;border-radius:8px;padding:10px">
          <div style="font-size:12px;color:#64748b;margin-bottom:6px">後續建議</div>
          <ul style="margin:0;padding-left:18px;font-size:13px;line-height:1.65;color:#334155">
            ${(recommendations.length ? recommendations : ['維持例行巡查與照片紀錄']).map(text => `<li>${inspectionEscape(text)}</li>`).join('')}
          </ul>
        </div>
      </div>
      ${snapshot.appearanceReasoning ? `<div style="font-size:12px;color:#64748b;line-height:1.6;margin-top:8px">${inspectionEscape(snapshot.appearanceReasoning)}</div>` : ''}
    </div>
  `;
}

function inspectionAppearanceTableSummary(item) {
  const snapshot = item.appearanceChecklist ? item : inspectionAppearanceSnapshotFromAnalysis(item.aiImageAnalysis);
  if (!snapshot) return '-';
  const checklist = snapshot.appearanceChecklist || {};
  const checkedItems = INSPECTION_APPEARANCE_ITEMS
    .filter(entry => checklist[entry.key])
    .map(entry => inspectionAppearanceLabel(entry));
  const grade = snapshot.appearanceSeverityLabel || inspectionSeverityLabel(snapshot.appearanceSeverityGrade || 'A');
  return `${snapshot.structureType || item.structureType || '未判定'}｜${grade}｜${checkedItems.length ? checkedItems.join('、') : '未見明顯異常'}`;
}

function inspectionRecommendationTableSummary(item) {
  const snapshot = item.appearanceRecommendations ? item : inspectionAppearanceSnapshotFromAnalysis(item.aiImageAnalysis);
  const recommendations = Array.isArray(snapshot?.appearanceRecommendations)
    ? snapshot.appearanceRecommendations
    : normalizeInspectionRecommendations(snapshot?.appearanceRecommendations, item.action);
  return recommendations.length ? recommendations.join('；') : (item.action || '-');
}

function renderInspectionAiAnalysis(analysis) {
  const el = document.getElementById('ins_ai_result');
  if (!el) return;
  if (analysis?.loading) {
    el.innerHTML = `
      <div style="height:100%;min-height:210px;border:1px solid #bfdbfe;border-radius:8px;background:#eff6ff;padding:14px;display:flex;flex-direction:column;align-items:center;justify-content:center;color:#1d4ed8;text-align:center;line-height:1.6">
        <i class="fas fa-spinner fa-spin" style="font-size:22px;margin-bottom:8px"></i>
        正在呼叫 Ollama vision 模型分析巡查影像...
        <div style="font-size:12px;color:#64748b;margin-top:4px">此流程為即時推論，不會訓練或更新模型參數。</div>
      </div>
    `;
    return;
  }
  if (!analysis) {
    el.innerHTML = `
      <div style="height:100%;min-height:210px;border:1px solid #e2e8f0;border-radius:8px;background:#fff;padding:14px;display:flex;align-items:center;justify-content:center;color:#64748b;text-align:center;line-height:1.6">
        請先匯入巡查影像，或直接點選「執行AI分析」依設施名稱與文字紀錄產生輔助評分。
      </div>
    `;
    return;
  }

  el.innerHTML = `
    <div style="border:1px solid #dbeafe;border-radius:8px;background:#eff6ff;padding:14px">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:12px">
        <div style="font-weight:800;color:#1e3a8a">AI輔助判讀結果</div>
        <div style="display:flex;gap:6px;align-items:center">
          <span class="badge badge-primary">${analysis.provider === 'ollama' ? 'Ollama vision' : '本機備援'}</span>
          <span class="badge badge-primary">${Math.round(analysis.confidence * 100)}% 信心</span>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:12px">
        ${inspectionAiScoreBox('異常區域', `${analysis.abnormalRegions} 處`)}
        ${inspectionAiScoreBox('損壞範圍', `${analysis.damageCoverage}%`)}
        ${inspectionAiScoreBox('建議D/E/R', `D${analysis.deru.d}/E${analysis.deru.e}/R${analysis.deru.r}`)}
        ${inspectionAiScoreBox('優先度', analysis.priority)}
      </div>
      <div style="font-size:13px;line-height:1.6;color:#334155">
        <b>劣化特徵：</b>${analysis.deteriorationFeatures.map(inspectionEscape).join('、')}<br>
        <b>處置建議：</b>${inspectionEscape(analysis.actionSuggestion)}<br>
        <b>推論模式：</b>${analysis.inferenceMode === 'ollama_vision_realtime' ? 'Ollama vision 即時影像推論' : '本機規則輔助評分'}
      </div>
      ${renderInspectionAppearanceChecklistPanel(analysis)}
      ${renderInspectionAppearanceReport(analysis)}
    </div>
  `;
}

function inspectionAiScoreBox(label, value) {
  return `
    <div style="background:#fff;border:1px solid #bfdbfe;border-radius:8px;padding:10px;text-align:center">
      <div style="font-size:11px;color:#64748b;font-weight:700">${label}</div>
      <div style="font-size:18px;font-weight:800;color:#1d4ed8;margin-top:2px">${value}</div>
    </div>
  `;
}

const DERU_MATRIX = {
  urgency(d, e, r) {
    const score = d * 0.4 + e * 0.25 + r * 0.35;
    if (d === 0) return { u: 1, label: 'U1 定期巡查', color: '#2e7d32', bg: '#e8f5e9', score: 0 };
    if (score <= 1.5) return { u: 1, label: 'U1 定期巡查', color: '#2e7d32', bg: '#e8f5e9', score };
    if (score <= 2.5) return { u: 2, label: 'U2 追蹤觀察', color: '#f57f17', bg: '#fff8e1', score };
    if (score <= 3.2) return { u: 3, label: 'U3 優先維護', color: '#e65100', bg: '#fff3e0', score };
    return { u: 4, label: 'U4 緊急處置', color: '#b71c1c', bg: '#ffebee', score };
  }
};

function derCalc() {
  const d = parseInt(document.getElementById('ins_d')?.value || 0);
  const e = parseInt(document.getElementById('ins_e')?.value || 1);
  const r = parseInt(document.getElementById('ins_r')?.value || 1);
  const result = DERU_MATRIX.urgency(d, e, r);
  const el = document.getElementById('deru_result');
  const scoreEl = document.getElementById('deru_score_display');
  if (el) {
    el.textContent = result.label;
    el.style.color = result.color;
    el.style.background = result.bg;
    el.style.borderColor = result.color;
  }
  if (scoreEl) scoreEl.textContent = `分數：${result.score.toFixed(2)}`;
}

function saveInspection(id) {
  const facilityEl = document.getElementById('ins_facility');
  const facilityId = parseInt(facilityEl.value);
  const facilityName = facilityEl.options[facilityEl.selectedIndex]?.dataset?.name || '';
  const findings = document.getElementById('ins_findings').value.trim();
  if (!facilityId || !findings) {
    showToast('請選擇設施並填寫發現事項', 'error');
    return;
  }

  const d = parseInt(document.getElementById('ins_d')?.value || 0);
  const e = parseInt(document.getElementById('ins_e')?.value || 1);
  const r = parseInt(document.getElementById('ins_r')?.value || 1);
  const deru = DERU_MATRIX.urgency(d, e, r);
  const existing = id ? DB.getById('inspections', id) || {} : {};
  const imagePhotos = currentInspectionAiImage
    ? [currentInspectionAiImage.name]
    : (existing.photos || []);
  const imageDataUrls = currentInspectionAiImageDataUrl
    ? [currentInspectionAiImageDataUrl]
    : (existing.photoDataUrls || []);

  const item = {
    facilityId,
    facilityName,
    findings,
    date: document.getElementById('ins_date').value,
    maintenanceStart: document.getElementById('ins_maintenanceStart')?.value || document.getElementById('ins_date').value,
    expectedCompletion: document.getElementById('ins_expectedCompletion')?.value || '',
    completedAt: document.getElementById('ins_completedAt')?.value || '',
    inspector: document.getElementById('ins_inspector').value.trim(),
    weather: document.getElementById('ins_weather').value,
    priority: deru.u >= 4 ? '緊急' : deru.u === 3 ? '高' : deru.u === 2 ? '中' : document.getElementById('ins_priority').value,
    status: document.getElementById('ins_status').value,
    action: document.getElementById('ins_action').value.trim(),
    deru_d: d,
    deru_e: e,
    deru_r: r,
    deru_u: deru.u,
    deru_label: deru.label,
    deru_score: Number(deru.score.toFixed(2)),
    aiImageAnalysis: currentInspectionAiAnalysis,
    aiImageName: currentInspectionAiImage?.name || currentInspectionAiAnalysis?.imageName || existing.aiImageName || '',
    photos: imagePhotos,
    photoDataUrls: imageDataUrls,
    ...(currentInspectionAiAnalysis ? inspectionAppearanceSnapshotFromAnalysis(currentInspectionAiAnalysis) : {
      structureType: existing.structureType,
      appearanceChecklist: existing.appearanceChecklist,
      appearanceRecommendations: existing.appearanceRecommendations,
      appearanceReasoning: existing.appearanceReasoning,
      appearanceSeverityGrade: existing.appearanceSeverityGrade,
      appearanceSeverityLabel: existing.appearanceSeverityLabel,
      appearanceConfidenceLabel: existing.appearanceConfidenceLabel,
      appearanceUpdatedAt: existing.appearanceUpdatedAt
    })
  };

  const savedItem = id
    ? DB.update('inspections', id, item)
    : DB.insert('inspections', item);
  syncInspectionRecordToFacility(savedItem || item);

  if (id) {
    showToast('巡查紀錄已更新', 'success');
  } else {
    showToast('巡查紀錄已新增', 'success');
  }
  closeModal();
  if (window._facAfterInspectionSave) {
    const cb = window._facAfterInspectionSave;
    window._facAfterInspectionSave = null;
    setTimeout(cb, 80);
  } else {
    renderInspection();
  }
}

function renderInspectionLinkedPhotos(item) {
  const photos = [];
  (item.photoDataUrls || []).forEach(src => photos.push({ src, label: '巡查照片' }));
  (item.photos || []).forEach(src => {
    if (!src) return;
    photos.push(/^data:image\//.test(src) || /^\/|^https?:\/\//.test(src)
      ? { src, label: '巡查照片' }
      : { src: null, label: src });
  });
  const facility = DB.getById('facilities', item.facilityId);
  (facility?.photos || []).slice(0, 3).forEach(src => photos.push({ src, label: '設施照片' }));
  if (!photos.length) return '';
  return `
    <div>
      <div class="text-muted" style="margin-bottom:6px">連動照片</div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:10px">
        ${photos.slice(0, 4).map(photo => photo.src
          ? `<div style="border:1px solid #cbd5e1;border-radius:8px;background:#f8fafc;padding:6px">
               <img src="${inspectionEscape(photo.src)}" alt="${inspectionEscape(photo.label)}" style="width:100%;height:150px;object-fit:contain;border-radius:6px;background:#fff;display:block">
               <div style="font-size:11px;color:#64748b;margin-top:4px">${inspectionEscape(photo.label)}</div>
             </div>`
          : `<span class="badge badge-default">${inspectionEscape(photo.label)}</span>`
        ).join('')}
      </div>
    </div>
  `;
}

function inspectionExpectedCompletion(item) {
  if (item.completedAt || item.completionDate) return item.completedAt || item.completionDate;
  if (item.expectedCompletion) return `${item.expectedCompletion}（預計）`;
  const status = getInspectionStatus(item);
  if (status === '完成') return item.date || '-';
  const priority = getInspectionPriority(item);
  const base = item.maintenanceStart || item.date;
  const date = base ? new Date(base) : new Date();
  if (Number.isNaN(date.getTime())) return '-';
  const days = priority === '緊急' ? 7 : priority === '高' ? 14 : priority === '中' ? 30 : 90;
  date.setDate(date.getDate() + days);
  return `${date.toISOString().slice(0, 10)}（預計）`;
}

function viewInspection(id) {
  const item = DB.getById('inspections', id);
  if (!item) return;
  item.facilityName = item.facilityName || item.facility_name || '-';
  item.facilityId = item.facilityId || item.facility_id || null;
  item.findings = item.findings || item.notes || (item.type === 'deru_assessment' ? 'DER&U 工程設施評估紀錄' : '');
  const priority = getInspectionPriority(item);
  const status = getInspectionStatus(item);

  document.getElementById('modalTitle').textContent = `巡查紀錄 - ${item.facilityName}`;
  document.getElementById('modalBody').innerHTML = `
    <div style="display:grid;gap:12px">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        ${[
          ['設施名稱', item.facilityName],
          ['巡查日期', item.date || '-'],
          ['巡查人員', item.inspector || '-'],
          ['天氣', item.weather || '-'],
          ['優先度', `<span class="badge badge-${inspectionPriorityClass(priority)}">${priority}</span>`],
          ['處理狀態', `<span class="badge badge-${inspectionStatusClass(status)}">${status}</span>`],
          ['維護開始時間', item.maintenanceStart || item.date || '-'],
          ['預計/完成時間', inspectionExpectedCompletion(item)],
          ['資料歸類', inspectionDataClass(item) === 'maintenance' ? (item.maintenanceType || '維護管理資料') : inspectionRecordTypeLabel(inspectionRecordType(item))]
        ].map(([k, v]) => `<div><div class="text-muted" style="margin-bottom:4px">${k}</div><div class="fw-600">${v}</div></div>`).join('')}
      </div>
      <div><div class="text-muted" style="margin-bottom:4px">發現事項</div><div style="padding:10px;background:var(--surface2);border-radius:6px">${inspectionEscape(item.findings)}</div></div>
      ${item.action ? `<div><div class="text-muted" style="margin-bottom:4px">處理建議</div><div style="padding:10px;background:var(--surface2);border-radius:6px">${inspectionEscape(item.action)}</div></div>` : ''}
      ${renderInspectionLinkedPhotos(item)}
      ${renderInspectionStoredAppearance(item)}
      ${renderInspectionAiDetail(item.aiImageAnalysis)}
      ${(item.deru_d !== undefined) ? renderInspectionDeruDetail(item) : ''}
    </div>
  `;
  document.getElementById('modalFooter').innerHTML = `
    <button class="btn btn-outline" onclick="closeModal()">關閉</button>
    <button class="btn btn-outline" onclick="closeModal();navigateTo('facilities');viewFacility(${item.facilityId})"><i class="fas fa-hard-hat"></i> 查看工程設施連動分析</button>
    ${item.aiImageAnalysis ? `<button class="btn btn-primary" onclick="persistInspectionAiAssessment(${id})"><i class="fas fa-save"></i> 儲存AI評估結果</button>` : ''}
    <button class="btn btn-outline" onclick="openInspectionReclassificationForm(${id})" style="color:#7c3aed;border-color:#ddd6fe;background:#faf5ff"><i class="fas fa-random"></i> 重新歸類</button>
    <button class="btn btn-primary" onclick="closeModal();openInspectionForm(${id})"><i class="fas fa-edit"></i> 編輯</button>
  `;
  openModal();
}

function renderInspectionAiDetail(analysis) {
  if (!analysis) return '';
  return `
    <div style="border-top:2px solid #1565c0;padding-top:12px">
      <div style="font-weight:700;color:#1565c0;margin-bottom:8px">AI影像辨識與外觀檢視輔助評分</div>
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:10px">
        ${inspectionAiScoreBox('異常區域', `${analysis.abnormalRegions} 處`)}
        ${inspectionAiScoreBox('損壞範圍', `${analysis.damageCoverage}%`)}
        ${inspectionAiScoreBox('信心分數', `${Math.round(analysis.confidence * 100)}%`)}
        ${inspectionAiScoreBox('AI優先度', analysis.priority)}
      </div>
      <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:10px;font-size:13px;line-height:1.6">
        <b>模型來源：</b>${analysis.provider === 'ollama' ? `Ollama vision（${inspectionEscape(analysis.model || '')}）` : '本機規則備援'}<br>
        <b>劣化特徵：</b>${analysis.deteriorationFeatures.map(inspectionEscape).join('、')}<br>
        <b>模型限制：</b>AI結果為輔助判讀，仍需巡查人員依現地狀況覆核。
      </div>
      ${renderInspectionAppearanceReport(analysis)}
    </div>
  `;
}

function renderInspectionDeruDetail(item) {
  const deru = DERU_MATRIX.urgency(item.deru_d, item.deru_e, item.deru_r);
  return `
    <div style="border-top:2px solid var(--primary);padding-top:12px">
      <div style="font-weight:700;color:var(--primary);margin-bottom:8px">DER&U 評分結果</div>
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;text-align:center">
        <div style="padding:8px;background:#f8fafc;border-radius:6px;border:1px solid #e2e8f0"><div style="font-size:11px;color:#64748b">D 損壞程度</div><div style="font-weight:700;font-size:18px;color:var(--primary)">D${item.deru_d}</div></div>
        <div style="padding:8px;background:#f8fafc;border-radius:6px;border:1px solid #e2e8f0"><div style="font-size:11px;color:#64748b">E 損壞範圍</div><div style="font-weight:700;font-size:18px;color:var(--primary)">E${item.deru_e}</div></div>
        <div style="padding:8px;background:#f8fafc;border-radius:6px;border:1px solid #e2e8f0"><div style="font-size:11px;color:#64748b">R 風險影響</div><div style="font-weight:700;font-size:18px;color:var(--primary)">R${item.deru_r}</div></div>
        <div style="padding:8px;border-radius:6px;border:2px solid ${deru.color};background:${deru.bg}"><div style="font-size:11px;color:#64748b">U 急迫性</div><div style="font-weight:700;font-size:13px;color:${deru.color}">${deru.label}</div></div>
      </div>
    </div>
  `;
}

function deleteInspection(id) {
  const item = DB.getById('inspections', id);
  if (!confirm(`確定要刪除「${item?.facilityName || ''}」的巡查紀錄嗎？`)) return;
  const facilityId = item?.facilityId;
  DB.delete('inspections', id);
  // 刪除後重新同步所屬設施的最新巡查日期與評估狀態
  if (facilityId && typeof fac_syncLatestProfessionalAssessment === 'function') {
    const fac = DB.getById('facilities', Number(facilityId));
    if (fac) fac_syncLatestProfessionalAssessment(fac);
  }
  showToast('巡查紀錄已刪除', 'info');
  renderInspection();
}

/* ── 工程開口合約統計 ───────────────────────────────────────────── */

function renderContractStatsSection() {
  return `
    <div class="card" style="margin-bottom:16px">
      <div class="card-header" style="flex-wrap:wrap;gap:8px">
        <span class="card-title" style="font-size:18px"><i class="fas fa-file-contract"></i> 工程開口合約統計</span>
        <span style="font-size:13px;color:#64748b">來源：01_工程設施維護與資料 ／ 工程維護開口 ／ 監工日報表</span>
      </div>
      <div class="card-body" style="padding:16px">
        <div id="contractStatsArea">
          <div style="padding:24px;text-align:center;color:#64748b;font-size:15px">
            <i class="fas fa-spinner fa-spin" style="font-size:24px;margin-bottom:10px;display:block"></i>
            正在載入合約統計資料…
          </div>
        </div>
      </div>
    </div>
  `;
}

function _contractYearColor(yearAd) {
  const palette = {
    2021: { bg: '#eff6ff', border: '#bfdbfe', text: '#1e3a8a', badge: '#1565c0' },
    2022: { bg: '#f0fdf4', border: '#bbf7d0', text: '#14532d', badge: '#16a34a' },
    2023: { bg: '#fff7ed', border: '#fed7aa', text: '#7c2d12', badge: '#ea580c' },
    2024: { bg: '#fdf4ff', border: '#e9d5ff', text: '#581c87', badge: '#7c3aed' },
    2025: { bg: '#fefce8', border: '#fde68a', text: '#713f12', badge: '#d97706' },
    2026: { bg: '#f0fdfa', border: '#99f6e4', text: '#134e4a', badge: '#0f766e' },
  };
  return palette[yearAd] || { bg: '#f8fafc', border: '#e2e8f0', text: '#1e293b', badge: '#475569' };
}

function _fmtAmount(n) {
  if (n >= 1e4) return Math.round(n / 1e4).toLocaleString('zh-TW') + ' 萬';
  return n.toLocaleString('zh-TW');
}

async function loadContractStats() {
  const el = document.getElementById('contractStatsArea');
  if (!el) return;
  try {
    const res = await fetch('/webapp/data/maintenance_contracts.json', { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    el.innerHTML = _renderContractStats(data);
  } catch (err) {
    el.innerHTML = `<div style="padding:16px;color:#ef4444;font-size:14px"><i class="fas fa-exclamation-circle"></i> 無法載入合約統計：${inspectionEscape(err.message || err)}</div>`;
  }
}

function contractCardToggle(id) {
  const el = document.getElementById(id);
  if (!el) return;
  const open = el.style.display !== 'none';
  el.style.display = open ? 'none' : 'block';
  const arrow = document.getElementById(id + '_arrow');
  if (arrow) arrow.style.transform = open ? '' : 'rotate(180deg)';
}

function _renderContractStats(data) {
  const { projects, item_summary, total_contract_amount, total_projects, total_reports } = data;

  // 摘要統計卡（大字）
  const summaryCards = [
    { icon: 'fa-folder-open', label: '工程件數',   value: total_projects + ' 件', color: '#1565c0' },
    { icon: 'fa-file-alt',    label: '日報份數',   value: total_reports  + ' 份', color: '#16a34a' },
    { icon: 'fa-coins',       label: '累計契約金額', value: (total_contract_amount / 1e4).toFixed(0) + ' 萬元', color: '#d97706' },
  ].map(c => `
    <div style="flex:1;min-width:160px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:14px;padding:24px 20px;text-align:center">
      <i class="fas ${c.icon}" style="font-size:40px;color:${c.color};margin-bottom:12px;display:block"></i>
      <div style="font-size:42px;font-weight:900;color:${c.color};line-height:1.1">${c.value}</div>
      <div style="font-size:20px;color:#64748b;margin-top:8px">${c.label}</div>
    </div>
  `).join('');

  // 各工程卡片（折疊式）
  const projectCards = projects.map((p, idx) => {
    const col = _contractYearColor(p.year_ad);
    const detailId = 'contract_detail_' + idx;
    const na = p.notes_analysis || {};
    const wDays = na.work_days || 0;
    const sDays = na.stop_days || 0;
    const totalDays = wDays + sDays || 1;
    const workPct = Math.round(wDays / totalDays * 100);

    // 摘要標籤（折疊時可見）
    const themes = (na.work_themes || []).filter(t => t.name !== '雨天停工').slice(0, 4);
    const summaryPills = themes.map(t =>
      `<span style="display:inline-flex;align-items:center;gap:5px;background:${t.color}18;color:${t.color};border:1px solid ${t.color}33;border-radius:6px;padding:4px 10px;font-size:15px;font-weight:700">
        <i class="fas ${t.icon}"></i>${inspectionEscape(t.name)}</span>`
    ).join('');

    // 展開後的工作內容分類
    const catRows = (p.work_categories || []).map(cat => `
      <div style="display:flex;align-items:flex-start;gap:10px;padding:10px 0;border-bottom:1px solid ${col.border}">
        <span style="background:${cat.color}18;color:${cat.color};border-radius:8px;padding:5px 9px;font-size:18px;min-width:36px;text-align:center;flex-shrink:0">
          <i class="fas ${cat.icon}"></i>
        </span>
        <div>
          <div style="font-size:18px;font-weight:700;color:#1e293b;margin-bottom:2px">${inspectionEscape(cat.name)}</div>
          <div style="font-size:16px;color:#475569">${inspectionEscape(cat.detail)}</div>
        </div>
      </div>`).join('');

    // 施工日統計橫條
    const dayBar = `
      <div style="margin:14px 0">
        <div style="display:flex;justify-content:space-between;font-size:16px;color:#64748b;margin-bottom:5px">
          <span><i class="fas fa-calendar-check" style="color:#16a34a;margin-right:5px"></i>施工 <b style="color:#16a34a">${wDays}</b> 日</span>
          <span><i class="fas fa-cloud-rain" style="color:#94a3b8;margin-right:5px"></i>停工 <b style="color:#94a3b8">${sDays}</b> 日</span>
        </div>
        <div style="height:8px;background:#e2e8f0;border-radius:4px;overflow:hidden">
          <div style="height:100%;width:${workPct}%;background:#16a34a;border-radius:4px"></div>
        </div>
      </div>`;

    // 重點施工紀錄
    const keyNoteRows = (na.key_notes || []).slice(0, 3).map(n => `
      <div style="display:flex;gap:8px;padding:7px 0;border-bottom:1px solid ${col.border}">
        <span style="background:${col.badge}20;color:${col.badge};border-radius:5px;padding:2px 7px;font-size:13px;white-space:nowrap;flex-shrink:0">${n.date}</span>
        <span style="font-size:15px;color:#334155;line-height:1.5">${inspectionEscape(n.text)}</span>
      </div>`).join('');

    // 機具明細
    const itemRows = p.work_items.map(it => {
      const pct = Math.min(100, it.completion_pct);
      return `
        <div style="display:flex;justify-content:space-between;align-items:center;padding:7px 0;border-bottom:1px solid ${col.border}">
          <span style="font-size:15px;color:#334155;font-weight:600">${inspectionEscape(it.name)}</span>
          <span style="font-size:14px;color:#64748b;white-space:nowrap;margin-left:8px">${it.final_qty}／${it.contract_qty} ${inspectionEscape(it.unit)}</span>
        </div>`;
    }).join('');

    return `
      <div style="background:${col.bg};border:1px solid ${col.border};border-left:6px solid ${col.badge};border-radius:14px;overflow:hidden">
        <!-- 標頭（點擊展開） -->
        <div onclick="contractCardToggle('${detailId}')" style="padding:18px 20px;cursor:pointer;display:flex;align-items:flex-start;gap:12px">
          <span style="background:${col.badge};color:#fff;border-radius:8px;padding:5px 14px;font-size:24px;font-weight:900;white-space:nowrap;flex-shrink:0">${p.year_roc}年</span>
          <div style="flex:1;min-width:0">
            <div style="font-size:19px;font-weight:700;color:${col.text};line-height:1.4;margin-bottom:8px">${inspectionEscape(p.project_name)}</div>
            <div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:8px">
              <span style="font-size:17px;color:#334155;font-weight:700"><i class="fas fa-coins" style="margin-right:5px;color:${col.badge}"></i>${_fmtAmount(p.contract_amount)} 元</span>
              <span style="font-size:16px;color:#64748b"><i class="fas fa-calendar-alt" style="margin-right:5px;color:${col.badge}"></i>${p.date_start} ～ ${p.date_end}</span>
            </div>
            <div style="display:flex;flex-wrap:wrap;gap:6px">${summaryPills}</div>
          </div>
          <i id="${detailId}_arrow" class="fas fa-chevron-down" style="font-size:18px;color:${col.badge};flex-shrink:0;margin-top:4px;transition:transform .25s"></i>
        </div>
        <!-- 展開內容 -->
        <div id="${detailId}" style="display:none;border-top:1px solid ${col.border};padding:16px 20px">
          ${catRows}
          ${dayBar}
          <div style="font-size:16px;font-weight:700;color:#475569;margin:12px 0 6px"><i class="fas fa-clipboard-list" style="margin-right:6px"></i>重點施工紀錄</div>
          ${keyNoteRows}
          <div style="font-size:16px;font-weight:700;color:#475569;margin:14px 0 6px"><i class="fas fa-cog" style="margin-right:6px"></i>機具項目明細</div>
          ${itemRows}
        </div>
      </div>`;
  }).join('');

  // 工作項目彙整表（大字）
  const itemTableRows = item_summary.map((it, idx) => `
    <tr style="border-bottom:1px solid #f1f5f9;${idx % 2 === 0 ? 'background:#f8fafc' : ''}">
      <td style="padding:14px 16px;font-size:18px;font-weight:600;color:#1e293b">${inspectionEscape(it.name)}</td>
      <td style="padding:14px 16px;font-size:17px;color:#475569;text-align:center">${it.unit}</td>
      <td style="padding:14px 16px;text-align:center">
        <span style="background:#dbeafe;color:#1e40af;border-radius:999px;padding:4px 14px;font-size:17px;font-weight:700">${it.projects}</span>
      </td>
      <td style="padding:14px 16px;font-size:17px;color:#64748b;text-align:right">${it.total_contract_qty}</td>
      <td style="padding:14px 16px;font-size:17px;color:#16a34a;font-weight:700;text-align:right">${it.total_final_qty}</td>
    </tr>
  `).join('');

  return `
    <div style="display:flex;gap:16px;flex-wrap:wrap;margin-bottom:24px">
      ${summaryCards}
    </div>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(400px,1fr));gap:18px">
      ${projectCards}
    </div>
  `;
}

/* ════════════════════════════════════════════════════════════════
   共用：多張現況照片上傳（最多 4 張，存為 DataURL）
   用法：
     HTML: ${renderMultiPhotoPanel('gf')}  ← 在表單裡插入
     Save: const photos = _inspGetMultiPhotos('gf');
   ════════════════════════════════════════════════════════════════ */
if (!window._inspMultiPhotos) window._inspMultiPhotos = {};

function renderMultiPhotoPanel(prefix, savedPhotos = [], max = 4) {
  window._inspMultiPhotos[prefix] = [...(savedPhotos || [])];
  return `
    <div style="border:1px solid #e2e8f0;border-radius:8px;padding:12px;margin-top:12px">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
        <span style="font-size:13px;font-weight:700;color:#0f172a">
          <i class="fas fa-camera" style="color:#1565c0;margin-right:6px"></i>現況照片（最多 ${max} 張）
        </span>
        <label style="cursor:pointer;background:#eff6ff;color:#1565c0;border:1px solid #bfdbfe;
                       border-radius:6px;padding:5px 12px;font-size:12px;font-weight:700;display:flex;align-items:center;gap:5px">
          <i class="fas fa-plus"></i> 選擇照片
          <input id="${prefix}_photo_input" type="file" accept="image/*" multiple style="display:none"
            onchange="_inspAddPhotos('${prefix}',${max})">
        </label>
      </div>
      <div id="${prefix}_photo_grid" style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px">
        ${(savedPhotos||[]).map((src,i) => _inspPhotoThumb(prefix, src, i)).join('')}
        ${(savedPhotos||[]).length === 0 ? `<div style="grid-column:span 4;text-align:center;color:#94a3b8;font-size:12px;padding:16px 0"><i class="fas fa-images" style="font-size:24px;display:block;margin-bottom:6px"></i>尚未上傳照片</div>` : ''}
      </div>
    </div>
  `;
}

function _inspPhotoThumb(prefix, src, idx) {
  return `
    <div style="position:relative;aspect-ratio:1;border-radius:6px;overflow:hidden;border:1px solid #e2e8f0;background:#f1f5f9">
      <img src="${src}" style="width:100%;height:100%;object-fit:cover" onerror="this.parentElement.style.display='none'">
      <button onclick="_inspRemovePhoto('${prefix}',${idx})"
        style="position:absolute;top:3px;right:3px;width:20px;height:20px;border-radius:50%;background:rgba(220,38,38,.85);
               color:#fff;border:none;cursor:pointer;font-size:11px;display:flex;align-items:center;justify-content:center;line-height:1">
        ×
      </button>
      <div style="position:absolute;bottom:0;left:0;right:0;background:rgba(0,0,0,.4);color:#fff;font-size:10px;padding:2px 5px;text-align:center">
        照片 ${idx+1}
      </div>
    </div>
  `;
}

function _inspAddPhotos(prefix, max) {
  const input = document.getElementById(`${prefix}_photo_input`);
  if (!input?.files?.length) return;
  const existing = window._inspMultiPhotos[prefix] || [];
  const slots = max - existing.length;
  if (slots <= 0) { showToast(`最多只能上傳 ${max} 張照片`, 'warning'); input.value=''; return; }
  const files = Array.from(input.files).slice(0, slots);
  let loaded = 0;
  files.forEach(file => {
    if (file.size > 5 * 1024 * 1024) { showToast(`${file.name} 超過 5MB，已略過`, 'warning'); loaded++; return; }
    const reader = new FileReader();
    reader.onload = () => {
      // Resize to max 1200px for storage efficiency
      const img = new Image();
      img.onload = () => {
        const maxW = 1200;
        const scale = Math.min(1, maxW / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.82);
        (window._inspMultiPhotos[prefix] = window._inspMultiPhotos[prefix] || []).push(dataUrl);
        _inspRefreshPhotoGrid(prefix, max);
        loaded++;
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
  input.value = '';
}

function _inspRemovePhoto(prefix, idx) {
  const arr = window._inspMultiPhotos[prefix];
  if (!arr) return;
  arr.splice(idx, 1);
  _inspRefreshPhotoGrid(prefix, 4);
}

function _inspRefreshPhotoGrid(prefix, max) {
  const grid = document.getElementById(`${prefix}_photo_grid`);
  if (!grid) return;
  const arr = window._inspMultiPhotos[prefix] || [];
  grid.innerHTML = arr.map((src,i) => _inspPhotoThumb(prefix, src, i)).join('') +
    (arr.length === 0 ? `<div style="grid-column:span 4;text-align:center;color:#94a3b8;font-size:12px;padding:16px 0"><i class="fas fa-images" style="font-size:24px;display:block;margin-bottom:6px"></i>尚未上傳照片</div>` : '') +
    (arr.length < max ? `<div style="aspect-ratio:1;border:2px dashed #cbd5e1;border-radius:6px;display:flex;align-items:center;justify-content:center;cursor:pointer;color:#94a3b8;font-size:11px" onclick="document.getElementById('${prefix}_photo_input').click()"><div style="text-align:center"><i class="fas fa-plus" style="font-size:18px;display:block;margin-bottom:4px"></i>新增</div></div>` : '');
}

function _inspGetMultiPhotos(prefix) {
  return window._inspMultiPhotos[prefix] || [];
}

/* ════════════════════════════════════════════════════════════════
   附錄一：各列單張照片（設施種類逐列）
   ════════════════════════════════════════════════════════════════ */
if (!window._inspRowPhotos) window._inspRowPhotos = {};

function _gfRowPhotoCell(ri, savedPhoto) {
  if (!window._inspRowPhotos) window._inspRowPhotos = {};
  window._inspRowPhotos[`gf_${ri}`] = savedPhoto || null;
  if (savedPhoto) {
    return `<div id="gf_rowphoto_${ri}">
      <div style="position:relative;margin-bottom:4px">
        <img src="${savedPhoto}" style="width:100%;height:65px;object-fit:cover;border-radius:4px;border:1px solid #e2e8f0;display:block">
        <button onclick="_gfClearRowPhoto(${ri})"
          style="position:absolute;top:2px;right:2px;width:18px;height:18px;border-radius:50%;
                 background:rgba(220,38,38,.85);color:#fff;border:none;cursor:pointer;font-size:11px;line-height:1">×</button>
      </div></div>`;
  }
  return `<div id="gf_rowphoto_${ri}">
    <label style="display:flex;flex-direction:column;align-items:center;justify-content:center;
        width:100%;height:58px;border:1.5px dashed #cbd5e1;border-radius:5px;cursor:pointer;
        color:#94a3b8;font-size:10px;gap:2px;background:#f8fafc;margin-bottom:4px">
      <i class="fas fa-camera" style="font-size:13px"></i>新增照片
      <input type="file" accept="image/*" style="display:none" onchange="_gfAddRowPhoto(${ri},this)">
    </label></div>`;
}

function _gfAddRowPhoto(ri, input) {
  const file = input.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    const img = new Image();
    img.onload = () => {
      const maxW = 900;
      const scale = Math.min(1, maxW / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.82);
      if (!window._inspRowPhotos) window._inspRowPhotos = {};
      window._inspRowPhotos[`gf_${ri}`] = dataUrl;
      const container = document.getElementById(`gf_rowphoto_${ri}`);
      if (container) container.innerHTML = `
        <div style="position:relative;margin-bottom:4px">
          <img src="${dataUrl}" style="width:100%;height:65px;object-fit:cover;border-radius:4px;border:1px solid #e2e8f0;display:block">
          <button onclick="_gfClearRowPhoto(${ri})"
            style="position:absolute;top:2px;right:2px;width:18px;height:18px;border-radius:50%;
                   background:rgba(220,38,38,.85);color:#fff;border:none;cursor:pointer;font-size:11px;line-height:1">×</button>
        </div>`;
    };
    img.src = String(reader.result);
  };
  reader.readAsDataURL(file);
  input.value = '';
}

function _gfClearRowPhoto(ri) {
  if (!window._inspRowPhotos) window._inspRowPhotos = {};
  window._inspRowPhotos[`gf_${ri}`] = null;
  const container = document.getElementById(`gf_rowphoto_${ri}`);
  if (container) container.innerHTML = `
    <label style="display:flex;flex-direction:column;align-items:center;justify-content:center;
        width:100%;height:58px;border:1.5px dashed #cbd5e1;border-radius:5px;cursor:pointer;
        color:#94a3b8;font-size:10px;gap:2px;background:#f8fafc;margin-bottom:4px">
      <i class="fas fa-camera" style="font-size:13px"></i>新增照片
      <input type="file" accept="image/*" style="display:none" onchange="_gfAddRowPhoto(${ri},this)">
    </label>`;
}

function downloadGFPdf() {
  const date = document.getElementById('gf_date')?.value || '';
  const inspector = document.getElementById('gf_inspector')?.value || '';
  const facilityEl = document.getElementById('gf_facility');
  const facilityName = facilityEl?.options[facilityEl?.selectedIndex]?.text || '─';
  const remark = document.getElementById('gf_remark')?.value || '';
  const rowsData = {};
  GF_ROWS.forEach((row, ri) => {
    const conds = [...row.items.map(item => {
      const cb = document.getElementById(`gf_c_${ri}_${item.replace(/[^a-z0-9]/gi,'')}`);
      return cb?.checked ? item : null;
    }), document.getElementById(`gf_c_${ri}_other`)?.checked ? '其他' : null].filter(Boolean);
    const treat = document.querySelector(`input[name="gf_treat_${ri}"]:checked`)?.value || '定期巡查';
    rowsData[row.key] = {
      location: document.getElementById(`gf_loc_${ri}`)?.value || '',
      conditions: conds,
      treatment: treat,
      notes: document.getElementById(`gf_note_${ri}`)?.value || '',
      photo: window._inspRowPhotos?.[`gf_${ri}`] || null,
    };
  });
  const overallPhotos = _inspGetMultiPhotos('gf');
  const rowsHtml = GF_ROWS.map(row => {
    const rd = rowsData[row.key] || {};
    const conds = rd.conditions || [];
    const treat = rd.treatment || '定期巡查';
    const treatColor = treat==='異常通報' ? '#dc2626' : treat==='自行處理' ? '#d97706' : '#166534';
    return `<tr>
      <td style="font-weight:700;text-align:center">${row.key}</td>
      <td>${rd.location || ''}</td>
      <td>${conds.length ? conds.map(c => `<span style="display:inline-block;background:${c==='正常'?'#dcfce7':'#fee2e2'};
        border:1px solid ${c==='正常'?'#86efac':'#fca5a5'};border-radius:12px;
        padding:1px 7px;margin:1px 2px;font-size:10px">${c}</span>`).join('') : '<span style="color:#aaa">─</span>'}</td>
      <td style="text-align:center;font-weight:700;color:${treatColor}">${treat}</td>
      <td style="padding:4px">${rd.photo
        ? `<img src="${rd.photo}" style="width:100%;height:80px;object-fit:cover;border-radius:3px;border:1px solid #ddd;display:block">`
        : `<div style="height:60px;border:1px dashed #ccc;display:flex;align-items:center;justify-content:center;color:#bbb;font-size:10px;border-radius:3px">無照片</div>`}</td>
      <td style="font-size:10px">${rd.notes || ''}</td>
    </tr>`;
  }).join('');
  const overallPhotosHtml = overallPhotos.length ? `
    <div style="margin-top:14px">
      <div style="font-weight:700;font-size:13px;margin-bottom:8px;border-bottom:1px solid #ccc;padding-bottom:4px">現況照片</div>
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px">
        ${overallPhotos.map((src,i) => `<div>
          <img src="${src}" style="width:100%;height:110px;object-fit:cover;border:1px solid #ddd;border-radius:3px;display:block">
          <div style="text-align:center;font-size:10px;color:#666;margin-top:2px">照片 ${i+1}</div>
        </div>`).join('')}
      </div>
    </div>` : '';
  const html = `<!DOCTYPE html><html lang="zh-TW"><head><meta charset="utf-8">
<title>一般性巡查表單（附錄一）</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Microsoft JhengHei','PingFang TC','Noto Sans TC',sans-serif;font-size:12px;color:#000;background:#fff;padding:18px 22px}
  h1{font-size:16px;text-align:center;margin-bottom:3px;font-weight:900}
  h2{font-size:13px;text-align:center;margin-bottom:14px;color:#333}
  .info-row{display:flex;gap:0;border:1px solid #999;border-radius:4px;margin-bottom:12px}
  .info-item{flex:1;padding:6px 10px;border-right:1px solid #ccc}
  .info-item:last-child{border-right:none}
  .info-item b{margin-right:4px}
  table{width:100%;border-collapse:collapse;margin-bottom:12px;font-size:11px}
  th,td{border:1px solid #aaa;padding:5px 7px;vertical-align:top}
  thead th{background:#1e3a5f;color:#fff;text-align:center;font-size:11px}
  tr:nth-child(even) td{background:#f8fafc}
  .remark-box{border:1px solid #ccc;border-radius:4px;padding:8px;min-height:36px;margin:4px 0 14px;font-size:12px}
  .sig-row{display:flex;gap:24px;margin-top:24px;page-break-inside:avoid}
  .sig-item{flex:1;border-top:1.5px solid #000;text-align:center;padding-top:5px;font-size:11px}
  @media print{@page{margin:1cm}body{padding:6px 10px}}
</style></head><body>
<h1>橫流溪重要設施維護管理計畫</h1>
<h2>附錄一　一般性定期巡查表單</h2>
<div class="info-row">
  <div class="info-item"><b>巡查日期：</b>${date}</div>
  <div class="info-item"><b>巡查人員：</b>${inspector || '　　　　'}</div>
  <div class="info-item"><b>關聯設施：</b>${facilityName}</div>
</div>
<table>
  <thead>
    <tr>
      <th style="width:68px">設施種類</th>
      <th style="width:88px">設施位置</th>
      <th>現況情形</th>
      <th style="width:72px">處理情形</th>
      <th style="width:100px">照片</th>
      <th style="width:110px">說明</th>
    </tr>
  </thead>
  <tbody>${rowsHtml}</tbody>
</table>
<div style="font-weight:700;margin-bottom:3px">備註：</div>
<div class="remark-box">${remark || '　'}</div>
${overallPhotosHtml}
<div class="sig-row">
  <div class="sig-item">巡查人員簽名</div>
  <div class="sig-item">主管核閱</div>
  <div class="sig-item">填表日期</div>
</div>
</body></html>`;
  const win = window.open('', '_blank');
  if (!win) { showToast('請允許彈出視窗以產生PDF', 'warning'); return; }
  win.document.write(html);
  win.document.close();
  win.addEventListener('load', () => setTimeout(() => win.print(), 300));
}

/* ════════════════════════════════════════════════════════════════
   附錄一  一般性巡查表單
   ════════════════════════════════════════════════════════════════ */
const GF_ROWS = [
  { key:'步道',       items:['正常','伏倒木或落石','道路中斷','道路基礎淘空'] },
  { key:'邊坡',       items:['正常','裸露/崩塌'] },
  { key:'平臺/護欄',  items:['正常','斷裂或破損','表面耗損','本體歪斜'] },
  { key:'護岸',       items:['正常','結構外觀破損','基礎淘空'] },
  { key:'魚道/防砂設施', items:['正常','結構外觀破損','基礎淘空','土砂淤積'] },
  { key:'告示牌/解說牌', items:['正常','基礎裸露','鋼材鏽蝕','結構外觀破損'] },
  { key:'救生圈',     items:['正常','遺失'] },
];
const GF_TREATMENTS = ['定期巡查','自行處理','異常通報'];

function openGeneralPeriodicForm(facilityId = null, id = null) {
  const rec = id ? DB.getById('inspections', id) : null;
  const rows = rec?.gf_rows || {};
  const facilities = DB.getAll('facilities');

  document.getElementById('modal').style.maxWidth = '960px';
  document.getElementById('modalTitle').textContent = id ? '編輯一般性巡查紀錄（附錄一）' : '新增一般性巡查（附錄一）';
  document.getElementById('modalBody').innerHTML = `
    <div style="font-size:13px;color:#64748b;margin-bottom:14px">
      <i class="fas fa-info-circle" style="color:#1565c0"></i>
      依據橫流溪重要設施維護管理計畫 附錄一 一般性巡查表單
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:16px">
      <div class="form-group"><label>巡查日期 *</label>
        <input id="gf_date" type="date" value="${rec?.date || new Date().toISOString().split('T')[0]}">
      </div>
      <div class="form-group"><label>巡查人員</label>
        <input id="gf_inspector" type="text" value="${inspectionEscape(rec?.inspector || '')}" placeholder="姓名">
      </div>
      <div class="form-group"><label>關聯設施（選填）</label>
        <select id="gf_facility">
          <option value="">─ 不指定 ─</option>
          ${facilities.map(f=>`<option value="${f.id}" ${(rec?.facilityId||facilityId)==f.id?'selected':''}>${inspectionEscape(f.name)}</option>`).join('')}
        </select>
      </div>
    </div>
    <div style="overflow-x:auto;border:1px solid #e2e8f0;border-radius:8px">
      <table style="width:100%;border-collapse:collapse;min-width:800px">
        <thead>
          <tr style="background:#1e3a5f;color:#fff">
            <th style="padding:10px 12px;text-align:left;font-size:13px;width:90px">設施種類</th>
            <th style="padding:10px 12px;text-align:left;font-size:13px;width:110px">設施位置</th>
            <th style="padding:10px 12px;text-align:left;font-size:13px">現況情形</th>
            <th style="padding:10px 12px;text-align:left;font-size:13px;width:160px">處理情形</th>
            <th style="padding:10px 12px;text-align:left;font-size:13px;width:155px">照片</th>
            <th style="padding:10px 12px;text-align:left;font-size:13px;width:120px">說明</th>
          </tr>
        </thead>
        <tbody>
          ${GF_ROWS.map((row, ri) => {
            const saved = rows[row.key] || {};
            const savedConditions = saved.conditions || [];
            const savedTreatment = saved.treatment || '定期巡查';
            return `
          <tr style="border-bottom:1px solid #e2e8f0;${ri%2?'background:#f8fafc':'background:#fff'}">
            <td style="padding:10px 12px;font-size:13px;font-weight:700;color:#0f172a;vertical-align:top">${row.key}</td>
            <td style="padding:10px 12px;vertical-align:top">
              <input style="width:100%;border:1px solid #e2e8f0;border-radius:4px;padding:4px 6px;font-size:12px"
                id="gf_loc_${ri}" type="text" value="${inspectionEscape(saved.location||'')}" placeholder="填寫位置">
            </td>
            <td style="padding:10px 12px;vertical-align:top">
              <div style="display:flex;flex-wrap:wrap;gap:4px">
                ${row.items.map(item => `
                  <label style="display:flex;align-items:center;gap:4px;font-size:12px;cursor:pointer;
                    background:${savedConditions.includes(item)?'#dbeafe':'#f8fafc'};
                    border:1px solid ${savedConditions.includes(item)?'#3b82f6':'#e2e8f0'};
                    border-radius:999px;padding:3px 9px;white-space:nowrap">
                    <input type="checkbox" id="gf_c_${ri}_${item.replace(/[^a-z0-9]/gi,'')}"
                      style="accent-color:#1565c0" ${savedConditions.includes(item)?'checked':''}>
                    ${item}
                  </label>`).join('')}
                <label style="display:flex;align-items:center;gap:4px;font-size:12px;cursor:pointer;
                  background:#fefce8;border:1px solid #fde047;border-radius:999px;padding:3px 9px">
                  <input type="checkbox" id="gf_c_${ri}_other" ${savedConditions.includes('其他')?'checked':''}>
                  其他
                </label>
              </div>
            </td>
            <td style="padding:10px 12px;vertical-align:top">
              <div style="display:flex;flex-direction:column;gap:4px">
                ${GF_TREATMENTS.map(t=>`
                  <label style="display:flex;align-items:center;gap:5px;font-size:12px;cursor:pointer;
                    color:${t==='異常通報'?'#dc2626':t==='自行處理'?'#d97706':'#166534'}">
                    <input type="radio" name="gf_treat_${ri}" value="${t}" ${savedTreatment===t?'checked':''}>
                    ${t}
                  </label>`).join('')}
              </div>
            </td>
            <td style="padding:8px 10px;vertical-align:top;width:155px">
              ${_gfRowPhotoCell(ri, saved.photo||null)}
            </td>
            <td style="padding:10px 12px;vertical-align:top">
              <input style="width:100%;border:1px solid #e2e8f0;border-radius:4px;padding:4px 6px;font-size:12px"
                id="gf_note_${ri}" type="text" value="${inspectionEscape(saved.notes||'')}" placeholder="說明">
            </td>
          </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>
    <div class="form-group" style="margin-top:12px">
      <label>備註</label>
      <textarea id="gf_remark" rows="2" style="font-size:13px">${inspectionEscape(rec?.remark||'')}</textarea>
    </div>
    ${renderMultiPhotoPanel('gf', rec?.photoDataUrls||[], 4)}
    <div style="margin-top:10px;padding:8px 12px;background:#eff6ff;border-radius:6px;font-size:12px;color:#1565c0">
      <i class="fas fa-cloud-upload-alt"></i> 儲存後自動同步至雲端資料庫，並連動工程設施管理。
    </div>
  `;
  document.getElementById('modalFooter').innerHTML = `
    <button class="btn btn-outline" onclick="closeModal();document.getElementById('modal').style.maxWidth=''">關閉</button>
    <button class="btn btn-outline" onclick="downloadGFPdf()" style="color:#7c3aed;border-color:#7c3aed">
      <i class="fas fa-file-pdf"></i> 下載 PDF
    </button>
    <button class="btn btn-primary" onclick="saveGeneralPeriodicForm(${id||'null'})">
      <i class="fas fa-save"></i> 儲存紀錄
    </button>
  `;
  openModal();
}

function saveGeneralPeriodicForm(id) {
  const date = document.getElementById('gf_date')?.value;
  if (!date) { showToast('請填寫巡查日期', 'error'); return; }
  const facilityId = parseInt(document.getElementById('gf_facility')?.value) || null;
  const facilityName = facilityId
    ? (DB.getById('facilities', facilityId)?.name || '')
    : '(全區一般巡查)';

  const gf_rows = {};
  GF_ROWS.forEach((row, ri) => {
    const conditions = [...row.items.map(item => {
      const cb = document.getElementById(`gf_c_${ri}_${item.replace(/[^a-z0-9]/gi,'')}`);
      return cb?.checked ? item : null;
    }), document.getElementById(`gf_c_${ri}_other`)?.checked ? '其他' : null].filter(Boolean);
    const treatEl = document.querySelector(`input[name="gf_treat_${ri}"]:checked`);
    gf_rows[row.key] = {
      location: document.getElementById(`gf_loc_${ri}`)?.value.trim() || '',
      conditions,
      treatment: treatEl?.value || '定期巡查',
      notes: document.getElementById(`gf_note_${ri}`)?.value.trim() || '',
      photo: window._inspRowPhotos?.[`gf_${ri}`] || null,
    };
  });

  const hasAbnormal = Object.values(gf_rows).some(r => r.conditions.some(c => c !== '正常'));
  const item = {
    formType: 'general_periodic',
    facilityId,
    facilityName,
    date,
    inspector: document.getElementById('gf_inspector')?.value.trim() || '',
    gf_rows,
    remark: document.getElementById('gf_remark')?.value.trim() || '',
    status: hasAbnormal ? '待處理' : '完成',
    priority: hasAbnormal ? '中' : '低',
    findings: Object.entries(gf_rows).filter(([,v])=>v.conditions.some(c=>c!=='正常'))
      .map(([k,v])=>`${k}：${v.conditions.filter(c=>c!=='正常').join('、')}`).join('；') || '各設施狀況正常',
    action: Object.entries(gf_rows).filter(([,v])=>v.treatment!=='定期巡查')
      .map(([k,v])=>`${k}→${v.treatment}`).join('；') || '定期巡查',
    deru_d: 0, deru_e: 1, deru_r: 1, deru_u: 1,
    photoDataUrls: _inspGetMultiPhotos('gf'),
  };

  prepareInspectionRecordForSync(item, 'general_periodic', true);
  const savedItem = id
    ? DB.update('inspections', id, item)
    : DB.insert('inspections', item);
  syncInspectionRecordToFacility(savedItem || item);
  showToast(id ? '一般性巡查紀錄已更新，並同步巡查資料管理' : '一般性巡查紀錄已新增，並同步巡查資料管理', 'success');

  syncInspFormToCloud('general_periodic', savedItem || item);
  _autoCloudPush(savedItem || item);
  // Firebase 即時推播：讓其他已連線平板自動收到新巡查
  if (window.CloudSync?.isOnline) {
    setTimeout(() => CloudSync.push(DB.load(), { manual: true }), 300);
  }
  document.getElementById('modal').style.maxWidth = '';
  closeModal();
  if (window._facAfterInspectionSave) { const cb=window._facAfterInspectionSave; window._facAfterInspectionSave=null; setTimeout(cb,80); }
  else { renderInspection(); }
}

/* ════════════════════════════════════════════════════════════════
   附錄二  專業性巡查表單 — 構造物調查表
   ════════════════════════════════════════════════════════════════ */
const SF_VISUAL = ['良好','裂縫','磨蝕','淘空','傾倒','沉陷','錯動變形','位移','填土(石)流失','腐朽','火害','外框斷裂','植生覆蓋不良'];
const SF_DAMAGE_REASONS = ['設計因素','施工因素','材料因素','材料強度因素','水流因素','排水因素','土壓力因素','構造物銜接因素','地質因素','河溪因素','地形因素'];
const SF_GRADES = ['A','B1','B2','B3','C1','C2','C3','C4','C5'];
const SF_GRADE_DESC = {
  A:'外觀良好，功能健全，例行維護',
  B1:'重要工程，部分受損，DER&U進階定量',
  B2:'一般工程，1~3年內維護',
  B3:'一般工程，進入定期檢測',
  C1:'重要工程，緊急重建',
  C2:'重要工程，1年內重建',
  C3:'一般工程，1年內重建（有保全）',
  C4:'一般工程，緩建（無保全）',
  C5:'維持現況'
};
const SF_ICS = ['I（ICS≥85，例行維護）','II（70≤ICS<85，三年內處理）','III（40≤ICS<70，一年內處理）','IV（ICS<40，緊急重建）'];

function openStructureInspectionForm(facilityId = null, id = null) {
  const rec = id ? DB.getById('inspections', id) : null;
  const facs = DB.getAll('facilities');
  const preFac = facilityId ? DB.getById('facilities', Number(facilityId)) : null;
  const saved = rec || {};

  document.getElementById('modal').style.maxWidth = '980px';
  document.getElementById('modalTitle').textContent = id ? '編輯構造物調查表（附錄二）' : '新增構造物調查表（附錄二）';
  document.getElementById('modalBody').innerHTML = `
    <div style="font-size:13px;color:#9a3412;background:#fff7ed;border:1px solid #fed7aa;border-radius:6px;padding:8px 12px;margin-bottom:14px">
      <i class="fas fa-hard-hat"></i> 依據橫流溪重要設施維護管理計畫 附錄二 專業性巡查表單—構造物調查表
    </div>

    <!-- ① 基本資料 -->
    <div style="font-size:14px;font-weight:800;color:#9a3412;border-left:4px solid #ea580c;padding-left:8px;margin-bottom:10px">(1) 基本資料</div>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:10px">
      <div class="form-group"><label>檢測時間 *</label>
        <input id="sf_date" type="date" value="${saved.date||new Date().toISOString().split('T')[0]}">
      </div>
      <div class="form-group"><label>檢測人員</label>
        <input id="sf_inspector" type="text" value="${inspectionEscape(saved.inspector||'')}">
      </div>
      <div class="form-group"><label>檢測單位</label>
        <input id="sf_unit" type="text" value="${inspectionEscape(saved.sf_unit||'')}">
      </div>
      <div class="form-group"><label>檢測編號</label>
        <input id="sf_no" type="text" value="${inspectionEscape(saved.sf_no||'')}">
      </div>
      <div class="form-group" style="grid-column:span 2"><label>關聯設施 *</label>
        <select id="sf_facility">
          <option value="">請選擇構造物</option>
          ${facs.map(f=>`<option value="${f.id}" ${(saved.facilityId||Number(facilityId))==f.id?'selected':''}>${inspectionEscape(f.name)}</option>`).join('')}
        </select>
      </div>
      <div class="form-group"><label>TWD97 X</label>
        <input id="sf_x" type="number" value="${saved.sf_x||preFac?.twd97x||''}">
      </div>
      <div class="form-group"><label>TWD97 Y</label>
        <input id="sf_y" type="number" value="${saved.sf_y||preFac?.twd97y||''}">
      </div>
      <div class="form-group"><label>管理單位</label>
        <input id="sf_mgUnit" type="text" value="${inspectionEscape(saved.sf_mgUnit||'林業保育署臺中分署')}">
      </div>
      <div class="form-group"><label>縣市</label>
        <input id="sf_county" type="text" value="${inspectionEscape(saved.sf_county||'臺中市')}">
      </div>
      <div class="form-group"><label>鄉鎮</label>
        <input id="sf_township" type="text" value="${inspectionEscape(saved.sf_township||'和平區')}">
      </div>
      <div class="form-group"><label>事業林班區</label>
        <input id="sf_forest" type="text" value="${inspectionEscape(saved.sf_forest||'')}">
      </div>
      <div class="form-group"><label>構造物種類</label>
        <input id="sf_structType" type="text" value="${inspectionEscape(saved.sf_structType||preFac?.type||'')}">
      </div>
      <div class="form-group"><label>規格尺寸</label>
        <input id="sf_dims" type="text" value="${inspectionEscape(saved.sf_dims||'')}">
      </div>
      <div class="form-group"><label>使用材質</label>
        <input id="sf_mat" type="text" value="${inspectionEscape(saved.sf_mat||preFac?.material||'')}">
      </div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px">
      <div class="form-group"><label>周遭環境—溪岸</label>
        <select id="sf_riverBank">
          ${['植被良好','植被稀疏','崩塌裸露','殘土堆積'].map(v=>`<option ${(saved.sf_env?.riverBank||'植被良好')===v?'selected':''}>${v}</option>`).join('')}
        </select>
      </div>
      <div class="form-group"><label>周遭環境—坡面</label>
        <select id="sf_slope">
          ${['植被良好','植被稀疏','崩塌裸露'].map(v=>`<option ${(saved.sf_env?.slope||'植被良好')===v?'selected':''}>${v}</option>`).join('')}
        </select>
      </div>
      <div class="form-group"><label>步道路面</label>
        <select id="sf_trail">
          ${['良好','部分破損','嚴重破損'].map(v=>`<option ${(saved.sf_env?.trail||'良好')===v?'selected':''}>${v}</option>`).join('')}
        </select>
      </div>
      <div class="form-group"><label>排水</label>
        <select id="sf_drain">
          ${['良好','部分阻塞','排水系統不足'].map(v=>`<option ${(saved.sf_env?.drainage||'良好')===v?'selected':''}>${v}</option>`).join('')}
        </select>
      </div>
      <div class="form-group"><label>交通標誌</label>
        <select id="sf_trafficSign">
          ${['良好','部分毀損','失去功能'].map(v=>`<option ${(saved.sf_env?.trafficSign||'良好')===v?'selected':''}>${v}</option>`).join('')}
        </select>
      </div>
      <div class="form-group"><label>安全標誌</label>
        <select id="sf_safetySign">
          ${['良好','部分毀損','失去功能'].map(v=>`<option ${(saved.sf_env?.safetySign||'良好')===v?'selected':''}>${v}</option>`).join('')}
        </select>
      </div>
    </div>

    <!-- ② 檢測評估 -->
    <div style="font-size:14px;font-weight:800;color:#9a3412;border-left:4px solid #ea580c;padding-left:8px;margin-bottom:10px">(2) 檢測評估</div>
    <div class="form-group"><label>外觀檢視（可複選）</label>
      <div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:4px">
        ${SF_VISUAL.map((v,i)=>`
          <label style="display:flex;align-items:center;gap:4px;font-size:12px;cursor:pointer;
            background:${(saved.sf_visual||[]).includes(v)?'#fee2e2':'#f8fafc'};
            border:1px solid ${(saved.sf_visual||[]).includes(v)?'#dc2626':'#e2e8f0'};
            border-radius:999px;padding:3px 10px">
            <input type="checkbox" id="sf_vis_${i}"
              ${(saved.sf_visual||[]).includes(v)?'checked':''}>
            ${v}
          </label>`).join('')}
      </div>
    </div>
    <div class="form-group"><label>損壞原因研判（可複選）</label>
      <div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:4px">
        ${SF_DAMAGE_REASONS.map(v=>`
          <label style="display:flex;align-items:center;gap:4px;font-size:12px;cursor:pointer;
            background:${(saved.sf_dmgReasons||[]).includes(v)?'#fef3c7':'#f8fafc'};
            border:1px solid ${(saved.sf_dmgReasons||[]).includes(v)?'#d97706':'#e2e8f0'};
            border-radius:999px;padding:3px 10px">
            <input type="checkbox" id="sf_dmg_${v.replace(/[^a-z0-9]/gi,'')}"
              ${(saved.sf_dmgReasons||[]).includes(v)?'checked':''}>
            ${v}
          </label>`).join('')}
        <label style="display:flex;align-items:center;gap:4px;font-size:12px;cursor:pointer;
          background:#f8fafc;border:1px solid #e2e8f0;border-radius:999px;padding:3px 10px">
          <input type="checkbox" id="sf_dmg_other" ${(saved.sf_dmgReasons||[]).includes('其他')?'checked':''}>其他
        </label>
      </div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px">
      <div class="form-group"><label>功能評估等級</label>
        <select id="sf_grade">
          ${SF_GRADES.map(g=>`<option value="${g}" ${(saved.sf_grade||'A')===g?'selected':''}>${g}級 — ${SF_GRADE_DESC[g]}</option>`).join('')}
        </select>
      </div>
      <div class="form-group"><label>縱向廊道影響</label>
        <select id="sf_corridor">
          ${['不影響','有影響（需填魚道檢核表）'].map(v=>`<option ${(saved.sf_corridor||'不影響')===v?'selected':''}>${v}</option>`).join('')}
        </select>
      </div>
      <div class="form-group"><label>維護優先度</label>
        <select id="sf_priority">
          ${INSPECTION_PRIORITY.map(p=>`<option value="${p}" ${getInspectionPriority(saved)===p?'selected':''}>${p}</option>`).join('')}
        </select>
        <small style="color:#64748b;font-size:11px">預設依評級推算（A級→低），可人工覆核調整。</small>
      </div>
      <div class="form-group"><label>處理狀態</label>
        <select id="sf_status">
          ${INSPECTION_STATUS.map(s=>`<option value="${s}" ${getInspectionStatus(saved)===s?'selected':''}>${s}</option>`).join('')}
        </select>
      </div>
      <div class="form-group"><label>預計完成時間</label>
        <input id="sf_expectedCompletion" type="date" value="${saved.expectedCompletion || ''}">
      </div>
      <div class="form-group"><label>實際完成時間</label>
        <input id="sf_completedAt" type="date" value="${saved.completedAt || saved.completionDate || ''}">
        <small style="color:#64748b;font-size:11px">填寫後請將處理狀態改為「完成」，案件即從待處理清單移除。</small>
      </div>
    </div>

    <!-- DER&U 三點檢查表 -->
    <div style="font-size:13px;font-weight:700;color:#9a3412;margin-bottom:8px">B1 級進階定量檢測（DER&U）</div>
    <div style="overflow-x:auto;border:1px solid #fed7aa;border-radius:8px;margin-bottom:12px">
      <table style="width:100%;border-collapse:collapse;min-width:600px">
        <thead>
          <tr style="background:#fff7ed">
            <th style="padding:8px 10px;text-align:center;font-size:12px;color:#9a3412;width:50px">編號</th>
            <th style="padding:8px 10px;text-align:left;font-size:12px;color:#9a3412">劣化型態</th>
            <th style="padding:8px 10px;text-align:center;font-size:12px;color:#9a3412;width:70px">D</th>
            <th style="padding:8px 10px;text-align:center;font-size:12px;color:#9a3412;width:70px">E</th>
            <th style="padding:8px 10px;text-align:center;font-size:12px;color:#9a3412;width:70px">R</th>
            <th style="padding:8px 10px;text-align:left;font-size:12px;color:#9a3412">說明</th>
          </tr>
        </thead>
        <tbody>
          ${[0,1,2].map(i => {
            const drow = (saved.sf_deruItems||[])[i] || {};
            return `
          <tr style="border-top:1px solid #fed7aa">
            <td style="padding:8px 10px;text-align:center;font-size:13px;font-weight:700;color:#9a3412">${i+1}</td>
            <td style="padding:6px 8px">
              <input type="text" id="sf_deru_type_${i}" value="${inspectionEscape(drow.defectType||'')}"
                style="width:100%;border:1px solid #fed7aa;border-radius:4px;padding:4px 6px;font-size:12px">
            </td>
            <td style="padding:6px 8px">
              <select id="sf_deru_d_${i}" style="width:100%;font-size:12px;border:1px solid #fed7aa;border-radius:4px;padding:4px">
                ${[0,1,2,3,4].map(v=>`<option ${(drow.d||0)==v?'selected':''}>${v}</option>`).join('')}
              </select>
            </td>
            <td style="padding:6px 8px">
              <select id="sf_deru_e_${i}" style="width:100%;font-size:12px;border:1px solid #fed7aa;border-radius:4px;padding:4px">
                ${[1,2,3,4].map(v=>`<option ${(drow.e||1)==v?'selected':''}>${v}</option>`).join('')}
              </select>
            </td>
            <td style="padding:6px 8px">
              <select id="sf_deru_r_${i}" style="width:100%;font-size:12px;border:1px solid #fed7aa;border-radius:4px;padding:4px">
                ${[1,2,3,4].map(v=>`<option ${(drow.r||1)==v?'selected':''}>${v}</option>`).join('')}
              </select>
            </td>
            <td style="padding:6px 8px">
              <input type="text" id="sf_deru_note_${i}" value="${inspectionEscape(drow.note||'')}"
                style="width:100%;border:1px solid #fed7aa;border-radius:4px;padding:4px 6px;font-size:12px">
            </td>
          </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px">
      <div class="form-group"><label>B1 級進階分級（ICS）</label>
        <select id="sf_icsGrade">
          ${SF_ICS.map(v=>`<option ${(saved.sf_icsGrade||SF_ICS[0])===v?'selected':''}>${v}</option>`).join('')}
        </select>
      </div>
      <div class="form-group"><label>處理維護建議</label>
        <select id="sf_treatment">
          ${['例行處理維護','三年內必須處理維護','一年內必須處理維護','緊急處理重建'].map(v=>`<option ${(saved.sf_treatment||'例行處理維護')===v?'selected':''}>${v}</option>`).join('')}
        </select>
      </div>
    </div>
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:10px">
      <div class="form-group" style="grid-column:span 2"><label>處理工法建議—工法</label>
        <input id="sf_repair_method" type="text" value="${inspectionEscape(saved.sf_repairWork?.method||'')}" placeholder="如：混凝土補強、蛇籠護坡">
      </div>
      <div class="form-group"><label>規模尺寸或面積</label>
        <input id="sf_repair_scale" type="text" value="${inspectionEscape(saved.sf_repairWork?.scale||'')}">
      </div>
      <div class="form-group"><label>預估經費（仟元）</label>
        <input id="sf_repair_cost" type="number" value="${saved.sf_repairWork?.cost||''}">
      </div>
    </div>
    <div class="form-group"><label>現況描述</label>
      <textarea id="sf_description" rows="3">${inspectionEscape(saved.sf_description||saved.findings||'')}</textarea>
    </div>
    ${renderMultiPhotoPanel('sf', saved.photoDataUrls||[], 4)}
    <div style="margin-top:8px;padding:8px 12px;background:#fff7ed;border-radius:6px;font-size:12px;color:#9a3412">
      <i class="fas fa-cloud-upload-alt"></i> 儲存後自動同步至雲端資料庫，並連動工程設施管理。
    </div>
  `;
  document.getElementById('modalFooter').innerHTML = `
    <button class="btn btn-outline" onclick="closeModal();document.getElementById('modal').style.maxWidth=''">關閉</button>
    <button class="btn btn-outline" onclick="downloadSFPdf()" style="color:#7c3aed;border-color:#7c3aed">
      <i class="fas fa-file-pdf"></i> 下載 PDF
    </button>
    <button class="btn btn-primary" onclick="saveStructureInspectionForm(${id||'null'})" style="background:#9a3412;border-color:#9a3412">
      <i class="fas fa-save"></i> 儲存調查表
    </button>
  `;
  openModal();
}

function downloadSFPdf() {
  const date = document.getElementById('sf_date')?.value || '';
  const inspector = document.getElementById('sf_inspector')?.value || '';
  const facilityEl = document.getElementById('sf_facility');
  const facilityName = facilityEl?.options[facilityEl?.selectedIndex]?.text || '─';
  const location = document.getElementById('sf_location')?.value || '';
  const grade = document.querySelector('input[name="sf_grade"]:checked')?.value || '─';
  const gradeDesc = { A:'外觀良好，功能健全', B1:'重要工程，部分受損', B2:'一般工程，1~3年內維護', B3:'一般工程，定期檢測', C1:'重要工程，緊急重建', C2:'重要工程，1年內重建', C3:'一般工程，1年內重建', C4:'一般工程，緩建', C5:'維持現況' };
  const deruD = document.getElementById('sf_deru_d')?.value || '-';
  const deruE = document.getElementById('sf_deru_e')?.value || '-';
  const deruR = document.getElementById('sf_deru_r')?.value || '-';
  const deruU = document.getElementById('sf_deru_u')?.value || '-';
  const icsGrade = document.querySelector('input[name="sf_ics_grade"]:checked')?.value || '─';
  const recommend = document.getElementById('sf_recommend')?.value || '';
  const visChecked = SF_VISUAL.filter((v,i) => document.getElementById(`sf_vis_${i}`)?.checked).join('、') || '─';
  const dmgChecked = SF_DAMAGE_REASONS.filter(v => document.getElementById(`sf_dmg_${v.replace(/[^a-z0-9]/gi,'')}`)?.checked).join('、') || '─';
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
  <title>構造物調查表（附錄二）</title>
  <style>
    body { font-family:'微軟正黑體',Arial,sans-serif; font-size:12pt; margin:20mm; color:#1e293b; }
    h2 { text-align:center; font-size:16pt; margin-bottom:6pt; }
    .sub { text-align:center; font-size:10pt; color:#475569; margin-bottom:14pt; }
    table { width:100%; border-collapse:collapse; margin-bottom:12pt; }
    th,td { border:1px solid #94a3b8; padding:5pt 8pt; }
    th { background:#f1f5f9; font-weight:700; width:130pt; }
    .section { font-weight:700; color:#7c3aed; font-size:12pt; border-left:4pt solid #7c3aed; padding-left:8pt; margin:12pt 0 6pt; }
    .grade { font-size:18pt; font-weight:900; color:#1565c0; text-align:center; padding:8pt; border:2px solid #bfdbfe; border-radius:6pt; display:inline-block; }
    .sig { display:grid; grid-template-columns:1fr 1fr 1fr; gap:10pt; margin-top:16pt; }
    .sig-box { border:1px solid #94a3b8; padding:10pt; text-align:center; }
    @media print { body { margin:12mm; } }
  </style></head><body>
  <h2>構造物調查表（附錄二）</h2>
  <div class="sub">橫流溪動物通道及周邊設施檢查效能智慧評估系統</div>
  <div class="section">基本資料</div>
  <table>
    <tr><th>調查日期</th><td>${date}</td><th>調查人員</th><td>${inspector}</td></tr>
    <tr><th>調查構造物</th><td>${facilityName}</td><th>位置/里程</th><td>${location}</td></tr>
  </table>
  <div class="section">外觀檢視</div>
  <table><tr><th>損壞狀況</th><td>${visChecked}</td></tr></table>
  <div class="section">損壞原因</div>
  <table><tr><th>判斷原因</th><td>${dmgChecked}</td></tr></table>
  <div class="section">功能分級 &amp; DER&amp;U 評分</div>
  <table>
    <tr><th>功能分級</th><td><span class="grade">${grade}</span> ${gradeDesc[grade]||''}</td></tr>
    <tr><th>D（損壞程度）</th><td>${deruD}</td></tr>
    <tr><th>E（緊急性）</th><td>${deruE}</td></tr>
    <tr><th>R（修復優先）</th><td>${deruR}</td></tr>
    <tr><th>U（使用性）</th><td>${deruU}</td></tr>
    <tr><th>ICS 整體分級</th><td>${icsGrade}</td></tr>
  </table>
  <div class="section">維護建議</div>
  <table><tr><td style="white-space:pre-wrap;min-height:40pt">${recommend||'─'}</td></tr></table>
  <div class="sig">
    <div class="sig-box">調查人員簽名</div>
    <div class="sig-box">主管核閱</div>
    <div class="sig-box">填表日期：${date}</div>
  </div>
  </body></html>`;
  const win = window.open('', '_blank');
  if (!win) { showToast('請允許彈出視窗以產生PDF', 'warning'); return; }
  win.document.write(html);
  win.document.close();
  win.addEventListener('load', () => setTimeout(() => win.print(), 300));
}

function saveStructureInspectionForm(id) {
  const date = document.getElementById('sf_date')?.value;
  const facilityId = parseInt(document.getElementById('sf_facility')?.value) || null;
  if (!date || !facilityId) { showToast('請填寫檢測時間並選擇構造物', 'error'); return; }

  const sf_visual = SF_VISUAL.filter((v, i) => document.getElementById(`sf_vis_${i}`)?.checked);
  const sf_dmgReasons = [...SF_DAMAGE_REASONS.filter(v => document.getElementById(`sf_dmg_${v.replace(/[^a-z0-9]/gi,'')}`)?.checked),
    document.getElementById('sf_dmg_other')?.checked ? '其他' : null].filter(Boolean);
  const sf_deruItems = [0,1,2].map(i => ({
    defectType: document.getElementById(`sf_deru_type_${i}`)?.value.trim(),
    d: parseInt(document.getElementById(`sf_deru_d_${i}`)?.value||0),
    e: parseInt(document.getElementById(`sf_deru_e_${i}`)?.value||1),
    r: parseInt(document.getElementById(`sf_deru_r_${i}`)?.value||1),
    note: document.getElementById(`sf_deru_note_${i}`)?.value.trim()
  }));
  const maxD = Math.max(...sf_deruItems.map(r=>r.d));
  const deru = DERU_MATRIX.urgency(maxD, sf_deruItems[0]?.e||1, sf_deruItems[0]?.r||1);
  const grade = document.getElementById('sf_grade')?.value || 'A';
  // A 級代表外觀良好、功能健全，DER&U 必須符合 D=0/E=1/R=1/U=1
  const gradeAdjD = grade === 'A' ? 0 : maxD;
  const gradeAdjE = grade === 'A' ? 1 : (sf_deruItems[0]?.e || 1);
  const gradeAdjR = grade === 'A' ? 1 : (sf_deruItems[0]?.r || 1);
  const gradeAdjU = grade === 'A' ? 1 : deru.u;
  const facilityName = DB.getById('facilities', facilityId)?.name || '';

  const item = {
    formType: 'professional_structure',
    facilityId, facilityName,
    date,
    inspector: document.getElementById('sf_inspector')?.value.trim(),
    sf_unit: document.getElementById('sf_unit')?.value.trim(),
    sf_no: document.getElementById('sf_no')?.value.trim(),
    sf_x: document.getElementById('sf_x')?.value,
    sf_y: document.getElementById('sf_y')?.value,
    sf_mgUnit: document.getElementById('sf_mgUnit')?.value.trim(),
    sf_county: document.getElementById('sf_county')?.value.trim(),
    sf_township: document.getElementById('sf_township')?.value.trim(),
    sf_forest: document.getElementById('sf_forest')?.value.trim(),
    sf_structType: document.getElementById('sf_structType')?.value.trim(),
    sf_dims: document.getElementById('sf_dims')?.value.trim(),
    sf_mat: document.getElementById('sf_mat')?.value.trim(),
    sf_env: {
      riverBank: document.getElementById('sf_riverBank')?.value,
      slope: document.getElementById('sf_slope')?.value,
      trail: document.getElementById('sf_trail')?.value,
      drainage: document.getElementById('sf_drain')?.value,
      trafficSign: document.getElementById('sf_trafficSign')?.value,
      safetySign: document.getElementById('sf_safetySign')?.value,
    },
    sf_visual,
    sf_dmgReasons,
    sf_grade: grade,
    sf_deruItems,
    sf_icsGrade: document.getElementById('sf_icsGrade')?.value,
    sf_treatment: document.getElementById('sf_treatment')?.value,
    sf_corridor: document.getElementById('sf_corridor')?.value,
    sf_repairWork: {
      method: document.getElementById('sf_repair_method')?.value.trim(),
      scale: document.getElementById('sf_repair_scale')?.value.trim(),
      cost: document.getElementById('sf_repair_cost')?.value,
    },
    sf_description: document.getElementById('sf_description')?.value.trim(),
    findings: document.getElementById('sf_description')?.value.trim() || `構造物調查—${grade}級`,
    action: document.getElementById('sf_treatment')?.value,
    // 優先度／狀態：優先採人工於表單選定值；未提供時依評級推算（A級良好→低，B2/B3→中，C3/B1→高，C1/C2→緊急）
    status: document.getElementById('sf_status')?.value
      || (['C1','C2','C3'].includes(grade) ? '待處理' : 'A'===grade ? '完成' : '處理中'),
    priority: document.getElementById('sf_priority')?.value
      || (['C1','C2'].includes(grade) ? '緊急' : ['C3','B1'].includes(grade) ? '高' : ['B2','B3'].includes(grade) ? '中' : '低'),
    expectedCompletion: document.getElementById('sf_expectedCompletion')?.value || '',
    completedAt: document.getElementById('sf_completedAt')?.value || '',
    deru_d: gradeAdjD, deru_e: gradeAdjE, deru_r: gradeAdjR, deru_u: gradeAdjU,
    sourceType: '專業巡查',
    photoDataUrls: _inspGetMultiPhotos('sf'),
  };

  prepareInspectionRecordForSync(item, 'professional_structure', true);
  const savedItem = id
    ? DB.update('inspections', id, item)
    : DB.insert('inspections', item);
  syncInspectionRecordToFacility(savedItem || item);
  showToast(id ? '構造物調查表已更新，並同步巡查資料管理' : '構造物調查表已新增，並同步巡查資料管理', 'success');

  syncInspFormToCloud('professional_structure', savedItem || item);
  uploadInspectionFileToDrive(savedItem || item, 'professional_structure');
  _autoCloudPush(savedItem || item);
  if (window.CloudSync?.isOnline) {
    setTimeout(() => CloudSync.push(DB.load(), { manual: true }), 300);
  }
  document.getElementById('modal').style.maxWidth = '';
  closeModal();
  if (window._facAfterInspectionSave) { const cb=window._facAfterInspectionSave; window._facAfterInspectionSave=null; setTimeout(cb,80); }
  else { renderInspection(); }
}

/* ════════════════════════════════════════════════════════════════
   附錄三  專業性巡查表單 — 魚道檢核表
   ════════════════════════════════════════════════════════════════ */
const FW_ITEMS = [
  '魚道本體結構破損',
  '魚道本體或出入口土砂淤積',
  '魚道本體或出入口水位差過大',
  '魚道斷流、流速過小或過大',
];
const FW_GRADES = ['B1-I（例行維護）','B1-II（三年內處理）','B1-III（一年內處理）','B1-IV（緊急重建）'];

function openFishwayForm(facilityId = null, id = null) {
  const rec = id ? DB.getById('inspections', id) : null;
  const facs = DB.getAll('facilities').filter(f => /魚道|防砂/.test(f.type||'') || !facilityId);
  const allFacs = DB.getAll('facilities');
  const preFac = facilityId ? DB.getById('facilities', Number(facilityId)) : null;
  const saved = rec || {};

  document.getElementById('modal').style.maxWidth = '860px';
  document.getElementById('modalTitle').textContent = id ? '編輯魚道檢核表（附錄三）' : '新增魚道檢核表（附錄三）';
  document.getElementById('modalBody').innerHTML = `
    <div style="font-size:13px;color:#0f766e;background:#f0fdfa;border:1px solid #99f6e4;border-radius:6px;padding:8px 12px;margin-bottom:14px">
      <i class="fas fa-fish"></i> 依據橫流溪重要設施維護管理計畫 附錄三 專業性巡查表單—魚道檢核表
    </div>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:12px">
      <div class="form-group"><label>檢測時間 *</label>
        <input id="fw_date" type="date" value="${saved.date||new Date().toISOString().split('T')[0]}">
      </div>
      <div class="form-group"><label>檢測人員</label>
        <input id="fw_inspector" type="text" value="${inspectionEscape(saved.inspector||'')}">
      </div>
      <div class="form-group"><label>檢測單位</label>
        <input id="fw_unit" type="text" value="${inspectionEscape(saved.fw_unit||'')}">
      </div>
      <div class="form-group"><label>檢測編號</label>
        <input id="fw_no" type="text" value="${inspectionEscape(saved.fw_no||'')}">
      </div>
      <div class="form-group" style="grid-column:span 2"><label>關聯魚道設施 *</label>
        <select id="fw_facility">
          <option value="">請選擇魚道</option>
          ${allFacs.map(f=>`<option value="${f.id}" ${(saved.facilityId||Number(facilityId))==f.id?'selected':''}>${inspectionEscape(f.name)}</option>`).join('')}
        </select>
      </div>
      <div class="form-group"><label>魚道種類</label>
        <input id="fw_type" type="text" value="${inspectionEscape(saved.fw_fishwayType||preFac?.subType||'')}">
      </div>
      <div class="form-group"><label>TWD97 X</label>
        <input id="fw_x" type="number" value="${saved.fw_x||preFac?.twd97x||''}">
      </div>
      <div class="form-group"><label>TWD97 Y</label>
        <input id="fw_y" type="number" value="${saved.fw_y||preFac?.twd97y||''}">
      </div>
    </div>

    <!-- DER&U 四項目表 -->
    <div style="font-size:13px;font-weight:700;color:#0f766e;margin-bottom:8px">魚道進階定量檢測 DER&U</div>
    <div style="overflow-x:auto;border:1px solid #99f6e4;border-radius:8px;margin-bottom:12px">
      <table style="width:100%;border-collapse:collapse;min-width:580px">
        <thead>
          <tr style="background:#f0fdfa">
            <th style="padding:8px 10px;text-align:center;font-size:12px;color:#0f766e;width:40px">項目</th>
            <th style="padding:8px 10px;text-align:left;font-size:12px;color:#0f766e">劣化型態</th>
            <th style="padding:8px 10px;text-align:center;font-size:12px;color:#0f766e;width:70px">D</th>
            <th style="padding:8px 10px;text-align:center;font-size:12px;color:#0f766e;width:70px">E</th>
            <th style="padding:8px 10px;text-align:center;font-size:12px;color:#0f766e;width:70px">R</th>
            <th style="padding:8px 10px;text-align:left;font-size:12px;color:#0f766e">說明</th>
          </tr>
        </thead>
        <tbody>
          ${FW_ITEMS.map((name,i) => {
            const drow = (saved.fw_deruItems||[])[i] || {};
            return `
          <tr style="border-top:1px solid #d1fae5">
            <td style="padding:8px 10px;text-align:center;font-size:13px;font-weight:700;color:#0f766e">${i+1}</td>
            <td style="padding:8px 10px;font-size:12px;color:#0f172a">${name}</td>
            <td style="padding:6px 8px">
              <select id="fw_d_${i}" style="width:100%;font-size:12px;border:1px solid #99f6e4;border-radius:4px;padding:4px">
                ${[0,1,2,3,4].map(v=>`<option ${(drow.d||0)==v?'selected':''}>${v}</option>`).join('')}
              </select>
            </td>
            <td style="padding:6px 8px">
              <select id="fw_e_${i}" style="width:100%;font-size:12px;border:1px solid #99f6e4;border-radius:4px;padding:4px">
                ${[1,2,3,4].map(v=>`<option ${(drow.e||1)==v?'selected':''}>${v}</option>`).join('')}
              </select>
            </td>
            <td style="padding:6px 8px">
              <select id="fw_r_${i}" style="width:100%;font-size:12px;border:1px solid #99f6e4;border-radius:4px;padding:4px">
                ${[1,2,3,4].map(v=>`<option ${(drow.r||1)==v?'selected':''}>${v}</option>`).join('')}
              </select>
            </td>
            <td style="padding:6px 8px">
              <input type="text" id="fw_note_${i}" value="${inspectionEscape(drow.note||'')}"
                style="width:100%;border:1px solid #99f6e4;border-radius:4px;padding:4px 6px;font-size:12px">
            </td>
          </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px">
      <div class="form-group"><label>魚道進階分級</label>
        <select id="fw_grade">
          ${FW_GRADES.map(v=>`<option ${(saved.fw_grade||FW_GRADES[0])===v?'selected':''}>${v}</option>`).join('')}
        </select>
      </div>
      <div class="form-group"><label>處理維護建議</label>
        <select id="fw_treatment">
          ${['例行處理維護','三年內必須處理維護','一年內必須處理維護','緊急處理重建'].map(v=>`<option ${(saved.fw_treatment||'例行處理維護')===v?'selected':''}>${v}</option>`).join('')}
        </select>
      </div>
      <div class="form-group"><label>處理工法—工法</label>
        <input id="fw_repair_method" type="text" value="${inspectionEscape(saved.fw_repairWork?.method||'')}">
      </div>
      <div class="form-group"><label>預估經費（仟元）</label>
        <input id="fw_repair_cost" type="number" value="${saved.fw_repairWork?.cost||''}">
      </div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px">
      <div class="form-group"><label>魚道水中攝影</label>
        <div style="display:flex;gap:12px;margin-top:6px">
          ${['有魚','無魚','未攝影'].map(v=>`
            <label style="display:flex;align-items:center;gap:5px;font-size:14px;cursor:pointer">
              <input type="radio" name="fw_fish" value="${v}" ${(saved.fw_fishPresent||'未攝影')===v?'checked':''}> ${v}
            </label>`).join('')}
        </div>
      </div>
      <div class="form-group"><label>備註</label>
        <input id="fw_remark" type="text" value="${inspectionEscape(saved.fw_remark||'')}">
      </div>
    </div>
    <div class="form-group"><label>現況描述</label>
      <textarea id="fw_description" rows="3">${inspectionEscape(saved.fw_description||saved.findings||'')}</textarea>
    </div>
    ${renderMultiPhotoPanel('fw', saved.photoDataUrls||[], 4)}
    <div style="margin-top:8px;padding:8px 12px;background:#f0fdfa;border-radius:6px;font-size:12px;color:#0f766e">
      <i class="fas fa-cloud-upload-alt"></i> 儲存後自動同步至雲端資料庫，並連動工程設施管理。
    </div>
  `;
  document.getElementById('modalFooter').innerHTML = `
    <button class="btn btn-outline" onclick="closeModal();document.getElementById('modal').style.maxWidth=''">關閉</button>
    <button class="btn btn-outline" onclick="downloadFWPdf()" style="color:#7c3aed;border-color:#7c3aed">
      <i class="fas fa-file-pdf"></i> 下載 PDF
    </button>
    <button class="btn btn-primary" onclick="saveFishwayForm(${id||'null'})" style="background:#0f766e;border-color:#0f766e">
      <i class="fas fa-save"></i> 儲存檢核表
    </button>
  `;
  openModal();
}

function downloadFWPdf() {
  const date = document.getElementById('fw_date')?.value || '';
  const inspector = document.getElementById('fw_inspector')?.value || '';
  const facilityEl = document.getElementById('fw_facility');
  const facilityName = facilityEl?.options[facilityEl?.selectedIndex]?.text || '─';
  const grade = document.querySelector('input[name="fw_grade"]:checked')?.value || '─';
  const fishPresent = document.querySelector('input[name="fw_fish"]:checked')?.value || '─';
  const desc = document.getElementById('fw_description')?.value || '';
  const FW_DERU_NAMES = ['結構破損','土砂淤積','水位差異','斷流'];
  const deruRows = FW_DERU_NAMES.map((name, i) => {
    const d = document.getElementById(`fw_d_${i}`)?.value || '-';
    const e = document.getElementById(`fw_e_${i}`)?.value || '-';
    const r = document.getElementById(`fw_r_${i}`)?.value || '-';
    const note = document.getElementById(`fw_note_${i}`)?.value || '';
    return `<tr><td style="font-weight:700">${name}</td><td>${d}</td><td>${e}</td><td>${r}</td><td>${note}</td></tr>`;
  }).join('');
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
  <title>魚道檢核表（附錄三）</title>
  <style>
    body { font-family:'微軟正黑體',Arial,sans-serif; font-size:12pt; margin:20mm; color:#1e293b; }
    h2 { text-align:center; font-size:16pt; margin-bottom:6pt; }
    .sub { text-align:center; font-size:10pt; color:#475569; margin-bottom:14pt; }
    table { width:100%; border-collapse:collapse; margin-bottom:12pt; }
    th,td { border:1px solid #94a3b8; padding:5pt 8pt; }
    th { background:#f0fdfa; font-weight:700; }
    .section { font-weight:700; color:#0f766e; font-size:12pt; border-left:4pt solid #0f766e; padding-left:8pt; margin:12pt 0 6pt; }
    .grade { font-size:18pt; font-weight:900; color:#0f766e; text-align:center; padding:8pt; border:2px solid #99f6e4; border-radius:6pt; display:inline-block; }
    .sig { display:grid; grid-template-columns:1fr 1fr 1fr; gap:10pt; margin-top:16pt; }
    .sig-box { border:1px solid #94a3b8; padding:10pt; text-align:center; }
    @media print { body { margin:12mm; } }
  </style></head><body>
  <h2>魚道檢核表（附錄三）</h2>
  <div class="sub">橫流溪動物通道及周邊設施檢查效能智慧評估系統</div>
  <div class="section">基本資料</div>
  <table>
    <tr><th style="width:130pt">檢核日期</th><td>${date}</td><th style="width:130pt">檢核人員</th><td>${inspector}</td></tr>
    <tr><th>魚道設施</th><td colspan="3">${facilityName}</td></tr>
  </table>
  <div class="section">DER&amp;U 四項檢核評估</div>
  <table>
    <thead><tr><th>項目</th><th>D 損壞</th><th>E 緊急</th><th>R 修復</th><th>說明</th></tr></thead>
    <tbody>${deruRows}</tbody>
  </table>
  <div class="section">整體評估</div>
  <table>
    <tr><th style="width:130pt">維護等級</th><td><span class="grade">${grade}</span></td></tr>
    <tr><th>魚類通行觀察</th><td>${fishPresent}</td></tr>
  </table>
  <div class="section">現場描述</div>
  <table><tr><td style="white-space:pre-wrap;min-height:50pt">${desc||'─'}</td></tr></table>
  <div class="sig">
    <div class="sig-box">檢核人員簽名</div>
    <div class="sig-box">主管核閱</div>
    <div class="sig-box">填表日期：${date}</div>
  </div>
  </body></html>`;
  const win = window.open('', '_blank');
  if (!win) { showToast('請允許彈出視窗以產生PDF', 'warning'); return; }
  win.document.write(html);
  win.document.close();
  win.addEventListener('load', () => setTimeout(() => win.print(), 300));
}

function saveFishwayForm(id) {
  const date = document.getElementById('fw_date')?.value;
  const facilityId = parseInt(document.getElementById('fw_facility')?.value) || null;
  if (!date || !facilityId) { showToast('請填寫檢測時間並選擇魚道設施', 'error'); return; }

  const fw_deruItems = FW_ITEMS.map((name,i) => ({
    name,
    d: parseInt(document.getElementById(`fw_d_${i}`)?.value||0),
    e: parseInt(document.getElementById(`fw_e_${i}`)?.value||1),
    r: parseInt(document.getElementById(`fw_r_${i}`)?.value||1),
    note: document.getElementById(`fw_note_${i}`)?.value.trim()
  }));
  const maxD = Math.max(...fw_deruItems.map(r=>r.d));
  const maxE = Math.max(...fw_deruItems.map(r=>r.e));
  const maxR = Math.max(...fw_deruItems.map(r=>r.r));
  const deru = DERU_MATRIX.urgency(maxD, maxE, maxR);
  const gradeStr = document.getElementById('fw_grade')?.value || FW_GRADES[0];
  const facilityName = DB.getById('facilities', facilityId)?.name || '';

  const item = {
    formType: 'professional_fishway',
    facilityId, facilityName,
    date,
    inspector: document.getElementById('fw_inspector')?.value.trim(),
    fw_unit: document.getElementById('fw_unit')?.value.trim(),
    fw_no: document.getElementById('fw_no')?.value.trim(),
    fw_fishwayType: document.getElementById('fw_type')?.value.trim(),
    fw_x: document.getElementById('fw_x')?.value,
    fw_y: document.getElementById('fw_y')?.value,
    fw_deruItems,
    fw_grade: gradeStr,
    fw_treatment: document.getElementById('fw_treatment')?.value,
    fw_repairWork: {
      method: document.getElementById('fw_repair_method')?.value.trim(),
      cost: document.getElementById('fw_repair_cost')?.value,
    },
    fw_fishPresent: document.querySelector('input[name="fw_fish"]:checked')?.value || '未攝影',
    fw_remark: document.getElementById('fw_remark')?.value.trim(),
    fw_description: document.getElementById('fw_description')?.value.trim(),
    findings: document.getElementById('fw_description')?.value.trim() || `魚道檢核—${gradeStr}`,
    action: document.getElementById('fw_treatment')?.value,
    status: gradeStr.includes('IV') ? '待處理' : gradeStr.includes('I（') ? '完成' : '處理中',
    priority: gradeStr.includes('IV') ? '緊急' : gradeStr.includes('III') ? '高' : '中',
    deru_d: maxD, deru_e: maxE, deru_r: maxR, deru_u: deru.u,
    sourceType: '專業巡查',
    photoDataUrls: _inspGetMultiPhotos('fw'),
  };

  prepareInspectionRecordForSync(item, 'professional_fishway', true);
  const savedItem = id
    ? DB.update('inspections', id, item)
    : DB.insert('inspections', item);
  syncInspectionRecordToFacility(savedItem || item);
  showToast(id ? '魚道檢核表已更新，並同步巡查資料管理' : '魚道檢核表已新增，並同步巡查資料管理', 'success');

  syncInspFormToCloud('professional_fishway', savedItem || item);
  uploadInspectionFileToDrive(savedItem || item, 'professional_fishway');
  _autoCloudPush(savedItem || item);
  if (window.CloudSync?.isOnline) {
    setTimeout(() => CloudSync.push(DB.load(), { manual: true }), 300);
  }
  document.getElementById('modal').style.maxWidth = '';
  closeModal();
  if (window._facAfterInspectionSave) { const cb=window._facAfterInspectionSave; window._facAfterInspectionSave=null; setTimeout(cb,80); }
  else { renderInspection(); }
}

/* ════════════════════════════════════════════════════════════════
   維護完工回報表單
   流程：巡查異常 → 維護施工 → 填寫本表單（含前後照片＋DER&U）
        → 儲存後設施狀態自動更新、維護案件標為完成
   ════════════════════════════════════════════════════════════════ */
function openMaintenanceCompletionForm(facilityId = null, id = null) {
  const rec = id ? DB.getById('inspections', id) : null;
  const facs = DB.getAll('facilities');
  const _preFacId = facilityId ? Number(facilityId) : null;
  const mc = rec || {};
  const _activeFacId = _preFacId || Number(mc.facilityId || 0) || null;

  const overlay = document.getElementById('modalOverlay');
  const titleEl = document.getElementById('modalTitle');
  const bodyEl  = document.getElementById('modalBody');
  const footEl  = document.getElementById('modalFooter');
  const modal   = document.getElementById('modal');
  if (!overlay || !bodyEl) return;
  if (modal) modal.style.maxWidth = '820px';
  if (titleEl) titleEl.innerHTML = '<i class="fas fa-screwdriver-wrench" style="color:#7c3aed;margin-right:8px"></i>維護完工回報表單';

  // 對應待處理的巡查異常（選設施後列出 U≥2 的巡查）
  const relatedInsp = _activeFacId
    ? DB.getAll('inspections').filter(i => Number(i.facilityId) === _activeFacId && (i.deru_u >= 2 || i.status !== '完成'))
    : [];

  bodyEl.innerHTML = `
    <div style="font-size:13px;color:#6d28d9;background:#faf5ff;border:1px solid #ddd6fe;border-radius:8px;padding:10px 14px;margin-bottom:14px">
      <i class="fas fa-info-circle" style="margin-right:6px"></i>
      填寫維護完工後的現況，儲存後設施狀態將依照更新後 DER&U 自動更新。建議搭配維護前、施工中、完工後各1至2張照片。
    </div>
    <div class="form-grid">
      <div class="form-group full-width">
        <label>設施名稱 *</label>
        <select id="mc_facility" onchange="_mcLoadRelated(this.value)">
          <option value="">請選擇設施</option>
          ${facs.map(f => `<option value="${f.id}" ${Number(_activeFacId) === f.id ? 'selected' : ''}>${inspectionEscape(f.name)}</option>`).join('')}
        </select>
      </div>
      <div class="form-group"><label>維護完工日期 *</label><input id="mc_date" type="date" value="${mc.date || new Date().toISOString().split('T')[0]}"></div>
      <div class="form-group"><label>維護執行人員 / 單位</label><input id="mc_executor" type="text" placeholder="承辦廠商或施工人員" value="${inspectionEscape(mc.executor || mc.inspector || '')}"></div>
      <div class="form-group"><label>填表人員 *</label><input id="mc_reporter" type="text" placeholder="填寫本表單之人員姓名" value="${inspectionEscape(mc.reporter || '')}"></div>
      <div class="form-group"><label>填表單位</label><input id="mc_reportUnit" type="text" placeholder="填表所屬單位或機關" value="${inspectionEscape(mc.reportUnit || '')}"></div>
      <div class="form-group"><label>填表時間</label><input id="mc_reportTime" type="datetime-local" value="${mc.reportTime || new Date().toISOString().slice(0,16)}"></div>
    </div>

    <!-- 對應異常巡查 -->
    <div class="form-group" id="mc_related_wrap" style="margin-bottom:12px">
      <label>對應異常巡查（選填，可多選）</label>
      <div id="mc_related_list" style="display:flex;flex-wrap:wrap;gap:8px;margin-top:6px;font-size:13px">
        ${relatedInsp.length
          ? relatedInsp.map(i => `
            <label style="display:flex;align-items:center;gap:5px;background:#fff;border:1px solid #ddd6fe;border-radius:7px;padding:5px 10px;cursor:pointer">
              <input type="checkbox" name="mc_rel" value="${i.id}" ${(mc.relatedInspIds||[]).includes(i.id)?'checked':''}>
              ${inspectionEscape(i.date || '')} ${inspectionEscape((i.findings||'').slice(0,24))}
            </label>`).join('')
          : '<span style="color:#94a3b8">（選擇設施後顯示待處理的異常巡查）</span>'}
      </div>
    </div>

    <div class="form-group full-width">
      <label>維護前現況描述 *</label>
      <textarea id="mc_before" rows="2" placeholder="描述維護前的問題狀況，如：格框消能設施基礎淘空，約 24m²">${inspectionEscape(mc.beforeDesc || '')}</textarea>
    </div>
    <div class="form-group full-width">
      <label>維護工法與施工內容 *</label>
      <textarea id="mc_method" rows="2" placeholder="說明採用的工法，如：基礎修補灌漿，補設格框護腳">${inspectionEscape(mc.method || mc.action || '')}</textarea>
    </div>
    <div class="form-group full-width">
      <label>維護後現況說明 *</label>
      <textarea id="mc_after" rows="2" placeholder="完工後現場狀況，如：基礎修補完成，外觀良好，功能恢復正常">${inspectionEscape(mc.afterDesc || mc.findings || '')}</textarea>
    </div>

    <!-- DER&U 更新值 -->
    <div style="background:#faf5ff;border:1px solid #ddd6fe;border-radius:8px;padding:14px;margin-bottom:12px">
      <div style="font-size:14px;font-weight:800;color:#6d28d9;margin-bottom:10px">
        <i class="fas fa-chart-bar" style="margin-right:6px"></i>維護完工後 DER&U 評定
        <span style="font-size:11px;font-weight:400;color:#94a3b8;margin-left:8px">U=1 → 設施狀態自動更新為「正常」</span>
      </div>
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px">
        ${[['D','deru_d','損壞程度',[[0,'D0 無明顯損壞'],[1,'D1 輕微劣化'],[2,'D2 中度損壞'],[3,'D3 明顯損壞'],[4,'D4 嚴重損壞']]],
           ['E','deru_e','影響範圍',[[1,'E1 局部'],[2,'E2 較大範圍'],[3,'E3 大範圍'],[4,'E4 全面']]],
           ['R','deru_r','風險影響',[[1,'R1 低'],[2,'R2 中低'],[3,'R3 中高'],[4,'R4 高']]],
           ['U','deru_u','急迫程度',[[1,'U1 定期巡查'],[2,'U2 優先維護'],[3,'U3 儘速處理'],[4,'U4 緊急搶修']]]
          ].map(([lbl,id,desc,opts]) => `
          <div>
            <label style="font-size:13px;font-weight:700;color:#6d28d9">${lbl}（${desc}）</label>
            <select id="mc_${id}" style="width:100%;margin-top:4px;font-size:13px">
              ${opts.map(([value, label]) => {
                const selectedValue = Number(mc[id] ?? (id === 'deru_d' ? 0 : 1));
                return `<option value="${value}" ${selectedValue === Number(value) ? 'selected' : ''}>${label}</option>`;
              }).join('')}
            </select>
          </div>`).join('')}
      </div>
      <div id="mc_deru_preview" style="margin-top:10px;font-size:13px;color:#6d28d9;font-weight:700"></div>
    </div>

    <div class="form-group full-width">
      <label>後續追蹤建議</label>
      <textarea id="mc_followup" rows="2" placeholder="下次複查時間或注意事項，如：3個月後複查基礎穩定狀況">${inspectionEscape(mc.followUp || '維護完工後3個月內安排複查，確認修補效果')}</textarea>
    </div>

    <!-- 照片 -->
    <div style="font-size:14px;font-weight:800;color:#0f172a;margin-bottom:6px">
      <i class="fas fa-camera" style="color:#7c3aed;margin-right:6px"></i>維護前後照片（3–4 張）
    </div>
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:4px">
      ${['維護前','施工中','完工後-1','完工後-2'].map((lbl,i) => `
        <div style="font-size:11px;color:#6d28d9;text-align:center;font-weight:700;margin-bottom:2px">${lbl}</div>`).join('')}
    </div>
    ${renderMultiPhotoPanel('mc', Array.isArray(mc.photos)?mc.photos:[], 4)}
    <div style="font-size:11px;color:#94a3b8;margin-top:4px">建議順序：維護前 → 施工中 → 完工後-1 → 完工後-2</div>
  `;
  footEl.innerHTML = `
    <button class="btn btn-outline" onclick="closeModal(); document.getElementById('modal').style.maxWidth=''">取消</button>
    <button class="btn btn-primary" style="background:#7c3aed;border-color:#7c3aed"
      onclick="saveMaintenanceCompletionForm(${id || 'null'})">
      <i class="fas fa-save"></i> 儲存完工回報
    </button>`;
  overlay.style.display = 'flex';

  // DER&U 即時預覽
  ['mc_deru_d','mc_deru_e','mc_deru_r','mc_deru_u'].forEach(sel => {
    document.getElementById(sel)?.addEventListener('change', _mcDeruPreview);
  });
  _mcDeruPreview();
}

function _mcDeruPreview() {
  const d = Number(document.getElementById('mc_deru_d')?.value || 0);
  const e = Number(document.getElementById('mc_deru_e')?.value || 1);
  const r = Number(document.getElementById('mc_deru_r')?.value || 1);
  const u = Number(document.getElementById('mc_deru_u')?.value || 1);
  const el = document.getElementById('mc_deru_preview');
  if (!el) return;
  const statusColor = u >= 4 ? '#b91c1c' : u >= 2 ? '#d97706' : '#16a34a';
  const statusLabel = u >= 4 ? '損壞' : u >= 2 ? '需維護' : '正常 ✓';
  el.innerHTML = `評定結果：D${d}/E${e}/R${r}・U${u} → 設施狀態將更新為 <b style="color:${statusColor}">${statusLabel}</b>`;
}

function _mcLoadRelated(facId) {
  const list = document.getElementById('mc_related_list');
  if (!list) return;
  const related = DB.getAll('inspections').filter(i => Number(i.facilityId) === Number(facId) && (i.deru_u >= 2 || i.status !== '完成'));
  list.innerHTML = related.length
    ? related.map(i => `
        <label style="display:flex;align-items:center;gap:5px;background:#fff;border:1px solid #ddd6fe;border-radius:7px;padding:5px 10px;cursor:pointer">
          <input type="checkbox" name="mc_rel" value="${i.id}">
          ${inspectionEscape(i.date || '')} ${inspectionEscape((i.findings||'').slice(0,28))}
        </label>`).join('')
    : '<span style="color:#94a3b8">（此設施目前無待處理異常巡查）</span>';
}

function saveMaintenanceCompletionForm(id) {
  const date = document.getElementById('mc_date')?.value;
  if (!date) { showToast('請填寫維護完工日期', 'error'); return; }
  const facilityId = parseInt(document.getElementById('mc_facility')?.value) || null;
  if (!facilityId) { showToast('請選擇設施名稱', 'error'); return; }
  const facilityName = DB.getById('facilities', facilityId)?.name || '';
  const beforeDesc = document.getElementById('mc_before')?.value.trim() || '';
  const method     = document.getElementById('mc_method')?.value.trim() || '';
  const afterDesc  = document.getElementById('mc_after')?.value.trim() || '';
  if (!afterDesc) { showToast('請填寫維護後現況說明', 'error'); return; }

  const d = Number(document.getElementById('mc_deru_d')?.value || 0);
  const e = Number(document.getElementById('mc_deru_e')?.value || 1);
  const r = Number(document.getElementById('mc_deru_r')?.value || 1);
  const u = Number(document.getElementById('mc_deru_u')?.value || 1);

  // 對應異常巡查 id
  const relatedInspIds = [...document.querySelectorAll('input[name="mc_rel"]:checked')].map(cb => Number(cb.value));

  const facStatus = u >= 4 ? '損壞' : u >= 2 ? '需維護' : '正常';
  const item = {
    formType: 'maintenance_completion',
    facilityId, facilityName, date,
    executor:    document.getElementById('mc_executor')?.value.trim() || '',
    inspector:   document.getElementById('mc_executor')?.value.trim() || '',
    reporter:    document.getElementById('mc_reporter')?.value.trim() || '',
    reportUnit:  document.getElementById('mc_reportUnit')?.value.trim() || '',
    reportTime:  document.getElementById('mc_reportTime')?.value || new Date().toISOString().slice(0,16),
    beforeDesc, method, afterDesc,
    relatedInspIds,
    followUp: document.getElementById('mc_followup')?.value.trim() || '',
    findings: `[維護完工] ${afterDesc}`,
    action: method,
    deru_d: d, deru_e: e, deru_r: r, deru_u: u,
    deru_label: `U${u} 維護完工評定`,
    status: '完成',
    priority: u >= 4 ? '緊急' : u >= 3 ? '高' : u >= 2 ? '中' : '低',
    photoDataUrls: _inspGetMultiPhotos('mc'),
    photos: _inspGetMultiPhotos('mc')
  };

  prepareInspectionRecordForSync(item, 'maintenance_completion', true);
  const savedItem = id
    ? DB.update('inspections', id, item)
    : DB.insert('inspections', item);

  // 同步設施狀態
  syncInspectionRecordToFacility(savedItem || item);

  // 將對應的待處理巡查標為完成
  relatedInspIds.forEach(rid => {
    const rel = DB.getById('inspections', rid);
    if (rel && rel.status !== '完成') {
      DB.update('inspections', rid, {
        status: '完成',
        completedAt: date,
        maintenanceLinkedId: (savedItem || item).id
      });
    }
  });

  showToast(`✅ 維護完工回報已儲存，設施狀態更新為「${facStatus}」`, 'success');

  // Firebase 推播
  _autoCloudPush(savedItem || item);
  if (window.CloudSync?.isOnline) {
    setTimeout(() => CloudSync.push(DB.load(), { manual: true }), 300);
  }

  document.getElementById('modal').style.maxWidth = '';
  closeModal();
  if (window._facAfterInspectionSave) {
    const cb = window._facAfterInspectionSave; window._facAfterInspectionSave = null; setTimeout(cb, 80);
  } else { renderInspection(); }
}

/* ════════════════════════════════════════════════════════════════
   雲端同步（POST 至 Flask 後端）
   ════════════════════════════════════════════════════════════════ */
async function syncInspFormToCloud(formType, data) {
  try {
    const endpoint = formType === 'professional_structure'
      ? '/api/v1/structure-inspection'
      : '/api/v1/patrol-records';
    const payload = formType === 'professional_structure'
      ? {
          inspection_id: `STR-${Date.now()}`,
          structure_id: String(data.facilityId || ''),
          inspection_date: data.date,
          inspection_type: '專業性定期巡查',
          inspector_name: data.inspector || '',
          condition_grade: data.sf_grade || 'A',
          deterioration_degree: data.deru_d || 0,
          risk_influence: data.deru_r || 1,
          overall_score: data.deru_u || 1,
          findings: data.findings || '',
          defect_description: (data.sf_visual||[]).join('、'),
          repair_recommendation: data.action || '',
          urgency_level: data.priority || '低',
          repair_status: data.status || '完成',
        }
      : {
          patrol_id: `PAT-${Date.now()}`,
          segment_id: 'HL-MAIN',
          patrol_date: data.date,
          patrol_time_start: '',
          patrol_time_end: '',
          weather: '',
          patrol_personnel: data.inspector || '',
          patrol_method: formType === 'general_periodic' ? '一般性定期巡查' : '魚道專業巡查',
          abnormality_found: data.status !== '完成',
          summary: data.findings || '',
          photos_count: 0,
        };
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    if (data?.id) {
      DB.update('inspections', data.id, {
        localApiSyncStatus: '已同步',
        localApiSyncedAt: new Date().toISOString()
      });
    }
    console.log('[Cloud] 同步成功:', formType);
  } catch (err) {
    if (data?.id) {
      DB.update('inspections', data.id, {
        localApiSyncStatus: '本機暫存',
        localApiSyncError: err.message,
        localApiSyncedAt: new Date().toISOString()
      });
    }
    console.warn('[Cloud] 同步失敗（本機資料已儲存）:', err.message);
  }
}
