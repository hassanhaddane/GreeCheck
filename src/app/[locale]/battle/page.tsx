"use client";
import { GreeCard, GreeCardContent } from "@/components/system/gree-card";
import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { Plus, Swords, ScanLine, Search, Trash2, RotateCcw, ShoppingBasket, Trophy, ShieldQuestion, Sparkles, Repeat, Target, ScanSearch, Dna } from "lucide-react";
import { useRouter } from "@/i18n/routing";
import { GreeButton } from "@/components/system/gree-button";
import { EmptyState } from "@/components/system/empty-state";
import { CollapsibleSection } from "@/components/ui/collapsible-section";
import { BattleCard } from "@/components/battle/battle-card";
import { ComparisonTable } from "@/components/battle/comparison-table";
import { AxisBars } from "@/components/battle/axis-bars";
import { Podium } from "@/components/battle/podium";
import { AddSheet } from "@/components/battle/add-sheet";
import { GreeDNA } from "@/components/product/gree-dna";
import { computeBattle } from "@greecheck/domain/battle/engine";
import { useBattleStore, BATTLE_MAX } from "@/domains/battle/store";
import { useCartStore } from "@/domains/cart/store";
import { usePreferencesStore } from "@/domains/criteria/store";

export default function BattlePage() {
  const t = useTranslations("battle");
  const router = useRouter();
  const items = useBattleStore((s) => s.items);
  const remove = useBattleStore((s) => s.remove);
  const clear = useBattleStore((s) => s.clear);
  const basket = useCartStore();
  const prefs = usePreferencesStore();

  const [sheet, setSheet] = useState<null | "search" | "scan">(null);
  const [replaceNotice, setReplaceNotice] = useState<string | null>(null);

  const result = useMemo(() => (items.length ? computeBattle(items, prefs) : null), [items, prefs]);
  const winnerBarcode = result?.winner?.product.barcode;
  const comparable = Boolean(result?.validation.comparable);

  const openSlots = Math.max(0, BATTLE_MAX - items.length);
  const ranking = result?.ranking ?? [];

  const verdict = (() => {
    if (!result?.winner || !result.runnerUp) return null;
    const name = result.winner.product.name;
    const reasons = result.reasons.map((k) => t(`reason.${k}`)).join(", ");
    const lead = result.closeness === "close" ? `${t("andCloseTradeoff")} ` : "";
    return `${lead}${t("verdictChoose", { name })} — ${t("verdictBecause")} ${reasons}.`;
  })();

  const addWinnerToBasket = () => {
    if (!result?.winner) return;
    basket.addProduct(result.winner.product, result.winner.gree);
    router.push("/cart");
  };

  /** Swap the weakest (lower-scored) basket product for the battle winner. */
  const replaceInBasket = () => {
    if (!result?.winner) return;
    const w = result.winner;
    const worst = basket.items
      .filter((i) => i.product.barcode !== w.product.barcode && i.score < w.gree.global)
      .sort((a, b) => a.score - b.score)[0];
    if (!worst) { setReplaceNotice(t("noWorseInBasket")); return; }
    basket.remove(worst.product.barcode);
    basket.addProduct(w.product, w.gree);
    setReplaceNotice(t("replacedInBasket", { name: worst.product.name }));
  };

  const addEntryToBasket = (entry: NonNullable<typeof result>["ranking"][number]) => {
    basket.addProduct(entry.product, entry.gree);
    router.push("/cart");
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6 pb-6">
      {/* Hero */}
      <div className="flex flex-col items-center gap-2 pt-2 text-center">
        <span className="grid h-11 w-11 place-items-center rounded-2xl bg-natural-grad text-white shadow-raised">
          <Swords className="h-5 w-5" />
        </span>
        <h1 className="text-2xl font-extrabold tracking-tight gc-gradient-text">{t("title")}</h1>
        <p className="max-w-sm text-sm text-muted">{t("subtitle")}</p>
      </div>

      {items.length === 0 ? (
        <EmptyState
          icon={Swords}
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
          {/* Slots (products enter) */}
          <div className="grid grid-cols-3 gap-3">
            {items.map((p) => {
              const entry = ranking.find((e) => e.product.barcode === p.barcode)!;
              return (
                <motion.div key={p.barcode} layout initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.3 }}>
                  <BattleCard
                    entry={entry}
                    isWinner={comparable && items.length >= 2 && p.barcode === winnerBarcode}
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

          {/* Quick actions — all four input methods reachable via the sheet (incl. library) */}
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

          {/* ── Not meaningfully comparable → explain, never a misleading podium ── */}
          {items.length >= 2 && result && !comparable && (
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
          )}

          {/* Reference comparison even when not comparable (clearly labelled) */}
          {items.length >= 2 && result && !comparable && (
            <CollapsibleSection title={t("referenceCompare")} icon={<Swords className="h-5 w-5" />}>
              <ComparisonTable entries={ranking} />
            </CollapsibleSection>
          )}

          {/* ── Comparable → full decision hierarchy ── */}
          {items.length >= 2 && result?.winner && comparable && (
            <>
              {result.confidence === "partial" && (
                <GreeCard className="flex items-center gap-3 border-score-c/30 bg-score-c/5 p-4">
                  <ShieldQuestion className="h-5 w-5 shrink-0 text-score-c-ink" />
                  <p className="text-sm font-medium">{t("partial")} — {t("missingData")}.</p>
                </GreeCard>
              )}

              {/* Concise decision */}
              <GreeCard variant="deep" glow className="gc-shine">
                <GreeCardContent className="space-y-3">
                  <div className="flex items-center gap-2 text-sm font-semibold text-neon">
                    {result.closeness === "close" ? <Sparkles className="h-4 w-4" /> : <Trophy className="h-4 w-4" />}
                    {result.closeness === "close" ? t("veryClose") : t("verdictTitle")}
                  </div>
                  <p className="text-base font-bold leading-tight">{result.winner.product.name}</p>
                  <p className="text-sm leading-relaxed text-white/85">{verdict}</p>
                  {prefs.goals.length > 0 && (
                    <div className="space-y-1.5 rounded-2xl bg-white/10 p-3">
                      <p className="flex items-center gap-1.5 text-xs font-semibold text-white/85"><Target className="h-3.5 w-3.5 text-neon" /> {t("goalFit")}</p>
                      {ranking.map((e) => (
                        <div key={e.product.barcode} className="flex items-center gap-2">
                          <span className="w-28 shrink-0 truncate text-[0.7rem] text-white/75">{e.product.name}</span>
                          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/15"><div className="h-full rounded-full bg-natural" style={{ width: `${e.gree.subScores.goalFit}%` }} /></div>
                          <span className="w-7 shrink-0 text-end text-[0.7rem] font-bold tabular-nums text-neon">{e.gree.subScores.goalFit}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="flex flex-wrap gap-2 pt-1">
                    <GreeButton variant="neon" size="sm" onClick={addWinnerToBasket}><ShoppingBasket className="h-4 w-4" /> {t("addWinnerBasket")}</GreeButton>
                    {basket.items.length > 0 && (
                      <GreeButton variant="soft" size="sm" className="bg-white/10 text-white hover:bg-white/20" onClick={replaceInBasket}><Repeat className="h-4 w-4" /> {t("replaceInBasket")}</GreeButton>
                    )}
                  </div>
                  {replaceNotice && <p className="rounded-xl bg-white/10 px-3 py-2 text-xs font-medium text-neon">{replaceNotice}</p>}
                </GreeCardContent>
              </GreeCard>

              {/* Serious podium (winner rises) */}
              <GreeCard>
                <GreeCardContent>
                  <h2 className="mb-4 text-center text-sm font-semibold uppercase tracking-wide text-muted">{t("podium")}</h2>
                  <Podium ranking={ranking} />
                </GreeCardContent>
              </GreeCard>

              {/* Key metric comparison */}
              <GreeCard>
                <GreeCardContent>
                  <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">{t("keyMetrics")}</h2>
                  <AxisBars entries={ranking} />
                </GreeCardContent>
              </GreeCard>

              {/* Expandable complete comparison */}
              <CollapsibleSection title={t("completeCompare")} icon={<Swords className="h-5 w-5" />}>
                <ComparisonTable entries={ranking} />
              </CollapsibleSection>

              {/* GreeDNA comparison (winner vs runner-up) */}
              {result.runnerUp && (
                <CollapsibleSection title={t("dnaCompare")} icon={<Dna className="h-5 w-5" />}>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <GreeDNA product={result.winner.product} gree={result.winner.gree} />
                    <GreeDNA product={result.runnerUp.product} gree={result.runnerUp.gree} />
                  </div>
                </CollapsibleSection>
              )}

              <GreeButton variant="outline" className="w-full" onClick={clear}><RotateCcw className="h-4 w-4" /> {t("restart")}</GreeButton>
            </>
          )}
        </>
      )}

      {sheet && <AddSheet initialMode={sheet} onClose={() => setSheet(null)} />}
    </div>
  );
}
