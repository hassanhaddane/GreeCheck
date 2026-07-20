import { useTranslations } from "next-intl";
import { GreeCard, GreeCardContent } from "./gree-card";
import { GreeScoreRing } from "./gree-score-ring";
import { TrustHalo } from "./trust-halo";
import { GreeBadge } from "./gree-badge";
import { cn } from "@/lib/utils/cn";
import type { GreeScore } from "@greecheck/domain/scoring/types";

export interface VerdictCardProps {
  gree: GreeScore;
  /** Product display name shown above the verdict. */
  title?: string;
  subtitle?: string;
  /** Extra content rendered under the verdict line (actions, chips…). */
  children?: React.ReactNode;
  className?: string;
}

/**
 * VerdictCard — level 1 of the product hierarchy ("Décider").
 * One glance = score + VERDICT + data trust. A low-confidence result renders
 * the neutral "insufficient data" verdict, never an authoritative one.
 */
export function VerdictCard({ gree, title, subtitle, children, className }: VerdictCardProps) {
  const t = useTranslations("score");
  return (
    <GreeCard variant="glass" className={cn("relative overflow-hidden", className)}>
      <span aria-hidden className="pointer-events-none absolute -right-14 -top-14 h-40 w-40 rounded-full bg-natural/10 blur-3xl" />
      <GreeCardContent className="flex items-center gap-5">
        <GreeScoreRing value={gree.global} size={116} label={t(`grade.${gree.grade}`)} />
        <div className="min-w-0 flex-1 space-y-1.5">
          {title && <p className="gc-title line-clamp-2">{title}</p>}
          {subtitle && <p className="gc-caption truncate">{subtitle}</p>}
          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
            <GreeBadge
              tone={
                gree.verdict === "insufficient_data"
                  ? "unknown"
                  : gree.verdict === "excellent_choice" || gree.verdict === "good_choice"
                    ? "positive"
                    : gree.verdict === "limit" || gree.verdict === "poor_fit_for_goal"
                      ? "caution"
                      : "negative"
              }
            >
              {t(`verdict.${gree.verdict}`)}
            </GreeBadge>
            <TrustHalo level={gree.confidence} size="sm" />
          </div>
          {children}
        </div>
      </GreeCardContent>
    </GreeCard>
  );
}
