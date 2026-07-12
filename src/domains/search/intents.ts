/**
 * ════════════════════════════════════════════════════════════════════════
 *  Search intents & taxonomy mapping — 100% DETERMINISTIC (no AI).
 *  Turns a free-text query or a named preset into a normalized OFF text query
 *  plus structured constraints (smart-filter ids, Nutri-Score, NOVA). Every
 *  mapping is an explicit, auditable rule — the same input always yields the
 *  same output.
 * ════════════════════════════════════════════════════════════════════════
 */
import type { FilterLocale } from "@/types/filters";

export interface IntentResult {
  /** Cleaned free-text terms sent to the OFF search (category / name / brand). */
  textQuery: string;
  /** Smart-filter ids to apply (see lib/filters/definitions). */
  filters: string[];
  /** Nutri-Score letters to allow-list. */
  nutri: string[];
  /** NOVA groups to allow-list. */
  nova: number[];
  /** i18n tokens describing the recognized modifiers (for transparent chips). */
  recognized: string[];
}

export interface IntentPreset {
  id: string;
  /** Localized display label. */
  label: Record<FilterLocale, string>;
  /** Localized seed query typed into the field. */
  query: Record<FilterLocale, string>;
}

/** Diacritic-insensitive lowercasing so "céréales" == "cereales". */
export function normalize(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

/**
 * A taxonomy modifier: localized synonyms → structured constraints. Ordered;
 * matched phrases are stripped from the free-text query so only the subject
 * (e.g. "yogurt") remains for the text search.
 */
interface Modifier {
  token: string;               // i18n/recognition token
  synonyms: string[];          // normalized phrases (fr/en/ar) that trigger it
  filters?: string[];
  nutri?: string[];
  nova?: number[];
}

const MODIFIERS: Modifier[] = [
  { token: "organic", synonyms: ["organic", "bio", "biologique", "عضوي"], filters: ["bio"] },
  { token: "lowSugar", synonyms: ["low sugar", "low-sugar", "sugar free", "sugar-free", "sans sucre", "peu sucre", "faible en sucre", "قليل السكر", "بدون سكر"], filters: ["low_sugar"] },
  { token: "lowSalt", synonyms: ["low salt", "low-salt", "low sodium", "sans sel", "peu sale", "faible en sel", "قليل الملح"], filters: ["low_salt"] },
  { token: "highProtein", synonyms: ["high protein", "high-protein", "protein rich", "riche en proteines", "proteine", "proteines", "غني بالبروتين", "بروتين عالي"], filters: ["high_protein"] },
  { token: "highFiber", synonyms: ["high fiber", "high-fiber", "high fibre", "riche en fibres", "fibres", "غني بالألياف"], filters: ["high_fiber"] },
  { token: "fewerAdditives", synonyms: ["no additives", "without additives", "fewer additives", "sans additifs", "peu d'additifs", "بدون إضافات"], filters: ["no_additives"] },
  { token: "lessProcessed", synonyms: ["less processed", "minimally processed", "unprocessed", "peu transforme", "peu transformes", "non transforme", "أقل معالجة", "قليل المعالجة"], filters: ["less_processed"], nova: [1, 2] },
  { token: "halal", synonyms: ["halal", "حلال"], filters: ["halal"] },
  { token: "vegan", synonyms: ["vegan", "vegan friendly", "نباتي صرف"], filters: ["vegan"] },
  { token: "vegetarian", synonyms: ["vegetarian", "vegetarien", "نباتي"], filters: ["vegetarian"] },
  { token: "glutenFree", synonyms: ["gluten free", "gluten-free", "sans gluten", "خالي من الغلوتين"], filters: ["gluten_free"] },
  { token: "lactoseFree", synonyms: ["lactose free", "lactose-free", "sans lactose", "خالي من اللاكتوز"], filters: ["lactose_free"] },
  { token: "noPalmOil", synonyms: ["no palm oil", "palm oil free", "sans huile de palme", "بدون زيت النخيل"], filters: ["no_palm_oil"] },
  { token: "greenScore", synonyms: ["eco friendly", "low impact", "faible impact", "eco", "أثر بيئي منخفض"], filters: ["green_high"] }
];

/**
 * Parse a free-text query into a normalized text query + structured constraints.
 * Purely rule-based: recognized modifier phrases are removed, the remainder is
 * the subject that goes to full-text search.
 */
export function parseIntent(raw: string): IntentResult {
  let rest = ` ${normalize(raw)} `;
  const filters = new Set<string>();
  const nutri = new Set<string>();
  const nova = new Set<number>();
  const recognized: string[] = [];

  for (const mod of MODIFIERS) {
    // Longest synonyms first so "low sugar" wins before a bare "sugar" subject.
    const hit = [...mod.synonyms].sort((a, b) => b.length - a.length).find((syn) => rest.includes(` ${syn} `));
    if (!hit) continue;
    recognized.push(mod.token);
    mod.filters?.forEach((f) => filters.add(f));
    mod.nutri?.forEach((n) => nutri.add(n));
    mod.nova?.forEach((n) => nova.add(n));
    rest = ` ${rest.split(` ${hit} `).join(" ").trim()} `;
  }

  const textQuery = rest.replace(/\s+/g, " ").trim();
  return { textQuery, filters: [...filters], nutri: [...nutri], nova: [...nova], recognized };
}

/** Named, one-tap intent presets (deterministic shortcuts over parseIntent). */
export const INTENT_PRESETS: IntentPreset[] = [
  { id: "organic_cereal", label: { fr: "Céréales bio", en: "Organic cereal", ar: "حبوب عضوية" }, query: { fr: "céréales bio", en: "organic cereal", ar: "حبوب عضوي" } },
  { id: "low_sugar_yogurt", label: { fr: "Yaourt peu sucré", en: "Low-sugar yogurt", ar: "زبادي قليل السكر" }, query: { fr: "yaourt sans sucre", en: "low-sugar yogurt", ar: "زبادي قليل السكر" } },
  { id: "halal_snack", label: { fr: "Snack halal", en: "Halal snack", ar: "وجبة خفيفة حلال" }, query: { fr: "snack halal", en: "halal snack", ar: "وجبة خفيفة حلال" } },
  { id: "high_protein", label: { fr: "Riche en protéines", en: "High protein", ar: "غني بالبروتين" }, query: { fr: "protéiné", en: "high protein", ar: "غني بالبروتين" } },
  { id: "fewer_additives", label: { fr: "Sans additifs", en: "Fewer additives", ar: "بدون إضافات" }, query: { fr: "sans additifs", en: "fewer additives", ar: "بدون إضافات" } },
  { id: "less_processed", label: { fr: "Peu transformé", en: "Less processed", ar: "أقل معالجة" }, query: { fr: "peu transformé", en: "less processed", ar: "أقل معالجة" } }
];

const BARCODE_RE = /^\d{8,14}$/;

/** True when the raw query is a scannable product barcode (EAN/UPC). */
export function isBarcodeQuery(raw: string): boolean {
  return BARCODE_RE.test(raw.trim());
}
