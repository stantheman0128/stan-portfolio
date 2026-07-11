import { EXPRESSIONS, INTERACTION_POLICY, LINES, MOODS, PERFORMANCES } from "./sprite-data.js";
import { spriteDirectorRuntime } from "./sprite-director.js";
import { spriteDialogueRuntime } from "./paper-stan-dialogue.js";

export { EXPRESSIONS, INTERACTION_POLICY, LINES, MOODS, PERFORMANCES } from "./sprite-data.js";
export {
  DIRECTOR_CONFIG,
  createLocalPlan,
  sanitizeDirectorContext,
  validateDirectorPlan,
} from "./sprite-director.js";
export {
  DIALOGUE_CONFIG,
  completeDialogueTurn,
  createFallbackDialogueTurn,
  createProjectContinuationTurn,
  normalizeDialogueQuestion,
  sanitizeDialogueContext,
  sanitizeDialogueHistory,
  sanitizeDialogueRequest,
  validateDialogueReply,
  validateDialogueTurn,
} from "./paper-stan-dialogue.js";

// The guide sprite v7: the hand-drawn paper self-portrait ("Paper Stan", kit in
// /moana-puppet-kit) replaces the licensed hedgehog. The character is the site
// owner as a palm-sized paper doll who personally walks visitors through his own
// work, so every line is first person. The behavior/personality engine is
// unchanged (roam, cursor-boop, quest-guiding, bubbles, quips); only the actor
// swapped. The engine still drives the character through setMode(m) + face(left);
// gesture()/actor map onto MoanaPuppet so the character can be re-skinned by
// editing these tables.
// Layer contract: #sprite = position (JS translate) > #puppet-host = the
// MoanaPuppet element (its own pieces, shadow, rAF loop). The host transform is
// composed from two CSS vars: --flip (facing) and --hscale (hover/press).
//
// Motion range: nearly the whole kit is used. Idle draws from a wide gesture
// pool (head tilts, paper turns, head-roll, twist, lean-back, hands-in, nod,
// nose-pulse) plus direction-aware glances; taps fan out across a big reaction
// pool including the explode-and-reassemble paper trick; drag and wheel-zoom are
// direct. Bubbles sit beside the mouth and follow him. Copy avoids em dashes.

// Engine mode -> puppet action. Exported so the runtime script and the unit
// test share one source (interpolated below with JSON.stringify).
export const PUPPET_MODE_MAP = {
  idle: { action: "idle" },
  look: { action: "curious" },
  sniffa: { action: "playful" },
  scratch: { action: "thinking" },
  yay: { action: "happy" },
  poke: { action: "beckon" },
  roll: { action: "playful" },
  sleep: { action: "shy" },
};

// Which gesture the puppet plays when a page section takes over the viewport.
export const SECTION_ACTION_MAP = {
  hero: { action: "greeting" },
  about: { action: "shy", orientation: "shyDown" },
  works: { action: "beckon", orientation: "lookLeft" },
  patent: { action: "happy", orientation: "heroUp" },
  contact: { action: "bothBigWave" },
};

// Occasional one-liner when a section takes over (rate-limited, low chance).
export const SECTION_LINES = {
  about: "That's me. Roughly.",
  works: "Pick one. They've all got a story.",
  patent: "Still can't quite believe this one's official.",
  contact: "You made it to the bottom. Respectable.",
};

// The showy flips he cycles through when a tap lands on the "flip" reaction.
export const CLICK_CYCLE = ["frontFlip", "backFlip"];

// Actions the engine triggers directly for onboarding, tour, quest, and errors.
export const INTENT_ACTIONS = [
  "greeting", "bothBigWave", "beckon", "sad", "happy",
  "curious", "shakeHead", "bothWave", "playful", "weird",
];

// Ambient idle life draws randomly from these, so a resting Paper Stan never
// looks like he is looping the same few moves.
export const AMBIENT_ACTIONS = [
  "curious", "playful", "thinking", "headRoll", "twist",
  "leanBack", "handsIn", "nod", "nosePulse",
];
export const AMBIENT_ORIENTATIONS = [
  "tiltLeft", "tiltRight", "paperLeft", "paperRight", "lookLeft", "lookRight", "shyDown",
];

// A tap fans out across this pool (plus flee / flip / explode handled specially).
export const TAP_ACTIONS = [
  "shakeHead", "waveRight", "waveLeft", "bothWave", "playful", "nod",
  "leanBack", "headRoll", "twist", "nosePulse", "weird", "beckonBoth", "beckonLeft",
];

export const CONVERSATION_INTENTS = {
  projects: {
    label: "Looking at projects",
    question: "I'm here because I'm looking at your projects.",
  },
  recruiting: {
    label: "Recruiting",
    question: "I'm here because I'm recruiting.",
  },
  curious: {
    label: "Just curious",
    question: "I'm here because I'm curious.",
  },
};

export const spriteCSS = `
#sprite{position:fixed;left:0;top:0;z-index:70;pointer-events:none;will-change:transform;transition:transform 1.15s cubic-bezier(.33,.75,.35,1)}
#sprite.s-scurrying{transition-duration:.72s;transition-timing-function:cubic-bezier(.45,.05,.55,.95)}
#puppet-host{--moana-size:112px;--flip:1;--hscale:1;pointer-events:auto;cursor:grab;touch-action:none;transform:scaleX(var(--flip)) scale(var(--hscale));transform-origin:50% 62%;transition:transform .3s cubic-bezier(.22,1,.36,1)}
#puppet-host.dragging{cursor:grabbing}
#sprite.s-face-left #puppet-host{--flip:-1}
#puppet-host:hover{--hscale:1.1}
#puppet-host:active{--hscale:.96}
#sprite.s-sleep{opacity:.62}
#sprite-ask{position:absolute;right:-4px;top:-8px;z-index:2;width:24px;height:24px;padding:0;display:grid;place-items:center;pointer-events:auto;border:1px solid #17151a;border-radius:50%;background:#fffdfa;color:#17151a;font:700 13px/1 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;cursor:pointer;box-shadow:0 3px 8px rgba(41,31,23,.16)}
#sprite-ask:hover,#sprite-ask:focus-visible{background:#17151a;color:#fffdfa}
#sprite-ask:focus-visible{outline:2px solid #c2522d;outline-offset:2px}
@media (prefers-reduced-motion:reduce){#sprite{transition:none}#puppet-host{transition:none}#puppet-host:hover{--hscale:1}#puppet-host:active{--hscale:1}}
#bubble{position:fixed;left:0;top:0;z-index:71;max-width:15.5rem;background:#fffdfa;border:1px solid #d8d0c4;border-radius:12px;padding:.65rem .8rem;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:12px;line-height:1.55;color:#3a3833;box-shadow:0 8px 28px rgba(41,31,23,.12);display:none}
#bubble.on{display:block}
#bubble::before,#bubble::after{content:"";position:absolute;width:0;height:0}
#bubble.point-left::before{left:-9px;top:calc(50% - 9px);border-top:9px solid transparent;border-bottom:9px solid transparent;border-right:9px solid #d8d0c4}
#bubble.point-left::after{left:-7px;top:calc(50% - 7px);border-top:7px solid transparent;border-bottom:7px solid transparent;border-right:8px solid #fffdfa}
#bubble.point-right::before{right:-9px;top:calc(50% - 9px);border-top:9px solid transparent;border-bottom:9px solid transparent;border-left:9px solid #d8d0c4}
#bubble.point-right::after{right:-7px;top:calc(50% - 7px);border-top:7px solid transparent;border-bottom:7px solid transparent;border-left:8px solid #fffdfa}
#bubble .b-x{position:absolute;top:4px;right:7px;all:unset;cursor:pointer;color:#b7b2a8;font-size:12px;padding:2px 4px}
#bubble .b-x:hover{color:#c2522d}
#bubble .b-text{white-space:pre-line}
#bubble .b-chips{margin-top:.5rem;display:flex;gap:6px;flex-wrap:wrap}
#bubble .b-chips button{all:unset;cursor:pointer;border:1px solid #17151a;border-radius:999px;padding:.22rem .7rem;font-size:11.5px}
#bubble .b-chips button:hover,#bubble .b-chips button:focus-visible{background:#17151a;color:#fffdfa}
#bubble .b-chips button:focus-visible{outline:2px solid #c2522d;outline-offset:2px}
#bubble .b-ask-form{display:none;grid-template-columns:minmax(0,1fr) 28px;gap:5px;margin-top:.55rem}
#bubble.asking .b-ask-form{display:grid}
#bubble .b-ask-input{box-sizing:border-box;min-width:0;width:100%;border:1px solid #17151a;border-radius:4px;background:#fffdfa;padding:.38rem .48rem;font:inherit;color:#17151a}
#bubble .b-ask-input:focus-visible{outline:2px solid #c2522d;outline-offset:1px}
#bubble .b-ask-submit{border:1px solid #17151a;border-radius:4px;background:#17151a;color:#fffdfa;font:700 15px/1 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;cursor:pointer}
#bubble .b-ask-submit:hover,#bubble .b-ask-submit:focus-visible{background:#c2522d;border-color:#c2522d}
#bubble .b-ask-submit:focus-visible{outline:2px solid #c2522d;outline-offset:1px}
#bubble .b-ask-input:disabled,#bubble .b-ask-submit:disabled{opacity:.55;cursor:wait}
@media print{#sprite,#bubble{display:none !important}}
@media (max-width:640px){#puppet-host{--moana-size:84px}#sprite-ask{width:22px;height:22px;font-size:12px}}
`;

export const spriteHTML = `
<div id="sprite" class="s-idle">
  <div id="puppet-host" aria-hidden="true"></div>
  <button id="sprite-ask" type="button" aria-label="Ask Paper Stan" title="Ask Paper Stan">?</button>
</div>
<div id="bubble" role="dialog" aria-label="Paper Stan">
  <button class="b-x" type="button" aria-label="Close Paper Stan conversation" title="Close conversation">&times;</button>
  <span class="b-text"></span>
  <div class="b-chips"></div>
  <form class="b-ask-form" hidden>
    <input class="b-ask-input" type="text" maxlength="420" autocomplete="off" placeholder="Ask about Stan or a project" aria-label="Ask Paper Stan about Stan or a project">
    <button class="b-ask-submit" type="submit" aria-label="Send question" title="Send question">&gt;</button>
  </form>
</div>
`;

export const spriteJS = `
(function () {
  var sprite = document.getElementById("sprite");
  var bubble = document.getElementById("bubble");
  var host = document.getElementById("puppet-host");
  var askButton = document.getElementById("sprite-ask");
  if (!sprite || !bubble || !host || !askButton || !window.QUEST) return;
  var bText = bubble.querySelector(".b-text");
  var bChips = bubble.querySelector(".b-chips");
  var bX = bubble.querySelector(".b-x");
  var bAskForm = bubble.querySelector(".b-ask-form");
  var bAskInput = bubble.querySelector(".b-ask-input");
  var bAskSubmit = bubble.querySelector(".b-ask-submit");
  if (!bText || !bChips || !bX || !bAskForm || !bAskInput || !bAskSubmit) return;

  var MODE_MAP = ${JSON.stringify(PUPPET_MODE_MAP)};
  var SECTION_MAP = ${JSON.stringify(SECTION_ACTION_MAP)};
  var SECTION_LINES = ${JSON.stringify(SECTION_LINES)};
  var FLIPS = ${JSON.stringify(CLICK_CYCLE)};
  var AMBIENT = ${JSON.stringify(AMBIENT_ACTIONS)};
  var AMBIENT_O = ${JSON.stringify(AMBIENT_ORIENTATIONS)};
  var MOODS = ${JSON.stringify(MOODS)};
  var LINES = ${JSON.stringify(LINES)};
  var PERFORMANCES = ${JSON.stringify(PERFORMANCES)};
  var EXPRESSIONS = ${JSON.stringify(EXPRESSIONS)};
  var INTERACTION_POLICY = ${JSON.stringify(INTERACTION_POLICY)};
  var CONVERSATION_INTENTS = ${JSON.stringify(CONVERSATION_INTENTS)};
${spriteDirectorRuntime}
${spriteDialogueRuntime}

  var q = window.QUEST.get();
  var DIALOGUE_SESSION_KEY = "paper-stan-conversation-v1";
  function loadDialogueMemory() {
    var fallback = { invited: false, visitIntent: null, conversationStage: "new" };
    try {
      var saved = JSON.parse(sessionStorage.getItem(DIALOGUE_SESSION_KEY) || "null");
      if (!saved || typeof saved !== "object") return fallback;
      var context = sanitizeDialogueContext(saved);
      return {
        invited: saved.invited === true,
        visitIntent: context.visitIntent || null,
        conversationStage: context.conversationStage || "new",
      };
    } catch (err) {
      return fallback;
    }
  }
  var conversation = loadDialogueMemory();
  var currentDialogueSection = "hero";
  function saveDialogueMemory() {
    try {
      sessionStorage.setItem(DIALOGUE_SESSION_KEY, JSON.stringify({
        invited: conversation.invited === true,
        visitIntent: conversation.visitIntent,
        conversationStage: conversation.conversationStage,
      }));
    } catch (err) {}
  }
  function dialogueRequestContext() {
    return sanitizeDialogueContext({
      section: currentDialogueSection,
      visitIntent: conversation.visitIntent,
      conversationStage: conversation.conversationStage,
    });
  }
  // This survives only while this page remains open. Do not add it to the
  // sessionStorage memory above: prior visitor text is intentionally absent.
  var dialogueHistory = null;
  function dialogueRequestHistory() {
    return sanitizeDialogueHistory(dialogueHistory);
  }
  function dialogueRequestPayload(question) {
    var payload = {
      question: question,
      context: dialogueRequestContext(),
      history: dialogueRequestHistory(),
    };
    if (!payload.history) delete payload.history;
    return payload;
  }
  function rememberDialogueTurn(turn) {
    dialogueHistory = { paperStanReply: turn.reply };
    if (turn.followUp) dialogueHistory.paperStanFollowUp = turn.followUp;
  }
  var dismissed = false;
  if (q.spriteDismissed) window.QUEST.dismissSprite(false);
  var reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  var lastBubble = 0, suggests = 0, lastScroll = 0, bubbleTimer = 0;
  var mode = "idle", moving = false, touring = false, dragging = false, x = 0, y = 0, faceLeft = false;
  var expression = "smile", mood = "calm", moodIntensity = 0, moodInitialIntensity = 0, moodSetAt = Date.now(), moodDuration = 1;
  var lastVisitorActivity = Date.now();
  var mouse = null;
  addEventListener("pointermove", function (e) {
    mouse = { x: e.clientX, y: e.clientY, t: Date.now() };
    noteVisitorActivity(mouse.t);
    queueGaze(e);
  }, { passive: true });

  // Actor adapter: the only code that knows the character is a puppet.
  var actor = {
    ready: false,
    puppet: null,
    expression: "smile",
    setMode: function (m) {
      if (!this.ready) return;
      var c = MODE_MAP[m] || MODE_MAP.idle;
      this.puppet.setAction(c.action);
      this.puppet.setOrientation(c.orientation || "front");
    },
    act: function (action, orientation) {
      if (!this.ready) return;
      this.puppet.setAction(action);
      this.puppet.setOrientation(orientation || "front");
    },
    setExpression: function (next) {
      this.expression = EXPRESSIONS.indexOf(next) === -1 ? "smile" : next;
      if (this.ready && this.puppet && this.puppet.applyHeadEffects) {
        this.puppet.applyHeadEffects(performance.now() / 1000, 1);
      }
    },
    playOnce: function (action) {
      if (!this.ready) return;
      this.puppet.playOnce(action);
    },
    layout: function (l) {
      if (this.ready && this.puppet.setLayout) this.puppet.setLayout(l);
    }
  };
  function shadowHeadEffects(puppet) {
    var kitHeadEffects = puppet.applyHeadEffects;
    puppet.applyHeadEffects = function (elapsed, motionScale) {
      kitHeadEffects.call(this, elapsed, motionScale);
      var frown = this.headEffects && this.headEffects.frown;
      if (frown) frown.style.opacity = (actor.expression === "frown" || this.action === "sad") ? "1" : "0";
    };
  }
  function mountPuppet() {
    if (actor.ready) return true;
    if (!window.MoanaPuppet) return false;
    actor.puppet = window.MoanaPuppet.mount(host, {
      assetBase: "/moana-puppet-kit/assets/",
      size: W, action: "idle", orientation: "front", shadow: "soft"
    });
    shadowHeadEffects(actor.puppet);
    actor.ready = true;
    actor.setExpression(expression);
    actor.setMode(mode);
    sprite.classList.toggle("s-face-left", faceLeft);
    return true;
  }
  (function waitForKit() {
    if (mountPuppet()) return;
    var tries = 0;
    var t = setInterval(function () {
      if (mountPuppet() || ++tries > 100) clearInterval(t);
    }, 50);
  })();

  // Scroll tracking doubles as a speed-reader detector: >2800px inside ~0.8s
  // while the quest is unfinished earns one (rationed) callout.
  var fastWin = [], lastSpeedQuip = 0;
  addEventListener("scroll", function () {
    var nowS = Date.now();
    lastScroll = nowS;
    noteVisitorActivity(nowS);
    fastWin.push({ t: nowS, y: scrollY });
    while (fastWin.length && nowS - fastWin[0].t > 800) fastWin.shift();
    if (Math.abs(scrollY - fastWin[0].y) > 2800 && nowS - lastSpeedQuip > 45000 && !dismissed) {
      var qq = window.QUEST.get();
      if (qq.pct < 100) {
        lastSpeedQuip = nowS;
        setTimeout(function () {
          say("Speed-reading, huh? The check marks can tell.", null, { force: true });
        }, 700);
      }
    }
  }, { passive: true });

  // Size drives both the puppet and the placement math. Puppet stage is 860x1120.
  // userScale is the wheel-zoom multiplier on top of the responsive base size.
  var userScale = 1, W = 112, H = 146;
  function baseSize() { return matchMedia("(max-width: 640px)").matches ? 84 : 112; }
  function measure() { W = Math.round(baseSize() * userScale); H = Math.round(W * 1120 / 860); }
  measure();
  function vw() { return document.documentElement.clientWidth; }
  function vh() { return document.documentElement.clientHeight; }
  function home() { return { x: vw() - W - 16, y: vh() - H - 14 }; }

  function setMode(m) {
    mode = m;
    sprite.className = (faceLeft ? "s-face-left " : "") + (m === "sleep" ? "s-sleep" : "");
    if (m === "idle") setExpression(MOODS[currentMood()].expression);
    actor.setMode(m);
  }
  function addFlag(cls, on) { sprite.classList.toggle(cls, on); }
  function face(left) {
    faceLeft = left;
    sprite.classList.toggle("s-face-left", left);
  }
  function setExpression(next) {
    expression = EXPRESSIONS.indexOf(next) === -1 ? "smile" : next;
    actor.setExpression(expression);
  }
  function isLateNight() {
    var hour = new Date().getHours();
    return hour >= 23 || hour < 6;
  }
  function setMood(next, intensity, duration) {
    if (!MOODS[next]) return;
    mood = next;
    moodInitialIntensity = typeof intensity === "number" ? intensity : 0.6;
    moodIntensity = moodInitialIntensity;
    moodSetAt = Date.now();
    moodDuration = duration || (next === "miffed" ? 45000 : next === "sleepy" ? 55000 : 24000);
    sprite.setAttribute("data-paper-mood", mood);
    if (mode === "idle" && !performing) setExpression(MOODS[mood].expression);
  }
  function currentMood() {
    var now = Date.now();
    if (mood !== "calm") {
      moodIntensity = Math.max(0, moodInitialIntensity * (1 - (now - moodSetAt) / moodDuration));
      if (moodIntensity <= 0.05) {
        mood = "calm";
        moodIntensity = 0;
        sprite.setAttribute("data-paper-mood", mood);
      }
    }
    if (mood === "calm" && (isLateNight() || now - lastVisitorActivity > 90000)) {
      mood = "sleepy";
      moodInitialIntensity = 0.6;
      moodIntensity = moodInitialIntensity;
      moodSetAt = now;
      moodDuration = 55000;
      sprite.setAttribute("data-paper-mood", mood);
    }
    return mood;
  }
  function noteVisitorActivity(now) {
    lastVisitorActivity = now || Date.now();
    if (mood === "sleepy" && !isLateNight()) setMood("calm", 0.35, 14000);
  }
  function chooseWeighted(pool) {
    var total = pool.reduce(function (sum, item) { return sum + (item.weight || 1); }, 0);
    var target = Math.random() * total;
    for (var i = 0; i < pool.length; i++) {
      target -= pool[i].weight || 1;
      if (target <= 0) return pool[i];
    }
    return pool[pool.length - 1];
  }
  var lastLineBySituation = {};
  function pickLine(situation) {
    var pool = LINES[situation] || LINES.tap;
    var moodKey = MOODS[currentMood()].linePool || currentMood();
    var lines = pool[moodKey] || pool.calm;
    var previous = lastLineBySituation[situation];
    var choices = lines.length > 1 ? lines.filter(function (line) { return line !== previous; }) : lines;
    var line = choices[Math.floor(Math.random() * choices.length)];
    lastLineBySituation[situation] = line;
    return line;
  }
  // Motion planning is intentionally local. The optional model only answers an
  // explicit visitor question below, so network latency never changes a gesture.
  function directorContext(event, details) {
    details = details || {};
    return sanitizeDirectorContext({
      event: event,
      mood: currentMood(),
      section: details.section,
      dwell: details.dwell,
    });
  }
  function selectLocalPlan(event, details) {
    var context = directorContext(event, details);
    return createLocalPlan(context);
  }
  function applyDirectorMood(plan, intensity, duration) {
    if (plan && plan.mood && MOODS[plan.mood] && plan.mood !== mood) {
      setMood(plan.mood, intensity || 0.5, duration || 22000);
    }
  }
  var performanceTimer = 0, performanceToken = 0, performing = false;
  var gestureTimer = 0, gestureToken = 0, activePurpose = "idle";
  var PURPOSE_PRIORITY = { gaze: 0, ambient: 1, hover: 2, section: 3, interaction: 4, event: 4, travel: 5 };
  function purposePriority(purpose) { return PURPOSE_PRIORITY[purpose] || PURPOSE_PRIORITY.event; }
  function cancelGesture() {
    gestureToken++;
    clearTimeout(gestureTimer);
    gestureTimer = 0;
    activePurpose = "idle";
    if (mode === "busy" && !moving && !dragging && !touring) setMode("idle");
  }
  function cancelPerformance() {
    performanceToken++;
    clearTimeout(performanceTimer);
    if (!performing) return;
    performing = false;
    activePurpose = "idle";
    if (!moving && !dragging && !touring) setMode("idle");
  }
  function perform(beats, purpose) {
    if (!actor.ready || dismissed || !Array.isArray(beats) || !beats.length) return;
    purpose = purpose || "interaction";
    if (performing && purposePriority(purpose) <= purposePriority(activePurpose)) return;
    cancelGesture();
    cancelPerformance();
    var token = ++performanceToken;
    var index = 0;
    performing = true;
    activePurpose = purpose;
    mode = "performing";
    sprite.className = faceLeft ? "s-face-left" : "";
    (function nextBeat() {
      if (token !== performanceToken || dismissed) return;
      var beat = beats[index++];
      if (!beat) {
        performing = false;
        activePurpose = "idle";
        if (!moving && !dragging && !touring) setMode("idle");
        return;
      }
      setExpression(beat.expression || MOODS[currentMood()].expression);
      actor.act(beat.action, beat.orientation || "front");
      performanceTimer = setTimeout(nextBeat, beat.ms || 700);
    })();
  }
  var GAZE_GRID = [
    ["paperLeft", "heroUp", "paperRight"],
    ["lookLeft", "front", "lookRight"],
    ["tiltLeft", "shyDown", "tiltRight"]
  ];
  var gazeZone = "", pendingGaze = "", lastGaze = 0, gazeTimer = 0;
  function gazeTarget(clientX, clientY) {
    var rect = sprite.getBoundingClientRect();
    if (!rect.width || !rect.height) return null;
    var col = clientX < rect.left + rect.width / 3 ? 0 : clientX > rect.right - rect.width / 3 ? 2 : 1;
    var row = clientY < rect.top + rect.height / 3 ? 0 : clientY > rect.bottom - rect.height / 3 ? 2 : 1;
    if (currentMood() === "miffed") col = 2 - col;
    return { key: row + ":" + col, orientation: GAZE_GRID[row][col] };
  }
  function queueGaze(e) {
    if (!actor.ready || mode !== "idle" || moving || dragging || touring || performing) return;
    if (e.pointerType === "touch") return;
    var target = gazeTarget(e.clientX, e.clientY);
    if (!target || target.key === gazeZone || target.key === pendingGaze) return;
    pendingGaze = target.key;
    var cfg = MOODS[currentMood()];
    var delay = Math.max(400, 400 / cfg.gazeEagerness) - Math.max(0, Date.now() - lastGaze);
    if (currentMood() === "sleepy") delay += 260;
    clearTimeout(gazeTimer);
    gazeTimer = setTimeout(function () {
      if (pendingGaze !== target.key || mode !== "idle" || moving || dragging || touring || performing) return;
      gazeZone = target.key;
      pendingGaze = "";
      lastGaze = Date.now();
      setExpression(MOODS[currentMood()].expression);
      actor.act("idle", target.orientation);
    }, Math.max(0, delay));
  }
  // A short gesture owns the puppet until its token expires. This keeps an old
  // timer from releasing a newer action and prevents low-purpose motion from
  // cutting through a visitor-facing response.
  function gesture(action, orientation, dur, purpose) {
    if (!actor.ready || dismissed) return false;
    purpose = purpose || "event";
    if (performing) {
      if (purposePriority(purpose) <= purposePriority(activePurpose)) return false;
      cancelPerformance();
    }
    if (mode === "busy" && purposePriority(purpose) <= purposePriority(activePurpose)) return false;
    cancelGesture();
    var token = ++gestureToken;
    activePurpose = purpose;
    mode = "busy";
    sprite.className = faceLeft ? "s-face-left" : "";
    setExpression(MOODS[currentMood()].expression);
    actor.act(action, orientation || "front");
    gestureTimer = setTimeout(function () {
      if (gestureToken !== token) return;
      gestureTimer = 0;
      activePurpose = "idle";
      if (mode === "busy" && !moving && !dragging) setMode("idle");
    }, dur || 1500);
    return true;
  }
  function towardPage() { return x > vw() / 2 ? "lookLeft" : "lookRight"; }
  var dialogueGestureTimer = 0, dialogueGestureToken = 0;
  function applyDialogueTone(tone) {
    if (tone === "bright" || tone === "playful") setMood("cheerful", 0.62, 22000);
    else if (tone === "kind") setMood("cheerful", 0.38, 18000);
    else setMood("calm", tone === "thoughtful" ? 0.5 : 0.36, 18000);
  }
  function dialogueGestureBeats(name) {
    if (name === "curious_look") {
      return [reactionBeat("curious", mouse && mouse.x < x ? "lookLeft" : "lookRight", 1050)];
    }
    if (name === "think") {
      return [reactionBeat("thinking", "tiltRight", 1250), reactionBeat("nod", "front", 580)];
    }
    if (name === "wave_right") {
      return [reactionBeat(faceLeft ? "waveLeft" : "waveRight", "front", 900), reactionBeat("happy", "heroUp", 680)];
    }
    if (name === "point_project") {
      return [reactionBeat("beckon", towardPage(), 860), reactionBeat("curious", "front", 650)];
    }
    if (name === "celebrate") {
      return [reactionBeat("happy", "heroUp", 720), reactionBeat("bothWave", "front", 920)];
    }
    if (name === "shy") {
      return [reactionBeat("shy", "shyDown", 980), reactionBeat("nod", "front", 620)];
    }
    return null;
  }
  function queueDialogueGesture(name, tone) {
    clearTimeout(dialogueGestureTimer);
    dialogueGestureTimer = 0;
    if (!DIALOGUE_CONFIG.allowedGestures.includes(name)) return;
    applyDialogueTone(tone);
    if (name === "none") return;
    var token = ++dialogueGestureToken;
    var queuedAt = Date.now();
    (function playWhenIdle() {
      if (token !== dialogueGestureToken || dismissed || Date.now() - queuedAt > 7000) return;
      if (!actor.ready || moving || dragging || touring || performing || mode !== "idle") {
        dialogueGestureTimer = setTimeout(playWhenIdle, 180);
        return;
      }
      var beats = dialogueGestureBeats(name);
      if (!beats) return;
      if (reduce) {
        var first = beats[0];
        gesture(first.action, first.orientation, Math.min(first.ms, 1200), "interaction");
      } else {
        perform(beats, "interaction");
      }
    })();
  }
  function place(nx, ny, instant) {
    nx = Math.max(6, Math.min(vw() - W - 6, nx));
    ny = Math.max(6, Math.min(vh() - H - 6, ny));
    if (Math.abs(nx - x) > 4) face(nx < x);
    x = nx; y = ny;
    if (instant || reduce) sprite.style.transition = "none";
    sprite.style.transform = "translate(" + x + "px," + y + "px)";
    if (instant || reduce) requestAnimationFrame(function () { if (!dragging) sprite.style.transition = ""; });
    if (bubble.classList.contains("on")) placeBubble();
  }
  // Short trips: scurry. Long trips: paper can't ball-roll, so it stays playful.
  function travel(nx, ny, then) {
    cancelPerformance();
    cancelGesture();
    activePurpose = "travel";
    if (reduce) { place(nx, ny); activePurpose = "idle"; if (then) then(); return; }
    var dist = Math.hypot(nx - x, ny - y);
    moving = true;
    var scurry = dist < 230;
    if (scurry) { setMode("idle"); addFlag("s-scurrying", true); }
    else setMode("roll");
    place(nx, ny);
    setTimeout(function () {
      moving = false;
      activePurpose = "idle";
      addFlag("s-scurrying", false);
      setMode("idle");
      if (bubble.classList.contains("on")) placeBubble();
      if (then) then();
    }, scurry ? 780 : 1200);
  }
  var h0 = home();
  place(h0.x, h0.y, true);
  addEventListener("resize", function () {
    measure();
    if (actor.ready) actor.puppet.setSize(W);
    if (!moving && !dragging) { var h = home(); place(h.x, h.y, true); }
  });

  function anchors() {
    var w = vw(), h = vh();
    return [
      home(),
      { x: w - W - 20, y: 84 },
      { x: 24, y: 76 },
      { x: 24, y: h * 0.45 },
      { x: w * 0.5 - W / 2, y: 60 },
      { x: w - W - 24, y: h * 0.45 }
    ];
  }
  (function roamLoop() {
    setTimeout(function () {
      if (!dismissed && !touring && !dragging && mode === "idle" && !moving && !document.hidden &&
          !bubble.classList.contains("on") && !reduce &&
          Date.now() - lastScroll > 3000) {
        var a = anchors()[Math.floor(Math.random() * 6)];
        if (Math.abs(a.x - x) + Math.abs(a.y - y) > 60) travel(a.x, a.y);
      }
      roamLoop();
    }, 15000 + Math.random() * 12000);
  })();

  // Idle life is weighted by the current mood, so cheerful Paper Stan reads
  // differently from calm, sleepy, or mildly miffed Paper Stan.
  (function lifeLoop() {
    var cfg = MOODS[currentMood()];
    setTimeout(function () {
      if (!dismissed && !touring && !dragging && mode === "idle" && !moving &&
          !document.hidden && !bubble.classList.contains("on")) {
        cfg = MOODS[currentMood()];
        var r = Math.random();
        if (reduce) {
          var gentle = chooseWeighted(cfg.idlePool);
          gesture(gentle.action, gentle.orientation, Math.min(gentle.ms, 1700), "ambient");
        } else if (currentMood() === "calm" && r < 0.04) {
          explode();
        } else if (r < 0.18) {
          gesture("curious", towardPage(), 1600, "ambient");
        } else {
          var beat = chooseWeighted(cfg.idlePool);
          gesture(beat.action, beat.orientation, beat.ms, "ambient");
        }
      }
      lifeLoop();
    }, (5200 + Math.random() * 6000) * cfg.pacing);
  })();

  // Bubbles sit beside his mouth (~42% down the box), vertically centered on it,
  // on whichever side has room: character on the left half -> bubble to the
  // right, and vice versa. A side tail points back at the mouth. While a bubble
  // is up, a rAF loop keeps it glued as he glides, gets dragged, or resizes.
  var followRAF = 0;
  function placeBubble() {
    var r = sprite.getBoundingClientRect();
    var mouthX = r.left + r.width * 0.5;
    var mouthY = r.top + r.height * 0.42;
    var bw = Math.min(268, vw() - 16);
    var bh = bubble.offsetHeight || 44;
    var onRight = mouthX < vw() * 0.5;
    var gap = r.width * 0.30 + 8;
    var left = onRight ? (mouthX + gap) : (mouthX - gap - bw);
    left = Math.max(8, Math.min(vw() - bw - 8, left));
    var top = Math.max(8, Math.min(vh() - bh - 8, mouthY - bh / 2));
    bubble.style.left = left + "px";
    bubble.style.top = top + "px";
    bubble.style.bottom = "auto";
    bubble.classList.toggle("point-left", onRight);
    bubble.classList.toggle("point-right", !onRight);
  }
  function startFollow() {
    if (followRAF) return;
    (function loop() {
      if (!bubble.classList.contains("on") || bubble.classList.contains("asking")) { followRAF = 0; return; }
      placeBubble();
      followRAF = requestAnimationFrame(loop);
    })();
  }
  var DEFAULT_ASK_PLACEHOLDER = "Ask about Stan or a project";
  var dialogueBusy = false, lastDialogueAt = 0, invitationAttempts = 0, dialogueRequestToken = 0;
  function setDialogueFormOpen(open) {
    bubble.classList.toggle("asking", !!open);
    bAskForm.hidden = !open;
    if (!open) {
      bAskInput.value = "";
      bAskInput.placeholder = DEFAULT_ASK_PLACEHOLDER;
    }
  }
  function setDialogueBusy(busy) {
    dialogueBusy = !!busy;
    bAskInput.disabled = dialogueBusy;
    bAskSubmit.disabled = dialogueBusy;
  }
  function openDialogue(prompt, placeholder) {
    if (dismissed || dialogueBusy) return;
    clearTimeout(bubbleTimer);
    bText.textContent = prompt || "I know my projects suspiciously well. Ask me what I've been building.";
    bChips.replaceChildren();
    setDialogueFormOpen(true);
    bAskInput.value = "";
    bAskInput.placeholder = placeholder || DEFAULT_ASK_PLACEHOLDER;
    bubble.classList.add("on");
    placeBubble();
    startFollow();
    setTimeout(function () { bAskInput.focus(); }, 0);
  }
  function dialogueHold(reply) {
    return Math.max(5200, Math.min(14000, reply.length * 34));
  }
  function startIntentConversation(intent) {
    var choice = CONVERSATION_INTENTS[intent];
    if (!choice || !DIALOGUE_CONFIG.allowedVisitIntents.includes(intent)) return;
    conversation.invited = true;
    conversation.visitIntent = intent;
    conversation.conversationStage = "intent_shared";
    saveDialogueMemory();
    openDialogue("I like that answer. Let me pull the right thread.");
    submitDialogueQuestion(choice.question);
  }
  function startConversationInvitation() {
    if (dismissed || conversation.invited || dialogueBusy || document.hidden) return;
    if (touring || dragging || moving || performing || mode !== "idle" || bubble.classList.contains("on")) {
      if (++invitationAttempts < 3) setTimeout(startConversationInvitation, 3000);
      return;
    }
    conversation.invited = true;
    conversation.conversationStage = "invited";
    saveDialogueMemory();
    queueDialogueGesture("curious_look", "curious");
    say("I'm curious what brought you here.", [
      { label: CONVERSATION_INTENTS.projects.label, go: function () { startIntentConversation("projects"); } },
      { label: CONVERSATION_INTENTS.recruiting.label, go: function () { startIntentConversation("recruiting"); } },
      { label: CONVERSATION_INTENTS.curious.label, go: function () { startIntentConversation("curious"); } },
      { label: "Show me around", go: function () { runTour(); } },
    ], { force: true });
  }
  function submitDialogueQuestion(questionOverride) {
    if (dismissed || dialogueBusy || !window.fetch) return;
    var question = normalizeDialogueQuestion(typeof questionOverride === "string" ? questionOverride : bAskInput.value);
    if (!question) {
      bAskInput.setCustomValidity("Ask a short project question.");
      bAskInput.reportValidity();
      return;
    }
    bAskInput.setCustomValidity("");
    var now = Date.now();
    if (now - lastDialogueAt < DIALOGUE_CONFIG.clientCooldownMs) {
      bText.textContent = "I need one tiny paper beat before my next answer.";
      return;
    }
    lastDialogueAt = now;
    noteVisitorActivity(now);
    if (conversation.conversationStage === "new" || conversation.conversationStage === "invited") {
      conversation.conversationStage = "engaged";
      saveDialogueMemory();
    }
    setDialogueBusy(true);
    bText.textContent = "My paper brain is unfolding this one.";
    var requestToken = ++dialogueRequestToken;
    window.fetch(DIALOGUE_CONFIG.route, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(dialogueRequestPayload(question)),
      credentials: "same-origin",
    }).then(function (response) {
      if (dialogueRequestToken !== requestToken) return null;
      return response.ok ? response.json() : null;
    }).then(function (payload) {
      if (dialogueRequestToken !== requestToken) return;
      var turn = payload && validateDialogueTurn(payload);
      if (!turn) throw new Error("invalid_reply");
      conversation.conversationStage = "engaged";
      saveDialogueMemory();
      rememberDialogueTurn(turn);
      queueDialogueGesture(turn.gesture, turn.tone);
      var expectsReply = !!turn.followUp || turn.reply.endsWith("?");
      var text = turn.followUp ? turn.reply + "\\n\\n" + turn.followUp : turn.reply;
      say(text, null, {
        force: true,
        hold: dialogueHold(text),
        dialogueReply: true,
        keepDialogueOpen: expectsReply,
      });
      if (expectsReply) bAskInput.placeholder = "Reply to Paper Stan";
    }).catch(function () {
      if (dialogueRequestToken !== requestToken) return;
      bText.textContent = "I dropped the thread to my project notes. Give me one paper beat, then try again.";
      setDialogueFormOpen(true);
      placeBubble();
    }).then(function () {
      if (dialogueRequestToken === requestToken) setDialogueBusy(false);
    });
  }
  function say(text, chips, opts) {
    opts = opts || {};
    if (dismissed) return;
    if (bubble.classList.contains("asking") && !opts.dialogueReply) return;
    var now = Date.now();
    if (!opts.force && now - lastBubble < 20000) return;
    if (!opts.force && now - lastScroll < 1200) return;
    lastBubble = now;
    var keepDialogueOpen = !!opts.keepDialogueOpen;
    setDialogueFormOpen(keepDialogueOpen);
    if (keepDialogueOpen) bAskInput.value = "";
    bText.textContent = text;
    bChips.replaceChildren();
    (chips || []).forEach(function (c) {
      var b = document.createElement("button");
      b.type = "button";
      b.textContent = c.label;
      b.addEventListener("click", function () { hide(); c.go(); });
      bChips.appendChild(b);
    });
    bubble.classList.add("on");
    placeBubble();
    startFollow();
    clearTimeout(bubbleTimer);
    if (!keepDialogueOpen && (!chips || !chips.length)) bubbleTimer = setTimeout(hide, opts.hold || 5200);
    if (keepDialogueOpen) setTimeout(function () { bAskInput.focus(); }, 0);
  }
  function hide() {
    dialogueGestureToken++;
    clearTimeout(dialogueGestureTimer);
    dialogueGestureTimer = 0;
    clearTimeout(bubbleTimer);
    bubbleTimer = 0;
    setDialogueFormOpen(false);
    bubble.classList.remove("on");
  }
  askButton.addEventListener("click", function (event) {
    event.preventDefault();
    event.stopPropagation();
    openDialogue();
  });
  bAskForm.addEventListener("submit", function (event) {
    event.preventDefault();
    submitDialogueQuestion();
  });
  bAskSubmit.addEventListener("click", function (event) {
    event.preventDefault();
    submitDialogueQuestion();
  });
  bX.addEventListener("click", function () {
    dialogueRequestToken++;
    setDialogueBusy(false);
    hide();
    lastBubble = Date.now();
    noteVisitorActivity(lastBubble);
  });

  function nextTarget() {
    q = window.QUEST.get();
    var rows = [].slice.call(document.querySelectorAll("[data-quest]"));
    for (var i = 0; i < rows.length; i++) {
      var id = rows[i].getAttribute("data-quest");
      if (q.watched.indexOf(id) === -1) return rows[i];
    }
    if (q.watched.indexOf("patent") === -1) return document.getElementById("patent");
    return null;
  }
  function suggest(force) {
    if (dismissed || suggests >= 4 || dialogueBusy || bubble.classList.contains("on")) return;
    var t = nextTarget();
    if (!t) return;
    var plan = selectLocalPlan("project-dwell", { dwell: force ? "engaged" : "lingering" });
    applyDirectorMood(plan, 0.42, 22000);
    suggests++;
    var r = t.getBoundingClientRect();
    var name = t.querySelector(".title") ? t.querySelector(".title").textContent : "the patent";
    var destX = Math.min(vw() - W - 10, r.right + 4);
    var destY = Math.max(10, r.top + r.height / 2 - H / 2);
    if (r.top < 0 || r.bottom > vh()) { destX = x; destY = y; }
    travel(destX, destY, function () {
      face(true);
      setMode("poke");
      window.QUEST.pulse(t);
      setTimeout(function () {
        setMode("idle");
        say(pickLine(plan.linePool || "suggest") + " (" + name + ")", null, { force: !!force });
      }, 1000);
    });
  }

  // ---- Direct interaction: hover, tap, drag, wheel-zoom.
  // Hover: he grows (CSS) and reacts to being noticed. The reaction is drawn
  // from a small "noticed you" pool and never repeats twice in a row, so hover
  // does not always look like the same head turn.
  var HOVER = [
    function (purpose) { return gesture("curious", (mouse && mouse.x < x) ? "lookLeft" : "lookRight", 1400, purpose); }, // looks at you
    function (purpose) { return gesture("idle", Math.random() < 0.5 ? "tiltLeft" : "tiltRight", 1400, purpose); },       // curious head tilt
    function (purpose) { return gesture(x > vw() / 2 ? "waveLeft" : "waveRight", null, 1500, purpose); },                 // quick wave hello
    function (purpose) { return gesture("happy", null, 1300, purpose); },                                                 // pleased little bounce
    function (purpose) { return gesture("nod", null, 1200, purpose); }                                                     // acknowledges you
  ];
  var lastHover = 0, lastHoverIdx = -1, hoverTimer = 0, hoverInside = false;
  function runHoverReaction() {
    hoverTimer = 0;
    if (!hoverInside || dismissed || !actor.ready || dragging) return;
    var now = Date.now();
    if (now - lastHover < INTERACTION_POLICY.hoverCooldownMs) return;
    if (mode !== "idle" || moving || touring || performing || bubble.classList.contains("on")) return;
    noteVisitorActivity(now);
    var plan = selectLocalPlan("hover") || { mood: "cheerful", purpose: "hover" };
    applyDirectorMood(plan, 0.55, 24000);
    var i;
    do { i = Math.floor(Math.random() * HOVER.length); } while (i === lastHoverIdx);
    if (HOVER[i](plan.purpose || "hover")) {
      lastHoverIdx = i;
      lastHover = now;
    }
  }
  host.addEventListener("pointerenter", function () {
    if (dismissed || !actor.ready || dragging) return;
    hoverInside = true;
    clearTimeout(hoverTimer);
    hoverTimer = setTimeout(runHoverReaction, INTERACTION_POLICY.hoverDwellMs);
  }, { passive: true });
  host.addEventListener("pointerleave", function () {
    hoverInside = false;
    clearTimeout(hoverTimer);
    hoverTimer = 0;
  }, { passive: true });

  // Tap: most taps play a mood-consistent mini-scene. The rarer legacy tricks
  // remain in the weighted pool so the existing interaction vocabulary stays.
  function reactionBeat(action, orientation, ms) {
    return { action: action, orientation: orientation || "front", expression: MOODS[currentMood()].expression, ms: ms };
  }
  function reactMoodScene() {
    var plan = selectLocalPlan("tap") || { performance: "tap." + currentMood(), linePool: "tap", purpose: "interaction" };
    applyDirectorMood(plan, 0.55, 24000);
    perform(PERFORMANCES[plan.performance] || PERFORMANCES["tap." + currentMood()], plan.purpose || "interaction");
    say(pickLine(plan.linePool || "tap"), null, { force: true, hold: 2400 });
  }
  function reactAnnoyed() {
    setMood("miffed", 1, 45000);
    reactMoodScene();
  }
  function reactWave() {
    setMood("cheerful", 0.75, 26000);
    perform([
      reactionBeat(x > vw() / 2 ? "waveLeft" : "waveRight", "front", 900),
      reactionBeat("happy", "heroUp", 760),
    ]);
    say(pickLine("tap"), null, { force: true, hold: 2200 });
  }
  function reactBeckon() {
    perform([
      reactionBeat(Math.random() < 0.5 ? "beckonBoth" : "beckonLeft", towardPage(), 850),
      reactionBeat("curious", "front", 760),
    ]);
    say(pickLine("tap"), null, { force: true, hold: 2200 });
  }
  function reactWiggle() {
    setMood("cheerful", 0.65, 22000);
    perform([
      reactionBeat(Math.random() < 0.5 ? "bothWave" : "playful", "front", 820),
      reactionBeat("happy", "tiltLeft", 740),
    ]);
  }
  function reactNod() { perform(PERFORMANCES["tap.calm"]); }
  function reactStartled() {
    perform([
      reactionBeat("leanBack", "heroUp", 720),
      reactionBeat("curious", "front", 800),
    ]);
    say(pickLine("tap"), null, { force: true, hold: 2000 });
  }
  function reactSpin() {
    perform([
      reactionBeat("headRoll", "front", 820),
      reactionBeat("twist", "paperLeft", 860),
    ]);
  }
  function reactNose() {
    perform([
      reactionBeat("nosePulse", "front", 850),
      reactionBeat("nod", "front", 700),
    ]);
  }
  function reactWeird() {
    perform([
      reactionBeat("weird", "front", 1300),
      reactionBeat("playful", "tiltRight", 850),
    ]);
    say(pickLine("tap"), null, { force: true, hold: 2600 });
  }
  function reactFlee() {
    if (moving) return;
    var pts = anchors(), far = pts[0], best = -1;
    pts.forEach(function (p) {
      var d = Math.hypot(p.x - x, p.y - y);
      if (d > best) { best = d; far = p; }
    });
    setMood("miffed", 1, 45000);
    say(pickLine("tap"), null, { force: true, hold: 2400 });
    travel(far.x, far.y);
  }
  var flipIdx = 0;
  function reactFlip() {
    var a = FLIPS[flipIdx++ % FLIPS.length];
    actor.playOnce(a);
    if (a === "backFlip") say("Show-off, I know.", null, { force: true, hold: 2400 });
  }
  var exploding = false;
  function explode() {
    if (!actor.ready || exploding || reduce) return;
    exploding = true;
    mode = "busy";
    actor.layout("exploded");
    setTimeout(function () {
      actor.layout("assembled");
      setTimeout(function () {
        exploding = false;
        if (mode === "busy" && !moving && !dragging) setMode("idle");
      }, 700);
    }, 950);
  }
  function reactExplode() {
    if (exploding) { reactWiggle(); return; }
    say("...whoops. Hold on.", null, { force: true, hold: 2400 });
    explode();
  }
  // Weighted so the common, gentle reactions show up more than the big ones.
  var TAP = [
    reactMoodScene, reactMoodScene, reactMoodScene, reactMoodScene,
    reactAnnoyed,
    reactWave, reactWave,
    reactWiggle, reactWiggle,
    reactBeckon,
    reactNod,
    reactStartled,
    reactSpin, reactSpin,
    reactNose,
    reactFlip, reactFlip,
    reactFlee,
    reactExplode,
    reactWeird
  ];
  var tapTimes = [];
  host.addEventListener("click", function () {
    if (dismissed || !actor.ready || justDragged) return;
    cancelPerformance();
    cancelGesture();
    if (touring) return;
    var now = Date.now();
    noteVisitorActivity(now);
    tapTimes.push(now);
    tapTimes = tapTimes.filter(function (t) { return now - t < 2600; });
    if (tapTimes.length >= 2) setMood("miffed", 1, 45000);
    if (tapTimes.length >= 3) { tapTimes = []; reactFlee(); return; }
    TAP[Math.floor(Math.random() * TAP.length)]();
  });

  // Drag: pointer down + move past a small threshold picks him up; the click
  // that follows a real drag is suppressed so it does not also fire a reaction.
  var justDragged = false, grabDX = 0, grabDY = 0, downX = 0, downY = 0, down = false, dragTimes = [];
  host.addEventListener("pointerdown", function (e) {
    if (dismissed || !actor.ready) return;
    cancelPerformance();
    cancelGesture();
    noteVisitorActivity(Date.now());
    down = true;
    downX = e.clientX; downY = e.clientY;
    grabDX = e.clientX - x; grabDY = e.clientY - y;
    try { host.setPointerCapture(e.pointerId); } catch (err) {}
  });
  host.addEventListener("pointermove", function (e) {
    if (!down) return;
    if (!dragging && Math.hypot(e.clientX - downX, e.clientY - downY) > 5) {
      dragging = true;
      host.classList.add("dragging");
      sprite.style.transition = "none";
      setMode("idle");
    }
    if (dragging) place(e.clientX - grabDX, e.clientY - grabDY, true);
  });
  function endDrag(e) {
    if (!down) return;
    down = false;
    var was = dragging;
    dragging = false;
    host.classList.remove("dragging");
    try { host.releasePointerCapture(e.pointerId); } catch (err) {}
    if (was) {
      var now = Date.now();
      dragTimes.push(now);
      dragTimes = dragTimes.filter(function (t) { return now - t < 45000; });
      if (dragTimes.length >= 3) setMood("miffed", 1, 45000);
      justDragged = true;
      setTimeout(function () { justDragged = false; }, 80);
      requestAnimationFrame(function () { sprite.style.transition = ""; });
    }
  }
  host.addEventListener("pointerup", endDrag);
  host.addEventListener("pointercancel", endDrag);

  // Wheel over him zooms his actual size (persists for the session).
  host.addEventListener("wheel", function (e) {
    if (dismissed || !actor.ready) return;
    e.preventDefault();
    userScale = Math.max(0.62, Math.min(2, userScale + (e.deltaY < 0 ? 0.12 : -0.12)));
    measure();
    if (actor.ready) actor.puppet.setSize(W);
    place(x, y, true);
  }, { passive: false });

  // Bother-loop: every so often Paper Stan walks over and BOOPS the cursor.
  // If the cursor flees before he arrives, he takes it personally.
  var MISS_LINES = [
    "I lost that cursor a second ago.",
    "I walked all the way over and it moved.",
    "I suppose I will let that cursor go."
  ];
  (function botherLoop() {
    setTimeout(function () {
      if (!dismissed && !touring && !dragging && mode === "idle" && !moving && !document.hidden &&
          !bubble.classList.contains("on") && !reduce && mouse &&
          matchMedia("(hover: hover) and (pointer: fine)").matches &&
          Math.random() < 0.5) {
        var target = { x: mouse.x, y: mouse.y };
        travel(Math.max(6, target.x - 100), Math.max(6, target.y - 34), function () {
          var fled = mouse && Math.hypot(mouse.x - target.x, mouse.y - target.y) > 180;
          if (fled) {
            setMood("miffed", 0.55, 45000);
            setMode("look");
            say(MISS_LINES[Math.floor(Math.random() * MISS_LINES.length)], null, { force: true });
            setTimeout(function () { if (mode === "look") setMode("idle"); }, 1800);
          } else {
            var plan = selectLocalPlan("cursor") || { mood: "cheerful", linePool: "bother" };
            applyDirectorMood(plan, 0.5, 22000);
            face(false);
            setMode("poke");
            say(pickLine(plan.linePool || "bother"), null, { force: true });
            setTimeout(function () { if (mode === "poke") setMode("idle"); }, 1200);
          }
          setTimeout(function () {
            if (mode === "idle" && !moving && !bubble.classList.contains("on") && Math.random() < 0.5) {
              var h = home();
              travel(h.x, h.y);
            }
          }, 4600);
        });
      }
      botherLoop();
    }, 26000 + Math.random() * 26000);
  })();

  // Docent: react to whichever section owns the viewport, in place.
  (function sectionDocent() {
    if (!("IntersectionObserver" in window)) return;
    var defs = [
      { key: "hero", el: document.querySelector(".hero") },
      { key: "about", el: document.getElementById("about") },
      { key: "works", el: document.getElementById("list") },
      { key: "patent", el: document.getElementById("patent") },
      { key: "contact", el: document.querySelector("footer") }
    ].filter(function (d) { return d.el; });
    if (!defs.length) return;
    var current = null, lastReact = 0;
    var io = new IntersectionObserver(function (entries) {
      var best = null;
      entries.forEach(function (en) {
        if (en.isIntersecting && (!best || en.intersectionRatio > best.intersectionRatio)) best = en;
      });
      if (!best) return;
      var key = best.target.getAttribute("data-docent");
      if (key === current) return;
      current = key;
      currentDialogueSection = key;
      react(key);
    }, { threshold: [0.35, 0.6] });
    defs.forEach(function (d) { d.el.setAttribute("data-docent", d.key); io.observe(d.el); });

    function react(key) {
      var cfg = SECTION_MAP[key];
      if (!cfg || dismissed || touring || dragging || moving || mode !== "idle") return;
      if (bubble.classList.contains("on")) return;
      var now = Date.now();
      if (now - lastReact < 4500) return;
      lastReact = now;
      var plan = selectLocalPlan("section", { section: key, dwell: "engaged" }) || {};
      applyDirectorMood(plan, 0.45, 18000);
      var sequence = plan.performance && PERFORMANCES[plan.performance];
      perform(sequence || [
        { action: cfg.action, orientation: cfg.orientation || "front", expression: MOODS[currentMood()].expression, ms: 1500 },
        { action: "idle", orientation: "front", expression: MOODS[currentMood()].expression, ms: 700 },
      ], plan.purpose || "section");
      if (Math.random() < 0.5) say(pickLine(plan.linePool || "section"), null, {});
    }
  })();

  // Scripted first-visit tour: lead the visitor past who / what / proudest.
  function runTour() {
    if (dismissed) return;
    var stops = [
      { el: document.getElementById("about"), action: "playful",
        line: "Start with the short version of me. I build things end to end: web, mobile, the odd patent." },
      { el: document.getElementById("list"), action: "beckon", orientation: "lookLeft",
        line: "This is the actual work. Open anything that looks interesting, I'll wait." },
      { el: document.getElementById("patent"), action: "happy", orientation: "heroUp",
        line: "And this one I'm quietly proud of. A real granted patent, my name on it." }
    ].filter(function (s) { return s.el; });
    if (!stops.length) { suggest(true); return; }
    touring = true;
    suggests = 4;
    var i = 0;
    (function step() {
      if (i >= stops.length || dismissed) {
        if (!dismissed) say("That's the tour. Poke around; I'll chime in if I've got something useful.", null, { force: true });
        touring = false;
        setMode("idle");
        return;
      }
      var s = stops[i++];
      s.el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" });
      var deliver = function () {
        if (window.QUEST.pulse) window.QUEST.pulse(s.el);
        actor.act(s.action, s.orientation);
        say(s.line, null, { force: true, hold: 3600 });
        setTimeout(step, 4200);
      };
      if (reduce) {
        setTimeout(deliver, 400);
      } else {
        setTimeout(function () {
          var r = s.el.getBoundingClientRect();
          var destX = Math.min(vw() - W - 10, Math.max(10, r.right - W - 8));
          var destY = Math.max(10, r.top + r.height / 2 - H / 2);
          travel(destX, destY, deliver);
        }, 520);
      }
    })();
  }

  // Chase commentary: the reward photo emits (throttled) when it's being hunted.
  var CHASE_LINES = [
    "It does that to everyone.",
    "Chasing never works. Exploring does.",
    "It can smell unfinished business."
  ];
  var lastChaseQuip = 0;
  document.addEventListener("cta:chase", function (e) {
    var now = Date.now();
    if (dismissed || now - lastChaseQuip < 40000 || Math.random() < 0.4) return;
    lastChaseQuip = now;
    setMode("look");
    say(CHASE_LINES[Math.floor(Math.random() * CHASE_LINES.length)] + " (" + e.detail.pct + "%, by the way.)", null, { force: true });
    setTimeout(function () { if (mode === "look") setMode("idle"); }, 2200);
  });

  document.addEventListener("quest:item-watched", function (e) {
    setMood("cheerful", 0.75, 30000);
    if (Math.random() < 0.5) { gesture("nod", null, 1600); } else { setMode("yay"); setTimeout(function () { setMode("idle"); }, 1800); }
    say("Nice. That's " + e.detail.n + " of " + e.detail.total + ".", null, { force: true });
    setTimeout(function () { suggest(); }, 2200);
  });
  document.addEventListener("quest:complete", function () {
    setMood("cheerful", 1, 32000);
    setMode("yay");
    say("That's everything. The photo up top just stopped shuffling, so go catch it.", null, { force: true, hold: 7000 });
    setTimeout(function () { setMode("idle"); }, 2600);
  });
  document.addEventListener("cta:opened", function () {
    setMode("yay");
    say("Caught it. Give it a second to develop.", null, { force: true, hold: 8000 });
    setTimeout(function () { setMode("idle"); }, 2600);
  });
  document.addEventListener("photo:developed", function () {
    setMode("yay");
    say("There I am, in actual pixels. Thanks for exploring the whole thing.", null, { force: true, hold: 7000 });
    setTimeout(function () { setMode("sleep"); }, 6000);
  });
  // Rating quips: Paper Stan is gracious, and takes a low score with a shrug.
  document.addEventListener("rate:sent", function (e) {
    var r = e.detail.r, line;
    if (r <= 3) { setMood("miffed", 1, 45000); line = "A " + r + "? I made that one at 3am, so, fair. Logged."; gesture("sad", "shyDown", 2400); }
    else if (r <= 6) { setMood("calm", 0.5, 18000); line = r + " out of 10. Noted, I can take it."; gesture("nod", null, 2200); }
    else if (r <= 8) { setMood("cheerful", 0.65, 26000); line = r + ". I'll take that, thank you."; gesture("nod", null, 2200); }
    else { setMood("cheerful", 1, 32000); line = r + "?! Okay, now I like you. Logged with pride."; setMode("yay"); setTimeout(function () { setMode("idle"); }, 2400); }
    say(line, null, { force: true });
  });

  document.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest("a[href^='http']");
    if (a && a.host !== location.host) {
      try { sessionStorage.setItem("ob", String(Date.now())); } catch (err) {}
    }
  }, true);
  var realTitle = document.title;
  var fav = document.querySelector('link[rel="icon"]');
  var realFav = fav && fav.getAttribute("href");
  var missFav = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Ctext x='16' y='24' font-size='24' text-anchor='middle'%3E%F0%9F%91%80%3C/text%3E%3C/svg%3E";
  document.addEventListener("visibilitychange", function () {
    if (document.hidden) {
      document.title = "\\uD83D\\uDC40 still here";
      if (fav) fav.setAttribute("href", missFav);
    } else {
      document.title = realTitle;
      if (fav && realFav) fav.setAttribute("href", realFav);
      var ob = 0;
      try { ob = parseInt(sessionStorage.getItem("ob") || "0", 10); } catch (err) {}
      var recent = ob && Date.now() - ob < 1800000;
      try { sessionStorage.removeItem("ob"); } catch (err) {}
      if (recent) {
        setMode("yay");
        say("You went to look at my stuff. And?", null, { force: true });
        setTimeout(function () { setMode("idle"); }, 2600);
      } else if (!dismissed) {
        gesture("bothWave", null, 2000);
        say("You're back. Kept your spot warm.");
      }
    }
  });

  if (dismissed) {
    setMode("sleep");
  } else if (q.ctaUnlocked) {
    setMode("sleep");
  } else {
    if (!conversation.invited) setTimeout(startConversationInvitation, DIALOGUE_CONFIG.invitationDelayMs);
    setTimeout(function () { suggest(); }, 12000);
  }
})();
`;
