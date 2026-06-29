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
        ink: "rgb(var(--gc-ink) / <alpha-value>)",
        muted: "rgb(var(--gc-muted) / <alpha-value>)",
        line: "rgb(var(--gc-line) / <alpha-value>)",
        natural: "rgb(var(--gc-natural) / <alpha-value>)",
        neon: "rgb(var(--gc-neon) / <alpha-value>)",
        deep: "rgb(var(--gc-deep) / <alpha-value>)",
        // semantic score colors
        "score-a": "rgb(var(--gc-score-a) / <alpha-value>)",
        "score-b": "rgb(var(--gc-score-b) / <alpha-value>)",
        "score-c": "rgb(var(--gc-score-c) / <alpha-value>)",
        "score-d": "rgb(var(--gc-score-d) / <alpha-value>)",
        "score-e": "rgb(var(--gc-score-e) / <alpha-value>)"
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "-apple-system", "Segoe UI", "sans-serif"]
      },
      borderRadius: {
        xl: "1rem",
        "2xl": "1.5rem",
        "3xl": "2rem"
      },
      boxShadow: {
        soft: "0 1px 2px rgba(16,19,18,0.04), 0 8px 24px -12px rgba(16,19,18,0.10)",
        glass: "0 1px 0 rgba(255,255,255,0.6) inset, 0 12px 40px -16px rgba(11,61,46,0.22)",
        glow: "0 0 0 1px rgba(57,255,136,0.35), 0 0 28px -4px rgba(57,255,136,0.45)"
      },
      backgroundImage: {
        "neon-grad": "linear-gradient(135deg, rgb(var(--gc-natural)) 0%, rgb(var(--gc-neon)) 100%)",
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
  plugins: [require("tailwindcss-animate")]
};

export default config;
