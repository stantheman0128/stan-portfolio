// Pure Paper Stan behavior data. The runtime in sprite.js serializes these
// exports into the rendered page, while tests import the same values directly.

export const EXPRESSIONS = ["smile", "frown"];

export const INTERACTION_POLICY = {
  hoverDwellMs: 280,
  hoverCooldownMs: 4800,
};

export const MOODS = {
  cheerful: {
    enter: ["gentle-hover", "opened-project", "high-rating"],
    expression: "smile",
    linePool: "cheerful",
    pacing: 0.82,
    gazeEagerness: 1.15,
    idlePool: [
      { action: "happy", orientation: "heroUp", ms: 1450, weight: 3 },
      { action: "playful", orientation: "tiltLeft", ms: 1550, weight: 3 },
      { action: "bothWave", orientation: "front", ms: 1650, weight: 2 },
      { action: "curious", orientation: "lookRight", ms: 1500, weight: 2 },
      { action: "nod", orientation: "front", ms: 1300, weight: 2 },
    ],
  },
  calm: {
    enter: ["baseline", "decay"],
    expression: "smile",
    linePool: "calm",
    pacing: 1,
    gazeEagerness: 0.9,
    idlePool: [
      { action: "thinking", orientation: "front", ms: 1750, weight: 3 },
      { action: "handsIn", orientation: "shyDown", ms: 1650, weight: 2 },
      { action: "nod", orientation: "tiltRight", ms: 1350, weight: 2 },
      { action: "curious", orientation: "lookLeft", ms: 1550, weight: 2 },
      { action: "twist", orientation: "paperLeft", ms: 1650, weight: 1 },
    ],
  },
  sleepy: {
    enter: ["idle-90s", "late-night"],
    expression: "smile",
    linePool: "sleepy",
    pacing: 1.55,
    gazeEagerness: 0.48,
    idlePool: [
      { action: "shy", orientation: "shyDown", ms: 2200, weight: 4 },
      { action: "leanBack", orientation: "heroUp", ms: 2050, weight: 2 },
      { action: "thinking", orientation: "shyDown", ms: 2200, weight: 2 },
      { action: "nod", orientation: "shyDown", ms: 1850, weight: 1 },
    ],
  },
  miffed: {
    enter: ["pestering-taps", "heavy-dragging", "low-rating"],
    expression: "frown",
    linePool: "miffed",
    pacing: 1.16,
    gazeEagerness: 0.66,
    idlePool: [
      { action: "shakeHead", orientation: "lookLeft", ms: 1750, weight: 4 },
      { action: "twist", orientation: "paperRight", ms: 1750, weight: 3 },
      { action: "handsIn", orientation: "shyDown", ms: 1700, weight: 2 },
      { action: "curious", orientation: "lookRight", ms: 1600, weight: 1 },
    ],
  },
};

// Every sequence is intentionally short. The runtime may cancel it before the
// final beat when a visitor drags, taps, or sends Paper Stan travelling.
export const PERFORMANCES = {
  "tap.cheerful": [
    { action: "leanBack", orientation: "heroUp", expression: "smile", ms: 480 },
    { action: "curious", orientation: "lookLeft", expression: "smile", ms: 680 },
    { action: "happy", orientation: "front", expression: "smile", ms: 880 },
  ],
  "tap.calm": [
    { action: "nod", orientation: "front", expression: "smile", ms: 620 },
    { action: "thinking", orientation: "tiltRight", expression: "smile", ms: 980 },
  ],
  "tap.sleepy": [
    { action: "shy", orientation: "shyDown", expression: "smile", ms: 820 },
    { action: "nod", orientation: "front", expression: "smile", ms: 920 },
  ],
  "tap.miffed": [
    { action: "shakeHead", orientation: "lookLeft", expression: "frown", ms: 780 },
    { action: "twist", orientation: "paperRight", expression: "frown", ms: 920 },
  ],
  "section.hero.cheerful": [
    { action: "greeting", orientation: "front", expression: "smile", ms: 900 },
    { action: "happy", orientation: "heroUp", expression: "smile", ms: 740 },
  ],
  "section.hero.calm": [
    { action: "greeting", orientation: "front", expression: "smile", ms: 850 },
    { action: "nod", orientation: "front", expression: "smile", ms: 700 },
  ],
  "section.hero.sleepy": [
    { action: "greeting", orientation: "shyDown", expression: "smile", ms: 900 },
    { action: "shy", orientation: "shyDown", expression: "smile", ms: 820 },
  ],
  "section.hero.miffed": [
    { action: "greeting", orientation: "lookRight", expression: "frown", ms: 760 },
    { action: "twist", orientation: "paperRight", expression: "frown", ms: 900 },
  ],
  "section.about.cheerful": [
    { action: "shy", orientation: "shyDown", expression: "smile", ms: 650 },
    { action: "playful", orientation: "tiltLeft", expression: "smile", ms: 860 },
  ],
  "section.about.calm": [
    { action: "shy", orientation: "shyDown", expression: "smile", ms: 700 },
    { action: "thinking", orientation: "front", expression: "smile", ms: 900 },
  ],
  "section.about.sleepy": [
    { action: "shy", orientation: "shyDown", expression: "smile", ms: 930 },
    { action: "nod", orientation: "shyDown", expression: "smile", ms: 790 },
  ],
  "section.about.miffed": [
    { action: "handsIn", orientation: "shyDown", expression: "frown", ms: 760 },
    { action: "twist", orientation: "paperRight", expression: "frown", ms: 880 },
  ],
  "section.works.cheerful": [
    { action: "beckon", orientation: "lookLeft", expression: "smile", ms: 790 },
    { action: "happy", orientation: "heroUp", expression: "smile", ms: 800 },
  ],
  "section.works.calm": [
    { action: "beckon", orientation: "lookLeft", expression: "smile", ms: 800 },
    { action: "curious", orientation: "front", expression: "smile", ms: 860 },
  ],
  "section.works.sleepy": [
    { action: "beckon", orientation: "lookLeft", expression: "smile", ms: 820 },
    { action: "shy", orientation: "shyDown", expression: "smile", ms: 860 },
  ],
  "section.works.miffed": [
    { action: "beckonLeft", orientation: "lookRight", expression: "frown", ms: 780 },
    { action: "shakeHead", orientation: "lookRight", expression: "frown", ms: 820 },
  ],
  "section.patent.cheerful": [
    { action: "happy", orientation: "heroUp", expression: "smile", ms: 900 },
    { action: "nod", orientation: "front", expression: "smile", ms: 700 },
  ],
  "section.patent.calm": [
    { action: "happy", orientation: "heroUp", expression: "smile", ms: 830 },
    { action: "thinking", orientation: "front", expression: "smile", ms: 850 },
  ],
  "section.patent.sleepy": [
    { action: "happy", orientation: "heroUp", expression: "smile", ms: 760 },
    { action: "shy", orientation: "shyDown", expression: "smile", ms: 900 },
  ],
  "section.patent.miffed": [
    { action: "happy", orientation: "lookRight", expression: "frown", ms: 700 },
    { action: "twist", orientation: "paperRight", expression: "frown", ms: 860 },
  ],
  "section.contact.cheerful": [
    { action: "bothBigWave", orientation: "heroUp", expression: "smile", ms: 920 },
    { action: "happy", orientation: "front", expression: "smile", ms: 780 },
  ],
  "section.contact.calm": [
    { action: "bothBigWave", orientation: "front", expression: "smile", ms: 860 },
    { action: "nod", orientation: "front", expression: "smile", ms: 700 },
  ],
  "section.contact.sleepy": [
    { action: "bothWave", orientation: "front", expression: "smile", ms: 780 },
    { action: "shy", orientation: "shyDown", expression: "smile", ms: 880 },
  ],
  "section.contact.miffed": [
    { action: "bothWave", orientation: "lookRight", expression: "frown", ms: 760 },
    { action: "handsIn", orientation: "shyDown", expression: "frown", ms: 820 },
  ],
};

export const LINES = {
  tap: {
    cheerful: [
      "I see you found me.",
      "I'm awake now.",
      "I was hoping someone would tap in.",
      "I've got a little paper energy to spare.",
      "I can work with that.",
      "I like your timing.",
    ],
    calm: [
      "I'm here.",
      "I noticed that.",
      "I can take a small interruption.",
      "I've filed that under hello.",
      "I was thinking anyway.",
      "I appreciate a precise tap.",
    ],
    sleepy: [
      "I'm awake enough for that.",
      "I was nearly asleep.",
      "I've heard you.",
      "I can manage one more move.",
      "I'm moving at paper speed.",
      "I needed that little wake-up.",
    ],
    miffed: [
      "I'm keeping count.",
      "I felt that.",
      "I need a second.",
      "I've got boundaries, even on paper.",
      "I'm still here, reluctantly.",
      "I prefer gentler taps.",
    ],
  },
  section: {
    cheerful: [
      "I'm glad you made it this far.",
      "I like this part of my story.",
      "I've been waiting to show you this.",
      "I'm happy you stopped here.",
      "I can talk about this bit all day.",
      "I'm quietly proud of this section.",
    ],
    calm: [
      "I'm keeping an eye on this part.",
      "I think this is worth a moment.",
      "I've got context for this bit.",
      "I'm here if you want the short version.",
      "I like how this part fits together.",
      "I'm letting this section speak for itself.",
    ],
    sleepy: [
      "I'm still with you down here.",
      "I can stay awake for this part.",
      "I've reached this section too.",
      "I'm reading along at a gentle pace.",
      "I like this part, even half awake.",
      "I'm taking this one slowly.",
    ],
    miffed: [
      "I'm looking, even if I look unimpressed.",
      "I have notes about this part.",
      "I'm still giving this section my attention.",
      "I've got a skeptical little nod for this.",
      "I can be grumpy and helpful at once.",
      "I'm not ignoring the interesting bits.",
    ],
  },
  suggest: {
    cheerful: [
      "I've got one more piece of my work to show you.",
      "I'm excited about this one.",
      "I think you'll like this next bit.",
      "I've saved a good one for you.",
      "I'm pointing at something worth a look.",
      "I can make a case for this one.",
    ],
    calm: [
      "I think this one deserves a look.",
      "I've left one useful thing unopened.",
      "I'm keeping this one in view for you.",
      "I can wait while you inspect this one.",
      "I've got a small recommendation.",
      "I'm pointing out one more detail.",
    ],
    sleepy: [
      "I've got one more thing before I rest.",
      "I think this one is worth waking for.",
      "I'm nudging you toward one last piece.",
      "I've kept this one ready for you.",
      "I can point, even when I'm tired.",
      "I'm saving my remaining energy for this one.",
    ],
    miffed: [
      "I'm pointing because this one deserves better.",
      "I've got a stubborn recommendation.",
      "I think you skipped this one too quickly.",
      "I'm giving this one another chance.",
      "I've decided this one is worth your time.",
      "I can be insistent when my work is involved.",
    ],
  },
  bother: {
    cheerful: [
      "I found your cursor.",
      "I'm borrowing this cursor for a moment.",
      "I made it all the way over here.",
      "I've claimed this tiny corner.",
      "I'm saying hello to your pointer.",
      "I like where your cursor was resting.",
    ],
    calm: [
      "I noticed your cursor waiting here.",
      "I've come to inspect this pointer.",
      "I'm checking in from this corner.",
      "I found a quiet spot near your cursor.",
      "I'm making a small appearance here.",
      "I've followed the pointer for a reason.",
    ],
    sleepy: [
      "I followed your cursor at my own pace.",
      "I've arrived, eventually.",
      "I'm awake enough to find your pointer.",
      "I took the long paper route here.",
      "I'm resting near your cursor for a second.",
      "I've made one careful trip across the page.",
    ],
    miffed: [
      "I came over here despite myself.",
      "I've found your cursor, finally.",
      "I'm inspecting this pointer with reservations.",
      "I walked all this way for this cursor.",
      "I've got one skeptical look for this spot.",
      "I'm here, but I am not impressed.",
    ],
  },
};
