"use client";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { Sparkles, GitCompareArrows, ShoppingBasket, Check, Info, ArrowRight } from "lucide-react";
import { Link, useRouter } from "@/i18n/routing";
import { GreeCard } from "@/components/system/gree-card";
import { GreeButton } from "@/components/system/gree-button";
import { GreeBadge } from "@/components/system/gree-badge";
import { GreeScoreRing } from "@/components/system/gree-score-ring";
import { TrustHalo } from "@/components/system/trust-halo";
import { GreeBottomSheet } from "@/components/system/gree-bottom-sheet";
import { NutriScoreBadge } from "@/components/badges/nutri-score-badge";
import { NovaBadge } from "@/components/badges/nova-badge";
import { LabelBadge } from "@/components/badges/label-badge";
import { ProductRowSkeleton } from "@/components/system/loading-state";
import { getAlternatives } from "@/domains/swap/service";
import type { Alternative, SwapImprovement } from "@greecheck/domain/swap/engine";
import { useBattleStore } from "@/domains/battle/store";
import { useCartStore } from "@/domains/cart/store";
import type { Product } from "@greecheck/domain/product/model";
import type { LocalPreferences } from "@greecheck/domain/criteria/model";

/** Measurable, human label for one improvement (values already computed by the engine). */
function useImprovementLabel() {
  const t = useTranslations("product");
  return (imp: SwapImprovement): string => {
    switch (imp.code) {
      case "lessSugar": return t("swap.lessSugar", { n: imp.percent ?? 0 });
      case "lessSalt": return t("swap.lessSalt", { n: imp.percent ?? 0 });
      case "lessSatFat": return t("swap.lessSatFat", { n: imp.percent ?? 0 });
      case "moreProtein": return t("swap.moreProtein", { n: imp.grams ?? 0 });
      case "moreFiber": return t("swap.moreFiber", { n: imp.grams ?? 0 });
      case "lowerNova": return t("swap.lowerNova", { to: imp.to ?? 0, from: imp.from ?? 0 });
      case "noFlaggedAdditives": return t("swap.noFlaggedAdditives");
      case "fewerAdditives": return t("swap.fewerAdditives", { n: imp.count ?? 0 });
      case "organic": return t("swap.organic");
      case "betterScore": return t("swap.betterScore", { n: imp.points ?? 0 });
    }
  };
}

export function Alternatives({ product, prefs }: { product: Product; prefs: LocalPreferences }) {
  const t = useTranslations("product");
  const tc = useTranslations("common");
  const router = useRouter();
  const addBattle = useBattleStore((s) => s.add);
  const addProduct = useCartStore((s) => s.addProduct);
  const label = useImprovementLabel();

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<Alternative[]>([]);
  const [added, setAdded] = useState<Set<string>>(new Set());
  const [sheetFor, setSheetFor] = useState<Alternative | null>(null);

  useEffect(() => {
    let alive = true;
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

  // Never render an empty section — only trustworthy alternatives, or nothing.
  if (!loading && items.length === 0) return null;

  const compare = (alt: Alternative) => {
    addBattle(product);
    addBattle(alt.product);
    router.push("/battle");
  };
  const toCart = (alt: Alternative) => {
    addProduct(alt.product, alt.gree);
    setAdded((s) => new Set(s).add(alt.product.barcode));
  };

  return (
    <section aria-label={t("swap.title")}>
      <div className="mb-2.5 flex items-center gap-2">
        <span className="grid h-8 w-8 place-items-center rounded-xl bg-natural/12 text-natural-strong">
          <Sparkles className="h-4 w-4" aria-hidden />
        </span>
        <div className="min-w-0">
          <h2 className="gc-title text-base">{t("swap.title")}</h2>
          <p className="gc-caption truncate">{t("swap.subtitle")}</p>
        </div>
      </div>

      {loading ? (
        <div className="space-y-2"><ProductRowSkeleton /><ProductRowSkeleton /></div>
      ) : (
        <div
          className="-mx-1 flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          role="list"
        >
          {items.map((alt, i) => {
            const p = alt.product;
            const isAdded = added.has(p.barcode);
            return (
              <motion.div
                key={p.barcode}
                role="listitem"
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.25, delay: i * 0.05 }}
                className="w-[15.5rem] shrink-0 snap-start"
              >
                <GreeCard className="flex h-full flex-col gap-3 p-3">
                  <div className="flex items-center gap-3">
                    <Link href={`/product/${p.barcode}`} className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-surface-2">
                      { }
                      {p.imageUrl ? <img src={p.imageUrl} alt={p.name} className="h-full w-full object-contain" loading="lazy" /> : null}
                    </Link>
                    <div className="relative shrink-0">
                      <GreeScoreRing value={alt.gree.global} size={54} label={alt.gree.grade} />
                    </div>
                  </div>

                  <Link href={`/product/${p.barcode}`} className="min-w-0">
                    <p className="line-clamp-2 text-sm font-semibold">{p.name}</p>
                    <p className="truncate text-xs text-muted">{p.brand || "—"}</p>
                  </Link>

                  {/* strongest improvement — the headline reason */}
                  <p className="flex items-start gap-1.5 rounded-xl bg-natural/10 px-2.5 py-1.5 text-xs font-semibold text-natural-strong">
                    <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                    <span>{label(alt.strongest)}</span>
                  </p>

                  {/* key badges + trust halo */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    <TrustHalo level={alt.gree.confidence} size="sm" />
                    {p.nutriScore && <NutriScoreBadge grade={p.nutriScore} variant="compact" className="h-5 w-5 rounded text-[0.6rem]" />}
                    {p.novaGroup && <NovaBadge group={p.novaGroup} />}
                    {p.isBio && <LabelBadge kind="bio" />}
                  </div>

                  <button
                    type="button"
                    onClick={() => setSheetFor(alt)}
                    className="inline-flex items-center gap-1 self-start text-xs font-semibold text-natural-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neon/50"
                  >
                    <Info className="h-3.5 w-3.5" aria-hidden /> {t("swap.whyBetter")}
                  </button>

                  <div className="mt-auto flex gap-2 pt-1">
                    <GreeButton variant="soft" size="sm" className="h-8 flex-1 px-2 text-xs" onClick={() => compare(alt)}>
                      <GitCompareArrows className="h-3.5 w-3.5" aria-hidden /> {t("compare")}
                    </GreeButton>
                    <GreeButton variant={isAdded ? "neon" : "primary"} size="sm" className="h-8 flex-1 px-2 text-xs" onClick={() => toCart(alt)} disabled={isAdded}>
                      {isAdded ? <Check className="h-3.5 w-3.5" aria-hidden /> : <ShoppingBasket className="h-3.5 w-3.5" aria-hidden />}
                      {isAdded ? t("addedToBasket") : t("addToBasket")}
                    </GreeButton>
                  </div>
                </GreeCard>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* "Why better?" — measurable breakdown */}
      <GreeBottomSheet open={sheetFor !== null} onClose={() => setSheetFor(null)} title={t("swap.whyBetterTitle")} closeLabel={tc("close")}>
        {sheetFor && (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <GreeScoreRing value={sheetFor.gree.global} size={56} label={sheetFor.gree.grade} />
              <div className="min-w-0">
                <p className="line-clamp-2 text-sm font-semibold">{sheetFor.product.name}</p>
                <div className="mt-1"><TrustHalo level={sheetFor.gree.confidence} size="sm" /></div>
              </div>
            </div>
            <ul className="space-y-2">
              {sheetFor.improvements.map((imp, i) => (
                <li key={i} className="flex items-center gap-2 rounded-2xl bg-surface-2 px-3 py-2 text-sm">
                  <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-lg ${imp.weakness ? "bg-natural/15 text-natural-strong" : "bg-surface-3 text-muted"}`}>
                    <ArrowRight className="h-3.5 w-3.5 rtl:rotate-180" aria-hidden />
                  </span>
                  <span className={imp.weakness ? "font-semibold" : "text-muted"}>{label(imp)}</span>
                </li>
              ))}
            </ul>
            <div className="flex gap-2 pt-1">
              <GreeButton variant="soft" className="flex-1" onClick={() => { compare(sheetFor); }}>
                <GitCompareArrows className="h-4 w-4" aria-hidden /> {t("compare")}
              </GreeButton>
              <GreeButton variant="primary" className="flex-1" onClick={() => { toCart(sheetFor); setSheetFor(null); }}>
                <ShoppingBasket className="h-4 w-4" aria-hidden /> {t("addToBasket")}
              </GreeButton>
            </div>
          </div>
        )}
      </GreeBottomSheet>
    </section>
  );
}
