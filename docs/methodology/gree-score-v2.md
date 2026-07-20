# GreeScore GS-2 — Methodology

> **Version: `GS-2.0.0`** (constant `METHODOLOGY_VERSION`,
> `packages/domain/src/scoring/methodology.ts`). Every score result carries
> this version plus the additive registry version. Any change to a number in
> this document is a new methodology version.
>
> **Alignment & attribution.** The structure follows the **publicly
> documented** Yuka food scoring method as of June 2026 (help.yuka.io,
> retrieved 2026-07-20 — see Sources). GreeCheck's additive registry,
> category detection and editorial choices are its own; **no claim is made
> that results match Yuka's** private or current data.

## 1. General formula (0–100)

| Component | Max | Source |
|---|---|---|
| Nutrition | **60** | Original Nutri-Score raw points → published correspondence table → ×0.6 |
| Additives | **30** | Per-additive deductions from the versioned registry (floor 0) |
| Organic | **10** | Verified official organic certification only |

**High-risk additive rule:** if any additive classified *high* is present, it
deducts 30 from the additive component **and** the final global score is
capped at **49/100** (`cappedByHighRiskAdditive` is true when the cap
actually constrained the total; the `highRiskAdditiveCap` reason is emitted
whenever the rule is armed).

Grades A ≥ 80 · B ≥ 65 · C ≥ 45 · D ≥ 25 · E < 25 (UI bands, unchanged from
V1). Qualitative labels: excellent ≥ 75 · good ≥ 50 · poor ≥ 25 · bad < 25.

## 2. Nutrition component (60 pts)

### 2.1 Raw points

Original (2017) Nutri-Score points, in strict priority order:

1. **Provider points** — Open Food Facts `nutriscore_score`
   (`Product.nutriScorePoints`). When raw points are available, the letter is
   **never** used.
2. **Computed points** — from the nutrition facts per the original
   algorithm (`nutrition.ts`): negative points for energy (kJ =
   kcal × 4.184), sugars, saturated fat, sodium (salt × 1000 / 2.5), positive
   points for fiber and protein. Beverages use the beverage tables.
   *Protein rule:* when negative points ≥ 11, protein points are not counted
   (fruit/vegetable points are conservatively 0 — not modeled — so the
   exception that would re-enable them cannot trigger; this is the
   conservative reading, never the generous one).
   *Required facts:* energy, sugars, saturated fat, salt. Fiber and protein
   missing count as **zero** (an unknown is never a bonus) and are reported
   in `conservativeZeros` + confidence reasons.
3. **Grade fallback** — only when facts are partially present AND an official
   Nutri-Score letter exists: a documented representative point per grade
   band (solid: A −2 · B 1 · C 7 · D 15 · E 20; beverage: A −4 · B 0 · C 4 ·
   D 8 · E 12). Confidence is capped at *medium* and the
   `nutrition_points_fallback` reason is added.

Otherwise the product is **unscored** (`missing_nutrition_data`, with the
missing field list).

### 2.2 Published correspondence table (points → /100)

Transcribed verbatim from the published table (Yuka help, image retrieved
2026-07-20):

| Points | Solid | Liquid | | Points | Solid | Liquid |
|---|---|---|---|---|---|---|
| ≤ −4 | 100 | 80 | | 8 | 40 | 7 |
| −3 | 100 | 77 | | 9 | 35 | 3 |
| −2 | 100 | 74 | | 10 | 30 | 0 |
| −1 | 90 | 71 | | 11 | 15 | 0 |
| 0 | 80 | 68 | | 12 | 13 | 0 |
| 1 | 75 | 65 | | 13 | 11 | 0 |
| 2 | 70 | 57 | | 14 | 9 | 0 |
| 3 | 65 | 49 | | 15 | 7 | 0 |
| 4 | 60 | 41 | | 16 | 5 | 0 |
| 5 | 55 | 33 | | 17 | 3 | 0 |
| 6 | 50 | 15 | | 18 | 1 | 0 |
| 7 | 45 | 11 | | ≥ 19 | 0 | 0 |

Only **water** reaches 100 among beverages (original grading: water is the
only grade-A liquid). Solid D-grade products max out at 15/100 nutrition ⇒
9/60 ⇒ with 30 + 10 a D/E product cannot exceed 49 — the table encodes the
published "D/E never above 49" property.

### 2.3 Solid vs beverage

Category-tag based (`categories.ts`): beverage tags (sodas, juices, iced
teas, plant drinks, waters…) use the liquid column; milk, drinkable yogurts
and soups are solids per the original algorithm. Water categories set
`isWater`. Detection never reads marketing wording.

## 3. Additives component (30 pts)

Deductions per additive found (`Product.additives`, normalized E-numbers —
class letters a–d preserved, roman sub-forms stripped):

| Registry risk | Deduction |
|---|---|
| none | 0 |
| limited | −6 |
| moderate | −15 |
| high | −30 **+ final cap 49** |
| *unreviewed* (not in registry) | 0 — surfaced as "not yet reviewed", never treated as risky **or** safe |

Component floor is 0. The registry is versioned and governed separately —
see `additives-governance.md`.

## 4. Organic component (10 pts)

+10 only for a **verified official** national/international organic
certification present in the product's label tags (EU Organic, AB
Agriculture Biologique, USDA Organic, Canada Organic, Soil Association,
Naturland, Demeter, Bio Suisse, ES/IT equivalents — exact-tag match,
`organic.ts`). Marketing wording ("naturel", "bio-inspiré", brand names)
never counts. Note: with a high-risk additive present, the cap keeps any
organic product at ≤ 49 — organic never rescues a risky product.

## 5. Unscored results (typed, never a fake grade)

`status: "unscored"` with a typed reason; numeric legacy fields carry a
neutral placeholder (50/C) **only** for pre-V2 UI compatibility — V2 surfaces
must branch on `status`.

| Reason code | Trigger |
|---|---|
| `excluded_alcohol`, `excluded_pure_sugar`, `excluded_infant_formula`, `excluded_protein_supplement`, `excluded_dietary_supplement`, `excluded_pet_food` | Excluded categories — no rating method exists (published exclusion list) |
| `unsupported_special_category_salt` / `_chocolate` | See §6 |
| `missing_nutrition_data` | Required facts absent and no fallback path |
| `missing_ingredients_data` | No exploitable ingredient list (an unknown list is **not** "no additives") |

Unknown data is never positive, and never negative either: unscored is a
distinct state, not a bad grade. Compatibility alerts (allergens, halal) are
still computed for unscored products — they concern the person, not the
score.

## 6. Special categories — deliberately unsupported

Yuka publishes **special weightings** for salts (50/30/10/10 with unrefined
and sea-salt bonuses) and chocolates (35/25/20/10/10 with a cocoa-percentage
curve). GreeCheck does not implement them in GS-2.0.0:

- **Salt** requires *extraction* (sea/mine) and *refinement* data that our
  normalized model does not carry; scoring without it would mean inventing
  inputs.
- **Chocolate**: the component weights are public but the exact
  cocoa-percentage → points mapping is **not** published; implementing it
  would mean inventing the curve.

Per the "never invent missing mappings" rule, both return
`unsupported_special_category_*`. They become supportable when the required
data/mappings can be sourced and tested (tracked for a future GS-2.x).

## 7. Output contract

Every result exposes: `status` · `global` (score) · `grade` · `labelCode` ·
`verdict` · `methodologyVersion` · `registryVersion` · `components`
(nutrition points/source/kind/score100/contribution + per-additive
deductions + organic certification) · `cappedByHighRiskAdditive` ·
`confidence` + `confidenceReasons` (data confidence — reduced by fallback
paths, **never** moving the score) · `unscored` reason ·
ranked `topPositives`/`topNegatives` and full `reasons`/`warnings`/`alerts`
(i18n codes + params — deterministic explanation contracts, translated by
the UI). `explainScore()` yields 1–2 plain-language sentence codes.

User criteria (goalFit) and halal remain display/alert channels: they can
change the *verdict* shown, never the 0–100 score.

## 8. Sources

- help.yuka.io — "How are food products rated?" (modified 2026-06-29)
- help.yuka.io — "How is the Nutri-Score used to obtain the Yuka rating?"
  (modified 2026-06-19; correspondence table image)
- help.yuka.io — "Why are some food products not rated?" (modified 2026-06-01)
- help.yuka.io — "How are salts rated?" / "How are the chocolates rated?"
- Santé publique France — Nutri-Score original (2017) algorithm.

Retrieved 2026-07-20. GreeCheck implements the *published* structure with its
own registry and editorial decisions; no identity with Yuka's private or
current data is claimed.
