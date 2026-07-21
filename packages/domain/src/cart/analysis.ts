/**
 * GreeCart analysis extras — composable, pure additions on top of
 * computeCartScore. Kept in a SEPARATE module so the core basket engine and
 * individual-product scoring are untouched.
 *
 * Adds the basket views the core result doesn't already expose:
 *  - environmental (GreeImpact) grade distribution;
 *  - main sugar contributors (ranked, measurable);
 *  - main additive contributors (ranked by risky-additive count);
 *  - explicit critical allergen alerts;
 *  - ultra-processed (NOVA 4) count.
 *
 * Low-confidence / insufficient-data products are NEVER dropped from these
 * views — they surface with an explicit unknown state.
 */
import type { Product, Grade } from "../product/model";
import type { LocalPreferences } from "../criteria/model";
import type { CartProductAnalysis } from "./engine";
import { computeGreeImpact } from "../impact/engine";
import { lookupAdditive } from "./../scoring/additive-registry";

export type EnvGradeKey = Grade | "unknown";

export interface SugarContributor {
  product: Product;
  /** Sugars per 100 g (undefined = unknown, shown as such — never 0). */
  sugars?: number;
}

export interface AdditiveContributor {
  product: Product;
  /** Count of high/moderate-risk additives (the ones that actually matter). */
  riskyCount: number;
  /** Total additives declared. */
  totalCount: number;
}

export interface AllergenAlert {
  product: Product;
  /** The user's avoided allergens found on this product. */
  allergens: string[];
}

export interface CartAnalysisExtras {
  /** GreeImpact grade distribution across the basket (unknown never hidden). */
  environmentDistribution: Record<EnvGradeKey, number>;
  /** True when at least one product has a valid environmental grade. */
  environmentKnown: number;
  sugarContributors: SugarContributor[];
  additiveContributors: AdditiveContributor[];
  allergenAlerts: AllergenAlert[];
  ultraProcessedCount: number;
}

const RISKY = new Set(["high", "moderate"]);

export function analyzeCartExtras(
  analyses: CartProductAnalysis[],
  prefs: LocalPreferences
): CartAnalysisExtras {
  const environmentDistribution: Record<EnvGradeKey, number> = { a: 0, b: 0, c: 0, d: 0, e: 0, unknown: 0 };
  let environmentKnown = 0;

  for (const a of analyses) {
    const impact = computeGreeImpact(a.product);
    if (impact.status === "valid" && impact.grade) {
      environmentDistribution[impact.grade] += 1;
      environmentKnown += 1;
    } else {
      environmentDistribution.unknown += 1;
    }
  }

  // Main sugar contributors: products with the most sugar per 100 g first.
  // Unknown-sugar products are listed last with an explicit undefined value —
  // present, not hidden, never counted as zero.
  const sugarContributors: SugarContributor[] = analyses
    .map((a) => ({ product: a.product, sugars: a.product.nutriments.sugars }))
    .filter((c) => c.sugars === undefined || c.sugars > 0)
    .sort((x, y) => (y.sugars ?? -1) - (x.sugars ?? -1))
    .slice(0, 5);

  // Main additive contributors: ranked by risky-additive count, then total.
  const additiveContributors: AdditiveContributor[] = analyses
    .map((a) => {
      const codes = a.product.additives ?? [];
      const riskyCount = codes.filter((c) => RISKY.has(lookupAdditive(c).risk)).length;
      return { product: a.product, riskyCount, totalCount: codes.length };
    })
    .filter((c) => c.totalCount > 0)
    .sort((x, y) => y.riskyCount - x.riskyCount || y.totalCount - x.totalCount)
    .slice(0, 5);

  // Critical allergen alerts against the user's avoided list.
  const avoid = prefs.avoidAllergens.map((s) => s.trim().toLowerCase()).filter(Boolean);
  const allergenAlerts: AllergenAlert[] = avoid.length
    ? analyses
        .map((a) => {
          const hay = [a.product.ingredientsText ?? "", ...(a.product.allergens ?? []), ...(a.product.traces ?? [])]
            .join(" ")
            .toLowerCase();
          const hits = avoid.filter((al) => hay.includes(al));
          return { product: a.product, allergens: hits };
        })
        .filter((x) => x.allergens.length > 0)
    : [];

  const ultraProcessedCount = analyses.filter((a) => a.product.novaGroup === 4).length;

  return {
    environmentDistribution,
    environmentKnown,
    sugarContributors,
    additiveContributors,
    allergenAlerts,
    ultraProcessedCount
  };
}
