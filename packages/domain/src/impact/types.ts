/**
 * GreeImpact — environmental impact, strictly separate from the GreeScore
 * health engine (constitution §2: the two are never blended).
 *
 * Explanation contract: like every domain output, GreeImpact emits stable
 * CODES with parameters — never display strings. The UI layer translates
 * codes via messages/{fr,en,ar}.json.
 */
import type { Grade } from "../product/model";

export type ImpactStatus = "valid" | "unavailable";

/** Stable, translatable reason codes (deterministic explanation contract). */
export type ImpactReasonCode =
  | "impact_grade_source_green_score"
  | "impact_no_data";

export interface ImpactReason {
  code: ImpactReasonCode;
  params?: Record<string, string | number>;
}

export interface GreeImpact {
  status: ImpactStatus;
  /** Present only when status === "valid". */
  grade?: Grade;
  /** 0–100, derived deterministically from the grade. */
  score?: number;
  /** Stable label code: impact_label_{low|moderate|high|very_high|unavailable}. */
  labelCode: string;
  reasons: ImpactReason[];
}
