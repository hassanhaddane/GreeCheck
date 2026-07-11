# GreeCheck V2 — Component Map

## 1. Inventory and fate

### `components/ui` (primitives) — KEEP
`button`, `card`, `premium-card`, `chip`, `collapsible-section`, `empty-state`, `error-state`, `floating-action`, `privacy-pill`, `section-title`, `skeleton`. Refactor pass only: tokens, RTL, focus-visible, reduced-motion.

### `components/app` (shell) — KEEP/REFACTOR
- `app-shell`, `top-bar`, `side-nav`, `bottom-nav` — keep; bottom-nav becomes the 5 V2 destinations (Scan, Search, Mes scans, Battle, GreeCart); remove "home" from the bar (home stays reachable via logo).
- `theme-provider`, `theme-toggle`, `language-switcher`, `install-prompt`, `pwa-register`, `logo`, `page-heading`, `app-background` — keep.

### `components/badges` — KEEP
`nutri-score-badge`, `nova-badge`, `label-badge`. Single source for grade colors (kills the duplicated `GRADE_BG` maps).

### `components/score` — REFACTOR
- `score-ring` — keep.
- `health-badge`, `score-breakdown` — fold into the new verdict/explore components below.

### `components/scan` — REFACTOR → GreeLens
`scan-overlay`, `scan-frame-shape` + `hooks/use-barcode-scanner` (keep hook). Add quick-session action row (open result / +Battle / +GreeCart / scan next).

### `components/search` — KEEP/REFACTOR
`filter-panel`, `product-result-card` (labels → i18n catalogs).

### `components/product` — REBUILD
- `product-card` — keep.
- `alternatives` — rebuild as GreeSwap (trigger rules, measurable improvement, never empty).
- `nutrition-radar` — DELETE (decorative) → replaced by GreeDNA.

### `components/battle` — KEEP/REFACTOR
`battle-card`, `podium`, `comparison-table`, `axis-bars`, `add-sheet` — keep; verdict becomes confidence-aware; podium stays premium.

### `components/basket` — REFACTOR → cart/
`basket-item-card`, `replacement-suggestions` → GreeCart components (keep/reconsider/replace groups, distributions, improvement plan, before/after simulation).

### DELETE
`components/ads/ad-slot`, `components/ads/consent-banner`, `components/map/leaflet-map`.

## 2. New V2 components (to build in later phases)

| Component | Level | Purpose |
|---|---|---|
| `VerdictCard` | Décider | verdict (6 states incl. "Peu adapté à votre objectif", "Ultra-transformé", "Données insuffisantes"), score, grade — readable in ~2 s |
| `TrustHalo` | Décider | 4 confidence labels; distinguishes confirmé / non confirmé / inconnu / incomplet / potentiellement incompatible |
| `ReasonChips` | Comprendre | 2–4 main reasons only |
| `CompatibilityAlerts` | Comprendre | user-criteria conflicts (halal, allergens) — separate channel from quality |
| `GreeDNA` | Explorer | compact composition view (nutrition, transformation, additives, ingredient quality, bio, environment) — every visual carries an interpretation |
| `ExploreAccordion` | Explorer | sub-scores, ingredients, additives, allergens, nutrition table, methodology link, sources, confidence |
| `GreeSwapSection` | contextual | alternatives with measurable improvement, same precise category |
| `QuickScanBar` | GreeLens | post-detection actions (result / +Battle / +GreeCart / next) |
| `HistoryList` + `HistoryFilters` | Mes scans | list/compact/timeline, date/score/quality/category filters, favorites |
| `CartPlan` / `CartSimulation` | GreeCart | improvement plan + deterministic before/after |
| `GreePulse` | identity | subtle animated identity reacting to scan/result/swap/battle/cart events; respects `prefers-reduced-motion` |

Decision: favorites live as a tab inside `/history` (one surface, one repository), with `/favorites` redirecting there.

## 3. Cross-cutting UI rules
- One dominant primary action per screen; progressive disclosure (accordions, bottom sheets); never render empty sections or inactive buttons; unknown data is labeled unknown — never styled as negative; no information conveyed by color alone; RTL-safe (`rtl:` variants already in use); neon green only for scan/focus/motion/success.
