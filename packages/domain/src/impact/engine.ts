/**
 * GreeImpact engine — deterministic, pure. Same input → same output.
 *
 * V2 baseline: the only trusted environmental signal is the Green-Score grade
 * normalized from Open Food Facts (Product.greenScore). Constitution rules:
 *  - rendered ONLY with valid data — absence yields "unavailable", never a
 *    default grade, never an estimate;
 *  - never blended into the health score (the scoring engine keeps its own
 *    environment bucket for the weighted mean; this engine is the SEPARATE
 *    user-facing impact assessment).
 */
import type { Product, Grade } from "../product/model";
import type { GreeImpact } from "./types";

/** Grade → 0–100, aligned with the scoring engine's GRADE_BASE mapping. */
const IMPACT_BASE: Record<Grade, number> = { a: 95, b: 80, c: 60, d: 35, e: 15 };

const LABEL: Record<Grade, string> = {
  a: "impact_label_low",
  b: "impact_label_moderate",
  c: "impact_label_moderate",
  d: "impact_label_high",
  e: "impact_label_very_high"
};

const VALID_GRADES: ReadonlySet<string> = new Set(["a", "b", "c", "d", "e"]);

export function computeGreeImpact(product: Pick<Product, "greenScore">): GreeImpact {
  const g = product.greenScore;
  if (!g || !VALID_GRADES.has(g)) {
    return {
      status: "unavailable",
      labelCode: "impact_label_unavailable",
      reasons: [{ code: "impact_no_data" }]
    };
  }
  return {
    status: "valid",
    grade: g,
    score: IMPACT_BASE[g],
    labelCode: LABEL[g],
    reasons: [{ code: "impact_grade_source_green_score", params: { grade: g } }]
  };
}
