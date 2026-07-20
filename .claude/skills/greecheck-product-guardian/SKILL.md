---
name: greecheck-product-guardian
description: >
  Guardian of the GreeCheck product vision, launch scope, naming and independence
  principles. Use this skill BEFORE any task that adds, removes, renames or reprioritizes
  a feature, route, navigation entry or user-facing concept — including "small" additions
  like a new page, a new nav item, a new badge, or a rename of GreeLens/GreeScore/GreeSwap/
  Scan Battle/GreeCart/GreeDNA/Trust Halo/GreePulse. Also use it when a request implies
  accounts, server-side user data, ads, tracking, AI features, or anything that changes
  what GreeCheck fundamentally is.
---

# GreeCheck Product Guardian

GreeCheck is a **Food Decision OS**, not a barcode scanner. Permanent promise:
**Scan. Understand. Choose better.** Every change must serve the core journey:
scan/search → understand verdict → see reasons → find a better alternative →
compare → improve the basket.

## Mandatory principles

1. **Naming is frozen.** Feature names are product identity: GreeLens (scan),
   GreeScore (score), Trust Halo (confidence), GreeDNA (composition view),
   GreeSwap (alternatives), Scan Battle (comparison), GreeCart (basket analyzer),
   GreePulse (motion identity), Mes scans (history), Mes critères (criteria).
   Never rename, merge or alias them without explicit user instruction.
2. **Navigation is exactly five:** Scan, Search, Mes scans, Battle, GreeCart.
   Everything else (criteria, Discover, favoris, settings, methodology, privacy)
   is secondary. Alternatives (GreeSwap) stay contextual — never a main section.
3. **Independence is non-negotiable:** no accounts, no auth, no server-side user
   data or profiles, no ads, no personalization tracking, no AI features, no
   invented product information. All user data stays local (IndexedDB via
   `src/services/storage/`).
4. **Information hierarchy:** Decide (verdict in ~2s) → Understand (top reasons)
   → Explore (progressive details). Never surface advanced detail before the
   verdict and its reasons.
5. **Scope discipline:** implement only what the current task asks. Do not
   pre-build future phases; do not keep two concurrent implementations; delete
   obsolete V1 code when replacing it.

## Forbidden behaviors

- Adding a sixth main-nav destination or promoting Alternatives/Discover to main nav.
- Introducing login, signup, cloud sync, ads, analytics-for-personalization, or LLM calls.
- Inventing nutrition facts, additives, or halal status not present in source data.
- Renaming a Gree* concept "for clarity" or translating brand names in i18n files
  (brand names stay identical in fr/en/ar).
- Turning GreeCart into an e-commerce cart (prices, checkout, quantities-for-purchase).
- Shipping decorative features that don't serve decide/understand/explore.

## Examples

**Request:** "Add a login so users can sync favorites."
**Response:** Decline the account; propose local favorites (already in
`src/domains/library/favorites-store.ts`) + optional export/import of local data.

**Request:** "Rename Scan Battle to 'Compare' — it's clearer."
**Response:** Keep Scan Battle (brand identity); clarity belongs in the tagline
or supporting copy, not the name.

**Request:** "Show the full ingredient list at the top of the product page."
**Response:** No — verdict and reasons come first; ingredients stay in the
Explore layer (accordion/GreeDNA).

## Acceptance criteria

- [ ] No new main-nav entries; the five destinations are intact.
- [ ] All Gree* names unchanged across code, routes, and all three `messages/*.json`.
- [ ] No account/auth/server-profile/ads/tracking/AI code introduced.
- [ ] Change maps to a step of the core journey and respects Decide → Understand → Explore.
- [ ] No speculative future-phase code; no dead V1 duplicate left behind.
