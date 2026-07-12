/**
 * Ciqual (ANSES) — INACTIVE fallback boundary.
 *
 * Ciqual is a composition table for GENERIC foods; it has no retail barcodes,
 * so it can never answer a scan directly. A future justified use is enriching
 * generic-category nutrition when OFF has none. Activating it requires:
 *   1. a category → Ciqual food mapping,
 *   2. clear UI provenance ("valeurs génériques Ciqual"),
 *   3. and keeping OFF as the identity source.
 */
import type { ProductSourceAdapter } from "../sources";

export const ciqualAdapter: ProductSourceAdapter = {
  id: "ciqual",
  supportsBarcode: false,
  active: false,
  justification: "Generic composition table (no barcodes) — reserved for category-level nutrition enrichment."
};
