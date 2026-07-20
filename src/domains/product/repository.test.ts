/**
 * Client product repository tests: normalized lookup envelope, request
 * deduplication, rate-limit cooldown, offline stale fallback.
 * fetch is stubbed — no network is ever touched.
 */
import "@/services/storage/test-setup";
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { db } from "@/services/storage/db";
import { productCacheRepo } from "@/services/storage/repositories";
import { getProduct, __resetRepositoryForTests } from "./repository";
import { mapOffProduct } from "@greecheck/domain/product/normalizer";
import type { ProductResult } from "@/services/api/openfoodfacts";

/** Build a realistic normalized result from a raw-ish payload. */
function found(barcode: string): ProductResult {
  const product = mapOffProduct({
    code: barcode,
    product_name: `P${barcode}`,
    ingredients_text: "eau, sel",
    nutriments: { "sugars_100g": 4, "salt_100g": 0.2 },
    nutriscore_grade: "b",
    nova_group: 2
  });
  return { status: "usable_incomplete", product, confidence: "high", missing: [] };
}

const g = globalThis as unknown as { fetch: typeof fetch };
let fetchCalls = 0;

function stubFetch(impl: () => Promise<Response>) {
  fetchCalls = 0;
  g.fetch = (() => { fetchCalls++; return impl(); }) as typeof fetch;
}

beforeEach(async () => {
  assert.ok(db);
  await Promise.all(db.tables.map((t) => t.clear()));
  __resetRepositoryForTests();
});

test("network result is cached; second call is served from IndexedDB without fetching", async () => {
  stubFetch(async () => new Response(JSON.stringify(found("5000")), { status: 200 }));
  const first = await getProduct("5000");
  assert.equal(first.kind, "product");
  assert.equal(first.kind === "product" && first.stale, false);
  assert.equal(fetchCalls, 1);

  const second = await getProduct("5000");
  assert.equal(second.kind, "product");
  assert.equal(fetchCalls, 1); // cache hit — no second network call
});

test("duplicate concurrent lookups share ONE network request", async () => {
  stubFetch(async () => {
    await new Promise((r) => setTimeout(r, 30));
    return new Response(JSON.stringify(found("5500")), { status: 200 });
  });
  const [a, b, c] = await Promise.all([getProduct("5500"), getProduct("5500"), getProduct("5500")]);
  assert.equal(fetchCalls, 1); // deduplicated
  assert.equal(a.kind, "product");
  assert.deepEqual(a, b);
  assert.deepEqual(b, c);
});

test("offline: a stale cached product is served and explicitly MARKED stale", async () => {
  await productCacheRepo.put("6000", found("6000"));
  await db!.products.update("6000", { cachedAt: Date.now() - 1000 * 60 * 60 * 48 }); // 48h old

  stubFetch(async () => { throw new Error("offline"); });
  const result = await getProduct("6000");
  assert.equal(result.kind, "product");
  if (result.kind === "product") {
    assert.equal(result.stale, true);
    assert.equal(result.staleReason, "network_error");
    assert.ok(result.cachedAt);
  }
});

test("offline with no cache: typed network_error envelope (no throw, no invented data)", async () => {
  stubFetch(async () => { throw new Error("offline"); });
  const result = await getProduct("7000");
  assert.equal(result.kind, "network_error");
});

test("rate limited: 429 → cooldown; cached data served as stale, otherwise typed state", async () => {
  // no cache → typed rate_limited
  stubFetch(async () => new Response(JSON.stringify({ status: "rate_limited" }), { status: 429, headers: { "retry-after": "1" } }));
  const first = await getProduct("8000");
  assert.equal(first.kind, "rate_limited");

  // during cooldown, a DIFFERENT barcode with cache is served stale WITHOUT fetching
  await productCacheRepo.put("8001", found("8001"));
  fetchCalls = 0;
  await db!.products.update("8001", { cachedAt: Date.now() - 1000 * 60 * 60 * 48 });
  const second = await getProduct("8001");
  assert.equal(fetchCalls, 0); // cooldown respected
  assert.equal(second.kind, "product");
  if (second.kind === "product") {
    assert.equal(second.stale, true);
    assert.equal(second.staleReason, "rate_limited");
  }
});

test("not_found responses are returned but never cached", async () => {
  stubFetch(async () => new Response(JSON.stringify({ status: "not_found", barcode: "9000" }), { status: 404 }));
  const result = await getProduct("9000");
  assert.equal(result.kind, "not_found");
  assert.equal(await db!.products.count(), 0);
});

test("legacy cached rows (pre-V2 statuses) are revived into the new envelope", async () => {
  const legacyProduct = { barcode: "9100", name: "Legacy", nutriments: { sugars: 3 }, ingredientsText: "eau, sucre", nutriScore: "b", source: "openfoodfacts" };
  await db!.products.put({
    barcode: "9100",
    result: { status: "found", product: legacyProduct, confidence: "high", missing: [] } as unknown as ProductResult,
    cachedAt: Date.now()
  });
  const result = await getProduct("9100");
  assert.equal(result.kind, "product");
  if (result.kind === "product") {
    assert.ok(["complete", "usable_incomplete", "insufficient_for_score"].includes(result.status));
    assert.ok(result.product.halalStatus); // derived statuses filled on revival
    assert.ok(result.product.dataQuality);
  }
});
