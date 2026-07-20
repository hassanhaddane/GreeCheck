/**
 * Nutrition component (60 % of GreeScore GS-2).
 *
 * 1. Obtain the ORIGINAL (2017) Nutri-Score raw points:
 *    - provider points when available (Open Food Facts `nutriscore_score`);
 *    - otherwise computed here from the nutrition facts (classic algorithm);
 *    - otherwise, when only the official A–E letter exists, a documented
 *      per-grade fallback point (never used when raw points are available).
 * 2. Convert points → 0–100 via the PUBLISHED smoothed correspondence table
 *    (Yuka help, "How is the Nutri-Score used to obtain the Yuka rating?",
 *    retrieved 2026-07-20; article last updated 2026-06). Solid foods and
 *    beverages use their own columns; only water reaches 100 among beverages.
 *
 * Missing required facts ⇒ typed failure (the engine returns an UNSCORED
 * result — a product is never scored on invented values).
 */
import type { Nutriments, Grade } from "../product/model";

export type NutritionKind = "solid" | "beverage";
export type PointsSource = "provider" | "computed" | "grade_fallback";

export interface NutritionSuccess {
  ok: true;
  points: number;
  source: PointsSource;
  kind: NutritionKind;
  isWater: boolean;
  /** 0–100 from the published correspondence table. */
  score100: number;
  /** Facts absent from the POSITIVE side, counted as zero (never positive). */
  conservativeZeros: string[];
}
export interface NutritionFailure {
  ok: false;
  missing: string[];
}
export type NutritionResult = NutritionSuccess | NutritionFailure;

/* ── published correspondence table (verbatim) ─────────────────────────── */
/* points ≤ -4 use the "min" row; ≥ upper bound use the terminal row.       */

const SOLID_TABLE: ReadonlyArray<[number, number]> = [
  [-4, 100], [-3, 100], [-2, 100], [-1, 90], [0, 80], [1, 75], [2, 70],
  [3, 65], [4, 60], [5, 55], [6, 50], [7, 45], [8, 40], [9, 35], [10, 30],
  [11, 15], [12, 13], [13, 11], [14, 9], [15, 7], [16, 5], [17, 3], [18, 1],
  [19, 0]
];
const LIQUID_TABLE: ReadonlyArray<[number, number]> = [
  [-4, 80], [-3, 77], [-2, 74], [-1, 71], [0, 68], [1, 65], [2, 57],
  [3, 49], [4, 41], [5, 33], [6, 15], [7, 11], [8, 7], [9, 3], [10, 0]
];

export function nutritionScore100(points: number, kind: NutritionKind, isWater: boolean): number {
  if (kind === "beverage" && isWater) return 100; // only water reaches 100 (grade A liquid)
  const table = kind === "beverage" ? LIQUID_TABLE : SOLID_TABLE;
  const p = Math.round(points);
  if (p <= table[0][0]) return table[0][1];
  const last = table[table.length - 1];
  if (p >= last[0]) return last[1];
  const row = table.find(([pt]) => pt === p);
  /* tables are contiguous integers — row always found */
  return row ? row[1] : last[1];
}

/**
 * Grade-only fallback (used ONLY when raw points are unavailable).
 * Representative point per grade band of the ORIGINAL algorithm, then the
 * published table. Documented in docs/methodology/gree-score-v2.md §3.4.
 */
const GRADE_FALLBACK_POINTS: Record<NutritionKind, Record<Grade, number>> = {
  solid: { a: -2, b: 1, c: 7, d: 15, e: 20 },
  beverage: { a: -4 /* water handled separately */, b: 0, c: 4, d: 8, e: 12 }
};
export function gradeFallbackPoints(grade: Grade, kind: NutritionKind): number {
  return GRADE_FALLBACK_POINTS[kind][grade];
}

/* ── classic (2017) Nutri-Score points from nutrition facts ────────────── */

const step = (v: number, thresholds: readonly number[]): number =>
  thresholds.reduce((pts, t) => (v > t ? pts + 1 : pts), 0);

/* per 100 g / 100 ml — original algorithm thresholds */
const SOLID = {
  energyKj: [335, 670, 1005, 1340, 1675, 2010, 2345, 2680, 3015, 3350],
  sugars: [4.5, 9, 13.5, 18, 22.5, 27, 31, 36, 40, 45],
  satFat: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
  sodiumMg: [90, 180, 270, 360, 450, 540, 630, 720, 810, 900],
  fiber: [0.9, 1.9, 2.8, 3.7, 4.7],
  protein: [1.6, 3.2, 4.8, 6.4, 8.0]
} as const;
const BEVERAGE = {
  energyKj: [0, 30, 60, 90, 120, 150, 180, 210, 240, 270],
  sugars: [0, 1.5, 3, 4.5, 6, 7.5, 9, 10.5, 12, 13.5],
  satFat: SOLID.satFat,
  sodiumMg: SOLID.sodiumMg,
  fiber: SOLID.fiber,
  protein: SOLID.protein
} as const;

export interface ComputedPoints {
  points: number;
  conservativeZeros: string[];
}

/**
 * Compute original Nutri-Score points. Requires energy, sugars, saturated fat
 * and salt. Fiber/protein absent on the POSITIVE side count as 0 (an unknown
 * is never a bonus); fruits/vegetables % is not in the data model and counts
 * as 0 for the same reason — both are reported in `conservativeZeros` and
 * lower the data confidence, never the honesty of the score.
 */
export function computeNutriScorePoints(
  n: Nutriments,
  kind: NutritionKind
): { ok: true; value: ComputedPoints } | { ok: false; missing: string[] } {
  const missing: string[] = [];
  if (n.energyKcal === undefined) missing.push("energy");
  if (n.sugars === undefined) missing.push("sugars");
  if (n.saturatedFat === undefined) missing.push("saturatedFat");
  if (n.salt === undefined) missing.push("salt");
  if (missing.length) return { ok: false, missing };

  const t = kind === "beverage" ? BEVERAGE : SOLID;
  const energyKj = n.energyKcal! * 4.184;
  const sodiumMg = (n.salt! * 1000) / 2.5;

  const negative =
    step(energyKj, t.energyKj) +
    step(n.sugars!, t.sugars) +
    step(n.saturatedFat!, t.satFat) +
    step(sodiumMg, t.sodiumMg);

  const conservativeZeros: string[] = ["fruitsVegetables"]; // not modeled — never a free bonus
  const fiberPts = n.fiber !== undefined ? step(n.fiber, t.fiber) : (conservativeZeros.push("fiber"), 0);
  const proteinPtsRaw = n.proteins !== undefined ? step(n.proteins, t.protein) : (conservativeZeros.push("proteins"), 0);
  /* Original rule: if negative ≥ 11 and fruit points < 5, proteins are not
     counted (cheese exception requires category data we treat conservatively:
     fruit points are always 0 here, so the rule applies whenever N ≥ 11). */
  const proteinPts = negative >= 11 ? 0 : proteinPtsRaw;

  return { ok: true, value: { points: negative - (fiberPts + proteinPts), conservativeZeros } };
}
