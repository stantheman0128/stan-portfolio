// Post-build step:
// 1. Copy data/content.json into dist/ (site.html / studio / edit fetch it at runtime).
// 2. Bake featherweight to pure HTML at build time and make it the PUBLIC FRONT
//    DOOR (dist/index.html) as well as the explicit lite URL (dist/fast/). Abe-grade
//    static delivery: the visitor gets the whole page in one shot — no runtime
//    fetch, no client render, nothing to hydrate — so the load-time readout is
//    honest and fast. This overwrites Vite's System-B SPA index.html on purpose.
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
const fw = renderSite(content, "featherweight");
writeFileSync(join(dist, "index.html"), fw);
mkdirSync(join(dist, "fast"), { recursive: true });
writeFileSync(join(dist, "fast", "index.html"), fw);

// Embed the same baked HTML into the "/" Pages Function so every POP serves it from
// resident code (no origin fetch, no cold-POP cache MISS). Single source of truth:
// the Function's payload is generated here from the very fw string written above.
const { frontDoorModuleSource } = await import(new URL("./front-door-bake.mjs", import.meta.url));
writeFileSync(join(root, "functions", "_front-door.js"), frontDoorModuleSource(fw));

// Bundle the on-page editor to a stable, unhashed URL so the Edit button can inject
// it on demand from any live page (esbuild ships with vite).
const { build: esbuild } = await import("esbuild");
await esbuild({
  entryPoints: [join(root, "src", "studio", "freeform.js")],
  bundle: true,
  minify: true,
  format: "iife",
  outfile: join(dist, "editor.js"),
});

console.log("postbuild: content.json + index.html + fast/ + editor.js + functions/_front-door.js written");
