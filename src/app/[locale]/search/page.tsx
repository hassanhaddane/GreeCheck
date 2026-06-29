"use client";
import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Search as SearchIcon, SlidersHorizontal, X } from "lucide-react";
import { PageHeading } from "@/components/layout/page-heading";
import { Card } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { Button } from "@/components/ui/button";
import { FILTERS } from "@/lib/constants/filters";
import type { Locale } from "@/i18n/routing";

export default function SearchPage() {
  const t = useTranslations("search");
  const locale = useLocale() as Locale;
  const [query, setQuery] = useState("");
  const [active, setActive] = useState<string[]>([]);

  const groups = useMemo(
    () => ({
      classic: FILTERS.filter((f) => f.group === "classic"),
      smart: FILTERS.filter((f) => f.group === "smart")
    }),
    []
  );
  const toggle = (id: string) =>
    setActive((a) => (a.includes(id) ? a.filter((x) => x !== id) : [...a, id]));

  return (
    <div className="space-y-6">
      <PageHeading title={t("title")} />

      <div className="sticky top-16 z-30 -mx-1 bg-bg/80 px-1 py-2 backdrop-blur">
        <div className="flex items-center gap-2 rounded-2xl border border-line bg-surface px-4 shadow-soft">
          <SearchIcon className="h-5 w-5 text-muted" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("placeholder")}
            className="h-12 flex-1 bg-transparent text-sm outline-none"
          />
          {query && (
            <button onClick={() => setQuery("")} aria-label="clear">
              <X className="h-4 w-4 text-muted" />
            </button>
          )}
        </div>
      </div>

      <section className="space-y-4">
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
            <Chip key={f.id} active={active.includes(f.id)} onClick={() => toggle(f.id)}>
              {f.label[locale]}
            </Chip>
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

      {/* Results placeholder */}
      <Card className="flex flex-col items-center gap-3 p-10 text-center">
        <span className="grid h-14 w-14 place-items-center rounded-2xl bg-surface-2 text-natural">
          <SearchIcon className="h-6 w-6" />
        </span>
        <p className="max-w-xs text-sm text-muted">{t("noResults")}</p>
      </Card>
    </div>
  );
}
