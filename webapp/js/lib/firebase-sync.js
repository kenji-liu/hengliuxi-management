/**
 * 橫流溪管理平台 — 即時多裝置同步模組
 * 使用 Firebase Firestore onSnapshot() 實現所有裝置即時同步
 *
 * 架構：
 *   localStorage（本機快取）←→ Firestore（雲端真相來源）
 *   任何裝置 DB.save() → push 到 Firestore → onSnapshot 通知其他裝置
 *   其他裝置收到通知 → 更新 localStorage → 刷新目前頁面
 *
 * 設定方式：
 *   使用者在平台「設定 > 即時同步」輸入 Firebase Config JSON
 *   儲存於 localStorage，之後每次載入自動連線
 */

const CloudSync = (() => {
  const LS_CONFIG_KEY  = 'FIREBASE_CONFIG';
  const LS_DEVICE_KEY  = 'DEVICE_ID';
  const DOC_PATH       = 'hengliuxi/main';
  const PUSH_DEBOUNCE  = 1500;  // ms：防抖，避免連續儲存觸發過多推送
  const STALE_GUARD    = 3000;  // ms：遠端資料至少比本機新 3 秒才接受

  let _app        = null;
  let _db         = null;
  let _docRef     = null;
  let _unsubscribe = null;
  let _deviceId   = null;
  let _lastPushAt = 0;
  let _pushTimer  = null;
  let _status     = 'offline';  // 'offline' | 'connecting' | 'online' | 'error'
  let _listeners  = [];         // status change callbacks

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

  function _updateStatusUI(s) {
    const el = document.getElementById('cloudSyncStatus');
    if (!el) return;
    const map = {
      offline:     { icon: '⚫', text: '未連線',  color: '#94a3b8' },
      connecting:  { icon: '🔄', text: '連線中…', color: '#d97706' },
      online:      { icon: '🟢', text: '即時同步', color: '#16a34a' },
      error:       { icon: '🔴', text: '同步錯誤', color: '#dc2626' },
    }[s] || { icon: '⚫', text: s, color: '#94a3b8' };
    el.innerHTML = `<span style="color:${map.color};font-weight:700;font-size:13px">${map.icon} ${map.text}</span>`;
  }

  /** 啟動 Firestore 即時監聽 */
  /**
   * 連線後立即比對：雲端有資料且比本機新 → 自動拉取並刷新頁面
   * 雲端為空 → 推送本機資料作為初始版本
   */
  async function _initSync() {
    try {
      const snap = await _docRef.get();

      if (!snap.exists) {
        // Firestore 尚無資料 → 推送本機資料（第一台裝置建立雲端版本）
        const local = JSON.parse(localStorage.getItem(DB.KEY) || '{}');
        if (local && local.settings) {
          local.settings.syncTimestamp = Date.now();
          await _docRef.set({ ...local, _ts: Date.now(), _deviceId: _deviceId });
          console.log('[CloudSync] 初次推送本機資料至 Firestore');
        }
        return;
      }

      // Firestore 有資料 → 比較時間戳
      const remote = snap.data();
      const remoteTs = remote._ts || 0;
      let localTs = 0;
      try {
        const local = JSON.parse(localStorage.getItem(DB.KEY) || '{}');
        localTs = local?.settings?.syncTimestamp || 0;
      } catch(_) {}

      if (remoteTs > localTs) {
        // 雲端更新 → 拉取覆蓋本機（無論差距多少毫秒）
        const data = { ...remote };
        delete data._ts;
        delete data._deviceId;
        localStorage.setItem(DB.KEY, JSON.stringify(data));
        console.log('[CloudSync] 初始化：雲端資料較新，已拉取 ts:', new Date(remoteTs).toLocaleTimeString());
        _showSyncToast('雲端初始化', remoteTs);
        _refreshCurrentPage();
      } else if (localTs > remoteTs + 5000) {
        // 本機更新且差距超過 5 秒 → 推送本機至雲端
        const local = JSON.parse(localStorage.getItem(DB.KEY) || '{}');
        local.settings.syncTimestamp = Date.now();
        await _docRef.set({ ...local, _ts: Date.now(), _deviceId: _deviceId });
        console.log('[CloudSync] 初始化：本機資料較新，已推送至 Firestore');
      }
      // 若時間戳差距 < 5 秒，視為相同版本，不做處理
    } catch(e) {
      console.warn('[CloudSync] 初始化同步失敗', e);
    }
  }

  function _startListener() {
    if (_unsubscribe) { _unsubscribe(); _unsubscribe = null; }

    _unsubscribe = _docRef.onSnapshot(snap => {
      if (!snap.exists) return;
      const remote = snap.data();
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
        const data = { ...remote };
        delete data._ts;
        delete data._deviceId;

        localStorage.setItem(DB.KEY, JSON.stringify(data));
        console.log('[CloudSync] 收到遠端更新 ts:', new Date(remoteTs).toLocaleTimeString());

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

  /* ─────────────────────── 公開 API ─────────────────────── */

  return {
    get status()   { return _status; },
    get deviceId() { return _deviceId; },
    get isOnline() { return _status === 'online'; },

    /** 初始化（從 localStorage 讀取 Firebase config）*/
    async init() {
      _deviceId = _getDeviceId();
      const cfgStr = localStorage.getItem(LS_CONFIG_KEY);
      if (!cfgStr) { _setStatus('offline'); return false; }

      let cfg;
      try { cfg = JSON.parse(cfgStr); }
      catch(e) { console.warn('[CloudSync] Firebase config 格式錯誤'); _setStatus('error'); return false; }

      _setStatus('connecting');
      try {
        // 使用 Firebase compat SDK（透過 CDN 載入）
        if (!window.firebase) throw new Error('Firebase SDK 未載入');
        if (!firebase.apps.length) firebase.initializeApp(cfg);
        _app    = firebase.app();
        _db     = firebase.firestore();
        _docRef = _db.doc(DOC_PATH);

        // 啟用離線持久化（可選，有助於弱網路環境）
        try { await _db.enablePersistence({ synchronizeTabs: true }); }
        catch(_) {}

        // ── 連線後立即比對雲端與本機版本，確保所有裝置資料一致 ──
        await _initSync();

        _startListener();
        console.log('[CloudSync] 已連線，裝置 ID:', _deviceId);
        return true;
      } catch(e) {
        console.error('[CloudSync] 連線失敗', e);
        _setStatus('error');
        return false;
      }
    },

    /** 推送本機最新資料到 Firestore（帶防抖） */
    push(data) {
      if (_status !== 'online' || !_docRef) return;

      clearTimeout(_pushTimer);
      _pushTimer = setTimeout(async () => {
        const now = Date.now();
        if (now - _lastPushAt < 500) return;
        _lastPushAt = now;

        const payload = {
          ...data,
          _ts:       now,
          _deviceId: _deviceId,
        };

        try {
          await _docRef.set(payload);
          console.log('[CloudSync] 已推送', new Date(now).toLocaleTimeString());
        } catch(e) {
          console.warn('[CloudSync] 推送失敗', e);
          _setStatus('error');
          // 嘗試重連
          setTimeout(() => _startListener(), 5000);
        }
      }, PUSH_DEBOUNCE);
    },

    /** 強制從 Firestore 拉取最新資料並覆蓋本機 */
    async pull() {
      if (!_docRef) { showToast?.('尚未設定 Firebase，無法拉取', 'error'); return; }
      try {
        const snap = await _docRef.get();
        if (!snap.exists) { showToast?.('雲端尚無資料', 'warning'); return; }
        const data = snap.data();
        delete data._ts;
        delete data._deviceId;
        localStorage.setItem(DB.KEY, JSON.stringify(data));
        showToast?.('✅ 已從雲端拉取最新資料', 'success');
        _refreshCurrentPage();
      } catch(e) {
        showToast?.(`拉取失敗：${e.message}`, 'error');
      }
    },

    /** 手動斷開監聽 */
    disconnect() {
      if (_unsubscribe) { _unsubscribe(); _unsubscribe = null; }
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
      if (titleEl) titleEl.textContent = '設定即時多裝置同步';

      bodyEl.innerHTML = [
        '<div style="padding:2px 0 6px">',
        '<div style="background:#f0fdf4;border:1px solid #86efac;border-radius:8px;',
        'padding:12px 14px;margin-bottom:12px;font-size:13px;color:#166534;line-height:1.7">',
        '<b><i class="fas fa-sync-alt"></i> 即時同步說明</b><br>',
        '設定後所有裝置（iPad、電腦）儲存時，自動同步至其他裝置（延遲 &lt;3秒）。<br>',
        '<b>免費使用</b>：50,000 讀取 / 20,000 寫入 per day。',
        '</div>',
        '<div class="form-group">',
        '<label style="font-size:13px;font-weight:600;margin-bottom:6px;display:block">',
        'Firebase Config JSON <span style="color:#ef4444">*</span></label>',
        '<textarea id="fbConfigInput" rows="9" ',
        'style="width:100%;font-family:monospace;font-size:12px;resize:vertical;',
        'padding:8px;border:1.5px solid #d1d5db;border-radius:6px;line-height:1.5;',
        'box-sizing:border-box" ',
        'placeholder=\'{"apiKey":"AIzaSy...","projectId":"xxx",...}\'></textarea>',
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
        'var raw=el.value.trim();',
        'if(!raw){showToast(\'請輸入 Firebase Config\',\'error\');return;}',
        'var cfg;try{cfg=JSON.parse(raw);}catch(e){showToast(\'JSON格式錯誤：\'+e.message,\'error\');return;}',
        'if(!cfg.apiKey||!cfg.projectId){showToast(\'缺少 apiKey 或 projectId\',\'error\');return;}',
        'CloudSync.saveConfig(cfg).then(function(ok){',
        'if(ok){showToast(\'✅ 即時同步已啟動！\',\'success\');closeModal();}',
        'else{showToast(\'連線失敗，請確認 Config\',\'error\');}',
        '});',
        '})()">',
        '<i class="fas fa-sync-alt"></i> 儲存並啟動同步</button>'
      ].join('');

      overlay.style.display = 'flex';
    }
  };
})();
