"use client";
import { useEffect, useState, type ReactNode } from "react";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import { getCachedProduct } from "@/domains/product/repository";
import { usePreferencesStore } from "@/domains/criteria/store";
import { hasValidGs1CheckDigit } from "@greecheck/domain/product/gtin";
import { computeGreeScore } from "@greecheck/domain/scoring/gree-score";
import { GreeCard, GreeCardContent } from "@/components/system/gree-card";
import { ProductThumbnail } from "@/components/system/product-thumbnail";
import { CollapsibleSection } from "@/components/ui/collapsible-section";
import type { Locale } from "@/i18n/routing";

export function OfflineProduct({ children }: { children: ReactNode }) {
  const [entry, setEntry] = useState<Awaited<ReturnType<typeof getCachedProduct>>>();
  const locale = useLocale() as Locale;
  const t = useTranslations("scan");
  const tScore = useTranslations("score");
  const tProduct = useTranslations("product");
  const format = useFormatter();
  const prefs = usePreferencesStore();

  useEffect(() => {
    const match = location.pathname.match(/^\/(?:fr|en|ar)\/product\/(\d+)\/?$/);
    const code = match?.[1];
    if (code && hasValidGs1CheckDigit(code)) void getCachedProduct(code).then(setEntry);
  }, []);

  if (!entry) return children;
  const { product, cachedAt } = entry;
  const gree = computeGreeScore(product, prefs);
  const alert = gree.alerts[0];
  return (
    <GreeCard className="mx-auto my-5 max-w-xl">
      <GreeCardContent className="space-y-3 p-4">
        <p className="text-sm text-muted">
          {t("rapid.cached")}{cachedAt ? " · " + format.dateTime(cachedAt, { dateStyle: "medium" }) : ""}
        </p>
        {alert && <p role="alert" className="rounded-lg bg-score-e/5 p-2 text-sm font-semibold text-score-e-ink">{tScore("warning." + alert.code, alert.values)}</p>}
        <div className="flex items-center gap-3">
          <ProductThumbnail src={product.imageUrl} />
          <div>
            <h1 className="gc-title break-words">{product.localizedNames?.[locale] ?? product.name}</h1>
            {product.brand && <p className="text-sm text-muted">{product.brand}</p>}
          </div>
        </div>
        <p className="text-sm font-semibold">{gree.status === "scored"
          ? <>GreeScore <bdi>{gree.score}/100</bdi> · {tScore("verdict." + gree.verdict)}</>
          : tScore("gs3Unavailable")}</p>
        {gree.status === "unscored" && <p className="text-sm text-muted">{tScore("unscored." + gree.reason.code, gree.reason.values)}</p>}
        {product.ingredientsText && <CollapsibleSection title={tProduct("ingredients")}>
          <p className="break-words text-sm">{product.ingredientsText}</p>
        </CollapsibleSection>}
      </GreeCardContent>
    </GreeCard>
  );
}
