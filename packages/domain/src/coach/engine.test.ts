/** GreeCoach V1 — deterministic intent classification + answer assembly. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { answerCoach } from "./engine";
import { classifyIntent, supportedIntents } from "./intents";
import type { ProductContext, CompareContext, CartContext } from "./types";
import { computeGreeScore } from "../scoring/gree-score";
import { computeGreeImpact } from "../impact/engine";
import { computeComparison } from "../compare/engine";
import { computeCartScore } from "../cart/engine";
import { analyzeCartExtras } from "../cart/analysis";
import { defaultPreferences } from "../criteria/model";
import type { LocalPreferences } from "../criteria/model";
import type { Product, ProductEnvironment } from "../product/model";

const PREFS: LocalPreferences = { ...defaultPreferences };
const env = (e: Omit<ProductEnvironment, "provider">): ProductEnvironment => ({ provider: "openfoodfacts", ...e });

function product(o: Partial<Product> = {}): Product {
  return {
    barcode: "3000000000001", name: "Produit", source: "openfoodfacts",
    categories: ["breakfast cereals"], ingredientsText: "flocons, sucre", additives: [],
    nutriments: { energyKcal: 380, sugars: 22, saturatedFat: 3, salt: 0.5, fiber: 5, proteins: 8 },
    nutriScore: "c", novaGroup: 4, ...o
  };
}
const productCtx = (o: Partial<Product> = {}, prefs = PREFS, alternative?: ProductContext["alternative"]): ProductContext => {
  const p = product(o);
  return { kind: "product", product: p, gree: computeGreeScore(p, prefs), impact: computeGreeImpact(p), prefs, alternative };
};

/* ── classification ── */

test("free-text questions classify to the right supported intent", () => {
  const ctx = productCtx();
  assert.equal(classifyIntent("Pourquoi ce produit est noté ainsi ?", ctx), "whyRated");
  assert.equal(classifyIntent("What is its main weakness?", ctx), "mainWeakness");
  assert.equal(classifyIntent("quel additif a joué ?", ctx), "whichAdditive");
  assert.equal(classifyIntent("is it halal?", ctx), "halalConfirmed");
  assert.equal(classifyIntent("explique simplement", ctx), "explainSimpler");
});

test("classification is constrained to the context; unknown text → null", () => {
  const ctx = productCtx();
  assert.equal(classifyIntent("which is better for the environment?", ctx), null); // compare-only intent
  assert.equal(classifyIntent("what's the weather", ctx), null);
});

test("supported intents differ by context and scored state", () => {
  assert.ok(supportedIntents(productCtx()).includes("whyRated"));
  const unscored = productCtx({ ingredientsText: undefined });
  assert.ok(supportedIntents(unscored).includes("whyNoScore"));
  assert.ok(!supportedIntents(unscored).includes("whyRated"));
});

/* ── product answers ── */

test("whyRated cites the verdict, top reasons and component breakdown — all by reference", () => {
  const a = answerCoach("whyRated", productCtx());
  assert.equal(a.unsupported, undefined);
  assert.equal(a.lines[0].ref?.ns, "verdict");
  assert.ok(a.lines.some((l) => l.ref?.ns === "reason"));
  assert.ok(a.lines.some((l) => l.code === "componentBreakdown"));
  assert.equal(a.methodology, "score");
});

test("mainWeakness / mainStrength reference an engine reason, never invent one", () => {
  const w = answerCoach("mainWeakness", productCtx());
  assert.ok(w.lines[0].code === "weaknessIs" || w.lines[0].code === "noWeakness");
  if (w.lines[0].code === "weaknessIs") assert.equal(w.lines[0].ref?.ns, "reason");
});

test("whichAdditive lists only additives that affected the score", () => {
  const withAdditive = answerCoach("whichAdditive", productCtx({ additives: ["en:e250"] })); // high-risk nitrite
  assert.ok(withAdditive.lines.some((l) => l.code === "additiveCapped" || l.code === "additivePenalty"));
  const clean = answerCoach("whichAdditive", productCtx({ additives: [] }));
  assert.equal(clean.lines[0].code, "noAdditiveImpact");
});

test("whyNoScore explains the typed unscored reason and flags uncertainty", () => {
  const a = answerCoach("whyNoScore", productCtx({ ingredientsText: undefined }));
  assert.equal(a.lines[0].ref?.ns, "unscored");
  assert.ok(a.uncertainty);
  // A scored product answered honestly: it IS scored.
  const scored = answerCoach("whyNoScore", productCtx());
  assert.equal(scored.lines[0].code, "actuallyScored");
});

test("halal: unknown/absent → 'not verified' (never 'not halal'), with uncertainty", () => {
  const a = answerCoach("halalConfirmed", productCtx());
  assert.equal(a.lines[0].code, "halalNotVerified");
  assert.ok(a.uncertainty);
  const confirmed = answerCoach("halalConfirmed", productCtx({ isHalal: true, halalStatus: "confirmed" }));
  assert.equal(confirmed.lines[0].code, "halalConfirmed");
});

test("allergenCheck: respects declared allergens; cannot-confirm when ingredients unknown", () => {
  const none = answerCoach("allergenCheck", productCtx());
  assert.equal(none.lines[0].code, "noAllergenDeclared");

  const prefs: LocalPreferences = { ...PREFS, avoidAllergens: ["gluten"] };
  const found = answerCoach("allergenCheck", productCtx({ ingredientsText: "farine de blé (gluten)", allergens: ["en:gluten"] }, prefs));
  assert.equal(found.lines[0].code, "allergenFound");

  const cannot = answerCoach("allergenCheck", productCtx({ ingredientsText: undefined, allergens: undefined }, prefs));
  assert.equal(cannot.lines[0].code, "allergenCannotConfirm");
  assert.ok(cannot.uncertainty);
});

test("whyAlternativeBetter uses measurable diffs; states uncertainty with no alternative", () => {
  const alt = product({ barcode: "alt", name: "Meilleur", nutriScore: "a", novaGroup: 1, additives: [], nutriments: { energyKcal: 350, sugars: 6, saturatedFat: 1, salt: 0.2, fiber: 9, proteins: 11 } });
  const withAlt = answerCoach("whyAlternativeBetter", productCtx({}, PREFS, { product: alt, gree: computeGreeScore(alt, PREFS) }));
  assert.equal(withAlt.lines[0].code, "alternativeScore");
  assert.ok(withAlt.lines.some((l) => l.code === "altLessSugar"));

  const noAlt = answerCoach("whyAlternativeBetter", productCtx());
  assert.ok(noAlt.uncertainty);
});

test("explainSimpler stays plain and appends the no-medical-claim note", () => {
  const a = answerCoach("explainSimpler", productCtx());
  assert.ok(a.lines.some((l) => l.code === "notMedical"));
});

/* ── compare answers ── */

test("compareHealth names the health winner + reasons; flags low confidence", () => {
  const a = product({ barcode: "a", name: "A", nutriScore: "a", novaGroup: 1, nutriments: { energyKcal: 60, sugars: 4, salt: 0.1, saturatedFat: 1, proteins: 6 } });
  const b = product({ barcode: "b", name: "B", nutriScore: "d", novaGroup: 4, additives: ["en:e150d"], nutriments: { energyKcal: 120, sugars: 16, salt: 0.2, saturatedFat: 4, proteins: 3 } });
  const ctx: CompareContext = { kind: "compare", result: computeComparison([b, a], PREFS) };
  const ans = answerCoach("compareHealth", ctx);
  assert.equal(ans.lines[0].code, "healthWinnerIs");
  assert.equal(ans.lines[0].params?.name, "A");
});

test("compareEnvironment: no valid env data → explicit 'no comparison' + uncertainty", () => {
  const a = product({ barcode: "a", name: "A" });
  const b = product({ barcode: "b", name: "B", nutriScore: "d" });
  const ctx: CompareContext = { kind: "compare", result: computeComparison([a, b], PREFS) };
  const ans = answerCoach("compareEnvironment", ctx);
  assert.equal(ans.lines[0].code, "noEnvComparison");
  assert.ok(ans.uncertainty);

  const ae = product({ barcode: "ae", name: "AE", environment: env({ sourceGrade: "a", normalizedGrade: "a", sourceScore: 90, normalizedScore: 90 }) });
  const be = product({ barcode: "be", name: "BE", nutriScore: "d", environment: env({ sourceGrade: "d", normalizedGrade: "d", sourceScore: 34, normalizedScore: 34 }) });
  const ctx2: CompareContext = { kind: "compare", result: computeComparison([be, ae], PREFS) };
  const ans2 = answerCoach("compareEnvironment", ctx2);
  assert.equal(ans2.lines[0].code, "envWinnerIs");
});

/* ── cart answers ── */

test("improveCart surfaces the score, main risk and first replacement", () => {
  const inputs = [{ product: product({ barcode: "x", nutriScore: "e", novaGroup: 4, additives: ["en:e250"], nutriments: { sugars: 40, energyKcal: 400, salt: 0.5, saturatedFat: 6 } }) }];
  const result = computeCartScore(inputs, PREFS);
  const ctx: CartContext = { kind: "cart", result, extras: analyzeCartExtras(result.analyses, PREFS) };
  const a = answerCoach("improveCart", ctx);
  assert.equal(a.lines[0].code, "cartScoreIs");
  assert.equal(a.methodology, "cart");
});

/* ── invariants ── */

test("every answer carries a version and either lines or an unsupported flag", () => {
  const a = answerCoach("whyRated", productCtx());
  assert.equal(a.version, "GC-1.0.0");
  assert.ok(a.lines.length > 0);
});

test("determinism: same intent + context ⇒ identical answer", () => {
  const ctx = productCtx();
  assert.deepEqual(answerCoach("whyRated", ctx), answerCoach("whyRated", ctx));
});
