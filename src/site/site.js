// Public site — renders the active theme from content.json using the same
// renderSite() the Studio previews. Static and fast; visitors can switch theme.
import { renderSite, THEMES_META } from "../render/renderSite.js";

const KEY = "site-theme";
const params = new URLSearchParams(location.search);
const theme = params.get("theme") || localStorage.getItem(KEY) || "featherweight";
if (params.get("theme")) localStorage.setItem(KEY, params.get("theme"));

const content = await (await fetch("/data/content.json")).json();

// renderSite() returns a full HTML document string. Parse it and swap the
// document element in place of the shell, no document.write / open / close.
const doc = new DOMParser().parseFromString(renderSite(content, theme), "text/html");
document.replaceChild(document.importNode(doc.documentElement, true), document.documentElement);

// DOMParser marks <script> elements as non-executable and importNode keeps that
// flag, so theme inline scripts (expanders, companion gaze, parade controls)
// would silently never run. Recreate each script so the browser executes it.
document.querySelectorAll("script").forEach((old) => {
  const s = document.createElement("script");
  for (const a of old.attributes) s.setAttribute(a.name, a.value);
  s.textContent = old.textContent;
  old.replaceWith(s);
});

// Floating theme switch (unobtrusive, bottom-right).
const bar = document.createElement("div");
bar.setAttribute("aria-label", "Theme");
bar.style.cssText =
  "position:fixed;bottom:14px;right:14px;z-index:9999;display:flex;gap:4px;" +
  "background:rgba(20,20,22,.82);padding:5px;border-radius:999px;" +
  "font:12px ui-sans-serif,system-ui,sans-serif;backdrop-filter:blur(6px)";
THEMES_META.forEach((t) => {
  const b = document.createElement("button");
  b.textContent = t.label;
  const on = t.key === theme;
  b.style.cssText =
    "border:0;border-radius:999px;padding:5px 12px;cursor:pointer;" +
    (on ? "background:#fff;color:#111;font-weight:600" : "background:transparent;color:#eee");
  b.addEventListener("click", () => {
    localStorage.setItem(KEY, t.key);
    location.search = "?theme=" + t.key;
  });
  bar.appendChild(b);
});
document.body.appendChild(bar);
