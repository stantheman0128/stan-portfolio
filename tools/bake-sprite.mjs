// Bake the licensed LottieFiles hedgehog (tasks/mascot-candidates/cand1-hedgehog.json,
// Lottie Simple License) into a single horizontal WebP sprite strip so the site
// ships zero animation runtime. Re-run with: npm run bake:sprite
import { launch } from "puppeteer-core";
import { readFileSync, writeFileSync, statSync } from "node:fs";
import { resolve } from "node:path";

const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const FRAMES = 24;   // of the 49-frame loop, every 2nd (frame 48 ~= frame 0)
const STEP = 2;
const CELL_W = 184;  // 2x of the 92px display width
const CELL_H = 208;  // keeps the 406x460 source aspect
const QUALITY = 0.8;
const OUT = resolve("public/assets/sprite-hedgehog.webp");

const anim = readFileSync(resolve("tasks/mascot-candidates/cand1-hedgehog.json"), "utf8");
const lottieLib = readFileSync(resolve("node_modules/lottie-web/build/player/lottie.min.js"), "utf8");

const browser = await launch({ executablePath: CHROME, headless: true });
try {
  const page = await browser.newPage();
  await page.setContent(
    `<canvas id="c" width="${CELL_W}" height="${CELL_H}"></canvas>` +
    `<canvas id="sheet" width="${FRAMES * CELL_W}" height="${CELL_H}"></canvas>`
  );
  await page.addScriptTag({ content: lottieLib });
  const dataUrl = await page.evaluate(async (animData, FRAMES, STEP, CELL_W, CELL_H, QUALITY) => {
    const c = document.getElementById("c");
    const sheet = document.getElementById("sheet");
    const a = lottie.loadAnimation({
      renderer: "canvas",
      loop: false,
      autoplay: false,
      animationData: JSON.parse(animData),
      rendererSettings: {
        context: c.getContext("2d"),
        clearCanvas: true,
        preserveAspectRatio: "xMidYMid meet"
      }
    });
    await new Promise((r) => a.addEventListener("DOMLoaded", r));
    const sctx = sheet.getContext("2d");
    for (let i = 0; i < FRAMES; i++) {
      a.goToAndStop(i * STEP, true);
      sctx.drawImage(c, i * CELL_W, 0, CELL_W, CELL_H);
    }
    return sheet.toDataURL("image/webp", QUALITY);
  }, anim, FRAMES, STEP, CELL_W, CELL_H, QUALITY);

  writeFileSync(OUT, Buffer.from(dataUrl.split(",")[1], "base64"));
  const kb = (statSync(OUT).size / 1024).toFixed(1);
  console.log(`baked ${FRAMES} frames (${FRAMES * CELL_W}x${CELL_H}) -> ${OUT} (${kb} KB)`);
  if (statSync(OUT).size > 150 * 1024) {
    console.warn("WARN: over the 150 KB budget - lower QUALITY or FRAMES and re-bake.");
    process.exitCode = 1;
  }
} finally {
  await browser.close();
}
