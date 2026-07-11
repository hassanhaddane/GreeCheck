"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Search as SearchIcon, SlidersHorizontal, X, RotateCcw, ArrowDownWideNarrow } from "lucide-react";
import { PageHeading } from "@/components/app/page-heading";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { ProductRowSkeleton } from "@/components/ui/skeleton";
import { FilterPanel } from "@/components/search/filter-panel";
import { ProductResultCard } from "@/components/search/product-result-card";
import { FILTER_DEFS } from "@/lib/filters/definitions";
import { searchProductsClient } from "@/domains/product/repository";
import { computeGreeScore } from "@/domains/scoring/gree-score";
import { nutriRank } from "@/domains/scoring/thresholds";
import { usePreferencesStore } from "@/domains/criteria/store";
import type { Product } from "@/domains/product/model";
import type { GreeScore } from "@/domains/scoring/types";

type Status = "idle" | "loading" | "ok" | "error";
type SortMode = "gree" | "nutri" | "nova";

const novaRank = (n?: number) => n ?? 9;

export function SearchClient() {
  const t = useTranslations("search");
  const prefs = usePreferencesStore();
  const searchParams = useSearchParams();

  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const [status, setStatus] = useState<Status>("idle");
  const [results, setResults] = useState<Product[]>([]);
  const [panelOpen, setPanelOpen] = useState(false);
  const [sort, setSort] = useState<SortMode>("gree");

  const [active, setActive] = useState<Set<string>>(new Set());
  const [nutriSel, setNutriSel] = useState<Set<string>>(new Set());
  const [novaSel, setNovaSel] = useState<Set<number>>(new Set());
  const [attempt, setAttempt] = useState(0); // bump to retry the same query
  const debounce = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Debounced OFF text search (name / brand / category / keywords).
  // 600ms debounce: never a request per keystroke, kind to the OFF rate limits.
  useEffect(() => {
    clearTimeout(debounce.current);
    const q = query.trim();
    // State updates run inside timers (never synchronously in the effect body)
    // to avoid react-hooks/set-state-in-effect cascades.
    if (q.length < 2) {
      debounce.current = setTimeout(() => {
        setStatus("idle");
        setResults([]);
      }, 0);
      return () => clearTimeout(debounce.current);
    }
    debounce.current = setTimeout(async () => {
      setStatus("loading");
      try {
        const data = await searchProductsClient(q);
        setResults(data.products);
        setStatus("ok");
      } catch {
        setStatus("error");
      }
    }, 600);
    return () => clearTimeout(debounce.current);
  }, [query, attempt]);

  const toggleIn = <T,>(set: Set<T>, value: T): Set<T> => {
    const next = new Set(set);
    next.has(value) ? next.delete(value) : next.add(value);
    return next;
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

  // Resolve active filter definitions once (not per product).
  const activeDefs = useMemo(() => FILTER_DEFS.filter((f) => active.has(f.id)), [active]);

  const visible = useMemo(() => {
    const list = scored.filter(({ p, gree }) => {
      if (nutriSel.size && !(p.nutriScore && nutriSel.has(p.nutriScore))) return false;
      if (novaSel.size && !(p.novaGroup && novaSel.has(p.novaGroup))) return false;
      return activeDefs.every((def) => def.match(p, gree));
    });
    return [...list].sort((a, b) => {
      if (sort === "gree") return b.gree.global - a.gree.global;
      if (sort === "nutri") return nutriRank(a.p.nutriScore) - nutriRank(b.p.nutriScore);
      return novaRank(a.p.novaGroup) - novaRank(b.p.novaGroup);
    });
  }, [scored, activeDefs, nutriSel, novaSel, sort]);

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
        <FilterPanel
          active={active}
          nutriSel={nutriSel}
          novaSel={novaSel}
          onToggleFilter={(id) => setActive((s) => toggleIn(s, id))}
          onToggleNutri={(l) => setNutriSel((s) => toggleIn(s, l))}
          onToggleNova={(n) => setNovaSel((s) => toggleIn(s, n))}
          onReset={resetAll}
        />
      )}

      {/* Results count */}
      {status === "ok" && (
        <p className="px-1 text-xs text-muted">{t("results", { n: visible.length })}</p>
      )}

      {/* Results */}
      {status === "loading" && (
        <div className="space-y-2">{Array.from({ length: 6 }).map((_, i) => <ProductRowSkeleton key={i} />)}</div>
      )}
      {status === "error" && <ErrorState onRetry={() => setAttempt((a) => a + 1)} />}
      {status === "idle" && <EmptyState icon={SearchIcon} title={t("startTitle")} description={t("startBody")} />}
      {status === "ok" && visible.length === 0 && (
        <EmptyState
          icon={SlidersHorizontal}
          title={t("emptyTitle")}
          description={t("emptyBody")}
          action={activeCount ? <Button variant="soft" size="sm" onClick={resetAll}><RotateCcw className="h-4 w-4" /> {t("reset")}</Button> : undefined}
        />
      )}
      {status === "ok" && visible.length > 0 && (
        <div className="space-y-2">
          {visible.map(({ p, gree }, i) => (
            <ProductResultCard
              key={p.barcode}
              product={p}
              gree={gree}
              bestChoice={sort === "gree" && i === 0 && gree.global >= 65 && visible.length > 1}
              betterAvailable={gree.global < 50 && visible.some((x) => x.gree.global >= 65)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
