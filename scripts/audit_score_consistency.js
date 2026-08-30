/**
 * 稽核「狀態評估（最新專業巡查）」卡片分數 與 「狀態評估分數歷史趨勢」
 * 最後一點分數 是否一致。
 * ======================================================================
 * 使用者回報：護岸顯示「狀態評估（最新專業巡查）37分」，但趨勢圖最後一點
 * 卻是 90 分 —— 同一座設施、應為同一次專業巡查，不該有兩個數字。
 *
 * 本腳本在 vm 沙箱裡跑平台自己的 db.js 與 facilities.js，直接呼叫
 * fac_latestProfessionalAssessment()（卡片用的函式）與
 * fac_renderHistoryHealthChart() 內部同一套資料建構邏輯（趨勢圖用的），
 * 逐座比對兩者「最新一筆」的分數與所屬紀錄是否相同。
 *
 * 執行：node scripts/audit_score_consistency.js
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
  ctx.window._facHCData = {};
  ctx.window._facHCInst = {};
  vm.createContext(ctx);
  vm.runInContext(read(path.join(ROOT, 'webapp/js/db.js')), ctx, { filename: 'db.js' });
  ctx._DB = vm.runInContext("typeof DB !== 'undefined' ? DB : null", ctx);
  if (!ctx._DB) throw new Error('db.js 未建立 DB');
  vm.runInContext(read(path.join(ROOT, 'webapp/js/modules/facilities.js')), ctx,
                  { filename: 'facilities.js' });
  return ctx;
}

const FAC = loadPlatform();
const DB = FAC._DB;
const facilities = DB.getAll('facilities') || [];

const rows = [];
facilities.forEach(f => {
  const assessment = FAC.fac_latestProfessionalAssessment(f);
  if (!assessment.hasProfessional) return;
  const cardScore = assessment.health;
  const cardRecordId = assessment.latestProfessional?.id;
  const cardDate = assessment.assessmentDate;

  // 呼叫趨勢圖用的同一套函式，把它塞進 window._facHCData（渲染函式的既有副作用）
  FAC.fac_renderHistoryHealthChart(f);
  const chartData = FAC.window._facHCData[f.id];
  if (!chartData || !chartData.scores.length) return;
  const chartScore = chartData.scores[chartData.scores.length - 1];
  const chartDate = chartData.dates[chartData.dates.length - 1];

  const match = cardScore === chartScore;
  rows.push({
    facility: f.name,
    facilityId: f.id,
    cardDate, cardScore,
    chartDate, chartScore,
    match,
    reason: match ? '' : (cardDate === chartDate
      ? '同日多筆專業巡查（多子位置同一 facilityId），趨勢圖選到的不是卡片認定的代表紀錄'
      : '卡片與趨勢圖採用的「最新一筆」日期本身就不同'),
  });
});

console.log('══ 狀態評估分數一致性稽核 ══');
console.log('共檢查設施數：', facilities.length);
console.log('有專業巡查紀錄的設施數：', rows.length);
const mismatches = rows.filter(r => !r.match);
console.log('分數不一致筆數：', mismatches.length);
console.log('');
console.log('設施\t卡片日期\t卡片分數\t趨勢日期\t趨勢分數\t是否一致\t原因');
rows.forEach(r => {
  console.log(`${r.facility}\t${r.cardDate}\t${r.cardScore}\t${r.chartDate}\t${r.chartScore}\t${r.match ? '✅' : '❌'}\t${r.reason}`);
});

fs.mkdirSync(path.join(ROOT, 'tmp'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'tmp/audit_score_consistency.json'),
                 JSON.stringify({ total: facilities.length, checked: rows.length,
                                  mismatchCount: mismatches.length, rows }, null, 1), 'utf8');
console.log('\n明細已寫入 tmp/audit_score_consistency.json');
