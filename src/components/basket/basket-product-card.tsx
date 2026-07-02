"use client";
import { AlertTriangle, SearchCheck, Swords, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScoreRing } from "@/components/score/score-ring";
import { GradeBadge } from "@/components/score/grade-badge";
import { NutriScoreBadge } from "@/components/badges/nutri-score-badge";
import { NovaBadge } from "@/components/badges/nova-badge";
import { LabelBadge } from "@/components/badges/label-badge";
import { cn } from "@/lib/utils/cn";
import type { BasketProductAnalysis } from "@/lib/scoring/basket";

interface BasketProductCardProps {
  analysis: BasketProductAnalysis;
  onRemove: () => void;
  onCompare: () => void;
  onFindBetter: () => void;
}

export function BasketProductCard({ analysis, onRemove, onCompare, onFindBetter }: BasketProductCardProps) {
  const t = useTranslations("basket");
  const product = analysis.product;
  const mainIssue =
    analysis.issues.find((issue) => issue.severity === "critical") ??
    analysis.issues.find((issue) => issue.severity === "warning") ??
    analysis.issues[0];
  const serious = mainIssue && mainIssue.severity !== "info";

  return (
    <Card
      className={cn(
        "overflow-hidden p-3 transition",
        serious && "border-score-d/35 bg-score-d/5",
        mainIssue?.severity === "critical" && "border-score-e/40 bg-score-e/5"
      )}
    >
      <div className="flex gap-3">
        <Link
          href={`/product/${product.barcode}`}
          className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-2xl bg-surface-2"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {product.imageUrl ? <img src={product.imageUrl} alt={product.name} className="h-full w-full object-contain" loading="lazy" /> : null}
        </Link>

        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-2">
            <div className="min-w-0 flex-1">
              <Link href={`/product/${product.barcode}`} className="line-clamp-2 text-sm font-bold leading-tight hover:text-natural">
                {product.name}
              </Link>
              <p className="mt-0.5 truncate text-xs text-muted">{product.brand || t("unknownBrand")}</p>
            </div>
            <button
              onClick={onRemove}
              aria-label={t("removeProduct")}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-surface text-muted shadow-soft gc-pressable hover:text-score-e"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <GradeBadge grade={analysis.gree.grade} />
            {product.nutriScore ? <NutriScoreBadge grade={product.nutriScore} variant="compact" className="h-7 w-7 rounded-lg text-xs" /> : null}
            <NovaBadge group={product.novaGroup} className="scale-90" />
            {product.isBio ? <LabelBadge kind="bio" /> : null}
            {product.isHalal ? <LabelBadge kind="halal" /> : null}
          </div>

          {mainIssue ? (
            <p
              className={cn(
                "mt-2 inline-flex items-center gap-1 rounded-xl px-2.5 py-1 text-xs font-semibold",
                mainIssue.severity === "critical"
                  ? "bg-score-e/10 text-score-e"
                  : mainIssue.severity === "warning"
                    ? "bg-score-d/10 text-score-d"
                    : "bg-surface-2 text-muted"
              )}
            >
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              {t(`issue.${mainIssue.key}`, mainIssue.values)}
            </p>
          ) : null}
        </div>

        <div className="hidden shrink-0 place-items-center sm:grid">
          <ScoreRing value={analysis.gree.global} size={66} label="" />
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <Button variant="soft" size="sm" onClick={onCompare}>
          <Swords className="h-4 w-4" /> {t("compareInBattle")}
        </Button>
        <Button variant="outline" size="sm" onClick={onFindBetter}>
          <SearchCheck className="h-4 w-4" /> {t("findBetterAlternative")}
        </Button>
      </div>
    </Card>
  );
}
