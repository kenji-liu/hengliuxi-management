// 魚類資料庫模組
let fishFilter = { keyword: '', conservation: '' };
// ── 所有物種均使用真實田野實拍或標準照（jpg），不再使用 SVG 插圖 ──

const FISH_PHOTO_LIBRARY = {
  '臺灣白甲魚': {
    image: '/webapp/assets/fish-photos/onychostoma-barbatulum.png',
    source: '02_魚類與棲地資料庫／施工前魚類調查嵌入影像',
    caption: '溪流魚類量測實拍，臺灣白甲魚（Onychostoma barbatulum）代表影像'
  },
  '粗首馬口鱲': {
    image: '/webapp/assets/fish-photos/zacco-pachycephalus.png',
    source: '02_魚類與棲地資料庫／施工前魚類調查嵌入影像',
    caption: '溪流魚類量測實拍，粗首馬口鱲（Zacco pachycephalus）代表影像'
  },
  '臺灣鬚鱲': {
    image: '/webapp/assets/fish-photos/candidia-barbata.png',
    source: '02_魚類與棲地資料庫／施工前魚類調查嵌入影像',
    caption: '魚體量測實拍，臺灣鬚鱲（Candidia barbata）代表影像'
  },
  '臺灣石魚賓': {
    image: '/webapp/assets/fish-photos/acrossocheilus-paradoxus.png',
    source: '02_魚類與棲地資料庫／施工前魚類調查代表影像',
    caption: '橫流溪溪流型魚類田野調查實拍（代表圖），臺灣石魚賓（Acrossocheilus paradoxus）鯉科特有種，偏好礫石底質緩流段',
    position: 'center 40%'
  },
  '纓口臺鰍': {
    image: '/webapp/assets/fish-photos/formosania-lacustre-field.png',
    source: '使用者提供之田野辨識照片',
    caption: '纓口臺鰍（Formosania lacustre）田野實拍；已修正原先誤用明潭吻鰕虎照片的問題，體表深淺交錯虎斑紋為辨識特徵，底棲吸附型，偏好礫石急流',
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
    caption: '短吻紅斑吻鰕虎（Rhinogobius rubromaculatus）田野辨識照片；已修正原先誤用其他鰕虎照片的問題',
    position: 'center center'
  }
};

function renderFish() {
  document.getElementById('contentArea').innerHTML = `
    <div class="tabs">
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
  if (tab === 'list')       renderFishList();
  else if (tab === 'landlife')   renderLandLife();
  else if (tab === 'vegetation') renderVegetation();
  else if (tab === 'biomap')     renderFishBioMap();
  else if (tab === 'news')       renderFishNews();
  else if (tab === 'trend')      renderFishTrend();
  else renderFishMap();
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
        ['fa-tally','#166534','#dcfce7',`${data.length} 筆`,'調查記錄','fish_statClick(\'\')','顯示全部調查記錄'],
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

  const TREND_SET = new Set(['臺灣白甲魚','臺灣石魚賓','臺灣鬚鱲','纓口臺鰍','臺灣間爬岩鰍','明潭吻鰕虎','粗首馬口鱲','短臀瘋鱨','短吻紅斑吻鰕虎']);
  const fallback = '/webapp/assets/fish-photos/field-measurement.jpg';

  document.getElementById('fishTable').innerHTML = `
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:18px;padding:4px 0">
      ${species.map(s => {
        const photo = fish_photoFor(s);
        const [ccl] = cMap[s.conservation] || ['#475569','#f1f5f9'];
        const cardId = `fishcard_sp_${s.species.replace(/[^\w]/g, '_')}`;
        const inTrend = TREND_SET.has(s.species);
        const allLocs = [...new Set(s.records.map(r => r.location).filter(Boolean))];
        const latest = s.records.slice().sort((a,b) => String(b.date||'').localeCompare(String(a.date||'')))[0] || s;
        return `
          <div style="background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 2px 12px rgba(15,23,42,.1);border:1px solid #e2e8f0;display:flex;flex-direction:column">
            <div style="position:relative;height:190px;overflow:hidden;background:#e5e7eb;cursor:pointer" onclick="openFishSpeciesDetail(this.dataset.species)" data-species="${fish_escape(s.species)}">
              <img src="${photo.image}" alt="${fish_escape(s.species)}"
                style="width:100%;height:100%;object-fit:cover;object-position:${fish_escape(photo.position||'center center')};transition:transform .3s"
                onerror="this.src='${fallback}'"
                onmouseover="this.style.transform='scale(1.04)'" onmouseout="this.style.transform='scale(1)'"
                onclick="event.stopPropagation();fishPhotoLightbox('${photo.image}','${fish_escape(s.species)}','${fish_escape(photo.caption||'')}')"
                title="點擊放大">
              <div style="position:absolute;bottom:8px;left:8px;background:rgba(0,0,0,.5);color:#fff;font-size:11px;border-radius:4px;padding:2px 7px;pointer-events:none">🔍 點擊放大</div>
              <div style="position:absolute;top:12px;right:12px">
                <span style="background:${ccl};color:#fff;font-size:15px;font-weight:800;padding:5px 14px;border-radius:999px;box-shadow:0 2px 8px rgba(0,0,0,.25)">${s.conservation||'一般'}</span>
              </div>
              <div style="position:absolute;top:12px;left:12px">
                <span style="background:rgba(15,23,42,.72);color:#fff;font-size:13px;padding:4px 10px;border-radius:999px">${s.family||'-'}</span>
              </div>
              ${s.surveys > 1 ? `<div style="position:absolute;bottom:10px;right:12px"><span style="background:rgba(15,23,42,.72);color:#fff;font-size:12px;padding:3px 10px;border-radius:999px"><i class="fas fa-layer-group" style="margin-right:4px"></i>${s.surveys} 次調查</span></div>` : ''}
            </div>
            <div style="padding:16px 18px 12px;flex:1;cursor:pointer" onclick="openFishSpeciesDetail(this.dataset.species)" data-species="${fish_escape(s.species)}">
              <div style="font-size:22px;font-weight:800;color:#0f172a;margin-bottom:4px;line-height:1.2">${fish_escape(s.species)}</div>
              <div style="font-size:14px;font-style:italic;color:#64748b;margin-bottom:12px">${fish_escape(s.scientificName||'')}</div>
              <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:12px">
                <div style="background:#f0fdfa;border-radius:8px;padding:10px 8px;text-align:center" ${s.reconciled ? `title="完整歷年電捕累計 ${s.totalCount} 尾（103~114年・26次調查，與歷年趨勢分析一致）；資料庫代表性快照僅 ${s.dbCount} 筆合計，已統一校正"` : ''}>
                  <div style="font-size:26px;font-weight:900;color:#0e7490;line-height:1">${s.totalCount}${s.reconciled ? '<span style="font-size:11px;color:#0e7490;vertical-align:super;margin-left:2px">✓</span>' : ''}</div>
                  <div style="font-size:12px;color:#64748b;margin-top:2px">累計尾數${s.totalSource ? '<i class="fas fa-circle-info" style="color:#0e7490;margin-left:3px;font-size:10px"></i>' : ''}</div>
                </div>
                <div style="background:#f8fafc;border-radius:8px;padding:10px 8px;text-align:center">
                  <div style="font-size:22px;font-weight:900;color:#334155;line-height:1">${s.surveys}</div>
                  <div style="font-size:12px;color:#64748b;margin-top:2px">調查次數</div>
                </div>
                <div style="background:#f8fafc;border-radius:8px;padding:10px 8px;text-align:center">
                  <div style="font-size:13px;font-weight:700;color:#0f172a;line-height:1.3">${latest.date||'-'}</div>
                  <div style="font-size:12px;color:#64748b;margin-top:2px">最近調查</div>
                </div>
              </div>
              <div style="font-size:14px;color:#334155;background:#f8fafc;border-left:3px solid #0e7490;padding:8px 12px;border-radius:0 6px 6px 0;line-height:1.5">
                <i class="fas fa-map-marker-alt" style="color:#0e7490;margin-right:4px"></i>${allLocs.join('、') || '-'}
              </div>
              <div style="display:flex;gap:8px;margin-top:10px">
                ${inTrend ? `
                <button onclick="event.stopPropagation();fish_jumpToTrend('${fish_escape(s.species)}')"
                  style="flex:1;padding:8px;border:1px solid #b45309;border-radius:8px;background:#fef3c7;color:#92400e;font-size:14px;font-weight:700;cursor:pointer">
                  <i class="fas fa-chart-line"></i> 歷年趨勢
                </button>` : ''}
                <button
                  data-q="橫流溪 ${fish_escape(s.species)}（${fish_escape(s.scientificName||'')}）的生態習性、族群現況（累計${s.totalCount}尾 / ${s.surveys}次調查）與保育建議"
                  onclick="event.stopPropagation();fish_openAIQA(this.getAttribute('data-q'))"
                  style="${inTrend ? '' : 'width:100%;'}padding:8px;border:1.5px solid #6366f1;border-radius:8px;background:#f5f3ff;color:#4f46e5;font-size:14px;font-weight:700;cursor:pointer;flex-shrink:0">
                  <i class="fas fa-robot"></i> AI問答
                </button>
              </div>
              <div style="text-align:center;margin-top:10px;color:#94a3b8;font-size:13px">
                <span id="${cardId}_hint"><i class="fas fa-up-right-from-square"></i> 點選開啟完整物種資料（${(s.surveyRecords&&s.surveyRecords.length)||s.surveys} 次調查）</span>
              </div>
            </div>
            <div id="${cardId}" style="display:none;border-top:1px solid #e2e8f0;padding:14px 18px;background:#f8fafc">
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;font-size:13px;margin-bottom:12px">
                <div><span style="color:#94a3b8">科別：</span><b>${fish_escape(s.family||'-')}</b></div>
                <div><span style="color:#94a3b8">保育等級：</span><span style="color:${ccl};font-weight:700">${fish_escape(s.conservation||'-')}${s.redlistCode?`（${s.redlistCode}）`:''}</span></div>
                <div style="grid-column:1/-1"><span style="color:#94a3b8">學名：</span><em>${fish_escape(s.scientificName||'-')}</em></div>
                ${s.redlistNote ? `<div style="grid-column:1/-1;color:#b45309;font-size:12px">ℹ ${fish_escape(s.redlistNote)}</div>` : ''}
              </div>
              ${(() => {
                const sr = Array.isArray(s.surveyRecords) ? s.surveyRecords : [];
                if (!sr.length) return '';
                const sum = sr.reduce((a, r) => a + (r.count || 0), 0);
                const ok = sum === s.totalCount;
                return `
                <div style="font-size:13px;color:#0e7490;margin-bottom:8px;font-weight:700">
                  <i class="fas fa-chart-line"></i> 完整歷年調查序列（與「歷年趨勢分析」同步・共 ${sr.length} 次出現）
                </div>
                <div style="overflow-x:auto;margin-bottom:8px">
                  <table style="width:100%;border-collapse:collapse;font-size:13px">
                    <thead><tr style="background:#e0f7fa;color:#0e7490">
                      <th style="padding:6px 8px;text-align:left;border:1px solid #b2ebf2">調查場次</th>
                      <th style="padding:6px 8px;text-align:center;border:1px solid #b2ebf2">捕獲尾數</th>
                      <th style="padding:6px 8px;text-align:left;border:1px solid #b2ebf2">來源</th>
                    </tr></thead>
                    <tbody>
                      ${sr.map(r => `<tr>
                        <td style="padding:6px 8px;border:1px solid #e2e8f0;font-weight:600">${fish_escape(r.label)}</td>
                        <td style="padding:6px 8px;border:1px solid #e2e8f0;text-align:center;font-weight:800;color:#0e7490">${r.count}</td>
                        <td style="padding:6px 8px;border:1px solid #e2e8f0;color:#64748b;font-size:12px">${fish_escape(r.source)}</td>
                      </tr>`).join('')}
                      <tr style="background:#f0fdfa;font-weight:800">
                        <td style="padding:6px 8px;border:1px solid #b2ebf2;color:#0f172a">完整歷年累計</td>
                        <td style="padding:6px 8px;border:1px solid #b2ebf2;text-align:center;color:#0e7490">${sum}</td>
                        <td style="padding:6px 8px;border:1px solid #b2ebf2;font-size:12px;color:${ok?'#15803d':'#b91c1c'}">
                          ${ok ? '✓ 與卡片累計尾數一致' : `⚠ 與累計 ${s.totalCount} 不符，請檢查`}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>`;
              })()}
              <div style="font-size:13px;color:#64748b;margin:10px 0 6px;font-weight:600">
                <i class="fas fa-database"></i> 資料庫重點記錄（可編輯／含棲地註記・共 ${s.records.length} 筆）
              </div>
              <div style="display:flex;flex-direction:column;gap:8px">
                ${s.records.slice().sort((a,b)=>String(b.date||'').localeCompare(String(a.date||''))).map((r,i) => `
                  <div style="background:#fff;border:1px solid #e2e8f0;border-radius:8px;padding:10px 12px">
                    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">
                      <span style="font-size:13px;font-weight:700;color:#0e7490">第 ${i+1} 筆記錄</span>
                      <span style="font-size:12px;color:#94a3b8">${r.date||'-'}</span>
                    </div>
                    <div style="font-size:13px;color:#334155;display:grid;grid-template-columns:1fr 1fr;gap:4px">
                      <div><span style="color:#94a3b8">尾數：</span><b style="color:#0e7490">${r.count}</b></div>
                      <div><span style="color:#94a3b8">來源：</span>${fish_escape((r.recorder||'-').replace('成果報告','').replace('生態調查','').trim())}</div>
                      <div style="grid-column:1/-1"><span style="color:#94a3b8">位置：</span>${fish_escape(r.location||'-')}</div>
                      ${r.note ? `<div style="grid-column:1/-1;font-size:12px;color:#64748b;margin-top:2px">${fish_escape(r.note)}</div>` : ''}
                    </div>
                    <div style="display:flex;gap:8px;margin-top:8px">
                      <button onclick="openFishForm(${r.id})"
                        style="flex:1;padding:6px;border:none;background:#0e7490;color:#fff;border-radius:6px;font-size:13px;font-weight:700;cursor:pointer">
                        <i class="fas fa-edit"></i> 編輯
                      </button>
                      <button onclick="deleteFish(${r.id})"
                        style="flex:1;padding:6px;border:none;background:#fee2e2;color:#b91c1c;border-radius:6px;font-size:13px;font-weight:700;cursor:pointer">
                        <i class="fas fa-trash"></i> 刪除
                      </button>
                    </div>
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
  const surveySum = surveyRecords.reduce((sum, row) => sum + (Number(row.count) || 0), 0);
  const latest = records[0] || target;
  const allLocs = [...new Set(records.map(r => r.location).filter(Boolean))];
  const trendSet = new Set(['臺灣白甲魚','臺灣石魚賓','臺灣鬚鱲','纓口臺鰍','臺灣間爬岩鰍','明潭吻鰕虎','粗首馬口鱲','短臀瘋鱨','短吻紅斑吻鰕虎']);

  const modal = document.getElementById('modal');
  if (modal) {
    modal.style.width = 'min(1120px, 94vw)';
    modal.style.maxWidth = '1120px';
    modal.style.maxHeight = '92vh';
  }

  document.getElementById('modalTitle').innerHTML = `
    <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
      <span style="font-size:22px;font-weight:900;color:#0f172a">${fish_escape(target.species)}</span>
      <span style="background:${cbg};color:${ccl};border:1px solid ${ccl}44;border-radius:999px;padding:4px 12px;font-size:13px;font-weight:800">
        ${fish_escape(target.conservation || '一般')}${target.redlistCode ? `（${fish_escape(target.redlistCode)}）` : ''}
      </span>
    </div>
  `;

  const fullSurveyHtml = surveyRecords.length ? `
    <div style="border:1px solid #b2ebf2;border-radius:12px;overflow:hidden;background:#fff">
      <div style="padding:12px 14px;background:#ecfeff;border-bottom:1px solid #b2ebf2;display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap">
        <div style="font-size:15px;font-weight:900;color:#0e7490"><i class="fas fa-chart-line"></i> 完整歷年調查序列</div>
        <div style="font-size:13px;color:#0f766e;font-weight:800">共 ${surveyRecords.length} 次出現，累計 ${surveySum} 尾</div>
      </div>
      <div style="overflow-x:auto">
        <table style="width:100%;border-collapse:collapse;font-size:13px">
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
        <div style="font-size:15px;font-weight:900;color:#0f172a"><i class="fas fa-database"></i> 資料庫代表調查紀錄</div>
        <div style="font-size:13px;color:#64748b">共 ${records.length} 筆</div>
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:10px;padding:12px">
        ${records.map((row, idx) => `
          <div style="border:1px solid #e2e8f0;border-left:4px solid ${ccl};border-radius:10px;padding:11px 12px;background:#fff">
            <div style="display:flex;justify-content:space-between;gap:8px;margin-bottom:8px">
              <b style="color:#0f172a">第 ${idx + 1} 筆</b>
              <span style="color:#64748b;font-size:12px">${fish_escape(row.date || '-')}</span>
            </div>
            <div style="font-size:13px;line-height:1.7;color:#334155">
              <div><span style="color:#94a3b8">尾數：</span><b style="color:#0e7490">${Number(row.count) || 0}</b></div>
              <div><span style="color:#94a3b8">位置：</span>${fish_escape(row.location || '-')}</div>
              <div><span style="color:#94a3b8">方法：</span>${fish_escape(row.method || '-')}</div>
              <div><span style="color:#94a3b8">來源：</span>${fish_escape((row.recorder || '-').replace('成果報告', '').replace('生態調查', '').trim())}</div>
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
            <div style="font-size:13px;color:#64748b;font-style:italic;margin-top:2px">${fish_escape(target.scientificName || '-')}</div>
            <div style="font-size:12px;color:#64748b;margin-top:8px;line-height:1.6"><i class="fas fa-camera"></i> ${fish_escape(photo.source || '魚類調查影像')}</div>
          </div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:12px">
          <div style="background:#f0fdfa;border:1px solid #ccfbf1;border-radius:10px;padding:10px;text-align:center">
            <div style="font-size:24px;font-weight:900;color:#0e7490">${target.totalCount || 0}</div>
            <div style="font-size:12px;color:#64748b">累計尾數</div>
          </div>
          <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:10px;text-align:center">
            <div style="font-size:24px;font-weight:900;color:#334155">${surveyRecords.length || target.surveys || 0}</div>
            <div style="font-size:12px;color:#64748b">有效調查</div>
          </div>
        </div>
      </div>

      <div style="display:flex;flex-direction:column;gap:14px">
        <div style="background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:14px 16px">
          <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;font-size:14px;color:#334155">
            <div><span style="color:#94a3b8">科別：</span><b>${fish_escape(target.family || '-')}</b></div>
            <div><span style="color:#94a3b8">最近調查：</span><b>${fish_escape(latest.date || '-')}</b></div>
            <div style="grid-column:1/-1"><span style="color:#94a3b8">主要分布：</span>${fish_escape(allLocs.join('、') || target.location || '-')}</div>
            <div style="grid-column:1/-1"><span style="color:#94a3b8">資料口徑：</span>${fish_escape(target.totalSource || '資料庫代表紀錄')}</div>
            ${target.redlistNote ? `<div style="grid-column:1/-1;color:#b45309;background:#fffbeb;border-radius:8px;padding:8px 10px">${fish_escape(target.redlistNote)}</div>` : ''}
          </div>
        </div>
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

// ════════════════════════════════════════════════════════════════════════════
//  魚類資料「單一真實來源」— 統籌核對：水域生物 ↔ 歷年趨勢分析
//  ----------------------------------------------------------------------------
//  下列累計尾數＝完整歷年電捕調查序列（103~114年，26 次季調查）逐筆合計，
//  與 renderFishTrend() 的 SURVEYS 為同一組權威數據。
//  來源：107~108年成果報告 表4-16、110年魚道生態廊道成效追蹤 表5-3。
//
//  ⚠ 落差說明：生態資料庫「水域生物」過去以 DB.fish 之「代表性快照記錄」加總，
//     每物種僅載入少數幾筆（如臺灣間爬岩鰍只有 103基線8 + 107報告26 + 110追蹤2 = 36 尾），
//     並非完整歷年序列；歷年趨勢分析則採全 26 次調查（間爬岩鰍實際累計 104 尾）。
//     故同一物種出現 36 vs 104 的核對落差。本常數將兩者統一至完整序列。
//     ※ renderFishTrend() 執行時會即時重算 SURVEYS 並於 console 警示任何不一致。
// ════════════════════════════════════════════════════════════════════════════
//  ★ 唯一真實來源：完整歷年電捕調查序列（103~114年）。歷年趨勢分析、水域生物
//    清單、卡片累計尾數、每筆魚種展開明細，全部由此單一陣列推導，數據必然同步。
//    來源：107~108成果報告 表4-16、110年魚道生態廊道成效追蹤 表5-3、麗陽站監測。
const HLX_FISH_KEY_NAME = {
  bai:'臺灣白甲魚', shi:'臺灣石魚賓', xu:'臺灣鬚鱲', ying:'纓口臺鰍',
  jian:'臺灣間爬岩鰍', min:'明潭吻鰕虎', kou:'粗首馬口鱲', feng:'短臀瘋鱨', hong:'短吻紅斑吻鰕虎'
};
const HLX_FISH_SURVEYS = [
  // label, year, 白甲魚, 石魚賓, 鬚鱲, 纓口臺鰍, 間爬岩鰍, 明潭吻鰕虎, 粗首馬口鱲, 短臀瘋鱨, 短吻紅斑吻鰕虎, note
  // ── 103–104年：魚道建置前基線（東勢林區管理處麗陽站溪流魚類監測） ──
  { label:'103年 Q1\n(3月)',  year:2014, m:3,  bai:0,  shi:4,  xu:0,  ying:0,  jian:8,  min:0, kou:0, feng:0, hong:0, note:'電捕法，橫流溪(下游)；魚道建置前基準，石魚賓+間爬岩鰍優勢', preConstruct:true },
  { label:'103年 Q4\n(12月)', year:2014, m:12, bai:0,  shi:22, xu:0,  ying:0,  jian:0,  min:0, kou:0, feng:0, hong:0, note:'電捕法，橫流溪(下游)；石魚賓為絕對優勢物種，白甲魚未見', preConstruct:true },
  { label:'104年 Q2\n(6月)',  year:2015, m:6,  bai:3,  shi:12, xu:4,  ying:0,  jian:2,  min:0, kou:0, feng:0, hong:0, note:'電捕法，橫流溪(下游)；臺灣白甲魚開始出現，物種多樣性初步提升', preConstruct:true },
  { label:'104年 Q4\n(11月)', year:2015, m:11, bai:5,  shi:10, xu:3,  ying:1,  jian:2,  min:0, kou:0, feng:0, hong:0, note:'電捕法，橫流溪(下游)；多物種混合期，纓口臺鰍有零星記錄', preConstruct:true },
  { label:'106年 Q1\n(3月)',  year:2017, m:3,  bai:25, shi:2,  xu:0,  ying:1,  jian:3,  min:0, kou:0, feng:0, hong:0, note:'電捕法，橫流溪(下游)' },
  { label:'106年 Q2\n(6月)',  year:2017, m:6,  bai:22, shi:7,  xu:0,  ying:1,  jian:0,  min:0, kou:0, feng:0, hong:0, note:'電捕法，橫流溪(下游)' },
  { label:'106年 Q3\n(9月)',  year:2017, m:9,  bai:26, shi:3,  xu:0,  ying:0,  jian:2,  min:0, kou:0, feng:0, hong:0, note:'電捕法，橫流溪(下游)' },
  { label:'106年 Q4\n(12月)', year:2017, m:12, bai:23, shi:0,  xu:0,  ying:0,  jian:0,  min:0, kou:0, feng:0, hong:0, note:'電捕法，橫流溪(下游)' },
  // ── 107年：3站電捕調查（來源：107~108年度成果報告 表4-16）──
  { label:'107年 S1\n(5月)',  year:2018, m:5,  bai:100,shi:73, xu:63, ying:109,jian:12, min:85, kou:0, feng:1, hong:0, note:'107年度第一季(5/28~29)，3站電捕合計；8種，443尾；短臀瘋鱨1尾（首次記錄）；來源：成果報告表4-16' },
  { label:'107年 S2\n(7月)',  year:2018, m:7,  bai:21, shi:30, xu:33, ying:11, jian:0,  min:52, kou:0, feng:0, hong:2, note:'107年度第二季(7/9~10)，3站電捕合計；7種，149尾；短吻紅斑吻鰕虎2尾（首次記錄）；來源：成果報告表4-16' },
  // ── 108年：4站電捕調查，數據完整（來源：成果報告 表4-16）──
  { label:'108年 S3\n(4月)',  year:2019, m:4,  bai:169,shi:101,xu:113,ying:40, jian:24, min:133,kou:0, feng:3, hong:6, note:'108年度第三季春季(4/17~18)，4站電捕合計；8種，589尾；短臀瘋鱨3尾、短吻紅斑吻鰕虎6尾；來源：成果報告表4-16' },
  { label:'108年 S4\n(10月)', year:2019, m:10, bai:92, shi:63, xu:72, ying:23, jian:5,  min:45, kou:0, feng:3, hong:1, note:'108年度第四季秋季(10/8~9)，4站電捕合計；8種，304尾；短臀瘋鱨3尾、短吻紅斑吻鰕虎1尾；來源：成果報告表4-16' },
  // ── 109~110年：6站電捕合計（來源：110年魚道生態廊道成效追蹤 表5-3）──
  { label:'109年 S1\n(7月)',  year:2020, m:7,  bai:52,  shi:55, xu:47, ying:46, jian:0,  min:54, kou:0, feng:0, hong:1, note:'109年7月(7/13-7/22)，橫流溪6站電捕合計；8種255尾；施工期魚道建設擾動，族群偏低；來源：成果報告表5-3' },
  { label:'109年 S2\n(9月)',  year:2020, m:9,  bai:53,  shi:55, xu:39, ying:43, jian:0,  min:70, kou:0, feng:1, hong:1, note:'109年9月(9/28-9/29)，橫流溪6站電捕合計；8種262尾；明潭吻鰕虎70尾為次要物種高峰；來源：成果報告表5-3' },
  { label:'110年 第3次\n(4月)',  year:2021, m:4,  bai:158, shi:98, xu:92, ying:31, jian:23, min:81, kou:0, feng:0, hong:3, note:'110年第3次(4/28-5/5)，橫流溪6站電捕合計；8種486尾；魚道完工後春季族群大幅回升，白甲魚158尾，間爬岩鰍23尾；來源：成果報告表5-3' },
  { label:'110年 第4次\n(9月)',  year:2021, m:9,  bai:27,  shi:49, xu:94, ying:5,  jian:9,  min:49, kou:0, feng:2, hong:0, note:'110年第4次(8/31-9/2)，橫流溪6站電捕合計；8種235尾；鬚鱲94尾為夏秋優勢；間爬岩鰍9尾、短臀瘋鱨2尾；來源：成果報告表5-3' },
  { label:'112年 4月',        year:2023, m:4,  bai:99, shi:27, xu:13, ying:4,  jian:1,  min:10, kou:0, feng:0, hong:0, note:'電捕法，橫流溪(下游)；112年4月明潭吻鰕虎10尾(4/18:6+4/27:4)' },
  { label:'112年 6月',        year:2023, m:6,  bai:26, shi:17, xu:3,  ying:0,  jian:0,  min:7,  kou:4, feng:0, hong:2, note:'電捕法，橫流溪(下游)；明潭吻鰕虎7尾(5/30:2+6/21:5)、粗首馬口鱲4尾、短吻紅斑吻鰕虎2尾' },
  { label:'112年 9月',        year:2023, m:9,  bai:44, shi:17, xu:2,  ying:3,  jian:0,  min:2,  kou:0, feng:0, hong:0, note:'電捕法，橫流溪(下游)；明潭吻鰕虎9/22調查2尾' },
  { label:'112年 11月',       year:2023, m:11, bai:35, shi:5,  xu:24, ying:0,  jian:0,  min:22, kou:0, feng:5, hong:1, note:'電捕法，橫流溪(下游)；明潭吻鰕虎22尾(11/21:10+11/27:4+12/26:8)、短臀瘋鱨5尾、短吻紅斑吻鰕虎1尾' },
  { label:'113年 3月',        year:2024, m:3,  bai:67, shi:14, xu:32, ying:6,  jian:0,  min:3,  kou:0, feng:0, hong:0, note:'電捕法，橫流溪(下游)；明潭吻鰕虎3/25調查3尾' },
  { label:'113年 6月',        year:2024, m:6,  bai:18, shi:4,  xu:2,  ying:1,  jian:0,  min:20, kou:6, feng:0, hong:1, note:'電捕法，橫流溪(下游)；明潭吻鰕虎20尾(6/26:17+6/27:3)、粗首馬口鱲6尾、短吻紅斑吻鰕虎1尾' },
  { label:'113年 11月',       year:2024, m:11, bai:56, shi:12, xu:4,  ying:3,  jian:0,  min:2,  kou:0, feng:0, hong:0, note:'電捕法，橫流溪(下游)；明潭吻鰕虎11/26調查2尾' },
  { label:'113年 12月',       year:2024, m:12, bai:31, shi:1,  xu:14, ying:1,  jian:0,  min:2,  kou:0, feng:0, hong:0, note:'電捕法，橫流溪(上游)；明潭吻鰕虎12/13調查2尾' },
  { label:'114年 6月',        year:2025, m:6,  bai:31, shi:23, xu:3,  ying:2,  jian:0,  min:0, kou:0, feng:0, hong:0, note:'電捕法，橫流溪(下游)' },
  { label:'114年 12月',       year:2025, m:12, bai:105,shi:22, xu:2,  ying:4,  jian:13, min:0, kou:0, feng:0, hong:0, note:'電捕法，橫流溪(下游)' },
];
const HLX_FISH_110_SUMMARY = {
  springTotal: 486,
  autumnTotal: 235,
  annualTotal: 721,
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
  Object.values(HLX_FISH_KEY_NAME).forEach(n => { t[n] = 0; });
  HLX_FISH_SURVEYS.forEach(s => {
    Object.entries(HLX_FISH_KEY_NAME).forEach(([k, n]) => { t[n] += (s[k] || 0); });
  });
  return t;
})();
const HLX_FISH_SURVEY_EVENTS = HLX_FISH_SURVEYS.length;  // 調查場次（103~114年）
const HLX_FISH_GRAND_TOTAL   = Object.values(HLX_FISH_FULL_TOTALS).reduce((a, b) => a + b, 0);

// 取得單一物種的完整歷年調查明細（與歷年趨勢分析同源，供卡片展開比對）
function fish_surveyBreakdown(speciesName) {
  const key = Object.keys(HLX_FISH_KEY_NAME).find(k => HLX_FISH_KEY_NAME[k] === speciesName);
  if (!key) return [];
  return HLX_FISH_SURVEYS
    .map(s => ({
      label:  String(s.label || '').replace(/\n/g, ' '),
      year:   s.year,
      count:  s[key] || 0,
      source: (String(s.note || '').match(/來源：([^；]+)/) || [, ''])[1].trim()
              || (s.preConstruct ? '麗陽站魚道建置前基線' : '橫流溪電捕監測'),
      note:   s.note || ''
    }))
    .filter(r => r.count > 0);
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

function fish_groupSpecies() {
  const data = DB.getAll('fish');
  const species = {};
  data.forEach(f => {
    if (!species[f.species]) species[f.species] = { ...f, totalCount: 0, surveys: 0, records: [] };
    species[f.species].totalCount += Number(f.count) || 0;
    species[f.species].surveys++;
    species[f.species].records.push(f);
  });
  // ── 統籌核對：9 種趨勢物種的「累計尾數」對齊完整歷年電捕序列，與歷年趨勢分析一致 ──
  Object.values(species).forEach(s => {
    const full = HLX_FISH_FULL_TOTALS[s.species];
    if (full != null) {
      s.dbCount        = s.totalCount;        // 保留 DB 代表性快照合計（供核對）
      s.totalCount     = full;                // 對齊歷年趨勢分析完整累計
      s.totalSource    = `完整歷年電捕序列（103~114年・${HLX_FISH_SURVEY_EVENTS}次調查）`;
      s.reconciled     = s.dbCount !== full;
      // 完整歷年調查明細（與歷年趨勢分析同源；sum 必等於 totalCount）
      s.surveyRecords  = fish_surveyBreakdown(s.species);
      s.surveyCount    = s.surveyRecords.length;
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
      const secondarySet = new Set(['明潭吻鰕虎','粗首馬口鱲','短臀瘋鱨','短吻紅斑吻鰕虎']);
      if (primaryMap[speciesName]) {
        const badge = document.querySelector(`[data-species-key="${primaryMap[speciesName]}"]`);
        if (badge) { badge.style.outline = '3px solid #f59e0b'; badge.scrollIntoView({ behavior:'smooth', block:'center' }); }
      } else if (secondarySet.has(speciesName)) {
        const canvas = document.getElementById(`spTrend_${speciesName}`);
        const card = canvas ? canvas.closest('[style*="border:2px solid"]') : null;
        const section = document.getElementById('secondarySpeciesTrend');
        const target = card || section;
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
    count: 5, source: '期中報告書 p.230–232；紅外線相機',
    summary: '紅外線自動相機記錄大型哺乳類5種，穿山甲為最重要保育物種，臺灣黑熊為瀕危物種。',
    items: [
      { name: '臺灣穿山甲', sci: 'Manis pentadactyla',       tag: '一級保育', note: '極度瀕危，橫流溪工作站周邊影像紀錄' },
      { name: '臺灣黑熊',   sci: 'Ursus thibetanus formosanus', tag: '瀕危', note: '大雪山地區繫放追蹤，104年起共10隻，112年新增4隻完整軌跡' },
      { name: '食蟹獴',     sci: 'Herpestes urva',           tag: '二級保育', note: '溪岸活動，捕食魚蟹及兩棲類' },
      { name: '臺灣山羌',   sci: 'Muntiacus reevesi micrurus', tag: '特有亞種', note: '夜間紅外線相機記錄' },
      { name: '臺灣野豬',   sci: 'Sus scrofa taivanus',      tag: '常見',   note: '溪岸泥地拱土痕跡及紅外線影像' }
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
  '臺灣五葉松': { code:'t0054840', sci:'Pinus morrisonicola' },
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
        ['fa-paw',    '#92400e','#fffbeb',  '5 種', '哺乳類'],
        ['fa-bug',    '#854d0e','#fef9c3', '17 種', '陸域昆蟲'],
        ['fa-layer-group','#7c3aed','#f5f3ff', `${totalSpecies} 種`, '合計物種']
      ].map(([ic,col,bg,val,lbl]) => `
        <div style="background:${bg};border-radius:12px;padding:16px 14px;display:flex;align-items:center;gap:12px">
          <div style="font-size:26px;color:${col}"><i class="fas ${ic}"></i></div>
          <div>
            <div style="font-size:24px;font-weight:900;color:${col};line-height:1">${val}</div>
            <div style="font-size:13px;color:#64748b">${lbl}</div>
          </div>
        </div>`).join('')}
    </div>

    <!-- 來源說明 -->
    <div style="background:#f8faff;border:1px solid #c7d2fe;border-left:4px solid #6366f1;border-radius:10px;padding:12px 16px;margin-bottom:20px;font-size:14px;color:#4338ca">
      <i class="fas fa-book-open" style="margin-right:7px"></i>
      <strong>資料來源：</strong>橫流溪動物通道及周邊設施檢查效能智慧評估 第三次期中報告書（114年）— 陸域生態調查章節<br>
      <span style="font-size:12px;color:#6366f1"><i class="fas fa-landmark" style="margin:0 5px 0 1px"></i>物種分類與官方物種頁：TaiCOL 台灣物種名錄（農業部生物多樣性研究所）｜政府資料開放授權條款第1版；卡片照片為物種辨識代表影像</span>
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
            <div style="font-size:13px;color:#64748b;margin-top:2px">${cat.summary}</div>
          </div>
          <div style="text-align:right">
            <div style="font-size:28px;font-weight:900;color:${cat.color}">${cat.count} 種</div>
            <div id="landcat_${catIdx}_arrow" style="font-size:12px;color:#94a3b8">▲ 收合</div>
          </div>
          <button data-q="${fish_escape('橫流溪'+cat.category+'：'+cat.summary+'的物種組成、生態特色與保育重點')}" onclick="event.stopPropagation();fish_openAIQA(this.getAttribute('data-q'))" style="margin-left:4px;padding:6px 10px;border:1.5px solid #6366f1;border-radius:8px;background:#f5f3ff;color:#4f46e5;font-size:13px;font-weight:700;cursor:pointer;flex-shrink:0"><i class="fas fa-robot"></i> AI</button>
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
          <div style="font-size:12px;color:#94a3b8;margin-bottom:10px">
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
                        <i class="fas fa-search-plus" style="color:rgba(255,255,255,0.85);font-size:11px;text-shadow:0 1px 3px rgba(0,0,0,.6)"></i>
                      </div>
                    </div>`;
                  })()}
                  <div style="padding:12px 14px">
                    <div style="display:flex;align-items:flex-start;gap:8px;margin-bottom:6px">
                      <div style="flex:1">
                        <div style="font-size:22px;font-weight:800;color:#0f172a">${item.name}</div>
                        ${item.sci && item.sci !== '-' ? `<div style="font-size:13px;font-style:italic;color:#94a3b8;margin-top:2px">${item.sci}</div>` : ''}
                      </div>
                      <span style="background:${tbg};color:${tcl};border-radius:999px;padding:3px 10px;font-size:13px;font-weight:700;white-space:nowrap;flex-shrink:0">${item.tag}</span>
                    </div>
                    <div style="font-size:15px;color:#64748b;border-top:1px solid #f1f5f9;padding-top:6px">${item.note}</div>
                    <button data-q="${fish_escape(item.name+'的生態特性、在橫流溪的分布現況與保育意義')}" onclick="event.stopPropagation();fish_openAIQA(this.getAttribute('data-q'))" style="margin-top:8px;width:100%;padding:6px;border:1px solid #6366f1;border-radius:7px;background:#f5f3ff;color:#4f46e5;font-size:13px;font-weight:700;cursor:pointer">💬 AI問答</button>
                  </div>
                </div>`;
            }).join('')}
          </div>
        </div>
      </div>`;
    }).join('')}

    <!-- 調查方法說明 -->
    <div style="background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:16px 20px;margin-top:4px;margin-bottom:20px">
      <div style="font-size:15px;font-weight:700;color:#334155;margin-bottom:10px">
        <i class="fas fa-info-circle" style="color:#6366f1;margin-right:7px"></i>調查方法說明
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:10px;font-size:14px;color:#475569">
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
      <div id="landLightboxCaption" style="color:#e2e8f0;font-size:15px;text-align:center;max-width:620px;line-height:1.6"></div>`;
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
      <div style="min-width:210px;font-size:13px;line-height:1.7">
        <div style="font-weight:900;font-size:14px;color:#0f172a;margin-bottom:6px">
          <i class="fas ${pt.icon}" style="color:${pt.color};margin-right:5px"></i>${pt.name}
        </div>
        <table style="width:100%;font-size:12px;border-collapse:collapse">
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
      html: `<div style="background:#7c3aed;color:#fff;border-radius:8px;padding:5px 9px;font-size:12px;font-weight:800;white-space:nowrap;box-shadow:0 2px 6px rgba(0,0,0,.3)">🐾 動物通道</div>`,
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
  { name: '臺灣五葉松', pct: 10.23, family: '松科',   type: '特有', invasive: false, endemic: true  },
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
  '臺灣五葉松': { file:'Pinus_morrisonicola_27729847.jpg?width=700', pos:'center 38%' },
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
  '臺灣五葉松': {
    sci: 'Pinus morrisonicola',
    expertNote: '臺灣特有針葉樹；本場域資料註明為人工種植，管理上不宜解讀為天然族群。'
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

/* 完整植物名錄（91種，依植物類群分組） */
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
    group: '裸子植物', color: '#0f766e', bg: '#f0fdfa', icon: 'fa-tree', count: 1,
    families: [
      { name: '松科', items: ['臺灣五葉松#（人工種植）'] }
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
        <div style="font-size:13px;color:#166534;margin-top:3px">陸域植生調查 ｜ 114年4月21日、9月19日 ｜ 沿線調查法 ｜ 資料節錄自 p.233–238</div>
      </div>
    </div>

    <!-- 統計卡片 -->
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin-bottom:20px">
      ${[
        ['fa-leaf',         '#16a34a','#f0fdf4', '91 種',  '植物總種數'],
        ['fa-layer-group',  '#1d4ed8','#eff6ff', '38 科',  '植物科數'],
        ['fa-seedling',     '#0f766e','#f0fdfa', '14 種',  '蕨類植物'],
        ['fa-exclamation-triangle','#dc2626','#fee2e2', '9 種', '外來入侵種'],
        ['fa-star',         '#92400e','#fef9c3',  '4 種',  '臺灣特有種'],
        ['fa-chart-pie',    '#7c3aed','#f5f3ff', '87%',   'NDVI 森林覆蓋']
      ].map(([ic,col,bg,val,lbl]) => `
        <div style="background:${bg};border-radius:12px;padding:16px 14px;display:flex;align-items:center;gap:10px;border:1px solid ${col}22">
          <div style="font-size:24px;color:${col}"><i class="fas ${ic}"></i></div>
          <div>
            <div style="font-size:24px;font-weight:900;color:${col};line-height:1">${val}</div>
            <div style="font-size:12px;color:#64748b">${lbl}</div>
          </div>
        </div>`).join('')}
    </div>

    <!-- 植被特性說明 -->
    <div style="background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:16px 20px;margin-bottom:20px">
      <div style="font-size:17px;font-weight:800;color:#14532d;margin-bottom:12px">
        <i class="fas fa-info-circle" style="color:#16a34a;margin-right:7px"></i>植被概況說明
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:10px;font-size:14px;color:#334155">
        <div style="background:#f0fdf4;border-radius:8px;padding:12px 14px">
          <div style="font-weight:700;color:#166534;margin-bottom:4px"><i class="fas fa-home" style="margin-right:5px"></i>工寮周邊</div>
          臺灣五葉松為主（人工種植），林下蕨類植物豐富，山坡地帶以金絲草、狗尾草等禾草為主
        </div>
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
        <i class="fas fa-chart-bar" style="color:#16a34a;margin-right:7px"></i>主要植被統計表（表6-36 ｜ 前16優勢種）
      </div>
      <div style="overflow-x:auto">
        <table style="width:100%;border-collapse:collapse;font-size:15px;min-width:500px">
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
                ? '<span style="background:#fee2e2;color:#b91c1c;border-radius:999px;padding:2px 7px;font-size:11px;font-weight:700">外來入侵</span>'
                : v.endemic
                ? '<span style="background:#fef9c3;color:#92400e;border-radius:999px;padding:2px 7px;font-size:11px;font-weight:700">特有種</span>'
                : '<span style="background:#f1f5f9;color:#475569;border-radius:999px;padding:2px 7px;font-size:11px;font-weight:700">原生</span>';
              return `
                <tr style="border-bottom:1px solid #f1f5f9;${i % 2 === 1 ? 'background:#fafcff' : ''}">
                  <td style="padding:10px 14px;font-weight:800;font-size:16px;color:#0f172a">${v.name}</td>
                  <td style="padding:10px 14px;font-size:14px;color:#475569">${v.family}</td>
                  <td style="padding:10px 14px;text-align:center">${badgeHtml}</td>
                  <td style="padding:10px 14px;text-align:right;font-size:16px;font-weight:900;color:${barColor}">${v.pct}%</td>
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
      <div style="margin-top:10px;font-size:12px;color:#94a3b8">
        * 標示外來入侵種（紅色）；# 標示臺灣特有種（橙色）｜資料來源：期中報告書 p.234
      </div>
    </div>

    <!-- 優勢植種圖鑑（政府物種頁） -->
    <div style="background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:18px 20px;margin-bottom:20px">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;flex-wrap:wrap;gap:8px">
        <div style="font-size:17px;font-weight:800;color:#0f172a">
          <i class="fas fa-images" style="color:#16a34a;margin-right:7px"></i>優勢植種圖鑑
        </div>
        <div style="font-size:12px;color:#64748b;text-align:right">出處：橫流溪調查資料（豐度）／物種分類與影像連結 TaiCOL 台灣物種名錄</div>
      </div>
      <div style="font-size:13px;color:#64748b;margin-bottom:16px">
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
                  <span style="background:${ccl};color:#fff;font-size:11px;font-weight:700;padding:3px 8px;border-radius:999px">${badge}</span>
                </div>
                <div style="position:absolute;bottom:8px;left:8px">
                  <span style="background:rgba(15,23,42,.72);color:#fff;font-size:11px;padding:2px 8px;border-radius:999px;font-weight:700">${v.pct}%</span>
                </div>
                <div style="position:absolute;bottom:8px;right:8px">
                  <i class="fas fa-expand-alt" style="color:rgba(255,255,255,.8);font-size:13px"></i>
                </div>
              </div>
              <div style="padding:10px 12px;background:#fff">
                <div style="font-size:15px;font-weight:800;color:#0f172a;margin-bottom:2px">${v.name}</div>
                <div style="font-size:11px;font-style:italic;color:#64748b;margin-bottom:3px">${photo.sci}</div>
                <div style="font-size:12px;color:#64748b;margin-bottom:6px">${v.family}</div>
                <div style="font-size:12px;color:#334155;line-height:1.55;background:#f8fafc;border-radius:7px;padding:7px 8px;margin-bottom:7px">${fish_escape(photo.expertNote || '')}</div>
                <div style="display:flex;gap:8px;flex-wrap:wrap;font-size:11px;line-height:1.4">
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
                <div style="font-size:14px;font-style:italic;opacity:.8;margin-top:4px">${photo.sci}　｜　${v.family}　｜　相對豐度 ${v.pct}%</div>
                <div style="font-size:13px;opacity:.85;margin-top:8px;max-width:760px;line-height:1.6">${fish_escape(photo.expertNote || '')}</div>
                <div style="font-size:12px;opacity:.72;margin-top:6px">
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
        <i class="fas fa-list-ul" style="color:#16a34a;margin-right:7px"></i>橫流溪陸域植物名錄（91種）
      </div>
      ${VEG_SPECIES_GROUPS.map(grp => `
        <div style="border:1px solid ${grp.color}33;border-left:4px solid ${grp.color};border-radius:10px;background:${grp.bg};margin-bottom:12px;overflow:hidden">
          <button onclick="vegGroupToggle(this)" style="width:100%;padding:13px 16px;display:flex;align-items:center;gap:12px;background:none;border:none;cursor:pointer;text-align:left">
            <i class="fas ${grp.icon}" style="color:${grp.color};font-size:22px;width:24px"></i>
            <div style="flex:1">
              <span style="font-size:18px;font-weight:900;color:#0f172a">${grp.group}</span>
              <span style="font-size:14px;color:#64748b;margin-left:8px">${grp.count} 種</span>
            </div>
            <i class="fas fa-chevron-down" style="color:#94a3b8;font-size:14px;transition:transform 0.2s"></i>
          </button>
          <div class="veg-group-body" style="display:none;padding:4px 16px 14px">
            ${grp.families.map(fam => `
              <div style="margin-bottom:10px">
                <div style="font-size:14px;font-weight:700;color:${grp.color};margin-bottom:6px;padding-left:4px;border-left:3px solid ${grp.color}">${fam.name}</div>
                <div style="display:flex;flex-wrap:wrap;gap:6px">
                  ${fam.items.map(sp => {
                    const isInvasive = sp.endsWith('*') || sp.includes('*');
                    const isEndemic  = sp.endsWith('#') || sp.includes('#');
                    const displayName = sp.replace(/[*#（）（.*）]/g, s => s.match(/[*#]/) ? '' : s).trim();
                    const tagStyle = isInvasive ? 'background:#fee2e2;color:#b91c1c;border:1px solid #fca5a5'
                                    : isEndemic ? 'background:#fef9c3;color:#92400e;border:1px solid #fde68a'
                                    : 'background:#f1f5f9;color:#334155;border:1px solid #e2e8f0';
                    return `<span style="${tagStyle};border-radius:8px;padding:4px 10px;font-size:14px;font-weight:600">${sp}</span>`;
                  }).join('')}
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      `).join('')}
      <div style="font-size:12px;color:#94a3b8;margin-top:8px">
        凡例：<span style="background:#fee2e2;color:#b91c1c;border-radius:4px;padding:1px 5px;font-size:12px">* 外來入侵種</span>
        <span style="background:#fef9c3;color:#92400e;border-radius:4px;padding:1px 5px;font-size:12px;margin-left:4px"># 臺灣特有種</span>
        （黑字為原生種）
      </div>
    </div>

    <!-- 互動地圖 -->
    <div style="background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:18px 20px;margin-bottom:20px">
      <div style="font-size:17px;font-weight:800;color:#0f172a;margin-bottom:6px">
        <i class="fas fa-map-marked-alt" style="color:#16a34a;margin-right:7px"></i>植被分布互動地圖
      </div>
      <div style="font-size:13px;color:#64748b;margin-bottom:14px">
        橫流溪沿岸植被調查樣點、優勢植群帶及周邊環境比對 ｜ 點選標記查看詳細植被資訊
      </div>
      <!-- 圖例 -->
      <div style="display:flex;flex-wrap:wrap;gap:14px;margin-bottom:12px;font-size:13px;align-items:center">
        <div style="display:flex;align-items:center;gap:7px">
          <div style="width:22px;height:22px;background:#16a34a;border:2.5px solid #14532d;border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0">
            <i class="fas fa-seedling" style="color:#fff;font-size:10px"></i>
          </div>
          <span>濱溪帶樣區（五節芒優勢）</span>
        </div>
        <div style="display:flex;align-items:center;gap:7px">
          <div style="width:22px;height:22px;background:#92400e;border:2.5px solid #7c2d12;border-radius:5px;display:flex;align-items:center;justify-content:center;flex-shrink:0">
            <i class="fas fa-tree" style="color:#fff;font-size:10px"></i>
          </div>
          <span>工寮周邊（臺灣五葉松）</span>
        </div>
        <div style="display:flex;align-items:center;gap:7px">
          <div style="position:relative;width:24px;height:22px;flex-shrink:0">
            <div style="width:0;height:0;border-left:12px solid transparent;border-right:12px solid transparent;border-bottom:22px solid #dc2626"></div>
            <i class="fas fa-cannabis" style="color:#fff;font-size:9px;position:absolute;top:8px;left:0;width:100%;text-align:center"></i>
          </div>
          <span>外來植物警示區</span>
        </div>
        <div style="display:flex;align-items:center;gap:7px">
          <div style="width:22px;height:22px;display:flex;align-items:center;justify-content:center;flex-shrink:0">
            <div style="width:16px;height:16px;background:#0d9488;border:2.5px solid #134e4a;transform:rotate(45deg);display:flex;align-items:center;justify-content:center">
              <i class="fas fa-spa" style="color:#fff;font-size:8px;transform:rotate(-45deg)"></i>
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

    /* 工寮周邊（臺灣五葉松） */
    { lat: 24.1798, lng: 120.9114, type: 'worksite', zone: '工寮周邊 A',
      dominant: '臺灣五葉松（人工林）', companion: '星毛蕨、蕨、腎蕨',
      invasive: '無', cover: '喬木層 > 60%、林下蕨類豐富', ndvi: 0.85 },
    { lat: 24.1820, lng: 120.9118, type: 'worksite', zone: '工寮周邊 B',
      dominant: '臺灣五葉松、構樹', companion: '野桐、山黃麻、九節木',
      invasive: '粉葉蕨（林下）', cover: '喬木層 55%、灌木層 30%', ndvi: 0.82 },

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

  const colorMap = { riparian: '#16a34a', worksite: '#92400e', invasive: '#dc2626', fern: '#0d9488' };
  const labelMap = { riparian: '濱溪帶', worksite: '松林帶', invasive: '外來種警示', fern: '蕨類豐富帶' };

  const vegIconCfg = {
    riparian: { bg: '#16a34a', dark: '#14532d', fa: 'fa-seedling', shape: 'circle'   },
    worksite: { bg: '#92400e', dark: '#7c2d12', fa: 'fa-tree',     shape: 'square'   },
    invasive: { bg: '#dc2626', dark: '#991b1b', fa: 'fa-cannabis', shape: 'triangle' },
    fern:     { bg: '#0d9488', dark: '#134e4a', fa: 'fa-spa',      shape: 'diamond'  }
  };

  function makeVegDivIcon(type) {
    const c = vegIconCfg[type] || vegIconCfg.riparian;
    const s = 34;
    let html;
    if (c.shape === 'circle') {
      html = `<div style="width:${s}px;height:${s}px;background:${c.bg};border:3px solid ${c.dark};border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 3px 10px rgba(0,0,0,.45)">
        <i class="fas ${c.fa}" style="color:#fff;font-size:15px"></i></div>`;
    } else if (c.shape === 'square') {
      html = `<div style="width:${s}px;height:${s}px;background:${c.bg};border:3px solid ${c.dark};border-radius:7px;display:flex;align-items:center;justify-content:center;box-shadow:0 3px 10px rgba(0,0,0,.45)">
        <i class="fas ${c.fa}" style="color:#fff;font-size:15px"></i></div>`;
    } else if (c.shape === 'triangle') {
      html = `<div style="position:relative;width:${s+4}px;height:${s}px;filter:drop-shadow(0 3px 5px rgba(0,0,0,.4))">
        <div style="width:0;height:0;border-left:${(s+4)/2}px solid transparent;border-right:${(s+4)/2}px solid transparent;border-bottom:${s}px solid ${c.bg}"></div>
        <i class="fas ${c.fa}" style="color:#fff;font-size:14px;position:absolute;top:12px;left:0;width:100%;text-align:center"></i></div>`;
    } else {
      const ds = Math.round(s * 0.72);
      html = `<div style="width:${s}px;height:${s}px;display:flex;align-items:center;justify-content:center">
        <div style="width:${ds}px;height:${ds}px;background:${c.bg};border:3px solid ${c.dark};transform:rotate(45deg);display:flex;align-items:center;justify-content:center;box-shadow:0 3px 10px rgba(0,0,0,.45)">
          <i class="fas ${c.fa}" style="color:#fff;font-size:13px;transform:rotate(-45deg)"></i></div></div>`;
    }
    const w = c.shape === 'triangle' ? s + 4 : s;
    return L.divIcon({ className: '', html, iconSize: [w, s], iconAnchor: [w / 2, s / 2] });
  }

  vegPoints.forEach(pt => {
    const col = colorMap[pt.type] || '#16a34a';
    const marker = L.marker([pt.lat, pt.lng], { icon: makeVegDivIcon(pt.type) }).addTo(vegMap);

    marker.bindPopup(`
      <div style="min-width:230px;font-size:13px;line-height:1.7">
        <div style="font-weight:900;font-size:15px;color:#0f172a;margin-bottom:5px">
          <span style="display:inline-block;width:12px;height:12px;border-radius:50%;background:${col};margin-right:6px;vertical-align:middle"></span>
          ${pt.zone}
        </div>
        <table style="width:100%;font-size:12px;border-collapse:collapse">
          <tr><td style="color:#64748b;padding:2px 0;white-space:nowrap">優勢植物</td><td style="font-weight:700;padding-left:8px">${pt.dominant}</td></tr>
          <tr><td style="color:#64748b;padding:2px 0;white-space:nowrap">伴生植物</td><td style="padding-left:8px">${pt.companion}</td></tr>
          <tr><td style="color:#64748b;padding:2px 0;white-space:nowrap">入侵植物</td><td style="padding-left:8px;color:${pt.invasive==='無'?'#16a34a':'#dc2626'};font-weight:600">${pt.invasive}</td></tr>
          <tr><td style="color:#64748b;padding:2px 0;white-space:nowrap">植被覆蓋</td><td style="padding-left:8px">${pt.cover}</td></tr>
          <tr><td style="color:#64748b;padding:2px 0;white-space:nowrap">NDVI</td><td style="padding-left:8px;font-weight:700;color:${pt.ndvi>0.7?'#16a34a':pt.ndvi>0.55?'#854d0e':'#dc2626'}">${pt.ndvi}</td></tr>
        </table>
        <div style="margin-top:7px;font-size:11px;color:#475569;border-left:3px solid ${col};padding-left:7px">
          植被分類：<strong>${labelMap[pt.type]}</strong>
        </div>
      </div>
    `, { maxWidth: 280 });
  });

  // ── 動物通道位置標記 ──
  L.marker([24.1840, 120.9098], {
    icon: L.divIcon({
      className: '',
      html: `<div style="background:#7c3aed;color:#fff;border-radius:8px;padding:5px 9px;font-size:12px;font-weight:800;white-space:nowrap;box-shadow:0 2px 6px rgba(0,0,0,.3)">🐾 動物通道</div>`,
      iconAnchor: [40, 18]
    })
  }).addTo(vegMap);

  vegMap.invalidateSize();
}

// ─────────────────────────────────────────────────────────────────────────────
//  歷年魚類族群趨勢分析
// ─────────────────────────────────────────────────────────────────────────────
function renderFishTrend() {
  const el = document.getElementById('fishTabContent');

  // ── 歷年調查資料：直接引用模組級唯一真實來源 HLX_FISH_SURVEYS ──────────────
  //    （與水域生物卡片累計尾數、每筆魚種展開明細同源，數據必然同步）
  const SURVEYS = HLX_FISH_SURVEYS;

  // 計算統計（9種全部納入）
  SURVEYS.forEach(s => {
    s.total = (s.bai||0)+(s.shi||0)+(s.xu||0)+(s.ying||0)+(s.jian||0)+(s.min||0)+(s.kou||0)+(s.feng||0)+(s.hong||0);
    const p = [s.bai,s.shi,s.xu,s.ying,s.jian,s.min,s.kou,s.feng,s.hong].map(v=>v||0).filter(v=>v>0);
    const N = s.total;
    const H = p.length > 1 ? -p.reduce((sum,v) => { const pi=v/N; return sum + (pi>0 ? pi*Math.log(pi) : 0); }, 0) : 0;
    s.H = parseFloat(H.toFixed(2));
    s.richness = p.length;
  });

  // ── 採樣努力量（站訪次）解析：自備註擷取「N站」，未標示者視為下游單站(1) ──
  //    這是趨勢圖「先升後降」的關鍵變因：107~110年為 3~6 站合計，112年後縮回 1 站，
  //    若以原始總捕獲量比較，將把「努力量下降」誤判為「魚類資源下降」。
  const surveyStations = s => {
    const m = String(s.note || '').match(/(\d+)\s*站/);
    return m ? parseInt(m[1], 10) : 1;
  };

  // 年度年均（9種全部納入）
  const annualData = {};
  SURVEYS.forEach(s => {
    if (!annualData[s.year]) annualData[s.year] = {bai:0,shi:0,xu:0,ying:0,jian:0,min:0,kou:0,feng:0,hong:0,cnt:0,effort:0,richSet:new Set()};
    const d = annualData[s.year];
    d.bai+=(s.bai||0); d.shi+=(s.shi||0); d.xu+=(s.xu||0); d.ying+=(s.ying||0); d.jian+=(s.jian||0);
    d.min+=(s.min||0); d.kou+=(s.kou||0); d.feng+=(s.feng||0); d.hong+=(s.hong||0);
    d.cnt++;
    d.effort += surveyStations(s);   // 站訪次累加 = 該年所有調查場次的站數總和
    [s.bai,s.shi,s.xu,s.ying,s.jian,s.min,s.kou,s.feng,s.hong].forEach((v,i)=>{ if(v>0) d.richSet.add(i); });
  });
  const annualYears = Object.keys(annualData).sort();

  // ── 努力量校正指標：CPUE（尾/站訪次）與物種數，這才是判讀魚道生態效益的正確基準 ──
  const annualEffortMetrics = annualYears.map(year => {
    const d = annualData[year];
    const totalCatch = d.bai+d.shi+d.xu+d.ying+d.jian+d.min+d.kou+d.feng+d.hong;
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
  window.hlxFishEffortMetrics = annualEffortMetrics;

  // ── 統籌核對自我檢查：確認權威常數 HLX_FISH_FULL_TOTALS 與 SURVEYS 完全一致 ──
  try {
    const _keyToName = { bai:'臺灣白甲魚', shi:'臺灣石魚賓', xu:'臺灣鬚鱲', ying:'纓口臺鰍',
      jian:'臺灣間爬岩鰍', min:'明潭吻鰕虎', kou:'粗首馬口鱲', feng:'短臀瘋鱨', hong:'短吻紅斑吻鰕虎' };
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
    { key:'kou',  name:'粗首馬口鱲',     color:'#f59e0b', engName:'Zacco pachycephalus',          conserve:'一般(NLC)・特有種' },
    { key:'feng', name:'短臀瘋鱨',       color:'#dc2626', engName:'Tachysurus brevianalis',       conserve:'易危(NVU)・特有種' },
    { key:'hong', name:'短吻紅斑吻鰕虎', color:'#059669', engName:'Rhinogobius rubromaculatus',   conserve:'一般(NLC)・特有種（IUCN全球NT）' },
  ];

  const FULL_FISH_LIST = [
    '臺灣間爬岩鰍','纓口臺鰍','臺灣白甲魚','臺灣石魚賓',
    '臺灣鬚鱲','明潭吻鰕虎','短吻紅斑吻鰕虎','短臀瘋鱨','粗首馬口鱲'
  ];
  const HISTORICAL_EXTRA_SPECIES = ['粗首馬口鱲'];
  const FISHWAY_TYPES = [
    {
      key: 'zigzag', name: '之字形魚道', facilities: '溪構8-2', station: '0K+460',
      targetKeys: ['bai', 'ying'], color: '#0ea5e9', status: '正常',
      note: '低落差曲折水路，適合中低流速通行；巡查記錄有臺灣白甲魚及纓口臺鰍通行。',
      management: '維持入口清淤與低流速連續水路，作為最下游連通性門檻。'
    },
    {
      key: 'drop', name: '降壩魚道', facilities: '溪構7', station: '0K+560',
      targetKeys: ['bai', 'shi', 'ying'], color: '#f59e0b', status: '正常',
      note: '利用壩體落差與水躍消能銜接上下游，關聯白甲魚、石魚賓及底棲爬鰍類。',
      management: '定期確認水深0.1～0.6m與跌水消能，避免局部沖刷形成過高落差。'
    },
    {
      key: 'pool', name: '階段式魚道', facilities: '溪構6、溪構4、溪構2', station: '0K+740、1K+170、1K+315',
      targetKeys: ['bai', 'ying', 'jian'], color: '#22c55e', status: '多數正常',
      note: '多級水池消能，適合臺灣白甲魚、纓口臺鰍與臺灣間爬岩鰍分段上溯；溪構4需注意裂縫與基礎侵蝕。',
      management: '優先維持池間高差、水深與池壁完整性，溪構4列為保全與修繕追蹤點。'
    },
    {
      key: 'submerged', name: '潛越式魚道', facilities: '溪構5-2', station: '1K+000',
      targetKeys: ['bai', 'shi', 'jian'], color: '#ef4444', status: '堵塞列管',
      note: '原設計可提供潛越通道，但現況記錄為入口遭土石堵塞，通行功能受損。',
      management: '應列入緊急清淤與入口斷面復原，否則中游連通性會成為瓶頸。'
    },
    {
      key: 'slope', name: '斜坡式魚道', facilities: '溪構3', station: '1K+225',
      targetKeys: ['bai', 'ying'], color: '#8b5cf6', status: '正常',
      note: '斜坡面營造連續水流，報告記錄纓口臺鰍及臺灣白甲魚可通行。',
      management: '維持坡面粗糙度與水膜連續，避免淤積造成局部乾段或集中高速流。'
    },
    {
      key: 'roughstone', name: '粗石斜曲面式魚道', facilities: '溪構1-1', station: '1K+400',
      targetKeys: ['bai', 'ying', 'jian'], color: '#14b8a6', status: '正常',
      note: '粗石提供多樣流速帶，對底棲吸附型與游泳能力不同的魚類較友善。',
      management: '保留粗石孔隙與緩流避難帶，是上游示範型連通設施。'
    },
    {
      key: 'boat', name: '改良型舟通式魚道', facilities: '溪構1-2', station: '1K+400',
      targetKeys: ['bai', 'ying'], color: '#6366f1', status: '正常',
      note: '與粗石斜曲面式魚道併設，形成上游雙通道，已記錄保育魚類成功通行。',
      management: '持續監測結構磨耗與通水斷面，和溪構1-1共同維持上游連通。'
    }
  ];
  const annualFishwaySeries = annualYears.map(year => {
    const d = annualData[year];
    return {
      year,
      label: `${Number(year) - 1911}年`,
      bai: d.bai, shi: d.shi, xu: d.xu, ying: d.ying, jian: d.jian,
      min: d.min, kou: d.kou, feng: d.feng, hong: d.hong,
      total: d.bai + d.shi + d.xu + d.ying + d.jian + d.min + d.kou + d.feng + d.hong
    };
  });
  const fishwayTargetNames = fw => fw.targetKeys
    .map(k => SPECIES.find(sp => sp.key === k)?.name || k)
    .join('、');
  const fishwayTargetTotals = fw => annualFishwaySeries.map(row =>
    fw.targetKeys.reduce((sum, key) => sum + (row[key] || 0), 0)
  );
  // ── CPUE（尾/站訪次）：排除歷年調查站數差異，方為魚道連通效益的可靠趨勢基準 ──
  //    每年該魚道型式關聯魚種捕獲量 ÷ 當年站訪次（與 annualEffortMetrics 同序對齊）。
  const fishwayTargetCPUE = fw => annualFishwaySeries.map((row, i) => {
    const sum = fw.targetKeys.reduce((s, key) => s + (row[key] || 0), 0);
    const eff = annualEffortMetrics[i]?.effort || 0;
    return eff ? +(sum / eff).toFixed(1) : 0;
  });
  window.hlxFishwayTrendPayload = { fishwayTypes: FISHWAY_TYPES, annualFishwaySeries, annualEffortMetrics };

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

    <!-- ★ 核心成果亮點橫幅 -->
    <div style="background:linear-gradient(135deg,#0c4a6e 0%,#1e40af 50%,#0c4a6e 100%);border-radius:16px;padding:28px 32px;margin-bottom:28px;color:#fff;position:relative;overflow:hidden">
      <div style="position:absolute;right:-30px;top:-30px;width:200px;height:200px;background:rgba(255,255,255,0.04);border-radius:50%"></div>
      <div style="position:absolute;right:60px;bottom:-40px;width:160px;height:160px;background:rgba(255,255,255,0.03);border-radius:50%"></div>
      <div style="font-size:13px;font-weight:700;color:#7dd3fc;letter-spacing:2px;margin-bottom:10px;text-transform:uppercase">
        ✦ 生態專家綜合評估結論
      </div>
      <div style="font-size:18px;font-weight:800;line-height:1.7;margin-bottom:20px;color:#fff">
        橫流溪經多年整治維護與魚道設施完善，趨勢指標魚類族群已呈現<span style="color:#86efac;font-size:20px;font-weight:900">顯著復甦</span>趨勢。<br>
        103年建置前以臺灣石魚賓單一優勢（22尾）；107~108年完成9種魚道建置後，110年樣站電捕第3次
        <span style="color:#fde68a;font-size:20px;font-weight:900">${HLX_FISH_110_SUMMARY.springTotal}尾</span>、
        第4次<span style="color:#fde68a;font-size:20px;font-weight:900">${HLX_FISH_110_SUMMARY.autumnTotal}尾</span>，
        全年合計<span style="color:#fde68a;font-size:20px;font-weight:900">${HLX_FISH_110_SUMMARY.annualTotal}尾</span>；另逐魚道通行彙整確認${HLX_FISH_110_SUMMARY.fishwayPassTotal}尾。
        至114年12月單次捕獲已達<span style="color:#86efac;font-size:20px;font-weight:900">146尾</span>，
        較103年基準提升約<span style="color:#86efac;font-size:20px;font-weight:900">6.6倍</span>，
        且<span style="color:#fde68a;font-size:20px;font-weight:900">物種多樣性顯著提升</span>，保育成效確認。
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:16px">
        ${[
          { num:'9種', sub:'歷年調查完整\n魚類趨勢記錄', icon:'🐟', color:'#7dd3fc' },
          { num:'721尾', sub:'110年樣站電捕\n486+235', icon:'📋', color:'#fde68a' },
          { num:'8+2種', sub:'110年魚類+\n蝦蟹水域生物', icon:'🧾', color:'#93c5fd' },
          { num:'×6.6', sub:'族群量成長倍數\n(103→114年)', icon:'📈', color:'#86efac' },
          { num:'3種', sub:'保育類第II級\n(保育旗艦)', icon:'🛡️', color:'#fde68a' },
          { num:'8年', sub:'持續監測掌握\n長期生態變化', icon:'📅', color:'#c4b5fd' },
        ].map(c=>`
          <div style="background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.2);border-radius:12px;padding:16px;text-align:center">
            <div style="font-size:22px;margin-bottom:4px">${c.icon}</div>
            <div style="font-size:24px;font-weight:900;color:${c.color};line-height:1">${c.num}</div>
            <div style="font-size:13px;color:#cbd5e1;margin-top:5px;white-space:pre-line;line-height:1.45">${c.sub}</div>
          </div>`).join('')}
      </div>
    </div>

    <!-- 統計卡片 -->
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:14px;margin-bottom:28px">
      ${[
        { icon:'fa-calendar-alt', color:'#0e7490', label:'調查跨度', val:'103～114年', sub:'(2014～2025)' },
        { icon:'fa-fish',         color:'#f97316', label:'趨勢整合物種', val:'9 種', sub:'103～114年完整記錄' },
        { icon:'fa-clipboard-check', color:'#1d4ed8', label:'110年樣站電捕', val:`${HLX_FISH_110_SUMMARY.annualTotal} 尾`, sub:`4月${HLX_FISH_110_SUMMARY.springTotal}＋9月${HLX_FISH_110_SUMMARY.autumnTotal}` },
        { icon:'fa-water', color:'#0891b2', label:'110年水域生物', val:`${HLX_FISH_110_SUMMARY.aquaticTaxa} 種`, sub:`魚類${HLX_FISH_110_SUMMARY.fishSpecies}＋蝦蟹2` },
        { icon:'fa-list-check',   color:'#0284c7', label:'調查總筆數',   val:'24次', sub:'(含107/108補充)' },
        { icon:'fa-chart-line',   color:'#22c55e', label:'最高單次捕獲', val:'146 尾', sub:'(114年12月冬季)' },
        { icon:'fa-shield-alt',   color:'#f43f5e', label:'保育類物種', val:'3 種', sub:'第II類保育類' },
        { icon:'fa-water',        color:'#7c3aed', label:'主要樣站', val:'橫流溪', sub:'(下游 ‧ 上游)' },
      ].map(c=>`
        <div style="background:#fff;border:2px solid #e2e8f0;border-radius:14px;padding:18px 20px;transition:box-shadow .2s" onmouseover="this.style.boxShadow='0 4px 20px rgba(0,0,0,.1)'" onmouseout="this.style.boxShadow=''">
          <i class="fas ${c.icon}" style="font-size:20px;color:${c.color};margin-bottom:10px;display:block"></i>
          <div style="font-size:22px;font-weight:900;color:#0f172a;line-height:1.1">${c.val}</div>
          <div style="font-size:13px;color:#64748b;margin-top:4px">${c.sub}</div>
          <div style="font-size:12px;color:#94a3b8;margin-top:2px">${c.label}</div>
        </div>`).join('')}
    </div>

    <!-- 資料口徑校正與來源補充 -->
    <div style="background:#fff;border:2px solid #bfdbfe;border-radius:16px;padding:22px 24px;margin-bottom:24px">
      <div style="font-size:20px;font-weight:900;color:#0f172a;margin-bottom:8px">
        <i class="fas fa-circle-info" style="color:#2563eb;margin-right:10px"></i>魚類資料口徑確認與來源補充
      </div>
      <div style="font-size:14px;color:#475569;line-height:1.8;margin-bottom:14px">
        本頁將9種魚類歷年趨勢整合呈現：5種長期指標特有種（臺灣白甲魚等）具103～114年完整調查序列；
        4種次要物種（明潭吻鰕虎、粗首馬口鱲、短臀瘋鱨、短吻紅斑吻鰕虎）整合107～113年有效記錄，統一於下方9種趨勢圖中。
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:14px">
        <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:12px;padding:14px 16px">
          <div style="font-size:17px;font-weight:900;color:#1d4ed8;margin-bottom:8px">5種長期指標特有種（103～114年）</div>
          <div style="font-size:15px;color:#334155;line-height:1.9">${SPECIES.slice(0,5).map(s=>`${s.name}（${s.engName}）`).join('、')}</div>
        </div>
        <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:14px 16px">
          <div style="font-size:17px;font-weight:900;color:#166534;margin-bottom:8px">4種次要物種（107～113年整合）</div>
          <div style="font-size:15px;color:#334155;line-height:1.9">${SPECIES.slice(5).map(s=>`${s.name}（${s.engName}）`).join('、')}</div>
        </div>
        <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:12px;padding:14px 16px">
          <div style="font-size:17px;font-weight:900;color:#c2410c;margin-bottom:8px">橫流溪完整歷史名錄9種</div>
          <div style="font-size:15px;color:#334155;line-height:1.9">${FULL_FISH_LIST.join('、')}</div>
        </div>
        <div style="background:#f8fafc;border:1px solid #cbd5e1;border-radius:12px;padding:14px 16px">
          <div style="font-size:17px;font-weight:900;color:#334155;margin-bottom:8px">110年樣站電捕（表5-3）</div>
          <div style="font-size:15px;color:#334155;line-height:1.9">
            第3次4月：<b>${HLX_FISH_110_SUMMARY.springTotal}尾</b>；第4次9月：<b>${HLX_FISH_110_SUMMARY.autumnTotal}尾</b>；全年合計：<b>${HLX_FISH_110_SUMMARY.annualTotal}尾</b>，魚類${HLX_FISH_110_SUMMARY.fishSpecies}種。
          </div>
        </div>
        <div style="background:#ecfeff;border:1px solid #a5f3fc;border-radius:12px;padding:14px 16px">
          <div style="font-size:17px;font-weight:900;color:#0e7490;margin-bottom:8px">110年魚道通行口徑</div>
          <div style="font-size:15px;color:#334155;line-height:1.9">
            平台逐魚道通行彙整為${HLX_FISH_110_SUMMARY.fishwayPassSpecies}種、${HLX_FISH_110_SUMMARY.fishwayPassTotal}尾；表5-19魚道中捕捉為${HLX_FISH_110_SUMMARY.fishwayCaptureSpecies}種、${HLX_FISH_110_SUMMARY.fishwayCaptureTotal}尾，不與樣站電捕${HLX_FISH_110_SUMMARY.annualTotal}尾混算。
          </div>
        </div>
      </div>
      <div style="font-size:12px;color:#64748b;margin-top:14px;line-height:1.6">
        本機資料路徑：C:/Users/kenji-PC/Desktop/橫流溪工程設施維護與資料管理作業 - CLaude/魚/魚
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
            橫流溪樣站 ‧ 電捕法單次捕獲尾數（109～110年為成果報告6站電捕合計；施工期影響見說明）
          </div>
        </div>
        <div style="background:#f0fdf4;border:1.5px solid #86efac;border-radius:10px;padding:10px 18px;font-size:15px;color:#166534;font-weight:700;white-space:nowrap">
          ✅ 整體族群呈上升趨勢
        </div>
      </div>
      <div style="position:relative;height:340px">
        <canvas id="fishTrendBar"></canvas>
      </div>
      <div style="background:#f8fafc;border-radius:10px;padding:16px 20px;margin-top:16px;font-size:16px;color:#334155;line-height:1.8;border-left:4px solid #0e7490">
        <strong>📊 圖表解讀：</strong>
        103～104年（魚道建置前）以臺灣石魚賓為優勢種；107～108年魚道建置後，白甲魚躍升為優勢種，108年4月達589尾高峰。
        109年數量下降（第1次255尾、第2次262尾）係因魚道<strong>施工期機具擾動</strong>所致，並非族群真正衰退；
        110年第3次調查（4/28～5/5）回升至${HLX_FISH_110_SUMMARY.springTotal}尾，第4次（8/31～9/2）為${HLX_FISH_110_SUMMARY.autumnTotal}尾，
        兩次樣站電捕合計${HLX_FISH_110_SUMMARY.annualTotal}尾、魚類${HLX_FISH_110_SUMMARY.fishSpecies}種。
        112～114年捕獲量持續成長（最高146尾/次，多站合計更高），<strong>物種多樣性顯著改善，魚道成效確認</strong>。
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
          🌟 近8年族群高點：105尾（114年12月）
        </div>
      </div>
      <div style="position:relative;height:280px">
        <canvas id="fishTrendLine"></canvas>
      </div>
      <div style="background:#f8fafc;border-radius:10px;padding:16px 20px;margin-top:16px;font-size:16px;color:#334155;line-height:1.8;border-left:4px solid #b45309">
        <strong>📈 趨勢解讀：</strong>
        臺灣白甲魚（易危，Onychostoma barbatulum）是橫流溪生態健康的關鍵指標種。103年（魚道建置前）幾乎無記錄，
        107~108年完成魚道建置後逐步回升，至114年12月已達105尾，<strong>冬季豐水期後的族群集中效應明顯</strong>；
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
        <div style="background:#f8fafc;border-radius:8px;padding:10px 14px;margin-top:10px;font-size:13px;color:#475569;line-height:1.6">
          112年後多次調查H'值達1.0以上，<strong>物種多樣性顯著提升</strong>，生態系統趨於穩定健全。
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
          臺灣白甲魚占比約<strong>55%</strong>，臺灣石魚賓與臺灣鬚鱲各約<strong>10～15%</strong>，物種組成趨於均衡。
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
        <strong style="color:#b45309"><i class="fas fa-triangle-exclamation" style="margin-right:6px"></i>判讀限制與努力量校正（務必先讀）：</strong>
        本圖下方「總量比較」為各魚道型式關聯魚種的<b>原始年度捕獲尾數加總</b>，<u>受採樣努力量影響極大</u>。
        歷年調查站數並不一致——107年為 3 站、108年 4 站、109～110年達 6 站，112年後縮回 <b>下游 1 站</b>；
        因此 108年的高峰與其後的「下降」<b>主要反映調查站數由 6 站減為 1 站</b>，並非魚類資源衰退。
        判讀魚道生態效益應以下方<b style="color:#0e7490">努力量校正後指標（CPUE 尾/站訪次、物種數）</b>為準：
        經校正後 103→114年 CPUE 由 17.0 升至 102.5 尾/站訪次（約 6 倍）、物種數由 2 種增至 5～9 種，
        證實魚道改善後棲地連通性與族群已<b style="color:#15803d">顯著提升</b>。
      </div>

      <!-- ★ 努力量校正後的正確趨勢（CPUE + 物種數）-->
      <div style="background:linear-gradient(135deg,#ecfeff,#f0fdf4);border:2px solid #a5f3fc;border-radius:18px;padding:22px 24px;margin-bottom:24px">
        <div style="font-size:19px;font-weight:900;color:#0e7490;margin-bottom:6px">
          <i class="fas fa-circle-check" style="margin-right:8px"></i>努力量校正後趨勢（魚道生態效益正確判讀基準）
        </div>
        <div style="font-size:14px;color:#475569;line-height:1.7;margin-bottom:18px">
          CPUE（單位努力捕獲量＝總捕獲 ÷ 站訪次）排除調查站數差異，與物種數同為國際通用的河川魚類監測指標；
          兩者均呈長期上升，方為魚道連通效益的可靠證據。
        </div>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:20px">
          <div style="background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:16px">
            <div style="font-size:15px;font-weight:800;color:#0f172a;margin-bottom:10px">CPUE 趨勢（尾／站訪次）</div>
            <div style="position:relative;height:240px"><canvas id="fishCpueTrend"></canvas></div>
          </div>
          <div style="background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:16px">
            <div style="font-size:15px;font-weight:800;color:#0f172a;margin-bottom:10px">物種數趨勢（年度出現種數）</div>
            <div style="position:relative;height:240px"><canvas id="fishRichnessTrend"></canvas></div>
          </div>
        </div>
        <div style="overflow-x:auto;margin-top:18px">
          <table style="width:100%;border-collapse:collapse;font-size:13px;min-width:560px">
            <thead>
              <tr style="background:#cffafe;color:#155e75">
                <th style="padding:8px 10px;text-align:left;border:1px solid #a5f3fc">年度</th>
                <th style="padding:8px 10px;text-align:center;border:1px solid #a5f3fc">調查場次</th>
                <th style="padding:8px 10px;text-align:center;border:1px solid #a5f3fc">站訪次<br><span style="font-weight:400;font-size:11px">(努力量)</span></th>
                <th style="padding:8px 10px;text-align:center;border:1px solid #a5f3fc">原始總捕獲</th>
                <th style="padding:8px 10px;text-align:center;border:1px solid #a5f3fc;background:#a7f3d0;color:#065f46">CPUE<br><span style="font-weight:400;font-size:11px">(尾/站訪次)</span></th>
                <th style="padding:8px 10px;text-align:center;border:1px solid #a5f3fc;background:#bfdbfe;color:#1e40af">物種數</th>
                <th style="padding:8px 10px;text-align:left;border:1px solid #a5f3fc">附註</th>
              </tr>
            </thead>
            <tbody>
              ${annualEffortMetrics.map(m => {
                const yr = Number(m.year);
                const note = yr <= 2016 ? '魚道建置前基準（下游1站）'
                  : yr === 2018 ? '魚道建置期，3站'
                  : yr === 2019 ? '建置完成，4站（捕獲高峰受站數推升）'
                  : yr === 2020 ? '★施工擾動期，6站但族群偏低'
                  : yr === 2021 ? `完工後回升，6站；4月${HLX_FISH_110_SUMMARY.springTotal}尾、9月${HLX_FISH_110_SUMMARY.autumnTotal}尾，全年${HLX_FISH_110_SUMMARY.annualTotal}尾`
                  : '縮回下游1站，CPUE 仍維持高檔';
                const hl = (yr >= 2023) ? 'background:#f0fdf4' : '';
                return `<tr style="${hl}">
                  <td style="padding:7px 10px;border:1px solid #e2e8f0;font-weight:700">${m.label}</td>
                  <td style="padding:7px 10px;border:1px solid #e2e8f0;text-align:center">${m.surveys}</td>
                  <td style="padding:7px 10px;border:1px solid #e2e8f0;text-align:center;font-weight:700;color:#b45309">${m.effort}</td>
                  <td style="padding:7px 10px;border:1px solid #e2e8f0;text-align:center;color:#64748b">${m.catch}</td>
                  <td style="padding:7px 10px;border:1px solid #e2e8f0;text-align:center;font-weight:900;color:#047857">${m.cpue}</td>
                  <td style="padding:7px 10px;border:1px solid #e2e8f0;text-align:center;font-weight:900;color:#1d4ed8">${m.richness}</td>
                  <td style="padding:7px 10px;border:1px solid #e2e8f0;font-size:12px;color:#475569">${note}</td>
                </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>
        <div style="margin-top:14px;font-size:13px;color:#475569;line-height:1.8;background:#fff;border-radius:10px;padding:12px 14px">
          <b style="color:#0e7490">水域生態專家判釋：</b>
          ①原始捕獲量 108→114年「下降」係站數由 6 站縮為 1 站之<b>努力量假象</b>，非生態衰退。
          ②CPUE 校正後呈穩定高檔（93～103 尾/站訪次），且物種數於 112年達 9 種峰值，顯示<b>群聚結構趨多元、均衡</b>。
          ③109年 CPUE 短暫下探係<b>魚道施工擾動期</b>（報告明載），完工後即回升，符合「改善初期先組成改善、後個體回穩」的生態歷程。
          ④洄游指標種臺灣間爬岩鰍於110年合計32尾（4月23尾、9月9尾）、114年13尾再現上游魚道，佐證<b>上下游連通性恢復</b>。
        </div>
      </div>

      <div style="display:grid;grid-template-columns:minmax(0,1fr) minmax(420px,.85fr);gap:20px;margin-bottom:28px;align-items:start">
        <div style="border:2px solid #e2e8f0;border-radius:18px;padding:20px">
          <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:14px;flex-wrap:wrap;margin-bottom:12px">
            <div>
              <div style="font-size:18px;font-weight:900;color:#0f172a;margin-bottom:8px">魚道型式關聯指標 CPUE 比較<span style="font-size:13px;font-weight:700;color:#0e7490">（努力量校正・尾/站訪次）</span></div>
              <div style="font-size:14px;color:#64748b;line-height:1.7">已以 CPUE（捕獲量÷站訪次）排除歷年調查站數差異；折線長期上升才是魚道連通效益的可靠證據，不受 6 站→1 站之採樣變動誤導。</div>
            </div>
            <button type="button" onclick="openFishwayTrendModal('all')" style="border:1.5px solid #93c5fd;background:#eff6ff;color:#1d4ed8;border-radius:10px;padding:9px 14px;font-size:14px;font-weight:900;cursor:pointer">
              <i class="fas fa-up-right-and-down-left-from-center"></i> 放大圖表
            </button>
          </div>
          <div onclick="openFishwayTrendModal('all')" title="點選放大圖表" style="position:relative;height:400px;cursor:zoom-in">
            <canvas id="fishwayTypeTrend"></canvas>
          </div>
        </div>
        <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;align-content:start">
          ${FISHWAY_TYPES.map(fw => {
            const cpue = fishwayTargetCPUE(fw);
            // 106年（建置前基準）對齊年度索引，與最新年度(114)比較 CPUE 變化
            const baseIdx = annualEffortMetrics.findIndex(m => Number(m.year) === 2017);
            const latest = cpue[cpue.length - 1] || 0;
            const base = baseIdx >= 0 ? (cpue[baseIdx] || 0) : (cpue[0] || 0);
            const delta = +(latest - base).toFixed(1);
            const mult = base > 0 ? (latest / base).toFixed(1) : null;
            return `
              <div style="border:2px solid ${fw.color}55;border-radius:14px;padding:12px 14px;background:${fw.color}0d;min-height:132px">
                <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:6px">
                  <div style="font-size:15px;font-weight:900;color:#0f172a;line-height:1.25">${fw.name}</div>
                  <span style="font-size:12px;border-radius:999px;padding:3px 9px;background:#fff;color:${fw.color};border:1.5px solid ${fw.color}66;font-weight:900;white-space:nowrap">${fw.status}</span>
                </div>
                <div style="font-size:12px;color:#64748b;line-height:1.5">${fw.facilities}｜${fw.station}</div>
                <div style="font-size:12px;color:#334155;margin-top:6px;line-height:1.55">關聯物種：${fishwayTargetNames(fw)}</div>
                <div style="display:flex;align-items:baseline;gap:8px;margin-top:8px;flex-wrap:wrap">
                  <span style="font-size:22px;font-weight:900;color:${fw.color};line-height:1">${latest}</span>
                  <span style="font-size:12px;color:#64748b">114年 CPUE（尾/站訪次）</span>
                  <span style="font-size:12px;color:${delta>=0?'#15803d':'#b91c1c'};font-weight:900">${delta>=0?'+':''}${delta} 較106年${mult&&delta>=0?`（×${mult}）`:''}</span>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>

      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:18px">
        ${FISHWAY_TYPES.map(fw => `
          <div style="border:2px solid #e2e8f0;border-radius:18px;padding:18px;background:#fff">
            <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:14px">
              <div>
                <div style="font-size:17px;font-weight:900;color:#0f172a;line-height:1.35">${fw.name}</div>
                <div style="font-size:13px;color:#64748b;margin-top:5px;line-height:1.5">${fw.facilities}｜${fw.station}</div>
              </div>
              <button type="button" onclick="openFishwayTrendModal('${fw.key}')" title="放大${fw.name}趨勢圖" style="border:1.5px solid ${fw.color}66;background:${fw.color}14;color:${fw.color};border-radius:10px;padding:7px 10px;font-size:14px;font-weight:900;cursor:pointer;flex-shrink:0">
                <i class="fas fa-up-right-and-down-left-from-center"></i>
              </button>
            </div>
            <div onclick="openFishwayTrendModal('${fw.key}')" title="點選放大圖表" style="position:relative;height:220px;cursor:zoom-in">
              <canvas id="fishwayTrend_${fw.key}"></canvas>
            </div>
            <div style="font-size:14px;color:#475569;line-height:1.75;margin-top:14px">${fw.note}</div>
            <div style="font-size:14px;color:#166534;line-height:1.75;margin-top:10px;background:#f0fdf4;border-radius:12px;padding:12px 14px">${fw.management}</div>
          </div>
        `).join('')}
      </div>
    </div>

    <!-- ★ 四大亮點分析 -->
    <div style="background:#fff;border:2px solid #e2e8f0;border-radius:16px;padding:28px;margin-bottom:24px">
      <div style="font-size:20px;font-weight:900;color:#0f172a;margin-bottom:20px;display:flex;align-items:center;gap:10px">
        <i class="fas fa-microscope" style="color:#0369a1;font-size:22px"></i>生態專家分項成果分析
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:18px">
        ${[
          { icon:'fa-arrow-trend-up', title:'✅ 族群量顯著增加，棲地恢復成效卓著', color:'#22c55e', bg:'#f0fdf4', bd:'#bbf7d0',
            body:'106年（2017年）橫流溪5種趨勢指標魚類每次調查捕獲僅23～31尾，平均28.8尾；至113～114年躍升為59～146尾。特別是臺灣白甲魚在114年12月達105尾，為近8年最高紀錄。以106年單次高值31尾比較，族群量約增加4.7倍；以106年平均值比較則約5.1倍，顯示橫流溪整治工程與棲地維護措施具長期正向效益。',
            badge:'族群量 ×4.7' },
          { icon:'fa-route', title:'✅ 魚道通行功能正常，洄游物種成功上溯', color:'#f59e0b', bg:'#fffbeb', bd:'#fde68a',
            body:'臺灣間爬岩鰍為典型溪內洄游保育物種（第II類）。110年全年合計32尾，其中第3次4月23尾、第4次9月9尾，114年12月再現13尾；搭配雪山坑溪同期高捕獲91尾，印證魚道設施發揮阻隔改善功效，洄游魚類已能成功上溯至中上游繁殖棲地，魚道工程價值獲實際調查數據驗證。',
            badge:'魚道效益確認' },
          { icon:'fa-layer-group', title:'✅ 物種組成趨多元，生態健全度提升', color:'#3b82f6', bg:'#eff6ff', bd:'#bfdbfe',
            body:'106年魚相由臺灣白甲魚高度主導（占比約74～100%，依季節波動），至112～114年臺灣鬚鱲及臺灣石魚賓族群同步擴增，物種多樣性指數H′由0～0.7提升至多次達1.0以上，顯示棲地空間異質性改善，魚類群聚結構從單一優勢走向較健全的多元生態系。',
            badge:'H′ 多樣性上升' },
          { icon:'fa-droplet', title:'✅ 水質長期優良，支撐保育類物種生存', color:'#7c3aed', bg:'#faf5ff', bd:'#ddd6fe',
            body:'歷次調查pH值維持在7.87～8.03之間（弱鹼性優良水質），水溫夏季22.5～24.9°C、冬季11～11.4°C，均處於臺灣原生魚類最適生存範圍。電導度265～363μS/m亦顯示無污染。穩定優良的水質條件，為3種保育類特有魚類長期定居與繁殖提供了堅實的環境基礎。',
            badge:'水質優良認證' },
        ].map((c,i)=>`
          <div style="border:2px solid ${c.bd};border-radius:14px;padding:20px;background:${c.bg}">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;flex-wrap:wrap;gap:6px">
              <div style="font-size:16px;font-weight:900;color:#0f172a;display:flex;align-items:center;gap:8px">
                <i class="fas ${c.icon}" style="color:${c.color};font-size:18px"></i>${c.title}
              </div>
              <span style="background:${c.color};color:#fff;border-radius:20px;padding:4px 12px;font-size:12px;font-weight:700;white-space:nowrap">${c.badge}</span>
            </div>
            <div style="font-size:14px;color:#334155;line-height:1.8">${c.body}</div>
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
                  <span style="background:${s.H>=1.5?'#dcfce7':s.H>=0.8?'#fef9c3':'#fee2e2'};color:${s.H>=1.5?'#166534':s.H>=0.8?'#854d0e':'#991b1b'};border-radius:8px;padding:4px 10px;font-weight:800;font-size:14px">${s.H}</span>
                </td>
                <td style="padding:11px 14px;font-size:12px;color:#64748b">${s.note}</td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
      <div style="font-size:13px;color:#94a3b8;margin-top:10px">
        ＊ 109～110年資料引自《東勢林區管理處國有林魚道及生態廊道委託技術服務成果報告（110年）》表5-3，為橫流溪6站電捕合計（非均值）；109年數量偏低係施工期擾動所致；110年第3次4月486尾、第4次9月235尾，全年合計721尾；H' = Shannon–Wiener 生物多樣性指數
      </div>
    </div>

    <!-- 物種資訊卡 -->
    <div style="background:#fff;border:2px solid #e2e8f0;border-radius:16px;padding:24px;margin-bottom:24px">
      <div style="font-size:20px;font-weight:900;color:#0f172a;margin-bottom:6px">
        <i class="fas fa-info-circle" style="color:#0369a1;margin-right:10px"></i>橫流溪記錄魚種生態特性一覽
      </div>
      <div style="font-size:14px;color:#64748b;margin-bottom:18px">全9種記錄魚類完整生態特性 ‧ 5種長期指標特有種（含3種保育類II級）＋4種次要物種（含易危・近危保育關注種）</div>
      <div style="font-size:13px;font-weight:700;color:#0369a1;margin-bottom:10px;display:flex;align-items:center;gap:6px">
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
                <div style="font-size:17px;font-weight:900;color:#0f172a">${s.sp}</div>
                <div style="font-size:12px;font-style:italic;color:#64748b">${s.eng}</div>
              </div>
            </div>
            <div style="display:flex;gap:6px;margin-bottom:10px;flex-wrap:wrap">
              <span style="font-size:12px;background:${s.color}20;color:${s.color};border-radius:6px;padding:3px 10px;font-weight:700">${s.fam}</span>
              <span style="font-size:12px;background:#f1f5f9;color:#475569;border-radius:6px;padding:3px 10px">${s.status}</span>
            </div>
            <div style="font-size:14px;color:#334155;line-height:1.75">${s.desc}</div>
          </div>`).join('')}
      </div>

      <!-- 次要物種分隔線 -->
      <div style="border-top:2px dashed #e2e8f0;margin:20px 0 16px"></div>
      <div style="font-size:13px;font-weight:700;color:#7c3aed;margin-bottom:10px;display:flex;align-items:center;gap:6px">
        <i class="fas fa-search"></i> 次要物種・保育關注種（4種）
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:14px">
        ${[
          { sp:'明潭吻鰕虎', eng:'Rhinogobius candidianus', fam:'鰕虎科', status:'🟢 台灣特有種 ‧ 一般物種', icon:'🐡',
            desc:'次要4種中族群數量最多（103～114年累計317尾），是橫流溪最常見的底棲型鰕虎。棲息於礫石縫隙間，以小型底棲無脊椎動物為食，對水質敏感，偏好清澈高溶氧之急流至緩流段。分布範圍廣，107年至113年持續有記錄，族群整體穩定。', color:'#3b82f6', bg:'#eff6ff' },
          { sp:'粗首馬口鱲', eng:'Zacco pachycephalus', fam:'鯉科', status:'🟢 台灣特有種 ‧ 一般物種', icon:'🐟',
            desc:'台灣特有種，廣泛分布台灣各河川中上游急流砂礫底環境。107年首次大規模電捕記錄（30尾），具強游泳能力，常在急瀬段成群活動；雜食性，攝食水生昆蟲、藻類及有機碎屑。112～113年捕獲量偏低（3～6尾），推測與白甲魚優勢族群競爭及底質淤積有關，對水道底質結構變化敏感。', color:'#f59e0b', bg:'#fffbeb' },
          { sp:'短臀瘋鱨', eng:'Tachysurus brevianalis', fam:'鯰科', status:'🔴 保育類第III類 ‧ 易危（VU）', icon:'🦶',
            desc:'保育類第三級（易危），IUCN評為近危（NT）。108年4月首次在橫流溪確認（4尾），為重要新紀錄，顯示橫流溪仍維持足以支持此保育物種之水域環境。夜行性底棲魚類，白天多藏匿於大型礫石或倒木下方，以底棲無脊椎動物為主食，觸鬚發達。族群數量極少，建議加強夜間調查以正確評估族群規模。', color:'#dc2626', bg:'#fef2f2' },
          { sp:'短吻紅斑吻鰕虎', eng:'Rhinogobius rubromaculatus', fam:'鰕虎科', status:'🟠 IUCN近危（NT）', icon:'🦐',
            desc:'IUCN近危（NT）物種，分布範圍局限於台灣中部特定清澈急流溪段。109年後首次在橫流溪記錄，與明潭吻鰕虎共域，兩者比例約1:22.6。棲息要求較明潭吻鰕虎更嚴苛，偏好高溶氧、低濁度之清澈急流段，汛期後沉積物增加時即趨於不穩定。體色鮮豔、具紅斑特徵，具一定領域性。為橫流溪高度保育價值物種，零星記錄具重要生態指標意義。', color:'#059669', bg:'#f0fdf4' },
        ].map(s=>`
          <div style="border:2px solid ${s.color}40;border-radius:12px;padding:18px;background:${s.bg}">
            <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
              <span style="font-size:28px">${s.icon}</span>
              <div>
                <div style="font-size:17px;font-weight:900;color:#0f172a">${s.sp}</div>
                <div style="font-size:12px;font-style:italic;color:#64748b">${s.eng}</div>
              </div>
            </div>
            <div style="display:flex;gap:6px;margin-bottom:10px;flex-wrap:wrap">
              <span style="font-size:12px;background:${s.color}20;color:${s.color};border-radius:6px;padding:3px 10px;font-weight:700">${s.fam}</span>
              <span style="font-size:12px;background:#f1f5f9;color:#475569;border-radius:6px;padding:3px 10px">${s.status}</span>
            </div>
            <div style="font-size:14px;color:#334155;line-height:1.75">${s.desc}</div>
          </div>`).join('')}
      </div>
    </div>

    <!-- 水質監測摘要 -->
    <div style="background:#fff;border:2px solid #e2e8f0;border-radius:16px;padding:24px;margin-bottom:24px">
      <div style="font-size:20px;font-weight:900;color:#0f172a;margin-bottom:6px">
        <i class="fas fa-tint" style="color:#0369a1;margin-right:10px"></i>調查期間水質環境監測摘要
      </div>
      <div style="font-size:14px;color:#64748b;margin-bottom:18px">橫流溪水質長期維持優良，符合保育類淡水魚類生存需求</div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:14px">
        ${[
          { label:'pH 值範圍',    val:'7.87 ～ 8.03', unit:'pH', note:'近中性偏弱鹼，水質優良', icon:'fa-flask', color:'#0e7490' },
          { label:'電導度範圍',   val:'265 ～ 363',   unit:'μS/m', note:'無污染，礦物質適中', icon:'fa-bolt', color:'#f97316' },
          { label:'水溫（夏季）', val:'22.5 ～ 24.9', unit:'°C', note:'適合原生魚類活躍活動', icon:'fa-thermometer-half', color:'#f43f5e' },
          { label:'水溫（冬季）', val:'11.0 ～ 11.4', unit:'°C', note:'低溫清水期族群集中', icon:'fa-snowflake', color:'#3b82f6' },
          { label:'流量（Q）',    val:'5.7 ～ 8.6',   unit:'m³/s', note:'水量充沛，棲地穩定', icon:'fa-water', color:'#22c55e' },
          { label:'棲地型態',     val:'急瀨・平瀨・水潭', unit:'', note:'空間異質高，魚類多樣', icon:'fa-layer-group', color:'#7c3aed' },
        ].map(c=>`
          <div style="border:1.5px solid #e2e8f0;border-radius:12px;padding:16px">
            <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
              <i class="fas ${c.icon}" style="color:${c.color};font-size:18px"></i>
              <div style="font-size:13px;color:#64748b">${c.label}</div>
            </div>
            <div style="font-size:20px;font-weight:900;color:#0f172a">${c.val} <span style="font-size:13px;font-weight:400;color:#94a3b8">${c.unit}</span></div>
            <div style="font-size:13px;color:#64748b;margin-top:4px">${c.note}</div>
          </div>`).join('')}
      </div>
    </div>

    <!-- ── 9種魚類完整歷年趨勢（整合區） ── -->
    <div id="secondarySpeciesTrend" style="margin-top:28px;padding-top:24px;border-top:2px dashed #e2e8f0">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:6px">
        <div style="width:5px;height:48px;background:linear-gradient(180deg,#3b82f6,#059669,#dc2626);border-radius:4px;flex-shrink:0"></div>
        <div>
          <div style="font-size:20px;font-weight:900;color:#0f172a">
            <i class="fas fa-chart-bar" style="color:#3b82f6;margin-right:8px"></i>9種魚類完整歷年趨勢（明潭吻鰕虎・粗首馬口鱲・短臀瘋鱨・短吻紅斑吻鰕虎）
          </div>
          <div style="font-size:14px;color:#64748b;margin-top:3px">
            上方堆疊圖已整合全9種；本區顯示4種次要物種之個別調查記錄趨勢（DB電捕法資料，107~113年）
          </div>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(290px,1fr));gap:18px;margin-top:18px">
        ${[
          // ── 5 種長期指標特有種（年度合計資料）｜cons＝2024臺灣紅皮書國家受脅等級 ──
          { id:'spTrend_臺灣白甲魚',     name:'臺灣白甲魚',     sci:'Onychostoma barbatulum',      cons:'近危', borderCol:'#bae6fd', topCol:'#0ea5e9', badge:'#e0f2fe', badgeTxt:'#0369a1', note:'特有種・2024紅皮書近危(NNT)・103~114年連續監測族群成長為優勢種' },
          { id:'spTrend_臺灣石魚賓',     name:'臺灣石魚賓',     sci:'Acrossocheilus paradoxus',    cons:'一般',   borderCol:'#fed7aa', topCol:'#f97316', badge:'#fff7ed', badgeTxt:'#9a3412', note:'特有種・2024紅皮書無危(NLC)・103年基準優勢種，現與白甲魚共存穩定' },
          { id:'spTrend_臺灣鬚鱲',       name:'臺灣鬚鱲',       sci:'Candidia barbata',            cons:'一般',   borderCol:'#e9d5ff', topCol:'#a855f7', badge:'#f5f3ff', badgeTxt:'#6b21a8', note:'特有種・2024紅皮書無危(NLC)・104年起持續記錄，中游水質指標種' },
          { id:'spTrend_纓口臺鰍',       name:'纓口臺鰍',       sci:'Formosania lacustre',         cons:'近危', borderCol:'#bbf7d0', topCol:'#22c55e', badge:'#f0fdf4', badgeTxt:'#15803d', note:'特有種・2024紅皮書近危(NNT，2017易危下修)・底棲吸附型，魚道通行已確認' },
          { id:'spTrend_臺灣間爬岩鰍',   name:'臺灣間爬岩鰍',   sci:'Hemimyzon formosanus',       cons:'近危', borderCol:'#fecaca', topCol:'#f43f5e', badge:'#fff1f2', badgeTxt:'#be123c', note:'特有種・2024紅皮書近危(NNT，2017易危下修)・魚道關聯最高，114年回升13尾' },
          // ── 4 種次要物種暨鰕虎科（電捕法DB記錄）──
          { id:'spTrend_明潭吻鰕虎',     name:'明潭吻鰕虎',     sci:'Rhinogobius candidianus',    cons:'一般',     borderCol:'#bfdbfe', topCol:'#2563eb', badge:'#dbeafe', badgeTxt:'#1e40af', note:'特有種・2024紅皮書無危(NLC)・109~114年累計 317 尾，數量最多' },
          { id:'spTrend_粗首馬口鱲',     name:'粗首馬口鱲',     sci:'Zacco pachycephalus',        cons:'一般',     borderCol:'#fde68a', topCol:'#b45309', badge:'#fef9c3', badgeTxt:'#92400e', note:'特有種・2024紅皮書無危(NLC)・107年累計 191 尾・112年4尾・113年6尾' },
          { id:'spTrend_短臀瘋鱨',       name:'短臀瘋鱨',       sci:'Tachysurus brevianalis',     cons:'易危',     borderCol:'#fecdd3', topCol:'#dc2626', badge:'#fee2e2', badgeTxt:'#991b1b', note:'特有種・2024紅皮書易危(NVU，2017無危上修)・109~114累計 4 尾' },
          { id:'spTrend_短吻紅斑吻鰕虎', name:'短吻紅斑吻鰕虎', sci:'Rhinogobius rubromaculatus', cons:'一般',     borderCol:'#d1fae5', topCol:'#059669', badge:'#ecfdf5', badgeTxt:'#065f46', note:'特有種・台灣2024紅皮書國家無危(NLC)；IUCN全球評估近危(NT)・109~114累計 14 尾' }
        ].map(sp => `
          <div style="background:#fff;border:2px solid ${sp.borderCol};border-top:4px solid ${sp.topCol};border-radius:14px;overflow:hidden">
            <div style="background:${sp.badge};padding:12px 16px 10px">
              <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px">
                <div style="font-size:19px;font-weight:800;color:#0f172a">${sp.name}</div>
                <span style="background:${sp.badge};color:${sp.badgeTxt};border:1.5px solid ${sp.borderCol};font-size:13px;padding:3px 10px;border-radius:20px;font-weight:700">${sp.cons}</span>
              </div>
              <div style="font-size:13px;font-style:italic;color:#64748b">${sp.sci}</div>
              <div style="font-size:13px;color:${sp.badgeTxt};margin-top:4px;font-weight:600">${sp.note}</div>
            </div>
            <div style="padding:12px 14px">
              <div style="position:relative;height:160px">
                <canvas id="${sp.id}"></canvas>
              </div>
              <div id="${sp.id}_nodata" style="display:none;text-align:center;padding:20px;color:#94a3b8;font-size:13px">
                <i class="fas fa-chart-bar" style="font-size:24px;margin-bottom:8px;display:block"></i>尚無足夠調查記錄
              </div>
            </div>
          </div>
        `).join('')}
      </div>
      <div style="margin-top:14px;padding:16px 20px;background:#f8fafc;border-radius:10px;font-size:15px;color:#475569;line-height:1.8;border-left:4px solid #3b82f6">
        <strong>整合說明：</strong>上方堆疊柱狀圖已納入全9種魚類。107~108年度數據依據《107~108年度橫流溪整治規劃設計監造與監測調查委託技術服務案成果報告》表4-16完整補充4季調查（107年5月/7月、108年4月/10月）。
        各次要物種首次記錄：短臀瘋鱨（107年5月，1尾）；短吻紅斑吻鰕虎（107年7月，2尾）。108年4月族群最豐，短吻紅斑吻鰕虎達6尾、短臀瘋鱨達3尾；
        明潭吻鰕虎在108年4月達133尾（歷年最高），是次要4種中最穩健的物種。粗首馬口鱲在107~108年度3站調查中未被記錄（0尾），112~113年始有穩定記錄（各4~6尾）。
      </div>

      <!-- 次要物種族群趨勢因素分析 -->
      <div style="margin-top:18px">
        <div style="font-size:19px;font-weight:800;color:#1e293b;margin-bottom:14px;display:flex;align-items:center;gap:8px">
          <i class="fas fa-microscope" style="color:#6366f1"></i> 次要4種族群趨勢・影響因素分析
        </div>

        <!-- 共通因素 -->
        <div style="background:#fefce8;border:1px solid #fde68a;border-left:4px solid #f59e0b;border-radius:10px;padding:14px 18px;margin-bottom:14px">
          <div style="font-size:16px;font-weight:700;color:#92400e;margin-bottom:10px"><i class="fas fa-layer-group" style="margin-right:6px"></i>共通影響因素</div>
          <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:10px;font-size:15px;color:#78350f">
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
              <div style="font-size:16px;font-weight:800;color:#0f172a">粗首馬口鱲</div>
              <div style="font-size:14px;color:#64748b">107年30尾 → 112年3尾</div>
              <span style="background:#fef3c7;color:#b45309;border-radius:999px;padding:3px 10px;font-size:13px;font-weight:700;margin-left:auto">下降最顯著</span>
            </div>
            <ul style="margin:0;padding-left:18px;font-size:15px;color:#475569;line-height:1.9">
              <li><strong>急流棲地縮減：</strong>馬口鱲偏好急流砂礫底，工程施作後若底質淤積或流速趨緩，適棲地縮減</li>
              <li><strong>白甲魚食物競爭：</strong>兩者均在急流段底棲覓食，白甲魚個體較大且數量龐大，競爭力佔優</li>
              <li><strong>電捕捕獲率偏低：</strong>馬口鱲游速快，電捕時逃逸率高，數字可能低估實際族群量</li>
            </ul>
          </div>

          <!-- 明潭吻鰕虎 -->
          <div style="background:#eff6ff;border:1px solid #bfdbfe;border-left:4px solid #3b82f6;border-radius:10px;padding:12px 14px">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;flex-wrap:wrap">
              <div style="width:10px;height:10px;border-radius:50%;background:#3b82f6;flex-shrink:0"></div>
              <div style="font-size:16px;font-weight:800;color:#0f172a">明潭吻鰕虎</div>
              <div style="font-size:14px;color:#64748b">110年130尾 → 113年27尾</div>
              <span style="background:#dbeafe;color:#1d4ed8;border-radius:999px;padding:3px 10px;font-size:13px;font-weight:700;margin-left:auto">輕微下降</span>
            </div>
            <ul style="margin:0;padding-left:18px;font-size:15px;color:#475569;line-height:1.9">
              <li><strong>礫石縫隙棲地壓縮：</strong>鰕虎高度依賴礫石縫隙，水道整治若底床均一化（護坡或人工砌石），縫隙棲地減少</li>
              <li><strong>族群自然波動：</strong>小型底棲魚類年際變動本就較大，25尾仍屬正常監測範圍，並非警報性下降</li>
              <li><strong>4種中族群最穩健：</strong>累計317尾為次要4種中最多，整體族群仍屬健康</li>
            </ul>
          </div>

          <!-- 短吻紅斑吻鰕虎 -->
          <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-left:4px solid #059669;border-radius:10px;padding:12px 14px">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;flex-wrap:wrap">
              <div style="width:10px;height:10px;border-radius:50%;background:#059669;flex-shrink:0"></div>
              <div style="font-size:16px;font-weight:800;color:#0f172a">短吻紅斑吻鰕虎</div>
              <div style="font-size:14px;color:#64748b">108年2尾 → 113年1尾</div>
              <span style="background:#dcfce7;color:#166534;border-radius:999px;padding:3px 10px;font-size:13px;font-weight:700;margin-left:auto">IUCN近危</span>
            </div>
            <ul style="margin:0;padding-left:18px;font-size:15px;color:#475569;line-height:1.9">
              <li><strong>族群基數極小：</strong>天然密度本就低，調查區域內可能只有穩定的「維持性小族群」，個位數波動屬正常</li>
              <li><strong>水質水文要求嚴苛：</strong>偏好高溶氧、低濁度清澈急流，汛期後沉積物增加即不適定居</li>
              <li><strong>繁殖成效保守：</strong>繁殖速率較低，族群擴增緩慢，對棲地干擾敏感度高</li>
            </ul>
          </div>

          <!-- 短臀瘋鱨 -->
          <div style="background:#fef2f2;border:1px solid #fecaca;border-left:4px solid #dc2626;border-radius:10px;padding:12px 14px">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;flex-wrap:wrap">
              <div style="width:10px;height:10px;border-radius:50%;background:#dc2626;flex-shrink:0"></div>
              <div style="font-size:16px;font-weight:800;color:#0f172a">短臀瘋鱨</div>
              <div style="font-size:14px;color:#64748b">108年4尾 → 112年5尾</div>
              <span style="background:#fee2e2;color:#b91c1c;border-radius:999px;padding:3px 10px;font-size:13px;font-weight:700;margin-left:auto">第三級保育・易危</span>
            </div>
            <ul style="margin:0;padding-left:18px;font-size:15px;color:#475569;line-height:1.9">
              <li><strong>趨勢尚無法判定：</strong>目前僅2個有效數據點，統計上不足以判定真實趨勢走向，需更多調查年度</li>
              <li><strong>夜行底棲難以電捕：</strong>電捕法對夜行性底棲魚捕獲率低，實際族群量可能被嚴重低估</li>
              <li><strong>建議加強夜間監測：</strong>保育第三級，應加入夜間蹲點目視計數，確認族群規模與繁殖成效</li>
            </ul>
          </div>
        </div>

        <!-- 監測建議 -->
        <div style="background:#f5f3ff;border:1px solid #ddd6fe;border-left:4px solid #8b5cf6;border-radius:10px;padding:16px 20px;font-size:15px;color:#4c1d95">
          <div style="font-weight:700;margin-bottom:10px;font-size:17px"><i class="fas fa-lightbulb" style="color:#7c3aed;margin-right:6px"></i>後續監測建議</div>
          <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:10px;color:#5b21b6;line-height:1.8">
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

    // 3. Shannon H' 多樣性散點
    const ctxDiv = document.getElementById('fishDiversityChart');
    if (ctxDiv) {
      new Chart(ctxDiv, {
        type: 'bar',
        data: {
          labels,
          datasets: [{
            label: "H' 多樣性指數",
            data: SURVEYS.map(s => s.H),
            backgroundColor: SURVEYS.map(s =>
              s.H >= 1.5 ? '#4ade8066' : s.H >= 0.8 ? '#fbbf2466' : '#f87171aa'),
            borderColor: SURVEYS.map(s =>
              s.H >= 1.5 ? '#22c55e' : s.H >= 0.8 ? '#f59e0b' : '#ef4444'),
            borderWidth: 1.5, borderRadius: 4,
          }]
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend:{ display:false } },
          scales: {
            x: { ticks:{ font:{size:12}, maxRotation:50 } },
            y: { min:0, max:2.2, title:{ display:true, text:"H'", font:{size:13} },
                 ticks:{ stepSize:0.5 } }
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
      new Chart(ctxFishwayType, {
        type: 'line',
        data: {
          labels: fishwayLabels,
          datasets: FISHWAY_TYPES.map(fw => ({
            label: fw.name,
            data: fishwayTargetCPUE(fw),
            borderColor: fw.color,
            backgroundColor: fw.color + '22',
            borderWidth: fw.key === 'submerged' ? 4 : 3,
            borderDash: fw.key === 'submerged' ? [6, 4] : [],
            pointRadius: 5,
            pointHoverRadius: 8,
            pointBackgroundColor: fw.color,
            tension: 0.32,
            fill: false
          }))
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          interaction: { mode: 'index', intersect: false },
          plugins: {
            legend: { position: 'bottom', labels: { boxWidth: 14, padding: 14, font: { size: 13, weight: '700' } } },
            tooltip: {
              titleFont: { size: 14, weight: '700' },
              bodyFont: { size: 14 },
              padding: 12,
              callbacks: {
                label(ctx) {
                  return `${ctx.dataset.label}：CPUE ${ctx.parsed.y} 尾/站訪次`;
                },
                afterLabel(ctx) {
                  const fw = FISHWAY_TYPES[ctx.datasetIndex];
                  const m = annualEffortMetrics[ctx.dataIndex];
                  const raw = fishwayTargetTotals(fw)[ctx.dataIndex];
                  return `關聯物種：${fishwayTargetNames(fw)}\n原始捕獲 ${raw} 尾 ÷ 站訪次 ${m?.effort||'?'}`;
                }
              }
            }
          },
          scales: {
            x: { ticks: { font: { size: 13, weight: '700' } } },
            y: {
              beginAtZero: true,
              ticks: { font: { size: 13, weight: '700' } },
              title: { display: true, text: 'CPUE（關聯魚種尾數/站訪次・努力量校正）', font: { size: 14, weight: '700' } }
            }
          }
        }
      });
    }

    // ── 努力量校正後趨勢：CPUE（尾/站訪次）與物種數 ──
    const _effLabels = annualEffortMetrics.map(m => m.label);
    const ctxCpue = document.getElementById('fishCpueTrend');
    if (ctxCpue && typeof annualEffortMetrics !== 'undefined') {
      new Chart(ctxCpue, {
        type: 'line',
        data: {
          labels: _effLabels,
          datasets: [
            {
              label: 'CPUE（尾/站訪次・努力量校正）',
              data: annualEffortMetrics.map(m => m.cpue),
              borderColor: '#047857', backgroundColor: '#04785722',
              borderWidth: 4, pointRadius: 5, pointHoverRadius: 8,
              pointBackgroundColor: '#047857', tension: 0.32, fill: true, yAxisID: 'y'
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
            y: { beginAtZero: true, position: 'left', title: { display: true, text: 'CPUE（尾/站訪次）', color: '#047857', font: { size: 12, weight: '700' } }, ticks: { color: '#047857' } },
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

    FISHWAY_TYPES.forEach(fw => {
      const ctx = document.getElementById(`fishwayTrend_${fw.key}`);
      if (!ctx) return;
      const cpue = fishwayTargetCPUE(fw);
      const raws = fishwayTargetTotals(fw);
      new Chart(ctx, {
        type: 'bar',
        data: {
          labels: fishwayLabels,
          datasets: [{
            label: 'CPUE（尾/站訪次）',
            data: cpue,
            backgroundColor: cpue.map((v, i) => i === cpue.length - 1 ? fw.color + 'dd' : fw.color + '66'),
            borderColor: fw.color,
            borderWidth: 2,
            borderRadius: 6
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              titleFont: { size: 13, weight: '700' },
              bodyFont: { size: 13 },
              padding: 12,
              callbacks: {
                label(c) { return `CPUE ${c.parsed.y} 尾/站訪次`; },
                afterBody(items) {
                  const i = items[0].dataIndex;
                  const m = annualEffortMetrics[i];
                  return [`原始捕獲 ${raws[i]} 尾 ÷ 站訪次 ${m?.effort||'?'}`, `關聯物種：${fishwayTargetNames(fw)}`];
                }
              }
            }
          },
          scales: {
            x: { ticks: { font: { size: 12, weight: '700' }, maxRotation: 0 } },
            y: { beginAtZero: true, ticks: { font: { size: 12, weight: '700' } }, title: { display: true, text: 'CPUE', font: { size: 11, weight: '700' } } }
          }
        }
      });
    });

    // ── 次要物種個別趨勢圖（從 DB 動態讀取）──
    const _secMeta = {
      '明潭吻鰕虎':     { color: '#2563eb' },
      '粗首馬口鱲':     { color: '#b45309' },
      '短臀瘋鱨':       { color: '#dc2626' },
      '短吻紅斑吻鰕虎': { color: '#059669' }
    };
    const _allFishRec = typeof DB !== 'undefined' ? DB.getAll('fish') : [];
    Object.entries(_secMeta).forEach(([spName, meta]) => {
      const recs = _allFishRec
        .filter(f => f.species === spName)
        .sort((a, b) => (a.date || '').localeCompare(b.date || ''));
      const canvasEl = document.getElementById(`spTrend_${spName}`);
      const noDataEl = document.getElementById(`spTrend_${spName}_nodata`);
      if (!canvasEl) return;
      if (!recs.length) {
        canvasEl.style.display = 'none';
        if (noDataEl) noDataEl.style.display = 'block';
        return;
      }
      const rLabels = recs.map(r => {
        if (!r.date) return '?';
        const yr = Number(r.date.slice(0, 4)) - 1911;
        const mo = Number(r.date.slice(5, 7));
        return `${yr}年${mo}月`;
      });
      const rData = recs.map(r => Number(r.count) || 0);
      const col = meta.color;
      const existChart = Chart.getChart ? Chart.getChart(canvasEl) : null;
      if (existChart) existChart.destroy();
      new Chart(canvasEl, {
        type: 'bar',
        data: {
          labels: rLabels,
          datasets: [{
            label: '捕獲尾數',
            data: rData,
            backgroundColor: col + 'bb',
            borderColor: col,
            borderWidth: 2,
            borderRadius: 6
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: ctx => `${ctx.raw} 尾`,
                afterLabel: ctx => recs[ctx.dataIndex]?.recorder ? `來源：${recs[ctx.dataIndex].recorder}` : ''
              }
            }
          },
          scales: {
            x: { ticks: { font: { size: 13, weight: '600' }, maxRotation: 40 } },
            y: {
              beginAtZero: true,
              ticks: { font: { size: 13 } },
              title: { display: true, text: '尾數', font: { size: 13 } }
            }
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
      new Chart(canvasEl, {
        type: 'bar',
        data: {
          labels: mLabels,
          datasets: [{ label: '年度合計', data: mData, backgroundColor: color + 'bb', borderColor: color, borderWidth: 2, borderRadius: 6 }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: { callbacks: { label: ctx => `${ctx.raw} 尾（年度合計）` } }
          },
          scales: {
            x: { ticks: { font: { size: 12, weight: '600' }, maxRotation: 40 } },
            y: { beginAtZero: true, ticks: { font: { size: 12 } }, title: { display: true, text: '尾數', font: { size: 12 } } }
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
  // CPUE（尾/站訪次）：排除歷年調查站數差異
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
        : '依魚道型式分組，以 CPUE（尾/站訪次）呈現103～114年努力量校正後趨勢。'}
    </div>
    <div style="background:#ecfeff;border-left:5px solid ${fw ? fw.color : '#0e7490'};border-radius:12px;padding:14px 18px;margin-bottom:18px;font-size:15px;color:#334155;line-height:1.75">
      <b style="color:#0e7490">努力量校正（CPUE）：</b>數值＝關聯魚種捕獲量 ÷ 當年站訪次，已排除歷年調查站數差異（107~110年3~6站、112年後1站）。折線長期上升方為魚道連通效益的可靠證據；非逐座魚道直接過魚量。
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
            label: `${fw.name} CPUE（尾/站訪次）`,
            data: totals,
            backgroundColor: totals.map((v, i) => i === totals.length - 1 ? fw.color + 'dd' : fw.color + '66'),
            borderColor: fw.color,
            borderWidth: 3,
            borderRadius: 8
          }]
        },
        options: fishwayLargeChartOptions(`關聯物種：${targetNames(fw)}（CPUE＝尾/站訪次）`, 'bar')
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
      x: { ticks: { font: { size: 16, weight: '700' } } },
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
      <div style="background:#ecfeff;border:1px solid #a5f3fc;border-left:4px solid #0e7490;border-radius:8px;padding:11px 14px;margin:0 0 12px;font-size:13px;color:#155e75;line-height:1.6">
        <i class="fas fa-circle-check" style="margin-right:5px"></i><b>資料統籌核對說明</b>：本清單「尾次」已與
        <b>歷年趨勢分析</b>統一，採完整歷年電捕調查序列（103~114年・${HLX_FISH_SURVEY_EVENTS}次季調查・成果報告表4-16／表5-3）逐筆合計，9種合計
        <b>${HLX_FISH_GRAND_TOTAL.toLocaleString()}</b> 尾次。
        例：臺灣間爬岩鰍完整累計 <b>104</b> 尾（先前因僅載入 3 筆代表性快照記錄而顯示 36 尾，已校正）。
      </div>
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
              ['fa-fish','#0e7490','#cffafe','魚類總計','1,523 尾','8 種・6 樣站'],
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
                  ['鰕虎科','明潭吻鰕虎',84,58,51,57,37,30,317],
                  ['','短吻紅斑吻鰕虎',2,4,2,3,2,1,14],
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
                  ${[278,270,246,286,142,301].map(v=>`<td style="padding:8px 10px;border:1px solid #b2ebf2;text-align:center;color:#0e7490">${v}</td>`).join('')}
                  <td style="padding:8px 10px;border:1px solid #b2ebf2;text-align:center;color:#0284c7;font-size:16px">1,523</td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- 粗首馬口鱲補充說明 -->
          <div style="margin-bottom:16px;padding:12px 16px;background:#fffbeb;border-left:4px solid #f59e0b;border-radius:0 8px 8px 0;font-size:13px;line-height:1.7">
            <span style="font-weight:700;color:#b45309"><i class="fas fa-info-circle"></i> 補充物種：粗首馬口鱲（<em>Zacco pachycephalus</em>，鯉科）</span>
            <span style="color:#78350f">　112年記錄 4 尾（體長73mm）、113年記錄 6 尾（體長68~105mm），109~114年間有零星記錄，因數量少未納入場域生態資源保全主調查表，但為橫流溪場域確認物種（102~108年累計191尾）。主要分布於中游礫石淺灘（0K+460~1K+000），族群受封溪護魚政策保護，持續穩定存在。</span>
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

      <!-- ── SECTION 5B：水域重點物種生態詳述 ── -->
      <div class="card" style="margin-top:16px;border-left:4px solid #6d28d9">
        <div class="card-header" style="background:linear-gradient(135deg,#f5f3ff 0%,#ede9fe 100%)">
          <span class="card-title" style="font-size:17px"><i class="fas fa-dna" style="color:#6d28d9"></i> 水域重點物種生態詳述</span>
          <span style="font-size:13px;color:#64748b">資料來源：112年溪魚調查（559筆）・113年・115年水域生物調查報告・場域生態資源保全（109~114年）</span>
        </div>
        <div class="card-body">

          <!-- 3物種卡片 -->
          <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(290px,1fr));gap:16px;margin-bottom:20px">

            <!-- 短臀瘋鱨 -->
            <div style="border:1px solid #fecdd3;border-top:4px solid #dc2626;border-radius:8px;overflow:hidden">
              <div style="background:#fff1f2;padding:12px 16px;border-bottom:1px solid #fecdd3">
                <div style="display:flex;align-items:center;gap:10px">
                  <img src="/webapp/assets/fish-photos/tachysurus-brevianalis.png" style="width:64px;height:46px;object-fit:cover;border-radius:4px;background:#f1f5f9" onerror="this.style.display='none'">
                  <div>
                    <div style="font-size:16px;font-weight:800;color:#0f172a">短臀瘋鱨</div>
                    <div style="font-size:12px;font-style:italic;color:#64748b">Tachysurus brevianalis</div>
                  </div>
                  <span style="margin-left:auto;background:#fee2e2;color:#991b1b;font-size:11px;padding:3px 8px;border-radius:20px;font-weight:700;white-space:nowrap">易危・第三級保育</span>
                </div>
              </div>
              <div style="padding:12px 16px;font-size:13px;line-height:1.7">
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:10px">
                  <div style="background:#fff1f2;border-radius:6px;padding:6px 10px"><span style="color:#9f1239;font-weight:700">體長範圍</span><br>11 ～ 220 mm</div>
                  <div style="background:#fff1f2;border-radius:6px;padding:6px 10px"><span style="color:#9f1239;font-weight:700">偏好流速</span><br>&gt; 0.8 m/s</div>
                  <div style="background:#fff1f2;border-radius:6px;padding:6px 10px"><span style="color:#9f1239;font-weight:700">底質偏好</span><br>礫石・岩石縫隙</div>
                  <div style="background:#fff1f2;border-radius:6px;padding:6px 10px"><span style="color:#9f1239;font-weight:700">活動習性</span><br>夜行性・底棲</div>
                </div>
                <div style="font-size:12px;color:#475569;margin-bottom:8px;line-height:1.6">
                  <b>109～114年累計：</b>4 尾（場域生態資源保全表，6樣站）<br>
                  <b>112年：</b>5 尾（體長 105～183 mm，成體）<br>
                  <b>114～115年：</b>6 尾
                </div>
                <div style="background:#fef9c3;border-radius:6px;padding:8px 10px;font-size:12px;color:#78350f;border-left:3px solid #f59e0b;line-height:1.6">
                  ⚠ 魚道建置後棲地適合度（WUA）小幅下降（流速減緩影響高流速偏好種），目前無魚道通行記錄。建議：保護高流速淺瀨棲地；加強夜間電捕監測；白天躲藏岩縫導致白日調查數量偏低，實際族群量可能更高。
                </div>
              </div>
            </div>

            <!-- 明潭吻鰕虎 -->
            <div style="border:1px solid #bfdbfe;border-top:4px solid #2563eb;border-radius:8px;overflow:hidden">
              <div style="background:#eff6ff;padding:12px 16px;border-bottom:1px solid #bfdbfe">
                <div style="display:flex;align-items:center;gap:10px">
                  <img src="/webapp/assets/fish-photos/rhinogobius-candidianus-field2.png" style="width:64px;height:46px;object-fit:cover;border-radius:4px;background:#f1f5f9" onerror="this.style.display='none'">
                  <div>
                    <div style="font-size:16px;font-weight:800;color:#0f172a">明潭吻鰕虎</div>
                    <div style="font-size:12px;font-style:italic;color:#64748b">Rhinogobius candidianus</div>
                  </div>
                  <span style="margin-left:auto;background:#dbeafe;color:#1e40af;font-size:11px;padding:3px 8px;border-radius:20px;font-weight:700;white-space:nowrap">一般物種</span>
                </div>
              </div>
              <div style="padding:12px 16px;font-size:13px;line-height:1.7">
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:10px">
                  <div style="background:#eff6ff;border-radius:6px;padding:6px 10px"><span style="color:#1e40af;font-weight:700">體長範圍</span><br>37 ～ 75 mm</div>
                  <div style="background:#eff6ff;border-radius:6px;padding:6px 10px"><span style="color:#1e40af;font-weight:700">偏好流速</span><br>0.9 ～ 1.0 m/s</div>
                  <div style="background:#eff6ff;border-radius:6px;padding:6px 10px"><span style="color:#1e40af;font-weight:700">偏好水深</span><br>0.1 ～ 0.15 m</div>
                  <div style="background:#eff6ff;border-radius:6px;padding:6px 10px"><span style="color:#1e40af;font-weight:700">底質偏好</span><br>礫石・卵石</div>
                </div>
                <div style="font-size:12px;color:#475569;margin-bottom:8px;line-height:1.6">
                  <b>109～114年累計：</b>317 尾（數量最多，6樣站）<br>
                  St.1（84）＞St.2（58）＞St.4（57）＞St.3（51）＞St.5（37）＞St.6（30）<br>
                  <b>112年（8次）：</b>41尾 ｜ <b>113年（5次）：</b>27尾 ｜ <b>115年（6次）：</b>33尾<br>
                  112年月別：4/18(6)、4/27(4)、5/30(2)、6/21(5)、9/22(2)、11/21(10)、11/27(4)、12/26(8)
                </div>
                <div style="background:#dbeafe;border-radius:6px;padding:8px 10px;font-size:12px;color:#1e3a8a;border-left:3px solid #3b82f6;line-height:1.6">
                  ✓ 魚道通行確認：潛越式（溪構5，13尾）及斜坡式（溪構3，12尾）為最適通行魚道，FPE指數最高。秋冬季族群活動較活躍，建議監測時間點含11～12月。
                </div>
              </div>
            </div>

            <!-- 短吻紅斑吻鰕虎 -->
            <div style="border:1px solid #d1fae5;border-top:4px solid #059669;border-radius:8px;overflow:hidden">
              <div style="background:#ecfdf5;padding:12px 16px;border-bottom:1px solid #d1fae5">
                <div style="display:flex;align-items:center;gap:10px">
                  <img src="/webapp/assets/fish-photos/rhinogobius-rubromaculatus-field.jpg" style="width:64px;height:46px;object-fit:cover;border-radius:4px;background:#f1f5f9" onerror="this.style.display='none'">
                  <div>
                    <div style="font-size:16px;font-weight:800;color:#0f172a">短吻紅斑吻鰕虎</div>
                    <div style="font-size:12px;font-style:italic;color:#64748b">Rhinogobius rubromaculatus</div>
                  </div>
                  <span style="margin-left:auto;background:#d1fae5;color:#065f46;font-size:11px;padding:3px 8px;border-radius:20px;font-weight:700;white-space:nowrap">IUCN 近危</span>
                </div>
              </div>
              <div style="padding:12px 16px;font-size:13px;line-height:1.7">
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:10px">
                  <div style="background:#ecfdf5;border-radius:6px;padding:6px 10px"><span style="color:#065f46;font-weight:700">體長範圍</span><br>27 ～ 46 mm（成體）</div>
                  <div style="background:#ecfdf5;border-radius:6px;padding:6px 10px"><span style="color:#065f46;font-weight:700">上溯能力</span><br>最大落差 ≤ 20 cm</div>
                  <div style="background:#ecfdf5;border-radius:6px;padding:6px 10px"><span style="color:#065f46;font-weight:700">St.2 最多（4尾）</span><br>各站均勻分布</div>
                  <div style="background:#ecfdf5;border-radius:6px;padding:6px 10px"><span style="color:#065f46;font-weight:700">與明潭比例</span><br>1 ∶ 22.6</div>
                </div>
                <div style="font-size:12px;color:#475569;margin-bottom:8px;line-height:1.6">
                  <b>109～114年累計：</b>14尾（6樣站均勻）<br>
                  <b>112年：</b>3尾（5/30：2尾 27~31mm；11/27：1尾 46mm）<br>
                  <b>113年：</b>1尾（6/27：41mm）｜ <b>115年：</b>1尾
                </div>
                <div style="background:#fef3c7;border-radius:6px;padding:8px 10px;font-size:12px;color:#78350f;border-left:3px solid #f59e0b;line-height:1.6">
                  ⚠ 族群稀少（約明潭吻鰕虎之4.4%），上溯能力受水位落差限制。魚道設計建議：每水池落差≤20cm以利通行；需每年定期監測確認族群趨勢。
                </div>
              </div>
            </div>

          </div><!-- end 3-species grid -->

          <!-- 綜合比較表 -->
          <div style="font-size:15px;font-weight:700;color:#6d28d9;margin-bottom:10px"><i class="fas fa-table-cells"></i> 3種重點物種綜合比較分析</div>
          <div style="overflow-x:auto">
            <table style="width:100%;border-collapse:collapse;font-size:13px;min-width:580px">
              <thead>
                <tr style="background:#f5f3ff">
                  <th style="padding:9px 12px;border:1px solid #ddd6fe;color:#6d28d9;text-align:left">物種</th>
                  <th style="padding:9px 12px;border:1px solid #ddd6fe;color:#6d28d9;text-align:center">109~114累計</th>
                  <th style="padding:9px 12px;border:1px solid #ddd6fe;color:#6d28d9;text-align:center">112年</th>
                  <th style="padding:9px 12px;border:1px solid #ddd6fe;color:#6d28d9;text-align:center">113年</th>
                  <th style="padding:9px 12px;border:1px solid #ddd6fe;color:#6d28d9;text-align:center">保育等級</th>
                  <th style="padding:9px 12px;border:1px solid #ddd6fe;color:#6d28d9;text-align:center">魚道通行</th>
                  <th style="padding:9px 12px;border:1px solid #ddd6fe;color:#6d28d9;text-align:left">主要管理議題</th>
                </tr>
              </thead>
              <tbody>
                ${[
                  ['短臀瘋鱨','4 尾','5 尾','—','易危・第三級','無通行記錄','棲地WUA下降；保護高流速淺瀨；加強夜間監測','#fee2e2','#991b1b'],
                  ['明潭吻鰕虎','317 尾','41 尾','27 尾','一般物種','溪構3(12尾)、溪構5(13尾)','FPE最高；秋冬調查效益佳；下游St.1族群最密','#dbeafe','#1e40af'],
                  ['短吻紅斑吻鰕虎','14 尾','3 尾','1 尾','IUCN近危','需落差≤20cm/池','族群稀少（明潭1/22.6）；魚道每池落差設計關鍵','#d1fae5','#065f46']
                ].map((r,i) => `
                  <tr style="${i%2===0?'background:#faf5ff':'background:#fff'}">
                    <td style="padding:8px 12px;border:1px solid #ede9fe;font-weight:700">${r[0]}</td>
                    <td style="padding:8px 12px;border:1px solid #ede9fe;text-align:center;font-weight:800;color:#6d28d9">${r[1]}</td>
                    <td style="padding:8px 12px;border:1px solid #ede9fe;text-align:center">${r[2]}</td>
                    <td style="padding:8px 12px;border:1px solid #ede9fe;text-align:center">${r[3]}</td>
                    <td style="padding:8px 12px;border:1px solid #ede9fe;text-align:center"><span style="font-size:11px;padding:2px 8px;border-radius:10px;background:${r[7]};color:${r[8]}">${r[4]}</span></td>
                    <td style="padding:8px 12px;border:1px solid #ede9fe;text-align:center;font-size:12px">${r[5]}</td>
                    <td style="padding:8px 12px;border:1px solid #ede9fe;font-size:12px;color:#475569">${r[6]}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>

          <!-- 甲殼類補充 -->
          <div style="margin-top:16px;display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:12px">
            <div style="background:#fffbeb;border:1px solid #fde68a;border-top:3px solid #f59e0b;border-radius:8px;padding:12px 14px;font-size:13px">
              <div style="font-weight:700;color:#b45309;margin-bottom:6px"><i class="fas fa-circle-dot"></i> 日月潭澤蟹 <em style="font-weight:400;font-size:12px">Nanhaipotamon formosanum</em></div>
              <div style="color:#78350f;line-height:1.6">台灣特有種 ・ IUCN 易危（VU）<br>109~114年累計 <b>21 隻</b>，St.1最多（8隻）<br>偏好礫石底質淺瀨，陷阱法捕獲</div>
            </div>
            <div style="background:#f0fdfa;border:1px solid #a5f3fc;border-top:3px solid #0e7490;border-radius:8px;padding:12px 14px;font-size:13px">
              <div style="font-weight:700;color:#0e7490;margin-bottom:6px"><i class="fas fa-circle-dot"></i> 粗糙沼蝦 <em style="font-weight:400;font-size:12px">Macrobrachium asperulum</em></div>
              <div style="color:#164e63;line-height:1.6">本土種 ・ 水質清潔指標物種<br>109~114年累計 <b>351 隻</b>，St.6最多（83隻）<br>6樣站均有穩定族群；陷阱法捕獲</div>
            </div>
          </div>

        </div>
      </div>

      <!-- ── SECTION 6：9種魚道通行成效彙整（110年電捕調查） ── -->
      <div class="card" style="margin-top:16px;border-top:4px solid #0369a1">
        <div class="card-header" style="background:#f0f9ff">
          <span class="card-title" style="font-size:17px">
            <i class="fas fa-route" style="color:#0369a1"></i>
            9種魚道通行與樣站電捕成效彙整（110年）
          </span>
          <span style="font-size:13px;color:#64748b">資料來源：110年東勢林區管理處國有林魚道及生態廊道成效追蹤報告</span>
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
                <div style="font-size:13px;color:#64748b">${label}</div>
                <div style="font-size:19px;font-weight:800;color:${col};line-height:1.2">${val}</div>
                <div style="font-size:12px;color:#94a3b8;margin-top:2px">${sub}</div>
              </div>
            `).join('')}
          </div>

          <div style="background:#fff7ed;border:1px solid #fed7aa;border-left:4px solid #f97316;border-radius:10px;padding:12px 14px;margin:-4px 0 18px;font-size:13px;line-height:1.75;color:#7c2d12">
            <b>資料口徑校正：</b>本區「74尾」為平台逐魚道通行彙整，表列魚類為5種；110年樣站電捕資料則依表5-3為第3次486尾、第4次235尾、全年合計721尾。
            表5-21顯示109年形質測量為7種，
            表5-22顯示110年形質測量為8種：明潭吻鰕虎、短吻紅斑吻鰕虎、臺灣白甲魚、臺灣石魚賓、臺灣間爬岩鰍、臺灣鬚鱲、纓口臺鰍、短臀瘋鱨。
            表5-7與表5-8合併之魚蝦蟹類水域生物總名錄為10種（8種魚類+粗糙沼蝦、芮氏明溪蟹）。
            表5-19之魚道中捕捉彙整為7種、306尾（109~110年四次調查合計）。因此本頁不再將「10種」作為魚類通行物種數。
          </div>

          <!-- 魚道成效表 -->
          <div style="overflow-x:auto;margin-bottom:18px">
            <table style="width:100%;border-collapse:collapse;font-size:14px;min-width:680px">
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
                    <td style="padding:9px 12px;border:1px solid #e0f2fe;font-size:13px">${r.type}</td>
                    <td style="padding:9px 12px;border:1px solid #e0f2fe;font-size:13px;color:#64748b">${r.km}</td>
                    <td style="padding:9px 12px;border:1px solid #e0f2fe;text-align:center;font-weight:800;font-size:16px;color:${r.n>10?'#0369a1':'#334155'}">${r.n||'—'}</td>
                    <td style="padding:9px 12px;border:1px solid #e0f2fe;font-size:13px;color:#334155">${r.species}</td>
                    <td style="padding:9px 12px;border:1px solid #e0f2fe;text-align:center">
                      <span style="background:${r.color};color:${r.tcolor};font-weight:800;font-size:13px;padding:3px 10px;border-radius:999px">${r.grade}</span>
                    </td>
                  </tr>
                `).join('')}
                <tr style="background:#e0f2fe;font-weight:800">
                  <td colspan="3" style="padding:9px 12px;border:1px solid #bae6fd;color:#0369a1">合計（9種魚道）</td>
                  <td style="padding:9px 12px;border:1px solid #bae6fd;text-align:center;font-size:18px;color:#0369a1">74</td>
                  <td style="padding:9px 12px;border:1px solid #bae6fd;font-size:13px;color:#0f172a">明潭吻鰕虎(30)・臺灣白甲魚(25)・臺灣石魚賓(14)・臺灣間爬岩鰍(2)・纓口臺鰍(2)</td>
                  <td style="padding:9px 12px;border:1px solid #bae6fd;text-align:center;font-size:13px;color:#166534">整體優</td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- 魚道型式推薦 -->
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:12px;margin-bottom:8px">
            <div style="background:#e0f2fe;border-radius:10px;padding:14px 16px;border-left:4px solid #0369a1">
              <div style="font-size:14px;font-weight:800;color:#0369a1;margin-bottom:8px"><i class="fas fa-star" style="margin-right:6px"></i>保育種通行（吻鰕虎、纓口臺鰍）</div>
              <div style="font-size:13px;color:#334155;line-height:1.7">優先採用<b>潛越式</b>（溪構5-2）或<b>斜坡式</b>（溪構3）<br>通行效率：明潭吻鰕虎 FPE &gt;86%</div>
            </div>
            <div style="background:#f0fdf4;border-radius:10px;padding:14px 16px;border-left:4px solid #16a34a">
              <div style="font-size:14px;font-weight:800;color:#166534;margin-bottom:8px"><i class="fas fa-arrow-up" style="margin-right:6px"></i>強游泳能力種（白甲魚）</div>
              <div style="font-size:13px;color:#334155;line-height:1.7">降壩式（溪構7）、梯狀階段式（溪構8-2）<br>最長通行距離確認：710m 以上（0K+460→1K+170）</div>
            </div>
            <div style="background:#fef3c7;border-radius:10px;padding:14px 16px;border-left:4px solid #d97706">
              <div style="font-size:14px;font-weight:800;color:#b45309;margin-bottom:8px"><i class="fas fa-layer-group" style="margin-right:6px"></i>多樣性最佳組合</div>
              <div style="font-size:13px;color:#334155;line-height:1.7">溪構4（階段式）：4種物種・11尾<br>潛越式+粗石斜曲面 組合提供最廣物種覆蓋</div>
            </div>
          </div>

        </div>
      </div>

      <!-- ── 魚道建置前後族群比對（103年 vs 110年+） ── -->
      <div class="card" style="margin-top:16px">
        <div class="card-header">
          <span class="card-title" style="font-size:17px"><i class="fas fa-chart-bar" style="color:#7c3aed"></i> 魚道建置前後族群比較</span>
          <span style="font-size:13px;color:#64748b">103年（2014）基準 vs 110年（2021）魚道通行／樣站電捕成效・物種組成對比</span>
        </div>
        <div class="card-body">
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
            <!-- 建置前（103年） -->
            <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:10px;padding:16px">
              <div style="font-size:15px;font-weight:800;color:#92400e;margin-bottom:12px">
                <i class="fas fa-clock-rotate-left" style="margin-right:6px"></i>建置前（103年 / 2014）
              </div>
              <div style="font-size:13px;color:#334155;margin-bottom:8px">調查地點：橫流溪下游（豐林橋附近）</div>
              ${[
                { sp:'臺灣石魚賓', n:22, pct:73, col:'#f97316' },
                { sp:'臺灣間爬岩鰍', n:8,  pct:27, col:'#f43f5e' },
                { sp:'臺灣白甲魚',  n:0,  pct:0,  col:'#0ea5e9' },
                { sp:'明潭吻鰕虎', n:0,  pct:0,  col:'#22c55e' }
              ].map(r=>`
                <div style="margin-bottom:10px">
                  <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:3px">
                    <span style="font-weight:700;color:#0f172a">${r.sp}</span>
                    <span style="color:${r.col};font-weight:800">${r.n} 尾</span>
                  </div>
                  <div style="background:#e5e7eb;border-radius:999px;height:8px;overflow:hidden">
                    <div style="width:${r.pct}%;background:${r.col};height:100%;border-radius:999px;transition:width 1s"></div>
                  </div>
                </div>
              `).join('')}
              <div style="font-size:12px;color:#92400e;margin-top:8px;background:#fef3c7;padding:8px 10px;border-radius:6px">
                ⚠️ 臺灣白甲魚稀少，石魚賓單一優勢，物種多樣性偏低
              </div>
            </div>

            <!-- 建置後（110年） -->
            <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:16px">
              <div style="font-size:15px;font-weight:800;color:#166534;margin-bottom:12px">
                <i class="fas fa-arrow-trend-up" style="margin-right:6px"></i>建置後（110年 / 2021）
              </div>
              <div style="font-size:13px;color:#334155;margin-bottom:8px">調查口徑：逐魚道通行彙整（9座魚道，全流域）</div>
              ${[
                { sp:'明潭吻鰕虎',  n:30, pct:100, col:'#22c55e' },
                { sp:'臺灣白甲魚',  n:25, pct:83,  col:'#0ea5e9' },
                { sp:'臺灣石魚賓',  n:14, pct:47,  col:'#f97316' },
                { sp:'臺灣間爬岩鰍',n:2,  pct:7,   col:'#f43f5e' }
              ].map(r=>`
                <div style="margin-bottom:10px">
                  <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:3px">
                    <span style="font-weight:700;color:#0f172a">${r.sp}</span>
                    <span style="color:${r.col};font-weight:800">${r.n} 尾</span>
                  </div>
                  <div style="background:#e5e7eb;border-radius:999px;height:8px;overflow:hidden">
                    <div style="width:${r.pct}%;background:${r.col};height:100%;border-radius:999px;transition:width 1s"></div>
                  </div>
                </div>
              `).join('')}
              <div style="font-size:12px;color:#166534;margin-top:8px;background:#dcfce7;padding:8px 10px;border-radius:6px">
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

          <!-- 鳥音監測教育訓練・現場照片 -->
          <div style="margin-top:4px">
            <div style="font-size:15px;font-weight:700;color:#7c3aed;margin-bottom:12px">
              <i class="fas fa-images" style="margin-right:6px"></i>鳥音監測教育訓練・現場照片
              <span style="font-size:12px;font-weight:400;color:#94a3b8;margin-left:8px">點選照片放大檢視</span>
            </div>
            <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:10px">
              ${[
                { file: '如與紅外線自動相機搭配可以蒐集到更完整的野生動物資訊。.jpg',
                  caption: '搭配紅外線自動相機可蒐集更完整的野生動物資訊' },
                { file: '臺中分署的同仁於課程中實地於戶外進行掛設操作。.jpg',
                  caption: '臺中分署同仁實地進行錄音機掛設操作' },
                { file: '僅需將錄音機以棉繩或扁帶吊掛於樣區的樹幹上，即可蒐集該區域的聲景資訊。.jpg',
                  caption: '錄音機以棉繩或扁帶吊掛於樹幹，蒐集聲景資訊' },
                { file: '鳥類地圖係以網格單位劃分調查區域並在一定年份內盡可能完成所有目標網格的調查方法，全球已有93個國家推動超過600項相關計畫(照片來源：eBird臺灣鳥類地圖網站).png',
                  caption: 'Taiwan Bird Atlas：網格調查法，全球93國推動超過600項計畫（來源：eBird臺灣鳥類地圖）' },
                { file: '農業部生物多樣性研究所的林瑞興組長向臺中分署的同仁介紹如何利用錄音機於伐採跡地進行監測調查。.jpg',
                  caption: '農業部生物多樣性研究所林瑞興組長介紹伐採跡地錄音機監測調查' },
                { file: '錄音機體積小，攜帶架設相當便利，並具有藍芽功能可搭配智慧型手機APP進行設計與資料讀取。(照片來源：Wildlife Acoustics官網).png',
                  caption: '錄音機體積小、攜帶便利，具藍芽功能可搭配手機APP操作（來源：Wildlife Acoustics）' }
              ].map(p => {
                const base = '/media/非橫流溪資料/02_其他流域生態/1150515_0423鳥音監測教育訓練/使用照片/';
                const src = base + encodeURIComponent(p.file);
                return `
                  <div onclick="terrainPhotoOpen('${src.replace(/'/g,"\\'")}','${p.caption.replace(/'/g,"\\'")}' )"
                    style="cursor:pointer;border-radius:10px;overflow:hidden;border:1px solid #ddd6fe;background:#f5f3ff;transition:box-shadow .2s"
                    onmouseover="this.style.boxShadow='0 4px 16px rgba(124,58,237,.25)'" onmouseout="this.style.boxShadow='none'">
                    <div style="height:148px;overflow:hidden;background:#ede9fe">
                      <img src="${src}" alt="${p.caption}"
                        style="width:100%;height:100%;object-fit:cover;display:block"
                        onerror="this.closest('div').style.background='#f3f4f6';this.style.display='none'">
                    </div>
                    <div style="padding:8px 10px;font-size:12px;color:#4c1d95;line-height:1.45;background:#f5f3ff">${p.caption}</div>
                  </div>
                `;
              }).join('')}
            </div>
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
               <div style="font-size:14px;font-weight:900;color:#0f172a;white-space:nowrap;
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
      : `<div style="min-width:200px;font-size:13px">
           ${photo ? `<img src="${photo.image}" onerror="this.onerror=null;this.src='/webapp/assets/fish-photos/field-measurement.jpg'" style="width:100%;height:110px;object-fit:cover;border-radius:6px;margin-bottom:8px">` : ''}
           <div style="font-weight:900;font-size:15px;color:#0f172a;margin-bottom:2px">${fish_escape(def.species)}</div>
           <div style="font-size:12px;color:#64748b;font-style:italic;margin-bottom:8px">${fish_escape(def.scientificName||'')}</div>
           <div style="display:grid;grid-template-columns:1fr 1fr;gap:5px;margin-bottom:8px;font-size:12px">
             <div><b>保育：</b><span style="color:${col};font-weight:700">${cons}</span></div>
             <div><b>區域：</b>${zoneLabel}水域</div>
             <div><b>累計：</b>${Number(def.totalCount)||0} 尾次</div>
             <div><b>記錄：</b>${def.surveys||0} 筆</div>
           </div>
           <div style="background:#f0fdfa;border-left:3px solid #0e7490;padding:7px 8px;border-radius:0 5px 5px 0;font-size:12px">
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
               <div style="font-size:13px;font-weight:900;color:#0f172a;white-space:nowrap;
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
      <div style="min-width:240px;font-size:13px">
        <div style="font-weight:900;font-size:16px;color:${fw.typeColor};margin-bottom:6px;border-bottom:2px solid ${fw.typeColor};padding-bottom:5px">
          ${_statusBadge(fw.status)} ${fw.code}　${fw.typeName}
        </div>
        <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:8px;font-size:12px">
          <span><b>樁號：</b>${fw.km}</span>
          <span><b>狀態：</b><span style="color:${fw.status==='堵塞列管'?'#dc2626':fw.status==='需維護'?'#d97706':'#16a34a'};font-weight:700">${fw.status}</span></span>
        </div>
        <div style="font-size:13px;font-weight:700;color:#0f172a;margin-bottom:6px">114年聯關尾數：
          <span style="color:${fw.typeColor};font-size:15px;font-weight:900">${fw.count114}</span>
          <span style="font-size:12px;color:#16a34a;font-weight:700">&nbsp;${fw.delta} 較106年</span>
        </div>
        <div style="font-weight:700;font-size:12px;color:#475569;margin-bottom:5px">🐟 關聯保育魚種（110年電捕調查）：</div>
        ${fw.species.map(sp=>`
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:5px;
            background:#f8fafc;border-radius:6px;padding:5px 8px;border-left:3px solid ${sp.color}">
            <div style="width:38px;height:24px;flex-shrink:0">${fish_speciesSvg(sp.shape)}</div>
            <div>
              <div style="font-weight:700;font-size:13px;color:#0f172a">${sp.name}</div>
              <div style="font-size:11px;color:${_consColor(sp.cons)}">● ${sp.cons}&nbsp;&nbsp;110年電捕：${sp.count110>0?sp.count110+'尾':'微量'}</div>
            </div>
          </div>`).join('')}
        <div style="font-size:11px;color:#94a3b8;margin-top:6px;border-top:1px solid #e2e8f0;padding-top:5px">
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
                 <div style="font-size:10px;font-weight:700;color:${_consColor(sp.cons)};
                   background:rgba(255,255,255,.88);border-radius:4px;padding:1px 5px;margin-top:1px">
                   ${sp.cons}
                 </div>
               </div>`,
        iconSize: [52, 80], iconAnchor: [26, 12]
      });

      const spPopup = `
        <div style="min-width:190px;font-size:13px">
          <div style="font-weight:900;font-size:14px;color:${sp.color};margin-bottom:4px">
            ${sp.name}</div>
          <div style="color:#64748b;font-style:italic;font-size:11px;margin-bottom:6px">
            保育等級：<span style="color:${_consColor(sp.cons)};font-weight:700">${sp.cons}</span>
          </div>
          <div style="background:#f0fdfa;border-left:3px solid ${fw.typeColor};
            border-radius:0 5px 5px 0;padding:6px 8px;font-size:12px;margin-bottom:6px">
            <b>分布魚道：</b>${fw.code} ${fw.typeName}<br>
            <b>樁號：</b>${fw.km}
          </div>
          <div style="font-size:12px">
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
      'font-size:13px',
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
      <div style="font-weight:900;color:#0e7490;margin-bottom:4px;font-size:13px">
        <i class="fas fa-map-pin"></i> 點擊座標
      </div>
      <div style="font-size:14px;color:#0f172a;line-height:1.8">
        lat: <b>${lat}</b><br>
        lng: <b>${lng}</b>
      </div>
      <div style="display:flex;gap:6px;margin-top:8px">
        <button onclick="navigator.clipboard.writeText('${lat},${lng}').then(()=>{this.textContent='✓ 已複製';setTimeout(()=>{this.textContent='複製'},1500)})"
          style="flex:1;border:none;background:#0e7490;color:#fff;border-radius:5px;padding:4px 0;cursor:pointer;font-size:12px;font-weight:700">
          複製
        </button>
        <button onclick="document.getElementById('biogisCoordBox').style.display='none'"
          style="border:none;background:#e2e8f0;color:#475569;border-radius:5px;padding:4px 10px;cursor:pointer;font-size:12px">
          ✕
        </button>
      </div>
      <div style="font-size:11px;color:#94a3b8;margin-top:6px">點擊地圖任意位置可取得座標</div>
    `;
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
            <div style="font-size:13px;color:#64748b;margin-top:2px">${items.length} 項記錄・點擊展開</div>
          </div>
          <span style="background:#fff;border:2px solid ${cat.color}66;color:${cat.color};border-radius:999px;padding:4px 13px;font-size:16px;font-weight:800;min-width:36px;text-align:center">${items.length}</span>
          <i id="${id}_arrow" class="fas fa-chevron-down" style="color:${cat.color};font-size:18px;transition:transform .25s;flex-shrink:0;margin-right:4px"></i>
        </button>
        <button data-q="${catQ}"
          onclick="fish_openAIQA(this.getAttribute('data-q'))"
          title="AI問答：${cat.category}"
          style="flex-shrink:0;background:#f5f3ff;border:1.5px solid #818cf8;color:#4f46e5;border-radius:10px;padding:6px 10px;font-size:12px;font-weight:700;cursor:pointer;white-space:nowrap;margin-right:4px">
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
              ${item.detail ? `<div style="font-size:15px;color:#334155;line-height:1.5">${fish_escape(item.detail)}</div>` : ''}
              ${item.extra ? `<div style="font-size:13px;color:#94a3b8;margin-top:3px">${fish_escape(item.extra)}</div>` : ''}
            </div>
            ${item.tag ? `<span style="${tagStyle(item.tag)};font-size:13px;font-weight:700;padding:5px 12px;border-radius:999px;white-space:nowrap;flex-shrink:0">${fish_escape(item.tag)}</span>` : ''}
            <button data-q="${itemQ}"
              onclick="event.stopPropagation();fish_openAIQA(this.getAttribute('data-q'))"
              title="AI問答：${fish_escape(item.name)}"
              style="flex-shrink:0;background:#f5f3ff;border:1.5px solid #818cf8;color:#4f46e5;border-radius:8px;padding:5px 9px;font-size:12px;font-weight:700;cursor:pointer;white-space:nowrap;align-self:center">
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
      ${caption ? `<div style="font-size:13px;color:#cbd5e1;max-width:500px;line-height:1.5">${caption}</div>` : ''}
      <div style="font-size:12px;color:#64748b;margin-top:8px">點擊任意處關閉</div>
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
