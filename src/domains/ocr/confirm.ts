/**
 * OCR confirmation, normalization and score-gating — pure and deterministic.
 *
 * The contract that makes OCR safe:
 *  1. Only values the user reviewed and explicitly kept become `Confirmed…`.
 *  2. Unreadable values stay absent — normalization never invents them.
 *  3. A score is computed ONLY when every REQUIRED nutrition field is present;
 *     otherwise we explain exactly what is missing.
 *  4. The assembled product is flagged `origin: "user_ocr"` so every downstream
 *     surface can label it "user-confirmed extracted data".
 *
 * Nothing here fetches, stores, or touches the DOM.
 */
import type { Product, Nutriments } from "@greecheck/domain/product/model";
import type {
  ConfirmedOcrData, NutritionFieldKey, OcrExtraction,
  OcrSessionState, OcrAction, NutritionCandidates
} from "./model";

/** Required for a GreeScore (mirrors nutrition.ts required facts). */
export const REQUIRED_NUTRITION_FIELDS: NutritionFieldKey[] = ["energyKcal", "sugars", "saturatedFat", "salt"];

/* ───────────────────────── review → confirmed ───────────────────────── */

/**
 * Build the confirmed payload from the user's REVIEWED values. `edited` holds
 * whatever the user kept/typed in the review form (absent = they left it
 * unreadable). Blank, non-finite or negative entries are dropped — never
 * coerced to zero. Returns null when nothing usable was confirmed.
 */
export function buildConfirmed(
  kind: OcrExtraction["kind"],
  edited: { ingredientsText?: string; nutrition?: Partial<Record<NutritionFieldKey, number | undefined>> }
): ConfirmedOcrData | null {
  if (kind === "ingredients") {
    const text = edited.ingredientsText?.trim();
    if (!text) return null;
    return { confirmed: true, ingredientsText: text };
  }
  const nutrition: Partial<Record<NutritionFieldKey, number>> = {};
  for (const [k, v] of Object.entries(edited.nutrition ?? {})) {
    if (typeof v === "number" && Number.isFinite(v) && v >= 0) {
      nutrition[k as NutritionFieldKey] = v;
    }
  }
  if (Object.keys(nutrition).length === 0) return null;
  return { confirmed: true, nutrition };
}

/* ───────────────────────── score readiness ───────────────────────── */

export interface ScoreReadiness {
  ready: boolean;
  /** Required nutrition fields still missing (i18n via ocr.field.*). */
  missing: NutritionFieldKey[];
}

/** Whether a score can be computed from confirmed OCR data, and what's missing. */
export function scoreReadiness(data: ConfirmedOcrData | undefined): ScoreReadiness {
  const present = data?.nutrition ?? {};
  const missing = REQUIRED_NUTRITION_FIELDS.filter((k) => present[k] === undefined);
  // Ingredients-only confirmations are never "score ready" (all required absent).
  return { ready: missing.length === 0, missing };
}

/* ───────────────────────── normalize → product ───────────────────────── */

/**
 * Assemble a normalized Product from confirmed OCR data, flagged `user_ocr`.
 * Only confirmed values are written; absent stays absent. An optional
 * `identity` (from a prior barcode scan the user is completing) supplies the
 * name/barcode — otherwise a local placeholder identity is used.
 *
 * NOTE: assembling a product does not mean it is scoreable — always gate on
 * `scoreReadiness` before calling the engine.
 */
export function buildOcrProduct(
  data: ConfirmedOcrData,
  identity?: { barcode?: string; name?: string; imageUrl?: string }
): Product {
  const nutriments: Nutriments = {};
  const n = data.nutrition ?? {};
  if (n.energyKcal !== undefined) nutriments.energyKcal = n.energyKcal;
  if (n.sugars !== undefined) nutriments.sugars = n.sugars;
  if (n.saturatedFat !== undefined) nutriments.saturatedFat = n.saturatedFat;
  if (n.salt !== undefined) nutriments.salt = n.salt;
  if (n.fat !== undefined) nutriments.fat = n.fat;
  if (n.fiber !== undefined) nutriments.fiber = n.fiber;
  if (n.proteins !== undefined) nutriments.proteins = n.proteins;

  return {
    barcode: identity?.barcode ?? `ocr-${Date.now()}`,
    name: identity?.name ?? "",
    imageUrl: identity?.imageUrl,
    source: "openfoodfacts", // required by the model; origin marks the true provenance
    origin: "user_ocr",
    ingredientsText: data.ingredientsText,
    nutriments
  };
}

/* ───────────────────────── session reducer ───────────────────────── */

export function initialOcrState(kind: OcrSessionState["kind"] = "nutrition"): OcrSessionState {
  return { step: "capture", kind };
}

/**
 * Pure session reducer. The state machine guarantees confirmation cannot be
 * skipped: `confirmedData` is only ever set by an explicit CONFIRM action, and
 * every transition that would reuse the image keeps the object URL in state so
 * the UI can revoke it deterministically on RESET/leave.
 */
export function reduceOcr(state: OcrSessionState, action: OcrAction): OcrSessionState {
  switch (action.type) {
    case "SET_KIND":
      return { ...initialOcrState(action.kind) };
    case "IMAGE_READY":
      return { ...state, step: "adjust", imageUrl: action.imageUrl, extraction: undefined, confirmedData: undefined, failure: undefined };
    case "EXTRACT_START":
      return { ...state, step: "extracting", failure: undefined };
    case "EXTRACT_OK":
      return { ...state, step: "review", extraction: action.extraction, failure: undefined };
    case "EXTRACT_FAIL":
      return { ...state, step: "failed", failure: action.failure };
    case "CONFIRM":
      return { ...state, step: "result", confirmedData: action.data };
    case "BACK_TO_REVIEW":
      return { ...state, step: "review", confirmedData: undefined };
    case "RESET":
      return { ...initialOcrState(state.kind) };
    default:
      return state;
  }
}

/* ───────────────────────── review-form seeding ───────────────────────── */

/** Pre-fill the review form from candidates — proposing values, never committing them. */
export function seedReviewValues(candidates: NutritionCandidates): Partial<Record<NutritionFieldKey, number | undefined>> {
  const out: Partial<Record<NutritionFieldKey, number | undefined>> = {};
  for (const [k, c] of Object.entries(candidates)) {
    out[k as NutritionFieldKey] = c?.value; // undefined when unreadable — stays blank
  }
  return out;
}
