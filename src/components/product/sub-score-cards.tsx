"use client";
import { useTranslations } from "next-intl";
import { motion, useReducedMotion } from "framer-motion";
import { HeartPulse, Factory, FlaskConical, BadgeCheck, Target, Globe } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { GreeCard } from "@/components/system/gree-card";
import type { GreeScore } from "@/domains/scoring/types";
import { cn } from "@/lib/utils/cn";

const band = (v: number) =>
  v >= 80 ? "bg-score-a" : v >= 65 ? "bg-score-b" : v >= 45 ? "bg-score-c" : v >= 25 ? "bg-score-d" : "bg-score-e";
const ink = (v: number) =>
  v >= 80 ? "text-score-a-ink" : v >= 65 ? "text-score-b-ink" : v >= 45 ? "text-score-c-ink" : v >= 25 ? "text-score-d-ink" : "text-score-e-ink";

interface SubScoreCardsProps {
  gree: GreeScore;
  hasGoals: boolean;
}

/**
 * SubScoreCards — level 3 of the decision hierarchy ("Explorer").
 * Compact, glanceable cards for each scoring bucket the engine actually
 * produced. Absent buckets (unknown data) are OMITTED — never shown as an
 * empty or zeroed card, so missing data never reads as a bad result.
 */
export function SubScoreCards({ gree, hasGoals }: SubScoreCardsProps) {
  const t = useTranslations("product");
  const reduce = useReducedMotion();
  const s = gree.subScores;

  const cards: { key: string; icon: LucideIcon; label: string; value: number }[] = [
    { key: "nutrition", icon: HeartPulse, label: t("subHealth"), value: s.nutrition },
    ...(s.processing !== undefined ? [{ key: "processing", icon: Factory, label: t("subProcessing"), value: s.processing }] : []),
    ...(s.additives !== undefined ? [{ key: "additives", icon: FlaskConical, label: t("subAdditives"), value: s.additives }] : []),
    { key: "naturality", icon: BadgeCheck, label: t("subNaturality"), value: s.naturality },
    ...(hasGoals && s.goalFit !== undefined ? [{ key: "goalFit", icon: Target, label: t("subGoal"), value: s.goalFit }] : []),
    ...(s.environment !== undefined ? [{ key: "environment", icon: Globe, label: t("subEcology"), value: s.environment }] : [])
  ];

  return (
    <section aria-label={t("subScoresTitle")}>
      <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted">{t("subScoresTitle")}</h2>
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
        {cards.map((c, i) => {
          const Icon = c.icon;
          return (
            <GreeCard key={c.key} className="p-3" aria-label={`${c.label}: ${c.value}/100`}>
              <div className="flex items-center justify-between gap-2">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-surface-2 text-muted">
                  <Icon className="h-4 w-4" aria-hidden />
                </span>
                <span className={cn("text-lg font-bold tabular-nums", ink(c.value))}>{c.value}</span>
              </div>
              <p className="mt-2 truncate text-xs font-semibold text-ink">{c.label}</p>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-2">
                <motion.div
                  className={cn("h-full rounded-full", band(c.value))}
                  initial={{ width: reduce ? `${c.value}%` : 0 }}
                  whileInView={{ width: `${c.value}%` }}
                  viewport={{ once: true }}
                  transition={{ duration: reduce ? 0 : 0.6, delay: reduce ? 0 : i * 0.04, ease: [0.22, 1, 0.36, 1] }}
                />
              </div>
            </GreeCard>
          );
        })}
      </div>
    </section>
  );
}
