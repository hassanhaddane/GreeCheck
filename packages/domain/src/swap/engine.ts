"use client";
/**
 * ════════════════════════════════════════════════════════════════════════
 *  GreeSwap — trustworthy product-replacement engine.
 *  NOT a "same category sorted by score" list: every suggestion is VALIDATED
 *  against the current product and must carry a real, measurable improvement.
 * ════════════════════════════════════════════════════════════════════════
 *
 *  Pipeline:
 *    1. ELIGIBILITY   — only offer swaps when the product is poor (score < 50,
 *                       grade D/E) or a critical local criterion is violated.
 *    2. RETRIEVAL     — candidates from the MOST PRECISE category (one fetch).
 *    3. VALIDATION    — an alternative must: score meaningfully higher, have
 *                       acceptable confidence + image + nutrition, improve at
 *                       least one real weakness, introduce no critical new
 *                       weakness, and not conflict with a critical criterion.
 *                       Candidates that only look better because data is
 *                       MISSING are rejected (a higher aggregate alone never
 *                       qualifies — a measurable weakness fix is required).
 *    4. EXPLANATION   — measurable diffs (sugar %, salt, sat-fat, protein,
 *                       fiber, additives, NOVA, organic, score points).
 *    5. RANKING       — score gain + active-criteria alignment + confidence.
 */
import type { Product } from "../product/model";
import type { LocalPreferences } from "../criteria/model";
import type { GreeScore } from "../scoring/types";
import { computeGreeScore } from "../scoring/gree-score";
import { NUTRITION_THRESHOLDS as T } from "../scoring/thresholds";
import { hasAllergenConflict, halalStatusOf } from "../scoring/detectors";
import { computeDataQuality } from "../product/normalizer";

/* ─────────────────────────────── types ─────────────────────────────────── */

export type ImprovementCode =
  | "lowerNova" | "noFlaggedAdditives" | "fewerAdditives" | "lessSugar"
  | "lessSalt" | "lessSatFat" | "organic" | "moreProtein" | "moreFiber"
  | "betterScore";

export interface SwapImprovement {
  code: ImprovementCode;
  /** % reduction (sugar/salt/sat-fat). */
  percent?: number;
  /** absolute grams gained (protein/fiber). */
  grams?: number;
  /** GreeScore points gained. */
  points?: number;
  /** count of additives removed. */
  count?: number;
  from?: number;
  to?: number;
  /** True when this improvement addresses a REAL weakness of the current product. */
  weakness: boolean;
}

export interface ProductAlternative {
  product: Product;
  gree: GreeScore;
  /** Ordered, strongest first. */
  improvements: SwapImprovement[];
  /** Headline improvement (never a bare "betterScore" when a real fix exists). */
  strongest: SwapImprovement;
  scoreGain: number;
}

export type Alternative = ProductAlternative;

export type SwapTrigger = "lowScore" | "lowGrade" | "incompatible" | null;
export interface SwapEligibility {
  eligible: boolean;
  trigger: SwapTrigger;
}

/* ─────────────────────────────── tuning ────────────────────────────────── */

/** An alternative must beat the current product by at least this many points. */
export const MIN_SCORE_GAIN = 8;
export const MAX_RESULTS = 6;

const SIGNIFICANCE: Record<ImprovementCode, number> = {
  lowerNova: 5, noFlaggedAdditives: 4.5, lessSugar: 4, organic: 4,
  lessSalt: 3.5, lessSatFat: 3.5, fewerAdditives: 3, moreProtein: 2.5,
  moreFiber: 2.5, betterScore: 1
};

/* ──────────────────────────── compatibility ────────────────────────────── */

/** A critical, personal incompatibility (allergen / halal / vegan / vegetarian). */
export function hasCriticalConflict(p: Product, prefs: LocalPreferences): boolean {
  if (hasAllergenConflict(p, prefs.avoidAllergens)) return true;
  if ((prefs.preferHalal || prefs.goals.includes("halal")) && halalStatusOf(p) === "incompatible") return true;
  if ((prefs.preferVegan || prefs.goals.includes("vegan")) && p.veganStatus === "incompatible") return true;
  if ((prefs.preferVegetarian || prefs.goals.includes("vegetarian")) && p.vegetarianStatus === "incompatible") return true;
  return false;
}

/* ──────────────────────────── eligibility ──────────────────────────────── */

export function isSwapEligible(product: Product, gree: GreeScore, prefs: LocalPreferences): SwapEligibility {
  if (gree.global < 50) return { eligible: true, trigger: "lowScore" };
  if (gree.grade === "D" || gree.grade === "E") return { eligible: true, trigger: "lowGrade" };
  if (hasCriticalConflict(product, prefs)) return { eligible: true, trigger: "incompatible" };
  return { eligible: false, trigger: null };
}

/* ───────────────────────── data sufficiency ────────────────────────────── */

/** Acceptable confidence + a usable image + real nutrition data. */
export function hasSufficientData(p: Product): boolean {
  const q = p.dataQuality ?? computeDataQuality(p);
  return q.confidence !== "low" && q.availability.nutrition && Boolean(p.imageUrl);
}

/* ──────────────────────────── category match ───────────────────────────── */

const lc = (s: string) => s.trim().toLowerCase();

/** Same precise product family — never mix unrelated products from a broad parent. */
export function relatedCategory(current: Product, alt: Product): boolean {
  const cur = (current.categories ?? []).slice(-2).map(lc).filter(Boolean);
  if (!cur.length) return true; // retrieval already scoped; cannot assert further
  const altCats = (alt.categories ?? []).map(lc);
  return cur.some((c) => altCats.includes(c));
}

/* ─────────────────────────── new-weakness guard ────────────────────────── */

/** Reject alternatives that fix one thing but break another that was fine. */
export function introducesCriticalWeakness(current: Product, alt: Product): boolean {
  const cn = current.nutriments, an = alt.nutriments;
  const regressed = (c?: number, a?: number, hi?: number) =>
    c !== undefined && a !== undefined && hi !== undefined && c <= hi && a > hi;
  if (regressed(cn.sugars, an.sugars, T.sugarHigh)) return true;
  if (regressed(cn.salt, an.salt, T.saltHigh)) return true;
  if (regressed(cn.saturatedFat, an.saturatedFat, T.satFatHigh)) return true;
  if ((current.novaGroup ?? 0) < 4 && alt.novaGroup === 4) return true;
  return false;
}

/* ───────────────────────── measurable diffs ────────────────────────────── */

export function computeImprovements(
  current: Product,
  alt: Product,
  curGree: GreeScore,
  altGree: GreeScore,
  prefs: LocalPreferences
): SwapImprovement[] {
  const cn = current.nutriments, an = alt.nutriments;
  const out: SwapImprovement[] = [];

  // NOVA — a fix for ultra-processing.
  if (current.novaGroup && alt.novaGroup && alt.novaGroup < current.novaGroup) {
    out.push({ code: "lowerNova", from: current.novaGroup, to: alt.novaGroup, weakness: current.novaGroup === 4 });
  }

  // Additives (only when both lists are known).
  if (current.additives && alt.additives && alt.additives.length < current.additives.length) {
    const removed = current.additives.length - alt.additives.length;
    if (alt.additives.length === 0) out.push({ code: "noFlaggedAdditives", weakness: current.additives.length >= 3 });
    else out.push({ code: "fewerAdditives", count: removed, weakness: current.additives.length >= 3 });
  }

  // Sugar / salt / sat-fat — % reductions (weakness = current above the high band).
  const reduction = (c?: number, a?: number, hi?: number): { percent: number; weakness: boolean } | null => {
    if (c === undefined || a === undefined || c <= 0 || a >= c) return null;
    const percent = Math.round((1 - a / c) * 100);
    return percent >= 1 ? { percent, weakness: hi !== undefined && c > hi } : null;
  };
  const rs = reduction(cn.sugars, an.sugars, T.sugarHigh);
  if (rs) out.push({ code: "lessSugar", percent: rs.percent, from: cn.sugars, to: an.sugars, weakness: rs.weakness });
  const rl = reduction(cn.salt, an.salt, T.saltHigh);
  if (rl) out.push({ code: "lessSalt", percent: rl.percent, from: cn.salt, to: an.salt, weakness: rl.weakness });
  const rf = reduction(cn.saturatedFat, an.saturatedFat, T.satFatHigh);
  if (rf) out.push({ code: "lessSatFat", percent: rf.percent, from: cn.saturatedFat, to: an.saturatedFat, weakness: rf.weakness });

  // Organic — a real improvement when the user prefers bio.
  if (alt.isBio && !current.isBio) {
    out.push({ code: "organic", weakness: prefs.preferBio || prefs.goals.includes("go_organic") });
  }

  // Protein / fiber — absolute grams gained (weakness only when a matching goal is active and current is low).
  const gain = (c?: number, a?: number) => (c !== undefined && a !== undefined && a > c + 0.5 ? Math.round((a - c) * 10) / 10 : null);
  const gp = gain(cn.proteins, an.proteins);
  if (gp) out.push({ code: "moreProtein", grams: gp, weakness: (prefs.increaseProtein || prefs.goals.includes("high_protein")) && (cn.proteins ?? 0) < T.proteinHigh });
  const gf = gain(cn.fiber, an.fiber);
  if (gf) out.push({ code: "moreFiber", grams: gf, weakness: (prefs.increaseFiber || prefs.goals.includes("high_fiber")) && (cn.fiber ?? 0) < T.fiberHigh });

  // Score points — informational; never counts as a weakness fix.
  const points = altGree.global - curGree.global;
  if (points > 0) out.push({ code: "betterScore", points, weakness: false });

  return out.sort((a, b) => rank(b) - rank(a));
}

function rank(i: SwapImprovement): number {
  return SIGNIFICANCE[i.code] + (i.weakness ? 10 : 0);
}

/* ──────────────────────────── validation ───────────────────────────────── */

/** Validate one candidate; returns the enriched alternative or null if rejected. */
export function validateCandidate(
  current: Product,
  curGree: GreeScore,
  alt: Product,
  altGree: GreeScore,
  prefs: LocalPreferences
): ProductAlternative | null {
  if (!alt.barcode || alt.barcode === current.barcode) return null;
  if (!relatedCategory(current, alt)) return null;      // unrelated category
  if (!hasSufficientData(alt)) return null;             // insufficient data / no image
  if (altGree.global < curGree.global + MIN_SCORE_GAIN) return null; // not meaningfully higher / lower
  if (hasCriticalConflict(alt, prefs)) return null;     // conflicts with a critical criterion
  if (introducesCriticalWeakness(current, alt)) return null; // trades one problem for another

  const improvements = computeImprovements(current, alt, curGree, altGree, prefs);
  // Require a REAL, measurable weakness fix — a higher score alone (often caused
  // by MISSING data) never qualifies an alternative.
  if (!improvements.some((i) => i.weakness)) return null;

  const strongest = improvements.find((i) => i.weakness) ?? improvements[0];
  return { product: alt, gree: altGree, improvements, strongest, scoreGain: altGree.global - curGree.global };
}

/* ───────────────────────────── ranking ─────────────────────────────────── */

function sortKey(alt: ProductAlternative, prefs: LocalPreferences): number {
  const q = alt.product.dataQuality ?? computeDataQuality(alt.product);
  const confidenceBonus = q.confidence === "high" ? 4 : q.confidence === "medium" ? 2 : 0;
  const bio = (prefs.preferBio || prefs.goals.includes("go_organic")) && alt.product.isBio ? 6 : 0;
  const halal = (prefs.preferHalal || prefs.goals.includes("halal")) && alt.product.isHalal ? 8 : 0;
  return alt.scoreGain + confidenceBonus + bio + halal + q.completeness * 0.05;
}

/** Pure validation + ranking over pre-scored candidates (no I/O — unit-testable). */
export function rankAlternatives(
  current: Product,
  curGree: GreeScore,
  candidates: { product: Product; gree: GreeScore }[],
  prefs: LocalPreferences
): ProductAlternative[] {
  const seen = new Set<string>([current.barcode]);
  const valid: ProductAlternative[] = [];
  for (const c of candidates) {
    if (seen.has(c.product.barcode)) continue;
    seen.add(c.product.barcode);
    const v = validateCandidate(current, curGree, c.product, c.gree, prefs);
    if (v) valid.push(v);
  }
  return valid.sort((a, b) => sortKey(b, prefs) - sortKey(a, prefs)).slice(0, MAX_RESULTS);
}

/* ── retrieval lives in the APP layer (src/domains/swap/service.ts). ──
   The domain package never fetches: it decides eligibility and ranks
   candidates the caller retrieved. */

/** The most precise reliable category to search within (pure helper). */
export function preciseCategory(product: Product): string | undefined {
  const cats = product.categories?.filter(Boolean) ?? [];
  return cats.length ? cats[cats.length - 1] : undefined;
}
