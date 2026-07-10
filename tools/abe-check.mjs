// abe-check — is the rendered page really "Hiroshi-Abe grade"?
// Renders each theme from data/content.json and audits the HTML against hard
// budgets. Run: node tools/abe-check.mjs   (exit 1 if featherweight fails)
//
// The scorecard (what "abe grade" means, measurably):
//   1. One request to first paint: all CSS inline, no external stylesheets,
//      no web fonts, no render-blocking anything.
//   2. Zero external origins for resources (img/script/css). Anchors to
//      GitHub etc. are links, not resources — they cost nothing.
//   3. Featherweight only: no unexpected <script> tags. Every inline script
//      must match the fingerprint allowlist below (shipped on purpose: load
//      readout + RUM beacon, creator edit entry). A third script fails the gate.
//   4. HTML payload small enough for one round trip burst: gzip <= 25 KB.
//   5. Images: below the fold, lazy, dimensioned (CLS = 0).
import { readFileSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const { renderSite, THEMES_META } = await import(
  new URL("../src/render/renderSite.js", import.meta.url)
);
const content = JSON.parse(readFileSync(join(root, "data", "content.json"), "utf8"));

const BUDGET = { gzipKB: 25 };
// Inline scripts Featherweight ships on purpose, each identified by a stable
// content fingerprint. Any script that matches none of these fails the gate.
const ALLOWED_SCRIPTS = {
  featherweight: [
    { name: "load readout + RUM beacon", marker: "/api/rum" },
    { name: "creator edit entry", marker: "cst-edit-btn" },
  ],
};

let failed = false;

for (const { key, label } of THEMES_META) {
  const html = renderSite(content, key);
  const raw = Buffer.byteLength(html, "utf8");
  const gz = gzipSync(Buffer.from(html)).length;

  // Resource references only (not anchor hrefs).
  const extResources = [
    ...html.matchAll(/(?:src|srcset)\s*=\s*["']?(https?:)?\/\/[^"' >]+/gi),
    ...html.matchAll(/url\(\s*["']?https?:\/\//gi),
    ...html.matchAll(/@import\b/gi),
    ...html.matchAll(/<link[^>]+rel=["']?stylesheet[^>]*href=["']?(https?:)?\/\//gi),
  ].map((m) => m[0]);

  const scriptTags = [...html.matchAll(/<script\b/gi)].length;
  const extScripts = [...html.matchAll(/<script[^>]+src=/gi)].length;
  const blockingCss = [...html.matchAll(/<link[^>]+rel=["']?stylesheet/gi)].length;
  const fontHits = [...html.matchAll(/fonts\.googleapis|fonts\.gstatic|@font-face[^}]*url\(\s*["']?https?:/gi)].length;

  const imgs = [...html.matchAll(/<img\b[^>]*>/gi)].map((m) => m[0]);
  const imgsNotLazy = imgs.filter((t) => !/loading=["']?lazy/.test(t)).length;
  const imgsNoDims = imgs.filter((t) => !(/\bwidth=/.test(t) && /\bheight=/.test(t))).length;
  const viewport = /<meta[^>]+name=["']?viewport/.test(html);

  const allowedScripts = ALLOWED_SCRIPTS[key];
  let scriptCheck;
  if (allowedScripts) {
    const bodies = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].map((m) => m[1]);
    const unknown = bodies.filter((b) => !allowedScripts.some((a) => b.includes(a.marker)));
    const ok = unknown.length === 0 && bodies.length === allowedScripts.length && bodies.length === scriptTags;
    const detail = ok
      ? scriptTags + " (" + allowedScripts.map((a) => a.name).join(", ") + ")"
      : unknown.length
        ? unknown.length + " unknown: " + JSON.stringify(unknown[0].trim().slice(0, 60))
        : scriptTags + " scripts, expected " + allowedScripts.length;
    scriptCheck = ["<script> tags allowlisted only (" + allowedScripts.length + ")", ok, detail];
  } else {
    scriptCheck = ["<script> tags (informational)", true, String(scriptTags)];
  }

  const checks = [
    ["gzip HTML ≤ " + BUDGET.gzipKB + " KB", gz / 1024 <= BUDGET.gzipKB, (gz / 1024).toFixed(1) + " KB (raw " + (raw / 1024).toFixed(1) + " KB)"],
    ["external resource refs = 0", extResources.length === 0, String(extResources.length)],
    ["render-blocking css links = 0", blockingCss === 0, String(blockingCss)],
    ["web fonts = 0", fontHits === 0, String(fontHits)],
    ["external scripts = 0", extScripts === 0, String(extScripts)],
    scriptCheck,
    ["all <img> lazy", imgsNotLazy === 0, imgsNotLazy + " of " + imgs.length + " not lazy"],
    ["all <img> dimensioned (CLS 0)", imgsNoDims === 0, imgsNoDims + " of " + imgs.length + " missing w/h"],
    ["viewport meta present", viewport, String(viewport)],
  ];

  const themeFailed = checks.some(([, ok]) => !ok);
  if (key === "featherweight" && themeFailed) failed = true;

  console.log("\n== " + label + " ==");
  for (const [name, ok, detail] of checks) {
    console.log((ok ? "  PASS  " : "  FAIL  ") + name + "  →  " + detail);
  }
}

console.log(
  "\nNote: this audits the HTML artifact. The last mile — TTFB from the CDN edge and" +
  "\nreal-device FCP — can only be proven on the deployed URL (Lighthouse / WebPageTest)."
);
process.exit(failed ? 1 : 0);
