import { afterEach, describe, expect, test, vi } from "vitest";
import worker from "../cms-auth/src/index.js";

const env = {
  ALLOWED_DOMAINS: "portfolio.stan-shih.com,stan-portfolio.pages.dev",
  GITHUB_CLIENT_ID: "client-id",
  GITHUB_CLIENT_SECRET: "client-secret"
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("CMS OAuth Worker", () => {
  test("requests only public-repository and read-only user scopes", async () => {
    const response = await worker.fetch(
      new Request(
        "https://auth.example.com/auth?provider=github&site_id=portfolio.stan-shih.com"
      ),
      env
    );
    const location = new URL(response.headers.get("Location"));

    expect(response.status).toBe(302);
    expect(location.origin).toBe("https://github.com");
    expect(location.searchParams.get("scope")).toBe("public_repo,read:user");
    expect(response.headers.get("Set-Cookie")).toContain("HttpOnly");
  });

  test("rejects a CMS hosted on an unapproved domain", async () => {
    const response = await worker.fetch(
      new Request("https://auth.example.com/auth?provider=github&site_id=evil.example"),
      env
    );
    const html = await response.text();
    const script = html.match(/<script>([\s\S]*?)<\/script>/)?.[1];

    expect(html).toContain("UNSUPPORTED_DOMAIN");
    expect(() => new Function(script)).not.toThrow();
  });

  test("rejects callbacks without a matching CSRF cookie", async () => {
    const response = await worker.fetch(
      new Request("https://auth.example.com/callback?code=code&state=state"),
      env
    );

    expect(await response.text()).toContain("CSRF_DETECTED");
  });

  test("returns a valid callback script after exchanging an authorization code", async () => {
    const state = "a".repeat(32);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ access_token: "dummy-token" }), {
          headers: { "Content-Type": "application/json" }
        })
      )
    );

    const response = await worker.fetch(
      new Request(`https://auth.example.com/callback?code=code&state=${state}`, {
        headers: { Cookie: `csrf-token=github_${state}` }
      }),
      env
    );
    const html = await response.text();
    const script = html.match(/<script>([\s\S]*?)<\/script>/)?.[1];

    expect(html).toContain("authorization:github:success");
    expect(() => new Function(script)).not.toThrow();
  });
});
