"use client";
import { BadgeCheck, Leaf, ShieldQuestion, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { SectionTitle } from "@/components/ui/section-title";
import { NUTRI_COLORS, NOVA_COLORS } from "@/lib/constants/badges";
import { cn } from "@/lib/utils/cn";
import type { BasketCompatibility, BasketNutritionMetric, BasketScoreResult } from "@/lib/scoring/basket";

const GREE_COLORS: Record<string, string> = {
  A: "rgb(var(--gc-score-a))",
  B: "rgb(var(--gc-score-b))",
  C: "rgb(var(--gc-score-c))",
  D: "rgb(var(--gc-score-d))",
  E: "rgb(var(--gc-score-e))"
};

interface BasketDistributionsProps {
  result: BasketScoreResult;
}

function percent(value: number) {
  return `${Math.round(value * 100)}%`;
}

function DistributionCard({
  title,
  counts,
  colors,
  total,
  unknownLabel
}: {
  title: string;
  counts: { key: string; label: string; value: number }[];
  colors: Record<string, string>;
  total: number;
  unknownLabel: string;
}) {
  const known = counts.reduce((sum, item) => (item.key === "unknown" ? sum : sum + item.value), 0);

  return (
    <Card className="p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-sm font-bold">{title}</p>
        <span className="text-xs font-medium text-muted">{known ? `${known}/${total}` : unknownLabel}</span>
      </div>
      {known ? (
        <div className="flex h-3 overflow-hidden rounded-full bg-surface-2">
          {counts.map((item) =>
            item.value > 0 && item.key !== "unknown" ? (
              <span
                key={item.key}
                className="h-full"
                style={{ width: `${(item.value / total) * 100}%`, backgroundColor: colors[item.key] }}
                aria-label={`${item.label}: ${item.value}`}
              />
            ) : null
          )}
        </div>
      ) : (
        <div className="h-3 rounded-full bg-surface-2" />
      )}
      <div className="mt-3 flex flex-wrap gap-1.5">
        {counts.map((item) => (
          <span
            key={item.key}
            className={cn(
              "inline-flex items-center gap-1 rounded-full bg-surface-2 px-2 py-1 text-[0.68rem] font-semibold text-muted",
              item.value > 0 && item.key !== "unknown" && "text-ink"
            )}
          >
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: item.key === "unknown" ? "rgb(var(--gc-muted) / 0.35)" : colors[item.key] }}
            />
            {item.label} {item.value}
          </span>
        ))}
      </div>
    </Card>
  );
}

function CompatibilityMeter({
  title,
  compatibility,
  icon,
  activeLabel
}: {
  title: string;
  compatibility: BasketCompatibility;
  icon: ReactNode;
  activeLabel: string;
}) {
  const total = compatibility.compatible + compatibility.incompatible + compatibility.unknown;
  const width = total ? `${compatibility.ratio * 100}%` : "0%";

  return (
    <Card className={cn("p-4", compatibility.active && "border-natural/35 bg-natural/5")}>
      <div className="flex items-center gap-2">
        <span className="grid h-9 w-9 place-items-center rounded-2xl bg-surface-2 text-natural">{icon}</span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold">{title}</p>
          <p className="text-xs text-muted">{compatibility.active ? activeLabel : `${compatibility.compatible}/${total}`}</p>
        </div>
        <p className="text-lg font-black tabular-nums">{percent(compatibility.ratio)}</p>
      </div>
      <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-surface-2">
        <div className="h-full rounded-full bg-neon-grad" style={{ width }} />
      </div>
      {compatibility.unknown > 0 ? (
        <p className="mt-2 flex items-center gap-1 text-xs text-muted">
          <ShieldQuestion className="h-3.5 w-3.5" /> {compatibility.unknown}
        </p>
      ) : null}
    </Card>
  );
}

function NutritionPill({ label, metric, unit }: { label: string; metric: BasketNutritionMetric; unit: string }) {
  const tone =
    metric.status === "good"
      ? "border-natural/30 bg-natural/10 text-natural"
      : metric.status === "high"
        ? "border-score-d/30 bg-score-d/10 text-score-d"
        : metric.status === "missing"
          ? "border-line bg-surface-2 text-muted"
          : "border-score-c/30 bg-score-c/10 text-score-c";

  return (
    <div className={cn("rounded-2xl border p-3", tone, metric.preferenceActive && "shadow-glow")}>
      <p className="text-xs font-semibold text-current/80">{label}</p>
      <p className="mt-1 text-xl font-black tabular-nums">
        {metric.average === undefined ? "—" : metric.average}
        {metric.average !== undefined ? <span className="ms-1 text-xs font-bold">{unit}</span> : null}
      </p>
    </div>
  );
}

export function BasketDistributions({ result }: BasketDistributionsProps) {
  const t = useTranslations("basket");
  const total = result.metrics.productCount;
  const nutriCounts = (["a", "b", "c", "d", "e", "unknown"] as const).map((key) => ({
    key,
    label: key === "unknown" ? t("unknown") : key.toUpperCase(),
    value: result.distributions.nutriScore[key]
  }));
  const novaCounts = (["1", "2", "3", "4", "unknown"] as const).map((key) => ({
    key,
    label: key === "unknown" ? t("unknown") : key,
    value: result.distributions.nova[key]
  }));
  const greeCounts = (["A", "B", "C", "D", "E"] as const).map((key) => ({
    key,
    label: key,
    value: result.distributions.greeScore[key]
  }));

  return (
    <section className="space-y-3">
      <SectionTitle>{t("distributions")}</SectionTitle>
      <div className="grid gap-3 lg:grid-cols-3">
        <DistributionCard
          title={t("nutriDistribution")}
          counts={nutriCounts}
          colors={{ ...NUTRI_COLORS, unknown: "rgb(var(--gc-muted) / 0.35)" }}
          total={total}
          unknownLabel={t("unavailable")}
        />
        <DistributionCard
          title={t("novaDistribution")}
          counts={novaCounts}
          colors={{
            "1": NOVA_COLORS[1],
            "2": NOVA_COLORS[2],
            "3": NOVA_COLORS[3],
            "4": NOVA_COLORS[4],
            unknown: "rgb(var(--gc-muted) / 0.35)"
          }}
          total={total}
          unknownLabel={t("unavailable")}
        />
        <DistributionCard
          title={t("greeDistribution")}
          counts={greeCounts}
          colors={GREE_COLORS}
          total={total}
          unknownLabel={t("unavailable")}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <CompatibilityMeter
          title={t("bioCompatibility")}
          compatibility={result.compatibility.bio}
          icon={<Leaf className="h-4 w-4" />}
          activeLabel={t("preferenceActive")}
        />
        <CompatibilityMeter
          title={t("halalCompatibility")}
          compatibility={result.compatibility.halal}
          icon={<BadgeCheck className="h-4 w-4" />}
          activeLabel={t("preferenceActive")}
        />
      </div>

      <Card className="p-4">
        <div className="mb-3 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-natural" />
          <p className="text-sm font-bold">{t("nutritionBalance")}</p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          <NutritionPill label={t("nutrition.sugar")} metric={result.nutritionBalance.sugar} unit="g" />
          <NutritionPill label={t("nutrition.salt")} metric={result.nutritionBalance.salt} unit="g" />
          <NutritionPill label={t("nutrition.satFat")} metric={result.nutritionBalance.saturatedFat} unit="g" />
          <NutritionPill label={t("nutrition.protein")} metric={result.nutritionBalance.protein} unit="g" />
          <NutritionPill label={t("nutrition.fiber")} metric={result.nutritionBalance.fiber} unit="g" />
        </div>
      </Card>
    </section>
  );
}
