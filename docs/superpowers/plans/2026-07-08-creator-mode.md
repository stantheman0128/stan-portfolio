# Creator 模式 + 評分定案 實作計畫 (Plan 2 of 4)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 加一個以 IP 白名單判定的 Creator 端點;把評分改成評過定案(移除 Change 重評鈕);Creator 在 minimal 頁不顯示評分條。

**Architecture:** 一個 Cloudflare Pages Function `/api/whoami` 比對 `cf-connecting-ip` 與加密 secret `CREATOR_IP`,回 `{creator}`。IP 比對抽成純函式單元測試。rate.js 移除重評入口,並在初始化前 fetch whoami、Creator 時移除評分條。fail-open:whoami 失敗一律當非 Creator(照常顯示評分)。

**Tech Stack:** Cloudflare Pages Functions、vanilla JS、Vitest。

## Global Constraints

- 只碰 System A(`content.json` → `renderSite.js` → `themes/*` + `functions/`)。
- 版本紀律:每個 task 一個 commit;`git add <指定路徑>`,不用 `git add -A`。
- 測試:純函式走 Vitest(`npm test`)。
- 溝通繁體中文,程式識別碼/檔名/API 英文。
- **紅線:`CREATOR_IP` 只存 Cloudflare Pages 的加密 secret,絕不寫進原始碼(repo 是 public,住家 IP 進去等於公開)。** whoami.js 只讀 `env.CREATOR_IP`。
- featherweight 保持零 JS(除測速),不加 whoami fetch;Creator 判定只作用在 minimal(client-render)。

---

## Task 3.1: `isCreatorIp` 純函式 + 測試

**Files:**
- Create: `functions/_lib/creator.js`
- Test: `tests/creator-ip.test.js`

**Interfaces:**
- Produces: `isCreatorIp(ip: string, allowed: string) => boolean`。`allowed` 是逗號分隔的 IP 清單;精確比對、去空白;任一為空 → false。

- [ ] Step 1: 寫失敗測試 `tests/creator-ip.test.js`
```js
import { describe, it, expect } from "vitest";
import { isCreatorIp } from "../functions/_lib/creator.js";

describe("isCreatorIp", () => {
  it("matches a single allowed ip", () => {
    expect(isCreatorIp("1.2.3.4", "1.2.3.4")).toBe(true);
  });
  it("matches within a comma list, ignoring spaces", () => {
    expect(isCreatorIp("1.2.3.4", "9.9.9.9, 1.2.3.4")).toBe(true);
  });
  it("rejects a non-listed ip", () => {
    expect(isCreatorIp("1.2.3.4", "9.9.9.9")).toBe(false);
  });
  it("is false when either side is empty", () => {
    expect(isCreatorIp("", "1.2.3.4")).toBe(false);
    expect(isCreatorIp("1.2.3.4", "")).toBe(false);
    expect(isCreatorIp("1.2.3.4", undefined)).toBe(false);
  });
});
```
- [ ] Step 2: 跑測試確認失敗
  Run: `npm test -- creator-ip`。預期 FAIL(未定義)。
- [ ] Step 3: 實作 `functions/_lib/creator.js`
```js
// Exact-match an inbound IP against a comma-separated allow-list.
// The list comes from the CREATOR_IP secret; never hard-code it here.
export function isCreatorIp(ip, allowed) {
  if (!ip || !allowed) return false;
  const want = String(ip).trim();
  return String(allowed)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .includes(want);
}
```
- [ ] Step 4: 跑測試確認通過
  Run: `npm test -- creator-ip`。預期 PASS。
- [ ] Step 5: Commit
  `git add functions/_lib/creator.js tests/creator-ip.test.js`
  `git commit -m "feat: isCreatorIp allow-list helper"`

## Task 3.2: `/api/whoami` 端點

**Files:**
- Create: `functions/api/whoami.js`

**Interfaces:**
- Consumes: `isCreatorIp`(Task 3.1)。
- Produces: GET `/api/whoami` → `{ creator: boolean }`,`cache-control: no-store`。

- [ ] Step 1: 實作 `functions/api/whoami.js`
```js
// Tells the client whether this request comes from the owner's IP, so the
// Minimal page can hide the rating strips (and, later, reveal the editor).
// CREATOR_IP is an encrypted Pages secret; it never appears in the repo.
import { isCreatorIp } from "../_lib/creator.js";

export async function onRequestGet({ request, env }) {
  const ip = request.headers.get("cf-connecting-ip") || "";
  const creator = isCreatorIp(ip, env.CREATOR_IP || "");
  return new Response(JSON.stringify({ creator }), {
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
}
```
- [ ] Step 2: `npm run build` 確認建置不受影響(functions 不進 vite bundle,但確認無 import 錯)。
- [ ] Step 3: Commit
  `git add functions/api/whoami.js`
  `git commit -m "feat: /api/whoami creator-ip endpoint"`

**部署待辦(Stan,牽涉密鑰):** 在 Cloudflare Pages 設加密環境變數 `CREATOR_IP`=你的 IP(可逗號多個)。換網路時更新它。

## Task 3.3: 評分改成評過定案(移除 Change 鈕)

**Files:**
- Modify: `src/render/fx/rate.js`(`rateStripHTML` 移除 `.rate-edit`;`rateJS` 移除 `editBtn`;`rateCSS` 移除 `.rate-edit` 樣式)

**Interfaces:**
- Produces: 評過的項目只顯示結果,不再有「Change」重評入口(server 端本來就一 voter 一項目一票,前端不給重評入口即可)。

- [ ] Step 1: `rateStripHTML` 移除這行(rate.js:50):
  `<button class="rate-edit" type="button">Change</button>`
- [ ] Step 2: `rateJS` 移除 `editBtn` 宣告與其 listener:
  刪 `var editBtn = box.querySelector(".rate-edit");`
  刪整段 `editBtn.addEventListener("click", function () { openEditor(window.QUEST.get().rated[id] || 0); });`
  (`openEditor` 保留;它仍被 dots 的初始渲染用不到後可留為死碼移除 — 若 `openEditor` 移除後無其他引用,一併刪。)
- [ ] Step 3: `rateCSS` 移除 `.rate-edit` 相關樣式(3 條 `.rate .rate-edit...`)。
- [ ] Step 4: `npm run build` + preview(或本地)開 minimal,確認評分條可投票、投票後顯示「You: N/10 + 平均」但無「Change」鈕。
- [ ] Step 5: Commit
  `git add src/render/fx/rate.js`
  `git commit -m "feat: ratings are final once cast (remove change button)"`

## Task 3.4: Creator 在 minimal 頁免評分

**Files:**
- Modify: `src/render/fx/rate.js`(`rateJS` 開頭包一層 whoami gate)

**Interfaces:**
- Consumes: `/api/whoami`(Task 3.2)。
- Produces: Creator(whoami.creator===true)時移除所有 `.rate` 條;否則照常初始化。fail-open:fetch 失敗當非 Creator。

- [ ] Step 1: 把現有 `rateJS` 的 IIFE 主體抽成 `initRatings()`,開頭改成:
```js
(function () {
  if (!window.QUEST) return;
  function initRatings() { /* ...existing body... */ }
  fetch("/api/whoami")
    .then(function (r) { return r.json(); })
    .then(function (d) {
      if (d && d.creator) {
        [].slice.call(document.querySelectorAll(".rate")).forEach(function (el) { el.remove(); });
      } else { initRatings(); }
    })
    .catch(initRatings);
})();
```
- [ ] Step 2: `npm run build` 確認建置成功。
- [ ] Step 3: 本地(vite dev 無 functions,whoami 404 → catch → initRatings)確認評分條照常顯示(非 Creator 行為)。Creator 行為靠部署後真 IP 驗。
- [ ] Step 4: Commit
  `git add src/render/fx/rate.js`
  `git commit -m "feat: creator ip hides rating strips on minimal"`

---

## Self-Review

**Spec coverage(對 M3):**
- Creator IP 白名單 → Task 3.1(比對)+ 3.2(端點)✓
- 評過定案 → Task 3.3 ✓
- Creator 免評分 → Task 3.4 ✓
- 露出編輯入口 → 延到 M4(featherweight 零 JS 取捨,編輯入口跟 edit.html 一起)。已在本 plan 開頭與 Global Constraints 註明。

**Placeholder scan:** 純函式(isCreatorIp)給完整 test+impl。whoami 端點與 rate.js 改動給明確步驟與確切移除目標行。無 TBD。

**Type consistency:** `isCreatorIp(ip, allowed)` 在 3.1 定義、3.2 消費一致;whoami 回傳 `{creator}` 在 3.2 定義、3.4 消費一致(`d.creator`)。

**已知後續(不阻塞):** Task 3.3 的 `openEditor`/`showResult` 在移除 editBtn 後,`openEditor` 可能只剩 dots 初始用途 — 實作時確認引用,無用則一併刪(DRY)。
