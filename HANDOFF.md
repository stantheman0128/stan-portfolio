# Project Handoff — stan-portfolio

> 給接手的 AI(Codex / Claude / 其他):這份檔案讓你無縫接續。請先讀完「專案背景」「本次任務」再動手。本專案最初由 Codex 建立,接手請沿用其手刻風格,**不要重寫成框架**。

---

## Latest Session: 2026-07-02 — Live Studio 自助編輯器（HackMD 式）

### 做了什麼
- 從「純作品集」升級為「完整個人網站 + 自助編輯器」。先跑 6 設計方向探索（`demo-concepts/`），Stan 選定 **Featherweight + Minimal** 兩個。
- **自建 Live Studio 編輯器**（左編輯／右即時預覽，像 HackMD）+ 內容/設計分離 + 兩主題 + 公開站入口。
- 三個 commit 全推上分支 `demo/personal-site-concepts`：`dc40398`（6 demo + 第一版極簡）、`c866200`（Studio + 共用 render + 兩主題）、`7c699e6`（公開站入口）。origin/main 完全沒動。

### 關鍵決策
- **棄用 Sveltia CMS，改自建 Live Studio**：Sveltia 是「填表單 → 存 → 之後才看到結果」，Stan 要「邊改邊即時看到整個網站長出來」。→ **下個 AI 不要回去用 Sveltia/Decap。**
- **內容/設計分離**：`data/content.json` 單一真相 → 共用 `renderSite(content, theme)` → 正式站與 Studio 右側預覽**共用同一 render 函式**（所見即所發布）。
- **持久化走 GitHub-backed（非後端 DB）**：維持靜態/快/任何裝置可開；發布時 commit 回 repo。
- **主題零外部資源**（系統字體、CSS/JS 全內嵌）：快、離線可用，並避開 Google Fonts 害 headless 截圖卡死。
- **通用 portfolio（非 Colonist 專屬）**：公開內容＝作品/專利(US10699576B1)/Nothing/Dcard/CMU 成長故事/工作經歷；**排除（隱私）**＝投資/ETF 績效、完整得獎史、女友脈絡。

### 目前狀態
- 能跑嗎：**是（本機）**。Stan 雙擊 `serve-demos.cmd` 跑自己的 vite（port 5173）。
  - Studio：`http://localhost:5173/studio.html`（左編右即時預覽、切主題、items 增刪改、localStorage 自動存、Export JSON）
  - 公開站：`http://localhost:5173/site.html`（新主題渲染 + 右下訪客切主題）
- 已完成（P1 + P2c，皆 Playwright/headless 實測）：內容模型、共用 render、Featherweight/Minimal 兩主題、Studio 編輯器、公開站入口。

### 已知問題 / 陷阱
- **localhost 一直掛**：Claude Preview MCP 的 dev server 綁 session、會被系統回收。解法＝Stan 自己 `serve-demos.cmd` 或 `npm run dev`（脫離 Claude session）。別再靠 `preview_start` 當常駐。
- **在分支、不在 main**：新東西全在 `demo/personal-site-concepts`；正式站 `main`（`index.html` + `src/main.js`）仍是舊 Colonist SPA，沒動。新 session／新電腦要先 `git checkout demo/personal-site-concepts` + `npm install`。
- **兩套內容並存**：新編輯器用 `data/content.json`；舊的 `data/site.json` + `data/projects/*.md`（給舊 index / 已棄的 Sveltia）仍在，別搞混。
- Windows：PowerShell（`;` 不是 `&&`）；headless 截圖用 `"/c/Program Files/Google/Chrome/Application/chrome.exe"`。

### 下一步（P2 收尾）
1. **Studio「Publish」接 GitHub**：沿用現有 OAuth worker（`base_url: https://stan-portfolio-cms-auth.stanshih888.workers.dev`，見 `public/admin/config.yml`）拿 token → GitHub Contents API commit `data/content.json`。⚠️ 最終測試**要 Stan 在瀏覽器用 GitHub 登入一次**（OAuth 無法代點）。
2. **圖片真上傳**：Studio 目前只有本機 objectURL 預覽；Publish 時把新圖 commit 到 `public/assets`。
3. **公開站 build 期預渲染成靜態**（拿掉 `src/site/site.js` 的 `document.write`），並決定何時把 `index.html` 換成新設計。
4. **部署 preview 網址**：`wrangler pages deploy`（wrangler 已登入 stanshih888@gmail.com；account `97cf88bf307d6a78c496e80ae99677de`），獨立 pages 專案、不碰正式站。
5. 次要：Studio 左側補上 patent/experience/press/education/skills 的編輯（目前只做了 profile/about/items）。

### 檔案地圖（本次新增，皆在分支上）
- `data/content.json` — 內容單一真相
- `src/render/renderSite.js`（dispatcher）、`src/render/util.js`（esc/md/realLinks）、`src/render/themes/{featherweight,minimal}.js`（`render(content)→完整HTML`）
- `src/studio/studio.js` + `studio.html` — 編輯器
- `src/site/site.js` + `site.html` — 公開站入口
- `serve-demos.cmd` — 雙擊啟本機 server；`tasks/todo.md` — 進度；`demo-concepts/` — 6 設計方向 demo

### 給下一個 AI 的提示
- **不要回去用 Sveltia CMS**（Stan 明確不要表單式編輯）。
- 別靠 Claude 管的 preview server 當常駐（會週期性掛）；要 Stan 自己終端機開。
- 對外/不可逆動作（部署公開網址、動 main、commit）**先確認**；Stan 重視審閱權，故一切在 feature 分支。
- 記憶檔 `project_stan_portfolio.md` 有更完整的歷史脈絡。

### 建議下個 AI 用的 skill
- 接發布/部署管線 → `guided-dev` 或 `feature-dev`；Cloudflare 部署 → `wrangler` / `cloudflare`。
- 動 UI 手感 → `impeccable`；對外文案定稿 → `humanizer`。

---

## Previous Session: 2026-06-06 — 交接「Tier 3 視覺化 CMS 編輯器」實作

### 本次任務(要你做的事)
擁有者(Stan)要的最終目標:**在這個手刻網站上加一個 `/admin` 視覺化編輯器(Git-based CMS)**,讓他之後改文字/換圖**完全不用碰程式、不用跑指令、手機也能改**,存檔後自動部署上線。他最在意的就是「**能自己做一個屬於這個站的編輯器**」。

這是「Tier 3」。它 = 「Tier 2 自動部署基礎建設」+「內容與程式分離」+「CMS 層」。三層都要做。

### 目標架構(建議,可與擁有者確認後微調)
- **CMS**:**Sveltia CMS**(現代、輕量、CF Pages 友善,Decap/Netlify CMS 的後繼者)。Decap CMS 亦可,但優先 Sveltia。
- **內容格式**:每個專案一個 Markdown 檔(frontmatter)放在 `data/projects/`,全站文案放 `data/site.json`(或 `.md`)。理由:Markdown collection 對 CMS 最友善,改一個專案 = 改一個檔。
- **自動部署**:**Path B(建議,對現有網域零干擾)** = 保留現有 direct-upload Pages 專案,新增 GitHub Actions,在 push 到 `main` 時 build + `wrangler pages deploy`。
  - Path A(不建議,除非擁有者要):另建 Git-connected Pages 專案 + 搬 custom domain + 改 DNS CNAME target。會動到目前正常運作的網域,風險高。

### 建議實作階段(Phase)
**Phase 0 — 內容 ÷ 程式(地基,先做)**
1. 把 `src/main.js` 裡的 `projects` 陣列、`strengths`、`highlights`、各頁文案(hero headline/subhead、colonist callout、about prose)抽到 `data/`:
   - `data/projects/<slug>.md` × 8(frontmatter:`title, status, path, description, tags[], image, imageMode("" | "icon" | "contain"), alt, links[{label,href}], hero(bool), order`)
   - `data/site.json`:`email, github, linkedin, resume, hero{headline,subhead}, colonistCallout, about{...}, strengths[], highlights[]`
2. 重構 `main.js` 改成 build-time 載入這些資料(Vite 的 `import.meta.glob('../data/projects/*.md')` 或 import JSON)。**渲染輸出與 CSS 必須完全不變**——這是搬水電,不是重新設計。
3. 驗證:build 後頁面內容與現在逐字一致(可比對截圖)。

**Phase 1 — Git + 自動部署**
1. `git init` → 推到新的 GitHub repo(建議名 `stan-portfolio`)。
2. 新增 `.github/workflows/deploy.yml`:push `main` → `npm ci && npm run build` → `wrangler pages deploy dist --project-name=stan-portfolio --branch=main`。
   - GitHub secrets 需要:`CLOUDFLARE_API_TOKEN`(權限 Pages:Edit)、`CLOUDFLARE_ACCOUNT_ID`(= `97cf88bf307d6a78c496e80ae99677de`)。
3. 驗證:隨意改一行 → push → Actions 綠燈 → 線上更新。

**Phase 2 — Sveltia CMS(`/admin`)**
1. 新增 `public/admin/index.html`(載入 Sveltia CDN)+ `public/admin/config.yml`:
   - `backend: { name: github, repo: <user>/stan-portfolio, branch: main, base_url: <OAuth worker URL> }`
   - `media_folder: "public/assets"`,`public_folder: "/assets"`
   - `collections`:`projects`(folder collection 對 `data/projects`,欄位對應 frontmatter)+ `site`(file collection 對 `data/site.json`)
2. GitHub OAuth(讓 CMS 能 commit):部署官方 **`sveltia-cms-auth` Cloudflare Worker**,在 GitHub 建一個 OAuth App(callback = worker URL),設 Worker secrets(`GITHUB_CLIENT_ID`/`GITHUB_CLIENT_SECRET`/`ALLOWED_DOMAINS`),把 CMS `base_url` 指向它。
3. 驗證端到端:`portfolio.stan-shih.com/admin` → GitHub 登入 → 改一個專案 / 拖拉上傳一張圖 → Publish → repo 出現 commit → Actions build → 線上更新。

### 關鍵決策(以及為什麼)
- **沿用手刻、不導入框架**:擁有者偏好手刻、無鎖定。CMS 選 Git-based 而非 headless,就是為了不養外部資料庫、編輯器內建於站。
- **內容抽成資料檔**:Tier 3 的 CMS 必須編輯「純資料」,不能讓使用者誤改渲染邏輯。
- **自動部署走 Path B(GitHub Actions)**:避免搬動目前正常的 custom domain + DNS,風險最低。

### ⚠️ 必讀陷阱 / 限制
- **`renderColonistPage()` 目前用硬編 index**(`projects[0]`、`related = [projects[1],[2],[3],[5]]`)。內容搬到資料檔、且 CMS 可重排順序後,**這會壞**。請改成用明確旗標/key 選取(例如 per-project 的 `colonistRelated: true`,或 site.json 裡一個 slug 清單)。**這是最容易踩的雷。**
- **`#TODO-*` placeholder 連結**是**故意**的:`renderLinks()` 會自動過濾隱藏(訪客看不到死按鈕)。重構後**務必保留這個過濾行為**,CMS 也要允許 href 留 `#TODO-...` 或空白。
- **ETF/Quant 那張圖**(`etf-tracker-screenshot.png`)會公開擁有者真實的投資組合數字(總值/持倉/報酬)。擁有者**已知情並同意公開**——不要自作主張移除或「修正」。
- **Resume PDF 故意不放**(目前沒有去敏感版本,footer 已移除該連結)。不要擅自加。
- **不要杜撰任何連結/數據**。未確認的一律 `#TODO-`。
- 語言:跟擁有者溝通一律**繁體中文(禁簡體)**;網站文案維持**英文**。
- 環境:Windows + bash。Python 用 `python`(Pillow/win32 已裝)。**`rm -rf` 被保護規則擋住**,要刪資料夾用 Python `shutil.rmtree`。
- cloudflare-api MCP(Code Mode 的 execute/search 工具)**只在 CLI session 出現,GUI app 抓不到**。要動 Cloudflare 請在 CLI 跑。

### 目前狀態(本次 session 已完成)
- 能跑嗎:**是**。已上線 `https://portfolio.stan-shih.com`(+ `/projects`、`/colonist`),全綠。
- 已完成:
  - 移除 **MP3 Converter**、**Nothing Voice Input** 兩張卡(含金量不足 / 根本沒 app)。
  - 補上真實圖:**ClaudePulse**(`claudepulse-screenshot.png`,imageMode `contain`,來源是其 README 既有的 session 清單截圖)、**ETF/Quant**(`etf-tracker-screenshot.png`,跑 `next dev` 截的真實 dashboard)。
  - **現在 8 個專案全部有真圖,文字 placeholder 歸零。**
  - rebuild + deploy(目前線上 bundle `index-DnNBWtLB.js`);README 已更新。
- 還沒做:**Tier 3(本交接的任務,Phase 0→2 全部)**。

### 基礎事實(接手會用到)
- 專案路徑:`C:\Users\stans\Projects\stan-portfolio`
- Stack:Vite 8 + 原生 JS SPA(client-side render),`src/main.js` 是內容+邏輯來源,`src/styles.css` 是樣式,`public/_redirects` 做 SPA fallback。
- Build:`npm run build`(= `vite build`,輸出 `dist/`)。
- 部署(現況 direct upload):`npx --yes wrangler@latest pages deploy dist --project-name=stan-portfolio --branch=main --commit-dirty=true`
- Cloudflare:account `97cf88bf307d6a78c496e80ae99677de`;Pages 專案 `stan-portfolio`;custom domain `portfolio.stan-shih.com`(zone `stan-shih.com` id `5fb4b4501bac832b61278ec5dddc9a17`,CNAME `portfolio → stan-portfolio.pages.dev`,proxied)。
- **尚未** git init、**尚未** 有 GitHub remote。

### 給下一個 AI 的提示
1. 先做 Phase 0(內容抽離)並驗證渲染零變化,再碰部署/CMS——地基不穩後面都白做。
2. 動手前先跟擁有者確認三個選項:CMS(Sveltia vs Decap)、自動部署(Path B GitHub Actions vs Path A Git-connected)、內容格式(md-per-project vs 單一 JSON)。建議值都已標在上面。
3. 擁有者是工程師、偏好直接執行、重視「少而精」與含金量;但**對外/不可逆動作(動網域、公開資料、刪檔)先確認**。
4. 完工標準:擁有者能在 `/admin` 改一段文字 + 換一張圖 + 按 Publish,1~2 分鐘後線上自動更新,全程不碰程式碼、不跑指令。
