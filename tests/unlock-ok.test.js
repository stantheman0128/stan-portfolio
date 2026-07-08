import { describe, it, expect } from "vitest";
import { unlockOk } from "../functions/_lib/unlock.js";

describe("unlockOk", () => {
  it("true only on exact non-empty match", () => {
    expect(unlockOk("s3cret", "s3cret")).toBe(true);
  });
  it("false on mismatch", () => {
    expect(unlockOk("nope", "s3cret")).toBe(false);
  });
  it("false when either side is empty", () => {
    expect(unlockOk("", "s3cret")).toBe(false);
    expect(unlockOk("s3cret", "")).toBe(false);
    expect(unlockOk("s3cret", undefined)).toBe(false);
  });
});
