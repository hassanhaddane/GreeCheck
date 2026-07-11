"use client";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import {
  HeartPulse, Factory, FlaskConical, BadgeCheck, Target, Globe,
  Plus, Minus, CircleHelp, ShieldQuestion
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { GreeCard, GreeCardContent } from "@/components/system/gree-card";
import type { GreeScore, ScoreReason } from "@/domains/scoring/types";
import { cn } from "@/lib/utils/cn";

/** Reason codes grouped by scoring bucket (mirrors lib/scoring/gree-score.ts). */
const BUCKET_REASONS: Record<string, string[]> = {
  health: ["nutriScore", "tooSugar", "richFiber", "richProtein"],
  processing: ["nova1", "nova2", "nova4"],
  additives: ["additivesWatch", "noAdditive", "palmOilReason"],
  labels: ["bio", "fairTrade", "halalOk", "vegan"],
  goal: ["muscleProtein", "reduceSugarGoal"],
  ecology: ["lowEcoImpact"]
};

const barColor = (v: number) =>
  v >= 80 ? "bg-score-a" : v >= 65 ? "bg-score-b" : v >= 45 ? "bg-score-c" : v >= 25 ? "bg-score-d" : "bg-score-e";

function ScoreBar({ value, delay }: { value: number; delay: number }) {
  return (
    <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-2">
      <motion.div
        className={cn("h-full rounded-full", barColor(value))}
        initial={{ width: 0 }}
        whileInView={{ width: `${value}%` }}
        viewport={{ once: true }}
        transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
      />
    </div>
  );
}

function ReasonLine({ reason }: { reason: ScoreReason }) {
  const tScore = useTranslations("score");
  const Icon = reason.kind === "bonus" ? Plus : reason.kind === "malus" ? Minus : CircleHelp;
  return (
    <p className={cn(
      "flex items-start gap-1.5 text-xs",
      reason.kind === "bonus" ? "text-natural-strong" : reason.kind === "malus" ? "text-score-d-ink" : "text-muted"
    )}>
      <Icon className="mt-0.5 h-3 w-3 shrink-0" aria-hidden />
      {tScore(`reason.${reason.code}`, reason.values)}
    </p>
  );
}

/**
 * GreeScore Breakdown — "Why this score?".
 * One row per scoring bucket: animated bar, and the exact bonus/malus
 * reasons the engine produced. Ends with the data-confidence level.
 */
export function ScoreBreakdown({ gree, hasGoals }: { gree: GreeScore; hasGoals: boolean }) {
  const t = useTranslations("product");

  const rows: { key: keyof typeof BUCKET_REASONS; icon: LucideIcon; label: string; value?: number }[] = [
    { key: "health", icon: HeartPulse, label: t("subHealth"), value: gree.healthScore },
    { key: "processing", icon: Factory, label: t("subProcessing"), value: gree.processingScore },
    { key: "additives", icon: FlaskConical, label: t("subAdditives"), value: gree.additivesScore },
    { key: "labels", icon: BadgeCheck, label: t("subNaturality"), value: gree.naturalityScore },
    ...(hasGoals ? [{ key: "goal" as const, icon: Target, label: t("subGoal"), value: gree.goalScore }] : []),
    ...(gree.ecologyScore !== undefined ? [{ key: "ecology" as const, icon: Globe, label: t("subEcology"), value: gree.ecologyScore }] : [])
  ];

  const confidenceTone =
    gree.confidenceLevel === "high" ? "text-natural-strong" : gree.confidenceLevel === "medium" ? "text-score-c-ink" : "text-score-d-ink";

  return (
    <GreeCard>
      <GreeCardContent className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">{t("breakdownTitle")}</h2>

        {rows.map((row, i) => {
          const Icon = row.icon;
          const reasons = gree.reasons.filter((r) => BUCKET_REASONS[row.key]?.includes(r.code));
          return (
            <div key={row.key} className="space-y-1.5">
              <div className="flex items-center gap-2.5">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-surface-2 text-muted">
                  <Icon className="h-4 w-4" aria-hidden />
                </span>
                <span className="w-28 shrink-0 text-xs font-semibold">{row.label}</span>
                <ScoreBar value={row.value ?? 0} delay={i * 0.05} />
                <span className="w-8 shrink-0 text-end text-sm font-bold tabular-nums">{row.value}</span>
              </div>
              {reasons.length > 0 && (
                <div className="space-y-0.5 ps-[2.65rem]">
                  {reasons.slice(0, 3).map((r, j) => <ReasonLine key={j} reason={r} />)}
                </div>
              )}
            </div>
          );
        })}

        {/* Data confidence */}
        <div className="flex items-center gap-2 rounded-2xl bg-surface-2 p-3">
          <ShieldQuestion className={cn("h-4 w-4 shrink-0", confidenceTone)} aria-hidden />
          <p className="text-xs text-muted">
            {t("breakdownConfidence")}{" "}
            <strong className={confidenceTone}>{t(`confidence.${gree.confidenceLevel}`)}</strong>
            {gree.confidenceLevel !== "high" && <> — {t("dataMissing")}</>}
          </p>
        </div>
      </GreeCardContent>
    </GreeCard>
  );
}
