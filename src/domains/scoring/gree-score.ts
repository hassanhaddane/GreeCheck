/**
 * ════════════════════════════════════════════════════════════════════════
 *  GreeScore V2 — transparent, deterministic decision engine.
 *  Pure TypeScript: no React, no I/O, no globals. Same input → same output.
 * ════════════════════════════════════════════════════════════════════════
 *
 *  FORMULA (documented contract)
 *  ----------------------------------------------------------------------
 *  The global score is a weighted mean of the AVAILABLE buckets, with the
 *  weights renormalized over what is actually known (missing data reduces
 *  CONFIDENCE, never health quality):
 *
 *    nutrition    weight 40 — Nutri-Score is AUTHORITATIVE when present
 *                  (A95 B80 C60 D35 E15); nutrient facts then only EXPLAIN
 *                  the base (no re-deduction → no double penalty). Without
 *                  Nutri-Score, a derived model starts at 70 and adjusts by
 *                  sugar/salt/sat-fat/fiber/protein using CATEGORY-AWARE
 *                  thresholds (beverages stricter on sugar; oils/fats more
 *                  tolerant on fat — applied only when the category signal
 *                  is reliable).
 *    processing   weight 25 — NOVA 1→100, 2→78, 3→45, 4→12 (strong
 *                  penalty). Unknown NOVA → bucket ABSENT.
 *    additives    weight 15 — starts at 100, −16 per "avoid", −9 per
 *                  "controversial", −4 per "watch", −1.5 otherwise;
 *                  palm oil present −10. If ingredients are unknown the
 *                  bucket is ABSENT (an unknown list is NOT "no additives").
 *    naturality   weight 10 — base 30; organic +40 (meaningful but capped
 *                  by the bucket weight); clean label +30 (only when the
 *                  ingredient list is KNOWN and additive-free);
 *                  fair-trade +10. Max 100.
 *    environment  weight 10 — Green-Score grade (A95…E15), only when valid.
 *    goalFit      weight 10 — mean fit of the ACTIVE local criteria.
 *                  HALAL IS EXCLUDED: it is a compatibility fact and never
 *                  moves the health score in any direction.
 *
 *  SAFEGUARD CAP: if NOVA 4 AND nutrition ≤ 35, the global is capped at 49
 *  ("bio never turns an ultra-processed, nutritionally poor product into a
 *  good one") and a transparency reason is emitted.
 *
 *  GRADES: A ≥ 80 · B ≥ 65 · C ≥ 45 · D ≥ 25 · E < 25.
 *  VERDICT: insufficient_data (low confidence) ▸ ultra_processed (NOVA 4 &
 *  global < 50) ▸ poor_fit_for_goal (goalFit < 35) ▸ grade-based.
 *  CONFIDENCE (Trust Halo) comes from the product's dataQuality and is
 *  surfaced with its missing-signal reasons — a low-confidence score is
 *  never presented as authoritative (verdict + UI + explanation).
 */
import type { Product } from "@/domains/product/model";
import type { LocalPreferences, UserGoal } from "@/domains/criteria/model";
import type {
  GreeScore, ScoreGrade, VerdictCode, ScoreReason, ProductWarning,
  ConfidenceLevel, SubScores, ScoreExplanation
} from "@/domains/scoring/types";
import { NUTRITION_THRESHOLDS as T, clamp, round } from "@/domains/scoring/thresholds";
import { halalStatusOf } from "@/domains/scoring/detectors";
import { computeDataQuality } from "@/domains/product/normalizer";

/* ─────────────────────────── tuning constants ──────────────────────────── */

const GRADE_BASE: Record<string, number> = { a: 95, b: 80, c: 60, d: 35, e: 15 };

const WEIGHTS = { nutrition: 40, processing: 25, additives: 15, naturality: 10, environment: 10, goalFit: 10 } as const;

const NOVA_SCORE: Record<1 | 2 | 3 | 4, number> = { 1: 100, 2: 78, 3: 45, 4: 12 };

/** Curated additive risk table (non-exhaustive, documented in /methodology). */
const ADDITIVE_RISK: Record<string, "avoid" | "controversial" | "watch"> = {
  e102: "avoid", e104: "avoid", e110: "avoid", e122: "avoid", e124: "avoid", e129: "avoid",
  e171: "avoid",
  e249: "avoid", e250: "avoid", e251: "avoid", e252: "avoid",
  e320: "avoid", e321: "avoid",
  e950: "controversial", e951: "controversial", e952: "controversial", e954: "controversial",
  e211: "controversial", e150d: "controversial", e407: "controversial", e621: "controversial",
  e220: "controversial", e221: "controversial", e222: "controversial", e223: "controversial",
  e224: "controversial", e228: "controversial",
  e338: "watch", e466: "watch", e433: "watch", e155: "watch", e160a: "watch"
};
export type AdditiveSeverity = "avoid" | "controversial" | "watch" | "neutral";

/** Shared, deterministic additive classification used by scoring and UI explanations. */
export function additiveSeverityOf(code: string): AdditiveSeverity {
  return ADDITIVE_RISK[code.toLowerCase().replace(/\s+/g, "")] ?? "neutral";
}
const ADDITIVE_PENALTY = { avoid: 16, controversial: 9, watch: 4, neutral: 1.5 } as const;

const BANDS: { min: number; grade: ScoreGrade }[] = [
  { min: 80, grade: "A" }, { min: 65, grade: "B" }, { min: 45, grade: "C" }, { min: 25, grade: "D" }, { min: 0, grade: "E" }
];

/* ───────────────────────── category context ────────────────────────────── */

export type CategoryProfile = "default" | "beverage" | "fat";

/** Only reliable signals switch the profile; anything else stays default. */
export function categoryProfileOf(p: Product): CategoryProfile {
  const hay = (p.categories ?? []).join("|").toLowerCase();
  if (/beverage|boisson|soda|juice|jus |nectar|drink|tea|thé|coffee/.test(hay)) return "beverage";
  if (/(^|\|)(oil|huile|butter|beurre|margarine)s?($|\s|\|)/.test(hay)) return "fat";
  return "default";
}

interface CategoryThresholds { sugarHigh: number; sugarLow: number; satFatHigh: number; satFatLow: number }
function thresholdsFor(profile: CategoryProfile): CategoryThresholds {
  // Drinks are judged far more strictly on sugar: 6.75g/100ml already flags
  // (a glass of "8g" soda is high), whereas 8g in a solid dessert is not.
  if (profile === "beverage") return { sugarHigh: 6.75, sugarLow: 2.5, satFatHigh: T.satFatHigh, satFatLow: T.satFatLow };
  if (profile === "fat") return { sugarHigh: T.sugarHigh, sugarLow: T.sugarLow, satFatHigh: T.satFatHigh * 2, satFatLow: T.satFatLow * 2 };
  return { sugarHigh: T.sugarHigh, sugarLow: T.sugarLow, satFatHigh: T.satFatHigh, satFatLow: T.satFatLow };
}

/* ─────────────────────────────── buckets ───────────────────────────────── */

interface Ctx {
  reasons: ScoreReason[];
  warnings: ProductWarning[];
  ct: CategoryThresholds;
}

/** NUTRITION — Nutri-Score authoritative; derived model otherwise. */
function scoreNutrition(p: Product, ctx: Ctx): number {
  const n = p.nutriments;
  let score: number;

  if (p.nutriScore && GRADE_BASE[p.nutriScore] !== undefined) {
    score = GRADE_BASE[p.nutriScore];
    ctx.reasons.push({
      kind: p.nutriScore <= "b" ? "bonus" : "malus",
      code: "nutriScore",
      impact: Math.abs(score - 60) / 4 + 4,
      values: { grade: p.nutriScore.toUpperCase() }
    });
    // Facts below only EXPLAIN the grade (impact = display rank, no deduction).
    if (n.sugars !== undefined && n.sugars > ctx.ct.sugarHigh) {
      // Display rank scales with severity so egregious sugar (e.g. 78g soda)
      // surfaces as a TOP reason next to NOVA — never re-deducts the score.
      ctx.reasons.push({ kind: "malus", code: "tooSugar", impact: 8 + Math.min(16, (n.sugars - ctx.ct.sugarHigh) / 3) });
      ctx.warnings.push({ level: "warning", code: "highSugar", values: { v: n.sugars } });
    }
    if (n.salt !== undefined && n.salt > T.saltHigh) {
      ctx.reasons.push({ kind: "malus", code: "tooSalty", impact: 6 });
      ctx.warnings.push({ level: "warning", code: "highSalt", values: { v: n.salt } });
    }
    if (n.saturatedFat !== undefined && n.saturatedFat > ctx.ct.satFatHigh) {
      ctx.warnings.push({ level: "info", code: "highSatFat" });
    }
  } else {
    // Derived model (no Nutri-Score): each adjustment is a real contribution.
    score = 70;
    const adjust = (delta: number, code: string, warn?: ProductWarning) => {
      score += delta;
      if (delta !== 0) ctx.reasons.push({ kind: delta > 0 ? "bonus" : "malus", code, impact: Math.abs(delta) / 2 });
      if (warn) ctx.warnings.push(warn);
    };
    if (n.sugars !== undefined && n.sugars > ctx.ct.sugarHigh) adjust(-24, "tooSugar", { level: "warning", code: "highSugar", values: { v: n.sugars } });
    else if (n.sugars !== undefined && n.sugars > ctx.ct.sugarLow) adjust(-8, "tooSugar");
    if (n.salt !== undefined && n.salt > T.saltHigh) adjust(-21, "tooSalty", { level: "warning", code: "highSalt", values: { v: n.salt } });
    else if (n.salt !== undefined && n.salt > T.saltLow) adjust(-6, "tooSalty");
    if (n.saturatedFat !== undefined && n.saturatedFat > ctx.ct.satFatHigh) adjust(-16, "tooFat", { level: "info", code: "highSatFat" });
  }

  // Positive nutrient facts (same in both paths; +nudges only in derived path).
  if (n.fiber !== undefined && n.fiber >= T.fiberHigh) {
    if (!p.nutriScore) score += 8;
    ctx.reasons.push({ kind: "bonus", code: "richFiber", impact: 4 });
  }
  if (n.proteins !== undefined && n.proteins >= T.proteinHigh) {
    if (!p.nutriScore) score += 6;
    ctx.reasons.push({ kind: "bonus", code: "richProtein", impact: 4 });
  }

  return clamp(score);
}

/** PROCESSING — NOVA only; unknown → bucket absent. */
function scoreProcessing(p: Product, ctx: Ctx): number | undefined {
  if (!p.novaGroup) return undefined;
  const score = NOVA_SCORE[p.novaGroup];
  if (p.novaGroup === 1) ctx.reasons.push({ kind: "bonus", code: "nova1", impact: 7 });
  if (p.novaGroup === 2) ctx.reasons.push({ kind: "bonus", code: "nova2", impact: 4 });
  if (p.novaGroup === 4) ctx.reasons.push({ kind: "malus", code: "nova4", impact: 22 });
  return score;
}

/** ADDITIVES — unknown ingredient list ⇒ bucket absent (unknown ≠ clean). */
function scoreAdditives(p: Product, ingredientsKnown: boolean, ctx: Ctx): number | undefined {
  const additives = p.additives ?? [];
  if (!ingredientsKnown && additives.length === 0) return undefined;

  let score = 100;
  let flagged = 0;
  let flaggedPenalty = 0;
  for (const raw of additives) {
    const sev = additiveSeverityOf(raw);
    if (sev !== "neutral") {
      score -= ADDITIVE_PENALTY[sev];
      flagged++;
      flaggedPenalty += ADDITIVE_PENALTY[sev];
      if (sev === "avoid") ctx.warnings.push({ level: "warning", code: "additiveAvoid", values: { code: raw.toUpperCase() } });
    } else {
      score -= ADDITIVE_PENALTY.neutral;
    }
  }
  if (flagged > 0) ctx.reasons.push({ kind: "malus", code: "additivesWatch", impact: Math.min(20, flaggedPenalty / 2 + 4), values: { n: flagged } });
  else if (additives.length === 0 && ingredientsKnown) ctx.reasons.push({ kind: "bonus", code: "noAdditive", impact: 5 });

  if (p.palmOilStatus === "present") {
    score -= 10;
    ctx.warnings.push({ level: "info", code: "palmOil" });
    ctx.reasons.push({ kind: "malus", code: "palmOilReason", impact: 6 });
  }
  return clamp(score);
}

/** NATURALITY — positive-claims bucket (organic capped by its 10% weight). */
function scoreNaturality(p: Product, ingredientsKnown: boolean, ctx: Ctx): number {
  let score = 30;
  if (p.isBio) {
    score += 40;
    ctx.reasons.push({ kind: "bonus", code: "bio", impact: 7 });
  }
  if (ingredientsKnown && (p.additives?.length ?? 0) === 0) score += 30; // clean label (reason already emitted)
  const labels = (p.labels ?? []).join("|").toLowerCase();
  if (labels.includes("fair") || labels.includes("équitable")) {
    score += 10;
    ctx.reasons.push({ kind: "bonus", code: "fairTrade", impact: 3 });
  }
  return clamp(score);
}

/** ENVIRONMENT — only when a valid Green-Score / Eco-Score exists. */
function scoreEnvironment(p: Product, ctx: Ctx): number | undefined {
  if (!p.greenScore || GRADE_BASE[p.greenScore] === undefined) return undefined;
  const score = GRADE_BASE[p.greenScore];
  if (p.greenScore <= "b") ctx.reasons.push({ kind: "bonus", code: "lowEcoImpact", impact: 4, values: { grade: p.greenScore.toUpperCase() } });
  if (p.greenScore >= "d") ctx.reasons.push({ kind: "malus", code: "highEcoImpact", impact: 4, values: { grade: p.greenScore.toUpperCase() } });
  return score;
}

/* ───────────────────────────── goal fit ────────────────────────────────── */

type CriterionCode =
  | "reduceSugar" | "reduceSalt" | "reduceAdditives" | "reduceUltraProcessed"
  | "increaseProtein" | "increaseFiber" | "preferBio" | "vegan" | "vegetarian"
  | "eatHealthier" | "loseWeight" | "buildMuscle" | "lowCalorie" | "betterDigestion";

interface CriterionFit { code: CriterionCode; fit: number }

/**
 * LOCAL CRITERIA FIT — averages the fit of every ACTIVE criterion.
 * Halal is deliberately NOT here: it is compatibility, never health quality.
 */
function goalFits(p: Product, prefs: LocalPreferences, nutrition: number, processing: number | undefined, additives: number | undefined, ct: CategoryThresholds): CriterionFit[] {
  const n = p.nutriments;
  const sugarFit = () => (n.sugars === undefined ? 50 : n.sugars <= ct.sugarLow ? 100 : n.sugars <= ct.sugarHigh ? 55 : 15);
  const saltFit = () => (n.salt === undefined ? 50 : n.salt <= T.saltLow ? 100 : n.salt <= T.saltHigh ? 55 : 15);
  const proteinFit = () => (n.proteins === undefined ? 50 : n.proteins >= 20 ? 100 : n.proteins >= T.proteinHigh ? 82 : n.proteins >= T.proteinOk ? 62 : 35);
  const fiberFit = () => (n.fiber === undefined ? 50 : n.fiber >= T.fiberHigh ? 100 : n.fiber >= T.fiberOk ? 70 : 35);
  const calorieFit = () => (n.energyKcal === undefined ? 50 : n.energyKcal <= T.kcalLow ? 100 : n.energyKcal <= T.kcalMid ? 70 : n.energyKcal <= T.kcalHigh ? 45 : 20);
  const novaFit = () => (p.novaGroup ? [0, 100, 80, 45, 10][p.novaGroup] : 50);
  const additivesFit = () => additives ?? 50;

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
  add(goals.has("eat_healthier"), "eatHealthier", () => nutrition);
  add(goals.has("lose_weight"), "loseWeight", () => Math.round(calorieFit() * 0.5 + sugarFit() * 0.3 + (processing ?? 50) * 0.2));
  add(goals.has("build_muscle"), "buildMuscle", () => Math.round(proteinFit() * 0.8 + sugarFit() * 0.2));
  add(goals.has("low_calorie"), "lowCalorie", calorieFit);
  add(goals.has("better_digestion"), "betterDigestion", () => Math.round(fiberFit() * 0.6 + additivesFit() * 0.4));
  return fits;
}

/* ─────────────────────── compatibility channel ─────────────────────────── */

/** Never touches the score. Only alerts/information. */
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
    // "confirmed" adds no health bonus — compatibility only, by design.
  }
}

/* ──────────────────────────── main entry point ─────────────────────────── */

function gradeFor(score: number): ScoreGrade {
  return (BANDS.find((b) => score >= b.min) ?? BANDS[BANDS.length - 1]).grade;
}

export function computeGreeScore(product: Product, preferences: LocalPreferences): GreeScore {
  const p = product.dataQuality ? product : { ...product, dataQuality: computeDataQuality(product) };
  const quality = p.dataQuality!;
  const ingredientsKnown = quality.availability.ingredients;

  const ct = thresholdsFor(categoryProfileOf(p));
  const ctx: Ctx = { reasons: [], warnings: [], ct };

  // Buckets (absent = undefined → excluded from the weighted mean).
  const nutrition = scoreNutrition(p, ctx);
  const processing = scoreProcessing(p, ctx);
  const additives = scoreAdditives(p, ingredientsKnown, ctx);
  const naturality = scoreNaturality(p, ingredientsKnown, ctx);
  const environment = scoreEnvironment(p, ctx);

  const fits = goalFits(p, preferences, nutrition, processing, additives, ct);
  const goalFit = fits.length ? round(fits.reduce((s, f) => s + f.fit, 0) / fits.length) : undefined;
  for (const f of fits) {
    if (f.fit <= 35) ctx.reasons.push({ kind: "malus", code: "criterionMismatch", impact: 6, values: { criterion: f.code } });
    if (f.fit >= 85) ctx.reasons.push({ kind: "bonus", code: "criterionMatch", impact: 4, values: { criterion: f.code } });
  }

  // Compatibility channel — alerts only, zero score impact.
  compatibilityAlerts(p, preferences, ctx.warnings);

  // Weighted mean over available buckets.
  const parts: [number | undefined, number][] = [
    [nutrition, WEIGHTS.nutrition],
    [processing, WEIGHTS.processing],
    [additives, WEIGHTS.additives],
    [naturality, WEIGHTS.naturality],
    [environment, WEIGHTS.environment],
    [goalFit, WEIGHTS.goalFit]
  ];
  const totalW = parts.reduce((s, [v, w]) => (v !== undefined ? s + w : s), 0);
  const weighted = parts.reduce((s, [v, w]) => (v !== undefined ? s + v * w : s), 0);
  let global = clamp(round(weighted / Math.max(1, totalW)));

  // SAFEGUARD: organic can never hide poor nutrition + heavy processing.
  // Whenever a NOVA-4, nutritionally-poor product is also organic, we (a) cap
  // the global at 49 if anything pushed it above, and (b) always surface a
  // transparency reason that the organic bonus was prevented from rescuing it —
  // even if other buckets already kept the score low on their own.
  if (p.novaGroup === 4 && nutrition <= 35) {
    if (global > 49) global = 49;
    if (p.isBio) ctx.reasons.push({ kind: "info", code: "bioCapped", impact: 3 });
  }

  const grade = gradeFor(global);
  const confidence: ConfidenceLevel = quality.confidence;
  if (confidence !== "high") ctx.warnings.push({ level: "info", code: "partialData" });

  // Verdict (a low-confidence score must never look authoritative).
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

  // Ranked top reasons (deduplicated by code, highest impact first).
  const ranked = (kind: "bonus" | "malus") => {
    const seen = new Set<string>();
    return ctx.reasons
      .filter((r) => r.kind === kind)
      .sort((a, b) => b.impact - a.impact)
      .filter((r) => (seen.has(r.code) ? false : (seen.add(r.code), true)))
      .slice(0, 3);
  };

  const subScores: SubScores = { nutrition, processing, additives, naturality, environment, goalFit };
  const warnings = ctx.warnings;

  return {
    global,
    grade,
    verdict,
    subScores,
    confidence,
    confidenceReasons: quality.confidenceReasons,
    topPositives: ranked("bonus"),
    topNegatives: ranked("malus"),
    reasons: ctx.reasons,
    warnings,
    alerts: warnings.filter((w) => w.level === "critical")
  };
}

/* ───────────────────────── plain-language summary ──────────────────────── */

/**
 * Returns 1–2 sentence codes (resolved via "score.explain.*") that always
 * match the numeric result — e.g. "highSugarUltraProcessed",
 * "organicMinimal", "goodButIncomplete", "notIdealForCriterion".
 */
export function explainScore(gree: GreeScore): ScoreExplanation[] {
  const out: ScoreExplanation[] = [];
  const has = (code: string) => gree.topNegatives.some((r) => r.code === code) || gree.reasons.some((r) => r.code === code && r.kind === "malus");

  if (gree.verdict === "insufficient_data") {
    // Low confidence ⇒ neither nutrition facts nor Nutri-Score were available,
    // so the derived nutrition default is NOT a real signal — never claim the
    // profile is "good". Uncertainty is communicated honestly instead.
    out.push({ code: "insufficientData" });
    return out;
  }
  if (gree.verdict === "ultra_processed") {
    out.push({ code: has("tooSugar") ? "highSugarUltraProcessed" : "ultraProcessed" });
  } else if (gree.verdict === "poor_fit_for_goal") {
    const mismatch = gree.reasons.find((r) => r.code === "criterionMismatch");
    out.push({ code: "notIdealForCriterion", values: mismatch?.values });
  } else if (gree.reasons.some((r) => r.code === "bio") && (gree.subScores.processing ?? 0) >= 78) {
    out.push({ code: "organicMinimal" });
  } else if (gree.grade === "A" || gree.grade === "B") {
    out.push({ code: gree.confidence === "high" ? "solidChoice" : "goodButIncomplete" });
  } else {
    out.push({ code: "mixedProfile" });
  }

  // Secondary sentence: strongest remaining negative, if any and not already told.
  const top = gree.topNegatives[0];
  if (out[0].code !== "highSugarUltraProcessed" && top?.code === "tooSugar") out.push({ code: "watchSugar" });
  else if (top?.code === "nova4" && out[0].code === "notIdealForCriterion") out.push({ code: "ultraProcessed" });
  return out.slice(0, 2);
}
