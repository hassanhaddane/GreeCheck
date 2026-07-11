"use client";
/**
 * GreeSwap — healthier-alternative suggestions.
 *
 * Candidates come from the same OFF category (via the internal proxy) and are
 * ranked by the user's personalized GreeScore. Pure ranking logic + one fetch;
 * no storage, no tracking. V2 trigger/eligibility rules land in the GreeSwap
 * phase — this module is the single home for that logic.
 */
import type { Product } from "@/domains/product/model";
import type { LocalPreferences } from "@/domains/criteria/model";
import type { GreeScore } from "@/domains/scoring/types";
import { computeGreeScore } from "@/domains/scoring/gree-score";
import { nutriRank } from "@/domains/scoring/thresholds";

/** A suggested healthier alternative with explained reasons. */
export interface ProductAlternative {
  product: Product;
  gree: GreeScore;
  /** Ordered i18n reason tokens explaining why this beats the current product. */
  reasons: string[];
}

export type Alternative = ProductAlternative;

/** Compare an alternative to the current product and produce ordered reason tokens. */
function buildAltReasons(current: Product, alt: Product, altGree: GreeScore, curGree: GreeScore, prefs: LocalPreferences): string[] {
  const cn = current.nutriments, an = alt.nutriments;
  const less = (a?: number, b?: number) => a !== undefined && b !== undefined && a < b - 0.5;
  const more = (a?: number, b?: number) => a !== undefined && b !== undefined && a > b + 0.5;
  const out: string[] = [];

  // Most meaningful first.
  if (prefs.preferHalal && alt.isHalal && !current.isHalal) out.push("halal");
  if (alt.isBio && !current.isBio) out.push("bio");
  if (nutriRank(alt.nutriScore) < nutriRank(current.nutriScore)) out.push("betterNutri");
  if ((alt.novaGroup ?? 9) < (current.novaGroup ?? 9)) out.push("lowerNova");
  if (less(an.sugars, cn.sugars)) out.push("lessSugar");
  if (less(an.salt, cn.salt)) out.push("lessSalt");
  if (less(an.saturatedFat, cn.saturatedFat)) out.push("lessSatFat");
  if (more(an.fiber, cn.fiber)) out.push("moreFiber");
  if (more(an.proteins, cn.proteins)) out.push("moreProtein");
  if (altGree.global > curGree.global) out.push("betterScore");

  // Always guarantee at least the score reason.
  return (out.length ? out : ["betterScore"]).slice(0, 3);
}

/**
 * Suggest healthier alternatives in the same category, ranked by GreeScore
 * (computed with the user's LOCAL preferences) and boosted for bio / halal when
 * those preferences are active. Each item carries explained reasons.
 */
export async function getAlternatives(product: Product, prefs: LocalPreferences): Promise<ProductAlternative[]> {
  const cat = product.categories?.length ? product.categories[product.categories.length - 1] : undefined;
  if (!cat) return [];

  const res = await fetch(`/api/alternatives?category=${encodeURIComponent(cat)}&exclude=${product.barcode}`);
  if (!res.ok) return [];
  const data = (await res.json()) as { products?: Product[] };

  const curGree = computeGreeScore(product, prefs);
  const seen = new Set<string>();

  const scored = (data.products ?? [])
    .filter((p) => p.barcode && p.name && !seen.has(p.barcode) && (seen.add(p.barcode), true))
    .map((alt) => {
      const gree = computeGreeScore(alt, prefs);
      const boost = (prefs.preferHalal && alt.isHalal ? 8 : 0) + (prefs.preferBio && alt.isBio ? 6 : 0);
      return { alt, gree, sort: gree.global + boost };
    })
    .filter((x) => x.gree.global > curGree.global + 3);

  return scored
    .sort((a, b) => b.sort - a.sort)
    .slice(0, 4)
    .map((x) => ({ product: x.alt, gree: x.gree, reasons: buildAltReasons(product, x.alt, x.gree, curGree, prefs) }));
}
