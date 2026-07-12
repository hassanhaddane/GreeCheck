import * as React from "react";
import {
  Candy, Droplets, Droplet, Dumbbell, Wheat, FlaskConical, Factory, Leaf,
  MoonStar, Sprout, ShieldAlert, ShieldCheck, History, Swords, ShoppingBasket,
  ArrowRightLeft, type LucideIcon
} from "lucide-react";
import { cn } from "@/lib/utils/cn";

/**
 * GreeCheck icon language — one consistent treatment over Lucide:
 * consistent stroke (2 / 2.2), rounded soft-3D tiles, semantic tones.
 * Neon is reserved for motion states and never used as a static tile tone.
 */
export type GreeGlyph =
  | "sugar" | "salt" | "saturatedFat" | "protein" | "fiber"
  | "additives" | "processing" | "organic" | "halal" | "vegan"
  | "allergens" | "confidence" | "history" | "battle" | "cart" | "swap";

export const GREE_GLYPHS: Record<GreeGlyph, LucideIcon> = {
  sugar: Candy,
  salt: Droplets,
  saturatedFat: Droplet,
  protein: Dumbbell,
  fiber: Wheat,
  additives: FlaskConical,
  processing: Factory,
  organic: Leaf,
  halal: MoonStar,
  vegan: Sprout,
  allergens: ShieldAlert,
  confidence: ShieldCheck,
  history: History,
  battle: Swords,
  cart: ShoppingBasket,
  swap: ArrowRightLeft
};

type Tone = "neutral" | "brand" | "deep" | "positive" | "caution" | "negative" | "unknown";
type Size = "sm" | "md" | "lg";

const TILE_TONES: Record<Tone, string> = {
  neutral: "bg-surface-2 text-muted",
  brand: "bg-natural/10 text-natural-strong",
  deep: "bg-natural-grad text-white shadow-raised",
  positive: "bg-score-a/10 text-score-a-ink",
  caution: "bg-score-c/12 text-score-c-ink",
  negative: "bg-score-e/10 text-score-e-ink",
  unknown: "bg-verdict-unknown/10 text-verdict-unknown"
};

const SIZES: Record<Size, { tile: string; icon: string }> = {
  sm: { tile: "h-8 w-8 rounded-lg", icon: "h-4 w-4" },
  md: { tile: "h-10 w-10 rounded-xl", icon: "h-5 w-5" },
  lg: { tile: "h-12 w-12 rounded-2xl", icon: "h-6 w-6" }
};

export interface GreeIconProps {
  /** A semantic GreeCheck glyph… */
  glyph?: GreeGlyph;
  /** …or any Lucide icon for non-semantic uses. */
  icon?: LucideIcon;
  tone?: Tone;
  size?: Size;
  /** true = rounded soft tile (default), false = bare stroke icon. */
  tile?: boolean;
  label?: string;
  className?: string;
}

export function GreeIcon({ glyph, icon, tone = "neutral", size = "md", tile = true, label, className }: GreeIconProps) {
  const Icon = glyph ? GREE_GLYPHS[glyph] : icon;
  if (!Icon) return null;
  const s = SIZES[size];
  if (!tile) {
    return <Icon className={cn(s.icon, className)} strokeWidth={2} aria-hidden={!label} aria-label={label} />;
  }
  return (
    <span
      className={cn("grid shrink-0 place-items-center", s.tile, TILE_TONES[tone], className)}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={!label}
    >
      <Icon className={s.icon} strokeWidth={2.2} />
    </span>
  );
}
