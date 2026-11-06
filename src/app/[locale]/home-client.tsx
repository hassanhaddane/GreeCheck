"use client";
/**
 * Home client islands — every figure comes from REAL local data (IndexedDB
 * mirrors). Nothing is a mockup: empty states are honest and actionable.
 * All data stays on the device; no analytics, no accounts.
 */
import { useTranslations } from "next-intl";
import { ChevronRight } from "lucide-react";
import { Link } from "@/i18n/routing";
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
        <h2 id="recents-h" className="gc-heading">{t("title")}</h2>
        <Link href="/products" className="gc-pressable inline-flex min-h-10 items-center gap-0.5 text-sm font-semibold text-natural-strong">
          {t("all")} <ChevronRight className="h-4 w-4 rtl:rotate-180" aria-hidden />
        </Link>
      </div>
      <ul className="divide-y divide-line rounded-xl border border-line bg-surface">
        {entries.slice(0, 3).map((e) => (
          <li key={e.barcode}>
            <Link href={`/product/${e.barcode}`} className="flex min-h-14 items-center gap-2.5 rounded-xl p-2.5 hover:bg-surface-2">
              <ProductThumbnail src={e.imageUrl} className="h-9 w-9" />
              <span className="min-w-0 flex-1 truncate text-sm font-medium">{e.name}</span>
              {e.score !== undefined ? <GreeBadge size="sm" tone={gradeTone(e.grade)}><bdi>{e.score}/100</bdi></GreeBadge>
                : <span className="max-w-[9rem] text-xs text-muted">{score(e.scoreObsolete ? "gs3Obsolete" : "gs3Unavailable")}</span>}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
