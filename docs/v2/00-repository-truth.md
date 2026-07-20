# GreeCheck — Repository Truth (V2 baseline audit)

> Audit date: 2026-07-20. Read-only audit. No runtime file was created, modified or deleted.
> Every statement below is derived from a command executed against the working copy at
> `C:\Users\hassa\Claude\Projects\GreeCheck`. Anything that could not be executed or verified is
> explicitly marked **NOT VERIFIED**.

---

## 1. Exact branch and commit

| Item | Value |
|---|---|
| Checked-out branch | `develop` |
| HEAD commit | `b7b57df978e58f39b1d3f5a47bb78e8c50d6ff06` |
| HEAD commit date | 2026-07-13 00:37:18 +0200 |
| HEAD commit subject | `Discover, Production PWA, Internationalization and SEO` |
| Upstream | `origin/develop` — identical SHA (branch is pushed, not ahead) |
| Worktrees | one only: the repository root. No secondary worktree exists. |

Other refs known locally (`git branch -avv`):

| Ref | SHA | Note |
|---|---|---|
| `main` (local) | `46a259e` | "Merge pull request #1 from hassanhaddane/chore/deployment-setup", 2026-07-03. Behind `origin/main` by 2. |
| `origin/main` | `59ad023` | "Merge pull request #2 from hassanhaddane/develop", 2026-07-06 |
| `origin/develop` | `b7b57df` | = HEAD |
| `chore/deployment-setup` / `origin/chore/deployment-setup` | `3e15e03` | "Prepare GreeCheck for deployment" |

**Key fact:** `git merge-base --is-ancestor develop origin/main` returns **false**. The current
`develop` (V2) has **never been merged into `main`**. `origin/main` is the 2026-07-06 state, i.e.
the pre-V2 codebase.

> Caveat: the sandbox has no GitHub credentials (`git fetch` fails with
> `could not read Username for 'https://github.com'`). All remote-tracking refs above are the
> **last locally fetched** state. **NOT VERIFIED:** whether GitHub `main` has moved since.

### Ten most recent commits on `develop`

```
b7b57df Discover, Production PWA, Internationalization and SEO
29d72bc Discover, Production PWA, Internationalization and SEO
e72b7f1 GreeCart and What-If Basket Optimization
595ac99 Scan Battle Ultimate Comparison
70fe486 Mes scans, Favorites and Mes critères
916edbf Search, Intelligent Filters and SEO Discovery
6621618 GreeSwap Recommendation Engine
7246c41 Ultimate Product Decision Page and GreeDNA
27989c1 GreeLens & Rapid Scan Session
4de5fcd GreeScore V2 and Trust Halo
```

---

## 2. Real architecture and directory tree

### 2.1 Resolution of the reported contradiction

The contradiction is **branch-level, not fiction**:

- `src/lib/scoring/gree-score.ts` and `"test": "node --import tsx --test src/lib/scoring/gree-score.test.ts"`
  exist on **`origin/main` (`59ad023`)** — verified with `git ls-tree -r --name-only origin/main -- src`
  and `git show origin/main:package.json`.
- The domain-oriented architecture described in `PROJECT_CONTEXT.txt` exists on **`develop` (`b7b57df`)**,
  the currently checked-out branch, and is fully present on disk.

So both descriptions are accurate — they describe **two different commits**. `main` is stale.

### 2.2 Actual `src/` tree on `develop` (verified, complete)

```
src/
├── app/
│   ├── [locale]/
│   │   ├── page.tsx                       home (marketing + entry)
│   │   ├── [...rest]/page.tsx             catch-all → 404
│   │   ├── layout.tsx  not-found.tsx
│   │   ├── manifest.webmanifest/route.ts  localized PWA manifest
│   │   ├── scan/         page.tsx + layout.tsx + scan-client.tsx
│   │   ├── search/       page.tsx + search-client.tsx
│   │   ├── product/[barcode]/  page.tsx + layout.tsx
│   │   ├── battle/       page.tsx + layout.tsx
│   │   ├── cart/         page.tsx + layout.tsx
│   │   ├── history/      page.tsx + history-client.tsx
│   │   ├── favorites/    page.tsx + favorites-client.tsx
│   │   ├── criteria/     page.tsx + criteria-client.tsx
│   │   ├── discover/     page.tsx + discover-client.tsx + discover-map.tsx
│   │   ├── settings/     page.tsx + layout.tsx
│   │   ├── methodology/page.tsx  privacy/page.tsx  offline/page.tsx
│   ├── api/
│   │   ├── product/[barcode]/route.ts
│   │   ├── search/route.ts
│   │   ├── alternatives/route.ts
│   │   └── places/route.ts  (+ route.test.ts)
│   ├── globals.css  robots.ts  sitemap.ts
├── domains/                    ← business core (README.md documents the boundaries)
│   ├── product/    model.ts normalizer.ts repository.ts contribute.ts (+2 test files)
│   ├── scoring/    gree-score.ts thresholds.ts detectors.ts types.ts (+1 test file)
│   ├── swap/       engine.ts (+1 test file)
│   ├── battle/     engine.ts model.ts store.ts (+1 test file)
│   ├── cart/       engine.ts what-if.ts model.ts store.ts (+1 test file)
│   ├── search/     intents.ts ranking.ts (+2 test files)
│   ├── library/    history-store.ts favorites-store.ts history-view.ts model.ts (+1 test file)
│   ├── criteria/   model.ts store.ts onboarding-store.ts goals.ts
│   └── discover/   model.ts
├── services/
│   ├── api/        openfoodfacts.ts sources.ts errors.ts fallback/{ciqual,usda}.ts
│   └── storage/    db.ts repositories.ts local-data.ts boot.ts migrate-legacy.ts
│                   test-setup.ts README.md (+2 test files)
├── components/
│   ├── system/     design system (GreeCard/Button/Badge/ScoreRing, VerdictCard, TrustHalo,
│   │               GreePulse, bottom-sheet, loading/error/empty, motion.ts) + system.test.tsx
│   ├── app/        app-shell, top-bar, bottom-nav, side-nav, more-menu, theme, i18n switcher,
│   │               install-prompt, pwa-register, local-data-boot, global-search, logo…
│   ├── product/    product-card, gree-dna, sub-score-cards, alternatives, nutrition-radar
│   ├── scan/       scan-overlay, rapid-scan-card, first-scan-intro, scan-frame-shape
│   ├── battle/     podium, battle-card, axis-bars, comparison-table, add-sheet
│   ├── cart/       cart-item-card, replacement-suggestions
│   ├── search/     filter-panel, product-result-card
│   ├── marketing/  demo-journey, search-entry-form, static-ring, fixtures.ts
│   ├── badges/     nutri-score-badge, nova-badge, label-badge
│   └── ui/         chip, collapsible-section, privacy-pill, section-title
├── hooks/          use-barcode-scanner.ts use-mounted.ts
├── i18n/           routing.ts request.ts        (fr | en | ar, defaultLocale fr, prefix always)
├── lib/            seo.ts filters/definitions.ts constants/{badges,navigation,score}.ts
│                   utils/{cn,parse-scan}.ts
├── types/          filters.ts
└── proxy.ts        (Next.js 16 middleware convention)
```

Repository root also contains: `messages/{fr,en,ar}.json`, `tests/e2e/`, `public/{sw.js,icons/}`,
`playwright.config.ts`, `next.config.mjs`, `tailwind.config.ts`, `eslint.config.mjs`,
`tsconfig.json`, `AGENTS.md`, `README.md`, `PROJECT_CONTEXT.txt` (untracked), `.vercel/`,
and an **empty `docs/` directory** (see §5/§6).

### 2.3 Stack actually declared in `package.json` (`develop`)

Next `^16.2.10`, React/React-DOM `^19.2.7`, TypeScript `^5.9.3` (strict), Tailwind `^3.4.7`,
next-intl `^4.13.1`, Zustand `^5.0.14`, Dexie `^4.0.11`, Framer Motion `^12.42.2`,
`@zxing/browser` + `@zxing/library`, lucide-react `^1.23.0`, clsx / tailwind-merge / CVA.
Dev: ESLint 9 + eslint-config-next 16, Playwright `^1.61.1` + `@axe-core/playwright`,
`fake-indexeddb`, `tsx`. `engines.node >= 20.19.0`. Lockfile: `package-lock.json`,
`lockfileVersion: 3`. **shadcn/ui is NOT installed** (contrary to the project instructions'
"shadcn/ui lorsque pertinent"); the design system is internal (`components/system`).

Notable deltas versus `origin/main`'s `package.json`: `leaflet` + `@types/leaflet` and
`barcode-detector` removed, `scripts/copy-wasm.mjs` + `predev`/`prebuild`/`copy-wasm` scripts
removed (the `scripts/` directory is now empty), `@playwright/test`, `@axe-core/playwright`,
`fake-indexeddb` added, `engines.node` raised from `>=20.9.0` to `>=20.19.0`.

---

## 3. Real implemented routes and features

### 3.1 Routes (all locale-prefixed `/fr`, `/en`, `/ar` — `localePrefix: "always"`)

| Route | File | Kind |
|---|---|---|
| `/` | `app/[locale]/page.tsx` | page |
| `/scan` | `scan/page.tsx` + `scan-client.tsx` | page + client island |
| `/search` | `search/page.tsx` + `search-client.tsx` | page + client island |
| `/product/[barcode]` | `product/[barcode]/page.tsx` (+ layout) | page |
| `/battle` | `battle/page.tsx` (+ layout) | page |
| `/cart` | `cart/page.tsx` (+ layout) | page |
| `/history` | `history/page.tsx` + client | page |
| `/favorites` | `favorites/page.tsx` + client | page |
| `/criteria` | `criteria/page.tsx` + client | page |
| `/discover` | `discover/page.tsx` + client + map | page |
| `/settings` | `settings/page.tsx` (+ layout) | page |
| `/methodology`, `/privacy`, `/offline` | dedicated pages | page |
| `/[...rest]` | catch-all | 404 |
| `/manifest.webmanifest` | route handler | localized manifest |
| `/robots.txt`, `/sitemap.xml` | `app/robots.ts`, `app/sitemap.ts` | metadata routes |

API routes: `GET /api/product/[barcode]`, `GET /api/search`, `GET /api/alternatives`,
`GET /api/places`.

Permanent redirects declared in `next.config.mjs`: `/{locale}/basket → /{locale}/cart`,
`/{locale}/list → /{locale}/cart`, `/{locale}/map → /{locale}`.

### 3.2 Navigation (verified in `src/lib/constants/navigation.ts`)

- `BOTTOM_NAV` = exactly five destinations: `search`, `history`, `scan` (central, `primary`),
  `battle`, `cart`. This matches the V2 instruction (Scan / Search / Mes scans / Battle / GreeCart).
- `MORE_NAV` (secondary) = `favorites`, `discover`, `criteria`, `methodology`, `settings`, `privacy`.

### 3.3 Features present in code

Implemented as source modules on `develop`: GreeLens camera scanning (`hooks/use-barcode-scanner.ts`,
`components/scan/*`), rapid-scan session, search with intents + ranking + filters
(`domains/search/*`, `components/search/*`), product decision page with GreeScore / verdict /
Trust Halo / GreeDNA / sub-scores (`components/system/verdict-card.tsx`, `trust-halo.tsx`,
`components/product/gree-dna.tsx`), GreeSwap (`domains/swap/engine.ts`), Scan Battle
(`domains/battle/*`, `components/battle/*`), GreeCart with what-if simulation
(`domains/cart/engine.ts`, `what-if.ts`), history + favorites (`domains/library/*`), local criteria
+ onboarding (`domains/criteria/*`), Discover (`app/[locale]/discover/*`, `/api/places`),
i18n FR/EN/AR with RTL (`i18n/routing.ts`, three message catalogs, ~42–52 KB each), PWA
(localized manifest route, `public/sw.js`, `pwa-register`, `install-prompt`, `/offline`),
SEO (`lib/seo.ts`, `robots.ts`, `sitemap.ts`), IndexedDB persistence behind repositories
(`services/storage/*`).

Fallback data sources `services/api/fallback/ciqual.ts` and `usda.ts` exist as declared
architecture boundaries; `services/api/sources.ts` is the adapter chain. **NOT VERIFIED at
runtime:** whether they are inactive (PROJECT_CONTEXT states they are inactive; this audit did not
execute the app).

---

## 4. Real test suites and exact results

### 4.1 Node test suite — EXECUTED, 108/108 pass

`package.json` `test` script lists **13 test files** explicitly:

| File | test cases |
|---|---|
| `src/domains/scoring/gree-score.test.ts` | 18 |
| `src/domains/swap/engine.test.ts` | 14 |
| `src/domains/search/intents.test.ts` | 11 |
| `src/domains/cart/what-if.test.ts` | 9 |
| `src/domains/product/normalizer.test.ts` | 9 |
| `src/domains/battle/engine.test.ts` | 8 |
| `src/domains/library/history-view.test.ts` | 7 |
| `src/domains/product/repository.test.ts` | 7 |
| `src/components/system/system.test.tsx` | 7 |
| `src/services/storage/repositories.test.ts` | 6 |
| `src/services/storage/migrate-legacy.test.ts` | 5 |
| `src/domains/search/ranking.test.ts` | 5 |
| `src/app/api/places/route.test.ts` | 2 |
| **Total** | **108** |

Executed result (TAP summary): `# tests 108 / # pass 108 / # fail 0 / # cancelled 0 /
# skipped 0 / # todo 0 / duration_ms 11839`. Exit code 0.

> Environment note: `npm test` as written **fails in a Linux environment** because `node_modules`
> was installed on Windows — `@esbuild/win32-x64` is present, `@esbuild/linux-x64` is not, so `tsx`
> cannot start. The suite was run with a Linux-native `tsx` loader installed outside the repo; the
> repository itself was not modified. On the user's Windows machine `npm test` is expected to work
> as-is. **NOT VERIFIED** on Windows in this session.

### 4.2 Playwright suite — NOT EXECUTED

`playwright.config.ts`: `testDir: ./tests/e2e`, single `chromium` project, `workers: 1`,
`fullyParallel: false`, `retries: 0`, `baseURL http://127.0.0.1:3100`, camera permission granted,
fake media-stream launch args, `webServer` = `npm run build && npm run start -- -p 3100`
(180 s timeout, `reuseExistingServer: true`).

Static count of declared test cases = **22**, consistent with `PROJECT_CONTEXT.txt`:

| Spec | cases |
|---|---|
| `accessibility.spec.ts` | 5 (one `test()` generated per route in a 5-route loop, axe WCAG 2 A/AA) |
| `camera-scan.spec.ts` | 3 |
| `platform-seo-pwa.spec.ts` | 5 |
| `product-workflows.spec.ts` | 6 |
| `search-i18n-responsive.spec.ts` | 3 |
| **Total** | **22** |

**Not executed** in this audit: the `webServer` command requires a successful `next build`, which
fails in this sandbox (§4.4), Playwright browsers are not installed here, and
`platform-seo-pwa.spec.ts` reaches the real Open Food Facts network. The "22/22 passing" claim is
therefore **NOT VERIFIED** by this audit — only the count is confirmed.

### 4.3 typecheck — EXECUTED, passes

`tsc --noEmit` → exit code 0, no diagnostics.

### 4.4 lint and build — NOT VERIFIED (environment, not code)

- `npx eslint src`: never completed inside the sandbox (repeatedly exceeded the available
  execution window, even on a single sub-directory). **No lint result can be claimed.**
- `npx next build`: fails immediately with
  `No prebuild or local build of @parcel/watcher found. Tried @parcel/watcher-linux-x64-glibc`.
  This is the same Windows-installed-`node_modules` problem as §4.1, **not** a code failure. Build
  health must be re-verified on the Windows host with `npm ci && npm run build`.

### 4.5 Commands actually defined

```
dev        next dev
build      next build
start      next start
lint       eslint src
typecheck  tsc --noEmit
test       node --import tsx --test <13 files>
test:e2e   playwright test
test:e2e:ui playwright test --ui
```

No `copy-wasm` / `predev` / `prebuild` scripts on `develop` (they exist only on `origin/main`).
No CI workflow, no Dockerfile, no `vercel.json` in the tree. A `.vercel/project.json` exists
(`projectName: "gree-check"`), so a Vercel project link exists locally.

---

## 5. Differences between code, README, docs and PROJECT_CONTEXT.txt

| Source | Claim | Reality on `develop` (`b7b57df`) | Verdict |
|---|---|---|---|
| `PROJECT_CONTEXT.txt` | domain architecture under `src/domains` | present, exactly as described | **accurate** |
| `PROJECT_CONTEXT.txt` | 108 Node tests pass | re-executed: 108/108 pass | **accurate** |
| `PROJECT_CONTEXT.txt` | 22 Playwright tests pass | 22 cases declared; execution not reproduced here | **count accurate, result unverified** |
| `PROJECT_CONTEXT.txt` | lint / typecheck / build pass | typecheck re-verified OK; lint & build not runnable in this sandbox | **partially verified** |
| `PROJECT_CONTEXT.txt` | `docs/` contains V2 architecture/migration docs, "partially dated" | `docs/` is **empty**; the five `docs/v2-*.md` files are deleted in the working tree (uncommitted deletions) | **stale** |
| `README.md` | "Next.js 14", `stores/`, `lib/constants`, `types/`, routes `basket`, `map` | Next 16; `domains/` + `services/`; `/cart`; `/map` redirects to home | **stale (V1-era)** |
| `README.md` | Ciqual/USDA "en enrichissement" | adapters exist, wiring not demonstrated | overstated |
| `AGENTS.md` (1360 lines) | original V1 cahier des charges — requires ads, shopping list, map | no ads/consent code, no shopping list on `develop`; Discover/map exists | **superseded by V2 instructions, retained as V1 spec** |
| `origin/main` (`59ad023`) | `src/lib/scoring/gree-score.ts`, single-file `test` script, ads (`components/ads/*`), consent store, `/basket` `/list` `/map`, leaflet, `src/stores/*`, `src/types/*` | true for that commit only | **stale branch, not the current work** |
| Project instructions | "shadcn/ui lorsque pertinent" | not installed | intentional divergence (internal design system) |

### 5.1 Uncommitted working-tree state (`git status`)

```
 M .env.example
 M .gitignore
 D docs/v2-component-map.md
 D docs/v2-data-flow.md
 D docs/v2-migration-plan.md
 D docs/v2-product-architecture.md
 D docs/v2-route-map.md
 M src/components/app/app-background.tsx
 M src/components/app/theme-provider.tsx
 M src/components/badges/nova-badge.tsx
 M src/components/badges/nutri-score-badge.tsx
 M src/components/scan/scan-overlay.tsx
 M src/hooks/use-barcode-scanner.ts
 M src/hooks/use-mounted.ts
 M tsconfig.tsbuildinfo
?? PROJECT_CONTEXT.txt
```

Two important findings:

1. **All seven modified `src/*` and config files are line-ending-only changes.**
   `git diff --stat -w --ignore-cr-at-eol -- src .gitignore .env.example` produces **empty output**:
   the 1 000+ line diff (notably `use-barcode-scanner.ts`, 892 lines) is CRLF/LF churn, zero
   semantic change. `tsconfig.tsbuildinfo` is a build artifact that should not be tracked.
2. **The five `docs/v2-*.md` deletions are real, uncommitted, and unrecovered.** Their content still
   exists in `HEAD` (`git show HEAD:docs/v2-product-architecture.md` works). `docs/v2-product-architecture.md`
   is itself a forensic audit of commit `afe693d` (2026-07-06) — i.e. the pre-V2 code — and its
   "delete the map / delete ads / delete shopping list" directives describe work that has since been
   done. It is a historical plan, not a description of `develop`.
3. `PROJECT_CONTEXT.txt` is **untracked** — it is not in git history at all and would be lost by a
   clean checkout.

---

## 6. Which files are stale

**Definitively stale — must not be used as a reference for V2:**

1. `README.md` — describes Next.js 14, `stores/`, `types/`, `/basket`, `/map`. Two architectures out of date.
2. `origin/main` (`59ad023`) and local `main` (`46a259e`) — the entire pre-V2 tree
   (`src/lib/scoring`, `src/stores`, `src/types`, `components/ads`, `/list`, `/map`,
   `france-geocode`/`france-places` routes, leaflet, `scripts/copy-wasm.mjs`).
3. `chore/deployment-setup` (`3e15e03`) — already merged into `main` on 2026-07-03, pre-V2.
4. The five `docs/v2-*.md` files (currently deleted in working tree): written against `afe693d`,
   their "to do" lists are mostly already executed on `develop`; `v2-migration-plan.md` is no longer
   a reliable status of remaining work.
5. `tsconfig.tsbuildinfo` — tracked build artifact producing permanent diff noise.

**Stale-but-intentional (keep, but label):**

6. `AGENTS.md` — the original V1 cahier des charges. It still requires ads and a shopping list,
   which the V2 instructions explicitly forbid. Keep it as historical intent, never as a spec.

**Current and trustworthy:**

7. `PROJECT_CONTEXT.txt` — the most accurate description of the repository found in this audit
   (every structural claim it makes was confirmed). Its only material error is describing `docs/` as
   populated. It is currently untracked.
8. `src/domains/README.md` and `src/services/storage/README.md` — short, accurate, match the code.

---

## 7. Which version must become the V2 source of truth

**`develop` @ `b7b57df` is the V2 source of truth.** Reasons, all verified:

- It is the only ref containing the domain architecture, the five-destination navigation, the
  Trust Halo / GreeDNA / verdict layer, GreeSwap, GreeCart what-if, Mes scans, criteria, localized
  PWA manifests, `robots.ts`/`sitemap.ts` and the FR/EN/AR catalogs.
- It carries the entire test estate: 13 Node test files (108 passing, re-executed today) and the
  22-case Playwright suite. `main` has **one** test file and no E2E at all.
- It is fully pushed (`origin/develop == develop`), so nothing is at risk of being lost except the
  uncommitted deletions and the untracked `PROJECT_CONTEXT.txt`.
- `main` is not a subset-plus-fixes of `develop`: it is an ancestor line that additionally contains
  features V2 deliberately removed (ads, consent, shopping list, leaflet map, `/list`). Nothing on
  `main` should be cherry-picked back without an explicit product decision.

`main` must become a *fast-forward or merge* of `develop`, not a competing implementation.

---

## 8. Risks before beginning the redesign

1. **Branch divergence risk (high).** `main` is the deployed-looking branch (`.vercel/project.json`
   exists) but is 2+ weeks and one whole architecture behind. Any deploy or hotfix from `main` today
   ships V1 with ads and the shopping list. This must be reconciled *before* redesign work starts.
2. **Untracked source of truth (high).** `PROJECT_CONTEXT.txt` — the only accurate written
   description of the codebase — is not in git. A `git clean` or fresh clone loses it.
3. **Unrecoverable-by-accident doc deletions (medium).** Five `docs/v2-*.md` files are deleted in the
   working tree but not committed. Their state is ambiguous: neither "kept" nor "removed". Whoever
   commits next will silently decide.
4. **Line-ending churn (medium).** Seven source files show a full-file diff that is pure CRLF/LF
   noise. Without a `.gitattributes` / `core.autocrlf` decision, every future diff and review on
   these files is unreadable and merge conflicts are near-certain.
5. **Tracked build artifact (low-medium).** `tsconfig.tsbuildinfo` is committed and changes on every
   typecheck, even though `.gitignore` already lists `.tsbuildinfo` and `tsconfig.tsbuildinfo`
   (the file is tracked, so the ignore rule has no effect).
6. **Unverifiable build/lint in this environment (medium).** `node_modules` is a Windows install;
   Linux/CI runs of `npm test`, `npm run lint` and `npm run build` fail for platform-binary reasons.
   Until a `npm ci` runs on the target platform, "the build passes" is a Windows-only claim.
7. **No CI (medium).** Nothing enforces lint/typecheck/test/build/E2E. The 108/22 numbers can silently
   regress between sessions; this audit exists precisely because state drifted.
8. **Network-dependent E2E (medium).** `platform-seo-pwa.spec.ts` hits real Open Food Facts data.
   It will be flaky in CI and offline, so an "all green" claim is environment-dependent.
9. **Spec conflict not yet arbitrated (high, product).** `AGENTS.md` (V1) requires ads and a shopping
   list; the V2 instructions forbid them. `docs/v2-*.md` say delete the map; Discover + `/api/places`
   are fully implemented on `develop`. Starting a redesign without arbitrating this invites
   re-adding or re-deleting features in circles.
10. **Privacy wording vs real data flow (high, compliance).** `PROJECT_CONTEXT.txt` flags that some
    UI copy claims nothing is sent to a server while barcodes, queries and coordinates transit
    `/api/*` proxies plus Nominatim/Overpass. **NOT re-verified string-by-string in this audit**, but
    it is a stated known issue and a trust/compliance risk that predates any redesign.

---

## 9. Precise recommendation for reconciling the repository

Ordered, minimal, and reversible. Nothing below was executed — this audit stops here.

**Step 1 — Freeze and capture state (before anything else)**
- `git tag audit/2026-07-20-develop b7b57df` and push the tag, so today's verified state is
  addressable forever.

**Step 2 — Decide the fate of the two orphaned artifacts**
- Commit `PROJECT_CONTEXT.txt` into git (suggested destination: `docs/v2/01-project-context.md`,
  with the `docs/` claim corrected). It is currently the most accurate document in the repository.
- Decide the `docs/v2-*.md` deletions explicitly. Recommendation: **restore them under
  `docs/archive/v1-audit/`** (`git checkout HEAD -- docs/`, then `git mv`), each with a one-line
  header "historical — describes commit `afe693d`, superseded by `docs/v2/00-repository-truth.md`".
  This preserves the reasoning without letting anyone mistake it for current architecture.

**Step 3 — Kill the line-ending noise**
- Add a `.gitattributes` (`* text=auto eol=lf`, binary rules for images/wasm), run
  `git add --renormalize .`, and commit that renormalization **alone**, with no other change.
- `git rm --cached tsconfig.tsbuildinfo` in the same commit (it is already in `.gitignore`).
- After this, `git status` must be clean apart from intentional work.

**Step 4 — Make `main` reflect reality**
- Open a PR `develop → main`. Because `develop` is not a descendant of `origin/main`
  (PR #2 merged an earlier `develop`), expect a real merge with conflicts in the removed V1 areas
  (`src/lib/scoring`, `src/stores`, `src/types`, `components/ads`, `/list`, `/map`,
  `scripts/copy-wasm.mjs`). Resolution rule: **`develop` wins on every conflict**; V1-only files are
  deleted, not merged.
- Do not squash — the 10 V2 commits are the readable history of the phase.
- Gate the merge on `npm ci && npm run lint && npm run typecheck && npm test && npm run build`
  executed on a clean checkout (Windows *and* a Linux runner).

**Step 5 — Rewrite the entry documents**
- Rewrite `README.md` from the verified §2/§3 of this document (Next 16, `domains/`+`services/`,
  the real route list, the real scripts). Until it is rewritten, it should carry a one-line
  "OUTDATED — see docs/v2/00-repository-truth.md" banner.
- Add a header to `AGENTS.md`: "V1 cahier des charges, historical. Where it conflicts with the V2
  instructions, V2 wins."

**Step 6 — Add CI before the redesign, not after**
- One workflow on `push` + `pull_request`: `npm ci`, lint, typecheck, `npm test`, `npm run build`.
- Split E2E: hermetic mocked specs on every PR; the Open Food Facts-dependent spec on a nightly
  schedule with retries.

**Step 7 — Arbitrate the product contradictions in writing (blocking for redesign)**
Record decisions in `docs/v2/02-product-decisions.md`: ads & shopping list (V1 spec vs V2 ban),
Discover/map (implemented vs "delete" in the old docs), history semantics (one entry per barcode vs
full event log), whether criteria modify the base GreeScore or only alerts/ranking, and the exact
privacy wording. Redesign work should not start on any of these five surfaces until arbitrated.

**Explicitly do not do:** do not branch the redesign off `main`, do not cherry-pick from `main`, do
not delete `main`'s history, do not commit the CRLF churn mixed with functional changes.

---

## Appendix — commands executed for this audit

```
git rev-parse --abbrev-ref HEAD / git log -1 / git branch -avv / git worktree list
git status --short / git diff --stat / git diff --stat -w --ignore-cr-at-eol
git merge-base --is-ancestor develop origin/main            → false
git ls-tree -r --name-only origin/main -- src
git show origin/main:package.json
find src -type f | sort ; find tests -type f ; ls docs (empty)
cat package.json playwright.config.ts next.config.mjs src/i18n/routing.ts
    src/lib/constants/navigation.ts src/domains/README.md README.md
node --test (13 files, Linux-native tsx loader)             → 108/108 pass, exit 0
tsc --noEmit                                                → exit 0
eslint src                                                  → did not complete (environment)
next build                                                  → failed: @parcel/watcher-linux-x64-glibc missing (environment)
git fetch                                                   → failed: no GitHub credentials
```

No file under `src/`, `tests/`, `public/`, `messages/` or any configuration file was created,
modified or deleted by this audit. The only write is this document.
