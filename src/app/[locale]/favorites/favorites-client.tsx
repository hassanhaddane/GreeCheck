"use client";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { Heart, ScanLine, Swords, ShoppingBasket, ChevronRight, Trash2 } from "lucide-react";
import { Link } from "@/i18n/routing";
import { PageHeading } from "@/components/app/page-heading";
import { GreeButton } from "@/components/system/gree-button";
import { GreeCard } from "@/components/system/gree-card";
import { GreeBadge } from "@/components/system/gree-badge";
import { EmptyState } from "@/components/system/empty-state";
import { ProductRowSkeleton } from "@/components/system/loading-state";
import { GreeScoreRing } from "@/components/system/gree-score-ring";
import { ProductThumbnail } from "@/components/system/product-thumbnail";
import { useFavoritesStore } from "@/domains/library/favorites-store";
import { useCartStore } from "@/domains/cart/store";
import { useBattleStore } from "@/domains/battle/store";
import { usePreferencesStore } from "@/domains/criteria/store";
import { getProduct } from "@/domains/product/repository";
import { computeGreeScore } from "@greecheck/domain/scoring/gree-score";
import type { FavoriteItem } from "@/domains/library/model";
import { useMounted } from "@/hooks/use-mounted";
import { cn } from "@/lib/utils/cn";

function gradeTone(grade?: string): "positive" | "caution" | "negative" | "neutral" {
  if (grade === "A" || grade === "B") return "positive";
  if (grade === "C") return "caution";
  if (grade === "D" || grade === "E") return "negative";
  return "neutral";
}

/** Favorites — secondary but one tap away. Integrates with Battle & GreeCart. */
export function FavoritesClient() {
  const t = useTranslations("favorites");
  const mounted = useMounted();
  const favorites = useFavoritesStore();
  const items = useFavoritesStore((s) => s.items);
  const addCart = useCartStore((s) => s.addProduct);
  const addBattle = useBattleStore((s) => s.add);
  const prefs = usePreferencesStore();
  const [notice, setNotice] = useState<string | null>(null);

  const flash = (m: string) => { setNotice(m); setTimeout(() => setNotice(null), 2200); };
  const toCart = async (e: FavoriteItem) => {
    const r = await getProduct(e.barcode);
    if (r.kind === "product") { addCart(r.product, computeGreeScore(r.product, prefs)); flash(t("addedCart")); }
    else flash(t("actionUnavailable"));
  };
  const toBattle = async (e: FavoriteItem) => {
    const r = await getProduct(e.barcode);
    if (r.kind === "product") { addBattle(r.product); flash(t("addedBattle")); }
    else flash(t("actionUnavailable"));
  };

  if (!mounted) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <PageHeading title={t("title")} />
        <div className="space-y-2"><ProductRowSkeleton /><ProductRowSkeleton /></div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <PageHeading title={t("title")} />

      {notice && <p className="rounded-2xl bg-natural/10 px-3 py-2 text-center text-sm font-medium text-natural-strong" role="status">{notice}</p>}

      {items.length === 0 ? (
        <EmptyState
          icon={Heart}
          title={t("empty")}
          description={t("emptyBody")}
          action={<Link href="/scan"><GreeButton variant="neon" size="sm"><ScanLine className="h-4 w-4" /> {t("scanCta")}</GreeButton></Link>}
        />
      ) : (
        <>
          <p className="px-1 text-xs text-muted">{t("count", { n: items.length })}</p>
          <div className="space-y-2">
            {items.map((e) => (
              <GreeCard key={e.barcode} interactive className="flex items-center gap-3 p-3">
                <Link href={`/product/${e.barcode}`} className="flex min-w-0 flex-1 items-center gap-3">
                  <ProductThumbnail src={e.imageUrl} size="md" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{e.name}</p>
                    {e.brand && <p className="truncate text-xs text-muted">{e.brand}</p>}
                    {e.grade && <div className="mt-1"><GreeBadge tone={gradeTone(e.grade)} size="sm">{e.verdict}</GreeBadge></div>}
                  </div>
                  <GreeScoreRing value={e.score} size={46} label="" />
                </Link>
                <div className="flex shrink-0 flex-col gap-1">
                  <button onClick={() => toBattle(e)} aria-label={t("addBattle")} title={t("addBattle")}
                    className="gc-pressable grid h-8 w-8 place-items-center rounded-xl bg-surface-2 text-muted hover:bg-deep hover:text-white">
                    <Swords className="h-4 w-4" />
                  </button>
                  <button onClick={() => toCart(e)} aria-label={t("addCart")} title={t("addCart")}
                    className="gc-pressable grid h-8 w-8 place-items-center rounded-xl bg-surface-2 text-muted hover:bg-natural/15 hover:text-natural-strong">
                    <ShoppingBasket className="h-4 w-4" />
                  </button>
                  <button onClick={() => favorites.toggle(e)} aria-label={t("remove")} title={t("remove")}
                    className={cn("gc-pressable grid h-8 w-8 place-items-center rounded-xl bg-natural/15 text-natural-strong")}>
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <ChevronRight className="hidden h-4 w-4 shrink-0 text-muted rtl:rotate-180 sm:block" aria-hidden />
              </GreeCard>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
