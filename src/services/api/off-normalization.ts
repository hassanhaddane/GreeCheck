import type { Nutriments, Product } from "@greecheck/domain/product/model";
import { assessProduct, mapOffProduct, type OffRawEnvironmentalData, type OffRawProduct } from "@greecheck/domain/product/normalizer";
import { gtinIdentity } from "@greecheck/domain/product/gtin";
import { productProvenance, type DataKind, type NutritionBasis } from "@greecheck/domain/product/provenance";
import { finite, invalidPayload, nonEmpty, nutrientValue, quantity, record } from "./upstream";

const textFields = [
  "product_name", "product_name_fr", "product_name_en", "product_name_ar", "brands", "quantity",
  "ingredients_text", "ingredients_text_fr", "ingredients_text_en", "nutriscore_grade", "nutriscore_version",
  "ecoscore_grade", "environmental_score_grade", "green_score", "greenscore_grade"
] as const;
const tagsFields = ["categories_tags", "labels_tags", "countries_tags", "allergens_tags", "additives_tags", "traces_tags"] as const;
const scoreFields = ["nutriscore_score", "nova_group", "ecoscore_score", "environmental_score_score", "greenscore_score"] as const;

const nutrientIds = {
  energyKcal: "energy-kcal", sugars: "sugars", salt: "salt", saturatedFat: "saturated-fat",
  fat: "fat", fiber: "fiber", proteins: "proteins"
} as const satisfies Record<keyof Nutriments, string>;

function tags(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const values = value.map(tag => nonEmpty(tag) ?? nonEmpty(record(tag)?.id));
  return values.every(tag => tag !== undefined) ? values : undefined;
}

function photo(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  try {
    const url = new URL(value);
    if (url.protocol === "https:" && !url.username && !url.password && !url.port &&
      ["images.openfoodfacts.org", "static.openfoodfacts.org", "world.openfoodfacts.org"].includes(url.hostname)) return url.href;
  } catch { /* unusable link */ }
}

function environmental(value: unknown): OffRawEnvironmentalData | undefined {
  const data = record(value);
  if (!data) return undefined;
  const adjustments = record(data.adjustments);
  const production = record(adjustments?.production_system);
  const species = record(adjustments?.threatened_species);
  return {
    status: nonEmpty(data.status), grade: nonEmpty(data.grade), score: finite(data.score),
    agribalyse: { score: quantity(record(data.agribalyse)?.score) },
    missing: record(data.missing),
    adjustments: adjustments && {
      origins_of_ingredients: { value: finite(record(adjustments.origins_of_ingredients)?.value) },
      packaging: { value: finite(record(adjustments.packaging)?.value) },
      production_system: { value: finite(production?.value), labels: tags(production?.labels) },
      threatened_species: { value: finite(species?.value), ingredient: nonEmpty(species?.ingredient) }
    }
  };
}

/** Validate the identity/envelope strictly, and omit invalid optional source observations. */
export function offProduct(value: unknown, version: string, requested?: string): Product | undefined {
  const data = record(value);
  const code = nonEmpty(data?.code);
  const identity = code && gtinIdentity(code);
  if (!data || !code || !identity) return undefined;
  if (requested !== undefined && identity !== gtinIdentity(requested)) invalidPayload();

  const raw: OffRawProduct = { code: requested ?? code };
  for (const field of textFields) raw[field] = nonEmpty(data[field]);
  for (const field of tagsFields) raw[field] = tags(data[field]);
  for (const field of scoreFields) raw[field] = finite(data[field]);
  if (raw.additives_tags === undefined && data.additives_tags === undefined && data.additives_n === 0) raw.additives_tags = [];
  raw.image_front_url = photo(data.image_front_url);
  raw.image_url = photo(data.image_url);
  for (const field of ["greenscore_data", "environmental_score_data", "ecoscore_data"] as const) {
    raw[field] = environmental(data[field]);
  }

  const reportedVersion = raw.nutriscore_version;
  const versioned = record(record(data.nutriscore)?.[reportedVersion ?? "2023"]);
  if (!raw.nutriscore_grade && versioned?.nutriscore_computed === 1) {
    raw.nutriscore_grade = nonEmpty(versioned.grade);
    raw.nutriscore_score = finite(versioned.score);
    raw.nutriscore_version = reportedVersion ?? "2023";
  }

  const legacy = record(data.nutriments);
  const aggregate = record(record(data.nutrition)?.aggregated_set);
  const aggregateNutrients = record(aggregate?.nutrients);
  const asSold = aggregate?.preparation === "as_sold" && (aggregate.per === "100g" || aggregate.per === "100ml") && aggregateNutrients && Object.keys(aggregateNutrients).length > 0;
  const basis: NutritionBasis | undefined = asSold ? aggregate.per as NutritionBasis
    : data.nutrition_data_per === "100ml" ? "100ml"
    : data.nutrition_data_per === "100g" && ["g", "kg", "mg"].includes(String(data.product_quantity_unit).toLowerCase()) ? "100g"
    : undefined;

  const nutrientKinds: Partial<Record<keyof Nutriments, DataKind>> = {};
  const unsupported = new Set<keyof Nutriments>();
  function read(id: string, unit: "g" | "kcal") {
    if (!asSold) {
      const input = legacy?.[id + "_100g"];
      return { value: quantity(input), supplied: input !== undefined, computed: false };
    }
    const item = record(aggregateNutrients?.[id]);
    const value = !item?.modifier || item.modifier === "=" ? nutrientValue(item?.value, item?.unit, unit) : undefined;
    return { value, supplied: aggregateNutrients?.[id] !== undefined, computed: item?.unit !== unit || Boolean(item?.source_per && item.source_per !== basis) };
  }

  const nutriments: Record<string, number> = {};
  for (const [field, id] of Object.entries(nutrientIds) as [keyof Nutriments, string][]) {
    const source = read(id, field === "energyKcal" ? "kcal" : "g");
    if (source.value !== undefined) {
      nutriments[id + "_100g"] = source.value;
      if (source.computed) nutrientKinds[field] = "computed";
    } else if (source.supplied) {
      unsupported.add(field);
    }
  }
  const sodium = read("sodium", "g").value;
  if (nutriments.salt_100g === undefined && sodium !== undefined) {
    nutriments.sodium_100g = sodium;
    nutrientKinds.salt = "computed";
  }
  raw.nutriments = nutriments;

  const product = mapOffProduct(raw);
  product.nutritionBasis = basis;
  const modified = quantity(data.last_modified_t);
  product.provenance = productProvenance(product, {
    sourceId: "openfoodfacts",
    sourceUrl: "https://world.openfoodfacts.org/product/" + encodeURIComponent(code),
    sourceVersion: version,
    retrievedAt: new Date().toISOString(),
    originalUpdatedAt: modified && modified <= 253402300799 ? new Date(modified * 1000).toISOString() : undefined
  }, Boolean(requested), nutrientKinds, unsupported);
  const assessment = assessProduct(product);
  product.dataState = requested && assessment.status === "complete" && basis && product.additives !== undefined &&
    Object.values(product.nutriments).every(v => v !== undefined) ? "VERIFIED" : "PARTIAL";
  return product;
}
