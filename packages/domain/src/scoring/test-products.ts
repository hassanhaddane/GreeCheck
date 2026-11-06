import type { Product } from "../product/model";

/** Synthetic provider responses for tests of score consumers. */
export function with2023Points(product: Product): Product {
  if (!product.nutriScore) return product;
  const beverage = product.categories?.includes("beverages") ?? false;
  const grade = product.nutriScore;
  const points = { a: -4, b: 2, c: 5, d: beverage ? 8 : 14, e: 26 }[grade];
  return {
    ...product,
    ...(beverage && { nonNutritiveSweeteners: false }),
    nutritionBasis: beverage ? "100ml" : "100g",
    nutriScore2023: { points, grade: beverage && grade === "a" ? "b" : grade, profile: beverage ? "beverage" : "general" }
  };
}
