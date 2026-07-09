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
- **Hover** (idle, 1.5s cooldown): grows ~10% (CSS), moves to cheerful, and
  picks a non-repeating look, tilt, wave, bounce, or nod. Pressing shrinks him
  slightly.
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

## L. Dismiss (the x on the bubble)
- "Got it, I'll hush. Tap me if you change your mind." Then he walks home and sleeps, and stays quiet for the rest of the session (remembered).

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
- **Data and copy**: `src/render/fx/sprite-data.js` is the source for `MOODS`,
  `PERFORMANCES`, `LINES`, and expressions. Every baked line is English,
  first-person Paper Stan voice, with no em/en dash or emoji. Selection avoids
  repeating the last line for the same situation.

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
