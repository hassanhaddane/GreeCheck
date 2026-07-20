# GreeImpact GI-1 — Environmental Methodology

> **Version: `GI-1.0.0`** (`GREE_IMPACT_VERSION`,
> `packages/domain/src/impact/types.ts`). Every result carries this version
> plus the provider's identity and methodology name.
>
> **Separation principle.** GreeImpact is the environmental assessment and is
> **always separate from GreeScore** (health). The impact engine does not
> import the scoring domain (test-enforced), and no combined number exists
> anywhere.

## 1. Source and adapter boundary

Primary provider: **Open Food Facts Green-Score** (formerly Eco-Score), via
the `environmental_score_*` fields (`environmental_score_score`,
`environmental_score_grade`, `environmental_score_data`; legacy `ecoscore_*`
accepted). The normalizer (`product/normalizer.ts → normalizeEnvironment`)
is the only code that understands the raw shape.

The engine consumes a provider-agnostic `EnvironmentalReading` through the
`EnvironmentalProvider` adapter (`impact/provider.ts`). Adding a future
provider (national LCA database, another scorer) means writing one pure
adapter — engine, types and UI are untouched. Adapters never fetch.

## 2. Output contract

`computeGreeImpact(product, provider?)` returns:

| Field | Meaning |
|---|---|
| `status` | `valid` \| `insufficient` |
| `score` / `grade` | Normalized 0–100 and A–E (present only when the source provided them) |
| `sourceScore` / `sourceGrade` | The provider's values **verbatim** — original and normalized always coexist |
| `confidence` | high / medium / low (see §4) |
| `provider` + `methodologyVersion` | Who assessed, with what method, and our GI version |
| `lifecycle` | `{ categoryScore, categoryLevel: true }` — Agribalyse category score, **flagged category-level** |
| `indicators` | Origins, packaging, production labels, threatened species, lifecycle — tone + code + verbatim source value |
| `environmentalLabels` | Official production labels backing the assessment |
| `missing` | Explicit missing-data reasons |
| `labelCode` | `impact_label_{low\|moderate\|high\|very_high\|insufficient}` |
| `insight` | Strength / weakness / alternative advice (§5) |

All user-facing content is stable i18n codes + params — never prose.

## 3. Honesty rules (hard constraints)

1. **No fabricated measurements.** The output contains no CO₂ kilograms, no
   water consumption, no transport distances — the fields do not exist, so
   they cannot be invented (test asserts their absence).
2. **Category ≠ product.** The Agribalyse lifecycle score is category-level;
   it is exposed only inside `lifecycle.categoryLevel: true` and its
   indicator code says so (`impact_lifecycle_category`). It is never merged
   into a product-specific claim.
3. **Missing is never rewarded** — and never punished: an unknown signal
   yields an `unknown`-tone indicator and a missing reason; a **known** zero
   (e.g. threatened-species value 0) yields `neutral`. The two are distinct
   by construction.
4. **Inadequate input ⇒ "insufficient environmental data"**: no grade, no
   score, empty insight, `impact_label_insufficient`, explicit reasons.
5. **Source preserved.** `sourceScore`/`sourceGrade`/indicator
   `sourceValue`s are verbatim; normalization only clamps/validates
   (e.g. source 112.4 → normalized 100, source kept at 112.4).
6. A score without a source grade may be *labeled* with the published
   Green-Score display bands (80/60/40/20) — a display band, never an
   invented measurement. A grade without a score never generates a score.

## 4. Confidence

| Level | Condition |
|---|---|
| high | score + grade + adjustments present, source status known, source declares nothing missing |
| medium | score or adjustments present, but signals missing / status unknown |
| low | grade-only (legacy cache) or equivalent minimal signal |

Every downgrade has a matching reason in `missing[]`
(`impact_missing_score`, `impact_missing_grade`,
`impact_missing_adjustments`, `impact_status_unknown`,
`impact_source_missing_signal {signal}`).

## 5. Actionable insight

Built **only from known signals**; if nothing is known, the insight is empty.

- **Strength** (best-known, by weight): certified production labels >
  favorable origins > zero-malus packaging > light category footprint.
- **Weakness** (clearest known): threatened species (uncertified palm oil —
  always dominant) > packaging malus > distant origins > heavy category
  footprint.
- **Advice** — which better alternative would improve the *verified* impact,
  mapped from the top weakness:
  | Weakness | Advice code |
  |---|---|
  | threatened species | `impact_advice_certified_alternative` (certified / palm-oil-free alternative) |
  | packaging | `impact_advice_packaging_alternative` (recyclable / lighter packaging) |
  | distant origins | `impact_advice_local_alternative` (closer origins) |
  | heavy category | `impact_advice_category_alternative` (lighter product type in the same aisle) |

## 6. Versioning

Any change to bands, indicator rules, insight weights or confidence
conditions is a new `GI-x.y.z`. Provider methodology changes (e.g.
Green-Score algorithm updates upstream) are carried by the provider metadata
and do not silently alter GreeCheck's interpretation rules.

## 7. Test coverage

`impact/engine.test.ts` + `impact/fixtures.ts` (fictional products, real OFF
payload shapes): complete/palm-oil/score-only/grade-only/nothing/status-
unknown/out-of-range fixtures; indicator tones incl. known-zero vs unknown;
insight selection and dominance; adapter fallback + third-party provider;
normalizer mapping (modern + legacy fields); absence-of-CO₂ assertion;
scoring-domain import ban; determinism.
