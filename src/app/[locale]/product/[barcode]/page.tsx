"use client";
import { use, useCallback, useEffect, useRef, useState } from "react";

import { useLocale, useTranslations } from "next-intl";
import {
  Heart, ShoppingBasket, AlertTriangle, Swords, ShieldQuestion, ExternalLink,
  ScanLine, List, FlaskConical, BarChart3, ListPlus, BookOpenText,
  ArrowDown, Leaf, Info, Award, FlagTriangleRight, HelpCircle
} from "lucide-react";
import { Link, useRouter, type Locale } from "@/i18n/routing";
import { ProductThumbnail } from "@/components/system/product-thumbnail";
import { GreeButton, greeButtonVariants } from "@/components/system/gree-button";
import { GreeCard } from "@/components/system/gree-card";
import { GreeBottomSheet } from "@/components/system/gree-bottom-sheet";
import { CollapsibleSection } from "@/components/ui/collapsible-section";
import { useShoppingListStore } from "@/domains/list/store";
import { isSwapEligible, preciseCategory } from "@greecheck/domain/swap/engine";
import { TrustHalo } from "@/components/system/trust-halo";
import { GreeBadge } from "@/components/system/gree-badge";
import { NutriScoreBadge } from "@/components/badges/nutri-score-badge";
import { NovaBadge } from "@/components/badges/nova-badge";
import { LabelBadge } from "@/components/badges/label-badge";
import { Alternatives } from "@/components/product/alternatives";
import { ProductSourceDetails } from "@/components/product/source-details";
import { additiveEvidenceFor } from "@greecheck/domain/scoring/additive-evidence";
import { DataKind } from "@/components/product/data-kind";
import { ImpactBlock, ImpactDetails } from "@/components/product/impact-block";
import { GreeCoachButton } from "@/components/coach/gree-coach";
import { Skeleton } from "@/components/system/loading-state";
import { EmptyState } from "@/components/system/empty-state";
import { ErrorState } from "@/components/system/error-state";
import { getProduct, type ProductLookup } from "@/domains/product/repository";
import { productAddUrl, productContributionUrl } from "@/domains/product/contribute";
import type { Product } from "@greecheck/domain/product/model";
import { computeGreeScore } from "@greecheck/domain/scoring/gree-score";
import { computeGreeImpact } from "@greecheck/domain/impact/engine";
import { specificOrganicLabelOf } from "@greecheck/domain/scoring/organic";
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
  const data = useTranslations("productData");
  const locale = useLocale() as Locale;
  const router = useRouter();

  const [lookup, setLookup] = useState<ProductLookup | null>(null); // null = loading
  const [sheet, setSheet] = useState<SheetKind>(null);
  const [requestedAlternative, setRequestedAlternative] = useState<string | null>(null);
  const [basketNotice, setBasketNotice] = useState<"added" | "duplicate" | null>(null);

  const list = useShoppingListStore();
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
      addHistory(buildHistoryItem({ ...result.product, name: result.product.localizedNames?.[locale] ?? result.product.name }, gree, (gree.status === "scored" ? tScore(`grade.${gree.grade}`) : tScore("gs3Unavailable"))));
    }
  }, [barcode, addHistory, tScore, locale]);

  useEffect(() => {
    const id = setTimeout(load, 0);
    return () => clearTimeout(id);
  }, [load]);

  if (lookup === null) {
    return (
      <div className="mx-auto max-w-[54rem] space-y-4" role="status" aria-label={t("loadingProduct")}>
        <GreeCard className="space-y-4 p-4 sm:p-6">
          <div className="flex items-center gap-4">
            <Skeleton className="h-20 w-20 shrink-0 rounded-xl" />
            <div className="min-w-0 flex-1 space-y-2"><Skeleton className="h-7 w-4/5" /><Skeleton className="h-4 w-1/2" /></div>
          </div>
          <Skeleton className="h-20 w-full rounded-xl" />
        </GreeCard>
        <Skeleton className="h-24 w-full rounded-xl" />
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
          action={<a href={productAddUrl(barcode)} target="_blank" rel="noreferrer" className={greeButtonVariants({ size: "sm" })}><ExternalLink className="h-4 w-4" aria-hidden /> {t("contribute")}</a>} />
      </div>
    );
  }

  /* ------------------------------ found ------------------------------ */
  const p = { ...lookup.product, name: lookup.product.localizedNames?.[locale] ?? (lookup.product.name || barcode) };
  const per100 = p.nutritionBasis
    ? data(p.nutritionBasis === "100ml" ? "perVolume" : "perMass")
    : data("unknownBasis");
  const sourceUrl = p.provenance?.barcode?.sourceUrl ?? productContributionUrl(barcode);
  const gree = computeGreeScore(p, prefs);
  const impact = computeGreeImpact(p);

  const ingredientsKnown = Boolean(p.ingredientsText && p.ingredientsText.trim().length > 2);
  const additiveCount = p.additives?.length ?? 0;
  const hasNutrition = Object.values(p.nutriments).some((v) => v !== undefined);

  const canFindAlternative = gree.status === "scored" && Boolean(p.categoryIds?.at(-1) ?? preciseCategory(p)) && isSwapEligible(p, gree, prefs).eligible;
  const primaryReason = (gree.score !== undefined && gree.score < 65)
    ? gree.topNegatives[0] ?? gree.topPositives[0]
    : gree.topPositives[0] ?? gree.topNegatives[0];
  const blockingWarnings = gree.warnings.filter(w => w.level === "warning");
  const scoreColor = gree.status !== "scored" ? "bg-surface-2"
    : gree.grade === "A" || gree.grade === "B" ? "bg-pastel-sage text-score-a-ink"
      : gree.grade === "C" ? "bg-pastel-butter text-score-c-ink" : "bg-pastel-blush text-score-e-ink";
  const overviewNutrients = KEY_NUTRI_ROWS.filter(row => p.nutriments[row.key] !== undefined);

  const cert = specificOrganicLabelOf(p.labels);
  const otherLabels = (p.labels ?? []).filter((l) => l && !/^(en:)?$/.test(l));

  const confidenceTone = gree.confidence === "high" ? "text-natural-strong" : gree.confidence === "medium" ? "text-score-c-ink" : "text-score-d-ink";

  const goToBattle = () => { addBattle(p); router.push("/compare"); };
  const productInBasket = basket.has(p.barcode);
  const addToBasket = () => setBasketNotice(basket.addProduct(p, gree) === "duplicate" ? "duplicate" : "added");
  const toggleFavorite = () => favorites.toggle(buildHistoryItem(p, gree, gree.status === "scored" ? tScore(`grade.${gree.grade}`) : tScore("gs3Unavailable")));
  const inList = list.items.some(item => item.barcode === p.barcode);
  const addToList = async () => {
    await list.ensureHydrated();
    if (useShoppingListStore.getState().items.some(item => item.barcode === p.barcode)) {
      router.push("/list");
      return;
    }
    await list.add({ name: p.name, barcode: p.barcode, imageUrl: p.imageUrl, grade: gree.grade });
  };
  const findAlternative = () => {
    if (requestedAlternative === barcode) document.getElementById("alternatives-heading")?.focus();
    else setRequestedAlternative(barcode);
  };

  return (
    <article className="mx-auto max-w-[54rem] space-y-5 pb-2">
      <GreeCard className="overflow-hidden">
        <div className="space-y-4 p-4 sm:p-6">
          <div className="flex items-center gap-3 sm:gap-5">
            <ProductThumbnail src={p.imageUrl} size="lg" className="gc-product-photo" />
            <div className="min-w-0 flex-1">
              <h1 className="gc-editorial break-words text-[clamp(1.55rem,4vw,2.6rem)]">{p.name}</h1>
              {(p.brand || p.quantity) && <p className="mt-1 break-words text-sm text-muted">{[p.brand, p.quantity].filter(Boolean).join(" · ")}</p>}
            </div>
            <GreeButton variant={isFav ? "primary" : "outline"} size="icon" className="shrink-0" aria-pressed={isFav} aria-label={t("favorite")} onClick={toggleFavorite}>
              <Heart className={isFav ? "h-5 w-5 fill-current" : "h-5 w-5"} aria-hidden />
            </GreeButton>
          </div>

          {gree.alerts.map(alert => (
            <p key={alert.code} role="alert" className="flex items-start gap-2 rounded-xl border border-score-e/30 bg-pastel-blush p-3 text-sm font-semibold text-score-e-ink">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              {tScore(`warning.${alert.code}`, alert.values)}
            </p>
          ))}

          <div className="grid gap-3 sm:grid-cols-[minmax(9rem,auto)_minmax(0,1fr)]">
            <div className={`flex min-w-0 items-center gap-3 rounded-xl px-3 py-2.5 sm:gap-4 ${scoreColor}`}>
              {gree.status === "scored" && <bdi className="shrink-0 text-3xl font-bold tabular-nums sm:text-4xl">{gree.score}<span className="text-sm font-semibold">/100</span></bdi>}
              <div className="min-w-0">
                <h2 className="text-xs font-bold">GreeScore</h2>
                <p className="text-sm font-semibold">{gree.status === "scored" ? tScore(`verdict.${gree.verdict}`) : tScore("gs3Unavailable")}</p>
              </div>
            </div>
            <div className="flex min-w-0 flex-col justify-center px-1">
              <p className="text-sm leading-relaxed">
                {gree.status === "unscored" ? tScore("unscored." + gree.reason.code, gree.reason.values)
                  : primaryReason ? tScore(`reason.${primaryReason.code}`, primaryReason.values) : t("scoreSummary")}
              </p>
              {gree.status === "unscored" && <button type="button" className="min-h-9 self-start text-sm font-semibold text-natural-strong hover:underline" onClick={() => setSheet("confidence")}>{t("whatsMissing")}</button>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
            {canFindAlternative && <GreeButton onClick={findAlternative} className="col-span-2 w-full sm:w-auto">{t("findAlternative")} <ArrowDown className="h-4 w-4 shrink-0" aria-hidden /></GreeButton>}
            <GreeButton variant="outline" className="min-w-0 px-2 sm:px-3" onClick={goToBattle}>
              <Swords className="h-4 w-4 shrink-0" aria-hidden /> {inBattle ? t("alreadyInBattle") : battleFull ? t("battleFull") : t("compare")}
            </GreeButton>
            <GreeButton variant="outline" className="min-w-0 px-2 sm:px-3" onClick={() => void addToList()}>
              <ListPlus className="h-4 w-4 shrink-0" aria-hidden /> {inList ? t("viewList") : t("addToList")}
            </GreeButton>
          </div>
        </div>
      </GreeCard>

      {lookup.stale && (
        <GreeCard className="flex flex-wrap items-center gap-2 p-3" role="status">
          <ShieldQuestion className="h-4 w-4 shrink-0 text-muted" aria-hidden />
          <p className="min-w-0 flex-1 text-sm">{t("staleBanner", { date: lookup.cachedAt ? new Date(lookup.cachedAt).toLocaleDateString(locale) : "—" })}</p>
          <GreeButton variant="soft" size="sm" onClick={() => void getProduct(barcode, { force: true }).then(setLookup)}>{t("staleRefresh")}</GreeButton>
        </GreeCard>
      )}
      {!!p.conflicts?.length && <p className="rounded-xl border border-line bg-surface p-3 text-sm" role="status">{data("conflictBanner")}</p>}
      {blockingWarnings.map(warning => <p key={warning.code} className="rounded-xl bg-pastel-butter p-3 text-sm text-score-c-ink">{tScore(`warning.${warning.code}`, warning.values)}</p>)}

      <div className="grid gap-4 md:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)] md:items-start">
        <section className="space-y-3" aria-labelledby="product-facts">
          <h2 id="product-facts" className="gc-heading">{t("productFacts")}</h2>
          <GreeCard className="p-3 sm:p-4">
            {overviewNutrients.length > 0 && (
              <>
                <div className="flex flex-wrap items-baseline justify-between gap-1">
                  <h3 className="text-sm font-semibold">{t("keyNutrition")}</h3>
                  <span className="text-xs text-muted">{per100}</span>
                </div>
                <dl className="mt-2 grid grid-cols-2 gap-1.5">
                  {overviewNutrients.map(row => (
                    <div key={row.key} className="min-w-0 rounded-lg bg-surface-2 px-2.5 py-2">
                      <dt className="text-xs text-muted">{t(row.labelKey)}</dt>
                      <dd className="mt-0.5 text-base font-semibold tabular-nums"><bdi>{p.nutriments[row.key]} <span className="text-sm font-medium">{row.unit}</span></bdi></dd>
                    </div>
                  ))}
                </dl>
              </>
            )}
            <div className={overviewNutrients.length ? "mt-3 space-y-2 border-t border-line pt-3" : "space-y-2"}>
              {p.novaGroup && <div className="flex flex-wrap items-center justify-between gap-1 text-sm"><span>{t("processing")}</span><NovaBadge group={p.novaGroup} /></div>}
              <p className="text-sm text-muted">{p.additives === undefined ? data("additivesUnavailable") : additiveCount ? t("reportedAdditives", { count: additiveCount }) : t("noAdditives")}</p>
              {p.isHalal && <p className="text-sm text-muted">{tScore("gs3HalalReported")}</p>}
            </div>
          </GreeCard>
        </section>

        <div className="min-w-0 space-y-3">
          {canFindAlternative && requestedAlternative === barcode && <Alternatives key={barcode} product={lookup.product} prefs={prefs} />}
          {impact.status === "valid" && <ImpactBlock impact={impact} />}
        </div>
      </div>

      <section aria-labelledby="product-details" className="space-y-2">
        <h2 id="product-details" className="gc-heading mb-3">{t("productDetails")}</h2>
        {hasNutrition && (
          <CollapsibleSection title={t("completeNutrition")} icon={<BarChart3 className="h-5 w-5" />} badge={<DataKind kind={p.provenance ? "declared" : "fact"} />}>
            <p className="mb-2 text-xs text-muted">{per100}</p>
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
                  const evidence = additiveEvidenceFor(a);
                  return (
                    <li key={a} className="rounded-2xl border border-line bg-surface-2 p-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="gc-chip text-xs font-bold">{a.toUpperCase()}</span>
                        <span className="text-xs font-semibold text-muted">{tScore(evidence ? "gs3EvidenceAvailable" : "gs3EvidenceUnavailable")}</span>
                      </div>
                      {evidence && (
                        <a href={evidence.url} target="_blank" rel="noreferrer" className="mt-1 inline-block text-xs underline">
                          {data("scientificEvidence", { authority: evidence.authority, date: evidence.issuedAt })}
                        </a>
                      )}
                    </li>
                  );
                })}
              </ul>
            ) : <p className="text-sm text-muted">{p.additives === undefined ? data("additivesUnavailable") : t("noAdditives")}</p>}
          </CollapsibleSection>
        )}

        {/* ═══ 9 · Ingredients ═══ */}
        {ingredientsKnown && (
          <CollapsibleSection title={t("ingredients")} icon={<List className="h-5 w-5" />} badge={<DataKind kind={p.provenance ? "declared" : "fact"} />}>
            <p className="text-sm leading-relaxed text-ink/90">{p.ingredientsText}</p>
          </CollapsibleSection>
        )}

        {/* ═══ 10 · Certifications ═══ */}
        {(cert || otherLabels.length > 0) && (
          <CollapsibleSection title={t("certifications")} icon={<Award className="h-5 w-5" />} badge={<DataKind kind={p.provenance ? "declared" : "fact"} />}>
            {cert && (
              <div className="mb-2 flex items-center gap-2 rounded-2xl bg-pastel-sage p-3">
                <Leaf className="h-4 w-4 shrink-0 text-score-b-ink" aria-hidden />
                <span className="text-sm font-semibold text-score-b-ink capitalize">{tScore("gs3ReportedCertification", { label: cert })}</span>
              </div>
            )}
            <div className="flex flex-wrap gap-1.5">
              {(p.isBio || p.isHalal || p.isVegan || p.isVegetarian) && (
                <>
                  {cert && <LabelBadge kind="bio" />}
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
        {impact.status === "valid" && <CollapsibleSection title={t("environmentalDetails")} icon={<Leaf className="h-5 w-5" />} badge={<DataKind kind="estimate" />}>
          <ImpactDetails impact={impact} />
        </CollapsibleSection>}

        {/* ═══ 13 · Source and last data update ═══ */}
        <CollapsibleSection title={t("sourceMethodology")} icon={<BookOpenText className="h-5 w-5" />}>
          <div className="space-y-3 text-sm">
            <p className="text-muted">{t("sourceLabel")}: <strong className="text-ink">{p.source === "usda" ? "USDA FoodData Central" : t("sourceOpenFoodFacts")}</strong></p>
            {!p.provenance && <p className="text-xs text-muted">
              {lookup.stale && lookup.cachedAt ? t("lastUpdateCached", { date: new Date(lookup.cachedAt).toLocaleDateString() }) : t("lastUpdateLive")}
            </p>}
            <ProductSourceDetails product={p} state={lookup.dataState} />
            <div className="flex flex-wrap gap-2">
              <Link href="/methodology#sources" className="gc-pressable inline-flex h-9 items-center gap-1.5 rounded-2xl bg-surface-2 px-3 text-xs font-semibold">
                <BookOpenText className="h-3.5 w-3.5" aria-hidden /> {t("methodologyLink")}
              </Link>
              <a href={sourceUrl} target="_blank" rel="noreferrer" className="gc-pressable inline-flex h-9 items-center gap-1.5 rounded-2xl bg-surface-2 px-3 text-xs font-semibold">
                <ExternalLink className="h-3.5 w-3.5" aria-hidden /> {p.source === "usda" ? data("viewRecord") : t("viewOnOff")}
              </a>
            </div>
          </div>
          <div className="mt-3"><GreeCoachButton context={{ kind: "product", product: p, gree, impact, prefs }} className="w-full justify-center" /></div>
        </CollapsibleSection>

        {/* ═══ 14 · Report a data issue (through the source provider) ═══ */}
        {p.source === "openfoodfacts" && (
          <a href={productContributionUrl(barcode)} target="_blank" rel="noreferrer"
            className="gc-pressable flex items-center gap-2 rounded-2xl border border-line bg-surface px-4 py-3 text-sm text-muted shadow-soft">
            <FlagTriangleRight className="h-4 w-4 shrink-0 text-natural-strong" aria-hidden />
            <span className="flex-1">{t("reportIssue")}</span>
            <ExternalLink className="h-3.5 w-3.5 shrink-0" aria-hidden />
          </a>
        )}

        <CollapsibleSection title={t("evaluationDetails")} icon={<Info className="h-5 w-5" />}>
          <div className="flex flex-wrap items-center gap-2">
            <TrustHalo level={gree.confidence} size="sm" />
            <GreeButton variant="outline" size="sm" onClick={() => setSheet("method")}>{t("howComputed")}</GreeButton>
            {gree.missingData.length > 0 && <GreeButton variant="outline" size="sm" onClick={() => setSheet("confidence")}>{t("whatsMissing")}</GreeButton>}
            {gree.reasons.length > 0 && <GreeButton variant="outline" size="sm" onClick={() => setSheet("why")}>{t("seeAllReasons")}</GreeButton>}
          </div>
        </CollapsibleSection>
      </section>

      <CollapsibleSection title={t("otherActions")}>
        <div className="flex flex-wrap gap-2">
          <GreeButton variant="outline" onClick={productInBasket ? () => router.push("/cart") : addToBasket}>
            <ShoppingBasket className="h-4 w-4 shrink-0" aria-hidden /> {productInBasket ? t("goToBasket") : t("addToBasket")}
          </GreeButton>
          <GreeButton variant="outline" onClick={() => router.push("/scan")}><ScanLine className="h-4 w-4 shrink-0" aria-hidden />{t("scanAnother")}</GreeButton>
        </div>
        {basketNotice && <p role="status" className="mt-2 text-sm text-natural-strong">{t(basketNotice === "added" ? "addedToBasket" : "alreadyInBasket")}</p>}
      </CollapsibleSection>

      {/* ═══ Technical-explanation sheets ═══ */}
      <GreeBottomSheet open={sheet === "method"} onClose={() => setSheet(null)} title={t("methodTitle")} closeLabel={t("close")}>
        <div className="space-y-3 text-sm">
          <p className="text-muted">{tScore("gs3Method")}</p>
          <p>{gree.methodologyVersion} · {gree.methodologyUpdatedAt} · {gree.registryVersion}</p>
          {gree.status === "scored" && (
            <div className="space-y-1">
              <p>{tScore("gs3Path." + gree.components.nutrition.pointsSource)}</p>
              {gree.components.nutrition.points !== undefined && <p>{tScore("gs3Raw", { points: gree.components.nutrition.points })}</p>}
            </div>
          )}
          <a className="underline" href={gree.evidence.officialMethod.url} target="_blank" rel="noreferrer">{tScore("gs3OfficialMethod")}</a>
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
              {gree.missingData.map((code) => (
                <li key={code} className="flex items-center gap-2 text-xs text-muted">
                  <HelpCircle className="h-3 w-3 shrink-0" aria-hidden /> {tScore("gs3Missing." + code)}
                </li>
              ))}
            </ul>
          )}
          {p.source === "openfoodfacts" && (
            <a href={productContributionUrl(barcode)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-xs font-semibold text-natural-strong">
              <ExternalLink className="h-3.5 w-3.5" aria-hidden /> {t("contributeEdit")}
            </a>
          )}
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
    </article>
  );
}
