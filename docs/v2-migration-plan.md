# GreeCheck V2 — Migration Plan

Ordered so the app **builds and works after every phase**, no two concurrent implementations, V1 code deleted as soon as its replacement lands.

## Execution-prompt mapping (authoritative)

The numbered phases below are INTERNAL work packages, not the client's prompt
numbers. Actual mapping so far:

| Execution prompt | Internal work packages | Status |
|---|---|---|
| Prompt 01 | Phase 0 — audit + architecture docs | ✅ |
| Prompt 02 (+validation) | Phases 1–2 — purge, domains, storage, routes, PWA start | ✅ |
| Prompt 03 (+validation) | Design system & living brand (tokens, system primitives, GreePulse) | ✅ |
| Prompt 04 (next) | **Adaptive marketing site, app entry & navigation** | ⏳ |
| Later prompts | Scoring V2 + Trust Halo · product page (GreeDNA) · GreeLens · GreeSwap · library · Battle/GreeCart V2 · criteria · SEO/i18n finalization | planned |

Do not pre-implement a later prompt's scope inside an earlier one.

## Phase 0 — Architectural preparation ✅ (this phase)
- Forensic audit + these 5 docs.
- Remove confirmed dead code (`lib/constants/filters.ts`).
- Repair repo hygiene (`.gitignore` for `tsconfig.tsbuildinfo`).
- Verify lint / typecheck / tests / build baselines.
- **No UI redesign, no feature rebuild.**

## Phase 1 — Purge out-of-scope V1 features ✅ (done in Core Platform prompt)
Delete ads (+consent), map (+places APIs, leaflet), shopping list. Update home/nav/product/basket surfaces that referenced them; remove i18n namespaces; drop leaflet deps.
*Risk: broken imports → gate on build + grep for orphan keys.*

## Phase 2 — Domain foundation & storage ✅ (done in Core Platform prompt — incl. final route structure /history /cart /criteria /discover /methodology, PWA start_url → /scan, localized layout metadata + SEO helper)
Create `domains/` + `services/storage/` skeleton; move normalizer/fetchers/engines into domains (git mv, no behavior change); introduce IndexedDB repositories + legacy localStorage migration; stores become hydrated mirrors.
*Risk: data loss during migration → migration unit tests + non-destructive read-first strategy; hydration mismatches → mounted-gate pattern already in place.*

## Phase 3 — GreeScore V2 + Trust Halo
Rewrite engine per `v2-data-flow.md` (verdicts, anti-double-counting, halal channel, bio cap, confidence). Full test suite (golden fixtures per rule). Update every consumer (product, search, battle, cart) in the same phase — no dual engines.
*Risk: score shifts confuse history entries → history stores score snapshots; display "recalculé" only where recomputed.*

## Phase 4 — Product page V2 (Décider / Comprendre / Explorer)
Server shell + `generateMetadata` + JSON-LD; VerdictCard, TrustHalo, ReasonChips, CompatibilityAlerts, GreeDNA, ExploreAccordion. Delete `nutrition-radar`, `health-badge`, old breakdown.
*Risk: SSR/CSR divergence on cached products → server fetch for public data, client-only for personal criteria.*

## Phase 5 — GreeLens V2
Scan UX (calm interface, 3D-lite frame, neon only during detection), quick-scan sessions, permission recovery. PWA `start_url` → `/scan`, locale-aware shortcuts.
*Risk: camera regressions on mid-range mobiles → manual device pass required before sign-off.*

## Phase 6 — GreeSwap
Trigger + eligibility rules, measurable deltas, integrate into product page and cart. Replace `alternatives.tsx` and `replacement-suggestions.tsx`.

## Phase 7 — Mes scans (history) + favorites
New `/history` route with modes, filters, reuse actions; nav slot swap (home → Mes scans in bottom bar).

## Phase 8 — Battle V2 + GreeCart
Confidence-aware battle verdict; `/basket`→`/cart` rename + redirect; keep/reconsider/replace, distributions, improvement plan, before/after simulation.

## Phase 9 — Mes critères + onboarding
8 criteria + separate allergies; optional, never blocking; criteria wiring into alerts/ranking/swap/cart (not base score).

## Phase 10 — SEO / i18n / marketing
Localized metadata everywhere, canonicals + hreflang, sitemap, robots, methodology page, hardcoded-label migration completed, manifest localization, GreePulse polish, accessibility audit, Lighthouse targets.

## Quality gate (every phase)
`npm run lint` → `npm run typecheck` → `npm test` → `npm run build` → manual pass of affected journeys (mobile 360px, tablet, desktop; fr + ar RTL) → confirm no prior feature regressed.

## Regression risk register
| Risk | Phase | Mitigation |
|---|---|---|
| OFF API changes/rate limits | all | proxy hardening kept; typed `rate_limited` state |
| localStorage→IndexedDB migration loss | 2 | copy-then-verify-then-delete; unit tests |
| Score semantics change | 3 | golden fixtures; consumer updates same phase |
| Scanner device matrix | 5 | manual mid-range Android + iOS Safari pass |
| SEO indexing of empty states | 4/10 | `noindex` on not_found/insufficient; sitemap excludes |
| RTL layout breaks | all UI phases | ar smoke test per phase |
| **Dev-env trap: Windows `node_modules` used from Linux sandbox** | tooling | esbuild/tsx are platform-native — always `npm install` per platform (e.g. `/tmp` copy for Linux CI runs) |

## Explicitly deferred (do not build early)
Ciqual/USDA fallback integration, methodology page content, GreePulse full identity system, marketing home, public product-page ISR strategy — each lands in its listed phase only.
