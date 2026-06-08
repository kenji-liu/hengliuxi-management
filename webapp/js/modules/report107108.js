// 107~108年成果報告整合模組

/* ── TWD97 TM2（EPSG:3826）→ WGS84（EPSG:4326）線性轉換 ────────────
   錨點：TWD97(240716, 2674967) → WGS84(24.1757°N, 120.9086°E)
   來源：wdms.moenv.gov.tw 環境部官方座標轉換服務驗證 + 衛星圖對位校正
   比例：緯度 9.0090e-6 deg/m，經度 9.8810e-6 deg/m
   精度：±1~2m                                               ── */
function r108_twd97ToWgs84(tx, ty) {
  const ax = 240716, ay = 2674967;
  const alat = 24.1713, alng = 120.9086;
  return {
    lat: +(alat + (ty - ay) * 9.0090e-6).toFixed(5),
    lng: +(alng + (tx - ax) * 9.8810e-6).toFixed(5)
  };
}

// 14 設施 + 3 調查樣站 = 17 筆圖層點位
function r108_get17Points() {
  const facs = DB.getAll('facilities');
  const pts = facs.map(f => ({
    no: f.code, name: f.name, type: f.subType || f.type,
    stationKm: f.stationKm, twd97x: f.twd97x, twd97y: f.twd97y,
    lat: f.lat, lng: f.lng, isFacility: true
  }));
  const surveys = [
    { no:'S1', name:'電魚調查樣站 S1（107年）', type:'電魚', stationKm:'0K+460', twd97x:240716, twd97y:2675003 },
    { no:'S2', name:'電魚調查樣站 S2（107年）', type:'電魚', stationKm:'0K+740', twd97x:240817, twd97y:2675440 },
    { no:'S3', name:'電魚調查樣站 S3（107年）', type:'電魚', stationKm:'1K+000', twd97x:240812, twd97y:2675445 }
  ].map(s => ({ ...s, ...r108_twd97ToWgs84(s.twd97x, s.twd97y), isFacility: false }));
  return [...pts, ...surveys];
}

// 單張成果報告卡
function r108_card(icon, color, title, bodyHtml, tags) {
  return `
    <div class="card" style="margin:0;border-top:3px solid ${color}">
      <div class="card-body" style="padding:14px">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">
          <div style="width:32px;height:32px;border-radius:8px;background:${color};display:flex;align-items:center;justify-content:center;flex-shrink:0">
            <i class="fas ${icon}" style="color:#fff;font-size:14px"></i>
          </div>
          <span style="font-weight:700;font-size:13px;line-height:1.3">${title}</span>
        </div>
        <div style="font-size:12px;color:#444;line-height:1.85;margin-bottom:10px">${bodyHtml}</div>
        <div style="display:flex;flex-wrap:wrap;gap:4px">
          ${tags.map(t => `<span style="font-size:10px;background:${color}22;color:${color};padding:2px 7px;border-radius:10px;font-weight:600">${t}</span>`).join('')}
        </div>
      </div>
    </div>`;
}

function renderReport107108() {
  const facs = DB.getAll('facilities');

  document.getElementById('contentArea').innerHTML = `
    <div style="padding-bottom:28px">

      <!-- ── 標題橫幅 ── -->
      <div style="background:linear-gradient(135deg,#1a6b3c 0%,#0d47a1 100%);color:#fff;border-radius:12px;padding:20px 24px;margin-bottom:20px">
        <div style="font-size:11px;opacity:0.75;letter-spacing:1px;margin-bottom:6px">三、數位化與 AI 智慧分析作業</div>
        <h2 style="margin:0 0 8px;font-size:20px;font-weight:700">107~108 年度橫流溪整治規劃設計監造與監測調查</h2>
        <div style="display:flex;flex-wrap:wrap;gap:18px;font-size:12px;opacity:0.9">
          <span><i class="fas fa-map" style="margin-right:4px"></i>集水區 2,337 公頃</span>
          <span><i class="fas fa-hard-hat" style="margin-right:4px"></i>14 座構造物</span>
          <span><i class="fas fa-fish" style="margin-right:4px"></i>9 物種 · 133 尾（107年）</span>
          <span><i class="fas fa-water" style="margin-right:4px"></i>一維／二維 HEC-RAS</span>
          <span><i class="fas fa-satellite" style="margin-right:4px"></i>UAV 正射影像 GSD 5cm</span>
        </div>
      </div>

      <!-- ── Google Maps iframe + 設施快速定位 ── -->
      <div style="display:grid;grid-template-columns:2fr 1fr;gap:16px;margin-bottom:16px">

        <!-- Google Maps 衛星圖 -->
        <div class="card" style="margin:0">
          <div class="card-header">
            <span class="card-title"><i class="fas fa-map"></i> 設施位置衛星圖（Google Maps）</span>
            <a href="https://www.google.com/maps/@24.1833,120.9091,15z?entry=ttu" target="_blank"
               class="btn btn-sm btn-outline" style="flex-shrink:0">
              <i class="fas fa-external-link-alt"></i> 開啟新視窗
            </a>
          </div>
          <div class="card-body" style="padding:0;overflow:hidden;border-radius:0 0 8px 8px">
            <iframe id="r108GmapFrame"
              src="https://maps.google.com/maps?q=24.1833,120.9091&z=15&t=k&output=embed&hl=zh-TW"
              width="100%" height="400" frameborder="0"
              style="border:0;display:block"
              allowfullscreen loading="lazy">
            </iframe>
            <div style="padding:7px 14px;background:#f0f7f0;font-size:11px;color:#666;border-top:1px solid #e0e0e0;display:flex;gap:12px;align-items:center">
              <span>📍 中心：WGS84 <code style="background:#e8f5e9;padding:1px 5px;border-radius:3px">24.1833°N, 120.9091°E</code></span>
              <span style="color:#aaa">衛星底圖 © Google</span>
            </div>
          </div>
        </div>

        <!-- 設施快速定位列表 -->
        <div class="card" style="margin:0">
          <div class="card-header">
            <span class="card-title"><i class="fas fa-map-pin"></i> 設施快速定位</span>
            <span class="badge badge-primary">${facs.length} 座</span>
          </div>
          <div class="card-body" style="padding:8px">
            <div style="font-size:11px;color:var(--text-muted);padding:2px 6px 8px;line-height:1.5">
              🖱️ 點選設施 → 衛星圖跳轉 + WGS84 座標顯示
            </div>
            <div style="max-height:336px;overflow-y:auto">
              ${facs.sort((a,b)=>a.id-b.id).map(f => `
                <div onclick="r108_jumpMap(${f.lat},${f.lng},'${f.name.replace(/'/g,"\\'")}','${f.stationKm||''}')"
                     class="r108-fac-row"
                     style="padding:5px 8px;border-radius:6px;cursor:pointer;display:flex;align-items:center;gap:7px;margin-bottom:2px">
                  <span style="font-size:9px;font-weight:700;background:#1a6b3c;color:#fff;padding:1px 5px;border-radius:8px;flex-shrink:0;white-space:nowrap">${f.stationKm||'-'}</span>
                  <span style="font-size:11px;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${f.name}</span>
                  <span style="font-size:9px;color:#ccc;flex-shrink:0;font-family:monospace">${f.lat?.toFixed(4)}</span>
                </div>
              `).join('')}
            </div>
          </div>
        </div>
      </div>

      <!-- ── WGS84 座標顯示列（點選後出現） ── -->
      <div id="r108CoordBar" style="display:none;background:#e8f5e9;border:1px solid #a5d6a7;border-radius:8px;padding:10px 16px;margin-bottom:16px;align-items:center;gap:12px;flex-wrap:wrap;font-size:13px">
        <i class="fas fa-map-marker-alt" style="color:#1a6b3c"></i>
        <span id="r108CoordText" style="flex:1"></span>
        <a id="r108GmapLink" href="#" target="_blank"
           style="background:#4285f4;color:#fff;padding:4px 12px;border-radius:10px;font-size:11px;text-decoration:none;font-weight:600;flex-shrink:0;display:flex;align-items:center;gap:4px">
          <i class="fas fa-map-marker-alt" style="font-size:9px"></i> Google Maps 導覽
        </a>
      </div>

      <!-- ── 8 張成果報告卡 ── -->
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:20px">
        ${r108_card('fa-globe-asia','#1a6b3c','集水區概況',
          '面積：<b>2,337 公頃</b><br>主流長度：約 4.5 km<br>管理河段：0K+000 ～ 1K+400<br>行政區：臺中市和平區<br>海拔：760 ～ 1,200 m<br>流域：大甲溪左岸一級支流',
          ['2,337 公頃','0K～1K+400','和平區'])}
        ${r108_card('fa-satellite','#0d47a1','GIS／UAV／DSM 測繪',
          '正射影像 GSD：<b>5 cm</b><br>數值表面模型 DSM：1 m<br>測繪期間：民國 107～108 年<br>14 座構造物精確定位<br>TWD97 TM2 全面建立<br>電子圖冊 + GIS 圖層產製',
          ['UAV','GSD 5cm','TWD97','DSM'])}
        ${r108_card('fa-fish','#00695c','魚類調查',
          '調查方法：手持電魚機（backpack）<br>記錄物種：<b>9 種</b><br>107年5月合計：133 尾（4站）<br>保育魚類：5 種（易危×3、近危×2）<br>優勢種：臺灣白甲魚 73 尾<br>調查樣站：S1 ~ S4（四站）',
          ['9 種','133 尾','5 保育種'])}
        ${r108_card('fa-tint','#006064','水質監測',
          '監測指標：DO、BOD₅、SS、NH₃-N<br>監測時間：民國 108 年 4 月<br>監測座標：TWD97 (240716, 2675003)<br>DO：8.2 mg/L（優良）<br>BOD₅：1.8 mg/L<br>RPI 等級：<b>甲類（未受污染）</b>',
          ['RPI 甲類','DO 8.2','未受污染'])}
        ${r108_card('fa-leaf','#2e7b32','棲地調查',
          '電魚樣站：4 站（S1~S4）<br>水質採樣：1 站（0K+460）<br>棲地類型：礫石淺灘、急流、緩流深潭<br>底質：礫石、卵石為主<br>最佳棲地：<b>優良</b>（S2，0K+740）<br>HBI 生物指數：良好 ～ 優良',
          ['HBI 優良','礫石棲地','4 樣站'])}
        ${r108_card('fa-water','#0277bd','一維／二維水理模式',
          '一維模式：HEC-RAS 1D 縱斷面水面線<br>二維模式：HEC-RAS 2D 洪氾範圍模擬<br>Q₁₀ = 39.6 m³/s<br>Q₅₀ = 67.4 m³/s<br>固床工沖淤分析：全部合格<br>各魚道流速驗算：<b>全數達標</b>',
          ['HEC-RAS','流速達標','Q₅₀ 洪水'])}
        ${r108_card('fa-hard-hat','#4527a0','五區改善成果',
          '<b>改善魚道：5 處</b><br>1K+400：粗石斜曲面 + 改良型舟通式<br>1K+315：溪構2 階段式<br>1K+225：溪構3 斜坡式<br>1K+170：溪構4 階段式<br>1K+000：溪構5-2 潛越式（待修復）',
          ['5 區改善','通行率↑','棲地連通'])}
        ${r108_card('fa-shield-alt','#b71c1c','保育魚類棲地反應',
          '<b>臺灣白甲魚</b>：急流礫石底質，魚道通行最佳<br><b>臺灣石魚賓</b>：礫石深潭、中流速緩流段<br><b>纓口臺鰍</b>：底棲吸附型，急流礫石縫隙<br><b>明潭吻鰕虎</b>：底棲，礫石卵石縫隙<br>→ 連通改善後<b>族群密度顯著提升</b>',
          ['臺灣白甲魚','纓口臺鰍','族群密度↑'])}
      </div>

      <!-- ── 17 筆圖層點位座標對照表 ── -->
      <div class="card">
        <div class="card-header">
          <span class="card-title"><i class="fas fa-table"></i> TWD97 → WGS84 座標對照表（17 筆圖層點位）</span>
          <span style="font-size:11px;color:var(--text-muted)">錨點：TWD97(240716, 2675003) → WGS84(24.1801°N, 120.9086°E)　精度 ±5m</span>
        </div>
        <div class="card-body" style="padding:0">
          <div class="table-container">
            <table>
              <thead>
                <tr>
                  <th style="width:32px;text-align:center">#</th>
                  <th style="white-space:nowrap">代碼</th>
                  <th>名稱</th>
                  <th style="white-space:nowrap">里程</th>
                  <th>類型</th>
                  <th style="white-space:nowrap">TWD97 X</th>
                  <th style="white-space:nowrap">TWD97 Y</th>
                  <th style="white-space:nowrap">WGS84 緯度 °N</th>
                  <th style="white-space:nowrap">WGS84 經度 °E</th>
                  <th style="width:76px">Google Maps</th>
                </tr>
              </thead>
              <tbody id="r108CoordTbody"></tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- ── 魚道圖冊與維護管理銜接 ── -->
      <div class="card" style="margin-top:16px">
        <div class="card-header">
          <span class="card-title"><i class="fas fa-book-open"></i> 魚道圖冊與維護管理銜接方向</span>
        </div>
        <div class="card-body">
          <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:16px">
            ${[
              ['📋','魚道設計圖冊',
               '14 座構造物逐一建立設計圖冊，含橫斷面、縱斷面、魚道剖面圖；TWD97 座標全面標注，可直接匯入 GIS 系統進行空間分析與位置核對。'],
              ['🔧','維護管理手冊',
               '依「橫流溪重要設施維護管理手冊」逐座建立巡查表，每季現場巡查。修復優先順序：溪構5-2（緊急）→ 溪構11、溪構4（高優先）→ 其餘設施定期維護。'],
              ['📡','數位化平台整合',
               '本平台整合 14 座設施的 TWD97/WGS84 座標、現況照片、巡查紀錄、修復狀態；支援行動裝置現場查詢與 Google Maps 衛星圖定位導覽。']
            ].map(([e, t, d]) => `
              <div style="background:#f8fafb;border-radius:8px;padding:16px;border-left:3px solid #1a6b3c">
                <div style="font-size:22px;margin-bottom:8px">${e}</div>
                <div style="font-weight:700;font-size:14px;margin-bottom:8px;color:var(--text)">${t}</div>
                <div style="font-size:12px;line-height:1.8;color:var(--text-light)">${d}</div>
              </div>`).join('')}
          </div>
        </div>
      </div>

    </div>
  `;

  r108_injectStyles();
  r108_renderCoordTable();
}

function r108_injectStyles() {
  if (document.getElementById('r108Style')) return;
  const s = document.createElement('style');
  s.id = 'r108Style';
  s.textContent = `
    .r108-fac-row { transition: background 0.12s; }
    .r108-fac-row:hover { background: #e8f5e9 !important; }
    .r108-fac-row:active { background: #c8e6c9 !important; }
  `;
  document.head.appendChild(s);
}

function r108_renderCoordTable() {
  const tbody = document.getElementById('r108CoordTbody');
  if (!tbody) return;
  const points = r108_get17Points();
  const typeColor = {
    '之字形魚道':'#1565c0','降壩魚道':'#0d47a1','潛越式魚道':'#00838f',
    '階段式魚道':'#1976d2','斜坡魚道':'#0288d1','粗石斜曲面式魚道':'#4527a0',
    '改良型舟通式魚道':'#00695c','固床工':'#827717','隔梳式固床工':'#558b2f',
    '階梯式固床工':'#33691e','防砂構造物':'#795548','護岸':'#546e7a','電魚':'#2e7d32'
  };
  tbody.innerHTML = points.map((p, i) => {
    const c = typeColor[p.type] || '#455a64';
    const gm = `https://www.google.com/maps/@${p.lat},${p.lng},18z?entry=ttu`;
    const bg = !p.isFacility ? 'background:#f0fdf4' : (i % 2 ? 'background:#fafafa' : '');
    return `<tr style="${bg}">
      <td style="text-align:center;font-size:11px;color:#aaa;font-weight:600">${i+1}</td>
      <td style="font-weight:700;font-size:11px;color:#1565c0;white-space:nowrap">${p.no||''}</td>
      <td style="font-size:12px;font-weight:600">${p.name}</td>
      <td style="font-weight:700;font-size:11px;color:#1565c0;white-space:nowrap">${p.stationKm||'-'}</td>
      <td><span style="background:${c};color:#fff;font-size:10px;padding:1px 6px;border-radius:8px;white-space:nowrap">${p.type}</span></td>
      <td style="font-family:monospace;font-size:11px;color:#555;white-space:nowrap">${p.twd97x?.toLocaleString()||'-'}</td>
      <td style="font-family:monospace;font-size:11px;color:#555;white-space:nowrap">${p.twd97y?.toLocaleString()||'-'}</td>
      <td style="font-family:monospace;font-size:12px;color:#2e7d32;font-weight:700;white-space:nowrap">${p.lat?.toFixed(5)||'-'}</td>
      <td style="font-family:monospace;font-size:12px;color:#0d47a1;font-weight:700;white-space:nowrap">${p.lng?.toFixed(5)||'-'}</td>
      <td>
        <a href="${gm}" target="_blank"
           style="display:inline-flex;align-items:center;gap:3px;background:#4285f4;color:#fff;font-size:10px;padding:3px 8px;border-radius:10px;text-decoration:none;font-weight:600;white-space:nowrap">
          <i class="fas fa-map-marker-alt" style="font-size:8px"></i>查看
        </a>
      </td>
    </tr>`;
  }).join('');
}

// 點選設施 → iframe 跳轉 + 座標列顯示
function r108_jumpMap(lat, lng, name, km) {
  const iframe = document.getElementById('r108GmapFrame');
  if (iframe) {
    iframe.src = `https://maps.google.com/maps?q=${lat},${lng}&z=18&t=k&output=embed&hl=zh-TW`;
  }
  const bar  = document.getElementById('r108CoordBar');
  const text = document.getElementById('r108CoordText');
  const link = document.getElementById('r108GmapLink');
  if (bar && text && link) {
    text.innerHTML = `<b>${name}</b>（${km}）&emsp;WGS84：<code style="background:#c8e6c9;padding:2px 7px;border-radius:4px;font-size:12px">${lat.toFixed(5)}°N, &nbsp;${lng.toFixed(5)}°E</code>`;
    link.href = `https://www.google.com/maps/@${lat},${lng},18z?entry=ttu`;
    bar.style.display = 'flex';
    setTimeout(() => bar.scrollIntoView({ behavior:'smooth', block:'nearest' }), 80);
  }
  showToast(`📍 ${name} → ${lat.toFixed(5)}°N, ${lng.toFixed(5)}°E`, 'info');
}
