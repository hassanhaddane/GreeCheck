/**
 * Stable Open Food Facts snapshots used by the server-rendered marketing demo.
 * These are real products (captured 2026-07-12); the real domain engines still
 * calculate every displayed score, Battle result and basket change.
 */
import type { Product } from "@/domains/product/model";

const base = { source: "openfoodfacts" as const };

export const DEMO_GENERIC: Product = {
  ...base,
  barcode: "3017620422003",
  name: "Nutella",
  brand: "Nutella",
  imageUrl: "https://images.openfoodfacts.org/images/products/301/762/042/2003/front_en.879.400.jpg",
  categories: ["breakfasts", "spreads", "sweet spreads", "cocoa and hazelnuts spreads"],
  labels: ["no gluten"],
  ingredientsText: "Sucre, huile de palme, noisettes 13 %, cacao maigre 7,4 %, lait écrémé en poudre 6,6 %, lactosérum en poudre, émulsifiants : lécithines (soja), vanilline.",
  allergens: ["milk", "nuts", "soybeans"],
  additives: ["e322", "e322i"],
  nutriments: { energyKcal: 539, sugars: 56.3, salt: 0.107, saturatedFat: 10.6, fat: 30.9, proteins: 6.3 },
  nutriScore: "e",
  novaGroup: 4,
  halalStatus: "not_confirmed",
  palmOilStatus: "present",
  isBio: false
};

export const DEMO_BETTER: Product = {
  ...base,
  barcode: "3770008009653",
  name: "La pâte à tartiner cacao noisette",
  brand: "Funkie",
  imageUrl: "https://images.openfoodfacts.org/images/products/377/000/800/9653/front_fr.124.400.jpg",
  categories: ["breakfasts", "spreads", "sweet spreads", "cocoa and hazelnuts spreads"],
  labels: ["organic", "vegan", "no additives", "no palm oil"],
  ingredientsText: "Purée de haricots rouges bio 30 %, sucre de betterave bio, noisettes torréfiées bio 18 %, eau, cacao bio 4,5 %, caramel, sel de Guérande.",
  allergens: ["nuts"],
  additives: [],
  nutriments: { energyKcal: 263, sugars: 30, salt: 0.22, saturatedFat: 1.4, fat: 14, fiber: 4.8, proteins: 4.8 },
  nutriScore: "d",
  novaGroup: 3,
  greenScore: "c",
  halalStatus: "not_confirmed",
  palmOilStatus: "absent_claimed",
  isBio: true,
  isVegan: true,
  isVegetarian: true
};

export const DEMO_MIDDLE: Product = {
  ...base,
  barcode: "8052575090254",
  name: "Nocciolata bio",
  brand: "Rigoni di Asiago",
  imageUrl: "https://images.openfoodfacts.org/images/products/805/257/509/0254/front_en.43.400.jpg",
  categories: ["breakfasts", "spreads", "sweet spreads", "cocoa and hazelnuts spreads"],
  labels: ["organic", "no palm oil"],
  ingredientsText: "Sucre bio, pâte de noisettes bio 18,5 %, huile de tournesol bio, lait écrémé en poudre bio, cacao maigre bio 6,5 %, beurre de cacao bio, lécithine de soja bio, extrait de vanille bio.",
  allergens: ["milk", "nuts", "soybeans"],
  additives: ["e322", "e322i"],
  nutriments: { energyKcal: 544, sugars: 51, salt: 0.12, saturatedFat: 5.7, fat: 32, fiber: 3.6, proteins: 8.1 },
  nutriScore: "e",
  novaGroup: 4,
  greenScore: "c",
  halalStatus: "not_confirmed",
  palmOilStatus: "absent_claimed",
  isBio: true
};

const DEMO_SKYR: Product = {
  ...base,
  barcode: "4056489491217",
  name: "Skyr",
  brand: "Milbona",
  imageUrl: "https://images.openfoodfacts.org/images/products/405/648/949/1217/front_en.3.400.jpg",
  categories: ["dairies", "yogurts", "skyrs", "plain skyrs"],
  ingredientsText: "Lait écrémé, ferments lactiques, enzyme coagulante d’origine microbienne selon approvisionnement.",
  allergens: ["milk"],
  additives: [],
  nutriments: { energyKcal: 62, sugars: 4, salt: 0.132, saturatedFat: 0.133, fat: 0.2, proteins: 11 },
  nutriScore: "a",
  novaGroup: 1,
  greenScore: "a",
  halalStatus: "not_confirmed",
  isBio: false
};

export const DEMO_CART_BEFORE: Product[] = [DEMO_GENERIC, DEMO_SKYR];
export const DEMO_CART_AFTER: Product[] = [DEMO_BETTER, DEMO_SKYR];
