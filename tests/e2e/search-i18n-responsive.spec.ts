import { expect, test } from "@playwright/test";
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

  await page.getByRole("button", { name: "Filtres" }).click();
  await expect(page.getByRole("dialog", { name: "Filtres" })).toBeVisible();
  const organic = page.getByRole("button", { name: "Bio", exact: true });
  await organic.click();
  await page.getByRole("button", { name: /Voir \d+ résultats/ }).click();
  await expect(page.getByText("Test Oats", { exact: true })).toBeVisible();
  await expect(page.getByText("Test Choco", { exact: true })).toBeHidden();

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
    { width: 360, height: 800 },
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
