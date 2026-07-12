/**
 * ════════════════════════════════════════════════════════════════════════
 *  Scan Battle — a serious purchase-decision instrument (not a game).
 *  Deterministic, preference-aware AND confidence-aware winner selection,
 *  plus pre-comparison VALIDATION so we never crown a misleading podium.
 * ════════════════════════════════════════════════════════════════════════
 *
 *  Winner = highest EFFECTIVE score (GreeScore × data-confidence factor), with
 *  transparent preference tie-breaks. Discounting by confidence is what stops a
 *  low-confidence product from "winning" just because missing data produced
 *  fewer penalties.
 */
import type { Product } from "@/domains/product/model";
import type { LocalPreferences } from "@/domains/criteria/model";
import type { GreeScore } from "@/domains/scoring/types";
import { computeGreeScore } from "@/domains/scoring/gree-score";
import { computeDataQuality } from "@/domains/product/normalizer";
import { nutriRank } from "@/domains/scoring/thresholds";

export interface BattleEntry {
  product: Product;
  gree: GreeScore;
}

export interface BattleValidation {
  /** True when a definitive winner can be presented honestly. */
  comparable: boolean;
  /** i18n issue codes: "differentCategories" | "insufficientData" | "singleProduct". */
  issues: string[];
  /** A category token shared by all products, when one exists. */
  sharedCategory?: string;
  /** Major missing signals per product (barcode → i18n codes). */
  missingByBarcode: Record<string, string[]>;
}

export interface BattleResult {
  ranking: BattleEntry[]; // best → worst
  winner: BattleEntry | null;
  runnerUp: BattleEntry | null;
  closeness: "clear" | "close";
  confidence: "high" | "partial";
  /** Reason keys explaining winner vs runner-up (rendered via i18n). */
  reasons: string[];
  validation: BattleValidation;
}

const nova = (n?: number) => n ?? 9;
const lc = (s: string) => s.trim().toLowerCase();

/** Confidence discount so missing data never wins on absence of penalties. */
const CONFIDENCE_FACTOR: Record<GreeScore["confidence"], number> = { high: 1, medium: 0.9, low: 0.72 };
export const effectiveScore = (e: BattleEntry): number => e.gree.global * CONFIDENCE_FACTOR[e.gree.confidence];

/* ───────────────────────── validation ──────────────────────────── */

function qualityOf(p: Product) {
  return p.dataQuality ?? computeDataQuality(p);
}

/** A category token shared by ALL products (checked over their deepest tags). */
function sharedCategory(products: Product[]): string | undefined {
  const sets = products.map((p) => new Set((p.categories ?? []).slice(-3).map(lc)));
  if (sets.some((s) => s.size === 0)) return undefined; // cannot assert
  let inter = [...sets[0]];
  for (const s of sets.slice(1)) inter = inter.filter((x) => s.has(x));
  return inter[inter.length - 1]; // deepest shared = most specific
}

export function validateBattle(entries: BattleEntry[]): BattleValidation {
  const products = entries.map((e) => e.product);
  const issues: string[] = [];
  const missingByBarcode: Record<string, string[]> = {};
  for (const e of entries) missingByBarcode[e.product.barcode] = qualityOf(e.product).confidenceReasons;

  if (entries.length < 2) {
    return { comparable: false, issues: ["singleProduct"], missingByBarcode };
  }

  // Category relevance — only assert a mismatch when EVERY product has categories.
  const allHaveCategories = products.every((p) => (p.categories?.length ?? 0) > 0);
  const shared = sharedCategory(products);
  if (allHaveCategories && !shared) issues.push("differentCategories");

  // Comparability of data — a product with neither nutrition nor Nutri-Score
  // cannot be meaningfully compared (its score is mostly a derived default).
  const thin = entries.filter((e) => {
    const a = qualityOf(e.product).availability;
    return !(a.nutrition || a.nutriScore);
  });
  if (thin.length) issues.push("insufficientData");

  return { comparable: issues.length === 0, issues, sharedCategory: shared, missingByBarcode };
}

/* ───────────────────────── winner logic ────────────────────────── */

export function computeBattle(products: Product[], prefs: LocalPreferences): BattleResult {
  const entries: BattleEntry[] = products.map((p) => ({ product: p, gree: computeGreeScore(p, prefs) }));

  const cmp = (a: BattleEntry, b: BattleEntry): number => {
    // Primary: confidence-discounted effective score.
    const ea = effectiveScore(a), eb = effectiveScore(b);
    if (eb !== ea) return eb - ea;
    // Then the higher raw confidence.
    const ca = CONFIDENCE_FACTOR[a.gree.confidence], cb = CONFIDENCE_FACTOR[b.gree.confidence];
    if (cb !== ca) return cb - ca;
    if (b.gree.subScores.nutrition !== a.gree.subScores.nutrition) return b.gree.subScores.nutrition - a.gree.subScores.nutrition;

    // Preference-weighted tie-breaks.
    if (prefs.reduceSugar) {
      const sa = a.product.nutriments.sugars ?? 99, sb = b.product.nutriments.sugars ?? 99;
      if (sa !== sb) return sa - sb;
    }
    if (prefs.increaseProtein) {
      const pa = a.product.nutriments.proteins ?? -1, pb = b.product.nutriments.proteins ?? -1;
      if (pa !== pb) return pb - pa;
    }
    if (prefs.reduceUltraProcessed || prefs.reduceAdditives) {
      const na = nova(a.product.novaGroup), nb = nova(b.product.novaGroup);
      if (na !== nb) return na - nb;
    }

    // Neutral tie-breaks.
    const aa = a.product.additives?.length ?? 99, ab = b.product.additives?.length ?? 99;
    if (aa !== ab) return aa - ab;
    const nr = nutriRank(a.product.nutriScore) - nutriRank(b.product.nutriScore);
    if (nr !== 0) return nr;
    return a.product.barcode.localeCompare(b.product.barcode); // stable, deterministic
  };

  const ranking = [...entries].sort(cmp);
  const winner = ranking[0] ?? null;
  const runnerUp = ranking[1] ?? null;
  const closeness = winner && runnerUp && Math.abs(effectiveScore(winner) - effectiveScore(runnerUp)) <= 5 ? "close" : "clear";
  const confidence = entries.some((e) => e.gree.confidence === "low") ? "partial" : "high";
  const reasons = winner && runnerUp ? buildReasons(winner, runnerUp, prefs) : [];
  const validation = validateBattle(entries);

  return { ranking, winner, runnerUp, closeness, confidence, reasons, validation };
}

function buildReasons(w: BattleEntry, r: BattleEntry, prefs: LocalPreferences): string[] {
  const out: string[] = [];
  const wn = w.product.nutriments, rn = r.product.nutriments;
  const less = (a?: number, b?: number) => a !== undefined && b !== undefined && a < b - 0.01;
  const more = (a?: number, b?: number) => a !== undefined && b !== undefined && a > b + 0.01;
  const conf = (c: GreeScore["confidence"]) => CONFIDENCE_FACTOR[c];

  if (w.gree.global > r.gree.global) out.push("higherScore");
  if (conf(w.gree.confidence) > conf(r.gree.confidence)) out.push("moreReliable");
  if (less(wn.sugars, rn.sugars)) out.push("lessSugar");
  if (less(wn.salt, rn.salt)) out.push("lessSalt");
  if (less(wn.saturatedFat, rn.saturatedFat)) out.push("lessSatFat");
  if (more(wn.proteins, rn.proteins)) out.push("moreProtein");
  if (more(wn.fiber, rn.fiber)) out.push("moreFiber");
  if ((w.product.additives?.length ?? 0) < (r.product.additives?.length ?? 0)) out.push("fewerAdditives");
  if (nova(w.product.novaGroup) < nova(r.product.novaGroup)) out.push("lowerNova");
  if (nutriRank(w.product.nutriScore) < nutriRank(r.product.nutriScore)) out.push("betterNutri");
  if (w.product.isBio && !r.product.isBio) out.push("matchBio");
  if (w.product.greenScore && r.product.greenScore && w.product.greenScore < r.product.greenScore) out.push("lowerEcoImpact");
  if (prefs.preferHalal && w.product.isHalal && !r.product.isHalal) out.push("matchHalal");
  if ((prefs.preferVegan || prefs.goals.includes("vegan")) && w.product.isVegan && !r.product.isVegan) out.push("matchVegan");
  if (prefs.goals.length && (w.gree.subScores.goalFit ?? 0) > (r.gree.subScores.goalFit ?? 0) + 3) out.push("betterGoal");

  return out.slice(0, 4);
}
