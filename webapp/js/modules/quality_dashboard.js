// Phase 2.3 — RAG 質量儀表板
// 4 維度評分：正確性、可追溯性、一致性、可讀性

const QD = {
  results: [],       // [{qid, category, score, dims, passed, timestamp}]
  running: false,
  aborted: false,

  // ── 工具 ──────────────────────────────────────────────
  apiBase() {
    return window.HLX_API_BASE || '';
  },

  async fetchBenchmark() {
    const res = await fetch('/webapp/data/quality_benchmark.json');
    if (!res.ok) throw new Error('無法載入題庫');
    const data = await res.json();
    return data.questions;
  },

  async callRAG(query) {
    const res = await fetch(`${this.apiBase()}/api/rag/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query })
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  },

  // ── 4 維度評分 ─────────────────────────────────────────
  score(question, response) {
    const answer = (response.answer || '').toLowerCase();
    const sources = response.structured_citations || response.sources || [];
    const confidence = response.confidence_level || 'none';

    // 1. 正確性：answer 包含預期關鍵詞的比例
    const kwHits = question.expected_keywords.filter(kw =>
      answer.includes(kw.toLowerCase())
    ).length;
    const correctness = question.expected_keywords.length > 0
      ? kwHits / question.expected_keywords.length
      : 0.5;

    // 2. 可追溯性：有無來源引用
    const traceability = sources.length >= question.expected_sources_count ? 1.0
      : sources.length > 0 ? 0.6 : 0.0;

    // 3. 一致性：信心等級是否達最低門檻
    const topScore = sources.length > 0
      ? Math.max(...sources.map(s => Number(s.score || 0)))
      : (response.confidence_score || 0) / 100;
    const consistency = topScore >= question.min_confidence ? 1.0
      : topScore >= question.min_confidence * 0.7 ? 0.6 : 0.2;

    // 4. 可讀性：answer 長度與結構
    const len = (response.answer || '').length;
    const readability = len >= 100 && len <= 800 ? 1.0
      : len >= 50 ? 0.7 : 0.3;

    const weights = { correctness: 0.4, traceability: 0.25, consistency: 0.2, readability: 0.15 };
    const total = correctness * weights.correctness
      + traceability * weights.traceability
      + consistency * weights.consistency
      + readability * weights.readability;

    return {
      total: Math.round(total * 100),
      dims: { correctness, traceability, consistency, readability },
      passed: total >= 0.6
    };
  },

  // ── 執行評測 ───────────────────────────────────────────
  async runEval() {
    if (this.running) return;
    this.running = true;
    this.aborted = false;
    this.results = [];

    let questions;
    try { questions = await this.fetchBenchmark(); }
    catch (e) { this.running = false; renderQualityDashboard(); return; }

    const logEl = document.getElementById('qdLog');
    const progressEl = document.getElementById('qdProgress');
    const progressBar = document.getElementById('qdProgressBar');
    if (logEl) logEl.innerHTML = '';

    for (let i = 0; i < questions.length; i++) {
      if (this.aborted) break;
      const q = questions[i];
      const pct = Math.round(((i + 1) / questions.length) * 100);
      if (progressEl) progressEl.textContent = `${i + 1} / ${questions.length}`;
      if (progressBar) progressBar.style.width = `${pct}%`;

      let entry = { qid: q.id, category: q.category, query: q.query, score: 0, dims: {}, passed: false, timestamp: new Date().toISOString(), error: null };
      try {
        const res = await this.callRAG(q.query);
        const scored = this.score(q, res);
        entry = { ...entry, ...scored };
        if (logEl) logEl.insertAdjacentHTML('beforeend',
          `<div style="display:flex;gap:8px;align-items:center;padding:4px 0;border-bottom:1px solid #f0f0f0">
            <span style="font-size:11px;color:#64748b;width:32px">${q.id}</span>
            <span style="flex:1;font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${q.query}</span>
            <span style="font-size:12px;font-weight:700;color:${entry.passed?'#2e7d32':'#c62828'}">${entry.score}%</span>
            <span style="font-size:11px;padding:2px 6px;border-radius:10px;background:${entry.passed?'#e8f5e9':'#ffebee'};color:${entry.passed?'#2e7d32':'#c62828'}">${entry.passed?'通過':'未通過'}</span>
          </div>`
        );
      } catch (e) {
        entry.error = e.message;
        if (logEl) logEl.insertAdjacentHTML('beforeend',
          `<div style="padding:4px 0;font-size:12px;color:#c62828">${q.id} ${q.query} — 錯誤: ${e.message}</div>`
        );
      }
      this.results.push(entry);

      // Short pause to avoid overwhelming the server
      await new Promise(r => setTimeout(r, 400));
    }

    this.running = false;
    this.saveResults();
    renderQualityDashboard();
  },

  saveResults() {
    try {
      const history = JSON.parse(localStorage.getItem('qd_history') || '[]');
      history.unshift({ ts: new Date().toISOString(), results: this.results });
      localStorage.setItem('qd_history', JSON.stringify(history.slice(0, 10)));
    } catch (_) {}
  },

  loadHistory() {
    try {
      const h = JSON.parse(localStorage.getItem('qd_history') || '[]');
      return h;
    } catch (_) { return []; }
  },

  summary(results) {
    if (!results.length) return null;
    const avg = arr => arr.reduce((a, b) => a + b, 0) / arr.length;
    const scores = results.map(r => r.score);
    const byCategory = {};
    results.forEach(r => {
      if (!byCategory[r.category]) byCategory[r.category] = [];
      byCategory[r.category].push(r.score);
    });
    const catAvg = {};
    Object.entries(byCategory).forEach(([k, v]) => { catAvg[k] = Math.round(avg(v)); });
    return {
      total: Math.round(avg(scores)),
      passed: results.filter(r => r.passed).length,
      total_q: results.length,
      pass_rate: Math.round(results.filter(r => r.passed).length / results.length * 100),
      by_category: catAvg,
      dims: {
        correctness: Math.round(avg(results.map(r => (r.dims?.correctness || 0) * 100))),
        traceability: Math.round(avg(results.map(r => (r.dims?.traceability || 0) * 100))),
        consistency: Math.round(avg(results.map(r => (r.dims?.consistency || 0) * 100))),
        readability: Math.round(avg(results.map(r => (r.dims?.readability || 0) * 100)))
      }
    };
  }
};

function renderQualityDashboard() {
  const history = QD.loadHistory();
  const latest = QD.results.length ? QD.results : (history[0]?.results || []);
  const s = QD.summary(latest);
  const catLabel = { engineering: '工程維護', ecology: '生態棲地', gis: 'GIS定位', regulation: '法規合規' };
  const dimLabel = { correctness: '正確性', traceability: '可追溯性', consistency: '一致性', readability: '可讀性' };

  const trendHtml = history.length > 1 ? (() => {
    const pts = history.slice(0, 8).reverse();
    const max = 100;
    const h = 60, w = 100;
    const xs = pts.map((_, i) => (i / Math.max(pts.length - 1, 1)) * w);
    const ys = pts.map(p => h - (QD.summary(p.results)?.total || 0) / max * h);
    const poly = xs.map((x, i) => `${x},${ys[i]}`).join(' ');
    const dates = pts.map(p => p.ts.slice(5, 10));
    return `
      <div class="card" style="margin-bottom:16px">
        <div class="card-header"><span class="card-title">歷次評測趨勢</span></div>
        <div class="card-body" style="padding:12px">
          <svg viewBox="0 0 100 60" style="width:100%;height:80px;overflow:visible">
            <polyline points="${poly}" fill="none" stroke="var(--primary)" stroke-width="1.5"/>
            ${xs.map((x, i) => `<circle cx="${x}" cy="${ys[i]}" r="2" fill="var(--primary)"/>`).join('')}
            ${xs.map((x, i) => `<text x="${x}" y="60" text-anchor="middle" font-size="4" fill="#64748b">${dates[i]}</text>`).join('')}
          </svg>
        </div>
      </div>`;
  })() : '';

  document.getElementById('contentArea').innerHTML = `
    <div style="padding:0 4px">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
        <div>
          <h2 style="margin:0;font-size:18px">RAG 質量儀表板</h2>
          <div style="font-size:12px;color:#64748b;margin-top:2px">Phase 2.3 — ${latest.length ? `${latest.length} 題評測` : '尚未執行評測'}</div>
        </div>
        <div style="display:flex;gap:8px">
          ${QD.running
            ? `<button class="btn btn-outline btn-sm" onclick="QD.aborted=true">停止</button>
               <span style="align-self:center;font-size:13px;color:var(--primary)">評測中…</span>`
            : `<button class="btn btn-primary" onclick="QD.runEval()"><i class="fas fa-play"></i> 執行評測</button>`}
        </div>
      </div>

      ${QD.running ? `
        <div style="margin-bottom:16px">
          <div style="display:flex;justify-content:space-between;font-size:12px;color:#64748b;margin-bottom:4px">
            <span>進度</span><span id="qdProgress">0 / 0</span>
          </div>
          <div style="height:6px;background:#e2e8f0;border-radius:3px">
            <div id="qdProgressBar" style="height:100%;background:var(--primary);border-radius:3px;width:0%;transition:width .3s"></div>
          </div>
        </div>` : ''}

      ${s ? `
        <div class="stats-grid" style="grid-template-columns:repeat(4,1fr);margin-bottom:16px">
          <div class="stat-card">
            <div class="stat-icon ${s.total>=80?'green':s.total>=60?'yellow':'red'}"><i class="fas fa-star"></i></div>
            <div><div class="stat-value">${s.total}%</div><div class="stat-label">綜合評分</div></div>
          </div>
          <div class="stat-card">
            <div class="stat-icon green"><i class="fas fa-check-circle"></i></div>
            <div><div class="stat-value">${s.passed}/${s.total_q}</div><div class="stat-label">通過題數</div></div>
          </div>
          <div class="stat-card">
            <div class="stat-icon blue"><i class="fas fa-percentage"></i></div>
            <div><div class="stat-value">${s.pass_rate}%</div><div class="stat-label">通過率</div></div>
          </div>
          <div class="stat-card">
            <div class="stat-icon orange"><i class="fas fa-eye"></i></div>
            <div><div class="stat-value">${s.dims.correctness}%</div><div class="stat-label">正確性</div></div>
          </div>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px">
          <div class="card">
            <div class="card-header"><span class="card-title">4 維度評分</span></div>
            <div class="card-body" style="padding:12px">
              ${Object.entries(s.dims).map(([k,v]) => `
                <div style="margin-bottom:10px">
                  <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:3px">
                    <span>${dimLabel[k]}</span><span style="font-weight:700">${v}%</span>
                  </div>
                  <div style="height:6px;background:#e2e8f0;border-radius:3px">
                    <div style="height:100%;background:${v>=80?'#2e7d32':v>=60?'#f57f17':'#c62828'};border-radius:3px;width:${v}%"></div>
                  </div>
                </div>`).join('')}
            </div>
          </div>
          <div class="card">
            <div class="card-header"><span class="card-title">分類評分</span></div>
            <div class="card-body" style="padding:12px">
              ${Object.entries(s.by_category).map(([k,v]) => `
                <div style="margin-bottom:10px">
                  <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:3px">
                    <span>${catLabel[k]||k}</span><span style="font-weight:700">${v}%</span>
                  </div>
                  <div style="height:6px;background:#e2e8f0;border-radius:3px">
                    <div style="height:100%;background:var(--primary);border-radius:3px;width:${v}%"></div>
                  </div>
                </div>`).join('')}
            </div>
          </div>
        </div>` : ''}

      ${trendHtml}

      <div class="card">
        <div class="card-header"><span class="card-title">逐題評測結果</span></div>
        <div class="card-body" style="padding:0">
          <div id="qdLog" style="max-height:320px;overflow-y:auto;padding:12px">
            ${latest.length ? latest.map(r => `
              <div style="display:flex;gap:8px;align-items:center;padding:5px 0;border-bottom:1px solid #f0f0f0">
                <span style="font-size:11px;color:#64748b;width:32px">${r.qid}</span>
                <span style="width:70px;font-size:11px;padding:2px 6px;border-radius:10px;background:${({engineering:'#e3f2fd',ecology:'#e8f5e9',gis:'#f3e5f5',regulation:'#fff8e1'})[r.category]||'#f0f0f0'};color:#334155">${catLabel[r.category]||r.category}</span>
                <span style="flex:1;font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${r.query}</span>
                <span style="font-size:12px;font-weight:700;color:${r.passed?'#2e7d32':'#c62828'};width:36px;text-align:right">${r.score}%</span>
                <span style="font-size:11px;padding:2px 6px;border-radius:10px;background:${r.passed?'#e8f5e9':'#ffebee'};color:${r.passed?'#2e7d32':'#c62828'}">${r.passed?'通過':'未通過'}</span>
              </div>`).join('')
            : '<div style="color:#64748b;font-size:13px;text-align:center;padding:24px">點擊「執行評測」開始測試 20 題標準查詢</div>'}
          </div>
        </div>
      </div>
    </div>
  `;
}
