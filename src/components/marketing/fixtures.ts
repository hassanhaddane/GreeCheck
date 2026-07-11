/**
 * Marketing demo fixtures — clearly-labeled ILLUSTRATIVE generic products
 * (no real brand is named, no real product data is invented). Their scores
 * are computed at render time by the REAL GreeScore / Battle / Cart engines,
 * so the site demonstrates the actual product behavior.
 */
import type { Product } from "@/domains/product/model";

const base = { source: "openfoodfacts" as const };

/** A typical ultra-processed sweet spread (illustrative). */
export const DEMO_GENERIC: Product = {
  ...base,
  barcode: "demo-classic-spread",
  name: "",
  categories: ["sweet spreads"],
  ingredientsText: "sucre, huile de palme, noisettes 13%, cacao, émulsifiant: lécithine",
  additives: ["e322", "e471"],
  nutriments: { energyKcal: 539, sugars: 56, salt: 0.11, saturatedFat: 10.6, fat: 31, fiber: 0, proteins: 6 },
  nutriScore: "e",
  novaGroup: 4,
  isBio: false
};

/** A better same-category option (illustrative). */
export const DEMO_BETTER: Product = {
  ...base,
  barcode: "demo-organic-spread",
  name: "",
  categories: ["sweet spreads"],
  ingredientsText: "noisettes 45%, sucre de canne, cacao, poudre de lait",
  additives: [],
  nutriments: { energyKcal: 520, sugars: 22, salt: 0.05, saturatedFat: 6, fat: 36, fiber: 6.5, proteins: 11 },
  nutriScore: "c",
  novaGroup: 3,
  isBio: true,
  labels: ["organic"]
};

/** Third contender for the Battle demo (illustrative). */
export const DEMO_MIDDLE: Product = {
  ...base,
  barcode: "demo-light-spread",
  name: "",
  categories: ["sweet spreads"],
  ingredientsText: "noisettes 25%, sucre, huile de tournesol, cacao",
  additives: ["e322"],
  nutriments: { energyKcal: 500, sugars: 38, salt: 0.08, saturatedFat: 7, fat: 30, fiber: 3.5, proteins: 8 },
  nutriScore: "d",
  novaGroup: 4,
  isBio: false
};

/** Small illustrative cart: two decent products + two weak ones. */
export const DEMO_CART_BEFORE: Product[] = [
  DEMO_GENERIC,
  DEMO_MIDDLE,
  {
    ...base,
    barcode: "demo-muesli",
    name: "",
    categories: ["cereals"],
    ingredientsText: "flocons d'avoine complète, raisins secs, noisettes",
    additives: [],
    nutriments: { energyKcal: 370, sugars: 12, salt: 0.02, saturatedFat: 1.1, fat: 6, fiber: 9, proteins: 11 },
    nutriScore: "a",
    novaGroup: 1,
    isBio: true,
    labels: ["organic"]
  },
  {
    ...base,
    barcode: "demo-soda",
    name: "",
    categories: ["sodas"],
    ingredientsText: "eau gazéifiée, sucre, arômes, colorant e150d, acidifiant e338",
    additives: ["e150d", "e338"],
    nutriments: { energyKcal: 42, sugars: 10.6, salt: 0, saturatedFat: 0, fat: 0, fiber: 0, proteins: 0 },
    nutriScore: "e",
    novaGroup: 4,
    isBio: false
  }
];

/** Same cart after two GreeSwap replacements (spread → organic, soda → sparkling tea). */
export const DEMO_CART_AFTER: Product[] = [
  DEMO_BETTER,
  DEMO_MIDDLE,
  DEMO_CART_BEFORE[2],
  {
    ...base,
    barcode: "demo-infused-water",
    name: "",
    categories: ["sodas"],
    ingredientsText: "eau gazéifiée, jus de citron 3%, extrait de thé",
    additives: [],
    nutriments: { energyKcal: 8, sugars: 1.8, salt: 0, saturatedFat: 0, fat: 0, fiber: 0, proteins: 0 },
    nutriScore: "b",
    novaGroup: 2,
    isBio: true,
    labels: ["organic"]
  }
];
