/**
 * Rule-based aisle classifier (NO AI). Maps a product to a supermarket aisle
 * using keyword matching over its Open Food Facts categories + name.
 */
import type { Product } from "@/types/product";

export type Aisle =
  | "produce" | "dairy" | "bakery" | "beverages"
  | "meat_fish" | "frozen" | "sweet" | "pantry" | "other";

export const AISLE_ORDER: Aisle[] = ["produce", "dairy", "meat_fish", "bakery", "sweet", "pantry", "beverages", "frozen", "other"];

export const AISLE_EMOJI: Record<Aisle, string> = {
  produce: "🥬", dairy: "🧀", bakery: "🥖", beverages: "🥤",
  meat_fish: "🍖", frozen: "❄️", sweet: "🍫", pantry: "🥫", other: "🛒"
};

// Ordered rules — first match wins.
const RULES: { aisle: Aisle; kw: string[] }[] = [
  { aisle: "frozen", kw: ["frozen", "surgel", "glace", "ice cream", "crème glacée"] },
  { aisle: "produce", kw: ["fruit", "vegetable", "légume", "legume", "salad", "salade", "fresh produce", "herbs"] },
  { aisle: "dairy", kw: ["milk", "lait", "yogurt", "yaourt", "yoghurt", "cheese", "fromage", "dairy", "produit laitier", "cream", "crème", "butter", "beurre"] },
  { aisle: "meat_fish", kw: ["meat", "viande", "fish", "poisson", "chicken", "poulet", "beef", "boeuf", "pork", "porc", "seafood", "charcuterie", "ham", "jambon", "sausage", "saucisse"] },
  { aisle: "bakery", kw: ["bread", "pain", "bakery", "boulanger", "viennoiser", "biscuit", "cookie", "cake", "gâteau", "gateau", "cereal", "céréale", "pastry"] },
  { aisle: "beverages", kw: ["beverage", "drink", "boisson", "water", "eau", "juice", "jus", "soda", "cola", "coffee", "café", "tea", "thé", "wine", "beer"] },
  { aisle: "sweet", kw: ["chocolate", "chocolat", "candy", "bonbon", "sweet", "confiser", "dessert", "spread", "pâte à tartiner", "snack", "chips", "sugar", "honey", "miel", "jam", "confiture"] },
  { aisle: "pantry", kw: ["pasta", "pâtes", "pates", "rice", "riz", "sauce", "oil", "huile", "canned", "conserve", "flour", "farine", "condiment", "spice", "épice", "soup", "soupe", "legumes secs", "grocery"] }
];

export function classifyAisle(p: Product): Aisle {
  const hay = `${(p.categories ?? []).join(" ")} ${p.name}`.toLowerCase();
  for (const rule of RULES) {
    if (rule.kw.some((k) => hay.includes(k))) return rule.aisle;
  }
  return "other";
}
