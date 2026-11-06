import type { Product } from "@greecheck/domain/product/model";
import { OFF_FIELDS } from "@greecheck/domain/product/normalizer";
import { gtinIdentity } from "@greecheck/domain/product/gtin";
import { ApiError } from "./errors";
import { offProduct } from "./off-normalization";
import { asProductResult, type DataLocale, type ProductResult, type SearchResult } from "./product-contracts";
import { cachedRequests, invalidPayload, jsonObject, quantity, record, upstream } from "./upstream";

const productRequest = upstream(15);
const structuredRequest = upstream(10);
const textRequest = upstream(10);
const searchCache = cachedRequests<SearchResult>(200, () => 10 * 60_000);

const offBase = () => process.env.OFF_BASE_URL || process.env.NEXT_PUBLIC_OFF_BASE_URL || "https://world.openfoodfacts.org";
const searchBase = () => process.env.OFF_SEARCH_BASE_URL || "https://search.openfoodfacts.org";
const headers = () => ({ "User-Agent": process.env.OFF_USER_AGENT || process.env.OPENFOODFACTS_USER_AGENT || "GreeCheck/3.0 (+https://github.com/hassanhaddane/GreeCheck)", Accept: "application/json" });
const timeout = 5000;

/** v3 by default; v2 is an explicit, temporary rollback switch. */
export async function fetchProductByBarcode(code: string): Promise<ProductResult> {
  if (!gtinIdentity(code)) throw new ApiError("invalid_request", "Invalid GTIN");
  const v2 = process.env.OFF_PRODUCT_API_VERSION === "v2";
  const version = v2 ? "v2" : "v3";
  const url = new URL("/api/" + version + "/product/" + code, offBase());
  url.searchParams.set("fields", OFF_FIELDS + ",product_quantity_unit" + (v2 ? "" : ",nutrition"));
  if (!v2) url.searchParams.set("product_type", "food");
  const response = await productRequest(url, headers(), timeout);
  if (!response.ok && response.status !== 404) throw new ApiError("upstream", "OFF product request failed");
  const body = await jsonObject(response);
  if (body.code !== undefined && (typeof body.code !== "string" || gtinIdentity(body.code) !== gtinIdentity(code))) invalidPayload();
  const resultId = record(body.result)?.id;
  if (v2 ? body.status === 0 : response.status === 404 && resultId === "product_not_found") {
    return { status: "not_found", barcode: code };
  }
  if (!response.ok || (v2 ? body.status !== 1 : body.status !== "success" || resultId !== "product_found")) invalidPayload();
  const product = offProduct(body.product, "product-api-" + version, code);
  if (!product) return invalidPayload();
  return asProductResult(product);
}

async function searchResults(response: Response, field: "hits" | "products", version: string, page: number, pageSize: number): Promise<SearchResult> {
  if (!response.ok) throw new ApiError("upstream", "OFF search request failed");
  const body = await jsonObject(response);
  const entries = body[field];
  const count = quantity(body.count);
  if (!Array.isArray(entries) || count === undefined || !Number.isInteger(count)) return invalidPayload();
  const products = entries.map(entry => offProduct(entry, version)).filter((p): p is Product => Boolean(p?.name));
  if (entries.length && !products.length && entries.every(entry => !record(entry)?.code)) invalidPayload();
  return { count, page, pageSize, hasMore: page * pageSize < count, products };
}

export function searchProducts(query: string, page = 1, pageSize = 20, locale: DataLocale = "fr"): Promise<SearchResult> {
  return searchCache(JSON.stringify(["text", query, page, pageSize, locale]), async () => {
    const url = new URL("/search", searchBase());
    url.search = new URLSearchParams({
      q: query, langs: [...new Set([locale, "en", "fr"])].join(","), page: String(page), page_size: String(pageSize), fields: OFF_FIELDS
    }).toString();
    try {
      return await searchResults(await textRequest(url, headers(), timeout), "hits", "search-a-licious", page, pageSize);
    } catch (error) {
      if (error instanceof ApiError && (error.code === "rate_limited" || error.code === "unavailable")) throw error;
      const legacy = new URL("/cgi/search.pl", offBase());
      legacy.search = new URLSearchParams({
        search_terms: query, search_simple: "1", action: "process", json: "1", lc: locale,
        page: String(page), page_size: String(pageSize), fields: OFF_FIELDS
      }).toString();
      return searchResults(await structuredRequest(legacy, headers(), timeout), "products", "legacy-text-search", page, pageSize);
    }
  });
}

export function searchByCategory(category: string, pageSize = 16): Promise<SearchResult> {
  return searchCache(JSON.stringify(["category", category, pageSize]), async () => {
    const url = new URL("/api/v2/search", offBase());
    url.search = new URLSearchParams({
      categories_tags: category.includes(":") ? category : "en:" + category.replaceAll(" ", "-"), page_size: String(pageSize), sort_by: "unique_scans_n", fields: OFF_FIELDS
    }).toString();
    return searchResults(await structuredRequest(url, headers(), timeout), "products", "structured-search-v2", 1, pageSize);
  });
}
