"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Search as SearchIcon, SlidersHorizontal, X, RotateCcw, ScanBarcode, Clock, ChevronRight } from "lucide-react";
import { Link } from "@/i18n/routing";
import { Chip } from "@/components/ui/chip";
import { GreeButton } from "@/components/system/gree-button";
import { GreeCard } from "@/components/system/gree-card";
import { GreeBadge } from "@/components/system/gree-badge";
import { GreeBottomSheet } from "@/components/system/gree-bottom-sheet";
import { EmptyState } from "@/components/system/empty-state";
import { ErrorState } from "@/components/system/error-state";
import { ProductRowSkeleton } from "@/components/system/loading-state";
import { FilterPanel } from "@/components/search/filter-panel";
import { ProductCard } from "@/components/product/product-card";
import { FILTER_DEFS } from "@/lib/filters/definitions";
import { searchProductsClient } from "@/domains/product/repository";
import { computeGreeScore } from "@greecheck/domain/scoring/gree-score";
import { nutriRank } from "@greecheck/domain/scoring/thresholds";
import { usePreferencesStore } from "@/domains/criteria/store";
import { useHistoryStore } from "@/domains/library/history-store";
import { parseIntent, isBarcodeQuery, INTENT_PRESETS } from "@/domains/search/intents";
import { parseProductCode } from "@/lib/utils/parse-scan";
import { rankSearchResults, searchProviderTerm } from "@/domains/search/ranking";
import type { FilterLocale } from "@/types/filters";
import type { Product } from "@greecheck/domain/product/model";

type Status = "idle" | "loading" | "ok" | "error";
type SortMode = "best" | "gree" | "nutri" | "nova";

const QUICK_FILTERS = ["bio", "no_additives", "supermarket_best"] as const;

const novaRank = (n?: number) => n ?? 9;
const union = <T,>(a: Set<T>, b: T[]) => new Set<T>([...a, ...b]);

export function SearchClient() {
  const t = useTranslations("search");
  const tc = useTranslations("common");
  const locale = useLocale() as FilterLocale;
  const prefs = usePreferencesStore();
  const searchParams = useSearchParams();
  const recent = useHistoryStore((s) => s.entries);

  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const [responseStatus, setStatus] = useState<Status>("idle");
  const [responseKey, setResponseKey] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const [results, setResults] = useState<Product[]>([]);
  const [panelOpen, setPanelOpen] = useState(false);
  const [sort, setSort] = useState<SortMode>("best");

  const [active, setActive] = useState<Set<string>>(new Set());
  const [nutriSel, setNutriSel] = useState<Set<string>>(new Set());
  const [novaSel, setNovaSel] = useState<Set<number>>(new Set());
  const [minScore, setMinScore] = useState(0);
  const [confidentOnly, setConfidentOnly] = useState(false);
  const [attempt, setAttempt] = useState(0);

  // Deterministic taxonomy mapping: recognized modifiers become structured
  // constraints; the remainder is the free-text subject for OFF.
  const intent = useMemo(() => parseIntent(query), [query]);
  const barcode = parseProductCode(query);
  const isBarcode = Boolean(barcode) || isBarcodeQuery(query);
  const searchTerm = intent.textQuery || query.trim();
  const searchable = !isBarcode && searchTerm.length >= 2;
  const requestKey = JSON.stringify([searchTerm, locale, attempt]);
  const status: Status = !searchable ? "idle" : responseKey === requestKey ? responseStatus : "loading";

  useEffect(() => {
    let current = true;
    if (!searchable) return;
    const timer = setTimeout(async () => {
      try {
        const data = await searchProductsClient(searchProviderTerm(searchTerm, locale), 1, locale);
        if (!current) return;
        setResults(data.products.map(product => ({ ...product, name: product.localizedNames?.[locale] ?? product.name })));
        setResponseKey(requestKey);
        setStatus("ok");
      } catch {
        if (current) { setResponseKey(requestKey); setStatus("error"); }
      }
    }, 600);
    return () => { current = false; clearTimeout(timer); };
  }, [searchTerm, searchable, requestKey, locale]);

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
    () => results.map((p) => ({ p, gree: computeGreeScore(p, prefs) })),
    [results, prefs]
  );
  const activeDefs = useMemo(() => FILTER_DEFS.filter((f) => effActive.has(f.id)), [effActive]);

  const visible = useMemo(() => {
    const list = scored.filter(({ p, gree }) => {
      if (effNutri.size && !(p.nutriScore && effNutri.has(p.nutriScore))) return false;
      if (effNova.size && !(p.novaGroup && effNova.has(p.novaGroup))) return false;
      if (minScore > 0 && (gree.status === "unscored" || gree.score < minScore)) return false;
      if (confidentOnly && gree.confidence === "low") return false;
      return activeDefs.every((def) => def.match(p, gree));
    });
    if (sort === "best") return rankSearchResults(searchTerm, list, prefs);
    return [...list].sort((a, b) => {
      if (sort === "gree") return (b.gree.score ?? -1) - (a.gree.score ?? -1);
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
    <div className="mx-auto max-w-3xl space-y-4">
      <h1 className="gc-editorial text-[clamp(1.85rem,4vw,2.75rem)]">{t("title")}</h1>
      <div className="flex gap-2">
        <div role="search" aria-label={t("title")} className="gc-field flex min-w-0 flex-1 items-center gap-2 ps-3">
          <SearchIcon className="h-5 w-5 shrink-0 text-natural-strong" aria-hidden />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("placeholder")}
            className="h-12 min-w-0 flex-1 bg-transparent pe-2 text-base outline-none placeholder:text-muted"
            aria-label={t("title")}
            inputMode="search"
            autoComplete="off"
          />
          {query && <button type="button" className="grid h-11 w-11 shrink-0 place-items-center rounded-lg text-muted hover:bg-surface-2" onClick={() => { setQuery(""); inputRef.current?.focus(); }} aria-label={t("clear")}><X className="h-4 w-4" aria-hidden /></button>}
        </div>
        <Link href="/scan" aria-label={t("openScanner")} className="grid min-h-12 w-12 shrink-0 place-items-center rounded-xl bg-deep text-white hover:brightness-110">
          <ScanBarcode className="h-5 w-5" aria-hidden />
        </Link>
      </div>
      {!isBarcode && (
        <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label={t("filters")}>
          <Chip active={activeCount === 0} onClick={resetAll}>{t("quickAll")}</Chip>
          {QUICK_FILTERS.map(id => {
            const def = FILTER_DEFS.find(filter => filter.id === id)!;
            return <Chip key={id} active={effActive.has(id)} title={def.description[locale]}
              disabled={intent.filters.includes(id)} onClick={() => setActive(items => toggleIn(items, id))}>{def.label[locale]}</Chip>;
          })}
        </div>
      )}
      {intent.recognized.length > 0 && !isBarcode && (
        <p className="flex flex-wrap items-center gap-1.5 text-xs text-muted">
          {t("intentApplied")}
          {intent.recognized.map(key => <GreeBadge key={key} tone="brand" size="sm">{t(`intent.${key}`)}</GreeBadge>)}
        </p>
      )}

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

      {isBarcode && !barcode && <p className="text-sm text-score-d-ink" role="status">{t("invalidBarcode")}</p>}

      {!isBarcode && (status === "ok" || activeCount > 0) && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-line pb-2">
          <p role="status" className="me-auto text-sm font-semibold">{status === "ok" ? t("results", { n: visible.length }) : ""}</p>
          {activeCount > 0 && (
            <GreeButton variant="ghost" size="sm" onClick={resetAll}>{t("reset")}</GreeButton>
          )}
          <GreeButton variant="outline" size="sm" onClick={() => setPanelOpen(true)}>
            <SlidersHorizontal className="h-4 w-4" aria-hidden /> {t("filters")}{activeCount > 0 && <span className="tabular-nums">{activeCount}</span>}
          </GreeButton>
          <select aria-label={t("sortLabel")} className="gc-field min-h-9 max-w-full px-2 text-sm" value={sort} onChange={e => setSort(e.target.value as SortMode)}>
            {sorts.map(option => <option key={option.id} value={option.id}>{option.label}</option>)}
          </select>
        </div>
      )}

      {/* Idle: intent presets + recent scans (search-first, never empty) */}
      {status === "idle" && !isBarcode && (
        <div className="space-y-5">
          <section>
            <h2 className="gc-heading mb-2">
              {t("presetsTitle")}
            </h2>
            <div className="flex flex-wrap gap-2">
              {INTENT_PRESETS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setQuery(p.query[locale])}
                  className="gc-chip min-h-10 hover:border-natural-strong"
                >
                  {p.label[locale]}
                </button>
              ))}
            </div>
          </section>

          {recent.length > 0 ? (
            <section>
              <h2 className="gc-heading mb-2">
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

      {/* Results */}
      {status === "loading" && (
        <div className="space-y-2" role="status" aria-label={tc("loading")}>{Array.from({ length: 3 }).map((_, i) => <ProductRowSkeleton key={i} />)}</div>
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
        <ul className="divide-y divide-line rounded-2xl border border-line bg-surface">
          {visible.map(({ p, gree }) => <li key={p.barcode}><ProductCard product={p} gree={gree} /></li>)}
        </ul>
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
