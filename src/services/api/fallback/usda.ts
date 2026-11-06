import { gtinIdentity } from "@greecheck/domain/product/gtin";
import type { Nutriments, Product } from "@greecheck/domain/product/model";
import { ensureDerived } from "@greecheck/domain/product/normalizer";
import { productProvenance, type DataKind, type NutritionBasis } from "@greecheck/domain/product/provenance";
import { ApiError } from "../errors";
import { asProductResult, type ProductResult } from "../product-contracts";
import { invalidPayload, jsonObject, nonEmpty, nutrientValue, record, upstream } from "../upstream";

const brandedRequest = upstream(1000, 60 * 60_000, 60 * 60_000);
const origin = "https://api.nal.usda.gov/fdc/v1/";
const headers = { Accept: "application/json" };
const timeout = 3500;

const nutrientIds: Record<number, keyof Nutriments | "sodium"> = {
  1008: "energyKcal", 1062: "energyKcal", 2000: "sugars", 1093: "sodium",
  1258: "saturatedFat", 1004: "fat", 1079: "fiber", 1003: "proteins"
};

function isoDate(value: unknown): string | undefined {
  const date = nonEmpty(value);
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return undefined;
  const time = Date.parse(date);
  return Number.isFinite(time) && new Date(time).toISOString().startsWith(date) ? date : undefined;
}

function exactMatch(row: Record<string, unknown> | undefined, barcode: string): boolean {
  const identity = gtinIdentity(barcode);
  return Boolean(identity && row?.dataType === "Branded" && typeof row.gtinUpc === "string" &&
    gtinIdentity(row.gtinUpc) === identity);
}

function normalizeBranded(food: Record<string, unknown>, barcode: string, id: number): Product {
  const name = nonEmpty(food.description);
  if (!name || !Array.isArray(food.foodNutrients) || food.fdcId !== id || !exactMatch(food, barcode)) invalidPayload();

  const servingUnit = nonEmpty(food.servingSizeUnit)?.toLowerCase();
  const basis: NutritionBasis | undefined = servingUnit === "g" || servingUnit === "grm" ? "100g"
    : servingUnit === "ml" || servingUnit === "mlt" ? "100ml" : undefined;
  const amounts = new Map<number, number>();
  const ambiguous = new Set<number>();
  if (basis) for (const row of food.foodNutrients) {
    const nutrientRow = record(row);
    const nutrient = record(nutrientRow?.nutrient);
    const nutrientId = nutrient?.id;
    if (typeof nutrientId !== "number" || !Object.hasOwn(nutrientIds, nutrientId)) continue;
    const target = nutrientIds[nutrientId] === "energyKcal" ? "kcal" : "g";
    const value = nutrientValue(nutrientRow?.amount, nutrient?.unitName, target);
    if (value === undefined) continue;
    if (amounts.has(nutrientId) && amounts.get(nutrientId) !== value) ambiguous.add(nutrientId);
    amounts.set(nutrientId, value);
  }
  for (const id of ambiguous) amounts.delete(id);

  const nutriments: Nutriments = {};
  for (const [id, field] of Object.entries(nutrientIds)) {
    const value = amounts.get(Number(id));
    if (value !== undefined && field !== "sodium") nutriments[field] = value;
  }
  // Where both energy units exist, keep the label's kcal value.
  nutriments.energyKcal = amounts.get(1008) ?? amounts.get(1062);
  const sodium = amounts.get(1093);
  if (sodium !== undefined) nutriments.salt = sodium * 2.5;
  const market = nonEmpty(food.marketCountry);
  const category = nonEmpty(food.brandedFoodCategory);
  const product = ensureDerived({
    barcode, name, brand: nonEmpty(food.brandName) ?? nonEmpty(food.brandOwner),
    categories: category ? [category] : undefined,
    countries: market ? [market] : undefined,
    ingredientsText: nonEmpty(food.ingredients),
    nutriments, nutritionBasis: basis,
    source: "usda", dataState: "PARTIAL"
  });
  const kinds: Partial<Record<keyof Nutriments, DataKind>> = {};
  // FDC standardized these label values to a 100-unit basis.
  for (const field of Object.keys(nutriments) as (keyof Nutriments)[]) kinds[field] = "computed";
  product.provenance = productProvenance(product, {
    sourceId: "usda", sourceUrl: "https://fdc.nal.usda.gov/food-details/" + id + "/nutrients",
    sourceVersion: "fdc-v1-branded", retrievedAt: new Date().toISOString(),
    originalUpdatedAt: isoDate(food.modifiedDate) ?? isoDate(food.publicationDate)
  }, true, kinds);
  return product;
}

/** API key stays server-side. A search hit alone is never accepted as proof of identity. */
export async function fetchUsdaProduct(barcode: string, apiKey: string): Promise<ProductResult> {
  if (!gtinIdentity(barcode)) throw new ApiError("invalid_request", "Invalid GTIN");
  const url = new URL("foods/search", origin);
  url.search = new URLSearchParams({
    query: barcode.replace(/^0+(?=\d{12,}$)/, ""), dataType: "Branded", pageSize: "25", api_key: apiKey
  }).toString();
  const response = await brandedRequest(url, headers, timeout);
  if (!response.ok) throw new ApiError("upstream", "USDA search failed");
  const body = await jsonObject(response);
  if (!Array.isArray(body.foods) || body.foods.some(row => !record(row) || !Number.isSafeInteger(row.fdcId))) invalidPayload();

  const candidates = body.foods.map(record).filter(row => exactMatch(row, barcode))
    .map(row => ({ id: row!.fdcId as number, date: isoDate(row!.publicationDate) ?? "" }));
  const matches = [...new Map(candidates.map(candidate => [candidate.id, candidate])).values()]
    .sort((a, b) => b.date.localeCompare(a.date));
  const match = matches[0];
  if (!match) return { status: "not_found", barcode };
  if (matches.length > 1 && match.date === matches[1].date) {
    throw new ApiError("invalid_payload", "USDA identity has ambiguous revisions");
  }

  const detailsUrl = new URL("food/" + match.id, origin);
  detailsUrl.searchParams.set("api_key", apiKey);
  const details = await brandedRequest(detailsUrl, headers, timeout);
  if (!details.ok) throw new ApiError("upstream", "USDA details request failed");
  return asProductResult(normalizeBranded(await jsonObject(details), barcode, match.id));
}
