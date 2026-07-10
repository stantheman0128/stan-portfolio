import { describe, expect, it } from "vitest";
import { spriteJS } from "../src/render/fx/sprite.js";
import { LINES, MOODS, PERFORMANCES } from "../src/render/fx/sprite-data.js";
import {
  DIRECTOR_CONFIG,
  createLocalPlan,
  sanitizeDirectorContext,
  spriteDirectorRuntime,
  validateDirectorPlan,
} from "../src/render/fx/sprite-director.js";
import { spriteDialogueRuntime } from "../src/render/fx/paper-stan-dialogue.js";

describe("Paper Stan local director", () => {
  it("turns each supported visitor event into a bounded local plan", () => {
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

  it("normalizes only the fields local motion needs", () => {
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
  });

  it("rejects a local plan with an unknown action, wrong section, free-form line, or altered timing", () => {
    const context = sanitizeDirectorContext({ event: "section", section: "works", mood: "calm" });
    const base = {
      goal: "introduce_section",
      mood: "cheerful",
      purpose: "section",
      performance: "section.works.cheerful",
      linePool: "section",
      expiresInMs: 3600,
    };

    expect(validateDirectorPlan(base, context)).toMatchObject(base);
    expect(validateDirectorPlan({ ...base, performance: "frontFlip" }, context)).toBeNull();
    expect(validateDirectorPlan({ ...base, performance: "section.about.cheerful" }, context)).toBeNull();
    expect(validateDirectorPlan({ ...base, expiresInMs: 3601 }, context)).toBeNull();
    expect(validateDirectorPlan({ ...base, line: "I should not be here." }, context)).toBeNull();
  });

  it("keeps automatic movement local while the browser exposes a separate dialogue runtime", () => {
    for (const token of ["selectLocalPlan", "submitDialogueQuestion", "DIALOGUE_CONFIG", "sprite-ask"]) {
      expect(spriteJS).toContain(token);
    }
    expect(spriteJS).toContain('bAskSubmit.addEventListener("click"');
    for (const removed of ["requestRemotePlan", "remotePlanCache", "selectDirectorPlan", "plan.line ||"]) {
      expect(spriteJS).not.toContain(removed);
    }
    expect(() => new Function(spriteJS)).not.toThrow();
  });

  it("gives an open visitor question priority over delayed greetings and project nudges", () => {
    expect(spriteJS).toContain('dismissed || suggests >= 4 || dialogueBusy || bubble.classList.contains("on")');
    expect(spriteJS).toContain('if (bubble.classList.contains("on")) return;');
    expect(spriteJS).toContain('bubble.classList.contains("asking") && !opts.dialogueReply');
    expect(spriteJS).toContain('!bubble.classList.contains("on") || bubble.classList.contains("asking")');
  });

  it("keeps invitations local and queues only bounded conversational gestures", () => {
    for (const token of [
      "startConversationInvitation",
      "queueDialogueGesture",
      "sessionStorage",
      "visitIntent",
      "conversationStage",
      "followUp",
    ]) {
      expect(spriteJS).toContain(token);
    }
    expect(spriteJS).toContain('turn.reply.endsWith("?")');
    expect(spriteJS).toContain("body: JSON.stringify({ question: question, context: dialogueRequestContext() })");
    for (const disallowed of ["CF-Connecting-IP", "navigator.userAgent", "outerHTML"]) {
      expect(spriteJS).not.toContain(disallowed);
    }
  });

  it("executes serialized local and dialogue helpers with their runtime configuration", () => {
    // Vite can minify the module binding used in a default parameter. The
    // serialized runtime must still work because its wrappers pass config.
    const minifiedDirector = spriteDirectorRuntime.replaceAll("config = DIRECTOR_CONFIG", "config = missingDirectorConfig");
    const minifiedDialogue = spriteDialogueRuntime.replaceAll("config = DIALOGUE_CONFIG", "config = missingDialogueConfig");
    const director = new Function(`${minifiedDirector} return { sanitizeDirectorContext, createLocalPlan };`)();
    const dialogue = new Function(`${minifiedDialogue} return { normalizeDialogueQuestion, sanitizeDialogueContext, validateDialogueReply, validateDialogueTurn };`)();

    expect(director.sanitizeDirectorContext({ event: "section", section: "works", mood: "calm" }))
      .toEqual({ event: "section", section: "works", mood: "calm" });
    expect(director.createLocalPlan({ event: "tap", mood: "calm" })).toMatchObject({ performance: "tap.calm" });
    expect(dialogue.normalizeDialogueQuestion("  What did you build?  ")).toBe("What did you build?");
    expect(dialogue.validateDialogueReply("I built Course Checker to inspect graduation rules.")).toBe(
      "I built Course Checker to inspect graduation rules.",
    );
    expect(dialogue.sanitizeDialogueContext({ section: "works", visitIntent: "curious", clientX: 912 }))
      .toEqual({ section: "works", visitIntent: "curious" });
    expect(dialogue.validateDialogueTurn({
      reply: "I built Course Checker to inspect graduation rules.",
      tone: "curious",
      gesture: "think",
      followUp: "I'm curious: what should I show you next?",
    })).toMatchObject({ tone: "curious", gesture: "think" });
  });

  it("does not capture build-time helper names inside browser runtime strings", () => {
    for (const runtime of [spriteDirectorRuntime, spriteDialogueRuntime]) {
      expect(runtime).not.toContain("rawSanitize");
      expect(runtime).not.toContain("rawValidate");
      expect(runtime).not.toContain("rawCreate");
    }
  });
});
