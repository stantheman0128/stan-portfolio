import { describe, expect, it } from "vitest";
import { spriteJS } from "../src/render/fx/sprite.js";
import { LINES, MOODS, PERFORMANCES } from "../src/render/fx/sprite-data.js";
import {
  DIRECTOR_CONFIG,
  createLocalPlan,
  isRemoteEligible,
  sanitizeDirectorContext,
  validateDirectorPlan,
} from "../src/render/fx/sprite-director.js";

describe("Paper Stan local director", () => {
  it("turns each supported visitor event into a bounded plan", () => {
    const contexts = [
      { event: "hover", mood: "calm" },
      { event: "tap", mood: "cheerful" },
      { event: "section", section: "works", mood: "miffed" },
      { event: "project-dwell", mood: "sleepy", dwell: "lingering" },
      { event: "cursor", mood: "calm" },
    ];

    for (const context of contexts) {
      const plan = createLocalPlan(context);
      expect(DIRECTOR_CONFIG.allowedGoals).toContain(plan.goal);
      expect(Object.keys(MOODS)).toContain(plan.mood);
      expect(DIRECTOR_CONFIG.allowedPurposes).toContain(plan.purpose);
      expect(plan.expiresInMs).toBeGreaterThanOrEqual(DIRECTOR_CONFIG.minExpiryMs);
      expect(plan.expiresInMs).toBeLessThanOrEqual(DIRECTOR_CONFIG.maxExpiryMs);
      if (plan.performance) expect(PERFORMANCES).toHaveProperty(plan.performance);
      if (plan.linePool) expect(LINES).toHaveProperty(plan.linePool);
      expect(plan).not.toHaveProperty("line");
      expect(plan).not.toHaveProperty("action");
    }
  });

  it("forwards only a small, semantic context to a remote director", () => {
    const context = sanitizeDirectorContext({
      event: "section",
      mood: "cheerful",
      section: "works",
      dwell: "lingering",
      clientX: 912,
      clientY: 341,
      projectTitle: "Private prototype title",
      textInput: "Never forward this",
      dom: { outerHTML: "<section>...</section>" },
    });

    expect(context).toEqual({
      event: "section",
      mood: "cheerful",
      section: "works",
      dwell: "lingering",
    });
    expect(JSON.stringify(context)).not.toContain("912");
    expect(JSON.stringify(context)).not.toContain("Private prototype");
  });

  it("rejects a remote plan that attempts an unknown action or mismatched section", () => {
    const context = sanitizeDirectorContext({ event: "section", section: "works", mood: "calm" });

    expect(validateDirectorPlan({
      goal: "introduce_section",
      mood: "cheerful",
      purpose: "section",
      performance: "section.works.cheerful",
      linePool: "section",
      expiresInMs: 3600,
    }, context)).toMatchObject({
      performance: "section.works.cheerful",
      mood: "cheerful",
    });

    expect(validateDirectorPlan({
      goal: "introduce_section",
      mood: "cheerful",
      purpose: "section",
      performance: "frontFlip",
      linePool: "section",
      expiresInMs: 3600,
    }, context)).toBeNull();

    expect(validateDirectorPlan({
      goal: "introduce_section",
      mood: "cheerful",
      purpose: "section",
      performance: "section.about.cheerful",
      linePool: "section",
      expiresInMs: 3600,
    }, context)).toBeNull();
  });

  it("only considers a remote model for deliberate, meaningful events", () => {
    expect(isRemoteEligible(sanitizeDirectorContext({ event: "hover", mood: "calm" }))).toBe(false);
    expect(isRemoteEligible(sanitizeDirectorContext({ event: "tap", mood: "calm" }))).toBe(false);
    expect(isRemoteEligible(sanitizeDirectorContext({ event: "section", section: "about", mood: "calm" }))).toBe(true);
    expect(isRemoteEligible(sanitizeDirectorContext({ event: "project-dwell", mood: "calm" }))).toBe(true);
  });

  it("keeps the browser bridge opt-in and queues remote plans without interrupting a live action", () => {
    for (const token of [
      "remoteDirectorEnabled",
      "selectDirectorPlan",
      "requestRemotePlan",
      "remotePlanCache",
      "validateDirectorPlan(payload.plan, context)",
      "isRemoteEligible(context)",
    ]) {
      expect(spriteJS).toContain(token);
    }
    expect(spriteJS).toContain(DIRECTOR_CONFIG.remoteFeatureQuery);
    expect(() => new Function(spriteJS)).not.toThrow();
  });
});
