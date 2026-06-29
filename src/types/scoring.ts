export type ScoreGrade = "A" | "B" | "C" | "D" | "E";
export type ScoreLabel = "Excellent" | "Bon choix" | "Moyen" | "À limiter" | "À éviter";

export interface ScoreReason {
  kind: "bonus" | "malus" | "info";
  label: string;
}

export interface ProductWarning {
  level: "info" | "warning" | "critical";
  label: string;
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
}
