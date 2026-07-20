/**
 * GreeScore GS-2 engine tests — unit + regression.
 * Every expected number below is derivable by hand from the documented
 * methodology (docs/methodology/gree-score-v2.md).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import type { Product } from "../product/model";
import type { LocalPreferences } from "../criteria/model";
import { defaultPreferences } from "../criteria/model";
import { computeGreeScore, explainScore, additiveSeverityOf, METHODOLOGY_VERSION } from "./gree-score";

const PREFS: LocalPreferences = { ...defaultPreferences };

/** Base product: complete facts, ingredients known, no additives, not organic.
 *  Points: energy 418.4 kJ → 1 · sugars 2 → 0 · satFat 0.5 → 0 · salt 0.1 → 0
 *  ⇒ N=1 · fiber 3 → 3 · protein 8 → 4 ⇒ points −6 ⇒ solid table ≤ −4 → 100.
 *  Global = 60 + 30 + 0 = 90 (A, excellent). */
const base = (over: Partial<Product> = {}): Product => ({
  barcode: "3000000000001",
  name: "Produit Test",
  source: "openfoodfacts",
  ingredientsText: "flocons d'avoine, eau",
  categories: ["breakfast cereals"],
  nutriments: { energyKcal: 100, sugars: 2, saturatedFat: 0.5, salt: 0.1, fiber: 3, proteins: 8 },
  ...over
});

/* ─────────────────────────── general formula ───────────────────────────── */

test("scored result carries version, components and label", () => {
  const g = computeGreeScore(base(), PREFS);
  assert.equal(g.status, "scored");
  assert.equal(g.methodologyVersion, METHODOLOGY_VERSION);
  assert.match(g.registryVersion, /^AR-/);
  assert.equal(g.global, 90);
  assert.equal(g.grade, "A");
  assert.equal(g.labelCode, "excellent");
  assert.equal(g.components?.nutrition.score100, 100);
  assert.equal(g.components?.nutrition.contribution, 60);
  assert.equal(g.components?.additives.contribution, 30);
  assert.equal(g.components?.organic.contribution, 0);
  assert.equal(g.cappedByHighRiskAdditive, false);
});

test("organic +10 requires an OFFICIAL certification — marketing words never count", () => {
  const certified = computeGreeScore(base({ labels: ["EU Organic"] }), PREFS);
  assert.equal(certified.components?.organic.contribution, 10);
  assert.equal(certified.global, 100);

  const marketing = computeGreeScore(base({ labels: ["100% naturel"], name: "Granola bio-inspiré" }), PREFS);
  assert.equal(marketing.components?.organic.contribution, 0);
  assert.equal(marketing.global, 90);
});

test("additive deductions: limited −6, moderate −15, high −30, floor 0", () => {
  const limited = computeGreeScore(base({ additives: ["en:e621"] }), PREFS);
  assert.equal(limited.components?.additives.contribution, 24);
  assert.equal(limited.global, 84);

  const moderate = computeGreeScore(base({ additives: ["en:e951"] }), PREFS);
  assert.equal(moderate.components?.additives.contribution, 15);
  assert.equal(moderate.global, 75);

  const floored = computeGreeScore(base({ additives: ["en:e951", "en:e407", "en:e466"] }), PREFS);
  assert.equal(floored.components?.additives.contribution, 0); // 30 − 45 → floor 0
  assert.equal(floored.global, 60);
});

test("high-risk additive: −30 AND final cap at 49, flagged and explained", () => {
  const g = computeGreeScore(base({ additives: ["en:e250"] }), PREFS);
  // 60 (nutrition) + 0 (additives) + 0 = 60 → capped to 49
  assert.equal(g.global, 49);
  assert.equal(g.cappedByHighRiskAdditive, true);
  assert.ok(g.components?.additives.deductions[0].triggersCap);
  assert.ok(g.reasons.some((r) => r.code === "highRiskAdditiveCap"));
  assert.equal(explainScore(g)[0].code, "highRiskAdditive");
});

test("cap flag stays false when the score was already ≤ 49", () => {
  const g = computeGreeScore(
    base({ nutriments: { energyKcal: 550, sugars: 50, saturatedFat: 12, salt: 2.5, fiber: 0.5, proteins: 2 }, additives: ["en:e250"] }),
    PREFS
  );
  assert.ok(g.global <= 49);
  assert.equal(g.cappedByHighRiskAdditive, false);
});

test("unreviewed additive: no deduction, no cap, surfaced as info", () => {
  const g = computeGreeScore(base({ additives: ["en:e9999"] }), PREFS);
  assert.equal(g.components?.additives.contribution, 30);
  assert.equal(g.components?.additives.deductions[0].risk, "unreviewed");
  assert.ok(g.reasons.some((r) => r.code === "additivesUnreviewed"));
});

/* ─────────────────────────── nutrition paths ───────────────────────────── */

test("provider raw points take priority over the letter (never letter-mapped)", () => {
  const g = computeGreeScore(base({ nutriScorePoints: -3, nutriScore: "e" }), PREFS);
  assert.equal(g.components?.nutrition.pointsSource, "provider");
  assert.equal(g.components?.nutrition.score100, 100);
});

test("beverages use the liquid column; only water reaches 100", () => {
  const soda = computeGreeScore(
    base({ categories: ["beverages", "sodas"], nutriScorePoints: 3 }),
    PREFS
  );
  assert.equal(soda.components?.nutrition.kind, "beverage");
  assert.equal(soda.components?.nutrition.score100, 49); // liquid col, 3 pts

  const water = computeGreeScore(
    base({ categories: ["beverages", "mineral waters"], nutriScorePoints: 0 }),
    PREFS
  );
  assert.ok(water.components?.nutrition.isWater);
  assert.equal(water.components?.nutrition.score100, 100);
});

test("same points, solid vs beverage: published columns differ", () => {
  const solid = computeGreeScore(base({ nutriScorePoints: 3 }), PREFS);
  assert.equal(solid.components?.nutrition.score100, 65);
  const liquid = computeGreeScore(base({ categories: ["juices"], nutriScorePoints: 3 }), PREFS);
  assert.equal(liquid.components?.nutrition.score100, 49);
});

test("grade fallback only when partial facts + official letter; confidence reduced", () => {
  const g = computeGreeScore(
    base({
      nutriments: { energyKcal: 300, sugars: 10 }, // saturatedFat & salt missing
      nutriScore: "b"
    }),
    PREFS
  );
  assert.equal(g.status, "scored");
  assert.equal(g.components?.nutrition.pointsSource, "grade_fallback");
  assert.notEqual(g.confidence, "high");
  assert.ok(g.confidenceReasons.includes("nutrition_points_fallback"));
});

/* ─────────────────────────── unscored results ──────────────────────────── */

test("missing required nutrition facts + no letter ⇒ typed unscored, never a grade", () => {
  const g = computeGreeScore(base({ nutriments: { energyKcal: 300 } }), PREFS);
  assert.equal(g.status, "unscored");
  assert.equal(g.unscored?.code, "missing_nutrition_data");
  assert.equal(g.verdict, "insufficient_data");
  assert.equal(g.labelCode, "unscored");
  assert.equal(g.components, undefined);
  assert.ok(g.confidenceReasons.some((r) => r.startsWith("missing_")));
  assert.equal(explainScore(g)[0].code, "insufficientData");
});

test("unknown ingredient list ⇒ unscored (unknown is never additive-free)", () => {
  const g = computeGreeScore(base({ ingredientsText: undefined }), PREFS);
  assert.equal(g.status, "unscored");
  assert.equal(g.unscored?.code, "missing_ingredients_data");
});

test("EXCLUSIONS: alcohol, pure sugar, infant formula, supplements, pet food", () => {
  const cases: Array<[string[], string]> = [
    [["alcoholic beverages", "beers"], "excluded_alcohol"],
    [["sugars", "table sugars"], "excluded_pure_sugar"],
    [["infant formulas"], "excluded_infant_formula"],
    [["protein powders"], "excluded_protein_supplement"],
    [["dietary supplements"], "excluded_dietary_supplement"],
    [["cat food"], "excluded_pet_food"]
  ];
  for (const [cats, code] of cases) {
    const g = computeGreeScore(base({ categories: cats }), PREFS);
    assert.equal(g.status, "unscored", cats.join());
    assert.equal(g.unscored?.code, code);
    assert.equal(g.verdict, "excluded_category");
    assert.equal(explainScore(g)[0].code, "excludedCategory");
  }
});

test("SPECIAL CATEGORIES: salt and chocolate are typed unsupported (never invented)", () => {
  const salt = computeGreeScore(base({ categories: ["salts", "sea salts"] }), PREFS);
  assert.equal(salt.unscored?.code, "unsupported_special_category_salt");
  assert.equal(salt.verdict, "unsupported_category");

  const choc = computeGreeScore(base({ categories: ["dark chocolates"] }), PREFS);
  assert.equal(choc.unscored?.code, "unsupported_special_category_chocolate");
  assert.equal(explainScore(choc)[0].code, "unsupportedCategory");
});

test("compatibility alerts survive unscored results (they are about the person)", () => {
  const prefs: LocalPreferences = { ...PREFS, avoidAllergens: ["gluten"] };
  const g = computeGreeScore(
    base({ categories: ["beers"], allergens: ["en:gluten"] }),
    prefs
  );
  assert.equal(g.status, "unscored");
  assert.ok(g.alerts.some((a) => a.code === "allergenPresent"));
});

/* ───────────────────── independence of the channels ────────────────────── */

test("halal preference NEVER moves the health score in any direction", () => {
  const noPref = computeGreeScore(base(), PREFS);
  const halalPref = computeGreeScore(base(), { ...PREFS, preferHalal: true });
  assert.equal(noPref.global, halalPref.global);
});

test("user criteria change goalFit/verdict, never the global score", () => {
  const sugary = base({ nutriments: { energyKcal: 400, sugars: 45, saturatedFat: 2, salt: 0.3, fiber: 1, proteins: 3 } });
  const plain = computeGreeScore(sugary, PREFS);
  const withGoal = computeGreeScore(sugary, { ...PREFS, reduceSugar: true });
  assert.equal(plain.global, withGoal.global);
  assert.ok((withGoal.subScores.goalFit ?? 100) < 50);
});

/* ─────────────────────────── regression fixtures ───────────────────────── */

test("REGRESSION: sweetened cereal (computed 7 pts → 45/100 → 27+30 = 57)", () => {
  const g = computeGreeScore(
    base({ nutriments: { energyKcal: 400, sugars: 25, saturatedFat: 2, salt: 0.6, fiber: 5, proteins: 8 } }),
    PREFS
  );
  assert.equal(g.components?.nutrition.points, 7);
  assert.equal(g.components?.nutrition.score100, 45);
  assert.equal(g.global, 57);
  assert.equal(g.grade, "C");
  assert.equal(g.labelCode, "good");
});

test("REGRESSION: organic soda with aspartame (liquid 6 pts → 15/100)", () => {
  // nutrition 15 → 9 · additives 30−15 = 15 · organic 10 ⇒ 34 (D, poor)
  const g = computeGreeScore(
    base({
      categories: ["beverages", "sodas"],
      nutriScorePoints: 6,
      additives: ["en:e951"],
      labels: ["eu organic"]
    }),
    PREFS
  );
  assert.equal(g.global, 34);
  assert.equal(g.grade, "D");
  assert.equal(g.labelCode, "poor");
  assert.equal(g.cappedByHighRiskAdditive, false);
});

test("REGRESSION: organic charcuterie with nitrite — bio never rescues high-risk", () => {
  // nutrition (provider 14 pts → 9/100 → 5.4) + additives 0 + organic 10 = 15
  const g = computeGreeScore(
    base({ nutriScorePoints: 14, additives: ["en:e250"], labels: ["ab agriculture biologique"] }),
    PREFS
  );
  assert.equal(g.global, 15);
  assert.equal(g.grade, "E");
  assert.equal(g.labelCode, "bad");
  // the cap is armed (reason emitted) even though it did not constrain here
  assert.equal(g.cappedByHighRiskAdditive, false);
  assert.ok(g.reasons.some((r) => r.code === "highRiskAdditiveCap"));
});

test("REGRESSION: organic water scores 100", () => {
  const g = computeGreeScore(
    base({ categories: ["beverages", "spring waters"], nutriScorePoints: 0, labels: ["eu organic"] }),
    PREFS
  );
  assert.equal(g.global, 100);
  assert.equal(g.grade, "A");
});

test("determinism: same product, same result object", () => {
  const p = base({ additives: ["en:e621"], labels: ["eu organic"] });
  assert.deepEqual(computeGreeScore(p, PREFS), computeGreeScore(p, PREFS));
});

/* ─────────────────────────── legacy surface ────────────────────────────── */

test("additiveSeverityOf maps registry risks to display severities", () => {
  assert.equal(additiveSeverityOf("e250"), "avoid");
  assert.equal(additiveSeverityOf("e951"), "controversial");
  assert.equal(additiveSeverityOf("e621"), "watch");
  assert.equal(additiveSeverityOf("e330"), "neutral");
  assert.equal(additiveSeverityOf("e9999"), "neutral");
});
