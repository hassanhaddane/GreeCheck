"use client";
import { GreeCard, GreeCardContent } from "@/components/system/gree-card";
import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import {
  ShoppingBasket, ScanLine, Search, Trash2, AlertTriangle, Leaf, BadgeCheck,
  ThumbsUp, Wand2, Sparkles, ArrowRight, Check, X, ShieldCheck, CircleHelp, ListChecks, FlaskConical
} from "lucide-react";
import { useRouter } from "@/i18n/routing";
import { GreeButton } from "@/components/system/gree-button";
import { EmptyState } from "@/components/system/empty-state";
import { GreeScoreRing } from "@/components/system/gree-score-ring";
import { TrustHalo } from "@/components/system/trust-halo";
import { CartItemCard } from "@/components/cart/cart-item-card";
import { ReplacementSuggestions } from "@/components/cart/replacement-suggestions";
import { NUTRI_COLORS, NOVA_COLORS } from "@/lib/constants/badges";
import { computeCartScore } from "@greecheck/domain/cart/engine";
import { analyzeCartExtras } from "@greecheck/domain/cart/analysis";
import { buildImprovementPlan, groupBasket, categoryCoverage, type ImprovementPlan, type PlanStep, type ReplacementCandidate } from "@greecheck/domain/cart/what-if";
import { computeGreeScore } from "@greecheck/domain/scoring/gree-score";
import { getAlternatives } from "@/domains/swap/service";
import { useCartStore } from "@/domains/cart/store";
import { useBattleStore } from "@/domains/battle/store";
import { useShoppingListStore } from "@/domains/list/store";
import { logReplacement } from "@/domains/weekly/store";
import { usePreferencesStore } from "@/domains/criteria/store";
import { useMounted } from "@/hooks/use-mounted";
import type { Product } from "@greecheck/domain/product/model";
import type { CartProductAnalysis } from "@greecheck/domain/cart/engine";

const CONFIDENCE_TO_HALO = { high: "high", medium: "medium", low: "low" } as const;
const ENV_COLORS: Record<string, string> = { a: "#1E6B7A", b: "#3E8FA0", c: "#7DB0BC", d: "#B7CDD3", e: "#D9C7C0", unknown: "#ECEDEA" };

function DistBar({ segments }: { segments: { key: string; n: number; color: string }[] }) {
  const total = segments.reduce((s, x) => s + x.n, 0) || 1;
  return (
    <div className="space-y-1.5">
      <div className="flex h-2.5 overflow-hidden rounded-full bg-surface-2">
        {segments.map((s) => s.n > 0 && <div key={s.key} style={{ width: `${(s.n / total) * 100}%`, backgroundColor: s.color }} />)}
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-0.5">
        {segments.filter((s) => s.n > 0).map((s) => (
          <span key={s.key} className="flex items-center gap-1 text-[0.65rem] text-muted">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: s.color }} /> {s.key.toUpperCase()} · {s.n}
          </span>
        ))}
      </div>
    </div>
  );
}

type PlanState = "idle" | "building" | "done" | "none";

export default function CartPage() {
  const t = useTranslations("cart");
  const router = useRouter();
  const mounted = useMounted();
  const cart = useCartStore();
  const items = cart.items;
  const remove = cart.remove;
  const addBattle = useBattleStore((s) => s.add);
  const clearBattle = useBattleStore((s) => s.clear);
  const list = useShoppingListStore();
  const prefs = usePreferencesStore();

  const [plan, setPlan] = useState<ImprovementPlan | null>(null);
  const [planState, setPlanState] = useState<PlanState>("idle");
  const [listNotice, setListNotice] = useState<string | null>(null);

  const result = useMemo(() => computeCartScore(items.map((i) => ({ product: i.product })), prefs), [items, prefs]);
  const extras = useMemo(() => analyzeCartExtras(result.analyses, prefs), [result, prefs]);
  const products = useMemo(() => items.map((i) => i.product), [items]);
  const groups = useMemo(() => groupBasket(result.analyses), [result]);
  const coverage = useMemo(() => categoryCoverage(result.analyses), [result]);
  const scoreByBarcode = useMemo(() => new Map(result.analyses.map((a) => [a.product.barcode, a.gree.global])), [result]);

  const keepCount = groups.strong.length + groups.acceptable.length;
  const reconsiderCount = groups.priority.length;
  const topAction = groups.priority[0]?.product.name;

  const nutriSegments = (["a", "b", "c", "d", "e"] as const).map((g) => ({ key: g, n: result.distributions.nutriScore[g], color: NUTRI_COLORS[g] }));
  const novaSegments = ([1, 2, 3, 4] as const).map((g) => ({ key: String(g), n: result.distributions.nova[String(g) as "1" | "2" | "3" | "4"], color: NOVA_COLORS[g] }));
  const bioPct = Math.round(result.compatibility.bio.ratio * 100);
  const halalPct = Math.round(result.compatibility.halal.ratio * 100);

  const compareInBattle = (current: Product, alternative: Product) => {
    clearBattle(); addBattle(current); addBattle(alternative); router.push("/compare");
  };
  const replaceProduct = (barcode: string, alternative: Product) => {
    const altGree = computeGreeScore(alternative, prefs);
    logReplacement(scoreByBarcode.get(barcode) ?? 0, altGree.global);
    remove(barcode); cart.addProduct(alternative, altGree);
  };

  /** Move the kept (strong + acceptable) products into the shopping list. */
  const addKeepToList = () => {
    const keep = [...groups.strong, ...groups.acceptable];
    if (!keep.length) return;
    list.addMany(keep.map((a) => ({
      name: a.product.name, barcode: a.product.barcode, imageUrl: a.product.imageUrl, grade: a.gree.grade, source: "cart" as const
    })));
    setListNotice(t("addedKeepToList", { n: keep.length }));
  };

  /** Move the improvement-plan replacements into the shopping list. */
  const addPlanToList = () => {
    if (!plan?.steps.length) return;
    list.addMany(plan.steps.map((s) => ({
      name: s.replacement.name, barcode: s.replacement.barcode, imageUrl: s.replacement.imageUrl, grade: s.replacementGree.grade, source: "cart" as const
    })));
    setListNotice(t("addedPlanToList", { n: plan.steps.length }));
  };

  /** What-if: fetch trustworthy GreeSwap candidates for the priority products,
   *  then build a DETERMINISTIC, prioritized improvement plan (pure engine). */
  const buildPlan = async () => {
    setPlanState("building");
    const inputs = items.map((i) => ({ product: i.product }));
    const candidates: ReplacementCandidate[] = [];
    for (const a of result.recommendedReplacements) {
      try {
        const alts = await getAlternatives(a.product, prefs);
        const best = alts[0];
        if (best) candidates.push({ targetBarcode: a.product.barcode, replacement: best.product, replacementGree: best.gree });
      } catch { /* skip on network hiccup */ }
    }
    const built = buildImprovementPlan(inputs, prefs, candidates, { maxSteps: 3 });
    setPlan(built);
    setPlanState(built.steps.length ? "done" : "none");
  };

  const applyStep = (step: PlanStep) => {
    logReplacement(scoreByBarcode.get(step.targetBarcode) ?? step.before, step.replacementGree.global);
    remove(step.targetBarcode);
    cart.addProduct(step.replacement, step.replacementGree);
    setPlan((prev) => (prev ? { ...prev, steps: prev.steps.filter((s) => s.targetBarcode !== step.targetBarcode) } : prev));
  };
  const applyAll = () => {
    plan?.steps.forEach((step) => {
      logReplacement(scoreByBarcode.get(step.targetBarcode) ?? step.before, step.replacementGree.global);
      remove(step.targetBarcode); cart.addProduct(step.replacement, step.replacementGree);
    });
    setPlan(null); setPlanState("idle");
  };
  const dismissPlan = () => { setPlan(null); setPlanState("idle"); };

  if (!mounted) return <div className="mx-auto max-w-2xl"><GreeCard className="h-40 animate-pulse" /></div>;

  if (!items.length) {
    return (
      <div className="mx-auto max-w-2xl pt-6">
        <EmptyState
          icon={ShoppingBasket}
          title={t("empty")}
          description={t("emptyBody")}
          action={
            <div className="flex gap-2">
              <GreeButton variant="neon" size="sm" onClick={() => router.push("/scan?source=cart")}><ScanLine className="h-4 w-4" /> {t("scanAnother")}</GreeButton>
              <GreeButton variant="soft" size="sm" onClick={() => router.push("/search")}><Search className="h-4 w-4" /> {t("searchProduct")}</GreeButton>
            </div>
          }
        />
      </div>
    );
  }

  const groupSections: { key: "strong" | "acceptable" | "priority" | "insufficient"; list: CartProductAnalysis[]; tone: string; icon: typeof ShieldCheck }[] = [
    { key: "priority", list: groups.priority, tone: "text-score-d-ink", icon: AlertTriangle },
    { key: "strong", list: groups.strong, tone: "text-natural-strong", icon: ShieldCheck },
    { key: "acceptable", list: groups.acceptable, tone: "text-muted", icon: ThumbsUp },
    { key: "insufficient", list: groups.insufficient, tone: "text-verdict-unknown", icon: CircleHelp }
  ];

  return (
    <div className="mx-auto max-w-2xl space-y-5 pb-6">
      {/* ── Score hero ── */}
      <GreeCard variant="glass" className="relative overflow-hidden">
        <span aria-hidden className="pointer-events-none absolute -right-14 -top-14 h-40 w-40 rounded-full bg-neon/15 blur-3xl" />
        <GreeCardContent className="space-y-3">
          <div className="flex items-center gap-5">
            <GreeScoreRing value={result.global} size={116} label={t(`gradeLabel.${result.labelKey}`)} tone="brand" />
            <div className="min-w-0 flex-1 space-y-1">
              <p className="text-sm font-semibold">{t("score")}</p>
              <p className="text-sm text-muted">{t("itemsCount", { n: result.metrics.productCount })}</p>
              <div className="pt-0.5"><TrustHalo level={CONFIDENCE_TO_HALO[result.confidenceLevel]} size="sm" /></div>
              <p className="flex flex-wrap gap-x-3 text-xs text-muted">
                <span className="text-natural-strong">{t("keepCount", { n: keepCount })}</span>
                <span className="text-score-d-ink">{t("reconsiderCount", { n: reconsiderCount })}</span>
              </p>
            </div>
            <GreeButton variant="ghost" size="icon" aria-label={t("clear")} className="self-start text-score-e-ink" onClick={cart.clear}><Trash2 className="h-4 w-4" /></GreeButton>
          </div>
          <p className="rounded-2xl bg-surface-2/80 p-3 text-sm leading-relaxed">
            <Sparkles className="me-1 inline h-4 w-4 text-natural-strong" aria-hidden />
            {t(`verdict.${result.verdict.key}`, result.verdict.values)}
          </p>
          {topAction && (
            <p className="flex items-center gap-1.5 text-xs font-semibold text-score-d-ink">
              <ArrowRight className="h-3.5 w-3.5 shrink-0 rtl:rotate-180" aria-hidden /> {t("topAction", { name: topAction })}
            </p>
          )}
        </GreeCardContent>
      </GreeCard>

      {/* ── What's good ── */}
      {(result.mainStrength.key !== "none" || result.positiveInsights.length > 0) && <GreeCard variant="tinted" className="p-4">
        <h2 className="flex items-center gap-1.5 text-sm font-semibold text-natural-strong"><ThumbsUp className="h-4 w-4" aria-hidden /> {t("whatIsGood")}</h2>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {result.mainStrength.key !== "none" && <span className="rounded-full bg-natural/15 px-3 py-1 text-xs font-semibold text-natural-strong">{t(`strength.${result.mainStrength.key}`, result.mainStrength.values)}</span>}
          {result.positiveInsights.map((m, i) => <span key={i} className="rounded-full bg-surface px-3 py-1 text-xs font-medium text-ink">{t(`positive.${m.key}`, m.values)}</span>)}
        </div>
      </GreeCard>}

      {/* ── Main risk ── */}
      {(result.warnings.length > 0 || result.mainRisk.key !== "none") && (
        <GreeCard className="border-score-d/25 bg-score-d/5">
          <GreeCardContent className="space-y-2">
            <h2 className="flex items-center gap-1.5 text-sm font-semibold text-score-d-ink"><AlertTriangle className="h-4 w-4" aria-hidden /> {t("mainRisk")} : {t(`risk.${result.mainRisk.key}`, result.mainRisk.values)}</h2>
            {result.warnings.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {result.warnings.map((w, i) => <span key={i} className="rounded-full bg-surface px-3 py-1 text-xs font-medium text-ink">{t(`warning.${w.key}`, w.values)}</span>)}
              </div>
            )}
          </GreeCardContent>
        </GreeCard>
      )}

      {/* ── What-if improvement plan ── */}
      <GreeCard>
        <GreeCardContent className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="flex items-center gap-1.5 text-sm font-semibold"><Wand2 className="h-4 w-4 text-natural-strong" aria-hidden /> {t("planTitle")}</h2>
            {result.recommendedReplacements.length > 0 && planState !== "done" && (
              <GreeButton variant="neon" size="sm" onClick={buildPlan} disabled={planState === "building"}>
                {planState === "building" ? t("planBuilding") : t("planBuild")}
              </GreeButton>
            )}
          </div>
          <p className="text-xs text-muted">{t("planHint")}</p>

          {planState === "none" && <p className="rounded-2xl bg-surface-2 p-3 text-sm text-muted">{t("planNone")}</p>}

          {plan && plan.steps.length > 0 && (
            <div className="space-y-2.5">
              <div className="flex items-center gap-2 rounded-2xl bg-natural/10 p-3 text-sm font-semibold text-natural-strong">
                <span className="tabular-nums">{plan.baseScore}</span>
                <ArrowRight className="h-4 w-4 rtl:rotate-180" aria-hidden />
                <span className="tabular-nums">{plan.finalScore}</span>
                <span className="ms-auto rounded-full bg-natural/20 px-2 py-0.5 text-xs">+{plan.totalGain}</span>
              </div>
              <ol className="space-y-2">
                {plan.steps.map((step, i) => (
                  <li key={step.targetBarcode} className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-3">
                    <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-deep text-xs font-bold text-white">{i + 1}</span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{step.targetName} <ArrowRight className="inline h-3 w-3 rtl:rotate-180" aria-hidden /> {step.replacement.name}</p>
                      <p className="text-xs text-muted tabular-nums">{step.before} → {step.after} · <span className="font-semibold text-natural-strong">+{step.gain}</span></p>
                    </div>
                    <GreeButton size="icon" variant="neon" aria-label={t("planApply")} onClick={() => applyStep(step)}><Check className="h-4 w-4" /></GreeButton>
                  </li>
                ))}
              </ol>
              <div className="flex gap-2">
                <GreeButton variant="soft" size="sm" className="flex-1" onClick={dismissPlan}><X className="h-4 w-4" /> {t("planDismiss")}</GreeButton>
                <GreeButton variant="neon" size="sm" className="flex-1" onClick={applyAll}><Check className="h-4 w-4" /> {t("planApplyAll")}</GreeButton>
              </div>
              <GreeButton variant="ghost" size="sm" className="w-full" onClick={addPlanToList}>
                <ListChecks className="h-4 w-4" /> {t("addPlanToList", { n: plan.steps.length })}
              </GreeButton>
            </div>
          )}
        </GreeCardContent>
      </GreeCard>

      {/* ── Per-product swap suggestions (preview · compare · replace) ── */}
      <ReplacementSuggestions result={result} products={products} prefs={prefs} onCompare={compareInBattle} onReplace={replaceProduct} />

      {/* ── Distribution & coverage ── */}
      <GreeCard>
        <GreeCardContent className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">{t("distribution")}</h2>
          <div><p className="mb-1.5 text-xs font-medium">{t("nutriDist")}</p><DistBar segments={nutriSegments} /></div>
          <div><p className="mb-1.5 text-xs font-medium">{t("novaDist")}</p><DistBar segments={novaSegments} /></div>
          <div className="grid grid-cols-2 gap-3 pt-1">
            <div className="flex items-center gap-2 rounded-2xl bg-surface-2 p-3">
              <Leaf className="h-5 w-5 text-natural-strong" aria-hidden />
              <div><p className="text-lg font-bold tabular-nums">{bioPct}%</p><p className="text-[0.65rem] text-muted">{t("bioScore")}</p></div>
            </div>
            {(prefs.preferHalal || prefs.goals.includes("halal")) && (
              <div className="flex items-center gap-2 rounded-2xl bg-surface-2 p-3">
                <BadgeCheck className="h-5 w-5 text-emerald-600" aria-hidden />
                <div><p className="text-lg font-bold tabular-nums">{halalPct}%</p><p className="text-[0.65rem] text-muted">{t("halalScore")}</p></div>
              </div>
            )}
          </div>
          {/* Environmental distribution — separate from health, unknowns visible */}
          <div>
            <p className="mb-1.5 text-xs font-medium">{t("envDist")}</p>
            <DistBar segments={(["a", "b", "c", "d", "e", "unknown"] as const).map((g) => ({ key: g, n: extras.environmentDistribution[g], color: ENV_COLORS[g] }))} />
            {extras.environmentKnown === 0 && <p className="mt-1 text-[0.65rem] text-muted">{t("envDistNone")}</p>}
          </div>
          {coverage.length > 1 && <p className="text-xs text-muted">{t("coverage", { n: coverage.length })}</p>}
        </GreeCardContent>
      </GreeCard>

      {/* ── Critical allergen alerts (compatibility, never a health verdict) ── */}
      {extras.allergenAlerts.length > 0 && (
        <GreeCard className="border-score-e/30 bg-score-e/5">
          <GreeCardContent className="space-y-2">
            <h2 className="flex items-center gap-1.5 text-sm font-semibold text-score-e-ink"><AlertTriangle className="h-4 w-4" aria-hidden /> {t("allergenAlertsTitle")}</h2>
            <ul className="space-y-1.5">
              {extras.allergenAlerts.map((a) => (
                <li key={a.product.barcode} className="flex items-center justify-between gap-2 text-sm">
                  <span className="min-w-0 flex-1 truncate font-medium">{a.product.name}</span>
                  <span className="shrink-0 text-xs font-semibold capitalize text-score-e-ink">{a.allergens.join(", ")}</span>
                </li>
              ))}
            </ul>
          </GreeCardContent>
        </GreeCard>
      )}

      {/* ── Main contributors: sugar + additives + ultra-processed ── */}
      {(extras.sugarContributors.length > 0 || extras.additiveContributors.length > 0 || extras.ultraProcessedCount > 0) && (
        <GreeCard>
          <GreeCardContent className="space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">{t("contributors")}</h2>

            {extras.ultraProcessedCount > 0 && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-pastel-sand px-3 py-1 text-xs font-semibold text-score-c-ink">
                <FlaskConical className="h-3.5 w-3.5" aria-hidden /> {t("ultraProcessed", { n: extras.ultraProcessedCount })}
              </span>
            )}

            {extras.sugarContributors.length > 0 && (
              <div>
                <p className="mb-1.5 text-xs font-medium">{t("sugarContributors")}</p>
                <ul className="space-y-1">
                  {extras.sugarContributors.map((c) => (
                    <li key={c.product.barcode} className="flex items-center justify-between gap-2 text-sm">
                      <span className="min-w-0 flex-1 truncate">{c.product.name}</span>
                      <span className="shrink-0 text-xs font-semibold tabular-nums text-score-c-ink">{c.sugars !== undefined ? `${c.sugars} g` : t("unknownValue")}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-1 text-[0.6rem] text-muted">{t("per100")}</p>
              </div>
            )}

            {extras.additiveContributors.length > 0 && (
              <div>
                <p className="mb-1.5 text-xs font-medium">{t("additiveContributors")}</p>
                <ul className="space-y-1">
                  {extras.additiveContributors.map((c) => (
                    <li key={c.product.barcode} className="flex items-center justify-between gap-2 text-sm">
                      <span className="min-w-0 flex-1 truncate">{c.product.name}</span>
                      <span className="shrink-0 text-xs font-semibold tabular-nums text-muted">
                        {c.riskyCount > 0 && <span className="text-score-d-ink">{t("riskyN", { n: c.riskyCount })} · </span>}{t("totalN", { n: c.totalCount })}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </GreeCardContent>
        </GreeCard>
      )}

      {/* ── Move to shopping list ── */}
      <GreeCard variant="tinted">
        <GreeCardContent className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="flex items-center gap-1.5 text-sm font-semibold"><ListChecks className="h-4 w-4 text-natural-strong" aria-hidden /> {t("toListTitle")}</h2>
            <p className="text-xs text-muted">{t("toListHint")}</p>
          </div>
          <div className="flex shrink-0 gap-2">
            <GreeButton variant="soft" size="sm" onClick={addKeepToList} disabled={groups.strong.length + groups.acceptable.length === 0}>
              {t("addKeepToList", { n: groups.strong.length + groups.acceptable.length })}
            </GreeButton>
            <GreeButton variant="ghost" size="sm" onClick={() => router.push("/list")}>{t("openList")}</GreeButton>
          </div>
        </GreeCardContent>
      </GreeCard>
      {listNotice && (
        <p className="flex items-center gap-1.5 rounded-2xl bg-natural/10 px-3 py-2 text-xs font-semibold text-natural-strong">
          <Check className="h-3.5 w-3.5" aria-hidden /> {listNotice}
        </p>
      )}

      {/* ── Actions ── */}
      <div className="flex flex-wrap gap-2">
        <GreeButton variant="primary" size="sm" onClick={() => router.push("/scan?source=cart")}><ScanLine className="h-4 w-4" /> {t("scanAnother")}</GreeButton>
        <GreeButton variant="soft" size="sm" onClick={() => router.push("/search")}><Search className="h-4 w-4" /> {t("searchProduct")}</GreeButton>
      </div>

      {/* ── Product groups ── */}
      {groupSections.filter((s) => s.list.length > 0).map((section) => {
        const Icon = section.icon;
        return (
          <section key={section.key} className="space-y-2">
            <div className="px-1">
              <h2 className={`flex items-center gap-1.5 text-sm font-semibold uppercase tracking-wide ${section.tone}`}>
                <Icon className="h-4 w-4" aria-hidden /> {t(`group_${section.key}`)} <span className="tabular-nums">({section.list.length})</span>
              </h2>
              <p className="text-xs text-muted">{t(`group_${section.key}_hint`)}</p>
            </div>
            {section.list.map((a) => (
              <CartItemCard key={a.product.barcode} entry={{ product: a.product, gree: a.gree }} priority={section.key === "priority"} onRemove={() => remove(a.product.barcode)} />
            ))}
          </section>
        );
      })}
    </div>
  );
}
