// Freeform on-page editor. The rendered site IS the editor: click text to type,
// hover any element to delete/duplicate it, double-click images to replace them.
// A theme is a starting template; the artifact is a full static HTML page,
// autosaved to localStorage and exportable as a self-contained file.
import { renderSite, THEMES_META } from "../render/renderSite.js";

const DRAFT_KEY = "freeform-draft-v1";
let editing = true;
const undoStack = []; // structural ops only; text undo stays native (Ctrl+Z)

// ---------- boot ----------
async function boot() {
  const draft = localStorage.getItem(DRAFT_KEY);
  if (draft) {
    swapDocument(draft);
    mountChrome("Restored your draft");
  } else {
    await freshFromTheme("featherweight", "Started from Featherweight");
  }
}

async function freshFromTheme(theme, msg) {
  const content = await (await fetch("/data/content.json")).json();
  swapDocument(renderSite(content, theme));
  mountChrome(msg || "Started from " + theme);
  scheduleSave();
}

function swapDocument(html) {
  const doc = new DOMParser().parseFromString(html, "text/html");
  document.replaceChild(document.importNode(doc.documentElement, true), document.documentElement);
  // DOMParser+importNode keeps <script> non-executable; recreate them so theme
  // behavior (expanders, companion, parade) also works inside the editor.
  document.querySelectorAll("script").forEach((old) => {
    const s = document.createElement("script");
    for (const a of old.attributes) s.setAttribute(a.name, a.value);
    s.textContent = old.textContent;
    old.replaceWith(s);
  });
}

// ---------- serialization (what gets saved/exported: the page, never the chrome) ----------
function serialize() {
  const clone = document.documentElement.cloneNode(true);
  clone.querySelectorAll("[data-ff-chrome]").forEach((n) => n.remove());
  clone.querySelectorAll("[contenteditable]").forEach((n) => n.removeAttribute("contenteditable"));
  clone.querySelectorAll("[spellcheck]").forEach((n) => n.removeAttribute("spellcheck"));
  return "<!doctype html>\n" + clone.outerHTML;
}

let saveTimer = null;
let observer = null;
function scheduleSave() {
  clearTimeout(saveTimer);
  setStatus("Editing…");
  saveTimer = setTimeout(() => {
    localStorage.setItem(DRAFT_KEY, serialize());
    setStatus("Saved ✓");
  }, 800);
}
function watchMutations() {
  if (observer) observer.disconnect();
  observer = new MutationObserver((muts) => {
    if (muts.some((m) => {
      const t = m.target;
      return !(t.closest && t.closest("[data-ff-chrome]"));
    })) scheduleSave();
  });
  observer.observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true });
}

// ---------- chrome (toolbar + hover controls), all data-ff-chrome ----------
let statusEl, hoverBox, hoverBtns, hoverTarget = null;

let eventsWired = false;
function mountChrome(initialStatus) {
  injectStyle();
  buildToolbar(initialStatus);
  buildHoverControls();
  setEditing(true);
  watchMutations();
  if (!eventsWired) { wireEvents(); eventsWired = true; }
}

function injectStyle() {
  const s = document.createElement("style");
  s.setAttribute("data-ff-chrome", "");
  s.textContent = `
    #ffbar { position: fixed; top: 12px; right: 12px; z-index: 99999; display: flex; gap: 6px;
      align-items: center; flex-wrap: wrap; justify-content: flex-end; max-width: min(92vw, 640px);
      background: #ffffff; color: #1b1b1f; border: 1px solid #dcdce0; border-radius: 12px;
      padding: 8px 10px; box-shadow: 0 8px 28px rgba(20,20,30,.14);
      font: 13px/1.4 ui-sans-serif, system-ui, "Segoe UI", sans-serif; }
    #ffbar .ttl { font-weight: 700; font-size: 12.5px; letter-spacing: .02em; margin-right: 2px; }
    #ffbar .st { color: #71717a; font-size: 12px; min-width: 74px; text-align: right; }
    #ffbar button, #ffbar select { background: #f4f4f6; color: #1b1b1f; border: 1px solid #dcdce0;
      border-radius: 8px; padding: 5px 10px; font: inherit; font-size: 12.5px; cursor: pointer; }
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
    body.ff-editing :is(a) { cursor: text; }
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

  // template picker — restart from a theme
  const sel = document.createElement("select");
  const ph = document.createElement("option");
  ph.textContent = "New from template…";
  ph.value = "";
  sel.appendChild(ph);
  THEMES_META.forEach((t) => {
    const o = document.createElement("option");
    o.value = t.key; o.textContent = t.label;
    sel.appendChild(o);
  });
  sel.addEventListener("change", async () => {
    const key = sel.value;
    sel.value = "";
    if (!key) return;
    if (!confirm("Start over from the \"" + key + "\" template?\nThis DISCARDS all your current edits.")) return;
    localStorage.removeItem(DRAFT_KEY);
    undoStack.length = 0;
    await freshFromTheme(key, "Started from " + key);
  });
  bar.appendChild(sel);

  const mkBtn = (label, title, on, cls) => {
    const b = document.createElement("button");
    b.textContent = label; b.title = title;
    if (cls) b.className = cls;
    b.addEventListener("click", on);
    bar.appendChild(b);
    return b;
  };

  const undoBtn = mkBtn("↩ Undo", "Undo last delete/duplicate (text undo: Ctrl+Z)", () => {
    const op = undoStack.pop();
    if (!op) return;
    if (op.type === "delete") op.parent.insertBefore(op.node, op.next);
    else if (op.type === "duplicate") op.node.remove();
    undoBtn.disabled = !undoStack.length;
    scheduleSave();
  });
  undoBtn.disabled = true;
  bar._undoBtn = undoBtn;

  const toggle = mkBtn("👁 Preview", "Toggle editing off to click links and see it as a visitor", () => {
    setEditing(!editing);
    toggle.textContent = editing ? "👁 Preview" : "✏️ Edit";
  });

  mkBtn("Export", "Download the finished page as a single HTML file", () => {
    const blob = new Blob([serialize()], { type: "text/html" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "stan-site.html";
    document.body.appendChild(a); a.click(); a.remove();
    setStatus("Exported ✓");
  }, "primary");

  mkBtn("Reset", "Discard draft and start clean", async () => {
    if (!confirm("Discard ALL edits and start clean from Featherweight?")) return;
    localStorage.removeItem(DRAFT_KEY);
    undoStack.length = 0;
    await freshFromTheme("featherweight", "Reset — clean start");
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
  del.className = "del"; del.textContent = "✕"; del.title = "Delete this element";
  del.addEventListener("mousedown", (e) => {
    e.preventDefault(); e.stopPropagation();
    if (!hoverTarget) return;
    undoStack.push({ type: "delete", node: hoverTarget, parent: hoverTarget.parentNode, next: hoverTarget.nextSibling });
    hoverTarget.remove();
    hideHover();
    toolbarUndoRefresh();
    scheduleSave();
  });

  const dup = document.createElement("button");
  dup.textContent = "⧉"; dup.title = "Duplicate this element (duplicate a card, then edit it — that's how you add)";
  dup.addEventListener("mousedown", (e) => {
    e.preventDefault(); e.stopPropagation();
    if (!hoverTarget) return;
    const clone = hoverTarget.cloneNode(true);
    hoverTarget.after(clone);
    undoStack.push({ type: "duplicate", node: clone });
    toolbarUndoRefresh();
    scheduleSave();
  });

  hoverBtns.append(del, dup);
  document.body.append(hoverBox, hoverBtns);
}

function toolbarUndoRefresh() {
  const bar = document.getElementById("ffbar");
  if (bar && bar._undoBtn) bar._undoBtn.disabled = !undoStack.length;
}

function setStatus(t) { if (statusEl) statusEl.textContent = t; }

function setEditing(on) {
  editing = on;
  document.body.contentEditable = on ? "true" : "false";
  document.body.spellcheck = false;
  document.body.classList.toggle("ff-editing", on);
  document.querySelectorAll("[data-ff-chrome]").forEach((n) => {
    if (n.id === "ffbar") n.setAttribute("contenteditable", "false");
  });
  if (!on) hideHover();
}

// ---------- hover targeting ----------
function hideHover() {
  hoverTarget = null;
  hoverBox.style.display = "none";
  hoverBtns.style.display = "none";
}

function onMove(e) {
  if (!editing) return;
  const t = e.target;
  if (!t || t.closest("[data-ff-chrome]")) return; // keep controls visible while on them
  if (t === document.body || t === document.documentElement) { hideHover(); return; }
  hoverTarget = t;
  const r = t.getBoundingClientRect();
  const x = r.left + scrollX, y = r.top + scrollY;
  hoverBox.style.cssText += `;display:block;left:${x - 3}px;top:${y - 3}px;width:${r.width + 6}px;height:${r.height + 6}px`;
  hoverBtns.style.cssText += `;display:flex;left:${Math.max(4, x + r.width - 56)}px;top:${Math.max(4, y - 26)}px`;
}

function wireEvents() {
  document.addEventListener("mousemove", onMove, true);
  document.addEventListener("scroll", hideHover, true);

  // dblclick an image → replace it (embedded as data URL so it survives save/export)
  document.addEventListener("dblclick", (e) => {
    if (!editing) return;
    const img = e.target.closest && e.target.closest("img");
    if (!img || img.closest("[data-ff-chrome]")) return;
    e.preventDefault();
    const pick = document.createElement("input");
    pick.type = "file"; pick.accept = "image/*";
    pick.addEventListener("change", () => {
      const f = pick.files && pick.files[0];
      if (!f) return;
      const rd = new FileReader();
      rd.onload = () => { img.src = rd.result; scheduleSave(); };
      rd.readAsDataURL(f);
    });
    pick.click();
  }, true);

  // Ctrl+S → force save
  document.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
      e.preventDefault();
      clearTimeout(saveTimer);
      localStorage.setItem(DRAFT_KEY, serialize());
      setStatus("Saved ✓");
    }
  });

  // in edit mode, plain click on links must not navigate away
  document.addEventListener("click", (e) => {
    if (!editing) return;
    const a = e.target.closest && e.target.closest("a");
    if (a && !a.closest("[data-ff-chrome]")) e.preventDefault();
  }, true);
}

boot();
