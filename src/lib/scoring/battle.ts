/**
 * Scan Battle winner algorithm — deterministic and preference-aware.
 *
 * Primary signal is the GreeScore global (which already factors in the user's
 * LOCAL preferences via goalScore, additives, labels, halal, etc.). Ties are
 * broken by a transparent cascade that *also* respects active preferences
 * (sugar matters more with reduceSugar, protein with increaseProtein, NOVA with
 * reduceUltraProcessed/reduceAdditives). Pure: no side effects, no I/O.
 */
import type { Product } from "@/types/product";
import type { LocalPreferences } from "@/types/user-preferences";
import type { GreeScore } from "@/types/scoring";
import { computeGreeScore } from "./gree-score";
import { nutriRank } from "@/lib/nutrition/thresholds";

export interface BattleEntry {
  product: Product;
  gree: GreeScore;
}

export interface BattleResult {
  ranking: BattleEntry[]; // best → worst
  winner: BattleEntry | null;
  runnerUp: BattleEntry | null;
  closeness: "clear" | "close";
  confidence: "high" | "partial";
  /** Reason keys explaining winner vs runner-up (rendered via i18n). */
  reasons: string[];
}

const nova = (n?: number) => n ?? 9;

export function computeBattle(products: Product[], prefs: LocalPreferences): BattleResult {
  const entries: BattleEntry[] = products.map((p) => ({ product: p, gree: computeGreeScore(p, prefs) }));

  const cmp = (a: BattleEntry, b: BattleEntry): number => {
    if (b.gree.global !== a.gree.global) return b.gree.global - a.gree.global;
    if (b.gree.healthScore !== a.gree.healthScore) return b.gree.healthScore - a.gree.healthScore;

    // Preference-weighted tie-breaks.
    if (prefs.reduceSugar) {
      const sa = a.product.nutriments.sugars ?? 99, sb = b.product.nutriments.sugars ?? 99;
      if (sa !== sb) return sa - sb;
    }
    if (prefs.increaseProtein) {
      const pa = a.product.nutriments.proteins ?? -1, pb = b.product.nutriments.proteins ?? -1;
      if (pa !== pb) return pb - pa;
    }
    if (prefs.reduceUltraProcessed || prefs.reduceAdditives) {
      const na = nova(a.product.novaGroup), nb = nova(b.product.novaGroup);
      if (na !== nb) return na - nb;
    }

    // Neutral tie-breaks.
    const aa = a.product.additives?.length ?? 99, ab = b.product.additives?.length ?? 99;
    if (aa !== ab) return aa - ab;
    const nr = nutriRank(a.product.nutriScore) - nutriRank(b.product.nutriScore);
    if (nr !== 0) return nr;
    return a.product.barcode.localeCompare(b.product.barcode); // stable, deterministic
  };

  const ranking = [...entries].sort(cmp);
  const winner = ranking[0] ?? null;
  const runnerUp = ranking[1] ?? null;
  const closeness = winner && runnerUp && Math.abs(winner.gree.global - runnerUp.gree.global) <= 5 ? "close" : "clear";
  const confidence = entries.some((e) => e.gree.confidenceLevel === "low") ? "partial" : "high";
  const reasons = winner && runnerUp ? buildReasons(winner, runnerUp, prefs) : [];

  return { ranking, winner, runnerUp, closeness, confidence, reasons };
}

function buildReasons(w: BattleEntry, r: BattleEntry, prefs: LocalPreferences): string[] {
  const out: string[] = [];
  const wn = w.product.nutriments, rn = r.product.nutriments;
  const less = (a?: number, b?: number) => a !== undefined && b !== undefined && a < b - 0.01;
  const more = (a?: number, b?: number) => a !== undefined && b !== undefined && a > b + 0.01;

  if (w.gree.global > r.gree.global) out.push("higherScore");
  if (less(wn.sugars, rn.sugars)) out.push("lessSugar");
  if (less(wn.salt, rn.salt)) out.push("lessSalt");
  if (less(wn.saturatedFat, rn.saturatedFat)) out.push("lessSatFat");
  if (more(wn.proteins, rn.proteins)) out.push("moreProtein");
  if (more(wn.fiber, rn.fiber)) out.push("moreFiber");
  if ((w.product.additives?.length ?? 0) < (r.product.additives?.length ?? 0)) out.push("fewerAdditives");
  if (nova(w.product.novaGroup) < nova(r.product.novaGroup)) out.push("lowerNova");
  if (nutriRank(w.product.nutriScore) < nutriRank(r.product.nutriScore)) out.push("betterNutri");
  if (prefs.preferHalal && w.product.isHalal && !r.product.isHalal) out.push("matchHalal");
  if (prefs.preferBio && w.product.isBio && !r.product.isBio) out.push("matchBio");
  if ((prefs.preferVegan || prefs.goals.includes("vegan")) && w.product.isVegan && !r.product.isVegan) out.push("matchVegan");
  if (prefs.goals.length && w.gree.goalScore > r.gree.goalScore + 3) out.push("betterGoal");

  return out.slice(0, 4);
}
