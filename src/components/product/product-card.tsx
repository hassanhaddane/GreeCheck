"use client";
import { useTranslations } from "next-intl";
import { AlertTriangle, ChevronRight } from "lucide-react";
import { Link } from "@/i18n/routing";
import { ProductThumbnail } from "@/components/system/product-thumbnail";
import { GreeBadge } from "@/components/system/gree-badge";
import type { Product } from "@greecheck/domain/product/model";
import type { GreeScore } from "@greecheck/domain/scoring/types";

export function ProductCard({ product, gree }: { product: Product; gree: GreeScore }) {
  const t = useTranslations("score");
  const alert = gree.alerts[0];
  const tone = gree.status !== "scored" ? "unknown" : gree.grade === "A" || gree.grade === "B" ? "positive" : gree.grade === "C" ? "caution" : "negative";

  return (
    <Link href={`/product/${product.barcode}`} className="flex min-h-[4.75rem] items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-surface-2 focus-visible:outline-offset-[-3px] sm:px-4">
      <ProductThumbnail src={product.imageUrl} size="md" />
      <div className="min-w-0 flex-1">
        <p className="break-words text-sm font-semibold leading-snug sm:text-base">{product.name}</p>
        {product.brand && <p className="mt-0.5 break-words text-xs text-muted sm:text-sm">{product.brand}</p>}
        {alert && <p className="mt-1 flex gap-1 text-xs font-semibold text-score-e-ink"><AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden />{t(`warning.${alert.code}`, alert.values)}</p>}
      </div>
      {gree.status === "scored"
        ? <GreeBadge tone={tone} size="sm" className="shrink-0"><span className="sr-only">GreeScore </span><bdi className="tabular-nums">{gree.score}/100</bdi></GreeBadge>
        : <span className="max-w-[6.5rem] shrink-0 text-end text-xs font-semibold text-muted">{t("gs3Unavailable")}</span>}
      <ChevronRight aria-hidden className="hidden h-4 w-4 shrink-0 text-muted sm:block rtl:rotate-180" />
    </Link>
  );
}
