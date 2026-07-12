"use client";
import { memo } from "react";
import { motion, useReducedMotion, AnimatePresence } from "framer-motion";
import { Check, TriangleAlert, Sparkles, Trophy, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { DUR, EASE } from "./motion";

/**
 * GreePulse — the living brand mark.
 * A calm concentric "leaf-pulse" orb that reacts to what the app is doing.
 * Deliberately abstract (no face, no mascot): a disc, a ring, and light.
 *
 * States: idle · scanning · success · caution · better-option-found ·
 * comparison-complete · basket-improved.
 * Neon appears ONLY while something is happening (scanning/success/motion).
 * Respects prefers-reduced-motion: static composition, no loops.
 */
export type GreePulseState =
  | "idle"
  | "scanning"
  | "success"
  | "caution"
  | "better-option-found"
  | "comparison-complete"
  | "basket-improved";

const STATE_ICON: Partial<Record<GreePulseState, typeof Check>> = {
  success: Check,
  caution: TriangleAlert,
  "better-option-found": Sparkles,
  "comparison-complete": Trophy,
  "basket-improved": TrendingUp
};

const STATE_TONE: Record<GreePulseState, { disc: string; icon: string }> = {
  idle: { disc: "bg-natural/12", icon: "text-natural-strong" },
  scanning: { disc: "bg-neon/15", icon: "text-natural-strong" },
  success: { disc: "bg-neon/20", icon: "text-deep" },
  caution: { disc: "bg-score-c/15", icon: "text-score-c-ink" },
  "better-option-found": { disc: "bg-natural/15", icon: "text-natural-strong" },
  "comparison-complete": { disc: "bg-natural/15", icon: "text-natural-strong" },
  "basket-improved": { disc: "bg-natural/15", icon: "text-natural-strong" }
};

export interface GreePulseProps {
  state?: GreePulseState;
  size?: number;
  className?: string;
  label?: string;
}

export const GreePulse = memo(function GreePulse({ state = "idle", size = 56, className, label }: GreePulseProps) {
  const reduce = useReducedMotion();
  const tone = STATE_TONE[state];
  const Icon = STATE_ICON[state];
  const ring = size * 0.92;

  return (
    <span
      className={cn("relative inline-grid place-items-center", className)}
      style={{ width: size, height: size }}
      role={label ? "status" : undefined}
      aria-label={label}
      aria-hidden={!label}
    >
      {/* breathing outer ring — idle is barely alive, scanning sweeps */}
      <motion.span
        aria-hidden
        className={cn(
          "absolute rounded-full border",
          state === "scanning" ? "border-neon/60" : "border-natural/30"
        )}
        style={{ width: ring, height: ring }}
        animate={
          reduce
            ? undefined
            : state === "scanning"
              ? { scale: [1, 1.14, 1], opacity: [0.9, 0.35, 0.9] }
              : { scale: 1, opacity: state === "idle" ? 0.55 : 0.7 }
        }
        transition={
          state === "scanning" ? { duration: 1.4, repeat: Infinity, ease: "easeInOut" } : undefined
        }
      />
      {/* scanning sweep — neon, motion only */}
      {state === "scanning" && !reduce && (
        <motion.span
          aria-hidden
          className="absolute rounded-full"
          style={{
            width: ring,
            height: ring,
            background: "conic-gradient(from 0deg, transparent 78%, rgb(var(--gc-neon) / 0.55))"
          }}
          animate={{ rotate: 360 }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "linear" }}
        />
      )}
      {/* core disc */}
      <motion.span
        aria-hidden
        className={cn("absolute rounded-full", tone.disc)}
        style={{ width: size * 0.66, height: size * 0.66 }}
        initial={false}
        animate={reduce ? undefined : { scale: state === "success" || state === "basket-improved" ? [1, 1.12, 1] : 1 }}
        transition={{ duration: DUR.slow, ease: EASE.out }}
      />
      {/* state icon (or the quiet brand dot) */}
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={state}
          className="relative grid place-items-center"
          initial={reduce ? false : { opacity: 0, scale: 0.7 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={reduce ? undefined : { opacity: 0, scale: 0.7 }}
          transition={{ duration: DUR.base, ease: EASE.out }}
        >
          {Icon ? (
            <Icon className={cn(tone.icon)} style={{ width: size * 0.34, height: size * 0.34 }} strokeWidth={2.4} aria-hidden />
          ) : (
            <span
              aria-hidden
              className={cn("rounded-full", state === "scanning" ? "bg-natural-strong" : "bg-natural")}
              style={{ width: size * 0.17, height: size * 0.17 }}
            />
          )}
        </motion.span>
      </AnimatePresence>
    </span>
  );
});
