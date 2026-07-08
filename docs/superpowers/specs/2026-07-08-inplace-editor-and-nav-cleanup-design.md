# 就地編輯器 + 導覽精簡 + 快取前門 — 設計 spec

日期：2026-07-08
分支：`main`（feat/sprite-quest 已 merge）
狀態：Stan 已於對話中逐項拍板，本檔為存證

## 一句話

把獨立的 `/edit` 分頁換成「裝置解鎖的 Edit 鈕 → 就地浮出編輯器 + 側欄」；發佈維持 IP 認證；拿掉 whoami；精簡版本導覽；並把前門 HTML 做邊緣快取逼近阿部寬等級。

## 背景

一份 `content.json` → `renderSite(content, theme, {edit})` → 兩個 theme（featherweight 前門 / minimal 互動版）。M4 已做出以 `data-bind` 驅動的所見即所編編輯器（現在住在 `/edit`），M5 已做出 IP 認證的 `/api/publish`。本次是編輯入口與導覽的重新設計，非重寫編輯核心。

## 決策（逐項）

### 1. 編輯入口 = 裝置解鎖（一次性伺服器驗證）
- 新增 `EDIT_SECRET`（Cloudflare 加密環境變數，Stan 手動設）。
- 新增 `/api/unlock`：收到密碼字串，比對 `EDIT_SECRET`，對了回 `{ ok: true }`。密碼**只**存 Cloudflare，前端程式碼永遠沒有它 → console / view-source 撈不到。
- 解鎖流程：使用者在網址帶 `?unlock=<secret>` → 前端把它 POST 給 `/api/unlock` 驗 → 成功就設 `localStorage["can-edit"]="1"`，並把該參數從網址清掉（避免留在畫面）。
- 每次一般訪問：**只讀 localStorage 旗標**（零請求）→ 有旗標就在角落顯示「✎ Edit」鈕（featherweight 與 minimal 都有）。前門速度不受影響。
- **退役 `/api/whoami`。**
- 已知取捨：`?unlock=<secret>` 會進 Stan 自己的瀏覽器歷史 / Cloudflare log（他自己的帳號可見）；外部攻擊者看不到。可接受。之後若要連這個都避免，改成頁面內輸入框（不進網址）—— 非本次範圍。

### 2. 就地編輯器 + 側欄
- 把編輯器（現 `src/studio/freeform.js`）改成可掛載模組，打包成**固定網址**的腳本（例如 `/editor.js`，經 build 步驟產出、不帶 hash）。
- Edit 鈕點下去 → 注入 `<script src="/editor.js">`（只有解鎖裝置、只有按下才載）→ 執行 `mountEditor()`：fetch `content.json` → `renderSite(content, 當前 theme, {edit:true})` → 換頁內容 → 綁定可編欄位 → 掛一個**右側控制側欄**（切版本 / Undo / Preview / Export / **Publish** / Exit）。全程不換頁。
- 控制項從原本的頂部 toolbar 改成**右側側欄**（對應 Stan 說的 sidebar）。
- **退役 `/edit` 頁（`edit.html`）。**

### 3. 發佈 = IP 認證（維持，不動）
- `functions/api/publish.js` 認 `cf-connecting-ip === CREATOR_IP` → 用 `GITHUB_TOKEN` commit `content.json`。只能從家用網路發佈。
- 後果（已確認接受）：編輯可在任何解鎖裝置（含手機），但**發佈只限家用 IP**；手機能編、能 Export，按 Publish 會被擋。

### 4. 拿掉 whoami
- 刪 `functions/api/whoami.js`。
- `src/render/fx/rate.js` 原本靠 whoami 判斷「站長不顯示評分條」→ 改讀 `localStorage["can-edit"]` 旗標。
- `functions/_lib/creator.js`（`isCreatorIp`）保留（`publish.js` 在用）。
- `src/render/fx/creator-entry.js` 從「fetch whoami → 連 /edit」改成「讀 localStorage 旗標 → 顯示 Edit 鈕 → 就地掛編輯器」。

### 5. 導覽精簡
- **保留**版本互連的兩張「This Site」自介卡（各指向另一版，這是刻意的互連，不是重複）。
- 互動版改乾淨路徑 **`/interactive`**（新增對應 html 進入點，render minimal）；自介卡與頁尾連結改指 `/interactive`，不再用 `?theme=minimal&v=full`。
- 移除 `src/site/site.js` 右下角的浮動版本切換鈕（跟自介卡功能重複）。

### 6. 前門邊緣快取（獨立小 slice，可先可後）
- 加 `public/_headers`（或等效）給 `/`、`/fast/`、`/interactive` 設 `Cache-Control`，讓 Cloudflare 邊緣快取 HTML → 回訪 TTFB 從 ~156ms 降到幾十毫秒，**所有訪客受益**。
- Cloudflare Pages 每次部署會自動清快取，故發佈後不會服務到舊 HTML。
- TLS 那層地板（~69ms 首次、瀏覽器重用攤掉）追不掉；HTTP/3 已啟用。

## 安全備註（實作時守）
- **編輯器「看得到」不是安全邊界**：訪客就算叫出編輯器也只改自己畫面，發不出去。真正的鎖是發佈（IP）。
- 解鎖密碼只存 Cloudflare（`EDIT_SECRET`），前端零明文。
- 發佈 IP（`cf-connecting-ip`）是邊緣讀到的真實 IP，光知道 IP 仿冒不了。

## 非目標
- 密語式發佈（已選 IP）。
- `studio.html` 表單編輯器（本次不碰，未來可退役）。
- 跨裝置草稿同步。
- 頁面內輸入框式解鎖（本次用網址參數；未來可加）。

## Stan 手動待辦（密鑰，只能本人）
- Cloudflare Pages 設加密環境變數 `EDIT_SECRET`（一組夠長的隨機字串）。
- （`CREATOR_IP`、`GITHUB_TOKEN` 已設。）
