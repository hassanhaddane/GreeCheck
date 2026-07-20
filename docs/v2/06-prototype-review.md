# GreeCheck V2 — Prototype Review

> Lab: `docs/v2/prototypes/` — three standalone HTML prototypes, **fully
> isolated from production** (no Next.js routes touched, no real APIs, local
> fixtures only, fictional brands). Open `index.html` in any browser; each
> prototype renders full-bleed on mobile (~390×844) and inside a phone frame
> with test notes on desktop. Light mode only, per scope.

## How to review

Double-click `docs/v2/prototypes/index.html`. Each prototype's desktop view
lists its test path. Gestures: the result and confidence sheets drag-dismiss;
scrim tap and Escape also close. `prefers-reduced-motion` collapses all motion
to cross-fades and instant values.

## UX decisions taken (and why)

**A · Scan flow**

1. **Permission asked in context, with the privacy promise inline** ("les
   images ne sont jamais enregistrées") — constitution §7 made visible at the
   exact moment of doubt.
2. **Refusal is a first-class path**, not an error: it lands on manual search
   with a calm "réessayer" option. No dead end anywhere in the flow.
3. **Camera is calm; neon is the event.** Brackets breathe slowly at rest
   (the one sanctioned idle motion), turn neon + sweep only during detection,
   lock with a glow — then the sheet takes over. Total detection theater
   ≈ 1.5 s.
4. **Quick result is a sheet over the camera**, not a page: verdict + grade +
   confidence + three actions (analyse / comparer / GreeCart / re-scan).
   Rapid-scan sessions never leave the scanner context.

**B · Product flow**

5. **Strict Decide → Understand → Explore order:** identity, verdict sentence
   (serif, accent bar), score+confidence, four reasons max — then everything
   else. Nutrition detail and full values are collapsed by default.
6. **Health ≠ planet, visually enforced:** GreeScore is a ring on white;
   GreeImpact is a horizontal bar on sky pastel with its own letter + label.
   No combined number anywhere.
7. **Confidence is a tappable object,** not a footnote: the chip opens a sheet
   listing exactly what's missing and states the rule "une donnée manquante
   réduit la confiance, jamais le score santé."
8. **Unknown is neutral:** halal "non confirmé" renders in stone gray with an
   explanatory line — deliberately identical in tone to any other absent data.
9. **The alternative sells itself with numbers:** "+26 points", "−14 g de
   sucres", same category, one CTA. No generic "produits similaires" carousel.

**C · Decision flow**

10. **Selection is capped at two** (prototype scope) with live counter on the
    CTA; a third tap is silently rejected rather than error-modaled.
11. **The winner is justified, not just ranked:** verdict sentence explains
    *why* (sugar ×3, additives, NOVA) and explicitly says the data confidence
    is equal — the podium celebrates only when the comparison is fair.
12. **GreeCart shows the consequence of the decision:** basket score counts
    58 → 61 on arrival, credits the added product, and the improvement plan
    names the next best move (Krispo → muesli, +6 pts simulated).
13. **Shopping list is the humble end of the loop:** local, checkable,
    annotated with grades — the tagline made tangible ("cette liste en est la
    preuve").

**Cross-cutting**

14. Every score everywhere carries a **non-color textual label** (grade letter
    + "Excellent choix / Bon choix / Choix moyen / À limiter") and ARIA labels
    on rings.
15. Safe areas (`env(safe-area-inset-*)`) applied to sheets, docks, topbars;
    all primary actions bottom-anchored; touch targets ≥ 44px.
16. **Fictional brands** (Krispo, Delisso, Naturia, Prairial, Douceo) with
    realistic data: a prototype must not publish invented scores for real
    products. Packshots are soft-lit vector stand-ins for photography.

## Verification performed

- Functional DOM test (jsdom, real page scripts executed): 30/30 assertions
  pass, 0 JS errors — full paths A (home→permission→denied→scan→detection→
  sheet→analysis), B (ring, impact bar, confidence sheet, alternative),
  C (selection rules, compare, cart count-up, list).
- Sandbox has no browser engine (downloads blocked), so pixel-level review is
  the human step this lab exists for: **please walk the three flows on your
  machine** (mobile width + desktop) and note anything off.

## Unresolved questions (decisions needed before implementation)

1. **Packshots:** real Open Food Facts photography requires network + real
   products. Accept OFF images in the next prototype round, or keep neutral
   fixtures until implementation?
2. **Quick sheet default actions:** is "+ Comparer / + GreeCart" the right
   pair, or should favoris replace one on first scan?
3. **GreeImpact placement:** currently after the reasons, before nutrition.
   Alternative: collapse it into Explore until data coverage improves in the
   category. Which default?
4. **Shopping list scope:** C introduces a list distinct from GreeCart
   (analyzer). Is the list a launch feature or does "add to list" fold into
   GreeCart with a "à acheter" flag? Constitution's launch scope doesn't name
   it — needs a ruling before V2 wiring.
5. **Compare at three:** flow C caps at two for clarity; production
   GreeCompare allows three. Does the two-column duel layout scale, or should
   three products switch to a table-first presentation on mobile?
6. **Cart score attribution:** "+3 grâce à ce produit" is easy to read but
   hides basket-size effects (adding a good product to a big basket moves it
   less). Show the delta anyway, or show "impact sur le panier : faible/fort"?
7. **Wordmark/serif:** prototypes load Fraunces from Google Fonts; production
   must self-host via `next/font`. Confirm Fraunces (vs. alternative serif)
   before any implementation task depends on it.

## Fixture inventory

| Key | Product | Score | Rôle |
|---|---|---|---|
| krispo | Choco Billes · Krispo | 31 · D · À limiter | scan target (A) |
| delisso | Granola Choco & Graines · Delisso | 46 · C · Choix moyen | product page (B) |
| naturia | Granola Avoine Bio · Naturia | 72 · B · Bon choix | alternative (B) |
| prairial | Yaourt Nature · Prairial | 81 · A · Excellent choix | winner (C) |
| douceo | Yaourt Vanille Sucré · Douceo | 52 · C · Choix moyen | challenger (C) |
