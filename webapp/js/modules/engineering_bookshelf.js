// Historical engineering design document bookshelf.
// 來源：01_工程設施維護與資料/橫流溪歷年整治工程（依工程名稱整合主檔與結算明細）
const ENGINEERING_BOOKS = [

  /* ── 整治規劃設計監造 ── */
  {
    category: '整治規劃設計監造', year: '107-108',
    title: '107~108年度橫流溪整治規劃設計監造與監測調查成果報告',
    type: '成果報告', format: 'PDF',
    tags: ['規劃設計', '監造', '二維模式', '魚道', '生態監測'],
    summary: '整合橫流溪整治規劃、設計監造、水理模擬與溪流生態調查，是工程設計與後續管理的核心依據。',
    path: '01_工程設施維護與資料/11 成果報告/02.107~108年度橫流溪整治規劃設計監造與監測調查委託技術服務案 成果報告.pdf'
  },
  {
    category: '整治規劃設計監造', year: '110',
    title: '東勢林區管理處國有林魚道及生態廊道成效追蹤',
    type: '追蹤成果', format: 'PDF',
    tags: ['魚道', '生態廊道', '成效追蹤', '橫流溪'],
    summary: '魚道與生態廊道成效追蹤資料，可輔助工程設施與生態監測關聯分析。',
    path: '01_工程設施維護與資料/成果報告/110年_東勢林區管理處國有林魚道及生態廊道成效追蹤.pdf'
  },

  /* ── 仙區23林班治理工程 ── */
  {
    category: '仙區23林班治理工程', year: '歷年',
    title: '仙區23林班治理工程',
    type: '設計/施工圖說', format: 'PDF',
    tags: ['治理工程', '林班', '防砂設施'],
    summary: '仙區23林班治理工程設計與施工資料，可供比對構造物型式與歷年治理脈絡。',
    path: '01_工程設施維護與資料/橫流溪歷年整治工程/仙區23林班治理工程.pdf'
  },
  {
    category: '仙區23林班治理工程', year: '歷年',
    title: '仙區23林班治理工程 結算明細表',
    type: '結算明細', format: 'PDF',
    tags: ['仙區23林班', '結算', '工程經費'],
    summary: '仙區23林班治理工程結算明細，供歷年工程經費與項目追蹤依據。',
    path: '01_工程設施維護與資料/橫流溪歷年整治工程/仙區23林班治理工程結算明細表.pdf'
  },

  /* ── 橫流溪整治第二期工程 ── */
  {
    category: '橫流溪整治第二期工程', year: '歷年',
    title: '橫流溪整治第二期工程',
    type: '設計/施工圖說', format: 'PDF',
    tags: ['整治', '第二期', '構造物'],
    summary: '整治第二期工程資料，可作為工程命名、分類與設施履歷比對基礎。',
    path: '01_工程設施維護與資料/橫流溪歷年整治工程/橫流溪整治第二期工程.pdf'
  },
  {
    category: '橫流溪整治第二期工程', year: '歷年',
    title: '橫流溪整治第二期工程 決算明細表',
    type: '決算明細', format: 'PDF',
    tags: ['整治', '第二期', '決算', '工程經費'],
    summary: '整治第二期工程決算資料，供履約、經費與工程履歷查詢。',
    path: '01_工程設施維護與資料/橫流溪歷年整治工程/橫流溪整治第二期工程決算明細表.pdf'
  },

  /* ── 橫流溪下游整治第二期工程 ── */
  {
    category: '橫流溪下游整治第二期工程', year: '歷年',
    title: '橫流溪下游整治第二期工程',
    type: '設計/施工圖說', format: 'PDF',
    tags: ['下游', '第二期', '整治工程'],
    summary: '下游河段第二期整治工程資料，適合比對防砂壩、固床工與魚道相關配置。',
    path: '01_工程設施維護與資料/橫流溪歷年整治工程/橫流溪下游整治第二期工程.pdf'
  },
  {
    category: '橫流溪下游整治第二期工程', year: '歷年',
    title: '橫流溪下游整治第二期工程 結算明細表',
    type: '結算明細', format: 'PDF',
    tags: ['下游', '第二期', '結算'],
    summary: '下游整治第二期工程結算資料，供工程履歷與經費追蹤。',
    path: '01_工程設施維護與資料/橫流溪歷年整治工程/橫流溪下游整治第二期工程結算明細表.pdf'
  },

  /* ── 橫流溪下游段改善工程 ── */
  {
    category: '橫流溪下游段改善工程', year: '歷年',
    title: '橫流溪下游段改善工程',
    type: '設計/施工圖說', format: 'PDF',
    tags: ['下游段', '改善工程', '河道整理'],
    summary: '下游段改善工程設計資料，可與現況巡查、GIS 點位及棲地連通性分析串接。',
    path: '01_工程設施維護與資料/橫流溪歷年整治工程/橫流溪下游段改善工程.pdf'
  },
  {
    category: '橫流溪下游段改善工程', year: '歷年',
    title: '橫流溪下游段改善工程 結算明細表',
    type: '結算明細', format: 'PDF',
    tags: ['下游段', '結算', '工程經費'],
    summary: '下游段改善工程結算資料，供歷年工程成本與項目追蹤。',
    path: '01_工程設施維護與資料/橫流溪歷年整治工程/橫流溪下游段改善工程結算明細表.pdf'
  },

  /* ── 橫流溪野溪整治工程 ── */
  {
    category: '橫流溪野溪整治工程', year: '歷年',
    title: '橫流溪野溪整治工程',
    type: '設計/施工圖說', format: 'PDF',
    tags: ['野溪', '整治工程', '河道整理'],
    summary: '野溪整治工程資料，供既有工程類型、位置與後續維護對照。',
    path: '01_工程設施維護與資料/橫流溪歷年整治工程/橫流溪野溪整治工程.pdf'
  },
  {
    category: '橫流溪野溪整治工程', year: '歷年',
    title: '橫流溪野溪整治工程 結算明細表',
    type: '結算明細', format: 'PDF',
    tags: ['野溪', '結算', '工程經費'],
    summary: '野溪整治工程結算資料，供工程履歷與經費追蹤。',
    path: '01_工程設施維護與資料/橫流溪歷年整治工程/橫流溪野溪整治工程結算明細表.pdf'
  },

  /* ── 橫流溪野溪整治第三期工程 ── */
  {
    category: '橫流溪野溪整治第三期工程', year: '歷年',
    title: '橫流溪野溪整治第三期工程',
    type: '設計/施工圖說', format: 'PDF',
    tags: ['野溪', '第三期', '整治工程'],
    summary: '野溪整治第三期工程資料，供河段治理演進與設施履歷追蹤。',
    path: '01_工程設施維護與資料/橫流溪歷年整治工程/橫流溪野溪整治第三期工程.pdf'
  },
  {
    category: '橫流溪野溪整治第三期工程', year: '歷年',
    title: '橫流溪野溪整治第三期工程 結算明細表',
    type: '結算明細', format: 'PDF',
    tags: ['野溪', '第三期', '結算'],
    summary: '野溪整治第三期工程結算資料，供工程履歷與經費追蹤。',
    path: '01_工程設施維護與資料/橫流溪歷年整治工程/橫流溪野溪整治第三期工程結算明細表.pdf'
  },

  /* ── 橫流溪野溪周邊維護工程 ── */
  {
    category: '橫流溪野溪周邊維護工程', year: '歷年',
    title: '橫流溪野溪周邊維護工程',
    type: '維護工程', format: 'PDF',
    tags: ['野溪', '周邊維護', '維護工程'],
    summary: '野溪周邊維護工程資料，可支援平台、步道與周邊設施維護管理。',
    path: '01_工程設施維護與資料/橫流溪歷年整治工程/橫流溪野溪周邊維護工程.pdf'
  }

];

const MONITORING_VIDEOS = [
  {
    group: '9種魚道設計',
    title: '1. 粗石斜曲面魚道（1-1）',
    mode: '魚道設計',
    format: 'MP4',
    path: '02_魚類與棲地資料庫/橫流溪魚道與動物通道/橫流溪動物通道智慧評估_完整成果報告/2.影片、縮時及照片/1.魚道/1.粗石斜曲面(1-1).mp4'
  },
  {
    group: '9種魚道設計',
    title: '2. 改良型舟通式魚道（1-2）',
    mode: '魚道設計',
    format: 'MP4',
    path: '02_魚類與棲地資料庫/橫流溪魚道與動物通道/橫流溪動物通道智慧評估_完整成果報告/2.影片、縮時及照片/1.魚道/2.改良型舟通式魚道(1-2).mp4'
  },
  {
    group: '9種魚道設計',
    title: '3. 階段式魚道（半斷面）',
    mode: '魚道設計',
    format: 'MP4',
    path: '02_魚類與棲地資料庫/橫流溪魚道與動物通道/橫流溪動物通道智慧評估_完整成果報告/2.影片、縮時及照片/1.魚道/3.階段式魚道(半斷面).mp4'
  },
  {
    group: '9種魚道設計',
    title: '4. 粗石斜曲面式魚道',
    mode: '魚道設計',
    format: 'MP4',
    path: '02_魚類與棲地資料庫/橫流溪魚道與動物通道/橫流溪動物通道智慧評估_完整成果報告/2.影片、縮時及照片/1.魚道/4.粗石斜曲面式魚道.mp4'
  },
  {
    group: '9種魚道設計',
    title: '5. 階段式魚道',
    mode: '魚道設計',
    format: 'MP4',
    path: '02_魚類與棲地資料庫/橫流溪魚道與動物通道/橫流溪動物通道智慧評估_完整成果報告/2.影片、縮時及照片/1.魚道/5.階段式魚道.mp4'
  },
  {
    group: '9種魚道設計',
    title: '6. 潛越式魚道（階段）',
    mode: '魚道設計',
    format: 'MP4',
    path: '02_魚類與棲地資料庫/橫流溪魚道與動物通道/橫流溪動物通道智慧評估_完整成果報告/2.影片、縮時及照片/1.魚道/6.潛越式魚道(階段).mp4'
  },
  {
    group: '9種魚道設計',
    title: '7. 階段式魚道（半斷面）',
    mode: '魚道設計',
    format: 'MP4',
    path: '02_魚類與棲地資料庫/橫流溪魚道與動物通道/橫流溪動物通道智慧評估_完整成果報告/2.影片、縮時及照片/1.魚道/7.階段式魚道(半斷面).mp4'
  },
  {
    group: '9種魚道設計',
    title: '8. 降壩（上游階段）魚道',
    mode: '魚道設計',
    format: 'MP4',
    path: '02_魚類與棲地資料庫/橫流溪魚道與動物通道/橫流溪動物通道智慧評估_完整成果報告/2.影片、縮時及照片/1.魚道/8.降壩(上游階段)魚道.mp4'
  },
  {
    group: '9種魚道設計',
    title: '9. 梯狀（階段）魚道',
    mode: '魚道設計',
    format: 'MP4',
    path: '02_魚類與棲地資料庫/橫流溪魚道與動物通道/橫流溪動物通道智慧評估_完整成果報告/2.影片、縮時及照片/1.魚道/9.梯狀(階段)魚道.mp4'
  },
  {
    group: '監測模式',
    title: '日間模式監測影片',
    mode: '日間',
    format: 'MP4',
    path: '02_魚類與棲地資料庫/橫流溪魚道與動物通道/橫流溪動物通道智慧評估_完整成果報告/2.影片、縮時及照片/2.日間模式/日間results1030_GX010241.mp4'
  },
  {
    group: '監測模式',
    title: '夜間模式監測影片',
    mode: '夜間',
    format: 'MP4',
    path: '02_魚類與棲地資料庫/橫流溪魚道與動物通道/橫流溪動物通道智慧評估_完整成果報告/2.影片、縮時及照片/3.夜間模式/夜間results1030_GX030072.mp4'
  },
  {
    group: '監測模式',
    title: '左岸縮時 1',
    mode: '縮時',
    format: 'AVI',
    path: '02_魚類與棲地資料庫/橫流溪魚道與動物通道/橫流溪動物通道智慧評估_完整成果報告/2.影片、縮時及照片/4.縮時/1.左岸/左岸_縮時1.AVI'
  },
  {
    group: '監測模式',
    title: '右岸縮時 1',
    mode: '縮時',
    format: 'AVI',
    path: '02_魚類與棲地資料庫/橫流溪魚道與動物通道/橫流溪動物通道智慧評估_完整成果報告/2.影片、縮時及照片/4.縮時/2.右岸/右岸_縮時1.AVI'
  }
];

let engineeringShelfFilter = '全部';
let _shelfSelectedDoc = null; // 目前預覽的文件

// 兩大分類定義
const SHELF_MAIN_CATS = {
  '整治規劃': {
    color: '#0369a1', bg: '#eff6ff', icon: 'fa-drafting-compass',
    desc: '整治規劃、設計監造、成效追蹤等核心技術報告',
    keys: ['整治規劃設計監造']
  },
  '歷年整治工程': {
    color: '#2e7d32', bg: '#f0fdf4', icon: 'fa-hard-hat',
    desc: '各期整治工程設計/施工圖說與結算決算明細，依工程名稱整合',
    keys: ['仙區23林班治理工程','橫流溪整治第二期工程','橫流溪下游整治第二期工程','橫流溪下游段改善工程','橫流溪野溪整治工程','橫流溪野溪整治第三期工程','橫流溪野溪周邊維護工程']
  }
};

function shelfMainCatOf(book) {
  for (const [main, def] of Object.entries(SHELF_MAIN_CATS)) {
    if (def.keys.includes(book.category)) return main;
  }
  return '歷年整治工程';
}

function shelfSelectDoc(path, title) {
  _shelfSelectedDoc = { path, title };
  const frame  = document.getElementById('shelfPdfFrame');
  const noShow = document.getElementById('shelfNoPdf');
  const titleEl= document.getElementById('shelfPdfTitle');
  const linkEl = document.getElementById('shelfPdfLink');
  if (!frame) return;
  const href = engineeringDocHref(path);
  frame.src = href;
  frame.style.display = 'block';
  if (noShow) noShow.style.display = 'none';
  if (titleEl) titleEl.textContent = title;
  if (linkEl)  { linkEl.href = href; }
  // 更新左側高亮
  document.querySelectorAll('.shelf-doc-card').forEach(el => {
    el.style.borderLeftWidth = el.dataset.path === path ? '5px' : '1px';
    el.style.background = el.dataset.path === path ? '#f0fdf4' : '#fff';
  });
}

function renderEngineeringBookshelf() {
  const totalPlanning = ENGINEERING_BOOKS.filter(b => shelfMainCatOf(b) === '整治規劃').length;
  const totalWorks    = ENGINEERING_BOOKS.filter(b => shelfMainCatOf(b) === '歷年整治工程').length;
  const totalBudget   = ENGINEERING_BOOKS.filter(b => b.type === '結算明細' || b.type === '決算明細').length;
  const firstDoc      = ENGINEERING_BOOKS[0];

  document.getElementById('contentArea').innerHTML = `
    <!-- 標題列 -->
    <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:16px;margin-bottom:18px;flex-wrap:wrap">
      <div>
        <div style="font-size:14px;color:var(--text-muted);margin-bottom:5px">歷年工程設計資料歸檔</div>
        <h2 style="margin:0;font-size:26px;font-weight:900;color:var(--text)">橫流溪工程設計書架</h2>
        <div style="font-size:14px;color:#64748b;margin-top:5px">依整治規劃與歷年工程兩大類別整合，點選文件即可右側預覽</div>
      </div>
      <input id="engineeringBookSearch" oninput="updateEngineeringBookshelf()" placeholder="搜尋工程名稱…"
        style="width:240px;padding:10px 14px;border:1px solid #d5dde7;border-radius:10px;font-size:15px;align-self:flex-end">
    </div>

    <!-- 統計卡 -->
    <div class="stats-grid" style="grid-template-columns:repeat(auto-fit,minmax(160px,1fr));margin-bottom:20px">
      ${engineeringShelfMetric('上架文件', ENGINEERING_BOOKS.length, '本', 'book-open', '#1565c0')}
      ${engineeringShelfMetric('整治規劃', totalPlanning, '本', 'drafting-compass', '#0369a1')}
      ${engineeringShelfMetric('整治工程', totalWorks, '本', 'hard-hat', '#2e7d32')}
      ${engineeringShelfMetric('結算決算', totalBudget, '本', 'file-invoice-dollar', '#8a5a00')}
    </div>

    <!-- 主體：左側文件清單 + 右側 PDF 預覽 -->
    <div style="display:grid;grid-template-columns:420px 1fr;gap:16px;align-items:start">

      <!-- 左側：文件清單 -->
      <div id="engineeringBookshelfContent" style="display:flex;flex-direction:column;gap:0;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;max-height:900px;overflow-y:auto"></div>

      <!-- 右側：PDF 預覽 -->
      <div style="position:sticky;top:16px">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:10px;flex-wrap:wrap">
          <div style="font-size:16px;font-weight:800;color:#0f172a;flex:1;min-width:0" id="shelfPdfTitle">
            ${shelfEscape(firstDoc?.title || '請點選左側文件')}
          </div>
          <a id="shelfPdfLink" href="${firstDoc ? engineeringDocHref(firstDoc.path) : '#'}"
            target="_blank" rel="noopener noreferrer"
            style="display:inline-flex;align-items:center;gap:6px;background:#1565c0;color:#fff;
                   padding:7px 16px;border-radius:8px;font-size:14px;font-weight:700;text-decoration:none;flex-shrink:0">
            <i class="fas fa-up-right-from-square"></i> 新頁開啟
          </a>
        </div>
        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden">
          <iframe id="shelfPdfFrame"
            src="${firstDoc ? engineeringDocHref(firstDoc.path) : 'about:blank'}"
            style="width:100%;height:820px;border:none;display:${firstDoc?'block':'none'}"
            title="文件預覽">
          </iframe>
          <div id="shelfNoPdf"
            style="height:820px;display:${firstDoc?'none':'flex'};align-items:center;justify-content:center;
                   flex-direction:column;gap:16px;color:#94a3b8">
            <i class="fas fa-file-pdf" style="font-size:48px"></i>
            <div style="font-size:16px">點選左側文件以預覽</div>
          </div>
        </div>
      </div>
    </div>
  `;

  _shelfSelectedDoc = firstDoc ? { path: firstDoc.path, title: firstDoc.title } : null;
  updateEngineeringBookshelf();
}

function engineeringShelfMetric(label, value, unit, icon, color) {
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

function setEngineeringShelfFilter(category) {
  engineeringShelfFilter = category;
  renderEngineeringBookshelf();
}

function updateEngineeringBookshelf() {
  const container = document.getElementById('engineeringBookshelfContent');
  if (!container) return;

  const keyword = (document.getElementById('engineeringBookSearch')?.value || '').trim().toLowerCase();
  const books = ENGINEERING_BOOKS.filter(book => {
    const haystack = [book.title, book.category, book.year, book.type, book.summary, ...(book.tags||[])].join(' ').toLowerCase();
    return !keyword || haystack.includes(keyword);
  });

  if (!books.length) {
    container.innerHTML = `<div style="padding:32px;text-align:center;color:#94a3b8;font-size:15px"><i class="fas fa-search" style="font-size:32px;margin-bottom:10px;display:block"></i>找不到符合條件的文件</div>`;
    return;
  }

  // 按兩大主類分組 → 再按工程名稱分子群
  const result = {};
  for (const [main, def] of Object.entries(SHELF_MAIN_CATS)) {
    const mainBooks = books.filter(b => shelfMainCatOf(b) === main);
    if (!mainBooks.length) continue;
    // 子分類（整治規劃不再分子類；歷年工程依 category 分）
    if (main === '整治規劃') {
      result[main] = { def, sub: { '整治規劃設計監造': mainBooks } };
    } else {
      const sub = {};
      mainBooks.forEach(b => { if (!sub[b.category]) sub[b.category] = []; sub[b.category].push(b); });
      result[main] = { def, sub };
    }
  }

  const catColors = {
    '整治規劃設計監造': '#0369a1',
    '仙區23林班治理工程': '#1565c0',
    '橫流溪整治第二期工程': '#2e7d32',
    '橫流溪下游整治第二期工程': '#166534',
    '橫流溪下游段改善工程': '#7c3aed',
    '橫流溪野溪整治工程': '#854d0e',
    '橫流溪野溪整治第三期工程': '#9a3412',
    '橫流溪野溪周邊維護工程': '#0f766e'
  };

  container.innerHTML = Object.entries(result).map(([main, { def, sub }]) => `
    <!-- 主類標題 -->
    <div style="background:${def.color};color:#fff;padding:14px 18px">
      <div style="display:flex;align-items:center;gap:10px">
        <i class="fas ${def.icon}" style="font-size:20px"></i>
        <div>
          <div style="font-size:20px;font-weight:900">${shelfEscape(main)}</div>
          <div style="font-size:13px;opacity:.88;margin-top:3px">${shelfEscape(def.desc)}</div>
        </div>
      </div>
    </div>

    <!-- 子類（工程名稱）→ 文件列 -->
    ${Object.entries(sub).map(([subCat, items]) => {
      const cc = catColors[subCat] || def.color;
      const isMultiSub = Object.keys(sub).length > 1;
      return `
        ${isMultiSub ? `
        <div style="padding:8px 18px;background:#f8fafc;border-bottom:1px solid #e2e8f0;display:flex;align-items:center;gap:8px">
          <div style="width:3px;height:20px;background:${cc};border-radius:2px"></div>
          <span style="font-size:15px;font-weight:800;color:#0f172a">${shelfEscape(subCat)}</span>
          <span style="font-size:12px;background:${cc}18;color:${cc};border-radius:999px;padding:1px 8px">${items.length} 份</span>
        </div>` : ''}
        ${items.map(book => renderEngineeringBook(book, cc)).join('')}`;
    }).join('')}
  `).join('');

  // 預設選中第一份可用文件（初次載入）
  if (!_shelfSelectedDoc && books.length) {
    const first = books[0];
    shelfSelectDoc(first.path, first.title);
  }
}

function renderEngineeringBook(book, catColor) {
  const isBudget = book.type === '結算明細' || book.type === '決算明細';
  const typeIcon = isBudget ? 'fa-file-invoice-dollar'
    : book.type === '追蹤成果' ? 'fa-chart-line'
    : book.type === '維護工程' ? 'fa-screwdriver-wrench'
    : 'fa-file-contract';
  const lineColor  = isBudget ? '#8a5a00' : catColor;
  const isSelected = _shelfSelectedDoc?.path === book.path;

  return `
  <div class="shelf-doc-card"
       data-path="${shelfEscape(book.path)}"
       onclick="shelfSelectDoc('${shelfAttr(book.path)}','${shelfAttr(book.title)}')"
       style="padding:18px 20px;cursor:pointer;border-bottom:2px solid #f1f5f9;
              background:${isSelected ? lineColor+'12' : '#fff'};
              border-left:${isSelected ? '7px' : '4px'} solid ${lineColor};
              box-shadow:${isSelected ? 'inset 0 0 0 1px '+lineColor+'33' : 'none'};
              transition:all .15s"
       onmouseover="this.style.background='${lineColor}0d';this.style.borderLeftWidth='7px'"
       onmouseout="this.style.background='${isSelected?lineColor+'12':'#fff'}';this.style.borderLeftWidth='${isSelected?'7':'4'}px'">

    <!-- 圖示 + 文件名稱 -->
    <div style="display:flex;align-items:flex-start;gap:12px;margin-bottom:12px">
      <div style="width:46px;height:46px;border-radius:11px;background:${lineColor}${isSelected?'28':'18'};color:${lineColor};
                  display:flex;align-items:center;justify-content:center;flex-shrink:0">
        <i class="fas ${typeIcon}" style="font-size:20px"></i>
      </div>
      <div style="flex:1;min-width:0">
        <div style="font-size:19px;font-weight:900;color:#0f172a;line-height:1.3;margin-bottom:6px">${shelfEscape(book.title)}</div>
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
          <span style="font-size:14px;font-weight:700;color:${lineColor};background:${lineColor}18;border:1px solid ${lineColor}44;border-radius:999px;padding:3px 11px">${shelfEscape(book.type)}</span>
          <span style="font-size:14px;color:#64748b">${shelfEscape(book.year)}</span>
          <span style="font-size:13px;font-weight:800;padding:3px 9px;border-radius:6px;background:${book.format==='PDF'?'#fee2e2':'#dbeafe'};color:${book.format==='PDF'?'#b91c1c':'#1e40af'}">${shelfEscape(book.format)}</span>
        </div>
      </div>
    </div>

    <!-- 操作按鈕（點擊不冒泡） -->
    <div style="display:grid;grid-template-columns:1fr 1fr auto;gap:8px" onclick="event.stopPropagation()">
      <button onclick="shelfSelectDoc('${shelfAttr(book.path)}','${shelfAttr(book.title)}')"
        style="padding:10px;background:${lineColor};color:#fff;border:none;border-radius:9px;
               font-size:15px;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:7px">
        <i class="fas fa-eye"></i> 預覽
      </button>
      <a href="${engineeringDocHref(book.path)}" target="_blank" rel="noopener noreferrer"
        style="padding:10px;background:#fff;color:${lineColor};border:2px solid ${lineColor}66;border-radius:9px;
               font-size:15px;font-weight:700;text-decoration:none;display:flex;align-items:center;justify-content:center;gap:7px">
        <i class="fas fa-up-right-from-square"></i> 開啟
      </a>
      <button onclick="askEngineeringBookAI('${shelfAttr(book.title)}')"
        title="問 AI"
        style="padding:10px 13px;background:#f1f5f9;color:#475569;border:none;border-radius:9px;font-size:15px;cursor:pointer">
        <i class="fas fa-brain"></i>
      </button>
    </div>
  </div>
  `;
}

function renderMonitoringVideoSection() {
  const grouped = MONITORING_VIDEOS.reduce((acc, video) => {
    if (!acc[video.group]) acc[video.group] = [];
    acc[video.group].push(video);
    return acc;
  }, {});
  return `
    <section style="margin-top:22px">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;gap:10px;flex-wrap:wrap">
        <div>
          <h3 style="font-size:16px;margin:0;color:#1f2937"><i class="fas fa-photo-film"></i> 監測影片資料</h3>
          <div style="font-size:12px;color:#64748b;margin-top:3px">含 9 種魚道設計、日間/夜間監測與縮時資料；MP4 可直接於平台播放。</div>
        </div>
        <span class="badge badge-info">${MONITORING_VIDEOS.length} 支影片</span>
      </div>
      ${Object.entries(grouped).map(([group, videos]) => `
        <div style="margin-bottom:14px">
          <div style="font-weight:800;color:#334155;margin-bottom:8px">${shelfEscape(group)} (${videos.length})</div>
          <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:10px">
            ${videos.map(video => renderMonitoringVideoCard(video, MONITORING_VIDEOS.indexOf(video))).join('')}
          </div>
        </div>
      `).join('')}
    </section>
  `;
}

function renderMonitoringVideoCard(video, index) {
  const isPlayable = String(video.format || '').toUpperCase() === 'MP4';
  const href = engineeringMediaHref(video.path);
  return `
    <article style="background:#fff;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(15,23,42,.06)">
      <button type="button" onclick="openMonitoringVideo(${index})"
        style="width:100%;height:118px;border:0;background:linear-gradient(135deg,#0f172a,#334155);color:#fff;display:flex;align-items:center;justify-content:center;cursor:pointer">
        <i class="fas fa-${isPlayable ? 'play-circle' : 'file-video'}" style="font-size:36px"></i>
      </button>
      <div style="padding:10px">
        <div style="font-weight:800;color:#0f172a;font-size:13px;line-height:1.45;min-height:38px">${shelfEscape(video.title)}</div>
        <div style="display:flex;gap:6px;flex-wrap:wrap;margin:8px 0">
          <span class="badge badge-info">${shelfEscape(video.mode)}</span>
          <span class="badge badge-default">${shelfEscape(video.format)}</span>
        </div>
        <div style="display:flex;gap:6px;flex-wrap:wrap">
          <button class="btn btn-sm btn-primary" onclick="openMonitoringVideo(${index})">
            <i class="fas fa-play"></i> ${isPlayable ? '播放' : '開啟'}
          </button>
          <a class="btn btn-sm btn-outline" href="${href}" target="_blank" rel="noopener noreferrer">
            <i class="fas fa-up-right-from-square"></i> 新分頁
          </a>
        </div>
      </div>
    </article>
  `;
}

function openMonitoringVideo(index) {
  const video = MONITORING_VIDEOS[index];
  if (!video) return;
  const href = engineeringMediaHref(video.path);
  const isPlayable = String(video.format || '').toUpperCase() === 'MP4';
  if (!isPlayable) {
    window.open(href, '_blank', 'noopener,noreferrer');
    showToast?.('AVI 格式可能無法在瀏覽器內播放，已改用新分頁開啟', 'info');
    return;
  }

  document.getElementById('modalTitle').textContent = video.title;
  document.getElementById('modalBody').innerHTML = `
    <div style="display:grid;gap:10px">
      <video controls preload="metadata" style="width:100%;max-height:68vh;background:#000;border-radius:8px" src="${href}">
        您的瀏覽器不支援影片播放。
      </video>
      <div style="display:flex;justify-content:space-between;gap:8px;align-items:center;flex-wrap:wrap">
        <div style="font-size:12px;color:#64748b;line-height:1.5">
          <b>${shelfEscape(video.group)}</b> / ${shelfEscape(video.mode)} / ${shelfEscape(video.format)}
        </div>
        <a class="btn btn-sm btn-outline" href="${href}" target="_blank" rel="noopener noreferrer">
          <i class="fas fa-up-right-from-square"></i> 新分頁開啟
        </a>
      </div>
      <div style="font-size:12px;color:#64748b;word-break:break-all;background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:8px">
        ${shelfEscape(video.path)}
      </div>
    </div>
  `;
  const modal = document.getElementById('modal');
  if (modal) {
    modal.style.maxWidth = '920px';
    modal.style.width = '92vw';
  }
  openModal();
}

function askEngineeringBookAI(title) {
  if (typeof toggleAIChat === 'function') {
    const panel = document.getElementById('aiChatPanel');
    if (panel && !panel.classList.contains('open')) toggleAIChat();
  }
  const input = document.getElementById('aiInput');
  if (input) {
    input.value = `請依據「${title}」分析橫流溪工程設計重點、可能關聯設施與維護管理建議。`;
    input.focus();
  }
}

function engineeringDocHref(path) {
  // Flask /media/ 路由從 project root 提供靜態媒體檔案
  return '/media/' + String(path || '').split('/').map(encodeURIComponent).join('/');
}

function engineeringMediaHref(path) {
  return '/media/' + String(path || '').split('/').map(encodeURIComponent).join('/');
}

function shelfEscape(value) {
  return String(value ?? '').replace(/[&<>"']/g, ch => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[ch]));
}

function shelfAttr(value) {
  return shelfEscape(value).replace(/`/g, '&#96;');
}

// 書架樣式已整合至各元素 inline style，不需獨立 CSS
