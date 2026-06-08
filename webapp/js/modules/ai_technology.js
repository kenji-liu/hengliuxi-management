// NLP + RAG technology integration page.
function renderAITechnology() {
  const facilities = DB.getAll('facilities');
  const fish = DB.getAll('fish');
  const habitats = DB.getAll('habitats');
  const inspections = DB.getAll('inspections');
  const riskFacilities = facilities.filter(f => f.status !== '正常' || (f.condition || 5) <= 2).length;
  const ecologyRecords = fish.reduce((sum, item) => sum + (item.count || 0), 0);

  document.getElementById('contentArea').innerHTML = `
    <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:16px;margin-bottom:16px;flex-wrap:wrap">
      <div>
        <div style="font-size:12px;color:var(--text-muted);margin-bottom:4px">自然語言處理 NLP + 檢索增強生成 RAG</div>
        <h2 style="margin:0;font-size:22px;color:var(--text)">橫流溪智慧管理平台 AI 技術分析</h2>
      </div>
      <button class="btn btn-primary" id="aiTechRunBtn" onclick="runAIPlatformAnalysis()">
        <i class="fas fa-play"></i> 執行平台 AI 分析
      </button>
    </div>

    <div class="stats-grid" style="grid-template-columns:repeat(4,minmax(0,1fr));margin-bottom:16px">
      ${aiTechMetric('工程設施', facilities.length, '座', 'hard-hat', '#1565c0')}
      ${aiTechMetric('巡查紀錄', inspections.length, '筆', 'clipboard-check', '#2e7d32')}
      ${aiTechMetric('生態數據', ecologyRecords, '尾次', 'fish', '#00838f')}
      ${aiTechMetric('需關注設施', riskFacilities, '座', 'triangle-exclamation', '#c62828')}
    </div>

    <div style="display:grid;grid-template-columns:1.1fr .9fr;gap:16px;margin-bottom:16px">
      <div class="card" style="margin:0">
        <div class="card-header">
          <span class="card-title"><i class="fas fa-language"></i> NLP 語意處理流程</span>
        </div>
        <div class="card-body">
          ${aiTechStep('1', '問題解析', '辨識設施名稱、樁號、魚道、平台、WUA、水深、流速、巡查異常等領域詞。')}
          ${aiTechStep('2', '語意擴展', '將「維護、巡查、損壞、棲地、魚道」轉換為同義詞與關聯詞，提高中文查詢召回率。')}
          ${aiTechStep('3', '量化抽取', '優先擷取百分比、m2、m/s、m、TWD97、年份、數量與健康指數作為分析依據。')}
          ${aiTechStep('4', '專業分流', '工程設施、地滑監測、生態棲地分開判讀，魚類資料不直接作為工程健康指數因子。')}
        </div>
      </div>

      <div class="card" style="margin:0">
        <div class="card-header">
          <span class="card-title"><i class="fas fa-database"></i> RAG 即時檢索架構</span>
        </div>
        <div class="card-body">
          <div style="display:grid;gap:8px;font-size:13px;line-height:1.65">
            ${aiTechFlow('文件切塊', 'PDF、報告、維護手冊依頁碼與段落切塊')}
            ${aiTechFlow('向量化', '使用 all-MiniLM-L6-v2 建立語意向量')}
            ${aiTechFlow('向量資料庫', '僅儲存向量、頁碼、片段索引與必要中繼資料')}
            ${aiTechFlow('檢索重排序', '依查詢語意、樁號、設施名稱與數值線索重新排序')}
            ${aiTechFlow('本機推論', '以 Ollama 模型根據檢索片段產生回答，不更新模型參數')}
          </div>
        </div>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px">
      <div class="card" style="margin:0">
        <div class="card-header">
          <span class="card-title"><i class="fas fa-chart-line"></i> AI 分析產出</span>
        </div>
        <div class="card-body">
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
            ${aiTechOutput('工程維護判讀', '設施狀態、淤積、沖刷、損壞、巡查優先序')}
            ${aiTechOutput('GIS 決策輔助', '設施定位、熱區、河道里程、圖層關聯')}
            ${aiTechOutput('棲地量化分析', 'WUA、深槽、緩流避難帶、淺瀨覓食區')}
            ${aiTechOutput('信心分級', '高信心建議、中信心複核、低信心人工確認')}
          </div>
        </div>
      </div>

      <div class="card" style="margin:0">
        <div class="card-header">
          <span class="card-title"><i class="fas fa-server"></i> RAG 後端狀態</span>
        </div>
        <div class="card-body" id="aiTechStatus">
          <div style="color:var(--text-muted);font-size:13px">正在讀取 RAG / Ollama 狀態...</div>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="card-header">
        <span class="card-title"><i class="fas fa-wand-magic-sparkles"></i> 平台 AI 分析結果</span>
      </div>
      <div class="card-body">
        <div id="aiTechResult" style="background:#f8fafc;border:1px solid #e5e7eb;border-radius:8px;padding:12px;font-size:13px;line-height:1.65;color:#334155">
          尚未執行。本頁會以 RAG 檢索橫流溪資料，再用本機 Ollama 依「量化判讀、管理判斷、處置建議」產生平台分析。
        </div>
      </div>
    </div>

    <div class="card">
      <div class="card-header">
        <span class="card-title"><i class="fas fa-comments"></i> AI 問題機制</span>
      </div>
      <div class="card-body">
        <div style="display:grid;gap:10px">
          <textarea id="aiTechQuestion" placeholder="請輸入問題，例如：溪構5-2維護重點是什麼？0K+740棲地二維模式如何判讀？平台與步道設施要如何巡查？"
            style="width:100%;min-height:86px;padding:10px;border:1px solid #d5dde7;border-radius:8px;font-family:inherit;font-size:13px;line-height:1.55;resize:vertical"></textarea>
          <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
            <button class="btn btn-primary" id="aiTechAskBtn" onclick="askAITechQuestion()">
              <i class="fas fa-paper-plane"></i> 送出問題
            </button>
            <button class="btn btn-sm btn-outline" onclick="fillAITechQuestion('溪構5-2目前維護風險與建議是什麼？')">溪構5-2</button>
            <button class="btn btn-sm btn-outline" onclick="fillAITechQuestion('棲地二維模式中各區 WUA 百分比與管理判斷為何？')">WUA判讀</button>
            <button class="btn btn-sm btn-outline" onclick="fillAITechQuestion('平台與步道設施的巡查重點是什麼？')">平台步道</button>
          </div>
          <div id="aiTechQaResult" style="background:#fff;border:1px solid #e5e7eb;border-radius:8px;padding:12px;font-size:13px;line-height:1.6;color:#334155">
            請先輸入問題，AI 將依 NLP 語意解析、RAG 檢索與本機模型產生回答。
          </div>
        </div>
      </div>
    </div>
  `;

  loadAITechStatus();
}

function aiTechMetric(label, value, unit, icon, color) {
  return `
    <div class="stat-card">
      <div class="stat-icon" style="background:${color}18;color:${color}"><i class="fas fa-${icon}"></i></div>
      <div>
        <div class="stat-value">${value}</div>
        <div class="stat-label">${label} ${unit}</div>
      </div>
    </div>
  `;
}

function aiTechStep(no, title, body) {
  return `
    <div style="display:grid;grid-template-columns:28px 1fr;gap:10px;margin-bottom:10px;align-items:start">
      <div style="width:28px;height:28px;border-radius:50%;background:#e8f5e9;color:#1b5e20;font-weight:700;display:flex;align-items:center;justify-content:center">${no}</div>
      <div>
        <div style="font-weight:700;color:#1f2937;margin-bottom:2px">${title}</div>
        <div style="font-size:13px;line-height:1.6;color:#475569">${body}</div>
      </div>
    </div>
  `;
}

function aiTechFlow(title, body) {
  return `
    <div style="display:flex;gap:8px;align-items:flex-start;padding:8px;border:1px solid #e5e7eb;border-radius:6px;background:#fff">
      <i class="fas fa-check-circle" style="color:#2e7d32;margin-top:3px"></i>
      <div><b>${title}</b><br><span style="color:#64748b">${body}</span></div>
    </div>
  `;
}

function aiTechOutput(title, body) {
  return `
    <div style="border-left:3px solid #1565c0;background:#f8fafc;border-radius:0 6px 6px 0;padding:10px">
      <div style="font-weight:700;margin-bottom:4px;color:#0f172a">${title}</div>
      <div style="font-size:12px;line-height:1.55;color:#475569">${body}</div>
    </div>
  `;
}

async function loadAITechStatus() {
  const el = document.getElementById('aiTechStatus');
  if (!el) return;
  try {
    const status = await fetchRagStatus();
    el.innerHTML = `
      ${aiTechStatusRow('RAG狀態', status.status || '-')}
      ${aiTechStatusRow('推論模式', status.inference_mode || '-')}
      ${aiTechStatusRow('向量片段', `${status.chunk_count || 0} 筆`)}
      ${aiTechStatusRow('嵌入模型', status.model_name || '-')}
      ${aiTechStatusRow('Ollama', status.ollama?.connected ? `已連線：${status.ollama.model}` : '未連線')}
    `;
  } catch (error) {
    el.innerHTML = `<div style="color:#b71c1c;font-size:13px">無法讀取 RAG 後端狀態：${escapeHtml(error.message)}</div>`;
  }
}

function aiTechStatusRow(label, value) {
  return `
    <div style="display:flex;justify-content:space-between;gap:12px;padding:7px 0;border-bottom:1px solid #edf2f7;font-size:13px">
      <span style="color:#64748b">${label}</span>
      <b style="color:#0f172a;text-align:right">${escapeHtml(String(value))}</b>
    </div>
  `;
}

async function fetchRagStatus() {
  const bases = aiTechApiBases();
  let lastError = null;
  for (const base of bases) {
    try {
      const res = await fetch(`${base}/api/rag/status`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError || new Error('RAG API unavailable');
}

function aiTechApiBases() {
  return window.HLX_API_BASE
    ? [window.HLX_API_BASE]
    : ['http://localhost:5000', '', 'http://localhost:5051', 'http://localhost:5050'];
}

async function runAIPlatformAnalysis() {
  const el = document.getElementById('aiTechResult');
  const btn = document.getElementById('aiTechRunBtn');
  if (!el) return;

  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 分析中';
  }

  const immediate = buildImmediatePlatformAnalysis();
  el.textContent = immediate + '\n\nRAG 檢索補強：正在連接本機 Ollama，完成後會自動更新補充結果。';

  try {
    const query = '請以橫流溪智慧管理平台角度，整合工程設施、GIS、溪流生態、巡查紀錄與水域棲地量化資料，提出量化判讀、管理判斷與處置建議。';
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 45000);
    const data = await queryRagForAITech(query, controller.signal);
    clearTimeout(timer);
    el.textContent = data.answer
      ? `${immediate}\n\nRAG 檢索補強：\n${data.answer}`
      : immediate;
  } catch (error) {
    const reason = error.name === 'AbortError' ? '本機模型回應超過 45 秒，已保留即時量化分析結果。' : `RAG 補強暫未完成：${error.message}`;
    el.textContent = `${immediate}\n\n${reason}`;
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-play"></i> 重新執行平台 AI 分析';
    }
  }
}

function fillAITechQuestion(text) {
  const input = document.getElementById('aiTechQuestion');
  if (!input) return;
  input.value = text;
  input.focus();
}

function buildLocalAITechAnswer(question) {
  const text = String(question || '');
  const isMaintenanceQuestion = /今天|今日|維護|巡查|待處理|處理中|緊急|異常|損壞|有哪些/.test(text);
  if (!isMaintenanceQuestion) return null;

  const facilities = DB.getAll('facilities') || [];
  const inspections = DB.getAll('inspections') || [];
  const priorityScore = item => {
    const priority = String(item.priority || item.risk || item.severity || '');
    if (/緊急|critical/i.test(priority)) return 4;
    if (/高|high/i.test(priority)) return 3;
    if (/中|medium/i.test(priority)) return 2;
    if (/低|low/i.test(priority)) return 1;
    return 0;
  };
  const openInspections = inspections
    .filter(item => !/完成|結案|正常/.test(String(item.status || '')))
    .sort((a, b) => priorityScore(b) - priorityScore(a))
    .slice(0, 6);
  const riskFacilities = facilities
    .filter(item => !/正常|良好/.test(String(item.status || '')) || Number(item.condition || 5) <= 2)
    .sort((a, b) => Number(a.condition || 5) - Number(b.condition || 5))
    .slice(0, 6);

  const names = new Set();
  const rows = [];
  openInspections.forEach(item => {
    const name = item.facilityName || item.facility || item.name || item.facilityId || '未命名設施';
    names.add(name);
    rows.push({
      name,
      level: item.priority || item.risk || '待判定',
      status: item.status || '待處理',
      issue: item.findings || item.issue || item.description || item.notes || '巡查紀錄顯示需複核',
      action: item.recommendation || item.action || '安排現場複查，確認損壞範圍與維修工項'
    });
  });
  riskFacilities.forEach(item => {
    const name = item.name || item.facilityName || item.id || '未命名設施';
    if (names.has(name)) return;
    rows.push({
      name,
      level: item.priority || (Number(item.condition || 5) <= 2 ? '高' : '中'),
      status: item.status || `健康分數 ${item.condition || '-'}`,
      issue: item.damage || item.issue || item.description || '設施狀態非正常或健康分數偏低',
      action: '列入今日巡查清單，補拍照片並更新維護紀錄'
    });
  });

  if (!rows.length) {
    return '目前平台本機資料未列出「今日必須維護」項目；建議仍依例行巡查檢核魚道入口、護岸沖刷、平台鋪面與排水通暢性，若現場有新增照片請匯入巡查紀錄後再分析。';
  }

  const highRiskCount = rows.filter(item => /緊急|高/.test(String(item.level))).length;
  const lines = rows.slice(0, 5).map((item, index) =>
    `${index + 1}. ${item.name}：${item.status}，風險等級 ${item.level}。重點為${item.issue}；建議${item.action}。`
  );

  return [
    `今日建議優先維護/巡查 ${rows.length} 項，其中高風險 ${highRiskCount} 項。`,
    ...lines,
    '管理判斷：先處理緊急與高風險項目，再依樁號由下游往上游排程，可同步更新工程設施管理與巡查紀錄辨識結果。'
  ].join('\n');
}

async function askAITechQuestion() {
  const input = document.getElementById('aiTechQuestion');
  const output = document.getElementById('aiTechQaResult');
  const btn = document.getElementById('aiTechAskBtn');
  const question = (input?.value || '').trim();

  if (!question) {
    if (output) output.textContent = '請先輸入問題，例如「溪構5-2目前維護風險與建議是什麼？」';
    return;
  }

  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> AI回答中';
  }

  const localPreview = buildLocalAITechAnswer(question);
  if (output) {
    output.textContent = localPreview
      ? `問題：${question}\n\nAI回答（平台本機資料即時判讀）：\n${localPreview}\n\n正在連接 RAG/Ollama 補強分析，完成後會自動更新。`
      : `問題：${question}\n\n正在進行 NLP 語意解析、RAG 即時檢索與本機 AI 推論...`;
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), localPreview ? 35000 : 90000);
    const data = await queryRagForAITech(question, controller.signal);
    clearTimeout(timer);
    const confidence = data.confidence_level ? `信心等級：${data.confidence_level}（${data.confidence_score || 0}%）` : '信心等級：未提供';
    const answer = data.answer || '目前檢索內容不足以產生回答，請補充設施名稱、樁號、日期或資料範圍。';
    const weakRagAnswer = /檢索內容不足|不足以|無法判定|無法提供|請補充/.test(answer);
    if (output) {
      output.textContent = localPreview && weakRagAnswer
        ? `問題：${question}\n${confidence}\n\nAI回答（平台本機資料優先）：\n${localPreview}\n\nRAG補強：本次文件檢索未取得比巡查紀錄更具體的今日維護清單，因此保留平台巡查與設施狀態的判讀結果。`
        : `問題：${question}\n${confidence}\n\nAI回答：\n${answer}`;
    }
  } catch (error) {
    const fallback = buildLocalAITechAnswer(question);
    if (fallback && output) {
      const statusNote = error.name === 'AbortError'
        ? 'RAG/Ollama 回應逾時，已改用平台本機資料進行備援分析。'
        : `RAG 後端暫時無法連線，已改用平台本機資料進行備援分析。連線訊息：${error.message}`;
      output.textContent = `問題：${question}\n\nAI回答（本機資料備援）：\n${fallback}\n\n${statusNote}`;
      return;
    }
    const message = error.name === 'AbortError'
      ? 'AI 回答逾時，請改用更具體的設施名稱、樁號或縮短問題範圍後重試。'
      : `AI 回答失敗：${error.message}`;
    if (output) output.textContent = `問題：${question}\n\n${message}`;
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-paper-plane"></i> 送出問題';
    }
  }
}

function buildImmediatePlatformAnalysis() {
  const facilities = DB.getAll('facilities');
  const fish = DB.getAll('fish');
  const habitats = DB.getAll('habitats');
  const inspections = DB.getAll('inspections');
  const riskFacilities = facilities.filter(f => f.status !== '正常' || (f.condition || 5) <= 2);
  const pending = inspections.filter(i => i.status !== '完成');
  const totalFish = fish.reduce((sum, item) => sum + (item.count || 0), 0);
  const conservation = fish.filter(f => f.conservation && f.conservation !== '一般').length;
  const stations = facilities.map(f => f.stationKm).filter(Boolean);
  const stationRange = stations.length ? `${stations[0]} 至 ${stations[stations.length - 1]}` : '0K+460 至 1K+400';

  return [
    '量化判讀：',
    `平台目前納管工程設施 ${facilities.length} 座、巡查紀錄 ${inspections.length} 筆、棲地樣區 ${habitats.length} 處、魚類資料 ${fish.length} 種/${totalFish} 尾次，主要管理河段為 ${stationRange}。`,
    `需關注設施 ${riskFacilities.length} 座、待處理巡查 ${pending.length} 筆；保育或敏感魚類資料 ${conservation} 種，應作為生態敏感區與工程影響評估依據。`,
    '管理判斷：',
    'NLP 先解析設施名稱、樁號、魚道、平台、巡查異常、WUA 等詞彙，再由 RAG 檢索報告片段與平台結構化資料，避免未檢索即生成造成幻覺。',
    '工程設施、地滑監測、生態棲地需分層管理；魚類與棲地資料可用於生態敏感區、棲地影響與復育成效分析，不直接納入工程健康指數。',
    '處置建議：',
    '優先針對需關注設施建立巡查清單，GIS 圖台同步標示異常熱區；AI 回答採高/中/低信心分級，低信心或缺資料時應引導補充設施名稱、樁號、日期或報告範圍。'
  ].join('\n');
}

async function queryRagForAITech(query, signal) {
  const bases = aiTechApiBases();
  let lastError = null;
  for (const base of bases) {
    try {
      const res = await fetch(`${base}/api/rag/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
        signal
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError || new Error('RAG API unavailable');
}
