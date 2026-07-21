/**
 * OCR beta domain model — isolated from the stable barcode scanner.
 *
 * Contract: OCR output is a PROPOSAL. Nothing becomes data before the user
 * reviews and explicitly confirms it; unreadable values stay absent (never
 * invented); everything derived downstream is labeled as user-confirmed
 * extracted data ("user_ocr" source).
 */

export type OcrKind = "ingredients" | "nutrition";

/** Raw engine output (tesseract or any future engine). */
export interface OcrRawResult {
  text: string;
  /** 0–100 mean word confidence as reported by the engine. */
  confidence: number;
}

/** One numeric nutrition candidate extracted from the photo (per 100 g). */
export interface NutritionCandidate {
  /** Parsed value, absent when unreadable/absent — NEVER a guess. */
  value?: number;
  /** The exact source line the value came from (user-verifiable). */
  sourceLine?: string;
}

export type NutritionFieldKey =
  | "energyKcal" | "fat" | "saturatedFat" | "sugars" | "fiber" | "proteins" | "salt";

export type NutritionCandidates = Partial<Record<NutritionFieldKey, NutritionCandidate>>;

/** Parsed proposal presented for review (editable by the user). */
export interface OcrExtraction {
  kind: OcrKind;
  raw: OcrRawResult;
  /** Cleaned ingredient text (kind = ingredients). */
  ingredientsText?: string;
  /** Detected additive codes in the ingredient text (display aid only). */
  detectedAdditives?: string[];
  /** Nutrition value candidates (kind = nutrition). */
  nutrition?: NutritionCandidates;
}

/** What the user actually confirmed after review (the ONLY trusted payload). */
export interface ConfirmedOcrData {
  /** Explicit confirmation is mandatory — enforced by confirm.ts. */
  confirmed: true;
  ingredientsText?: string;
  nutrition?: Partial<Record<NutritionFieldKey, number>>;
}

/* ── session state machine ── */

export type OcrStep = "capture" | "adjust" | "extracting" | "review" | "result" | "failed";

export type OcrFailure = "engine_error" | "no_text_found" | "image_unreadable";

export interface OcrSessionState {
  step: OcrStep;
  kind: OcrKind;
  /** Object URL of the session image — released on reset/leave, never persisted. */
  imageUrl?: string;
  extraction?: OcrExtraction;
  /** Present ONLY after explicit confirmation. */
  confirmedData?: ConfirmedOcrData;
  failure?: OcrFailure;
}

export type OcrAction =
  | { type: "SET_KIND"; kind: OcrKind }
  | { type: "IMAGE_READY"; imageUrl: string }
  | { type: "EXTRACT_START" }
  | { type: "EXTRACT_OK"; extraction: OcrExtraction }
  | { type: "EXTRACT_FAIL"; failure: OcrFailure }
  | { type: "CONFIRM"; data: ConfirmedOcrData }
  | { type: "BACK_TO_REVIEW" }
  | { type: "RESET" };
