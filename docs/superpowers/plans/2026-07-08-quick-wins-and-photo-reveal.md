# Quick wins + 照片碎形顯影 實作計畫 (Plan 1 of 3)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 砍掉 Showroom;讓 Featherweight 顯示這次的實測載入毫秒數;把照片獎勵改成公開圖的碎形分塊隨機顯影,退役 KV+token 那套。

**Architecture:** 三個獨立里程碑。M0 純刪除。M1 在 featherweight theme 尾端加一段 inline script 讀 Performance API。M2 把 `cta.js` 的全域 blur 顯影換成 canvas 分塊(Voronoi)隨機顯影,照片變公開資產,quest 進度仍驅動顯影但不再需要 server token。

**Tech Stack:** vanilla JS、Vite、Vitest、Cloudflare Pages Functions、canvas 2D。

## Global Constraints

- 只碰 System A(`content.json` → `renderSite.js` → `themes/*`),不動 System B(`index.html`/`main.js`/`data/projects`)。
- 版本紀律:每個里程碑一個 commit(CLAUDE.md granular versioning);commit 一律 `git add <指定路徑>`,不用 `git add -A`。
- 測試:純函式走 Vitest(`npm test`);視覺走 preview 實跑驗證。
- 溝通繁體中文,程式識別碼/檔名/API 英文。
- 誠實文案:一旦 Featherweight 加了 script,footer 與 content.json 裡「zero JS」「no scripts at all」必須同步改成誠實說法。

---

## M0 — 砍 Showroom

### Task 0.1: 移除 showroom theme

**Files:**
- Delete: `src/render/themes/showroom.js`
- Modify: `src/render/renderSite.js`(import 行、`THEMES`、`THEMES_META`)
- Test: 現有 `npm test` 全綠

**Interfaces:**
- Produces: `THEMES` 與 `THEMES_META` 只剩 `featherweight`、`minimal` 兩筆。

- [ ] Step 1: grep 全專案確認 showroom 引用點
  Run: 搜尋 `showroom`(排除 node_modules)。預期只出現在 `showroom.js`、`renderSite.js`。若 `DESIGN.md`/`HANDOFF.md`/`demo-concepts/` 有提及,記下但那是文件、非程式相依。
- [ ] Step 2: 刪 `src/render/themes/showroom.js`
- [ ] Step 3: `renderSite.js` 移除 showroom 的 `import`、從 `THEMES` 物件移除 `showroom` 鍵、從 `THEMES_META` 陣列移除 `{ key:"showroom", ... }` 那筆。
- [ ] Step 4: 跑 `npm test`,預期全綠(沒有測試依賴 showroom)。
- [ ] Step 5: preview 開 `site.html`,切換主題只剩兩個選項、`?theme=showroom` fallback 回 featherweight 不報錯。
- [ ] Step 6: Commit
  `git add src/render/themes/showroom.js src/render/renderSite.js`
  `git commit -m "refactor: remove showroom theme"`

---

## M1 — Featherweight 實測載入速度

### Task 1.1: `formatSpeed` 純函式 + 測試

**Files:**
- Modify: `src/render/util.js`(新增 export `formatSpeed`)
- Test: `tests/util-format-speed.test.js`(新建)

**Interfaces:**
- Produces: `formatSpeed(ms: number) => string`,回傳如 `"~42 ms"`;`ms < 1` 或非有限數 → `"~0 ms"`;四捨五入整數。

- [ ] Step 1: 寫失敗測試 `tests/util-format-speed.test.js`
```js
import { describe, it, expect } from "vitest";
import { formatSpeed } from "../src/render/util.js";

describe("formatSpeed", () => {
  it("rounds to whole ms", () => {
    expect(formatSpeed(41.7)).toBe("~42 ms");
  });
  it("floors tiny values to 0", () => {
    expect(formatSpeed(0.3)).toBe("~0 ms");
  });
  it("handles non-finite input", () => {
    expect(formatSpeed(NaN)).toBe("~0 ms");
    expect(formatSpeed(Infinity)).toBe("~0 ms");
  });
});
```
- [ ] Step 2: 跑測試確認失敗
  Run: `npm test -- util-format-speed`。預期 FAIL(`formatSpeed` 未定義)。
- [ ] Step 3: 在 `src/render/util.js` 加實作
```js
export function formatSpeed(ms) {
  const n = Number.isFinite(ms) && ms > 0 ? Math.round(ms) : 0;
  return "~" + n + " ms";
}
```
- [ ] Step 4: 跑測試確認通過
  Run: `npm test -- util-format-speed`。預期 PASS。
- [ ] Step 5: Commit
  `git add src/render/util.js tests/util-format-speed.test.js`
  `git commit -m "feat: add formatSpeed helper"`

### Task 1.2: featherweight 顯示實測速度 + 誠實文案

**Files:**
- Modify: `src/render/themes/featherweight.js`(footer + body 尾端 inline script)
- Modify: `data/content.json`(`site-featherweight` 卡片文案)
- Test: preview 實跑

**Interfaces:**
- Consumes: `formatSpeed`(Task 1.1)。inline script 是純字串、在瀏覽器跑,無法 import util;因此 script 內自帶等效格式化(與 `formatSpeed` 同語意),`formatSpeed` 供未來測試/共用。

- [ ] Step 1: footer 加測速 span。把 `featherweight.js:440` 那句
  `Featherweight · system fonts · zero JS · nothing blocks first paint`
  改成
  `Featherweight · system fonts · <span id="fw-speed">nothing blocks first paint</span>`
- [ ] Step 2: body 末尾(`</body>` 前)加 inline script
```js
<script>
(function(){
  function done(){
    var nav = performance.getEntriesByType && performance.getEntriesByType("navigation")[0];
    var ms = nav && nav.domContentLoadedEventEnd ? nav.domContentLoadedEventEnd : performance.now();
    var n = isFinite(ms) && ms > 0 ? Math.round(ms) : 0;
    var el = document.getElementById("fw-speed");
    if (el) el.textContent = "became usable in ~" + n + " ms · one tiny timer";
  }
  if (document.readyState === "complete") done();
  else addEventListener("load", done);
})();
</script>
```
- [ ] Step 3: 改 content.json 誠實文案。`site-featherweight` 卡片:`tags` 的 `"Zero JS"` → `"~1 line JS"`;`detail` 的 `"no hedgehog, no quest, no scripts at all"` → `"no hedgehog, no quest, just one line that times itself"`。
- [ ] Step 4: `npm run build`,確認 build 成功、`dist/fast/index.html` 含 `fw-speed`。
- [ ] Step 5: preview 開 featherweight,確認 footer 出現「became usable in ~NN ms」數字。
- [ ] Step 6: Commit
  `git add src/render/themes/featherweight.js data/content.json`
  `git commit -m "feat: featherweight shows measured load time"`

### Task 1.3: featherweight 靜態直出當對外首頁 (Stan 2026-07-08 追加)

**Files:**
- Modify: `tools/postbuild.mjs`(多寫一份 `dist/index.html` = 靜態 featherweight)

**理由:** 要「阿部寬式真快 + 測速誠實」,featherweight 對外必須靜態直出。client-render 的 site.html 量到的是空殼就緒時間、偏樂觀;靜態直出的 DOMContentLoaded 才是「完整內容就緒」的誠實時間。舊 System B SPA 首頁就此退場(原始碼暫留),minimal 互動版仍走 `/site?theme=minimal`。

- [x] Step 1: postbuild 把 `renderSite(content, "featherweight")` 同時寫成 `dist/index.html` 與 `dist/fast/index.html`。
- [x] Step 2: `npm run build` 確認 `dist/index.html` 含測速 script(fw-speed ×2)、烘了實際內容(「Selected work · 9 shipped」)、23 KB。
- [ ] Step 3: Commit `git add tools/postbuild.mjs` → `git commit -m "feat: featherweight is the static front door"`

---

## M2 — 照片碎形分塊隨機顯影

### Task 2.1: 照片資產就位

**Files:**
- Create: `public/assets/reward-photo.jpg`(從來源複製)

- [ ] Step 1: 複製 `C:\Users\stans\OneDrive - gapps.ntnu.edu.tw\桌面\重要檔案 Important\S__15400987.jpg` 到 `public/assets/reward-photo.jpg`。
- [ ] Step 2: 確認檔案存在、大小合理(> 0)。
- [ ] Step 3: Commit
  `git add public/assets/reward-photo.jpg`
  `git commit -m "chore: add reward photo asset"`

### Task 2.2: Voronoi cellIndex 純函式 + 測試

**Files:**
- Create: `src/render/fx/shatter.js`(顯影演算法,無 DOM 相依)
- Test: `tests/shatter-cells.test.js`(新建)

**Interfaces:**
- Produces:
  - `voronoiCells(w, h, seeds) => Uint8Array`(長度 w*h,每格值 0..seeds.length-1,為最近種子 index)
  - `randomSeeds(w, h, n, rnd=Math.random) => Array<{x,y}>`

- [ ] Step 1: 寫失敗測試 `tests/shatter-cells.test.js`
```js
import { describe, it, expect } from "vitest";
import { voronoiCells, randomSeeds } from "../src/render/fx/shatter.js";

describe("voronoiCells", () => {
  it("assigns every pixel to the nearest of N seeds", () => {
    const seeds = [{ x: 0, y: 0 }, { x: 9, y: 9 }];
    const cells = voronoiCells(10, 10, seeds);
    expect(cells.length).toBe(100);
    expect(cells[0]).toBe(0);
    expect(cells[99]).toBe(1);
  });
  it("uses every seed at least once for spread seeds", () => {
    const seeds = randomSeeds(40, 40, 10, mulberry(1));
    const cells = voronoiCells(40, 40, seeds);
    const used = new Set(cells);
    expect(used.size).toBe(10);
  });
});
function mulberry(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
```
- [ ] Step 2: 跑測試確認失敗
  Run: `npm test -- shatter-cells`。預期 FAIL(未定義)。
- [ ] Step 3: 實作 `src/render/fx/shatter.js`
```js
export function randomSeeds(w, h, n, rnd = Math.random) {
  const s = [];
  for (let i = 0; i < n; i++) s.push({ x: rnd() * w, y: rnd() * h });
  return s;
}
export function voronoiCells(w, h, seeds) {
  const cells = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let bd = Infinity, bi = 0;
      for (let j = 0; j < seeds.length; j++) {
        const dx = x - seeds[j].x, dy = y - seeds[j].y, d = dx * dx + dy * dy;
        if (d < bd) { bd = d; bi = j; }
      }
      cells[y * w + x] = bi;
    }
  }
  return cells;
}
```
- [ ] Step 4: 跑測試確認通過
  Run: `npm test -- shatter-cells`。預期 PASS。(第二個測試若偶發 <10,調整 seed 或放寬;spread seeds 幾乎必用滿。)
- [ ] Step 5: Commit
  `git add src/render/fx/shatter.js tests/shatter-cells.test.js`
  `git commit -m "feat: voronoi cell assignment for photo shatter"`

### Task 2.3: 每塊顯影排程純函式 + 測試

**Files:**
- Modify: `src/render/fx/shatter.js`(加 `revealSchedule`)
- Test: `tests/shatter-schedule.test.js`(新建)

**Interfaces:**
- Produces: `revealSchedule(cellCount, steps, rnd=Math.random) => number[][]`
  - 回傳 `cellCount` 條、每條長度 `steps` 的累積清晰度陣列,遞增、每條最後一格 === 1。
  - 每塊節奏隨機獨立(不同塊不同曲線)。

- [ ] Step 1: 寫失敗測試 `tests/shatter-schedule.test.js`
```js
import { describe, it, expect } from "vitest";
import { revealSchedule } from "../src/render/fx/shatter.js";

describe("revealSchedule", () => {
  it("each cell reaches exactly 1 at the last step", () => {
    const sched = revealSchedule(10, 9, mulberry(2));
    expect(sched.length).toBe(10);
    for (const row of sched) {
      expect(row.length).toBe(9);
      expect(row[8]).toBeCloseTo(1, 6);
    }
  });
  it("is monotonically non-decreasing per cell", () => {
    const sched = revealSchedule(10, 9, mulberry(3));
    for (const row of sched) {
      for (let i = 1; i < row.length; i++) expect(row[i]).toBeGreaterThanOrEqual(row[i - 1]);
    }
  });
});
function mulberry(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
```
- [ ] Step 2: 跑測試確認失敗
  Run: `npm test -- shatter-schedule`。預期 FAIL。
- [ ] Step 3: 實作 `revealSchedule`
```js
export function revealSchedule(cellCount, steps, rnd = Math.random) {
  const out = [];
  for (let c = 0; c < cellCount; c++) {
    const inc = [];
    let sum = 0;
    for (let s = 0; s < steps; s++) { const v = 0.15 + rnd(); inc.push(v); sum += v; }
    let cum = 0;
    const row = [];
    for (let s = 0; s < steps; s++) { cum += inc[s] / sum; row.push(cum); }
    row[steps - 1] = 1;
    out.push(row);
  }
  return out;
}
```
- [ ] Step 4: 跑測試確認通過
  Run: `npm test -- shatter-schedule`。預期 PASS。
- [ ] Step 5: Commit
  `git add src/render/fx/shatter.js tests/shatter-schedule.test.js`
  `git commit -m "feat: per-cell random reveal schedule"`

### Task 2.4: canvas 分塊顯影渲染器

**Files:**
- Modify: `src/render/fx/shatter.js`(加 `createShatterReveal` DOM/canvas 整合)
- Test: preview 實跑(canvas 視覺,單元測試不覆蓋繪圖)

**Interfaces:**
- Produces: `createShatterReveal(canvas, imgSrc, { steps, reduce }) => { setStep(n), recut() }`
  - 載入 `imgSrc`,以 300px 寬低解析度算 cellIndex + schedule,`setStep(n)` 緩動 10 塊到第 n 步清晰度,`recut()` 重切。
  - 底層大 blur、頂層 mask `destination-in` 疊清晰圖(演算法同已驗證的 demo)。
  - `reduce=true` 時不緩動、直接跳。

- [ ] Step 1: 實作 `createShatterReveal`(移植 demo 的 canvas 遮罩管線:offscreen photo → tmp/mask canvas → per-pixel alpha → destination-in → 底 blur + 疊清晰)。N=10 塊,mask 在 300px 寬算,顯示用 CSS 放大。
- [ ] Step 2: 在 `public/` 放一個臨時測試頁 `shatter-test.html` 掛 canvas + 三顆按鈕(step+/recut/reset),src 指 `/assets/reward-photo.jpg`。
- [~] Step 3: 本環境 preview server 是 static-dist(跑不了 import src 的測試頁)、Playwright 被佔用 → canvas 視覺驗證延到 Task 2.5(接進 minimal 後 build + 8766 開 `/site?theme=minimal`,minimal bundle 含 shatter)。演算法已在 photo_shatter_reveal_demo widget 驗證 + 純函式單元測試綠。
- [x] Step 4: 刪臨時測試頁 `public/shatter-test.html`。
- [ ] Step 5: Commit
  `git add src/render/fx/shatter.js`
  `git commit -m "feat: canvas shatter reveal renderer"`

### Task 2.5: 接到 quest 進度、取代 cta.js 全域 blur

**Files:**
- Modify: `src/render/fx/cta.js`(顯影方式:全域 blur → shatter reveal)
- Test: preview 實跑 Minimal

**Interfaces:**
- Consumes: `createShatterReveal`(Task 2.4)、`window.QUEST`(pct/watched)。
- Produces: polaroid 內照片為碎形顯影;quest 每完成一步 → `setStep`;100% → 全清晰。

- [ ] Step 1: `cta.js` 的 `#photo-img` 換成 canvas;`paint()` 不再設 `--dev-blur`,改呼叫 `shatter.setStep(已完成步數)`。步數 = `q.watched.length`(對應每逛完一個項目一步),`steps` 上限 = quest TOTAL。
- [ ] Step 2: 逃跑 glide/dodge 互動保留不動(只換顯影方式)。
- [ ] Step 3: 100%(`unlocked()`)時 shatter 到最後一步 = 全清晰;移除 catch 後 `develop()` 的 token fetch(見 Task 2.6)。
- [ ] Step 4: preview 開 Minimal,逛項目確認 polaroid 內照片碎形逐步顯影、100% 全清晰。截圖存證。
- [ ] Step 5: Commit
  `git add src/render/fx/cta.js src/render/fx/shatter.js`
  `git commit -m "feat: photo develops via shatter reveal driven by quest"`

### Task 2.6: 退役 KV + token 那條線

**Files:**
- Delete: `functions/api/reward.js`
- Modify: `functions/api/quest.js`(移除 `claim` 分支與 token 簽發)
- Modify: `src/render/fx/quest.js`(移除 `claim()`)
- Delete or Modify: `functions/_lib/hmac.js`(若無其他使用者則刪)
- Test: `npm test` 全綠 + preview

**Interfaces:**
- Produces: 照片顯影不再經 server token;quest 仍記錄探索進度(不受影響)。

- [ ] Step 1: grep 確認 `hmac.js`、`/api/reward`、`QUEST.claim` 的所有使用點。
- [ ] Step 2: 移除 `functions/api/quest.js` 的 `if (b.e === "claim")` 整段與 `import { sign, secretOf }`;`start`/`item` 事件記錄保留。
- [ ] Step 3: 移除 `src/render/fx/quest.js` 的 `claim` 方法;`cta.js` 不再呼叫它(Task 2.5 已改)。
- [ ] Step 4: 刪 `functions/api/reward.js`;若 `hmac.js` 無其他 import 則刪。
- [ ] Step 5: 跑 `npm test`(移除對應/失效測試),preview 開 Minimal 確認探索→顯影全程無 console error。
- [ ] Step 6: Commit
  `git add functions/ src/render/fx/quest.js src/render/fx/cta.js`
  `git commit -m "refactor: retire KV+token reward gate (photo is now public easter egg)"`

---

## Self-Review

**Spec coverage(對 M0/M1/M2):**
- M0 砍 showroom → Task 0.1 ✓
- M1 測速 + 誠實文案 → Task 1.1/1.2 ✓
- M2 照片彩蛋化 → Task 2.1;碎形顯影 → 2.2/2.3/2.4/2.5;退役 token/KV → 2.6 ✓

**Placeholder scan:** 純函式(formatSpeed/voronoiCells/revealSchedule)給了完整 test+impl code。canvas 渲染(2.4)與 cta 整合(2.5)是視覺整合、以 preview 驗證,不預寫每行(canvas 管線已在 demo 驗證可行,移植即可)。無 TBD。

**Type consistency:** `voronoiCells`/`randomSeeds`/`revealSchedule`/`createShatterReveal`/`formatSpeed` 名稱前後一致;`createShatterReveal` 回傳 `{setStep, recut}` 在 2.4 定義、2.5 消費一致。

**已知後續(不阻塞本 plan):** cta.js 移除 token fetch 後,「catch the photo」的文案語意要微調(不再是「換取真圖」而是「解鎖最後一塊」);留在 Task 2.5 實作時順手改。
