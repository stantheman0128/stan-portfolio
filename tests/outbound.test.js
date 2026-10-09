import { describe, it, expect, vi } from "vitest";
import vm from "node:vm";
import { buildOutboundDataPoint } from "../functions/_lib/outbound.js";
import { onRequest } from "../functions/api/outbound.js";
import { outboundScript } from "../src/render/outbound.js";
import { rumQueries, RUM_BASELINE_QUERY, outboundQuery } from "../functions/_lib/rum-query.js";

const payload = { v: 1, path: "/work/notify-plus", product: "notify-plus", destination: "store" };
const origin = "https://stan-shih.com";
function request(body = payload, headers = {}, url = origin + "/api/outbound") {
  return new Request(url, {
    method: "POST", headers: { origin, "content-type": "application/json", "sec-fetch-site": "same-origin", ...headers },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

describe("finite outbound records", () => {
  it("writes only fixed product/path/destination codes and the event/host discriminator", () => {
    expect(buildOutboundDataPoint(payload)).toEqual({
      blobs: ["", "", "/work/notify-plus", "", "outbound-v1", "stan-shih.com", "notify-plus", "store"],
      doubles: [1], indexes: ["outbound-v1:stan-shih.com"],
    });
    expect(buildOutboundDataPoint({ ...payload, path: "/zh/work/notify-plus" })).not.toBeNull();
  });
  it.each([
    { ...payload, path: "/work/notify-plus?email=private@example.test" },
    { ...payload, path: "/work/claudepulse" },
    { ...payload, destination: "https://evil.test/" },
    { ...payload, destination: "release" },
    { ...payload, referrer: "https://private.test/" },
    { ...payload, url: "https://play.google.com/store/apps/details?id=com.stanslab.linenotify" },
    { ...payload, v: "1" },
    { ...payload, path: "toString" },
    [], null,
  ])("rejects non-allowlisted data without retaining it: %j", value => {
    expect(buildOutboundDataPoint(value)).toBeNull();
  });
  it("excludes typed clicks from every legacy timing/visit query including public baseline", () => {
    const queries = rumQueries(7);
    for (const sql of [queries.overall, queries.vitals, queries.byCountry, queries.recent, RUM_BASELINE_QUERY]) {
      expect(sql).toMatch(/WHERE[\s\S]*\bblob5 = ''/);
      // No new host condition on legacy timing rows: they did not store a host.
      expect(sql).not.toContain("blob6");
    }
    expect(queries.outbound).toContain("blob5 = 'outbound-v1' AND blob6 = 'stan-shih.com'");
    expect(queries.outbound).toContain("SUM(_sample_interval) AS clicks");
    expect(queries.outbound).toContain("GROUP BY path, product, destination");
    expect(outboundQuery("7' OR 1=1")).toContain("INTERVAL '1' DAY");
  });
});

describe("outbound ingestion boundary", () => {
  it("ignores ambient headers in the written record", async () => {
    const writeDataPoint = vi.fn();
    const res = await onRequest({ request: request(payload, { cookie: "private=value", referer: "https://private.test/query?secret=1", "cf-connecting-ip": "192.0.2.1" }), env: { RUM: { writeDataPoint } } });
    expect(res.status).toBe(204);
    expect(writeDataPoint).toHaveBeenCalledExactlyOnceWith(buildOutboundDataPoint(payload));
    expect(res.headers.get("cache-control")).toBe("no-store");
  });
  it.each([
    [{ origin: "https://evil.test" }, origin + "/api/outbound"],
    [{ origin: "null" }, origin + "/api/outbound"],
    [{ origin: "" }, origin + "/api/outbound"],
    [{ "sec-fetch-site": "cross-site" }, origin + "/api/outbound"],
    [{ "sec-fetch-site": "same-site" }, origin + "/api/outbound"],
    [{}, "https://preview.stan-portfolio.pages.dev/api/outbound"],
    [{}, "https://portfolio.stan-shih.com/api/outbound"],
    [{}, "http://stan-shih.com/api/outbound"],
    [{}, origin + "/api/outbound?private=1"],
  ])("rejects foreign/missing origins, preview hosts and query-bearing endpoints", async (headers, url) => {
    const writeDataPoint = vi.fn();
    const res = await onRequest({ request: request(payload, headers, url), env: { RUM: { writeDataPoint } } });
    expect(res.status).toBe(403);
    expect(writeDataPoint).not.toHaveBeenCalled();
    expect(res.headers.has("access-control-allow-origin")).toBe(false);
  });
  it.each(["dnt", "sec-gpc"])("honors server %s opt-out", async header => {
    const writeDataPoint = vi.fn();
    const res = await onRequest({ request: request(payload, { [header]: "1" }), env: { RUM: { writeDataPoint } } });
    expect(res.status).toBe(204);
    expect(writeDataPoint).not.toHaveBeenCalled();
  });
  it("rejects oversized actual bodies even without Content-Length", async () => {
    const writeDataPoint = vi.fn();
    expect((await onRequest({ request: request(" ".repeat(513)), env: { RUM: { writeDataPoint } } })).status).toBe(413);
    expect(writeDataPoint).not.toHaveBeenCalled();
  });
  it("rejects malformed input and non-POST methods", async () => {
    const writeDataPoint = vi.fn();
    for (const req of [request("{"), request({ ...payload, cookie: "x" }), request(payload, { "content-type": "text/plain" })]) {
      expect((await onRequest({ request: req, env: { RUM: { writeDataPoint } } })).status).toBe(400);
    }
    expect((await onRequest({ request: new Request(origin + "/api/outbound"), env: {} })).status).toBe(405);
    expect(writeDataPoint).not.toHaveBeenCalled();
  });
  it("keeps binding failures and unavailable bindings invisible to visitors", async () => {
    expect((await onRequest({ request: request(), env: {} })).status).toBe(204);
    expect((await onRequest({ request: request(), env: { RUM: { writeDataPoint() { throw new Error("unavailable"); } } } })).status).toBe(204);
  });
});

function clientHarness({ path = "/work/notify-plus", host = origin, navigator = {}, fetchImpl = () => Promise.resolve() } = {}) {
  const handlers = [];
  const fetch = vi.fn(fetchImpl);
  const document = { addEventListener: (name, handler, options) => handlers.push({ name, handler, options }) };
  Object.defineProperty(document, "referrer", { get() { throw new Error("referrer must not be read"); } });
  Object.defineProperty(document, "cookie", { get() { throw new Error("cookies must not be read"); } });
  const window = {};
  const context = { document, window, navigator, location: { origin: host, pathname: path }, URL, fetch };
  const html = outboundScript(path);
  if (html) vm.runInNewContext(html.slice(8, -9), context);
  function click(href, overrides = {}) {
    const anchor = { href, hasAttribute: () => false };
    const event = { isTrusted: true, defaultPrevented: false, button: 0, target: { closest: () => anchor }, preventDefault: vi.fn(), stopPropagation: vi.fn(), ...overrides };
    for (const entry of handlers) entry.handler(event);
    return event;
  }
  return { fetch, handlers, click, navigator, window };
}

describe("native outbound-link activation", () => {
  it("keeps navigation native while sending only codes without credentials/referrer", () => {
    const h = clientHarness({ fetchImpl: () => new Promise(() => {}) });
    const event = h.click("https://play.google.com/store/apps/details?id=com.stanslab.linenotify&hl=zh_TW#details");
    expect(event.preventDefault).not.toHaveBeenCalled();
    expect(event.stopPropagation).not.toHaveBeenCalled();
    expect(h.handlers[0].options.passive).toBe(true);
    expect(h.fetch).toHaveBeenCalledTimes(1);
    const [url, options] = h.fetch.mock.calls[0];
    expect(url).toBe("https://stan-shih.com/api/outbound");
    // same-origin mode + no-referrer may serialize the POST Origin as null.
    expect(options).toMatchObject({ keepalive: true, credentials: "omit", referrerPolicy: "no-referrer", mode: "cors", redirect: "error" });
    expect(JSON.parse(options.body)).toEqual(payload);
  });
  it("has no tracking script on unsupported/homepage/research pages or runtime preview hosts", () => {
    for (const path of ["/", "/research", "/work/paper-stan", "toString"]) expect(outboundScript(path)).toBe("");
    expect(clientHarness({ host: "https://preview.stan-portfolio.pages.dev" }).handlers).toHaveLength(0);
  });
  it.each([{ doNotTrack: "1" }, { msDoNotTrack: "1" }, { globalPrivacyControl: true }])("honors initial privacy preference %j", navigator => {
    expect(clientHarness({ navigator }).handlers).toHaveLength(0);
  });
  it("rechecks privacy at click time", () => {
    const h = clientHarness();
    h.navigator.globalPrivacyControl = true;
    h.click("https://github.com/stantheman0128/line-notify-plus");
    expect(h.fetch).not.toHaveBeenCalled();
  });
  it.each([
    "https://evil.test/stantheman0128/line-notify-plus",
    "https://github.com/another-user/line-notify-plus",
    "https://github.com/stantheman0128/line-notify-plus?secret=1",
    "https://github.com/stantheman0128/claudepulse-win",
    "https://play.google.com/store/apps/details?id=other.app",
    "https://play.google.com/store/apps/details?id=com.stanslab.linenotify&utm_source=private",
    "https://play.google.com/store/apps/details?id=com.stanslab.linenotify&id=other",
    "https://user:password@github.com/stantheman0128/line-notify-plus",
    "mailto:private@example.test",
  ])("does not transmit unexpected destinations: %s", href => {
    const h = clientHarness(); h.click(href); expect(h.fetch).not.toHaveBeenCalled();
  });
  it("ignores synthetic, canceled and non-primary clicks", () => {
    const h = clientHarness();
    const href = "https://github.com/stantheman0128/line-notify-plus";
    h.click(href, { isTrusted: false }); h.click(href, { defaultPrevented: true }); h.click(href, { button: 1 });
    expect(h.fetch).not.toHaveBeenCalled();
  });
  it("covers translated ClaudePulse release links without changing activation", () => {
    const h = clientHarness({ path: "/zh/work/claudepulse" });
    const event = h.click("https://github.com/stantheman0128/claudepulse-win/releases/#latest");
    expect(JSON.parse(h.fetch.mock.calls[0][1].body)).toEqual({ v: 1, path: "/zh/work/claudepulse", product: "claudepulse", destination: "release" });
    expect(event.preventDefault).not.toHaveBeenCalled();
  });
  it("absorbs synchronous and asynchronous network failures", async () => {
    for (const fetchImpl of [() => { throw new Error("offline"); }, () => Promise.reject(new Error("offline"))]) {
      const h = clientHarness({ fetchImpl });
      const event = h.click("https://github.com/stantheman0128/line-notify-plus");
      expect(event.preventDefault).not.toHaveBeenCalled();
      await Promise.resolve();
    }
  });
});
