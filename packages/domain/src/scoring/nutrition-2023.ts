import type { Grade, NutritionProfile2023, Product } from "../product/model";

const thresholds = {
  energy: Array.from({ length: 10 }, (_, i) => 335 * (i + 1)),
  saturatedFat: Array.from({ length: 10 }, (_, i) => i + 1),
  sugars: [3.4, 6.8, 10, 14, 17, 20, 24, 27, 31, 34, 37, 41, 44, 48, 51],
  salt: Array.from({ length: 20 }, (_, i) => (i + 1) / 5),
  fiber: [3, 4.1, 5.2, 6.3, 7.4],
  proteins: [2.4, 4.8, 7.2, 9.6, 12, 14, 17],
  fvl: [40, 60, 80]
};
const beverageEnergy = [30, 90, 150, 210, 240, 270, 300, 330, 360, 390];
const beverageSugars = [0.5, 2, 3.5, 5, 6, 7, 8, 9, 10, 11];
const beverageProteins = [1.2, 1.5, 1.8, 2.1, 2.4, 2.7, 3];
const fatRatio = [10, 16, 22, 28, 34, 40, 46, 52, 58, 64];
const fatEnergy = Array.from({ length: 10 }, (_, i) => 120 * (i + 1));

const stop = new Set(["alcoholic beverages", "beers", "wines", "spirits", "liqueurs", "ciders", "infant formulas", "baby foods", "baby milks", "food supplements", "dietary supplements", "protein powders", "pet food", "dog food", "cat food", "dried products to be rehydrated"]);
const waters = new Set(["waters", "mineral waters", "natural mineral waters", "spring waters", "sparkling waters", "carbonated waters"]);
const beverages = new Set(["beverages", "sodas", "soft drinks", "juices", "fruit juices", "nectars", "plant based drinks", "plant milks", "milk", "milks", "flavoured milks", "flavored milks", "drinkable yogurts", "energy drinks", "sports drinks", "smoothies", "flavoured waters", "flavored waters"]);
const fats = new Set(["fats", "animal fats", "vegetable fats", "oils", "vegetable oils", "olive oils", "extra virgin olive oils", "butters", "margarines", "nuts", "seeds", "nuts and seeds"]);
const general = new Set(["foods", "cereals and potatoes", "cereals and their products", "breakfast cereals", "cereals", "oats", "yogurts", "plain yogurts", "dairies", "fermented milk products", "sweet spreads", "spreads", "chocolates", "salts", "sugars", "cheeses", "meats", "red meats", "soups", "breads", "crackers", "fruits", "vegetables", "legumes"]);

export function nutritionTags(p: Product): string[] {
  return [...(p.categories ?? []), ...(p.categoryIds ?? [])].map(c => c.trim().toLowerCase().replace(/^[a-z]{2,3}:/, "").replaceAll("-", " "));
}

export function excluded(tags: readonly string[]): boolean {
  return tags.some(tag => stop.has(tag));
}

export function declaredProfile(tags: readonly string[]): NutritionProfile2023 | undefined {
  if (tags.some(tag => tag === "flavoured waters" || tag === "flavored waters")) return "beverage";
  if (tags.some(tag => waters.has(tag))) return "water";
  if (tags.some(tag => beverages.has(tag))) return "beverage";
  if (tags.some(tag => fats.has(tag))) return "fat";
  if (tags.some(tag => general.has(tag))) return "general";
}

export function officialGrade(points: number, profile: NutritionProfile2023): Grade {
  if (profile === "water") return "a";
  if (profile !== "beverage" && points <= (profile === "fat" ? -6 : 0)) return "a";
  if (points <= 2) return "b";
  if (points <= (profile === "beverage" ? 6 : 10)) return "c";
  if (points <= (profile === "beverage" ? 9 : 18)) return "d";
  return "e";
}

export function pointsInRange(points: number, profile: NutritionProfile2023): boolean {
  return Number.isInteger(points) && points >= (profile === "beverage" ? -18 : -17) && points <= (profile === "beverage" ? 54 : 55);
}

const above = (value: number, table: readonly number[]) => table.filter(limit => value > limit).length;

export interface Points2023 {
  points: number;
  negative: number;
  positive: number;
  factors: { code: string; points: number; kind: "bonus" | "malus" }[];
}

export function computePoints2023(
  p: Product,
  profile: Exclude<NutritionProfile2023, "water">,
  tags: readonly string[]
): { calculated: Points2023 } | { missing: string[] } {
  const n = p.nutriments;
  const drinks = profile === "beverage";
  const oils = profile === "fat";
  const needed: Record<string, number | boolean | undefined> = {
    sugars: n.sugars, saturatedFat: n.saturatedFat, salt: n.salt,
    fiber: n.fiber, fruitVegetableLegumePercent: p.fruitVegetableLegumePercent
  };
  if (!oils) needed.energyKj = p.nutritionEnergyKj;
  if (oils) needed.fat = n.fat;
  if (drinks) needed.nonNutritiveSweeteners = p.nonNutritiveSweeteners;
  const missing = Object.entries(needed).filter(([, v]) => v === undefined).map(([key]) => key);
  if (p.nutritionBasis !== (drinks ? "100ml" : "100g")) missing.push("nutritionBasis");
  if (missing.length) return { missing };

  const negatives = [
    { code: "gs3Energy", points: oils ? above(n.saturatedFat! * 37, fatEnergy) : above(p.nutritionEnergyKj!, drinks ? beverageEnergy : thresholds.energy) },
    { code: "gs3Sugars", points: above(n.sugars!, drinks ? beverageSugars : thresholds.sugars) },
    { code: "gs3Saturated", points: oils ? fatRatio.filter(limit => (n.fat! > 0 ? n.saturatedFat! * 100 / n.fat! : 0) >= limit).length : above(n.saturatedFat!, thresholds.saturatedFat) },
    { code: "gs3Salt", points: above(n.salt!, thresholds.salt) }
  ];
  if (drinks && p.nonNutritiveSweeteners) negatives.push({ code: "gs3Sweeteners", points: 4 });
  const negative = negatives.reduce((sum, factor) => sum + factor.points, 0);
  const cheese = tags.includes("cheeses");
  const proteinCounts = drinks || (!oils && cheese) || negative < (oils ? 7 : 11);
  if (proteinCounts && n.proteins === undefined) return { missing: ["proteins"] };
  const meat = tags.some(tag => ["red meats", "beef", "pork", "lamb", "veal", "mutton", "goat meats", "horse meats", "meats"].includes(tag));
  // A generic meat classification cannot determine the red meat protein cap.
  if (proteinCounts && !drinks && !oils && tags.includes("meats") && !tags.some(tag => ["red meats", "beef", "pork", "lamb", "veal", "mutton", "goat meats", "horse meats", "poultries", "chickens", "turkeys"].includes(tag))) {
    return { missing: ["nutritionCategory"] };
  }
  const positives = [
    { code: "gs3Fiber", points: above(n.fiber!, thresholds.fiber) },
    { code: "gs3Fvl", points: (drinks ? [0, 2, 4, 6] : [0, 1, 2, 5])[above(p.fruitVegetableLegumePercent!, thresholds.fvl)] }
  ];
  if (proteinCounts) positives.push({ code: "gs3Proteins", points: Math.min(meat && !drinks && !oils ? 2 : 7, above(n.proteins!, drinks ? beverageProteins : thresholds.proteins)) });
  const positive = positives.reduce((sum, factor) => sum + factor.points, 0);
  return {
    calculated: {
      points: negative - positive, negative, positive,
      factors: [
        ...negatives.map(factor => ({ ...factor, kind: "malus" as const })),
        ...positives.map(factor => ({ ...factor, kind: "bonus" as const }))
      ].filter(factor => factor.points > 0)
    }
  };
}
