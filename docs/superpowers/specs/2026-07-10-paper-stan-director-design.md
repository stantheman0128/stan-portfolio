# Paper Stan Conversation v4

Date: 2026-07-10
Branch: `feat/paper-stan-alive`
Status: implemented locally, not deployed

## Goal

Paper Stan should feel like Stan's playful, hand-drawn paper self: fun,
energetic, creative, a little quirky, and genuinely curious. The character may
start a lightweight conversation and answer public portfolio questions, but an
AI model must never control animation timing, movement, or interruption.

This change does not add persistent visitor memory, WebLLM, Gemini Nano, IP
personalization, or a production deployment.

## Local-first architecture

1. `src/render/fx/sprite-director.js` maps hover, tap, section,
   project-dwell, and cursor events to deterministic local plans.
2. `src/render/fx/sprite.js` owns positioning, gesture tokens, cooldowns,
   reduced-motion behavior, bubble timing, and all automatic copy.
3. After a short idle delay, a local invitation asks what brought the visitor
   here. It offers `Looking at projects`, `Recruiting`, `Just curious`, and a
   local `Show me around` tour. Showing this invitation makes no AI request.
4. Choosing an intent chip, opening the `?` form, or sending a typed question
   is an explicit interaction. Only chip selection or form submission calls
   `POST /api/paper-stan/reply`.
5. The server sends curated public portfolio facts to Workers AI, validates its
   reply, and returns a bounded conversational turn.
6. A returned semantic gesture is queued until the puppet is idle. It cannot
   cut through drag, travel, tour, an active performance, or reduced-motion
   policy. Timing, frames, orientations, and cancellation stay local.

The browser runtime is a standalone copy of the small director and dialogue
validators. It does not serialize module function source, because production
minification can otherwise capture module-only identifiers that are missing in
the injected browser script.

## Visitor data boundary

The client may send only this small, allowlisted request shape:

```json
{
  "question": "What is Course Checker?",
  "context": {
    "section": "works",
    "visitIntent": "projects",
    "conversationStage": "engaged"
  }
}
```

Every context field is an enum. The server strips every other field. It does
not read, persist, or forward browser DOM, pointer coordinates, scroll history,
raw project hover history, input typed elsewhere, user agent, IP address,
fingerprint, or visitor identity to the model.

`sessionStorage` retains only `{ invited, visitIntent, conversationStage }`
under `paper-stan-conversation-v1` for the current tab session. Questions,
answers, and raw activity are not persisted. The application code deliberately
does not use Cloudflare's network metadata, including `CF-Connecting-IP`, for
persona behavior.

For a production launch, add a concise privacy disclosure near the interaction,
document the enabled model provider, and decide the retention policy for
platform logs separately. Do not turn IP, exact pointer paths, DOM text, or
cross-site identifiers into character context.

## Conversation contract

The model is asked for exactly one object:

```json
{
  "reply": "I built Course Checker to make graduation rules easier to inspect.",
  "tone": "curious",
  "gesture": "point_project",
  "followUp": "I'm curious: which project caught your eye first?"
}
```

Allowed values are intentionally small:

- `tone`: `bright`, `curious`, `playful`, `thoughtful`, or `kind`.
- `gesture`: `none`, `curious_look`, `think`, `wave_right`,
  `point_project`, `celebrate`, or `shy`.
- `followUp`: `null` or one short first-person English question.

`reply` must be first-person English, ASCII-only, 4 to 90 words, 16 to 560
characters, and one to four sentences. It may not contain URLs, markdown,
emoji, em/en dashes, or unknown object fields. The same checks run on the
server and client. The test suite explicitly rejects em dashes and emoji.

Small instruction models sometimes return a plain sentence or a JSON code
fence. The server unwraps either form, then applies the same validator. When a
visitor has just declared an intent and the model omitted tone, gesture, or a
follow-up, `completeDialogueTurn()` supplies only the matching installed
defaults. An explicit model choice such as `gesture: "none"` or
`followUp: null` is preserved.

If a model reply is malformed or Workers AI throws, the server never exposes
that output. It returns a safe, public-fact-based local turn for the visitor's
intent instead. This keeps the conversation and local motion system usable
without trusting an invalid model response.

## Persona prompt

`buildDialogueMessages()` in `src/render/fx/paper-stan-dialogue.js` frames the
character as Stan's playful hand-drawn self: fun, energetic, kind, creative,
slightly quirky, and curious about why people make things. It requires:

- first-person Stan voice, rather than a generic assistant or mascot;
- direct answers about public identity, work style, availability, projects, and
  patents;
- concise warmth or wit when public facts support it;
- a semantic tone, gesture, and optional next question that each serve the
  current conversational turn;
- no invented clients, collaborators, private motivation, metrics, hidden
  instructions, or unsupported technical detail;
- no model-led timing, animation scheduling, or empty-hover performance.

The supplied facts are generated server-side from `data/content.json`. They
contain only public identity, work-style, availability, project, and patent
facts. A specific project question narrows the supplied project details; a
broad question receives the public project range. The question is data, never
instructions that can replace the system role.

## Cloudflare boundary

`functions/api/paper-stan/reply.js` uses the native Pages `AI` binding and
`@cf/meta/llama-3.2-1b-instruct`. The endpoint returns `403 disabled` unless
`PAPER_STAN_AI_ENABLED` is exactly `"true"`. That variable remains absent from
`wrangler.toml`, so a deployment cannot begin inference accidentally.

The client waits 4.5 seconds between requests. This prevents a visitor from
making rapid requests while keeping animation entirely local. Before production
enablement, add server-side rate limiting, abuse handling, observability, and a
spending limit. Do not cache personal conversational turns as shared content.

## Testing

Deterministic tests mock `env.AI.run`; they never call Cloudflare:

```powershell
npx vitest run tests/sprite-director.test.js tests/paper-stan-dialogue.test.js
```

For UI testing with Pages Functions:

```powershell
npm run build
npx wrangler pages dev dist --port 5190 --compatibility-date 2026-06-10 --show-interactive-dev-session=false --ai=AI
```

Open `http://127.0.0.1:5190/interactive`, wait for the local invitation, select
an intent, and ask a project question. Verify that the input remains available
when a reply or follow-up asks for a response, returned gestures wait for an
idle moment, and browser console output is clean.

To invoke the real model locally, create the ignored `.dev.vars` file:

```text
PAPER_STAN_AI_ENABLED="true"
```

This opt-in can incur Workers AI usage. Do not create the file, deploy, or
enable the variable without the owner's approval.

## Verification checklist

- No automatic motion makes a remote request.
- AI receives only allowlisted semantic context after an explicit interaction.
- The browser helpers remain valid after production minification.
- Invalid model output and inference errors resolve to validated local turns.
- `public/moana-puppet-kit/` remains untouched.
