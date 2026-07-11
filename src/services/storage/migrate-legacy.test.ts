/**
 * Migration safety tests — the guarantees promised in migrate-legacy.ts.
 * Runs on an in-memory IndexedDB (fake-indexeddb) + a localStorage stub.
 */
import "./test-setup";
import { localStorageStub } from "./test-setup";
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { db } from "./db";
import { migrateLegacyLocalStorage, MIGRATION_FLAG } from "./migrate-legacy";

const ls = localStorageStub();

function seedV1() {
  ls.setItem("greecheck.history", JSON.stringify({
    state: { entries: [
      { barcode: "111", name: "Yaourt", score: 72, verdict: "Bon choix", scannedAt: 1000 },
      { barcode: "222", name: "Soda", score: 21, verdict: "À éviter", scannedAt: 2000 }
    ] }, version: 0
  }));
  ls.setItem("greecheck.favorites", JSON.stringify({
    state: { items: [{ barcode: "111", name: "Yaourt", score: 72, verdict: "Bon choix", scannedAt: 1000 }] }, version: 0
  }));
  ls.setItem("greecheck.basket.v2", JSON.stringify({
    state: { items: [{ product: { barcode: "333", name: "Pain", nutriments: {}, source: "openfoodfacts" }, score: 60, addedAt: 3000 }] }, version: 0
  }));
  ls.setItem("greecheck.battle.v2", JSON.stringify({
    state: { items: [{ barcode: "444", name: "Jus", nutriments: {}, source: "openfoodfacts" }] }, version: 0
  }));
  ls.setItem("greecheck.preferences", JSON.stringify({
    state: { language: "fr", goals: ["reduce_sugar"], avoidAllergens: [], preferBio: true,
      preferHalal: false, preferVegan: false, preferVegetarian: false, reduceSugar: true,
      reduceSalt: false, reduceAdditives: false, reduceUltraProcessed: false,
      increaseProtein: false, increaseFiber: false }, version: 0
  }));
}

async function wipeAll() {
  assert.ok(db);
  await Promise.all(db.tables.map((t) => t.clear()));
  for (const k of Object.keys(ls).filter((k) => k.startsWith("greecheck"))) ls.removeItem(k);
}

beforeEach(wipeAll);

test("migrates all V1 collections and only then deletes the source keys", async () => {
  seedV1();
  const result = await migrateLegacyLocalStorage();
  assert.equal(result, "done");
  assert.equal(await db!.history.count(), 2);
  assert.equal(await db!.favorites.count(), 1);
  assert.equal(await db!.cart.count(), 1);
  assert.equal(await db!.battle.count(), 1);
  const prefs = await db!.kv.get("preferences");
  assert.equal((prefs?.value as { preferBio: boolean }).preferBio, true);
  // source keys removed after success
  assert.equal(ls.getItem("greecheck.history"), null);
  assert.equal(ls.getItem("greecheck.preferences"), null);
  // flag set
  assert.equal((await db!.kv.get(MIGRATION_FLAG))?.value, true);
});

test("is idempotent: a second run is a no-op and does not duplicate rows", async () => {
  seedV1();
  assert.equal(await migrateLegacyLocalStorage(), "done");
  // simulate old data reappearing (e.g. restored backup) — must be ignored
  seedV1();
  assert.equal(await migrateLegacyLocalStorage(), "already");
  assert.equal(await db!.history.count(), 2);
});

test("already-migrated users are not migrated again (flag respected)", async () => {
  await db!.kv.put({ key: MIGRATION_FLAG, value: true });
  seedV1();
  assert.equal(await migrateLegacyLocalStorage(), "already");
  assert.equal(await db!.history.count(), 0);
  // source untouched: flag was set, so V1 keys are left alone
  assert.notEqual(ls.getItem("greecheck.history"), null);
});

test("a failed destination write preserves ALL V1 source data and stays restartable", async () => {
  seedV1();
  // simulate quota / write failure on one destination table
  const table = db!.history as unknown as { bulkPut: (x: unknown[]) => Promise<unknown> };
  const original = table.bulkPut.bind(db!.history);
  table.bulkPut = () => Promise.reject(new Error("QuotaExceededError"));
  try {
    assert.equal(await migrateLegacyLocalStorage(), "failed");
  } finally {
    table.bulkPut = original;
  }
  // no source key deleted, no flag set
  assert.notEqual(ls.getItem("greecheck.history"), null);
  assert.notEqual(ls.getItem("greecheck.preferences"), null);
  assert.equal(await db!.kv.get(MIGRATION_FLAG), undefined);
  // restart succeeds once the failure condition is gone
  assert.equal(await migrateLegacyLocalStorage(), "done");
  assert.equal(await db!.history.count(), 2);
  assert.equal(ls.getItem("greecheck.history"), null);
});

test("corrupted or malformed V1 values are skipped without aborting the migration", async () => {
  ls.setItem("greecheck.history", "{not-json![");
  ls.setItem("greecheck.favorites", JSON.stringify({ state: { items: "not-an-array" } }));
  ls.setItem("greecheck.basket.v2", JSON.stringify({ state: { items: [{ product: null, score: 1 }, { product: { barcode: "999", name: "Ok", nutriments: {}, source: "openfoodfacts" }, score: 50, addedAt: 1 }] } }));
  assert.equal(await migrateLegacyLocalStorage(), "done");
  assert.equal(await db!.history.count(), 0);   // corrupted → skipped
  assert.equal(await db!.favorites.count(), 0); // malformed → skipped
  assert.equal(await db!.cart.count(), 1);      // valid entry among invalid ones kept
  assert.equal((await db!.kv.get(MIGRATION_FLAG))?.value, true);
});
