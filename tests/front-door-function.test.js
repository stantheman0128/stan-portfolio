import { describe, it, expect } from "vitest";
import { frontDoorModuleSource } from "../tools/front-door-bake.mjs";
import { onRequest } from "../functions/index.js";

// The front-door Pages Function (functions/index.js) serves the baked HTML from an
// embedded module so every POP answers from resident code with no origin fetch (kills
// the cold-POP cache MISS). The build emits that module; this pins the contract.
describe("front-door function payload", () => {
  const html = "<!doctype html><html><head><title>Stan</title></head><body>hi <a href=\"mailto:x@y.z\">x</a></body></html>";

  it("emits a valid ES module exporting the exact HTML", () => {
    const src = frontDoorModuleSource(html);
    expect(src).toContain("export const HTML =");
    const HTML = JSON.parse(src.match(/export const HTML = (".*?");\n/s)[1]);
    expect(HTML).toBe(html);
  });

  it("does not embed a Content-Encoding'd payload (the edge compresses)", () => {
    // Guard against reintroducing manual pre-compression, which double-compresses
    // once the brotli_content_encoding runtime flag is on.
    const src = frontDoorModuleSource(html);
    expect(src).not.toContain("BR_B64");
  });
});

describe("front-door function cache policy", () => {
  it("uses dev-minimal cache while actively shipping", () => {
    const response = onRequest();

    expect(response.headers.get("cache-control")).toBe("no-cache");
    expect(response.headers.get("cloudflare-cdn-cache-control")).toBe("max-age=0");
  });
});
