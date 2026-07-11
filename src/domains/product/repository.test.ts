/**
 * Client product repository tests: read-through cache + offline stale fallback.
 * fetch is stubbed — no network is ever touched.
 */
import "@/services/storage/test-setup";
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { db } from "@/services/storage/db";
import { productCacheRepo } from "@/services/storage/repositories";
import { getProduct } from "./repository";
import type { Product } from "./model";
import type { ProductResult } from "@/services/api/openfoodfacts";

const product = (barcode: string): Product => ({ barcode, name: `P${barcode}`, nutriments: {}, source: "openfoodfacts" });
const found = (barcode: string): ProductResult => ({ status: "found", product: product(barcode), confidence: "high", missing: [] });

const g = globalThis as unknown as { fetch: typeof fetch };
let fetchCalls = 0;

function stubFetch(impl: () => Promise<Response>) {
  fetchCalls = 0;
  g.fetch = (() => { fetchCalls++; return impl(); }) as typeof fetch;
}

beforeEach(async () => {
  assert.ok(db);
  await Promise.all(db.tables.map((t) => t.clear()));
});

test("network result is cached; second call is served from IndexedDB without fetching", async () => {
  stubFetch(async () => new Response(JSON.stringify(found("5000")), { status: 200 }));
  const first = await getProduct("5000");
  assert.equal(first.status, "found");
  assert.equal(fetchCalls, 1);

  const second = await getProduct("5000");
  assert.equal(second.status, "found");
  assert.equal(fetchCalls, 1); // cache hit — no second network call
});

test("offline: a stale cached product is served when the network fails", async () => {
  await productCacheRepo.put("6000", found("6000"));
  await db!.products.update("6000", { cachedAt: Date.now() - 1000 * 60 * 60 * 48 }); // 48h old (stale)

  stubFetch(async () => { throw new Error("offline"); });
  const result = await getProduct("6000");
  assert.equal(result.status, "found");
  assert.equal((result as { product: Product }).product.barcode, "6000");
});

test("offline with no cache at all: the error propagates as a typed failure (no invented data)", async () => {
  stubFetch(async () => { throw new Error("offline"); });
  await assert.rejects(() => getProduct("7000"), /offline/);
});

test("not_found responses are returned but never cached", async () => {
  stubFetch(async () => new Response(JSON.stringify({ status: "not_found", barcode: "8000" }), { status: 404 }));
  const result = await getProduct("8000");
  assert.equal(result.status, "not_found");
  assert.equal(await db!.products.count(), 0);
});
