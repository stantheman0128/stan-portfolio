# 就地編輯器 + 導覽精簡 + 邊緣快取 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (or subagent-driven-development) to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** 把獨立的 `/edit` 分頁換成「裝置解鎖的 Edit 鈕 → 就地浮出編輯器 + 右側控制欄」;發佈維持 IP;退役 whoami;精簡版本導覽;前門 HTML 邊緣快取。

**Architecture:** 解鎖走一次性伺服器驗證(`/api/unlock` 比對 Cloudflare secret `EDIT_SECRET`)→ 設 localStorage 旗標;之後每次訪問只讀旗標(零請求)顯示 Edit 鈕。按 Edit 注入固定網址的 `/editor.js`(postbuild 用 esbuild 從 `freeform.js` 打包)→ 就地重繪當前 theme 的 edit 版 + 掛右側控制欄。發佈端點不動(IP)。導覽:互動版走乾淨 `/interactive`、移除浮動切換鈕、自介卡指乾淨路徑。

**Tech Stack:** Cloudflare Pages Functions、vanilla JS(ES modules)、Vitest、Vite + esbuild(已是 vite 相依)、既有 `renderSite` 管線。

## Global Constraints

- 只碰 System A(`content.json` → `renderSite` → `themes/*` + `functions/` + `src/studio/` + `src/site/`)。
- 版本紀律:每 task 一 commit;`git add <指定路徑>`,不用 `git add -A`。分支 `feat/sprite-quest`(= main)。
- 純函式走 Vitest;字串注入模組走「injection contract」字串斷言;DOM/build 走 `npm run build` 綠 + 完工前 `npm run build && npm run preview` 實跑。
- 溝通繁體中文,程式識別碼/檔名/API/UI 文案英文。
- **安全紅線**:`EDIT_SECRET` 只存 Cloudflare 加密環境變數,前端程式碼零明文。發佈認 `cf-connecting-ip === CREATOR_IP` 不變。編輯器「可見」不是安全邊界,真正的鎖是發佈(IP)。
- **旗標鍵一致**:全專案用 `localStorage["can-edit"] === "1"` 代表「此裝置可編輯」。

## File Structure

- `functions/_lib/unlock.js` — 新;`unlockOk(input, secret)` 純函式。
- `functions/api/unlock.js` — 新;POST 驗 `EDIT_SECRET` → `{ok}`。
- `functions/api/whoami.js` — **刪**。
- `src/render/fx/creator-entry.js` — 重寫;解鎖流程 + 讀旗標顯示 Edit 鈕 + 按鈕載 `/editor.js`。
- `src/render/fx/rate.js` — creator 判斷從 whoami 改讀 `can-edit` 旗標。
- `src/studio/freeform.js` — 改成就地掛載(讀當前 theme)、控制欄改右側;auto-run `mountEditor()`。
- `src/render/themes/{featherweight,minimal}.js` — `<html>` 加 `data-theme`;featherweight 頁尾連結 → `/interactive`。
- `tools/postbuild.mjs` — esbuild 打包 `freeform.js` → `dist/editor.js`。
- `vite.config.js` — 移除 `edit` 入口、加 `interactive` 入口。
- `edit.html` — **刪**;`interactive.html` — 新。
- `src/site/site.js` — 移除浮動切換鈕;支援固定 theme 入口。
- `data/content.json` — 自介卡連結改乾淨路徑。
- `public/_headers` — 新;HTML 邊緣快取。
- tests:`tests/unlock-ok.test.js`、`tests/creator-entry-inject.test.js`(改)、`tests/rate-flag-inject.test.js`(新)。

---

## Task 1: `/api/unlock` 伺服器驗證

**Files:** Create `functions/_lib/unlock.js`, `functions/api/unlock.js`, `tests/unlock-ok.test.js`

**Interfaces:** Produces `unlockOk(input, secret) => boolean`(兩者皆非空且相等才 true);`POST /api/unlock` body `{k}` → `{ok:boolean}`。

- [ ] **Step 1: 失敗測試 `tests/unlock-ok.test.js`**
```js
import { describe, it, expect } from "vitest";
import { unlockOk } from "../functions/_lib/unlock.js";

describe("unlockOk", () => {
  it("true only on exact non-empty match", () => {
    expect(unlockOk("s3cret", "s3cret")).toBe(true);
  });
  it("false on mismatch", () => {
    expect(unlockOk("nope", "s3cret")).toBe(false);
  });
  it("false when either side is empty", () => {
    expect(unlockOk("", "s3cret")).toBe(false);
    expect(unlockOk("s3cret", "")).toBe(false);
    expect(unlockOk("s3cret", undefined)).toBe(false);
  });
});
```
- [ ] **Step 2: 跑測試確認 FAIL** — `npx vitest run unlock-ok`
- [ ] **Step 3: 實作 `functions/_lib/unlock.js`**
```js
// True only when a non-empty candidate exactly equals the non-empty secret.
export function unlockOk(input, secret) {
  return !!input && !!secret && String(input) === String(secret);
}
```
- [ ] **Step 4: 實作 `functions/api/unlock.js`**
```js
// Server-verified device unlock: compare the posted key against EDIT_SECRET
// (an encrypted Pages secret; never in client code). On match the client sets a
// localStorage flag. This is called ONCE per device, not per page view.
import { unlockOk } from "../_lib/unlock.js";

export async function onRequestPost({ request, env }) {
  let body;
  try { body = await request.json(); } catch (e) { body = {}; }
  const ok = unlockOk(body && body.k, env.EDIT_SECRET || "");
  return new Response(JSON.stringify({ ok }), {
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
}
```
- [ ] **Step 5: 跑測試確認 PASS** — `npx vitest run unlock-ok`
- [ ] **Step 6: Commit** — `git add functions/_lib/unlock.js functions/api/unlock.js tests/unlock-ok.test.js` → `git commit -m "feat: /api/unlock server-verified device unlock"`

---

## Task 2: 重寫 creator-entry(解鎖 + Edit 鈕 + 載編輯器)

**Files:** Modify `src/render/fx/creator-entry.js`; Modify `tests/creator-entry-inject.test.js`

**Interfaces:** Consumes `/api/unlock`(Task 1)、`/editor.js`(Task 5)。Produces `creatorEntryJS`(字串):(a) 若 `?unlock=<v>` → POST `/api/unlock` → ok 設 `localStorage["can-edit"]="1"` 並清掉網址參數;(b) 若旗標存在 → 角落顯示「✎ Edit」→ 點擊注入 `/editor.js`。

- [ ] **Step 1: 改測試 `tests/creator-entry-inject.test.js`**
```js
import { describe, it, expect } from "vitest";
import { creatorEntryJS } from "../src/render/fx/creator-entry.js";

describe("creatorEntryJS", () => {
  it("does the unlock POST and reads the can-edit flag", () => {
    expect(creatorEntryJS).toContain("/api/unlock");
    expect(creatorEntryJS).toContain("can-edit");
  });
  it("loads /editor.js on the Edit button, not a page nav", () => {
    expect(creatorEntryJS).toContain("/editor.js");
    expect(creatorEntryJS).not.toContain('href = "/edit"');
  });
  it("is a self-invoking string with no import/export", () => {
    expect(creatorEntryJS).toContain("(function");
    expect(creatorEntryJS).not.toContain("import ");
  });
});
```
- [ ] **Step 2: 跑測試確認 FAIL** — `npx vitest run creator-entry-inject`
- [ ] **Step 3: 重寫 `src/render/fx/creator-entry.js`**
```js
// Owner-only edit entry, device-unlock model (no whoami, no per-visit request).
// (1) If the URL carries ?unlock=<secret>, verify it once via /api/unlock and, on
//     success, remember this device in localStorage (then scrub the param).
// (2) If this device is unlocked, show a small "Edit" button that loads the editor
//     in place (/editor.js) — no page navigation. Visibility is not a security
//     boundary; publishing is IP-gated server-side.
export const creatorEntryJS = `
(function () {
  var KEY = "can-edit";
  function showButton() {
    if (document.getElementById("cst-edit-btn")) return;
    var b = document.createElement("button");
    b.id = "cst-edit-btn";
    b.type = "button";
    b.textContent = "\\u270e Edit";
    b.style.cssText = "position:fixed;left:14px;bottom:14px;z-index:99990;" +
      "background:#17151a;color:#fffdfa;border:0;cursor:pointer;" +
      "font:12px ui-monospace,SFMono-Regular,Consolas,monospace;" +
      "padding:7px 12px;border-radius:999px;box-shadow:0 6px 20px rgba(20,20,30,.28)";
    b.addEventListener("click", function () {
      b.disabled = true; b.textContent = "\\u2026";
      var s = document.createElement("script");
      s.src = "/editor.js";
      document.body.appendChild(s);
    });
    document.body.appendChild(b);
  }
  try {
    var p = new URLSearchParams(location.search);
    var k = p.get("unlock");
    if (k) {
      fetch("/api/unlock", { method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ k: k }) })
        .then(function (r) { return r.json(); })
        .then(function (d) {
          if (d && d.ok) { try { localStorage.setItem(KEY, "1"); } catch (e) {} }
          p.delete("unlock");
          var q = p.toString();
          history.replaceState(null, "", location.pathname + (q ? "?" + q : "") + location.hash);
          if (d && d.ok) showButton();
        }).catch(function () {});
    }
    if (localStorage.getItem(KEY) === "1") showButton();
  } catch (e) {}
})();
`;
```
- [ ] **Step 4: 跑測試確認 PASS** — `npx vitest run creator-entry-inject`
- [ ] **Step 5: Commit** — `git add src/render/fx/creator-entry.js tests/creator-entry-inject.test.js` → `git commit -m "feat: device-unlock edit entry (server-verified, no whoami)"`

---

## Task 3: 退役 whoami;rate.js 改讀旗標

**Files:** Delete `functions/api/whoami.js`; Modify `src/render/fx/rate.js`; Create `tests/rate-flag-inject.test.js`

**Interfaces:** rate.js 的 creator 判斷從 `fetch("/api/whoami")` 改成讀 `localStorage["can-edit"]==="1"`:是 creator 就移除評分條、否則 `initRatings()`。

- [ ] **Step 1: 失敗測試 `tests/rate-flag-inject.test.js`**
```js
import { describe, it, expect } from "vitest";
import { rateJS } from "../src/render/fx/rate.js";

describe("rateJS creator gate", () => {
  it("uses the local can-edit flag, not whoami", () => {
    expect(rateJS).toContain("can-edit");
    expect(rateJS).not.toContain("/api/whoami");
  });
  it("still defines initRatings for normal visitors", () => {
    expect(rateJS).toContain("function initRatings");
  });
});
```
- [ ] **Step 2: 跑測試確認 FAIL** — `npx vitest run rate-flag-inject`
- [ ] **Step 3: 改 `rate.js` 的 gate**。把現有結尾的 whoami 區塊(`fetch("/api/whoami")...catch(initRatings)`)換成:
```js
  }
  // The owner doesn't rate their own work: unlocked devices drop the strips.
  // No server call — reads the same can-edit flag the editor uses.
  try {
    if (localStorage.getItem("can-edit") === "1") {
      [].slice.call(document.querySelectorAll(".rate")).forEach(function (el) { el.remove(); });
    } else { initRatings(); }
  } catch (e) { initRatings(); }
})();
`;
```
- [ ] **Step 4: 刪 whoami** — `git rm functions/api/whoami.js`
- [ ] **Step 5: 跑測試 + build** — `npx vitest run rate-flag-inject` PASS;`npm run build` 綠
- [ ] **Step 6: Commit** — `git add src/render/fx/rate.js tests/rate-flag-inject.test.js functions/api/whoami.js` → `git commit -m "feat: rate.js reads can-edit flag; retire whoami"`

---

## Task 4: 主題標記 theme + featherweight 頁尾連結

**Files:** Modify `src/render/themes/featherweight.js`, `src/render/themes/minimal.js`

**Interfaces:** 兩個 theme 的 `<html>` 加 `data-theme="featherweight"|"minimal"`,供編輯器就地判斷當前版本。featherweight 頁尾/自介連結改指 `/interactive`。

- [ ] **Step 1: featherweight `<html>` 標記**。`featherweight.js` 的 `<html lang="en">` → `<html lang="en" data-theme="featherweight">`
- [ ] **Step 2: minimal `<html>` 標記**。`minimal.js` 的 `<html lang="en">` → `<html lang="en" data-theme="minimal">`
- [ ] **Step 3: featherweight 頁尾連結**。把 `<a href="/site?theme=minimal&amp;v=full">Full interactive version &rarr;</a>` → `<a href="/interactive">Full interactive version &rarr;</a>`
- [ ] **Step 4: build 綠** — `npm run build`
- [ ] **Step 5: Commit** — `git add src/render/themes/featherweight.js src/render/themes/minimal.js` → `git commit -m "chore: data-theme marker + /interactive footer link"`

---

## Task 5: 編輯器就地掛載 + 右側控制欄 + 打包 /editor.js;退役 /edit

**Files:** Modify `src/studio/freeform.js`, `tools/postbuild.mjs`, `vite.config.js`; Delete `edit.html`

**Interfaces:** Consumes `data-theme`(Task 4)。Produces `dist/editor.js`(esbuild IIFE,注入即 `mountEditor()`);`mountEditor` 讀 `document.documentElement.dataset.theme` 決定編輯哪個 theme。控制項改成右側直欄。

- [ ] **Step 1: `freeform.js` 讀當前 theme**。把 `const state = { content: null, theme: "featherweight" };` 改成 `const state = { content: null, theme: (document.documentElement.getAttribute("data-theme") || "featherweight") };`
- [ ] **Step 2: `boot()` 更名 `mountEditor()`**,檔尾 `boot();` → `mountEditor();`。`boot` 內文不變(它已 fetch content → edit render → 掛 chrome)。
- [ ] **Step 3: 控制欄改右側直欄**。在 `injectStyle()` 的 `#ffbar` 規則,把定位改成右側直欄:
  把 `#ffbar { position: fixed; top: 12px; right: 12px; ... flex-wrap: wrap; ... }` 內的排列改為垂直:新增 `flex-direction: column; align-items: stretch; top: 12px; right: 12px; bottom: auto; max-width: 200px;`(其餘樣式保留)。`#ffbar button, #ffbar select { width: 100%; }`。這讓現有 toolbar 元素改成右側直欄,不用重寫 `buildToolbar`。
- [ ] **Step 4: 加「Exit」鈕**。在 `buildToolbar` 的 status 之前加一顆:
```js
  mkBtn("Exit", "Leave editing (reload as a visitor)", function () {
    location.reload();
  });
```
- [ ] **Step 5: `vite.config.js` 移除 edit 入口**。`input` 物件刪掉 `edit: "edit.html"` 那行(保留 main/site/studio,並在 Task 6 加 interactive)。
- [ ] **Step 6: 刪 edit.html** — `git rm edit.html`
- [ ] **Step 7: postbuild 打包 `/editor.js`**。在 `tools/postbuild.mjs` 檔尾加(用 vite 已帶的 esbuild):
```js
import { build as esbuild } from "esbuild";
await esbuild({
  entryPoints: [join(root, "src/studio/freeform.js")],
  bundle: true,
  minify: true,
  format: "iife",
  outfile: join(dist, "editor.js"),
});
console.log("postbuild: dist/editor.js written");
```
  (`root`/`dist`/`join` 沿用檔案上方既有變數;若無 `root`,用 `process.cwd()`。)
- [ ] **Step 8: build 綠 + 驗產物** — `npm run build`;`ls dist/editor.js`;`grep -c mountEditor dist/editor.js`(>0)
- [ ] **Step 9: Commit** — `git add src/studio/freeform.js tools/postbuild.mjs vite.config.js edit.html` → `git commit -m "feat: editor mounts in place from /editor.js; retire /edit page"`

---

## Task 6: 導覽 — /interactive 乾淨路徑 + 移除浮動切換鈕

**Files:** Create `interactive.html`; Modify `vite.config.js`, `src/site/site.js`, `data/content.json`, `src/render/themes/minimal.js`

**Interfaces:** `/interactive` = 固定 render minimal 的 client 頁;移除 `site.js` 右下浮動切換鈕;自介卡連結改乾淨路徑;minimal 的連線導流把 `/interactive` 視為「full」不跳 `/fast/`。

- [ ] **Step 1: 建 `interactive.html`**(比照 site.html,載一個固定 minimal 的入口):
```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Stan Shih — Interactive</title>
  </head>
  <body>
    <script type="module">
      localStorage.setItem("site-ver", "full");
      import("/src/site/site.js");
    </script>
  </body>
</html>
```
  註:`site-ver=full` 讓 minimal 的連線導流不把 `/interactive` 訪客踢去 `/fast/`。site.js 需支援固定 theme(見 Step 3)。
- [ ] **Step 2: vite 加 interactive 入口**。`vite.config.js` 的 `input` 加 `interactive: "interactive.html"`。
- [ ] **Step 3: `site.js` 支援固定 minimal + 移除切換鈕**。改 `site.js`:
  - theme 決定改成:`const theme = location.pathname.startsWith("/interactive") ? "minimal" : (params.get("theme") || localStorage.getItem(KEY) || "featherweight");`
  - **刪除**建立浮動切換鈕的整段(從 `const bar = document.createElement("div");` 到 `document.body.appendChild(bar);`)。
- [ ] **Step 4: content.json 自介卡連結**。`site-featherweight` 卡的 `links` href `/fast/` 保留;`site-minimal` 卡的 `links` href `/site?theme=minimal&v=full` → `/interactive`。
- [ ] **Step 5: build 綠** — `npm run build`(確認 `dist/interactive.html` 產出)
- [ ] **Step 6: Commit** — `git add interactive.html vite.config.js src/site/site.js data/content.json` → `git commit -m "feat: /interactive clean route; remove floating theme switcher"`

---

## Task 7: 邊緣快取 `_headers`

**Files:** Create `public/_headers`

**Interfaces:** Cloudflare Pages 讀 `_headers` 給 HTML 設 Cache-Control,邊緣快取、所有訪客受益;部署自動清快取。

- [ ] **Step 1: 建 `public/_headers`**
```
/
  Cache-Control: public, max-age=0, s-maxage=86400, must-revalidate
/interactive
  Cache-Control: public, max-age=0, s-maxage=86400, must-revalidate
/fast/
  Cache-Control: public, max-age=0, s-maxage=86400, must-revalidate
/editor.js
  Cache-Control: public, max-age=300
```
  註:`s-maxage` 讓 Cloudflare 邊緣快取一天、瀏覽器每次仍 revalidate(`max-age=0`);部署會自動 purge,故不會服務到舊 HTML。
- [ ] **Step 2: build 綠 + 確認複製** — `npm run build`;`ls dist/_headers`(Cloudflare 從 dist 根讀)
- [ ] **Step 3: Commit** — `git add public/_headers` → `git commit -m "perf: edge-cache HTML via _headers"`

---

## 完工驗證

- [ ] **Step 1: 全測試 + build 綠** — `npx vitest run`;`npm run build`
- [ ] **Step 2: preview 實跑**(DOM/整合只有這關能證):`npm run build && npm run preview` → 開印出的網址:
  - `/` featherweight 前門正常、`data-theme="featherweight"`、無 Edit 鈕(未解鎖)。
  - `/?unlock=<你設的 EDIT_SECRET>` → 應 POST /api/unlock(preview 有 functions 嗎?**preview 無 functions**,故解鎖端點要靠部署驗;本機先用手動 `localStorage.setItem("can-edit","1")` 模擬)→ 出現「✎ Edit」→ 點擊 → `/editor.js` 載入 → 頁面就地變可編 + 右側控制欄 → 改字 → 切版本 → Exit 還原。
  - `/interactive` → 直接是 minimal 互動版、無浮動切換鈕。
- [ ] **Step 3: 部署後驗**(functions 只在 Cloudflare 跑):`/?unlock=<secret>` 真解鎖、`/api/unlock` 錯密碼回 `{ok:false}`、Publish 從家用 IP 成功。

---

## Self-Review

**Spec coverage:**
- 決策1 解鎖伺服器驗證 → Task 1(端點)+ 2(client 流程)✓
- 決策2 就地編輯器+側欄+退 /edit → Task 4(theme 標記)+ 5 ✓
- 決策3 發佈 IP 不動 → 無 task(保留現狀)✓
- 決策4 退 whoami + rate.js 改旗標 → Task 3 ✓
- 決策5 導覽 → Task 4(頁尾連結)+ 6 ✓
- 決策6 邊緣快取 → Task 7 ✓

**Placeholder scan:** 純函式(unlockOk)給完整 test+impl;字串模組給完整重寫;DOM/build 給確切 old→new 與檔路徑。無 TBD。

**Type consistency:** 旗標鍵全用 `"can-edit"`(creator-entry 設、rate.js 讀、editor 隱含);`unlockOk(input, secret)` 1 定義 / unlock.js 消費一致;`/editor.js` Task 5 產、Task 2 注入一致;`data-theme` Task 4 產、freeform.js Task 5 讀一致。

**已知後續(不阻塞):** preview 無 functions,解鎖端點靠部署驗(本機用手動 localStorage 模擬按鈕流程);頁面內輸入框式解鎖、studio.html 退役、跨裝置草稿同步皆非本次。

**Stan 手動待辦:** Cloudflare Pages 設 `EDIT_SECRET`(夠長隨機字串)。
