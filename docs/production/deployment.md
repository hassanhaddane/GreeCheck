# GreeCheck — Deployment

> Target: Vercel (staging + production), Next.js 16, Node 20.
> There is no database, no auth provider and no server-side user state, so a
> deployment is a pure code+static-assets rollout.

## 1. Environments

| Environment | Branch | URL | Purpose |
|---|---|---|---|
| Preview | any PR | auto Vercel preview | review a change in isolation |
| Staging | `develop` | `staging.greecheck.app` | pre-production verification, OCR beta may be ON |
| Production | `main` | `greecheck.app` | public |

Promotion path: PR → `develop` (staging) → PR `develop` → `main` (production).
CI (`.github/workflows/ci.yml`) must be green on both merges.

## 2. Environment variables

All are build-time or server-side; none contains a user secret.

| Variable | Scope | Required | Default | Notes |
|---|---|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | build | **yes** in prod/staging | `https://greecheck.app` | canonical + hreflang + sitemap. Must match the environment or SEO breaks. |
| `NEXT_PUBLIC_OCR_BETA` | build | no | off in prod, on elsewhere | `"1"` enables the OCR beta; `"0"` force-disables. Keep unset (=off) in production until the beta is approved. |
| `NEXT_PUBLIC_OFF_BASE_URL` | server | no | `https://world.openfoodfacts.org` | Open Food Facts base. |
| `OFF_SEARCH_BASE_URL` | server | no | `https://search.openfoodfacts.org` | Search-a-licious endpoint. |
| `OFF_USER_AGENT` | server | **recommended** | `GreeCheck/0.1 (contact@greecheck.app)` | OFF requires an identifying UA with a contact. Set a real contact address in production. |
| `OVERPASS_API_URL` | server | no | public Overpass | Discover map places. |
| `OSM_USER_AGENT` | server | recommended | as above | same courtesy rule as OFF. |

Set them in Vercel → Project → Settings → Environment Variables, per
environment. `NEXT_PUBLIC_*` values are inlined at build time: changing one
requires a **redeploy**, not just a restart.

## 3. Build & runtime

```bash
npm ci
npm run build      # next build — 55 prerendered pages
npm start          # next start (Vercel does this for you)
```

- Node 20 (`engines.node >= 20.19`).
- Output: statically generated locale pages + a few dynamic routes + 4 API
  routes running on the Node.js runtime.
- No build step is required for the domain package: it is compiled from source
  through the `@greecheck/domain/*` path alias.

## 4. Deploy

1. Merge to the target branch; Vercel builds automatically.
2. Watch the build log for `✓ Compiled successfully` and the static-page count
   (should be 55 unless routes were added).
3. Run the post-deploy checks in `release-checklist.md` §4 against the
   deployed URL.

## 5. Rollback

Production rollback is instant and does not touch user data (all user data is
on-device and forward/backward compatible).

**Preferred — Vercel instant rollback:**
1. Vercel → Project → Deployments.
2. Find the last known-good production deployment.
3. **⋯ → Promote to Production** (or "Rollback"). Propagation is seconds.
4. Confirm the site serves the previous build (check a changed string or the
   build ID in the page source).

**Git rollback (when the bad commit must leave the branch):**
```bash
git revert <sha>        # or: git revert <merge-sha> -m 1
git push origin main    # triggers a clean redeploy
```

**Service-worker consideration.** A rollback changes the asset fingerprints.
Returning users may hold a cached shell that references the newer, now-absent
chunks. The app recovers automatically: the client detects a chunk-load
failure, asks the service worker to drop all caches (`CLEAR_CACHES`) and
reloads once. To force the issue for everyone, bump `VERSION` in
`public/sw.js` in the rollback commit — the activate handler then deletes every
older cache.

**What rollback never touches:** IndexedDB contents (history, favorites, cart,
comparison, shopping list, preferences). Schema changes are additive and old
rows degrade gracefully, so an older build reads newer data safely.

## 6. Post-rollback

Open an incident note recording: what broke, which deployment was promoted,
whether a SW version bump was needed, and the fix-forward plan.
