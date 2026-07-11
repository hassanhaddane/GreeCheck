/**
 * Open Food Facts integration (server-side fetchers).
 * No data is persisted server-side: every call is a stateless proxy/fetch.
 * Raw→Product mapping lives in `product-normalizer.ts`.
 */
import type { Product, Confidence, ProductState } from "@/domains/product/model";
import { OFF_FIELDS, mapOffProduct, assessProduct, type OffRawProduct } from "@/domains/product/normalizer";

// Re-exported for existing consumers of this module.
export { OFF_FIELDS, mapOffProduct, assessProduct };
export type { OffRawProduct };

const BASE = process.env.NEXT_PUBLIC_OFF_BASE_URL || "https://world.openfoodfacts.org";
// France-first full-text search goes through the fr subdomain (same data, FR-scoped ranking).
const BASE_FR = "https://fr.openfoodfacts.org";
// Search-a-licious — Open Food Facts' officially supported full-text search service.
const SEARCH_BASE = process.env.OFF_SEARCH_BASE_URL || "https://search.openfoodfacts.org";
const USER_AGENT = process.env.OFF_USER_AGENT || "GreeCheck/0.1 (contact@greecheck.app)";
const UPSTREAM_TIMEOUT_MS = 8000;

export type ProductResult =
  | { status: Exclude<ProductState, "not_found">; product: Product; confidence: Confidence; missing: string[] }
  | { status: "not_found"; barcode: string };

async function offFetch(url: string, revalidate = 60 * 60): Promise<Response> {
  return fetch(url, {
    headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
    next: { revalidate },
    signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS)
  });
}

/**
 * Parse an upstream response defensively: OFF occasionally answers 200 with an
 * HTML error page, which used to crash `res.json()` and surface as a bare 502.
 */
async function safeJson<T>(res: Response, source: string): Promise<T> {
  const contentType = res.headers.get("content-type") ?? "";
  const text = await res.text();
  if (!contentType.includes("json") && !text.trimStart().startsWith("{")) {
    throw new Error(`${source}_non_json_response (status ${res.status})`);
  }
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(`${source}_invalid_json (status ${res.status})`);
  }
}

export async function fetchProductByBarcode(barcode: string): Promise<ProductResult> {
  const code = barcode.replace(/\D/g, "");
  if (!code) return { status: "not_found", barcode };

  const url = `${BASE}/api/v2/product/${encodeURIComponent(code)}.json?fields=${OFF_FIELDS}`;
  const res = await offFetch(url);
  // OFF v2 answers 404 for unknown barcodes — that is a normal "not found",
  // not an upstream failure, and must never surface as a 502.
  if (res.status === 404) return { status: "not_found", barcode: code };
  if (!res.ok) throw new Error(`OFF responded ${res.status}`);

  const data = await safeJson<{ status?: number; product?: OffRawProduct }>(res, "off_product");
  if (data.status !== 1 || !data.product) return { status: "not_found", barcode: code };

  const product = mapOffProduct(data.product);
  const { status, confidence, missing } = assessProduct(product);
  return { status, product, confidence, missing };
}

export interface SearchResult {
  count: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
  products: Product[];
}

/** Put products actually sold in France first (without dropping the rest). */
function prioritizeFrance(products: Product[]): Product[] {
  const inFrance = (p: Product) => (p.countries ?? []).some((c) => /france|french/i.test(c));
  return [...products.filter(inFrance), ...products.filter((p) => !inFrance(p))];
}

function toSearchResult(raw: OffRawProduct[], count: number, page: number, pageSize: number): SearchResult {
  const products = prioritizeFrance(raw.map(mapOffProduct).filter((p) => p.barcode && p.name));
  return { count, page, pageSize, hasMore: page * pageSize < count, products };
}

/** Primary strategy: Search-a-licious, OFF's supported full-text search service. */
async function searchViaSearchALicious(query: string, page: number, pageSize: number): Promise<SearchResult> {
  const params = new URLSearchParams({
    q: query,
    langs: "fr,en",
    page: String(page),
    page_size: String(pageSize),
    fields: OFF_FIELDS
  });
  const res = await offFetch(`${SEARCH_BASE}/search?${params.toString()}`, 60 * 30);
  if (!res.ok) throw new Error(`searchalicious_${res.status}`);
  const data = await safeJson<{ count?: number; hits?: OffRawProduct[] }>(res, "searchalicious");
  return toSearchResult(data.hits ?? [], data.count ?? (data.hits ?? []).length, page, pageSize);
}

/** Fallback strategy: legacy full-text endpoint on the FR subdomain. */
async function searchViaLegacy(query: string, page: number, pageSize: number): Promise<SearchResult> {
  const params = new URLSearchParams({
    search_terms: query,
    search_simple: "1",
    action: "process",
    json: "1",
    page: String(page),
    page_size: String(pageSize),
    fields: OFF_FIELDS
  });
  const res = await offFetch(`${BASE_FR}/cgi/search.pl?${params.toString()}`, 60 * 30);
  if (!res.ok) throw new Error(`off_legacy_search_${res.status}`);
  const data = await safeJson<{ count?: number; page?: number; page_size?: number; products?: OffRawProduct[] }>(
    res,
    "off_legacy_search"
  );
  return toSearchResult(data.products ?? [], data.count ?? (data.products ?? []).length, page, pageSize);
}

/**
 * Robust full-text product search: Search-a-licious first, legacy `cgi/search.pl`
 * as fallback. Throws only if BOTH upstreams fail (the route maps that to 502).
 */
export async function searchProducts(query: string, page = 1, pageSize = 20): Promise<SearchResult> {
  try {
    return await searchViaSearchALicious(query, page, pageSize);
  } catch (primaryErr) {
    console.warn(`[search] search-a-licious failed (${(primaryErr as Error).message}); falling back to cgi/search.pl`);
    try {
      return await searchViaLegacy(query, page, pageSize);
    } catch (fallbackErr) {
      console.error(
        `[search] both upstreams failed — primary: ${(primaryErr as Error).message}; fallback: ${(fallbackErr as Error).message}`
      );
      throw fallbackErr;
    }
  }
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

  const data = await safeJson<{ count?: number; page?: number; page_size?: number; products?: OffRawProduct[] }>(
    res,
    "off_category_search"
  );
  const products = (data.products ?? []).map(mapOffProduct).filter((p) => p.barcode && p.name);
  return { count: data.count ?? products.length, page: 1, pageSize, hasMore: false, products };
}
