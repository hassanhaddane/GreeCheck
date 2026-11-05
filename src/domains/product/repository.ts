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
import type { DataLocale, ProductResult, SearchResult } from "@/services/api/product-contracts";
import type { Product, AssessmentStatus, Confidence } from "@greecheck/domain/product/model";
import { ensureDerived, assessProduct } from "@greecheck/domain/product/normalizer";
import { retryAfterMs } from "@/services/api/errors";
import type { DataState } from "@greecheck/domain/product/provenance";
import { productCacheRepo } from "@/services/storage/repositories";

/* ───────────────────────── lookup envelope ───────────────────────── */

export type StaleReason = "network_error" | "rate_limited" | "upstream_unavailable";

export type ProductLookup =
  | {
      kind: "product";
      status: AssessmentStatus;
      dataState: DataState;
      product: Product;
      confidence: Confidence;
      missing: string[];
      /** True when served from the local cache because the network failed. */
      stale: boolean;
      cachedAt?: number;
      staleReason?: StaleReason;
    }
  | { kind: "not_found"; dataState: "UNAVAILABLE"; barcode: string }
  | { kind: "network_error"; dataState: "UNAVAILABLE"; barcode: string; retryAfterMs?: number }
  | { kind: "rate_limited"; dataState: "UNAVAILABLE"; barcode: string; retryAfterMs?: number };

/* ─────────────────── legacy cache-row revival (shim) ─────────────────── */

/** Cached rows may predate the V2 statuses — revive them into the new shape. */
function reviveResult(result: ProductResult): ProductResult {
  if (result.status === "not_found") return result;
  const product = ensureDerived(result.product);
  const assessment = assessProduct(product);
  return { status: assessment.status, product, confidence: assessment.confidence, missing: assessment.missing };
}

function toLookup(result: ProductResult, stale: false | { cachedAt?: number; reason: StaleReason }): ProductLookup {
  if (result.status === "not_found") return { kind: "not_found", dataState: "UNAVAILABLE", barcode: result.barcode };
  return {
    kind: "product",
    status: result.status,
    dataState: stale ? "STALE" : (result.product.dataState ?? "PARTIAL"),
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
let lookupCooldown: { until: number; reason: "rate_limited" | "upstream_unavailable" } | undefined;
let searchCooldownUntil = 0;

/** Test-only escape hatch. */
export function __resetRepositoryForTests() {
  inflight.clear();
  searchInflight.clear();
  lookupCooldown = undefined;
  searchCooldownUntil = 0;
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

  if (lookupCooldown && Date.now() < lookupCooldown.until) {
    return unavailable(code, lookupCooldown.reason, lookupCooldown.until - Date.now());
  }

  try {
    const res = await fetch("/api/product/" + encodeURIComponent(code), { cache: force ? "reload" : "default", signal: AbortSignal.timeout(15_000) });

    if (res.status === 429 || res.status === 503) {
      const retryMs = retryAfterMs(res.headers.get("retry-after")) ?? 30_000;
      const reason = res.status === 429 ? "rate_limited" : "upstream_unavailable";
      const until = Date.now() + retryMs;
      if (!lookupCooldown || lookupCooldown.until <= until) lookupCooldown = { until, reason };
      return unavailable(code, reason, retryMs);
    }
    if (!res.ok && res.status !== 404) throw new Error("Lookup failed");
    const body = await res.json() as ProductResult | null;
    if (res.status === 404 && body?.status === "not_found" && body.barcode === code) {
      return { kind: "not_found", dataState: "UNAVAILABLE", barcode: code };
    }
    if (!res.ok || !body || !["complete", "usable_incomplete", "insufficient_for_score"].includes(body.status) ||
      body.status === "not_found" || body.product?.barcode !== code || typeof body.product.name !== "string" ||
      !body.product.nutriments || typeof body.product.nutriments !== "object" || Array.isArray(body.product.nutriments) ||
      Object.values(body.product.nutriments).some(value => typeof value !== "number" || !Number.isFinite(value) || value < 0) ||
      (body.product.source !== "openfoodfacts" && body.product.source !== "usda")) {
      throw new Error("Invalid lookup response");
    }
    const result = reviveResult(body);
    await productCacheRepo.put(code, result);
    return toLookup(result, false);
  } catch {
    return unavailable(code, "network_error");
  }
}

async function unavailable(code: string, reason: StaleReason, retryMs?: number): Promise<ProductLookup> {
  return (await staleFallback(code, reason)) ?? {
    kind: reason === "rate_limited" ? "rate_limited" : "network_error",
    dataState: "UNAVAILABLE", barcode: code, retryAfterMs: retryMs
  };
}

/** Barcode lookup — deduplicated, cached, rate-limit-aware, stale-explicit. */
export function getProduct(barcode: string, opts: { force?: boolean } = {}): Promise<ProductLookup> {
  const code = barcode.trim();
  const key = `${code}|${opts.force ? 1 : 0}`;
  const pending = inflight.get(key);
  if (pending) return pending;

  const p = lookupUncached(code, Boolean(opts.force)).finally(() => inflight.delete(key));
  inflight.set(key, p);
  return p;
}

/* ─────────────────────────────── search ───────────────────────────────── */

/** Full-text product search through the internal proxy (deduplicated). */
export function searchProductsClient(query: string, page = 1, locale: DataLocale = "fr"): Promise<SearchResult> {
  const q = query.trim();
  const key = JSON.stringify([q, page, locale]);
  const pending = searchInflight.get(key);
  if (pending) return pending;

  const p = (async () => {
    if (Date.now() < searchCooldownUntil) throw new Error("search_cooldown");
    const params = new URLSearchParams({ q, page: String(page), locale });
    const res = await fetch("/api/search?" + params.toString(), { signal: AbortSignal.timeout(13_000) });
    if (res.status === 429 || res.status === 503) {
      const until = Date.now() + (retryAfterMs(res.headers.get("retry-after")) ?? 30_000);
      searchCooldownUntil = Math.max(searchCooldownUntil, until);
    }
    if (!res.ok) throw new Error("search_failed_" + res.status);
    const result = await res.json() as SearchResult | null;
    if (!result || !Array.isArray(result.products) || !Number.isInteger(result.count)) throw new Error("search_invalid_payload");
    return result;
  })().finally(() => searchInflight.delete(key));
  searchInflight.set(key, p);
  return p;
}
