"use client";
import { GreeCard, GreeCardContent } from "@/components/system/gree-card";
import { use, useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import {
  Heart, GitCompareArrows, Sparkles, ShoppingBasket, AlertTriangle, Swords,
  ShieldQuestion, ExternalLink, ScanLine, List, FlaskConical, ShieldAlert, BarChart3
} from "lucide-react";
import { useRouter } from "@/i18n/routing";
import { ActionDock } from "@/components/system/action-dock";
import { GreeButton } from "@/components/system/gree-button";
import { SectionTitle } from "@/components/ui/section-title";
import { CollapsibleSection } from "@/components/ui/collapsible-section";
import { GreeScoreRing } from "@/components/system/gree-score-ring";
import { VerdictCard } from "@/components/system/verdict-card";
import { GreeBadge } from "@/components/system/gree-badge";
import { ScoreBreakdown } from "@/components/score/score-breakdown";
import { NutriScoreBadge } from "@/components/badges/nutri-score-badge";
import { NovaBadge } from "@/components/badges/nova-badge";
import { LabelBadge } from "@/components/badges/label-badge";
import { NutritionRadar } from "@/components/product/nutrition-radar";
import { Alternatives } from "@/components/product/alternatives";
import { Skeleton } from "@/components/system/loading-state";
import { EmptyState } from "@/components/system/empty-state";
import { ErrorState } from "@/components/system/error-state";
import { getProduct, type ProductLookup } from "@/domains/product/repository";
import { productAddUrl, productContributionUrl } from "@/domains/product/contribute";
import type { Product } from "@/domains/product/model";
import { computeGreeScore, explainScore } from "@/domains/scoring/gree-score";
import { useFavoritesStore } from "@/domains/library/favorites-store";
import { useCartStore } from "@/domains/cart/store";
import { useHistoryStore } from "@/domains/library/history-store";
import { useBattleStore } from "@/domains/battle/store";
import { usePreferencesStore } from "@/domains/criteria/store";

const GRADE_BG: Record<string, string> = {
  A: "bg-score-a-ink", B: "bg-score-b-ink", C: "bg-score-c-ink", D: "bg-score-d-ink", E: "bg-score-e-ink"
};

const NUTRI_ROWS: { key: keyof Product["nutriments"]; labelKey: string; unit: string }[] = [
  { key: "energyKcal", labelKey: "nutEnergy", unit: "kcal" },
  { key: "sugars", labelKey: "nutSugars", unit: "g" },
  { key: "saturatedFat", labelKey: "nutSatFat", unit: "g" },
  { key: "salt", labelKey: "nutSalt", unit: "g" },
  { key: "fiber", labelKey: "nutFiber", unit: "g" },
  { key: "proteins", labelKey: "nutProteins", unit: "g" }
];

export default function ProductPage({ params }: { params: Promise<{ barcode: string }> }) {
  const { barcode } = use(params);
  const t = useTranslations("product");
  const tScore = useTranslations("score");
  const router = useRouter();

  const [lookup, setLookup] = useState<ProductLookup | null>(null); // null = loading
  const [basketNotice, setBasketNotice] = useState<"added" | "duplicate" | null>(null);

  const favorites = useFavoritesStore();
  const basket = useCartStore();
  const addHistory = useHistoryStore((s) => s.add);
  const addBattle = useBattleStore((s) => s.add);
  const inBattle = useBattleStore((s) => s.has(barcode));
  const battleFull = useBattleStore((s) => s.items.length >= 3 && !s.items.some((x) => x.barcode === barcode));
  const isFav = favorites.has(barcode);

  // Preferences live only on the device; kept in a ref so fetching isn't re-triggered.
  const prefs = usePreferencesStore();
  const prefsRef = useRef(prefs);
  // Keep latest prefs without writing a ref during render (react-hooks/refs).
  useEffect(() => {
    prefsRef.current = prefs;
  });

  const load = useCallback(async () => {
    setLookup(null);
    const result = await getProduct(barcode); // never throws — normalized envelope
    setLookup(result);
    if (result.kind === "product") {
      const gree = computeGreeScore(result.product, prefsRef.current);
      addHistory({
        barcode: result.product.barcode,
        name: result.product.name,
        imageUrl: result.product.imageUrl,
        score: gree.global,
        verdict: tScore(`grade.${gree.grade}`),
        scannedAt: Date.now()
      });
    }
  }, [barcode, addHistory, tScore]);

  useEffect(() => {
    const id = setTimeout(load, 0);
    return () => clearTimeout(id);
  }, [load]);

  /* ----------------------------- loading ----------------------------- */
  if (lookup === null) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <GreeCard><GreeCardContent className="flex gap-4"><Skeleton className="h-28 w-28 rounded-2xl" /><div className="flex-1 space-y-3 pt-2"><Skeleton className="h-4 w-20" /><Skeleton className="h-5 w-2/3" /><Skeleton className="h-3 w-1/2" /></div></GreeCardContent></GreeCard>
        <GreeCard><GreeCardContent className="flex items-center gap-6"><Skeleton className="h-36 w-36 rounded-full" /><div className="flex-1 space-y-3"><Skeleton className="h-8 w-40" /><Skeleton className="h-16 w-full rounded-2xl" /></div></GreeCardContent></GreeCard>
        <Skeleton className="h-40 w-full rounded-2xl" />
      </div>
    );
  }

  /* --------------------------- network error ------------------------- */
  if (lookup.kind === "network_error") {
    return (
      <div className="mx-auto max-w-2xl pt-8">
        <ErrorState title={t("errorTitle")} description={t("errorBody")} onRetry={load} />
      </div>
    );
  }

  /* ---------------------------- API limited -------------------------- */
  if (lookup.kind === "rate_limited") {
    return (
      <div className="mx-auto max-w-2xl pt-8">
        <ErrorState title={t("rateLimited")} description={t("rateLimitedBody")} onRetry={load} />
      </div>
    );
  }

  /* ---------------------------- not found ---------------------------- */
  if (lookup.kind === "not_found") {
    return (
      <div className="mx-auto max-w-2xl pt-8">
        <EmptyState
          icon={ScanLine}
          title={t("notFound")}
          description={t("notFoundBody")}
          action={
            <a href={productAddUrl(barcode)} target="_blank" rel="noreferrer">
              <GreeButton variant="neon" size="sm"><ExternalLink className="h-4 w-4" /> {t("contribute")}</GreeButton>
            </a>
          }
        />
      </div>
    );
  }

  /* ------------------------------ found ------------------------------ */
  const p = lookup.product;
  // Live, personalized GreeScore — recomputes if the user changes preferences.
  const gree = computeGreeScore(p, prefs);
  const score = gree.global;
  const item = { barcode: p.barcode, name: p.name, imageUrl: p.imageUrl, score };

  const blockingWarnings = gree.warnings.filter((w) => w.level !== "info");

  const goToBattle = () => {
    addBattle(p); // full product so the battle has all data
    router.push("/battle");
  };

  const productInBasket = basket.has(p.barcode);
  const addToBasket = () => {
    const result = basket.addProduct(p, gree);
    setBasketNotice(result === "duplicate" ? "duplicate" : "added");
  };

  return (
    <div className="mx-auto max-w-2xl space-y-5 pb-4">
      {/* ── Header ── */}
      <GreeCard className="overflow-hidden">
        <div className="grid gap-4 p-5 sm:grid-cols-[120px_1fr] sm:items-center">
          <div className="aspect-square w-28 justify-self-center overflow-hidden rounded-2xl bg-surface-2 sm:w-full">
            { }
            {p.imageUrl ? <img src={p.imageUrl} alt={p.name} className="h-full w-full object-contain" loading="lazy" /> : null}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-1.5">
              {p.isHalal && <LabelBadge kind="halal" />}
              {p.isBio && <LabelBadge kind="bio" />}
              {p.isVegan && <LabelBadge kind="vegan" />}
              {p.isVegetarian && !p.isVegan && <LabelBadge kind="vegetarian" />}
            </div>
            <h1 className="mt-2 text-xl font-bold leading-tight tracking-tight">{p.name}</h1>
            <p className="text-sm text-muted">{[p.brand, p.quantity].filter(Boolean).join(" · ") || "—"}</p>
            <p className="mt-0.5 text-xs text-muted">{p.barcode}</p>
          </div>
        </div>
      </GreeCard>

      {/* ── Stale-data indicator (offline / rate-limited fallback) ── */}
      {lookup.stale && (
        <GreeCard className="flex items-center gap-3 border-verdict-unknown/30 bg-verdict-unknown/5 p-4" role="status">
          <ShieldQuestion className="h-5 w-5 shrink-0 text-verdict-unknown" />
          <p className="flex-1 text-sm font-medium">
            {t("staleBanner", { date: lookup.cachedAt ? new Date(lookup.cachedAt).toLocaleDateString() : "—" })}
          </p>
          <GreeButton variant="soft" size="sm" onClick={() => void getProduct(barcode, { force: true }).then(setLookup)}>
            {t("staleRefresh")}
          </GreeButton>
        </GreeCard>
      )}

      {/* ── Incomplete / confidence state ── */}
      {lookup.confidence !== "high" && (
        <GreeCard className="flex items-center gap-3 border-score-c/30 bg-score-c/5 p-4">
          <ShieldQuestion className="h-5 w-5 shrink-0 text-score-c-ink" />
          <p className="flex-1 text-sm font-medium">
            {lookup.status === "insufficient_for_score" ? t("incomplete") : t("confidenceMedium")} — {t("dataMissing")}
          </p>
          <a href={productContributionUrl(barcode)} target="_blank" rel="noreferrer" className="shrink-0">
            <GreeButton variant="soft" size="sm"><ExternalLink className="h-3.5 w-3.5" /> {t("contributeEdit")}</GreeButton>
          </a>
        </GreeCard>
      )}

      {/* ── Verdict (Décider) ── */}
      <VerdictCard gree={gree}>
        <div className="flex flex-wrap items-center gap-2 pt-1.5">
          {p.nutriScore && <NutriScoreBadge grade={p.nutriScore} variant="compact" />}
          {p.novaGroup && <NovaBadge group={p.novaGroup} />}
          {p.greenScore && (
            <span className="inline-flex items-center gap-1.5 rounded-xl bg-surface-2 px-2.5 py-1.5 text-xs font-semibold text-muted">
              {t("greenScore")} <span className="grid h-6 w-6 place-items-center rounded-lg bg-score-a text-white">{p.greenScore.toUpperCase()}</span>
            </span>
          )}
        </div>
        {(gree.topNegatives.length > 0 || gree.topPositives.length > 0) && (
          <div className="flex flex-wrap gap-1.5 pt-1.5">
            {gree.topNegatives.map((r, i) => (
              <GreeBadge key={`n${i}`} size="sm" tone="caution">– {tScore(`reason.${r.code}`, r.values)}</GreeBadge>
            ))}
            {gree.topPositives.map((r, i) => (
              <GreeBadge key={`p${i}`} size="sm" tone="brand">+ {tScore(`reason.${r.code}`, r.values)}</GreeBadge>
            ))}
          </div>
        )}
        <p className="mt-2 rounded-2xl bg-surface-2/80 p-3 text-sm leading-relaxed">
          <Sparkles className="me-1 inline h-4 w-4 text-natural-strong" aria-hidden />
          {explainScore(gree)
            .map((e) =>
              tScore(
                `explain.${e.code}`,
                e.values?.criterion !== undefined
                  ? { criterion: tScore(`criterion.${e.values.criterion}`) }
                  : undefined
              )
            )
            .join(" ")}
        </p>
      </VerdictCard>

      {/* ── GreeScore breakdown: "Why this score?" ── */}
      <ScoreBreakdown gree={gree} hasGoals={prefs.goals.length > 0} />

      {/* ── Important alerts ── */}
      {blockingWarnings.length > 0 && (
        <div className="space-y-2">
          {blockingWarnings.map((w, i) => (
            <GreeCard key={i} className={`flex items-center gap-3 p-4 ${w.level === "critical" ? "border-score-e/30 bg-score-e/5" : "border-score-d/30 bg-score-d/5"}`}>
              <AlertTriangle className={`h-5 w-5 shrink-0 ${w.level === "critical" ? "text-score-e-ink" : "text-score-d-ink"}`} />
              <p className="text-sm font-medium">{tScore(`warning.${w.code}`, w.values)}</p>
            </GreeCard>
          ))}
        </div>
      )}

      {/* ── Nutrition radar ── */}
      <GreeCard>
        <GreeCardContent className="grid place-items-center">
          <SectionTitle>{t("radar")}</SectionTitle>
          <NutritionRadar product={p} />
        </GreeCardContent>
      </GreeCard>

      {/* ── Collapsible details ── */}
      <CollapsibleSection title={t("ingredients")} icon={<List className="h-5 w-5" />} defaultOpen>
        <p className="text-sm leading-relaxed text-ink/90">{p.ingredientsText || <span className="text-muted">{t("notProvided")}</span>}</p>
      </CollapsibleSection>

      <CollapsibleSection
        title={t("additives")}
        icon={<FlaskConical className="h-5 w-5" />}
        badge={p.additives?.length ? <span className="rounded-full bg-surface-2 px-2 py-0.5 text-xs font-semibold text-muted">{p.additives.length}</span> : undefined}
      >
        {p.additives && p.additives.length ? (
          <div className="flex flex-wrap gap-1.5">
            {p.additives.map((a) => <span key={a} className="gc-chip text-xs">{a.toUpperCase()}</span>)}
          </div>
        ) : <p className="text-sm text-muted">{t("noAdditives")}</p>}
      </CollapsibleSection>

      <CollapsibleSection
        title={t("allergens")}
        icon={<ShieldAlert className="h-5 w-5" />}
        badge={p.allergens?.length ? <span className="rounded-full bg-surface-2 px-2 py-0.5 text-xs font-semibold text-muted">{p.allergens.length}</span> : undefined}
      >
        {p.allergens && p.allergens.length ? (
          <div className="flex flex-wrap gap-1.5">
            {p.allergens.map((a) => <span key={a} className="gc-chip text-xs capitalize">{a}</span>)}
          </div>
        ) : <p className="text-sm text-muted">{t("noAllergens")}</p>}
      </CollapsibleSection>

      <CollapsibleSection title={t("nutrition")} icon={<BarChart3 className="h-5 w-5" />} defaultOpen>
        <p className="mb-2 text-xs text-muted">{t("per100")}</p>
        <div className="divide-y divide-line">
          {NUTRI_ROWS.map((row) => {
            const v = p.nutriments[row.key];
            return (
              <div key={row.key} className="flex items-center justify-between py-2.5 text-sm">
                <span className="text-muted">{t(row.labelKey)}</span>
                <span className="font-semibold tabular-nums">{v !== undefined ? `${v} ${row.unit}` : "—"}</span>
              </div>
            );
          })}
        </div>
      </CollapsibleSection>

      {/* ── Discrete ad ── */}

      {/* ── Alternatives (only when the product is medium or poor) ── */}
      {score < 65 && <Alternatives product={p} prefs={prefs} />}

      {/* ── Floating actions dock ── */}
      <ActionDock>
        {basketNotice && (
          <div className="mb-2 flex items-center gap-2 rounded-2xl border border-natural/25 bg-natural/10 p-2.5 text-sm font-semibold text-natural-strong">
            <ShoppingBasket className="h-4 w-4" />
            <span className="min-w-0 flex-1">{t(basketNotice === "added" ? "addedToBasket" : "alreadyInBasket")}</span>
            <GreeButton variant="ghost" size="sm" onClick={() => router.push("/cart")}>
              {t("goToBasket")}
            </GreeButton>
          </div>
        )}
        <div className="flex gap-2">
          <GreeButton variant={isFav ? "neon" : "soft"} size="icon" aria-label={t("favorite")}
            onClick={() => favorites.toggle({ ...item, verdict: tScore(`grade.${gree.grade}`), scannedAt: Date.now() })}>
            <Heart className={isFav ? "h-5 w-5 fill-current" : "h-5 w-5"} />
          </GreeButton>
          <GreeButton variant={productInBasket ? "neon" : "soft"} className="flex-1" onClick={addToBasket}>
            <ShoppingBasket className="h-5 w-5" /> {productInBasket ? t("alreadyInBasket") : t("addToBasket")}
          </GreeButton>
        </div>
        <div className="mt-2 flex gap-2">
          <GreeButton variant="primary" className="flex-1" onClick={goToBattle}>
            <Swords className="h-5 w-5" /> {inBattle ? t("alreadyInBattle") : battleFull ? t("battleFull") : t("scanBattle")}
          </GreeButton>
          <GreeButton variant="outline" className="flex-1" onClick={goToBattle}>
            <GitCompareArrows className="h-5 w-5" /> {t("compare")}
          </GreeButton>
        </div>
      </ActionDock>
    </div>
  );
}
