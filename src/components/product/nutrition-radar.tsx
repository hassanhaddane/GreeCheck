"use client";
import { useId } from "react";
import { useTranslations } from "next-intl";
import type { Product } from "@greecheck/domain/product/model";

/* ─────────────────────────── axis model ──────────────────────────── */

type AxisKey = "sugar" | "salt" | "satFat" | "protein" | "fiber" | "additives" | "processing";

export interface RadarAxis {
  key: AxisKey;
  value: number; // 0–100 magnitude (amount/level), 0 when missing
  hasData: boolean;
  tone: "bad" | "good"; // bad = more is concerning, good = more is positive
}

const pct = (v: number, max: number) => Math.min(100, Math.max(0, Math.round((v / max) * 100)));

/** Derive the 7 radar axes from a product, tracking which values are actually present. */
export function buildRadarAxes(p: Product): RadarAxis[] {
  const n = p.nutriments;
  const has = (v: number | undefined): v is number => v !== undefined && Number.isFinite(v);
  return [
    { key: "sugar", tone: "bad", hasData: has(n.sugars), value: has(n.sugars) ? pct(n.sugars, 40) : 0 },
    { key: "salt", tone: "bad", hasData: has(n.salt), value: has(n.salt) ? pct(n.salt, 3) : 0 },
    { key: "satFat", tone: "bad", hasData: has(n.saturatedFat), value: has(n.saturatedFat) ? pct(n.saturatedFat, 20) : 0 },
    { key: "protein", tone: "good", hasData: has(n.proteins), value: has(n.proteins) ? pct(n.proteins, 30) : 0 },
    { key: "fiber", tone: "good", hasData: has(n.fiber), value: has(n.fiber) ? pct(n.fiber, 12) : 0 },
    { key: "additives", tone: "bad", hasData: p.additives !== undefined, value: p.additives ? Math.min(100, p.additives.length * 12) : 0 },
    { key: "processing", tone: "bad", hasData: p.novaGroup !== undefined, value: p.novaGroup ? Math.round((p.novaGroup / 4) * 100) : 0 }
  ];
}

// Short labels keep the chart legible on small screens.
const SHORT: Record<AxisKey, string> = {
  sugar: "sugar", salt: "salt", satFat: "satFat", protein: "protein",
  fiber: "fiber", additives: "additives", processing: "processing"
};

function polar(cx: number, cy: number, r: number, i: number, total: number) {
  const a = (Math.PI * 2 * i) / total - Math.PI / 2;
  return [cx + r * Math.cos(a), cy + r * Math.sin(a)] as const;
}

/* ─────────────────────────── full radar ──────────────────────────── */

export function NutritionRadar({ product, size = 240 }: { product: Product; size?: number }) {
  const t = useTranslations("radar");
  const id = useId();
  const axes = buildRadarAxes(product);
  const withData = axes.filter((a) => a.hasData);
  const missing = axes.length - withData.length;

  // Strengths: high "good" axes, or very low "bad" axes. Weak points: high "bad" axes.
  const strengths = withData.filter((a) => (a.tone === "good" && a.value >= 55) || (a.tone === "bad" && a.value <= 20)).slice(0, 3);
  const weaknesses = withData.filter((a) => a.tone === "bad" && a.value >= 55).slice(0, 3);

  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.34;
  const labelR = r + size * 0.12;
  const rings = [25, 50, 75, 100];

  // Short explanation derived from the data we actually have.
  const explain = (): string => {
    if (withData.length === 0) return t("noData");
    const worst = withData.filter((a) => a.tone === "bad").sort((a, b) => b.value - a.value)[0];
    const best = withData.filter((a) => a.tone === "good").sort((a, b) => b.value - a.value)[0];
    const parts: string[] = [];
    if (worst && worst.value >= 55) parts.push(t("mainConcern", { axis: t(worst.key) }));
    if (best && best.value >= 55) parts.push(t("strength", { axis: t(best.key) }));
    if (parts.length === 0) parts.push(t("balanced"));
    if (missing > 0) parts.push(t("partial", { n: missing }));
    return parts.join(" · ");
  };

  const dataPoints = axes.map((a, i) => polar(cx, cy, (r * a.value) / 100, i, axes.length).join(",")).join(" ");

  return (
    <figure className="flex w-full flex-col items-center" aria-label={t("title")}>
      <svg viewBox={`0 0 ${size} ${size}`} className="w-full max-w-[300px]" role="img">
        <defs>
          <linearGradient id={`rad-${id}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="rgb(var(--gc-natural))" stopOpacity="0.28" />
            <stop offset="100%" stopColor="rgb(var(--gc-neon))" stopOpacity="0.28" />
          </linearGradient>
        </defs>

        {/* grid rings */}
        {rings.map((ring) => (
          <polygon
            key={ring}
            points={axes.map((_, i) => polar(cx, cy, (r * ring) / 100, i, axes.length).join(",")).join(" ")}
            fill="none"
            stroke="rgb(var(--gc-line))"
            strokeWidth="1"
          />
        ))}

        {/* spokes — dashed + faint when that axis has no data */}
        {axes.map((a, i) => {
          const [x, y] = polar(cx, cy, r, i, axes.length);
          return (
            <line
              key={a.key}
              x1={cx} y1={cy} x2={x} y2={y}
              stroke="rgb(var(--gc-line))"
              strokeWidth="1"
              strokeDasharray={a.hasData ? undefined : "3 3"}
              opacity={a.hasData ? 1 : 0.6}
            />
          );
        })}

        {/* data polygon */}
        {withData.length > 0 && (
          <polygon points={dataPoints} fill={`url(#rad-${id})`} stroke="rgb(var(--gc-natural))" strokeWidth="2" strokeLinejoin="round" />
        )}

        {/* vertices */}
        {axes.map((a, i) => {
          const [x, y] = polar(cx, cy, (r * a.value) / 100, i, axes.length);
          return a.hasData ? (
            <circle key={a.key} cx={x} cy={y} r="2.4" fill="rgb(var(--gc-natural))" />
          ) : null;
        })}

        {/* labels */}
        {axes.map((a, i) => {
          const [x, y] = polar(cx, cy, labelR, i, axes.length);
          const anchor = Math.abs(x - cx) < 4 ? "middle" : x > cx ? "start" : "end";
          return (
            <text
              key={a.key}
              x={x} y={y}
              textAnchor={anchor}
              dominantBaseline="middle"
              fontSize={size * 0.04}
              className={a.hasData ? "fill-muted" : "fill-line"}
            >
              {t(SHORT[a.key])}{a.hasData ? "" : " ·?"}
            </text>
          );
        })}
      </svg>

      <figcaption className="mt-1 max-w-[34ch] text-center text-xs leading-snug text-muted">
        {explain()}
      </figcaption>

      {/* Radar 2.0 — strengths & weak points derived from actual data */}
      {(strengths.length > 0 || weaknesses.length > 0) && (
        <div className="mt-3 w-full space-y-2">
          {strengths.length > 0 && (
            <div className="flex flex-wrap items-center justify-center gap-1.5">
              <span className="text-[0.65rem] font-semibold uppercase tracking-wide text-natural-strong">{t("strengths")}</span>
              {strengths.map((a) => (
                <span key={a.key} className="inline-flex items-center gap-1 rounded-full bg-natural/10 px-2 py-0.5 text-[0.7rem] font-medium text-natural-strong">
                  + {t(a.key)}{a.tone === "bad" ? ` ${t("lowIntake")}` : ""}
                </span>
              ))}
            </div>
          )}
          {weaknesses.length > 0 && (
            <div className="flex flex-wrap items-center justify-center gap-1.5">
              <span className="text-[0.65rem] font-semibold uppercase tracking-wide text-score-d-ink">{t("weaknesses")}</span>
              {weaknesses.map((a) => (
                <span key={a.key} className="inline-flex items-center gap-1 rounded-full bg-score-d/10 px-2 py-0.5 text-[0.7rem] font-medium text-score-d-ink">
                  – {t(a.key)}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </figure>
  );
}

/* ─────────────────────────── mini radar ──────────────────────────── */

/** Compact, label-less radar for product cards / lists. */
export function MiniRadar({ product, size = 44 }: { product: Product; size?: number }) {
  const id = useId();
  const axes = buildRadarAxes(product);
  const hasAny = axes.some((a) => a.hasData);
  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.42;
  const points = axes.map((a, i) => polar(cx, cy, (r * a.value) / 100, i, axes.length).join(",")).join(" ");
  const outline = axes.map((_, i) => polar(cx, cy, r, i, axes.length).join(",")).join(" ");

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden role="presentation">
      <defs>
        <linearGradient id={`mini-${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="rgb(var(--gc-natural))" stopOpacity="0.35" />
          <stop offset="100%" stopColor="rgb(var(--gc-neon))" stopOpacity="0.35" />
        </linearGradient>
      </defs>
      <polygon points={outline} fill="none" stroke="rgb(var(--gc-line))" strokeWidth="1" />
      {hasAny && <polygon points={points} fill={`url(#mini-${id})`} stroke="rgb(var(--gc-natural))" strokeWidth="1.5" strokeLinejoin="round" />}
    </svg>
  );
}
