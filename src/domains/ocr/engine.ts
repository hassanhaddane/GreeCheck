"use client";
/**
 * Browser OCR engine adapter — the ONLY module that loads tesseract.js.
 *
 * Isolation & privacy:
 *  - lazy dynamic import: the ~2 MB engine + language data load ONLY when the
 *    user actually starts a beta extraction, never on the stable scanner path;
 *  - runs fully IN-BROWSER (WASM). No image is uploaded anywhere. There is no
 *    server-OCR fallback wired in — enabling one would require an explicit
 *    privacy decision (see docs/adr/0001-ocr-beta.md);
 *  - the engine is disposed after each run so no worker or image lingers.
 */
import type { OcrKind, OcrExtraction, OcrRawResult } from "./model";
import { buildExtraction } from "./parse";

export type OcrEngine = (image: Blob | HTMLCanvasElement, kind: OcrKind) => Promise<OcrExtraction | undefined>;

/** fr+eng covers the launch market; other locales are a documented follow-up. */
const OCR_LANGS = "fra+eng";

/** Run tesseract in-browser and parse the result. Undefined ⇒ no usable text. */
export const browserOcrEngine: OcrEngine = async (image, kind) => {
  const { createWorker } = await import("tesseract.js");
  const worker = await createWorker(OCR_LANGS);
  try {
    const { data } = await worker.recognize(image as Parameters<typeof worker.recognize>[0]);
    const raw: OcrRawResult = { text: data.text ?? "", confidence: Math.round(data.confidence ?? 0) };
    return buildExtraction(kind, raw);
  } finally {
    await worker.terminate();
  }
};

/**
 * Extract with graceful failure classification. Never throws to the UI: the
 * reducer receives a typed failure so the user always gets an explanation.
 */
export async function runExtraction(
  engine: OcrEngine,
  image: Blob | HTMLCanvasElement,
  kind: OcrKind
): Promise<{ ok: true; extraction: OcrExtraction } | { ok: false; failure: "engine_error" | "no_text_found" }> {
  try {
    const extraction = await engine(image, kind);
    if (!extraction) return { ok: false, failure: "no_text_found" };
    return { ok: true, extraction };
  } catch {
    return { ok: false, failure: "engine_error" };
  }
}
