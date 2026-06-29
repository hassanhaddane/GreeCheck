"use client";
import { use } from "react";
import { useTranslations } from "next-intl";
import { Heart, GitCompareArrows, Sparkles, ShoppingBasket, Award, AlertTriangle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SectionTitle } from "@/components/ui/section-title";
import { ScoreRing } from "@/components/score/score-ring";
import { NutriScoreBadge } from "@/components/badges/nutri-score-badge";
import { NovaBadge } from "@/components/badges/nova-badge";
import { LabelBadge } from "@/components/badges/label-badge";
import { NutritionRadar } from "@/components/radar/nutrition-radar";
import { useFavoritesStore } from "@/stores/favorites-store";
import { useBasketStore } from "@/stores/basket-store";

// Placeholder product — real data will come from Open Food Facts via /api/product.
const DEMO = {
  name: "Produit exemple",
  brand: "Marque",
  score: 78,
  secondary: [
    { key: "healthScore", value: 82 },
    { key: "naturalityScore", value: 74 },
    { key: "processingScore", value: 68 },
    { key: "additivesScore", value: 90 }
  ]
};

export default function ProductPage({ params }: { params: Promise<{ barcode: string }> }) {
  const { barcode } = use(params);
  const t = useTranslations("product");
  const favorites = useFavoritesStore();
  const basket = useBasketStore();
  const isFav = favorites.has(barcode);

  const item = { barcode, name: DEMO.name, score: DEMO.score };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Header */}
      <Card className="overflow-hidden">
        <div className="grid gap-4 p-5 sm:grid-cols-[120px_1fr] sm:items-center">
          <div className="aspect-square w-28 justify-self-center rounded-2xl bg-surface-2 sm:w-full" />
          <div>
            <div className="flex flex-wrap items-center gap-1.5">
              <LabelBadge kind="halal" />
              <LabelBadge kind="bio" />
            </div>
            <h1 className="mt-2 text-xl font-bold tracking-tight">{DEMO.name}</h1>
            <p className="text-sm text-muted">{DEMO.brand} · {barcode}</p>
          </div>
        </div>
      </Card>

      {/* GreeScore */}
      <Card>
        <CardContent className="flex flex-col items-center gap-5 sm:flex-row sm:items-center sm:gap-7">
          <ScoreRing value={DEMO.score} size={140} tone="neon" />
          <div className="flex-1 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <NutriScoreBadge grade="b" />
              <NovaBadge group={3} />
              <span className="inline-flex items-center gap-1.5 rounded-xl bg-surface-2 px-2.5 py-1.5 text-xs font-semibold text-muted">
                {t("greenScore")} <span className="grid h-6 w-6 place-items-center rounded-lg bg-score-a text-white">A</span>
              </span>
            </div>
            <p className="rounded-2xl bg-surface-2 p-3 text-sm leading-relaxed">
              <Sparkles className="me-1 inline h-4 w-4 text-natural" />
              Bon choix global, mais attention au sucre. Produit peu transformé, sans additif critique détecté.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Secondary scores */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {DEMO.secondary.map((s) => (
          <Card key={s.key} className="p-4 text-center">
            <p className="text-2xl font-bold tabular-nums">{s.value}</p>
            <p className="mt-1 text-xs text-muted">{s.key.replace("Score", "")}</p>
          </Card>
        ))}
      </div>

      {/* Radar */}
      <Card>
        <CardContent className="grid place-items-center">
          <SectionTitle>{t("radar")}</SectionTitle>
          <NutritionRadar />
        </CardContent>
      </Card>

      {/* Warning */}
      <Card className="flex items-center gap-3 border-score-d/30 bg-score-d/5 p-4">
        <AlertTriangle className="h-5 w-5 shrink-0 text-score-d" />
        <p className="text-sm font-medium">Sucre élevé (18 g / 100 g)</p>
      </Card>

      {/* Sections placeholders */}
      {(["ingredients", "additives", "allergens", "nutrition"] as const).map((sec) => (
        <Card key={sec}>
          <CardContent>
            <SectionTitle>{t(sec)}</SectionTitle>
            <p className="text-sm text-muted">—</p>
          </CardContent>
        </Card>
      ))}

      {/* Alternatives */}
      <section>
        <SectionTitle>{t("alternatives")}</SectionTitle>
        <div className="grid gap-3 sm:grid-cols-2">
          {[1, 2].map((i) => (
            <Card key={i} className="flex items-center gap-3 p-3">
              <div className="h-14 w-14 shrink-0 rounded-xl bg-surface-2" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">Alternative {i}</p>
                <p className="flex items-center gap-1 text-xs text-natural"><Award className="h-3 w-3" /> Moins sucrée</p>
              </div>
              <ScoreRing value={88} size={44} label="" />
            </Card>
          ))}
        </div>
      </section>

      {/* Sticky actions */}
      <div className="sticky bottom-24 z-30 flex gap-2 md:bottom-4">
        <Button
          variant={isFav ? "neon" : "soft"}
          size="icon"
          aria-label={t("favorite")}
          onClick={() => favorites.toggle({ ...item, verdict: "", scannedAt: Date.now() })}
        >
          <Heart className={isFav ? "h-5 w-5 fill-current" : "h-5 w-5"} />
        </Button>
        <Button variant="soft" className="flex-1" onClick={() => basket.add(item)}>
          <ShoppingBasket className="h-5 w-5" /> {t("addToBasket")}
        </Button>
        <Button variant="primary" className="flex-1">
          <GitCompareArrows className="h-5 w-5" /> {t("compare")}
        </Button>
      </div>
    </div>
  );
}
