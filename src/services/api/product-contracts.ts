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
