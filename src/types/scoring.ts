export type ScoreGrade = "A" | "B" | "C" | "D" | "E";
export type ScoreLabel = "Excellent" | "Bon choix" | "Moyen" | "À limiter" | "À éviter";

/** How much we trust the score given data completeness. */
export type ConfidenceLevel = "high" | "medium" | "low";

export interface ScoreReason {
  kind: "bonus" | "malus" | "info";
  /** Human-readable, transparent explanation (e.g. "Riche en fibres"). */
  label: string;
  /** Optional signed contribution hint for UI, in score points. */
  impact?: number;
}

export interface ProductWarning {
  level: "info" | "warning" | "critical";
  label: string;
}

export interface GreeScore {
  /** Final 0-100 GreeScore. */
  global: number;
  grade: ScoreGrade;
  label: ScoreLabel;
  /** Sub-scores, each 0-100, for transparent display. */
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
