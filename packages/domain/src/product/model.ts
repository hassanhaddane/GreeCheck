/* ════════════════════════════════════════════════════════════════
   Normalized product model — the ONE shape every UI/engine consumes.
   Raw source payloads (OFF, later Ciqual/USDA) never leak past the
   normalizer. Absence of data is UNKNOWN, never negative.
   ════════════════════════════════════════════════════════════════ */

export type Grade = "a" | "b" | "c" | "d" | "e";

export interface Nutriments {
  energyKcal?: number;
  sugars?: number;
  salt?: number;
  saturatedFat?: number;
  fat?: number;
  fiber?: number;
  proteins?: number;
}

/**
 * Halal compatibility — a personal-compatibility fact, never a quality signal.
 * "not_confirmed" MUST NOT be treated as "not halal".
 */
export type HalalStatus =
  | "confirmed"        // explicit halal label/certification
  | "not_confirmed"    // ingredients known, no certification, no red flag
  | "incompatible"     // a clearly incompatible ingredient was detected
  | "check_required"   // ambiguous ingredient (gelatin, carmine, rennet…)
  | "unknown";         // no ingredient information at all

export type VeganStatus = "confirmed" | "incompatible" | "unknown";

export type PalmOilStatus = "present" | "absent_claimed" | "unknown";

export type Confidence = "high" | "medium" | "low";

/** Which key signals the source actually provided. */
export interface DataAvailability {
  name: boolean;
  image: boolean;
  ingredients: boolean;
  nutrition: boolean;
  nutriScore: boolean;
  nova: boolean;
  categories: boolean;
}

/** Per-product data-quality summary (filled by the normalizer). */
export interface DataQuality {
  availability: DataAvailability;
  /** 0–100 share of key fields present. */
  completeness: number;
  confidence: Confidence;
  /** i18n-able codes of the MISSING key signals — makes confidence explainable. */
  confidenceReasons: string[];
}


/* ── environmental reading (Green-Score / Eco-Score) ─────────────── */

/** Sub-signals of the environmental assessment (source adjustment values). */
export interface EnvironmentalAdjustments {
  /** Origins of ingredients bonus/malus (source value, typically −5…+5). */
  originsValue?: number;
  /** Packaging malus (source value, ≤ 0). */
  packagingValue?: number;
  /** Production-system bonus (source value, ≥ 0) + the labels that earned it. */
  productionSystemValue?: number;
  productionSystemLabels?: string[];
  /** Threatened-species malus (e.g. uncertified palm oil) + the ingredient. */
  threatenedSpeciesValue?: number;
  threatenedSpeciesIngredient?: string;
}

/**
 * Normalized environmental reading. SOURCE values are preserved verbatim next
 * to normalized ones; the lifecycle score is CATEGORY-level (Agribalyse) and
 * must never be presented as a product-specific measurement.
 */
export interface ProductEnvironment {
  provider: "openfoodfacts";
  sourceScore?: number;
  sourceGrade?: string;
  normalizedScore?: number;
  normalizedGrade?: Grade;
  /** Category-level lifecycle score (Agribalyse), when provided. */
  lifecycleScore?: number;
  adjustments?: EnvironmentalAdjustments;
  /** Signals the SOURCE itself declares missing (labels, origins, packagings…). */
  sourceMissing?: string[];
  /** True when the source marks its assessment status as known. */
  statusKnown?: boolean;
}

export interface Product {
  /* identity */
  barcode: string;
  name: string;
  brand?: string;
  imageUrl?: string;
  quantity?: string;
  categories?: string[];
  /** Region/market tags (countries where the product is sold). */
  countries?: string[];
  /** Quality/claim label tags (bio, fair-trade, sans gluten…). */
  labels?: string[];
  /* composition */
  ingredientsText?: string;
  allergens?: string[];
  additives?: string[];
  traces?: string[];
  nutriments: Nutriments;
  /* official gradings */
  nutriScore?: Grade;
  /** Original Nutri-Score RAW points as provided by the source (OFF `nutriscore_score`). */
  nutriScorePoints?: number;
  novaGroup?: 1 | 2 | 3 | 4;
  greenScore?: Grade;
  /** Full environmental reading (source + normalized); greenScore stays the quick grade. */
  environment?: ProductEnvironment;
  /* derived statuses (explicit unknowns) */
  halalStatus?: HalalStatus;
  veganStatus?: VeganStatus;
  vegetarianStatus?: VeganStatus;
  palmOilStatus?: PalmOilStatus;
  /* boolean conveniences (status === "confirmed") — kept for engines/UI */
  isBio?: boolean;
  isHalal?: boolean;
  isVegan?: boolean;
  isVegetarian?: boolean;
  /* provenance & quality */
  source: "openfoodfacts" | "ciqual" | "usda";
  /** Always set by the normalizer; may be absent on old cached rows. */
  dataQuality?: DataQuality;
}

/** Assessment status of a normalized product. */
export type AssessmentStatus =
  | "complete"               // all key data present
  | "usable_incomplete"      // score computable, some data missing
  | "insufficient_for_score";// neither Nutri-Score nor nutrition facts

export type ProductState = AssessmentStatus | "not_found";
