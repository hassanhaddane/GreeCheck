"use client";
import { use, useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import {
  Heart, ShoppingBasket, AlertTriangle, Swords, ShieldQuestion, ExternalLink,
  ScanLine, List, FlaskConical, BarChart3, GitCompareArrows, BookOpenText,
  Sparkles, Leaf, Info, Award, FlagTriangleRight, HelpCircle
} from "lucide-react";
import { Link, useRouter } from "@/i18n/routing";
import { ActionDock } from "@/components/system/action-dock";
import { GreeButton } from "@/components/system/gree-button";
import { GreeCard, GreeCardContent } from "@/components/system/gree-card";
import { GreeBottomSheet } from "@/components/system/gree-bottom-sheet";
import { CollapsibleSection } from "@/components/ui/collapsible-section";
import { VerdictCard } from "@/components/system/verdict-card";
import { TrustHalo } from "@/components/system/trust-halo";
import { GreeBadge } from "@/components/system/gree-badge";
import { NutriScoreBadge } from "@/components/badges/nutri-score-badge";
import { NovaBadge } from "@/components/badges/nova-badge";
import { LabelBadge } from "@/components/badges/label-badge";
import { SubScoreCards } from "@/components/product/sub-score-cards";
import { Alternatives } from "@/components/product/alternatives";
import { DataKind } from "@/components/product/data-kind";
import { ImpactBlock, ImpactDetails } from "@/components/product/impact-block";
import { Skeleton } from "@/components/system/loading-state";
import { EmptyState } from "@/components/system/empty-state";
import { ErrorState } from "@/components/system/error-state";
import { getProduct, type ProductLookup } from "@/domains/product/repository";
import { productAddUrl, productContributionUrl } from "@/domains/product/contribute";
import type { Product } from "@greecheck/domain/product/model";
import type { ScoreReason } from "@greecheck/domain/scoring/types";
import { additiveSeverityOf, computeGreeScore, explainScore } from "@greecheck/domain/scoring/gree-score";
import { computeGreeImpact } from "@greecheck/domain/impact/engine";
import { organicCertificationOf } from "@greecheck/domain/scoring/organic";
import { halalStatusOf } from "@greecheck/domain/scoring/detectors";
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
  { key: "salt", labelKey: "nutSalt", unit: "g" }
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

type SheetKind = null | "method" | "confidence" | "why";

export default function ProductPage({ params }: { params: Promise<{ barcode: string }> }) {
  const { barcode } = use(params);
  const t = useTranslations("product");
  const tScore = useTranslations("score");
  const router = useRouter();

  const [lookup, setLookup] = useState<ProductLookup | null>(null); // null = loading
  const [sheet, setSheet] = useState<SheetKind>(null);
  const [basketNotice, setBasketNotice] = useState<"added" | "duplicate" | null>(null);

  const favorites = useFavoritesStore();
  const basket = useCartStore();
  const addHistory = useHistoryStore((s) => s.add);
  const addBattle = useBattleStore((s) => s.add);
  const inBattle = useBattleStore((s) => s.has(barcode));
  const battleFull = useBattleStore((s) => s.items.length >= 3 && !s.items.some((x) => x.barcode === barcode));
  const isFav = favorites.has(barcode);

  const prefs = usePreferencesStore();
  const prefsRef = useRef(prefs);
  useEffect(() => { prefsRef.current = prefs; });

  const load = useCallback(async () => {
    setLookup(null);
    const result = await getProduct(barcode);
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

  if (lookup === null) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <GreeCard><GreeCardContent className="flex gap-4"><Skeleton className="h-24 w-24 rounded-2xl" /><div className="flex-1 space-y-3 pt-2"><Skeleton className="h-4 w-20" /><Skeleton className="h-5 w-2/3" /><Skeleton className="h-3 w-1/2" /></div></GreeCardContent></GreeCard>
        <GreeCard><GreeCardContent className="flex items-center gap-6"><Skeleton className="h-32 w-32 rounded-full" /><div className="flex-1 space-y-3"><Skeleton className="h-8 w-40" /><Skeleton className="h-16 w-full rounded-2xl" /></div></GreeCardContent></GreeCard>
        <Skeleton className="h-40 w-full rounded-2xl" />
      </div>
    );
  }
  if (lookup.kind === "network_error") {
    return <div className="mx-auto max-w-2xl pt-8"><ErrorState title={t("errorTitle")} description={t("errorBody")} onRetry={load} /></div>;
  }
  if (lookup.kind === "rate_limited") {
    return <div className="mx-auto max-w-2xl pt-8"><ErrorState title={t("rateLimited")} description={t("rateLimitedBody")} onRetry={load} /></div>;
  }
  if (lookup.kind === "not_found") {
    return (
      <div className="mx-auto max-w-2xl pt-8">
        <EmptyState icon={ScanLine} title={t("notFound")} description={t("notFoundBody")}
          action={<a href={productAddUrl(barcode)} target="_blank" rel="noreferrer"><GreeButton variant="neon" size="sm"><ExternalLink className="h-4 w-4" /> {t("contribute")}</GreeButton></a>} />
      </div>
    );
  }

  /* ------------------------------ found ------------------------------ */
  const p = lookup.product;
  const gree = computeGreeScore(p, prefs);
  const impact = computeGreeImpact(p);
  const score = gree.global;

  const ingredientsKnown = Boolean(p.ingredientsText && p.ingredientsText.trim().length > 2);
  const additiveCount = p.additives?.length ?? 0;
  const hasNutrition = Object.values(p.nutriments).some((v) => v !== undefined);
  const usedGradeFallback = gree.components?.nutrition.pointsSource === "grade_fallback";

  const criticalAlert = gree.alerts.length > 0;
  const isPoor = score < 50 || gree.grade === "D" || gree.grade === "E" || criticalAlert;

  const primaryReasons: ScoreReason[] = (
    isPoor ? [...gree.topNegatives, ...gree.topPositives] : [...gree.topPositives, ...gree.topNegatives]
  ).slice(0, 3);
  const blockingWarnings = gree.warnings.filter((w) => w.level !== "info");

  // Halal is a COMPATIBILITY fact; unknown/not-confirmed must read "not verified".
  const halal = halalStatusOf(p);
  const halalVerified = halal === "confirmed";
  const halalNotVerified = halal === "not_confirmed" || halal === "unknown";

  const cert = organicCertificationOf(p.labels);
  const otherLabels = (p.labels ?? []).filter((l) => l && !/^(en:)?$/.test(l));

  const confidenceTone = gree.confidence === "high" ? "text-natural-strong" : gree.confidence === "medium" ? "text-score-c-ink" : "text-score-d-ink";

  const goToBattle = () => { addBattle(p); router.push("/battle"); };
  const productInBasket = basket.has(p.barcode);
  const addToBasket = () => setBasketNotice(basket.addProduct(p, gree) === "duplicate" ? "duplicate" : "added");
  const toggleFavorite = () => favorites.toggle(buildHistoryItem(p, gree, tScore(`grade.${gree.grade}`)));

  return (
    <div className="mx-auto max-w-2xl space-y-4 pb-4">
      {/* ═══ 1 · Product identity ═══ */}
      <GreeCard className="overflow-hidden">
        <div className="flex items-center gap-4 p-4">
          <div className="aspect-square w-20 shrink-0 overflow-hidden rounded-2xl bg-surface-2">
            {p.imageUrl ? <Image src={p.imageUrl} alt={p.name} width={80} height={80} sizes="80px" priority className="h-full w-full object-contain" /> : null}
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-lg font-bold leading-tight tracking-tight line-clamp-2">{p.name}</h1>
            <p className="truncate text-sm text-muted">{[p.brand, p.quantity].filter(Boolean).join(" · ") || "—"}</p>
          </div>
          <GreeButton variant={isFav ? "neon" : "soft"} size="icon" className="shrink-0" aria-pressed={isFav} aria-label={t("favorite")} onClick={toggleFavorite}>
            <Heart className={isFav ? "h-5 w-5 fill-current" : "h-5 w-5"} aria-hidden />
          </GreeButton>
        </div>
      </GreeCard>

      {lookup.stale && (
        <GreeCard className="flex items-center gap-3 border-verdict-unknown/30 bg-verdict-unknown/5 p-4" role="status">
          <ShieldQuestion className="h-5 w-5 shrink-0 text-verdict-unknown" aria-hidden />
          <p className="flex-1 text-sm font-medium">{t("staleBanner", { date: lookup.cachedAt ? new Date(lookup.cachedAt).toLocaleDateString() : "—" })}</p>
          <GreeButton variant="soft" size="sm" onClick={() => void getProduct(barcode, { force: true }).then(setLookup)}>{t("staleRefresh")}</GreeButton>
        </GreeCard>
      )}

      {/* ═══ 2 · GreeScore (health) — opinion, method in a sheet ═══ */}
      <VerdictCard gree={gree}>
        <div className="flex flex-wrap items-center gap-1.5 pt-1.5">
          <DataKind kind={usedGradeFallback ? "estimate" : "opinion"} />
          <button onClick={() => setSheet("method")} className="gc-pressable inline-flex items-center gap-1 rounded-full bg-surface-2 px-2 py-0.5 text-[0.65rem] font-semibold text-muted">
            <Info className="h-3 w-3" aria-hidden /> {t("howComputed")}
          </button>
        </div>
        <p className="mt-2 rounded-2xl bg-surface-2/80 p-3 text-sm leading-relaxed">
          <Sparkles className="me-1 inline h-4 w-4 text-natural-strong" aria-hidden />
          {explainScore(gree).map((e) => tScore(`explain.${e.code}`, e.values?.criterion !== undefined ? { criterion: tScore(`criterion.${e.values.criterion}`) } : undefined)).join(" ")}
        </p>
      </VerdictCard>

      {/* ═══ 3 · GreeImpact (environment) — separate from health ═══ */}
      <ImpactBlock impact={impact} />

      {/* ═══ 4 · Data confidence ═══ */}
      <GreeCard>
        <GreeCardContent className="flex items-center gap-3 py-4">
          <TrustHalo level={gree.confidence} size="md" />
          <div className="min-w-0 flex-1">
            <p className={`text-sm font-semibold ${confidenceTone}`}>{t(`confidence.${gree.confidence}`)}</p>
            <p className="text-xs text-muted">{t("confidenceHint")}</p>
          </div>
          <GreeButton variant="soft" size="sm" onClick={() => setSheet("confidence")}>{t("whatsMissing")}</GreeButton>
        </GreeCardContent>
      </GreeCard>

      {/* ═══ 5 · Critical compatibility alerts (never a health verdict) ═══ */}
      {(blockingWarnings.length > 0 || halalNotVerified || halalVerified) && (
        <section aria-label={t("compatibility")} className="space-y-2">
          {blockingWarnings.map((w, i) => (
            <GreeCard key={i} className={`flex items-center gap-3 p-4 ${w.level === "critical" ? "border-score-e/30 bg-score-e/5" : "border-score-d/30 bg-score-d/5"}`}>
              <AlertTriangle className={`h-5 w-5 shrink-0 ${w.level === "critical" ? "text-score-e-ink" : "text-score-d-ink"}`} aria-hidden />
              <p className="text-sm font-medium">{tScore(`warning.${w.code}`, w.values)}</p>
            </GreeCard>
          ))}
          {(halalVerified || halalNotVerified) && (
            <div className="flex items-center gap-2 rounded-2xl bg-surface-2 px-3 py-2.5">
              <span className="text-sm font-medium text-muted">{t("halalLabel")}</span>
              <GreeBadge size="sm" tone={halalVerified ? "positive" : "unknown"}>
                {halalVerified ? t("halalVerified") : t("halalNotVerified")}
              </GreeBadge>
            </div>
          )}
        </section>
      )}

      {/* ═══ 6 · Why this score ═══ */}
      {primaryReasons.length > 0 && (
        <GreeCard>
          <GreeCardContent className="py-4">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-sm font-semibold">{t("understand")}</h2>
              <DataKind kind="opinion" />
            </div>
            <ul className="space-y-2">
              {primaryReasons.map((r, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full text-xs font-bold ${r.kind === "malus" ? "bg-score-d/12 text-score-d-ink" : "bg-pastel-mint text-score-a-ink"}`} aria-hidden>
                    {r.kind === "malus" ? "–" : "+"}
                  </span>
                  <span className="text-sm">{tScore(`reason.${r.code}`, r.values)}</span>
                </li>
              ))}
            </ul>
            <button onClick={() => setSheet("why")} className="gc-pressable mt-3 inline-flex items-center gap-1 text-xs font-semibold text-natural-strong">
              <Info className="h-3.5 w-3.5" aria-hidden /> {t("seeAllReasons")}
            </button>
          </GreeCardContent>
        </GreeCard>
      )}

      {/* Visible sub-scores (health breakdown) */}
      <SubScoreCards gree={gree} hasGoals={prefs.goals.length > 0} />

      {/* ═══ 7 · Nutrition details ═══ */}
      {hasNutrition && (
        <CollapsibleSection title={t("keyNutrition")} icon={<BarChart3 className="h-5 w-5" />} defaultOpen badge={<DataKind kind="fact" />}>
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
      {hasNutrition && (
        <CollapsibleSection title={t("completeNutrition")} icon={<BarChart3 className="h-5 w-5" />} badge={<DataKind kind="fact" />}>
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

      {/* ═══ 8 · Additives ═══ */}
      {(ingredientsKnown || additiveCount > 0) && (
        <CollapsibleSection title={t("additives")} icon={<FlaskConical className="h-5 w-5" />} badge={<DataKind kind="opinion" />}>
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

      {/* ═══ 9 · Ingredients ═══ */}
      {ingredientsKnown && (
        <CollapsibleSection title={t("ingredients")} icon={<List className="h-5 w-5" />} badge={<DataKind kind="fact" />}>
          <p className="text-sm leading-relaxed text-ink/90">{p.ingredientsText}</p>
        </CollapsibleSection>
      )}

      {/* ═══ 10 · Certifications ═══ */}
      {(cert.certified || otherLabels.length > 0) && (
        <CollapsibleSection title={t("certifications")} icon={<Award className="h-5 w-5" />} badge={<DataKind kind="fact" />}>
          {cert.certified && (
            <div className="mb-2 flex items-center gap-2 rounded-2xl bg-pastel-sage p-3">
              <Leaf className="h-4 w-4 shrink-0 text-score-b-ink" aria-hidden />
              <span className="text-sm font-semibold text-score-b-ink capitalize">{cert.label ?? t("organicCertified")}</span>
            </div>
          )}
          <div className="flex flex-wrap gap-1.5">
            {(p.isBio || p.isHalal || p.isVegan || p.isVegetarian) && (
              <>
                {p.isBio && <LabelBadge kind="bio" />}
                {p.isHalal && <LabelBadge kind="halal" />}
                {p.isVegan && <LabelBadge kind="vegan" />}
                {p.isVegetarian && !p.isVegan && <LabelBadge kind="vegetarian" />}
              </>
            )}
            {otherLabels.slice(0, 12).map((l) => <span key={l} className="gc-chip text-xs capitalize">{l}</span>)}
          </div>
        </CollapsibleSection>
      )}

      {/* ═══ 11 · Environmental details ═══ */}
      <CollapsibleSection title={t("environmentalDetails")} icon={<Leaf className="h-5 w-5" />} badge={<DataKind kind="estimate" />}>
        <ImpactDetails impact={impact} />
      </CollapsibleSection>

      {/* ═══ 12 · Better alternatives (only when poor/incompatible) ═══ */}
      {isPoor && <Alternatives product={p} prefs={prefs} />}

      {/* ═══ 13 · Source and last data update ═══ */}
      <CollapsibleSection title={t("sourceMethodology")} icon={<BookOpenText className="h-5 w-5" />}>
        <div className="space-y-3 text-sm">
          <p className="text-muted">{t("sourceLabel")}: <strong className="text-ink">{t("sourceOpenFoodFacts")}</strong></p>
          <p className="text-xs text-muted">
            {lookup.stale && lookup.cachedAt ? t("lastUpdateCached", { date: new Date(lookup.cachedAt).toLocaleDateString() }) : t("lastUpdateLive")}
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

      {/* ═══ 14 · Report a data issue (through the source provider) ═══ */}
      <a href={productContributionUrl(barcode)} target="_blank" rel="noreferrer"
        className="gc-pressable flex items-center gap-2 rounded-2xl border border-line bg-surface px-4 py-3 text-sm text-muted shadow-soft">
        <FlagTriangleRight className="h-4 w-4 shrink-0 text-natural-strong" aria-hidden />
        <span className="flex-1">{t("reportIssue")}</span>
        <ExternalLink className="h-3.5 w-3.5 shrink-0" aria-hidden />
      </a>

      {/* ═══ Sticky contextual action dock ═══ */}
      <ActionDock>
        {basketNotice && (
          <div className="mb-2 flex items-center gap-2 rounded-2xl border border-natural/25 bg-natural/10 p-2.5 text-sm font-semibold text-natural-strong">
            <ShoppingBasket className="h-4 w-4" aria-hidden />
            <span className="min-w-0 flex-1">{t(basketNotice === "added" ? "addedToBasket" : "alreadyInBasket")}</span>
            <GreeButton variant="ghost" size="sm" onClick={() => router.push("/cart")}>{t("goToBasket")}</GreeButton>
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

      {/* ═══ Technical-explanation sheets ═══ */}
      <GreeBottomSheet open={sheet === "method"} onClose={() => setSheet(null)} title={t("methodTitle")} closeLabel={t("close")}>
        <div className="space-y-3 text-sm">
          <p className="text-muted">{t("methodBody")}</p>
          <div className="flex flex-wrap gap-1.5">
            {p.nutriScore && <NutriScoreBadge grade={p.nutriScore} variant="compact" />}
            {p.novaGroup && <NovaBadge group={p.novaGroup} />}
          </div>
          <p className="flex items-start gap-1.5 rounded-2xl bg-pastel-butter p-3 text-xs text-score-c-ink">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden /> {t("notMedical")}
          </p>
          <Link href="/methodology" onClick={() => setSheet(null)} className="inline-flex items-center gap-1.5 text-sm font-semibold text-natural-strong">
            <BookOpenText className="h-4 w-4" aria-hidden /> {t("methodologyLink")}
          </Link>
        </div>
      </GreeBottomSheet>

      <GreeBottomSheet open={sheet === "confidence"} onClose={() => setSheet(null)} title={t("dataConfidence")} closeLabel={t("close")}>
        <div className="space-y-3">
          <div className="flex items-center gap-2 rounded-2xl bg-surface-2 p-3">
            <TrustHalo level={gree.confidence} size="sm" />
            <p className="text-sm"><strong className={confidenceTone}>{t(`confidence.${gree.confidence}`)}</strong></p>
          </div>
          <p className="text-xs text-muted">{t("confidenceExplain")}</p>
          {gree.confidenceReasons.length > 0 && (
            <ul className="space-y-1.5">
              {gree.confidenceReasons.map((code) => (
                <li key={code} className="flex items-center gap-2 text-xs text-muted">
                  <HelpCircle className="h-3 w-3 shrink-0" aria-hidden /> {t(`missing.${code}`)}
                </li>
              ))}
            </ul>
          )}
          <a href={productContributionUrl(barcode)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-xs font-semibold text-natural-strong">
            <ExternalLink className="h-3.5 w-3.5" aria-hidden /> {t("contributeEdit")}
          </a>
        </div>
      </GreeBottomSheet>

      <GreeBottomSheet open={sheet === "why"} onClose={() => setSheet(null)} title={t("understand")} closeLabel={t("close")}>
        <div className="space-y-2">
          <p className="mb-1 text-xs text-muted">{t("whyOpinionNote")}</p>
          <ul className="space-y-1.5">
            {gree.reasons.map((r, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <span className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full text-xs font-bold ${r.kind === "malus" ? "bg-score-d/12 text-score-d-ink" : r.kind === "bonus" ? "bg-pastel-mint text-score-a-ink" : "bg-surface-2 text-muted"}`} aria-hidden>
                  {r.kind === "malus" ? "–" : r.kind === "bonus" ? "+" : "·"}
                </span>
                <span>{tScore(`reason.${r.code}`, r.values)}</span>
              </li>
            ))}
          </ul>
        </div>
      </GreeBottomSheet>
    </div>
  );
}
