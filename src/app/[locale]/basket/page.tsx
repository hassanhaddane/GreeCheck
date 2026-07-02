"use client";
import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { ShoppingBasket, ScanLine, Search, Trash2, AlertTriangle, Leaf, BadgeCheck } from "lucide-react";
import { Link, useRouter } from "@/i18n/routing";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ScoreRing } from "@/components/score/score-ring";
import { BasketItemCard } from "@/components/basket/basket-item-card";
import { Alternatives } from "@/components/product/alternatives";
import { NUTRI_COLORS, NOVA_COLORS } from "@/lib/constants/badges";
import { computeGreeScore } from "@/lib/scoring/gree-score";
import { useBasketStore } from "@/stores/basket-store";
import { usePreferencesStore } from "@/stores/preferences-store";
import { useMounted } from "@/lib/utils/use-mounted";
import type { BattleEntry } from "@/lib/scoring/battle";

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

export default function BasketPage() {
  const t = useTranslations("basket");
  const router = useRouter();
  const mounted = useMounted();
  const items = useBasketStore((s) => s.items);
  const remove = useBasketStore((s) => s.remove);
  const clear = useBasketStore((s) => s.clear);
  const prefs = usePreferencesStore();

  const entries: BattleEntry[] = useMemo(
    () => items.map((it) => ({ product: it.product, gree: computeGreeScore(it.product, prefs) })),
    [items, prefs]
  );

  const stats = useMemo(() => {
    if (!entries.length) return null;
    const total = entries.length;
    const avg = Math.round(entries.reduce((a, e) => a + e.gree.global, 0) / total);
    const nutri = ["a", "b", "c", "d", "e"].map((g) => ({ key: g, n: entries.filter((e) => e.product.nutriScore === g).length, color: NUTRI_COLORS[g] }));
    const nova = [1, 2, 3, 4].map((g) => ({ key: String(g), n: entries.filter((e) => e.product.novaGroup === g).length, color: NOVA_COLORS[g] }));
    const bioPct = Math.round((entries.filter((e) => e.product.isBio).length / total) * 100);
    const halalPct = Math.round((entries.filter((e) => e.product.isHalal).length / total) * 100);
    const alerts = [
      { key: "tooSugary", n: entries.filter((e) => (e.product.nutriments.sugars ?? 0) > 22.5).length },
      { key: "tooSalty", n: entries.filter((e) => (e.product.nutriments.salt ?? 0) > 1.5).length },
      { key: "ultraProcessed", n: entries.filter((e) => e.product.novaGroup === 4).length },
      { key: "riskyAdditives", n: entries.filter((e) => e.gree.additivesScore < 70).length },
      { key: "allergenAlert", n: prefs.avoidAllergens.length ? entries.filter((e) => e.product.allergens?.some((a) => prefs.avoidAllergens.some((u) => a.toLowerCase().includes(u.toLowerCase())))).length : 0 }
    ].filter((a) => a.n > 0);
    return { total, avg, nutri, nova, bioPct, halalPct, alerts };
  }, [entries, prefs.avoidAllergens]);

  const sorted = useMemo(() => [...entries].sort((a, b) => a.gree.global - b.gree.global), [entries]);
  const toImprove = sorted.filter((e) => e.gree.global < 50);
  const best = [...entries].filter((e) => e.gree.global >= 65).sort((a, b) => b.gree.global - a.gree.global);
  const others = entries.filter((e) => e.gree.global >= 50 && e.gree.global < 65);

  const level = (v: number) => (v >= 75 ? t("level.good") : v >= 50 ? t("level.ok") : t("level.bad"));

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
              <Button variant="neon" size="sm" onClick={() => router.push("/scan")}><ScanLine className="h-4 w-4" /> {t("scanAnother")}</Button>
              <Button variant="soft" size="sm" onClick={() => router.push("/search")}><Search className="h-4 w-4" /> {t("searchProduct")}</Button>
            </div>
          }
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5 pb-6">
      {/* Score header */}
      <Card>
        <CardContent className="flex items-center gap-5">
          <ScoreRing value={stats!.avg} size={116} label={level(stats!.avg)} tone="neon" />
          <div className="flex-1">
            <p className="text-sm font-semibold">{t("score")}</p>
            <p className="text-sm text-muted">{t("itemsCount", { n: stats!.total })}</p>
            <Button variant="ghost" size="sm" className="mt-2 text-score-e" onClick={clear}><Trash2 className="h-4 w-4" /> {t("clear")}</Button>
          </div>
        </CardContent>
      </Card>

      {/* Distribution */}
      <Card>
        <CardContent className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">{t("distribution")}</h2>
          <div>
            <p className="mb-1.5 text-xs font-medium">{t("nutriDist")}</p>
            <DistBar segments={stats!.nutri} />
          </div>
          <div>
            <p className="mb-1.5 text-xs font-medium">{t("novaDist")}</p>
            <DistBar segments={stats!.nova} />
          </div>
          <div className="grid grid-cols-2 gap-3 pt-1">
            <div className="flex items-center gap-2 rounded-2xl bg-surface-2 p-3">
              <Leaf className="h-5 w-5 text-natural" />
              <div><p className="text-lg font-bold tabular-nums">{stats!.bioPct}%</p><p className="text-[0.65rem] text-muted">{t("bioScore")}</p></div>
            </div>
            {prefs.preferHalal && (
              <div className="flex items-center gap-2 rounded-2xl bg-surface-2 p-3">
                <BadgeCheck className="h-5 w-5 text-emerald-600" />
                <div><p className="text-lg font-bold tabular-nums">{stats!.halalPct}%</p><p className="text-[0.65rem] text-muted">{t("halalScore")}</p></div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Cumulative alerts */}
      {stats!.alerts.length > 0 && (
        <Card className="border-score-d/25 bg-score-d/5">
          <CardContent className="space-y-2">
            <h2 className="flex items-center gap-1.5 text-sm font-semibold text-score-d"><AlertTriangle className="h-4 w-4" /> {t("alerts")}</h2>
            <div className="flex flex-wrap gap-2">
              {stats!.alerts.map((a) => (
                <span key={a.key} className="rounded-full bg-surface px-3 py-1 text-xs font-medium text-ink">{t(a.key, { n: a.n })}</span>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick actions */}
      <div className="flex flex-wrap gap-2">
        <Button variant="primary" size="sm" onClick={() => router.push("/scan")}><ScanLine className="h-4 w-4" /> {t("scanAnother")}</Button>
        <Button variant="soft" size="sm" onClick={() => router.push("/search")}><Search className="h-4 w-4" /> {t("searchProduct")}</Button>
      </div>

      {/* À améliorer */}
      {toImprove.length > 0 && (
        <section className="space-y-2">
          <div className="px-1">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-score-d">{t("toImprove")}</h2>
            <p className="text-xs text-muted">{t("toImproveHint")}</p>
          </div>
          {toImprove.map((e) => <BasketItemCard key={e.product.barcode} entry={e} priority onRemove={() => remove(e.product.barcode)} />)}
          <Alternatives product={toImprove[0].product} prefs={prefs} />
        </section>
      )}

      {/* Meilleurs choix */}
      {best.length > 0 && (
        <section className="space-y-2">
          <h2 className="px-1 text-sm font-semibold uppercase tracking-wide text-natural">{t("bestChoices")}</h2>
          {best.map((e) => <BasketItemCard key={e.product.barcode} entry={e} onRemove={() => remove(e.product.barcode)} />)}
        </section>
      )}

      {/* Autres */}
      {others.length > 0 && (
        <section className="space-y-2">
          <h2 className="px-1 text-sm font-semibold uppercase tracking-wide text-muted">{t("others")}</h2>
          {others.map((e) => <BasketItemCard key={e.product.barcode} entry={e} onRemove={() => remove(e.product.barcode)} />)}
        </section>
      )}
    </div>
  );
}
