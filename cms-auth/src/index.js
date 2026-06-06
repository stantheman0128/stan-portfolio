const GITHUB_SCOPE = "public_repo,read:user";

function outputHtml({ token, error, errorCode }) {
  const state = error ? "error" : "success";
  const content = error ? { provider: "github", error, errorCode } : { provider: "github", token };
  const message = `authorization:github:${state}:${JSON.stringify(content)}`;
  const serializedMessage = JSON.stringify(message).replaceAll("<", "\\u003c");

  return new Response(
    `<!doctype html><html><body><script>
      (() => {
        window.addEventListener("message", ({ data, origin }) => {
          if (data === "authorizing:github") {
            window.opener?.postMessage(
              ${serializedMessage},
              origin
            );
          }
        });
        window.opener?.postMessage("authorizing:github", "*");
      })();
    </script></body></html>`,
    {
      headers: {
        "Content-Type": "text/html;charset=UTF-8",
        "Set-Cookie": "csrf-token=deleted; HttpOnly; Max-Age=0; Path=/; SameSite=Lax; Secure"
      }
    }
  );
}

function isAllowedDomain(domain, allowedDomains) {
  if (!allowedDomains) return true;
  return allowedDomains
    .split(",")
    .map((value) => value.trim())
    .some((value) => value === domain);
}

async function handleAuth(request, env) {
  const { searchParams } = new URL(request.url);
  const provider = searchParams.get("provider");
  const domain = searchParams.get("site_id");

  if (provider !== "github") {
    return outputHtml({
      error: "Your Git backend is not supported by the authenticator.",
      errorCode: "UNSUPPORTED_BACKEND"
    });
  }

  if (!isAllowedDomain(domain, env.ALLOWED_DOMAINS)) {
    return outputHtml({
      error: "Your domain is not allowed to use the authenticator.",
      errorCode: "UNSUPPORTED_DOMAIN"
    });
  }

  if (!env.GITHUB_CLIENT_ID || !env.GITHUB_CLIENT_SECRET) {
    return outputHtml({
      error: "OAuth app client ID or secret is not configured.",
      errorCode: "MISCONFIGURED_CLIENT"
    });
  }

  const csrfToken = globalThis.crypto.randomUUID().replaceAll("-", "");
  const params = new URLSearchParams({
    client_id: env.GITHUB_CLIENT_ID,
    scope: GITHUB_SCOPE,
    state: csrfToken
  });

  return new Response("", {
    status: 302,
    headers: {
      Location: `https://github.com/login/oauth/authorize?${params.toString()}`,
      "Set-Cookie": `csrf-token=github_${csrfToken}; HttpOnly; Path=/; Max-Age=600; SameSite=Lax; Secure`
    }
  });
}

async function handleCallback(request, env) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const [, csrfToken] = request.headers.get("Cookie")?.match(/\bcsrf-token=github_([0-9a-f]{32})\b/) ?? [];

  if (!code || !state) {
    return outputHtml({
      error: "Failed to receive an authorization code. Please try again later.",
      errorCode: "AUTH_CODE_REQUEST_FAILED"
    });
  }

  if (!csrfToken || state !== csrfToken) {
    return outputHtml({
      error: "Potential CSRF attack detected. Authentication flow aborted.",
      errorCode: "CSRF_DETECTED"
    });
  }

  if (!env.GITHUB_CLIENT_ID || !env.GITHUB_CLIENT_SECRET) {
    return outputHtml({
      error: "OAuth app client ID or secret is not configured.",
      errorCode: "MISCONFIGURED_CLIENT"
    });
  }

  let response;
  try {
    response = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        code,
        client_id: env.GITHUB_CLIENT_ID,
        client_secret: env.GITHUB_CLIENT_SECRET
      })
    });
  } catch {
    return outputHtml({
      error: "Failed to request an access token. Please try again later.",
      errorCode: "TOKEN_REQUEST_FAILED"
    });
  }

  let payload;
  try {
    payload = await response.json();
  } catch {
    return outputHtml({
      error: "Server responded with malformed data. Please try again later.",
      errorCode: "MALFORMED_RESPONSE"
    });
  }

  return outputHtml({ token: payload.access_token, error: payload.error });
}

export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url);

    if (request.method === "GET" && ["/auth", "/oauth/authorize"].includes(pathname)) {
      return handleAuth(request, env);
    }

    if (request.method === "GET" && ["/callback", "/oauth/redirect"].includes(pathname)) {
      return handleCallback(request, env);
    }

    return new Response("", { status: 404 });
  }
};
