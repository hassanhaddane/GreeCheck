---
name: greecheck-mobile-ux
description: >
  Enforces mobile-first interaction for GreeCheck: scanner ergonomics (GreeLens), bottom
  sheets, thumb reach, touch targets, safe areas, five-tab bottom nav, and responsive
  behavior mobile → tablet → desktop. Use this skill whenever a task creates or modifies
  a page, layout, navigation, overlay, sheet, camera/scan flow, or any interactive element
  — even for "desktop" work, since every screen must degrade gracefully to a mid-range
  phone. Also use it when reviewing responsive bugs, keyboard/focus behavior on mobile,
  PWA entry flow, or anything touching src/components/app/ and src/components/scan/.
---

# GreeCheck Mobile UX

GreeCheck is used one-handed, in a supermarket aisle, on a mid-range phone.
Mobile is the primary reality; desktop is the adaptation.

## Source of truth

- Shell & nav: `src/components/app/` (app-shell, bottom-nav, top-bar, side-nav).
- Sheets: `src/components/system/gree-bottom-sheet.tsx` — the only overlay
  pattern on mobile.
- Scan: `src/components/scan/` + `src/app/[locale]/scan/` (GreeLens).
- Entry rules: installed PWA opens GreeLens camera-ready; mobile web offers an
  immediate "open GreeLens" CTA; desktop starts with large product search.
  Decide via routes, responsive design, display-mode and explicit user actions —
  never user-agent sniffing alone.

## Mandatory principles

1. **One dominant action per screen.** Everything else is secondary or lives
   behind progressive disclosure (accordions, sheets, contextual actions).
2. **Thumb-first.** Primary actions in the bottom half; bottom nav has exactly
   five items (Scan, Search, Mes scans, Battle, GreeCart); touch targets
   ≥ 44×44px with adequate gaps.
3. **Safe areas.** Respect `env(safe-area-inset-*)` for bottom nav, sheets,
   action docks and the scan overlay. Nothing hides behind notches or the home
   indicator.
4. **Scanner ergonomics.** Camera starts fast, stays calm (neon feedback only
   during detection), permission loss recovers with a clear path, and rapid-scan
   sessions flow: result → add to Battle/GreeCart → scan next, without dead ends.
5. **Sheets over modals.** On mobile, secondary flows use GreeBottomSheet with
   drag-dismiss and focus trapping; desktop may map the same flow to
   panels/popovers.
6. **Responsive without breakage.** No horizontal overflow, no fixed heights
   that clip content, no layout shift on load. Verify mobile, tablet, desktop
   and RTL (`ar`).

## Forbidden behaviors

- Adding nav items, hamburger-only navigation on mobile, or hiding the five tabs
  on core screens.
- Top-anchored primary CTAs, hover-only interactions, or targets < 44px.
- Blocking the scan flow with interstitials, empty states with no action, or
  permission errors that dead-end.
- User-agent-only routing decisions.
- Desktop-first CSS retrofitted with `max-width` patches.

## Examples

**Request:** "Add advanced filters to Search."
**Do:** Filter button opens GreeBottomSheet on mobile (filter-panel exists in
`src/components/search/`); applied-filter chips remain visible; sheet is
drag-dismissable and keyboard-accessible.

**Request:** "Camera permission denied screen."
**Do:** Calm explanation + "open settings" guidance + manual barcode search as a
first-class fallback — never a bare error.

**Bad:** `<div className="h-[600px] overflow-hidden">` for a results list.
**Good:** Natural height with virtualized/scrollable content and safe-area padding.

## Acceptance criteria

- [ ] One clear primary action per modified screen; secondary flows behind sheets/disclosure.
- [ ] Bottom nav intact (five items) and reachable; touch targets ≥ 44px.
- [ ] Safe-area insets applied to any fixed/bottom-anchored element.
- [ ] Scan flow uninterrupted: fast start, recoverable permissions, rapid-scan loop works.
- [ ] Verified at 360px-wide mobile, tablet, desktop, and RTL; no horizontal
      overflow, no clipped content, no avoidable layout shift.
