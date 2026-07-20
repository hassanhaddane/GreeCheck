import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}"
  ],
  theme: {
    container: { center: true, padding: "1rem", screens: { "2xl": "1200px" } },
    extend: {
      colors: {
        // Mapped to CSS variables (see globals.css) so themes can swap.
        bg: "rgb(var(--gc-bg) / <alpha-value>)",
        surface: "rgb(var(--gc-surface) / <alpha-value>)",
        "surface-2": "rgb(var(--gc-surface-2) / <alpha-value>)",
        "surface-3": "rgb(var(--gc-surface-3) / <alpha-value>)",
        ink: "rgb(var(--gc-ink) / <alpha-value>)",
        muted: "rgb(var(--gc-muted) / <alpha-value>)",
        line: "rgb(var(--gc-line) / <alpha-value>)",
        natural: "rgb(var(--gc-natural) / <alpha-value>)",
        "natural-strong": "rgb(var(--gc-natural-strong) / <alpha-value>)",
        neon: "rgb(var(--gc-neon) / <alpha-value>)",
        deep: "rgb(var(--gc-deep) / <alpha-value>)",
        // semantic score colors
        "score-a": "rgb(var(--gc-score-a) / <alpha-value>)",
        "score-b": "rgb(var(--gc-score-b) / <alpha-value>)",
        "score-c": "rgb(var(--gc-score-c) / <alpha-value>)",
        "score-d": "rgb(var(--gc-score-d) / <alpha-value>)",
        "score-e": "rgb(var(--gc-score-e) / <alpha-value>)",
        // AA-safe TEXT variants of the score palette
        "score-a-ink": "rgb(var(--gc-score-a-ink) / <alpha-value>)",
        "score-b-ink": "rgb(var(--gc-score-b-ink) / <alpha-value>)",
        "score-c-ink": "rgb(var(--gc-score-c-ink) / <alpha-value>)",
        "score-d-ink": "rgb(var(--gc-score-d-ink) / <alpha-value>)",
        "score-e-ink": "rgb(var(--gc-score-e-ink) / <alpha-value>)",
        // verdict semantics — unknown is neutral, never negative
        "verdict-positive": "rgb(var(--gc-verdict-positive) / <alpha-value>)",
        "verdict-caution": "rgb(var(--gc-verdict-caution) / <alpha-value>)",
        "verdict-negative": "rgb(var(--gc-verdict-negative) / <alpha-value>)",
        "verdict-unknown": "rgb(var(--gc-verdict-unknown) / <alpha-value>)",
        // pastel dashboard tints (backgrounds only; text uses paired inks)
        "pastel-mint": "rgb(var(--gc-pastel-mint) / <alpha-value>)",
        "pastel-sage": "rgb(var(--gc-pastel-sage) / <alpha-value>)",
        "pastel-sand": "rgb(var(--gc-pastel-sand) / <alpha-value>)",
        "pastel-butter": "rgb(var(--gc-pastel-butter) / <alpha-value>)",
        "pastel-sky": "rgb(var(--gc-pastel-sky) / <alpha-value>)",
        "pastel-blush": "rgb(var(--gc-pastel-blush) / <alpha-value>)",
        "pastel-stone": "rgb(var(--gc-pastel-stone) / <alpha-value>)",
        "sky-ink": "rgb(var(--gc-sky-ink) / <alpha-value>)"
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "-apple-system", "Segoe UI", "sans-serif"]
      },
      borderRadius: {
        lg: "var(--gc-r-sm)",
        xl: "var(--gc-r-md)",
        "2xl": "var(--gc-r-lg)",
        "3xl": "var(--gc-r-xl)"
      },
      boxShadow: {
        soft: "var(--gc-shadow-1)",
        raised: "var(--gc-shadow-2)",
        float: "var(--gc-shadow-3)",
        glass: "0 1px 0 rgba(255,255,255,0.6) inset, 0 12px 40px -16px rgba(11,61,46,0.22)",
        glow: "0 0 0 1px rgba(57,255,136,0.35), 0 0 28px -4px rgba(57,255,136,0.45)"
      },
      transitionDuration: {
        fast: "140ms",
        base: "260ms",
        slow: "480ms"
      },
      transitionTimingFunction: {
        out: "cubic-bezier(0.22, 1, 0.36, 1)",
        spring: "cubic-bezier(0.34, 1.4, 0.4, 1)"
      },
      backgroundImage: {
        "neon-grad": "linear-gradient(135deg, rgb(var(--gc-natural)) 0%, rgb(var(--gc-neon)) 100%)",
        "natural-grad": "linear-gradient(135deg, rgb(var(--gc-deep)) 0%, rgb(var(--gc-natural-strong)) 100%)",
        "deep-grad": "linear-gradient(160deg, rgb(var(--gc-deep)) 0%, #0a2a20 100%)"
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" }
        },
        "radar-sweep": {
          "0%": { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(360deg)" }
        },
        shimmer: {
          "100%": { transform: "translateX(100%)" }
        }
      },
      animation: {
        "fade-up": "fade-up 0.4s ease-out both",
        "radar-sweep": "radar-sweep 2.4s linear infinite",
        shimmer: "shimmer 1.6s infinite"
      }
    }
  },
  plugins: []
};

export default config;
