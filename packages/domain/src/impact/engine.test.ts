/** GreeImpact GI-1 — engine, provider adapter, insight and normalizer tests. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { computeGreeImpact } from "./engine";
import { GREE_IMPACT_VERSION } from "./types";
import { offEnvironmentalProvider, type EnvironmentalProvider } from "./provider";
import {
  P_COMPLETE, P_PALM, P_SCORE_ONLY, P_GRADE_ONLY, P_NOTHING, P_STATUS_UNKNOWN,
  P_OUT_OF_RANGE, RAW_ENV_COMPLETE, RAW_ENV_PALM, RAW_ENV_UNKNOWN
} from "./fixtures";
import { normalizeEnvironment } from "../product/normalizer";

/* ─────────────────────── valid, complete reading ───────────────────────── */

test("complete reading: valid, high confidence, source + normalized preserved", () => {
  const r = computeGreeImpact(P_COMPLETE);
  assert.equal(r.status, "valid");
  assert.equal(r.methodologyVersion, GREE_IMPACT_VERSION);
  assert.deepEqual(r.provider, { id: "openfoodfacts", methodology: "green-score" });
  assert.equal(r.score, 71);
  assert.equal(r.grade, "b");
  assert.equal(r.sourceScore, 71);
  assert.equal(r.sourceGrade, "b");
  assert.equal(r.confidence, "high");
  assert.equal(r.labelCode, "impact_label_moderate");
  assert.deepEqual(r.missing, []);
});

test("lifecycle contribution is exposed as CATEGORY-level, never product-specific", () => {
  const r = computeGreeImpact(P_COMPLETE);
  assert.deepEqual(r.lifecycle, { categoryScore: 82, categoryLevel: true });
  const lc = r.indicators.find((i) => i.kind === "lifecycle");
  assert.equal(lc?.code, "impact_lifecycle_category");
  // No CO2/water/transport fields exist anywhere in the output.
  assert.ok(!JSON.stringify(r).match(/co2|carbon|water|km|transportDistance/i));
});

test("indicators cover origins, packaging, labels, species with correct tones", () => {
  const r = computeGreeImpact(P_COMPLETE);
  const by = (k: string) => r.indicators.find((i) => i.kind === k)!;
  assert.equal(by("origins").tone, "positive");
  assert.equal(by("packaging").tone, "negative");
  assert.equal(by("packaging").sourceValue, -6);
  assert.equal(by("labels").tone, "positive");
  assert.equal(by("species").tone, "neutral"); // value 0 KNOWN ⇒ neutral, not a reward
  assert.deepEqual(r.environmentalLabels, ["eu organic", "ab agriculture biologique"]);
});

/* ─────────────────────────── insight ───────────────────────────────────── */

test("insight: best strength, clearest weakness, matching alternative advice", () => {
  const r = computeGreeImpact(P_COMPLETE);
  assert.equal(r.insight.strength?.code, "impact_strength_certified_production");
  assert.equal(r.insight.weakness?.code, "impact_weakness_packaging");
  assert.equal(r.insight.advice?.code, "impact_advice_packaging_alternative");
});

test("palm-oil product: threatened species dominates the weakness and the advice", () => {
  const r = computeGreeImpact(P_PALM);
  assert.equal(r.insight.weakness?.code, "impact_weakness_threatened_species");
  assert.equal(r.insight.weakness?.params?.ingredient, "en:palm-oil");
  assert.equal(r.insight.advice?.code, "impact_advice_certified_alternative");
  const species = r.indicators.find((i) => i.kind === "species");
  assert.equal(species?.tone, "negative");
  assert.equal(species?.sourceValue, -10);
});

test("insight is built ONLY from known signals — absence generates nothing", () => {
  const r = computeGreeImpact(P_GRADE_ONLY);
  assert.equal(r.insight.strength, undefined);
  assert.equal(r.insight.weakness, undefined);
  assert.equal(r.insight.advice, undefined);
});

/* ─────────────────────── partial & missing data ────────────────────────── */

test("score without source grade: display band used, missing reasons explicit", () => {
  const r = computeGreeImpact(P_SCORE_ONLY);
  assert.equal(r.status, "valid");
  assert.equal(r.score, 65);
  assert.equal(r.grade, "b"); // published band of 65
  assert.equal(r.sourceGrade, undefined); // source value preserved as absent
  assert.ok(r.missing.some((m) => m.code === "impact_missing_grade"));
  assert.ok(r.missing.some((m) => m.code === "impact_missing_adjustments"));
  assert.equal(r.confidence, "medium");
});

test("grade-only legacy product: valid, LOW confidence, no fabricated score", () => {
  const r = computeGreeImpact(P_GRADE_ONLY);
  assert.equal(r.status, "valid");
  assert.equal(r.grade, "c");
  assert.equal(r.score, undefined); // never invented from the grade
  assert.equal(r.confidence, "low");
  assert.ok(r.missing.some((m) => m.code === "impact_missing_score"));
});

test("no environmental signal: insufficient with explicit reason, no grade", () => {
  const r = computeGreeImpact(P_NOTHING);
  assert.equal(r.status, "insufficient");
  assert.equal(r.grade, undefined);
  assert.equal(r.score, undefined);
  assert.equal(r.labelCode, "impact_label_insufficient");
  assert.deepEqual(r.missing, [{ code: "impact_missing_all" }]);
  assert.deepEqual(r.insight, {});
});

test("source-declared unknown status lowers confidence with a reason", () => {
  const r = computeGreeImpact(P_STATUS_UNKNOWN);
  assert.equal(r.status, "valid");
  assert.notEqual(r.confidence, "high");
  assert.ok(r.missing.some((m) => m.code === "impact_status_unknown"));
});

test("source-declared missing signals become explicit reasons (palm fixture)", () => {
  const r = computeGreeImpact(P_PALM);
  assert.ok(r.missing.some((m) => m.code === "impact_source_missing_signal" && m.params?.signal === "origins"));
  assert.equal(r.confidence, "medium");
});

test("out-of-range source score: normalized clamps, source preserved verbatim", () => {
  const r = computeGreeImpact(P_OUT_OF_RANGE);
  assert.equal(r.score, 100);
  assert.equal(r.sourceScore, 112.4);
});

/* ───────────────────────── provider adapter ────────────────────────────── */

test("OFF provider reads Product.environment, falls back to legacy greenScore", () => {
  assert.equal(offEnvironmentalProvider.read(P_COMPLETE)?.normalizedScore, 71);
  assert.equal(offEnvironmentalProvider.read(P_GRADE_ONLY)?.normalizedGrade, "c");
  assert.equal(offEnvironmentalProvider.read(P_NOTHING), undefined);
});

test("alternative providers plug in through the adapter without engine changes", () => {
  const fakeLca: EnvironmentalProvider = {
    id: "fake-lca", methodology: "lca-v9", active: true,
    read: () => ({ sourceScore: 88, normalizedScore: 88, normalizedGrade: "a", sourceGrade: "a" })
  };
  const r = computeGreeImpact(P_NOTHING, fakeLca);
  assert.equal(r.status, "valid");
  assert.deepEqual(r.provider, { id: "fake-lca", methodology: "lca-v9" });
  assert.equal(r.score, 88);
});

/* ─────────────────── normalizer mapping (OFF raw → model) ──────────────── */

test("normalizeEnvironment maps a complete OFF payload faithfully", () => {
  const e = normalizeEnvironment({
    environmental_score_score: 71, environmental_score_grade: "b",
    environmental_score_data: RAW_ENV_COMPLETE
  })!;
  assert.equal(e.sourceScore, 71);
  assert.equal(e.normalizedGrade, "b");
  assert.equal(e.lifecycleScore, 82);
  assert.equal(e.adjustments?.packagingValue, -6);
  assert.deepEqual(e.adjustments?.productionSystemLabels, ["eu organic", "ab agriculture biologique"]);
  assert.equal(e.statusKnown, true);
  assert.deepEqual(e.sourceMissing, []);
});

test("normalizeEnvironment: legacy ecoscore_* fields are accepted", () => {
  const e = normalizeEnvironment({ ecoscore_score: 34, ecoscore_grade: "d", ecoscore_data: RAW_ENV_PALM })!;
  assert.equal(e.sourceScore, 34);
  assert.equal(e.normalizedGrade, "d");
  assert.equal(e.adjustments?.threatenedSpeciesValue, -10);
  assert.deepEqual(e.sourceMissing, ["origins"]);
});

test("normalizeEnvironment: unknown status with no values → statusKnown false", () => {
  const e = normalizeEnvironment({ environmental_score_data: RAW_ENV_UNKNOWN })!;
  assert.equal(e.statusKnown, false);
  assert.equal(e.normalizedScore, undefined);
  assert.equal(e.normalizedGrade, undefined);
  // engine then reports it as insufficient:
  const r = computeGreeImpact({ barcode: "x", name: "x", source: "openfoodfacts", nutriments: {}, environment: e });
  assert.equal(r.status, "insufficient");
});

test("normalizeEnvironment returns undefined when OFF has no environmental fields", () => {
  assert.equal(normalizeEnvironment({}), undefined);
});

/* ───────────────────────────── invariants ──────────────────────────────── */

test("GreeImpact never touches GreeScore inputs/outputs (separate domains)", async () => {
  const src = await import("node:fs/promises").then((fs) =>
    fs.readFile(new URL("./engine.ts", import.meta.url), "utf8"));
  assert.ok(!src.includes("scoring/"), "impact engine must not import the scoring domain");
});

test("determinism: identical product, identical impact", () => {
  assert.deepEqual(computeGreeImpact(P_PALM), computeGreeImpact(P_PALM));
});
