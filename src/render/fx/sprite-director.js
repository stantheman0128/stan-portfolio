// Paper Stan's director plans intent, never animation frames. This module is
// deliberately DOM-free so the same vocabulary is testable in Node, Pages
// Functions, and the browser runtime serialized by sprite.js.
import { LINES, MOODS, PERFORMANCES } from "./sprite-data.js";

export const DIRECTOR_CONFIG = {
  minExpiryMs: 1800,
  maxExpiryMs: 12000,
  allowedEvents: ["hover", "tap", "section", "project-dwell", "cursor"],
  allowedGoals: ["acknowledge", "introduce_section", "invite_project", "inspect_cursor"],
  allowedPurposes: ["hover", "interaction", "section", "event"],
  allowedMoods: Object.keys(MOODS),
  allowedSections: ["hero", "about", "works", "patent", "contact"],
  allowedDwellBuckets: ["brief", "engaged", "lingering"],
  performanceKeys: Object.keys(PERFORMANCES),
  linePools: Object.keys(LINES),
};

export function sanitizeDirectorContext(input, config = DIRECTOR_CONFIG) {
  const source = input && typeof input === "object" && !Array.isArray(input) ? input : {};
  const event = config.allowedEvents.includes(source.event) ? source.event : "tap";
  const mood = config.allowedMoods.includes(source.mood) ? source.mood : "calm";
  const context = { event, mood };

  if (event === "section" && config.allowedSections.includes(source.section)) {
    context.section = source.section;
  }
  if (config.allowedDwellBuckets.includes(source.dwell)) {
    context.dwell = source.dwell;
  }
  return context;
}

// The event owns its purpose. A remote model can choose the emotional read,
// but cannot repurpose a section visit into a movement it was never meant to do.
export function directorPlanShape(input, mood, config = DIRECTOR_CONFIG) {
  const context = sanitizeDirectorContext(input, config);
  const selectedMood = config.allowedMoods.includes(mood) ? mood : context.mood;

  if (context.event === "hover") {
    return {
      goal: "acknowledge",
      mood: "cheerful",
      purpose: "hover",
      performance: null,
      linePool: null,
      expiresInMs: 1800,
    };
  }
  if (context.event === "section") {
    const section = context.section || "hero";
    return {
      goal: "introduce_section",
      mood: selectedMood,
      purpose: "section",
      performance: `section.${section}.${selectedMood}`,
      linePool: "section",
      expiresInMs: 3600,
    };
  }
  if (context.event === "project-dwell") {
    return {
      goal: "invite_project",
      mood: selectedMood,
      purpose: "interaction",
      performance: null,
      linePool: "suggest",
      expiresInMs: 9000,
    };
  }
  if (context.event === "cursor") {
    return {
      goal: "inspect_cursor",
      mood: "cheerful",
      purpose: "event",
      performance: null,
      linePool: "bother",
      expiresInMs: 2400,
    };
  }
  return {
    goal: "acknowledge",
    mood: selectedMood,
    purpose: "interaction",
    performance: `tap.${selectedMood}`,
    linePool: "tap",
    expiresInMs: 2400,
  };
}

export function validateDirectorPlan(candidate, input, config = DIRECTOR_CONFIG) {
  if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) return null;
  const fields = ["goal", "mood", "purpose", "performance", "linePool", "expiresInMs"];
  if (Object.keys(candidate).some((key) => !fields.includes(key))) return null;
  if (!config.allowedMoods.includes(candidate.mood)) return null;

  const expected = directorPlanShape(input, candidate.mood, config);
  if (candidate.goal !== expected.goal || candidate.mood !== expected.mood || candidate.purpose !== expected.purpose) return null;
  if (candidate.performance !== expected.performance || candidate.linePool !== expected.linePool) return null;
  if (candidate.performance && !config.performanceKeys.includes(candidate.performance)) return null;
  if (candidate.linePool && !config.linePools.includes(candidate.linePool)) return null;

  const expiresInMs = candidate.expiresInMs;
  if (!Number.isInteger(expiresInMs) || expiresInMs < config.minExpiryMs || expiresInMs > config.maxExpiryMs) {
    return null;
  }
  if (expiresInMs !== expected.expiresInMs) return null;
  return { ...expected, expiresInMs };
}

export function createLocalPlan(input, config = DIRECTOR_CONFIG) {
  const context = sanitizeDirectorContext(input, config);
  return validateDirectorPlan(directorPlanShape(context, context.mood, config), context, config);
}

// sprite.js emits a self-contained browser script. Keep the browser copy tied
// to these pure functions rather than maintaining a second director contract.
export const spriteDirectorRuntime = `
  var DIRECTOR_CONFIG = ${JSON.stringify(DIRECTOR_CONFIG)};
  var rawSanitizeDirectorContext = ${sanitizeDirectorContext.toString()};
  var rawDirectorPlanShape = ${directorPlanShape.toString()};
  var rawValidateDirectorPlan = ${validateDirectorPlan.toString()};
  var rawCreateLocalPlan = ${createLocalPlan.toString()};
  var sanitizeDirectorContext = function(input, config) {
    return rawSanitizeDirectorContext(input, config || DIRECTOR_CONFIG);
  };
  var directorPlanShape = function(input, mood, config) {
    return rawDirectorPlanShape(input, mood, config || DIRECTOR_CONFIG);
  };
  var validateDirectorPlan = function(candidate, input, config) {
    return rawValidateDirectorPlan(candidate, input, config || DIRECTOR_CONFIG);
  };
  var createLocalPlan = function(input, config) {
    return rawCreateLocalPlan(input, config || DIRECTOR_CONFIG);
  };
`;
