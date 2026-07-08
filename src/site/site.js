// Public site — renders the active theme from content.json using the same
// renderSite() the Studio previews. Static and fast; visitors can switch theme.
import { renderSite } from "../render/renderSite.js";

const KEY = "site-theme";
const params = new URLSearchParams(location.search);
// /interactive is the clean URL for the interactive (minimal) edition.
const onInteractive = location.pathname.startsWith("/interactive");
if (onInteractive) { try { localStorage.setItem("site-ver", "full"); } catch (e) {} }
const theme = onInteractive ? "minimal" : (params.get("theme") || localStorage.getItem(KEY) || "featherweight");
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

// Version switching lives in the two cross-version cards; no floating switcher.
