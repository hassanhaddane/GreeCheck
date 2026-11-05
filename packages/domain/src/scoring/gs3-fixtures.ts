import type { Product } from "../product/model";

const reference = (name: string, facts: Partial<Product>): Product => ({
  barcode: "fixture-" + name, source: "openfoodfacts", name, nutritionBasis: "100g",
  ingredientsText: "Fixture déclarative", additives: [], fruitVegetableLegumePercent: 0,
  nutriments: { energyKcal: 0, sugars: 0, saturatedFat: 0, salt: 0, fiber: 0, proteins: 0 },
  ...facts
});

export const water = reference("Eau nature", {
  categories: ["natural mineral waters"], nutritionBasis: "100ml", ingredientsText: "Eau minérale naturelle",
  nutritionEnergyKj: 0, novaGroup: 1
});

export const soda = reference("Soda sucré", {
  categories: ["beverages", "sodas"], nutritionBasis: "100ml", nutritionEnergyKj: 180, nonNutritiveSweeteners: false,
  ingredientsText: "Eau, sucre, arômes", novaGroup: 4,
  nutriments: { energyKcal: 43, sugars: 10.6, saturatedFat: 0, salt: 0, fiber: 0, proteins: 0 }
});

export const cereals = reference("Céréales complètes", {
  categories: ["breakfast cereals"], nutritionEnergyKj: 1500, ingredientsText: "Avoine complète, sucre, sel", novaGroup: 3,
  nutriments: { energyKcal: 358, sugars: 8, saturatedFat: 1, salt: 0.3, fiber: 8, proteins: 11 }
});

export const yogurt = reference("Yaourt nature", {
  categories: ["yogurts"], nutritionEnergyKj: 250, ingredientsText: "Lait de vache, ferments", allergens: ["en:milk"], novaGroup: 1,
  nutriments: { energyKcal: 60, sugars: 4.5, saturatedFat: 1.5, salt: 0.1, fiber: 0, proteins: 4 }
});

export const oil = reference("Huile d’olive", {
  categories: ["olive oils"], ingredientsText: "Huile d’olive", fruitVegetableLegumePercent: 100,
  nutritionEnergyKj: 3700, novaGroup: 2,
  nutriments: { energyKcal: 884, fat: 100, sugars: 0, saturatedFat: 14, salt: 0, fiber: 0, proteins: 0 }
});

export const organic = { ...cereals, name: "Céréales bio", labels: ["eu organic"], isBio: true };
export const sweetened = { ...soda, name: "Soda avec édulcorant", ingredientsText: "Eau, sucre, aspartame", additives: ["en:e951"], nonNutritiveSweeteners: true };
export const incomplete = { ...cereals, name: "Céréales, composition incomplète", fruitVegetableLegumePercent: undefined };
export const conflicting = { ...yogurt, name: "Yaourt, points contradictoires", nutriScore2023: { points: 2, grade: "b" as const } };
export const fixtures = [water, soda, cereals, yogurt, oil, organic, sweetened, incomplete, conflicting] as const;
