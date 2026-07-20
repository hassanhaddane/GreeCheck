# GreeCheck V2 — Target Architecture

> Source of truth for structure decisions. Grounded in
> `00-repository-truth.md` (branch `develop`); governed by
> `02-product-constitution.md`. Phase 1 of the migration (see
> `08-migration-plan.md`) is implemented and validated.

## 1. Shape of the system

One production **Next.js PWA** (App Router, `[locale]` routing fr/en/ar,
Vercel) + one independent **TypeScript domain package**. No accounts, no
server-side user profile: the only server code is **stateless product API
proxies** (`src/app/api/*`) in front of Open Food Facts. All user state lives
in **IndexedDB** on the device.

```
┌────────────────────────────── Next.js PWA ──────────────────────────────┐
│  UI (src/components, src/app/[locale])   ← React, tokens, messages/*    │
│  Application services (src/domains/*/service, stores, src/services)     │
│  ├─ Data sources  src/services/api   (OFF adapter, fallbacks, proxies)  │
│  └─ Persistence   src/services/storage (Dexie/IndexedDB repositories)   │
└───────────────▲─────────────────────────────────────────────────────────┘
                │ imports (one direction only)
┌───────────────┴──────────── @greecheck/domain ──────────────────────────┐
│  packages/domain — pure TS: models, engines, explanation contracts      │
│  product · scoring · impact · criteria · swap · battle · cart           │
└─────────────────────────────────────────────────────────────────────────┘
```

## 2. The domain package — `@greecheck/domain`

`packages/domain/` · consumed via the `@greecheck/domain/*` path alias
(compiled by Next from source; publishable-workspace conversion is a later,
optional step — see 08 §4).

| Module | Contents |
|---|---|
| `product/` | Normalized `Product` model; OFF-shape normalizer + classification helpers; **confidence model** (`DataQuality`, `computeDataQuality`, `availabilityOf`, `assessProduct`) |
| `scoring/` | GreeScore types + engine (`computeGreeScore`), thresholds (single source shared by filters/cart), additive registry + `additiveSeverityOf`, **compatibility detectors** (`halalStatusOf` — compatibility, never quality) |
| `impact/` | **GreeImpact types + engine** — environmental assessment, strictly separate from health; `unavailable` when data is missing, never a default grade |
| `criteria/` | User criteria model + goals (pure definitions; stores stay app-side) |
| `swap/` | Eligibility + ranking of alternatives (`isSwapEligible`, `rankAlternatives`, `preciseCategory`) — retrieval excluded by design |
| `battle/` | Comparison engine + model (confidence-aware winner) |
| `cart/` | Basket analysis engine + deterministic what-if simulation |
| `index.ts` | Public surface |

**Hard independence rules** (enforced, not aspirational):

- No React, Next.js, zustand, dexie, next-intl, `@/*` app imports, browser
  globals (`window`, `document`, `navigator`, `indexedDB`, `localStorage`),
  network (`fetch`, XHR, WebSocket).
- Enforced twice: `packages/domain/tsconfig.json` compiles with
  `lib: ["ES2022"]` (no DOM types ⇒ browser usage fails typecheck, run via
  `npm run typecheck:domain`) and `purity.test.ts` scans every source file in
  the normal test suite (caught a real violation during migration: the swap
  fetch).
- Internal imports are **relative only** — the package compiles standalone
  and can be lifted into a React Native/native project unchanged.

**Explanation contracts.** Every engine output explains itself with stable
codes + params (`ScoreReason`, `ScoreExplanation`, `ImpactReason`,
battle/cart reasons) — never display strings. UI translates codes via
`messages/{fr,en,ar}.json`. This is what keeps the package free of i18n and
the scores explainable in all locales (FR first; EN/AR preserved by
architecture, not by effort).

## 3. Layer boundaries (dependency direction: top → bottom only)

| Layer | Location | May import | Must never |
|---|---|---|---|
| **UI** | `src/components`, `src/app/[locale]` | services, stores, domain (types/pure fns), messages | call `fetch` to product APIs directly; consume raw API JSON; compute scores ad hoc |
| **Application services** | `src/domains/*/service.ts`, `src/domains/*/store.ts` (zustand), `src/lib` | domain, data sources, persistence | contain scoring/ranking logic (delegate to domain); render UI |
| **Data sources** | `src/services/api` (+ `src/app/api` proxies, `src/domains/product/contribute.ts`) | domain models (to normalize INTO) | leak raw payload types upward; persist; know about React |
| **Persistence** | `src/services/storage` (Dexie behind repositories) | domain models | be imported by domain; be accessed outside repositories |
| **Domain** | `packages/domain` | itself (relative) + type-only node in tests | everything else (see §2) |

Boundary notes:

- `src/domains/` is now the **application layer** for each feature: stores,
  services, and app-specific glue. Pure logic no longer lives there.
- The OFF adapter boundary (`src/services/api/sources.ts`) is unchanged: OFF
  active; Ciqual/USDA present but inactive with written justification.
- API routes stay stateless: no session, no user identifier, cache headers
  only. That property is what makes a future mobile wrapper trivial — a
  native client ships the domain package + its own retrieval/persistence
  against the same proxies (or OFF directly).

## 4. State & persistence

- IndexedDB via Dexie, exclusively behind `src/services/storage/repositories`
  (preferences, history, favorites, onboarding, GreeCart, Battle, product
  cache with timestamps).
- zustand stores are thin app-state adapters over repositories; they contain
  no scoring/ranking rules.
- Cached products are served with their age; stale is flagged, never silently
  fresh (data-quality skill rules apply).

## 5. Future clients

The package boundary is the portability contract: a Capacitor wrapper or
native app reuses `@greecheck/domain` as-is and reimplements only retrieval
(HTTP), persistence (SQLite/whatever), and UI. Nothing in the domain needs
React Native shims because nothing in it touches a platform API.

## 6. Verification status (2026-07-20, Linux CI-equivalent)

`typecheck:domain` ✓ · app `typecheck` ✓ · `lint` (src + packages) ✓ ·
`npm test` 113/113 ✓ (incl. purity + new impact tests) · production
`next build` — see 08 §3 / final report.
