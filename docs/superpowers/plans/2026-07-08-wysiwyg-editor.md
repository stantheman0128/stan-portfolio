# M4 所見即所編編輯器 Implementation Plan (Plan 3 of 4)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 讓 `edit.html`(freeform.js)變成「整頁就是編輯器」:直接在渲染出來的頁面上改字、換圖、增刪項目,改動寫回 `content.json`,兩個 theme 共用它、改一次兩版同步,並能匯出 `content.json`(線上一鍵發佈留給 M5)。

**Architecture:** 分兩相。Phase A(綁定層)在 `util.js` 加 path get/set + `bindAttr` 純函式,`renderSite(content, theme, {edit})` 多帶 edit 旗標,兩個 theme 在 edit 模式為每個內容欄位輸出 `data-bind="路徑"`(必要時加 `data-edit="kind"` 標記特殊欄位),並在 edit 模式關掉互動 fx 腳本以免干擾編輯。Phase B(編輯層)改造 `freeform.js`:boot 讀 `content.json` → `renderSite(content, theme, {edit:true})` → 換頁;對 `[data-bind]` 元素開 contentEditable、input 時用 `setPath` 寫回記憶體裡的 content 物件;特殊欄位(markdown 詳述、tags、圖片)走各自的小編輯器;toolbar 可切 theme(重 render 同一份 content = 兩版同步的直接體現)、undo、preview、匯出 content.json、發佈(M5 佔位)。

**Tech Stack:** vanilla JS(ES modules)、Vitest、既有 `renderSite` 管線。

## Global Constraints

- 只碰 System A(`content.json` → `renderSite.js` → `themes/*` + `src/studio/freeform.js` + `src/render/util.js`)。不動 System B(`index.html`/`src/main.js`/`data/projects/*`)。
- 版本紀律:每個 task 一個 commit;`git add <指定路徑>`,不用 `git add -A`。分支 `feat/sprite-quest`。
- 純函式走 Vitest(`npx vitest run`);DOM 互動靠 build 綠 + bundle grep + 完工前 preview 實跑 `edit.html`。
- 溝通繁體中文,程式識別碼/檔名/API/UI 文案英文。
- edit 旗標**預設關**:`renderSite(content, theme)` 與 `renderSite(content, theme, {})` 行為與現在完全一致(不得出現任何 `data-bind`)。正式站(`site.js`、postbuild)不傳 edit,零影響。
- **安全紅線**:編輯只改瀏覽器記憶體 + localStorage 草稿,不觸網。真正的發佈邊界是 M5 的 GitHub OAuth。本計畫不引入任何密鑰、不打任何外部 API(除 M3 既有的 `/api/whoami`,只讀布林)。
- **架構決策(Stan 2026-07-08 拍板)**:評估「接資料庫即時生效」vs「維持靜態 + 一鍵發佈」後,**選維持靜態**——理由是 featherweight 的超快靜態是核心賣點,個人作品集很少改,為省偶爾 1 分鐘部署去拖慢每個訪客不划算。**含意**:M5 的一鍵發佈(commit content.json → 自動部署)是**主要儲存路徑**,Task 4.9 的 Export 降級成離線 fallback;Creator IP 在正式站要**自動取得編輯入口**(Task 4.10 從「一個連結」升級成「你的 IP 一來就能進編輯」,確切 UX=顯眼常駐 Edit 鈕 vs 自動進編輯,實作 4.10 時跟 Stan 敲定)。
- DRY:`bindAttr` 只寫一次,兩個 theme 都呼叫它,不各自手拼 `data-bind` 字串。編輯層能重用 `studio.js`/舊 `freeform.js` 的既有邏輯就重用(tags split、image FileReader、hover 控制),本計畫會指出確切來源行。
- **保留索引(執行時發現的修正,已套用於 4.3/4.4)**:兩個 theme 都會 `filter` 掉自己那張 `themeExclude` 卡,所以 render 迴圈索引 ≠ `content.items` 真索引(featherweight 濾掉第 8 張,site-minimal 真索引 9 會落在過濾後第 8 位)。data-bind 路徑一律用 `.map((it, ci) => ({ it, ci }))` 保留的真索引 `ci`,不可用過濾後位置。另外 edit 模式把項目面板預設展開(`.item.open`)、關掉展開/hover 與 fx 腳本,否則欄位在收合面板裡點不到。

## File Structure

- `src/render/util.js` — 加 `getPath` / `setPath` / `bindAttr`(純函式,綁定層核心)。
- `src/render/renderSite.js` — `renderSite` 多收 `opts`,透傳給 theme。
- `src/render/themes/minimal.js` — render 收 `opts`,edit 模式對欄位吐 `data-bind`,edit 模式關 fx 腳本。
- `src/render/themes/featherweight.js` — 同上(featherweight 無 fx 互動,只加 `data-bind`)。
- `src/render/fx/creator-entry.js` — **新檔**,匯出 `creatorEntryJS`:自問 `/api/whoami`,creator 時在站上露出一個連到 `/edit` 的浮動入口(自我 gate,注入 minimal)。
- `src/studio/freeform.js` — 大改:content 物件模型 + `data-bind` 綁定 + 匯出 content.json。
- `tests/` — `path-helpers.test.js`、`bind-attr.test.js`、`render-edit-bind.test.js`、`creator-entry-inject.test.js`。

---

# Phase A — 綁定層(可純單元測試)

## Task 4.1: path get/set + bindAttr 純函式

**Files:**
- Modify: `src/render/util.js`
- Test: `tests/path-helpers.test.js`, `tests/bind-attr.test.js`

**Interfaces:**
- Produces:
  - `getPath(obj, path: string) => any` — 依 `"items.3.title"` 這種點路徑取值;中途遇 null/undefined 回 `undefined`。
  - `setPath(obj, path: string, val) => obj` — 就地寫入;中途缺層時,下一段是純數字就補 `[]`、否則補 `{}`;回傳 `obj`。
  - `bindAttr(path: string, edit: boolean, kind?: string) => string` — edit 為真時回 ` data-bind="<esc path>"`(前導空格,方便直接插進標籤),有 `kind` 再附 ` data-edit="<esc kind>"`;edit 為假回 `""`。

- [ ] **Step 1: 寫失敗測試 `tests/path-helpers.test.js`**

```js
import { describe, it, expect } from "vitest";
import { getPath, setPath } from "../src/render/util.js";

describe("getPath", () => {
  const o = { profile: { name: "Stan" }, items: [{ title: "A" }, { title: "B" }] };
  it("reads a nested object path", () => {
    expect(getPath(o, "profile.name")).toBe("Stan");
  });
  it("reads an array index path", () => {
    expect(getPath(o, "items.1.title")).toBe("B");
  });
  it("returns undefined for a missing branch (no throw)", () => {
    expect(getPath(o, "about.paragraphs.0")).toBe(undefined);
  });
});

describe("setPath", () => {
  it("writes a nested object path in place", () => {
    const o = { profile: { name: "old" } };
    setPath(o, "profile.name", "new");
    expect(o.profile.name).toBe("new");
  });
  it("writes an array index path", () => {
    const o = { items: [{ title: "A" }] };
    setPath(o, "items.0.title", "Z");
    expect(o.items[0].title).toBe("Z");
  });
  it("creates missing steps: array when next key is numeric, object otherwise", () => {
    const o = {};
    setPath(o, "items.0.title", "hi");
    expect(Array.isArray(o.items)).toBe(true);
    expect(o.items[0].title).toBe("hi");
  });
  it("returns the root object", () => {
    const o = {};
    expect(setPath(o, "a.b", 1)).toBe(o);
  });
});
```

- [ ] **Step 2: 寫失敗測試 `tests/bind-attr.test.js`**

```js
import { describe, it, expect } from "vitest";
import { bindAttr } from "../src/render/util.js";

describe("bindAttr", () => {
  it("is empty when not editing", () => {
    expect(bindAttr("profile.name", false)).toBe("");
    expect(bindAttr("profile.name", undefined)).toBe("");
  });
  it("emits a leading-space data-bind attribute when editing", () => {
    expect(bindAttr("profile.name", true)).toBe(' data-bind="profile.name"');
  });
  it("adds data-edit when a kind is given", () => {
    expect(bindAttr("items.0.detail", true, "md")).toBe(' data-bind="items.0.detail" data-edit="md"');
  });
});
```

- [ ] **Step 3: 跑測試確認失敗**
  Run: `npx vitest run path-helpers bind-attr`。預期 FAIL(未匯出)。

- [ ] **Step 4: 在 `src/render/util.js` 檔尾加實作**

```js
// Read a value by a dot path like "items.3.title"; missing branch → undefined.
export function getPath(obj, path) {
  return String(path).split(".").reduce((o, k) => (o == null ? undefined : o[k]), obj);
}

// Write `val` into `obj` at a dot path, in place. Missing steps are created:
// an array when the next key is numeric, an object otherwise. Returns obj.
export function setPath(obj, path, val) {
  const keys = String(path).split(".");
  let o = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    const k = keys[i];
    if (o[k] == null || typeof o[k] !== "object") {
      o[k] = /^\d+$/.test(keys[i + 1]) ? [] : {};
    }
    o = o[k];
  }
  o[keys[keys.length - 1]] = val;
  return obj;
}

// Edit-mode only: emit a data-bind (and optional data-edit "kind") attribute for a
// content path. Leading space lets it drop straight into a tag. One source of truth
// so every theme annotates fields identically.
export function bindAttr(path, edit, kind) {
  if (!edit) return "";
  return ` data-bind="${esc(path)}"` + (kind ? ` data-edit="${esc(kind)}"` : "");
}
```

- [ ] **Step 5: 跑測試確認通過**
  Run: `npx vitest run path-helpers bind-attr`。預期 PASS。

- [ ] **Step 6: Commit**
```bash
git add src/render/util.js tests/path-helpers.test.js tests/bind-attr.test.js
git commit -m "feat: path get/set + bindAttr helpers for edit mode"
```

## Task 4.2: `renderSite` 與兩個 theme 收 `opts`

**Files:**
- Modify: `src/render/renderSite.js`
- Modify: `src/render/themes/minimal.js:211`(`export function render(content) {`)
- Modify: `src/render/themes/featherweight.js:6`(`export function render(content) {`)

**Interfaces:**
- Consumes: 無。
- Produces: `renderSite(content, theme, opts = {})` 把 `opts` 透傳給 `fn(content, opts)`。兩個 theme 的 `render(content, opts = {})` 讀 `const edit = !!(opts && opts.edit);`(本 task 先只接參數、宣告 `edit`,尚未使用,下一個 task 才用)。

- [ ] **Step 1: 改 `src/render/renderSite.js` 的 `renderSite`**
  把簽名改成帶 `opts`,並透傳:
```js
export function renderSite(content, theme = "featherweight", opts = {}) {
  const fn = THEMES[theme] || featherweight;
  try {
    return fn(content, opts);
  } catch (err) {
    return `<!doctype html><meta charset="utf-8"><body style="font:14px system-ui;padding:24px;color:#b00">Render error in theme "${theme}":<pre>${String(err && err.stack || err)}</pre></body>`;
  }
}
```

- [ ] **Step 2: 改 minimal 的 render 簽名**(`src/render/themes/minimal.js:211`)
  `export function render(content) {` → `export function render(content, opts = {}) {`
  在函式頂端 `const c = content || {};` 下一行加:
  `  const edit = !!(opts && opts.edit);`

- [ ] **Step 3: 改 featherweight 的 render 簽名**(`src/render/themes/featherweight.js:6`)
  `export function render(content) {` → `export function render(content, opts = {}) {`
  在 `const p = content.profile || {};` 上一行加:
  `  const edit = !!(opts && opts.edit);`

- [ ] **Step 4: `npm run build` 確認建置成功**(尚無行為變化)。
  Run: `npm run build`。預期 build 綠、postbuild 照常寫檔。

- [ ] **Step 5: Commit**
```bash
git add src/render/renderSite.js src/render/themes/minimal.js src/render/themes/featherweight.js
git commit -m "feat: thread edit opts through renderSite and both themes"
```

## Task 4.3: minimal 在 edit 模式吐 data-bind + 關 fx

**Files:**
- Modify: `src/render/themes/minimal.js`
- Test: `tests/render-edit-bind.test.js`(新檔,本 task 建立;featherweight 斷言在 4.4 追加)

**Interfaces:**
- Consumes: `bindAttr`(4.1)、`edit`(4.2)。
- Produces: `renderSite(content, "minimal", {edit:true})` 對下列欄位輸出 `data-bind`;`{edit:false}`(或不傳)時完全不出現 `data-bind`。edit 模式下不注入互動 fx 腳本(quest/shatter/cta/rate/sprite),避免干擾編輯。

**要綁的欄位與確切路徑(item 用索引 `i`):**
- `profile.tagline` → hero `<h1>`
- `profile.subtagline` → `.sub` 段
- `profile.name` → masthead 的名字 span(`minimal.js:441` 那個 `<span>${esc(p.name...)}`)
- `items.${i}.title`、`items.${i}.description`
- `items.${i}.detail`(kind=`md`)
- `items.${i}.tags`(kind=`tags`;edit 模式改渲染成逗號字串)
- `items.${i}.status`、`items.${i}.year`(edit 模式拆成兩個獨立可編 span)
- `items.${i}.image`(kind=`image`;綁在 `itemThumb` 的 `<img>`)
- `patent.title`、`patent.blurb`
- `about.paragraphs.${idx}`

- [ ] **Step 1: 寫失敗測試 `tests/render-edit-bind.test.js`**

```js
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { renderSite } from "../src/render/renderSite.js";

const content = JSON.parse(readFileSync(new URL("../data/content.json", import.meta.url)));

describe("minimal edit-mode data-bind", () => {
  const edit = renderSite(content, "minimal", { edit: true });
  const plain = renderSite(content, "minimal");

  it("binds profile fields", () => {
    expect(edit).toContain('data-bind="profile.tagline"');
    expect(edit).toContain('data-bind="profile.subtagline"');
    expect(edit).toContain('data-bind="profile.name"');
  });
  it("binds item fields with indices", () => {
    expect(edit).toContain('data-bind="items.0.title"');
    expect(edit).toContain('data-bind="items.0.description"');
    expect(edit).toContain('data-bind="items.0.detail" data-edit="md"');
    expect(edit).toContain('data-bind="items.0.tags" data-edit="tags"');
    expect(edit).toContain('data-bind="items.0.image" data-edit="image"');
  });
  it("binds patent fields", () => {
    expect(edit).toContain('data-bind="patent.title"');
    expect(edit).toContain('data-bind="patent.blurb"');
  });
  it("emits NO data-bind and keeps fx when not editing", () => {
    expect(plain).not.toContain("data-bind");
    expect(plain).toContain("__QUEST__") // sentinel replaced below
  });
  it("drops interactive fx scripts in edit mode", () => {
    // quest/rate/sprite globals should not be wired when editing
    expect(edit).not.toContain("window.QUEST");
    expect(plain).toContain("window.QUEST");
  });
});
```
  註:上面 `__QUEST__` 那行是佔位,實作時刪掉該 `it` 裡的第二個 expect(只留 `expect(plain).not.toContain("data-bind")`)。改成:
```js
  it("emits NO data-bind when not editing", () => {
    expect(plain).not.toContain("data-bind");
  });
```

- [ ] **Step 2: 跑測試確認失敗**
  Run: `npx vitest run render-edit-bind`。預期 FAIL。

- [ ] **Step 3: 把 `edit` 傳進各 helper**
  改這些呼叫點,讓 helper 能拿到 `edit`:
  - `minimal.js:463` `items.map(itemRow)` → `items.map((it, i) => itemRow(it, i, edit))`
  - `minimal.js:455` `aboutBlock(c.about)` → `aboutBlock(c.about, edit)`
  - `minimal.js:467` `patentBlock(c.patent)` → `patentBlock(c.patent, edit)`
  並改對應函式簽名:`function itemRow(it, i, edit)`、`function aboutBlock(about, edit)`、`function patentBlock(pt, edit)`、`function itemThumb(it, edit)`(itemRow 內呼叫 `itemThumb(it)` 改成 `itemThumb(it, edit)`)。

- [ ] **Step 4: 在各欄位插入 `bindAttr`(minimal)**
  在 `minimal.js` 頂部 import 補上 `bindAttr`:
  `import { esc, md, realLinks, bindAttr } from "../util.js";`

  **profile(render 內 body 區塊):**
  - hero h1:`<h1>${accentTagline(p.tagline)}</h1>` → `<h1${bindAttr("profile.tagline", edit)}>${accentTagline(p.tagline)}</h1>`
  - sub:`<p class="sub">${esc(p.subtagline)}</p>` → `<p class="sub"${bindAttr("profile.subtagline", edit)}>${esc(p.subtagline)}</p>`
  - masthead 名字(`minimal.js:441`):`<span>${esc(p.name || "Portfolio")} — Selected Work</span>` → 把名字包成可綁的 span:`<span><span${bindAttr("profile.name", edit)}>${esc(p.name || "Portfolio")}</span> — Selected Work</span>`

  **itemRow(it, i, edit):** 在 return 的模板裡:
  - title:`<span class="title">${esc(it.title)}</span>` → `<span class="title"${bindAttr("items." + i + ".title", edit)}>${esc(it.title)}</span>`
  - desc:`<p class="desc">${esc(it.description)}</p>` → `<p class="desc"${bindAttr("items." + i + ".description", edit)}>${esc(it.description)}</p>`
  - detail:把
    `${detail ? `<div class="detail">${detail}</div>` : ""}`
    改成 edit 模式一律給可點的 div:
    ```js
    ${edit
      ? `<div class="detail"${bindAttr("items." + i + ".detail", edit, "md")}>${detail}</div>`
      : (detail ? `<div class="detail">${detail}</div>` : "")}
    ```
  - meta(status/year):把 `<span class="meta">${metaBits}</span>` 改成:
    ```js
    ${edit
      ? `<span class="meta"><span${bindAttr("items." + i + ".status", edit)}>${esc(it.status || "")}</span> · <span${bindAttr("items." + i + ".year", edit)}>${esc(it.year || "")}</span></span>`
      : `<span class="meta">${metaBits}</span>`}
    ```
  - tags:把 `${tags ? `<div class="tags">${tags}</div>` : ""}` 改成:
    ```js
    ${edit
      ? `<div class="tags"${bindAttr("items." + i + ".tags", edit, "tags")}>${esc((it.tags || []).join(", "))}</div>`
      : (tags ? `<div class="tags">${tags}</div>` : "")}
    ```

  **itemThumb(it, edit):** 在有圖分支,給 `<img>` 加綁定:
  `<img src="${esc(it.image)}" alt="${esc(it.title)} preview" loading="lazy">` →
  `<img src="${esc(it.image)}" alt="${esc(it.title)} preview" loading="lazy"${bindAttr("items." + /*idx*/ 0 + ".image", edit, "image")}>`
  註:`itemThumb` 目前拿不到索引 `i`。實作時把 `itemThumb(it, edit)` 改成 `itemThumb(it, i, edit)`,呼叫端(itemRow 內 `${itemThumb(it)}`)改 `${itemThumb(it, i, edit)}`,路徑用 `"items." + i + ".image"`。

  **patentBlock(pt, edit):**
  - title:`<h3 class="patent-title">${esc(pt.title)}</h3>` → 加 `${bindAttr("patent.title", edit)}`
  - blurb:`<p class="patent-blurb">${esc(pt.blurb)}</p>` → 加 `${bindAttr("patent.blurb", edit)}`

  **aboutBlock(about, edit):** 段落 map 帶索引並綁定:
  `about.paragraphs.map((p) => `<p>${esc(p)}</p>`)` →
  `about.paragraphs.map((p, idx) => `<p${bindAttr("about.paragraphs." + idx, edit)}>${esc(p)}</p>`)`

- [ ] **Step 5: edit 模式關掉互動 fx 腳本**
  在 `minimal.js` 最後那串 `<script>${questJS}</script> ... ${spriteJS}` 之外層包一層條件。把
  ```
  <script>${questJS}</script>
  <script>${shatterJS}</script>
  <script>${ctaJS}</script>
  <script>${rateJS}</script>
  <script>${spriteJS}</script>
  ```
  改成:
  ```js
  ${edit ? "" : `<script>${questJS}</script>
  <script>${shatterJS}</script>
  <script>${ctaJS}</script>
  <script>${rateJS}</script>
  <script>${spriteJS}</script>`}
  ```
  (`ctaTopHTML`/`ctaLabHTML`/`questBadgeHTML`/`spriteHTML` 這些靜態片段可留;沒有腳本驅動它們只是安靜的 DOM,不干擾編輯。)

- [ ] **Step 6: 跑測試確認通過 + build**
  Run: `npx vitest run render-edit-bind` → PASS。
  Run: `npm run build` → 綠(確認正式站輸出未變:plain 分支無 data-bind、fx 照舊)。

- [ ] **Step 7: Commit**
```bash
git add src/render/themes/minimal.js tests/render-edit-bind.test.js
git commit -m "feat: minimal emits data-bind and drops fx in edit mode"
```

## Task 4.4: featherweight 在 edit 模式吐 data-bind

**Files:**
- Modify: `src/render/themes/featherweight.js`
- Test: `tests/render-edit-bind.test.js`(追加 featherweight 段)

**Interfaces:**
- Consumes: `bindAttr`、`edit`。
- Produces: `renderSite(content, "featherweight", {edit:true})` 對 profile / items / patent / about 同樣吐 `data-bind`;不編輯時零 `data-bind`。featherweight 無互動 fx(只有測速 script),測速 script 可留(編輯時無害)。

- [ ] **Step 1: 追加失敗測試**(在 `tests/render-edit-bind.test.js` 末尾)
```js
describe("featherweight edit-mode data-bind", () => {
  const content = JSON.parse(readFileSync(new URL("../data/content.json", import.meta.url)));
  const edit = renderSite(content, "featherweight", { edit: true });
  const plain = renderSite(content, "featherweight");
  it("binds representative fields", () => {
    expect(edit).toContain('data-bind="profile.name"');
    expect(edit).toContain('data-bind="items.0.title"');
    expect(edit).toContain('data-bind="items.0.detail" data-edit="md"');
    expect(edit).toContain('data-bind="items.0.tags" data-edit="tags"');
  });
  it("stays clean when not editing", () => {
    expect(plain).not.toContain("data-bind");
  });
});
```

- [ ] **Step 2: 跑測試確認失敗**
  Run: `npx vitest run render-edit-bind`。預期新 describe FAIL。

- [ ] **Step 3: 在 featherweight 插 bindAttr**
  import 補 `bindAttr`:`import { esc, md, realLinks, bindAttr } from "../util.js";`
  - hero name(`featherweight.js:398`):`<h1>${esc(p.name)}</h1>` → `<h1${bindAttr("profile.name", edit)}>${esc(p.name)}</h1>`
  - lede tagline(`lede` 變數):`<p class="lede">${esc(p.tagline)}</p>` → 加 `${bindAttr("profile.tagline", edit)}`
  - sub:`<p class="sub">${esc(p.subtagline)}</p>` → 加 `${bindAttr("profile.subtagline", edit)}`
  - work items(`workHTML` 的 `.map((it) => {`):改成 `.map((it, i) => {`,並:
    - `<h3>${esc(it.title)}</h3>` → 加 `${bindAttr("items." + i + ".title", edit)}`
    - blurb:`<p class="blurb">${esc(it.description)}</p>` → 加 `${bindAttr("items." + i + ".description", edit)}`(注意這段目前包在 `it.description ? ... : ""`;edit 模式改成一律輸出可編 `<p class="blurb">`,空字串也給,以便有編輯目標)
    - detail:同樣 edit 模式一律輸出 `<div class="detail"${bindAttr("items." + i + ".detail", edit, "md")}>${md(it.detail)}</div>`
    - tags:目前 `const tags = (it.tags||[]).map(esc).join(" · ")` 塞進 `.foot`。edit 模式在 foot 內改輸出 `<span class="tags"${bindAttr("items." + i + ".tags", edit, "tags")}>${esc((it.tags||[]).join(", "))}</span>`
  - patent title/blurb:比照 minimal,加 `${bindAttr("patent.title", edit)}`、`${bindAttr("patent.blurb", edit)}`。
  - about paragraphs(`paras` 變數):`.map((t) => ...)` → `.map((t, idx) => `<p class="lead"${bindAttr("about.paragraphs." + idx, edit)}>${esc(t)}</p>`)`

- [ ] **Step 4: 跑測試 + build**
  Run: `npx vitest run render-edit-bind` → 全 PASS。
  Run: `npm run build` → 綠。

- [ ] **Step 5: Commit**
```bash
git add src/render/themes/featherweight.js tests/render-edit-bind.test.js
git commit -m "feat: featherweight emits data-bind in edit mode"
```

---

# Phase B — 編輯層(改造 freeform.js)

> Phase B 主要是 DOM 互動,單元測試涵蓋有限。策略:每個 task 後 `npm run build` 綠 + bundle grep 關鍵字;整相結束用 preview 實跑 `edit.html` 做 round-trip。舊 `freeform.js` 會被大幅重寫;重用其 hover 控制與 image FileReader 邏輯(見引用行)。

## Task 4.5: freeform.js 改成從 content 物件 boot(edit render + swap)

**Files:**
- Modify: `src/studio/freeform.js`(重寫 boot / 狀態 / swapDocument 之外的序列化)

**Interfaces:**
- Produces: 模組級 `state = { content, theme }`;boot 讀 localStorage 的 content 草稿(新 key `freeform-content-v1`)或 fetch `/data/content.json` → `render()`;`render()` = `swapDocument(renderSite(state.content, state.theme, { edit: true }))` 後 `mountChrome()` + `bindEditable()`(4.6)。舊的 HTML 草稿 key `freeform-draft-v1` 廢棄不讀。

- [ ] **Step 1: 換掉檔頭 import 與狀態**
  `freeform.js:5` 改成:
```js
import { renderSite, THEMES_META } from "../render/renderSite.js";
import { getPath, setPath } from "../render/util.js";

const CONTENT_KEY = "freeform-content-v1";
const state = { content: null, theme: "featherweight" };
let editing = true;
const undoStack = []; // structural ops (add/delete item); text undo stays native
```

- [ ] **Step 2: 重寫 boot / render / save**
  把原 `boot` / `freshFromTheme` / `swapDocument` / `serialize` / `scheduleSave` 區塊(`freeform.js:11-70`)換成:
```js
async function boot() {
  const draft = localStorage.getItem(CONTENT_KEY);
  if (draft) {
    try { state.content = JSON.parse(draft); } catch { state.content = null; }
  }
  if (!state.content) {
    state.content = await (await fetch("/data/content.json")).json();
  }
  render("Editing " + state.theme);
}

// Re-render the whole page from the in-memory content in edit mode, then remount
// the editor chrome and rebind editable fields.
function render(msg) {
  swapDocument(renderSite(state.content, state.theme, { edit: true }));
  mountChrome(msg || "Editing");
  bindEditable();          // 4.6
  scheduleSave();
}

function swapDocument(html) {
  const doc = new DOMParser().parseFromString(html, "text/html");
  document.replaceChild(document.importNode(doc.documentElement, true), document.documentElement);
  // Recreate scripts DOMParser marks inert. In edit mode themes ship no fx, but
  // featherweight's tiny speed timer is harmless.
  document.querySelectorAll("script").forEach((old) => {
    const s = document.createElement("script");
    for (const a of old.attributes) s.setAttribute(a.name, a.value);
    s.textContent = old.textContent;
    old.replaceWith(s);
  });
}

let saveTimer = null;
function scheduleSave() {
  clearTimeout(saveTimer);
  setStatus("Editing…");
  saveTimer = setTimeout(() => {
    localStorage.setItem(CONTENT_KEY, JSON.stringify(state.content));
    setStatus("Saved ✓");
  }, 600);
}
```
  註:刪掉舊的 `watchMutations`/`observer`(改用欄位級 input 事件驅動存檔,見 4.6)。`mountChrome` 內對 `watchMutations()` 的呼叫一併移除。

- [ ] **Step 3: build**
  Run: `npm run build` → 綠(此時編輯尚不可寫回,下一 task 補)。

- [ ] **Step 4: Commit**
```bash
git add src/studio/freeform.js
git commit -m "feat: freeform boots from content object in edit render"
```

## Task 4.6: 泛用文字綁定(contentEditable → setPath)

**Files:**
- Modify: `src/studio/freeform.js`(加 `bindEditable`)

**Interfaces:**
- Consumes: `state.content`、`setPath`、`[data-bind]`(Phase A)。
- Produces: `bindEditable()` 對所有 `[data-bind]` 且無 `data-edit` 的元素設 `contentEditable=true`,`input` 時 `setPath(state.content, path, el.textContent)` + `scheduleSave()`。特殊 `data-edit`(md/tags/image)留給 4.7/4.8。

- [ ] **Step 1: 加 `bindEditable`**
```js
// Wire every plain [data-bind] text node to write back into state.content.
// Special kinds (data-edit=md|tags|image) are handled elsewhere.
function bindEditable() {
  document.querySelectorAll("[data-bind]").forEach((el) => {
    const path = el.getAttribute("data-bind");
    const kind = el.getAttribute("data-edit");
    if (kind === "md") return bindMd(el, path);     // 4.7
    if (kind === "tags") return bindTags(el, path); // 4.7
    if (kind === "image") return bindImage(el, path); // 4.8
    el.setAttribute("contenteditable", "true");
    el.addEventListener("input", () => {
      setPath(state.content, path, el.textContent);
      scheduleSave();
    });
  });
}
```
  先給 `bindMd`/`bindTags`/`bindImage` 空樁,避免 ReferenceError:
```js
function bindMd(el, path) { el.setAttribute("contenteditable", "true"); }
function bindTags(el, path) { el.setAttribute("contenteditable", "true"); }
function bindImage(el, path) {}
```

- [ ] **Step 2: build + grep**
  Run: `npm run build`。
  Run: `grep -o 'data-bind' dist/assets/*.js | head -1`(確認綁定邏輯進 bundle;此為健全性檢查,edit render 的 data-bind 由 4.3/4.4 測試保證)。

- [ ] **Step 3: Commit**
```bash
git add src/studio/freeform.js
git commit -m "feat: bind plain editable fields back to content via setPath"
```

## Task 4.7: 特殊欄位編輯器 — markdown 詳述 + tags

**Files:**
- Modify: `src/studio/freeform.js`(實作 `bindMd` / `bindTags`)

**Interfaces:**
- Produces:
  - `bindTags(el, path)`:元素 contentEditable;input 時把 `el.textContent` 以逗號切、trim、去空 → 陣列,`setPath` 寫回。
  - `bindMd(el, path)`:元素不直接 inline 編;點擊開一個定位到該元素的浮層 textarea,內容取 `getPath(state.content, path)`(原始 markdown);textarea input 時 `setPath` 寫回並用 `md()` 即時重繪該元素內部;失焦關浮層。

- [ ] **Step 1: 實作 `bindTags`**
```js
// Tags edit as one comma-separated string; split back into an array on input.
function bindTags(el, path) {
  el.setAttribute("contenteditable", "true");
  el.addEventListener("input", () => {
    const arr = el.textContent.split(",").map((s) => s.trim()).filter(Boolean);
    setPath(state.content, path, arr);
    scheduleSave();
  });
}
```

- [ ] **Step 2: 實作 `bindMd`(浮層 textarea 編原始 markdown)**
  在檔頭 import 補 `md`:`import { getPath, setPath } from "../render/util.js";` → 追加 `import { md } from "../render/util.js";`(或合併成一行)。
```js
// Markdown detail: click opens a floating textarea over the element to edit the
// RAW markdown (from state.content, not the rendered HTML); live-re-renders via md().
function bindMd(el, path) {
  el.style.cursor = "text";
  el.addEventListener("click", (e) => {
    if (!editing) return;
    e.preventDefault();
    if (document.querySelector("[data-ff-md]")) return; // one at a time
    const r = el.getBoundingClientRect();
    const ta = document.createElement("textarea");
    ta.setAttribute("data-ff-md", "");
    ta.setAttribute("data-ff-chrome", "");
    ta.value = getPath(state.content, path) || "";
    ta.style.cssText =
      "position:absolute;z-index:99996;left:" + (r.left + scrollX) + "px;top:" + (r.top + scrollY) +
      "px;width:" + Math.max(280, r.width) + "px;height:" + Math.max(120, r.height + 40) +
      "px;font:13px/1.5 ui-monospace,Consolas,monospace;padding:8px;border:1.5px solid #7c3aed;" +
      "border-radius:8px;background:#fff;color:#1b1b1f;box-shadow:0 8px 28px rgba(20,20,30,.18)";
    document.body.appendChild(ta);
    ta.focus();
    ta.addEventListener("input", () => {
      setPath(state.content, path, ta.value);
      el.innerHTML = md(ta.value);
      scheduleSave();
    });
    ta.addEventListener("blur", () => ta.remove());
  });
}
```

- [ ] **Step 3: build + commit**
  Run: `npm run build` → 綠。
```bash
git add src/studio/freeform.js
git commit -m "feat: markdown-overlay and comma-tags editors"
```

## Task 4.8: 圖片替換 + 項目增刪(綁回 content 陣列)

**Files:**
- Modify: `src/studio/freeform.js`(`bindImage` + hover 控制改綁陣列)

**Interfaces:**
- Produces:
  - `bindImage(el, path)`:雙擊 `<img>` 選檔 → FileReader 讀成 data URL,`el.src = dataURL`、`setPath(state.content, path, dataURL)`,並在對應 item 掛 `_imageFile`(給 M5 真上傳)。重用舊 `freeform.js:277-292` 的 FileReader 流程。
  - 項目增刪:hover 的 ✕/⧉ 改成操作 `state.content.items`。刪 = 依 `data-bind` 前綴 `items.N.` 解析出 N,`items.splice(N,1)` + `render()`;複製 = `items.splice(N+1,0, structuredClone(items[N]))` + `render()`。放進 undoStack。

- [ ] **Step 1: 實作 `bindImage`**
```js
// Double-click an image to replace it; store a data URL for preview and keep the
// File for the real upload at publish time (M5).
function bindImage(el, path) {
  el.style.cursor = "pointer";
  el.title = "Double-click to replace image";
  el.addEventListener("dblclick", (e) => {
    if (!editing) return;
    e.preventDefault();
    const pick = document.createElement("input");
    pick.type = "file"; pick.accept = "image/*";
    pick.addEventListener("change", () => {
      const f = pick.files && pick.files[0];
      if (!f) return;
      const rd = new FileReader();
      rd.onload = () => {
        el.src = rd.result;
        setPath(state.content, path, rd.result);
        // remember the File on the item for M5 upload: path is "items.N.image"
        const m = /^items\.(\d+)\.image$/.exec(path);
        if (m) state.content.items[+m[1]]._imageFile = f;
        scheduleSave();
      };
      rd.readAsDataURL(f);
    });
    pick.click();
  });
}
```

- [ ] **Step 2: 改 hover ✕/⧉ 綁陣列**
  在 `buildHoverControls`(舊 `freeform.js:198-233`)裡,把 del/dup 的 handler 換成先找出「hoverTarget 所屬的 item 索引」。加輔助:
```js
// The item index owning a hovered node = prefix of the nearest [data-bind^="items."].
function itemIndexOf(node) {
  const bound = node.closest && node.closest('[data-bind^="items."]');
  if (!bound) return -1;
  const m = /^items\.(\d+)\./.exec(bound.getAttribute("data-bind"));
  return m ? +m[1] : -1;
}
```
  del handler:
```js
    const idx = itemIndexOf(hoverTarget);
    if (idx < 0) { hideHover(); return; }        // only items are structurally editable
    const removed = state.content.items[idx];
    state.content.items.splice(idx, 1);
    undoStack.push({ type: "delete", idx, item: removed });
    hideHover(); toolbarUndoRefresh(); render("Deleted item");
```
  dup handler:
```js
    const idx = itemIndexOf(hoverTarget);
    if (idx < 0) return;
    const copy = JSON.parse(JSON.stringify(state.content.items[idx]));
    state.content.items.splice(idx + 1, 0, copy);
    undoStack.push({ type: "duplicate", idx: idx + 1 });
    toolbarUndoRefresh(); render("Duplicated item");
```
  對應 undo(toolbar Undo 按鈕 handler):
```js
    const op = undoStack.pop();
    if (!op) return;
    if (op.type === "delete") state.content.items.splice(op.idx, 0, op.item);
    else if (op.type === "duplicate") state.content.items.splice(op.idx, 1);
    render("Undo");
```

- [ ] **Step 3: build + commit**
  Run: `npm run build` → 綠。
```bash
git add src/studio/freeform.js
git commit -m "feat: image replace and item add/delete bound to content array"
```

## Task 4.9: toolbar — 切 theme / 匯出 content.json / preview / reset / publish 樁

**Files:**
- Modify: `src/studio/freeform.js`(`buildToolbar`)

**Interfaces:**
- Produces: toolbar 具備:
  - **theme 下拉**:選 theme → `state.theme = key` + `render()`(同一份 content 換皮 = 兩版同步的直接體現)。取代舊「New from template」(不再是從模板起新頁,而是切預覽皮)。
  - **Undo**(4.8 的結構 undo)。
  - **Preview**:`setEditing(!editing)`。
  - **Export**:下載 `JSON.stringify(state.content, null, 2)` 成 `content.json`(重用 `studio.js:231-236` 邏輯)。
  - **Reset**:清 `CONTENT_KEY`、重 fetch content.json、`render()`。
  - **Publish**:樁,alert 告知 M5 會接 GitHub OAuth(沿用 `studio.js:237-239` 文案)。

- [ ] **Step 1: 改 `buildToolbar`**
  把原本的 template `<select>`(舊 `freeform.js:128-147`)語意改成「切預覽皮」:
```js
  const sel = document.createElement("select");
  THEMES_META.forEach((t) => {
    const o = document.createElement("option");
    o.value = t.key; o.textContent = t.label;
    if (t.key === state.theme) o.selected = true;
    sel.appendChild(o);
  });
  sel.addEventListener("change", () => { state.theme = sel.value; render("Editing " + sel.value); });
  bar.appendChild(sel);
```
  Export 按鈕改吐 content.json:
```js
  mkBtn("Export", "Download content.json (drop into data/ to publish manually)", () => {
    const blob = new Blob([JSON.stringify(state.content, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "content.json";
    document.body.appendChild(a); a.click(); a.remove();
    setStatus("Exported content.json ✓");
  }, "primary");
```
  Reset:
```js
  mkBtn("Reset", "Discard local edits, reload published content", async () => {
    if (!confirm("Discard ALL local edits and reload the published content.json?")) return;
    localStorage.removeItem(CONTENT_KEY);
    undoStack.length = 0;
    state.content = await (await fetch("/data/content.json")).json();
    render("Reset to published");
  });
```
  Publish 樁:
```js
  mkBtn("Publish", "One-click publish (coming in M5)", () => {
    alert("Publish to GitHub is coming next (M5): it will commit content.json (and any replaced images) via your OAuth worker and auto-deploy. For now use Export.");
  });
```

- [ ] **Step 2: build + commit**
  Run: `npm run build` → 綠。
```bash
git add src/studio/freeform.js
git commit -m "feat: freeform toolbar exports content.json and switches theme"
```

## Task 4.10: Creator 編輯入口(whoami → 露出連到 /edit)

**Files:**
- Create: `src/render/fx/creator-entry.js`
- Modify: `src/render/themes/minimal.js`(注入 `creatorEntryJS`,非 edit 模式時)
- Test: `tests/creator-entry-inject.test.js`

**Interfaces:**
- Produces: `creatorEntryJS`(字串)— 自問 `/api/whoami`,`creator===true` 時在頁面右下角插入一個連到 `/edit` 的浮動連結。self-gate:非 creator 什麼都不做。掛在 minimal 正式站(非 edit 模式)。

- [ ] **Step 1: 寫失敗測試 `tests/creator-entry-inject.test.js`**
```js
import { describe, it, expect } from "vitest";
import { creatorEntryJS } from "../src/render/fx/creator-entry.js";

describe("creatorEntryJS", () => {
  it("fetches whoami and links to /edit", () => {
    expect(creatorEntryJS).toContain("/api/whoami");
    expect(creatorEntryJS).toContain("/edit");
  });
  it("is a self-invoking string with no import/export", () => {
    expect(creatorEntryJS).toContain("(function");
    expect(creatorEntryJS).not.toContain("import ");
  });
});
```

- [ ] **Step 2: 跑測試確認失敗**
  Run: `npx vitest run creator-entry-inject`。預期 FAIL。

- [ ] **Step 3: 建 `src/render/fx/creator-entry.js`**
```js
// Owner-only edit entry. On the live Minimal page, ask /api/whoami; if this is the
// creator's IP, drop a small fixed link to /edit (the WYSIWYG editor). Self-gating:
// non-creators get nothing. Injected as an inline <script> string, like the other fx.
export const creatorEntryJS = `
(function () {
  fetch("/api/whoami").then(function (r) { return r.json(); }).then(function (d) {
    if (!d || !d.creator) return;
    var a = document.createElement("a");
    a.href = "/edit";
    a.textContent = "\\u270e Edit this site";
    a.style.cssText = "position:fixed;left:14px;bottom:14px;z-index:9999;" +
      "background:#17151a;color:#fffdfa;font:12px ui-monospace,Consolas,monospace;" +
      "padding:7px 12px;border-radius:999px;text-decoration:none;box-shadow:0 6px 20px rgba(20,20,30,.28)";
    document.body.appendChild(a);
  }).catch(function () {});
})();
`;
```

- [ ] **Step 4: 注入 minimal(非 edit 模式)**
  `minimal.js` import 補:`import { creatorEntryJS } from "../fx/creator-entry.js";`
  在 Task 4.3 Step 5 那段 `${edit ? "" : \`...fx...\`}` 的 fx 區塊裡,`${spriteJS}` 之後、閉合反引號之前,加一行:
  `<script>${creatorEntryJS}</script>`
  (放在 `edit ? "" : ...` 分支內 = 只有正式站露出入口;編輯頁自己不需要「進入編輯」。)

- [ ] **Step 5: 跑測試 + build**
  Run: `npx vitest run creator-entry-inject` → PASS。
  Run: `npm run build` → 綠。
  Run: `grep -o 'api/whoami' dist/assets/*.js | wc -l`(minimal bundle 現在含 rate.js 與 creator-entry 兩處 whoami,預期 ≥2)。

- [ ] **Step 6: Commit**
```bash
git add src/render/fx/creator-entry.js src/render/themes/minimal.js tests/creator-entry-inject.test.js
git commit -m "feat: creator-only edit entry links to /edit on minimal"
```

---

## 完工驗證(Phase B 結束)

- [ ] **Step 1: 全測試綠**
  Run: `npx vitest run`。預期全 PASS。
- [ ] **Step 2: build 綠**
  Run: `npm run build`。
- [ ] **Step 3: preview 實跑 round-trip**(完工前必做,DOM 互動只有這關能證)
  - `npm run dev` → 開 `http://localhost:5173/edit`。
  - 改 hero 標題文字 → 切 theme 下拉到另一個 → 確認新皮上文字同步變了(= 兩版同步)。
  - 雙擊一張專案圖換張本機圖 → 預覽出現新圖。
  - 點某項目的詳述 → 浮層 textarea 改 markdown → 關閉後渲染更新。
  - hover 一個項目按 ✕ 刪掉、按 ⧉ 複製 → Undo 還原。
  - Export → 下載的 `content.json` 內含剛才的改動。
  - reload `/edit` → localStorage 草稿還在。
- [ ] **Step 4: 正式站未破**
  開 `http://localhost:5173/site?theme=minimal&v=full` → quest/rate/sprite 照常;開 `http://localhost:5173/site?theme=featherweight` → 測速數字照常;兩者 view-source 無 `data-bind`。

---

## Self-Review

**Spec coverage(對 M4):**
- (a) 綁定層:`renderSite` edit 旗標 + `data-bind` + util helper → Task 4.1–4.4 ✓
- (b) 編輯層:freeform 改操作 content 物件 + 匯出 content.json → 4.5–4.9 ✓
  - contentEditable 寫回 → 4.6 ✓
  - 圖片雙擊換圖 + 記檔給 M5 → 4.8 ✓
  - item 增刪同步陣列 → 4.8 ✓
  - 三硬點:markdown 浮層(4.7)、tags 逗號 split(4.7)、status/year inline(4.3)✓
  - autosave localStorage + toolbar(theme/undo/preview/export/publish)→ 4.5/4.9 ✓
  - 切 theme = 換皮重 render = 兩版同步 → 4.9 ✓
- 編輯入口(依賴 M3 whoami)→ 4.10 ✓

**Placeholder scan:** 純函式(path/bindAttr/creatorEntry)給完整 test+impl。theme 改動給確切 old→new 與精確路徑。freeform 重寫給完整函式。無 TBD。唯一刻意留樁:Publish(M5)、`_imageFile`(M5 真上傳消費)。

**Type consistency:** `getPath/setPath(obj, path)`、`bindAttr(path, edit, kind?)` 在 4.1 定義,4.3/4.4/4.6/4.7/4.8 一致消費。`data-edit` 的 kind 值 `md|tags|image` 在 theme(產)與 freeform 的 `bindEditable` 分派(消)一致。`state.content.items[N]._imageFile` 在 4.8 產、M5 消費。

**已知後續(不阻塞):** link href / status 下拉 / about principles 等次要欄位 inline 編輯未納 MVP,可用 `studio.html`(既有表單編輯器)補;M5 會消費 `_imageFile` 做真上傳。
