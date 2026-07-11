"use client";
/**
 * Product repository (client side) — the single road from UI to product data.
 *
 * Network access goes through the internal /api proxy (never straight to
 * Open Food Facts from the browser), with a local IndexedDB read-through
 * cache. UI components never touch fetch/IndexedDB for products directly.
 */
import type { ProductResult, SearchResult } from "@/services/api/openfoodfacts";
import { productCacheRepo } from "@/services/storage/repositories";

/** Fetch a product through the internal proxy, with a local cache. */
export async function getProduct(barcode: string, opts: { force?: boolean } = {}): Promise<ProductResult> {
  const code = barcode.replace(/\D/g, "");

  if (!opts.force) {
    const cached = await productCacheRepo.get(code);
    if (cached) return cached;
  }

  try {
    const res = await fetch(`/api/product/${code}`);
    if (!res.ok && res.status !== 404) {
      throw new Error(`request_failed_${res.status}`);
    }
    const result = (await res.json()) as ProductResult;
    if (result.status !== "not_found") {
      void productCacheRepo.put(code, result);
    }
    return result;
  } catch (err) {
    // Offline / upstream failure: serve a stale cached result when we have one
    // (better a dated answer than none — the caller still sees real data).
    const stale = await productCacheRepo.getStale(code);
    if (stale) return stale.result;
    throw err;
  }
}

/** Full-text product search through the internal proxy. */
export async function searchProductsClient(query: string, page = 1): Promise<SearchResult> {
  const res = await fetch(`/api/search?q=${encodeURIComponent(query)}&page=${page}`);
  if (!res.ok) throw new Error(`search_failed_${res.status}`);
  return (await res.json()) as SearchResult;
}
