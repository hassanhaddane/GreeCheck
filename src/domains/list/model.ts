/**
 * Shopping list — the humble end of the decision loop: products the user
 * decided to buy. Local-only (IndexedDB KV), checkable in-store.
 * Distinct from GreeCart, which ANALYZES a basket; the list is what you
 * carry to the shop.
 */
import type { ScoreGrade } from "@greecheck/domain/scoring/types";

export interface ShoppingListItem {
  /** Stable id (barcode when known, otherwise a local id for free-text items). */
  id: string;
  name: string;
  barcode?: string;
  imageUrl?: string;
  /** GreeScore grade at add time, when the item came from a scored product. */
  grade?: ScoreGrade;
  checked: boolean;
  addedAt: number;
}
