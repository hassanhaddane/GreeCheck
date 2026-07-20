"use client";
import { useTranslations } from "next-intl";
import { X, Trophy, AlertTriangle, ShoppingBasket } from "lucide-react";
import { GreeCard } from "@/components/system/gree-card";
import { GreeButton } from "@/components/system/gree-button";
import { GreeScoreRing } from "@/components/system/gree-score-ring";
import { NutriScoreBadge } from "@/components/badges/nutri-score-badge";
import { NovaBadge } from "@/components/badges/nova-badge";
import { LabelBadge } from "@/components/badges/label-badge";
import { cn } from "@/lib/utils/cn";
import type { BattleEntry } from "@greecheck/domain/battle/engine";

const GRADE_BG: Record<string, string> = { A: "bg-score-a", B: "bg-score-b", C: "bg-score-c", D: "bg-score-d", E: "bg-score-e" };

export function BattleCard({
  entry,
  isWinner,
  inBasket,
  onRemove,
  onAddBasket
}: {
  entry: BattleEntry;
  isWinner?: boolean;
  inBasket?: boolean;
  onRemove: () => void;
  onAddBasket?: () => void;
}) {
  const t = useTranslations("battle");
  const tc = useTranslations("common");
  const tScore = useTranslations("score");
  const { product: p, gree } = entry;
  const warning = gree.warnings.find((w) => w.level !== "info");

  return (
    <GreeCard className={cn("relative flex flex-col items-center gap-2 p-3 text-center transition", isWinner && "border-neon shadow-glow")}>
      {isWinner && (
        <span className="absolute -top-2.5 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1 rounded-full bg-neon-grad px-2.5 py-0.5 text-[0.6rem] font-bold text-deep shadow-glow">
          <Trophy className="h-3 w-3" /> {t("bestChoice")}
        </span>
      )}
      <button onClick={onRemove} aria-label={tc("remove")} className="absolute end-1 top-1 z-10 grid h-11 w-11 place-items-center rounded-full bg-surface-2 text-muted gc-pressable hover:text-score-e-ink">
        <X className="h-3.5 w-3.5" />
      </button>

      <div className="mt-1 h-14 w-14 overflow-hidden rounded-xl bg-surface-2">
        { }
        {p.imageUrl ? <img src={p.imageUrl} alt={p.name} className="h-full w-full object-contain" loading="lazy" /> : null}
      </div>

      <div className="relative">
        <GreeScoreRing value={gree.global} size={70} label="" tone={isWinner ? "brand" : "band"} />
        <span className={cn("absolute -right-1 -top-1 grid h-6 w-6 place-items-center rounded-lg text-xs font-extrabold text-white", GRADE_BG[gree.grade])}>
          {gree.grade}
        </span>
      </div>

      <p className="line-clamp-2 min-h-[2.2rem] text-xs font-semibold leading-tight">{p.name}</p>
      <p className="truncate text-[0.65rem] text-muted">{p.brand || "—"}</p>

      <div className="flex flex-wrap items-center justify-center gap-1">
        {p.nutriScore && <NutriScoreBadge grade={p.nutriScore} variant="compact" className="h-5 w-5 rounded-md text-[0.6rem]" />}
        {p.novaGroup && <NovaBadge group={p.novaGroup} className="scale-90" />}
        {p.isBio && <LabelBadge kind="bio" />}
        {p.isHalal && <LabelBadge kind="halal" />}
      </div>

      {warning && (
        <p className="flex items-center gap-1 rounded-lg bg-score-d/10 px-2 py-1 text-[0.6rem] font-medium text-score-d-ink">
          <AlertTriangle className="h-3 w-3 shrink-0" /> {tScore(`warning.${warning.code}`, warning.values)}
        </p>
      )}

      {onAddBasket && (
        <GreeButton variant={inBasket ? "neon" : "soft"} size="sm" className="mt-auto h-8 w-full px-2 text-[0.68rem]" onClick={onAddBasket}>
          <ShoppingBasket className="h-3.5 w-3.5" /> {inBasket ? t("goToBasket") : t("addToBasket")}
        </GreeButton>
      )}
    </GreeCard>
  );
}
