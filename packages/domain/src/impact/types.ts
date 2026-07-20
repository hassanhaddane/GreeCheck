/**
 * GreeImpact GI-1 — environmental impact domain, strictly separate from the
 * GreeScore health engine (constitution §2: never blended).
 *
 * Contracts:
 *  - every user-facing string is a stable CODE + params (i18n by the UI);
 *  - SOURCE values are preserved verbatim next to normalized ones;
 *  - the lifecycle contribution is CATEGORY-level and flagged as such —
 *    never a product-specific measurement;
 *  - missing data yields explicit reasons, never a default grade.
 */
import type { Grade } from "../product/model";

export const GREE_IMPACT_VERSION = "GI-1.0.0";

export type ImpactStatus = "valid" | "insufficient";
export type ImpactConfidence = "high" | "medium" | "low";
export type IndicatorTone = "positive" | "negative" | "neutral" | "unknown";
export type IndicatorKind = "lifecycle" | "origins" | "packaging" | "labels" | "species";

export type ImpactValues = Record<string, string | number>;

/** One environmental signal, with its source value preserved when provided. */
export interface ImpactIndicator {
  kind: IndicatorKind;
  tone: IndicatorTone;
  /** i18n code (impact.indicator.*). */
  code: string;
  params?: ImpactValues;
  /** Verbatim source value backing this indicator, when one exists. */
  sourceValue?: number | string;
}

/** Explicit missing-data reason (i18n via impact.missing.*). */
export interface ImpactMissingReason {
  code:
    | "impact_missing_all"
    | "impact_missing_score"
    | "impact_missing_grade"
    | "impact_missing_adjustments"
    | "impact_status_unknown"
    | "impact_source_missing_signal";
  params?: ImpactValues;
}

/** Actionable insight — built ONLY from known signals, never from absence. */
export interface ImpactInsightItem {
  code: string;
  params?: ImpactValues;
}
export interface ImpactInsight {
  /** Best-known environmental strength. */
  strength?: ImpactInsightItem;
  /** Clearest known weakness. */
  weakness?: ImpactInsightItem;
  /** Which better alternative would improve the VERIFIED impact. */
  advice?: ImpactInsightItem;
}

export interface ImpactProviderMeta {
  id: string;
  /** Provider methodology name (e.g. "green-score"). */
  methodology: string;
}

export interface GreeImpact {
  status: ImpactStatus;
  /** GreeImpact methodology version (this module). */
  methodologyVersion: string;
  provider: ImpactProviderMeta;

  /** Normalized values (present when status === "valid"). */
  score?: number;
  grade?: Grade;
  /** Source values preserved verbatim. */
  sourceScore?: number;
  sourceGrade?: string;

  confidence: ImpactConfidence;
  /** Category-level lifecycle contribution — categoryLevel is always true. */
  lifecycle?: { categoryScore: number; categoryLevel: true };
  indicators: ImpactIndicator[];
  /** Environmental/production labels backing the assessment (cleaned tags). */
  environmentalLabels: string[];
  /** Explicit missing-data reasons (why confidence is not higher / status insufficient). */
  missing: ImpactMissingReason[];
  /** impact_label_{low|moderate|high|very_high|insufficient}. */
  labelCode: string;
  insight: ImpactInsight;
}
