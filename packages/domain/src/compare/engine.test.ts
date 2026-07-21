/** GreeCompare — comparability, health/environment winners, low-confidence warning. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { computeComparison } from "./engine";
import { defaultPreferences } from "../criteria/model";
import type { LocalPreferences } from "../criteria/model";
import type { Product, ProductEnvironment } from "../product/model";

const PREFS: LocalPreferences = { ...defaultPreferences };

const env = (e: Omit<ProductEnvironment, "provider">): ProductEnvironment => ({ provider: "openfoodfacts", ...e });

function product(o: Partial<Product> = {}): Product {
  return {
    barcode: Math.random().toString().slice(2, 12), name: "P", source: "openfoodfacts",
    categories: ["dairy", "yogurts"], ingredientsText: "lait, ferments", additives: [], imageUrl: "x",
    nutriments: { energyKcal: 90, sugars: 6, salt: 0.1, proteins: 6, saturatedFat: 2, fiber: 1 },
    nutriScore: "b", novaGroup: 2, ...o
  };
}

/* ───────────────────────── comparability ───────────────────────── */

test("two comparable products yield a comparable result and a health winner", () => {
  const a = product({ barcode: "a", nutriScore: "a", novaGroup: 1, nutriments: { energyKcal: 60, sugars: 4, salt: 0.1, proteins: 6, saturatedFat: 1 } });
  const b = product({ barcode: "b", nutriScore: "d", novaGroup: 4, additives: ["e150d"], nutriments: { energyKcal: 120, sugars: 16, salt: 0.2, proteins: 3, saturatedFat: 4 } });
  const r = computeComparison([b, a], PREFS);
  assert.equal(r.validation.comparable, true);
  assert.equal(r.healthWinner?.product.barcode, "a");
  assert.equal(r.entries.length, 2);
  assert.ok(r.healthReasons.length > 0);
});

test("three products are supported and fully ranked", () => {
  const a = product({ barcode: "a", nutriScore: "a", novaGroup: 1, nutriments: { energyKcal: 55, sugars: 3, salt: 0.1, proteins: 8, saturatedFat: 1 } });
  const b = product({ barcode: "b", nutriScore: "c", novaGroup: 3, nutriments: { energyKcal: 100, sugars: 10, salt: 0.2, proteins: 5, saturatedFat: 3 } });
  const c = product({ barcode: "c", nutriScore: "e", novaGroup: 4, additives: ["e150d"], nutriments: { energyKcal: 160, sugars: 20, salt: 0.4, proteins: 2, saturatedFat: 6 } });
  const r = computeComparison([c, a, b], PREFS);
  assert.deepEqual(r.entries.map((e) => e.product.barcode), ["a", "b", "c"]);
});

test("different categories are flagged as not meaningfully comparable", () => {
  const yog = product({ barcode: "y", categories: ["dairy", "yogurts"] });
  const soda = product({ barcode: "s", categories: ["beverages", "sodas"], nutriScore: "e", novaGroup: 4 });
  const r = computeComparison([yog, soda], PREFS);
  assert.equal(r.validation.comparable, false);
  assert.ok(r.validation.issues.includes("differentCategories"));
});

test("a product with neither nutrition nor Nutri-Score is flagged insufficient", () => {
  const ok = product({ barcode: "ok" });
  const thin = product({ barcode: "thin", nutriScore: undefined, ingredientsText: undefined, additives: undefined, novaGroup: undefined, nutriments: {} });
  const r = computeComparison([ok, thin], PREFS);
  assert.equal(r.validation.comparable, false);
  assert.ok(r.validation.issues.includes("insufficientData"));
});

/* ───────────────────────── low-confidence winner ───────────────────────── */

test("a low-confidence health winner is FLAGGED (never crowned silently)", () => {
  // Incomplete: official A but partial facts → high raw score, but low/medium
  // confidence. Complete B → high confidence, slightly lower.
  const incomplete = product({ barcode: "inc", nutriScore: "a", ingredientsText: undefined, additives: undefined, novaGroup: undefined, nutriments: {} });
  const complete = product({ barcode: "comp", nutriScore: "b", novaGroup: 2 });
  const r = computeComparison([incomplete, complete], PREFS);
  // The well-documented product should win; if ever a low-confidence product
  // leads, the flag must be set so the UI can warn.
  if (r.healthWinner?.gree.confidence === "low") assert.equal(r.healthWinnerLowConfidence, true);
  assert.equal(typeof r.healthWinnerLowConfidence, "boolean");
});

/* ───────────────────────── health vs environment ───────────────────────── */

test("health winner and environment winner can DIFFER and are both surfaced", () => {
  // A: better health (A, nova1) but worse environment (Green-Score D).
  const a = product({
    barcode: "a", nutriScore: "a", novaGroup: 1,
    nutriments: { energyKcal: 60, sugars: 4, salt: 0.1, proteins: 6, saturatedFat: 1 },
    greenScore: "d",
    environment: env({ sourceScore: 34, sourceGrade: "d", normalizedScore: 34, normalizedGrade: "d", statusKnown: true, sourceMissing: [] })
  });
  // B: worse health (C) but better environment (Green-Score A).
  const b = product({
    barcode: "b", nutriScore: "c", novaGroup: 3,
    nutriments: { energyKcal: 110, sugars: 12, salt: 0.2, proteins: 4, saturatedFat: 3 },
    greenScore: "a",
    environment: env({ sourceScore: 90, sourceGrade: "a", normalizedScore: 90, normalizedGrade: "a", statusKnown: true, sourceMissing: [] })
  });
  const r = computeComparison([a, b], PREFS);
  assert.equal(r.healthWinner?.product.barcode, "a");
  assert.equal(r.environmentWinner?.product.barcode, "b");
  assert.equal(r.winnersDiffer, true);
  assert.ok(r.environmentReasons.includes("betterEnvGrade"));
});

test("when no product has valid environmental data, there is no env winner", () => {
  const r = computeComparison([product({ barcode: "a" }), product({ barcode: "b" })], PREFS);
  assert.equal(r.environmentWinner, undefined);
  assert.equal(r.winnersDiffer, false);
  assert.deepEqual(r.environmentReasons, []);
});

test("same product wins both health and environment ⇒ winnersDiffer false", () => {
  const a = product({
    barcode: "a", nutriScore: "a", novaGroup: 1,
    nutriments: { energyKcal: 60, sugars: 4, salt: 0.1, proteins: 6, saturatedFat: 1 },
    environment: env({ sourceScore: 90, sourceGrade: "a", normalizedScore: 90, normalizedGrade: "a", statusKnown: true, sourceMissing: [] })
  });
  const b = product({
    barcode: "b", nutriScore: "d", novaGroup: 4, additives: ["e150d"],
    nutriments: { energyKcal: 160, sugars: 20, salt: 0.4, proteins: 2, saturatedFat: 6 },
    environment: env({ sourceScore: 40, sourceGrade: "c", normalizedScore: 40, normalizedGrade: "c", statusKnown: true, sourceMissing: [] })
  });
  const r = computeComparison([b, a], PREFS);
  assert.equal(r.healthWinner?.product.barcode, "a");
  assert.equal(r.environmentWinner?.product.barcode, "a");
  assert.equal(r.winnersDiffer, false);
});

test("no combined health+environment score is produced anywhere", () => {
  const r = computeComparison([product({ barcode: "a" }), product({ barcode: "b", nutriScore: "d" })], PREFS);
  // The result exposes health and environment separately; assert there is no
  // stray blended numeric field masquerading as an overall score.
  assert.equal("combinedScore" in r, false);
  assert.equal("overallScore" in r, false);
  assert.equal("blendedScore" in r, false);
});

test("determinism: identical inputs, identical comparison", () => {
  const a = product({ barcode: "a", nutriScore: "a" });
  const b = product({ barcode: "b", nutriScore: "c" });
  assert.deepEqual(computeComparison([a, b], PREFS), computeComparison([a, b], PREFS));
});
