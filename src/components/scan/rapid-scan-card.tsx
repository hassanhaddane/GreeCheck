"use client";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { ArrowRight, Check, Plus, ScanLine, ShoppingBasket, Swords, WifiOff, AlertTriangle } from "lucide-react";
import { GreeCard, GreeCardContent } from "@/components/system/gree-card";
import { GreeButton } from "@/components/system/gree-button";
import { GreeScoreRing } from "@/components/system/gree-score-ring";
import { GreeBadge } from "@/components/system/gree-badge";
import { TrustHalo } from "@/components/system/trust-halo";
import { ImpactBadge } from "@/components/product/impact-badge";
import type { Product } from "@greecheck/domain/product/model";
import type { GreeScore } from "@greecheck/domain/scoring/types";

export interface RapidScanResult {
  product: Product;
  gree: GreeScore;
  /** True when the lookup fell back to a local cached copy (offline / rate-limited). */
  stale: boolean;
}

interface RapidScanCardProps {
  result: RapidScanResult;
  /** Number of distinct products resolved in the current rapid session. */
  sessionCount: number;
  inCart: boolean;
  inBattle: boolean;
  battleFull: boolean;
  onViewResult: () => void;
  onAddToCart: () => void;
  onAddToBattle: () => void;
  onScanAnother: () => void;
}

function verdictTone(verdict: GreeScore["verdict"]) {
  if (verdict === "insufficient_data") return "unknown" as const;
  if (verdict === "excellent_choice" || verdict === "good_choice") return "positive" as const;
  if (verdict === "limit" || verdict === "poor_fit_for_goal") return "caution" as const;
  return "negative" as const;
}

/**
 * RapidScanCard — the GreeLens "Rapid Scan Session" action layer.
 * Shown right after a product is detected so a shopper comparing several
 * supermarket items can act WITHOUT navigating away: view the full result,
 * add to GreeCart, add to Battle, or immediately scan another product.
 * The verdict + Trust Halo are visible here so a decision needs zero taps.
 */
export function RapidScanCard({
  result,
  sessionCount,
  inCart,
  inBattle,
  battleFull,
  onViewResult,
  onAddToCart,
  onAddToBattle,
  onScanAnother
}: RapidScanCardProps) {
  const t = useTranslations("scan");
  const tScore = useTranslations("score");
  const { product, gree, stale } = result;

  // One primary reason (most decision-relevant) and one critical warning.
  const isPoor = gree.global < 50 || gree.grade === "D" || gree.grade === "E" || gree.alerts.length > 0;
  const primaryReason = (isPoor ? gree.topNegatives[0] : gree.topPositives[0]) ?? gree.topNegatives[0] ?? gree.topPositives[0];
  const criticalWarning = gree.alerts[0];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      role="region"
      aria-label={t("rapid.heading")}
    >
      <GreeCard variant="glass" className="relative overflow-hidden">
        <span aria-hidden className="pointer-events-none absolute -right-12 -top-12 h-36 w-36 rounded-full bg-natural/10 blur-3xl" />
        <GreeCardContent className="space-y-4">
          <div className="flex items-center justify-between gap-2">
            <p className="gc-overline inline-flex items-center gap-1.5 text-natural-strong">
              <ScanLine className="h-3.5 w-3.5" aria-hidden /> {t("rapid.heading")}
            </p>
            {sessionCount > 1 && (
              <span className="text-xs font-medium tabular-nums text-muted">
                {t("rapid.sessionCount", { n: sessionCount })}
              </span>
            )}
          </div>

          <div className="flex items-center gap-4">
            <GreeScoreRing value={gree.global} size={92} label={tScore(`grade.${gree.grade}`)} />
            <div className="min-w-0 flex-1 space-y-1.5">
              <div className="flex items-center gap-2.5">
                {product.imageUrl && (
                  <span className="aspect-square w-11 shrink-0 overflow-hidden rounded-xl bg-surface-2">
                    <Image src={product.imageUrl} alt="" width={44} height={44} sizes="44px" className="h-full w-full object-contain" />
                  </span>
                )}
                <p className="gc-title line-clamp-2 text-base">{product.name}</p>
              </div>
              <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                <GreeBadge tone={verdictTone(gree.verdict)} size="sm">{tScore(`verdict.${gree.verdict}`)}</GreeBadge>
                <TrustHalo level={gree.confidence} size="sm" />
                <ImpactBadge product={product} />
              </div>
              {stale && (
                <p className="inline-flex items-center gap-1 text-xs font-medium text-muted">
                  <WifiOff className="h-3.5 w-3.5 shrink-0" aria-hidden /> {t("rapid.cached")}
                </p>
              )}
            </div>
          </div>

          {/* One primary reason. */}
          {primaryReason && (
            <p className="text-sm text-ink">
              <span className={primaryReason.kind === "malus" ? "text-score-d-ink" : "text-natural-strong"}>
                {primaryReason.kind === "malus" ? "– " : "+ "}
              </span>
              {tScore(`reason.${primaryReason.code}`, primaryReason.values)}
            </p>
          )}

          {/* One critical warning (compatibility alert — never a health verdict). */}
          {criticalWarning && (
            <p className="flex items-start gap-1.5 rounded-2xl bg-score-e/5 p-2.5 text-sm font-medium text-score-e-ink">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              {tScore(`warning.${criticalWarning.code}`, criticalWarning.values)}
            </p>
          )}

          {/* Primary action — view the full decision screen. */}
          <GreeButton variant="neon" className="w-full" onClick={onViewResult}>
            {t("rapid.viewResult")} <ArrowRight className="h-4 w-4 rtl:rotate-180" aria-hidden />
          </GreeButton>

          {/* Secondary quick-add actions — no navigation, stay in the session. */}
          <div className="grid grid-cols-2 gap-2">
            <GreeButton
              variant={inCart ? "soft" : "outline"}
              onClick={onAddToCart}
              disabled={inCart}
              aria-label={inCart ? t("rapid.inCart") : t("rapid.addToCart")}
            >
              {inCart ? <Check className="h-4 w-4 text-natural-strong" aria-hidden /> : <ShoppingBasket className="h-4 w-4" aria-hidden />}
              <span className="truncate">{inCart ? t("rapid.inCart") : t("rapid.addToCart")}</span>
            </GreeButton>
            <GreeButton
              variant={inBattle ? "soft" : "outline"}
              onClick={onAddToBattle}
              disabled={inBattle || battleFull}
              aria-label={inBattle ? t("rapid.alreadyInBattle") : battleFull ? t("rapid.battleFull") : t("rapid.addToBattle")}
            >
              {inBattle ? <Check className="h-4 w-4 text-natural-strong" aria-hidden /> : <Swords className="h-4 w-4" aria-hidden />}
              <span className="truncate">{inBattle ? t("rapid.alreadyInBattle") : battleFull ? t("rapid.battleFull") : t("rapid.addToBattle")}</span>
            </GreeButton>
          </div>

          {/* Continue the rapid session. */}
          <GreeButton variant="ghost" className="w-full" onClick={onScanAnother}>
            <Plus className="h-4 w-4" aria-hidden /> {t("rapid.scanAnother")}
          </GreeButton>
        </GreeCardContent>
      </GreeCard>
    </motion.div>
  );
}
