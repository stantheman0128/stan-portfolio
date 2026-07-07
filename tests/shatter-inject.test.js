import { describe, it, expect } from "vitest";
import { shatterJS } from "../src/render/fx/shatter.js";

// shatterJS is an inline-script string injected into the Minimal theme. Run it
// with a fake window (no DOM needed — createShatterReveal is only declared, not
// called) and confirm the global wiring survives .toString() serialization.
describe("shatterJS injection", () => {
  it("mounts window.Shatter.createShatterReveal", () => {
    const win = {};
    new Function("window", shatterJS)(win);
    expect(win.Shatter).toBeTruthy();
    expect(typeof win.Shatter.createShatterReveal).toBe("function");
  });

  it("mounts a renderer taking (canvas, imgSrc)", () => {
    const win = {};
    new Function("window", shatterJS)(win);
    expect(win.Shatter.createShatterReveal.length).toBe(2);
  });
});
