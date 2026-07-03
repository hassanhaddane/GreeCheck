import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils/cn";

type Tone = "natural" | "neon" | "info" | "warning" | "critical";

const TONES: Record<Tone, string> = {
  natural: "border-natural/25 bg-natural/10 text-natural",
  neon: "border-transparent bg-neon-grad text-deep",
  info: "border-line bg-surface-2 text-muted",
  warning: "border-score-d/25 bg-score-d/10 text-score-d",
  critical: "border-score-e/25 bg-score-e/10 text-score-e"
};

/** Small rounded status badge (halal, bio, alerts, data confidence…). */
export function HealthBadge({
  icon: Icon,
  tone = "natural",
  className,
  children
}: {
  icon?: LucideIcon;
  tone?: Tone;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[0.7rem] font-semibold",
        TONES[tone],
        className
      )}
    >
      {Icon && <Icon className="h-3 w-3 shrink-0" aria-hidden />}
      {children}
    </span>
  );
}
