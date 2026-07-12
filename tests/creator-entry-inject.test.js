import { describe, it, expect } from "vitest";
import { creatorEntryJS, normalizeRumTimestamp } from "../src/render/fx/creator-entry.js";

describe("creatorEntryJS", () => {
  it("does the unlock POST and reads the can-edit flag", () => {
    expect(creatorEntryJS).toContain("/api/unlock");
    expect(creatorEntryJS).toContain("can-edit");
  });
  it("loads /editor.js on the Edit button, not a page nav", () => {
    expect(creatorEntryJS).toContain("/editor.js");
    expect(creatorEntryJS).not.toContain('href = "/edit"');
  });
  it("offers an owner RUM panel backed by /api/rum-stats", () => {
    expect(creatorEntryJS).toContain("cst-rum-btn");
    expect(creatorEntryJS).toContain("/api/rum-stats");
    expect(creatorEntryJS).toContain("edit-key");
    expect(creatorEntryJS).toContain("function metricCard");
    expect(creatorEntryJS).toContain("var METRIC");
  });
  it("keeps bottom offsets parseable (semicolon before bottom: in cssText)", () => {
    expect(creatorEntryJS).toMatch(/box-shadow:[^"]+;\s*"/);
    expect(creatorEntryJS).toContain('BTN + "bottom:14px"');
    expect(creatorEntryJS).toContain('BTN + "bottom:58px"');
  });
  it("keeps ?unlock= in the URL after a successful verify", () => {
    expect(creatorEntryJS).toMatch(/showButtons\(\);\s*ensureDevUrl\(\);\s*\} else \{/);
    expect(creatorEntryJS).toContain("function ensureDevUrl()");
  });
  it("is a self-invoking string with no import/export", () => {
    expect(creatorEntryJS).toContain("(function");
    expect(creatorEntryJS).not.toContain("import ");
  });
  it("sends the selected day span in the POST body, not a hard-coded query string", () => {
    expect(creatorEntryJS).toContain("k: key, days: days");
    expect(creatorEntryJS).not.toContain("/api/rum-stats?days=7");
    expect(creatorEntryJS).toContain("function loadRum");
    expect(creatorEntryJS).toContain("cst-rum-range");
  });
  it("has a 7/14/30 day range switcher", () => {
    expect(creatorEntryJS).toContain("RUM_RANGES = [7, 14, 30]");
    expect(creatorEntryJS).toContain('aria-pressed');
  });
  it("draws a per-metric good-threshold bar", () => {
    expect(creatorEntryJS).toContain("function metricBar");
    expect(creatorEntryJS).toContain("var BAR_MAX");
    expect(creatorEntryJS).toContain("load_p95: 3000");
    expect(creatorEntryJS).toContain("cls_p75: 0.1");
  });
  it("renders a recent per-visit table with viewer-local time", () => {
    expect(creatorEntryJS).toContain("function recentBlock");
    // toLocaleString now takes explicit options; the bare no-arg call is gone.
    expect(creatorEntryJS).not.toContain("toLocaleString()");
    expect(creatorEntryJS).toContain("toLocaleString([]");
    expect(creatorEntryJS).toContain("hour12: false");
    expect(creatorEntryJS).toContain("你的時區");
    expect(creatorEntryJS).toContain("max-height:340px;overflow:auto");
  });
  it("normalizes UTC-without-zone timestamps before Date parsing", () => {
    // runtime string carries an inline mirror
    expect(creatorEntryJS).toContain("function normTs");
    expect(creatorEntryJS).toContain("new Date(normTs(r.timestamp))");
  });
  it("normalizeRumTimestamp forces UTC and is idempotent", () => {
    expect(normalizeRumTimestamp("2026-07-12 14:03:22")).toBe("2026-07-12T14:03:22Z");
    // already ISO-with-Z: untouched
    expect(normalizeRumTimestamp("2026-07-12T14:03:22Z")).toBe("2026-07-12T14:03:22Z");
    // has T but no Z: only the Z is appended
    expect(normalizeRumTimestamp("2026-07-12T14:03:22")).toBe("2026-07-12T14:03:22Z");
    expect(normalizeRumTimestamp(null)).toBe("");
    expect(normalizeRumTimestamp(undefined)).toBe("");
    // and it actually parses to the intended UTC instant
    expect(new Date(normalizeRumTimestamp("2026-07-12 14:03:22")).getTime())
      .toBe(Date.UTC(2026, 6, 12, 14, 3, 22));
  });
  it("labels metrics with their English abbreviations", () => {
    expect(creatorEntryJS).toContain("伺服器回應時間（TTFB");
    expect(creatorEntryJS).toContain("首次繪製（FCP");
    expect(creatorEntryJS).toContain("主內容出現（LCP");
    expect(creatorEntryJS).toContain("完整載入（Load");
    expect(creatorEntryJS).toContain("版面位移（CLS");
    expect(creatorEntryJS).toContain("傳輸量（Bytes");
    // Taiwan term, not the mainland 服務器
    expect(creatorEntryJS).not.toContain("服務器");
  });
  it("shows a static load-timeline legend under the range switcher", () => {
    expect(creatorEntryJS).toContain("function timelineLegend");
    expect(creatorEntryJS).toContain("rangeBar(d.days) +\n      timelineLegend()");
    expect(creatorEntryJS).toContain("伺服器送回第一個位元組");
    expect(creatorEntryJS).toContain("全部載完");
  });
  it("stays free of template-literal traps inside the runtime string", () => {
    expect(creatorEntryJS).not.toContain("`");
    expect(creatorEntryJS).not.toContain("${");
  });
  it("compiles as valid JS (no syntax traps in the runtime string)", () => {
    expect(() => new Function(creatorEntryJS)).not.toThrow();
  });
});
