/**
 * OCR text parsing — pure, deterministic, defensive.
 *
 * Honesty rules: a value is proposed ONLY when a keyword and a plausible
 * number were both read on the same line; anything unreadable or implausible
 * stays absent. The source line is kept so the user can verify each value
 * against their own photo during review.
 */
import type { NutritionCandidates, NutritionFieldKey, OcrExtraction, OcrKind, OcrRawResult } from "./model";

/* ── shared helpers ── */

const num = (s: string): number | undefined => {
  const v = Number(s.replace(",", "."));
  return Number.isFinite(v) ? v : undefined;
};

/** Plausibility bounds per 100 g — outside means misread ⇒ absent, not "fixed". */
const BOUNDS: Record<NutritionFieldKey, [number, number]> = {
  energyKcal: [0, 950],
  fat: [0, 100],
  saturatedFat: [0, 100],
  sugars: [0, 100],
  fiber: [0, 60],
  proteins: [0, 100],
  salt: [0, 40]
};

function plausible(key: NutritionFieldKey, value: number): boolean {
  const [lo, hi] = BOUNDS[key];
  return value >= lo && value <= hi;
}

/* ── nutrition table (fr/en labels) ── */

const NUMBER = "(\\d{1,4}(?:[.,]\\d{1,2})?)";

interface FieldPattern {
  key: NutritionFieldKey;
  re: RegExp;
  /** Optional transform of the captured number (e.g. kJ → kcal, sodium → salt). */
  map?: (v: number) => number;
}

/** Ordered: more specific lines ("dont…") must win over their parent line. */
const NUTRITION_PATTERNS: FieldPattern[] = [
  { key: "saturatedFat", re: new RegExp(`(?:dont\\s+)?(?:acides\\s+gras\\s+)?satur[ée]s?[^\\d]{0,12}${NUMBER}\\s*g`, "i") },
  { key: "saturatedFat", re: new RegExp(`(?:of\\s+which\\s+)?saturate(?:d(?:\\s+fat)?|s)[^\\d]{0,12}${NUMBER}\\s*g`, "i") },
  { key: "sugars", re: new RegExp(`(?:dont\\s+)?sucres?[^\\d]{0,12}${NUMBER}\\s*g`, "i") },
  { key: "sugars", re: new RegExp(`(?:of\\s+which\\s+)?sugars?[^\\d]{0,12}${NUMBER}\\s*g`, "i") },
  { key: "fat", re: new RegExp(`mati[èe]res?\\s+grasses?[^\\d]{0,12}${NUMBER}\\s*g`, "i") },
  { key: "fat", re: new RegExp(`(?:total\\s+)?fat[^\\d]{0,12}${NUMBER}\\s*g`, "i") },
  { key: "fiber", re: new RegExp(`fibres?(?:\\s+alimentaires?)?[^\\d]{0,12}${NUMBER}\\s*g`, "i") },
  { key: "fiber", re: new RegExp(`fibers?|dietary\\s+fibre[^\\d]{0,12}${NUMBER}\\s*g`, "i") },
  { key: "proteins", re: new RegExp(`prot[ée]ines?[^\\d]{0,12}${NUMBER}\\s*g`, "i") },
  { key: "proteins", re: new RegExp(`proteins?[^\\d]{0,12}${NUMBER}\\s*g`, "i") },
  { key: "salt", re: new RegExp(`sel[^\\d]{0,12}${NUMBER}\\s*g`, "i") },
  { key: "salt", re: new RegExp(`salt[^\\d]{0,12}${NUMBER}\\s*g`, "i") },
  { key: "salt", re: new RegExp(`sodium[^\\d]{0,12}${NUMBER}\\s*g`, "i"), map: (v) => v * 2.5 },
  { key: "energyKcal", re: new RegExp(`${NUMBER}\\s*kcal`, "i") },
  { key: "energyKcal", re: new RegExp(`${NUMBER}\\s*kj`, "i"), map: (v) => v / 4.184 }
];

export function parseNutritionText(text: string): NutritionCandidates {
  const out: NutritionCandidates = {};
  const lines = text.split(/\n+/).map((l) => l.trim()).filter(Boolean);
  for (const line of lines) {
    for (const { key, re, map } of NUTRITION_PATTERNS) {
      if (out[key]?.value !== undefined) continue; // first (most specific) hit wins
      const m = line.match(re);
      if (!m) continue;
      const raw = num(m[1]);
      if (raw === undefined) continue;
      const value = Math.round((map ? map(raw) : raw) * 10) / 10;
      // Implausible reads are reported as unreadable (line kept, value absent).
      out[key] = plausible(key, value) ? { value, sourceLine: line } : { sourceLine: line };
    }
  }
  return out;
}

/* ── ingredient list ── */

/** Clean an OCR'd ingredient block: join wraps, fix hyphenation, strip label. */
export function cleanIngredientsText(text: string): string {
  return text
    .replace(/-\n/g, "")            // hyphenated line wraps
    .replace(/\n+/g, " ")           // single paragraph
    .replace(/\s{2,}/g, " ")
    .replace(/^\s*ingr[ée]dients?\s*:?\s*/i, "")
    .trim();
}

/** Detect additive codes in confirmed/candidate ingredient text (E100–E1999). */
export function detectAdditiveCodes(text: string): string[] {
  const codes = new Set<string>();
  for (const m of text.matchAll(/\bE\s?(\d{3,4}[a-e]?)\b/gi)) {
    codes.add(`e${m[1].toLowerCase()}`);
  }
  return [...codes].sort();
}

/* ── entry point ── */

const MIN_TEXT_LENGTH = 12;

/** Build the review proposal, or undefined when the photo yielded no usable text. */
export function buildExtraction(kind: OcrKind, raw: OcrRawResult): OcrExtraction | undefined {
  if (raw.text.trim().length < MIN_TEXT_LENGTH) return undefined;
  if (kind === "ingredients") {
    const ingredientsText = cleanIngredientsText(raw.text);
    if (ingredientsText.length < MIN_TEXT_LENGTH) return undefined;
    return { kind, raw, ingredientsText, detectedAdditives: detectAdditiveCodes(ingredientsText) };
  }
  const nutrition = parseNutritionText(raw.text);
  return { kind, raw, nutrition };
}
