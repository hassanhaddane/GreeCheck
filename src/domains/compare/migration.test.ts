/**
 * GreeCompare data-migration safety.
 *
 * The Battle→GreeCompare rename is user-facing only. This test pins the
 * invariants that make existing local Battle data appear in GreeCompare with
 * zero copy and zero loss:
 *   1. the compare store IS the battle store (same underlying zustand store);
 *   2. the max-slot constant is preserved;
 *   3. the legacy-migration key list still carries the Battle localStorage keys
 *      (so any pre-IndexedDB Battle draft is migrated, not dropped).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { useCompareStore, COMPARE_MAX } from "./store";
import { useBattleStore, BATTLE_MAX } from "@/domains/battle/store";
import { LEGACY_KEYS } from "@/services/storage/migrate-legacy";

test("GreeCompare reads the exact same store as Battle (no data copy, no loss)", () => {
  assert.equal(useCompareStore, useBattleStore);
});

test("slot capacity is preserved across the rename", () => {
  assert.equal(COMPARE_MAX, BATTLE_MAX);
  assert.equal(COMPARE_MAX, 3);
});

test("legacy Battle localStorage keys remain in the migration set", () => {
  assert.ok(LEGACY_KEYS.includes("greecheck.battle.v2"));
  assert.ok(LEGACY_KEYS.includes("greecheck.battle"));
});
