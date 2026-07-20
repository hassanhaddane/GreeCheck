# GreeCheck V2 — Migration Plan (architecture)

> Companion to `07-target-architecture.md`. Phase 1 is DONE (this change).
> Rule for every phase: no visible product behavior change, all gates green
> before merge, no concurrent duplicate implementations.

## Phase 1 — Prove the boundary ✅ (2026-07-20)

**Moved to `packages/domain/src/`** (git mv, history preserved):

| From `src/domains/` | To `packages/domain/src/` |
|---|---|
| `product/model.ts`, `product/normalizer.ts` (+test) | `product/` |
| `scoring/{types,thresholds,detectors,gree-score}.ts` (+test) | `scoring/` |
| `criteria/{model,goals}.ts` | `criteria/` |
| `swap/engine.ts` (+test) | `swap/` |
| `battle/{model,engine}.ts` (+test) | `battle/` |
| `cart/{model,engine,what-if}.ts` (+test) | `cart/` |

**Created:** `packages/domain/{package.json,tsconfig.json}`, `src/index.ts`
(public surface), `src/impact/{types,engine,engine.test}.ts` (GreeImpact —
new pure engine, not yet consumed by UI), `src/purity.test.ts` (independence
guard), `src/domains/swap/service.ts` (app-side retrieval).

**Boundary fix found by the purity guard:** `swap/engine.ts` contained a
`fetch()` to `/api/alternatives`. Retrieval moved to
`src/domains/swap/service.ts`; the engine kept eligibility + ranking
(`preciseCategory` now exported). The three consumers import
`getAlternatives` from the service; types still come from the package.
Behavior identical (same code path, relocated).

**Wiring:** `tsconfig.json` alias `@greecheck/domain/* → packages/domain/src/*`
(Next compiles package source directly — no build step, works on Vercel);
`package.json` test paths updated + `typecheck:domain` script; app-side
imports rewritten (55 files, mechanical); internal package imports made
relative (standalone-compilable).

**Stayed in the app (deliberately):**

- `src/domains/*/store.ts` + criteria/onboarding/library stores — zustand +
  storage = application layer.
- `src/domains/product/{repository,contribute}.ts` — retrieval/persistence
  orchestration and OFF contribution URLs = data-source concerns.
- `src/domains/search/*` — intents/ranking depend on `@/types/filters` and
  are not in the required package surface. Candidate for Phase 2.
- `src/domains/library/*` — local history views (app/persistence concern).

## Phase 2 — Complete the domain surface (next)

1. Move `search/{intents,ranking}` into the package (requires relocating the
   pure parts of `@/types/filters` into domain first).
2. Extract the pure slice of `library/history-view.ts` (grouping/filtering
   logic) if it proves reusable for a native client.
3. Decide `assessProduct`/`Assessment` placement (currently normalizer):
   possibly a dedicated `confidence/` module for discoverability.
4. Add an ESLint boundary rule (`no-restricted-imports` per layer) so §3 of
   doc 07 is machine-enforced app-side too, not only package-side.

## Phase 3 — GreeImpact adoption

Wire `computeGreeImpact` into the product page/compare/cart UI **when the V2
screens land** (per prototypes + design system). Until then the scoring
engine's internal environment bucket remains untouched — no behavior change.

## Phase 4 — Optional packaging hardening (only if needed)

Convert the path alias into real npm workspaces (`"workspaces":
["packages/*"]`, app depends on `@greecheck/domain`), enabling versioned
publication for a native client repo. Not needed while web is the only
consumer; revisit when a mobile wrapper starts.

## Validation protocol (ran for Phase 1, required for every phase)

```bash
npm run typecheck:domain   # package alone, lib=ES2022 (no DOM) — proves purity at type level
npm run typecheck          # whole app
npm run lint               # eslint src (+ packages)
npm test                   # 113 tests incl. purity guard + impact engine
npm run build              # production build
npm run test:e2e           # on release-audit passes (unchanged UI ⇒ smoke)
```

Linux note (CI/sandbox): mounted Windows `node_modules` can't execute native
binaries — install fresh in a Linux dir and run tsx via
`node --import <linux>/node_modules/tsx/dist/loader.mjs --test …`
(the `dist/loader.mjs` entry registers BOTH ESM and CJS hooks; the
`esm/index.mjs` entry alone breaks CJS-mode app tests). `@parcel/watcher`
and SWC need their linux-x64 optional packages present for `next build`.

## Rollback

Phase 1 is a pure relocation: `git revert` of the single migration commit
restores the previous layout. No data formats, routes, or APIs changed.
