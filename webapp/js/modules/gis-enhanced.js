/**
 * GIS 增強模組 - 14 座構造物整合、公里數定位、異常熱區分析
 * 整合 107~108 年度橫流溪整治規劃設計監造與監測調查成果
 */

let gisEnhancedMap = null;
let facilityMarkers = [];
let facilityLayerGroups = {};
let facilityLayerVisible = {
  fishway: true,
  checkdam: true,
  gradecontrol: true,
  revetment: true,
  platform: true,
  trail: true,
  facility: true
};
let fishGisLayer = null;
let heatmapLayer = null;
let gisBaseLayers = {};
let gisCurrentBaseLayer = null;
let sortMode = 'km_asc';  // 公里數升序（下游→上游）
let anomalyFilterLevel = 'all';  // 異常篩選：all, normal, low, medium, high
let gisFishLayerVisible = true;

/* ══════════════════════════════════════════════════════════════
   渲染增強 GIS 地圖（14 座構造物整合）
   ══════════════════════════════════════════════════════════════ */
function renderGISEnhanced() {
  document.getElementById('contentArea').innerHTML = `
    <!-- GIS 圖台標題 + 控制列 -->
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;flex-wrap:wrap;gap:8px">
      <h2 style="margin:0;font-size:18px;font-weight:700;color:var(--text)">GIS 地圖 - 14 座構造物整合</h2>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <select id="gisBaseMapSelect" onchange="changeGisBaseMap(this.value)" style="padding:6px 12px;border:1px solid #ddd;border-radius:6px;font-size:12px">
          <option value="hybrid">🛰️ 衛星+地名</option>
          <option value="satellite">🛰️ 衛星影像</option>
          <option value="road">🗺️ 道路圖</option>
          <option value="terrain">⛰️ 地形圖</option>
        </select>
        ${renderFacilityLayerControls()}
        <button class="btn btn-sm btn-outline" onclick="showFacilityComparisonTable()" style="font-size:12px">
          <i class="fas fa-table"></i> 構造物比對表
        </button>
        <label style="display:flex;align-items:center;gap:6px;padding:6px 10px;border:1px solid #ddd;border-radius:6px;background:#fff;font-size:12px">
          <input type="checkbox" id="gisFishLayerToggle" checked onchange="toggleFishGisLayer(this.checked)" style="accent-color:#0e7490">
          <span><i class="fas fa-fish"></i> 魚類分布</span>
        </label>
      </div>
    </div>

    <!-- 地圖容器 -->
    <div id="gisMapContainer" style="width:100%;height:700px;border-radius:8px;border:1px solid #e8ecf0;background:#f9fafb;margin-bottom:16px;position:relative;overflow:hidden">
      <div id="gisLeafletMap" style="width:100%;height:100%;border-radius:8px"></div>
      ${renderGisMapLegendPanel()}
    </div>

    <!-- 統計資訊欄 -->
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:12px;margin-bottom:16px">
      <div style="background:#e8f5e9;padding:12px;border-radius:8px;border-left:4px solid #2e7d32">
        <div style="font-size:11px;color:#558b2f;font-weight:700">正常設施</div>
        <div style="font-size:20px;font-weight:700;color:#2e7d32" id="statNormal">-</div>
      </div>
      <div style="background:#fff3e0;padding:12px;border-radius:8px;border-left:4px solid #f57c00">
        <div style="font-size:11px;color:#e65100;font-weight:700">低異常</div>
        <div style="font-size:20px;font-weight:700;color:#f57c00" id="statLow">-</div>
      </div>
      <div style="background:#ffe0b2;padding:12px;border-radius:8px;border-left:4px solid #ff6f00">
        <div style="font-size:11px;color:#e65100;font-weight:700">中異常</div>
        <div style="font-size:20px;font-weight:700;color:#ff6f00" id="statMedium">-</div>
      </div>
      <div style="background:#ffebee;padding:12px;border-radius:8px;border-left:4px solid #d32f2f">
        <div style="font-size:11px;color:#c62828;font-weight:700">高異常</div>
        <div style="font-size:20px;font-weight:700;color:#d32f2f" id="statHigh">-</div>
      </div>
    </div>

    <div id="gisMaintenanceLinkageTable"></div>

  `;

  setTimeout(() => {
    initGISEnhancedMap();
    updateStatistics();
  }, 100);
}

function facilityLayerDefinitions() {
  return [
    { key: 'fishway', label: '魚道', icon: 'fa-fish', color: '#1565c0' },
    { key: 'checkdam', label: '防砂壩', icon: 'fa-water', color: '#795548' },
    { key: 'gradecontrol', label: '固床工', icon: 'fa-layer-group', color: '#827717' },
    { key: 'revetment', label: '護岸', icon: 'fa-border-all', color: '#546e7a' },
    { key: 'platform', label: '平台', icon: 'fa-vector-square', color: '#7c3aed' },
    { key: 'trail', label: '步道', icon: 'fa-route', color: '#0f766e' }
  ];
}

function renderFacilityLayerControls() {
  return `
    <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;padding:4px 8px;border:1px solid #ddd;border-radius:6px;background:#fff">
      <span style="font-size:12px;font-weight:700;color:#334155;margin-right:2px">構造物類別</span>
      ${facilityLayerDefinitions().map(item => `
        <label style="display:flex;align-items:center;gap:4px;font-size:12px;color:#334155;white-space:nowrap">
          <input type="checkbox" checked onchange="toggleFacilityGisLayer('${item.key}', this.checked)" style="accent-color:${item.color}">
          <span style="display:inline-flex;align-items:center;gap:3px">
            <i class="fas ${item.icon}" style="color:${item.color}"></i>${item.label}
          </span>
        </label>
      `).join('')}
    </div>
  `;
}

function renderGisMapLegendPanel() {
  const itemStyle = 'display:flex;align-items:center;gap:8px;font-size:12px;color:#334155;line-height:1.25';
  const iconStyle = color => `width:26px;height:26px;border-radius:8px;background:${color};display:flex;align-items:center;justify-content:center;color:#fff;flex:0 0 auto`;
  return `
    <div class="gis-map-legend-panel">
      <div style="font-size:13px;font-weight:800;color:#0f172a;margin-bottom:10px">圖例</div>
      <div style="display:grid;gap:8px">
        <div style="${itemStyle}"><span style="${iconStyle('#1565c0')}"><i class="fas fa-fish"></i></span><span>魚道設施</span></div>
        <div style="${itemStyle}"><span style="${iconStyle('#795548')}"><i class="fas fa-water"></i></span><span>防砂構造物</span></div>
        <div style="${itemStyle}"><span style="${iconStyle('#827717')}"><i class="fas fa-layer-group"></i></span><span>固床工</span></div>
        <div style="${itemStyle}"><span style="${iconStyle('#546e7a')}"><i class="fas fa-border-all"></i></span><span>護岸</span></div>
        <div style="${itemStyle}"><span style="${iconStyle('#7c3aed')}"><i class="fas fa-vector-square"></i></span><span>平台</span></div>
        <div style="${itemStyle}"><span style="${iconStyle('#0f766e')}"><i class="fas fa-route"></i></span><span>步道</span></div>
        <div style="${itemStyle}"><span style="${iconStyle('#0e7490')}"><i class="fas fa-fish"></i></span><span>魚類分布</span></div>
      </div>
      <div style="height:1px;background:#e2e8f0;margin:10px 0"></div>
      <div style="font-size:11px;color:#64748b;line-height:1.6">
        <div><b>異常：</b><span style="color:#16a34a">正常</span> / <span style="color:#ca8a04">低</span> / <span style="color:#ea580c">中</span> / <span style="color:#dc2626">高</span></div>
        <div style="margin-top:4px"><b>魚類型態（均為魚類）：</b></div>
        <div style="display:grid;grid-template-columns:auto 1fr;gap:2px 6px;margin-top:3px">
          <span style="color:#2563eb">▬</span><span>鯉科游泳型（白甲魚、石魚賓等）</span>
          <span style="color:#0f766e">▬</span><span>小型游泳型（鬚鱲、馬口鱲）</span>
          <span style="color:#a16207">▬</span><span>底棲鰕虎型（明潭吻鰕虎）</span>
          <span style="color:#7c3aed">▬</span><span>吸附岩鰍型（纓口臺鰍、臺灣間爬岩鰍）</span>
          <span style="color:#334155">▬</span><span>鬍鬚夜行型（短臀瘋鱨）</span>
        </div>
      </div>
    </div>
  `;
}

function initGisBaseLayers() {
  if (!gisEnhancedMap || typeof L === 'undefined') return;

  const roadLayer = () => L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors',
    maxZoom: 18,
    maxNativeZoom: 19
  });

  const satelliteLayer = () => L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    attribution: 'Tiles © Esri',
    maxZoom: 18,
    maxNativeZoom: 18
  });

  const labelLayer = () => L.tileLayer('https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png', {
    attribution: '© CARTO',
    subdomains: 'abcd',
    maxZoom: 18,
    opacity: 0.9
  });

  gisBaseLayers = {
    road: roadLayer(),
    satellite: satelliteLayer(),
    hybrid: L.layerGroup([satelliteLayer(), labelLayer()]),
    terrain: L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenTopoMap contributors',
      maxZoom: 18,
      maxNativeZoom: 17
    })
  };
}

function changeGisBaseMap(type) {
  if (!gisEnhancedMap || !gisBaseLayers[type]) return;

  if (gisCurrentBaseLayer) {
    gisEnhancedMap.removeLayer(gisCurrentBaseLayer);
  }

  gisCurrentBaseLayer = gisBaseLayers[type];
  gisCurrentBaseLayer.addTo(gisEnhancedMap);

  const select = document.getElementById('gisBaseMapSelect');
  if (select && select.value !== type) select.value = type;
}

function updateGisMarkerZoomScale() {
  if (!gisEnhancedMap) return;
  const zoom = gisEnhancedMap.getZoom();
  const scale = Math.max(0.82, Math.min(1.24, 0.82 + ((zoom - 13) * 0.07)));
  const labelScale = Math.max(0.82, Math.min(1.18, 0.82 + ((zoom - 13) * 0.06)));
  const mapEl = document.getElementById('gisLeafletMap');
  if (!mapEl) return;
  mapEl.style.setProperty('--gis-marker-scale', scale.toFixed(2));
  mapEl.style.setProperty('--gis-label-scale', labelScale.toFixed(2));
  mapEl.classList.toggle('gis-labels-compact', zoom < 16);
  mapEl.classList.toggle('gis-labels-expanded', zoom >= 16);
}

function facilityEngineeringProfile(f) {
  const text = `${f.name || ''} ${f.type || ''} ${f.subType || ''}`;

  if (/魚道|之字形|階段式|階梯式魚道|降壩|潛越|斜坡式|舟通|粗石/.test(text)) {
    return { key: 'fishway', label: '魚道', color: '#1565c0' };
  }
  if (/防砂|壩|壩堰|溪構8-1|溪構5-1/.test(text)) {
    return { key: 'checkdam', label: '防砂壩', color: '#795548' };
  }
  if (/固床|階梯式固床|隔梳/.test(text)) {
    return { key: 'gradecontrol', label: '固床工', color: '#827717' };
  }
  if (/護岸|岸|坡腳|塊石|混凝土護岸/.test(text)) {
    return { key: 'revetment', label: '護岸', color: '#546e7a' };
  }
  if (/平臺|平台/.test(text)) {
    return { key: 'platform', label: '平台', color: '#7c3aed' };
  }
  if (/步道|便道|PC路面|碎石路面/.test(text)) {
    return { key: 'trail', label: '步道', color: '#0f766e' };
  }
  return { key: 'facility', label: f.type || '設施', color: '#455a64' };
}

function facilityEngineeringSvg(key) {
  const common = 'fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"';
  const icons = {
    fishway: `<svg viewBox="0 0 48 48" aria-hidden="true"><path ${common} d="M7 25c7-9 17-11 29-4l6-5v17l-6-5c-12 7-22 5-29-3Z"/><path ${common} d="M16 20c3 3 3 7 0 10"/><circle cx="32" cy="23" r="1.8" fill="currentColor"/></svg>`,
    checkdam: `<svg viewBox="0 0 48 48" aria-hidden="true"><path ${common} d="M7 33h34"/><path ${common} d="M11 33V18l8 15V16l8 17V14l10 19"/><path ${common} d="M8 38c5-3 9 3 14 0s9 3 18 0"/></svg>`,
    gradecontrol: `<svg viewBox="0 0 48 48" aria-hidden="true"><path ${common} d="M8 16h12v7h10v7h10"/><path ${common} d="M8 31h12v-7h10v-7h10"/><path ${common} d="M10 38h28"/></svg>`,
    revetment: `<svg viewBox="0 0 48 48" aria-hidden="true"><path ${common} d="M10 34h28"/><path ${common} d="M12 28h24"/><path ${common} d="M14 22h20"/><path ${common} d="M17 16h14"/><path ${common} d="M16 28v6M24 22v6M32 28v6M21 16v6M29 16v6"/></svg>`,
    platform: `<svg viewBox="0 0 48 48" aria-hidden="true"><path ${common} d="M10 16h28v16H10z"/><path ${common} d="M15 32v8M33 32v8M10 22h28M17 16v16M24 16v16M31 16v16"/></svg>`,
    trail: `<svg viewBox="0 0 48 48" aria-hidden="true"><path ${common} d="M8 35c9-14 22-1 32-19"/><path ${common} d="M12 38h8M28 27h8M17 28h6"/></svg>`,
    facility: `<svg viewBox="0 0 48 48" aria-hidden="true"><path ${common} d="M14 36V18l10-6 10 6v18"/><path ${common} d="M10 36h28M20 36V25h8v11"/></svg>`
  };
  return icons[key] || icons.facility;
}

function facilityMarkerZIndex(key) {
  const order = {
    fishway: 9400,
    revetment: 8800,
    trail: 8400,
    platform: 7200,
    checkdam: 6200,
    gradecontrol: 6000,
    facility: 5000
  };
  return order[key] || order.facility;
}

function facilityMarkerZIndexFor(f, key) {
  return facilityMarkerZIndex(key) + ((Number(f.id) || 0) * 25);
}

function facilitySymbolOffset(f, idx) {
  const code = String(f.code || '');
  const id = Number(f.id);
  const explicit = {
    9: { x: -58, y: -24 },
    10: { x: 58, y: -18 },
    11: { x: -54, y: 34 },
    12: { x: 54, y: 34 },
    13: { x: -58, y: -52 },
    14: { x: 62, y: -52 },
    15: { x: 0, y: 0 },
    16: { x: 0, y: 0 },
    17: { x: 0, y: 0 },
    18: { x: 0, y: 0 }
  };
  if (explicit[id]) return explicit[id];
  if (code.includes('1-2')) return { x: 62, y: -52 };
  if (code === '2') return { x: 54, y: 34 };

  const offsets = [
    { x: 0, y: 0 },
    { x: 44, y: -34 },
    { x: -44, y: -34 },
    { x: 44, y: 34 },
    { x: -44, y: 34 }
  ];
  return offsets[idx % offsets.length];
}

function platformTooltipPlacement(f) {
  const id = Number(f.id);
  const placement = {
    15: { direction: 'top', offset: [0, -16] },
    16: { direction: 'right', offset: [18, 0] },
    17: { direction: 'bottom', offset: [0, 16] },
    18: { direction: 'bottom', offset: [0, 16] }
  };
  return placement[id] || { direction: 'bottom', offset: [0, 16] };
}

function facilityLabelPlacement(f, idx, symbolOffset = { x: 0, y: 0 }) {
  const text = `${f.name || ''} ${f.stationKm || ''}`;
  const sx = Number(symbolOffset.x) || 0;
  const sy = Number(symbolOffset.y) || 0;

  if (/步道|護岸/.test(text)) {
    return { x: sx, y: sy + 31, side: 'bottom' };
  }
  if (/平臺|平台/.test(text)) {
    return { x: sx, y: sy + 18, side: 'bottom' };
  }
  return { x: sx, y: sy + 30, side: 'bottom' };
}

/* ══════════════════════════════════════════════════════════════
   初始化 Leaflet 地圖（衛星影像 + 構造物標記 + 熱區）
   ══════════════════════════════════════════════════════════════ */
function initGISEnhancedMap() {
  const mapContainer = document.getElementById('gisLeafletMap');
  if (!mapContainer) return;

  // 銷毀舊地圖
  if (gisEnhancedMap) {
    gisEnhancedMap.remove();
    gisEnhancedMap = null;
    gisBaseLayers = {};
    gisCurrentBaseLayer = null;
  }

  // 創建地圖（中心在溪流中游）
  const centerLat = 24.183;
  const centerLng = 120.909;
  gisEnhancedMap = L.map('gisLeafletMap', {
    maxZoom: 18,
    minZoom: 12,
    zoomSnap: 1,
    wheelPxPerZoomLevel: 90,
    touchZoom: true,        // 兩指捏合縮放（iPad）
    scrollWheelZoom: true,
    dragging: true,
    tap: true,
    tapTolerance: 15,
    bounceAtZoomLimits: false
  }).setView([centerLat, centerLng], 13);

  initGisBaseLayers();
  changeGisBaseMap('hybrid');
  L.control.scale({ metric: true, imperial: false, position: 'bottomleft' }).addTo(gisEnhancedMap);
  gisEnhancedMap.on('zoomend', updateGisMarkerZoomScale);
  updateGisMarkerZoomScale();

  // 獲取設施數據並按選定排序方式排列
  let facilities = DB.getAll('facilities');
  facilities = sortFacilitiesByMode(facilities, sortMode);

  // 異常等級色彩方案
  const anomalyColorMap = {
    '正常': '#2e7d32',
    '低': '#fbc02d',
    '中': '#ff6f00',
    '高': '#d32f2f'
  };

  // 清空舊標記
  facilityMarkers = [];
  facilityLayerGroups = {};
  [...facilityLayerDefinitions(), { key: 'facility' }].forEach(item => {
    facilityLayerGroups[item.key] = L.layerGroup();
  });

  // 添加構造物標記
  facilities.forEach((f, idx) => {
    if (!f.lat || !f.lng) return;

    const profile = facilityEngineeringProfile(f);
    const anomalyColor = anomalyColorMap[f.anomaly_level] || '#2e7d32';

    if (profile.key === 'platform') {
      const tooltipPlacement = platformTooltipPlacement(f);
      const marker = L.marker([f.lat, f.lng], {
        icon: L.divIcon({
          html: `
            <div class="gis-platform-map-symbol" title="${gisEscape(f.name)}">
              <i class="fas fa-vector-square"></i>
            </div>`,
          className: 'gis-platform-marker',
          iconSize: [26, 26],
          iconAnchor: [13, 13]
        }),
        pane: 'markerPane',
        facilityLayerKey: profile.key,
        facilityName: f.name,
        zIndexOffset: facilityMarkerZIndexFor(f, profile.key)
      });
      marker.on('click', () => showFacilityDetailModal(f));
      marker.bindTooltip(`${f.name}<br><span style="font-size:10px">${f.stationKm || ''}</span>`, {
        permanent: true,
        direction: tooltipPlacement.direction,
        offset: tooltipPlacement.offset,
        className: 'gis-platform-tooltip'
      });
      marker.on('tooltipopen', event => {
        const tooltipEl = event.tooltip?.getElement();
        if (!tooltipEl) return;
        tooltipEl.setAttribute('role', 'button');
        tooltipEl.setAttribute('tabindex', '0');
        tooltipEl.setAttribute('title', `${f.name} 詳情`);
        tooltipEl.onclick = clickEvent => {
          clickEvent.stopPropagation();
          showFacilityDetailModal(f);
        };
        tooltipEl.onkeydown = keyEvent => {
          if (keyEvent.key === 'Enter' || keyEvent.key === ' ') {
            keyEvent.preventDefault();
            showFacilityDetailModal(f);
          }
        };
      });
      marker.addTo(facilityLayerGroups[profile.key]);
      facilityMarkers.push(marker);
      return;
    }

    const symbolOffset = facilitySymbolOffset(f, idx);
    const placement = facilityLabelPlacement(f, idx, symbolOffset);

    // 自訂標記圖示（工程名稱 + 工程型態 + 異常等級）
    const icon = L.divIcon({
      html: `
        <div class="gis-facility-marker gis-facility-${profile.key} gis-label-${placement.side}"
             style="--marker-color:${profile.color};--status-color:${anomalyColor};--label-x:${placement.x}px;--label-y:${placement.y}px;--symbol-x:${symbolOffset.x}px;--symbol-y:${symbolOffset.y}px">
          <div class="gis-facility-symbol" onclick="event.stopPropagation();showFacilityDetailModalById(${f.id})" title="${gisEscape(f.name)}">
            ${facilityEngineeringSvg(profile.key)}
          </div>
          <div class="gis-facility-label">
            <div class="gis-facility-name">${gisEscape(f.name)}</div>
            <div class="gis-facility-station">${gisEscape(f.stationKm || `K${(f.km_num / 1000).toFixed(3)}`)}</div>
          </div>
        </div>`,
      iconSize: [240, 164],
      iconAnchor: [120, 82],
      popupAnchor: [0, -46],
      className: 'facility-marker'
    });

    const marker = L.marker([f.lat, f.lng], {
      icon,
      facilityLayerKey: profile.key,
      facilityName: f.name,
      zIndexOffset: facilityMarkerZIndexFor(f, profile.key),
      riseOnHover: true,
      riseOffset: 12000
    });

    marker.on('click', () => showFacilityDetailModal(f));

    if (!facilityLayerGroups[profile.key]) {
      facilityLayerGroups[profile.key] = L.layerGroup();
    }
    marker.addTo(facilityLayerGroups[profile.key]);
    facilityMarkers.push(marker);
  });

  Object.keys(facilityLayerGroups).forEach(key => {
    if (facilityLayerVisible[key] !== false) {
      facilityLayerGroups[key].addTo(gisEnhancedMap);
    }
  });

  addFishDistributionToGis();

  // 自動縮放至所有標記
  const allVisibleMarkers = facilityMarkers.filter(marker => facilityLayerVisible[marker.options.facilityLayerKey] !== false);
  if (fishGisLayer && gisFishLayerVisible) {
    fishGisLayer.eachLayer(layer => {
      if (layer instanceof L.Marker) allVisibleMarkers.push(layer);
    });
  }
  if (allVisibleMarkers.length > 0) {
    const group = new L.featureGroup(allVisibleMarkers);
    gisEnhancedMap.fitBounds(group.getBounds().pad(0.08));
  }
  setTimeout(updateGisMarkerZoomScale, 0);
}

/* ══════════════════════════════════════════════════════════════
   魚類分布 GIS 圖層：大概區位 + 型態圖示 + 比較區
   ══════════════════════════════════════════════════════════════ */
function addFishDistributionToGis() {
  if (!gisEnhancedMap || typeof L === 'undefined') return;
  if (fishGisLayer) {
    fishGisLayer.remove();
    fishGisLayer = null;
  }

  fishGisLayer = L.layerGroup();
  const species = typeof fish_groupSpecies === 'function'
    ? Object.values(fish_groupSpecies())
    : groupFishForGisFallback();
  const markers = fishGisMarkers(species);
  const zoneStats = fishGisZoneStats(markers);

  fishGisZones().forEach(zone => {
    const stat = zoneStats[zone.id] || { count: 0, species: [] };
    L.polygon(zone.coords, {
      color: zone.color,
      weight: 2,
      fillColor: zone.color,
      fillOpacity: 0.18,
      dashArray: '6 6'
    }).bindPopup(`
      <div style="min-width:220px;font-size:12px">
        <div style="font-size:14px;font-weight:700;color:${zone.color};margin-bottom:6px">${zone.name}</div>
        <div><b>範圍：</b>${zone.range}</div>
        <div><b>物種：</b>${stat.species.length} 種</div>
        <div><b>累計尾次：</b>${stat.count} 尾</div>
        <div style="margin-top:6px;color:#475569">${zone.note}</div>
      </div>
    `).addTo(fishGisLayer);
  });

  markers.forEach(marker => {
    const icon = L.divIcon({
      html: `
        <div class="gis-fish-marker gis-fish-${marker.shape}" style="width:${marker.size}px;height:${marker.size}px">
          ${typeof fish_speciesSvg === 'function' ? fish_speciesSvg(marker.shape) : fishGisSvg(marker.shape)}
          <span>${gisEscape(marker.species)}</span>
        </div>
      `,
      className: 'gis-fish-marker-wrap',
      iconSize: [marker.size, marker.size],
      iconAnchor: [marker.size / 2, marker.size / 2],
      popupAnchor: [0, -marker.size / 2]
    });
    const fishMarker = L.marker(marker.latlng, { icon })
      .bindPopup(createFishGisPopup(marker))
      .addTo(fishGisLayer);

    fishMarker.on('mouseover', () => setFishLabelFocus(true));
    fishMarker.on('mouseout', () => setFishLabelFocus(false));
    fishMarker.on('popupopen', () => setFishLabelFocus(true));
    fishMarker.on('popupclose', () => setFishLabelFocus(false));
  });

  if (gisFishLayerVisible) {
    fishGisLayer.addTo(gisEnhancedMap);
  }
  injectFishGisStyles();
}

function toggleFishGisLayer(visible) {
  gisFishLayerVisible = visible;
  if (!fishGisLayer || !gisEnhancedMap) return;
  if (visible) fishGisLayer.addTo(gisEnhancedMap);
  else {
    setFishLabelFocus(false);
    fishGisLayer.remove();
  }
}

function toggleFacilityGisLayer(key, visible) {
  facilityLayerVisible[key] = visible;
  const layer = facilityLayerGroups[key];
  if (!gisEnhancedMap || !layer) return;

  if (visible) {
    layer.addTo(gisEnhancedMap);
  } else {
    gisEnhancedMap.removeLayer(layer);
  }
}

function setFishLabelFocus(active) {
  const mapEl = document.getElementById('gisLeafletMap');
  if (!mapEl) return;
  mapEl.classList.toggle('gis-fish-hovering', active);
}

function fishGisZones() {
  return [
    {
      id: 'lower',
      name: '下游魚類比較區',
      range: '0K+460～0K+740',
      color: '#0ea5e9',
      note: '之字形魚道、降壩魚道、防砂設施與下游緩流棲地周邊。',
      coords: [[24.17955,120.90805],[24.17986,120.90925],[24.18190,120.90938],[24.18206,120.90818]]
    },
    {
      id: 'middle',
      name: '中游魚類比較區',
      range: '0K+740～1K+170',
      color: '#10b981',
      note: '階段式魚道、潛越式魚道與中游急流淺瀨交錯區。',
      coords: [[24.18165,120.90872],[24.18242,120.91012],[24.18510,120.91042],[24.18458,120.90892]]
    },
    {
      id: 'upper',
      name: '上游魚類比較區',
      range: '1K+170～1K+400',
      color: '#f97316',
      note: '斜坡式、階梯式、粗石斜曲面與改良型舟通式魚道群。',
      coords: [[24.18466,120.90905],[24.18520,120.91070],[24.18695,120.91008],[24.18706,120.90882]]
    }
  ];
}

function fishGisMarkers(species) {
  const base = {
    lower: [24.18030, 120.90855],
    middle: [24.18355, 120.90958],
    upper: [24.18595, 120.90965]
  };
  const offsets = [
    [0.00000, 0.00000], [0.00022, 0.00018], [-0.00020, 0.00025],
    [0.00034, -0.00015], [-0.00032, -0.00022], [0.00014, -0.00036],
    [-0.00016, 0.00044], [0.00048, 0.00008], [-0.00045, 0.00004]
  ];
  return species.map((item, index) => {
    const zone = typeof fish_speciesZone === 'function' ? fish_speciesZone(item) : fishGisZoneFor(item);
    const shape = typeof fish_speciesShape === 'function' ? fish_speciesShape(item) : fishGisShapeFor(item);
    const off = offsets[index % offsets.length];
    return {
      ...item,
      zone,
      shape,
      latlng: [base[zone][0] + off[0], base[zone][1] + off[1]],
      size: Math.max(44, Math.min(74, 42 + Math.sqrt(Number(item.totalCount) || 1) * 4))
    };
  });
}

function fishGisZoneStats(markers) {
  const stats = {
    lower: { count: 0, species: [] },
    middle: { count: 0, species: [] },
    upper: { count: 0, species: [] }
  };
  markers.forEach(marker => {
    stats[marker.zone].count += Number(marker.totalCount) || 0;
    stats[marker.zone].species.push(marker);
  });
  return stats;
}

function createFishGisPopup(marker) {
  const zoneName = { lower: '下游比較區', middle: '中游比較區', upper: '上游比較區' }[marker.zone] || '比較區';
  const photo = typeof fish_photoFor === 'function' ? fish_photoFor(marker) : null;
  const shapeLabel = {
    carp: '鯉科游泳型',
    minnow: '小型游泳型',
    goby: '底棲鰕虎型',
    loach: '吸附岩鰍型',
    catfish: '鬍鬚夜行型'
  }[marker.shape] || '魚類型態';
  return `
    <div style="min-width:260px;font-size:12px">
      ${photo ? `<img src="${photo.image}" onerror="this.onerror=null;this.src='/webapp/assets/fish-photos/field-measurement.jpg'" style="width:100%;height:120px;object-fit:cover;border-radius:6px;margin-bottom:8px" alt="${gisEscape(marker.species)}">` : ''}
      <div style="font-size:15px;font-weight:700;color:#0f172a;margin-bottom:2px">${gisEscape(marker.species)}</div>
      <div style="font-style:italic;color:#64748b;margin-bottom:8px">${gisEscape(marker.scientificName || '')}</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:5px;margin-bottom:8px">
        <div><b>型態：</b>${shapeLabel}</div>
        <div><b>保育：</b>${gisEscape(marker.conservation || '-')}</div>
        <div><b>累計：</b>${Number(marker.totalCount) || 0} 尾次</div>
        <div><b>記錄：</b>${marker.surveys || 0} 筆</div>
      </div>
      <div style="background:#f0fdfa;border-left:3px solid #0e7490;padding:7px 8px;border-radius:0 5px 5px 0;margin-bottom:8px">
        <b>GIS比較區：</b>${zoneName}<br>
        <b>調查位置：</b>${gisEscape(marker.location || '-')}
      </div>
      <div style="font-size:11px;color:#475569;line-height:1.55">${gisEscape(marker.note || '')}</div>
    </div>
  `;
}

function groupFishForGisFallback() {
  const fish = DB.getAll('fish');
  const groups = {};
  fish.forEach(item => {
    if (!groups[item.species]) groups[item.species] = { ...item, totalCount: 0, surveys: 0, records: [] };
    groups[item.species].totalCount += Number(item.count) || 0;
    groups[item.species].surveys += 1;
    groups[item.species].records.push(item);
  });
  return Object.values(groups);
}

function fishGisZoneFor(item) {
  const text = [item.location, item.note].join(' ');
  if (text.includes('上游') || text.includes('1K+170') || text.includes('1K+225') || text.includes('1K+315') || text.includes('1K+400')) return 'upper';
  if (text.includes('下游') || text.includes('0K+460')) return 'lower';
  return 'middle';
}

function fishGisShapeFor(item) {
  const name = item.species || '';
  if (name.includes('岩鰍')) return 'loach';
  if (name.includes('鮠') || name.includes('鱨')) return 'catfish';
  if (name.includes('鰕虎')) return 'goby';
  if (name.includes('馬口') || name.includes('鱲')) return 'minnow';
  return 'carp';
}

function fishGisSvg(shape) {
  return typeof fish_speciesSvg === 'function'
    ? fish_speciesSvg(shape)
    : '<svg viewBox="0 0 96 58"><ellipse cx="48" cy="29" rx="35" ry="14" fill="#0e7490"/><polygon points="78,29 94,14 92,44" fill="#0e7490"/></svg>';
}

function gisEscape(value) {
  return String(value ?? '').replace(/[&<>"']/g, ch => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[ch]));
}

function injectFishGisStyles() {
  if (document.getElementById('fishGisStyle')) return;
  const style = document.createElement('style');
  style.id = 'fishGisStyle';
  style.textContent = `
    #gisMapContainer,#gisLeafletMap,.leaflet-container{overflow:hidden!important}
    .gis-map-legend-panel{position:absolute;right:12px;top:12px;z-index:720;background:rgba(255,255,255,.94);border:1px solid rgba(148,163,184,.45);border-radius:8px;padding:12px;box-shadow:0 10px 28px rgba(15,23,42,.16);width:178px;max-height:calc(100% - 24px);overflow:auto;backdrop-filter:blur(6px);pointer-events:auto}
    .gis-platform-marker{background:transparent;border:none;overflow:visible!important}
    .gis-platform-map-symbol{width:26px;height:26px;border-radius:8px;background:#7c3aed;color:#fff;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(15,23,42,.28);font-size:13px;line-height:1;cursor:pointer}
    .gis-platform-tooltip{background:rgba(15,23,42,.82);border:none;border-radius:999px;color:#fff;font-size:8px;font-weight:800;line-height:1.15;padding:2px 5px;box-shadow:0 2px 8px rgba(15,23,42,.16);cursor:pointer;pointer-events:auto}
    .gis-platform-tooltip::before{display:none}
    .facility-marker{background:transparent;border:none;overflow:visible!important;pointer-events:none!important}
    #gisLeafletMap{--gis-marker-scale:1;--gis-label-scale:1}
    .gis-facility-marker{position:relative;width:240px;height:164px;pointer-events:none;filter:drop-shadow(0 4px 5px rgba(15,23,42,.35));transform:scale(var(--gis-marker-scale));transform-origin:center center;transition:transform .16s ease}
    .gis-facility-symbol{position:absolute;left:50%;top:50%;transform:translate(calc(-50% + var(--symbol-x,0px)),calc(-50% + var(--symbol-y,0px)));width:42px;height:42px;border-radius:13px;background:var(--marker-color);border:3px solid var(--status-color);color:#fff;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(15,23,42,.28);z-index:2;pointer-events:auto;cursor:pointer}
    .gis-facility-symbol svg{width:28px;height:28px}
    .gis-facility-platform .gis-facility-symbol{width:10px;height:10px;border-radius:999px;border-width:2px;box-sizing:border-box}
    .gis-facility-platform .gis-facility-symbol svg{display:none}
    .gis-facility-marker::before{content:"";position:absolute;left:50%;top:50%;width:16px;height:2px;background:rgba(15,23,42,.22);transform-origin:left center;z-index:1}
    .gis-label-right::before{transform:translate(22px,-1px)}
    .gis-label-left::before{transform:rotate(180deg) translate(-22px,1px)}
    .gis-label-top::before{transform:rotate(-90deg) translate(22px,-1px)}
    .gis-label-bottom::before{transform:rotate(90deg) translate(22px,-1px)}
    .gis-facility-label{position:absolute;left:50%;top:50%;transform:translate(calc(-50% + var(--label-x)), calc(-50% + var(--label-y)));display:flex;flex-direction:column;align-items:center;gap:2px;z-index:3;pointer-events:none}
    .gis-label-left .gis-facility-label{align-items:flex-end}
    .gis-label-right .gis-facility-label{align-items:flex-start}
    .gis-facility-name{max-width:106px;padding:2px 5px;border-radius:999px;background:rgba(15,23,42,.82);color:#fff;font-size:calc(8.5px * var(--gis-label-scale));font-weight:800;line-height:1.15;text-align:center;white-space:normal;word-break:keep-all;text-wrap:balance;box-shadow:0 2px 8px rgba(15,23,42,.16)}
    .gis-facility-station{padding:1px 5px;border-radius:999px;background:rgba(255,255,255,.92);border:1px solid rgba(148,163,184,.62);color:#334155;font-size:calc(8px * var(--gis-label-scale));font-weight:800;line-height:1.15;box-shadow:0 1px 5px rgba(15,23,42,.1)}
    .gis-labels-compact .gis-facility-marker::before{opacity:.28}
    .gis-labels-compact .gis-facility-label{opacity:.72;transform:translate(calc(-50% + var(--label-x)), calc(-50% + var(--label-y))) scale(.9);pointer-events:none;transition:opacity .14s ease,transform .14s ease}
    .gis-labels-compact .gis-facility-marker:hover .gis-facility-label,
    .gis-labels-compact .facility-marker:focus-within .gis-facility-label{opacity:1;transform:translate(calc(-50% + var(--label-x)), calc(-50% + var(--label-y))) scale(1.04);pointer-events:none}
    .gis-labels-compact .gis-facility-marker:hover::before,
    .gis-labels-compact .facility-marker:focus-within .gis-facility-marker::before{opacity:1}
    .gis-fish-marker-wrap{background:transparent;border:none}
    .gis-fish-marker{position:relative;filter:drop-shadow(0 4px 5px rgba(15,23,42,.35));transform:scale(var(--gis-marker-scale));transform-origin:center center;transition:transform .16s ease}
    .gis-fish-marker svg{width:100%;height:72%;display:block}
    .gis-fish-marker span{position:absolute;left:50%;top:70%;transform:translateX(-50%);white-space:nowrap;background:rgba(15,23,42,.78);color:#fff;border-radius:999px;padding:1px 5px;font-size:calc(8.5px * var(--gis-label-scale));font-weight:700;opacity:.76;transition:opacity .14s ease,transform .14s ease}
    .gis-fish-marker:hover span{opacity:1}
    .leaflet-marker-pane:has(.gis-fish-marker:hover) .gis-facility-label,
    .leaflet-marker-pane:has(.gis-fish-marker:hover) .gis-facility-marker::before{opacity:0!important;pointer-events:none}
    .gis-fish-hovering .gis-facility-label,
    .gis-fish-hovering .gis-facility-marker::before{opacity:0!important;pointer-events:none}
    .gis-fish-carp svg,.gis-fish-minnow svg{transform:rotate(-7deg)}
    .gis-fish-goby svg,.gis-fish-loach svg{transform:rotate(4deg)}
  `;
  document.head.appendChild(style);
}

/* ══════════════════════════════════════════════════════════════
   構造物詳細彈窗內容
   ══════════════════════════════════════════════════════════════ */
function createFacilityPopup(f) {
  const hp = fac_health(f);
  const profile = facilityEngineeringProfile(f);
  const hasTwd97 = f.twd97x !== null && f.twd97x !== undefined && f.twd97x !== ''
    && f.twd97y !== null && f.twd97y !== undefined && f.twd97y !== '';
  const twd97Text = (hasTwd97 && Number.isFinite(Number(f.twd97x)) && Number.isFinite(Number(f.twd97y)))
    ? `X${Number(f.twd97x).toLocaleString()}, Y${Number(f.twd97y).toLocaleString()}`
    : '未建置';
  const yearText = f.year || f.setupYear || '未建置';
  const stationText = f.stationKm || (Number.isFinite(Number(f.km_num)) ? `K${(Number(f.km_num)/1000).toFixed(3)}` : '未建置');
  const judgementText = f.judgement_basis || f.note || '尚無補充說明';
  const statusColor = {
    '正常': '#2e7d32', '需維護': '#f57c00', '損壞': '#d32f2f'
  }[f.status] || '#555';

  const anomalyText = f.anomaly_type ? `<div style="margin:4px 0;font-size:11px">
    <strong>異常類型:</strong> ${f.anomaly_type.replace(/\|/g, ', ')}
  </div>` : '';

  return `
    <div style="min-width:280px;font-size:12px">
      <!-- 標題 -->
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;color:#1a1a1a;border-bottom:2px solid ${profile.color};padding-bottom:6px">
        <span style="width:30px;height:30px;border-radius:9px;background:${profile.color};color:#fff;display:inline-flex;align-items:center;justify-content:center">
          ${facilityEngineeringSvg(profile.key)}
        </span>
        <span style="font-weight:700;font-size:14px;line-height:1.35">
          ${f.name} <span style="font-size:10px;color:#666">(${f.code})</span>
        </span>
      </div>

      <!-- 基本資訊 -->
      <div style="background:#f9fafb;padding:8px;border-radius:6px;margin-bottom:8px">
        <div style="display:flex;justify-content:space-between;margin-bottom:4px">
          <span><strong>位置:</strong> ${stationText}</span>
          <span><strong>年度:</strong> ${yearText}</span>
        </div>
        <div style="margin-bottom:4px"><strong>工程分類:</strong> ${profile.label} / ${f.subType || f.type}</div>
        <div><strong>狀況:</strong> <span style="background:${statusColor};color:#fff;padding:2px 8px;border-radius:4px;font-size:10px;font-weight:700">${f.status}</span></div>
      </div>

      <!-- 座標資訊 -->
      <div style="background:#fff3e0;padding:8px;border-radius:6px;margin-bottom:8px;font-size:10px;font-family:monospace">
        <div><strong>TWD97:</strong> ${twd97Text}</div>
        <div><strong>WGS84:</strong> ${f.lat.toFixed(5)}°N, ${f.lng.toFixed(5)}°E</div>
      </div>

      <!-- 健康度 + 異常 -->
      <div style="margin-bottom:8px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
          <strong>健康指數:</strong>
          <span style="background:#f1f5f9;padding:4px 12px;border-radius:6px;font-weight:700;color:#1565c0">${hp}%</span>
        </div>
        <div style="height:6px;background:#e9ecef;border-radius:3px;overflow:hidden">
          <div style="height:100%;width:${hp}%;background:${statusColor};border-radius:3px;transition:width 0.3s"></div>
        </div>
      </div>

      ${anomalyText}

      <!-- 判斷依據 -->
      <div style="background:#f0f7ff;padding:8px;border-radius:6px;margin-bottom:8px;font-size:11px;border-left:3px solid #1565c0">
        <strong>判斷依據:</strong>
        <div style="margin-top:4px;color:#555">${judgementText}</div>
      </div>

      <!-- 按鈕 -->
      <div style="display:flex;gap:6px">
        <button class="btn btn-sm btn-primary" onclick="openFacilityRecordDetail(${f.id})" style="flex:1;font-size:11px">
          <i class="fas fa-eye"></i> 詳情
        </button>
        <button class="btn btn-sm btn-outline" onclick="openFacilityRecordEdit(${f.id})" style="flex:1;font-size:11px">
          <i class="fas fa-edit"></i> 編輯
        </button>
      </div>
    </div>
  `;
}

function closeFacilityDetailModal() {
  const modal = document.getElementById('facilityDetailModal');
  if (modal) modal.remove();
}

function showFacilityDetailModalById(id) {
  const facility = DB.getAll('facilities').find(item => Number(item.id) === Number(id));
  if (facility) showFacilityDetailModal(facility);
}

function openFacilityRecordDetail(id) {
  closeFacilityDetailModal();
  if (typeof viewFacility === 'function') {
    viewFacility(id);
    elevateSharedModalToTop();
  }
}

function openFacilityRecordEdit(id) {
  closeFacilityDetailModal();
  if (typeof openFacilityForm === 'function') {
    openFacilityForm(id);
    elevateSharedModalToTop();
  }
}

function elevateSharedModalToTop() {
  const overlay = document.getElementById('modalOverlay');
  if (!overlay) return;

  overlay.style.position = 'fixed';
  overlay.style.inset = '0';
  overlay.style.zIndex = '14000';
  overlay.style.display = 'flex';
  overlay.style.alignItems = 'center';
  overlay.style.justifyContent = 'center';

  const modal = overlay.querySelector('.modal');
  if (modal) {
    modal.style.position = 'relative';
    modal.style.zIndex = '14001';
    modal.style.maxHeight = '90vh';
  }
}

function showFacilityDetailModal(f) {
  closeFacilityDetailModal();
  closeComparisonModal();
  const profile = facilityEngineeringProfile(f);
  const html = `
    <div class="modal-overlay" id="facilityDetailModal" onclick="if(event.target===this) closeFacilityDetailModal()" style="display:flex!important;position:fixed;inset:0;z-index:13000;background:rgba(15,23,42,.55);align-items:center;justify-content:center;padding:18px">
      <div class="modal" onclick="event.stopPropagation()" style="max-width:760px;max-height:88vh;overflow-y:auto;width:92%;position:relative;z-index:13001;background:#fff;border-radius:10px;box-shadow:0 24px 60px rgba(15,23,42,.35)">
        <div class="modal-header" style="position:sticky;top:0;background:#fff;z-index:2;border-bottom:1px solid #e8ecf0">
          <h3 id="facilityDetailTitle" style="display:flex;align-items:center;gap:8px">
            <span style="width:28px;height:28px;border-radius:8px;background:${profile.color};color:#fff;display:inline-flex;align-items:center;justify-content:center">${facilityEngineeringSvg(profile.key)}</span>
            ${gisEscape(f.name)}
          </h3>
          <button class="modal-close" onclick="closeFacilityDetailModal()" aria-label="關閉構造物詳情"><i class="fas fa-times"></i></button>
        </div>
        <div class="modal-body" style="padding:20px">
          ${createFacilityPopup(f)}
        </div>
        <div class="modal-footer" style="padding:12px 20px;border-top:1px solid #e8ecf0">
          <button class="btn btn-primary" onclick="closeFacilityDetailModal()">關閉</button>
        </div>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML('beforeend', html);
}

/* ══════════════════════════════════════════════════════════════
   公里數排序
   ══════════════════════════════════════════════════════════════ */
function sortFacilitiesByMode(facilities, mode) {
  const sorted = [...facilities];
  switch(mode) {
    case 'km_asc':
      return sorted.sort((a, b) => a.km_num - b.km_num);  // 升序：0→1.4km
    case 'km_desc':
      return sorted.sort((a, b) => b.km_num - a.km_num);  // 降序：1.4→0km
    case 'status':
      return sorted.sort((a, b) => {
        const orderMap = { '損壞': 0, '需維護': 1, '正常': 2 };
        return orderMap[a.status] - orderMap[b.status];
      });
    case 'risk':
      return sorted.sort((a, b) => (b.riskScore || 0) - (a.riskScore || 0));
    default:
      return sorted;
  }
}

function changeSortMode(mode) {
  sortMode = mode;
  initGISEnhancedMap();
  updateStatistics();
}

function filterAnomalyLevel(level) {
  anomalyFilterLevel = level;
  initGISEnhancedMap();
  updateStatistics();
}

function gisNormalizeLevel(level) {
  const text = String(level || '');
  if (/高|擃|緊急|損壞/.test(text)) return '高';
  if (/中|銝|需維護|處理中/.test(text)) return '中';
  if (/低|雿/.test(text)) return '低';
  return '正常';
}

function gisNormalizeStatus(status) {
  const text = String(status || '');
  if (/完成|摰/.test(text)) return '完成';
  if (/處理中|進行|銝/.test(text)) return '處理中';
  if (/待處理|敺|未處理/.test(text)) return '待處理';
  return status || '待處理';
}

function gisNormalizePriority(priority, level) {
  const text = String(priority || level || '');
  if (/緊急|蝺|高|擃/.test(text)) return /緊急|蝺/.test(text) ? '緊急' : '高';
  if (/中|銝/.test(text)) return '中';
  return '低';
}

function gisAddDays(dateText, days) {
  const base = dateText ? new Date(dateText) : new Date();
  if (Number.isNaN(base.getTime())) return '-';
  base.setDate(base.getDate() + days);
  return base.toISOString().slice(0, 10);
}

function gisExpectedCompletion(record) {
  if (record.completedAt || record.completionDate || record.maintenanceCompletedAt) {
    return record.completedAt || record.completionDate || record.maintenanceCompletedAt;
  }
  const status = gisNormalizeStatus(record.status);
  if (status === '完成') return record.date || '-';
  const priority = gisNormalizePriority(record.priority, record.anomalyLevel);
  const days = priority === '緊急' ? 7 : priority === '高' ? 14 : priority === '中' ? 30 : 90;
  return `${gisAddDays(record.date || record.lastInspect, days)}（預計）`;
}

function gisMaintenancePhotoHtml(record) {
  const photos = [];
  (record.photoDataUrls || []).forEach(src => photos.push({ src, label: '巡查照片' }));
  (record.photos || []).forEach(src => {
    if (!src) return;
    if (/^data:image\//.test(src) || /^\/|^https?:\/\//.test(src)) {
      photos.push({ src, label: '巡查照片' });
    } else {
      photos.push({ src: null, label: src });
    }
  });
  (record.facilityPhotos || []).forEach(src => photos.push({ src, label: '設施照片' }));

  if (!photos.length) return '<span style="color:#94a3b8">尚無照片</span>';
  const first = photos[0];
  if (first.src) {
    return `<button type="button" onclick="openGisLinkedInspection(${Number(record.inspectionId || 0)})" style="border:0;background:transparent;padding:0;cursor:pointer" title="開啟連動巡查紀錄">
      <img src="${gisEscape(first.src)}" alt="${gisEscape(first.label)}" style="width:58px;height:40px;object-fit:cover;border-radius:6px;border:1px solid #cbd5e1">
    </button>`;
  }
  return `<button class="btn btn-sm btn-outline" onclick="openGisLinkedInspection(${Number(record.inspectionId || 0)})" style="font-size:11px">${gisEscape(first.label)}</button>`;
}

function gisBuildMaintenanceRows() {
  const facilities = DB.getAll('facilities');
  const inspections = DB.getAll('inspections');
  const inspectionByFacility = new Map();
  inspections.forEach(item => {
    const key = Number(item.facilityId);
    const current = inspectionByFacility.get(key);
    if (!current || String(item.date || '') > String(current.date || '')) inspectionByFacility.set(key, item);
  });

  return facilities.map(f => {
    const inspection = inspectionByFacility.get(Number(f.id));
    const source = inspection || {};
    const level = gisNormalizeLevel(f.anomaly_level || f.anomalyLevel || f.status);
    const status = gisNormalizeStatus(source.status || (level === '正常' ? '完成' : '待處理'));
    const maintenanceDate = source.maintenanceStart || source.date || f.lastInspect || f.assessmentDate || '未建立巡查紀錄';
    return {
      facilityId: f.id,
      inspectionId: source.id || null,
      facilityName: f.name,
      stationKm: f.stationKm || (Number.isFinite(Number(f.km_num)) ? `K${(Number(f.km_num) / 1000).toFixed(3)}` : '-'),
      anomalyLevel: level,
      anomalyType: f.anomaly_type || source.findings || '-',
      priority: gisNormalizePriority(source.priority || f.maintenance_priority, level),
      date: maintenanceDate,
      lastInspect: f.lastInspect || source.date || '-',
      status,
      completedAt: source.id
        ? gisExpectedCompletion({ ...source, anomalyLevel: level, lastInspect: f.lastInspect })
        : (level === '正常' ? (f.lastInspect || f.assessmentDate || '未建立巡查紀錄') : gisExpectedCompletion({ ...source, anomalyLevel: level, lastInspect: f.lastInspect })),
      action: source.action || f.evaluationNotes || f.maintenanceStrategy || '-',
      photos: source.photos || [],
      photoDataUrls: source.photoDataUrls || [],
      facilityPhotos: f.photos || []
    };
  }).sort((a, b) => {
    const order = { '高': 0, '中': 1, '低': 2, '正常': 3 };
    if (order[a.anomalyLevel] !== order[b.anomalyLevel]) return order[a.anomalyLevel] - order[b.anomalyLevel];
    return String(a.stationKm).localeCompare(String(b.stationKm), 'zh-Hant');
  });
}

function renderGisMaintenanceLinkageTable() {
  const el = document.getElementById('gisMaintenanceLinkageTable');
  if (!el) return;
  const rows = gisBuildMaintenanceRows();
  const levelStyle = {
    '正常': 'background:#e8f5e9;color:#166534',
    '低': 'background:#fef9c3;color:#854d0e',
    '中': 'background:#ffedd5;color:#9a3412',
    '高': 'background:#fee2e2;color:#991b1b'
  };
  const statusStyle = {
    '完成': 'background:#dcfce7;color:#166534',
    '處理中': 'background:#dbeafe;color:#1d4ed8',
    '待處理': 'background:#fef3c7;color:#92400e'
  };

  el.innerHTML = `
    <div class="card" style="margin-bottom:16px">
      <div class="card-header">
        <span class="card-title"><i class="fas fa-link"></i> GIS設施異常與巡查維護連動表</span>
        <span style="font-size:12px;color:#64748b">依異常等級排序，點選「巡查」可開啟維護管理資料</span>
      </div>
      <div class="card-body">
        <div style="overflow-x:auto">
          <table style="width:100%;border-collapse:collapse;font-size:12px">
            <thead>
              <tr style="background:#f1f5f9;color:#334155">
                <th style="padding:9px;text-align:left;border:1px solid #e2e8f0">設施名稱</th>
                <th style="padding:9px;text-align:left;border:1px solid #e2e8f0">里程</th>
                <th style="padding:9px;text-align:center;border:1px solid #e2e8f0">異常等級</th>
                <th style="padding:9px;text-align:left;border:1px solid #e2e8f0">異常/維護重點</th>
                <th style="padding:9px;text-align:left;border:1px solid #e2e8f0">維護時間</th>
                <th style="padding:9px;text-align:center;border:1px solid #e2e8f0">處理階段</th>
                <th style="padding:9px;text-align:left;border:1px solid #e2e8f0">維護完成時間</th>
                <th style="padding:9px;text-align:center;border:1px solid #e2e8f0">照片</th>
                <th style="padding:9px;text-align:center;border:1px solid #e2e8f0">連動</th>
              </tr>
            </thead>
            <tbody>
              ${rows.map(row => `
                <tr>
                  <td style="padding:9px;border:1px solid #e2e8f0;font-weight:700;color:#0f172a">${gisEscape(row.facilityName || '-')}</td>
                  <td style="padding:9px;border:1px solid #e2e8f0">${gisEscape(row.stationKm || '-')}</td>
                  <td style="padding:9px;border:1px solid #e2e8f0;text-align:center">
                    <span style="${levelStyle[row.anomalyLevel]};padding:3px 8px;border-radius:999px;font-weight:800">${row.anomalyLevel}</span>
                  </td>
                  <td style="padding:9px;border:1px solid #e2e8f0;max-width:280px;line-height:1.45">${gisEscape(row.action || row.anomalyType || '-')}</td>
                  <td style="padding:9px;border:1px solid #e2e8f0">${gisEscape(row.date || '-')}</td>
                  <td style="padding:9px;border:1px solid #e2e8f0;text-align:center">
                    <span style="${statusStyle[row.status] || 'background:#f1f5f9;color:#334155'};padding:3px 8px;border-radius:999px;font-weight:800">${gisEscape(row.status || '-')}</span>
                  </td>
                  <td style="padding:9px;border:1px solid #e2e8f0">${gisEscape(row.completedAt || '-')}</td>
                  <td style="padding:9px;border:1px solid #e2e8f0;text-align:center">${gisMaintenancePhotoHtml(row)}</td>
                  <td style="padding:9px;border:1px solid #e2e8f0;text-align:center">
                    ${row.inspectionId
                      ? `<button class="btn btn-sm btn-primary" onclick="openGisLinkedInspection(${row.inspectionId})" style="font-size:11px"><i class="fas fa-camera-retro"></i> 巡查</button>`
                      : `<button class="btn btn-sm btn-outline" onclick="openGisFacilityMaintenanceForm(${row.facilityId})" style="font-size:11px"><i class="fas fa-plus"></i> 建立巡查</button>`}
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;
}

function openGisLinkedInspection(inspectionId) {
  closeFacilityDetailModal();
  closeComparisonModal();
  if (!inspectionId) return;
  if (typeof navigateTo === 'function') navigateTo('inspection');
  setTimeout(() => {
    if (typeof viewInspection === 'function') viewInspection(Number(inspectionId));
    const row = document.querySelector(`#inspectionTable button[onclick="viewInspection(${Number(inspectionId)})"]`);
    row?.closest('tr')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, 180);
}

function openGisFacilityMaintenanceForm(facilityId) {
  closeFacilityDetailModal();
  closeComparisonModal();
  if (typeof navigateTo === 'function') navigateTo('inspection');
  setTimeout(() => {
    if (typeof openInspectionForm === 'function') {
      openInspectionForm();
      const select = document.getElementById('ins_facility');
      if (select) select.value = String(facilityId);
    }
  }, 180);
}

/* ══════════════════════════════════════════════════════════════
   更新統計資訊
   ══════════════════════════════════════════════════════════════ */
function updateStatistics() {
  const facilities = DB.getAll('facilities');
  const stats = {
    '正常': 0,
    '低': 0,
    '中': 0,
    '高': 0
  };

  facilities.forEach(f => {
    const level = f.anomaly_level || '正常';
    if (level === '正常') stats['正常']++;
    else if (level === '低') stats['低']++;
    else if (level === '中') stats['中']++;
    else if (level === '高') stats['高']++;
  });

  document.getElementById('statNormal').textContent = stats['正常'];
  document.getElementById('statLow').textContent = stats['低'];
  document.getElementById('statMedium').textContent = stats['中'];
  document.getElementById('statHigh').textContent = stats['高'];
  renderGisMaintenanceLinkageTable();
}

/* ══════════════════════════════════════════════════════════════
   構造物型式比對表
   ══════════════════════════════════════════════════════════════ */
function closeComparisonModal() {
  const modal = document.getElementById('comparisonModal');
  if (modal) modal.remove();
}

function showFacilityComparisonTable() {
  closeComparisonModal();
  const facilities = DB.getAll('facilities');

  // 按類型分類
  const typeGroups = {};
  facilities.forEach(f => {
    if (!typeGroups[f.type]) typeGroups[f.type] = [];
    typeGroups[f.type].push(f);
  });

  let html = `
    <div class="modal-overlay" id="comparisonModal" onclick="if(event.target===this) closeComparisonModal()" style="display:flex!important;position:fixed;inset:0;z-index:12000;background:rgba(15,23,42,.55);align-items:center;justify-content:center;padding:18px">
      <div class="modal" onclick="event.stopPropagation()" style="max-width:1200px;max-height:90vh;overflow-y:auto;width:95%;position:relative;z-index:12001;background:#fff;border-radius:10px;box-shadow:0 24px 60px rgba(15,23,42,.35)">
        <div class="modal-header" style="position:sticky;top:0;background:#fff;z-index:2">
          <h3 id="modalTitle">構造物型式比對表 - 107~108 成果報告</h3>
          <button class="modal-close" onclick="closeComparisonModal()" aria-label="關閉構造物比對表"><i class="fas fa-times"></i></button>
        </div>
        <div class="modal-body" style="padding:20px">
          <div style="font-size:12px;line-height:1.6">
  `;

  // 按類型顯示表格
  Object.keys(typeGroups).forEach(type => {
    const items = typeGroups[type];
    html += `
      <div style="margin-bottom:24px">
        <h4 style="background:#f1f5f9;padding:12px;border-radius:6px;font-weight:700;color:#1565c0;margin-bottom:12px">
          ${type} (${items.length} 座)
        </h4>
        <div style="overflow-x:auto">
          <table style="width:100%;border-collapse:collapse;font-size:11px">
            <thead style="background:#e8ecf0">
              <tr>
                <th style="padding:8px;text-align:left;border:1px solid #bbb">編號</th>
                <th style="padding:8px;text-align:left;border:1px solid #bbb">公里數</th>
                <th style="padding:8px;text-align:left;border:1px solid #bbb">細類</th>
                <th style="padding:8px;text-align:left;border:1px solid #bbb">狀況</th>
                <th style="padding:8px;text-align:left;border:1px solid #bbb">異常</th>
                <th style="padding:8px;text-align:center;border:1px solid #bbb">健康度</th>
                <th style="padding:8px;text-align:center;border:1px solid #bbb">優先級</th>
              </tr>
            </thead>
            <tbody>
    `;

    items.forEach(f => {
      const hp = fac_health(f);
      const statusColor = {
        '正常': '#2e7d32', '需維護': '#f57c00', '損壞': '#d32f2f'
      }[f.status] || '#555';

      html += `
        <tr style="border-bottom:1px solid #e8ecf0;hover:background:#f9fafb">
          <td style="padding:8px;border:1px solid #bbb"><strong>${f.code}</strong></td>
          <td style="padding:8px;border:1px solid #bbb">K${(f.km_num/1000).toFixed(3)}</td>
          <td style="padding:8px;border:1px solid #bbb">${f.subType}</td>
          <td style="padding:8px;border:1px solid #bbb">
            <span style="background:${statusColor};color:#fff;padding:2px 6px;border-radius:3px;font-size:10px;font-weight:700">${f.status}</span>
          </td>
          <td style="padding:8px;border:1px solid #bbb">${f.anomaly_type || '-'}</td>
          <td style="padding:8px;border:1px solid #bbb;text-align:center;font-weight:700">${hp}%</td>
          <td style="padding:8px;border:1px solid #bbb;text-align:center">
            <span style="background:${f.maintenance_priority === '緊急' ? '#d32f2f' : f.maintenance_priority === '高' ? '#f57c00' : '#2e7d32'};color:#fff;padding:2px 6px;border-radius:3px;font-size:10px;font-weight:700">${f.maintenance_priority}</span>
          </td>
        </tr>
      `;
    });

    html += `
            </tbody>
          </table>
        </div>
      </div>
    `;
  });

  html += `
          </div>
        </div>
        <div class="modal-footer" style="padding:12px 20px;border-top:1px solid #e8ecf0">
          <button class="btn btn-primary" onclick="closeComparisonModal()">關閉</button>
        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', html);
}

// 從 facilities.js 複製的輔助函數
function fac_health(f) {
  const c = f.condition || 3;
  const dmg = f.status === '損壞' ? 2 : f.status === '需維護' ? 1 : 0;
  const structBase = {5:40,4:32,3:24,2:14,1:5}[c];
  const struct = Math.max(0, structBase - (dmg === 2 ? 22 : dmg === 1 ? 9 : 0));
  const funcBase = {5:30,4:24,3:18,2:10,1:3}[c];
  const func = Math.max(0, funcBase - (dmg === 2 ? 18 : dmg === 1 ? 6 : 0));
  const fishW = (f.type === '魚道') ? {5:20,4:16,3:12,2:6,1:2}[c] : {5:18,4:14,3:10,2:6,1:2}[c];
  const fish = Math.max(0, fishW - (dmg === 2 ? 14 : dmg === 1 ? 4 : 0));
  const env = {5:10,4:8,3:6,2:3,1:1}[c];
  return Math.min(95, Math.max(15, struct + func + fish + env));
}
