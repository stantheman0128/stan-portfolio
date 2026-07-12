// Freeform on-page editor. The rendered site IS the editor: click text to type,
// hover an item to delete/duplicate it, double-click images to replace them.
// Edits write back into the content OBJECT (content.json), so both themes stay in
// sync. Autosaved to localStorage; Export downloads content.json and Publish (M5)
// will commit it for one-click deploy — no manual export needed.
import { renderSite, THEMES_META } from "../render/renderSite.js";
import { getPath, setPath, md } from "../render/util.js";
import { makeHistory } from "./history.js";

const CONTENT_KEY = "freeform-content-v1";

// Unlock key for the publish gate, localStorage first (survives a browser restart so
// this device keeps publishing) then sessionStorage. Same source and precedence as
// creator-entry.js. Persisting a secret in localStorage is XSS-readable; accepted
// because the site loads no third-party script and the key only edits this own site.
function readEditKey() {
  try { const lk = localStorage.getItem("edit-key"); if (lk) return lk; } catch (e) {}
  try { return sessionStorage.getItem("edit-key") || ""; } catch (e) {}
  return "";
}
const state = { content: null, theme: ((typeof document !== "undefined" && document.documentElement.getAttribute("data-theme")) || "featherweight") };
let editing = true;
let history = null;      // makeHistory, initialised on boot
let commitTimer = null;

// Immutable array move: return a copy of arr with the element at `from` relocated to
// final index `to`. Out-of-range or no-op inputs return an unchanged copy. Pure, so
// the Order panel's reorder maths can be unit-tested without a DOM.
export function moveInArray(arr, from, to) {
  const a = arr.slice();
  if (from < 0 || from >= a.length || to < 0 || to >= a.length || from === to) return a;
  const [x] = a.splice(from, 1);
  a.splice(to, 0, x);
  return a;
}

// Blank item for the panel's "+ Add project". Pure so the shape (and the id derived
// from the caller's timestamp) can be unit-tested; the caller passes Date.now() at
// click time — never read the clock at module scope (this file runs in the browser).
export function newItemTemplate(now) {
  return { id: "new-" + Number(now).toString(36), title: "New project", status: "",
    year: "", description: "", detail: "", image: "", imageMode: "", links: [] };
}

// Given a source index and a "before/after row i" insertion slot, the final index
// moveInArray should land the dragged item at. Exported so the drop maths is covered
// without a DOM. `len` is the item count before removal.
export function dropTargetIndex(from, i, after, len) {
  const insertPos = after ? i + 1 : i;
  const to = from < insertPos ? insertPos - 1 : insertPos;
  return Math.max(0, Math.min(len - 1, to));
}

// ---------- boot ----------
async function mountEditor() {
  const draft = localStorage.getItem(CONTENT_KEY);
  if (draft) {
    try { state.content = JSON.parse(draft); } catch { state.content = null; }
  }
  if (state.content) {
    // A saved draft can predate the live site: every deploy bakes a fresh
    // _build stamp into /data/content.json, so a smaller stamp means edits
    // were published (or shipped in code) after this draft was taken.
    // Editing a stale draft silently reverts those newer changes on Publish,
    // so ask before continuing with it.
    try {
      const live = await (await fetch("/data/content.json")).json();
      const stale = live._build && state.content._build && +live._build > +state.content._build;
      if (stale && confirm(
        "Your local draft is OLDER than the published site.\n\n" +
        "OK: discard the draft and load the live version (recommended)\n" +
        "Cancel: keep editing the old draft"
      )) {
        state.content = live;
        localStorage.removeItem(CONTENT_KEY);
      }
    } catch (e) { /* offline or fetch hiccup: keep the draft */ }
  } else {
    state.content = await (await fetch("/data/content.json")).json();
  }
  history = makeHistory(snapshot());
  render("Editing " + state.theme);
}

// Re-render the whole page from the in-memory content in edit mode, remount the
// editor chrome, and rebind editable fields. Called on boot, theme switch, and
// every structural (add/delete) op.
function render(msg) {
  swapDocument(renderSite(state.content, state.theme, { edit: true }));
  mountChrome(msg || "Editing");
  bindEditable();
  scheduleSave();
}

function swapDocument(html) {
  const doc = new DOMParser().parseFromString(html, "text/html");
  document.replaceChild(document.importNode(doc.documentElement, true), document.documentElement);
  // DOMParser marks <script> inert; recreate them. In edit mode themes ship no fx,
  // but featherweight's tiny speed timer is harmless.
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

function snapshot() { return JSON.stringify(state.content); }
function commitNow() { clearTimeout(commitTimer); if (history) history.commit(snapshot()); refreshUndoRedo(); }
function scheduleCommit() { clearTimeout(commitTimer); commitTimer = setTimeout(commitNow, 500); }
function refreshUndoRedo() {
  const bar = document.getElementById("ffbar");
  if (bar && bar._undoBtn) bar._undoBtn.disabled = !(history && history.canUndo());
  if (bar && bar._redoBtn) bar._redoBtn.disabled = !(history && history.canRedo());
}

// ---------- field binding: the rendered [data-bind] nodes write back to content ----------
function bindEditable() {
  document.querySelectorAll("[data-bind]").forEach((el) => {
    const path = el.getAttribute("data-bind");
    const kind = el.getAttribute("data-edit");
    if (kind === "md") return bindMd(el, path);
    if (kind === "image") return bindImage(el, path);
    el.setAttribute("contenteditable", "true");
    el.addEventListener("input", () => {
      setPath(state.content, path, el.textContent);
      scheduleSave();
      scheduleCommit();
    });
  });
}

// Markdown detail: click opens a floating textarea over the element to edit the RAW
// markdown (read from state.content, not the rendered HTML); live re-renders via md().
function bindMd(el, path) {
  el.style.cursor = "text";
  el.title = "Click to edit (markdown)";
  el.addEventListener("click", (e) => {
    if (!editing) return;
    e.preventDefault();
    if (document.querySelector("[data-ff-md]")) return; // one overlay at a time
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
      scheduleCommit();
    });
    ta.addEventListener("blur", () => ta.remove());
  });
}

// Double-click an image to replace it: store a data URL for preview and keep the
// File on the item for the real upload at publish time (M5).
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
        const m = /^items\.(\d+)\.image$/.exec(path);
        if (m) state.content.items[+m[1]]._imageFile = f; // consumed by publish upload
        scheduleSave();
        commitNow();
      };
      rd.readAsDataURL(f);
    });
    pick.click();
  });
}

// ---------- chrome (toolbar + hover controls), all tagged data-ff-chrome ----------
let statusEl, hoverBox, hoverBtns, hoverTarget = null;
let eventsWired = false;
// Order panel open/close survives render() (which rebuilds the whole document) via
// this module-level flag; mountChrome re-materialises the panel when it's true.
let orderPanelOpen = false;
// After a structural op (reorder / add) the panel rebuilds; this is the row index to
// flash on rebuild as a "here it landed" cue. -1 = nothing to flash. One-shot: read
// and reset inside buildOrderPanel.
let flashIndex = -1;
// Retarget debounce: switching hoverTarget to a *different* card waits this long so a
// diagonal move toward the floating buttons that clips a neighbour card doesn't yank
// the controls away mid-reach.
let pendingTarget = null, retargetTimer = null;
const RETARGET_MS = 150;

function mountChrome(initialStatus) {
  injectStyle();
  buildToolbar(initialStatus);
  buildHoverControls();
  if (orderPanelOpen) buildOrderPanel();
  setEditing(true);
  if (!eventsWired) { wireEvents(); eventsWired = true; }
}

function injectStyle() {
  const s = document.createElement("style");
  s.setAttribute("data-ff-chrome", "");
  s.textContent = `
    #ffbar { position: fixed; top: 12px; right: 12px; z-index: 99999; display: flex; gap: 6px;
      flex-direction: column; align-items: stretch; width: 190px; max-height: calc(100vh - 24px); overflow: auto;
      background: #ffffff; color: #1b1b1f; border: 1px solid #dcdce0; border-radius: 12px;
      padding: 10px; box-shadow: 0 8px 28px rgba(20,20,30,.14);
      font: 13px/1.4 ui-sans-serif, system-ui, "Segoe UI", sans-serif; }
    #ffbar .ttl { font-weight: 700; font-size: 12.5px; letter-spacing: .02em; margin-right: 2px; }
    #ffbar .st { color: #71717a; font-size: 12px; min-width: 74px; text-align: right; }
    #ffbar button, #ffbar select { background: #f4f4f6; color: #1b1b1f; border: 1px solid #dcdce0;
      border-radius: 8px; padding: 6px 10px; font: inherit; font-size: 12.5px; cursor: pointer; width: 100%; box-sizing: border-box; }
    #ffbar button:hover, #ffbar select:hover { border-color: #b9b9c2; background: #ececf0; }
    #ffbar button.primary { background: #1b1b1f; border-color: #1b1b1f; color: #fff; }
    #ffbar button.primary:hover { background: #333338; }
    #ffbar button:disabled { opacity: .45; cursor: default; }
    #ffhover { position: absolute; z-index: 99997; pointer-events: none; border: 1.5px dashed #7c3aed;
      border-radius: 6px; display: none; }
    #ffbtns { position: absolute; z-index: 99998; display: none; gap: 4px; }
    #ffbtns button { border: 1px solid #dcdce0; background: #fff; color: #1b1b1f; border-radius: 7px;
      width: 26px; height: 24px; font-size: 12px; line-height: 1; cursor: pointer;
      box-shadow: 0 3px 10px rgba(20,20,30,.18); }
    #ffbtns button:hover { background: #f4f4f6; }
    #ffbtns .del:hover { color: #dc2626; border-color: #dc2626; }
    #fforder { position: fixed; top: 12px; right: 212px; z-index: 99990; width: 244px;
      max-height: calc(100vh - 24px); overflow: auto; background: #ffffff; color: #1b1b1f;
      border: 1px solid #e3e3e6; border-radius: 12px; padding: 10px;
      box-shadow: 0 8px 28px rgba(20,20,30,.14);
      font: 13px/1.4 ui-sans-serif, system-ui, "Segoe UI", sans-serif; }
    #fforder .oh { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
    #fforder .oh .ttl { font-weight: 700; font-size: 12.5px; letter-spacing: .02em; }
    #fforder .oh .x { all: unset; cursor: pointer; color: #71717a; font-size: 15px; line-height: 1; padding: 0 4px; }
    #fforder .oh .x:hover { color: #1b1b1f; }
    #fforder .row { display: flex; align-items: center; gap: 6px; padding: 6px 7px; margin: 4px 0;
      border: 1px solid #e3e3e6; border-radius: 8px; background: #fafafb; cursor: grab; }
    #fforder .row:hover { border-color: #b9b9c2; background: #f4f4f6; }
    #fforder .row.dragging { opacity: .4; cursor: grabbing; }
    /* Insertion slot: a purple edge line marks the landing side; the slot itself
       (a 6px translate that opens a gap) is layered on under prefers-reduced-motion:
       no-preference below, so reduced-motion users still get the static line. */
    #fforder .row.drop-before { box-shadow: inset 0 3px 0 -1px #7c3aed; }
    #fforder .row.drop-after { box-shadow: inset 0 -3px 0 -1px #7c3aed; }
    #fforder .row .handle { color: #b6b3ad; font-size: 13px; line-height: 1; width: 13px;
      text-align: center; cursor: grab; user-select: none; flex: none; }
    #fforder .row.dragging .handle { cursor: grabbing; }
    #fforder .row .num { color: #8b877f; font-size: 11px; min-width: 16px; text-align: right; }
    #fforder .row .nm { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; cursor: pointer; }
    #fforder .row .mv { all: unset; cursor: pointer; color: #71717a; font-size: 12px; width: 17px; height: 17px;
      text-align: center; border-radius: 4px; }
    #fforder .row .mv:hover { background: #e3e3e6; color: #1b1b1f; }
    #fforder .row .mv:disabled { opacity: .3; cursor: default; }
    #fforder .row .del { all: unset; cursor: pointer; color: #a8a29a; font-size: 12px; width: 17px; height: 17px;
      text-align: center; border-radius: 4px; flex: none; }
    #fforder .row .del:hover { background: #fbe4e4; color: #dc2626; }
    #fforder .empty { color: #71717a; font-size: 12px; padding: 6px; }
    #fforder .add { margin-top: 8px; color: #4b4b52; }
    #fforder .add:hover { border-color: #b9b9c2; }
    @media (prefers-reduced-motion: no-preference) {
      #fforder .row { transition: transform 150ms ease, background 150ms ease, border-color 150ms ease; }
      #fforder .row.drop-before { transform: translateY(6px); }
      #fforder .row.drop-after { transform: translateY(-6px); }
      @keyframes ffFlash { from { background: #ede9fe; } to { background: #fafafb; } }
      #fforder .row.flash { animation: ffFlash 240ms ease; }
    }
    body.ff-editing { caret-color: #7c3aed; }
    body.ff-editing [data-bind] { outline: 1px dotted rgba(124,58,237,.35); outline-offset: 2px; }
    body.ff-editing :is(a) { cursor: text; }
    /* Cleared fields stay clickable in edit mode (visitors never see them);
       label them so an empty box does not read as a rendering bug. */
    body.ff-editing [data-bind]:empty::before { content: "(empty — hidden from visitors)";
      color: #b6b3ad; font-size: 12px; font-style: italic; letter-spacing: 0; }
    .ff-links { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
    .ff-links .ff-link { display: inline-flex; align-items: center; gap: 6px;
      border: 1px dashed #d8d0c4; border-radius: 8px; padding: 2px 6px; }
    .ff-links a::after { content: none !important; }
    .ff-links code { font-size: 11px; color: #8b877f; }
    .ff-links .ff-link-del, .ff-links .ff-link-add { all: unset; cursor: pointer;
      color: #c2522d; font-size: 12px; padding: 0 4px; }
  `;
  document.head.appendChild(s);
}

function buildToolbar(initialStatus) {
  const bar = document.createElement("div");
  bar.id = "ffbar";
  bar.setAttribute("data-ff-chrome", "");
  bar.setAttribute("contenteditable", "false");

  const ttl = document.createElement("span");
  ttl.className = "ttl";
  ttl.textContent = "✏️ Edit";
  bar.appendChild(ttl);

  // Theme switch — same content, other skin. This IS the two-versions-in-sync proof.
  const sel = document.createElement("select");
  THEMES_META.forEach((t) => {
    const o = document.createElement("option");
    o.value = t.key; o.textContent = t.label;
    if (t.key === state.theme) o.selected = true;
    sel.appendChild(o);
  });
  sel.addEventListener("change", () => { state.theme = sel.value; render("Editing " + sel.value); });
  bar.appendChild(sel);

  const mkBtn = (label, title, on, cls) => {
    const b = document.createElement("button");
    b.textContent = label; b.title = title;
    if (cls) b.className = cls;
    b.addEventListener("click", on);
    bar.appendChild(b);
    return b;
  };

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
  undoBtn.disabled = !(history && history.canUndo());
  redoBtn.disabled = !(history && history.canRedo());

  mkBtn("↕ Order", "Open the reorder panel (drag items or use ↑↓)", () => {
    orderPanelOpen = !orderPanelOpen;
    if (orderPanelOpen) buildOrderPanel(); else removeOrderPanel();
  });

  const toggle = mkBtn("👁 Preview", "Toggle editing off to click around as a visitor", () => {
    setEditing(!editing);
    toggle.textContent = editing ? "👁 Preview" : "✏️ Edit";
  });

  mkBtn("Export", "Download content.json (offline backup / manual publish)", () => {
    const blob = new Blob([JSON.stringify(state.content, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "content.json";
    document.body.appendChild(a); a.click(); a.remove();
    setStatus("Exported content.json ✓");
  });

  mkBtn("Reset", "Discard local edits, reload the published content", async () => {
    if (!confirm("Discard ALL local edits and reload the published content.json?")) return;
    localStorage.removeItem(CONTENT_KEY);
    state.content = await (await fetch("/data/content.json")).json();
    history = makeHistory(snapshot());
    render("Reset to published");
  });

  mkBtn("Publish", "Publish live (commits content.json from your IP)", async () => {
    setStatus("Publishing…");
    try {
      // Any image swapped in as a data: URL becomes a real file under public/assets/.
      // Rewrite the path on a clone so the committed content.json points at the clean
      // URL; ship the raw base64 alongside for the endpoint to commit atomically.
      const images = [];
      const c = JSON.parse(JSON.stringify(state.content));
      delete c._build; // deploy stamp from /data/content.json, not source data
      (c.items || []).forEach((it, i) => {
        delete it._imageFile; // editor-only scratch state, never publish it
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
      const r = await fetch("/api/publish", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ content: c, images, k: readEditKey() }),
      });
      const d = await r.json().catch(() => ({}));
      if (r.ok && d.ok) {
        setStatus("Published ✓");
        alert("Published. Cloudflare rebuilds and deploys in about a minute.\nCommit " + String(d.commit || "").slice(0, 7));
      } else {
        setStatus("Publish failed");
        alert("Publish failed: " + (d.error || ("HTTP " + r.status)) + "\n\n(Publish only works on the deployed site, from your creator IP.)");
      }
    } catch (e) {
      setStatus("Publish failed");
      alert("Publish failed: " + e.message + "\n\n(Publish only works on the deployed site.)");
    }
  }, "primary");

  mkBtn("Exit", "Leave editing (keep owner tools)", function () {
    try {
      var k = sessionStorage.getItem("edit-key") || "";
      var u = location.pathname;
      if (k) u += "?unlock=" + encodeURIComponent(k);
      location.href = u + location.hash;
    } catch (e) {
      location.reload();
    }
  });

  statusEl = document.createElement("span");
  statusEl.className = "st";
  statusEl.textContent = initialStatus;
  bar.appendChild(statusEl);

  document.body.appendChild(bar);
}

function buildHoverControls() {
  hoverBox = document.createElement("div");
  hoverBox.id = "ffhover";
  hoverBox.setAttribute("data-ff-chrome", "");
  hoverBtns = document.createElement("div");
  hoverBtns.id = "ffbtns";
  hoverBtns.setAttribute("data-ff-chrome", "");
  hoverBtns.setAttribute("contenteditable", "false");

  const del = document.createElement("button");
  del.className = "del"; del.textContent = "✕"; del.title = "Delete this item";
  del.addEventListener("mousedown", (e) => {
    e.preventDefault(); e.stopPropagation();
    const idx = itemIndexOf(hoverTarget);
    if (idx < 0) { hideHover(); return; } // only items are structurally editable
    state.content.items.splice(idx, 1);
    commitNow();
    hideHover();
    render("Deleted item");
  });

  const dup = document.createElement("button");
  dup.textContent = "⧉"; dup.title = "Duplicate this item (then edit the copy — that's how you add)";
  dup.addEventListener("mousedown", (e) => {
    e.preventDefault(); e.stopPropagation();
    const idx = itemIndexOf(hoverTarget);
    if (idx < 0) return;
    const copy = JSON.parse(JSON.stringify(state.content.items[idx]));
    state.content.items.splice(idx + 1, 0, copy);
    commitNow();
    render("Duplicated item");
  });

  const moveItem = (delta, msg) => (e) => {
    e.preventDefault(); e.stopPropagation();
    const idx = itemIndexOf(hoverTarget);
    const to = idx + delta;
    if (idx < 0 || to < 0 || to >= state.content.items.length) return;
    const [moved] = state.content.items.splice(idx, 1);
    state.content.items.splice(to, 0, moved);
    commitNow();
    hideHover();
    render(msg);
  };
  const up = document.createElement("button");
  up.textContent = "↑"; up.title = "Move this item up";
  up.addEventListener("mousedown", moveItem(-1, "Moved item up"));
  const down = document.createElement("button");
  down.textContent = "↓"; down.title = "Move this item down";
  down.addEventListener("mousedown", moveItem(1, "Moved item down"));

  hoverBtns.append(up, down, del, dup);
  document.body.append(hoverBox, hoverBtns);
}

// ---------- order panel: drag / ↑↓ reorder of state.content.items ----------
function removeOrderPanel() {
  const p = document.getElementById("fforder");
  if (p) p.remove();
}

// Reorder items to `to` (final index), commit, re-render (which rebuilds this panel).
function applyReorder(from, to) {
  const items = state.content.items || [];
  to = Math.max(0, Math.min(items.length - 1, to));
  if (from === to) return;
  state.content.items = moveInArray(items, from, to);
  flashIndex = to;
  commitNow();
  render("Reordered items");
}

// Smooth-scroll the card owning items.N.* into view. Resolve via the same data-bind
// selector the hover targeting uses, then climb to the whole .item card.
function scrollToItem(i) {
  const bound = document.querySelector('[data-bind^="items.' + i + '."]');
  const card = (bound && bound.closest && bound.closest(".item")) || bound;
  if (card && card.scrollIntoView) card.scrollIntoView({ behavior: "smooth", block: "center" });
}

// Rebuild the panel from scratch. Called on open and after every render() while open,
// so it always mirrors the live items order. `data-ff-chrome` keeps it out of the
// editable surface and out of hover retargeting.
function buildOrderPanel() {
  removeOrderPanel();
  const items = state.content.items || [];
  const panel = document.createElement("div");
  panel.id = "fforder";
  panel.setAttribute("data-ff-chrome", "");
  panel.setAttribute("contenteditable", "false");

  const head = document.createElement("div");
  head.className = "oh";
  const ttl = document.createElement("span");
  ttl.className = "ttl"; ttl.textContent = "↕ Order items";
  const x = document.createElement("button");
  x.className = "x"; x.textContent = "✕"; x.title = "Close";
  x.addEventListener("click", () => { orderPanelOpen = false; removeOrderPanel(); });
  head.append(ttl, x);
  panel.appendChild(head);

  // Shared across this panel's rows for the duration of one drag gesture.
  let dragFrom = -1;
  const clearMarks = () => panel.querySelectorAll(".row").forEach((r) => r.classList.remove("drop-before", "drop-after"));

  // Resolve the pointer's Y to an insertion slot. Works over rows, the gaps between
  // them, and the panel's background/padding — so every pixel of the panel is a valid
  // drop and the cursor never shows the "no-drop" 🚫. Measures with marks cleared so a
  // marked row's 6px transform can't shift the geometry we read (self-stabilising).
  const slotFromEvent = (e) => {
    clearMarks();
    const rows = [...panel.querySelectorAll(".row")];
    if (!rows.length) return null;
    for (let k = 0; k < rows.length; k++) {
      const r = rows[k].getBoundingClientRect();
      if (e.clientY < r.top + r.height / 2) return { i: k, after: false, row: rows[k] };
      if (e.clientY <= r.bottom) return { i: k, after: true, row: rows[k] };
    }
    return { i: rows.length - 1, after: true, row: rows[rows.length - 1] };
  };

  if (!items.length) {
    const e = document.createElement("div");
    e.className = "empty"; e.textContent = "No items yet.";
    panel.appendChild(e);
  }

  items.forEach((it, i) => {
    const row = document.createElement("div");
    row.className = "row";
    row.draggable = true;
    row.dataset.oi = String(i);
    if (i === flashIndex) row.classList.add("flash");

    const handle = document.createElement("span");
    handle.className = "handle"; handle.textContent = "⠿"; handle.title = "Drag to reorder";

    const num = document.createElement("span");
    num.className = "num"; num.textContent = String(i + 1);

    const nm = document.createElement("span");
    nm.className = "nm";
    const title = (it && it.title != null ? String(it.title) : "") || "(untitled)";
    nm.textContent = title.length > 28 ? title.slice(0, 27) + "…" : title;
    nm.title = "Jump to this card";
    nm.addEventListener("click", () => scrollToItem(i));

    const up = document.createElement("button");
    up.className = "mv"; up.textContent = "↑"; up.title = "Move up"; up.disabled = i === 0;
    up.addEventListener("click", () => applyReorder(i, i - 1));
    const down = document.createElement("button");
    down.className = "mv"; down.textContent = "↓"; down.title = "Move down"; down.disabled = i === items.length - 1;
    down.addEventListener("click", () => applyReorder(i, i + 1));

    const del = document.createElement("button");
    del.className = "del"; del.textContent = "✕"; del.title = "Delete this project (undo with Ctrl+Z)";
    del.addEventListener("click", () => {
      state.content.items.splice(i, 1);
      commitNow();
      render("Deleted item");
    });

    // dragstart/dragend stay on the row (they carry the source index); dragover/drop
    // are delegated to the panel below so the whole panel accepts the drop.
    row.addEventListener("dragstart", (e) => {
      dragFrom = i;
      row.classList.add("dragging");
      if (e.dataTransfer) { e.dataTransfer.effectAllowed = "move"; try { e.dataTransfer.setData("text/plain", String(i)); } catch (_) {} }
    });
    row.addEventListener("dragend", () => { row.classList.remove("dragging"); clearMarks(); dragFrom = -1; });

    row.append(handle, num, nm, up, down, del);
    panel.appendChild(row);
  });

  // Delegated drop target: the entire panel. preventDefault on dragover is what tells
  // the browser this is a valid drop zone (its absence is the classic 🚫 cursor bug).
  panel.addEventListener("dragover", (e) => {
    if (dragFrom < 0) return;
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = "move";
    const slot = slotFromEvent(e);
    if (slot) slot.row.classList.add(slot.after ? "drop-after" : "drop-before");
  });
  panel.addEventListener("drop", (e) => {
    if (dragFrom < 0) return;
    e.preventDefault();
    const slot = slotFromEvent(e);
    clearMarks();
    if (slot) applyReorder(dragFrom, dropTargetIndex(dragFrom, slot.i, slot.after, items.length));
  });

  const add = document.createElement("button");
  add.className = "add"; add.textContent = "+ Add project";
  add.title = "Add a blank project card at the end";
  add.addEventListener("click", () => {
    state.content.items = state.content.items || [];
    state.content.items.push(newItemTemplate(Date.now()));
    flashIndex = state.content.items.length - 1;
    commitNow();
    render("Added project");
    scrollToItem(state.content.items.length - 1);
  });
  panel.appendChild(add);

  document.body.appendChild(panel);
  flashIndex = -1;
}

// The content.items index owning a node = the numeric prefix of the nearest
// items.N.* data-bind, searched on self/ancestors first, then descendants (so
// hovering the whole card also resolves the item).
function itemIndexOf(node) {
  if (!node) return -1;
  let bound = node.closest && node.closest('[data-bind^="items."]');
  if (!bound && node.querySelector) bound = node.querySelector('[data-bind^="items."]');
  if (!bound) return -1;
  const m = /^items\.(\d+)\./.exec(bound.getAttribute("data-bind"));
  return m ? +m[1] : -1;
}

function setStatus(t) { if (statusEl) statusEl.textContent = t; }

// Editing on/off toggles contentEditable on the text fields (md/image use their own
// click/dblclick) and whether hover controls appear.
function setEditing(on) {
  editing = on;
  document.body.classList.toggle("ff-editing", on);
  document.querySelectorAll("[data-bind]").forEach((el) => {
    const kind = el.getAttribute("data-edit");
    if (kind === "md" || kind === "image") return;
    el.setAttribute("contenteditable", on ? "true" : "false");
  });
  if (!on) hideHover();
}

// ---------- hover targeting ----------
function clearRetarget() { clearTimeout(retargetTimer); retargetTimer = null; pendingTarget = null; }

function hideHover() {
  clearRetarget();
  hoverTarget = null;
  if (hoverBox) hoverBox.style.display = "none";
  if (hoverBtns) hoverBtns.style.display = "none";
}

// Draw the outline + floating buttons over a resolved target.
function showHoverFor(t) {
  hoverTarget = t;
  const r = t.getBoundingClientRect();
  const x = r.left + scrollX, y = r.top + scrollY;
  hoverBox.style.cssText += `;display:block;left:${x - 3}px;top:${y - 3}px;width:${r.width + 6}px;height:${r.height + 6}px`;
  // Only items get delete/duplicate/move controls. Park them at the card's INNER
  // top-right corner so the pointer never has to leave the card to reach them.
  if (itemIndexOf(t) >= 0) {
    hoverBtns.style.cssText += ";display:flex;left:-9999px;top:-9999px";
    const bw = hoverBtns.offsetWidth || 116;
    hoverBtns.style.left = `${Math.max(4, x + r.width - bw - 8)}px`;
    hoverBtns.style.top = `${y + 8}px`;
  } else {
    hoverBtns.style.display = "none";
  }
}

function onMove(e) {
  if (!editing) return;
  const t = e.target;
  if (!t) return;
  // Inside our own chrome (toolbar, hover buttons, order panel): leave the current
  // hover exactly where it is and cancel any pending switch, so a reach toward the
  // buttons can't retarget them out from under the cursor.
  if (t.closest && t.closest("[data-ff-chrome]")) { clearRetarget(); return; }
  if (t === document.body || t === document.documentElement) { hideHover(); return; }
  // Prefer the whole item card so ✕/⧉ act on the item, not just the hovered field.
  const item = t.closest && t.closest(".item");
  const cand = item || t;
  if (cand === hoverTarget) { clearRetarget(); return; } // already shown; nothing to do
  // First hover shows immediately; switching between cards is debounced.
  if (hoverTarget === null) { clearRetarget(); showHoverFor(cand); return; }
  if (pendingTarget === cand) return; // timer already counting down for this target
  clearTimeout(retargetTimer);
  pendingTarget = cand;
  retargetTimer = setTimeout(() => { retargetTimer = null; pendingTarget = null; showHoverFor(cand); }, RETARGET_MS);
}

function wireEvents() {
  document.addEventListener("mousemove", onMove, true);
  document.addEventListener("scroll", hideHover, true);

  // Ctrl+S → force save the content JSON now.
  document.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
      e.preventDefault();
      clearTimeout(saveTimer);
      localStorage.setItem(CONTENT_KEY, JSON.stringify(state.content));
      setStatus("Saved ✓");
    }
  });

  // Ctrl+Z undo / Ctrl+Shift+Z redo (content-level, unified for text + structural).
  document.addEventListener("keydown", (e) => {
    const z = (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z";
    if (!z) return;
    e.preventDefault();
    commitNow();
    const s = e.shiftKey ? (history && history.redo()) : (history && history.undo());
    if (s != null) { state.content = JSON.parse(s); render(e.shiftKey ? "Redo" : "Undo"); }
  });

  // Link add/delete, delegated on document so it survives every re-render.
  document.addEventListener("click", (e) => {
    if (!editing) return;
    const add = e.target.closest && e.target.closest(".ff-link-add");
    if (add) {
      e.preventDefault();
      const ci = +add.getAttribute("data-item");
      const it = state.content.items[ci];
      if (!it) return;
      it.links = it.links || [];
      it.links.push({ label: "New link", href: "https://" });
      commitNow();
      render("Added link");
      return;
    }
    const del = e.target.closest && e.target.closest(".ff-link-del");
    if (del) {
      e.preventDefault();
      const parts = del.getAttribute("data-link").split(".");
      const ci = +parts[0], li = +parts[1];
      const it = state.content.items[ci];
      if (!it || !it.links) return;
      it.links.splice(li, 1);
      commitNow();
      render("Removed link");
    }
  }, true);

  // In edit mode, plain clicks on links must not navigate away.
  document.addEventListener("click", (e) => {
    if (!editing) return;
    const a = e.target.closest && e.target.closest("a");
    if (a && !a.closest("[data-ff-chrome]")) e.preventDefault();
  }, true);
}

if (typeof document !== "undefined") mountEditor();
