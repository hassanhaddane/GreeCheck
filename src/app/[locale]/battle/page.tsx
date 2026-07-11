"use client";
import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { Plus, Swords, ScanLine, Search, Trash2, RotateCcw, ShoppingBasket, Trophy, ShieldQuestion, Sparkles, Repeat, Target } from "lucide-react";
import { useRouter } from "@/i18n/routing";
import { Card, CardContent } from "@/components/ui/card";
import { PremiumCard } from "@/components/ui/premium-card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { BattleCard } from "@/components/battle/battle-card";
import { ComparisonTable } from "@/components/battle/comparison-table";
import { AxisBars } from "@/components/battle/axis-bars";
import { Podium } from "@/components/battle/podium";
import { AddSheet } from "@/components/battle/add-sheet";
import { computeBattle } from "@/domains/battle/engine";
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
    const w = result.winner;
    basket.addProduct(w.product, w.gree);
    router.push("/cart");
  };

  /** Swap the weakest (lower-scored) basket product for the battle winner. */
  const replaceInBasket = () => {
    if (!result?.winner) return;
    const w = result.winner;
    const candidates = basket.items
      .filter((i) => i.product.barcode !== w.product.barcode && i.score < w.gree.global)
      .sort((a, b) => a.score - b.score);
    const worst = candidates[0];
    if (!worst) {
      setReplaceNotice(t("noWorseInBasket"));
      return;
    }
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
        <span className="grid h-11 w-11 place-items-center rounded-2xl bg-neon-grad text-deep shadow-glow">
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
              <Button variant="neon" size="sm" onClick={() => setSheet("scan")}><ScanLine className="h-4 w-4" /> {t("scanProduct")}</Button>
              <Button variant="soft" size="sm" onClick={() => setSheet("search")}><Search className="h-4 w-4" /> {t("searchProduct")}</Button>
            </div>
          }
        />
      ) : (
        <>
          {/* Slots */}
          <div className="grid grid-cols-3 gap-3">
            {items.map((p) => {
              const entry = ranking.find((e) => e.product.barcode === p.barcode)!;
              return (
                <motion.div key={p.barcode} layout initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
                  <BattleCard
                    entry={entry}
                    isWinner={items.length >= 2 && p.barcode === winnerBarcode}
                    inBasket={basket.has(p.barcode)}
                    onRemove={() => remove(p.barcode)}
                    onAddBasket={() => addEntryToBasket(entry)}
                  />
                </motion.div>
              );
            })}
            {Array.from({ length: openSlots }).map((_, i) => (
              <button
                key={i}
                onClick={() => setSheet("search")}
                className="gc-pressable flex aspect-[3/4] flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-line text-muted hover:border-natural/40 hover:text-natural"
              >
                <span className="grid h-10 w-10 place-items-center rounded-full border-2 border-dashed border-current">
                  <Plus className="h-5 w-5" />
                </span>
                <span className="px-1 text-center text-[0.65rem] font-medium leading-tight">
                  {items.length === 1 && i === 0 ? t("addAnother") : t("slotEmpty")}
                </span>
              </button>
            ))}
          </div>

          {/* Quick actions */}
          <div className="flex flex-wrap gap-2">
            <Button variant="primary" size="sm" onClick={() => setSheet("scan")}><ScanLine className="h-4 w-4" /> {t("scanProduct")}</Button>
            <Button variant="soft" size="sm" onClick={() => setSheet("search")}><Search className="h-4 w-4" /> {t("searchProduct")}</Button>
            <Button variant="ghost" size="sm" className="ms-auto text-score-e" onClick={clear}><Trash2 className="h-4 w-4" /> {t("clear")}</Button>
          </div>

          {/* Needs a second product */}
          {items.length === 1 && (
            <Card className="flex items-center gap-3 border-natural/25 bg-natural/5 p-4">
              <Sparkles className="h-5 w-5 shrink-0 text-natural" />
              <p className="text-sm font-medium">{t("addAnother")}</p>
            </Card>
          )}

          {/* Verdict + comparison (2+ products) */}
          {items.length >= 2 && result?.winner && (
            <>
              {/* Partial-data notice */}
              {result.confidence === "partial" && (
                <Card className="flex items-center gap-3 border-score-c/30 bg-score-c/5 p-4">
                  <ShieldQuestion className="h-5 w-5 shrink-0 text-score-c" />
                  <p className="text-sm font-medium">{t("partial")} — {t("missingData")}.</p>
                </Card>
              )}

              {/* Podium */}
              <Card>
                <CardContent>
                  <h2 className="mb-4 text-center text-sm font-semibold uppercase tracking-wide text-muted">{t("podium")}</h2>
                  <Podium ranking={ranking} />
                </CardContent>
              </Card>

              {/* Verdict */}
              <PremiumCard variant="deep" glow className="gc-shine">
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2 text-sm font-semibold text-neon">
                    {result.closeness === "close" ? <Sparkles className="h-4 w-4" /> : <Trophy className="h-4 w-4" />}
                    {result.closeness === "close" ? t("veryClose") : t("verdictTitle")}
                  </div>
                  <p className="text-base font-bold leading-tight">{result.winner.product.name}</p>
                  <p className="text-sm leading-relaxed text-white/85">{verdict}</p>
                  {prefs.goals.length > 0 && (
                    <div className="space-y-1.5 rounded-2xl bg-white/10 p-3">
                      <p className="flex items-center gap-1.5 text-xs font-semibold text-white/85">
                        <Target className="h-3.5 w-3.5 text-neon" /> {t("goalFit")}
                      </p>
                      {ranking.map((e) => (
                        <div key={e.product.barcode} className="flex items-center gap-2">
                          <span className="w-28 shrink-0 truncate text-[0.7rem] text-white/75">{e.product.name}</span>
                          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/15">
                            <div className="h-full rounded-full bg-neon-grad" style={{ width: `${e.gree.goalScore}%` }} />
                          </div>
                          <span className="w-7 shrink-0 text-end text-[0.7rem] font-bold tabular-nums text-neon">{e.gree.goalScore}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="flex flex-wrap gap-2 pt-1">
                    <Button variant="neon" size="sm" onClick={addWinnerToBasket}>
                      <ShoppingBasket className="h-4 w-4" /> {t("addWinnerBasket")}
                    </Button>
                    {basket.items.length > 0 && (
                      <Button variant="soft" size="sm" className="bg-white/10 text-white hover:bg-white/20" onClick={replaceInBasket}>
                        <Repeat className="h-4 w-4" /> {t("replaceInBasket")}
                      </Button>
                    )}
                  </div>
                  {replaceNotice && (
                    <p className="rounded-xl bg-white/10 px-3 py-2 text-xs font-medium text-neon">{replaceNotice}</p>
                  )}
                </CardContent>
              </PremiumCard>

              {/* Comparison table */}
              <Card>
                <CardContent>
                  <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">{t("compareTitle")}</h2>
                  <ComparisonTable entries={ranking} />
                </CardContent>
              </Card>

              {/* Radar comparison (bars) */}
              <Card>
                <CardContent>
                  <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">{t("radarTitle")}</h2>
                  <AxisBars entries={ranking} />
                </CardContent>
              </Card>

              <Button variant="outline" className="w-full" onClick={clear}>
                <RotateCcw className="h-4 w-4" /> {t("restart")}
              </Button>
            </>
          )}
        </>
      )}

      {sheet && <AddSheet initialMode={sheet} onClose={() => setSheet(null)} />}
    </div>
  );
}
