import type { AdditiveRiskLevel } from "./additive-registry";
import type { NutritionKind, PointsSource } from "./nutrition";

export type ScoreGrade = "A" | "B" | "C" | "D" | "E";

/** How much the score can be trusted, given data completeness (Trust Halo). */
export type ConfidenceLevel = "high" | "medium" | "low";

/** The decision verdict — resolved via the "score.verdict" i18n namespace. */
export type VerdictCode =
  | "excellent_choice"
  | "good_choice"
  | "limit"
  | "poor_fit_for_goal"
  | "ultra_processed"
  | "insufficient_data"
  | "excluded_category"
  | "unsupported_category";

export type ScoreValues = Record<string, string | number>;

export interface ScoreReason {
  kind: "bonus" | "malus" | "info";
  /** i18n code, resolved via the "score" namespace (reason.<code>). */
  code: string;
  /** Display weight used to rank top reasons. */
  impact: number;
  values?: ScoreValues;
}

export interface ProductWarning {
  /** critical = compatibility alert (never affects the health score). */
  level: "info" | "warning" | "critical";
  /** i18n code, resolved via the "score" namespace (warning.<code>). */
  code: string;
  values?: ScoreValues;
}

/** Sub-scores; a bucket is ABSENT (undefined) when its data is unknown. */
export interface SubScores {
  nutrition: number;
  processing?: number;
  additives?: number;
  naturality: number;
  environment?: number;
  goalFit?: number;
}

/* ─────────────── GS-2 methodology output contracts ─────────────── */

export type ScoreStatus = "scored" | "unscored";

/** Qualitative label bands (≥75 / ≥50 / ≥25), i18n via score.label.*. */
export type ScoreLabelCode = "excellent" | "good" | "poor" | "bad" | "unscored";

/** Typed cause of an unscored result (i18n via score.unscored.*). */
export type UnscoredReasonCode =
  | "missing_nutrition_data"
  | "missing_ingredients_data"
  | "excluded_alcohol"
  | "excluded_pure_sugar"
  | "excluded_infant_formula"
  | "excluded_protein_supplement"
  | "excluded_dietary_supplement"
  | "excluded_pet_food"
  | "excluded_unsupported_category"
  | "unsupported_special_category_salt"
  | "unsupported_special_category_chocolate";

export interface UnscoredReason {
  code: UnscoredReasonCode;
  values?: ScoreValues;
}

/** One additive's effect on the 30-point additive component. */
export interface AdditiveDeduction {
  /** Normalized E-number ("e250"). */
  code: string;
  risk: AdditiveRiskLevel | "unreviewed";
  /** Points removed from the 30-point component (0 for none/unreviewed). */
  deduction: number;
  /** True on the high-risk additive(s) that trigger the 49 cap. */
  triggersCap: boolean;
}

export interface NutritionComponent {
  /** Original Nutri-Score raw points actually used. */
  points: number;
  pointsSource: PointsSource;
  kind: NutritionKind;
  isWater: boolean;
  /** 0–100 via the published correspondence table. */
  score100: number;
  /** Contribution to the global score, out of 60. */
  contribution: number;
  /** Positive-side facts absent and counted as zero (never as a bonus). */
  conservativeZeros: string[];
}
export interface AdditivesComponent {
  /** Contribution out of 30 (floor 0). */
  contribution: number;
  deductions: AdditiveDeduction[];
}
export interface OrganicComponent {
  certified: boolean;
  /** Matched official certification label, when certified. */
  certification?: string;
  /** Contribution out of 10. */
  contribution: number;
}
export interface ScoreComponents {
  nutrition: NutritionComponent;
  additives: AdditivesComponent;
  organic: OrganicComponent;
}

export interface GreeScore {
  /** "unscored" ⇒ the numeric legacy fields below are NEUTRAL PLACEHOLDERS
   *  (50 / C / limit-style verdict) kept for pre-V2 consumers; the `unscored`
   *  field holds the truth and V2 UI must branch on `status`. */
  status: ScoreStatus;
  methodologyVersion: string;
  registryVersion: string;
  /** 0–100 decision score. */
  global: number;
  grade: ScoreGrade;
  verdict: VerdictCode;
  labelCode: ScoreLabelCode;
  /** Component contributions — present when status === "scored". */
  components?: ScoreComponents;
  /** Present when status === "unscored". */
  unscored?: UnscoredReason;
  /** True when a high-risk additive capped the global score at 49. */
  cappedByHighRiskAdditive: boolean;
  subScores: SubScores;
  /** Trust Halo level + the missing signals explaining it. */
  confidence: ConfidenceLevel;
  confidenceReasons: string[];
  /** Ranked, deduplicated explanations (max 3 each). */
  topPositives: ScoreReason[];
  topNegatives: ScoreReason[];
  /** Full transparency list (explore layer). */
  reasons: ScoreReason[];
  warnings: ProductWarning[];
  /** Critical compatibility alerts (subset of warnings). */
  alerts: ProductWarning[];
}

/** One plain-language explanation sentence (i18n code + params). */
export interface ScoreExplanation {
  code: string;
  values?: ScoreValues;
}
