"use client";
import { useTranslations } from "next-intl";
import { motion, useReducedMotion } from "framer-motion";
import { HeartPulse, Factory, FlaskConical, Leaf, Sprout, Globe, Info } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { GreeCard, GreeCardContent } from "@/components/system/gree-card";
import type { Product } from "@/domains/product/model";
import type { GreeScore } from "@/domains/scoring/types";
import { cn } from "@/lib/utils/cn";

type Tone = "good" | "mixed" | "bad" | "neutral" | "unknown";

export interface GreeStrand {
  key: string;
  icon: LucideIcon;
  /** 0–100 fill, or null when the dimension has no measurable level. */
  level: number | null;
  tone: Tone;
  /** i18n state token (product.dna.<stateKey>). */
  stateKey: string;
  values?: Record<string, string | number>;
}

/**
 * buildGreeDNA — pure derivation of the composition "strands" from a normalized
 * product + its GreeScore. Every strand reflects REAL data; a dimension with no
 * data is explicitly "unknown" (never scored as bad). Mirrors the engine so the
 * DNA always agrees with the score.
 */
export function buildGreeDNA(product: Product, gree: GreeScore): GreeStrand[] {
  const s = gree.subScores;
  const ingredientsKnown = Boolean(product.ingredientsText && product.ingredientsText.trim().length > 2);
  const additiveCount = product.additives?.length ?? 0;

  const nutritionTone: Tone = s.nutrition >= 65 ? "good" : s.nutrition >= 45 ? "mixed" : "bad";
  const nutritionState = s.nutrition >= 65 ? "nutritionGood" : s.nutrition >= 45 ? "nutritionMid" : "nutritionPoor";

  const strands: GreeStrand[] = [
    { key: "nutrition", icon: HeartPulse, level: s.nutrition, tone: nutritionTone, stateKey: nutritionState }
  ];

  // Processing (NOVA)
  if (product.novaGroup === undefined || s.processing === undefined) {
    strands.push({ key: "processing", icon: Factory, level: null, tone: "unknown", stateKey: "unknown" });
  } else {
    const nova = product.novaGroup;
    strands.push({
      key: "processing",
      icon: Factory,
      level: s.processing,
      tone: nova <= 2 ? "good" : nova === 3 ? "mixed" : "bad",
      stateKey: nova <= 2 ? "processingMinimal" : nova === 3 ? "processingProcessed" : "processingUltra"
    });
  }

  // Additives
  if (s.additives === undefined) {
    strands.push({ key: "additives", icon: FlaskConical, level: null, tone: "unknown", stateKey: "unknown" });
  } else {
    strands.push({
      key: "additives",
      icon: FlaskConical,
      level: s.additives,
      tone: additiveCount === 0 ? "good" : additiveCount <= 2 ? "mixed" : "bad",
      stateKey: additiveCount === 0 ? "additivesNone" : additiveCount <= 2 ? "additivesFew" : "additivesMany"
    });
  }

  // Ingredient quality
  if (!ingredientsKnown) {
    strands.push({ key: "ingredients", icon: Leaf, level: null, tone: "unknown", stateKey: "ingredientsIncomplete" });
  } else {
    const clean = additiveCount === 0;
    strands.push({
      key: "ingredients",
      icon: Leaf,
      level: clean ? 92 : 70,
      tone: clean ? "good" : "mixed",
      stateKey: clean ? "ingredientsClean" : "ingredientsKnown"
    });
  }

  // Organic — presence is a positive; absence is NEUTRAL, never a penalty.
  strands.push(
    product.isBio
      ? { key: "organic", icon: Sprout, level: 100, tone: "good", stateKey: "organicCertified" }
      : { key: "organic", icon: Sprout, level: null, tone: "neutral", stateKey: "organicNo" }
  );

  // Environment (Green-Score) — only when reliable
  if (product.greenScore && s.environment !== undefined) {
    const g = product.greenScore;
    strands.push({
      key: "environment",
      icon: Globe,
      level: s.environment,
      tone: g <= "b" ? "good" : g === "c" ? "mixed" : "bad",
      stateKey: g <= "b" ? "environmentLow" : g === "c" ? "environmentMid" : "environmentHigh",
      values: { grade: g.toUpperCase() }
    });
  } else {
    strands.push({ key: "environment", icon: Globe, level: null, tone: "unknown", stateKey: "unknown" });
  }

  return strands;
}

const SEGMENTS = 8;

const TONE_FILL: Record<Tone, string> = {
  good: "bg-score-a",
  mixed: "bg-score-c",
  bad: "bg-score-e",
  neutral: "bg-surface-3",
  unknown: "bg-surface-2"
};
const TONE_CHIP: Record<Tone, string> = {
  good: "bg-natural/12 text-natural-strong",
  mixed: "bg-score-c/15 text-score-c-ink",
  bad: "bg-score-e/12 text-score-e-ink",
  neutral: "bg-surface-2 text-muted",
  unknown: "bg-surface-2 text-muted"
};
const TONE_TEXT: Record<Tone, string> = {
  good: "text-natural-strong",
  mixed: "text-score-c-ink",
  bad: "text-score-e-ink",
  neutral: "text-muted",
  unknown: "text-muted"
};

function StrandRow({ strand, index }: { strand: GreeStrand; index: number }) {
  const t = useTranslations("product");
  const reduce = useReducedMotion();
  const Icon = strand.icon;
  const filled = strand.level === null ? 0 : Math.max(1, Math.round((strand.level / 100) * SEGMENTS));
  const isUnknown = strand.tone === "unknown" || strand.level === null;

  return (
    <div className="flex items-center gap-3">
      <span className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-xl", TONE_CHIP[strand.tone])}>
        <Icon className="h-4 w-4" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-xs font-semibold text-ink">{t(`dna.${strand.key}`)}</span>
          <span className={cn("truncate text-xs font-medium", TONE_TEXT[strand.tone])}>
            {t(`dna.${strand.stateKey}`, strand.values)}
          </span>
        </div>
        <div className="mt-1.5 flex gap-1" aria-hidden>
          {Array.from({ length: SEGMENTS }).map((_, i) => {
            const on = i < filled;
            return (
              <motion.span
                key={i}
                className={cn(
                  "h-2 flex-1 rounded-full",
                  isUnknown ? "border border-dashed border-line bg-transparent" : on ? TONE_FILL[strand.tone] : "bg-surface-2"
                )}
                initial={{ opacity: reduce ? 1 : 0, scaleY: reduce ? 1 : 0.4 }}
                whileInView={{ opacity: 1, scaleY: 1 }}
                viewport={{ once: true }}
                transition={{ duration: reduce ? 0 : 0.28, delay: reduce ? 0 : index * 0.05 + i * 0.02 }}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

/**
 * GreeDNA — a compact, INTERPRETIVE composition summary. Each strand explains
 * how the product is built across nutrition, processing, additives, ingredient
 * quality, organic status and environment, with a plain-language state next to
 * a segmented level. It is never a purely decorative chart: every row carries
 * meaning and unknown dimensions are shown honestly.
 */
export function GreeDNA({ product, gree }: { product: Product; gree: GreeScore }) {
  const t = useTranslations("product");
  const strands = buildGreeDNA(product, gree);

  return (
    <GreeCard>
      <GreeCardContent className="space-y-4">
        <div>
          <h2 className="gc-title inline-flex items-center gap-2 text-base">
            <Sprout className="h-5 w-5 text-natural-strong" aria-hidden /> {t("dna.title")}
          </h2>
          <p className="gc-caption mt-0.5">{t("dna.subtitle")}</p>
        </div>

        <div className="space-y-3.5">
          {strands.map((strand, i) => (
            <StrandRow key={strand.key} strand={strand} index={i} />
          ))}
        </div>

        <p className="flex items-start gap-1.5 rounded-2xl bg-surface-2/70 px-3 py-2 text-xs leading-relaxed text-muted">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden /> {t("dna.legendUnknown")}
        </p>
      </GreeCardContent>
    </GreeCard>
  );
}
