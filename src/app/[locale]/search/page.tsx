"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Search as SearchIcon, SlidersHorizontal, X, ChevronRight } from "lucide-react";
import { Link } from "@/i18n/routing";
import { PageHeading } from "@/components/layout/page-heading";
import { Card } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { ProductRowSkeleton } from "@/components/ui/skeleton";
import { ScoreRing } from "@/components/score/score-ring";
import { MiniRadar } from "@/components/radar/nutrition-radar";
import { NutriScoreBadge } from "@/components/badges/nutri-score-badge";
import { FILTERS } from "@/lib/constants/filters";
import { searchProductsClient } from "@/lib/api/client";
import { provisionalScore } from "@/lib/scoring/provisional";
import type { Product } from "@/types/product";
import type { Locale } from "@/i18n/routing";

type Status = "idle" | "loading" | "ok" | "empty" | "error";

export default function SearchPage() {
  const t = useTranslations("search");
  const locale = useLocale() as Locale;
  const [query, setQuery] = useState("");
  const [active, setActive] = useState<string[]>([]);
  const [status, setStatus] = useState<Status>("idle");
  const [results, setResults] = useState<Product[]>([]);
  const debounce = useRef<ReturnType<typeof setTimeout>>();

  const groups = useMemo(
    () => ({ classic: FILTERS.filter((f) => f.group === "classic"), smart: FILTERS.filter((f) => f.group === "smart") }),
    []
  );
  const toggle = (id: string) => setActive((a) => (a.includes(id) ? a.filter((x) => x !== id) : [...a, id]));

  // Debounced live search against the OFF proxy.
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
        setStatus(data.products.length ? "ok" : "empty");
      } catch {
        setStatus("error");
      }
    }, 400);
    return () => clearTimeout(debounce.current);
  }, [query]);

  // Client-side filter overlay on top of OFF results.
  const filtered = useMemo(() => {
    if (!active.length) return results;
    return results.filter((p) =>
      active.every((f) => {
        switch (f) {
          case "bio": return p.isBio;
          case "halal": return p.isHalal;
          case "vegan": return p.isVegan;
          case "vegetarian": return p.isVegetarian;
          case "no_additives": return (p.additives?.length ?? 0) === 0;
          case "low_sugar": return (p.nutriments.sugars ?? 99) <= 5;
          case "low_salt": return (p.nutriments.salt ?? 99) <= 0.3;
          case "high_protein": return (p.nutriments.proteins ?? 0) >= 10;
          case "high_fiber": return (p.nutriments.fiber ?? 0) >= 6;
          case "less_processed": return (p.novaGroup ?? 4) <= 2;
          default: return true;
        }
      })
    );
  }, [results, active]);

  return (
    <div className="space-y-6">
      <PageHeading title={t("title")} />

      <div className="sticky top-14 z-30 -mx-1 bg-bg/80 px-1 py-2 backdrop-blur">
        <div className="flex items-center gap-2 rounded-2xl border border-line bg-surface px-4 shadow-soft">
          <SearchIcon className="h-5 w-5 text-muted" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("placeholder")}
            className="h-12 flex-1 bg-transparent text-sm outline-none"
            autoFocus
          />
          {query && <button onClick={() => setQuery("")} aria-label="clear"><X className="h-4 w-4 text-muted" /></button>}
        </div>
      </div>

      <section className="space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-muted">
          <SlidersHorizontal className="h-4 w-4" /> {t("filters")}
          {active.length > 0 && (
            <Button variant="ghost" size="sm" className="ms-auto h-7" onClick={() => setActive([])}>
              {t("reset")} ({active.length})
            </Button>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {groups.classic.map((f) => (
            <Chip key={f.id} active={active.includes(f.id)} onClick={() => toggle(f.id)}>{f.label[locale]}</Chip>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          {groups.smart.map((f) => (
            <Chip key={f.id} active={active.includes(f.id)} onClick={() => toggle(f.id)} className="data-[active=true]:bg-neon-grad data-[active=true]:text-deep">
              {f.label[locale]}
            </Chip>
          ))}
        </div>
      </section>

      {/* Results */}
      {status === "loading" && (
        <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <ProductRowSkeleton key={i} />)}</div>
      )}
      {status === "error" && <ErrorState title="Recherche indisponible" onRetry={() => setQuery((q) => q + " ")} />}
      {status === "idle" && (
        <EmptyState icon={SearchIcon} title={t("placeholder")} description="Tape au moins 2 caractères pour rechercher dans Open Food Facts." />
      )}
      {(status === "empty" || (status === "ok" && filtered.length === 0)) && (
        <EmptyState icon={SearchIcon} title={t("noResults")} />
      )}
      {status === "ok" && filtered.length > 0 && (
        <div className="space-y-2">
          {filtered.map((p) => (
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
                  </div>
                </div>
                <span className="hidden shrink-0 sm:block" aria-hidden><MiniRadar product={p} size={40} /></span>
                <ScoreRing value={provisionalScore(p)} size={46} label="" />
                <ChevronRight className="h-4 w-4 text-muted rtl:rotate-180" />
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
