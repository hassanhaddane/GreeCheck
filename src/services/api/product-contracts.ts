import { assessProduct } from "@greecheck/domain/product/normalizer";
import type { AssessmentStatus, Confidence, Product } from "@greecheck/domain/product/model";

export type ProductResult =
  | { status: AssessmentStatus; product: Product; confidence: Confidence; missing: string[] }
  | { status: "not_found"; barcode: string };

export interface SearchResult {
  count: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
  products: Product[];
}
export type DataLocale = "fr" | "en" | "ar";

export function asProductResult(product: Product): ProductResult {
  const { status, confidence, missing } = assessProduct(product);
  return { status, product, confidence, missing };
}
