import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
  PUPPET_MODE_MAP,
  SECTION_ACTION_MAP,
  CLICK_CYCLE,
  INTENT_ACTIONS,
  spriteCSS,
  spriteHTML,
  spriteJS,
} from "../src/render/fx/sprite.js";

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
