/**
 * StaticScoreRing — server-safe, zero-JS score ring for the marketing site.
 * Same geometry and grade colors as GreeScoreRing, no animation, no framer.
 */
import { bandForScore } from "@/lib/constants/score";
import { cn } from "@/lib/utils/cn";

export function StaticScoreRing({
  value,
  size = 96,
  label,
  className
}: {
  value: number;
  size?: number;
  label?: string;
  className?: string;
}) {
  const v = Math.min(100, Math.max(0, value));
  const band = bandForScore(v);
  const stroke = Math.max(5, size * 0.085);
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const color = `rgb(var(${band.colorVar}))`;

  return (
    <span className={cn("relative inline-grid place-items-center", className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgb(var(--gc-line))" strokeWidth={stroke} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke={color} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c - (c * v) / 100}
        />
      </svg>
      <span className="absolute inset-0 grid place-items-center text-center">
        <span className="font-bold tabular-nums leading-none" style={{ color, fontSize: size * 0.27 }}>{Math.round(v)}</span>
        {label && <span className="mt-0.5 px-1 text-[0.55rem] font-semibold uppercase tracking-wider text-muted">{label}</span>}
      </span>
    </span>
  );
}
