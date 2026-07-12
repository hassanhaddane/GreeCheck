import type { Page, Route } from "@playwright/test";
import type { Product } from "../../src/domains/product/model";

const availability = {
  name: true,
  image: true,
  ingredients: true,
  nutrition: true,
  nutriScore: true,
  nova: true,
  categories: true
};

const imageUrl = "https://images.openfoodfacts.org/images/products/301/762/042/2003/front_en.879.100.jpg";

export const poorProduct: Product = {
  barcode: "11111111",
  name: "Test Choco",
  brand: "GreeCheck QA",
  imageUrl,
  categories: ["sweet spreads"],
  ingredientsText: "Sugar, palm oil, hazelnuts, cocoa, emulsifier E322",
  allergens: ["nuts", "milk"],
  additives: ["e322"],
  nutriments: { energyKcal: 560, sugars: 58, salt: 0.12, saturatedFat: 11, fiber: 2, proteins: 6 },
  nutriScore: "e" as const,
  novaGroup: 4 as const,
  greenScore: "d" as const,
  isBio: false,
  halalStatus: "not_confirmed" as const,
  source: "openfoodfacts" as const,
  dataQuality: { availability, completeness: 100, confidence: "high" as const, confidenceReasons: [] }
};

export const goodProduct: Product = {
  barcode: "22222222",
  name: "Test Oats",
  brand: "GreeCheck QA",
  imageUrl,
  categories: ["sweet spreads"],
  ingredientsText: "Whole oats, water",
  allergens: ["gluten"],
  additives: [],
  nutriments: { energyKcal: 180, sugars: 2, salt: 0.03, saturatedFat: 0.4, fiber: 8, proteins: 10 },
  nutriScore: "a" as const,
  novaGroup: 1 as const,
  greenScore: "a" as const,
  isBio: true,
  halalStatus: "confirmed" as const,
  source: "openfoodfacts" as const,
  dataQuality: { availability, completeness: 100, confidence: "high" as const, confidenceReasons: [] }
};

export const thirdProduct: Product = {
  ...goodProduct,
  barcode: "33333333",
  name: "Test Almond Spread",
  nutriments: { ...goodProduct.nutriments, sugars: 5, proteins: 8 },
  nutriScore: "b" as const,
  novaGroup: 2 as const
};

export const incompleteProduct: Product = {
  ...goodProduct,
  barcode: "44444444",
  name: "Test Partial Product",
  ingredientsText: undefined,
  additives: undefined,
  dataQuality: {
    availability: { ...availability, ingredients: false },
    completeness: 86,
    confidence: "medium" as const,
    confidenceReasons: ["missing_ingredients"]
  }
};

export const unrelatedProduct: Product = {
  ...goodProduct,
  barcode: "55555555",
  name: "Test Tomato Soup",
  categories: ["soups"],
  nutriments: { energyKcal: 55, sugars: 3, salt: 0.7, saturatedFat: 0.2, fiber: 2, proteins: 1.5 }
};

export const products = new Map<string, Product>([
  [poorProduct.barcode, poorProduct],
  [goodProduct.barcode, goodProduct],
  [thirdProduct.barcode, thirdProduct],
  [incompleteProduct.barcode, incompleteProduct],
  [unrelatedProduct.barcode, unrelatedProduct]
]);

function productEnvelope(product: Product) {
  const incomplete = product.barcode === incompleteProduct.barcode;
  return {
    status: incomplete ? "usable_incomplete" : "complete",
    product,
    confidence: incomplete ? "medium" : "high",
    missing: incomplete ? ["ingredients"] : []
  };
}

export async function mockProductApis(page: Page) {
  await page.route("**/api/product/*", async (route: Route) => {
    const code = new URL(route.request().url()).pathname.split("/").pop() ?? "";
    const product = products.get(code);
    if (!product) {
      await route.fulfill({ status: 404, contentType: "application/json", body: JSON.stringify({ status: "not_found", barcode: code }) });
      return;
    }
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(productEnvelope(product)) });
  });

  await page.route("**/api/alternatives?*", async (route: Route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ products: [goodProduct] }) });
  });

  await page.route("**/api/search?*", async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ count: 4, page: 1, pageSize: 20, hasMore: false, products: [goodProduct, poorProduct, incompleteProduct, unrelatedProduct] })
    });
  });
}
