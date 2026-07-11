export type Grade = "a" | "b" | "c" | "d" | "e";

export interface Nutriments {
  energyKcal?: number;
  sugars?: number;
  salt?: number;
  saturatedFat?: number;
  fat?: number;
  fiber?: number;
  proteins?: number;
}

export interface Product {
  barcode: string;
  name: string;
  brand?: string;
  imageUrl?: string;
  quantity?: string;
  categories?: string[];
  labels?: string[];
  countries?: string[];
  ingredientsText?: string;
  allergens?: string[];
  additives?: string[];
  traces?: string[];
  nutriments: Nutriments;
  nutriScore?: Grade;
  novaGroup?: 1 | 2 | 3 | 4;
  greenScore?: Grade;
  isBio?: boolean;
  isHalal?: boolean;
  isVegan?: boolean;
  isVegetarian?: boolean;
  source: "openfoodfacts" | "ciqual" | "usda";
}

export type ProductState =
  | "found"
  | "partial"
  | "incomplete"
  | "not_found"
  | "missing_nutrition"
  | "missing_ingredients";

export type Confidence = "high" | "medium" | "low";
