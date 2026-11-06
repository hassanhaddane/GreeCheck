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

        await page.getByRole("button", { name: "Trouver une alternative" }).click();
        await expect(
            page.getByRole("heading", { name: "Meilleures alternatives" }),
        ).toBeVisible();

        await expect(
            page
                .getByRole("listitem")
                .filter({ hasText: "Test Oats" })
                .first(),
        ).toBeVisible();

        await page.getByRole("button", { name: "Favori" }).click();
        await page.getByRole("button", { name: "Ajouter à ma liste" }).click();
        await page.getByRole("button", { name: "Voir ma liste" }).click();
        await expect(page).toHaveURL(/\/fr\/list$/);
        await expect(page.getByText("Test Choco", { exact: true })).toBeVisible();
        await page.goto("/fr/product/11111115");
        await page.getByRole("button", { name: "Autres actions" }).click();

        await page
            .getByRole("button", { name: "Ajouter au panier" })
            .last()
            .click();

        await page.goto("/fr/favorites");
        await expect(page).toHaveURL(/\/fr\/products\/favorites$/);
        await expect(page.getByRole("heading", { name: "Mes produits" })).toBeVisible();

        await expect(
            page
                .locator("main")
                .getByText("Test Choco", { exact: true })
                .last(),
        ).toBeVisible();

        await page.getByRole("navigation", { name: "Mes produits" }).getByRole("link", { name: "Récents" }).click();
        await expect(page).toHaveURL(/\/fr\/products$/);

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

        await page.getByRole("button", { name: "Autres actions" }).click();
        // It must still expose the relevant decision actions.
        await expect(
            page.getByRole("button", { name: "Ajouter au panier" }),
        ).toBeVisible();

        await expect(
            page.getByRole("button", { name: "Comparer", exact: true }),
        ).toBeVisible();
      },
  );

  test(
      "incomplete product has no numeric score and lists missing evidence",
      async ({ page }) => {
        await page.goto("/fr/product/44444440");

        await expect(
            page.getByRole("heading", {
              name: "Test Partial Product",
            }),
        ).toBeVisible();

        // Required data missing => no score.
        await expect(page.getByText("Non évaluable", { exact: true }).last()).toBeVisible();
        await expect(page.locator("main")).toContainText("les valeurs nutritionnelles nécessaires sont absentes");

        // The exact missing-data reason is disclosed on demand.
        await page
            .getByRole("button", { name: "Ce qui manque" })
            .click();

        await expect(page.getByRole("dialog")).toContainText(
            "Ingrédients",
        );
      },
  );

  test("product lookup recovers after a network error", async ({ page }) => {
    await page.route("**/api/product/22222220", route => route.abort(), { times: 1 });
    await page.goto("/fr/product/22222220");
    const error = page.getByRole("alert");
    await expect(error.getByRole("button", { name: "Réessayer" })).toBeVisible();
    await error.getByRole("button", { name: "Réessayer" }).click();
    await expect(page.getByRole("heading", { name: "Test Oats" })).toBeVisible();
  });

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

        await expect(main).toContainText("Gagnant nutritionnel");
        await expect(main).toContainText("Test Oats");
        await expect(main).toContainText("Test Choco");

        await addToCompare(page, "33333335");

        await page.goto("/fr/battle");
        await expect(page).toHaveURL(/\/fr\/compare$/);
        const advanced = page.getByRole("button", { name: "Comparaison avancée" });
        await expect(advanced).toHaveAttribute("aria-expanded", "false");
        await expect(page.getByRole("heading", { name: "Podium" })).toBeHidden();
        await advanced.click();

        await expect(
            page.getByRole("heading", { name: "Podium" }),
        ).toBeVisible();

        await expect(main).toContainText("Test Almond Spread");
        await expect(main).toContainText("Gagnant nutritionnel");
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
            main.getByText("Gagnant nutritionnel", { exact: true }),
        ).toHaveCount(0);
      },
  );
});
test("clear-history confirmation preserves the favourite and the shopping list", async ({ page }) => {
  await mockProductApis(page);
  await page.goto("/fr/product/11111115");
  await page.getByRole("button", { name: "Favori", exact: true }).click();
  await page.getByRole("button", { name: "Ajouter à ma liste" }).click();
  await page.goto("/fr/products");
  await page.getByRole("button", { name: "Vider l’historique" }).click();
  const confirmation = page.getByRole("dialog", { name: "Vider l’historique" });
  await confirmation.getByRole("button", { name: "Vider l’historique" }).click();
  await expect(page.getByText("Aucun scan pour l'instant", { exact: true })).toBeVisible();

  const library = page.getByRole("navigation", { name: "Mes produits" });
  await library.getByRole("link", { name: "Favoris" }).click();
  await expect(page.getByRole("link", { name: /Test Choco/ })).toBeVisible();
  await library.getByRole("link", { name: "Mes listes" }).click();
  await expect(page.getByRole("link", { name: "Test Choco" })).toBeVisible();
  await library.getByRole("link", { name: "Récents" }).click();
  await expect(page).toHaveURL(/\/fr\/products$/);
  await page.reload();
  await expect(page.getByText("Aucun scan pour l'instant", { exact: true })).toBeVisible();
});
