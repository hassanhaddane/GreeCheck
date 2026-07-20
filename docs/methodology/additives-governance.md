# GreeCheck Additive Registry — Governance

> Registry: `packages/domain/src/scoring/additive-registry.ts`
> Current version: **`AR-2026.07.0`** (`ADDITIVE_REGISTRY_VERSION`).
> Every GreeScore result embeds the registry version used.

## 1. What the registry is — and is not

The registry is **GreeCheck's own curation** of public scientific sources.
It is **not** a copy of, and is never claimed to be identical to, Yuka's
private or current classification, nor to any other app's list. Only the
*penalty structure* (none 0 · limited −6 · moderate −15 · high −30 + cap 49)
follows the publicly documented methodology; the classification of each
E-number is GreeCheck editorial work under the rules below.

## 2. Entry contract (machine-enforced)

Every entry MUST carry — enforced by `additive-registry.test.ts`:

| Field | Rule |
|---|---|
| `code` | lowercase E-number, class letters a–d preserved (`e150d`), no duplicates |
| `risk` | `none` \| `limited` \| `moderate` \| `high` |
| `sources` | ≥ 1 public reference (EFSA/ANSES/IARC opinion, EU regulation, peer-reviewed study) — substantial, not a bare URL stub |
| `reviewedAt` | ISO date of last editorial review |
| `status` | `active` \| `under_review` \| `deprecated` |
| `note` | optional plain-language identifier ("tartrazine") |

## 3. Classification principles

1. **Public evidence only.** EFSA re-evaluations, ANSES opinions, IARC
   monographs, EU regulations (e.g. the azo-dye warning of Reg. 1333/2008
   Annex V; the E171 food ban of Reg. 2022/63), and peer-reviewed studies
   (e.g. Southampton 2007; Chassaing 2015/2022; Debras BMJ 2022).
2. **`high` is reserved** for additives with a regulatory ban/withdrawal in a
   major jurisdiction or a strong carcinogenicity/toxicity signal endorsed by
   a public agency (e.g. nitrites E249/E250 — ANSES 2022 + IARC; titanium
   dioxide E171 — EFSA 2021 + EU ban). `high` triggers the 49 cap: the bar
   for adding one is deliberately high, and each needs at least one
   agency-level source.
3. **Absence ≠ safety.** An additive not present in the registry is
   `unreviewed`: zero deduction, zero endorsement, surfaced to the user as
   "not yet reviewed". Unknown is never treated as a risk **nor** as a
   guarantee.
4. **No commercial input.** No brand, manufacturer or commercial partner can
   propose, veto or influence a classification (constitution — independence
   charter).

## 4. Change process

1. Any risk-level change, addition or removal requires: the new source(s),
   an updated `reviewedAt`, and a **registry version bump**
   (`AR-YYYY.MM.patch`).
2. Downgrades or removals are done via `status: "deprecated"` for one
   version before deletion, so cached explanations stay resolvable.
3. Contested entries pending re-review are marked `under_review` (their
   current risk still applies until changed).
4. Every change updates the public methodology page in the same release, and
   the regression tests pin known classifications (nitrite high, aspartame
   moderate, MSG limited, citric acid none) so silent drift fails CI.
5. Corrections follow the constitution's corrections channel: anyone —
   users and brands alike — can report an error with sources; the review
   outcome is published. Nothing is ever changed for a single product's
   score.

## 5. Review cadence

Full registry review at least every 6 months (next due 2027-01), plus
immediate review when EFSA/ANSES/IARC publish a new relevant opinion. The
review date of each entry is individually tracked (`reviewedAt`).

## 6. Current coverage

~60 additives across colours, preservatives, antioxidants, phosphates,
emulsifiers/texture agents, flavour enhancers and sweeteners — the additives
most frequent in FR retail food. Coverage is intentionally non-exhaustive:
expanding it is registry work (new sourced entries), never engine work.
