"use client";
import { useTranslations } from "next-intl";
import { Leaf } from "lucide-react";
import { computeGreeImpact } from "@greecheck/domain/impact/engine";
import type { Product } from "@greecheck/domain/product/model";

/** Compact GreeImpact grade OR insufficient-data state, for quick surfaces. */
export function ImpactBadge({ product }: { product: Product }) {
  const t = useTranslations("product");
  const impact = computeGreeImpact(product);

  if (impact.status === "insufficient") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-pastel-stone px-2 py-0.5 text-[0.65rem] font-semibold text-verdict-unknown">
        <Leaf className="h-3 w-3" aria-hidden /> {t("impactShortInsufficient")}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-pastel-sky px-2 py-0.5 text-[0.65rem] font-semibold text-sky-ink">
      <Leaf className="h-3 w-3" aria-hidden /> {t("impactShort")} {impact.grade!.toUpperCase()}
    </span>
  );
}
