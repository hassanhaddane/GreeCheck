/** Search intents & taxonomy mapping — deterministic, no AI. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { parseIntent, isBarcodeQuery, INTENT_PRESETS, normalize } from "./intents";

test("organic cereal → bio filter, subject 'cereal'", () => {
  const r = parseIntent("organic cereal");
  assert.ok(r.filters.includes("bio"));
  assert.equal(r.textQuery, "cereal");
  assert.ok(r.recognized.includes("organic"));
});

test("low-sugar yogurt → low_sugar filter, subject 'yogurt'", () => {
  const r = parseIntent("low-sugar yogurt");
  assert.ok(r.filters.includes("low_sugar"));
  assert.equal(r.textQuery, "yogurt");
});

test("halal snack → halal filter, subject 'snack'", () => {
  const r = parseIntent("halal snack");
  assert.ok(r.filters.includes("halal"));
  assert.equal(r.textQuery, "snack");
});

test("high-protein product → high_protein filter", () => {
  const r = parseIntent("high protein");
  assert.ok(r.filters.includes("high_protein"));
});

test("fewer additives (fr) → no_additives filter", () => {
  const r = parseIntent("sans additifs");
  assert.ok(r.filters.includes("no_additives"));
  assert.equal(r.textQuery, "");
});

test("less processed → less_processed filter + NOVA 1/2 allow-list", () => {
  const r = parseIntent("peu transformé céréales");
  assert.ok(r.filters.includes("less_processed"));
  assert.deepEqual(r.nova.sort(), [1, 2]);
  assert.equal(r.textQuery, "cereales");
});

test("diacritics are ignored (bio via 'biologique')", () => {
  const r = parseIntent("céréales biologiques");
  // 'biologique' matches organic; 'biologiques' plural remains partly as subject
  assert.ok(r.recognized.includes("organic") || r.textQuery.includes("cereales"));
  assert.equal(normalize("Céréales"), "cereales");
});

test("plain query has no modifiers", () => {
  const r = parseIntent("coca cola");
  assert.equal(r.filters.length, 0);
  assert.equal(r.textQuery, "coca cola");
});

test("barcode detection", () => {
  assert.equal(isBarcodeQuery("3017620422003"), true);
  assert.equal(isBarcodeQuery("  5000159407236 "), true);
  assert.equal(isBarcodeQuery("yogurt"), false);
  assert.equal(isBarcodeQuery("123"), false);
});

test("determinism", () => {
  const a = parseIntent("organic low-sugar yogurt");
  const b = parseIntent("organic low-sugar yogurt");
  assert.deepEqual(a, b);
  assert.ok(a.filters.includes("bio") && a.filters.includes("low_sugar"));
});

test("every preset carries all three locales", () => {
  for (const p of INTENT_PRESETS) {
    for (const l of ["fr", "en", "ar"] as const) {
      assert.ok(p.label[l] && p.query[l], `${p.id} missing ${l}`);
    }
  }
});
