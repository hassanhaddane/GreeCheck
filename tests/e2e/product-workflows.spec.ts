import { expect, test } from "@playwright/test";
import { mockProductApis } from "./fixtures";

test.describe("Product decisions and local library", () => {
  test.beforeEach(async ({ page }) => {
    await mockProductApis(page);
  });

  test("poor product gets GreeSwap; favorites, history, criteria and GreeCart persist", async ({ page }) => {
    await page.goto("/fr/product/11111111");
    await expect(page.getByRole("heading", { name: "Test Choco" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Meilleures alternatives" })).toBeVisible();
    await expect(page.getByText("Test Oats", { exact: true })).toBeVisible();

    const favoriteButtons = page.getByRole("button", { name: "Favori" });
    await favoriteButtons.first().click();
    await page.getByRole("button", { name: "Ajouter au panier" }).last().click();

    await page.goto("/fr/favorites");
    await expect(page.locator("main").getByText("Test Choco", { exact: true }).last()).toBeVisible();
    await page.goto("/fr/history");
    await expect(page.locator("main").getByText("Test Choco", { exact: true }).last()).toBeVisible();

    await page.goto("/fr/criteria");
    const sugar = page.getByRole("checkbox", { name: "Réduire le sucre" });
    await sugar.check();
    await expect(sugar).toBeChecked();

    await page.goto("/fr/cart");
    await expect(page.locator("main")).toContainText("Test Choco");
    await page.getByRole("button", { name: "Construire le plan" }).click();
    await expect(page.locator("p.truncate").filter({ hasText: /Test Choco.*Test Oats/ })).toBeVisible();
    await page.getByRole("button", { name: "Appliquer", exact: true }).click();
    await expect(page.getByText("Test Oats", { exact: true })).toBeVisible();
    await expect(page.locator("main").getByText("Test Choco", { exact: true })).toBeHidden();
  });

  test("good product does not show unnecessary alternatives", async ({ page }) => {
    await page.goto("/fr/product/22222222");
    await expect(page.getByRole("heading", { name: "Test Oats" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Meilleures alternatives" })).toHaveCount(0);
    await expect(page.getByText("Tu peux l’ajouter à ton GreeCart ou le comparer à un autre produit.", { exact: true })).toBeVisible();
  });

  test("incomplete product communicates partial confidence", async ({ page }) => {
    await page.goto("/fr/product/44444444");
    await expect(page.getByRole("heading", { name: "Test Partial Product" })).toBeVisible();
    await expect(page.locator("main")).toContainText("Données partielles");
    await expect(page.locator("main")).toContainText("Liste d’ingrédients incomplète");
  });

  test("empty GreeCart has a useful recovery action", async ({ page }) => {
    await page.goto("/fr/cart");
    await expect(page.getByText("Ton panier est vide.", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Scanner un autre produit" })).toBeVisible();
  });
});

test.describe("Battle journeys", () => {
  test.beforeEach(async ({ page }) => {
    await mockProductApis(page);
    await page.setViewportSize({ width: 390, height: 844 });
  });

  async function addFromScan(page: import("@playwright/test").Page, code: string) {
    await page.goto("/fr/scan");
    await page.getByRole("textbox", { name: "Saisie manuelle" }).fill(code);
    await page.getByRole("button", { name: "Entrer le code-barres", exact: true }).click();
    const intro = page.getByRole("dialog", { name: "Bienvenue dans GreeCheck" });
    if (await intro.isVisible().catch(() => false)) {
      await intro.getByRole("button", { name: "Ignorer" }).filter({ hasText: "Ignorer" }).click();
    }
    await page.getByRole("button", { name: "Ajouter au Battle" }).click();
  }

  test("two-product and three-product Battle produce a clear verdict", async ({ page }) => {
    await addFromScan(page, "11111111");
    await addFromScan(page, "22222222");
    await page.goto("/fr/battle");
    await expect(page.locator("main")).toContainText("Choisis Test Oats");
    await expect(page.locator("main")).toContainText("Test Choco");

    await addFromScan(page, "33333333");
    await page.goto("/fr/battle");
    await expect(page.getByRole("heading", { name: "Podium" })).toBeVisible();
    await expect(page.locator("main")).toContainText("Test Almond Spread");
    await expect(page.locator("main")).toContainText("Choisis Test Oats");
  });

  test("incomparable Battle refuses a misleading winner", async ({ page }) => {
    await addFromScan(page, "22222222");
    await addFromScan(page, "55555555");
    await page.goto("/fr/battle");
    await expect(page.getByText("Comparaison peu fiable", { exact: true })).toBeVisible();
    await expect(page.getByText("Les produits appartiennent à des catégories différentes.", { exact: true })).toBeVisible();
  });
});
