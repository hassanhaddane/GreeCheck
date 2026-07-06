"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ListChecks, Plus, Search as SearchIcon, Trash2, X, Check, Sparkles, ShoppingCart, Copy, Target } from "lucide-react";
import { PageHeading } from "@/components/app/page-heading";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { EmptyState } from "@/components/ui/empty-state";
import { ScoreRing } from "@/components/score/score-ring";
import { NutriScoreBadge } from "@/components/badges/nutri-score-badge";
import { ProductRowSkeleton } from "@/components/ui/skeleton";
import { Alternatives } from "@/components/product/alternatives";
import { useShoppingListStore } from "@/stores/shopping-list-store";
import { usePreferencesStore } from "@/stores/preferences-store";
import { computeGreeScore } from "@/lib/scoring/gree-score";
import { searchProductsClient } from "@/lib/api/client";
import { classifyAisle, AISLE_ORDER, AISLE_EMOJI, type Aisle } from "@/lib/shopping/aisles";
import { assessGoalCompliance } from "@/lib/nutrition/goal-compliance";
import { GOALS, GOAL_LABELS } from "@/lib/constants/goals";
import { useMounted } from "@/hooks/use-mounted";
import type { Product } from "@/types/product";

type FilterKey = "bio" | "halal" | "lowSugar" | "protein";
const FILTERS: FilterKey[] = ["bio", "halal", "lowSugar", "protein"];
const matchFilter: Record<FilterKey, (p: Product) => boolean> = {
  bio: (p) => !!p.isBio,
  halal: (p) => !!p.isHalal,
  lowSugar: (p) => (p.nutriments.sugars ?? 99) <= 5,
  protein: (p) => (p.nutriments.proteins ?? 0) >= 10
};

export default function ListPage() {
  const t = useTranslations("list");
  const locale = useLocale() as "fr" | "en" | "ar";
  const mounted = useMounted();
  const [copied, setCopied] = useState(false);
  const prefs = usePreferencesStore();
  const store = useShoppingListStore();
  const { lists, createList, removeList, setActive, addProduct, removeItem, toggleChecked, clearList } = store;

  const [newName, setNewName] = useState("");
  const [active, setActiveF] = useState<Set<FilterKey>>(new Set());
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Product[]>([]);
  const [searching, setSearching] = useState(false);
  const debounce = useRef<ReturnType<typeof setTimeout>>(undefined);

  const activeList = lists.find((l) => l.id === store.activeId) ?? lists[0] ?? null;

  // inline product search
  useEffect(() => {
    clearTimeout(debounce.current);
    const query = q.trim();
    // State updates run inside timers, never synchronously in the effect body.
    if (query.length < 2) {
      debounce.current = setTimeout(() => setResults([]), 0);
      return () => clearTimeout(debounce.current);
    }
    debounce.current = setTimeout(async () => {
      setSearching(true);
      try { const d = await searchProductsClient(query); setResults(d.products); }
      catch { setResults([]); }
      setSearching(false);
    }, 400);
    return () => clearTimeout(debounce.current);
  }, [q]);

  // Score every item with current preferences (reactive, on-device).
  const entries = useMemo(
    () => (activeList?.items ?? []).map((it) => ({ item: it, gree: computeGreeScore(it.product, prefs) })),
    [activeList, prefs]
  );

  const estScore = entries.length ? Math.round(entries.reduce((a, e) => a + e.gree.global, 0) / entries.length) : 0;
  const goalCompliance = useMemo(
    () => (entries.length ? assessGoalCompliance(prefs.goals, entries.map((e) => ({ product: e.item.product, gree: e.gree }))) : []),
    [entries, prefs.goals]
  );
  const level = estScore >= 75 ? "good" : estScore >= 50 ? "ok" : "bad";
  const checkedCount = entries.filter((e) => e.item.checked).length;

  const visible = useMemo(
    () => entries.filter((e) => [...active].every((f) => matchFilter[f](e.item.product))),
    [entries, active]
  );

  // Group visible items by aisle.
  const grouped = useMemo(() => {
    const map = new Map<Aisle, typeof visible>();
    for (const e of visible) {
      const a = classifyAisle(e.item.product);
      if (!map.has(a)) map.set(a, []);
      map.get(a)!.push(e);
    }
    return AISLE_ORDER.filter((a) => map.has(a)).map((a) => ({ aisle: a, items: map.get(a)! }));
  }, [visible]);

  const worst = [...entries].filter((e) => e.gree.global < 50).sort((a, b) => a.gree.global - b.gree.global);

  const toggleF = (f: FilterKey) => setActiveF((s) => { const n = new Set(s); n.has(f) ? n.delete(f) : n.add(f); return n; });

  /** Export the active list as plain text, grouped by aisle (local only). */
  const copyAsText = async () => {
    if (!activeList) return;
    const byAisle = new Map<Aisle, typeof entries>();
    for (const e of entries) {
      const a = classifyAisle(e.item.product);
      if (!byAisle.has(a)) byAisle.set(a, []);
      byAisle.get(a)!.push(e);
    }
    const lines: string[] = [`${activeList.name} — GreeCheck (${estScore}/100)`, ""];
    for (const a of AISLE_ORDER) {
      const group = byAisle.get(a);
      if (!group?.length) continue;
      lines.push(`${AISLE_EMOJI[a]} ${t(`aisle.${a}`)}`);
      for (const e of group) {
        lines.push(`${e.item.checked ? "[x]" : "[ ]"} ${e.item.product.name}${e.item.product.brand ? ` — ${e.item.product.brand}` : ""} (${e.gree.global}/100)`);
      }
      lines.push("");
    }
    try {
      await navigator.clipboard.writeText(lines.join("\n").trim());
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      /* clipboard unavailable */
    }
  };

  if (!mounted) return <div className="mx-auto max-w-2xl"><Card className="h-40 animate-pulse" /></div>;

  return (
    <div className="mx-auto max-w-2xl space-y-5 pb-6">
      <PageHeading title={t("title")} subtitle={t("subtitle")} />

      {/* List tabs + create */}
      <div className="flex flex-wrap items-center gap-2">
        {lists.map((l) => (
          <Chip key={l.id} active={l.id === activeList?.id} onClick={() => setActive(l.id)}>
            <ListChecks className="h-3.5 w-3.5" /> {l.name} <span className="text-muted">· {l.items.length}</span>
          </Chip>
        ))}
      </div>
      <div className="flex gap-2">
        <input value={newName} onChange={(e) => setNewName(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && newName.trim()) { createList(newName); setNewName(""); } }}
          placeholder={t("listName")} className="h-10 flex-1 rounded-2xl border border-line bg-surface px-4 text-sm outline-none focus:ring-2 focus:ring-neon/50" />
        <Button variant="soft" size="sm" disabled={!newName.trim()} onClick={() => { createList(newName); setNewName(""); }}>
          <Plus className="h-4 w-4" /> {t("create")}
        </Button>
      </div>

      {!activeList ? (
        <EmptyState icon={ListChecks} title={t("noList")} />
      ) : (
        <>
          {/* Score header */}
          <Card>
            <CardContent className="flex items-center gap-5">
              <ScoreRing value={estScore} size={104} label={t(`level.${level}`)} tone="neon" />
              <div className="flex-1">
                <p className="text-sm font-semibold">{activeList.name}</p>
                <p className="text-xs text-muted">{t("items", { n: entries.length })} · {t("checked", { n: checkedCount })}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Button variant="soft" size="sm" onClick={copyAsText} disabled={entries.length === 0}>
                    {copied ? <Check className="h-4 w-4 text-natural" /> : <Copy className="h-4 w-4" />} {copied ? t("copied") : t("copyList")}
                  </Button>
                  <Button variant="ghost" size="sm" className="text-muted" onClick={() => clearList(activeList.id)}><Trash2 className="h-4 w-4" /> {t("clear")}</Button>
                  <Button variant="ghost" size="sm" className="text-score-e" onClick={() => removeList(activeList.id)}><X className="h-4 w-4" /> {t("deleteList")}</Button>
                </div>
              </div>
            </CardContent>
            {/* Goals respected by this list (rule-based, local) */}
            {goalCompliance.length > 0 && entries.length > 0 && (
              <div className="border-t border-line/70 px-5 py-3">
                <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-muted">
                  <Target className="h-3.5 w-3.5 text-natural" aria-hidden /> {t("goalsRespected")}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {goalCompliance.map((g) => {
                    const def = GOALS.find((x) => x.id === g.goal);
                    return (
                      <span
                        key={g.goal}
                        title={`${g.matched}/${g.assessable}`}
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[0.7rem] font-medium ${
                          g.assessable === 0
                            ? "bg-surface-2 text-muted"
                            : g.respected
                              ? "bg-natural/10 text-natural"
                              : "bg-score-d/10 text-score-d"
                        }`}
                      >
                        <span aria-hidden>{def?.emoji}</span> {GOAL_LABELS[g.goal][locale]}
                        {g.assessable > 0 && <> · {Math.round(g.ratio * 100)}%</>}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}
          </Card>

          {/* Add product */}
          <Card>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2 rounded-2xl border border-line bg-surface-2 px-3">
                <SearchIcon className="h-5 w-5 text-muted" />
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("searchPlaceholder")} className="h-11 flex-1 bg-transparent text-sm outline-none" />
                {q && <button onClick={() => setQ("")} aria-label="clear"><X className="h-4 w-4 text-muted" /></button>}
              </div>
              {searching && <div className="space-y-2"><ProductRowSkeleton /></div>}
              {results.slice(0, 8).map((p) => {
                const inList = activeList.items.some((i) => i.product.barcode === p.barcode);
                return (
                  <div key={p.barcode} className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-2.5">
                    <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-surface-2">
                      { }
                      {p.imageUrl ? <img src={p.imageUrl} alt={p.name} className="h-full w-full object-contain" loading="lazy" /> : null}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{p.name}</p>
                      <p className="truncate text-xs text-muted">{p.brand || "—"}</p>
                    </div>
                    <Button size="icon" variant={inList ? "soft" : "neon"} disabled={inList} aria-label={t("addProduct")}
                      onClick={() => addProduct(p, computeGreeScore(p, prefs), activeList.id)}>
                      {inList ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                    </Button>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {entries.length === 0 ? (
            <EmptyState icon={ShoppingCart} title={t("empty")} />
          ) : (
            <>
              {/* Filters */}
              <div className="flex flex-wrap gap-2">
                {FILTERS.map((f) => (
                  <Chip key={f} active={active.has(f)} onClick={() => toggleF(f)}>{t(`filter${f[0].toUpperCase()}${f.slice(1)}`)}</Chip>
                ))}
              </div>

              {/* Items grouped by aisle */}
              {grouped.map(({ aisle, items }) => (
                <section key={aisle} className="space-y-2">
                  <h2 className="px-1 text-sm font-semibold text-muted">{AISLE_EMOJI[aisle]} {t(`aisle.${aisle}`)}</h2>
                  {items.map(({ item, gree }) => (
                    <Card key={item.product.barcode} className={`flex items-center gap-3 p-2.5 ${item.checked ? "opacity-55" : ""}`}>
                      <button onClick={() => toggleChecked(activeList.id, item.product.barcode)} aria-label="check"
                        className={`grid h-6 w-6 shrink-0 place-items-center rounded-lg border-2 ${item.checked ? "border-natural bg-natural text-white" : "border-line"}`}>
                        {item.checked && <Check className="h-4 w-4" />}
                      </button>
                      <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-surface-2">
                        { }
                        {item.product.imageUrl ? <img src={item.product.imageUrl} alt={item.product.name} className="h-full w-full object-contain" loading="lazy" /> : null}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className={`truncate text-sm font-semibold ${item.checked ? "line-through" : ""}`}>{item.product.name}</p>
                        <div className="mt-0.5 flex items-center gap-1.5">
                          {item.product.nutriScore && <NutriScoreBadge grade={item.product.nutriScore} variant="compact" className="h-4 w-4 rounded text-[0.55rem]" />}
                          <span className="truncate text-xs text-muted">{item.product.brand || "—"}</span>
                        </div>
                      </div>
                      <ScoreRing value={gree.global} size={40} label="" />
                      <button onClick={() => removeItem(activeList.id, item.product.barcode)} aria-label="remove" className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-surface-2 text-muted hover:text-score-e">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </Card>
                  ))}
                </section>
              ))}

              {/* Replacement recommendations */}
              {worst.length > 0 && (
                <section className="space-y-2">
                  <div className="px-1">
                    <h2 className="flex items-center gap-1.5 text-sm font-semibold text-score-d"><Sparkles className="h-4 w-4" /> {t("toImprove")}</h2>
                    <p className="text-xs text-muted">{t("toImproveHint")}</p>
                  </div>
                  <Alternatives product={worst[0].item.product} prefs={prefs} />
                </section>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
