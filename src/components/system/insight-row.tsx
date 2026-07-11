import { GreeIcon, type GreeGlyph } from "./gree-icon";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils/cn";

type Tone = "neutral" | "brand" | "positive" | "caution" | "negative" | "unknown";

export interface InsightRowProps {
  glyph?: GreeGlyph;
  icon?: LucideIcon;
  tone?: Tone;
  label: string;
  value?: string;
  hint?: string;
  className?: string;
}

/**
 * InsightRow — level 2 of the hierarchy ("Comprendre"): one reason,
 * one glance. Icon tile + short label + optional value. Compact by design.
 */
export function InsightRow({ glyph, icon, tone = "neutral", label, value, hint, className }: InsightRowProps) {
  return (
    <div className={cn("flex items-center gap-3 py-2", className)}>
      <GreeIcon glyph={glyph} icon={icon} tone={tone} size="sm" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium leading-tight">{label}</p>
        {hint && <p className="gc-caption mt-0.5 leading-tight">{hint}</p>}
      </div>
      {value && <span className="shrink-0 text-sm font-semibold tabular-nums">{value}</span>}
    </div>
  );
}
