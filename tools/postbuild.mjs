// Post-build step:
// 1. Copy data/content.json into dist/ (site.html / studio / edit fetch it at runtime).
// 2. Pre-render the "abe-grade" static page at dist/fast/ — featherweight baked
//    to pure HTML at build time: no runtime fetch, no JS, nothing to hydrate.
//    This is the URL to point Lighthouse at.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dist = join(root, "dist");

const content = JSON.parse(readFileSync(join(root, "data", "content.json"), "utf8"));

// Deploy stamp: quest state resets whenever this changes (owner is testing;
// freeze it to a constant before a real production launch if resets hurt).
content._build = String(Date.now());

mkdirSync(join(dist, "data"), { recursive: true });
writeFileSync(join(dist, "data", "content.json"), JSON.stringify(content));

const { renderSite } = await import(new URL("../src/render/renderSite.js", import.meta.url));
mkdirSync(join(dist, "fast"), { recursive: true });
writeFileSync(join(dist, "fast", "index.html"), renderSite(content, "featherweight"));

console.log("postbuild: dist/data/content.json + dist/fast/index.html written");
