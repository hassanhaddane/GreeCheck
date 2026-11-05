import type { Nutriments } from "@greecheck/domain/product/model";
import type { FieldProvenance } from "@greecheck/domain/product/provenance";

export interface CiqualReference {
  code: string;
  name: string;
  basis: "100g";
  nutriments: Nutriments;
  provenance: FieldProvenance;
}

// ANSES Ciqual 2025, spreadsheet 2025-11-03, columns G/H/K/S/AX/AF/R/AA/P.
// Bounds and absent values are omitted, so "less than" never becomes a number.
const references = new Map<string, Pick<CiqualReference, "code" | "name" | "nutriments">>([
  ["apples", { code: "13039", name: "Pomme, chair et peau, crue",
    nutriments: { energyKcal: 54, sugars: 10.6, salt: 0.0037, saturatedFat: 0.052, fat: 0.25, fiber: 1.4, proteins: 0.25 } }],
  ["bananas", { code: "13005", name: "Banane, chair sans peau, crue",
    nutriments: { energyKcal: 87.6, sugars: 15.6, fiber: 2.7, proteins: 1.06 } }],
  ["carrots", { code: "20009", name: "Carotte, crue",
    nutriments: { energyKcal: 30.2, sugars: 4.85, salt: 0.12, fiber: 2.9, proteins: 0.78 } }]
]);

/** The lookup input is an allowlisted category, never a barcode or a fuzzy match. */
export function getCiqualReference(category: string): CiqualReference | undefined {
  const row = references.get(category.toLowerCase().replace(/^en:/, ""));
  if (!row) return undefined;
  return {
    ...row, basis: "100g",
    provenance: {
      sourceId: "ciqual", sourceUrl: "https://doi.org/10.57745/RDMHWY", sourceVersion: "Ciqual 2025",
      retrievedAt: "2026-11-05", originalUpdatedAt: "2025-11-19",
      dataKind: "category_reference", validationStatus: "reference", confidence: "low", basis: "100g"
    }
  };
}
