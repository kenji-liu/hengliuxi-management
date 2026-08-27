/**
 * 匯出 AI Agent 的「基準快照」──讓後端不依賴瀏覽器也能答對。
 *
 * 背景：Agent 的工具原本只吃前端送來的 client_snapshot。若使用者沒開瀏覽器
 * （例如直接打 API、行動裝置快取失效、或前端 DB 尚未初始化），工具會回傳
 * 「未帶入快照」，模型就改去文件裡找數字，實測會答出不存在的魚種與錯誤尾數。
 *
 * 本腳本把兩個唯一真實來源抽成 JSON，供後端載入為預設值：
 *   webapp/js/db.js            → 工程設施 seed（20 座）
 *   webapp/js/modules/fish.js  → 魚類量化序列、魚名對照、出現層、魚道實證
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

const ROOT = path.resolve(__dirname, '..');
const DB_JS = path.join(ROOT, 'webapp/js/db.js');
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
  facilities,
  fishKeyNames,
  publishedFishKeys: publishedKeys,
  fishSurveys,
  fishAnnualData,
  fishDataAudit: { presenceOnly, occurrence9306,
    standardSpecies: publishedKeys.map(k => fishKeyNames[k]),
    policy: '同年度不同計畫並列不相加；空白不視為0尾；平均體長或文字出現不轉換為尾數；他溪紀錄不併入橫流溪。' },
  ecoBenchmark, inFishwayCatch, summary110, threatenedKeys,
  counts: {
    facilities: facilities.length,
    fishSurveys: fishSurveys.length,
    fishSpecies: publishedKeys.length,
    stationVisits: fishSurveys.reduce((a, s) => a + stationsOf(s), 0),
    totalCatch: fishAnnualData.reduce((a, d) => a + d.catch, 0),
  },
};

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(baseline, null, 1), 'utf8');
console.log('已輸出', path.relative(ROOT, OUT));
console.log('  設施', baseline.counts.facilities, '座');
console.log('  魚類', baseline.counts.fishSurveys, '場次 /',
            baseline.counts.stationVisits, '站次 /',
            baseline.counts.totalCatch, '尾 /',
            baseline.counts.fishSpecies, '種');
console.log('  年度彙整', fishAnnualData.length, '年',
            fishAnnualData.map(d => `${d.label}:${d.catch}尾/${d.richness}種`).join(' '));
