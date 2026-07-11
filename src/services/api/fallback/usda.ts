/**
 * USDA FoodData Central — INACTIVE fallback boundary.
 *
 * FDC covers US branded foods (some GTIN/UPC coverage). A future justified
 * use is barcode lookup for US products missing from OFF. Activating it
 * requires an API key strategy, normalization mapping into `Product`,
 * and explicit provenance in the UI. Never a permanent internal database.
 */
import type { ProductSourceAdapter } from "../sources";

export const usdaAdapter: ProductSourceAdapter = {
  id: "usda",
  supportsBarcode: true,
  active: false,
  justification: "US-branded coverage — activate only when OFF misses become measurable; requires key management."
};
