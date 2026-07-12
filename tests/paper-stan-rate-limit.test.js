import { afterEach, describe, expect, it, vi } from "vitest";
import {
  onRequestPost,
  RL_IP_MAX,
  RL_IP_WINDOW_MS,
  RL_DAY_MAX,
} from "../functions/api/paper-stan/reply.js";
import { initPaperStanKnowledge } from "../src/render/fx/paper-stan-dialogue.js";
import { PAPER_STAN_TEST_CONTENT } from "./fixtures/paper-stan-content.js";

// Inject the frozen fixture, NOT the live content.json — owner edits to the
// site content must never break this suite (overrides reply.js's own init).
initPaperStanKnowledge(PAPER_STAN_TEST_CONTENT);

const VALID_REPLY = "I built Course Checker to make graduation rules easier to inspect.";

function makeKV(initial = {}) {
  const store = new Map(Object.entries(initial));
  return {
    store,
    get: vi.fn(async (key) => (store.has(key) ? store.get(key) : null)),
    put: vi.fn(async (key, value) => {
      store.set(key, value);
    }),
  };
}

function makeEnv(kv, run) {
  return {
    PAPER_STAN_AI_ENABLED: "true",
    AI: { run: run || vi.fn().mockResolvedValue({ response: VALID_REPLY }) },
    RATINGS: kv,
  };
}

function post(body, env, ip = "203.0.113.7") {
  return onRequestPost({
    request: new Request("https://portfolio.test/api/paper-stan/reply", {
      method: "POST",
      headers: { "content-type": "application/json", "cf-connecting-ip": ip },
      body: JSON.stringify(body),
    }),
    env,
  });
}

// Mirrors the daily-fuse key format inside reply.js (UTC day bucket).
function dayKey() {
  return "ps-rl:day:" + new Date().toISOString().slice(0, 10);
}

describe("Paper Stan dialogue rate limiting", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("serves the per-IP window budget then answers 429 without leaking counts", async () => {
    const kv = makeKV();
    const run = vi.fn().mockResolvedValue({ response: VALID_REPLY });
    const env = makeEnv(kv, run);

    for (let i = 0; i < RL_IP_MAX; i++) {
      const ok = await post({ question: "What is Course Checker?" }, env);
      expect(ok.status).toBe(200);
    }

    const blocked = await post({ question: "What is Course Checker?" }, env);
    expect(blocked.status).toBe(429);
    const body = await blocked.text();
    expect(body).toBe(JSON.stringify({ error: "rate_limited" }));
    // No counter, remaining, or limit values may leak in the refusal.
    expect(body).not.toMatch(/\d/);
    // The refused request must never reach Workers AI.
    expect(run).toHaveBeenCalledTimes(RL_IP_MAX);
  });

  it("counts per-IP budget separately for distinct client IPs", async () => {
    const kv = makeKV();
    const env = makeEnv(kv);

    for (let i = 0; i < RL_IP_MAX; i++) {
      expect((await post({ question: "What is Course Checker?" }, env, "198.51.100.1")).status).toBe(200);
    }
    expect((await post({ question: "What is Course Checker?" }, env, "198.51.100.1")).status).toBe(429);
    // A different IP still has its own fresh window.
    expect((await post({ question: "What is Course Checker?" }, env, "198.51.100.2")).status).toBe(200);
  });

  it("allows requests again after the per-IP window rolls over", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-12T12:00:00Z"));
    const kv = makeKV();
    const env = makeEnv(kv);

    for (let i = 0; i < RL_IP_MAX; i++) {
      await post({ question: "What is Course Checker?" }, env);
    }
    expect((await post({ question: "What is Course Checker?" }, env)).status).toBe(429);

    vi.setSystemTime(new Date(Date.now() + RL_IP_WINDOW_MS));
    expect((await post({ question: "What is Course Checker?" }, env)).status).toBe(200);
  });

  it("returns 429 when the site-wide daily inference budget is spent", async () => {
    const kv = makeKV({ [dayKey()]: String(RL_DAY_MAX) });
    const run = vi.fn().mockResolvedValue({ response: VALID_REPLY });
    const env = makeEnv(kv, run);

    const blocked = await post({ question: "What is Course Checker?" }, env);
    expect(blocked.status).toBe(429);
    expect(await blocked.json()).toEqual({ error: "rate_limited" });
    // The daily fuse must trip before any inference runs.
    expect(run).not.toHaveBeenCalled();
  });

  it("does not spend the daily inference budget on the local continuation shortcut", async () => {
    const kv = makeKV();
    const run = vi.fn();
    const env = makeEnv(kv, run);

    const response = await post({
      question: "Can you tell me more about that?",
      context: { visitIntent: "projects", conversationStage: "engaged" },
      history: { paperStanReply: "I built Course Checker to make graduation rules easier to inspect." },
    }, env);

    expect(response.status).toBe(200);
    // The local shortcut answers without Workers AI...
    expect(run).not.toHaveBeenCalled();
    // ...and must leave the shared daily budget untouched.
    expect(kv.store.has(dayKey())).toBe(false);
  });

  it("fails open and still answers when KV throws", async () => {
    const kv = {
      get: vi.fn().mockRejectedValue(new Error("kv unavailable")),
      put: vi.fn().mockRejectedValue(new Error("kv unavailable")),
    };
    const run = vi.fn().mockResolvedValue({ response: VALID_REPLY });
    const env = makeEnv(kv, run);

    const response = await post({ question: "What is Course Checker?" }, env);
    expect(response.status).toBe(200);
    expect(run).toHaveBeenCalledTimes(1);
  });

  it("never touches KV while the endpoint is disabled", async () => {
    const kv = makeKV();
    const env = { PAPER_STAN_AI_ENABLED: "false", AI: { run: vi.fn() }, RATINGS: kv };

    const response = await post({ question: "What is Course Checker?" }, env);
    expect(response.status).toBe(403);
    expect(kv.get).not.toHaveBeenCalled();
    expect(kv.put).not.toHaveBeenCalled();
  });
});
