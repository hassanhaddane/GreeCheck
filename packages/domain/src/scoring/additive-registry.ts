/**
 * GreeCheck additive risk registry — versioned, curated, sourced.
 *
 * GOVERNANCE (docs/methodology/additives-governance.md):
 *  - Every entry carries: risk level, source references, review date, status.
 *  - Risk levels: none (0) · limited (−6) · moderate (−15) · high (−30 + final
 *    score capped at 49). Penalties are defined by the scoring methodology
 *    (methodology.ts), not here — this file only classifies.
 *  - Additives NOT in this registry are "unreviewed": deduction 0 (unknown is
 *    never treated as a risk NOR as a guarantee of safety) and surfaced as such.
 *  - This registry is GreeCheck's own curation of public scientific sources
 *    (EFSA, ANSES, IARC, peer-reviewed studies). It is NOT a copy of, and is
 *    not claimed to be identical to, Yuka's private/current classification.
 */

export const ADDITIVE_REGISTRY_VERSION = "AR-2026.07.0";

export type AdditiveRiskLevel = "none" | "limited" | "moderate" | "high";
export type AdditiveEntryStatus = "active" | "under_review" | "deprecated";

export interface AdditiveRegistryEntry {
  /** Lowercase E-number code, e.g. "e171". */
  code: string;
  risk: AdditiveRiskLevel;
  /** Public references supporting the classification. */
  sources: string[];
  /** Last editorial review (ISO date). */
  reviewedAt: string;
  status: AdditiveEntryStatus;
  /** Optional short note (why). */
  note?: string;
}

const D = "2026-07-20";
const EFSA_E171 = "EFSA Journal 2021;19(5):6585 — titanium dioxide no longer considered safe";
const ANSES_NITRITES = "ANSES Opinion 2022-SA-0106 — nitrites/nitrates & colorectal cancer risk";
const IARC_NITRITE = "IARC Monographs vol. 94 — ingested nitrate/nitrite (2A under specific conditions)";
const IARC_ASPARTAME = "IARC Monographs vol. 134 (2023) — aspartame classified 2B";
const IARC_BHA = "IARC Monographs vol. 40, suppl. 7 — BHA classified 2B";
const EU_AZO = "EU Reg. 1333/2008 Annex V — mandatory warning on activity/attention in children (azo dyes)";
const SOUTHAMPTON = "McCann et al., The Lancet 2007 (Southampton study) — colours & hyperactivity";
const EMULSIFIER_MICROBIOME = "Chassaing et al., Nature 2015 — emulsifiers, microbiota & intestinal inflammation";
const SWEETENER_CVD = "Debras et al., BMJ 2022 — artificial sweeteners & cardiovascular risk (NutriNet-Santé)";
const EFSA_SULFITES = "EFSA Journal 2022;20(11):7594 — sulfites re-evaluation, ADI concerns";
const EFSA_CARRAGEENAN = "EFSA Journal 2018;16(4):5238 — carrageenan re-evaluation, data gaps";
const EFSA_OK = "EFSA re-evaluation — no safety concern at reported uses";
const EFSA_PHOSPHATES = "EFSA Journal 2019;17(6):5674 — phosphates re-evaluation, exposure exceeds ADI for high consumers";

/** Entries are sorted by code. Non-exhaustive by design (see governance doc). */
export const ADDITIVE_REGISTRY: readonly AdditiveRegistryEntry[] = [
  /* ── colours ── */
  { code: "e100", risk: "none", sources: [EFSA_OK], reviewedAt: D, status: "active", note: "curcumin" },
  { code: "e101", risk: "none", sources: [EFSA_OK], reviewedAt: D, status: "active", note: "riboflavin" },
  { code: "e102", risk: "moderate", sources: [EU_AZO, SOUTHAMPTON], reviewedAt: D, status: "active", note: "tartrazine" },
  { code: "e104", risk: "moderate", sources: [EU_AZO, SOUTHAMPTON], reviewedAt: D, status: "active", note: "quinoline yellow" },
  { code: "e110", risk: "moderate", sources: [EU_AZO, SOUTHAMPTON], reviewedAt: D, status: "active", note: "sunset yellow" },
  { code: "e120", risk: "limited", sources: ["EFSA 2015 carmines re-evaluation — allergenicity reports"], reviewedAt: D, status: "active" },
  { code: "e122", risk: "moderate", sources: [EU_AZO, SOUTHAMPTON], reviewedAt: D, status: "active", note: "azorubine" },
  { code: "e124", risk: "moderate", sources: [EU_AZO, SOUTHAMPTON], reviewedAt: D, status: "active", note: "ponceau 4R" },
  { code: "e129", risk: "moderate", sources: [EU_AZO, SOUTHAMPTON], reviewedAt: D, status: "active", note: "allura red" },
  { code: "e150d", risk: "limited", sources: ["EFSA 2011 caramel colours — 4-MEI exposure below concern at typical intake"], reviewedAt: D, status: "active" },
  { code: "e155", risk: "moderate", sources: [EU_AZO], reviewedAt: D, status: "active", note: "brown HT" },
  { code: "e160a", risk: "none", sources: [EFSA_OK], reviewedAt: D, status: "active", note: "carotenes" },
  { code: "e160c", risk: "none", sources: [EFSA_OK], reviewedAt: D, status: "active", note: "paprika extract" },
  { code: "e162", risk: "none", sources: [EFSA_OK], reviewedAt: D, status: "active", note: "beetroot red" },
  { code: "e163", risk: "none", sources: [EFSA_OK], reviewedAt: D, status: "active", note: "anthocyanins" },
  { code: "e171", risk: "high", sources: [EFSA_E171, "EU Reg. 2022/63 — E171 banned in food in the EU"], reviewedAt: D, status: "active", note: "titanium dioxide" },

  /* ── preservatives ── */
  { code: "e200", risk: "limited", sources: ["EFSA 2015 sorbic acid re-evaluation"], reviewedAt: D, status: "active" },
  { code: "e202", risk: "limited", sources: ["EFSA 2015 sorbates re-evaluation"], reviewedAt: D, status: "active" },
  { code: "e211", risk: "moderate", sources: ["EFSA 2016 benzoates re-evaluation", "benzene formation with E300 in beverages"], reviewedAt: D, status: "active", note: "sodium benzoate" },
  { code: "e220", risk: "moderate", sources: [EFSA_SULFITES], reviewedAt: D, status: "active", note: "sulfur dioxide" },
  { code: "e221", risk: "moderate", sources: [EFSA_SULFITES], reviewedAt: D, status: "active" },
  { code: "e222", risk: "moderate", sources: [EFSA_SULFITES], reviewedAt: D, status: "active" },
  { code: "e223", risk: "moderate", sources: [EFSA_SULFITES], reviewedAt: D, status: "active" },
  { code: "e224", risk: "moderate", sources: [EFSA_SULFITES], reviewedAt: D, status: "active" },
  { code: "e228", risk: "moderate", sources: [EFSA_SULFITES], reviewedAt: D, status: "active" },
  { code: "e249", risk: "high", sources: [ANSES_NITRITES, IARC_NITRITE], reviewedAt: D, status: "active", note: "potassium nitrite" },
  { code: "e250", risk: "high", sources: [ANSES_NITRITES, IARC_NITRITE], reviewedAt: D, status: "active", note: "sodium nitrite" },
  { code: "e251", risk: "moderate", sources: [ANSES_NITRITES, IARC_NITRITE], reviewedAt: D, status: "active", note: "sodium nitrate" },
  { code: "e252", risk: "moderate", sources: [ANSES_NITRITES, IARC_NITRITE], reviewedAt: D, status: "active", note: "potassium nitrate" },

  /* ── antioxidants ── */
  { code: "e300", risk: "none", sources: [EFSA_OK], reviewedAt: D, status: "active", note: "ascorbic acid" },
  { code: "e306", risk: "none", sources: [EFSA_OK], reviewedAt: D, status: "active", note: "tocopherols" },
  { code: "e320", risk: "moderate", sources: [IARC_BHA, "EFSA 2011 BHA re-evaluation"], reviewedAt: D, status: "active", note: "BHA" },
  { code: "e321", risk: "moderate", sources: ["EFSA 2012 BHT re-evaluation — narrow margin for high consumers"], reviewedAt: D, status: "active", note: "BHT" },
  { code: "e330", risk: "none", sources: [EFSA_OK], reviewedAt: D, status: "active", note: "citric acid" },
  { code: "e331", risk: "none", sources: [EFSA_OK], reviewedAt: D, status: "active" },
  { code: "e338", risk: "limited", sources: [EFSA_PHOSPHATES], reviewedAt: D, status: "active", note: "phosphoric acid" },
  { code: "e450", risk: "limited", sources: [EFSA_PHOSPHATES], reviewedAt: D, status: "active", note: "diphosphates" },
  { code: "e451", risk: "limited", sources: [EFSA_PHOSPHATES], reviewedAt: D, status: "active" },
  { code: "e452", risk: "limited", sources: [EFSA_PHOSPHATES], reviewedAt: D, status: "active" },

  /* ── texture / emulsifiers ── */
  { code: "e322", risk: "none", sources: [EFSA_OK], reviewedAt: D, status: "active", note: "lecithins" },
  { code: "e406", risk: "none", sources: [EFSA_OK], reviewedAt: D, status: "active", note: "agar" },
  { code: "e407", risk: "moderate", sources: [EFSA_CARRAGEENAN, EMULSIFIER_MICROBIOME], reviewedAt: D, status: "active", note: "carrageenan" },
  { code: "e410", risk: "none", sources: [EFSA_OK], reviewedAt: D, status: "active", note: "locust bean gum" },
  { code: "e415", risk: "none", sources: [EFSA_OK], reviewedAt: D, status: "active", note: "xanthan gum" },
  { code: "e433", risk: "moderate", sources: [EMULSIFIER_MICROBIOME], reviewedAt: D, status: "active", note: "polysorbate 80" },
  { code: "e435", risk: "moderate", sources: [EMULSIFIER_MICROBIOME], reviewedAt: D, status: "active", note: "polysorbate 60" },
  { code: "e440", risk: "none", sources: [EFSA_OK], reviewedAt: D, status: "active", note: "pectins" },
  { code: "e466", risk: "moderate", sources: [EMULSIFIER_MICROBIOME, "Chassaing et al., Gastroenterology 2022 — CMC RCT"], reviewedAt: D, status: "active", note: "carboxymethylcellulose" },
  { code: "e471", risk: "limited", sources: ["EFSA 2017 mono-/diglycerides re-evaluation", EMULSIFIER_MICROBIOME], reviewedAt: D, status: "active" },

  /* ── flavour enhancers & sweeteners ── */
  { code: "e621", risk: "limited", sources: ["EFSA 2017 glutamates re-evaluation — ADI exceeded for some groups"], reviewedAt: D, status: "active", note: "MSG" },
  { code: "e950", risk: "limited", sources: [SWEETENER_CVD, "EFSA 2000 acesulfame-K evaluation"], reviewedAt: D, status: "active", note: "acesulfame K" },
  { code: "e951", risk: "moderate", sources: [IARC_ASPARTAME, SWEETENER_CVD], reviewedAt: D, status: "active", note: "aspartame" },
  { code: "e952", risk: "moderate", sources: ["EFSA cyclamates — historical carcinogenicity debate, US ban maintained"], reviewedAt: D, status: "active", note: "cyclamates" },
  { code: "e954", risk: "limited", sources: ["EFSA 2019 saccharin — no concern at ADI", SWEETENER_CVD], reviewedAt: D, status: "active", note: "saccharin" },
  { code: "e955", risk: "limited", sources: [SWEETENER_CVD, "Suez et al., Cell 2022 — sucralose & glycemic response"], reviewedAt: D, status: "active", note: "sucralose" },

  /* ── raising / misc, no concern ── */
  { code: "e170", risk: "none", sources: [EFSA_OK], reviewedAt: D, status: "active", note: "calcium carbonate" },
  { code: "e500", risk: "none", sources: [EFSA_OK], reviewedAt: D, status: "active", note: "sodium carbonates" },
  { code: "e501", risk: "none", sources: [EFSA_OK], reviewedAt: D, status: "active" },
  { code: "e503", risk: "none", sources: [EFSA_OK], reviewedAt: D, status: "active" }
] as const;

const INDEX: ReadonlyMap<string, AdditiveRegistryEntry> = new Map(
  ADDITIVE_REGISTRY.map((e) => [e.code, e])
);

export interface AdditiveLookup {
  code: string;
  entry?: AdditiveRegistryEntry;
  /** Risk if reviewed; "unreviewed" additives get no deduction and no praise. */
  risk: AdditiveRiskLevel | "unreviewed";
}

/**
 * Normalize an OFF additive tag. Class letters a–d are MEANINGFUL and kept
 * ("en:e150d" → "e150d"); roman sub-forms are stripped ("en:e330i" → "e330",
 * "en:e450iii" → "e450").
 */
export function normalizeAdditiveCode(raw: string): string {
  const bare = raw.toLowerCase().trim().replace(/^[a-z]{2,3}:/, "");
  const m = bare.match(/^(e\d+)([a-d])?(?:i{1,3}|iv|v)?$/);
  if (!m) return bare;
  return m[1] + (m[2] ?? "");
}

export function lookupAdditive(raw: string): AdditiveLookup {
  const code = normalizeAdditiveCode(raw);
  const entry = INDEX.get(code);
  return { code, entry, risk: entry ? entry.risk : "unreviewed" };
}
