import { existsSync } from "node:fs";
import puppeteer from "puppeteer-core";

const url = process.argv[2] || "https://portfolio.stan-shih.com/";
const runs = Number(process.argv[3] || 3);
const isolatedBrowser = process.argv.includes("--isolated-browser");

const chromeCandidates = [
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
  "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
];

const executablePath =
  process.env.CHROME_PATH || chromeCandidates.find((path) => existsSync(path));

if (!executablePath) {
  throw new Error("Chrome/Edge executable not found. Set CHROME_PATH.");
}

const samples = [];

for (let i = 1; i <= runs; i += 1) {
  const browser = await launchBrowser();
  try {
    const context = isolatedBrowser
      ? browser.defaultBrowserContext()
      : await browser.createBrowserContext();
    const page = await context.newPage();
    await page.setCacheEnabled(true);

    samples.push(await navigate(page, url, i, "first"));
    samples.push(await navigate(page, url, i, "return"));

    if (!isolatedBrowser) await context.close();
  } finally {
    await browser.close();
  }
}

console.log(JSON.stringify({ url, executablePath, isolatedBrowser, samples }, null, 2));

async function launchBrowser() {
  return puppeteer.launch({
    executablePath,
    headless: "new",
    args: [
      "--enable-quic",
      "--no-first-run",
      "--disable-background-networking",
      "--disable-default-apps",
    ],
  });
}

async function navigate(page, targetUrl, run, phase) {
  const response = await page.goto(targetUrl, { waitUntil: "load" });
  await new Promise((resolve) => setTimeout(resolve, 100));
  const metrics = await page.evaluate(() => {
    const nav = performance.getEntriesByType("navigation")[0];
    const paints = Object.fromEntries(
      performance.getEntriesByType("paint").map((entry) => [
        entry.name,
        Math.round(entry.startTime),
      ]),
    );
    const resources = performance.getEntriesByType("resource").map((entry) => ({
      name: entry.name,
      type: entry.initiatorType,
      protocol: entry.nextHopProtocol,
      transferSize: entry.transferSize,
      encodedBodySize: entry.encodedBodySize,
      responseStart: Math.round(entry.responseStart),
      responseEnd: Math.round(entry.responseEnd),
    }));
    return {
      nav: nav ? nav.toJSON() : null,
      paints,
      resources,
    };
  });

  const nav = metrics.nav || {};
  return {
    run,
    phase,
    status: response?.status() ?? null,
    fromCache: response?.fromCache() ?? null,
    fromServiceWorker: response?.fromServiceWorker() ?? null,
    headers: response?.headers() ?? {},
    timingMs: {
      dns: delta(nav.domainLookupStart, nav.domainLookupEnd),
      tcp: tcpMs(nav),
      tls: tlsMs(nav),
      requestToFirstByte: delta(nav.requestStart, nav.responseStart),
      responseDownload: delta(nav.responseStart, nav.responseEnd),
      domContentLoaded: round(nav.domContentLoadedEventEnd),
      load: round(nav.loadEventEnd),
      firstPaint: metrics.paints["first-paint"] ?? null,
      firstContentfulPaint: metrics.paints["first-contentful-paint"] ?? null,
    },
    transfer: {
      protocol: nav.nextHopProtocol || "",
      transferSize: nav.transferSize ?? null,
      encodedBodySize: nav.encodedBodySize ?? null,
      decodedBodySize: nav.decodedBodySize ?? null,
    },
    resources: metrics.resources,
  };
}

function delta(start, end) {
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return 0;
  return Math.round(end - start);
}

function tlsMs(nav) {
  if (!Number.isFinite(nav.secureConnectionStart) || nav.secureConnectionStart <= 0) {
    return 0;
  }
  return delta(nav.secureConnectionStart, nav.connectEnd);
}

function tcpMs(nav) {
  if (!Number.isFinite(nav.connectStart) || !Number.isFinite(nav.connectEnd)) return 0;
  const end =
    Number.isFinite(nav.secureConnectionStart) && nav.secureConnectionStart > 0
      ? nav.secureConnectionStart
      : nav.connectEnd;
  return delta(nav.connectStart, end);
}

function round(value) {
  return Number.isFinite(value) ? Math.round(value) : null;
}
