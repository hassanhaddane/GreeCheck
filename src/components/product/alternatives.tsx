"use client";
import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { GitCompareArrows, ShoppingBasket, ArrowRight } from "lucide-react";
import { Link, useRouter } from "@/i18n/routing";
import { GreeCard } from "@/components/system/gree-card";
import { GreeButton } from "@/components/system/gree-button";
import { GreeBadge } from "@/components/system/gree-badge";
import { GreeScoreRing } from "@/components/system/gree-score-ring";
import { TrustHalo } from "@/components/system/trust-halo";
import { GreeBottomSheet } from "@/components/system/gree-bottom-sheet";
import { ProductThumbnail } from "@/components/system/product-thumbnail";
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

  const locale = useLocale() as LocalPreferences["language"];
  const heading = useRef<HTMLHeadingElement>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [attempt, setAttempt] = useState(0);
  const [items, setItems] = useState<Alternative[]>([]);
  const [added, setAdded] = useState<Set<string>>(new Set());
  const [sheetFor, setSheetFor] = useState<Alternative | null>(null);

  useEffect(() => {
    heading.current?.focus();
  }, []);

  useEffect(() => {
    const request = new AbortController();
    getAlternatives(product, prefs, request.signal)
      .then(result => { if (!request.signal.aborted) { setItems(result); setStatus("ready"); } })
      .catch(() => { if (!request.signal.aborted) setStatus("error"); });
    return () => request.abort();
  }, [product, prefs, attempt]);

  const compare = (alt: Alternative) => {
    addBattle(product);
    addBattle(alt.product);
    router.push("/compare");
  };
  const toCart = (alt: Alternative) => {
    addProduct(alt.product, alt.gree);
    setAdded((s) => new Set(s).add(alt.product.barcode));
  };

  return (
    <section className="min-w-0 space-y-2" aria-labelledby="alternatives-heading">
      <h2 id="alternatives-heading" ref={heading} tabIndex={-1} className="gc-heading">{t("swap.title")}</h2>

      {status === "loading" ? <div role="status" aria-label={tc("loading")}><ProductRowSkeleton /></div>
        : status === "error" ? (
          <GreeCard className="space-y-2 p-3">
            <p role="status" className="text-sm text-muted">{t("alternativeError")}</p>
            <GreeButton variant="outline" size="sm" onClick={() => { setStatus("loading"); setAttempt(a => a + 1); }}>{tc("retry")}</GreeButton>
          </GreeCard>
        ) : items.length === 0 ? <p role="status" className="rounded-xl border border-line bg-surface p-3 text-sm text-muted">{t("noAlternative")}</p>
        : (
          <ul className="space-y-2">
            {items.slice(0, 1).map(alt => {
              const p = alt.product;
              const name = p.localizedNames?.[locale] ?? p.name;
              return (
                <li key={p.barcode}>
                  <GreeCard className="space-y-2 p-3">
                    <Link href={`/product/${p.barcode}`} className="flex min-h-12 items-center gap-2.5 rounded-lg hover:text-natural-strong">
                      <ProductThumbnail src={p.imageUrl} size="md" />
                      <div className="min-w-0 flex-1">
                        <p className="break-words text-sm font-semibold">{name}</p>
                        {p.brand && <p className="break-words text-xs text-muted">{p.brand}</p>}
                      </div>
                      <GreeBadge tone="positive" size="sm" className="shrink-0"><span className="sr-only">GreeScore </span><bdi>{alt.gree.score}/100</bdi></GreeBadge>
                    </Link>
                    <p className="rounded-lg bg-pastel-sage px-2.5 py-1.5 text-sm font-medium">{label(alt.strongest)}</p>
                    <div className="flex flex-wrap gap-2">
                      <GreeButton variant="outline" size="sm" onClick={() => compare(alt)}>{t("compare")}</GreeButton>
                      <GreeButton variant="ghost" size="sm" onClick={() => setSheetFor(alt)}>{t("swap.whyBetter")}</GreeButton>
                    </div>
                  </GreeCard>
                </li>
              );
            })}
          </ul>
        )}

      {/* "Why better?" — measurable breakdown */}
      <GreeBottomSheet open={sheetFor !== null} onClose={() => setSheetFor(null)} title={t("swap.whyBetterTitle")} closeLabel={tc("close")}>
        {sheetFor && (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <GreeScoreRing value={sheetFor.gree.score} size={56} label={sheetFor.gree.grade} />
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
              <GreeButton variant="primary" className="flex-1" onClick={() => { toCart(sheetFor); setSheetFor(null); }} disabled={added.has(sheetFor.product.barcode)}>
                <ShoppingBasket className="h-4 w-4" aria-hidden /> {t("addToBasket")}
              </GreeButton>
            </div>
          </div>
        )}
      </GreeBottomSheet>
    </section>
  );
}
