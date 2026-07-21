/**
 * ════════════════════════════════════════════════════════════════════════
 *  GreeCompare — compare 2–3 comparable food products for a real purchase
 *  decision. Deterministic and pure.
 *
 *  It reuses the health ranking from the (unchanged) Battle engine and LAYERS
 *  the environmental assessment on top. Crucially it keeps HEALTH and
 *  ENVIRONMENT as two SEPARATE verdicts — it never blends GreeScore and
 *  GreeImpact into an undocumented combined value. The "balanced" choice is
 *  left to the user (the UI lets them pick); the engine only surfaces the two
 *  documented winners and their measurable differences.
 * ════════════════════════════════════════════════════════════════════════
 */
import type { Product } from "../product/model";
import type { LocalPreferences } from "../criteria/model";
import type { GreeScore } from "../scoring/types";
import type { GreeImpact } from "../impact/types";
import { computeGreeImpact } from "../impact/engine";
import { computeBattle, effectiveScore, type BattleEntry, type BattleValidation } from "../battle/engine";

export interface CompareEntry extends BattleEntry {
  impact: GreeImpact;
}

export interface CompareResult {
  /** Best → worst by confidence-discounted GreeScore (health ordering). */
  entries: CompareEntry[];
  validation: BattleValidation;

  /** Health winner (GreeScore) — null when < 2 products. */
  healthWinner: CompareEntry | null;
  healthRunnerUp: CompareEntry | null;
  /** Measurable health differences, winner vs runner-up (i18n reason codes). */
  healthReasons: string[];
  /** True when the health winner rests on LOW-confidence data (UI must warn). */
  healthWinnerLowConfidence: boolean;
  /** "close" when the effective-score gap is ≤ 5. */
  closeness: "clear" | "close";

  /** Environment winner (GreeImpact) — undefined when no product has valid impact. */
  environmentWinner?: CompareEntry;
  /** Measurable environmental differences for the env winner (i18n codes). */
  environmentReasons: string[];
  /** True when the health winner and the environment winner are different products. */
  winnersDiffer: boolean;
}

const gradeRank = (g?: string) => (g ? "abcde".indexOf(g) : 9);

/* ── environmental ordering (separate from health, never blended) ── */

function pickEnvironmentWinner(entries: CompareEntry[]): CompareEntry | undefined {
  const valid = entries.filter((e) => e.impact.status === "valid" && e.impact.grade);
  if (valid.length < 2) return undefined; // nothing meaningful to compare on environment
  return [...valid].sort((a, b) => {
    const r = gradeRank(a.impact.grade) - gradeRank(b.impact.grade);
    if (r !== 0) return r;
    const sa = a.impact.score ?? -1, sb = b.impact.score ?? -1;
    if (sb !== sa) return sb - sa;
    return a.product.barcode.localeCompare(b.product.barcode);
  })[0];
}

/** Measurable environmental differences: env winner vs the health winner. */
function environmentReasons(env: CompareEntry, health: CompareEntry): string[] {
  const out: string[] = [];
  if (env.product.barcode === health.product.barcode) return out;
  const ei = env.impact, hi = health.impact;
  if (ei.grade && hi.grade && gradeRank(ei.grade) < gradeRank(hi.grade)) out.push("betterEnvGrade");

  const adj = (e: CompareEntry) => (e.impact.status === "valid" ? e.impact : undefined);
  const ea = adj(env), ha = adj(health);
  const ind = (e?: GreeImpact, kind?: string) => e?.indicators.find((i) => i.kind === kind);
  const val = (e?: GreeImpact, kind?: string) => {
    const v = ind(e, kind)?.sourceValue;
    return typeof v === "number" ? v : undefined;
  };
  const ep = val(ea, "packaging"), hp = val(ha, "packaging");
  if (ep !== undefined && hp !== undefined && ep > hp) out.push("lessPackagingImpact");
  const eo = val(ea, "origins"), ho = val(ha, "origins");
  if (eo !== undefined && ho !== undefined && eo > ho) out.push("closerOrigins");
  if (ind(ea, "labels")?.tone === "positive" && ind(ha, "labels")?.tone !== "positive") out.push("certifiedProduction");
  if (ind(ha, "species")?.tone === "negative" && ind(ea, "species")?.tone !== "negative") out.push("noThreatenedSpecies");
  return out.slice(0, 4);
}

/* ─────────────────────────── entry point ──────────────────────────── */

export function computeComparison(products: Product[], prefs: LocalPreferences): CompareResult {
  // Health ranking, winner, reasons and comparability come from the (unchanged)
  // Battle engine — GreeScore is computed exactly as before.
  const battle = computeBattle(products, prefs);
  const impactByBarcode = new Map(products.map((p) => [p.barcode, computeGreeImpact(p)]));

  const entries: CompareEntry[] = battle.ranking.map((e) => ({
    ...e,
    impact: impactByBarcode.get(e.product.barcode)!
  }));

  const healthWinner = entries[0] ?? null;
  const healthRunnerUp = entries[1] ?? null;
  const environmentWinner = pickEnvironmentWinner(entries);

  return {
    entries,
    validation: battle.validation,
    healthWinner,
    healthRunnerUp,
    healthReasons: battle.reasons,
    healthWinnerLowConfidence: healthWinner?.gree.confidence === "low",
    closeness: battle.closeness,
    environmentWinner,
    environmentReasons: environmentWinner && healthWinner ? environmentReasons(environmentWinner, healthWinner) : [],
    winnersDiffer: Boolean(environmentWinner && healthWinner && environmentWinner.product.barcode !== healthWinner.product.barcode)
  };
}

export { effectiveScore };
