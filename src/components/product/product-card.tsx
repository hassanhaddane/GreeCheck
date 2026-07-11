"use client";
import { GreeBadge } from "@/components/system/gree-badge";
import { ProductThumbnail } from "@/components/system/product-thumbnail";
import type * as React from "react";
import { useTranslations } from "next-intl";
import { ChevronRight, Swords, ShoppingBasket, Check, Trophy, AlertTriangle, ArrowUp, Sparkles } from "lucide-react";
import { useRouter, Link } from "@/i18n/routing";
import { GreeCard } from "@/components/system/gree-card";
import { GreeScoreRing } from "@/components/system/gree-score-ring";
import { MiniRadar } from "@/components/product/nutrition-radar";
import { NutriScoreBadge } from "@/components/badges/nutri-score-badge";
import { NovaBadge } from "@/components/badges/nova-badge";
import { useCartStore } from "@/domains/cart/store";
import { useBattleStore } from "@/domains/battle/store";
import type { Product } from "@/domains/product/model";
import type { GreeScore } from "@/domains/scoring/types";

/**
 * ProductCard — the shared premium product row.
 * Image, name/brand, Nutri/NOVA/Bio/Halal badges, short verdict,
 * GreeScore ring and quick actions (compare, basket).
 */
export interface ProductCardProps {
  product: Product;
  gree: GreeScore;
  showActions?: boolean;
  /** Ribbon marking the best personalized choice in a result list. */
  bestChoice?: boolean;
  /** Hint that a better-scored option exists higher in the list. */
  betterAvailable?: boolean;
}

export function ProductCard({ product: p, gree, showActions = true, bestChoice, betterAvailable }: ProductCardProps) {
  const tScore = useTranslations("score");
  const tp = useTranslations("product");
  const router = useRouter();
  const basket = useCartStore();
  const battle = useBattleStore();
  const inBasket = basket.has(p.barcode);

  // Search-result intelligence: real signals from the scoring engine.
  const topReason = gree.reasons.find((r) => r.kind === "bonus");
  const blockingWarning = gree.warnings.find((w) => w.level !== "info");
  const lowScore = gree.global < 45;

  const addToBattle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    battle.add(p);
    router.push("/battle");
  };
  const addToBasket = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    basket.addProduct(p, gree);
  };

  return (
    <GreeCard interactive className={`p-0 ${bestChoice ? "border-natural/40 ring-1 ring-natural/25" : ""}`}>
      {bestChoice && (
        <div className="flex items-center gap-1.5 rounded-t-2xl bg-natural-grad px-3 py-1 text-[0.65rem] font-bold uppercase tracking-wide text-white">
          <Trophy className="h-3 w-3" aria-hidden /> {tScore("bestChoice")}
        </div>
      )}
      <div className="flex items-center gap-3 p-3">
        <Link href={`/product/${p.barcode}`} className="flex min-w-0 flex-1 items-center gap-3">
          <ProductThumbnail src={p.imageUrl} alt={p.name} size="lg" className="h-14 w-14" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{p.name}</p>
            <p className="truncate text-xs text-muted">{p.brand || "—"}</p>
            <div className="mt-1 flex flex-wrap items-center gap-1.5">
              {p.nutriScore && <NutriScoreBadge grade={p.nutriScore} variant="compact" className="h-5 w-5 rounded-md text-[0.6rem]" />}
              {p.novaGroup && <NovaBadge group={p.novaGroup} className="scale-90" />}
              {p.isBio && <GreeBadge tone="brand" size="sm">Bio</GreeBadge>}
              {p.isHalal && <GreeBadge tone="brand" size="sm">Halal</GreeBadge>}
              <span className="text-[0.65rem] font-medium text-muted">{tScore(`grade.${gree.grade}`)}</span>
            </div>
          </div>
          <span className="hidden shrink-0 sm:block" aria-hidden><MiniRadar product={p} size={40} /></span>
          <GreeScoreRing value={gree.global} size={46} label="" />
          <ChevronRight className="hidden h-4 w-4 shrink-0 text-muted rtl:rotate-180 sm:block" />
        </Link>
        {showActions && (
          <div className="flex shrink-0 flex-col gap-1.5">
            <button
              type="button"
              onClick={addToBattle}
              aria-label={tp("scanBattle")}
              title={tp("scanBattle")}
              className="gc-pressable grid h-8 w-8 place-items-center rounded-xl bg-surface-2 text-muted transition hover:bg-deep hover:text-white"
            >
              <Swords className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={addToBasket}
              aria-label={tp("addToBasket")}
              title={tp("addToBasket")}
              className={`gc-pressable grid h-8 w-8 place-items-center rounded-xl transition ${
                inBasket ? "bg-natural/15 text-natural-strong" : "bg-surface-2 text-muted hover:bg-natural/15 hover:text-natural-strong"
              }`}
            >
              {inBasket ? <Check className="h-4 w-4" /> : <ShoppingBasket className="h-4 w-4" />}
            </button>
          </div>
        )}
      </div>

      {(topReason || blockingWarning || lowScore || betterAvailable) && (
        <div className="space-y-1 border-t border-line/70 px-3 py-2">
          {topReason && !lowScore && (
            <p className="flex items-center gap-1.5 text-[0.7rem] text-natural-strong">
              <Sparkles className="h-3 w-3 shrink-0" aria-hidden />
              {tScore(`reason.${topReason.code}`, topReason.values)}
            </p>
          )}
          {blockingWarning && (
            <p className={`flex items-center gap-1.5 text-[0.7rem] ${blockingWarning.level === "critical" ? "text-score-e-ink" : "text-score-d-ink"}`}>
              <AlertTriangle className="h-3 w-3 shrink-0" aria-hidden />
              {tScore(`warning.${blockingWarning.code}`, blockingWarning.values)}
            </p>
          )}
          {lowScore && !blockingWarning && (
            <p className="flex items-center gap-1.5 text-[0.7rem] text-score-d-ink">
              <AlertTriangle className="h-3 w-3 shrink-0" aria-hidden />
              {tScore("lowScoreWarning")}
            </p>
          )}
          {betterAvailable && (
            <p className="flex items-center gap-1.5 text-[0.7rem] font-medium text-muted">
              <ArrowUp className="h-3 w-3 shrink-0 text-natural-strong" aria-hidden />
              {tScore("betterAvailable")}
            </p>
          )}
        </div>
      )}
    </GreeCard>
  );
}
