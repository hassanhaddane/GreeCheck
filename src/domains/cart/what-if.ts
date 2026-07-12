/**
 * ════════════════════════════════════════════════════════════════════════
 *  GreeCart What-if — deterministic basket optimization.
 *  Simulates GreeSwap replacements, recalculates the basket score, and builds
 *  a PRIORITIZED plan: the smallest number of changes that yields the biggest
 *  RELIABLE improvement. Pure (no I/O), so it is fully unit-testable — the UI
 *  only supplies pre-fetched, already-validated GreeSwap candidates.
 * ════════════════════════════════════════════════════════════════════════
 */
import type { Product } from "@/domains/product/model";
import type { GreeScore } from "@/domains/scoring/types";
import type { LocalPreferences } from "@/domains/criteria/model";
import { computeGreeScore } from "@/domains/scoring/gree-score";
import { computeCartScore, type CartInput, type CartProductAnalysis } from "@/domains/cart/engine";

export const DEFAULT_MIN_GAIN = 2;
export const DEFAULT_MAX_STEPS = 5;

/** A trustworthy GreeSwap replacement for a specific basket product. */
export interface ReplacementCandidate {
  targetBarcode: string;
  replacement: Product;
  replacementGree?: GreeScore;
}

export interface PlanStep {
  targetBarcode: string;
  targetName: string;
  replacement: Product;
  replacementGree: GreeScore;
  /** Basket score just before applying this step. */
  before: number;
  /** Basket score after applying this step (on top of earlier steps). */
  after: number;
  gain: number;
}

export interface ImprovementPlan {
  baseScore: number;
  finalScore: number;
  totalGain: number;
  steps: PlanStep[];
}

const scoreOf = (inputs: CartInput[], prefs: LocalPreferences) => computeCartScore(inputs, prefs).global;
const greeOf = (c: ReplacementCandidate, prefs: LocalPreferences) => c.replacementGree ?? computeGreeScore(c.replacement, prefs);

/** Recompute the basket score with ONE product swapped. Pure. */
export function simulateReplacement(
  inputs: CartInput[],
  prefs: LocalPreferences,
  targetBarcode: string,
  replacement: Product,
  replacementGree?: GreeScore
): { before: number; after: number; gain: number } {
  const before = scoreOf(inputs, prefs);
  const gree = replacementGree ?? computeGreeScore(replacement, prefs);
  const swapped = inputs.map((i) =>
    i.product.barcode === targetBarcode ? { product: replacement, gree } : i
  );
  const after = scoreOf(swapped, prefs);
  return { before, after, gain: after - before };
}

/**
 * Greedy prioritized plan: repeatedly apply the replacement whose gain on the
 * CURRENT basket is the largest (and ≥ minGain). Deterministic — ties break on
 * the target barcode. Each product is replaced at most once and never with a
 * product already in the basket.
 */
export function buildImprovementPlan(
  inputs: CartInput[],
  prefs: LocalPreferences,
  candidates: ReplacementCandidate[],
  opts: { minGain?: number; maxSteps?: number } = {}
): ImprovementPlan {
  const minGain = opts.minGain ?? DEFAULT_MIN_GAIN;
  const maxSteps = opts.maxSteps ?? DEFAULT_MAX_STEPS;
  const baseScore = scoreOf(inputs, prefs);

  let current: CartInput[] = inputs.map((i) => ({ ...i }));
  const usedTargets = new Set<string>();
  const steps: PlanStep[] = [];

  while (steps.length < maxSteps) {
    const before = scoreOf(current, prefs);
    let best: { c: ReplacementCandidate; gree: GreeScore; after: number; gain: number } | null = null;

    for (const c of candidates) {
      if (usedTargets.has(c.targetBarcode)) continue;
      if (!current.some((i) => i.product.barcode === c.targetBarcode)) continue;
      if (current.some((i) => i.product.barcode === c.replacement.barcode)) continue;

      const gree = greeOf(c, prefs);
      const swapped = current.map((i) =>
        i.product.barcode === c.targetBarcode ? { product: c.replacement, gree } : i
      );
      const after = scoreOf(swapped, prefs);
      const gain = after - before;
      if (gain < minGain) continue;
      if (!best || gain > best.gain || (gain === best.gain && c.targetBarcode.localeCompare(best.c.targetBarcode) < 0)) {
        best = { c, gree, after, gain };
      }
    }

    if (!best) break;
    current = current.map((i) =>
      i.product.barcode === best!.c.targetBarcode ? { product: best!.c.replacement, gree: best!.gree } : i
    );
    usedTargets.add(best.c.targetBarcode);
    const target = inputs.find((i) => i.product.barcode === best!.c.targetBarcode)?.product;
    steps.push({
      targetBarcode: best.c.targetBarcode,
      targetName: target?.name ?? "",
      replacement: best.c.replacement,
      replacementGree: best.gree,
      before,
      after: best.after,
      gain: best.gain
    });
  }

  const finalScore = steps.length ? steps[steps.length - 1].after : baseScore;
  return { baseScore, finalScore, totalGain: finalScore - baseScore, steps };
}

/* ─────────────────────────── grouping ──────────────────────────── */

export type BasketGroup = "strong" | "acceptable" | "priority" | "insufficient";

/**
 * Classify one product. A critical compatibility issue always makes it a
 * priority replacement; otherwise LOW-confidence / missing-critical products
 * are "insufficient data" (NEVER auto-labelled poor). The rest split by their
 * effective basket score.
 */
export function classifyEntry(a: CartProductAnalysis): BasketGroup {
  if (a.issues.some((i) => i.severity === "critical")) return "priority";
  if (a.gree.confidence === "low" || a.missingCriticalData) return "insufficient";
  if (a.issues.some((i) => i.severity === "warning") || a.effectiveScore < 50) return "priority";
  if (a.effectiveScore >= 70) return "strong";
  return "acceptable";
}

export function groupBasket(analyses: CartProductAnalysis[]): Record<BasketGroup, CartProductAnalysis[]> {
  const groups: Record<BasketGroup, CartProductAnalysis[]> = { strong: [], acceptable: [], priority: [], insufficient: [] };
  for (const a of analyses) groups[classifyEntry(a)].push(a);
  groups.priority.sort((x, y) => x.effectiveScore - y.effectiveScore);
  groups.strong.sort((x, y) => y.effectiveScore - x.effectiveScore);
  return groups;
}

/** Distinct product categories present (coverage), where meaningful. */
export function categoryCoverage(analyses: CartProductAnalysis[]): string[] {
  const cats = analyses
    .map((a) => a.product.categories?.filter(Boolean))
    .map((c) => (c && c.length ? c[c.length - 1].toLowerCase() : undefined))
    .filter((c): c is string => Boolean(c));
  return [...new Set(cats)].sort();
}
