"use client";
import type { ProductResult, SearchResult } from "@/lib/api/openfoodfacts";
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
