"use client";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Award, ChevronRight } from "lucide-react";
import { Link } from "@/i18n/routing";
import { Card } from "@/components/ui/card";
import { SectionTitle } from "@/components/ui/section-title";
import { ScoreRing } from "@/components/score/score-ring";
import { ProductRowSkeleton } from "@/components/ui/skeleton";
import { getAlternatives, type Alternative } from "@/lib/api/client";
import type { Product } from "@/types/product";
import type { LocalPreferences } from "@/types/user-preferences";

export function Alternatives({ product, prefs }: { product: Product; prefs: LocalPreferences }) {
  const t = useTranslations("product");
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<Alternative[]>([]);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    getAlternatives(product, prefs)
      .then((r) => alive && (setItems(r), setLoading(false)))
      .catch(() => alive && (setItems([]), setLoading(false)));
    return () => {
      alive = false;
    };
  }, [product, prefs]);

  // Hide the whole block when there's nothing better to suggest.
  if (!loading && items.length === 0) return null;

  return (
    <section>
      <SectionTitle>{t("alternatives")}</SectionTitle>
      {loading ? (
        <div className="space-y-2">
          <ProductRowSkeleton />
          <ProductRowSkeleton />
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {items.map(({ product: alt, score }) => (
            <Link key={alt.barcode} href={`/product/${alt.barcode}`}>
              <Card className="gc-pressable flex items-center gap-3 p-3">
                <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-surface-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {alt.imageUrl ? <img src={alt.imageUrl} alt={alt.name} className="h-full w-full object-contain" loading="lazy" /> : null}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{alt.name}</p>
                  <p className="truncate text-xs text-muted">{alt.brand || "—"}</p>
                  <p className="mt-0.5 flex items-center gap-1 text-xs font-medium text-natural">
                    <Award className="h-3 w-3" /> {t("betterChoice")}
                  </p>
                </div>
                <ScoreRing value={score} size={44} label="" />
                <ChevronRight className="h-4 w-4 text-muted rtl:rotate-180" />
              </Card>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
