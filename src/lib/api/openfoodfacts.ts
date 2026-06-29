/**
 * Open Food Facts integration (server-side).
 * No data is persisted server-side: every call is a stateless proxy/fetch.
 */
import type { Product, Grade, Confidence, ProductState } from "@/types/product";

const BASE = process.env.NEXT_PUBLIC_OFF_BASE_URL || "https://world.openfoodfacts.org";
const USER_AGENT = process.env.OFF_USER_AGENT || "GreeCheck/0.1 (https://greecheck.app)";

// Fields requested from OFF — keeps payloads small and predictable.
export const OFF_FIELDS = [
  "code",
  "product_name",
  "product_name_fr",
  "product_name_en",
  "brands",
  "image_front_url",
  "image_url",
  "quantity",
  "categories_tags",
  "labels_tags",
  "countries_tags",
  "ingredients_text",
  "ingredients_text_fr",
  "ingredients_text_en",
  "allergens_tags",
  "additives_tags",
  "traces_tags",
  "nutriments",
  "nutriscore_grade",
  "nova_group",
  "ecoscore_grade",
  "environmental_score_grade",
  "green_score"
].join(",");

export interface OffRawProduct {
  code?: string;
  product_name?: string;
  product_name_fr?: string;
  product_name_en?: string;
  brands?: string;
  image_front_url?: string;
  image_url?: string;
  quantity?: string;
  categories_tags?: string[];
  labels_tags?: string[];
  countries_tags?: string[];
  ingredients_text?: string;
  ingredients_text_fr?: string;
  ingredients_text_en?: string;
  allergens_tags?: string[];
  additives_tags?: string[];
  traces_tags?: string[];
  nutriments?: Record<string, number | string>;
  nutriscore_grade?: string;
  nova_group?: number | string;
  ecoscore_grade?: string;
  environmental_score_grade?: string;
  green_score?: string;
}

export type ProductResult =
  | { status: Exclude<ProductState, "not_found">; product: Product; confidence: Confidence; missing: string[] }
  | { status: "not_found"; barcode: string };

/* ------------------------------- helpers -------------------------------- */

const VALID_GRADES = new Set(["a", "b", "c", "d", "e"]);

function cleanTag(tag: string): string {
  return tag.replace(/^[a-z]{2,3}:/i, "").replace(/-/g, " ").trim();
}
function cleanTags(tags?: string[]): string[] {
  return (tags ?? []).map(cleanTag).filter(Boolean);
}
function num(v: unknown): number | undefined {
  const n = typeof v === "string" ? parseFloat(v) : (v as number);
  return Number.isFinite(n) ? n : undefined;
}
function grade(v?: string): Grade | undefined {
  const g = v?.toLowerCase();
  return g && VALID_GRADES.has(g) ? (g as Grade) : undefined;
}
function hasLabel(tags: string[] | undefined, ...needles: string[]): boolean {
  const joined = (tags ?? []).join("|").toLowerCase();
  return needles.some((n) => joined.includes(n));
}

/* -------------------------------- mapper -------------------------------- */

export function mapOffProduct(raw: OffRawProduct): Product {
  const n = raw.nutriments ?? {};
  const labels = raw.labels_tags;

  const nova = num(raw.nova_group);
  const novaGroup = nova && nova >= 1 && nova <= 4 ? (Math.round(nova) as 1 | 2 | 3 | 4) : undefined;

  return {
    barcode: raw.code ?? "",
    name: raw.product_name || raw.product_name_fr || raw.product_name_en || "",
    brand: raw.brands?.split(",")[0]?.trim() || undefined,
    imageUrl: raw.image_front_url || raw.image_url || undefined,
    quantity: raw.quantity || undefined,
    categories: cleanTags(raw.categories_tags),
    labels: cleanTags(raw.labels_tags),
    countries: cleanTags(raw.countries_tags),
    ingredientsText: raw.ingredients_text || raw.ingredients_text_fr || raw.ingredients_text_en || undefined,
    allergens: cleanTags(raw.allergens_tags),
    additives: cleanTags(raw.additives_tags),
    traces: cleanTags(raw.traces_tags),
    nutriments: {
      energyKcal: num(n["energy-kcal_100g"]),
      sugars: num(n["sugars_100g"]),
      salt: num(n["salt_100g"]) ?? (num(n["sodium_100g"]) !== undefined ? num(n["sodium_100g"])! * 2.5 : undefined),
      saturatedFat: num(n["saturated-fat_100g"]),
      fat: num(n["fat_100g"]),
      fiber: num(n["fiber_100g"]),
      proteins: num(n["proteins_100g"])
    },
    nutriScore: grade(raw.nutriscore_grade),
    novaGroup,
    greenScore: grade(raw.green_score) ?? grade(raw.environmental_score_grade) ?? grade(raw.ecoscore_grade),
    isBio: hasLabel(labels, "organic", "bio", "ab agriculture"),
    isHalal: hasLabel(labels, "halal"),
    isVegan: hasLabel(labels, "vegan"),
    isVegetarian: hasLabel(labels, "vegetarian", "vegan"),
    source: "openfoodfacts"
  };
}

/* ----------------------- completeness / confidence ---------------------- */

export function assessProduct(p: Product): { status: Exclude<ProductState, "not_found">; confidence: Confidence; missing: string[] } {
  const missing: string[] = [];
  const nut = p.nutriments;
  const hasNutrition = [nut.energyKcal, nut.sugars, nut.salt, nut.saturatedFat, nut.proteins].some((v) => v !== undefined);
  const hasIngredients = Boolean(p.ingredientsText && p.ingredientsText.length > 2);

  if (!p.name) missing.push("name");
  if (!hasNutrition) missing.push("nutrition");
  if (!hasIngredients) missing.push("ingredients");

  let status: Exclude<ProductState, "not_found"> = "found";
  let confidence: Confidence = "high";

  if (!hasNutrition) {
    status = "missing_nutrition";
    confidence = "low";
  } else if (!hasIngredients) {
    status = "missing_ingredients";
    confidence = "medium";
  } else if (missing.length > 0) {
    status = "partial";
    confidence = "medium";
  }

  if (missing.length === 0) status = "found";
  return { status, confidence, missing };
}

/* ------------------------------- fetchers ------------------------------- */

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
