import { expect, test } from "@playwright/test";
import { mockProductApis } from "./fixtures";

test("localized manifests are installable and start standalone in GreeLens", async ({ request }) => {
  for (const locale of ["fr", "en", "ar"] as const) {
    const response = await request.get(`/${locale}/manifest.webmanifest`);
    expect(response.ok()).toBeTruthy();
    expect(response.headers()["content-type"]).toContain("application/manifest+json");
    const manifest = await response.json();
    expect(manifest).toMatchObject({
      id: "/",
      lang: locale,
      dir: locale === "ar" ? "rtl" : "ltr",
      display: "standalone",
      start_url: `/${locale}/scan?source=pwa`
    });
    expect(manifest.shortcuts.map((shortcut: { url: string }) => shortcut.url)).toEqual([
      `/${locale}/scan?source=pwa`, `/${locale}/search`, `/${locale}/products`
    ]);
    expect(manifest.icons).toEqual(expect.arrayContaining([
      expect.objectContaining({ sizes: "192x192" }),
      expect.objectContaining({ sizes: "512x512" }),
      expect.objectContaining({ purpose: "maskable" })
    ]));
  }
});

test("complete fixture is indexable and an invalid product is not", async ({ page }) => {
  test.setTimeout(60_000);
  await page.goto("/fr/product/3017620422003");
  await expect(page).toHaveTitle(/Nutella.*GreeCheck/);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", "https://greecheck.app/fr/product/3017620422003");
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /index, follow/);
  const jsonLd = page.locator('script[type="application/ld+json"]');
  await expect(jsonLd).toHaveCount(1);
  expect(await jsonLd.textContent()).toContain('"@type":"Product"');
  await expect(page.locator('link[rel="alternate"][hreflang="ar"]')).toHaveAttribute("href", /\/ar\/product\/3017620422003/);
  await page.getByRole("button", { name: "Source et méthodologie" }).click();
  await expect(page.getByText("Identité et champs contrôlés")).toBeVisible();
  await expect(page.getByText("Version Nutri-Score", { exact: true })).toBeVisible();

  await page.goto("/fr/product/000000");
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  await expect(page.locator('script[type="application/ld+json"]')).toHaveCount(0);
});

test("cached fixture remains readable offline", async ({ page, context }) => {
  test.setTimeout(60_000);
  await page.goto("/fr/product/3017620422003");
  await expect(page.getByRole("heading", { name: "Nutella" })).toBeVisible();
  await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true);
  await page.reload();
  await expect(page.getByRole("heading", { name: "Nutella" })).toBeVisible();
  await context.setOffline(true);
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Nutella" })).toBeVisible();
  await context.setOffline(false);
});

test("dark mode and reduced motion are honored", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" });
  await page.goto("/fr");
  await expect(page.locator("html")).toHaveClass(/dark/);
  const motion = await page.evaluate(() => {
    const element = document.createElement("div");
    element.style.animation = "reduced-motion-probe 10s linear infinite";
    document.body.append(element);
    const duration = getComputedStyle(element).animationDuration;
    element.remove();
    return duration;
  });
  expect(Number.parseFloat(motion)).toBeLessThanOrEqual(0.001);
});

test("robots, sitemap and localized marketing structured data are valid", async ({ page, request }) => {
  const robots = await (await request.get("/robots.txt")).text();
  expect(robots).toContain("Disallow: /api/");
  expect(robots).toContain("Sitemap: https://greecheck.app/sitemap.xml");
  const sitemap = await (await request.get("/sitemap.xml")).text();
  expect(sitemap).toContain('hreflang="ar"');
  expect(sitemap).toContain('hreflang="x-default"');

  await page.goto("/en");
  await expect(page).toHaveTitle(/Scan\. Understand\. Choose better/);
  const structured = await page.locator('script[type="application/ld+json"]').textContent();
  expect(structured).toContain('"@type":"WebApplication"');
  expect(structured).toContain('"inLanguage":"en"');
});

test("reopening the app offline can display a scan whose product page was never visited", async ({ page, context }) => {
  await mockProductApis(page);
  await page.goto("/fr/scan");
  await page.getByRole("textbox", { name: "Saisie manuelle" }).fill("11111115");
  await page.getByRole("button", { name: "Entrer le code-barres", exact: true }).click();
  await expect(page.getByRole("region", { name: "Scan éclair" }).getByText("Test Choco")).toBeVisible();
  await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true);
  await page.close();

  await context.setOffline(true);
  const reopened = await context.newPage();
  try {
    await reopened.goto("/fr/scan?source=pwa", { waitUntil: "domcontentloaded" });
    await expect(reopened.getByRole("heading", { name: "GreeLens" })).toBeVisible();
    await reopened.getByRole("navigation", { name: "Navigation principale" }).getByRole("link", { name: "Mes produits" }).click();
    const savedProduct = reopened.locator("main").getByRole("link", { name: /Test Choco/ });
    await expect(savedProduct).toBeVisible();
    await savedProduct.click();
    await expect(reopened.getByRole("heading", { name: "Test Choco" })).toBeVisible();
    await expect(reopened.getByText("Copie enregistrée sur cet appareil")).toBeVisible();
  } finally {
    await context.setOffline(false);
  }
});
