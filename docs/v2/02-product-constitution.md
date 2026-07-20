# GreeCheck V2 — Product Constitution

> **Status: highest-level product source of truth.**
> Precedence: this constitution → `docs/v2/01-skills-guide.md` and the
> `.claude/skills/` invariants → `docs/v2/00-repository-truth.md` (descriptive
> audit) → code comments. Any conflict is resolved in this order; a deliberate
> change to this document must be made explicitly and propagated to the skills
> in the same commit.
> Created 2026-07-20 on `develop`.

---

## 1. Product

| Item | Definition |
|---|---|
| Name | **GreeCheck** |
| Tagline | **Every scan improves your habits** |
| Initial market | France |
| Long-term ambition | International (fr / en / ar shipped from day one; ar with correct RTL) |
| Initial category | Packaged food (barcoded retail products) |
| Business model | Free, donation-supported |
| Paid placement | **Never.** No product, brand or retailer can pay to appear, rank, or be recommended |
| Brand influence | **None.** Scores and recommendations are computed from public data by a versioned, published methodology; brands cannot alter them |
| User accounts | None at launch. No signup, no login, no server-side profile |
| Behavioral analytics | None. No tracking of what users scan, search, or choose |

GreeCheck is a **Food Decision OS**: scan → understand → choose better. The
tagline states the outcome; the journey delivers it. A scanner tells you what a
product is; GreeCheck tells you what to do about it.

## 2. Primary user questions

Every screen must serve one or both of these questions, in this order:

1. **Is this product good or bad?** — answered in ~2 seconds by a verdict,
   then justified by its top reasons.
2. **What is its impact on health and on the planet?** — answered by two
   **separate** assessments: health (GreeScore) and environment (GreeImpact).
   They are never blended into one number; a healthy product can be
   environmentally poor and vice versa, and the user deserves to see both.

Everything else — sub-scores, ingredients, additives, methodology — exists to
deepen these answers, never to precede them.

## 3. Core product pillars

1. **Instant scan** — camera-ready on open (installed PWA), fast detection,
   calm interface, rapid-scan sessions without dead ends.
2. **Transparent universal health score** — one deterministic 0–100 GreeScore
   with grade, verdict and reasons; every point explainable; methodology public.
3. **Separate environmental impact** — GreeImpact is displayed and reasoned
   about independently of health, and only when valid data exists.
4. **Advanced comparison** — GreeCompare puts up to three products side by
   side with a justified winner, not just a bigger number.
5. **Whole-cart analysis** — GreeCart evaluates the basket as a whole and
   proposes a concrete, simulated improvement plan.
6. **Cultural and allergen compatibility** — GreeCompatibility (halal,
   allergens, diet restrictions) is a personal-fit dimension, never a quality
   judgment, and unknown is never treated as incompatible.
7. **Superior mobile experience** — one-handed, thumb-first, mid-range-phone
   fast, installable, offline-tolerant.
8. **Independence** — structurally guaranteed by the charter in §6; not a
   marketing claim but an architecture (no accounts, no ads, no trackers, no
   commercial data flows).

## 4. Launch scope (one month)

### In scope for launch

- **Scan (GreeLens):** barcode/QR scan, permission recovery, manual search
  fallback, rapid-scan session (result → add to compare/cart → next).
- **Product decision page:** verdict ≤ 2s, top reasons, GreeScore with grade,
  Data Confidence, GreeImpact when valid, GreeCompatibility alerts,
  progressive detail (sub-scores, GreeDNA composition view, ingredients,
  additives, allergens, nutrition, sources).
- **Alternatives (contextual only):** shown when score < 50, grade D/E, or a
  critical user criterion conflicts; always same category, better score,
  measurable improvement, no major trade-off.
- **GreeCompare:** up to three products from scan, search, history, favorites;
  winner + short verdict + key differences + confidence-aware judgment.
- **GreeCart:** basket score, keep/reconsider lists, priority replacements,
  Nutri-Score/NOVA distributions, organic ratio, deterministic what-if
  simulation.
- **Search** with smart filters; **Mes scans** (local history, filters,
  favorites); **Mes critères** (optional, never blocking first use).
- **Foundation:** fr/en/ar + RTL, PWA install + offline page, methodology and
  privacy pages, public SEO pages, local-data management (view/delete).

### Deferred (explicitly out of the one-month launch)

- **GreeCoach** and **Weekly Progress** (§5) — require longitudinal local
  aggregation and coaching content; launch ships the raw material (local
  history) only.
- Accounts and any cross-device sync; community features; contribution flows
  to Open Food Facts beyond what exists.
- Non-food categories (cosmetics, household); markets beyond France; languages
  beyond fr/en/ar.
- Ciqual/USDA fallback activation (adapters stay present but inactive until a
  documented justification exists).
- Native app store distribution; push notifications; widgets.

Deferral is a scope decision, not a quality one: nothing ships half-built to
"preview" a deferred feature. No empty sections, no teaser buttons.

## 5. Core concepts

| Concept | Definition | Status at launch |
|---|---|---|
| **GreeScore** | The universal health decision score (0–100, grade A–E, verdict, reasons, sub-scores). Deterministic, versioned, explainable. Health only — environment and compatibility never move it | Launch |
| **GreeImpact** | The environmental impact assessment, separate from GreeScore. Rendered only with valid data (Green-Score grade today); absent otherwise — never estimated | Launch |
| **GreeCompatibility** | Personal-fit layer: halal, allergens, diet restrictions. States are confirmed / not confirmed / unknown / incomplete / potentially incompatible. A compatibility fact, never a quality score | Launch |
| **Data Confidence** | Reliability of the result (data completeness, source quality, ingredient/nutrient availability). Levels: Confiance élevée / Bonne confiance / Données partielles / Données insuffisantes. Missing data lowers confidence, never health quality | Launch |
| **GreeCompare** | Side-by-side comparison of up to three products with a justified, confidence-aware winner | Launch |
| **GreeCart** | Whole-basket analyzer (not an e-commerce cart): basket score, improvement plan, deterministic before/after simulation | Launch |
| **GreeCoach** | Educational guidance built on the user's own local history: recurring patterns ("your breakfasts are the weak point"), actionable nudges. Local computation only | Deferred |
| **Weekly Progress** | Local weekly summary showing whether scans and swaps improved the user's habits — the tagline made measurable. Local computation only | Deferred |

### Naming reconciliation with the current codebase

This constitution supersedes prior naming. Mapping for the existing `develop`
implementation:

| Constitution concept | Current implementation | Action |
|---|---|---|
| GreeCompare | "Scan Battle" (`src/domains/battle/`) | Battle is the internal engine; user-facing naming migrates to GreeCompare during V2 UI work |
| GreeImpact | Environment bucket + Green-Score display | Consolidate under the GreeImpact name, kept separate from GreeScore |
| GreeCompatibility | Halal/allergen detectors + criteria alerts | Consolidate under the GreeCompatibility name |
| Data Confidence | "Trust Halo" (`trust-halo.tsx`) | Trust Halo remains the visual component name; the concept is Data Confidence |
| GreeLens, GreeScore, GreeCart, GreeDNA, GreePulse, GreeSwap, Mes scans, Mes critères | unchanged | Keep |

Code renames are **not** part of this document's scope; they happen in the V2
tasks that touch each surface, guided by `greecheck-product-guardian`.

## 6. Independence charter

**Funding.** GreeCheck is funded by voluntary user donations and nothing else.
Donations buy nothing: no features, no influence, no visibility, no data.
Operating costs and funding sources are published on the methodology page.

**Donations.** One-off and recurring donations are accepted through a payment
provider that receives only what payment legally requires; donation status is
never linked to product data or app behavior, and the app works identically for
donors and non-donors.

**Affiliation transparency.** GreeCheck has no affiliate links, referral
revenue, or retailer partnerships at launch. If any affiliation is ever
considered, it must be (a) disclosed inline at the point of display, (b)
provably without effect on scores, rankings, or alternatives, and (c) added to
this charter first — otherwise it does not ship.

**Methodology governance.** The scoring methodology is versioned, public
(/methodology), and changes only through documented revisions: what changed,
why, and from which version. The formula, thresholds, and additive registry
live in code as the single source of truth (`src/domains/scoring/`), with the
public page kept in sync. No unpublished scoring rules.

**Conflicts of interest.** No one with a commercial stake in a scored product
or brand may decide scoring rules. Data sources are public (Open Food Facts;
Ciqual/USDA as justified fallbacks only). GreeCheck holds no private brand
data agreements.

**Corrections.** Anyone — users and brands alike — can report a data or
scoring error. Corrections go through data (fix at the source or in the
normalizer) or through a published methodology revision; never through a
manual override of one product's score. Brands get the same correction channel
as everyone else, and nothing more.

**Brand relationships.** No paid placement, no sponsored products, no brand
advertising, no "verified brand" programs, no early access to scores. Brand
logos and names appear only as factual product identification.

## 7. Privacy

**Stays on the device (IndexedDB), never sent anywhere:** preferences and
criteria, scan history, favorites, onboarding state, GreeCart contents,
comparison selections, product cache, and (when built) GreeCoach/Weekly
Progress aggregates. All of it is viewable and deletable in local data
management; deletion is immediate and complete.

**Sent to product APIs:** the scanned barcode or search query — the minimum
needed to fetch public product data (via the app's own API proxy to Open Food
Facts). Requests are not tied to any user identifier; there are no accounts
and no server-side history.

**Never stored, anywhere:** camera frames or images (barcode decoding happens
on-device and frames are discarded), location trails, device fingerprints,
behavioral events, or any linkage between a person and what they scan.

**Camera permission:** requested in context at first scan with a plain
explanation; denial is respected with a calm recovery path (settings guidance +
manual search as a first-class fallback). Never requested at app open before
the user reaches scan intent — except in the installed PWA whose declared entry
IS the scanner.

**Location permission:** used only for explicit user actions (e.g. Discover
map), requested at the moment of use, never in the background, never stored
beyond the immediate request, and the feature degrades gracefully without it.

**No behavioral analytics.** No third-party trackers, no session replay, no
personalization profiles. Any future aggregate telemetry would require: opt-in,
anonymity by design, a public description, and an update to this constitution
first.

## 8. Language and voice

GreeCheck speaks **premium, direct, educational, activist**:

- **Premium** — calm, precise, unhurried. No exclamation-mark enthusiasm, no
  dark patterns, no urgency mechanics.
- **Direct** — verdict first, plainly: "Trop sucré pour un produit du matin,"
  not "this product may contain elevated levels of…". Short sentences over
  hedged paragraphs.
- **Educational** — every judgment teaches its reason; jargon (NOVA,
  Nutri-Score, E-numbers) is always accompanied by a one-line plain-language
  explanation. The user should leave each scan slightly more literate.
- **Activist** — GreeCheck takes sides for transparency and against
  ultra-processing opacity; it names problems without euphemism. Its target is
  the food system, never the user.

**Hard limits:**

- **No medical claims.** GreeCheck informs food decisions; it never diagnoses,
  treats, promises health outcomes, or advises on medical conditions. No
  "boosts immunity," no "helps you lose weight."
- **No moralizing.** Never shame a choice, a basket, or a habit. "À limiter,"
  not "bad for you"; progress framing, not guilt framing. The user is the
  decision-maker; GreeCheck is the informed friend, not the judge.
- **No false certainty.** Confidence language must match Data Confidence:
  low-confidence results are presented as provisional, and unknown is stated
  as unknown — never dressed up as either safe or dangerous.
- All user-facing copy lives in `messages/{fr,en,ar}.json`; the voice above
  applies in all three languages.

---

*End of constitution. Changes to this document are product decisions: they
must be explicit, versioned in git, and propagated to `.claude/skills/` and
the public methodology/privacy pages in the same change.*
