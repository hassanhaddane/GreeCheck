/**
 * Motion tokens for framer-motion — mirrors the CSS custom properties
 * (--gc-dur-*, --gc-ease-*) so JS-driven and CSS-driven motion feel identical.
 * Components must pair these with `useReducedMotion()` gates.
 */
export const DUR = {
  fast: 0.14,
  base: 0.26,
  slow: 0.48
} as const;

export const EASE = {
  out: [0.22, 1, 0.36, 1] as const,
  spring: [0.34, 1.4, 0.4, 1] as const
};

/** Standard entrance used across the app (fade + slight rise). */
export const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5, delay, ease: EASE.out }
});
