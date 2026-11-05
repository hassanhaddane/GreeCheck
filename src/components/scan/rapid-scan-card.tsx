"use client";
import { ProductThumbnail } from "@/components/system/product-thumbnail";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { ArrowRight, Check, Plus, ScanLine, ShoppingBasket, Swords, WifiOff, AlertTriangle } from "lucide-react";
import { GreeCard, GreeCardContent } from "@/components/system/gree-card";
import { GreeButton } from "@/components/system/gree-button";
import { GreeBadge } from "@/components/system/gree-badge";
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
  if (verdict === "insufficient_data" || verdict === "excluded_category" || verdict === "unsupported_category") return "unknown" as const;
  if (verdict === "excellent_choice" || verdict === "good_choice") return "positive" as const;
  if (verdict === "limit" || verdict === "mixed_profile") return "caution" as const;
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
  const isPoor = (gree.status === "scored" && gree.score < 50) || gree.grade === "D" || gree.grade === "E" || gree.alerts.length > 0;
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
      <GreeCard className="relative">
        <GreeCardContent className="space-y-3 p-3 sm:p-4">
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

          {/* One critical warning (compatibility alert — never a health verdict). */}
          {criticalWarning && (
            <p role="alert" className="flex items-start gap-1.5 rounded-2xl bg-score-e/5 p-2.5 text-sm font-medium text-score-e-ink">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              {tScore(`warning.${criticalWarning.code}`, criticalWarning.values)}
            </p>
          )}

          <div className="flex items-center gap-3">
            <ProductThumbnail src={product.imageUrl} />
            <div className="min-w-0 flex-1">
              <p className="break-words font-semibold">{product.name}</p>
              {product.brand && <p className="text-xs text-muted">{product.brand}</p>}
            </div>
            {gree.status === "scored" && <GreeBadge tone={verdictTone(gree.verdict)} size="sm" className="shrink-0"><span className="sr-only">GreeScore </span><bdi>{gree.score}/100</bdi></GreeBadge>}
          </div>
          <p className="text-sm font-semibold">{gree.status === "scored" ? tScore(`verdict.${gree.verdict}`) : tScore("gs3Unavailable")}</p>
          {stale && (
            <p className="inline-flex items-center gap-1 text-xs font-medium text-muted">
              <WifiOff className="h-3.5 w-3.5 shrink-0" aria-hidden /> {t("rapid.cached")}
            </p>
          )}

          {/* One primary reason. */}
          {primaryReason && (
            <p className="text-sm text-ink">
              <span className={primaryReason.kind === "malus" ? "text-score-d-ink" : "text-natural-strong"}>
                {primaryReason.kind === "malus" ? "– " : "+ "}
              </span>
              {tScore(`reason.${primaryReason.code}`, primaryReason.values)}
            </p>
          )}

          {/* Primary action — view the full decision screen. */}
          <GreeButton variant="neon" className="w-full" onClick={onViewResult}>
            {t("rapid.viewResult")} <ArrowRight className="h-4 w-4 rtl:rotate-180" aria-hidden />
          </GreeButton>

          {/* Secondary quick-add actions — no navigation, stay in the session. */}
          <div className="flex flex-wrap gap-2">
            <GreeButton
              variant={inCart ? "soft" : "outline"}
              onClick={onAddToCart}
              disabled={inCart}
              aria-label={inCart ? t("rapid.inCart") : t("rapid.addToCart")}
            >
              {inCart ? <Check className="h-4 w-4 text-natural-strong" aria-hidden /> : <ShoppingBasket className="h-4 w-4" aria-hidden />}
              <span>{inCart ? t("rapid.inCart") : t("rapid.addToCart")}</span>
            </GreeButton>
            <GreeButton
              variant={inBattle ? "soft" : "outline"}
              onClick={onAddToBattle}
              disabled={inBattle || battleFull}
              aria-label={inBattle ? t("rapid.alreadyInBattle") : battleFull ? t("rapid.battleFull") : t("rapid.addToBattle")}
            >
              {inBattle ? <Check className="h-4 w-4 text-natural-strong" aria-hidden /> : <Swords className="h-4 w-4" aria-hidden />}
              <span>{inBattle ? t("rapid.alreadyInBattle") : battleFull ? t("rapid.battleFull") : t("rapid.addToBattle")}</span>
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
