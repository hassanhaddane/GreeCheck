"use client";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Sparkles, GitCompareArrows, ShoppingBasket, Check } from "lucide-react";
import { Link, useRouter } from "@/i18n/routing";
import { GreeCard } from "@/components/system/gree-card";
import { SectionTitle } from "@/components/ui/section-title";
import { GreeButton } from "@/components/system/gree-button";
import { GreeScoreRing } from "@/components/system/gree-score-ring";
import { NutriScoreBadge } from "@/components/badges/nutri-score-badge";
import { ProductRowSkeleton } from "@/components/system/loading-state";
import { getAlternatives, type Alternative } from "@/domains/swap/engine";
import { useBattleStore } from "@/domains/battle/store";
import { useCartStore } from "@/domains/cart/store";
import type { Product } from "@/domains/product/model";
import type { LocalPreferences } from "@/domains/criteria/model";

const GRADE_BG: Record<string, string> = { A: "bg-score-a-ink", B: "bg-score-b-ink", C: "bg-score-c-ink", D: "bg-score-d-ink", E: "bg-score-e-ink" };

export function Alternatives({ product, prefs }: { product: Product; prefs: LocalPreferences }) {
  const t = useTranslations("product");
  const router = useRouter();
  const addBattle = useBattleStore((s) => s.add);
  const basket = useCartStore();

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<Alternative[]>([]);
  const [added, setAdded] = useState<Set<string>>(new Set());

  useEffect(() => {
    let alive = true;
    // Defer state updates out of the synchronous effect body.
    const timer = setTimeout(() => {
      setLoading(true);
      getAlternatives(product, prefs)
        .then((r) => alive && (setItems(r), setLoading(false)))
        .catch(() => alive && (setItems([]), setLoading(false)));
    }, 0);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [product, prefs]);

  if (!loading && items.length === 0) return null;

  const compare = (alt: Alternative) => {
    addBattle(product); // current product
    addBattle(alt.product); // the alternative
    router.push("/battle");
  };
  const toBasket = (alt: Alternative) => {
    basket.addProduct(alt.product, alt.gree);
    setAdded((s) => new Set(s).add(alt.product.barcode));
  };

  return (
    <section>
      <SectionTitle>{t("alternatives")}</SectionTitle>
      {loading ? (
        <div className="space-y-2"><ProductRowSkeleton /><ProductRowSkeleton /></div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {items.map((alt) => {
            const isAdded = added.has(alt.product.barcode);
            return (
              <GreeCard key={alt.product.barcode} className="flex flex-col gap-3 p-3">
                <div className="flex items-center gap-3">
                  <Link href={`/product/${alt.product.barcode}`} className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-surface-2">
                    { }
                    {alt.product.imageUrl ? <img src={alt.product.imageUrl} alt={alt.product.name} className="h-full w-full object-contain" loading="lazy" /> : null}
                  </Link>
                  <Link href={`/product/${alt.product.barcode}`} className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{alt.product.name}</p>
                    <div className="mt-0.5 flex items-center gap-1.5">
                      {alt.product.nutriScore && <NutriScoreBadge grade={alt.product.nutriScore} variant="compact" className="h-4 w-4 rounded text-[0.55rem]" />}
                      <span className="truncate text-xs text-muted">{alt.product.brand || "—"}</span>
                    </div>
                  </Link>
                  <div className="relative shrink-0">
                    <GreeScoreRing value={alt.gree.global} size={46} label="" />
                    <span className={`absolute -right-1 -top-1 grid h-4 w-4 place-items-center rounded text-[0.5rem] font-extrabold text-white ${GRADE_BG[alt.gree.grade]}`}>
                      {alt.gree.grade}
                    </span>
                  </div>
                </div>

                {/* Explained recommendation */}
                <p className="flex items-start gap-1.5 rounded-xl bg-natural/10 px-2.5 py-1.5 text-xs font-medium text-natural-strong">
                  <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span>{alt.reasons.map((r) => t(`altReason.${r}`)).join(" · ")}</span>
                </p>

                {/* Actions */}
                <div className="mt-auto flex gap-2">
                  <GreeButton variant="soft" size="sm" className="h-8 flex-1 px-2 text-xs" onClick={() => compare(alt)}>
                    <GitCompareArrows className="h-3.5 w-3.5" /> {t("compare")}
                  </GreeButton>
                  <GreeButton variant={isAdded ? "neon" : "primary"} size="sm" className="h-8 flex-1 px-2 text-xs" onClick={() => toBasket(alt)} disabled={isAdded}>
                    {isAdded ? <Check className="h-3.5 w-3.5" /> : <ShoppingBasket className="h-3.5 w-3.5" />} {isAdded ? t("addedToBasket") : t("addToBasket")}
                  </GreeButton>
                </div>
              </GreeCard>
            );
          })}
        </div>
      )}
    </section>
  );
}
