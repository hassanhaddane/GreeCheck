# GreeCheck V2 — Product Architecture

> Forensic audit of V1 (commit `afe693d`, 2026-07-06) and target architecture for V2 ("Food Decision OS").
> Companion docs: `v2-route-map.md`, `v2-component-map.md`, `v2-data-flow.md`, `v2-migration-plan.md`.

## 1. Current V1 architecture

**Stack (actual, verified):** Next.js 16 (App Router, `src/proxy.ts` middleware convention), React 19, TypeScript 5.9 strict, Tailwind 3.4, next-intl 4 (fr/en/ar, `localePrefix: always`), Framer Motion 12, Zustand 5 (persist → localStorage), Dexie 4 (IndexedDB, product cache only), @zxing/browser + self-hosted `zxing_full.wasm` (`scripts/copy-wasm.mjs`), Leaflet 1.9, manual `public/sw.js` PWA.

**Layering (mostly sound):**

```
UI pages (all "use client")
  └─ lib/api/client.ts        (client fetchers + IndexedDB cache + alternatives ranking)
       └─ /api/* route handlers (server proxy to Open Food Facts)
            └─ lib/api/openfoodfacts.ts  (server fetchers, dual search strategy)
                 └─ lib/api/product-normalizer.ts  (single OFF→Product mapper ✅)
  └─ lib/scoring/*            (pure engines: gree-score, battle, basket ✅)
  └─ stores/* (Zustand persist) + lib/storage/db.ts (Dexie)
```

Strong points to preserve conceptually: a single normalizer boundary (`OffRawProduct` never leaks), pure deterministic scoring engines with reason/warning codes resolved via i18n, server proxy with `User-Agent`, timeouts, `safeJson` hardening and dual search strategy (Search-a-licious → legacy `cgi/search.pl`), self-hosted WASM (privacy), theme bootstrap without hydration flash.

## 2. Problems and technical debt (verified in code)

**Product/spec violations (V2 master instructions):**
1. **Ads + consent system exists** (`components/ads/*`, `stores/consent-store.ts`, ads i18n namespace, AdSlot on home/search/product/basket). V2: *aucune publicité, aucun tracking*. → delete.
2. **Map + France places/geocode** (`/map`, `api/france-places`, `api/france-geocode`, `lib/api/places*`, leaflet dep, ~600 LoC). Out of V2 scope. → delete.
3. **Shopping list** (`/list`, `shopping-list-store`, `lib/shopping/aisles.ts`) is an e-commerce-ish list, not in V2 nav. → delete (GreeCart = basket analyzer keeps that role).
4. **No dedicated history page** ("Mes scans" is a V2 primary destination; V1 shows 5 entries on home only) and favorites have a store but no surface.
5. **Verdict labels hardcoded in French inside types** (`ScoreLabel = "Excellent" | "Bon choix" | …` in `types/scoring.ts`) — breaks en/ar and violates "no visible text outside translation files". Same problem: `GOAL_LABELS` (constants/goals.ts), `PREF_LABELS` (settings page), `lib/filters/definitions.ts` labels, manifest fr-only.
6. **No V2 verdict tier** ("Peu adapté à votre objectif", "Ultra-transformé", "Données insuffisantes" don't exist; label is derived purely from score bands).
7. **Halal treated as quality**: `scoreLabels` adds +8 to the score when `preferHalal && isHalal`; V2 requires halal to be a *compatibility* criterion only, never nutritional quality.
8. **Double penalty risk**: with Nutri-Score present, sugar/salt/satFat "nudges" subtract again on top of the Nutri-Score base, and NOVA4 + additives + labels all interact — V2 requires explicit anti-double-counting.
9. **Unknown ≠ negative not fully honored**: e.g. `go_organic` goal scores 30 when `isBio` is false-or-unknown; `vegan` goal 20 when unknown; alternatives require only `score > current+3` with no confidence gating; GreeSwap trigger rules (<50, D/E, critical incompatibility) not implemented — alternatives always shown when any category match beats the score.
10. **SEO essentially absent**: every page is `"use client"`; only the root layout exports (French-only, hardcoded) metadata; no per-page `generateMetadata`, no canonical/hreflang, no sitemap, no robots.txt, no structured data, no public product pages (product page is client-fetched → nothing indexable).
11. **Onboarding/criteria**: V1 "goals" (15 mixed goals incl. halal/vegan) diverge from V2's 8 criteria + separate allergies section. Preferences model must be redesigned.

**Technical debt:**
- All pages are client components; even static pages (privacy) — hurts SEO, TTFB, and Lighthouse.
- `stores/*` persist to **localStorage** while the product cache is in IndexedDB; V2 requires IndexedDB behind a repository abstraction for history/favorites/cart/battle.
- Duplicated verdict/grade color maps (`GRADE_BG` re-declared in product page, alternatives, search card…); duplicated back-compat aliases (`HistoryEntry`, `Alternative`).
- Dead code: `lib/constants/filters.ts` (superseded by `lib/filters/definitions.ts`, zero imports).
- `components/product/nutrition-radar.tsx` is a decorative radar (V2: no purely decorative charts; replace with GreeDNA that interprets).
- Windows-only `node_modules` committed to disk habits: `npm test`/`next build` require a per-platform install (esbuild/tsx native binaries) — document, don't commit.
- 1 unit-test file only (`gree-score.test.ts`); no tests for battle, basket, normalizer, parse-scan.
- No `vercel.json` (fine — zero-config), `.env.example` OK; `manifest.webmanifest` `start_url:"/"` is not locale/PWA-entry aware (V2: installed PWA must open GreeLens directly) and shortcuts hardcode `/fr`.
- Repo hygiene: `tsconfig.tsbuildinfo` committed-adjacent (should be gitignored), `.idea/` present.

## 3. Components to preserve (as-is or near-as-is)

- `lib/api/product-normalizer.ts` — keep the boundary pattern; extend the model (see data-flow doc).
- `lib/api/openfoodfacts.ts` — keep hardened fetchers, dual search, category search.
- `app/api/product|search|alternatives` route handlers — keep, with cache headers.
- `hooks/use-barcode-scanner.ts` — mature (permissions, torch, zoom, focus, env detection, zxing formats); keep, wrap in the GreeLens V2 UI.
- `scripts/copy-wasm.mjs` — keep (privacy: self-hosted WASM).
- `lib/nutrition/thresholds.ts`, `detectors.ts` — keep as scoring inputs.
- `lib/utils/parse-scan.ts`, `cn.ts`, `hooks/use-mounted.ts` — keep.
- i18n plumbing: `i18n/routing.ts`, `i18n/request.ts`, `src/proxy.ts`, `messages/*` — keep, extend.
- PWA basics: `sw.js` strategy, `offline.html`, icons — keep, adjust `start_url` and add locale-aware shortcuts.
- UI primitives worth keeping: `button`, `card`, `premium-card`, `chip`, `collapsible-section`, `empty-state`, `error-state`, `skeleton`, `section-title`, badges (`nutri-score`, `nova`, `label`), `score-ring`.

## 4. Components to refactor

- `lib/scoring/gree-score.ts` → V2 engine: verdict enum (i18n codes, includes goal-fit and insufficient-data verdicts), Trust Halo confidence model (4 levels), anti-double-counting, halal → compatibility channel, bio bonus capped so NOVA4+bad-nutrition can never reach "Excellent", missing data → confidence not score.
- `lib/scoring/battle.ts` → add confidence-aware winner rule (score alone must not decide when confidence levels differ strongly).
- `lib/scoring/basket.ts` (624 LoC) → split: analysis, improvement plan, before/after simulation; rename domain to GreeCart.
- `lib/api/client.ts` → split into product-repository + GreeSwap engine with V2 trigger/eligibility rules.
- `stores/*` → keep Zustand for ephemeral UI state; move persistent collections to IndexedDB repositories.
- Product page → server component shell + `generateMetadata` + client islands; 3-level hierarchy (Décider / Comprendre / Explorer).
- `scan-client.tsx` → GreeLens with quick-scan session actions (result / +Battle / +GreeCart / re-scan).
- Preferences/settings → "Mes critères" (8 criteria + separate allergies), remains optional.
- All label constants (`GOAL_LABELS`, `PREF_LABELS`, filter labels, `ScoreLabel`) → message catalogs.

## 5. Components to delete

| Item | Reason |
|---|---|
| `components/ads/*`, `stores/consent-store.ts`, `ads` i18n namespace | V2 forbids ads/tracking |
| `app/[locale]/map/*`, `api/france-geocode`, `api/france-places`, `lib/api/places*`, `types/place.ts`, `components/map/*`, leaflet deps + CSS import | Out of V2 scope |
| `app/[locale]/list/*`, `stores/shopping-list-store.ts`, `lib/shopping/aisles.ts`, `ShoppingItem/ShoppingList` types | Not a V2 destination |
| `lib/constants/filters.ts` | Dead code (already removed in this phase) |
| `components/product/nutrition-radar.tsx` | Decorative chart → replaced by GreeDNA |
| Back-compat aliases (`HistoryEntry`, `Alternative`) | Single canonical types |

## 6. Final domain boundaries (V2)

```
src/
  app/                    routes only (thin; server components by default)
  domains/
    product/              normalized model, normalizer, repository, product UI
    scoring/              gree-score engine, verdicts, trust halo, tests
    scan/                 GreeLens (scanner hook, overlay, session actions)
    swap/                 GreeSwap engine (triggers, eligibility, measurable gains)
    battle/               battle engine + UI
    cart/                 GreeCart analyzer, improvement plan, simulation
    library/              "Mes scans" history + favorites
    criteria/             "Mes critères" preferences + allergies
  shared/                 ui primitives, utils, hooks, constants
  services/storage/       IndexedDB repositories (Dexie) behind interfaces
  i18n/                   routing, request, messages
```

Rules: UI never consumes raw API payloads; engines are pure and I/O-free; repositories are the only writers to storage; `app/` imports domains, never the reverse.

## 7. Dependencies

**Retain:** next, react, react-dom, typescript, tailwindcss (+animate), next-intl, framer-motion, zustand, dexie, lucide-react, @zxing/browser, @zxing/library, barcode-detector (zxing-wasm source for `copy-wasm`), clsx, tailwind-merge, class-variance-authority, tsx, eslint stack.

**Remove:** `leaflet`, `@types/leaflet` (map deleted).

**Add (when the phase needs them):** none mandatory. Optional: `vitest` (richer test runner than `node --test`, still no network), shadcn/ui generated components (copied source, not a dep).

## 8. Non-functional targets

Privacy: no account, no server-side user data, IndexedDB-only persistence, self-hosted WASM, OFF attribution. SEO: SSR metadata, localized titles/descriptions, canonicals + hreflang, sitemap, robots, JSON-LD `Product`/`WebApplication`, no indexing of empty/error states. A11y: Lighthouse ≥95, RTL, reduced-motion, no color-only information. Performance: Lighthouse ≥90 realistic, dynamic import for scanner/heavy modules, no hydration instability, no horizontal overflow.
