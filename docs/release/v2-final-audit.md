# GreeCheck V2 — Final launch audit

> Date: 2026-07-22 · Branch `develop` · Auditor skills applied:
> `greecheck-release-auditor`, `greecheck-product-guardian`,
> `greecheck-brand-system`.
> Method: **evidence over assertion** — every PASS below was produced by a
> command executed in this session, or by reading the code/built output. Claims
> that could not be executed here are listed as **NOT VERIFIED**, never as PASS.

## 1. Verdict

**Not market-ready by this audit alone — but no blocker or critical issue is
open.** Two HIGH findings were fixed and revalidated. The remaining gate is
environmental, not code: the Playwright E2E/a11y/visual suite and Lighthouse
could not run in this sandbox (no browser engine, no outbound network). They
must pass on CI or a developer machine before the launch call.

| Severity | Open | Fixed this session |
|---|---|---|
| Blocker | 0 | 0 |
| Critical | 0 | 0 |
| High | 0 | 2 |
| Medium | 5 | 0 |
| Low | 4 | 0 |

## 2. Static gates (executed)

| Gate | Command | Result |
|---|---|---|
| Lint (app) | `npm run lint` | ✅ 0 errors |
| Lint (domain) | `npx eslint packages` | ✅ 0 errors |
| Typecheck (domain, `lib=ES2022`, no DOM) | `npm run typecheck:domain` | ✅ 0 errors |
| Typecheck (app) | `npm run typecheck` | ✅ 0 errors |
| Unit + integration | `npm test` | ✅ **239/239 pass** |
| Production build | `npm run build` | ✅ compiled, **55/55 static pages** |
| E2E + a11y + visual | `npm run test:e2e` | ⛔ **NOT VERIFIED** — no browser engine in this environment |

Re-run after the fixes: lint ✅, typecheck ✅, 239/239 ✅, build ✅ 55/55.

## 3. Findings

### HIGH — fixed

**H-1 · Broken methodology deep links (product + GreeCoach).**
GreeCoach and the product page link to `/methodology#greescore`, `#additives`,
`#greeimpact`, `#confidence`, `#halal`… but the methodology page contained
**zero `id` attributes**. Every "see the methodology" link silently dropped the
reader at the top of the page — breaking an explicit GreeCoach rule ("provide
links to the relevant methodology section") and the transparency promise.
*Fix:* added real ids (`greescore`, `rules`, `confidence`, `sources`) to the
four existing sections and remapped `METHOD_ANCHOR` onto anchors that actually
exist — organic/halal → `rules` (the section that documents them), impact →
`sources`. No content invented, no redesign.
*Evidence:* `grep id="…" .next/server/app/fr/methodology.html` → all four present.

**H-2 · Hard-coded colour palette in GreeCart (brand-system violation).**
The environmental distribution bar shipped six literal hex values
(`#1E6B7A…#ECEDEA`), violating "zero new hard-coded colors; tokens or token
additions only" — a regression introduced during the GreeCart task.
*Fix:* added `--gc-env-a…e/unknown` tokens to `globals.css` (light **and**
dark) and switched `ENV_COLORS` to `rgb(var(--gc-env-*))`. Dark mode now
themes correctly, which the literals prevented.

### MEDIUM — documented, not fixed (out of "critical/high" scope)

- **M-1 · RTL: physical offsets on functional elements.** Grade badges
  (`battle-card`, `podium`, `-right-1`) and the first-scan-intro close button
  (`right-3`) keep their physical side in Arabic. Readable and reachable, but
  not mirrored. 14 physical-direction classes total; the rest are symmetric
  decorative halos (RTL-irrelevant).
- **M-2 · Stale governance skill.** `greecheck-product-guardian` still freezes
  the name "Scan Battle" and nav `Battle`, which the constitution and an
  explicit instruction superseded with **GreeCompare**. The skills guide
  requires updating the skill in the same change as the invariant. The skill
  must be refreshed before it misleads a future task.
- **M-3 · Visual-regression baselines absent.** `visual-regression.spec.ts`
  exists but no baseline snapshots are committed; the first CI run will create
  them and cannot fail on a regression until they are reviewed and committed.
- **M-4 · Non-token colours in older components.** `axis-bars` (`#0EA5E9`) and
  a few badge/logo literals predate the token system. Nutri-Score/NOVA palettes
  are externally standardised and legitimately literal; `axis-bars` is not.
- **M-5 · Weekly-progress metrics start empty.** Sugar / risky-additive /
  environmental deltas only populate from scans made after the enriching
  build; older history rows lack the fields. Degrades honestly
  (`available: false`), but the section looks thin for existing users.

### LOW

- **L-1** `theme-color` meta literals in `layout.tsx` mirror tokens by hand
  (meta tags cannot reference CSS variables) — acceptable, keep in sync.
- **L-2** GreeCoach `whyAlternativeBetter` only appears once an alternative is
  already loaded (the coach stays pure and never fetches).
- **L-3** OCR beta is fr+eng only; other scripts unsupported.
- **L-4** `/methodology` has no dedicated GreeImpact section; impact links
  resolve to `sources`.

## 4. Area-by-area results

| Area | Result | Evidence |
|---|---|---|
| Scan speed & clarity | ✅ code-verified | detection theatre ≤ ~1.5 s; zxing lazy-loaded; calm→neon only on detection |
| Permission flows | ✅ | 11 camera states incl. `denied/no-camera/in-use/insecure`; manual + search fallback |
| Product resolution | ✅ | dedup, rate-limit cooldown, cache fallback marked stale, typed envelopes |
| Scoring explanations | ✅ | verdict + coded reasons + component breakdown (60/30/10); 41 scoring tests |
| Missing-data behaviour | ✅ | typed `unscored`; unknown never negative; confidence reduced, never the score |
| GreeImpact uncertainty | ✅ | `insufficient` state + explicit missing reasons; category-level flagged |
| Allergen alerts | ✅ | critical alerts on product + cart; "cannot confirm" when ingredients absent |
| Halal language | ✅ | audited all 3 locales: "non vérifié"/"non confirmé (information, pas un problème)"; **never** "non halal" |
| Alternatives (GreeSwap) | ✅ | gated to score<50 / D-E / criterion conflict; measurable gain shown |
| GreeCompare | ✅ | 2–3 products, comparability guard, low-confidence warning, health vs env winners |
| GreeCart | ✅ | aggregate + distributions + contributors + before/after + replace |
| Shopping list | ✅ | persistent, quantity, checked, offline; `/fr/list` returns **200** (redirect bug fixed earlier) |
| Weekly progress | ✅ (see M-5) | local engine, non-shaming framing, 7 tests |
| History & favorites | ✅ | local IndexedDB mirrors, clearable |
| GreeCoach | ✅ | deterministic; **no persistence** (grep: no localStorage/repo in component); 16 tests |
| Donations | ✅ | honest "opens at launch", no fake button |
| Methodology | ✅ after H-1 | anchors verified in built HTML |
| Independence charter | ✅ | constitution + support page; no paid placement anywhere |
| Privacy | ✅ | no analytics/replay/Sentry/identifier (grep clean); `connect-src 'self'` |
| Accessibility | ⚠️ partial | code-level checks pass (labels, focus, ≥44px, non-colour meaning); **axe suite NOT VERIFIED here** |
| Motion | ✅ | reduced-motion honoured in globals.css, motion.ts, sheets |
| Empty/loading/error states | ✅ | distinct offline / not-found / rate-limited / stale states with actions |
| Visual consistency | ✅ after H-2 | tokens only in new code |
| PWA install / manifest / icons | ✅ code-verified | localized manifest routes, maskable icons, install prompt |
| Cache update & recovery | ✅ | versioned SW, update notice, `CLEAR_CACHES` self-heal |
| Production errors | ✅ | stable machine codes only; no raw exception messages (6 guard tests) |

**Viewport / locale / network matrix:** structurally verified by code review
(mobile-first from a 360 px floor, logical properties, safe areas, three
locales complete at 1189 keys each, offline SW fallback, cached products).
**Device-level rendering across the 15 listed contexts is NOT VERIFIED** — it
requires a browser and real devices; see §5.

## 5. Required before declaring market-ready

1. `npm run test:e2e` green (flows + axe a11y + visual) on CI or a dev machine.
2. Review and commit the visual-regression baselines (M-3).
3. Lighthouse on a deployed URL: Performance > 90, Accessibility > 95.
4. Manual pass over the 15 viewport/locale/network contexts, in particular
   Arabic RTL on a real device and the installed-PWA cold start.
5. Refresh `greecheck-product-guardian` for the GreeCompare rename (M-2).

Until 1–4 are green, the honest status is **release-candidate**, not
market-ready.

## 6. Product-guardian conformance

- Navigation: exactly **5** primary destinations ✅
- No account / auth / server profile / ads / tracking / LLM ✅
- No invented product data ✅ (unknown states everywhere)
- Decide → Understand → Explore hierarchy respected on the product page ✅
- Naming: `Battle` → `GreeCompare` was an explicit, constitution-level
  instruction; the skill file lags (M-2).
