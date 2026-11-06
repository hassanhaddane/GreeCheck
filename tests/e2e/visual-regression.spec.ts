/**
 * Visual regression for the critical screens.
 *
 * Runs with mocked product APIs, reduced motion and a fixed viewport so the
 * only thing that can move a pixel is an actual UI change. Baselines live in
 * tests/e2e/visual-regression.spec.ts-snapshots/ and are refreshed with
 * `npx playwright test visual-regression --update-snapshots`.
 * On failure CI uploads the diff images (see .github/workflows/ci.yml).
 */
import { expect, test } from "@playwright/test";
import { mockIdleCamera, mockProductApis } from "./fixtures";

// Mobile-first: the design floor the whole app is built against.
const MOBILE = { width: 375, height: 812 };
const TABLET = { width: 768, height: 1024 };
const DESKTOP = { width: 1440, height: 900 };

test.beforeEach(async ({ page }) => {
  await mockProductApis(page);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize(MOBILE);
});

/** Screens that must never change silently. */
const CRITICAL_SCREENS: Array<{ name: string; path: string; viewport?: typeof MOBILE; prepare?: "alternative" | "search" | "loading" | "error" }> = [
  { name: "home", path: "/fr" },
  { name: "home-desktop", path: "/fr", viewport: DESKTOP },
  { name: "scan", path: "/fr/scan" },
  { name: "product-poor", path: "/fr/product/11111115", prepare: "alternative" },
  { name: "product-good", path: "/fr/product/22222220" },
  { name: "product-tablet", path: "/fr/product/22222220", viewport: TABLET },
  { name: "product-incomplete", path: "/fr/product/44444440" },
  { name: "product-loading", path: "/fr/product/22222220", prepare: "loading" },
  { name: "product-error", path: "/fr/product/22222220", prepare: "error" },
  { name: "search-desktop", path: "/fr/search?q=test", viewport: DESKTOP, prepare: "search" },
  { name: "compare-empty", path: "/fr/compare" },
  { name: "cart-empty", path: "/fr/cart" },
  { name: "list-empty", path: "/fr/list" },
  { name: "support", path: "/fr/support" },
  { name: "home-rtl", path: "/ar" }
];

for (const screen of CRITICAL_SCREENS) {
  test(`visual: ${screen.name}`, async ({ page }) => {
    if (screen.viewport) await page.setViewportSize(screen.viewport);
    if (screen.name === "scan") await mockIdleCamera(page);
    if (screen.prepare === "loading") {
      // Keep the lookup pending until after the screenshot.
      await page.route("**/api/product/*", () => {});
    }
    if (screen.prepare === "error") {
      await page.route("**/api/product/*", route => route.abort());
    }
    await page.goto(screen.path);
    await page.locator("main").waitFor();
    if (screen.prepare === "alternative") {
      await page.getByRole("button", { name: "Trouver une alternative" }).click();
      await expect(page.getByRole("link", { name: /Test Oats/ }).first()).toBeVisible();
      await page.evaluate(() => { (document.activeElement as HTMLElement | null)?.blur(); window.scrollTo(0, 0); });
    } else if (screen.prepare === "search") {
      await expect(page.getByText("4 résultats", { exact: true })).toBeVisible();
    } else if (screen.prepare === "loading") {
      await expect(page.getByRole("status", { name: "Chargement de la fiche" })).toBeVisible();
    } else if (screen.prepare === "error") {
      await expect(page.getByRole("alert").filter({ has: page.getByRole("button", { name: "Réessayer" }) })).toBeVisible();
    } else if (screen.path.includes("/product/")) {
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    } else if (screen.name === "scan") {
      await expect(page.getByText("Recherche d'un code…", { exact: true })).toBeVisible();
    }

    // Hide only the unpredictable camera feed so the scan frame and guidance stay in the snapshot.
    await page.locator("video").evaluateAll(videos => videos.forEach(video => { video.style.visibility = "hidden"; }));
    await expect(page).toHaveScreenshot(`${screen.name}.png`, {
      fullPage: true,
      maxDiffPixelRatio: 0.02,
      animations: "disabled"
    });
  });
}
