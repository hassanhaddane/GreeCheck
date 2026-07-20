/**
 * Smart filter types — pure predicates over a normalized product and its
 * GreeScore (which already reflects the user's LOCAL preferences).
 */
import type { LucideIcon } from "lucide-react";
import type { Product } from "@greecheck/domain/product/model";
import type { GreeScore } from "@greecheck/domain/scoring/types";

export type FilterGroup = "diet" | "nutrition" | "smart";
export type FilterLocale = "fr" | "en" | "ar";

export interface SmartFilter {
  id: string;
  group: FilterGroup;
  label: Record<FilterLocale, string>;
  /** One-line explanation of what the filter selects. */
  description: Record<FilterLocale, string>;
  icon: LucideIcon;
  /** True when the product passes this filter. Missing data → excluded (false). */
  match: (p: Product, gree: GreeScore) => boolean;
}
