import {expect, Page, test} from "@playwright/test";
import { mockProductApis } from "./fixtures";
test.describe("Product decisions and local library", () => {
  test.beforeEach(async ({ page }) => {
    await mockProductApis(page);
  });

  test(
      "poor product gets GreeSwap; favorites, history, criteria and GreeCart persist",
      async ({ page }) => {
        await page.goto("/fr/product/11111115");

        await expect(
            page.getByRole("heading", { name: "Test Choco" }),
        ).toBeVisible();

        // A poor product surfaces alternatives; the alternative appears as a list item.
        await expect(
            page.getByRole("heading", { name: "Meilleures alternatives" }),
        ).toBeVisible();

        await expect(
            page
                .getByRole("listitem")
                .filter({ hasText: "Test Oats" })
                .first(),
        ).toBeVisible();

        await page.getByRole("button", { name: "Favori" }).first().click();

        await page
            .getByRole("button", { name: "Ajouter au panier" })
            .last()
            .click();

        await page.goto("/fr/favorites");

        await expect(
            page
                .locator("main")
                .getByText("Test Choco", { exact: true })
                .last(),
        ).toBeVisible();

        await page.goto("/fr/history");

        await expect(
            page
                .locator("main")
                .getByText("Test Choco", { exact: true })
                .last(),
        ).toBeVisible();

        await page.goto("/fr/criteria");

        const sugar = page.getByRole("checkbox", {
          name: "Réduire le sucre",
        });

        await sugar.check();
        await expect(sugar).toBeChecked();

        await page.goto("/fr/cart");

        const main = page.locator("main");

        await expect(main).toContainText("Test Choco");

        await page
            .getByRole("button", { name: "Construire le plan" })
            .click();

        // The improvement plan proposes replacing the poor product
        // with the healthier alternative.
        await expect(
            page
                .getByRole("listitem")
                .filter({ hasText: /Test Choco.*Test Oats/ }),
        ).toBeVisible();

        await page
            .getByRole("button", { name: "Appliquer", exact: true })
            .click();

        await expect(
            main.getByText("Test Choco", { exact: true }),
        ).toBeHidden();
      },
  );

  test(
      "good product exposes Cart and GreeCompare actions and no unnecessary alternatives",
      async ({ page }) => {
        await page.goto("/fr/product/22222220");

        await expect(
            page.getByRole("heading", { name: "Test Oats" }),
        ).toBeVisible();

        // A good product must not push unnecessary alternatives.
        await expect(
            page.getByRole("heading", { name: "Meilleures alternatives" }),
        ).toHaveCount(0);

        // It must still expose the relevant decision actions.
        await expect(
            page.getByRole("button", { name: "Ajouter au panier" }),
        ).toBeVisible();

        await expect(
            page.getByRole("button", { name: "GreeCompare" }),
        ).toBeVisible();
      },
  );

  test(
      "incomplete product is unscored and names the missing ingredient list",
      async ({ page }) => {
        await page.goto("/fr/product/44444440");

        await expect(
            page.getByRole("heading", {
              name: "Test Partial Product",
            }),
        ).toBeVisible();

        // Required data missing => no score.
        await expect(page.locator("main")).toContainText(
            "Données insuffisantes",
        );

        // The exact missing-data reason is disclosed on demand.
        await page
            .getByRole("button", { name: "Ce qui manque" })
            .click();

        await expect(page.getByRole("dialog")).toContainText(
            "Liste d’ingrédients manquante",
        );
      },
  );

  test("empty GreeCart has a useful recovery action", async ({ page }) => {
    await page.goto("/fr/cart");

    await expect(
        page.getByText("Ton panier est vide.", { exact: true }),
    ).toBeVisible();

    await expect(
        page.getByRole("button", {
          name: "Scanner un autre produit",
        }),
    ).toBeVisible();
  });
});

test.describe("GreeCompare journeys", () => {
  test.beforeEach(async ({ page }) => {
    await mockProductApis(page);
    await page.setViewportSize({ width: 390, height: 844 });
  });

  async function addToCompare(page: Page, code: string): Promise<void> {
    await page.goto("/fr/scan");

    await page
        .getByRole("textbox", { name: "Saisie manuelle" })
        .fill(code);

    await page
        .getByRole("button", {
          name: "Entrer le code-barres",
          exact: true,
        })
        .click();

    const intro = page.getByRole("dialog", {
      name: "Bienvenue dans GreeCheck",
    });

    if (await intro.isVisible().catch(() => false)) {
      await intro
          .getByRole("button", { name: "Ignorer" })
          .filter({ hasText: "Ignorer" })
          .click();
    }

    // Rapid-scan action: add the resolved product to GreeCompare.
    await page
        .getByRole("button", { name: "Comparer" })
        .click();
  }

  test(
      "two-product and three-product comparison name a health winner",
      async ({ page }) => {
        await addToCompare(page, "11111115");
        await addToCompare(page, "22222220");

        await page.goto("/fr/compare");

        const main = page.locator("main");

        await expect(main).toContainText("Gagnant santé");
        await expect(main).toContainText("Test Oats");
        await expect(main).toContainText("Test Choco");

        await addToCompare(page, "33333335");

        await page.goto("/fr/compare");

        await expect(
            page.getByRole("heading", { name: "Podium" }),
        ).toBeVisible();

        await expect(main).toContainText("Test Almond Spread");
        await expect(main).toContainText("Gagnant santé");
      },
  );

  test(
      "incomparable products refuse a misleading winner",
      async ({ page }) => {
        await addToCompare(page, "22222220");
        await addToCompare(page, "55555555");

        await page.goto("/fr/compare");

        const main = page.locator("main");

        // The application explicitly warns that the products
        // should not receive a misleading comparison verdict.
        await expect(
            main.getByText("Produits peu comparables", {
              exact: true,
            }),
        ).toBeVisible();

        // Both selected products must still be visible.
        await expect(main).toContainText("Test Oats");
        await expect(main).toContainText("Test Tomato Soup");

        // No health winner may be declared for incompatible categories.
        await expect(
            main.getByText("Gagnant santé", { exact: true }),
        ).toHaveCount(0);
      },
  );
});