// Freeform on-page editor. The rendered site IS the editor: click text to type,
// hover an item to delete/duplicate it, double-click images to replace them.
// Edits write back into the content OBJECT (content.json), so both themes stay in
// sync. Autosaved to localStorage; Export downloads content.json and Publish (M5)
// will commit it for one-click deploy — no manual export needed.
import { renderSite, THEMES_META } from "../render/renderSite.js";
import { getPath, setPath, md } from "../render/util.js";
import { makeHistory } from "./history.js";

const CONTENT_KEY = "freeform-content-v1";
const state = { content: null, theme: (document.documentElement.getAttribute("data-theme") || "featherweight") };
let editing = true;
let history = null;      // makeHistory, initialised on boot
let commitTimer = null;

// ---------- boot ----------
async function mountEditor() {
  const draft = localStorage.getItem(CONTENT_KEY);
  if (draft) {
    try { state.content = JSON.parse(draft); } catch { state.content = null; }
  }
  if (!state.content) {
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
    if (kind === "tags") return bindTags(el, path);
    if (kind === "image") return bindImage(el, path);
    el.setAttribute("contenteditable", "true");
    el.addEventListener("input", () => {
      setPath(state.content, path, el.textContent);
      scheduleSave();
      scheduleCommit();
    });
  });
}

// Tags edit as one comma-separated string; split back into an array on input.
function bindTags(el, path) {
  el.setAttribute("contenteditable", "true");
  el.addEventListener("input", () => {
    const arr = el.textContent.split(",").map((s) => s.trim()).filter(Boolean);
    setPath(state.content, path, arr);
    scheduleSave();
    scheduleCommit();
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

function mountChrome(initialStatus) {
  injectStyle();
  buildToolbar(initialStatus);
  buildHoverControls();
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
    body.ff-editing { caret-color: #7c3aed; }
    body.ff-editing [data-bind] { outline: 1px dotted rgba(124,58,237,.35); outline-offset: 2px; }
    body.ff-editing :is(a) { cursor: text; }
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
        body: JSON.stringify({ content: c, images }),
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

  mkBtn("Exit", "Leave editing (reload as a visitor)", function () {
    location.reload();
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

  hoverBtns.append(del, dup);
  document.body.append(hoverBox, hoverBtns);
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
function hideHover() {
  hoverTarget = null;
  if (hoverBox) hoverBox.style.display = "none";
  if (hoverBtns) hoverBtns.style.display = "none";
}

function onMove(e) {
  if (!editing) return;
  let t = e.target;
  if (!t || (t.closest && t.closest("[data-ff-chrome]"))) return; // keep controls usable
  if (t === document.body || t === document.documentElement) { hideHover(); return; }
  // Prefer the whole item card so ✕/⧉ act on the item, not just the hovered field.
  const item = t.closest && t.closest(".item");
  if (item) t = item;
  hoverTarget = t;
  const r = t.getBoundingClientRect();
  const x = r.left + scrollX, y = r.top + scrollY;
  hoverBox.style.cssText += `;display:block;left:${x - 3}px;top:${y - 3}px;width:${r.width + 6}px;height:${r.height + 6}px`;
  // Only items get delete/duplicate controls.
  if (itemIndexOf(t) >= 0) {
    hoverBtns.style.cssText += `;display:flex;left:${Math.max(4, x + r.width - 56)}px;top:${Math.max(4, y - 26)}px`;
  } else {
    hoverBtns.style.display = "none";
  }
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

mountEditor();
