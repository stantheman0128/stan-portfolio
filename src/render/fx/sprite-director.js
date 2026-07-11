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

// The event owns its purpose. The local policy can choose the emotional read,
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

// sprite.js emits a self-contained browser script. It mirrors the small pure
// contract below instead of serializing function source, which build minifiers
// can make dependent on module-scoped identifiers that do not exist at runtime.
export const spriteDirectorRuntime = `
  var DIRECTOR_CONFIG = ${JSON.stringify(DIRECTOR_CONFIG)};
  function sanitizeDirectorContext(input, config) {
    config = config || DIRECTOR_CONFIG;
    var source = input && typeof input === "object" && !Array.isArray(input) ? input : {};
    var event = config.allowedEvents.includes(source.event) ? source.event : "tap";
    var mood = config.allowedMoods.includes(source.mood) ? source.mood : "calm";
    var context = { event: event, mood: mood };
    if (event === "section" && config.allowedSections.includes(source.section)) context.section = source.section;
    if (config.allowedDwellBuckets.includes(source.dwell)) context.dwell = source.dwell;
    return context;
  }
  function directorPlanShape(input, mood, config) {
    config = config || DIRECTOR_CONFIG;
    var context = sanitizeDirectorContext(input, config);
    var selectedMood = config.allowedMoods.includes(mood) ? mood : context.mood;
    if (context.event === "hover") {
      return { goal: "acknowledge", mood: "cheerful", purpose: "hover", performance: null, linePool: null, expiresInMs: 1800 };
    }
    if (context.event === "section") {
      var section = context.section || "hero";
      return {
        goal: "introduce_section",
        mood: selectedMood,
        purpose: "section",
        performance: "section." + section + "." + selectedMood,
        linePool: "section",
        expiresInMs: 3600,
      };
    }
    if (context.event === "project-dwell") {
      return { goal: "invite_project", mood: selectedMood, purpose: "interaction", performance: null, linePool: "suggest", expiresInMs: 9000 };
    }
    if (context.event === "cursor") {
      return { goal: "inspect_cursor", mood: "cheerful", purpose: "event", performance: null, linePool: "bother", expiresInMs: 2400 };
    }
    return {
      goal: "acknowledge",
      mood: selectedMood,
      purpose: "interaction",
      performance: "tap." + selectedMood,
      linePool: "tap",
      expiresInMs: 2400,
    };
  }
  function validateDirectorPlan(candidate, input, config) {
    config = config || DIRECTOR_CONFIG;
    if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) return null;
    var fields = ["goal", "mood", "purpose", "performance", "linePool", "expiresInMs"];
    if (Object.keys(candidate).some(function(key) { return !fields.includes(key); })) return null;
    if (!config.allowedMoods.includes(candidate.mood)) return null;
    var expected = directorPlanShape(input, candidate.mood, config);
    if (candidate.goal !== expected.goal || candidate.mood !== expected.mood || candidate.purpose !== expected.purpose) return null;
    if (candidate.performance !== expected.performance || candidate.linePool !== expected.linePool) return null;
    if (candidate.performance && !config.performanceKeys.includes(candidate.performance)) return null;
    if (candidate.linePool && !config.linePools.includes(candidate.linePool)) return null;
    var expiresInMs = candidate.expiresInMs;
    if (!Number.isInteger(expiresInMs) || expiresInMs < config.minExpiryMs || expiresInMs > config.maxExpiryMs) return null;
    if (expiresInMs !== expected.expiresInMs) return null;
    return Object.assign({}, expected, { expiresInMs: expiresInMs });
  }
  function createLocalPlan(input, config) {
    config = config || DIRECTOR_CONFIG;
    var context = sanitizeDirectorContext(input, config);
    return validateDirectorPlan(directorPlanShape(context, context.mood, config), context, config);
  }
`;
