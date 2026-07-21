/** GreeCart analysis extras — env distribution, contributors, allergen alerts. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { analyzeCartExtras } from "./analysis";
import { computeCartScore, type CartInput } from "./engine";
import { defaultPreferences } from "../criteria/model";
import type { LocalPreferences } from "../criteria/model";
import type { Product, ProductEnvironment } from "../product/model";

const PREFS: LocalPreferences = { ...defaultPreferences };
const env = (e: Omit<ProductEnvironment, "provider">): ProductEnvironment => ({ provider: "openfoodfacts", ...e });

function product(o: Partial<Product> = {}): Product {
  return {
    barcode: Math.random().toString().slice(2, 12), name: "P", source: "openfoodfacts",
    categories: ["snacks"], ingredientsText: "x", additives: [],
    nutriments: { energyKcal: 200, sugars: 5, salt: 0.2, saturatedFat: 2, proteins: 4 },
    nutriScore: "b", novaGroup: 2, ...o
  };
}
const extras = (products: Product[], prefs = PREFS) => {
  const inputs: CartInput[] = products.map((p) => ({ product: p }));
  return analyzeCartExtras(computeCartScore(inputs, prefs).analyses, prefs);
};

test("environmental distribution counts valid grades and never hides unknowns", () => {
  const a = product({ barcode: "a", environment: env({ sourceGrade: "a", normalizedGrade: "a" }) });
  const b = product({ barcode: "b", environment: env({ sourceGrade: "d", normalizedGrade: "d" }) });
  const c = product({ barcode: "c" }); // no environmental data
  const r = extras([a, b, c]);
  assert.equal(r.environmentDistribution.a, 1);
  assert.equal(r.environmentDistribution.d, 1);
  assert.equal(r.environmentDistribution.unknown, 1);
  assert.equal(r.environmentKnown, 2);
});

test("main sugar contributors are ranked high → low; unknown sugar listed, never zeroed", () => {
  const hi = product({ barcode: "hi", nutriments: { sugars: 40, energyKcal: 400, salt: 0.1, saturatedFat: 2 } });
  const lo = product({ barcode: "lo", nutriments: { sugars: 3, energyKcal: 100, salt: 0.1, saturatedFat: 1 } });
  const unk = product({ barcode: "unk", nutriments: { energyKcal: 100, salt: 0.1, saturatedFat: 1 } });
  const r = extras([lo, hi, unk]);
  assert.equal(r.sugarContributors[0].product.barcode, "hi");
  assert.equal(r.sugarContributors[0].sugars, 40);
  const unkRow = r.sugarContributors.find((c) => c.product.barcode === "unk");
  assert.ok(unkRow); // present
  assert.equal(unkRow!.sugars, undefined); // not invented as 0
});

test("main additive contributors ranked by risky-additive count", () => {
  const risky = product({ barcode: "risky", additives: ["e250", "e951", "e330"] }); // 2 risky (nitrite high, aspartame moderate)
  const mild = product({ barcode: "mild", additives: ["e330"] });                   // 0 risky
  const none = product({ barcode: "none", additives: [] });
  const r = extras([mild, risky, none]);
  assert.equal(r.additiveContributors[0].product.barcode, "risky");
  assert.equal(r.additiveContributors[0].riskyCount, 2);
  assert.equal(r.additiveContributors[0].totalCount, 3);
  assert.ok(!r.additiveContributors.some((c) => c.product.barcode === "none")); // no additives → not listed
});

test("critical allergen alerts surface only against the user's avoided list", () => {
  const withGluten = product({ barcode: "g", ingredientsText: "farine de blé", allergens: ["en:gluten"] });
  const clean = product({ barcode: "c", ingredientsText: "eau, sel" });
  const noPref = extras([withGluten, clean]);
  assert.deepEqual(noPref.allergenAlerts, []); // no avoided allergens set

  const prefs: LocalPreferences = { ...PREFS, avoidAllergens: ["gluten"] };
  const r = extras([withGluten, clean], prefs);
  assert.equal(r.allergenAlerts.length, 1);
  assert.equal(r.allergenAlerts[0].product.barcode, "g");
  assert.ok(r.allergenAlerts[0].allergens.includes("gluten"));
});

test("ultra-processed count reflects NOVA 4 products", () => {
  const r = extras([product({ barcode: "a", novaGroup: 4 }), product({ barcode: "b", novaGroup: 2 }), product({ barcode: "c", novaGroup: 4 })]);
  assert.equal(r.ultraProcessedCount, 2);
});

test("determinism", () => {
  const ps = [product({ barcode: "a" }), product({ barcode: "b", nutriments: { sugars: 20, energyKcal: 300, salt: 0.1, saturatedFat: 2 } })];
  assert.deepEqual(extras(ps), extras(ps));
});
