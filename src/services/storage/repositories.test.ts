/**
 * Repository + hydration + reset + stale-cache tests (in-memory IndexedDB).
 */
import "./test-setup";
import { localStorageStub } from "./test-setup";
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { db, PRODUCT_TTL } from "./db";
import { historyRepo, cartRepo, productCacheRepo, preferencesRepo, shoppingListRepo } from "./repositories";
import { migrateScoreSnapshots } from "./migrate-score";
import { computeGreeScore } from "@greecheck/domain/scoring/gree-score";
import { water } from "@greecheck/domain/scoring/gs3-fixtures";
import { bootLocalData, __resetBootForTests } from "./boot";
import { resetApp } from "./local-data";
import { useShoppingListStore } from "@/domains/list/store";
import { useHistoryStore } from "@/domains/library/history-store";
import { useCartStore } from "@/domains/cart/store";
import { usePreferencesStore, defaultPreferences } from "@/domains/criteria/store";
import type { Product } from "@greecheck/domain/product/model";
import type { ProductResult } from "@/services/api/product-contracts";

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
  useCartStore.getState().addProduct(product("eager"), computeGreeScore(product("eager"), defaultPreferences));

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

  useCartStore.getState().addProduct(product("888"), computeGreeScore(product("888"), defaultPreferences));
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
  useCartStore.getState().addProduct(product("2"), computeGreeScore(product("2"), defaultPreferences));
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

test("first additions to the shopping list retain saved entries and combine concurrent quantities", async () => {
  await shoppingListRepo.set([
    { id: "saved", name: "Pommes", quantity: 2, checked: true, addedAt: 1, source: "manual" }
  ]);
  const list = useShoppingListStore.getState();
  assert.equal(list.hydrated, false);

  const oats = { barcode: "22222220", name: "Avoine" };
  await Promise.all([list.add(oats), list.addMany([oats, { id: "pears", name: "Poires" }])]);

  const items = await shoppingListRepo.get();
  assert.equal(items?.find((item) => item.id === "saved")?.checked, true);
  assert.equal(items?.find((item) => item.id === oats.barcode)?.quantity, 2);
  assert.equal(items?.find((item) => item.id === "pears")?.quantity, 1);
});

test("GS-3 recomputes cached snapshots, archives old notes and preserves history across reruns", async () => {
  const cached = { ...water, barcode: "111" };
  const legacy = { barcode: cached.barcode, name: "Eau", score: 90, grade: "A" as const, verdict: "ok", warningCode: "additiveAvoid", scannedAt: 5, favorite: true };
  await db!.history.bulkPut([legacy, { ...legacy, barcode: "missing", score: 50, grade: "C" }]);
  await db!.favorites.put(legacy);
  await db!.cart.bulkPut([{ product: cached, score: 90, addedAt: 1 }, { product: product("partial"), score: 50, addedAt: 2 }]);
  await productCacheRepo.put(cached.barcode, { ...found(cached.barcode), product: cached } as ProductResult);

  await bootLocalData();
  const history = await db!.history.toArray();
  const current = history.find(entry => entry.barcode === cached.barcode);
  const obsolete = history.find(entry => entry.barcode === "missing");
  assert.equal(current?.score, 100);
  assert.equal(current?.scoreVersion, "GS-3.0.0");
  assert.equal(current?.scannedAt, 5);
  assert.equal(current?.favorite, true);
  assert.equal(current?.warningCode, undefined);
  assert.deepEqual(current?.previousScore, { score: 90, grade: "A", version: "legacy" });
  assert.equal(obsolete?.score, undefined);
  assert.equal(obsolete?.grade, undefined);
  assert.equal(obsolete?.scoreObsolete, true);
  assert.equal((await db!.favorites.get(cached.barcode))?.score, 100);
  assert.equal((await db!.cart.get(cached.barcode))?.score, 100);
  assert.equal((await db!.cart.get("partial"))?.score, undefined);
  assert.equal((await db!.cart.get("partial"))?.addedAt, 2);
  await migrateScoreSnapshots();
  assert.deepEqual(await db!.history.toArray(), history);
});
