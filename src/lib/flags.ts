/**
 * Feature flags. Build-time inlined (NEXT_PUBLIC_*), no runtime service.
 *
 * OCR beta: OFF in production unless NEXT_PUBLIC_OCR_BETA="1"; ON elsewhere
 * unless explicitly disabled with "0". See docs/adr/0001-ocr-beta.md.
 */
export const OCR_BETA_ENABLED =
  process.env.NODE_ENV === "production"
    ? process.env.NEXT_PUBLIC_OCR_BETA === "1"
    : process.env.NEXT_PUBLIC_OCR_BETA !== "0";
