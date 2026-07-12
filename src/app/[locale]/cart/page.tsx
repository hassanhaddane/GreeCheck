"use client";
import { GreeCard, GreeCardContent } from "@/components/system/gree-card";
import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import {
  ShoppingBasket, ScanLine, Search, Trash2, AlertTriangle, Leaf, BadgeCheck,
  ThumbsUp, Wand2, Sparkles, ArrowRight, Check, X, ShieldCheck, CircleHelp
} from "lucide-react";
import { useRouter } from "@/i18n/routing";
import { GreeButton } from "@/components/system/gree-button";
import { EmptyState } from "@/components/system/empty-state";
import { GreeScoreRing } from "@/components/system/gree-score-ring";
import { TrustHalo } from "@/components/system/trust-halo";
import { CartItemCard } from "@/components/cart/cart-item-card";
import { ReplacementSuggestions } from "@/components/cart/replacement-suggestions";
import { NUTRI_COLORS, NOVA_COLORS } from "@/lib/constants/badges";
import { computeCartScore } from "@/domains/cart/engine";
import { buildImprovementPlan, groupBasket, categoryCoverage, type ImprovementPlan, type PlanStep, type ReplacementCandidate } from "@/domains/cart/what-if";
import { computeGreeScore } from "@/domains/scoring/gree-score";
import { getAlternatives } from "@/domains/swap/engine";
import { useCartStore } from "@/domains/cart/store";
import { useBattleStore } from "@/domains/battle/store";
import { usePreferencesStore } from "@/domains/criteria/store";
import { useMounted } from "@/hooks/use-mounted";
import type { Product } from "@/domains/product/model";
import type { CartProductAnalysis } from "@/domains/cart/engine";

const CONFIDENCE_TO_HALO = { high: "high", medium: "medium", low: "low" } as const;

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
  const prefs = usePreferencesStore();

  const [plan, setPlan] = useState<ImprovementPlan | null>(null);
  const [planState, setPlanState] = useState<PlanState>("idle");

  const result = useMemo(() => computeCartScore(items.map((i) => ({ product: i.product })), prefs), [items, prefs]);
  const products = useMemo(() => items.map((i) => i.product), [items]);
  const groups = useMemo(() => groupBasket(result.analyses), [result]);
  const coverage = useMemo(() => categoryCoverage(result.analyses), [result]);

  const keepCount = groups.strong.length + groups.acceptable.length;
  const reconsiderCount = groups.priority.length;
  const topAction = groups.priority[0]?.product.name;

  const nutriSegments = (["a", "b", "c", "d", "e"] as const).map((g) => ({ key: g, n: result.distributions.nutriScore[g], color: NUTRI_COLORS[g] }));
  const novaSegments = ([1, 2, 3, 4] as const).map((g) => ({ key: String(g), n: result.distributions.nova[String(g) as "1" | "2" | "3" | "4"], color: NOVA_COLORS[g] }));
  const bioPct = Math.round(result.compatibility.bio.ratio * 100);
  const halalPct = Math.round(result.compatibility.halal.ratio * 100);

  const compareInBattle = (current: Product, alternative: Product) => {
    clearBattle(); addBattle(current); addBattle(alternative); router.push("/battle");
  };
  const replaceProduct = (barcode: string, alternative: Product) => {
    remove(barcode); cart.addProduct(alternative, computeGreeScore(alternative, prefs));
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
    remove(step.targetBarcode);
    cart.addProduct(step.replacement, step.replacementGree);
    setPlan((prev) => (prev ? { ...prev, steps: prev.steps.filter((s) => s.targetBarcode !== step.targetBarcode) } : prev));
  };
  const applyAll = () => {
    plan?.steps.forEach((step) => { remove(step.targetBarcode); cart.addProduct(step.replacement, step.replacementGree); });
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
      <GreeCard variant="tinted" className="p-4">
        <h2 className="flex items-center gap-1.5 text-sm font-semibold text-natural-strong"><ThumbsUp className="h-4 w-4" aria-hidden /> {t("whatIsGood")}</h2>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <span className="rounded-full bg-natural/15 px-3 py-1 text-xs font-semibold text-natural-strong">{t(`strength.${result.mainStrength.key}`, result.mainStrength.values)}</span>
          {result.positiveInsights.map((m, i) => <span key={i} className="rounded-full bg-surface px-3 py-1 text-xs font-medium text-ink">{t(`positive.${m.key}`, m.values)}</span>)}
        </div>
      </GreeCard>

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
          {coverage.length > 1 && <p className="text-xs text-muted">{t("coverage", { n: coverage.length })}</p>}
        </GreeCardContent>
      </GreeCard>

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
