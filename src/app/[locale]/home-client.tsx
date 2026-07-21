"use client";
/**
 * Home client islands — every figure comes from REAL local data (IndexedDB
 * mirrors). Nothing is a mockup: empty states are honest and actionable.
 * All data stays on the device; no analytics, no accounts.
 */
import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { TrendingUp, TrendingDown, ScanLine, ChevronRight, ListChecks } from "lucide-react";
import { Link } from "@/i18n/routing";
import { GreeCard, GreeCardContent } from "@/components/system/gree-card";
import { GreeBadge } from "@/components/system/gree-badge";
import { ProductThumbnail } from "@/components/system/product-thumbnail";
import { useHistoryStore } from "@/domains/library/history-store";
import { useShoppingListStore } from "@/domains/list/store";
import { useWeeklyProgress } from "@/domains/weekly/store";
import { useMounted } from "@/hooks/use-mounted";
import { cn } from "@/lib/utils/cn";

function gradeTone(grade?: string) {
  if (grade === "A" || grade === "B") return "positive" as const;
  if (grade === "C") return "caution" as const;
  if (grade === "D" || grade === "E") return "negative" as const;
  return "neutral" as const;
}

/* ── 4 · weekly progress (local; non-shaming) ── */
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
  if (w.riskyAdditives.available && w.riskyAdditives.delta !== undefined && w.riskyAdditives.delta < 0) chips.push({ label: t("additivesDown"), up: true });
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
        <p className="mt-2 text-sm text-score-a-ink/90">{t("empty")}</p>
      ) : (
        <>
          <div className="mt-2 flex items-baseline gap-5">
            <div>
              <span className="text-3xl font-semibold tracking-tight text-score-a-ink tabular-nums">{w.weekScanCount}</span>
              <span className="ms-1.5 text-sm text-score-a-ink/80">{t("scans", { count: w.weekScanCount })}</span>
            </div>
            {avg.current !== undefined && (
              <div>
                <span className="text-3xl font-semibold tracking-tight text-score-a-ink tabular-nums">{avg.current}</span>
                <span className="ms-1.5 text-sm text-score-a-ink/80">{t("avg")}</span>
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
      <p className="mt-2 text-xs text-score-a-ink/70">{t("localNote")}</p>
    </section>
  );
}

/* ── 5 · recent products ── */
export function RecentProducts() {
  const t = useTranslations("home.recents");
  const mounted = useMounted();
  const entries = useHistoryStore((s) => s.entries);
  if (!mounted || entries.length === 0) return null;

  return (
    <section aria-labelledby="recents-h">
      <div className="mb-2 flex items-center justify-between">
        <h2 id="recents-h" className="gc-overline">{t("title")}</h2>
        <Link href="/history" className="gc-pressable inline-flex items-center gap-0.5 text-sm font-semibold text-natural-strong">
          {t("all")} <ChevronRight className="h-4 w-4 rtl:rotate-180" aria-hidden />
        </Link>
      </div>
      <ul className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-1">
        {entries.slice(0, 8).map((e) => (
          <li key={e.barcode} className="w-36 shrink-0 snap-start">
            <Link href={`/product/${e.barcode}`} className="gc-pressable block">
              <GreeCard interactive className="h-full">
                <GreeCardContent className="flex flex-col items-center gap-2 py-3 text-center">
                  <ProductThumbnail src={e.imageUrl} size="md" className="h-16 w-16" />
                  <span className="line-clamp-2 min-h-[2.1rem] text-xs font-medium leading-tight">{e.name}</span>
                  <GreeBadge size="sm" tone={gradeTone(e.grade)}>
                    {e.grade ?? "–"} · {e.score}
                  </GreeBadge>
                </GreeCardContent>
              </GreeCard>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ── 6 · shopping-list preview ── */
export function ShoppingListPreview() {
  const t = useTranslations("home.list");
  const mounted = useMounted();
  const { items, ensureHydrated } = useShoppingListStore();
  useEffect(() => ensureHydrated(), [ensureHydrated]);
  if (!mounted) return null;

  const open = items.filter((i) => !i.checked);

  return (
    <section aria-labelledby="list-h">
      <Link href="/list" className="gc-pressable block">
        <GreeCard interactive>
          <GreeCardContent className="flex items-center gap-3 py-4">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-pastel-sage text-natural-strong">
              <ListChecks className="h-5 w-5" aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <h2 id="list-h" className="text-sm font-semibold">{t("title")}</h2>
              <p className="truncate text-xs text-muted">
                {open.length === 0
                  ? t("empty")
                  : t("preview", { count: open.length, first: open[0].name })}
              </p>
            </div>
            <ChevronRight className="h-4 w-4 shrink-0 text-muted rtl:rotate-180" aria-hidden />
          </GreeCardContent>
        </GreeCard>
      </Link>
    </section>
  );
}

/* ── first-scan hint under the hero (only when history is empty) ── */
export function FirstScanHint() {
  const t = useTranslations("home.hero");
  const mounted = useMounted();
  const entries = useHistoryStore((s) => s.entries);
  if (!mounted || entries.length > 0) return null;
  return (
    <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-xs text-muted">
      <ScanLine className="h-3.5 w-3.5 text-natural-strong" aria-hidden /> {t("firstHint")}
    </p>
  );
}
