/**
 * GreeSwap engine tests — eligibility, candidate validation and ranking.
 * Pure engine: no fetch, no React. Deterministic via the real GreeScore.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  isSwapEligible, validateCandidate, rankAlternatives, computeImprovements,
  introducesCriticalWeakness, hasSufficientData, MIN_SCORE_GAIN
} from "./engine";
import { computeGreeScore } from "@/domains/scoring/gree-score";
import { defaultPreferences } from "@/domains/criteria/model";
import type { LocalPreferences } from "@/domains/criteria/model";
import type { Product } from "@/domains/product/model";

const PREFS: LocalPreferences = { ...defaultPreferences };
const score = (p: Product, prefs: LocalPreferences = PREFS) => computeGreeScore(p, prefs);

/** Candidate defaults: image + nutrition + ingredients so data is "sufficient". */
function product(overrides: Partial<Product> = {}): Product {
  return {
    barcode: Math.random().toString().slice(2, 12),
    name: "Test",
    imageUrl: "https://img/x.jpg",
    categories: ["beverages", "sodas"],
    ingredientsText: "eau, sucre",
    additives: [],
    nutriments: { sugars: 5, salt: 0.1, proteins: 1 },
    source: "openfoodfacts",
    ...overrides
  };
}

/* ── the poor current product every swap starts from ── */
const SODA = product({
  barcode: "1",
  name: "Soda cola",
  ingredientsText: "eau gazéifiée, sirop de glucose-fructose, colorant e150d, acidifiant e338",
  additives: ["e150d", "e338", "e330"],
  nutriments: { sugars: 60, salt: 0.05, saturatedFat: 0, proteins: 0, fiber: 0 },
  nutriScore: "e",
  novaGroup: 4
});

/* ─────────────────────────── eligibility ─────────────────────────── */
test("eligible when GreeScore < 50", () => {
  const e = isSwapEligible(SODA, score(SODA), PREFS);
  assert.equal(e.eligible, true);
  assert.equal(e.trigger, "lowScore");
});

test("eligible when grade is D or E even if borderline", () => {
  const g = score(SODA);
  assert.ok(["D", "E"].includes(g.grade));
  assert.equal(isSwapEligible(SODA, g, PREFS).eligible, true);
});

test("NOT eligible for a good product with no conflict", () => {
  const good = product({ name: "Flocons avoine", categories: ["cereals", "oat-flakes"], nutriScore: "a", novaGroup: 1, isBio: true,
    nutriments: { sugars: 1, salt: 0.01, fiber: 10, proteins: 13 } });
  const e = isSwapEligible(good, score(good), PREFS);
  assert.equal(e.eligible, false);
  assert.equal(e.trigger, null);
});

test("eligible via critical criterion conflict even when the score is fine", () => {
  const good = product({ name: "Barre", categories: ["bars"], nutriScore: "a", novaGroup: 1,
    allergens: ["milk"], nutriments: { sugars: 3, proteins: 12, fiber: 6 } });
  const prefs = { ...PREFS, avoidAllergens: ["milk"] };
  const e = isSwapEligible(good, score(good, prefs), prefs);
  assert.equal(e.eligible, true);
  assert.equal(e.trigger, "incompatible");
});

/* ─────────────────────────── validation ─────────────────────────── */
const cur = SODA;
const curGree = score(cur);

test("accepts a genuinely better alternative and records measurable improvements", () => {
  const alt = product({ name: "Soda light", nutriScore: "b", novaGroup: 2, additives: [],
    nutriments: { sugars: 20, salt: 0.05, proteins: 0, fiber: 0 } });
  const v = validateCandidate(cur, curGree, alt, score(alt), PREFS);
  assert.ok(v, "expected the alternative to be accepted");
  assert.ok(v!.scoreGain >= MIN_SCORE_GAIN);
  assert.ok(v!.improvements.some((i) => i.code === "lessSugar" && i.weakness));
  assert.ok(v!.improvements.some((i) => i.code === "lowerNova"));
  assert.ok(v!.strongest.weakness, "headline must address a real weakness");
});

test("rejects a lower-scoring candidate", () => {
  const worse = product({ name: "Soda pire", nutriScore: "e", novaGroup: 4, additives: ["e150d", "e338"],
    nutriments: { sugars: 75, salt: 0.1 } });
  assert.equal(validateCandidate(cur, curGree, worse, score(worse), PREFS), null);
});

test("rejects a candidate with insufficient data (no image)", () => {
  const noImage = product({ name: "Sans image", imageUrl: undefined, nutriScore: "a", novaGroup: 1,
    nutriments: { sugars: 5, proteins: 1 } });
  assert.equal(hasSufficientData(noImage), false);
  assert.equal(validateCandidate(cur, curGree, noImage, score(noImage), PREFS), null);
});

test("rejects a low-confidence candidate (no nutrition at all)", () => {
  const thin = product({ name: "Mystère", ingredientsText: undefined, additives: undefined, nutriments: {}, nutriScore: undefined, novaGroup: undefined });
  assert.equal(hasSufficientData(thin), false);
  assert.equal(validateCandidate(cur, curGree, thin, score(thin), PREFS), null);
});

test("rejects a candidate that only looks better because data is MISSING", () => {
  // High Nutri-Score but no sugar/NOVA/additive data → higher aggregate, yet no
  // measurable weakness of the soda is actually improved.
  const missing = product({ name: "Boisson incomplète", nutriScore: "a",
    ingredientsText: undefined, additives: undefined, novaGroup: undefined,
    nutriments: { proteins: 4 } });
  const g = score(missing);
  assert.ok(g.global >= curGree.global + MIN_SCORE_GAIN, "candidate must out-score current to isolate the rule");
  assert.equal(validateCandidate(cur, curGree, missing, g, PREFS), null);
});

test("rejects a candidate that introduces a critical NEW weakness", () => {
  // current low-sugar but ultra-processed; candidate fixes NOVA but is now high-sugar.
  const lowSugarUpf = product({ name: "Chips", categories: ["snacks", "chips"], nutriScore: "c", novaGroup: 4,
    additives: ["e330"], nutriments: { sugars: 1, salt: 1.0, saturatedFat: 3 } });
  const sugary = product({ name: "Barre sucrée", categories: ["snacks", "chips"], nutriScore: "a", novaGroup: 2,
    additives: [], nutriments: { sugars: 45, salt: 0.2 } });
  assert.equal(introducesCriticalWeakness(lowSugarUpf, sugary), true);
  assert.equal(validateCandidate(lowSugarUpf, score(lowSugarUpf), sugary, score(sugary), PREFS), null);
});

test("rejects a candidate conflicting with a critical local criterion", () => {
  const alt = product({ name: "Soda aux arachides", nutriScore: "b", novaGroup: 2, additives: [],
    allergens: ["peanut"], nutriments: { sugars: 18 } });
  const prefs = { ...PREFS, avoidAllergens: ["peanut"] };
  assert.equal(validateCandidate(cur, score(cur, prefs), alt, score(alt, prefs), prefs), null);
});

/* ─────────────────────────── improvements ─────────────────────────── */
test("computeImprovements yields exact measurable deltas", () => {
  const a = product({ name: "A", nutriScore: "e", novaGroup: 4, additives: ["e150d"], nutriments: { sugars: 78 } });
  const b = product({ name: "B", nutriScore: "b", novaGroup: 3, additives: [], isBio: true, nutriments: { sugars: 53 } });
  const imps = computeImprovements(a, b, score(a), score(b), PREFS);
  const sugar = imps.find((i) => i.code === "lessSugar");
  assert.equal(sugar?.percent, 32); // (1 - 53/78) ≈ 32%
  const nova = imps.find((i) => i.code === "lowerNova");
  assert.equal(nova?.from, 4);
  assert.equal(nova?.to, 3);
  assert.ok(imps.some((i) => i.code === "noFlaggedAdditives"));
  assert.ok(imps.some((i) => i.code === "organic"));
  const pts = imps.find((i) => i.code === "betterScore");
  assert.ok(pts && pts.points! > 0 && pts.weakness === false);
});

/* ─────────────────────────── ranking ─────────────────────────── */
test("rankAlternatives returns only validated items, best first, capped and deduped", () => {
  const best = product({ name: "Eau aromatisée", nutriScore: "a", novaGroup: 1, additives: [],
    nutriments: { sugars: 2, salt: 0.01 } });
  const okAlt = product({ name: "Soda light", nutriScore: "b", novaGroup: 2, additives: [],
    nutriments: { sugars: 20 } });
  const worse = product({ name: "Autre soda", nutriScore: "e", novaGroup: 4, additives: ["e150d"], nutriments: { sugars: 70 } });

  const candidates = [
    { product: okAlt, gree: score(okAlt) },
    { product: worse, gree: score(worse) },     // dropped (lower score)
    { product: best, gree: score(best) },
    { product: okAlt, gree: score(okAlt) }       // duplicate barcode dropped
  ];
  const ranked = rankAlternatives(cur, curGree, candidates, PREFS);
  assert.ok(ranked.length >= 1);
  assert.ok(!ranked.some((r) => r.product.name === "Autre soda"));
  // best (bigger gain) ranks ahead of the lighter option
  assert.equal(ranked[0].product.name, "Eau aromatisée");
  // no duplicates
  assert.equal(new Set(ranked.map((r) => r.product.barcode)).size, ranked.length);
});

test("results are deterministic", () => {
  const alt = product({ name: "Soda light", nutriScore: "b", novaGroup: 2, additives: [], nutriments: { sugars: 20 } });
  const cands = [{ product: alt, gree: score(alt) }];
  const a = rankAlternatives(cur, curGree, cands, PREFS);
  const b = rankAlternatives(cur, curGree, cands, PREFS);
  assert.deepEqual(a, b);
});
