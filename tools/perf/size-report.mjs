import { readFileSync } from "node:fs";
import { brotliCompressSync, constants, gzipSync } from "node:zlib";

const files = process.argv.slice(2);
if (files.length === 0) {
  files.push("dist/index.html", "dist/editor.js");
}

const rows = files.map((file) => {
  const bytes = readFileSync(file);
  return {
    file,
    raw: bytes.length,
    gzip: gzipSync(bytes, { level: 9 }).length,
    brotli: brotliCompressSync(bytes, {
      params: { [constants.BROTLI_PARAM_QUALITY]: 11 },
    }).length,
  };
});

console.table(rows);
