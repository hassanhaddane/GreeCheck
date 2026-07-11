"use client";
import { useTranslations } from "next-intl";
import { ScanLine, Heart, Trash2, ChevronRight } from "lucide-react";
import { Link } from "@/i18n/routing";
import { PageHeading } from "@/components/app/page-heading";
import { GreeButton } from "@/components/system/gree-button";
import { GreeCard } from "@/components/system/gree-card";
import { EmptyState } from "@/components/system/empty-state";
import { ProductRowSkeleton } from "@/components/system/loading-state";
import { GreeScoreRing } from "@/components/system/gree-score-ring";
import { ProductThumbnail } from "@/components/system/product-thumbnail";
import { useHistoryStore } from "@/domains/library/history-store";
import { useFavoritesStore } from "@/domains/library/favorites-store";
import { useMounted } from "@/hooks/use-mounted";
import { cn } from "@/lib/utils/cn";

/**
 * "Mes scans" — local scan history (vertical list).
 * Compact/timeline modes and advanced filters arrive with the library phase.
 */
export function HistoryClient() {
  const t = useTranslations("history");
  const mounted = useMounted();
  const entries = useHistoryStore((s) => s.entries);
  const removeEntry = useHistoryStore((s) => s.remove);
  const favorites = useFavoritesStore();

  if (!mounted) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <PageHeading title={t("title")} />
        <div className="space-y-2"><ProductRowSkeleton /><ProductRowSkeleton /><ProductRowSkeleton /></div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <PageHeading title={t("title")} />

      {entries.length === 0 ? (
        <EmptyState
          icon={ScanLine}
          title={t("empty")}
          description={t("emptyBody")}
          action={<Link href="/scan"><GreeButton variant="neon" size="sm"><ScanLine className="h-4 w-4" /> {t("scanCta")}</GreeButton></Link>}
        />
      ) : (
        <>
          <p className="px-1 text-xs text-muted">{t("count", { n: entries.length })}</p>
          <div className="space-y-2">
            {entries.map((e) => {
              const isFav = favorites.has(e.barcode);
              return (
                <GreeCard key={e.barcode} interactive className="flex items-center gap-3 p-3">
                  <Link href={`/product/${e.barcode}`} className="flex min-w-0 flex-1 items-center gap-3">
                    <ProductThumbnail src={e.imageUrl} size="md" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{e.name}</p>
                      <p className="truncate text-xs text-muted">{e.verdict}</p>
                    </div>
                    <GreeScoreRing value={e.score} size={46} label="" />
                  </Link>
                  <div className="flex shrink-0 flex-col gap-1">
                    <button
                      onClick={() => favorites.toggle(e)}
                      aria-label={isFav ? t("unfavorite") : t("favorite")}
                      aria-pressed={isFav}
                      className={cn("gc-pressable grid h-8 w-8 place-items-center rounded-xl", isFav ? "bg-natural/15 text-natural-strong" : "bg-surface-2 text-muted")}
                    >
                      <Heart className={cn("h-4 w-4", isFav && "fill-current")} />
                    </button>
                    <button
                      onClick={() => removeEntry(e.barcode)}
                      aria-label={t("remove")}
                      className="gc-pressable grid h-8 w-8 place-items-center rounded-xl bg-surface-2 text-muted"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted rtl:rotate-180" aria-hidden />
                </GreeCard>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
