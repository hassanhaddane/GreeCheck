import * as React from "react";
import { cn } from "@/lib/utils/cn";

type Tone = "neutral" | "brand" | "positive" | "caution" | "negative" | "unknown" | "deep";

const TONES: Record<Tone, string> = {
  neutral: "bg-surface-2 text-ink",
  brand: "bg-natural/12 text-natural-strong",
  positive: "bg-score-a/12 text-score-a-ink",
  caution: "bg-score-c/15 text-score-c-ink",
  negative: "bg-score-e/12 text-score-e-ink",
  unknown: "bg-verdict-unknown/12 text-verdict-unknown",
  deep: "bg-deep text-white"
};

export interface GreeBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: Tone;
  size?: "sm" | "md";
}

/** Small semantic status/label pill. Information is never color-only — always pair with text. */
export function GreeBadge({ tone = "neutral", size = "md", className, ...props }: GreeBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full font-semibold",
        size === "sm" ? "px-2 py-0.5 text-[0.65rem]" : "px-2.5 py-1 text-xs",
        TONES[tone],
        className
      )}
      {...props}
    />
  );
}
