// 魚類資料庫模組
let fishFilter = { keyword: '', conservation: '' };
// ── 所有物種均使用真實田野實拍或標準照（jpg），不再使用 SVG 插圖 ──

const FISH_PHOTO_LIBRARY = {
  '臺灣白甲魚': {
    image: '/webapp/assets/fish-photos/taiwan-shovel-jaw-carp.jpg',
    source: '02_魚類與棲地資料庫／施工前魚類調查嵌入影像',
    caption: '溪流魚類量測實拍，臺灣白甲魚（Onychostoma barbatulum）代表影像'
  },
  '粗首馬口鱲': {
    image: '/webapp/assets/fish-photos/zacco-pachycephalus.jpg',
    source: '02_魚類與棲地資料庫／施工前魚類調查嵌入影像',
    caption: '溪流魚類量測實拍，粗首馬口鱲（Zacco pachycephalus）代表影像'
  },
  '臺灣鬚鱲': {
    image: '/webapp/assets/fish-photos/candidia-barbata.jpg',
    source: '02_魚類與棲地資料庫／施工前魚類調查嵌入影像',
    caption: '魚體量測實拍，臺灣鬚鱲（Candidia barbata）代表影像'
  },
  '臺灣石魚賓': {
    image: '/webapp/assets/fish-photos/field-measurement.jpg',
    source: '02_魚類與棲地資料庫／施工前魚類調查嵌入影像',
    caption: '臺灣石魚賓（Acrossocheilus paradoxus）量測實拍；封溪護魚保護物種'
  },
  '纓口臺鰍': {
    image: '/webapp/assets/fish-photos/field-measurement.jpg',
    source: '02_魚類與棲地資料庫／施工前魚類調查嵌入影像',
    caption: '纓口臺鰍（Formosania lacustre）底棲魚類調查實拍'
  },
  '明潭吻鰕虎': {
    image: '/webapp/assets/fish-photos/mingtan-rhinogobius-field-framed.jpg',
    source: '工作站魚類調查田野記錄（量尺盤實拍）',
    caption: '明潭吻鰕虎（Rhinogobius candidianus）橫流溪工作站調查田野實拍；已重新取景使魚體主角上移並置中，底棲鰕虎科，大圓頭、褐色斑紋為辨識特徵',
    position: 'center 58%'
  },
  '臺灣間爬岩鰍': {
    image: '/webapp/assets/fish-photos/hemimyzon-formosanus.jpg',
    source: '網路補充標準照：FishBase／Photo by Liao, T.-Y.；報告書影像未找到可明確確認之橫流溪田野特寫',
    caption: '臺灣間爬岩鰍（Hemimyzon formosanus）俯視標準照；用於修正原先誤置之田野照片，體縱扁，胸鰭極寬大平展，黑底金黃斑紋為辨識特徵',
    position: 'center center'
  },
  '短臀瘋鱨': {
    image: '/webapp/assets/fish-photos/tachysurus-brevianalis.jpg',
    source: '網路補充實體照：FishBase／Pseudobagrus brevianalis，Photo by Liao, T.-Y.；報告書影像未找到可明確確認之橫流溪田野特寫',
    caption: '短臀瘋鱨（Tachysurus brevianalis／Pseudobagrus brevianalis）鱨科夜行性底棲魚類；採用真實魚體照片，深褐色體背、細長觸鬚為辨識重點',
    position: 'center center'
  },
  '短吻紅斑吻鰕虎': {
    image: '/webapp/assets/fish-photos/rhinogobius-rubromaculatus-field.jpg',
    source: '使用者提供之108.4.17田野辨識照片',
    caption: '短吻紅斑吻鰕虎（Rhinogobius rubromaculatus）田野辨識照片；已修正原先誤用其他鰕虎照片的問題',
    position: 'center center'
  }
};

function renderFish() {
  document.getElementById('contentArea').innerHTML = `
    <div class="tabs">
      <button class="tab-btn active" onclick="switchFishTab('list', this)">魚類記錄</button>
      <button class="tab-btn" onclick="switchFishTab('species', this)">物種總覽</button>
      <button class="tab-btn" onclick="switchFishTab('news', this)">魚類新聞</button>
      <button class="tab-btn" onclick="switchFishTab('map', this)">分布地圖</button>
      <button class="tab-btn" onclick="switchFishTab('biomap', this)">陸域・水域生物分布</button>
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
  if (tab === 'list') renderFishList();
  else if (tab === 'species') renderFishSpecies();
  else if (tab === 'news') renderFishNews();
  else if (tab === 'biomap') renderFishBioMap();
  else renderFishMap();
}

function renderFishList() {
  const data = DB.getAll('fish');
  const totalCount = data.reduce((s, f) => s + (Number(f.count) || 0), 0);
  const species = [...new Set(data.map(f => f.species))].length;
  const protected_ = data.filter(f => f.conservation && f.conservation !== '一般').length;

  const container = document.getElementById('fishTabContent');
  container.innerHTML = `
    <!-- 統計橫幅 -->
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:10px;margin-bottom:16px">
      ${[
        ['fa-fish','#0e7490','#cffafe',`${species} 種`,'記錄物種'],
        ['fa-tally','#166534','#dcfce7',`${data.length} 筆`,'調查記錄'],
        ['fa-hashtag','#1d4ed8','#dbeafe',`${totalCount} 尾`,'累計尾次'],
        ['fa-shield-halved','#dc2626','#fee2e2',`${protected_} 種`,'保育物種']
      ].map(([ic,col,bg,val,lbl]) => `
        <div style="background:${bg};border-radius:10px;padding:14px 16px;display:flex;align-items:center;gap:12px">
          <div style="font-size:24px;color:${col}"><i class="fas ${ic}"></i></div>
          <div>
            <div style="font-size:22px;font-weight:900;color:${col};line-height:1">${val}</div>
            <div style="font-size:13px;color:#64748b">${lbl}</div>
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
        style="padding:10px 16px;border:2px solid #e2e8f0;border-radius:10px;font-size:16px;color:#334155;background:#fff;min-width:150px">
        <option value="">全部保育等級</option>
        <option value="瀕危">瀕危</option>
        <option value="易危">易危</option>
        <option value="近危">近危</option>
        <option value="一般">一般</option>
      </select>
      <button onclick="openFishForm()"
        style="padding:10px 20px;background:var(--primary,#1a6b3c);color:#fff;border:none;border-radius:10px;font-size:16px;font-weight:700;cursor:pointer;white-space:nowrap">
        <i class="fas fa-plus"></i> 新增記錄
      </button>
    </div>

    <!-- 卡片列表 -->
    <div id="fishTable"></div>
  `;
  loadFishTable();
}

function loadFishTable() {
  let data = DB.getAll('fish');
  const kw = document.getElementById('fishSearch')?.value?.toLowerCase() || '';
  const cf = document.getElementById('fishConservationFilter')?.value || '';
  if (kw) data = data.filter(f => f.species.toLowerCase().includes(kw) || (f.scientificName || '').toLowerCase().includes(kw));
  if (cf) data = data.filter(f => f.conservation === cf);

  const cMap = { '瀕危':['#b91c1c','#fee2e2'], '易危':['#d97706','#fef9c3'], '近危':['#2563eb','#dbeafe'], '一般':['#16a34a','#dcfce7'] };

  if (!data.length) {
    document.getElementById('fishTable').innerHTML = '<div class="empty-state"><i class="fas fa-fish"></i><p>查無記錄</p></div>';
    return;
  }

  document.getElementById('fishTable').innerHTML = `
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:18px;padding:4px 0">
      ${data.map(f => {
        const photo = fish_photoFor(f);
        const fallback = '/webapp/assets/fish-photos/field-measurement.jpg';
        const [ccl, cbg] = cMap[f.conservation] || ['#475569','#f1f5f9'];
        const cardId = `fishcard_${f.id}`;
        return `
          <div style="background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 2px 12px rgba(15,23,42,.1);border:1px solid #e2e8f0;display:flex;flex-direction:column">

            <!-- 照片區 -->
            <div style="position:relative;height:190px;overflow:hidden;background:#e5e7eb;cursor:pointer" onclick="fishCardToggle('${cardId}')">
              <img src="${photo.image}" alt="${fish_escape(f.species)}"
                style="width:100%;height:100%;object-fit:cover;object-position:${fish_escape(photo.position||'center center')};transition:transform .3s"
                onerror="this.src='${fallback}'"
                onmouseover="this.style.transform='scale(1.04)'" onmouseout="this.style.transform='scale(1)'">
              <!-- 保育等級 badge -->
              <div style="position:absolute;top:12px;right:12px">
                <span style="background:${ccl};color:#fff;font-size:15px;font-weight:800;padding:5px 14px;border-radius:999px;box-shadow:0 2px 8px rgba(0,0,0,.25)">${f.conservation||'一般'}</span>
              </div>
              <!-- 科別 badge -->
              <div style="position:absolute;top:12px;left:12px">
                <span style="background:rgba(15,23,42,.72);color:#fff;font-size:13px;padding:4px 10px;border-radius:999px">${f.family||'-'}</span>
              </div>
            </div>

            <!-- 主資訊區 -->
            <div style="padding:16px 18px 12px;flex:1;cursor:pointer" onclick="fishCardToggle('${cardId}')">
              <div style="font-size:22px;font-weight:800;color:#0f172a;margin-bottom:4px;line-height:1.2">${fish_escape(f.species)}</div>
              <div style="font-size:14px;font-style:italic;color:#64748b;margin-bottom:12px">${fish_escape(f.scientificName||'')}</div>

              <!-- 3欄數字 -->
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
                  <div style="font-size:13px;font-weight:600;color:#334155;line-height:1.3">${fish_escape((f.recorder||'-').replace('成果報告','').replace('生態調查','').trim())}</div>
                  <div style="font-size:12px;color:#64748b;margin-top:2px">記錄來源</div>
                </div>
              </div>

              <!-- 位置 -->
              <div style="font-size:14px;color:#334155;background:#f8fafc;border-left:3px solid #0e7490;padding:8px 12px;border-radius:0 6px 6px 0;line-height:1.5">
                <i class="fas fa-map-marker-alt" style="color:#0e7490;margin-right:4px"></i>${fish_escape(f.location||'-')}
              </div>

              <!-- 展開提示 -->
              <div style="text-align:center;margin-top:10px;color:#94a3b8;font-size:13px">
                <span id="${cardId}_hint"><i class="fas fa-chevron-down"></i> 點選查看詳情</span>
              </div>
            </div>

            <!-- 展開詳情區 -->
            <div id="${cardId}" style="display:none;border-top:1px solid #e2e8f0;padding:14px 18px;background:#f8fafc">
              <div style="font-size:13px;color:#64748b;margin-bottom:4px;font-weight:600">調查詳細資訊</div>
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:14px;margin-bottom:14px">
                <div><span style="color:#94a3b8">科別：</span><b>${fish_escape(f.family||'-')}</b></div>
                <div><span style="color:#94a3b8">保育等級：</span><span style="color:${ccl};font-weight:700">${fish_escape(f.conservation||'-')}</span></div>
                <div style="grid-column:1/-1"><span style="color:#94a3b8">學名：</span><em>${fish_escape(f.scientificName||'-')}</em></div>
                <div style="grid-column:1/-1"><span style="color:#94a3b8">記錄者：</span>${fish_escape(f.recorder||'-')}</div>
                ${f.note ? `<div style="grid-column:1/-1;background:#ecfdf5;border-left:3px solid #16a34a;padding:8px 10px;border-radius:0 6px 6px 0;color:#166534;font-size:13px;line-height:1.6">${fish_escape(f.note)}</div>` : ''}
              </div>
              <div style="display:flex;gap:10px">
                <button onclick="openFishForm(${f.id})"
                  style="flex:1;padding:10px;border:none;background:#0e7490;color:#fff;border-radius:8px;font-size:15px;font-weight:700;cursor:pointer">
                  <i class="fas fa-edit"></i> 編輯
                </button>
                <button onclick="deleteFish(${f.id})"
                  style="flex:1;padding:10px;border:none;background:#fee2e2;color:#b91c1c;border-radius:8px;font-size:15px;font-weight:700;cursor:pointer">
                  <i class="fas fa-trash"></i> 刪除
                </button>
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
            <div class="fish-card-photo" style="background-image:url('${photo.image}');background-position:${fish_escape(photo.position || 'center center')}" data-photo-src="${photo.image}">
              <div class="fish-card-photo-caption">${fish_escape(photo.caption)}</div>
            </div>
            <div class="card-body">
              <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
                <i class="fas fa-fish" style="color:${color};font-size:18px"></i>
                <div>
                  <div class="fw-600" style="font-size:15px">${s.species}</div>
                  <div style="font-style:italic;color:var(--text-light);font-size:12px">${s.scientificName || ''}</div>
                </div>
              </div>
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;font-size:12px;margin-bottom:10px">
                <div><span class="text-muted">科別：</span>${s.family || '-'}</div>
                <div><span class="text-muted">保育：</span><span class="badge badge-${s.conservation==='瀕危'?'danger':s.conservation==='易危'?'warning':s.conservation==='近危'?'info':'default'}" style="padding:1px 6px">${s.conservation}</span></div>
                <div><span class="text-muted">總尾數：</span><strong>${s.totalCount}</strong></div>
                <div><span class="text-muted">調查次：</span>${s.surveys}</div>
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
    tag: '流域生態',
    tagColor: '#0f766e',
    tagBg: '#ccfbf1',
    title: '愛戀大甲溪 走讀河口繽紛的動植物世界',
    source: '聯合新聞網',
    date: '2024',
    summary: '大甲溪全長142公里，流域蘊藏豐富自然生態。河口地帶有18種螃蟹、3種彈塗魚棲息，上游支流（含橫流溪）水質佳，原生魚類多樣性高，為臺灣重要的淡水生物廊道。',
    url: 'https://udn.com/news/story/6965/8103743',
    icon: 'fa-water'
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
    <div class="fish-news-toolbar">
      <div>
        <div style="font-size:12px;color:var(--text-muted);margin-bottom:4px">資料來源：02_魚類與棲地資料庫／施工前魚類調查與工作站魚類調查</div>
        <h3 style="margin:0;font-size:20px;color:#0f172a">橫流溪魚類新聞圖鑑</h3>
      </div>
      <div class="fish-news-stats">
        ${fish_newsStat('記錄物種', species.length, '種')}
        ${fish_newsStat('累計尾次', totalCount, '尾')}
        ${fish_newsStat('敏感/保育', protectedCount, '種')}
      </div>
    </div>

    <div class="fish-news-grid">
      ${species.map(item => fish_newsCard(item)).join('')}
    </div>

    <!-- ══ 生態改善新聞區 ══ -->
    <div style="margin-top:32px">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:6px">
        <div style="width:5px;height:36px;background:linear-gradient(180deg,#0369a1,#0f766e);border-radius:4px;flex-shrink:0"></div>
        <div>
          <div style="font-size:22px;font-weight:900;color:#0f172a;line-height:1.1">生態改善・媒體報導</div>
          <div style="font-size:13px;color:#64748b;margin-top:3px">橫流溪及大甲溪流域相關報導・保育政策・學術研究</div>
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
                  padding:2px 10px;font-size:12px;font-weight:800;letter-spacing:.5px">${n.tag}</span>
                <div style="font-size:12px;color:#64748b;margin-top:4px">
                  <i class="fas fa-newspaper" style="font-size:11px"></i> ${n.source}
                  <span style="margin-left:8px"><i class="fas fa-calendar-alt" style="font-size:11px"></i> ${n.date}</span>
                </div>
              </div>
            </div>
            <!-- 內文 -->
            <div style="padding:16px 18px 18px;flex:1;display:flex;flex-direction:column;gap:8px">
              <div style="font-size:16px;font-weight:800;color:#0f172a;line-height:1.45">${n.title}</div>
              <div style="font-size:14px;color:#374151;line-height:1.7;flex:1">${n.summary}</div>
              <div style="display:flex;align-items:center;gap:6px;margin-top:4px;
                   color:${n.tagColor};font-size:13px;font-weight:700">
                <i class="fas fa-arrow-up-right-from-square" style="font-size:12px"></i> 閱讀完整報導
              </div>
            </div>
          </a>`).join('')}
      </div>
    </div>
  `;
  setTimeout(fish_checkCardPhotos, 150);
}

function fish_groupSpecies() {
  const data = DB.getAll('fish');
  const species = {};
  data.forEach(f => {
    if (!species[f.species]) species[f.species] = { ...f, totalCount: 0, surveys: 0, records: [] };
    species[f.species].totalCount += Number(f.count) || 0;
    species[f.species].surveys++;
    species[f.species].records.push(f);
  });
  return species;
}

function fish_photoFor(f) {
  return FISH_PHOTO_LIBRARY[f.species] || FISH_PHOTO_LIBRARY[(f.species || '').replace(/（.*$/, '')] || {
    image: '/webapp/assets/fish-photos/field-measurement.jpg',
    source: '02_魚類與棲地資料庫／魚類調查影像',
    caption: '橫流溪魚類調查代表影像'
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
  const latest = (item.records || []).slice().sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')))[0] || item;
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
        <div class="fish-news-kicker">${fish_escape(latest.date || '調查資料')} · ${fish_escape(item.family || '魚類')}</div>
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

// ── 陸域・水域生物分布圖（含互動地圖） ─────────────────────────────────────

let biogisMap = null;
let bioLayerGroups = {};
let bioLayerVisible = { facilities: true, landanimals: true, fishspecies: true };

const BIO_LAND_DATA = [
  {
    category: '濱溪植物',
    icon: 'fa-seedling',
    color: '#166534',
    bg: '#dcfce7',
    border: '#bbf7d0',
    items: [
      { name: '原生種植物', detail: '61 種，含臺灣特有種 4 種', tag: '原生' },
      { name: '歸化種植物', detail: '30 種，外來歸化植物', tag: '歸化' },
      { name: '豐林橋沿線植被', detail: '上下游各 200m，38 科 91 種', tag: '全域' }
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
      { name: '粗糙沼蝦', detail: 'Macrobrachium asperulum，陷阱法捕獲', tag: '甲殼' }
    ]
  }
];

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
        <div style="font-size:13px;color:#94a3b8;margin-bottom:4px">
          資料來源：東勢處水域友善監測追蹤報告 · 橫流溪魚類資料庫 · 112年6月植物調查
        </div>
        <h2 style="margin:0 0 4px;font-size:28px;font-weight:900;color:#0f172a;letter-spacing:-.5px">
          橫流溪陸域・水域生物分布圖
        </h2>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px">
          <span style="background:#dcfce7;color:#166534;border:1px solid #bbf7d0;border-radius:6px;padding:4px 12px;font-size:14px;font-weight:700"><i class="fas fa-mountain-sun"></i> 陸域生態 6 大類</span>
          <span style="background:#cffafe;color:#0e7490;border:1px solid #a5f3fc;border-radius:6px;padding:4px 12px;font-size:14px;font-weight:700"><i class="fas fa-water"></i> 水域生態 3 大類</span>
        </div>
      </div>

      <!-- ══ SECTION 1：生態概況統計 ══ -->
      ${bioSecHead('1','fa-chart-bar','生態概況統計','橫流溪場域生物多樣性總覽','#1e40af')}
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:12px;margin-bottom:28px">
        ${bioStat('濱溪植物', '91 種', '38 科，特有種 4', '#166534', '#dcfce7', 'fa-seedling')}
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
            <span style="font-size:14px;font-weight:700;color:#0369a1;margin-right:6px">底圖：</span>
            <select id="bioBaseMapSel" onchange="biogisChangeBase(this.value)"
              style="padding:6px 12px;border:1px solid #bae6fd;border-radius:8px;font-size:14px;color:#0369a1;background:#fff">
              <option value="hybrid">🛰️ 衛星+地名</option>
              <option value="satellite">🛰️ 衛星影像</option>
              <option value="road">🗺️ 道路圖</option>
            </select>
            <span style="font-size:14px;font-weight:700;color:#0369a1;margin-left:8px">圖層：</span>
            ${biogisLayerToggle('facilities','hard-hat','#1565c0','工程設施')}
            ${biogisLayerToggle('landanimals','mountain-sun','#166534','陸域動物')}
            ${biogisLayerToggle('fishspecies','fish','#0284c7','魚種標記')}
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
              <div style="font-size:16px;font-weight:900;color:#166534;margin-bottom:10px;display:flex;align-items:center;gap:7px;border-bottom:3px solid #bbf7d0;padding-bottom:6px">
                <i class="fas fa-mountain-sun" style="font-size:15px"></i> 陸域動物
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
                    <div style="font-size:15px;font-weight:800;color:#0f172a">${name}</div>
                    <div style="font-size:13px;color:#64748b;margin-top:2px;line-height:1.4">${sub}</div>
                  </div>
                </div>`).join('')}
            </div>

            <!-- ② 水域魚類 -->
            <div style="margin-bottom:20px">
              <div style="font-size:16px;font-weight:900;color:#0e7490;margin-bottom:10px;display:flex;align-items:center;gap:7px;border-bottom:3px solid #a5f3fc;padding-bottom:6px">
                <i class="fas fa-fish" style="font-size:15px"></i> 水域魚類
              </div>
              ${[
                ['carp',  '#dc2626','瀕　　危','臺灣白甲魚・纓口臺鰍'],
                ['minnow','#d97706','易　　危','高身鏟頷魚'],
                ['loach', '#2563eb','近　　危','臺灣石魚賓・臺灣間爬岩鰍'],
                ['goby',  '#16a34a','一　　般','臺灣鬚鱲・明潭吻蝦虎']
              ].map(([shape,col,tag,ex])=>`
                <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px">
                  <div style="width:44px;height:28px;flex-shrink:0;filter:drop-shadow(0 1px 3px rgba(0,0,0,.30))">
                    ${fish_speciesSvg(shape)}
                  </div>
                  <div>
                    <div style="font-size:15px;font-weight:800;color:${col}">${tag}</div>
                    <div style="font-size:13px;color:#64748b;margin-top:2px;line-height:1.4">${ex}</div>
                  </div>
                </div>`).join('')}
            </div>

            <!-- ③ 工程構造物 -->
            <div>
              <div style="font-size:16px;font-weight:900;color:#1565c0;margin-bottom:10px;display:flex;align-items:center;gap:7px;border-bottom:3px solid #bfdbfe;padding-bottom:6px">
                <i class="fas fa-hard-hat" style="font-size:15px"></i> 工程構造物
              </div>
              ${[
                ['#1565c0','fa-fish',       '魚道設施','之字形・階梯式・斜坡式'],
                ['#795548','fa-water',      '防砂壩',  '攔砂壩・固床工'],
                ['#827717','fa-layer-group','固床工',  '階段式・粗石面']
              ].map(([col,ic,name,sub])=>`
                <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px">
                  <div style="width:42px;height:42px;border-radius:50%;background:${col};
                       display:flex;align-items:center;justify-content:center;
                       flex-shrink:0;box-shadow:0 2px 8px rgba(0,0,0,.22)">
                    <i class="fas ${ic}" style="color:#fff;font-size:18px"></i>
                  </div>
                  <div>
                    <div style="font-size:15px;font-weight:800;color:#0f172a">${name}</div>
                    <div style="font-size:13px;color:#64748b;margin-top:2px;line-height:1.4">${sub}</div>
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
      <div class="card" style="margin-top:0;border-top:4px solid #0284c7">
        <div class="card-header" style="background:#f0f9ff">
          <span class="card-title" style="font-size:18px"><i class="fas fa-fish" style="color:#0e7490"></i> 水域魚類清單（${fishSpecies.length} 種）</span>
          <span style="font-size:14px;color:#64748b">點擊列展開詳情</span>
        </div>
        <div class="card-body" style="padding:0">
          <table class="bio-table" style="width:100%;border-collapse:collapse;font-size:15px">
            <thead>
              <tr style="background:#f0f9ff;border-bottom:2px solid #bae6fd">
                <th style="padding:12px 16px;text-align:left;color:#0369a1;font-size:14px">物種</th>
                <th style="padding:12px 10px;text-align:center;color:#0369a1;font-size:14px">保育</th>
                <th style="padding:12px 10px;text-align:center;color:#0369a1;font-size:14px">尾次</th>
                <th style="padding:12px 10px;text-align:center;color:#0369a1;font-size:14px">位置</th>
                <th style="padding:12px 10px;text-align:center;color:#0369a1;font-size:14px">地圖</th>
                <th style="padding:12px 10px;text-align:center;color:#0369a1;font-size:14px">詳情</th>
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
                      <span style="background:${cbg};color:${ccl};padding:4px 10px;border-radius:999px;font-size:13px;font-weight:700">${fish_escape(sp.conservation)}</span>
                    </td>
                    <td style="padding:12px 10px;text-align:center;font-weight:800;font-size:17px;color:#0e7490">${sp.totalCount}</td>
                    <td style="padding:12px 10px;text-align:center">
                      <span style="background:#e0f2fe;color:#0369a1;padding:4px 10px;border-radius:999px;font-size:13px;font-weight:600">${zoneLabel}</span>
                    </td>
                    <td style="padding:12px 10px;text-align:center" onclick="event.stopPropagation()">
                      <button onclick="biogisLocate(${zoneLat},120.9092,'${fish_escape(sp.species)}')"
                        style="border:none;background:#0369a1;color:#fff;border-radius:8px;padding:6px 10px;font-size:13px;cursor:pointer">
                        <i class="fas fa-map-pin"></i>
                      </button>
                    </td>
                    <td style="padding:12px 10px;text-align:center">
                      <span id="${rid}_btn" style="color:#94a3b8;font-size:14px"><i class="fas fa-chevron-down"></i></span>
                    </td>
                  </tr>
                  <tr id="${rid}" style="display:none" class="bio-detail-row">
                    <td colspan="6" style="padding:14px 20px;background:#f8fafc;border-bottom:2px solid #e0f2fe">
                      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:10px;font-size:14px">
                        <div><span style="color:#64748b">學名：</span><em>${fish_escape(sp.scientificName||'-')}</em></div>
                        <div><span style="color:#64748b">科別：</span>${fish_escape(sp.family||'-')}</div>
                        <div><span style="color:#64748b">調查筆數：</span><b>${sp.surveys} 筆</b></div>
                        <div><span style="color:#64748b">位置：</span>${fish_escape(sp.location||'-')}</div>
                        ${habitatHint ? `<div style="grid-column:1/-1;color:#475569;border-left:3px solid #0e7490;padding-left:10px;line-height:1.6">${fish_escape(habitatHint)}</div>` : ''}
                        ${sp.note && sp.note !== habitatHint ? `<div style="grid-column:1/-1;font-size:13px;color:#64748b;line-height:1.6">${fish_escape(sp.note.split('；').slice(0,2).join('；'))}</div>` : ''}
                      </div>
                    </td>
                  </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <!-- ── 橫流溪歷年樣點生態調查彙整（109～114年）── -->
      <div class="card" style="margin-top:16px">
        <div class="card-header">
          <span class="card-title" style="font-size:17px"><i class="fas fa-table" style="color:#0e7490"></i> 橫流溪歷年樣點生態調查彙整（109～114年）</span>
          <span style="font-size:13px;color:#64748b">資料來源：農業部林業及自然保育署臺中分署・場域生態資源保全</span>
        </div>
        <div class="card-body">
          <!-- 統計橫幅 -->
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:10px;margin-bottom:18px">
            ${[
              ['fa-fish','#0e7490','#cffafe','魚類總計','1,522 尾','8 種・6 樣站'],
              ['fa-shrimp','#b45309','#fef3c7','蝦蟹總計','372 尾','2 種・6 樣站'],
              ['fa-shield-halved','#dc2626','#fee2e2','外來入侵種','0 種','目前並無調查到'],
              ['fa-plus-circle','#166534','#dcfce7','新增物種','短臀瘋鱨','新增記錄魚種']
            ].map(([ic,col,bg,label,val,sub]) => `
              <div style="background:${bg};border-radius:10px;padding:14px 16px;text-align:center">
                <div style="font-size:22px;color:${col};margin-bottom:4px"><i class="fas ${ic}"></i></div>
                <div style="font-size:13px;color:#64748b">${label}</div>
                <div style="font-size:20px;font-weight:800;color:${col};line-height:1.2">${val}</div>
                <div style="font-size:12px;color:#94a3b8;margin-top:2px">${sub}</div>
              </div>
            `).join('')}
          </div>

          <!-- 魚類調查表 -->
          <div style="font-size:15px;font-weight:700;color:#0e7490;margin-bottom:8px"><i class="fas fa-fish"></i> 魚類調查種類數量</div>
          <div style="overflow-x:auto;margin-bottom:18px">
            <table style="width:100%;border-collapse:collapse;font-size:14px;min-width:560px">
              <thead>
                <tr style="background:#e0f7fa">
                  <th style="padding:8px 10px;border:1px solid #b2ebf2;color:#0e7490;text-align:left">科</th>
                  <th style="padding:8px 10px;border:1px solid #b2ebf2;color:#0e7490;text-align:left">物種</th>
                  <th style="padding:8px 10px;border:1px solid #b2ebf2;color:#0e7490;text-align:center">st.1</th>
                  <th style="padding:8px 10px;border:1px solid #b2ebf2;color:#0e7490;text-align:center">st.2</th>
                  <th style="padding:8px 10px;border:1px solid #b2ebf2;color:#0e7490;text-align:center">st.3</th>
                  <th style="padding:8px 10px;border:1px solid #b2ebf2;color:#0e7490;text-align:center">st.4</th>
                  <th style="padding:8px 10px;border:1px solid #b2ebf2;color:#0e7490;text-align:center">st.5</th>
                  <th style="padding:8px 10px;border:1px solid #b2ebf2;color:#0e7490;text-align:center">st.6</th>
                  <th style="padding:8px 10px;border:1px solid #b2ebf2;color:#0284c7;text-align:center;font-weight:800">總計</th>
                </tr>
              </thead>
              <tbody>
                ${[
                  ['爬鰍科','臺灣間爬岩鰍',7,2,'',3,'',38,50],
                  ['','纓口臺鰍',53,26,12,19,4,43,157],
                  ['鯉科','臺灣白甲魚',48,94,73,91,36,68,410],
                  ['','臺灣石魚賓',46,51,79,63,10,39,288],
                  ['','臺灣鬚鱲',37,34,29,50,52,81,283],
                  ['蝦虎科','明潭吻蝦虎',84,58,51,57,37,30,317],
                  ['','短吻紅斑吻蝦虎',2,4,2,3,2,1,14],
                  ['鱨科','短臀瘋鱨',1,1,'','',1,1,4]
                ].map((r,i) => `
                  <tr style="${i%2===0?'background:#f0fdfa':'background:#fff'}">
                    <td style="padding:7px 10px;border:1px solid #e0f2fe;font-weight:${r[0]?700:400};color:${r[0]?'#0f172a':'transparent'}">${r[0]||'─'}</td>
                    <td style="padding:7px 10px;border:1px solid #e0f2fe;font-weight:600">${r[1]}</td>
                    ${r.slice(2,8).map(v=>`<td style="padding:7px 10px;border:1px solid #e0f2fe;text-align:center;color:${v?'#374151':'#cbd5e1'}">${v||'－'}</td>`).join('')}
                    <td style="padding:7px 10px;border:1px solid #b2ebf2;text-align:center;font-weight:800;color:#0e7490;background:#e0f7fa">${r[8]}</td>
                  </tr>
                `).join('')}
                <tr style="background:#e0f7fa;font-weight:800">
                  <td colspan="2" style="padding:8px 10px;border:1px solid #b2ebf2;color:#0e7490">總計</td>
                  ${[278,269,246,286,142,301].map(v=>`<td style="padding:8px 10px;border:1px solid #b2ebf2;text-align:center;color:#0e7490">${v}</td>`).join('')}
                  <td style="padding:8px 10px;border:1px solid #b2ebf2;text-align:center;color:#0284c7;font-size:16px">1,522</td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- 蝦蟹類調查表 -->
          <div style="font-size:15px;font-weight:700;color:#b45309;margin-bottom:8px"><i class="fas fa-shrimp"></i> 蝦蟹類調查種類數量</div>
          <div style="overflow-x:auto">
            <table style="width:100%;border-collapse:collapse;font-size:14px;min-width:560px">
              <thead>
                <tr style="background:#fef9c3">
                  <th style="padding:8px 10px;border:1px solid #fde68a;color:#b45309;text-align:left">科</th>
                  <th style="padding:8px 10px;border:1px solid #fde68a;color:#b45309;text-align:left">物種</th>
                  <th style="padding:8px 10px;border:1px solid #fde68a;color:#b45309;text-align:center">st.1</th>
                  <th style="padding:8px 10px;border:1px solid #fde68a;color:#b45309;text-align:center">st.2</th>
                  <th style="padding:8px 10px;border:1px solid #fde68a;color:#b45309;text-align:center">st.3</th>
                  <th style="padding:8px 10px;border:1px solid #fde68a;color:#b45309;text-align:center">st.4</th>
                  <th style="padding:8px 10px;border:1px solid #fde68a;color:#b45309;text-align:center">st.5</th>
                  <th style="padding:8px 10px;border:1px solid #fde68a;color:#b45309;text-align:center">st.6</th>
                  <th style="padding:8px 10px;border:1px solid #fde68a;color:#92400e;text-align:center;font-weight:800">總計</th>
                </tr>
              </thead>
              <tbody>
                ${[
                  ['長臂蝦科','日月潭澤蟹',8,2,1,2,5,3,21],
                  ['溪蟹科','粗糙沼蝦',56,36,66,40,70,83,351]
                ].map((r,i) => `
                  <tr style="${i%2===0?'background:#fffbeb':'background:#fff'}">
                    <td style="padding:7px 10px;border:1px solid #fde68a;font-weight:700">${r[0]}</td>
                    <td style="padding:7px 10px;border:1px solid #fde68a;font-weight:600">${r[1]}</td>
                    ${r.slice(2,8).map(v=>`<td style="padding:7px 10px;border:1px solid #fde68a;text-align:center">${v}</td>`).join('')}
                    <td style="padding:7px 10px;border:1px solid #fde68a;text-align:center;font-weight:800;color:#b45309;background:#fef9c3">${r[8]}</td>
                  </tr>
                `).join('')}
                <tr style="background:#fef9c3;font-weight:800">
                  <td colspan="2" style="padding:8px 10px;border:1px solid #fde68a;color:#b45309">總計</td>
                  ${[64,38,67,42,75,86].map(v=>`<td style="padding:8px 10px;border:1px solid #fde68a;text-align:center;color:#b45309">${v}</td>`).join('')}
                  <td style="padding:8px 10px;border:1px solid #fde68a;text-align:center;color:#92400e;font-size:16px">372</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- ── 紅外線相機記錄物種 ── -->
      <div class="card" style="margin-top:16px">
        <div class="card-header">
          <span class="card-title" style="font-size:17px"><i class="fas fa-camera" style="color:#92400e"></i> 紅外線自動相機記錄物種</span>
          <span style="font-size:13px;color:#64748b">場域生態資源保全・農業部林業及自然保育署臺中分署</span>
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
                <div style="font-size:16px;font-weight:800;color:#0f172a;margin-bottom:3px">${sp.name}</div>
                <div style="font-size:11px;font-style:italic;color:#64748b;margin-bottom:8px">${sp.sci}</div>
                <span style="font-size:11px;background:${sp.color};color:#fff;border-radius:999px;padding:2px 8px;font-weight:700">${sp.tag}</span>
                <div style="font-size:12px;color:#475569;margin-top:8px;line-height:1.4">${sp.note}</div>
              </div>
            `).join('')}
          </div>
          <div style="margin-top:14px;padding:10px 14px;background:#f8fafc;border-left:4px solid #92400e;border-radius:0 8px 8px 0;font-size:13px;color:#475569;line-height:1.6">
            <i class="fas fa-info-circle" style="color:#92400e"></i>
            <strong style="color:#92400e"> 說明：</strong>以上物種均由紅外線自動相機記錄，無外來或入侵物種，顯示橫流溪場域生態資源豐富，長期調查監測持續進行中。
          </div>
        </div>
      </div>

      <!-- ── 陸域生態參考資料 ── -->
      <div class="card" style="margin-top:16px">
        <div class="card-header">
          <span class="card-title" style="font-size:17px"><i class="fas fa-folder-open" style="color:#7c3aed"></i> 陸域生態參考資料</span>
          <span style="font-size:13px;color:#64748b">點選 PDF 可就地預覽；PPTX 點選下載開啟</span>
        </div>
        <div class="card-body">

          <!-- 文件卡列 -->
          <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:12px;margin-bottom:18px">
            ${[
              { icon:'fa-file-pdf', color:'#dc2626', bg:'#fee2e2', border:'#fca5a5',
                title:'麗陽站生物多樣性監測', sub:'112下半年・多物種多樣性與外來入侵種', type:'PDF',
                href:'/media/非橫流溪資料/02_其他流域生態/麗陽站多物多樣性與外來入侵種動物112下半年監測彙整表.pdf' },
              { icon:'fa-file-pdf', color:'#b45309', bg:'#fef3c7', border:'#fde68a',
                title:'大甲溪魚苗培育場址勘查', sub:'大甲溪2-2第一場・白鹿吊橋現地勘查', type:'PDF',
                href:'/media/非橫流溪資料/02_其他流域生態/大甲溪2-2第一場小平台白鹿吊橋魚苗培育場址現地勘查.pdf' },
              { icon:'fa-file-powerpoint', color:'#92400e', bg:'#fef9c3', border:'#fde68a',
                title:'臺灣黑熊保育研討', sub:'113年瀕危物種保育行動研討會・大雪山黑熊', type:'PPTX',
                href:'/media/非橫流溪資料/02_其他流域生態/黑熊簡報/113瀕危物種保育行動研討會_大雪山黑熊2.1.pptx' },
              { icon:'fa-file-powerpoint', color:'#7c3aed', bg:'#f5f3ff', border:'#ddd6fe',
                title:'鳥音監測教育訓練', sub:'Taiwan Bird Atlas・錄音機操作・嘉義分署2026', type:'PPTX',
                href:'/media/非橫流溪資料/02_其他流域生態/1150515_0423鳥音監測教育訓練/Taiwan Bird Atlas介紹、錄音機操作-嘉義分署_20260306.pptx' }
            ].map(d => `
              <div onclick="terrainDocOpen('${d.href}')"
                style="background:${d.bg};border:1px solid ${d.border};border-radius:10px;padding:14px 16px;cursor:pointer;transition:box-shadow .2s;display:flex;gap:12px;align-items:flex-start"
                onmouseover="this.style.boxShadow='0 4px 16px rgba(0,0,0,.12)'" onmouseout="this.style.boxShadow='none'">
                <div style="font-size:32px;color:${d.color};flex-shrink:0;margin-top:2px"><i class="fas ${d.icon}"></i></div>
                <div>
                  <div style="font-size:15px;font-weight:700;color:#0f172a;line-height:1.35;margin-bottom:4px">${d.title}</div>
                  <div style="font-size:12px;color:#64748b;line-height:1.5">${d.sub}</div>
                  <div style="margin-top:8px">
                    <span style="font-size:11px;background:${d.color};color:#fff;border-radius:999px;padding:2px 8px;font-weight:700">${d.type}</span>
                    <span style="font-size:11px;color:${d.color};margin-left:6px">${d.type==='PDF'?'點選預覽':'點選下載'} ›</span>
                  </div>
                </div>
              </div>
            `).join('')}
          </div>

          <!-- PDF 預覽 iframe -->
          <div id="terrainDocPreview" style="display:none;border:1px solid #e2e8f0;border-radius:10px;overflow:hidden;margin-bottom:16px">
            <div style="background:#f8fafc;padding:8px 14px;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #e2e8f0">
              <span id="terrainDocLabel" style="font-size:14px;font-weight:600;color:#0f172a"></span>
              <button onclick="document.getElementById('terrainDocPreview').style.display='none'"
                style="border:none;background:#e2e8f0;border-radius:6px;padding:4px 10px;cursor:pointer;font-size:13px;color:#475569">✕ 關閉</button>
            </div>
            <iframe id="terrainDocFrame" src="" style="width:100%;height:520px;border:none"></iframe>
          </div>

        </div>
      </div>

    </div>
  `;

  setTimeout(() => initBioGISMap(fishSpecies, facilities), 120);
}

/* ── 陸域生態文件/照片互動 ─────────────────────────────────────────────────── */
function terrainDocOpen(href) {
  const preview = document.getElementById('terrainDocPreview');
  const frame   = document.getElementById('terrainDocFrame');
  const label   = document.getElementById('terrainDocLabel');
  if (!preview || !frame) return;
  if (href.endsWith('.pptx') || href.endsWith('.PPTX')) {
    window.open(href, '_blank'); return;
  }
  // extract filename as label
  const name = decodeURIComponent(href.split('/').pop().replace('.pdf',''));
  if (label) label.textContent = name;
  preview.style.display = 'block';
  frame.src = href;
  preview.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function terrainPhotoOpen(src, caption) {
  // Simple lightbox using overlay
  let ov = document.getElementById('terrainPhotoOverlay');
  if (!ov) {
    ov = document.createElement('div');
    ov.id = 'terrainPhotoOverlay';
    ov.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(15,23,42,.88);display:flex;flex-direction:column;align-items:center;justify-content:center;padding:24px;cursor:pointer';
    ov.onclick = () => ov.remove();
    document.body.appendChild(ov);
  }
  ov.innerHTML = `
    <img src="${src}" alt="${caption}" style="max-width:90vw;max-height:78vh;border-radius:10px;box-shadow:0 8px 40px rgba(0,0,0,.5);object-fit:contain">
    <div style="color:#e2e8f0;font-size:14px;margin-top:14px;text-align:center;max-width:640px;line-height:1.5">${caption}</div>
    <button onclick="document.getElementById('terrainPhotoOverlay').remove()" style="position:absolute;top:16px;right:20px;background:rgba(255,255,255,.15);border:none;color:#fff;font-size:22px;cursor:pointer;border-radius:50%;width:36px;height:36px;display:flex;align-items:center;justify-content:center">✕</button>
  `;
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
  const satLayer  = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', { attribution:'Tiles © Esri', maxZoom:19 });
  const lblLayer  = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png', { subdomains:'abcd', maxZoom:19, opacity:.9 });
  const roadLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution:'© OpenStreetMap contributors', maxZoom:19 });

  window._biogisBaseLayers = { hybrid: L.layerGroup([satLayer, lblLayer]), satellite: satLayer, road: roadLayer };
  window._biogisCurrentBase = window._biogisBaseLayers.hybrid;
  window._biogisCurrentBase.addTo(biogisMap);

  // ── 圖層群組 ──
  bioLayerGroups = {
    landanimals: L.layerGroup().addTo(biogisMap),
    landanimals: L.layerGroup().addTo(biogisMap),
    fishspecies: L.layerGroup().addTo(biogisMap),
    facilities:  L.layerGroup().addTo(biogisMap)
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
               <div style="font-size:14px;font-weight:900;color:#0f172a;white-space:nowrap;
                 background:rgba(255,255,255,.96);border-radius:6px;padding:3px 9px;margin-top:3px;
                 border:2px solid ${def.color};line-height:1.5;box-shadow:0 2px 6px rgba(0,0,0,.20)">
                 ${def.name}
               </div>
             </div>`,
      iconSize:[48,72], iconAnchor:[24,24]
    });
    L.marker([def.lat, def.lng], { icon })
      .bindPopup(`<div style="min-width:190px;font-size:13px">
        <div style="font-weight:900;font-size:15px;color:${def.color};margin-bottom:5px">
          <i class="fas ${def.icon}"></i> ${def.name}</div>
        <div style="color:#334155;margin-bottom:6px;line-height:1.6">${def.sub}</div>
        <div style="font-size:11px;color:#64748b">📷 紅外線相機・現地調查記錄</div>
      </div>`, { maxWidth:240 })
      .addTo(bioLayerGroups.landanimals);
  });

  // ── 3. 魚種標記（SVG 魚形，與GIS整合地圖一致）──
  const cMapFish = { '瀕危':'#dc2626','易危':'#d97706','近危':'#2563eb','一般':'#16a34a' };
  const staticFishMarkers = [
    { lat:24.1758, lng:120.9082, species:'明潭吻蝦虎', sci:'Rhinogobius candidianus', conservation:'一般',  zone:'lower',  shape:'goby'   },
    { lat:24.1772, lng:120.9096, species:'臺灣鬚鱲',   sci:'Candidia barbatus',       conservation:'一般',  zone:'lower',  shape:'minnow' },
    { lat:24.1792, lng:120.9080, species:'臺灣石魚賓', sci:'Acrossocheilus paradoxus', conservation:'近危',  zone:'lower',  shape:'carp'   },
    { lat:24.1822, lng:120.9088, species:'臺灣間爬岩鰍',sci:'Hemimyzon formosanum',   conservation:'近危',  zone:'middle', shape:'loach'  },
    { lat:24.1838, lng:120.9102, species:'纓口臺鰍',   sci:'Crossostoma lacustre',    conservation:'瀕危',  zone:'middle', shape:'loach'  },
    { lat:24.1850, lng:120.9092, species:'臺灣白甲魚', sci:'Onychostoma barbatulum',   conservation:'瀕危',  zone:'upper',  shape:'carp'   },
    { lat:24.1862, lng:120.9104, species:'高身鏟頷魚', sci:'Onychostoma alticorpus',  conservation:'易危',  zone:'upper',  shape:'carp'   }
  ];

  staticFishMarkers.forEach(def => {
    const col = cMapFish[def.conservation] || '#0e7490';
    const icon = L.divIcon({
      className: '',
      html: `<div style="display:flex;flex-direction:column;align-items:center;cursor:pointer;
               filter:drop-shadow(0 3px 8px rgba(0,0,0,.50))">
               <div style="width:68px;height:42px">${fish_speciesSvg(def.shape)}</div>
               <div style="font-size:14px;font-weight:900;color:#0f172a;white-space:nowrap;
                 background:rgba(255,255,255,.96);border-radius:6px;padding:3px 9px;margin-top:2px;
                 border:2px solid ${col};line-height:1.5;box-shadow:0 2px 6px rgba(0,0,0,.20)">
                 ${def.species}
               </div>
             </div>`,
      iconSize: [68, 66], iconAnchor: [34, 21]
    });
    const zoneLabel = { lower:'下游', middle:'中游', upper:'上游' }[def.zone] || '全域';
    const bgCol = { '瀕危':'#fee2e2','易危':'#fef3c7','近危':'#dbeafe','一般':'#dcfce7' }[def.conservation] || '#f1f5f9';
    L.marker([def.lat, def.lng], { icon })
      .bindPopup(`<div style="min-width:200px;font-size:13px">
        <div style="font-weight:900;font-size:15px;color:#0f172a;margin-bottom:4px">${def.species}</div>
        <div style="font-size:12px;color:#64748b;font-style:italic;margin-bottom:8px">${def.sci}</div>
        <div style="display:flex;gap:6px;flex-wrap:wrap">
          <span style="background:${bgCol};color:${col};border:1.5px solid ${col};border-radius:6px;
            padding:3px 10px;font-size:13px;font-weight:800">${def.conservation}</span>
          <span style="background:#f1f5f9;color:#334155;border-radius:6px;padding:3px 10px;font-size:13px">
            ${zoneLabel}水域</span>
        </div>
        <div style="margin-top:7px;font-size:12px;color:#64748b">📋 109–114年橫流溪樣點記錄</div>
      </div>`, { maxWidth:260 })
      .addTo(bioLayerGroups.fishspecies);
  });

  // ── 4. 工程設施標記 ──
  const facColorMap = (f) => {
    if (/魚道/.test(f.type)) return '#1565c0';
    if (/壩|壩堰/.test(f.type)) return '#795548';
    if (/固床/.test(f.type)) return '#827717';
    return '#546e7a';
  };
  const statusRing = (f) => {
    if (f.status === '損壞') return '#dc2626';
    if (f.status === '需維護') return '#f59e0b';
    return '#16a34a';
  };

  facilities.forEach(f => {
    if (!f.lat || !f.lng) return;
    const facIc = /魚道/.test(f.type)?'fa-fish':/壩/.test(f.type)?'fa-water':'fa-layer-group';
    const facLabel = /魚道/.test(f.type)?'魚道':/壩/.test(f.type)?'防砂壩':'固床工';
    const icon = L.divIcon({
      className: '',
      html: `<div style="display:flex;flex-direction:column;align-items:center;cursor:pointer;
               filter:drop-shadow(0 3px 8px rgba(0,0,0,.50))">
               <div style="width:44px;height:44px;border-radius:50%;background:${facColorMap(f)};
                 border:3px solid ${statusRing(f)};display:flex;align-items:center;justify-content:center;
                 box-shadow:0 3px 10px rgba(0,0,0,.35)">
                 <i class="fas ${facIc}" style="color:#fff;font-size:18px"></i>
               </div>
               <div style="font-size:13px;font-weight:900;color:#0f172a;white-space:nowrap;
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


  biogisMap.invalidateSize();
}

/* ── 地圖輔助函式 ──────────────────────────────────────────────────────────── */
function biogisLayerToggle(key, icon, color, label) {
  return `<label style="display:flex;align-items:center;gap:5px;padding:5px 9px;border:1px solid #d5dde7;border-radius:6px;background:#fff;font-size:12px;cursor:pointer;white-space:nowrap">
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
  return `<div style="min-width:220px;font-size:13px;line-height:1.7">
    <div style="font-weight:800;font-size:14px;color:#0f172a;margin-bottom:6px">${fish_escape(f.name)}</div>
    <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px">
      <span style="background:#dbeafe;color:#1e40af;padding:2px 7px;border-radius:999px;font-size:11px;font-weight:700">${fish_escape(f.type)}</span>
      <span style="background:${statusColor}22;color:${statusColor};padding:2px 7px;border-radius:999px;font-size:11px;font-weight:700;border:1px solid ${statusColor}44">${fish_escape(f.status)}</span>
    </div>
    <table style="width:100%;font-size:12px;border-collapse:collapse">
      <tr><td style="color:#64748b;padding:2px 0">里程</td><td style="font-weight:600">${fish_escape(f.stationKm||'-')}</td></tr>
      <tr><td style="color:#64748b;padding:2px 0">健康指數</td><td style="font-weight:600">${cond}</td></tr>
      <tr><td style="color:#64748b;padding:2px 0">上次巡查</td><td style="font-weight:600">${fish_escape(f.lastInspect||'-')}</td></tr>
      <tr><td style="color:#64748b;padding:2px 0">維護優先</td><td style="font-weight:600">${fish_escape(f.maintenance_priority||'-')}</td></tr>
    </table>
    ${f.evaluationNotes ? `<div style="margin-top:7px;font-size:11px;color:#475569;border-left:3px solid #1565c0;padding-left:7px;line-height:1.55">${fish_escape(f.evaluationNotes)}</div>` : ''}
  </div>`;
}

function biogisSpeciesPopup(sp) {
  const cMap = { '瀕危':['#fee2e2','#b91c1c'],'易危':['#fef9c3','#854d0e'],'近危':['#dbeafe','#1d4ed8'],'一般':['#dcfce7','#166534'] };
  const [cbg, ccl] = cMap[sp.conservation] || ['#f1f5f9','#475569'];
  const habitat = (sp.note||'').split('；').find(p => p.includes('偏好')||p.includes('底質')||p.includes('礫石')||p.includes('急流')) || '';
  return `<div style="min-width:200px;font-size:13px;line-height:1.7">
    <div style="font-weight:800;font-size:14px;color:#0f172a;margin-bottom:4px">${fish_escape(sp.species)}</div>
    <div style="font-style:italic;font-size:11px;color:#64748b;margin-bottom:8px">${fish_escape(sp.scientificName||'')}</div>
    <div style="display:flex;gap:5px;flex-wrap:wrap;margin-bottom:8px">
      <span style="background:${cbg};color:${ccl};padding:2px 7px;border-radius:999px;font-size:11px;font-weight:700">${fish_escape(sp.conservation)}</span>
      <span style="background:#f0f9ff;color:#0369a1;padding:2px 7px;border-radius:999px;font-size:11px">${fish_escape(sp.family||'')}</span>
    </div>
    <table style="width:100%;font-size:12px;border-collapse:collapse">
      <tr><td style="color:#64748b;padding:2px 0">調查尾次</td><td style="font-weight:700;color:#0e7490">${sp.totalCount} 尾</td></tr>
      <tr><td style="color:#64748b;padding:2px 0">調查筆數</td><td>${sp.surveys} 筆</td></tr>
      <tr><td style="color:#64748b;padding:2px 0">分布位置</td><td style="font-size:11px">${fish_escape(sp.location||'')}</td></tr>
    </table>
    ${habitat ? `<div style="margin-top:7px;font-size:11px;color:#475569;border-left:3px solid #0e7490;padding-left:7px;line-height:1.55">${fish_escape(habitat)}</div>` : ''}
  </div>`;
}

function biogisZonePopup(zd, zoneSpecies) {
  const total = zoneSpecies.reduce((s,x)=>s+(Number(x.totalCount)||0), 0);
  const conserved = zoneSpecies.filter(x=>x.conservation&&x.conservation!=='一般');
  return `<div style="min-width:210px;font-size:13px;line-height:1.7">
    <div style="font-weight:800;font-size:14px;color:#0f172a;margin-bottom:4px">${fish_escape(zd.name)}</div>
    <div style="font-size:11px;color:#64748b;margin-bottom:8px">${fish_escape(zd.range)}</div>
    <table style="width:100%;font-size:12px;border-collapse:collapse">
      <tr><td style="color:#64748b;padding:2px 0">物種數</td><td style="font-weight:700;color:#0369a1">${zoneSpecies.length} 種</td></tr>
      <tr><td style="color:#64748b;padding:2px 0">累計尾次</td><td style="font-weight:700;color:#0e7490">${total} 尾</td></tr>
      <tr><td style="color:#64748b;padding:2px 0">保育魚類</td><td style="font-weight:700;color:#dc2626">${conserved.length} 種</td></tr>
    </table>
    ${zoneSpecies.length ? `<div style="margin-top:8px;font-size:11px;color:#334155">
      <b>主要物種：</b>${zoneSpecies.slice(0,3).map(x=>fish_escape(x.species)).join('、')}
    </div>` : ''}
  </div>`;
}

function biogisLandPopup() {
  return `<div style="min-width:200px;font-size:13px;line-height:1.7">
    <div style="font-weight:800;font-size:14px;color:#166534;margin-bottom:6px"><i class="fas fa-tree"></i> 陸域濱溪帶</div>
    <table style="width:100%;font-size:12px;border-collapse:collapse">
      <tr><td style="color:#64748b;padding:2px 0">植物科數</td><td style="font-weight:700;color:#166534">38 科</td></tr>
      <tr><td style="color:#64748b;padding:2px 0">植物種數</td><td style="font-weight:700;color:#166534">91 種</td></tr>
      <tr><td style="color:#64748b;padding:2px 0">原生種</td><td>61 種</td></tr>
      <tr><td style="color:#64748b;padding:2px 0">特有種</td><td>4 種</td></tr>
      <tr><td style="color:#64748b;padding:2px 0">歸化種</td><td>30 種</td></tr>
      <tr><td style="color:#64748b;padding:2px 0">調查時間</td><td>112年6月</td></tr>
    </table>
    <div style="margin-top:7px;font-size:11px;color:#475569;border-left:3px solid #16a34a;padding-left:7px;line-height:1.55">
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
          <div style="font-size:13px;color:#64748b;margin-top:3px">${sub}</div>
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
        <div style="font-size:13px;color:#64748b;margin-top:3px">${sub}</div>
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
  return `
    <div class="biomap-cat-block" style="border-left:5px solid ${cat.color};background:${cat.bg};border-radius:0 12px 12px 0">
      <!-- 標題列（點擊展開） -->
      <button class="biomap-cat-header" onclick="bioCatToggle('${id}')"
        style="width:100%;display:flex;align-items:center;gap:12px;background:none;border:none;cursor:pointer;padding:6px 2px;text-align:left;border-radius:8px"
        onmouseover="this.style.background='${cat.color}12'" onmouseout="this.style.background='none'">
        <div style="width:46px;height:46px;border-radius:12px;background:${cat.color}22;display:flex;align-items:center;justify-content:center;flex-shrink:0">
          <i class="fas ${cat.icon}" style="color:${cat.color};font-size:22px"></i>
        </div>
        <div style="flex:1;text-align:left">
          <div style="font-weight:800;font-size:18px;color:${cat.color};line-height:1.2">${cat.category}</div>
          <div style="font-size:13px;color:#64748b;margin-top:2px">${items.length} 項記錄・點擊展開</div>
        </div>
        <span style="background:#fff;border:2px solid ${cat.color}66;color:${cat.color};border-radius:999px;padding:4px 13px;font-size:16px;font-weight:800;min-width:36px;text-align:center">${items.length}</span>
        <i id="${id}_arrow" class="fas fa-chevron-down" style="color:${cat.color};font-size:18px;transition:transform .25s;flex-shrink:0;margin-right:4px"></i>
      </button>
      <!-- 展開內容 -->
      <div id="${id}" class="biomap-cat-body" style="margin-top:4px">
        ${items.map(item => `
          <div style="display:flex;align-items:flex-start;gap:12px;background:#fff;border-radius:10px;padding:14px 14px;border:1px solid ${cat.color}30;margin-top:8px;box-shadow:0 1px 4px rgba(0,0,0,.06)">
            <div style="width:8px;height:8px;border-radius:50%;background:${cat.color};margin-top:7px;flex-shrink:0"></div>
            <div style="flex:1;min-width:0">
              <div style="font-weight:800;font-size:17px;color:#0f172a;margin-bottom:4px">${fish_escape(item.name)}</div>
              ${item.detail ? `<div style="font-size:15px;color:#334155;line-height:1.5">${fish_escape(item.detail)}</div>` : ''}
              ${item.extra ? `<div style="font-size:13px;color:#94a3b8;margin-top:3px">${fish_escape(item.extra)}</div>` : ''}
            </div>
            ${item.tag ? `<span style="${tagStyle(item.tag)};font-size:13px;font-weight:700;padding:5px 12px;border-radius:999px;white-space:nowrap;flex-shrink:0">${fish_escape(item.tag)}</span>` : ''}
          </div>`).join('')}
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
      <text x="570" y="40" style="font-size:16px">🦗</text>
      <text x="810" y="52" style="font-size:18px">🦗</text>
      <text x="16" y="22" style="font-size:14px;font-weight:700;fill:#166534">陸域植被帶</text>
      <text x="16" y="38" style="font-size:12px;fill:#4b7c59">豐林橋沿線 38科 91種植物</text>
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
      <text x="240" y="82" style="font-size:15px" opacity=".9">🪲</text>
      <text x="420" y="94" style="font-size:15px" opacity=".9">🪲</text>
      <text x="650" y="79" style="font-size:15px" opacity=".9">🪲</text>
      <text x="830" y="90" style="font-size:15px" opacity=".9">🪲</text>
      <text x="970" y="98" style="font-size:16px">🦐</text>
      ${xs.slice(0, Math.min(xs.length, fishSpecies.length)).map((x, i) => {
        const sp = fishSpecies[i];
        return `<g>
          <text x="${x}" y="${ys[i]}" style="font-size:20px">${fishIcons[i%fishIcons.length]}</text>
          <text x="${x-18}" y="${ys[i]+18}" style="font-size:11px;font-weight:700;fill:#0369a1;stroke:#fff;stroke-width:3px;paint-order:stroke">${fish_escape((sp?.species||'').slice(0,4))}</text>
        </g>`;
      }).join('')}
      <text x="16" y="22" style="font-size:14px;font-weight:700;fill:#0369a1">水域帶</text>
      <text x="16" y="38" style="font-size:12px;fill:#0369a1;opacity:.85">魚類・水棲昆蟲・甲殼類</text>
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
      background:#fafcff;border-left:2px solid #e2e8f0;padding:20px 18px;font-size:14px}
    .bio-legend-side::-webkit-scrollbar{width:4px}
    .bio-legend-side::-webkit-scrollbar-thumb{background:#cbd5e1;border-radius:4px}
  `;
  document.head.appendChild(s);
}
