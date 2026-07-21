"use client";
import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import {
  Plus, GitCompareArrows, ScanLine, Search, Trash2, RotateCcw, ShoppingBasket,
  Trophy, ShieldQuestion, Sparkles, ScanSearch, Heart, Leaf, ListChecks, Check, AlertTriangle
} from "lucide-react";
import { useRouter } from "@/i18n/routing";
import { GreeCard, GreeCardContent } from "@/components/system/gree-card";
import { GreeButton } from "@/components/system/gree-button";
import { GreeBadge } from "@/components/system/gree-badge";
import { EmptyState } from "@/components/system/empty-state";
import { CollapsibleSection } from "@/components/ui/collapsible-section";
import { BattleCard } from "@/components/battle/battle-card";
import { ComparisonTable } from "@/components/battle/comparison-table";
import { AxisBars } from "@/components/battle/axis-bars";
import { Podium } from "@/components/battle/podium";
import { AddSheet } from "@/components/battle/add-sheet";
import { computeComparison, type CompareEntry } from "@greecheck/domain/compare/engine";
import { useCompareStore, COMPARE_MAX } from "@/domains/compare/store";
import { useCartStore } from "@/domains/cart/store";
import { useShoppingListStore } from "@/domains/list/store";
import { usePreferencesStore } from "@/domains/criteria/store";

export default function ComparePage() {
  const t = useTranslations("compare");
  const tb = useTranslations("battle");
  const tScore = useTranslations("score");
  const router = useRouter();
  const items = useCompareStore((s) => s.items);
  const remove = useCompareStore((s) => s.remove);
  const clear = useCompareStore((s) => s.clear);
  const basket = useCartStore();
  const list = useShoppingListStore();
  const prefs = usePreferencesStore();

  const [sheet, setSheet] = useState<null | "search" | "scan">(null);
  const [picked, setPicked] = useState<string | null>(null); // user's balanced choice
  const [notice, setNotice] = useState<string | null>(null);

  const result = useMemo(() => (items.length ? computeComparison(items, prefs) : null), [items, prefs]);
  const comparable = Boolean(result?.validation.comparable);
  const entries = result?.entries ?? [];
  const openSlots = Math.max(0, COMPARE_MAX - items.length);

  const health = result?.healthWinner ?? null;
  const env = result?.environmentWinner;

  // Balanced winner = the user's pick; defaults to the health winner.
  const chosenBarcode = picked ?? health?.product.barcode ?? null;
  const chosen = entries.find((e) => e.product.barcode === chosenBarcode) ?? null;

  const addChosenToCart = () => {
    if (!chosen) return;
    basket.addProduct(chosen.product, chosen.gree);
    router.push("/cart");
  };
  const addChosenToList = () => {
    if (!chosen) return;
    list.add({ name: chosen.product.name, barcode: chosen.product.barcode, imageUrl: chosen.product.imageUrl, grade: chosen.gree.grade });
    setNotice(t("addedToList", { name: chosen.product.name }));
  };
  const addEntryToBasket = (entry: CompareEntry) => { basket.addProduct(entry.product, entry.gree); router.push("/cart"); };

  return (
    <div className="mx-auto max-w-2xl space-y-5 pb-6">
      {/* Hero */}
      <div className="flex flex-col items-center gap-2 pt-2 text-center">
        <span className="grid h-11 w-11 place-items-center rounded-2xl bg-natural-grad text-white shadow-raised">
          <GitCompareArrows className="h-5 w-5" />
        </span>
        <h1 className="text-2xl font-extrabold tracking-tight gc-gradient-text">{t("title")}</h1>
        <p className="max-w-sm text-sm text-muted">{t("subtitle")}</p>
      </div>

      {items.length === 0 ? (
        <EmptyState
          icon={GitCompareArrows}
          title={t("emptyTitle")}
          description={t("emptyBody")}
          action={
            <div className="flex gap-2">
              <GreeButton variant="neon" size="sm" onClick={() => setSheet("scan")}><ScanLine className="h-4 w-4" /> {t("scanProduct")}</GreeButton>
              <GreeButton variant="soft" size="sm" onClick={() => setSheet("search")}><Search className="h-4 w-4" /> {t("searchProduct")}</GreeButton>
            </div>
          }
        />
      ) : (
        <>
          {/* Slots */}
          <div className="grid grid-cols-3 gap-3">
            {items.map((p) => {
              const entry = entries.find((e) => e.product.barcode === p.barcode)!;
              return (
                <motion.div key={p.barcode} layout initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.3 }}>
                  <BattleCard
                    entry={entry}
                    isWinner={comparable && items.length >= 2 && p.barcode === health?.product.barcode}
                    inBasket={basket.has(p.barcode)}
                    onRemove={() => remove(p.barcode)}
                    onAddBasket={() => addEntryToBasket(entry)}
                  />
                </motion.div>
              );
            })}
            {Array.from({ length: openSlots }).map((_, i) => (
              <button key={i} onClick={() => setSheet("search")}
                className="gc-pressable flex aspect-[3/4] flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-line text-muted hover:border-natural/40 hover:text-natural-strong">
                <span className="grid h-10 w-10 place-items-center rounded-full border-2 border-dashed border-current"><Plus className="h-5 w-5" /></span>
                <span className="px-1 text-center text-[0.65rem] font-medium leading-tight">{items.length === 1 && i === 0 ? t("addAnother") : t("slotEmpty")}</span>
              </button>
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            <GreeButton variant="primary" size="sm" onClick={() => setSheet("scan")}><ScanLine className="h-4 w-4" /> {t("scanProduct")}</GreeButton>
            <GreeButton variant="soft" size="sm" onClick={() => setSheet("search")}><ScanSearch className="h-4 w-4" /> {t("addFromAnywhere")}</GreeButton>
            <GreeButton variant="ghost" size="sm" className="ms-auto text-score-e-ink" onClick={clear}><Trash2 className="h-4 w-4" /> {t("clear")}</GreeButton>
          </div>

          {items.length === 1 && (
            <GreeCard className="flex items-center gap-3 border-natural/25 bg-natural/5 p-4">
              <Sparkles className="h-5 w-5 shrink-0 text-natural-strong" />
              <p className="text-sm font-medium">{t("addAnother")}</p>
            </GreeCard>
          )}

          {/* Not meaningfully comparable */}
          {items.length >= 2 && result && !comparable && (
            <>
              <GreeCard className="border-score-c/30 bg-score-c/5">
                <GreeCardContent className="space-y-2.5">
                  <p className="flex items-center gap-2 text-sm font-semibold text-score-c-ink">
                    <ShieldQuestion className="h-5 w-5 shrink-0" /> {t("incomparableTitle")}
                  </p>
                  <ul className="space-y-1.5">
                    {result.validation.issues.map((code) => (
                      <li key={code} className="flex items-start gap-2 text-sm text-muted">
                        <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-score-c" aria-hidden />
                        {t(`issue_${code}`)}
                      </li>
                    ))}
                  </ul>
                  <p className="text-xs text-muted">{t("incomparableBody")}</p>
                </GreeCardContent>
              </GreeCard>
              <CollapsibleSection title={t("referenceCompare")} icon={<GitCompareArrows className="h-5 w-5" />}>
                <ComparisonTable entries={entries} />
              </CollapsibleSection>
            </>
          )}

          {/* Comparable → decision hierarchy */}
          {items.length >= 2 && health && comparable && (
            <>
              {/* Low-confidence winner warning (never crowned silently) */}
              {result!.healthWinnerLowConfidence && (
                <GreeCard className="flex items-center gap-3 border-score-c/30 bg-score-c/5 p-4" role="alert">
                  <AlertTriangle className="h-5 w-5 shrink-0 text-score-c-ink" />
                  <p className="text-sm font-medium">{t("lowConfidenceWinner")}</p>
                </GreeCard>
              )}

              {/* HEALTH winner */}
              <WinnerCard
                kind="health"
                name={health.product.name}
                grade={tScore(`grade.${health.gree.grade}`)}
                score={health.gree.global}
                close={result!.closeness === "close"}
                reasons={result!.healthReasons.map((k) => tb(`reason.${k}`))}
              />

              {/* ENVIRONMENT winner — surfaced distinctly, especially when different */}
              {env && result!.winnersDiffer && (
                <WinnerCard
                  kind="environment"
                  name={env.product.name}
                  grade={env.impact.grade!.toUpperCase()}
                  reasons={result!.environmentReasons.map((k) => t(`envReason.${k}`))}
                />
              )}
              {env && !result!.winnersDiffer && (
                <p className="flex items-center gap-1.5 rounded-2xl bg-pastel-sky/60 px-3 py-2.5 text-xs font-medium text-sky-ink">
                  <Leaf className="h-3.5 w-3.5 shrink-0" aria-hidden /> {t("sameWinnerBoth")}
                </p>
              )}
              {!env && (
                <p className="flex items-center gap-1.5 rounded-2xl bg-pastel-stone px-3 py-2.5 text-xs text-muted">
                  <Leaf className="h-3.5 w-3.5 shrink-0" aria-hidden /> {t("noEnvComparison")}
                </p>
              )}

              {/* Balanced winner — the USER decides (health & env are never blended) */}
              <GreeCard>
                <GreeCardContent className="space-y-3">
                  <div>
                    <h2 className="text-sm font-semibold">{t("yourChoice")}</h2>
                    <p className="text-xs text-muted">{t("yourChoiceHint")}</p>
                  </div>
                  <div className="grid gap-2" role="radiogroup" aria-label={t("yourChoice")}>
                    {entries.map((e) => {
                      const active = e.product.barcode === chosenBarcode;
                      const isHealth = e.product.barcode === health.product.barcode;
                      const isEnv = env && e.product.barcode === env.product.barcode;
                      return (
                        <button
                          key={e.product.barcode}
                          role="radio"
                          aria-checked={active}
                          onClick={() => setPicked(e.product.barcode)}
                          className={`gc-pressable flex items-center gap-3 rounded-2xl border p-3 text-start ${active ? "border-natural-strong bg-natural/5" : "border-line bg-surface"}`}
                        >
                          <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 ${active ? "border-natural-strong bg-natural-strong text-white" : "border-line"}`} aria-hidden>
                            {active && <Check className="h-3.5 w-3.5" />}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-semibold">{e.product.name}</span>
                            <span className="mt-0.5 flex flex-wrap items-center gap-1.5">
                              {isHealth && <GreeBadge size="sm" tone="positive">{t("healthPick")}</GreeBadge>}
                              {isEnv && <GreeBadge size="sm" tone="neutral"><Leaf className="h-3 w-3" /> {t("envPick")}</GreeBadge>}
                            </span>
                          </span>
                          <span className="shrink-0 text-sm font-bold tabular-nums">{e.gree.global}</span>
                        </button>
                      );
                    })}
                  </div>
                  <div className="flex flex-wrap gap-2 pt-1">
                    <GreeButton variant="primary" size="sm" onClick={addChosenToCart}>
                      <ShoppingBasket className="h-4 w-4" /> {t("addToCart")}
                    </GreeButton>
                    <GreeButton variant="soft" size="sm" onClick={addChosenToList}>
                      <ListChecks className="h-4 w-4" /> {t("addToList")}
                    </GreeButton>
                  </div>
                  {notice && <p className="rounded-xl bg-natural/10 px-3 py-2 text-xs font-semibold text-natural-strong">{notice}</p>}
                </GreeCardContent>
              </GreeCard>

              {/* Premium visual comparison (not a spreadsheet on mobile) */}
              <GreeCard>
                <GreeCardContent>
                  <h2 className="mb-4 text-center text-sm font-semibold uppercase tracking-wide text-muted">{t("podium")}</h2>
                  <Podium ranking={entries} />
                </GreeCardContent>
              </GreeCard>
              <GreeCard>
                <GreeCardContent>
                  <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">{t("keyMetrics")}</h2>
                  <AxisBars entries={entries} />
                </GreeCardContent>
              </GreeCard>
              <CollapsibleSection title={t("completeCompare")} icon={<GitCompareArrows className="h-5 w-5" />}>
                <ComparisonTable entries={entries} />
              </CollapsibleSection>

              <GreeButton variant="outline" className="w-full" onClick={clear}><RotateCcw className="h-4 w-4" /> {t("restart")}</GreeButton>
            </>
          )}
        </>
      )}

      {sheet && <AddSheet initialMode={sheet} onClose={() => setSheet(null)} />}
    </div>
  );
}

/* Health / environment winner card — visually distinct, measurable reasons. */
function WinnerCard({
  kind, name, grade, score, close, reasons
}: { kind: "health" | "environment"; name: string; grade: string; score?: number; close?: boolean; reasons: string[] }) {
  const t = useTranslations("compare");
  const isHealth = kind === "health";
  return (
    <GreeCard className={isHealth ? "" : "bg-pastel-sky/60"}>
      <GreeCardContent className="space-y-2">
        <div className="flex items-center gap-2 text-sm font-semibold">
          {isHealth ? <Trophy className="h-4 w-4 text-natural-strong" /> : <Leaf className="h-4 w-4 text-sky-ink" />}
          <span className={isHealth ? "text-natural-strong" : "text-sky-ink"}>
            {close && isHealth ? t("healthWinnerClose") : isHealth ? t("healthWinner") : t("environmentWinner")}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <p className="text-base font-bold leading-tight">{name}</p>
          <GreeBadge size="sm" tone={isHealth ? "positive" : "neutral"}>
            {isHealth ? `${grade} · ${score}` : grade}
          </GreeBadge>
        </div>
        {reasons.length > 0 && (
          <ul className="flex flex-wrap gap-1.5">
            {reasons.map((r, i) => (
              <li key={i}><GreeBadge size="sm" tone={isHealth ? "brand" : "neutral"}>{r}</GreeBadge></li>
            ))}
          </ul>
        )}
      </GreeCardContent>
    </GreeCard>
  );
}
