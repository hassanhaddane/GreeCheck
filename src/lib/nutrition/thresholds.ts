/**
 * Shared nutrition thresholds & numeric helpers.
 * Single source of truth for the UK FSA-style per-100g bands used by the
 * GreeScore engine, the basket analyzer and the smart filters.
 */

/** Per-100g thresholds (g, except kcal). */
export const NUTRITION_THRESHOLDS = {
  sugarLow: 5,
  sugarHigh: 22.5,
  saltLow: 0.3,
  saltHigh: 1.5,
  satFatLow: 1.5,
  satFatHigh: 5,
  fiberOk: 3,
  fiberHigh: 6,
  proteinOk: 8,
  proteinHigh: 12,
  kcalLow: 40,
  kcalMid: 120,
  kcalHigh: 250
} as const;

export const clamp = (n: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, n));
export const round = (n: number) => Math.round(n);

/** Nutri-Score / Green-Score letter → rank (a=0 … e=4, unknown=9). */
export const nutriRank = (g?: string) => (g ? "abcde".indexOf(g) : 9);
