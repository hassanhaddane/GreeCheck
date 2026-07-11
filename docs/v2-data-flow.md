# GreeCheck V2 — Data Flow

## 1. Final product data pipeline

```
Open Food Facts (primary)          Ciqual / USDA FDC (fallback, justified only)
        │                                   │
        ▼                                   ▼
app/api/* route handlers  ──  server proxy: User-Agent, 8s timeout, safeJson,
        │                     dual search (Search-a-licious → cgi/search.pl),
        │                     edge cache headers, no user data
        ▼
domains/product/normalizer  ──  OffRawProduct → NormalizedProduct (ONLY mapper)
        ▼
domains/product/repository  ──  read-through cache (IndexedDB, TTL 24h, stale flag)
        ▼
domain engines (pure): scoring / swap / battle / cart
        ▼
UI components (never see raw API shapes)
```

**Product states handled explicitly:** `found | partial | missing_nutrition | missing_ingredients | not_found | offline_cache (stale) | rate_limited | error`. V1 already models the first five; V2 adds `offline/stale` (serve cached result with its age + Trust Halo downgrade) and `rate_limited` (OFF 429 → typed error, retry hint, never blank UI).

**NormalizedProduct (V2 extensions to V1 `Product`):** keep V1 fields; add `fetchedAt`, `dataSource`, per-field provenance where cheap (`ingredientsAvailable`, `nutritionAvailable`, `novaAvailable`), and tri-state compatibility facts: `halal: confirmed | unknown | potentially_incompatible` (label vs detector), same pattern for vegan/vegetarian. Absence of data is *unknown*, never negative.

## 2. Final scoring pipeline (GreeScore V2)

```
NormalizedProduct ─┐
                   ├─► computeGreeScore(product) ──► { score 0-100, grade A-E,
UserCriteria ──────┘        pure, deterministic       verdictCode, subScores,
                                                      reasonCodes[], alertCodes[],
                                                      confidence (TrustHalo) }
```

Rules encoded in the engine (each unit-tested):
1. **Base health score is criteria-independent** — user criteria drive alerts, ranking, swaps and cart, never the base score.
2. **Anti-double-counting**: when Nutri-Score exists it is authoritative for sugar/salt/satFat (no re-penalty; nutrient facts become *reasons*, not deductions); NOVA handled in one bucket only.
3. **NOVA 4 → heavy penalty**; **bio → significant bonus but capped**: an ultra-processed nutritionally-poor product can never exceed grade C ("le bio ne transforme jamais un mauvais produit en excellent").
4. **Halal = compatibility channel** (alert + ranking filter), removed from quality scoring entirely.
5. **Missing data lowers confidence, not the score**; verdict falls back to `insufficient_data` below a confidence floor.
6. **Verdicts (i18n codes)**: `excellent_choice | good_choice | limit | poor_fit_for_goal | ultra_processed | insufficient_data`.
7. **Trust Halo**: `high | good | partial | insufficient` from data completeness, source quality, ingredients/nutrition/NOVA availability.

**GreeSwap rules:** trigger only if score < 50, grade D/E, or critical user-criteria incompatibility. Candidate must: share the precise category, have `confidence ≥ good`, beat the score meaningfully, improve ≥ 1 significant criterion, introduce no major regression. Output always includes the measurable delta; section renders nothing (not an empty shell) when no candidate qualifies.

**Battle:** ranking by score with confidence guard — if confidence levels differ strongly, the verdict says so and the winner is not decided by score alone. **GreeCart:** aggregates per-product results; keep/reconsider/replace groups; deterministic before/after simulation = re-run engine on the hypothetical cart.

## 3. Final local storage architecture

Everything on-device; IndexedDB (Dexie) behind repository interfaces in `services/storage/`:

| Store (IndexedDB table) | Contents | Replaces V1 |
|---|---|---|
| `products` | cached ProductResult + fetchedAt (TTL 24h, stale-serve) | Dexie `products` (keep) |
| `history` | scan entries (≤ 500), favorite flag | zustand-persist `greecheck.history` |
| `favorites` | via `history.favorite` index | `greecheck.favorites` |
| `cart` | GreeCart items + snapshot scores | `greecheck.basket` |
| `battle` | current battle (≤ 3) | `greecheck.battle` |
| `criteria` | Mes critères + allergies | `greecheck.preferences` |
| `meta` | onboarding seen, schema version | scattered localStorage keys |

`localStorage` remains only for synchronous boot needs: theme, locale hint. Zustand stays for **ephemeral UI state** and as an in-memory mirror hydrated from repositories (components never touch Dexie directly). One-time migration on first V2 boot: read legacy `greecheck.*` localStorage keys → write to IndexedDB → remove keys. "Gestion des données locales" (settings) wipes per-repository or everything.

## 4. i18n data rule
All user-visible strings live in `messages/{fr,en,ar}.json`. Engines emit **codes**; UI resolves them. The V1 offenders (ScoreLabel union, GOAL_LABELS, PREF_LABELS, filter labels, manifest) are migrated in the phase that touches each surface.
