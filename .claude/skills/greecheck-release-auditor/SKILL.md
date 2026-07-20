---
name: greecheck-release-auditor
description: >
  Final release audit for GreeCheck: visual, functional, accessibility, PWA, SEO/i18n,
  privacy and production-readiness. Use this skill when a feature or phase is declared
  "done", before any merge to main or Vercel deployment, and whenever the user asks to
  "verify", "audit", "check everything", "is it ready", or "prepare the release". Also
  use it to validate the mandatory final report format after any implementation task —
  no task is complete until this audit passes.
---

# GreeCheck Release Auditor

Never announce a task as finished if the build fails, actions are fake,
responsive is broken, or acceptance criteria are unverified. This skill is the
gate.

## Mandatory principles

1. **Evidence over assertion.** A gate "passes" only when its command or manual
   check was actually executed in this session, with output to show.
2. **Full sequence, no shortcuts.** Every section below runs even for "small"
   changes — regressions live in the parts you didn't touch.
3. **Failures are findings, not detours.** A failed check is reported first;
   fixing it restarts the affected gates.
4. **The report is the deliverable.** The 11-point format below is mandatory
   after every implementation task, verbatim structure.

## Audit sequence (run in order, report each result)

### 1. Static gates

```bash
npm run lint        # eslint src — zero errors
npm run typecheck   # tsc --noEmit — zero errors, no `any` introduced
npm test            # unit tests (Windows: run via /tmp tsx per repo tooling memory)
npm run build       # production build must succeed
npm run test:e2e    # Playwright (includes @axe-core/playwright a11y checks)
```

### 2. Functional audit

- Core journey end-to-end: scan/search → product verdict → reasons → GreeSwap
  (only when score < 50, grade D/E, or critical criterion conflict) → Battle →
  GreeCart.
- Real states, not mockups: every button acts, every empty state has an action,
  no dead sections, no duplicated badges, no placeholder data.
- Error paths: camera permission denied, product not found, offline, API-limited,
  stale cache — each shows its distinct honest UI.

### 3. Visual & responsive audit

- Tokens only (see greecheck-brand-system); neon restricted to scan/focus/
  success; verdict readable in ~2 seconds.
- 360px mobile, tablet, desktop, and `ar` RTL: no horizontal overflow, no
  clipped fixed heights, no avoidable layout shift; safe areas respected.

### 4. Accessibility audit (target Lighthouse A11y > 95)

- Keyboard-navigable with visible focus; sheets trap and restore focus.
- Labels/aria on all interactive elements and score visualizations; grade
  never conveyed by color alone (letters + text accompany `score-*` colors).
- `prefers-reduced-motion` honored; touch targets ≥ 44px; AA contrast
  (`score-*-ink` variants for text).

### 5. PWA & performance audit (target Lighthouse Perf > 90)

- Installed PWA opens GreeLens camera-ready; localized manifest route serves
  correct name/icons; offline page reachable.
- Scanner starts fast; heavy modules (zxing, camera, map) dynamically imported;
  no duplicate API calls; images optimized; stable on mid-range mobile.

### 6. Privacy & independence audit

- No account, auth, server-side user data, ads, tracking or AI calls.
- All personal data local (IndexedDB): preferences, history, favorites,
  onboarding, GreeCart, Battle, product cache — deletable via local data
  management in settings.
- Privacy page matches actual behavior; no network request leaks scan history.

### 7. SEO & i18n audit

- Server-rendered metadata, canonical URLs, localized titles/descriptions for
  fr/en/ar; valid structured data; `robots.ts` + `sitemap.ts` coherent.
- No indexation of empty/error pages; zero hard-coded visible strings outside
  `messages/*.json`; RTL correct.

## Forbidden behaviors

- Declaring success with any failing gate, skipped step, or unverified criterion.
- "It should work" without executing the check; auditing only the happy path.
- Fixing audit findings silently without reporting them.

## Examples

**Situation:** Build passes but 2 Playwright a11y tests fail.
**Do:** Task stays unfinished. Report the failures, fix, rerun `test:e2e` and
the build, then report both runs.

**Situation:** "Just deploy, it's a one-line CSS fix."
**Do:** Run at least lint + typecheck + build, plus §3 responsive spot-check on
the affected screen (incl. RTL) before agreeing it's ready.

**Situation:** Feature works on desktop; mobile untested.
**Do:** Not done. Verify 360px mobile + safe areas + scan flow before reporting.

## Mandatory final report

Exactly this structure: 1. Résultat obtenu · 2. Fichiers créés · 3. Fichiers
modifiés · 4. Fichiers supprimés · 5. Décisions d'architecture · 6. Décisions
UX · 7. Tests exécutés · 8. Résultats des tests · 9. Étapes de vérification
manuelle · 10. Limitations restantes · 11. Éléments volontairement reportés.

## Acceptance criteria

- [ ] All five commands in §1 pass with zero errors.
- [ ] Every audit section executed and reported with pass/fail + evidence.
- [ ] Any failure blocks the "done" claim; findings listed under Limitations.
- [ ] Final report delivered in the exact 11-point format.
