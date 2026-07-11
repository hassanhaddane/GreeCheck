# Domain boundaries (established in the Core Platform phase)

```
domains/
  product/    model.ts (normalized Product — the ONE product type)
              normalizer.ts (raw OFF → Product; raw shapes never leak past it)
              repository.ts (client data access: proxy fetch + IndexedDB cache)
  scoring/    gree-score.ts (pure engine) + types, thresholds, detectors, tests
  swap/       engine.ts (GreeSwap alternatives: fetch + personalized ranking)
  battle/     engine.ts (pure winner algorithm), store.ts, model.ts
  cart/       engine.ts (pure GreeCart analysis), store.ts, model.ts
  library/    history-store.ts, favorites-store.ts, model.ts ("Mes scans")
  criteria/   model.ts, store.ts, onboarding-store.ts, goals.ts
```

Rules
- Engines are pure and I/O-free; `swap/engine` is the single exception (one proxy fetch).
- UI components never consume raw API payloads and never touch IndexedDB/localStorage;
  they use the feature stores (in-memory mirrors) and domain repositories.
- Persistence lives ONLY in `services/storage` (Dexie repositories); stores write through.
- Server API adapters live in `services/api` (used by `app/api/*` route handlers only).
- `app/` imports domains; domains never import from `app/`.
