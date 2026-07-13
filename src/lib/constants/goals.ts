import type { UserGoal } from "@/types/user-preferences";

export const GOALS: { id: UserGoal; emoji: string }[] = [
  { id: "eat_healthier", emoji: "🥗" },
  { id: "go_organic", emoji: "🌱" },
  { id: "reduce_sugar", emoji: "🍬" },
  { id: "reduce_salt", emoji: "🧂" },
  { id: "reduce_additives", emoji: "🧪" },
  { id: "avoid_ultraprocessed", emoji: "🏭" },
  { id: "build_muscle", emoji: "💪" },
  { id: "lose_weight", emoji: "⚖️" },
  { id: "halal", emoji: "☪️" },
  { id: "vegetarian", emoji: "🥦" },
  { id: "vegan", emoji: "🌿" },
  { id: "high_fiber", emoji: "🌾" },
  { id: "high_protein", emoji: "🍗" },
  { id: "low_calorie", emoji: "🔥" },
  { id: "better_digestion", emoji: "🫧" }
];

export const GOAL_LABELS: Record<UserGoal, { fr: string; en: string; ar: string }> = {
  eat_healthier: { fr: "Manger plus sain", en: "Eat healthier", ar: "أكل أصح" },
  go_organic: { fr: "Consommer bio", en: "Go organic", ar: "منتجات عضوية" },
  reduce_sugar: { fr: "Réduire le sucre", en: "Reduce sugar", ar: "تقليل السكر" },
  reduce_salt: { fr: "Réduire le sel", en: "Reduce salt", ar: "تقليل الملح" },
  reduce_additives: { fr: "Réduire additifs", en: "Reduce additives", ar: "تقليل الإضافات" },
  avoid_ultraprocessed: { fr: "Éviter ultra-transformé", en: "Avoid ultra-processed", ar: "تجنب المعالج جداً" },
  build_muscle: { fr: "Prise de muscle", en: "Build muscle", ar: "بناء العضلات" },
  lose_weight: { fr: "Perte de poids", en: "Lose weight", ar: "إنقاص الوزن" },
  halal: { fr: "Alimentation halal", en: "Halal", ar: "حلال" },
  vegetarian: { fr: "Végétarien", en: "Vegetarian", ar: "نباتي" },
  vegan: { fr: "Vegan", en: "Vegan", ar: "نباتي صرف" },
  high_fiber: { fr: "Riche en fibres", en: "High fiber", ar: "غني بالألياف" },
  high_protein: { fr: "Riche en protéines", en: "High protein", ar: "غني بالبروتين" },
  low_calorie: { fr: "Faible calories", en: "Low calorie", ar: "سعرات منخفضة" },
  better_digestion: { fr: "Meilleure digestion", en: "Better digestion", ar: "هضم أفضل" }
};
