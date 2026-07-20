"use client";
/**
 * One-time migration of V1 zustand-persist localStorage data → IndexedDB.
 *
 * Safety contract (unit-tested in migrate-legacy.test.ts):
 *   • idempotent — a "legacyMigrated" flag in the kv table guards re-entry;
 *   • copy-then-verify-then-delete — V1 keys are removed ONLY after every
 *     destination write has completed and row counts have been verified;
 *   • a partial failure leaves the flag unset and the source data intact,
 *     so the migration safely restarts on the next boot;
 *   • corrupted / malformed V1 JSON is skipped without aborting the rest.
 */
import { db } from "./db";
import type { ScanHistoryItem, FavoriteItem } from "@/domains/library/model";
import type { CartItem } from "@greecheck/domain/cart/model";
import type { LocalPreferences } from "@greecheck/domain/criteria/model";
import type { Product } from "@greecheck/domain/product/model";

export const LEGACY_KEYS = [
  "greecheck.history",
  "greecheck.favorites",
  "greecheck.basket.v2",
  "greecheck.battle.v2",
  "greecheck.preferences",
  // pre-V2 leftovers with no IndexedDB destination:
  "greecheck.consent",
  "greecheck.shopping-lists",
  "greecheck.battle",
  "greecheck.basket"
] as const;

export const MIGRATION_FLAG = "meta.legacyMigrated";

/** Parse one zustand-persist localStorage payload, defensively. */
function readPersisted<T>(key: string): T | undefined {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return undefined;
    const parsed = JSON.parse(raw) as { state?: T };
    return typeof parsed === "object" && parsed !== null ? parsed.state : undefined;
  } catch {
    return undefined; // corrupted JSON → treated as "nothing to migrate" for that key
  }
}

const isItem = (x: unknown): x is Record<string, unknown> =>
  typeof x === "object" && x !== null;

export type MigrationResult = "done" | "already" | "failed" | "skipped";

/**
 * Runs the migration. Never throws.
 * Returns "failed" when a destination write failed — in that case NO source
 * key has been deleted and the flag is NOT set (restart on next boot).
 */
export async function migrateLegacyLocalStorage(): Promise<MigrationResult> {
  if (!db || typeof localStorage === "undefined") return "skipped";

  try {
    if ((await db.kv.get(MIGRATION_FLAG))?.value === true) return "already";
  } catch {
    return "failed"; // kv unreadable — do nothing destructive
  }

  // ── Read every source defensively (corrupted values → skipped) ──
  const asArray = (x: unknown): unknown[] => (Array.isArray(x) ? x : []);
  const history = asArray(readPersisted<{ entries?: unknown[] }>("greecheck.history")?.entries)
    .filter(isItem)
    .filter((e) => typeof e.barcode === "string") as unknown as ScanHistoryItem[];
  const favorites = asArray(readPersisted<{ items?: unknown[] }>("greecheck.favorites")?.items)
    .filter(isItem)
    .filter((e) => typeof e.barcode === "string") as unknown as FavoriteItem[];
  const cart = asArray(readPersisted<{ items?: unknown[] }>("greecheck.basket.v2")?.items)
    .filter(isItem)
    .filter((e) => isItem(e.product) && typeof (e.product as Record<string, unknown>).barcode === "string") as unknown as CartItem[];
  const battle = asArray(readPersisted<{ items?: unknown[] }>("greecheck.battle.v2")?.items)
    .filter(isItem)
    .filter((p) => typeof p.barcode === "string") as unknown as Product[];
  const prefs = readPersisted<LocalPreferences>("greecheck.preferences");

  // ── Copy: direct table writes (NOT the error-swallowing repo helpers) ──
  try {
    if (history.length) await db.history.bulkPut(history);
    if (favorites.length) await db.favorites.bulkPut(favorites);
    if (cart.length) await db.cart.bulkPut(cart);
    if (battle.length) {
      let order = Date.now();
      await db.battle.bulkPut(battle.map((product) => ({ product, addedAt: order++ })));
    }
    if (prefs && Array.isArray(prefs.goals)) {
      await db.kv.put({ key: "preferences", value: prefs });
    }

    // ── Verify: every migrated row must be readable back ──
    const [h, f, c, b] = await Promise.all([
      db.history.count(),
      db.favorites.count(),
      db.cart.count(),
      db.battle.count()
    ]);
    if (h < history.length || f < favorites.length || c < cart.length || b < battle.length) {
      return "failed"; // incomplete write — keep source, no flag
    }

    await db.kv.put({ key: MIGRATION_FLAG, value: true });
  } catch {
    return "failed"; // any write/verify error — keep source, no flag
  }

  // ── Delete: only after the flag write succeeded ──
  for (const key of LEGACY_KEYS) {
    try {
      localStorage.removeItem(key);
    } catch {
      /* storage unavailable — keys will be re-checked (and ignored) next boot */
    }
  }
  return "done";
}
