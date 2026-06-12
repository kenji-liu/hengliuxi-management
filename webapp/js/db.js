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
  VERSION: '3.9',  // DER評等更新：溪構11(C4-C5)、溪構5-2(C4-C5)、溪構4(C4-C5)等修正

  // 讀取所有資料
  load() {
    try {
      const raw = localStorage.getItem(this.KEY);
      if (!raw) {
        console.log('[DB] No data found, initializing...');
        return this.init();
      }
      const data = JSON.parse(raw);
      // 版本檢查：若版本不符則清除舊資料並重新初始化
      if (!data.settings?.version || data.settings.version !== this.VERSION) {
        console.warn(`[DB] ⚠️ Version mismatch detected: old=${data.settings?.version}, new=${this.VERSION}`);
        console.log('[DB] Clearing localStorage and reinitializing with fresh data...');
        localStorage.removeItem(this.KEY);  // 明確清除舊資料
        const freshData = this.init();
        console.log('[DB] ✅ Fresh data initialized with VERSION', this.VERSION);
        return freshData;
      }
      console.log('[DB] ✓ Loaded existing data (VERSION:', data.settings.version + ')');
      return data;
    } catch (e) {
      console.error('[DB] Load error:', e);
      console.log('[DB] Clearing corrupted data and reinitializing...');
      localStorage.removeItem(this.KEY);  // 發生錯誤也清除舊資料
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
          derLevel: 'C4-C5', assessmentDate: '2025-01-10', riskScore: 95, maintenanceStrategy: '升級式', retirementEligible: true, evaluationNotes: '颱風後入口完全堵塞，喪失魚道通行功能；棲地連通性嚴重受損，需評估升級改造或更新',
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
          derLevel: 'C4-C5', assessmentDate: '2025-02-20', riskScore: 68, maintenanceStrategy: '反應式', retirementEligible: false, evaluationNotes: '池壁裂縫與基礎侵蝕為主要劣化因素，需優先進行基礎補強與混凝土修復',
          river_segment: '橫流溪上游', anomaly_type: '裂縫|侵蝕|破損', anomaly_level: '高', maintenance_priority: '高',
          judgement_basis: '池壁出現裂縫，基礎受洪水侵蝕，混凝土局部裸露，健康指數38分，需優先進行基礎補強與混凝土修復工程',
          note: '階段式魚道（溪構4），1K+170節點；各水池高差0.15~0.3m；部分池壁有裂縫，基礎受侵蝕，混凝土局部裸露；流速3.2m/s（107年）；建議優先維護',
          photos: ['/webapp/assets/report-photos/manual-p38-03-665x498.jpg', '/02_魚類與棲地資料庫/解說牌/階段式魚道_0.png'] },

        { id: 10, name: '溪構3 斜坡式魚道', type: '魚道', subType: '斜坡式', code: '3', stationKm: '1K+225', location: '溪構3', twd97x: 240873, twd97y: 2675532, lat: 24.185158, lng: 120.910163, km_num: 1225,
          year: 108, status: '正常', material: '混凝土/塊石', length: 35, width: 1.2, condition: 4, lastInspect: '2025-03-15', source: '107-108成果報告 / 維護管理手冊表5-1',
          derLevel: 'B1-I', assessmentDate: '2025-03-15', riskScore: 26, maintenanceStrategy: '預防式', retirementEligible: false, evaluationNotes: '坡面設計合理，通行效果良好，纓口臺鰍及臺灣白甲魚可順利通過',
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
          derLevel: 'B1-I', assessmentDate: '2025-03-15', riskScore: 30, maintenanceStrategy: '預防式', retirementEligible: false, evaluationNotes: '與粗石魚道併設功能互補，通行率佳，建議監測磨耗狀況',
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
          photos: ['/webapp/assets/report-photos/manual-p39-05-665x498.jpg'] },

        { id: 16, name: '步道', type: '步道', subType: '溪濱步道', code: 'T1', stationKm: '0K+000~1K+290', location: '步道 0K+000~1K+290', twd97x: null, twd97y: null, lat: 24.182000, lng: 120.909200, km_num: 0,
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
        { id: 1, species: '臺灣白甲魚', scientificName: 'Onychostoma barbatulum', family: '鯉科', conservation: '易危', location: '橫流溪全流域（以上游1K+170~1K+400優勢）', count: 73, date: '2018-05-29', method: '電魚', recorder: '107-108成果報告', note: '107年調查73尾；102~108年累計358尾，為數量最多保育魚種；偏好礫石底質急流，對魚道通行率敏感；報告書封溪護魚保護物種' },
        { id: 2, species: '粗首馬口鱲', scientificName: 'Zacco pachycephalus', family: '鯉科', conservation: '一般', location: '橫流溪中游（0K+460~1K+000）', count: 32, date: '2018-05-29', method: '電魚', recorder: '107-108成果報告', note: '107年調查32尾；102~108年累計191尾，族群穩定；中游礫石淺灘為主要棲息地；報告書封溪護魚保護物種' },
        { id: 3, species: '臺灣鬚鱲', scientificName: 'Candidia barbata', family: '鯉科', conservation: '一般', location: '橫流溪中游', count: 36, date: '2018-05-29', method: '電魚', recorder: '107-108成果報告', note: '107年調查36尾；102~108年累計141尾；偏好中流速礫石底質環境；報告書封溪護魚保護物種' },
        { id: 4, species: '臺灣石魚賓', scientificName: 'Acrossocheilus paradoxus', family: '鯉科', conservation: '近危', location: '橫流溪全流域（1K+225附近深潭及全段）', count: 30, date: '2018-05-29', method: '電魚', recorder: '107-108成果報告', note: '107年調查30尾；102~108年累計191尾；特有種，偏好底部緩流及礫石縫隙；報告書封溪護魚保護物種；與臺灣白甲魚為主要WUA分析物種' },
        { id: 5, species: '纓口臺鰍', scientificName: 'Formosania lacustre', family: '爬鰍科', conservation: '易危', location: '橫流溪上游至中游礫石急流', count: 28, date: '2018-05-29', method: '電魚', recorder: '107-108成果報告', note: '107年調查；特有種；底棲吸附型，偏好礫石急流底面；為AI影像辨識訓練物種之一；109~114年調查累計157尾' },
        { id: 6, species: '明潭吻鰕虎', scientificName: 'Rhinogobius candidianus', family: '鰕虎科', conservation: '一般', location: '橫流溪中下游', count: 35, date: '2018-05-29', method: '電魚', recorder: '107-108成果報告', note: '107年調查35尾；102~108年累計57尾；底棲性，偏好卵石、礫石底質急流段；為AI影像辨識訓練物種' },
        { id: 7, species: '臺灣間爬岩鰍', scientificName: 'Hemimyzon formosanus', family: '爬鰍科', conservation: '近危', location: '橫流溪上游礫石底質', count: 26, date: '2018-05-29', method: '電魚', recorder: '107-108成果報告', note: '107年調查26尾；102~108年累計86尾；底棲吸附型，偏好礫石急流；為指標性特有種；為AI影像辨識訓練物種' },
        { id: 8, species: '短臀瘋鱨', scientificName: 'Tachysurus brevianalis', family: '鱨科', conservation: '易危', location: '橫流溪深潭及岩石縫隙', count: 4, date: '2019-04-17', method: '電魚', recorder: '107-108成果報告', note: '108年調查4尾；102~108年累計6尾；夜行性，偏好深潭岩縫；特有種，族群數量稀少需持續監測' },
        { id: 9, species: '短吻紅斑吻鰕虎', scientificName: 'Rhinogobius rubromaculatus', family: '鰕虎科', conservation: '近危', location: '橫流溪下游', count: 2, date: '2019-04-17', method: '電魚', recorder: '107-108成果報告', note: '108年新記錄2尾；特有種，分布侷限，族群稀少；上溯能力較明潭吻鰕虎差，最大可溯水位落差20cm；與明潭吻鰕虎共域分布' },
        { id: 10, species: '臺灣白甲魚', scientificName: 'Onychostoma barbatulum', family: '鯉科', conservation: '易危', location: '橫流溪全流域', count: 30, date: '2025-03-10', method: '電魚', recorder: '115年生態調查', note: '115年春季調查30尾；溪構1-1、1-2魚道上下游均有記錄，魚道通行效果良好' },
        { id: 11, species: '臺灣石魚賓', scientificName: 'Acrossocheilus paradoxus', family: '鯉科', conservation: '近危', location: '橫流溪全流域', count: 22, date: '2025-03-10', method: '電魚', recorder: '115年生態調查', note: '115年春季調查22尾；全流域均有分布，109~114年累計288尾，為橫流溪第二多族群魚種' }
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
        { id: 1, facilityId: 7, facilityName: '溪構5-2 潛越式魚道', date: '2025-01-10', inspector: '張技士', weather: '晴', findings: '入口遭颱風帶入土石完全堵塞，魚類無法通行，池壁左側出現縱向裂縫約20cm', action: '提報緊急維護計畫，申請預算清除堵塞土石', status: '待處理', priority: '緊急', photos: [] },
        { id: 2, facilityId: 3, facilityName: '溪構11 階梯式固床工', date: '2025-01-10', inspector: '張技士', weather: '晴', findings: '左岸翼牆出現細裂縫約15cm，鋼筋有鏽蝕現象，需儘速修補防止擴大', action: '提報維護計畫，安排鋼筋防蝕處理', status: '待處理', priority: '高', photos: [] },
        { id: 3, facilityId: 9, facilityName: '溪構4 階段式魚道', date: '2025-02-20', inspector: '李技士', weather: '陰', findings: '魚道基礎受洪水侵蝕，混凝土局部裸露；第3、4水池間導流牆偏移約5cm', action: '安排基礎補強工程評估', status: '處理中', priority: '高', photos: [] },
        { id: 4, facilityId: 1, facilityName: '溪構8-2 之字形魚道', date: '2025-03-15', inspector: '王技士', weather: '晴', findings: '魚道水流正常，觀察到臺灣白甲魚及纓口臺鰍由下游往上游通行；步道扶手完整', action: '繼續定期監測', status: '完成', priority: '低', photos: [] },
        { id: 5, facilityId: 5, facilityName: '溪構6 階段式魚道', date: '2025-03-15', inspector: '王技士', weather: '晴', findings: '各水池水深0.3~0.5m，流速符合通行標準；觀察到粗首馬口鱲及明潭吻鰕虎通過', action: '繼續監測', status: '完成', priority: '低', photos: [] },
        { id: 6, facilityId: 13, facilityName: '溪構1-1 粗石斜曲面式魚道', date: '2025-03-15', inspector: '陳技士', weather: '晴', findings: '粗石坡面完整，水流分布均勻；記錄臺灣白甲魚及纓口臺鰍成功通行', action: '繼續監測', status: '完成', priority: '低', photos: [] }
      ],
      settings: { lastUpdate: new Date().toISOString(), version: this.VERSION }
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
    this.save(data);
    return data;
  },

  // 儲存資料
  save(data) {
    data.settings = data.settings || {};
    data.settings.lastUpdate = new Date().toISOString();
    data.settings.version = data.settings.version || this.VERSION;
    localStorage.setItem(this.KEY, JSON.stringify(data));
    data.settings.version = data.settings.version || this.VERSION;  // 確保版本信息被保留
    localStorage.setItem(this.KEY, JSON.stringify(data));
  },

  // CRUD 操作
  getAll(collection) { return this.load()[collection] || []; },

  getById(collection, id) {
    return this.getAll(collection).find(item => item.id === id);
  },

  insert(collection, item) {
    const data = this.load();
    const items = data[collection] || [];
    const maxId = items.length > 0 ? Math.max(...items.map(i => i.id)) : 0;
    item.id = maxId + 1;
    item.createdAt = new Date().toISOString();
    items.push(item);
    data[collection] = items;
    this.save(data);
    return item;
  },

  update(collection, id, updates) {
    const data = this.load();
    const items = data[collection] || [];
    const idx = items.findIndex(i => i.id === id);
    if (idx === -1) return null;
    items[idx] = { ...items[idx], ...updates, updatedAt: new Date().toISOString() };
    data[collection] = items;
    this.save(data);
    return items[idx];
  },

  delete(collection, id) {
    const data = this.load();
    data[collection] = (data[collection] || []).filter(i => i.id !== id);
    this.save(data);
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
