---
name: greecheck-brand-system
description: >
  Enforces the GreeCheck Ultimate visual direction: design tokens, typography, spacing,
  color usage, imagery, motion (GreePulse) and component reuse. Use this skill whenever a
  task touches UI — creating or editing any component, page, style, animation, icon, theme,
  or Tailwind/CSS code — even if the request doesn't mention "design". Also use it when
  reviewing screenshots or when a change might introduce hard-coded colors, ad-hoc spacing,
  new fonts, or motion that ignores prefers-reduced-motion.
---

# GreeCheck Brand System

Identity: premium, simple, clear, white, calm, organic, precise, slightly futuristic.
Warm white surfaces, deep neutral text, natural green as primary, neon green **only**
for scan/focus/motion/success moments.

## Source of truth

- Tokens: CSS variables in `src/app/globals.css`, mapped in `tailwind.config.ts`
  (`bg`, `surface`, `surface-2/3`, `ink`, `muted`, `line`, `natural`,
  `natural-strong`, `neon`, `deep`, `score-a…e`, `score-a-ink…e-ink`,
  `verdict-positive/caution/negative/unknown`).
- Radii: `rounded-lg/xl/2xl/3xl` → `--gc-r-*`. Shadows: `soft`, `raised`, `float`,
  `glass`, `glow`. Durations: `fast` 140ms, `base` 260ms, `slow` 480ms; easings
  `out`, `spring`.
- Components: reuse `src/components/system/` (GreeCard, GreeButton, GreeBadge,
  GreeIcon, GreeScoreRing, VerdictCard, TrustHalo, GreePulse, GreeBottomSheet,
  loading/error/empty states, `motion.ts`) before creating anything new.
- Icons: Lucide (`lucide-react`) with the GreeIcon treatment — no other icon sets.
- Font: `var(--font-sans)` only. No new font imports.

## Mandatory principles

1. **Tokens only.** Every color, radius, shadow and duration comes from the token
   set. If a needed token doesn't exist, add it to `globals.css` +
   `tailwind.config.ts`, don't inline a hex value.
2. **Neon is an event, not a theme.** `neon`, `neon-grad` and `shadow-glow` appear
   only during scan detection, focus, success and GreePulse moments — never as
   static decoration or default button color. `natural` is the everyday green.
3. **Score/verdict colors are semantic.** Use `score-*` for grades and the
   `-ink` variants for text (they're the AA-safe pair). `verdict-unknown` is
   neutral — unknown data is never styled as negative.
4. **Motion = GreePulse.** Animations go through `motion.ts` / Framer Motion
   variants, respect `prefers-reduced-motion`, and react to meaning (scan,
   result, swap, battle, cart improvement). No confetti, sounds, vibrations or
   blocking animations. 3D serves behavior, never decoration.
5. **Generous spacing, soft angles, controlled depth.** No dense layouts, no
   sharp corners outside the radius scale, no stacked heavy shadows.

## Forbidden behaviors

- Hard-coded hex/rgb colors, arbitrary Tailwind values like `bg-[#39ff88]`,
  ad-hoc `px` radii or one-off shadows in components.
- Duplicating a system component (a second button, card, sheet or badge variant
  outside `components/system/`).
- Neon backgrounds/borders on resting UI; color as the only carrier of meaning.
- New keyframes that bypass reduced-motion handling.
- Visible hard-coded UI text outside `messages/{fr,en,ar}.json`.

## Examples

**Request:** "Make the CTA pop — bright green background."
**Do:** `natural`/`natural-grad` CTA; reserve neon glow for the success state.

**Request:** "Add a quick modal for filters."
**Do:** Use `GreeBottomSheet` (mobile) — don't hand-roll a modal.

**Bad:** `<div style={{background:"#22c55e", borderRadius: 14}}>` →
**Good:** `<GreeCard className="bg-natural text-white rounded-2xl">`

## Acceptance criteria

- [ ] Zero new hard-coded colors/radii/shadows/durations; tokens or token additions only.
- [ ] Neon appears only in scan/focus/success/motion contexts.
- [ ] Existing system components reused; any new component lives in the right
      folder and follows GreeCard/GreeButton conventions.
- [ ] All animation respects `prefers-reduced-motion`; RTL (`ar`) not broken.
- [ ] All new UI strings in the three message files; no layout shift or horizontal overflow introduced.
