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
  | "insufficient_data";

export type ScoreValues = Record<string, string | number>;

export interface ScoreReason {
  kind: "bonus" | "malus" | "info";
  /** i18n code, resolved via the "score" namespace (reason.<code>). */
  code: string;
  /**
   * Display weight used to rank top reasons. For Nutri-Score-based nutrition
   * it ATTRIBUTES (explains) the base score rather than adding extra points —
   * the numeric contribution is documented per bucket in gree-score.ts.
   */
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

export interface GreeScore {
  /** 0–100 decision score. */
  global: number;
  grade: ScoreGrade;
  verdict: VerdictCode;
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
