import { describe, it, expect } from "vitest";
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import sharp from "sharp";
import { renderSite } from "../src/render/renderSite.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const content = JSON.parse(readFileSync(join(root, "data", "content.json"), "utf8"));

describe("featherweight responsive thumbnails", () => {
  const html = renderSite(content, "featherweight");
  const edit = renderSite(content, "featherweight", { edit: true });

  it("serves 88px and 132px WebP variants for public work-item images", () => {
    expect(html).toContain('src="/assets/thumbs/colonist-stats-icon-88.webp"');
    expect(html).toContain(
      'srcset="/assets/thumbs/colonist-stats-icon-88.webp 88w, /assets/thumbs/colonist-stats-icon-132.webp 132w"'
    );
    expect(html).toContain('sizes="(max-width: 30rem) 38px, 44px"');
    expect(html).not.toContain(
      '<img src="/assets/etf-tracker-screenshot.png" alt="ETF Tracker thumbnail"'
    );
  });

  it("keeps original image URLs in edit mode and for the linked patent image", () => {
    expect(edit).toContain(
      '<img src="/assets/colonist-stats-icon.png" alt="Colonist.io Stats Tracker thumbnail"'
    );
    expect(edit).not.toContain("/assets/thumbs/");
    expect(html).toContain('<img src="/assets/patent-us10699576-p1.png"');
  });

  it("bakes both thumbnail widths for every local work-item image", async () => {
    const output = mkdtempSync(join(tmpdir(), "portfolio-thumbs-"));
    try {
      const result = spawnSync(
        process.execPath,
        ["tools/bake-thumbnails.mjs", "--output", output],
        { cwd: root, encoding: "utf8" }
      );
      expect(result.status, result.stderr).toBe(0);

      const images = [
        ...new Set(
          content.items
            .map((item) => item.image)
            .filter((image) => image && image.startsWith("/assets/"))
        ),
      ];
      for (const image of images) {
        const stem = basename(image).replace(/\.[^.]+$/, "");
        expect(existsSync(join(output, `${stem}-88.webp`))).toBe(true);
        expect(existsSync(join(output, `${stem}-132.webp`))).toBe(true);
      }

      expect(statSync(join(output, "etf-tracker-screenshot-132.webp")).size).toBeLessThan(
        statSync(join(root, "public", "assets", "etf-tracker-screenshot.png")).size
      );

      const cover = await sharp(
        readFileSync(join(output, "line-notify-screenshot-132.webp"))
      ).metadata();
      expect({ width: cover.width, height: cover.height }).toEqual({
        width: 132,
        height: 132,
      });
    } finally {
      rmSync(output, { recursive: true, force: true });
    }
  });

  it("rejects Windows-style traversal in an asset path", () => {
    const temp = mkdtempSync(join(tmpdir(), "portfolio-thumb-traversal-"));
    const contentPath = join(temp, "content.json");
    const output = join(temp, "thumbs");
    const unsafeImage = "/assets/..\\og-image.svg";
    writeFileSync(contentPath, JSON.stringify({ items: [{ image: unsafeImage }] }));

    const unsafeContent = structuredClone(content);
    unsafeContent.items[0].image = unsafeImage;
    const unsafeHtml = renderSite(unsafeContent, "featherweight");
    expect(unsafeHtml).not.toContain("/assets/thumbs/..\\");
    expect(unsafeHtml).toContain(`src="${unsafeImage}"`);

    try {
      const result = spawnSync(
        process.execPath,
        [
          "tools/bake-thumbnails.mjs",
          "--content",
          contentPath,
          "--output",
          output,
        ],
        { cwd: root, encoding: "utf8" }
      );

      expect(result.status).not.toBe(0);
      expect(result.stderr).toContain("Unsafe thumbnail source path");
    } finally {
      rmSync(temp, { recursive: true, force: true });
    }
  });
});
