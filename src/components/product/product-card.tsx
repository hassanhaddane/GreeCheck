"use client";
import type * as React from "react";
import { useTranslations } from "next-intl";
import { ChevronRight, Swords, ShoppingBasket, Check } from "lucide-react";
import { useRouter, Link } from "@/i18n/routing";
import { PremiumCard } from "@/components/ui/premium-card";
import { ScoreRing } from "@/components/score/score-ring";
import { MiniRadar } from "@/components/product/nutrition-radar";
import { NutriScoreBadge } from "@/components/badges/nutri-score-badge";
import { NovaBadge } from "@/components/badges/nova-badge";
import { HealthBadge } from "@/components/score/health-badge";
import { useBasketStore } from "@/stores/basket-store";
import { useBattleStore } from "@/stores/battle-store";
import type { Product } from "@/types/product";
import type { GreeScore } from "@/types/scoring";

/**
 * ProductCard — the shared premium product row.
 * Image, name/brand, Nutri/NOVA/Bio/Halal badges, short verdict,
 * GreeScore ring and quick actions (compare, basket).
 */
export function ProductCard({ product: p, gree, showActions = true }: { product: Product; gree: GreeScore; showActions?: boolean }) {
  const tScore = useTranslations("score");
  const tp = useTranslations("product");
  const router = useRouter();
  const basket = useBasketStore();
  const battle = useBattleStore();
  const inBasket = basket.has(p.barcode);

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
    <PremiumCard interactive className="p-0">
      <div className="flex items-center gap-3 p-3">
        <Link href={`/product/${p.barcode}`} className="flex min-w-0 flex-1 items-center gap-3">
          <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-surface-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {p.imageUrl ? <img src={p.imageUrl} alt={p.name} className="h-full w-full object-contain" loading="lazy" /> : null}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{p.name}</p>
            <p className="truncate text-xs text-muted">{p.brand || "—"}</p>
            <div className="mt-1 flex flex-wrap items-center gap-1.5">
              {p.nutriScore && <NutriScoreBadge grade={p.nutriScore} variant="compact" className="h-5 w-5 rounded-md text-[0.6rem]" />}
              {p.novaGroup && <NovaBadge group={p.novaGroup} className="scale-90" />}
              {p.isBio && <HealthBadge className="px-1.5 py-0.5 text-[0.6rem]">Bio</HealthBadge>}
              {p.isHalal && <HealthBadge className="px-1.5 py-0.5 text-[0.6rem]">Halal</HealthBadge>}
              <span className="text-[0.65rem] font-medium text-muted">{tScore(`grade.${gree.grade}`)}</span>
            </div>
          </div>
          <span className="hidden shrink-0 sm:block" aria-hidden><MiniRadar product={p} size={40} /></span>
          <ScoreRing value={gree.global} size={46} label="" />
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
                inBasket ? "bg-natural/15 text-natural" : "bg-surface-2 text-muted hover:bg-natural/15 hover:text-natural"
              }`}
            >
              {inBasket ? <Check className="h-4 w-4" /> : <ShoppingBasket className="h-4 w-4" />}
            </button>
          </div>
        )}
      </div>
    </PremiumCard>
  );
}
