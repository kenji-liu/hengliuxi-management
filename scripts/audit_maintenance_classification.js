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
 * 只讀不寫：第一階段僅產出稽核報告，不動任何原始資料。
 *
 * 執行：node scripts/audit_maintenance_classification.js
 * 產出：tmp/audit_maintenance.json（明細）＋ 主控台摘要
 */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const read = p => fs.readFileSync(p, 'utf8');

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

const report = {
  generatedAt: new Date().toISOString().slice(0, 19),
  totals: {
    facilities: facilities.length,
    inspectionRecords: inspections.length,
  },
  byFormType: {},
  conflicts: [],
};

inspections.forEach(r => {
  const k = r.formType || '(未標示)';
  report.byFormType[k] = (report.byFormType[k] || 0) + 1;
});

/*  逐座設施跑平台自己的維護案件產生器，找出「被列為維護案件、
    但其實是巡查表單」的紀錄。                                          */
const seenAsInspection = new Set();
const seenAsMaintenance = new Map();     // itemId → 出現在幾座設施的維護清單

facilities.forEach(f => {
  const cases = FAC.fac_facilityLinkedMaintenanceCases(f) || [];
  const misclassified = [];
  cases.forEach(c => {
    const src = inspections.find(i => i.id === c.itemId);
    if (!src) return;
    seenAsMaintenance.set(c.itemId, (seenAsMaintenance.get(c.itemId) || 0) + 1);
    const isRealMaintenance = MAINTENANCE_FORM_TYPES.has(src.formType)
      || FAC.fac_recordDataClass(src) === 'maintenance';
    if (isRealMaintenance) return;
    //  被列為維護案件、但 formType 是巡查表單 → 分類錯誤
    misclassified.push({
      caseId: c.id,
      inspectionId: src.id,
      inspectNo: src.inspectNo || '',
      formType: src.formType || '(未標示)',
      isInspectionForm: INSPECTION_FORM_TYPES.has(src.formType),
      date: src.date,
      status: src.status,
      priority: src.priority || '',
      displayedSource: c.source,
      displayedType: c.type,
      findings: String(src.findings || '').slice(0, 80),
      action: String(src.action || '').slice(0, 80),
      executionEvidence: evidenceOfExecution(src),
      reason: INSPECTION_FORM_TYPES.has(src.formType)
        ? '巡查表單被列入維護管理清單（同一份原始表單同時出現在巡查與維護兩區）'
        : '非維護表單但被列入維護管理清單',
    });
  });
  if (misclassified.length) {
    report.conflicts.push({
      facilityId: f.id,
      facilityName: f.name,
      totalCases: cases.length,
      misclassifiedCount: misclassified.length,
      realMaintenanceCount: cases.length - misclassified.length,
      items: misclassified,
    });
  }
});

/*  完全重複：同一份原始表單被建立成兩筆不同紀錄
    （相同 inspectNo＋日期＋formType，卻有不同 id）                       */
const dupMap = new Map();
inspections.forEach(r => {
  const key = [r.facilityId, r.formType || '', r.date || '',
               r.inspectNo || String(r.findings || '').slice(0, 40)].join('|');
  if (!dupMap.has(key)) dupMap.set(key, []);
  dupMap.get(key).push(r);
});
const exactDuplicates = [...dupMap.entries()]
  .filter(([, rows]) => rows.length > 1)
  .map(([key, rows]) => ({
    key,
    ids: rows.map(r => r.id),
    facilityName: rows[0].facilityName,
    date: rows[0].date,
    formType: rows[0].formType,
  }));

report.summary = {
  總設施數: facilities.length,
  總表單數: inspections.length,
  發生衝突設施數: report.conflicts.length,
  衝突資料筆數: report.conflicts.reduce((n, c) => n + c.misclassifiedCount, 0),
  完全重複筆數: exactDuplicates.reduce((n, d) => n + d.ids.length - 1, 0),
  跨分類重複筆數: [...seenAsMaintenance.entries()].filter(([id]) => {
    const src = inspections.find(i => i.id === id);
    return src && INSPECTION_FORM_TYPES.has(src.formType);
  }).length,
  疑似分類錯誤筆數: report.conflicts.reduce(
    (n, c) => n + c.items.filter(i => !i.isInspectionForm).length, 0),
};
report.exactDuplicates = exactDuplicates;

fs.mkdirSync(path.join(ROOT, 'tmp'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'tmp/audit_maintenance.json'),
                 JSON.stringify(report, null, 1), 'utf8');

/* ── 主控台摘要 ────────────────────────────────────────────────── */
console.log('══ 巡查／維護分類稽核 ══');
console.log('表單類型分布：', JSON.stringify(report.byFormType, null, 0));
console.log('');
Object.entries(report.summary).forEach(([k, v]) => console.log(`  ${k}：${v}`));
console.log('');
console.log('── 發生衝突的設施 ──');
report.conflicts.forEach(c => {
  console.log(`\n● ${c.facilityName}（id ${c.facilityId}）`
    + `　維護清單 ${c.totalCases} 件，其中 ${c.misclassifiedCount} 件其實是巡查表單`);
  c.items.forEach(i => {
    console.log(`   ${i.caseId}  ${i.date}  ${i.formType}  狀態:${i.status}`
      + `  顯示來源:「${i.displayedSource}」`);
    console.log(`      巡查編號:${i.inspectNo || '(無)'}  執行事證:`
      + (i.executionEvidence.length ? i.executionEvidence.join('/') : '無'));
  });
});
if (exactDuplicates.length) {
  console.log('\n── 完全重複（同一份表單建立成多筆）──');
  exactDuplicates.forEach(d => console.log(`   ids=${d.ids} ${d.facilityName} ${d.date} ${d.formType}`));
} else {
  console.log('\n── 完全重複：無 ──');
}
console.log('\n明細已寫入 tmp/audit_maintenance.json（本階段未修改任何原始資料）');
