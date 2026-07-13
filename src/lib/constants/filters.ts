export interface FilterChip {
  id: string;
  group: "classic" | "smart";
  label: { fr: string; en: string; ar: string };
}

export const FILTERS: FilterChip[] = [
  { id: "bio", group: "classic", label: { fr: "Bio", en: "Organic", ar: "عضوي" } },
  { id: "halal", group: "classic", label: { fr: "Halal", en: "Halal", ar: "حلال" } },
  { id: "vegan", group: "classic", label: { fr: "Vegan", en: "Vegan", ar: "نباتي صرف" } },
  { id: "vegetarian", group: "classic", label: { fr: "Végétarien", en: "Vegetarian", ar: "نباتي" } },
  { id: "gluten_free", group: "classic", label: { fr: "Sans gluten", en: "Gluten-free", ar: "خالٍ من الغلوتين" } },
  { id: "lactose_free", group: "classic", label: { fr: "Sans lactose", en: "Lactose-free", ar: "خالٍ من اللاكتوز" } },
  { id: "no_palm_oil", group: "classic", label: { fr: "Sans huile de palme", en: "No palm oil", ar: "بدون زيت النخيل" } },
  { id: "no_additives", group: "classic", label: { fr: "Sans additifs", en: "No additives", ar: "بدون إضافات" } },
  { id: "low_sugar", group: "classic", label: { fr: "Faible sucre", en: "Low sugar", ar: "سكر منخفض" } },
  { id: "low_salt", group: "classic", label: { fr: "Faible sel", en: "Low salt", ar: "ملح منخفض" } },
  { id: "high_protein", group: "classic", label: { fr: "Riche protéines", en: "High protein", ar: "غني بالبروتين" } },
  { id: "high_fiber", group: "classic", label: { fr: "Riche fibres", en: "High fiber", ar: "غني بالألياف" } },
  { id: "muscle", group: "smart", label: { fr: "Prise de muscle", en: "For muscle", ar: "لبناء العضلات" } },
  { id: "weight_loss", group: "smart", label: { fr: "Perte de poids", en: "Weight loss", ar: "لإنقاص الوزن" } },
  { id: "breakfast", group: "smart", label: { fr: "Petit-déjeuner", en: "Breakfast", ar: "فطور" } },
  { id: "healthy_snack", group: "smart", label: { fr: "Snack sain", en: "Healthy snack", ar: "وجبة صحية" } },
  { id: "clean_label", group: "smart", label: { fr: "Clean label", en: "Clean label", ar: "مكونات نظيفة" } },
  { id: "less_processed", group: "smart", label: { fr: "Moins transformé", en: "Less processed", ar: "أقل معالجة" } },
  { id: "before_sport", group: "smart", label: { fr: "Bon avant sport", en: "Pre-workout", ar: "قبل الرياضة" } }
];
