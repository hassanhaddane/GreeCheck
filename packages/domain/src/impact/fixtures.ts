/**
 * GreeImpact test fixtures — realistic Open Food Facts environmental payload
 * shapes at every completeness level. Used by impact and normalizer tests.
 * Fictional products; values are shaped like real OFF responses.
 */
import type { Product, ProductEnvironment } from "../product/model";
import type { OffRawEnvironmentalData } from "../product/normalizer";

const baseProduct = (over: Partial<Product> = {}): Product => ({
  barcode: "3400000000001",
  name: "Produit Impact Test",
  source: "openfoodfacts",
  nutriments: {},
  ...over
});

/* ── raw OFF environmental payloads (normalizer input) ── */

/** Complete assessment: score, grade, agribalyse, all adjustments, no missing. */
export const RAW_ENV_COMPLETE: OffRawEnvironmentalData = {
  status: "known",
  score: 71,
  grade: "b",
  agribalyse: { score: 82 },
  adjustments: {
    origins_of_ingredients: { value: 2 },
    packaging: { value: -6 },
    production_system: { value: 15, labels: ["en:eu-organic", "en:ab-agriculture-biologique"] },
    threatened_species: { value: 0 }
  },
  missing: {}
};

/** Palm-oil product: species malus, heavy category, source declares missing origins. */
export const RAW_ENV_PALM: OffRawEnvironmentalData = {
  status: "known",
  score: 34,
  grade: "d",
  agribalyse: { score: 38 },
  adjustments: {
    origins_of_ingredients: { value: -5 },
    packaging: { value: -10 },
    production_system: { value: 0, labels: [] },
    threatened_species: { value: -10, ingredient: "en:palm-oil" }
  },
  missing: { origins: 1 }
};

/** Source computed nothing (status unknown, no score/grade). */
export const RAW_ENV_UNKNOWN: OffRawEnvironmentalData = { status: "unknown" };

/* ── normalized Product fixtures (engine input) ── */

const env = (e: Omit<ProductEnvironment, "provider">): ProductEnvironment => ({
  provider: "openfoodfacts",
  ...e
});

/** Full data — expects: valid, high confidence, strengths & weaknesses. */
export const P_COMPLETE = baseProduct({
  barcode: "3400000000010",
  name: "Granola Bio Local",
  greenScore: "b",
  environment: env({
    sourceScore: 71,
    sourceGrade: "b",
    normalizedScore: 71,
    normalizedGrade: "b",
    lifecycleScore: 82,
    adjustments: {
      originsValue: 2,
      packagingValue: -6,
      productionSystemValue: 15,
      productionSystemLabels: ["eu organic", "ab agriculture biologique"],
      threatenedSpeciesValue: 0
    },
    sourceMissing: [],
    statusKnown: true
  })
});

/** Palm-oil spread — clear weakness chain, medium confidence (missing origins). */
export const P_PALM = baseProduct({
  barcode: "3400000000011",
  name: "Pâte à tartiner",
  greenScore: "d",
  environment: env({
    sourceScore: 34,
    sourceGrade: "d",
    normalizedScore: 34,
    normalizedGrade: "d",
    lifecycleScore: 38,
    adjustments: {
      originsValue: -5,
      packagingValue: -10,
      productionSystemValue: 0,
      productionSystemLabels: [],
      threatenedSpeciesValue: -10,
      threatenedSpeciesIngredient: "en:palm-oil"
    },
    sourceMissing: ["origins"],
    statusKnown: true
  })
});

/** Score without grade from the source. */
export const P_SCORE_ONLY = baseProduct({
  barcode: "3400000000012",
  environment: env({ sourceScore: 65, normalizedScore: 65 })
});

/** Legacy cache: only the quick grade survives. */
export const P_GRADE_ONLY = baseProduct({ barcode: "3400000000013", greenScore: "c" });

/** No environmental signal at all. */
export const P_NOTHING = baseProduct({ barcode: "3400000000014" });

/** Source says its own status is unknown (computed but not trusted). */
export const P_STATUS_UNKNOWN = baseProduct({
  barcode: "3400000000015",
  environment: env({
    sourceScore: 55, sourceGrade: "c", normalizedScore: 55, normalizedGrade: "c",
    statusKnown: false
  })
});

/** Out-of-range source score must normalize without inventing precision. */
export const P_OUT_OF_RANGE = baseProduct({
  barcode: "3400000000016",
  environment: env({ sourceScore: 112.4, sourceGrade: "a", normalizedScore: 100, normalizedGrade: "a" })
});
