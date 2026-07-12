/**
 * GreeScore V2 engine tests — every safeguard from the documented formula.
 * Pure engine: fast, deterministic, no React/no I/O.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { computeGreeScore, explainScore, categoryProfileOf } from "./gree-score";
import { defaultPreferences } from "@/domains/criteria/model";
import type { LocalPreferences } from "@/domains/criteria/model";
import type { Product } from "@/domains/product/model";

const NO_PREFS: LocalPreferences = { ...defaultPreferences };

function product(overrides: Partial<Product> = {}): Product {
  return { barcode: "0", name: "Test", nutriments: {}, source: "openfoodfacts", ...overrides };
}

/* ───────────── required scenario: excellent simple food ───────────── */
const OATS = product({
  name: "Flocons d'avoine",
  ingredientsText: "flocons d'avoine complète",
  additives: [],
  nutriments: { energyKcal: 370, sugars: 1, salt: 0.01, saturatedFat: 1.2, fiber: 10, proteins: 13 },
  nutriScore: "a",
  novaGroup: 1,
  isBio: true,
  labels: ["organic"]
});

/* ───────────── required scenario: poor ultra-processed food ───────────── */
const SODA_CANDY = product({
  name: "Bonbons cola",
  ingredientsText: "sirop de glucose, sucre, gélifiant, colorant e102, e129, arômes",
  additives: ["e102", "e129", "e330"],
  nutriments: { energyKcal: 350, sugars: 78, salt: 0.2, saturatedFat: 0.1, fiber: 0, proteins: 3 },
  nutriScore: "e",
  novaGroup: 4
});

test("excellent simple food scores A with excellent_choice verdict and positive reasons", () => {
  const g = computeGreeScore(OATS, NO_PREFS);
  assert.ok(g.global >= 80, `expected ≥80, got ${g.global}`);
  assert.equal(g.grade, "A");
  assert.equal(g.verdict, "excellent_choice");
  assert.equal(g.confidence, "high");
  assert.ok(g.topPositives.length >= 2);
  assert.ok(g.topPositives.some((r) => r.code === "bio"));
  assert.equal(g.topNegatives.length, 0);
});

test("poor ultra-processed food scores low with ultra_processed verdict and matching negatives", () => {
  const g = computeGreeScore(SODA_CANDY, NO_PREFS);
  assert.ok(g.global < 45, `expected <45, got ${g.global}`);
  assert.equal(g.verdict, "ultra_processed");
  assert.ok(g.topNegatives.some((r) => r.code === "nova4"));
  assert.ok(g.topNegatives.some((r) => r.code === "tooSugar"));
  // reasons match the numeric result: a low score MUST carry negatives
  assert.ok(g.topNegatives.length > 0);
});

/* ───────────── safeguard: organic must not hide UPF + poor nutrition ───────────── */
test("organic-but-unhealthy: bio bonus is capped — global stays ≤ 49 (grade ≤ C)", () => {
  const organicJunk = product({
    ...SODA_CANDY,
    isBio: true,
    labels: ["organic"],
    greenScore: "a" // even with a great eco grade…
  });
  const g = computeGreeScore(organicJunk, NO_PREFS);
  assert.ok(g.global <= 49, `cap violated: ${g.global}`);
  assert.ok(g.grade === "C" || g.grade === "D" || g.grade === "E");
  assert.notEqual(g.verdict, "excellent_choice");
  assert.notEqual(g.verdict, "good_choice");
  assert.ok(g.reasons.some((r) => r.code === "bioCapped"));
  // the bio bonus is still visible in its own bucket (transparency)
  assert.ok(g.subScores.naturality >= 70);
});

/* ───────────── missing data reduces CONFIDENCE, not quality ───────────── */
test("missing nutriments: insufficient_data verdict, low confidence, nutrition not punished", () => {
  const g = computeGreeScore(product({ name: "Mystère", ingredientsText: "farine, eau, sel", novaGroup: 2 }), NO_PREFS);
  assert.equal(g.confidence, "low");
  assert.equal(g.verdict, "insufficient_data");
  assert.ok(g.confidenceReasons.includes("missingNutrition"));
  assert.ok(g.warnings.some((w) => w.code === "partialData"));
});

test("missing ingredients: additives bucket is ABSENT (unknown ≠ additive-free)", () => {
  const g = computeGreeScore(product({ name: "X", nutriments: { sugars: 3, salt: 0.1 }, nutriScore: "b", novaGroup: 2 }), NO_PREFS);
  assert.equal(g.subScores.additives, undefined);
  assert.ok(!g.reasons.some((r) => r.code === "noAdditive")); // no unearned bonus
  assert.equal(g.confidence, "medium");
});

test("unknown NOVA: processing bucket absent, no neutral guess in the score", () => {
  const withNova = computeGreeScore(product({ name: "A", nutriScore: "a", ingredientsText: "pommes", additives: [], nutriments: { sugars: 10 } , novaGroup: 1}), NO_PREFS);
  const withoutNova = computeGreeScore(product({ name: "A", nutriScore: "a", ingredientsText: "pommes", additives: [], nutriments: { sugars: 10 } }), NO_PREFS);
  assert.equal(withoutNova.subScores.processing, undefined);
  assert.ok(withoutNova.confidenceReasons.includes("missingNova"));
  assert.ok(withNova.global >= withoutNova.global); // NOVA1 can only help; absence never punishes below…
});

/* ───────────── halal: compatibility only, NEVER health ───────────── */
test("halal unknown: identical health score with or without the halal criterion; info alert only", () => {
  const base = product({ name: "Biscuits", ingredientsText: "farine, sucre, beurre", additives: [], nutriments: { sugars: 20, salt: 0.4 }, nutriScore: "c", novaGroup: 3 });
  const without = computeGreeScore(base, NO_PREFS);
  const withHalal = computeGreeScore(base, { ...NO_PREFS, preferHalal: true });
  assert.equal(withHalal.global, without.global);                 // zero score impact
  assert.deepEqual(withHalal.subScores, without.subScores);
  assert.ok(withHalal.warnings.some((w) => w.code === "halalNotConfirmed" && w.level === "info"));
  assert.equal(withHalal.alerts.length, 0);                       // information, not an alert
});

test("halal incompatible: critical compatibility ALERT, still no health-score change", () => {
  const base = product({ name: "Gel", ingredientsText: "gélatine de porc, sucre", nutriments: { sugars: 60 }, nutriScore: "d", novaGroup: 3 });
  const without = computeGreeScore(base, NO_PREFS);
  const withHalal = computeGreeScore(base, { ...NO_PREFS, preferHalal: true });
  assert.equal(withHalal.global, without.global);
  assert.ok(withHalal.alerts.some((w) => w.code === "haramIngredient" && w.level === "critical"));
});

test("halal confirmed does NOT improve the health score", () => {
  const plain = product({ name: "P", ingredientsText: "poulet, sel", nutriments: { proteins: 20, salt: 0.5 }, nutriScore: "a", novaGroup: 1 });
  const certified = { ...plain, labels: ["halal"], isHalal: true, halalStatus: "confirmed" as const };
  const a = computeGreeScore(plain, { ...NO_PREFS, preferHalal: true });
  const b = computeGreeScore(certified, { ...NO_PREFS, preferHalal: true });
  assert.equal(a.global, b.global);
});

/* ───────────── criteria fit ───────────── */
test("high-protein criterion: goalFit bucket appears and rewards a protein-rich product", () => {
  const prefs = { ...NO_PREFS, increaseProtein: true };
  const rich = computeGreeScore(product({ name: "Skyr", ingredientsText: "lait écrémé, ferments", additives: [], nutriments: { proteins: 10, sugars: 4 }, nutriScore: "a", novaGroup: 1 }), prefs);
  const poor = computeGreeScore(product({ name: "Chips", ingredientsText: "pommes de terre, huile", additives: [], nutriments: { proteins: 2, sugars: 1 }, nutriScore: "a", novaGroup: 1 }), prefs);
  assert.ok(rich.subScores.goalFit !== undefined && poor.subScores.goalFit !== undefined);
  assert.ok(rich.subScores.goalFit! > poor.subScores.goalFit!);
});

test("low-sugar criterion: sugary product gets poor_fit_for_goal + criterion mismatch reason", () => {
  const prefs = { ...NO_PREFS, reduceSugar: true };
  const g = computeGreeScore(product({ name: "Confiture", ingredientsText: "sucre, fraises", additives: [], nutriments: { sugars: 55 }, nutriScore: "c", novaGroup: 3 }), prefs);
  assert.ok(g.subScores.goalFit !== undefined && g.subScores.goalFit! <= 35);
  assert.equal(g.verdict, "poor_fit_for_goal");
  assert.ok(g.reasons.some((r) => r.code === "criterionMismatch" && r.values?.criterion === "reduceSugar"));
  const sentences = explainScore(g);
  assert.equal(sentences[0].code, "notIdealForCriterion");
});

/* ───────────── no double penalty ───────────── */
test("with Nutri-Score present, nutrient facts EXPLAIN but never re-deduct (no double penalty)", () => {
  const sugary = product({ name: "S1", ingredientsText: "sucre", additives: [], nutriments: { sugars: 70 }, nutriScore: "e", novaGroup: 3 });
  // 12g is below the FSA high-sugar band (22.5g), so it must NOT raise the
  // "tooSugar" fact — while the Nutri-Score-driven nutrition sub-score is
  // unchanged (proving facts explain, they don't re-deduct).
  const lessSugary = { ...sugary, nutriments: { sugars: 12 } };
  const a = computeGreeScore(sugary, NO_PREFS);
  const b = computeGreeScore(lessSugary, NO_PREFS);
  // same Nutri-Score ⇒ identical nutrition sub-score (facts differ only in reasons)
  assert.equal(a.subScores.nutrition, b.subScores.nutrition);
  assert.ok(a.reasons.some((r) => r.code === "tooSugar"));
  assert.ok(!b.reasons.some((r) => r.code === "tooSugar"));
});

/* ───────────── category context ───────────── */
test("category-aware sugar: the same 8g sugar is flagged in a beverage, not in a dessert", () => {
  const drink = product({ name: "Soda", categories: ["beverages", "sodas"], ingredientsText: "eau, sucre", additives: [], nutriments: { sugars: 8 }, nutriScore: "c", novaGroup: 3 });
  const dessert = product({ name: "Yaourt", categories: ["desserts"], ingredientsText: "lait, sucre", additives: [], nutriments: { sugars: 8 }, nutriScore: "c", novaGroup: 3 });
  assert.equal(categoryProfileOf(drink), "beverage");
  assert.equal(categoryProfileOf(dessert), "default");
  const gd = computeGreeScore(drink, NO_PREFS);
  const gy = computeGreeScore(dessert, NO_PREFS);
  assert.ok(gd.warnings.some((w) => w.code === "highSugar"));
  assert.ok(!gy.warnings.some((w) => w.code === "highSugar"));
});

/* ───────────── boundaries, determinism, coherence ───────────── */
test("grade bands: A≥80, B≥65, C≥45, D≥25, E<25 (boundary check via crafted inputs)", () => {
  const a = computeGreeScore(OATS, NO_PREFS);
  assert.equal(a.grade, "A");
  const e = computeGreeScore(product({ name: "E", ingredientsText: "sucre, e102, e110, e124, e250, e320", additives: ["e102", "e110", "e124", "e250", "e320"], nutriments: { sugars: 80, salt: 3 }, nutriScore: "e", novaGroup: 4, palmOilStatus: "present" }), NO_PREFS);
  assert.ok(e.global < 25, `expected E-range, got ${e.global}`);
  assert.equal(e.grade, "E");
  // mid product lands in B or C, never A/E
  const mid = computeGreeScore(product({ name: "M", ingredientsText: "blé, sucre", additives: [], nutriments: { sugars: 12 }, nutriScore: "c", novaGroup: 2 }), NO_PREFS);
  assert.ok(["B", "C"].includes(mid.grade), `got ${mid.grade} (${mid.global})`);
});

test("results are stable (deterministic across repeated runs)", () => {
  const p = SODA_CANDY;
  const runs = Array.from({ length: 5 }, () => computeGreeScore(p, { ...NO_PREFS, reduceSugar: true }));
  for (const r of runs.slice(1)) assert.deepEqual(r, runs[0]);
});

test("Trust Halo: low-confidence result is NEVER presented as authoritative", () => {
  const g = computeGreeScore(product({ name: "Inconnu" }), NO_PREFS);
  assert.equal(g.confidence, "low");
  assert.equal(g.verdict, "insufficient_data");
  assert.ok(g.confidenceReasons.length >= 3); // explains exactly what is missing
  const s = explainScore(g);
  assert.equal(s[0].code, "insufficientData");
});

test("explanations match the numbers: organic + minimally processed pattern", () => {
  const g = computeGreeScore(OATS, NO_PREFS);
  const s = explainScore(g);
  assert.equal(s[0].code, "organicMinimal");
});

test("good profile with incomplete data → 'goodButIncomplete' explanation", () => {
  const g = computeGreeScore(product({ name: "Bon", nutriments: { sugars: 2, proteins: 8, salt: 0.1 }, nutriScore: "a", novaGroup: 1 }), NO_PREFS);
  // ingredients missing → medium confidence
  assert.equal(g.confidence, "medium");
  const s = explainScore(g);
  assert.equal(s[0].code, "goodButIncomplete");
});
