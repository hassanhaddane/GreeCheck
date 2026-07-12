"use client";
/**
 * Product repository (client side) — the single road from UI to product data.
 *
 * Guarantees:
 *   • request DEDUPLICATION — concurrent lookups of the same barcode share
 *     one network call;
 *   • RATE-LIMIT awareness — after a 429 the repository cools down and serves
 *     cached data instead of hammering the proxy;
 *   • CACHE fallback — offline/network errors degrade to the freshest local
 *     copy, explicitly marked stale (never silently);
 *   • one stable normalized envelope (`ProductLookup`) — the UI never needs
 *     source-specific conditions.
 */
import type { ProductResult, SearchResult } from "@/services/api/openfoodfacts";
import type { Product, AssessmentStatus, Confidence } from "@/domains/product/model";
import { ensureDerived, assessProduct } from "@/domains/product/normalizer";
import { productCacheRepo } from "@/services/storage/repositories";

/* ───────────────────────── lookup envelope ───────────────────────── */

export type StaleReason = "network_error" | "rate_limited";

export type ProductLookup =
  | {
      kind: "product";
      status: AssessmentStatus;
      product: Product;
      confidence: Confidence;
      missing: string[];
      /** True when served from the local cache because the network failed. */
      stale: boolean;
      cachedAt?: number;
      staleReason?: StaleReason;
    }
  | { kind: "not_found"; barcode: string }
  | { kind: "network_error"; barcode: string }
  | { kind: "rate_limited"; barcode: string; retryAfterMs?: number };

/* ─────────────────── legacy cache-row revival (shim) ─────────────────── */

/** Cached rows may predate the V2 statuses — revive them into the new shape. */
function reviveResult(result: ProductResult): ProductResult {
  if (result.status === "not_found") return result;
  const product = ensureDerived(result.product);
  const assessment = assessProduct(product);
  return { status: assessment.status, product, confidence: assessment.confidence, missing: assessment.missing };
}

function toLookup(result: ProductResult, stale: false | { cachedAt?: number; reason: StaleReason }): ProductLookup {
  if (result.status === "not_found") return { kind: "not_found", barcode: result.barcode };
  return {
    kind: "product",
    status: result.status,
    product: result.product,
    confidence: result.confidence,
    missing: result.missing,
    stale: Boolean(stale),
    cachedAt: stale ? stale.cachedAt : undefined,
    staleReason: stale ? stale.reason : undefined
  };
}

/* ─────────────── deduplication + rate-limit cooldown state ────────────── */

const inflight = new Map<string, Promise<ProductLookup>>();
const searchInflight = new Map<string, Promise<SearchResult>>();
let rateLimitedUntil = 0;

/** Test-only escape hatch. */
export function __resetRepositoryForTests() {
  inflight.clear();
  searchInflight.clear();
  rateLimitedUntil = 0;
}

async function staleFallback(code: string, reason: StaleReason): Promise<ProductLookup | undefined> {
  const cached = await productCacheRepo.getStale(code);
  if (!cached) return undefined;
  const revived = reviveResult(cached.result);
  if (revived.status === "not_found") return undefined;
  return toLookup(revived, { cachedAt: cached.cachedAt, reason });
}

/* ──────────────────────────── barcode lookup ───────────────────────────── */

async function lookupUncached(code: string, force: boolean): Promise<ProductLookup> {
  // Fresh local cache first (24h TTL).
  if (!force) {
    const cached = await productCacheRepo.get(code);
    if (cached) return toLookup(reviveResult(cached), false);
  }

  // Rate-limit cooldown: don't hammer the proxy; degrade to stale data.
  if (Date.now() < rateLimitedUntil) {
    return (await staleFallback(code, "rate_limited")) ?? { kind: "rate_limited", barcode: code, retryAfterMs: rateLimitedUntil - Date.now() };
  }

  try {
    const res = await fetch(`/api/product/${code}`);

    if (res.status === 429) {
      const retryMs = Number(res.headers.get("retry-after") ?? "30") * 1000 || 30_000;
      rateLimitedUntil = Date.now() + Math.min(retryMs, 120_000);
      return (await staleFallback(code, "rate_limited")) ?? { kind: "rate_limited", barcode: code, retryAfterMs: retryMs };
    }
    if (res.status === 404) {
      return { kind: "not_found", barcode: code };
    }
    if (!res.ok) {
      return (await staleFallback(code, "network_error")) ?? { kind: "network_error", barcode: code };
    }

    const result = reviveResult((await res.json()) as ProductResult);
    if (result.status !== "not_found") {
      void productCacheRepo.put(code, result);
    }
    return toLookup(result, false);
  } catch {
    // Offline / fetch failure: freshest local copy, explicitly marked stale.
    return (await staleFallback(code, "network_error")) ?? { kind: "network_error", barcode: code };
  }
}

/** Barcode lookup — deduplicated, cached, rate-limit-aware, stale-explicit. */
export function getProduct(barcode: string, opts: { force?: boolean } = {}): Promise<ProductLookup> {
  const code = barcode.replace(/\D/g, "");
  const key = `${code}|${opts.force ? 1 : 0}`;
  const pending = inflight.get(key);
  if (pending) return pending;

  const p = lookupUncached(code, Boolean(opts.force)).finally(() => inflight.delete(key));
  inflight.set(key, p);
  return p;
}

/* ─────────────────────────────── search ───────────────────────────────── */

/** Full-text product search through the internal proxy (deduplicated). */
export function searchProductsClient(query: string, page = 1): Promise<SearchResult> {
  const key = `${query.trim().toLowerCase()}|${page}`;
  const pending = searchInflight.get(key);
  if (pending) return pending;

  const p = (async () => {
    const res = await fetch(`/api/search?q=${encodeURIComponent(query)}&page=${page}`);
    if (res.status === 429) throw new Error("search_rate_limited");
    if (!res.ok) throw new Error(`search_failed_${res.status}`);
    return (await res.json()) as SearchResult;
  })().finally(() => searchInflight.delete(key));
  searchInflight.set(key, p);
  return p;
}
