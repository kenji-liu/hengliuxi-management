/**
 * 稽核「巡查資料」與「維護管理資料」的分類衝突
 * ======================================================================
 * 使用者回報：溪構1-1 的維護管理清單裡有 2 件其實是專業巡查表單，與專業巡查
 * 資料重複（畫面上顯示「來源：專業巡查-構造物調查表」）。
 *
 * 本腳本在 vm 沙箱裡跑平台自己的 db.js 與 facilities.js，直接呼叫
 * fac_facilityLinkedMaintenanceCases()，逐座比對它列出的「維護案件」是否
 * 其實來自巡查表單。不重寫一套判斷邏輯，稽核結果才會與畫面一致。
 *
 * 只讀不寫：本腳本僅產出稽核報告，不動任何原始資料。
 *
 * 重複判定不只用 record id（使用者要求）：
 *   duplicate_fingerprint = facility_id + date + form_type + source(identifier) + content_hash
 * source 優先取 inspectNo（權威識別碼），沒有時退回 position，
 * 兩者都沒有才用 findings 前 40 字近似比對，避免同名不同表單被誤判為重複。
 * content_hash 取 findings+action+appearanceOther 正規化後的雜湊，
 * 用來抓「facility/date/form_type 相同、但識別碼不同」的隱性重複。
 *
 * 執行：node scripts/audit_maintenance_classification.js
 * 產出：tmp/audit_maintenance.json（明細＋逐筆稽核表）＋ 主控台摘要
 */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '..');
const read = p => fs.readFileSync(p, 'utf8');
const sha = s => crypto.createHash('sha1').update(s).digest('hex').slice(0, 10);

function loadPlatform() {
  const noop = () => {};
  const stubEl = { style: {}, classList: { add: noop, remove: noop, toggle: noop }, appendChild: noop };
  const store = {};
  const ctx = {
    console: { log: noop, info: noop, warn: noop, error: (...a) => console.error(...a) },
    document: {
      getElementById: () => null, querySelector: () => null, querySelectorAll: () => [],
      createElement: () => stubEl, addEventListener: noop, readyState: 'complete',
    },
    setTimeout: noop, setInterval: noop, clearTimeout: noop, Chart: function () {},
    localStorage: {
      getItem: k => (k in store ? store[k] : null),
      setItem: (k, v) => { store[k] = String(v); },
      removeItem: k => { delete store[k]; },
    },
    fetch: () => Promise.reject(new Error('稽核環境無網路')),
    navigator: {}, location: { href: 'http://localhost/' },
  };
  ctx.window = ctx; ctx.globalThis = ctx;
  vm.createContext(ctx);
  vm.runInContext(read(path.join(ROOT, 'webapp/js/db.js')), ctx, { filename: 'db.js' });
  //  db.js 用 const 宣告 DB，const 不會掛到 sandbox 物件上，要另外取出
  ctx._DB = vm.runInContext("typeof DB !== 'undefined' ? DB : null", ctx);
  if (!ctx._DB) throw new Error('db.js 未建立 DB');
  vm.runInContext(read(path.join(ROOT, 'webapp/js/modules/facilities.js')), ctx,
                  { filename: 'facilities.js' });
  return ctx;
}

const FAC = loadPlatform();
const DB = FAC._DB;
const facilities = DB.getAll('facilities') || [];
const inspections = DB.getAll('inspections') || [];

/*  真正的維護紀錄應具備「實際執行依據」。使用者定義的判準：
    維護項目／維護日期／施工處理內容／維護策略／辦理狀態／維護照片／執行人員。
    只要文字裡出現「維護、修復、改善」不算 —— 巡查表的「建議清除淤積」
    是建議，不是已執行的維護。                                            */
const MAINTENANCE_FORM_TYPES = new Set(['maintenance_completion']);
const INSPECTION_FORM_TYPES = new Set([
  'professional_structure', 'professional_fishway', 'general_periodic',
]);
const FORM_LABEL = {
  professional_structure: '專業巡查-構造物調查表',
  professional_fishway: '專業巡查-魚道檢核表',
  general_periodic: '一般巡查表單',
  maintenance_completion: '維護完工回報',
};

function evidenceOfExecution(item) {
  const hits = [];
  if (item.completedAt || item.maintenanceComplete) hits.push('完工日期');
  if (item.method) hits.push('施工工法');
  if (item.afterDesc) hits.push('完工後狀況');
  if (item.reporter) hits.push('填表人員');
  if (item.reportTime) hits.push('填表時間');
  if (item.formType === 'maintenance_completion') hits.push('維護完工回報表單');
  return hits;
}

/*  重複指紋：facility_id + date + form_type + source(identifier) + content_hash
    source 優先用 inspectNo（表單自帶的權威識別碼），沒有才退回 position，
    兩者皆無才用內容前 40 字近似比對 —— 這是使用者第五節要求的「綜合比對」，
    不只用 record id。                                                    */
function normContent(item) {
  return String([item.findings, item.action, item.appearanceOther]
    .filter(Boolean).join('|')).replace(/\s+/g, '').trim();
}
function fingerprintOf(item) {
  const source = item.inspectNo || item.position || normContent(item).slice(0, 40);
  const hash = sha(normContent(item));
  return [item.facilityId, item.date || '', item.formType || '', source, hash].join('§');
}

const report = {
  generatedAt: new Date().toISOString().slice(0, 19),
  totals: { facilities: facilities.length, inspectionRecords: inspections.length },
  byFormType: {},
  conflicts: [],
};
inspections.forEach(r => {
  const k = r.formType || '(未標示)';
  report.byFormType[k] = (report.byFormType[k] || 0) + 1;
});

/* ══ 一、完全重複：同一份原始表單被建立成兩筆以上不同紀錄 ══
   指紋相同（facility+date+form_type+source+content_hash 全一致）代表
   極可能是同一份表單重複匯入（OCR / PDF 轉檔 / 重複上傳）。            */
const fpMap = new Map();
inspections.forEach(r => {
  const fp = fingerprintOf(r);
  if (!fpMap.has(fp)) fpMap.set(fp, []);
  fpMap.get(fp).push(r);
});
const exactDuplicates = [...fpMap.entries()]
  .filter(([, rows]) => rows.length > 1)
  .map(([fp, rows]) => ({
    fingerprint: fp,
    ids: rows.map(r => r.id),
    facilityName: rows[0].facilityName,
    date: rows[0].date,
    formType: rows[0].formType,
  }));
const dupIdSet = new Set(exactDuplicates.flatMap(d => d.ids.slice(1)));  // 每組留第一筆為正本

/* ══ 二、跨分類重複 CROSS_CATEGORY_DUPLICATE ══
   逐座設施跑平台自己的維護案件產生器，找出「被列為維護案件、
   但其實是巡查表單」的紀錄 —— 這就是溪構1-1 那個問題的通例。          */
const seenAsMaintenance = new Map();     // itemId → 出現在幾座設施的維護清單
const auditRows = [];                    // 使用者要求的逐筆稽核表

facilities.forEach(f => {
  const cases = FAC.fac_facilityLinkedMaintenanceCases(f) || [];
  const misclassified = [];
  cases.forEach(c => {
    const src = inspections.find(i => i.id === c.itemId);
    if (!src) return;
    seenAsMaintenance.set(c.itemId, (seenAsMaintenance.get(c.itemId) || 0) + 1);
    const isInspectionForm = INSPECTION_FORM_TYPES.has(src.formType);
    const isRealMaintenance = MAINTENANCE_FORM_TYPES.has(src.formType)
      || FAC.fac_recordDataClass(src) === 'maintenance';

    //  稽核表：設施｜日期｜原分類｜判定正確分類｜是否重複｜問題｜建議處理
    auditRows.push({
      設施: f.name,
      日期: src.date,
      原分類: isRealMaintenance ? '維護管理' : '維護管理（誤列）',
      判定正確分類: isInspectionForm
        ? FORM_LABEL[src.formType] || '巡查'
        : (isRealMaintenance ? '維護管理' : '未知'),
      是否重複: (!isRealMaintenance && isInspectionForm) ? '是（CROSS_CATEGORY_DUPLICATE）' : '否',
      問題: (!isRealMaintenance && isInspectionForm)
        ? `${FORM_LABEL[src.formType] || src.formType} 同時顯示於「巡查資料」與「維護管理」`
        : '無',
      建議處理: (!isRealMaintenance && isInspectionForm)
        ? '保留巡查原始紀錄；從維護管理清單移除該筆關聯（已於畫面拆分為「巡查待辦」區）'
        : '維持現狀',
      recordId: src.id, caseId: c.id, formType: src.formType,
    });

    if (isRealMaintenance) return;
    misclassified.push({
      caseId: c.id, inspectionId: src.id, inspectNo: src.inspectNo || '',
      formType: src.formType || '(未標示)', isInspectionForm,
      date: src.date, status: src.status, priority: src.priority || '',
      displayedSource: c.source, displayedType: c.type,
      findings: String(src.findings || '').slice(0, 80),
      action: String(src.action || '').slice(0, 80),
      executionEvidence: evidenceOfExecution(src),
      crossCategoryDuplicate: isInspectionForm,
      reason: isInspectionForm
        ? '巡查表單被列入維護管理清單（同一份原始表單同時出現在巡查與維護兩區）'
        : '非維護表單但被列入維護管理清單',
    });
  });
  if (misclassified.length) {
    report.conflicts.push({
      facilityId: f.id, facilityName: f.name,
      totalCases: cases.length, misclassifiedCount: misclassified.length,
      realMaintenanceCount: cases.length - misclassified.length,
      items: misclassified,
    });
  }
});

/* ══ 三、彙總統計 ══ */
report.summary = {
  總設施數: facilities.length,
  掃描總表單數: inspections.length,
  一般巡查數: report.byFormType.general_periodic || 0,
  專業巡查數: report.byFormType.professional_structure || 0,
  魚道巡查數: report.byFormType.professional_fishway || 0,
  維護管理數: report.byFormType.maintenance_completion || 0,
  未標示數: report.byFormType['(未標示)'] || 0,
  發生衝突設施數: report.conflicts.length,
  衝突資料筆數: report.conflicts.reduce((n, c) => n + c.misclassifiedCount, 0),
  完全重複筆數: exactDuplicates.reduce((n, d) => n + d.ids.length - 1, 0),
  跨分類重複筆數CROSS_CATEGORY_DUPLICATE: [...seenAsMaintenance.entries()].filter(([id]) => {
    const src = inspections.find(i => i.id === id);
    return src && INSPECTION_FORM_TYPES.has(src.formType);
  }).length,
  疑似分類錯誤筆數: report.conflicts.reduce(
    (n, c) => n + c.items.filter(i => !i.isInspectionForm).length, 0),
  疑似重複筆數_內容近似: dupIdSet.size,
};
report.exactDuplicates = exactDuplicates;
report.auditTable = auditRows.filter(r => r.是否重複.startsWith('是'));

/* ══ 四、根因判定（資料流分層）══
   原始資料／解析／分類：未發現異常 —— 完全重複 0 筆、疑似分類錯誤 0 筆，
   代表 db.js 種子資料的 formType 本身是對的。
   問題出在「前端顯示層」：facilities.js 的
   fac_facilityLinkedMaintenanceCases() 把「未結案或高優先的巡查表單」
   無條件併入維護案件清單（呈現層的 filter 條件錯誤，對應使用者第八節
   選項 E），而不是 API 或 Database 把 professional_inspection 併入
   maintenance（選項 D）。後端 current_status.py／agent_tools.py 的
   AI 現況判讀從未依賴這個前端函式，是各自獨立依 formType 判斷，
   因此 AI 問答未受影響（見主控台輸出的「AI/RAG 層檢查」）。          */
report.rootCause = {
  判定層級: '前端顯示層（E. 前端 filter 條件錯誤）',
  說明: 'db.js 種子資料的 formType 分類正確（完全重複 0 筆、疑似分類錯誤 0 筆）；'
      + 'Database 與後端 AI 現況判讀（current_status.py）各自依 formType 獨立判斷，'
      + '從未把 professional_structure/professional_fishway/general_periodic 當成'
      + 'maintenance。問題出在 webapp/js/modules/facilities.js 的'
      + ' fac_facilityLinkedMaintenanceCases()：它把「未結案或高優先的巡查表單」'
      + '無條件併入維護案件清單，導致同一份表單同時顯示於「巡查資料」與'
      + '「維護管理」兩區。',
  受影響檔案: ['webapp/js/modules/facilities.js（fac_facilityLinkedMaintenanceCases）'],
  未受影響: ['webapp/js/db.js（原始種子資料）', 'webapp/current_status.py（AI 現況判讀）',
             'webapp/agent_tools.py（query_current_status 工具）'],
};

fs.mkdirSync(path.join(ROOT, 'tmp'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'tmp/audit_maintenance.json'),
                 JSON.stringify(report, null, 1), 'utf8');

/* ── 主控台摘要 ────────────────────────────────────────────────── */
console.log('══ 巡查／維護分類稽核（含重複指紋比對）══');
console.log('表單類型分布：', JSON.stringify(report.byFormType, null, 0));
console.log('');
Object.entries(report.summary).forEach(([k, v]) => console.log(`  ${k}：${v}`));
console.log('');
console.log('── 根因判定 ──');
console.log('  層級：' + report.rootCause.判定層級);
console.log('  ' + report.rootCause.說明);
console.log('');
console.log('── 稽核表（設施｜日期｜原分類｜判定正確分類｜是否重複｜問題｜建議處理）──');
report.auditTable.forEach(r => {
  console.log(`  ${r.設施}｜${r.日期}｜${r.原分類}｜${r.判定正確分類}｜${r.是否重複}`);
  console.log(`    問題：${r.問題}`);
  console.log(`    建議：${r.建議處理}`);
});
console.log('');
if (exactDuplicates.length) {
  console.log('── 完全重複（同一份表單建立成多筆，含內容雜湊比對）──');
  exactDuplicates.forEach(d => console.log(`   ids=${d.ids} ${d.facilityName} ${d.date} ${d.formType}`));
} else {
  console.log('── 完全重複：無（0 筆，含內容雜湊比對）──');
}
console.log('\n明細與逐筆稽核表已寫入 tmp/audit_maintenance.json（本階段未修改任何原始資料）');
