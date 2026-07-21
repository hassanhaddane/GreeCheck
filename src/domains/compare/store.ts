"use client";
/**
 * GreeCompare store — the user-facing comparison draft (2–3 products).
 *
 * MIGRATION SAFETY: this deliberately re-exports the existing Battle store,
 * which persists to the `battle` IndexedDB table via `battleRepo`. Reusing the
 * same store means a user's existing local Battle selection appears in
 * GreeCompare with NO data copy and NO risk of loss — the rename is
 * user-facing only. The internal table/repo keep their `battle` name so no
 * Dexie schema migration is needed (see migration.test.ts).
 */
export {
  useBattleStore as useCompareStore,
  BATTLE_MAX as COMPARE_MAX,
  type AddResult
} from "@/domains/battle/store";
