import type { NutritionProfile2023 } from "../product/model";

export const METHODOLOGY_VERSION = "GS-3.0.0";
export const METHODOLOGY_UPDATED_AT = "2026-11-05";
export const NUTRI_SCORE_REFERENCE = "https://www.santepubliquefrance.fr/content/download/150258/file/Nutriscore_reglement_usage_EN_20240626.pdf";

export const WEIGHTS = { nutrition: 100, additives: 0, organic: 0, nova: 0 } as const;

/** Editorial interpolation anchors in raw Nutri-Score 2023 points. */
export const NUTRITION_ANCHORS: Record<Exclude<NutritionProfile2023, "water">, readonly [number, number]> = {
  general: [-5, 30],
  fat: [-10, 30],
  beverage: [-6, 20]
};

export const GRADE_BANDS = [
  { min: 80, grade: "A" },
  { min: 65, grade: "B" },
  { min: 45, grade: "C" },
  { min: 25, grade: "D" },
  { min: 0, grade: "E" }
] as const;
