// DER&U 獨立評估模組 — renderDeruAssessment()
// 依賴：DERU_MATRIX（inspection.js 定義）、DB（db.js）、showToast（app.js）

let currentDeruAiImages = [];
let currentDeruAiImageDataUrls = [];
let currentDeruAiAnalysis = null;

function renderDeruAssessmentContent() {
  const facilities  = DB.getAll('facilities');
  const allInsp     = DB.getAll('inspections');
  const deruHistory = allInsp.filter(i => i.deru_d !== undefined && i.deru_d !== null);

  const today = new Date().toISOString().slice(0, 10);

  return `
    <!-- 說明卡 -->
    <div style="background:linear-gradient(135deg,#1565c0,#0288d1);color:#fff;border-radius:12px;padding:18px 22px;margin-bottom:18px;display:flex;gap:20px;align-items:flex-start">
      <i class="fas fa-clipboard-check" style="font-size:38px;opacity:.85;flex-shrink:0;margin-top:4px"></i>
      <div>
        <h2 style="margin:0 0 6px;font-size:20px;font-weight:700">DER&amp;U 工程設施評估作業</h2>
        <p style="margin:0;font-size:13px;opacity:.9;line-height:1.6">
          DER&amp;U 評估以<b>劣化程度（D）</b>、<b>損壞範圍（E）</b>、<b>風險影響（R）</b>三維度量化設施狀況，
          自動推算<b>緊急程度（U）</b>，協助排定維護優先順序。
        </p>
        <div style="display:flex;gap:12px;margin-top:10px;flex-wrap:wrap">
          ${[
            ['D — 劣化程度','損壞嚴重性（D0~D4）','#e3f2fd','#1565c0'],
            ['E — 損壞範圍','受影響面積比例（E1~E4）','#e8f5e9','#2e7d32'],
            ['R — 風險影響','對功能/安全的危害（R1~R4）','#fff8e1','#f57f17'],
            ['U — 緊急程度','系統依三維度自動推算','#fce4ec','#b71c1c']
          ].map(([t,d,bg,cl]) => `
            <div style="background:${bg};color:${cl};border-radius:8px;padding:7px 12px;font-size:12px;min-width:130px">
              <div style="font-weight:700;margin-bottom:2px">${t}</div>
              <div style="opacity:.85">${d}</div>
            </div>`).join('')}
        </div>
      </div>
    </div>

    <!-- 主體：左欄表單 + 右欄即時結果 -->
    <div style="display:grid;grid-template-columns:1fr 340px;gap:16px;margin-bottom:18px">

      <!-- 左欄：評估表單 -->
      <div style="background:#fff;border-radius:12px;padding:20px;box-shadow:0 1px 6px rgba(0,0,0,.08)">
        <input type="hidden" id="da_edit_id" value="">
        <h3 style="margin:0 0 14px;font-size:15px;font-weight:700;color:#1e293b;border-bottom:2px solid #e2e8f0;padding-bottom:8px">
          <i class="fas fa-edit" style="color:#1565c0;margin-right:6px"></i><span id="da_form_title">新增評估紀錄</span>
        </h3>

        <!-- 基本資訊 -->
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:16px">
          <div>
            <label style="font-size:12px;color:#64748b;font-weight:600;display:block;margin-bottom:4px">
              <i class="fas fa-hard-hat" style="color:#1565c0"></i> 設施 <span style="color:#ef4444">*</span>
            </label>
            <select id="da_facility" onchange="daUpdateFacilityInfo()" style="width:100%;padding:7px 10px;border:1px solid #cbd5e1;border-radius:6px;font-size:13px">
              <option value="">— 請選擇 —</option>
              ${facilities.map(f => `<option value="${f.id}" data-name="${escHtml(f.name)}" data-type="${escHtml(f.type||'')}">
                ${escHtml(f.name)}${f.type ? ' ('+escHtml(f.type)+')' : ''}
              </option>`).join('')}
            </select>
            <div id="da_facility_hint" style="font-size:11px;color:#94a3b8;margin-top:3px"></div>
          </div>
          <div>
            <label style="font-size:12px;color:#64748b;font-weight:600;display:block;margin-bottom:4px">
              <i class="fas fa-calendar-day" style="color:#1565c0"></i> 巡查日期
            </label>
            <input type="date" id="da_date" value="${today}" style="width:100%;padding:7px 10px;border:1px solid #cbd5e1;border-radius:6px;font-size:13px;box-sizing:border-box">
          </div>
          <div>
            <label style="font-size:12px;color:#64748b;font-weight:600;display:block;margin-bottom:4px">
              <i class="fas fa-user" style="color:#1565c0"></i> 巡查員
            </label>
            <input type="text" id="da_inspector" placeholder="姓名或編號" style="width:100%;padding:7px 10px;border:1px solid #cbd5e1;border-radius:6px;font-size:13px;box-sizing:border-box">
          </div>
        </div>

        <!-- D 評分 -->
        ${daRatingBlock('da_d', 'D', '劣化程度', '#1565c0', [
          ['0','D0 無明顯損壞','設施外觀完好，無可見損壞','#e8f5e9','#2e7d32'],
          ['1','D1 輕微劣化','表面輕微裂縫、褪色或磨損，不影響功能','#f1f8e9','#558b2f'],
          ['2','D2 中度損壞','明顯裂縫或變形，功能未完全喪失','#fff8e1','#f57f17'],
          ['3','D3 明顯損壞','結構性損壞，需近期修復','#fff3e0','#e65100'],
          ['4','D4 嚴重損壞','嚴重結構破壞或幾近失能','#ffebee','#b71c1c']
        ])}

        <!-- E 評分 -->
        ${daRatingBlock('da_e', 'E', '損壞範圍', '#2e7d32', [
          ['1','E1 局部 &lt;5%','損壞僅見於極小範圍（小於設施面積5%）','#e8f5e9','#2e7d32'],
          ['2','E2 約 5–25%','損壞分布於部分區域（5%~25%）','#f1f8e9','#558b2f'],
          ['3','E3 約 25–50%','損壞擴及較大範圍（25%~50%）','#fff8e1','#f57f17'],
          ['4','E4 超過 50%','損壞遍及設施大部分或全部','#ffebee','#b71c1c']
        ])}

        <!-- R 評分 -->
        ${daRatingBlock('da_r', 'R', '風險影響', '#b71c1c', [
          ['1','R1 影響低','對功能無直接影響，僅美觀問題','#e8f5e9','#2e7d32'],
          ['2','R2 需追蹤','輕微影響功能，應定期監測','#fff8e1','#f57f17'],
          ['3','R3 功能受損','影響通行、排洪或結構穩定','#fff3e0','#e65100'],
          ['4','R4 安全危害','有立即倒塌、阻斷或人員安全風險','#ffebee','#b71c1c']
        ])}

        <!-- 備註 -->
        <div style="margin-top:14px">
          <label style="font-size:12px;color:#64748b;font-weight:600;display:block;margin-bottom:4px">
            <i class="fas fa-comment-alt" style="color:#1565c0"></i> 現場備註
          </label>
          <textarea id="da_notes" rows="3" placeholder="補充說明、現場觀察要點…" style="width:100%;padding:8px 10px;border:1px solid #cbd5e1;border-radius:6px;font-size:13px;resize:vertical;box-sizing:border-box"></textarea>
        </div>

        <div style="margin-top:14px;border:1px solid #cbd5e1;border-radius:10px;padding:14px;background:#f8fafc">
          <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:10px">
            <div>
              <div style="font-size:14px;font-weight:800;color:#0f766e">
                <i class="fas fa-camera-retro"></i> AI 影像輔助評分
              </div>
              <div style="font-size:12px;color:#64748b;margin-top:2px">一次可匯入 1–3 張現場影像，系統將輔助判讀異常、損壞範圍與 D/E/R 建議值。已納入「防砂壩、固床工淘空/淘刷嚴重案例」及「固床工裂隙磨損案例」作為判讀校準。</div>
            </div>
            <button type="button" onclick="runDeruAiImageAnalysis()" style="padding:7px 12px;border:1px solid #0f766e;background:#0f766e;color:#fff;border-radius:7px;font-size:12px;font-weight:700;cursor:pointer;display:flex;align-items:center;gap:6px">
              <i class="fas fa-wand-magic-sparkles"></i> 執行AI分析
            </button>
          </div>
          <div style="display:grid;grid-template-columns:240px 1fr;gap:12px;align-items:stretch">
            <div style="border:1px dashed #94a3b8;border-radius:8px;background:#fff;padding:10px">
              <input id="da_ai_images" type="file" accept="image/*" multiple onchange="handleDeruAiImagesUpload(event)" style="width:100%;font-size:12px">
              <div style="font-size:11px;color:#64748b;line-height:1.5;margin-top:8px">
                支援防砂壩淘空/淘刷、固床工淘空/淘刷、固床工裂隙磨損、護岸淘刷、裂縫、淤積、魚道堵塞、構造物劣化照片。超過 3 張會自動只取前 3 張。
              </div>
            </div>
            <div>
              <div id="da_ai_preview" style="min-height:92px;display:grid;grid-template-columns:repeat(3,1fr);gap:8px">
                <div style="grid-column:1/-1;display:flex;align-items:center;justify-content:center;background:#fff;border:1px solid #e2e8f0;border-radius:8px;color:#94a3b8;font-size:12px;min-height:92px">尚未匯入影像</div>
              </div>
              <div id="da_ai_result" style="margin-top:10px"></div>
            </div>
          </div>
        </div>

        <div id="da_form_error" style="display:none;margin-top:12px;padding:10px 12px;border:1px solid #fecaca;background:#fef2f2;color:#b91c1c;border-radius:8px;font-size:13px;font-weight:700;line-height:1.5"></div>

        <div style="display:flex;gap:8px;margin-top:14px">
          <button onclick="saveDeruRecord()" style="flex:1;padding:10px;background:#1565c0;color:#fff;border:none;border-radius:8px;font-size:14px;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px">
            <i class="fas fa-save"></i> 儲存評估紀錄
          </button>
          <button type="button" onclick="resetDeruForm()" style="padding:10px 14px;background:#fff;color:#475569;border:1px solid #cbd5e1;border-radius:8px;font-size:13px;font-weight:700;cursor:pointer">
            取消修改
          </button>
        </div>
      </div>

      <!-- 右欄：即時計算結果 -->
      <div>
        <!-- 評分結果卡 -->
        <div id="da_result_card" style="background:#fff;border-radius:12px;padding:20px;box-shadow:0 1px 6px rgba(0,0,0,.08);margin-bottom:14px">
          <h4 style="margin:0 0 14px;font-size:14px;font-weight:700;color:#1e293b">
            <i class="fas fa-calculator" style="color:#1565c0;margin-right:6px"></i>即時評分結果
          </h4>

          <!-- D/E/R 顯示條 -->
          <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:16px" id="da_bar_area">
            ${['D','E','R'].map(x => `
              <div>
                <div style="display:flex;justify-content:space-between;font-size:12px;color:#64748b;margin-bottom:3px">
                  <span>${x === 'D' ? 'D — 劣化程度' : x === 'E' ? 'E — 損壞範圍' : 'R — 風險影響'}</span>
                  <span id="da_bar_${x.toLowerCase()}_label">—</span>
                </div>
                <div style="background:#f1f5f9;border-radius:4px;height:8px">
                  <div id="da_bar_${x.toLowerCase()}" style="height:8px;border-radius:4px;background:#cbd5e1;width:0%;transition:width .3s,background .3s"></div>
                </div>
              </div>`).join('')}
          </div>

          <!-- 分數 + U徽章 -->
          <div id="da_score_display" style="text-align:center;padding:16px;border-radius:10px;background:#f8fafc;border:2px solid #e2e8f0">
            <div style="font-size:12px;color:#94a3b8;margin-bottom:6px">加權分數（D×0.4 + E×0.25 + R×0.35）</div>
            <div id="da_score_num" style="font-size:40px;font-weight:900;color:#94a3b8;line-height:1">—</div>
            <div id="da_u_badge" style="display:inline-block;margin-top:10px;padding:6px 18px;border-radius:20px;font-size:15px;font-weight:700;background:#f1f5f9;color:#94a3b8">尚未評分</div>
            <div id="da_u_action" style="margin-top:8px;font-size:12px;color:#64748b;min-height:16px"></div>
          </div>
        </div>

        <!-- 評分維度說明 -->
        <div style="background:#fff;border-radius:12px;padding:16px;box-shadow:0 1px 6px rgba(0,0,0,.08)">
          <h4 style="margin:0 0 10px;font-size:13px;font-weight:700;color:#1e293b">
            <i class="fas fa-info-circle" style="color:#0288d1;margin-right:5px"></i>U 等級對照
          </h4>
          ${[
            ['U1','定期巡查','維持正常巡查頻率，記錄後繼續觀察','#e8f5e9','#2e7d32'],
            ['U2','追蹤觀察','列入追蹤清單，下次巡查重點確認','#fff8e1','#f57f17'],
            ['U3','優先維護','排入近期維修計畫，優先編列預算','#fff3e0','#e65100'],
            ['U4','緊急處置','立即通報，啟動緊急修復程序','#ffebee','#b71c1c']
          ].map(([u,l,a,bg,cl]) => `
            <div style="display:flex;align-items:flex-start;gap:10px;padding:7px 0;border-bottom:1px solid #f1f5f9">
              <span style="background:${bg};color:${cl};font-weight:700;font-size:12px;padding:3px 8px;border-radius:12px;flex-shrink:0;min-width:30px;text-align:center">${u}</span>
              <div>
                <div style="font-weight:600;font-size:12px;color:#1e293b">${l}</div>
                <div style="font-size:11px;color:#64748b">${a}</div>
              </div>
            </div>`).join('')}
        </div>
      </div>
    </div>

    <!-- 歷史紀錄 -->
    <div style="background:#fff;border-radius:12px;padding:20px;box-shadow:0 1px 6px rgba(0,0,0,.08)">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px">
        <h3 style="margin:0;font-size:15px;font-weight:700;color:#1e293b">
          <i class="fas fa-history" style="color:#1565c0;margin-right:6px"></i>評估歷史紀錄
          <span id="da_hist_count" style="font-size:12px;font-weight:400;color:#64748b;margin-left:8px">(${deruHistory.length} 筆)</span>
        </h3>
        <div style="display:flex;gap:8px;align-items:center">
          <select id="da_filter_facility" onchange="daRenderHistory()" style="padding:5px 10px;border:1px solid #cbd5e1;border-radius:6px;font-size:12px">
            <option value="">全部設施</option>
            ${[...new Set(deruHistory.map(i => i.facility_name).filter(Boolean))].map(n =>
              `<option value="${escHtml(n)}">${escHtml(n)}</option>`).join('')}
          </select>
          <button onclick="daExportCSV()" style="padding:5px 12px;background:#f1f5f9;border:1px solid #cbd5e1;border-radius:6px;font-size:12px;cursor:pointer;display:flex;align-items:center;gap:5px">
            <i class="fas fa-download"></i> 匯出 CSV
          </button>
        </div>
      </div>
      <div id="da_history_table"></div>
    </div>
  `;

}

function renderDeruAssessment() {
  document.getElementById('contentArea').innerHTML = renderDeruAssessmentContent();
  initDeruAssessmentControls();
}

// 獨立頁面入口（供側邊欄導覽使用）
function renderDeruPage() {
  syncDeruHistoryIntoInspectionRecords?.();
  const inspections = DB.getAll('inspections');
  const enriched = inspections.map(item => ({
    ...item,
    uiStatus:   typeof getInspectionStatus   === 'function' ? getInspectionStatus(item)   : (item.status || '待處理'),
    uiPriority: typeof getInspectionPriority === 'function' ? getInspectionPriority(item) : (item.priority || '低')
  }));
  const aiAnalysed = enriched.filter(i => i.aiImageAnalysis).length;
  const stats = {
    pending:    enriched.filter(i => i.uiStatus   === '待處理').length,
    inProgress: enriched.filter(i => i.uiStatus   === '處理中').length,
    done:       enriched.filter(i => i.uiStatus   === '完成').length,
    urgent:     enriched.filter(i => i.uiPriority === '緊急').length
  };

  document.getElementById('contentArea').innerHTML = `
    <!-- 統計摘要 -->
    <div class="stats-grid" style="grid-template-columns:repeat(4,1fr);margin-bottom:20px">
      <div class="stat-card"><div class="stat-icon orange"><i class="fas fa-clock"></i></div><div><div class="stat-value">${stats.pending}</div><div class="stat-label">待處理</div></div></div>
      <div class="stat-card"><div class="stat-icon blue"><i class="fas fa-spinner"></i></div><div><div class="stat-value">${stats.inProgress}</div><div class="stat-label">處理中</div></div></div>
      <div class="stat-card"><div class="stat-icon green"><i class="fas fa-check"></i></div><div><div class="stat-value">${stats.done}</div><div class="stat-label">已完成</div></div></div>
      <div class="stat-card"><div class="stat-icon red"><i class="fas fa-exclamation-triangle"></i></div><div><div class="stat-value">${stats.urgent}</div><div class="stat-label">緊急事項</div></div></div>
    </div>

    <!-- AI 影像辨識與輔助評分分析 -->
    ${typeof renderInspectionAiOverview === 'function' ? renderInspectionAiOverview(aiAnalysed, inspections.length) : ''}

    <!-- DER&U 評估作業表單 -->
    ${renderDeruAssessmentContent()}

    <!-- 處理狀態分布圖 -->
    ${typeof renderInspectionStatusMapSection === 'function' ? renderInspectionStatusMapSection(enriched) : ''}
  `;

  initDeruAssessmentControls();
  if (typeof initInspectionStatusMap === 'function') setTimeout(initInspectionStatusMap, 80);
}

function renderDeruAssessmentEmbedded() {
  return renderDeruAssessmentContent();
}

function initDeruAssessmentControls() {
  currentDeruAiImages = [];
  currentDeruAiImageDataUrls = [];
  currentDeruAiAnalysis = null;
  daRenderHistory();

  document.querySelectorAll('input[name="da_d"], input[name="da_e"], input[name="da_r"]')
    .forEach(el => el.addEventListener('change', daCalcLive));
  setDeruRadioValue('da_d', 1);
  setDeruRadioValue('da_e', 1);
  setDeruRadioValue('da_r', 1);
  clearDeruFormError();
  daCalcLive();
}

// ─── 產生評分選項 HTML ────────────────────────────────────────────────────────
function daRatingBlock(groupId, code, label, headerColor, options) {
  return `
    <div style="margin-bottom:14px">
      <div style="font-size:13px;font-weight:700;color:${headerColor};margin-bottom:8px;display:flex;align-items:center;gap:6px">
        <span style="background:${headerColor};color:#fff;width:24px;height:24px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-size:12px;flex-shrink:0">${code}</span>
        ${code} — ${label}
      </div>
      <div style="display:flex;flex-direction:column;gap:4px">
        ${options.map(([val, title, desc, bg, cl]) => `
          <label style="display:flex;align-items:flex-start;gap:10px;padding:8px 10px;border-radius:8px;border:2px solid #e2e8f0;cursor:pointer;transition:border-color .15s"
                 onmouseover="this.style.borderColor='${cl}'" onmouseout="this.style.borderColor=document.querySelector('input[name=\\'da_${code.toLowerCase()}\\']:checked')?.value=='${val}'?'${cl}':'#e2e8f0'">
            <input type="radio" name="da_${code.toLowerCase()}" value="${val}" style="margin-top:3px;accent-color:${cl}" onchange="daHighlightSelected('da_${code.toLowerCase()}','${cl}')">
            <div>
              <div style="font-weight:700;font-size:13px;color:${cl}">${title}</div>
              <div style="font-size:11px;color:#64748b;margin-top:1px">${desc}</div>
            </div>
          </label>`).join('')}
      </div>
    </div>`;
}

// ─── 選中高亮邊框 ─────────────────────────────────────────────────────────────
function daHighlightSelected(name, color) {
  document.querySelectorAll(`input[name="${name}"]`).forEach(el => {
    el.closest('label').style.borderColor = el.checked ? color : '#e2e8f0';
  });
}

function showDeruFormError(message, focusEl = null) {
  const box = document.getElementById('da_form_error');
  if (box) {
    box.innerHTML = `<i class="fas fa-exclamation-triangle"></i> ${escHtml(message)}`;
    box.style.display = 'block';
  }
  if (focusEl) {
    focusEl.style.borderColor = '#ef4444';
    focusEl.style.boxShadow = '0 0 0 3px rgba(239,68,68,.14)';
    focusEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setTimeout(() => focusEl.focus?.(), 250);
  }
  showToast(message, 'warning');
}

function clearDeruFormError() {
  const box = document.getElementById('da_form_error');
  if (box) {
    box.textContent = '';
    box.style.display = 'none';
  }
  const facilityEl = document.getElementById('da_facility');
  if (facilityEl) {
    facilityEl.style.borderColor = '#cbd5e1';
    facilityEl.style.boxShadow = 'none';
  }
}

// ─── 設施基本資訊提示 ─────────────────────────────────────────────────────────
function daUpdateFacilityInfo() {
  const sel = document.getElementById('da_facility');
  const opt = sel.options[sel.selectedIndex];
  const hint = document.getElementById('da_facility_hint');
  clearDeruFormError();
  if (!sel.value) { hint.textContent = ''; return; }
  const facilities = DB.getAll('facilities');
  const f = facilities.find(x => Number(x.id) === Number(sel.value));
  if (f) {
    hint.textContent = `${f.type || ''}  ${f.status ? '狀態: ' + f.status : ''}  ${f.maintenance_priority ? '優先: ' + f.maintenance_priority : ''}`;
  }
}

// ─── 即時計算 ─────────────────────────────────────────────────────────────────
function daCalcLive() {
  const dEl = document.querySelector('input[name="da_d"]:checked');
  const eEl = document.querySelector('input[name="da_e"]:checked');
  const rEl = document.querySelector('input[name="da_r"]:checked');

  if (!dEl || !eEl || !rEl) return;

  const d = parseInt(dEl.value);
  const e = parseInt(eEl.value);
  const r = parseInt(rEl.value);

  const result = DERU_MATRIX.urgency(d, e, r);

  // 更新分數與徽章
  document.getElementById('da_score_num').textContent = result.score.toFixed(2);
  document.getElementById('da_score_num').style.color = result.color;

  const badge = document.getElementById('da_u_badge');
  badge.textContent = result.label;
  badge.style.background = result.bg;
  badge.style.color = result.color;

  const actions = {
    1: '維持正常巡查頻率，記錄後繼續觀察',
    2: '列入追蹤清單，下次巡查重點確認',
    3: '排入近期維修計畫，優先編列預算',
    4: '立即通報，啟動緊急修復程序'
  };
  document.getElementById('da_u_action').textContent = actions[result.u] || '';

  const scoreEl = document.getElementById('da_score_display');
  scoreEl.style.borderColor = result.color;
  scoreEl.style.background = result.bg;

  // 更新進度條
  const barColors = { 0: '#cbd5e1', 1: '#2e7d32', 2: '#558b2f', 3: '#e65100', 4: '#b71c1c' };
  const dMax = 4, eMax = 4, rMax = 4;
  _daUpdateBar('d', d, dMax, barColors[d] || '#1565c0');
  _daUpdateBar('e', e, eMax, barColors[e] || '#1565c0');
  _daUpdateBar('r', r, rMax, barColors[r] || '#1565c0');
}

function _daUpdateBar(code, val, max, color) {
  const bar = document.getElementById(`da_bar_${code}`);
  const lbl = document.getElementById(`da_bar_${code}_label`);
  if (bar) { bar.style.width = (val / max * 100) + '%'; bar.style.background = color; }
  if (lbl) { lbl.textContent = `${code.toUpperCase()}${val}`; lbl.style.color = color; }
}

function handleDeruAiImagesUpload(event) {
  const files = Array.from(event.target.files || []).filter(file => file.type?.startsWith('image/')).slice(0, 3);
  if ((event.target.files || []).length > 3) {
    showToast('一次最多分析 3 張影像，已自動取前 3 張', 'warning');
  }
  currentDeruAiImages = files;
  currentDeruAiImageDataUrls = [];
  currentDeruAiAnalysis = null;
  renderDeruAiResult(null);

  const preview = document.getElementById('da_ai_preview');
  if (!preview) return;
  if (!files.length) {
    preview.innerHTML = `<div style="grid-column:1/-1;display:flex;align-items:center;justify-content:center;background:#fff;border:1px solid #e2e8f0;border-radius:8px;color:#94a3b8;font-size:12px;min-height:92px">尚未匯入影像</div>`;
    return;
  }

  preview.innerHTML = files.map((file, index) => `
    <div style="position:relative;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;background:#fff;min-height:92px">
      <div id="da_ai_preview_${index}" style="height:92px;display:flex;align-items:center;justify-content:center;color:#94a3b8;font-size:11px">讀取中</div>
      <div style="position:absolute;left:6px;bottom:6px;background:rgba(15,23,42,.72);color:#fff;font-size:10px;padding:2px 6px;border-radius:999px;max-width:calc(100% - 12px);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escHtml(file.name)}</div>
    </div>
  `).join('');

  files.forEach((file, index) => {
    const reader = new FileReader();
    reader.onload = () => {
      currentDeruAiImageDataUrls[index] = String(reader.result || '');
      const slot = document.getElementById(`da_ai_preview_${index}`);
      if (slot) {
        slot.innerHTML = `<img src="${reader.result}" alt="DER&U 影像 ${index + 1}" style="width:100%;height:100%;object-fit:cover">`;
      }
    };
    reader.readAsDataURL(file);
  });
}

async function runDeruAiImageAnalysis() {
  if (!currentDeruAiImages.length) {
    showToast('請先匯入 1–3 張影像', 'warning');
    return;
  }

  const facilityEl = document.getElementById('da_facility');
  const facilityName = facilityEl?.options[facilityEl.selectedIndex]?.dataset?.name
    || facilityEl?.options[facilityEl.selectedIndex]?.text?.replace(/\s*\(.*\)/, '').trim()
    || '';
  const notes = document.getElementById('da_notes')?.value || '';
  renderDeruAiResult({ loading: true, imageCount: currentDeruAiImages.length });

  const analyses = [];
  for (const [index, file] of currentDeruAiImages.entries()) {
    let analysis = null;
    try {
      const imageBase64 = await resizeInspectionImageForVision(file);
      analysis = await analyzeInspectionImageWithOllamaVision({
        imageBase64,
        imageName: file.name,
        facilityName,
        findings: notes,
        weather: ''
      });
    } catch (error) {
      console.warn('[DERU AI] vision unavailable, fallback local scoring:', error);
      analysis = buildInspectionAiAnalysis({
        facilityName,
        findings: `${notes} ${file.name}`,
        weather: '',
        fileName: file.name
      });
      analysis.provider = 'local_rule_fallback';
      analysis.model = 'deru-rule-assist';
      analysis.inferenceMode = 'local_rule_fallback';
    }
    analysis = applyInspectionDomainOverrides(analysis, {
      facilityName,
      findings: notes,
      weather: '',
      fileName: file.name,
      hasImage: true
    });
    analysis.imageIndex = index + 1;
    analyses.push(analysis);
  }

  currentDeruAiAnalysis = mergeDeruAiAnalyses(analyses, facilityName);
  applyDeruAiAnalysisToForm(currentDeruAiAnalysis);
  renderDeruAiResult(currentDeruAiAnalysis);
  showToast(`AI影像輔助評分完成，已分析 ${analyses.length} 張並帶入 D/E/R 建議`, 'success');
}

function mergeDeruAiAnalyses(analyses, facilityName) {
  const valid = analyses.filter(Boolean);
  const maxBy = key => Math.max(...valid.map(a => Number(a.deru?.[key] || 0)), 0);
  const d = maxBy('d') || 1;
  const e = maxBy('e') || 1;
  const r = maxBy('r') || 1;
  const deru = DERU_MATRIX.urgency(d, e, r);
  const abnormalRegions = valid.reduce((sum, a) => sum + Number(a.abnormalRegions || 0), 0);
  const damageCoverage = Math.max(...valid.map(a => Number(a.damageCoverage || 0)), 0);
  const confidence = valid.length
    ? valid.reduce((sum, a) => sum + Number(a.confidence || 0.65), 0) / valid.length
    : 0.65;
  const features = [...new Set(valid.flatMap(a => a.deteriorationFeatures || []))].slice(0, 8);
  const priority = deru.u >= 4 ? '緊急' : deru.u === 3 ? '高' : deru.u === 2 ? '中' : '低';
  const appearanceChecklist = buildInspectionAppearanceChecklist(features, valid.reduce((acc, a) => ({ ...acc, ...(a.appearanceChecklist || {}) }), {}), false);
  const severityGrade = inspectionSeverityGrade({ deru: { d, e, r, u: deru.u }, damageCoverage, abnormalRegions });

  return {
    version: 'DERU-MultiImage-Assist-1.0',
    analysedAt: new Date().toISOString(),
    provider: valid.some(a => a.provider === 'ollama') ? 'ollama' : 'local_rule_fallback',
    model: valid.map(a => a.model).filter(Boolean).join(' / ') || 'inspection-rule-assist',
    inferenceMode: 'deru_multi_image_assist',
    facilityName,
    imageName: currentDeruAiImages.map(f => f.name).join('、'),
    imageCount: valid.length,
    abnormalRegions,
    damageCoverage,
    deteriorationFeatures: features.length ? features : ['影像中未見明顯重大異常，建議人工覆核確認'],
    confidence,
    confidenceLabel: inspectionConfidenceLabel(confidence),
    priority,
    deru: { d, e, r, u: deru.u, score: Number(deru.score.toFixed(2)), label: deru.label },
    appearanceChecklist,
    severityGrade,
    structureType: valid.find(a => a.structureType)?.structureType || inferInspectionStructureType(facilityName, features),
    reasoning: `系統已綜合 ${valid.length} 張影像，以最保守原則採用最高 D/E/R 建議值；主要可見或疑似特徵為${features.join('、') || '未見明顯異常'}。惟影像判讀受角度、遮蔽與解析度限制，仍需現場複核。`,
    recommendations: [...new Set(valid.flatMap(a => a.recommendations || []))].slice(0, 3),
    findingsSuggestion: `AI影像輔助判讀：共分析 ${valid.length} 張，${features.join('、') || '未見明顯重大異常'}；估計最大異常範圍約 ${damageCoverage}%，建議 D${d}/E${e}/R${r}，${deru.label}。`,
    actionSuggestion: deru.u >= 3
      ? '建議列入近期現場複核，補拍同角度照片並量測損壞範圍；若異常擴大，應排入優先維護。'
      : '建議維持例行巡查，後續以同角度照片追蹤變化。'
  };
}

function applyDeruAiAnalysisToForm(analysis) {
  if (!analysis?.deru) return;
  setDeruRadioValue('da_d', analysis.deru.d);
  setDeruRadioValue('da_e', analysis.deru.e);
  setDeruRadioValue('da_r', analysis.deru.r);
  daCalcLive();

  const notesEl = document.getElementById('da_notes');
  if (notesEl) {
    const addition = `${analysis.findingsSuggestion}\n處理建議：${analysis.actionSuggestion}`;
    notesEl.value = notesEl.value.trim()
      ? `${notesEl.value.trim()}\n\n${addition}`
      : addition;
  }
}

function setDeruRadioValue(name, value) {
  const target = document.querySelector(`input[name="${name}"][value="${Number(value)}"]`);
  if (target) target.checked = true;
  const color = name === 'da_d' ? '#1565c0' : name === 'da_e' ? '#2e7d32' : '#b71c1c';
  daHighlightSelected(name, color);
}

function renderDeruAiResult(analysis) {
  const el = document.getElementById('da_ai_result');
  if (!el) return;
  if (!analysis) {
    el.innerHTML = '';
    return;
  }
  if (analysis.loading) {
    el.innerHTML = `
      <div style="border:1px solid #bae6fd;background:#f0f9ff;color:#0369a1;border-radius:8px;padding:10px;font-size:12px;line-height:1.6">
        <i class="fas fa-spinner fa-spin"></i> 正在分析 ${analysis.imageCount || 0} 張影像，將依最保守原則產生 D/E/R 建議...
      </div>`;
    return;
  }
  const deru = analysis.deru || {};
  el.innerHTML = `
    <div style="border:1px solid #bfdbfe;background:#eff6ff;border-radius:8px;padding:10px">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:8px">
        <div style="font-weight:800;color:#1e40af">AI輔助判讀結果</div>
        <span style="background:#dcfce7;color:#166534;font-size:11px;font-weight:700;padding:3px 8px;border-radius:999px">${Math.round((analysis.confidence || 0) * 100)}% 信心</span>
      </div>
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:8px">
        ${daAiMiniBox('影像', `${analysis.imageCount || currentDeruAiImages.length} 張`)}
        ${daAiMiniBox('異常範圍', `${analysis.damageCoverage || 0}%`)}
        ${daAiMiniBox('建議 D/E/R', `D${deru.d}/E${deru.e}/R${deru.r}`)}
        ${daAiMiniBox('U 等級', deru.label || '—')}
      </div>
      <div style="font-size:12px;color:#334155;line-height:1.65">${escHtml(analysis.findingsSuggestion || '')}</div>
      ${renderDeruAppearanceChecklistPanel(analysis)}
    </div>`;
}

function renderDeruAppearanceChecklistPanel(analysis) {
  if (!analysis || typeof INSPECTION_APPEARANCE_ITEMS === 'undefined') return '';
  const checklist = analysis.appearanceChecklist || {};
  const labels = typeof INSPECTION_APPEARANCE_LABELS !== 'undefined' ? INSPECTION_APPEARANCE_LABELS : {};
  const labelFor = item => labels[item.key] || item.label || '';
  const checkedItems = INSPECTION_APPEARANCE_ITEMS
    .filter(item => item.key !== 'good' && checklist[item.key])
    .map(labelFor);
  const recommendations = Array.isArray(analysis.recommendations)
    ? analysis.recommendations.slice(0, 3)
    : (analysis.actionSuggestion ? [analysis.actionSuggestion] : []);

  return `
    <div style="margin-top:10px;background:#fff;border:1px solid #dbeafe;border-radius:8px;padding:10px">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:8px">
        <div style="font-weight:800;color:#0f172a">外觀檢視勾選</div>
        <span style="background:#e0f2fe;color:#075985;font-size:11px;font-weight:700;padding:3px 8px;border-radius:999px">${escHtml(analysis.structureType || '無法判定')}</span>
      </div>
      <div style="display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:12px">
        <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:5px 10px;font-size:12px;color:#334155">
          ${INSPECTION_APPEARANCE_ITEMS.map(item => {
            const checked = !!checklist[item.key];
            const label = item.key === 'other' && checklist.otherText
              ? `${labelFor(item)}：${checklist.otherText}`
              : labelFor(item);
            return `<label style="display:flex;align-items:center;gap:5px">
              <input type="checkbox" ${checked ? 'checked' : ''} disabled style="margin:0">
              <span style="${checked ? 'font-weight:800;color:#0f172a' : 'color:#64748b'}">${escHtml(label)}</span>
            </label>`;
          }).join('')}
        </div>
        <div>
          <div style="font-size:12px;color:#1565c0;font-weight:800;margin-bottom:6px">後續建議</div>
          <ul style="margin:0;padding-left:18px;font-size:12px;line-height:1.7;color:#334155">
            ${(recommendations.length ? recommendations : ['維持例行巡查，並以前後角度照片比對劣化變化。'])
              .map(item => `<li>${escHtml(item)}</li>`).join('')}
          </ul>
          <div style="font-size:12px;color:#64748b;line-height:1.6;margin-top:8px">
            已勾選：${escHtml(checkedItems.length ? checkedItems.join('、') : '未見明顯異常')}
          </div>
        </div>
      </div>
    </div>
  `;
}

function daAiMiniBox(label, value) {
  return `
    <div style="background:#fff;border:1px solid #dbeafe;border-radius:7px;padding:7px;text-align:center">
      <div style="font-size:11px;color:#64748b">${label}</div>
      <div style="font-size:13px;font-weight:800;color:#1d4ed8;margin-top:2px">${escHtml(value)}</div>
    </div>`;
}

function daPersistAssessmentRecord(editId, record) {
  try {
    return editId ? DB.update('inspections', editId, record) : DB.insert('inspections', record);
  } catch (error) {
    const isStorageIssue = /quota|storage|exceeded|NS_ERROR_DOM_QUOTA/i.test(String(error?.message || error));
    if (!isStorageIssue) throw error;
    const lightweight = {
      ...record,
      photoDataUrls: [],
      storageLimited: true,
      storageLimitedReason: '瀏覽器儲存空間不足，已保留評估資料與照片檔名，未保存影像Base64內容。'
    };
    return editId ? DB.update('inspections', editId, lightweight) : DB.insert('inspections', lightweight);
  }
}

// ─── 儲存 ─────────────────────────────────────────────────────────────────────
function saveDeruRecord() {
  const editIdRaw = document.getElementById('da_edit_id')?.value || '';
  const editId = editIdRaw ? Number(editIdRaw) : null;
  const facilityEl  = document.getElementById('da_facility');
  const facilityId  = facilityEl.value;
  const facilityOpt = facilityEl.options[facilityEl.selectedIndex];
  const facilityName = facilityOpt?.dataset?.name || facilityOpt?.text?.replace(/\s*\(.*\)/, '').trim() || '';

  clearDeruFormError();
  if (!facilityId) {
    showDeruFormError('無法儲存：請先選擇要評估的工程設施。', facilityEl);
    return;
  }

  const dEl = document.querySelector('input[name="da_d"]:checked');
  const eEl = document.querySelector('input[name="da_e"]:checked');
  const rEl = document.querySelector('input[name="da_r"]:checked');

  if (!dEl || !eEl || !rEl) {
    showDeruFormError('無法儲存：請完整勾選 D 劣化程度、E 損壞範圍、R 風險影響三項評分。');
    return;
  }

  const d = parseInt(dEl.value);
  const e = parseInt(eEl.value);
  const r = parseInt(rEl.value);
  const result = DERU_MATRIX.urgency(d, e, r);

  const date      = document.getElementById('da_date').value || new Date().toISOString().slice(0, 10);
  const inspector = document.getElementById('da_inspector').value.trim();
  const notes     = document.getElementById('da_notes').value.trim();
  const existingRecord = editId ? daGetRecord(editId) : null;
  const savedPhotoNames = currentDeruAiImages.length
    ? currentDeruAiImages.map(file => file.name)
    : (Array.isArray(existingRecord?.photos) ? existingRecord.photos : String(existingRecord?.aiImageName || '').split('、').filter(Boolean));
  const savedPhotoDataUrls = currentDeruAiImageDataUrls.filter(Boolean).length
    ? currentDeruAiImageDataUrls.filter(Boolean)
    : (Array.isArray(existingRecord?.photoDataUrls) ? existingRecord.photoDataUrls : []);

  const priority = result.u >= 4 ? '緊急' : result.u === 3 ? '高' : result.u === 2 ? '中' : '低';

  const record = {
    facility_id:   facilityId,
    facility_name: facilityName,
    facilityId,
    facilityName,
    date,
    maintenanceStart: date,
    inspector,
    deru_d:        d,
    deru_e:        e,
    deru_r:        r,
    deru_score:    Number(result.score.toFixed(2)),
    deru_u:        result.u,
    deru_label:    result.label,
    priority,
    status:        '待處理',
    sourceType:    'DER&U評估',
    notes,
    findings:      currentDeruAiAnalysis?.findingsSuggestion || notes || 'DER&U 工程設施評估紀錄',
    action:        currentDeruAiAnalysis?.actionSuggestion || '',
    aiImageAnalysis: currentDeruAiAnalysis || existingRecord?.aiImageAnalysis || null,
    aiImageName:   savedPhotoNames.join('、'),
    photos:        savedPhotoNames,
    photoDataUrls: savedPhotoDataUrls,
    type:          'deru_assessment',
    created_at:    new Date().toISOString()
  };

  let savedRecord = null;
  try {
    savedRecord = daPersistAssessmentRecord(editId, record);
  } catch (error) {
    console.error('[DERU] Save failed:', error);
    showDeruFormError(`評估結果無法寫入資料庫：${error?.message || error}`);
    return;
  }
  if (!savedRecord || !DB.getAll('inspections').some(row => Number(row.id) === Number(savedRecord.id))) {
    showDeruFormError('評估結果未成功寫入資料庫，請重新儲存一次。');
    return;
  }

  showToast(`${editId ? '已更新' : '已儲存'} ${facilityName} 評估（${result.label}，優先度：${priority}）${savedRecord.storageLimited ? '；影像因儲存空間限制未寫入' : ''}`, 'success');

  resetDeruForm();

  daRenderHistory();
  if (typeof loadInspectionTable === 'function') loadInspectionTable();
}

function resetDeruForm() {
  clearDeruFormError();
  const editEl = document.getElementById('da_edit_id');
  if (editEl) editEl.value = '';
  const titleEl = document.getElementById('da_form_title');
  if (titleEl) titleEl.textContent = '新增評估紀錄';
  const dateEl = document.getElementById('da_date');
  if (dateEl) dateEl.value = new Date().toISOString().slice(0, 10);
  const facilityEl = document.getElementById('da_facility');
  if (facilityEl) facilityEl.value = '';
  const inspectorEl = document.getElementById('da_inspector');
  if (inspectorEl) inspectorEl.value = '';
  const notesEl = document.getElementById('da_notes');
  if (notesEl) notesEl.value = '';
  const hintEl = document.getElementById('da_facility_hint');
  if (hintEl) hintEl.textContent = '';
  const imageInput = document.getElementById('da_ai_images');
  if (imageInput) imageInput.value = '';
  currentDeruAiImages = [];
  currentDeruAiImageDataUrls = [];
  currentDeruAiAnalysis = null;
  const preview = document.getElementById('da_ai_preview');
  if (preview) {
    preview.innerHTML = `<div style="grid-column:1/-1;display:flex;align-items:center;justify-content:center;background:#fff;border:1px solid #e2e8f0;border-radius:8px;color:#94a3b8;font-size:12px;min-height:92px">尚未匯入影像</div>`;
  }
  renderDeruAiResult(null);
  document.querySelectorAll('input[name="da_d"], input[name="da_e"], input[name="da_r"]')
    .forEach(el => {
      el.checked = false;
      el.closest('label').style.borderColor = '#e2e8f0';
    });
  document.getElementById('da_score_num').textContent = '—';
  document.getElementById('da_score_num').style.color = '#94a3b8';
  document.getElementById('da_u_badge').textContent = '尚未評分';
  document.getElementById('da_u_badge').style.background = '#f1f5f9';
  document.getElementById('da_u_badge').style.color = '#94a3b8';
  document.getElementById('da_u_action').textContent = '';
  document.getElementById('da_score_display').style.borderColor = '#e2e8f0';
  document.getElementById('da_score_display').style.background = '#f8fafc';
  ['d','e','r'].forEach(c => _daUpdateBar(c, 0, 4, '#cbd5e1'));
  setDeruRadioValue('da_d', 1);
  setDeruRadioValue('da_e', 1);
  setDeruRadioValue('da_r', 1);
  daCalcLive();
}

// ─── 渲染歷史表格 ─────────────────────────────────────────────────────────────
function daRenderHistory() {
  const filterEl = document.getElementById('da_filter_facility');
  const filter   = filterEl ? filterEl.value : '';
  const allInsp  = DB.getAll('inspections');
  let   rows     = allInsp.filter(i => i.type === 'deru_assessment');

  if (filter) rows = rows.filter(i => i.facility_name === filter);

  // 更新筆數標籤
  const cnt = document.getElementById('da_hist_count');
  if (cnt) cnt.textContent = `(${rows.length} 筆)`;

  const container = document.getElementById('da_history_table');
  if (!container) return;

  if (rows.length === 0) {
    container.innerHTML = `<div style="text-align:center;padding:32px;color:#94a3b8"><i class="fas fa-clipboard" style="font-size:32px;margin-bottom:8px;display:block"></i>尚無評估紀錄</div>`;
    return;
  }

  // 依日期降序
  rows = [...rows].sort((a, b) => (b.date || '').localeCompare(a.date || ''));

  const uStyle = (u) => {
    const m = { 1: ['#e8f5e9','#2e7d32'], 2: ['#fff8e1','#f57f17'], 3: ['#fff3e0','#e65100'], 4: ['#ffebee','#b71c1c'] };
    return m[u] || ['#f1f5f9','#64748b'];
  };

  container.innerHTML = `
    <div style="overflow-x:auto">
      <table style="width:100%;border-collapse:collapse;font-size:13px">
        <thead>
          <tr style="background:#f8fafc;border-bottom:2px solid #e2e8f0">
            <th style="padding:9px 12px;text-align:left;font-weight:600;color:#475569;white-space:nowrap">設施名稱</th>
            <th style="padding:9px 12px;text-align:left;font-weight:600;color:#475569">日期</th>
            <th style="padding:9px 8px;text-align:center;font-weight:600;color:#1565c0">D</th>
            <th style="padding:9px 8px;text-align:center;font-weight:600;color:#2e7d32">E</th>
            <th style="padding:9px 8px;text-align:center;font-weight:600;color:#b71c1c">R</th>
            <th style="padding:9px 8px;text-align:center;font-weight:600;color:#475569">分數</th>
            <th style="padding:9px 12px;text-align:center;font-weight:600;color:#475569">U 等級</th>
            <th style="padding:9px 12px;text-align:center;font-weight:600;color:#475569">優先度</th>
            <th style="padding:9px 12px;text-align:left;font-weight:600;color:#475569">巡查員</th>
            <th style="padding:9px 12px;text-align:left;font-weight:600;color:#475569">備註</th>
            <th style="padding:9px 8px;text-align:center;font-weight:600;color:#475569">操作</th>
          </tr>
        </thead>
        <tbody>
          ${rows.map((row, idx) => {
            const [bg, cl] = uStyle(row.deru_u);
            const priBg = { '緊急': '#ffebee', '高': '#fff3e0', '中': '#fff8e1', '低': '#e8f5e9' }[row.priority] || '#f1f5f9';
            const priCl = { '緊急': '#b71c1c', '高': '#e65100', '中': '#f57f17', '低': '#2e7d32' }[row.priority] || '#64748b';
            return `
              <tr style="border-bottom:1px solid #f1f5f9;${idx % 2 === 1 ? 'background:#fafbff' : ''}">
                <td style="padding:9px 12px;font-weight:600;color:#1e293b">${escHtml(row.facility_name || '—')}</td>
                <td style="padding:9px 12px;color:#475569;white-space:nowrap">${escHtml(row.date || '—')}</td>
                <td style="padding:9px 8px;text-align:center;font-weight:700;color:#1565c0">D${row.deru_d ?? '—'}</td>
                <td style="padding:9px 8px;text-align:center;font-weight:700;color:#2e7d32">E${row.deru_e ?? '—'}</td>
                <td style="padding:9px 8px;text-align:center;font-weight:700;color:#b71c1c">R${row.deru_r ?? '—'}</td>
                <td style="padding:9px 8px;text-align:center;font-weight:700;color:#475569">${row.deru_score ?? '—'}</td>
                <td style="padding:9px 12px;text-align:center">
                  <span style="background:${bg};color:${cl};padding:3px 10px;border-radius:12px;font-weight:700;font-size:12px">${escHtml(row.deru_label || 'U' + (row.deru_u || '—'))}</span>
                </td>
                <td style="padding:9px 12px;text-align:center">
                  <span style="background:${priBg};color:${priCl};padding:3px 10px;border-radius:12px;font-weight:700;font-size:12px">${escHtml(row.priority || '—')}</span>
                </td>
                <td style="padding:9px 12px;color:#475569">${escHtml(row.inspector || '—')}</td>
                <td style="padding:9px 12px;color:#64748b;max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${escHtml(row.notes || '')}">${escHtml(row.notes || '—')}</td>
                <td style="padding:9px 8px;text-align:center;white-space:nowrap">
                  <button onclick="daViewRecord(${Number(row.id)})" style="padding:3px 7px;background:#fff;border:1px solid #93c5fd;color:#1565c0;border-radius:5px;font-size:11px;cursor:pointer;margin-right:4px" title="查看">
                    <i class="fas fa-eye"></i>
                  </button>
                  <button onclick="daEditRecord(${Number(row.id)})" style="padding:3px 7px;background:#fff;border:1px solid #86efac;color:#15803d;border-radius:5px;font-size:11px;cursor:pointer;margin-right:4px" title="修改">
                    <i class="fas fa-edit"></i>
                  </button>
                  <button onclick="daDeleteRecord('${row.id}')" style="padding:3px 7px;background:#fff;border:1px solid #fca5a5;color:#ef4444;border-radius:5px;font-size:11px;cursor:pointer" title="刪除此筆">
                    <i class="fas fa-trash-alt"></i>
                  </button>
                </td>
              </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>`;
}

// ─── 刪除 ─────────────────────────────────────────────────────────────────────
function daDeleteRecord(id) {
  if (!confirm('確定要刪除這筆評估紀錄嗎？')) return;
  // DB stores numeric IDs via insert(); try both numeric and string match
  const numId = Number(id);
  DB.delete('inspections', isNaN(numId) ? id : numId);
  showToast('已刪除評估紀錄', 'info');
  daRenderHistory();
  if (typeof loadInspectionTable === 'function') loadInspectionTable();
}

function daGetRecord(id) {
  const numId = Number(id);
  return DB.getAll('inspections').find(row => Number(row.id) === numId);
}

function daEditRecord(id) {
  const row = daGetRecord(id);
  if (!row) {
    showToast('找不到評估紀錄', 'error');
    return;
  }
  document.getElementById('da_edit_id').value = row.id;
  document.getElementById('da_form_title').textContent = `修改評估紀錄 - ${row.facility_name || row.facilityName || ''}`;
  document.getElementById('da_facility').value = row.facility_id || row.facilityId || '';
  document.getElementById('da_date').value = row.date || new Date().toISOString().slice(0, 10);
  document.getElementById('da_inspector').value = row.inspector || '';
  document.getElementById('da_notes').value = row.notes || row.findings || '';
  daUpdateFacilityInfo();
  setDeruRadioValue('da_d', row.deru_d);
  setDeruRadioValue('da_e', row.deru_e);
  setDeruRadioValue('da_r', row.deru_r);
  currentDeruAiAnalysis = row.aiImageAnalysis || null;
  currentDeruAiImages = [];
  currentDeruAiImageDataUrls = Array.isArray(row.photoDataUrls) ? row.photoDataUrls : [];
  renderDeruSavedPhotoPreview(row);
  renderDeruAiResult(currentDeruAiAnalysis);
  daCalcLive();
  document.getElementById('da_form_title')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  showToast('已載入紀錄，可直接修改後儲存', 'info');
}

function renderDeruSavedPhotoPreview(row) {
  const preview = document.getElementById('da_ai_preview');
  if (!preview) return;
  const urls = Array.isArray(row.photoDataUrls) ? row.photoDataUrls : [];
  const names = Array.isArray(row.photos) ? row.photos : String(row.aiImageName || '').split('、').filter(Boolean);
  if (!urls.length) {
    preview.innerHTML = `<div style="grid-column:1/-1;display:flex;align-items:center;justify-content:center;background:#fff;border:1px solid #e2e8f0;border-radius:8px;color:#94a3b8;font-size:12px;min-height:92px">${names.length ? escHtml(names.join('、')) : '此紀錄未儲存影像'}</div>`;
    return;
  }
  preview.innerHTML = urls.slice(0, 3).map((src, index) => `
    <div style="position:relative;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;background:#fff;min-height:92px">
      <img src="${src}" alt="已儲存影像 ${index + 1}" style="width:100%;height:92px;object-fit:cover">
      <div style="position:absolute;left:6px;bottom:6px;background:rgba(15,23,42,.72);color:#fff;font-size:10px;padding:2px 6px;border-radius:999px;max-width:calc(100% - 12px);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escHtml(names[index] || `影像 ${index + 1}`)}</div>
    </div>
  `).join('');
}

function daViewRecord(id) {
  const row = daGetRecord(id);
  if (!row) {
    showToast('找不到評估紀錄', 'error');
    return;
  }
  const deru = DERU_MATRIX.urgency(row.deru_d || 0, row.deru_e || 1, row.deru_r || 1);
  const photos = Array.isArray(row.photoDataUrls) ? row.photoDataUrls : [];
  const photoNames = Array.isArray(row.photos) ? row.photos : String(row.aiImageName || '').split('、').filter(Boolean);
  const analysis = row.aiImageAnalysis || {};
  document.getElementById('modalTitle').textContent = `DER&U 評估紀錄 - ${row.facility_name || row.facilityName || '未命名設施'}`;
  document.getElementById('modalBody').innerHTML = `
    <div style="display:grid;gap:14px">
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px">
        ${daViewMetric('D 劣化程度', `D${row.deru_d ?? '—'}`, '#1565c0')}
        ${daViewMetric('E 損壞範圍', `E${row.deru_e ?? '—'}`, '#2e7d32')}
        ${daViewMetric('R 風險影響', `R${row.deru_r ?? '—'}`, '#b71c1c')}
        ${daViewMetric('U 急迫性', row.deru_label || deru.label, deru.color)}
      </div>
      <div style="font-size:13px;line-height:1.75;color:#334155;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:12px">
        <b>日期：</b>${escHtml(row.date || '—')}　
        <b>巡查員：</b>${escHtml(row.inspector || '—')}　
        <b>優先度：</b>${escHtml(row.priority || '—')}　
        <b>分數：</b>${escHtml(row.deru_score ?? deru.score?.toFixed?.(2) ?? '—')}
      </div>
      <div>
        <div style="font-weight:800;color:#0f172a;margin-bottom:6px">現場備註 / 發現事項</div>
        <div style="white-space:pre-wrap;font-size:13px;line-height:1.75;color:#475569;border:1px solid #e2e8f0;border-radius:8px;padding:10px">${escHtml(row.notes || row.findings || '—')}</div>
      </div>
      ${analysis.findingsSuggestion ? `
        <div style="border:1px solid #bfdbfe;background:#eff6ff;border-radius:8px;padding:12px">
          <div style="font-weight:800;color:#1d4ed8;margin-bottom:6px">AI影像輔助判讀</div>
          <div style="font-size:13px;line-height:1.75;color:#334155">${escHtml(analysis.findingsSuggestion || '')}</div>
          ${analysis.actionSuggestion ? `<div style="font-size:13px;line-height:1.75;color:#334155;margin-top:6px"><b>處理建議：</b>${escHtml(analysis.actionSuggestion)}</div>` : ''}
        </div>` : ''}
      <div>
        <div style="font-weight:800;color:#0f172a;margin-bottom:6px">影像資料</div>
        ${photos.length ? `
          <div style="display:grid;grid-template-columns:1fr;gap:12px">
            ${photos.map((src, index) => `
              <div style="border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;background:#f8fafc">
                <img src="${src}" alt="${escHtml(photoNames[index] || `影像 ${index + 1}`)}" style="width:100%;max-height:520px;object-fit:contain;display:block;background:#fff">
                <div style="font-size:11px;color:#64748b;padding:6px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escHtml(photoNames[index] || `影像 ${index + 1}`)}</div>
              </div>`).join('')}
          </div>` : `<div style="font-size:13px;color:#64748b;border:1px dashed #cbd5e1;border-radius:8px;padding:12px">${photoNames.length ? escHtml(photoNames.join('、')) : '未儲存影像'}</div>`}
      </div>
    </div>
  `;
  document.getElementById('modalFooter').innerHTML = `
    <button class="btn btn-outline" onclick="closeModal()">關閉</button>
    <button class="btn btn-primary" onclick="closeModal(); daEditRecord(${Number(row.id)})"><i class="fas fa-edit"></i> 修改此紀錄</button>
  `;
  openModal();
}

function daViewMetric(label, value, color) {
  return `
    <div style="border:1px solid #e2e8f0;border-top:4px solid ${color};border-radius:8px;padding:10px;background:#fff;text-align:center">
      <div style="font-size:11px;color:#64748b">${label}</div>
      <div style="font-size:18px;font-weight:900;color:${color};margin-top:3px">${escHtml(value)}</div>
    </div>`;
}

// ─── 匯出 CSV ─────────────────────────────────────────────────────────────────
function daExportCSV() {
  const filterEl = document.getElementById('da_filter_facility');
  const filter   = filterEl ? filterEl.value : '';
  const allInsp  = DB.getAll('inspections');
  let   rows     = allInsp.filter(i => i.deru_d !== undefined && i.deru_d !== null);
  if (filter) rows = rows.filter(i => i.facility_name === filter);
  rows = [...rows].sort((a, b) => (b.date || '').localeCompare(a.date || ''));

  const headers = ['設施名稱','日期','D值','E值','R值','加權分數','U等級','優先度','巡查員','備註'];
  const csv = [
    '﻿' + headers.join(','),
    ...rows.map(r => [
      r.facility_name, r.date,
      r.deru_d, r.deru_e, r.deru_r,
      r.deru_score, r.deru_label, r.priority,
      r.inspector, (r.notes || '').replace(/,/g, '，')
    ].map(v => `"${v ?? ''}"`).join(','))
  ].join('\r\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = `DER_U評估_${new Date().toISOString().slice(0,10)}.csv`;
  a.click(); URL.revokeObjectURL(url);
  showToast('CSV 已匯出', 'success');
}

// ─── 工具：HTML 逸出 ──────────────────────────────────────────────────────────
function escHtml(str) {
  return String(str ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
