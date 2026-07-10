import { describe, expect, it, vi } from "vitest";
import { onRequestPost } from "../functions/api/paper-stan/plan.js";
import { DIRECTOR_CONFIG } from "../src/render/fx/sprite-director.js";
import { readFileSync } from "node:fs";

const wranglerConfig = readFileSync(new URL("../wrangler.toml", import.meta.url), "utf8");

function post(body, env) {
  return onRequestPost({
    request: new Request("https://portfolio.test/api/paper-stan/plan", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }),
    env,
  });
}

describe("Paper Stan director endpoint", () => {
  it("declares the Pages AI binding without enabling inference by default", () => {
    expect(wranglerConfig).toMatch(/\[ai\]\s*binding = "AI"/);
    expect(wranglerConfig).toMatch(/\[env\.preview\.ai\]\s*binding = "AI"/);
    expect(wranglerConfig).not.toMatch(/PAPER_STAN_AI_ENABLED\s*=\s*"true"/);
  });

  it("stays disabled unless the Pages environment explicitly enables it", async () => {
    const run = vi.fn();
    const response = await post({ event: "section", section: "works", mood: "calm" }, { AI: { run } });

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: "disabled" });
    expect(run).not.toHaveBeenCalled();
  });

  it("sends only sanitized context and returns a validated model plan", async () => {
    const run = vi.fn().mockResolvedValue({
      response: JSON.stringify({
        goal: "introduce_section",
        mood: "cheerful",
        purpose: "section",
        performance: "section.works.cheerful",
        linePool: "section",
        expiresInMs: 3600,
        line: "I'm keeping this part in view for you.",
      }),
    });
    const response = await post({
      event: "section",
      section: "works",
      mood: "calm",
      clientX: 912,
      projectTitle: "Do not send this",
    }, { PAPER_STAN_AI_ENABLED: "true", AI: { run } });

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toEqual({
      plan: {
        goal: "introduce_section",
        mood: "cheerful",
        purpose: "section",
        performance: "section.works.cheerful",
        linePool: "section",
        expiresInMs: 3600,
        line: "I'm keeping this part in view for you.",
      },
    });
    expect(run).toHaveBeenCalledWith(DIRECTOR_CONFIG.model, expect.objectContaining({
      messages: expect.any(Array),
      max_tokens: 120,
    }));
    const requestBody = run.mock.calls[0][1].messages.at(-1).content;
    const systemPrompt = run.mock.calls[0][1].messages[0].content;
    expect(requestBody).toContain('"section":"works"');
    expect(requestBody).not.toContain("912");
    expect(requestBody).not.toContain("Do not send this");
    expect(systemPrompt).toContain("Paper Stan");
    expect(systemPrompt).toContain("first-person English");
    expect(systemPrompt).toContain("No em/en dashes");
  });

  it("does not invoke Workers AI for a malformed event", async () => {
    const run = vi.fn();
    const response = await post({ event: "pointer-stream", mood: "calm" }, {
      PAPER_STAN_AI_ENABLED: "true",
      AI: { run },
    });

    expect(response.status).toBe(400);
    expect(run).not.toHaveBeenCalled();
  });

  it("does not expose local-only hover and tap events to the model endpoint", async () => {
    const run = vi.fn();
    const response = await post({ event: "hover", mood: "calm" }, {
      PAPER_STAN_AI_ENABLED: "true",
      AI: { run },
    });

    expect(response.status).toBe(400);
    expect(run).not.toHaveBeenCalled();
  });

  it("caps the request body before invoking Workers AI", async () => {
    const run = vi.fn();
    const response = await post({
      event: "section",
      section: "works",
      mood: "calm",
      ignoredPadding: "x".repeat(DIRECTOR_CONFIG.maxRequestBytes),
    }, {
      PAPER_STAN_AI_ENABLED: "true",
      AI: { run },
    });

    expect(response.status).toBe(413);
    expect(run).not.toHaveBeenCalled();
  });

  it("fails closed when a model returns an action outside the installed vocabulary", async () => {
    const run = vi.fn().mockResolvedValue({
      response: JSON.stringify({
        goal: "introduce_section",
        mood: "cheerful",
        purpose: "section",
        performance: "make_up_a_move",
        linePool: "section",
        expiresInMs: 3600,
      }),
    });
    const response = await post({ event: "section", section: "works", mood: "calm" }, {
      PAPER_STAN_AI_ENABLED: "true",
      AI: { run },
    });

    expect(response.status).toBe(422);
    expect(await response.json()).toEqual({ error: "invalid_plan" });
  });

  it("fails closed when a model omits or breaks the generated-line contract", async () => {
    const run = vi.fn().mockResolvedValue({
      response: JSON.stringify({
        goal: "introduce_section",
        mood: "cheerful",
        purpose: "section",
        performance: "section.works.cheerful",
        linePool: "section",
        expiresInMs: 3600,
        line: "This section is worth a look.",
      }),
    });
    const response = await post({ event: "section", section: "works", mood: "calm" }, {
      PAPER_STAN_AI_ENABLED: "true",
      AI: { run },
    });

    expect(response.status).toBe(422);
    expect(await response.json()).toEqual({ error: "invalid_plan" });
  });
});
