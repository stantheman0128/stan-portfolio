# Creator Studio 與獎勵重做 — 設計 spec

日期：2026-07-08
分支基底：`feat/sprite-quest`
狀態：待 Stan 核可

## 一句話

砍掉 Showroom；讓 Featherweight 顯示這次的實測載入速度；把「照片獎勵」從 KV+token 閘門改成公開圖的碎形分塊隨機顯影；加一個以 IP 判定的 Creator 模式（免評分、露出編輯入口）；把評分改成評過定案；做一個「整頁就是編輯器」的所見即所編工具，改動寫回 `content.json`、兩個 theme 同步，並接上 GitHub OAuth 一鍵發佈。

## 背景

這個站是「一份內容、多套皮」：`data/content.json` 是唯一內容真相，`src/render/renderSite.js` 依 theme 產出整份 HTML，Featherweight 與 Minimal 讀同一份內容、只有 UI 不同。現有的評分／探索任務／照片獎勵是 Minimal theme 的互動系統（`src/render/fx/*` + `functions/api/*`）。這次的變動大多落在這兩塊上。

## 目標與非目標

目標：完成下列六個里程碑，且每個里程碑可獨立驗證、獨立收工。

非目標：
- 不動舊的 System B（`index.html` → `src/main.js` → `data/projects/*.md`）。這次只碰 System A（`content.json` 那條線）。
- 不做多人協作編輯、不做版本歷史 UI。發佈就是一次 commit。

## 里程碑總覽與依賴

- M0 砍 Showroom（獨立）
- M1 Featherweight 實測載入速度 + 誠實文案（獨立）
- M2 照片獎勵重做：彩蛋化 + 碎形分塊顯影 + 退役 token/KV 線（獨立）
- M3 Creator 模式（IP 白名單）+ 評分定案（為 M4 鋪路）
- M4 所見即所編編輯器：`renderSite` edit 模式 + `data-bind` + 改造 `freeform.js` 綁 `content.json` + 匯出（依賴 M3 的編輯入口）
- M5 線上一鍵發佈：OAuth + GitHub commit + 圖片上傳（依賴 M4）

建議順序 M0 → M1 → M2 → M3 → M4 → M5。前四個當天各自能收，M4/M5 是重頭戲。

---

## M0 — 砍 Showroom

範圍最小、風險最低。

改動：
- 刪 `src/render/themes/showroom.js` 整檔。
- `src/render/renderSite.js`：刪 showroom 的 import（第 5 行）、從 `THEMES` 移除（第 7 行）、從 `THEMES_META` 移除那筆（第 12 行）。

不用動 `site.js` / `studio.js` / `freeform.js`：它們動態遍歷 `THEMES_META`，會自動少一個選項。存過 `localStorage["site-theme"]="showroom"` 的訪客走 `THEMES[theme] || featherweight` fallback，不會壞。

收尾：grep 全專案（含 `DESIGN.md`、`HANDOFF.md`、`demo-concepts/`）確認沒有殘留 showroom 引用。

---

## M1 — Featherweight 實測載入速度

### 行為

在 Featherweight 頁尾顯示一個活的數字，例如「this page became usable in ~42 ms」，反映這次載入到 DOMContentLoaded 的實際毫秒數。

### 設計

- 在 `featherweight.js` 的 footer 加一個 `<span id="fw-speed">`，body 末尾放一段極小 inline script：
  - 讀 `performance.getEntriesByType('navigation')[0].domContentLoadedEventEnd`（相對導覽起點），`Math.round` 後填入。
  - 在 `window.load` 事件內執行，確保 timing 已定；navigation entry 不可用時 fallback 到 `performance.now()`。
  - `prefers-reduced-motion` 不影響（純填數字，無動畫）。
- 指標選 DOMContentLoaded，因為它對應「頁面就緒可讀」，穩定且直觀。（Stan review 時可改成 FCP 或 responseEnd。）

### 誠實文案（一併改，否則自打臉）

加了這段 script，Featherweight 就不再是「zero JS」。要同步改兩處，不然文案變假：
- `featherweight.js` footer：「Featherweight · system fonts · zero JS · nothing blocks first paint」→ 把「zero JS」換成誠實說法，例如「one tiny timer · nothing blocks first paint」。
- `content.json` 的 `site-featherweight` 卡片：`tags` 的「Zero JS」→「~1 line JS」之類；`detail` 的「no scripts at all」改寫。

### 附帶

`dist/fast/index.html`（postbuild 烘的純靜態 Featherweight）會自帶這段 script，`/fast/` 本來最快，數字最漂亮。這個文案怎麼定調由 Stan 拍板，實作先給推薦。

---

## M2 — 照片獎勵重做

### 決策

照片彩蛋化：真照片變一般公開資產，逐塊隨機顯影純粹是前端視覺。已知並接受的 trade-off：懂技術的人能從 devtools 抓到清晰原圖。這是本人生活照當彩蛋，不是機密。

### 素材

把 `C:\Users\stans\OneDrive - gapps.ntnu.edu.tw\桌面\重要檔案 Important\S__15400987.jpg` 複製到 `stan-portfolio/public/assets/reward-photo.jpg`。

### 顯影演算法（碎形 / Voronoi，demo 已驗證可行）

- 每次載入隨機取 10 個種子點 → Voronoi 把照片分成 10 塊（每次載入切法不同）。
- 每塊有一條各自的「隨機顯影排程」：把 0→1 的清晰過程切成 N 步、每步增量隨機、N 步後歸滿。N = quest 總步數（items + patent，動態）。
- quest 每完成一步 → 10 塊各自緩動到該步的目標清晰度；因為每塊節奏不同，總有幾塊拖到最後才清晰。
- 全部完成 → 全清晰。
- `prefers-reduced-motion`：直接跳到目標、不緩動。

### 實作

- 前端用 canvas 分區 blur：底層整張大 blur，頂層用「每塊 alpha = 該塊清晰度」的 mask 以 `destination-in` 疊清晰圖。
- 效能：mask 在固定低解析度 canvas（約 300px 寬）計算 cellIndex 與 per-pixel alpha，顯示時用 CSS 放大套到全尺寸照片；`cellIndex` 只在載入/重切時算一次。
- 這取代 `cta.js` 目前的「全域 blur 16px→3px」顯影（`cta.js:103-120`）。

### 保留 vs 退役

- 保留：quest 進度追蹤（`quest.js` 的 `watched`/`pct`）當顯影驅動；polaroid 逃跑互動（`cta.js` 的 glide/dodge）。只換「顯影方式」。
- 退役（彩蛋化後不再需要 server 換圖那套）：
  - `functions/api/reward.js`（token 換 KV 圖）
  - `functions/api/quest.js` 的 `claim` 分支與 token 簽發
  - `functions/_lib/hmac.js`（若無其他使用者）
  - `quest.js` 的 `claim()`、`cta.js` 的 `develop()`/`/api/reward` fetch：改成「最後一塊解鎖 = 全清晰」，不再 claim token。
- KV 裡的 `asset:reward-full` 可留可清，不影響。

（若 Stan 想保住「只有完成探索的人能看清楚原圖」那道閘門，就不能彩蛋化——但這點已在 brainstorming 拍板走彩蛋化。）

---

## M3 — Creator 模式（IP 白名單）+ 評分定案

### Creator 判定

- 純 IP 白名單：Cloudflare 邊緣讀 `cf-connecting-ip` 比對 secret `CREATOR_IP`。
- 新增 `functions/api/whoami.js`：GET 回 `{ creator: true|false }`。前端 fetch 後據此隱藏評分、露出編輯入口。
- 紅線：`CREATOR_IP` 只存 Cloudflare Pages 的加密環境變數，絕不寫進原始碼（repo 是 public，IP 進去等於公開住家網路位置）。
- 已知 trade-off：換網路（手機熱點、學校、咖啡廳）IP 會變，Creator 判定會失效；更新 `CREATOR_IP` 即可恢復。真正擋住陌生人「發佈」的是 M5 的 GitHub OAuth，IP 只決定「要不要露出編輯 UI + 免評分」，不是安全邊界。

### 評分規則

- Creator（`whoami.creator === true`）：`rate.js` 完全不渲染評分條。
- 評過定案：移除「Change」重評入口（`rate.js:155-157` 的 `editBtn` 與 `.rate-edit`）。已評的 voter 對已評項目只顯示結果、不再有重評按鈕。
- server 端 `rating.js` 本來就是一 voter 一項目一票（`rating.js:41-44` overwrite），前端不給重評入口即可，不需改後端邏輯。

### 編輯入口

Creator 模式時，站上露出一個「進入編輯」入口，連到 `edit.html`。非 Creator 看不到這個入口（但就算直接開 `edit.html` 也發佈不了，見 M5）。

---

## M4 — 所見即所編編輯器（寫回 content.json）

### 目標

整頁就是編輯器、無側欄（沿用 freeform 的體感），但改動寫回 `content.json`，因為兩個 theme 共用它，改一次兩版同步。

### (a) 綁定層

- `renderSite(content, theme, { edit })` 加 edit 旗標。edit 模式下，theme 在輸出每個來自 content 的欄位時附上 `data-bind="路徑"`（如 `data-bind="profile.name"`、`data-bind="items.3.title"`、`data-bind="patent.blurb"`）。
- 在 `src/render/util.js` 加一個 helper 統一產生綁定標記，讓 `featherweight.js` 與 `minimal.js` 的模板改動一致、集中。
- 只有主要可編輯欄位需要綁定：profile、items（title/description/detail/tags/status/year/image/links）、patent、about。空段落（experience/press/education/skills 目前是空陣列）先不處理。

### (b) 編輯層

改造 `src/studio/freeform.js`，從「操作 DOM、匯出 HTML」改成「操作 content 物件、匯出 content.json」：
- boot：讀 `content.json` → `renderSite(content, theme, {edit:true})` → swapDocument。
- 帶 `data-bind` 的元素設 contentEditable；input 事件把值透過 path get/set helper 寫回 content 物件。
- 圖片：雙擊換圖 → 先存 data URL 預覽 + 記住檔案，寫回對應 image 欄位（發佈時真正上傳，見 M5）。
- item 增刪：沿用 hover 的 ✕/⧉，但同步操作 `content.items` 陣列（靠 `data-bind` 的 index 定位）。
- 三個硬點的 MVP 簡化：
  - markdown 詳述欄位：點一下開小浮層 textarea 編原始 markdown（不做 HTML inline 反解）。
  - tags：inline 編成逗號分隔字串，存回時 split 成陣列。
  - status/year 這類受限欄位：inline 編輯即可，發佈前不強制下拉。
- autosave content 到 `localStorage`；toolbar：theme 切換、undo、preview、export content.json、publish。
- theme 切換 = 換 theme 重 render（content 不變）——這就是「兩版同步」的直接體現：同一份改動，切過去就看到另一個 UI。

### 里程碑內的可交付點

M4 做到「編輯 + 匯出 content.json」就先能用（Stan 手動放回 repo 也能上線）。發佈自動化是 M5。這樣就算 M5 卡在密鑰設定，編輯功能已可用。

---

## M5 — 線上一鍵發佈

### 流程

1. Publish → 開 popup 走 `cms-auth` 的 GitHub OAuth（`functions`/worker 已有 `/auth` + `/callback`），`postMessage` 拿回 token。token 只留記憶體，不落地。
2. 用 token 打 GitHub API：
   - GET `content.json` 現有 sha。
   - 若有換過的圖片（data URL）：decode 成檔案、一併 commit 到 `public/assets/`，並把 `content.json` 的對應 image 路徑改成新檔路徑。
   - 用 Git Trees API 一次 commit（content.json + 圖片），或 Contents API 逐檔 PUT。
3. commit 進 `stantheman0128/stan-portfolio` → Cloudflare Pages 自動 build + deploy（postbuild 重烘 `/fast/`）。

### Stan 手動待辦（牽涉密鑰，只能本人做）

- 在 GitHub 註冊一個 OAuth App，拿 client id/secret，callback 指向 `cms-auth` worker 的 `/callback`。
- 設 `cms-auth` worker 三個 secret：`GITHUB_CLIENT_ID`、`GITHUB_CLIENT_SECRET`、`ALLOWED_DOMAINS`（限定編輯頁網域）。
- `npm run deploy:cms-auth` 部署 worker。
- 設 Cloudflare Pages 的 `CREATOR_IP`（M3）。

### 安全

- OAuth scope `public_repo` 足夠 commit 到 public repo。
- token 記憶體only、`ALLOWED_DOMAINS` 限定來源網域。
- 這道 OAuth 是真正的發佈安全邊界：沒有 Stan 的 GitHub 授權，任何人都 commit 不進 repo，頂多改自己瀏覽器的草稿。

---

## 測試策略

- 純函式走 vitest 單元測試（TDD）：path get/set、Voronoi cellIndex 生成、顯影排程（每塊和=1、N 步歸滿）、發佈 commit payload 組裝、測速數字格式化。
- DOM 互動走現有 `puppeteer-core` smoke：編輯器點字寫回、碎形顯影逐步推進。
- 完工前用 preview 實跑 `edit.html`：改一個欄位 → 切 theme → 確認兩版同步；跑 Featherweight → 確認測速數字出現。

## 安全與隱私紅線（實作時主動守）

- `CREATOR_IP` 只在 Cloudflare secret，不進 public repo。
- OAuth token 不落地（記憶體）。
- 照片彩蛋化 = 接受清晰原圖可被抓（已知情同意）。

## 已定的預設（Stan review 可改）

- 逃跑 polaroid 互動保留，只換顯影方式。
- 測速指標用 DOMContentLoaded。
- 照片檔名 `reward-photo.jpg`。
- Voronoi 10 塊；顯影步數 N = quest 總步數。

## 開放問題

- Featherweight 測速的文案定調（footer 那句怎麼改）。
- `edit.html` 的編輯入口在站上長怎樣（Creator 模式露出的按鈕位置/樣式）——留到 M4 實作時決定，非阻塞。
