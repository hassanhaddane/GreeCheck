# Local storage services (IndexedDB via Dexie)

- `db.ts` — schema (v2): `products` (cache, 24h TTL + stale fallback), `history`,
  `favorites`, `cart`, `battle`, `kv` (preferences / onboarding / meta flags).
- `repositories.ts` — the ONLY layer allowed to touch IndexedDB. SSR-safe.
- `boot.ts` — one-time V1 localStorage → IndexedDB migration + store hydration,
  triggered by `<LocalDataBoot />` in the locale layout.
- `local-data.ts` — user-facing wipe helpers (per store + full reset).

UI/pages must go through feature stores or these repositories — never Dexie or
localStorage directly. The only sanctioned localStorage users are the theme
bootstrap (pre-hydration flash prevention) and next-intl locale hints.
