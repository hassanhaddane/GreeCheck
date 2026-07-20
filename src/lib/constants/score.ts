import type { ScoreGrade } from "@greecheck/domain/scoring/types";

/** Grade bands — labels are resolved via i18n ("score.grade.<grade>"). */
export const SCORE_BANDS: { min: number; grade: ScoreGrade; colorVar: string }[] = [
  { min: 80, grade: "A", colorVar: "--gc-score-a" },
  { min: 65, grade: "B", colorVar: "--gc-score-b" },
  { min: 45, grade: "C", colorVar: "--gc-score-c" },
  { min: 25, grade: "D", colorVar: "--gc-score-d" },
  { min: 0, grade: "E", colorVar: "--gc-score-e" }
];

export function bandForScore(value: number) {
  return SCORE_BANDS.find((b) => value >= b.min) ?? SCORE_BANDS[SCORE_BANDS.length - 1];
}
