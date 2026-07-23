"use client";
import { useTranslations } from "next-intl";
import { Leaf, TrendingUp, TrendingDown, HelpCircle } from "lucide-react";
import { GreeCard, GreeCardContent } from "@/components/system/gree-card";
import { DataKind } from "./data-kind";
import type { GreeImpact, ImpactIndicator } from "@greecheck/domain/impact/types";
import { cn } from "@/lib/utils/cn";

/**
 * GreeImpact headline (section 3) — the environmental assessment, kept
 * visually SEPARATE from the health GreeScore: sky pastel + a horizontal bar,
 * never the health ring. Deep breakdown lives in <ImpactDetails> (section 11).
 */
export function ImpactBlock({ impact }: { impact: GreeImpact }) {
  const t = useTranslations("product");
  const ti = useTranslations("impact");

  if (impact.status === "insufficient") {
    return (
      <section aria-labelledby="impact-h">
        <GreeCard className="bg-pastel-sky/60">
          <GreeCardContent className="py-4">
            <div className="mb-1 flex items-center gap-2">
              <Leaf className="h-4 w-4 text-sky-ink" aria-hidden />
              <h2 id="impact-h" className="text-sm font-semibold text-sky-ink">{t("impactTitle")}</h2>
            </div>
            <p className="text-sm font-semibold text-sky-ink">{t("impactInsufficient")}</p>
            <p className="mt-0.5 text-xs text-sky-ink">{t("impactInsufficientBody")}</p>
          </GreeCardContent>
        </GreeCard>
      </section>
    );
  }

  const grade = impact.grade!;
  const { score, insight } = impact;

  return (
    <section aria-labelledby="impact-h">
      <GreeCard className="bg-pastel-sky/60">
        <GreeCardContent className="space-y-3 py-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Leaf className="h-4 w-4 text-sky-ink" aria-hidden />
              <h2 id="impact-h" className="text-sm font-semibold text-sky-ink">{t("impactTitle")}</h2>
            </div>
            <DataKind kind="estimate" />
          </div>

          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-sky-ink text-lg font-bold text-white" aria-hidden>
              {grade.toUpperCase()}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-sky-ink">{grade.toUpperCase()} · {ti(impact.labelCode)}</p>
              {score !== undefined && (
                <div className="mt-1.5 h-2 rounded-full bg-sky-ink/15" role="img" aria-label={`${score}/100`}>
                  <div className="h-full rounded-full bg-sky-ink" style={{ width: `${score}%` }} />
                </div>
              )}
            </div>
          </div>

          {(insight.strength || insight.weakness) && (
            <div className="space-y-1.5">
              {insight.strength && (
                <p className="flex items-start gap-1.5 text-xs text-sky-ink">
                  <TrendingUp className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                  {ti(insight.strength.code, insight.strength.params)}
                </p>
              )}
              {insight.weakness && (
                <p className="flex items-start gap-1.5 text-xs text-sky-ink">
                  <TrendingDown className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                  {ti(insight.weakness.code, insight.weakness.params)}
                </p>
              )}
            </div>
          )}
          <p className="text-xs text-sky-ink">{t("impactSeeDetails")}</p>
        </GreeCardContent>
      </GreeCard>
    </section>
  );
}

/** GreeImpact deep breakdown (section 11) — indicators, labels, missing data. */
export function ImpactDetails({ impact }: { impact: GreeImpact }) {
  const t = useTranslations("product");
  const ti = useTranslations("impact");

  if (impact.status === "insufficient") {
    return (
      <div className="space-y-2">
        <p className="text-sm text-muted">{t("impactInsufficientBody")}</p>
        <ul className="space-y-1">
          {impact.missing.map((m, i) => (
            <li key={i} className="flex items-center gap-1.5 text-xs text-muted">
              <HelpCircle className="h-3 w-3 shrink-0" aria-hidden /> {ti(m.code, m.params)}
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="rounded-2xl bg-pastel-sky/60 p-3 text-xs text-sky-ink">{t("impactCategoryNote")}</p>

      <ul className="space-y-2">
        {impact.indicators.map((ind, i) => <IndicatorRow key={i} indicator={ind} />)}
      </ul>

      {impact.insight.advice && (
        <p className="rounded-2xl bg-pastel-mint p-3 text-xs font-medium text-score-a-ink">
          {ti(impact.insight.advice.code, impact.insight.advice.params)}
        </p>
      )}

      {impact.environmentalLabels.length > 0 && (
        <div>
          <p className="gc-overline mb-1.5">{t("environmentalLabels")}</p>
          <div className="flex flex-wrap gap-1.5">
            {impact.environmentalLabels.map((l) => <span key={l} className="gc-chip text-xs capitalize">{l}</span>)}
          </div>
        </div>
      )}

      {impact.missing.length > 0 && (
        <div>
          <p className="gc-overline mb-1.5">{t("impactMissing")}</p>
          <ul className="space-y-1">
            {impact.missing.map((m, i) => (
              <li key={i} className="flex items-center gap-1.5 text-xs text-muted">
                <HelpCircle className="h-3 w-3 shrink-0" aria-hidden /> {ti(m.code, m.params)}
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="text-[0.7rem] text-muted">
        {t("impactProvider", { provider: impact.provider.methodology, version: impact.methodologyVersion })}
      </p>
    </div>
  );
}

function IndicatorRow({ indicator }: { indicator: ImpactIndicator }) {
  const ti = useTranslations("impact");
  const toneCls =
    indicator.tone === "positive" ? "text-score-a-ink"
      : indicator.tone === "negative" ? "text-score-d-ink"
        : indicator.tone === "unknown" ? "text-verdict-unknown" : "text-muted";
  return (
    <li className="flex items-start justify-between gap-2 rounded-2xl bg-surface-2 p-2.5">
      <span className={cn("text-xs font-medium", toneCls)}>{ti(indicator.code, indicator.params)}</span>
      {indicator.sourceValue !== undefined && (
        <span className="shrink-0 text-xs tabular-nums text-muted">{indicator.sourceValue}</span>
      )}
    </li>
  );
}
