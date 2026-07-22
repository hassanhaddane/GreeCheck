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
import { mockProductApis } from "./fixtures";

// Mobile-first: the design floor the whole app is built against.
const MOBILE = { width: 390, height: 844 };

test.beforeEach(async ({ page }) => {
  await mockProductApis(page);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize(MOBILE);
});

/** Screens that must never change silently. */
const CRITICAL_SCREENS: Array<{ name: string; path: string }> = [
  { name: "home", path: "/fr" },
  { name: "scan", path: "/fr/scan" },
  { name: "product-poor", path: "/fr/product/11111111" },
  { name: "product-good", path: "/fr/product/22222222" },
  { name: "compare-empty", path: "/fr/compare" },
  { name: "cart-empty", path: "/fr/cart" },
  { name: "list-empty", path: "/fr/list" },
  { name: "support", path: "/fr/support" },
  { name: "home-rtl", path: "/ar" }
];

for (const screen of CRITICAL_SCREENS) {
  test(`visual: ${screen.name}`, async ({ page }) => {
    await page.goto(screen.path);
    await page.locator("main").waitFor();
    // Let client islands hydrate and any one-shot reveal settle.
    await page.waitForTimeout(900);

    await expect(page).toHaveScreenshot(`${screen.name}.png`, {
      fullPage: true,
      // Tolerate sub-pixel font rendering differences between machines.
      maxDiffPixelRatio: 0.02,
      animations: "disabled",
      // The camera preview is inherently non-deterministic.
      mask: [page.locator("video")]
    });
  });
}
