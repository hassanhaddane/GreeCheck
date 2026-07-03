/**
 * Smart filter types — pure predicates over a normalized product and its
 * GreeScore (which already reflects the user's LOCAL preferences).
 */
import type { Product } from "@/types/product";
import type { GreeScore } from "@/types/scoring";

export type FilterGroup = "diet" | "nutrition" | "smart";
export type FilterLocale = "fr" | "en" | "ar";

export interface SmartFilter {
  id: string;
  group: FilterGroup;
  label: Record<FilterLocale, string>;
  /** True when the product passes this filter. Missing data → excluded (false). */
  match: (p: Product, gree: GreeScore) => boolean;
}
