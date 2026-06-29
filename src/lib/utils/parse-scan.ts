/** Interpret a scanned value (barcode digits, a QR with a code, or a product URL). */
export type ParsedScan =
  | { type: "barcode"; code: string }
  | { type: "text"; value: string };

export function parseScan(raw: string): ParsedScan {
  const s = raw.trim();

  // Plain barcode (EAN-8/13, UPC, etc.)
  if (/^\d{8,14}$/.test(s)) return { type: "barcode", code: s };

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
