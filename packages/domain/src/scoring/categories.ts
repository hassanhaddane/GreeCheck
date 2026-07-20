/**
 * Category interpretation for GreeScore GS-2: beverage/water detection,
 * excluded categories and unsupported special categories.
 *
 * Product.categories are Open Food Facts tags cleaned by the normalizer
 * ("en:alcoholic-beverages" → "alcoholic beverages"): matching is on those
 * cleaned, lowercase strings. Detection is CATEGORY-based only — never
 * inferred from marketing wording in the product name.
 */
import type { Product } from "../product/model";
import type { NutritionKind } from "./nutrition";

const has = (cats: string[], ...needles: string[]) =>
  cats.some((c) => needles.some((n) => c === n || c.includes(n)));

const catsOf = (p: Product): string[] => (p.categories ?? []).map((c) => c.toLowerCase());

/* ── beverages & water ── */

const BEVERAGE_CATS = [
  "beverages", "boissons", "sodas", "juices", "jus de fruits", "nectars",
  "iced teas", "energy drinks", "sports drinks", "flavoured drinks",
  "plant based drinks", "plant milks", "smoothies", "syrups", "waters"
];
/** Milk itself is treated as SOLID by the original Nutri-Score. */
const NOT_BEVERAGE = ["milks", "laits", "drinkable yogurts", "soups", "soupes"];

const WATER_CATS = ["waters", "mineral waters", "spring waters", "eaux", "sparkling waters"];

export function nutritionKindOf(p: Product): NutritionKind {
  const cats = catsOf(p);
  if (has(cats, ...NOT_BEVERAGE)) return "solid";
  return has(cats, ...BEVERAGE_CATS) ? "beverage" : "solid";
}
export function isWater(p: Product): boolean {
  return has(catsOf(p), ...WATER_CATS);
}

/* ── excluded categories (never scored) ── */

export type ExclusionCode =
  | "excluded_alcohol"
  | "excluded_pure_sugar"
  | "excluded_infant_formula"
  | "excluded_protein_supplement"
  | "excluded_dietary_supplement"
  | "excluded_pet_food"
  | "excluded_unsupported_category";

const EXCLUSIONS: ReadonlyArray<[ExclusionCode, string[]]> = [
  ["excluded_alcohol", ["alcoholic beverages", "beers", "wines", "spirits", "liqueurs", "ciders", "cocktails alcoolisés"]],
  ["excluded_pure_sugar", ["sugars", "sucres", "table sugars", "honeys", "miels", "sweeteners"]],
  ["excluded_infant_formula", ["infant formulas", "baby milks", "laits infantiles", "follow on milks", "baby foods"]],
  ["excluded_protein_supplement", ["protein powders", "bodybuilding supplements", "protéines en poudre", "mass gainers"]],
  ["excluded_dietary_supplement", ["dietary supplements", "food supplements", "compléments alimentaires", "vitamins"]],
  ["excluded_pet_food", ["pet food", "dog food", "cat food", "aliments pour animaux", "petfood"]]
];

export function exclusionOf(p: Product): ExclusionCode | undefined {
  const cats = catsOf(p);
  /* alcohol also by declared alcohol content in the name is NOT used — tags only */
  for (const [code, needles] of EXCLUSIONS) {
    if (has(cats, ...needles)) return code;
  }
  return undefined;
}

/* ── unsupported special categories ── */
/*  Yuka documents SPECIAL formulas for these but does not publish the exact
    numeric mappings (chocolate: cocoa-% and butter rules — weights are public,
    mappings are not; salt: requires extraction/refinement data absent from our
    model). Per methodology, we NEVER invent the missing rules: these products
    return a typed unsupported result. See gree-score-v2.md §6.               */

export type SpecialCategoryCode =
  | "unsupported_special_category_salt"
  | "unsupported_special_category_chocolate";

const SPECIAL: ReadonlyArray<[SpecialCategoryCode, string[]]> = [
  ["unsupported_special_category_salt", ["salts", "table salts", "sels", "fleur de sel", "sea salts"]],
  ["unsupported_special_category_chocolate", ["chocolates", "dark chocolates", "milk chocolates", "chocolats", "white chocolates", "chocolate bars"]]
];

export function specialCategoryOf(p: Product): SpecialCategoryCode | undefined {
  const cats = catsOf(p);
  for (const [code, needles] of SPECIAL) {
    if (has(cats, ...needles)) return code;
  }
  return undefined;
}
