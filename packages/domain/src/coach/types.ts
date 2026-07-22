/**
 * GreeCoach V1 — a DETERMINISTIC informational assistant.
 *
 * It answers a fixed set of questions using STRUCTURED, already-verified engine
 * outputs (GreeScore, GreeImpact, comparison, cart analysis). There is no LLM,
 * no network, no invented content: every answer is a template assembled from
 * facts the engines produced. The UI may look conversational, but the mapping
 * question → answer is pure and testable.
 */
import type { Product } from "../product/model";
import type { GreeScore } from "../scoring/types";
import type { GreeImpact } from "../impact/types";
import type { LocalPreferences } from "../criteria/model";
import type { CompareResult } from "../compare/engine";
import type { CartScoreResult } from "../cart/engine";
import type { CartAnalysisExtras } from "../cart/analysis";

export const GREE_COACH_VERSION = "GC-1.0.0";

export type CoachIntent =
  | "whyRated"
  | "mainWeakness"
  | "mainStrength"
  | "whichAdditive"
  | "whyNoScore"
  | "halalConfirmed"
  | "allergenCheck"
  | "whyAlternativeBetter"
  | "compareHealth"
  | "compareEnvironment"
  | "improveCart"
  | "explainSimpler";

/** Methodology section a UI can deep-link to (/methodology#<anchor>). */
export type MethodologyAnchor =
  | "score" | "nutrition" | "additives" | "organic" | "impact" | "confidence" | "halal" | "compare" | "cart";

/**
 * One answer sentence. `code` is an i18n key in the "coach" namespace. `ref`
 * points at an EXISTING coded fact (a score reason, verdict, warning…) so the
 * assistant reuses the engines' own vocabulary rather than restating it.
 */
export interface CoachLine {
  code: string;
  params?: Record<string, string | number>;
  ref?: {
    ns: "reason" | "verdict" | "warning" | "unscored" | "grade" | "impactLabel" | "envReason" | "cartRisk";
    code: string;
    values?: Record<string, string | number>;
  };
}

export interface CoachAnswer {
  intent: CoachIntent;
  version: string;
  lines: CoachLine[];
  /** Explicit uncertainty statement, when the data is partial/absent. */
  uncertainty?: CoachLine;
  /** Relevant methodology section to link to. */
  methodology?: MethodologyAnchor;
  /** True when the question cannot be answered from the available data. */
  unsupported?: boolean;
}

/* ── contexts the coach can reason over (all built from verified outputs) ── */

export interface ProductContext {
  kind: "product";
  product: Product;
  gree: GreeScore;
  impact: GreeImpact;
  prefs: LocalPreferences;
  /** A better alternative, if the UI has already loaded one (never fetched here). */
  alternative?: { product: Product; gree: GreeScore };
}

export interface CompareContext {
  kind: "compare";
  result: CompareResult;
}

export interface CartContext {
  kind: "cart";
  result: CartScoreResult;
  extras: CartAnalysisExtras;
}

export type CoachContext = ProductContext | CompareContext | CartContext;
