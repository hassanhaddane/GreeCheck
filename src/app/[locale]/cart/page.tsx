"use client";
import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import {
  ShoppingBasket, ScanLine, Search, Trash2, AlertTriangle, Leaf, BadgeCheck,
  ThumbsUp, Wand2, ShieldQuestion, Sparkles
} from "lucide-react";
import { useRouter } from "@/i18n/routing";
import { Card, CardContent } from "@/components/ui/card";
import { PremiumCard } from "@/components/ui/premium-card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ScoreRing } from "@/components/score/score-ring";
import { CartItemCard } from "@/components/cart/cart-item-card";
import { ReplacementSuggestions } from "@/components/cart/replacement-suggestions";
import { NUTRI_COLORS, NOVA_COLORS } from "@/lib/constants/badges";
import { computeCartScore } from "@/domains/cart/engine";
import { computeGreeScore } from "@/domains/scoring/gree-score";
import { getAlternatives } from "@/domains/swap/engine";
import { useCartStore } from "@/domains/cart/store";
import { useBattleStore } from "@/domains/battle/store";
import { usePreferencesStore } from "@/domains/criteria/store";
import { useMounted } from "@/hooks/use-mounted";
import type { Product } from "@/domains/product/model";

function DistBar({ segments }: { segments: { key: string; n: number; color: string }[] }) {
  const total = segments.reduce((s, x) => s + x.n, 0) || 1;
  return (
    <div className="space-y-1.5">
      <div className="flex h-2.5 overflow-hidden rounded-full bg-surface-2">
        {segments.map((s) => s.n > 0 && (
          <div key={s.key} style={{ width: `${(s.n / total) * 100}%`, backgroundColor: s.color }} />
        ))}
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-0.5">
        {segments.filter((s) => s.n > 0).map((s) => (
          <span key={s.key} className="flex items-center gap-1 text-[0.65rem] text-muted">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: s.color }} />
            {s.key.toUpperCase()} · {s.n}
          </span>
        ))}
      </div>
    </div>
  );
}

type OptimizeState = null | "running" | "none" | { replaced: number; score: number };

export default function CartPage() {
  const t = useTranslations("cart");
  const router = useRouter();
  const mounted = useMounted();
  const cart = useCartStore();
  const items = cart.items;
  const clear = cart.clear;
  const remove = cart.remove;
  const addBattle = useBattleStore((s) => s.add);
  const clearBattle = useBattleStore((s) => s.clear);
  const prefs = usePreferencesStore();

  const [optState, setOptState] = useState<OptimizeState>(null);

  // Full cart analysis — pure, local, preference-aware (domains/cart/engine).
  const result = useMemo(
    () => computeCartScore(items.map((i) => ({ product: i.product })), prefs),
    [items, prefs]
  );

  const products = useMemo(() => items.map((i) => i.product), [items]);

  const nutriSegments = (["a", "b", "c", "d", "e"] as const).map((g) => ({
    key: g, n: result.distributions.nutriScore[g], color: NUTRI_COLORS[g]
  }));
  const novaSegments = ([1, 2, 3, 4] as const).map((g) => ({
    key: String(g), n: result.distributions.nova[String(g) as "1" | "2" | "3" | "4"], color: NOVA_COLORS[g]
  }));

  const bioPct = Math.round(result.compatibility.bio.ratio * 100);
  const halalPct = Math.round(result.compatibility.halal.ratio * 100);

  /* Compare a cart product with its suggested alternative in Scan Battle. */
  const compareInBattle = (current: Product, alternative: Product) => {
    clearBattle();
    addBattle(current);
    addBattle(alternative);
    router.push("/battle");
  };

  /* Swap a cart product for the chosen alternative. */
  const replaceProduct = (barcode: string, alternative: Product) => {
    remove(barcode);
    cart.addProduct(alternative, computeGreeScore(alternative, prefs));
  };

  /**
   * "Optimiser mon panier" — pure local rules, no AI:
   * for each product dragging the score down, fetch same-category
   * alternatives (already ranked by personalized GreeScore + bio/halal
   * preference boosts) and swap when the gain is significant (≥ +8 pts).
   */
  const optimize = async () => {
    setOptState("running");
    let replaced = 0;
    let current = items.map((i) => i.product);
    for (const cand of result.recommendedReplacements) {
      try {
        const alts = await getAlternatives(cand.product, prefs);
        const alt = alts.find((a) => a.gree.global >= cand.gree.global + 8 && !current.some((p) => p.barcode === a.product.barcode));
        if (alt) {
          remove(cand.product.barcode);
          cart.addProduct(alt.product, alt.gree);
          current = current.map((p) => (p.barcode === cand.product.barcode ? alt.product : p));
          replaced++;
        }
      } catch {
        /* network hiccup — skip this candidate */
      }
    }
    if (!replaced) {
      setOptState("none");
    } else {
      const score = computeCartScore(current.map((p) => ({ product: p })), prefs).global;
      setOptState({ replaced, score });
    }
  };

  if (!mounted) return <div className="mx-auto max-w-2xl"><Card className="h-40 animate-pulse" /></div>;

  if (!items.length) {
    return (
      <div className="mx-auto max-w-2xl pt-6">
        <EmptyState
          icon={ShoppingBasket}
          title={t("empty")}
          description={t("emptyBody")}
          action={
            <div className="flex gap-2">
              <Button variant="neon" size="sm" onClick={() => router.push("/scan?source=cart")}><ScanLine className="h-4 w-4" /> {t("scanAnother")}</Button>
              <Button variant="soft" size="sm" onClick={() => router.push("/search")}><Search className="h-4 w-4" /> {t("searchProduct")}</Button>
            </div>
          }
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5 pb-6">
      {/* ── Score hero ── */}
      <PremiumCard variant="glass" className="relative overflow-hidden">
        <span aria-hidden className="pointer-events-none absolute -right-14 -top-14 h-40 w-40 rounded-full bg-neon/15 blur-3xl" />
        <CardContent className="space-y-3">
          <div className="flex items-center gap-5">
            <ScoreRing value={result.global} size={116} label={t(`gradeLabel.${result.labelKey}`)} tone="neon" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">{t("score")}</p>
              <p className="text-sm text-muted">{t("itemsCount", { n: result.metrics.productCount })}</p>
              <p className="mt-1 flex items-center gap-1 text-xs text-muted">
                <ShieldQuestion className="h-3.5 w-3.5 shrink-0" aria-hidden />
                {t("confidence.label")} : <strong>{t(`confidence.${result.confidenceLevel}`)}</strong>
              </p>
              <Button variant="ghost" size="sm" className="mt-1.5 text-score-e" onClick={clear}><Trash2 className="h-4 w-4" /> {t("clear")}</Button>
            </div>
          </div>
          {/* Verdict */}
          <p className="rounded-2xl bg-surface-2/80 p-3 text-sm leading-relaxed">
            <Sparkles className="me-1 inline h-4 w-4 text-natural" aria-hidden />
            {t(`verdict.${result.verdict.key}`, result.verdict.values)}
          </p>
        </CardContent>
      </PremiumCard>

      {/* ── What's good ── */}
      <PremiumCard variant="tinted" className="p-4">
        <h2 className="flex items-center gap-1.5 text-sm font-semibold text-natural">
          <ThumbsUp className="h-4 w-4" aria-hidden /> {t("whatIsGood")}
        </h2>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <span className="rounded-full bg-natural/15 px-3 py-1 text-xs font-semibold text-natural">
            {t(`strength.${result.mainStrength.key}`, result.mainStrength.values)}
          </span>
          {result.positiveInsights.map((m, i) => (
            <span key={i} className="rounded-full bg-surface px-3 py-1 text-xs font-medium text-ink">
              {t(`positive.${m.key}`, m.values)}
            </span>
          ))}
        </div>
      </PremiumCard>

      {/* ── Cumulative alerts / main risk ── */}
      {(result.warnings.length > 0 || result.mainRisk.key !== "none") && (
        <Card className="border-score-d/25 bg-score-d/5">
          <CardContent className="space-y-2">
            <h2 className="flex items-center gap-1.5 text-sm font-semibold text-score-d">
              <AlertTriangle className="h-4 w-4" aria-hidden /> {t("mainRisk")} : {t(`risk.${result.mainRisk.key}`, result.mainRisk.values)}
            </h2>
            {result.warnings.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {result.warnings.map((w, i) => (
                  <span key={i} className="rounded-full bg-surface px-3 py-1 text-xs font-medium text-ink">
                    {t(`warning.${w.key}`, w.values)}
                  </span>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Distribution ── */}
      <Card>
        <CardContent className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">{t("distribution")}</h2>
          <div>
            <p className="mb-1.5 text-xs font-medium">{t("nutriDist")}</p>
            <DistBar segments={nutriSegments} />
          </div>
          <div>
            <p className="mb-1.5 text-xs font-medium">{t("novaDist")}</p>
            <DistBar segments={novaSegments} />
          </div>
          <div className="grid grid-cols-2 gap-3 pt-1">
            <div className="flex items-center gap-2 rounded-2xl bg-surface-2 p-3">
              <Leaf className="h-5 w-5 text-natural" aria-hidden />
              <div><p className="text-lg font-bold tabular-nums">{bioPct}%</p><p className="text-[0.65rem] text-muted">{t("bioScore")}</p></div>
            </div>
            {(prefs.preferHalal || prefs.goals.includes("halal")) && (
              <div className="flex items-center gap-2 rounded-2xl bg-surface-2 p-3">
                <BadgeCheck className="h-5 w-5 text-emerald-600" aria-hidden />
                <div><p className="text-lg font-bold tabular-nums">{halalPct}%</p><p className="text-[0.65rem] text-muted">{t("halalScore")}</p></div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ── Actions: scan / search / optimize ── */}
      <div className="flex flex-wrap gap-2">
        <Button variant="primary" size="sm" onClick={() => router.push("/scan?source=cart")}><ScanLine className="h-4 w-4" /> {t("scanAnother")}</Button>
        <Button variant="soft" size="sm" onClick={() => router.push("/search")}><Search className="h-4 w-4" /> {t("searchProduct")}</Button>
        {result.recommendedReplacements.length > 0 && (
          <Button variant="neon" size="sm" className="ms-auto" onClick={optimize} disabled={optState === "running"}>
            <Wand2 className="h-4 w-4" /> {optState === "running" ? t("optimizing") : t("optimize")}
          </Button>
        )}
      </div>
      {optState !== null && optState !== "running" && (
        <Card className="flex items-center gap-3 border-natural/25 bg-natural/5 p-4">
          <Sparkles className="h-5 w-5 shrink-0 text-natural" aria-hidden />
          <p className="text-sm font-medium">
            {optState === "none" ? t("optimizeNone") : t("optimizeDone", { count: optState.replaced, score: optState.score })}
          </p>
        </Card>
      )}

      {/* ── Recommended swaps (rule-based, explained) ── */}
      <ReplacementSuggestions
        result={result}
        products={products}
        prefs={prefs}
        onCompare={compareInBattle}
        onReplace={replaceProduct}
      />

      {/* ── To improve ── */}
      {result.productsDraggingScore.length > 0 && (
        <section className="space-y-2">
          <div className="px-1">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-score-d">{t("toImprove")}</h2>
            <p className="text-xs text-muted">{t("toImproveHint")}</p>
          </div>
          {result.productsDraggingScore.map((a) => (
            <CartItemCard key={a.product.barcode} entry={{ product: a.product, gree: a.gree }} priority onRemove={() => remove(a.product.barcode)} />
          ))}
        </section>
      )}

      {/* ── Best choices ── */}
      {result.productsImprovingCart.length > 0 && (
        <section className="space-y-2">
          <h2 className="px-1 text-sm font-semibold uppercase tracking-wide text-natural">{t("bestChoices")}</h2>
          {result.productsImprovingCart.map((a) => (
            <CartItemCard key={a.product.barcode} entry={{ product: a.product, gree: a.gree }} onRemove={() => remove(a.product.barcode)} />
          ))}
        </section>
      )}

      {/* ── Others ── */}
      {(() => {
        const shown = new Set([
          ...result.productsDraggingScore.map((a) => a.product.barcode),
          ...result.productsImprovingCart.map((a) => a.product.barcode)
        ]);
        const others = result.analyses.filter((a) => !shown.has(a.product.barcode));
        return others.length > 0 ? (
          <section className="space-y-2">
            <h2 className="px-1 text-sm font-semibold uppercase tracking-wide text-muted">{t("others")}</h2>
            {others.map((a) => (
              <CartItemCard key={a.product.barcode} entry={{ product: a.product, gree: a.gree }} onRemove={() => remove(a.product.barcode)} />
            ))}
          </section>
        ) : null;
      })()}

    </div>
  );
}
