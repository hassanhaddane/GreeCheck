import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { mockProductApis } from "./fixtures";

test.beforeEach(async ({ page }) => {
  await mockProductApis(page);
  await page.emulateMedia({ reducedMotion: "reduce" });
});

for (const route of ["/fr", "/fr/scan", "/fr/discover", "/fr/product/11111111", "/ar/criteria"]) {
  test(`${route} has no WCAG A/AA violations`, async ({ page }) => {
    await page.goto(route);
    await page.locator("main").waitFor();
    await page.waitForTimeout(700);
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);
  });
}
