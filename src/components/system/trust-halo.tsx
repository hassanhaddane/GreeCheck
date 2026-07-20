import { useTranslations } from "next-intl";
import { ShieldCheck, ShieldQuestion, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import type { ConfidenceLevel } from "@greecheck/domain/scoring/types";

/**
 * TrustHalo — how much the result can be trusted, at a glance.
 * Confidence is a distinct visual channel from quality: it uses neutral
 * shield tones, never the score palette, so "unknown" never reads as "bad".
 */
const LEVELS: Record<ConfidenceLevel, { icon: typeof ShieldCheck; cls: string }> = {
  high: { icon: ShieldCheck, cls: "border-natural/30 bg-natural/10 text-natural-strong" },
  medium: { icon: ShieldQuestion, cls: "border-line bg-surface-2 text-muted" },
  low: { icon: ShieldAlert, cls: "border-verdict-unknown/30 bg-verdict-unknown/10 text-verdict-unknown" }
};

export interface TrustHaloProps {
  level: ConfidenceLevel;
  size?: "sm" | "md";
  className?: string;
}

export function TrustHalo({ level, size = "md", className }: TrustHaloProps) {
  const t = useTranslations("score.trust");
  const { icon: Icon, cls } = LEVELS[level];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border font-semibold",
        size === "sm" ? "px-2 py-0.5 text-[0.65rem]" : "px-2.5 py-1 text-xs",
        cls,
        className
      )}
    >
      <Icon className={size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5"} aria-hidden />
      <span className="sr-only">{t("label")} : </span>
      {t(level)}
    </span>
  );
}
