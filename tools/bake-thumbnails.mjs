import { mkdirSync, readFileSync } from "node:fs";
import {
  dirname,
  isAbsolute,
  join,
  posix,
  relative as pathRelative,
  resolve,
  sep,
} from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const outputFlag = args.indexOf("--output");
const contentFlag = args.indexOf("--content");
const output = resolve(
  root,
  outputFlag >= 0 && args[outputFlag + 1]
    ? args[outputFlag + 1]
    : "public/assets/thumbs"
);
const contentPath = resolve(
  root,
  contentFlag >= 0 && args[contentFlag + 1]
    ? args[contentFlag + 1]
    : "data/content.json"
);
const content = JSON.parse(readFileSync(contentPath, "utf8"));
const widths = [88, 132];
const sourceRoot = resolve(root, "public", "assets");

function assertInside(base, candidate, image) {
  const relative = pathRelative(base, candidate);
  if (
    isAbsolute(relative) ||
    relative === ".." ||
    relative.startsWith(`..${sep}`)
  ) {
    throw new Error(`Unsafe thumbnail source path: ${image}`);
  }
}

const images = [
  ...new Map(
    (content.items || [])
      .filter(
        (item) =>
          typeof item.image === "string" && item.image.startsWith("/assets/")
      )
      .map((item) => [
        item.image,
        {
          image: item.image,
          fit: item.imageMode === "icon" || item.imageMode === "contain"
            ? "contain"
            : "cover",
        },
      ])
  ).values(),
];

await Promise.all(
  images.flatMap(({ image, fit }) => {
    const relative = image.slice("/assets/".length);
    const segments = relative.split("/");
    if (
      !relative ||
      relative.includes("\\") ||
      segments.some((segment) => !segment || segment === "." || segment === "..")
    ) {
      throw new Error(`Unsafe thumbnail source path: ${image}`);
    }

    const source = resolve(sourceRoot, ...segments);
    assertInside(sourceRoot, source, image);
    const parsed = posix.parse(relative);
    return widths.map(async (width) => {
      const target = resolve(
        output,
        ...(parsed.dir ? parsed.dir.split("/") : []),
        `${parsed.name}-${width}.webp`
      );
      assertInside(output, target, image);
      mkdirSync(dirname(target), { recursive: true });
      await sharp(source)
        .resize(
          fit === "cover"
            ? { width, height: width, fit: "cover" }
            : { width }
        )
        .webp({ quality: 80, effort: 6 })
        .toFile(target);
    });
  })
);

console.log(`bake-thumbnails: ${images.length * widths.length} WebP files written`);
