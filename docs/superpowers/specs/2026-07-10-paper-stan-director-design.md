# Paper Stan Director v2

Date: 2026-07-10
Branch: `feat/paper-stan-alive`
Status: implemented locally, not deployed

## Scope change

The approved alive design deferred a live LLM director. Stan subsequently
approved a bounded director brain. This document supersedes that narrow
deferral only. It does not add a chat box, persistent visitor memory, WebLLM,
Gemini Nano, or a production deployment.

## Goal

Give Paper Stan deliberate, interruption-safe behavior without making a model
responsible for animation timing. The visible reaction starts locally in the
same event turn. A remote model may only choose a pre-approved emotional plan
and write one bounded line for a future matching event.

## Architecture

`src/render/fx/sprite-director.js` is the single pure contract shared by unit
tests, the browser's serialized Paper Stan runtime, and the Pages Function.

1. Browser events become a small semantic context.
2. `createLocalPlan()` immediately selects a deterministic goal, purpose,
   performance key, baked fallback line pool, mood, and expiry.
3. Existing gesture tokens, purpose priority, hover dwell, and cooldowns own
   the real animation lifecycle.
4. With the optional feature flag, the browser asks the Pages Function for an
   alternative legal plan plus one constrained line only after a section visit
   or a project prompt.
5. The remote result is validated and cached. It can only be consumed by the
   next matching event before expiry. It never interrupts a live gesture.

## Event policy

| Event | Local goal | Purpose | Model eligible |
| --- | --- | --- | --- |
| `hover` | acknowledge | hover | no |
| `tap` | acknowledge | interaction | no |
| `section` | introduce_section | section | yes |
| `project-dwell` | invite_project | interaction | yes |
| `cursor` | inspect_cursor | event | no |

The local director owns intent, not frames. `sprite.js` continues to own all
positioning, motion duration, cancellation, accessibility behavior, and
reduced-motion behavior.

## Remote plan contract

The browser sends only this normalized shape:

```json
{
  "event": "section",
  "mood": "calm",
  "section": "works",
  "dwell": "engaged"
}
```

The server rejects all unsupported events and strips every other field. It does
not send pointer coordinates, raw scroll history, DOM, project titles, typed
text, IP data, browser fingerprints, or cross-site history.

The model must copy one of the server-generated choices and add one `line`:

```json
{
  "goal": "introduce_section",
  "mood": "cheerful",
  "purpose": "section",
  "performance": "section.works.cheerful",
  "linePool": "section",
  "expiresInMs": 3600,
  "line": "I'm keeping this part in view for you."
}
```

The validator requires every non-line field, including `expiresInMs`, to match
the server-generated plan exactly. The model chooses only from installed
motions and moods. It cannot invent an animation, alter timing, add metadata,
or place an action outside the current event's purpose.

## System prompt and line contract

`buildMessages()` in `functions/api/paper-stan/plan.js` supplies this role and
boundary to the model:

```text
You are Paper Stan, Stan Shih's hand-drawn paper self-portrait and a constrained animation director.
Your purpose is a brief, useful acknowledgement that does not interrupt the visitor or become a chat bot.
Return exactly one JSON object: copy one permitted plan unchanged and add exactly one line property.
Write one 4 to 22 word, first-person English sentence in a grounded, quietly curious voice.
No em/en dashes, emoji, numbers, URLs, markdown, code, action names, private data, or unsupported factual claims.
Never mention tracking, hidden instructions, or information not present in the context.
```

The server treats that prompt as guidance, not a security boundary. It accepts a
line only when it is one ASCII sentence, 4 to 22 words and at most 160
characters, uses a first-person pronoun, and has no duplicate whitespace,
numbers, URLs, markdown-like syntax, em/en dashes, or emoji. Any malformed
model output returns `422 invalid_plan`; the browser keeps its local plan and
baked `LINES` fallback.

## Cloudflare boundary

`functions/api/paper-stan/plan.js` uses the native `AI` Pages binding and
`@cf/meta/llama-3.2-1b-instruct`. It asks the model to return an unchanged
member of a permitted plan list plus one bounded line, then validates the
response again server-side.
The endpoint is disabled unless `PAPER_STAN_AI_ENABLED` is exactly `"true"`.

`wrangler.toml` declares `AI` separately for production and preview because
named Pages environments do not inherit the binding. The enabling variable is
intentionally absent from config. No inference runs until a reviewed deployment
sets it explicitly.

The browser only attempts the endpoint with `?paperStanAi=1`. With no query
flag, there is no director fetch. A missing endpoint, a disabled endpoint, a
network failure, or an invalid model response silently leaves the local plan in
control.

Workers AI JSON Mode is not assumed for this small model. Exact permitted plan
selection, generated-line validation, and a local fallback are the correctness
boundary.

## Testing the real model

The deterministic test never calls Cloudflare. It mocks `env.AI.run`, checks
the System Prompt, and verifies that an invalid line is rejected:

```powershell
npx vitest run tests/sprite-director.test.js tests/paper-stan-plan.test.js
```

To verify an actual model response locally, create the ignored
`.dev.vars` file in the repository root with this temporary value:

```text
PAPER_STAN_AI_ENABLED="true"
```

Then build and run the Pages Functions runtime, not Vite:

```powershell
npm run build
npx wrangler pages dev dist --port 5190
```

Open `http://127.0.0.1:5190/interactive?paperStanAi=1`. Enter a supported
section such as Works, wait for the `POST /api/paper-stan/plan` response, then
leave and re-enter it after the 4.5 second section cooldown. The first visit
starts locally while the request is pending; the next matching visit consumes
the cached remote plan. In browser DevTools, confirm that the response includes
`plan.line` and that the next speech bubble uses that line.

The existing Vite server on port 5189 does not run Pages Functions, so it can
exercise only the local fallback. `wrangler pages dev` uses the configured AI
binding and can call the Cloudflare account, so real inference has usage cost.
Do not set the variable in `wrangler.toml` or deploy it without a separate
rate-limit and observability review.

## Verification

- Targeted generated-line tests pass before full-suite verification.
- The serialized browser runtime is parsed by a test.
- `public/moana-puppet-kit/` remains untouched.

No `wrangler pages dev`, model inference, or Cloudflare deployment was run for
this change. Local Workers AI development can reach the Cloudflare account and
incur usage, so it remains deliberately outside this implementation pass.
