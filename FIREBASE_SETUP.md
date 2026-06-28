# 跨平板雲端同步設定指南（Firebase Firestore）

橫流溪管理平台的跨設備同步**優先使用 Firebase Firestore**（免費、資料持久、即時推播到所有平板）。
未設定 Firebase 時會退回同網址 Render 後端，但 **Render 免費方案的檔案系統是暫時性的**——
每次重新部署或服務閒置休眠冷啟動，執行期推送的資料庫就會被清空，導致其他平板拉不到資料。
因此**正式跨平板同步請務必設定 Firebase**。

---

## 一、建立 Firebase 專案（約 5 分鐘，免費）

1. 前往 **<https://console.firebase.google.com>**，用 Google 帳號登入。
2. 點「**新增專案**」，命名（例如 `hengliuxi`），可關閉 Google Analytics → 建立。

## 二、建立 Firestore 資料庫

1. 左側選單 **Build → Firestore Database** → 點「**建立資料庫**」。
2. 區域選 **`asia-east1`（台灣）** 或 `asia-east2`。
3. 啟動模式選正式版或測試模式皆可（規則於下一步覆蓋）。

## 三、設定 Firestore 安全規則

進入 Firestore 的 **Rules（規則）** 分頁，貼上以下內容後按「**發布**」：

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /hengliuxi/main {
      allow read, write: if true;
    }
  }
}
```

> 此規則僅開放平台使用的單一文件 `hengliuxi/main` 讀寫。

### ⚠ 安全提醒
`allow read, write: if true` 是**開放規則**，且 `apiKey` 在網頁前端是公開的，
技術上任何取得網址的人都能讀寫這份資料庫。對「設施巡查資料」這類非個資、
且平台層另有**推送密碼**把關的內部工具，通常可接受。
若日後需更嚴謹，可加 Firebase 匿名驗證或 App Check 強化。

## 四、取得 Firebase Config

1. 點左上角齒輪 → **專案設定**。
2. 捲到下方「**你的應用程式**」→ 點 **Web（`</>`）** 圖示註冊一個 Web 應用程式（命名隨意，不必勾選 Hosting）。
3. 複製畫面上 `firebaseConfig` 的 JSON 區塊，例如：

```json
{
  "apiKey": "AIzaSy...",
  "authDomain": "hengliuxi.firebaseapp.com",
  "projectId": "hengliuxi",
  "storageBucket": "hengliuxi.appspot.com",
  "messagingSenderId": "1234567890",
  "appId": "1:1234567890:web:abcdef"
}
```

## 五、在平台啟用

1. 開啟平台 → 右上角「**設定 > 雲端同步**」（雲端狀態旁的齒輪）。
2. 把 **Config JSON 貼進輸入框**。
3. 設定一組**推送密碼**（管理者用，防止未授權裝置覆蓋雲端）。
4. 按「**儲存並啟動同步**」。狀態應顯示 🟢 雲端連線。

## 六、日常使用

- **主控平板**（資料最新者）：編輯後按「**↑ 推送**」→ 輸入推送密碼 → 發布為雲端正式版本。
- **其他平板**：開啟平台後會**自動即時同步**（Firestore onSnapshot 推播）；
  也可隨時手動按「**↓ 拉取**」取得最新資料。
- 推送前平台會檢核資料完整性（至少 19 筆工程設施、須含正式設施代碼），不完整會被阻擋。

---

## 疑難排解

| 症狀 | 可能原因與處理 |
|------|----------------|
| 狀態顯示「Render同步」而非「雲端連線」 | 未設定 Firebase Config，或 Config 格式/憑證錯誤而退回後端。重新檢查 Config JSON。 |
| 推送後其他平板沒更新 | 確認其他平板狀態為 🟢 雲端連線（Firebase）；若顯示 Render同步代表它走到暫時性後端，請補設 Firebase Config。 |
| 「已阻擋推送：尚未設定推送密碼」 | 先到同步設定建立管理者推送密碼。 |
| 「已阻擋推送：此裝置尚未拉取雲端正式資料」 | 先按「↓ 拉取」再推送（避免新設備覆蓋雲端）。 |
| 「已阻擋推送：工程設施數量少於 19 筆」 | 本機資料不完整，先拉取或匯入正式資料再推送。 |

---

## 技術備註（給維護者）

- 同步邏輯：`webapp/js/lib/firebase-sync.js` 的 `CloudSync`。
- `init()` 順序：有 Firebase Config → `_initFirebaseSync()`（含連線驗證 `_docRef.get({source:'server'})`）；
  失敗或未設定 → 退回 `_initServerSync()`（Render `/api/sync/database`）。
- Firestore 文件路徑：`hengliuxi/main`；時間戳 `_ts` / `settings.syncTimestamp` 決定新舊。
- Render 後端：`web_api.py` 的 `/api/sync/database`，寫入 `webapp/data/synced_database.json`（**免費方案暫時性、會被部署/休眠清空**）。
