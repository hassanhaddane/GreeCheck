/**
 * GreeScore GS-2 methodology constants — the versioned contract.
 * Full specification: docs/methodology/gree-score-v2.md.
 *
 * Alignment: structure follows the PUBLICLY DOCUMENTED Yuka food formula as
 * of June 2026 (help.yuka.io — "How are food products rated?", retrieved
 * 2026-07-20). GreeCheck's additive registry and editorial choices are its
 * own; no claim of identity with Yuka's private/current data is made.
 */

export const METHODOLOGY_VERSION = "GS-2.0.0";

/** Component maxima (points of the 0–100 global score). */
export const COMPONENT_MAX = { nutrition: 60, additives: 30, organic: 10 } as const;

/** Per-additive deductions from the 30-point additive component. */
export const ADDITIVE_DEDUCTION = { none: 0, limited: 6, moderate: 15, high: 30 } as const;

/** A high-risk additive caps the FINAL global score. */
export const HIGH_RISK_CAP = 49;

/** Organic bonus requires a verified official certification (organic.ts). */
export const ORGANIC_BONUS = 10;

/** Qualitative label bands over the global score. */
export const LABEL_BANDS = [
  { min: 75, label: "excellent" },
  { min: 50, label: "good" },
  { min: 25, label: "poor" },
  { min: 0, label: "bad" }
] as const;

/** UI grade bands (unchanged from V1 — consumed by existing components). */
export const GRADE_BANDS = [
  { min: 80, grade: "A" },
  { min: 65, grade: "B" },
  { min: 45, grade: "C" },
  { min: 25, grade: "D" },
  { min: 0, grade: "E" }
] as const;

/** Neutral placeholders carried by unscored results for legacy consumers. */
export const UNSCORED_PLACEHOLDER = { global: 50, grade: "C" } as const;
