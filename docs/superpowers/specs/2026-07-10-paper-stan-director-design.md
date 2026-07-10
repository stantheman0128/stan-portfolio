# Paper Stan Director v1.5

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
for a future matching event.

## Architecture

`src/render/fx/sprite-director.js` is the single pure contract shared by unit
tests, the browser's serialized Paper Stan runtime, and the Pages Function.

1. Browser events become a small semantic context.
2. `createLocalPlan()` immediately selects a deterministic goal, purpose,
   performance key, baked line pool, mood, and expiry.
3. Existing gesture tokens, purpose priority, hover dwell, and cooldowns own
   the real animation lifecycle.
4. With the optional feature flag, the browser asks the Pages Function for an
   alternative legal plan only after a section visit or a project prompt.
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

The model may only return one of the server-generated choices:

```json
{
  "goal": "introduce_section",
  "mood": "cheerful",
  "purpose": "section",
  "performance": "section.works.cheerful",
  "linePool": "section",
  "expiresInMs": 3600
}
```

The plan has no free-form action or dialogue field. Existing baked `LINES`
remain the only visible copy, preserving the English first-person, no dash, no
emoji test contract.

## Cloudflare boundary

`functions/api/paper-stan/plan.js` uses the native `AI` Pages binding and
`@cf/meta/llama-3.2-1b-instruct`. It asks the model to return an unchanged
member of a permitted plan list, then validates the response again server-side.
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
selection plus server validation is the correctness boundary.

## Verification

- `npx vitest run`: 20 files, 88 tests passing.
- `npm run build`: passing.
- The serialized browser runtime is parsed by a test.
- `public/moana-puppet-kit/` remains untouched.

No `wrangler pages dev`, model inference, or Cloudflare deployment was run for
this change. Local Workers AI development can reach the Cloudflare account and
incur usage, so it remains deliberately outside this implementation pass.
