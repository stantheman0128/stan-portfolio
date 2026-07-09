import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
  PUPPET_MODE_MAP,
  SECTION_ACTION_MAP,
  CLICK_CYCLE,
  INTENT_ACTIONS,
  AMBIENT_ACTIONS,
  AMBIENT_ORIENTATIONS,
  TAP_ACTIONS,
  spriteCSS,
  spriteHTML,
  spriteJS,
} from "../src/render/fx/sprite.js";
import {
  EXPRESSIONS,
  INTERACTION_POLICY,
  LINES,
  MOODS,
  PERFORMANCES,
} from "../src/render/fx/sprite-data.js";

// The kit's motions.json is the authority on which actions actually exist.
const motions = JSON.parse(
  readFileSync(
    fileURLToPath(new URL("../public/moana-puppet-kit/motions.json", import.meta.url)),
    "utf8",
  ),
);
const VALID_ACTIONS = new Set(Object.keys(motions.actions));
const VALID_ORIENTATIONS = new Set(Object.keys(motions.orientations));

// Every mode the behavior engine passes to setMode() must have a mapping.
const ENGINE_MODES = ["idle", "look", "sniffa", "scratch", "yay", "poke", "roll", "sleep"];

describe("puppet action maps only reference real kit actions", () => {
  it("PUPPET_MODE_MAP covers every engine mode with a valid action", () => {
    for (const mode of ENGINE_MODES) {
      expect(PUPPET_MODE_MAP[mode], `mode "${mode}" is unmapped`).toBeDefined();
      expect(VALID_ACTIONS.has(PUPPET_MODE_MAP[mode].action)).toBe(true);
      if (PUPPET_MODE_MAP[mode].orientation) {
        expect(VALID_ORIENTATIONS.has(PUPPET_MODE_MAP[mode].orientation)).toBe(true);
      }
    }
  });

  it("SECTION_ACTION_MAP entries reference valid actions", () => {
    for (const [key, cfg] of Object.entries(SECTION_ACTION_MAP)) {
      expect(VALID_ACTIONS.has(cfg.action), `section "${key}" -> ${cfg.action}`).toBe(true);
      if (cfg.orientation) expect(VALID_ORIENTATIONS.has(cfg.orientation)).toBe(true);
    }
  });

  it("CLICK_CYCLE and INTENT_ACTIONS are all valid actions", () => {
    for (const a of CLICK_CYCLE) expect(VALID_ACTIONS.has(a), `click egg ${a}`).toBe(true);
    for (const a of INTENT_ACTIONS) expect(VALID_ACTIONS.has(a), `intent ${a}`).toBe(true);
  });

  it("does not showcase the compat-only actions in the click cycle", () => {
    for (const banned of ["bow", "paperBendIn", "paperBendOut"]) {
      expect(CLICK_CYCLE).not.toContain(banned);
    }
  });

  it("ambient and tap pools only reference real actions/orientations", () => {
    for (const a of AMBIENT_ACTIONS) expect(VALID_ACTIONS.has(a), `ambient ${a}`).toBe(true);
    for (const a of TAP_ACTIONS) expect(VALID_ACTIONS.has(a), `tap ${a}`).toBe(true);
    for (const o of AMBIENT_ORIENTATIONS) expect(VALID_ORIENTATIONS.has(o), `orient ${o}`).toBe(true);
  });

  it("actually uses most of the kit's motion range", () => {
    const usedActions = new Set([
      ...Object.values(PUPPET_MODE_MAP).map((v) => v.action),
      ...Object.values(SECTION_ACTION_MAP).map((v) => v.action),
      ...CLICK_CYCLE, ...INTENT_ACTIONS, ...AMBIENT_ACTIONS, ...TAP_ACTIONS,
    ]);
    const usedOrients = new Set([
      "front",
      ...Object.values(SECTION_ACTION_MAP).map((v) => v.orientation).filter(Boolean),
      ...AMBIENT_ORIENTATIONS,
    ]);
    // bow / paperBendIn / paperBendOut are compat-only; the kit says not to show them.
    const compat = new Set(["bow", "paperBendIn", "paperBendOut"]);
    const unusedActions = [...VALID_ACTIONS].filter((a) => !usedActions.has(a) && !compat.has(a));
    const unusedOrients = [...VALID_ORIENTATIONS].filter((o) => !usedOrients.has(o));
    expect(unusedActions, `unused actions: ${unusedActions.join(", ")}`).toHaveLength(0);
    expect(unusedOrients, `unused orientations: ${unusedOrients.join(", ")}`).toHaveLength(0);
  });
});

describe("the hedgehog actor is fully replaced", () => {
  it("mounts a puppet host and drops the hedgehog sheet", () => {
    expect(spriteHTML).toContain('id="puppet-host"');
    expect(spriteHTML).not.toContain("sheet");
  });

  it("no code references the retired hedgehog webp", () => {
    for (const src of [spriteCSS, spriteHTML, spriteJS]) {
      expect(src).not.toContain("sprite-hedgehog");
    }
  });

  it("interpolates the maps into the runtime script (single source of truth)", () => {
    expect(spriteJS).toContain("MODE_MAP");
    expect(spriteJS).toContain("MoanaPuppet");
  });
});

function visitMotionReferences(value, path = "root") {
  if (Array.isArray(value)) {
    value.forEach((item, index) => visitMotionReferences(item, `${path}[${index}]`));
    return;
  }
  if (!value || typeof value !== "object") return;

  if (value.action) {
    expect(VALID_ACTIONS.has(value.action), `${path}.action -> ${value.action}`).toBe(true);
  }
  if (value.orientation) {
    expect(VALID_ORIENTATIONS.has(value.orientation), `${path}.orientation -> ${value.orientation}`).toBe(true);
  }
  Object.entries(value).forEach(([key, child]) => visitMotionReferences(child, `${path}.${key}`));
}

describe("Paper Stan alive data contract", () => {
  it("exports the two independent facial expressions", () => {
    expect(EXPRESSIONS).toEqual(["smile", "frown"]);
  });

  it("keeps every mood and performance motion inside the shipped kit vocabulary", () => {
    visitMotionReferences(MOODS, "MOODS");
    visitMotionReferences(PERFORMANCES, "PERFORMANCES");
  });

  it("gives each mood a real idle pool and pacing policy", () => {
    expect(Object.keys(MOODS).sort()).toEqual(["calm", "cheerful", "miffed", "sleepy"]);
    for (const [mood, config] of Object.entries(MOODS)) {
      expect(config.idlePool, `${mood} needs an idle pool`).toBeInstanceOf(Array);
      expect(config.idlePool.length).toBeGreaterThan(0);
      expect(config.pacing).toBeGreaterThan(0);
      expect(config.gazeEagerness).toBeGreaterThan(0);
      expect(EXPRESSIONS, `${mood} needs an expression bias`).toContain(config.expression);
      expect(Object.keys(MOODS), `${mood} needs a line-pool key`).toContain(config.linePool);
    }
  });

  it("defines cancellable multi-step performances", () => {
    for (const [name, performance] of Object.entries(PERFORMANCES)) {
      const sequences = Array.isArray(performance) ? [performance] : Object.values(performance);
      for (const sequence of sequences) {
        expect(sequence, `${name} must be a sequence`).toBeInstanceOf(Array);
        expect(sequence.length, `${name} needs more than one beat`).toBeGreaterThanOrEqual(2);
        for (const beat of sequence) {
          expect(beat.ms, `${name} beat needs a duration`).toBeGreaterThan(0);
          expect(EXPRESSIONS).toContain(beat.expression);
        }
      }
    }
  });

  it("keeps baked lines varied, first-person, and free of dashes or emoji", () => {
    const firstPerson = /\b(?:I|I'm|I've|I'll|me|my|mine)\b/i;
    const emoji = /\p{Extended_Pictographic}/u;

    for (const [situation, moods] of Object.entries(LINES)) {
      expect(Object.keys(moods).sort(), `${situation} needs every mood`).toEqual(Object.keys(MOODS).sort());
      for (const [mood, lines] of Object.entries(moods)) {
        expect(lines.length, `${situation}.${mood} needs variety`).toBeGreaterThanOrEqual(6);
        expect(lines.length, `${situation}.${mood} should stay reviewable`).toBeLessThanOrEqual(12);
        for (const line of lines) {
          expect(line, `${situation}.${mood} must be first person`).toMatch(firstPerson);
          expect(line, `${situation}.${mood} contains a dash`).not.toMatch(/[\u2013\u2014]/u);
          expect(line, `${situation}.${mood} contains emoji`).not.toMatch(emoji);
        }
      }
    }
  });

  it("inlines the alive data and shadows head effects on the mounted instance", () => {
    for (const token of ["MOODS", "LINES", "PERFORMANCES", "applyHeadEffects", "function perform("]) {
      expect(spriteJS).toContain(token);
    }
    expect(spriteJS).toContain("puppet.applyHeadEffects = function");
    expect(spriteJS).not.toContain("prototype.applyHeadEffects");
  });

  it("debounces transient hover and lets a gesture own its full duration", () => {
    expect(INTERACTION_POLICY.hoverDwellMs).toBeGreaterThanOrEqual(200);
    expect(INTERACTION_POLICY.hoverCooldownMs).toBeGreaterThan(INTERACTION_POLICY.hoverDwellMs);
    for (const token of ["hoverTimer", "pointerleave", "gestureToken", "activePurpose", "gestureToken !== token"]) {
      expect(spriteJS).toContain(token);
    }
  });
});
