"use client";
/**
 * Home client islands — every figure comes from REAL local data (IndexedDB
 * mirrors). Nothing is a mockup: empty states are honest and actionable.
 * All data stays on the device; no analytics, no accounts.
 */
import { useTranslations } from "next-intl";
import { ScanLine, ChevronRight } from "lucide-react";
import { Link } from "@/i18n/routing";
import { GreeCard, GreeCardContent } from "@/components/system/gree-card";
import { GreeBadge } from "@/components/system/gree-badge";
import { ProductThumbnail } from "@/components/system/product-thumbnail";
import { useHistoryStore } from "@/domains/library/history-store";
import { useMounted } from "@/hooks/use-mounted";

function gradeTone(grade?: string) {
  if (grade === "A" || grade === "B") return "positive" as const;
  if (grade === "C") return "caution" as const;
  if (grade === "D" || grade === "E") return "negative" as const;
  return "neutral" as const;
}

export function RecentProducts() {
  const t = useTranslations("home.recents");
  const score = useTranslations("score");
  const mounted = useMounted();
  const entries = useHistoryStore((s) => s.entries);
  if (!mounted || entries.length === 0) return null;

  return (
    <section aria-labelledby="recents-h">
      <div className="mb-2 flex items-center justify-between">
        <h2 id="recents-h" className="gc-overline">{t("title")}</h2>
        <Link href="/products" className="gc-pressable inline-flex items-center gap-0.5 text-sm font-semibold text-natural-strong">
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
                    {e.score !== undefined ? `${e.grade} · ${e.score}` : score(e.scoreObsolete ? "gs3Obsolete" : "gs3Unavailable")}
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
