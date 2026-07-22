# GreeCheck — Privacy & data flows

> This document is the factual counterpart of the public privacy page. If the
> two ever disagree, the code is the truth and both must be corrected.
> Constitution reference: `docs/v2/02-product-constitution.md` §7.

## 1. What GreeCheck does NOT do

Verified by inspection of `package.json` and the source tree:

- **No analytics** — no Google Analytics, Plausible, PostHog, Mixpanel,
  Amplitude, Segment or custom beacon. `connect-src 'self'` in the CSP makes a
  third-party beacon impossible even if one were added by accident.
- **No session replay** — no Hotjar, FullStory, LogRocket, Sentry Replay.
- **No user identifiers** — no account, no login, no cookie set by the app, no
  device fingerprint, no advertising ID, no cross-site tracking.
- **No server-side user profile or history** — the API routes are stateless
  proxies; nothing is written to a server database (there is none).
- **No ads, no paid placement.**

Re-verify with:

```bash
grep -riE "sentry|analytics|posthog|gtag|mixpanel|hotjar|fullstory|segment" package.json src/
```

## 2. Data that stays on the device (IndexedDB)

Never transmitted. Cleared by the user in Settings → local data.

| Store | Contents |
|---|---|
| `history` | scan history snapshots (name, score, grade, and the weekly-progress signals sugars / risky-additive count / environmental grade) |
| `favorites` | pinned history items |
| `cart` | GreeCart contents |
| `battle` | GreeCompare draft (internal table name kept for migration safety) |
| `products` | product cache with fetch timestamps (offline + stale display) |
| `kv` | preferences, onboarding state, shopping list, replacement log, migration flags |

`sessionStorage` holds exactly one ephemeral flag (`gc.cacheRecovery`) used to
prevent a reload loop during obsolete-cache recovery.

## 3. Data that leaves the device

Only to our own origin, which forwards to public sources.

| Flow | Sent | Received | Retained by us |
|---|---|---|---|
| Product lookup | barcode → `/api/product/[barcode]` → Open Food Facts | public product data | nothing server-side; response cached on device |
| Search | query string → `/api/search` → OFF Search-a-licious | public results | short-lived in-memory result cache, per server instance, keyed by the public query — no client identity attached |
| Alternatives | category → `/api/alternatives` → OFF | public results | nothing |
| Discover places | city name → `/api/places` → OpenStreetMap/Overpass | public places | nothing |

No request carries a user identifier, cookie or device ID. Requests are not
logged by application code.

**Scan logging.** GreeCheck writes no scan log. The only technically
unavoidable trace is the standard, ephemeral HTTP access log of the hosting
platform (Vercel), which records the request line and IP as part of operating
any web service. GreeCheck neither reads nor exports it. Vercel's retention is
documented at their side; nothing correlates it to a person in our system.

**Rate limiting.** The per-instance limiter (`src/lib/api/guard.ts`) derives a
coarse key from `x-forwarded-for` and holds it **in memory only**, with a
bounded map that is cleared when full and lost on every deployment/restart. It
stores no request contents — no barcode, no search term — and never touches
disk.

## 4. Camera and images

- The camera stream is used **only** for on-device barcode decoding (zxing).
  Frames are never uploaded, never written to storage, and the stream is
  stopped when the scanner unmounts or pauses.
- **OCR beta** (off in production unless `NEXT_PUBLIC_OCR_BETA=1`): the
  photograph is held as a session `blob:` object URL, processed in-browser by
  WASM, and `URL.revokeObjectURL`'d on reset and unmount. It is never uploaded
  and never persisted. Only the values the user explicitly confirms leave the
  screen — as numbers, not as an image. See `docs/adr/0001-ocr-beta.md`.
- Permissions are requested in context, with a plain explanation, and denial is
  a first-class path (manual entry / search), never a dead end.

## 5. Error monitoring

**No Sentry, no third-party error service is installed.** Errors are handled
locally and safely:

- UI errors surface as typed, translated states (offline, not found,
  rate-limited, engine failure) — never a raw exception message.
- API routes return stable machine codes only (`docs/production/security.md`
  §3); an exception message is never sent to the client.
- Server-side exceptions land in the platform's own runtime log, which is
  operational and contains no user data by construction.

**If a service is ever added**, it must, before shipping: disable session
replay; disable `sendDefaultPii`; scrub URLs so barcodes and search terms never
appear (they are user-meaningful data); ship a `beforeSend` that drops request
bodies and query strings; and be documented here field by field, plus on the
public privacy page.

## 6. Accuracy of the public copy

The privacy page and the in-app privacy notes (scan screen, weekly progress,
shopping list, GreeCoach) must state exactly the above. Any change to a data
flow requires updating: this document, the privacy page, and the relevant
in-app copy — in the same change.
