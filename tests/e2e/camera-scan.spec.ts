import { expect, test } from "@playwright/test";
import { mockProductApis } from "./fixtures";

test.describe("GreeLens camera and first scan", () => {
  test.beforeEach(async ({ page }) => {
    await mockProductApis(page);
    await page.setViewportSize({ width: 390, height: 844 });
  });

  test("accepted camera, first successful scan, onboarding and rapid session", async ({ page }) => {
    await page.goto("/fr/scan?source=pwa");
    await expect(page.getByRole("heading", { name: "GreeLens" })).toBeVisible();
    await expect(page.getByText("Recherche d'un code…", { exact: true })).toBeVisible();

    await page.getByRole("textbox", { name: "Saisie manuelle" }).fill("11111115");
    await page.getByRole("button", { name: "Entrer le code-barres", exact: true }).click();
    await expect(page.getByLabel("Scan éclair").getByText("Test Choco", { exact: true })).toBeVisible();
    const intro = page.getByRole("dialog", { name: "Bienvenue dans GreeCheck" });
    await expect(intro).toBeVisible();
    await intro.getByRole("button", { name: "Ignorer" }).filter({ hasText: "Ignorer" }).click();

    await page.getByRole("button", { name: "Scanner un autre" }).click();
    await page.getByRole("textbox", { name: "Saisie manuelle" }).fill("22222220");
    await page.getByRole("button", { name: "Entrer le code-barres", exact: true }).click();
    await expect(page.getByLabel("Scan éclair").getByText("Test Oats", { exact: true })).toBeVisible();
    await expect(page.getByText("2 scannés dans cette session", { exact: true })).toBeVisible();
    await expect(intro).toBeHidden();

    await page.goto("/fr/history");
    await expect(page.locator("main").getByText("Test Oats", { exact: true }).last()).toBeVisible();
    await expect(page.locator("main").getByText("Test Choco", { exact: true }).last()).toBeVisible();
  });

  test("denied camera recovers with manual and text-search fallbacks", async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, permissions: [] });
    const page = await context.newPage();
    await page.addInitScript(() => {
      Object.defineProperty(navigator, "mediaDevices", {
        configurable: true,
        value: {
          enumerateDevices: async () => [],
          getUserMedia: async () => { throw new DOMException("Permission denied", "NotAllowedError"); }
        }
      });
    });
    await mockProductApis(page);
    await page.goto("/fr/scan");
    await expect(page.getByLabel("GreeLens").getByText("Caméra refusée", { exact: true })).toBeVisible();
    await expect(page.getByLabel("GreeLens").getByRole("button", { name: "Rechercher par texte" })).toBeVisible();
    await expect(page.getByRole("textbox", { name: "Saisie manuelle" })).toBeVisible();
    await context.close();
  });

  test("product not found is explicit and recoverable", async ({ page }) => {
    await page.goto("/fr/scan");
    await page.getByRole("textbox", { name: "Saisie manuelle" }).fill("99999995");
    await page.getByRole("button", { name: "Entrer le code-barres", exact: true }).click();
    await expect(page.getByText("Produit introuvable dans Open Food Facts.", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Réessayer" }).first()).toBeVisible();
  });
});
