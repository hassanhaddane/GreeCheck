"use client";
import { useId } from "react";
import { motion } from "framer-motion";
import { bandForScore } from "@/lib/constants/score";
import { cn } from "@/lib/utils/cn";

interface ScoreRingProps {
  value: number;
  size?: number;
  label?: string;
  /** "band" = grade color (default), "neon" = brand gradient */
  tone?: "band" | "neon";
  showValue?: boolean;
  className?: string;
}

export function ScoreRing({ value, size = 132, label, tone = "band", showValue = true, className }: ScoreRingProps) {
  const id = useId();
  const v = Math.min(100, Math.max(0, value));
  const band = bandForScore(value);
  const stroke = Math.max(5, size * 0.085);
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const bandColor = `rgb(var(${band.colorVar}))`;
  const ringStroke = tone === "neon" ? `url(#grad-${id})` : bandColor;

  return (
    <div className={cn("relative inline-grid place-items-center", className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90 overflow-visible">
        <defs>
          <linearGradient id={`grad-${id}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgb(var(--gc-natural))" />
            <stop offset="100%" stopColor="rgb(var(--gc-neon))" />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgb(var(--gc-line))" strokeWidth={stroke} />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={ringStroke}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: c - (c * v) / 100 }}
          transition={{ duration: 1.05, ease: [0.22, 1, 0.36, 1] }}
          style={{ filter: tone === "neon" ? "drop-shadow(0 0 6px rgba(57,255,136,0.5))" : undefined }}
        />
      </svg>
      {showValue && (
        <motion.div
          className="absolute inset-0 grid place-items-center text-center"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.15, duration: 0.4 }}
        >
          <span className="font-bold tabular-nums leading-none" style={{ color: tone === "neon" ? "rgb(var(--gc-natural))" : bandColor, fontSize: size * 0.26 }}>
            {Math.round(v)}
          </span>
          {label !== "" && (
            <span className="mt-0.5 text-[0.6rem] font-semibold uppercase tracking-wider text-muted">
              {label ?? band.label}
            </span>
          )}
        </motion.div>
      )}
    </div>
  );
}
