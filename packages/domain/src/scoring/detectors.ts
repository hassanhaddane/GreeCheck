/**
 * Pure ingredient/label detectors shared by scoring, basket analysis and filters.
 * No React, no I/O — deterministic string heuristics over normalized products.
 */
import type { Product, HalalStatus } from "../product/model";
import { classifyHalal } from "../product/normalizer";

/** Ingredient keywords suggesting non-halal content (heuristic). */
export const HARAM_KEYWORDS = [
  "pork", "porc", "lard", "bacon", "ham", "jambon",
  "gelatin", "gelatine", "gélatine",
  "alcohol", "alcool", "wine", "vin", "beer", "biere", "bière",
  "rum", "rhum", "vodka", "ethanol"
] as const;

/** True when the ingredient list or labels suggest a non-halal ingredient. */
export function detectHaram(p: Product): boolean {
  const hay = `${p.ingredientsText ?? ""} ${(p.labels ?? []).join(" ")}`.toLowerCase();
  // Word-bounded: "rum" ≠ "lactosérum", "vin" ≠ "vinaigre", "ham" ≠ "graham".
  return HARAM_KEYWORDS.some((k) => new RegExp(`(?<![a-zà-ÿ])${k}(?![a-zà-ÿ])`).test(hay));
}

/**
 * Preferred halal signal: the normalized 5-state status. Only "incompatible"
 * is a conflict — "not_confirmed"/"unknown" stay NEUTRAL by design.
 */
export function halalStatusOf(p: Product): HalalStatus {
  return p.halalStatus ?? (p.isHalal ? "confirmed" : classifyHalal(p.ingredientsText, p.labels));
}

/** True when palm oil is present and not explicitly excluded. */
export function hasPalmOil(p: Product): boolean {
  const hay = `${p.ingredientsText ?? ""} ${(p.labels ?? []).join(" ")}`.toLowerCase();
  return /palm/.test(hay) && !/sans huile de palme|palm oil free|no palm/.test(hay);
}

const allergenWords = (value: string) => value.normalize("NFKD").toLowerCase().replace(/\p{M}/gu, "")
  .replace(/^[a-z]{2,3}:/, "").match(/[\p{L}\p{N}]+/gu)?.join(" ") ?? "";

const allergenAliases: Record<string, string[]> = {
  gluten: ["gluten", "glúten", "غلوتين", "جلوتين"],
  milk: ["milk", "lait", "leche", "حليب"],
  lactose: ["lactose", "lactosa", "لاكتوز"],
  eggs: ["egg", "eggs", "œuf", "œufs", "oeuf", "oeufs", "huevo", "huevos", "بيض"],
  peanuts: ["peanut", "peanuts", "arachide", "arachides", "cacahuète", "cacahuètes", "cacahuete", "cacahuetes", "فول سوداني"],
  nuts: ["nuts", "tree nuts", "fruits à coque", "fruits a coque", "frutos secos", "مكسرات"],
  soybeans: ["soybeans", "soy", "soya", "soja", "صويا"],
  palm: ["palm", "palme", "palma", "نخيل"]
};

/** Match reported tags and whole phrases, including reported traces. */
export function matchingAllergens(p: Product, avoidAllergens: readonly string[]): string[] {
  const facts = [p.ingredientsText ?? "", ...(p.allergens ?? []), ...(p.traces ?? [])]
    .map(value => " " + allergenWords(value) + " ");
  return [...new Set(avoidAllergens.filter(value => {
    const term = allergenWords(value);
    const aliases = Object.hasOwn(allergenAliases, term) ? allergenAliases[term] : [term];
    return term.length > 0 && aliases.some(alias =>
      facts.some(fact => fact.includes(" " + allergenWords(alias) + " ")));
  }))];
}

export function hasAllergenConflict(p: Product, avoidAllergens: string[]): boolean {
  return matchingAllergens(p, avoidAllergens).length > 0;
}

/** True when at least one nutriment value is known. */
export function hasAnyNutrition(p: Product): boolean {
  return Object.values(p.nutriments).some((v) => v !== undefined);
}

/** True when we have ingredient-level data (text, additives or allergens). */
export function hasIngredientsData(p: Product): boolean {
  return (
    Boolean(p.ingredientsText?.trim()) ||
    (p.additives?.length ?? 0) > 0 ||
    (p.allergens?.length ?? 0) > 0
  );
}
