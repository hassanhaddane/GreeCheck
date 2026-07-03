/**
 * Product normalizer — the ONLY place that understands the raw Open Food Facts
 * shape. Everything else (UI, scoring, storage) consumes the normalized
 * `Product` type, so swapping/adding sources (Ciqual, USDA) never touches the UI.
 */
import type { Product, Grade, Confidence, ProductState } from "@/types/product";

/** Fields requested from OFF — keeps payloads small and predictable. */
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

/** Raw OFF payload (subset of OFF_FIELDS). Never let this leak past this file. */
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

/* ------------------------------ normalizer ------------------------------ */

/** Normalize a raw OFF product into GreeCheck's `Product`. */
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

/** Assess data completeness → product state + score confidence. */
export function assessProduct(p: Product): {
  status: Exclude<ProductState, "not_found">;
  confidence: Confidence;
  missing: string[];
} {
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
