"use client";
import * as React from "react";
import { cn } from "@/lib/utils/cn";

type Variant = "solid" | "glass" | "deep" | "tinted";

const VARIANT_CLASSES: Record<Variant, string> = {
  solid: "gc-card",
  glass: "gc-glass rounded-2xl shadow-glass gc-edge",
  deep: "relative overflow-hidden rounded-2xl bg-deep-grad text-white shadow-glass gc-edge",
  tinted: "rounded-2xl border border-natural/25 bg-natural/5 shadow-soft"
};

export interface PremiumCardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: Variant;
  /** Hover lift + press feedback for clickable cards. */
  interactive?: boolean;
  /** Decorative blurred orbs inside (deep/tinted heroes). */
  glow?: boolean;
}

/**
 * PremiumCard — the app's signature surface.
 * `deep` = dark-green hero, `glass` = frosted, `tinted` = brand-tinted callout.
 */
export function PremiumCard({ variant = "solid", interactive, glow, className, children, ...props }: PremiumCardProps) {
  return (
    <div
      className={cn(VARIANT_CLASSES[variant], interactive && "gc-pressable gc-lift cursor-pointer", className)}
      {...props}
    >
      {glow && (
        <>
          <span aria-hidden className="pointer-events-none absolute -right-12 -top-12 h-44 w-44 rounded-full bg-neon/20 blur-3xl" />
          <span aria-hidden className="pointer-events-none absolute -bottom-16 -left-10 h-40 w-40 rounded-full bg-natural/20 blur-3xl" />
        </>
      )}
      {children}
    </div>
  );
}
