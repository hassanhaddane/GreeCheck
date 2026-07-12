"use client";
import { useTranslations } from "next-intl";
import { buildRadarAxes } from "@/components/product/nutrition-radar";
import type { BattleEntry } from "@/domains/battle/engine";

// Distinct hues per battle slot (kept on-brand: green family + accents).
export const BATTLE_COLORS = ["rgb(var(--gc-natural))", "rgb(var(--gc-neon))", "#0EA5E9"];

const AXIS_KEYS = ["sugar", "salt", "satFat", "protein", "fiber", "additives", "processing"] as const;

export function AxisBars({ entries }: { entries: BattleEntry[] }) {
  const t = useTranslations("radar");
  const axesPerEntry = entries.map((e) => buildRadarAxes(e.product));

  return (
    <div className="space-y-3">
      {/* legend */}
      <div className="flex flex-wrap gap-3">
        {entries.map((e, i) => (
          <span key={i} className="flex items-center gap-1.5 text-xs text-muted">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: BATTLE_COLORS[i] }} />
            <span className="line-clamp-1 max-w-[8rem]">{e.product.name}</span>
          </span>
        ))}
      </div>

      {AXIS_KEYS.map((axisKey, axisIdx) => {
        const cells = axesPerEntry.map((axes) => axes[axisIdx]);
        const allMissing = cells.every((c) => !c.hasData);
        return (
          <div key={axisKey} className="grid grid-cols-[5.5rem_1fr] items-center gap-2">
            <span className="text-xs font-medium text-muted">{t(axisKey)}</span>
            {allMissing ? (
              <span className="text-xs text-muted/50">—</span>
            ) : (
              <div className="space-y-1">
                {cells.map((c, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-2">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${c.hasData ? c.value : 0}%`, backgroundColor: BATTLE_COLORS[i], opacity: c.hasData ? 1 : 0.2 }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
