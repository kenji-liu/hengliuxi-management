// 巡查紀錄模組

const INSPECTION_STATUS = ['待處理', '處理中', '完成'];
const INSPECTION_PRIORITY = ['低', '中', '高', '緊急'];

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
const FORESTRY_PATROL_BASE = '非橫流溪資料/03_行政簡報與雜項/橫流溪林業巡護管理/';
const FORESTRY_PATROL_DOCS = [
  { year: '114', type: '計畫核定本', file: '南勢-114年社區林業計畫核定本.pdf' },
  { year: '114', type: '結案計畫報表', file: '南勢-114年結案計畫報表.pdf' },
  { year: '113', type: '計畫核定本', file: '南勢-113年社區林業計畫核定本.pdf' },
  { year: '113', type: '結案計畫報表', file: '南勢-113年結案計畫報表.pdf' },
  { year: '113', type: '成果報告', file: '南勢-113年社區林業成果報告.pdf' },
  { year: '112', type: '計畫核定本', file: '南勢-112年社區林業計畫核定本.pdf' },
  { year: '112', type: '結案計畫報表', file: '南勢-112年結案計畫報表.pdf' },
  { year: '111', type: '計畫核定本', file: '南勢-111年社區林業計畫核定本.pdf' },
  { year: '111', type: '結案計畫報表', file: '南勢-111年結案計畫報表.pdf' },
  { year: '110', type: '計畫核定本', file: '南勢-110年社區林業計畫核定本.pdf' },
  { year: '110', type: '結案計畫報表', file: '南勢-110年結案計畫報表.pdf' },
  { year: '106', type: '計畫核定本', file: '1.106南勢社區林業計畫V2.pdf' },
  { year: '106', type: '成果報告', file: '南勢-成果報告1061222第5版.pdf' }
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
  const text = `${item.sourceType || ''} ${item.type || ''} ${item.inspector || ''} ${item.profession || ''}`;
  if (text.includes('專業') || text.includes('技師') || text.includes('DER&U') || text.includes('工程')) return 'professional';
  if (text.includes('護管') || text.includes('巡護') || text.includes('林班') || text.includes('日常')) return 'ranger';
  return 'general';
}

function inspectionRecordTypeLabel(type) {
  return {
    general: '一般巡查紀錄',
    professional: '專業巡查紀錄',
    ranger: '護管員巡查紀錄'
  }[type] || '一般巡查紀錄';
}

/* ══════════════════════════════════════════════════════════════
   巡查資料管理 — 獨立頁面
   ══════════════════════════════════════════════════════════════ */

function renderInspectionMgmtPage() {
  syncDeruHistoryIntoInspectionRecords();
  document.getElementById('contentArea').innerHTML =
    renderManualInspectionGuide() +
    renderInspectionDataManagement(true);
  // 初始化篩選監聽（已在 renderInspectionDataManagement 內 setTimeout 處理）
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

let inspDataTab = 'general'; // 'all' | 'general' | 'professional' | 'ranger'

const INSP_TYPE_META = {
  general:      { label:'一般巡查',   color:'#1565c0', bg:'#eff6ff', border:'#bfdbfe', icon:'fa-clipboard-check' },
  professional: { label:'專業巡查',   color:'#9a3412', bg:'#fff7ed', border:'#fed7aa', icon:'fa-hard-hat' },
  ranger:       { label:'護管員巡查', color:'#166534', bg:'#f0fdf4', border:'#bbf7d0', icon:'fa-shield-halved' }
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
    summary: '114年10月27日橫流溪工程設施一般性定期巡查表單，記錄設施外觀現況、異常狀況與現場照片。',
    tags: ['定期巡查', '114年', '10月'],
    path: '01_工程設施維護與資料/巡查紀錄/一般性定期巡查表單114.1027.pdf'
  },
  {
    id: 'gi-02',
    title: '一般性定期巡查表單 114年11月26日',
    date: '114年11月', dateSort: '2025-11',
    type: '一般性定期巡查表單', format: 'PDF',
    size: '1.4 MB',
    summary: '114年11月26日橫流溪工程設施一般性定期巡查表單，含設施外觀檢視、裂縫破損記錄、現況照片與建議處理。',
    tags: ['定期巡查', '114年', '11月'],
    path: '01_工程設施維護與資料/巡查紀錄/一般性定期巡查表單1141126.pdf'
  },
  {
    id: 'gi-03',
    title: '一般性定期巡查表單 114年12月30日',
    date: '114年12月', dateSort: '2025-12',
    type: '一般性定期巡查表單', format: 'PDF',
    size: '1.7 MB',
    summary: '114年12月30日橫流溪工程設施一般性定期巡查表單，含設施外觀檢視記錄與現場照片。',
    tags: ['定期巡查', '114年', '12月'],
    path: '01_工程設施維護與資料/巡查紀錄/一般性定期巡查表單1141230.pdf'
  },
  {
    id: 'gi-04',
    title: '一般性定期巡查表單 115年1月',
    date: '115年1月', dateSort: '2026-01',
    type: '一般性定期巡查表單', format: 'PDF',
    size: '736 KB',
    summary: '115年1月份橫流溪工程設施一般性定期巡查表單，記錄各設施現況、異常判斷與建議處置，含現場照片。',
    tags: ['定期巡查', '115年', '1月'],
    path: '01_工程設施維護與資料/巡查紀錄/一般性定期巡查表單11501.pdf'
  },
  {
    id: 'gi-05',
    title: '一般性定期巡查表單 115年2月',
    date: '115年2月', dateSort: '2026-02',
    type: '一般性定期巡查表單', format: 'PDF',
    size: '260 KB',
    summary: '115年2月份橫流溪工程設施一般性定期巡查表單，含設施外觀檢視與現況照片。',
    tags: ['定期巡查', '115年', '2月'],
    path: '01_工程設施維護與資料/巡查紀錄/一般性定期巡查表單11502.pdf'
  },
  {
    id: 'gi-06',
    title: '一般性定期巡查表單 115年3月',
    date: '115年3月', dateSort: '2026-03',
    type: '一般性定期巡查表單', format: 'PDF',
    size: '256 KB',
    summary: '115年3月份橫流溪工程設施一般性定期巡查表單。',
    tags: ['定期巡查', '115年', '3月'],
    path: '01_工程設施維護與資料/巡查紀錄/一般性定期巡查表單11503.pdf'
  },
  {
    id: 'gi-07',
    title: '一般性定期巡查表單 115年4月',
    date: '115年4月', dateSort: '2026-04',
    type: '一般性定期巡查表單', format: 'PDF',
    size: '253 KB',
    summary: '115年4月份橫流溪工程設施一般性定期巡查表單。',
    tags: ['定期巡查', '115年', '4月'],
    path: '01_工程設施維護與資料/巡查紀錄/一般性定期巡查表單11504.pdf'
  },
  {
    id: 'gi-08',
    title: '橫流溪野溪周邊環境 115年4月份巡查紀錄',
    date: '115年4月', dateSort: '2026-04',
    type: '野溪環境巡查紀錄', format: 'PDF',
    size: '230 KB',
    summary: '115年4月份橫流溪野溪周邊環境狀況巡查紀錄，含現場照片與環境狀況說明。',
    tags: ['野溪', '周邊環境', '115年', '4月'],
    path: '01_工程設施維護與資料/巡查紀錄/橫流溪野溪周邊環境狀況115年4月份巡查紀錄.pdf'
  },
  {
    id: 'gi-09',
    title: '公文',
    date: '115年', dateSort: '2026-04',
    type: '行政公文', format: 'PPTX',
    size: '190 KB',
    summary: '相關行政公文簡報檔案。',
    tags: ['公文', '行政'],
    path: '01_工程設施維護與資料/巡查紀錄/公文.pptx'
  }
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
  // 更新右側 PDF 瀏覽器
  const rec = GENERAL_INSP_RECORDS.find(r => r.id === id);
  if (!rec) return;
  const viewer = document.getElementById('gi_pdf_viewer');
  const title  = document.getElementById('gi_pdf_title');
  const link   = document.getElementById('gi_pdf_link');
  const noPreview = document.getElementById('gi_no_preview');
  if (!viewer) return;

  if (rec.format === 'PDF') {
    viewer.src = generalInspHref(rec.path);
    viewer.style.display = 'block';
    if (noPreview) noPreview.style.display = 'none';
  } else {
    viewer.src = 'about:blank';
    viewer.style.display = 'none';
    if (noPreview) noPreview.style.display = 'flex';
    const npLink = document.getElementById('gi_no_preview_link');
    if (npLink) { npLink.href = generalInspHref(rec.path); npLink.textContent = '開啟 ' + rec.format + ' 文件'; }
  }
  if (title) title.textContent = rec.title;
  if (link)  link.href = generalInspHref(rec.path);
}

function renderGeneralInspRecords() {
  const defaultRec = GENERAL_INSP_RECORDS.find(r => r.id === _selectedGIRecord) || GENERAL_INSP_RECORDS[0];
  const defaultHref = generalInspHref(defaultRec.path);
  const isPdf = defaultRec.format === 'PDF';

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
          <i class="fas fa-up-right-from-square"></i> 新頁開啟
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
        點選左側紀錄可在右側直接瀏覽 PDF 內容與照片。
      </div>

      <!-- 左右分割：紀錄清單 + PDF 預覽 -->
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

        <!-- 右側：PDF 預覽 -->
        <div style="position:sticky;top:16px">
          <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:10px;flex-wrap:wrap">
            <div style="font-size:16px;font-weight:800;color:#0f172a" id="gi_pdf_title">${inspectionEscape(defaultRec.title)}</div>
          </div>
          <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;overflow:hidden;position:relative">
            <iframe id="gi_pdf_viewer"
              src="${isPdf ? defaultHref : 'about:blank'}"
              style="width:100%;height:780px;border:none;display:${isPdf?'block':'none'}"
              title="巡查紀錄 PDF 預覽">
            </iframe>
            <div id="gi_no_preview"
              style="height:780px;display:${isPdf?'none':'flex'};align-items:center;justify-content:center;flex-direction:column;gap:16px">
              <i class="fas fa-file-powerpoint" style="font-size:48px;color:#c2410c"></i>
              <div style="font-size:16px;color:#64748b">此格式無法在瀏覽器預覽</div>
              <a id="gi_no_preview_link" href="${defaultHref}" target="_blank" rel="noopener noreferrer"
                style="background:#c2410c;color:#fff;padding:10px 22px;border-radius:8px;font-size:15px;font-weight:700;text-decoration:none">
                開啟 ${defaultRec.format} 文件
              </a>
            </div>
          </div>
        </div>

      </div>
    </div>
  </div>`;
}

function renderInspectionDataManagement(standalone = false) {
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
  const rs   = typeStats(byType.ranger);

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
          <div style="font-size:20px;color:#475569;margin-top:8px">整合一般巡查、專業巡查與護管員巡查紀錄，依類型統整分析與清單管理。</div>
        </div>
        <button class="btn btn-primary" onclick="openInspectionForm()" style="font-size:20px;padding:14px 32px">
          <i class="fas fa-plus"></i> 新增巡查紀錄
        </button>
      </div>` : `
      <div class="card-header" style="flex-wrap:wrap;gap:8px">
        <div>
          <div style="font-size:16px;color:#64748b;margin-bottom:4px">維護管理資料 ＞ 巡查資料管理</div>
          <span class="card-title" style="font-size:24px"><i class="fas fa-clipboard-list"></i> 巡查資料管理</span>
        </div>
        <button class="btn btn-primary" onclick="openInspectionForm()" style="font-size:18px;padding:10px 22px">
          <i class="fas fa-plus"></i> 新增巡查紀錄
        </button>
      </div>`}
    <div ${standalone?'':'class="card-body" style="padding:16px"'}>

      <!-- ── 三類巡查統計橫排 ── -->
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:18px;margin-bottom:22px">
        ${['general','professional','ranger'].map(type => {
          const m   = INSP_TYPE_META[type];
          const s   = type==='general'?gs:type==='professional'?ps:rs;
          const arr = byType[type];
          const active = inspDataTab === type;
          return `
          <div style="border:${active?'3px':'2px'} solid ${active?m.color:m.border};background:${active?m.bg:'#fff'};
                      border-radius:16px;padding:22px;cursor:pointer;transition:box-shadow .15s;
                      box-shadow:${active?'0 8px 28px rgba(15,23,42,.15)':'none'}"
               onclick="inspSwitchTab('${type}')">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
              <div style="width:60px;height:60px;border-radius:15px;background:${m.color};color:#fff;
                          display:flex;align-items:center;justify-content:center;font-size:28px">
                <i class="fas ${m.icon}"></i>
              </div>
              <div style="font-size:52px;font-weight:900;color:${m.color};line-height:1">${s.total}</div>
            </div>
            <div style="font-size:26px;font-weight:900;color:#0f172a;margin-bottom:12px">${m.label}</div>
            <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:14px">
              ${[['待處理',s.pending,'#b91c1c'],['處理中',s.progress,'#d97706'],['完成',s.done,'#16a34a']].map(([lb,cnt,cl])=>`
                <div style="text-align:center;background:#fff;border:1px solid ${cl}33;border-radius:10px;padding:10px 6px">
                  <div style="font-size:28px;font-weight:900;color:${cl}">${cnt}</div>
                  <div style="font-size:17px;color:#64748b;margin-top:2px">${lb}</div>
                </div>`).join('')}
            </div>
            <div style="font-size:18px;color:#64748b;line-height:1.7">
              <div>最新：${s.latestDate}</div>
              ${s.topFac ? `<div style="margin-top:4px">最多問題：${s.topFac[0].slice(0,10)}（${s.topFac[1]}筆）</div>` : ''}
            </div>
            <div style="font-size:19px;font-weight:800;color:${m.color};margin-top:12px">
              ${active ? '▶ 目前篩選中' : '展開此類清單'}
            </div>
          </div>`;
        }).join('')}
      </div>

      <!-- ── 近期趨勢 ── -->
      ${trend.length ? `
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:20px;margin-bottom:22px">
        <div style="font-size:22px;font-weight:800;color:#0f172a;margin-bottom:14px">
          <i class="fas fa-chart-bar" style="color:#1565c0;margin-right:8px"></i>近期巡查趨勢（近 ${trend.length} 個月）
        </div>
        <div style="display:flex;align-items:flex-end;gap:10px;height:80px">
          ${trend.map(([m,cnt]) => `
            <div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:5px">
              <div style="font-size:18px;font-weight:700;color:#1565c0">${cnt}</div>
              <div style="width:100%;background:#1565c0;border-radius:5px 5px 0 0;
                          height:${Math.round(cnt/maxTrend*56)+6}px;min-height:8px"></div>
              <div style="font-size:16px;color:#94a3b8;white-space:nowrap">${m.slice(5)}</div>
            </div>`).join('')}
        </div>
      </div>` : ''}

      <!-- ── 分頁籤 ── -->
      <div style="display:flex;gap:6px;margin-bottom:18px;border-bottom:3px solid #e5e7eb;padding-bottom:0;flex-wrap:wrap">
        ${[['all','全部','#0f172a'],['general','一般巡查','#1565c0'],['professional','專業巡查','#9a3412'],['ranger','護管員巡查','#166534']].map(([key,lbl,cl])=>`
          <button onclick="inspSwitchTab('${key}')"
            style="padding:13px 22px;border:none;background:none;cursor:pointer;font-size:20px;font-weight:${inspDataTab===key?'800':'500'};
                   color:${inspDataTab===key?cl:'#64748b'};border-bottom:${inspDataTab===key?`4px solid ${cl}`:'4px solid transparent'};
                   margin-bottom:-3px;display:flex;align-items:center;gap:8px">
            ${lbl}
            <span style="background:${inspDataTab===key?cl+'22':'#f1f5f9'};color:${inspDataTab===key?cl:'#64748b'};
                         border-radius:999px;padding:2px 10px;font-size:17px;font-weight:700">
              ${key==='all'?enriched.length:byType[key]?.length||0}
            </span>
          </button>`).join('')}
        <div style="margin-left:auto;display:flex;gap:8px;align-items:center;padding-bottom:4px">
          <select id="inspDataStatusFilter" onchange="inspDataMgmtRender()" style="padding:9px 14px;border:1px solid #d5dde7;border-radius:8px;font-size:18px">
            <option value="">全部狀態</option>
            <option value="待處理">待處理</option>
            <option value="處理中">處理中</option>
            <option value="完成">完成</option>
          </select>
          <select id="inspDataPriorityFilter" onchange="inspDataMgmtRender()" style="padding:9px 14px;border:1px solid #d5dde7;border-radius:8px;font-size:18px">
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
      ${inspDataTab === 'general' ? renderGeneralInspRecords() : ''}

      <!-- 資料庫巡查清單 -->
      <div ${inspDataTab === 'general' ? `style="margin-top:24px"` : ''}>
        ${inspDataTab === 'general' ? `
          <div style="display:flex;align-items:center;gap:12px;margin-bottom:18px;padding-bottom:14px;border-bottom:3px solid #e5e7eb">
            <div style="width:6px;height:36px;background:#1565c0;border-radius:3px"></div>
            <span style="font-size:24px;font-weight:800;color:#0f172a">資料庫巡查紀錄</span>
            <span style="font-size:18px;color:#64748b">（平台新增與 DER&U 評估紀錄）</span>
          </div>` : ''}
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
  inspDataMgmtRender();
  // 更新分頁籤高亮
  const card = document.getElementById('inspDataMgmtCard');
  if (!card) return;
  card.querySelectorAll('[onclick^="inspSwitchTab"]').forEach(btn => {
    const btnKey = btn.getAttribute('onclick').match(/'([^']+)'/)?.[1];
    const cl = {all:'#0f172a',general:'#1565c0',professional:'#9a3412',ranger:'#166534'}[btnKey]||'#64748b';
    const active = btnKey === tab;
    btn.style.fontWeight = active ? '800' : '500';
    btn.style.color = active ? cl : '#64748b';
    btn.style.borderBottom = active ? `3px solid ${cl}` : '3px solid transparent';
  });
  // 更新類別卡高亮
  card.querySelectorAll('[onclick^="inspSwitchTab(\'g"],\
    [onclick^="inspSwitchTab(\'p"],\
    [onclick^="inspSwitchTab(\'r"]').forEach(div => {
    const key = div.getAttribute('onclick').match(/'([^']+)'/)?.[1];
    if (!key || key === 'all') return;
    const m = INSP_TYPE_META[key];
    if (!m) return;
    const active = key === tab;
    div.style.border = `${active?'2px':'1px'} solid ${active?m.color:m.border}`;
    div.style.background = active ? m.bg : '#fff';
    div.style.boxShadow = active ? '0 6px 20px rgba(15,23,42,.12)' : 'none';
    const foot = div.querySelector('div:last-child');
    if (foot) foot.textContent = active ? '▶ 目前篩選中' : '展開此類清單';
  });
}

function inspDataMgmtRender() {
  // 一般巡查文件清單區（重建或隱藏）
  const docSection = document.getElementById('inspDataMgmtList')?.closest('div[style*="margin-top"]')?.previousElementSibling;
  if (docSection) {
    docSection.innerHTML = inspDataTab === 'general' ? renderGeneralInspRecords() : '';
    docSection.style.display = inspDataTab === 'general' ? '' : 'none';
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

function renderInspDataList(data) {
  if (!data.length) return `
    <div style="text-align:center;padding:44px;color:#94a3b8">
      <i class="fas fa-clipboard" style="font-size:52px;margin-bottom:14px;display:block"></i>
      <div style="font-size:22px">查無巡查紀錄</div>
    </div>`;

  return data.slice(0, 30).map((item, idx) => {
    const m    = INSP_TYPE_META[item.uiType] || INSP_TYPE_META.general;
    const sc   = item.uiStatus==='完成'?'#16a34a':item.uiStatus==='處理中'?'#d97706':'#b91c1c';
    const sbg  = item.uiStatus==='完成'?'#dcfce7':item.uiStatus==='處理中'?'#fef9c3':'#fee2e2';
    const pc   = item.uiPriority==='緊急'?'#dc2626':item.uiPriority==='高'?'#ea580c':item.uiPriority==='中'?'#d97706':'#64748b';
    const rid  = `insp_row_${item.id}_${idx}`;
    const hasDeru = item.deru_d !== undefined && item.deru_d !== null;
    const hasAi   = !!item.aiImageAnalysis;
    const name = item.facilityName || item.facility_name || '未指定設施';
    const findings = String(item.findings || item.notes || '').slice(0, 100);

    return `
    <div style="background:#fff;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;margin-bottom:14px;
                box-shadow:0 2px 6px rgba(15,23,42,.05);transition:box-shadow .15s"
         onmouseover="this.style.boxShadow='0 6px 20px rgba(15,23,42,.11)'"
         onmouseout="this.style.boxShadow='0 2px 6px rgba(15,23,42,.05)'">

      <!-- 主列（點擊展開） -->
      <div style="display:grid;grid-template-columns:8px 1fr auto auto;align-items:stretch;cursor:pointer"
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
              ${inspDetailRow('狀態', item.uiStatus)}
              ${inspDetailRow('優先度', item.uiPriority)}
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
                      ${label}
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
            <button class="btn btn-outline" onclick="openInspectionForm(${item.id})" style="font-size:14px;padding:8px 18px">
              <i class="fas fa-edit"></i> 編輯
            </button>
            <button class="btn btn-outline" onclick="deleteInspection(${item.id})"
              style="font-size:14px;padding:8px 14px;color:var(--danger);border-color:var(--danger)">
              <i class="fas fa-trash"></i>
            </button>
          </div>`;
        })()}
      </div>
    </div>`;
  }).join('') + (data.length > 30 ? `<div style="text-align:center;padding:12px;font-size:14px;color:#64748b">顯示前 30 筆（共 ${data.length} 筆）</div>` : '');
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
              ${['general','professional','ranger'].map(type => `
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
        <span class="card-title" style="font-size:18px"><i class="fas fa-images"></i> 歷年維護照片分層比對</span>
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
    ${renderMaintenancePhotoArchiveSection()}
    ${renderForestryPatrolSection()}
  `;
  loadMaintenancePhotoArchive();
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
                <button class="btn btn-sm btn-outline btn-icon" onclick="deleteInspection(${item.id})" title="刪除" style="color:var(--danger)"><i class="fas fa-trash"></i></button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  ` : '<div class="empty-state"><i class="fas fa-clipboard"></i><p>查無巡查紀錄</p></div>';
}

function openInspectionForm(id = null) {
  const ins = id ? DB.getById('inspections', id) : {};
  const facilities = DB.getAll('facilities');
  currentInspectionAiImage = null;
  currentInspectionAiAnalysis = ins?.aiImageAnalysis || null;
  currentInspectionAiImageDataUrl = null;

  document.getElementById('modalTitle').textContent = id ? '編輯巡查紀錄' : '新增巡查紀錄';
  document.getElementById('modalBody').innerHTML = `
    <div class="form-grid">
      <div class="form-group full-width"><label>設施名稱 *</label>
        <select id="ins_facility">
          <option value="">請選擇設施</option>
          ${facilities.map(f => `<option value="${f.id}" data-name="${inspectionEscape(f.name)}" ${Number(ins.facilityId) === Number(f.id) ? 'selected' : ''}>${inspectionEscape(f.name)}</option>`).join('')}
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

  if (id) {
    DB.update('inspections', id, item);
    showToast('巡查紀錄已更新', 'success');
  } else {
    DB.insert('inspections', item);
    showToast('巡查紀錄已新增', 'success');
  }
  closeModal();
  renderInspection();
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
          ['預計/完成時間', inspectionExpectedCompletion(item)]
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
  DB.delete('inspections', id);
  showToast('巡查紀錄已刪除', 'info');
  renderInspection();
}
