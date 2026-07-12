"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Search as SearchIcon, SlidersHorizontal, X, RotateCcw, ArrowDownWideNarrow, ScanBarcode, Clock, Sparkles, ChevronRight } from "lucide-react";
import { Link, useRouter } from "@/i18n/routing";
import { PageHeading } from "@/components/app/page-heading";
import { GreeButton } from "@/components/system/gree-button";
import { GreeCard } from "@/components/system/gree-card";
import { GreeBadge } from "@/components/system/gree-badge";
import { GreeBottomSheet } from "@/components/system/gree-bottom-sheet";
import { EmptyState } from "@/components/system/empty-state";
import { ErrorState } from "@/components/system/error-state";
import { ProductRowSkeleton } from "@/components/system/loading-state";
import { FilterPanel } from "@/components/search/filter-panel";
import { ProductResultCard } from "@/components/search/product-result-card";
import { FILTER_DEFS } from "@/lib/filters/definitions";
import { searchProductsClient } from "@/domains/product/repository";
import { computeGreeScore } from "@/domains/scoring/gree-score";
import { nutriRank } from "@/domains/scoring/thresholds";
import { usePreferencesStore } from "@/domains/criteria/store";
import { useHistoryStore } from "@/domains/library/history-store";
import { parseIntent, isBarcodeQuery, INTENT_PRESETS } from "@/domains/search/intents";
import { rankSearchResults } from "@/domains/search/ranking";
import type { FilterLocale } from "@/types/filters";
import type { Product } from "@/domains/product/model";
import type { GreeScore } from "@/domains/scoring/types";

type Status = "idle" | "loading" | "ok" | "error";
type SortMode = "best" | "gree" | "nutri" | "nova";

const novaRank = (n?: number) => n ?? 9;
const union = <T,>(a: Set<T>, b: T[]) => new Set<T>([...a, ...b]);

export function SearchClient() {
  const t = useTranslations("search");
  const tc = useTranslations("common");
  const locale = useLocale() as FilterLocale;
  const prefs = usePreferencesStore();
  const router = useRouter();
  const searchParams = useSearchParams();
  const recent = useHistoryStore((s) => s.entries);

  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const [status, setStatus] = useState<Status>("idle");
  const [results, setResults] = useState<Product[]>([]);
  const [panelOpen, setPanelOpen] = useState(false);
  const [sort, setSort] = useState<SortMode>("best");

  const [active, setActive] = useState<Set<string>>(new Set());
  const [nutriSel, setNutriSel] = useState<Set<string>>(new Set());
  const [novaSel, setNovaSel] = useState<Set<number>>(new Set());
  const [minScore, setMinScore] = useState(0);
  const [confidentOnly, setConfidentOnly] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const debounce = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Deterministic taxonomy mapping: recognized modifiers become structured
  // constraints; the remainder is the free-text subject for OFF.
  const intent = useMemo(() => parseIntent(query), [query]);
  const isBarcode = isBarcodeQuery(query);
  const searchTerm = intent.textQuery || query.trim();

  useEffect(() => {
    clearTimeout(debounce.current);
    const q = searchTerm;
    if (isBarcode || q.length < 2) {
      debounce.current = setTimeout(() => { setStatus("idle"); setResults([]); }, 0);
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
  }, [searchTerm, isBarcode, attempt]);

  const toggleIn = <T,>(set: Set<T>, value: T): Set<T> => {
    const next = new Set(set);
    next.has(value) ? next.delete(value) : next.add(value);
    return next;
  };
  const resetAll = () => {
    setActive(new Set());
    setNutriSel(new Set());
    setNovaSel(new Set());
    setMinScore(0);
    setConfidentOnly(false);
  };

  // Effective constraints = user selection UNION recognized intent.
  const effActive = useMemo(() => union(active, intent.filters), [active, intent.filters]);
  const effNutri = useMemo(() => union(nutriSel, intent.nutri), [nutriSel, intent.nutri]);
  const effNova = useMemo(() => union(novaSel, intent.nova), [novaSel, intent.nova]);
  const activeCount = active.size + nutriSel.size + novaSel.size + (minScore > 0 ? 1 : 0) + (confidentOnly ? 1 : 0);

  const scored = useMemo(
    () => results.map((p) => ({ p, gree: computeGreeScore(p, prefs) as GreeScore })),
    [results, prefs]
  );
  const activeDefs = useMemo(() => FILTER_DEFS.filter((f) => effActive.has(f.id)), [effActive]);

  const visible = useMemo(() => {
    const list = scored.filter(({ p, gree }) => {
      if (effNutri.size && !(p.nutriScore && effNutri.has(p.nutriScore))) return false;
      if (effNova.size && !(p.novaGroup && effNova.has(p.novaGroup))) return false;
      if (minScore > 0 && gree.global < minScore) return false;
      if (confidentOnly && gree.confidence === "low") return false;
      return activeDefs.every((def) => def.match(p, gree));
    });
    if (sort === "best") return rankSearchResults(searchTerm, list, prefs);
    return [...list].sort((a, b) => {
      if (sort === "gree") return b.gree.global - a.gree.global;
      if (sort === "nutri") return nutriRank(a.p.nutriScore) - nutriRank(b.p.nutriScore);
      return novaRank(a.p.novaGroup) - novaRank(b.p.novaGroup);
    });
  }, [scored, activeDefs, effNutri, effNova, minScore, confidentOnly, sort, searchTerm, prefs]);

  const sorts: { id: SortMode; label: string }[] = [
    { id: "best", label: t("sortBest") },
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
          <SearchIcon className="h-5 w-5 text-muted" aria-hidden />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("placeholder")}
            className="h-12 flex-1 bg-transparent text-sm outline-none"
            autoFocus
            aria-label={t("title")}
            inputMode="search"
          />
          {query && <button onClick={() => setQuery("")} aria-label={t("clear")}><X className="h-4 w-4 text-muted" /></button>}
        </div>
        {intent.recognized.length > 0 && !isBarcode && (
          <div className="mt-2 flex flex-wrap items-center gap-1.5 px-1">
            <span className="text-[0.7rem] font-medium text-muted">{t("intentApplied")}</span>
            {intent.recognized.map((r) => (
              <GreeBadge key={r} tone="brand" size="sm">{t(`intent.${r}`)}</GreeBadge>
            ))}
          </div>
        )}
      </div>

      {/* Barcode shortcut — deterministic, never auto-navigates */}
      {isBarcode && (
        <Link href={`/product/${query.trim()}`} className="block">
          <GreeCard interactive className="flex items-center gap-3 p-4">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-natural/10 text-natural-strong">
              <ScanBarcode className="h-5 w-5" aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">{t("openBarcode")}</p>
              <p className="truncate text-xs text-muted tabular-nums">{query.trim()}</p>
            </div>
            <ChevronRight className="h-4 w-4 shrink-0 text-muted rtl:rotate-180" aria-hidden />
          </GreeCard>
        </Link>
      )}

      {/* Toolbar: filters + sort (only when results are on screen) */}
      {!isBarcode && (status === "ok" || activeCount > 0) && (
        <div className="flex items-center gap-2">
          <GreeButton variant={activeCount ? "primary" : "soft"} size="sm" onClick={() => setPanelOpen(true)}>
            <SlidersHorizontal className="h-4 w-4" /> {t("filters")}
            {activeCount > 0 && <span className="ms-1 rounded-full bg-white/25 px-1.5 text-xs">{activeCount}</span>}
          </GreeButton>
          <div className="ms-auto flex items-center gap-1 overflow-x-auto rounded-2xl border border-line bg-surface p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <ArrowDownWideNarrow className="ms-1 h-4 w-4 shrink-0 text-muted" aria-hidden />
            {sorts.map((s) => (
              <button
                key={s.id}
                onClick={() => setSort(s.id)}
                data-active={sort === s.id}
                className="gc-pressable shrink-0 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-muted data-[active=true]:bg-deep data-[active=true]:text-white"
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Idle: intent presets + recent scans (search-first, never empty) */}
      {status === "idle" && !isBarcode && (
        <div className="space-y-6">
          <section>
            <h2 className="mb-2.5 flex items-center gap-1.5 px-1 text-sm font-semibold uppercase tracking-wide text-muted">
              <Sparkles className="h-4 w-4 text-natural-strong" aria-hidden /> {t("presetsTitle")}
            </h2>
            <div className="flex flex-wrap gap-2">
              {INTENT_PRESETS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setQuery(p.query[locale])}
                  className="gc-pressable rounded-2xl border border-line bg-surface px-3 py-2 text-sm font-semibold text-ink hover:border-natural/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neon/50"
                >
                  {p.label[locale]}
                </button>
              ))}
            </div>
          </section>

          {recent.length > 0 ? (
            <section>
              <h2 className="mb-2.5 flex items-center gap-1.5 px-1 text-sm font-semibold uppercase tracking-wide text-muted">
                <Clock className="h-4 w-4" aria-hidden /> {t("recentTitle")}
              </h2>
              <div className="space-y-2">
                {recent.slice(0, 6).map((e) => (
                  <Link key={e.barcode} href={`/product/${e.barcode}`} className="block">
                    <GreeCard interactive className="flex items-center gap-3 p-2.5">
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-surface-2 text-sm font-bold tabular-nums text-muted">{e.score}</span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">{e.name}</p>
                        <p className="truncate text-xs text-muted">{e.verdict}</p>
                      </div>
                      <ChevronRight className="h-4 w-4 shrink-0 text-muted rtl:rotate-180" aria-hidden />
                    </GreeCard>
                  </Link>
                ))}
              </div>
            </section>
          ) : (
            <EmptyState icon={SearchIcon} title={t("startTitle")} description={t("startBody")} />
          )}
        </div>
      )}

      {/* Results count */}
      {status === "ok" && !isBarcode && (
        <p className="px-1 text-xs text-muted">{t("results", { n: visible.length })}</p>
      )}

      {/* Results */}
      {status === "loading" && (
        <div className="space-y-2">{Array.from({ length: 6 }).map((_, i) => <ProductRowSkeleton key={i} />)}</div>
      )}
      {status === "error" && <ErrorState onRetry={() => setAttempt((a) => a + 1)} />}
      {status === "ok" && !isBarcode && visible.length === 0 && (
        <EmptyState
          icon={SlidersHorizontal}
          title={t("emptyTitle")}
          description={t("emptyBody")}
          action={activeCount ? <GreeButton variant="soft" size="sm" onClick={resetAll}><RotateCcw className="h-4 w-4" /> {t("reset")}</GreeButton> : undefined}
        />
      )}
      {status === "ok" && !isBarcode && visible.length > 0 && (
        <div className="space-y-2">
          {visible.map(({ p, gree }, i) => (
            <ProductResultCard
              key={p.barcode}
              product={p}
              gree={gree}
              bestChoice={sort === "best" && i === 0 && gree.global >= 65 && visible.length > 1}
              betterAvailable={gree.global < 50 && visible.some((x) => x.gree.global >= 65)}
            />
          ))}
        </div>
      )}

      {/* Progressive filters — responsive bottom sheet (mobile) / panel (desktop) */}
      <GreeBottomSheet open={panelOpen} onClose={() => setPanelOpen(false)} title={t("filters")} closeLabel={tc("close")}>
        <div className="space-y-4">
          {/* Health score group */}
          <div className="rounded-2xl bg-surface-2 p-3">
            <label className="flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-muted">
              {t("minScore")} <span className="tabular-nums text-ink">{minScore}</span>
            </label>
            <input
              type="range" min={0} max={90} step={5} value={minScore}
              onChange={(e) => setMinScore(Number(e.target.value))}
              className="mt-2 w-full accent-[rgb(var(--gc-natural-strong))]"
              aria-label={t("minScore")}
            />
            <label className="mt-2 flex items-center gap-2 text-sm">
              <input type="checkbox" checked={confidentOnly} onChange={(e) => setConfidentOnly(e.target.checked)} className="h-4 w-4 accent-[rgb(var(--gc-natural-strong))]" />
              {t("confidentOnly")}
            </label>
          </div>
          <FilterPanel
            active={active}
            nutriSel={nutriSel}
            novaSel={novaSel}
            onToggleFilter={(id) => setActive((s) => toggleIn(s, id))}
            onToggleNutri={(l) => setNutriSel((s) => toggleIn(s, l))}
            onToggleNova={(n) => setNovaSel((s) => toggleIn(s, n))}
            onReset={resetAll}
          />
          <GreeButton variant="neon" className="w-full" onClick={() => setPanelOpen(false)}>
            {t("applyFilters", { n: visible.length })}
          </GreeButton>
        </div>
      </GreeBottomSheet>
    </div>
  );
}
