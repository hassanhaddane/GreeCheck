/**
 * GreeScore unit tests — runnable with the Node built-in test runner:
 *
 *     npm run test          (uses tsx to load TypeScript)
 *     node --import tsx --test src/lib/scoring/gree-score.test.ts
 *
 * The engine is pure, so these tests are fast and deterministic.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { computeGreeScore, scoreAdditives, computeConfidence } from "./gree-score";
import type { Product } from "@/types/product";
import type { LocalPreferences } from "@/types/user-preferences";

/* ─────────────────────────────── fixtures ──────────────────────────────── */

const NO_PREFS: LocalPreferences = {
  language: "fr",
  goals: [],
  avoidAllergens: [],
  preferBio: false,
  preferHalal: false,
  preferVegan: false,
  preferVegetarian: false,
  reduceSugar: false,
  reduceSalt: false,
  reduceAdditives: false,
  reduceUltraProcessed: false,
  increaseProtein: false,
  increaseFiber: false
};

function product(overrides: Partial<Product> = {}): Product {
  return {
    barcode: "0000000000000",
    name: "Test",
    nutriments: {},
    source: "openfoodfacts",
    ...overrides
  };
}

/* excellent whole food: organic lentils */
const lentils = product({
  name: "Lentilles bio",
  nutriScore: "a",
  novaGroup: 1,
  isBio: true,
  isVegan: true,
  isVegetarian: true,
  additives: [],
  ingredientsText: "lentilles vertes",
  greenScore: "a",
  nutriments: { energyKcal: 116, sugars: 1.8, salt: 0.01, saturatedFat: 0.1, fiber: 8, proteins: 9 }
});

/* poor product: cola */
const cola = product({
  name: "Soda cola",
  nutriScore: "e",
  novaGroup: 4,
  additives: ["e150d", "e338", "e951"],
  ingredientsText: "eau, sucre, colorant e150d",
  nutriments: { energyKcal: 42, sugars: 10.6, salt: 0.0, saturatedFat: 0, fiber: 0, proteins: 0 }
});

/* ──────────────────────────────── tests ────────────────────────────────── */

test("excellent product scores grade A and high global", () => {
  const r = computeGreeScore(lentils, NO_PREFS);
  assert.equal(r.grade, "A");
  assert.ok(r.global >= 80, `expected >=80, got ${r.global}`);
  assert.equal(r.confidenceLevel, "high");
  assert.ok(r.reasons.some((x) => x.label.includes("Nutri-Score A")));
});

test("ultra-processed product with risky additives scores low", () => {
  const r = computeGreeScore(cola, NO_PREFS);
  assert.ok(r.global <= 40, `expected <=40, got ${r.global}`);
  assert.ok(["D", "E"].includes(r.grade));
  assert.ok(r.reasons.some((x) => x.label.includes("Ultra-transformé")));
  assert.ok(r.additivesScore < 100, "additives should be penalized");
});

test("scores are deterministic (same input → identical output)", () => {
  const a = computeGreeScore(cola, NO_PREFS);
  const b = computeGreeScore(cola, NO_PREFS);
  assert.deepEqual(a, b);
});

test("personalization: reduce_sugar lowers goalScore on a sugary product", () => {
  const sugary = product({
    nutriScore: "d",
    novaGroup: 4,
    nutriments: { sugars: 40, salt: 0.1, proteins: 1 }
  });
  const neutral = computeGreeScore(sugary, NO_PREFS).goalScore;
  const withGoal = computeGreeScore(sugary, { ...NO_PREFS, goals: ["reduce_sugar"] });
  assert.ok(withGoal.goalScore < 30, `goalScore should be low, got ${withGoal.goalScore}`);
  assert.ok(withGoal.goalScore !== neutral);
  assert.ok(withGoal.reasons.some((x) => x.label.includes("réduire le sucre")));
});

test("personalization: build_muscle rewards high-protein product", () => {
  const proteinBar = product({
    nutriScore: "b",
    novaGroup: 3,
    nutriments: { sugars: 6, salt: 0.4, proteins: 22, fiber: 5 }
  });
  const r = computeGreeScore(proteinBar, { ...NO_PREFS, goals: ["build_muscle"] });
  assert.ok(r.goalScore >= 80, `expected high goalScore, got ${r.goalScore}`);
  assert.ok(r.reasons.some((x) => x.label.toLowerCase().includes("protéines")));
});

test("halal preference flags haram ingredients with a critical warning", () => {
  const withPork = product({
    name: "Pâté",
    nutriScore: "d",
    novaGroup: 4,
    ingredientsText: "viande de porc, sel, épices",
    nutriments: { proteins: 12, salt: 1.8 }
  });
  const r = computeGreeScore(withPork, { ...NO_PREFS, preferHalal: true, goals: ["halal"] });
  assert.ok(r.warnings.some((w) => w.level === "critical"));
  assert.equal(r.goalScore, 0);
});

test("ecology bucket is optional: missing Green-Score → undefined, weights renormalize", () => {
  const noEco = product({ nutriScore: "b", novaGroup: 2, nutriments: { sugars: 4, proteins: 5 } });
  const r = computeGreeScore(noEco, NO_PREFS);
  assert.equal(r.ecologyScore, undefined);
  assert.ok(r.global >= 0 && r.global <= 100);
});

test("additives: controversial/avoid additives reduce the additives sub-score", () => {
  const clean = scoreAdditives(product({ additives: [] }), NO_PREFS, [], []);
  const dirty = scoreAdditives(product({ additives: ["e171", "e102"] }), NO_PREFS, [], []);
  assert.equal(clean, 100);
  assert.ok(dirty <= 70, `expected penalty, got ${dirty}`);
});

test("palm oil produces an info warning and lowers additives score", () => {
  const r = computeGreeScore(
    product({ nutriScore: "c", novaGroup: 4, ingredientsText: "farine, huile de palme, sucre" }),
    NO_PREFS
  );
  assert.ok(r.warnings.some((w) => w.label.toLowerCase().includes("palme")));
});

test("avoided allergen yields a critical warning", () => {
  const r = computeGreeScore(
    product({ allergens: ["gluten"], nutriScore: "b" }),
    { ...NO_PREFS, avoidAllergens: ["gluten"] }
  );
  assert.ok(r.warnings.some((w) => w.level === "critical" && w.label.toLowerCase().includes("gluten")));
});

test("confidence is low when neither Nutri-Score nor nutriments exist", () => {
  assert.equal(computeConfidence(product({})), "low");
  assert.equal(
    computeConfidence(product({ nutriScore: "a", ingredientsText: "farine de blé", nutriments: { sugars: 1 } })),
    "high"
  );
});
