# 個人網站版本盤點與 SEO / GEO 更新

盤點日期：2026-09-14（Asia/Taipei）。Stan 已確認定位為「AI 產品開發者／AI Agent Builder」。
本文件區分線上觀察、本地修正、後續內容工作；不代表已部署或提升排名。

## 哪個資料夾最新

GitHub repository: https://github.com/stantheman0128/stan-portfolio

fetch 後遠端 main = af44ea5，最後更新 2026-07-15 21:43:23 +08:00，
移除 Community & Press 與 Education。

| 原目錄 | 盤點結果 | 處理 |
| --- | --- | --- |
| stan-portfolio | 主倉庫；舊功能分支 716af55，落後遠端 96 commits，無獨有 commits；工作樹乾淨 | 從最新遠端建立 codex/portfolio-seo-refresh，保留原分支 |
| stan-portfolio-perf-final | 同一倉庫的 linked worktree；local main=e8c1e18，落後遠端 11 commits；工作樹乾淨 | 保留，含 ignored 的 dist、node_modules 等，不視為空資料夾 |
| 其餘 10 個 portfolio-* | 含隱藏項目逐一檢查，都是空目錄 | 集中封存，原名稱保留 |

10 個目錄：portfolio-classyear、portfolio-edu、portfolio-fixes、portfolio-kcis-year、
portfolio-perf2、portfolio-press、portfolio-press2、portfolio-remove、portfolio-seo、
portfolio-wikidata。

封存位置：C:\Users\stans\Projects\_archive\portfolio-empty-2026-09-14。
唯一新工作入口：C:\Users\stans\Projects\stan-portfolio。
第二個 worktree 不搬動，以免破壞 Git 關聯或其他工具。未執行 reset、clean、stash、force push。

## 線上檢查結果

以實際 HTTP 讀取確認。搜尋工具未能讀取部分站點，本機 HTTP 則可正常取得。

| 檢查 | 2026-09-14 結果 | 意義 |
| --- | --- | --- |
| https://stan-shih.com/ | 200，完整 HTML，自我 canonical | 正式首選網址已是根網域 |
| https://portfolio.stan-shih.com/ | 200，canonical 指向根網域 | 舊主機仍直接顯示內容，首頁未轉址 |
| https://stan-portfolio.pages.dev/ | 200，canonical 指向根網域 | 主機別名仍公開 |
| 首頁 title | Stan Shih — AI Product builder · Future Startup Founder | 專業定位是舊版 |
| robots.txt | 200，允許爬取、列出 sitemap | 不等於 CDN 已對所有機器人開放或索引已收錄 |
| sitemap.xml | 200，只有首頁與 /interactive | 尚缺獨立作品案例頁 |
| /interactive | 約 2 KB 的 HTML 殼，主內容需 JS 抓取 | 非 JS 爬蟲資訊有限 |
| 隨機不存在路徑 | 200，回首頁 | soft-404 風險 |
| llms.txt | 保留學歷、經歷與媒體等獨立敘述 | 與目前空白的 education/experience/press 不同步 |
| Wikidata Q140533907 | 頁面與 Special:EntityData JSON 都回 404 | 不是可用的身分來源；刪除原因未調查 |

搜尋抽樣包含 Stan 字典義與施振榮結果；不是指定地區、語言、無個人化的 Google 排名基準。
不能由 site: 搜尋推定完整收錄狀態。本次尚未取得 Search Console、Bing Webmaster Tools
或 AI 搜尋實際引用流量。線上部署與 af44ea5 的內容一致跡象不等於已核對 deployment commit。

## 本地第一批修正

1. 首頁改為 AI Product Developer · AI Agent Builder，補真實中英文姓名、Taipei 與現有作品類型。
2. 移除失效 Wikidata sameAs 和可見內容未呈現的硬編碼學校欄位；保留穩定 #person 身分與社群連結。
3. llms.txt 改由 renderMarkdown(content) 於 build 產出，與首頁 Markdown 回應共用內容。
4. 移除任意路徑回首頁 200 的規則，新增 404 文件；舊 /projects、/colonist 導向作品區。
5. Sitemap 省略 lastmod，直到有可靠的內容修改日期，避免每次 build 都冒充內容更新。
6. README 更新為真正的主目錄、目前資料來源、Live Studio 與部署限制。

首頁草稿：
- Role: AI Product Developer · AI Agent Builder
- Tagline: I build AI tools and software for everyday problems.
- Description: Stan Shih (施博瀚 / Po-Han Shih), an AI product developer and AI agent builder
  in Taipei, Taiwan. Explore my web apps, Android tools, and browser extensions.

## 姓名搜尋：目標與量測

Stan 後續明確指定主要目標為 Google 搜尋「Stan Shih」或「施博瀚」前一至兩名。
以下長尾查詢用於輔助辨識及早期量測，不取代這兩個主要成效目標。

「比某人有名」與「某一查詢排名第一」是不同目標。排名依查詢意圖、地區、語言等而變。
Stan 還對應字典用語、影視、品牌與其他人物，技術 SEO 不能保證單字查詢世界第一。

| 優先度 | 查詢例子 | 工作目標 |
| --- | --- | --- |
| 1 | 施博瀚 AI、Po-Han Shih、stantheman0128、Stan Shih portfolio | 尋找本人者看見正確網站，降低同名混淆 |
| 2 | Stan Shih AI、Stan AI developer Taiwan、作品名 + Stan | 姓名、專業、作品建立一致關聯 |
| 3 | 具體 AI Agent 實作與產品問題 | 用原創解法接觸尚不認識作者的人 |
| 長期 | Stan Shih，再到 Stan | 累積站外引用、作品採用與品牌搜尋需求；不是第一批改版驗收承諾 |

建議公開姓名固定為 Stan Shih（施博瀚），英文可補 Po-Han Shih。
不必換掉 Stan；用真實領域、作品、地點與 GitHub 帳號提高辨識。
不要把施振榮的資料連入 sameAs，也不要在每頁堆疊他的名字。

## 第二批已實作的內容

- `/about`、`/zh/about`：中英文人物頁、同一個 Person ID、本人照片、公開帳號與作品關聯。
- `/work`：案例索引；四篇案例為 Antnest Chatbot、Paper Stan、ClaudePulse for Windows、Notify+。
- 每篇案例包含可見作者、獨立 canonical、title/description、靜態正文、來源連結及 Article/BreadcrumbList。
- 首頁標題及 H1 帶有 Stan Shih 與施博瀚；英文與中文 About 互相連結及宣告 hreflang。
- `/interactive` 在建置時產出完整 HTML；sitemap 包含 9 個 canonical URL。
- `llms.txt`、Markdown 與可見內容共用資料；移除專案後，案例頁與 sitemap 也會同步排除。
- 修正 Notify+ 已上架 Google Play 的狀態與連結、錯誤 repo URL，以及過期效能宣稱。
- 公開編輯器加 noindex；取得目前 Google 帳號的 Search Console 公開驗證 token，放進首頁 head。

## 後續內容與站外工作

- 新案例逐一核對 repo、demo、release、貢獻與成效證據，再寫實作與技術取捨。
  不把原型當上線、不把 build 當使用成效、不把研究假說當證明。
- 延伸案例必須有實際新增內容，不製造只有關鍵字不同、內容薄弱的頁面。
- 持續寫自己實作過的 AI Agent 問題與解法，提供能查核的數據與來源，署名連回人物頁。
- GitHub、LinkedIn、產品 README、官方活動講者頁統一姓名與網站入口。
  有價值的開源貢獻、產品使用、訪談與活動可建立真實站外引用。

## GEO 與量測

Google AI Overviews / AI Mode 沿用 SEO 基礎，沒有額外必備的 AI 文字檔或 schema。
llms.txt 只是輔助入口，不能當作排名／引用保證。正文可取用、內容可靠、作者明確、
其他可信來源可交叉驗證才是重點。其他 AI 搜尋服務需要各自驗證，不能一概套用 Google 文件。

後續驗收：
1. Search Console 驗證網域、提交 sitemap，查看 URL Inspection 的抓取、Google-selected
   canonical、渲染內容。Bing Webmaster Tools 另建基準。
2. 根網域／別名轉址先盤點 editor、OAuth、API 的 host 依賴。本次未動 DNS 或跨主機轉址。
3. 記錄 28 天 impressions、clicks、CTR、查詢與落地頁；依國家、裝置分組，
   再與下一個 28 天比較，不預先宣稱成長幅度。
4. 固定中英文 AI 提問樣本，記錄平台、日期、本人辨識正確率、同名混淆、是否附本站來源。
   單次回答只是樣本，不是全平台穩定排名。
5. 追蹤作品 Demo、GitHub、聯絡入口等有價值的點擊，不只看 Stan 的曝光。

## 本次驗證

- `npm test -- --maxWorkers=1`：37 個檔案、259 個測試通過。
- `npm run build`：縮圖、Vite、postbuild 全部成功。
- 產物檢查：dist 首頁與 Function 的 HTML 一致；llms.txt、Function Markdown、
  目前 content.json 的 Markdown render 逐字一致；姓名與新定位存在；失效 Wikidata、
  舊學歷文字不再出現在檢查的 AI 產物；sitemap 沒有假更新日期。
- 隔離的本地 Cloudflare Pages 模擬：共 17 個網址檢查通過；七個新增頁面、首頁、interactive、fast、llms.txt、sitemap 回 200；
  不存在頁面回 404；projects、colonist 回 301 並指向作品區；首頁 Markdown 與 llms.txt 一致。
  新頁面 canonical 與 Person ID 正確，studio/admin 回 noindex。
  測試使用本次 build 的公開文件及原樣複製的首頁 Function，不含 AI/API 綁定。
- 真實瀏覽器：375px 首頁及中英文 About、768px 案例、1280px 互動版沒有水平溢出；
  照片可讀取，語言切換正常，互動版主內容與 Paper Stan 容器載入。
- 既有完整環境的 Wrangler 因遠端 AI 綁定登入失效而無法啟動，因此這不是完整 API／AI
  功能測試。未修改登入或雲端設定；沒有執行 AI 推論。
- Search Console 已加入 `https://stan-shih.com/` URL-prefix property，並完成目前帳號的所有權驗證。
  預覽、正式部署與 sitemap 提交結果另記於發布紀錄；本地檢查不代表正式 Google 收錄。

## 發布紀錄（2026-09-14）

- 實作 commit：`43777326c59df7918e3caa5c919947f0bd3ee18f`。
- 預覽部署 `ebfca503` Cloudflare check 成功；預覽站的 9 個 canonical 頁、
  sitemap、Markdown 同步、404、301 與編輯器 noindex 全部通過 HTTP 驗證。
- 正式 main 以 fast-forward 從 `af44ea5` 更新至 `4377732`，remote SHA 已核對。
  Cloudflare 正式部署 `f29b2ef4` 成功；`https://stan-shih.com` 上相同檢查全部通過。
- Google Search Console 以 HTML tag 回報 **Ownership verified**。
  目前資料仍顯示 Processing data；不可宣稱已取得排名、曝光成長或所有新頁面已收錄。
- 舊 sitemap 紀錄：2026-07-13 提交、2026-09-13 最後讀取、Success、2 個發現頁面。
  本次重新提交包含 9 個網址的 `/sitemap.xml`，Google 回報 **Sitemap submitted successfully**。
- `/zh/about` 初次檢查為 URL is unknown to Google；`/about` 為 Discovered - currently not indexed，
  並已列出新 sitemap。兩頁各提交一次 Request indexing，皆回報 **Indexing requested**，
  已進入 priority crawl queue。此回報不代表已收錄。
- 首頁原本已收錄（**URL is on Google / Page is indexed**）；最後抓取日期為 2026-09-07，
  Googlebot smartphone，抓取與索引均允許。User-declared canonical 與 Google-selected canonical
  都是本次使用的 `https://stan-shih.com/`；這是舊版抓取狀態，並非新版已重新收錄的證據。
  已另送出一次首頁重新抓取要求，Google 同樣回報 **Indexing requested**。
- 本地預覽程序已停止，Sentinel heavy slot 已釋放。鍵盤焦點、深色模式、作品展開、
  Paper Stan 對話框也已用瀏覽器驗證；未測試此次未修改的雲端 AI 推論及發佈 API。

## 一手參考

- Google AI: https://developers.google.com/search/docs/appearance/ai-features
- ProfilePage: https://developers.google.com/search/docs/appearance/structured-data/profile-page
- Canonical: https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls
- Sitemap: https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap
- Cloudflare 404: https://developers.cloudflare.com/pages/configuration/serving-pages/
- Cloudflare redirects: https://developers.cloudflare.com/pages/configuration/redirects/
