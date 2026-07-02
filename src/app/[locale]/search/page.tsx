"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Search as SearchIcon, SlidersHorizontal, X, ChevronRight, ChevronDown, RotateCcw, ArrowDownWideNarrow } from "lucide-react";
import { Link } from "@/i18n/routing";
import { PageHeading } from "@/components/layout/page-heading";
import { Card } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { AdSlot } from "@/components/ads/ad-slot";
import { ErrorState } from "@/components/ui/error-state";
import { ProductRowSkeleton } from "@/components/ui/skeleton";
import { ScoreRing } from "@/components/score/score-ring";
import { MiniRadar } from "@/components/radar/nutrition-radar";
import { NutriScoreBadge } from "@/components/badges/nutri-score-badge";
import { NovaBadge } from "@/components/badges/nova-badge";
import { NUTRI_COLORS, NOVA_COLORS } from "@/lib/constants/badges";
import { FILTER_DEFS, NUTRI_LETTERS, NOVA_GROUPS, type FilterGroup } from "@/lib/filters/definitions";
import { searchProductsClient } from "@/lib/api/client";
import { computeGreeScore } from "@/lib/scoring/gree-score";
import { usePreferencesStore } from "@/stores/preferences-store";
import type { Product } from "@/types/product";
import type { GreeScore } from "@/types/scoring";

type Status = "idle" | "loading" | "ok" | "error";
type SortMode = "gree" | "nutri" | "nova";

const nutriRank = (g?: string) => (g ? "abcde".indexOf(g) : 9);
const novaRank = (n?: number) => n ?? 9;

export default function SearchPage() {
  const t = useTranslations("search");
  const locale = useLocale() as "fr" | "en" | "ar";
  const prefs = usePreferencesStore();

  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [results, setResults] = useState<Product[]>([]);
  const [panelOpen, setPanelOpen] = useState(false);
  const [sort, setSort] = useState<SortMode>("gree");

  const [active, setActive] = useState<Set<string>>(new Set());
  const [nutriSel, setNutriSel] = useState<Set<string>>(new Set());
  const [novaSel, setNovaSel] = useState<Set<number>>(new Set());
  const debounce = useRef<ReturnType<typeof setTimeout>>(undefined);

  const groups: Record<FilterGroup, typeof FILTER_DEFS> = useMemo(
    () => ({
      diet: FILTER_DEFS.filter((f) => f.group === "diet"),
      nutrition: FILTER_DEFS.filter((f) => f.group === "nutrition"),
      smart: FILTER_DEFS.filter((f) => f.group === "smart")
    }),
    []
  );

  // Debounced OFF text search (name / brand / category / keywords).
  useEffect(() => {
    clearTimeout(debounce.current);
    if (query.trim().length < 2) {
      setStatus("idle");
      setResults([]);
      return;
    }
    setStatus("loading");
    debounce.current = setTimeout(async () => {
      try {
        const data = await searchProductsClient(query.trim());
        setResults(data.products);
        setStatus("ok");
      } catch {
        setStatus("error");
      }
    }, 400);
    return () => clearTimeout(debounce.current);
  }, [query]);

  const toggle = (set: Set<string>, setter: (s: Set<string>) => void, id: string) => {
    const next = new Set(set);
    next.has(id) ? next.delete(id) : next.add(id);
    setter(next);
  };
  const toggleNova = (n: number) => {
    const next = new Set(novaSel);
    next.has(n) ? next.delete(n) : next.add(n);
    setNovaSel(next);
  };
  const resetAll = () => {
    setActive(new Set());
    setNutriSel(new Set());
    setNovaSel(new Set());
  };
  const activeCount = active.size + nutriSel.size + novaSel.size;

  // Score every result with the LOCAL preferences, then filter + sort.
  const scored = useMemo(
    () => results.map((p) => ({ p, gree: computeGreeScore(p, prefs) as GreeScore })),
    [results, prefs]
  );

  const visible = useMemo(() => {
    let list = scored.filter(({ p, gree }) => {
      if (nutriSel.size && !(p.nutriScore && nutriSel.has(p.nutriScore))) return false;
      if (novaSel.size && !(p.novaGroup && novaSel.has(p.novaGroup))) return false;
      for (const id of active) {
        const def = FILTER_DEFS.find((f) => f.id === id);
        if (def && !def.match(p, gree)) return false;
      }
      return true;
    });
    list = [...list].sort((a, b) => {
      if (sort === "gree") return b.gree.global - a.gree.global;
      if (sort === "nutri") return nutriRank(a.p.nutriScore) - nutriRank(b.p.nutriScore);
      return novaRank(a.p.novaGroup) - novaRank(b.p.novaGroup);
    });
    return list;
  }, [scored, active, nutriSel, novaSel, sort]);

  const sorts: { id: SortMode; label: string }[] = [
    { id: "gree", label: t("sortGree") },
    { id: "nutri", label: t("sortNutri") },
    { id: "nova", label: t("sortNova") }
  ];

  return (
    <div className="space-y-5">
      <PageHeading title={t("title")} />

      {/* Search bar */}
      <div className="sticky top-14 z-30 -mx-1 bg-bg/85 px-1 py-2 backdrop-blur">
        <div className="flex items-center gap-2 rounded-2xl border border-line bg-surface px-4 shadow-soft">
          <SearchIcon className="h-5 w-5 text-muted" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("placeholder")}
            className="h-12 flex-1 bg-transparent text-sm outline-none"
            autoFocus
            aria-label={t("title")}
          />
          {query && <button onClick={() => setQuery("")} aria-label="clear"><X className="h-4 w-4 text-muted" /></button>}
        </div>
      </div>

      {/* Toolbar: filters toggle + sort */}
      <div className="flex items-center gap-2">
        <Button variant={panelOpen || activeCount ? "primary" : "soft"} size="sm" onClick={() => setPanelOpen((o) => !o)}>
          <SlidersHorizontal className="h-4 w-4" /> {t("filters")}
          {activeCount > 0 && <span className="ms-1 rounded-full bg-white/25 px-1.5 text-xs">{activeCount}</span>}
        </Button>
        <div className="ms-auto flex items-center gap-1 rounded-2xl border border-line bg-surface p-1">
          <ArrowDownWideNarrow className="ms-1 h-4 w-4 text-muted" aria-hidden />
          {sorts.map((s) => (
            <button
              key={s.id}
              onClick={() => setSort(s.id)}
              data-active={sort === s.id}
              className="gc-pressable rounded-xl px-2.5 py-1.5 text-xs font-semibold text-muted data-[active=true]:bg-deep data-[active=true]:text-white"
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Filter panel */}
      {panelOpen && (
        <Card className="space-y-4 p-4">
          {/* Nutri-Score allow-list */}
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">{t("groupNutriScore")}</p>
            <div className="flex flex-wrap gap-2">
              {NUTRI_LETTERS.map((l) => {
                const on = nutriSel.has(l);
                return (
                  <button
                    key={l}
                    onClick={() => toggle(nutriSel, setNutriSel as (s: Set<string>) => void, l)}
                    data-active={on}
                    className="gc-pressable grid h-9 w-9 place-items-center rounded-xl text-sm font-extrabold text-white transition"
                    style={{ backgroundColor: on ? NUTRI_COLORS[l] : "rgb(var(--gc-surface-2))", color: on ? "#fff" : "rgb(var(--gc-muted))" }}
                    aria-pressed={on}
                  >
                    {l.toUpperCase()}
                  </button>
                );
              })}
            </div>
          </div>

          {/* NOVA allow-list */}
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">{t("groupNova")}</p>
            <div className="flex flex-wrap gap-2">
              {NOVA_GROUPS.map((n) => {
                const on = novaSel.has(n);
                return (
                  <button
                    key={n}
                    onClick={() => toggleNova(n)}
                    data-active={on}
                    className="gc-pressable grid h-9 w-9 place-items-center rounded-xl text-sm font-extrabold transition"
                    style={{ backgroundColor: on ? NOVA_COLORS[n] : "rgb(var(--gc-surface-2))", color: on ? "#fff" : "rgb(var(--gc-muted))" }}
                    aria-pressed={on}
                  >
                    {n}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Grouped chips */}
          {(["diet", "nutrition", "smart"] as const).map((g) => (
            <div key={g}>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
                {t(g === "diet" ? "groupDiet" : g === "nutrition" ? "groupNutrition" : "groupSmart")}
              </p>
              <div className="flex flex-wrap gap-2">
                {groups[g].map((f) => (
                  <Chip
                    key={f.id}
                    active={active.has(f.id)}
                    onClick={() => toggle(active, setActive, f.id)}
                    className={g === "smart" ? "data-[active=true]:bg-neon-grad data-[active=true]:text-deep" : ""}
                  >
                    {f.label[locale]}
                  </Chip>
                ))}
              </div>
            </div>
          ))}

          {activeCount > 0 && (
            <Button variant="ghost" size="sm" className="text-score-e" onClick={resetAll}>
              <RotateCcw className="h-4 w-4" /> {t("reset")} ({activeCount})
            </Button>
          )}
        </Card>
      )}

      {/* Discrete ad */}
      <AdSlot variant="inline" />

      {/* Results count */}
      {status === "ok" && (
        <p className="px-1 text-xs text-muted">{t("results", { n: visible.length })}</p>
      )}

      {/* Results */}
      {status === "loading" && (
        <div className="space-y-2">{Array.from({ length: 6 }).map((_, i) => <ProductRowSkeleton key={i} />)}</div>
      )}
      {status === "error" && <ErrorState title="Recherche indisponible" onRetry={() => setQuery((q) => q + " ")} />}
      {status === "idle" && <EmptyState icon={SearchIcon} title={t("startTitle")} description={t("startBody")} />}
      {status === "ok" && visible.length === 0 && <EmptyState icon={SlidersHorizontal} title={t("emptyTitle")} description={t("emptyBody")} action={activeCount ? <Button variant="soft" size="sm" onClick={resetAll}><RotateCcw className="h-4 w-4" /> {t("reset")}</Button> : undefined} />}
      {status === "ok" && visible.length > 0 && (
        <div className="space-y-2">
          {visible.map(({ p, gree }) => (
            <Link key={p.barcode} href={`/product/${p.barcode}`}>
              <Card className="gc-pressable flex items-center gap-3 p-3">
                <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-surface-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {p.imageUrl ? <img src={p.imageUrl} alt={p.name} className="h-full w-full object-contain" loading="lazy" /> : null}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{p.name}</p>
                  <p className="truncate text-xs text-muted">{p.brand || "—"}</p>
                  <div className="mt-1 flex items-center gap-1.5">
                    {p.nutriScore && <NutriScoreBadge grade={p.nutriScore} variant="compact" className="h-5 w-5 rounded-md text-[0.6rem]" />}
                    {p.novaGroup && <NovaBadge group={p.novaGroup} className="scale-90" />}
                  </div>
                </div>
                <span className="hidden shrink-0 sm:block" aria-hidden><MiniRadar product={p} size={40} /></span>
                <ScoreRing value={gree.global} size={46} label="" />
                <ChevronRight className="h-4 w-4 text-muted rtl:rotate-180" />
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
