/**
 * Organic certification detection (10 % of GreeScore GS-2).
 *
 * The +10 bonus requires a VERIFIED official organic certification label —
 * never marketing wording ("naturel", "bio-inspired", brand names…), never
 * the product name, never ingredients text. Detection is limited to official
 * label tags provided by Open Food Facts (cleaned by the normalizer:
 * "en:eu-organic" → "eu organic").
 */

export interface OrganicCertification {
  certified: boolean;
  /** The matched official label (cleaned tag), when certified. */
  label?: string;
}

/** Official national/international organic certifications (cleaned tags). */
const OFFICIAL_ORGANIC_LABELS = [
  "eu organic",                 // EU leaf — Reg. (EU) 2018/848
  "organic",                    // OFF parent tag, set from official labelling
  "ab agriculture biologique",  // France AB
  "agriculture biologique",
  "usda organic",               // USA — 7 CFR Part 205
  "canada organic",
  "soil association organic",   // UK
  "naturland",                  // DE (certifier)
  "demeter",                    // biodynamic certification
  "bio suisse",
  "agricultura ecologica",      // ES
  "agricoltura biologica"       // IT
] as const;

export function organicCertificationOf(labels: string[] | undefined): OrganicCertification {
  if (!labels?.length) return { certified: false };
  const cleaned = labels.map((l) => l.toLowerCase().trim());
  /* EXACT tag equality only — OFF label tags are canonical, and substring
     matching ("non organic", "organic style") must never certify */
  const label = cleaned.find((l) => (OFFICIAL_ORGANIC_LABELS as readonly string[]).includes(l));
  return label ? { certified: true, label } : { certified: false };
}
