/**
 * 橫流溪管理平台 — 本機大型附件存放
 *
 * 問題：巡查照片以 base64 內嵌在紀錄中，整包資料庫約 4.4 MB。
 * localStorage 的配額以 UTF-16 計（每字元 2 bytes），實際佔用約 8.8 MB：
 *   桌面 Chrome（~10MB）勉強塞得下，平板 Safari（~5MB）直接丟出
 *   QuotaExceededError（"The quota has been exceeded."），拉取因此失敗。
 *
 * 作法：localStorage 只存「抽掉照片」的資料（約 200KB），照片本體改放
 * IndexedDB（額度大得多）。開機時把照片載入記憶體，DB.load() 回傳的仍是
 * 還原後的完整資料，因此顯示端完全不需要修改。
 *
 * 安全底線：IndexedDB 無法使用時自動退回原本行為（照片留在 localStorage），
 * 寧可佔空間也不遺失照片。
 */
const HLXBlobStore = (() => {
  const DB_NAME    = 'hlx_blobs';
  const STORE_NAME = 'blobs';
  const MARKER     = 'hlxblob:';
  const MIN_LEN    = 2048;   // 小於此長度的 data URL 留在紀錄內即可

  let _idb    = null;
  let _state  = 'pending';   // 'pending' | 'ready' | 'unavailable'
  const _mem  = new Map();   // id → dataUrl，供同步存取
  const _queue = new Map();  // 尚未寫入 IndexedDB 的附件（暖機完成前的寫入）

  /* ── 內容雜湊（與雲端同步採同一套編號規則）────────────────── */
  function hash(str) {
    let h1 = 0x811c9dc5;
    let h2 = 0x9e3779b9;
    for (let i = 0; i < str.length; i++) {
      const c = str.charCodeAt(i);
      h1 = Math.imul(h1 ^ c, 0x01000193) >>> 0;
      h2 = Math.imul(h2 + c, 0x85ebca6b) >>> 0;
    }
    return `${str.length.toString(36)}z${h1.toString(36)}${h2.toString(36)}`;
  }

  const isBlob = v => typeof v === 'string' && v.length >= MIN_LEN && v.startsWith('data:');
  const isRef  = v => typeof v === 'string' && v.startsWith(MARKER);

  /** 深走資料，把大型 data URL 換成參照；收集到 out（id → dataUrl） */
  function strip(value, out) {
    if (isBlob(value)) {
      const id = hash(value);
      out.set(id, value);
      return MARKER + id;
    }
    if (Array.isArray(value)) return value.map(v => strip(v, out));
    if (value && typeof value === 'object' && value.constructor === Object) {
      const o = {};
      Object.keys(value).forEach(k => { o[k] = strip(value[k], out); });
      return o;
    }
    return value;
  }

  /** 把參照換回 data URL；查不到的 id 收進 missing 並原樣保留，不破壞資料 */
  function restore(value, missing) {
    if (isRef(value)) {
      const id   = value.slice(MARKER.length);
      const data = _mem.get(id);
      if (data === undefined) { missing.add(id); return value; }
      return data;
    }
    if (Array.isArray(value)) return value.map(v => restore(v, missing));
    if (value && typeof value === 'object' && value.constructor === Object) {
      const o = {};
      Object.keys(value).forEach(k => { o[k] = restore(value[k], missing); });
      return o;
    }
    return value;
  }

  /** 蒐集資料中所有附件參照 id */
  function collectRefs(value, out) {
    if (isRef(value)) { out.add(value.slice(MARKER.length)); return out; }
    if (Array.isArray(value)) value.forEach(v => collectRefs(v, out));
    else if (value && typeof value === 'object') Object.values(value).forEach(v => collectRefs(v, out));
    return out;
  }

  /* ── IndexedDB ─────────────────────────────────────────────── */
  function _open() {
    return new Promise((resolve, reject) => {
      if (!window.indexedDB) return reject(new Error('此瀏覽器不支援 IndexedDB'));
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => {
        if (!req.result.objectStoreNames.contains(STORE_NAME)) {
          req.result.createObjectStore(STORE_NAME, { keyPath: 'id' });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror   = () => reject(req.error || new Error('IndexedDB 開啟失敗'));
      req.onblocked = () => reject(new Error('IndexedDB 被其他分頁鎖住'));
    });
  }

  /** 一筆交易內完成寫入與刪除，等交易真正完成才回報成功 */
  function _commit(puts, deletes) {
    return new Promise((resolve, reject) => {
      const tx    = _idb.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      puts.forEach(([id, data]) => store.put({ id, data }));
      deletes.forEach(id => store.delete(id));
      tx.oncomplete = () => resolve();
      tx.onerror    = () => reject(tx.error);
      tx.onabort    = () => reject(tx.error);
    });
  }

  /** 開機：把 IndexedDB 內的附件載入記憶體，載完才可安全還原 */
  const ready = (async () => {
    try {
      _idb = await _open();
      const rows = await new Promise((res, rej) => {
        const req = _idb.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).getAll();
        req.onsuccess = () => res(req.result || []);
        req.onerror   = () => rej(req.error);
      });
      rows.forEach(r => { if (r && r.id) _mem.set(r.id, r.data); });
      _state = 'ready';
      if (rows.length) console.log(`[BlobStore] 已載入 ${rows.length} 個本機附件`);
      if (_queue.size) {                        // 暖機期間的寫入補寫回去
        const puts = [..._queue.entries()].filter(([id]) => !rows.some(r => r.id === id));
        _queue.clear();
        if (puts.length) await _commit(puts, []);
      }
    } catch (e) {
      _state = 'unavailable';
      console.warn('[BlobStore] IndexedDB 不可用，附件將留在 localStorage', e);
    }
    return _state === 'ready';
  })();

  async function _persist(blobs, referenced) {
    blobs.forEach((data, id) => _mem.set(id, data));

    if (_state === 'pending') {                 // 尚未暖機完成，先排隊
      blobs.forEach((data, id) => _queue.set(id, data));
      return;
    }
    if (_state !== 'ready') return;

    const puts = [...blobs.entries()];
    // referenced 為 null 代表這次不是整包寫入，不做孤兒清除
    const deletes = referenced ? [..._mem.keys()].filter(id => !referenced.has(id)) : [];
    deletes.forEach(id => _mem.delete(id));
    if (!puts.length && !deletes.length) return;
    try {
      await _commit(puts, deletes);
    } catch (e) {
      console.warn('[BlobStore] 附件寫入失敗', e);
    }
  }

  return {
    ready,
    get state() { return _state; },
    get size()  { return _mem.size; },
    /** 目前記憶體中的附件清單（id → dataUrl），供雲端同步比對用 */
    entries()   { return new Map(_mem); },

    /** 本機儲存概況，供錯誤訊息與診斷使用 */
    diagnostics(key) {
      let lsKB = 0;
      try { lsKB = Math.round((localStorage.getItem(key) || '').length * 2 / 1024); } catch(_) {}
      return `附件庫=${_state}／${_mem.size}個，索引約${lsKB}KB`;
    },
    hash, isBlob, isRef, strip, restore, collectRefs,

    /**
     * 寫入整包資料：照片抽到 IndexedDB，localStorage 只留參照。
     * IndexedDB 確定不可用時原樣寫入（與改版前行為相同）。
     */
    write(key, data) {
      const blobs    = new Map();
      const stripped = strip(data, blobs);

      if (_state === 'unavailable') {
        // IndexedDB 不可用時優先照舊寫入完整資料（重新整理後照片仍在）；
        // 但若 localStorage 塞不下，改存去掉照片的版本並把照片留在記憶體——
        // 本次操作至少能完成，總比整個拉取失敗、資料全無要好。
        try {
          localStorage.setItem(key, JSON.stringify(data));
          return;
        } catch (e) {
          if (e?.name !== 'QuotaExceededError' && !/quota/i.test(e?.message || '')) throw e;
          localStorage.setItem(key, JSON.stringify(stripped));
          blobs.forEach((v, id) => _mem.set(id, v));
          console.warn('[BlobStore] localStorage 容量不足且 IndexedDB 不可用：' +
                       '照片僅保留於本次瀏覽階段，重新整理後需再次拉取。');
          return;
        }
      }

      // 先確定索引寫得進 localStorage，再處理附件；
      // 順序顛倒會出現「附件已落地但沒有索引」的狀態
      localStorage.setItem(key, JSON.stringify(stripped));

      // 只有整包資料庫寫入才清除孤兒附件。referenced 必須同時涵蓋
      // 本次抽出的照片與資料中「原本就是參照」的項目，否則會誤刪仍在使用的照片。
      const isFullWrite = data && Array.isArray(data.facilities) && Array.isArray(data.inspections);
      const referenced  = isFullWrite ? collectRefs(stripped, new Set()) : null;
      _persist(blobs, referenced);
    },

    /** 讀回整包資料，並把參照還原成原本的 data URL */
    read(key) {
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      const data = JSON.parse(raw);
      const missing = new Set();
      const out = restore(data, missing);
      if (missing.size) {
        console.warn(`[BlobStore] 有 ${missing.size} 個附件不在本機，需重新拉取雲端資料`);
      }
      return out;
    }
  };
})();

window.HLXBlobStore = HLXBlobStore;
