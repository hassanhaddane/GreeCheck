/**
 * Product normalizer — the ONLY place that understands the raw Open Food Facts
 * shape. Everything else (UI, scoring, storage) consumes the normalized
 * `Product`, so adding sources (Ciqual, USDA) never touches the UI.
 */
import type {
  Product, Grade, Confidence, AssessmentStatus, HalalStatus, VeganStatus,
  PalmOilStatus, DataAvailability, DataQuality
} from "@/domains/product/model";

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

/* --------------------- status classification (facts) -------------------- */

/** Clearly incompatible with halal. */
const HALAL_HARD = [
  "pork", "porc", "lard", "bacon", "ham", "jambon",
  "alcohol", "alcool", "wine", "vin", "beer", "biere", "bière",
  "rum", "rhum", "vodka", "whisky", "ethanol"
];
/** Ambiguous — origin/certification must be checked, NOT assumed haram. */
const HALAL_AMBIGUOUS = [
  "gelatin", "gelatine", "gélatine",
  "e120", "carmin", "cochineal", "cochenille",
  "e441", "e542", "e920",
  "présure", "presure", "rennet"
];
const VEGAN_INCOMPATIBLE = [
  "pork", "porc", "boeuf", "beef", "poulet", "chicken", "viande", "meat",
  "poisson", "fish", "thon", "saumon", "lait", "milk", "beurre", "butter",
  "fromage", "cheese", "oeuf", "œuf", "egg", "miel", "honey",
  "gelatin", "gelatine", "gélatine", "crème", "cream", "yaourt", "lardons"
];
const VEGETARIAN_INCOMPATIBLE = [
  "pork", "porc", "boeuf", "beef", "poulet", "chicken", "viande", "meat",
  "poisson", "fish", "thon", "saumon", "gelatin", "gelatine", "gélatine",
  "lard", "lardons", "jambon", "bacon"
];

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Word-bounded keyword match — "rum" must NOT match "lactosérum",
 * "vin" must NOT match "vinaigre", "ham" must NOT match "graham".
 */
function textHas(hay: string, needles: string[]): boolean {
  return needles.some((n) => new RegExp(`(?<![a-zà-ÿ])${escapeRe(n)}(?![a-zà-ÿ])`).test(hay));
}

/** Classify halal compatibility. "not_confirmed" is NEVER "not halal". */
export function classifyHalal(ingredientsText: string | undefined, labels: string[] | undefined): HalalStatus {
  if (hasLabel(labels, "halal")) return "confirmed";
  const hay = (ingredientsText ?? "").toLowerCase();
  const hasIngredients = hay.trim().length > 2;
  if (hasIngredients && textHas(hay, HALAL_HARD)) return "incompatible";
  if (hasIngredients && textHas(hay, HALAL_AMBIGUOUS)) return "check_required";
  if (hasIngredients) return "not_confirmed";
  return "unknown";
}

export function classifyVegan(ingredientsText: string | undefined, labels: string[] | undefined): VeganStatus {
  if (hasLabel(labels, "vegan")) return "confirmed";
  const hay = (ingredientsText ?? "").toLowerCase();
  if (hay.trim().length > 2 && textHas(hay, VEGAN_INCOMPATIBLE)) return "incompatible";
  return "unknown";
}

export function classifyVegetarian(ingredientsText: string | undefined, labels: string[] | undefined): VeganStatus {
  if (hasLabel(labels, "vegetarian", "vegan")) return "confirmed";
  const hay = (ingredientsText ?? "").toLowerCase();
  if (hay.trim().length > 2 && textHas(hay, VEGETARIAN_INCOMPATIBLE)) return "incompatible";
  return "unknown";
}

export function classifyPalmOil(ingredientsText: string | undefined, labels: string[] | undefined): PalmOilStatus {
  const hay = `${ingredientsText ?? ""} ${(labels ?? []).join(" ")}`.toLowerCase();
  if (/sans huile de palme|palm oil free|no palm/.test(hay)) return "absent_claimed";
  if (/palm/.test(hay)) return "present";
  return "unknown";
}

/* ----------------------- completeness / confidence ---------------------- */

export function availabilityOf(p: Product): DataAvailability {
  const n = p.nutriments;
  return {
    name: Boolean(p.name),
    image: Boolean(p.imageUrl),
    ingredients: Boolean(p.ingredientsText && p.ingredientsText.length > 2),
    nutrition: [n.energyKcal, n.sugars, n.salt, n.saturatedFat, n.proteins].some((v) => v !== undefined),
    nutriScore: Boolean(p.nutriScore),
    nova: Boolean(p.novaGroup),
    categories: Boolean(p.categories?.length)
  };
}

/**
 * Data quality: completeness (0–100), confidence and its EXPLANATION —
 * `confidenceReasons` lists the missing key signals as i18n codes.
 */
export function computeDataQuality(p: Product): DataQuality {
  const a = availabilityOf(p);
  const keys = Object.keys(a) as (keyof DataAvailability)[];
  const present = keys.filter((k) => a[k]).length;
  const completeness = Math.round((present / keys.length) * 100);

  const confidence: Confidence =
    a.nutriScore && a.nutrition && a.ingredients ? "high" : a.nutrition || a.nutriScore ? "medium" : "low";

  const confidenceReasons: string[] = [];
  if (!a.nutriScore) confidenceReasons.push("missingNutriScore");
  if (!a.nutrition) confidenceReasons.push("missingNutrition");
  if (!a.ingredients) confidenceReasons.push("missingIngredients");
  if (!a.nova) confidenceReasons.push("missingNova");

  return { availability: a, completeness, confidence, confidenceReasons };
}

export interface Assessment {
  status: AssessmentStatus;
  confidence: Confidence;
  /** Missing key signals (same codes as confidenceReasons). */
  missing: string[];
  completeness: number;
}

/** Assess a normalized product into an explicit, UI-ready state. */
export function assessProduct(p: Product): Assessment {
  const q = p.dataQuality ?? computeDataQuality(p);
  const a = q.availability;
  const status: AssessmentStatus =
    a.name && a.ingredients && a.nutrition && a.nutriScore && a.nova
      ? "complete"
      : a.name && (a.nutrition || a.nutriScore)
        ? "usable_incomplete"
        : "insufficient_for_score";
  return { status, confidence: q.confidence, missing: q.confidenceReasons, completeness: q.completeness };
}

/**
 * Ensure derived statuses/quality exist — used when reviving products that
 * were cached/persisted before these fields existed.
 */
export function ensureDerived(p: Product): Product {
  if (p.dataQuality && p.halalStatus) return p;
  const halalStatus = p.halalStatus ?? classifyHalal(p.ingredientsText, p.labels);
  const enriched: Product = {
    ...p,
    halalStatus: p.isHalal ? "confirmed" : halalStatus,
    veganStatus: p.veganStatus ?? (p.isVegan ? "confirmed" : classifyVegan(p.ingredientsText, p.labels)),
    vegetarianStatus: p.vegetarianStatus ?? (p.isVegetarian ? "confirmed" : classifyVegetarian(p.ingredientsText, p.labels)),
    palmOilStatus: p.palmOilStatus ?? classifyPalmOil(p.ingredientsText, p.labels)
  };
  enriched.dataQuality = p.dataQuality ?? computeDataQuality(enriched);
  return enriched;
}

/* ------------------------------ normalizer ------------------------------ */

/** Normalize a raw OFF product into GreeCheck's `Product`. */
export function mapOffProduct(raw: OffRawProduct): Product {
  const n = raw.nutriments ?? {};
  const labelTags = raw.labels_tags;

  const nova = num(raw.nova_group);
  const novaGroup = nova && nova >= 1 && nova <= 4 ? (Math.round(nova) as 1 | 2 | 3 | 4) : undefined;

  const ingredientsText = raw.ingredients_text || raw.ingredients_text_fr || raw.ingredients_text_en || undefined;
  const labels = cleanTags(raw.labels_tags);

  const halalStatus = classifyHalal(ingredientsText, labels);
  const veganStatus = classifyVegan(ingredientsText, labels);
  const vegetarianStatus = classifyVegetarian(ingredientsText, labels);
  const palmOilStatus = classifyPalmOil(ingredientsText, labels);

  const product: Product = {
    barcode: raw.code ?? "",
    name: raw.product_name || raw.product_name_fr || raw.product_name_en || "",
    brand: raw.brands?.split(",")[0]?.trim() || undefined,
    imageUrl: raw.image_front_url || raw.image_url || undefined,
    quantity: raw.quantity || undefined,
    categories: cleanTags(raw.categories_tags),
    labels,
    countries: cleanTags(raw.countries_tags),
    ingredientsText,
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
    halalStatus,
    veganStatus,
    vegetarianStatus,
    palmOilStatus,
    isBio: hasLabel(labelTags, "organic", "bio", "ab agriculture"),
    isHalal: halalStatus === "confirmed",
    isVegan: veganStatus === "confirmed",
    isVegetarian: vegetarianStatus === "confirmed",
    source: "openfoodfacts"
  };
  product.dataQuality = computeDataQuality(product);
  return product;
}
