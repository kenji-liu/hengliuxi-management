// 資料庫層 - 使用 localStorage 儲存
const DB = {
  KEY: 'hengliuxi_db',

  // 預設資料結構
  defaults: {
    facilities: [],
    fish: [],
    habitats: [],
    inspections: [],
    reports: [],  // 107~108年成果報告
    feedback: [],  // Phase 2.2: RAG 答覆反饋
    settings: { lastUpdate: null }
  },

  // 資料版本（每次重大更新設施資料時遞增）
  VERSION: '5.10',  // 附錄三巡查表正規化：一般巡查／專業巡查／魚道巡查分類、來源PDF、日期與照片標註

  _suppressCloudPush: false,

  withoutCloudPush(fn) {
    const prev = this._suppressCloudPush;
    this._suppressCloudPush = true;
    try {
      return fn();
    } finally {
      this._suppressCloudPush = prev;
    }
  },

  _inspectionDedupeKey(item = {}) {
    const no = (item.inspectNo || '').toString().trim();
    const ft = item.formType || item.type || '';
    // 同一設施可能同時有「構造物調查表」與「魚道檢核表」，故 inspectNo 必須搭配 formType。
    if (no) return `NO:${no}|${ft}`;
    return ['F', item.facilityId, item.date, ft, (item.findings || '').trim()].join('|');
  },

  _rocDateLabel(dateStr) {
    const m = String(dateStr || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!m) return '';
    return `${Number(m[1]) - 1911}年${Number(m[2])}月${Number(m[3])}日`;
  },

  _normalizeInspection(item) {
    if (!item || typeof item !== 'object') return item;
    const out = { ...item };
    const formType = out.formType || (out.type === 'general_periodic' ? 'general_periodic' : '');
    const isDeruAssessment = out.type === 'deru_assessment' || out.sourceType === 'DER&U評估';
    const normalizedFormType = formType || (isDeruAssessment ? '' : 'general_periodic');
    if (normalizedFormType) out.formType = normalizedFormType;

    if (out.position) out.position = String(out.position).replace(/横/g, '橫');
    if (out.date && !out.maintenanceStart) out.maintenanceStart = out.date;
    if (out.date && !out.recordDateLabel) out.recordDateLabel = this._rocDateLabel(out.date);
    if (out.date && !out.photoDate) out.photoDate = out.date;
    if (out.date && !out.photoDateLabel) out.photoDateLabel = out.recordDateLabel || this._rocDateLabel(out.date);
    out.dateSort = out.date || out.maintenanceStart || out.createdAt || '';

    const sourcePdf = 'a03附錄三_構造物調查表與魚道檢核表.pdf';
    const sourcePdfPath = '01_工程設施維護與資料/更新資料/a03附錄三_構造物調查表與魚道檢核表.pdf';
    const isAppendixThree = /^80\d{2}$/.test(String(out.id || '')) ||
      String(out.inspectNo || '').includes('橫流溪－114') ||
      (String(out.inspectUnit || '').includes('宜順工程') && String(out.date || '').startsWith('2025-04'));

    if (normalizedFormType === 'professional_fishway') {
      out.inspectionCategory = out.inspectionCategory || 'fishway';
      out.inspectionClassLabel = out.inspectionClassLabel || '魚道巡查資料';
      out.inspectionItem = out.inspectionItem || '魚道檢核表';
      out.inspectionSubcategory = out.inspectionSubcategory || '魚道巡查資料';
      out.sourceType = out.sourceType || '專業巡查-魚道檢核表';
    } else if (normalizedFormType === 'professional_structure') {
      out.inspectionCategory = out.inspectionCategory || 'professional';
      out.inspectionClassLabel = out.inspectionClassLabel || '專業巡查';
      out.inspectionItem = out.inspectionItem || '構造物調查表';
      out.inspectionSubcategory = out.inspectionSubcategory || '專業巡查紀錄';
      out.sourceType = out.sourceType || '專業巡查-構造物調查表';
    } else if (normalizedFormType === 'general_periodic') {
      out.inspectionCategory = out.inspectionCategory || 'general';
      out.inspectionClassLabel = out.inspectionClassLabel || '一般巡查';
      out.inspectionItem = out.inspectionItem || '一般巡查紀錄';
      out.inspectionSubcategory = out.inspectionSubcategory || '一般巡查紀錄';
      out.sourceType = out.sourceType || '一般巡查表單';
    } else {
      out.inspectionCategory = out.inspectionCategory || 'assessment';
      out.inspectionClassLabel = out.inspectionClassLabel || 'DER&U評估';
      out.inspectionItem = out.inspectionItem || 'DER&U評估紀錄';
      out.inspectionSubcategory = out.inspectionSubcategory || '狀態評估紀錄';
    }

    if (isAppendixThree) {
      out.sourcePdf = out.sourcePdf || sourcePdf;
      out.sourcePdfPath = out.sourcePdfPath || sourcePdfPath;
      out.pdfFormat = out.pdfFormat || 'PDF';
      out.pdfTemplate = out.pdfTemplate || out.inspectionItem;
      out.sourceFormBatch = out.sourceFormBatch || '114年附錄三';
      out.photoGroup = out.photoGroup || '114年附錄三專業巡查照片';
      out.photoYear = out.photoYear || '114';
      out.importedFrom = out.importedFrom || '附錄三掃描PDF與巡查照片整理';
    }

    if (Array.isArray(out.photos)) {
      out.photos = Array.from(new Set(out.photos));
      out.photoCount = out.photos.length;
    } else {
      out.photos = [];
      out.photoCount = 0;
    }
    return out;
  },

  _normalizeInspections(list) {
    if (!Array.isArray(list)) return [];
    return list
      .map(item => this._normalizeInspection(item))
      .sort((a, b) => {
        const d = String(a?.dateSort || a?.date || '').localeCompare(String(b?.dateSort || b?.date || ''));
        if (d !== 0) return d;
        const fa = Number(a?.facilityId || 0);
        const fb = Number(b?.facilityId || 0);
        if (fa !== fb) return fa - fb;
        return Number(a?.id || 0) - Number(b?.id || 0);
      });
  },

  // 巡查紀錄去重：多次雲端同步／腳本重跑會產生「同內容、不同 id」的重複表單。
  // 去重鍵：inspectNo + formType；無 inspectNo 時用 facilityId|date|formType|findings。
  // 保留第一筆並把後續重複筆的照片合併進來，避免遺失影像。
  _dedupeInspections(list) {
    if (!Array.isArray(list)) return { list: list || [], removed: 0 };
    const seen = new Map();
    const out = [];
    let removed = 0;
    list.forEach(item => {
      if (!item || typeof item !== 'object') { out.push(item); return; }
      const key = this._inspectionDedupeKey(item);
      if (seen.has(key)) {
        removed++;
        const kept = seen.get(key);
        // 合併照片（保留現有，補入重複筆獨有的）
        const a = Array.isArray(kept.photos) ? kept.photos : [];
        const b = Array.isArray(item.photos) ? item.photos : [];
        if (b.length) kept.photos = Array.from(new Set([...a, ...b]));
        return;
      }
      seen.set(key, item);
      out.push(item);
    });
    return { list: out, removed };
  },

  // 讀取所有資料
  load() {
    try {
      const raw = localStorage.getItem(this.KEY);
      if (!raw) {
        console.log('[DB] No data found, initializing...');
        return this.init();
      }
      const data = JSON.parse(raw);

      // ── 安全版本遷移（不再清除用戶資料）──────────────────────────
      // 以前的「清除重新初始化」會把用戶填寫的巡查記錄全部刪除。
      // 新策略：版本不符時 MERGE 預設值，保留用戶既有的 inspections。
      if (!data.settings?.version || data.settings.version !== this.VERSION) {
        const oldVer = data.settings?.version || '(無)';
        console.warn(`[DB] 版本遷移 ${oldVer} → ${this.VERSION}，保留用戶資料`);

        // 安全遷移：先用 init() 取得最新預設值，再疊回用戶資料
        // 暫存用戶的巡查/魚類/棲地記錄
        const userInspections = Array.isArray(data.inspections) ? data.inspections : [];
        const userFish        = Array.isArray(data.fish)        ? data.fish        : [];
        const userHabitats    = Array.isArray(data.habitats)    ? data.habitats    : [];
        const userReports     = Array.isArray(data.reports)     ? data.reports     : [];
        const userSyncTs      = data.settings?.syncTimestamp    || 0;

        // 以預設值重建（此時會寫入 localStorage，但馬上會被 merged 覆蓋）
        const defaults = this.init();

        // 設施遷移：保留用戶已修改的欄位（derLevel / assessmentDate / updatedAt）
        const mergedFacilities = defaults.facilities.map(defFac => {
          const userFac = (data.facilities || []).find(f => f.id === defFac.id);
          if (!userFac) return defFac;
          const userNewer = userFac.updatedAt ||
            (userFac.assessmentDate && userFac.assessmentDate > (defFac.assessmentDate || ''));
          return userNewer ? { ...defFac, ...userFac } : { ...defFac };
        });

        const merged = {
          ...defaults,
          facilities:  mergedFacilities,
          // 用戶記錄優先（不清除用戶填寫的巡查資料）
          // 合併 seed 巡查（依 inspectNo 去重）：保留用戶資料，並補入新 seed 的官方巡查
          inspections: (() => {
            if (!userInspections.length) return defaults.inspections;
            const seen = new Set(userInspections.map(r => this._inspectionDedupeKey(r)).filter(Boolean));
            const add = defaults.inspections.filter(r => {
              const key = this._inspectionDedupeKey(r);
              return key && !seen.has(key);
            });
            return add.length ? [...userInspections, ...add] : userInspections;
          })(),
          fish:        userFish.length        ? userFish        : defaults.fish,
          habitats:    userHabitats.length    ? userHabitats    : defaults.habitats,
          reports:     userReports.length     ? userReports     : defaults.reports,
          settings: {
            ...defaults.settings,
            version:       this.VERSION,
            lastUpdate:    new Date().toISOString(),
            syncTimestamp: userSyncTs || 0,
            initializedFromSeed: !userSyncTs,
            cloudSyncKnown: !!data.settings?.cloudSyncKnown
          }
        };

        // 去重（遷移後一併清掉重複表單）
        const ddm = this._dedupeInspections(merged.inspections);
        merged.inspections = this._normalizeInspections(ddm.list);
        localStorage.setItem(this.KEY, JSON.stringify(merged));
        console.log(`[DB] ✅ 版本遷移完成，保留 ${merged.inspections.length} 筆巡查記錄${ddm.removed ? `（去重移除 ${ddm.removed} 筆）` : ''}`);
        return merged;
      }

      // 去重既有巡查紀錄（清掉舊版同步累積的重複表單）
      const dd = this._dedupeInspections(data.inspections);
      if (dd.removed > 0) {
        data.inspections = this._normalizeInspections(dd.list);
        localStorage.setItem(this.KEY, JSON.stringify(data));
        console.warn(`[DB] 巡查去重：移除 ${dd.removed} 筆重複表單`);
      } else if (Array.isArray(data.inspections) && data.inspections.some(i => !i.inspectionCategory || !i.recordDateLabel || !i.dateSort)) {
        data.inspections = this._normalizeInspections(data.inspections);
        localStorage.setItem(this.KEY, JSON.stringify(data));
      }
      console.log('[DB] ✓ Loaded existing data (VERSION:', data.settings.version + ')');
      return data;
    } catch (e) {
      console.error('[DB] Load error:', e);
      // 僅在資料完全損毀（JSON 解析失敗）時才重新初始化
      localStorage.removeItem(this.KEY);
      return this.init();
    }
  },

  // 初始化資料庫（含範例資料）
  init() {
    const data = {
      facilities: [
        /* ── 依維護管理手冊+107-108成果報告，由下游(0K)往上游(1K)排列 ──
           TWD97座標來源：橫流溪重要設施維護管理手冊表1-1
           WGS84轉換：EPSG:3826→EPSG:4326 官方標準轉換
           手冊照片路徑：/webapp/assets/report-photos/manual-p[頁碼]-[序號].jpg ── */

        { id: 1, name: '溪構8-2 之字形魚道', type: '魚道', subType: '之字形', code: '8-2', stationKm: '0K+460', location: '溪構8-2', twd97x: 240716, twd97y: 2674967, lat: 24.180055, lng: 120.908622, km_num: 460,
          year: 107, status: '正常', material: '混凝土', length: 18, width: 1.5, condition: 4, lastInspect: '2025-03-15', source: '107-108成果報告 / 維護管理手冊表5-1',
          derLevel: 'B1-I', assessmentDate: '2025-03-15', riskScore: 25, maintenanceStrategy: '預防式', retirementEligible: false, evaluationNotes: '結構完整，功能正常，建議定期檢查水流狀況',
          river_segment: '橫流溪下游', anomaly_type: null, anomaly_level: '正常', maintenance_priority: '低',
          judgement_basis: '結構完整無損傷，水流通暢，魚類通行良好，健康指數94分，維持定期巡查頻率（每季一次）',
          note: '之字形魚道（溪構8-2），0K+460最下游魚道；水深0.1~0.6m，流速≤1.0m/s；為0K+460~1K+400間最下游魚道，棲地連通性關鍵節點',
          photos: ['/webapp/assets/report-photos/manual-p39-01-664x374.jpg', '/02_魚類與棲地資料庫/解說牌/之字形魚道_0.png', '/02_魚類與棲地資料庫/工作站魚類調查/7227C4C7-FC88-4E45-B15E-1ACD5CADB424.jpg'] },

        { id: 2, name: '溪構8-1 防砂壩', type: '防砂壩', subType: '防砂壩', code: '8-1', stationKm: '0K+460', location: '溪構8-1', twd97x: 240716, twd97y: 2674967, lat: 24.180055, lng: 120.908622, km_num: 460,
          year: 107, status: '正常', material: '混凝土', width: 16, condition: 4, lastInspect: '2025-03-15', source: '107-108成果報告 / 維護管理手冊表5-1',
          derLevel: 'B1-I', assessmentDate: '2025-03-15', riskScore: 20, maintenanceStrategy: '預防式', retirementEligible: false, evaluationNotes: '防砂壩與魚道併設功能互補，結構穩定',
          river_segment: '橫流溪下游', anomaly_type: null, anomaly_level: '正常', maintenance_priority: '低',
          judgement_basis: '上游回淤正常，壩體結構完整，攔砂功能完善，健康指數96分，定期巡查即可',
          note: '防砂壩（溪構8-1），與之字形魚道（溪構8-2）併設於0K+460；上游回淤正常，結構完整；維管手冊p.5-2列管',
          photos: ['/webapp/assets/report-photos/manual-p38-08-665x374.jpg', '/02_魚類與棲地資料庫/工作站魚類調查/0400EB5E-E751-4F58-8FF5-A857D03DBFCE.jpg'] },

        { id: 3, name: '溪構11 階梯式固床工', type: '固床工', subType: '階梯式', code: '11', stationKm: '0K+510', location: '溪構11', twd97x: 240716, twd97y: 2675013, lat: 24.180471, lng: 120.908621, km_num: 510,
          year: 107, status: '需維護', material: '混凝土/塊石', width: 14, condition: 2, lastInspect: '2025-01-10', source: '107-108成果報告 / 維護管理手冊表5-1',
          derLevel: 'C4-C5', assessmentDate: '2025-01-10', riskScore: 72, maintenanceStrategy: '反應式', retirementEligible: false, evaluationNotes: '左岸翼牆細裂縫伴隨鋼筋鏽蝕，需立即進行防蝕與翼牆修補；屬優先維護項目',
          river_segment: '橫流溪中下游', anomaly_type: '裂縫|破損|鋼筋鏽蝕', anomaly_level: '高', maintenance_priority: '高',
          judgement_basis: '翼牆細裂縫15cm伴隨鋼筋鏽蝕，健康指數34分，結構完整性受損，需本年度優先進行防蝕處理與翼牆修補',
          note: '階梯式固床工（溪構11），左岸翼牆出現細裂縫約15cm，鋼筋有鏽蝕現象；建議本年度優先處理防蝕及翼牆修補作業',
          photos: ['/webapp/assets/report-photos/manual-p39-04-665x374.jpg', '/03_其他資料/115年橫流溪造林照片/0.67公頃肖楠現況/DSCN4787.JPG'] },

        { id: 4, name: '溪構7 降壩魚道', type: '魚道', subType: '降壩', code: '7', stationKm: '0K+560', location: '溪構7', twd97x: 240704, twd97y: 2675063, lat: 24.180922, lng: 120.908503, km_num: 560,
          year: 108, status: '正常', material: '混凝土', length: 16.2, width: 1.5, condition: 4, lastInspect: '2025-03-15', source: '107-108成果報告 / 維護管理手冊表5-1',
          derLevel: 'B1-I', assessmentDate: '2025-03-15', riskScore: 28, maintenanceStrategy: '預防式', retirementEligible: false, evaluationNotes: '水躍消能設計合理，水深流速符合通行標準，建議定期巡查',
          river_segment: '橫流溪中下游', anomaly_type: null, anomaly_level: '正常', maintenance_priority: '低',
          judgement_basis: '水躍消能設計完善，水深流速符合規範，魚類通行效果良好，健康指數91分，定期巡查即可',
          note: '降壩型魚道（溪構7），利用壩體落差設計水躍消能；上段9.5m坡度1/8，下段4.5m；水深0.1~0.6m，流速符合標準（6.225%~2.121%）',
          photos: ['/webapp/assets/report-photos/manual-p38-07-665x374.jpg', '/02_魚類與棲地資料庫/工作站魚類調查/81FE8306-7082-4854-9F84-92FF54A4C9DF.jpg'] },

        { id: 5, name: '溪構6 階段式魚道', type: '魚道', subType: '階段式', code: '6', stationKm: '0K+740', location: '溪構6', twd97x: 240785, twd97y: 2675146, lat: 24.181672, lng: 120.909300, km_num: 740,
          year: 106, status: '正常', material: '混凝土/塊石', length: 20, width: 2.0, condition: 4, lastInspect: '2025-03-15', source: '107-108成果報告 / 維護管理手冊表5-1',
          derLevel: 'B1-I', assessmentDate: '2025-03-15', riskScore: 22, maintenanceStrategy: '預防式', retirementEligible: false, evaluationNotes: '多級水池消能設計完善，通行率佳，建議監測魚類通過狀況',
          river_segment: '橫流溪中游', anomaly_type: null, anomaly_level: '正常', maintenance_priority: '低',
          judgement_basis: '多級水池消能設計完善，流速符合標準，魚類通行效果優良，健康指數92分，定期監測即可',
          note: '階段式魚道（溪構6），0K+740節點；多級水池消能設計；108年水質監測顯示流速1.9m/s，記錄纓口臺鰍、明潭吻鰕虎通過',
          photos: ['/webapp/assets/report-photos/manual-p38-06-665x374.jpg', '/02_魚類與棲地資料庫/解說牌/階段式魚道_0.png'] },

        { id: 6, name: '溪構5-1 防砂壩', type: '防砂壩', subType: '防砂壩', code: '5-1', stationKm: '1K+000', location: '溪構5-1', twd97x: 240812, twd97y: 2675353, lat: 24.183541, lng: 120.909564, km_num: 1000,
          year: 109, status: '正常', material: '混凝土', width: 15, condition: 5, lastInspect: '2025-03-15', source: '107-108成果報告 / 維護管理手冊表5-1',
          derLevel: 'A1', assessmentDate: '2025-03-15', riskScore: 8, maintenanceStrategy: '定期式', retirementEligible: false, evaluationNotes: '結構優良，洪水模擬評估無顯著床面變化，定期巡查即可',
          river_segment: '橫流溪中游', anomaly_type: null, anomaly_level: '正常', maintenance_priority: '低',
          judgement_basis: '結構優良無損傷，洪水模擬床面高程穩定，健康指數97分，維持定期巡查即可',
          note: '防砂壩（溪構5-1），1K+000節點；與潛越式魚道（溪構5-2）並設；50年洪水模擬床面高程變化 0.01~0.03m，結構完整',
          photos: ['/webapp/assets/report-photos/manual-p38-04-665x374.jpg', '/02_魚類與棲地資料庫/工作站魚類調查/7D9946A5-D2E6-4F60-8668-3AE056A2931D.jpg'] },

        { id: 7, name: '溪構5-2 潛越式魚道', type: '魚道', subType: '潛越式', code: '5-2', stationKm: '1K+000', location: '溪構5-2', twd97x: 240812, twd97y: 2675353, lat: 24.183541, lng: 120.909564, km_num: 1000,
          year: 105, status: '損壞', material: '混凝土', length: 18, width: 1.0, condition: 1, lastInspect: '2025-01-10', source: '107-108成果報告 / 維護管理手冊表5-1',
          derLevel: 'A1', assessmentDate: '2025-01-10', riskScore: 95, maintenanceStrategy: '升級式', retirementEligible: true, evaluationNotes: '颱風後入口完全堵塞，喪失魚道通行功能；棲地連通性嚴重受損，需評估升級改造或更新',
          river_segment: '橫流溪中游', anomaly_type: '魚道阻塞|淘空|淤積', anomaly_level: '高', maintenance_priority: '緊急',
          judgement_basis: '颱風入口完全堵塞，喪失通行功能，棲地連通性嚴重受損，健康指數15分，需緊急清除堵塞並評估結構安全，優先進行升級改造',
          note: '潛越式魚道（溪構5-2），颱風後入口遭土石堵塞完全阻塞，喪失通行功能；需緊急清除土石並評估結構安全；為棲地連通性優先修復項目',
          photos: ['/webapp/assets/report-photos/manual-p38-05-665x498.jpg', '/02_魚類與棲地資料庫/解說牌/潛越式魚道_0.png'] },

        { id: 8, name: '溪構10 固床工', type: '固床工', subType: '隔梳式', code: '10', stationKm: '1K+040', location: '溪構10', twd97x: 240802, twd97y: 2675390, lat: 24.183875, lng: 120.909465, km_num: 1040,
          year: 108, status: '正常', material: '混凝土/塊石', width: 12, condition: 4, lastInspect: '2025-02-20', source: '107-108成果報告 / 維護管理手冊表5-1',
          derLevel: 'B1-I', assessmentDate: '2025-02-20', riskScore: 24, maintenanceStrategy: '預防式', retirementEligible: false, evaluationNotes: '床面穩定，上游回淤正常，結構完整，建議監測淤積變化',
          river_segment: '橫流溪中游', anomaly_type: null, anomaly_level: '正常', maintenance_priority: '低',
          judgement_basis: '床面穩定，上游回淤正常，結構完整，健康指數93分，建議監測淤積變化',
          note: '固床工（溪構10），位於溪構5上游約40m；穩定床面高程；結構完整，上游回淤量正常',
          photos: ['/webapp/assets/report-photos/manual-p39-03-665x374.jpg', '/03_其他資料/115年橫流溪造林照片/0.21公頃楓香現況/DSCN4776.JPG'] },

        { id: 9, name: '溪構4 階段式魚道', type: '魚道', subType: '階段式', code: '4', stationKm: '1K+170', location: '溪構4', twd97x: 240832, twd97y: 2675493, lat: 24.184805, lng: 120.909760, km_num: 1170,
          year: 108, status: '需維護', material: '混凝土/塊石', length: 42, width: 1.8, condition: 3, lastInspect: '2025-02-20', source: '107-108成果報告 / 維護管理手冊表5-1',
          derLevel: 'A1', assessmentDate: '2025-02-20', riskScore: 68, maintenanceStrategy: '反應式', retirementEligible: false, evaluationNotes: '池壁裂縫與基礎侵蝕為主要劣化因素，需優先進行基礎補強與混凝土修復',
          river_segment: '橫流溪上游', anomaly_type: '裂縫|侵蝕|破損', anomaly_level: '高', maintenance_priority: '高',
          judgement_basis: '池壁出現裂縫，基礎受洪水侵蝕，混凝土局部裸露，健康指數38分，需優先進行基礎補強與混凝土修復工程',
          note: '階段式魚道（溪構4），1K+170節點；各水池高差0.15~0.3m；部分池壁有裂縫，基礎受侵蝕，混凝土局部裸露；流速3.2m/s（107年）；建議優先維護',
          photos: ['/webapp/assets/report-photos/manual-p38-03-665x498.jpg', '/02_魚類與棲地資料庫/解說牌/階段式魚道_0.png'] },

        { id: 10, name: '溪構3 斜坡式魚道', type: '魚道', subType: '斜坡式', code: '3', stationKm: '1K+225', location: '溪構3', twd97x: 240873, twd97y: 2675532, lat: 24.185158, lng: 120.910163, km_num: 1225,
          year: 108, status: '正常', material: '混凝土/塊石', length: 35, width: 1.2, condition: 4, lastInspect: '2025-03-15', source: '107-108成果報告 / 維護管理手冊表5-1',
          derLevel: 'A1', assessmentDate: '2025-03-15', riskScore: 26, maintenanceStrategy: '預防式', retirementEligible: false, evaluationNotes: '坡面設計合理，通行效果良好，纓口臺鰍及臺灣白甲魚可順利通過',
          river_segment: '橫流溪上游', anomaly_type: null, anomaly_level: '正常', maintenance_priority: '低',
          judgement_basis: '坡面設計合理，通行效果良好，多種保育魚類通行成功率高，健康指數90分，定期巡查即可',
          note: '斜坡式魚道（溪構3），1K+225節點；坡面落差5.105%~1.808%坡降；流速3.1m/s；改善後纓口臺鰍及臺灣白甲魚可通行；維護管理手冊p.5-2',
          photos: ['/webapp/assets/report-photos/manual-p38-02-693x520.jpg', '/02_魚類與棲地資料庫/解說牌/階段式魚道_0.png'] },

        { id: 11, name: '溪構9 固床工', type: '固床工', subType: '隔梳式', code: '9', stationKm: '1K+265', location: '溪構9', twd97x: 240858, twd97y: 2675575, lat: 24.185546, lng: 120.910015, km_num: 1265,
          year: 109, status: '正常', material: '混凝土', width: 12, condition: 4, lastInspect: '2025-02-20', source: '107-108成果報告 / 維護管理手冊表5-1',
          derLevel: 'B1-I', assessmentDate: '2025-02-20', riskScore: 18, maintenanceStrategy: '定期式', retirementEligible: false, evaluationNotes: '結構完整無侵蝕跡象，河床穩定，定期巡查即可',
          river_segment: '橫流溪上游', anomaly_type: null, anomaly_level: '正常', maintenance_priority: '低',
          judgement_basis: '結構完整無侵蝕跡象，河床穩定，坡腳翼牆無破損，健康指數94分，定期巡查即可',
          note: '固床工（溪構9），1K+265；穩定河床；結構完整，坡腳及翼牆無明顯侵蝕',
          photos: ['/webapp/assets/report-photos/manual-p39-02-664x374.jpg', '/03_其他資料/115年橫流溪造林照片/0.21公頃楓香現況/DSCN4775.JPG'] },

        { id: 12, name: '溪構2 階段式魚道', type: '魚道', subType: '階段式', code: '2', stationKm: '1K+315', location: '溪構2', twd97x: 240819, twd97y: 2675607, lat: 24.185835, lng: 120.909631, km_num: 1315,
          year: 108, status: '正常', material: '混凝土', length: 28, width: 1.5, condition: 5, lastInspect: '2025-03-15', source: '107-108成果報告 / 維護管理手冊表5-1',
          derLevel: 'A1', assessmentDate: '2025-03-15', riskScore: 5, maintenanceStrategy: '定期式', retirementEligible: false, evaluationNotes: '通行率優良，水池參數符合標準，棲地面積增加，定期巡查即可',
          river_segment: '橫流溪上游', anomaly_type: null, anomaly_level: '正常', maintenance_priority: '低',
          judgement_basis: '通行率優良，水池水深流速符合標準，多樣保育魚類記錄，棲地品質優秀，健康指數98分，維持定期巡查',
          note: '階段式魚道（溪構2），通行率佳；坡降4.787%~2.64%；各水池水深0.3~0.6m，流速0.4~0.8m/s；2.4m/s坡降改善後棲地面積增加',
          photos: ['/webapp/assets/report-photos/manual-p38-01-664x374.jpg', '/02_魚類與棲地資料庫/解說牌/階段式魚道_0.png'] },

        { id: 13, name: '溪構1-1 粗石斜曲面式魚道', type: '魚道', subType: '粗石斜曲', code: '1-1', stationKm: '1K+400', location: '溪構1-1', twd97x: 240786, twd97y: 2675695, lat: 24.186629, lng: 120.909306, km_num: 1400,
          year: 107, status: '正常', material: '混凝土/塊石', length: 28, width: 2.0, condition: 5, lastInspect: '2025-03-15', source: '107-108成果報告 / 維護管理手冊表5-1',
          derLevel: 'A1', assessmentDate: '2025-03-15', riskScore: 12, maintenanceStrategy: '定期式', retirementEligible: false, evaluationNotes: '粗石多樣流速設計優良，臺灣白甲魚及纓口臺鰍通過率高，為生態示範點',
          river_segment: '橫流溪上游', anomaly_type: null, anomaly_level: '正常', maintenance_priority: '低',
          judgement_basis: '粗石多樣流速設計優良，不同游泳能力魚類均可通行，健康指數96分，為生態示範點，定期巡查維持即可',
          note: '粗石斜曲面式魚道（溪構1-1），1K+400最上游；利用粗石創造多樣流速帶，提供不同游泳能力魚類通行；流速4.6m/s（107年）；臺灣白甲魚、纓口臺鰍均有記錄',
          photos: ['/webapp/assets/report-photos/manual-p37-04-664x374.jpg', '/02_魚類與棲地資料庫/解說牌/粗石斜曲面式魚道_0.png'] },

        { id: 14, name: '溪構1-2 改良型舟通式魚道', type: '魚道', subType: '舟通式', code: '1-2', stationKm: '1K+400', location: '溪構1-2', twd97x: 240773, twd97y: 2675689, lat: 24.186575, lng: 120.909178, km_num: 1400,
          year: 107, status: '正常', material: '混凝土', length: 24, width: 1.8, condition: 4, lastInspect: '2025-03-15', source: '107-108成果報告 / 維護管理手冊表5-1',
          derLevel: 'A1', assessmentDate: '2025-03-15', riskScore: 30, maintenanceStrategy: '預防式', retirementEligible: false, evaluationNotes: '與粗石魚道併設功能互補，通行率佳，建議監測磨耗狀況',
          river_segment: '橫流溪上游', anomaly_type: null, anomaly_level: '正常', maintenance_priority: '低',
          judgement_basis: '與粗石魚道併設功能互補，通行率佳，保育魚類成功通行記錄，健康指數91分，建議監測結構磨耗狀況',
          note: '改良型舟通式魚道（溪構1-2），與粗石斜曲面式（溪構1-1）併設；流速3.8m/s（107年）；已記錄臺灣白甲魚、纓口臺鰍成功通行',
          photos: ['/webapp/assets/report-photos/manual-p37-05-664x374.jpg', '/02_魚類與棲地資料庫/解說牌/改良型舟通式魚道_0.png'] },

        { id: 15, name: '護岸', type: '護岸', subType: '混凝土/塊石護岸', code: 'RA', stationKm: '0K+400~1K+400', location: '橫流溪 0K+400~1K+400', twd97x: null, twd97y: null, lat: 24.183500, lng: 120.909200, km_num: 400,
          year: 107, status: '正常', material: '混凝土/塊石', length: 1000, width: null, condition: 4, lastInspect: '2025-03-15', source: '維護管理計畫 表4-1',
          derLevel: 'B1-I', assessmentDate: '2025-03-15', riskScore: 22, maintenanceStrategy: '預防式', retirementEligible: false, evaluationNotes: '混凝土/塊石護岸整體結構完整，局部岩塊位移需注意，定期巡查並防止洪水沖刷侵蝕',
          river_segment: '橫流溪全段', anomaly_type: null, anomaly_level: '正常', maintenance_priority: '低',
          sourceTableNo: '維護管理表', facilityNo: '-', tableLocation: '橫流溪 0K+400~1K+400',
          judgement_basis: '依維護管理表，護岸範圍為橫流溪0K+400~1K+400，使用材質為混凝土/塊石，TWD97座標未列點位，採線性設施管理。',
          note: '護岸（0K+400~1K+400），混凝土/塊石材質，保護溪岸免受洪水侵蝕；全段定期巡查，注意岩塊移位及坡腳侵蝕',
          photos: ['/webapp/assets/report-photos/hugan-revetment-2026.jpg'] },

        { id: 16, name: '步道', type: '步道', subType: '溪濱步道', code: 'T1', stationKm: '0K+000~1K+290', location: '步道 0K+000~1K+290', twd97x: null, twd97y: null, lat: 24.183807, lng: 120.909745, km_num: 0,
          year: 108, status: '需維護', material: 'PC路面/碎石路面', length: 1290, width: 1.5, condition: 3, lastInspect: '2025-03-15', source: '維護管理計畫 表4-1',
          derLevel: 'C3', assessmentDate: '2025-03-15', riskScore: 38, maintenanceStrategy: '反應式', retirementEligible: false, evaluationNotes: 'PC路面段整體良好；碎石路面段局部有沉陷及碎石流失，雨季後積水，建議安排補充碎石及路面修補',
          river_segment: '橫流溪全段', anomaly_type: '沉陷|破損', anomaly_level: '中', maintenance_priority: '中',
          sourceTableNo: '維護管理表', facilityNo: '-', tableLocation: '步道 0K+000~1K+290',
          judgement_basis: '依維護管理表，步道範圍為0K+000~1K+290，使用材質為PC路面/碎石路面，TWD97座標未列點位，採線性設施管理。',
          note: '步道（0K+000~1K+290），PC路面及碎石路面混合，全長約1290m；連接全區工程設施供維護人員及生態調查使用；碎石段局部破損需修補',
          photos: ['/webapp/assets/report-photos/manual-p39-06-665x498.jpg'] },

        { id: 17, name: '平臺1', type: '平台', subType: '維護平台', code: 'P1', stationKm: '步道1K+290', location: '平臺1', twd97x: 240789, twd97y: 2675725, lat: 24.186900, lng: 120.909335, km_num: 1290,
          year: null, status: '正常', material: '木材/鋼材', condition: 4, lastInspect: null, source: '維護管理計畫 表4-1',
          derLevel: 'B1-I', assessmentDate: null, riskScore: 18, maintenanceStrategy: '定期巡查', retirementEligible: false, evaluationNotes: '木材/鋼材構造平台，供維護人員及生態觀察使用，定期檢查木材腐朽及鋼材鏽蝕情形。',
          river_segment: '橫流溪上游', anomaly_type: null, anomaly_level: '正常', maintenance_priority: '低',
          sourceTableNo: '平臺1', facilityNo: '平臺1', tableLocation: '步道1K+290',
          judgement_basis: '依維護管理表，平臺1位於步道1K+290，TWD97座標(240789,2675725)，材質為木材/鋼材，定期巡查即可。',
          note: '平臺1，步道1K+290，木材/鋼材構造；作為溪構1-1、1-2上游側維護巡查與現地觀察輔助設施。',
          photos: ['/webapp/assets/report-photos/manual-p39-07-665x498.jpg'] },

        { id: 18, name: '平臺2', type: '平台', subType: '維護平台', code: 'P2', stationKm: '步道1K+280', location: '平臺2', twd97x: 240796, twd97y: 2675716, lat: 24.186819, lng: 120.909404, km_num: 1280,
          year: null, status: '正常', material: '木材/鋼材', condition: 4, lastInspect: null, source: '維護管理計畫 表4-1',
          derLevel: 'B1-I', assessmentDate: null, riskScore: 18, maintenanceStrategy: '定期巡查', retirementEligible: false, evaluationNotes: '木材/鋼材構造平台，供維護人員及生態觀察使用，定期檢查木材腐朽及鋼材鏽蝕情形。',
          river_segment: '橫流溪上游', anomaly_type: null, anomaly_level: '正常', maintenance_priority: '低',
          sourceTableNo: '平臺2', facilityNo: '平臺2', tableLocation: '步道1K+280',
          judgement_basis: '依維護管理表，平臺2位於步道1K+280，TWD97座標(240796,2675716)，材質為木材/鋼材，定期巡查即可。',
          note: '平臺2，步道1K+280，木材/鋼材構造；支援工程設施巡查與現地管理。',
          photos: ['/webapp/assets/report-photos/manual-p39-07-665x498.jpg'] },

        { id: 19, name: '平臺3', type: '平台', subType: '維護平台', code: 'P3', stationKm: '步道1K+225', location: '平臺3', twd97x: 240807, twd97y: 2675658, lat: 24.186295, lng: 120.909513, km_num: 1225,
          year: null, status: '正常', material: '木材/鋼材', condition: 4, lastInspect: null, source: '維護管理計畫 表4-1',
          derLevel: 'B1-I', assessmentDate: null, riskScore: 18, maintenanceStrategy: '定期巡查', retirementEligible: false, evaluationNotes: '木材/鋼材構造平台，供維護人員及生態觀察使用，定期檢查木材腐朽及鋼材鏽蝕情形。',
          river_segment: '橫流溪上游', anomaly_type: null, anomaly_level: '正常', maintenance_priority: '低',
          sourceTableNo: '平臺3', facilityNo: '平臺3', tableLocation: '步道1K+225',
          judgement_basis: '依維護管理表，平臺3位於步道1K+225，TWD97座標(240807,2675658)，材質為木材/鋼材，定期巡查即可。',
          note: '平臺3，步道1K+225，木材/鋼材構造；位於上游魚道群附近，納入公共設施管理圖層。',
          photos: ['/webapp/assets/report-photos/manual-p39-08-665x498.jpg'] },

        { id: 20, name: '平臺4', type: '平台', subType: '維護平台', code: 'P4', stationKm: '步道1K+170', location: '平臺4', twd97x: 240819, twd97y: 2675607, lat: 24.185835, lng: 120.909631, km_num: 1170,
          year: null, status: '正常', material: '木材/鋼材', condition: 4, lastInspect: null, source: '維護管理計畫 表4-1',
          derLevel: 'B1-I', assessmentDate: null, riskScore: 18, maintenanceStrategy: '定期巡查', retirementEligible: false, evaluationNotes: '木材/鋼材構造平台，供維護人員及生態觀察使用，定期檢查木材腐朽及鋼材鏽蝕情形。',
          river_segment: '橫流溪上游', anomaly_type: null, anomaly_level: '正常', maintenance_priority: '低',
          sourceTableNo: '平臺4', facilityNo: '平臺4', tableLocation: '步道1K+170',
          judgement_basis: '依維護管理表，平臺4位於步道1K+170，TWD97座標(240819,2675607)，材質為木材/鋼材，定期巡查即可。',
          note: '平臺4，步道1K+170，木材/鋼材構造；與溪構4（1K+170）鄰近，納入工程設施圖層與巡查管理。',
          photos: ['/webapp/assets/report-photos/manual-p39-08-665x498.jpg'] }
      ],
      fish: [
        /* ── 107-108年成果報告電魚調查資料（民國107年5月29日） ─────────────
           橫流溪共9種魚類（依報告書封溪護魚公告及102~108年調查）：
           臺灣白甲魚358尾、粗首馬口鱲191尾、臺灣鬚鱲141尾（102~108年累計）
           107年4站合計：133尾（密度最高年份）── */
        { id: 1, species: '臺灣白甲魚', scientificName: 'Onychostoma barbatulum', family: '鯉科', conservation: '近危', location: '橫流溪全流域（以上游1K+170~1K+400優勢）', count: 73, date: '2018-05-29', method: '電魚', recorder: '107-108成果報告', note: '107年調查73尾；102~108年累計358尾，為數量最多保育魚種；偏好礫石底質急流，對魚道通行率敏感；報告書封溪護魚保護物種' },
        { id: 2, species: '粗首馬口鱲', scientificName: 'Zacco pachycephalus', family: '鯉科', conservation: '一般', location: '橫流溪中游（0K+460~1K+000）', count: 32, date: '2018-05-29', method: '電魚', recorder: '107-108成果報告', note: '107年調查32尾；102~108年累計191尾，族群穩定；中游礫石淺灘為主要棲息地；報告書封溪護魚保護物種' },
        { id: 3, species: '臺灣鬚鱲', scientificName: 'Candidia barbata', family: '鯉科', conservation: '一般', location: '橫流溪中游', count: 36, date: '2018-05-29', method: '電魚', recorder: '107-108成果報告', note: '107年調查36尾；102~108年累計141尾；偏好中流速礫石底質環境；報告書封溪護魚保護物種' },
        { id: 4, species: '臺灣石魚賓', scientificName: 'Acrossocheilus paradoxus', family: '鯉科', conservation: '一般', location: '橫流溪全流域（1K+225附近深潭及全段）', count: 30, date: '2018-05-29', method: '電魚', recorder: '107-108成果報告', note: '107年調查30尾；102~108年累計191尾；特有種，偏好底部緩流及礫石縫隙；報告書封溪護魚保護物種；與臺灣白甲魚為主要WUA分析物種' },
        { id: 5, species: '纓口臺鰍', scientificName: 'Formosania lacustre', family: '爬鰍科', conservation: '近危', location: '橫流溪上游至中游礫石急流', count: 28, date: '2018-05-29', method: '電魚', recorder: '107-108成果報告', note: '107年調查；特有種；底棲吸附型，偏好礫石急流底面；為AI影像辨識訓練物種之一；109~114年調查累計157尾' },
        { id: 6, species: '明潭吻鰕虎', scientificName: 'Rhinogobius candidianus', family: '鰕虎科', conservation: '一般', location: '橫流溪中下游（St.1~St.6，St.1分布最多84尾）', count: 35, date: '2018-05-29', method: '電魚', recorder: '107-108成果報告', note: '107年調查35尾；102~108年累計57尾；109~114年累計317尾（6樣站，為數量最多物種）；體長37~75mm；偏好水深0.1~0.15m、流速0.9~1.0m/s、礫石底質急流段；St.1分布最多（84尾），梯度：St.1＞St.2＞St.4＞St.3＞St.5＞St.6；112年8次調查共41尾、113年5次調查共27尾、115年6次調查共33尾；潛越式（溪構5：13尾）及斜坡式（溪構3：12尾）為最適通行魚道，FPE指數最高；為AI影像辨識訓練物種' },
        { id: 7, species: '臺灣間爬岩鰍', scientificName: 'Hemimyzon formosanus', family: '爬鰍科', conservation: '近危', location: '橫流溪上游礫石底質', count: 26, date: '2018-05-29', method: '電魚', recorder: '107-108成果報告', note: '107年調查26尾；102~108年累計86尾；底棲吸附型，偏好礫石急流；為指標性特有種；為AI影像辨識訓練物種' },
        { id: 8, species: '短臀瘋鱨', scientificName: 'Tachysurus brevianalis', family: '鱨科', conservation: '易危', location: '橫流溪高流速淺瀨及礫石岩縫', count: 4, date: '2019-04-17', method: '電魚', recorder: '107-108成果報告', note: '108年調查4尾；102~108年累計6尾；橫流溪最後確認記錄：112年11月5尾（體長105~220mm）；113年全年4次調查（3/25、6/27、11/26、12/13）均未記錄；114年2次調查（6月、12月）均未記錄；注意：「南湖溪」114年12月曾記錄6尾（非橫流溪資料）；夜行性底棲，偏好流速>0.8m/s礫石急流段及深潭岩石縫隙，白天躲藏岩縫標準電捕不易捕獲；魚道建置後棲地適合度（WUA）小幅下降（流速減緩影響）；目前橫流溪無魚道通行記錄，建議加強夜間電捕監測及底質岩縫棲地保護；臺灣特有種，第三級保育野生動物' },
        { id: 9, species: '短吻紅斑吻鰕虎', scientificName: 'Rhinogobius rubromaculatus', family: '鰕虎科', conservation: '一般', location: '橫流溪全段（St.1~St.6均勻分布，St.2最多4尾）', count: 2, date: '2019-04-17', method: '電魚', recorder: '107-108成果報告', note: '108年新記錄2尾；109~114年累計14尾（6樣站）；112年3尾（5/30：2尾體長27~31mm，11/27：1尾46mm），113年1尾（6/27：41mm），115年1尾；成體體長27~46mm；St.2分布最多（4尾），各站均勻分布；IUCN近危（NT）；上溯能力受水位落差限制（每級魚道≤20cm），與明潭吻鰕虎比例約1:22.6（為族群稀少關注物種）；共域分布，未來魚道設計建議每水池落差≤20cm以利通行；臺灣特有種，需持續族群監測' },
        { id: 10, species: '臺灣白甲魚', scientificName: 'Onychostoma barbatulum', family: '鯉科', conservation: '近危', location: '橫流溪全流域', count: 30, date: '2025-03-10', method: '電魚', recorder: '115年生態調查', note: '115年春季調查30尾；溪構1-1、1-2魚道上下游均有記錄，魚道通行效果良好' },
        { id: 11, species: '臺灣石魚賓', scientificName: 'Acrossocheilus paradoxus', family: '鯉科', conservation: '一般', location: '橫流溪全流域', count: 22, date: '2025-03-10', method: '電魚', recorder: '115年生態調查', note: '115年春季調查22尾；全流域均有分布，109~114年累計288尾，為橫流溪第二多族群魚種' },

        /* ── 110年魚道電捕成效調查（農業部林業署東勢林區管理處，民國110年） ──────
           資料來源：110年東勢林區管理處國有林魚道及生態廊道成效追蹤報告
           調查方式：電捕法，9種魚道逐一調查，共捕獲74尾、10個物種
           目的：評估107~108年魚道設施建置後通行效能，確認各魚道型式對目標物種的適性 ── */
        { id: 12, species: '明潭吻鰕虎', scientificName: 'Rhinogobius candidianus', family: '鰕虎科', conservation: '一般', location: '橫流溪魚道群（溪構1-1粗石斜曲面4尾、溪構3斜坡式12尾、溪構4階段式1尾、溪構5潛越式13尾）', count: 30, date: '2021-04-10', method: '電魚', recorder: '110年魚道成效追蹤', note: '110年魚道電捕成效調查累計30尾，為捕獲量最多物種；潛越式(13)和斜坡式(12)最適合吻鰕虎通行，通行效能達86.7%；FPE指數最高' },
        { id: 13, species: '臺灣白甲魚', scientificName: 'Onychostoma barbatulum', family: '鯉科', conservation: '近危', location: '橫流溪魚道群（溪構2階段式2尾、溪構3斜坡式1尾、溪構4階段式2尾、溪構5潛越式1尾、溪構7降壩8尾、溪構8梯狀11尾）', count: 25, date: '2021-04-10', method: '電魚', recorder: '110年魚道成效追蹤', note: '110年魚道電捕成效調查累計25尾；降壩式(8)和梯狀階段式(11)對白甲魚最有效；成功通行範圍達0K+460→1K+170（710m以上）；魚道建置後族群回升確認' },
        { id: 14, species: '臺灣石魚賓', scientificName: 'Acrossocheilus paradoxus', family: '鯉科', conservation: '一般', location: '橫流溪魚道群（溪構2階段式3尾、溪構4階段式6尾、溪構5潛越式1尾、溪構6階段式4尾）', count: 14, date: '2021-04-10', method: '電魚', recorder: '110年魚道成效追蹤', note: '110年魚道電捕成效調查累計14尾；階段式魚道(溪構4：6尾)對石魚賓效果最佳；全流域均有記錄，偏好礫石底質緩流段' },
        { id: 15, species: '纓口臺鰍', scientificName: 'Formosania lacustre', family: '爬鰍科', conservation: '近危', location: '橫流溪魚道群（溪構3斜坡式1尾、溪構5潛越式1尾）', count: 2, date: '2021-04-10', method: '電魚', recorder: '110年魚道成效追蹤', note: '110年魚道電捕成效調查累計2尾；族群稀少，斜坡式與潛越式對底棲吸附型魚類最友善；確認魚道建置後保育種有通行記錄' },
        { id: 16, species: '臺灣間爬岩鰍', scientificName: 'Hemimyzon formosanus', family: '爬鰍科', conservation: '近危', location: '橫流溪魚道（溪構4階段式）', count: 2, date: '2021-04-10', method: '電魚', recorder: '110年魚道成效追蹤', note: '110年魚道電捕成效調查2尾；底棲吸附型，僅在溪構4階段式魚道有記錄；對高流速魚道適應較差，未來建置宜考慮低流速通道' },

        /* ── 103年魚道建置前基線調查（民國103年，東勢林區管理處） ──────────────
           資料來源：103年橫流溪(下游)溪流魚類監測調查記錄（104/105年東勢處報告附錄）
           重要性：作為魚道建置前生態基準，對照110年後的族群變化，確認魚道成效 ── */
        { id: 17, species: '臺灣石魚賓', scientificName: 'Acrossocheilus paradoxus', family: '鯉科', conservation: '一般', location: '橫流溪下游（豐林橋附近，下游監測點）', count: 22, date: '2014-12-10', method: '電魚', recorder: '103年東勢處溪流監測', note: '103年第4季調查，為魚道建置前（107年前）最後完整基準記錄；臺灣石魚賓為絕對優勢種（22尾），臺灣白甲魚數量極少；對照110年後多魚道通行記錄，顯示棲地連通性提升的顯著效果' },
        { id: 18, species: '臺灣間爬岩鰍', scientificName: 'Hemimyzon formosanus', family: '爬鰍科', conservation: '近危', location: '橫流溪下游（豐林橋附近）', count: 8, date: '2014-03-10', method: '電魚', recorder: '103年東勢處溪流監測', note: '103年第1季調查，與臺灣石魚賓共域分布；為魚道建置前基準；建置後溪構4(1K+170)電捕仍有記錄（2尾），顯示上游族群有所延伸' },

        /* ── 112年溪魚調查（民國112年，559筆調查記錄）──────────────────────────
           資料來源：112年橫流溪溪流魚類及棲地調查報告
           涵蓋8次現地調查（4/18、4/27、5/30、6/21、9/22、11/21、11/27、12/26）
           重要物種：明潭吻鰕虎41尾、短臀瘋鱨5尾、短吻紅斑吻鰕虎3尾、粗首馬口鱲4尾 ── */
        { id: 19, species: '明潭吻鰕虎', scientificName: 'Rhinogobius candidianus', family: '鰕虎科', conservation: '一般', location: '橫流溪全流域（6樣站）', count: 41, date: '2023-08-01', method: '電魚', recorder: '112年溪魚調查報告', note: '112年8次調查合計41尾；各次記錄：4/18(6)、4/27(4)、5/30(2)、6/21(5)、9/22(2)、11/21(10)、11/27(4)、12/26(8)；秋冬季族群活動較活躍；體長37~75mm；底棲型，偏好礫石卵石急流段；與短吻紅斑吻鰕虎共域，比例約22.6:1' },
        { id: 20, species: '明潭吻鰕虎', scientificName: 'Rhinogobius candidianus', family: '鰕虎科', conservation: '一般', location: '橫流溪全流域（6樣站）', count: 27, date: '2024-07-01', method: '電魚', recorder: '113年溪魚調查報告', note: '113年5次調查合計27尾；各次記錄：3/25(3)、6/26(17)、6/27(3)、11/26(2)、12/13(2)；初夏6月份為族群活動高峰；數量較112年略降但屬正常波動' },
        { id: 21, species: '短吻紅斑吻鰕虎', scientificName: 'Rhinogobius rubromaculatus', family: '鰕虎科', conservation: '一般', location: '橫流溪全段（St.2最多）', count: 3, date: '2023-06-01', method: '電魚', recorder: '112年溪魚調查報告', note: '112年記錄3尾；5/30：2尾（體長27mm、31mm），11/27：1尾（體長46mm）；小型底棲鰕虎，生長速度緩慢；體長範圍顯示不同齡級個體；IUCN近危，族群稀少' },
        { id: 22, species: '短吻紅斑吻鰕虎', scientificName: 'Rhinogobius rubromaculatus', family: '鰕虎科', conservation: '一般', location: '橫流溪全段', count: 1, date: '2024-06-27', method: '電魚', recorder: '113年溪魚調查報告', note: '113年記錄1尾（6/27，體長41mm）；與112年合計4尾，各年均有零星記錄；族群維持低密度穩定存在；需持續監測以評估族群趨勢' },
        { id: 23, species: '短臀瘋鱨', scientificName: 'Tachysurus brevianalis', family: '鱨科', conservation: '易危', location: '橫流溪高流速礫石段', count: 5, date: '2023-10-01', method: '電魚', recorder: '112年溪魚調查報告', note: '112年記錄5尾（體長105~183mm），為成體個體；偏好流速>0.8m/s礫石底質高流速段；夜行性，白天躲藏於岩石縫隙深處，標準電捕法不易捕獲；實際族群密度可能高於調查記錄；第三級保育野生動物，建議夜間監測補充調查' },

        /* ── 113年溪魚調查（民國113年）── */
        { id: 24, species: '粗首馬口鱲', scientificName: 'Zacco pachycephalus', family: '鯉科', conservation: '一般', location: '橫流溪中游礫石淺灘', count: 4, date: '2023-06-01', method: '電魚', recorder: '112年溪魚調查報告', note: '112年記錄4尾（體長73mm）；中游礫石淺灘主要棲息地（0K+460~1K+000）；不列入場域生態資源保全主表，但為場域確認物種；102~108年累計191尾，封溪護魚政策持續保護中' },
        { id: 25, species: '粗首馬口鱲', scientificName: 'Zacco pachycephalus', family: '鯉科', conservation: '一般', location: '橫流溪中游礫石淺灘', count: 6, date: '2024-06-01', method: '電魚', recorder: '113年溪魚調查報告', note: '113年記錄6尾（體長68~105mm），體長範圍顯示多齡級個體；較112年（4尾）略有增加；中游族群穩定；偏好礫石急流淺灘，封溪護魚效果持續顯現' }
      ],
      habitats: [
        { id: 1, name: '樣站S1 107-108年魚類棲地調查', type: '淺灘', surveyMethod: '電魚', location: '橫流溪 0K+460附近', stationKm: '0K+460', lat: 24.2152, lng: 120.9082, twd97x: null, twd97y: null, area: 920, depth: 0.35, substrate: '礫石', vegetation: '低', quality: 4, date: '2018-05-29', source: '107-108成果報告', note: '107年電魚調查樣站1（0K+460~0K+560範圍）；底質礫石為主，流速0.4~0.8m/s；記錄臺灣白甲魚、粗首馬口鱲等物種' },
        { id: 2, name: '樣站S2 107-108年魚類棲地調查', type: '急流淺灘', surveyMethod: '電魚', location: '橫流溪 0K+740附近', stationKm: '0K+740', lat: 24.17996, lng: 120.90960, twd97x: 240817, twd97y: 2675440, area: 650, depth: 0.40, substrate: '卵石', vegetation: '中', quality: 5, date: '2018-05-29', source: '107-108成果報告', note: '107年電魚調查樣站2（TWD97：240817, 2675440）；流速1.9m/s；多種保育魚類出現，生態品質佳' },
        { id: 3, name: '樣站S3 107-108年魚類棲地調查', type: '礫石淺灘', surveyMethod: '電魚', location: '橫流溪 1K+000附近', stationKm: '1K+000', lat: 24.18001, lng: 120.90955, twd97x: 240812, twd97y: 2675445, area: 580, depth: 0.30, substrate: '礫石+卵石', vegetation: '低', quality: 4, date: '2018-05-29', source: '107-108成果報告', note: '107年電魚調查樣站3（TWD97：240812, 2675445）；底質礫石，流速適中，臺灣鬚鱲及粗首馬口鱲優勢' },
        { id: 4, name: '樣站S4 107-108年魚類棲地調查', type: '緩流深潭', surveyMethod: '電魚', location: '橫流溪 1K+225附近', stationKm: '1K+225', lat: 24.18232, lng: 120.90921, twd97x: 240778, twd97y: 2675702, area: 470, depth: 0.62, substrate: '沙礫混合', vegetation: '高', quality: 3, date: '2018-05-29', source: '107-108成果報告', note: '107年電魚調查樣站4（TWD97：240778, 2675702）；纓口臺鰍及臺灣石魚賓記錄點，底質有淤積現象' },
        { id: 5, name: '水質監測站 0K+460', type: '水質調查', surveyMethod: '水質採樣', location: '橫流溪 0K+460', stationKm: '0K+460', lat: 24.17602, lng: 120.90860, twd97x: 240716, twd97y: 2675003, area: null, depth: null, substrate: '礫石', vegetation: '低', quality: 4, date: '2019-04-17', source: '107-108成果報告', note: '108年水質監測點（TWD97：240716, 2675003）；檢測項目含DO、BOD5、SS、NH3-N；河川污染指數RPI良好' },
        { id: 6, name: '115年溪流生態調查點 S1', type: '急流', surveyMethod: '電魚', location: '橫流溪 1K+225附近', stationKm: '1K+225', lat: 24.2254, lng: 120.9100, twd97x: null, twd97y: null, area: 430, depth: 0.45, substrate: '礫石', vegetation: '低', quality: 5, date: '2025-03-10', source: '115年魚類調查', note: '溪構6附近急流段，臺灣白甲魚及纓口臺鰍密度較高，符合保育棲地標準' }
      ],
      reports: [],
      inspections: [
        { id: 1, facilityId: 7, facilityName: '溪構5-2 潛越式魚道', date: '2025-01-10', inspector: '張技士', weather: '晴', findings: '入口遭颱風帶入土石完全堵塞，魚類無法通行，池壁左側出現縱向裂縫約20cm', action: '提報緊急維護計畫，申請預算清除堵塞土石', status: '完成', priority: '低', photos: [], maintenanceStart: '2025-01-10', expectedCompletion: '', completedAt: '', deru_d: 0, deru_e: 1, deru_r: 1, deru_u: 1, deru_label: 'U1 定期巡查', deru_score: 0 },
        { id: 2, facilityId: 3, facilityName: '溪構11 階梯式固床工', date: '2025-01-10', inspector: '張技士', weather: '晴', findings: '左岸翼牆出現細裂縫約15cm，鋼筋有鏽蝕現象，需儘速修補防止擴大', action: '提報維護計畫，安排鋼筋防蝕處理', status: '待處理', priority: '高', photos: [] },
        { id: 3, facilityId: 9, facilityName: '溪構4 階段式魚道', date: '2025-02-20', inspector: '李技士', weather: '陰', findings: '魚道基礎受洪水侵蝕，混凝土局部裸露；第3、4水池間導流牆偏移約5cm', action: '安排基礎補強工程評估', status: '完成', priority: '高', photos: [], maintenanceStart: '2025-02-20', expectedCompletion: '', completedAt: '', deru_d: 0, deru_e: 1, deru_r: 1, deru_u: 1, deru_label: 'U1 定期巡查', deru_score: 0 },
        { id: 4, facilityId: 1, facilityName: '溪構8-2 之字形魚道', date: '2025-03-15', inspector: '王技士', weather: '晴', findings: '魚道水流正常，觀察到臺灣白甲魚及纓口臺鰍由下游往上游通行；步道扶手完整', action: '繼續定期監測', status: '完成', priority: '低', photos: [] },
        { id: 5, facilityId: 5, facilityName: '溪構6 階段式魚道', date: '2025-03-15', inspector: '王技士', weather: '晴', findings: '各水池水深0.3~0.5m，流速符合通行標準；觀察到粗首馬口鱲及明潭吻鰕虎通過', action: '繼續監測', status: '完成', priority: '低', photos: [] },
        { id: 6, facilityId: 13, facilityName: '溪構1-1 粗石斜曲面式魚道', date: '2025-03-15', inspector: '陳技士', weather: '晴', findings: '粗石坡面完整，水流分布均勻；記錄臺灣白甲魚及纓口臺鰍成功通行', action: '繼續監測', status: '完成', priority: '低', photos: [] },
        // ── 114年(2025/4) 專業巡查：構造物調查表×37＋魚道檢核表×1（宜順工程顧問，附錄三）──
        { id: 8011, facilityId: 1, facilityName: '溪構8-2 之字形魚道', formType: 'professional_structure', date: '2025-04-17', inspector: '張建輝、莊孟矩、陳瑞宗', inspectUnit: '宜順工程顧問股份有限公司', inspectNo: '橫流溪－114－溪構8-2', position: '横流溪', structType: '之字形魚道', level: 'A級', icLevel: null, deru_d: 0, deru_e: 1, deru_r: 1, deru_u: 1, deru_label: 'A級 例行維護（定期檢測）', findings: '構造物本體結構良好（A級），現況有土砂淤積情形；魚道功能另詳魚道檢核表評估。', action: '例行維護（定期檢測）', appearanceOther: '', status: '完成', priority: '低', weather: '晴', maintenanceStart: '2025-04-17', photos: ['/webapp/assets/inspection-photos/114/S8-2_1.jpg'] },
        { id: 8010, facilityId: 2, facilityName: '溪構8-1 防砂壩', formType: 'professional_structure', date: '2025-04-17', inspector: '張建輝、莊孟矩、陳瑞宗', inspectUnit: '宜順工程顧問股份有限公司', inspectNo: '橫流溪－114－溪構8-1', position: '横流溪', structType: '防砂壩 混凝土', level: 'A級', icLevel: null, deru_d: 0, deru_e: 1, deru_r: 1, deru_u: 1, deru_label: 'A級 例行維護（定期檢測）', findings: '構造物整體現況良好不影響(以溪構8-2維持縱向廊道)', action: '例行維護（定期檢測）', appearanceOther: '', status: '完成', priority: '低', weather: '晴', maintenanceStart: '2025-04-17', photos: ['/webapp/assets/inspection-photos/114/S8-1_1.jpg'] },
        { id: 8014, facilityId: 3, facilityName: '溪構11 階梯式固床工', formType: 'professional_structure', date: '2025-04-17', inspector: '張建輝、莊孟矩、陳瑞宗', inspectUnit: '宜順工程顧問股份有限公司', inspectNo: '橫流溪－114－溪構11', position: '横流溪', structType: '階梯式固床工 混凝土/塊石', level: 'A級', icLevel: null, deru_d: 0, deru_e: 1, deru_r: 1, deru_u: 1, deru_label: 'A級 例行維護（定期檢測）', findings: '構造物整體現況良好。', action: '例行維護（定期檢測）', appearanceOther: '', status: '完成', priority: '低', weather: '晴', maintenanceStart: '2025-04-17', photos: ['/webapp/assets/inspection-photos/114/S11_1.jpg'] },
        { id: 8009, facilityId: 4, facilityName: '溪構7 降壩魚道', formType: 'professional_structure', date: '2025-04-17', inspector: '張建輝、莊孟矩、陳瑞宗', inspectUnit: '宜順工程顧問股份有限公司', inspectNo: '橫流溪－114－溪構7', position: '横流溪', structType: '降壩魚道 混凝土', level: 'A級', icLevel: null, deru_d: 0, deru_e: 1, deru_r: 1, deru_u: 1, deru_label: 'A級 例行維護（定期檢測）', findings: '構造物整體現況良好。', action: '例行維護（定期檢測）', appearanceOther: '', status: '完成', priority: '低', weather: '晴', maintenanceStart: '2025-04-17', photos: ['/webapp/assets/inspection-photos/114/S7_1.jpg'] },
        { id: 8008, facilityId: 5, facilityName: '溪構6 階段式魚道', formType: 'professional_structure', date: '2025-04-17', inspector: '張建輝、莊孟矩、陳瑞宗', inspectUnit: '宜順工程顧問股份有限公司', inspectNo: '橫流溪－114－溪構6', position: '横流溪', structType: '階段式魚道 混凝土/塊石', level: 'A級', icLevel: null, deru_d: 0, deru_e: 1, deru_r: 1, deru_u: 1, deru_label: 'A級 例行維護（定期檢測）', findings: '構造物整體現況良好。', action: '例行維護（定期檢測）', appearanceOther: '', status: '完成', priority: '低', weather: '晴', maintenanceStart: '2025-04-17', photos: ['/webapp/assets/inspection-photos/114/S6_1.jpg'] },
        { id: 8015, facilityId: 15, facilityName: '護岸', formType: 'professional_structure', date: '2025-04-17', inspector: '張建輝、莊孟矩、陳瑞宗', inspectUnit: '宜順工程顧問股份有限公司', inspectNo: '橫流溪－114－護岸0K+400', position: '横流溪', structType: '護岸 混凝土', level: 'A級', icLevel: null, deru_d: 0, deru_e: 1, deru_r: 1, deru_u: 1, deru_label: 'A級 例行維護（定期檢測）', findings: '護岸整體現況良好。', action: '例行維護（定期檢測）', appearanceOther: '', status: '完成', priority: '低', weather: '晴', maintenanceStart: '2025-04-17', photos: ['/webapp/assets/inspection-photos/114/RA0400_1.jpg'] },
        { id: 8016, facilityId: 15, facilityName: '護岸', formType: 'professional_structure', date: '2025-04-17', inspector: '張建輝、莊孟矩、陳瑞宗', inspectUnit: '宜順工程顧問股份有限公司', inspectNo: '橫流溪－114－0K+600護岸', position: '横流溪', structType: '護岸 混凝土', level: 'A級', icLevel: null, deru_d: 0, deru_e: 1, deru_r: 1, deru_u: 1, deru_label: 'A級 例行維護（定期檢測）', findings: '護岸整體現況良好。', action: '例行維護（定期檢測）', appearanceOther: '', status: '完成', priority: '低', weather: '晴', maintenanceStart: '2025-04-17', photos: ['/webapp/assets/inspection-photos/114/0600RA_1.jpg'] },
        { id: 8017, facilityId: 15, facilityName: '護岸', formType: 'professional_structure', date: '2025-04-17', inspector: '張建輝、莊孟矩、陳瑞宗', inspectUnit: '宜順工程顧問股份有限公司', inspectNo: '橫流溪－114－0K+800護岸', position: '横流溪', structType: '護岸 混凝土/塊石', level: 'A級', icLevel: null, deru_d: 0, deru_e: 1, deru_r: 1, deru_u: 1, deru_label: 'A級 例行維護（定期檢測）', findings: '護岸整體現況良好。', action: '例行維護（定期檢測）', appearanceOther: '', status: '完成', priority: '低', weather: '晴', maintenanceStart: '2025-04-17', photos: ['/webapp/assets/inspection-photos/114/0800RA_1.jpg'] },
        { id: 8038, facilityId: 1, facilityName: '溪構8-2 之字形魚道', formType: 'professional_fishway', date: '2025-04-17', inspector: '張建輝、莊孟矩、陳瑞宗', inspectUnit: '宜順工程顧問股份有限公司', inspectNo: '橫流溪－114－溪構8-2', position: '横流溪', structType: '', level: 'B1-III級', icLevel: null, deru_d: 4, deru_e: 4, deru_r: 4, deru_u: 4, deru_label: 'B1-III級 一年內必須處理維護（魚道功能）', findings: '之字形魚道本體及出入流口土砂淤積、斷流，水中攝影未見魚類通過；魚道功能受阻、直接影響橫流溪縱向廊道連通性。建議魚道及入出流口清淤、出口處設置防淤措施（預估100仟元）。構造物本體結構良好(A級)。', action: '魚道及入出流口清淤、出口處設置防淤措施，恢復縱向廊道連通', appearanceOther: '', status: '待處理', priority: '緊急', weather: '晴', maintenanceStart: '2025-04-17', photos: ['/webapp/assets/inspection-photos/114/S8-2_1.jpg', '/webapp/assets/inspection-photos/114/S8-2_2.jpg'] },
        { id: 8006, facilityId: 6, facilityName: '溪構5-1 防砂壩', formType: 'professional_structure', date: '2025-04-18', inspector: '張建輝、莊孟矩、陳瑞宗', inspectUnit: '宜順工程顧問股份有限公司', inspectNo: '橫流溪－114－溪構5-1', position: '横流溪1K+000', structType: '防砂壩 混凝土', level: 'A級', icLevel: null, deru_d: 0, deru_e: 1, deru_r: 1, deru_u: 1, deru_label: 'A級 例行維護（定期檢測）', findings: '整體現況良好不影響(以溪構5-2維持縱向廊道)', action: '例行維護（定期檢測）', appearanceOther: '', status: '完成', priority: '低', weather: '晴', maintenanceStart: '2025-04-18', photos: ['/webapp/assets/inspection-photos/114/S5-1_1.jpg'] },
        { id: 8007, facilityId: 7, facilityName: '溪構5-2 潛越式魚道', formType: 'professional_structure', date: '2025-04-18', inspector: '張建輝、莊孟矩、陳瑞宗', inspectUnit: '宜順工程顧問股份有限公司', inspectNo: '橫流溪－114－溪構5-2', position: '横流溪1K+000', structType: '潛越式魚道 混凝土', level: 'A級', icLevel: null, deru_d: 0, deru_e: 1, deru_r: 1, deru_u: 1, deru_label: 'A級 例行維護（定期檢測）', findings: '整體現況良好。', action: '例行維護（定期檢測）', appearanceOther: '', status: '完成', priority: '低', weather: '晴', maintenanceStart: '2025-04-18', photos: ['/webapp/assets/inspection-photos/114/S5-2_1.jpg'] },
        { id: 8013, facilityId: 8, facilityName: '溪構10 固床工', formType: 'professional_structure', date: '2025-04-18', inspector: '張建輝、莊孟矩、陳瑞宗', inspectUnit: '宜順工程顧問股份有限公司', inspectNo: '橫流溪－114－溪構10', position: '横流溪', structType: '固床工 混凝土/塊石', level: 'B1級,B級', icLevel: 'I級', deru_d: 3, deru_e: 1, deru_r: 3, deru_u: 2, deru_label: 'B1級 定量(進階)檢測，建檔管理', findings: '構造物整體大致良好，部分鋼條有位移情形，建議進行修補。', action: '定量(進階)檢測，建檔管理並進入定期檢測', appearanceOther: '連接溪構5-2魚道保護工部分部分鋼條位移', status: '待處理', priority: '中', weather: '晴', maintenanceStart: '2025-04-18', photos: ['/webapp/assets/inspection-photos/114/S10_1.jpg', '/webapp/assets/inspection-photos/114/S10_2.jpg'] },
        { id: 8005, facilityId: 9, facilityName: '溪構4 階段式魚道', formType: 'professional_structure', date: '2025-04-18', inspector: '張建輝、莊孟矩、陳瑞宗', inspectUnit: '宜順工程顧問股份有限公司', inspectNo: '橫流溪－114－溪構4', position: '横流溪1K+170', structType: '階段式魚道 混凝土', level: 'B1級,B級', icLevel: 'I級', deru_d: 2, deru_e: 1, deru_r: 2, deru_u: 2, deru_label: 'B1級 定量(進階)檢測，建檔管理', findings: '整體現況大致良好，惟左側部分格框消能設施基礎淘空，建議進行修補。', action: '定量(進階)檢測，建檔管理並進入定期檢測', appearanceOther: '左側部分格框消能設施基礎淘空', status: '待處理', priority: '中', weather: '晴', maintenanceStart: '2025-04-18', photos: ['/webapp/assets/inspection-photos/114/S4_1.jpg', '/webapp/assets/inspection-photos/114/S4_2.jpg'] },
        { id: 8004, facilityId: 10, facilityName: '溪構3 斜坡式魚道', formType: 'professional_structure', date: '2025-04-18', inspector: '張建輝、莊孟矩、陳瑞宗', inspectUnit: '宜順工程顧問股份有限公司', inspectNo: '橫流溪－114－溪構3', position: '横流溪1K+225', structType: '斜坡式魚道 混凝土、塊石', level: 'A級', icLevel: null, deru_d: 0, deru_e: 1, deru_r: 1, deru_u: 1, deru_label: 'A級 例行維護（定期檢測）', findings: '構造物整體現況良好。', action: '例行維護（定期檢測）', appearanceOther: '', status: '完成', priority: '低', weather: '晴', maintenanceStart: '2025-04-18', photos: ['/webapp/assets/inspection-photos/114/S3_1.jpg'] },
        { id: 8012, facilityId: 11, facilityName: '溪構9 固床工', formType: 'professional_structure', date: '2025-04-18', inspector: '張建輝、莊孟矩、陳瑞宗', inspectUnit: '宜順工程顧問股份有限公司', inspectNo: '橫流溪－114－溪構9', position: '横流溪', structType: '固床工 混凝土', level: 'A級', icLevel: null, deru_d: 0, deru_e: 1, deru_r: 1, deru_u: 1, deru_label: 'A級 例行維護（定期檢測）', findings: '構造物整體大致良好，溢口有輕微磨蝕情形，建議例行維護(即定期檢測)', action: '例行維護（定期檢測）', appearanceOther: '', status: '完成', priority: '低', weather: '晴', maintenanceStart: '2025-04-18', photos: ['/webapp/assets/inspection-photos/114/S9_1.jpg'] },
        { id: 8003, facilityId: 12, facilityName: '溪構2 階段式魚道', formType: 'professional_structure', date: '2025-04-18', inspector: '張建輝、莊孟矩、陳瑞宗', inspectUnit: '宜順工程顧問股份有限公司', inspectNo: '橫流溪－114－溪構2', position: '横流溪', structType: '階段式魚道 混凝土', level: 'A級', icLevel: null, deru_d: 0, deru_e: 1, deru_r: 1, deru_u: 1, deru_label: 'A級 例行維護（定期檢測）', findings: '構造物整體現況良好。', action: '例行維護（定期檢測）', appearanceOther: '', status: '完成', priority: '低', weather: '晴', maintenanceStart: '2025-04-18', photos: ['/webapp/assets/inspection-photos/114/S2_1.jpg'] },
        { id: 8001, facilityId: 13, facilityName: '溪構1-1 粗石斜曲面式魚道', formType: 'professional_structure', date: '2025-04-18', inspector: '張建輝、莊孟矩、陳瑞宗', inspectUnit: '宜順工程顧問股份有限公司', inspectNo: '橫流溪－114－溪構1-1', position: '橫流溪1K+400', structType: '防砂設施、粗石斜曲面式魚道 混凝土、塊石', level: 'B1級,B級', icLevel: 'I級', deru_d: 2, deru_e: 1, deru_r: 2, deru_u: 2, deru_label: 'B1級 定量(進階)檢測，建檔管理', findings: '整體現況大致良好，惟下游部份格框消能設施基礎淘空，建議進行基礎修補。', action: '定量(進階)檢測，建檔管理並進入定期檢測', appearanceOther: '下游部份格框消能設施基礎淘空', status: '待處理', priority: '中', weather: '晴', maintenanceStart: '2025-04-18', photos: ['/webapp/assets/inspection-photos/114/S1-1_1.jpg', '/webapp/assets/inspection-photos/114/S1-1_2.jpg'] },
        { id: 8002, facilityId: 14, facilityName: '溪構1-2 改良型舟通式魚道', formType: 'professional_structure', date: '2025-04-18', inspector: '張建輝、莊孟矩、陳瑞宗', inspectUnit: '宜順工程顧問股份有限公司', inspectNo: '橫流溪－114－溪構1-2', position: '橫流溪1K+400', structType: '改良型舟通式魚道 混凝土、塊石', level: 'A級', icLevel: null, deru_d: 0, deru_e: 1, deru_r: 1, deru_u: 1, deru_label: 'A級 例行維護（定期檢測）', findings: '構造物整體現況良好，建議例行維護（即定期檢測）。', action: '例行維護（定期檢測）', appearanceOther: '', status: '完成', priority: '低', weather: '晴', maintenanceStart: '2025-04-18', photos: ['/webapp/assets/inspection-photos/114/S1-2_1.jpg'] },
        { id: 8018, facilityId: 15, facilityName: '護岸', formType: 'professional_structure', date: '2025-04-18', inspector: '張建輝、莊孟矩、陳瑞宗', inspectUnit: '宜順工程顧問股份有限公司', inspectNo: '橫流溪－114－1K+000護岸', position: '横流溪1K+000', structType: '護岸 混凝土', level: 'A級', icLevel: null, deru_d: 0, deru_e: 1, deru_r: 1, deru_u: 1, deru_label: 'A級 例行維護（定期檢測）', findings: '護岸整體現況良好。', action: '例行維護（定期檢測）', appearanceOther: '', status: '完成', priority: '低', weather: '晴', maintenanceStart: '2025-04-18', photos: ['/webapp/assets/inspection-photos/114/1000RA_1.jpg'] },
        { id: 8019, facilityId: 15, facilityName: '護岸', formType: 'professional_structure', date: '2025-04-18', inspector: '張建輝、莊孟矩、陳瑞宗', inspectUnit: '宜順工程顧問股份有限公司', inspectNo: '橫流溪－114－1K+200護岸', position: '横流溪1K+200', structType: '護岸 混凝土', level: 'A級', icLevel: null, deru_d: 0, deru_e: 1, deru_r: 1, deru_u: 1, deru_label: 'A級 例行維護（定期檢測）', findings: '護岸整體現況良好。', action: '例行維護（定期檢測）', appearanceOther: '', status: '完成', priority: '低', weather: '晴', maintenanceStart: '2025-04-18', photos: ['/webapp/assets/inspection-photos/114/1200RA_1.jpg'] },
        { id: 8020, facilityId: 15, facilityName: '護岸', formType: 'professional_structure', date: '2025-04-18', inspector: '張建輝、莊孟矩、陳瑞宗', inspectUnit: '宜順工程顧問股份有限公司', inspectNo: '橫流溪－114－1K+263護岸', position: '横流溪1K+263', structType: '護岸 混凝土', level: 'B1級,B級', icLevel: 'I級', deru_d: 2, deru_e: 1, deru_r: 2, deru_u: 2, deru_label: 'B1級 定量(進階)檢測，建檔管理', findings: '基礎淘空，災損原因為構體老化破損。', action: '定量(進階)檢測，建檔管理並進入定期檢測', appearanceOther: '', status: '待處理', priority: '中', weather: '晴', maintenanceStart: '2025-04-18', photos: ['/webapp/assets/inspection-photos/114/1263RA_1.jpg', '/webapp/assets/inspection-photos/114/1263RA_2.jpg'] },
        { id: 8021, facilityId: 15, facilityName: '護岸', formType: 'professional_structure', date: '2025-04-18', inspector: '張建輝、莊孟矩、陳瑞宗', inspectUnit: '宜順工程顧問股份有限公司', inspectNo: '橫流溪－114－1K+400護岸', position: '横流溪1K+400', structType: '護岸 混凝土', level: 'A級', icLevel: null, deru_d: 0, deru_e: 1, deru_r: 1, deru_u: 1, deru_label: 'A級 例行維護（定期檢測）', findings: '護岸整體現況良好。', action: '例行維護（定期檢測）', appearanceOther: '', status: '完成', priority: '低', weather: '晴', maintenanceStart: '2025-04-18', photos: ['/webapp/assets/inspection-photos/114/1400RA_1.jpg'] },
        { id: 8022, facilityId: 16, facilityName: '步道', formType: 'professional_structure', date: '2025-04-21', inspector: '張建輝、莊孟矩、陳瑞宗', inspectUnit: '宜順工程顧問股份有限公司', inspectNo: '橫流溪－114－0K+000步道', position: '0K+000步道', structType: '步道 PC路面', level: 'B級,B3級', icLevel: null, deru_d: 1, deru_e: 2, deru_r: 1, deru_u: 2, deru_label: 'B3級 進入定期檢測系統', findings: 'PC道路有破損情形，現況人員及車輛仍可通過，建議定期檢測。', action: '進入定期檢測系統', appearanceOther: '路面破損', status: '待處理', priority: '中', weather: '晴', maintenanceStart: '2025-04-21', photos: ['/webapp/assets/inspection-photos/114/0000T_1.jpg', '/webapp/assets/inspection-photos/114/0000T_2.jpg'] },
        { id: 8023, facilityId: 16, facilityName: '步道', formType: 'professional_structure', date: '2025-04-21', inspector: '張建輝、莊孟矩、陳瑞宗', inspectUnit: '宜順工程顧問股份有限公司', inspectNo: '橫流溪－114－0K+200步道', position: '0K+200步道', structType: '步道 PC路面', level: 'A級', icLevel: null, deru_d: 0, deru_e: 1, deru_r: 1, deru_u: 1, deru_label: 'A級 例行維護（定期檢測）', findings: '道路現況整體良好。', action: '例行維護（定期檢測）', appearanceOther: '', status: '完成', priority: '低', weather: '晴', maintenanceStart: '2025-04-21', photos: ['/webapp/assets/inspection-photos/114/0200T_1.jpg'] },
        { id: 8024, facilityId: 16, facilityName: '步道', formType: 'professional_structure', date: '2025-04-21', inspector: '張建輝、莊孟矩', inspectUnit: '宜順工程顧問股份有限公司', inspectNo: '橫流溪－114－0K+370步道', position: '0K+370步道', structType: '步道 PC路面', level: 'B級,B3級', icLevel: null, deru_d: 1, deru_e: 2, deru_r: 1, deru_u: 2, deru_label: 'B3級 進入定期檢測系統', findings: 'PC道路有破損情形，現況人員及車輛仍可通過，建議定期檢測；另告示牌旁救生圈遺失。', action: '進入定期檢測系統', appearanceOther: '路面破損', status: '待處理', priority: '中', weather: '晴', maintenanceStart: '2025-04-21', photos: ['/webapp/assets/inspection-photos/114/0370T_1.jpg', '/webapp/assets/inspection-photos/114/0370T_2.jpg'] },
        { id: 8025, facilityId: 16, facilityName: '步道', formType: 'professional_structure', date: '2025-04-21', inspector: '張建輝、莊孟矩、陳瑞宗', inspectUnit: '宜順工程顧問股份有限公司', inspectNo: '橫流溪－114－0K+400步道', position: '0K+400步道', structType: '步道 PC路面', level: 'A級', icLevel: null, deru_d: 0, deru_e: 1, deru_r: 1, deru_u: 1, deru_label: 'A級 例行維護（定期檢測）', findings: '道路現況整體良好；現況告示牌旁救生圈遺失。', action: '例行維護（定期檢測）', appearanceOther: '', status: '完成', priority: '低', weather: '晴', maintenanceStart: '2025-04-21', photos: ['/webapp/assets/inspection-photos/114/0400T_1.jpg'] },
        { id: 8026, facilityId: 16, facilityName: '步道', formType: 'professional_structure', date: '2025-04-21', inspector: '張建輝、莊孟矩、陳瑞宗', inspectUnit: '宜順工程顧問股份有限公司', inspectNo: '橫流溪－114－0K+450步道', position: '0K+450步道', structType: '步道 PC路面', level: 'A級', icLevel: null, deru_d: 0, deru_e: 1, deru_r: 1, deru_u: 1, deru_label: 'A級 例行維護（定期檢測）', findings: 'PC道路現況良好；告示牌旁救生圈遺失；邊坡陡峭且有土砂暫存坡面，有落石之虞。', action: '例行維護（定期檢測）', appearanceOther: '', status: '完成', priority: '低', weather: '晴', maintenanceStart: '2025-04-21', photos: ['/webapp/assets/inspection-photos/114/0450T_1.jpg'] },
        { id: 8027, facilityId: 16, facilityName: '步道', formType: 'professional_structure', date: '2025-04-21', inspector: '張建輝、莊孟矩、陳瑞宗', inspectUnit: '宜順工程顧問股份有限公司', inspectNo: '橫流溪－114－0K+500步道', position: '0K+500步道', structType: '步道 PC路面', level: 'A級', icLevel: null, deru_d: 0, deru_e: 1, deru_r: 1, deru_u: 1, deru_label: 'A級 例行維護（定期檢測）', findings: '道路現況整體良好。', action: '例行維護（定期檢測）', appearanceOther: '', status: '完成', priority: '低', weather: '晴', maintenanceStart: '2025-04-21', photos: ['/webapp/assets/inspection-photos/114/0500T_1.jpg'] },
        { id: 8028, facilityId: 16, facilityName: '步道', formType: 'professional_structure', date: '2025-04-21', inspector: '張建輝、莊孟矩、陳瑞宗', inspectUnit: '宜順工程顧問股份有限公司', inspectNo: '橫流溪－114－0K+600步道', position: '0K+600步道', structType: '步道 PC路面', level: 'C級,C3級', icLevel: null, deru_d: 3, deru_e: 2, deru_r: 3, deru_u: 4, deru_label: 'C3級 1年內應處理重建', findings: '雨易產生落石，且其邊坡上方即為高壓電塔，故評估為C3級並建議設置擋土設施以穩定坡面。', action: '1年內處理重建，建檔管理並進入定期檢測', appearanceOther: '邊坡崩塌', status: '待處理', priority: '緊急', weather: '晴', maintenanceStart: '2025-04-21', photos: ['/webapp/assets/inspection-photos/114/0600T_1.jpg', '/webapp/assets/inspection-photos/114/0600T_2.jpg'] },
        { id: 8029, facilityId: 16, facilityName: '步道', formType: 'professional_structure', date: '2025-04-21', inspector: '張建輝、莊孟矩、陳瑞宗', inspectUnit: '宜順工程顧問股份有限公司', inspectNo: '橫流溪－114－0K+800步道', position: '0K+800步道', structType: '步道 碎石路面', level: 'C級,C4級', icLevel: null, deru_d: 4, deru_e: 3, deru_r: 3, deru_u: 4, deru_label: 'C4級 恢復自然狀況或緩建', findings: '可做為緩衝綠帶，故評估為C4級。', action: '恢復自然狀況或緩建（不影響國土保育及保全對象前提下）', appearanceOther: '邊坡崩塌', status: '待處理', priority: '緊急', weather: '晴', maintenanceStart: '2025-04-21', photos: ['/webapp/assets/inspection-photos/114/0800T_1.jpg', '/webapp/assets/inspection-photos/114/0800T_2.jpg'] },
        { id: 8030, facilityId: 16, facilityName: '步道', formType: 'professional_structure', date: '2025-04-21', inspector: '張建輝、莊孟矩、陳瑞宗', inspectUnit: '宜順工程顧問股份有限公司', inspectNo: '橫流溪－114－0K+950步道', position: '0K+950步道', structType: '步道 碎石路面', level: 'A級', icLevel: null, deru_d: 0, deru_e: 1, deru_r: 1, deru_u: 1, deru_label: 'A級 例行維護（定期檢測）', findings: '道路現況良好；現況告示牌旁之救生圈遺失。', action: '例行維護（定期檢測）', appearanceOther: '', status: '完成', priority: '低', weather: '晴', maintenanceStart: '2025-04-21', photos: ['/webapp/assets/inspection-photos/114/0950T_1.jpg'] },
        { id: 8031, facilityId: 16, facilityName: '步道', formType: 'professional_structure', date: '2025-04-21', inspector: '張建輝、莊孟矩、陳瑞宗', inspectUnit: '宜順工程顧問股份有限公司', inspectNo: '橫流溪－114－1K+000步道', position: '1K+000步道', structType: '步道 碎石路面', level: 'A級', icLevel: null, deru_d: 0, deru_e: 1, deru_r: 1, deru_u: 1, deru_label: 'A級 例行維護（定期檢測）', findings: '道路現況良好；現況告示牌旁之救生圈遺失。', action: '例行維護（定期檢測）', appearanceOther: '', status: '完成', priority: '低', weather: '晴', maintenanceStart: '2025-04-21', photos: ['/webapp/assets/inspection-photos/114/1000T_1.jpg'] },
        { id: 8032, facilityId: 16, facilityName: '步道', formType: 'professional_structure', date: '2025-04-21', inspector: '張建輝、莊孟矩、陳瑞宗', inspectUnit: '宜順工程顧問股份有限公司', inspectNo: '橫流溪－114－1K+200步道', position: '1K+200步道', structType: '步道 碎石路面', level: 'A級', icLevel: null, deru_d: 0, deru_e: 1, deru_r: 1, deru_u: 1, deru_label: 'A級 例行維護（定期檢測）', findings: '道路兩旁雜草叢生，需定期維護；救生圈遺失。', action: '例行維護（定期檢測）', appearanceOther: '', status: '完成', priority: '低', weather: '晴', maintenanceStart: '2025-04-21', photos: ['/webapp/assets/inspection-photos/114/1200T_1.jpg'] },
        { id: 8033, facilityId: 16, facilityName: '步道', formType: 'professional_structure', date: '2025-04-21', inspector: '張建輝、莊孟矩、陳瑞宗', inspectUnit: '宜順工程顧問股份有限公司', inspectNo: '橫流溪－114－1K+290步道', position: '1K+290步道', structType: '步道 碎石路面', level: 'A級', icLevel: null, deru_d: 0, deru_e: 1, deru_r: 1, deru_u: 1, deru_label: 'A級 例行維護（定期檢測）', findings: '道路兩旁雜草叢生不易行走，需定期維護；救生圈遺失。', action: '例行維護（定期檢測）', appearanceOther: '', status: '完成', priority: '低', weather: '晴', maintenanceStart: '2025-04-21', photos: ['/webapp/assets/inspection-photos/114/1290T_1.jpg'] },
        { id: 8034, facilityId: 17, facilityName: '平臺1', formType: 'professional_structure', date: '2025-04-21', inspector: '張建輝、莊孟矩、陳瑞宗', inspectUnit: '宜順工程顧問股份有限公司', inspectNo: '橫流溪－114－平臺1', position: '1K+290步道', structType: '平台 木材/鋼材', level: 'B級,B2級', icLevel: null, deru_d: 2, deru_e: 2, deru_r: 2, deru_u: 3, deru_label: 'B2級 1～3年內應處理維護', findings: '步道1K+170~1K+290之平台及護欄之木材已多處損耗，建議進行替換，並進行環境整理(雜草)', action: '1～3年內處理維護（重建／補強）', appearanceOther: '木材料破損、彎曲且護木漆已耗損', status: '待處理', priority: '中', weather: '晴', maintenanceStart: '2025-04-21', photos: ['/webapp/assets/inspection-photos/114/P1_1.jpg', '/webapp/assets/inspection-photos/114/P1_2.jpg'] },
        { id: 8035, facilityId: 18, facilityName: '平臺2', formType: 'professional_structure', date: '2025-04-21', inspector: '張建輝、莊孟矩、陳瑞宗', inspectUnit: '宜順工程顧問股份有限公司', inspectNo: '橫流溪－114－平臺2', position: '1K+280步道', structType: '平台 木材/鋼材', level: 'B級,B2級', icLevel: null, deru_d: 2, deru_e: 2, deru_r: 2, deru_u: 3, deru_label: 'B2級 1～3年內應處理維護', findings: '步道1K+170~1K+290之平台及護欄之木材已多處損耗，建議進行替換，並進行環境整理(雜草)', action: '1～3年內處理維護（重建／補強）', appearanceOther: '木材料破損、彎曲且護木漆已耗損', status: '待處理', priority: '中', weather: '晴', maintenanceStart: '2025-04-21', photos: ['/webapp/assets/inspection-photos/114/P2_1.jpg', '/webapp/assets/inspection-photos/114/P2_2.jpg'] },
        { id: 8036, facilityId: 19, facilityName: '平臺3', formType: 'professional_structure', date: '2025-04-21', inspector: '張建輝、莊孟矩', inspectUnit: '宜順工程顧問股份有限公司', inspectNo: '橫流溪－114－平臺3', position: '1K+225步道', structType: '平台 木材/鋼材', level: 'B級,B2級', icLevel: null, deru_d: 2, deru_e: 2, deru_r: 2, deru_u: 3, deru_label: 'B2級 1～3年內應處理維護', findings: '步道1K+170~1K+290之平台及護欄之木材已多處損耗，建議進行替換，並進行環境整理(雜草)', action: '1～3年內處理維護（重建／補強）', appearanceOther: '木材料破損、彎曲且護木漆已耗損', status: '待處理', priority: '中', weather: '晴', maintenanceStart: '2025-04-21', photos: ['/webapp/assets/inspection-photos/114/P3_1.jpg', '/webapp/assets/inspection-photos/114/P3_2.jpg'] },
        { id: 8037, facilityId: 20, facilityName: '平臺4', formType: 'professional_structure', date: '2025-04-21', inspector: '張建輝、莊孟矩、陳瑞宗', inspectUnit: '宜順工程顧問股份有限公司', inspectNo: '橫流溪－114－平臺4', position: '1K+170步道', structType: '平台 木材/鋼材', level: 'B級,B2級', icLevel: null, deru_d: 2, deru_e: 2, deru_r: 2, deru_u: 3, deru_label: 'B2級 1～3年內應處理維護', findings: '步道1K+170~1K+290之平台及護欄之木材已多處損耗，建議進行替換，並進行環境整理(雜草)', action: '1～3年內處理維護（重建／補強）', appearanceOther: '木材料破損、彎曲且護木漆已耗損', status: '待處理', priority: '中', weather: '晴', maintenanceStart: '2025-04-21', photos: ['/webapp/assets/inspection-photos/114/P4_1.jpg', '/webapp/assets/inspection-photos/114/P4_2.jpg'] },
        // ── 114~115年 一般性定期巡查（護管員例行巡查，附錄一表單）──
        { id: 9001, facilityId: 16, facilityName: '橫流溪全段（步道0K+000~1K+290）', formType: 'general_periodic', date: '2025-11-26', inspector: '張森源、汪竣泰', inspectUnit: '林業保育署臺中分署麗陽工作站', weather: '晴', findings: '步道正常；邊坡正常；平臺/護欄正常；護岸正常；魚道/防砂設施正常；告示牌/解說牌正常；救生圈正常', action: '繼續定期巡查', status: '完成', priority: '低', photos: [] },
        { id: 9002, facilityId: 16, facilityName: '橫流溪全段（步道0K+000~1K+290）', formType: 'general_periodic', date: '2025-12-30', inspector: '陳英吉、汪竣泰', inspectUnit: '林業保育署臺中分署麗陽工作站', weather: '晴', findings: '步道正常；邊坡正常；平臺/護欄正常；護岸正常；魚道/防砂設施正常；告示牌/解說牌正常；救生圈正常', action: '繼續定期巡查', status: '完成', priority: '低', photos: [] },
        { id: 9003, facilityId: 16, facilityName: '橫流溪全段（步道0K+000~1K+290）', formType: 'general_periodic', date: '2026-01-29', inspector: '張森源、汪竣泰', inspectUnit: '林業保育署臺中分署麗陽工作站', weather: '', findings: '步道正常；邊坡正常；平臺/護欄正常；護岸正常；魚道/防砂設施發現■結構外觀破損（座標24.186274°N,120.909574°E），需通知分署及專業技師評估；告示牌/解說牌正常；救生圈正常', action: '異常通報：魚道/防砂設施結構外觀破損，通知分署安排專業評估', status: '待處理', priority: '中', photos: [] },
        { id: 9004, facilityId: 16, facilityName: '橫流溪全段（步道0K+000~1K+290）', formType: 'general_periodic', date: '2026-02-24', inspector: '張森源、陳英吉', inspectUnit: '林業保育署臺中分署麗陽工作站', weather: '', findings: '步道正常；邊坡正常；平臺/護欄正常；護岸正常；魚道/防砂設施正常；告示牌/解說牌正常；救生圈正常', action: '繼續定期巡查', status: '完成', priority: '低', photos: [] },
        { id: 9005, facilityId: 16, facilityName: '橫流溪全段（步道0K+000~1K+290）', formType: 'general_periodic', date: '2026-03-31', inspector: '張森源、汪竣泰', inspectUnit: '林業保育署臺中分署麗陽工作站', weather: '', findings: '步道正常；邊坡正常；平臺/護欄正常；護岸正常；魚道/防砂設施正常；告示牌/解說牌正常；救生圈正常', action: '繼續定期巡查', status: '完成', priority: '低', photos: [] },
        { id: 9006, facilityId: 16, facilityName: '橫流溪全段（步道0K+000~1K+290）', formType: 'general_periodic', date: '2026-04-29', inspector: '張森源、汪竣泰', inspectUnit: '林業保育署臺中分署麗陽工作站', weather: '', findings: '步道正常；邊坡正常；平臺/護欄正常；護岸正常；魚道/防砂設施正常；告示牌/解說牌正常；救生圈正常', action: '繼續定期巡查', status: '完成', priority: '低', photos: [] },
      ],
      settings: {
        lastUpdate: new Date().toISOString(),
        version: this.VERSION,
        syncTimestamp: 0,
        initializedFromSeed: true,
        cloudSyncKnown: false
      }
    };
    const facilityTableOrder = {
      '1-1': 1, '1-2': 2, '2': 3, '3': 4, '4': 5, '5-1': 6, '5-2': 7,
      '6': 8, '7': 9, '8-1': 10, '8-2': 11, '9': 12, '10': 13, '11': 14,
      'RA': 15, 'T1': 16, 'P1': 17, 'P2': 18, 'P3': 19, 'P4': 20
    };
    data.facilities.forEach(f => {
      const facilityNo = f.facilityNo || f.location || (String(f.name || '').match(/溪構[\d-]+/) || [f.name || '-'])[0];
      f.facilityNo = facilityNo;
      f.tableOrder = facilityTableOrder[f.code] || f.id;
      f.sourceTableNo = f.sourceTableNo || facilityNo;
      f.tableLocation = f.tableLocation || f.stationKm || f.location || '-';
      f.tableMaterial = f.tableMaterial || f.material || '-';
      f.tableTwd97X = f.twd97x ?? '-';
      f.tableTwd97Y = f.twd97y ?? '-';
    });
    data.facilities.sort((a, b) => (a.tableOrder || a.id) - (b.tableOrder || b.id));
    data.inspections = this._normalizeInspections(this._dedupeInspections(data.inspections).list);
    localStorage.setItem(this.KEY, JSON.stringify(data));
    return data;
  },

  // 儲存資料
  save(data, options = {}) {
    data.settings = data.settings || {};
    data.settings.lastUpdate    = new Date().toISOString();
    data.settings.version       = data.settings.version || this.VERSION;
    data.settings.initializedFromSeed = false;
    data.settings.syncTimestamp = Date.now(); // 供 CloudSync 比較新舊
    if (Array.isArray(data.inspections)) {
      data.inspections = this._normalizeInspections(this._dedupeInspections(data.inspections).list);
    }
    localStorage.setItem(this.KEY, JSON.stringify(data));
    // 穩定模式：一般儲存只更新本機快取，不再自動推送雲端。
    // 跨設備同步必須由管理者明確按「↑ 推送」，避免新設備或舊快取覆蓋正式資料。
    if (options.allowCloudPush === true && !this._suppressCloudPush && !options.suppressCloudPush && window.CloudSync?.isOnline) {
      CloudSync.push(data, { manual: true });
    }
  },

  // CRUD 操作
  getAll(collection) { return this.load()[collection] || []; },

  getById(collection, id) {
    return this.getAll(collection).find(item => item.id === id);
  },

  insert(collection, item, options = {}) {
    const data = this.load();
    const items = data[collection] || [];
    const maxId = items.length > 0 ? Math.max(...items.map(i => i.id)) : 0;
    item.id = maxId + 1;
    item.createdAt = new Date().toISOString();
    items.push(item);
    data[collection] = items;
    this.save(data, options);
    return item;
  },

  update(collection, id, updates, options = {}) {
    const data = this.load();
    const items = data[collection] || [];
    const idx = items.findIndex(i => i.id === id);
    if (idx === -1) return null;
    items[idx] = { ...items[idx], ...updates, updatedAt: new Date().toISOString() };
    data[collection] = items;
    this.save(data, options);
    return items[idx];
  },

  delete(collection, id, options = {}) {
    const data = this.load();
    data[collection] = (data[collection] || []).filter(i => i.id !== id);
    this.save(data, options);
  },

  // 匯出 JSON
  export() {
    return JSON.stringify(this.load(), null, 2);
  },

  // 匯入 JSON
  import(jsonStr) {
    const data = JSON.parse(jsonStr);
    this.save(data);
  }
};
