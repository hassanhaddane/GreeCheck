import type { ScoreGrade, ScoreLabel } from "@/types/scoring";

export const SCORE_BANDS: {
  min: number;
  grade: ScoreGrade;
  label: ScoreLabel;
  colorVar: string;
}[] = [
  { min: 80, grade: "A", label: "Excellent", colorVar: "--gc-score-a" },
  { min: 65, grade: "B", label: "Bon choix", colorVar: "--gc-score-b" },
  { min: 45, grade: "C", label: "Moyen", colorVar: "--gc-score-c" },
  { min: 25, grade: "D", label: "À limiter", colorVar: "--gc-score-d" },
  { min: 0, grade: "E", label: "À éviter", colorVar: "--gc-score-e" }
];

export function bandForScore(value: number) {
  return SCORE_BANDS.find((b) => value >= b.min) ?? SCORE_BANDS[SCORE_BANDS.length - 1];
}
