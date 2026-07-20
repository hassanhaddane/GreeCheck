/**
 * GreeImpact GI-1 engine — deterministic, pure. Same input → same output.
 *
 * Hard rules (docs/methodology/gree-impact-v1.md):
 *  - always separate from GreeScore;
 *  - never fabricate CO₂ kg, water use or transport distances — no such
 *    fields even exist in the output;
 *  - the Agribalyse lifecycle score is CATEGORY-level and flagged as such;
 *  - missing information is never rewarded and never penalized: it lowers
 *    confidence or yields an "insufficient" status with explicit reasons;
 *  - the insight speaks only about KNOWN signals.
 */
import type { Grade } from "../product/model";
import type { Product } from "../product/model";
import type {
  GreeImpact, ImpactConfidence, ImpactIndicator, ImpactInsight,
  ImpactInsightItem, ImpactMissingReason
} from "./types";
import { GREE_IMPACT_VERSION } from "./types";
import type { EnvironmentalProvider, EnvironmentalReading } from "./provider";
import { DEFAULT_ENVIRONMENTAL_PROVIDER } from "./provider";

const LABEL: Record<Grade, string> = {
  a: "impact_label_low",
  b: "impact_label_moderate",
  c: "impact_label_moderate",
  d: "impact_label_high",
  e: "impact_label_very_high"
};

/** Published Green-Score bands (used ONLY to label a score whose grade the
 *  source omitted — a display band, never an invented measurement). */
const SCORE_BANDS: ReadonlyArray<[number, Grade]> = [[80, "a"], [60, "b"], [40, "c"], [20, "d"], [0, "e"]];
const bandOf = (score: number): Grade => (SCORE_BANDS.find(([min]) => score >= min) ?? [0, "e"])[1];

function insufficient(provider: EnvironmentalProvider, missing: ImpactMissingReason[]): GreeImpact {
  return {
    status: "insufficient",
    methodologyVersion: GREE_IMPACT_VERSION,
    provider: { id: provider.id, methodology: provider.methodology },
    confidence: "low",
    indicators: [],
    environmentalLabels: [],
    missing,
    labelCode: "impact_label_insufficient",
    insight: {}
  };
}

/* ─────────────────────────── indicators ────────────────────────────────── */

function buildIndicators(r: EnvironmentalReading): ImpactIndicator[] {
  const out: ImpactIndicator[] = [];
  const adj = r.adjustments;

  if (r.lifecycleScore !== undefined) {
    out.push({
      kind: "lifecycle", tone: "neutral", code: "impact_lifecycle_category",
      params: { score: r.lifecycleScore }, sourceValue: r.lifecycleScore
    });
  }

  const origins = adj?.originsValue;
  out.push(
    origins === undefined
      ? { kind: "origins", tone: "unknown", code: "impact_origins_unknown" }
      : origins > 0
        ? { kind: "origins", tone: "positive", code: "impact_origins_favorable", params: { v: origins }, sourceValue: origins }
        : origins < 0
          ? { kind: "origins", tone: "negative", code: "impact_origins_distant", params: { v: origins }, sourceValue: origins }
          : { kind: "origins", tone: "neutral", code: "impact_origins_neutral", sourceValue: 0 }
  );

  const pack = adj?.packagingValue;
  out.push(
    pack === undefined
      ? { kind: "packaging", tone: "unknown", code: "impact_packaging_unknown" }
      : pack === 0
        ? { kind: "packaging", tone: "positive", code: "impact_packaging_low", sourceValue: 0 }
        : { kind: "packaging", tone: "negative", code: "impact_packaging_malus", params: { v: pack }, sourceValue: pack }
  );

  const prod = adj?.productionSystemValue;
  const labels = adj?.productionSystemLabels ?? [];
  out.push(
    prod === undefined
      ? { kind: "labels", tone: "unknown", code: "impact_labels_unknown" }
      : prod > 0
        ? { kind: "labels", tone: "positive", code: "impact_labels_certified", params: { n: labels.length, labels: labels.join(", ") }, sourceValue: prod }
        : { kind: "labels", tone: "neutral", code: "impact_labels_none", sourceValue: 0 }
  );

  const species = adj?.threatenedSpeciesValue;
  out.push(
    species === undefined
      ? { kind: "species", tone: "unknown", code: "impact_species_unknown" }
      : species < 0
        ? { kind: "species", tone: "negative", code: "impact_species_threatened", params: { ingredient: adj?.threatenedSpeciesIngredient ?? "palm-oil" }, sourceValue: species }
        : { kind: "species", tone: "neutral", code: "impact_species_none", sourceValue: 0 }
  );

  return out;
}

/* ───────────────────────────── insight ─────────────────────────────────── */

interface Candidate extends ImpactInsightItem { weight: number }

/** Best-known strength, clearest known weakness, and the alternative that
 *  would improve the VERIFIED impact. Absence of data never generates any. */
function buildInsight(r: EnvironmentalReading): ImpactInsight {
  const adj = r.adjustments;
  const strengths: Candidate[] = [];
  const weaknesses: Candidate[] = [];

  const labels = adj?.productionSystemLabels ?? [];
  if (adj?.productionSystemValue !== undefined && adj.productionSystemValue > 0) {
    strengths.push({ code: "impact_strength_certified_production", params: { labels: labels.join(", ") }, weight: 10 + adj.productionSystemValue });
  }
  if (adj?.originsValue !== undefined && adj.originsValue > 0) {
    strengths.push({ code: "impact_strength_close_origins", params: { v: adj.originsValue }, weight: 5 + adj.originsValue });
  }
  if (adj?.packagingValue === 0) {
    strengths.push({ code: "impact_strength_low_packaging", weight: 4 });
  }
  if (r.lifecycleScore !== undefined && r.lifecycleScore >= 80) {
    strengths.push({ code: "impact_strength_light_category", params: { score: r.lifecycleScore }, weight: 3 });
  }

  if (adj?.threatenedSpeciesValue !== undefined && adj.threatenedSpeciesValue < 0) {
    weaknesses.push({
      code: "impact_weakness_threatened_species",
      params: { ingredient: adj.threatenedSpeciesIngredient ?? "palm-oil" },
      weight: 10 + Math.abs(adj.threatenedSpeciesValue)
    });
  }
  if (adj?.packagingValue !== undefined && adj.packagingValue < 0) {
    weaknesses.push({ code: "impact_weakness_packaging", params: { v: adj.packagingValue }, weight: Math.abs(adj.packagingValue) });
  }
  if (adj?.originsValue !== undefined && adj.originsValue < 0) {
    weaknesses.push({ code: "impact_weakness_distant_origins", params: { v: adj.originsValue }, weight: Math.abs(adj.originsValue) });
  }
  if (r.lifecycleScore !== undefined && r.lifecycleScore < 40) {
    weaknesses.push({ code: "impact_weakness_heavy_category", params: { score: r.lifecycleScore }, weight: 3 });
  }

  const top = (list: Candidate[]) =>
    list.sort((a, b) => b.weight - a.weight).map(({ weight: _w, ...item }) => item)[0];

  const weakness = top(weaknesses);
  const ADVICE: Record<string, string> = {
    impact_weakness_threatened_species: "impact_advice_certified_alternative",
    impact_weakness_packaging: "impact_advice_packaging_alternative",
    impact_weakness_distant_origins: "impact_advice_local_alternative",
    impact_weakness_heavy_category: "impact_advice_category_alternative"
  };

  return {
    strength: top(strengths),
    weakness,
    advice: weakness ? { code: ADVICE[weakness.code], params: weakness.params } : undefined
  };
}

/* ─────────────────────────── main entry point ──────────────────────────── */

export function computeGreeImpact(
  product: Product,
  provider: EnvironmentalProvider = DEFAULT_ENVIRONMENTAL_PROVIDER
): GreeImpact {
  const r = provider.read(product);
  if (!r) return insufficient(provider, [{ code: "impact_missing_all" }]);

  const score = r.normalizedScore;
  const grade = r.normalizedGrade ?? (score !== undefined ? bandOf(score) : undefined);
  if (score === undefined && grade === undefined) {
    return insufficient(provider, [{ code: "impact_missing_all" }]);
  }

  /* explicit missing reasons (lower confidence, never the assessment) */
  const missing: ImpactMissingReason[] = [];
  if (score === undefined) missing.push({ code: "impact_missing_score" });
  if (r.normalizedGrade === undefined) missing.push({ code: "impact_missing_grade" });
  if (!r.adjustments) missing.push({ code: "impact_missing_adjustments" });
  if (r.statusKnown === false) missing.push({ code: "impact_status_unknown" });
  for (const signal of r.sourceMissing ?? []) {
    missing.push({ code: "impact_source_missing_signal", params: { signal } });
  }

  const confidence: ImpactConfidence =
    score !== undefined && r.normalizedGrade !== undefined && r.adjustments &&
    r.statusKnown !== false && (r.sourceMissing?.length ?? 0) === 0
      ? "high"
      : score !== undefined || r.adjustments
        ? "medium"
        : "low";

  const indicators = r.adjustments || r.lifecycleScore !== undefined ? buildIndicators(r) : [];

  return {
    status: "valid",
    methodologyVersion: GREE_IMPACT_VERSION,
    provider: { id: provider.id, methodology: provider.methodology },
    score,
    grade,
    sourceScore: r.sourceScore,
    sourceGrade: r.sourceGrade,
    confidence,
    lifecycle: r.lifecycleScore !== undefined
      ? { categoryScore: r.lifecycleScore, categoryLevel: true }
      : undefined,
    indicators,
    environmentalLabels: r.adjustments?.productionSystemLabels ?? [],
    missing,
    labelCode: grade ? LABEL[grade] : "impact_label_insufficient",
    insight: buildInsight(r)
  };
}
