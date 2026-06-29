"use client";
import type { ProductResult, SearchResult } from "@/lib/api/openfoodfacts";
import type { Product } from "@/types/product";
import type { LocalPreferences } from "@/types/user-preferences";
import { computeGreeScore } from "@/lib/scoring/gree-score";
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

export interface Alternative {
  product: Product;
  score: number;
}

/**
 * Suggest healthier alternatives in the same category, ranked by GreeScore
 * (computed with the user's local preferences). Only items that clearly beat
 * the current product are returned.
 */
export async function getAlternatives(product: Product, prefs: LocalPreferences): Promise<Alternative[]> {
  const cat = product.categories?.length ? product.categories[product.categories.length - 1] : undefined;
  if (!cat) return [];

  const res = await fetch(`/api/alternatives?category=${encodeURIComponent(cat)}&exclude=${product.barcode}`);
  if (!res.ok) return [];
  const data = (await res.json()) as { products?: Product[] };

  const current = computeGreeScore(product, prefs).global;
  const seen = new Set<string>();

  return (data.products ?? [])
    .filter((p) => p.barcode && p.name && !seen.has(p.barcode) && (seen.add(p.barcode), true))
    .map((p) => ({ product: p, score: computeGreeScore(p, prefs).global }))
    .filter((x) => x.score > current + 3)
    .sort((a, b) => b.score - a.score)
    .slice(0, 4);
}
