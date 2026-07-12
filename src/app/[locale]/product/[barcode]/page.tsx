"use client";
import { use, useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import {
  Heart, ShoppingBasket, AlertTriangle, Swords, ShieldQuestion, ExternalLink,
  ScanLine, List, FlaskConical, ShieldAlert, BarChart3, GitCompareArrows,
  BookOpenText, Sparkles
} from "lucide-react";
import { Link, useRouter } from "@/i18n/routing";
import { ActionDock } from "@/components/system/action-dock";
import { GreeButton } from "@/components/system/gree-button";
import { GreeCard, GreeCardContent } from "@/components/system/gree-card";
import { CollapsibleSection } from "@/components/ui/collapsible-section";
import { VerdictCard } from "@/components/system/verdict-card";
import { GreeBadge } from "@/components/system/gree-badge";
import { NutriScoreBadge } from "@/components/badges/nutri-score-badge";
import { NovaBadge } from "@/components/badges/nova-badge";
import { LabelBadge } from "@/components/badges/label-badge";
import { SubScoreCards } from "@/components/product/sub-score-cards";
import { GreeDNA } from "@/components/product/gree-dna";
import { Alternatives } from "@/components/product/alternatives";
import { Skeleton } from "@/components/system/loading-state";
import { EmptyState } from "@/components/system/empty-state";
import { ErrorState } from "@/components/system/error-state";
import { getProduct, type ProductLookup } from "@/domains/product/repository";
import { productAddUrl, productContributionUrl } from "@/domains/product/contribute";
import type { Product } from "@/domains/product/model";
import type { ScoreReason } from "@/domains/scoring/types";
import { additiveSeverityOf, computeGreeScore, explainScore } from "@/domains/scoring/gree-score";
import { useFavoritesStore } from "@/domains/library/favorites-store";
import { useCartStore } from "@/domains/cart/store";
import { useHistoryStore } from "@/domains/library/history-store";
import { buildHistoryItem } from "@/domains/library/model";
import { useBattleStore } from "@/domains/battle/store";
import { usePreferencesStore } from "@/domains/criteria/store";

type NutriRow = { key: keyof Product["nutriments"]; labelKey: string; unit: string };

const KEY_NUTRI_ROWS: NutriRow[] = [
  { key: "energyKcal", labelKey: "nutEnergy", unit: "kcal" },
  { key: "sugars", labelKey: "nutSugars", unit: "g" },
  { key: "saturatedFat", labelKey: "nutSatFat", unit: "g" },
  { key: "salt", labelKey: "nutSalt", unit: "g" },
  { key: "fiber", labelKey: "nutFiber", unit: "g" },
  { key: "proteins", labelKey: "nutProteins", unit: "g" }
];

const FULL_NUTRI_ROWS: NutriRow[] = [
  { key: "energyKcal", labelKey: "nutEnergy", unit: "kcal" },
  { key: "sugars", labelKey: "nutSugars", unit: "g" },
  { key: "fat", labelKey: "nutFat", unit: "g" },
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
      addHistory(buildHistoryItem(result.product, gree, tScore(`grade.${gree.grade}`)));
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
        <GreeCard><GreeCardContent className="flex gap-4"><Skeleton className="h-24 w-24 rounded-2xl" /><div className="flex-1 space-y-3 pt-2"><Skeleton className="h-4 w-20" /><Skeleton className="h-5 w-2/3" /><Skeleton className="h-3 w-1/2" /></div></GreeCardContent></GreeCard>
        <GreeCard><GreeCardContent className="flex items-center gap-6"><Skeleton className="h-32 w-32 rounded-full" /><div className="flex-1 space-y-3"><Skeleton className="h-8 w-40" /><Skeleton className="h-16 w-full rounded-2xl" /></div></GreeCardContent></GreeCard>
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

  const ingredientsKnown = Boolean(p.ingredientsText && p.ingredientsText.trim().length > 2);
  const additiveCount = p.additives?.length ?? 0;
  const hasNutrition = Object.values(p.nutriments).some((v) => v !== undefined);
  const hasAllergensOrTraces = Boolean(p.allergens?.length || p.traces?.length);

  const criticalAlert = gree.alerts.length > 0;
  // GreeSwap surfaces immediately only for a poor OR incompatible product.
  const isPoor = score < 50 || gree.grade === "D" || gree.grade === "E" || criticalAlert;

  // At most three primary reasons — the most decision-relevant first.
  const primaryReasons: ScoreReason[] = (
    isPoor
      ? [...gree.topNegatives, ...gree.topPositives]
      : [...gree.topPositives, ...gree.topNegatives]
  ).slice(0, 3);

  const blockingWarnings = gree.warnings.filter((w) => w.level !== "info");

  const confidenceTone =
    gree.confidence === "high" ? "text-natural-strong" : gree.confidence === "medium" ? "text-score-c-ink" : "text-score-d-ink";

  const goToBattle = () => {
    addBattle(p); // full product so the battle has all data
    router.push("/battle");
  };

  const productInBasket = basket.has(p.barcode);
  const addToBasket = () => {
    const result = basket.addProduct(p, gree);
    setBasketNotice(result === "duplicate" ? "duplicate" : "added");
  };
  const toggleFavorite = () =>
    favorites.toggle(buildHistoryItem(p, gree, tScore(`grade.${gree.grade}`)));

  return (
    <div className="mx-auto max-w-2xl space-y-5 pb-4">
      {/* ═══ 1 · Product identity (compact) ═══ */}
      <GreeCard className="overflow-hidden">
        <div className="flex items-center gap-4 p-4">
          <div className="aspect-square w-20 shrink-0 overflow-hidden rounded-2xl bg-surface-2">
            {p.imageUrl ? (
              <Image src={p.imageUrl} alt={p.name} width={80} height={80} sizes="80px" priority className="h-full w-full object-contain" />
            ) : null}
          </div>
          <div className="min-w-0 flex-1">
            {(p.isBio || p.isHalal || p.isVegan || p.isVegetarian) && (
              <div className="mb-1 flex flex-wrap items-center gap-1.5">
                {p.isBio && <LabelBadge kind="bio" />}
                {p.isHalal && <LabelBadge kind="halal" />}
                {p.isVegan && <LabelBadge kind="vegan" />}
                {p.isVegetarian && !p.isVegan && <LabelBadge kind="vegetarian" />}
              </div>
            )}
            <h1 className="truncate text-lg font-bold leading-tight tracking-tight">{p.name}</h1>
            <p className="truncate text-sm text-muted">{[p.brand, p.quantity].filter(Boolean).join(" · ") || "—"}</p>
          </div>
          <GreeButton
            variant={isFav ? "neon" : "soft"}
            size="icon"
            className="shrink-0"
            aria-pressed={isFav}
            aria-label={t("favorite")}
            onClick={toggleFavorite}
          >
            <Heart className={isFav ? "h-5 w-5 fill-current" : "h-5 w-5"} aria-hidden />
          </GreeButton>
        </div>
      </GreeCard>

      {/* ── Stale-data indicator (offline / rate-limited fallback) ── */}
      {lookup.stale && (
        <GreeCard className="flex items-center gap-3 border-verdict-unknown/30 bg-verdict-unknown/5 p-4" role="status">
          <ShieldQuestion className="h-5 w-5 shrink-0 text-verdict-unknown" aria-hidden />
          <p className="flex-1 text-sm font-medium">
            {t("staleBanner", { date: lookup.cachedAt ? new Date(lookup.cachedAt).toLocaleDateString() : "—" })}
          </p>
          <GreeButton variant="soft" size="sm" onClick={() => void getProduct(barcode, { force: true }).then(setLookup)}>
            {t("staleRefresh")}
          </GreeButton>
        </GreeCard>
      )}

      {/* ═══ 2 · Decision hero — the dominant animated GreeScore ═══ */}
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
        {primaryReasons.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1.5">
            {primaryReasons.map((r, i) => (
              <GreeBadge key={i} size="sm" tone={r.kind === "malus" ? "caution" : "brand"}>
                {r.kind === "malus" ? "– " : "+ "}{tScore(`reason.${r.code}`, r.values)}
              </GreeBadge>
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

      {/* ── Critical compatibility / important alerts ── */}
      {blockingWarnings.length > 0 && (
        <div className="space-y-2">
          {blockingWarnings.map((w, i) => (
            <GreeCard key={i} className={`flex items-center gap-3 p-4 ${w.level === "critical" ? "border-score-e/30 bg-score-e/5" : "border-score-d/30 bg-score-d/5"}`}>
              <AlertTriangle className={`h-5 w-5 shrink-0 ${w.level === "critical" ? "text-score-e-ink" : "text-score-d-ink"}`} aria-hidden />
              <p className="text-sm font-medium">{tScore(`warning.${w.code}`, w.values)}</p>
            </GreeCard>
          ))}
        </div>
      )}

      {/* ═══ 3 · Immediate action ═══ */}
      {isPoor ? (
        <Alternatives product={p} prefs={prefs} />
      ) : (
        <GreeCard variant="tinted">
          <GreeCardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted">{t("nextActionHint")}</p>
            <div className="flex shrink-0 gap-2">
              <GreeButton variant={productInBasket ? "neon" : "primary"} size="sm" onClick={addToBasket}>
                <ShoppingBasket className="h-4 w-4" aria-hidden /> {productInBasket ? t("alreadyInBasket") : t("addToBasket")}
              </GreeButton>
              <GreeButton variant="soft" size="sm" onClick={goToBattle}>
                <GitCompareArrows className="h-4 w-4" aria-hidden /> {t("compare")}
              </GreeButton>
            </div>
          </GreeCardContent>
        </GreeCard>
      )}

      {/* ═══ 4 · Visible sub-scores ═══ */}
      <SubScoreCards gree={gree} hasGoals={prefs.goals.length > 0} />

      {/* ═══ 5 · GreeDNA — composition summary ═══ */}
      <GreeDNA product={p} gree={gree} />

      {/* ═══ 6 · Essential details (progressive) ═══ */}
      {hasNutrition && (
        <CollapsibleSection title={t("keyNutrition")} icon={<BarChart3 className="h-5 w-5" />} defaultOpen>
          <p className="mb-2 text-xs text-muted">{t("per100")}</p>
          <div className="divide-y divide-line">
            {KEY_NUTRI_ROWS.filter((row) => p.nutriments[row.key] !== undefined).map((row) => (
              <div key={row.key} className="flex items-center justify-between py-2.5 text-sm">
                <span className="text-muted">{t(row.labelKey)}</span>
                <span className="font-semibold tabular-nums">{`${p.nutriments[row.key]} ${row.unit}`}</span>
              </div>
            ))}
          </div>
        </CollapsibleSection>
      )}

      {ingredientsKnown && (
        <CollapsibleSection title={t("ingredients")} icon={<List className="h-5 w-5" />}>
          <p className="text-sm leading-relaxed text-ink/90">{p.ingredientsText}</p>
        </CollapsibleSection>
      )}

      {(ingredientsKnown || additiveCount > 0) && (
        <CollapsibleSection
          title={t("additives")}
          icon={<FlaskConical className="h-5 w-5" />}
          badge={additiveCount ? <span className="rounded-full bg-surface-2 px-2 py-0.5 text-xs font-semibold text-muted">{additiveCount}</span> : undefined}
        >
          {additiveCount > 0 ? (
            <ul className="space-y-2">
              {p.additives!.map((a) => {
                const severity = additiveSeverityOf(a);
                return (
                  <li key={a} className="rounded-2xl border border-line bg-surface-2 p-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="gc-chip text-xs font-bold">{a.toUpperCase()}</span>
                      <span className="text-xs font-semibold text-muted">{t(`additiveSeverity.${severity}`)}</span>
                    </div>
                    <p className="mt-1.5 text-xs leading-relaxed text-muted">{t(`additiveExplanation.${severity}`)}</p>
                  </li>
                );
              })}
            </ul>
          ) : <p className="text-sm text-muted">{t("noAdditives")}</p>}
        </CollapsibleSection>
      )}

      {hasAllergensOrTraces && (
        <CollapsibleSection
          title={t("allergensTraces")}
          icon={<ShieldAlert className="h-5 w-5" />}
          badge={p.allergens?.length ? <span className="rounded-full bg-surface-2 px-2 py-0.5 text-xs font-semibold text-muted">{p.allergens.length}</span> : undefined}
        >
          {p.allergens?.length ? (
            <div className="flex flex-wrap gap-1.5">
              {p.allergens.map((a) => <span key={a} className="gc-chip text-xs capitalize">{a}</span>)}
            </div>
          ) : null}
          {p.traces?.length ? (
            <div className="mt-3">
              <p className="mb-1.5 text-xs font-semibold text-muted">{t("tracesLabel")}</p>
              <div className="flex flex-wrap gap-1.5">
                {p.traces.map((a) => <span key={a} className="gc-chip text-xs capitalize">{a}</span>)}
              </div>
            </div>
          ) : null}
        </CollapsibleSection>
      )}

      {hasNutrition && (
        <CollapsibleSection title={t("completeNutrition")} icon={<BarChart3 className="h-5 w-5" />}>
          <p className="mb-2 text-xs text-muted">{t("per100")}</p>
          <div className="divide-y divide-line">
            {FULL_NUTRI_ROWS.filter((row) => p.nutriments[row.key] !== undefined).map((row) => (
              <div key={row.key} className="flex items-center justify-between py-2.5 text-sm">
                <span className="text-muted">{t(row.labelKey)}</span>
                <span className="font-semibold tabular-nums">{`${p.nutriments[row.key]} ${row.unit}`}</span>
              </div>
            ))}
          </div>
        </CollapsibleSection>
      )}

      <CollapsibleSection title={t("sourceMethodology")} icon={<BookOpenText className="h-5 w-5" />}>
        <div className="space-y-3 text-sm">
          <p className="text-muted">
            {t("sourceLabel")}: <strong className="text-ink">{t("sourceOpenFoodFacts")}</strong>
          </p>
          <div className="flex flex-wrap gap-2">
            <Link href="/methodology" className="gc-pressable inline-flex h-9 items-center gap-1.5 rounded-2xl bg-surface-2 px-3 text-xs font-semibold">
              <BookOpenText className="h-3.5 w-3.5" aria-hidden /> {t("methodologyLink")}
            </Link>
            <a href={productContributionUrl(barcode)} target="_blank" rel="noreferrer" className="gc-pressable inline-flex h-9 items-center gap-1.5 rounded-2xl bg-surface-2 px-3 text-xs font-semibold">
              <ExternalLink className="h-3.5 w-3.5" aria-hidden /> {t("viewOnOff")}
            </a>
          </div>
        </div>
      </CollapsibleSection>

      <CollapsibleSection title={t("dataConfidence")} icon={<ShieldQuestion className="h-5 w-5" />}>
        <div className="flex items-center gap-2 rounded-2xl bg-surface-2 p-3">
          <ShieldQuestion className={`h-4 w-4 shrink-0 ${confidenceTone}`} aria-hidden />
          <p className="text-xs text-muted">
            {t("breakdownConfidence")} <strong className={confidenceTone}>{t(`confidence.${gree.confidence}`)}</strong>
          </p>
        </div>
        {gree.confidenceReasons.length > 0 && (
          <ul className="mt-2 space-y-1.5">
            {gree.confidenceReasons.map((code) => (
              <li key={code} className="flex items-center gap-2 text-xs text-muted">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-line" aria-hidden />
                {t(`missing.${code}`)}
              </li>
            ))}
            <li className="pt-1">
              <a href={productContributionUrl(barcode)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-xs font-semibold text-natural-strong">
                <ExternalLink className="h-3.5 w-3.5" aria-hidden /> {t("contributeEdit")}
              </a>
            </li>
          </ul>
        )}
      </CollapsibleSection>

      {/* ═══ Sticky contextual action dock ═══ */}
      <ActionDock>
        {basketNotice && (
          <div className="mb-2 flex items-center gap-2 rounded-2xl border border-natural/25 bg-natural/10 p-2.5 text-sm font-semibold text-natural-strong">
            <ShoppingBasket className="h-4 w-4" aria-hidden />
            <span className="min-w-0 flex-1">{t(basketNotice === "added" ? "addedToBasket" : "alreadyInBasket")}</span>
            <GreeButton variant="ghost" size="sm" onClick={() => router.push("/cart")}>
              {t("goToBasket")}
            </GreeButton>
          </div>
        )}
        <div className="flex gap-2">
          <GreeButton variant={isFav ? "neon" : "soft"} size="icon" aria-pressed={isFav} aria-label={t("favorite")} onClick={toggleFavorite}>
            <Heart className={isFav ? "h-5 w-5 fill-current" : "h-5 w-5"} aria-hidden />
          </GreeButton>
          <GreeButton variant={productInBasket ? "neon" : "primary"} className="flex-1" onClick={addToBasket}>
            <ShoppingBasket className="h-5 w-5" aria-hidden /> {productInBasket ? t("alreadyInBasket") : t("addToBasket")}
          </GreeButton>
        </div>
        <div className="mt-2 flex gap-2">
          <GreeButton variant="soft" className="flex-1" onClick={goToBattle}>
            <Swords className="h-5 w-5" aria-hidden /> {inBattle ? t("alreadyInBattle") : battleFull ? t("battleFull") : t("scanBattle")}
          </GreeButton>
          <GreeButton variant="outline" className="flex-1" onClick={() => router.push("/scan")}>
            <ScanLine className="h-5 w-5" aria-hidden /> {t("scanAnother")}
          </GreeButton>
        </div>
      </ActionDock>
    </div>
  );
}
