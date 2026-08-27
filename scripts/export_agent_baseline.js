/**
 * 匯出 AI Agent 的「基準快照」──讓後端不依賴瀏覽器也能答對。
 *
 * 背景：Agent 的工具原本只吃前端送來的 client_snapshot。若使用者沒開瀏覽器
 * （例如直接打 API、行動裝置快取失效、或前端 DB 尚未初始化），工具會回傳
 * 「未帶入快照」，模型就改去文件裡找數字，實測會答出不存在的魚種與錯誤尾數。
 *
 * 本腳本把唯一真實來源抽成 JSON，供後端載入為預設值：
 *   webapp/js/db.js            → 工程設施與巡查紀錄（含正規化）
 *   webapp/js/modules/fish.js  → 魚類量化序列、魚名對照、出現層、魚道實證
 *
 * 設施「現況」不照抄 seed 的 derLevel/riskScore（那是建檔當時的舊評等，
 * 實測 20 座全部與畫面不符）。改為在 vm 沙箱依序執行 db.js 與 facilities.js，
 * 直接呼叫平台自己的 fac_latestProfessionalAssessment()／fac_riskBand()，
 * 不另寫一套邏輯，後端與畫面因此不可能漂移。
 *
 * 執行：node scripts/export_agent_baseline.js
 * 產出：webapp/data/agent_baseline.json
 *
 * ⚠ 改動上述兩個來源檔後必須重跑本腳本，否則後端基準值會落後前端。
 *   產出檔內含 sourceHashes，後端與 /api/ai-check 可據此偵測是否過期。
 */
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const DB_JS = path.join(ROOT, 'webapp/js/db.js');
const FACILITIES_JS = path.join(ROOT, 'webapp/js/modules/facilities.js');
const SYNCED_INSPECTIONS = path.join(ROOT, 'webapp/data/synced_inspections.json');
const FISH_JS = path.join(ROOT, 'webapp/js/modules/fish.js');
const OUT = path.join(ROOT, 'webapp/data/agent_baseline.json');

const read = p => fs.readFileSync(p, 'utf8');
const sha = s => crypto.createHash('sha256').update(s).digest('hex').slice(0, 16);

/** 從原始碼取出某個字面量陣列／物件並求值。只接受純資料字面量。 */
function extractLiteral(src, marker, opener) {
  const at = src.indexOf(marker);
  if (at < 0) throw new Error(`找不到標記：${marker}`);
  const start = src.indexOf(opener, at);
  if (start < 0) throw new Error(`找不到起始符號 ${opener}：${marker}`);
  const closer = opener === '[' ? ']' : '}';
  let depth = 0, inStr = null, esc = false;
  for (let i = start; i < src.length; i++) {
    const c = src[i];
    if (inStr) {
      if (esc) { esc = false; continue; }
      if (c === '\\') { esc = true; continue; }
      if (c === inStr) inStr = null;
      continue;
    }
    if (c === '"' || c === "'" || c === '`') { inStr = c; continue; }
    if (c === '/' && src[i + 1] === '/') { i = src.indexOf('\n', i); if (i < 0) break; continue; }
    if (c === '/' && src[i + 1] === '*') { i = src.indexOf('*/', i) + 1; continue; }
    if (c === opener) depth++;
    else if (c === closer) {
      depth--;
      if (depth === 0) return eval('(' + src.slice(start, i + 1) + ')');
    }
  }
  throw new Error(`括號未閉合：${marker}`);
}

const dbSrc = read(DB_JS);
const fishSrc = read(FISH_JS);

// ── 工程設施 ────────────────────────────────────────────────────────
const facilities = extractLiteral(dbSrc, '      facilities: [', '[');

/* ────────────────────────────────────────────────────────────────────
   設施現況：直接跑平台自己的判讀邏輯
   --------------------------------------------------------------------
   seed 的 derLevel/riskScore 是建檔當時的舊評等，畫面早已改用
   「最新專業巡查」推算（fac_latestProfessionalAssessment）。若照抄 seed，
   後端沒有瀏覽器快照時會答出與畫面不同的等級與健康分數 —— 實測 20 座全錯。
   這裡把 facilities.js 載進沙箱呼叫原函式，而不是在此重寫一份，
   確保兩邊永遠同一套演算法。
   ──────────────────────────────────────────────────────────────────── */
function loadPlatformLogic() {
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
    fetch: () => Promise.reject(new Error('匯出環境無網路')),
    navigator: {}, location: { href: 'http://localhost/' },
  };
  ctx.window = ctx;
  ctx.globalThis = ctx;
  vm.createContext(ctx);
  // db.js 先跑：建立 DB、套用巡查正規化（formType 補正、sf_grade 自癒等）
  vm.runInContext(dbSrc, ctx, { filename: 'db.js' });
  const DB = vm.runInContext("typeof DB !== 'undefined' ? DB : null", ctx);
  if (!DB) throw new Error('db.js 未建立 DB');
  // facilities.js 後跑：評等函式會透過 DB 讀到正規化後的巡查
  vm.runInContext(read(FACILITIES_JS), ctx, { filename: 'facilities.js' });
  if (typeof ctx.fac_latestProfessionalAssessment !== 'function')
    throw new Error('facilities.js 未匯出 fac_latestProfessionalAssessment');
  ctx._DB = DB;
  return ctx;
}

const FAC = loadPlatformLogic();
// 一律取 DB 正規化後的資料，與瀏覽器所見完全同一份
const facilitiesSrc = FAC._DB.getAll('facilities') || facilities;
const inspections = FAC._DB.getAll('inspections') || [];
const facilitiesAssessed = facilitiesSrc.map(f => {
  const a = FAC.fac_latestProfessionalAssessment(f);
  const u = Number(a?.deru?.u || 1);
  const health = Number(a?.health ?? (100 - Number(f.riskScore || 0)));
  const risk = Math.max(0, 100 - health);
  return {
    ...f,
    // 覆寫為與畫面一致的現況值；seed 原值另存供稽核。
    derLevel: a?.derLevel || f.derLevel || '',
    status: a?.status || f.status || '',
    healthScore: health,
    riskScore: risk,
    riskLevel: FAC.fac_riskBand(risk, u).label,
    deru_d: Number(a?.deru?.d ?? 0), deru_e: Number(a?.deru?.e ?? 1),
    deru_r: Number(a?.deru?.r ?? 1), deru_u: u,
    maintenanceStrategy: a?.strategy || f.maintenanceStrategy || '',
    assessmentDate: a?.assessmentDate || f.assessmentDate || f.lastInspect || '',
    judgement_basis: a?.basis || f.judgement_basis || f.evaluationNotes || '',
    inspectionCount: FAC.fac_linkedInspections(f).length,
    professionalCount: FAC.fac_professionalInspectionRows(f).length,
    seedDerLevel: f.derLevel || '',        // 建檔時的舊評等，僅供追溯
    seedRiskScore: f.riskScore ?? null,
  };
});

// ── 魚類 ────────────────────────────────────────────────────────────
const fishKeyNames = extractLiteral(fishSrc, 'const HLX_FISH_KEY_NAME = {', '{');
const fishSurveys = extractLiteral(fishSrc, 'const HLX_FISH_SURVEYS = [', '[');
const excluded = extractLiteral(fishSrc, 'const HLX_FISH_EXCLUDED_SPECIES = new Set(', '[') || [];
const excludedSet = new Set(excluded);
const publishedKeys = Object.keys(fishKeyNames)
  .filter(k => !excludedSet.has(fishKeyNames[k]));

const optional = (marker, opener) => {
  try { return extractLiteral(fishSrc, marker, opener); } catch { return null; }
};
const presenceOnly = optional('const HLX_FISH_PRESENCE_ONLY = [', '[');
const occurrence9306 = optional('const HLX_FISH_OCCURRENCE_9306 = {', '{');
const ecoBenchmark = optional('const HLX_ECO_BENCHMARK = {', '{');
const inFishwayCatch = optional('const HLX_IN_FISHWAY_CATCH = {', '{');
const summary110 = optional('const HLX_FISH_110_SUMMARY = {', '{');
const threatenedKeys = optional("const HLX_THREATENED_KEYS = [", '[');

// 年度彙整：與前端 renderFishTrend 同一套演算法，避免兩邊漂移。
const stationsOf = s => {
  if (Number(s.stations) > 0) return Number(s.stations);
  const m = String(s.note || '').match(/(\d+)\s*站/);
  return m ? parseInt(m[1], 10) : 1;
};
const annual = {};
fishSurveys.forEach(s => {
  const y = Number(s.year);
  if (!annual[y]) {
    annual[y] = { year: y, label: `${y - 1911}年`, surveys: 0, effort: 0, catch: 0,
                  richness: 0, _rich: new Set(), unclassified: 0, sources: new Set() };
    publishedKeys.forEach(k => { annual[y][k] = 0; });
  }
  const d = annual[y];
  d.surveys++;
  d.effort += stationsOf(s);
  d.unclassified += Number(s.unclassified) || 0;
  if (s.source) d.sources.add(s.source);
  publishedKeys.forEach(k => {
    const v = Number(s[k]) || 0;
    d[k] += v; d.catch += v;
    if (v > 0) d._rich.add(k);
  });
});
const fishAnnualData = Object.values(annual)
  .sort((a, b) => a.year - b.year)
  .map(d => {
    const counts = publishedKeys.map(k => d[k]);
    const n = counts.reduce((a, b) => a + b, 0);
    const p = counts.filter(v => v > 0).map(v => v / n);
    const H = n ? -p.reduce((a, x) => a + x * Math.log(x), 0) : 0;
    const { _rich, sources, ...rest } = d;
    return { ...rest, richness: _rich.size, sources: [...sources],
             cpue: d.effort ? +(d.catch / d.effort).toFixed(1) : 0,
             shannonH: +H.toFixed(2) };
  });

const baseline = {
  generatedAt: new Date().toISOString(),
  generator: 'scripts/export_agent_baseline.js',
  note: '後端 Agent 的預設資料。前端有送 client_snapshot 時以前端為準，'
      + '此檔僅補齊缺漏的鍵，確保無瀏覽器時仍能取得權威數值。',
  sourceHashes: { 'webapp/js/db.js': sha(dbSrc), 'webapp/js/modules/fish.js': sha(fishSrc) },
  facilities: facilitiesAssessed,
  inspections,
  fishKeyNames,
  publishedFishKeys: publishedKeys,
  fishSurveys,
  fishAnnualData,
  fishDataAudit: { presenceOnly, occurrence9306,
    standardSpecies: publishedKeys.map(k => fishKeyNames[k]),
    policy: '同年度不同計畫並列不相加；空白不視為0尾；平均體長或文字出現不轉換為尾數；他溪紀錄不併入橫流溪。' },
  ecoBenchmark, inFishwayCatch, summary110, threatenedKeys,
  counts: {
    facilities: facilitiesAssessed.length,
    inspections: inspections.length,
    riskBands: facilitiesAssessed.reduce((acc, f) => {
      acc[f.riskLevel] = (acc[f.riskLevel] || 0) + 1; return acc;
    }, {}),
    fishSurveys: fishSurveys.length,
    fishSpecies: publishedKeys.length,
    stationVisits: fishSurveys.reduce((a, s) => a + stationsOf(s), 0),
    totalCatch: fishAnnualData.reduce((a, d) => a + d.catch, 0),
  },
};

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(baseline, null, 1), 'utf8');
console.log('已輸出', path.relative(ROOT, OUT));
console.log('  設施', baseline.counts.facilities, '座（現況依最新專業巡查推算）',
            JSON.stringify(baseline.counts.riskBands));
console.log('  巡查', baseline.counts.inspections, '筆');
console.log('  魚類', baseline.counts.fishSurveys, '場次 /',
            baseline.counts.stationVisits, '站次 /',
            baseline.counts.totalCatch, '尾 /',
            baseline.counts.fishSpecies, '種');
console.log('  年度彙整', fishAnnualData.length, '年',
            fishAnnualData.map(d => `${d.label}:${d.catch}尾/${d.richness}種`).join(' '));
