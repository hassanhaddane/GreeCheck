/**
 * Product source adapter boundary.
 *
 * Open Food Facts is the primary and only ACTIVE source. Ciqual and USDA
 * FoodData Central exist as EXPLICIT boundaries only: they may be activated
 * later as justified fallbacks (e.g. generic nutrition for unbranded foods),
 * never as a permanent internal product database.
 */
import type { ProductResult } from "./openfoodfacts";
import { fetchProductByBarcode } from "./openfoodfacts";
import { ciqualAdapter } from "./fallback/ciqual";
import { usdaAdapter } from "./fallback/usda";

export interface ProductSourceAdapter {
  id: "openfoodfacts" | "ciqual" | "usda";
  /** Whether this source can resolve a retail barcode at all. */
  supportsBarcode: boolean;
  /** Inactive adapters must say why they are not used yet. */
  active: boolean;
  justification?: string;
  fetchByBarcode?(barcode: string): Promise<ProductResult>;
}

export const offAdapter: ProductSourceAdapter = {
  id: "openfoodfacts",
  supportsBarcode: true,
  active: true,
  fetchByBarcode: fetchProductByBarcode
};

/** Ordered source chain — only active, barcode-capable adapters are tried. */
export const PRODUCT_SOURCES: ProductSourceAdapter[] = [offAdapter, ciqualAdapter, usdaAdapter];

export async function lookupBarcode(barcode: string): Promise<ProductResult> {
  const chain = PRODUCT_SOURCES.filter((s) => s.active && s.supportsBarcode && s.fetchByBarcode);
  let last: ProductResult = { status: "not_found", barcode };
  for (const source of chain) {
    last = await source.fetchByBarcode!(barcode);
    if (last.status !== "not_found") return last;
  }
  return last;
}
