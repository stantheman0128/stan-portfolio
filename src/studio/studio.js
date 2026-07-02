// Studio — HackMD-style live editor. Left = fields, right = live preview via the
// SAME renderSite() the public site uses. Edits bind directly to the content object
// (focus-preserving); structural changes rebuild the form. Draft saved to localStorage.
import { renderSite, THEMES_META } from "../render/renderSite.js";

const DRAFT_KEY = "studio-draft-v1";
const state = { content: null, theme: "featherweight" };

const $ = (id) => document.getElementById(id);
const els = {
  fields: $("fields"), status: $("status"), themeSeg: $("themeSeg"),
  preview: $("preview"), pfLabel: $("pfLabel"),
  resetBtn: $("resetBtn"), exportBtn: $("exportBtn"), pubBtn: $("pubBtn"),
};

// tiny hyperscript
function el(tag, attrs, ...kids) {
  const e = document.createElement(tag);
  if (attrs) for (const [k, v] of Object.entries(attrs)) {
    if (v == null) continue;
    if (k === "class") e.className = v;
    else e.setAttribute(k, v);
  }
  for (const k of kids.flat()) { if (k == null || k === false) continue; e.append(k.nodeType ? k : document.createTextNode(String(k))); }
  return e;
}
const mini = (label, on, cls) => { const b = el("button", { class: "mini" + (cls ? " " + cls : "") }, label); b.addEventListener("click", on); return b; };

// ---- edit plumbing ----
let saveTimer = null;
function onEdit() {
  renderPreview();
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(state.content));
    setStatus("Saved locally ✓");
  }, 250);
}
function setStatus(t) { els.status.textContent = t; }

function renderPreview() {
  els.preview.srcdoc = renderSite(state.content, state.theme);
  const m = THEMES_META.find((t) => t.key === state.theme);
  els.pfLabel.textContent = "Preview · " + (m ? m.label : state.theme);
}

// a labelled input bound directly to obj[key] (no form rebuild on keystroke)
function field(label, obj, key, opts = {}) {
  const wrap = el("label", { class: "f" }, el("span", {}, label));
  let input;
  if (opts.options) {
    input = el("select");
    opts.options.forEach((o) => input.append(el("option", { value: o }, o)));
    input.value = obj[key] ?? "";
  } else if (opts.textarea) {
    input = el("textarea", { rows: opts.rows || 2 });
    input.value = obj[key] ?? "";
  } else {
    input = el("input", { type: opts.type || "text" });
    input.value = obj[key] ?? "";
  }
  if (opts.placeholder) input.setAttribute("placeholder", opts.placeholder);
  input.addEventListener("input", () => { obj[key] = input.value; if (opts.onInput) opts.onInput(input.value); onEdit(); });
  wrap.append(input);
  return wrap;
}

function group(title, openByDefault, buildBody) {
  const d = el("details", { class: "group" });
  if (openByDefault) d.setAttribute("open", "");
  d.append(el("summary", {}, title));
  const body = el("div", { class: "body" });
  buildBody(body);
  d.append(body);
  return d;
}

// ---- section builders ----
function buildProfile(body) {
  const p = state.content.profile || (state.content.profile = {});
  body.append(
    field("Name", p, "name"),
    field("Role", p, "role"),
    field("Tagline", p, "tagline", { textarea: true }),
    field("Subtagline", p, "subtagline", { textarea: true }),
    field("Location", p, "location"),
    field("Email", p, "email"),
    field("GitHub URL", p, "githubUrl"),
    field("LinkedIn URL", p, "linkedinUrl"),
  );
}

function buildAbout(body) {
  const a = state.content.about || (state.content.about = { paragraphs: [] });
  body.append(field("Short about", a, "short", { textarea: true, rows: 3 }));
  a.paragraphs = a.paragraphs || [];
  const list = el("div", { class: "sub" });
  a.paragraphs.forEach((_, i) => {
    const row = el("div", {});
    row.append(field("Paragraph " + (i + 1), a.paragraphs, i, { textarea: true, rows: 3 }));
    row.append(mini("Remove paragraph", () => { a.paragraphs.splice(i, 1); buildForm(); onEdit(); }, "del"));
    list.append(row);
  });
  body.append(list);
  const add = el("button", { class: "add" }, "+ Add paragraph");
  add.addEventListener("click", () => { a.paragraphs.push(""); buildForm(); onEdit(); });
  body.append(add);
}

function tagsField(item) {
  const wrap = el("label", { class: "f" }, el("span", {}, "Tags (comma-separated)"));
  const input = el("input", { type: "text" });
  input.value = (item.tags || []).join(", ");
  input.addEventListener("input", () => {
    item.tags = input.value.split(",").map((s) => s.trim()).filter(Boolean);
    onEdit();
  });
  wrap.append(input);
  return wrap;
}

function imageField(item) {
  const wrap = el("div", {});
  wrap.append(field("Image URL", item, "image", { placeholder: "/assets/…  or upload →" }));
  wrap.append(field("Image mode", item, "imageMode", { options: ["", "contain", "icon"] }));
  const pick = el("input", { type: "file", accept: "image/*" });
  const thumb = el("img", { class: "thumb" });
  const showThumb = () => { if (item.image) { thumb.src = item.image; thumb.style.display = "block"; } else thumb.style.display = "none"; };
  pick.addEventListener("change", () => {
    const f = pick.files && pick.files[0];
    if (!f) return;
    item.image = URL.createObjectURL(f);
    item._imageFile = f; // kept for Publish (real upload) later
    buildForm(); onEdit();
  });
  const row = el("label", { class: "f" }, el("span", {}, "Upload image (local preview)"), pick);
  wrap.append(row, thumb);
  showThumb();
  return wrap;
}

function linksEditor(item) {
  item.links = item.links || [];
  const wrap = el("div", { class: "sub" });
  wrap.append(el("span", { class: "f" }, el("span", {}, "Links")));
  item.links.forEach((lnk, i) => {
    const r = el("div", { class: "linkrow" });
    const lab = el("input", { type: "text", placeholder: "Label" }); lab.value = lnk.label || "";
    const href = el("input", { type: "text", placeholder: "https://… (or #TODO-x to hide)" }); href.value = lnk.href || "";
    lab.addEventListener("input", () => { lnk.label = lab.value; onEdit(); });
    href.addEventListener("input", () => { lnk.href = href.value; onEdit(); });
    r.append(lab, href, mini("✕", () => { item.links.splice(i, 1); buildForm(); onEdit(); }, "del"));
    wrap.append(r);
  });
  const add = el("button", { class: "add" }, "+ Add link");
  add.addEventListener("click", () => { item.links.push({ label: "", href: "" }); buildForm(); onEdit(); });
  wrap.append(add);
  return wrap;
}

function itemCard(item, i, arr) {
  const card = el("div", { class: "item" });
  const title = el("span", { class: "ttl" }, item.title || "(untitled)");
  const row = el("div", { class: "row" },
    title,
    mini("↑", () => moveItem(arr, i, -1)),
    mini("↓", () => moveItem(arr, i, 1)),
    mini("✕", () => { arr.splice(i, 1); buildForm(); onEdit(); }, "del"),
  );
  card.append(row);
  card.append(field("Name", item, "title", { onInput: (v) => (title.textContent = v || "(untitled)") }));
  card.append(field("Status", item, "status", { options: ["Live", "Production", "Prototype", "In progress", "Local tool", "Research"] }));
  card.append(field("Year", item, "year"));
  card.append(field("Description (one line)", item, "description", { textarea: true }));
  card.append(field("Detailed description (markdown)", item, "detail", { textarea: true, rows: 4 }));
  card.append(tagsField(item));
  card.append(imageField(item));
  card.append(linksEditor(item));
  return card;
}

function moveItem(arr, i, dir) {
  const j = i + dir;
  if (j < 0 || j >= arr.length) return;
  [arr[i], arr[j]] = [arr[j], arr[i]];
  buildForm(); onEdit();
}

function buildItems(body) {
  const items = state.content.items || (state.content.items = []);
  items.forEach((it, i) => body.append(itemCard(it, i, items)));
  const add = el("button", { class: "add" }, "+ Add item");
  add.addEventListener("click", () => {
    items.push({ id: "item-" + (items.length + 1), title: "New item", status: "Prototype", year: "", description: "", detail: "", tags: [], image: null, imageMode: "", links: [] });
    buildForm(); onEdit();
    els.fields.scrollTop = els.fields.scrollHeight;
  });
  body.append(add);
}

// ---- form + toolbar ----
function buildForm() {
  els.fields.replaceChildren(
    group("Profile", true, buildProfile),
    group("About", false, buildAbout),
    group("Items", true, buildItems),
  );
}

function buildThemeSeg() {
  els.themeSeg.replaceChildren(
    ...THEMES_META.map((t) => {
      const b = el("button", { class: t.key === state.theme ? "on" : "" }, t.label);
      b.addEventListener("click", () => {
        state.theme = t.key;
        [...els.themeSeg.children].forEach((c, idx) => c.classList.toggle("on", THEMES_META[idx].key === state.theme));
        renderPreview();
      });
      return b;
    }),
  );
}

function wireToolbar() {
  els.resetBtn.addEventListener("click", async () => {
    if (!confirm("Discard local edits and reload the published content?")) return;
    localStorage.removeItem(DRAFT_KEY);
    state.content = await (await fetch("/data/content.json")).json();
    buildForm(); renderPreview(); setStatus("Reset to published");
  });
  els.exportBtn.addEventListener("click", () => {
    const blob = new Blob([JSON.stringify(state.content, null, 2)], { type: "application/json" });
    const a = el("a", { href: URL.createObjectURL(blob), download: "content.json" });
    document.body.append(a); a.click(); a.remove();
    setStatus("Exported content.json");
  });
  els.pubBtn.addEventListener("click", () => {
    alert("Publish to GitHub is coming next (P2): it will commit content.json (and uploaded images) via your OAuth worker and auto-deploy. For now use Export to save.");
  });
}

async function boot() {
  buildThemeSeg();
  const draft = localStorage.getItem(DRAFT_KEY);
  if (draft) {
    try { state.content = JSON.parse(draft); setStatus("Loaded local draft"); }
    catch { state.content = null; }
  }
  if (!state.content) {
    state.content = await (await fetch("/data/content.json")).json();
    setStatus("Loaded published content");
  }
  buildForm();
  renderPreview();
  wireToolbar();
}

boot().catch((e) => setStatus("Error: " + e.message));
