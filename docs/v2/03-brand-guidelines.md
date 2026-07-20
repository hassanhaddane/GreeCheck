# GreeCheck V2 — Brand Guidelines

> Direction: **GreeCheck Ultimate — Calm Radicalism.**
> Governed by `02-product-constitution.md` (voice, independence). Enforced day
> to day by the `greecheck-brand-system` skill. Assets live in
> `docs/v2/brand/`; machine-readable tokens in `docs/v2/brand/tokens.json`.

## 1. The idea: Calm Radicalism

GreeCheck says radical things in a calm voice. The surface is warm, white,
premium and unhurried — the message is direct and activist. This tension is
the brand: **no alarm-red panic UI, no gamified guilt — and no euphemism
either.** A product is "ultra-transformé"; the interface saying it is serene.

Three behaviors express it:

- **Calm carries trust.** Warm neutrals, generous space, soft depth. The app
  never shouts, so when it says "à limiter", it lands.
- **Radicalism lives in words and truth,** not in decoration: verdicts are
  blunt, methodology is public, unknowns are admitted.
- **Green is earned.** Natural green marks genuinely good things; neon green
  appears only when something is *happening* (scan, detection, success). A
  screen at rest is nearly monochrome — color is information.

## 2. Logo system

The mark is the **Sprout Check**: a checkmark whose rising stroke sprouts a
leaf, framed by four scanner brackets. It compresses the whole product —
scan (brackets) → verify (check) → grow (leaf) → "Every scan improves your
habits."

| Asset | File | Use |
|---|---|---|
| Primary logo | `brand/logo-primary.svg` | Marketing site header, about, press |
| Compact icon | `brand/icon-compact.svg` | In-app logo, favicons ≥ 32px, social avatars |
| Monochrome | `brand/logo-mono.svg` | Print, single-color contexts; uses `currentColor` |
| PWA icon | `brand/icon-pwa.svg` | Installable icon; maskable-safe (mark inside 80% zone) |
| Wordmark | `brand/wordmark.svg` | Text-only lockup; footer, documents |

**Rules.** Clear space = the bracket stroke width on all sides. Minimum sizes:
mark 24px, primary lockup 140px wide. Never: recolor outside the palette, add
effects/outlines/shadows, rotate, place the color version on busy photography
(use mono), or animate the logo outside the sanctioned GreePulse intro.
The wordmark's production cut converts text to outlines in Fraunces 600;
"Gree" in ink, "Check" in `naturalStrong`.

## 3. Differentiation charter (non-clone rules)

GreeCheck is inspired by the quality bar of consumer health apps, never by
their trade dress. Hard rules:

- **No mascot, no anthropomorphized food, no carrot iconography.**
- **No orange/red binary verdict identity;** GreeCheck's identity is
  green-on-warm-white with a five-grade semantic scale.
- **No cloned screen compositions:** the product page hierarchy
  (verdict → reasons → explore) is our own; do not replicate another app's
  layout, copy, iconography or proprietary score visuals.
- The Sprout Check, GreePulse, pastel dashboard palette and editorial serif
  are the ownable assets — lean on them, not on category conventions.

## 4. Color

Full values in `tokens.json`; app source of truth remains
`src/app/globals.css` (`--gc-*`).

- **Canvas:** warm apple-white `#FAFAF7`, white cards, hairline `line` borders.
  Dark theme mirrors every token.
- **Brand greens:** `deep #0B3D2E` (hero surfaces, logo ink) · `natural
  #2ECC71` (accent, fills) · `naturalStrong #15803D` (AA text green) ·
  `neon #39FF88` (**motion only**).
- **Score scale A–E** with mandatory `*Ink` pairs for text (AA-safe).
- **Verdict semantics:** positive / caution / negative / **unknown = neutral
  gray** — unknown is never styled as bad.
- **NEW — pastel dashboard palette:** mint (nutrition), sage (naturality),
  sand (processing), butter (additives), sky (GreeImpact), blush
  (compatibility alerts), stone (unknown). Pastels are *backgrounds only*;
  text on pastel uses the paired ink token. They make health data feel like a
  calm editorial dashboard instead of a traffic-light alarm panel.

**Ratios per screen:** ~80% neutrals · ~15% pastel/data color · ≤5% brand
green · neon only during events.

## 5. Typography — editorial pairing

- **Fraunces** (variable serif, SIL OFL) — the *editorial voice*: hero
  headlines, verdict lines, score hero numerals, marketing. Weight 550–650,
  tight tracking. It is what makes GreeCheck read like a publication with a
  point of view, not a utility.
- **Inter** — the *interface voice*: all controls, labels, body, data.
- **IBM Plex Sans Arabic** — both roles in `ar` (Fraunces has no Arabic;
  never fake-italicize or substitute a Latin serif).
- **IBM Plex Mono** — barcodes, E-numbers, tabular figures only.

Scale and weights: `tokens.json → gc.typography.scale`. Rules: max two
families per screen; Fraunces never below 1.5rem; body min 1rem; line length
45–75ch; numerals in scores use tabular figures.

## 6. Photography — real products

- **Always real photography** for products (Open Food Facts images or own
  shots) — never illustrated or AI-generated stand-ins for a real product.
- Treatment: product on `surface`/`surface2` well, soft contact shadow
  (`shadow.soft`), generous margin, no cutout halos, no saturation boosts that
  flatter or damn a product.
- Missing image = honest placeholder (`product-thumbnail` pattern: stone
  pastel well + category icon), never a stock photo of a similar product.
- Marketing photography: natural light, real kitchens and market aisles, hands
  holding phones mid-scan; no staged lab-coat imagery.

## 7. Illustration — organic honesty

Direction file: `brand/illustration-direction.svg` (three vignettes: growth /
real food / clarity).

- Flat organic shapes, pastel fills from the dashboard palette, `deep` ink
  strokes with round caps, warm-white canvas.
- One neon accent maximum per scene, and only to mark life/progress.
- Subjects: plants, produce, growth metaphors, calm weather metaphors for
  system states. **No mascots, no faces on food, no cartoon physics.**
- Used for: empty states, onboarding, error/offline states, methodology
  explainers. Never used where a real product photo belongs.

## 8. Voice in visuals

The constitution (§8) defines the voice: premium, direct, educational,
activist — no medical claims, no moralizing. Visual corollaries:

- Verdict typography is large and serif — the app *states*, it doesn't nag.
- Warnings use caution/negative colors on calm surfaces — never full-screen
  red, never shaking/pulsing alarm effects.
- Educational copy sits in pastel wells next to the data it explains.
- Activist statements (methodology, independence) may use `deep` hero
  surfaces with white Fraunces — the "manifesto" treatment, reserved for
  brand-level statements, never for judging a user's basket.
