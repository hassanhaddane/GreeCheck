/** Scan-input interpreter — supported formats, checksums, QR policy, manual entry. */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  interpretScan, parseProductCode, expandUpcE, hasValidGs1CheckDigit
} from "./parse-scan";

/* Known-valid codes: 3017620422003 (EAN-13) · 96385074 (EAN-8) ·
   036000291452 (UPC-A) · 01234565 (UPC-E → 012345000065). */

test("GS1 check digit: accepts valid, rejects corrupted", () => {
  assert.ok(hasValidGs1CheckDigit("3017620422003"));
  assert.ok(hasValidGs1CheckDigit("96385074"));
  assert.ok(hasValidGs1CheckDigit("036000291452"));
  assert.ok(!hasValidGs1CheckDigit("3017620422004")); // one digit off
  assert.ok(!hasValidGs1CheckDigit("1234567"));       // unsupported length
});

test("EAN-13 / EAN-8 / UPC-A: valid codes resolve with their symbology", () => {
  assert.deepEqual(interpretScan("3017620422003", "EAN_13"),
    { kind: "product", code: "3017620422003", symbology: "ean13" });
  assert.deepEqual(interpretScan("96385074", "EAN_8"),
    { kind: "product", code: "96385074", symbology: "ean8" });
  assert.deepEqual(interpretScan("036000291452", "UPC_A"),
    { kind: "product", code: "036000291452", symbology: "upca" });
});

test("corrupted check digit is an explicit unsupported state — never a product", () => {
  const r = interpretScan("3017620422004", "EAN_13");
  assert.equal(r.kind, "unsupported");
  assert.equal(r.kind === "unsupported" && r.reason, "invalid_checksum");
});

test("UPC-E expands to a checksum-valid UPC-A", () => {
  assert.equal(expandUpcE("01234565"), "012345000065");
  assert.deepEqual(interpretScan("01234565", "UPC_E"),
    { kind: "product", code: "012345000065", symbology: "upce" });
  assert.equal(expandUpcE("01234560"), undefined); // wrong check digit
  assert.equal(interpretScan("01234560", "UPC_E").kind, "unsupported");
});

test("Code 128: GS1 AI(01) GTIN-14 accepted; leading zero normalized to GTIN-13", () => {
  const r = interpretScan("0103017620422003", "CODE_128"); // AI 01 + 0+EAN13
  assert.deepEqual(r, { kind: "product", code: "3017620422003", symbology: "code128" });
  assert.equal(interpretScan("ABC-INTERNAL-REF", "CODE_128").kind, "unsupported");
});

test("QR with a bare valid GTIN or a product URL resolves", () => {
  assert.deepEqual(interpretScan("3017620422003", "QR_CODE"),
    { kind: "product", code: "3017620422003", symbology: "qr" });
  assert.deepEqual(interpretScan("https://world.openfoodfacts.org/product/3017620422003/nutella", "QR_CODE"),
    { kind: "product", code: "3017620422003", symbology: "qr" });
  // GS1 Digital Link
  assert.deepEqual(interpretScan("https://id.gs1.org/01/03017620422003", "QR_CODE"),
    { kind: "product", code: "3017620422003", symbology: "qr" });
});

test("QR text is NEVER silently treated as a product", () => {
  for (const payload of [
    "https://example.com/promo?tel=0612345678",   // digits, wrong shape/checksum
    "WIFI:T:WPA;S:Boulangerie;P:12345678;;",       // wifi QR with 8 digits (bad checksum)
    "Bonjour, code promo 12345678901234 merci",    // free text with digit run
    "https://example.com/article/20260720"         // date-like digits in URL
  ]) {
    const r = interpretScan(payload, "QR_CODE");
    assert.equal(r.kind, "unsupported", payload);
    assert.equal(r.kind === "unsupported" && r.reason, "qr_no_product", payload);
  }
});

test("manual fallback: digits validated, typos rejected, URLs accepted", () => {
  assert.equal(parseProductCode("3017620422003"), "3017620422003");
  assert.equal(parseProductCode(" 96385074 "), "96385074");
  assert.equal(parseProductCode("3017620422004"), null); // typo caught by checksum
  assert.equal(parseProductCode("123"), null);
  assert.equal(parseProductCode("hello"), null);
  assert.equal(parseProductCode("https://fr.openfoodfacts.org/produit/3017620422003"), "3017620422003");
});

test("unknown symbology never resolves", () => {
  assert.equal(interpretScan("3017620422003", "PDF_417").kind, "unsupported");
});

test("determinism", () => {
  assert.deepEqual(interpretScan("3017620422003", "EAN_13"), interpretScan("3017620422003", "EAN_13"));
});
