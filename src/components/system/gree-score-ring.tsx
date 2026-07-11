"use client";
import { useId } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { bandForScore } from "@/lib/constants/score";
import { cn } from "@/lib/utils/cn";
import { DUR, EASE } from "./motion";

interface GreeScoreRingProps {
  value: number;
  size?: number;
  label?: string;
  /** "band" = grade color (default), "brand" = natural gradient (heroes) */
  tone?: "band" | "brand";
  showValue?: boolean;
  className?: string;
}

export function GreeScoreRing({ value, size = 132, label, tone = "band", showValue = true, className }: GreeScoreRingProps) {
  const id = useId();
  const reduce = useReducedMotion();
  const v = Math.min(100, Math.max(0, value));
  const band = bandForScore(value);
  const stroke = Math.max(5, size * 0.085);
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const bandColor = `rgb(var(${band.colorVar}))`;
  const ringStroke = tone === "brand" ? `url(#grad-${id})` : bandColor;
  const target = c - (c * v) / 100;

  return (
    <div className={cn("relative inline-grid place-items-center", className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90 overflow-visible" aria-hidden>
        <defs>
          <linearGradient id={`grad-${id}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgb(var(--gc-natural-strong))" />
            <stop offset="100%" stopColor="rgb(var(--gc-natural))" />
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
          initial={{ strokeDashoffset: reduce ? target : c }}
          animate={{ strokeDashoffset: target }}
          transition={{ duration: reduce ? 0 : 1.05, ease: EASE.out }}
          
        />
      </svg>
      {showValue && (
        <motion.div
          className="absolute inset-0 grid place-items-center text-center"
          initial={reduce ? false : { opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.15, duration: DUR.slow, ease: EASE.out }}
        >
          <span className="font-bold tabular-nums leading-none" style={{ color: tone === "brand" ? "rgb(var(--gc-natural-strong))" : bandColor, fontSize: size * 0.26 }}>
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
