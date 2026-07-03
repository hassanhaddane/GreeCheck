"use client";
import { useMemo } from "react";
import { useLocale, useTranslations } from "next-intl";
import { RotateCcw } from "lucide-react";
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

/** Visual filter panel: Nutri-Score / NOVA allow-lists + grouped smart chips. */
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
                onClick={() => onToggleFilter(f.id)}
                className={g === "smart" ? "data-[active=true]:bg-neon-grad data-[active=true]:text-deep" : ""}
              >
                {f.label[locale]}
              </Chip>
            ))}
          </div>
        </div>
      ))}

      {activeCount > 0 && (
        <Button variant="ghost" size="sm" className="text-score-e" onClick={onReset}>
          <RotateCcw className="h-4 w-4" /> {t("reset")} ({activeCount})
        </Button>
      )}
    </Card>
  );
}
