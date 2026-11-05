"use client";
import { useTranslations } from "next-intl";
import { Leaf, HelpCircle } from "lucide-react";
import { DataKind } from "./data-kind";
import type { GreeImpact, ImpactIndicator } from "@greecheck/domain/impact/types";
import { cn } from "@/lib/utils/cn";

/** Show the available environmental assessment separately from nutrition. */
export function ImpactBlock({ impact }: { impact: GreeImpact }) {
  const t = useTranslations("product");
  const ti = useTranslations("impact");
  if (impact.status !== "valid" || !impact.grade) return null;

  return (
    <section aria-labelledby="impact-h" className="space-y-2 rounded-xl border border-line bg-pastel-sky p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="impact-h" className="flex min-w-0 items-center gap-1.5 text-sm font-semibold text-sky-ink">
          <Leaf aria-hidden className="h-4 w-4 shrink-0" /> {t("impactTitle")}
        </h2>
        <DataKind kind="estimate" />
      </div>
      <p className="break-words text-sm font-semibold text-sky-ink"><bdi>{impact.grade.toUpperCase()}</bdi> · {ti(impact.labelCode)}</p>
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
