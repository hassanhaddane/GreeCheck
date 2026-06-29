"use client";
import Dexie, { type Table } from "dexie";
import type { ProductResult } from "@/lib/api/openfoodfacts";

export interface CachedProduct {
  barcode: string;
  result: ProductResult;
  cachedAt: number;
}

// Local-only cache. Nothing leaves the device; this just avoids refetching.
class GreeCheckDB extends Dexie {
  products!: Table<CachedProduct, string>;

  constructor() {
    super("greecheck");
    this.version(1).stores({
      products: "barcode, cachedAt"
    });
  }
}

export const db = typeof window !== "undefined" ? new GreeCheckDB() : (null as unknown as GreeCheckDB);

export const PRODUCT_TTL = 1000 * 60 * 60 * 24; // 24h
