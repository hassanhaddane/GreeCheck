# GreeCheck — Security

> Scope: the production web app (Next.js on Vercel) and its stateless API
> proxies. There is no user database, no authentication and no session: the
> classic account-related attack surface does not exist here.

## 1. Response headers

Set for every route in `next.config.mjs`:

| Header | Value | Why |
|---|---|---|
| `Content-Security-Policy` | see §2 | limits where code/data can come from |
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains; preload` | HTTPS only |
| `X-Content-Type-Options` | `nosniff` | no MIME sniffing |
| `X-Frame-Options` | `DENY` + `frame-ancestors 'none'` | no clickjacking |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | no path/query leakage to third parties |
| `Cross-Origin-Opener-Policy` | `same-origin` | process isolation |
| `Cross-Origin-Resource-Policy` | `same-origin` | no cross-site embedding of our resources |
| `Permissions-Policy` | `camera=(self), geolocation=(self), microphone=(), payment=(), usb=(), interest-cohort=()` | only the two permissions the product actually uses; FLoC off |
| `X-Robots-Tag: noindex` on `/api/*` | | proxies are not content |

`poweredByHeader` is disabled.

## 2. Content-Security-Policy

```
default-src 'self';
script-src 'self' 'unsafe-inline';        (+ 'unsafe-eval' outside production)
style-src 'self' 'unsafe-inline';
img-src 'self' data: blob: https://images.openfoodfacts.org
        https://world.openfoodfacts.org https://static.openfoodfacts.org;
font-src 'self' data:;
connect-src 'self';
worker-src 'self' blob:;
media-src 'self' blob:;
object-src 'none'; base-uri 'self'; form-action 'self';
frame-ancestors 'none'; upgrade-insecure-requests
```

**Why `'unsafe-inline'` for scripts.** The app statically generates 55 pages. A
nonce-based CSP requires a per-request nonce, which forces every route to
render dynamically and destroys static generation and edge caching. We accept
`'unsafe-inline'` for the Next.js bootstrap and compensate by keeping
`connect-src`, `object-src`, `base-uri`, `form-action` and `frame-ancestors`
strict: an injected script has nowhere to send data and nothing to embed.

**Tightening path** (when justified): move to hash-based `script-src` for the
Next bootstrap, or introduce a middleware nonce for the small set of routes
that are already dynamic.

**OCR beta note.** `worker-src blob:` and `'unsafe-eval'` (non-production) exist
for the WASM OCR beta. `connect-src 'self'` means the engine must be served
from our own origin: if the beta is enabled in production, self-host the
tesseract assets rather than widening `connect-src` to a CDN.

## 3. API proxies

All four routes (`/api/product/[barcode]`, `/api/search`, `/api/alternatives`,
`/api/places`) are stateless: they forward a public query to a public source
and return public data. They never receive or store user data.

- **Input limits** — barcode reduced to digits and length-checked; search query
  capped at 120 chars; category capped at 120 chars; `page`/`pageSize` clamped
  with `clampInt` (`src/lib/api/guard.ts`).
- **Upstream timeouts** — every upstream call uses
  `AbortSignal.timeout(8000)`; a hung upstream can never hang a route.
- **Rate protection** — fixed-window per-client limiter (`rateLimit`):
  60 req/min for product lookups, 30 req/min for search and alternatives.
  Exceeding it returns `429` with `Retry-After`. The bucket key is a coarse,
  in-memory, per-instance value that is never persisted (see the privacy doc).
- **Consistent error envelopes** — every failure returns
  `{ "status": "error", "error": "<stable_code>" }` with codes
  `invalid_request | invalid_barcode | invalid_query | rate_limited |
  upstream_unreachable | upstream_unavailable | upstream_invalid_payload`.
- **No raw exception messages.** Verified by the unit tests in
  `src/lib/api/guard.test.ts`; the previous `message: (err as Error).message`
  leak in `/api/alternatives` was removed during hardening.
- **Runtime validation of external payloads** — responses are parsed
  defensively (`safeJson` rejects non-JSON/HTML error pages) and validated as
  objects (`expectRecord`) before mapping. An upstream that changes shape
  degrades to `upstream_unavailable`; it never throws into a route.

## 4. External URLs

- Product images are restricted by `next/image` `remotePatterns` to three Open
  Food Facts hosts, and by `img-src` in the CSP.
- Outbound links (Open Food Facts product/edit pages, used for "report a data
  issue") are built from a digits-only barcode by
  `src/domains/product/contribute.ts` and always carry
  `target="_blank" rel="noreferrer"`. No user-supplied URL is ever rendered as
  a link.

## 5. Client-side storage

Everything personal lives in IndexedDB on the device (preferences, history,
favorites, GreeCart, comparison draft, shopping list, product cache,
replacement log). It is user-clearable from Settings. `sessionStorage` is used
for exactly one ephemeral flag: the obsolete-cache reload guard.

## 6. Dependencies

`npm ci` in CI pins the lockfile. Run `npm audit --omit=dev` before a release
(see the release checklist). There is no analytics, tracking or session-replay
dependency in the tree — this is verified by the privacy doc's grep.
