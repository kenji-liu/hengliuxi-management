/**
 * 橫流溪管理平台 — 主控編輯者登入模組
 * 憑證以 SHA-256 雜湊儲存，原始帳密不出現於程式碼。
 * 登入狀態存於 sessionStorage（關閉瀏覽器自動登出）。
 */
const HLXAuth = (() => {
  const SALT       = 'HLX_MGMT_2026_SALT';
  const CRED_HASH  = '4521b81df03214fb44a0ffd6ca5265c5da3471bfeedde3df3cc0e35adcc4ead7';
  const SESSION_KEY = 'HLX_EDITOR_SESSION';
  const SESSION_TTL = 8 * 60 * 60 * 1000; // 8 小時後自動過期

  async function _sha256(str) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
  }

  function _session() {
    try {
      const s = JSON.parse(sessionStorage.getItem(SESSION_KEY) || 'null');
      if (!s || !s.at || Date.now() - s.at > SESSION_TTL) return null;
      return s;
    } catch { return null; }
  }

  function _setSession(user) {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({ user, at: Date.now() }));
    _updateUI();
  }

  function _clearSession() {
    sessionStorage.removeItem(SESSION_KEY);
    _updateUI();
  }

  function _updateUI() {
    const s = _session();
    const btn = document.getElementById('hlxAuthBtn');
    const pushBtn = document.getElementById('syncPushBtn');
    if (!btn) return;
    if (s) {
      btn.innerHTML = `<i class="fas fa-user-check"></i> ${s.user}`;
      btn.style.background = '#dcfce7';
      btn.style.color = '#166534';
      btn.title = '已登入為主控編輯者・點擊登出';
      btn.onclick = () => {
        if (confirm(`確定要登出 ${s.user}？`)) { _clearSession(); showToast('已登出', 'info'); }
      };
      if (pushBtn) pushBtn.style.display = 'inline-block';
    } else {
      btn.innerHTML = '<i class="fas fa-lock"></i> 登入';
      btn.style.background = '#fff7ed';
      btn.style.color = '#c2410c';
      btn.title = '登入為主控編輯者以啟用編輯功能';
      btn.onclick = () => HLXAuth.showLoginModal();
      if (pushBtn) pushBtn.style.display = 'none';
    }
  }

  return {
    isLoggedIn() { return !!_session(); },
    currentUser() { return (_session() || {}).user || null; },

    /** 需要登入時呼叫：已登入直接回 true，否則開登入框並回 false */
    requireLogin(onSuccess) {
      if (_session()) { if (onSuccess) onSuccess(); return true; }
      this.showLoginModal(onSuccess);
      return false;
    },

    showLoginModal(onSuccess) {
      const overlay = document.getElementById('modalOverlay');
      const titleEl = document.getElementById('modalTitle');
      const bodyEl  = document.getElementById('modalBody');
      const footEl  = document.getElementById('modalFooter');
      const modal   = document.getElementById('modal');
      if (!overlay || !bodyEl) return;

      if (modal) modal.style.maxWidth = '380px';
      if (titleEl) titleEl.innerHTML = '<i class="fas fa-lock" style="color:#c2410c;margin-right:8px"></i>主控編輯者登入';

      bodyEl.innerHTML = `
        <div style="padding:8px 0">
          <div class="form-group" style="margin-bottom:14px">
            <label style="font-size:13px;font-weight:600;display:block;margin-bottom:6px">帳號</label>
            <input id="hlxLoginUser" type="text" autocomplete="username"
              style="width:100%;padding:9px 12px;border:1.5px solid #d1d5db;border-radius:7px;font-size:14px;box-sizing:border-box"
              placeholder="請輸入帳號">
          </div>
          <div class="form-group">
            <label style="font-size:13px;font-weight:600;display:block;margin-bottom:6px">密碼</label>
            <input id="hlxLoginPwd" type="password" autocomplete="current-password"
              style="width:100%;padding:9px 12px;border:1.5px solid #d1d5db;border-radius:7px;font-size:14px;box-sizing:border-box"
              placeholder="請輸入密碼">
          </div>
          <div id="hlxLoginErr" style="color:#b91c1c;font-size:13px;margin-top:10px;display:none">
            <i class="fas fa-times-circle"></i> 帳號或密碼錯誤
          </div>
        </div>`;

      footEl.innerHTML = `
        <button class="btn btn-outline" onclick="closeModal()">取消</button>
        <button class="btn btn-primary" style="background:#166534;border-color:#166534"
          id="hlxLoginSubmit" onclick="HLXAuth._doLogin(${onSuccess ? 'window._hlxAuthCb' : 'null'})">
          <i class="fas fa-sign-in-alt"></i> 登入
        </button>`;

      window._hlxAuthCb = onSuccess || null;
      overlay.style.display = 'flex';
      setTimeout(() => document.getElementById('hlxLoginUser')?.focus(), 100);

      // Enter 鍵觸發
      const handler = e => {
        if (e.key === 'Enter') document.getElementById('hlxLoginSubmit')?.click();
      };
      bodyEl.addEventListener('keydown', handler);
    },

    async _doLogin(cb) {
      const user = (document.getElementById('hlxLoginUser')?.value || '').trim().toLowerCase();
      const pwd  = (document.getElementById('hlxLoginPwd')?.value || '').trim();
      const err  = document.getElementById('hlxLoginErr');
      const btn  = document.getElementById('hlxLoginSubmit');
      if (!user || !pwd) { if (err) { err.style.display = 'block'; err.textContent = '請填寫帳號與密碼'; } return; }
      if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 驗證中…'; }
      const hash = await _sha256(SALT + user + ':' + pwd);
      if (hash === CRED_HASH) {
        _setSession(user);
        closeModal();
        showToast(`✅ 歡迎，${user}！主控編輯模式已啟用`, 'success');
        if (typeof cb === 'function') cb();
      } else {
        if (err) { err.style.display = 'block'; err.textContent = '帳號或密碼錯誤'; }
        if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-sign-in-alt"></i> 登入'; }
        document.getElementById('hlxLoginPwd')?.select();
      }
    },

    /** 初始化：在 top-bar 插入登入按鈕並更新 UI */
    init() {
      const bar = document.querySelector('.top-bar-right');
      if (!bar || document.getElementById('hlxAuthBtn')) return;
      const btn = document.createElement('button');
      btn.id = 'hlxAuthBtn';
      btn.style.cssText = 'border:1.5px solid #e2e8f0;border-radius:7px;padding:4px 10px;font-size:12px;font-weight:700;cursor:pointer;white-space:nowrap;display:flex;align-items:center;gap:5px';
      bar.insertBefore(btn, bar.firstChild);
      _updateUI();
      // 每分鐘檢查 session 是否過期
      setInterval(_updateUI, 60000);
    }
  };
})();
