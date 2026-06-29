"use client";
import { useTranslations } from "next-intl";
import { X, Trophy, AlertTriangle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { ScoreRing } from "@/components/score/score-ring";
import { NutriScoreBadge } from "@/components/badges/nutri-score-badge";
import { NovaBadge } from "@/components/badges/nova-badge";
import { LabelBadge } from "@/components/badges/label-badge";
import { cn } from "@/lib/utils/cn";
import type { BattleEntry } from "@/lib/scoring/battle";

const GRADE_BG: Record<string, string> = { A: "bg-score-a", B: "bg-score-b", C: "bg-score-c", D: "bg-score-d", E: "bg-score-e" };

export function BattleCard({ entry, isWinner, onRemove }: { entry: BattleEntry; isWinner?: boolean; onRemove: () => void }) {
  const t = useTranslations("battle");
  const { product: p, gree } = entry;
  const warning = gree.warnings.find((w) => w.level !== "info");

  return (
    <Card className={cn("relative flex flex-col items-center gap-2 p-3 text-center transition", isWinner && "border-neon shadow-glow")}>
      {isWinner && (
        <span className="absolute -top-2.5 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1 rounded-full bg-neon-grad px-2.5 py-0.5 text-[0.6rem] font-bold text-deep shadow-glow">
          <Trophy className="h-3 w-3" /> {t("bestChoice")}
        </span>
      )}
      <button onClick={onRemove} aria-label="remove" className="absolute end-2 top-2 z-10 grid h-6 w-6 place-items-center rounded-full bg-surface-2 text-muted gc-pressable hover:text-score-e">
        <X className="h-3.5 w-3.5" />
      </button>

      <div className="mt-1 h-14 w-14 overflow-hidden rounded-xl bg-surface-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {p.imageUrl ? <img src={p.imageUrl} alt={p.name} className="h-full w-full object-contain" loading="lazy" /> : null}
      </div>

      <div className="relative">
        <ScoreRing value={gree.global} size={70} label="" tone={isWinner ? "neon" : "band"} />
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
        <p className="flex items-center gap-1 rounded-lg bg-score-d/10 px-2 py-1 text-[0.6rem] font-medium text-score-d">
          <AlertTriangle className="h-3 w-3 shrink-0" /> {warning.label}
        </p>
      )}
    </Card>
  );
}
