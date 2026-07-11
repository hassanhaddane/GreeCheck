/**
 * ════════════════════════════════════════════════════════════════════════
 *  GreeScore — local, deterministic, transparent nutrition scoring engine.
 * ════════════════════════════════════════════════════════════════════════
 *
 *  Design principles
 *  -----------------
 *  • PURE: `computeGreeScore(product, preferences)` has no side effects and
 *    reads no globals — same inputs always yield the same output.
 *  • PRIVACY-FIRST: nothing is stored or sent anywhere. Preferences are passed
 *    in by the caller (they live only on the user's device).
 *  • SELF-CONTAINED: depends only on TYPES (erased at runtime), so it is trivial
 *    to unit-test in isolation.
 *  • TRANSPARENT: every meaningful contribution is surfaced as a `reason` or
 *    `warning`, so the UI can explain *why* a product got its score.
 *
 *  Global weighting (renormalized over the buckets that are actually available)
 *  ---------------------------------------------------------------------------
 *    35%  nutrition          (Nutri-Score / sugar / salt / sat. fat / fiber / protein / kcal)
 *    20%  processing         (NOVA group)
 *    15%  additives & risks  (additives severity, palm oil, sensitive ingredients)
 *    10%  positive labels    (bio, fair-trade, clean label, no palm oil, …)
 *    10%  user goal fit      (only counted when the user set goals)
 *    10%  environment        (Green-Score / Eco-Score — only when available)
 */

import type { Product } from "@/domains/product/model";
import type { LocalPreferences, UserGoal } from "@/domains/criteria/model";
import type {
  GreeScore,
  ScoreGrade,
  ScoreLabel,
  ScoreReason,
  ProductWarning,
  ConfidenceLevel
} from "@/domains/scoring/types";
import { NUTRITION_THRESHOLDS as T, clamp, round } from "@/domains/scoring/thresholds";
import { detectHaram, halalStatusOf, hasPalmOil } from "@/domains/scoring/detectors";

/* ─────────────────────────── tuning constants ──────────────────────────── */

/** Nutri-Score grade → nutrition base score (0–100). */
const NUTRI_BASE: Record<string, number> = { a: 92, b: 78, c: 60, d: 38, e: 18 };

/** Bucket weights — see header. `goal` and `ecology` are conditionally applied. */
const WEIGHTS = {
  health: 0.35,
  processing: 0.20,
  additives: 0.15,
  labels: 0.10,
  goal: 0.10,
  ecology: 0.10
} as const;

/**
 * Curated additive risk table (non-exhaustive, documented).
 * Severity: "avoid" (controversial/banned) > "controversial" > "watch" > neutral.
 * E-numbers are matched after normalization (lowercase, no spaces).
 */
const ADDITIVE_RISK: Record<string, "avoid" | "controversial" | "watch"> = {
  // Azo / synthetic colours linked to hyperactivity (EU warning label)
  e102: "avoid", e104: "avoid", e110: "avoid", e122: "avoid", e124: "avoid", e129: "avoid",
  // Titanium dioxide — banned as a food additive in the EU (2022)
  e171: "avoid",
  // Nitrites / nitrates (cured meats)
  e249: "avoid", e250: "avoid", e251: "avoid", e252: "avoid",
  // BHA / BHT antioxidants
  e320: "avoid", e321: "avoid",
  // Sweeteners frequently debated
  e950: "controversial", e951: "controversial", e952: "controversial", e954: "controversial",
  // Preservatives / others under scrutiny
  e211: "controversial", e150d: "controversial", e407: "controversial", e621: "controversial",
  e220: "controversial", e221: "controversial", e222: "controversial", e223: "controversial",
  e224: "controversial", e228: "controversial",
  // Lower-concern but worth a flag
  e338: "watch", e466: "watch", e433: "watch", e155: "watch", e160a: "watch"
};

const ADDITIVE_PENALTY = { avoid: 16, controversial: 9, watch: 4, neutral: 1.5 } as const;

/** Grade bands (also yields the textual label). */
const BANDS: { min: number; grade: ScoreGrade; label: ScoreLabel }[] = [
  { min: 80, grade: "A", label: "Excellent" },
  { min: 65, grade: "B", label: "Bon choix" },
  { min: 45, grade: "C", label: "Moyen" },
  { min: 25, grade: "D", label: "À limiter" },
  { min: 0, grade: "E", label: "À éviter" }
];

/* ──────────────────────────── small helpers ────────────────────────────── */

function gradeFor(score: number): { grade: ScoreGrade; label: ScoreLabel } {
  const band = BANDS.find((b) => score >= b.min) ?? BANDS[BANDS.length - 1];
  return { grade: band.grade, label: band.label };
}

function normalizeAdditive(a: string): string {
  return a.toLowerCase().replace(/\s+/g, "");
}

/* ───────────────────────────── sub-scorers ─────────────────────────────── */
/* Each returns a 0–100 score and pushes any explanations into the shared
   `reasons` / `warnings` arrays for full transparency.                      */

/** 1) NUTRITION (35%). Nutri-Score is authoritative when present; otherwise we
 *  derive a comparable score from raw nutriments. Small nutriment nudges apply
 *  in both cases so fiber/protein-rich or very sugary items move accordingly. */
export function scoreNutrition(p: Product, reasons: ScoreReason[], warnings: ProductWarning[]): number {
  const n = p.nutriments;
  let score: number;

  if (p.nutriScore && NUTRI_BASE[p.nutriScore]) {
    score = NUTRI_BASE[p.nutriScore];
    reasons.push({ kind: p.nutriScore <= "b" ? "bonus" : "malus", code: "nutriScore", values: { grade: p.nutriScore.toUpperCase() } });
  } else {
    // Fallback model when Nutri-Score is missing.
    score = 70;
    if (n.sugars !== undefined) score -= n.sugars > T.sugarHigh ? 20 : n.sugars > T.sugarLow ? 8 : 0;
    if (n.salt !== undefined) score -= n.salt > T.saltHigh ? 18 : n.salt > T.saltLow ? 6 : 0;
    if (n.saturatedFat !== undefined) score -= n.saturatedFat > T.satFatHigh ? 16 : n.saturatedFat > T.satFatLow ? 5 : 0;
    if (n.fiber !== undefined) score += n.fiber >= T.fiberHigh ? 10 : n.fiber >= T.fiberOk ? 4 : 0;
    if (n.proteins !== undefined) score += n.proteins >= T.proteinHigh ? 8 : n.proteins >= T.proteinOk ? 3 : 0;
  }

  // Nutriment nudges + warnings (apply regardless of Nutri-Score availability).
  if (n.sugars !== undefined && n.sugars > T.sugarHigh) {
    score -= 4;
    warnings.push({ level: "warning", code: "highSugar", values: { v: n.sugars! } });
    reasons.push({ kind: "malus", code: "tooSugar" });
  }
  if (n.salt !== undefined && n.salt > T.saltHigh) {
    score -= 3;
    warnings.push({ level: "warning", code: "highSalt", values: { v: n.salt! } });
  }
  if (n.saturatedFat !== undefined && n.saturatedFat > T.satFatHigh) {
    score -= 3;
    warnings.push({ level: "info", code: "highSatFat" });
  }
  if (n.fiber !== undefined && n.fiber >= T.fiberHigh) reasons.push({ kind: "bonus", code: "richFiber" });
  if (n.proteins !== undefined && n.proteins >= T.proteinHigh) reasons.push({ kind: "bonus", code: "richProtein" });

  return clamp(score);
}

/** 2) PROCESSING (20%). NOVA group is the signal. */
export function scoreProcessing(p: Product, reasons: ScoreReason[]): number {
  switch (p.novaGroup) {
    case 1: reasons.push({ kind: "bonus", code: "nova1" }); return 100;
    case 2: reasons.push({ kind: "bonus", code: "nova2" }); return 80;
    case 3: return 50;
    case 4: reasons.push({ kind: "malus", code: "nova4" }); return 18;
    default: return 55; // unknown → neutral
  }
}

/** 3) ADDITIVES & SENSITIVE INGREDIENTS (15%). Starts at 100 and subtracts by
 *  severity, plus palm oil and (user-relevant) allergen penalties. */
export function scoreAdditives(
  p: Product,
  prefs: LocalPreferences,
  reasons: ScoreReason[],
  warnings: ProductWarning[]
): number {
  let score = 100;
  let flagged = 0;

  for (const raw of p.additives ?? []) {
    const sev = ADDITIVE_RISK[normalizeAdditive(raw)];
    if (sev) {
      score -= ADDITIVE_PENALTY[sev];
      flagged++;
      if (sev === "avoid") warnings.push({ level: "warning", code: "additiveAvoid", values: { code: raw.toUpperCase() } });
    } else {
      score -= ADDITIVE_PENALTY.neutral;
    }
  }
  if (flagged > 0) reasons.push({ kind: "malus", code: "additivesWatch", values: { n: flagged } });
  else if ((p.additives?.length ?? 0) === 0) reasons.push({ kind: "bonus", code: "noAdditive" });

  // Palm oil
  if (hasPalmOil(p)) {
    score -= 10;
    warnings.push({ level: "info", code: "palmOil" });
    reasons.push({ kind: "malus", code: "palmOilReason" });
  }

  // Allergens the user explicitly avoids → hard warning + penalty.
  const userAllergens = prefs.avoidAllergens.map((a) => a.toLowerCase());
  const hit = (p.allergens ?? []).find((a) => userAllergens.some((u) => a.toLowerCase().includes(u)));
  if (hit) {
    score -= 15;
    warnings.push({ level: "critical", code: "allergenPresent", values: { name: hit } });
  }

  return clamp(score);
}

/** 4) POSITIVE LABELS (10%). Bonus-only above a neutral baseline. */
export function scoreLabels(p: Product, prefs: LocalPreferences, reasons: ScoreReason[]): number {
  let score = 50;
  const labels = (p.labels ?? []).join("|").toLowerCase();

  if (p.isBio) { score += 22; reasons.push({ kind: "bonus", code: "bio" }); }
  if (labels.includes("fair") || labels.includes("équitable")) { score += 10; reasons.push({ kind: "bonus", code: "fairTrade" }); }
  if (!hasPalmOil(p) && (labels.includes("palm") || (p.additives?.length ?? 0) === 0)) score += 8;
  if ((p.additives?.length ?? 0) === 0) score += 8; // clean label
  if (prefs.preferHalal && p.isHalal) { score += 8; reasons.push({ kind: "bonus", code: "halalOk" }); }
  if (prefs.preferVegan && p.isVegan) { score += 6; reasons.push({ kind: "bonus", code: "vegan" }); }
  if (prefs.preferVegetarian && p.isVegetarian) score += 4;

  return clamp(score);
}

/** 5) USER GOAL FIT (10%). Averages per-goal compatibility. */
export function scoreGoals(
  p: Product,
  prefs: LocalPreferences,
  health: number,
  processing: number,
  additives: number,
  reasons: ScoreReason[],
  warnings: ProductWarning[]
): number {
  if (!prefs.goals.length) return 50; // neutral; excluded from weighting by caller
  const n = p.nutriments;

  const proteinFit = () =>
    n.proteins === undefined ? 45 : n.proteins >= 20 ? 100 : n.proteins >= T.proteinHigh ? 82 : n.proteins >= T.proteinOk ? 62 : 35;
  const fiberFit = () =>
    n.fiber === undefined ? 45 : n.fiber >= T.fiberHigh ? 100 : n.fiber >= T.fiberOk ? 70 : 35;
  const sugarFit = () =>
    n.sugars === undefined ? 50 : n.sugars <= T.sugarLow ? 100 : n.sugars <= T.sugarHigh ? 55 : 15;
  const saltFit = () =>
    n.salt === undefined ? 50 : n.salt <= T.saltLow ? 100 : n.salt <= T.saltHigh ? 55 : 15;
  const calorieFit = () =>
    n.energyKcal === undefined ? 50 : n.energyKcal <= T.kcalLow ? 100 : n.energyKcal <= T.kcalMid ? 70 : n.energyKcal <= T.kcalHigh ? 45 : 20;
  const novaFit = () => (p.novaGroup ? [0, 100, 80, 45, 10][p.novaGroup] : 55);

  const perGoal: Record<UserGoal, () => number> = {
    eat_healthier: () => health,
    go_organic: () => (p.isBio ? 100 : 30),
    reduce_sugar: sugarFit,
    reduce_salt: saltFit,
    reduce_additives: () => additives,
    avoid_ultraprocessed: novaFit,
    build_muscle: () => Math.round(proteinFit() * 0.8 + (sugarFit() * 0.2)),
    lose_weight: () => Math.round(calorieFit() * 0.5 + sugarFit() * 0.3 + processing * 0.2),
    halal: () => {
      const st = halalStatusOf(p);
      // Compatibility only: not_confirmed/unknown are NEUTRAL (never "not halal").
      return st === "confirmed" ? 100 : st === "incompatible" ? 0 : st === "check_required" ? 40 : 50;
    },
    vegan: () => (p.isVegan ? 100 : 20),
    vegetarian: () => (p.isVegetarian ? 100 : 25),
    high_protein: proteinFit,
    high_fiber: fiberFit,
    low_calorie: calorieFit,
    better_digestion: () => Math.round(fiberFit() * 0.6 + additives * 0.4)
  };

  let sum = 0;
  let count = 0;
  for (const g of prefs.goals) {
    const fn = perGoal[g];
    if (!fn) continue;
    const v = clamp(fn());
    sum += v;
    count++;

    // A couple of high-signal, personalized explanations.
    if (g === "build_muscle" && (n.proteins ?? 0) >= T.proteinHigh)
      reasons.push({ kind: "bonus", code: "muscleProtein" });
    if (g === "reduce_sugar" && (n.sugars ?? 0) > T.sugarHigh)
      reasons.push({ kind: "malus", code: "reduceSugarGoal" });
    if (g === "halal") {
      const st = halalStatusOf(p);
      if (st === "incompatible") warnings.push({ level: "critical", code: "haramIngredient" });
      else if (st === "check_required") warnings.push({ level: "warning", code: "halalCheckRequired" });
    }
  }
  return count ? round(sum / count) : 50;
}

/** 6) ENVIRONMENT (10%, optional). Green-Score / Eco-Score grade → score. */
export function scoreEcology(p: Product, reasons: ScoreReason[]): number | undefined {
  if (!p.greenScore || !NUTRI_BASE[p.greenScore]) return undefined;
  const score = NUTRI_BASE[p.greenScore];
  if (p.greenScore <= "b") reasons.push({ kind: "bonus", code: "lowEcoImpact", values: { grade: p.greenScore.toUpperCase() } });
  return score;
}

/* ─────────────────────────── confidence model ──────────────────────────── */

export function computeConfidence(p: Product): ConfidenceLevel {
  const n = p.nutriments;
  const hasNutrition = [n.energyKcal, n.sugars, n.salt, n.saturatedFat, n.proteins].some((v) => v !== undefined);
  const hasIngredients = Boolean(p.ingredientsText && p.ingredientsText.length > 2);
  const hasNutriScore = Boolean(p.nutriScore);

  if (hasNutriScore && hasNutrition && hasIngredients) return "high";
  if (hasNutrition || hasNutriScore) return "medium";
  return "low";
}

/* ──────────────────────────── main entry point ─────────────────────────── */

/**
 * Compute the full GreeScore for a product given the user's local preferences.
 * Deterministic and side-effect-free.
 */
export function computeGreeScore(product: Product, preferences: LocalPreferences): GreeScore {
  const reasons: ScoreReason[] = [];
  const warnings: ProductWarning[] = [];

  // Sub-scores (each 0–100).
  const healthScore = scoreNutrition(product, reasons, warnings);
  const processingScore = scoreProcessing(product, reasons);
  const additivesScore = scoreAdditives(product, preferences, reasons, warnings);
  const labelScore = scoreLabels(product, preferences, reasons);
  const goalScore = scoreGoals(product, preferences, healthScore, processingScore, additivesScore, reasons, warnings);
  const ecologyScore = scoreEcology(product, reasons);

  // naturalityScore is a derived DISPLAY metric (not a weighting bucket):
  // how "natural/clean" the product feels = processing + additives + organic.
  const naturalityScore = clamp(
    round(processingScore * 0.4 + additivesScore * 0.4 + (product.isBio ? 100 : 50) * 0.2)
  );

  // Weighted global, renormalized over available buckets.
  const buckets: { score: number; weight: number; available: boolean }[] = [
    { score: healthScore, weight: WEIGHTS.health, available: true },
    { score: processingScore, weight: WEIGHTS.processing, available: true },
    { score: additivesScore, weight: WEIGHTS.additives, available: true },
    { score: labelScore, weight: WEIGHTS.labels, available: true },
    { score: goalScore, weight: WEIGHTS.goal, available: preferences.goals.length > 0 },
    { score: ecologyScore ?? 0, weight: WEIGHTS.ecology, available: ecologyScore !== undefined }
  ];

  const totalWeight = buckets.reduce((s, b) => (b.available ? s + b.weight : s), 0);
  const weighted = buckets.reduce((s, b) => (b.available ? s + b.score * b.weight : s), 0);
  const global = clamp(round(weighted / totalWeight));

  const { grade, label } = gradeFor(global);
  const confidenceLevel = computeConfidence(product);
  if (confidenceLevel !== "high") {
    warnings.push({ level: "info", code: "partialData" });
  }

  // Keep the most relevant explanations first (bonuses & maluses before info),
  // deterministic ordering preserved within each kind.
  reasons.sort((a, b) => rank(a.kind) - rank(b.kind));

  return {
    global,
    grade,
    label,
    healthScore,
    naturalityScore,
    processingScore,
    additivesScore,
    goalScore,
    ecologyScore,
    reasons,
    warnings,
    confidenceLevel
  };
}

function rank(kind: ScoreReason["kind"]): number {
  return kind === "malus" ? 0 : kind === "bonus" ? 1 : 2;
}
