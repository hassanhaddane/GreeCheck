/**
 * Types for data that lives ONLY on the device (localStorage / IndexedDB).
 * Privacy-first: none of these shapes is ever sent to a server.
 */
import type { Product } from "@/types/product";
import type { GreeScore } from "@/types/scoring";

/** One entry in the local scan history (also reused for favorites). */
export interface ScanHistoryItem {
  barcode: string;
  name: string;
  imageUrl?: string;
  score: number;
  verdict: string;
  scannedAt: number;
  favorite?: boolean;
}

/** A favorite is a pinned history item. */
export type FavoriteItem = ScanHistoryItem;

/** One product in the smart basket (GreeScore snapshot at add time). */
export interface BasketItem {
  product: Product;
  score: number;
  addedAt: number;
}

/** One product in a shopping list. */
export interface ShoppingItem {
  product: Product;
  score: number;
  checked: boolean;
  addedAt: number;
}

export interface ShoppingList {
  id: string;
  name: string;
  createdAt: number;
  items: ShoppingItem[];
}

/** A suggested healthier alternative with explained reasons. */
export interface ProductAlternative {
  product: Product;
  gree: GreeScore;
  /** Ordered i18n reason tokens explaining why this beats the current product. */
  reasons: string[];
}
