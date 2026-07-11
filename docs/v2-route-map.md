# GreeCheck V2 — Route Map

## 1. V1 routes (audited)

| Route | Type | Status in V2 |
|---|---|---|
| `/[locale]` | client page (home/hub) | **Refactor** → responsive entry: desktop = large product search hero; mobile web = GreeLens CTA; installed PWA start_url → GreeLens |
| `/[locale]/scan` (+`scan-client`) | client, `?source=basket\|battle` | **Refactor** → GreeLens `/scan`, quick-session actions |
| `/[locale]/search` | client | **Refactor** → keep debounced search + filters, server shell |
| `/[locale]/product/[barcode]` | client-only fetch | **Rebuild** → server component + `generateMetadata` + JSON-LD; public/indexable when data sufficient; 3-level hierarchy |
| `/[locale]/battle` | client | **Refactor** → confidence-aware verdict |
| `/[locale]/basket` | client | **Rename/refactor** → `/cart` (GreeCart analyzer) with redirect `basket→cart` |
| `/[locale]/list` | client | **Delete** (V2 has no shopping list) |
| `/[locale]/map` | client + leaflet | **Delete** |
| `/[locale]/settings` | client | **Split** → `/criteria` (Mes critères) + `/settings` (langue, thème, données locales) |
| `/[locale]/privacy` | client | **Refactor** → server-rendered, indexable |
| `/[locale]/[...rest]` + `not-found` | 404 | **Keep** |

API routes: `api/product/[barcode]` **keep**, `api/search` **keep**, `api/alternatives` **keep** (feeds GreeSwap), `api/france-geocode` **delete**, `api/france-places` **delete**.

## 2. Final V2 routes

**Primary navigation (mobile bottom bar — exactly 5):**

| Nav slot | Route | Notes |
|---|---|---|
| Scan | `/[locale]/scan` | GreeLens; PWA `start_url` points here |
| Search | `/[locale]/search` | desktop primary entry |
| Mes scans | `/[locale]/history` | NEW page: vertical list default, compact/timeline modes, filters, favorites tab, reuse → Battle/GreeCart |
| Battle | `/[locale]/battle` | up to 3 products |
| GreeCart | `/[locale]/cart` | analyzer, before/after simulation |

**Secondary routes:** `/criteria` (Mes critères + allergies section), `/favorites` (or a tab inside `/history` — decision recorded in component map), `/settings` (langue, thème, gestion des données locales), `/privacy`, `/methodology` (NEW — scoring methodology, sources, confidence), `/` (marketing/adaptive home).

**Public SEO surfaces:** `/`, `/product/[barcode]` (only when data confidence permits; `noindex` on `not_found`/insufficient), `/methodology`, `/privacy` — all three locales, hreflang + canonical, localized metadata, sitemap.xml + robots.txt via `app/sitemap.ts` and `app/robots.ts`.

**Redirects:** `/basket → /cart`, `/list → /cart` (301, in proxy/middleware or `next.config` redirects). `/map` → 410/redirect home.

## 3. Entry logic (no user-agent routing)

- `manifest.webmanifest`: `start_url: "/scan?src=pwa"` (locale negotiated by middleware), `display: standalone`.
- Mobile web `/`: hero CTA "Scanner un produit" → `/scan` (explicit user action).
- Desktop `/`: large search input → `/search?q=…`; scan offered secondarily when `mediaDevices` exists (capability check, not UA).
- Locale negotiation stays in `src/proxy.ts` (next-intl middleware), `localePrefix: "always"`, ar = RTL.
