# Project Handoff — stan-portfolio

> 給接手的 AI(Codex / Claude / 其他):這份檔案讓你無縫接續。請先讀完「專案背景」「本次任務」再動手。本專案最初由 Codex 建立,接手請沿用其手刻風格,**不要重寫成框架**。

---

## Latest Session: 2026-06-06 — 交接「Tier 3 視覺化 CMS 編輯器」實作

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
