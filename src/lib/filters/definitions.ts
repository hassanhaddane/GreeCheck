/**
 * Smart Filters 2.0 — pure predicates over a product and its GreeScore.
 * Smart filters use the GreeScore (which already factors in the user's LOCAL
 * preferences), so filtering is personalized without any backend.
 * Missing data → excluded (false): filters never guess.
 */
import {
  Leaf, MoonStar, Sprout, Salad, WheatOff, MilkOff, TreePalm, FlaskConical,
  Candy, Droplets, Beef, Wheat, Globe, Dumbbell, Scale, Sunrise, Cookie,
  ShieldCheck, Star, Factory, Repeat, CalendarCheck, Users, Store
} from "lucide-react";
import type { Product } from "@greecheck/domain/product/model";
import type { SmartFilter, FilterGroup, FilterLocale } from "@/types/filters";
import { NUTRITION_THRESHOLDS as T } from "@greecheck/domain/scoring/thresholds";

// Back-compat aliases — canonical types live in types/filters.
export type { FilterGroup };
export type Locale = FilterLocale;
export type FilterDef = SmartFilter;

const labels = (p: Product) => (p.labels ?? []).join(" ").toLowerCase();
const ing = (p: Product) => (p.ingredientsText ?? "").toLowerCase();
const num = (v: number | undefined) => (v === undefined ? null : v);
const additiveCount = (p: Product) => p.additives?.length ?? 0;
const hasIngredientData = (p: Product) => Boolean(p.ingredientsText) || p.additives !== undefined;

export const FILTER_DEFS: SmartFilter[] = [
  /* ── Diet & labels ── */
  {
    id: "bio", group: "diet", icon: Leaf,
    label: { fr: "Bio", en: "Organic", ar: "عضوي" },
    description: { fr: "Label agriculture biologique", en: "Certified organic label", ar: "حاصل على شهادة عضوية" },
    match: (p) => !!p.isBio
  },
  {
    id: "halal", group: "diet", icon: MoonStar,
    label: { fr: "Halal", en: "Halal", ar: "حلال" },
    description: { fr: "Label halal détecté", en: "Halal label detected", ar: "ملصق حلال" },
    match: (p) => !!p.isHalal
  },
  {
    id: "vegan", group: "diet", icon: Sprout,
    label: { fr: "Vegan", en: "Vegan", ar: "نباتي صرف" },
    description: { fr: "Sans aucun produit animal", en: "No animal products", ar: "بدون منتجات حيوانية" },
    match: (p) => !!p.isVegan
  },
  {
    id: "vegetarian", group: "diet", icon: Salad,
    label: { fr: "Végétarien", en: "Vegetarian", ar: "نباتي" },
    description: { fr: "Sans viande ni poisson", en: "No meat or fish", ar: "بدون لحم أو سمك" },
    match: (p) => !!p.isVegetarian
  },
  {
    id: "gluten_free", group: "diet", icon: WheatOff,
    label: { fr: "Sans gluten", en: "Gluten-free", ar: "خالٍ من الغلوتين" },
    description: { fr: "Aucun gluten détecté", en: "No gluten detected", ar: "لا غلوتين" },
    match: (p) => /gluten[- ]?free|sans gluten|no gluten/.test(labels(p)) || (!!p.allergens && !p.allergens.some((a) => /gluten|wheat|blé/i.test(a)) && (p.allergens.length > 0 || ing(p).length > 0))
  },
  {
    id: "lactose_free", group: "diet", icon: MilkOff,
    label: { fr: "Sans lactose", en: "Lactose-free", ar: "خالٍ من اللاكتوز" },
    description: { fr: "Aucun lactose détecté", en: "No lactose detected", ar: "لا لاكتوز" },
    match: (p) => /lactose[- ]?free|sans lactose|no lactose/.test(labels(p)) || (!!p.allergens && !p.allergens.some((a) => /milk|lactose|lait/i.test(a)) && p.allergens.length > 0)
  },
  {
    id: "no_palm_oil", group: "diet", icon: TreePalm,
    label: { fr: "Sans huile de palme", en: "No palm oil", ar: "بدون زيت النخيل" },
    description: { fr: "Ingrédients sans palme", en: "Palm-free ingredients", ar: "مكونات بدون نخيل" },
    match: (p) => /palm oil free|no palm|sans huile de palme/.test(labels(p)) || (ing(p).length > 0 && !/palm/.test(ing(p)))
  },
  {
    id: "no_additives", group: "diet", icon: FlaskConical,
    label: { fr: "Sans additifs", en: "No additives", ar: "بدون إضافات" },
    description: { fr: "Zéro additif détecté", en: "Zero additives detected", ar: "صفر إضافات" },
    match: (p) => additiveCount(p) === 0 && hasIngredientData(p)
  },

  /* ── Nutrition ── */
  {
    id: "low_sugar", group: "nutrition", icon: Candy,
    label: { fr: "Faible sucre", en: "Low sugar", ar: "سكر منخفض" },
    description: { fr: "≤ 5 g de sucre / 100 g", en: "≤ 5 g sugar / 100 g", ar: "≤ 5غ سكر / 100غ" },
    match: (p) => num(p.nutriments.sugars) !== null && p.nutriments.sugars! <= T.sugarLow
  },
  {
    id: "low_salt", group: "nutrition", icon: Droplets,
    label: { fr: "Faible sel", en: "Low salt", ar: "ملح منخفض" },
    description: { fr: "≤ 0,3 g de sel / 100 g", en: "≤ 0.3 g salt / 100 g", ar: "≤ 0.3غ ملح / 100غ" },
    match: (p) => num(p.nutriments.salt) !== null && p.nutriments.salt! <= T.saltLow
  },
  {
    id: "high_protein", group: "nutrition", icon: Beef,
    label: { fr: "Riche protéines", en: "High protein", ar: "غني بالبروتين" },
    description: { fr: "≥ 10 g de protéines / 100 g", en: "≥ 10 g protein / 100 g", ar: "≥ 10غ بروتين / 100غ" },
    match: (p) => num(p.nutriments.proteins) !== null && p.nutriments.proteins! >= 10
  },
  {
    id: "high_fiber", group: "nutrition", icon: Wheat,
    label: { fr: "Riche fibres", en: "High fiber", ar: "غني بالألياف" },
    description: { fr: "≥ 6 g de fibres / 100 g", en: "≥ 6 g fiber / 100 g", ar: "≥ 6غ ألياف / 100غ" },
    match: (p) => num(p.nutriments.fiber) !== null && p.nutriments.fiber! >= T.fiberHigh
  },
  {
    id: "green_high", group: "nutrition", icon: Globe,
    label: { fr: "Green-Score élevé", en: "High Green-Score", ar: "Green-Score مرتفع" },
    description: { fr: "Impact environnemental A ou B", en: "Environmental impact A or B", ar: "أثر بيئي A أو B" },
    match: (p) => !!p.greenScore && ["a", "b"].includes(p.greenScore)
  },

  /* ── Smart (GreeScore-aware) ── */
  {
    id: "muscle", group: "smart", icon: Dumbbell,
    label: { fr: "Best for muscle", en: "Best for muscle", ar: "الأفضل للعضلات" },
    description: { fr: "Protéiné et peu transformé", en: "High protein, minimally processed", ar: "بروتين عالٍ ومعالجة قليلة" },
    match: (p) => num(p.nutriments.proteins) !== null && p.nutriments.proteins! >= T.proteinHigh && (p.novaGroup ?? 4) <= 3
  },
  {
    id: "weight_loss", group: "smart", icon: Scale,
    label: { fr: "Best for weight loss", en: "Best for weight loss", ar: "الأفضل لإنقاص الوزن" },
    description: { fr: "Peu calorique, peu sucré, sain", en: "Low calorie, low sugar, healthy", ar: "سعرات وسكر منخفضان" },
    match: (p, g) => num(p.nutriments.energyKcal) !== null && p.nutriments.energyKcal! <= 150 && (p.nutriments.sugars ?? 99) <= 10 && g.subScores.nutrition >= 55
  },
  {
    id: "breakfast", group: "smart", icon: Sunrise,
    label: { fr: "Clean breakfast", en: "Clean breakfast", ar: "فطور نظيف" },
    description: { fr: "Fibres au rendez-vous, sucre maîtrisé", en: "Good fiber, controlled sugar", ar: "ألياف جيدة وسكر معتدل" },
    match: (p) => (p.nutriments.sugars ?? 99) <= 15 && num(p.nutriments.fiber) !== null && p.nutriments.fiber! >= T.fiberOk
  },
  {
    id: "healthy_snack", group: "smart", icon: Cookie,
    label: { fr: "Smart snack", en: "Smart snack", ar: "وجبة خفيفة ذكية" },
    description: { fr: "Bon score, léger, peu transformé", en: "Good score, light, low processed", ar: "نتيجة جيدة وخفيف" },
    match: (p, g) => g.global >= 60 && (g.subScores.processing ?? 0) >= 50 && (p.nutriments.energyKcal ?? 999) <= 250
  },
  {
    id: "halal_ok", group: "smart", icon: ShieldCheck,
    label: { fr: "Halal safe", en: "Halal safe", ar: "آمن حلال" },
    description: { fr: "Label halal vérifié", en: "Verified halal label", ar: "ملصق حلال موثق" },
    match: (p) => !!p.isHalal
  },
  {
    id: "best_bio", group: "smart", icon: Star,
    label: { fr: "Bio first", en: "Bio first", ar: "عضوي أولاً" },
    description: { fr: "Bio avec un bon GreeScore", en: "Organic with a good GreeScore", ar: "عضوي بنتيجة جيدة" },
    match: (p, g) => !!p.isBio && g.global >= 55
  },
  {
    id: "less_processed", group: "smart", icon: Factory,
    label: { fr: "Low processed", en: "Low processed", ar: "معالجة قليلة" },
    description: { fr: "NOVA 1 ou 2 uniquement", en: "NOVA 1 or 2 only", ar: "NOVA 1 أو 2 فقط" },
    match: (p) => (p.novaGroup ?? 4) <= 2
  },
  {
    id: "low_sugar_swap", group: "smart", icon: Repeat,
    label: { fr: "Low sugar swap", en: "Low sugar swap", ar: "بديل قليل السكر" },
    description: { fr: "Alternative peu sucrée et correcte", en: "Low-sugar, decent alternative", ar: "بديل قليل السكر وجيد" },
    match: (p, g) => num(p.nutriments.sugars) !== null && p.nutriments.sugars! <= T.sugarLow && g.global >= 55
  },
  {
    id: "daily_use", group: "smart", icon: CalendarCheck,
    label: { fr: "Better for daily use", en: "Better for daily use", ar: "أفضل للاستخدام اليومي" },
    description: { fr: "Sain au quotidien, sans alerte majeure", en: "Healthy every day, no major warning", ar: "صحي يومياً بدون تحذير كبير" },
    match: (p, g) => g.global >= 65 && g.warnings.every((w) => w.level === "info") && (p.novaGroup ?? 4) <= 3
  },
  {
    id: "family_safe", group: "smart", icon: Users,
    label: { fr: "Family safe", en: "Family safe", ar: "آمن للعائلة" },
    description: { fr: "Sans additif à risque, sucre et sel maîtrisés", en: "No risky additives, controlled sugar & salt", ar: "بدون إضافات خطرة وسكر وملح معتدلان" },
    match: (p, g) => (g.subScores.additives ?? 0) >= 80 && (p.nutriments.sugars ?? 99) <= T.sugarHigh && (p.nutriments.salt ?? 99) <= T.saltHigh && (p.novaGroup ?? 4) <= 3
  },
  {
    id: "supermarket_best", group: "smart", icon: Store,
    label: { fr: "Supermarket best choice", en: "Supermarket best choice", ar: "أفضل خيار في السوبرماركت" },
    description: { fr: "Le haut du panier : score ≥ 70", en: "Top of the shelf: score ≥ 70", ar: "الأفضل على الرف: نتيجة ≥ 70" },
    match: (_p, g) => g.global >= 70
  }
];

export const NUTRI_LETTERS = ["a", "b", "c", "d", "e"] as const;
export const NOVA_GROUPS = [1, 2, 3, 4] as const;
