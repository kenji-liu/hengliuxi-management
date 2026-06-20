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
  },

  /* ── 歷年崩塌及現地調查規劃 ── */
  {
    category: '歷年崩塌及現地調查規劃', year: '早期',
    title: '東勢處轄內崩塌地調查緊急評估規劃',
    type: '調查評估', format: 'PDF',
    tags: ['崩塌地', '東勢處', '緊急評估', '調查規劃'],
    summary: '東勢林區管理處轄內崩塌地緊急調查與評估規劃，作為後續監測與治理基準。',
    path: '01_工程設施維護與資料/其他相關資料/00東勢處轄內崩塌地調查緊急評估規劃.pdf'
  },
  {
    category: '歷年崩塌及現地調查規劃', year: '105-106',
    title: '105~106年度東勢處轄內崩塌地監測及調查評估工作',
    type: '監測成果', format: 'PDF',
    tags: ['崩塌地', '監測', '調查評估', '105', '106'],
    summary: '105~106年度東勢處轄內崩塌地監測及評估成果，含現地調查與影像判釋資料。',
    path: '01_工程設施維護與資料/其他相關資料/105~106年度東勢處轄內崩塌地監測及調查評估工作.pdf'
  },
  {
    category: '歷年崩塌及現地調查規劃', year: '107-108',
    title: '107~108年度東勢處轄內崩塌地監測及調查評估工作',
    type: '監測成果', format: 'PDF',
    tags: ['崩塌地', '監測', '調查評估', '107', '108'],
    summary: '107~108年度東勢處轄內崩塌地監測及評估成果，可與同期整治規劃交叉比對。',
    path: '01_工程設施維護與資料/其他相關資料/107~108年度東勢處轄內崩塌地監測及調查評估工作.pdf'
  },
  {
    category: '歷年崩塌及現地調查規劃', year: '109-110',
    title: '109~110年度東勢處轄內崩塌地監測及調查評估工作',
    type: '監測成果', format: 'PDF',
    tags: ['崩塌地', '監測', '調查評估', '109', '110'],
    summary: '109~110年度東勢處轄內崩塌地監測及評估成果，供崩塌演變趨勢分析。',
    path: '01_工程設施維護與資料/其他相關資料/109~110年度東勢處轄內崩塌地監測及調查評估工作.pdf'
  },
  {
    category: '歷年崩塌及現地調查規劃', year: '113',
    title: '113年臺中分署轄內崩塌地監測及資訊平臺維運工作',
    type: '成果報告', format: 'PDF',
    tags: ['崩塌地', '資訊平臺', '監測', '113', '臺中分署'],
    summary: '113年臺中分署崩塌地監測及資訊平臺維運成果，含最新崩塌地分布資訊。',
    path: '01_工程設施維護與資料/其他相關資料/113 年臺中分署轄內崩塌地監測及資訊平台維運工作-成果報告.pdf'
  },
  {
    category: '整治規劃設計監造', year: '98',
    title: '98年國有林地魚道設置原則及圖說規範建置之研究',
    type: '研究報告', format: 'PDF',
    tags: ['魚道', '國有林地', '設計規範', '98'],
    summary: '國有林地魚道設置原則與圖說規範研究，為橫流溪魚道工程設計的參考基礎文件。',
    path: '01_工程設施維護與資料/其他相關資料/98年國有林地魚道設置原則及圖說規範建置之研究.pdf'
  },
  {
    category: '歷年崩塌及現地調查規劃', year: '104',
    title: '東勢處轄內崩塌地影像判釋及調查評估三期工作',
    type: '調查評估', format: 'PDF',
    tags: ['崩塌地', '影像判釋', '三期', '104'],
    summary: '104年度東勢處轄內崩塌地影像判釋與評估三期工作成果，含遙測影像分析資料。',
    path: '01_工程設施維護與資料/其他相關資料/東勢處轄內崩塌地影像判釋及調查評估三期工作-104.pdf'
  },
  {
    category: '歷年崩塌及現地調查規劃', year: '104',
    title: '東勢轄內崩塌地調查緊急評估規劃（二）',
    type: '調查評估', format: 'PDF',
    tags: ['崩塌地', '東勢', '緊急評估', '104'],
    summary: '東勢轄內崩塌地調查緊急評估規劃第二期，延續前期調查成果進行補充評估。',
    path: '01_工程設施維護與資料/其他相關資料/東勢轄內崩塌地調查緊急評估規劃(二)-104.pdf'
  },
  {
    category: '整治規劃設計監造', year: '近年',
    title: '橫流溪動物通道及周邊設施檢查效能智慧評估（第三次期中）',
    type: '期中報告', format: 'PDF',
    tags: ['動物通道', '周邊設施', '智慧評估', '效能檢查'],
    summary: '橫流溪動物通道及周邊設施第三次期中智慧評估，含各通道現況與效能分析。',
    path: '01_工程設施維護與資料/其他相關資料/橫流溪動物通道及周邊設施檢查效能智慧評估_第三次期中_報告書.pdf'
  },
  {
    category: '整治規劃設計監造', year: '近年',
    title: '裏冷溪及橫流溪整體治理規劃與監測調查成果報告（橫流溪部分）',
    type: '成果報告', format: 'PDF',
    tags: ['裏冷溪', '整體治理', '監測調查', '橫流溪'],
    summary: '裏冷溪與橫流溪整體治理規劃及監測調查報告，橫流溪部分提供流域整體治理脈絡。',
    path: '01_工程設施維護與資料/其他相關資料/裡冷溪及橫流溪整體治理規劃與監測調查-成果報告-橫流溪部分.pdf'
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

let bookshelfActiveTab = '整治規劃';
let _shelfSelectedDoc = null;

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
  },
  '歷年崩塌及現地調查規劃': {
    color: '#7c3aed', bg: '#f5f3ff', icon: 'fa-mountain',
    desc: '崩塌地監測與調查評估、魚道設計規範、現地勘查等相關規劃文件',
    keys: ['歷年崩塌及現地調查規劃']
  }
};

const SHELF_CAT_META = {
  '整治規劃':              { color:'#1565c0', bg:'#eff6ff', border:'#bfdbfe', icon:'fa-drafting-compass' },
  '歷年整治工程':          { color:'#2e7d32', bg:'#f0fdf4', border:'#bbf7d0', icon:'fa-hard-hat'         },
  '歷年崩塌及現地調查規劃':{ color:'#7c3aed', bg:'#f5f3ff', border:'#ddd6fe', icon:'fa-mountain'        }
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
  const planningBooks  = ENGINEERING_BOOKS.filter(b => shelfMainCatOf(b) === '整治規劃');
  const worksBooks     = ENGINEERING_BOOKS.filter(b => shelfMainCatOf(b) === '歷年整治工程');
  const landslideBooks = ENGINEERING_BOOKS.filter(b => shelfMainCatOf(b) === '歷年崩塌及現地調查規劃');
  const activeMap      = { '整治規劃': planningBooks, '歷年整治工程': worksBooks, '歷年崩塌及現地調查規劃': landslideBooks };

  document.getElementById('contentArea').innerHTML = `
    <!-- 標題列 -->
    <div style="margin-bottom:18px">
      <div style="font-size:14px;color:var(--text-muted);margin-bottom:5px">歷年工程設計資料歸檔</div>
      <h2 style="margin:0;font-size:26px;font-weight:900;color:var(--text)">橫流溪書架</h2>
      <div style="font-size:14px;color:#64748b;margin-top:5px">整合整治規劃、歷年整治工程與崩塌現地調查，依類別統整文件管理與瀏覽。</div>
    </div>

    <!-- ── 三類統計卡 ── -->
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-bottom:22px">
      ${renderShelfStatCard('整治規劃',            planningBooks,  '98年 ~ 近年',  '整治規劃設計監造報告')}
      ${renderShelfStatCard('歷年整治工程',         worksBooks,     '歷年',          '橫流溪各期整治工程')}
      ${renderShelfStatCard('歷年崩塌及現地調查規劃', landslideBooks, '早期 ~ 113年', '東勢處轄內崩塌地調查')}
    </div>

    <!-- ── Tab 列 + 搜尋框 ── -->
    <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;
                border-bottom:2px solid #e2e8f0;margin-bottom:16px">
      <div style="display:flex;gap:0">
        ${[['整治規劃','#1565c0',planningBooks.length],
           ['歷年整治工程','#2e7d32',worksBooks.length],
           ['歷年崩塌及現地調查規劃','#7c3aed',landslideBooks.length]].map(([key,cl,cnt])=>{
          const active = bookshelfActiveTab === key;
          return `<button onclick="bookshelfSwitchTab('${shelfAttr(key)}')"
            style="padding:10px 14px;background:none;border:none;
                   border-bottom:3px solid ${active?cl:'transparent'};
                   font-size:14px;font-weight:${active?'800':'500'};color:${active?cl:'#64748b'};
                   cursor:pointer;display:flex;align-items:center;gap:6px;white-space:nowrap">
            ${shelfEscape(key)}
            <span style="font-size:12px;background:${active?cl+'18':'#f1f5f9'};color:${active?cl:'#64748b'};
                         border-radius:999px;padding:1px 7px;font-weight:700">${cnt}</span>
          </button>`;
        }).join('')}
      </div>
      <input id="engineeringBookSearch" oninput="updateEngineeringBookshelf()" placeholder="搜尋文件名稱…"
        style="width:200px;padding:8px 12px;border:1px solid #d5dde7;border-radius:10px;font-size:14px">
    </div>

    <!-- ── 文件列表（全寬） ── -->
    <div id="engineeringBookshelfContent"
         style="border:1px solid #e2e8f0;border-radius:12px;overflow:hidden"></div>
  `;

  _shelfSelectedDoc = null;
  updateEngineeringBookshelf();
}

function renderShelfStatCard(mainCat, books, yearRange, source) {
  const m = SHELF_CAT_META[mainCat];
  if (!m) return '';
  const active = bookshelfActiveTab === mainCat;
  const CARD_PAD='18px', NUM_BIG='44px', LBL='22px', SUB_NUM='26px',
        SUB_LBL='14px', SRC='13px', BTN='16px', ICON_SZ='48px', ICON_FS='22px';
  return `
  <div data-shelf-cat="${shelfEscape(mainCat)}"
       onclick="bookshelfSwitchTab('${shelfAttr(mainCat)}')"
       style="border:${active?'3px':'2px'} solid ${active?m.color:m.border};background:${active?m.bg:'#fff'};
              border-radius:14px;padding:${CARD_PAD};cursor:pointer;transition:box-shadow .15s;
              box-shadow:${active?'0 6px 20px rgba(15,23,42,.12)':'none'}">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
      <div style="width:${ICON_SZ};height:${ICON_SZ};border-radius:10px;background:${m.color};color:#fff;
                  display:flex;align-items:center;justify-content:center;font-size:${ICON_FS}">
        <i class="fas ${m.icon}"></i>
      </div>
      <div style="font-size:${NUM_BIG};font-weight:900;color:${m.color};line-height:1">${books.length}</div>
    </div>
    <div style="font-size:${LBL};font-weight:900;color:#0f172a;margin-bottom:8px">${shelfEscape(mainCat)}</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:10px">
      <div style="text-align:center;background:#fff;border:1px solid ${m.border};border-radius:8px;padding:7px 4px">
        <div style="font-size:${SUB_NUM};font-weight:900;color:${m.color}">${books.length}</div>
        <div style="font-size:${SUB_LBL};color:#64748b;margin-top:2px">文件本數</div>
      </div>
      <div style="text-align:center;background:#fff;border:1px solid ${m.border};border-radius:8px;padding:7px 4px">
        <div style="font-size:11px;font-weight:800;color:${m.color};line-height:1.4">${shelfEscape(yearRange)}</div>
        <div style="font-size:${SUB_LBL};color:#64748b;margin-top:2px">年份範圍</div>
      </div>
    </div>
    <div style="font-size:${SRC};color:#64748b">來源：${shelfEscape(source)}</div>
    <div data-shelf-footer style="font-size:${BTN};font-weight:800;color:${m.color};margin-top:8px">
      ${active ? '▶ 目前篩選中' : '展開此類清單'}
    </div>
  </div>`;
}

function bookshelfSwitchTab(tab) {
  bookshelfActiveTab = tab;
  // 更新 tab 按鈕
  document.querySelectorAll('[onclick^="bookshelfSwitchTab"]').forEach(btn => {
    const key = btn.getAttribute('onclick').match(/'([^']+)'/)?.[1];
    const bm = SHELF_CAT_META[key];
    if (!bm) return;
    const active = key === tab;
    btn.style.fontWeight    = active ? '800' : '500';
    btn.style.color         = active ? bm.color : '#64748b';
    btn.style.borderBottom  = active ? `3px solid ${bm.color}` : '3px solid transparent';
  });
  // 更新統計卡
  document.querySelectorAll('[data-shelf-cat]').forEach(card => {
    const key = card.dataset.shelfCat;
    const cm = SHELF_CAT_META[key];
    if (!cm) return;
    const active = key === tab;
    card.style.border     = `${active?'3px':'2px'} solid ${active?cm.color:cm.border}`;
    card.style.background = active ? cm.bg : '#fff';
    card.style.boxShadow  = active ? '0 6px 20px rgba(15,23,42,.12)' : 'none';
    const footer = card.querySelector('[data-shelf-footer]');
    if (footer) footer.textContent = active ? '▶ 目前篩選中' : '展開此類清單';
  });
  _shelfSelectedDoc = null;
  updateEngineeringBookshelf();
}

function _shelfYearNum(y) {
  if (!y || y === '歷年' || y === '早期') return 0;
  if (y === '近年') return 9999;
  const m = String(y).match(/\d+/);
  return m ? parseInt(m[0]) : 0;
}

function updateEngineeringBookshelf() {
  const container = document.getElementById('engineeringBookshelfContent');
  if (!container) return;

  const keyword   = (document.getElementById('engineeringBookSearch')?.value || '').trim().toLowerCase();
  const m         = SHELF_CAT_META[bookshelfActiveTab];
  const mainColor = m?.color || '#1565c0';

  const books = ENGINEERING_BOOKS.filter(book => {
    if (shelfMainCatOf(book) !== bookshelfActiveTab) return false;
    if (!keyword) return true;
    const haystack = [book.title, book.category, book.year, book.type, book.summary, ...(book.tags||[])].join(' ').toLowerCase();
    return haystack.includes(keyword);
  }).sort((a, b) => _shelfYearNum(a.year) - _shelfYearNum(b.year));

  if (!books.length) {
    container.innerHTML = `<div style="padding:32px;text-align:center;color:#94a3b8;font-size:15px">
      <i class="fas fa-search" style="font-size:32px;margin-bottom:10px;display:block"></i>找不到符合條件的文件</div>`;
    return;
  }

  // 歷年整治工程 → 依工程名稱分子群並加子標頭
  if (bookshelfActiveTab === '歷年整治工程') {
    const sub = {};
    books.forEach(b => { if (!sub[b.category]) sub[b.category] = []; sub[b.category].push(b); });
    const subColors = {
      '仙區23林班治理工程':     '#1565c0',
      '橫流溪整治第二期工程':   '#2e7d32',
      '橫流溪下游整治第二期工程':'#166534',
      '橫流溪下游段改善工程':   '#7c3aed',
      '橫流溪野溪整治工程':     '#854d0e',
      '橫流溪野溪整治第三期工程':'#9a3412',
      '橫流溪野溪周邊維護工程': '#0f766e'
    };
    container.innerHTML = Object.entries(sub).map(([subCat, items]) => {
      const cc = subColors[subCat] || mainColor;
      return `
        <div style="padding:8px 18px;background:#f8fafc;border-bottom:1px solid #e2e8f0;
                    display:flex;align-items:center;gap:8px;position:sticky;top:0;z-index:1">
          <div style="width:3px;height:20px;background:${cc};border-radius:2px"></div>
          <span style="font-size:15px;font-weight:800;color:#0f172a">${shelfEscape(subCat)}</span>
          <span style="font-size:12px;background:${cc}18;color:${cc};border-radius:999px;padding:1px 8px">${items.length} 份</span>
        </div>
        ${items.map(book => renderEngineeringBook(book, cc)).join('')}`;
    }).join('');
  } else {
    // 整治規劃 & 崩塌調查：平鋪列表
    container.innerHTML = books.map(book => renderEngineeringBook(book, mainColor)).join('');
  }

}

function renderEngineeringBook(book, catColor) {
  const isBudget = book.type === '結算明細' || book.type === '決算明細';
  const typeIcon = isBudget ? 'fa-file-invoice-dollar'
    : book.type === '追蹤成果' ? 'fa-chart-line'
    : book.type === '維護工程' ? 'fa-screwdriver-wrench'
    : 'fa-file-contract';
  const lineColor  = isBudget ? '#8a5a00' : catColor;
  return `
  <div class="shelf-doc-card"
       data-path="${shelfEscape(book.path)}"
       style="padding:16px 20px;border-bottom:2px solid #f1f5f9;
              background:#fff;border-left:4px solid ${lineColor};transition:background .12s"
       onmouseover="this.style.background='${lineColor}08'"
       onmouseout="this.style.background='#fff'">

    <!-- 圖示 + 文件名稱 -->
    <div style="display:flex;align-items:flex-start;gap:12px;margin-bottom:10px">
      <div style="width:44px;height:44px;border-radius:10px;background:${lineColor}18;color:${lineColor};
                  display:flex;align-items:center;justify-content:center;flex-shrink:0">
        <i class="fas ${typeIcon}" style="font-size:19px"></i>
      </div>
      <div style="flex:1;min-width:0">
        <div style="font-size:17px;font-weight:900;color:#0f172a;line-height:1.3;margin-bottom:5px">${shelfEscape(book.title)}</div>
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
          <span style="font-size:13px;font-weight:700;color:${lineColor};background:${lineColor}18;border:1px solid ${lineColor}44;border-radius:999px;padding:2px 10px">${shelfEscape(book.type)}</span>
          <span style="font-size:13px;color:#64748b"><i class="fas fa-calendar-alt" style="margin-right:3px;opacity:.6"></i>${shelfEscape(book.year)}</span>
          <span style="font-size:12px;font-weight:800;padding:2px 8px;border-radius:6px;background:${book.format==='PDF'?'#fee2e2':'#dbeafe'};color:${book.format==='PDF'?'#b91c1c':'#1e40af'}">${shelfEscape(book.format)}</span>
        </div>
      </div>
    </div>

    <!-- 摘要 -->
    ${book.summary ? `<div style="font-size:13px;color:#475569;margin-bottom:10px;line-height:1.6;padding-left:56px">${shelfEscape(book.summary)}</div>` : ''}

    <!-- 操作按鈕 -->
    <div style="display:flex;gap:8px;padding-left:56px">
      <a href="${engineeringDocHref(book.path)}" target="_blank" rel="noopener noreferrer"
        style="padding:8px 18px;background:${lineColor};color:#fff;border-radius:8px;
               font-size:14px;font-weight:700;text-decoration:none;display:inline-flex;align-items:center;gap:6px">
        <i class="fas fa-up-right-from-square"></i> 開啟文件
      </a>
      <button onclick="askEngineeringBookAI('${shelfAttr(book.title)}')"
        title="問 AI"
        style="padding:8px 14px;background:#f1f5f9;color:#475569;border:none;border-radius:8px;font-size:14px;cursor:pointer;display:inline-flex;align-items:center;gap:5px">
        <i class="fas fa-brain"></i> 問 AI
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
