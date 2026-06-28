/**
 * 橫流溪管理平台 — 雲端主控同步模組
 * 使用 Firebase Firestore 作為正式資料來源，前端只在受控流程下寫入
 *
 * 架構：
 *   localStorage（本機快取）← Firestore（雲端真相來源）
 *   一般 DB.save() 只更新本機，不自動寫入雲端
 *   只有管理者手動按「↑ 推送」且通過資料驗證，才可覆蓋 Firestore
 *
 * 設定方式：
 *   使用者在平台「設定 > 雲端同步」輸入 Firebase Config JSON
 *   儲存於 localStorage，之後每次載入自動連線
 */

const CloudSync = (() => {
  const LS_CONFIG_KEY  = 'FIREBASE_CONFIG';
  const LS_DEVICE_KEY  = 'DEVICE_ID';
  const DOC_PATH       = 'hengliuxi/main';
  const SERVER_DB_ENDPOINT = '/api/sync/database';
  const PUSH_DEBOUNCE  = 1500;  // ms：防抖，避免連續儲存觸發過多推送
  const STALE_GUARD    = 3000;  // ms：遠端資料至少比本機新 3 秒才接受
  const STABLE_SCHEMA_VERSION = 'HLX_MAINTENANCE_STABLE_20260626';
  const MIN_FACILITY_COUNT = 19;
  const REQUIRED_FACILITY_CODES = ['1-1', '1-2', '2', '3', '4', '5-1', '5-2', '6', '7', '8-1', '8-2', '9', '10', '11', 'RA', 'P1', 'P2', 'P3', 'P4'];

  let _app        = null;
  let _db         = null;
  let _docRef     = null;
  let _unsubscribe = null;
  let _deviceId   = null;
  let _lastPushAt = 0;
  let _pushTimer  = null;
  let _status     = 'offline';  // 'offline' | 'connecting' | 'online' | 'error'
  let _mode       = 'none';     // 'none' | 'firebase' | 'server'
  let _listeners  = [];         // status change callbacks
  let _remoteTs   = 0;
  let _remoteExists = false;

  function _getDeviceId() {
    let id = localStorage.getItem(LS_DEVICE_KEY);
    if (!id) {
      id = 'dev_' + Math.random().toString(36).slice(2, 10) + '_' + Date.now();
      localStorage.setItem(LS_DEVICE_KEY, id);
    }
    return id;
  }

  function _setStatus(s) {
    _status = s;
    _listeners.forEach(fn => { try { fn(s); } catch(_) {} });
    _updateStatusUI(s);
  }

  function _validateFacilityDataset(data) {
    if (!data || !Array.isArray(data.facilities)) {
      return { ok: false, reason: '缺少工程設施資料表' };
    }

    const facilities = data.facilities;
    if (facilities.length < MIN_FACILITY_COUNT) {
      return { ok: false, reason: `工程設施數量 ${facilities.length} 筆，少於正式盤點至少 ${MIN_FACILITY_COUNT} 筆` };
    }

    const codes = new Set(facilities.map(f => String(f.code || '').trim()).filter(Boolean));
    const names = facilities.map(f => String(f.name || f.facilityName || '').trim()).join('｜');
    const missing = REQUIRED_FACILITY_CODES.filter(code => {
      if (codes.has(code)) return false;
      if (code === 'RA') return !/護岸/.test(names);
      if (/^P\d$/.test(code)) return !new RegExp(`平台\\s*${code.slice(1)}`).test(names);
      return !names.includes(`溪構${code}`);
    });

    if (missing.length) {
      return { ok: false, reason: `缺少正式設施代碼：${missing.join('、')}` };
    }

    return { ok: true, reason: '橫流溪正式設施資料檢核通過' };
  }

  function _normalizeCloudData(data, ts, mode) {
    const normalized = { ...data };
    delete normalized._ts;
    delete normalized._deviceId;
    normalized.settings = {
      ...(normalized.settings || {}),
      version: normalized.settings?.version || DB.VERSION,
      syncTimestamp: ts,
      initializedFromSeed: false,
      cloudSyncKnown: true,
      cloudSchemaVersion: STABLE_SCHEMA_VERSION,
      [mode === 'push' ? 'cloudPushedAt' : 'cloudPulledAt']: new Date(ts || Date.now()).toISOString()
    };
    return normalized;
  }

  function _rejectInvalidRemote(remote, sourceLabel) {
    const validation = _validateFacilityDataset(remote);
    if (validation.ok) return false;
    console.warn(`[CloudSync] 已拒絕${sourceLabel}資料：${validation.reason}`, remote);
    showToast?.(`已拒絕雲端資料：${validation.reason}。請由主控設備重新推送正式資料。`, 'warning');
    return true;
  }

  function _updateStatusUI(s) {
    const el      = document.getElementById('cloudSyncStatus');
    const pullBtn = document.getElementById('syncPullBtn');
    const pushBtn = document.getElementById('syncPushBtn');
    if (!el) return;
    const map = {
      offline:    { icon: '⚫', text: '未連線',  color: '#94a3b8' },
      connecting: { icon: '🔄', text: '連線中…', color: '#d97706' },
      online:     { icon: '🟢', text: _mode === 'server' ? 'Render同步' : '雲端連線', color: '#16a34a' },
      error:      { icon: '🔴', text: '同步錯誤', color: '#dc2626' },
    }[s] || { icon: '⚫', text: s, color: '#94a3b8' };
    el.textContent = map.icon + ' ' + map.text;
    el.style.color = map.color;
    // 連線後才顯示拉取/推送按鈕
    const show = s === 'online' ? 'inline-block' : 'none';
    if (pullBtn) pullBtn.style.display = show;
    if (pushBtn) pushBtn.style.display = show;
  }

  /** 啟動 Firestore 即時監聽 */
  /**
   * 連線後立即比對：雲端有資料且比本機新 → 自動拉取並刷新頁面
   * 雲端為空 → 僅在本機不是 seed 資料時才可建立初始版本
   */
  async function _initSync() {
    try {
      const snap = await _docRef.get();
      _remoteExists = snap.exists;

      if (!snap.exists) {
        // Firestore 尚無資料時也不自動建立，避免任一新設備把本機舊資料變成雲端真相來源。
        console.log('[CloudSync] 雲端尚無資料，等待主控設備手動推送正式資料');
        showToast?.('雲端尚無正式資料；請由主控設備按「↑ 推送」建立正式版本。', 'warning');
        return;
      }

      // Firestore 有資料 → 比較時間戳
      const remote = snap.data();
      if (_rejectInvalidRemote(remote, '初始化雲端')) return;
      const remoteTs = remote._ts || 0;
      _remoteTs = remoteTs;
      let localTs = 0;
      let localIsSeed = false;
      let localCloudKnown = false;
      try {
        const local = JSON.parse(localStorage.getItem(DB.KEY) || '{}');
        localTs = local?.settings?.syncTimestamp || 0;
        localIsSeed = !!local?.settings?.initializedFromSeed;
        localCloudKnown = !!local?.settings?.cloudSyncKnown;
      } catch(_) {}

      if (localIsSeed || !localCloudKnown || remoteTs >= localTs) {
        // 新設備或尚未建立雲端基準者，一律以雲端資料為真相來源。
        const data = _normalizeCloudData(remote, remoteTs, 'pull');
        localStorage.setItem(DB.KEY, JSON.stringify(data));
        console.log('[CloudSync] 初始化：雲端資料較新，已拉取 ts:', new Date(remoteTs).toLocaleTimeString());
        // 拉取後只做本機靜默校正，不由新設備自動回寫雲端。
        if (typeof window.syncFacilityStatusToInspections === 'function') {
          const result = window.syncFacilityStatusToInspections(true);
          if ((result?.updated || 0) + (result?.cleaned || 0) > 0) {
            console.log('[CloudSync] 本機靜默校正完成，未自動推送雲端', result);
          }
        }
        _showSyncToast('雲端初始化', remoteTs);
        _refreshCurrentPage();
      } else if (localTs > remoteTs + 5000) {
        // 為避免新設備或舊快取覆蓋雲端，初始化階段不自動推送。
        console.warn('[CloudSync] 初始化：本機時間較新，但需手動推送才會覆蓋雲端');
        showToast?.('本機資料時間較新；為避免誤覆蓋雲端，請確認後手動按「↑ 推送」。', 'warning');
      }
    } catch(e) {
      console.warn('[CloudSync] 初始化同步失敗', e);
    }
  }

  function _startListener() {
    if (_unsubscribe) { _unsubscribe(); _unsubscribe = null; }

    _unsubscribe = _docRef.onSnapshot(snap => {
      if (!snap.exists) return;
      const remote = snap.data();
      if (_rejectInvalidRemote(remote, '雲端更新')) return;
      const remoteTs   = remote._ts        || 0;
      const remoteDev  = remote._deviceId  || '';

      // 忽略自己推的（避免迴圈）
      if (remoteDev === _deviceId) return;

      // 取得本機時間戳
      let localTs = 0;
      try {
        const local = JSON.parse(localStorage.getItem(DB.KEY) || '{}');
        localTs = local?.settings?.syncTimestamp || 0;
      } catch(_) {}

      // 遠端比本機新才接受
      if (remoteTs > localTs + STALE_GUARD) {
        const data = _normalizeCloudData(remote, remoteTs, 'pull');
        _remoteTs = remoteTs;
        _remoteExists = true;

        localStorage.setItem(DB.KEY, JSON.stringify(data));
        console.log('[CloudSync] 收到遠端更新 ts:', new Date(remoteTs).toLocaleTimeString());

        // 收到遠端資料後只做本機靜默校正，避免監聽回呼造成雲端覆寫。
        if (typeof window.syncFacilityStatusToInspections === 'function') {
          window.syncFacilityStatusToInspections(true);
        }
        _showSyncToast(remoteDev, remoteTs);
        _refreshCurrentPage();
      }
    }, err => {
      console.error('[CloudSync] 監聽錯誤', err);
      _setStatus('error');
    });

    _setStatus('online');
  }

  function _showSyncToast(deviceId, ts) {
    const timeStr = new Date(ts).toLocaleTimeString('zh-TW');
    if (typeof showToast === 'function') {
      showToast(`📡 已同步其他裝置更新（${deviceId.slice(0, 8)}… ${timeStr}）`, 'info');
    }
  }

  function _refreshCurrentPage() {
    // 等 100ms 讓 localStorage 穩定後再刷新
    setTimeout(() => {
      const page = window._currentPage || '';
      const renderFns = {
        facilities:    window.renderFacilities,
        fish:          window.renderFish,
        inspection:    window.renderInspection,
        'inspection-data': window.renderInspection,
        habitat:       window.renderHabitat,
        dashboard:     window.renderDashboard,
      };
      const fn = renderFns[page];
      if (typeof fn === 'function') {
        fn();
      } else if (page) {
        // fallback：觸發頁面切換
        const navEl = document.querySelector(`.nav-item[data-page="${page}"]`);
        if (navEl) navEl.click();
      }
    }, 100);
  }

  function _verifyPushPassword() {
    const storedPwd = localStorage.getItem('SYNC_PUSH_PASSWORD') || '';
    if (!storedPwd) {
      showToast?.('已阻擋推送：尚未設定推送密碼，請先到同步設定建立管理者密碼。', 'warning');
      return false;
    }
    const entered = window.prompt('請輸入同步推送密碼：');
    if (entered === null) return false;
    if (entered.trim() !== storedPwd) {
      showToast?.('❌ 密碼錯誤，無法推送', 'error');
      return false;
    }
    return true;
  }

  async function _fetchServerDatabase() {
    const resp = await fetch(SERVER_DB_ENDPOINT, {
      method: 'GET',
      cache: 'no-store',
      headers: {
        'Accept': 'application/json',
        'X-Device-Id': _deviceId || ''
      }
    });
    const json = await resp.json().catch(() => ({}));
    if (!resp.ok || json.success === false) {
      throw new Error(json.error || `HTTP ${resp.status}`);
    }
    return json;
  }

  async function _serverPushData(data, now, options = {}) {
    const token = localStorage.getItem('SYNC_PUSH_TOKEN') || '';
    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'X-Device-Id': _deviceId || ''
    };
    if (token) headers['X-Sync-Token'] = token;

    const resp = await fetch(SERVER_DB_ENDPOINT, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        data: {
          ...data,
          _ts: now,
          _deviceId: _deviceId
        },
        deviceId: _deviceId,
        force: options.force === true
      })
    });
    const json = await resp.json().catch(() => ({}));
    if (!resp.ok || json.success === false) {
      throw new Error(json.error || `HTTP ${resp.status}`);
    }
    return json;
  }

  async function _serverPull(showMessage = true) {
    if (showMessage) showToast?.('正在從同網址後端拉取資料…', 'info');
    const json = await _fetchServerDatabase();
    if (!json.exists || !json.data) {
      showToast?.('後端尚無正式資料；請由主控設備先按「↑ 推送」。', 'warning');
      _remoteExists = false;
      return false;
    }

    const remote = json.data;
    if (_rejectInvalidRemote(remote, '後端同步')) return false;
    const remoteTs = Number(json.syncTimestamp || remote._ts || Date.now());
    const normalized = _normalizeCloudData(remote, remoteTs, 'pull');
    _remoteTs = remoteTs;
    _remoteExists = true;
    localStorage.setItem(DB.KEY, JSON.stringify(normalized));
    if (typeof window.syncFacilityStatusToInspections === 'function') {
      window.syncFacilityStatusToInspections(true);
    }
    if (showMessage) showToast?.('✅ 已從同網址後端拉取最新資料', 'success');
    _refreshCurrentPage();
    return true;
  }

  /** 連線 Firebase Firestore（持久＋即時跨裝置）。成功回傳 true。 */
  async function _initFirebaseSync(cfg) {
    _setStatus('connecting');
    try {
      if (!window.firebase) throw new Error('Firebase SDK 未載入');
      if (!firebase.apps.length) firebase.initializeApp(cfg);
      _app    = firebase.app();
      _db     = firebase.firestore();
      _docRef = _db.doc(DOC_PATH);

      // 連線驗證：實際向伺服器讀取一次，憑證或 Firestore 規則錯誤會在此拋出，
      // 以便乾淨地退回同網址後端，而非誤判為已連線。
      await _docRef.get({ source: 'server' });

      _mode = 'firebase';
      // 連線後立即比對雲端與本機版本
      await _initSync();
      // 啟動即時監聽：其他裝置推送後自動同步（無需手動拉取）
      _startListener();
      console.log('[CloudSync] 已連線 Firebase Firestore（持久＋即時），裝置 ID:', _deviceId);
      return true;
    } catch(e) {
      console.error('[CloudSync] Firebase 連線失敗', e);
      _app = _db = _docRef = null;
      _mode = 'none';
      return false;
    }
  }

  async function _initServerSync() {
    _mode = 'server';
    _app = _db = _docRef = null;
    _setStatus('connecting');
    try {
      const json = await _fetchServerDatabase();
      _remoteExists = !!json.exists;
      _remoteTs = Number(json.syncTimestamp || 0);

      if (json.exists && json.data) {
        let localTs = 0;
        let localIsSeed = false;
        let localCloudKnown = false;
        try {
          const local = JSON.parse(localStorage.getItem(DB.KEY) || '{}');
          localTs = local?.settings?.syncTimestamp || 0;
          localIsSeed = !!local?.settings?.initializedFromSeed;
          localCloudKnown = !!local?.settings?.cloudSyncKnown;
        } catch(_) {}

        if (localIsSeed || !localCloudKnown || _remoteTs >= localTs) {
          await _serverPull(false);
          _showSyncToast('Render同步', _remoteTs || Date.now());
        } else if (localTs > _remoteTs + 5000) {
          showToast?.('本機資料時間較新；請確認後手動按「↑ 推送」發布到其他裝置。', 'warning');
        }
      } else {
        showToast?.('後端同步已連線，但尚無正式資料；請由主控設備按「↑ 推送」。', 'warning');
      }

      _setStatus('online');
      console.log('[CloudSync] 已啟用同網址後端同步，裝置 ID:', _deviceId);
      return true;
    } catch(e) {
      console.warn('[CloudSync] 同網址後端同步失敗', e);
      _setStatus('error');
      return false;
    }
  }

  async function _serverPushNow() {
    if (_status !== 'online') {
      showToast?.('尚未連線，無法推送', 'error');
      return;
    }
    if (!_verifyPushPassword()) return;

    try {
      const data = JSON.parse(localStorage.getItem(DB.KEY) || '{}');
      if (!data.settings) { showToast?.('本機無資料', 'warning'); return; }
      const validation = _validateFacilityDataset(data);
      if (!validation.ok) {
        showToast?.(`已阻擋推送：${validation.reason}`, 'warning');
        return;
      }

      const remote = await _fetchServerDatabase().catch(() => null);
      if (remote?.exists) {
        const remoteTs = Number(remote.syncTimestamp || 0);
        const localTs = data.settings.syncTimestamp || 0;
        if (data.settings.initializedFromSeed) {
          showToast?.('已阻擋推送：此裝置仍是預設種子資料，請先匯入或拉取正式資料。', 'warning');
          return;
        }
        if (!data.settings.cloudSyncKnown) {
          showToast?.('已阻擋推送：此裝置尚未拉取後端正式資料，請先按「↓ 拉取」。', 'warning');
          return;
        }
        if (remoteTs > localTs + STALE_GUARD) {
          showToast?.('已阻擋推送：後端資料較新，請先拉取後再編輯。', 'warning');
          return;
        }
      }

      const now = Date.now();
      data.settings.syncTimestamp = now;
      data.settings.initializedFromSeed = false;
      data.settings.cloudSyncKnown = true;
      data.settings.cloudSchemaVersion = STABLE_SCHEMA_VERSION;
      data.settings.cloudPushedAt = new Date(now).toISOString();
      data.settings.serverPushedAt = new Date(now).toISOString();
      localStorage.setItem(DB.KEY, JSON.stringify(data));
      await _serverPushData(data, now);
      _remoteTs = now;
      _remoteExists = true;
      _lastPushAt = now;
      showToast?.('✅ 本機資料已發布到同網址後端，其他平板請按「↓ 拉取」更新', 'success');
    } catch(e) {
      showToast?.(`推送失敗：${e.message}`, 'error');
    }
  }

  /* ─────────────────────── 公開 API ─────────────────────── */

  return {
    get status()   { return _status; },
    get deviceId() { return _deviceId; },
    get isOnline() { return _status === 'online'; },

    /**
     * 初始化：有 Firebase 設定時「優先用 Firebase」（持久＋即時跨裝置），
     * 否則才退回同網址 Render 後端同步。
     * ※ Render 免費方案檔案系統為暫時性，部署/休眠會清空執行期推送的資料庫，
     *   故跨平板正式同步應以 Firebase Firestore 為主。
     */
    async init() {
      _deviceId = _getDeviceId();

      // ① 有 Firebase Config → 優先連 Firebase（免費、持久、即時）
      const cfgStr = localStorage.getItem(LS_CONFIG_KEY);
      if (cfgStr) {
        let cfg = null;
        try { cfg = JSON.parse(cfgStr); }
        catch(e) { console.warn('[CloudSync] Firebase config 格式錯誤，改用後端同步'); }
        if (cfg && cfg.apiKey && cfg.projectId) {
          const fbReady = await _initFirebaseSync(cfg);
          if (fbReady) return true;
          console.warn('[CloudSync] Firebase 連線失敗，後備改用同網址 Render 後端同步');
        }
      }

      // ② 無 Firebase 設定或連線失敗 → 後備用同網址 Render 後端
      const serverReady = await _initServerSync();
      if (serverReady) return true;

      _setStatus('offline');
      return false;
    },

    /** 推送本機最新資料到 Firestore（穩定模式下只允許管理者手動流程呼叫） */
    push(data, options = {}) {
      if (_status !== 'online' || !_docRef) return;
      if (options.manual !== true) {
        console.warn('[CloudSync] 背景自動推送已停用，請使用「↑ 推送」手動發布正式資料');
        return;
      }

      clearTimeout(_pushTimer);
      _pushTimer = setTimeout(async () => {
        const now = Date.now();
        if (now - _lastPushAt < 500) return;
        _lastPushAt = now;
        if (data?.settings?.initializedFromSeed && _remoteExists) {
          console.warn('[CloudSync] 阻擋 seed 預設資料推送，避免覆蓋雲端正式資料');
          return;
        }
        const validation = _validateFacilityDataset(data);
        if (!validation.ok) {
          console.warn('[CloudSync] 阻擋不完整本機資料推送：', validation.reason);
          showToast?.(`已阻擋推送：${validation.reason}`, 'warning');
          return;
        }
        const localTs = data?.settings?.syncTimestamp || 0;
        if (_remoteTs && localTs + STALE_GUARD < _remoteTs) {
          console.warn('[CloudSync] 阻擋舊版本機資料推送，請先拉取雲端最新資料');
          showToast?.('雲端資料較新，已阻擋本機舊資料推送；請先按「↓ 拉取」。', 'warning');
          return;
        }
        const payloadData = {
          ...data,
          settings: {
            ...(data.settings || {}),
            syncTimestamp: now,
            initializedFromSeed: false,
            cloudSyncKnown: true,
            cloudSchemaVersion: STABLE_SCHEMA_VERSION,
            cloudPushedAt: new Date(now).toISOString()
          }
        };

        const payload = {
          ...payloadData,
          _ts:       now,
          _deviceId: _deviceId,
        };

        try {
          localStorage.setItem(DB.KEY, JSON.stringify(payloadData));
          await _docRef.set(payload);
          _serverPushData(payloadData, now).catch(err => {
            console.warn('[CloudSync] 同網址後端備援推送失敗', err);
          });
          _remoteTs = now;
          _remoteExists = true;
          console.log('[CloudSync] 已推送', new Date(now).toLocaleTimeString());
        } catch(e) {
          console.warn('[CloudSync] 推送失敗', e);
          _setStatus('error');
          // 嘗試重連
          setTimeout(() => _startListener(), 5000);
        }
      }, PUSH_DEBOUNCE);
    },

    /** 強制從 Firestore 拉取最新資料並覆蓋本機（強制伺服器讀取，忽略快取） */
    async pull() {
      if (_mode === 'server' || !_docRef) {
        await _serverPull(true).catch(e => showToast?.(`拉取失敗：${e.message}`, 'error'));
        return;
      }
      showToast?.('正在從雲端拉取…', 'info');
      try {
        const snap = await _docRef.get({ source: 'server' });
        if (!snap.exists) { showToast?.('雲端尚無資料，請先從主裝置點「↑ 推送」', 'warning'); return; }
        const data = snap.data();
        if (_rejectInvalidRemote(data, '手動拉取雲端')) return;
        const remoteTs = data._ts || Date.now();
        const normalized = _normalizeCloudData(data, remoteTs, 'pull');
        _remoteTs = remoteTs;
        _remoteExists = true;
        localStorage.setItem(DB.KEY, JSON.stringify(normalized));
        showToast?.('✅ 已從雲端拉取最新資料', 'success');
        _refreshCurrentPage();
      } catch(e) {
        showToast?.(`拉取失敗：${e.message}`, 'error');
      }
    },

    /** 立即推送本機資料至 Firestore（頂端「↑ 推送」按鈕） */
    /** 推送前需輸入密碼（防止非授權裝置覆蓋雲端資料） */
    async pushNow() {
      if (_mode === 'server' || !_docRef) {
        await _serverPushNow();
        return;
      }
      if (_status !== 'online' || !_docRef) {
        showToast?.('尚未連線，無法推送', 'error'); return;
      }
      // ── 密碼驗證 ──────────────────────────────────────────
      if (!_verifyPushPassword()) return;
      // ── 執行推送 ──────────────────────────────────────────
      try {
        const data = JSON.parse(localStorage.getItem(DB.KEY) || '{}');
        if (!data.settings) { showToast?.('本機無資料', 'warning'); return; }
        const validation = _validateFacilityDataset(data);
        if (!validation.ok) {
          showToast?.(`已阻擋推送：${validation.reason}`, 'warning');
          return;
        }
        const snap = await _docRef.get({ source: 'server' });
        if (snap.exists) {
          const remote = snap.data();
          const remoteTs = remote._ts || 0;
          _remoteTs = remoteTs;
          _remoteExists = true;
          const localTs = data.settings.syncTimestamp || 0;
          const remoteValidation = _validateFacilityDataset(remote);
          if (data.settings.initializedFromSeed) {
            showToast?.('已阻擋推送：此裝置仍是預設種子資料，請先匯入或拉取正式資料。', 'warning');
            return;
          }
          if (remoteValidation.ok && !data.settings.cloudSyncKnown) {
            showToast?.('已阻擋推送：此裝置尚未拉取雲端正式資料，請先按「↓ 拉取」。', 'warning');
            return;
          }
          if (remoteValidation.ok && remoteTs > localTs + STALE_GUARD) {
            showToast?.('已阻擋推送：雲端資料較新，請先拉取後再編輯。', 'warning');
            return;
          }
          if (!remoteValidation.ok) {
            const ok = window.confirm(`雲端資料未通過正式盤點檢核：${remoteValidation.reason}\n是否以本機完整資料覆蓋雲端？`);
            if (!ok) return;
          }
        }
        const now = Date.now();
        data.settings.syncTimestamp = now;
        data.settings.initializedFromSeed = false;
        data.settings.cloudSyncKnown = true;
        data.settings.cloudSchemaVersion = STABLE_SCHEMA_VERSION;
        data.settings.cloudPushedAt = new Date(now).toISOString();
        localStorage.setItem(DB.KEY, JSON.stringify(data));
        await _docRef.set({ ...data, _ts: now, _deviceId: _deviceId });
        _serverPushData(data, now).catch(err => {
          console.warn('[CloudSync] 同網址後端備援推送失敗', err);
        });
        _remoteTs = now;
        _remoteExists = true;
        _lastPushAt = now;
        showToast?.('✅ 本機資料已發布為雲端正式版本，其他裝置請拉取更新', 'success');
      } catch(e) {
        showToast?.(`推送失敗：${e.message}`, 'error');
      }
    },

    /** 手動斷開監聽 */
    disconnect() {
      if (_unsubscribe) { _unsubscribe(); _unsubscribe = null; }
      _mode = 'none';
      _setStatus('offline');
    },

    /** 訂閱狀態變更 */
    onStatusChange(fn) { _listeners.push(fn); },

    /** 取得 Firebase config（已設定的話） */
    getConfig() {
      try { return JSON.parse(localStorage.getItem(LS_CONFIG_KEY) || 'null'); }
      catch(_) { return null; }
    },

    /** 儲存 Firebase config 並重新連線 */
    async saveConfig(cfg) {
      localStorage.setItem(LS_CONFIG_KEY, JSON.stringify(cfg));
      if (_unsubscribe) { _unsubscribe(); _unsubscribe = null; }
      _app = _db = _docRef = null;
      return this.init();
    },

    /** 顯示設定對話框 */
    showSetupDialog() {
      const existing    = this.getConfig();
      const existingStr = existing ? JSON.stringify(existing, null, 2) : '';
      const deviceId    = _deviceId ? _deviceId.slice(0, 14) + '…' : '未知';
      const isOnline    = (_status === 'online');

      // 直接操作 DOM（避免 openModal body 渲染問題）
      const overlay = document.getElementById('modalOverlay');
      const titleEl = document.getElementById('modalTitle');
      const bodyEl  = document.getElementById('modalBody');
      const footEl  = document.getElementById('modalFooter');
      const modal   = document.getElementById('modal');
      if (!overlay || !bodyEl) { alert('請在平台頁面操作'); return; }

      if (modal) modal.style.maxWidth = '580px';
      if (titleEl) titleEl.textContent = '設定雲端主控同步';

      bodyEl.innerHTML = [
        '<div style="padding:2px 0 6px">',
        '<div style="background:#f0fdf4;border:1px solid #86efac;border-radius:8px;',
        'padding:12px 14px;margin-bottom:12px;font-size:13px;color:#166534;line-height:1.7">',
        '<b><i class="fas fa-cloud"></i> 穩定同步說明</b><br>',
        '所有裝置預設只從正式資料源拉取；若未設定 Firebase，會改用目前網址的 Render 後端同步。<br>',
        '只有管理者按「↑ 推送」且通過資料檢核與密碼驗證，才會發布正式版本。',
        '</div>',
        '<div class="form-group">',
        '<label style="font-size:13px;font-weight:600;margin-bottom:6px;display:block">',
        'Firebase Config JSON <span style="color:#94a3b8;font-weight:400">（選填，未填使用同網址後端同步）</span></label>',
        '<textarea id="fbConfigInput" rows="9" ',
        'style="width:100%;font-family:monospace;font-size:12px;resize:vertical;',
        'padding:8px;border:1.5px solid #d1d5db;border-radius:6px;line-height:1.5;',
        'box-sizing:border-box" ',
        'placeholder=\'{"apiKey":"AIzaSy...","projectId":"xxx",...}；可留空使用 Render 後端同步\'></textarea>',
        '</div>',
        '<div class="form-group" style="margin-top:10px">',
        '<label style="font-size:13px;font-weight:600;margin-bottom:6px;display:block">',
        '🔒 推送密碼（必填）',
        '<span style="font-weight:400;color:#94a3b8;font-size:11px;margin-left:6px">',
        '未設定密碼時禁止推送，避免新設備誤覆蓋雲端資料</span></label>',
        '<div style="display:flex;gap:8px">',
        '<input id="fbPushPwdInput" type="password" ',
        'value="' + (localStorage.getItem('SYNC_PUSH_PASSWORD') || '') + '" ',
        'placeholder="請設定管理者推送密碼" ',
        'style="flex:1;padding:8px;border:1.5px solid #d1d5db;border-radius:6px;font-size:13px">',
        '<button class="btn btn-outline" style="font-size:12px;padding:6px 10px;flex-shrink:0" ',
        'onclick="(function(){',
        'var p=document.getElementById(\'fbPushPwdInput\').value.trim();',
        'localStorage.setItem(\'SYNC_PUSH_PASSWORD\',p);',
        'showToast(p?\'✅ 推送密碼已儲存\':\'推送密碼已清除\',\'success\');',
        '})()">儲存密碼</button>',
        '</div>',
        '</div>',
        '<div style="font-size:11px;color:#94a3b8;margin-top:6px">',
        '裝置 ID：' + deviceId + '　狀態：' + _status,
        '</div>',
        isOnline ? [
          '<div style="margin-top:10px;display:flex;gap:8px">',
          '<button class="btn btn-outline" style="font-size:13px" ',
          'onclick="CloudSync.pull();closeModal()">',
          '<i class="fas fa-download"></i> 從雲端拉取最新資料</button>',
          '</div>'
        ].join('') : '',
        '</div>'
      ].join('');

      // 設定已儲存的 config
      if (existingStr) {
        const ta = document.getElementById('fbConfigInput');
        if (ta) ta.value = existingStr;
      }

      footEl.innerHTML = [
        '<button class="btn btn-outline" onclick="closeModal()">取消</button>',
        '<button class="btn btn-primary" style="background:#166534;border-color:#166534" ',
        'onclick="(function(){',
        'var el=document.getElementById(\'fbConfigInput\');',
        'if(!el){showToast(\'找不到輸入框\',\'error\');return;}',
        'var pwd=document.getElementById(\'fbPushPwdInput\');',
        'if(pwd){localStorage.setItem(\'SYNC_PUSH_PASSWORD\',pwd.value.trim());}',
        'var raw=el.value.trim();',
        'if(!raw){localStorage.removeItem(\'FIREBASE_CONFIG\');}',
        'if(!raw){CloudSync.init().then(function(ok){',
        'if(ok){showToast(\'✅ 已啟用同網址後端同步，請以「↓ 拉取 / ↑ 推送」控管資料\',\'success\');closeModal();}',
        'else{showToast(\'同網址後端同步無法連線，請確認 web_api.py / Render 服務\',\'error\');}',
        '});return;}',
        'var cfg;try{cfg=JSON.parse(raw);}catch(e){showToast(\'JSON格式錯誤：\'+e.message,\'error\');return;}',
        'if(!cfg.apiKey||!cfg.projectId){showToast(\'缺少 apiKey 或 projectId\',\'error\');return;}',
        'CloudSync.saveConfig(cfg).then(function(ok){',
        'if(ok){showToast(\'✅ 雲端主控同步已啟動，請以「↓ 拉取 / ↑ 推送」控管資料\',\'success\');closeModal();}',
        'else{showToast(\'連線失敗，請確認 Config\',\'error\');}',
        '});',
        '})()">',
        '<i class="fas fa-sync-alt"></i> 儲存並啟動同步</button>'
      ].join('');

      overlay.style.display = 'flex';
    }
  };
})();
