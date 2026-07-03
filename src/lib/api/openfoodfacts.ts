/**
 * Open Food Facts integration (server-side fetchers).
 * No data is persisted server-side: every call is a stateless proxy/fetch.
 * Raw→Product mapping lives in `product-normalizer.ts`.
 */
import type { Product, Confidence, ProductState } from "@/types/product";
import { OFF_FIELDS, mapOffProduct, assessProduct, type OffRawProduct } from "@/lib/api/product-normalizer";

// Re-exported for existing consumers of this module.
export { OFF_FIELDS, mapOffProduct, assessProduct };
export type { OffRawProduct };

const BASE = process.env.NEXT_PUBLIC_OFF_BASE_URL || "https://world.openfoodfacts.org";
const USER_AGENT = process.env.OFF_USER_AGENT || "GreeCheck/0.1 (https://greecheck.app)";

export type ProductResult =
  | { status: Exclude<ProductState, "not_found">; product: Product; confidence: Confidence; missing: string[] }
  | { status: "not_found"; barcode: string };

async function offFetch(url: string, revalidate = 60 * 60): Promise<Response> {
  return fetch(url, {
    headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
    next: { revalidate }
  });
}

export async function fetchProductByBarcode(barcode: string): Promise<ProductResult> {
  const code = barcode.replace(/\D/g, "");
  if (!code) return { status: "not_found", barcode };

  const url = `${BASE}/api/v2/product/${encodeURIComponent(code)}.json?fields=${OFF_FIELDS}`;
  const res = await offFetch(url);
  if (!res.ok) throw new Error(`OFF responded ${res.status}`);

  const data = (await res.json()) as { status?: number; product?: OffRawProduct };
  if (data.status !== 1 || !data.product) return { status: "not_found", barcode: code };

  const product = mapOffProduct(data.product);
  const { status, confidence, missing } = assessProduct(product);
  return { status, product, confidence, missing };
}

export interface SearchResult {
  count: number;
  page: number;
  pageSize: number;
  products: Product[];
}

export async function searchProducts(query: string, page = 1, pageSize = 20): Promise<SearchResult> {
  const params = new URLSearchParams({
    search_terms: query,
    search_simple: "1",
    action: "process",
    json: "1",
    page: String(page),
    page_size: String(pageSize),
    fields: OFF_FIELDS
  });
  const url = `${BASE}/cgi/search.pl?${params.toString()}`;
  const res = await offFetch(url, 60 * 30);
  if (!res.ok) throw new Error(`OFF search responded ${res.status}`);

  const data = (await res.json()) as { count?: number; page?: number; page_size?: number; products?: OffRawProduct[] };
  const products = (data.products ?? [])
    .map(mapOffProduct)
    .filter((p) => p.barcode && p.name);

  return {
    count: data.count ?? products.length,
    page: data.page ?? page,
    pageSize: data.page_size ?? pageSize,
    products
  };
}

/**
 * Find products in the same category — used to suggest healthier alternatives.
 * Sorted by popularity so suggestions are recognizable; ranking by GreeScore
 * happens client-side (it needs the user's local preferences).
 */
export async function searchByCategory(category: string, pageSize = 16): Promise<SearchResult> {
  const params = new URLSearchParams({
    action: "process",
    json: "1",
    page_size: String(pageSize),
    tagtype_0: "categories",
    tag_contains_0: "contains",
    tag_0: category,
    sort_by: "unique_scans_n",
    fields: OFF_FIELDS
  });
  const url = `${BASE}/cgi/search.pl?${params.toString()}`;
  const res = await offFetch(url, 60 * 60);
  if (!res.ok) throw new Error(`OFF category search responded ${res.status}`);

  const data = (await res.json()) as { count?: number; page?: number; page_size?: number; products?: OffRawProduct[] };
  const products = (data.products ?? []).map(mapOffProduct).filter((p) => p.barcode && p.name);
  return { count: data.count ?? products.length, page: 1, pageSize, products };
}
