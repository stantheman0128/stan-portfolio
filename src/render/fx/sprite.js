// The guide sprite v7: the hand-drawn paper self-portrait ("Paper Stan", kit in
// /moana-puppet-kit) replaces the licensed hedgehog. The character is the site
// owner as a palm-sized paper doll who personally walks visitors through his own
// work, so every line is first person. The behavior/personality engine is
// unchanged (roam, cursor-boop, quest-guiding, bubbles, quips); only the actor
// swapped. The engine still drives the character through setMode(m) + face(left);
// an adapter maps those onto MoanaPuppet actions so the character can be
// re-skinned again by editing one table.
// Layer contract: #sprite = position (JS translate) > #puppet-host = the
// MoanaPuppet element (its own pieces, shadow, and rAF loop).
//
// New this version: scroll-aware section reactions, click-to-cycle easter eggs,
// and a scripted first-visit tour. Copy avoids em dashes and AI tells.

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
  about: { action: "shy" },
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

// Click the puppet to cycle these showcase motions (flips play once).
export const CLICK_CYCLE = ["frontFlip", "backFlip", "weird", "playful"];

// Extra actions the engine triggers directly (onboarding, tour, error states).
// Listed so the test can guard their spelling against the kit's real catalog.
export const INTENT_ACTIONS = ["greeting", "bothBigWave", "beckon", "sad", "happy"];

export const spriteCSS = `
#sprite{position:fixed;left:0;top:0;z-index:70;pointer-events:none;will-change:transform;transition:transform 1.15s cubic-bezier(.33,.75,.35,1)}
#sprite.s-scurrying{transition-duration:.72s;transition-timing-function:cubic-bezier(.45,.05,.55,.95)}
#puppet-host{--moana-size:112px;pointer-events:auto;cursor:pointer;transition:transform .35s}
#sprite.s-face-left #puppet-host{transform:scaleX(-1)}
#sprite.s-sleep{opacity:.62}
@media (prefers-reduced-motion:reduce){#sprite{transition:none}}
#bubble{position:fixed;left:0;top:0;z-index:71;max-width:15.5rem;background:#fffdfa;border:1px solid #d8d0c4;border-radius:11px 11px 11px 3px;padding:.65rem .8rem;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:12px;line-height:1.55;color:#3a3833;box-shadow:0 8px 28px rgba(41,31,23,.12);display:none}
#bubble.on{display:block}
#bubble .b-x{position:absolute;top:4px;right:7px;all:unset;cursor:pointer;color:#b7b2a8;font-size:12px;padding:2px 4px}
#bubble .b-x:hover{color:#c2522d}
#bubble .b-chips{margin-top:.5rem;display:flex;gap:6px;flex-wrap:wrap}
#bubble .b-chips button{all:unset;cursor:pointer;border:1px solid #17151a;border-radius:999px;padding:.22rem .7rem;font-size:11.5px}
#bubble .b-chips button:hover,#bubble .b-chips button:focus-visible{background:#17151a;color:#fffdfa}
#bubble .b-chips button:focus-visible{outline:2px solid #c2522d;outline-offset:2px}
@media print{#sprite,#bubble{display:none !important}}
@media (max-width:640px){#puppet-host{--moana-size:84px}}
`;

export const spriteHTML = `
<div id="sprite" class="s-idle" aria-hidden="true">
  <div id="puppet-host"></div>
</div>
<div id="bubble" role="presentation">
  <button class="b-x" type="button" aria-label="Stop guiding me">&times;</button>
  <span class="b-text"></span>
  <div class="b-chips"></div>
</div>
`;

export const spriteJS = `
(function () {
  var sprite = document.getElementById("sprite");
  var bubble = document.getElementById("bubble");
  var host = document.getElementById("puppet-host");
  if (!sprite || !bubble || !host || !window.QUEST) return;
  var bText = bubble.querySelector(".b-text");
  var bChips = bubble.querySelector(".b-chips");
  var bX = bubble.querySelector(".b-x");

  var MODE_MAP = ${JSON.stringify(PUPPET_MODE_MAP)};
  var SECTION_MAP = ${JSON.stringify(SECTION_ACTION_MAP)};
  var SECTION_LINES = ${JSON.stringify(SECTION_LINES)};
  var CLICK_CYCLE = ${JSON.stringify(CLICK_CYCLE)};

  var q = window.QUEST.get();
  var dismissed = q.spriteDismissed;
  var reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  var lastBubble = 0, suggests = 0, lastScroll = 0, bubbleTimer = 0;
  var mode = "idle", moving = false, touring = false, x = 0, y = 0, faceLeft = false;
  var mouse = null;
  addEventListener("pointermove", function (e) {
    mouse = { x: e.clientX, y: e.clientY, t: Date.now() };
  }, { passive: true });

  // Actor adapter: the only code that knows the character is a puppet.
  var actor = {
    ready: false,
    puppet: null,
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
    playOnce: function (action) {
      if (!this.ready) return;
      this.puppet.playOnce(action);
    }
  };
  function mountPuppet() {
    if (actor.ready) return true;
    if (!window.MoanaPuppet) return false;
    actor.puppet = window.MoanaPuppet.mount(host, {
      assetBase: "/moana-puppet-kit/assets/",
      size: W, action: "idle", orientation: "front", shadow: "soft"
    });
    actor.ready = true;
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
  var W = 112, H = 146;
  function puppetSize() { return matchMedia("(max-width: 640px)").matches ? 84 : 112; }
  function measure() { W = puppetSize(); H = Math.round(W * 1120 / 860); }
  measure();
  function vw() { return document.documentElement.clientWidth; }
  function vh() { return document.documentElement.clientHeight; }
  function home() { return { x: vw() - W - 16, y: vh() - H - 14 }; }

  function setMode(m) {
    mode = m;
    sprite.className = (faceLeft ? "s-face-left " : "") + (m === "sleep" ? "s-sleep" : "");
    actor.setMode(m);
  }
  function addFlag(cls, on) { sprite.classList.toggle(cls, on); }
  function face(left) {
    faceLeft = left;
    sprite.classList.toggle("s-face-left", left);
  }
  function place(nx, ny, instant) {
    nx = Math.max(6, Math.min(vw() - W - 6, nx));
    ny = Math.max(6, Math.min(vh() - H - 6, ny));
    if (Math.abs(nx - x) > 4) face(nx < x);
    x = nx; y = ny;
    if (instant || reduce) sprite.style.transition = "none";
    sprite.style.transform = "translate(" + x + "px," + y + "px)";
    if (instant || reduce) requestAnimationFrame(function () { sprite.style.transition = ""; });
    if (bubble.classList.contains("on")) placeBubble();
  }
  // Short trips: scurry. Long trips: paper can't ball-roll, so it stays playful.
  function travel(nx, ny, then) {
    if (reduce) { place(nx, ny); if (then) then(); return; }
    var dist = Math.hypot(nx - x, ny - y);
    moving = true;
    var scurry = dist < 230;
    if (scurry) { setMode("idle"); addFlag("s-scurrying", true); }
    else setMode("roll");
    place(nx, ny);
    setTimeout(function () {
      moving = false;
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
    if (!moving) { var h = home(); place(h.x, h.y, true); }
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
      if (!dismissed && !touring && mode === "idle" && !moving && !document.hidden &&
          !bubble.classList.contains("on") && !reduce &&
          Date.now() - lastScroll > 3000) {
        var a = anchors()[Math.floor(Math.random() * 6)];
        if (Math.abs(a.x - x) + Math.abs(a.y - y) > 60) travel(a.x, a.y);
      }
      roamLoop();
    }, 15000 + Math.random() * 12000);
  })();

  // Idle life: sudden look-at-you, a curious tilt, a think, or a little hop.
  (function lifeLoop() {
    setTimeout(function () {
      if (!dismissed && !touring && mode === "idle" && !moving && !document.hidden) {
        var roll = Math.random();
        if (roll < 0.4) {
          setMode("look");
          setTimeout(function () { if (mode === "look") setMode("idle"); }, 1500);
        } else if (roll < 0.65) {
          setMode("sniffa");
          setTimeout(function () { if (mode === "sniffa") setMode("idle"); }, 1700);
        } else if (roll < 0.85 && !reduce) {
          setMode("scratch");
          setTimeout(function () { if (mode === "scratch") setMode("idle"); }, 1300);
        } else if (!reduce) {
          setMode("yay");
          setTimeout(function () { if (mode === "yay") setMode("idle"); }, 800);
        }
      }
      lifeLoop();
    }, 6000 + Math.random() * 7000);
  })();

  function placeBubble() {
    var r = sprite.getBoundingClientRect();
    var bw = Math.min(268, vw() - 16);
    var left = Math.max(8, Math.min(vw() - bw - 8, r.left - bw + 40));
    bubble.style.left = left + "px";
    bubble.style.top = "auto";
    bubble.style.bottom = Math.max(8, vh() - r.top + 8) + "px";
  }
  function say(text, chips, opts) {
    opts = opts || {};
    if (dismissed) return;
    var now = Date.now();
    if (!opts.force && now - lastBubble < 20000) return;
    if (!opts.force && now - lastScroll < 1200) return;
    lastBubble = now;
    bText.textContent = text;
    bChips.replaceChildren();
    (chips || []).forEach(function (c) {
      var b = document.createElement("button");
      b.type = "button";
      b.textContent = c.label;
      b.addEventListener("click", function () { hide(); c.go(); });
      bChips.appendChild(b);
    });
    placeBubble();
    bubble.classList.add("on");
    clearTimeout(bubbleTimer);
    if (!chips || !chips.length) bubbleTimer = setTimeout(hide, opts.hold || 5200);
  }
  function hide() { bubble.classList.remove("on"); }
  bX.addEventListener("click", function () {
    say("Got it, I'll hush. Tap me if you change your mind.", null, { force: true, hold: 3000 });
    setTimeout(function () {
      dismissed = true;
      window.QUEST.dismissSprite(true);
      var h = home();
      travel(h.x, h.y, function () { setMode("sleep"); });
    }, 1400);
  });

  var SUGGEST_LINES = [
    "This one's my favorite. Peek inside?",
    "Haven't opened this one yet. It's quick, promise.",
    "You scrolled right past this. It noticed.",
    "Want the story behind this one?",
    "One more? Worth the click."
  ];
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
    if (dismissed || suggests >= 4) return;
    var t = nextTarget();
    if (!t) return;
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
        say(SUGGEST_LINES[suggests % SUGGEST_LINES.length] + " (" + name + ")", null, { force: !!force });
      }, 1000);
    });
  }

  // Bother-loop: every so often Paper Stan walks over and BOOPS the cursor.
  // If the cursor flees before he arrives, he takes it personally.
  var BOTHER_LINES = [
    "Boop.",
    "Whatcha doing up here?",
    "This cursor looked unattended. It's mine now.",
    "Found you.",
    "Don't mind me. Actually, do mind me."
  ];
  var MISS_LINES = [
    "...it was right here a second ago.",
    "Rude. I walked all the way over.",
    "Fine. Didn't want that cursor anyway."
  ];
  (function botherLoop() {
    setTimeout(function () {
      if (!dismissed && !touring && mode === "idle" && !moving && !document.hidden &&
          !bubble.classList.contains("on") && !reduce && mouse &&
          matchMedia("(hover: hover) and (pointer: fine)").matches &&
          Math.random() < 0.5) {
        var target = { x: mouse.x, y: mouse.y };
        travel(Math.max(6, target.x - 100), Math.max(6, target.y - 34), function () {
          var fled = mouse && Math.hypot(mouse.x - target.x, mouse.y - target.y) > 180;
          if (fled) {
            setMode("look");
            say(MISS_LINES[Math.floor(Math.random() * MISS_LINES.length)], null, { force: true });
            setTimeout(function () { if (mode === "look") setMode("idle"); }, 1800);
          } else {
            face(false);
            setMode("poke");
            say(BOTHER_LINES[Math.floor(Math.random() * BOTHER_LINES.length)], null, { force: true });
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

  // Click the character to cycle showcase motions. Flips play once and self-return.
  var clickIdx = 0;
  host.addEventListener("click", function () {
    if (dismissed || !actor.ready) return;
    var a = CLICK_CYCLE[clickIdx++ % CLICK_CYCLE.length];
    if (a === "frontFlip" || a === "backFlip") {
      actor.playOnce(a);
      if (a === "backFlip") say("Show-off, I know.", null, { force: true, hold: 2600 });
    } else if (a === "weird") {
      actor.act(a);
      say("...don't tell anyone I can do that.", null, { force: true, hold: 2600 });
      setTimeout(function () { if (!moving) actor.setMode(mode); }, 2400);
    } else {
      actor.act(a);
      setTimeout(function () { if (!moving) actor.setMode(mode); }, 2000);
    }
  });

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
      react(key);
    }, { threshold: [0.35, 0.6] });
    defs.forEach(function (d) { d.el.setAttribute("data-docent", d.key); io.observe(d.el); });

    function react(key) {
      var cfg = SECTION_MAP[key];
      if (!cfg || dismissed || touring || moving || mode !== "idle") return;
      if (bubble.classList.contains("on")) return;
      var now = Date.now();
      if (now - lastReact < 4500) return;
      lastReact = now;
      actor.act(cfg.action, cfg.orientation);
      var line = SECTION_LINES[key];
      if (line && Math.random() < 0.5) say(line, null, {});
      setTimeout(function () {
        if (!moving && !touring && mode === "idle") actor.setMode("idle");
      }, 3200);
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
    setMode("yay");
    say("Nice. That's " + e.detail.n + " of " + e.detail.total + ".", null, { force: true });
    setTimeout(function () { setMode("idle"); suggest(); }, 2200);
  });
  document.addEventListener("quest:complete", function () {
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
    if (r <= 3) line = "A " + r + "? I made that one at 3am, so, fair. Logged.";
    else if (r <= 6) line = r + " out of 10. Noted, I can take it.";
    else if (r <= 8) line = r + ". I'll take that, thank you.";
    else line = r + "?! Okay, now I like you. Logged with pride.";
    setMode(r <= 3 ? "look" : "yay");
    say(line, null, { force: true });
    setTimeout(function () { setMode("idle"); }, 2400);
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
        setMode("look");
        say("You're back. Kept your spot warm.");
        setTimeout(function () { setMode("idle"); }, 2200);
      }
    }
  });

  if (dismissed) {
    setMode("sleep");
  } else if (q.visits <= 1 && q.pct === 0) {
    setTimeout(function () {
      say("Hey, I'm Stan. The paper version. Want the tour, or should I get out of your way?", [
        { label: "Show me around", go: function () { runTour(); } },
        { label: "I'll explore", go: function () { suggests = 4; setMode("sleep"); setTimeout(function () { setMode("idle"); }, 8000); } }
      ], { force: true });
    }, 900);
  } else if (q.ctaUnlocked) {
    setMode("sleep");
  } else {
    setTimeout(function () { suggest(); }, 12000);
  }
})();
`;
