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
  assert.equal(full.status, "complete");
  assert.equal(full.confidence, "high");

  const noNutrition = assessProduct(mapOffProduct({ code: "2", product_name: "X", ingredients_text: "eau, sel" }));
  assert.equal(noNutrition.status, "insufficient_for_score");
  assert.equal(noNutrition.confidence, "low");
  assert.ok(noNutrition.missing.includes("missingNutrition"));

  const noIngredients = assessProduct(mapOffProduct({ code: "3", product_name: "Y", nutriments: { "sugars_100g": 4 } }));
  assert.equal(noIngredients.status, "usable_incomplete");
  assert.equal(noIngredients.confidence, "medium");
});

test("invalid grades and NOVA values are rejected, not guessed", () => {
  const p = mapOffProduct({ code: "4", product_name: "Z", nutriscore_grade: "unknown", nova_group: 7 });
  assert.equal(p.nutriScore, undefined);
  assert.equal(p.novaGroup, undefined);
});

/* ─────────────── V2 statuses: halal / vegan / palm-oil / quality ─────────────── */
import {
  classifyHalal, classifyVegan, classifyPalmOil, computeDataQuality, ensureDerived
} from "./normalizer";

test("halal is a 5-state compatibility fact — not_confirmed is NEVER 'not halal'", () => {
  // real Nutella ingredients (captured payload): no flag → not_confirmed, not incompatible
  const nutella = mapOffProduct(RAW);
  assert.equal(nutella.halalStatus, "not_confirmed");
  assert.equal(nutella.isHalal, false);

  assert.equal(classifyHalal("eau, sel", ["halal"]), "confirmed");
  assert.equal(classifyHalal("gélatine de porc, sucre", []), "incompatible");
  assert.equal(classifyHalal("sucre, gélatine", []), "check_required"); // ambiguous origin
  assert.equal(classifyHalal("farine de blé, eau, sel", []), "not_confirmed");
  assert.equal(classifyHalal(undefined, []), "unknown");
});

test("vegan/vegetarian and palm-oil statuses expose explicit unknowns", () => {
  const p = mapOffProduct(RAW);
  assert.equal(p.palmOilStatus, "present");          // huile de palme
  assert.equal(classifyVegan("LAIT écrémé en poudre, sucre", []), "incompatible");
  assert.equal(classifyVegan("tofu, eau", ["vegan"]), "confirmed");
  assert.equal(classifyVegan("noisettes, sucre", []), "unknown");
  assert.equal(classifyPalmOil("huile de tournesol. sans huile de palme", []), "absent_claimed");
  assert.equal(classifyPalmOil("noisettes, sucre", []), "unknown");
});

test("data quality: availability flags, completeness and EXPLAINABLE confidence", () => {
  const full = mapOffProduct(RAW);
  assert.ok(full.dataQuality);
  const q = full.dataQuality!;
  assert.equal(q.availability.nutrition, true);
  assert.equal(q.availability.nutriScore, true);
  assert.equal(q.availability.ingredients, true);
  assert.equal(q.confidence, "high");
  assert.ok(q.completeness >= 80);
  // missing image is not among key confidence signals but nova is explained
  const sparse = mapOffProduct({ code: "1", product_name: "X" });
  const qs = computeDataQuality(sparse);
  assert.equal(qs.confidence, "low");
  assert.deepEqual(qs.confidenceReasons, ["missingNutriScore", "missingNutrition", "missingIngredients", "missingNova"]);
});

test("ensureDerived revives pre-V2 products (statuses + quality filled, idempotent)", () => {
  const legacy = { barcode: "1", name: "L", nutriments: { sugars: 2 }, ingredientsText: "sucre, gélatine", source: "openfoodfacts" as const };
  const revived = ensureDerived(legacy);
  assert.equal(revived.halalStatus, "check_required");
  assert.ok(revived.dataQuality);
  assert.equal(ensureDerived(revived), revived); // no re-derivation when already filled
});

test("keyword matching is word-bounded (lactosérum ≠ rum, vinaigre ≠ vin, graham ≠ ham)", () => {
  assert.equal(classifyHalal("LACTOSERUM en poudre, sucre", []), "not_confirmed");
  assert.equal(classifyHalal("vinaigre de cidre, sel", []), "not_confirmed");
  assert.equal(classifyHalal("biscuit graham, sucre", []), "not_confirmed");
  assert.equal(classifyHalal("rhum, sucre", []), "incompatible"); // real hit still detected
  assert.equal(classifyHalal("vin blanc, sel", []), "incompatible");
});
