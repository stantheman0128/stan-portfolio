# Portfolio 延遲評估與優化（2026-07-09）

目標：讓 `portfolio.stan-shih.com` 對台灣訪客有「一點即開」的體感（阿部寬官網等級）。
方法：一手實測 + 三維度研究並對抗驗證，再落地免費、安全、可 rollback 的改動。

## TL;DR

網站對真實訪客其實已經接近 Abe 等級。`curl` 量到的 ~205ms 是 HTTP/1.1 的假象；
真實瀏覽器走 HTTP/3，正式站首訪 TTFB 只有 ~65–90ms。台灣區的免費改動只有一件有效：
**把回訪從每次白花一個 ~80ms 的 304 revalidation，變成讀瀏覽器快取（~10ms）。**
「做 2–4KB ultra front door」對延遲省不到 1ms，不做。

全球面（globalping 實測）：節點有快取時全球 TTFB 12–38ms（比 Abe 還快）；唯一缺口是
低流量冷節點的「第一個訪客」cache MISS 吃 300–470ms（自癒，下一位就 ~15ms）。免費方案
沒有任何旋鈕能消除它（Tiered Cache 免費部分 Pages 已自動套用、能真正縮短的區域上層是
Enterprise、Cache Reserve 要付費）。**採用的鐵板解：把 `/` 改由 Pages Function 送**——
程式常駐每個節點、回傳內嵌的烤好 HTML，永不 MISS，全球每個首訪都 ~10–40ms。

## 一手實測（同機、同網、真實瀏覽器走 h3）

| | proto | 首訪 TTFB | 回訪 | 回訪 load | HTML brotli |
|---|---|---|---|---|---|
| 正式站 SIN（舊 headers max-age=0） | h3 | ~65–90ms | 304 revalidate ~80ms | ~76–88ms | 6.4KB |
| 等效 preview TPE（新 headers max-age=300） | h3 | ~41–50ms | **fromCache 0ms** | **~10ms** | 6.4KB |
| Abe 寬（參考，純 HTTP 免 TLS，日本自架） | h1.1 | ~90ms | — | — | 538B |

curl（HTTP/1.1）對照僅供分解：正式站冷連線 TTFB ~205ms = TCP + TLS + request 三個網路來回；
熱連線（重用）~60ms = 一個來回。SIN 每個來回 ~60ms、TPE ~18ms。

## 為什麼「頁面大小」不是瓶頸（三重確認）

1. front door 壓縮後 6.4KB，遠小於 TCP 初始壅塞窗（initcwnd 10 ≈ 14.6KB，CF edge 更大），
   整份 HTML 跟第一個 byte 同時送達（實測 `total ≈ TTFB`，下載時間 ≈0）。
2. 砍到 3KB 跨不過任何一個網路來回，first-paint 改善 ~0ms（研究對抗驗證：VERIFIED）。
3. 真實瀏覽器 TTFB 已由握手決定（~65–90ms），不是大小決定。

結論：不拆 `/` + `/full`，不做 ultra front door，不加 build-time regex minify（`>\s+<`
會吃掉 inline 元素間空白、可能讓連結黏在一起，換 ~0ms 不值得）。

## 「像 Abe 一樣快」的物理真相（免費方案的天花板）

- 正式站落新加坡（SIN）。這是 **Cloudflare 免費方案對台灣 HiNet 的預期行為，不是設定錯**。
  Cloudflare 官方部落格 "Bandwidth Costs Around the World" 明講 HiNet 是六個「貴 15 倍」的網路之一，
  他們把免費用戶從這些 transit 移走、改由「另一個區域快取」服務，對台灣就是新加坡。
- 免費方案**無法**強制落台北。DNS 技巧、CNAME、Argo Smart Routing 都改不了落點（全部查證過）。
  pages.dev 之所以落台北，是因為它在不同的 anycast IP 段；自訂網域的 zone 走另一個段被導去 SIN。
- 但因為 h3 已經把 SIN 的握手壓成 ~1 個來回，首訪 TTFB 已經 ~65–90ms，逼近 Abe。
  h3 下 SIN vs TPE 只差 ~25–40ms（不是 curl 看到的 127ms），而且不可免費修。
  **為了這 ~30ms 搬家並不值得**（還會弄壞 Pages Functions：unlock / publish / rating）。
- 唯一能真正到 ~78–90ms 冷首訪的路，是讓台灣訪客落在台北或鄰近日本、且與 HiNet 直連的節點，
  代表要把這個網域搬離 Cloudflare Pages 免費方案。列為未採用選項（見下）。

## 這個分支已實作（免費、安全、可 rollback）

1. `public/_headers`：拆開 browser TTL 與 edge TTL。browser `max-age=300` +
   `stale-while-revalidate`；edge 用 `Cloudflare-CDN-Cache-Control` 拉長。
   刻意不放 `s-maxage` / `must-revalidate` / `no-cache`（會關掉 stale-while-revalidate）。
   → 回訪 ~80ms 變 ~10ms。這是唯一有實質效益的改動。
2. `src/render/themes/featherweight.js`：mailto 包 `<!--email_off-->`，
   阻止 Cloudflare 注入 `email-decode.min.js`，維持零外部 JS。（+26 bytes brotli，附測試）
3. `tools/perf/`：browser-nav.mjs（真實瀏覽器 h3 計時）+ size-report.mjs（raw/gzip/brotli）。
4. **`functions/index.js`：`/` 改由 Pages Function 送**（全球鐵板）。回傳內嵌的 brotli
   payload（6398 B，與靜態版同 wire），content-negotiate + raw fallback，browser cache
   policy 同靜態 `_headers`。`tools/front-door-bake.mjs` 從單一來源烤 payload，`postbuild.mjs`
   同源產出 `functions/_front-door.js`（gitignore、零手維護）。用**檔案式路由**故 `functions/api/*`
   完全不受影響；刻意不用 `_worker.js`（會廢掉 API）、不手寫 `_routes.json`（Pages 自動產）。

測試：67 passed（原 60 + email guard 4 + front-door payload 3）。build 正常。

## 待 Stan 手動做的 Cloudflare 後台設定（checklist）

前置：登入 Cloudflare Dashboard → 選 `stan-shih.com` zone（不是 Pages 專案頁）。

1. **開 0-RTT Connection Resumption**（省回訪一個握手來回，免費）
   - 位置：`Speed` → `Optimization` → `Protocol Optimization` → `0-RTT Connection Resumption` = On
   - 何時：任何時候，馬上生效。風險：低（本站只有 idempotent GET，無 replay 疑慮）。
2. **確認 HTTP/3 (with QUIC) = On**（實測已在生效，確認即可）
   - 位置：同上 `Protocol Optimization` → `HTTP/3 (with QUIC)` = On
3. **關 Email Address Obfuscation**（雙保險；程式已用 email_off，這裡再關更乾淨）
   - 位置：`Scrape Shield` → `Email Address Obfuscation` = Off
   - 注意：關掉後頁面上的 email 會變成可被爬蟲抓的純文字，本站可接受。
4. **確認以下全部維持關閉**（對本站無益或有害）：
   `Rocket Loader`、`Mirage`、`Polish`、`Early Hints`、`Argo Smart Routing`、`Tiered Cache`。
   （`Auto Minify` Cloudflare 已於 2024-08-05 下架，無需處理。）
5. **部署後清 cache**（讓新 headers 立即生效）
   - 位置：`Caching` → `Configuration` → `Purge Everything`（或只 purge 首頁 URL）
   - 何時：把這個分支合進 `main`、Pages 重新部署完成之後。

## 部署方式

正式站從 GitHub `main` 自動部署（Cloudflare Pages Git 整合，目前 live = `bf04de5`）。
本分支 `perf/latency-tier-a` 從 `bf04de5` 開出，是疊在正式站上的最小 delta。
上線 = 把這三個 commit 併進 `main` 並 push；Pages 會自動 build + 部署，並自動 purge edge cache。
建議先 push 這個分支 → Cloudflare 產生 preview URL → 用 `node tools/perf/browser-nav.mjs <preview> 2`
確認回訪 fromCache=true、load ~10ms，再併 main。

## 刻意未採用（附理由）

- **ultra front door 2–4KB**：首訪 ~0ms 效益（頁面已在一個壅塞窗內）。不做。
- **build-time `>\s+<` minify**：~0ms 效益、會破壞 inline 空白的風險。不加。
- **付費升 Business（~$200/mo）換 TPE**：只有澳洲/印度的軼事證據、對 HiNet 不保證，CP 值低。不做。
- **搬離 Cloudflare 換能落 TPE 的 host**：能到 ~78–90ms，但要重寫 Pages Functions、失去 CF
  免費 CDN/防護。ROI 太低。若哪天真的很在意這 ~30ms 再單獨評估。
