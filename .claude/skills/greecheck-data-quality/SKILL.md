---
name: greecheck-data-quality
description: >
  Enforces data provenance and honesty for GreeCheck: Open Food Facts normalization,
  fallback-source policy (Ciqual/USDA), confidence states, environmental-score handling,
  and the absolute rule against fabricated product data. Use this skill whenever a task
  touches src/services/api/, src/domains/product/ (model, normalizer, repository),
  product caching in src/services/storage/, offline/stale states, or any feature that
  displays ingredients, nutriments, additives, halal/vegan status, Green-Score, or
  data-confidence UI (Trust Halo). Also use it for requests like "fill in missing
  nutrition data", "estimate the score", or "add a fallback source".
---

# GreeCheck Data Quality

The UI never lies about food. Every displayed fact traces to a source; every
gap is shown as a gap, not guessed away.

## Source of truth

- Adapter boundary: `src/services/api/sources.ts`. Open Food Facts is the only
  ACTIVE source. Ciqual and USDA adapters exist but are `active: false` with a
  written justification — activating one requires a real, documented reason
  (e.g. generic nutrition for unbranded foods), never a permanent internal DB.
- Normalization: `src/domains/product/normalizer.ts` maps raw OFF responses to
  the internal `Product` model (`model.ts`). **UI components never consume raw
  API responses** — only the normalized model.
- Quality: `computeDataQuality` produces `DataQuality`/`Confidence`
  ("high" | "medium" | "low") feeding Trust Halo (Confiance élevée / Bonne
  confiance / Données partielles / Données insuffisantes).
- States: handle all of `ProductState` — complete, incomplete, `not_found`,
  offline, API-limited, stale-cache. Each has a distinct honest UI.

## Mandatory principles

1. **No fabrication, ever.** Never infer, average, or "estimate" missing
   nutriments, ingredients, additives, halal/vegan status or Green-Score.
   Absence is representable: use unknown/absent states.
2. **Distinguish the five statuses:** confirmed · not confirmed · unknown ·
   incomplete · potentially incompatible. Halal/vegan detection
   (`detectors.ts`) reports these — never collapse unknown into negative.
3. **Environmental score only when valid.** Green-Score renders (and enters the
   scoring environment bucket) only with a valid grade; otherwise the section
   is absent — not shown as "E", not shown empty.
4. **Provenance is visible.** Data source and freshness are part of the model;
   stale-cache products are flagged as such, and Trust Halo reflects real
   `dataQuality`, not optimism.
5. **Normalize at the boundary.** All source quirks (OFF field variants, unit
   inconsistencies, language fallbacks) are resolved in the normalizer with
   tests (`normalizer.test.ts`) — never patched ad hoc in components.
6. **Cache honestly.** Product cache (Dexie/IndexedDB) keeps fetch timestamps;
   old cache is served as "possibly outdated", not as fresh truth.

## Forbidden behaviors

- Filling missing fields with category averages, defaults, or invented values.
- Treating unknown halal/allergen/NOVA/ingredient data as a warning or penalty.
- Rendering an empty Green-Score, empty additive list ("0 additives") or empty
  allergen section when the underlying data is unknown.
- Fetching OFF (or any API) directly from a visual component.
- Activating Ciqual/USDA silently or using them as a primary source.
- Dropping the `not_found` / offline / stale distinctions into one generic error.

## Examples

**Request:** "Ingredients missing — show 'no additives detected'."
**Do:** Unknown list ≠ additive-free. Show "Ingrédients non disponibles";
additives bucket stays absent; confidence drops.

**Request:** "Use USDA to complete OFF products."
**Do:** Only via the adapter boundary, flipped `active: true` with
justification, per-field provenance retained, and merged data marked with its
source — never blended invisibly.

**Request:** "Offline users see an error page."
**Do:** Serve cached products flagged as cached-with-date; offer scan history;
distinguish "offline" from "not found".

## Acceptance criteria

- [ ] No invented values anywhere; unknowns render as explicit unknown states.
- [ ] All product data flows raw → normalizer → `Product` model → UI; no raw
      API consumption in components.
- [ ] Trust Halo/confidence reflects actual `computeDataQuality` output.
- [ ] Green-Score displayed and scored only when valid.
- [ ] complete / incomplete / not_found / offline / API-limited / stale-cache
      each verified with distinct UI.
- [ ] `normalizer.test.ts` and `repository.test.ts` updated and passing.
