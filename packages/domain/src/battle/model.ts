/**
 * Scan Battle domain model — battle drafts live ONLY on the device.
 */
import type { Product } from "../product/model";

/** One contender in the current battle draft (insertion order preserved). */
export interface BattleDraftItem {
  product: Product;
  addedAt: number;
}
