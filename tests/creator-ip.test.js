import { describe, it, expect } from "vitest";
import { isCreatorIp } from "../functions/_lib/creator.js";

describe("isCreatorIp", () => {
  it("matches a single allowed ip", () => {
    expect(isCreatorIp("1.2.3.4", "1.2.3.4")).toBe(true);
  });
  it("matches within a comma list, ignoring spaces", () => {
    expect(isCreatorIp("1.2.3.4", "9.9.9.9, 1.2.3.4")).toBe(true);
  });
  it("rejects a non-listed ip", () => {
    expect(isCreatorIp("1.2.3.4", "9.9.9.9")).toBe(false);
  });
  it("is false when either side is empty", () => {
    expect(isCreatorIp("", "1.2.3.4")).toBe(false);
    expect(isCreatorIp("1.2.3.4", "")).toBe(false);
    expect(isCreatorIp("1.2.3.4", undefined)).toBe(false);
  });
});
