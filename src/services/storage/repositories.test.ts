/**
 * Repository + hydration + reset + stale-cache tests (in-memory IndexedDB).
 */
import "./test-setup";
import { localStorageStub } from "./test-setup";
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { db, PRODUCT_TTL } from "./db";
import { historyRepo, cartRepo, productCacheRepo, preferencesRepo } from "./repositories";
import { bootLocalData, __resetBootForTests } from "./boot";
import { resetApp } from "./local-data";
import { useHistoryStore } from "@/domains/library/history-store";
import { useCartStore } from "@/domains/cart/store";
import { usePreferencesStore, defaultPreferences } from "@/domains/criteria/store";
import type { Product } from "@/domains/product/model";
import type { ProductResult } from "@/services/api/openfoodfacts";

const ls = localStorageStub();
const product = (barcode: string): Product => ({ barcode, name: `P${barcode}`, nutriments: {}, source: "openfoodfacts" });
const found = (barcode: string): ProductResult => ({ status: "usable_incomplete", product: product(barcode), confidence: "medium", missing: [] });

beforeEach(async () => {
  assert.ok(db);
  await Promise.all(db.tables.map((t) => t.clear()));
  for (const k of Object.keys(ls).filter((k) => k.startsWith("greecheck"))) ls.removeItem(k);
  useHistoryStore.getState().hydrate([]);
  useCartStore.getState().hydrate([]);
  usePreferencesStore.getState().hydrate(defaultPreferences);
  __resetBootForTests();
});

test("boot hydrates every feature store from its repository", async () => {
  await db!.history.put({ barcode: "111", name: "Yaourt", score: 72, verdict: "ok", scannedAt: 5 });
  await db!.cart.put({ product: product("333"), score: 60, addedAt: 1 });
  await preferencesRepo.set({ ...defaultPreferences, preferBio: true, goals: ["go_organic"] });
  await db!.kv.put({ key: "meta.legacyMigrated", value: true }); // skip migration path

  await bootLocalData();

  assert.equal(useHistoryStore.getState().entries.length, 1);
  assert.equal(useHistoryStore.getState().entries[0].barcode, "111");
  assert.equal(useCartStore.getState().items[0].product.barcode, "333");
  assert.equal(usePreferencesStore.getState().preferBio, true);
});

test("boot merges an eager first action instead of erasing it", async () => {
  await db!.cart.put({ product: product("persisted"), score: 60, addedAt: 1 });
  await db!.kv.put({ key: "meta.legacyMigrated", value: true });
  useCartStore.getState().addProduct(product("eager"), { global: 75 } as never);

  await bootLocalData();

  assert.deepEqual(
    useCartStore.getState().items.map((item) => item.product.barcode).sort(),
    ["eager", "persisted"]
  );
});

test("store mutations write through to the repository", async () => {
  useHistoryStore.getState().add({ barcode: "777", name: "Muesli", score: 80, verdict: "ok", scannedAt: Date.now() });
  // write-through is fire-and-forget → allow the microtask to settle
  await new Promise((r) => setTimeout(r, 20));
  assert.equal((await historyRepo.all())[0]?.barcode, "777");

  useCartStore.getState().addProduct(product("888"), { global: 55 } as never);
  await new Promise((r) => setTimeout(r, 20));
  assert.equal((await cartRepo.all())[0]?.product.barcode, "888");
});

test("product cache: fresh hit is served, stale entry is ignored by get() but reachable via getStale()", async () => {
  await productCacheRepo.put("123", found("123"));
  assert.equal((await productCacheRepo.get("123"))?.status, "usable_incomplete");

  // age the entry past the TTL
  await db!.products.update("123", { cachedAt: Date.now() - PRODUCT_TTL - 1000 });
  assert.equal(await productCacheRepo.get("123"), undefined);
  const stale = await productCacheRepo.getStale("123");
  assert.ok(stale);
  assert.equal(stale.result.status, "usable_incomplete");
});

test("repository reads fail gracefully (closed DB → empty results, no throw)", async () => {
  db!.close();
  try {
    assert.deepEqual(await historyRepo.all(), []);
    assert.equal(await productCacheRepo.get("123"), undefined);
    assert.equal(await preferencesRepo.get(), undefined);
  } finally {
    await db!.open();
  }
});

test("local reset clears every store and every repository", async () => {
  useHistoryStore.getState().add({ barcode: "1", name: "A", score: 1, verdict: "x", scannedAt: 1 });
  useCartStore.getState().addProduct(product("2"), { global: 50 } as never);
  usePreferencesStore.getState().setPreferences({ preferBio: true });
  ls.setItem("greecheck.theme", "dark");
  await new Promise((r) => setTimeout(r, 20));

  await resetApp();

  assert.equal(useHistoryStore.getState().entries.length, 0);
  assert.equal(useCartStore.getState().items.length, 0);
  assert.equal(usePreferencesStore.getState().preferBio, false);
  assert.deepEqual(await historyRepo.all(), []);
  assert.deepEqual(await cartRepo.all(), []);
  assert.equal(ls.getItem("greecheck.theme"), null);
});
