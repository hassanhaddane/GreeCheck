"use client";
import { useTranslations } from "next-intl";
import { X, AlertTriangle } from "lucide-react";
import { Link } from "@/i18n/routing";
import { GreeCard } from "@/components/system/gree-card";
import { GreeScoreRing } from "@/components/system/gree-score-ring";
import { NutriScoreBadge } from "@/components/badges/nutri-score-badge";
import { NovaBadge } from "@/components/badges/nova-badge";
import { cn } from "@/lib/utils/cn";
import type { BattleEntry } from "@greecheck/domain/battle/engine";

/** Compact basket row. `priority` flags an item that should be replaced. */
export function CartItemCard({ entry, onRemove, priority }: { entry: BattleEntry; onRemove: () => void; priority?: boolean }) {
  const tScore = useTranslations("score");
  const t = useTranslations("cart");
  const { product: p, gree } = entry;
  const warning = gree.warnings.find((w) => w.level !== "info");
  return (
    <GreeCard className={cn("flex items-center gap-3 p-2.5", priority && "border-score-d/30 bg-score-d/5")}>
      <Link href={`/product/${p.barcode}`} className="flex min-w-0 flex-1 items-center gap-3">
        <div className="h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-surface-2">
          { }
          {p.imageUrl ? <img src={p.imageUrl} alt={p.name} className="h-full w-full object-contain" loading="lazy" /> : null}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{p.name}</p>
          <div className="mt-0.5 flex items-center gap-1.5">
            {p.nutriScore && <NutriScoreBadge grade={p.nutriScore} variant="compact" className="h-4 w-4 rounded text-[0.55rem]" />}
            {p.novaGroup && <NovaBadge group={p.novaGroup} className="scale-[0.8]" />}
            {warning && <span className="flex items-center gap-0.5 text-[0.65rem] font-medium text-score-d-ink"><AlertTriangle className="h-3 w-3" />{tScore(`warning.${warning.code}`, warning.values)}</span>}
          </div>
        </div>
      </Link>
      <GreeScoreRing value={gree.global} size={42} label="" />
      <button onClick={onRemove} aria-label={t("remove")} className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-surface-2 text-muted gc-pressable hover:text-score-e-ink">
        <X className="h-3.5 w-3.5" />
      </button>
    </GreeCard>
  );
}
