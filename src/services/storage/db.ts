"use client";
/**
 * GreeCheck local database (IndexedDB via Dexie).
 *
 * PRIVACY-FIRST: everything in here lives ON THE DEVICE only. There is no
 * account, no server-side storage, no sync. Access goes exclusively through
 * the repositories in `./repositories` — never import `db` from UI code.
 */
import Dexie, { type Table } from "dexie";
import type { ProductResult } from "@/services/api/openfoodfacts";
import type { ScanHistoryItem, FavoriteItem } from "@/domains/library/model";
import type { CartItem } from "@/domains/cart/model";
import type { BattleDraftItem } from "@/domains/battle/model";

export interface CachedProduct {
  barcode: string;
  result: ProductResult;
  cachedAt: number;
}

/** Small key-value rows for singletons (preferences, onboarding, meta flags). */
export interface KvRow {
  key: string;
  value: unknown;
}

class GreeCheckDB extends Dexie {
  products!: Table<CachedProduct, string>;
  history!: Table<ScanHistoryItem, string>;
  favorites!: Table<FavoriteItem, string>;
  cart!: Table<CartItem, string>;
  battle!: Table<BattleDraftItem, string>;
  kv!: Table<KvRow, string>;

  constructor() {
    super("greecheck");
    // v1 (legacy): product cache only.
    this.version(1).stores({
      products: "barcode, cachedAt"
    });
    // v2: local-first foundation — every user collection moves to IndexedDB.
    this.version(2).stores({
      products: "barcode, cachedAt",
      history: "barcode, scannedAt, score",
      favorites: "barcode, scannedAt",
      cart: "product.barcode, addedAt",
      battle: "product.barcode, addedAt",
      kv: "key"
    });
  }
}

/** `null` on the server — repositories guard every access. */
export const db: GreeCheckDB | null = typeof window !== "undefined" ? new GreeCheckDB() : null;

export const PRODUCT_TTL = 1000 * 60 * 60 * 24; // 24h
