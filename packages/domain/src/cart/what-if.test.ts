/** GreeCart What-if — deterministic simulation, planning and grouping. */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  simulateReplacement, buildImprovementPlan, groupBasket, classifyEntry, categoryCoverage,
  type ReplacementCandidate
} from "./what-if";
import { computeCartScore, type CartInput } from "./engine";
import { computeGreeScore } from "../scoring/gree-score";
import { defaultPreferences } from "../criteria/model";
import type { LocalPreferences } from "../criteria/model";
import type { Product } from "../product/model";

const PREFS: LocalPreferences = { ...defaultPreferences };
function product(o: Partial<Product> = {}): Product {
  return {
    barcode: Math.random().toString().slice(2, 12), name: "P", source: "openfoodfacts",
    categories: ["snacks"], ingredientsText: "x", additives: [], imageUrl: "i",
    nutriments: { sugars: 5, salt: 0.1, proteins: 5, saturatedFat: 2 }, nutriScore: "b", novaGroup: 2, ...o
  };
}
const input = (p: Product): CartInput => ({ product: p });

/* poor + good building blocks */
const soda = product({ barcode: "soda", name: "Soda", categories: ["beverages", "sodas"], nutriScore: "e", novaGroup: 4, additives: ["e150d", "e338"], nutriments: { sugars: 60, salt: 0.1 } });
const water = product({ barcode: "water", name: "Eau aromatisée", categories: ["beverages", "sodas"], nutriScore: "a", novaGroup: 1, nutriments: { sugars: 2, salt: 0.01 } });
const oats = product({ barcode: "oats", name: "Flocons avoine", nutriScore: "a", novaGroup: 1, isBio: true, nutriments: { sugars: 1, fiber: 10, proteins: 13, salt: 0.01 } });

test("simulateReplacement recalculates and reports a positive gain for a better product", () => {
  const inputs = [input(soda), input(oats)];
  const r = simulateReplacement(inputs, PREFS, "soda", water);
  assert.equal(r.before, computeCartScore(inputs, PREFS).global);
  assert.ok(r.after > r.before, `expected improvement, got ${r.before} → ${r.after}`);
  assert.equal(r.gain, r.after - r.before);
});

test("a poor one-product basket never invents a positive strength", () => {
  const result = computeCartScore([input(soda)], PREFS);
  assert.ok(result.global < 35);
  assert.equal(result.mainStrength.key, "none");
  assert.deepEqual(result.positiveInsights, []);
});

test("simulateReplacement is neutral/negative for a worse replacement", () => {
  const worse = product({ barcode: "worse", nutriScore: "e", novaGroup: 4, additives: ["e150d"], nutriments: { sugars: 70 } });
  const inputs = [input(oats), input(water)];
  const r = simulateReplacement(inputs, PREFS, "oats", worse);
  assert.ok(r.gain <= 0);
});

test("buildImprovementPlan is prioritized (biggest gain first) and deterministic", () => {
  const midSauce = product({ barcode: "sauce", name: "Sauce", categories: ["sauces"], nutriScore: "c", novaGroup: 3, nutriments: { sugars: 12, salt: 1.6 } });
  const betterSauce = product({ barcode: "sauce2", name: "Sauce maison", categories: ["sauces"], nutriScore: "a", novaGroup: 1, nutriments: { sugars: 4, salt: 0.4 } });
  const inputs = [input(soda), input(midSauce), input(oats)];
  const candidates: ReplacementCandidate[] = [
    { targetBarcode: "soda", replacement: water },
    { targetBarcode: "sauce", replacement: betterSauce }
  ];
  const plan = buildImprovementPlan(inputs, PREFS, candidates);
  assert.ok(plan.steps.length >= 1);
  assert.equal(plan.baseScore, computeCartScore(inputs, PREFS).global);
  // steps sorted by decreasing gain
  for (let i = 1; i < plan.steps.length; i++) assert.ok(plan.steps[i - 1].gain >= plan.steps[i].gain);
  // each step's after = its before + gain, and chains correctly
  for (const s of plan.steps) assert.equal(s.after, s.before + s.gain);
  assert.equal(plan.finalScore, plan.steps[plan.steps.length - 1].after);
  assert.ok(plan.totalGain > 0);
  // deterministic
  assert.deepEqual(buildImprovementPlan(inputs, PREFS, candidates), plan);
});

test("buildImprovementPlan respects minGain and never reuses a target or duplicates a product", () => {
  const inputs = [input(soda), input(oats)];
  // candidate replacement barely better → filtered by a high minGain
  const candidates: ReplacementCandidate[] = [{ targetBarcode: "soda", replacement: water }];
  const strict = buildImprovementPlan(inputs, PREFS, candidates, { minGain: 999 });
  assert.equal(strict.steps.length, 0);
  assert.equal(strict.totalGain, 0);
  // a candidate replacing with a product already in basket is skipped
  const dup = buildImprovementPlan(inputs, PREFS, [{ targetBarcode: "soda", replacement: oats }]);
  assert.ok(!dup.steps.some((s) => s.replacement.barcode === "oats"));
});

test("buildImprovementPlan caps the number of steps (fewest changes)", () => {
  const p1 = product({ barcode: "p1", nutriScore: "e", novaGroup: 4, additives: ["e150d"], nutriments: { sugars: 55 } });
  const p2 = product({ barcode: "p2", nutriScore: "e", novaGroup: 4, additives: ["e150d"], nutriments: { sugars: 58 } });
  const b1 = product({ barcode: "b1", nutriScore: "a", novaGroup: 1, nutriments: { sugars: 3 } });
  const b2 = product({ barcode: "b2", nutriScore: "a", novaGroup: 1, nutriments: { sugars: 3 } });
  const inputs = [input(p1), input(p2)];
  const cands: ReplacementCandidate[] = [{ targetBarcode: "p1", replacement: b1 }, { targetBarcode: "p2", replacement: b2 }];
  const plan = buildImprovementPlan(inputs, PREFS, cands, { maxSteps: 1 });
  assert.equal(plan.steps.length, 1);
});

test("groupBasket separates strong / acceptable / priority / insufficient", () => {
  const strong = oats;                                                  // bio, A, nova1
  const priority = soda;                                                // E, nova4, high sugar
  const insufficient = product({ barcode: "mystery", name: "Mystère", nutriScore: undefined, ingredientsText: undefined, additives: undefined, novaGroup: undefined, nutriments: {} });
  const result = computeCartScore([input(strong), input(priority), input(insufficient)], PREFS);
  const groups = groupBasket(result.analyses);
  assert.ok(groups.strong.some((a) => a.product.barcode === "oats"));
  assert.ok(groups.priority.some((a) => a.product.barcode === "soda"));
  assert.ok(groups.insufficient.some((a) => a.product.barcode === "mystery"));
  // a low-confidence product is NOT in priority (never auto-poor)
  assert.ok(!groups.priority.some((a) => a.product.barcode === "mystery"));
});

test("classifyEntry sends a critical allergen conflict to priority regardless of confidence", () => {
  const prefs = { ...PREFS, avoidAllergens: ["peanut"] };
  const allergenThin = product({ barcode: "a", nutriScore: undefined, ingredientsText: "arachides", allergens: ["peanut"], nutriments: {} });
  const result = computeCartScore([input(allergenThin), input(oats)], prefs);
  const a = result.analyses.find((x) => x.product.barcode === "a")!;
  assert.equal(classifyEntry(a), "priority");
});

test("categoryCoverage returns sorted distinct categories", () => {
  const cov = categoryCoverage(computeCartScore([input(soda), input(oats), input(water)], PREFS).analyses);
  assert.deepEqual(cov, ["snacks", "sodas"]);
});
