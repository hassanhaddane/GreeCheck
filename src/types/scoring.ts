export type ScoreGrade = "A" | "B" | "C" | "D" | "E";
export type ScoreLabel = "Excellent" | "Bon choix" | "Moyen" | "À limiter" | "À éviter";

/** How much we trust the score given data completeness. */
export type ConfidenceLevel = "high" | "medium" | "low";

export type ScoreValues = Record<string, string | number>;

export interface ScoreReason {
  kind: "bonus" | "malus" | "info";
  /** i18n code, resolved via the "score" namespace (reason.<code>). */
  code: string;
  values?: ScoreValues;
}

export interface ProductWarning {
  level: "info" | "warning" | "critical";
  /** i18n code, resolved via the "score" namespace (warning.<code>). */
  code: string;
  values?: ScoreValues;
}

export interface GreeScore {
  global: number;
  grade: ScoreGrade;
  label: ScoreLabel;
  healthScore: number;
  naturalityScore: number;
  processingScore: number;
  additivesScore: number;
  goalScore: number;
  ecologyScore?: number;
  reasons: ScoreReason[];
  warnings: ProductWarning[];
  confidenceLevel: ConfidenceLevel;
}
