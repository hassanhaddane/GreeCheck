# GreeCheck V2 — Design System

> Component and layout rules for GreeCheck Ultimate. Tokens:
> `docs/v2/brand/tokens.json` (machine-readable) ↔ `src/app/globals.css` +
> `tailwind.config.ts` (app source of truth). Components referenced here map
> to `src/components/system/`. This document specifies the V2 target; it does
> not by itself change any production screen.

## 1. Foundations

**Colors** — see `03-brand-guidelines.md §4` and `tokens.json → gc.color`.
Non-negotiables: text on pastel/score fills always uses the `*Ink` pair;
`verdict.unknown` is neutral; neon never rests.

**Typography** — `tokens.json → gc.typography`. Fraunces = editorial moments
(verdict line, score hero, page heroes, manifesto); Inter = everything
interactive; Plex Sans Arabic in `ar`; Plex Mono for codes. Scale:
scoreHero 4rem · displayXl 3rem · display 2.25 · title 1.5 · heading 1.25 ·
bodyLg 1.125 · body 1 · small 0.875 · caption 0.75 · overline 0.6875.

**Spacing** — 4px grid; sanctioned steps 4·8·12·16·20·24·32·40·48·64·80.
Page padding 16px mobile / 24px desktop; 32px between sections. Density rule:
one idea per card, min 16px internal padding, never two unrelated data
clusters in one card.

**Radii** — sm 10px (chips, inputs) · md 16px (buttons, small cards) ·
lg 24px (cards, sheets) · xl 32px (hero cards, sheet tops) · full (pills,
rings, nav dock). Nesting rule: inner radius = outer radius − padding.

**Shadows (soft-3D)** — `soft` resting cards · `raised` sheets/popovers ·
`float` hero/dialogs · `edgeLight` inset top highlight paired with soft/raised
· `glow` motion-only. Depth expresses hierarchy: max two elevation levels
visible per screen region. Never stack shadows or use borders + heavy shadow
together.

**Iconography** — Lucide only, via `GreeIcon`: 1.75 stroke, round joins,
sizes 16/20/24, `muted` by default, `ink` when active, brand green only for
positive semantics. No filled icon set, no emoji as UI icons. Score/impact
never communicated by icon alone — always with letter/number + label.

## 2. Core components

### Cards (`GreeCard`)
Surface white, radius lg, `shadow.soft` + `edgeLight`, 16–24px padding.
Variants: **flat** (surface2, no shadow — for wells inside cards),
**interactive** (hover raises to `raised`, press scales 0.98 — whole card is
one link with a real focus ring), **pastel** (dashboard tiles: pastel bg, ink
text, no shadow), **hero** (`deep` bg, white text, radius xl, `float` —
manifesto/score hero only).

### Buttons (`GreeButton`)
Height 48px (44px min), radius md, Inter 600.
- **Primary** — `natural-grad` fill, white text; one per screen.
- **Secondary** — surface2 fill, ink text, hairline border.
- **Ghost** — text-only, `naturalStrong` text.
- **Destructive** — `score.e` text on surface2; destructive fills only inside
  confirmation sheets.
- **Success moment** — primary may take `glow` for ≤ `dur.slow` after a
  completed action; then decays to rest.
States: hover (surface shift), press (scale 0.98, fast), focus (2px
`focus-ring`, offset 2), disabled (40% opacity, real `disabled` attr, kept in
DOM only when the action can exist), loading (spinner replaces label, width
locked).

### Score components (health — GreeScore)
- **`GreeScoreRing`** — circular gauge, sizes 48/72/128. Track `line`; fill =
  grade color; numeral in Fraunces tabular; grade letter always adjacent
  (never color-only). Hero size counts up once on reveal (§ motion).
- **Grade badge (`GreeBadge`)** — pill, grade fill at 15% + `*Ink` text +
  letter. Same anatomy everywhere: search results, history, compare, cart.
- **Verdict banner (`VerdictCard`)** — the 2-second answer: verdict phrase in
  Fraunces (title size), verdict color as a 4px leading accent bar — not as a
  full background — on white; top reasons as `InsightRow` items below.
- **Sub-score tiles** — pastel cards (mint/sand/butter/sage per §1) with
  0–100 value, one-line plain-language interpretation, chevron to detail.
  A sub-score without data renders as **stone pastel + "Donnée non
  disponible"** — never a zero, never an empty gauge.

### Impact components (environment — GreeImpact)
Visually distinct from health so the two never blend: **sky pastel + skyInk**,
leaf-tile motif, and a *horizontal bar* (not a ring — rings mean health).
Anatomy: grade letter + label + one-line reason. Rendered **only with valid
data**; otherwise the section is absent (no empty state, no "E by default").
In compare/cart, impact rows are separate from health rows with their own
column header.

### Compatibility & confidence
- **Compatibility chips** — blush pastel + `dInk` text for potential
  conflicts; stone + neutral for unknown ("Non confirmé" / "Inconnu" written
  out). Never red, never an error icon for unknown.
- **Trust Halo (Data Confidence)** — badge + halo treatment around the score
  ring: full ring (élevée), dashed (bonne), half (partielles), dotted +
  explicit label (insuffisantes). Always accompanied by text; tapping opens
  the "what's missing" sheet.

### Bottom sheets (`GreeBottomSheet`)
Radius xl top, grabber handle (32×4px, `line`), `raised` shadow, scrim
`ink/40%`. Drag-to-dismiss + scrim tap + Escape; focus trapped and returned.
Heights: auto (content), half, full (leaves 8% scrim visible). On ≥ lg
breakpoint the same flows map to centered dialogs (radius lg, `float`) or
side panels — never a mobile sheet stretched to desktop width.

### Navigation
- **Mobile:** bottom dock, 5 fixed items (Scan · Search · Mes scans · Battle
  · GreeCart), 64px + safe-area, active = ink icon + natural 4px indicator
  dot + label always visible (all 5, no label-hiding). Scan is the visually
  weighted center action.
- **Desktop (≥ lg):** left side-nav, same 5 + secondary section; top bar
  carries global search.
- Secondary destinations (criteria, favorites, settings, methodology,
  privacy, Discover) live behind "More"/side-nav — never a 6th tab.

## 3. States

- **Empty** — organic illustration (small, ≤ 96px), one Fraunces line naming
  the state, one primary action. An empty state without an action is
  forbidden.
- **Loading** — skeletons (surface2 blocks + shimmer) matching final layout
  exactly (no layout shift); scanner uses its own calm viewfinder state.
  Spinners only inside buttons. Skeletons appear after 150ms delay to avoid
  flashing.
- **Error** — calm cloud illustration, plain-language cause, distinct copy per
  cause (offline ≠ not found ≠ API-limited ≠ permission denied), retry +
  fallback action (e.g. manual search). Stale-cache content shows a dated
  "données du …" chip instead of an error.

## 4. Image treatment

Product photos: contain (never crop product), surface2 well, radius md, soft
contact shadow, no tinting. Missing photo: stone well + category Lucide icon
(the `product-thumbnail` pattern) — never a substitute photo. Marketing
imagery per brand guidelines §6. All images lazy-loaded with intrinsic
dimensions (no CLS), `alt` text mandatory (product name or empty-alt for
decorative illustration).

## 5. Accessibility rules (target Lighthouse A11y > 95)

- Contrast: AA minimum everywhere; text colors only from ink/muted/`*Ink`
  tokens (pre-verified pairs).
- Meaning never by color alone: grades carry letters, verdicts carry words,
  confidence carries labels, charts carry values.
- Focus: visible 2px ring on every interactive element; logical order; sheets
  trap and restore.
- Touch: ≥ 44×44px targets, ≥ 8px gaps.
- Screen readers: real buttons/links, labeled icons, `aria-live="polite"` for
  scan results and score reveal, ring/gauge values exposed as text.
- RTL: full mirroring in `ar` (chevrons, accent bars, progress direction);
  numerals stay LTR.
- Motion: every animation honors `prefers-reduced-motion` (see
  `05-motion-system.md`).
- Language: all copy from `messages/{fr,en,ar}.json`; `lang` attribute correct
  per locale.

## 6. Responsive rules

- Design floor **360px**; test floor for everything.
- Breakpoints: 360 (floor) · 640 md · 1024 lg (nav switch) · 1200 container
  max.
- Mobile-first CSS only; desktop is an enhancement (multi-column product page:
  verdict column + explore column; compare becomes true side-by-side table).
- No horizontal overflow, no fixed heights that clip, no hover-only
  affordances; hover is an enhancement of an already-visible affordance.
- Safe areas: `env(safe-area-inset-*)` on bottom dock, sheets, action docks,
  scan overlay.
- Typography scales one step up at lg (body stays 1rem; display sizes may
  grow); touch targets never shrink on desktop below 40px for pointer
  parity.

## 7. Governance

Any new component: check `src/components/system/` first; extend before
creating; tokens only (no raw hex/px); add to this document in the same
change. The `greecheck-brand-system` skill enforces this file; conflicts
between this doc and `globals.css` values are resolved by updating **both**
in one commit.
