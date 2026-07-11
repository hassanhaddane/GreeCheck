/**
 * Normalizer compatibility tests: raw Open Food Facts payload → the ONE
 * normalized Product model, plus completeness assessment.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { mapOffProduct, assessProduct, type OffRawProduct } from "./normalizer";

const RAW: OffRawProduct = {
  code: "3017620422003",
  product_name: "Nutella",
  brands: "Ferrero, Nutella",
  image_front_url: "https://images.openfoodfacts.org/x.jpg",
  quantity: "400 g",
  categories_tags: ["en:breakfasts", "en:sweet-spreads", "en:hazelnut-spreads"],
  labels_tags: ["en:gluten-free", "fr:sans-colorants"],
  countries_tags: ["en:france", "en:belgium"],
  ingredients_text: "Sucre, huile de palme, noisettes 13%, cacao maigre",
  allergens_tags: ["en:milk", "en:nuts"],
  additives_tags: ["en:e322", "en:e476"],
  nutriments: {
    "energy-kcal_100g": 539,
    "sugars_100g": "56.3",
    "sodium_100g": 0.0428,
    "saturated-fat_100g": 10.6,
    "fat_100g": 30.9,
    "fiber_100g": 0,
    "proteins_100g": 6.3
  },
  nutriscore_grade: "E",
  nova_group: "4",
  ecoscore_grade: "d"
};

test("normalizer maps a complete raw OFF payload to the normalized model", () => {
  const p = mapOffProduct(RAW);
  assert.equal(p.barcode, "3017620422003");
  assert.equal(p.name, "Nutella");
  assert.equal(p.brand, "Ferrero");                       // first brand only
  assert.equal(p.nutriScore, "e");                        // grade lowercased + validated
  assert.equal(p.novaGroup, 4);                           // string → validated 1|2|3|4
  assert.equal(p.greenScore, "d");                        // ecoscore fallback chain
  assert.equal(p.nutriments.sugars, 56.3);                // numeric strings parsed
  assert.ok(Math.abs((p.nutriments.salt ?? 0) - 0.107) < 0.001); // sodium×2.5 fallback
  assert.deepEqual(p.additives, ["e322", "e476"]);        // tags cleaned of prefixes
  assert.ok((p.categories ?? []).includes("hazelnut spreads")); // dashes → spaces
  assert.equal(p.source, "openfoodfacts");
});

test("unknown data stays unknown — absence is never mapped to a negative value", () => {
  const p = mapOffProduct({ code: "1", product_name: "Mystery" });
  assert.equal(p.nutriScore, undefined);
  assert.equal(p.novaGroup, undefined);
  assert.equal(p.greenScore, undefined);
  assert.equal(p.nutriments.sugars, undefined);
  assert.equal(p.isBio, false);       // label-based flags: no label → not claimed
  assert.equal(p.isHalal, false);
});

test("assessProduct grades completeness into status + confidence", () => {
  const full = assessProduct(mapOffProduct(RAW));
  assert.equal(full.status, "found");
  assert.equal(full.confidence, "high");

  const noNutrition = assessProduct(mapOffProduct({ code: "2", product_name: "X", ingredients_text: "eau, sel" }));
  assert.equal(noNutrition.status, "missing_nutrition");
  assert.equal(noNutrition.confidence, "low");
  assert.ok(noNutrition.missing.includes("nutrition"));

  const noIngredients = assessProduct(mapOffProduct({ code: "3", product_name: "Y", nutriments: { "sugars_100g": 4 } }));
  assert.equal(noIngredients.status, "missing_ingredients");
  assert.equal(noIngredients.confidence, "medium");
});

test("invalid grades and NOVA values are rejected, not guessed", () => {
  const p = mapOffProduct({ code: "4", product_name: "Z", nutriscore_grade: "unknown", nova_group: 7 });
  assert.equal(p.nutriScore, undefined);
  assert.equal(p.novaGroup, undefined);
});
