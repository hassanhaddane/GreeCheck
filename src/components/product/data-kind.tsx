"use client";
import { useTranslations } from "next-intl";
import { CircleCheck, Sigma, MessageSquareQuote } from "lucide-react";
import { cn } from "@/lib/utils/cn";

/**
 * Fact / estimate / opinion marker — makes the epistemic status of every
 * figure explicit (design system requirement):
 *  - fact     = measured value reported by the source (nutrition, ingredients);
 *  - estimate = category-level or derived value (GreeImpact lifecycle, grade
 *               fallback) — true of a category, not measured on this item;
 *  - opinion  = GreeCheck's editorial assessment (the verdict, additive risk).
 * Never color-only: each carries an icon and a word.
 */
export type DataKindValue = "fact" | "estimate" | "opinion";

const STYLE: Record<DataKindValue, { icon: typeof CircleCheck; cls: string }> = {
  fact: { icon: CircleCheck, cls: "bg-pastel-mint text-score-a-ink" },
  estimate: { icon: Sigma, cls: "bg-pastel-sky text-sky-ink" },
  opinion: { icon: MessageSquareQuote, cls: "bg-pastel-butter text-score-c-ink" }
};

export function DataKind({ kind, className }: { kind: DataKindValue; className?: string }) {
  const t = useTranslations("product.dataKind");
  const { icon: Icon, cls } = STYLE[kind];
  return (
    <span
      className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.65rem] font-semibold", cls, className)}
      title={t(`${kind}Help`)}
    >
      <Icon className="h-3 w-3" aria-hidden /> {t(kind)}
    </span>
  );
}
