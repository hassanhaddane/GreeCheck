import * as React from "react";
import { cn } from "@/lib/utils/cn";

type Variant = "plain" | "glass" | "deep" | "tinted";

const VARIANT_CLASSES: Record<Variant, string> = {
  plain: "gc-card",
  glass: "gc-glass rounded-2xl shadow-glass gc-edge",
  deep: "relative overflow-hidden rounded-2xl bg-deep-grad text-white shadow-glass gc-edge",
  tinted: "rounded-2xl border border-natural/25 bg-natural/5 shadow-soft"
};

interface GreeCardBaseProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Hover lift + press feedback for clickable cards. */
  interactive?: boolean;
}

/**
 * Controlled combinations (type-enforced):
 * • plain            — may add `depth` (2|3) for soft-3D emphasis;
 * • glass/deep       — fixed elevation (shadow-glass); no `depth`;
 * • deep/tinted      — may add `glow` (decorative orbs); others may not.
 */
export type GreeCardProps = GreeCardBaseProps &
  (
    | { variant?: "plain"; depth?: 2 | 3; glow?: never }
    | { variant: "glass"; depth?: never; glow?: never }
    | { variant: "deep" | "tinted"; depth?: never; glow?: boolean }
  );

/**
 * GreeCard — the single card surface of the design system.
 * plain = white card · glass = frosted · deep = dark-green hero ·
 * tinted = brand-tinted callout. Depth adds soft-3D without decoration.
 */
export function GreeCard({ variant, interactive, glow, depth, className, children, ...props }: GreeCardProps) {
  const v: Variant = variant ?? "plain";
  return (
    <div
      className={cn(
        VARIANT_CLASSES[v],
        depth === 2 && "gc-depth-2",
        depth === 3 && "gc-depth-3",
        interactive && "gc-pressable gc-lift cursor-pointer",
        className
      )}
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

export function GreeCardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-5 pb-2", className)} {...props} />;
}
export function GreeCardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn("gc-heading", className)} {...props} />;
}
export function GreeCardContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-5 pt-3", className)} {...props} />;
}
