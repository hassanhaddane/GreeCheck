/** Interpret a scanned value (barcode digits, a QR with a code, or a product URL). */
export type ParsedScan =
  | { type: "barcode"; code: string }
  | { type: "text"; value: string };

export const PRODUCT_BARCODE_RE = /^\d{8,14}$/;
const GS1_GTIN_RE = /(?:^|\D)01(\d{14})/;

export function parseScan(raw: string): ParsedScan {
  const s = raw.trim();

  // Plain barcode (EAN-8/13, UPC, etc.)
  if (PRODUCT_BARCODE_RE.test(s)) return { type: "barcode", code: s };

  // GS1 Code 128 payloads often encode product GTIN as AI 01 + 14 digits.
  const gs1Gtin = s.match(GS1_GTIN_RE);
  if (gs1Gtin) return { type: "barcode", code: gs1Gtin[1] };

  // Product URL (e.g. openfoodfacts.org/product/<code>) or any URL embedding a code
  try {
    const u = new URL(s);
    const fromPath = u.pathname.match(/(\d{8,14})/);
    if (fromPath) return { type: "barcode", code: fromPath[1] };
  } catch {
    /* not a URL */
  }

  // Any long digit run inside the payload
  const embedded = s.match(/\b(\d{8,14})\b/);
  if (embedded) return { type: "barcode", code: embedded[1] };

  return { type: "text", value: s };
}

export function isSupportedProductBarcode(code: string): boolean {
  return PRODUCT_BARCODE_RE.test(code.trim());
}

export function parseProductCode(raw: string): string | null {
  const parsed = parseScan(raw);
  return parsed.type === "barcode" && isSupportedProductBarcode(parsed.code) ? parsed.code : null;
}
