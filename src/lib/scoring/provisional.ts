import type { Product } from "@/types/product";

/**
 * Temporary provisional score until the full GreeScore algorithm is implemented.
 * Derives a 0–100 value from Nutri-Score, NOVA and a few nutriment signals.
 */
const GRADE_BASE: Record<string, number> = { a: 90, b: 74, c: 56, d: 36, e: 16 };

export function provisionalScore(p: Product): number {
  let score = p.nutriScore ? GRADE_BASE[p.nutriScore] : 50;

  if (p.novaGroup === 1) score += 6;
  else if (p.novaGroup === 4) score -= 12;
  else if (p.novaGroup === 3) score -= 4;

  if (p.additives && p.additives.length > 5) score -= 6;
  if (p.isBio) score += 4;

  const sugar = p.nutriments.sugars;
  if (sugar !== undefined && sugar > 22) score -= 5;

  return Math.max(0, Math.min(100, Math.round(score)));
}

/** Radar axis values (0–100) in the order the NutritionRadar expects. */
export function radarValues(p: Product): number[] {
  const n = p.nutriments;
  const lvl = (v: number | undefined, max: number) => Math.min(100, Math.round(((v ?? 0) / max) * 100));
  return [
    lvl(n.sugars, 40),
    lvl(n.salt, 3),
    lvl(n.saturatedFat, 20),
    lvl(n.proteins, 30),
    lvl(n.fiber, 12),
    lvl(p.additives?.length, 10),
    p.novaGroup ? (p.novaGroup / 4) * 100 : 40
  ];
}
