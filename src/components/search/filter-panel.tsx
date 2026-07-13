"use client";
import { useMemo } from "react";
import { useLocale, useTranslations } from "next-intl";
import { RotateCcw, Info } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { Button } from "@/components/ui/button";
import { NUTRI_COLORS, NOVA_COLORS } from "@/lib/constants/badges";
import { FILTER_DEFS, NUTRI_LETTERS, NOVA_GROUPS } from "@/lib/filters/definitions";
import type { FilterGroup, FilterLocale } from "@/types/filters";

export interface FilterSelection {
  active: Set<string>;
  nutriSel: Set<string>;
  novaSel: Set<number>;
}

interface FilterPanelProps extends FilterSelection {
  onToggleFilter: (id: string) => void;
  onToggleNutri: (letter: string) => void;
  onToggleNova: (group: number) => void;
  onReset: () => void;
}

/**
 * Smart Filters 2.0 panel — Nutri-Score / NOVA allow-lists plus grouped
 * smart chips with icons. Active smart filters explain themselves in a
 * summary strip so their impact is understandable at a glance.
 */
export function FilterPanel({ active, nutriSel, novaSel, onToggleFilter, onToggleNutri, onToggleNova, onReset }: FilterPanelProps) {
  const t = useTranslations("search");
  const locale = useLocale() as FilterLocale;
  const activeCount = active.size + nutriSel.size + novaSel.size;

  const groups: Record<FilterGroup, typeof FILTER_DEFS> = useMemo(
    () => ({
      diet: FILTER_DEFS.filter((f) => f.group === "diet"),
      nutrition: FILTER_DEFS.filter((f) => f.group === "nutrition"),
      smart: FILTER_DEFS.filter((f) => f.group === "smart")
    }),
    []
  );

  const activeDefs = FILTER_DEFS.filter((f) => active.has(f.id));

  return (
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
                onClick={() => onToggleNutri(l)}
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
                onClick={() => onToggleNova(n)}
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

      {/* Grouped smart chips with icons */}
      {(["diet", "nutrition", "smart"] as const).map((g) => (
        <div key={g}>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
            {t(g === "diet" ? "groupDiet" : g === "nutrition" ? "groupNutrition" : "groupSmart")}
          </p>
          <div className="flex flex-wrap gap-2">
            {groups[g].map((f) => {
              const Icon = f.icon;
              return (
                <Chip
                  key={f.id}
                  active={active.has(f.id)}
                  onClick={() => onToggleFilter(f.id)}
                  title={f.description[locale]}
                  className={g === "smart" ? "data-[active=true]:bg-neon-grad data-[active=true]:text-deep" : ""}
                >
                  <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  {f.label[locale]}
                </Chip>
              );
            })}
          </div>
        </div>
      ))}

      {/* Active filter explanations */}
      {activeDefs.length > 0 && (
        <div className="space-y-1.5 rounded-2xl bg-surface-2 p-3">
          {activeDefs.map((f) => (
            <p key={f.id} className="flex items-start gap-1.5 text-xs text-muted">
              <Info className="mt-0.5 h-3 w-3 shrink-0 text-natural" aria-hidden />
              <span><strong className="text-ink">{f.label[locale]}</strong> — {f.description[locale]}</span>
            </p>
          ))}
        </div>
      )}

      {activeCount > 0 && (
        <Button variant="ghost" size="sm" className="text-score-e" onClick={onReset}>
          <RotateCcw className="h-4 w-4" /> {t("reset")} ({activeCount})
        </Button>
      )}
    </Card>
  );
}
