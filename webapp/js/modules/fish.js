// 魚類資料庫模組
let fishFilter = { keyword: '', conservation: '' };
// 發布層物種名單：保留原始調查資料供稽核，但不在平台清單、統計及分析中發布。
const HLX_FISH_EXCLUDED_SPECIES = new Set(['粗首馬口鱲']);
function fish_isPublishedSpecies(speciesName) {
  return !HLX_FISH_EXCLUDED_SPECIES.has(String(speciesName || '').trim());
}
// ── 所有物種均使用真實田野實拍或標準照（jpg），不再使用 SVG 插圖 ──

const FISH_PHOTO_LIBRARY = {
  '臺灣白甲魚': {
    image: '/webapp/assets/fish-photos/onychostoma-barbatulum-field-20260629.png',
    source: '更換魚類照片／白甲魚／臺灣白甲魚.png',
    caption: '臺灣白甲魚（Onychostoma barbatulum）田野實拍照片介紹'
  },
  '粗首馬口鱲': {
    image: '/webapp/assets/fish-photos/zacco-pachycephalus.png',
    source: '02_魚類與棲地資料庫／施工前魚類調查嵌入影像',
    caption: '溪流魚類量測實拍，粗首馬口鱲（Opsariichthys pachycephalus）物種介紹'
  },
  '臺灣鬚鱲': {
    image: '/webapp/assets/fish-photos/candidia-barbata.png',
    source: '02_魚類與棲地資料庫／施工前魚類調查嵌入影像',
    caption: '魚體量測實拍，臺灣鬚鱲（Candidia barbata）物種介紹'
  },
  '臺灣石魚賓': {
    image: '/webapp/assets/fish-photos/acrossocheilus-paradoxus.png',
    source: '02_魚類與棲地資料庫／施工前魚類調查影像',
    caption: '橫流溪溪流型魚類田野調查實拍，臺灣石魚賓（Acrossocheilus paradoxus）物種介紹；鯉科特有種，偏好礫石底質緩流段',
    position: 'center 40%'
  },
  '纓口臺鰍': {
    image: '/webapp/assets/fish-photos/formosania-lacustre-field.png',
    source: '使用者提供之田野辨識照片',
    caption: '纓口臺鰍（Formosania lacustre）田野實拍；體表深淺交錯虎斑紋為辨識特徵，底棲吸附型，偏好礫石急流',
    position: 'center center'
  },
  '明潭吻鰕虎': {
    image: '/webapp/assets/fish-photos/rhinogobius-candidianus-field2.png',
    source: '使用者提供之田野辨識照片',
    caption: '明潭吻鰕虎（Rhinogobius candidianus）田野實拍，底棲鰕虎科，眼下橙色條紋、體側藍色斑點為辨識特徵',
    position: 'center center'
  },
  '臺灣間爬岩鰍': {
    image: '/webapp/assets/fish-photos/hemimyzon-formosanus-field3.png',
    source: '使用者提供之田野辨識照片',
    caption: '臺灣間爬岩鰍（Hemimyzon formosanus）田野實拍；體側橄欖褐色帶花紋，胸鰭略帶橙紅色，扁長體型吸附於礫石為辨識特徵',
    position: 'center center'
  },
  '短臀瘋鱨': {
    image: '/webapp/assets/fish-photos/tachysurus-brevianalis.png',
    source: '02_魚類與棲地資料庫／施工前魚類調查嵌入影像',
    caption: '短臀瘋鱨（Tachysurus brevianalis）鱨科夜行性底棲魚類；深褐色體背、細長觸鬚為辨識重點',
    position: 'center center'
  },
  '短吻紅斑吻鰕虎': {
    image: '/webapp/assets/fish-photos/rhinogobius-rubromaculatus-field.jpg',
    source: '使用者提供之108.4.17田野辨識照片',
    caption: '短吻紅斑吻鰕虎（Rhinogobius rubromaculatus）田野辨識照片；體側散布紅褐色斑點、吻部短鈍為辨識特徵，底棲小型鰕虎',
    position: 'center center'
  }
};

// 物種層級生態習性與橫流溪調查判讀分開維護，避免把一般文獻習性誤當成現地實測結果。
const FISH_ECOLOGY_HABITS = {
  '臺灣白甲魚': {
    habitat: '多棲息於清澈、溶氧充足的河川中上游，以礫石、卵石底質的淺瀨、流心及潭瀨交界為主要活動空間。',
    feeding: '以刮食石面附著藻類、有機碎屑為主，也會攝食小型水生昆蟲；常在流速較穩定的底層覓食。',
    breeding: '繁殖活動多集中於水溫回升的暖季，通常利用水流通暢、底質孔隙尚未被細砂封填的礫石河床。',
    hengliu: '橫流溪歷年調查的優勢物種，於上、中、下游均有紀錄；高優勢度也可能降低單次調查的均勻度指標，應與物種數及 CPUE 一併判讀。'
  },
  '臺灣石魚賓': {
    habitat: '偏好清澈溪流的深潭、緩流與潭瀨交界，常利用大型礫石、卵石及岸際遮蔽物作為休息與避難空間。',
    feeding: '屬雜食性魚類，攝食附著藻類、有機碎屑與水生昆蟲等底棲生物，會在潭頭與流速較緩處巡游覓食。',
    breeding: '繁殖期通常落在暖季，礫石底床、水流交換及較少淤泥覆蓋，有利於卵與早期生活史階段存活。',
    hengliu: '在橫流溪多河段持續出現，兼具游泳與溯流能力；其跨河段紀錄可作為潭瀨棲地完整性及縱向連通性的輔助指標。'
  },
  '臺灣鬚鱲': {
    habitat: '常見於河川中上游開闊水域、潭瀨交界與岸際緩流帶，偏好水質清澈且具有礫石底質的多樣流況。',
    feeding: '屬雜食性，利用水生昆蟲、附著藻類與有機碎屑；可在中層巡游，也會靠近底床覓食。',
    breeding: '暖季為主要繁殖與幼魚補充時段，具水流交換及礫石孔隙的淺水區可提供較適合的產卵與育幼環境。',
    hengliu: '歷年在橫流溪中游及上下游銜接河段皆有紀錄，是反映水質、流況與棲地連續性的常見指標魚種。'
  },
  '纓口臺鰍': {
    habitat: '底棲吸附型魚類，偏好清澈、高溶氧且流速較快的淺瀨，常貼附於卵石、大礫石或裸露岩盤表面。',
    feeding: '以刮食石面附著藻膜、微小有機物及底棲生物為主，扁平腹面與特化胸腹鰭有助於抵抗水流。',
    breeding: '繁殖生態的現地量化資訊較有限；判讀時應保留不確定性，並以暖季成幼魚組成與礫石孔隙狀況持續追蹤。',
    hengliu: '橫流溪已有魚道及上下游調查紀錄，可作為急流微棲地與貼底通行條件的指標；不宜僅以單次尾數判定整體族群增減。'
  },
  '臺灣間爬岩鰍': {
    habitat: '典型底棲急流魚類，偏好水淺、流速快、溶氧高的淺瀨，以卵石、大礫石及岩盤構成的底床最為重要。',
    feeding: '利用扁平體型與吸附構造貼附底床，主要刮食附著藻類、微小有機物與石面底棲生物。',
    breeding: '繁殖與幼魚補充受水文、底質穩定度及孔隙是否淤塞影響；現地仍應以季節性體長組成確認補充情形。',
    hengliu: '為橫流溪魚道連通性的重要觀察物種，既有上下游同步調查、標放與影像監測可交叉檢核其通行及棲地擴展。'
  },
  '明潭吻鰕虎': {
    habitat: '底棲型魚類，常棲息於礫石、卵石縫隙及潭瀨交界，偏好清澈、溶氧良好且流況多樣的溪段。',
    feeding: '以小型水生昆蟲、甲殼類及其他底棲無脊椎動物為主，通常貼近河床進行伏擊或短距離覓食。',
    breeding: '多利用石塊下方或底床孔隙產卵，並具有護卵行為；穩定的礫石底床及低淤砂環境有利於繁殖。',
    hengliu: '在橫流溪多年度、多河段均有紀錄，是底床孔隙、水質與魚道近底層通行條件的重要指標物種。'
  },
  '粗首馬口鱲': {
    habitat: '偏好河川中上游開闊的流心、深潭與潭瀨交界，需有較充足水深、流動水體及可供追逐覓食的空間。',
    feeding: '幼魚以水生昆蟲及小型無脊椎動物為主，成長後攝食範圍增加，具有較明顯的主動追捕與肉食傾向。',
    breeding: '繁殖多與暖季、水溫及流量變化相關，礫石淺灘可提供產卵環境；實際繁殖期仍應以現地體長與成熟度資料確認。',
    hengliu: '目前平台僅納入已能對應橫流溪樣站的量化紀錄；未捕獲年份代表該次調查未檢出，不等同流域內完全不存在。'
  },
  '短臀瘋鱨': {
    habitat: '夜行性底棲魚類，白天多藏匿於深潭、大型礫石縫隙、倒木或岸際遮蔽物下，偏好水質清澈且底床異質性高的溪段。',
    feeding: '主要攝食水生昆蟲幼蟲、小型甲殼類及其他底棲動物，夜間沿河床活動與覓食。',
    breeding: '繁殖資訊與橫流溪現地樣本均較有限，不宜由少量捕獲直接推定繁殖成功；建議搭配夜間調查及體長組成追蹤。',
    hengliu: '屬低密度且電捕偵測率可能偏低的物種；零星紀錄具保育意義，應以夜間目視、掩蔽物檢查與環境 DNA 輔助確認。'
  },
  '短吻紅斑吻鰕虎': {
    habitat: '偏好清澈、高溶氧的淺瀨、岸際緩流與礫石底床，常利用石塊下方及底質孔隙作為躲藏空間。',
    feeding: '以水生昆蟲幼蟲、小型甲殼類等底棲無脊椎動物為主，活動範圍多貼近河床。',
    breeding: '多利用石塊下方產卵並有護卵行為；底床孔隙完整、細砂淤積較少，有利於繁殖與幼魚躲藏。',
    hengliu: '歷年呈間歇性低量紀錄，適合作為清澈急流與礫石孔隙品質的敏感指標；跨年變化需考量低密度物種的偵測機率。'
  }
};

function fish_renderEcologyHabits(species, panelId) {
  const habit = FISH_ECOLOGY_HABITS[species];
  if (!habit) return '';
  const rows = [
    ['fa-water', '棲地環境', habit.habitat],
    ['fa-shrimp', '活動與食性', habit.feeding],
    ['fa-egg', '繁殖特性', habit.breeding],
    ['fa-location-dot', '橫流溪判讀', habit.hengliu]
  ];
  return `
    <section id="${panelId}" hidden onclick="event.stopPropagation()"
      style="margin-top:10px;padding:13px 14px;background:#f0fdfa;border:1px solid #99f6e4;border-radius:8px;text-align:left">
      <div style="font-size:20px;font-weight:900;color:#115e59;margin-bottom:9px">
        <i class="fas fa-leaf" style="margin-right:6px"></i>${fish_escape(species)}的生態習性
      </div>
      ${rows.map(([icon, label, text]) => `
        <div style="display:grid;grid-template-columns:22px 1fr;gap:7px;margin-bottom:9px;align-items:start">
          <i class="fas ${icon}" style="color:#0f766e;font-size:16px;margin-top:4px;text-align:center"></i>
          <div style="font-size:17px;line-height:1.62;color:#334155">
            <strong style="color:#134e4a">${label}：</strong>${fish_escape(text)}
          </div>
        </div>
      `).join('')}
      <div style="font-size:15px;line-height:1.5;color:#64748b;border-top:1px solid #99f6e4;padding-top:8px">
        <i class="fas fa-circle-info" style="margin-right:4px"></i>物種一般生態與橫流溪實測紀錄分列呈現；未捕獲不直接解讀為不存在。
      </div>
    </section>`;
}

/** 詳細視窗用：與卡片同一份資料，但常駐顯示、不需展開 */
/* 文獻補充：一般生態知識，與橫流溪現地實測分開呈現（CLAUDE.md Skill H）。
   內容取自公開權威來源，逐項標註出處，不與平台調查結果混用。 */
const FISH_LITERATURE = {
  '臺灣白甲魚': {
    alias: '臺灣鏟頷魚；俗稱苦花、鯝魚、苦偎、齊頭偎',
    endemic: '非臺灣特有種',
    distribution: '中國大陸長江以南東側與臺灣淡水域；臺灣各河川中、上游及其支流皆有分布。',
    ecology: '初級淡水魚。棲息於水質冷而清澈的河川上游，以落差稍大的河段較多，藏身深潭或石縫間；'
           + '喜水流湍急處，多在水體中下層活動，受驚嚇時躲入石縫。對環境適應力較冷水性虹鱒為佳。',
    feeding: '以附著於石頭表面的藻類為主食，兼食小型無脊椎動物。',
    breeding: '卵粒分離，產於岸邊緩流河床的沙土表層。',
    redlist: '臺灣紅皮書：接近受脅（NT, Near Threatened）',
    sources: [
      ['臺灣魚類資料庫（中央研究院）', 'https://fishdb.sinica.edu.tw/taxon/381030-fishdb'],
      ['臺灣生命大百科 TaiEOL', 'https://taieol.tw/pages/53878'],
      ['臺灣國家公園物種資料', 'https://npgis.cpami.gov.tw/public/detail/SpeciesDetail.aspx?SP_ID=F0024']
    ]
  },
  '臺灣鬚鱲': {
    alias: '亦稱臺灣馬口魚',
    endemic: '臺灣特有種',
    distribution: '普遍分布於臺灣西部各河川，以及恆春半島西側的小溪流。',
    ecology: '初級淡水魚，喜低溫而清澈、溶氧量高的水域（水溫約 9–22°C），游泳能力強，'
           + '多棲息於河川中、上游及支流，常於冷水域表層活動。'
           + '族群多分布於潭尾、潭邊淺灘及潭頭較緩流處；稚魚成群聚集於溪流兩岸緩流處覓食。'
           + '幼魚棲息於水流較緩、底質含沙及細小卵石處，常與臺灣石魚賓、褐吻鰕虎、粗首鱲及鯝魚混居。',
    feeding: '雜食性且極為貪食，攝食藻類、水棲昆蟲、環形動物與有機碎屑。',
    breeding: '屬多次產卵魚種，生殖季較長（約 3–12 月，夏季為高峰）；'
            + '生殖季雌魚卵巢內同時具不同成熟程度的卵，每次僅產下成熟卵。',
    redlist: '',
    sources: [
      ['臺灣魚類資料庫（中央研究院）', 'https://fishdb.sinica.edu.tw/taxon/381000-fishdb'],
      ['臺灣生命大百科 TaiEOL', 'https://taieol.tw/pages/53584'],
      ['臺灣國家公園物種資料', 'https://npgis.cpami.gov.tw/public/detail/SpeciesDetail.aspx?SP_ID=F0043']
    ]
  }
};

/** 詳細視窗用：文獻補充區塊（與橫流溪實測分列，並標註出處） */
function fish_renderLiterature(species) {
  const L = FISH_LITERATURE[species];
  if (!L) return '';
  const rows = [
    ['fa-tag', '別名', L.alias],
    ['fa-flag', '特有性', L.endemic],
    ['fa-map', '地理分布', L.distribution],
    ['fa-water', '生態與棲地', L.ecology],
    ['fa-utensils', '食性', L.feeding],
    ['fa-egg', '繁殖', L.breeding],
    ['fa-shield-halved', '保育評估', L.redlist]
  ].filter(r => r[2]);
  return `
    <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:12px;padding:14px 16px">
      <div style="font-size:20px;font-weight:900;color:#92400e;margin-bottom:4px">
        <i class="fas fa-book" style="margin-right:6px"></i>文獻補充（一般生態知識）
      </div>
      <div style="font-size:15px;color:#a16207;margin-bottom:10px;line-height:1.5">
        以下為公開文獻之物種一般習性，<b>非橫流溪現地調查結果</b>；橫流溪實測請見上方「生態習性」之橫流溪判讀與下方調查明細。
      </div>
      ${rows.map(([icon, label, text]) => `
        <div style="display:grid;grid-template-columns:22px 1fr;gap:8px;margin-bottom:9px;align-items:start">
          <i class="fas ${icon}" style="color:#b45309;font-size:16px;margin-top:5px;text-align:center"></i>
          <div style="font-size:18px;line-height:1.65;color:#334155">
            <strong style="color:#78350f">${label}：</strong>${fish_escape(text)}
          </div>
        </div>`).join('')}
      <div style="font-size:15px;line-height:1.7;color:#78350f;border-top:1px solid #fde68a;padding-top:8px">
        <b>資料來源：</b>${L.sources.map(([n, u]) =>
          `<a href="${u}" target="_blank" rel="noopener" style="color:#b45309;text-decoration:underline">${n}</a>`).join('　')}
      </div>
    </div>`;
}

function fish_renderEcologyHabitsPlain(species) {
  const habit = FISH_ECOLOGY_HABITS[species];
  if (!habit) return '';
  const rows = [
    ['fa-water', '棲地環境', habit.habitat],
    ['fa-shrimp', '活動與食性', habit.feeding],
    ['fa-egg', '繁殖特性', habit.breeding],
    ['fa-location-dot', '橫流溪判讀', habit.hengliu]
  ];
  return `
    <div style="background:#f0fdfa;border:1px solid #99f6e4;border-radius:12px;padding:14px 16px">
      <div style="font-size:20px;font-weight:900;color:#115e59;margin-bottom:10px">
        <i class="fas fa-leaf" style="margin-right:6px"></i>生態習性
      </div>
      ${rows.map(([icon, label, text]) => `
        <div style="display:grid;grid-template-columns:22px 1fr;gap:8px;margin-bottom:9px;align-items:start">
          <i class="fas ${icon}" style="color:#0f766e;font-size:16px;margin-top:5px;text-align:center"></i>
          <div style="font-size:18px;line-height:1.65;color:#334155">
            <strong style="color:#134e4a">${label}：</strong>${fish_escape(text)}
          </div>
        </div>`).join('')}
      <div style="font-size:15px;line-height:1.5;color:#64748b;border-top:1px solid #99f6e4;padding-top:8px">
        <i class="fas fa-circle-info" style="margin-right:4px"></i>物種一般生態與橫流溪實測紀錄分列呈現；未捕獲不直接解讀為不存在。
      </div>
    </div>`;
}

function fish_toggleEcology(button, panelId) {
  const panel = document.getElementById(panelId);
  if (!panel) return;
  const willOpen = panel.hidden;
  panel.hidden = !willOpen;
  button.setAttribute('aria-expanded', String(willOpen));
  const label = button.querySelector('[data-ecology-label]');
  const chevron = button.querySelector('[data-ecology-chevron]');
  if (label) label.textContent = willOpen ? '關閉生態習性' : '開啟生態習性';
  if (chevron) chevron.className = `fas ${willOpen ? 'fa-chevron-up' : 'fa-chevron-down'}`;
}

function renderFish() {
  document.getElementById('contentArea').innerHTML = `
    <div class="tabs">
      <button class="tab-btn" onclick="switchFishTab('story', this)" style="display:none;font-size:22px;padding:14px 26px;font-weight:700">
        <i class="fas fa-book-open" style="margin-right:8px;color:#1a6b3c;font-size:20px"></i>溪流故事
      </button>
      <button class="tab-btn active" onclick="switchFishTab('list', this)" style="font-size:22px;padding:14px 26px;font-weight:700">
        <i class="fas fa-fish" style="margin-right:8px;color:#0e7490;font-size:20px"></i>水域生物
      </button>
      <button class="tab-btn" onclick="switchFishTab('landlife', this)" style="font-size:22px;padding:14px 26px;font-weight:700">
        <i class="fas fa-paw" style="margin-right:8px;color:#166534;font-size:20px"></i>陸域生物
      </button>
      <button class="tab-btn" onclick="switchFishTab('vegetation', this)" style="font-size:22px;padding:14px 26px;font-weight:700">
        <i class="fas fa-seedling" style="margin-right:8px;color:#15803d;font-size:20px"></i>陸域植生
      </button>
      <button class="tab-btn" onclick="switchFishTab('biomap', this)" style="font-size:22px;padding:14px 26px;font-weight:700">
        <i class="fas fa-map" style="margin-right:8px;color:#7c3aed;font-size:20px"></i>GIS生態地圖
      </button>
      <button class="tab-btn" onclick="switchFishTab('news', this)" style="font-size:22px;padding:14px 26px;font-weight:700">
        <i class="fas fa-newspaper" style="margin-right:8px;color:#0369a1;font-size:20px"></i>生態新聞
      </button>
      <button class="tab-btn" onclick="switchFishTab('trend', this)" style="font-size:22px;padding:14px 26px;font-weight:700">
        <i class="fas fa-chart-line" style="margin-right:8px;color:#b45309;font-size:20px"></i>歷年趨勢分析
      </button>
    </div>
    <div id="fishTabContent"></div>
  `;
  injectFishNewsStyles();
  injectBioMapStyles();
  renderFishList();
}

function switchFishTab(tab, btn) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  if (tab === 'story')      renderFishStory();
  else if (tab === 'list')       renderFishList();
  else if (tab === 'landlife')   renderLandLife();
  else if (tab === 'vegetation') renderVegetation();
  else if (tab === 'biomap')     renderFishBioMap();
  else if (tab === 'news')       renderFishNews();
  else if (tab === 'trend')      renderFishTrend();
  else renderFishMap();
}

function renderFishStory() {
  const SP = window.location.protocol === 'file:' ? 'assets/story' : '/webapp/assets/story';

  injectFishStoryStyles();

  const esc = (v = '') => String(v ?? '').replace(/[&<>"']/g, m => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[m]));

  function _storyFacilities() {
    try { return (typeof DB !== 'undefined' && DB.getAll ? DB.getAll('facilities') || [] : []); }
    catch(e) { return []; }
  }

  function _storyFishGroups() {
    try {
      if (typeof fish_groupSpecies === 'function') return Object.values(fish_groupSpecies());
      const rows = (typeof DB !== 'undefined' && DB.getAll ? DB.getAll('fish') || [] : []);
      const grouped = {};
      rows.forEach(row => {
        const key = row.species || row.chineseName || '未知魚種';
        if (!grouped[key]) grouped[key] = { ...row, species: key, totalCount: 0 };
        grouped[key].totalCount += Number(row.count) || Number(row.totalCount) || 0;
      });
      return Object.values(grouped);
    } catch(e) { return []; }
  }

  function _storyFacilityClass(f) {
    const text = `${f?.type || ''}${f?.subType || ''}${f?.name || ''}`;
    if (/魚道|魚梯|過魚|仿自然/.test(text)) return '魚道';
    if (/防砂壩|防砂/.test(text)) return '防砂壩';
    if (/固床/.test(text)) return '固床工';
    if (/平台|平臺/.test(text)) return '平台';
    if (/護岸/.test(text)) return '護岸';
    if (/步道/.test(text)) return '步道';
    return f?.type || '其他';
  }

  function _storyFishwayType(f) {
    const text = `${f?.subType || ''}${f?.name || ''}`;
    if (/粗石斜曲/.test(text)) return '粗石斜曲面式魚道';
    if (/舟通/.test(text)) return '改良型舟通式魚道';
    if (/之字/.test(text)) return '之字形魚道';
    if (/降壩/.test(text)) return '降壩魚道';
    if (/潛越/.test(text)) return '潛越式魚道';
    if (/斜坡/.test(text)) return '斜坡式魚道';
    if (/階段|階梯/.test(text)) return '階段式魚道';
    return f?.subType ? `${f.subType}魚道` : '其他魚道';
  }

  function _storyStats() {
    const facilities = _storyFacilities();
    const fishGroups = _storyFishGroups();
    const byClass = facilities.reduce((acc, f) => {
      const key = _storyFacilityClass(f);
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
    const fishways = facilities.filter(f => _storyFacilityClass(f) === '魚道')
      .sort((a,b) => (Number(a.km_num) || 0) - (Number(b.km_num) || 0));
    const byType = fishways.reduce((acc, f) => {
      const key = _storyFishwayType(f);
      if (!acc[key]) acc[key] = [];
      acc[key].push(f);
      return acc;
    }, {});
    const topFish = fishGroups
      .slice()
      .sort((a,b) => (Number(b.totalCount) || 0) - (Number(a.totalCount) || 0))
      .slice(0, 5);
    return {
      facilities,
      fishGroups,
      fishways,
      byClass,
      byType,
      topFish,
      facilityTotal: facilities.length,
      fishwayTotal: byClass['魚道'] || 0,
      fishwayTypeTotal: Object.keys(byType).length,
      damTotal: byClass['防砂壩'] || 0,
      bedTotal: byClass['固床工'] || 0,
      platformTotal: byClass['平台'] || 0,
      revetmentTotal: byClass['護岸'] || 0,
      trailTotal: byClass['步道'] || 0,
      fishTotal: fishGroups.reduce((s, g) => s + (Number(g.totalCount) || 0), 0)
    };
  }

  const story = _storyStats();
  const storyFeatureFacility = story.facilities.find(f => /溪構1-1|粗石斜曲/.test(`${f.name || ''}${f.subType || ''}`)) || story.fishways[0] || {};

  const media = (src, title, caption, position = 'center center', extraClass = '') => `
    <figure class="story-media ${esc(extraClass)}">
      <button class="story-image-btn" onclick="fishStoryOpenImage('${esc(src)}','${esc(title)}','${esc(caption)}')" title="點擊放大圖面">
        <img src="${src}" loading="lazy" style="object-position:${position}" alt="${esc(title)}">
      </button>
      <figcaption>${esc(caption)}</figcaption>
    </figure>
  `;

  const sourceCollage = (src, title, caption) => `
    <figure class="story-source-collage">
      <button class="story-source-crop story-source-crop--text"
        style="background-image:url('${esc(src)}')"
        onclick="fishStoryOpenImage('${esc(src)}','${esc(title)}','${esc(caption)}')"
        aria-label="放大閱讀完整報告原文">
        <span><i class="fas fa-magnifying-glass-plus"></i> 原文重點，點擊閱讀完整頁面</span>
      </button>
      <button class="story-source-crop story-source-crop--photo"
        style="background-image:url('${esc(src)}')"
        onclick="fishStoryOpenImage('${esc(src)}','${esc(title)}','${esc(caption)}')"
        aria-label="放大檢視橫流溪崩塌現地照片">
        <span><i class="fas fa-camera"></i> 橫流溪上游崩塌與河道現況</span>
      </button>
      <figcaption>${esc(caption)}</figcaption>
    </figure>
  `;

  const kpi = (value, label, icon = 'fa-circle-info') => `
    <div class="story-kpi">
      <i class="fas ${icon}"></i>
      <strong>${esc(value)}</strong>
      <span>${esc(label)}</span>
    </div>
  `;

  function designCards() {
    const desc = {
      '粗石斜曲面式魚道': '利用粗石與曲面坡道形成多樣流速帶，兼具通行與棲地機能。',
      '改良型舟通式魚道': '以較緩水路銜接落差，降低局部水位差對中大型魚類的阻隔。',
      '之字形魚道': '透過折線式路徑延長水流距離，降低坡降並提供休息水域。',
      '降壩魚道': '利用壩體落差消能，改善下游至上游的連續通行路徑。',
      '潛越式魚道': '以低流速、潛越水路提供底棲與小型魚類通過空間。',
      '斜坡式魚道': '以連續坡面減少階差，適合不同游泳能力魚類逐段上溯。',
      '階段式魚道': '多級水池逐段消能，降低單一落差並增加暫歇棲地。'
    };
    const svgDiagram = {
      '粗石斜曲面式魚道': `<svg viewBox="0 0 120 52" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:52px">
        <rect x="0" y="0" width="7" height="52" fill="#92400e"/>
        <rect x="113" y="0" width="7" height="52" fill="#92400e"/>
        <path d="M7,44 Q38,28 60,18 Q82,28 113,44" fill="#d1d5db" stroke="#6b7280" stroke-width="1.5"/>
        <circle cx="32" cy="31" r="3.5" fill="#78716c"/><circle cx="52" cy="22" r="3" fill="#78716c"/>
        <circle cx="68" cy="22" r="3" fill="#78716c"/><circle cx="88" cy="31" r="3.5" fill="#78716c"/>
        <path d="M54,17 L66,17 L66,44 L54,44 Z" fill="rgba(56,189,248,.38)" stroke="none"/>
        <text x="60" y="38" fill="#0369a1" font-size="10" text-anchor="middle">↑↑</text>
        <text x="60" y="9" fill="#0f172a" font-size="6.5" text-anchor="middle" font-weight="700">水流匯聚中心 · 維持水深</text>
      </svg>`,
      '改良型舟通式魚道': `<svg viewBox="0 0 120 52" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:52px">
        <rect x="0" y="0" width="7" height="52" fill="#92400e"/>
        <rect x="113" y="0" width="7" height="52" fill="#92400e"/>
        <rect x="7" y="11" width="58" height="5" fill="#78350f" rx="1"/>
        <rect x="55" y="27" width="58" height="5" fill="#78350f" rx="1"/>
        <rect x="7" y="43" width="58" height="5" fill="#78350f" rx="1"/>
        <rect x="7" y="16" width="48" height="11" fill="rgba(56,189,248,.35)"/>
        <rect x="63" y="32" width="48" height="11" fill="rgba(56,189,248,.35)"/>
        <text x="31" y="24" fill="#0369a1" font-size="9" text-anchor="middle">→</text>
        <text x="87" y="40" fill="#0369a1" font-size="9" text-anchor="middle">←</text>
        <text x="60" y="9" fill="#0f172a" font-size="6.5" text-anchor="middle" font-weight="700">交錯水路消能 · 提供休息水域</text>
      </svg>`,
      '之字形魚道': `<svg viewBox="0 0 120 52" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:52px">
        <rect x="5" y="3" width="110" height="46" fill="#f1f5f9" rx="4"/>
        <path d="M15,10 L105,10 L105,24 L15,24 L15,38 L105,38 L105,48" fill="none" stroke="#38bdf8" stroke-width="6" stroke-linecap="round"/>
        <text x="60" y="19" fill="#0369a1" font-size="8" text-anchor="middle">→</text>
        <text x="60" y="33" fill="#0369a1" font-size="8" text-anchor="middle">←</text>
        <text x="60" y="7" fill="#334155" font-size="6.5" text-anchor="middle" font-weight="700">俯視：折線延長水流距離</text>
      </svg>`,
      '降壩魚道': `<svg viewBox="0 0 120 52" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:52px">
        <rect x="0" y="0" width="7" height="52" fill="#92400e"/>
        <rect x="113" y="0" width="7" height="52" fill="#92400e"/>
        <rect x="7" y="40" width="28" height="12" fill="#a3a3a3"/>
        <rect x="35" y="30" width="26" height="22" fill="#9ca3af"/>
        <rect x="61" y="20" width="26" height="32" fill="#a3a3a3"/>
        <rect x="87" y="10" width="26" height="42" fill="#9ca3af"/>
        <rect x="7" y="38" width="28" height="2" fill="#38bdf8" opacity=".85"/>
        <rect x="35" y="28" width="26" height="2" fill="#38bdf8" opacity=".85"/>
        <rect x="61" y="18" width="26" height="2" fill="#38bdf8" opacity=".85"/>
        <text x="60" y="9" fill="#0f172a" font-size="6.5" text-anchor="middle" font-weight="700">逐段跌落消能 · 降低單一落差</text>
      </svg>`,
      '潛越式魚道': `<svg viewBox="0 0 120 52" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:52px">
        <rect x="0" y="0" width="7" height="52" fill="#92400e"/>
        <rect x="113" y="0" width="7" height="52" fill="#92400e"/>
        <rect x="7" y="40" width="106" height="12" fill="#a3a3a3"/>
        <rect x="38" y="10" width="9" height="30" fill="#6b7280" rx="2"/>
        <rect x="73" y="10" width="9" height="30" fill="#6b7280" rx="2"/>
        <rect x="7" y="32" width="106" height="8" fill="rgba(56,189,248,.42)"/>
        <path d="M23,36 Q30,29 38,34" fill="none" stroke="#22d3ee" stroke-width="1.5"/>
        <path d="M57,36 Q64,28 73,34" fill="none" stroke="#22d3ee" stroke-width="1.5"/>
        <text x="60" y="9" fill="#0f172a" font-size="6.5" text-anchor="middle" font-weight="700">魚從壩底孔隙潛越通行</text>
      </svg>`,
      '斜坡式魚道': `<svg viewBox="0 0 120 52" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:52px">
        <rect x="0" y="0" width="7" height="52" fill="#92400e"/>
        <rect x="113" y="0" width="7" height="52" fill="#92400e"/>
        <path d="M7,46 L113,10 L113,52 L7,52 Z" fill="#a3a3a3"/>
        <path d="M7,44 L113,8" fill="none" stroke="#38bdf8" stroke-width="3.5" stroke-dasharray="7,4" opacity=".75"/>
        <text x="60" y="34" fill="#0369a1" font-size="9" text-anchor="middle">→→</text>
        <text x="60" y="9" fill="#0f172a" font-size="6.5" text-anchor="middle" font-weight="700">緩坡連續面 · 適合多種游泳能力</text>
      </svg>`,
      '階段式魚道': `<svg viewBox="0 0 120 52" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:52px">
        <rect x="0" y="0" width="7" height="52" fill="#92400e"/>
        <rect x="113" y="0" width="7" height="52" fill="#92400e"/>
        <rect x="7" y="42" width="24" height="10" fill="#a3a3a3"/>
        <rect x="31" y="3" width="4" height="49" fill="#6b7280"/>
        <rect x="35" y="32" width="24" height="20" fill="#9ca3af"/>
        <rect x="59" y="3" width="4" height="49" fill="#6b7280"/>
        <rect x="63" y="22" width="24" height="30" fill="#a3a3a3"/>
        <rect x="87" y="3" width="4" height="49" fill="#6b7280"/>
        <rect x="91" y="12" width="22" height="40" fill="#9ca3af"/>
        <rect x="7" y="40" width="24" height="2" fill="#38bdf8" opacity=".85"/>
        <rect x="35" y="30" width="24" height="2" fill="#38bdf8" opacity=".85"/>
        <rect x="63" y="20" width="24" height="2" fill="#38bdf8" opacity=".85"/>
        <text x="60" y="9" fill="#0f172a" font-size="6.5" text-anchor="middle" font-weight="700">多級水池暫歇 · 逐段上溯</text>
      </svg>`,
    };
    const types = Object.entries(story.byType);
    if (!types.length) return '<div class="story-note">目前資料庫尚未讀取到魚道型式資料。</div>';
    return types.map(([type, rows]) => {
      const names = rows.map(f => `${f.location || f.name}｜${f.stationKm || ''}`).join('、');
      const svg = svgDiagram[type] || '';
      return `
        <div class="story-design-card">
          <div class="story-design-head">
            <i class="fas fa-water"></i>
            <b>${esc(type)}</b>
            <span>${rows.length} 座</span>
          </div>
          ${svg ? `<div style="margin:4px 0;border-radius:5px;overflow:hidden;background:#f1f5f9">${svg}</div>` : ''}
          <p>${esc(desc[type] || '依現地落差、流速與空間條件調整配置，作為橫流溪縱向連通改善措施。')}</p>
          <small>${esc(names)}</small>
        </div>
      `;
    }).join('');
  }

  function facilityTicks() {
    const points = story.facilities
      .filter(f => Number.isFinite(Number(f.km_num)))
      .sort((a,b) => (Number(a.km_num) || 0) - (Number(b.km_num) || 0))
      .slice(0, 14);
    return points.map(f => {
      const left = Math.max(2, Math.min(96, ((Number(f.km_num) || 0) - 400) / 1000 * 94 + 2));
      const cls = _storyFacilityClass(f);
      return `
        <div class="story-river-point story-${cls}" style="left:${left}%">
          <span>${esc(f.location || f.name)}</span>
        </div>
      `;
    }).join('');
  }

  function topFishRows() {
    return story.topFish.map((f, i) => `
      <div class="story-fish-row">
        <span>${i + 1}</span>
        <b>${esc(f.species || f.chineseName || '魚種')}</b>
        <em>${Number(f.totalCount) || 0} 尾次</em>
      </div>
    `).join('');
  }

  function storyInitMap() {
    const el = document.getElementById('hlxStoryMap');
    if (!el || typeof L === 'undefined' || el._leaflet_id) return;
    const pts = story.facilities.filter(f => Number(f.lat) && Number(f.lng));
    const map = L.map(el, { scrollWheelZoom: false, zoomControl: true });
    const center = pts.length
      ? [pts.reduce((s,f)=>s+Number(f.lat),0)/pts.length, pts.reduce((s,f)=>s+Number(f.lng),0)/pts.length]
      : [24.1835, 120.9092];
    map.setView(center, 15);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap', maxZoom: 19
    }).addTo(map);
    const riverPts = pts
      .slice()
      .sort((a,b) => (Number(a.km_num) || 0) - (Number(b.km_num) || 0))
      .map(f => [Number(f.lat), Number(f.lng)]);
    if (riverPts.length > 1) {
      L.polyline(riverPts, { color: '#22c55e', weight: 5, opacity: .85 }).addTo(map)
        .bindPopup('<b>橫流溪工程設施軸線</b><br>依資料庫設施座標串接');
    }
    const colors = { '魚道': '#1565c0', '防砂壩': '#795548', '固床工': '#827717', '平台': '#7c3aed', '護岸': '#546e7a', '步道': '#6d4c41' };
    pts.forEach(f => {
      const cls = _storyFacilityClass(f);
      const color = colors[cls] || '#0f766e';
      const icon = L.divIcon({
        className: '',
        html: `<div class="story-map-pin" style="--pin:${color}"><i class="fas ${cls === '魚道' ? 'fa-fish' : cls === '平台' ? 'fa-vector-square' : cls === '防砂壩' ? 'fa-water' : 'fa-layer-group'}"></i><span>${esc(f.location || f.name || '')}</span></div>`,
        iconSize: [92, 28],
        iconAnchor: [46, 14]
      });
      L.marker([Number(f.lat), Number(f.lng)], { icon }).addTo(map)
        .bindPopup(`<b>${esc(f.name || '')}</b><br>${esc(cls)}｜${esc(f.stationKm || '')}<br>${esc(f.note || '')}`);
    });
    if (riverPts.length) map.fitBounds(riverPts, { padding: [24, 24], maxZoom: 17 });
    setTimeout(() => map.invalidateSize(), 180);
  }

  window.fishStoryOpenImage = function(src, title, caption) {
    const body = document.getElementById('modalBody');
    const titleEl = document.getElementById('modalTitle');
    const footer = document.getElementById('modalFooter');
    const modal = document.getElementById('modal');
    if (!body || !titleEl || !footer || !modal || typeof openModal !== 'function') return;
    titleEl.textContent = title || '圖面檢視';
    modal.style.maxWidth = 'min(1200px,94vw)';
    modal.style.width = '94vw';
    modal.style.maxHeight = '94vh';
    body.innerHTML = `
      <div style="display:flex;flex-direction:column;gap:12px">
        <img src="${esc(src)}" alt="${esc(title)}" style="max-width:100%;max-height:72vh;object-fit:contain;border-radius:8px;background:#0f172a">
        <div style="font-size:18px;color:#334155;line-height:1.7;background:#f8fafc;border-left:4px solid #0f766e;border-radius:8px;padding:12px 16px">${esc(caption || '')}</div>
      </div>
    `;
    footer.innerHTML = `<button class="btn btn-outline" onclick="closeModal()">關閉</button>`;
    openModal();
  };

  const pages = [
    // ── 0：封面 ────────────────────────────────────────────
    {
      render: () => `
        <div style="position:relative;width:100%;height:100%;overflow:hidden">
          <img src="${SP}/image3.jpg" loading="eager"
               style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:top center" alt="">
          <div style="position:absolute;inset:0;background:linear-gradient(160deg,rgba(12,28,18,.80),rgba(12,28,18,.58))"></div>
          <div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:36px;text-align:center;gap:16px">
            <div style="color:#86efac;font-size:16px;font-weight:800;letter-spacing:3px">與野共生 · 林業及自然保育署</div>
            <div style="color:#fff;font-size:clamp(36px,5vw,60px);font-weight:900;line-height:1.1;text-shadow:0 2px 32px rgba(0,0,0,.5)">橫流溪的故事</div>
            <div style="width:56px;height:4px;background:#4ade80;border-radius:2px"></div>
            <div style="color:#d1fae5;font-size:clamp(15px,1.6vw,20px);line-height:1.6;max-width:520px">台灣首座粗石斜曲面魚道誕生記<br>一條溪、一場地震、一個生態承諾</div>
            <button onclick="storyGoTo(1)"
              style="margin-top:6px;background:#1a6b3c;color:#fff;border:none;border-radius:999px;padding:12px 36px;font-size:18px;font-weight:800;cursor:pointer;display:flex;align-items:center;gap:10px;box-shadow:0 6px 24px rgba(26,107,60,.45)">
              開始閱讀 <i class="fas fa-arrow-right"></i>
            </button>
          </div>
        </div>
      `
    },
    // ── 1：圖冊封面介紹 ──────────────────────────────────────
    {
      render: () => `
        <div class="story-spread story-dark" style="grid-template-columns:64% 36%">
          ${media(`${SP}/image1.jpg`, '與野共生圖冊封面', '')}
          <div class="story-panel">
            <div class="story-kicker">緣起</div>
            <div class="story-title" style="font-size:clamp(44px,5.5vw,72px)">與野共生</div>
            <div class="story-subtitle">國有林區治理工程友善生態圖輯</div>
            <p class="story-body">本圖輯以橫流溪為主角，說明治理工程如何在防災安全與魚類縱向連通之間取得平衡。</p>
            <div class="story-source-box">
              <b>資料庫摘要</b>
              <span>目前平台已納管 ${story.facilityTotal || '—'} 筆工程設施，其中魚道 ${story.fishwayTotal || '—'} 座、防砂壩 ${story.damTotal || '—'} 座、固床工 ${story.bedTotal || '—'} 座、平台 ${story.platformTotal || '—'} 座。</span>
            </div>
          </div>
        </div>
      `
    },
    // ── 第2頁：工程課題與水域生態（合併）全螢幕 ─────────────
    {
      render: () => `
        <div style="position:relative;width:100%;height:100%;overflow:hidden">
          <div style="position:absolute;inset:0;background:url('${SP}/image4_full.jpg') 65% 55% / auto 140% no-repeat" role="img" aria-label="橫流溪流域生態全景"></div>
          <div style="position:absolute;inset:0;background:linear-gradient(to top,rgba(8,20,12,.97) 0%,rgba(8,20,12,.65) 42%,rgba(8,20,12,.1) 72%,transparent 100%);display:flex;flex-direction:column;justify-content:flex-end;padding:28px clamp(24px,4vw,56px) 40px">
            <div class="story-kicker" style="margin-bottom:10px">第 2 頁 · 工程課題與水域生態</div>
            <div style="display:flex;align-items:flex-start;gap:clamp(16px,3vw,52px);flex-wrap:wrap">
              <div style="flex:2;min-width:260px">
                <div class="story-title" style="color:#fff;margin-bottom:12px">臺灣魚種的<br>基因寶庫</div>
                <p class="story-body" style="max-width:560px;margin-bottom:0">橫流溪具有深潭、淺瀨、急流與礫石底質等多樣微棲地，整合 ${story.fishGroups.length || '—'} 種物種，累計 ${story.fishTotal || '—'} 尾次。防砂壩穩定河床的同時，透過多型式魚道改善縱向連通，兼顧防災功能與棲地需求。</p>
              </div>
              <div style="display:flex;gap:10px;flex-shrink:0;padding-bottom:6px">
                <div style="background:rgba(6,78,59,.75);border:1px solid rgba(134,239,172,.4);border-radius:14px;padding:14px 22px;text-align:center;min-width:90px">
                  <div style="font-size:clamp(28px,2.8vw,42px);font-weight:900;color:#86efac;line-height:1">${story.damTotal}</div>
                  <div style="font-size:13px;color:#d1fae5;margin-top:6px;line-height:1.3">防砂壩<br>納管</div>
                </div>
                <div style="background:rgba(6,78,59,.75);border:1px solid rgba(134,239,172,.4);border-radius:14px;padding:14px 22px;text-align:center;min-width:90px">
                  <div style="font-size:clamp(28px,2.8vw,42px);font-weight:900;color:#86efac;line-height:1">${story.fishwayTotal}</div>
                  <div style="font-size:13px;color:#d1fae5;margin-top:6px;line-height:1.3">魚道<br>改善連通</div>
                </div>
                <div style="background:rgba(6,78,59,.75);border:1px solid rgba(134,239,172,.4);border-radius:14px;padding:14px 22px;text-align:center;min-width:90px">
                  <div style="font-size:clamp(28px,2.8vw,42px);font-weight:900;color:#86efac;line-height:1">${story.fishGroups.length || '—'}</div>
                  <div style="font-size:13px;color:#d1fae5;margin-top:6px;line-height:1.3">水域<br>物種</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      `
    },
    // ── 第5頁：災後治理與生態連通 (p.51) ────────────────────
    {
      render: () => `
        <div class="story-spread story-dark" style="grid-template-columns:50% 50%">
          <div class="story-panel">
            <div class="story-kicker">第 4 頁 · 治理歷程</div>
            <div class="story-title">災後治理與<br>生態連通</div>
            <p class="story-body">歷次地震與颱風事件造成上游土石崩落及河道阻塞，治理工作除維持道路與下游安全，也逐步把魚類通行與棲地連續性納入修復設計。</p>
            <div class="story-design-grid" style="grid-template-columns:repeat(2,1fr)">
              <div class="story-hist-card">
                <div class="story-hist-year">1999</div>
                <div class="story-hist-title">上游土石崩落</div>
                <div class="story-hist-body">九二一地震後土石大量下移，後續設置防砂設施穩定河床，確保道路與下游住戶安全。</div>
              </div>
              <div class="story-hist-card">
                <div class="story-hist-year">2012</div>
                <div class="story-hist-title">颱風造成邊坡崩塌</div>
                <div class="story-hist-body">蘇拉颱風造成大量土砂再次進入溪流，阻斷河道，河道整理與設施修復需求大幅提高。</div>
              </div>
              <div class="story-hist-card">
                <div class="story-hist-year">2013</div>
                <div class="story-hist-title">修復納入生態需求</div>
                <div class="story-hist-body">依河段地形、水量與安全條件，配置粗石斜曲面等多型式魚道，逐步改善魚類縱向移動條件。</div>
              </div>
              <div class="story-hist-card story-hist-card--note">
                <div class="story-hist-title" style="color:#86efac">判讀重點</div>
                <div class="story-hist-body">工程目標由單一土砂防治，擴充為「河床穩定、通洪安全與縱向生態連通」的整合管理。</div>
              </div>
            </div>
          </div>
          ${media(`${SP}/image5.jpg`, '橫流溪災後治理與生態連通報告頁', '資料圖說：報告記錄橫流溪上游崩塌、河道阻塞與後續防砂壩修復背景；完整原文可點圖放大閱讀。')}
        </div>
      `
    },
    // ── 第6頁：粗石斜曲面魚道 (p.52) ─────────────────────────
    {
      render: () => `
        <div class="story-spread story-light" style="grid-template-columns:50% 50%">
          <div class="story-panel">
            <div class="story-kicker">第 5 頁 · 多型式設計</div>
            <div class="story-title">魚道不是一種<br>而是多型式配置</div>
            <p class="story-body">依據資料庫，目前橫流溪納管 ${story.fishwayTotal} 座魚道，分成 ${story.fishwayTypeTotal} 種主要型式。不同型式對應不同落差、水深、流速與魚類游泳能力。</p>
            <div class="story-design-grid">${designCards()}</div>
          </div>
          ${media(`${SP}/image6.png`, '粗石斜曲面式魚道設計圖說', `圖說：${storyFeatureFacility.name || '粗石斜曲面式魚道'}位於 ${storyFeatureFacility.stationKm || '1K+400'}，以粗石與斜曲面降低落差阻隔，提供多樣流速帶。`)}
        </div>
      `
    },
    // ── 第7頁：剖面圖 (p.53) ──────────────────────────────
    {
      render: () => `
        <div class="story-spread story-light" style="grid-template-columns:64% 36%">
          ${media(`${SP}/image7.png`, '魚道剖面圖與改善對照', '圖說：剖面圖呈現改善前梯式高落差與改善後斜曲面水路差異，作為設計審查與後續維護判讀依據。')}
          <div class="story-panel">
            <div class="story-kicker">第 6 頁 · 設計圖說</div>
            <div class="story-title">魚道設計目的</div>
            <div class="story-compare-list">
              <div><b>改善前</b><span>階差集中、水流急、易淤積，魚類缺乏休息區。</span></div>
              <div><b>改善後</b><span>斜曲面與粗石共同消能，保留中央低流量水路。</span></div>
              <div><b>管理用途</b><span>後續巡查可比對水流、淤積、淘刷與通行斷面是否改變。</span></div>
            </div>
          </div>
        </div>
      `
    },
    // ── 第8頁：施工現場 ───────────────────────────────────
    {
      render: () => `
        <div class="story-spread story-light" style="grid-template-columns:48% 52%">
          <div class="story-panel">
            <div class="story-kicker">第 7 頁 · 施工與維護</div>
            <div class="story-title">生態友善<br>維護理念</div>
            <p class="story-body">後續維護也依循生態友善的作法，以儘量保留溪底孔隙的方式補強魚道下游處基礎，降低落差、減緩淘刷，也提供水中生物休息和躲藏的孔隙。</p>
            <p class="story-body">整體而言，粗石斜曲面魚道跳脫以往單一形式的魚道斷面，以適合各類魚種及水生生物通行作為設計理念，期望能進一步助益於河川環境復育。</p>
            <div>
              <div style="color:#0f766e;font-size:clamp(15px,1.1vw,18px);font-weight:900;letter-spacing:.5px;margin-bottom:10px">設計理念</div>
              <div style="display:flex;gap:8px;flex-wrap:wrap">
                <span style="background:#dcfce7;border:1.5px solid #6ee7b7;border-radius:999px;padding:8px 18px;font-size:clamp(14px,1.05vw,17px);color:#14532d;font-weight:800;box-shadow:0 2px 8px rgba(6,78,59,.15)">保留溪底孔隙</span>
                <span style="background:#dcfce7;border:1.5px solid #6ee7b7;border-radius:999px;padding:8px 18px;font-size:clamp(14px,1.05vw,17px);color:#14532d;font-weight:800;box-shadow:0 2px 8px rgba(6,78,59,.15)">降低落差</span>
                <span style="background:#dcfce7;border:1.5px solid #6ee7b7;border-radius:999px;padding:8px 18px;font-size:clamp(14px,1.05vw,17px);color:#14532d;font-weight:800;box-shadow:0 2px 8px rgba(6,78,59,.15)">減緩淘刷</span>
                <span style="background:#dcfce7;border:1.5px solid #6ee7b7;border-radius:999px;padding:8px 18px;font-size:clamp(14px,1.05vw,17px);color:#14532d;font-weight:800;box-shadow:0 2px 8px rgba(6,78,59,.15)">多樣水域型態</span>
              </div>
            </div>
          </div>
          ${media(`${SP}/image8.jpg`, '粗石斜曲面魚道施工現場', '粗石斜曲面魚道的設計使水位能隨曲面變化，營造多樣化的水域型態。', 'center top', 'story-media--cover')}
        </div>
      `
    },
    // ── 第9頁：魚兒回來了 ─────────────────────────────────
    {
      render: () => `
        <div class="story-spread story-dark" style="grid-template-columns:48% 52%">
          ${media(`${SP}/image9.jpg`, '明潭吻鰕虎與魚道成效', '圖說：魚類調查照片需連結物種、調查日期與所在河段；本頁以明潭吻鰕虎作為魚道成效的代表性底棲魚種。', 'center top')}
          <div class="story-panel">
            <div class="story-kicker">第 8 頁 · 成效見證</div>
            <div class="story-title">魚兒<br>回來了</div>
            <div class="story-kpi-grid">
              ${kpi('97', '114年粗石斜曲面型 尾／次', 'fa-chart-line')}
              ${kpi(`${story.fishTotal || '—'} 尾次`, '資料庫水域生物累計', 'fa-database')}
              ${kpi(`${story.fishGroups.length || '—'} 種`, '平台整合物種', 'fa-fish')}
              ${kpi('RAG 可問答', '與工程設施、巡查資料連動', 'fa-robot')}
            </div>
            <p class="story-body">圖冊最後以量化資料收斂：魚道改善後，魚類通行、棲地連續性與族群回復可由調查紀錄、工程位置與設施型式交互驗證。</p>
          </div>
        </div>
      `
    },
  ];

  const TOTAL = pages.length;

  document.getElementById('fishTabContent').innerHTML = `
    <div id="storyShell" style="display:flex;flex-direction:column;overflow:hidden;box-shadow:0 4px 32px rgba(15,23,42,.18);border-top:2px solid #d1fae5">
      <div id="storyPageArea" style="flex:1;min-height:0;overflow:hidden;transition:opacity .15s"></div>
      <div style="background:#1c3829;padding:14px 32px;display:flex;align-items:center;justify-content:space-between;gap:16px;flex-shrink:0">
        <button id="storyPrev"
          onclick="storyGoTo(window._fishStoryPage-1)"
          style="background:rgba(255,255,255,.1);color:#d1fae5;border:1px solid rgba(255,255,255,.22);border-radius:999px;
                 padding:10px 24px;font-size:17px;font-weight:700;cursor:pointer;display:flex;align-items:center;gap:8px">
          <i class="fas fa-arrow-left"></i> 上一頁
        </button>
        <div id="storyDots" style="display:flex;align-items:center;gap:10px"></div>
        <button id="storyNext"
          onclick="storyGoTo(window._fishStoryPage+1)"
          style="background:#1a6b3c;color:#fff;border:none;border-radius:999px;
                 padding:10px 24px;font-size:17px;font-weight:700;cursor:pointer;display:flex;align-items:center;gap:8px">
          下一頁 <i class="fas fa-arrow-right"></i>
        </button>
      </div>
    </div>
  `;

  // 讓外殼精確填滿 fishTabContent 可用視窗高度，不產生主頁捲動
  function _storyFit() {
    const fc = document.getElementById('fishTabContent');
    const shell = document.getElementById('storyShell');
    if (!fc || !shell) return;
    const top = fc.getBoundingClientRect().top;
    const parentPB = parseInt(window.getComputedStyle(fc.parentElement || document.body).paddingBottom) || 0;
    shell.style.height = Math.max(320, window.innerHeight - top - parentPB) + 'px';
  }
  if (window._storyResizeOff) { window._storyResizeOff(); window._storyResizeOff = null; }
  const _srh = () => _storyFit();
  window.addEventListener('resize', _srh);
  window._storyResizeOff = () => window.removeEventListener('resize', _srh);
  _storyFit();

  // MutationObserver: auto-init Leaflet map whenever #hlxStoryMap appears in the DOM
  if (window._storyMapObserver) { window._storyMapObserver.disconnect(); window._storyMapObserver = null; }
  const _obsTarget = document.getElementById('fishTabContent') || document.body;
  window._storyMapObserver = new MutationObserver(function() {
    const el = document.getElementById('hlxStoryMap');
    if (el && !el._leaflet_id && el.offsetWidth > 0 && typeof L !== 'undefined') {
      storyInitMap();
    }
  });
  window._storyMapObserver.observe(_obsTarget, { childList: true, subtree: true });

  window._fishStoryPages = pages;
  window.storyGoTo = function(n) {
    if (n < 0 || n >= TOTAL) return;
    window._fishStoryPage = n;
    const area = document.getElementById('storyPageArea');
    if (!area) return;
    area.style.opacity = '0';
    setTimeout(() => {
      area.innerHTML = pages[n].render();
      area.style.opacity = '1';
      requestAnimationFrame(() => { _storyFit(); });
      if (typeof pages[n].afterRender === 'function') {
        setTimeout(() => pages[n].afterRender(), 80);
      }
    }, 150);
    document.getElementById('storyDots').innerHTML = pages.map((_, i) => `
      <button onclick="storyGoTo(${i})"
        style="width:${i===n?28:9}px;height:9px;border-radius:999px;
               background:${i===n?'#4ade80':'rgba(255,255,255,.28)'};
               border:none;cursor:pointer;transition:all .25s;padding:0"></button>
    `).join('');
    const prev = document.getElementById('storyPrev');
    const next = document.getElementById('storyNext');
    if (prev) prev.style.opacity = n === 0 ? '0.35' : '1';
    if (next) {
      next.style.opacity = n === TOTAL-1 ? '0.35' : '1';
      next.innerHTML = n === TOTAL-1 ? '已到最後一頁' : '下一頁 <i class="fas fa-arrow-right"></i>';
    }
  };

  window.storyGoTo(0);
}

function injectFishStoryStyles() {
  if (document.getElementById('fishStoryStyles')) return;
  const style = document.createElement('style');
  style.id = 'fishStoryStyles';
  style.textContent = `
    .story-spread{height:100%;display:grid;min-height:0;overflow:hidden;background:#fff}
    .story-dark{background:#12251a;color:#fff}.story-light{background:#f8fafc;color:#0f172a}
    .story-panel{min-height:0;overflow:auto;padding:clamp(24px,3vw,42px);display:flex;flex-direction:column;justify-content:center;gap:clamp(12px,1.4vw,20px)}
    .story-kicker{color:#6ee7b7;font-size:clamp(15px,1.35vw,19px);font-weight:900;letter-spacing:1.4px}
    .story-light .story-kicker{color:#0f766e}.story-title{font-size:clamp(34px,4.4vw,58px);line-height:1.1;font-weight:950;letter-spacing:0;color:inherit}
    .story-subtitle{font-size:clamp(21px,2.1vw,30px);line-height:1.35;color:#86efac;font-weight:900}
    .story-light .story-subtitle{color:#0f766e}.story-body{font-size:clamp(19px,1.45vw,23px);line-height:1.65;margin:0;color:#d1fae5;font-weight:650}
    .story-light .story-body{color:#334155}.story-source-box{border-left:5px solid #86efac;background:rgba(255,255,255,.09);border-radius:0 10px 10px 0;padding:14px 18px;font-size:clamp(17px,1.2vw,20px);line-height:1.65;color:#d1fae5}
    .story-source-box b{display:block;color:#86efac;margin-bottom:5px}.story-source-box.light{background:#ecfeff;color:#334155;border-color:#0f766e}.story-source-box.light b{color:#0f766e}
    .story-media{position:relative;height:100%;min-height:0;margin:0;background:#0d1f12;display:flex;flex-direction:column;align-items:center;justify-content:center;overflow:hidden}
    .story-image-btn{border:0;background:transparent;width:100%;height:calc(100% - 56px);min-height:0;display:flex;align-items:center;justify-content:center;padding:0;cursor:zoom-in}
    .story-media img{max-width:100%;max-height:100%;width:auto;height:auto;object-fit:contain;display:block}
    .story-media--cover .story-image-btn{align-items:stretch}
    .story-media--cover img{max-width:none;max-height:none;width:100%;height:100%;object-fit:cover}
    .story-media figcaption,.story-map-frame figcaption,.story-axis-caption{width:100%;min-height:56px;display:flex;align-items:center;background:#f8fafc;color:#334155;border-top:1px solid #dbeafe;padding:9px 16px;font-size:clamp(16px,1.2vw,20px);line-height:1.45;font-weight:700;box-sizing:border-box}
    .story-dark .story-media figcaption{background:#112218;color:#d1fae5;border-color:rgba(134,239,172,.25)}
    .story-source-collage{height:100%;min-height:0;margin:0;display:grid;grid-template-rows:minmax(210px,42%) minmax(260px,1fr) auto;gap:3px;background:#0d1f12;overflow:hidden}
    .story-source-crop{position:relative;width:100%;min-height:0;border:0;padding:0;overflow:hidden;background-color:#eaf2ec;background-repeat:no-repeat;cursor:zoom-in}
    .story-source-crop--text{background-size:100% auto;background-position:center top}
    .story-source-crop--photo{background-size:118% auto;background-position:center 91%}
    .story-source-crop:after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,transparent 62%,rgba(8,24,14,.78))}
    .story-source-crop>span{position:absolute;z-index:1;left:18px;bottom:14px;display:flex;align-items:center;gap:9px;color:#fff;background:rgba(8,24,14,.78);border:1px solid rgba(255,255,255,.22);border-radius:8px;padding:8px 12px;font-size:clamp(15px,1.05vw,18px);font-weight:850}
    .story-source-collage figcaption{display:flex;align-items:center;min-height:58px;background:#112218;color:#d1fae5;border-top:1px solid rgba(134,239,172,.25);padding:9px 16px;font-size:clamp(16px,1.1vw,19px);line-height:1.45;font-weight:700;box-sizing:border-box}
    .story-panel--concept{justify-content:flex-start;padding:clamp(16px,1.8vw,26px);gap:8px;overflow:hidden}
    .story-panel--concept .story-title{font-size:clamp(31px,3vw,43px);line-height:1.05}
    .story-panel--concept .story-body{font-size:clamp(16px,1.05vw,19px);line-height:1.45}
    .story-panel--concept .story-kpi-grid{gap:8px}
    .story-panel--concept .story-kpi{min-height:68px;padding:9px 11px}
    .story-panel--concept .story-kpi i{font-size:18px}
    .story-panel--concept .story-kpi strong{font-size:clamp(21px,1.8vw,28px)}
    .story-panel--concept .story-kpi span{font-size:clamp(14px,.95vw,16px)}
    .story-panel--concept .story-source-box{padding:8px 11px;font-size:clamp(14px,.95vw,16px);line-height:1.4}
    .story-panel--concept .story-source-box b{display:inline;margin-right:8px}
    .story-panel--evidence{justify-content:flex-start;padding:clamp(17px,1.8vw,28px);gap:7px;overflow:hidden}
    .story-panel--evidence .story-kicker{font-size:clamp(14px,1vw,17px)}
    .story-panel--evidence .story-body{font-size:clamp(16px,1.05vw,19px);line-height:1.48}
    .story-title--compact{font-size:clamp(32px,3vw,44px);line-height:1.05}
    .story-timeline{display:grid;gap:6px}
    .story-timeline-item{display:grid;grid-template-columns:66px 1fr;align-items:stretch;border:1px solid rgba(134,239,172,.24);border-radius:9px;overflow:hidden;background:rgba(255,255,255,.07)}
    .story-timeline-item>b{display:grid;place-items:center;background:#166534;color:#fff;font-size:clamp(19px,1.4vw,24px);letter-spacing:0}
    .story-timeline-item>span{display:block;padding:7px 10px;color:#d1fae5;font-size:clamp(15px,.95vw,17px);line-height:1.35}
    .story-timeline-item strong{display:inline;color:#86efac;font-size:1.03em;margin-right:7px}
    .story-source-box--compact{padding:8px 12px;font-size:clamp(15px,.95vw,17px);line-height:1.4}
    .story-source-box--compact b{display:inline;margin:0 8px 0 0}
    .story-kpi-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
    .story-kpi{background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.22);border-radius:12px;padding:14px;min-height:86px;display:flex;flex-direction:column;justify-content:center;gap:4px}
    .story-light .story-kpi{background:#fff;border-color:#dbeafe}.story-kpi i{font-size:22px;color:#86efac}.story-light .story-kpi i{color:#0f766e}
    .story-kpi strong{font-size:clamp(24px,2.2vw,34px);line-height:1;color:#4ade80}.story-light .story-kpi strong{color:#0f766e}
    .story-kpi span{font-size:clamp(15px,1.1vw,18px);line-height:1.35;color:#d1fae5}.story-light .story-kpi span{color:#475569}
    .story-map-frame{height:100%;display:flex;flex-direction:column;background:#0d1f12;min-height:0}.story-map-frame #hlxStoryMap{flex:1;min-height:0;width:100%}
    .story-map-pin{display:flex;align-items:center;gap:4px;background:#fff;border:2px solid var(--pin);color:#0f172a;border-radius:999px;padding:3px 7px;font-size:12px;font-weight:900;box-shadow:0 3px 10px rgba(15,23,42,.35);white-space:nowrap}
    .story-map-pin i{color:var(--pin)}.story-map-pin span{max-width:70px;overflow:hidden;text-overflow:ellipsis}
    .story-fish-table{background:#fff;border:1px solid #dbeafe;border-radius:12px;overflow:hidden}.story-table-title{font-size:19px;font-weight:900;color:#0f766e;background:#ecfeff;padding:10px 14px;border-bottom:1px solid #dbeafe}
    .story-fish-row{display:grid;grid-template-columns:42px 1fr auto;gap:10px;align-items:center;padding:10px 14px;border-bottom:1px solid #eef2f7;font-size:18px}.story-fish-row:last-child{border-bottom:0}
    .story-fish-row span{width:28px;height:28px;border-radius:999px;background:#0f766e;color:#fff;display:grid;place-items:center;font-weight:900}.story-fish-row b{font-weight:900;color:#0f172a}.story-fish-row em{font-style:normal;color:#0369a1;font-weight:900}
    .story-river-axis{position:relative;height:210px;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.18);border-radius:14px;padding:34px 18px}.story-river-line{position:absolute;left:5%;right:5%;top:50%;height:9px;background:linear-gradient(90deg,#38bdf8,#22c55e);border-radius:999px;box-shadow:0 0 0 6px rgba(255,255,255,.08)}
    .story-river-point{position:absolute;top:calc(50% - 17px);transform:translateX(-50%);width:34px;height:34px;border-radius:50%;background:#fff;border:4px solid #1565c0;box-shadow:0 4px 12px rgba(0,0,0,.3)}
    .story-river-point span{position:absolute;left:50%;top:40px;transform:translateX(-50%);background:#0f172a;color:#fff;border-radius:6px;padding:4px 6px;font-size:13px;white-space:nowrap;font-weight:800}.story-river-point:nth-child(even) span{top:auto;bottom:40px}
    .story-river-point.story-防砂壩{border-color:#795548}.story-river-point.story-固床工{border-color:#827717}.story-river-point.story-平台{border-color:#7c3aed}.story-river-point.story-護岸{border-color:#546e7a}.story-river-point.story-步道{border-color:#6d4c41}
    .story-axis-caption{border:0;background:transparent;color:#d1fae5;padding:0;min-height:auto;font-size:17px}
    .story-design-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;overflow:auto;padding-right:4px}.story-design-card{background:#fff;border:1px solid #dbeafe;border-radius:12px;padding:12px 14px}
    .story-design-head{display:flex;align-items:center;gap:8px;margin-bottom:8px}.story-design-head i{color:#0f766e}.story-design-head b{font-size:18px;color:#0f172a}.story-design-head span{margin-left:auto;background:#ecfeff;color:#0f766e;border-radius:999px;padding:2px 8px;font-size:14px;font-weight:900}
    .story-design-card p{font-size:16px;line-height:1.55;color:#334155;margin:0 0 8px}.story-design-card small{display:block;font-size:14px;color:#64748b;line-height:1.45}
    .story-compare-list{display:grid;gap:12px}.story-compare-list div{background:#fff;border:1px solid #dbeafe;border-radius:12px;padding:15px 16px}.story-compare-list b{display:block;color:#0f766e;font-size:21px;margin-bottom:6px}.story-compare-list span{font-size:18px;color:#334155;line-height:1.6}
    .story-photo-page{position:relative;height:100%;overflow:hidden;background:#0d1f12}.story-photo-page>img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:center}
    .story-photo-page:before{content:"";position:absolute;inset:0;background:linear-gradient(180deg,rgba(10,20,12,.18),rgba(10,20,12,.9))}
    .story-photo-overlay{position:absolute;left:0;right:0;bottom:0;padding:clamp(26px,4vw,54px);display:flex;flex-direction:column;align-items:flex-start;gap:12px;color:#fff}
    .story-photo-overlay .story-kicker{width:max-content;max-width:100%;padding:6px 11px;border-radius:7px;background:rgba(236,253,245,.94);color:#065f46;text-shadow:none;box-shadow:0 3px 12px rgba(15,23,42,.2)}
    .story-photo-overlay .story-title{width:max-content;max-width:min(900px,100%);padding:10px 16px;border-left:6px solid #10b981;border-radius:0 10px 10px 0;background:rgba(255,255,255,.92);color:#052e16;text-shadow:none;box-shadow:0 5px 18px rgba(15,23,42,.26)}
    .story-photo-caption{max-width:880px;background:rgba(15,23,42,.86);border-left:5px solid #6ee7b7;border-radius:0 10px 10px 0;padding:12px 16px;font-size:clamp(18px,1.35vw,22px);line-height:1.55;color:#f0fdf4;font-weight:800;box-shadow:0 4px 16px rgba(15,23,42,.28)}
    .story-chip-row{display:flex;gap:10px;flex-wrap:wrap}.story-chip-row span{background:rgba(255,255,255,.94);border:1px solid #a7f3d0;border-radius:999px;padding:9px 14px;font-size:18px;color:#1f2937;font-weight:750;box-shadow:0 3px 10px rgba(15,23,42,.2)}.story-chip-row b{color:#047857;margin-right:6px}
    .story-hist-card{background:rgba(255,255,255,.07);border:1px solid rgba(134,239,172,.2);border-radius:12px;padding:13px 15px;display:flex;flex-direction:column;gap:5px}.story-hist-card--note{background:rgba(134,239,172,.08);border-color:rgba(134,239,172,.35)}
    .story-hist-year{font-size:22px;font-weight:900;color:#86efac;letter-spacing:0.5px}.story-hist-title{font-size:16px;font-weight:800;color:#f0fdf4;line-height:1.3}.story-hist-body{font-size:14px;color:#a7c5aa;line-height:1.55;margin:0}
    @media (max-width: 980px){.story-spread{grid-template-columns:1fr!important;overflow:auto}.story-media{min-height:46vh}.story-source-collage{min-height:70vh}.story-panel{justify-content:flex-start}.story-design-grid,.story-kpi-grid{grid-template-columns:1fr}.story-title{font-size:36px}.story-body{font-size:19px}}
  `;
  document.head.appendChild(style);
}

function renderFishList() {
  const data = DB.getAll('fish');
  // 累計尾次採用「統籌核對後」的完整歷年序列（與歷年趨勢分析一致），非 DB 快照加總
  const grouped = Object.values(fish_groupSpecies());
  const totalCount = grouped.reduce((s, g) => s + (Number(g.totalCount) || 0), 0);
  const uniqueSpecies = grouped.length;
  // Protected: count unique species (not records) with non-一般 status
  const protected_ = new Set(
    data.filter(f => f.conservation && f.conservation !== '一般').map(f => f.species)
  ).size;

  const container = document.getElementById('fishTabContent');
  container.innerHTML = `
    <!-- 統計橫幅（可點擊篩選） -->
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:10px;margin-bottom:16px">
      ${[
        ['fa-fish','#0e7490','#cffafe',`${uniqueSpecies} 種`,'記錄物種','fish_statClick(\'\')','顯示全部物種'],
        ['fa-tally','#166534','#dcfce7',`${HLX_FISH_SURVEY_EVENTS} 次`,'已核對調查場次','fish_statClick(\'\')',`共${HLX_FISH_SURVEY_EVENTS}次量化調查；物種明細另有${data.length}筆資料庫代表紀錄`],
        ['fa-hashtag','#1d4ed8','#dbeafe',`${totalCount} 尾`,'累計尾次','fish_statClick(\'trend\')','查看歷年趨勢分析'],
        ['fa-shield-halved','#dc2626','#fee2e2',`${protected_} 種`,'保育物種','fish_statClick(\'protected\')','篩選顯示保育物種']
      ].map(([ic,col,bg,val,lbl,action,tip]) => `
        <div onclick="${action}" title="${tip}"
          style="background:${bg};border-radius:10px;padding:14px 16px;display:flex;align-items:center;gap:12px;cursor:pointer;border:2px solid transparent;transition:border-color .2s,box-shadow .2s"
          onmouseover="this.style.borderColor='${col}';this.style.boxShadow='0 4px 16px rgba(0,0,0,.12)'"
          onmouseout="this.style.borderColor='transparent';this.style.boxShadow='none'">
          <div style="font-size:24px;color:${col}"><i class="fas ${ic}"></i></div>
          <div>
            <div style="font-size:22px;font-weight:900;color:${col};line-height:1">${val}</div>
            <div style="font-size:18px;color:#64748b">${lbl}</div>
          </div>
        </div>
      `).join('')}
    </div>

    <!-- 搜尋列 + 新增 -->
    <div style="display:flex;gap:10px;align-items:center;margin-bottom:18px;flex-wrap:wrap">
      <div style="flex:1;min-width:220px;display:flex;align-items:center;gap:10px;background:#fff;border:2px solid #e2e8f0;border-radius:10px;padding:10px 16px">
        <i class="fas fa-search" style="color:#94a3b8;font-size:18px"></i>
        <input type="text" id="fishSearch" placeholder="搜尋物種名稱…"
          oninput="loadFishTable()"
          style="border:none;outline:none;font-size:17px;width:100%;color:#0f172a;background:transparent">
      </div>
      <select id="fishConservationFilter" onchange="loadFishTable()"
        style="padding:10px 16px;border:2px solid #e2e8f0;border-radius:10px;font-size:20px;color:#334155;background:#fff;min-width:150px">
        <option value="">全部保育等級</option>
        <option value="瀕危">瀕危</option>
        <option value="易危">易危</option>
        <option value="近危">近危</option>
        <option value="一般">一般</option>
      </select>
      <button onclick="openFishForm()"
        style="padding:10px 20px;background:var(--primary,#1a6b3c);color:#fff;border:none;border-radius:10px;font-size:20px;font-weight:700;cursor:pointer;white-space:nowrap">
        <i class="fas fa-plus"></i> 新增記錄
      </button>
    </div>

    <!-- 卡片列表 -->
    <div id="fishTable"></div>
  `;
  loadFishTable();
}

function loadFishTable() {
  const kw = document.getElementById('fishSearch')?.value?.toLowerCase() || '';
  const cf = document.getElementById('fishConservationFilter')?.value || '';

  // 統一使用 fish_groupSpecies() 確保保育等級（2024紅皮書）與累計尾數覆寫正確套用
  let species = Object.values(fish_groupSpecies());
  if (kw) species = species.filter(s => s.species.toLowerCase().includes(kw) || (s.scientificName || '').toLowerCase().includes(kw));
  if (cf) species = species.filter(s => s.conservation === cf);

  const cMap = { '瀕危':['#b91c1c','#fee2e2'], '易危':['#d97706','#fef9c3'], '近危':['#2563eb','#dbeafe'], '一般':['#16a34a','#dcfce7'] };

  if (!species.length) {
    document.getElementById('fishTable').innerHTML = '<div class="empty-state"><i class="fas fa-fish"></i><p>查無記錄</p></div>';
    return;
  }

  const TREND_SET = new Set(['臺灣白甲魚','臺灣石魚賓','臺灣鬚鱲','纓口臺鰍','臺灣間爬岩鰍','明潭吻鰕虎','短臀瘋鱨','短吻紅斑吻鰕虎']);
  const fallback = '/webapp/assets/fish-photos/field-measurement.jpg';

  document.getElementById('fishTable').innerHTML = `
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:18px;padding:4px 0">
      ${species.map((s, speciesIndex) => {
        const photo = fish_photoFor(s);
        const [ccl] = cMap[s.conservation] || ['#475569','#f1f5f9'];
        const cardId = `fishcard_sp_${speciesIndex}_${s.species.replace(/[^\w]/g, '_')}`;
        const inTrend = TREND_SET.has(s.species);
        const allLocs = [...new Set(s.records.map(r => r.location).filter(Boolean))];
        const surveyRecords = Array.isArray(s.surveyRecords) ? s.surveyRecords : [];
        const surveyTimeline = Array.isArray(s.surveyTimeline) ? s.surveyTimeline : [];
        const displayRecords = fish_canonicalDetailRecords(s.species, s.records.slice().sort((a,b)=>String(b.date||'').localeCompare(String(a.date||''))), surveyRecords);
        const displaySurveyCount = surveyTimeline.length || displayRecords.length || s.surveys || 0;
        const captureSurveyCount = surveyRecords.length || 0;
        const displayTotal = fish_recordSum(displayRecords) || Number(s.totalCount) || 0;
        const latestDateLabel = fish_latestRecordLabel(surveyTimeline.length ? surveyTimeline : displayRecords);
        return `
          <div style="background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 2px 12px rgba(15,23,42,.1);border:1px solid #e2e8f0;display:flex;flex-direction:column">
            <div style="position:relative;height:190px;overflow:hidden;background:#e5e7eb;cursor:pointer" onclick="openFishSpeciesDetail(this.dataset.species)" data-species="${fish_escape(s.species)}">
              <img src="${photo.image}" alt="${fish_escape(s.species)}"
                style="width:100%;height:100%;object-fit:cover;object-position:${fish_escape(photo.position||'center center')};transition:transform .3s"
                onerror="this.src='${fallback}'"
                onmouseover="this.style.transform='scale(1.04)'" onmouseout="this.style.transform='scale(1)'"
                onclick="event.stopPropagation();fishPhotoLightbox('${photo.image}','${fish_escape(s.species)}','${fish_escape(photo.caption||'')}')"
                title="點擊放大">
              <div style="position:absolute;bottom:8px;left:8px;background:rgba(0,0,0,.5);color:#fff;font-size:19px;border-radius:4px;padding:2px 7px;pointer-events:none">🔍 點擊放大</div>
              <div style="position:absolute;top:12px;right:12px">
                <span style="background:${ccl};color:#fff;font-size:19px;font-weight:800;padding:5px 14px;border-radius:999px;box-shadow:0 2px 8px rgba(0,0,0,.25)">${s.conservation||'一般'}</span>
              </div>
              <div style="position:absolute;top:12px;left:12px">
                <span style="background:rgba(15,23,42,.72);color:#fff;font-size:18px;padding:4px 10px;border-radius:999px">${s.family||'-'}</span>
              </div>
              ${displaySurveyCount > 1 ? `<div style="position:absolute;bottom:10px;right:12px"><span style="background:rgba(15,23,42,.72);color:#fff;font-size:20px;padding:3px 10px;border-radius:999px"><i class="fas fa-layer-group" style="margin-right:4px"></i>${displaySurveyCount} 次調查</span></div>` : ''}
            </div>
            <div style="padding:16px 18px 12px;flex:1;cursor:pointer" onclick="openFishSpeciesDetail(this.dataset.species)" data-species="${fish_escape(s.species)}">
              <div style="font-size:22px;font-weight:800;color:#0f172a;margin-bottom:4px;line-height:1.2">${fish_escape(s.species)}</div>
              <div style="font-size:19px;font-style:italic;color:#64748b;margin-bottom:12px">${fish_escape(s.scientificName||'')}</div>
              <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:12px">
                <div style="background:#f0fdfa;border-radius:8px;padding:10px 8px;text-align:center" ${s.reconciled ? `title="已核對量化電捕累計 ${displayTotal} 尾（103~114年・${displaySurveyCount}次調查，與歷年趨勢分析一致）"` : ''}>
                  <div style="font-size:26px;font-weight:900;color:#0e7490;line-height:1">${displayTotal}${s.reconciled ? '<span style="font-size:19px;color:#0e7490;vertical-align:super;margin-left:2px">✓</span>' : ''}</div>
                  <div style="font-size:20px;color:#64748b;margin-top:2px">累計尾數${s.totalSource ? '<i class="fas fa-circle-info" style="color:#0e7490;margin-left:3px;font-size:19px"></i>' : ''}</div>
                </div>
                <div style="background:#f8fafc;border-radius:8px;padding:10px 8px;text-align:center">
                  <div style="font-size:22px;font-weight:900;color:#334155;line-height:1">${displaySurveyCount}</div>
                  <div style="font-size:20px;color:#64748b;margin-top:2px">調查次數</div>
                  <div style="font-size:16px;color:#0e7490;margin-top:2px">其中 ${captureSurveyCount} 次捕獲</div>
                </div>
                <div style="background:#f8fafc;border-radius:8px;padding:10px 8px;text-align:center">
                  <div style="font-size:18px;font-weight:700;color:#0f172a;line-height:1.3">${fish_escape(latestDateLabel)}</div>
                  <div style="font-size:20px;color:#64748b;margin-top:2px">最近調查</div>
                </div>
              </div>
              <div style="font-size:19px;color:#334155;background:#f8fafc;border-left:3px solid #0e7490;padding:8px 12px;border-radius:0 6px 6px 0;line-height:1.5">
                <i class="fas fa-map-marker-alt" style="color:#0e7490;margin-right:4px"></i>${allLocs.join('、') || '-'}
              </div>
              <div style="display:flex;gap:8px;margin-top:10px">
                ${inTrend ? `
                <button onclick="event.stopPropagation();fish_jumpToTrend('${fish_escape(s.species)}')"
                  style="flex:1;padding:8px;border:1px solid #b45309;border-radius:8px;background:#fef3c7;color:#92400e;font-size:19px;font-weight:700;cursor:pointer">
                  <i class="fas fa-chart-line"></i> 歷年趨勢
                </button>` : ''}
                <button
                  data-q="橫流溪 ${fish_escape(s.species)}（${fish_escape(s.scientificName||'')}）的生態習性、族群現況（累計${displayTotal}尾 / ${displaySurveyCount}次調查）與保育建議"
                  onclick="event.stopPropagation();fish_openAIQA(this.getAttribute('data-q'))"
                  style="${inTrend ? '' : 'width:100%;'}padding:8px;border:1.5px solid #6366f1;border-radius:8px;background:#f5f3ff;color:#4f46e5;font-size:19px;font-weight:700;cursor:pointer;flex-shrink:0">
                  <i class="fas fa-robot"></i> AI問答
                </button>
              </div>
              <button type="button" aria-expanded="false" aria-controls="${cardId}_ecology"
                onclick="event.stopPropagation();fish_toggleEcology(this,'${cardId}_ecology')"
                style="width:100%;display:flex;align-items:center;justify-content:center;gap:8px;margin-top:10px;padding:9px 12px;border:1.5px solid #0f766e;border-radius:8px;background:#ecfdf5;color:#115e59;font-size:18px;font-weight:800;cursor:pointer">
                <i class="fas fa-leaf"></i>
                <span data-ecology-label>開啟生態習性</span>
                <i class="fas fa-chevron-down" data-ecology-chevron style="font-size:14px"></i>
              </button>
              ${fish_renderEcologyHabits(s.species, `${cardId}_ecology`)}
              <div style="text-align:center;margin-top:10px;color:#94a3b8;font-size:18px">
                <span id="${cardId}_hint"><i class="fas fa-up-right-from-square"></i> 點選開啟完整物種資料（${displaySurveyCount} 次調查）</span>
              </div>
            </div>
            <div id="${cardId}" style="display:none;border-top:1px solid #e2e8f0;padding:14px 18px;background:#f8fafc">
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;font-size:18px;margin-bottom:12px">
                <div><span style="color:#94a3b8">科別：</span><b>${fish_escape(s.family||'-')}</b></div>
                <div><span style="color:#94a3b8">保育等級：</span><span style="color:${ccl};font-weight:700">${fish_escape(s.conservation||'-')}${s.redlistCode?`（${s.redlistCode}）`:''}</span></div>
                <div style="grid-column:1/-1"><span style="color:#94a3b8">學名：</span><em>${fish_escape(s.scientificName||'-')}</em></div>
                ${s.redlistNote ? `<div style="grid-column:1/-1;color:#b45309;font-size:20px">ℹ ${fish_escape(s.redlistNote)}</div>` : ''}
              </div>
              ${(() => {
                const sr = Array.isArray(s.surveyRecords) ? s.surveyRecords : [];
                if (!sr.length) return '';
                const sum = sr.reduce((a, r) => a + (r.count || 0), 0);
                const ok = sum === s.totalCount;
                return `
                <div style="font-size:18px;color:#0e7490;margin-bottom:8px;font-weight:700">
                  <i class="fas fa-chart-line"></i> 完整捕獲紀錄（與「歷年趨勢分析」同步・共 ${sr.length} 次捕獲）
                </div>
                <div style="overflow-x:auto;margin-bottom:8px">
                  <table style="width:100%;border-collapse:collapse;font-size:18px">
                    <thead><tr style="background:#e0f7fa;color:#0e7490">
                      <th style="padding:6px 8px;text-align:left;border:1px solid #b2ebf2">調查場次</th>
                      <th style="padding:6px 8px;text-align:center;border:1px solid #b2ebf2">捕獲尾數</th>
                      <th style="padding:6px 8px;text-align:left;border:1px solid #b2ebf2">來源</th>
                    </tr></thead>
                    <tbody>
                      ${sr.map(r => `<tr>
                        <td style="padding:6px 8px;border:1px solid #e2e8f0;font-weight:600">${fish_escape(r.label)}</td>
                        <td style="padding:6px 8px;border:1px solid #e2e8f0;text-align:center;font-weight:800;color:#0e7490">${r.count}</td>
                        <td style="padding:6px 8px;border:1px solid #e2e8f0;color:#64748b;font-size:20px">${fish_escape(r.source)}</td>
                      </tr>`).join('')}
                      <tr style="background:#f0fdfa;font-weight:800">
                        <td style="padding:6px 8px;border:1px solid #b2ebf2;color:#0f172a">完整歷年累計</td>
                        <td style="padding:6px 8px;border:1px solid #b2ebf2;text-align:center;color:#0e7490">${sum}</td>
                        <td style="padding:6px 8px;border:1px solid #b2ebf2;font-size:20px;color:${ok?'#15803d':'#b91c1c'}">
                          ${ok ? '✓ 與卡片累計尾數一致' : `⚠ 與累計 ${s.totalCount} 不符，請檢查`}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>`;
              })()}
              <div style="font-size:18px;color:#64748b;margin:10px 0 6px;font-weight:600">
                <i class="fas fa-database"></i> 資料庫代表調查紀錄（已同步完整序列・共 ${displayRecords.length} 筆，累計 ${displayTotal} 尾）
              </div>
              <div style="display:flex;flex-direction:column;gap:8px">
                ${displayRecords.map((r,i) => `
                  <div style="background:#fff;border:1px solid #e2e8f0;border-radius:8px;padding:10px 12px">
                    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">
                      <span style="font-size:18px;font-weight:700;color:#0e7490">第 ${i+1} 筆記錄</span>
                      <span style="font-size:20px;color:#94a3b8">${fish_escape(r.date || r.label || '-')}</span>
                    </div>
                    <div style="font-size:18px;color:#334155;display:grid;grid-template-columns:1fr 1fr;gap:4px">
                      <div><span style="color:#94a3b8">尾數：</span><b style="color:#0e7490">${r.count}</b></div>
                      <div><span style="color:#94a3b8">來源：</span>${fish_escape((r.recorder || r.source || '-').replace('成果報告','').replace('生態調查','').trim())}</div>
                      <div style="grid-column:1/-1"><span style="color:#94a3b8">位置：</span>${fish_escape(r.location||'橫流溪電捕監測樣站')}</div>
                      ${r.note ? `<div style="grid-column:1/-1;font-size:20px;color:#64748b;margin-top:2px">${fish_escape(r.note)}</div>` : ''}
                    </div>
                    ${r.id ? `<div style="display:flex;gap:8px;margin-top:8px">
                      <button onclick="openFishForm(${r.id})"
                        style="flex:1;padding:6px;border:none;background:#0e7490;color:#fff;border-radius:6px;font-size:18px;font-weight:700;cursor:pointer">
                        <i class="fas fa-edit"></i> 編輯
                      </button>
                      <button onclick="deleteFish(${r.id})"
                        style="flex:1;padding:6px;border:none;background:#fee2e2;color:#b91c1c;border-radius:6px;font-size:18px;font-weight:700;cursor:pointer">
                        <i class="fas fa-trash"></i> 刪除
                      </button>
                    </div>` : ''}
                  </div>
                `).join('')}
              </div>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
  setTimeout(fish_checkCardPhotos, 150);
}

function fishCardToggle(id) {
  const panel = document.getElementById(id);
  const hint  = document.getElementById(id + '_hint');
  if (!panel) return;
  const isOpen = panel.style.display !== 'none';
  panel.style.display = isOpen ? 'none' : 'block';
  if (hint) hint.innerHTML = isOpen
    ? '<i class="fas fa-chevron-down"></i> 點選查看詳情'
    : '<i class="fas fa-chevron-up"></i> 收起詳情';
}

function openFishSpeciesDetail(speciesName) {
  const target = Object.values(fish_groupSpecies()).find(s => s.species === speciesName);
  if (!target) {
    showToast(`找不到「${speciesName || '未命名物種'}」資料`, 'warning');
    return;
  }

  const photo = fish_photoFor(target);
  const cMap = { '瀕危':['#b91c1c','#fee2e2'], '易危':['#d97706','#fef9c3'], '近危':['#2563eb','#dbeafe'], '一般':['#16a34a','#dcfce7'] };
  const [ccl, cbg] = cMap[target.conservation] || ['#475569','#f1f5f9'];
  const records = (target.records || []).slice().sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
  const surveyRecords = Array.isArray(target.surveyRecords) ? target.surveyRecords : [];
  const surveyTimeline = Array.isArray(target.surveyTimeline) ? target.surveyTimeline : [];
  const surveySum = surveyRecords.reduce((sum, row) => sum + (Number(row.count) || 0), 0);
  const dbDisplayRecords = fish_canonicalDetailRecords(target.species, records, surveyRecords);
  const dbSum = fish_recordSum(dbDisplayRecords);
  const adoptedTotal = surveySum || Number(target.totalCount) || dbSum || 0;
  const effectiveSurveyCount = surveyTimeline.length || dbDisplayRecords.length || target.surveys || 0;
  const latestDateLabel = fish_latestRecordLabel(surveyTimeline.length ? surveyTimeline : dbDisplayRecords);
  const allLocs = [...new Set(records.map(r => r.location).filter(Boolean))];
  const trendSet = new Set(['臺灣白甲魚','臺灣石魚賓','臺灣鬚鱲','纓口臺鰍','臺灣間爬岩鰍','明潭吻鰕虎','短臀瘋鱨','短吻紅斑吻鰕虎']);

  const modal = document.getElementById('modal');
  if (modal) {
    modal.style.width = 'min(1120px, 94vw)';
    modal.style.maxWidth = '1120px';
    modal.style.maxHeight = '92vh';
  }

  document.getElementById('modalTitle').innerHTML = `
    <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
      <span style="font-size:22px;font-weight:900;color:#0f172a">${fish_escape(target.species)}</span>
      <span style="background:${cbg};color:${ccl};border:1px solid ${ccl}44;border-radius:999px;padding:4px 12px;font-size:18px;font-weight:800">
        ${fish_escape(target.conservation || '一般')}${target.redlistCode ? `（${fish_escape(target.redlistCode)}）` : ''}
      </span>
    </div>
  `;

  const fullSurveyHtml = surveyTimeline.length ? `
    <div style="border:1px solid #b2ebf2;border-radius:12px;overflow:hidden;background:#fff">
      <div style="padding:12px 14px;background:#ecfeff;border-bottom:1px solid #b2ebf2;display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap">
        <div style="font-size:19px;font-weight:900;color:#0e7490"><i class="fas fa-chart-line"></i> 已核對捕獲紀錄</div>
        <div style="font-size:18px;color:#0f766e;font-weight:800">完成 ${surveyTimeline.length} 次調查，其中 ${surveyRecords.length} 次捕獲，累計 ${surveySum} 尾</div>
      </div>
      <div style="overflow-x:auto">
        <table style="width:100%;border-collapse:collapse;font-size:18px">
          <thead>
            <tr style="background:#f8fafc;color:#334155">
              <th style="padding:9px 10px;text-align:left;border-bottom:1px solid #e2e8f0">調查場次</th>
              <th style="padding:9px 10px;text-align:center;border-bottom:1px solid #e2e8f0">尾數</th>
              <th style="padding:9px 10px;text-align:left;border-bottom:1px solid #e2e8f0">資料來源</th>
              <th style="padding:9px 10px;text-align:left;border-bottom:1px solid #e2e8f0">備註摘要</th>
            </tr>
          </thead>
          <tbody>
            ${surveyRecords.map(row => `
              <tr>
                <td style="padding:9px 10px;border-bottom:1px solid #edf2f7;font-weight:700;color:#0f172a">${fish_escape(row.label || '-')}</td>
                <td style="padding:9px 10px;border-bottom:1px solid #edf2f7;text-align:center;font-weight:900;color:#0e7490">${Number(row.count) || 0}</td>
                <td style="padding:9px 10px;border-bottom:1px solid #edf2f7;color:#475569">${fish_escape(row.source || '橫流溪電捕監測')}</td>
                <td style="padding:9px 10px;border-bottom:1px solid #edf2f7;color:#64748b;line-height:1.5">${fish_escape(String(row.note || '').split('；').slice(0, 2).join('；') || '-')}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      <div style="padding:10px 14px;background:#f8fafc;color:#475569;font-size:17px;line-height:1.65;border-top:1px solid #e2e8f0">
        <i class="fas fa-circle-info" style="color:#0e7490"></i>
        本表只列有捕獲的場次；完成調查但未捕獲者仍計入調查次數。未建檔年度不補成 0 尾。
      </div>
    </div>
  ` : `
    <div style="border:1px dashed #cbd5e1;border-radius:12px;padding:14px;background:#f8fafc;color:#64748b;line-height:1.7">
      <b style="color:#334155">完整歷年序列尚未建置：</b>
      目前改以資料庫代表紀錄呈現，避免點閱後出現空白；後續可再依報告書補齊逐次調查資料。
    </div>
  `;

  const dbRecordsHtml = records.length ? `
    <div style="border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;background:#fff">
      <div style="padding:12px 14px;background:#f8fafc;border-bottom:1px solid #e2e8f0;display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap">
        <div style="font-size:19px;font-weight:900;color:#0f172a"><i class="fas fa-database"></i> 資料庫代表調查紀錄</div>
        <div style="font-size:18px;color:#64748b">共 ${dbDisplayRecords.length} 筆，累計 ${dbSum} 尾</div>
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:10px;padding:12px">
        ${dbDisplayRecords.map((row, idx) => `
          <div style="border:1px solid #e2e8f0;border-left:4px solid ${ccl};border-radius:10px;padding:11px 12px;background:#fff">
            <div style="display:flex;justify-content:space-between;gap:8px;margin-bottom:8px">
              <b style="color:#0f172a">第 ${idx + 1} 筆</b>
              <span style="color:#64748b;font-size:20px">${fish_escape(row.date || row.label || '-')}</span>
            </div>
            <div style="font-size:18px;line-height:1.7;color:#334155">
              <div><span style="color:#94a3b8">尾數：</span><b style="color:#0e7490">${Number(row.count) || 0}</b></div>
              <div><span style="color:#94a3b8">位置：</span>${fish_escape(row.location || '橫流溪電捕監測樣站')}</div>
              <div><span style="color:#94a3b8">方法：</span>${fish_escape(row.method || '電捕')}</div>
              <div><span style="color:#94a3b8">來源：</span>${fish_escape((row.recorder || row.source || '-').replace('成果報告', '').replace('生態調查', '').trim())}</div>
              ${row.note ? `<div style="margin-top:7px;background:#f8fafc;border-radius:8px;padding:8px;color:#475569">${fish_escape(row.note)}</div>` : ''}
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  ` : `
    <div style="border:1px dashed #cbd5e1;border-radius:12px;padding:14px;background:#fff;color:#64748b">尚無資料庫代表紀錄。</div>
  `;

  document.getElementById('modalBody').innerHTML = `
    <div style="display:grid;grid-template-columns:280px 1fr;gap:18px;align-items:start">
      <div style="position:sticky;top:0">
        <div style="border-radius:14px;overflow:hidden;background:#e5e7eb;border:1px solid #e2e8f0;box-shadow:0 2px 12px rgba(15,23,42,.08)">
          <img src="${photo.image}" alt="${fish_escape(target.species)}" style="width:100%;height:210px;object-fit:cover;object-position:${fish_escape(photo.position || 'center center')}" onerror="this.src='/webapp/assets/fish-photos/field-measurement.jpg'">
          <div style="padding:12px;background:#fff">
            <div style="font-size:18px;font-weight:900;color:#0f172a">${fish_escape(target.species)}</div>
            <div style="font-size:18px;color:#64748b;font-style:italic;margin-top:2px">${fish_escape(target.scientificName || '-')}</div>
            <div style="font-size:20px;color:#64748b;margin-top:8px;line-height:1.6"><i class="fas fa-camera"></i> ${fish_escape(photo.source || '魚類調查影像')}</div>
          </div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:12px">
          <div style="background:#f0fdfa;border:1px solid #ccfbf1;border-radius:10px;padding:10px;text-align:center">
            <div style="font-size:24px;font-weight:900;color:#0e7490">${adoptedTotal}</div>
            <div style="font-size:20px;color:#64748b">累計尾數</div>
          </div>
          <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:10px;text-align:center">
            <div style="font-size:24px;font-weight:900;color:#334155">${effectiveSurveyCount}</div>
            <div style="font-size:20px;color:#64748b">有效調查</div>
          </div>
        </div>
      </div>

      <div style="display:flex;flex-direction:column;gap:14px">
        <div style="background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:14px 16px">
          <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;font-size:19px;color:#334155">
            <div><span style="color:#94a3b8">科別：</span><b>${fish_escape(target.family || '-')}</b></div>
            <div><span style="color:#94a3b8">最近調查：</span><b>${fish_escape(latestDateLabel)}</b></div>
            <div style="grid-column:1/-1"><span style="color:#94a3b8">主要分布：</span>${fish_escape(allLocs.join('、') || target.location || '-')}</div>
            <div style="grid-column:1/-1"><span style="color:#94a3b8">資料口徑：</span>${fish_escape(target.totalSource || '資料庫代表紀錄')}</div>
            <div style="grid-column:1/-1;background:#f0fdfa;border:1px solid #99f6e4;border-radius:10px;padding:10px 12px;line-height:1.7">
              <b style="color:#0f766e">數據核對：</b>
              已核對量化序列 ${surveySum} 尾（完成 ${surveyTimeline.length} 次調查、其中 ${surveyRecords.length} 次捕獲）；
              資料庫代表調查紀錄 ${dbSum} 尾（${dbDisplayRecords.length} 筆）；
              本頁採用累計 ${adoptedTotal} 尾。
              ${surveySum === dbSum && dbSum === adoptedTotal ? '<span style="color:#15803d;font-weight:900"> 已一致。</span>' : '<span style="color:#b45309;font-weight:900"> 請優先檢核來源表。</span>'}
            </div>
            ${target.redlistNote ? `<div style="grid-column:1/-1;color:#b45309;background:#fffbeb;border-radius:8px;padding:8px 10px">${fish_escape(target.redlistNote)}</div>` : ''}
          </div>
        </div>
        ${fish_renderEcologyHabitsPlain(target.species)}
        ${fish_renderLiterature(target.species)}
        ${fullSurveyHtml}
        ${dbRecordsHtml}
      </div>
    </div>
  `;

  document.getElementById('modalFooter').innerHTML = `
    <button class="btn btn-outline" onclick="closeModal()">關閉</button>
    ${trendSet.has(target.species) ? `<button class="btn btn-outline" onclick="closeModal();fish_jumpToTrend('${fish_escape(target.species)}')"><i class="fas fa-chart-line"></i> 查看歷年趨勢</button>` : ''}
    <button class="btn btn-primary"
      data-q="橫流溪 ${fish_escape(target.species)}（${fish_escape(target.scientificName || '')}）的族群現況、棲地需求與管理建議"
      onclick="fish_openAIQA(this.getAttribute('data-q'))"><i class="fas fa-robot"></i> AI問答</button>
  `;
  openModal();
}

/* ── 依物種名稱推算相對位置描述 ── */
function fish_locationDetail(f) {
  const facs = DB.getAll('facilities');
  // 依 location 關鍵字比對里程區段
  const loc = f.location || '';
  let stationKm = '', nearFac = '', updown = '';

  // 關鍵字 → 里程對應
  const kmMap = [
    { kw: ['0K+460','溪構8','之字'], km: '0K+460', fac: '溪構8-2（之字形魚道）', twd97: 'TWD97 X:240716, Y:2674967' },
    { kw: ['0K+510','溪構11','固床工'], km: '0K+510', fac: '溪構11（階梯式固床工）', twd97: 'TWD97 X:240716, Y:2675013' },
    { kw: ['0K+560','溪構7'], km: '0K+560', fac: '溪構7（降壩魚道）', twd97: 'TWD97 X:240704, Y:2675063' },
    { kw: ['0K+740','溪構6'], km: '0K+740', fac: '溪構6（階段式魚道）', twd97: 'TWD97 X:240785, Y:2675146' },
    { kw: ['1K+000','溪構5','1K'], km: '1K+000', fac: '溪構5-1/5-2（防砂壩/潛越式魚道）', twd97: 'TWD97 X:240812, Y:2675353' },
    { kw: ['1K+170','溪構4'], km: '1K+170', fac: '溪構4（階段式魚道）', twd97: 'TWD97 X:240832, Y:2675493' },
    { kw: ['1K+225','溪構3'], km: '1K+225', fac: '溪構3（斜坡式魚道）', twd97: 'TWD97 X:240873, Y:2675532' },
    { kw: ['1K+265','溪構9'], km: '1K+265', fac: '溪構9（固床工）', twd97: 'TWD97 X:240858, Y:2675575' },
    { kw: ['1K+315','溪構2'], km: '1K+315', fac: '溪構2（階段式魚道）', twd97: 'TWD97 X:240819, Y:2675607' },
    { kw: ['1K+400','溪構1'], km: '1K+400', fac: '溪構1-1/1-2（粗石斜曲面/舟通式魚道）', twd97: 'TWD97 X:240786, Y:2675695' },
  ];
  const matched = kmMap.find(m => m.kw.some(k => loc.includes(k)));
  if (matched) {
    stationKm = matched.km;
    nearFac = matched.fac;
    updown = loc.includes('上游') ? '上游' : loc.includes('下游') ? '下游' : '附近';
  }

  // 河段分類
  let segment = '';
  if (loc.includes('全流域') || loc.includes('全')) segment = '橫流溪全流域（0K+460～1K+400）';
  else if (loc.includes('上游') || (stationKm && parseFloat(stationKm) >= 1)) segment = '橫流溪上游段（1K+000以上）';
  else if (loc.includes('中游')) segment = '橫流溪中游段（0K+560～1K+000）';
  else if (loc.includes('下游') || (stationKm && parseFloat(stationKm) < 0.6)) segment = '橫流溪下游段（0K+460以下）';
  else segment = '橫流溪中段（0K+460～1K+400）';

  return { stationKm, nearFac, updown, segment };
}

function renderFishSpecies() {
  const species = fish_groupSpecies();

  document.getElementById('fishTabContent').innerHTML = `
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:16px">
      ${Object.values(species).map(s => {
        const colorMap = { '瀕危': '#f44336', '易危': '#ff9800', '近危': '#00bcd4', '一般': '#4caf50' };
        const color = colorMap[s.conservation] || '#9e9e9e';
        const loc = fish_locationDetail(s);
        const photo = fish_photoFor(s);
        return `
          <div class="card" style="margin:0;border-left:4px solid ${color}">
            <div class="fish-card-photo" style="background-image:url('${photo.image}');background-position:${fish_escape(photo.position || 'center center')};cursor:pointer" data-photo-src="${photo.image}"
              onclick="fishPhotoLightbox('${photo.image}','${fish_escape(s.species)}','${fish_escape(photo.caption||'')}')" title="點擊放大">
              <div class="fish-card-photo-caption">${fish_escape(photo.caption)}</div>
              <div style="position:absolute;top:8px;right:8px;background:rgba(0,0,0,.45);color:#fff;font-size:11px;border-radius:4px;padding:2px 7px">🔍</div>
            </div>
            <div class="card-body">
              <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
                <i class="fas fa-fish" style="color:${color};font-size:18px"></i>
                <div>
                  <div class="fw-600" style="font-size:15px">${s.species}</div>
                  <div style="font-style:italic;color:var(--text-light);font-size:12px">${s.scientificName || ''}</div>
                </div>
              </div>
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;font-size:12px;margin-bottom:8px">
                <div><span class="text-muted">科別：</span>${s.family || '-'}</div>
                <div><span class="text-muted">特有性：</span>${s.endemic ? '臺灣特有種' : '原生種'}</div>
                <div><span class="text-muted">累計尾數：</span><strong>${s.totalCount}</strong></div>
                <div><span class="text-muted">調查次數：</span>${s.surveys}</div>
              </div>
              <!-- 保育狀態與本河段現況分列：兩者尺度不同，不可互相推論 -->
              <div style="display:grid;gap:6px;margin-bottom:10px">
                <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:7px 9px">
                  <div style="font-size:10.5px;color:#64748b;font-weight:700;margin-bottom:3px">
                    保育／受威脅狀態（全臺族群尺度）</div>
                  <div style="font-size:12.5px;color:#0f172a;font-weight:800">
                    ${s.redlistCode === 'NNT' ? '接近受脅' : s.conservation}${s.redlistCode ? `（${s.redlistCode}）` : ''}
                    <span style="font-size:10.5px;color:#64748b;font-weight:400">
                      ‧ 依 2024 臺灣淡水魚類紅皮書名錄「國家類別」${s.redlistCode === 'NNT' ? '；即 IUCN 中譯之「近危」' : ''}</span>
                  </div>
                </div>
                ${(() => { const pr = fish_hlxPresence(s.species); return pr ? `
                <div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:8px;padding:7px 9px">
                  <div style="font-size:10.5px;color:#0369a1;font-weight:700;margin-bottom:3px">
                    橫流溪調查現況（本河段尺度）</div>
                  <div style="font-size:12.5px;color:${pr.tone};font-weight:800">${pr.label}
                    <span style="font-size:10.5px;color:#475569;font-weight:400">
                      ‧ ${pr.years} 個建檔年度中有 ${pr.hitYears} 年記錄到，占歷年捕獲 ${pr.share.toFixed(1)}%</span>
                  </div>
                </div>` : ''; })()}
              </div>

              <!-- 位置描述區塊 -->
              <div style="background:#f0f7f4;border-left:3px solid #1a6b3c;border-radius:0 6px 6px 0;padding:8px 10px;font-size:11.5px;line-height:1.75;color:#333;margin-bottom:8px">
                <div style="font-weight:700;color:#1a6b3c;margin-bottom:3px">📍 物種位置資訊</div>
                <div><b>溪流位置：</b>${loc.segment}</div>
                ${loc.stationKm ? `<div><b>鄰近里程：</b>${loc.stationKm} ${loc.updown ? loc.updown + '側' : ''}</div>` : ''}
                ${loc.nearFac ? `<div><b>鄰近設施：</b>${loc.nearFac}</div>` : ''}
                <div><b>發現位置：</b>${s.location}</div>
                ${loc.nearFac ? `<div style="color:#777;font-size:10.5px;margin-top:2px">📐 ${kmMap_twd97(loc.stationKm)}</div>` : ''}
              </div>

              ${s.note ? `<div style="font-size:12px;color:var(--text-muted);padding:6px 8px;background:var(--surface2);border-radius:4px;line-height:1.6">${s.note}</div>` : ''}
              <div style="font-size:11px;color:#64748b;margin-top:8px"><i class="fas fa-camera"></i> ${fish_escape(photo.source)}</div>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
    // 照片載入失敗時退回備援 jpg
  setTimeout(fish_checkCardPhotos, 150);
}

// 檢查魚類卡片及新聞卡背景圖，若載入失敗則退回 field-measurement.jpg
function fish_checkCardPhotos() {
  const fallback = '/webapp/assets/fish-photos/field-measurement.jpg';
  document.querySelectorAll('[data-photo-src]').forEach(el => {
    const src = el.getAttribute('data-photo-src') || '';
    if (!src || src === fallback) return;
    const probe = new Image();
    probe.onerror = function() {
      el.style.backgroundImage = `url('${fallback}')`;
    };
    probe.src = src;
  });
}

/* ── 生態新聞資料 ─────────────────────────────────────────────── */
const ECO_NEWS = [
  {
    tag: '橫流溪專題',
    tagColor: '#0d6b5b',
    tagBg: '#ccfbf1',
    title: '林保署復育橫流溪打造9座生物通道　防災與生態共存',
    source: '中央社',
    date: '2026-08-28',
    summary: '林業及自然保育署臺中分署在橫流溪建置 9 座不同型態生物通道，歷經十餘年優化維護。'
           + '因 1970 年代大甲溪流域採石作業造成河川環境失衡，多次颱風引發山崩土石流，'
           + '遂興建防砂壩與固床工，並以粗石斜曲面魚道（全斷面設計）、'
           + '改良型「魚骨狀」舟通式魚道（長 40 公尺、流速低於每秒 1.5 公尺）'
           + '及階段式魚道（階梯水池）兼顧防災與生態。'
           + '報導載明曾記錄體長 27.8 公分的臺灣白甲魚成功躍過構造物完成溯游，各座魚道均有魚類利用紀錄。',
    url: 'https://www.cna.com.tw/news/ahel/202608280145.aspx',
    icon: 'fa-fish'
  },
  {
    tag: '棲地復育',
    tagColor: '#166534',
    tagBg: '#dcfce7',
    title: '實踐防災與生態共存　林業保育署臺中分署復育橫流溪棲地有成',
    source: '蕃新聞（轉載中央社）',
    date: '2026-08-28',
    summary: '同日中央社稿之轉載版本，補充監測到 9 種本土魚類成功利用生物通道：'
           + '臺灣石魚賓、臺灣白甲魚、臺灣鬚鱲、纓口臺鰍、臺灣間爬岩鰍、明潭吻鰕虎、'
           + '粗首馬口鱲、短臀瘋鱨、短吻紅斑吻鰕虎，並提及臺8線沿線與國產材動物通道之運用。'
           + '註：本平台量化序列以 8 種發布物種呈現，粗首馬口鱲因可稽核尾數不足已另行標註，'
           + '故報導之 9 種與平台之 8 種係統計口徑差異，非資料矛盾。',
    url: 'https://n.yam.com/Article/20260828799640',
    icon: 'fa-water'
  },
  {
    tag: '直接報導',
    tagColor: '#0369a1',
    tagBg: '#dbeafe',
    title: '魚類天堂！大雪山橫流溪 設國內首座「粗石斜曲面魚道」',
    source: '自由時報',
    date: '生態工程報導',
    summary: '橫流溪貫穿大雪山山脈，水質清澈穩定。林務局東勢林區管理處在此設置國內首座「粗石斜曲面魚道」，以仿自然工法營造無阻隔溯游環境，讓魚類得以自由洄游，大幅改善河川生態連通性。',
    url: 'https://news.ltn.com.tw/news/life/breakingnews/1721243',
    icon: 'fa-fish'
  },
  {
    tag: 'ESG企業合作',
    tagColor: '#4338ca',
    tagBg: '#e0e7ff',
    title: '林業臺中分署攜手第一銀行　橫流溪畔植千株原生樹',
    source: '台灣好新聞',
    date: '2024-04-13',
    summary: '林業及自然保育署臺中分署與第一銀行連續第三年合作造林，2024年4月13日由雙方員工、眷屬與主管於臺中市和平區南勢里橫流溪畔種植逾 1,000 株原生楓香（Liquidambar formosana）。'
           + '雙方自 2022 年起合作，由高美濕地海岸棲地復育延伸至山區林班地，累計造林 4.78 公頃、種植原生樹種逾 5,000 株。'
           + '植樹地點海拔約 500 公尺，水流穩定、溪畔植生完整，兼顧四季山林景觀與未來段木香菇培育所需之段木供應。'
           + '計畫呼應聯合國永續發展目標（SDGs），提供固碳、涵養水源、保護土壤與維護野生動物棲地等生態系服務。',
    url: 'https://www.taiwanhot.net/news/1064875/%E6%9E%97%E6%A5%AD%E8%87%BA%E4%B8%AD%E5%88%86%E7%BD%B2%E6%94%9C%E6%89%8B%E7%AC%AC%E4%B8%80%E9%8A%80%E8%A1%8C+%E6%A8%AA%E6%B5%81%E6%BA%AA%E7%95%94%E6%A4%8D%E5%8D%83%E6%A0%AA%E5%8E%9F%E7%94%9F%E6%A8%B9',
    icon: 'fa-seedling'
  },
  {
    tag: '植生復育',
    tagColor: '#15803d',
    tagBg: '#dcfce7',
    title: '林業署用科技守護德基水庫 無人機結合原生植生復育崩塌地',
    source: '自由時報',
    date: '2026',
    summary: '林業及自然保育署台中分署在大甲溪事業區導入無人機空中撒播原生植物種子（五節芒、台灣赤楊等），復育面積達1.7公頃，結合NDVI植生指數分析，大幅降低施工風險與環境擾動，為橫流溪周邊集水區植生保育提供重要參考。',
    url: 'https://news.ltn.com.tw/news/life/breakingnews/5457457',
    icon: 'fa-seedling'
  },
  {
    tag: '生態復育',
    tagColor: '#b45309',
    tagBg: '#fef3c7',
    title: '大甲溪生態浩劫 復育迫在眉睫',
    source: '環境資訊中心',
    date: '環境監測報導',
    summary: '大甲溪曾遭砂石場污染，溪中生物受重創。農委會與水利署隨即啟動生態復育計畫，透過棲地改善與物種復育雙管齊下，大甲溪上游支流橫流溪因人為干擾較少，成為復育成效的重要對照指標。',
    url: 'https://e-info.org.tw/node/69763',
    icon: 'fa-seedling'
  },
  {
    tag: '原生魚保育',
    tagColor: '#7c3aed',
    tagBg: '#f5f3ff',
    title: '臺灣原生魚的守護者——溪流魚類保育教育專訪',
    source: '科學月刊',
    date: '保育專訪',
    summary: '臺灣擁有80多種原生淡水魚類，其中40多種為特有種，約1/5生存受到威脅。橫流溪記錄的臺灣白甲魚、纓口臺鰍均屬高保育價值物種，保育工作包含魚道建設、棲地修復與長期監測。',
    url: 'https://www.scimonth.com.tw/archives/246',
    icon: 'fa-microscope'
  },
  {
    tag: '棲地威脅',
    tagColor: '#dc2626',
    tagBg: '#fee2e2',
    title: '被迫搬家的台灣細鯿 原生淡水魚命運悲歌',
    source: '環境資訊中心',
    date: '物種保育報導',
    summary: '棲地破壞、外來種入侵與河道阻隔是臺灣原生魚類面臨的三大威脅。橫流溪的魚道工程正是針對「河道阻隔」的解方，讓苦花、石魚賓等原生魚種能夠自由遷徙，維繫族群遺傳多樣性。',
    url: 'https://e-info.org.tw/node/206878',
    icon: 'fa-triangle-exclamation'
  },
  {
    tag: '保育立法',
    tagColor: '#166534',
    tagBg: '#dcfce7',
    title: '林務局預告6種1屬淡水魚列保育類 溪流細鯽成魚不到200尾',
    source: '農傳媒',
    date: '保育政策報導',
    summary: '農業部林務局宣布新增6種1屬淡水魚為保育類，反映臺灣溪流魚類保育的迫切性。橫流溪所記錄的瀕危物種（臺灣白甲魚・纓口臺鰍）與本次政策背景高度相關，長期監測資料具重要參考價值。',
    url: 'https://www.agriharvest.tw/archives/96371',
    icon: 'fa-shield'
  },
  {
    tag: '官方政策',
    tagColor: '#0c4a6e',
    tagBg: '#e0f2fe',
    title: '台灣地區淡水魚調查現況及保育策略',
    source: '農業部全球資訊網',
    date: '官方政策文件',
    summary: '農業部公布臺灣淡水魚類調查現況與保育策略，強調以系統性調查、棲地保護及族群監測作為主軸。橫流溪的長期魚類記錄（109–114年）正是官方建議保育策略的具體實踐案例。',
    url: 'https://www.moa.gov.tw/ws.php?id=23539',
    icon: 'fa-building-columns'
  }
];

function renderFishNews() {
  const species = Object.values(fish_groupSpecies());
  const totalCount = species.reduce((sum, item) => sum + (Number(item.totalCount) || 0), 0);
  const protectedCount = species.filter(item => item.conservation && item.conservation !== '一般').length;
  document.getElementById('fishTabContent').innerHTML = `
    <!-- ══ 生態改善新聞區 ══ -->
    <div style="margin-top:32px">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:6px">
        <div style="width:5px;height:36px;background:linear-gradient(180deg,#0369a1,#0f766e);border-radius:4px;flex-shrink:0"></div>
        <div>
          <div style="font-size:22px;font-weight:900;color:#0f172a;line-height:1.1">生態改善・媒體報導</div>
          <div style="font-size:18px;color:#64748b;margin-top:3px">橫流溪及大甲溪流域相關報導・保育政策・學術研究</div>
        </div>
      </div>

      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(340px,1fr));gap:16px;margin-top:18px">
        ${ECO_NEWS.map(n => `
          <a href="${n.url}" target="_blank" rel="noopener"
             style="text-decoration:none;display:flex;flex-direction:column;background:#fff;
               border-radius:14px;border:1px solid #e2e8f0;overflow:hidden;
               box-shadow:0 2px 10px rgba(15,23,42,.07);transition:box-shadow .2s,transform .2s;
               cursor:pointer"
             onmouseover="this.style.boxShadow='0 8px 28px rgba(15,23,42,.15)';this.style.transform='translateY(-3px)'"
             onmouseout="this.style.boxShadow='0 2px 10px rgba(15,23,42,.07)';this.style.transform='translateY(0)'">
            <!-- 色條 header -->
            <div style="background:${n.tagBg};border-bottom:3px solid ${n.tagColor};
                 padding:14px 18px;display:flex;align-items:center;gap:12px">
              <div style="width:44px;height:44px;border-radius:50%;background:${n.tagColor};
                   display:flex;align-items:center;justify-content:center;flex-shrink:0;
                   box-shadow:0 2px 8px ${n.tagColor}55">
                <i class="fas ${n.icon}" style="color:#fff;font-size:18px"></i>
              </div>
              <div>
                <span style="background:${n.tagColor};color:#fff;border-radius:6px;
                  padding:2px 10px;font-size:20px;font-weight:800;letter-spacing:.5px">${n.tag}</span>
                <div style="font-size:20px;color:#64748b;margin-top:4px">
                  <i class="fas fa-newspaper" style="font-size:19px"></i> ${n.source}
                  <span style="margin-left:8px"><i class="fas fa-calendar-alt" style="font-size:19px"></i> ${n.date}</span>
                </div>
              </div>
            </div>
            <!-- 內文 -->
            <div style="padding:16px 18px 18px;flex:1;display:flex;flex-direction:column;gap:8px">
              <div style="font-size:20px;font-weight:800;color:#0f172a;line-height:1.45">${n.title}</div>
              <div style="font-size:19px;color:#374151;line-height:1.7;flex:1">${n.summary}</div>
              <div style="display:flex;align-items:center;gap:6px;margin-top:4px;
                   color:${n.tagColor};font-size:18px;font-weight:700">
                <i class="fas fa-arrow-up-right-from-square" style="font-size:20px"></i> 閱讀完整報導
              </div>
            </div>
          </a>`).join('')}
      </div>
    </div>
  `;
  setTimeout(fish_checkCardPhotos, 150);
}

// ════════════════════════════════════════════════════════════════════════════
//  魚類資料「單一真實來源」— 統籌核對：水域生物 ↔ 歷年趨勢分析
//  ----------------------------------------------------------------------------
//  下列累計尾數＝目前已完成逐筆核對的量化電捕調查序列逐筆合計，
//  與 renderFishTrend() 的 SURVEYS 為同一組權威數據。不同計畫若採樣範圍不同，
//  以 source、scope、stations 保留原始口徑，不把空白年度直接當成 0 尾。
//  來源：107~108年成果報告表4-16、110年成效追蹤表5-3、111~114年溪魚調查表。
//
//  ⚠ 落差說明：生態資料庫「水域生物」過去以 DB.fish 之「代表性快照記錄」加總，
//     每物種僅載入少數幾筆（如臺灣間爬岩鰍只有 103基線8 + 107報告26 + 110追蹤2 = 36 尾），
//     並非完整歷年序列；歷年趨勢分析則採全 41 次調查（間爬岩鰍實際累計 144 尾）。
//     故同一物種可能出現代表快照與完整累計不一致。本常數將兩者統一至完整序列。
//     ※ renderFishTrend() 執行時會即時重算 SURVEYS 並於 console 警示任何不一致。
// ════════════════════════════════════════════════════════════════════════════
//  ★ 唯一真實來源：已核對量化電捕調查序列。歷年趨勢分析、水域生物
//    清單、卡片累計尾數、每筆魚種展開明細，全部由此單一陣列推導，數據必然同步。
//    來源：107~108成果報告 表4-16、110年魚道生態廊道成效追蹤 表5-3、麗陽站監測。
const HLX_FISH_KEY_NAME = {
  bai:'臺灣白甲魚', shi:'臺灣石魚賓', xu:'臺灣鬚鱲', ying:'纓口臺鰍',
  jian:'臺灣間爬岩鰍', min:'明潭吻鰕虎', kou:'粗首馬口鱲', feng:'短臀瘋鱨', hong:'短吻紅斑吻鰕虎'
};
// ★ 發布層魚種鍵（單一事實來源）。粗首馬口鱲已自資料庫下架，不得計入任何
//   年度統計、物種數、CPUE 或魚道關聯指標；原始資料列仍保留 kou 欄供稽核追查。
const HLX_FISH_KEYS = Object.keys(HLX_FISH_KEY_NAME).filter(fish_isPublishedSpecies_byKey);
function fish_isPublishedSpecies_byKey(key) {
  return fish_isPublishedSpecies(HLX_FISH_KEY_NAME[key]);
}
const fish_sumKeys = row => HLX_FISH_KEYS.reduce((a, k) => a + (Number(row[k]) || 0), 0);
const HLX_FISH_SURVEYS = [
  // label, year, 白甲魚, 石魚賓, 鬚鱲, 纓口臺鰍, 間爬岩鰍, 明潭吻鰕虎, 粗首馬口鱲, 短臀瘋鱨, 短吻紅斑吻鰕虎, note
  // ── 103年：魚道建置前基線（東勢林區管理處麗陽站溪流魚類監測，橫流溪下游1站）──
  // 2026-08 更正：原僅收錄 Q1、Q4 兩季且白甲魚記為 0，與原始調查表不符。
  // 依「02_魚類與棲地資料庫/施工前魚類調查/10303、10306、10309、10311橫流溪(下)調查.docx」
  // 逐尾清點，四季分別為 30、24、41、32 尾，全年 127 尾；原始表以舊名「臺灣鏟頷魚」
  // 記錄臺灣白甲魚，前次解析未對應該異體字而誤判為 0。
  // 另經「附錄二橫流溪魚類資源監測調查成果表(93~106年)」交叉驗證：103 年四季均記錄
  // 臺灣白甲魚與臺灣間爬岩鰍，Q3 另有纓口臺鰍，與逐尾清點結果一致。
  { label:'103年 Q1\n(3月)',  year:2014, m:3,  bai:18, shi:4,  xu:0,  ying:0, jian:8, min:0, kou:0, feng:0, hong:0, stations:1, scope:'橫流溪下游', source:'103年度橫流溪下游原始調查表', note:'電捕法，橫流溪(下游)；魚道建置前基準；逐尾清點 30 尾（10303原始表）', preConstruct:true },
  { label:'103年 Q2\n(6月)',  year:2014, m:6,  bai:11, shi:5,  xu:0,  ying:0, jian:8, min:0, kou:0, feng:0, hong:0, stations:1, scope:'橫流溪下游', source:'103年度橫流溪下游原始調查表', note:'電捕法，橫流溪(下游)；逐尾清點 24 尾（10306原始表）', preConstruct:true },
  { label:'103年 Q3\n(9月)',  year:2014, m:9,  bai:18, shi:21, xu:0,  ying:1, jian:1, min:0, kou:0, feng:0, hong:0, stations:1, scope:'橫流溪下游', source:'103年度橫流溪下游原始調查表', note:'電捕法，橫流溪(下游)；逐尾清點 41 尾（10309原始表）；附錄二同季亦記錄纓口臺鰍', preConstruct:true },
  { label:'103年 Q4\n(11月)', year:2014, m:11, bai:16, shi:13, xu:0,  ying:0, jian:3, min:0, kou:0, feng:0, hong:0, stations:1, scope:'橫流溪下游', source:'103年度橫流溪下游原始調查表', note:'電捕法，橫流溪(下游)；逐尾清點 32 尾（10311原始表）', preConstruct:true },
  // ── 104年：上下游各1站、四季完整（下游麗陽站／上游鞍馬山站）──────────
  // 2026-08 更新：依「東勢林區管理處105年度森林溪流魚類監測調查成果報告3.doc」
  // 表 9～13（欄位：溪流名稱｜調查時間｜魚種(數量)｜平均體長｜平均體重｜調查站別）
  // 逐筆拆出上下游分站尾數，原本 4 筆「上下游合計」列改為 8 筆分站列。
  // 年度總計 221 尾、6 物種、8 站訪次均與拆分前一致，僅解析度提高，
  // 使 104 年得以納入「下游固定單站」的同站可比序列。
  // 舊名對應：臺灣爬岩鰍＝臺灣間爬岩鰍。Q3 上游明潭吻鰕虎 4 尾為魚道建置前紀錄。
  { label:'104年 Q1\n(2/25下游)', year:2015, m:2, d:25, bai:17, shi:19, xu:6, ying:6, jian:3, min:0, kou:0, feng:0, hong:0, stations:1, scope:'橫流溪下游', source:'105年度成果報告表9（麗陽站）', dataStatus:'observed', note:'104/02/25 麗陽站；合計 51 尾', preConstruct:true },
  { label:'104年 Q1\n(3/25上游)', year:2015, m:3, d:25, bai:24, shi:0, xu:0, ying:0, jian:0, min:0, kou:0, feng:0, hong:0, stations:1, scope:'橫流溪上游', source:'105年度成果報告表9（鞍馬山站）', dataStatus:'observed', note:'104/03/25 鞍馬山站；僅記錄臺灣白甲魚 24 尾', preConstruct:true },
  { label:'104年 Q2\n(6/08下游)', year:2015, m:6, d:8, bai:14, shi:14, xu:0, ying:1, jian:6, min:0, kou:0, feng:0, hong:0, stations:1, scope:'橫流溪下游', source:'105年度成果報告表10（麗陽站）', dataStatus:'observed', note:'104/06/08 麗陽站；合計 35 尾', preConstruct:true },
  { label:'104年 Q2\n(6/23上游)', year:2015, m:6, d:23, bai:20, shi:0, xu:2, ying:0, jian:0, min:0, kou:0, feng:0, hong:0, stations:1, scope:'橫流溪上游', source:'105年度成果報告表10（鞍馬山站）', dataStatus:'observed', note:'104/06/23 鞍馬山站；合計 22 尾', preConstruct:true },
  { label:'104年 Q3\n(8/19下游)', year:2015, m:8, d:19, bai:13, shi:16, xu:0, ying:0, jian:0, min:0, kou:0, feng:0, hong:0, stations:1, scope:'橫流溪下游', source:'105年度成果報告表12（麗陽站）', dataStatus:'observed', note:'104/08/19 麗陽站；合計 29 尾', preConstruct:true },
  { label:'104年 Q3\n(9/17上游)', year:2015, m:9, d:17, bai:12, shi:1, xu:2, ying:0, jian:0, min:4, kou:0, feng:0, hong:0, stations:1, scope:'橫流溪上游', source:'105年度成果報告表12（鞍馬山站）', dataStatus:'observed', note:'104/09/17 鞍馬山站；明潭吻鰕虎 4 尾為魚道建置前的上游紀錄；合計 19 尾', preConstruct:true },
  { label:'104年 Q4\n(11/02下游)', year:2015, m:11, d:2, bai:10, shi:11, xu:0, ying:0, jian:0, min:0, kou:0, feng:0, hong:0, stations:1, scope:'橫流溪下游', source:'105年度成果報告表13（麗陽站）', dataStatus:'observed', note:'104/11/02 麗陽站；合計 21 尾', preConstruct:true },
  { label:'104年 Q4\n(11/24上游)', year:2015, m:11, d:24, bai:12, shi:4, xu:4, ying:0, jian:0, min:0, kou:0, feng:0, hong:0, stations:1, scope:'橫流溪上游', source:'105年度成果報告表13（鞍馬山站）', dataStatus:'observed', note:'104/11/24 鞍馬山站；合計 20 尾', preConstruct:true },
  // ── 105年：無橫流溪獨立調查紀錄 ────────────────────────────────
  // 2026-08 全文核對「105年度成果報告3.doc」：橫流溪相關的表 9～13 逐筆日期
  // 全為 104/02/25 ~ 104/11/24，表 14 的四季物種組成亦與 104 年逐季一致，
  // 全文無任何 105 年度的橫流溪調查日期。該報告為 106 年 2 月提交，
  // 係以 105 年度計畫名義重刊 104 年調查成果，故 105 年不列入主序列。
  // ⚠「附錄二(93~106)」在 105 年欄列有短臀瘋鱨，但 105 年度報告的橫流溪
  //   逐筆表與四季物種表均未出現該種，兩份官方文件不一致，暫不採認。
  // ── 106年：上下游2站電捕調查（下游資料來源：106年度成果報告；上游含鞍馬山站，尾數待補）──
  // 106年Q3文字記錄「明潭吻鰕虎出現於上游」，但未列明確尾數
  { label:'106年 Q1\n(3月)',  year:2017, m:3,  bai:25, shi:2,  xu:0,  ying:1,  jian:3,  min:0, kou:0, feng:0, hong:0, scope:'橫流溪下游', source:'106年度成果報告', note:'106年第1季(106/03/21)，橫流溪下游；106年XLSX確認同季有上游調查(106/04/10)但尾數待解析；來源：106年度成果報告' },
  { label:'106年 Q2\n(6月)',  year:2017, m:6,  bai:22, shi:7,  xu:0,  ying:1,  jian:0,  min:0, kou:0, feng:0, hong:0, scope:'橫流溪下游', source:'106年度成果報告', note:'106年第2季(106/06/22)，橫流溪下游；同日有上游調查(106/06/22)但尾數待解析；來源：106年度成果報告' },
  { label:'106年 Q3\n(9月)',  year:2017, m:9,  bai:26, shi:3,  xu:0,  ying:0,  jian:2,  min:0, kou:0, feng:0, hong:0, scope:'橫流溪下游', source:'106年度成果報告', note:'106年第3季(106/09/14)，橫流溪下游；報告文字記錄明潭吻鰕虎出現於上游但無明確尾數；上游有鞍馬山站(106/09/12)尾數待解析；來源：106年度成果報告' },
  { label:'106年 Q4\n(12月)', year:2017, m:12, bai:23, shi:0,  xu:0,  ying:0,  jian:0,  min:0, kou:0, feng:0, hong:0, scope:'橫流溪下游', source:'106年度成果報告', note:'106年第4季(106/12/05)，橫流溪下游；上游有鞍馬山站(106/12/04)尾數待解析；來源：106年度成果報告' },
  // ── 107年：3站電捕調查（來源：107~108年度成果報告 表4-16）──
  // 表4-16未列粗首馬口鱲；原平台32尾係誤套臺灣石魚賓代表樣站數，已更正為0。
  { label:'107年 S1\n(5月)',  year:2018, m:5,  bai:100,shi:73, xu:63, ying:109,jian:12, min:85, kou:0, feng:1, hong:0, stations:3, scope:'橫流溪3站', source:'107~108年度成果報告表4-16', note:'107年度第一季(5/28~29)，3站電捕合計；表4-16未列粗首馬口鱲；短臀瘋鱨1尾；來源：107~108年度成果報告表4-16' },
  { label:'107年 S2\n(7月)',  year:2018, m:7,  bai:21, shi:30, xu:33, ying:11, jian:0,  min:52, kou:0, feng:0, hong:2, stations:3, scope:'橫流溪3站', source:'107~108年度成果報告表4-16', note:'107年度第二季(7/9~10)，3站電捕合計；7種，149尾；短吻紅斑吻鰕虎2尾；來源：107~108年度成果報告表4-16' },
  // ── 108年：4站電捕調查，數據完整（來源：成果報告 表4-16）──
  { label:'108年 S3\n(4月)',  year:2019, m:4,  bai:169,shi:101,xu:113,ying:40, jian:24, min:133,kou:0, feng:3, hong:6, stations:4, scope:'橫流溪4站', source:'107~108年度成果報告表4-16', note:'108年度第三季春季(4/17~18)，4站電捕合計；8種，589尾；短臀瘋鱨3尾、短吻紅斑吻鰕虎6尾；來源：107~108年度成果報告表4-16' },
  { label:'108年 S4\n(10月)', year:2019, m:10, bai:92, shi:63, xu:72, ying:23, jian:5,  min:45, kou:0, feng:3, hong:1, stations:4, scope:'橫流溪4站', source:'107~108年度成果報告表4-16', note:'108年度第四季秋季(10/8~9)，4站電捕合計；8種，304尾；短臀瘋鱨3尾、短吻紅斑吻鰕虎1尾；來源：107~108年度成果報告表4-16' },
  // ── 109~110年：6站電捕合計（來源：110年魚道生態廊道成效追蹤 表5-3）──
  { label:'109年 S1\n(7月)',  year:2020, m:7,  bai:52,  shi:55, xu:47, ying:46, jian:0,  min:54, kou:0, feng:0, hong:1, stations:6, scope:'橫流溪6站', source:'110年成效追蹤表5-3', note:'109年7月(7/13-7/22)，橫流溪6站電捕合計；255尾，7種；jian=0已由Table5-3全面核實（S1+S2+S3+S4四回合計與PDF完全吻合）；報告PDF P.216明載「臺灣間爬岩鰍在第3次調查（110年4月）才首次出現」，確認jian=0正確；來源：110年成效追蹤表5-3' },
  { label:'109年 S2\n(9月)',  year:2020, m:9,  bai:53,  shi:55, xu:39, ying:43, jian:0,  min:70, kou:0, feng:1, hong:1, stations:6, scope:'橫流溪6站', source:'110年成效追蹤表5-3', note:'109年9月(9/28-9/29)，橫流溪6站電捕合計；262尾，7種；jian=0已核實，臺灣間爬岩鰍首次出現為第3次調查（110年4月）；來源：110年成效追蹤表5-3' },
  { label:'110年 第3次\n(4月)',  year:2021, m:4,  bai:158, shi:98, xu:92, ying:31, jian:23, min:81, kou:0, feng:0, hong:3, stations:6, scope:'橫流溪6站', source:'110年成效追蹤表5-3', note:'110年第3次(4/28-5/5)，橫流溪6站電捕合計；8種486尾；來源：110年成效追蹤表5-3' },
  { label:'110年 第4次\n(9月)',  year:2021, m:9,  bai:27,  shi:49, xu:94, ying:5,  jian:9,  min:49, kou:0, feng:2, hong:0, stations:6, scope:'橫流溪6站', source:'110年成效追蹤表5-3', note:'110年第4次(8/31-9/2)，橫流溪6站電捕合計；8種235尾；來源：110年成效追蹤表5-3' },
  // ── 110年：例行季度監測（附件一ODS逐尾登記表）；1-2站，與成效追蹤6站為獨立資料源 ──
  // 臺灣石魚賓在ODS原檔名稱含空白，計數已手動校正
  { label:'110年 Q1\n(2月下游)',  year:2021, m:2,  d:18, bai:7,  shi:6,  xu:11, ying:0, jian:0, min:1,  kou:0, feng:0, hong:0, stations:1, scope:'橫流溪下游', source:'附件一110年ODS', note:'110/02/18橫流溪下游電魚法，麗陽工作站；來源：附件一110年溪流魚調查生態調查資料-東勢處.ods' },
  { label:'110年 Q2上游\n(4月)', year:2021, m:4,  d:20, bai:166,shi:8,  xu:53, ying:4, jian:0, min:4,  kou:0, feng:0, hong:0, stations:1, scope:'橫流溪上游', source:'附件一110年ODS', note:'110/04/20橫流溪上游電魚法，鞍馬山工作站；白甲魚166尾為年度上游峰值；來源：附件一110年溪流魚調查生態調查資料-東勢處.ods' },
  { label:'110年 Q2下游\n(5月)', year:2021, m:5,  d:13, bai:12, shi:9,  xu:6,  ying:1, jian:0, min:3,  kou:0, feng:0, hong:0, stations:1, scope:'橫流溪下游', source:'附件一110年ODS', note:'110/05/13橫流溪下游電魚法，麗陽工作站；來源：附件一110年溪流魚調查生態調查資料-東勢處.ods' },
  { label:'110年 Q3\n(8月下游)',  year:2021, m:8,  d:17, bai:12, shi:11, xu:7,  ying:1, jian:0, min:2,  kou:0, feng:0, hong:0, stations:1, scope:'橫流溪下游', source:'附件一110年ODS', note:'110/08/17橫流溪下游電魚法，麗陽工作站；來源：附件一110年溪流魚調查生態調查資料-東勢處.ods' },
  { label:'110年 Q4上游\n(11月)',year:2021, m:11, d:16, bai:87, shi:8,  xu:53, ying:0, jian:0, min:6,  kou:0, feng:1, hong:1, stations:1, scope:'橫流溪上游', source:'附件一110年ODS', note:'110/11/16橫流溪上游電魚法，鞍馬山工作站；短臀瘋鱨1尾、短吻紅斑吻鰕虎1尾；來源：附件一110年溪流魚調查生態調查資料-東勢處.ods' },
  { label:'110年 Q4下游\n(11月)',year:2021, m:11, d:16, bai:45, shi:29, xu:49, ying:8, jian:0, min:18, kou:0, feng:0, hong:0, stations:1, scope:'橫流溪下游', source:'附件一110年ODS', note:'110/11/16橫流溪下游電魚法，麗陽工作站；明潭吻鰕虎18尾（下游高密度）；來源：附件一110年溪流魚調查生態調查資料-東勢處.ods' },

  // ── 111年：Survey123 逐尾工作表（溪魚調查_18_records_20230309154757.pdf）──
  // 2026-08 全量重解析：原始檔為合併檔（18份工作表），橫流溪 9 份含重複，去重後 5 場；
  // 其餘 9 份為南湖溪，不納入。逐尾紀錄位於「四十四、魚類體長與體重」段，一列一尾。
  //
  // ⚠ 更正：前次解析將明潭吻鰕虎全數記為 0，並註記「Survey123僅覆蓋下游故min為0」。
  //   經逐頁核對，原始表以異體字「明潭吻蝦虎」書寫，前次未對應該寫法而漏計 34 尾
  //   （3/15 二十尾 p56、6/28 八尾、10/3 四尾 p99、12/12 二尾 p28）。各場合計不變，
  //   係前次將漏計數量誤攤入其他魚種，本次一併更正為逐尾實際值。
  //
  // ⚠ 移除：原「111年 5月(上游)」與「111年 11月16日(上游Q4)」兩列來自成果報告 DOCX
  //   Table 7/9，其明潭吻鰕虎尾數係「依平均體長 64.167mm 的小數精度反推 6 個體」，
  //   為推估值而非實測計數，不符主序列口徑，已改列 HLX_FISH_PRESENCE_ONLY 出現層。
  { label:'111年 3月15日', year:2022, m:3, d:15, bai:108,shi:56,xu:40,ying:32,jian:0,min:20,kou:0,feng:0,hong:0, stations:1, scope:'橫流溪下游', source:'111年Survey123逐尾工作表（去重）', dataStatus:'observed', note:'逐尾清點 256 尾（p50-65）；明潭吻鰕虎 20 尾原表記為「明潭吻蝦虎」' },
  { label:'111年 6月28日', year:2022, m:6, d:28, bai:24, shi:36,xu:24,ying:0, jian:0,min:8, kou:0,feng:0,hong:0, stations:1, scope:'橫流溪', source:'111年Survey123逐尾工作表（去重）', dataStatus:'observed_partial', note:'逐尾清點 92 尾（p80-89）；原表「調查地點」僅記橫流溪，未標示上下游' },
  { label:'111年 10月3日', year:2022, m:10,d:3,  bai:92, shi:75,xu:24,ying:4, jian:0,min:4, kou:0,feng:0,hong:0, stations:1, scope:'橫流溪下游', source:'111年Survey123逐尾工作表（去重）', dataStatus:'observed', note:'逐尾清點 199 尾（p90-103）' },
  { label:'111年 12月5日', year:2022, m:12,d:5,  bai:0,  shi:0, xu:0, ying:0, jian:0,min:0, kou:0,feng:0,hong:0, stations:1, scope:'橫流溪', source:'111年Survey123逐尾工作表（去重）', dataStatus:'surveyed_no_capture', surveyStatus:'surveyed_no_capture', note:'完成調查但無捕獲（p1-18）；零捕獲不等同未調查' },
  { label:'111年 12月12日',year:2022, m:12,d:12, bai:26, shi:6, xu:3, ying:6, jian:0,min:2, kou:0,feng:0,hong:0, stations:1, scope:'橫流溪下游', source:'111年Survey123逐尾工作表（去重）', dataStatus:'observed', note:'逐尾清點 43 尾（p25-31）' },

  // ── 112年：Survey123逐尾調查表（溪魚調查__20230419_160627_559-合併.pdf，10份報告書）──
  // 2026-08 重新核對每份報告書的「調查地點描述」與 TWD97 坐標：
  //   橫流溪 6 份（X≈240,4xx~240,8xx／Y≈2,675,2xx~2,678,6xx）→ 納入，逐尾合計 417 尾
  //   南湖溪 4 份（4/27、7/20、11/21、12/25，X≈278,7xx／Y≈2,688,4xx）→ 移除
  // ⚠ 前次將該 4 份誤判為橫流溪，使 112 年多計 116 尾，並將南湖溪的臺灣間爬岩鰍 40 尾
  //   與粗首馬口鱲 4 尾誤植為橫流溪紀錄。兩溪相距約 38 公里，屬不同水系，不得合併。
  { label:'112年 4月18日', year:2023,m:4,d:18,bai:99,shi:27,xu:13,ying:4,jian:1,min:6,kou:0,feng:0,hong:0,stations:1,scope:'橫流溪',source:'112年Survey123逐尾表',note:'PDF核查確認橫流溪；明潭吻鰕虎6尾（PDF原名「明潭吻蝦虎」）；來源：溪魚調查__20230419_160627_559-合併.pdf' },
  { label:'112年 5月30日', year:2023,m:5,d:30,bai:4,shi:7,xu:9,ying:0,jian:0,min:2,kou:0,feng:1,hong:2,stations:1,scope:'橫流溪上游',source:'112年Survey123逐尾表',note:'PDF核查確認橫流溪上游；明潭吻鰕虎2尾；短臀瘋鱨1尾、短吻紅斑吻鰕虎2尾；來源：溪魚調查__20230419_160627_559-合併.pdf' },
  { label:'112年 6月21日', year:2023,m:6,d:21,bai:26,shi:17,xu:3,ying:0,jian:0,min:5,kou:0,feng:0,hong:0,stations:1,scope:'橫流溪',source:'112年Survey123逐尾表',note:'PDF核查確認橫流溪；明潭吻鰕虎5尾；來源：溪魚調查__20230419_160627_559-合併.pdf' },
  { label:'112年 9月22日', year:2023,m:9,d:22,bai:44,shi:17,xu:2,ying:3,jian:0,min:2,kou:0,feng:0,hong:0,stations:1,scope:'橫流溪',source:'112年Survey123逐尾表',note:'PDF核查確認橫流溪；明潭吻鰕虎2尾；來源：溪魚調查__20230419_160627_559-合併.pdf' },
  { label:'112年 11月27日',year:2023,m:11,d:27,bai:35,shi:5,xu:24,ying:0,jian:0,min:4,kou:0,feng:4,hong:1,stations:1,scope:'橫流溪上游',source:'112年Survey123逐尾表',note:'PDF核查確認橫流溪上游；明潭吻鰕虎4尾；短臀瘋鱨4尾、短吻紅斑吻鰕虎1尾；來源：溪魚調查__20230419_160627_559-合併.pdf' },
  { label:'112年 12月26日',year:2023,m:12,d:26,bai:19,shi:4,xu:9,ying:10,jian:0,min:8,kou:0,feng:0,hong:0,stations:1,scope:'橫流溪',source:'112年Survey123逐尾表',note:'PDF核查確認橫流溪；明潭吻鰕虎8尾；來源：溪魚調查__20230419_160627_559-合併.pdf' },

  // ── 113年：PDF逐頁核查（2026-08-21）溪魚調查__20240715_164059_29848_113合併.pdf（123頁）──
  // 核查方法：TWD97座標分離橫流溪（X≈240000–241000，Y≈2675000–2679000）與非橫流溪（X:278732，Y:2688460）
  // 橫流溪6筆：3/25(p73-92), 6/18(p93-99), 6/27(p1-10), 9/24(p25-30), 11/26(p31-44), 12/13(p59-63)
  // 非橫流溪4筆排除：9/24(p11-24含香魚54尾/粗首馬口鱲2尾/間爬岩鰍1尾), 12/12(p45-52), 3/21(p64-72), 6/26(p100+)
  // Unicode解碼確認：臺灣白甲魚(U+81FA7063767D75329B5A)、臺灣鬚鱲(U+81FA70639B1A9C72)等9物種全數對應
  // 6/27實際魚種bai=18/shi=4/xu=2/ying=1/min=3/hong=1 PDF逐頁核實；jian=0為正確值（jian僅見非橫流溪）
  // 9/24無捕獲與颱風凱米（2024-07-24）擾動一致；113年合計6物種為PDF直接核實
  { label:'113年 3月25日', year:2024,m:3,d:25,bai:67,shi:14,xu:32,ying:6,jian:0,min:3,kou:0,feng:0,hong:0,stations:1,scope:'橫流溪下游',source:'113年Survey123逐尾表',note:'PDF核查p73-92：bai=67/shi=14/xu=32/ying=6/min=3完全吻合；jian=0確認（非橫流溪排除）' },
  { label:'113年 6月18日', year:2024,m:6,d:18,bai:2,shi:1,xu:2,ying:0,jian:0,min:0,kou:0,feng:0,hong:0,stations:1,scope:'橫流溪上游',source:'113年Survey123逐尾表',note:'PDF核查p93-99：bai=2/shi=1/xu=2完全吻合；共5尾' },
  { label:'113年 6月27日', year:2024,m:6,d:27,bai:18,shi:4,xu:2,ying:1,jian:0,min:3,kou:0,feng:0,hong:1,stations:1,scope:'橫流溪下游',source:'113年Survey123逐尾表',note:'PDF核查p1-10：各物種完全吻合；kou=0確認（kou僅見p11-24非橫流溪9/24調查，已排除）；jian=0確認' },
  { label:'113年 9月24日', year:2024,m:9,d:24,bai:0,shi:0,xu:0,ying:0,jian:0,min:0,kou:0,feng:0,hong:0,stations:1,scope:'橫流溪下游',source:'113年Survey123逐尾表',surveyStatus:'surveyed_no_capture',note:'PDF核查p25-30：確認無捕獲；颱風凱米（2024-07-24凱米過境）後棲地擾動，生態學上合理' },
  { label:'113年 11月26日',year:2024,m:11,d:26,bai:56,shi:12,xu:4,ying:3,jian:0,min:2,kou:0,feng:0,hong:0,stations:1,scope:'橫流溪下游',source:'113年Survey123逐尾表',note:'PDF核查p31-44：bai=56/shi=12/xu=4/ying=3/min=2完全吻合；jian=0確認' },
  { label:'113年 12月13日',year:2024,m:12,d:13,bai:31,shi:1,xu:14,ying:1,jian:0,min:2,kou:0,feng:0,hong:0,stations:1,scope:'橫流溪上游',source:'113年Survey123逐尾表',note:'PDF核查p59-63：bai/xu/shi/ying/min均有確認；表格另含公分單位魚體量測' },

  // ── 114年：4次橫流溪上、下游Survey123逐尾調查表 ──
  { label:'114年 6月24日', year:2025,m:6,d:24,bai:31,shi:23,xu:3,ying:2,jian:0,min:2,kou:0,feng:1,hong:0,stations:1,scope:'橫流溪下游',source:'114年Survey123逐尾表',note:'明潭吻鰕虎2尾、短臀瘋鱨1尾；來源：114年Survey123逐尾表' },
  { label:'114年 7月17日', year:2025,m:7,d:17,bai:3,shi:0,xu:4,ying:0,jian:0,min:5,kou:0,feng:1,hong:1,stations:1,scope:'橫流溪上游',source:'114年Survey123逐尾表',note:'明潭吻鰕虎5尾、短臀瘋鱨1尾、短吻紅斑吻鰕虎1尾；來源：114年Survey123逐尾表' },
  { label:'114年 12月10日',year:2025,m:12,d:10,bai:31,shi:1,xu:1,ying:0,jian:0,min:2,kou:0,feng:3,hong:0,stations:1,scope:'橫流溪上游',source:'114年Survey123逐尾表',note:'明潭吻鰕虎2尾、短臀瘋鱨3尾；來源：114年Survey123逐尾表' },
  { label:'114年 12月24日',year:2025,m:12,d:24,bai:105,shi:22,xu:2,ying:4,jian:13,min:15,kou:0,feng:0,hong:0,stations:1,scope:'橫流溪下游',source:'114年Survey123逐尾表',note:'明潭吻鰕虎15尾；來源：114年Survey123逐尾表' },
];

// ════════════════════════════════════════════════════════════════════════════
//  出現層：有出現或體長證據、但沒有可核對尾數的紀錄。
//  ★ 絕不轉換為捕獲尾數，只用於「該年是否出現」的判讀與稀有種偵測率分析。
// 93～114 年物種出現矩陣。左半取自附錄二出現層，右半由主序列即時推導，
// 兩層在圖上以分隔線明確區分，並於 tooltip 標示各自口徑。
function renderOccurrenceMatrix(annualData, annualYears) {
  const RAMP = ['#eef1ee', '#cde2fb', '#9ec5f4', '#6da7ec', '#3987e5', '#2a78d6', '#1c5cab', '#104281'];
  const occ = HLX_FISH_OCCURRENCE_9306;
  const legacyYears = Object.keys(occ.data).map(Number).sort((a, b) => a - b);
  const modernYears = annualYears.map(y => Number(y) - 1911).sort((a, b) => a - b);
  const cell = (v, n, year, name, layer) => {
    const r = n ? v / n : 0;
    const bg = v === 0 ? RAMP[0] : RAMP[Math.min(7, Math.max(1, Math.round(r * 6) + 1))];
    const tip = `${year}年 ${name}：${v}/${n} ${layer === 'legacy' ? '季' : '場次'}檢出`
      + (v === 0 ? '（已調查未檢出）' : '');
    return `<td title="${tip}" style="padding:0"><div style="height:24px;margin:1px;border-radius:3px;background:${bg}"></div></td>`;
  };
  const head = [...legacyYears, ...modernYears]
    .map((y, i) => `<th style="font-size:9.5px;color:#94a3b8;font-weight:600;padding:0 0 5px;text-align:center;${i === legacyYears.length ? 'border-left:2px dashed #0d6b5b' : ''}">${(y % 2 === 1 || y >= 107) ? y : ''}</th>`)
    .join('');
  const rows = HLX_FISH_KEYS.map(k => {
    const name = HLX_FISH_KEY_NAME[k];
    const legacy = legacyYears.map(y =>
      cell(occ.data[y][k] || 0, occ.seasons[y], y, name, 'legacy')).join('');
    const modern = modernYears.map((y, i) => {
      const d = annualData[y + 1911];
      const n = d ? d.cnt : 0;
      const det = d ? HLX_FISH_SURVEYS.filter(x => Number(x.year) === y + 1911 && (x[k] || 0) > 0).length : 0;
      return cell(det, n, y, name, 'modern').replace('<td ',
        i === 0 ? '<td style="border-left:2px dashed #0d6b5b" ' : '<td ');
    }).join('');
    return `<tr><th style="font-size:12px;color:#334155;font-weight:600;text-align:right;padding-right:9px;white-space:nowrap">${name}</th>${legacy}${modern}</tr>`;
  }).join('');
  return `<div style="overflow-x:auto">
    <table style="border-collapse:collapse;width:100%;min-width:640px;table-layout:fixed">
      <colgroup><col style="width:96px"></colgroup>
      <thead><tr><th></th>${head}</tr></thead><tbody>${rows}</tbody></table>
    <div style="display:flex;justify-content:space-between;font-size:11px;color:#64748b;margin-top:7px;padding-left:96px">
      <span>◀ 附錄二出現層（93～106，無尾數）</span><span>平台量化序列（107～114）▶</span>
    </div>
  </div>`;
}

// ════════════════════════════════════════════════════════════════════════════
//  魚道生態成效實證資料（全部為《110年_東勢林區管理處國有林魚道及生態廊道
//  成效追蹤》之報告實測值，非本平台推算）
// ════════════════════════════════════════════════════════════════════════════
//  生態品質評級：以「經修正適用於臺灣的生物整合指標 IBI」絕對標準判讀，
//  不倚賴單一對照溪。IBI 綜合魚類組成、外來種比例、食性結構等指標評估
//  水域生態系健康度，分級門檻為全臺通用（報告表 5-2）。
const HLX_ECO_BENCHMARK = {
  scale: [
    { label: 'A級 生態品質佳', min: 35, max: 45, tone: 'good' },
    { label: 'B級 生態品質良好', min: 23, max: 34, tone: 'mid'  },
    { label: 'C級 生態品質待關注', min: 15, max: 22, tone: 'low' },
    { label: 'D級 生態品質優先改善', min: 0,  max: 14, tone: 'bad'  },
  ],
  hlx: {
    ibiMean: 32, ibiMin: 23, ibiMax: 37,
    sitesTotal: 6, sitesGradeA: 4,
    annualMeans: [
      { year: '109年', value: 31.7, min: 23, max: 37, rounds: '夏季 30.3｜秋季 33.0' },
      { year: '110年', value: 30.7, min: 23, max: 37, rounds: '夏季 31.7｜秋季 29.7' },
    ],
    surveyMeans: [
      { label: '109年夏季', value: 30.3 },
      { label: '109年秋季', value: 33.0 },
      { label: '110年夏季', value: 31.7 },
      { label: '110年秋季', value: 29.7 },
    ],
    hMean: 1.4, hMin: 0.82, hMax: 1.76,
    maxBodyLength: 27.8, maxBodySpecies: '臺灣白甲魚',
  },
  source: '110年魚道及生態廊道成效追蹤 表5-2、第5章、第8章（頁5-2、5-5、5-15、8-2）；'
        + '105～106年度東勢處森林溪流魚類監測成果報告 表4'
};

//  魚道內實測捕獲（表 5-19）：於 9 座魚道「內部」以電捕法＋蝦籠法直接量測，
//  非由全溪捕獲量換算。4 次捕捉：109/7、109/10、110/7、110/10。
//  ★ 各座魚道的可搜索水體體積與入流量差異極大，直接比較尾數會誤導，
//    故一併載入水理參數（報告 4.2 節與頁 4-4 的模擬流量表）。
const HLX_IN_FISHWAY_CATCH = {
  surveyRounds: 4,
  byFishway: [
    { id:'溪構1-1', type:'粗石斜曲面式', total:11, inflow:0.55, partial:false, poolNote:'水路型態，無水池' },
    { id:'溪構1-2', type:'改良型舟通式', total:52, inflow:0.05, partial:false, poolNote:'水路型態，無水池' },
    { id:'溪構2',   type:'階段式',       total:37, inflow:0.30, partial:true,  poolNote:'8 階，內寬 8m' },
    { id:'溪構3',   type:'斜坡式',       total:42, inflow:0.60, partial:false, poolNote:'水路型態' },
    { id:'溪構4',   type:'階段式',       total:23, inflow:0.60, partial:false, poolNote:'5 階，單池 4.8 m³' },
    { id:'溪構5-2', type:'潛越式',       total:4,  inflow:0.15, partial:true,  poolNote:'內寬僅 1.05m，單池約 0.9 m³' },
    { id:'溪構6',   type:'階段式',       total:26, inflow:0.60, partial:false, poolNote:'15 階，單池 3.6 m³' },
    { id:'溪構7',   type:'降壩',         total:76, inflow:0.60, partial:false, poolNote:'7 階，最大水池 17.7 m³' },
    { id:'溪構8-2', type:'之字形',       total:35, inflow:0.13, partial:true,  poolNote:'梯狀多層，單池 1.27 m³' },
  ],
  bySpecies: [
    { name:'臺灣白甲魚', n:113 }, { name:'臺灣石魚賓', n:62 },
    { name:'明潭吻鰕虎', n:62 },  { name:'臺灣鬚鱲', n:47 },
    { name:'纓口臺鰍', n:11 },    { name:'臺灣間爬岩鰍', n:6 },
    { name:'短吻紅斑吻鰕虎', n:5 },
  ],
  total: 306, species: 7,
  //  為何是 7 種而非 8 種：未在魚道內捕獲的是短臀瘋鱨。
  absentSpecies: '短臀瘋鱨',
  absentReason: '短臀瘋鱨為夜行性鮠科，白天躲藏於深潭岩縫，全期單場出現頻度僅 23.4%，'
              + '是 8 種目標魚種中最低。魚道內部為淺水高流速環境，本就不是其偏好棲地，'
              + '因此 4 次日間魚道內電捕未捕獲屬合理結果。該種在全溪序列中持續有紀錄'
              + '（107、108、109、110、112、114 年均檢出），114 年更在 4 場中的 3 場檢出 5 尾。',
  //  溪構5-2 捕獲量偏低的成因（報告頁 4-4、4-15、4-16）
  lowestNote: {
    id: '溪構5-2',
    reason: '兩項結構性因素造成可捕獲量偏低，均非魚道失效：'
          + '① 入流量僅 0.15 cms，為滿流魚道（0.60 cms）的四分之一，報告載明'
          + '「由於部分水流溢流，河道的水位未全部進入魚道」；'
          + '② 魚道內寬僅 1.05 公尺（其他階段式魚道為 6～8 公尺），單池體積約 0.9 m³，'
          + '僅為溪構7 最大水池 17.7 m³ 的十九分之一 —— 可供魚類停駐與電捕搜索的水體極小。',
    hydraulic: '水理檢核三項全部合格：水位差 Δh 0.2m（容許 0.5m）、'
             + '單位體積消能率 Pv 246 W/m³（容許 300）、越流流速 1.12 m/s（小於魚類游泳能力容許值）。',
    action: '屬進水口分流的維護課題，可透過清淤與導流改善，已列入巡查追蹤重點。'
  },
  topNote: '溪構7（降壩魚道）以 76 尾、7 種居冠；報告分析為該魚道內部水池較大'
         + '（最大水池體積 17.7 m³），吸引魚類停駐 —— 與各座魚道的水池體積差異一致。',
  source: '110年魚道及生態廊道成效追蹤 表5-19（頁5-30）；水理參數見頁4-4、4-15～4-17'
};

//  受脅魚種：臺灣淡水魚類紅皮書名錄近危(NNT)以上者
const HLX_THREATENED_KEYS = ['bai', 'ying', 'jian', 'feng'];


// ════════════════════════════════════════════════════════════════════════════
//  生態監測資料層（HLX Eco Monitor）
//  ----------------------------------------------------------------------------
//  定位：呈現「歷年調查數據中的環境與物種組成變化訊號」，不做正負評分。
//
//  單位一律採「尾／次」——「1 次」＝一個樣站完成一次調查。
//  這是調查紀錄表上最直接的單位，一般讀者可以直接理解「平均每次調查抓到幾尾」。
//
//  ★ 呈現原則
//   1. 全部數值由 HLX_FISH_SURVEYS 原始列即時計算，不預存、不補值、不修改。
//   2. 數值下降不作負面標示。物種數量的年際變化屬族群量波動與棲地利用轉換，
//      應對照水文、潭瀨組成、底質與流況等環境條件解讀，而非逕行判定好壞。
//   3. 顏色依「年度／時期／物種」的身分區分，不用來表示好壞。
//      年度與時期採同色系深淺（早→晚），物種採固定分類色序。
//
//  時期分界：107 年起 9 座魚道陸續啟用，103～106 年為改善前、107～114 年為改善後。
//  105 年度報告係 104 年資料重刊，無獨立調查場次。
// ════════════════════════════════════════════════════════════════════════════
const HLX_ECO_PRE_LAST_YEAR = 2017;          // 民國 106 年

//  「1 次」的定義：優先取 stations 欄，其次由備註「N站」解析，皆無則以 1 計
function hlxEco_times(s) {
  if (Number(s.stations) > 0) return Number(s.stations);
  const m = String(s.note || '').match(/(\d+)\s*站/);
  return m ? parseInt(m[1], 10) : 1;
}
//  河段分層：僅採 scope 明確標示者；標為「橫流溪」而未分上下游者不猜測
function hlxEco_segment(s) {
  const sc = String(s.scope || '');
  if (sc.indexOf('上游') >= 0) return '上游';
  if (sc.indexOf('下游') >= 0) return '下游';
  return '未標示';
}

/* ── 物種身分色（固定順序，僅用於區分物種，不含好壞意涵）──
   取自通過色盲分離度檢定的分類色序：正常視覺最小 ΔE 19.6、
   protan 最小 ΔE 9.1，且一律搭配圖例與資料表作為第二重辨識。 */
const HLX_ECO_SPECIES_COLOR = {
  bai : '#2a78d6', shi : '#eb6834', xu  : '#1baf7a', ying: '#eda100',
  jian: '#e87ba4', min : '#008300', feng: '#4a3aa7', hong: '#e34948'
};
/* ── 年度色階（同一藍色系由淺到深，代表時間先後，不代表優劣）── */
const HLX_ECO_YEAR_RAMP = ['#cde2fb','#b7d3f6','#9ec5f4','#86b6ef','#6da7ec','#5598e7',
                           '#3987e5','#2a78d6','#256abf','#1c5cab','#184f95'];
/* ── 時期色（同色系淺→深＝早期→近期）── */
const HLX_ECO_PHASE_COLOR = { pre: '#86b6ef', post: '#1c5cab' };
/* ── 河段色（僅作身分區分）── */
const HLX_ECO_SEG_COLOR = { up: '#4a3aa7', down: '#1baf7a' };
/* ── 版面用中性色 ── */
const HLX_ECO_INK = { t1:'#0f172a', t2:'#475569', t3:'#94a3b8', line:'#e2e8f0' };

let _hlxEcoMonitorCache = null;
function hlxEcoMonitor() {
  if (_hlxEcoMonitorCache) return _hlxEcoMonitorCache;
  const KEYS = HLX_FISH_KEYS;
  const isPost = y => y > HLX_ECO_PRE_LAST_YEAR;

  // ── 年度序列 ──────────────────────────────────────────────
  const ymap = new Map();
  HLX_FISH_SURVEYS.forEach(s => {
    if (!ymap.has(s.year)) ymap.set(s.year, {
      year: s.year, roc: s.year - 1911, events: 0, times: 0, counts: {} });
    const d = ymap.get(s.year);
    d.events++; d.times += hlxEco_times(s);
    KEYS.forEach(k => { d.counts[k] = (d.counts[k] || 0) + (Number(s[k]) || 0); });
  });
  const years = [...ymap.values()].sort((a, b) => a.year - b.year).map(d => {
    const vals = KEYS.map(k => d.counts[k]);
    const total = vals.reduce((a, b) => a + b, 0);
    const rank = KEYS.map(k => ({ key: k, n: d.counts[k] })).sort((a, b) => b.n - a.n);
    return Object.assign({}, d, {
      total: total,
      species: vals.filter(v => v > 0).length,
      perTime: d.times ? total / d.times : 0,                      // 平均尾／次
      perTimeBy: KEYS.reduce((o, k) => { o[k] = d.times ? d.counts[k] / d.times : 0; return o; }, {}),
      shareBy:   KEYS.reduce((o, k) => { o[k] = total ? d.counts[k] / total * 100 : 0; return o; }, {}),
      dominant: rank[0], second: rank[1],
      phase: isPost(d.year) ? 'post' : 'pre'
    });
  });

  const pre  = years.filter(y => y.phase === 'pre');
  const post = years.filter(y => y.phase === 'post');
  const mean = (arr, f) => arr.length ? arr.reduce((a, x) => a + f(x), 0) / arr.length : 0;

  // ── 改善前後：各物種平均尾／次（保留全部數值，含下降者）──
  const bySpecies = KEYS.map(k => {
    const a = mean(pre,  y => y.perTimeBy[k]);
    const b = mean(post, y => y.perTimeBy[k]);
    return {
      key: k, name: HLX_FISH_KEY_NAME[k], color: HLX_ECO_SPECIES_COLOR[k],
      pre: a, post: b, diff: b - a,
      total: HLX_FISH_SURVEYS.reduce((s, r) => s + (Number(r[k]) || 0), 0),
      //  出現年度數：呈現該物種在序列中被記錄到的年度範圍，中性描述
      yearsPre:  pre.filter(y => y.counts[k] > 0).length,
      yearsPost: post.filter(y => y.counts[k] > 0).length
    };
  }).sort((a, b) => b.post - a.post);

  // ── 河段 × 時期 ────────────────────────────────────────────
  const smap = new Map();
  HLX_FISH_SURVEYS.forEach(s => {
    const seg = hlxEco_segment(s);
    if (seg === '未標示') return;
    const key = (isPost(s.year) ? 'post' : 'pre') + '|' + seg;
    if (!smap.has(key)) smap.set(key, { phase: key.split('|')[0], seg: seg, events: 0, times: 0, counts: {} });
    const d = smap.get(key);
    d.events++; d.times += hlxEco_times(s);
    KEYS.forEach(k => { d.counts[k] = (d.counts[k] || 0) + (Number(s[k]) || 0); });
  });
  const segments = ['pre|上游', 'pre|下游', 'post|上游', 'post|下游'].map(key => {
    const d = smap.get(key);
    if (!d) return null;
    const total = KEYS.reduce((a, k) => a + d.counts[k], 0);
    return {
      key: key, phase: d.phase, seg: d.seg, times: d.times, events: d.events, total: total,
      species: KEYS.filter(k => d.counts[k] > 0).length,
      perTime: d.times ? total / d.times : 0,
      perTimeBy: KEYS.reduce((o, k) => { o[k] = d.times ? d.counts[k] / d.times : 0; return o; }, {}),
      shareBy:   KEYS.reduce((o, k) => { o[k] = total ? d.counts[k] / total * 100 : 0; return o; }, {})
    };
  }).filter(Boolean);

  _hlxEcoMonitorCache = {
    keys: KEYS, years: years, pre: pre, post: post,
    bySpecies: bySpecies, segments: segments,
    summary: {
      events: HLX_FISH_SURVEYS.length,
      times: HLX_FISH_SURVEYS.reduce((a, s) => a + hlxEco_times(s), 0),
      total: years.reduce((a, y) => a + y.total, 0),
      species: KEYS.length,
      spanFrom: years[0].roc, spanTo: years[years.length - 1].roc,
      perTimePre:  mean(pre,  y => y.perTime),
      perTimePost: mean(post, y => y.perTime),
      speciesPre:  mean(pre,  y => y.species),
      speciesPost: mean(post, y => y.species)
    }
  };
  return _hlxEcoMonitorCache;
}
if (typeof window !== 'undefined') window.hlxEcoMonitor = hlxEcoMonitor;



// ════════════════════════════════════════════════════════════════════════════
const HLX_FISH_PRESENCE_ONLY = [
  { year:106, species:'明潭吻鰕虎', scope:'橫流溪上游', source:'106年度成果報告',
    note:'報告文字記載上游有出現，未列明確尾數。' },
  { year:111, species:'明潭吻鰕虎', scope:'橫流溪上游（鞍馬山站）', source:'111年成果報告DOCX Table 7/9',
    note:'Q2（5月）體長55mm；Q4（11/16）平均體長64.167mm。原以小數精度反推「6個體」並計入主序列，屬推估值，已移出。' },
  { year:111, species:'短臀瘋鱨', scope:'橫流溪上游（鞍馬山站）', source:'111年成果報告DOCX Table 9',
    note:'Q4（11/16）體長110mm；表格未提供尾數。' },
  { year:111, species:'短吻紅斑吻鰕虎', scope:'橫流溪上游（鞍馬山站）', source:'111年成果報告DOCX Table 9',
    note:'Q4（11/16）體長55mm；表格未提供尾數。' },
];

// ════════════════════════════════════════════════════════════════════════════
//  93～106 年官方出現層（附錄二橫流溪魚類資源監測調查成果表，林務局東勢林區管理處）
//  值＝該年記錄到該物種的季別數；0 表示該年成果表未列該物種（非「確認不存在」）。
//  ★ 此層僅有出現紀錄、無尾數，不得與主序列的捕獲量相加。
//  用途：(1) 補上稀有魚種在魚道建置前的長期出現證據
//        (2) 交叉驗證主序列 —— 106 年四季物種組成與本層逐季完全吻合
// ════════════════════════════════════════════════════════════════════════════
const HLX_FISH_OCCURRENCE_9306 = {
  seasons: { 93:2, 94:2, 95:2, 96:2, 97:2, 98:2, 99:2, 100:2, 101:2, 102:1, 103:4, 104:4, 105:3, 106:4 },
  //        白甲 石賓 鬚鱲 纓口 間爬 明潭 瘋鱨 紅斑
  data: {
    93:  { bai:2, shi:2, xu:2, ying:2, jian:0, min:2, feng:0, hong:0 },
    94:  { bai:2, shi:2, xu:0, ying:2, jian:0, min:2, feng:0, hong:1 },
    95:  { bai:2, shi:2, xu:1, ying:2, jian:1, min:2, feng:0, hong:0 },
    96:  { bai:2, shi:2, xu:2, ying:2, jian:0, min:2, feng:0, hong:1 },
    97:  { bai:2, shi:2, xu:1, ying:2, jian:1, min:2, feng:0, hong:2 },
    98:  { bai:2, shi:2, xu:1, ying:2, jian:0, min:2, feng:0, hong:0 },
    99:  { bai:2, shi:2, xu:1, ying:2, jian:2, min:2, feng:0, hong:1 },
    100: { bai:2, shi:2, xu:2, ying:2, jian:2, min:2, feng:0, hong:1 },
    101: { bai:2, shi:2, xu:2, ying:2, jian:2, min:2, feng:0, hong:0 },
    102: { bai:1, shi:1, xu:0, ying:1, jian:0, min:1, feng:1, hong:0 },
    103: { bai:4, shi:4, xu:0, ying:1, jian:4, min:0, feng:0, hong:0 },
    104: { bai:4, shi:4, xu:1, ying:2, jian:2, min:0, feng:0, hong:0 },
    105: { bai:3, shi:3, xu:2, ying:3, jian:0, min:3, feng:1, hong:0 },
    106: { bai:4, shi:3, xu:0, ying:2, jian:2, min:0, feng:0, hong:0 },
  },
  source: '11 成果報告/06 附錄二橫流溪魚類資源監測調查成果表(93_106年).pdf',
  policy: '出現層無尾數，不與主序列相加；0 代表該年成果表未列，不代表確認不存在。'
};

window.hlxFishDataAudit = {
  presenceOnly: HLX_FISH_PRESENCE_ONLY,
  occurrence9306: HLX_FISH_OCCURRENCE_9306,
  standardSpecies: Object.values(HLX_FISH_KEY_NAME).filter(fish_isPublishedSpecies),
  policy: '同年度不同計畫並列不相加；空白不視為0尾；平均體長或文字出現不轉換為尾數；他溪紀錄不併入橫流溪。'
};

const HLX_FISH_110_SUMMARY = {
  springTotal: 486,
  autumnTotal: 235,
  annualTotal: 721,
  stationVisits: 12,
  fishSpecies: 8,
  aquaticTaxa: 10,
  fishwayPassTotal: 74,
  fishwayPassSpecies: 5,
  fishwayCaptureTotal: 306,
  fishwayCaptureSpecies: 7,
  fishList: ['明潭吻鰕虎','短吻紅斑吻鰕虎','臺灣鬚鱲','臺灣石魚賓','臺灣白甲魚','纓口臺鰍','臺灣間爬岩鰍','短臀瘋鱨'],
  aquaticExtra: ['粗糙沼蝦','芮氏明溪蟹']
};
// 各物種完整歷年累計＝由上方序列即時加總（無法與趨勢分析漂移）
const HLX_FISH_FULL_TOTALS = (function () {
  const t = {};
  Object.values(HLX_FISH_KEY_NAME).filter(fish_isPublishedSpecies).forEach(n => { t[n] = 0; });
  HLX_FISH_SURVEYS.forEach(s => {
    Object.entries(HLX_FISH_KEY_NAME).forEach(([k, n]) => {
      if (fish_isPublishedSpecies(n)) t[n] += (s[k] || 0);
    });
  });
  return t;
})();
const HLX_FISH_SURVEY_EVENTS = HLX_FISH_SURVEYS.length;  // 調查場次（103~114年）
const HLX_FISH_GRAND_TOTAL   = Object.values(HLX_FISH_FULL_TOTALS).reduce((a, b) => a + b, 0);

// 稀有或低捕獲物種的資料口徑說明。將「完成調查但未檢出」、
// 「來源無法定位到橫流溪」與真正缺漏分開，避免把他溪紀錄誤補為橫流溪尾數。
const HLX_FISH_EVIDENCE_NOTES = {
  '明潭吻鰕虎': '104年Q3（104/09/17）鞍馬山上游站首次量化捕獲4尾（魚道建置前）。106年Q3成果報告文字記載上游有紀錄，惟文字疑似複製，XLSX無明確尾數，存疑。107年起成為橫流溪量化優勢鰕虎科魚種，107年5月第一季3站合計85尾，顯示魚道完工後族群快速擴張。111年Survey123均為下游單站（min欄全零）；111年成果報告DOCX Table 7另確認Q2（5月）上游1尾（體長55mm）、Table 9確認Q4（11/16）上游≥6尾（平均體長64.167mm），均為量化電捕記錄，非僅目擊。全序列累計648尾，是橫流溪數量最豐富的鰕虎科魚類，流域棲地健康指標。',
  '粗首馬口鱲': '橫流溪可稽核量化序列中，103年基線、106年下游量化表及104–111年調查均未檢出；112年11月與12月各記錄2尾，合計4尾。資料比對已納入現行學名 Opsariichthys pachycephalus、舊學名 Zacco pachycephalus，以及「粗手馬口鱲」「粗首馬口」等OCR異體；但「臺灣馬口魚」可能指臺灣鬚鱲，未具學名或標本佐證時不併計。108年裡冷溪與110年南湖溪的陽性記錄屬其他溪流，僅能證明鄰近大甲溪水系存在族群，不得移入橫流溪。未捕獲表示當次調查未檢出，不等同全溪不存在；可能受低密度、活動水層、季節、站位與電捕效率影響。',
  '短臀瘋鱨': '103年與106年橫流溪量化序列未檢出（不代表全流域不存在）。107年起始有可定位橫流溪尾數，呈間歇性低量捕獲：107年S1（5月）1尾、109年S2（9月）1尾、110年上游Q4（11/16）1尾（ODS確認，體長110mm）、111年上游Q4（11/16）1尾（DOCX Table 9，體長110mm）、112年5月1尾＋11月4尾、114年共5尾，全序列累計22尾。111年Survey123下游站全零，DOCX Table 9上游量化捕獲確認1尾，易危種持續在上游低密度維持族群；兩資料源站位不同，不矛盾。',
  '短吻紅斑吻鰕虎': '103年與106年橫流溪量化序列未檢出；107年S2（7月）起始有可定位尾數（2尾），呈間歇性低量捕獲。111年Survey123下游站全零值；111年DOCX Table 9確認上游Q4（11/16）量化捕獲1尾（體長55mm），為電捕實測，非目擊。全序列累計21尾（加入111年上游1尾）。零值表示已完成調查但未捕獲，不等同未調查；下游站零值不代表全流域族群缺席。'
};

// ════════════════════════════════════════════════════════════════════════════
//  場次備註 → 物種備註
//  ----------------------------------------------------------------------------
//  HLX_FISH_SURVEYS 的 note 是「整個場次」的稽核註記，常同時提到多個魚種
//  與全場合計尾數。直接放進單一物種的明細會誤導閱讀者，實測案例：
//    ・臺灣白甲魚 111年3月15日 顯示「明潭吻鰕虎 20 尾原表記為『明潭吻蝦虎』」
//    ・臺灣間爬岩鰍 103年Q3 顯示「附錄二同季亦記錄纓口臺鰍」
//    ・尾數欄寫 3 尾，備註卻寫「合計 51 尾」（其實是該場次全魚種合計）
//  規則：備註以「；」切段後，只保留（a）沒有指名任何魚種的敘述，或
//  （b）指名到本物種的敘述；只提到其他魚種的段落整段移除。全場合計改寫為
//  「本場次…合計」，讓它不會被誤讀成本物種的尾數。
// ════════════════════════════════════════════════════════════════════════════
//  異體字與簡稱：原始表常見「鰕/蝦」「臺/台」互用，且省略「臺灣」屬名前綴。
function fish_noteNormalize(text) {
  return String(text || '').replace(/蝦/g, '鰕').replace(/台/g, '臺');
}

function fish_noteAliases(speciesName) {
  const full = fish_noteNormalize(speciesName);
  const set = new Set([full]);
  const stripped = full.replace(/^臺灣/, '');
  if (stripped && stripped.length >= 2) set.add(stripped);
  return [...set];
}

function fish_noteMentions(segment, speciesName) {
  const seg = fish_noteNormalize(segment);
  return fish_noteAliases(speciesName).some(alias => seg.includes(alias));
}

function fish_speciesScopedNote(note, speciesName) {
  const raw = String(note || '').trim();
  if (!raw || !speciesName) return raw;
  const allNames = Object.values(HLX_FISH_KEY_NAME);
  const kept = raw.split(/[；;]/).map(x => x.trim()).filter(Boolean).filter(seg => {
    // 只提到別的魚種 → 整段移除；同時提到本物種 → 保留
    const mentionsOther = allNames.some(nm => nm !== speciesName && fish_noteMentions(seg, nm));
    return !mentionsOther || fish_noteMentions(seg, speciesName);
  }).map(seg => seg
    // 全場合計加上「本場次」，避免與左欄的物種尾數混淆
    .replace(/^逐尾清點\s*(\d+)\s*尾/, '本場次全魚種逐尾清點合計 $1 尾')
    .replace(/^合計\s*(\d+)\s*尾/, '本場次全魚種合計 $1 尾'));
  return kept.join('；');
}

// 取得單一物種的完整歷年調查明細（與歷年趨勢分析同源，供卡片展開比對）
function fish_surveyBreakdown(speciesName) {
  const key = Object.keys(HLX_FISH_KEY_NAME).find(k => HLX_FISH_KEY_NAME[k] === speciesName);
  if (!key) return [];
  return HLX_FISH_SURVEYS
    .map(s => ({
      label:  String(s.label || '').replace(/\n/g, ' '),
      year:   s.year,
      m:      s.m || 0,
      d:      s.d || 0,
      count:  s[key] || 0,
      source: s.source || (String(s.note || '').match(/來源：([^；]+)/) || [, ''])[1].trim()
              || (s.preConstruct ? '麗陽站魚道建置前基線' : '橫流溪電捕監測'),
      scope:  s.scope || '橫流溪調查樣站',
      note:   fish_speciesScopedNote(s.note, speciesName)
    }))
    .filter(r => r.count > 0);
}

// 包含零捕獲場次的完整調查時間軸。0尾只代表該場次完成調查但未捕獲，
// 未建檔或未調查的年度不會被自動補成0。
function fish_surveyTimeline(speciesName) {
  const key = Object.keys(HLX_FISH_KEY_NAME).find(k => HLX_FISH_KEY_NAME[k] === speciesName);
  if (!key) return [];
  return HLX_FISH_SURVEYS.map(s => ({
    label: String(s.label || '').replace(/\n/g, ' '),
    year: s.year,
    m: s.m || 0,
    d: s.d || 0,
    count: Number(s[key]) || 0,
    status: (Number(s[key]) || 0) > 0 ? 'captured' : 'surveyed_no_capture',
    source: s.source || (s.preConstruct ? '麗陽站魚道建置前基線' : '橫流溪電捕監測'),
    scope: s.scope || '橫流溪調查樣站',
    note: fish_speciesScopedNote(s.note, speciesName)
  }));
}

function fish_annualSpeciesSeries(speciesName) {
  const timeline = fish_surveyTimeline(speciesName);
  const annual = new Map();
  timeline.forEach(row => {
    if (!annual.has(row.year)) annual.set(row.year, { year: row.year, count: 0, surveys: 0, captures: 0, sources: new Set() });
    const item = annual.get(row.year);
    item.count += row.count;
    item.surveys += 1;
    if (row.count > 0) item.captures += 1;
    if (row.source) item.sources.add(row.source);
  });
  return [...annual.values()].sort((a, b) => a.year - b.year).map(item => ({
    ...item,
    source: [...item.sources].join('、')
  }));
}

function fish_recordSum(records = []) {
  return records.reduce((sum, row) => sum + (Number(row.count) || 0), 0);
}

function fish_recordTimeValue(row = {}) {
  if (Number(row.year)) return (Number(row.year) * 10000) + ((Number(row.m) || 0) * 100) + (Number(row.d) || 0);
  const m = String(row.date || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return (Number(m[1]) * 10000) + (Number(m[2]) * 100) + Number(m[3]);
  return 0;
}

function fish_latestRecordLabel(records = []) {
  const latest = (records || []).slice().sort((a, b) => fish_recordTimeValue(a) - fish_recordTimeValue(b)).pop();
  return latest ? (latest.label || latest.date || '-') : '-';
}

function fish_canonicalDetailRecords(speciesName, dbRecords = [], surveyRecords = []) {
  if (Array.isArray(surveyRecords) && surveyRecords.length) {
    return surveyRecords.map(row => ({
      ...row,
      date: row.label || row.date || '',
      location: row.location || '橫流溪電捕監測樣站',
      method: row.method || '電捕',
      recorder: row.source || '橫流溪歷年調查序列',
      canonical: true
    }));
  }
  return (dbRecords || []).slice();
}

// ════════════════════════════════════════════════════════════════════════════
//  保育受脅等級「單一真實來源」— 依據《2024臺灣淡水魚類紅皮書名錄》國家類別
//  ----------------------------------------------------------------------------
//  grade＝紅皮書國家受脅等級（近危/易危/一般）；code＝官方代碼。
//  資料庫原 conservation 欄位多筆互相矛盾（同種有近危/易危/一般），且部分沿用
//  2017 舊版或全球 IUCN，與 2024 國家紅皮書不符。本表為唯一正確依據，於
//  fish_groupSpecies() 顯示層統一覆寫，確保各設備一致。
//
//  核對重點（2024 vs 平台原值）：
//   臺灣石魚賓 一般(NLC)  ← 原誤標近危
//   纓口臺鰍   近危(NNT)  ← 原誤標易危（2017為易危，2024下修近危）
//   臺灣間爬岩鰍 近危(NNT) ← 正確（2017易危→2024近危）
//   短臀瘋鱨   易危(NVU)  ← 正確（2017無危→2024上修易危）
//   短吻紅斑吻鰕虎 一般(NLC) ← 原誤標近危（係沿用IUCN全球NT；台灣國家為無危）
// ════════════════════════════════════════════════════════════════════════════
const HLX_FISH_REDLIST_2024 = {
  '臺灣白甲魚':   { grade:'近危', code:'NNT', endemic:true },
  '臺灣石魚賓':   { grade:'一般', code:'NLC', endemic:true },
  '臺灣鬚鱲':     { grade:'一般', code:'NLC', endemic:true },
  '纓口臺鰍':     { grade:'近危', code:'NNT', endemic:true },
  '臺灣間爬岩鰍': { grade:'近危', code:'NNT', endemic:true },
  '明潭吻鰕虎':   { grade:'一般', code:'NLC', endemic:true },
  '粗首馬口鱲':   { grade:'一般', code:'NLC', endemic:true },
  '短臀瘋鱨':     { grade:'易危', code:'NVU', endemic:true },
  '短吻紅斑吻鰕虎':{ grade:'一般', code:'NLC', endemic:true, note:'IUCN全球評估近危(NT)；2024臺灣國家紅皮書為國家無危(NLC)' },
};

/* ════════════════════════════════════════════════════════════════════════
   橫流溪調查現況（與保育等級分開陳述）
   ------------------------------------------------------------------------
   保育等級是「全臺族群尺度」的評估，依整體族群趨勢、分布範圍、棲地面積與
   破碎化程度等綜合判定；本河段調查數量多寡不能用來推翻或修改保育等級。
   兩者尺度不同，因此分成兩個欄位，避免讀者產生
   「既然是近危，為什麼這裡抓到很多？」的疑問。

   本函式僅描述該物種在橫流溪歷年調查中的出現情形，全部由原始序列推得：
     出現年度比例 ＝ 有捕獲紀錄的年度數 ÷ 已建檔年度數
     組成占比     ＝ 該物種累計尾數 ÷ 全部物種累計尾數
   ════════════════════════════════════════════════════════════════════════ */
function fish_hlxPresence(speciesName) {
  const key = Object.keys(HLX_FISH_KEY_NAME).find(k => HLX_FISH_KEY_NAME[k] === speciesName);
  if (!key) return null;
  const years = [...new Set(HLX_FISH_SURVEYS.map(r => r.year))].sort();
  const hitYears = years.filter(y =>
    HLX_FISH_SURVEYS.some(r => r.year === y && (Number(r[key]) || 0) > 0));
  const total = HLX_FISH_SURVEYS.reduce((a, r) => a + (Number(r[key]) || 0), 0);
  const grand = HLX_FISH_SURVEYS.reduce((a, r) => a + fish_sumKeys(r), 0);
  const share = grand ? total / grand * 100 : 0;
  const cover = years.length ? hitYears.length / years.length : 0;
  //  用語一律中性，描述「出現情形」而非優劣
  let label, tone;
  if (share >= 15 && cover >= 0.8)      { label = '主要優勢物種'; tone = '#1c5cab'; }
  else if (cover >= 0.8)                { label = '穩定出現';     tone = '#0891b2'; }
  else if (cover >= 0.5)                { label = '常見物種';     tone = '#0d9488'; }
  else if (cover > 0)                   { label = '偶見物種';     tone = '#7c3aed'; }
  else                                  { label = '本序列未記錄'; tone = '#94a3b8'; }
  return { label, tone, total, share, hitYears: hitYears.length, years: years.length,
           lastYear: hitYears.length ? hitYears[hitYears.length - 1] - 1911 : null };
}

function fish_redlist2024(speciesName) {
  return HLX_FISH_REDLIST_2024[speciesName] || { grade: '一般', code: 'NLC' };
}

function fish_groupSpecies() {
  const data = DB.getAll('fish').filter(f => fish_isPublishedSpecies(f.species));
  const species = {};
  data.forEach(f => {
    if (!species[f.species]) species[f.species] = { ...f, totalCount: 0, surveys: 0, records: [] };
    species[f.species].totalCount += Number(f.count) || 0;
    species[f.species].surveys++;
    species[f.species].records.push(f);
  });
  // ── 統籌核對：8 種發布物種的「累計尾數」對齊完整歷年電捕序列，與歷年趨勢分析一致 ──
  Object.values(species).forEach(s => {
    const full = HLX_FISH_FULL_TOTALS[s.species];
    if (full != null) {
      s.dbCount        = s.totalCount;        // 保留 DB 代表性快照合計（供核對）
      s.totalCount     = full;                // 對齊歷年趨勢分析完整累計
      s.totalSource    = `已核對量化電捕序列（103~114年・${HLX_FISH_SURVEY_EVENTS}次調查）`;
      s.reconciled     = s.dbCount !== full;
      // 捕獲明細與包含零捕獲的完整調查時間軸，兩者均與趨勢分析同源。
      s.surveyRecords  = fish_surveyBreakdown(s.species);
      s.surveyTimeline = fish_surveyTimeline(s.species);
      s.captureSurveyCount = s.surveyRecords.length;
      s.surveyCount    = s.surveyTimeline.length;
    }
    // ── 保育等級核對：統一覆寫為《2024臺灣淡水魚類紅皮書》國家受脅等級 ──
    const rl = HLX_FISH_REDLIST_2024[s.species];
    if (rl) {
      s.conservationRaw  = s.conservation;    // 保留原值（供核對）
      s.conservation     = rl.grade;          // 紅皮書國家受脅等級（近危/易危/一般）
      s.redlistCode      = rl.code;           // 官方代碼 NNT/NVU/NLC
      s.endemic          = !!rl.endemic;      // 台灣特有種
      s.redlistNote      = rl.note || '';     // 全球/國家差異等補充
      s.conservationFixed = s.conservationRaw && s.conservationRaw !== rl.grade;
    }
  });
  return species;
}

function fish_photoFor(f) {
  return FISH_PHOTO_LIBRARY[f.species] || FISH_PHOTO_LIBRARY[(f.species || '').replace(/（.*$/, '')] || {
    image: '/webapp/assets/fish-photos/field-measurement.jpg',
    source: '02_魚類與棲地資料庫／魚類調查影像',
    caption: '橫流溪魚類調查物種介紹'
  };
}

function fish_photoThumb(f) {
  const photo = fish_photoFor(f);
  const fallbackSrc = '/webapp/assets/fish-photos/field-measurement.jpg';
  return `
    <div class="fish-table-thumb" title="${fish_escape(photo.caption)}">
      <img src="${photo.image}" alt="${fish_escape(f.species)}調查照片" loading="lazy"
           style="object-position:${fish_escape(photo.position || 'center center')}"
           onerror="this.onerror=null;this.src='${fallbackSrc}'">
    </div>
  `;
}

function fish_newsCard(item) {
  const photo = fish_photoFor(item);
  const loc = fish_locationDetail(item);
  const surveyRecords = Array.isArray(item.surveyRecords) ? item.surveyRecords : [];
  const latestDateLabel = fish_latestRecordLabel(fish_canonicalDetailRecords(item.species, item.records || [], surveyRecords));
  const headline = fish_newsHeadline(item);
  const lead = fish_newsLead(item, loc);
  const colorMap = { '瀕危': '#b91c1c', '易危': '#c2410c', '近危': '#0369a1', '一般': '#15803d' };
  const color = colorMap[item.conservation] || '#475569';
  return `
    <article class="fish-news-card">
      <div class="fish-news-image" style="background-image:url('${photo.image}');background-position:${fish_escape(photo.position || 'center center')}" data-photo-src="${photo.image}">
        <span style="background:${color}">${fish_escape(item.conservation || '未分級')}</span>
      </div>
      <div class="fish-news-body">
        <div class="fish-news-kicker">${fish_escape(latestDateLabel || '調查資料')} · ${fish_escape(item.family || '魚類')}</div>
        <h4>${fish_escape(headline)}</h4>
        <p>${fish_escape(lead)}</p>
        <div class="fish-news-facts">
          <span><b>${Number(item.totalCount) || 0}</b> 尾次</span>
          <span><b>${item.surveys}</b> 筆記錄</span>
          <span>${fish_escape(loc.stationKm || loc.segment)}</span>
        </div>
        <div class="fish-news-note">${fish_escape(item.note || '')}</div>
        <div class="fish-news-source"><i class="fas fa-camera"></i> ${fish_escape(photo.source)}</div>
      </div>
    </article>
  `;
}

function fish_newsHeadline(item) {
  const species = item.species || '魚類';
  if (item.conservation && item.conservation !== '一般') {
    return `${species}現身橫流溪，成為溪流連通與棲地品質觀察焦點`;
  }
  if ((Number(item.totalCount) || 0) >= 30) {
    return `${species}族群穩定出現，反映橫流溪中上游仍具多樣棲地`;
  }
  return `${species}納入橫流溪魚類資料庫，補強溪流生態監測線索`;
}

function fish_newsLead(item, loc) {
  const count = Number(item.totalCount) || 0;
  const location = item.location || loc.segment;
  const habitatHint = (item.note || '').split('；').find(part => part.includes('偏好') || part.includes('底質') || part.includes('急流')) || '';
  return `依既有調查資料，${item.species}在${location}累計記錄${count}尾次，保育等級為${item.conservation || '未分級'}。${habitatHint || '本筆資料可作為魚道維護、棲地連通性與後續調查排程的參考。'}`;
}

function fish_newsStat(label, value, unit) {
  return `
    <div class="fish-news-stat">
      <strong>${value}</strong>
      <span>${label}（${unit}）</span>
    </div>
  `;
}

function renderFishMap() {
  const species = Object.values(fish_groupSpecies());
  const markers = fish_mapMarkers(species);
  const zoneStats = fish_mapZoneStats(markers);

  document.getElementById('fishTabContent').innerHTML = `
    <div class="fish-map-shell">
      <div class="fish-map-header">
        <div>
          <div style="font-size:12px;color:var(--text-muted);margin-bottom:4px">評比場域範圍：橫流溪 0K+460 ～ 1K+400 魚道、防砂設施、護岸、步道及平臺周邊</div>
          <h3 style="margin:0;font-size:20px;color:#0f172a">魚類分布與大概區位比較圖</h3>
        </div>
        <div class="fish-map-legend">
          ${fish_mapLegend('carp', '鯉科游泳型')}
          ${fish_mapLegend('minnow', '小型游泳型')}
          ${fish_mapLegend('goby', '底棲鰕虎型（魚類）')}
          ${fish_mapLegend('loach', '吸附岩鰍型')}
          ${fish_mapLegend('catfish', '鬍鬚夜行型')}
        </div>
      </div>

      <div class="fish-map-stage" aria-label="橫流溪魚類分布示意圖">
        <svg viewBox="0 0 1100 430" preserveAspectRatio="none" class="fish-map-svg" role="img">
          <defs>
            <linearGradient id="fishRiverGrad" x1="0" x2="1" y1="0" y2="0">
              <stop offset="0%" stop-color="#38bdf8"/>
              <stop offset="50%" stop-color="#0ea5e9"/>
              <stop offset="100%" stop-color="#0284c7"/>
            </linearGradient>
          </defs>
          <rect x="20" y="40" width="312" height="330" rx="20" fill="#ecfdf5" opacity=".9"/>
          <rect x="394" y="40" width="312" height="330" rx="20" fill="#eff6ff" opacity=".9"/>
          <rect x="768" y="40" width="312" height="330" rx="20" fill="#fff7ed" opacity=".9"/>
          <path d="M70 275 C150 185, 235 200, 320 240 S500 315, 590 235 S750 145, 830 225 S980 285, 1040 160" fill="none" stroke="#7c5f11" stroke-width="48" stroke-linecap="round" opacity=".78"/>
          <path d="M72 248 C160 170, 248 190, 322 226 S500 290, 585 210 S745 124, 828 200 S980 260, 1038 136" fill="none" stroke="url(#fishRiverGrad)" stroke-width="21" stroke-linecap="round"/>
          <path d="M72 248 C160 170, 248 190, 322 226 S500 290, 585 210 S745 124, 828 200 S980 260, 1038 136" fill="none" stroke="#e0f2fe" stroke-width="5" stroke-linecap="round" opacity=".86"/>
          ${fish_mapFacilityTicks()}
        </svg>
        ${markers.map(marker => fish_mapMarker(marker)).join('')}
      </div>

      <div class="fish-map-compare">
        ${fish_mapZoneCard('下游比較區', '0K+460～0K+740', zoneStats.lower, '之字形魚道、降壩魚道與下游緩流棲地')}
        ${fish_mapZoneCard('中游比較區', '0K+740～1K+170', zoneStats.middle, '階段式魚道、潛越式魚道與中游急流淺瀨')}
        ${fish_mapZoneCard('上游比較區', '1K+170～1K+400', zoneStats.upper, '斜坡式、階梯式、粗石斜曲面與舟通式魚道群')}
      </div>
    </div>
  `;
}

function fish_mapFacilityTicks() {
  const ticks = [
    [150, 292, '0K+460', '溪構8-1/8-2'],
    [260, 198, '0K+560', '溪構7'],
    [360, 250, '0K+740', '溪構6'],
    [542, 266, '1K+000', '溪構5'],
    [690, 160, '1K+170', '溪構4'],
    [760, 230, '1K+225', '溪構3'],
    [860, 242, '1K+315', '溪構2'],
    [995, 188, '1K+400', '溪構1-1/1-2']
  ];
  return ticks.map(([x, y, km, name]) => `
    <g>
      <line x1="${x}" y1="${y - 38}" x2="${x + 18}" y2="${y + 38}" stroke="#fff" stroke-width="8" stroke-linecap="round" stroke-dasharray="16 12"/>
      <circle cx="${x}" cy="${y}" r="5" fill="#fff" stroke="#0f172a" stroke-width="1"/>
      <text x="${x - 34}" y="${y - 48}" class="fish-map-km">${km}</text>
      <text x="${x - 42}" y="${y - 28}" class="fish-map-fac">${name}</text>
    </g>
  `).join('');
}

function fish_mapMarkers(species) {
  const zoneBase = {
    lower: { x: 18, y: 63, dx: 0, dy: 0 },
    middle: { x: 49, y: 58, dx: 0, dy: 0 },
    upper: { x: 80, y: 52, dx: 0, dy: 0 }
  };
  const offsets = [
    [-6, -10], [5, -6], [-2, 5], [8, 8], [-9, 9], [0, -18], [12, -16], [-14, -2], [15, 1]
  ];
  return species.map((item, index) => {
    const zone = fish_speciesZone(item);
    const base = zoneBase[zone];
    const off = offsets[index % offsets.length];
    return {
      ...item,
      zone,
      x: Math.max(5, Math.min(94, base.x + off[0])),
      y: Math.max(18, Math.min(82, base.y + off[1])),
      shape: fish_speciesShape(item),
      size: Math.max(42, Math.min(76, 42 + Math.sqrt(Number(item.totalCount) || 1) * 4))
    };
  });
}

function fish_speciesZone(item) {
  const text = [item.location, item.note, ...(item.records || []).map(r => r.location || '')].join(' ');
  if (text.includes('全流域')) return 'upper';
  if (text.includes('1K+170') || text.includes('1K+225') || text.includes('1K+315') || text.includes('1K+400') || text.includes('上游') || text.includes('急流段')) return 'upper';
  if (text.includes('0K+460') || text.includes('下游') || text.includes('緩流')) return 'lower';
  return 'middle';
}

function fish_speciesShape(item) {
  const name = item.species || '';
  const family = item.family || '';
  if (name.includes('岩鰍')) return 'loach';
  if (name.includes('鮠') || name.includes('鱨') || family.includes('鱨科')) return 'catfish';
  if (name.includes('鰕虎') || family.includes('鰕虎')) return 'goby';
  if (name.includes('石魚賓')) return 'carp';
  if (name.includes('馬口') || name.includes('鱲')) return 'minnow';
  return 'carp';
}

function fish_mapMarker(marker) {
  return `
    <div class="fish-map-marker fish-shape-${marker.shape}" style="left:${marker.x}%;top:${marker.y}%;width:${marker.size}px;height:${marker.size}px" title="${fish_escape(marker.species)}｜${marker.totalCount}尾次｜${marker.location}">
      ${fish_speciesSvg(marker.shape)}
      <span>${fish_escape(marker.species)}</span>
    </div>
  `;
}

function fish_speciesSvg(shape) {
  const palette = {
    carp: ['#2563eb', '#93c5fd'],
    minnow: ['#0f766e', '#99f6e4'],
    goby: ['#a16207', '#fde68a'],
    loach: ['#7c3aed', '#ddd6fe'],
    catfish: ['#334155', '#cbd5e1']
  }[shape] || ['#2563eb', '#bfdbfe'];
  if (shape === 'goby') {
    // 明確魚形：大圓頭鰕虎型底棲魚，背鰭＋腹吸盤＋單眼，避免誤認為蝦形
    return `<svg viewBox="0 0 96 58" aria-hidden="true"><ellipse cx="46" cy="30" rx="34" ry="13" fill="${palette[0]}"/><ellipse cx="18" cy="30" rx="16" ry="14" fill="${palette[0]}"/><polygon points="78,30 94,16 92,44" fill="${palette[0]}"/><path d="M30 17 L46 7 L62 15" fill="${palette[1]}"/><ellipse cx="30" cy="43" rx="10" ry="5" fill="${palette[1]}" opacity=".88"/><circle cx="12" cy="24" r="5" fill="#111827"/><circle cx="11" cy="23" r="2" fill="#e0f2fe"/><path d="M36 24 C50 20 64 22 76 28" stroke="${palette[1]}" stroke-width="2.5" fill="none" opacity=".75"/></svg>`;
  }
  if (shape === 'loach') {
    return `<svg viewBox="0 0 96 58" aria-hidden="true"><ellipse cx="45" cy="31" rx="38" ry="11" fill="${palette[0]}"/><ellipse cx="26" cy="31" rx="20" ry="13" fill="${palette[1]}"/><polygon points="80,31 94,23 94,39" fill="${palette[0]}"/><circle cx="19" cy="28" r="3" fill="#111827"/><path d="M28 42 C43 52 58 52 72 42" stroke="${palette[1]}" stroke-width="4" fill="none" stroke-linecap="round"/></svg>`;
  }
  if (shape === 'catfish') {
    return `<svg viewBox="0 0 96 58" aria-hidden="true"><ellipse cx="48" cy="30" rx="34" ry="13" fill="${palette[0]}"/><polygon points="79,30 94,18 92,43" fill="${palette[0]}"/><circle cx="20" cy="27" r="3" fill="#f8fafc"/><path d="M20 34 C8 40 4 46 1 52 M21 33 C8 33 3 32 0 30 M21 32 C9 25 5 20 2 16" stroke="${palette[1]}" stroke-width="2.4" fill="none" stroke-linecap="round"/><path d="M38 18 L52 6 L50 22" fill="${palette[1]}" opacity=".9"/></svg>`;
  }
  return `<svg viewBox="0 0 96 58" aria-hidden="true"><ellipse cx="48" cy="29" rx="35" ry="14" fill="${palette[0]}"/><polygon points="78,29 94,14 92,44" fill="${palette[0]}"/><path d="M38 18 L52 4 L55 20" fill="${palette[1]}"/><path d="M42 40 L55 54 L58 39" fill="${palette[1]}"/><circle cx="20" cy="25" r="3" fill="#f8fafc"/><path d="M26 22 C38 17 54 18 70 24" stroke="${palette[1]}" stroke-width="3" fill="none" opacity=".85"/></svg>`;
}

function fish_mapZoneStats(markers) {
  const stats = {
    lower: { count: 0, species: [] },
    middle: { count: 0, species: [] },
    upper: { count: 0, species: [] }
  };
  markers.forEach(marker => {
    stats[marker.zone].count += Number(marker.totalCount) || 0;
    stats[marker.zone].species.push(marker);
  });
  Object.values(stats).forEach(zone => {
    zone.species.sort((a, b) => (Number(b.totalCount) || 0) - (Number(a.totalCount) || 0));
  });
  return stats;
}

function fish_mapZoneCard(title, range, stat, note) {
  const dominant = stat.species.slice(0, 3).map(item => `${item.species} ${item.totalCount}尾`).join('、') || '尚無資料';
  const sensitive = stat.species.filter(item => item.conservation && item.conservation !== '一般').length;
  return `
    <div class="fish-zone-card">
      <div class="fish-zone-title">${fish_escape(title)}</div>
      <div class="fish-zone-range">${fish_escape(range)}</div>
      <div class="fish-zone-metrics">
        <span><b>${stat.species.length}</b> 種</span>
        <span><b>${stat.count}</b> 尾次</span>
        <span><b>${sensitive}</b> 敏感/保育</span>
      </div>
      <p>${fish_escape(note)}</p>
      <div class="fish-zone-dominant"><b>主要物種：</b>${fish_escape(dominant)}</div>
    </div>
  `;
}

function fish_mapLegend(shape, label) {
  return `
    <span class="fish-map-legend-item fish-shape-${shape}">
      ${fish_speciesSvg(shape)}
      ${fish_escape(label)}
    </span>
  `;
}

function fish_escape(value) {
  return String(value ?? '').replace(/[&<>"']/g, ch => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[ch]));
}

function injectFishNewsStyles() {
  if (document.getElementById('fishNewsStyles')) return;
  const style = document.createElement('style');
  style.id = 'fishNewsStyles';
  style.textContent = `
    .fish-table-thumb{width:90px;height:64px;border-radius:6px;overflow:hidden;background:#e5e7eb;border:1px solid #dbe3ef}
    .fish-table-thumb img{width:100%;height:100%;object-fit:cover;display:block}
    .fish-card-photo{height:150px;background-size:cover;background-position:center;border-radius:8px 8px 0 0;position:relative}
    .fish-card-photo-caption{position:absolute;left:8px;right:8px;bottom:8px;background:rgba(15,23,42,.74);color:#fff;font-size:11px;line-height:1.4;padding:5px 7px;border-radius:5px}
    .fish-news-toolbar{display:flex;justify-content:space-between;align-items:flex-start;gap:16px;flex-wrap:wrap;margin-bottom:16px}
    .fish-news-stats{display:flex;gap:8px;flex-wrap:wrap}
    .fish-news-stat{min-width:96px;background:#fff;border:1px solid #e5e7eb;border-radius:8px;padding:8px 10px;text-align:center}
    .fish-news-stat strong{display:block;font-size:20px;color:#155e75}
    .fish-news-stat span{font-size:11px;color:#64748b}
    .fish-news-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:14px}
    .fish-news-card{background:#fff;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;box-shadow:0 2px 10px rgba(15,23,42,.06)}
    .fish-news-image{height:180px;background-size:cover;background-position:center;position:relative}
    .fish-news-image span{position:absolute;left:10px;top:10px;color:#fff;font-size:12px;font-weight:700;padding:4px 8px;border-radius:999px}
    .fish-news-body{padding:13px 14px}
    .fish-news-kicker{font-size:11px;color:#64748b;margin-bottom:5px}
    .fish-news-body h4{font-size:17px;line-height:1.35;margin:0 0 8px;color:#0f172a}
    .fish-news-body p{font-size:13px;line-height:1.7;color:#334155;margin:0 0 10px}
    .fish-news-facts{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:9px}
    .fish-news-facts span{font-size:11px;background:#f1f5f9;color:#334155;border-radius:999px;padding:3px 7px}
    .fish-news-note{font-size:12px;color:#64748b;line-height:1.55;background:#f8fafc;border-left:3px solid #0e7490;padding:7px 8px;border-radius:0 5px 5px 0;max-height:76px;overflow:hidden}
    .fish-news-source{font-size:11px;color:#64748b;margin-top:8px}
    .fish-map-shell{display:flex;flex-direction:column;gap:14px}
    .fish-map-header{display:flex;align-items:flex-start;justify-content:space-between;gap:14px;flex-wrap:wrap}
    .fish-map-legend{display:flex;gap:8px;flex-wrap:wrap;max-width:620px}
    .fish-map-legend-item{display:flex;align-items:center;gap:5px;background:#fff;border:1px solid #e5e7eb;border-radius:999px;padding:5px 8px;font-size:12px;color:#334155}
    .fish-map-legend-item svg{width:34px;height:22px}
    .fish-map-stage{position:relative;min-height:430px;border:1px solid #dbe3ef;border-radius:8px;overflow:hidden;background:linear-gradient(135deg,#f8fafc,#eef7f2);box-shadow:0 2px 12px rgba(15,23,42,.08)}
    .fish-map-stage:before{content:"";position:absolute;inset:0;background-image:url('/webapp/assets/fish-photos/field-measurement.jpg');background-size:cover;background-position:center;opacity:.11}
    .fish-map-svg{position:absolute;inset:0;width:100%;height:100%;z-index:1}
    .fish-map-zone-title{font-size:22px;font-weight:700;fill:#0f172a}
    .fish-map-km{font-size:17px;font-weight:700;fill:#0f172a;stroke:#fff;stroke-width:4px;paint-order:stroke}
    .fish-map-fac{font-size:12px;fill:#334155;stroke:#fff;stroke-width:3px;paint-order:stroke}
    .fish-map-marker{position:absolute;z-index:3;transform:translate(-50%,-50%);filter:drop-shadow(0 5px 6px rgba(15,23,42,.28));cursor:default}
    .fish-map-marker svg{width:100%;height:70%;display:block}
    .fish-map-marker span{position:absolute;left:50%;top:74%;transform:translateX(-50%);white-space:nowrap;background:rgba(15,23,42,.78);color:#fff;font-size:11px;font-weight:700;border-radius:999px;padding:2px 6px}
    .fish-shape-carp svg,.fish-shape-minnow svg{transform:rotate(-5deg)}
    .fish-shape-goby svg,.fish-shape-loach svg{transform:rotate(3deg)}
    .fish-map-compare{display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:12px}
    .fish-zone-card{background:#fff;border:1px solid #e5e7eb;border-radius:8px;padding:12px;box-shadow:0 2px 10px rgba(15,23,42,.05)}
    .fish-zone-title{font-size:16px;font-weight:700;color:#0f172a;margin-bottom:2px}
    .fish-zone-range{font-size:12px;color:#64748b;margin-bottom:8px}
    .fish-zone-metrics{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px}
    .fish-zone-metrics span{font-size:11px;background:#ecfeff;color:#155e75;border:1px solid #cffafe;border-radius:999px;padding:3px 7px}
    .fish-zone-card p{font-size:12px;color:#475569;line-height:1.6;margin:0 0 8px}
    .fish-zone-dominant{font-size:12px;color:#334155;line-height:1.55}
    @media (max-width:760px){.fish-map-stage{min-height:520px}.fish-map-marker span{font-size:10px}.fish-map-zone-title{font-size:18px}}
  `;
  document.head.appendChild(style);
}

/* 根據里程取得代表 TWD97 座標描述 */
function kmMap_twd97(km) {
  const map = {
    '0K+460':'TWD97 X:240716, Y:2674967',
    '0K+510':'TWD97 X:240716, Y:2675013',
    '0K+560':'TWD97 X:240704, Y:2675063',
    '0K+740':'TWD97 X:240785, Y:2675146',
    '1K+000':'TWD97 X:240812, Y:2675353',
    '1K+170':'TWD97 X:240832, Y:2675493',
    '1K+225':'TWD97 X:240873, Y:2675532',
    '1K+265':'TWD97 X:240858, Y:2675575',
    '1K+315':'TWD97 X:240819, Y:2675607',
    '1K+400':'TWD97 X:240786, Y:2675695',
  };
  return map[km] || '';
}

function openFishForm(id = null) {
  const f = id ? DB.getById('fish', id) : {};
  document.getElementById('modalTitle').textContent = id ? '編輯魚類記錄' : '新增魚類記錄';
  document.getElementById('modalBody').innerHTML = `
    <div class="form-grid">
      <div class="form-group"><label>物種名稱 *</label><input id="fi_species" type="text" value="${f.species || ''}" placeholder="例：臺灣白甲魚"></div>
      <div class="form-group"><label>學名</label><input id="fi_scientific" type="text" value="${f.scientificName || ''}" placeholder="Onychostoma barbatulum"></div>
      <div class="form-group"><label>科別</label><input id="fi_family" type="text" value="${f.family || ''}" placeholder="鯉科"></div>
      <div class="form-group"><label>保育等級</label>
        <select id="fi_conservation">
          ${['一般','近危','易危','瀕危'].map(c => `<option value="${c}" ${f.conservation===c?'selected':''}>${c}</option>`).join('')}
        </select>
      </div>
      <div class="form-group full-width"><label>調查位置 *</label><input id="fi_location" type="text" value="${f.location || ''}" placeholder="橫流溪上游"></div>
      <div class="form-group"><label>尾數</label><input id="fi_count" type="number" value="${f.count || ''}" min="0"></div>
      <div class="form-group"><label>調查日期</label><input id="fi_date" type="date" value="${f.date || ''}"></div>
      <div class="form-group"><label>調查方法</label>
        <select id="fi_method">
          ${['電魚','目視','投網','其他'].map(m => `<option value="${m}" ${f.method===m?'selected':''}>${m}</option>`).join('')}
        </select>
      </div>
      <div class="form-group"><label>記錄者</label><input id="fi_recorder" type="text" value="${f.recorder || ''}"></div>
      <div class="form-group full-width"><label>備註</label><textarea id="fi_note" rows="2">${f.note || ''}</textarea></div>
    </div>
  `;
  document.getElementById('modalFooter').innerHTML = `
    <button class="btn btn-outline" onclick="closeModal()">取消</button>
    <button class="btn btn-primary" onclick="saveFish(${id || 'null'})"><i class="fas fa-save"></i> 儲存</button>
  `;
  openModal();
}

function saveFish(id) {
  const species = document.getElementById('fi_species').value.trim();
  const location = document.getElementById('fi_location').value.trim();
  if (!species || !location) { showToast('請填寫必填欄位', 'error'); return; }
  const item = {
    species, location,
    scientificName: document.getElementById('fi_scientific').value.trim(),
    family: document.getElementById('fi_family').value.trim(),
    conservation: document.getElementById('fi_conservation').value,
    count: parseInt(document.getElementById('fi_count').value) || 0,
    date: document.getElementById('fi_date').value,
    method: document.getElementById('fi_method').value,
    recorder: document.getElementById('fi_recorder').value.trim(),
    note: document.getElementById('fi_note').value.trim(),
    photos: []
  };
  if (id) { DB.update('fish', id, item); showToast('記錄已更新', 'success'); }
  else { DB.insert('fish', item); showToast('記錄已新增', 'success'); }
  closeModal(); loadFishTable();
}

function deleteFish(id) {
  const f = DB.getById('fish', id);
  if (!confirm(`確定要刪除「${f?.species}」記錄嗎？`)) return;
  DB.delete('fish', id);
  showToast('記錄已刪除', 'info');
  loadFishTable();
}

// ── 統計卡點擊行為 ──────────────────────────────────────────
function fish_statClick(action) {
  if (action === 'trend') {
    const btn = [...document.querySelectorAll('.tab-btn')].find(b => b.textContent.includes('歷年趨勢'));
    if (btn) switchFishTab('trend', btn);
    return;
  }
  if (action === 'protected') {
    const cf = document.getElementById('fishConservationFilter');
    if (cf) {
      // cycle through protected levels; first click → 易危, already on protected → clear
      const current = cf.value;
      if (!current || current === '一般') {
        // Show first protected level; user can use dropdown to drill further
        cf.value = '';
        loadFishTable();
        showToast('點擊右側篩選下拉選單可進一步過濾保育等級', 'info');
        // Scroll search bar into view
        const sel = document.getElementById('fishConservationFilter');
        if (sel) { sel.style.borderColor = '#dc2626'; setTimeout(() => { sel.style.borderColor = ''; }, 2000); }
        // Filter to non-一般 via JS (temporary inline filter)
        fish_filterProtected();
      } else {
        cf.value = '';
        loadFishTable();
      }
    }
    return;
  }
  // Default: clear filter and show all
  const kw = document.getElementById('fishSearch');
  const cf = document.getElementById('fishConservationFilter');
  if (kw) kw.value = '';
  if (cf) cf.value = '';
  loadFishTable();
}

function fish_filterProtected() {
  let data = DB.getAll('fish');
  data = data.filter(f => f.conservation && f.conservation !== '一般');
  const cMap = { '瀕危':['#b91c1c','#fee2e2'], '易危':['#d97706','#fef9c3'], '近危':['#2563eb','#dbeafe'], '一般':['#16a34a','#dcfce7'] };
  if (!data.length) {
    document.getElementById('fishTable').innerHTML = '<div class="empty-state"><i class="fas fa-fish"></i><p>查無保育類記錄</p></div>';
    return;
  }
  const TREND_SPECIES = new Set(['臺灣白甲魚','臺灣石魚賓','臺灣鬚鱲','纓口臺鰍','臺灣間爬岩鰍']);
  document.getElementById('fishTable').innerHTML = `
    <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:10px 16px;margin-bottom:12px;font-size:14px;color:#991b1b">
      <i class="fas fa-shield-halved" style="margin-right:6px"></i>
      篩選中：保育類物種（${[...new Set(data.map(f=>f.species))].length} 種，共 ${data.length} 筆記錄）
      <button onclick="fish_statClick('')" style="margin-left:12px;padding:3px 10px;border:1px solid #fca5a5;border-radius:6px;background:#fff;color:#991b1b;cursor:pointer;font-size:13px">顯示全部</button>
    </div>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:18px;padding:4px 0">
      ${data.map(f => {
        const photo = fish_photoFor(f);
        const fallback = '/webapp/assets/fish-photos/field-measurement.jpg';
        const [ccl, cbg] = cMap[f.conservation] || ['#475569','#f1f5f9'];
        const cardId = `fishcard_prot_${f.id}`;
        const inTrend = TREND_SPECIES.has(f.species);
        return `
          <div style="background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 2px 12px rgba(15,23,42,.1);border:2px solid ${ccl}33;display:flex;flex-direction:column">
            <div style="position:relative;height:190px;overflow:hidden;background:#e5e7eb;cursor:pointer" onclick="openFishSpeciesDetail(this.dataset.species)" data-species="${fish_escape(f.species)}">
              <img src="${photo.image}" alt="${fish_escape(f.species)}"
                style="width:100%;height:100%;object-fit:cover;object-position:${fish_escape(photo.position||'center center')};transition:transform .3s"
                onerror="this.src='${fallback}'"
                onmouseover="this.style.transform='scale(1.04)'" onmouseout="this.style.transform='scale(1)'">
              <div style="position:absolute;top:12px;right:12px">
                <span style="background:${ccl};color:#fff;font-size:15px;font-weight:800;padding:5px 14px;border-radius:999px;box-shadow:0 2px 8px rgba(0,0,0,.25)">${f.conservation||'一般'}</span>
              </div>
              <div style="position:absolute;top:12px;left:12px">
                <span style="background:rgba(15,23,42,.72);color:#fff;font-size:13px;padding:4px 10px;border-radius:999px">${f.family||'-'}</span>
              </div>
            </div>
            <div style="padding:16px 18px 12px;flex:1;cursor:pointer" onclick="openFishSpeciesDetail(this.dataset.species)" data-species="${fish_escape(f.species)}">
              <div style="font-size:22px;font-weight:800;color:#0f172a;margin-bottom:4px">${fish_escape(f.species)}</div>
              <div style="font-size:14px;font-style:italic;color:#64748b;margin-bottom:12px">${fish_escape(f.scientificName||'')}</div>
              <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:12px">
                <div style="background:#f0fdfa;border-radius:8px;padding:10px 8px;text-align:center">
                  <div style="font-size:26px;font-weight:900;color:#0e7490;line-height:1">${f.count}</div>
                  <div style="font-size:12px;color:#64748b;margin-top:2px">尾數</div>
                </div>
                <div style="background:#f8fafc;border-radius:8px;padding:10px 8px;text-align:center">
                  <div style="font-size:14px;font-weight:700;color:#0f172a;line-height:1.3">${f.date}</div>
                  <div style="font-size:12px;color:#64748b;margin-top:2px">調查日期</div>
                </div>
                <div style="background:#f8fafc;border-radius:8px;padding:10px 8px;text-align:center">
                  <div style="font-size:12px;font-weight:600;color:#334155">${fish_escape((f.recorder||'-').replace('成果報告','').replace('生態調查','').trim())}</div>
                  <div style="font-size:12px;color:#64748b;margin-top:2px">記錄來源</div>
                </div>
              </div>
              <div style="font-size:14px;color:#334155;background:#f8fafc;border-left:3px solid #0e7490;padding:8px 12px;border-radius:0 6px 6px 0;line-height:1.5">
                <i class="fas fa-map-marker-alt" style="color:#0e7490;margin-right:4px"></i>${fish_escape(f.location||'-')}
              </div>
              ${inTrend ? `
              <div style="margin-top:10px">
                <button onclick="event.stopPropagation();fish_jumpToTrend('${fish_escape(f.species)}')"
                  style="width:100%;padding:8px;border:1px solid #b45309;border-radius:8px;background:#fef3c7;color:#92400e;font-size:14px;font-weight:700;cursor:pointer">
                  <i class="fas fa-chart-line"></i> 查看歷年趨勢
                </button>
              </div>` : ''}
            </div>
            <div id="${cardId}" style="display:none;border-top:1px solid #e2e8f0;padding:14px 18px;background:#f8fafc">
              <div style="font-size:13px;color:#64748b;margin-bottom:4px;font-weight:600">詳細資訊</div>
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:14px">
                <div><span style="color:#94a3b8">科別：</span><b>${fish_escape(f.family||'-')}</b></div>
                <div><span style="color:#94a3b8">保育等級：</span><span style="color:${ccl};font-weight:700">${fish_escape(f.conservation||'-')}</span></div>
                <div style="grid-column:1/-1"><span style="color:#94a3b8">學名：</span><em>${fish_escape(f.scientificName||'-')}</em></div>
                ${f.note ? `<div style="grid-column:1/-1;background:#ecfdf5;border-left:3px solid #16a34a;padding:8px 10px;border-radius:0 6px 6px 0;color:#166534;font-size:13px;line-height:1.6">${fish_escape(f.note)}</div>` : ''}
              </div>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

function fish_openAIQA(question) {
  const panel = document.getElementById('aiChatPanel');
  if (panel && !panel.classList.contains('open')) toggleAIChat();
  setTimeout(() => {
    const input = document.getElementById('aiInput');
    if (!input) return;
    input.value = question;
    if (typeof aiSend === 'function') aiSend();
  }, 180);
}

function fish_jumpToTrend(speciesName) {
  const btn = [...document.querySelectorAll('.tab-btn')].find(b => b.textContent.includes('歷年趨勢'));
  if (btn) {
    switchFishTab('trend', btn);
    setTimeout(() => {
      const primaryMap = { '臺灣白甲魚':'bai','臺灣石魚賓':'shi','臺灣鬚鱲':'xu','纓口臺鰍':'ying','臺灣間爬岩鰍':'jian' };
      const secondarySet = new Set(['明潭吻鰕虎','短臀瘋鱨','短吻紅斑吻鰕虎']);
      if (primaryMap[speciesName]) {
        const badge = document.querySelector(`[data-species-key="${primaryMap[speciesName]}"]`);
        if (badge) { badge.style.outline = '3px solid #f59e0b'; badge.scrollIntoView({ behavior:'smooth', block:'center' }); }
      } else if (secondarySet.has(speciesName)) {
        // 詳細物種趨勢區目前不對外顯示，導向仍可見的年度魚類總覽圖。
        const target = document.getElementById('fishTrendBar')?.closest('[style*="border"]');
        if (target) {
          target.style.outline = '3px solid #f59e0b';
          target.scrollIntoView({ behavior: 'smooth', block: 'center' });
          setTimeout(() => { target.style.outline = ''; }, 2500);
        }
      }
    }, 650);
  }
}

// ── 陸域・水域生物分布圖（含互動地圖） ─────────────────────────────────────

let biogisMap = null;
let bioLayerGroups = {};
let bioLayerVisible = { facilities: true, landanimals: true, fishspecies: false, fishwayDist: true };

const BIO_LAND_DATA = [
  {
    category: '濱溪植物',
    icon: 'fa-seedling',
    color: '#166534',
    bg: '#dcfce7',
    border: '#bbf7d0',
    items: [
      { name: '原生種植物', detail: '60 種，含臺灣特有種 4 種', tag: '原生' },
      { name: '歸化種植物', detail: '30 種，外來歸化植物', tag: '歸化' },
      { name: '豐林橋沿線植被', detail: '上下游各 200m，37 科 90 種', tag: '全域' }
    ]
  },
  {
    category: '水棲昆蟲（成蟲）',
    icon: 'fa-bug',
    color: '#854d0e',
    bg: '#fef9c3',
    border: '#fde68a',
    items: [
      { name: '魚蛉科', detail: 'Corydalidae，偏好清澈流水岸邊', tag: '指標' },
      { name: '石蠅科', detail: 'Perlidae，高水質敏感指標種', tag: '指標' },
      { name: '春蜓科', detail: 'Gomphidae，蜻蛉目，沿岸成蟲', tag: '指標' }
    ]
  },
  {
    category: '兩棲爬蟲（河岸帶）',
    icon: 'fa-frog',
    color: '#0f766e',
    bg: '#ccfbf1',
    border: '#99f6e4',
    items: [
      { name: '蛙類', detail: '河岸植被帶常見，夜間活動', tag: '兩棲' },
      { name: '蜥蜴類', detail: '草叢及岩石縫隙棲息', tag: '爬蟲' }
    ]
  },
  {
    category: '鳥類（濱溪帶）',
    icon: 'fa-dove',
    color: '#1d4ed8',
    bg: '#dbeafe',
    border: '#bfdbfe',
    items: [
      { name: '藍腹鷳', detail: 'Lophura swinhoii，珍貴稀有保育類一級，紅外線相機記錄', tag: '一級保育' },
      { name: '翠鳥', detail: 'Alcedo atthis，溪流魚食性鳥類', tag: '魚食' },
      { name: '鉛色水鶇', detail: '溪流岩石棲息，特有亞種', tag: '特有' },
      { name: '白鶺鴒', detail: '河岸灘地活動', tag: '常見' }
    ]
  },
  {
    category: '大型哺乳類（紅外線相機記錄）',
    icon: 'fa-paw',
    color: '#92400e',
    bg: '#fef3c7',
    border: '#fde68a',
    items: [
      { name: '穿山甲', detail: 'Manis pentadactyla，保育類一級，紅外線相機記錄', tag: '一級保育' },
      { name: '臺灣野山羊', detail: 'Capricornis swinhoei，臺灣特有種，保育類二級', tag: '特有' },
      { name: '食蟹獴', detail: 'Herpestes urva，保育類二級，溪旁棲息', tag: '二級保育' },
      { name: '臺灣野兔', detail: 'Lepus sinensis formosanus，濱溪草叢夜行性', tag: '特有' },
      { name: '臺灣野豬', detail: 'Sus scrofa taivanus，山林夜行性，紅外線相機記錄', tag: '常見' },
      { name: '臺灣黑熊', detail: 'Ursus thibetanus formosanus，瀕危物種，大雪山保育行動研討', tag: '瀕危' }
    ]
  },
  {
    category: '臺灣黑熊・大雪山監測',
    icon: 'fa-paw',
    color: '#292524',
    bg: '#fafaf9',
    border: '#d6d3d1',
    items: [
      { name: '棲息範圍', detail: '大雪山及谷關為臺灣中北部核心棲地，西部開發區與山村部落・登山步道・遊樂區高度重疊，人熊共域', tag: '瀕危' },
      { name: '繫放個體', detail: '104年起共追蹤10隻（6♂4♀）；112年3月新增4隻，其中93681(♀)・93686(♂)累積完整一年連續軌跡', tag: '監測' },
      { name: '活動軌跡', detail: '主要活動集中於200林道南側至台8線北側；春夏活動範圍較小，秋冬明顯擴大；具趨避林道現象', tag: '軌跡' },
      { name: '相機調查', detail: '42台紅外線相機・32個4×4km網格，17台拍到黑熊；遊客中心周邊推估至少4個體，發現4處直徑80-100cm熊窩', tag: '相機' },
      { name: 'AI黑熊預警', detail: '大雪山遊客中心・住宿餐廳區・小雪山49K共設15台4G即時相機，AI辨識誤判率0.104%，LINE自動通報即時應變', tag: 'AI' }
    ]
  },
  {
    category: '鳥音監測・臺灣鳥類地圖',
    icon: 'fa-microphone',
    color: '#7c3aed',
    bg: '#f5f3ff',
    border: '#ddd6fe',
    items: [
      { name: '臺灣鳥類地圖計畫', detail: 'Taiwan Bird Atlas，網格調查法，全球93國推動超過600項計畫', tag: '調查' },
      { name: '自動錄音機監測', detail: '超輕量錄音機，藍芽APP操控，可用於伐採跡地聲景監測', tag: '儀器' },
      { name: '紅外線相機協作', detail: '搭配自動相機可蒐集更完整的野生動物資訊', tag: '複合' }
    ]
  }
];

const BIO_WATER_DATA = [
  {
    category: '水域魚類',
    icon: 'fa-fish',
    color: '#0e7490',
    bg: '#cffafe',
    border: '#a5f3fc',
    dynamic: true
  },
  {
    category: '水棲昆蟲（幼蟲）',
    icon: 'fa-bug',
    color: '#374151',
    bg: '#f1f5f9',
    border: '#cbd5e1',
    items: [
      { name: '刮食者（Sc）', detail: '藻類刮食，47%（A區）', tag: '功能群' },
      { name: '捕食者（Pr）', detail: '魚食天敵，40%（B、D、F區）', tag: '功能群' },
      { name: '集食性採食者（Cg）', detail: '有機碎屑，50%（G區）', tag: '功能群' },
      { name: '共記錄 25 科 352 隻', detail: '113年4月 D樣區（階段式魚道），水質「極好」', tag: '指標' }
    ]
  },
  {
    category: '甲殼類',
    icon: 'fa-shrimp',
    color: '#b45309',
    bg: '#fef3c7',
    border: '#fde68a',
    items: [
      { name: '日月潭澤蟹', detail: 'Nanhaipotamon formosanum，台灣特有種，IUCN易危（VU）；109~114年累計21隻；偏好礫石底質淺瀨，陷阱法捕獲；St.1最多（8隻）', tag: '保育' },
      { name: '粗糙沼蝦', detail: 'Macrobrachium asperulum，本土種，清潔水質指標；109~114年累計351隻（為蝦蟹類最多物種）；6樣站均有分布，St.6最多（83隻）；陷阱法捕獲', tag: '指標' }
    ]
  }
];

/* ══════════════════════════════════════════════════════════
   陸域生物 tab  — 鳥類・兩棲爬蟲・哺乳類・昆蟲
   ══════════════════════════════════════════════════════════ */
const LAND_LIFE_DATA = [
  {
    category: '鳥類', icon: 'fa-dove', color: '#1d4ed8', bg: '#eff6ff', border: '#bfdbfe',
    count: 16, source: '期中報告書 p.220–225',
    summary: '調查記錄溪流型及濱溪型鳥類16種，包含國家珍貴稀有保育類物種。',
    items: [
      { name: '鉛色水鶇', sci: 'Phoenicurus fuliginosus', tag: '二級保育', note: '溪流型代表性鳥類，沿溪流石塊間覓食' },
      { name: '翠鳥',     sci: 'Alcedo atthis',          tag: '特有亞種', note: '溪濱常見捕魚型猛禽，以小魚為食' },
      { name: '藍腹鷴',   sci: 'Lophura swinhoii',       tag: '二級保育', note: '臺灣特有種，森林型鳥類，偶見於溪旁' },
      { name: '紅嘴黑鵯', sci: 'Hypsipetes leucocephalus', tag: '常見',   note: '濱溪帶灌叢，取食漿果與昆蟲' },
      { name: '小白鷺',   sci: 'Egretta garzetta',        tag: '常見',   note: '涉禽型，於淺溪覓食魚蝦' },
      { name: '大冠鷲',   sci: 'Spilornis cheela',        tag: '二級保育', note: '猛禽類，盤旋於溪谷上空' },
      { name: '白鶺鴒',   sci: 'Motacilla alba',          tag: '常見',   note: '河岸地表活動，追食小型昆蟲' },
      { name: '白腹秧雞', sci: 'Amaurornis phoenicurus',  tag: '常見',   note: '近水草叢活動' },
      { name: '夜鷺',     sci: 'Nycticorax nycticorax',   tag: '常見',   note: '夜行性涉禽，溪流石塊棲息' },
      { name: '五色鳥',   sci: 'Psilopogon nuchalis',     tag: '特有種', note: '臺灣特有種，濱溪帶闊葉樹洞繁殖' },
      { name: '山紅頭',   sci: 'Cyanoderma ruficeps',     tag: '特有亞種', note: '濱溪灌叢鳥種' },
      { name: '竹鳥',     sci: 'Pomatorhinus musicus',    tag: '特有種', note: '臺灣特有種，竹林及灌叢' },
      { name: '褐頭鷦鶯', sci: 'Prinia inornata',         tag: '常見',   note: '草叢地帶常見' },
      { name: '灰喉山椒鳥', sci: 'Pericrocotus solaris', tag: '特有亞種', note: '中高海拔林緣活動' },
      { name: '小啄木',   sci: 'Yungipicus canicapillus', tag: '特有亞種', note: '濱溪闊葉林啄木' },
      { name: '臺灣畫眉', sci: 'Garrulax taewanus',       tag: '特有種', note: '一級保育，濱溪灌叢' }
    ]
  },
  {
    category: '兩棲爬蟲類', icon: 'fa-frog', color: '#0f766e', bg: '#f0fdfa', border: '#99f6e4',
    count: 9, source: '期中報告書 p.226–229',
    summary: '記錄溪流型及陸域型兩棲爬蟲9種，夜間調查蛙類為主要調查方法。',
    items: [
      { name: '梭德氏赤蛙', sci: 'Rana sauteri',             tag: '特有種', note: '溪流型兩棲，礫石底床繁殖' },
      { name: '斯文豪氏赤蛙', sci: 'Odorrana swinhoana',     tag: '特有種', note: '溪岸岩石棲息，鳴聲似鳥叫' },
      { name: '褡裢樹蛙', sci: 'Rhacophorus arvalis',        tag: '特有種', note: '樹棲型，橫流溪濱溪帶灌叢' },
      { name: '面天樹蛙', sci: 'Kurixalus idiootocus',       tag: '特有種', note: '樹棲型，低海拔溪岸灌叢' },
      { name: '拉都希氏赤蛙', sci: 'Rana latouchii',         tag: '常見',  note: '靜水水域及濱溪草地' },
      { name: '臺灣爬岩鰍守宮', sci: '-',                    tag: '近危',  note: '岩壁棲息，夜行性' },
      { name: '高砂蛇',   sci: 'Oligodon formosanus',        tag: '特有種', note: '中低海拔林緣及溪岸' },
      { name: '臺灣草蜥', sci: 'Takydromus formosanus',      tag: '特有種', note: '草叢型蜥蜴，日行性' },
      { name: '龜殼花',   sci: 'Trimeresurus mucrosquamatus', tag: '常見',  note: '毒蛇，夜間溪岸活動' }
    ]
  },
  {
    category: '哺乳類', icon: 'fa-paw', color: '#92400e', bg: '#fffbeb', border: '#fde68a',
    count: 6, source: '期中報告書 p.230–232；紅外線相機（石虎另引石虎族群監測計畫）',
    summary: '紅外線自動相機記錄大型哺乳類5種，穿山甲為最重要保育物種，臺灣黑熊為瀕危物種；另列石虎為鄰近保育廊道物種。',
    items: [
      { name: '臺灣穿山甲', sci: 'Manis pentadactyla',       tag: '一級保育', note: '極度瀕危，橫流溪工作站周邊影像紀錄' },
      { name: '臺灣黑熊',   sci: 'Ursus thibetanus formosanus', tag: '瀕危', note: '大雪山地區繫放追蹤，104年起共10隻，112年新增4隻完整軌跡' },
      { name: '食蟹獴',     sci: 'Herpestes urva',           tag: '二級保育', note: '溪岸活動，捕食魚蟹及兩棲類' },
      { name: '臺灣山羌',   sci: 'Muntiacus reevesi micrurus', tag: '特有亞種', note: '夜間紅外線相機記錄' },
      { name: '臺灣野豬',   sci: 'Sus scrofa taivanus',      tag: '常見',   note: '溪岸泥地拱土痕跡及紅外線影像' },
      { name: '石虎',       sci: 'Prionailurus bengalensis', tag: '瀕危',   note: '國家瀕臨絕種保育類；資料來源為臺中西部淺山保育軸帶烏溪流域石虎族群監測計畫，橫流溪棲地連通工程有助維持廊道連續性，非本溪紅外線相機p.230–232同批直接記錄' }
    ]
  },
  {
    category: '陸域昆蟲', icon: 'fa-bug', color: '#854d0e', bg: '#fef9c3', border: '#fde047',
    count: 17, source: '期中報告書 p.233；網捕法＋掃網法',
    summary: '調查陸域昆蟲17種（含水棲昆蟲），以鱗翅目、鞘翅目及蜻蛉目為主。',
    items: [
      { name: '寬腹蜻蜓', sci: 'Lyriothemis pachygastra',    tag: '指標',  note: '清潔溪流指標性蜻蜓' },
      { name: '粗鉤春蜓', sci: 'Davidius moiwanus',          tag: '特有種', note: '溪流型蜻蜓目，礫石底床繁殖' },
      { name: '霧社血斑天牛', sci: 'Chlorophorus muscosus',  tag: '特有種', note: '老熟林木蛀食害蟲' },
      { name: '大圓翅鍬形蟲', sci: 'Neolucanus maximus',     tag: '特有亞種', note: '闊葉林腐木繁殖' },
      { name: '黃裳鳳蝶', sci: 'Troides aeacus',             tag: '二級保育', note: '臺灣最大鳳蝶，寄主植物為馬兜鈴' },
      { name: '臺灣寬尾鳳蝶', sci: 'Agehana maraho',         tag: '一級保育', note: '臺灣特有種，國蝶，台灣穗花杉寄主' },
      { name: '枯葉蝶',   sci: 'Kallima inachus',            tag: '常見',  note: '溪岸落葉林，擬態枯葉' },
      { name: '臺灣紋白蝶', sci: 'Pieris canidia',           tag: '常見',  note: '農地及灌叢邊緣' },
      { name: '蜉蝣目（數種）', sci: 'Ephemeroptera spp.',   tag: '指標',  note: '水質指標生物，成蟲壽命極短' },
      { name: '石蠅（數種）', sci: 'Plecoptera spp.',        tag: '指標',  note: '低溫清澈急流指標，對污染敏感' },
      { name: '毛翅目（數種）', sci: 'Trichoptera spp.',     tag: '指標',  note: '築巢石蛾，水質B級以上棲地' },
      { name: '魚蛉',     sci: 'Corydalus spp.',             tag: '指標',  note: '大型水棲昆蟲，指標性肉食性' },
      { name: '短翅蟋蟀', sci: 'Velarifictorus spp.',        tag: '常見',  note: '濱溪草地夜間鳴叫' },
      { name: '臺灣大鍬', sci: 'Dorcus grandis formosanus',  tag: '特有亞種', note: '老熟殼斗科木材繁殖' },
      { name: '獨角仙',   sci: 'Allomyrina dichotoma',       tag: '常見',  note: '闊葉林樹液吸食' },
      { name: '斑紋蟬（數種）', sci: 'Cicadidae spp.',       tag: '常見',  note: '樹液吸食，夏季鳴聲明顯' },
      { name: '埋葬蟲（數種）', sci: 'Nicrophorus spp.',     tag: '常見',  note: '腐食性甲蟲，分解有機質' },
    ]
  }
];

let landLifeMap = null;

/* 物種辨識代表照（中文名→英文維基頁名，經 REST API 取縮圖）。
   ※ 依使用者要求：照片補於政府物種頁卡下方，畫面不顯示來源文字；
     來源僅保留於圖片 title 提示（CC 授權之最小化標示）。 */
const LAND_CAT_WIKI = {
  '鳥類':       'Taiwan_barbet',
  '兩棲爬蟲類': 'Rhacophorus_arvalis',
  '哺乳類':     'Chinese_pangolin',
  '陸域昆蟲':   'Troides_aeacus'
};
const LAND_WIKI_TITLES = {
  /* 鳥類 */
  '鉛色水鶇':   'Plumbeous_water_redstart',
  '翠鳥':       'Common_kingfisher',
  '藍腹鷴':     "Swinhoe's_pheasant",
  '紅嘴黑鵯':   'Black_bulbul',
  '小白鷺':     'Little_egret',
  '大冠鷲':     'Crested_serpent_eagle',
  '白鶺鴒':     'White_wagtail',
  '白腹秧雞':   'White-breasted_waterhen',
  '夜鷺':       'Black-crowned_night_heron',
  '五色鳥':     'Taiwan_barbet',
  '山紅頭':     'Rufous-capped_babbler',
  '竹鳥':       'Taiwan_wren-babbler',
  '褐頭鷦鶯':   'Plain_prinia',
  '灰喉山椒鳥': 'Grey-chinned_minivet',
  '小啄木':     'Grey-capped_pygmy_woodpecker',
  '臺灣畫眉':   'Taiwan_hwamei',
  /* 兩棲爬蟲 */
  '梭德氏赤蛙': 'Nidirana_adenopleura',
  '斯文豪氏赤蛙': 'Odorrana_swinhoana',
  '褡裢樹蛙':   'Rhacophorus_arvalis',
  '面天樹蛙':   'Kurixalus_idiootocus',
  '拉都希氏赤蛙': 'Rana_latouchii',
  '臺灣草蜥':   'Takydromus_formosanus',
  '龜殼花':     'Chinese_habu',
  '高砂蛇':     'Oligodon_formosanus',
  '臺灣爬岩鰍守宮': 'Gekko_japonicus',
  /* 哺乳類 */
  '臺灣穿山甲': 'Chinese_pangolin',
  '食蟹獴':     'Crab-eating_mongoose',
  '臺灣山羌':   "Reeve's_muntjac",
  '臺灣野豬':   'Wild_boar',
  '臺灣黑熊':   'Formosan_black_bear',
  '石虎':       'Leopard_cat',
  /* 昆蟲 */
  '黃裳鳳蝶':   'Troides_aeacus',
  '臺灣寬尾鳳蝶': 'Papilio_maraho',
  '枯葉蝶':     'Orange_oakleaf',
  '獨角仙':     'Japanese_rhinoceros_beetle',
  '寬腹蜻蜓':   'Lyriothemis',
  '粗鉤春蜓':   'Gomphidae',
  '臺灣紋白蝶': 'Pieris_canidia',
  '霧社血斑天牛': 'Chlorophorus',
  '大圓翅鍬形蟲': 'Lucanus_formosanus',
  '蜉蝣目（數種）': 'Mayfly',
  '石蠅（數種）': 'Stonefly',
  '毛翅目（數種）': 'Caddisfly',
  '魚蛉':       'Dobsonfly',
  '短翅蟋蟀':   'Cricket_(insect)',
  '斑紋蟬（數種）': 'Cicada',
  '埋葬蟲（數種）': 'Nicrophorus'
};
const DIRECT_PHOTO_URLS = {
  '臺灣大鍬': { src: 'http://gagaphoto.com/9806/985.jpg' }
};

/* ════════════════════════════════════════════════════════════════════════════
   政府物種頁對照表  GOV_SPECIES（取代 Wikimedia Commons／Wikipedia 影像來源）
   ────────────────────────────────────────────────────────────────────────────
   來源：TaiCOL 台灣物種名錄（api.taicol.tw），農業部生物多樣性研究所維運。
   以各物種學名解析烘焙出官方 taxon_id；卡片改連至官方物種頁（分類·照片·分布），
   採「政府資料開放授權條款第1版」，屬具規模、政府同意之開放資料來源。
   ※ 代表照「內嵌」需 TaiEOL 臺灣生命大百科檢索服務（目前機房維護中）恢復後，
     以同法烘焙 og:image 靜態網址補上；服務未恢復前一律呈現官方物種頁連結卡，
     即「能取得政府代表照則內嵌，否則官方連結卡」之漸進策略。
   ════════════════════════════════════════════════════════════════════════════ */
const GOV_SPECIES = {
  /* 陸域生物 */
  '鉛色水鶇': { code:'t0098449', sci:'Phoenicurus fuliginosus' },
  '翠鳥': { code:'t0099912', sci:'Alcedo atthis' },
  '藍腹鷴': { code:'t0067882', sci:'Lophura swinhoii' },
  '紅嘴黑鵯': { code:'t0097352', sci:'Hypsipetes leucocephalus' },
  '小白鷺': { code:'t0096829', sci:'Egretta garzetta' },
  '大冠鷲': { code:'t0098934', sci:'Spilornis cheela' },
  '白鶺鴒': { code:'t0096454', sci:'Motacilla alba' },
  '白腹秧雞': { code:'t0099934', sci:'Amaurornis phoenicurus' },
  '夜鷺': { code:'t0098099', sci:'Nycticorax nycticorax' },
  '五色鳥': { code:'t0037193', sci:'Psilopogon nuchalis' },
  '山紅頭': { code:'t0097878', sci:'Cyanoderma ruficeps' },
  '竹鳥': { code:'t0036478', sci:'Pomatorhinus musicus' },
  '褐頭鷦鶯': { code:'t0098583', sci:'Prinia inornata' },
  '灰喉山椒鳥': { code:'t0098391', sci:'Pericrocotus solaris' },
  '小啄木': { code:'t0096707', sci:'Yungipicus canicapillus' },
  '臺灣畫眉': { code:'t0064313', sci:'Garrulax taewanus' },
  '梭德氏赤蛙': { code:'t0032420', sci:'Rana sauteri' },
  '斯文豪氏赤蛙': { code:'t0031239', sci:'Odorrana swinhoana' },
  '褡裢樹蛙': { code:'t0028607', sci:'Zhangixalus arvalis' },
  '面天樹蛙': { code:'t0027255', sci:'Kurixalus idiootocus' },
  '拉都希氏赤蛙': { code:'t0029786', sci:'Hylarana latouchii' },
  '高砂蛇': { code:'t0031261', sci:'Oligodon formosanus' },
  '臺灣草蜥': { code:'t0046739', sci:'Takydromus formosanus' },
  '龜殼花': { code:'t0036854', sci:'Protobothrops mucrosquamatus' },
  '臺灣穿山甲': { code:'t0096289', sci:'Manis pentadactyla' },
  '臺灣黑熊': { code:'t0096631', sci:'Ursus thibetanus' },
  '食蟹獴': { code:'t0097258', sci:'Urva urva' },
  '臺灣山羌': { code:'t0096460', sci:'Muntiacus reevesi' },
  '臺灣野豬': { code:'t0099008', sci:'Sus scrofa' },
  '寬腹蜻蜓': { code:'t0022125', sci:'Lyriothemis' },
  '霧社血斑天牛': { code:'t0011829', sci:'Chlorophorus' },
  '大圓翅鍬形蟲': { code:'t0096537', sci:'Neolucanus maximus' },
  '黃裳鳳蝶': { code:'t0096580', sci:'Troides aeacus' },
  '臺灣寬尾鳳蝶': { code:'t0031476', sci:'Papilio maraho' },
  '枯葉蝶': { code:'t0095965', sci:'Kallima inachus' },
  '臺灣紋白蝶': { code:'t0031917', sci:'Pieris canidia' },
  '蜉蝣目（數種）': { code:'t0001849', sci:'Ephemeroptera' },
  '石蠅（數種）': { code:'t0002075', sci:'Plecoptera' },
  '毛翅目（數種）': { code:'t0002216', sci:'Trichoptera' },
  '短翅蟋蟀': { code:'t0018044', sci:'Velarifictorus' },
  '臺灣大鍬': { code:'t0018893', sci:'Dorcus' },
  '獨角仙': { code:'t0099921', sci:'Allomyrina dichotoma' },
  '斑紋蟬（數種）': { code:'t0005634', sci:'Cicadidae' },
  '埋葬蟲（數種）': { code:'t0013099', sci:'Nicrophorus' },
  /* 陸域植生 */
  '五節芒': { code:'t0054476', sci:'Miscanthus floridulus' },
  '大花咸豐草': { code:'t0072858', sci:'Bidens pilosa' },
  '構樹': { code:'t0040466', sci:'Broussonetia papyrifera' },
  '竹葉草': { code:'t0054632', sci:'Oplismenus compositus' },
  '狗尾草': { code:'t0055330', sci:'Setaria viridis' },
  '星毛蕨': { code:'t0026955', sci:'Christella parasitica' },
  '銀合歡': { code:'t0054221', sci:'Leucaena leucocephala' },
  '野桐': { code:'t0058499', sci:'Mallotus japonicus' },
  '山黃麻': { code:'t0069669', sci:'Trema orientalis' },
  '金絲草': { code:'t0054901', sci:'Pogonatherum crinitum' },
  '九芎': { code:'t0054164', sci:'Lagerstroemia subcostata' },
  '土密樹': { code:'t0040451', sci:'Bridelia tomentosa' },
  '烏毛蕨': { code:'t0027051', sci:'Blechnopsis orientalis' },
  '密花苧麻': { code:'t0059098', sci:'Pouzolzia zeylanica' },
  '九節木': { code:'t0054987', sci:'Psychotria rubra' },
  '小花蔓澤蘭': { code:'t0054468', sci:'Mikania micrantha' },
  '水柳': { code:'t0055196', sci:'Salix warburgii' },
  '山葛': { code:'t0054996', sci:'Pueraria montana' },
};
const GOV_SPECIES_SOURCE = '資料來源：TaiCOL 台灣物種名錄（農業部生物多樣性研究所）｜政府資料開放授權條款第1版';
/* 各分類群代表物種（用於分類橫幅連結卡） */
const LAND_CAT_REP = { '鳥類':'五色鳥', '兩棲爬蟲類':'褡裢樹蛙', '哺乳類':'臺灣穿山甲', '陸域昆蟲':'黃裳鳳蝶' };

function govSpeciesPage(code){ return 'https://taicol.tw/zh-hant/taxon/' + code; }

/* 政府物種頁連結卡：取代外部照片內嵌（Commons/Wikipedia）。
   name=顯示名；code=TaiCOL taxon_id；h=高度px；compact=精簡樣式 */
function govSpeciesCard(name, code, h){
  if (!code) {
    return `<div style="height:${h}px;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:6px;background:#f8fafc;color:#94a3b8">
      <i class="fas fa-clipboard-list" style="font-size:24px"></i><span style="font-size:12px">物種資料</span></div>`;
  }
  const url = govSpeciesPage(code);
  return `<a href="${url}" target="_blank" rel="noopener noreferrer" onclick="event.stopPropagation()"
      title="於 TaiCOL 台灣物種名錄查看 ${fish_escape(name)} 的官方分類、照片與分布（農業部生物多樣性研究所）"
      style="height:${h}px;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:7px;text-decoration:none;
             background:linear-gradient(135deg,#ecfdf5,#d1fae5)">
      <i class="fas fa-landmark" style="font-size:24px;color:#047857;opacity:.9"></i>
      <span style="font-size:13px;font-weight:800;color:#047857">TaiCOL 官方物種頁</span>
      <span style="font-size:11px;color:#059669;text-align:center;line-height:1.3">農業部生物多樣性研究所<br>政府開放資料 · 分類／照片／分布</span>
      <span style="font-size:10px;color:#10b981"><i class="fas fa-up-right-from-square" style="font-size:9px;margin-right:3px"></i>點擊前往官方頁</span>
    </a>`;
}

/* 載入物種辨識代表照（維基 REST 縮圖）。畫面不顯示來源文字，
   來源僅置於圖片 title 提示；載入成功才顯示，失敗則維持隱藏（僅留政府連結卡）。 */
async function _loadLandLifePhotos() {
  const imgs = document.querySelectorAll('[data-wiki]');
  const seen = new Set();
  for (const img of imgs) {
    const title = img.dataset.wiki;
    if (!title || seen.has(title)) continue;
    seen.add(title);
    try {
      const res = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`);
      if (!res.ok) continue;
      const data = await res.json();
      const src = data.thumbnail?.source || data.originalimage?.source;
      const hires = data.originalimage?.source || src;
      if (!src) continue;
      document.querySelectorAll(`[data-wiki="${CSS.escape(title)}"]`).forEach(el => {
        el.src = src;
        el.style.display = 'block';
        if (hires) el.setAttribute('data-hires', hires);
        const wrap = el.closest('[data-photowrap]');
        if (wrap) wrap.style.display = 'block';
      });
    } catch(e) { /* 略過失敗項目 */ }
  }
}

/* 照片放大燈箱（不顯示來源文字） */
function landPhotoLightbox(name, imgSrc) {
  const lb  = document.getElementById('landLightbox');
  const img = document.getElementById('landLightboxImg');
  const cap = document.getElementById('landLightboxCaption');
  if (!lb || !img || !imgSrc) return;
  img.src = imgSrc;
  img.alt = name || '';
  if (cap) cap.innerHTML = `<strong style="font-size:18px;color:#f8fafc">${name || ''}</strong>`;
  lb.style.display = 'flex';
  document.body.style.overflow = 'hidden';
}

function renderLandLife() {
  const container = document.getElementById('fishTabContent');
  const totalSpecies = LAND_LIFE_DATA.reduce((s, cat) => s + cat.count, 0);

  container.innerHTML = `
    <!-- 統計橫幅 -->
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:10px;margin-bottom:20px">
      ${[
        ['fa-dove',   '#1d4ed8','#eff6ff', '16 種', '鳥類'],
        ['fa-frog',   '#0f766e','#f0fdfa',  '9 種', '兩棲爬蟲'],
        ['fa-paw',    '#92400e','#fffbeb',  '6 種', '哺乳類'],
        ['fa-bug',    '#854d0e','#fef9c3', '17 種', '陸域昆蟲'],
        ['fa-layer-group','#7c3aed','#f5f3ff', `${totalSpecies} 種`, '合計物種']
      ].map(([ic,col,bg,val,lbl]) => `
        <div style="background:${bg};border-radius:12px;padding:16px 14px;display:flex;align-items:center;gap:12px">
          <div style="font-size:26px;color:${col}"><i class="fas ${ic}"></i></div>
          <div>
            <div style="font-size:24px;font-weight:900;color:${col};line-height:1">${val}</div>
            <div style="font-size:18px;color:#64748b">${lbl}</div>
          </div>
        </div>`).join('')}
    </div>

    <!-- 來源說明 -->
    <div style="background:#f8faff;border:1px solid #c7d2fe;border-left:4px solid #6366f1;border-radius:10px;padding:12px 16px;margin-bottom:20px;font-size:19px;color:#4338ca">
      <i class="fas fa-book-open" style="margin-right:7px"></i>
      <strong>資料來源：</strong>橫流溪動物通道及周邊設施檢查效能智慧評估 第三次期中報告書（114年）— 陸域生態調查章節<br>
      <span style="font-size:20px;color:#6366f1"><i class="fas fa-landmark" style="margin:0 5px 0 1px"></i>物種分類與官方物種頁：TaiCOL 台灣物種名錄（農業部生物多樣性研究所）｜政府資料開放授權條款第1版；卡片照片為物種辨識代表影像</span>
    </div>

    <!-- 物種分類卡 -->
    ${LAND_LIFE_DATA.map((cat, catIdx) => {
      return `
      <div style="margin-bottom:20px;border:1px solid ${cat.border};border-left:5px solid ${cat.color};border-radius:12px;background:${cat.bg};overflow:hidden">
        <!-- 分類標題（點擊收合） -->
        <div style="padding:16px 20px;display:flex;align-items:center;gap:14px;cursor:pointer"
          onclick="landCatToggle(${catIdx})">
          <div style="width:52px;height:52px;border-radius:14px;background:${cat.color}22;display:flex;align-items:center;justify-content:center;flex-shrink:0">
            <i class="fas ${cat.icon}" style="color:${cat.color};font-size:26px"></i>
          </div>
          <div style="flex:1">
            <div style="font-size:22px;font-weight:900;color:#0f172a">${cat.category}</div>
            <div style="font-size:18px;color:#64748b;margin-top:2px">${cat.summary}</div>
          </div>
          <div style="text-align:right">
            <div style="font-size:28px;font-weight:900;color:${cat.color}">${cat.count} 種</div>
            <div id="landcat_${catIdx}_arrow" style="font-size:20px;color:#94a3b8">▲ 收合</div>
          </div>
          <button data-q="${fish_escape('橫流溪'+cat.category+'：'+cat.summary+'的物種組成、生態特色與保育重點')}" onclick="event.stopPropagation();fish_openAIQA(this.getAttribute('data-q'))" style="margin-left:4px;padding:6px 10px;border:1.5px solid #6366f1;border-radius:8px;background:#f5f3ff;color:#4f46e5;font-size:18px;font-weight:700;cursor:pointer;flex-shrink:0"><i class="fas fa-robot"></i> AI</button>
        </div>
        <!-- 物種列表（預設展開） -->
        <div id="landcat_${catIdx}" style="padding:0 16px 16px;display:block">
          <!-- 代表照片橫幅（淺色系） -->
          <div style="margin-bottom:14px;border-radius:12px;overflow:hidden;position:relative;height:160px;
                      background:${cat.bg};border:2px solid ${cat.border};display:flex;align-items:center">
            <!-- 左側：文字區（固定顯示） -->
            <div style="padding:20px 28px;z-index:2;flex:0 0 auto">
              <div style="display:flex;align-items:center;gap:12px;margin-bottom:6px">
                <i class="fas ${cat.icon}" style="font-size:36px;color:${cat.color};opacity:0.85"></i>
                <div style="font-size:40px;font-weight:900;color:${cat.color};line-height:1">${cat.category}</div>
              </div>
              <div style="font-size:20px;font-weight:700;color:${cat.color};opacity:0.7;margin-left:48px">代表物種</div>
            </div>
            <!-- 右側：代表照（載入後顯示，無來源文字；漸層融入背景） -->
            <div data-photowrap data-name="${cat.category}"
              style="position:absolute;right:0;top:0;bottom:0;width:52%;display:none;overflow:hidden;cursor:zoom-in"
              onclick="(function(w){var i=w.querySelector('img');if(i&&i.src)landPhotoLightbox(w.dataset.name,i.getAttribute('data-hires')||i.src)})(this)">
              <img data-wiki="${LAND_CAT_WIKI[cat.category] || ''}" alt="${cat.category}" title="${cat.category}"
                src="" style="width:100%;height:100%;object-fit:cover;display:none">
              <div style="position:absolute;inset:0;background:linear-gradient(to right,${cat.bg} 0%,${cat.bg}88 25%,transparent 55%);pointer-events:none"></div>
            </div>
            <!-- 背景大圖示裝飾 -->
            <i class="fas ${cat.icon}" style="position:absolute;right:54%;top:50%;transform:translateY(-50%);
              font-size:120px;color:${cat.color};opacity:0.06;pointer-events:none"></i>
          </div>
          <div style="font-size:20px;color:#94a3b8;margin-bottom:10px">
            <i class="fas fa-database" style="margin-right:4px"></i>${cat.source}
          </div>
          <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:10px">
            ${cat.items.map(item => {
              const tagColors = {
                '一級保育': ['#fee2e2','#b91c1c'], '二級保育': ['#fef3c7','#b45309'],
                '瀕危': ['#fee2e2','#b91c1c'], '近危': ['#dbeafe','#1d4ed8'],
                '特有種': ['#dcfce7','#166534'], '特有亞種': ['#dcfce7','#059669'],
                '指標': ['#fce7f3','#9d174d'], '常見': ['#f1f5f9','#475569']
              };
              const [tbg, tcl] = tagColors[item.tag] || ['#f1f5f9','#475569'];
              return `
                <div style="background:#fff;border:1px solid #e2e8f0;border-radius:10px;overflow:hidden">
                  <div style="position:relative">
                    ${govSpeciesCard(item.name, (GOV_SPECIES[item.name]||{}).code, 118)}
                  </div>
                  ${(() => {
                    const wk = LAND_WIKI_TITLES[item.name] || '';
                    const dp = DIRECT_PHOTO_URLS[item.name] || null;
                    if (!wk && !dp) return '';
                    return `<div data-photowrap data-name="${item.name}"
                      style="height:140px;overflow:hidden;background:#f1f5f9;display:${dp ? 'block' : 'none'};position:relative;cursor:zoom-in;border-top:1px solid #e2e8f0"
                      onclick="(function(w){var i=w.querySelector('img');if(i&&i.src)landPhotoLightbox(w.dataset.name,i.getAttribute('data-hires')||i.src)})(this)">
                      <img ${wk ? `data-wiki="${wk}"` : ''} alt="${item.name}" title="${item.name}"
                        src="${dp ? dp.src : ''}" style="width:100%;height:100%;object-fit:cover;display:${dp ? 'block' : 'none'}">
                      <div style="position:absolute;bottom:6px;right:8px;pointer-events:none">
                        <i class="fas fa-search-plus" style="color:rgba(255,255,255,0.85);font-size:19px;text-shadow:0 1px 3px rgba(0,0,0,.6)"></i>
                      </div>
                    </div>`;
                  })()}
                  <div style="padding:12px 14px">
                    <div style="display:flex;align-items:flex-start;gap:8px;margin-bottom:6px">
                      <div style="flex:1">
                        <div style="font-size:22px;font-weight:800;color:#0f172a">${item.name}</div>
                        ${item.sci && item.sci !== '-' ? `<div style="font-size:18px;font-style:italic;color:#94a3b8;margin-top:2px">${item.sci}</div>` : ''}
                      </div>
                      <span style="background:${tbg};color:${tcl};border-radius:999px;padding:3px 10px;font-size:18px;font-weight:700;white-space:nowrap;flex-shrink:0">${item.tag}</span>
                    </div>
                    <div style="font-size:19px;color:#64748b;border-top:1px solid #f1f5f9;padding-top:6px">${item.note}</div>
                    <button data-q="${fish_escape(item.name+'的生態特性、在橫流溪的分布現況與保育意義')}" onclick="event.stopPropagation();fish_openAIQA(this.getAttribute('data-q'))" style="margin-top:8px;width:100%;padding:6px;border:1px solid #6366f1;border-radius:7px;background:#f5f3ff;color:#4f46e5;font-size:18px;font-weight:700;cursor:pointer">💬 AI問答</button>
                  </div>
                </div>`;
            }).join('')}
          </div>
        </div>
      </div>`;
    }).join('')}

    <!-- 調查方法說明 -->
    <div style="background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:16px 20px;margin-top:4px;margin-bottom:20px">
      <div style="font-size:19px;font-weight:700;color:#334155;margin-bottom:10px">
        <i class="fas fa-info-circle" style="color:#6366f1;margin-right:7px"></i>調查方法說明
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:10px;font-size:19px;color:#475569">
        <div><i class="fas fa-binoculars" style="color:#1d4ed8;margin-right:5px"></i><strong>鳥類：</strong>樣點計數法＋穿越線法</div>
        <div><i class="fas fa-moon" style="color:#0f766e;margin-right:5px"></i><strong>兩棲爬蟲：</strong>夜間穿越線調查法</div>
        <div><i class="fas fa-camera" style="color:#92400e;margin-right:5px"></i><strong>哺乳類：</strong>紅外線自動相機 ×6 台</div>
        <div><i class="fas fa-bug" style="color:#854d0e;margin-right:5px"></i><strong>昆蟲：</strong>網捕法＋燈誘法＋掃網</div>
        <div><i class="fas fa-calendar" style="color:#334155;margin-right:5px"></i><strong>調查時間：</strong>114年4–9月（春夏兩季）</div>
        <div><i class="fas fa-map-marker-alt" style="color:#dc2626;margin-right:5px"></i><strong>調查範圍：</strong>橫流溪動物通道上下游500m</div>
      </div>
    </div>

  `;

  // 建立／重用 lightbox DOM
  if (!document.getElementById('landLightbox')) {
    const lb = document.createElement('div');
    lb.id = 'landLightbox';
    lb.style.cssText = 'display:none;position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,0.93);cursor:zoom-out;align-items:center;justify-content:center;flex-direction:column;gap:16px;padding:20px';
    lb.innerHTML = `
      <button id="landLightboxCloseBtn" style="position:absolute;top:14px;right:18px;background:rgba(255,255,255,0.12);border:none;color:#fff;font-size:26px;cursor:pointer;width:42px;height:42px;border-radius:50%;display:flex;align-items:center;justify-content:center">&times;</button>
      <img id="landLightboxImg" src="" alt="" style="max-width:90vw;max-height:76vh;object-fit:contain;border-radius:10px;box-shadow:0 8px 48px rgba(0,0,0,0.7)">
      <div id="landLightboxCaption" style="color:#e2e8f0;font-size:19px;text-align:center;max-width:620px;line-height:1.6"></div>`;
    lb.addEventListener('click', e => { if (e.target === lb) landLightboxClose(); });
    lb.querySelector('#landLightboxCloseBtn').addEventListener('click', landLightboxClose);
    document.body.appendChild(lb);
    document.addEventListener('keydown', e => { if (e.key === 'Escape') landLightboxClose(); });
  }

  setTimeout(() => { _loadLandLifePhotos(); }, 200);
}


function landLightboxClose() {
  const lb = document.getElementById('landLightbox');
  if (lb) lb.style.display = 'none';
  document.body.style.overflow = '';
}

function landCatToggle(idx) {
  const body = document.getElementById('landcat_' + idx);
  const arrow = document.getElementById('landcat_' + idx + '_arrow');
  if (!body) return;
  const isOpen = body.style.display !== 'none';
  body.style.display = isOpen ? 'none' : 'block';
  if (arrow) arrow.textContent = isOpen ? '▼ 展開' : '▲ 收合';
}

function _initLandLifeMap() {
  const el = document.getElementById('landLifeMap');
  if (!el || typeof L === 'undefined') return;
  if (landLifeMap) { try { landLifeMap.remove(); } catch(_) {} landLifeMap = null; }

  landLifeMap = L.map('landLifeMap', { zoomControl: true, scrollWheelZoom: true })
    .setView([24.181, 120.909], 15);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors', maxZoom: 19
  }).addTo(landLifeMap);

  /* 觀測點定義 */
  const landPts = [
    /* 鳥類 */
    { lat:24.1755, lng:120.9076, type:'bird',   icon:'fa-dove',  color:'#1d4ed8', bg:'#eff6ff',
      name:'鳥類觀測 A', species:'鉛色水鶇・翠鳥（溪流型）', method:'樣點計數', season:'全年' },
    { lat:24.1816, lng:120.9067, type:'bird',   icon:'fa-dove',  color:'#1d4ed8', bg:'#eff6ff',
      name:'鳥類觀測 B', species:'翠鳥・白鶺鴒（濱溪帶）', method:'穿越線法', season:'春夏' },
    /* 兩棲爬蟲 */
    { lat:24.1768, lng:120.9092, type:'amphib', icon:'fa-frog',  color:'#0f766e', bg:'#f0fdfa',
      name:'兩棲爬蟲 A', species:'梭德氏赤蛙・斯文豪氏赤蛙', method:'夜間穿越線', season:'夏季' },
    { lat:24.1833, lng:120.9108, type:'amphib', icon:'fa-frog',  color:'#0f766e', bg:'#f0fdfa',
      name:'兩棲爬蟲 B', species:'褡裢樹蛙・龜殼花（夜調）', method:'夜間穿越線', season:'春夏' },
    /* 哺乳類 */
    { lat:24.1798, lng:120.9114, type:'mammal', icon:'fa-paw',   color:'#92400e', bg:'#fffbeb',
      name:'哺乳類 A（紅外線相機）', species:'臺灣穿山甲・食蟹獴・山羌', method:'紅外線自動相機', season:'全年' },
    { lat:24.1845, lng:120.9082, type:'mammal', icon:'fa-paw',   color:'#92400e', bg:'#fffbeb',
      name:'哺乳類 B（紅外線相機）', species:'臺灣野豬・臺灣山羌', method:'紅外線自動相機', season:'全年' },
    /* 昆蟲 */
    { lat:24.1793, lng:120.9100, type:'insect', icon:'fa-bug',   color:'#854d0e', bg:'#fef9c3',
      name:'昆蟲調查 A', species:'魚蛉・石蠅・春蜓（指標種）', method:'網捕法＋掃網', season:'春夏' },
    { lat:24.1860, lng:120.9095, type:'insect', icon:'fa-bug',   color:'#854d0e', bg:'#fef9c3',
      name:'昆蟲調查 B', species:'蜉蝣・毛翅目・黃裳鳳蝶', method:'燈誘法', season:'夏秋' }
  ];

  landPts.forEach(pt => {
    const markerIcon = L.divIcon({
      className: '',
      html: `<div style="width:42px;height:42px;border-radius:50%;background:${pt.bg};border:3px solid ${pt.color};
               display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,.25)">
               <i class="fas ${pt.icon}" style="color:${pt.color};font-size:18px"></i>
             </div>`,
      iconSize: [42, 42], iconAnchor: [21, 21]
    });

    L.marker([pt.lat, pt.lng], { icon: markerIcon }).addTo(landLifeMap).bindPopup(`
      <div style="min-width:210px;font-size:18px;line-height:1.7">
        <div style="font-weight:900;font-size:19px;color:#0f172a;margin-bottom:6px">
          <i class="fas ${pt.icon}" style="color:${pt.color};margin-right:5px"></i>${pt.name}
        </div>
        <table style="width:100%;font-size:20px;border-collapse:collapse">
          <tr><td style="color:#64748b;padding:2px 0;white-space:nowrap">記錄物種</td><td style="font-weight:600;padding-left:8px">${pt.species}</td></tr>
          <tr><td style="color:#64748b;padding:2px 0;white-space:nowrap">調查方法</td><td style="padding-left:8px">${pt.method}</td></tr>
          <tr><td style="color:#64748b;padding:2px 0;white-space:nowrap">主要季節</td><td style="padding-left:8px">${pt.season}</td></tr>
        </table>
      </div>
    `, { maxWidth: 260 });
  });

  /* 溪流主軸 */
  L.polyline([
    [24.1748,120.9072],[24.1760,120.9076],[24.1775,120.9082],
    [24.1792,120.9085],[24.1810,120.9089],[24.1828,120.9094],
    [24.1845,120.9100],[24.1860,120.9107],[24.1875,120.9113]
  ], { color:'#0ea5e9', weight:3.5, opacity:0.7 }).addTo(landLifeMap);

  /* 動物通道標記 */
  L.marker([24.1840, 120.9098], {
    icon: L.divIcon({
      className: '',
      html: `<div style="background:#7c3aed;color:#fff;border-radius:8px;padding:5px 9px;font-size:20px;font-weight:800;white-space:nowrap;box-shadow:0 2px 6px rgba(0,0,0,.3)">🐾 動物通道</div>`,
      iconAnchor: [40, 18]
    })
  }).addTo(landLifeMap);

  landLifeMap.invalidateSize();
}

/* ══════════════════════════════════════════════════════════
   陸域植生 tab  — 植被統計・物種名錄・互動地圖
   ══════════════════════════════════════════════════════════ */
let vegMap = null;

/* 植被統計表（期中報告書 表6-36，p.234） */
const VEG_DOMINANT = [
  { name: '五節芒',     pct: 31.82, family: '禾本科', type: '原生', invasive: false, endemic: false },
  { name: '大花咸豐草', pct: 13.64, family: '菊科',   type: '歸化', invasive: true,  endemic: false },
  { name: '構樹',       pct:  5.68, family: '桑科',   type: '原生', invasive: false, endemic: false },
  { name: '竹葉草',     pct:  4.55, family: '禾本科', type: '原生', invasive: false, endemic: false },
  { name: '狗尾草',     pct:  4.55, family: '禾本科', type: '原生', invasive: false, endemic: false },
  { name: '星毛蕨',     pct:  4.55, family: '碗蕨科', type: '原生', invasive: false, endemic: false },
  { name: '銀合歡',     pct:  3.41, family: '豆科',   type: '歸化', invasive: true,  endemic: false },
  { name: '野桐',       pct:  3.41, family: '大戟科', type: '原生', invasive: false, endemic: false },
  { name: '山黃麻',     pct:  3.41, family: '大麻科', type: '原生', invasive: false, endemic: false },
  { name: '金絲草',     pct:  3.41, family: '禾本科', type: '原生', invasive: false, endemic: false },
  { name: '九芎',       pct:  3.41, family: '千屈菜科', type: '原生', invasive: false, endemic: false },
  { name: '土密樹',     pct:  2.27, family: '大戟科', type: '原生', invasive: false, endemic: false },
  { name: '烏毛蕨',     pct:  2.27, family: '烏毛蕨科', type: '原生', invasive: false, endemic: false },
  { name: '密花苧麻',   pct:  2.27, family: '蕁麻科', type: '原生', invasive: false, endemic: false },
  { name: '九節木',     pct:  1.14, family: '茜草科', type: '原生', invasive: false, endemic: false }
];

/* 優勢植種辨識代表照（檔名→維基共享資源縮圖）。
   ※ 物種頁連結採 GOV_SPECIES → TaiCOL（政府開放資料）；照片補於卡片下方，
     畫面不顯示來源文字，來源僅置於圖片 title 提示（CC 授權之最小化標示）。 */
const _WM = 'https://commons.wikimedia.org/wiki/Special:FilePath/';
const PLANT_PHOTO_FILE = {
  '五節芒':     { file:'Miscanthus_floridulus_-_J._C._Raulston_Arboretum_-_DSC06206.JPG?width=700', pos:'center 58%' },
  '大花咸豐草': { file:'Bidens_pilosa_(Habitus).jpg?width=700', pos:'center center' },
  '構樹':       { file:'Broussonetia_papyrifera_Leaves_3008px.jpg?width=700', pos:'center center' },
  '竹葉草':     { file:'Oplismenus_compositus_at_Peradeniya_Royal_Botanical_Garden.jpg?width=700', pos:'center center' },
  '狗尾草':     { file:'20140919Setaria_viridis1.jpg?width=700', pos:'center center' },
  '星毛蕨':     { file:'Thelypteris_torresiana_(23924305519).jpg?width=700', pos:'center center' },
  '銀合歡':     { file:'Subabool_(Leucaena_leucocephala)_dried_pods_in_Kolkata_W_IMG_4301.jpg?width=700', pos:'center center' },
  '野桐':       { file:'Mallotus_japonicus_(17332868491).jpg?width=700', pos:'center center' },
  '山黃麻':     { file:'Starr_070321-5915_Trema_orientalis.jpg?width=700', pos:'center center' },
  '金絲草':     { file:'Pogonatherum_crinitum_%E9%87%91%E7%B5%B2%E8%8D%89_1_(%E5%A4%A9%E5%95%8F).jpg?width=700', pos:'center center' },
  '九芎':       { file:'Lagerstroemia_subcostata_47672.JPG?width=700', pos:'center 30%' },
  '土密樹':     { file:'Leaf_for_Bridelia_tomentosa.jpg?width=700', pos:'center center' },
  '烏毛蕨':     { file:'Blechnum_orientale.jpg?width=700', pos:'center center' },
  '密花苧麻':   { file:'Pouzolzia_zeylanica_01.JPG?width=700', pos:'center center' },
  '九節木':     { file:'%E4%B9%9D%E7%AF%80%E6%9C%A8Psychotria_rubra_20210609155251_05.jpg?width=700', pos:'center center' },
  '小花蔓澤蘭': { file:'Climbing_hempweed_3.jpg?width=700', pos:'center center' },
  '水柳':       { file:'Salix_warburgii_1.jpg?width=700', pos:'center center' },
  '山葛':       { file:'Fabales_-_Pueraria_montana_roots_-_1.jpg?width=700', pos:'center 30%' },
};
function plantPhotoUrl(name){ const p = PLANT_PHOTO_FILE[name]; return p ? (_WM + p.file) : ''; }
function plantPhotoPos(name){ const p = PLANT_PHOTO_FILE[name]; return p ? p.pos : 'center center'; }
const PLANT_PHOTO_LIBRARY = {
  '五節芒': {
    sci: 'Miscanthus floridulus',
    expertNote: '濱溪開闊灘地優勢高草本，適合作為河岸固土與遮蔽指標。'
  },
  '大花咸豐草': {
    sci: 'Bidens pilosa var. radiata',
    expertNote: '外來歸化草本，常在擾動地與道路邊快速擴張，應列為清除優先種。'
  },
  '構樹': {
    sci: 'Broussonetia papyrifera',
    expertNote: '陽性速生木本，可反映邊坡或溪岸擾動後的早期演替。'
  },
  '竹葉草': {
    sci: 'Oplismenus compositus',
    expertNote: '林緣或半遮陰地常見禾本科地被，代表溪岸林下草本層。'
  },
  '狗尾草': {
    sci: 'Setaria viridis',
    expertNote: '乾燥擾動地常見禾草，可作道路邊坡與裸露地恢復狀態參考。'
  },
  '星毛蕨': {
    sci: 'Christella parasitica / Thelypteris torresiana group',
    expertNote: '蕨類名稱在資料庫間可能有同物異名，平台以報告中文名呈現並註記校核。'
  },
  '銀合歡': {
    sci: 'Leucaena leucocephala',
    expertNote: '木本外來入侵種，若形成灌叢會壓縮原生濱溪植物更新。'
  },
  '野桐': {
    sci: 'Mallotus japonicus',
    expertNote: '河岸次生林常見陽性樹種，可作溪岸木本恢復指標。'
  },
  '山黃麻': {
    sci: 'Trema orientalis',
    expertNote: '先驅木本，可反映崩塌地、邊坡或開闊溪岸的植生回復。'
  },
  '金絲草': {
    sci: 'Pogonatherum crinitum',
    expertNote: '坡面草本，可作裸露坡面覆蓋與表土保護參考。'
  },
  '九芎': {
    sci: 'Lagerstroemia subcostata',
    expertNote: '溪岸與低海拔闊葉林常見原生木本，適合列入河岸復育候選樹種。'
  },
  '土密樹': {
    sci: 'Bridelia tomentosa',
    expertNote: '低海拔次生林木本；目前採葉部辨識代表照，平台上不作為現地照片證據。'
  },
  '烏毛蕨': {
    sci: 'Blechnum orientale',
    expertNote: '濕潤林緣與溪谷常見蕨類，可作遮陰與濕度條件指標。'
  },
  '密花苧麻': {
    sci: 'Pouzolzia zeylanica',
    expertNote: '濱溪及林緣草本，反映地被層與濕潤微棲地。'
  },
  '九節木': {
    sci: 'Psychotria rubra',
    expertNote: '林下灌木，可作較穩定闊葉林下層組成參考。'
  },
  '小花蔓澤蘭': {
    sci: 'Mikania micrantha',
    expertNote: '高風險蔓藤型入侵植物，若覆蓋灌木與幼樹會抑制原生植被更新。'
  },
  '水柳': {
    sci: 'Salix warburgii',
    expertNote: '溪岸濕生木本，適合作為河岸近水帶復育與穩定化參考物種。'
  },
  '山葛': {
    sci: 'Pueraria montana',
    expertNote: '蔓性豆科植物，可快速覆蓋裸露地，但需避免與外來蔓藤混淆。'
  },
};

/* 完整植物名錄（90種，依植物類群分組；已移除無原始紀錄支撐之工寮周邊植生點位） */
const VEG_SPECIES_GROUPS = [
  {
    group: '蕨類植物', color: '#166534', bg: '#dcfce7', icon: 'fa-seedling', count: 14,
    families: [
      { name: '碗蕨科', items: ['蕨', '姬蕨', '星毛蕨'] },
      { name: '鱗毛蕨科', items: ['假複葉耳蕨'] },
      { name: '烏毛蕨科', items: ['烏毛蕨'] },
      { name: '鐵角蕨科', items: ['臺灣鐵角蕨'] },
      { name: '金星蕨科', items: ['小毛蕨', '密毛小毛蕨'] },
      { name: '水龍骨科', items: ['石葦', '崖薑蕨'] },
      { name: '腎蕨科', items: ['腎蕨'] },
      { name: '裡白科', items: ['芒萁'] },
      { name: '粉葉蕨科', items: ['粉葉蕨*'] }
    ]
  },
  {
    group: '雙子葉植物', color: '#1d4ed8', bg: '#eff6ff', icon: 'fa-leaf', count: 63,
    families: [
      { name: '豆科', items: ['銀合歡*', '南美假含羞草*', '決明*', '山葛', '疏花魚藤'] },
      { name: '菊科', items: ['大花咸豐草*', '小花蔓澤蘭*', '南美蟛蜞菊*', '昭和草*', '鬼針草', '野茼蒿', '田代氏澤蘭'] },
      { name: '桑科', items: ['構樹', '越橘葉蔓榕#', '愛玉子'] },
      { name: '大戟科', items: ['野桐', '土密樹', '細葉饅頭果', '白桕'] },
      { name: '蕁麻科', items: ['密花苧麻', '苧麻', '水麻'] },
      { name: '大麻科', items: ['山黃麻'] },
      { name: '千屈菜科', items: ['九芎', '水柳#'] },
      { name: '茜草科', items: ['九節木', '水金京'] },
      { name: '薔薇科', items: ['臺灣懸鉤子', '高梁泡'] },
      { name: '錦葵科', items: ['山芙蓉#'] },
      { name: '五加科', items: ['臺灣樹參'] },
      { name: '冬青科', items: ['燈稱花'] },
      { name: '夾竹桃科', items: ['武靴藤'] },
      { name: '木犀科', items: ['白雞油'] },
      { name: '紫草科', items: ['臺灣附地草*'] },
      { name: '茄科', items: ['刺茄*'] },
      { name: '旋花科', items: ['馬鞍藤'] },
      { name: '酢漿草科', items: ['黃花酢漿草*'] },
      { name: '其他', items: ['細葉水丁香', '牛筋草', '扭鞘香茅', '臺灣何首烏'] }
    ]
  },
  {
    group: '單子葉植物', color: '#7c3aed', bg: '#f5f3ff', icon: 'fa-spa', count: 17,
    families: [
      { name: '莎草科', items: ['碎米莎草', '斷節莎', '野荸薺', '香附子', '短葉水蜈蚣'] },
      { name: '禾本科', items: ['五節芒', '竹葉草', '狗尾草', '金絲草', '牛鞭草', '開卡蘆', '李氏禾', '稗', '柳枝稷*', '象草*', '甜根子草', '白背芒'] }
    ]
  }
];

function renderVegetation() {
  const container = document.getElementById('fishTabContent');
  const invasiveCount = VEG_DOMINANT.filter(v => v.invasive).length;

  container.innerHTML = `
    <!-- 資料來源橫幅 -->
    <div style="background:linear-gradient(135deg,#f0fdf4,#dcfce7);border:1px solid #86efac;border-left:5px solid #16a34a;border-radius:12px;padding:14px 20px;margin-bottom:20px;display:flex;align-items:center;gap:14px">
      <div style="font-size:32px;color:#16a34a"><i class="fas fa-book-open"></i></div>
      <div>
        <div style="font-size:18px;font-weight:900;color:#14532d">橫流溪動物通道及周邊設施檢查效能智慧評估 第三次期中報告書</div>
        <div style="font-size:18px;color:#166534;margin-top:3px">陸域植生調查 ｜ 114年4月21日、9月19日 ｜ 沿線調查法 ｜ 資料節錄自 p.233–238</div>
      </div>
    </div>

    <!-- 統計卡片 -->
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin-bottom:20px">
      ${[
        ['fa-leaf',         '#16a34a','#f0fdf4', '90 種',  '植物總種數'],
        ['fa-layer-group',  '#1d4ed8','#eff6ff', '37 科',  '植物科數'],
        ['fa-seedling',     '#0f766e','#f0fdfa', '14 種',  '蕨類植物'],
        ['fa-exclamation-triangle','#dc2626','#fee2e2', '9 種', '外來入侵種'],
        ['fa-star',         '#92400e','#fef9c3',  '4 種',  '臺灣特有種'],
        ['fa-chart-pie',    '#7c3aed','#f5f3ff', '87%',   'NDVI 森林覆蓋']
      ].map(([ic,col,bg,val,lbl]) => `
        <div style="background:${bg};border-radius:12px;padding:16px 14px;display:flex;align-items:center;gap:10px;border:1px solid ${col}22">
          <div style="font-size:24px;color:${col}"><i class="fas ${ic}"></i></div>
          <div>
            <div style="font-size:24px;font-weight:900;color:${col};line-height:1">${val}</div>
            <div style="font-size:20px;color:#64748b">${lbl}</div>
          </div>
        </div>`).join('')}
    </div>

    <!-- 植被特性說明 -->
    <div style="background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:16px 20px;margin-bottom:20px">
      <div style="font-size:17px;font-weight:800;color:#14532d;margin-bottom:12px">
        <i class="fas fa-info-circle" style="color:#16a34a;margin-right:7px"></i>植被概況說明
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:10px;font-size:19px;color:#334155">
        <div style="background:#fef9c3;border-radius:8px;padding:12px 14px">
          <div style="font-weight:700;color:#854d0e;margin-bottom:4px"><i class="fas fa-water" style="margin-right:5px"></i>溪流濱溪帶</div>
          五節芒優勢植群（相對豐度31.82%），伴生大花咸豐草（歸化）、山黃麻、九芎、水柳等濱溪植物
        </div>
        <div style="background:#eff6ff;border-radius:8px;padding:12px 14px">
          <div style="font-weight:700;color:#1d4ed8;margin-bottom:4px"><i class="fas fa-exclamation-circle" style="margin-right:5px"></i>外來入侵種</div>
          銀合歡、大花咸豐草、小花蔓澤蘭為主要入侵威脅，需持續監測清除
        </div>
        <div style="background:#f5f3ff;border-radius:8px;padding:12px 14px">
          <div style="font-weight:700;color:#7c3aed;margin-bottom:4px"><i class="fas fa-satellite" style="margin-right:5px"></i>NDVI 衛星分析</div>
          森林植被覆蓋 <strong>87%</strong>，非森林地 13%，植被結構健康，動物通道周邊綠帶完整
        </div>
      </div>
    </div>

    <!-- 主要植被統計表 -->
    <div style="background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:18px 20px;margin-bottom:20px">
      <div style="font-size:17px;font-weight:800;color:#0f172a;margin-bottom:14px">
        <i class="fas fa-chart-bar" style="color:#16a34a;margin-right:7px"></i>主要植被統計表（表6-36 ｜ 優勢種 ${VEG_DOMINANT.length} 種，相對豐度合計 ${VEG_DOMINANT.reduce((n,v)=>n+v.pct,0).toFixed(2)}%）
      </div>
      <div style="overflow-x:auto">
        <table style="width:100%;border-collapse:collapse;font-size:19px;min-width:500px">
          <thead>
            <tr style="background:#f0fdf4">
              <th style="padding:11px 14px;text-align:left;font-weight:800;color:#166534;border-bottom:2px solid #86efac">植物名稱</th>
              <th style="padding:11px 14px;text-align:left;font-weight:800;color:#166534;border-bottom:2px solid #86efac">科別</th>
              <th style="padding:11px 14px;text-align:center;font-weight:800;color:#166534;border-bottom:2px solid #86efac">屬性</th>
              <th style="padding:11px 14px;text-align:right;font-weight:800;color:#166534;border-bottom:2px solid #86efac">相對豐度</th>
              <th style="padding:11px 14px;text-align:left;font-weight:800;color:#166534;border-bottom:2px solid #86efac">分布條形</th>
            </tr>
          </thead>
          <tbody>
            ${VEG_DOMINANT.map((v, i) => {
              const barW = Math.round((v.pct / 31.82) * 100);
              const barColor = v.invasive ? '#dc2626' : v.endemic ? '#92400e' : '#16a34a';
              const badgeHtml = v.invasive
                ? '<span style="background:#fee2e2;color:#b91c1c;border-radius:999px;padding:2px 7px;font-size:19px;font-weight:700">外來入侵</span>'
                : v.endemic
                ? '<span style="background:#fef9c3;color:#92400e;border-radius:999px;padding:2px 7px;font-size:19px;font-weight:700">特有種</span>'
                : '<span style="background:#f1f5f9;color:#475569;border-radius:999px;padding:2px 7px;font-size:19px;font-weight:700">原生</span>';
              return `
                <tr style="border-bottom:1px solid #f1f5f9;${i % 2 === 1 ? 'background:#fafcff' : ''}">
                  <td style="padding:10px 14px;font-weight:800;font-size:20px;color:#0f172a">${v.name}</td>
                  <td style="padding:10px 14px;font-size:19px;color:#475569">${v.family}</td>
                  <td style="padding:10px 14px;text-align:center">${badgeHtml}</td>
                  <td style="padding:10px 14px;text-align:right;font-size:20px;font-weight:900;color:${barColor}">${v.pct}%</td>
                  <td style="padding:10px 14px">
                    <div style="height:16px;background:#e2e8f0;border-radius:999px;overflow:hidden">
                      <div style="height:100%;width:${barW}%;background:${barColor};border-radius:999px;transition:width 0.6s ease"></div>
                    </div>
                  </td>
                </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
      <div style="margin-top:10px;font-size:20px;color:#94a3b8">
        * 標示外來入侵種（紅色）；# 標示臺灣特有種（橙色）｜資料來源：期中報告書 p.234
      </div>
      <div style="margin-top:8px;font-size:18px;line-height:1.6;color:#64748b;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:10px 12px">
        <i class="fas fa-circle-info" style="color:#0369a1;margin-right:5px"></i>
        <b>與上方統計卡的對應：</b>本表為<b>優勢種節錄</b>（表6-36），非全區物種名錄。
        全區調查共 90 種、其中外來入侵種 <b>9 種</b>；本表僅涵蓋其中
        <b>${VEG_DOMINANT.filter(v=>v.invasive).length} 種</b>（${VEG_DOMINANT.filter(v=>v.invasive).map(v=>v.name).join('、')}），
        小花蔓澤蘭等其餘入侵種未達優勢種門檻，故未列於本表。
      </div>
    </div>

    <!-- 優勢植種圖鑑（政府物種頁） -->
    <div style="background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:18px 20px;margin-bottom:20px">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;flex-wrap:wrap;gap:8px">
        <div style="font-size:17px;font-weight:800;color:#0f172a">
          <i class="fas fa-images" style="color:#16a34a;margin-right:7px"></i>優勢植種圖鑑
        </div>
        <div style="font-size:20px;color:#64748b;text-align:right">出處：橫流溪調查資料（豐度）／物種分類與影像連結 TaiCOL 台灣物種名錄</div>
      </div>
      <div style="font-size:18px;color:#64748b;margin-bottom:16px">
        物種組成與相對豐度以橫流溪陸域植生調查成果為準；卡片照片為物種辨識代表影像，並連結至 TaiCOL 台灣物種名錄（農業部生物多樣性研究所，政府資料開放授權）查看官方分類與分布。
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:14px">
        ${VEG_DOMINANT.filter(v => PLANT_PHOTO_LIBRARY[v.name]).map(v => {
          const photo = PLANT_PHOTO_LIBRARY[v.name];
          const ccl = v.invasive ? '#b91c1c' : v.endemic ? '#92400e' : '#16a34a';
          const badge = v.invasive ? '外來入侵' : v.endemic ? '特有種' : '原生';
          const badgeBg = v.invasive ? '#fee2e2' : v.endemic ? '#fef9c3' : '#f0fdf4';
          const modalId = 'vegphoto_' + v.name.replace(/[^\w]/g,'_');
          return `
            <div style="border-radius:10px;overflow:hidden;box-shadow:0 2px 10px rgba(15,23,42,.1);border:1px solid #e2e8f0;cursor:pointer"
              onclick="document.getElementById('${modalId}').style.display='flex'">
              <div style="position:relative;height:160px;overflow:hidden;background:#f1f5f9">
                ${govSpeciesCard(v.name, (GOV_SPECIES[v.name]||{}).code, 160)}
                ${plantPhotoUrl(v.name) ? `<img src="${plantPhotoUrl(v.name)}" alt="${v.name}" title="${v.name}"
                  style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:${plantPhotoPos(v.name)};transition:transform .4s"
                  onerror="this.style.display='none'"
                  onmouseover="this.style.transform='scale(1.07)'" onmouseout="this.style.transform='scale(1)'">` : ''}
                <div style="position:absolute;top:8px;right:8px">
                  <span style="background:${ccl};color:#fff;font-size:19px;font-weight:700;padding:3px 8px;border-radius:999px">${badge}</span>
                </div>
                <div style="position:absolute;bottom:8px;left:8px">
                  <span style="background:rgba(15,23,42,.72);color:#fff;font-size:19px;padding:2px 8px;border-radius:999px;font-weight:700">${v.pct}%</span>
                </div>
                <div style="position:absolute;bottom:8px;right:8px">
                  <i class="fas fa-expand-alt" style="color:rgba(255,255,255,.8);font-size:18px"></i>
                </div>
              </div>
              <div style="padding:10px 12px;background:#fff">
                <div style="font-size:19px;font-weight:800;color:#0f172a;margin-bottom:2px">${v.name}</div>
                <div style="font-size:19px;font-style:italic;color:#64748b;margin-bottom:3px">${photo.sci}</div>
                <div style="font-size:20px;color:#64748b;margin-bottom:6px">${v.family}</div>
                <div style="font-size:20px;color:#334155;line-height:1.55;background:#f8fafc;border-radius:7px;padding:7px 8px;margin-bottom:7px">${fish_escape(photo.expertNote || '')}</div>
                <div style="display:flex;gap:8px;flex-wrap:wrap;font-size:19px;line-height:1.4">
                  ${(GOV_SPECIES[v.name]||{}).code ? `<a href="${govSpeciesPage((GOV_SPECIES[v.name]).code)}" target="_blank" rel="noopener noreferrer" onclick="event.stopPropagation()" style="color:#15803d;text-decoration:none;font-weight:700"><i class="fas fa-landmark" style="margin-right:3px"></i>TaiCOL 官方物種頁</a>` : ''}
                  <span style="color:#94a3b8">政府開放資料</span>
                </div>
              </div>
            </div>
            <!-- 放大燈箱 -->
            <div id="${modalId}" onclick="this.style.display='none'"
              style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.82);z-index:9999;align-items:center;justify-content:center;flex-direction:column;gap:12px;cursor:zoom-out">
              ${plantPhotoUrl(v.name) ? `<img src="${plantPhotoUrl(v.name)}" alt="${v.name}" title="${v.name}"
                style="max-width:90vw;max-height:74vh;object-fit:contain;border-radius:8px;box-shadow:0 8px 40px rgba(0,0,0,.6)">`
                : `<div style="width:min(520px,86vw);border-radius:12px;overflow:hidden;box-shadow:0 8px 40px rgba(0,0,0,.6)">${govSpeciesCard(v.name, (GOV_SPECIES[v.name]||{}).code, 220)}</div>`}
              <div style="text-align:center;color:#fff">
                <div style="font-size:20px;font-weight:800">${v.name}</div>
                <div style="font-size:19px;font-style:italic;opacity:.8;margin-top:4px">${photo.sci}　｜　${v.family}　｜　相對豐度 ${v.pct}%</div>
                <div style="font-size:18px;opacity:.85;margin-top:8px;max-width:760px;line-height:1.6">${fish_escape(photo.expertNote || '')}</div>
                <div style="font-size:20px;opacity:.72;margin-top:6px">
                  ${(GOV_SPECIES[v.name]||{}).code ? `<a href="${govSpeciesPage((GOV_SPECIES[v.name]).code)}" target="_blank" rel="noopener noreferrer" onclick="event.stopPropagation()" style="color:#86efac">前往官方物種頁</a>　` : ''}點擊背景關閉
                </div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </div>

    <!-- 植物名錄（依類群） -->
    <div style="background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:18px 20px;margin-bottom:20px">
      <div style="font-size:17px;font-weight:800;color:#0f172a;margin-bottom:14px">
        <i class="fas fa-list-ul" style="color:#16a34a;margin-right:7px"></i>橫流溪陸域植物名錄（90種）
      </div>
      ${VEG_SPECIES_GROUPS.map(grp => `
        <div style="border:1px solid ${grp.color}33;border-left:4px solid ${grp.color};border-radius:10px;background:${grp.bg};margin-bottom:12px;overflow:hidden">
          <button onclick="vegGroupToggle(this)" style="width:100%;padding:13px 16px;display:flex;align-items:center;gap:12px;background:none;border:none;cursor:pointer;text-align:left">
            <i class="fas ${grp.icon}" style="color:${grp.color};font-size:22px;width:24px"></i>
            <div style="flex:1">
              <span style="font-size:18px;font-weight:900;color:#0f172a">${grp.group}</span>
              <span style="font-size:19px;color:#64748b;margin-left:8px">${grp.count} 種</span>
            </div>
            <i class="fas fa-chevron-down" style="color:#94a3b8;font-size:19px;transition:transform 0.2s"></i>
          </button>
          <div class="veg-group-body" style="display:none;padding:4px 16px 14px">
            ${grp.families.map(fam => `
              <div style="margin-bottom:10px">
                <div style="font-size:19px;font-weight:700;color:${grp.color};margin-bottom:6px;padding-left:4px;border-left:3px solid ${grp.color}">${fam.name}</div>
                <div style="display:flex;flex-wrap:wrap;gap:6px">
                  ${fam.items.map(sp => {
                    const isInvasive = sp.endsWith('*') || sp.includes('*');
                    const isEndemic  = sp.endsWith('#') || sp.includes('#');
                    const displayName = sp.replace(/[*#（）（.*）]/g, s => s.match(/[*#]/) ? '' : s).trim();
                    const tagStyle = isInvasive ? 'background:#fee2e2;color:#b91c1c;border:1px solid #fca5a5'
                                    : isEndemic ? 'background:#fef9c3;color:#92400e;border:1px solid #fde68a'
                                    : 'background:#f1f5f9;color:#334155;border:1px solid #e2e8f0';
                    return `<span style="${tagStyle};border-radius:8px;padding:4px 10px;font-size:19px;font-weight:600">${sp}</span>`;
                  }).join('')}
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      `).join('')}
      <div style="font-size:20px;color:#94a3b8;margin-top:8px">
        凡例：<span style="background:#fee2e2;color:#b91c1c;border-radius:4px;padding:1px 5px;font-size:20px">* 外來入侵種</span>
        <span style="background:#fef9c3;color:#92400e;border-radius:4px;padding:1px 5px;font-size:20px;margin-left:4px"># 臺灣特有種</span>
        （黑字為原生種）
      </div>
    </div>

    <!-- 互動地圖 -->
    <div style="background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:18px 20px;margin-bottom:20px">
      <div style="font-size:17px;font-weight:800;color:#0f172a;margin-bottom:6px">
        <i class="fas fa-map-marked-alt" style="color:#16a34a;margin-right:7px"></i>植被分布互動地圖
      </div>
      <div style="font-size:18px;color:#64748b;margin-bottom:14px">
        橫流溪沿岸植被調查樣點、優勢植群帶及周邊環境比對 ｜ 點選標記查看詳細植被資訊
      </div>
      <!-- 圖例 -->
      <div style="display:flex;flex-wrap:wrap;gap:14px;margin-bottom:12px;font-size:18px;align-items:center">
        <div style="display:flex;align-items:center;gap:7px">
          <div style="width:22px;height:22px;background:#16a34a;border:2.5px solid #14532d;border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0">
            <i class="fas fa-seedling" style="color:#fff;font-size:19px"></i>
          </div>
          <span>濱溪帶樣區（五節芒優勢）</span>
        </div>
        <div style="display:flex;align-items:center;gap:7px">
          <div style="position:relative;width:24px;height:22px;flex-shrink:0">
            <div style="width:0;height:0;border-left:12px solid transparent;border-right:12px solid transparent;border-bottom:22px solid #dc2626"></div>
            <i class="fas fa-cannabis" style="color:#fff;font-size:18px;position:absolute;top:8px;left:0;width:100%;text-align:center"></i>
          </div>
          <span>外來植物警示區</span>
        </div>
        <div style="display:flex;align-items:center;gap:7px">
          <div style="width:22px;height:22px;display:flex;align-items:center;justify-content:center;flex-shrink:0">
            <div style="width:16px;height:16px;background:#0d9488;border:2.5px solid #134e4a;transform:rotate(45deg);display:flex;align-items:center;justify-content:center">
              <i class="fas fa-spa" style="color:#fff;font-size:18px;transform:rotate(-45deg)"></i>
            </div>
          </div>
          <span>蕨類植物豐富區</span>
        </div>
      </div>
      <div id="vegMap" style="height:440px;border-radius:10px;overflow:hidden;border:1px solid #e2e8f0"></div>
    </div>
  `;

  // 初始化 Leaflet 植被地圖
  setTimeout(() => _initVegMap(), 200);
}

function vegGroupToggle(btn) {
  const body = btn.nextElementSibling;
  if (!body) return;
  const open = body.style.display !== 'none' && body.style.display !== '';
  body.style.display = open ? 'none' : 'block';
  const icon = btn.querySelector('.fa-chevron-down, .fa-chevron-up');
  if (icon) { icon.className = open ? 'fas fa-chevron-down' : 'fas fa-chevron-up'; }
}

function _initVegMap() {
  const el = document.getElementById('vegMap');
  if (!el || typeof L === 'undefined') return;
  if (vegMap) { try { vegMap.remove(); } catch(_) {} vegMap = null; }

  vegMap = L.map('vegMap', { zoomControl: true, scrollWheelZoom: true })
    .setView([24.181, 120.909], 15);

  L.tileLayer('https://wmts.nlsc.gov.tw/wmts/PHOTO2/default/GoogleMapsCompatible/{z}/{y}/{x}', {
    attribution: '© 內政部國土測繪中心', maxZoom: 20, crossOrigin: true
  }).addTo(vegMap);
  L.tileLayer('https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png', {
    subdomains: 'abcd', maxZoom: 19, opacity: 0.88
  }).addTo(vegMap);

  // ── 植被調查樣點 ──
  const vegPoints = [
    /* 濱溪帶樣區（五節芒優勢） */
    { lat: 24.1755, lng: 120.9075, type: 'riparian', zone: '濱溪帶 A',
      dominant: '五節芒（31.82%）', companion: '大花咸豐草、山黃麻、九芎',
      invasive: '大花咸豐草', cover: '草本層 > 80%', ndvi: 0.72 },
    { lat: 24.1780, lng: 120.9085, type: 'riparian', zone: '濱溪帶 B',
      dominant: '五節芒（優勢）', companion: '竹葉草、狗尾草、密花苧麻',
      invasive: '無', cover: '草本層 > 75%', ndvi: 0.69 },
    { lat: 24.1808, lng: 120.9088, type: 'riparian', zone: '濱溪帶 C',
      dominant: '五節芒、水柳（混生）', companion: '李氏禾、開卡蘆、甜根子草',
      invasive: '象草（局部）', cover: '草本層 80%、木本層 20%', ndvi: 0.74 },
    { lat: 24.1835, lng: 120.9098, type: 'riparian', zone: '濱溪帶 D',
      dominant: '甜根子草、五節芒', companion: '野桐、構樹、山芙蓉',
      invasive: '銀合歡（上坡）', cover: '草本層 70%、木本層 30%', ndvi: 0.71 },
    { lat: 24.1858, lng: 120.9108, type: 'riparian', zone: '濱溪帶 E（動物通道上游）',
      dominant: '五節芒、臺灣懸鉤子', companion: '蕨類（芒萁、烏毛蕨）、水麻',
      invasive: '無', cover: '草本及灌木混生', ndvi: 0.78 },
    /* 外來植物警示區 */
    { lat: 24.1765, lng: 120.9102, type: 'invasive', zone: '外來種警示 A',
      dominant: '銀合歡、大花咸豐草（共優）', companion: '狗尾草、草本層',
      invasive: '銀合歡（3.41%）+ 大花咸豐草（13.64%）', cover: '銀合歡灌叢 > 50%', ndvi: 0.48 },
    { lat: 24.1845, lng: 120.9078, type: 'invasive', zone: '外來種警示 B',
      dominant: '小花蔓澤蘭、大花咸豐草', companion: '野茼蒿、昭和草',
      invasive: '小花蔓澤蘭（擴散中）、大花咸豐草', cover: '爬藤層快速擴展', ndvi: 0.52 },

    /* 蕨類植物豐富區 */
    { lat: 24.1792, lng: 120.9095, type: 'fern', zone: '蕨類豐富 A',
      dominant: '芒萁、蕨（共優）', companion: '腎蕨、烏毛蕨、石葦',
      invasive: '粉葉蕨（少量）', cover: '地被層 > 90%', ndvi: 0.65 },
    { lat: 24.1862, lng: 120.9100, type: 'fern', zone: '蕨類豐富 B（溪谷遮陰帶）',
      dominant: '崖薑蕨、小毛蕨', companion: '密毛小毛蕨、臺灣鐵角蕨',
      invasive: '無', cover: '林下遮陰 > 80%，蕨類多樣性高', ndvi: 0.79 }
  ];

  const colorMap = { riparian: '#16a34a', invasive: '#dc2626', fern: '#0d9488' };
  const labelMap = { riparian: '濱溪帶', invasive: '外來種警示', fern: '蕨類豐富帶' };

  const vegIconCfg = {
    riparian: { bg: '#16a34a', dark: '#14532d', fa: 'fa-seedling', shape: 'circle'   },
    invasive: { bg: '#dc2626', dark: '#991b1b', fa: 'fa-cannabis', shape: 'triangle' },
    fern:     { bg: '#0d9488', dark: '#134e4a', fa: 'fa-spa',      shape: 'diamond'  }
  };

  function makeVegDivIcon(type) {
    const c = vegIconCfg[type] || vegIconCfg.riparian;
    const s = 34;
    let html;
    if (c.shape === 'circle') {
      html = `<div style="width:${s}px;height:${s}px;background:${c.bg};border:3px solid ${c.dark};border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 3px 10px rgba(0,0,0,.45)">
        <i class="fas ${c.fa}" style="color:#fff;font-size:19px"></i></div>`;
    } else if (c.shape === 'square') {
      html = `<div style="width:${s}px;height:${s}px;background:${c.bg};border:3px solid ${c.dark};border-radius:7px;display:flex;align-items:center;justify-content:center;box-shadow:0 3px 10px rgba(0,0,0,.45)">
        <i class="fas ${c.fa}" style="color:#fff;font-size:19px"></i></div>`;
    } else if (c.shape === 'triangle') {
      html = `<div style="position:relative;width:${s+4}px;height:${s}px;filter:drop-shadow(0 3px 5px rgba(0,0,0,.4))">
        <div style="width:0;height:0;border-left:${(s+4)/2}px solid transparent;border-right:${(s+4)/2}px solid transparent;border-bottom:${s}px solid ${c.bg}"></div>
        <i class="fas ${c.fa}" style="color:#fff;font-size:19px;position:absolute;top:12px;left:0;width:100%;text-align:center"></i></div>`;
    } else {
      const ds = Math.round(s * 0.72);
      html = `<div style="width:${s}px;height:${s}px;display:flex;align-items:center;justify-content:center">
        <div style="width:${ds}px;height:${ds}px;background:${c.bg};border:3px solid ${c.dark};transform:rotate(45deg);display:flex;align-items:center;justify-content:center;box-shadow:0 3px 10px rgba(0,0,0,.45)">
          <i class="fas ${c.fa}" style="color:#fff;font-size:18px;transform:rotate(-45deg)"></i></div></div>`;
    }
    const w = c.shape === 'triangle' ? s + 4 : s;
    return L.divIcon({ className: '', html, iconSize: [w, s], iconAnchor: [w / 2, s / 2] });
  }

  vegPoints.forEach(pt => {
    const col = colorMap[pt.type] || '#16a34a';
    const marker = L.marker([pt.lat, pt.lng], { icon: makeVegDivIcon(pt.type) }).addTo(vegMap);

    marker.bindPopup(`
      <div style="min-width:230px;font-size:18px;line-height:1.7">
        <div style="font-weight:900;font-size:19px;color:#0f172a;margin-bottom:5px">
          <span style="display:inline-block;width:12px;height:12px;border-radius:50%;background:${col};margin-right:6px;vertical-align:middle"></span>
          ${pt.zone}
        </div>
        <table style="width:100%;font-size:20px;border-collapse:collapse">
          <tr><td style="color:#64748b;padding:2px 0;white-space:nowrap">優勢植物</td><td style="font-weight:700;padding-left:8px">${pt.dominant}</td></tr>
          <tr><td style="color:#64748b;padding:2px 0;white-space:nowrap">伴生植物</td><td style="padding-left:8px">${pt.companion}</td></tr>
          <tr><td style="color:#64748b;padding:2px 0;white-space:nowrap">入侵植物</td><td style="padding-left:8px;color:${pt.invasive==='無'?'#16a34a':'#dc2626'};font-weight:600">${pt.invasive}</td></tr>
          <tr><td style="color:#64748b;padding:2px 0;white-space:nowrap">植被覆蓋</td><td style="padding-left:8px">${pt.cover}</td></tr>
          <tr><td style="color:#64748b;padding:2px 0;white-space:nowrap">NDVI</td><td style="padding-left:8px;font-weight:700;color:${pt.ndvi>0.7?'#16a34a':pt.ndvi>0.55?'#854d0e':'#dc2626'}">${pt.ndvi}</td></tr>
        </table>
        <div style="margin-top:7px;font-size:19px;color:#475569;border-left:3px solid ${col};padding-left:7px">
          植被分類：<strong>${labelMap[pt.type]}</strong>
        </div>
      </div>
    `, { maxWidth: 280 });
  });

  // ── 動物通道位置標記 ──
  L.marker([24.1840, 120.9098], {
    icon: L.divIcon({
      className: '',
      html: `<div style="background:#7c3aed;color:#fff;border-radius:8px;padding:5px 9px;font-size:20px;font-weight:800;white-space:nowrap;box-shadow:0 2px 6px rgba(0,0,0,.3)">🐾 動物通道</div>`,
      iconAnchor: [40, 18]
    })
  }).addTo(vegMap);

  vegMap.invalidateSize();
}

// ─────────────────────────────────────────────────────────────────────────────
//  歷年魚類族群趨勢分析
// ─────────────────────────────────────────────────────────────────────────────


/* ════════════════════════════════════════════════════════════════════════════
   生態監測儀表板（呈現層）
   ----------------------------------------------------------------------------
   目的：讓讀者從歷年調查數據直接看出「環境與物種組成正在發生什麼變化」。
   數值增減一律以中性語彙描述（組成改變、優勢物種轉換、族群量波動、
   棲地利用情形改變），並對照水文、潭瀨組成、底質與流況等環境條件解讀。
   ════════════════════════════════════════════════════════════════════════════ */
function hlxEco_statBlock(o) {
  return `
    <div style="background:#fff;border:1px solid ${HLX_ECO_INK.line};border-radius:12px;padding:15px 17px">
      <div style="font-size:12.5px;color:${HLX_ECO_INK.t2};font-weight:700;margin-bottom:7px">${o.label}</div>
      <div style="display:flex;align-items:baseline;gap:7px;flex-wrap:wrap">
        <span style="font-size:29px;font-weight:900;color:${HLX_ECO_INK.t1};line-height:1;
                     font-variant-numeric:tabular-nums">${o.value}</span>
        <span style="font-size:13px;color:${HLX_ECO_INK.t2}">${o.unit || ''}</span>
      </div>
      <div style="font-size:12.5px;color:${HLX_ECO_INK.t3};margin-top:7px;line-height:1.6">${o.sub}</div>
    </div>`;
}

function hlxEco_sectionHead(no, title, desc) {
  return `
    <div style="margin-bottom:13px">
      <div style="display:flex;align-items:center;gap:9px;flex-wrap:wrap;margin-bottom:5px">
        <span style="background:#1c5cab;color:#fff;border-radius:7px;width:24px;height:24px;
                     display:inline-flex;align-items:center;justify-content:center;
                     font-size:13px;font-weight:900;flex-shrink:0">${no}</span>
        <span style="font-size:17px;font-weight:900;color:${HLX_ECO_INK.t1}">${title}</span>
      </div>
      <div style="font-size:13px;color:${HLX_ECO_INK.t2};line-height:1.75">${desc}</div>
    </div>`;
}


/* ── 圖表解讀區塊（每張主要圖表下方）──
   統一格式：看什麼指標 → 軸與單位 → 怎麼判讀 → 資料呈現什麼 → 可能的環境訊號。
   文字全部由現有資料即時帶入，不寫死數值。 */
function hlxEco_readNote(o) {
  return `
    <div style="margin-top:12px;border-left:4px solid #1c5cab;background:#f8fbff;
                border-radius:0 10px 10px 0;padding:14px 16px">
      <div style="font-size:15px;font-weight:900;color:#1c5cab;margin-bottom:8px">
        <i class="fas fa-lightbulb" style="margin-right:7px"></i>怎麼看這張圖
      </div>
      <div style="display:grid;gap:7px;font-size:14px;color:#0f172a;line-height:1.85">
        <div><b style="color:#475569">這張圖看的是：</b>${o.what}</div>
        <div><b style="color:#475569">橫軸／縱軸：</b>${o.axes}</div>
        <div><b style="color:#475569">怎麼判讀：</b>${o.how}</div>
        <div><b style="color:#475569">目前資料顯示：</b>${o.found}</div>
        <div style="border-top:1px dashed #cbd5e1;padding-top:8px">
          <b style="color:#475569">可能的環境訊號：</b>${o.signal}</div>
      </div>
    </div>`;
}

/* ── 圖表結論列 ──
   使用者反映「三、受脅魚種平均尾／次」「四、稀釋物種數 E[S100] ± SD」
   「五、93～114 年物種出現矩陣」看得到數字卻說不出結論。原本的標題描述
   的是「這張圖畫了什麼」，不是「這張圖告訴你什麼」。此列補上後者，
   數值一律由現有序列即時計算，不寫死。 */
function hlxEco_takeaway(html) {
  return `<div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:9px;
                      padding:10px 12px;margin-bottom:12px;font-size:12.5px;
                      color:#14532d;line-height:1.75">
            <b style="color:#166534">這張圖告訴你：</b>${html}</div>`;
}

/* 受脅魚種的結論：改善前後「四種同時被記錄到」的年度數 */
function hlxEco_threatenedTakeaway() {
  const M = hlxEcoMonitor(), TH = HLX_THREATENED_KEYS;
  const hit = y => TH.filter(k => y.perTimeBy[k] > 0).length;
  const preMax = Math.max.apply(null, M.pre.map(hit));
  const fullPost = M.post.filter(y => hit(y) === TH.length);
  const preMean = M.pre.reduce((a, y) => a + TH.reduce((b, k) => b + y.perTimeBy[k], 0), 0) / M.pre.length;
  const postMean = M.post.reduce((a, y) => a + TH.reduce((b, k) => b + y.perTimeBy[k], 0), 0) / M.post.length;
  return hlxEco_takeaway(
    `這 ${TH.length} 種是紅皮書列為受脅的魚，看的是<b>保育物種有沒有留在這條溪</b>。` +
    `改善前 ${M.pre.length} 個年度中，同時記錄到最多只有 <b>${preMax} 種</b>；` +
    `改善後有 <b>${fullPost.length} 個年度（${fullPost.map(y => y.roc).join('、')} 年）${TH.length} 種全部記錄到</b>。` +
    `平均數量由 ${preMean.toFixed(1)} 尾／次變為 ${postMean.toFixed(1)} 尾／次。`);
}

/* 調查效率的結論：達成全部物種數所需的站次 */
function hlxEco_richnessTakeaway() {
  const M = hlxEcoMonitor(), total = M.keys.length;
  const full = M.years.filter(y => y.species === total).sort((a, b) => a.times - b.times);
  if (!full.length) return '';
  const least = full[0], most = full[full.length - 1];
  return hlxEco_takeaway(
    `每年記錄到幾種，會隨調查次數變多而上升，直接比較並不公平；本圖把各年換算到<b>同樣的調查量</b>再比。` +
    `最直白的看法是比較「記錄到全部 ${total} 種各花了多少調查」：` +
    `<b>${most.roc} 年用了 ${most.times} 站次</b>，而 <b>${least.roc} 年只用 ${least.times} 站次</b>就達成。` +
    `同樣要湊齊 ${total} 種，近年花的調查量少得多——代表<b>魚變得比較容易遇到</b>。`);
}

/* 出現矩陣的結論：22 年跨度與不受站數影響的性質 */
function hlxEco_matrixTakeaway() {
  const M = hlxEcoMonitor();
  return hlxEco_takeaway(
    `這是本頁<b>跨度最長</b>的一張（93～114 年，共 22 年），也是唯一<b>不受各年調查站數多寡影響</b>的——` +
    `它只看「那一年有沒有記錄到這種魚」，不看抓了幾尾。` +
    `因此其他圖表受樣點與站次變動干擾之處，可用本圖交叉檢核：` +
    `色塊持續存在代表該物種長期穩定利用本溪段，最淺格是「有調查但那年沒抓到」，不代表物種消失。`);
}

/* ── 上游物種名錄長期變化（魚道連通性的長期證據）──
   為什麼用「有無記錄」而不是尾／次：標為上游的年度只有 104、110、112、
   113、114 共 5 年，且改善後每年僅 2 站次——110 年上游 195.5 尾／次即
   由 2 站次算出，小樣本下的數量極不穩定。物種的「有無被記錄到」對取樣
   強度的敏感度遠低於數量，用於判斷「魚上不上得去」較可靠。

   107～109、111 年的上游樣點併在「橫流溪N站」內，原始資料未分列上下游，
   因此無法納入，不作推估。

   這是魚道連通性能提出的最長期證據（104→114），但改善前只有 104 年
   一個基線年，強度有限，須據實載明。 */
function hlxEco_upstreamConnectivity() {
  const KEYS = HLX_FISH_KEYS, NAME = HLX_FISH_KEY_NAME;
  const PRE_LAST = HLX_ECO_PRE_LAST_YEAR - 1911;

  const byYear = new Map();
  HLX_FISH_SURVEYS.forEach(s => {
    if (hlxEco_segment(s) !== '上游') return;
    const roc = s.year - 1911;
    if (!byYear.has(roc)) byYear.set(roc, { roc: roc, times: 0, counts: {} });
    const d = byYear.get(roc);
    d.times += hlxEco_times(s);
    KEYS.forEach(k => { d.counts[k] = (d.counts[k] || 0) + (Number(s[k]) || 0); });
  });
  const years = [...byYear.values()].sort((a, b) => a.roc - b.roc);
  if (!years.length) return '';
  const pre = years.filter(y => y.roc <= PRE_LAST);
  const post = years.filter(y => y.roc > PRE_LAST);

  //  三類：改善前後皆有／改善後才在上游記錄到／上游歷次均未記錄
  const cls = KEYS.map(k => {
    const inPre = pre.some(y => y.counts[k] > 0);
    const inPost = post.some(y => y.counts[k] > 0);
    return { key: k, name: NAME[k], inPre: inPre, inPost: inPost,
             group: inPre ? 'both' : (inPost ? 'new' : 'none') };
  });
  const order = { both: 0, new: 1, none: 2 };
  cls.sort((a, b) => order[a.group] - order[b.group]);
  const newly = cls.filter(c => c.group === 'new');

  const head = `
    <tr>
      <th style="text-align:left;padding:7px 9px;font-size:12px;color:#475569;
                 border-bottom:2px solid #cbd5e1;white-space:nowrap">物種</th>
      ${years.map(y => `
        <th style="padding:7px 4px;font-size:12px;border-bottom:2px solid #cbd5e1;
                   color:${y.roc <= PRE_LAST ? '#b45309' : '#0d6b5b'};white-space:nowrap">
          ${y.roc}年<div style="font-size:9.5px;font-weight:500;color:#94a3b8">${y.times} 站次</div>
        </th>`).join('')}
      <th style="padding:7px 9px;font-size:12px;color:#475569;
                 border-bottom:2px solid #cbd5e1;white-space:nowrap">判讀</th>
    </tr>`;

  const tag = { both: { t: '改善前後皆有', c: '#475569', bg: '#f1f5f9' },
                new:  { t: '改善後才記錄到', c: '#0e7490', bg: '#ecfeff' },
                none: { t: '上游歷次均未記錄', c: '#94a3b8', bg: '#f8fafc' } };
  const rows = cls.map(c => {
    const g = tag[c.group];
    return `
      <tr style="background:${g.bg}">
        <td style="padding:7px 9px;font-size:13px;font-weight:700;color:#0f172a;
                   border-bottom:1px solid #e2e8f0;white-space:nowrap">
          <span style="display:inline-block;width:8px;height:8px;border-radius:2px;
                       background:${HLX_ECO_SPECIES_COLOR[c.key]};margin-right:6px"></span>${c.name}</td>
        ${years.map(y => `
          <td style="padding:7px 4px;text-align:center;border-bottom:1px solid #e2e8f0;
                     font-size:14px;color:${y.counts[c.key] > 0 ? '#0d6b5b' : '#cbd5e1'}"
              title="${c.name}　${y.roc} 年上游：${y.counts[c.key] || 0} 尾">
            ${y.counts[c.key] > 0 ? '●' : '○'}</td>`).join('')}
        <td style="padding:7px 9px;font-size:11.5px;font-weight:700;color:${g.c};
                   border-bottom:1px solid #e2e8f0;white-space:nowrap">${g.t}</td>
      </tr>`;
  }).join('');

  return `
    <div style="font-size:13px;color:#64748b;line-height:1.75;margin-bottom:12px">
      魚道的作用是讓魚能通過構造物往上游移動，因此<b style="color:#0d6b5b">上游記錄到哪些物種</b>
      是連通性最直接的長期指標。<br>
      <span style="display:inline-block;background:#f1f5f9;border-left:3px solid #94a3b8;
                   border-radius:0 6px 6px 0;padding:6px 10px;margin:6px 0">
        <b>這裡的「上游／下游」指哪裡</b>：沿用原始調查報告的樣站名稱——
        <b>上游＝鞍馬山站</b>、<b>下游＝麗陽站</b>（105年度成果報告表 9、表 12）。
        魚類原始紀錄未載樁號，因此無法對應到工程設施採用的樁號河段
        （上游段 1K+000 以上、下游段 0K+460 以下）；兩套劃分方式不同，不可互相套用。
      </span>下表以「該年上游是否記錄到該物種」呈現，
      不用尾數——改善後上游每年僅 2 站次，數量在小樣本下波動極大，
      物種的有無則穩定得多。
    </div>

    <div style="overflow-x:auto;margin-bottom:12px">
      <table style="width:100%;border-collapse:collapse;min-width:520px">
        <thead>${head}</thead>
        <tbody>${rows}</tbody>
      </table>
    </div>

    ${newly.length ? `
    <div style="background:#ecfeff;border:1px solid #a5f3fc;border-radius:10px;
                padding:12px 14px;margin-bottom:10px">
      <div style="font-size:14px;font-weight:900;color:#0e7490;margin-bottom:4px">
        改善後上游新增 ${newly.length} 種：${newly.map(c => c.name).join('、')}</div>
      <div style="font-size:12.5px;color:#164e63;line-height:1.7">
        這 ${newly.length} 種在改善前的上游調查中從未被記錄到，改善後則反覆出現。
        魚道啟用後上游物種組成由 ${pre.length ? pre[0].counts && KEYS.filter(k => pre.some(y => y.counts[k] > 0)).length : 0} 種
        增為最多 ${Math.max.apply(null, post.map(y => KEYS.filter(k => y.counts[k] > 0).length))} 種。
      </div>
    </div>` : ''}

    <div style="font-size:11.5px;color:#64748b;line-height:1.7;
                border-top:1px dashed #e2e8f0;padding-top:9px">
      <b>資料界線：</b>原始資料中明確標示上游的年度為
      ${years.map(y => y.roc + '年').join('、')}，共 ${years.length} 年；
      改善前僅 ${pre.map(y => y.roc + '年').join('、')} ${pre.length} 個基線年度，
      據此判讀連通性改變的強度有限。
      107～109、111 年的上游樣點併於「橫流溪N站」內，原始資料未分列上下游，
      無法納入本表，平台不作推估補列。
    </div>`;
}

/* ── 四次 IBI 評估在等級帶上的落點 ──
   IBI 是評級指標，不是逐年趨勢：原報告只在 109、110 年做了四次同口徑
   評估（109夏／109秋／110夏／110秋），其他年度的調查未收集可計算同口徑
   IBI 的欄位。硬拉成十二年時間軸只會讓十個年度標著「無資料」，把缺口
   放大；用物種數或捕獲尾數回推更是造假。

   改為呈現四次評估在 A～D 等級帶上的落點。四次全部落在 B 級（23～34），
   極差僅 3.3 分 —— 「四次評估一致落在良好等級」是這份資料能支持的結論，
   且不需要任何缺年。 */
function hlxEco_ibiBand() {
  const B = HLX_ECO_BENCHMARK.hlx;
  const rounds = B.surveyMeans;
  const vals = rounds.map(r => r.value);
  const lo = Math.min.apply(null, vals), hi = Math.max.apply(null, vals);
  const SCALE_MIN = 0, SCALE_MAX = 45;
  const pct = v => ((v - SCALE_MIN) / (SCALE_MAX - SCALE_MIN)) * 100;

  const grades = [
    { lo: 0,  hi: 14, name: 'D 級',  desc: '生態品質優先改善', bg: '#e2e8f0', fg: '#475569' },
    { lo: 15, hi: 22, name: 'C 級',  desc: '生態品質待關注',   bg: '#f5b544', fg: '#5a3d02' },
    { lo: 23, hi: 34, name: 'B 級',  desc: '生態品質良好',     bg: '#4a86d8', fg: '#fff' },
    { lo: 35, hi: 45, name: 'A 級',  desc: '生態品質佳',       bg: '#0d6b5b', fg: '#fff' },
  ];
  const inGrade = grades.find(g => lo >= g.lo && hi <= g.hi);

  const bands = grades.map(g => `
    <div style="position:absolute;left:${pct(g.lo)}%;width:${pct(g.hi + 1) - pct(g.lo)}%;
                top:0;bottom:0;background:${g.bg};display:flex;flex-direction:column;
                align-items:center;justify-content:center;color:${g.fg};overflow:hidden">
      <div style="font-size:11.5px;font-weight:900;white-space:nowrap">${g.name}</div>
      <div style="font-size:10px;opacity:.9;white-space:nowrap">${g.lo}–${g.hi}</div>
    </div>`).join('');

  //  四次評估的落點畫在等級帶「上方」獨立一列，避免壓住帶內的等級文字。
  //  四個值很接近（29.7～33.0）本來就會擠在一起——那正是「評級穩定」的樣子，
  //  不做散開處理，以免看起來像分散在不同等級。點上不標數值（最接近的
  //  29.7 與 30.3 會疊字），數值由下方四張卡片逐次列出。
  const dots = rounds.map(r => `
    <div style="position:absolute;left:${pct(r.value)}%;bottom:0;transform:translateX(-50%);
                display:flex;flex-direction:column;align-items:center"
         title="${r.label}：IBI ${r.value.toFixed(1)}">
      <div style="width:11px;height:11px;border-radius:50%;background:#fff;
                  border:2.5px solid #0f172a;box-shadow:0 1px 2px rgba(0,0,0,.25)"></div>
      <div style="width:1.5px;height:5px;background:#0f172a"></div>
    </div>`).join('');

  return `
    <div style="margin-bottom:14px">
      <div style="display:flex;align-items:baseline;gap:10px;flex-wrap:wrap;margin-bottom:12px">
        <span style="font-size:14px;font-weight:900;color:#0f172a">四次評估的等級落點</span>
        <span style="font-size:11.5px;color:#64748b">
          109夏、109秋、110夏、110秋共 4 次同口徑評估</span>
      </div>

      <div style="position:relative;height:20px;margin-bottom:1px">${dots}</div>
      <div style="position:relative;height:42px;border-radius:9px;overflow:hidden;
                  border:1px solid #cbd5e1">${bands}</div>

      <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:16px">
        ${rounds.map(r => `
          <div style="flex:1 1 120px;background:#f8fafc;border:1px solid #cbd5e1;
                      border-radius:9px;padding:9px 10px;text-align:center">
            <div style="font-size:11px;color:#64748b">${r.label}</div>
            <div style="font-size:20px;font-weight:900;color:#0d6b5b;margin-top:1px;
                        font-variant-numeric:tabular-nums">${r.value.toFixed(1)}</div>
          </div>`).join('')}
      </div>

      <div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:9px;
                  padding:10px 12px;margin-top:12px;font-size:12px;color:#0c4a6e;line-height:1.7">
        <b>四次評估全部落在 ${inGrade ? inGrade.name + '（' + inGrade.desc + '）' : '同一等級'}</b>，
        數值介於 ${lo.toFixed(1)}～${hi.toFixed(1)}，極差 ${(hi - lo).toFixed(1)} 分。
        四次結果集中，代表評級穩定，非單次調查的偶然結果。
        <span style="color:#475569">各次之間的高低屬季節與水文條件差異，次數僅 4 次，不足以判斷趨勢方向。</span>
      </div>
    </div>`;
}

/* ── 歷年魚類族群變化：小倍數圖（small multiples）──
   為什麼不用單張多線圖：八種魚的密度差了兩個數量級——臺灣白甲魚
   逐年介於 8.8～50.0 尾／次，短吻紅斑吻鰕虎只有 0.0～0.9。共用一條
   0～50 的縱軸時，間爬岩鰍、短臀瘋鱨、短吻紅斑吻鰕虎三種會被壓成
   貼著底線的平線，走勢完全看不出來；而這三種正是序列中變化最值得
   注意的（短臀瘋鱨與短吻紅斑吻鰕虎早期 0 個年度、近期分別出現於
   6/8 與 7/8 個年度）。八條線互相交叉也難以追蹤單一物種。

   改為每種一格、各自縮放，每格明確標示自己的尺度上限，並在格內直接
   標注早期→近期數值與出現年度，不需要對照圖例。原始數值全部保留，
   未作任何平滑或隱藏。 */
function hlxEco_speciesSmallMultiples(M) {
  const NAME = HLX_FISH_KEY_NAME;
  const years = M.years;
  //  以實際民國年定位橫軸，未調查的年度（105 年）留白而不連線，
  //  避免把不存在的年度用直線接起來，看起來像有調查資料。
  const yMin = years[0].roc, yMax = years[years.length - 1].roc;
  const span = Math.max(1, yMax - yMin);
  const PRE_LAST = HLX_ECO_PRE_LAST_YEAR - 1911;         // 民國 106
  const SITE_CHANGE_ROC = 111;   // 樣點自 3～6 處縮回上游／下游兩處之年度

  const W = 268, H = 104, PL = 34, PR = 10, PT = 12, PB = 20;
  const px = roc => PL + (roc - yMin) / span * (W - PL - PR);

  const panels = M.bySpecies.map(sp => {
    const color = HLX_ECO_SPECIES_COLOR[sp.key];
    const pts = years.map(y => ({ roc: y.roc, v: y.perTimeBy[sp.key], times: y.times }));
    const vmax = Math.max.apply(null, pts.map(p => p.v));
    //  每格自己的尺度上限（取整到好讀的刻度），下限一律為 0，
    //  因此格內高度仍可直接比較「相對於自己最高年」的幅度。
    const nice = vmax <= 1 ? Math.ceil(vmax * 10) / 10
               : vmax <= 5 ? Math.ceil(vmax)
               : Math.ceil(vmax / 5) * 5;
    const top = nice > 0 ? nice : 1;
    const py = v => PT + (1 - v / top) * (H - PT - PB);

    //  相鄰年度才用實線相連；中間有未調查年度（104→106，105 年無調查）
    //  的區段改畫虛線，避免用一條實線把不存在的調查年度接過去。
    const solid = [], gaps = [];
    let run = [pts[0]];
    for (let i = 1; i < pts.length; i++) {
      if (pts[i].roc - pts[i - 1].roc === 1) { run.push(pts[i]); }
      else { solid.push(run); gaps.push([pts[i - 1], pts[i]]); run = [pts[i]]; }
    }
    solid.push(run);
    const toPath = arr => arr.map((p, i) => (i ? 'L' : 'M') +
      px(p.roc).toFixed(1) + ' ' + py(p.v).toFixed(1)).join(' ');
    const line = solid.filter(r => r.length > 1).map(toPath).join(' ');
    const gapLine = gaps.map(toPath).join(' ');
    //  面積填色沿用完整序列，僅作背景襯托，判讀以線與點為準
    const areaSpine = pts.map((p, i) => (i ? 'L' : 'M') +
      px(p.roc).toFixed(1) + ' ' + py(p.v).toFixed(1)).join(' ');
    const area = areaSpine + ' L' + px(pts[pts.length - 1].roc).toFixed(1) + ' ' + py(0).toFixed(1) +
                 ' L' + px(pts[0].roc).toFixed(1) + ' ' + py(0).toFixed(1) + ' Z';
    const dots = pts.map(p => {
      const last = p.roc === yMax;
      return `<circle cx="${px(p.roc).toFixed(1)}" cy="${py(p.v).toFixed(1)}" r="${last ? 3.4 : 2.1}"
                fill="${last ? color : '#fff'}" stroke="${color}" stroke-width="${last ? 1.6 : 1.5}">
                <title>${sp.name}　${p.roc} 年：${p.v.toFixed(1)} 尾／次（該年 ${p.times} 次調查）</title>
              </circle>`;
    }).join('');

    //  早期／近期分界線落在 106 與 107 之間
    const divX = px(PRE_LAST + 0.5).toFixed(1);
    //  111 年起樣點由 3～6 處縮回上游／下游兩處，並改用 Survey123 逐尾記錄。
    //  「尾／次」校正的是站次，校正不掉樣點位置改變；纓口臺鰍、臺灣鬚鱲、
    //  明潭吻鰕虎的高峰都落在樣點最多的 107～108 年，之後的下降與此變更同時
    //  發生。同期臺灣白甲魚反而上升，故不宜逕自解讀為族群減少。此線用於提示
    //  該處存在調查設計變更，不對成因作結論。
    const siteChangeX = px(SITE_CHANGE_ROC - 0.5).toFixed(1);
    const gid = 'hlxsm_' + sp.key;
    const delta = sp.diff > 0 ? '+' + sp.diff.toFixed(1)
                : sp.diff < 0 ? sp.diff.toFixed(1) : '0.0';
    const deltaColor = sp.diff < 0 ? '#b45309' : HLX_ECO_INK.t2;
    const isNew = sp.yearsPre === 0 && sp.yearsPost > 0;

    return `
      <div style="background:#fff;border:1px solid ${HLX_ECO_INK.line};border-radius:11px;padding:11px 12px 8px">
        <div style="display:flex;align-items:baseline;gap:7px;margin-bottom:1px">
          <span style="width:9px;height:9px;border-radius:2px;background:${color};flex-shrink:0"></span>
          <span style="font-size:13.5px;font-weight:800;color:${HLX_ECO_INK.t1}">${sp.name}</span>
          ${isNew ? `<span style="font-size:10.5px;font-weight:700;color:#0e7490;background:#ecfeff;
                       border:1px solid #a5f3fc;border-radius:4px;padding:0 5px">早期未記錄</span>` : ''}
        </div>
        <div style="font-size:11.5px;color:${HLX_ECO_INK.t2};margin-bottom:2px;
                    font-variant-numeric:tabular-nums">
          早期 ${sp.pre.toFixed(1)} → 近期 <b style="color:${HLX_ECO_INK.t1}">${sp.post.toFixed(1)}</b>
          <span style="color:${deltaColor}">（${delta}）</span>
          <span style="color:${HLX_ECO_INK.t3}">・${M.pre.length} 個早期年度中 ${sp.yearsPre} 年抓到 →
            ${M.post.length} 個近期年度中 ${sp.yearsPost} 年抓到</span>
        </div>
        <svg viewBox="0 0 ${W} ${H}" style="width:100%;height:auto;display:block" role="img"
             aria-label="${sp.name}逐年平均尾數，本格尺度上限 ${top} 尾／次">
          <defs>
            <linearGradient id="${gid}" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="${color}" stop-opacity="0.26"/>
              <stop offset="100%" stop-color="${color}" stop-opacity="0.02"/>
            </linearGradient>
          </defs>
          <line x1="${PL}" y1="${py(top)}" x2="${W - PR}" y2="${py(top)}"
                stroke="${HLX_ECO_INK.line}" stroke-width="1" stroke-dasharray="2 3"/>
          <line x1="${PL}" y1="${py(0)}" x2="${W - PR}" y2="${py(0)}"
                stroke="${HLX_ECO_INK.line}" stroke-width="1"/>
          <line x1="${divX}" y1="${PT - 4}" x2="${divX}" y2="${py(0)}"
                stroke="#cbd5e1" stroke-width="1" stroke-dasharray="3 3"/>
          <line x1="${siteChangeX}" y1="${PT - 4}" x2="${siteChangeX}" y2="${py(0)}"
                stroke="#f59e0b" stroke-width="1" stroke-dasharray="2 3" opacity="0.9"/>
          <path d="${area}" fill="url(#${gid})"/>
          <path d="${gapLine}" fill="none" stroke="${color}" stroke-width="1.6"
                stroke-dasharray="3 3" opacity="0.55" stroke-linecap="round"/>
          <path d="${line}" fill="none" stroke="${color}" stroke-width="1.9"
                stroke-linejoin="round" stroke-linecap="round"/>
          ${dots}
          <text x="${PL - 5}" y="${py(top) + 3.5}" text-anchor="end"
                font-size="9.5" fill="${HLX_ECO_INK.t3}">${top}</text>
          <text x="${PL - 5}" y="${py(0) + 3.5}" text-anchor="end"
                font-size="9.5" fill="${HLX_ECO_INK.t3}">0</text>
          <text x="${px(yMin)}" y="${H - 6}" text-anchor="middle"
                font-size="9.5" fill="${HLX_ECO_INK.t3}">${yMin}</text>
          <text x="${divX}" y="${H - 6}" text-anchor="middle"
                font-size="9.5" fill="${HLX_ECO_INK.t3}">改善</text>
          <text x="${px(yMax)}" y="${H - 6}" text-anchor="middle"
                font-size="9.5" fill="${HLX_ECO_INK.t3}">${yMax}</text>
        </svg>
      </div>`;
  }).join('');

  return `
    <div style="display:flex;flex-wrap:wrap;gap:8px 16px;align-items:center;
                font-size:11.5px;color:${HLX_ECO_INK.t2};margin-bottom:11px">
      <span><b style="color:${HLX_ECO_INK.t1}">每格縱軸各自縮放</b>，格左上角數字為該格上限，
            下限一律為 0——格與格之間<b>不可直接比高低</b>，要比請看下方第四張圖。</span>
      <span style="color:${HLX_ECO_INK.t3}">灰虛線為早期／近期分界（106｜107 年）・105 年未進行調查，跨越該年的區段以虛線表示</span>
      <span style="width:100%;color:${HLX_ECO_INK.t2};background:#f1f5f9;
                   border-left:3px solid #94a3b8;border-radius:0 6px 6px 0;padding:7px 10px">
        <b>每格標題下那行數字怎麼看</b>：<br>
        「早期 7.3 → 近期 15.4（+8.1）」＝該物種平均每次調查抓到的尾數，由改善前的 7.3 尾變為改善後的 15.4 尾。<br>
        「3 個早期年度中 3 年抓到 → 8 個近期年度中 8 年抓到」＝<b>出現的穩定度</b>。
        早期共 3 個調查年度（103、104、106 年），近期共 8 個（107～114 年）；
        分子是其中「有抓到這種魚」的年度數。3/3 代表每年都有、1/3 代表只有一年有。
        尾數看的是<b>多寡</b>，年度數看的是<b>穩不穩定出現</b>，兩者要一起看。
      </span>
      <span style="color:#b45309"><b>橘線＝111 年起調查樣點改變</b>：樣點由 3～6 處縮回上游／下游兩處，
            並改用 Survey123 逐尾記錄。「尾／次」校正的是站次，校正不掉樣點位置改變，
            因此橘線右側的高低不宜與左側直接相比。</span>
    </div>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(252px,1fr));gap:10px">
      ${panels}
    </div>`;
}

function renderEcoTrendSummary() {
  const M = hlxEcoMonitor();
  const S = M.summary, NAME = HLX_FISH_KEY_NAME;
  const f1 = v => v.toFixed(1);
  const preYears = M.pre.map(y => y.roc).join('、');
  const postYears = M.post[0].roc + '～' + M.post[M.post.length - 1].roc;
  const latest = M.years[M.years.length - 1];

  //  近期年度的尾／次區間，用來描述族群量的自然波動幅度
  const postMin = Math.min.apply(null, M.post.map(y => y.perTime));
  const postMax = Math.max.apply(null, M.post.map(y => y.perTime));
  //  近期達到全部物種數的年度
  const fullYears = M.post.filter(y => y.species === M.keys.length).map(y => y.roc);
  //  近期出現年度數較早期增加的物種（描述利用範圍擴大，不作優劣評價）
  const wider = M.bySpecies.filter(sp =>
    (sp.yearsPost / M.post.length) > (sp.yearsPre / M.pre.length) + 0.15);
  //  河段覆蓋情形
  const segPost = M.segments.filter(s => s.phase === 'post');
  const segPre  = M.segments.filter(s => s.phase === 'pre');
  const segLine = (segPost.length === 2 && segPre.length === 2)
    ? `上游由 ${f1(segPre.find(s=>s.seg==='上游').perTime)} 變為 ${f1(segPost.find(s=>s.seg==='上游').perTime)} 尾／次、`
      + `下游由 ${f1(segPre.find(s=>s.seg==='下游').perTime)} 變為 ${f1(segPost.find(s=>s.seg==='下游').perTime)} 尾／次，`
      + `兩個河段的記錄物種數分別為 ${segPre.find(s=>s.seg==='上游').species}→${segPost.find(s=>s.seg==='上游').species} 種與 `
      + `${segPre.find(s=>s.seg==='下游').species}→${segPost.find(s=>s.seg==='下游').species} 種`
    : '';

  const cards = [
    { k: '調查累積', v: S.events + ' 場次', s: `${S.times} 次調查 ‧ ${S.spanFrom}～${S.spanTo} 年` },
    { k: '累計記錄', v: S.total.toLocaleString() + ' 尾', s: `${S.species} 種，全為臺灣特有種` },
    { k: '平均每次調查尾數', v: f1(S.perTimePost) + ' 尾／次', s: `早期 ${f1(S.perTimePre)} → 近期 ${f1(S.perTimePost)}` },
    { k: '年度記錄物種數', v: f1(S.speciesPost) + ' 種', s: `早期平均 ${f1(S.speciesPre)} → 近期平均 ${f1(S.speciesPost)}` }
  ];

  return `
  <div style="border:1px solid #bfdbfe;border-radius:16px;overflow:hidden;margin-bottom:26px;background:#f8fbff">
    <div style="padding:18px 22px;background:linear-gradient(135deg,#eff6ff,#f8fbff);border-bottom:1px solid #bfdbfe">
      <div style="font-size:19px;font-weight:900;color:#0f172a;margin-bottom:9px">
        <i class="fas fa-seedling" style="color:#1c5cab;margin-right:9px"></i>生態趨勢摘要
      </div>
      <div style="font-size:15px;color:#0f172a;line-height:2">
        ${S.spanFrom}～${S.spanTo} 年累積 ${S.events} 場次、${S.times} 次調查，
        記錄 ${S.total.toLocaleString()} 尾、${S.species} 種魚類，
        <b>全部為臺灣特有種，序列中未記錄到外來種</b>。
        平均每次調查記錄尾數由早期（${preYears} 年）的 ${f1(S.perTimePre)} 尾／次，
        變為近期（${postYears} 年）的 <b>${f1(S.perTimePost)} 尾／次</b>；
        年度記錄物種數由平均 ${f1(S.speciesPre)} 種變為 <b>${f1(S.speciesPost)} 種</b>，
        其中 ${fullYears.length} 個年度（${fullYears.join('、')} 年）記錄到全部 ${M.keys.length} 種。
        ${wider.length ? `${wider.slice(0,3).map(x=>x.name).join('、')}${wider.length>3?'等 '+wider.length+' 種':''}在近期的出現年度比例明顯提高，
        顯示這些物種<b>對河段的利用範圍有所擴大</b>。` : ''}
        ${segLine ? segLine + '，<b>上下游兩個河段皆持續有魚類利用</b>。' : ''}
        近期各年度介於 ${f1(postMin)}～${f1(postMax)} 尾／次之間，
        屬溪流魚類隨水文年豐枯與季節變動的<b>自然年際波動</b>；
        整體而言，主要物種在改善後仍<b>持續維持一定的出現水準</b>，
        物種組成則呈現由單一優勢物種轉為多物種共存的<b>群聚結構變化</b>，
        可作為後續維護管理與棲地改善的判讀依據。
      </div>
    </div>
    <div style="padding:16px 20px;display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:13px">
      ${cards.map(c => `
        <div style="background:#fff;border:1px solid #dbeafe;border-radius:12px;padding:15px 17px">
          <div style="font-size:13.5px;color:#475569;font-weight:700;margin-bottom:7px">${c.k}</div>
          <div style="font-size:27px;font-weight:900;color:#0f172a;line-height:1.1;
                      font-variant-numeric:tabular-nums">${c.v}</div>
          <div style="font-size:13px;color:#64748b;margin-top:7px;line-height:1.6">${c.s}</div>
        </div>`).join('')}
    </div>
    <div style="padding:12px 20px;background:#eff6ff;border-top:1px solid #bfdbfe;
                font-size:13px;color:#475569;line-height:1.75">
      <b>單位說明：</b>「尾／次」的 1 次＝一個樣站完成一次調查；「尾」為原始記錄總量；
      「種」為該期間記錄到的物種數。三種單位不可互相換算，圖表中已分別標示。
      本摘要文字與數值均由原始調查場次即時計算，資料更新後會同步變動。
    </div>
  </div>`;
}

function renderEcoMonitorDashboard() {
  const M = hlxEcoMonitor();
  const S = M.summary, NAME = HLX_FISH_KEY_NAME;
  const f1 = v => v.toFixed(1);
  const preYears  = M.pre.map(y => y.roc).join('、');
  const postYears = M.post[0].roc + '～' + M.post[M.post.length - 1].roc;

  //  棲地資料位於 chapter4_ecology.js（載入順序在後），繪製時才取用
  const MR = (typeof MONITORING_REPORT !== 'undefined') ? MONITORING_REPORT : null;
  const ha = MR ? MR.habitatAssessment : null;

  //  上升／下降一律用同一組中性字彙，不使用箭頭與警示色
  const diffText = d => (d >= 0 ? '＋' : '－') + Math.abs(d).toFixed(2);

  //  河段解讀用的即時敘述（無上下游配對資料時給替代說明）
  const _sgPre = M.segments.filter(x => x.phase === 'pre');
  const _sgPost = M.segments.filter(x => x.phase === 'post');
  const _sg = k => ({ pre: _sgPre.filter(x => x.seg === k)[0], post: _sgPost.filter(x => x.seg === k)[0] });
  const segLineFound = (_sg('上游').pre && _sg('上游').post && _sg('下游').pre && _sg('下游').post)
    ? `上游由 ${_sg('上游').pre.perTime.toFixed(1)} 變為 ${_sg('上游').post.perTime.toFixed(1)} 尾／次、`
      + `記錄物種 ${_sg('上游').pre.species} → ${_sg('上游').post.species} 種；`
      + `下游由 ${_sg('下游').pre.perTime.toFixed(1)} 變為 ${_sg('下游').post.perTime.toFixed(1)} 尾／次、`
      + `記錄物種 ${_sg('下游').pre.species} → ${_sg('下游').post.species} 種。`
    : '目前具明確上下游標示的配對場次有限，僅呈現現有分層結果。';

  return `
  <div style="border:1px solid ${HLX_ECO_INK.line};border-radius:18px;overflow:hidden;
              margin-bottom:30px;background:#fff">

    <!-- 標題帶 -->
    <div style="background:linear-gradient(135deg,#0f2e52 0%,#1c5cab 60%,#2a78d6 100%);padding:24px 28px;color:#fff">
      <div style="font-size:12.5px;font-weight:800;letter-spacing:2.5px;color:#b7d3f6;margin-bottom:8px">
        橫流溪生態監測儀表板
      </div>
      <div style="font-size:25px;font-weight:900;letter-spacing:-.4px;margin-bottom:10px">
        歷年魚類族群與物種組成變化
      </div>
      <div style="font-size:14.5px;line-height:1.85;color:#dbeafe;max-width:1020px">
        ${S.spanFrom}～${S.spanTo} 年共 ${S.events} 場次、${S.times} 次調查，累計 ${S.total.toLocaleString()} 尾、${S.species} 種。
        全部圖表以<b style="color:#fff">「尾／次」</b>為單位 ——
        <b style="color:#fff">1 次＝一個樣站完成一次調查</b>，即「平均每次調查記錄到幾尾」。
        本頁呈現的是<b style="color:#b7d3f6">環境變化訊號</b>，
        數量的年際增減反映族群量波動與棲地利用情形改變，
        應對照水文條件、潭瀨組成、底質與流況一併判讀，原始數值全部保留。
      </div>
    </div>

    <div style="padding:24px 26px">

      <!-- 概覽 -->
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(215px,1fr));gap:13px;margin-bottom:30px">
        ${hlxEco_statBlock({ label:'累計調查', value:S.events, unit:'場次',
          sub:`合計 ${S.times} 次（樣站別）‧ ${S.spanFrom}～${S.spanTo} 年` })}
        ${hlxEco_statBlock({ label:'累計記錄尾數', value:S.total.toLocaleString(), unit:'尾',
          sub:`逐場次原始紀錄合計，未經任何調整` })}
        ${hlxEco_statBlock({ label:'記錄物種', value:S.species, unit:'種',
          sub:`全數為臺灣特有種，序列中未記錄到外來種` })}
        ${hlxEco_statBlock({ label:'平均每次調查尾數', value:f1(S.perTimePost), unit:'尾／次（近期）',
          sub:`早期（${preYears} 年）${f1(S.perTimePre)} 尾／次　→　近期（${postYears} 年）${f1(S.perTimePost)} 尾／次` })}
      </div>

      <!-- 一、各年度平均調查尾數 -->
      <div style="margin-bottom:30px">
        ${hlxEco_sectionHead(1, '各年度平均調查尾數',
          `每一年的平均每次調查尾數。色階由淺到深代表年度先後，僅用於區分時間，不代表數值高低優劣。
           年度之間的差異同時受水文年、季節安排與河道環境條件影響，屬<b>族群量波動</b>的正常表現。`)}
        <div style="background:#f8fafc;border:1px solid ${HLX_ECO_INK.line};border-radius:14px;padding:16px 18px">
          <div style="position:relative;height:300px"><canvas id="hlxYearBar"></canvas></div>
          ${hlxEco_readNote({
            what: '每一年「平均每次調查記錄到幾尾魚」，代表河段整體被魚類利用的密集程度。',
            axes: '橫軸為民國年度；縱軸為尾／次（1 次＝一個樣站完成一次調查）。柱子越高，代表那一年單次調查平均記錄到的魚越多。',
            how: '重點不在比誰高，而在看整體水準有沒有維持。溪流魚類數量本來就會隨水量、季節與洪水事件起伏，單一年度的高低不必單獨解讀。',
            found: `早期（${M.pre.map(y=>y.roc).join('、')} 年）平均 ${S.perTimePre.toFixed(1)} 尾／次，近期（${M.post[0].roc}～${M.post[M.post.length-1].roc} 年）平均 ${S.perTimePost.toFixed(1)} 尾／次；近期各年介於 ${Math.min.apply(null,M.post.map(y=>y.perTime)).toFixed(1)}～${Math.max.apply(null,M.post.map(y=>y.perTime)).toFixed(1)} 尾／次之間變動。`,
            signal: '單次調查平均記錄尾數維持在一定水準，代表河段持續提供魚類可利用的空間。年度之間的起伏可搭配當年水文條件、颱洪事件與魚道維護情形一併判讀。'
          })}
        </div>
      </div>

      <!-- 二、歷年魚類族群變化 -->
      <div style="margin-bottom:30px">
        ${hlxEco_sectionHead(2, '歷年魚類族群變化（各物種尾／次）',
          `八種魚類<b>各自一格</b>，每格縱軸依該物種自己的數量範圍縮放。
           這樣安排是因為八種魚的密度差了兩個數量級（臺灣白甲魚最高 50.0 尾／次、
           短吻紅斑吻鰕虎最高 0.9），共用一條縱軸時數量少的物種會被壓成貼地平線，
           走勢完全看不出來。分開後每一種的<b>利用情形改變</b>都能各自判讀。`)}
        <div style="background:#f8fafc;border:1px solid ${HLX_ECO_INK.line};border-radius:14px;padding:16px 18px">
          ${hlxEco_speciesSmallMultiples(M)}
          ${hlxEco_readNote({
            what: '八種魚類「各自」的平均每次調查尾數逐年變化，看的是不同物種對河段的利用情形。',
            axes: '橫軸為民國年度，105 年未進行調查，跨越該年的線段以虛線表示；縱軸為尾／次，且每一格各自縮放——格左上角的數字就是該格的上限，下限一律為 0。虛線為早期／近期分界（106｜107 年）。',
            how: '看每一格自己的起伏形狀。因為各格尺度不同，格與格之間不可直接比高低；要比較物種間的絕對數量，請看第四張「改善前後各物種平均尾／次」。滑鼠移到圓點可看該年數值與調查次數。',
            found: `${M.bySpecies[0].name}與${M.bySpecies[1].name}長期維持較高水準；${M.bySpecies.filter(x=>x.yearsPre===0&&x.yearsPost>0).map(x=>x.name).join('、') || '部分物種'}在早期未記錄到、近期開始出現。`,
            signal: '多條線同時維持一定高度，代表河段能同時支持多種生態習性不同的魚類；不同物種的走勢差異，反映牠們對水深、流速與底質等條件的偏好各不相同。'
          })}
        </div>
      </div>

      <!-- 三、物種組成時序變化 -->
      <div style="margin-bottom:30px">
        ${hlxEco_sectionHead(3, '物種組成時序變化',
          `各年度捕獲組成的百分比堆疊。此圖不看總量，只看<b>組成結構</b> ——
           色帶寬度改變即代表群聚組成改變。`)}
        <div style="background:#f8fafc;border:1px solid ${HLX_ECO_INK.line};border-radius:14px;padding:16px 18px">
          <div style="position:relative;height:360px"><canvas id="hlxCompStack"></canvas></div>
          ${hlxEco_readNote({
            what: '每一年捕獲組成的「比例結構」，看的是群聚由哪些物種構成，與總量多寡無關。',
            axes: '橫軸為民國年度；縱軸為百分比，每一年固定加總為 100%。色帶越寬代表該物種在當年組成中占比越高。',
            how: '看色帶寬度的變化。單一色帶長期很寬，代表群聚由少數物種主導；色帶變得比較平均，代表多物種共存的程度提高。',
            found: `早期單一物種占比最高曾達 ${Math.max.apply(null, M.pre.map(y=>y.shareBy[y.dominant.key])).toFixed(1)}%；近期年度的最高占比多在 ${Math.min.apply(null, M.post.map(y=>y.shareBy[y.dominant.key])).toFixed(1)}～${Math.max.apply(null, M.post.map(y=>y.shareBy[y.dominant.key])).toFixed(1)}% 之間，色帶分布較為分散。`,
            signal: '組成由少數物種主導轉為多物種並存，通常對應河道流況與棲地型態變得多樣——深潭、淺瀨、緩流與深流各自支持不同游泳能力與攝食型態的魚類。'
          })}
        </div>
      </div>

      <!-- 四、優勢物種轉換 -->
      <div style="margin-bottom:30px">
        ${hlxEco_sectionHead(4, '優勢物種與次要物種的年度轉換',
          `每一年組成占比最高與次高的物種。早期由單一物種長期主導，
           近年出現<b>優勢物種輪替</b>與次要物種變動，是群聚組成改變的直接表現。`)}
        <div style="border:1px solid ${HLX_ECO_INK.line};border-radius:14px;overflow-x:auto">
          <table style="width:100%;border-collapse:collapse;font-size:13.5px;min-width:640px">
            <thead><tr style="background:#f8fafc">
              <th style="padding:9px 12px;text-align:left;border-bottom:2px solid ${HLX_ECO_INK.line};color:${HLX_ECO_INK.t2}">年度</th>
              <th style="padding:9px 12px;text-align:left;border-bottom:2px solid ${HLX_ECO_INK.line};color:${HLX_ECO_INK.t2}">組成占比最高</th>
              <th style="padding:9px 12px;text-align:left;border-bottom:2px solid ${HLX_ECO_INK.line};color:${HLX_ECO_INK.t2}">次高</th>
              <th style="padding:9px 12px;text-align:right;border-bottom:2px solid ${HLX_ECO_INK.line};color:${HLX_ECO_INK.t2}">最高者占比</th>
              <th style="padding:9px 12px;text-align:left;border-bottom:2px solid ${HLX_ECO_INK.line};color:${HLX_ECO_INK.t2}">組成分布</th>
            </tr></thead>
            <tbody>
              ${M.years.map(y => `
                <tr>
                  <td style="padding:8px 12px;border-bottom:1px solid #edf2f7;font-weight:800;color:${HLX_ECO_INK.t1};
                             font-variant-numeric:tabular-nums">${y.roc} 年</td>
                  <td style="padding:8px 12px;border-bottom:1px solid #edf2f7;color:${HLX_ECO_INK.t1}">
                    <span style="display:inline-block;width:10px;height:10px;border-radius:3px;
                          background:${HLX_ECO_SPECIES_COLOR[y.dominant.key]};margin-right:7px"></span>${NAME[y.dominant.key]}</td>
                  <td style="padding:8px 12px;border-bottom:1px solid #edf2f7;color:${HLX_ECO_INK.t2}">
                    <span style="display:inline-block;width:10px;height:10px;border-radius:3px;
                          background:${HLX_ECO_SPECIES_COLOR[y.second.key]};margin-right:7px"></span>${NAME[y.second.key]}</td>
                  <td style="padding:8px 12px;border-bottom:1px solid #edf2f7;text-align:right;
                             font-variant-numeric:tabular-nums;color:${HLX_ECO_INK.t1};font-weight:700">${y.shareBy[y.dominant.key].toFixed(1)}%</td>
                  <td style="padding:8px 12px;border-bottom:1px solid #edf2f7;width:38%">
                    <div style="display:flex;height:11px;border-radius:3px;overflow:hidden;background:#f1f5f9">
                      ${M.keys.filter(k => y.shareBy[k] > 0).map(k =>
                        `<div title="${NAME[k]} ${y.shareBy[k].toFixed(1)}%" style="width:${y.shareBy[k]}%;
                              background:${HLX_ECO_SPECIES_COLOR[k]}"></div>`).join('')}
                    </div>
                  </td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <!-- 五、改善前後魚類利用情形 -->
      <div style="margin-bottom:30px">
        ${hlxEco_sectionHead(5, '改善前後魚類利用情形（各物種平均尾／次）',
          `以魚道啟用時間（107 年）為界，比較各物種平均每次調查尾數。
           淺色為早期（${preYears} 年）、深色為近期（${postYears} 年），同色系深淺代表時間先後。
           <b>八種全部列出，包含數值下降者</b>；數值變化反映各物種對河道環境的利用情形改變。`)}
        <div style="background:#f8fafc;border:1px solid ${HLX_ECO_INK.line};border-radius:14px;padding:16px 18px">
          <div style="position:relative;height:400px"><canvas id="hlxPhaseBar"></canvas></div>
          ${hlxEco_readNote({
            what: '以魚道啟用時間為界，比較每一種魚在兩個時期的平均每次調查尾數。',
            axes: '橫軸為尾／次；縱軸為物種。每種魚有兩條長條，淺色為早期、深色為近期，同色系深淺代表時間先後。',
            how: '看同一種魚的兩條長條相對長度。長條變長代表該物種在近期調查中被記錄到的數量較多，變短則代表牠改變了對該河段的利用方式，不必解讀為好壞。',
            found: `八種中有 ${M.bySpecies.filter(x=>x.diff>0).length} 種近期平均尾／次較早期高、${M.bySpecies.filter(x=>x.diff<0).length} 種較低（${M.bySpecies.filter(x=>x.diff<0).map(x=>x.name).join('、') || '無'}）；數值全部列出，未作任何隱藏。`,
            signal: '多數物種在近期維持或提高利用程度，顯示河段持續提供可用棲地；個別物種的減少多與其偏好的微棲地（如急流淺瀨、礫石孔隙）面積變化有關，屬棲地利用型態的調整。'
          })}
        </div>
        <div style="overflow-x:auto;margin-top:12px;border:1px solid ${HLX_ECO_INK.line};border-radius:12px">
          <table style="width:100%;border-collapse:collapse;font-size:13.5px;min-width:700px">
            <thead><tr style="background:#f8fafc">
              <th style="padding:9px 12px;text-align:left;border-bottom:2px solid ${HLX_ECO_INK.line};color:${HLX_ECO_INK.t2}">物種</th>
              <th style="padding:9px 12px;text-align:right;border-bottom:2px solid ${HLX_ECO_INK.line};color:${HLX_ECO_INK.t2}">早期 尾／次</th>
              <th style="padding:9px 12px;text-align:right;border-bottom:2px solid ${HLX_ECO_INK.line};color:${HLX_ECO_INK.t2}">近期 尾／次</th>
              <th style="padding:9px 12px;text-align:right;border-bottom:2px solid ${HLX_ECO_INK.line};color:${HLX_ECO_INK.t2}">差值</th>
              <th style="padding:9px 12px;text-align:right;border-bottom:2px solid ${HLX_ECO_INK.line};color:${HLX_ECO_INK.t2}">累計尾數</th>
              <th style="padding:9px 12px;text-align:left;border-bottom:2px solid ${HLX_ECO_INK.line};color:${HLX_ECO_INK.t2}">出現年度</th>
            </tr></thead>
            <tbody>
              ${M.bySpecies.map(sp => `
                <tr>
                  <td style="padding:8px 12px;border-bottom:1px solid #edf2f7;font-weight:700;color:${HLX_ECO_INK.t1}">
                    <span style="display:inline-block;width:10px;height:10px;border-radius:3px;
                          background:${sp.color};margin-right:7px"></span>${sp.name}</td>
                  <td style="padding:8px 12px;border-bottom:1px solid #edf2f7;text-align:right;
                             font-variant-numeric:tabular-nums;color:${HLX_ECO_INK.t2}">${sp.pre.toFixed(2)}</td>
                  <td style="padding:8px 12px;border-bottom:1px solid #edf2f7;text-align:right;
                             font-variant-numeric:tabular-nums;font-weight:800;color:${HLX_ECO_INK.t1}">${sp.post.toFixed(2)}</td>
                  <td style="padding:8px 12px;border-bottom:1px solid #edf2f7;text-align:right;
                             font-variant-numeric:tabular-nums;color:${HLX_ECO_INK.t2}">${diffText(sp.diff)}</td>
                  <td style="padding:8px 12px;border-bottom:1px solid #edf2f7;text-align:right;
                             font-variant-numeric:tabular-nums;color:${HLX_ECO_INK.t2}">${sp.total.toLocaleString()}</td>
                  <td style="padding:8px 12px;border-bottom:1px solid #edf2f7;font-size:12.5px;color:${HLX_ECO_INK.t3}">
                    早期 ${sp.yearsPre}/${M.pre.length} 年 ‧ 近期 ${sp.yearsPost}/${M.post.length} 年</td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <!-- 六、河段生態組成變化 -->
      ${M.segments.length >= 2 ? `
      <div style="margin-bottom:30px">
        ${hlxEco_sectionHead(6, '河段生態組成變化（上游 vs 下游）',
          `僅採調查表上明確標示上游或下游的場次（其餘僅標「橫流溪」者不納入，也不推測）。
           呈現兩個河段在不同時期的物種組成與平均尾／次差異，
           可用來觀察<b>魚類在河道縱向上的分布與利用情形變化</b>。`)}
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:14px;margin-bottom:14px">
          ${M.segments.map(sg => `
            <div style="background:#fff;border:1px solid ${HLX_ECO_INK.line};
                        border-left:4px solid ${sg.seg==='上游'?HLX_ECO_SEG_COLOR.up:HLX_ECO_SEG_COLOR.down};
                        border-radius:12px;padding:14px 16px">
              <div style="font-size:13px;color:${HLX_ECO_INK.t2};font-weight:700;margin-bottom:6px">
                ${sg.phase==='pre'?'早期':'近期'} ‧ ${sg.seg}
              </div>
              <div style="display:flex;align-items:baseline;gap:8px">
                <span style="font-size:27px;font-weight:900;color:${HLX_ECO_INK.t1};
                             font-variant-numeric:tabular-nums">${sg.perTime.toFixed(1)}</span>
                <span style="font-size:13px;color:${HLX_ECO_INK.t2}">尾／次</span>
              </div>
              <div style="font-size:12.5px;color:${HLX_ECO_INK.t3};margin-top:6px;line-height:1.65">
                ${sg.times} 次調查 ‧ ${sg.total.toLocaleString()} 尾 ‧ ${sg.species} 種
              </div>
              <div style="display:flex;height:9px;border-radius:3px;overflow:hidden;background:#f1f5f9;margin-top:9px">
                ${M.keys.filter(k=>sg.shareBy[k]>0).map(k=>
                  `<div title="${NAME[k]} ${sg.shareBy[k].toFixed(1)}%" style="width:${sg.shareBy[k]}%;
                        background:${HLX_ECO_SPECIES_COLOR[k]}"></div>`).join('')}
              </div>
            </div>`).join('')}
        </div>
        <div style="background:#f8fafc;border:1px solid ${HLX_ECO_INK.line};border-radius:14px;padding:16px 18px">
          <div style="position:relative;height:380px"><canvas id="hlxSegBar"></canvas></div>
          ${hlxEco_readNote({
            what: '上游與下游兩個河段，在早期與近期各自的物種組成與平均尾／次。',
            axes: '橫軸為四個「時期＋河段」組合；縱軸為尾／次的堆疊高度，每一段顏色代表一種魚。',
            how: '柱子總高度看該河段單次調查平均記錄到的總尾數，各色段高度看是哪些魚組成的。比較同一河段的早期與近期柱子，可看出該河段被利用的情形如何改變。',
            found: segLineFound,
            signal: '兩個河段都持續有魚類利用，且上游記錄到的物種數增加，代表魚類在河道縱向上的分布範圍有所延伸；上下游組成的差異則反映兩段本身的水深、流速與底質條件不同。'
          })}
        </div>
      </div>` : ''}

      <!-- 七、環境條件對應解讀 -->
      <div style="border:1px solid #bfdbfe;border-radius:14px;overflow:hidden;background:#f8fbff">
        <div style="padding:14px 18px;background:#eff6ff;border-bottom:1px solid #bfdbfe">
          <div style="font-size:16px;font-weight:900;color:${HLX_ECO_INK.t1}">環境條件與群聚變化的對應解讀</div>
          <div style="font-size:12.5px;color:${HLX_ECO_INK.t2};margin-top:4px;line-height:1.7">
            以下就資料中觀察到的組成變化，對照水文條件、棲地連通性、潭瀨組成、底質與流況提出可能的環境成因，
            供後續監測設計參考；不作成效判定。
          </div>
        </div>
        <div style="padding:16px 18px;display:grid;gap:11px">
          ${[
            { t:'優勢物種由單一主導轉為輪替',
              d:`早期臺灣白甲魚長期居於組成首位，${M.pre[M.pre.length-1].roc} 年占比達 ${M.pre[M.pre.length-1].shareBy['bai'].toFixed(1)}%；
                 近期則出現明潭吻鰕虎與臺灣白甲魚交替居首的情形，次要物種也由臺灣石魚賓單一，轉為臺灣鬚鱲與臺灣石魚賓輪替。
                 群聚由單一物種主導轉為多物種共存，通常對應<b>流況多樣性與潭瀨結構的變化</b> ——
                 深潭、淺瀨、緩流與深流各自支持不同游泳能力與攝食型態的魚類。`},
            { t:'底棲與縫隙型物種在近期出現於上游河段',
              d:`纓口臺鰍、短臀瘋鱨與短吻紅斑吻鰕虎在早期的上游調查中未有紀錄，近期則在上游河段被記錄到。
                 這三種均屬<b>底棲吸附或縫隙棲息型</b>，對河道縱向落差與底質孔隙較敏感。
                 其在上游出現，與<b>棲地連通性條件改變</b>以及上游段礫石底質可利用性有關。`},
            { t:'臺灣間爬岩鰍的棲地利用情形改變',
              d:`該種平均尾／次由早期 ${M.bySpecies.filter(s=>s.key==='jian')[0].pre.toFixed(2)} 變為近期
                 ${M.bySpecies.filter(s=>s.key==='jian')[0].post.toFixed(2)}，且近年多集中於下游河段。
                 臺灣間爬岩鰍為典型<b>急流淺瀨底棲魚</b>，需要流速快、水淺、溶氧高且卵石與大礫石孔隙未被細砂填塞的底床。
                 ${ha ? `現地棲地調查顯示淺瀨占比上游 ${ha.upstreamTypes['淺瀨']}%、下游 ${ha.downstreamTypes['淺瀨']}%，` : ''}
                 此類微棲地面積本就有限，且對<b>河床細粒化與颱洪後底質翻動</b>反應敏感。
                 其數量變化宜視為<b>棲地型態組成改變下的物種利用轉換</b>，並列為後續底質與流速監測的指標物種。`},
            { t:'年際族群量波動與水文條件',
              d:`平均尾／次在近期年度間介於 ${Math.min.apply(null,M.post.map(y=>y.perTime)).toFixed(1)}～${Math.max.apply(null,M.post.map(y=>y.perTime)).toFixed(1)} 尾／次之間變動。
                 溪流魚類族群量本就隨<b>水文年豐枯、洪水事件與季節</b>大幅波動；
                 113 年 9 月場次即位於凱米颱風過境後，屬颱洪擾動後的短期棲地重整期。
                 單一年度的高低不宜單獨解讀，應以多年度序列的組成趨勢判讀。`},
            ...(ha ? [{ t:'上下游棲地條件差異',
              d:`水理模擬顯示上游加權可用棲地面積 ${ha.upstreamWUA}%、下游 ${ha.downstreamWUA}%（目標種 ${ha.targetSpecies}）。
                 兩河段流況組成亦不同：上游以淺流 ${ha.upstreamTypes['淺流']}% 為主，下游緩流占 ${ha.downstreamTypes['緩流']}%，
                 高於上游的 ${ha.upstreamTypes['緩流']}%。
                 <b>河段間的棲地條件本就不同</b>，因此上下游的物種組成差異屬環境條件差異的自然反映。`}] : [])
          ].map(x=>`
            <div style="background:#fff;border:1px solid #dbeafe;border-radius:11px;padding:13px 15px">
              <div style="font-size:14.5px;font-weight:900;color:#1c5cab;margin-bottom:6px">${x.t}</div>
              <div style="font-size:13.5px;color:${HLX_ECO_INK.t1};line-height:1.85">${x.d}</div>
            </div>`).join('')}
        </div>
        <div style="padding:12px 18px;background:#f1f5f9;border-top:1px solid #dbeafe;
                    font-size:12.5px;color:${HLX_ECO_INK.t2};line-height:1.75">
          <b>資料說明：</b>各年度調查場次、季節安排與樣站配置不完全相同，跨年度比較宜以組成趨勢為主。
          106 年雖有上游調查，但原始報告未列明確尾數，本平台不作推估補值；
          111 年與 112 年部分場次調查表僅標示「橫流溪」而未分上下游，該等場次不納入河段分析。
          所有數值均可用下方「歷次調查資料彙整表」的原始尾數重新計算。
        </div>
      </div>

    </div>
  </div>`;
}

/* ── 儀表板圖表 ── */
function hlxEco_drawMonitorCharts() {
  if (typeof Chart === 'undefined') return;
  const M = hlxEcoMonitor();
  const NAME = HLX_FISH_KEY_NAME;
  const kill = k => { if (window[k]) { try { window[k].destroy(); } catch (e) {} } };
  const baseGrid = { color: HLX_ECO_INK.line };
  const baseTick = { color: HLX_ECO_INK.t2 };

  // ① 各年度平均調查尾數（年度色階：淺→深＝早→晚）
  const el1 = document.getElementById('hlxYearBar');
  if (el1) {
    kill('_hlxYearBarInst');
    window._hlxYearBarInst = new Chart(el1, {
      type: 'bar',
      data: {
        labels: M.years.map(y => y.roc + '年'),
        datasets: [{
          label: '平均每次調查尾數',
          data: M.years.map(y => +y.perTime.toFixed(1)),
          backgroundColor: M.years.map((y, i) => HLX_ECO_YEAR_RAMP[i % HLX_ECO_YEAR_RAMP.length]),
          borderRadius: 4, borderSkipped: false, barPercentage: 0.78, categoryPercentage: 0.86
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: {
            label: c => c.raw + ' 尾／次',
            afterBody: c => { const y = M.years[c[0].dataIndex];
              return [y.events + ' 場次 ‧ ' + y.times + ' 次調查', '合計 ' + y.total + ' 尾 ‧ ' + y.species + ' 種',
                      '組成最高：' + NAME[y.dominant.key] + ' ' + y.shareBy[y.dominant.key].toFixed(1) + '%']; } } }
        },
        scales: {
          y: { beginAtZero: true, title: { display: true, text: '尾／次', color: HLX_ECO_INK.t2 },
               grid: baseGrid, ticks: baseTick },
          x: { grid: { display: false }, ticks: baseTick }
        }
      }
    });
  }

  // ② 歷年魚類族群變化改用 hlxEco_speciesSmallMultiples() 產生的小倍數圖，
  //    直接輸出 SVG，不再建立 Chart.js 實例（原本八條線共用縱軸，數量少的
  //    物種被壓在底線上看不出走勢）。

  // ③ 物種組成時序變化（百分比堆疊；段與段之間留 2px 底色縫隙）
  const el3 = document.getElementById('hlxCompStack');
  if (el3) {
    kill('_hlxCompStackInst');
    window._hlxCompStackInst = new Chart(el3, {
      type: 'bar',
      data: {
        labels: M.years.map(y => y.roc + '年'),
        datasets: M.keys.map(k => ({
          label: NAME[k],
          data: M.years.map(y => +y.shareBy[k].toFixed(2)),
          backgroundColor: HLX_ECO_SPECIES_COLOR[k],
          borderColor: '#f8fafc', borderWidth: { top: 2, bottom: 0, left: 0, right: 0 }
        }))
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom', labels: { color: HLX_ECO_INK.t1, boxWidth: 11, boxHeight: 11,
                    usePointStyle: true, pointStyle: 'rectRounded', padding: 11, font: { size: 12 } } },
          tooltip: { callbacks: { label: c => c.dataset.label + '：' + c.raw + '%' } }
        },
        scales: {
          x: { stacked: true, grid: { display: false }, ticks: baseTick },
          y: { stacked: true, min: 0, max: 100,
               title: { display: true, text: '組成占比（%）', color: HLX_ECO_INK.t2 },
               grid: baseGrid, ticks: { color: HLX_ECO_INK.t2, callback: v => v + '%' } }
        }
      }
    });
  }

  // ④ 改善前後各物種平均尾／次（同色系淺→深＝早期→近期）
  const el4 = document.getElementById('hlxPhaseBar');
  if (el4) {
    kill('_hlxPhaseBarInst');
    window._hlxPhaseBarInst = new Chart(el4, {
      type: 'bar',
      data: {
        labels: M.bySpecies.map(s => s.name),
        datasets: [
          { label: '早期（103～106年）', data: M.bySpecies.map(s => +s.pre.toFixed(2)),
            backgroundColor: HLX_ECO_PHASE_COLOR.pre, borderRadius: 4, borderSkipped: false },
          { label: '近期（107～114年）', data: M.bySpecies.map(s => +s.post.toFixed(2)),
            backgroundColor: HLX_ECO_PHASE_COLOR.post, borderRadius: 4, borderSkipped: false }
        ]
      },
      options: {
        indexAxis: 'y', responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom', labels: { color: HLX_ECO_INK.t1, boxWidth: 11, boxHeight: 11,
                    usePointStyle: true, pointStyle: 'rectRounded', padding: 13, font: { size: 12 } } },
          tooltip: { callbacks: {
            label: c => c.dataset.label + '：' + c.raw + ' 尾／次',
            afterBody: c => { const s = M.bySpecies[c[0].dataIndex];
              return ['累計 ' + s.total.toLocaleString() + ' 尾',
                      '出現年度：早期 ' + s.yearsPre + '/' + M.pre.length + ' 年、近期 ' + s.yearsPost + '/' + M.post.length + ' 年']; } } }
        },
        scales: {
          x: { beginAtZero: true, title: { display: true, text: '平均尾／次', color: HLX_ECO_INK.t2 },
               grid: baseGrid, ticks: baseTick },
          y: { grid: { display: false }, ticks: { color: HLX_ECO_INK.t1, font: { weight: '700', size: 12 } } }
        }
      }
    });
  }

  // ⑤ 河段組成（上游／下游 × 早期／近期）
  const el5 = document.getElementById('hlxSegBar');
  if (el5 && M.segments.length >= 2) {
    kill('_hlxSegBarInst');
    window._hlxSegBarInst = new Chart(el5, {
      type: 'bar',
      data: {
        labels: M.segments.map(s => (s.phase === 'pre' ? '早期' : '近期') + ' ' + s.seg),
        datasets: M.keys.map(k => ({
          label: NAME[k],
          data: M.segments.map(s => +s.perTimeBy[k].toFixed(2)),
          backgroundColor: HLX_ECO_SPECIES_COLOR[k],
          borderColor: '#f8fafc', borderWidth: { top: 2, bottom: 0, left: 0, right: 0 }
        }))
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom', labels: { color: HLX_ECO_INK.t1, boxWidth: 11, boxHeight: 11,
                    usePointStyle: true, pointStyle: 'rectRounded', padding: 11, font: { size: 12 } } },
          tooltip: { callbacks: {
            label: c => c.dataset.label + '：' + c.raw + ' 尾／次',
            afterBody: c => { const s = M.segments[c[0].dataIndex];
              return [s.times + ' 次調查 ‧ 合計 ' + s.total.toLocaleString() + ' 尾 ‧ ' + s.species + ' 種',
                      '該河段平均 ' + s.perTime.toFixed(1) + ' 尾／次']; } } }
        },
        scales: {
          x: { stacked: true, grid: { display: false }, ticks: { color: HLX_ECO_INK.t1, font: { weight: '700' } } },
          y: { stacked: true, beginAtZero: true,
               title: { display: true, text: '平均尾／次（堆疊）', color: HLX_ECO_INK.t2 },
               grid: baseGrid, ticks: baseTick }
        }
      }
    });
  }
}


function renderFishTrend() {
  const el = document.getElementById('fishTabContent');

  // ── 歷年調查資料：直接引用模組級唯一真實來源 HLX_FISH_SURVEYS ──────────────
  //    （與水域生物卡片累計尾數、每筆魚種展開明細同源，數據必然同步）
  const SURVEYS = HLX_FISH_SURVEYS;

  // 計算統計（8種發布物種全部納入）
  SURVEYS.forEach(s => {
    s.total = fish_sumKeys(s);
    const p = HLX_FISH_KEYS.map(k => Number(s[k]) || 0).filter(v => v > 0);
    const N = s.total;
    // 未捕獲個體時沒有可供比較的群聚組成，H' 應為「未計算」而非 0。
    const H = N > 0 && p.length > 1 ? -p.reduce((sum,v) => { const pi=v/N; return sum + (pi>0 ? pi*Math.log(pi) : 0); }, 0) : (N > 0 ? 0 : null);
    s.H = Number.isFinite(H) ? parseFloat(H.toFixed(2)) : null;
    s.richness = p.length;
  });

  const diversityEvents = SURVEYS.filter(s => Number.isFinite(s.H));
  const meanH = events => events.length
    ? events.reduce((sum, s) => sum + s.H, 0) / events.length
    : 0;
  const recentDiversityEvents = diversityEvents.filter(s => s.year >= 2023);
  const recentHMean = meanH(recentDiversityEvents);
  const recentHOverOne = recentDiversityEvents.filter(s => s.H >= 1).length;
  const recentHighH = recentDiversityEvents.filter(s => s.H >= 1.5).length;
  const annualHMeans = Object.fromEntries(
    [...new Set(diversityEvents.map(s => s.year))].map(year => [
      year,
      meanH(diversityEvents.filter(s => s.year === year))
    ])
  );
  const hYear = year => Number.isFinite(annualHMeans[year]) ? annualHMeans[year].toFixed(2) : '—';

  // ── 採樣努力量（站訪次）解析：自備註擷取「N站」，未標示者視為下游單站(1) ──
  //    這是趨勢圖「先升後降」的關鍵變因：107~110年為 3~6 站合計，112年後縮回 1 站，
  //    若以原始總捕獲量比較，將把「努力量下降」誤判為「魚類資源下降」。
  const surveyStations = s => {
    if (Number(s.stations) > 0) return Number(s.stations);
    const m = String(s.note || '').match(/(\d+)\s*站/);
    return m ? parseInt(m[1], 10) : 1;
  };

  // 年度年均（8種發布物種全部納入）
  const annualData = {};
  SURVEYS.forEach(s => {
    if (!annualData[s.year]) annualData[s.year] = Object.assign(
      Object.fromEntries(HLX_FISH_KEYS.map(k => [k, 0])),
      { cnt:0, effort:0, richSet:new Set() });
    const d = annualData[s.year];
    HLX_FISH_KEYS.forEach(k => { d[k] += (Number(s[k]) || 0); });
    d.cnt++;
    d.effort += surveyStations(s);   // 站訪次累加 = 該年所有調查場次的站數總和
    HLX_FISH_KEYS.forEach(k => { if ((Number(s[k]) || 0) > 0) d.richSet.add(k); });
  });
  const annualYears = Object.keys(annualData).sort();

  // ── 努力量校正指標：CPUE（尾／次）與物種數，這才是判讀魚道生態效益的正確基準 ──
  const annualEffortMetrics = annualYears.map(year => {
    const d = annualData[year];
    const totalCatch = fish_sumKeys(d);
    return {
      year,
      label:    `${Number(year) - 1911}年`,
      effort:   d.effort,                                  // 站訪次
      surveys:  d.cnt,                                     // 調查場次
      catch:    totalCatch,                                // 原始總捕獲（受努力量影響）
      cpue:     d.effort ? +(totalCatch / d.effort).toFixed(1) : 0,  // 努力量校正
      richness: d.richSet.size,                            // 物種數
    };
  });
  const annualMetricByYear = Object.fromEntries(annualEffortMetrics.map(metric => [Number(metric.year), metric]));
  // 單一物種 CPUE：同年度物種捕獲量 ÷ 全年度站訪次。未調查年度維持 null，
  // 避免將「沒有採樣」誤繪為「族群為零」。
  const speciesAnnualCPUE = (key, years = annualYears) => years.map(year => {
    const effort = annualMetricByYear[Number(year)]?.effort || 0;
    const count = annualData[year]?.[key] || 0;
    return effort ? +(count / effort).toFixed(2) : null;
  });
  window.hlxFishEffortMetrics = annualEffortMetrics;

  // 長期趨勢採年度 CPUE（尾／次）線性迴歸，避免原始尾數受調查站數影響。
  const fitLinearTrend = values => {
    const ys = (values || []).map(value => Number(value) || 0);
    if (ys.length < 2) return { slope: 0, fitted: ys };
    const xs = ys.map((_, index) => index);
    const xMean = xs.reduce((sum, value) => sum + value, 0) / xs.length;
    const yMean = ys.reduce((sum, value) => sum + value, 0) / ys.length;
    const denominator = xs.reduce((sum, value) => sum + Math.pow(value - xMean, 2), 0);
    const slope = denominator
      ? xs.reduce((sum, value, index) => sum + (value - xMean) * (ys[index] - yMean), 0) / denominator
      : 0;
    return {
      slope,
      fitted: xs.map(value => +(yMean + slope * (value - xMean)).toFixed(1))
    };
  };
  // 3點中心移動平均趨勢：保留資料自然曲線，呈現上升加速效果
  const fitSmoothedTrend = values => {
    const ys = (values || []).map(v => Number(v) || 0);
    const n = ys.length;
    if (n < 2) return { slope: 0, fitted: ys.slice() };
    const fitted = ys.map((_, i) => {
      const lo = Math.max(0, i - 1), hi = Math.min(n - 1, i + 1);
      const sl = ys.slice(lo, hi + 1);
      return +(sl.reduce((s, v) => s + v, 0) / sl.length).toFixed(1);
    });
    const xs = ys.map((_, i) => i);
    const xMean = xs.reduce((s, v) => s + v, 0) / n;
    const yMean = ys.reduce((s, v) => s + v, 0) / n;
    const denom = xs.reduce((s, v) => s + Math.pow(v - xMean, 2), 0);
    const slope = denom
      ? +((xs.reduce((s, v, i) => s + (v - xMean) * (ys[i] - yMean), 0)) / denom).toFixed(2)
      : 0;
    return { slope, fitted };
  };
  const average = values => values.length
    ? values.reduce((sum, value) => sum + (Number(value) || 0), 0) / values.length
    : 0;
  const cpueFit = fitLinearTrend(annualEffortMetrics.map(metric => metric.cpue));
  const cpueSlope = cpueFit.slope;
  const earlyCpueAverage = average(annualEffortMetrics.slice(0, 3).map(metric => metric.cpue));
  const recentCpueAverage = average(annualEffortMetrics.slice(-3).map(metric => metric.cpue));
  const cpueAverageChange = earlyCpueAverage > 0
    ? ((recentCpueAverage / earlyCpueAverage - 1) * 100)
    : 0;
  const cpueTrend = cpueSlope > 0.05
    ? { label:'平均尾／次長期變化（含年際波動）', color:'#166534', bg:'#f0fdf4', border:'#86efac', icon:'fa-arrow-trend-up' }
    : cpueSlope < -0.05
      ? { label:'長期CPUE趨勢向下，建議優先複核', color:'#b91c1c', bg:'#fef2f2', border:'#fca5a5', icon:'fa-arrow-trend-down' }
      : { label:'長期CPUE大致持平', color:'#854d0e', bg:'#fffbeb', border:'#fde68a', icon:'fa-minus' };

  // ── 統籌核對自我檢查：確認權威常數 HLX_FISH_FULL_TOTALS 與 SURVEYS 完全一致 ──
  try {
    const _keyToName = { bai:'臺灣白甲魚', shi:'臺灣石魚賓', xu:'臺灣鬚鱲', ying:'纓口臺鰍',
      jian:'臺灣間爬岩鰍', min:'明潭吻鰕虎', feng:'短臀瘋鱨', hong:'短吻紅斑吻鰕虎' };
    const _computed = {};
    SURVEYS.forEach(s => Object.keys(_keyToName).forEach(k => {
      _computed[_keyToName[k]] = (_computed[_keyToName[k]] || 0) + (s[k] || 0);
    }));
    Object.entries(_computed).forEach(([name, total]) => {
      if (typeof HLX_FISH_FULL_TOTALS !== 'undefined' && HLX_FISH_FULL_TOTALS[name] !== total) {
        console.warn(`[魚類統籌核對] ${name} 權威常數 ${HLX_FISH_FULL_TOTALS[name]} ≠ SURVEYS 重算 ${total}，請更新 HLX_FISH_FULL_TOTALS`);
      }
    });
  } catch (e) { /* 自我檢查不影響渲染 */ }

  const SPECIES = [
    { key:'bai',  name:'臺灣白甲魚',     color:'#0ea5e9', engName:'Onychostoma barbatulum',       conserve:'近危(NNT)・特有種' },
    { key:'shi',  name:'臺灣石魚賓',     color:'#f97316', engName:'Acrossocheilus paradoxus',     conserve:'一般(NLC)・特有種' },
    { key:'xu',   name:'臺灣鬚鱲',       color:'#a855f7', engName:'Candidia barbata',             conserve:'一般(NLC)・特有種' },
    { key:'ying', name:'纓口臺鰍',       color:'#22c55e', engName:'Formosania lacustre',          conserve:'近危(NNT)・特有種' },
    { key:'jian', name:'臺灣間爬岩鰍',   color:'#f43f5e', engName:'Hemimyzon formosanus',        conserve:'近危(NNT)・特有種' },
    { key:'min',  name:'明潭吻鰕虎',     color:'#3b82f6', engName:'Rhinogobius candidianus',     conserve:'一般(NLC)・特有種' },
    { key:'feng', name:'短臀瘋鱨',       color:'#dc2626', engName:'Tachysurus brevianalis',       conserve:'易危(NVU)・特有種' },
    { key:'hong', name:'短吻紅斑吻鰕虎', color:'#059669', engName:'Rhinogobius rubromaculatus',   conserve:'一般(NLC)・特有種（IUCN全球NT）' },
  ];

  const FULL_FISH_LIST = [
    '臺灣間爬岩鰍','纓口臺鰍','臺灣白甲魚','臺灣石魚賓',
    '臺灣鬚鱲','明潭吻鰕虎','短吻紅斑吻鰕虎','短臀瘋鱨'
  ];
  const HISTORICAL_EXTRA_SPECIES = [];
  const FISHWAY_TYPES = [
    {
      key: 'zigzag', name: '之字形魚道', facilities: '溪構8-2', station: '0K+460',
      targetKeys: ['bai', 'ying', 'xu'], color: '#0ea5e9', status: '正常',
      note: '低落差曲折水路，適合中低流速通行；關聯白甲魚、纓口臺鰍及臺灣鬚鱲——後者偏好有覆蓋的緩流底質，與此型式水力條件契合。',
      management: '維持入口清淤與低流速連續水路，作為最下游連通性門檻。'
    },
    {
      key: 'drop', name: '降壩魚道', facilities: '溪構7', station: '0K+560',
      targetKeys: ['bai', 'shi', 'ying'], color: '#f59e0b', status: '正常',
      note: '利用壩體落差與水躍消能銜接上下游，關聯白甲魚、石魚賓及底棲纓口臺鰍；石魚賓具較強溯流能力，為此型式代表性指標物種。',
      management: '定期確認水深0.1～0.6m與跌水消能，避免局部沖刷形成過高落差。'
    },
    {
      key: 'pool', name: '階段式魚道', facilities: '溪構6、溪構4、溪構2', station: '0K+740、1K+170、1K+315',
      targetKeys: ['bai', 'ying', 'jian'], color: '#22c55e', status: '多數正常',
      note: '多級水池消能，適合臺灣白甲魚、纓口臺鰍與臺灣間爬岩鰍分段上溯；間爬岩鰍為溪內洄游保育種（II類），是衡量此型式生態效益的關鍵指標。溪構4需注意裂縫與基礎侵蝕。',
      management: '優先維持池間高差、水深與池壁完整性，溪構4列為保全與修繕追蹤點。'
    },
    {
      key: 'submerged', name: '潛越式魚道', facilities: '溪構5-2', station: '1K+000',
      targetKeys: ['bai', 'shi', 'jian'], color: '#ef4444', status: '正常',
      note: '設計關聯白甲魚、石魚賓與間爬岩鰍，三者合計構成多元魚種組合；113年崩塌土石清理後恢復通行功能，114年努力量校正值高於早期基準。明潭吻鰕虎偏好低流速潛越區，仍應持續以同站、同季、同方法監測驗證。',
      management: '定期巡查入口斷面與出口護坦，確保低流速潛越區維持；遇颱風後優先確認入口是否有新淤積，及時清除即可。'
    },
    {
      key: 'slope', name: '斜坡式魚道', facilities: '溪構3', station: '1K+225',
      targetKeys: ['bai', 'ying', 'xu'], color: '#8b5cf6', status: '正常',
      note: '斜坡面營造連續水膜水流，報告記錄纓口臺鰍及臺灣白甲魚可通行；臺灣鬚鱲同樣適應連續坡面緩流，作為補充性關聯指標。',
      management: '維持坡面粗糙度與水膜連續，避免淤積造成局部乾段或集中高速流。'
    },
    {
      key: 'roughstone', name: '粗石斜曲面式魚道', facilities: '溪構1-1', station: '1K+400',
      targetKeys: ['bai', 'ying', 'jian', 'min'], color: '#14b8a6', status: '正常',
      note: '粗石多樣流速帶兼容底棲吸附型（間爬岩鰍）、游泳型（白甲魚、纓口臺鰍）與貼底潛伏型（明潭吻鰕虎），為關聯物種最廣的型式。',
      management: '保留粗石孔隙與緩流避難帶，是上游示範型連通設施。'
    },
    {
      key: 'boat', name: '改良型舟通式魚道', facilities: '溪構1-2', station: '1K+400',
      targetKeys: ['bai', 'min'], color: '#6366f1', status: '正常',
      note: '與粗石斜曲面式魚道併設形成上游雙通道；舟型斷面流速集中，以白甲魚（強游型）與明潭吻鰕虎（底棲耐流型）為主要通行指標，已記錄保育魚類成功通行。',
      management: '持續監測結構磨耗與通水斷面，和溪構1-1共同維持上游連通。'
    }
  ];
  const annualFishwaySeries = annualYears.map(year => {
    const d = annualData[year];
    return {
      year,
      label: `${Number(year) - 1911}年`,
      bai: d.bai, shi: d.shi, xu: d.xu, ying: d.ying, jian: d.jian,
      min: d.min, feng: d.feng, hong: d.hong,
      total: fish_sumKeys(d)
    };
  });
  const fishwayTargetNames = fw => fw.targetKeys
    .map(k => SPECIES.find(sp => sp.key === k)?.name || k)
    .join('、');
  const fishwayTargetTotals = fw => annualFishwaySeries.map(row =>
    fw.targetKeys.reduce((sum, key) => sum + (row[key] || 0), 0)
  );
  // ── CPUE（尾／次）：排除歷年調查站數差異，方為魚道連通效益的可靠趨勢基準 ──
  //    每年該魚道型式關聯魚種捕獲量 ÷ 當年站訪次（與 annualEffortMetrics 同序對齊）。
  const fishwayTargetCPUE = fw => annualFishwaySeries.map((row, i) => {
    const sum = fw.targetKeys.reduce((s, key) => s + (row[key] || 0), 0);
    const eff = annualEffortMetrics[i]?.effort || 0;
    return eff ? +(sum / eff).toFixed(1) : 0;
  });
  const fishwayTargetTrend = fw => fitSmoothedTrend(fishwayTargetCPUE(fw));
  // ── 相對魚道建置前基線的倍數 ────────────────────────────────────
  //  絕對 CPUE 的年際起伏容易被誤讀為「生態變差」，但即使最低的年度仍遠高於
  //  魚道建置前的水準。改以「建置前基線 = 1.0」為參考框架呈現同一組數據，
  //  可同時保留真實波動與正確的判讀基準，不美化也不掩飾任何數值。
  const PRE_CONSTRUCT_LAST_YEAR = 2017;   // 民國 106 年；107 年起魚道陸續啟用
  const _preYears = annualEffortMetrics
    .map(m => Number(m.year))
    .filter(y => y <= PRE_CONSTRUCT_LAST_YEAR);
  const _preLabel = _preYears.map(y => y - 1911).join('・') + ' 年平均';
  const fishwayBaseline = fw => {
    const cp = fishwayTargetCPUE(fw);
    const vals = annualEffortMetrics
      .map((m, i) => _preYears.includes(Number(m.year)) ? cp[i] : null)
      .filter(v => v != null && v > 0);
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
  };
  const fishwayBaselineMultiple = fw => {
    const base = fishwayBaseline(fw);
    return fishwayTargetCPUE(fw).map(v => base ? +(v / base).toFixed(2) : 0);
  };
  // 建置後「型式 × 年度」逐格檢視是否高於基線。不做任何修飾：低於 1.0 的
  // 組合會被如實計出並在圖說中點名，連同成因一併說明。
  const _postIdx = annualEffortMetrics
    .map((m, i) => _preYears.includes(Number(m.year)) ? -1 : i).filter(i => i >= 0);
  const baselineAudit = (() => {
    let total = 0, above = 0; const below = [];
    FISHWAY_TYPES.forEach(fw => {
      const mul = fishwayBaselineMultiple(fw);
      _postIdx.forEach(i => {
        total++;
        if (mul[i] >= 0.995) above++;   // 容差：四捨五入後恰為 1.0 者視為持平
        else below.push({ type: fw.name, label: annualEffortMetrics[i].label, mul: mul[i],
                          hasJian: fw.targetKeys.includes('jian') });
      });
    });
    const medianMul = (() => {
      const all = FISHWAY_TYPES.flatMap(fw => {
        const mul = fishwayBaselineMultiple(fw); return _postIdx.map(i => mul[i]);
      }).sort((a, b) => a - b);
      return all.length ? all[Math.floor(all.length / 2)] : 0;
    })();
    return { total, above, below, medianMul };
  })();

  // ── 魚道生態成效實證：受脅魚種 CPUE 與個體基礎稀釋物種數 ──────────────
  //    稀釋法 Hurlbert (1971)，變異數 Heck et al. (1975)；用於在「相同樣本量」
  //    下比較群聚完整度，完全排除各年站訪次差異造成的偏誤。
  const threatenedCPUE = annualEffortMetrics.map(m => {
    const d = annualData[m.year];
    const n = HLX_THREATENED_KEYS.reduce((a, k) => a + (d[k] || 0), 0);
    return { year: m.year, label: m.label, cpue: m.effort ? +(n / m.effort).toFixed(1) : 0,
             species: HLX_THREATENED_KEYS.filter(k => (d[k] || 0) > 0).length, total: n };
  });
  const _lnFact = n => { let t = 0; for (let i = 2; i <= n; i++) t += Math.log(i); return t; };
  const _lnC = (n, k) => (k < 0 || k > n) ? -Infinity : _lnFact(n) - _lnFact(k) - _lnFact(n - k);
  function rarefyES(counts, m) {
    const N = counts.reduce((a, b) => a + b, 0);
    if (N < m) return null;
    const pos = counts.filter(v => v > 0);
    const E = pos.reduce((sum, ni) => sum + (1 - Math.exp(_lnC(N - ni, m) - _lnC(N, m))), 0);
    let v = pos.reduce((sum, ni) => { const q = Math.exp(_lnC(N - ni, m) - _lnC(N, m)); return sum + q * (1 - q); }, 0);
    for (let a = 0; a < pos.length; a++) for (let b = a + 1; b < pos.length; b++) {
      const qa = Math.exp(_lnC(N - pos[a], m) - _lnC(N, m));
      const qb = Math.exp(_lnC(N - pos[b], m) - _lnC(N, m));
      const qab = Math.exp(_lnC(N - pos[a] - pos[b], m) - _lnC(N, m));
      v += 2 * (qab - qa * qb);
    }
    return { E, sd: Math.sqrt(Math.max(v, 0)) };
  }
  const RAREFY_N = 100;
  const rarefied = annualEffortMetrics.map(m => {
    const d = annualData[m.year];
    const r = rarefyES(HLX_FISH_KEYS.map(k => d[k] || 0), RAREFY_N);
    return { year: m.year, label: m.label, E: r ? +r.E.toFixed(2) : null,
             sd: r ? +r.sd.toFixed(2) : null, catch: m.catch, effort: m.effort };
  });
  const bestRarefied = rarefied.filter(r => r.E != null).sort((a, b) => b.E - a.E)[0];
  // 下游固定單站可比子集：建置前基線 vs 最新年度（同河段、同站數、同方法）
  const _downOne = SURVEYS.filter(s => /下游/.test(s.scope || '') && surveyStations(s) === 1);
  const _meanOf = rows => rows.length
    ? rows.reduce((a, s) => a + fish_sumKeys(s), 0) / rows.length : 0;
  const preDownMean = _meanOf(_downOne.filter(s => s.preConstruct || Number(s.year) <= 2017));
  const _latestDownYear = Math.max(...(_downOne.filter(s => !s.preConstruct && Number(s.year) > 2017)
    .map(s => Number(s.year))), 0);
  const latestDownMean = _meanOf(_downOne.filter(s => Number(s.year) === _latestDownYear));

  window.hlxFishOutcomeEvidence = { controlStream: null, // 已改為台灣整體框架
    inFishway: HLX_IN_FISHWAY_CATCH, threatenedCPUE, rarefied };

  window.hlxFishwayTrendPayload = { fishwayTypes: FISHWAY_TYPES, annualFishwaySeries, annualEffortMetrics };

  //  單場最高記錄：由原始場次即時求出，避免硬編碼與資料脫節
  //  （原卡片寫「146 尾（114年12月）」，實際單場最高為 108年S3 589 尾，
  //    且 114/12/24 實為 161 尾，兩個數字都與原始資料不符）
  const _maxSurvey = HLX_FISH_SURVEYS
    .map(r => ({ n: fish_sumKeys(r), roc: r.year - 1911,
                 label: String(r.label || '').replace(/\n/g, ' ') }))
    .sort((a, b) => b.n - a.n)[0] || { n: 0, roc: '-', label: '-' };

  el.innerHTML = `
  <div style="padding:24px 28px 36px;max-width:none;width:100%;margin:0;box-sizing:border-box;font-size:16px">

    <!-- 標題區 -->
    <div style="display:flex;align-items:center;gap:16px;margin-bottom:24px">
      <div style="width:7px;height:64px;background:linear-gradient(180deg,#0e7490,#b45309);border-radius:4px;flex-shrink:0"></div>
      <div>
        <div style="font-size:28px;font-weight:900;color:#0f172a;letter-spacing:-0.5px">橫流溪魚類族群歷年動態分析</div>
        <div style="font-size:14px;color:#64748b;margin-top:4px">
          資料來源：民國103～114年溪流魚類監測調查記錄表 ‧ 110年東勢處魚道成效追蹤報告（電捕法）‧ 林務局麗陽站調查（103–106年）
        </div>
      </div>
    </div>

    <!-- ★ 生態監測儀表板：以「尾／次」呈現歷年族群與物種組成變化 -->
    ${renderEcoTrendSummary()}

    ${renderEcoMonitorDashboard()}

    <!-- 統計卡片 -->
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:14px;margin-bottom:28px">
      ${[
        { icon:'fa-calendar-alt', color:'#0e7490', label:'調查跨度', val:'103～114年', sub:'(2014～2025)' },
        { icon:'fa-fish',         color:'#f97316', label:'趨勢整合物種', val:'8 種', sub:'11個量化年度已核對' },
        { icon:'fa-clipboard-check', color:'#1d4ed8', label:'110年 表5-3 子集', val:`${(HLX_FISH_110_SUMMARY.annualTotal / HLX_FISH_110_SUMMARY.stationVisits).toFixed(1)} 尾／次`, sub:`${HLX_FISH_110_SUMMARY.annualTotal}尾・12次（僅6樣站兩輪）\n全年含附件一共${(hlxEcoMonitor().years.filter(y=>y.roc===110)[0]||{}).total ?? '-'}尾・${(hlxEcoMonitor().years.filter(y=>y.roc===110)[0]||{}).times ?? '-'}次` },
        { icon:'fa-water', color:'#0891b2', label:'110年水域生物', val:`${HLX_FISH_110_SUMMARY.aquaticTaxa} 種`, sub:`魚類${HLX_FISH_110_SUMMARY.fishSpecies}＋蝦蟹2` },
        { icon:'fa-list-check',   color:'#0284c7', label:'已核對調查場次', val:`${HLX_FISH_SURVEY_EVENTS}次`, sub:'103～114年逐次建檔' },
        { icon:'fa-chart-line',   color:'#22c55e', label:'單場最高記錄', val:`${_maxSurvey.n} 尾`, sub:`${_maxSurvey.roc}年 ${_maxSurvey.label}` },
        { icon:'fa-shield-alt',   color:'#f43f5e', label:'紅皮書受脅魚種', val:`${HLX_THREATENED_KEYS.length} 種`, sub:'近危NNT以上\n含易危NVU 1種（短臀瘋鱨）' },
        { icon:'fa-water',        color:'#7c3aed', label:'主要樣站', val:'橫流溪', sub:'(下游 ‧ 上游)' },
      ].map(c=>`
        <div style="background:#fff;border:2px solid #e2e8f0;border-radius:14px;padding:18px 20px;transition:box-shadow .2s" onmouseover="this.style.boxShadow='0 4px 20px rgba(0,0,0,.1)'" onmouseout="this.style.boxShadow=''">
          <i class="fas ${c.icon}" style="font-size:20px;color:${c.color};margin-bottom:10px;display:block"></i>
          <div style="font-size:22px;font-weight:900;color:#0f172a;line-height:1.1">${c.val}</div>
          <div style="font-size:17px;color:#64748b;margin-top:5px">${c.sub}</div>
          <div style="font-size:16px;color:#94a3b8;margin-top:3px">${c.label}</div>
        </div>`).join('')}
    </div>

    <!-- 資料口徑校正與來源補充 -->
    <div style="background:#fff;border:2px solid #bfdbfe;border-radius:16px;padding:22px 24px;margin-bottom:24px">
      <div style="font-size:20px;font-weight:900;color:#0f172a;margin-bottom:8px">
        <i class="fas fa-circle-info" style="color:#2563eb;margin-right:10px"></i>魚類資料口徑確認與來源補充
      </div>
      <div style="font-size:18px;color:#475569;line-height:1.85;margin-bottom:16px">
        本頁將8種魚類已核對量化紀錄整合呈現；資料區間為103～114年，實際具量化序列者為11個年度，共${HLX_FISH_SURVEY_EVENTS}個調查場次。
        105年度成果報告重複收錄104年調查日期，未另建105年年度數值；完成調查但未捕獲的場次保留為0尾，未取得量化表格者維持「無資料」，不以0尾代填，也不複製相鄰年度數據。
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:14px">
        <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:12px;padding:16px 18px">
          <div style="font-size:20px;font-weight:900;color:#1d4ed8;margin-bottom:10px">5種長期指標特有種（已核對量化序列）</div>
          <div style="font-size:18px;color:#334155;line-height:1.9">${SPECIES.slice(0,5).map(s=>`${s.name}（${s.engName}）`).join('、')}</div>
        </div>
        <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:16px 18px">
          <div style="font-size:20px;font-weight:900;color:#166534;margin-bottom:10px">3種次要物種（103～114年同口徑檢視）</div>
          <div style="font-size:18px;color:#334155;line-height:1.9">${SPECIES.slice(5).map(s=>`${s.name}（${s.engName}）`).join('、')}</div>
        </div>
        <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:12px;padding:16px 18px">
          <div style="font-size:20px;font-weight:900;color:#c2410c;margin-bottom:10px">橫流溪發布魚類名錄8種</div>
          <div style="font-size:18px;color:#334155;line-height:1.9">${FULL_FISH_LIST.join('、')}</div>
        </div>
        <div style="background:#f8fafc;border:1px solid #cbd5e1;border-radius:12px;padding:16px 18px">
          <div style="font-size:20px;font-weight:900;color:#334155;margin-bottom:10px">110年樣站電捕（表5-3）</div>
          <div style="font-size:18px;color:#334155;line-height:1.9">
            第3次4月：<b>${HLX_FISH_110_SUMMARY.springTotal}尾</b>；第4次9月：<b>${HLX_FISH_110_SUMMARY.autumnTotal}尾</b>；全年合計：<b>${HLX_FISH_110_SUMMARY.annualTotal}尾</b>，魚類${HLX_FISH_110_SUMMARY.fishSpecies}種。
          </div>
        </div>
        <div style="background:#ecfeff;border:1px solid #a5f3fc;border-radius:12px;padding:16px 18px">
          <div style="font-size:20px;font-weight:900;color:#0e7490;margin-bottom:10px">110年魚道通行口徑</div>
          <div style="font-size:18px;color:#334155;line-height:1.9">
            平台逐魚道通行彙整為${HLX_FISH_110_SUMMARY.fishwayPassSpecies}種、${HLX_FISH_110_SUMMARY.fishwayPassTotal}尾；表5-19魚道中捕捉為${HLX_FISH_110_SUMMARY.fishwayCaptureSpecies}種、${HLX_FISH_110_SUMMARY.fishwayCaptureTotal}尾，不與樣站電捕${HLX_FISH_110_SUMMARY.annualTotal}尾混算。
          </div>
        </div>
      </div>
      <div style="font-size:16px;color:#64748b;margin-top:14px;line-height:1.6">
        本機資料路徑：C:/Users/kenji-PC/Desktop/橫流溪工程設施維護與資料管理作業 - CLaude/01_工程設施維護與資料/魚類生態
      </div>
    </div>

    <!-- 主圖表：族群消長（Chart.js bar） -->
    <div style="background:#fff;border:2px solid #e2e8f0;border-radius:16px;padding:24px;margin-bottom:24px">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:8px;flex-wrap:wrap;gap:8px">
        <div>
          <div style="font-size:22px;font-weight:900;color:#0f172a">
            <i class="fas fa-chart-bar" style="color:#0e7490;margin-right:10px"></i>各次調查物種捕獲數量
          </div>
          <div style="font-size:16px;color:#64748b;margin-top:6px">
            橫流溪樣站 ‧ 電捕法單次捕獲尾數（109～110年為成果報告6站電捕合計；跨年抽樣差異見說明）
          </div>
        </div>
        <div style="background:${cpueTrend.bg};border:1.5px solid ${cpueTrend.border};border-radius:10px;padding:10px 18px;font-size:15px;color:${cpueTrend.color};font-weight:700;white-space:nowrap">
          <i class="fas ${cpueTrend.icon}" style="margin-right:6px"></i>${cpueTrend.label}
        </div>
      </div>
      <div style="position:relative;height:340px">
        <canvas id="fishTrendBar"></canvas>
      </div>
      <div style="background:#f8fafc;border-radius:10px;padding:16px 20px;margin-top:16px;font-size:16px;color:#334155;line-height:1.8;border-left:4px solid #0e7490">
        <strong>📊 圖表解讀：</strong>
        103～104年（魚道建置前）以臺灣石魚賓為主要記錄物種；107～108年白甲魚在多站調查中成為優勢種，108年4月4站合計589尾。
        109年第1次255尾、第2次262尾，全年517尾、12次調查，平均43.1尾／次；108年為893尾、8次調查、111.6尾／次。兩年的差異主要出現在平均尾／次，記錄到的物種仍有7種、H′ 1.63，最大優勢種占比約24%，群聚組成相當均衡。108年採4月與10月、109年改於7月與9月且樣站增為6站，季節、流況與魚群空間分散都可能造成年際差異，屬族群量波動的常見表現。
        110年第3次調查（4/28～5/5）回升至${HLX_FISH_110_SUMMARY.springTotal}尾，第4次（8/31～9/2）為${HLX_FISH_110_SUMMARY.autumnTotal}尾，
        兩次樣站電捕合計${HLX_FISH_110_SUMMARY.annualTotal}尾、魚類${HLX_FISH_110_SUMMARY.fishSpecies}種。
        112～114年年度總捕獲依序為${annualMetricByYear[2023]?.catch ?? '-'}、${annualMetricByYear[2024]?.catch ?? '-'}、${annualMetricByYear[2025]?.catch ?? '-'}尾；平均尾／次依序為${annualMetricByYear[2023]?.cpue ?? '-'}、${annualMetricByYear[2024]?.cpue ?? '-'}、${annualMetricByYear[2025]?.cpue ?? '-'}尾／次。總量與平均尾／次分別反映調查規模與單次記錄密度，宜一併判讀。
      </div>
    </div>

    <!-- 折線圖：總量趨勢 -->
    <div style="background:#fff;border:2px solid #e2e8f0;border-radius:16px;padding:24px;margin-bottom:24px">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:8px;flex-wrap:wrap;gap:8px">
        <div>
          <div style="font-size:22px;font-weight:900;color:#0f172a">
            <i class="fas fa-chart-line" style="color:#b45309;margin-right:10px"></i>臺灣白甲魚族群長期趨勢
          </div>
          <div style="font-size:16px;color:#64748b;margin-top:6px">
            保育旗艦指標種 ‧ 每次調查捕獲量 + 全物種合計對照
          </div>
        </div>
        <div style="background:#fef9c3;border:1.5px solid #fde047;border-radius:10px;padding:10px 18px;font-size:15px;color:#854d0e;font-weight:700;white-space:nowrap">
          🌟 已核對序列單次高點：105尾（114年12月）
        </div>
      </div>
      <div style="position:relative;height:280px">
        <canvas id="fishTrendLine"></canvas>
      </div>
      <div style="background:#f8fafc;border-radius:10px;padding:16px 20px;margin-top:16px;font-size:16px;color:#334155;line-height:1.8;border-left:4px solid #b45309">
        <strong>📈 趨勢解讀：</strong>
        臺灣白甲魚（易危，Onychostoma barbatulum）是橫流溪生態健康的關鍵指標種。103年（魚道建置前）幾乎無記錄，
        107~108年多站調查後呈現較高記錄，至114年12月單次調查達105尾；不同年度的站數與水文條件不一，應以相同樣站的持續監測確認趨勢；
        110年電捕成效報告亦確認白甲魚成功通行710m以上（0K+460→1K+170）。
      </div>
    </div>

    <!-- 兩行並列：多樣性指數 + 物種組成比較 -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:24px">
      <div style="background:#fff;border:2px solid #e2e8f0;border-radius:16px;padding:24px">
        <div style="font-size:18px;font-weight:900;color:#0f172a;margin-bottom:6px">
          <i class="fas fa-dna" style="color:#7c3aed;margin-right:10px"></i>生物多樣性指數 (H')
        </div>
        <div style="font-size:13px;color:#64748b;margin-bottom:16px">Shannon-Wiener指數 ‧ 數值越高代表物種組成越均衡豐富</div>
        <div style="position:relative;height:230px">
          <canvas id="fishDiversityChart"></canvas>
        </div>
        <div style="display:flex;gap:8px;margin-top:12px;justify-content:center;font-size:13px">
          <span style="background:#dcfce7;color:#166534;border-radius:6px;padding:4px 12px;font-weight:700">🟢 H' &gt;1.5 高多樣</span>
          <span style="background:#fef9c3;color:#854d0e;border-radius:6px;padding:4px 12px;font-weight:700">🟡 H' 0.8～1.5 中等</span>
          <span style="background:#fee2e2;color:#991b1b;border-radius:6px;padding:4px 12px;font-weight:700">🔴 H' &lt;0.8 偏低</span>
        </div>
        <div style="background:#f8fafc;border-radius:8px;padding:12px 14px;margin-top:10px;font-size:13px;color:#475569;line-height:1.75">
          <strong style="color:#5b21b6">計算口徑：</strong>本圖的柱狀 H′ 為<b>平台重算值</b>，不是逐年直接抄錄報告的既列指數。計算時先將同年度、屬於橫流溪的各調查場次之物種別尾數加總為年度群聚，再代入 Shannon-Wiener 公式 H′＝−Σ(pi ln pi)；pi 為該物種尾數占年度總捕獲量的比例。右軸紫線為年度出現物種數，須與 H′ 一起判讀。<br>
          <strong style="color:#0f766e">資料可回查：</strong>107～108 年原始物種別尾數來自《107～108年度橫流溪整治規劃設計監造與監測調查委託技術服務案成果報告》表 4-16；109～110 年來自《110年東勢林區管理處國有林魚道及生態廊道成效追蹤》表 5-3；111 年後來自橫流溪 Survey123 逐尾調查紀錄。三個資料路徑中的107～108與110年核心PDF經雜湊比對均為相同檔案副本，統計時各只計一次。110 年報告另有<b>樣站平均 H′ 約 1.4</b>的報告結論，此值與本圖的年度合計 H′ 屬不同統計尺度，不應互相替代。<br>
          <strong style="color:#7c2d12">專業判讀：</strong>103 年施工前的群聚由少數優勢種主導，H′ 較低；107～110 年多站追蹤中可見較多物種共同出現，反映棲地異質性與河道連通條件的變化。113 年共記錄 282 尾、6 種，平台重算 H′ 為 1.13；臺灣白甲魚 174 尾，占 61.7%。114 年共記錄 275 尾、8 種，H′ 回升至 1.25；臺灣白甲魚 170 尾，占 61.8%。因此兩年仍屬中等多樣性，主因不是魚少，而是優勢種比例偏高、均勻度受壓低；114 年記錄物種數與平均尾／次均較 113 年提高，群聚組成朝多物種共存方向變動，但優勢種占比仍偏高。107～110 年為多站彙整、111 年後以單站例行紀錄為主，年度 H′ 宜與平均尾／次、固定樣站、上下游同步調查、魚道中捕捉與水中影像一併判讀。
        </div>
      </div>
      <div style="background:#fff;border:2px solid #e2e8f0;border-radius:16px;padding:24px">
        <div style="font-size:18px;font-weight:900;color:#0f172a;margin-bottom:6px">
          <i class="fas fa-chart-pie" style="color:#0e7490;margin-right:10px"></i>114年物種組成比例
        </div>
        <div style="font-size:13px;color:#64748b;margin-bottom:16px">最新年度 ‧ 5種長期趨勢指標特有魚類捕獲比例分布</div>
        <div style="position:relative;height:190px">
          <canvas id="fishPieChart"></canvas>
        </div>
        <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:14px;justify-content:center">
          ${SPECIES.map(s=>`<span style="font-size:13px;background:#f8fafc;border:1.5px solid #e2e8f0;border-radius:6px;padding:4px 10px;display:flex;align-items:center;gap:6px">
            <span style="width:10px;height:10px;border-radius:50%;background:${s.color};flex-shrink:0;display:inline-block"></span>${s.name}</span>`).join('')}
        </div>
        <div style="background:#f0fdf4;border-radius:8px;padding:10px 14px;margin-top:10px;font-size:13px;color:#166534;line-height:1.6">
          114 年臺灣白甲魚占全 8 種年度捕獲量約<strong>61.8%</strong>，為壓低 H′ 均勻度的主要優勢種；同年記錄 8 種，顯示物種豐富度提高，但群聚尚未達高度均衡。
        </div>
      </div>
    </div>

    <!-- 各魚道型式關聯魚類歷年趨勢 -->
    <div style="background:#fff;border:2px solid #dbeafe;border-radius:18px;padding:24px;margin-bottom:28px">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:20px;flex-wrap:wrap;margin-bottom:24px">
        <div>
          <div style="font-size:22px;font-weight:900;color:#0f172a;line-height:1.3">
            <i class="fas fa-water" style="color:#2563eb;margin-right:12px"></i>各種魚道關聯魚類歷年趨勢圖
          </div>
          <div style="font-size:15px;color:#64748b;margin-top:8px;line-height:1.75">
            依魚道型式、所在里程與報告記錄之通行／棲地關聯物種分組，呈現103～114年指標魚種年度捕獲尾數變化（含魚道建置前基準）。
          </div>
        </div>
        <div style="background:#eff6ff;border:2px solid #bfdbfe;border-radius:14px;padding:14px 18px;font-size:15px;color:#1d4ed8;font-weight:900;line-height:1.55">
          7 種魚道型式<br>9 座魚道設施
        </div>
      </div>

      <div style="background:#fffbeb;border-left:4px solid #d97706;border-radius:14px;padding:16px 20px;margin-bottom:20px;font-size:14px;color:#334155;line-height:1.9">
        <strong style="color:#b45309"><i class="fas fa-circle-info" style="margin-right:6px"></i>本圖的閱讀方式：</strong>
        下方「總量比較」為各魚道型式關聯魚種的<b>年度原始捕獲尾數加總</b>，是各年度實際記錄到的總量。
        由於各年度的調查場次與樣站配置不完全相同，年度之間的總量高低不宜直接互比；
        要看跨年度的變化趨勢，請以本頁最上方<b style="color:#0e7490">生態監測儀表板的「尾／次」序列</b>為準
        （103 年 ${annualMetricByYear[2014]?.cpue ?? '-'} 尾／次、114 年 ${annualMetricByYear[2025]?.cpue ?? '-'} 尾／次；
        記錄物種數 ${annualMetricByYear[2014]?.richness ?? '-'} 種 → ${annualMetricByYear[2025]?.richness ?? '-'} 種）。
        本圖的價值在於呈現<b>各魚道型式關聯魚種的組成與相對消長</b>，可與流量、水質及上下游調查一併判讀。
      </div>

      <!-- ══ 魚道生態成效實證 ══════════════════════════════════════════ -->
      <div style="border:2px solid #0d6b5b;border-radius:18px;padding:22px 24px;margin-bottom:28px;background:linear-gradient(180deg,#f0f7f5,#ffffff)">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:6px">
          <div style="width:6px;height:34px;background:#0d6b5b;border-radius:3px"></div>
          <div style="font-size:20px;font-weight:900;color:#0f172a">魚道生態成效實證</div>
        </div>
        <div style="font-size:14px;color:#475569;line-height:1.75;margin-bottom:18px">
          以下四項指標皆為<b>長期序列</b>，並已處理各年站次差異，可直接跨年度比較。
          全部由本平台歷年調查序列即時計算，資料更新後同步變動。
          <span style="color:#94a3b8">原「生態品質評級（IBI）」與「九座魚道內部實測捕獲」僅涵蓋 109～110 年，
          不屬長期序列，已移除。</span>
        </div>

        <!-- 臺灣溪流保育框架中的定位
             原「一、生態品質評級（IBI）」僅有 109、110 兩年同口徑評估，
             不屬長期序列，依使用者指示移除；本卡片保留不受該限制的框架說明。 -->
        <div style="border:1.5px solid #cbd5e1;border-radius:14px;padding:18px 20px;background:#fff;margin-bottom:16px">
          <div>
            <div style="font-size:16px;font-weight:900;color:#0f172a;margin-bottom:10px">臺灣整體溪流保育框架中的橫流溪</div>
            <div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px">
              <div style="background:#ecfeff;border:1px solid #a5f3fc;border-radius:10px;padding:12px">
                <b style="color:#0e7490">標準化監測</b><br><span style="font-size:12px;color:#475569;line-height:1.65">依河川、樣站、日期、方法與數量建檔，以尾／次追蹤同口徑長期變化。</span>
              </div>
              <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:12px">
                <b style="color:#166534">原生與受脅物種</b><br><span style="font-size:12px;color:#475569;line-height:1.65">完整名錄8種，含4種紅皮書近危以上物種，是保育價值與棲地品質的重要訊號。</span>
              </div>
              <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;padding:12px">
                <b style="color:#1d4ed8">縱向連通證據</b><br><span style="font-size:12px;color:#475569;line-height:1.65">改善後上游新增記錄纓口臺鰍、短臀瘋鱨與短吻紅斑吻鰕虎 3 種，為魚類能通過構造物往上游移動的長期證據。</span>
              </div>
            </div>
            <div style="font-size:12px;color:#64748b;line-height:1.75;margin-top:10px">目前全臺公開資料的調查方法、季節與樣站範圍並不完全一致，因此不宣稱橫流溪位居全臺第幾名；平台改以全臺通用監測欄位與保育指標呈現其可驗證價值。</div>
          </div>

          <div style="font-size:12px;color:#64748b;line-height:1.8;margin-top:13px;padding-top:11px;border-top:1px solid #f1f5f9">
            <b style="color:#0d6b5b">全臺定位方式：</b>行政院水利署河川魚類調查資料採河川、測站、日期、物種、方法與數量等欄位，並依季節辦理調查；
            臺灣魚類 IBI 則須依本土魚相調整，不能把不同流域、不同調查規模的單一數值直接排名。
            因此本平台以「同河段、同方法、尾／次」的長期變化，加上紅皮書保育等級及上游物種名錄的長期改變，呈現橫流溪在臺灣溪流保育中的價值。<br>
            本地資料：${HLX_ECO_BENCHMARK.source}；
            <a href="https://data.gov.tw/dataset/25799" target="_blank" rel="noopener" style="color:#0e7490">水利署河川魚類調查資料</a>・
            <a href="https://www.tbri.gov.tw/view.php?id=777&theme=web_structure" target="_blank" rel="noopener" style="color:#0e7490">2024臺灣淡水魚類紅皮書名錄</a>
          </div>
        </div>

        <!-- 魚道連通性：主證據為上游物種名錄長期變化，魚道內實測 4 輪降為直接佐證 -->
        <div style="border:1.5px solid #cbd5e1;border-radius:14px;padding:18px 20px;background:#fff;margin-bottom:16px">
          <div style="font-size:16px;font-weight:900;color:#0f172a;margin-bottom:4px">
            一、魚道連通性：上游物種名錄長期變化
            <span style="font-size:12px;font-weight:700;color:#0d6b5b">（104～114 年，魚是否上得去）</span>
          </div>
          ${hlxEco_upstreamConnectivity()}

        </div>
        <!-- 受脅魚種 CPUE + 稀釋物種數 -->
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(340px,1fr));gap:16px">
          <div style="border:1.5px solid #cbd5e1;border-radius:14px;padding:18px 20px;background:#fff">
            <div style="font-size:16px;font-weight:900;color:#0f172a;margin-bottom:4px">二、受脅魚種平均尾／次</div>
            <div style="font-size:13px;color:#64748b;line-height:1.7;margin-bottom:12px">
              近危以上 4 種：臺灣白甲魚、纓口臺鰍、臺灣間爬岩鰍（近危 NNT）與短臀瘋鱨（易危 NVU・第三級保育類）。
              柱下數字為當年檢出的受脅種數。
            </div>
            ${hlxEco_threatenedTakeaway()}
            <div style="position:relative;height:250px"><canvas id="fishThreatenedChart"></canvas></div>
          </div>
          <div style="border:1.5px solid #cbd5e1;border-radius:14px;padding:18px 20px;background:#fff">
            <div style="font-size:16px;font-weight:900;color:#0f172a;margin-bottom:4px">
              三、調查量校正後的物種多樣性
            </div>
            <div style="font-size:13px;color:#64748b;line-height:1.7;margin-bottom:12px">
              各年調查次數不同，直接比「記錄到幾種」對調查少的年度不公平。
              本圖把各年統一換算到<b>同樣抓 100 尾時預期會有幾種</b>，藉此排除調查量差異。
              捕獲量不足 ${RAREFY_N} 尾的年度不列。
              <span style="color:#94a3b8">（統計方法：Hurlbert 個體基礎稀釋，指標即 E[S<sub>${RAREFY_N}</sub>] ± SD，
              誤差線為標準差）</span>
            </div>
            ${hlxEco_richnessTakeaway()}
            <div style="position:relative;height:250px"><canvas id="fishRarefiedChart"></canvas></div>
            ${bestRarefied ? `<div style="font-size:12.5px;color:#0d6b5b;font-weight:800;margin-top:10px">
              全期最高：${bestRarefied.label} E[S<sub>${RAREFY_N}</sub>] = ${bestRarefied.E}，
              僅用 ${bestRarefied.effort} 次調查達成。</div>` : ''}
          </div>
        </div>

        <!-- 出現矩陣 -->
        <div style="border:1.5px solid #cbd5e1;border-radius:14px;padding:18px 20px;background:#fff;margin-top:16px">
          <div style="font-size:16px;font-weight:900;color:#0f172a;margin-bottom:4px">
            四、93～114 年物種出現矩陣
            <span style="font-size:12px;font-weight:700;color:#0d6b5b">（22 年・不受站數影響）</span>
          </div>
          <div style="font-size:13px;color:#64748b;line-height:1.7;margin-bottom:14px">
            左半為附錄二官方出現層（93～106 年，僅有出現紀錄、無尾數）；右半為平台量化序列（107～114 年）。
            色深代表該年檢出的季別／場次比例，<b>最淺格代表「已調查但未檢出」，不等同物種消失</b>。
            此圖是稀有魚種唯一誠實的長期呈現方式。
          </div>
          ${hlxEco_matrixTakeaway()}
          ${renderOccurrenceMatrix(annualData, annualYears)}
          <div style="font-size:11.5px;color:#94a3b8;margin-top:10px">
            來源：${HLX_FISH_OCCURRENCE_9306.source}；107～114 年為本平台量化序列。
            ${HLX_FISH_OCCURRENCE_9306.policy}
          </div>
        </div>
      </div>

      <div style="display:grid;grid-template-columns:minmax(0,1fr);gap:20px;margin-bottom:28px;align-items:start">
        <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;align-content:start">
          ${FISHWAY_TYPES.map(fw => {
            const cpue = fishwayTargetCPUE(fw);
            // 106年（建置前基準）對齊年度索引，與最新年度(114)比較 CPUE 變化
            const baseIdx = annualEffortMetrics.findIndex(m => Number(m.year) === 2017);
            const latest = cpue[cpue.length - 1] || 0;
            const base = baseIdx >= 0 ? (cpue[baseIdx] || 0) : (cpue[0] || 0);
            const delta = +(latest - base).toFixed(1);
            const mult = base > 0 ? (latest / base).toFixed(1) : null;
            const trend = fishwayTargetTrend(fw);
            return `
              <div style="border:2px solid ${fw.color}55;border-radius:14px;padding:18px 20px;background:${fw.color}0d;min-height:160px">
                <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:12px">
                  <div style="font-size:24px;font-weight:900;color:#0f172a;line-height:1.25">${fw.name}</div>
                  <span style="font-size:17px;border-radius:999px;padding:5px 13px;background:#fff;color:${fw.color};border:1.5px solid ${fw.color}66;font-weight:900;white-space:nowrap">${fw.status}</span>
                </div>
                <div style="font-size:18px;color:#64748b;line-height:1.5">${fw.facilities}｜${fw.station}</div>
                <div style="font-size:18px;color:#334155;margin-top:8px;line-height:1.6">關聯物種：${fishwayTargetNames(fw)}</div>
                <div style="display:flex;align-items:baseline;gap:10px;margin-top:12px;flex-wrap:wrap">
                  <span style="font-size:32px;font-weight:900;color:${fw.color};line-height:1">${latest}</span>
                  <span style="font-size:17px;color:#64748b">114年 平均尾／次</span>
                  <span style="font-size:17px;color:${delta>=0?'#15803d':'#b91c1c'};font-weight:900">${delta>=0?'+':''}${delta} 較106年${mult&&delta>=0?`（×${mult}）`:''}</span>
                </div>
                <div style="font-size:15px;color:${trend.slope>=0?'#166534':'#b91c1c'};font-weight:800;margin-top:9px">長期趨勢斜率 ${trend.slope>=0?'+':''}${trend.slope.toFixed(1)} 尾／次／年</div>
              </div>
            `;
          }).join('')}
        </div>
      </div>

      <details style="display:none;background:#f8fafc;border:1.5px solid #cbd5e1;border-radius:14px;margin-bottom:18px;overflow:hidden">
        <summary style="cursor:pointer;list-style:none;display:flex;align-items:center;gap:10px;padding:13px 18px;font-size:15px;font-weight:900;color:#0369a1;user-select:none">
          <i class="fas fa-circle-info" style="font-size:16px"></i>
          圖表判讀說明
          <span style="margin-left:auto;font-size:12px;font-weight:600;color:#94a3b8">點選展開 ▼</span>
        </summary>
        <div style="padding:16px 20px 18px;border-top:1px solid #e2e8f0;display:flex;flex-direction:column;gap:12px">
          <div style="display:flex;flex-direction:column;gap:10px">
            <div style="display:flex;gap:10px;align-items:flex-start">
              <div style="width:13px;height:13px;border-radius:3px;background:rgba(148,163,184,0.70);flex-shrink:0;margin-top:2px"></div>
              <div style="font-size:14px;color:#475569;line-height:1.7">
                <b style="color:#0f172a">灰色底層 ＝ 臺灣白甲魚（所有魚道共用）</b><br>
                103 年幾乎缺席，107 年魚道完工後持續回升，114 年達 68 尾/站。此上升基底在 7 張圖中完全一致，顯示全溪白甲魚族群整體復甦。
              </div>
            </div>
            <div style="display:flex;gap:10px;align-items:flex-start">
              <div style="width:13px;height:13px;border-radius:3px;background:linear-gradient(135deg,#0ea5e9,#ef4444);flex-shrink:0;margin-top:2px"></div>
              <div style="font-size:14px;color:#475569;line-height:1.7">
                <b style="color:#0f172a">彩色上層 ＝ 各型式特徵種（依魚道結構各異）</b><br>
                例如潛越式偏好石魚賓與間爬岩鰍（底棲強溯），之字形吸引鬚鱲與纓口臺鰍（緩流型）。彩色比例不同，說明各魚道為不同生態習性的魚種提供了差異化棲位。
              </div>
            </div>
            <div style="display:flex;gap:10px;align-items:flex-start">
              <div style="width:13px;height:13px;border-radius:3px;background:#fbbf24;flex-shrink:0;margin-top:2px"></div>
              <div style="font-size:14px;color:#475569;line-height:1.7">
                <b style="color:#0f172a">109 年的年際波動</b><br>
                109 年平均 43.1 尾／次，記錄到 7 種、H′ 1.63，最大優勢種約占 24%；屬單次記錄密度較低但組成均衡的一年。相較 108 年，調查次數由 8 增至 12，季節亦改為 7 月與 9 月，水文條件、魚群空間分散與樣站組合都會影響單次記錄到的尾數，宜視為多因子共同作用下的年際波動。
              </div>
            </div>
          </div>
          <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:10px;padding:10px 14px;font-size:13px;color:#78350f;line-height:1.7">
            <b>本圖使用平均尾／次而非原始捕獲總量。</b>
            橫流溪歷年調查站數不一（107年3站、108年4站、109～110年6站、111～114年各事件以單站記錄為主），原始總尾數不可直接跨年度比較。CPUE可降低站數差異，但仍需搭配季節、水文、方法與固定樣站資料，才能判讀長期變化及魚道成效。
          </div>
        </div>
      </details>

      <details style="display:none;border:1.5px solid #e2e8f0;border-radius:14px;overflow:hidden">
        <summary style="cursor:pointer;list-style:none;display:flex;align-items:center;gap:10px;padding:12px 18px;font-size:15px;font-weight:900;color:#475569;background:#f8fafc;user-select:none">
          <i class="fas fa-chart-bar" style="font-size:15px;color:#94a3b8"></i>
          各魚道型式 CPUE 分項趨勢圖（7 張）
          <span style="margin-left:auto;font-size:12px;font-weight:600;color:#94a3b8">點選展開 ▼</span>
        </summary>
        <div style="padding:16px 0 0">
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:18px">
        ${FISHWAY_TYPES.map(fw => `
          <div style="border:2px solid #e2e8f0;border-radius:18px;padding:26px;background:#fff">
            <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:20px">
              <div>
                <div style="font-size:26px;font-weight:900;color:#0f172a;line-height:1.35">${fw.name}</div>
                <div style="font-size:19px;color:#64748b;margin-top:8px;line-height:1.5">${fw.facilities}｜${fw.station}</div>
              </div>
              <button type="button" onclick="openFishwayTrendModal('${fw.key}')" title="放大${fw.name}趨勢圖" style="border:1.5px solid ${fw.color}66;background:${fw.color}14;color:${fw.color};border-radius:10px;padding:9px 14px;font-size:17px;font-weight:900;cursor:pointer;flex-shrink:0">
                <i class="fas fa-up-right-and-down-left-from-center"></i>
              </button>
            </div>
            <div onclick="openFishwayTrendModal('${fw.key}')" title="點選放大圖表" style="position:relative;height:220px;cursor:zoom-in">
              <canvas id="fishwayTrend_${fw.key}"></canvas>
            </div>
            <div style="font-size:21px;color:#475569;line-height:1.9;margin-top:20px">${fw.note}</div>
            <div style="font-size:20px;color:#166534;line-height:1.9;margin-top:16px;background:#f0fdf4;border-radius:12px;padding:18px 20px">${fw.management}</div>
            <div style="font-size:17px;color:#94a3b8;line-height:1.7;margin-top:14px;border-top:1px dashed #e2e8f0;padding-top:14px">※ 尾／次資料來源為橫流溪全溪電捕調查（非個別魚道實地監測），趨勢反映全溪族群動態，物種組合為該型式通行潛力指標，無法單獨歸因於特定魚道設施效益。</div>
          </div>
        `).join('')}
      </div>
        </div>
      </details>
    </div>

    <!-- ★ 四大亮點分析 -->
    <div style="background:#fff;border:2px solid #e2e8f0;border-radius:16px;padding:28px;margin-bottom:24px">
      <div style="font-size:20px;font-weight:900;color:#0f172a;margin-bottom:20px;display:flex;align-items:center;gap:10px">
        <i class="fas fa-microscope" style="color:#0369a1;font-size:22px"></i>生態專家分項成果分析
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:18px">
        ${[
          { icon:'fa-arrow-trend-up', title:'族群量與平均尾／次變化', color:'#22c55e', bg:'#f0fdf4', bd:'#bbf7d0',
            body:`106年（2017年）每次調查總捕獲23～31尾，平均28.8尾；113年年度總捕獲${annualMetricByYear[2024]?.catch ?? '-'}尾、平均 ${annualMetricByYear[2024]?.cpue ?? '-'} 尾／次，114年年度總捕獲${annualMetricByYear[2025]?.catch ?? '-'}尾、平均 ${annualMetricByYear[2025]?.cpue ?? '-'} 尾／次。臺灣白甲魚於114年12月單次達105尾。數據顯示相較早期基準有較高捕獲記錄，但跨年度結論仍須以固定樣站及相同季節複核。`,
            badge:'原始量＋尾／次' },
          { icon:'fa-route', title:'魚道連通性觀察指標', color:'#f59e0b', bg:'#fffbeb', bd:'#fde68a',
            body:'魚道連通性追蹤指標顯示，臺灣間爬岩鰍於110年全年合計記錄32尾（其中4月23尾、9月9尾）；114年已核對調查資料合計13尾。本計畫已導入魚道上下游同步調查、標放試驗及自動化影像監測機制進行交叉驗證，歷年監測數據確實證實魚道具備良好之縱向連通功能，能有效供底棲性魚類（臺灣間爬岩鰍、明潭吻鰕虎等）進行上下游遷徙與棲地擴展。109～110年8區9座魚道均有魚類捕捉紀錄，為縱向通行功能提供具體實證。',
            badge:'上下游同步＋標放＋影像三驗' },
          { icon:'fa-layer-group', title:'物種組成與多樣性變化', color:'#3b82f6', bg:'#eff6ff', bd:'#bfdbfe',
            body:`106年魚相由臺灣白甲魚高度主導；已核對序列的年度物種數最高為${Math.max(...annualEffortMetrics.map(metric => metric.richness))}種。113年為6種、H′ 1.13，臺灣白甲魚占61.7%；114年增為8種、H′ 1.25，臺灣白甲魚占61.8%。114年記錄物種數與平均尾／次均較高，多樣性指數則仍屬中等，主要反映優勢種比例偏高、均勻度較低的組成結構。`,
            badge:'同口徑比較' },
          { icon:'fa-droplet', title:'✅ 水質長期優良，支撐保育類物種生存', color:'#7c3aed', bg:'#faf5ff', bd:'#ddd6fe',
            body:'歷次調查pH值維持在7.87～8.03之間（弱鹼性優良水質），水溫夏季22.5～24.9°C、冬季11～11.4°C，均處於臺灣原生魚類最適生存範圍。電導度265～363μS/m亦顯示無污染。穩定優良的水質條件，為3種保育類特有魚類長期定居與繁殖提供了堅實的環境基礎。',
            badge:'水質優良認證' },
        ].map((c,i)=>`
          <div style="border:2px solid ${c.bd};border-radius:14px;padding:20px;background:${c.bg}">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;flex-wrap:wrap;gap:8px">
              <div style="font-size:20px;font-weight:900;color:#0f172a;display:flex;align-items:center;gap:10px">
                <i class="fas ${c.icon}" style="color:${c.color};font-size:20px"></i>${c.title}
              </div>
              <span style="background:${c.color};color:#fff;border-radius:20px;padding:5px 14px;font-size:15px;font-weight:700;white-space:nowrap">${c.badge}</span>
            </div>
            <div style="font-size:18px;color:#334155;line-height:1.85">${c.body}</div>
          </div>`).join('')}
      </div>
    </div>

    <!-- 歷次調查資料彙整表 -->
    <div style="display:none">
      <div style="font-size:20px;font-weight:900;color:#0f172a;margin-bottom:6px">
        <i class="fas fa-table" style="color:#0e7490;margin-right:10px"></i>歷次調查捕獲記錄完整彙整表
      </div>
      <div style="font-size:14px;color:#64748b;margin-bottom:16px">18次調查數據一覽 ‧ 綠色底線為高捕獲量（≥100尾），橘色為中等（≥50尾）</div>
      <div style="overflow-x:auto">
        <table style="width:100%;border-collapse:collapse;font-size:14px">
          <thead>
            <tr style="background:linear-gradient(135deg,#0e7490,#0369a1);color:#fff">
              <th style="padding:13px 14px;text-align:left;font-weight:700;border-radius:8px 0 0 0;font-size:15px">調查時間</th>
              <th style="padding:13px 14px;text-align:center;font-size:15px">臺灣白甲魚</th>
              <th style="padding:13px 14px;text-align:center;font-size:15px">臺灣石魚賓</th>
              <th style="padding:13px 14px;text-align:center;font-size:15px">臺灣鬚鱲</th>
              <th style="padding:13px 14px;text-align:center;font-size:15px">纓口臺鰍</th>
              <th style="padding:13px 14px;text-align:center;font-size:15px">臺灣間爬岩鰍</th>
              <th style="padding:13px 14px;text-align:center;font-size:15px">合計</th>
              <th style="padding:13px 14px;text-align:center;font-size:15px">H' 多樣性</th>
              <th style="padding:13px 14px;text-align:center;border-radius:0 8px 0 0;font-size:15px">備註</th>
            </tr>
          </thead>
          <tbody>
            ${SURVEYS.map((s,i)=>{
              const bg = i%2===0 ? '#f8fafc' : '#fff';
              const est = s.est ? '<span style="font-size:11px;color:#94a3b8;font-style:italic">*估算</span>' : '';
              const hiRow = s.total >= 100 ? 'border-left:5px solid #22c55e;background:#f0fdf4;' : s.total>=50?'border-left:5px solid #f97316;background:#fffbeb;':'border-left:5px solid #e2e8f0;';
              return `<tr style="${hiRow}">
                <td style="padding:11px 14px;font-weight:800;color:#0f172a;white-space:nowrap;font-size:14px">${s.label.replace('\n',' ')}</td>
                <td style="padding:11px 14px;text-align:center;color:${s.bai>0?'#0369a1':'#94a3b8'};font-weight:${s.bai>0?800:400};font-size:15px">${s.bai||'—'}</td>
                <td style="padding:11px 14px;text-align:center;color:${s.shi>0?'#c2410c':'#94a3b8'};font-weight:${s.shi>0?800:400};font-size:15px">${s.shi||'—'}</td>
                <td style="padding:11px 14px;text-align:center;color:${s.xu>0?'#7e22ce':'#94a3b8'};font-weight:${s.xu>0?800:400};font-size:15px">${s.xu||'—'}</td>
                <td style="padding:11px 14px;text-align:center;color:${s.ying>0?'#15803d':'#94a3b8'};font-weight:${s.ying>0?800:400};font-size:15px">${s.ying||'—'}</td>
                <td style="padding:11px 14px;text-align:center;color:${s.jian>0?'#be123c':'#94a3b8'};font-weight:${s.jian>0?800:400};font-size:15px">${s.jian||'—'}</td>
                <td style="padding:11px 14px;text-align:center;font-size:18px;font-weight:900;color:#0f172a">${s.total} ${est}</td>
                <td style="padding:11px 14px;text-align:center">
                  ${Number.isFinite(s.H)
                    ? `<span style="background:${s.H>=1.5?'#dcfce7':s.H>=0.8?'#fef9c3':'#fee2e2'};color:${s.H>=1.5?'#166534':s.H>=0.8?'#854d0e':'#991b1b'};border-radius:8px;padding:4px 10px;font-weight:800;font-size:14px">${s.H}</span>`
                    : '<span style="background:#e2e8f0;color:#475569;border-radius:8px;padding:4px 10px;font-weight:800;font-size:13px">未計算</span>'}
                </td>
                <td style="padding:11px 14px;font-size:16px;color:#64748b">${s.note}</td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
      <div style="font-size:17px;color:#94a3b8;margin-top:12px">
        ＊ H′ = Shannon–Wiener 生物多樣性指數（H′＝−Σpi ln pi）；其理論上限受納入物種數限制，本頁以 8 種發布魚類計算時最高約為 ln(8)＝2.08。未捕獲個體場次不計算 H′。109～110年資料引自《東勢林區管理處國有林魚道及生態廊道委託技術服務成果報告（110年）》表5-3，為橫流溪6站電捕合計；110年第3次4月486尾、第4次9月235尾，全年合計721尾。
      </div>
    </div>

    <!-- 物種資訊卡 -->
    <div style="background:#fff;border:2px solid #e2e8f0;border-radius:16px;padding:24px;margin-bottom:24px">
      <div style="font-size:20px;font-weight:900;color:#0f172a;margin-bottom:6px">
        <i class="fas fa-info-circle" style="color:#0369a1;margin-right:10px"></i>橫流溪記錄魚種生態特性一覽
      </div>
      <div style="font-size:18px;color:#64748b;margin-bottom:20px">全8種記錄魚類完整生態特性 ‧ 5種長期指標特有種（含3種保育類II級）＋3種次要物種（含易危・近危保育關注種）</div>
      <div style="font-size:17px;font-weight:700;color:#0369a1;margin-bottom:12px;display:flex;align-items:center;gap:6px">
        <i class="fas fa-fish"></i> 長期趨勢指標特有種（5種）
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:14px;margin-bottom:20px">
        ${[
          { sp:'臺灣白甲魚', eng:'Onychostoma barbatulum', fam:'鯉科', status:'🔴 保育類第II類 ‧ 台灣特有種', icon:'🐟',
            desc:'橫流溪第一優勢種，長期占總捕獲量50～85%。初級性淡水魚，喜愛水質潔淨、水流湍急之中上游河段。游泳能力強，可通過魚道進行溪內洄游，為本區生態健康評估最重要的旗艦指標物種。', color:'#0ea5e9', bg:'#f0f9ff' },
          { sp:'臺灣石魚賓', eng:'Acrossocheilus paradoxus', fam:'鯉科', status:'🟡 台灣特有種', icon:'🐠',
            desc:'橫流溪第二優勢種，棲息於水流湍急或清澈深水潭，喜好大型礫石或岩石底質環境。106年部分季節占比偏高，後隨臺灣鬚鱲族群擴增而趨於平衡，目前仍維持穩定族群。', color:'#f97316', bg:'#fff7ed' },
          { sp:'臺灣鬚鱲', eng:'Candidia barbata', fam:'鯉科', status:'🟡 台灣特有種', icon:'🦈',
            desc:'109年後在橫流溪大量出現，112～113年春季占比可達25%以上，顯示上游棲地環境持續改善。初級淡水魚，棲息於河川中上游開闊河段，族群擴增與魚道設置後基因交流加強有關。', color:'#a855f7', bg:'#faf5ff' },
          { sp:'纓口臺鰍', eng:'Formosania lacustre', fam:'爬鰍科', status:'🔴 保育類第II類 ‧ 台灣特有種', icon:'🦎',
            desc:'初級淡水魚，喜好清澈水流及礫石底質。歷次調查均有穩定出現，說明橫流溪礫石底質棲地保持良好，為附著性底棲保育魚類提供優質微棲地。', color:'#22c55e', bg:'#f0fdf4' },
          { sp:'臺灣間爬岩鰍', eng:'Hemimyzon formosanus', fam:'爬鰍科', status:'🔴 保育類第II類 ‧ 台灣特有種', icon:'🦊',
            desc:'溪內洄游旗艦物種，其出現與否直接反映魚道通行效益。110年全年合計32尾（4月23尾、9月9尾），114年12月再現13尾，搭配雪山坑溪91尾紀錄，確認魚道發揮連結上下游族群之關鍵功能。', color:'#f43f5e', bg:'#fff1f2' },
        ].map(s=>`
          <div style="border:2px solid ${s.color}40;border-radius:12px;padding:18px;background:${s.bg}">
            <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
              <span style="font-size:28px">${s.icon}</span>
              <div>
                <div style="font-size:20px;font-weight:900;color:#0f172a">${s.sp}</div>
                <div style="font-size:15px;font-style:italic;color:#64748b">${s.eng}</div>
              </div>
            </div>
            <div style="display:flex;gap:6px;margin-bottom:12px;flex-wrap:wrap">
              <span style="font-size:15px;background:${s.color}20;color:${s.color};border-radius:6px;padding:4px 12px;font-weight:700">${s.fam}</span>
              <span style="font-size:15px;background:#f1f5f9;color:#475569;border-radius:6px;padding:4px 12px">${s.status}</span>
            </div>
            <div style="font-size:18px;color:#334155;line-height:1.8">${s.desc}</div>
          </div>`).join('')}
      </div>

      <!-- 次要物種分隔線 -->
      <div style="border-top:2px dashed #e2e8f0;margin:20px 0 16px"></div>
      <div style="font-size:17px;font-weight:700;color:#7c3aed;margin-bottom:12px;display:flex;align-items:center;gap:6px">
        <i class="fas fa-search"></i> 次要物種・保育關注種（3種）
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:14px">
        ${[
          { sp:'明潭吻鰕虎', eng:'Rhinogobius candidianus', fam:'鰕虎科', status:'🟢 台灣特有種 ‧ 一般物種', icon:'🐡',
            desc:'次要4種中族群數量最多（103～114年累計317尾），是橫流溪最常見的底棲型鰕虎。棲息於礫石縫隙間，以小型底棲無脊椎動物為食，對水質敏感，偏好清澈高溶氧之急流至緩流段。分布範圍廣，107年至113年持續有記錄，族群整體穩定。', color:'#3b82f6', bg:'#eff6ff' },
          { sp:'粗首馬口鱲', eng:'Opsariichthys pachycephalus', fam:'鯉科', status:'🟢 台灣特有種 ‧ 一般物種', icon:'🐟',
            desc:'臺灣特有種，常見於河川中上游流動水域。橫流溪目前僅112年11月及12月各確認2尾，共4尾；其餘年度為「已調查未檢出」，不是推估為零，也不能解讀為全溪不存在。資料清理已比對舊學名Zacco pachycephalus及「粗手馬口鱲」「粗首馬口」等OCR異體；「臺灣馬口魚」因可能指臺灣鬚鱲，未具學名或標本佐證者不併計。裡冷溪與南湖溪的陽性資料亦不移入橫流溪。', color:'#f59e0b', bg:'#fffbeb' },
          { sp:'短臀瘋鱨', eng:'Tachysurus brevianalis', fam:'鯰科', status:'🔴 保育類第III類 ‧ 易危（VU）', icon:'🦶',
            desc:'保育類第三級（易危），IUCN評為近危（NT）。108年4月首次在橫流溪確認（4尾），為重要新紀錄，顯示橫流溪仍維持足以支持此保育物種之水域環境。夜行性底棲魚類，白天多藏匿於大型礫石或倒木下方，以底棲無脊椎動物為主食，觸鬚發達。族群數量極少，建議加強夜間調查以正確評估族群規模。', color:'#dc2626', bg:'#fef2f2' },
          { sp:'短吻紅斑吻鰕虎', eng:'Rhinogobius rubromaculatus', fam:'鰕虎科', status:'🟠 IUCN近危（NT）', icon:'🦐',
            desc:'IUCN近危（NT）物種，分布範圍局限於台灣中部特定清澈急流溪段。109年後首次在橫流溪記錄，與明潭吻鰕虎共域，兩者比例約1:22.6。棲息要求較明潭吻鰕虎更嚴苛，偏好高溶氧、低濁度之清澈急流段，汛期後沉積物增加時即趨於不穩定。體色鮮豔、具紅斑特徵，具一定領域性。為橫流溪高度保育價值物種，零星記錄具重要生態指標意義。', color:'#059669', bg:'#f0fdf4' },
        ].filter(s => fish_isPublishedSpecies(s.sp)).map(s=>`
          <div style="border:2px solid ${s.color}40;border-radius:12px;padding:18px;background:${s.bg}">
            <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
              <span style="font-size:28px">${s.icon}</span>
              <div>
                <div style="font-size:20px;font-weight:900;color:#0f172a">${s.sp}</div>
                <div style="font-size:15px;font-style:italic;color:#64748b">${s.eng}</div>
              </div>
            </div>
            <div style="display:flex;gap:6px;margin-bottom:12px;flex-wrap:wrap">
              <span style="font-size:15px;background:${s.color}20;color:${s.color};border-radius:6px;padding:4px 12px;font-weight:700">${s.fam}</span>
              <span style="font-size:15px;background:#f1f5f9;color:#475569;border-radius:6px;padding:4px 12px">${s.status}</span>
            </div>
            <div style="font-size:18px;color:#334155;line-height:1.8">${s.desc}</div>
          </div>`).join('')}
      </div>
    </div>

    <!-- 水質監測摘要 -->
    <div style="background:#fff;border:2px solid #e2e8f0;border-radius:16px;padding:24px;margin-bottom:24px">
      <div style="font-size:20px;font-weight:900;color:#0f172a;margin-bottom:6px">
        <i class="fas fa-tint" style="color:#0369a1;margin-right:10px"></i>調查期間水質環境監測摘要
      </div>
      <div style="font-size:18px;color:#64748b;margin-bottom:20px">橫流溪水質長期維持優良，符合保育類淡水魚類生存需求</div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:14px">
        ${[
          { label:'pH 值範圍',    val:'7.87 ～ 8.03', unit:'pH', note:'近中性偏弱鹼，水質優良', icon:'fa-flask', color:'#0e7490' },
          { label:'電導度範圍',   val:'265 ～ 363',   unit:'μS/m', note:'無污染，礦物質適中', icon:'fa-bolt', color:'#f97316' },
          { label:'水溫（夏季）', val:'22.5 ～ 24.9', unit:'°C', note:'適合原生魚類活躍活動', icon:'fa-thermometer-half', color:'#f43f5e' },
          { label:'水溫（冬季）', val:'11.0 ～ 11.4', unit:'°C', note:'低溫清水期族群集中', icon:'fa-snowflake', color:'#3b82f6' },
          { label:'流量（Q）',    val:'5.7 ～ 8.6',   unit:'m³/s', note:'水量充沛，棲地穩定', icon:'fa-water', color:'#22c55e' },
          { label:'棲地型態',     val:'急瀨・平瀨・水潭', unit:'', note:'空間異質高，魚類多樣', icon:'fa-layer-group', color:'#7c3aed' },
        ].map(c=>`
          <div style="border:1.5px solid #e2e8f0;border-radius:12px;padding:18px">
            <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">
              <i class="fas ${c.icon}" style="color:${c.color};font-size:20px"></i>
              <div style="font-size:17px;color:#64748b">${c.label}</div>
            </div>
            <div style="font-size:20px;font-weight:900;color:#0f172a">${c.val} <span style="font-size:17px;font-weight:400;color:#94a3b8">${c.unit}</span></div>
            <div style="font-size:17px;color:#64748b;margin-top:6px">${c.note}</div>
          </div>`).join('')}
      </div>
    </div>

    <!-- ── 8種魚類完整歷年趨勢（整合區） ── -->
    <div id="secondarySpeciesTrend" aria-hidden="true" style="display:none;margin-top:28px;padding-top:24px;border-top:2px dashed #e2e8f0">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:6px">
        <div style="width:5px;height:48px;background:linear-gradient(180deg,#3b82f6,#059669,#dc2626);border-radius:4px;flex-shrink:0"></div>
        <div>
          <div style="font-size:20px;font-weight:900;color:#0f172a">
            <i class="fas fa-chart-bar" style="color:#3b82f6;margin-right:8px"></i>8種魚類完整歷年趨勢（明潭吻鰕虎・短臀瘋鱨・短吻紅斑吻鰕虎）
          </div>
          <div style="font-size:18px;color:#64748b;margin-top:5px">
            各卡柱狀圖為年度實測尾數；藍綠折線為努力量校正 CPUE（尾／次），可排除各年度調查站數差異
          </div>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(290px,1fr));gap:18px;margin-top:18px">
        ${[
          // ── 5 種長期指標特有種（年度合計資料）｜cons＝2024臺灣紅皮書國家受脅等級 ──
          { id:'spTrend_臺灣白甲魚',     name:'臺灣白甲魚',     sci:'Onychostoma barbatulum',      cons:'近危', borderCol:'#bae6fd', topCol:'#0ea5e9', badge:'#e0f2fe', badgeTxt:'#0369a1', note:'特有種・2024紅皮書近危(NNT)・已核對序列中為主要優勢種，跨年度比較須校正努力量' },
          { id:'spTrend_臺灣石魚賓',     name:'臺灣石魚賓',     sci:'Acrossocheilus paradoxus',    cons:'一般',   borderCol:'#fed7aa', topCol:'#f97316', badge:'#fff7ed', badgeTxt:'#9a3412', note:'特有種・2024紅皮書無危(NLC)・103年基準優勢種，現與白甲魚共存穩定' },
          { id:'spTrend_臺灣鬚鱲',       name:'臺灣鬚鱲',       sci:'Candidia barbata',            cons:'一般',   borderCol:'#e9d5ff', topCol:'#a855f7', badge:'#f5f3ff', badgeTxt:'#6b21a8', note:'特有種・2024紅皮書無危(NLC)・104年起持續記錄，中游水質指標種' },
          { id:'spTrend_纓口臺鰍',       name:'纓口臺鰍',       sci:'Formosania lacustre',         cons:'近危', borderCol:'#bbf7d0', topCol:'#22c55e', badge:'#f0fdf4', badgeTxt:'#15803d', note:'特有種・2024紅皮書近危(NNT，2017易危下修)・底棲吸附型，魚道通行已確認' },
          { id:'spTrend_臺灣間爬岩鰍',   name:'臺灣間爬岩鰍',   sci:'Hemimyzon formosanus',       cons:'近危', borderCol:'#fecaca', topCol:'#f43f5e', badge:'#fff1f2', badgeTxt:'#be123c', note:'特有種・2024紅皮書近危(NNT，2017易危下修)・魚道關聯最高，114年回升13尾' },
          // ── 3 種次要物種暨鰕虎科（電捕法DB記錄）──
          { id:'spTrend_明潭吻鰕虎',     name:'明潭吻鰕虎',     sci:'Rhinogobius candidianus',    cons:'一般',     borderCol:'#bfdbfe', topCol:'#2563eb', badge:'#dbeafe', badgeTxt:'#1e40af', note:`特有種・2024紅皮書無危(NLC)・魚道完工後107年族群快速建立，累計 ${HLX_FISH_FULL_TOTALS['明潭吻鰕虎']} 尾，全流域廣布，溪流健康指標` },
          { id:'spTrend_粗首馬口鱲',     name:'粗首馬口鱲',     sci:'Opsariichthys pachycephalus', cons:'一般',     borderCol:'#fde68a', topCol:'#b45309', badge:'#fef9c3', badgeTxt:'#92400e', note:`特有種・2024紅皮書無危(NLC)・橫流溪可稽核量化紀錄僅112年4尾；其他年度為已調查未檢出，不以鄰近溪流或推估值補入` },
          { id:'spTrend_短臀瘋鱨',       name:'短臀瘋鱨',       sci:'Tachysurus brevianalis',     cons:'易危',     borderCol:'#fecdd3', topCol:'#dc2626', badge:'#fee2e2', badgeTxt:'#991b1b', note:`特有種・2024紅皮書易危(NVU，2017無危上修)・107年起間歇捕獲，累計 ${HLX_FISH_FULL_TOTALS['短臀瘋鱨']} 尾；111年DOCX Table 9量化確認上游Q4（體長110mm），易危種低密度持續維持` },
          { id:'spTrend_短吻紅斑吻鰕虎', name:'短吻紅斑吻鰕虎', sci:'Rhinogobius rubromaculatus', cons:'一般',     borderCol:'#d1fae5', topCol:'#059669', badge:'#ecfdf5', badgeTxt:'#065f46', note:`特有種・2024紅皮書無危(NLC)・107年起間歇捕獲，累計 ${HLX_FISH_FULL_TOTALS['短吻紅斑吻鰕虎']} 尾；111年DOCX Table 9量化確認上游Q4（體長55mm），下游站零值不代表族群缺席` }
        ].filter(sp => fish_isPublishedSpecies(sp.name)).map(sp => `
          <div style="background:#fff;border:2px solid ${sp.borderCol};border-top:4px solid ${sp.topCol};border-radius:14px;overflow:hidden">
            <div style="background:${sp.badge};padding:12px 16px 10px">
              <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">
                <div style="font-size:21px;font-weight:800;color:#0f172a">${sp.name}</div>
                <span style="background:${sp.badge};color:${sp.badgeTxt};border:1.5px solid ${sp.borderCol};font-size:16px;padding:4px 12px;border-radius:20px;font-weight:700">${sp.cons}</span>
              </div>
              <div style="font-size:16px;font-style:italic;color:#64748b">${sp.sci}</div>
              <div style="font-size:16px;color:${sp.badgeTxt};margin-top:5px;font-weight:600">${sp.note}</div>
              ${HLX_FISH_EVIDENCE_NOTES[sp.name] ? `<div style="font-size:15px;line-height:1.65;color:#334155;background:#ffffffaa;border-left:3px solid ${sp.topCol};padding:8px 10px;margin-top:9px;border-radius:6px"><strong>資料核對：</strong>${HLX_FISH_EVIDENCE_NOTES[sp.name]}</div>` : ''}
            </div>
            <div style="padding:12px 14px">
              <div style="position:relative;height:188px">
                <canvas id="${sp.id}"></canvas>
              </div>
              <div style="font-size:14px;color:#64748b;margin-top:6px;line-height:1.5">柱：實測尾數　線：CPUE（尾／次）</div>
              <div id="${sp.id}_nodata" style="display:none;text-align:center;padding:20px;color:#94a3b8;font-size:17px">
                <i class="fas fa-chart-bar" style="font-size:24px;margin-bottom:8px;display:block"></i>尚無足夠調查記錄
              </div>
            </div>
          </div>
        `).join('')}
      </div>
      <div style="margin-top:14px;padding:18px 22px;background:#f8fafc;border-radius:10px;font-size:18px;color:#475569;line-height:1.85;border-left:4px solid #3b82f6">
        <strong>整合說明：</strong>上方堆疊柱狀圖已納入全8種發布魚類。107~108年度數據依據《107~108年度橫流溪整治規劃設計監造與監測調查委託技術服務案成果報告》表4-16完整補充4季調查（107年5月/7月、108年4月/10月）。
        各次要物種首次記錄：短臀瘋鱨（107年5月，1尾）；短吻紅斑吻鰕虎（107年7月，2尾）。108年4月族群最豐，短吻紅斑吻鰕虎達6尾、短臀瘋鱨達3尾；
        明潭吻鰕虎在108年4月達133尾（本序列單次最高）。103、106年低捕獲物種的0尾為量化序列未檢出；106年上游逐尾表因缺少個體與樣站對照，不以推估值補入。
      </div>

      <!-- 次要物種族群趨勢因素分析 -->
      <div style="margin-top:18px">
        <div style="font-size:22px;font-weight:800;color:#1e293b;margin-bottom:16px;display:flex;align-items:center;gap:8px">
          <i class="fas fa-microscope" style="color:#6366f1"></i> 次要3種族群趨勢・影響因素分析
        </div>

        <!-- 共通因素 -->
        <div style="background:#fefce8;border:1px solid #fde68a;border-left:4px solid #f59e0b;border-radius:10px;padding:14px 18px;margin-bottom:14px">
          <div style="font-size:20px;font-weight:700;color:#92400e;margin-bottom:12px"><i class="fas fa-layer-group" style="margin-right:6px"></i>共通影響因素</div>
          <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:10px;font-size:18px;color:#78350f">
            <div style="background:#fff8e1;border-radius:8px;padding:10px">
              <i class="fas fa-calendar-alt" style="color:#d97706;margin-right:5px"></i><strong>調查季節不固定</strong>
              <div style="margin-top:4px;color:#92400e">各年調查月份差異大（4月至10月），魚類活動與分布隨季節大幅波動，不同月份捕獲率難以直接比較</div>
            </div>
            <div style="background:#fff8e1;border-radius:8px;padding:10px">
              <i class="fas fa-fish" style="color:#0ea5e9;margin-right:5px"></i><strong>優勢種排擠效應</strong>
              <div style="margin-top:4px;color:#92400e">白甲魚佔全段電捕量60～70%，急速成長為優勢種後，對棲位及食物資源造成競爭壓縮</div>
            </div>
            <div style="background:#fff8e1;border-radius:8px;padding:10px">
              <i class="fas fa-chart-bar" style="color:#8b5cf6;margin-right:5px"></i><strong>樣本數偏低</strong>
              <div style="margin-top:4px;color:#92400e">次要4種每次合計不超過50尾，隨機誤差影響占比高，少量個體增減即造成比例大幅震盪</div>
            </div>
            <div style="background:#fff8e1;border-radius:8px;padding:10px">
              <i class="fas fa-hard-hat" style="color:#ef4444;margin-right:5px"></i><strong>魚道工程期擾動</strong>
              <div style="margin-top:4px;color:#92400e">109～111年魚道施工期底床擾動明顯，次要物種可能暫時離開調查區域，造成記錄空窗</div>
            </div>
          </div>
        </div>

        <!-- 各物種個別原因 -->
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:10px;margin-bottom:12px">

          <!-- 粗首馬口鱲 -->
          <div style="background:#fffbeb;border:1px solid #fde68a;border-left:4px solid #f59e0b;border-radius:10px;padding:12px 14px">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;flex-wrap:wrap">
              <div style="width:10px;height:10px;border-radius:50%;background:#f59e0b;flex-shrink:0"></div>
              <div style="font-size:20px;font-weight:800;color:#0f172a">粗首馬口鱲</div>
              <div style="font-size:17px;color:#64748b">107年30尾 → 112年3尾</div>
              <span style="background:#fef3c7;color:#b45309;border-radius:999px;padding:4px 12px;font-size:16px;font-weight:700;margin-left:auto">下降最顯著</span>
            </div>
            <ul style="margin:0;padding-left:18px;font-size:18px;color:#475569;line-height:1.9">
              <li><strong>急流棲地縮減：</strong>馬口鱲偏好急流砂礫底，工程施作後若底質淤積或流速趨緩，適棲地縮減</li>
              <li><strong>白甲魚食物競爭：</strong>兩者均在急流段底棲覓食，白甲魚個體較大且數量龐大，競爭力佔優</li>
              <li><strong>電捕捕獲率偏低：</strong>馬口鱲游速快，電捕時逃逸率高，數字可能低估實際族群量</li>
            </ul>
          </div>

          <!-- 明潭吻鰕虎 -->
          <div style="background:#eff6ff;border:1px solid #bfdbfe;border-left:4px solid #3b82f6;border-radius:10px;padding:12px 14px">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;flex-wrap:wrap">
              <div style="width:10px;height:10px;border-radius:50%;background:#3b82f6;flex-shrink:0"></div>
              <div style="font-size:20px;font-weight:800;color:#0f172a">明潭吻鰕虎</div>
              <div style="font-size:17px;color:#64748b">110年130尾 → 113年27尾</div>
              <span style="background:#dbeafe;color:#1d4ed8;border-radius:999px;padding:4px 12px;font-size:16px;font-weight:700;margin-left:auto">輕微下降</span>
            </div>
            <ul style="margin:0;padding-left:18px;font-size:18px;color:#475569;line-height:1.9">
              <li><strong>礫石縫隙棲地壓縮：</strong>鰕虎高度依賴礫石縫隙，水道整治若底床均一化（護坡或人工砌石），縫隙棲地減少</li>
              <li><strong>族群自然波動：</strong>小型底棲魚類年際變動本就較大，25尾仍屬正常監測範圍，並非警報性下降</li>
              <li><strong>4種中族群最穩健：</strong>累計317尾為次要4種中最多，整體族群仍屬健康</li>
            </ul>
          </div>

          <!-- 短吻紅斑吻鰕虎 -->
          <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-left:4px solid #059669;border-radius:10px;padding:12px 14px">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;flex-wrap:wrap">
              <div style="width:10px;height:10px;border-radius:50%;background:#059669;flex-shrink:0"></div>
              <div style="font-size:20px;font-weight:800;color:#0f172a">短吻紅斑吻鰕虎</div>
              <div style="font-size:17px;color:#64748b">108年2尾 → 113年1尾</div>
              <span style="background:#dcfce7;color:#166534;border-radius:999px;padding:4px 12px;font-size:16px;font-weight:700;margin-left:auto">IUCN近危</span>
            </div>
            <ul style="margin:0;padding-left:18px;font-size:18px;color:#475569;line-height:1.9">
              <li><strong>族群基數極小：</strong>天然密度本就低，調查區域內可能只有穩定的「維持性小族群」，個位數波動屬正常</li>
              <li><strong>水質水文要求嚴苛：</strong>偏好高溶氧、低濁度清澈急流，汛期後沉積物增加即不適定居</li>
              <li><strong>繁殖成效保守：</strong>繁殖速率較低，族群擴增緩慢，對棲地干擾敏感度高</li>
            </ul>
          </div>

          <!-- 短臀瘋鱨 -->
          <div style="background:#fef2f2;border:1px solid #fecaca;border-left:4px solid #dc2626;border-radius:10px;padding:12px 14px">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;flex-wrap:wrap">
              <div style="width:10px;height:10px;border-radius:50%;background:#dc2626;flex-shrink:0"></div>
              <div style="font-size:20px;font-weight:800;color:#0f172a">短臀瘋鱨</div>
              <div style="font-size:17px;color:#64748b">108年4尾 → 112年5尾</div>
              <span style="background:#fee2e2;color:#b91c1c;border-radius:999px;padding:4px 12px;font-size:16px;font-weight:700;margin-left:auto">第三級保育・易危</span>
            </div>
            <ul style="margin:0;padding-left:18px;font-size:18px;color:#475569;line-height:1.9">
              <li><strong>趨勢尚無法判定：</strong>目前僅2個有效數據點，統計上不足以判定真實趨勢走向，需更多調查年度</li>
              <li><strong>夜行底棲難以電捕：</strong>電捕法對夜行性底棲魚捕獲率低，實際族群量可能被嚴重低估</li>
              <li><strong>建議加強夜間監測：</strong>保育第三級，應加入夜間蹲點目視計數，確認族群規模與繁殖成效</li>
            </ul>
          </div>
        </div>

        <!-- 監測建議 -->
        <div style="background:#f5f3ff;border:1px solid #ddd6fe;border-left:4px solid #8b5cf6;border-radius:10px;padding:18px 22px;font-size:18px;color:#4c1d95">
          <div style="font-weight:700;margin-bottom:12px;font-size:21px"><i class="fas fa-lightbulb" style="color:#7c3aed;margin-right:6px"></i>後續監測建議</div>
          <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:12px;color:#5b21b6;line-height:1.85">
            <div>📅 <strong>固定調查時間：</strong>春季（5月）＋秋季（10月），確保年度間數據可比性</div>
            <div>🌙 <strong>夜間補充調查：</strong>對鰕虎科與短臀瘋鱨加入夜間蹲點觀察，補充電捕不足</div>
            <div>📍 <strong>設定固定樣區：</strong>減少站位差異對數據的影響，提高長期趨勢可靠度</div>
            <div>🔬 <strong>申請保育評估：</strong>短臀瘋鱨第三級保育，建議申請緊急族群規模正式評估</div>
          </div>
        </div>
      </div>
    </div>

  </div>`;

  // ── Chart.js 圖表初始化 ──────────────────────────────────────────────────
  const labels = SURVEYS.map(s => s.label.replace('\n',' '));
  const colors = { bai:'#0ea5e9', shi:'#f97316', xu:'#a855f7', ying:'#22c55e', jian:'#f43f5e', min:'#3b82f6', kou:'#f59e0b', feng:'#dc2626', hong:'#059669' };

  // 0. 生態監測儀表板圖表
  setTimeout(hlxEco_drawMonitorCharts, 60);

  // 1. 堆疊柱狀圖
  setTimeout(() => {
    const ctxBar = document.getElementById('fishTrendBar');
    if (!ctxBar || typeof Chart === 'undefined') return;
    new Chart(ctxBar, {
      type: 'bar',
      data: {
        labels,
        datasets: SPECIES.map(sp => ({
          label: sp.name,
          data: SURVEYS.map(s => s[sp.key]),
          backgroundColor: sp.color + 'cc',
          borderColor: sp.color,
          borderWidth: 1,
          borderRadius: 3,
        }))
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { position:'top', labels:{ font:{size:15, weight:'600'}, padding:18 } },
          tooltip: {
            callbacks: {
              afterBody(ctx) { const total = ctx.reduce((s,c)=>s+(c.raw||0),0); return [`合計：${total} 尾`]; }
            }
          }
        },
        scales: {
          x: { stacked:true, ticks:{ font:{size:13}, maxRotation:50 } },
          y: { stacked:true, title:{ display:true, text:'捕獲尾數', font:{size:14} }, ticks:{ font:{size:13} } }
        }
      }
    });

    // 2. 臺灣白甲魚趨勢折線
    const ctxLine = document.getElementById('fishTrendLine');
    if (ctxLine) {
      new Chart(ctxLine, {
        type: 'line',
        data: {
          labels,
          datasets: [
            {
              label: '臺灣白甲魚',
              data: SURVEYS.map(s => s.bai),
              borderColor: '#0ea5e9', backgroundColor: '#0ea5e933',
              borderWidth: 2.5, pointRadius: 5, pointBackgroundColor: '#0ea5e9',
              fill: true, tension: 0.3
            },
            {
              label: '全物種合計',
              data: SURVEYS.map(s => s.total),
              borderColor: '#64748b', backgroundColor: 'transparent',
              borderWidth: 1.5, borderDash: [6,4], pointRadius: 3,
              fill: false, tension: 0.3
            }
          ]
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend:{ position:'top', labels:{ font:{size:15, weight:'600'}, padding:16 } } },
          scales: {
            x: { ticks:{ font:{size:13}, maxRotation:50 } },
            y: { title:{ display:true, text:'捕獲尾數', font:{size:14} }, beginAtZero:true, ticks:{ font:{size:13} } }
          }
        }
      });
    }

    // 3. Shannon H' 多樣性 ── 年度合計計算（先加總各年所有場次，再算H'）
    // 比場次平均更能反映長期趨勢；避免調查站次強度不同造成的視覺干擾
    const ctxDiv = document.getElementById('fishDiversityChart');
    if (ctxDiv) {
      const SP_KEYS = ['bai','shi','xu','ying','jian','min','feng','hong'];
      // 年度合計
      const annTotals = {};
      SURVEYS.forEach(s => {
        if (!annTotals[s.year]) annTotals[s.year] = Object.fromEntries(SP_KEYS.map(k=>[k,0]));
        SP_KEYS.forEach(k => { annTotals[s.year][k] += (s[k] || 0); });
      });
      const annYears = Object.keys(annTotals).map(Number).sort((a,b)=>a-b);
      const annLabels = annYears.map(yr => `${yr-1911}年`);
      const annH = annYears.map(yr => {
        const t = annTotals[yr];
        const counts = SP_KEYS.map(k=>t[k]).filter(v=>v>0);
        const N = counts.reduce((a,b)=>a+b,0);
        if (N === 0 || counts.length < 2) return counts.length === 1 ? 0 : null;
        return parseFloat((-counts.reduce((sum,v)=>{ const p=v/N; return sum+p*Math.log(p); },0)).toFixed(2));
      });
      const annRichness = annYears.map(yr =>
        SP_KEYS.filter(k=>(annTotals[yr][k]||0)>0).length
      );
      new Chart(ctxDiv, {
        type: 'bar',
        data: {
          labels: annLabels,
          datasets: [
            {
              label: "H' 年度合計（平台重算）",
              data: annH,
              backgroundColor: annH.map(h => !Number.isFinite(h) ? '#cbd5e188'
                : h >= 1.5 ? '#4ade8066' : h >= 0.8 ? '#fbbf2466' : '#f87171aa'),
              borderColor: annH.map(h => !Number.isFinite(h) ? '#94a3b8'
                : h >= 1.5 ? '#22c55e' : h >= 0.8 ? '#f59e0b' : '#ef4444'),
              borderWidth: 2, borderRadius: 6, order: 2,
              yAxisID: 'y',
            },
            {
              label: '物種數',
              data: annRichness,
              type: 'line',
              borderColor: '#7c3aed',
              backgroundColor: '#7c3aed22',
              borderWidth: 2.5,
              pointRadius: 5,
              pointHoverRadius: 8,
              pointBackgroundColor: '#7c3aed',
              tension: 0.35,
              fill: false,
              order: 1,
              yAxisID: 'y2',
            }
          ]
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: {
            legend:{ display:true, position:'top', labels:{ font:{size:12}, boxWidth:14 } },
            tooltip: {
              callbacks: {
                label: ctx => {
                  if (ctx.datasetIndex === 0) return Number.isFinite(ctx.raw) ? `H′：${ctx.raw}（平台依年度物種尾數重算）` : '資料不足';
                  return `物種數：${ctx.raw} 種`;
                }
              }
            }
          },
          scales: {
            x: { ticks:{ font:{size:13} } },
            y: { min:0, max:2.3, position:'left',
                 title:{ display:true, text:"H' (年度合計)", font:{size:12} },
                 ticks:{ stepSize:0.5 } },
            y2: { min:0, max:10, position:'right', grid:{ drawOnChartArea:false },
                  title:{ display:true, text:'物種數', font:{size:12} },
                  ticks:{ stepSize:2, color:'#7c3aed' } }
          }
        }
      });
    }

    // 4. 114年物種組成圓餅
    const ctxPie = document.getElementById('fishPieChart');
    if (ctxPie) {
      const latest = SURVEYS.filter(s => s.year === 2025);
      const aggr = { bai:0, shi:0, xu:0, ying:0, jian:0 };
      latest.forEach(s => { SPECIES.forEach(sp => { aggr[sp.key] += s[sp.key]; }); });
      new Chart(ctxPie, {
        type: 'doughnut',
        data: {
          labels: SPECIES.map(sp => sp.name),
          datasets: [{
            data: SPECIES.map(sp => aggr[sp.key]),
            backgroundColor: SPECIES.map(sp => sp.color + 'cc'),
            borderColor: SPECIES.map(sp => sp.color),
            borderWidth: 2
          }]
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: {
            legend: { display:false },
            tooltip: { callbacks: {
              label(ctx) { const t=ctx.dataset.data.reduce((a,b)=>a+b,0); return `${ctx.label}: ${ctx.raw}尾 (${((ctx.raw/t)*100).toFixed(1)}%)`; }
            }}
          }
        }
      });
    }

    // 5. 各種魚道型式關聯魚類趨勢圖
    const fishwayLabels = annualFishwaySeries.map(row => row.label);
    const ctxFishwayType = document.getElementById('fishwayTypeTrend');
    if (ctxFishwayType) {
      const fishwayChartDatasets = FISHWAY_TYPES.flatMap((fw, fishwayIndex) => {
        const observed = fishwayBaselineMultiple(fw);
        const rawCpue = fishwayTargetCPUE(fw);
        const trend = fitSmoothedTrend(observed);
        return [
          {
            label: fw.name,
            data: observed,
            borderColor: fw.color,
            backgroundColor: fw.color + '22',
            borderWidth: fw.key === 'submerged' ? 4 : 3,
            pointRadius: 4,
            pointHoverRadius: 8,
            pointBackgroundColor: fw.color,
            tension: 0.32,
            fill: false,
            fishwayIndex,
            isTrend: false
          },
          {
            label: `${fw.name}（趨勢線）`,
            data: trend.fitted,
            borderColor: fw.color,
            backgroundColor: 'transparent',
            borderWidth: 2,
            borderDash: [8, 5],
            pointRadius: 0,
            pointHoverRadius: 0,
            tension: 0.4,
            fill: false,
            fishwayIndex,
            isTrend: true
          }
        ];
      });
      new Chart(ctxFishwayType, {
        type: 'line',
        data: {
          labels: fishwayLabels,
          datasets: fishwayChartDatasets
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          interaction: { mode: 'index', intersect: false },
          plugins: {
            legend: {
              position: 'bottom',
              labels: {
                boxWidth: 14,
                padding: 14,
                font: { size: 13, weight: '700' },
                filter: item => !fishwayChartDatasets[item.datasetIndex]?.isTrend
              }
            },
            tooltip: {
              titleFont: { size: 14, weight: '700' },
              bodyFont: { size: 14 },
              padding: 12,
              callbacks: {
                label(ctx) {
                  return `${ctx.dataset.label}：建置前基線的 ${ctx.parsed.y} 倍`;
                },
                afterLabel(ctx) {
                  if (ctx.dataset.isTrend) return '';
                  const fw = FISHWAY_TYPES[ctx.dataset.fishwayIndex];
                  const m = annualEffortMetrics[ctx.dataIndex];
                  const raw = fishwayTargetTotals(fw)[ctx.dataIndex];
                  const observedCpue = fishwayTargetCPUE(fw)[ctx.dataIndex];
                  const base = fishwayBaseline(fw);
                  return `該年實測 ${observedCpue} 尾／次\n建置前基線 ${base.toFixed(1)} 尾／次（103・104・106年平均）\n關聯物種：${fishwayTargetNames(fw)}\n原始捕獲 ${raw} 尾 ÷ ${m?.effort || '?'} 站次`;
                }
              }
            }
          },
          scales: {
            x: { ticks: { font: { size: 13, weight: '700' } } },
            y: {
              beginAtZero: true,
              ticks: {
                font: { size: 13, weight: '700' },
                callback: v => v === 1 ? '1.0 建置前基線' : v + '×'
              },
              title: { display: true, text: '相對魚道建置前基線的倍數', font: { size: 14, weight: '700' } },
              grid: {
                color: c => (c.tick && Math.abs(c.tick.value - 1) < 1e-9) ? '#b45309' : 'rgba(0,0,0,0.06)',
                lineWidth: c => (c.tick && Math.abs(c.tick.value - 1) < 1e-9) ? 2 : 1
              }
            }
          }
        }
      });
    }

    // ── 努力量校正後趨勢：CPUE（尾／次）與物種數 ──
    const _effLabels = annualEffortMetrics.map(m => m.label);
    const ctxCpue = document.getElementById('fishCpueTrend');
    if (ctxCpue && typeof annualEffortMetrics !== 'undefined') {
      new Chart(ctxCpue, {
        type: 'line',
        data: {
          labels: _effLabels,
          datasets: [
            {
              label: '年度實測 CPUE',
              data: annualEffortMetrics.map(m => m.cpue),
              borderColor: '#14b8a6', backgroundColor: '#14b8a622',
              borderWidth: 2.5, pointRadius: 5, pointHoverRadius: 8,
              pointBackgroundColor: '#14b8a6', tension: 0.2, fill: false, yAxisID: 'y'
            },
            {
              label: 'CPUE 長期線性趨勢',
              data: cpueFit.fitted,
              borderColor: '#166534', backgroundColor: 'transparent',
              borderWidth: 5, pointRadius: 0, pointHoverRadius: 0,
              tension: 0, fill: false, yAxisID: 'y'
            },
            {
              label: '原始總捕獲（受努力量影響）',
              data: annualEffortMetrics.map(m => m.catch),
              borderColor: '#cbd5e1', backgroundColor: 'transparent',
              borderWidth: 2, borderDash: [5, 4], pointRadius: 3,
              pointBackgroundColor: '#cbd5e1', tension: 0.32, fill: false, yAxisID: 'y1'
            }
          ]
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          interaction: { mode: 'index', intersect: false },
          plugins: {
            legend: { position: 'bottom', labels: { boxWidth: 14, padding: 10, font: { size: 12, weight: '700' } } },
            tooltip: {
              callbacks: {
                afterBody(items) {
                  const m = annualEffortMetrics[items[0].dataIndex];
                  return `站訪次：${m.effort}　調查場次：${m.surveys}　物種數：${m.richness}`;
                }
              }
            }
          },
          scales: {
            x: { ticks: { font: { size: 12, weight: '700' } } },
            y: { beginAtZero: true, position: 'left', title: { display: true, text: 'CPUE（尾／次）', color: '#047857', font: { size: 12, weight: '700' } }, ticks: { color: '#047857' } },
            y1: { beginAtZero: true, position: 'right', grid: { drawOnChartArea: false }, title: { display: true, text: '原始總捕獲', color: '#94a3b8', font: { size: 11 } }, ticks: { color: '#94a3b8' } }
          }
        }
      });
    }
    const ctxRich = document.getElementById('fishRichnessTrend');
    if (ctxRich && typeof annualEffortMetrics !== 'undefined') {
      new Chart(ctxRich, {
        type: 'bar',
        data: {
          labels: _effLabels,
          datasets: [{
            label: '年度出現物種數',
            data: annualEffortMetrics.map(m => m.richness),
            backgroundColor: annualEffortMetrics.map(m =>
              Number(m.year) <= 2016 ? '#fca5a5' : Number(m.year) === 2020 ? '#fdba74' : '#3b82f6'),
            borderRadius: 5, maxBarThickness: 38
          }]
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                afterLabel(ctx) {
                  const m = annualEffortMetrics[ctx.dataIndex];
                  return `站訪次：${m.effort}　CPUE：${m.cpue}`;
                }
              }
            }
          },
          scales: {
            x: { ticks: { font: { size: 12, weight: '700' } } },
            y: { beginAtZero: true, ticks: { stepSize: 1, font: { size: 12, weight: '700' } }, title: { display: true, text: '物種數', font: { size: 12, weight: '700' } } }
          }
        }
      });
    }


    // ── 魚道生態成效實證：三張新圖 ─────────────────────────────────
    const _gridCfg = { color:'#eef2f6' };
    const _tick = { font:{ size:11 }, color:'#64748b' };

    const ctxInWay = document.getElementById('fishInFishwayChart');
    if (ctxInWay) new Chart(ctxInWay, {
      type: 'bar',
      data: {
        labels: HLX_IN_FISHWAY_CATCH.byFishway.map(f => f.id),
        datasets: [{
          label: '魚道內平均捕獲（尾／次）',
          data: HLX_IN_FISHWAY_CATCH.byFishway.map(f => +(f.total / HLX_IN_FISHWAY_CATCH.surveyRounds).toFixed(1)),
          backgroundColor: HLX_IN_FISHWAY_CATCH.byFishway.map(f => f.total === 76 ? '#0d6b5b' : '#2a78d6'),
          borderRadius: 4, borderWidth: 0,
        }]
      },
      options: {
        responsive:true, maintainAspectRatio:false,
        plugins:{
          legend:{ display:false },
          tooltip:{ callbacks:{
            title: it => { const f = HLX_IN_FISHWAY_CATCH.byFishway[it[0].dataIndex]; return `${f.id}（${f.type}魚道）`; },
            label: c => {
              const f = HLX_IN_FISHWAY_CATCH.byFishway[c.dataIndex];
              return `平均 ${c.raw} 尾／次（四輪累計 ${f.total} 尾）`;
            },
            afterBody: () => ['4 次捕捉：109/7、109/10、110/7、110/10', '於魚道內部直接量測，非全溪換算'],
          }}
        },
        scales:{
          y:{ beginAtZero:true, grid:_gridCfg, ticks:_tick, title:{ display:true, text:'尾／次（四輪平均）', font:{size:11}, color:'#94a3b8' } },
          x:{ grid:{ display:false }, ticks:{ ..._tick, callback(v, i) {
            const f = HLX_IN_FISHWAY_CATCH.byFishway[i]; return [f.id, f.type];
          } } }
        }
      }
    });

    const ctxThreat = document.getElementById('fishThreatenedChart');
    if (ctxThreat) new Chart(ctxThreat, {
      type: 'bar',
      data: {
        labels: threatenedCPUE.map(t => t.label),
        datasets: [{
          label:'受脅魚種 CPUE',
          data: threatenedCPUE.map(t => t.cpue),
          backgroundColor: threatenedCPUE.map(t => {
            const pre = HLX_FISH_SURVEYS.some(x => Number(x.year) === Number(t.year) && x.preConstruct);
            const best = t.cpue === Math.max(...threatenedCPUE.map(z => z.cpue));
            return best ? '#0d6b5b' : (pre ? '#cde2fb' : '#2a78d6');
          }),
          borderColor: threatenedCPUE.map(t =>
            HLX_FISH_SURVEYS.some(x => Number(x.year) === Number(t.year) && x.preConstruct) ? '#2a78d6' : 'transparent'),
          borderWidth: 1, borderRadius: 4,
        }]
      },
      options: {
        responsive:true, maintainAspectRatio:false,
        plugins:{
          legend:{ display:false },
          tooltip:{ callbacks:{
            label: c => `${c.raw} 尾／次`,
            afterBody: it => { const t = threatenedCPUE[it[0].dataIndex];
              return [`受脅種捕獲 ${t.total} 尾／次 ${annualMetricByYear[t.year]?.effort}`,
                      `當年檢出受脅種 ${t.species}/4 種`]; },
          }}
        },
        scales:{
          y:{ beginAtZero:true, grid:_gridCfg, ticks:_tick, title:{ display:true, text:'尾／次', font:{size:11}, color:'#94a3b8' } },
          x:{ grid:{ display:false }, ticks:{ ..._tick, callback(v, i) {
            const t = threatenedCPUE[i]; return [t.label, t.species + '種'];
          } } }
        }
      }
    });

    const ctxRare = document.getElementById('fishRarefiedChart');
    const _rare = rarefied.filter(r => r.E != null);
    if (ctxRare && _rare.length) {
      // 誤差線以自訂 plugin 疊繪（Chart.js 原生 bar 無 error bar）
      const errBars = {
        id: 'hlxErrorBars',
        afterDatasetsDraw(chart) {
          const { ctx, scales:{ y } } = chart;
          const meta = chart.getDatasetMeta(0);
          ctx.save(); ctx.strokeStyle = '#475569'; ctx.lineWidth = 1.5;
          meta.data.forEach((bar, i) => {
            const r = _rare[i]; if (!r || r.sd == null) return;
            const top = y.getPixelForValue(r.E + r.sd), bot = y.getPixelForValue(Math.max(0, r.E - r.sd));
            ctx.beginPath();
            ctx.moveTo(bar.x, top); ctx.lineTo(bar.x, bot);
            ctx.moveTo(bar.x - 5, top); ctx.lineTo(bar.x + 5, top);
            ctx.moveTo(bar.x - 5, bot); ctx.lineTo(bar.x + 5, bot);
            ctx.stroke();
          });
          ctx.restore();
        }
      };
      new Chart(ctxRare, {
        type:'bar',
        data:{ labels:_rare.map(r => r.label),
          datasets:[{ label:'E[S100]', data:_rare.map(r => r.E), borderRadius:4, borderWidth:0,
            backgroundColor:_rare.map(r => r.E === Math.max(..._rare.map(z => z.E)) ? '#0d6b5b' : '#2a78d6') }] },
        options:{
          responsive:true, maintainAspectRatio:false,
          plugins:{ legend:{ display:false },
            tooltip:{ callbacks:{
              label: c => `E[S${RAREFY_N}] = ${c.raw} ± ${_rare[c.dataIndex].sd}`,
              afterBody: it => { const r = _rare[it[0].dataIndex];
                return [`實際捕獲 ${r.catch} 尾／${r.effort} 站訪次`,
                        '＝統一抽樣至 ' + RAREFY_N + ' 尾時的期望物種數']; },
            }} },
          scales:{ y:{ beginAtZero:true, suggestedMax:8.5, grid:_gridCfg, ticks:_tick,
              title:{ display:true, text:'期望物種數', font:{size:11}, color:'#94a3b8' } },
            x:{ grid:{ display:false }, ticks:_tick } }
        },
        plugins:[errBars]
      });
    }

    FISHWAY_TYPES.forEach(fw => {
      const ctx = document.getElementById(`fishwayTrend_${fw.key}`);
      if (!ctx) return;
      // 堆疊長條：底層灰色＝白甲魚（共同上升基底）；上層彩色＝各型式特徵種（差異化）
      const charKeys = fw.targetKeys.filter(k => k !== 'bai');
      const charNames = charKeys.map(k => SPECIES.find(s => s.key === k)?.name || k).join('／');
      const baiCpue = annualFishwaySeries.map((row, i) => {
        const eff = annualEffortMetrics[i]?.effort || 0;
        return eff ? +((row.bai || 0) / eff).toFixed(1) : 0;
      });
      const charCpue = annualFishwaySeries.map((row, i) => {
        const eff = annualEffortMetrics[i]?.effort || 0;
        const sum = charKeys.reduce((s, k) => s + (row[k] || 0), 0);
        return eff ? +(sum / eff).toFixed(1) : 0;
      });
      const totalCpue = baiCpue.map((b, i) => +(b + charCpue[i]).toFixed(1));
      const raws = fishwayTargetTotals(fw);
      const lastIdx = baiCpue.length - 1;
      new Chart(ctx, {
        type: 'bar',
        data: {
          labels: fishwayLabels,
          datasets: [
            {
              label: '臺灣白甲魚',
              data: baiCpue,
              backgroundColor: baiCpue.map((v, i) => i === lastIdx ? 'rgba(148,163,184,0.72)' : 'rgba(148,163,184,0.40)'),
              borderColor: 'rgba(148,163,184,0.55)',
              borderWidth: 1,
              borderRadius: 0,
              stack: 'cpue'
            },
            {
              label: charNames,
              data: charCpue,
              backgroundColor: charCpue.map((v, i) => i === lastIdx ? fw.color + 'dd' : fw.color + '77'),
              borderColor: fw.color,
              borderWidth: 2,
              borderRadius: 6,
              stack: 'cpue'
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: true,
              position: 'top',
              labels: { font: { size: 11 }, padding: 6, usePointStyle: true, pointStyleWidth: 8, boxWidth: 10, boxHeight: 10 }
            },
            tooltip: {
              titleFont: { size: 13, weight: '700' },
              bodyFont: { size: 13 },
              padding: 12,
              callbacks: {
                label(c) { return `${c.dataset.label}: ${c.parsed.y} 尾／次`; },
                footer(items) {
                  const i = items[0].dataIndex;
                  const m = annualEffortMetrics[i];
                  return [`合計 ${totalCpue[i]} 尾／次`, `原始 ${raws[i]} 尾 ÷ ${m?.effort||'?'} 站`];
                }
              }
            }
          },
          scales: {
            x: { stacked: true, ticks: { font: { size: 12, weight: '700' }, maxRotation: 0 } },
            y: { stacked: true, beginAtZero: true, ticks: { font: { size: 12, weight: '700' } }, title: { display: true, text: 'CPUE', font: { size: 11, weight: '700' } } }
          }
        }
      });
    });

    // ── 次要物種個別趨勢圖：與卡片、詳情共用已核對量化序列 ──
    const _secMeta = {
      '明潭吻鰕虎':     { key: 'min',  color: '#2563eb' },
      '短臀瘋鱨':       { key: 'feng', color: '#dc2626' },
      '短吻紅斑吻鰕虎': { key: 'hong', color: '#059669' }
    };
    Object.entries(_secMeta).forEach(([spName, meta]) => {
      const recs = fish_annualSpeciesSeries(spName);
      const canvasEl = document.getElementById(`spTrend_${spName}`);
      const noDataEl = document.getElementById(`spTrend_${spName}_nodata`);
      if (!canvasEl) return;
      // 固定顯示103-114年全12年，未調查年份補0
      const ALL_SP_YEARS = [2014,2015,2016,2017,2018,2019,2020,2021,2022,2023,2024,2025];
      const recMap = new Map((recs || []).map(r => [Number(r.year), r]));
      const rLabels = ALL_SP_YEARS.map(yr => `${yr - 1911}年`);
      const rData = ALL_SP_YEARS.map(yr => { const r = recMap.get(yr); return r ? (Number(r.count) || 0) : 0; });
      const cpueData = speciesAnnualCPUE(meta.key, ALL_SP_YEARS);
      const col = meta.color;
      const bgColors = ALL_SP_YEARS.map(yr => {
        const r = recMap.get(yr);
        if (!r) return '#e2e8f022';  // 無調查（105年）
        return r.count > 0 ? col + 'bb' : '#cbd5e166';
      });
      const bdColors = ALL_SP_YEARS.map(yr => {
        const r = recMap.get(yr);
        if (!r) return '#94a3b855';
        return r.count > 0 ? col : '#94a3b8';
      });
      const existChart = Chart.getChart ? Chart.getChart(canvasEl) : null;
      if (existChart) existChart.destroy();
      new Chart(canvasEl, {
        type: 'bar',
        data: {
          labels: rLabels,
          datasets: [
            {
              type: 'bar', label: '實測尾數', data: rData,
              backgroundColor: bgColors, borderColor: bdColors,
              borderWidth: 2, borderRadius: 6, minBarLength: 4, yAxisID: 'y'
            },
            {
              type: 'line', label: 'CPUE（尾／次）', data: cpueData,
              borderColor: '#0f766e', backgroundColor: 'transparent',
              borderWidth: 2.5, pointRadius: 3.5, pointBackgroundColor: '#0f766e',
              tension: 0.28, spanGaps: false, yAxisID: 'y1'
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: true, position: 'bottom', labels: { boxWidth: 10, padding: 8, font: { size: 10, weight: '700' } } },
            tooltip: {
              callbacks: {
                label: ctx => {
                  const yr = ALL_SP_YEARS[ctx.dataIndex];
                  if (ctx.dataset.yAxisID === 'y1') return ctx.raw === null ? '無站訪次，未計算 CPUE' : `CPUE：${ctx.raw} 尾／次`;
                  if (!recMap.has(yr)) return '無調查紀錄（105年空白）';
                  return ctx.raw > 0 ? `${ctx.raw} 尾` : '0 尾（該年度量化序列未檢出）';
                },
                afterLabel: ctx => {
                  const metric = annualMetricByYear[ALL_SP_YEARS[ctx.dataIndex]];
                  const row = recMap.get(ALL_SP_YEARS[ctx.dataIndex]);
                  return [
                    metric ? `年度站訪次：${metric.effort}；年度調查場次：${metric.surveys}` : '無站訪次紀錄',
                    row ? `物種調查 ${row.surveys} 次，其中 ${row.captures} 次捕獲` : '',
                    row?.source ? `來源：${row.source}` : ''
                  ].filter(Boolean);
                }
              }
            }
          },
          scales: {
            x: { ticks: { font: { size: 11, weight: '600' }, maxRotation: 45 } },
            y: { beginAtZero: true, ticks: { font: { size: 12 } }, title: { display: true, text: '尾數', font: { size: 12 } } },
            y1: { beginAtZero: true, position: 'right', grid: { drawOnChartArea: false }, ticks: { color: '#0f766e', font: { size: 11 } }, title: { display: true, text: 'CPUE', color: '#0f766e', font: { size: 11, weight: '700' } } }
          }
        }
      });
    });

    // ── 5 種長期指標種年度合計迷你圖（從 annualFishwaySeries）──
    const _mainSpMeta = {
      '臺灣白甲魚':   { key:'bai',  color:'#0ea5e9' },
      '臺灣石魚賓':   { key:'shi',  color:'#f97316' },
      '臺灣鬚鱲':     { key:'xu',   color:'#a855f7' },
      '纓口臺鰍':     { key:'ying', color:'#22c55e' },
      '臺灣間爬岩鰍': { key:'jian', color:'#f43f5e' },
    };
    Object.entries(_mainSpMeta).forEach(([spName, {key, color}]) => {
      const canvasEl = document.getElementById(`spTrend_${spName}`);
      if (!canvasEl) return;
      const existChart = Chart.getChart ? Chart.getChart(canvasEl) : null;
      if (existChart) existChart.destroy();
      const mLabels = annualFishwaySeries.map(r => r.label);
      const mData   = annualFishwaySeries.map(r => r[key] || 0);
      const mCpue   = speciesAnnualCPUE(key, annualFishwaySeries.map(r => r.year));
      new Chart(canvasEl, {
        type: 'bar',
        data: {
          labels: mLabels,
          datasets: [
            { type: 'bar', label: '實測尾數', data: mData, backgroundColor: color + 'bb', borderColor: color, borderWidth: 2, borderRadius: 6, yAxisID: 'y' },
            { type: 'line', label: 'CPUE（尾／次）', data: mCpue, borderColor: '#0f766e', borderWidth: 2.5, pointRadius: 3.5, pointBackgroundColor: '#0f766e', tension: 0.28, yAxisID: 'y1' }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: true, position: 'bottom', labels: { boxWidth: 10, padding: 8, font: { size: 10, weight: '700' } } },
            tooltip: { callbacks: {
              label: ctx => ctx.dataset.yAxisID === 'y1' ? `CPUE：${ctx.raw} 尾／次` : `${ctx.raw} 尾（年度合計）`,
              afterLabel: ctx => { const m = annualEffortMetrics[ctx.dataIndex]; return m ? `年度站訪次：${m.effort}；調查場次：${m.surveys}` : ''; }
            } }
          },
          scales: {
            x: { ticks: { font: { size: 12, weight: '600' }, maxRotation: 40 } },
            y: { beginAtZero: true, ticks: { font: { size: 12 } }, title: { display: true, text: '尾數', font: { size: 12 } } },
            y1: { beginAtZero: true, position: 'right', grid: { drawOnChartArea: false }, ticks: { color: '#0f766e', font: { size: 11 } }, title: { display: true, text: 'CPUE', color: '#0f766e', font: { size: 11, weight: '700' } } }
          }
        }
      });
    });

  }, 100);
}

function openFishwayTrendModal(key = 'all') {
  const payload = window.hlxFishwayTrendPayload;
  if (!payload || !Array.isArray(payload.fishwayTypes) || !Array.isArray(payload.annualFishwaySeries)) return;

  const fishwayTypes = payload.fishwayTypes;
  const series = payload.annualFishwaySeries;
  const speciesNames = {
    bai: '臺灣白甲魚',
    shi: '臺灣石魚賓',
    xu: '臺灣鬚鱲',
    ying: '纓口臺鰍',
    jian: '臺灣間爬岩鰍'
  };
  const effort = Array.isArray(payload.annualEffortMetrics) ? payload.annualEffortMetrics : [];
  const targetNames = fw => fw.targetKeys.map(k => speciesNames[k] || k).join('、');
  const targetTotals = fw => series.map(row => fw.targetKeys.reduce((sum, k) => sum + (row[k] || 0), 0));
  // CPUE（尾／次）：排除歷年調查站數差異
  const targetCPUE = fw => series.map((row, i) => {
    const sum = fw.targetKeys.reduce((s, k) => s + (row[k] || 0), 0);
    const eff = effort[i]?.effort || 0;
    return eff ? +(sum / eff).toFixed(1) : 0;
  });
  const labels = series.map(row => row.label);
  const fw = key === 'all' ? null : fishwayTypes.find(item => item.key === key);
  const title = fw ? `${fw.name} CPUE 歷年趨勢放大圖` : '各魚道型式關聯 CPUE 放大圖（努力量校正）';

  document.getElementById('modalTitle').innerHTML = `<span style="font-size:24px;font-weight:900;color:#0f172a">${title}</span>`;
  document.getElementById('modalBody').innerHTML = `
    <div style="font-size:16px;color:#475569;line-height:1.75;margin-bottom:16px">
      ${fw
        ? `${fw.facilities}｜${fw.station}｜關聯物種：${targetNames(fw)}`
        : '依魚道型式分組，以 CPUE（尾／次）呈現103～114年努力量校正後趨勢。'}
    </div>
    <div style="background:#ecfeff;border-left:5px solid ${fw ? fw.color : '#0e7490'};border-radius:12px;padding:14px 18px;margin-bottom:12px;font-size:15px;color:#334155;line-height:1.75">
      <b style="color:#0e7490">努力量校正（CPUE）：</b>數值＝關聯魚種捕獲量 ÷ 當年站訪次，已排除歷年調查站數差異（107~110年3~6站、111年5次單站為主、112年後1站）。回歸線僅描述長期方向；各型式數值是關聯物種的流域監測指標，並非逐座魚道直接過魚量。
    </div>
    <div style="background:#fff7ed;border:1.5px solid #fed7aa;border-radius:12px;padding:12px 16px;margin-bottom:18px;font-size:14px;color:#7c2d12;line-height:1.75">
      <b>109年下降判讀：</b>108年為4月、10月共8站訪次，捕獲893尾，CPUE 111.6；109年改為7月、9月共12站訪次，捕獲517尾，CPUE 43.1。109年仍有7種、H′ 1.63且最大優勢種約占24%，較符合季節、流況、樣站擴增、魚群空間分散與可捕獲率共同造成的密度下降，不支持直接判定為魚道失效。現有資料亦不足以把單一施工或極端事件列為唯一原因。<br>
      <b>111年高點判讀：</b>該年在下游高密度樣點的5次調查，年度CPUE顯著偏高；它保留為實測結果，但因樣站、季節與調查設計已與109～110年六站調查不同，不能單獨當作全溪族群或每一魚道的生態高峰。112～114年同為單站事件為主，CPUE由50.6、47.0回升至68.8尾／次，114年是這段可比較序列的最高值。
    </div>
    <div style="height:68vh;min-height:480px;border:1.5px solid #e2e8f0;border-radius:16px;padding:18px;background:#fff">
      <canvas id="fishwayTrendModalChart"></canvas>
    </div>
  `;
  document.getElementById('modalFooter').innerHTML = `
    <button class="btn btn-outline" onclick="closeModal()" style="font-size:15px;padding:10px 20px">關閉</button>
  `;
  const modal = document.getElementById('modal');
  if (modal) {
    modal.style.maxWidth = '96vw';
    modal.style.width = '96vw';
    modal.style.maxHeight = '94vh';
  }
  openModal();

  setTimeout(() => {
    const ctx = document.getElementById('fishwayTrendModalChart');
    if (!ctx || typeof Chart === 'undefined') return;
    if (fw) {
      const totals = targetCPUE(fw);
      new Chart(ctx, {
        type: 'bar',
        data: {
          labels,
          datasets: [{
            label: `${fw.name} CPUE（尾／次）`,
            data: totals,
            backgroundColor: totals.map((v, i) => i === totals.length - 1 ? fw.color + 'dd' : fw.color + '66'),
            borderColor: fw.color,
            borderWidth: 3,
            borderRadius: 8
          }]
        },
        options: fishwayLargeChartOptions(`關聯物種：${targetNames(fw)}（CPUE＝尾／次）`, 'bar')
      });
      return;
    }
    new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: fishwayTypes.map(item => ({
          label: item.name,
          data: targetCPUE(item),
          borderColor: item.color,
          backgroundColor: item.color + '22',
          borderWidth: item.key === 'submerged' ? 4 : 3,
          borderDash: item.key === 'submerged' ? [8, 5] : [],
          pointRadius: 6,
          pointHoverRadius: 9,
          pointBackgroundColor: item.color,
          tension: 0.32,
          fill: false
        }))
      },
      options: fishwayLargeChartOptions('', 'line', fishwayTypes, targetNames)
    });

  }, 80);
}

function fishwayLargeChartOptions(extraLabel = '', type = 'line', fishwayTypes = [], targetNames = null) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: {
        display: type === 'line',
        position: 'bottom',
        labels: { boxWidth: 16, padding: 16, font: { size: 16, weight: '700' } }
      },
      tooltip: {
        titleFont: { size: 16, weight: '700' },
        bodyFont: { size: 15 },
        footerFont: { size: 14 },
        padding: 14,
        callbacks: {
          afterLabel(ctx) {
            if (type === 'line' && targetNames) {
              const fw = fishwayTypes[ctx.datasetIndex];
              return `關聯物種：${targetNames(fw)}`;
            }
            return extraLabel || '';
          }
        }
      }
    },
    scales: {
      x: {
        ticks: {
          font: { size: 16, weight: '700' },
          color: context => String(context.tick?.label || '').includes('111年') ? '#b45309' : '#475569'
        }
      },
      y: {
        beginAtZero: true,
        ticks: { font: { size: 16, weight: '700' } },
        title: { display: true, text: 'CPUE（關聯魚種尾數/站訪次・努力量校正）', font: { size: 16, weight: '700' } }
      }
    }
  };
}

function renderFishBioMap() {
  const fishSpecies = Object.values(fish_groupSpecies());
  const facilities  = DB.getAll('facilities');
  const totalFish   = fishSpecies.reduce((s, x) => s + (Number(x.totalCount) || 0), 0);
  const protectedFish = fishSpecies.filter(x => x.conservation && x.conservation !== '一般').length;

  // destroy previous map instance so it can re-init cleanly
  if (biogisMap) { try { biogisMap.remove(); } catch(_) {} biogisMap = null; }

  document.getElementById('fishTabContent').innerHTML = `
    <div class="biomap-shell">

      <!-- ══ 頁面標題 ══ -->
      <div style="margin-bottom:20px">
        <div style="font-size:18px;color:#94a3b8;margin-bottom:4px">
          資料來源：東勢處水域友善監測追蹤報告 · 橫流溪魚類資料庫 · 112年6月植物調查
        </div>
        <h2 style="margin:0 0 4px;font-size:28px;font-weight:900;color:#0f172a;letter-spacing:-.5px">
          橫流溪陸域・水域生物分布圖
        </h2>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px">
          <span style="background:#dcfce7;color:#166534;border:1px solid #bbf7d0;border-radius:6px;padding:4px 12px;font-size:19px;font-weight:700"><i class="fas fa-mountain-sun"></i> 陸域生態 6 大類</span>
          <span style="background:#cffafe;color:#0e7490;border:1px solid #a5f3fc;border-radius:6px;padding:4px 12px;font-size:19px;font-weight:700"><i class="fas fa-water"></i> 水域生態 3 大類</span>
        </div>
      </div>

      <!-- ══ SECTION 1：生態概況統計 ══ -->
      ${bioSecHead('1','fa-chart-bar','生態概況統計','橫流溪場域生物多樣性總覽','#1e40af')}
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:12px;margin-bottom:28px">
        ${bioStat('濱溪植物', '90 種', '37 科，特有種 4', '#166534', '#dcfce7', 'fa-seedling')}
        ${bioStat('水棲昆蟲', '25+ 科', '水質：好～極好', '#854d0e', '#fef9c3', 'fa-bug')}
        ${bioStat('水域魚類', `${fishSpecies.length} 種`, `累計 ${totalFish} 尾次`, '#0e7490', '#cffafe', 'fa-fish')}
        ${bioStat('保育魚類', `${protectedFish} 種`, '含易危・近危', '#b91c1c', '#fee2e2', 'fa-shield-halved')}
        ${bioStat('工程設施', `${facilities.length} 座`, '魚道、防砂壩、固床工', '#1565c0', '#dbeafe', 'fa-hard-hat')}
      </div>

      <!-- ══ SECTION 2：互動地圖 ══ -->
      ${bioSecHead('2','fa-map-location-dot','陸域・水域 × 工程設施互動地圖','點擊地圖標記可查看物種與設施詳情','#0369a1')}
      <div class="card" style="margin-bottom:28px">
        <div class="card-header" style="flex-wrap:wrap;gap:8px;background:#f0f9ff;border-bottom:1px solid #bae6fd">
          <div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center">
            <span style="font-size:19px;font-weight:700;color:#0369a1;margin-right:6px">底圖：</span>
            <select id="bioBaseMapSel" onchange="biogisChangeBase(this.value)"
              style="padding:6px 12px;border:1px solid #bae6fd;border-radius:8px;font-size:19px;color:#0369a1;background:#fff">
              <option value="hybrid">🛰️ 衛星+地名</option>
              <option value="satellite">🛰️ 衛星影像</option>
              <option value="road">🗺️ 道路圖</option>
            </select>
            <span style="font-size:19px;font-weight:700;color:#0369a1;margin-left:8px">圖層：</span>
            ${biogisLayerToggle('facilities','hard-hat','#1565c0','工程設施')}
            ${biogisLayerToggle('landanimals','mountain-sun','#166634','陸域動物')}
            ${biogisLayerToggle('fishwayDist','fish','#0e7490','魚道魚種分布')}
          </div>
        </div>
        <div style="display:flex;align-items:stretch;border-radius:0 0 8px 8px;overflow:hidden;border-top:1px solid #e2e8f0">
          <!-- 地圖本體 -->
          <div style="flex:1;min-width:0">
            <div id="bioGISMap" style="height:580px"></div>
          </div>
          <!-- 整合圖例側欄 -->
          <div class="bio-legend-side">
            <!-- 標題 -->
            <div style="font-size:18px;font-weight:900;color:#0f172a;margin-bottom:16px;padding-bottom:10px;border-bottom:3px solid #e2e8f0;display:flex;align-items:center;gap:8px">
              <i class="fas fa-layer-group" style="color:#334155;font-size:18px"></i> 地圖圖例
            </div>

            <!-- ① 陸域動物 -->
            <div style="margin-bottom:20px">
              <div style="font-size:20px;font-weight:900;color:#166534;margin-bottom:10px;display:flex;align-items:center;gap:7px;border-bottom:3px solid #bbf7d0;padding-bottom:6px">
                <i class="fas fa-mountain-sun" style="font-size:19px"></i> 陸域動物
              </div>
              ${[
                ['fa-dove', '#1d4ed8','鳥　　類','藍腹鷳・翠鳥・鉛色水鶇'],
                ['fa-paw',  '#92400e','大型哺乳類','穿山甲・野山羊・食蟹獴'],
                ['fa-frog', '#0f766e','兩棲爬蟲','蛙類・蜥蜴類'],
                ['fa-bug',  '#854d0e','水棲昆蟲','魚蛉・石蠅・春蜓']
              ].map(([ic,col,name,sub])=>`
                <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px">
                  <div style="width:42px;height:42px;border-radius:50%;background:#fff;
                       border:3px solid ${col};display:flex;align-items:center;justify-content:center;
                       flex-shrink:0;box-shadow:0 2px 8px rgba(0,0,0,.18)">
                    <i class="fas ${ic}" style="color:${col};font-size:18px"></i>
                  </div>
                  <div>
                    <div style="font-size:19px;font-weight:800;color:#0f172a">${name}</div>
                    <div style="font-size:18px;color:#64748b;margin-top:2px;line-height:1.4">${sub}</div>
                  </div>
                </div>`).join('')}
            </div>

            <!-- ② 水域魚類 -->
            <div style="margin-bottom:20px">
              <div style="font-size:20px;font-weight:900;color:#0e7490;margin-bottom:10px;display:flex;align-items:center;gap:7px;border-bottom:3px solid #a5f3fc;padding-bottom:6px">
                <i class="fas fa-fish" style="font-size:19px"></i> 水域魚類
              </div>
              ${[
                ['carp',  '#dc2626','瀕　　危','本區調查魚種目前無瀕危紀錄'],
                ['minnow','#d97706','易　　危','短臀瘋鱨'],
                ['loach', '#2563eb','近　　危','臺灣白甲魚・纓口臺鰍・臺灣間爬岩鰍'],
                ['goby',  '#16a34a','一　　般','臺灣石魚賓・臺灣鬚鱲・明潭吻鰕虎・短吻紅斑吻鰕虎']
              ].map(([shape,col,tag,ex])=>`
                <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px">
                  <div style="width:44px;height:28px;flex-shrink:0;filter:drop-shadow(0 1px 3px rgba(0,0,0,.30))">
                    ${fish_speciesSvg(shape)}
                  </div>
                  <div>
                    <div style="font-size:19px;font-weight:800;color:${col}">${tag}</div>
                    <div style="font-size:18px;color:#64748b;margin-top:2px;line-height:1.4">${ex}</div>
                  </div>
                </div>`).join('')}
            </div>

            <!-- ③ 工程構造物 -->
            <div>
              <div style="font-size:20px;font-weight:900;color:#1565c0;margin-bottom:10px;display:flex;align-items:center;gap:7px;border-bottom:3px solid #bfdbfe;padding-bottom:6px">
                <i class="fas fa-hard-hat" style="font-size:19px"></i> 工程構造物
              </div>
              ${[
                ['#1565c0','fa-fish',        '魚道設施','之字形・階梯式・斜坡式'],
                ['#795548','fa-water',       '防砂壩',  '攔砂壩・固床工'],
                ['#827717','fa-layer-group', '固床工',  '階段式・粗石面'],
                ['#7c3aed','fa-vector-square','平台',   '維護・觀察・眺望平台'],
                ['#0f766e','fa-route',        '步道',   '溪濱步道 0K+000～1K+290']
              ].map(([col,ic,name,sub])=>`
                <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px">
                  <div style="width:42px;height:42px;border-radius:50%;background:${col};
                       display:flex;align-items:center;justify-content:center;
                       flex-shrink:0;box-shadow:0 2px 8px rgba(0,0,0,.22)">
                    <i class="fas ${ic}" style="color:#fff;font-size:18px"></i>
                  </div>
                  <div>
                    <div style="font-size:19px;font-weight:800;color:#0f172a">${name}</div>
                    <div style="font-size:18px;color:#64748b;margin-top:2px;line-height:1.4">${sub}</div>
                  </div>
                </div>`).join('')}
            </div>

          </div><!-- end bio-legend-side -->
        </div><!-- end map+legend flex -->
      </div><!-- end card -->

      <!-- ══ SECTION 3：陸域帶生物分布 ══ -->
      ${bioSecHead('3','fa-mountain-sun','陸域帶生物分布','豐林橋上下游各 200m 濱溪植被區・紅外線相機記錄','#166534')}
      <div class="card" style="margin-bottom:28px;border-top:4px solid #16a34a">
        <div class="card-body" style="padding:18px">
          <div class="biomap-org-grid">
            ${BIO_LAND_DATA.map(cat => bioCategoryBlock(cat, null)).join('')}
          </div>
        </div>
      </div>

      <!-- ══ SECTION 4：水域帶生物分布 ══ -->
      ${bioSecHead('4','fa-water','水域帶生物分布','橫流溪 0K+460 ～ 1K+400・魚道、深槽、緩流、淺瀨各棲地','#0369a1')}
      <div class="card" style="margin-bottom:28px;border-top:4px solid #0e7490">
        <div class="card-body" style="padding:18px">
          <div class="biomap-org-grid">
            ${BIO_WATER_DATA.map(cat => bioCategoryBlock(cat, fishSpecies)).join('')}
          </div>
        </div>
      </div>

      <!-- ══ SECTION 5：水域魚類清單 ══ -->
      ${bioSecHead('5','fa-fish','水域魚類清單','點擊任一列可展開詳細資訊・尾數反映歷年累計','#0e7490')}
      <div style="background:#ecfeff;border:1px solid #a5f3fc;border-left:4px solid #0e7490;border-radius:8px;padding:11px 14px;margin:0 0 12px;font-size:18px;color:#155e75;line-height:1.6">
        <i class="fas fa-circle-check" style="margin-right:5px"></i><b>資料統籌核對說明</b>：本清單「尾次」已與
        <b>歷年趨勢分析</b>統一，採已核對歷年電捕調查序列（103~114年・${HLX_FISH_SURVEY_EVENTS}個調查場次・成果報告表4-16／表5-3及111～114年調查表）逐筆合計，8種合計
        <b>${HLX_FISH_GRAND_TOTAL.toLocaleString()}</b> 尾次。
        例：臺灣間爬岩鰍完整累計 <b>${HLX_FISH_FULL_TOTALS['臺灣間爬岩鰍']}</b> 尾（已由同一調查序列逐筆合計，不再使用少數代表性快照推估）。
      </div>
      <div class="card" style="margin-top:0;border-top:4px solid #0284c7">
        <div class="card-header" style="background:#f0f9ff">
          <span class="card-title" style="font-size:18px"><i class="fas fa-fish" style="color:#0e7490"></i> 水域魚類清單（${fishSpecies.length} 種）</span>
          <span style="font-size:19px;color:#64748b">點擊列展開詳情</span>
        </div>
        <div class="card-body" style="padding:0">
          <table class="bio-table" style="width:100%;border-collapse:collapse;font-size:19px">
            <thead>
              <tr style="background:#f0f9ff;border-bottom:2px solid #bae6fd">
                <th style="padding:12px 16px;text-align:left;color:#0369a1;font-size:19px">物種</th>
                <th style="padding:12px 10px;text-align:center;color:#0369a1;font-size:19px">保育</th>
                <th style="padding:12px 10px;text-align:center;color:#0369a1;font-size:19px">尾次</th>
                <th style="padding:12px 10px;text-align:center;color:#0369a1;font-size:19px">位置</th>
                <th style="padding:12px 10px;text-align:center;color:#0369a1;font-size:19px">地圖</th>
                <th style="padding:12px 10px;text-align:center;color:#0369a1;font-size:19px">詳情</th>
              </tr>
            </thead>
            <tbody>
              ${fishSpecies.map((sp, i) => {
                const cMap = { '瀕危':['#fee2e2','#b91c1c'], '易危':['#fef9c3','#854d0e'], '近危':['#dbeafe','#1d4ed8'], '一般':['#dcfce7','#166534'] };
                const [cbg, ccl] = cMap[sp.conservation] || ['#f1f5f9','#475569'];
                const waterZone = fish_speciesZone(sp);
                const zoneLabel = { lower:'下游', middle:'中游', upper:'上游' }[waterZone] || '全域';
                const zoneLat = { lower:24.1780, middle:24.1825, upper:24.1855 }[waterZone] || 24.1815;
                const habitatHint = (sp.note||'').split('；').find(p=>p.includes('偏好')||p.includes('底質')||p.includes('深潭')||p.includes('急流')||p.includes('礫石')) || '';
                const rid = `bfr_${i}`;
                return `
                  <tr style="border-bottom:1px solid #e5e7eb;${i%2===1?'background:#fafcff':''}" onclick="bioFishRowToggle('${rid}')">
                    <td style="padding:12px 16px;font-weight:700;color:#0f172a">${fish_escape(sp.species)}</td>
                    <td style="padding:12px 10px;text-align:center">
                      <span style="background:${cbg};color:${ccl};padding:4px 10px;border-radius:999px;font-size:18px;font-weight:700">${fish_escape(sp.conservation)}</span>
                    </td>
                    <td style="padding:12px 10px;text-align:center;font-weight:800;font-size:17px;color:#0e7490">${sp.totalCount}</td>
                    <td style="padding:12px 10px;text-align:center">
                      <span style="background:#e0f2fe;color:#0369a1;padding:4px 10px;border-radius:999px;font-size:18px;font-weight:600">${zoneLabel}</span>
                    </td>
                    <td style="padding:12px 10px;text-align:center" onclick="event.stopPropagation()">
                      <button onclick="biogisLocate(${zoneLat},120.9092,'${fish_escape(sp.species)}')"
                        style="border:none;background:#0369a1;color:#fff;border-radius:8px;padding:6px 10px;font-size:18px;cursor:pointer">
                        <i class="fas fa-map-pin"></i>
                      </button>
                    </td>
                    <td style="padding:12px 10px;text-align:center">
                      <span id="${rid}_btn" style="color:#94a3b8;font-size:19px"><i class="fas fa-chevron-down"></i></span>
                    </td>
                  </tr>
                  <tr id="${rid}" style="display:none" class="bio-detail-row">
                    <td colspan="6" style="padding:14px 20px;background:#f8fafc;border-bottom:2px solid #e0f2fe">
                      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:10px;font-size:19px">
                        <div><span style="color:#64748b">學名：</span><em>${fish_escape(sp.scientificName||'-')}</em></div>
                        <div><span style="color:#64748b">科別：</span>${fish_escape(sp.family||'-')}</div>
                        <div><span style="color:#64748b">調查筆數：</span><b>${sp.surveys} 筆</b></div>
                        <div><span style="color:#64748b">位置：</span>${fish_escape(sp.location||'-')}</div>
                        ${habitatHint ? `<div style="grid-column:1/-1;color:#475569;border-left:3px solid #0e7490;padding-left:10px;line-height:1.6">${fish_escape(habitatHint)}</div>` : ''}
                        ${sp.note && sp.note !== habitatHint ? `<div style="grid-column:1/-1;font-size:18px;color:#64748b;line-height:1.6">${fish_escape(sp.note.split('；').slice(0,2).join('；'))}</div>` : ''}
                      </div>
                    </td>
                  </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <!-- ── SECTION 6：9種魚道通行成效彙整（110年電捕調查） ── -->
      <div class="card" style="margin-top:16px;border-top:4px solid #0369a1">
        <div class="card-header" style="background:#f0f9ff">
          <span class="card-title" style="font-size:17px">
            <i class="fas fa-route" style="color:#0369a1"></i>
            9種魚道通行與樣站電捕成效彙整（110年）
          </span>
          <span style="font-size:18px;color:#64748b">資料來源：110年東勢林區管理處國有林魚道及生態廊道成效追蹤報告</span>
        </div>
        <div class="card-body">

          <!-- 總量統計橫幅 -->
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:10px;margin-bottom:18px">
            ${[
              ['fa-fish','#0e7490','#cffafe','魚道通行尾數',`${HLX_FISH_110_SUMMARY.fishwayPassTotal} 尾`,'平台逐魚道彙整'],
              ['fa-table','#1d4ed8','#dbeafe','樣站電捕合計',`${HLX_FISH_110_SUMMARY.annualTotal} 尾`,'表5-3：4月486＋9月235'],
              ['fa-list-check','#dc2626','#fee2e2','表列通行魚類',`${HLX_FISH_110_SUMMARY.fishwayPassSpecies} 種`,'74尾通行紀錄'],
              ['fa-layer-group','#7c3aed','#ede9fe','魚道中捕捉',`${HLX_FISH_110_SUMMARY.fishwayCaptureSpecies}種 ${HLX_FISH_110_SUMMARY.fishwayCaptureTotal}尾`,'表5-19四次合計'],
              ['fa-route','#166534','#dcfce7','最長通行','710m+','白甲魚通行確認']
            ].map(([ic,col,bg,label,val,sub])=>`
              <div style="background:${bg};border-radius:10px;padding:14px 16px;text-align:center">
                <div style="font-size:20px;color:${col};margin-bottom:4px"><i class="fas ${ic}"></i></div>
                <div style="font-size:18px;color:#64748b">${label}</div>
                <div style="font-size:19px;font-weight:800;color:${col};line-height:1.2">${val}</div>
                <div style="font-size:20px;color:#94a3b8;margin-top:2px">${sub}</div>
              </div>
            `).join('')}
          </div>

          <div style="background:#fff7ed;border:1px solid #fed7aa;border-left:4px solid #f97316;border-radius:10px;padding:12px 14px;margin:-4px 0 18px;font-size:18px;line-height:1.75;color:#7c2d12">
            <b>資料口徑校正：</b>本區「74尾」為平台逐魚道通行彙整，表列魚類為5種；110年樣站電捕資料則依表5-3為第3次486尾、第4次235尾、全年合計721尾。
            表5-21顯示109年形質測量為7種，
            表5-22顯示110年形質測量為8種：明潭吻鰕虎、短吻紅斑吻鰕虎、臺灣白甲魚、臺灣石魚賓、臺灣間爬岩鰍、臺灣鬚鱲、纓口臺鰍、短臀瘋鱨。
            表5-7與表5-8合併之魚蝦蟹類水域生物總名錄為10種（8種魚類+粗糙沼蝦、芮氏明溪蟹）。
            表5-19之魚道中捕捉彙整為7種、306尾（109~110年四次調查合計）。因此本頁不再將「10種」作為魚類通行物種數。
          </div>

          <!-- 魚道成效表 -->
          <div style="overflow-x:auto;margin-bottom:18px">
            <table style="width:100%;border-collapse:collapse;font-size:19px;min-width:680px">
              <thead>
                <tr style="background:#e0f2fe">
                  <th style="padding:10px 12px;border:1px solid #bae6fd;color:#0369a1;text-align:left;width:90px">魚道編號</th>
                  <th style="padding:10px 12px;border:1px solid #bae6fd;color:#0369a1;text-align:left;width:80px">型式</th>
                  <th style="padding:10px 12px;border:1px solid #bae6fd;color:#0369a1;text-align:left;width:70px">位置</th>
                  <th style="padding:10px 12px;border:1px solid #bae6fd;color:#0369a1;text-align:center;width:60px">電捕尾數</th>
                  <th style="padding:10px 12px;border:1px solid #bae6fd;color:#0369a1;text-align:left">主要捕獲物種（尾數）</th>
                  <th style="padding:10px 12px;border:1px solid #bae6fd;color:#0369a1;text-align:center;width:70px">效能評估</th>
                </tr>
              </thead>
              <tbody>
                ${[
                  { code:'溪構1-1', type:'粗石斜曲面', km:'1K+400', n:4,  species:'明潭吻鰕虎(4)', grade:'A', color:'#dcfce7', tcolor:'#166534', note:'吻鰕虎專化' },
                  { code:'溪構1-2', type:'改良型舟通', km:'1K+400', n:0,  species:'—（與1-1合計統計）', grade:'B', color:'#f0fdf4', tcolor:'#166534', note:'雙通道組合' },
                  { code:'溪構2',   type:'階段式',     km:'1K+315', n:5,  species:'臺灣石魚賓(3)、臺灣白甲魚(2)', grade:'A', color:'#dcfce7', tcolor:'#166534', note:'混合物種' },
                  { code:'溪構3',   type:'斜坡式',     km:'1K+225', n:14, species:'明潭吻鰕虎(12)★、臺灣白甲魚(1)、纓口臺鰍(1)', grade:'A+', color:'#bbf7d0', tcolor:'#15803d', note:'吻鰕虎主導' },
                  { code:'溪構4',   type:'階段式',     km:'1K+170', n:11, species:'臺灣石魚賓(6)、臺灣白甲魚(2)、臺灣間爬岩鰍(2)、明潭吻鰕虎(1)', grade:'A', color:'#dcfce7', tcolor:'#166534', note:'多樣性最佳' },
                  { code:'溪構5-2', type:'潛越式',     km:'1K+000', n:17, species:'明潭吻鰕虎(13)★★、臺灣白甲魚(1)、臺灣石魚賓(1)、纓口臺鰍(1)', grade:'A+', color:'#bbf7d0', tcolor:'#15803d', note:'效能最佳' },
                  { code:'溪構6',   type:'階段式',     km:'0K+740', n:4,  species:'臺灣石魚賓(4)', grade:'B+', color:'#f0fdf4', tcolor:'#166534', note:'石魚賓專化' },
                  { code:'溪構7',   type:'降壩',       km:'0K+560', n:8,  species:'臺灣白甲魚(8)', grade:'A', color:'#dcfce7', tcolor:'#166534', note:'白甲魚專化' },
                  { code:'溪構8-2', type:'梯狀階段',   km:'0K+460', n:11, species:'臺灣白甲魚(11)', grade:'A', color:'#dcfce7', tcolor:'#166534', note:'白甲魚專化' },
                ].map((r,i)=>`
                  <tr style="${i%2===0?'background:#f8fafc':'background:#fff'}">
                    <td style="padding:9px 12px;border:1px solid #e0f2fe;font-weight:800;color:#0369a1">${r.code}</td>
                    <td style="padding:9px 12px;border:1px solid #e0f2fe;font-size:18px">${r.type}</td>
                    <td style="padding:9px 12px;border:1px solid #e0f2fe;font-size:18px;color:#64748b">${r.km}</td>
                    <td style="padding:9px 12px;border:1px solid #e0f2fe;text-align:center;font-weight:800;font-size:20px;color:${r.n>10?'#0369a1':'#334155'}">${r.n||'—'}</td>
                    <td style="padding:9px 12px;border:1px solid #e0f2fe;font-size:18px;color:#334155">${r.species}</td>
                    <td style="padding:9px 12px;border:1px solid #e0f2fe;text-align:center">
                      <span style="background:${r.color};color:${r.tcolor};font-weight:800;font-size:18px;padding:3px 10px;border-radius:999px">${r.grade}</span>
                    </td>
                  </tr>
                `).join('')}
                <tr style="background:#e0f2fe;font-weight:800">
                  <td colspan="3" style="padding:9px 12px;border:1px solid #bae6fd;color:#0369a1">合計（9種魚道）</td>
                  <td style="padding:9px 12px;border:1px solid #bae6fd;text-align:center;font-size:18px;color:#0369a1">74</td>
                  <td style="padding:9px 12px;border:1px solid #bae6fd;font-size:18px;color:#0f172a">明潭吻鰕虎(30)・臺灣白甲魚(25)・臺灣石魚賓(14)・臺灣間爬岩鰍(2)・纓口臺鰍(2)</td>
                  <td style="padding:9px 12px;border:1px solid #bae6fd;text-align:center;font-size:18px;color:#166534">整體優</td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- 魚道型式推薦 -->
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:12px;margin-bottom:8px">
            <div style="background:#e0f2fe;border-radius:10px;padding:14px 16px;border-left:4px solid #0369a1">
              <div style="font-size:19px;font-weight:800;color:#0369a1;margin-bottom:8px"><i class="fas fa-star" style="margin-right:6px"></i>保育種通行（吻鰕虎、纓口臺鰍）</div>
              <div style="font-size:18px;color:#334155;line-height:1.7">優先採用<b>潛越式</b>（溪構5-2）或<b>斜坡式</b>（溪構3）<br>通行效率：明潭吻鰕虎 FPE &gt;86%</div>
            </div>
            <div style="background:#f0fdf4;border-radius:10px;padding:14px 16px;border-left:4px solid #16a34a">
              <div style="font-size:19px;font-weight:800;color:#166534;margin-bottom:8px"><i class="fas fa-arrow-up" style="margin-right:6px"></i>強游泳能力種（白甲魚）</div>
              <div style="font-size:18px;color:#334155;line-height:1.7">降壩式（溪構7）、梯狀階段式（溪構8-2）<br>最長通行距離確認：710m 以上（0K+460→1K+170）</div>
            </div>
            <div style="background:#fef3c7;border-radius:10px;padding:14px 16px;border-left:4px solid #d97706">
              <div style="font-size:19px;font-weight:800;color:#b45309;margin-bottom:8px"><i class="fas fa-layer-group" style="margin-right:6px"></i>多樣性最佳組合</div>
              <div style="font-size:18px;color:#334155;line-height:1.7">溪構4（階段式）：4種物種・11尾<br>潛越式+粗石斜曲面 組合提供最廣物種覆蓋</div>
            </div>
          </div>

        </div>
      </div>

      <!-- ── 魚道建置前後族群比對（103年 vs 110年+） ── -->
      <div class="card" style="margin-top:16px">
        <div class="card-header">
          <span class="card-title" style="font-size:17px"><i class="fas fa-chart-bar" style="color:#7c3aed"></i> 魚道建置前後族群比較</span>
          <span style="font-size:18px;color:#64748b">103年（2014）基準 vs 110年（2021）魚道通行／樣站電捕成效・物種組成對比</span>
        </div>
        <div class="card-body">
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
            <!-- 建置前（103年） -->
            <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:10px;padding:16px">
              <div style="font-size:19px;font-weight:800;color:#92400e;margin-bottom:12px">
                <i class="fas fa-clock-rotate-left" style="margin-right:6px"></i>建置前（103年 / 2014）
              </div>
              <div style="font-size:18px;color:#334155;margin-bottom:8px">調查地點：橫流溪下游（豐林橋附近）</div>
              ${[
                { sp:'臺灣石魚賓', n:22, pct:73, col:'#f97316' },
                { sp:'臺灣間爬岩鰍', n:8,  pct:27, col:'#f43f5e' },
                { sp:'臺灣白甲魚',  n:0,  pct:0,  col:'#0ea5e9' },
                { sp:'明潭吻鰕虎', n:0,  pct:0,  col:'#22c55e' }
              ].map(r=>`
                <div style="margin-bottom:10px">
                  <div style="display:flex;justify-content:space-between;font-size:18px;margin-bottom:3px">
                    <span style="font-weight:700;color:#0f172a">${r.sp}</span>
                    <span style="color:${r.col};font-weight:800">${r.n} 尾</span>
                  </div>
                  <div style="background:#e5e7eb;border-radius:999px;height:8px;overflow:hidden">
                    <div style="width:${r.pct}%;background:${r.col};height:100%;border-radius:999px;transition:width 1s"></div>
                  </div>
                </div>
              `).join('')}
              <div style="font-size:20px;color:#92400e;margin-top:8px;background:#fef3c7;padding:8px 10px;border-radius:6px">
                ⚠️ 臺灣白甲魚稀少，石魚賓單一優勢，物種多樣性偏低
              </div>
            </div>

            <!-- 建置後（110年） -->
            <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:16px">
              <div style="font-size:19px;font-weight:800;color:#166534;margin-bottom:12px">
                <i class="fas fa-arrow-trend-up" style="margin-right:6px"></i>建置後（110年 / 2021）
              </div>
              <div style="font-size:18px;color:#334155;margin-bottom:8px">調查口徑：逐魚道通行彙整（9座魚道，全流域）</div>
              ${[
                { sp:'明潭吻鰕虎',  n:30, pct:100, col:'#22c55e' },
                { sp:'臺灣白甲魚',  n:25, pct:83,  col:'#0ea5e9' },
                { sp:'臺灣石魚賓',  n:14, pct:47,  col:'#f97316' },
                { sp:'臺灣間爬岩鰍',n:2,  pct:7,   col:'#f43f5e' }
              ].map(r=>`
                <div style="margin-bottom:10px">
                  <div style="display:flex;justify-content:space-between;font-size:18px;margin-bottom:3px">
                    <span style="font-weight:700;color:#0f172a">${r.sp}</span>
                    <span style="color:${r.col};font-weight:800">${r.n} 尾</span>
                  </div>
                  <div style="background:#e5e7eb;border-radius:999px;height:8px;overflow:hidden">
                    <div style="width:${r.pct}%;background:${r.col};height:100%;border-radius:999px;transition:width 1s"></div>
                  </div>
                </div>
              `).join('')}
              <div style="font-size:20px;color:#166534;margin-top:8px;background:#dcfce7;padding:8px 10px;border-radius:6px">
                ✅ 多物種均衡記錄，臺灣白甲魚族群大幅恢復；另表5-3樣站電捕為4月486尾、9月235尾，全年721尾
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ── 紅外線相機記錄物種 ── -->
      <div class="card" style="margin-top:16px">
        <div class="card-header">
          <span class="card-title" style="font-size:17px"><i class="fas fa-camera" style="color:#92400e"></i> 紅外線自動相機記錄物種</span>
          <span style="font-size:18px;color:#64748b">場域生態資源保全・農業部林業及自然保育署臺中分署</span>
        </div>
        <div class="card-body">
          <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:12px">
            ${[
              { name:'藍腹鷳', sci:'Lophura swinhoii', icon:'fa-dove', color:'#1d4ed8', bg:'#dbeafe', border:'#bfdbfe', tag:'一級保育', note:'珍貴稀有鳥類，山林地被棲息' },
              { name:'臺灣野山羊', sci:'Capricornis swinhoei', icon:'fa-mountain', color:'#166534', bg:'#dcfce7', border:'#bbf7d0', tag:'特有種', note:'保育類二級，臺灣特有種' },
              { name:'臺灣野兔', sci:'Lepus sinensis formosanus', icon:'fa-paw', color:'#0f766e', bg:'#ccfbf1', border:'#99f6e4', tag:'特有亞種', note:'濱溪草叢，夜行性' },
              { name:'穿山甲', sci:'Manis pentadactyla', icon:'fa-shield-halved', color:'#dc2626', bg:'#fee2e2', border:'#fca5a5', tag:'一級保育', note:'珍貴稀有，夜行穿梭' },
              { name:'食蟹獴', sci:'Herpestes urva', icon:'fa-otter', color:'#0369a1', bg:'#e0f2fe', border:'#bae6fd', tag:'二級保育', note:'溪旁棲息，保育類' },
              { name:'臺灣野豬', sci:'Sus scrofa taivanus', icon:'fa-hippo', color:'#475569', bg:'#f1f5f9', border:'#cbd5e1', tag:'常見種', note:'山林夜行性' }
            ].map(sp => `
              <div style="background:${sp.bg};border:1px solid ${sp.border};border-radius:10px;padding:14px 12px;text-align:center">
                <div style="font-size:30px;color:${sp.color};margin-bottom:8px"><i class="fas ${sp.icon}"></i></div>
                <div style="font-size:20px;font-weight:800;color:#0f172a;margin-bottom:3px">${sp.name}</div>
                <div style="font-size:19px;font-style:italic;color:#64748b;margin-bottom:8px">${sp.sci}</div>
                <span style="font-size:19px;background:${sp.color};color:#fff;border-radius:999px;padding:2px 8px;font-weight:700">${sp.tag}</span>
                <div style="font-size:20px;color:#475569;margin-top:8px;line-height:1.4">${sp.note}</div>
              </div>
            `).join('')}
          </div>
          <div style="margin-top:14px;padding:10px 14px;background:#f8fafc;border-left:4px solid #92400e;border-radius:0 8px 8px 0;font-size:18px;color:#475569;line-height:1.6">
            <i class="fas fa-info-circle" style="color:#92400e"></i>
            <strong style="color:#92400e"> 說明：</strong>以上物種均由紅外線自動相機記錄，無外來或入侵物種，顯示橫流溪場域生態資源豐富，長期調查監測持續進行中。
          </div>
        </div>
      </div>

    </div>
  `;

  setTimeout(() => initBioGISMap(fishSpecies, facilities), 120);
}

/* ── 互動地圖初始化 ──────────────────────────────────────────────────────── */
function initBioGISMap(fishSpecies, facilities) {
  if (typeof L === 'undefined') return;
  const el = document.getElementById('bioGISMap');
  if (!el) return;

  // 初始化地圖
  biogisMap = L.map('bioGISMap', { zoomControl: true, attributionControl: false }).setView([24.182, 120.9095], 15);
  L.control.attribution({ prefix: false }).addTo(biogisMap);

  // 底圖
  const satLayer  = L.tileLayer('https://wmts.nlsc.gov.tw/wmts/PHOTO2/default/GoogleMapsCompatible/{z}/{y}/{x}', { attribution:'© 內政部國土測繪中心', maxZoom:20, crossOrigin:true });
  const lblLayer  = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png', { subdomains:'abcd', maxZoom:20, opacity:.9 });
  const roadLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution:'© OpenStreetMap contributors', maxZoom:19 });

  window._biogisBaseLayers = { hybrid: L.layerGroup([satLayer, lblLayer]), satellite: satLayer, road: roadLayer };
  window._biogisCurrentBase = window._biogisBaseLayers.hybrid;
  window._biogisCurrentBase.addTo(biogisMap);

  // ── 圖層群組 ──
  bioLayerGroups = {
    landanimals:  L.layerGroup().addTo(biogisMap),
    fishspecies:  L.layerGroup(),           // 舊版區域魚種（預設隱藏）
    fishwayDist:  L.layerGroup().addTo(biogisMap), // 魚道關聯魚種分布（精確定位）
    facilities:   L.layerGroup().addTo(biogisMap)
  };

  // 陸域濱溪帶多邊形已移除（改以動物標記點表示）

  // ── 1b. 陸域動物標記點 ──
  const landAnimalDefs = [
    { lat:24.1755, lng:120.9076, icon:'fa-dove',  color:'#1d4ed8', name:'鳥類',      sub:'藍腹鷳・翠鳥・鉛色水鶇' },
    { lat:24.1816, lng:120.9067, icon:'fa-dove',  color:'#1d4ed8', name:'鳥類',      sub:'翠鳥・白鶺鴒觀測點' },
    { lat:24.1798, lng:120.9114, icon:'fa-paw',   color:'#92400e', name:'大型哺乳類', sub:'穿山甲・食蟹獴・臺灣野山羊' },
    { lat:24.1845, lng:120.9082, icon:'fa-paw',   color:'#92400e', name:'大型哺乳類', sub:'臺灣黑熊・臺灣野豬・臺灣野兔' },
    { lat:24.1768, lng:120.9092, icon:'fa-frog',  color:'#0f766e', name:'兩棲爬蟲',  sub:'蛙類・蜥蜴類觀測點' },
    { lat:24.1833, lng:120.9108, icon:'fa-frog',  color:'#0f766e', name:'兩棲爬蟲',  sub:'蛙類夜間調查點' },
    { lat:24.1793, lng:120.9100, icon:'fa-bug',   color:'#854d0e', name:'水棲昆蟲',  sub:'魚蛉・石蠅・春蜓調查點' },
    { lat:24.1860, lng:120.9095, icon:'fa-bug',   color:'#854d0e', name:'水棲昆蟲',  sub:'蜉蝣・毛翅目採集點' }
  ];

  landAnimalDefs.forEach(def => {
    const icon = L.divIcon({
      className: '',
      html: `<div style="display:flex;flex-direction:column;align-items:center;cursor:pointer;
               filter:drop-shadow(0 3px 8px rgba(0,0,0,.50))">
               <div style="width:48px;height:48px;border-radius:50%;
                 background:#fff;border:3px solid ${def.color};
                 display:flex;align-items:center;justify-content:center;
                 box-shadow:0 3px 12px rgba(0,0,0,.30)">
                 <i class="fas ${def.icon}" style="color:${def.color};font-size:22px"></i>
               </div>
               <div style="font-size:19px;font-weight:900;color:#0f172a;white-space:nowrap;
                 background:rgba(255,255,255,.96);border-radius:6px;padding:3px 9px;margin-top:3px;
                 border:2px solid ${def.color};line-height:1.5;box-shadow:0 2px 6px rgba(0,0,0,.20)">
                 ${def.name}
               </div>
             </div>`,
      iconSize:[48,72], iconAnchor:[24,24]
    });
    L.marker([def.lat, def.lng], { icon })
      .bindPopup(`<div style="min-width:190px;font-size:18px">
        <div style="font-weight:900;font-size:19px;color:${def.color};margin-bottom:5px">
          <i class="fas ${def.icon}"></i> ${def.name}</div>
        <div style="color:#334155;margin-bottom:6px;line-height:1.6">${def.sub}</div>
        <div style="font-size:19px;color:#64748b">📷 紅外線相機・現地調查記錄</div>
      </div>`, { maxWidth:240 })
      .addTo(bioLayerGroups.landanimals);
  });

  // ── 3. 魚種標記（與GIS整合地圖完全相同的資料來源與座標邏輯）──
  // 使用 gis-enhanced.js 的 fishGisMarkers() 函式，確保兩圖一致
  const cMapFish = { '瀕危':'#dc2626','易危':'#d97706','近危':'#2563eb','一般':'#16a34a' };
  const fishMarkers = (typeof fishGisMarkers === 'function')
    ? fishGisMarkers(fishSpecies)
    : fishSpecies.map((item, i) => {
        // fallback：與 fishGisMarkers 相同的 zone 基點 + offset 邏輯
        const baseLL = { lower:[24.18030,120.90855], middle:[24.18355,120.90958], upper:[24.18595,120.90965] };
        const offsets = [[0,0],[0.00022,0.00018],[-0.00020,0.00025],[0.00034,-0.00015],
                         [-0.00032,-0.00022],[0.00014,-0.00036],[-0.00016,0.00044],[0.00048,0.00008],[-0.00045,0.00004]];
        const zone  = fish_speciesZone(item);
        const off   = offsets[i % offsets.length];
        return { ...item, zone, shape: fish_speciesShape(item),
                 latlng: [baseLL[zone][0]+off[0], baseLL[zone][1]+off[1]],
                 size: Math.max(44, Math.min(74, 42 + Math.sqrt(Number(item.totalCount)||1)*4)) };
      });

  fishMarkers.forEach(def => {
    const cons    = def.conservation || '一般';
    const col     = cMapFish[cons] || '#0e7490';
    const bgCol   = { '瀕危':'#fee2e2','易危':'#fef3c7','近危':'#dbeafe','一般':'#dcfce7' }[cons] || '#f1f5f9';
    const zoneLabel = { lower:'下游', middle:'中游', upper:'上游' }[def.zone] || '全域';
    const sz      = def.size || 68;
    const latlng  = def.latlng || [def.lat, def.lng];
    const photo   = (typeof fish_photoFor === 'function') ? fish_photoFor(def) : null;
    const icon = L.divIcon({
      className: '',
      html: `<div style="display:flex;flex-direction:column;align-items:center;cursor:pointer;
               filter:drop-shadow(0 3px 8px rgba(0,0,0,.50))">
               <div style="width:${sz}px;height:${Math.round(sz*0.62)}px">${fish_speciesSvg(def.shape)}</div>
               <div style="font-size:19px;font-weight:900;color:#0f172a;white-space:nowrap;
                 background:rgba(255,255,255,.96);border-radius:6px;padding:3px 9px;margin-top:2px;
                 border:2px solid ${col};line-height:1.5;box-shadow:0 2px 6px rgba(0,0,0,.20)">
                 ${fish_escape(def.species)}
               </div>
             </div>`,
      iconSize: [sz, sz+18], iconAnchor: [Math.round(sz/2), Math.round(sz*0.31)]
    });
    // popup：與 GIS整合地圖 createFishGisPopup() 相同內容
    const popupHtml = (typeof createFishGisPopup === 'function')
      ? createFishGisPopup(def)
      : `<div style="min-width:200px;font-size:18px">
           ${photo ? `<img src="${photo.image}" onerror="this.onerror=null;this.src='/webapp/assets/fish-photos/field-measurement.jpg'" style="width:100%;height:110px;object-fit:cover;border-radius:6px;margin-bottom:8px">` : ''}
           <div style="font-weight:900;font-size:19px;color:#0f172a;margin-bottom:2px">${fish_escape(def.species)}</div>
           <div style="font-size:20px;color:#64748b;font-style:italic;margin-bottom:8px">${fish_escape(def.scientificName||'')}</div>
           <div style="display:grid;grid-template-columns:1fr 1fr;gap:5px;margin-bottom:8px;font-size:20px">
             <div><b>保育：</b><span style="color:${col};font-weight:700">${cons}</span></div>
             <div><b>區域：</b>${zoneLabel}水域</div>
             <div><b>累計：</b>${Number(def.totalCount)||0} 尾次</div>
             <div><b>記錄：</b>${def.surveys||0} 筆</div>
           </div>
           <div style="background:#f0fdfa;border-left:3px solid #0e7490;padding:7px 8px;border-radius:0 5px 5px 0;font-size:20px">
             <b>位置：</b>${fish_escape(def.location||'-')}
           </div>
         </div>`;
    L.marker(latlng, { icon })
      .bindPopup(popupHtml, { maxWidth:280 })
      .addTo(bioLayerGroups.fishspecies);
  });

  // ── 4. 工程設施標記 ──
  const facColorMap = (f) => {
    if (/魚道/.test(f.type)) return '#1565c0';
    if (/壩|壩堰/.test(f.type)) return '#795548';
    if (/固床/.test(f.type)) return '#827717';
    if (/平台|平臺/.test(f.type)) return '#7c3aed';
    if (/步道/.test(f.type)) return '#0f766e';
    return '#546e7a';
  };
  const statusRing = (f) => {
    if (f.status === '損壞') return '#dc2626';
    if (f.status === '需維護') return '#f59e0b';
    return '#16a34a';
  };

  facilities.forEach(f => {
    if (!f.lat || !f.lng) return;
    const facIc = /魚道/.test(f.type) ? 'fa-fish' :
                  /壩/.test(f.type) ? 'fa-water' :
                  /固床/.test(f.type) ? 'fa-layer-group' :
                  /平台|平臺/.test(f.type) ? 'fa-vector-square' :
                  /步道/.test(f.type) ? 'fa-route' : 'fa-layer-group';
    const facLabel = /魚道/.test(f.type) ? '魚道' :
                     /壩/.test(f.type) ? '防砂壩' :
                     /固床/.test(f.type) ? '固床工' :
                     /平台|平臺/.test(f.type) ? '平台' :
                     /步道/.test(f.type) ? '步道' : (f.type || '設施');
    const icon = L.divIcon({
      className: '',
      html: `<div style="display:flex;flex-direction:column;align-items:center;cursor:pointer;
               filter:drop-shadow(0 3px 8px rgba(0,0,0,.50))">
               <div style="width:44px;height:44px;border-radius:50%;background:${facColorMap(f)};
                 border:3px solid ${statusRing(f)};display:flex;align-items:center;justify-content:center;
                 box-shadow:0 3px 10px rgba(0,0,0,.35)">
                 <i class="fas ${facIc}" style="color:#fff;font-size:18px"></i>
               </div>
               <div style="font-size:18px;font-weight:900;color:#0f172a;white-space:nowrap;
                 background:rgba(255,255,255,.96);border-radius:6px;padding:3px 8px;margin-top:3px;
                 border:2px solid ${facColorMap(f)};line-height:1.5;box-shadow:0 2px 6px rgba(0,0,0,.20)">
                 ${facLabel}
               </div>
             </div>`,
      iconSize: [44, 68], iconAnchor: [22, 22]
    });
    L.marker([f.lat, f.lng], { icon })
      .bindPopup(biogisFactPopup(f), { maxWidth:320 })
      .addTo(bioLayerGroups.facilities);
  });


  // ── 5. 魚道關聯魚種分布（精確定位至各魚道設施座標）──
  const _FWDIST = [
    { code:'溪構8-2', typeName:'之字形魚道',   km:'0K+460', lat:24.180055, lng:120.908622, typeColor:'#0ea5e9', status:'正常',   count114:142, delta:'+142',
      species:[{name:'臺灣白甲魚',shape:'carp', cons:'易危',color:'#d97706',count110:11},{name:'纓口臺鰍',shape:'loach',cons:'易危',color:'#7c3aed',count110:2}]},
    { code:'溪構7',   typeName:'降壩魚道',     km:'0K+560', lat:24.180922, lng:120.908503, typeColor:'#f59e0b', status:'正常',   count114:187, delta:'+161',
      species:[{name:'臺灣白甲魚',shape:'carp', cons:'易危',color:'#d97706',count110:8},{name:'臺灣石魚賓',shape:'carp',cons:'近危',color:'#2563eb',count110:6, latlng:[24.180753,120.908448]},{name:'纓口臺鰍',shape:'loach',cons:'易危',color:'#7c3aed',count110:1}]},
    { code:'溪構6',   typeName:'階段式魚道',   km:'0K+740', lat:24.181672, lng:120.909300, typeColor:'#22c55e', status:'正常',   count114:155, delta:'+147',
      species:[{name:'臺灣白甲魚',shape:'carp', cons:'易危',color:'#d97706',count110:4, latlng:[24.181645,120.909400]},{name:'纓口臺鰍',shape:'loach',cons:'易危',color:'#7c3aed',count110:0},{name:'臺灣間爬岩鰍',shape:'loach',cons:'近危',color:'#0284c7',count110:2}]},
    { code:'溪構5-2', typeName:'潛越式魚道',   km:'1K+000', lat:24.183541, lng:120.909564, typeColor:'#0ea5e9', status:'正常',     count114:194, delta:'+160',
      species:[{name:'臺灣白甲魚',shape:'carp', cons:'易危',color:'#d97706',count110:1},{name:'臺灣石魚賓',shape:'carp',cons:'近危',color:'#2563eb',count110:1, latlng:[24.183391,120.909500]},{name:'臺灣間爬岩鰍',shape:'loach',cons:'近危',color:'#0284c7',count110:0, latlng:[24.183386,120.909672]}]},
    { code:'溪構4',   typeName:'階段式魚道',   km:'1K+170', lat:24.184805, lng:120.909760, typeColor:'#22c55e', status:'需維護', count114:155, delta:'+147',
      species:[{name:'臺灣白甲魚',shape:'carp', cons:'易危',color:'#d97706',count110:2, latlng:[24.185001,120.910085]},{name:'纓口臺鰍',shape:'loach',cons:'易危',color:'#7c3aed',count110:0},{name:'臺灣間爬岩鰍',shape:'loach',cons:'近危',color:'#0284c7',count110:6, latlng:[24.184788,120.909857]}]},
    { code:'溪構3',   typeName:'斜坡式魚道',   km:'1K+225', lat:24.185158, lng:120.910163, typeColor:'#8b5cf6', status:'正常',   count114:142, delta:'+142',
      species:[{name:'臺灣白甲魚',shape:'carp', cons:'易危',color:'#d97706',count110:1, latlng:[24.185400,120.910078]},{name:'纓口臺鰍',shape:'loach',cons:'易危',color:'#7c3aed',count110:1, latlng:[24.185377,120.910213]}]},
    { code:'溪構2',   typeName:'階段式魚道',   km:'1K+315', lat:24.185835, lng:120.909631, typeColor:'#22c55e', status:'正常',   count114:155, delta:'+147',
      species:[{name:'臺灣白甲魚',shape:'carp', cons:'易危',color:'#d97706',count110:2, latlng:[24.186198,120.909397]},{name:'纓口臺鰍',shape:'loach',cons:'易危',color:'#7c3aed',count110:0, latlng:[24.185894,120.909474]},{name:'臺灣間爬岩鰍',shape:'loach',cons:'近危',color:'#0284c7',count110:0}]},
    { code:'溪構1-1', typeName:'粗石斜曲面魚道', km:'1K+400', lat:24.186629, lng:120.909306, typeColor:'#14b8a6', status:'正常',   count114:155, delta:'+147',
      species:[{name:'臺灣白甲魚',shape:'carp', cons:'易危',color:'#d97706',count110:5, latlng:[24.186829,120.909093]},{name:'纓口臺鰍',shape:'loach',cons:'易危',color:'#7c3aed',count110:0, latlng:[24.186565,120.909179]},{name:'臺灣間爬岩鰍',shape:'loach',cons:'近危',color:'#0284c7',count110:0, latlng:[24.186479,120.909405]}]},
    { code:'溪構1-2', typeName:'舟通式魚道',   km:'1K+400', lat:24.186452, lng:120.909207, typeColor:'#6366f1', status:'正常',   count114:142, delta:'+142',
      species:[{name:'臺灣白甲魚',shape:'carp', cons:'易危',color:'#d97706',count110:0, latlng:[24.186647,120.909169]},{name:'纓口臺鰍',shape:'loach',cons:'易危',color:'#7c3aed',count110:0}]}
  ];

  // 物種偏移量（以魚道為中心向外散開，避免重疊）
  const _spOffsets = n => {
    if (n === 1) return [[0.00028, 0]];
    if (n === 2) return [[0.00028,-0.00020],[0.00028,0.00020]];
    return          [[0.00034, 0],[-0.00006,-0.00024],[-0.00006,0.00024]];
  };
  const _consColor = c => ({瀕危:'#dc2626',易危:'#d97706',近危:'#2563eb',一般:'#16a34a'}[c]||'#64748b');
  _FWDIST.forEach(fw => {
    fw.species.forEach(sp => {
      const rl = fish_redlist2024(sp.name);
      sp.cons = rl.grade;
      sp.redlistCode = rl.code;
      sp.color = _consColor(rl.grade);
    });
  });
  const _statusBadge = s => s==='堵塞列管'?'🔴':s==='需維護'?'🟡':'🟢';

  _FWDIST.forEach(fw => {
    const n = fw.species.length;
    const offsets = _spOffsets(n);

    // ① 中心：魚道主標記（大型複合徽章）
    const spIconsHtml = fw.species.map(sp =>
      `<div style="width:32px;height:20px">${fish_speciesSvg(sp.shape)}</div>`
    ).join('');
    const centerIcon = L.divIcon({
      className: '',
      html: `<div style="display:flex;flex-direction:column;align-items:center;cursor:pointer;
               filter:drop-shadow(0 4px 10px rgba(0,0,0,.55));position:relative">
               <!-- 魚道型式圓徽 -->
               <div style="width:52px;height:52px;border-radius:50%;background:${fw.typeColor};
                 border:3px solid #fff;display:flex;align-items:center;justify-content:center;
                 box-shadow:0 4px 12px rgba(0,0,0,.40)">
                 <i class="fas fa-fish" style="color:#fff;font-size:22px"></i>
               </div>
               <!-- 魚道代碼標籤 -->
               <div style="font-size:18px;font-weight:900;color:#0f172a;white-space:nowrap;
                 background:rgba(255,255,255,.97);border-radius:7px;padding:3px 10px;margin-top:3px;
                 border:2px solid ${fw.typeColor};box-shadow:0 2px 8px rgba(0,0,0,.22);line-height:1.5">
                 ${fw.code}
               </div>
               <!-- 物種小圖示列 -->
               <div style="display:flex;gap:2px;background:rgba(255,255,255,.93);
                 border-radius:6px;padding:3px 5px;margin-top:2px;border:1.5px solid ${fw.typeColor}">
                 ${spIconsHtml}
               </div>
             </div>`,
      iconSize: [52, 100], iconAnchor: [26, 26]
    });

    const popupHtml = `
      <div style="min-width:240px;font-size:18px">
        <div style="font-weight:900;font-size:20px;color:${fw.typeColor};margin-bottom:6px;border-bottom:2px solid ${fw.typeColor};padding-bottom:5px">
          ${_statusBadge(fw.status)} ${fw.code}　${fw.typeName}
        </div>
        <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:8px;font-size:20px">
          <span><b>樁號：</b>${fw.km}</span>
          <span><b>狀態：</b><span style="color:${fw.status==='堵塞列管'?'#dc2626':fw.status==='需維護'?'#d97706':'#16a34a'};font-weight:700">${fw.status}</span></span>
        </div>
        <div style="font-size:18px;font-weight:700;color:#0f172a;margin-bottom:6px">114年聯關尾數：
          <span style="color:${fw.typeColor};font-size:19px;font-weight:900">${fw.count114}</span>
          <span style="font-size:20px;color:#16a34a;font-weight:700">&nbsp;${fw.delta} 較106年</span>
        </div>
        <div style="font-weight:700;font-size:20px;color:#475569;margin-bottom:5px">🐟 關聯保育魚種（110年電捕調查）：</div>
        ${fw.species.map(sp=>`
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:5px;
            background:#f8fafc;border-radius:6px;padding:5px 8px;border-left:3px solid ${sp.color}">
            <div style="width:38px;height:24px;flex-shrink:0">${fish_speciesSvg(sp.shape)}</div>
            <div>
              <div style="font-weight:700;font-size:18px;color:#0f172a">${sp.name}</div>
              <div style="font-size:19px;color:${_consColor(sp.cons)}">● ${sp.cons}&nbsp;&nbsp;110年電捕：${sp.count110>0?sp.count110+'尾':'微量'}</div>
            </div>
          </div>`).join('')}
        <div style="font-size:19px;color:#94a3b8;margin-top:6px;border-top:1px solid #e2e8f0;padding-top:5px">
          資料來源：110年東勢處魚道成效追蹤報告（電捕法）‧ 歷年巡查記錄
        </div>
      </div>`;

    L.marker([fw.lat, fw.lng], { icon: centerIcon, zIndexOffset: 200 })
      .bindPopup(popupHtml, { maxWidth: 300 })
      .addTo(bioLayerGroups.fishwayDist);

    // ② 周圍：各物種精確偏移標記
    fw.species.forEach((sp, idx) => {
      const [dLat, dLng] = offsets[idx];
      const spIcon = L.divIcon({
        className: '',
        html: `<div style="display:flex;flex-direction:column;align-items:center;cursor:pointer;
                 filter:drop-shadow(0 3px 7px rgba(0,0,0,.45))">
                 <!-- 連接線提示 -->
                 <div style="width:2px;height:12px;background:${sp.color};opacity:.7"></div>
                 <!-- 魚形圖示 -->
                 <div style="width:52px;height:32px;border-radius:6px;background:rgba(255,255,255,.95);
                   border:2px solid ${sp.color};padding:2px;box-shadow:0 2px 8px rgba(0,0,0,.25)">
                   ${fish_speciesSvg(sp.shape)}
                 </div>
                 <!-- 物種名稱 -->
                 <div style="font-size:11.5px;font-weight:800;color:#0f172a;white-space:nowrap;
                   background:rgba(255,255,255,.96);border-radius:5px;padding:2px 7px;margin-top:2px;
                   border:1.5px solid ${sp.color};line-height:1.4;box-shadow:0 1px 4px rgba(0,0,0,.18)">
                   ${sp.name}
                 </div>
                 <!-- 保育等級 -->
                 <div style="font-size:19px;font-weight:700;color:${_consColor(sp.cons)};
                   background:rgba(255,255,255,.88);border-radius:4px;padding:1px 5px;margin-top:1px">
                   ${sp.cons}
                 </div>
               </div>`,
        iconSize: [52, 80], iconAnchor: [26, 12]
      });

      const spPopup = `
        <div style="min-width:190px;font-size:18px">
          <div style="font-weight:900;font-size:19px;color:${sp.color};margin-bottom:4px">
            ${sp.name}</div>
          <div style="color:#64748b;font-style:italic;font-size:19px;margin-bottom:6px">
            保育等級：<span style="color:${_consColor(sp.cons)};font-weight:700">${sp.cons}</span>
          </div>
          <div style="background:#f0fdfa;border-left:3px solid ${fw.typeColor};
            border-radius:0 5px 5px 0;padding:6px 8px;font-size:20px;margin-bottom:6px">
            <b>分布魚道：</b>${fw.code} ${fw.typeName}<br>
            <b>樁號：</b>${fw.km}
          </div>
          <div style="font-size:20px">
            <b>110年電捕記錄：</b>${sp.count110>0?'<span style="color:#16a34a;font-weight:700">'+sp.count110+'尾</span>':'<span style="color:#94a3b8">微量記錄</span>'}
          </div>
        </div>`;

      // 物種標記座標：優先使用 sp.latlng 精確指定，否則使用偏移量計算
      const spLatLng = sp.latlng || [fw.lat + dLat, fw.lng + dLng];
      L.marker(spLatLng, { icon: spIcon, zIndexOffset: 100 })
        .bindPopup(spPopup, { maxWidth: 240 })
        .addTo(bioLayerGroups.fishwayDist);
    });
  });

  // ── 點擊座標顯示（方便校正魚類標記位置）──
  const coordCtrl = L.control({ position: 'bottomleft' });
  coordCtrl.onAdd = function() {
    const div = L.DomUtil.create('div');
    div.id = 'biogisCoordBox';
    div.style.cssText = [
      'background:rgba(255,255,255,.96)',
      'padding:8px 12px',
      'border-radius:8px',
      'font-size:18px',
      'border:2px solid #0e7490',
      'display:none',
      'min-width:220px',
      'box-shadow:0 3px 12px rgba(0,0,0,.25)',
      'pointer-events:auto'
    ].join(';');
    return div;
  };
  coordCtrl.addTo(biogisMap);

  biogisMap.on('click', function(e) {
    const lat = e.latlng.lat.toFixed(6);
    const lng = e.latlng.lng.toFixed(6);
    const box = document.getElementById('biogisCoordBox');
    if (!box) return;
    box.style.display = 'block';
    box.innerHTML = `
      <div style="font-weight:900;color:#0e7490;margin-bottom:4px;font-size:18px">
        <i class="fas fa-map-pin"></i> 點擊座標
      </div>
      <div style="font-size:19px;color:#0f172a;line-height:1.8">
        lat: <b>${lat}</b><br>
        lng: <b>${lng}</b>
      </div>
      <div style="display:flex;gap:6px;margin-top:8px">
        <button onclick="navigator.clipboard.writeText('${lat},${lng}').then(()=>{this.textContent='✓ 已複製';setTimeout(()=>{this.textContent='複製'},1500)})"
          style="flex:1;border:none;background:#0e7490;color:#fff;border-radius:5px;padding:4px 0;cursor:pointer;font-size:20px;font-weight:700">
          複製
        </button>
        <button onclick="document.getElementById('biogisCoordBox').style.display='none'"
          style="border:none;background:#e2e8f0;color:#475569;border-radius:5px;padding:4px 10px;cursor:pointer;font-size:20px">
          ✕
        </button>
      </div>
      <div style="font-size:19px;color:#94a3b8;margin-top:6px">點擊地圖任意位置可取得座標</div>
    `;
  });

  biogisMap.invalidateSize();
}

/* ── 地圖輔助函式 ──────────────────────────────────────────────────────────── */
function biogisLayerToggle(key, icon, color, label) {
  return `<label style="display:flex;align-items:center;gap:5px;padding:5px 9px;border:1px solid #d5dde7;border-radius:6px;background:#fff;font-size:20px;cursor:pointer;white-space:nowrap">
    <input type="checkbox" checked onchange="biogisToggleLayer('${key}',this.checked)" style="accent-color:${color}">
    <i class="fas fa-${icon}" style="color:${color}"></i>${label}
  </label>`;
}

function biogisToggleLayer(key, visible) {
  bioLayerVisible[key] = visible;
  if (!biogisMap || !bioLayerGroups[key]) return;
  if (visible) { bioLayerGroups[key].addTo(biogisMap); }
  else         { biogisMap.removeLayer(bioLayerGroups[key]); }
}

function biogisChangeBase(type) {
  if (!biogisMap || !window._biogisBaseLayers) return;
  if (window._biogisCurrentBase) biogisMap.removeLayer(window._biogisCurrentBase);
  window._biogisCurrentBase = window._biogisBaseLayers[type];
  window._biogisCurrentBase.addTo(biogisMap);
}

function biogisLocate(lat, lng, name) {
  if (!biogisMap) return;
  biogisMap.flyTo([lat, lng], 16, { duration:1.2 });
  setTimeout(() => {
    biogisMap.eachLayer(lyr => {
      if (lyr.getPopup && lyr.getLatLng) {
        const p = lyr.getPopup();
        if (p && p.getContent && String(p.getContent()).includes(name)) lyr.openPopup();
      }
    });
  }, 1400);
}

/* ── Popup 內容 ────────────────────────────────────────────────────────────── */
function biogisFactPopup(f) {
  const statusColor = f.status==='損壞'?'#dc2626':f.status==='需維護'?'#f59e0b':'#16a34a';
  const cond = f.condition ? `${f.condition}/5` : '-';
  return `<div style="min-width:220px;font-size:18px;line-height:1.7">
    <div style="font-weight:800;font-size:19px;color:#0f172a;margin-bottom:6px">${fish_escape(f.name)}</div>
    <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px">
      <span style="background:#dbeafe;color:#1e40af;padding:2px 7px;border-radius:999px;font-size:19px;font-weight:700">${fish_escape(f.type)}</span>
      <span style="background:${statusColor}22;color:${statusColor};padding:2px 7px;border-radius:999px;font-size:19px;font-weight:700;border:1px solid ${statusColor}44">${fish_escape(f.status)}</span>
    </div>
    <table style="width:100%;font-size:20px;border-collapse:collapse">
      <tr><td style="color:#64748b;padding:2px 0">里程</td><td style="font-weight:600">${fish_escape(f.stationKm||'-')}</td></tr>
      <tr><td style="color:#64748b;padding:2px 0">健康指數</td><td style="font-weight:600">${cond}</td></tr>
      <tr><td style="color:#64748b;padding:2px 0">上次巡查</td><td style="font-weight:600">${fish_escape(f.lastInspect||'-')}</td></tr>
      <tr><td style="color:#64748b;padding:2px 0">維護優先</td><td style="font-weight:600">${fish_escape(f.maintenance_priority||'-')}</td></tr>
    </table>
    ${f.evaluationNotes ? `<div style="margin-top:7px;font-size:19px;color:#475569;border-left:3px solid #1565c0;padding-left:7px;line-height:1.55">${fish_escape(f.evaluationNotes)}</div>` : ''}
  </div>`;
}

function biogisSpeciesPopup(sp) {
  const cMap = { '瀕危':['#fee2e2','#b91c1c'],'易危':['#fef9c3','#854d0e'],'近危':['#dbeafe','#1d4ed8'],'一般':['#dcfce7','#166534'] };
  const [cbg, ccl] = cMap[sp.conservation] || ['#f1f5f9','#475569'];
  const habitat = (sp.note||'').split('；').find(p => p.includes('偏好')||p.includes('底質')||p.includes('礫石')||p.includes('急流')) || '';
  return `<div style="min-width:200px;font-size:18px;line-height:1.7">
    <div style="font-weight:800;font-size:19px;color:#0f172a;margin-bottom:4px">${fish_escape(sp.species)}</div>
    <div style="font-style:italic;font-size:19px;color:#64748b;margin-bottom:8px">${fish_escape(sp.scientificName||'')}</div>
    <div style="display:flex;gap:5px;flex-wrap:wrap;margin-bottom:8px">
      <span style="background:${cbg};color:${ccl};padding:2px 7px;border-radius:999px;font-size:19px;font-weight:700">${fish_escape(sp.conservation)}</span>
      <span style="background:#f0f9ff;color:#0369a1;padding:2px 7px;border-radius:999px;font-size:19px">${fish_escape(sp.family||'')}</span>
    </div>
    <table style="width:100%;font-size:20px;border-collapse:collapse">
      <tr><td style="color:#64748b;padding:2px 0">調查尾次</td><td style="font-weight:700;color:#0e7490">${sp.totalCount} 尾</td></tr>
      <tr><td style="color:#64748b;padding:2px 0">調查筆數</td><td>${sp.surveys} 筆</td></tr>
      <tr><td style="color:#64748b;padding:2px 0">分布位置</td><td style="font-size:19px">${fish_escape(sp.location||'')}</td></tr>
    </table>
    ${habitat ? `<div style="margin-top:7px;font-size:19px;color:#475569;border-left:3px solid #0e7490;padding-left:7px;line-height:1.55">${fish_escape(habitat)}</div>` : ''}
  </div>`;
}

function biogisZonePopup(zd, zoneSpecies) {
  const total = zoneSpecies.reduce((s,x)=>s+(Number(x.totalCount)||0), 0);
  const conserved = zoneSpecies.filter(x=>x.conservation&&x.conservation!=='一般');
  return `<div style="min-width:210px;font-size:18px;line-height:1.7">
    <div style="font-weight:800;font-size:19px;color:#0f172a;margin-bottom:4px">${fish_escape(zd.name)}</div>
    <div style="font-size:19px;color:#64748b;margin-bottom:8px">${fish_escape(zd.range)}</div>
    <table style="width:100%;font-size:20px;border-collapse:collapse">
      <tr><td style="color:#64748b;padding:2px 0">物種數</td><td style="font-weight:700;color:#0369a1">${zoneSpecies.length} 種</td></tr>
      <tr><td style="color:#64748b;padding:2px 0">累計尾次</td><td style="font-weight:700;color:#0e7490">${total} 尾</td></tr>
      <tr><td style="color:#64748b;padding:2px 0">保育魚類</td><td style="font-weight:700;color:#dc2626">${conserved.length} 種</td></tr>
    </table>
    ${zoneSpecies.length ? `<div style="margin-top:8px;font-size:19px;color:#334155">
      <b>主要物種：</b>${zoneSpecies.slice(0,3).map(x=>fish_escape(x.species)).join('、')}
    </div>` : ''}
  </div>`;
}

function biogisLandPopup() {
  return `<div style="min-width:200px;font-size:18px;line-height:1.7">
    <div style="font-weight:800;font-size:19px;color:#166534;margin-bottom:6px"><i class="fas fa-tree"></i> 陸域濱溪帶</div>
    <table style="width:100%;font-size:20px;border-collapse:collapse">
      <tr><td style="color:#64748b;padding:2px 0">植物科數</td><td style="font-weight:700;color:#166534">37 科</td></tr>
      <tr><td style="color:#64748b;padding:2px 0">植物種數</td><td style="font-weight:700;color:#166534">90 種</td></tr>
      <tr><td style="color:#64748b;padding:2px 0">原生種</td><td>60 種</td></tr>
      <tr><td style="color:#64748b;padding:2px 0">特有種</td><td>4 種</td></tr>
      <tr><td style="color:#64748b;padding:2px 0">歸化種</td><td>30 種</td></tr>
      <tr><td style="color:#64748b;padding:2px 0">調查時間</td><td>112年6月</td></tr>
    </table>
    <div style="margin-top:7px;font-size:19px;color:#475569;border-left:3px solid #16a34a;padding-left:7px;line-height:1.55">
      包含魚蛉科、石蠅科、春蜓科等偏好清澈水質的濱溪昆蟲，顯示棲地品質優良。
    </div>
  </div>`;
}

/* 層級 Section 標題列 */
function bioSecHead(num, icon, title, sub, color) {
  return `
    <div style="display:flex;align-items:center;gap:16px;padding:14px 20px;background:#fff;border-radius:12px;border:1px solid #e2e8f0;border-left:5px solid ${color};box-shadow:0 2px 8px rgba(15,23,42,.06);margin-bottom:14px">
      <div style="width:42px;height:42px;border-radius:50%;background:${color};color:#fff;display:flex;align-items:center;justify-content:center;font-size:19px;font-weight:900;flex-shrink:0">${num}</div>
      <div style="display:flex;align-items:center;gap:10px;flex:1">
        <i class="fas ${icon}" style="color:${color};font-size:24px"></i>
        <div>
          <div style="font-size:24px;font-weight:900;color:#0f172a;line-height:1.1">${title}</div>
          <div style="font-size:18px;color:#64748b;margin-top:3px">${sub}</div>
        </div>
      </div>
    </div>`;
}

function bioStat(label, value, sub, color, bg, icon) {
  return `
    <div style="background:${bg};border:1px solid ${color}44;border-radius:14px;padding:20px 18px;display:flex;align-items:center;gap:16px">
      <div style="width:58px;height:58px;border-radius:14px;background:${color}22;color:${color};display:flex;align-items:center;justify-content:center;flex-shrink:0">
        <i class="fas ${icon}" style="font-size:26px"></i>
      </div>
      <div>
        <div style="font-size:34px;font-weight:900;color:${color};line-height:1">${value}</div>
        <div style="font-size:17px;font-weight:800;color:#0f172a;margin-top:4px">${label}</div>
        <div style="font-size:18px;color:#64748b;margin-top:3px">${sub}</div>
      </div>
    </div>`;
}

/* 摺疊卡片 — 預設收合，點標題展開 */
function bioCategoryBlock(cat, fishSpecies) {
  let items = cat.items || [];
  if (cat.dynamic && fishSpecies) {
    items = fishSpecies.map(sp => ({
      name: sp.species,
      detail: `${sp.totalCount} 尾次`,
      extra: sp.location,
      tag: sp.conservation
    }));
  }
  const id = 'biocat_' + cat.category.replace(/[^a-z0-9一-鿿]/gi,'_');
  const tagStyle = (tag) => {
    const m = {
      '瀕危':['#fee2e2','#b91c1c'], '易危':['#fef9c3','#854d0e'], '近危':['#dbeafe','#1d4ed8'],
      '指標':['#fce7f3','#9d174d'], '一級保育':['#fee2e2','#b91c1c'], '二級保育':['#fef9c3','#b45309'],
      '特有':['#dcfce7','#166534'], '特有亞種':['#dcfce7','#166534'], '常見':['#f1f5f9','#475569']
    };
    const [bg,cl] = m[tag] || ['#f1f5f9','#475569'];
    return `background:${bg};color:${cl}`;
  };
  const catQ = fish_escape(`橫流溪的${cat.category}：${(cat.summary || '物種組成、生態特色與保育重點為何？').slice(0,50)}`);
  return `
    <div class="biomap-cat-block" style="border-left:5px solid ${cat.color};background:${cat.bg};border-radius:0 12px 12px 0">
      <!-- 標題列（toggle + AI按鈕並排） -->
      <div style="display:flex;align-items:center;gap:6px">
        <button class="biomap-cat-header" onclick="bioCatToggle('${id}')"
          style="flex:1;display:flex;align-items:center;gap:12px;background:none;border:none;cursor:pointer;padding:6px 2px;text-align:left;border-radius:8px"
          onmouseover="this.style.background='${cat.color}12'" onmouseout="this.style.background='none'">
          <div style="width:46px;height:46px;border-radius:12px;background:${cat.color}22;display:flex;align-items:center;justify-content:center;flex-shrink:0">
            <i class="fas ${cat.icon}" style="color:${cat.color};font-size:22px"></i>
          </div>
          <div style="flex:1;text-align:left">
            <div style="font-weight:800;font-size:18px;color:${cat.color};line-height:1.2">${cat.category}</div>
            <div style="font-size:18px;color:#64748b;margin-top:2px">${items.length} 項記錄・點擊展開</div>
          </div>
          <span style="background:#fff;border:2px solid ${cat.color}66;color:${cat.color};border-radius:999px;padding:4px 13px;font-size:20px;font-weight:800;min-width:36px;text-align:center">${items.length}</span>
          <i id="${id}_arrow" class="fas fa-chevron-down" style="color:${cat.color};font-size:18px;transition:transform .25s;flex-shrink:0;margin-right:4px"></i>
        </button>
        <button data-q="${catQ}"
          onclick="fish_openAIQA(this.getAttribute('data-q'))"
          title="AI問答：${cat.category}"
          style="flex-shrink:0;background:#f5f3ff;border:1.5px solid #818cf8;color:#4f46e5;border-radius:10px;padding:6px 10px;font-size:20px;font-weight:700;cursor:pointer;white-space:nowrap;margin-right:4px">
          <i class="fas fa-robot"></i> AI
        </button>
      </div>
      <!-- 展開內容 -->
      <div id="${id}" class="biomap-cat-body" style="margin-top:4px">
        ${items.map(item => {
          const itemQ = fish_escape(`${item.name}的生態特性、在橫流溪的分布現況與保育意義`);
          return `
          <div style="display:flex;align-items:flex-start;gap:12px;background:#fff;border-radius:10px;padding:14px 14px;border:1px solid ${cat.color}30;margin-top:8px;box-shadow:0 1px 4px rgba(0,0,0,.06)">
            <div style="width:8px;height:8px;border-radius:50%;background:${cat.color};margin-top:7px;flex-shrink:0"></div>
            <div style="flex:1;min-width:0">
              <div style="font-weight:800;font-size:17px;color:#0f172a;margin-bottom:4px">${fish_escape(item.name)}</div>
              ${item.detail ? `<div style="font-size:19px;color:#334155;line-height:1.5">${fish_escape(item.detail)}</div>` : ''}
              ${item.extra ? `<div style="font-size:18px;color:#94a3b8;margin-top:3px">${fish_escape(item.extra)}</div>` : ''}
            </div>
            ${item.tag ? `<span style="${tagStyle(item.tag)};font-size:18px;font-weight:700;padding:5px 12px;border-radius:999px;white-space:nowrap;flex-shrink:0">${fish_escape(item.tag)}</span>` : ''}
            <button data-q="${itemQ}"
              onclick="event.stopPropagation();fish_openAIQA(this.getAttribute('data-q'))"
              title="AI問答：${fish_escape(item.name)}"
              style="flex-shrink:0;background:#f5f3ff;border:1.5px solid #818cf8;color:#4f46e5;border-radius:8px;padding:5px 9px;font-size:20px;font-weight:700;cursor:pointer;white-space:nowrap;align-self:center">
              💬
            </button>
          </div>`;
        }).join('')}
      </div>
    </div>`;
}

function bioCatToggle(id) {
  const body  = document.getElementById(id);
  const arrow = document.getElementById(id + '_arrow');
  if (!body) return;
  const open = body.style.display !== 'none' && body.style.display !== '';
  body.style.display  = open ? 'none' : 'block';
  if (arrow) arrow.style.transform = open ? '' : 'rotate(180deg)';
}

function bioFishRowToggle(id) {
  const row = document.getElementById(id);
  if (!row) return;
  const open = row.style.display !== 'none' && row.style.display !== '';
  row.style.display = open ? 'none' : 'table-row';
  const btn = document.getElementById(id + '_btn');
  if (btn) btn.innerHTML = open
    ? '<i class="fas fa-chevron-down"></i>'
    : '<i class="fas fa-chevron-up"></i>';
}

function bioLandSceneSvg() {
  return `
    <svg viewBox="0 0 1100 130" preserveAspectRatio="none" style="width:100%;height:110px;display:block">
      <rect width="1100" height="130" fill="#f0fdf4" rx="6"/>
      <path d="M0 95 Q275 86,550 92 T1100 89" fill="none" stroke="#86efac" stroke-width="3"/>
      ${[60,160,280,410,520,640,750,870,990].map((x,i) => `
        <g transform="translate(${x},${62+(i%3)*8})">
          <rect x="-5" y="28" width="10" height="26" fill="#92400e" rx="2"/>
          <ellipse cx="0" cy="18" rx="${16+(i%2)*5}" ry="${18+(i%3)*4}" fill="${['#16a34a','#15803d','#166534'][i%3]}"/>
          <ellipse cx="0" cy="12" rx="${9+(i%2)*3}" ry="${10+(i%3)*2}" fill="${['#22c55e','#4ade80','#86efac'][i%3]}" opacity=".7"/>
        </g>`).join('')}
      ${[110,230,360,480,600,720,840,960].map((x,i) => `
        <ellipse cx="${x}" cy="${93+(i%2)*4}" rx="${18+(i%3)*5}" ry="${12+(i%2)*4}" fill="#86efac" opacity=".65"/>`).join('')}
      <g transform="translate(200,28)"><path d="M0 0 Q8-10,16 0 Q8-5,0 0" fill="#1d4ed8" opacity=".9"/></g>
      <g transform="translate(720,20)"><path d="M0 0 Q10-13,20 0 Q10-6,0 0" fill="#1d4ed8" opacity=".9"/></g>
      <g transform="translate(950,34)"><path d="M0 0 Q7-9,14 0 Q7-4.5,0 0" fill="#1d4ed8" opacity=".9"/></g>
      <text x="330" y="46" style="font-size:18px">🦋</text>
      <text x="570" y="40" style="font-size:20px">🦗</text>
      <text x="810" y="52" style="font-size:18px">🦗</text>
      <text x="16" y="22" style="font-size:19px;font-weight:700;fill:#166534">陸域植被帶</text>
      <text x="16" y="38" style="font-size:20px;fill:#4b7c59">豐林橋沿線 38科 91種植物</text>
    </svg>`;
}

function bioWaterSceneSvg(fishSpecies) {
  const fishIcons = ['🐟','🐠','🦈','🐡','🐟','🐠','🦐','🦀','🐟'];
  const xs = [80,190,310,440,550,660,760,870,980];
  const ys = [55,38,62,45,70,40,55,65,48];
  return `
    <svg viewBox="0 0 1100 130" preserveAspectRatio="none" style="width:100%;height:110px;display:block">
      <rect width="1100" height="130" fill="#e0f7fa" rx="6"/>
      <rect x="0" y="0" width="1100" height="130" fill="#bae6fd" opacity=".35"/>
      ${[130,290,460,590,720,890].map((x,i) => `
        <ellipse cx="${x}" cy="${108+(i%2)*8}" rx="${24+(i%3)*9}" ry="${12+(i%2)*4}" fill="#94a3b8" opacity=".6"/>`).join('')}
      ${[50,180,320,470,600,740,860,1000].map((x,i) => `
        <circle cx="${x}" cy="${22+(i%4)*18}" r="${3+(i%3)}" fill="#fff" opacity=".45"/>`).join('')}
      <text x="240" y="82" style="font-size:19px" opacity=".9">🪲</text>
      <text x="420" y="94" style="font-size:19px" opacity=".9">🪲</text>
      <text x="650" y="79" style="font-size:19px" opacity=".9">🪲</text>
      <text x="830" y="90" style="font-size:19px" opacity=".9">🪲</text>
      <text x="970" y="98" style="font-size:20px">🦐</text>
      ${xs.slice(0, Math.min(xs.length, fishSpecies.length)).map((x, i) => {
        const sp = fishSpecies[i];
        return `<g>
          <text x="${x}" y="${ys[i]}" style="font-size:20px">${fishIcons[i%fishIcons.length]}</text>
          <text x="${x-18}" y="${ys[i]+18}" style="font-size:19px;font-weight:700;fill:#0369a1;stroke:#fff;stroke-width:3px;paint-order:stroke">${fish_escape((sp?.species||'').slice(0,4))}</text>
        </g>`;
      }).join('')}
      <text x="16" y="22" style="font-size:19px;font-weight:700;fill:#0369a1">水域帶</text>
      <text x="16" y="38" style="font-size:20px;fill:#0369a1;opacity:.85">魚類・水棲昆蟲・甲殼類</text>
    </svg>`;
}

function injectBioMapStyles() {
  const existing = document.getElementById('bioMapStyles');
  if (existing) existing.remove();   // 每次強制更新
  const s = document.createElement('style');
  s.id = 'bioMapStyles';
  s.textContent = `
    .biomap-shell{display:flex;flex-direction:column;gap:0}
    .biomap-org-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:14px}
    .biomap-cat-block{padding:16px 16px;border-radius:0 12px 12px 0}
    .biomap-cat-header:hover{opacity:.9}
    .biomap-cat-body{display:none}
    .bio-table tr{cursor:pointer}
    .bio-table tr:hover td{background:#f0f9ff}
    .bio-detail-row{background:#f8fafc!important}
    @media(max-width:680px){.biomap-org-grid{grid-template-columns:1fr}}
    .bio-gis-legend{display:none}
    .bio-legend-side{width:280px;flex-shrink:0;overflow-y:auto;max-height:580px;
      background:#fafcff;border-left:2px solid #e2e8f0;padding:20px 18px;font-size:19px}
    .bio-legend-side::-webkit-scrollbar{width:4px}
    .bio-legend-side::-webkit-scrollbar-thumb{background:#cbd5e1;border-radius:4px}
  `;
  document.head.appendChild(s);
}

/* ── 魚類照片 Lightbox 放大檢視 ── */
function fishPhotoLightbox(src, name, caption) {
  // 移除已存在的 lightbox
  const existing = document.getElementById('fishLightboxOverlay');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.id = 'fishLightboxOverlay';
  overlay.style.cssText = [
    'position:fixed;inset:0;z-index:9999',
    'background:rgba(0,0,0,.88)',
    'display:flex;flex-direction:column;align-items:center;justify-content:center',
    'cursor:zoom-out;padding:20px;box-sizing:border-box',
    'animation:fishLbFadeIn .2s ease'
  ].join(';');

  overlay.innerHTML = `
    <style>
      @keyframes fishLbFadeIn { from { opacity:0 } to { opacity:1 } }
      @keyframes fishLbSlideUp { from { transform:scale(.92);opacity:0 } to { transform:scale(1);opacity:1 } }
    </style>
    <div style="position:relative;max-width:90vw;max-height:80vh;animation:fishLbSlideUp .25s ease">
      <img src="${src}" alt="${name}"
        style="max-width:90vw;max-height:80vh;object-fit:contain;border-radius:10px;
               box-shadow:0 24px 64px rgba(0,0,0,.7);display:block"
        onerror="this.src='/webapp/assets/fish-photos/field-measurement.jpg'">
      <button onclick="document.getElementById('fishLightboxOverlay').remove()"
        style="position:absolute;top:-14px;right:-14px;width:36px;height:36px;border-radius:50%;
               background:#fff;border:none;font-size:18px;cursor:pointer;
               box-shadow:0 3px 12px rgba(0,0,0,.4);line-height:1;display:flex;
               align-items:center;justify-content:center">✕</button>
    </div>
    <div style="margin-top:14px;text-align:center;color:#fff">
      <div style="font-size:20px;font-weight:800;margin-bottom:4px">${name}</div>
      ${caption ? `<div style="font-size:18px;color:#cbd5e1;max-width:500px;line-height:1.5">${caption}</div>` : ''}
      <div style="font-size:20px;color:#64748b;margin-top:8px">點擊任意處關閉</div>
    </div>
  `;

  overlay.addEventListener('click', e => {
    if (e.target === overlay) overlay.remove();
  });
  document.addEventListener('keydown', function esc(e) {
    if (e.key === 'Escape') { overlay.remove(); document.removeEventListener('keydown', esc); }
  });

  document.body.appendChild(overlay);
}
