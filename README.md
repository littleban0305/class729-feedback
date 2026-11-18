# 729 蓋章政策回饋 v1.0

## 檔案

| 檔案 | 用途 |
| --- | --- |
| `index.html` | 網頁架構 |
| `style.css` | 外觀 |
| `script.js` | 題目和功能（題目在最上面的 `PARTS`） |
| `firebase-config.js` | Firebase 設定（**一定要填**） |
| `firestore.rules` | 資料庫規則（貼到 Firebase 控制台，不用上傳到 GitHub 也可以） |

## 設定步驟

### 1. 建立 Firestore 資料庫
1. 打開 Firebase 控制台，選你的專案（或新建一個）。
2. 左邊選「Firestore Database」→「建立資料庫」→ 選「正式版模式」，地區選 `asia-east1`（台灣）。

### 2. 貼上資料庫規則
1. Firestore Database →「規則」分頁。
2. 把 `firestore.rules` 的內容整個貼上，**把 `請改成你的信箱@gmail.com` 改成你的 Google 帳號**。
3. 按「發布」。

### 3. 開啟 Google 登入（管理員看統計用）
1. 左邊選「Authentication」→「開始使用」→「Sign-in method」→ 啟用「Google」。
2. 同一頁的「設定」→「已授權的網域」→ 新增 `littleban0305.github.io`。

### 4. 填寫 firebase-config.js
1. 專案設定（齒輪）→「一般」→ 往下到「你的應用程式」，沒有的話按 `</>` 新增一個網頁應用程式。
2. 把 `firebaseConfig` 裡的 6 個值，貼到 `firebase-config.js` 對應的位置。

### 5. 上傳到 GitHub
把 `index.html`、`style.css`、`script.js`、`firebase-config.js` 上傳到 `class729-feedback`，等 1～2 分鐘就會更新。

## 怎麼防止重複填寫
- 送出時，資料庫規則只允許「新增」，同一個座號第二次送出會被拒絕。
- 開始填寫前，網站會先查這個座號有沒有填過。
- 同一台裝置填過之後，再打開會直接顯示「你已經填寫過了」。

## 管理員
網頁右下角的「管理員」→ 用 Google 登入 → 可以看到填寫名單、每題平均、桌遊票數和所有文字回饋，也可以複製全部資料。只有寫在規則裡的信箱才看得到。
