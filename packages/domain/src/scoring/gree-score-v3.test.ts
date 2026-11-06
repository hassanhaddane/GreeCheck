import assert from "node:assert/strict";
import { test } from "node:test";
import { defaultPreferences as prefs } from "../criteria/model";
import type { Product } from "../product/model";
import { computeGreeScore } from "./gree-score";
import { computeGreeScoreV2 } from "./gree-score-v2";
import { fixtures, water, soda, cereals, yogurt, oil, organic, sweetened, incomplete, conflicting } from "./gs3-fixtures";
import { officialGrade, pointsInRange } from "./nutrition-2023";

const gradeFixture = [
  [water, undefined, 100], [soda, 12, 31], [cereals, -2, 91], [yogurt, 1, 83], [oil, 0, 75], [organic, -2, 91], [sweetened, 16, 15]
] as const;
for (const [product, raw, score] of gradeFixture) {
  test(product.name + " matches the checked Nutri-Score 2023 points and GS-3 anchors", () => {
    const result = computeGreeScore(product, prefs);
    assert.equal(result.status, "scored");
    assert.equal(result.methodologyVersion, "GS-3.0.0");
    assert.equal(result.score, score);
    assert.equal(result.components.nutrition.points, raw);
    assert.equal(result.evidence.officialMethod.version, "2023");
    assert.ok(Number.isInteger(result.score));
    assert.ok(result.score >= 0 && result.score <= 100);
  });
}

test("explicit zero and unknown are distinguished on every required local input", () => {
  for (const product of [
    incomplete,
    { ...cereals, source: "ciqual" as const },
    { ...cereals, nutritionEnergyKj: undefined },
    { ...cereals, nutriments: { ...cereals.nutriments, fiber: undefined } },
    { ...soda, nonNutritiveSweeteners: undefined },
    { ...cereals, nutritionBasis: undefined },
    { ...oil, nutriments: { ...oil.nutriments, fat: undefined } }
  ]) {
    const result = computeGreeScore(product, prefs);
    assert.equal(result.status, "unscored");
    assert.equal(result.reason.code, "missing_nutrition_data");
    assert.ok(result.missingData.length > 0);
    assert.ok(result.possibleActions.includes("inspect_facts"));
    assert.ok(!("score" in result));
    assert.ok(!("components" in result));
  }
});

test("explicit 2023 points work without a local reconstruction, old points and grades alone do not", () => {
  const provider = { ...incomplete, nutriScore: "a" as const, nutriScoreVersion: "2023", nutriScorePoints: -2 };
  const result = computeGreeScore(provider, prefs);
  assert.equal(result.status, "scored");
  assert.equal(result.score, 91);
  assert.equal(result.confidence, "medium");
  assert.equal(result.components.nutrition.pointsSource, "provider_2023");
  assert.equal(result.components.nutrition.inputs, undefined);
  assert.equal(computeGreeScore({ ...provider, nutriScoreVersion: "2021" }, prefs).status, "unscored");
  assert.equal(computeGreeScore({ ...provider, nutriScorePoints: undefined }, prefs).status, "unscored");
  assert.equal(computeGreeScore({ ...provider, nutriScore2023: { points: -2, referenceOnly: true } }, prefs).status, "unscored");
});

test("unidentified categories, prepared-only foods, and flavored water never receive the water override", () => {
  const unknown = computeGreeScore({ ...cereals, categories: ["unknown"] }, prefs);
  assert.equal(unknown.status, "unscored");
  assert.equal(unknown.reason.code, "unknown_nutrition_category");
  const excluded = computeGreeScore({ ...soda, categories: ["beers"] }, prefs);
  assert.equal(computeGreeScore({ ...cereals, categories: ["soups", "dried products to be rehydrated"] }, prefs).status, "unscored");
  assert.equal(excluded.status, "unscored");
  assert.equal(excluded.reason.code, "excluded_unsupported_category");
  assert.equal(computeGreeScore({ ...water, ingredientsText: undefined }, prefs).status, "unscored");
  assert.equal(computeGreeScore({ ...water, nutriments: { salt: 0.1 } }, prefs).score, 100);
  assert.notEqual(computeGreeScore({ ...water, categories: ["waters", "flavored waters"] }, prefs).score, 100);
});

test("conflicting inputs and invalid numbers keep facts and produce no score", () => {
  const conflict: Product[] = [
    conflicting,
    { ...yogurt, dataState: "CONFLICTED" },
    { ...incomplete, nutriScore2023: { points: 4, grade: "a" } },
    { ...incomplete, nutriScore2023: { points: 56 } },
    { ...incomplete, nutriScore2023: { points: 3.5 } },
    { ...yogurt, nutritionBasis: "100ml" }
  ];
  for (const product of conflict) {
    const result = computeGreeScore(product, prefs);
    assert.equal(result.status, "unscored");
    assert.equal(result.reason.code, "conflicting_nutrition_data");
    assert.deepEqual(result.availableFacts.nutriments, product.nutriments);
  }
  for (const sugars of [-1, NaN, Infinity, 101]) {
    const result = computeGreeScore({ ...cereals, nutriments: { ...cereals.nutriments, sugars } }, prefs);
    assert.equal(result.status, "unscored");
    assert.equal(result.reason.code, "invalid_nutrition_data");
  }
});

test("extreme but valid profiles clip without converting unknown to zero", () => {
  const extreme = { ...cereals, nutritionEnergyKj: 3700, nutriments: { sugars: 0, salt: 5, saturatedFat: 70, fat: 90, fiber: 0 } };
  const result = computeGreeScore(extreme, prefs);
  assert.equal(result.status, "scored");
  assert.equal(result.score, 0);
  assert.equal(result.components.nutrition.points, 40);
  assert.ok(result.reasons.some(reason => reason.code === "gs3Salt" && reason.kind === "malus"));
});

test("official point boundaries, ratio inclusion, and red-meat protein rule", () => {
  for (const [profile, points, expected] of [
    ["general", 0, "a"], ["general", 1, "b"], ["fat", -6, "a"], ["fat", -5, "b"],
    ["beverage", 2, "b"], ["beverage", 6, "c"], ["beverage", 9, "d"], ["beverage", 10, "e"]
  ] as const) assert.equal(officialGrade(points, profile), expected);
  assert.equal(pointsInRange(-18, "beverage"), true);
  assert.equal(pointsInRange(-18, "general"), false);
  const edge = computeGreeScore({ ...cereals, nutritionEnergyKj: 335, nutriments: { sugars: 3.4, salt: 0.2, saturatedFat: 1, fiber: 3, proteins: 2.4 } }, prefs);
  assert.equal(edge.status, "scored");
  assert.equal(edge.components.nutrition.points, 0);
  const fat = computeGreeScore({ ...oil, nutriments: { ...oil.nutriments, saturatedFat: 10 } }, prefs);
  assert.equal(fat.status, "scored");
  assert.equal(fat.components.nutrition.points, -1);
  const meat = computeGreeScore({ ...yogurt, categories: ["meats", "red meats"], nutriments: { sugars: 0, saturatedFat: 0, salt: 0, fiber: 0, proteins: 25 } }, prefs);
  assert.equal(meat.status, "scored");
  assert.equal(meat.components.nutrition.points, -2);
});

test("organic, NOVA, environment and scientific references never change the nutrition score", () => {
  const base = computeGreeScore(cereals, prefs);
  const result = computeGreeScore({ ...organic, novaGroup: 4, greenScore: "e", additives: ["e250", "e999"] }, { ...prefs, preferBio: true, reduceAdditives: true });
  assert.equal(result.score, base.score);
  assert.equal(result.evidence.organicLabel, "eu organic");
  assert.equal(result.evidence.novaGroup, 4);
  assert.equal(result.evidence.additives?.[0].reference?.authority, "ANSES");
  assert.equal(result.evidence.additives?.[1].reference, undefined);
  assert.equal(computeGreeScore({ ...organic, labels: ["organic"] }, prefs).evidence.organicLabel, undefined);
  assert.equal(computeGreeScore(sweetened, prefs).evidence.additives?.[0].reference?.authority, "EFSA");
});

test("allergen alerts are first on scored and unscored products and leave nutrition unchanged", () => {
  const restrictions = { ...prefs, avoidAllergens: ["milk", "lait de vache"], preferHalal: true };
  const result = computeGreeScore(yogurt, restrictions);
  assert.equal(result.score, computeGreeScore(yogurt, prefs).score);
  assert.equal(result.warnings[0].level, "critical");
  assert.equal(result.alerts[0].code, "allergenPresent");
  assert.equal(result.warnings.find(warning => warning.code === "halalNotConfirmed")?.level, "info");
  const partial = computeGreeScore({ ...yogurt, nutritionEnergyKj: undefined }, restrictions);
  assert.equal(partial.status, "unscored");
  assert.equal(partial.alerts[0].code, "allergenPresent");
  assert.deepEqual(computeGreeScore(yogurt, { ...prefs, avoidAllergens: ["constructor"] }).alerts, []);
});

test("methodology fixtures are deterministic and do not mutate inputs", () => {
  for (const product of fixtures) {
    const copy = structuredClone(product);
    assert.deepEqual(computeGreeScore(product, prefs), computeGreeScore(copy, prefs));
    assert.deepEqual(product, copy);
  }
  const legacy = fixtures.map(product => computeGreeScoreV2(product, prefs));
  assert.ok(legacy.every(result => result.methodologyVersion === "GS-2.0.0"));
  assert.deepEqual(legacy.map(result => result.status === "scored" ? result.global : undefined), [90, 30, 90, 84, 30, 100, 15, 90, 84]);
});

test("sugar and salt preferences surface reported quantities without changing GS-3", () => {
  const product = { ...soda, nutriments: { ...soda.nutriments, sugars: 13, salt: 0.85 } };
  const plain = computeGreeScore(product, prefs);
  const personal = computeGreeScore(product, { ...prefs, reduceSugar: true, reduceSalt: true });
  assert.equal(plain.status, "scored");
  assert.equal(personal.score, plain.score);
  assert.deepEqual(personal.warnings.filter(w => w.code.endsWith("Preference")).map(w => w.values),
    [{ value: 13, basis: "100 ml" }, { value: 0.85, basis: "100 ml" }]);
  const unknown = computeGreeScore({ ...product, nutritionBasis: undefined }, { ...prefs, reduceSugar: true });
  assert.ok(!unknown.warnings.some(w => w.code === "sugarPreference"));
});
