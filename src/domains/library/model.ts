/**
 * Library domain — "Mes scans" (history) + favorites.
 * Data lives ONLY on the device (IndexedDB via services/storage).
 */
import type { Product, Grade } from "@greecheck/domain/product/model";
import type { GreeScore, ScoreGrade, ScoreValues } from "@greecheck/domain/scoring/types";
import { computeGreeImpact } from "@greecheck/domain/impact/engine";
import { lookupAdditive } from "@greecheck/domain/scoring/additive-registry";

/**
 * One entry in the local scan history (also reused for favorites).
 * A self-contained snapshot so the list renders fully OFFLINE — every field
 * beyond the identity is optional for backward compatibility with old rows.
 */
export interface ScanHistoryItem {
  barcode: string;
  name: string;
  imageUrl?: string;
  brand?: string;
  score: number;
  /** GreeScore letter grade at scan time (drives the verdict badge). */
  grade?: ScoreGrade;
  /** Localized verdict/grade word (kept for old rows). */
  verdict: string;
  nutriScore?: Grade;
  novaGroup?: 1 | 2 | 3 | 4;
  isBio?: boolean;
  /** Most precise category tag (for the category filter). */
  category?: string;
  /** i18n code of the most important warning at scan time (score.warning.<code>). */
  warningCode?: string;
  warningValues?: ScoreValues;
  /** True when that warning was a critical compatibility alert. */
  critical?: boolean;
  /** Weekly-progress signals captured at scan time (optional; old rows lack them). */
  sugars?: number;
  riskyAdditives?: number;
  envGrade?: Grade;
  scannedAt: number;
  favorite?: boolean;
}

/** A favorite is a pinned history item. */
export type FavoriteItem = ScanHistoryItem;

/**
 * Build a rich, offline-ready history snapshot from a product + its score.
 * `verdict` is the already-localized grade/verdict word.
 */
export function buildHistoryItem(product: Product, gree: GreeScore, verdict: string): ScanHistoryItem {
  const top = gree.warnings.find((w) => w.level === "critical") ?? gree.warnings.find((w) => w.level === "warning");
  const categories = product.categories?.filter(Boolean);
  return {
    barcode: product.barcode,
    name: product.name,
    imageUrl: product.imageUrl,
    brand: product.brand,
    score: gree.global,
    grade: gree.grade,
    verdict,
    nutriScore: product.nutriScore,
    novaGroup: product.novaGroup,
    isBio: product.isBio,
    category: categories?.length ? categories[categories.length - 1] : undefined,
    warningCode: top?.code,
    warningValues: top?.values,
    critical: top?.level === "critical",
    sugars: product.nutriments.sugars,
    riskyAdditives: (product.additives ?? []).filter((c) => {
      const r = lookupAdditive(c).risk;
      return r === "high" || r === "moderate";
    }).length,
    envGrade: (() => { const i = computeGreeImpact(product); return i.status === "valid" ? i.grade : undefined; })(),
    scannedAt: Date.now()
  };
}
