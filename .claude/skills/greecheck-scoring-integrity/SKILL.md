---
name: greecheck-scoring-integrity
description: >
  Protects the GreeScore engine: the versioned formula, weights, additive risk registry,
  missing-data behavior, safeguard caps, verdicts and score explanations. Use this skill
  BEFORE touching anything in src/domains/scoring/ (gree-score.ts, thresholds.ts,
  detectors.ts, types.ts), any code that consumes GreeScore output (VerdictCard, TrustHalo,
  GreeScoreRing, GreeDNA, GreeSwap, Battle, GreeCart engines), or any request like
  "tweak the score", "why is this product rated X", "add a criterion to the score",
  or "penalize products without data".
---

# GreeCheck Scoring Integrity

GreeScore is a deterministic, transparent, testable pure-TS engine
(`src/domains/scoring/gree-score.ts`). Same input → same output. Every point
must be explainable. The formula header comment in `gree-score.ts` is the
documented contract — keep code, comment and `/methodology` page in sync.

## The contract (current values — verify in code before relying on them)

- Weighted mean over **available** buckets, weights renormalized:
  nutrition 40 · processing 25 · additives 15 · naturality 10 · environment 10 ·
  goalFit 10.
- Nutri-Score is authoritative when present (A95 B80 C60 D35 E15); nutrient
  facts then only explain — **no double penalty** with sugar/transformation.
- NOVA: 1→100, 2→78, 3→45, 4→12. Unknown NOVA → bucket ABSENT, not penalized.
- Additives bucket starts at 100; −16 avoid / −9 controversial / −4 watch /
  −1.5 other; palm oil −10. Unknown ingredients → bucket ABSENT.
- **Safeguard cap:** NOVA 4 + nutrition ≤ 35 ⇒ global capped at 49, with an
  emitted transparency reason. Bio never rescues an ultra-processed junk product.
- Grades: A ≥ 80 · B ≥ 65 · C ≥ 45 · D ≥ 25 · E < 25.
- Halal is **compatibility only** (detectors.ts) — excluded from goalFit and
  from the health score in both directions.
- Missing data reduces **confidence** (Trust Halo, from `computeDataQuality`),
  never the health score. `insufficient_data` is a verdict, not a bad grade.

## Mandatory principles

1. **Determinism & purity.** No I/O, no randomness, no Date.now, no React in
   the engine. Category thresholds (`thresholds.ts`) stay the single source of
   truth shared with filters and GreeCart.
2. **Version every formula change.** Any change to weights, bands, additive
   registry or caps is a scoring-version change: update the contract comment,
   the methodology page content, and the tests in `gree-score.test.ts` together.
3. **Explainability.** Every adjustment must emit a `ScoreReason`; if you can't
   phrase the reason for a user, don't add the rule.
4. **Additive registry is curated.** `ADDITIVE_RISK` entries need a defensible
   classification; `additiveSeverityOf` stays the shared classifier for scoring
   AND UI — never fork a second table.
5. **Tests are the spec.** Run `npm test` (Windows note: run via `/tmp` tsx per
   repo tooling memory). A formula change without updated assertions is
   incomplete.

## Forbidden behaviors

- Treating unknown (NOVA, ingredients, halal, allergens) as negative or as zero.
- Double-penalizing: re-deducting sugar/salt when Nutri-Score already set the base.
- Letting organic/naturality lift a NOVA-4 + poor-nutrition product past the 49 cap.
- Making halal, price, brand or popularity move the health score.
- Silently changing thresholds/weights without touching tests + methodology.
- Rounding or clamping in UI components — the engine emits final numbers.

## Examples

**Request:** "Products with no ingredient list should score lower."
**Do:** Leave score buckets ABSENT; lower `dataQuality`/confidence so Trust Halo
shows "Données partielles". Never deduct health points for missing data.

**Request:** "Add E466 as dangerous."
**Do:** It's already `watch`. Reclassifying requires justification, a registry
update, matching test assertions, and methodology page alignment.

**Request:** "This organic cereal scores 47, users complain."
**Do:** Explain via emitted reasons (likely NOVA-4 cap). Don't add a bio boost.

## Acceptance criteria

- [ ] Engine remains pure and deterministic; contract comment matches code.
- [ ] No unknown-data penalty anywhere; confidence path used instead.
- [ ] Safeguard cap and no-double-penalty rules intact (covered by tests).
- [ ] Halal still excluded from health score and goalFit.
- [ ] `gree-score.test.ts` updated and passing; downstream engines (swap,
      battle, cart what-if) re-tested if score outputs shifted.
