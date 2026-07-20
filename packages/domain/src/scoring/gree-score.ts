/**
 * ════════════════════════════════════════════════════════════════════════
 *  GreeScore GS-2 — versioned health scoring engine.
 *  Pure TypeScript: no React, no I/O, no globals. Same input → same output.
 *
 *  METHODOLOGY (docs/methodology/gree-score-v2.md)
 *  ----------------------------------------------------------------------
 *  Structure follows the PUBLICLY DOCUMENTED Yuka food formula as of
 *  June 2026 (help.yuka.io, retrieved 2026-07-20):
 *
 *    nutrition  60 pts — ORIGINAL Nutri-Score raw points (provider value,
 *                        else computed from facts, else a documented grade
 *                        fallback) → 0–100 via the PUBLISHED smoothed
 *                        correspondence table (solids/beverages; only water
 *                        reaches 100 among beverages) → × 0.6.
 *    additives  30 pts — per-additive deductions from the versioned registry:
 *                        none 0 · limited −6 · moderate −15 · high −30.
 *                        Component floor 0. A HIGH-risk additive additionally
 *                        caps the FINAL score at 49.
 *    organic    10 pts — verified OFFICIAL organic certification only.
 *
 *  NOT scored: excluded categories (alcohol, pure sugar, infant formula,
 *  protein/dietary supplements, pet food), unsupported special categories
 *  (salt, chocolate — public rules incomplete, never invented), products
 *  missing required nutrition facts or an exploitable ingredient list.
 *  These return a TYPED UNSCORED result; unknown data is never positive.
 *
 *  User criteria (goalFit) and halal/allergen compatibility are surfaced as
 *  display/alert channels and NEVER move the 0–100 health score.
 * ════════════════════════════════════════════════════════════════════════
 */
import type { Product } from "../product/model";
import type { LocalPreferences, UserGoal } from "../criteria/model";
import type {
  GreeScore, ScoreGrade, VerdictCode, ScoreReason, ProductWarning,
  ConfidenceLevel, SubScores, ScoreExplanation, ScoreLabelCode,
  UnscoredReasonCode, ScoreComponents, AdditiveDeduction
} from "./types";
import { NUTRITION_THRESHOLDS as T, clamp, round } from "./thresholds";
import { halalStatusOf } from "./detectors";
import { computeDataQuality } from "../product/normalizer";
import {
  METHODOLOGY_VERSION, COMPONENT_MAX, ADDITIVE_DEDUCTION, HIGH_RISK_CAP,
  ORGANIC_BONUS, LABEL_BANDS, GRADE_BANDS, UNSCORED_PLACEHOLDER
} from "./methodology";
import { ADDITIVE_REGISTRY_VERSION, lookupAdditive } from "./additive-registry";
import {
  computeNutriScorePoints, nutritionScore100, gradeFallbackPoints,
  type NutritionKind, type PointsSource
} from "./nutrition";
import { nutritionKindOf, isWater, exclusionOf, specialCategoryOf } from "./categories";
import { organicCertificationOf } from "./organic";

export { METHODOLOGY_VERSION } from "./methodology";
export { ADDITIVE_REGISTRY_VERSION } from "./additive-registry";

/* ─────────────── legacy display helpers kept for consumers ─────────────── */

/** UI severity of one additive (display), derived from the registry. */
export type AdditiveSeverity = "avoid" | "controversial" | "watch" | "neutral";
const RISK_TO_SEVERITY = {
  high: "avoid", moderate: "controversial", limited: "watch", none: "neutral", unreviewed: "neutral"
} as const;
export function additiveSeverityOf(code: string): AdditiveSeverity {
  return RISK_TO_SEVERITY[lookupAdditive(code).risk];
}

/** NOVA display values (processing sub-score is INFORMATIONAL only in GS-2). */
const NOVA_DISPLAY: Record<1 | 2 | 3 | 4, number> = { 1: 100, 2: 78, 3: 45, 4: 12 };
const GRADE_DISPLAY: Record<string, number> = { a: 95, b: 80, c: 60, d: 35, e: 15 };

export type CategoryProfile = "default" | "beverage" | "fat";
/** Kept for filter/search consumers; the ENGINE itself uses categories.ts. */
export function categoryProfileOf(p: Product): CategoryProfile {
  const hay = (p.categories ?? []).join("|").toLowerCase();
  if (/beverage|boisson|soda|juice|jus |nectar|drink|tea|thé|coffee/.test(hay)) return "beverage";
  if (/(^|\|)(oil|huile|butter|beurre|margarine)s?($|\s|\|)/.test(hay)) return "fat";
  return "default";
}

/* ───────────────────────── non-score channels ──────────────────────────── */

type CriterionCode =
  | "reduceSugar" | "reduceSalt" | "reduceAdditives" | "reduceUltraProcessed"
  | "increaseProtein" | "increaseFiber" | "preferBio" | "vegan" | "vegetarian"
  | "eatHealthier" | "loseWeight" | "buildMuscle" | "lowCalorie" | "betterDigestion";
interface CriterionFit { code: CriterionCode; fit: number }

/** User-criteria fit — DISPLAY + verdict channel; never moves the score. */
function goalFits(p: Product, prefs: LocalPreferences, nutrition100: number | undefined, additives100: number | undefined): CriterionFit[] {
  const n = p.nutriments;
  const sugarFit = () => (n.sugars === undefined ? 50 : n.sugars <= T.sugarLow ? 100 : n.sugars <= T.sugarHigh ? 55 : 15);
  const saltFit = () => (n.salt === undefined ? 50 : n.salt <= T.saltLow ? 100 : n.salt <= T.saltHigh ? 55 : 15);
  const proteinFit = () => (n.proteins === undefined ? 50 : n.proteins >= 20 ? 100 : n.proteins >= T.proteinHigh ? 82 : n.proteins >= T.proteinOk ? 62 : 35);
  const fiberFit = () => (n.fiber === undefined ? 50 : n.fiber >= T.fiberHigh ? 100 : n.fiber >= T.fiberOk ? 70 : 35);
  const calorieFit = () => (n.energyKcal === undefined ? 50 : n.energyKcal <= T.kcalLow ? 100 : n.energyKcal <= T.kcalMid ? 70 : n.energyKcal <= T.kcalHigh ? 45 : 20);
  const novaFit = () => (p.novaGroup ? [0, 100, 80, 45, 10][p.novaGroup] : 50);
  const additivesFit = () => additives100 ?? 50;

  const fits: CriterionFit[] = [];
  const add = (active: boolean | undefined, code: CriterionCode, fn: () => number) => {
    if (active) fits.push({ code, fit: clamp(fn()) });
  };
  const goals = new Set<UserGoal>(prefs.goals);
  add(prefs.reduceSugar || goals.has("reduce_sugar"), "reduceSugar", sugarFit);
  add(prefs.reduceSalt || goals.has("reduce_salt"), "reduceSalt", saltFit);
  add(prefs.reduceAdditives || goals.has("reduce_additives"), "reduceAdditives", additivesFit);
  add(prefs.reduceUltraProcessed || goals.has("avoid_ultraprocessed"), "reduceUltraProcessed", novaFit);
  add(prefs.increaseProtein || goals.has("high_protein"), "increaseProtein", proteinFit);
  add(prefs.increaseFiber || goals.has("high_fiber"), "increaseFiber", fiberFit);
  add(prefs.preferBio || goals.has("go_organic"), "preferBio", () => (p.isBio ? 100 : 40));
  add(prefs.preferVegan || goals.has("vegan"), "vegan", () => (p.veganStatus === "confirmed" ? 100 : p.veganStatus === "incompatible" ? 5 : 50));
  add(prefs.preferVegetarian || goals.has("vegetarian"), "vegetarian", () => (p.vegetarianStatus === "confirmed" ? 100 : p.vegetarianStatus === "incompatible" ? 5 : 50));
  add(goals.has("eat_healthier"), "eatHealthier", () => nutrition100 ?? 50);
  add(goals.has("lose_weight"), "loseWeight", () => Math.round(calorieFit() * 0.5 + sugarFit() * 0.3 + (p.novaGroup ? NOVA_DISPLAY[p.novaGroup] : 50) * 0.2));
  add(goals.has("build_muscle"), "buildMuscle", () => Math.round(proteinFit() * 0.8 + sugarFit() * 0.2));
  add(goals.has("low_calorie"), "lowCalorie", calorieFit);
  add(goals.has("better_digestion"), "betterDigestion", () => Math.round(fiberFit() * 0.6 + additivesFit() * 0.4));
  return fits;
}

/** Compatibility channel — alerts only, zero score impact (halal by design). */
function compatibilityAlerts(p: Product, prefs: LocalPreferences, warnings: ProductWarning[]) {
  const userAllergens = prefs.avoidAllergens.map((a) => a.toLowerCase());
  const hit = (p.allergens ?? []).find((a) => userAllergens.some((u) => a.toLowerCase().includes(u)));
  if (hit) warnings.push({ level: "critical", code: "allergenPresent", values: { name: hit } });

  const halalActive = prefs.preferHalal || prefs.goals.includes("halal");
  if (halalActive) {
    const st = halalStatusOf(p);
    if (st === "incompatible") warnings.push({ level: "critical", code: "haramIngredient" });
    else if (st === "check_required") warnings.push({ level: "warning", code: "halalCheckRequired" });
    else if (st === "not_confirmed" || st === "unknown") warnings.push({ level: "info", code: "halalNotConfirmed" });
  }
}

/* ────────────────────────────── helpers ────────────────────────────────── */

const gradeFor = (score: number): ScoreGrade =>
  (GRADE_BANDS.find((b) => score >= b.min) ?? GRADE_BANDS[GRADE_BANDS.length - 1]).grade as ScoreGrade;
const labelFor = (score: number): ScoreLabelCode =>
  (LABEL_BANDS.find((b) => score >= b.min) ?? LABEL_BANDS[LABEL_BANDS.length - 1]).label as ScoreLabelCode;

const rankTop = (reasons: ScoreReason[], kind: "bonus" | "malus") => {
  const seen = new Set<string>();
  return reasons
    .filter((r) => r.kind === kind)
    .sort((a, b) => b.impact - a.impact)
    .filter((r) => (seen.has(r.code) ? false : (seen.add(r.code), true)))
    .slice(0, 3);
};

interface UnscoredArgs {
  code: UnscoredReasonCode;
  verdict: VerdictCode;
  values?: Record<string, string | number>;
  confidence: ConfidenceLevel;
  confidenceReasons: string[];
  reasons: ScoreReason[];
  warnings: ProductWarning[];
  subScores: SubScores;
}
function unscoredResult(a: UnscoredArgs): GreeScore {
  return {
    status: "unscored",
    methodologyVersion: METHODOLOGY_VERSION,
    registryVersion: ADDITIVE_REGISTRY_VERSION,
    global: UNSCORED_PLACEHOLDER.global,
    grade: UNSCORED_PLACEHOLDER.grade as ScoreGrade,
    verdict: a.verdict,
    labelCode: "unscored",
    unscored: { code: a.code, values: a.values },
    cappedByHighRiskAdditive: false,
    subScores: a.subScores,
    confidence: a.confidence,
    confidenceReasons: a.confidenceReasons,
    topPositives: rankTop(a.reasons, "bonus"),
    topNegatives: rankTop(a.reasons, "malus"),
    reasons: a.reasons,
    warnings: a.warnings,
    alerts: a.warnings.filter((w) => w.level === "critical")
  };
}

/* ──────────────────────────── main entry point ─────────────────────────── */

export function computeGreeScore(product: Product, preferences: LocalPreferences): GreeScore {
  const p = product.dataQuality ? product : { ...product, dataQuality: computeDataQuality(product) };
  const quality = p.dataQuality!;
  const reasons: ScoreReason[] = [];
  const warnings: ProductWarning[] = [];

  // Compatibility alerts are computed for EVERY status — they are about the
  // person, not the score, and must survive exclusions/unscored results.
  compatibilityAlerts(p, preferences, warnings);

  // Informational sub-scores shown in the explore layer (no score impact).
  const processing = p.novaGroup ? NOVA_DISPLAY[p.novaGroup] : undefined;
  const environment = p.greenScore ? GRADE_DISPLAY[p.greenScore] : undefined;
  const baseSub: SubScores = {
    nutrition: UNSCORED_PLACEHOLDER.global, processing, additives: undefined,
    naturality: 30, environment, goalFit: undefined
  };

  /* 1 · excluded categories — no rating method exists, by methodology. */
  const exclusion = exclusionOf(p);
  if (exclusion) {
    return unscoredResult({
      code: exclusion, verdict: "excluded_category",
      confidence: quality.confidence, confidenceReasons: quality.confidenceReasons,
      reasons, warnings, subScores: baseSub
    });
  }

  /* 2 · unsupported special categories — public rules incomplete, never invented. */
  const special = specialCategoryOf(p);
  if (special) {
    return unscoredResult({
      code: special, verdict: "unsupported_category",
      confidence: quality.confidence, confidenceReasons: quality.confidenceReasons,
      reasons, warnings, subScores: baseSub
    });
  }

  /* 3 · ingredient list required — an unknown list is NOT "no additives". */
  if (!quality.availability.ingredients) {
    return unscoredResult({
      code: "missing_ingredients_data", verdict: "insufficient_data",
      confidence: "low", confidenceReasons: quality.confidenceReasons,
      reasons, warnings, subScores: baseSub
    });
  }

  /* 4 · nutrition — provider points ▸ computed ▸ documented grade fallback. */
  const kind: NutritionKind = nutritionKindOf(p);
  const water = isWater(p);
  let points: number | undefined;
  let pointsSource: PointsSource | undefined;
  let conservativeZeros: string[] = [];

  if (p.nutriScorePoints !== undefined) {
    points = p.nutriScorePoints;
    pointsSource = "provider";
  } else {
    const computed = computeNutriScorePoints(p.nutriments, kind);
    if (computed.ok) {
      points = computed.value.points;
      pointsSource = "computed";
      conservativeZeros = computed.value.conservativeZeros;
    } else if (p.nutriScore && quality.availability.nutrition) {
      // Official letter + partial facts: documented fallback, reduced confidence.
      points = gradeFallbackPoints(p.nutriScore, kind);
      pointsSource = "grade_fallback";
      conservativeZeros = ["rawPointsUnavailable", ...computed.missing];
    } else {
      return unscoredResult({
        code: "missing_nutrition_data", verdict: "insufficient_data",
        values: { missing: computed.missing.join(",") },
        confidence: "low",
        confidenceReasons: [...quality.confidenceReasons, ...computed.missing.map((m) => `missing_${m}`)],
        reasons, warnings, subScores: baseSub
      });
    }
  }

  const score100 = nutritionScore100(points, kind, water);
  const nutritionContribution = (score100 * COMPONENT_MAX.nutrition) / 100;

  reasons.push({
    kind: score100 >= 65 ? "bonus" : "malus",
    code: "nutriScore",
    impact: Math.abs(score100 - 50) / 6 + 4,
    values: { grade: (p.nutriScore ?? gradeFor(score100).toLowerCase()).toUpperCase(), points }
  });

  // Fact-level display reasons/warnings (explain the profile; never re-deduct).
  const n = p.nutriments;
  if (n.sugars !== undefined && n.sugars > (kind === "beverage" ? 6.75 : T.sugarHigh)) {
    reasons.push({ kind: "malus", code: "tooSugar", impact: 8 + Math.min(16, n.sugars / 4), values: { v: n.sugars } });
    warnings.push({ level: "warning", code: "highSugar", values: { v: n.sugars } });
  }
  if (n.salt !== undefined && n.salt > T.saltHigh) {
    reasons.push({ kind: "malus", code: "tooSalty", impact: 7, values: { v: n.salt } });
    warnings.push({ level: "warning", code: "highSalt", values: { v: n.salt } });
  }
  if (n.saturatedFat !== undefined && n.saturatedFat > T.satFatHigh) {
    warnings.push({ level: "info", code: "highSatFat" });
  }
  if (n.fiber !== undefined && n.fiber >= T.fiberHigh) reasons.push({ kind: "bonus", code: "richFiber", impact: 4 });
  if (n.proteins !== undefined && n.proteins >= T.proteinHigh) reasons.push({ kind: "bonus", code: "richProtein", impact: 4 });

  /* 5 · additives — versioned registry deductions out of 30. */
  const additiveCodes = p.additives ?? [];
  const deductions: AdditiveDeduction[] = additiveCodes.map((raw) => {
    const { code, risk } = lookupAdditive(raw);
    const deduction = risk === "unreviewed" ? 0 : ADDITIVE_DEDUCTION[risk];
    return { code, risk, deduction, triggersCap: risk === "high" };
  });
  const totalDeduction = deductions.reduce((s, d) => s + d.deduction, 0);
  const additivesContribution = Math.max(0, COMPONENT_MAX.additives - totalDeduction);
  const highRiskPresent = deductions.some((d) => d.triggersCap);

  const flagged = deductions.filter((d) => d.deduction > 0);
  if (flagged.length > 0) {
    reasons.push({
      kind: "malus", code: "additivesWatch",
      impact: Math.min(22, totalDeduction / 2 + 4), values: { n: flagged.length }
    });
  } else if (additiveCodes.length === 0) {
    reasons.push({ kind: "bonus", code: "noAdditive", impact: 5 });
  }
  for (const d of deductions.filter((x) => x.triggersCap)) {
    warnings.push({ level: "warning", code: "additiveAvoid", values: { code: d.code.toUpperCase() } });
  }
  const unreviewed = deductions.filter((d) => d.risk === "unreviewed");
  if (unreviewed.length > 0) {
    reasons.push({ kind: "info", code: "additivesUnreviewed", impact: 2, values: { n: unreviewed.length } });
  }

  /* 6 · organic — verified official certification only. */
  const organic = organicCertificationOf(p.labels);
  const organicContribution = organic.certified ? ORGANIC_BONUS : 0;
  if (organic.certified) reasons.push({ kind: "bonus", code: "bio", impact: 7 });

  /* 7 · assemble + high-risk cap. */
  const uncapped = clamp(round(nutritionContribution + additivesContribution + organicContribution));
  const capped = highRiskPresent && uncapped > HIGH_RISK_CAP;
  const global = capped ? HIGH_RISK_CAP : uncapped;
  if (highRiskPresent) reasons.push({ kind: "malus", code: "highRiskAdditiveCap", impact: 30 });

  /* 8 · goal fit (display + verdict channel only). */
  const additives100 = round((additivesContribution / COMPONENT_MAX.additives) * 100);
  const fits = goalFits(p, preferences, score100, additives100);
  const goalFit = fits.length ? round(fits.reduce((s, f) => s + f.fit, 0) / fits.length) : undefined;
  for (const f of fits) {
    if (f.fit <= 35) reasons.push({ kind: "malus", code: "criterionMismatch", impact: 6, values: { criterion: f.code } });
    if (f.fit >= 85) reasons.push({ kind: "bonus", code: "criterionMatch", impact: 4, values: { criterion: f.code } });
  }

  /* 9 · confidence — reduced by fallback path; never moves the score. */
  let confidence: ConfidenceLevel = quality.confidence;
  const confidenceReasons = [...quality.confidenceReasons];
  if (pointsSource === "grade_fallback" && confidence === "high") confidence = "medium";
  if (pointsSource === "grade_fallback") confidenceReasons.push("nutrition_points_fallback");
  for (const z of conservativeZeros) if (!confidenceReasons.includes(z)) confidenceReasons.push(z);
  if (confidence !== "high") warnings.push({ level: "info", code: "partialData" });

  const grade = gradeFor(global);
  const verdict: VerdictCode =
    confidence === "low"
      ? "insufficient_data"
      : p.novaGroup === 4 && global < 50
        ? "ultra_processed"
        : goalFit !== undefined && goalFit < 35
          ? "poor_fit_for_goal"
          : grade === "A"
            ? "excellent_choice"
            : grade === "B"
              ? "good_choice"
              : "limit";

  const components: ScoreComponents = {
    nutrition: {
      points, pointsSource: pointsSource!, kind, isWater: water,
      score100, contribution: round(nutritionContribution * 10) / 10, conservativeZeros
    },
    additives: { contribution: additivesContribution, deductions },
    organic: { certified: organic.certified, certification: organic.label, contribution: organicContribution }
  };

  const subScores: SubScores = {
    nutrition: score100,
    processing,
    additives: additives100,
    naturality: organic.certified ? 100 : 30,
    environment,
    goalFit
  };

  return {
    status: "scored",
    methodologyVersion: METHODOLOGY_VERSION,
    registryVersion: ADDITIVE_REGISTRY_VERSION,
    global,
    grade,
    verdict,
    labelCode: labelFor(global),
    components,
    cappedByHighRiskAdditive: capped,
    subScores,
    confidence,
    confidenceReasons,
    topPositives: rankTop(reasons, "bonus"),
    topNegatives: rankTop(reasons, "malus"),
    reasons,
    warnings,
    alerts: warnings.filter((w) => w.level === "critical")
  };
}

/* ───────────────────────── plain-language summary ──────────────────────── */

/** 1–2 sentence codes (resolved via "score.explain.*") matching the result. */
export function explainScore(gree: GreeScore): ScoreExplanation[] {
  const out: ScoreExplanation[] = [];

  if (gree.status === "unscored") {
    if (gree.verdict === "excluded_category") out.push({ code: "excludedCategory" });
    else if (gree.verdict === "unsupported_category") out.push({ code: "unsupportedCategory" });
    else out.push({ code: "insufficientData" });
    return out;
  }
  if (gree.verdict === "insufficient_data") {
    out.push({ code: "insufficientData" });
    return out;
  }

  const has = (code: string) => gree.reasons.some((r) => r.code === code && r.kind === "malus");

  if (gree.cappedByHighRiskAdditive) {
    out.push({ code: "highRiskAdditive" });
  } else if (gree.verdict === "ultra_processed") {
    out.push({ code: has("tooSugar") ? "highSugarUltraProcessed" : "ultraProcessed" });
  } else if (gree.verdict === "poor_fit_for_goal") {
    const mismatch = gree.reasons.find((r) => r.code === "criterionMismatch");
    out.push({ code: "notIdealForCriterion", values: mismatch?.values });
  } else if (gree.grade === "A" || gree.grade === "B") {
    out.push({ code: gree.confidence === "high" ? "solidChoice" : "goodButIncomplete" });
  } else {
    out.push({ code: "mixedProfile" });
  }

  const top = gree.topNegatives[0];
  if (out[0].code !== "highSugarUltraProcessed" && top?.code === "tooSugar") out.push({ code: "watchSugar" });
  else if (top?.code === "highRiskAdditiveCap" && out[0].code !== "highRiskAdditive") out.push({ code: "highRiskAdditive" });
  return out.slice(0, 2);
}
