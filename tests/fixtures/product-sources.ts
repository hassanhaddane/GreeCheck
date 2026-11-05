/** Synthetic records shaped like official API replies. No fixture makes a nutritional claim. */
export const FR_GTIN = "3017620422003";
export const MA_GTIN = "6111234567895";
export const US_GTIN = "012345678905";
export const UNKNOWN_GTIN = "98765432123455";

export const frenchProduct = {
  code: FR_GTIN, product_name: "Nutella", product_name_fr: "Nutella",
  product_name_en: "Nutella Hazelnut Spread", brands: "Ferrero", quantity: "400 g",
  product_quantity_unit: "g", nutrition_data_per: "100g", last_modified_t: 1735689600,
  countries_tags: ["en:france"], categories_tags: ["en:spreads", { id: "en:hazelnut-spreads" }],
  labels_tags: [], ingredients_text: "Sucre, noisettes, lait, cacao",
  allergens_tags: [{ id: "en:milk" }, "en:nuts"], additives_tags: [], traces_tags: [],
  nutriments: { "energy-kcal_100g": 530, sugars_100g: 55, salt_100g: 0.1, "saturated-fat_100g": 10, fat_100g: 30, fiber_100g: 3, proteins_100g: 6 },
  nutriscore_version: "2023", nutriscore_grade: "e", nutriscore_score: 25, nova_group: 4,
  greenscore_grade: "c", greenscore_score: 55, greenscore_data: { status: "known", agribalyse: { score: 51 } }
};

export const moroccanProduct = {
  code: MA_GTIN, product_name: "Boisson à l’orange", product_name_ar: "مشروب البرتقال",
  countries_tags: ["en:morocco"], categories_tags: ["en:beverages"], ingredients_text: "ماء وعصير البرتقال",
  nutrition: {
    aggregated_set: {
      preparation: "as_sold", per: "100ml",
      nutrients: {
        "energy-kcal": { value: 40, unit: "kcal" },
        sugars: { value: 8, unit: "g" },
        sodium: { value: 24, unit: "mg" },
        fiber: { value: 0.1, unit: "g", modifier: "<" },
        proteins: { value: -1, unit: "g" }
      }
    }
  }
};

export const americanBranded = {
  fdcId: 410122, dataType: "Branded", gtinUpc: "00012345678905",
  description: "Whole wheat crackers", brandOwner: "Fixture Foods", marketCountry: "United States",
  brandedFoodCategory: "Crackers", ingredients: "Whole wheat flour, salt", servingSize: 28, servingSizeUnit: "g",
  publicationDate: "2025-02-01", modifiedDate: "2025-01-25",
  foodNutrients: [
    { nutrient: { id: 1008, unitName: "KCAL" }, amount: 420 },
    { nutrient: { id: 2000, unitName: "G" }, amount: 4 },
    { nutrient: { id: 1093, unitName: "MG" }, amount: 480 },
    { nutrient: { id: 1258, unitName: "G" }, amount: 2.4 },
    { nutrient: { id: 1003, unitName: "G" }, amount: 9 }
  ]
};

export function offSuccess(product: { code: string }) {
  return { status: "success", code: product.code, result: { id: "product_found" }, errors: [], warnings: [], product };
}

export function offMissing(code: string) {
  return { status: "failure", code, result: { id: "product_not_found" }, errors: [], warnings: [] };
}
