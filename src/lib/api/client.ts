"use client";
import type { ProductResult, SearchResult } from "@/lib/api/openfoodfacts";
import type { Product } from "@/types/product";
import type { LocalPreferences } from "@/types/user-preferences";
import type { GreeScore } from "@/types/scoring";
import type { ProductAlternative } from "@/types/local-data";
import { computeGreeScore } from "@/lib/scoring/gree-score";
import { nutriRank } from "@/lib/nutrition/thresholds";
import { db, PRODUCT_TTL } from "@/lib/storage/db";

/** Fetch a product through the internal proxy, with a local IndexedDB cache. */
export async function getProduct(barcode: string, opts: { force?: boolean } = {}): Promise<ProductResult> {
  const code = barcode.replace(/\D/g, "");

  if (!opts.force && db) {
    try {
      const cached = await db.products.get(code);
      if (cached && Date.now() - cached.cachedAt < PRODUCT_TTL) {
        return cached.result;
      }
    } catch {
      /* cache miss / unavailable — fall through to network */
    }
  }

  const res = await fetch(`/api/product/${code}`);
  if (!res.ok && res.status !== 404) {
    throw new Error(`request_failed_${res.status}`);
  }
  const result = (await res.json()) as ProductResult;

  if (db && result.status !== "not_found") {
    db.products.put({ barcode: code, result, cachedAt: Date.now() }).catch(() => {});
  }
  return result;
}

export async function searchProductsClient(query: string, page = 1): Promise<SearchResult> {
  const res = await fetch(`/api/search?q=${encodeURIComponent(query)}&page=${page}`);
  if (!res.ok) throw new Error(`search_failed_${res.status}`);
  return (await res.json()) as SearchResult;
}

// Back-compat alias — the canonical type lives in types/local-data.
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
