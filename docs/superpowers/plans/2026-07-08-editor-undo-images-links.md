# 編輯器三增強:全歷史 Undo/Redo + 圖片上傳 + 連結編輯 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** 讓就地編輯器 (a) 有完整可回復的 undo/redo(每一步都保留、文字+結構統一)、(b) Publish 時把換掉的圖片當真檔案上傳到 `public/assets/`(不再內嵌 data URL)、(c) 可就地新增/編輯/刪除作品連結。

**Architecture:** Undo/Redo 抽成純模組 `src/studio/history.js`(對 JSON 快照做 past/present/future),freeform 在每次編輯(文字 debounce、結構立即)commit 快照。圖片上傳:`github.js` 加 Git Trees API 多檔原子 commit;Publish 送 `{content, images}`,端點把圖 commit 進 `public/assets/`、content 的 image 路徑改乾淨、和 content.json 一起 commit。連結編輯:兩個 theme 的 edit 模式對連結 label/href 吐 `data-bind`,freeform 加「加/刪連結」的結構操作。

**Tech Stack:** vanilla JS、Vitest、Cloudflare Pages Functions、GitHub REST(Contents + Git Data/Trees API)。

## Global Constraints

- 只碰 `src/studio/*`、`functions/*`、`src/render/themes/*`、`src/render/util.js`。版本紀律:每 task 一 commit、`git add <指定路徑>`。分支 `feat/sprite-quest`。
- 純函式走 Vitest;DOM/整合走 `npm run build` 綠 + 完工前 `npm run build && npm run preview` 實跑。
- **保留 data-bind/data-edit 契約**:themes 的 edit 模式綁定屬性是編輯器命脈,改 theme markup 時務必保留既有 `data-bind`/`data-edit`,只做加法。
- 旗標鍵沿用 `localStorage["can-edit"]`;內容鍵 `freeform-content-v1`。
- 圖片上傳紅線:只上傳到 `public/assets/`,檔名不可覆蓋既有資產(用內容雜湊避免撞名)。

## File Structure

- `src/studio/history.js` — 新;純 undo/redo 快照管理器。
- `src/studio/freeform.js` — 接 history;Publish 收集換圖;連結結構操作。
- `functions/_lib/github.js` — 加 `commitTree`(多檔原子 commit)。
- `functions/api/publish.js` — 收 `{content, images}`,走 commitTree。
- `src/render/themes/minimal.js`、`featherweight.js` — edit 模式連結 label/href 綁定。
- tests:`history.test.js`、`github-tree.test.js`。

---

# Phase A — 全歷史 Undo/Redo

## Task A1: 純 history 模組

**Files:** Create `src/studio/history.js`, `tests/history.test.js`

**Interfaces:** Produces `makeHistory(initial, cap=200) => { commit(next), undo(), redo(), canUndo(), canRedo(), reset(snap) }`。`commit(next)`:next===present 時 no-op,否則把 present 推入 past(超過 cap 丟最舊)、present=next、清空 future。`undo()`/`redo()`:回傳要還原的快照或 null(到底時)。

- [ ] **Step 1: 失敗測試 `tests/history.test.js`**
```js
import { describe, it, expect } from "vitest";
import { makeHistory } from "../src/studio/history.js";

describe("makeHistory", () => {
  it("commits, undoes, and redoes", () => {
    const h = makeHistory("A");
    h.commit("B"); h.commit("C");
    expect(h.undo()).toBe("B");
    expect(h.undo()).toBe("A");
    expect(h.undo()).toBe(null);      // at the start
    expect(h.redo()).toBe("B");
    expect(h.redo()).toBe("C");
    expect(h.redo()).toBe(null);      // at the end
  });
  it("no-ops on an unchanged commit", () => {
    const h = makeHistory("A");
    h.commit("A");
    expect(h.canUndo()).toBe(false);
  });
  it("a new commit after undo clears the redo future", () => {
    const h = makeHistory("A");
    h.commit("B");
    h.undo();               // present = A, future = [B]
    h.commit("C");          // clears future
    expect(h.canRedo()).toBe(false);
    expect(h.undo()).toBe("A");
  });
  it("caps history length", () => {
    const h = makeHistory("0", 3);
    for (let i = 1; i <= 10; i++) h.commit(String(i));
    // can only undo back `cap` steps
    let n = 0; while (h.undo() !== null) n++;
    expect(n).toBe(3);
  });
});
```
- [ ] **Step 2: 跑測試 FAIL** — `npx vitest run history`
- [ ] **Step 3: 實作 `src/studio/history.js`**
```js
// Undo/redo over immutable JSON snapshots (strings). commit(next) records a new
// state and clears the redo future; undo()/redo() return the snapshot to restore
// or null at the ends. Unlimited by default, optionally capped.
export function makeHistory(initial, cap = 200) {
  let past = [];
  let present = initial;
  let future = [];
  return {
    commit(next) {
      if (next === present) return;
      past.push(present);
      if (past.length > cap) past.shift();
      present = next;
      future = [];
    },
    undo() {
      if (!past.length) return null;
      future.push(present);
      present = past.pop();
      return present;
    },
    redo() {
      if (!future.length) return null;
      past.push(present);
      present = future.pop();
      return present;
    },
    canUndo() { return past.length > 0; },
    canRedo() { return future.length > 0; },
    reset(snap) { past = []; present = snap; future = []; },
  };
}
```
- [ ] **Step 4: 跑測試 PASS** — `npx vitest run history`
- [ ] **Step 5: Commit** — `git add src/studio/history.js tests/history.test.js` → `git commit -m "feat: undo/redo history module"`

## Task A2: freeform 接上 history(文字 debounce + 結構立即)+ Redo 鈕

**Files:** Modify `src/studio/freeform.js`

**Interfaces:** Consumes `makeHistory`(A1)。freeform 用一個 `snapshot()=JSON.stringify(state.content)`;文字編輯 debounce commit、結構操作立即 commit;Undo/Redo 還原快照後 `render()`;Ctrl+Z / Ctrl+Shift+Z(或 Ctrl+Y)綁定;控制欄加 Redo 鈕、Undo/Redo 依 canUndo/canRedo 開關。

- [ ] **Step 1: import + state**。`freeform.js` 頂部 import 加:`import { makeHistory } from "./history.js";`。把 `const undoStack = [];` 那行換成:
```js
let history = null;                       // makeHistory, initialised on boot
let commitTimer = null;
```
- [ ] **Step 2: 快照 + commit 排程**。在 `scheduleSave` 附近加:
```js
function snapshot() { return JSON.stringify(state.content); }
function commitNow() { clearTimeout(commitTimer); if (history) history.commit(snapshot()); refreshUndoRedo(); }
function scheduleCommit() { clearTimeout(commitTimer); commitTimer = setTimeout(commitNow, 500); }
function refreshUndoRedo() {
  var bar = document.getElementById("ffbar");
  if (bar && bar._undoBtn) bar._undoBtn.disabled = !(history && history.canUndo());
  if (bar && bar._redoBtn) bar._redoBtn.disabled = !(history && history.canRedo());
}
```
- [ ] **Step 3: boot 初始化 history**。`mountEditor()` 內,`render(...)` 之前加:`history = makeHistory(snapshot());`
- [ ] **Step 4: 文字編輯 commit**。`bindEditable()` 的純文字 input handler(`el.addEventListener("input", ...)`)與 `bindTags`/`bindMd` 的 input handler 內,`scheduleSave()` 之後各加一行 `scheduleCommit();`。
- [ ] **Step 5: 結構操作立即 commit**。`buildHoverControls` 的 del/dup handler、`bindImage` 的 rd.onload、以及 item add(若有)——凡是直接改 `state.content` 的結構動作,在 `render(...)`/`scheduleSave()` 之後加 `commitNow();`(圖片 rd.onload 內用 `commitNow()`)。
- [ ] **Step 6: 改 Undo 鈕 + 加 Redo 鈕**。`buildToolbar` 內把現有 Undo 鈕整段換成:
```js
  const undoBtn = mkBtn("↩ Undo", "Undo (Ctrl+Z)", () => {
    commitNow();
    const s = history && history.undo();
    if (s != null) { state.content = JSON.parse(s); render("Undo"); }
    refreshUndoRedo();
  });
  bar._undoBtn = undoBtn;
  const redoBtn = mkBtn("↪ Redo", "Redo (Ctrl+Shift+Z)", () => {
    const s = history && history.redo();
    if (s != null) { state.content = JSON.parse(s); render("Redo"); }
    refreshUndoRedo();
  });
  bar._redoBtn = redoBtn;
```
  註:`render()` 會重建工具列;在 `buildToolbar` 尾端(append 到 body 後)呼叫 `refreshUndoRedo()` 讓兩鈕依現況啟停。並刪掉舊 `toolbarUndoRefresh` 的定義與呼叫(改用 `refreshUndoRedo`)。
- [ ] **Step 7: 鍵盤綁定**。`wireEvents()` 內加:
```js
  document.addEventListener("keydown", (e) => {
    const z = (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z";
    if (z && e.shiftKey) { e.preventDefault(); commitNow(); const s = history && history.redo(); if (s != null) { state.content = JSON.parse(s); render("Redo"); } }
    else if (z) { e.preventDefault(); commitNow(); const s = history && history.undo(); if (s != null) { state.content = JSON.parse(s); render("Undo"); } }
  });
```
  (原生 contentEditable 的 Ctrl+Z 會被這個攔截取代成內容級 undo,統一行為。)
- [ ] **Step 8: build 綠 + preview 實跑**。`npm run build`;`npm run build && npm run preview` → 解鎖進編輯 → 改幾個字、刪一張卡 → Undo 逐步回復、Redo 逐步重做、到底鈕變灰。
- [ ] **Step 9: Commit** — `git add src/studio/freeform.js` → `git commit -m "feat: full undo/redo (text + structural) in the editor"`

---

# Phase B — 圖片上傳(Publish 時 commit 成真檔)

## Task B1: `commitTree` 多檔原子 commit

**Files:** Modify `functions/_lib/github.js`; Create `tests/github-tree.test.js`

**Interfaces:** Produces `commitTree({ token, owner, repo, branch, files, message, fetchImpl }) => commitSha`。`files`=陣列,每筆 `{ path, content, encoding }`(`encoding` 為 `"utf-8"` 或 `"base64"`)。流程:GET ref 拿 latest commit sha → 取其 tree sha → 為每個檔建 blob → 建新 tree(base_tree=舊 tree)→ 建 commit(parent=舊 commit)→ PATCH ref。

- [ ] **Step 1: 失敗測試 `tests/github-tree.test.js`**
```js
import { describe, it, expect } from "vitest";
import { commitTree } from "../functions/_lib/github.js";

// A scripted fake GitHub: each endpoint returns canned ids and records calls.
function fakeGitHub() {
  const calls = [];
  const fetchImpl = async (url, opts) => {
    calls.push({ url, method: (opts && opts.method) || "GET", body: opts && opts.body });
    if (url.endsWith("/git/refs/heads/main")) {
      if (opts && opts.method === "PATCH") return { status: 200, json: async () => ({}) };
      return { status: 200, json: async () => ({ object: { sha: "COMMIT_OLD" } }) };
    }
    if (url.endsWith("/git/commits/COMMIT_OLD")) return { status: 200, json: async () => ({ tree: { sha: "TREE_OLD" } }) };
    if (url.endsWith("/git/blobs")) return { status: 201, json: async () => ({ sha: "BLOB" }) };
    if (url.endsWith("/git/trees")) return { status: 201, json: async () => ({ sha: "TREE_NEW" }) };
    if (url.endsWith("/git/commits")) return { status: 201, json: async () => ({ sha: "COMMIT_NEW" }) };
    return { status: 404 };
  };
  return { fetchImpl, calls };
}

describe("commitTree", () => {
  it("blobs each file, builds a tree on the old base, commits, and moves the ref", async () => {
    const { fetchImpl, calls } = fakeGitHub();
    const sha = await commitTree({
      token: "t", owner: "o", repo: "r", branch: "main",
      files: [
        { path: "data/content.json", content: "{}", encoding: "utf-8" },
        { path: "public/assets/x.png", content: "AAAA", encoding: "base64" },
      ],
      message: "m", fetchImpl,
    });
    expect(sha).toBe("COMMIT_NEW");
    const tree = JSON.parse(calls.find((c) => c.url.endsWith("/git/trees")).body);
    expect(tree.base_tree).toBe("TREE_OLD");
    expect(tree.tree).toHaveLength(2);
    const commit = JSON.parse(calls.find((c) => c.url.endsWith("/git/commits")).body);
    expect(commit.parents).toEqual(["COMMIT_OLD"]);
    const patch = calls.find((c) => c.method === "PATCH");
    expect(JSON.parse(patch.body).sha).toBe("COMMIT_NEW");
  });
});
```
- [ ] **Step 2: 跑測試 FAIL** — `npx vitest run github-tree`
- [ ] **Step 3: 實作 `commitTree`(加在 `github.js`)**
```js
// Commit multiple files atomically via the Git Data API (blobs -> tree -> commit
// -> move ref). Each file: { path, content, encoding: "utf-8" | "base64" }.
export async function commitTree({ token, owner, repo, branch, files, message, fetchImpl }) {
  const doFetch = fetchImpl || fetch;
  const base = "https://api.github.com/repos/" + owner + "/" + repo;
  const headers = {
    authorization: "Bearer " + token,
    accept: "application/vnd.github+json",
    "user-agent": "stan-portfolio-publisher",
    "content-type": "application/json",
  };
  const gh = async (path, method, payload) => {
    const res = await doFetch(base + path, {
      method: method || "GET",
      headers,
      body: payload ? JSON.stringify(payload) : undefined,
    });
    if (res.status < 200 || res.status >= 300) {
      throw new Error("GitHub " + (method || "GET") + " " + path + " -> " + res.status);
    }
    return res.json();
  };

  const ref = await gh("/git/refs/heads/" + branch);
  const oldCommitSha = ref.object.sha;
  const oldCommit = await gh("/git/commits/" + oldCommitSha);
  const baseTree = oldCommit.tree.sha;

  const tree = [];
  for (const f of files) {
    const blob = await gh("/git/blobs", "POST", { content: f.content, encoding: f.encoding });
    tree.push({ path: f.path, mode: "100644", type: "blob", sha: blob.sha });
  }
  const newTree = await gh("/git/trees", "POST", { base_tree: baseTree, tree });
  const commit = await gh("/git/commits", "POST", {
    message, tree: newTree.sha, parents: [oldCommitSha],
  });
  await gh("/git/refs/heads/" + branch, "PATCH", { sha: commit.sha });
  return commit.sha;
}
```
- [ ] **Step 4: 跑測試 PASS** — `npx vitest run github-tree`
- [ ] **Step 5: Commit** — `git add functions/_lib/github.js tests/github-tree.test.js` → `git commit -m "feat: commitTree atomic multi-file GitHub commit"`

## Task B2: publish 端點收圖 + freeform 送圖

**Files:** Modify `functions/api/publish.js`, `src/studio/freeform.js`

**Interfaces:** Consumes `commitTree`(B1)。Publish body 改為 `{ content, images }`,`images`=`[{ path, base64 }]`(path 已是 `public/assets/<name>`)。端點:IP 通過後,把 content.json(utf-8)+ 每張圖(base64)組成 files → `commitTree`。freeform:Publish 前掃描 `content.items[i].image` 為 `data:` 的,產生檔名、改成 `/assets/<name>`、收進 images。

- [ ] **Step 1: 改 `publish.js`**。把現有 `putJsonFile` 呼叫段換成:
```js
  import { commitTree } from "../_lib/github.js";   // 換掉原 putJsonFile import
  // ...
  const files = [{ path: "data/content.json", content: JSON.stringify(body.content, null, 2) + "\n", encoding: "utf-8" }];
  for (const img of (body.images || [])) {
    if (img && typeof img.path === "string" && typeof img.base64 === "string") {
      files.push({ path: img.path, content: img.base64, encoding: "base64" });
    }
  }
  try {
    const sha = await commitTree({
      token: env.GITHUB_TOKEN,
      owner: env.PUBLISH_OWNER || "stantheman0128",
      repo: env.PUBLISH_REPO || "stan-portfolio",
      branch: env.PUBLISH_BRANCH || env.CF_PAGES_BRANCH || "main",
      files, message: "content: update from editor",
    });
    return json({ ok: true, commit: sha });
  } catch (e) {
    return json({ ok: false, error: String((e && e.message) || e) }, 502);
  }
```
- [ ] **Step 2: freeform Publish 掃圖**。在 Publish handler,`fetch("/api/publish"...)` 之前組 payload:
```js
    const images = [];
    const c = JSON.parse(JSON.stringify(state.content));   // clone; rewrite paths on the clone
    (c.items || []).forEach((it, i) => {
      if (it.image && String(it.image).startsWith("data:")) {
        const m = /^data:(image\/([a-z0-9.+-]+));base64,(.*)$/i.exec(it.image);
        if (m) {
          const ext = m[2] === "jpeg" ? "jpg" : m[2];
          const name = "upload-" + (it.id || ("item-" + i)) + "-" + m[3].length + "." + ext;
          images.push({ path: "public/assets/" + name, base64: m[3] });
          it.image = "/assets/" + name;
        }
      }
    });
    const r = await fetch("/api/publish", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ content: c, images }) });
```
  (原本 body 是 `{ content: state.content }`,改成上面這段:用 clone `c`、把 data URL 圖改成乾淨路徑並收進 images 一起送。)
- [ ] **Step 3: build 綠** — `npm run build`
- [ ] **Step 4: Commit** — `git add functions/api/publish.js src/studio/freeform.js` → `git commit -m "feat: publish uploads replaced images as real assets"`

**部署待辦(Stan):** 無新密鑰;沿用既有 `GITHUB_TOKEN`(需 Contents:write,已有)。實測:編輯器換一張圖 → Publish → GitHub 應多一個 `public/assets/upload-*.<ext>` commit,content.json 的 image 指向乾淨路徑。

---

# Phase C — 連結編輯(inline)

## Task C1: theme edit 模式綁定連結 label/href

**Files:** Modify `src/render/themes/minimal.js`, `src/render/themes/featherweight.js`

**Interfaces:** edit 模式下,每個作品的每條連結輸出可編的 label(`data-bind="items.{ci}.links.{li}.label"`)與 href(`data-bind="items.{ci}.links.{li}.href"`),外加一個「+ link」與每條的「✕」的 hook(用 class 標記,freeform 綁事件)。非 edit 模式維持原樣。

- [ ] **Step 1: minimal `itemLinks` 改支援 edit**。`itemLinks(links)` 改成 `itemLinks(links, ci, edit)`;呼叫端 `itemRow` 內 `${itemLinks(it.links)}` → `${itemLinks(it.links, ci, edit)}`。edit 模式渲染:
```js
function itemLinks(links, ci, edit) {
  if (edit) {
    const rows = (links || []).map((l, li) =>
      `<span class="ff-link" data-link="${ci}.${li}">` +
      `<a${bindAttr("items." + ci + ".links." + li + ".label", edit)}>${esc(l.label || "link")}</a>` +
      ` <code${bindAttr("items." + ci + ".links." + li + ".href", edit)}>${esc(l.href || "")}</code>` +
      ` <button type="button" class="ff-link-del" data-link="${ci}.${li}">×</button></span>`
    ).join("");
    return `<div class="links ff-links" data-item="${ci}">${rows}` +
      `<button type="button" class="ff-link-add" data-item="${ci}">+ link</button></div>`;
  }
  const ls = realLinks(links);
  if (!ls.length) return `<div class="links"><span class="nolink">No public link yet</span></div>`;
  return `<div class="links">${ls.map((l) => `<a href="${esc(l.href)}" target="_blank" rel="noopener">${esc(l.label)}</a>`).join("")}</div>`;
}
```
- [ ] **Step 2: featherweight 連結 edit 模式**。featherweight 的 `foot` 內 links 區塊比照:edit 模式輸出每條 `<a data-bind=...label><code data-bind=...href>` + `.ff-link-del` + `.ff-link-add`(路徑同上 `items.{ci}.links.{li}.*`)。非 edit 維持原本 realLinks 渲染。
- [ ] **Step 3: build + 斷言**。`npm run build`;`node -e` 或臨時測:`renderSite(content,"minimal",{edit:true})` 含 `data-bind="items.0.links.0.label"` 與 `class="ff-link-add"`;非 edit 不含 `ff-link-add`。
- [ ] **Step 4: Commit** — `git add src/render/themes/minimal.js src/render/themes/featherweight.js` → `git commit -m "feat: themes bind link label/href in edit mode"`

## Task C2: freeform 連結加/刪 + 綁定

**Files:** Modify `src/studio/freeform.js`

**Interfaces:** `bindEditable` 已能綁 `data-bind` 的 label/href(純文字)。額外:委派點擊 `.ff-link-add`(push 空連結到 `items.{ci}.links`)、`.ff-link-del`(splice 掉 `{ci}.{li}`),之後 `commitNow()` + `render()`。

- [ ] **Step 1: 連結事件委派**。在 `wireEvents()` 加(用事件委派,免每次 render 重綁):
```js
  document.addEventListener("click", (e) => {
    if (!editing) return;
    const add = e.target.closest && e.target.closest(".ff-link-add");
    if (add) {
      e.preventDefault();
      const ci = +add.getAttribute("data-item");
      const it = state.content.items[ci];
      it.links = it.links || [];
      it.links.push({ label: "New link", href: "https://" });
      commitNow(); render("Added link");
      return;
    }
    const del = e.target.closest && e.target.closest(".ff-link-del");
    if (del) {
      e.preventDefault();
      const parts = del.getAttribute("data-link").split(".");
      const ci = +parts[0], li = +parts[1];
      state.content.items[ci].links.splice(li, 1);
      commitNow(); render("Removed link");
      return;
    }
  }, true);
```
  註:此 handler 要在既有的「edit 模式攔截 `<a>` 導覽」handler **之前**判斷,或共用一個 click handler；`.ff-link-del`/`.ff-link-add` 是 `<button>` 不是 `<a>`,不受連結攔截影響,但 label 是 `<a>`——確保點 label 的 `<a>` 仍走 contentEditable(preventDefault 導覽即可,不要誤觸 add/del)。
- [ ] **Step 2: `.ff-link` 樣式(可選,注入 chrome 樣式)**。在 `injectStyle` 的 `s.textContent` 內補:
```css
    .ff-links{display:flex;flex-wrap:wrap;gap:8px;align-items:center}
    .ff-links .ff-link{display:inline-flex;align-items:center;gap:6px;border:1px dashed #d8d0c4;border-radius:8px;padding:2px 6px}
    .ff-links code{font-size:11px;color:#8b877f}
    .ff-links .ff-link-del,.ff-links .ff-link-add{all:unset;cursor:pointer;color:#c2522d;font-size:12px;padding:0 4px}
```
- [ ] **Step 3: build 綠 + preview 實跑**。`npm run build && npm run preview` → 編輯某作品 → 「+ link」新增一條 → 改 label/href → Undo 能回復 → ✕ 刪掉。
- [ ] **Step 4: Commit** — `git add src/studio/freeform.js` → `git commit -m "feat: add/edit/delete project links in the editor"`

---

## 完工驗證

- [ ] `npx vitest run`(history + github-tree + 既有全綠)。
- [ ] `npm run build` 綠;`npm run build && npm run preview` 走一輪:改字→Undo/Redo 逐步、換圖→Publish(本機無 functions,靠部署驗真上傳)、加/改/刪連結。
- [ ] 部署後:換圖 Publish → GitHub 出現 `public/assets/upload-*`,content.json image 為乾淨路徑;站上圖片正常。

## Self-Review

**Spec coverage:** undo/redo 全歷史 → A1+A2;圖片上傳 → B1+B2;連結編輯 → C1+C2。
**Placeholder scan:** 純模組(history/commitTree)給完整 test+impl;theme/freeform 給確切 old→new 與路徑。無 TBD。
**Type consistency:** `makeHistory` API 在 A1 定義、A2 消費一致;`commitTree({files:[{path,content,encoding}]})` 在 B1 定義、B2 消費一致;連結 data-bind 路徑 `items.{ci}.links.{li}.{label|href}` 在 C1 產、C2 的 add/del 以 `data-item`/`data-link` 索引一致。
**協作備註:** C1 動 theme edit markup,務必只加不減 data-bind/data-edit(與並行的版面線相容)。
**已知後續(不阻塞):** 圖片上傳未做舊資產清理(換圖會留舊檔在 assets,不影響顯示);連結 href 用 `<code>` 顯示可編,未做 URL 格式驗證。
