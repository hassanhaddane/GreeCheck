/**
 * Search filter definitions — pure predicates over a product and its GreeScore.
 * Smart filters use the GreeScore (which already factors in the user's LOCAL
 * preferences), so filtering is personalized without any backend.
 */
import type { Product } from "@/types/product";
import type { SmartFilter, FilterGroup, FilterLocale } from "@/types/filters";

// Back-compat aliases — canonical types live in types/filters.
export type { FilterGroup };
export type Locale = FilterLocale;
export type FilterDef = SmartFilter;

const labels = (p: Product) => (p.labels ?? []).join(" ").toLowerCase();
const ing = (p: Product) => (p.ingredientsText ?? "").toLowerCase();
const num = (v: number | undefined) => (v === undefined ? null : v);

export const FILTER_DEFS: SmartFilter[] = [
  /* ── Diet & labels ── */
  { id: "bio", group: "diet", label: { fr: "Bio", en: "Organic", ar: "عضوي" }, match: (p) => !!p.isBio },
  { id: "halal", group: "diet", label: { fr: "Halal", en: "Halal", ar: "حلال" }, match: (p) => !!p.isHalal },
  { id: "vegan", group: "diet", label: { fr: "Vegan", en: "Vegan", ar: "نباتي صرف" }, match: (p) => !!p.isVegan },
  { id: "vegetarian", group: "diet", label: { fr: "Végétarien", en: "Vegetarian", ar: "نباتي" }, match: (p) => !!p.isVegetarian },
  {
    id: "gluten_free", group: "diet", label: { fr: "Sans gluten", en: "Gluten-free", ar: "خالٍ من الغلوتين" },
    match: (p) => /gluten[- ]?free|sans gluten|no gluten/.test(labels(p)) || (!!p.allergens && !p.allergens.some((a) => /gluten|wheat|blé/i.test(a)) && (p.allergens.length > 0 || ing(p).length > 0))
  },
  {
    id: "lactose_free", group: "diet", label: { fr: "Sans lactose", en: "Lactose-free", ar: "خالٍ من اللاكتوز" },
    match: (p) => /lactose[- ]?free|sans lactose|no lactose/.test(labels(p)) || (!!p.allergens && !p.allergens.some((a) => /milk|lactose|lait/i.test(a)) && p.allergens.length > 0)
  },
  {
    id: "no_palm_oil", group: "diet", label: { fr: "Sans huile de palme", en: "No palm oil", ar: "بدون زيت النخيل" },
    match: (p) => /palm oil free|no palm|sans huile de palme/.test(labels(p)) || (ing(p).length > 0 && !/palm/.test(ing(p)))
  },
  { id: "no_additives", group: "diet", label: { fr: "Sans additifs", en: "No additives", ar: "بدون إضافات" }, match: (p) => (p.additives?.length ?? 0) === 0 && (p.additives !== undefined || !!p.ingredientsText) },

  /* ── Nutrition ── */
  { id: "low_sugar", group: "nutrition", label: { fr: "Faible sucre", en: "Low sugar", ar: "سكر منخفض" }, match: (p) => num(p.nutriments.sugars) !== null && p.nutriments.sugars! <= 5 },
  { id: "low_salt", group: "nutrition", label: { fr: "Faible sel", en: "Low salt", ar: "ملح منخفض" }, match: (p) => num(p.nutriments.salt) !== null && p.nutriments.salt! <= 0.3 },
  { id: "high_protein", group: "nutrition", label: { fr: "Riche protéines", en: "High protein", ar: "غني بالبروتين" }, match: (p) => num(p.nutriments.proteins) !== null && p.nutriments.proteins! >= 10 },
  { id: "high_fiber", group: "nutrition", label: { fr: "Riche fibres", en: "High fiber", ar: "غني بالألياف" }, match: (p) => num(p.nutriments.fiber) !== null && p.nutriments.fiber! >= 6 },
  { id: "green_high", group: "nutrition", label: { fr: "Green-Score élevé", en: "High Green-Score", ar: "Green-Score مرتفع" }, match: (p) => !!p.greenScore && ["a", "b"].includes(p.greenScore) },

  /* ── Smart (GreeScore-aware) ── */
  { id: "muscle", group: "smart", label: { fr: "Prise de muscle", en: "For muscle", ar: "لبناء العضلات" }, match: (p) => num(p.nutriments.proteins) !== null && p.nutriments.proteins! >= 12 && (p.novaGroup ?? 4) <= 3 },
  { id: "weight_loss", group: "smart", label: { fr: "Perte de poids", en: "Weight loss", ar: "إنقاص الوزن" }, match: (p, g) => num(p.nutriments.energyKcal) !== null && p.nutriments.energyKcal! <= 150 && (p.nutriments.sugars ?? 99) <= 10 && g.healthScore >= 55 },
  { id: "breakfast", group: "smart", label: { fr: "Petit-déjeuner", en: "Breakfast", ar: "فطور" }, match: (p) => (p.nutriments.sugars ?? 99) <= 15 && num(p.nutriments.fiber) !== null && p.nutriments.fiber! >= 3 },
  { id: "healthy_snack", group: "smart", label: { fr: "Snack sain", en: "Healthy snack", ar: "وجبة صحية" }, match: (p, g) => g.global >= 60 && g.processingScore >= 50 && (p.nutriments.energyKcal ?? 999) <= 250 },
  { id: "halal_ok", group: "smart", label: { fr: "Compatible halal", en: "Halal-friendly", ar: "متوافق مع الحلال" }, match: (p) => !!p.isHalal },
  { id: "clean_label", group: "smart", label: { fr: "Clean label", en: "Clean label", ar: "مكونات نظيفة" }, match: (p) => (p.additives?.length ?? 0) === 0 && (p.novaGroup ?? 4) <= 2 },
  { id: "less_processed", group: "smart", label: { fr: "Moins transformé", en: "Less processed", ar: "أقل معالجة" }, match: (p) => (p.novaGroup ?? 4) <= 2 },
  { id: "less_sugar", group: "smart", label: { fr: "Moins sucré", en: "Less sugar", ar: "أقل سكراً" }, match: (p) => (p.nutriments.sugars ?? 99) <= 5 },
  { id: "best_bio", group: "smart", label: { fr: "Meilleur choix bio", en: "Best organic", ar: "أفضل عضوي" }, match: (p, g) => !!p.isBio && g.global >= 55 },
  { id: "healthier_alt", group: "smart", label: { fr: "Alternative plus saine", en: "Healthier choice", ar: "خيار أصح" }, match: (_p, g) => g.global >= 65 },
  { id: "more_natural", group: "smart", label: { fr: "Alternative plus naturelle", en: "More natural", ar: "أكثر طبيعية" }, match: (_p, g) => g.naturalityScore >= 65 }
];

export const NUTRI_LETTERS = ["a", "b", "c", "d", "e"] as const;
export const NOVA_GROUPS = [1, 2, 3, 4] as const;
