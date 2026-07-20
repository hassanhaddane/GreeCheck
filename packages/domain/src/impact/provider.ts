/**
 * Environmental provider adapter boundary.
 *
 * The engine consumes a provider-agnostic `EnvironmentalReading`; each
 * provider adapts its normalized product data into that shape. Open Food
 * Facts (Green-Score) is the primary and only ACTIVE provider today; adding
 * another (e.g. a national LCA database) means writing one adapter — the
 * engine, types and UI never change.
 *
 * Adapters are PURE: they read the normalized Product, they never fetch.
 */
import type { Product, ProductEnvironment } from "../product/model";
import type { ImpactProviderMeta } from "./types";

/** Provider-agnostic environmental reading (source values preserved). */
export type EnvironmentalReading = Omit<ProductEnvironment, "provider">;

export interface EnvironmentalProvider extends ImpactProviderMeta {
  /** Whether this provider may be used (mirrors sources.ts conventions). */
  active: boolean;
  justification?: string;
  read(product: Product): EnvironmentalReading | undefined;
}

/** Open Food Facts — Green-Score (formerly Eco-Score). Primary provider. */
export const offEnvironmentalProvider: EnvironmentalProvider = {
  id: "openfoodfacts",
  methodology: "green-score",
  active: true,
  read(product) {
    if (product.environment) {
      const { provider: _provider, ...reading } = product.environment;
      return reading;
    }
    // Legacy cached products may only carry the quick grade.
    if (product.greenScore) {
      return { sourceGrade: product.greenScore, normalizedGrade: product.greenScore };
    }
    return undefined;
  }
};

export const DEFAULT_ENVIRONMENTAL_PROVIDER = offEnvironmentalProvider;
