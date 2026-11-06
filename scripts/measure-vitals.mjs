import { chromium, devices } from "playwright";
import { createRequire } from "node:module";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";

const base = new URL(process.argv[2] ?? "http://127.0.0.1:3100");
const runs = Number(process.argv[3] ?? 5);
if (!Number.isSafeInteger(runs) || runs < 1 || runs > 20) throw new Error("Choose 1–20 samples per route.");

const require = createRequire(import.meta.url);
const vitals = await readFile(join(dirname(require.resolve("web-vitals")), "web-vitals.iife.js"), "utf8");
const browser = await chromium.launch({
  args: ["--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream"]
});

function p75(rows, field) {
  const values = rows.map((row) => row[field]).filter(Number.isFinite).sort((a, b) => a - b);
  return values.length ? values[Math.ceil(values.length * 0.75) - 1] : null;
}

try {
  const output = {};
  for (const route of ["/fr", "/fr/scan"]) {
    const results = [];
    for (let sample = 0; sample < runs; sample++) {
      const context = await browser.newContext({ ...devices["Pixel 7"], permissions: ["camera"], serviceWorkers: "block" });
      try {
        await context.addInitScript({
          content: vitals + "\nwindow.labVitals = {}; for (const key of ['LCP','INP','CLS']) webVitals['on' + key](m => { window.labVitals[key] = m.value; }, {reportAllChanges: true});"
        });
        const page = await context.newPage();
        const devtools = await context.newCDPSession(page);
        await devtools.send("Emulation.setCPUThrottlingRate", { rate: 4 });
        await devtools.send("Network.enable");
        await devtools.send("Network.emulateNetworkConditions", {
          offline: false, latency: 150, downloadThroughput: 200_000, uploadThroughput: 93_750,
          connectionType: "cellular4g"
        });
        await page.goto(new URL(route, base).href, { waitUntil: "load" });
        if (route.endsWith("/scan")) {
          await page.getByText("Recherche d'un code…", { exact: true }).waitFor();
          await page.getByRole("button", { name: "QR code", exact: true }).tap();
          await page.getByRole("button", { name: "Code-barres", exact: true }).tap();
        } else {
          await page.getByRole("button", { name: "Plus", exact: true }).tap();
          await page.getByRole("button", { name: "Changer de langue" }).waitFor();
        }
        await page.waitForFunction(() => window.labVitals.INP !== undefined, undefined, { timeout: 5000 }).catch(() => {});
        results.push(await page.evaluate(() => ({
          ...window.labVitals,
          scriptBytes: performance.getEntriesByType("resource")
            .filter((entry) => new URL(entry.name).origin === location.origin && new URL(entry.name).pathname.endsWith(".js"))
            .reduce((bytes, entry) => bytes + entry.transferSize, 0)
        })));
      } finally {
        await context.close();
      }
    }
    output[route] = {
      p75: Object.fromEntries(["LCP", "INP", "CLS", "scriptBytes"].map((field) => [field, p75(results, field)])),
      samples: results
    };
  }
  console.log(JSON.stringify(output, null, 2));
} finally {
  await browser.close();
}
