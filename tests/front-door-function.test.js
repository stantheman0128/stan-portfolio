import { describe, it, expect } from "vitest";
import { brotliDecompressSync } from "node:zlib";
import { bakeFrontDoor, frontDoorModuleSource } from "../tools/front-door-bake.mjs";

// The front-door Pages Function (functions/index.js) serves the baked HTML from
// an embedded, pre-compressed payload so every POP answers from resident code with
// no origin fetch (kills the cold-POP cache MISS). The build embeds that payload;
// these tests pin the contract the function relies on.
describe("front-door function payload", () => {
  const html = "<!doctype html><html><head><title>Stan</title></head><body>hi <a href=\"mailto:x@y.z\">x</a></body></html>";

  it("brotli payload round-trips back to the exact HTML", () => {
    const { brB64 } = bakeFrontDoor(html);
    const back = brotliDecompressSync(Buffer.from(brB64, "base64")).toString("utf8");
    expect(back).toBe(html);
  });

  it("keeps the raw HTML alongside the compressed payload", () => {
    const payload = bakeFrontDoor(html);
    expect(payload.html).toBe(html);
    expect(payload.brB64).toMatch(/^[A-Za-z0-9+/=]+$/);
  });

  it("emits a valid ES module exporting HTML and BR_B64", () => {
    const src = frontDoorModuleSource(html);
    expect(src).toContain("export const HTML =");
    expect(src).toContain("export const BR_B64 =");
    // The embedded HTML must be a real string literal that parses back to the input.
    const HTML = JSON.parse(src.match(/export const HTML = (".*?");\n/s)[1]);
    expect(HTML).toBe(html);
  });
});
