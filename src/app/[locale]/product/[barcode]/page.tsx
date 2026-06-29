"use client";
import { use, useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import {
  Heart, GitCompareArrows, Sparkles, ShoppingBasket, AlertTriangle,
  ShieldQuestion, ExternalLink, ScanLine
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SectionTitle } from "@/components/ui/section-title";
import { ScoreRing } from "@/components/score/score-ring";
import { NutriScoreBadge } from "@/components/badges/nutri-score-badge";
import { NovaBadge } from "@/components/badges/nova-badge";
import { LabelBadge } from "@/components/badges/label-badge";
import { NutritionRadar } from "@/components/radar/nutrition-radar";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { getProduct } from "@/lib/api/client";
import type { ProductResult } from "@/lib/api/openfoodfacts";
import type { Product, Confidence } from "@/types/product";
import { radarValues } from "@/lib/scoring/provisional";
import { computeGreeScore } from "@/lib/scoring/gree-score";
import { useFavoritesStore } from "@/stores/favorites-store";
import { useBasketStore } from "@/stores/basket-store";
import { useHistoryStore } from "@/stores/history-store";
import { usePreferencesStore } from "@/stores/preferences-store";

const CONFIDENCE_LABEL: Record<Confidence, string> = {
  high: "Confiance élevée",
  medium: "Confiance moyenne",
  low: "Confiance faible"
};

const NUTRI_ROWS: { key: keyof Product["nutriments"]; label: string; unit: string }[] = [
  { key: "energyKcal", label: "Énergie", unit: "kcal" },
  { key: "sugars", label: "Sucres", unit: "g" },
  { key: "saturatedFat", label: "Gras saturés", unit: "g" },
  { key: "salt", label: "Sel", unit: "g" },
  { key: "fiber", label: "Fibres", unit: "g" },
  { key: "proteins", label: "Protéines", unit: "g" }
];

export default function ProductPage({ params }: { params: Promise<{ barcode: string }> }) {
  const { barcode } = use(params);
  const t = useTranslations("product");

  const [state, setState] = useState<"loading" | "error" | ProductResult["status"]>("loading");
  const [data, setData] = useState<ProductResult | null>(null);

  const favorites = useFavoritesStore();
  const basket = useBasketStore();
  const addHistory = useHistoryStore((s) => s.add);
  const isFav = favorites.has(barcode);

  // Preferences live only on the device; kept in a ref so fetching isn't re-triggered.
  const prefs = usePreferencesStore();
  const prefsRef = useRef(prefs);
  prefsRef.current = prefs;

  const load = useCallback(async () => {
    setState("loading");
    try {
      const result = await getProduct(barcode);
      setData(result);
      setState(result.status);
      if (result.status !== "not_found") {
        const gree = computeGreeScore(result.product, prefsRef.current);
        addHistory({
          barcode: result.product.barcode,
          name: result.product.name,
          imageUrl: result.product.imageUrl,
          score: gree.global,
          verdict: gree.label,
          scannedAt: Date.now()
        });
      }
    } catch {
      setState("error");
    }
  }, [barcode, addHistory]);

  useEffect(() => {
    load();
  }, [load]);

  if (state === "loading") {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <Card><CardContent className="flex gap-4"><Skeleton className="h-28 w-28 rounded-2xl" /><div className="flex-1 space-y-3 pt-2"><Skeleton className="h-4 w-20" /><Skeleton className="h-5 w-2/3" /><Skeleton className="h-3 w-1/2" /></div></CardContent></Card>
        <Card><CardContent className="flex items-center gap-6"><Skeleton className="h-36 w-36 rounded-full" /><div className="flex-1 space-y-3"><Skeleton className="h-8 w-40" /><Skeleton className="h-16 w-full rounded-2xl" /></div></CardContent></Card>
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  if (state === "error") {
    return (
      <div className="mx-auto max-w-2xl pt-8">
        <ErrorState
          title="Impossible de charger le produit"
          description="Open Food Facts est momentanément indisponible."
          onRetry={load}
        />
      </div>
    );
  }

  if (state === "not_found" || !data || data.status === "not_found") {
    return (
      <div className="mx-auto max-w-2xl pt-8">
        <EmptyState
          icon={ScanLine}
          title={t("notFound")}
          description="Open Food Facts est une base collaborative. Tu peux ajouter ce produit pour aider la communauté."
          action={
            <a href={`https://world.openfoodfacts.org/cgi/product.pl?type=add&code=${barcode}`} target="_blank" rel="noreferrer">
              <Button variant="neon" size="sm"><ExternalLink className="h-4 w-4" /> {t("contribute")}</Button>
            </a>
          }
        />
      </div>
    );
  }

  const p = data.product;
  // Live, personalized GreeScore — recomputes if the user changes preferences.
  const gree = computeGreeScore(p, prefs);
  const score = gree.global;
  const item = { barcode: p.barcode, name: p.name, imageUrl: p.imageUrl, score };
  const lowConfidence = data.confidence !== "high";

  const subScores = [
    { label: "Santé", value: gree.healthScore },
    { label: "Naturalité", value: gree.naturalityScore },
    { label: "Transfo.", value: gree.processingScore },
    { label: "Additifs", value: gree.additivesScore },
    ...(prefs.goals.length ? [{ label: "Objectif", value: gree.goalScore }] : []),
    ...(gree.ecologyScore !== undefined ? [{ label: "Écologie", value: gree.ecologyScore }] : [])
  ];

  const blockingWarnings = gree.warnings.filter((w) => w.level !== "info");

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Header */}
      <Card className="overflow-hidden">
        <div className="grid gap-4 p-5 sm:grid-cols-[120px_1fr] sm:items-center">
          <div className="aspect-square w-28 justify-self-center overflow-hidden rounded-2xl bg-surface-2 sm:w-full">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {p.imageUrl ? <img src={p.imageUrl} alt={p.name} className="h-full w-full object-contain" loading="lazy" /> : null}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-1.5">
              {p.isHalal && <LabelBadge kind="halal" />}
              {p.isBio && <LabelBadge kind="bio" />}
              {p.isVegan && <LabelBadge kind="vegan" />}
              {p.isVegetarian && !p.isVegan && <LabelBadge kind="vegetarian" />}
            </div>
            <h1 className="mt-2 text-xl font-bold tracking-tight">{p.name}</h1>
            <p className="text-sm text-muted">{[p.brand, p.quantity].filter(Boolean).join(" · ") || p.barcode}</p>
            <p className="mt-0.5 text-xs text-muted">{p.barcode}</p>
          </div>
        </div>
      </Card>

      {lowConfidence && (
        <Card className="flex items-center gap-3 border-score-c/30 bg-score-c/5 p-4">
          <ShieldQuestion className="h-5 w-5 shrink-0 text-score-c" />
          <p className="text-sm font-medium">{CONFIDENCE_LABEL[data.confidence]} — certaines données manquent.</p>
        </Card>
      )}

      {/* GreeScore */}
      <Card>
        <CardContent className="flex flex-col items-center gap-5 sm:flex-row sm:gap-7">
          <ScoreRing value={score} size={140} tone="neon" />
          <div className="flex-1 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              {p.nutriScore && <NutriScoreBadge grade={p.nutriScore} />}
              {p.novaGroup && <NovaBadge group={p.novaGroup} />}
              {p.greenScore && (
                <span className="inline-flex items-center gap-1.5 rounded-xl bg-surface-2 px-2.5 py-1.5 text-xs font-semibold text-muted">
                  {t("greenScore")} <span className="grid h-6 w-6 place-items-center rounded-lg bg-score-a text-white">{p.greenScore.toUpperCase()}</span>
                </span>
              )}
            </div>
            {gree.reasons.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {gree.reasons.slice(0, 4).map((r, i) => (
                  <span
                    key={i}
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${
                      r.kind === "bonus" ? "bg-natural/10 text-natural"
                      : r.kind === "malus" ? "bg-score-d/10 text-score-d"
                      : "bg-surface-2 text-muted"
                    }`}
                  >
                    {r.kind === "bonus" ? "+" : r.kind === "malus" ? "–" : "•"} {r.label}
                  </span>
                ))}
              </div>
            )}
            <p className="rounded-2xl bg-surface-2 p-3 text-sm leading-relaxed">
              <Sparkles className="me-1 inline h-4 w-4 text-natural" />
              GreeScore <strong>{gree.global}</strong> — {gree.label}. Calculé localement à partir de la nutrition, de la transformation, des additifs, des labels{prefs.goals.length ? " et de tes objectifs" : ""}.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Sub-scores */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {subScores.map((s) => (
          <Card key={s.label} className="p-4 text-center">
            <p className="text-2xl font-bold tabular-nums">{s.value}</p>
            <p className="mt-1 text-xs text-muted">{s.label}</p>
          </Card>
        ))}
      </div>

      {/* Warnings from the engine */}
      {blockingWarnings.length > 0 && (
        <div className="space-y-2">
          {blockingWarnings.map((w, i) => (
            <Card
              key={i}
              className={`flex items-center gap-3 p-4 ${
                w.level === "critical" ? "border-score-e/30 bg-score-e/5" : "border-score-d/30 bg-score-d/5"
              }`}
            >
              <AlertTriangle className={`h-5 w-5 shrink-0 ${w.level === "critical" ? "text-score-e" : "text-score-d"}`} />
              <p className="text-sm font-medium">{w.label}</p>
            </Card>
          ))}
        </div>
      )}

      {/* Radar */}
      <Card>
        <CardContent className="grid place-items-center">
          <SectionTitle>{t("radar")}</SectionTitle>
          <NutritionRadar values={radarValues(p)} />
        </CardContent>
      </Card>

      {/* Ingredients */}
      <Card><CardContent>
        <SectionTitle>{t("ingredients")}</SectionTitle>
        <p className="text-sm leading-relaxed text-ink/90">{p.ingredientsText || <span className="text-muted">—</span>}</p>
      </CardContent></Card>

      {/* Additives */}
      <Card><CardContent>
        <SectionTitle>{t("additives")}</SectionTitle>
        {p.additives && p.additives.length ? (
          <div className="flex flex-wrap gap-1.5">
            {p.additives.map((a) => <span key={a} className="gc-chip text-xs">{a.toUpperCase()}</span>)}
          </div>
        ) : <p className="text-sm text-muted">Aucun additif détecté</p>}
      </CardContent></Card>

      {/* Allergens */}
      <Card><CardContent>
        <SectionTitle>{t("allergens")}</SectionTitle>
        {p.allergens && p.allergens.length ? (
          <div className="flex flex-wrap gap-1.5">
            {p.allergens.map((a) => <span key={a} className="gc-chip text-xs capitalize">{a}</span>)}
          </div>
        ) : <p className="text-sm text-muted">—</p>}
      </CardContent></Card>

      {/* Nutrition table */}
      <Card><CardContent>
        <SectionTitle>{t("nutrition")} <span className="ms-1 normal-case text-muted">/ 100 g</span></SectionTitle>
        <div className="divide-y divide-line">
          {NUTRI_ROWS.map((row) => {
            const v = p.nutriments[row.key];
            return (
              <div key={row.key} className="flex items-center justify-between py-2.5 text-sm">
                <span className="text-muted">{row.label}</span>
                <span className="font-semibold tabular-nums">{v !== undefined ? `${v} ${row.unit}` : "—"}</span>
              </div>
            );
          })}
        </div>
      </CardContent></Card>

      {/* Sticky actions */}
      <div className="sticky bottom-24 z-30 flex gap-2 md:bottom-4">
        <Button variant={isFav ? "neon" : "soft"} size="icon" aria-label={t("favorite")}
          onClick={() => favorites.toggle({ ...item, verdict: "", scannedAt: Date.now() })}>
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
