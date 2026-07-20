/** Scan Battle — confidence-aware winner + comparability validation. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { computeBattle, validateBattle, effectiveScore } from "./engine";
import { computeGreeScore } from "../scoring/gree-score";
import { defaultPreferences } from "../criteria/model";
import type { LocalPreferences } from "../criteria/model";
import type { Product } from "../product/model";

const PREFS: LocalPreferences = { ...defaultPreferences };
function product(o: Partial<Product> = {}): Product {
  return {
    barcode: Math.random().toString().slice(2, 12), name: "P", source: "openfoodfacts",
    categories: ["dairy", "yogurts"], ingredientsText: "lait, ferments", additives: [], imageUrl: "x",
    nutriments: { sugars: 6, salt: 0.1, proteins: 5, saturatedFat: 2 }, nutriScore: "b", novaGroup: 2, ...o
  };
}
const entry = (p: Product) => ({ product: p, gree: computeGreeScore(p, PREFS) });

test("two-product comparison: better product wins and is comparable", () => {
  const good = product({ barcode: "g", name: "Yaourt nature", nutriScore: "a", novaGroup: 1, nutriments: { sugars: 4, proteins: 6, salt: 0.1 } });
  const poor = product({ barcode: "p", name: "Yaourt sucré", nutriScore: "d", novaGroup: 4, additives: ["e150d"], nutriments: { sugars: 18, proteins: 3, salt: 0.2 } });
  const r = computeBattle([poor, good], PREFS);
  assert.equal(r.winner?.product.barcode, "g");
  assert.equal(r.ranking.length, 2);
  assert.equal(r.validation.comparable, true);
  assert.ok(r.reasons.includes("higherScore"));
});

test("three-product comparison ranks all and picks a winner", () => {
  const a = product({ barcode: "a", nutriScore: "a", novaGroup: 1, nutriments: { sugars: 3, proteins: 8 } });
  const b = product({ barcode: "b", nutriScore: "c", novaGroup: 3, nutriments: { sugars: 10, proteins: 5 } });
  const c = product({ barcode: "c", nutriScore: "e", novaGroup: 4, additives: ["e150d", "e338"], nutriments: { sugars: 20, proteins: 2 } });
  const r = computeBattle([c, a, b], PREFS);
  assert.deepEqual(r.ranking.map((e) => e.product.barcode), ["a", "b", "c"]);
});

test("CONFIDENCE affects the result: a low-confidence higher-raw product must NOT win", () => {
  // Incomplete: only a great Nutri-Score (no nutrition, no ingredients) → LOW confidence, high raw score.
  const incomplete = product({ barcode: "inc", name: "Yaourt A", nutriScore: "a", ingredientsText: undefined, additives: undefined, novaGroup: undefined, nutriments: {} });
  // Complete: full data, slightly lower raw → HIGH confidence.
  const complete = product({ barcode: "comp", name: "Yaourt B", nutriScore: "b", novaGroup: 2, nutriments: { sugars: 6, salt: 0.1, proteins: 6, saturatedFat: 2 } });
  const gInc = computeGreeScore(incomplete, PREFS), gComp = computeGreeScore(complete, PREFS);
  assert.ok(gInc.global >= gComp.global, "the incomplete product must have the higher RAW score to isolate the rule");
  assert.notEqual(gInc.confidence, "high"); // discounted (medium) — enough to lose to a complete product
  const r = computeBattle([incomplete, complete], PREFS);
  assert.equal(r.winner?.product.barcode, "comp", "the well-documented product must win");
  assert.ok(effectiveScore(entry(incomplete)) < effectiveScore(entry(complete)));
});

test("incomparable: products from different categories are flagged", () => {
  const yog = product({ barcode: "y", categories: ["dairy", "yogurts"] });
  const soda = product({ barcode: "s", categories: ["beverages", "sodas"], nutriScore: "e", novaGroup: 4 });
  const r = computeBattle([yog, soda], PREFS);
  assert.equal(r.validation.comparable, false);
  assert.ok(r.validation.issues.includes("differentCategories"));
});

test("incomparable: a product with neither nutrition nor Nutri-Score is flagged", () => {
  const ok = product({ barcode: "ok" });
  const empty = product({ barcode: "empty", nutriScore: undefined, ingredientsText: undefined, additives: undefined, nutriments: {} });
  const r = computeBattle([ok, empty], PREFS);
  assert.equal(r.validation.comparable, false);
  assert.ok(r.validation.issues.includes("insufficientData"));
});

test("same category + sufficient data → comparable with a shared category", () => {
  const a = product({ barcode: "a", categories: ["dairy", "yogurts"] });
  const b = product({ barcode: "b", categories: ["dairy", "yogurts"], nutriScore: "c" });
  const r = computeBattle([a, b], PREFS);
  assert.equal(r.validation.comparable, true);
  assert.equal(r.validation.sharedCategory, "yogurts");
});

test("validateBattle: a single product is not a comparison", () => {
  const v = validateBattle([entry(product())]);
  assert.equal(v.comparable, false);
  assert.ok(v.issues.includes("singleProduct"));
});

test("results are deterministic", () => {
  const a = product({ barcode: "a", nutriScore: "a" });
  const b = product({ barcode: "b", nutriScore: "c" });
  assert.deepEqual(computeBattle([a, b], PREFS), computeBattle([a, b], PREFS));
});
