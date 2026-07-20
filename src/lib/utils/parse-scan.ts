/**
 * Scan-input interpreter — the ONLY authority on what counts as a product code.
 *
 * Hardened rules (production scanner):
 *  • Supported symbologies: EAN-8, EAN-13, UPC-A, UPC-E (expanded to UPC-A),
 *    Code 128 (GS1 AI 01 GTIN or plain GTIN payload), QR containing a
 *    supported product identifier, and manual digit entry.
 *  • Every accepted code passes the GS1 mod-10 check digit — a typo or a
 *    random digit run can never become a "product".
 *  • QR text is NEVER silently treated as a product: only a bare valid GTIN,
 *    a GS1 Digital Link, or a URL whose path carries a valid GTIN qualifies.
 *    Anything else is an explicit, typed "unsupported" outcome.
 *
 * Pure module — fully unit-tested in parse-scan.test.ts.
 */

export type ScanSymbology =
  | "ean13" | "ean8" | "upca" | "upce" | "code128" | "qr" | "manual";

export type UnsupportedReason =
  | "invalid_checksum"   // digits of a supported shape, but the check digit fails
  | "unsupported_format" // symbology or payload shape we do not support
  | "qr_no_product"      // QR decoded fine but carries no product identifier
  | "not_a_code";        // free text / empty input

export type ScanInterpretation =
  | { kind: "product"; code: string; symbology: ScanSymbology }
  | { kind: "unsupported"; reason: UnsupportedReason };

/* ───────────────────────── GS1 check digit ───────────────────────── */

/** GS1 mod-10: from the right, weights 3,1,3,1… on the digits before the check. */
export function hasValidGs1CheckDigit(code: string): boolean {
  if (!/^\d{8}$|^\d{12,14}$/.test(code)) return false;
  const digits = code.split("").map(Number);
  const check = digits.pop()!;
  const sum = digits.reverse().reduce((acc, d, i) => acc + d * (i % 2 === 0 ? 3 : 1), 0);
  return (10 - (sum % 10)) % 10 === check;
}

/** GTIN-14 with a single leading zero is the same article as its GTIN-13. */
function normalizeGtin(code: string): string {
  if (code.length === 14 && code.startsWith("0")) return code.slice(1);
  return code;
}

/** Accept a bare digit string as a product code iff shape + check digit hold. */
function acceptDigits(code: string, symbology: ScanSymbology): ScanInterpretation {
  if (!/^\d{8}$|^\d{12,14}$/.test(code)) return { kind: "unsupported", reason: "unsupported_format" };
  if (!hasValidGs1CheckDigit(code)) return { kind: "unsupported", reason: "invalid_checksum" };
  return { kind: "product", code: normalizeGtin(code), symbology };
}

/* ───────────────────────── UPC-E expansion ───────────────────────── */

/**
 * Expand an 8-digit UPC-E (number system + 6 body digits + check) to UPC-A.
 * The check digit is carried over and re-validated on the expanded form.
 */
export function expandUpcE(upce: string): string | undefined {
  if (!/^[01]\d{7}$/.test(upce)) return undefined;
  const s = upce[0];
  const b = upce.slice(1, 7);
  const c = upce[7];
  const last = b[5];
  let body: string;
  if (last === "0" || last === "1" || last === "2") body = `${b.slice(0, 2)}${last}0000${b.slice(2, 5)}`;
  else if (last === "3") body = `${b.slice(0, 3)}00000${b.slice(3, 5)}`;
  else if (last === "4") body = `${b.slice(0, 4)}00000${b[4]}`;
  else body = `${b.slice(0, 5)}0000${last}`;
  const upca = `${s}${body}${c}`;
  return hasValidGs1CheckDigit(upca) ? upca : undefined;
}

/* ─────────────────────── payload extraction ──────────────────────── */

/** GS1 element string: AI (01) + GTIN-14, tolerating FNC1/group separators. */
const GS1_AI01_RE = /(?:^|[^\d])01(\d{14})/;

/** A URL path segment (or GS1 Digital Link "/01/<gtin>") holding a valid GTIN. */
function gtinFromUrl(raw: string): string | undefined {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return undefined;
  }
  const segments = url.pathname.split("/").filter(Boolean);
  // GS1 Digital Link: …/01/<gtin14>
  const aiIndex = segments.indexOf("01");
  if (aiIndex >= 0 && segments[aiIndex + 1] && hasValidGs1CheckDigit(segments[aiIndex + 1])) {
    return segments[aiIndex + 1];
  }
  // Product URLs (e.g. …/product/<code>/…): any segment that IS a valid GTIN.
  return segments.find((seg) => /^\d{8}$|^\d{12,14}$/.test(seg) && hasValidGs1CheckDigit(seg));
}

/* ───────────────────────── interpretation ────────────────────────── */

/**
 * Interpret a decoded scanner payload. `format` is the zxing symbology name
 * ("EAN_13", "UPC_E", "QR_CODE"…); omit it for manual entry.
 */
export function interpretScan(raw: string, format?: string): ScanInterpretation {
  const s = raw.trim();
  if (!s) return { kind: "unsupported", reason: "not_a_code" };

  switch (format) {
    case "EAN_13":
      return /^\d{13}$/.test(s) ? acceptDigits(s, "ean13") : { kind: "unsupported", reason: "unsupported_format" };
    case "EAN_8":
      return /^\d{8}$/.test(s) ? acceptDigits(s, "ean8") : { kind: "unsupported", reason: "unsupported_format" };
    case "UPC_A":
      return /^\d{12}$/.test(s) ? acceptDigits(s, "upca") : { kind: "unsupported", reason: "unsupported_format" };
    case "UPC_E": {
      const expanded = expandUpcE(s);
      return expanded
        ? { kind: "product", code: expanded, symbology: "upce" }
        : { kind: "unsupported", reason: "invalid_checksum" };
    }
    case "CODE_128": {
      const ai = s.match(GS1_AI01_RE);
      if (ai) return acceptDigits(ai[1], "code128");
      if (/^\d+$/.test(s)) return acceptDigits(s, "code128");
      return { kind: "unsupported", reason: "unsupported_format" };
    }
    case "QR_CODE": {
      if (/^\d+$/.test(s)) {
        const direct = acceptDigits(s, "qr");
        return direct.kind === "product" ? direct : { kind: "unsupported", reason: "qr_no_product" };
      }
      const ai = s.match(GS1_AI01_RE);
      if (ai && hasValidGs1CheckDigit(ai[1])) return acceptDigits(ai[1], "qr");
      const fromUrl = gtinFromUrl(s);
      if (fromUrl) return { kind: "product", code: normalizeGtin(fromUrl), symbology: "qr" };
      // QR decoded fine but carries no product identifier → explicit refusal.
      return { kind: "unsupported", reason: "qr_no_product" };
    }
    case undefined: {
      // Manual entry (or pasted URL).
      if (/^\d+$/.test(s)) return acceptDigits(s, "manual");
      const fromUrl = gtinFromUrl(s);
      if (fromUrl) return { kind: "product", code: normalizeGtin(fromUrl), symbology: "manual" };
      return { kind: "unsupported", reason: "not_a_code" };
    }
    default:
      // A symbology we did not ask for — never treat as a product.
      return { kind: "unsupported", reason: "unsupported_format" };
  }
}

/* ─────────────────── compatibility surface (existing callers) ─────────────── */

export const PRODUCT_BARCODE_RE = /^\d{8}$|^\d{12,14}$/;

export function isSupportedProductBarcode(code: string): boolean {
  return interpretScan(code.trim()).kind === "product";
}

/** Legacy helper: manual/pasted input → validated code or null. */
export function parseProductCode(raw: string, format?: string): string | null {
  const r = interpretScan(raw, format);
  return r.kind === "product" ? r.code : null;
}
