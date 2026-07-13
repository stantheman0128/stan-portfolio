// Bake public/og-image.svg into a 1200x630 PNG for og:image / twitter:image.
// Most link-preview crawlers (Facebook, LINE, iMessage, Slack) do not render
// SVG for social cards reliably, so the source SVG (kept for editing) needs a
// raster export. One-off tool, not part of the build pipeline - re-run with:
// node tools/bake-og-image.mjs
import { launch } from "puppeteer-core";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const SRC = resolve("public/og-image.svg");
const OUT = resolve("public/assets/og-image.png");
const W = 1200;
const H = 630;

const svg = readFileSync(SRC, "utf8");

const browser = await launch({ executablePath: CHROME, headless: true });
try {
  const page = await browser.newPage();
  await page.setViewport({ width: W, height: H });
  await page.setContent(
    `<!doctype html><html><head><style>html,body{margin:0;padding:0}</style></head>` +
      `<body>${svg}</body></html>`
  );
  await page.waitForSelector("svg");
  await page.screenshot({ path: OUT, type: "png" });
  console.log(`bake-og-image: wrote ${OUT} (${W}x${H})`);
} finally {
  await browser.close();
}
