import { OUTBOUND_HOST, OUTBOUND_PATHS, OUTBOUND_TARGETS } from "../../functions/_lib/outbound.js";

// Serialized into static HTML. All page content and links already exist without
// this script. The request omits credentials and referrer and is never awaited.
function outboundClient(config) {
  function optedOut() {
    return navigator.globalPrivacyControl === true ||
      [navigator.doNotTrack, navigator.msDoNotTrack, window.doNotTrack].some(function(v) { return v === "1" || v === "yes"; });
  }
  if (location.origin !== "https://" + config.host || location.pathname !== config.path || optedOut() || typeof fetch !== "function") return;
  document.addEventListener("click", function(event) {
    try {
      if (!event.isTrusted || event.defaultPrevented || event.button !== 0 || optedOut()) return;
      var anchor = event.target && event.target.closest && event.target.closest("a[href]");
      if (!anchor || anchor.hasAttribute("download")) return;
      var url = new URL(anchor.href);
      if (url.username || url.password) return;
      var target = config.targets.find(function(t) {
        var expected = new URL(t.href);
        if (url.origin !== expected.origin || url.pathname.replace(/\/$/, "") !== expected.pathname.replace(/\/$/, "")) return false;
        if (t.destination !== "store") return url.search === "";
        return url.searchParams.getAll("id").length === 1 && url.searchParams.get("id") === "com.stanslab.linenotify" &&
          url.searchParams.getAll("hl").length <= 1 &&
          (!url.searchParams.has("hl") || ["en", "en_US", "zh_TW", "zh-Hant"].includes(url.searchParams.get("hl"))) &&
          Array.from(url.searchParams.keys()).every(function(k) { return k === "id" || k === "hl"; });
      });
      if (!target) return;
      // CORS mode keeps the real Origin on POST even with no-referrer. In
      // same-origin mode that policy can make Origin null, which our server
      // correctly rejects. The absolute fixed URL and redirect:error keep the
      // request on this first-party endpoint despite any document base URL.
      fetch("https://" + config.host + "/api/outbound", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ v: 1, path: config.path, product: target.product, destination: target.destination }),
        keepalive: true, credentials: "omit", referrerPolicy: "no-referrer", mode: "cors", redirect: "error"
      }).catch(function() {});
    } catch (_) {}
  }, { passive: true });
}

export function outboundScript(path) {
  if (!Object.hasOwn(OUTBOUND_PATHS, path)) return "";
  const config = { host: OUTBOUND_HOST, path, targets: OUTBOUND_TARGETS.filter(t => OUTBOUND_PATHS[path].includes(t.product)) };
  return `<script>(${outboundClient.toString()})(${JSON.stringify(config)});</script>`;
}
