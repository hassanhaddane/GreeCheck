import { gtinIdentity } from "@greecheck/domain/product/gtin";
import { nutrientConflicts } from "@greecheck/domain/product/provenance";
import type { ProductResult } from "./product-contracts";
import { fetchProductByBarcode } from "./openfoodfacts";
import { fetchUsdaProduct } from "./fallback/usda";
import { ApiError } from "./errors";
import { cachedRequests } from "./upstream";

type ProductFetcher = (barcode: string) => Promise<ProductResult>;

/** OFF stays primary. USDA is a fallback for a miss and a second reading for partial OFF records. */
export async function resolveProductSources(
  barcode: string,
  primary: ProductFetcher,
  secondary?: ProductFetcher
): Promise<ProductResult> {
  const result = await primary(barcode);
  if (!secondary || result.status === "complete") return result;
  if (result.status === "not_found") return secondary(barcode);
  try {
    const other = await secondary(barcode);
    if (other.status === "not_found") return result;
    const conflicts = nutrientConflicts(result.product, other.product);
    if (conflicts.length) {
      return { ...result, product: { ...result.product, dataState: "CONFLICTED", conflicts } };
    }
  } catch {
    // Secondary failures must not discard the partial primary record.
  }
  return result;
}

const productCache = cachedRequests<ProductResult>(500, result => result.status === "not_found" ? 60_000 : 5 * 60_000);

export function lookupBarcode(barcode: string): Promise<ProductResult> {
  const identity = gtinIdentity(barcode);
  if (!identity) return Promise.reject(new ApiError("invalid_request", "Invalid GTIN"));

  const apiKey = process.env.USDA_FDC_API_KEY?.trim();
  const secondary: ProductFetcher | undefined = apiKey ? code => fetchUsdaProduct(code, apiKey) : undefined;
  // Keep the requested barcode in the compatibility envelope. Different GS1
  // padding representations may have distinct stored product URLs.
  const key = JSON.stringify([barcode, process.env.OFF_PRODUCT_API_VERSION, Boolean(secondary)]);
  return productCache(key, () => resolveProductSources(barcode, fetchProductByBarcode, secondary));
}
