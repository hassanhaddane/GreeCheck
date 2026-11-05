import { devices, expect, test } from "@playwright/test";
import { mockProductApis } from "./fixtures";

test.beforeEach(async ({ page }) => {
  await mockProductApis(page);
});

test("desktop search, filters and keyboard skip link", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/fr/search");
  await page.getByPlaceholder("Produit, marque, besoin…").fill("test");
  await page.getByPlaceholder("Produit, marque, besoin…").press("Enter");
  await expect(page.getByText("4 résultats", { exact: true })).toBeVisible();
  await expect(page.getByText("Test Oats", { exact: true })).toBeVisible();

  const filters = page.getByRole("button", { name: "Filtres", exact: true });
  await filters.focus();
  await page.keyboard.press("Enter");
  const dialog = page.getByRole("dialog", { name: "Filtres" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Fermer" })).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(dialog.getByRole("button", { name: /Voir \d+ résultats/ })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(filters).toBeFocused();

  const organic = page.getByRole("button", { name: "Bio", exact: true });
  await organic.click();
  await expect(organic).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByText("Test Oats", { exact: true })).toBeVisible();
  await expect(page.getByText("Test Choco", { exact: true })).toBeHidden();
  await page.getByRole("button", { name: "Tous", exact: true }).click();
  await page.getByRole("button", { name: "Sans additifs signalés", exact: true }).click();
  await expect(page.getByText("Test Partial Product", { exact: true })).toBeHidden();
  await expect(page.getByText("Test Choco", { exact: true })).toBeHidden();
  await expect(page.getByText("Test Oats", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Tous", exact: true }).click();
  await expect(page.getByText("4 résultats", { exact: true })).toBeVisible();

  await page.goto("/fr/discover");
  await page.keyboard.press("Tab");
  const skip = page.getByRole("link", { name: "Aller au contenu principal" });
  await expect(skip).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("#main-content")).toBeFocused();
});

test("Around me denied has a translated recovery state", async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, permissions: [] });
  const page = await context.newPage();
  await page.goto("/fr/discover");
  await page.getByRole("button", { name: "Autour de moi" }).click();
  await expect(page.getByText("Localisation indisponible", { exact: true })).toBeVisible();
  await context.close();
});

test("FR, EN and Arabic RTL render without horizontal overflow at all required viewports", async ({ page }) => {
  const viewports = [
    { width: 320, height: 800 },
    { width: 375, height: 812 },
    { width: 390, height: 844 },
    { width: 430, height: 932 },
    { width: 768, height: 1024 },
    { width: 1280, height: 800 },
    { width: 1440, height: 900 }
  ];

  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    await page.goto("/ar/criteria");
    await expect(page.getByRole("heading", { name: "معاييري" })).toBeVisible();
    const dimensions = await page.evaluate(() => ({
      dir: document.documentElement.dir,
      lang: document.documentElement.lang,
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth
    }));
    expect(dimensions).toMatchObject({ dir: "rtl", lang: "ar" });
    expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth);
  }

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/en/privacy");
  await expect(page.getByText("No advertising", { exact: true })).toBeVisible();
  await page.goto("/fr/privacy");
  await expect(page.getByText("Aucune publicité", { exact: true })).toBeVisible();
});

test("primary navigation has three destinations and the secondary menu works on desktop and mobile", async ({ page }) => {
  for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(viewport);
    await page.goto("/fr");
    const nav = page.getByRole("navigation", { name: "Navigation principale" });
    await expect(nav.getByRole("link")).toHaveCount(3);
    await expect(nav.getByRole("link", { name: "Scanner", exact: true })).toHaveAttribute("href", "/fr/scan");
    await expect(nav.getByRole("link", { name: "Rechercher", exact: true })).toHaveAttribute("href", "/fr/search");
    await nav.getByRole("link", { name: "Mes produits", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Mes produits" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Mes produits", exact: true })).toHaveAttribute("aria-current", "page");

    await page.getByRole("button", { name: "Plus", exact: true }).click();
    const more = page.getByRole("dialog", { name: "Plus" });
    await expect(more.getByRole("link", { name: "GreeCompare" })).toHaveAttribute("href", "/fr/compare");
    await expect(more.getByRole("link", { name: "GreeCart" })).toHaveAttribute("href", "/fr/cart");
    await more.getByRole("link", { name: "Découvrir" }).click();
    await expect(page).toHaveURL(/\/fr\/discover$/);
    await expect(more).toBeHidden();
  }
});

for (const profile of ["iPhone 13", "Pixel 7"] as const) {
  test(profile + " · home search, product and right-to-left navigation", async ({ browser }) => {
    const context = await browser.newContext({ ...devices[profile], reducedMotion: "reduce" });
    try {
      const page = await context.newPage();
      await mockProductApis(page);
      await page.goto("/fr");
      await page.getByRole("searchbox").fill("test");
      await page.getByRole("searchbox").press("Enter");
      await expect(page).toHaveURL(/\/fr\/search\?q=test/);
      await page.getByRole("link", { name: /Test Oats/ }).click();
      await expect(page.getByRole("heading", { name: "Test Oats" })).toBeVisible();
      await page.goto("/ar/product/44444440");
      await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
      await expect(page.getByText("غير قابل للتقييم", { exact: true })).toBeVisible();
      const main = await page.locator("main").ariaSnapshot();
      expect(main).toContain("GreeScore");
      expect(main).toContain("غير قابل للتقييم");
    } finally {
      await context.close();
    }
  });
}

test("essential screens reflow at 320 CSS pixels and with 200% text on tablet", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 820 });
  for (const route of ["/fr", "/ar/product/11111115", "/en/search?q=test"]) {
    await page.goto(route);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    const main = page.locator("main");
    expect(await main.evaluate(el => el.scrollWidth)).toBeLessThanOrEqual(320);
  }

  await page.setViewportSize({ width: 768, height: 1024 });
  await page.goto("/fr/product/44444440");
  await page.locator("html").evaluate(el => { el.style.fontSize = "200%"; });
  await expect(page.getByText("Non évaluable", { exact: true })).toBeVisible();
  for (const region of ["header", "main"]) {
    expect(await page.locator(region).first().evaluate(el => el.scrollWidth)).toBeLessThanOrEqual(768);
  }
  await page.getByRole("button", { name: "Ce qui manque" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
});

test("home submits the localized search before JavaScript is available", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 375, height: 812 } });
  try {
    const page = await context.newPage();
    await page.goto("/ar");
    await page.getByRole("searchbox").fill("test");
    await page.getByRole("searchbox").press("Enter");
    await expect(page).toHaveURL(/\/ar\/search\?q=test/);
  } finally {
    await context.close();
  }
});
