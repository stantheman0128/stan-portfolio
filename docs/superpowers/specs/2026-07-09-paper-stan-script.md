# Paper Stan — full script, timing, and triggers

Every line the corner guide can say, when it fires, its timing, and the puppet
action that plays with it. Source: `src/render/fx/sprite.js` (interactive /
minimal edition only). Voice is first person; copy avoids em dashes and emoji.

## A. First arrival (new visitor)
Condition: `visits <= 1` and exploration `0%`. Delay: 900ms after load.
Bubble stays until a chip is clicked. No special action.

- "Hey, I'm Stan. The paper version. Want the tour, or should I get out of your way?"
  - Chip **Show me around** -> runs the tour (section B)
  - Chip **I'll explore** -> settles, sleeps ~8s, then back to idle

Returning visitor (not first time): no greeting; a project nudge (section D)
fires 12s in. If dismissed or the reward is already unlocked: he just sleeps.

## B. Guided tour (after "Show me around")
Scripted, one stop at a time. Each stop scrolls the section into view, he
travels next to it (~0.5s + glide), plays an action, and speaks (line held
3.6s, ~4.2s between stops). Missing sections are skipped.

- Stop 1, about (action: playful): "Start with the short version of me. I build things end to end: web, mobile, the odd patent."
- Stop 2, works (action: beckon, faces the list): "This is the actual work. Open anything that looks interesting, I'll wait."
- Stop 3, patent (action: happy, head up): "And this one I'm quietly proud of. A real granted patent, my name on it."
- End: "That's the tour. Poke around; I'll chime in if I've got something useful."

## C. Section reactions (docent, ambient)
When a section takes over the viewport (idle only, 4.5s cooldown between
reactions). He runs the matching two-step mood performance from
`PERFORMANCES["section.<section>.<mood>"]`; ~50% of the time he also selects a
non-repeating line from `LINES.section[mood]`.

- hero -> greeting and a small acknowledgement
- about -> shy or reflective self-introduction
- works -> beckon toward the list, then look closer
- patent -> proud upward reaction, then a quieter beat
- contact / footer -> big wave or calmer goodbye, depending on mood

## D. Project nudges (guide to unopened work)
Points at the next unopened project. Fires 12s in for returning visitors, and
again after each project opened. Max 4 per session. He travels to the item,
pokes and pulses it, then (1s later) speaks. Lines rotate; "(name)" is the
project title. The line comes from `LINES.suggest[mood]` and never repeats the
previous project nudge for that session.

## E. Quest milestones
- Opened a project (dwelled ~1.5s) -> action happy -> "Nice. That's {n} of {total}." then a nudge 2.2s later
- Explored everything -> action happy (held 7s) -> "That's everything. The photo up top just stopped shuffling, so go catch it."
- Caught the reward photo -> action happy (held 8s) -> "Caught it. Give it a second to develop."
- Reward photo developed -> action happy (held 7s) -> "There I am, in actual pixels. Thanks for exploring the whole thing." then sleeps

## F. Rating responses (when a visitor rates a project)
- 1-3 -> action look -> "A {r}? I made that one at 3am, so, fair. Logged."
- 4-6 -> action happy -> "{r} out of 10. Noted, I can take it."
- 7-8 -> action happy -> "{r}. I'll take that, thank you."
- 9-10 -> action happy -> "{r}?! Okay, now I like you. Logged with pride."

## G. Cursor boop (desktop only)
Every 26-52s, 50% chance, when idle and the mouse is present (fine pointer,
motion allowed). He walks to the cursor, then:

- Cursor stayed -> action beckon -> a non-repeating line from
  `LINES.bother[mood]`; he becomes a little more cheerful.
- Cursor fled before he arrived -> action look -> a first-person missed-cursor
  line; he becomes a little miffed.

## H. Direct interaction
- **Hover** (idle, 280ms dwell, 4.8s cooldown): grows ~10% (CSS), moves to
  cheerful, and then picks one non-repeating look, tilt, wave, bounce, or nod.
  Passing over him and leaving before the dwell delay does not start an action.
  Once a hover acknowledgement starts, leaving does not cut it short. Pressing
  shrinks him slightly.
- **Tap / click** (not while dragging): the common outcome is the 2-3 beat
  `PERFORMANCES["tap.<mood>"]` scene plus a non-repeating `LINES.tap[mood]`
  line. Waves, beckons, wiggles, flips, nose pulses, the strange pose, explode,
  and flee remain in the weighted pool as rarer special reactions.
- **3 quick taps** in a row -> he turns miffed and flees.
- **Drag**: pick him up and move him anywhere. Three drags within 45 seconds
  move him into miffed mood. Dragging also cancels a running performance.
- **Wheel over him**: resize him between 0.62x and 2x. No line. (Persists for the session.)

## I. Speed-reader
Scrolling very fast (>2800px in ~0.8s) while under 100% explored, 45s cooldown:
- "Speed-reading, huh? The check marks can tell."

## J. Chase commentary
When the reward photo is being chased (40s cooldown, ~60% chance) -> action look:
- one of "It does that to everyone." / "Chasing never works. Exploring does." / "It can smell unfinished business." followed by " ({pct}%, by the way.)"

## K. Leaving and coming back
- Tab hidden -> browser tab title becomes "(eyes) still here" and the favicon becomes watching eyes.
- Return after clicking an external link (within 30 min) -> action happy -> "You went to look at my stuff. And?"
- Return otherwise -> action look -> "You're back. Kept your spot warm."

## L. Close (the x on the bubble)
- Close the current bubble only. Paper Stan remains visible and interactive, and the `?` button can reopen the conversation immediately.
- Closing while an AI request is pending invalidates that browser request token, so a late response cannot reopen the bubble.
- Legacy `quest-v2.spriteDismissed` state is cleared on startup. The x must never persistently fade, sleep, hide, or disable Paper Stan again.

## M. Alive behavior layer
- **Expression axis**: `smile` and `frown` are independent of the puppet action.
  The mounted puppet instance shadows `applyHeadEffects`, so `sad` still shows a
  frown while a miffed sequence may also hold one without changing the artwork.
- **Moods**: `calm` is the default. Gentle hover, opening work, and high ratings
  make him cheerful. Ninety seconds without visitor activity or late local time
  makes him sleepy. Repeated taps, three recent drags, and low ratings make him
  miffed. Mood is in-memory only, carries a decaying intensity, and miffed
  settles back to calm after about 45 seconds.
- **Gaze**: desktop cursor position maps to a 3 by 3 orientation grid. It only
  changes while he is idle, after a zone change and at least 400ms. Miffed Paper
  Stan turns away from the cursor, and sleepy Paper Stan reacts later. Reduced
  motion retains this subtle gaze but disables roaming.
- **Performances**: `perform([{ action, orientation, expression, ms }, ...])`
  owns the puppet until its last beat. Click, drag, or travel cancels it, then
  the normal idle state resumes.
- **Purpose priority**: gaze is the smallest response, then ambient idle,
  intentional hover acknowledgement, section docent, direct interaction, and
  travel. A lower-purpose action cannot cut through a higher-purpose one. Each
  short gesture has a token, so an old timeout cannot release a newer gesture.
- **Data and copy**: `src/render/fx/sprite-data.js` is the source for `MOODS`,
  `PERFORMANCES`, `LINES`, and expressions. Every baked line is English,
  first-person Paper Stan voice, with no em/en dash or emoji. Selection avoids
  repeating the last line for the same situation.

## N. Conversation v3
- **All automatic behavior is local**: `src/render/fx/sprite-director.js` turns
  hover, tap, section, project prompt, and cursor events into bounded local
  plans. Gesture tokens, cooldowns, purpose priority, and baked `LINES` remain
  the only source of automatic motion and speech.
- **Explicit questions only**: the `?` control opens a compact Paper Stan form.
  Only submitting that form calls `/api/paper-stan/reply`; there is no query
  flag, event-triggered model request, cache, or model timing authority.
- **Bounded project knowledge**: the server sends only the visitor's normalized
  question plus selected public facts from `data/content.json`. It never sends
  raw pointer coordinates, DOM, scroll history, other inputs, or visitor
  identity.
- **Constrained generated reply**: the model returns exactly one `reply` field.
  The reply must be concise, first-person English, ASCII-only, one to three
  sentences, and have no URL, markdown, emoji, or em/en dash. Broken output is
  rejected, while the local character continues normally.
- **Question priority**: an open question form holds the bubble in place so a
  delayed greeting or project nudge cannot overwrite the visitor's interaction.

## Notes
- Idle motion (silent): between scripted moments he draws from the weighted pool
  for his current mood. Cheerful is lively, calm is reflective, sleepy is slow,
  and miffed is terser. Calm still occasionally uses the full explode and
  reassemble trick.
- Bubbles rate-limit themselves (20s minimum between non-forced lines; they also
  wait out active scrolling), so he never chatters.
- `prefers-reduced-motion`: no roaming, boops, or flips-as-loop; gentle in-place
  gestures only. Mobile: smaller, calmer, no cursor games.
- New variable copy lives in `LINES` inside `sprite-data.js`; edit it there to
  change wording. The older scripted tour and quest lines remain in `sprite.js`.
