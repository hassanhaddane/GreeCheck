import { gtinIdentity } from "./gtin";
import type { Confidence, Nutriments, Product } from "./model";

export type DataState = "VERIFIED" | "PARTIAL" | "CONFLICTED" | "UNAVAILABLE" | "STALE";
export type NutritionBasis = "100g" | "100ml";
export type DataKind = "measured" | "declared" | "computed" | "category_reference";
export type MissingReason = "not_reported" | "invalid_or_unsupported";
export type ValidationStatus = "identity_checked" | "source_reported" | "derived" | "reference" | "missing";

export interface SourceRecord {
  sourceId: Product["source"];
  sourceUrl: string;
  sourceVersion: string;
  /** ISO 8601 retrieval timestamp. Caches preserve it on reads. */
  retrievedAt: string;
  /** ISO 8601 date or timestamp supplied by the source. */
  originalUpdatedAt?: string;
}

export interface FieldProvenance extends SourceRecord {
  /** Missing observations carry no classification of the absent value. */
  dataKind?: DataKind;
  validationStatus: ValidationStatus;
  confidence: Confidence;
  missingReason?: MissingReason;
  basis?: NutritionBasis;
  unit?: "g" | "kcal";
}

const PRODUCT_FIELDS = {
  barcode: "declared",
  name: "declared",
  "localizedNames.fr": "declared",
  "localizedNames.en": "declared",
  "localizedNames.ar": "declared",
  brand: "declared",
  imageUrl: "declared",
  quantity: "declared",
  categories: "declared",
  categoryIds: "declared",
  countries: "declared",
  labels: "declared",
  ingredientsText: "declared",
  allergens: "declared",
  traces: "declared",
  additives: "computed",
  nutriScore: "computed",
  nutriScorePoints: "computed",
  nutriScoreVersion: "computed",
  novaGroup: "computed",
  greenScore: "computed",
  "environment.normalizedScore": "computed",
  "environment.adjustments": "computed",
  "environment.lifecycleScore": "category_reference",
  halalStatus: "computed",
  veganStatus: "computed",
  vegetarianStatus: "computed",
  palmOilStatus: "computed"
} as const satisfies Record<string, DataKind>;

export const NUTRIENT_FIELDS = ["energyKcal", "sugars", "salt", "saturatedFat", "fat", "fiber", "proteins"] as const satisfies readonly (keyof Nutriments)[];

type NutrientProvenanceField = `nutriments.${keyof Nutriments}`;
export type ProvenanceField = keyof typeof PRODUCT_FIELDS | "nutritionBasis" | NutrientProvenanceField;
export type FieldProvenanceMap = Partial<Record<ProvenanceField, FieldProvenance>>;

export interface NutrientConflict {
  field: keyof Nutriments;
  basis: NutritionBasis;
  unit: "g" | "kcal";
  primary: { value: number; provenance: FieldProvenance };
  secondary: { value: number; provenance: FieldProvenance };
}

function observation(
  source: SourceRecord,
  value: unknown,
  kind: DataKind,
  validationStatus: Exclude<ValidationStatus, "missing">,
  missingReason: MissingReason
): FieldProvenance {
  const missing = value === undefined || value === null || value === "" || value === "unknown";
  if (missing) return { ...source, validationStatus: "missing", confidence: "low", missingReason };
  const confidence = validationStatus === "identity_checked" ? "high" : kind === "category_reference" ? "low" : "medium";
  return { ...source, dataKind: kind, validationStatus, confidence };
}

export function productProvenance(
  product: Product,
  source: SourceRecord,
  exactIdentity: boolean,
  nutrientKinds: Partial<Record<keyof Nutriments, DataKind>> = {},
  unsupportedNutrients: ReadonlySet<keyof Nutriments> = new Set()
): FieldProvenanceMap {
  const result: FieldProvenanceMap = {};
  for (const [field, kind] of Object.entries(PRODUCT_FIELDS) as [keyof typeof PRODUCT_FIELDS, DataKind][]) {
    const [root, child] = field.split(".") as [keyof Product, string | undefined];
    const group = product[root];
    const value = child ? (group as Record<string, unknown> | undefined)?.[child] : group;
    const status = field === "barcode" && exactIdentity ? "identity_checked"
      : kind === "category_reference" ? "reference"
      : kind === "computed" ? "derived" : "source_reported";
    result[field] = observation(source, value, kind, status, "not_reported");
  }
  result.nutritionBasis = observation(source, product.nutritionBasis, "declared", "source_reported", "not_reported");
  for (const field of NUTRIENT_FIELDS) {
    const kind = nutrientKinds[field] ?? "declared";
    result[`nutriments.${field}`] = {
      ...observation(source, product.nutriments[field], kind, kind === "computed" ? "derived" : "source_reported",
        unsupportedNutrients.has(field) ? "invalid_or_unsupported" : "not_reported"),
      basis: product.nutritionBasis,
      unit: field === "energyKcal" ? "kcal" : "g"
    };
  }
  return result;
}

/** Compare only matching units/bases. Tolerance allows common label rounding. */
export function nutrientConflicts(primary: Product, secondary: Product): NutrientConflict[] {
  const basis = primary.nutritionBasis;
  const identity = gtinIdentity(primary.barcode);
  if (!identity || identity !== gtinIdentity(secondary.barcode) || !basis || basis !== secondary.nutritionBasis) return [];
  return NUTRIENT_FIELDS.flatMap((field) => {
    const a = primary.nutriments[field];
    const b = secondary.nutriments[field];
    const from = primary.provenance?.[`nutriments.${field}`];
    const other = secondary.provenance?.[`nutriments.${field}`];
    if (a === undefined || b === undefined || !from?.unit || !other || from.unit !== other.unit) return [];
    const absolute = field === "energyKcal" ? 10 : field === "salt" ? 0.1 : 0.5;
    if (Math.abs(a - b) <= Math.max(absolute, 0.2 * Math.max(a, b))) return [];
    return [{ field, basis, unit: from.unit, primary: { value: a, provenance: from }, secondary: { value: b, provenance: other } }];
  });
}
