# GreeCheck V2 — Motion System (GreePulse)

> GreePulse is the animated identity of GreeCheck: motion that reacts to
> meaning. Implementation home: `src/components/system/motion.ts` +
> `gree-pulse.tsx` (Framer Motion). Tokens: `tokens.json → gc.motion`.
> This document specifies the V2 target; no production page changes here.

## 1. Principles

1. **Motion is information.** Something moves because something happened:
   detection, verdict, improvement, addition. Decorative/idle animation is
   forbidden (one exception: the scanner's calm breathing, §3.1).
2. **Calm by default, alive at moments.** Screens at rest are still. Neon +
   `glow` exist only inside motion moments and always decay back to rest.
3. **One hero animation per screen event.** Secondary elements follow with
   stagger, they don't compete.
4. **Fast, interruptible, skippable.** Nothing blocks input; navigation
   cancels animation; no animation gates content longer than `dur.slow`.
5. **Physical but subtle.** Transforms and opacity only (no width/height/top
   animation); overshoot via `ease.spring` reserved for success.

## 2. Vocabulary (tokens)

| Token | Value | Use |
|---|---|---|
| `dur.fast` 140ms | press, toggles, hover, chip selection |
| `dur.base` 260ms | card/sheet enter-exit, accordion, cross-fade |
| `dur.slow` 480ms | verdict reveal, score count-up launch, podium |
| `dur.pulse` 1200ms | GreePulse breathing loop (scanner, live states) |
| `ease.out` | default for entrances and settles |
| `ease.spring` | success overshoot: add-to-cart/battle, podium, improvements |
| `ease.exit` | dismissals and exits |

Standard primitives (in `motion.ts`): `fadeUp` (8px, out), `scaleIn`
(0.96→1), `staggerChildren` (40ms), `sheetUp`, `pressScale` (0.98).

## 3. Moments

### 3.1 Scan (GreeLens)
- **Rest:** viewfinder brackets in ink, slow opacity breathing 0.85↔1.0 at
  `dur.pulse` — the only sanctioned idle motion.
- **Detection:** brackets snap to neon (`fast`), sweep line passes once,
  `glow` on the frame; barcode locked = brackets converge slightly
  (`spring`).
- **Hand-off:** frame morphs toward the result card position; result page
  enters with `fadeUp` while scanner exits with `ease.exit`. Total scan→
  verdict perceived time budget: < 700ms of motion.

### 3.2 Verdict & score reveal
- Verdict banner enters first (`fadeUp`, `slow`), reasons stagger in (40ms).
- ScoreRing hero: track draws in, numeral counts up once (duration scales
  with value, max `slow`), grade letter lands with a single `spring` settle.
- Trust Halo fades in after the score — confidence never animates before the
  thing it qualifies. Low-confidence results skip the count-up (no fanfare
  for uncertain data).

### 3.3 GreeSwap (alternatives)
- Alternative cards enter with stagger; the measurable improvement (e.g.
  "+23") counts up in `naturalStrong`.
- Choosing a swap: old card cross-fades down, new card settles with `spring`
  + one `glow` pulse — the signature "improvement" beat.

### 3.4 GreeCompare / Battle
- Podium builds bottom-up (`base` each, staggered), winner last with `spring`
  + single glow pulse. Ties/low-confidence winners get a plain settle — no
  celebration when the data doesn't justify it.

### 3.5 GreeCart
- Basket score updates by counting from previous value (never jump-cuts).
- What-if simulation: before/after bars animate in parallel (`base`);
  applying a replacement fires the §3.3 improvement beat once.

### 3.6 Micro-interactions
- Press: `pressScale` (`fast`). Toggles/chips: `fast` fill transition.
- Add-to (Battle/GreeCart): flying-dot from source to nav item + nav icon
  `spring` bounce once.
- Sheets: `sheetUp` at `base`, scrim fades in parallel; drag follows finger
  1:1, release springs to nearest detent.
- Skeletons: shimmer 1.6s loop; appears after 150ms, cross-fades to content.

## 4. Reduced motion

With `prefers-reduced-motion: reduce`:
- All movement primitives become opacity-only cross-fades (≤ `base`).
- Count-ups render final values instantly; sweep, breathing, flying-dot,
  shimmer and glow pulses are disabled (glow may appear statically for one
  frame duration as a state, not an animation).
- Sheets snap open/closed with fade; drag still works without spring physics.
- No functionality or information may exist only in animated form.

Implementation rule: every variant in `motion.ts` exports a reduced
counterpart; components consume via a single `useReducedMotion`-aware helper
— never raw `animate` props with hardcoded motion.

## 5. Performance budget

- Animate only `transform` and `opacity`; `will-change` applied just-in-time
  and removed after.
- 60fps on mid-range mobile: max 2 concurrent animated layers + stagger
  groups capped at 8 children.
- No animation during camera startup (GPU priority to the scanner).
- Framer Motion features loaded with the components that use them; no global
  motion runtime on marketing/SEO pages (CSS transitions suffice there).

## 6. Forbidden

Confetti, sounds, vibrations, parallax scrolling, looping decorative
animations, animated logos outside the sanctioned intro, blocking
transitions, hover-triggered layout shifts, and any neon/glow that persists
at rest.
