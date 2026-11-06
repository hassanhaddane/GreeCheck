"use client";
import { useTranslations } from "next-intl";
import { TrendingUp, TrendingDown } from "lucide-react";
import { useWeeklyProgress } from "@/domains/weekly/store";
import { useMounted } from "@/hooks/use-mounted";
import { cn } from "@/lib/utils/cn";

export function WeeklyProgress() {
  const t = useTranslations("home.weekly");
  const mounted = useMounted();
  const w = useWeeklyProgress();
  if (!mounted) return <section aria-hidden className="h-28 rounded-3xl bg-surface-2" />;

  const avg = w.averageScore;
  const delta = avg.delta;

  // Improvement chips — framed positively, only when data supports them.
  const chips: { label: string; up: boolean }[] = [];
  if (w.sugar.available && w.sugar.delta !== undefined && w.sugar.delta < 0) chips.push({ label: t("sugarDown", { n: Math.abs(w.sugar.delta) }), up: true });
  if (w.declaredAdditives.available && w.declaredAdditives.delta !== undefined && w.declaredAdditives.delta < 0) chips.push({ label: t("additivesDown"), up: true });
  if (w.environment.available && w.environment.delta !== undefined && w.environment.delta < 0) chips.push({ label: t("envUp"), up: true });
  if (w.replacements.count > 0) chips.push({ label: t("replacements", { n: w.replacements.count, pts: w.replacements.pointsGained }), up: true });

  return (
    <section aria-labelledby="weekly-h" className="rounded-3xl bg-pastel-mint p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 id="weekly-h" className="gc-overline !text-score-a-ink">{t("title")}</h2>
        {delta !== undefined && delta !== 0 && (
          <span className={cn("inline-flex items-center gap-1 rounded-full bg-white/70 px-2 py-0.5 text-xs font-bold", delta > 0 ? "text-score-a-ink" : "text-score-c-ink")}>
            {delta > 0 ? <TrendingUp className="h-3.5 w-3.5" aria-hidden /> : <TrendingDown className="h-3.5 w-3.5" aria-hidden />}
            {delta > 0 ? `+${delta}` : delta} {t("points")}
          </span>
        )}
      </div>

      {w.weekScanCount === 0 ? (
        <p className="mt-2 text-sm text-score-a-ink">{t("empty")}</p>
      ) : (
        <>
          <div className="mt-2 flex items-baseline gap-5">
            <div>
              <span className="text-3xl font-semibold tracking-tight text-score-a-ink tabular-nums">{w.weekScanCount}</span>
              <span className="ms-1.5 text-sm text-score-a-ink">{t("scans", { count: w.weekScanCount })}</span>
            </div>
            {avg.current !== undefined && (
              <div>
                <span className="text-3xl font-semibold tracking-tight text-score-a-ink tabular-nums">{avg.current}</span>
                <span className="ms-1.5 text-sm text-score-a-ink">{t("avg")}</span>
              </div>
            )}
          </div>
          {chips.length > 0 && (
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {chips.map((c, i) => (
                <span key={i} className="inline-flex items-center gap-1 rounded-full bg-white/70 px-2.5 py-1 text-xs font-semibold text-score-a-ink">
                  <TrendingUp className="h-3 w-3" aria-hidden /> {c.label}
                </span>
              ))}
            </div>
          )}
        </>
      )}
      <p className="mt-2 text-xs text-score-a-ink">{t("localNote")}</p>
    </section>
  );
}
