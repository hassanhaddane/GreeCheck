/**
 * ════════════════════════════════════════════════════════════════════════
 *  Search ranking — deterministic, confidence-aware ordering.
 *  Factors: query relevance · GreeScore · DATA CONFIDENCE · local criteria ·
 *  market relevance. Critically, an incomplete/low-confidence product must NOT
 *  rank first just because it lacks negative data — its effective score is
 *  discounted by a confidence factor so a well-documented, slightly lower
 *  product outranks it.
 * ════════════════════════════════════════════════════════════════════════
 */
import type { Product } from "@/domains/product/model";
import type { GreeScore } from "@/domains/scoring/types";
import type { LocalPreferences } from "@/domains/criteria/model";
import { computeDataQuality } from "@/domains/product/normalizer";
import { normalize } from "@/domains/search/intents";

export interface ScoredProduct {
  p: Product;
  gree: GreeScore;
}

export interface RankedProduct extends ScoredProduct {
  /** Final ranking key (higher = better). Exposed for tests/debugging. */
  rank: number;
  relevance: number;
}

/* ── weights (documented, tunable) ── */
const W_RELEVANCE = 45;   // dominates when the query clearly matches
const W_SCORE = 1;        // GreeScore points (already 0–100)
const W_CRITERIA = 6;     // per aligned active criterion (capped)
const W_MARKET = 4;       // sold in the user's market

/** Confidence discount applied to the GreeScore so missing data never wins alone. */
const CONFIDENCE_FACTOR: Record<GreeScore["confidence"], number> = { high: 1, medium: 0.9, low: 0.72 };

/* ── query relevance (0–1) ── */
function tokens(s: string): string[] {
  return normalize(s).split(/[^a-z0-9]+/).filter((w) => w.length > 1);
}

/** Share of query tokens found in the product's name / brand / categories. */
export function relevanceScore(query: string, p: Product): number {
  const q = tokens(query);
  if (!q.length) return 0;
  const hay = new Set(tokens([p.name, p.brand ?? "", ...(p.categories ?? [])].join(" ")));
  let hits = 0;
  for (const term of q) {
    if (hay.has(term)) hits += 1;
    else if ([...hay].some((h) => h.includes(term) || term.includes(h))) hits += 0.5;
  }
  return Math.min(1, hits / q.length);
}

/* ── local-criteria alignment (0..n, capped) ── */
function criteriaBoost(p: Product, prefs: LocalPreferences): number {
  let n = 0;
  if ((prefs.preferBio || prefs.goals.includes("go_organic")) && p.isBio) n += 1;
  if ((prefs.preferHalal || prefs.goals.includes("halal")) && p.isHalal) n += 1;
  if ((prefs.preferVegan || prefs.goals.includes("vegan")) && p.isVegan) n += 1;
  if ((prefs.preferVegetarian || prefs.goals.includes("vegetarian")) && p.isVegetarian) n += 1;
  if ((prefs.reduceUltraProcessed || prefs.goals.includes("avoid_ultraprocessed")) && (p.novaGroup ?? 4) <= 2) n += 1;
  return Math.min(3, n);
}

/** True when the product is sold in the user's market (France-first for now). */
function inMarket(p: Product): boolean {
  return (p.countries ?? []).some((c) => /france|french|فرنسا/i.test(c));
}

/**
 * Rank scored products. Pure and deterministic (ties broken by confidence then
 * barcode) so identical inputs always produce identical output.
 */
export function rankSearchResults(
  query: string,
  scored: ScoredProduct[],
  prefs: LocalPreferences
): RankedProduct[] {
  const ranked = scored.map(({ p, gree }) => {
    const relevance = relevanceScore(query, p);
    const confidence = (p.dataQuality ?? computeDataQuality(p)).confidence;
    const effectiveScore = gree.global * CONFIDENCE_FACTOR[confidence];
    const rank =
      relevance * W_RELEVANCE +
      effectiveScore * W_SCORE +
      criteriaBoost(p, prefs) * W_CRITERIA +
      (inMarket(p) ? W_MARKET : 0);
    return { p, gree, relevance, rank };
  });

  const conf = (r: RankedProduct) => CONFIDENCE_FACTOR[(r.p.dataQuality ?? computeDataQuality(r.p)).confidence];
  return ranked.sort((a, b) => b.rank - a.rank || conf(b) - conf(a) || a.p.barcode.localeCompare(b.p.barcode));
}
