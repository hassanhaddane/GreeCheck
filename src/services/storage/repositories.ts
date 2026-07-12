"use client";
/**
 * Local repositories — the ONLY layer allowed to touch IndexedDB.
 *
 * UI components and pages must go through the feature stores (Zustand),
 * which delegate persistence here. Engines never import this module.
 * Every method is SSR-safe (no-op / empty result on the server).
 */
import { db, PRODUCT_TTL, type CachedProduct } from "./db";
import type { ProductResult } from "@/services/api/openfoodfacts";
import type { ScanHistoryItem, FavoriteItem } from "@/domains/library/model";
import type { CartItem } from "@/domains/cart/model";
import type { BattleDraftItem } from "@/domains/battle/model";
import type { LocalPreferences } from "@/domains/criteria/model";

const HISTORY_MAX = 500;

/* ─────────────────────────── product cache ─────────────────────────── */

export const productCacheRepo = {
  /** Returns a fresh cached result, or `undefined` (miss/stale/unavailable). */
  async get(barcode: string): Promise<ProductResult | undefined> {
    if (!db) return undefined;
    try {
      const row = await db.products.get(barcode);
      if (row && Date.now() - row.cachedAt < PRODUCT_TTL) return row.result;
    } catch {
      /* cache unavailable — treat as miss */
    }
    return undefined;
  },
  /** Returns a cached result of ANY age (offline fallback), with its age. */
  async getStale(barcode: string): Promise<{ result: ProductResult; cachedAt: number } | undefined> {
    if (!db) return undefined;
    try {
      const row = await db.products.get(barcode);
      return row ? { result: row.result, cachedAt: row.cachedAt } : undefined;
    } catch {
      return undefined;
    }
  },
  async put(barcode: string, result: ProductResult): Promise<void> {
    if (!db) return;
    const row: CachedProduct = { barcode, result, cachedAt: Date.now() };
    await db.products.put(row).catch(() => {});
  },
  async clear(): Promise<void> {
    await db?.products.clear().catch(() => {});
  }
};

/* ──────────────────────────── scan history ─────────────────────────── */

export const historyRepo = {
  async all(): Promise<ScanHistoryItem[]> {
    if (!db) return [];
    try {
      return await db.history.orderBy("scannedAt").reverse().toArray();
    } catch {
      return [];
    }
  },
  async put(item: ScanHistoryItem): Promise<void> {
    if (!db) return;
    try {
      await db.history.put(item);
      // Cap the history size (oldest evicted first).
      const count = await db.history.count();
      if (count > HISTORY_MAX) {
        const oldest = await db.history.orderBy("scannedAt").limit(count - HISTORY_MAX).primaryKeys();
        await db.history.bulkDelete(oldest);
      }
    } catch {
      /* persistence best-effort */
    }
  },
  async remove(barcode: string): Promise<void> {
    await db?.history.delete(barcode).catch(() => {});
  },
  async clear(): Promise<void> {
    await db?.history.clear().catch(() => {});
  }
};

/* ───────────────────────────── favorites ───────────────────────────── */

export const favoritesRepo = {
  async all(): Promise<FavoriteItem[]> {
    if (!db) return [];
    try {
      return await db.favorites.orderBy("scannedAt").reverse().toArray();
    } catch {
      return [];
    }
  },
  async put(item: FavoriteItem): Promise<void> {
    await db?.favorites.put(item).catch(() => {});
  },
  async remove(barcode: string): Promise<void> {
    await db?.favorites.delete(barcode).catch(() => {});
  },
  async clear(): Promise<void> {
    await db?.favorites.clear().catch(() => {});
  }
};

/* ────────────────────────────── GreeCart ───────────────────────────── */

export const cartRepo = {
  async all(): Promise<CartItem[]> {
    if (!db) return [];
    try {
      return await db.cart.orderBy("addedAt").toArray();
    } catch {
      return [];
    }
  },
  async put(item: CartItem): Promise<void> {
    await db?.cart.put(item).catch(() => {});
  },
  async remove(barcode: string): Promise<void> {
    await db?.cart.delete(barcode).catch(() => {});
  },
  async clear(): Promise<void> {
    await db?.cart.clear().catch(() => {});
  }
};

/* ─────────────────────────── Battle drafts ─────────────────────────── */

export const battleRepo = {
  async all(): Promise<BattleDraftItem[]> {
    if (!db) return [];
    try {
      return await db.battle.orderBy("addedAt").toArray();
    } catch {
      return [];
    }
  },
  async put(item: BattleDraftItem): Promise<void> {
    await db?.battle.put(item).catch(() => {});
  },
  async remove(barcode: string): Promise<void> {
    await db?.battle.delete(barcode).catch(() => {});
  },
  async clear(): Promise<void> {
    await db?.battle.clear().catch(() => {});
  }
};

/* ──────────────────────── kv-backed singletons ─────────────────────── */

async function kvGet<T>(key: string): Promise<T | undefined> {
  if (!db) return undefined;
  try {
    const row = await db.kv.get(key);
    return row?.value as T | undefined;
  } catch {
    return undefined;
  }
}
async function kvSet(key: string, value: unknown): Promise<void> {
  await db?.kv.put({ key, value }).catch(() => {});
}
async function kvRemove(key: string): Promise<void> {
  await db?.kv.delete(key).catch(() => {});
}

export const preferencesRepo = {
  get: () => kvGet<LocalPreferences>("preferences"),
  set: (prefs: LocalPreferences) => kvSet("preferences", prefs),
  clear: () => kvRemove("preferences")
};

export interface OnboardingState {
  seen: boolean;
  completedAt?: number;
}

export const onboardingRepo = {
  get: () => kvGet<OnboardingState>("onboarding"),
  set: (state: OnboardingState) => kvSet("onboarding", state),
  clear: () => kvRemove("onboarding")
};

/** Internal meta flags (schema/migration bookkeeping). */
export const metaRepo = {
  get: <T>(key: string) => kvGet<T>(`meta.${key}`),
  set: (key: string, value: unknown) => kvSet(`meta.${key}`, value)
};
