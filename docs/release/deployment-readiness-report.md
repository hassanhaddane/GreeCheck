# GreeCheck — Deployment Readiness Report

_Branch: `develop` · Target: merge → `main` → Vercel · Date: 2026-07-24_

Format follows the project's mandatory 11-item final report.

---

## 1. Résultat obtenu

The single blocker that prevented a clean CI install and production build has been
found and fixed cleanly, and a destructive branch state has been recovered.

- **Root CI blocker (Linux native binaries) — FIXED & VERIFIED.** The lockfile was
  generated on Windows, so it only carried `win32` native nodes. Two Linux binaries
  required by the toolchain on `ubuntu-latest` were missing as *resolved* lockfile
  nodes: `@parcel/watcher-linux-x64-glibc` (file watcher) and
  `@swc/core-linux-x64-gnu` (next-intl build-time SWC plugin). Both are now declared
  as root `optionalDependencies` **and** present as resolved nodes in
  `package-lock.json`, so `npm ci --include=optional` installs them on Linux.
- **Destructive revert-merge — RECOVERED.** `origin/main` is a *revert* of the entire
  V2 (`900e4a7 Merge pull request #4 … revert-3-develop`). A prior backwards
  `git merge origin/main` into `develop` had injected conflict markers into two domain
  files and would have undone V2. `develop` was restored to the complete-V2 HEAD; zero
  conflict markers remain.

**All gates that can run in this environment are GREEN on a clean Linux install:**

| Gate | Command | Result |
|---|---|---|
| Clean install (Linux, incl. optional) | `npm ci --include=optional` | ✅ both Linux binaries installed |
| Lint (app) | `npm run lint` | ✅ pass |
| Lint (domain package) | eslint `packages` | ✅ pass |
| Typecheck (domain) | `npm run typecheck:domain` | ✅ pass |
| Typecheck (app) | `npm run typecheck` | ✅ pass |
| Unit / integration | `npm test` | ✅ 239 / 239 pass |
| Production build | `npm run build` | ✅ compiled, 55 / 55 static pages |
| SEO structured data | built HTML inspection | ✅ localized `WebApplication` JSON-LD (fr/en/ar), safe `<`-escaping |
| robots + sitemap | build artifacts | ✅ present |

**Gates that CANNOT run here (network sandbox blocks the Playwright browser
download):** functional E2E, Axe accessibility, visual regression, and Linux visual
baseline generation. These must pass on CI before "deployment ready" is declared — see
§10 and §11.

## 2. Fichiers créés

- `docs/release/deployment-readiness-report.md` (this report).

## 3. Fichiers modifiés

- `package.json` — added `@swc/core-linux-x64-gnu` to `optionalDependencies`
  (alongside the existing `@parcel/watcher-linux-x64-glibc`).
- `package-lock.json` — purely additive: the resolved `@swc/core-linux-x64-gnu`
  node (`os: [linux]`, `cpu: [x64]`, `optional: true`) plus its root reference,
  regenerated with `npm install --package-lock-only --include=optional`.

`git diff --stat` for the release: **2 files changed, 20 insertions(+), 3 deletions(-)**.
`git diff --check`: clean (no whitespace errors, no conflict markers).

## 4. Fichiers supprimés

None.

## 5. Décisions d'architecture

- **Clean lockfile fix, not a workaround.** The Linux binaries are declared as root
  `optionalDependencies` and materialised as resolved lockfile nodes, so
  `npm ci --include=optional` (the exact CI command) installs them deterministically.
  No `npm install --no-save` step, no disabling of optional dependencies, no manual
  lockfile edit, no removal of next-intl — all of which were explicitly forbidden.
- **CI installs with `--include=optional`.** `.github/workflows/ci.yml` uses
  `npm ci --include=optional` in every job (lint, typecheck, unit, build, e2e).
- **Merge direction is develop → main.** `git merge-base --is-ancestor origin/main HEAD`
  is false: `origin/main` carries the revert commit, which `develop` does not.
  The correct release action is to merge **develop into main** (re-introducing the
  complete V2). Do **not** merge `main` into `develop` — that reintroduces the revert.
  No fetch/merge/push was performed here (no credentials, and push requires your
  explicit permission).
- **Domain isolation preserved.** `packages/domain` (`@greecheck/domain`) restored to
  pristine V2: `computeCartScore`/`CartLabelKey`, `classifyHalal`, relative internal
  imports. No business-logic conflict was silently resolved.

## 6. Décisions UX

No UX changes in this task — scope was strictly deployment/CI. The complete V2 UX is
intact: 5-destination bottom nav (Scan · Search · History · Compare · Cart), progressive
disclosure, Trust Halo, GreeScore verdict-first hierarchy, GreeCompare, GreeCart analyzer,
fr/en/ar with Arabic RTL, PWA, security headers, `prefers-reduced-motion`.

## 7. Tests exécutés

On a fresh `npm ci --include=optional` tree (no workaround): `npm run lint`,
domain eslint, `npm run typecheck:domain`, `npm run typecheck`, `npm test`
(node:test via the project's own tsx), `npm run build`, plus built-HTML SEO/JSON-LD
inspection and `npm audit` classification.

## 8. Résultats des tests

- Lint (app + domain): pass.
- Typecheck (domain + app): pass, no `any` leaks, no suppressed errors.
- Unit / integration: **239 / 239 pass**.
- Production build: compiled successfully, **55 / 55** static pages generated.
- SEO: `WebApplication` JSON-LD present per locale with `applicationCategory`,
  `operatingSystem: Web`, localized `inLanguage`, and `<` escaped to `<`.

### npm audit classification (Phase 8) — no `--force`, no unvalidated upgrade applied

| Package | Sev | Scope | Safe `npm audit fix` resolves it? | Decision |
|---|---|---|---|---|
| `brace-expansion` (<1.1.16) | high | **dev-only** transitive | Yes | Not a production/deploy blocker; can be bundled into a routine dev-dep refresh. Not applied here to keep the release diff minimal and reviewable. |
| `next` (16.2.10) | high | production | **No** — advisory is fixed in **16.3.0 stable**; `16.2.11` is still inside the vulnerable range. A safe (non-`--force`) `npm audit fix` does **not** clear it. | Requires a deliberate **next 16.3.x** minor upgrade + full Playwright E2E on CI. Deferred — cannot validate E2E in this sandbox. Exposure is low: multi-locale middleware (advisory targets single-locale), no Server Actions, no custom server, static generation. |
| `sharp` (<0.35.0) | high | production | **No** — needs **0.35.0**; non-`--force` fix only nudges the platform binary within 0.34.x. | Requires `sharp` **0.35.x** minor upgrade + build validation on CI. Deferred. Exposure is low: sharp runs at **build time** for `next/image` optimization; product images come from Open Food Facts URLs, not untrusted runtime uploads. |

Applying either production fix requires `npm audit fix --force` (a minor-version framework
upgrade), which is on the forbidden list and cannot be validated here without the E2E
suite. Recommended as a **separate, CI-validated** follow-up PR (next 16.3.x + sharp 0.35.x).

## 9. Étapes de vérification manuelle

- Confirmed `npm ci --include=optional` on a clean tree logs both
  `@swc/core-linux-x64-gnu` and `@parcel/watcher-linux-x64-glibc` installed on Linux.
- Confirmed zero `<<<<<<<`/`>>>>>>>` markers in `src/` and `packages/`.
- Confirmed no hardcoded `localhost`/`127.0.0.1` in `src`/`packages`.
- Confirmed camera flow guards `isSecureContext` (HTTPS requirement) in the scanner hook.
- Confirmed `git diff` for the release is exactly `package.json` + `package-lock.json`.

## 10. Limitations restantes

- **Playwright suites (E2E, Axe a11y, visual regression) are unverified in this
  environment.** The sandbox network allowlist blocks the Chromium download, so the
  browser cannot be installed here. These gates — and the **Linux visual baselines** —
  must be generated and pass on CI (`ubuntu-latest`, pinned Playwright version) before
  production. Per your rule, **"deployment ready" is NOT declared** while these remain
  unverified.
- **Two production `npm audit` highs remain** (next, sharp), deferred to a CI-validated
  upgrade PR as explained in §8.
- **No push / no merge performed.** `git fetch origin` needs credentials unavailable
  here, and pushing requires your explicit permission. The develop→main merge is a
  manual step for you (or CI) once the Playwright gates are green.

## 11. Éléments volontairement reportés

- The **next 16.3.x** and **sharp 0.35.x** upgrades (separate CI-validated PR).
- The **dev-only `brace-expansion`** bump (routine dev-dep refresh).
- **Linux visual-regression baselines** (must be produced by CI, not committed from a
  Windows/sandbox host).
- The **final commit and merge** — see below.

---

### Suggested release commit (NOT yet committed; no push without your OK)

```
git status --short
 M package-lock.json
 M package.json

git diff --check        # clean
git diff --stat         # 2 files changed, 20 insertions(+), 3 deletions(-)

# When you're ready (and after CI's Playwright gates pass):
git add package.json package-lock.json
git commit -m "fix(release): resolve deployment and CI blockers"
```

The diff excludes `playwright-report/`, `test-results/`, `.next/`, env files, secrets,
and Windows-only snapshots.

**Honest status:** every gate runnable in this environment is green and the real CI
blocker is cleanly fixed; full "deployment ready" is contingent on CI's Playwright
E2E, accessibility, and visual-regression jobs passing on Linux.
