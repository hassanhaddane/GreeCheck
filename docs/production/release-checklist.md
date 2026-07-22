# GreeCheck — Release checklist

> Nothing ships with a failing gate. Companion docs: `deployment.md`,
> `security.md`, `privacy-data-flows.md`. The audit discipline itself is
> defined by the `greecheck-release-auditor` skill.

## 1. Automated gates (must all be green)

Run locally, and confirm the same jobs pass in CI:

```bash
npm run lint            # eslint src
npx eslint packages     # domain package
npm run typecheck:domain # domain purity (lib=ES2022, no DOM)
npm run typecheck       # app
npm test                # unit + integration (domain, storage, API guards)
npm run build           # production build
npm run test:e2e        # Playwright: flows, a11y (axe), visual regression
```

CI runs these as isolated jobs (`lint`, `typecheck`, `unit`, `build`, `e2e`).
A failed E2E run uploads `playwright-report/` and `test-results/` (traces,
screenshots, visual diffs) as artifacts.

- [ ] All six commands pass locally
- [ ] CI green on the release commit
- [ ] `npm audit --omit=dev` reviewed; no unresolved high/critical

## 2. Functional verification

- [ ] Core loop: scan → verdict → reasons → alternative → GreeCompare → GreeCart
- [ ] Scanner: EAN-13/EAN-8/UPC-A/UPC-E/Code 128/QR, manual entry, duplicate
      cooldown, unsupported-code state, permission denial recovery, offline
- [ ] Product page: 14 sections in order; unknown halal shows "not verified"
- [ ] GreeCompare: 2 and 3 products; incomparable case; low-confidence warning;
      health vs environment winners
- [ ] GreeCart: analysis sections, before/after simulation, replace, move to list
- [ ] Shopping list: quantity, check, clear completed, offline, survives reload
- [ ] GreeCoach: suggested questions answer; unknown free text refuses cleanly;
      no conversation persists after closing
- [ ] Every button acts; no empty section; no placeholder data

## 3. Quality bars

- [ ] Lighthouse Performance > 90 (mobile, throttled) where realistic
- [ ] Lighthouse Accessibility > 95; axe suite clean
- [ ] 360 px mobile, tablet, desktop: no horizontal overflow, no clipped
      content, no avoidable layout shift
- [ ] Arabic RTL: layout mirrored, chevrons/progress correct, numerals LTR
- [ ] `prefers-reduced-motion` honoured
- [ ] Visual regression baselines reviewed (diffs are intentional)

## 4. Post-deploy checks (against the deployed URL)

- [ ] Security headers present:
      `curl -sI https://<url>/fr | grep -iE "content-security-policy|strict-transport|x-frame|referrer|permissions-policy"`
- [ ] `/api/product/0000000000000` returns a clean typed envelope (no stack, no
      exception message)
- [ ] Rate limiting responds `429` + `Retry-After` under a burst
- [ ] fr / en / ar all render; canonical + hreflang correct for the environment
      (`NEXT_PUBLIC_SITE_URL` matches the host)
- [ ] `robots.txt` and `sitemap.xml` correct; `/list`, `/compare`, `/cart`,
      `/history`, `/favorites` are `noindex`
- [ ] `/fr/list` serves the Shopping List (NOT redirected to `/cart`)
- [ ] PWA: installable, icons render, manifest per locale, offline page
      reachable, cached recent products readable offline
- [ ] Service worker: update notification appears on a new deploy; obsolete
      cache recovers (hard-refresh after deploy, no white screen)

## 5. Privacy & independence

- [ ] `grep -riE "sentry|analytics|posthog|gtag|mixpanel|hotjar|segment" package.json src/` → no hits
- [ ] No cookie set by the app; no user identifier anywhere
- [ ] Network tab during a scan: only same-origin `/api/*` calls
- [ ] Camera frames not persisted; OCR beta image revoked on close
- [ ] Privacy page copy matches `privacy-data-flows.md`
- [ ] `NEXT_PUBLIC_OCR_BETA` unset (beta off) in production unless approved

## 6. Sign-off

- [ ] Release notes written (what changed, what to watch)
- [ ] Rollback path confirmed (`deployment.md` §5) and last-good deployment
      identified before promoting
- [ ] Final report delivered in the mandatory 11-point format
