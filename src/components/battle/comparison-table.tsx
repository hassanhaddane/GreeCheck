"use client";
import { useTranslations } from "next-intl";
import { Check, Minus } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import type { BattleEntry } from "@/lib/scoring/battle";

type Dir = "higher" | "lower" | "bool";
interface Row {
  key: string;
  dir: Dir;
  get: (e: BattleEntry) => number | boolean | null;
  fmt?: (v: number) => string;
}

const nutriRank = (g?: string) => (g ? "abcde".indexOf(g) : null);

const ROWS: Row[] = [
  { key: "greeScore", dir: "higher", get: (e) => e.gree.global },
  { key: "nutriScore", dir: "lower", get: (e) => { const r = nutriRank(e.product.nutriScore); return r === null ? null : r; }, fmt: (v) => "ABCDE"[v] },
  { key: "nova", dir: "lower", get: (e) => e.product.novaGroup ?? null },
  { key: "sugar", dir: "lower", get: (e) => e.product.nutriments.sugars ?? null, fmt: (v) => `${v} g` },
  { key: "salt", dir: "lower", get: (e) => e.product.nutriments.salt ?? null, fmt: (v) => `${v} g` },
  { key: "satFat", dir: "lower", get: (e) => e.product.nutriments.saturatedFat ?? null, fmt: (v) => `${v} g` },
  { key: "protein", dir: "higher", get: (e) => e.product.nutriments.proteins ?? null, fmt: (v) => `${v} g` },
  { key: "fiber", dir: "higher", get: (e) => e.product.nutriments.fiber ?? null, fmt: (v) => `${v} g` },
  { key: "additives", dir: "lower", get: (e) => e.product.additives?.length ?? null },
  { key: "allergens", dir: "lower", get: (e) => e.product.allergens?.length ?? null },
  { key: "bio", dir: "bool", get: (e) => !!e.product.isBio },
  { key: "halal", dir: "bool", get: (e) => !!e.product.isHalal },
  { key: "greenScore", dir: "lower", get: (e) => nutriRank(e.product.greenScore), fmt: (v) => "ABCDE"[v] },
  { key: "goalMatch", dir: "higher", get: (e) => e.gree.goalScore }
];

export function ComparisonTable({ entries }: { entries: BattleEntry[] }) {
  const t = useTranslations("battle");

  // Best value per row (only among numeric, present values).
  const bestFor = (row: Row): number | null => {
    if (row.dir === "bool") return null;
    const nums = entries.map((e) => row.get(e)).filter((v): v is number => typeof v === "number");
    if (!nums.length) return null;
    return row.dir === "higher" ? Math.max(...nums) : Math.min(...nums);
  };

  const cols = entries.length;
  return (
    <div className="overflow-x-auto">
      <div className="min-w-[320px]" style={{ display: "grid", gridTemplateColumns: `minmax(96px,1.1fr) repeat(${cols}, minmax(64px,1fr))` }}>
        {/* header row: product names */}
        <div className="sticky start-0 z-10 bg-surface" />
        {entries.map((e, i) => (
          <div key={i} className="border-b border-line px-2 py-2 text-center text-[0.7rem] font-semibold">
            <span className="line-clamp-1">{e.product.name}</span>
          </div>
        ))}

        {ROWS.map((row, ri) => {
          const best = bestFor(row);
          return (
            <div key={row.key} className="contents">
              <div className={cn("sticky start-0 z-10 flex items-center bg-surface px-2 py-2 text-xs font-medium text-muted", ri % 2 && "bg-surface-2/40")}>
                {t(`table.${row.key}`)}
              </div>
              {entries.map((e, ci) => {
                const v = row.get(e);
                const isNum = typeof v === "number";
                const isBest = row.dir !== "bool" && isNum && best !== null && v === best && entries.length > 1;
                const boolBest = row.dir === "bool" && v === true;
                return (
                  <div
                    key={ci}
                    className={cn(
                      "flex items-center justify-center px-2 py-2 text-center text-xs tabular-nums",
                      ri % 2 && "bg-surface-2/40",
                      (isBest || boolBest) && "rounded-lg bg-natural/10 font-bold text-natural"
                    )}
                  >
                    {row.dir === "bool"
                      ? (v ? <Check className="h-4 w-4 text-natural" /> : <Minus className="h-3.5 w-3.5 text-muted/50" />)
                      : v === null
                        ? <span className="text-muted/50">—</span>
                        : row.fmt ? row.fmt(v as number) : String(v)}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
