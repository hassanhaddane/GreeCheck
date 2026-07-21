/**
 * OCR beta — pure logic tests: parsing, confirmation gating, normalization,
 * score readiness, session reducer. No engine, no DOM, no network.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { parseNutritionText, cleanIngredientsText, detectAdditiveCodes, buildExtraction } from "./parse";
import {
  buildConfirmed, scoreReadiness, buildOcrProduct, reduceOcr, initialOcrState,
  seedReviewValues, REQUIRED_NUTRITION_FIELDS
} from "./confirm";
import { runExtraction } from "./engine";
import { computeGreeScore } from "@greecheck/domain/scoring/gree-score";
import { defaultPreferences } from "@greecheck/domain/criteria/model";
import type { OcrExtraction, OcrRawResult } from "./model";

const NUTRITION_PHOTO = `Valeurs nutritionnelles pour 100 g
Énergie 1674 kJ / 400 kcal
Matières grasses 16 g
dont acides gras saturés 3,1 g
Glucides 62 g
dont sucres 21 g
Fibres alimentaires 7,8 g
Protéines 9,1 g
Sel 0,6 g`;

/* ───────────────────────── nutrition parsing ───────────────────────── */

test("parses per-100g nutrition values from a realistic French table", () => {
  const c = parseNutritionText(NUTRITION_PHOTO);
  assert.equal(c.energyKcal?.value, 400);
  assert.equal(c.saturatedFat?.value, 3.1);
  assert.equal(c.sugars?.value, 21);
  assert.equal(c.fat?.value, 16);
  assert.equal(c.fiber?.value, 7.8);
  assert.equal(c.proteins?.value, 9.1);
  assert.equal(c.salt?.value, 0.6);
});

test("'dont sucres/saturés' sub-lines win over their parent line", () => {
  const c = parseNutritionText("Matières grasses 16 g\ndont acides gras saturés 3,1 g\nGlucides 62 g\ndont sucres 21 g");
  assert.equal(c.saturatedFat?.value, 3.1);
  assert.equal(c.sugars?.value, 21);
  assert.equal(c.fat?.value, 16);
});

test("kJ-only energy converts to kcal; sodium converts to salt", () => {
  assert.equal(parseNutritionText("Énergie 2093 kJ").energyKcal?.value, 500.2);
  assert.equal(parseNutritionText("Sodium 0,4 g").salt?.value, 1);
});

test("unreadable / implausible values stay ABSENT (never invented or clamped)", () => {
  // 9000 kcal/100g is impossible → reported unreadable: line kept, value absent.
  const c = parseNutritionText("Énergie 9000 kcal\nSel g");
  assert.equal(c.energyKcal?.value, undefined);
  assert.ok(c.energyKcal?.sourceLine); // the misread line is preserved for the user
  assert.equal(c.salt, undefined);      // no number → not proposed at all
});

test("English labels parse too", () => {
  const c = parseNutritionText("Energy 400 kcal\nof which saturates 2 g\nof which sugars 10 g\nSalt 0.5 g");
  assert.equal(c.energyKcal?.value, 400);
  assert.equal(c.saturatedFat?.value, 2);
  assert.equal(c.sugars?.value, 10);
  assert.equal(c.salt?.value, 0.5);
});

/* ───────────────────────── ingredients parsing ───────────────────────── */

test("cleans an OCR'd ingredient block and detects additive codes", () => {
  const text = cleanIngredientsText("Ingrédients : farine de blé, sucre, émul-\nsifiant (E322), arôme, colorant E150d.");
  assert.ok(text.startsWith("farine de blé"));
  assert.ok(text.includes("émulsifiant")); // de-hyphenated
  assert.deepEqual(detectAdditiveCodes(text), ["e150d", "e322"]);
});

test("buildExtraction returns undefined for too-short / empty photos", () => {
  assert.equal(buildExtraction("nutrition", { text: "  ", confidence: 0 }), undefined);
  assert.equal(buildExtraction("ingredients", { text: "x", confidence: 10 }), undefined);
});

/* ───────────────────────── confirmation gating ───────────────────────── */

test("nothing is confirmed unless the user kept a usable value", () => {
  assert.equal(buildConfirmed("nutrition", { nutrition: {} }), null);
  assert.equal(buildConfirmed("nutrition", { nutrition: { sugars: undefined } }), null);
  assert.equal(buildConfirmed("ingredients", { ingredientsText: "   " }), null);
});

test("confirmation drops blank/negative/non-finite entries, never coerces to zero", () => {
  const c = buildConfirmed("nutrition", { nutrition: { sugars: 21, salt: -1, fat: NaN, proteins: 9 } });
  assert.deepEqual(c, { confirmed: true, nutrition: { sugars: 21, proteins: 9 } });
});

test("ingredients confirmation keeps only the trimmed text", () => {
  assert.deepEqual(buildConfirmed("ingredients", { ingredientsText: "  farine, sucre  " }),
    { confirmed: true, ingredientsText: "farine, sucre" });
});

/* ───────────────────────── score readiness ───────────────────────── */

test("score is NOT ready until all required fields are confirmed; missing is explicit", () => {
  const partial = buildConfirmed("nutrition", { nutrition: { energyKcal: 400, sugars: 21 } })!;
  const r = scoreReadiness(partial);
  assert.equal(r.ready, false);
  assert.deepEqual(r.missing.sort(), ["salt", "saturatedFat"].sort());
});

test("score IS ready once every required field is present", () => {
  const full = buildConfirmed("nutrition", { nutrition: { energyKcal: 400, sugars: 21, saturatedFat: 3.1, salt: 0.6 } })!;
  assert.deepEqual(scoreReadiness(full), { ready: true, missing: [] });
});

test("ingredients-only confirmation is never score-ready", () => {
  const ing = buildConfirmed("ingredients", { ingredientsText: "farine, sucre" })!;
  assert.deepEqual(scoreReadiness(ing).missing, REQUIRED_NUTRITION_FIELDS);
});

/* ───────────────────────── normalize → product → score ───────────────────────── */

test("buildOcrProduct flags origin user_ocr and writes only confirmed values", () => {
  const c = buildConfirmed("nutrition", { nutrition: { energyKcal: 400, sugars: 21, saturatedFat: 3.1, salt: 0.6 } })!;
  const p = buildOcrProduct(c, { barcode: "3017620422003", name: "Pâte à tartiner" });
  assert.equal(p.origin, "user_ocr");
  assert.equal(p.barcode, "3017620422003");
  assert.equal(p.nutriments.sugars, 21);
  assert.equal(p.nutriments.fiber, undefined); // absent stays absent
});

test("a full OCR product scores through the real engine; a partial one does not", () => {
  const full = buildConfirmed("nutrition", { nutrition: { energyKcal: 400, sugars: 21, saturatedFat: 3.1, salt: 0.6 } })!;
  assert.equal(scoreReadiness(full).ready, true);
  const product = buildOcrProduct(full, { name: "Test OCR" });
  product.ingredientsText = "farine, sucre"; // ingredient list present ⇒ scoreable
  const gree = computeGreeScore(product, { ...defaultPreferences });
  assert.equal(gree.status, "scored");

  const partial = buildConfirmed("nutrition", { nutrition: { energyKcal: 400, sugars: 21 } })!;
  assert.equal(scoreReadiness(partial).ready, false); // UI must block scoring here
});

/* ───────────────────────── session reducer ───────────────────────── */

test("reducer walks capture → adjust → extracting → review → result", () => {
  let s = initialOcrState("nutrition");
  assert.equal(s.step, "capture");
  s = reduceOcr(s, { type: "IMAGE_READY", imageUrl: "blob:x" });
  assert.equal(s.step, "adjust");
  assert.equal(s.imageUrl, "blob:x");
  s = reduceOcr(s, { type: "EXTRACT_START" });
  assert.equal(s.step, "extracting");
  const extraction: OcrExtraction = { kind: "nutrition", raw: { text: NUTRITION_PHOTO, confidence: 80 }, nutrition: {} };
  s = reduceOcr(s, { type: "EXTRACT_OK", extraction });
  assert.equal(s.step, "review");
  s = reduceOcr(s, { type: "CONFIRM", data: { confirmed: true, nutrition: { sugars: 21 } } });
  assert.equal(s.step, "result");
  assert.equal(s.confirmedData?.confirmed, true);
});

test("confirmedData is ONLY ever set by CONFIRM (never on extraction)", () => {
  let s = initialOcrState();
  s = reduceOcr(s, { type: "IMAGE_READY", imageUrl: "blob:x" });
  s = reduceOcr(s, { type: "EXTRACT_OK", extraction: { kind: "nutrition", raw: { text: "x", confidence: 1 }, nutrition: {} } });
  assert.equal(s.confirmedData, undefined); // review reached, but nothing confirmed
  s = reduceOcr(s, { type: "BACK_TO_REVIEW" });
  assert.equal(s.confirmedData, undefined);
});

test("EXTRACT_FAIL and RESET are handled; RESET keeps the chosen kind", () => {
  let s = reduceOcr(initialOcrState("ingredients"), { type: "EXTRACT_FAIL", failure: "no_text_found" });
  assert.equal(s.step, "failed");
  assert.equal(s.failure, "no_text_found");
  s = reduceOcr(s, { type: "RESET" });
  assert.equal(s.step, "capture");
  assert.equal(s.kind, "ingredients");
});

test("seedReviewValues proposes readable values and leaves unreadable blank", () => {
  const seeded = seedReviewValues({ sugars: { value: 21, sourceLine: "sucres 21 g" }, salt: { sourceLine: "sel g" } });
  assert.equal(seeded.sugars, 21);
  assert.equal("salt" in seeded, true);
  assert.equal(seeded.salt, undefined);
});

/* ───────────────────────── engine adapter (no real engine) ───────────────────────── */

test("runExtraction: no usable text → typed no_text_found (no throw)", async () => {
  const engine = async () => undefined;
  assert.deepEqual(await runExtraction(engine, new Blob(), "nutrition"), { ok: false, failure: "no_text_found" });
});

test("runExtraction: engine throwing → typed engine_error (never leaks)", async () => {
  const engine = async () => { throw new Error("wasm boom"); };
  assert.deepEqual(await runExtraction(engine, new Blob(), "nutrition"), { ok: false, failure: "engine_error" });
});

test("runExtraction: success passes the parsed extraction through", async () => {
  const raw: OcrRawResult = { text: NUTRITION_PHOTO, confidence: 82 };
  const engine = async () => buildExtraction("nutrition", raw);
  const r = await runExtraction(engine, new Blob(), "nutrition");
  assert.ok(r.ok && r.extraction.nutrition?.sugars?.value === 21);
});
