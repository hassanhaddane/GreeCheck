/**
 * GreeCart domain model — cart items live ONLY on the device.
 * GreeCart is a basket ANALYZER, not an e-commerce cart.
 */
import type { Product } from "@/domains/product/model";

/** One product in the cart (GreeScore snapshot at add time). */
export interface CartItem {
  product: Product;
  score: number;
  addedAt: number;
}
