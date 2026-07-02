"use client";
import { useEffect, useMemo, useState } from "react";
import { AlertCircle, ArrowRightLeft, CheckCircle2, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SectionTitle } from "@/components/ui/section-title";
import { ScoreRing } from "@/components/score/score-ring";
import { getAlternatives, type Alternative } from "@/lib/api/client";
import { computeBasketScore, type BasketProductAnalysis, type BasketScoreResult } from "@/lib/scoring/basket";
import type { Product } from "@/types/product";
import type { LocalPreferences } from "@/types/user-preferences";

type SuggestionStatus = "loading" | "ok" | "empty" | "error";

interface Suggestion {
  candidate: BasketProductAnalysis;
  status: SuggestionStatus;
  alternative?: Alternative;
  expectedGain?: number;
}

interface ReplacementSuggestionsProps {
  result: BasketScoreResult;
  products: Product[];
  prefs: LocalPreferences;
  onCompare: (current: Product, alternative: Product) => void;
  onReplace: (barcode: string, alternative: Product) => void;
}

export function ReplacementSuggestions({ result, products, prefs, onCompare, onReplace }: ReplacementSuggestionsProps) {
  const t = useTranslations("basket");
  const candidates = result.recommendedReplacements;
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const candidateKey = candidates.map((candidate) => `${candidate.product.barcode}:${candidate.effectiveScore}`).join("|");
  const productKey = products.map((product) => product.barcode).join("|");

  useEffect(() => {
    let alive = true;

    if (!candidates.length) {
      setSuggestions([]);
      return () => {
        alive = false;
      };
    }

    setSuggestions(candidates.map((candidate) => ({ candidate, status: "loading" })));

    Promise.all(
      candidates.map(async (candidate): Promise<Suggestion> => {
        try {
          const alternatives = await getAlternatives(candidate.product, prefs);
          const alternative = alternatives[0];
          if (!alternative) return { candidate, status: "empty" };

          const replacedProducts = products.map((product) =>
            product.barcode === candidate.product.barcode ? alternative.product : product
          );
          const nextScore = computeBasketScore(
            replacedProducts.map((product) => ({ product })),
            prefs
          ).global;
          return {
            candidate,
            status: "ok",
            alternative,
            expectedGain: Math.max(0, nextScore - result.global)
          };
        } catch {
          return { candidate, status: "error" };
        }
      })
    ).then((next) => {
      if (alive) setSuggestions(next);
    });

    return () => {
      alive = false;
    };
  }, [candidateKey, productKey, result.global, prefs, candidates, products]);

  const hasCandidate = candidates.length > 0;
  const orderedSuggestions = useMemo(
    () => [...suggestions].sort((a, b) => (b.expectedGain ?? 0) - (a.expectedGain ?? 0)),
    [suggestions]
  );

  return (
    <section className="space-y-3">
      <SectionTitle>{t("replacementSuggestions")}</SectionTitle>
      {!hasCandidate ? (
        <Card className="flex items-center gap-3 border-natural/25 bg-natural/5 p-4">
          <CheckCircle2 className="h-5 w-5 shrink-0 text-natural" />
          <p className="text-sm font-medium">{t("noReplacementNeeded")}</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {orderedSuggestions.map((suggestion) => {
            const current = suggestion.candidate.product;
            const alternative = suggestion.alternative;
            const gain = suggestion.expectedGain ?? Math.ceil(suggestion.candidate.estimatedUpgradeGain / Math.max(1, products.length));

            return (
              <Card key={current.barcode} className="overflow-hidden p-4">
                <div className="flex items-start gap-3">
                  <div className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-2xl bg-surface-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {current.imageUrl ? <img src={current.imageUrl} alt={current.name} className="h-full w-full object-contain" loading="lazy" /> : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-1 text-sm font-bold">{current.name}</p>
                    <p className="mt-0.5 text-xs text-muted">{t(`replacementReason.${suggestion.candidate.replacementReasonKey}`)}</p>
                  </div>
                  <span className="rounded-full bg-score-d/10 px-2.5 py-1 text-xs font-bold text-score-d">
                    {t("upgradeGain", { gain })}
                  </span>
                </div>

                {suggestion.status === "loading" ? (
                  <div className="mt-3 h-20 animate-pulse rounded-2xl bg-surface-2" />
                ) : suggestion.status === "error" ? (
                  <div className="mt-3 flex items-center gap-2 rounded-2xl bg-score-d/10 p-3 text-sm font-medium text-score-d">
                    <AlertCircle className="h-4 w-4" /> {t("replacementError")}
                  </div>
                ) : suggestion.status === "empty" || !alternative ? (
                  <div className="mt-3 flex items-center gap-2 rounded-2xl bg-surface-2 p-3 text-sm font-medium text-muted">
                    <Sparkles className="h-4 w-4" /> {t("noReplacementFound")}
                  </div>
                ) : (
                  <div className="mt-3 rounded-2xl border border-natural/25 bg-natural/5 p-3">
                    <div className="flex items-center gap-3">
                      <div className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-2xl bg-surface">
                        {alternative.product.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={alternative.product.imageUrl}
                            alt={alternative.product.name}
                            className="h-full w-full object-contain"
                            loading="lazy"
                          />
                        ) : null}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="line-clamp-2 text-sm font-bold">{alternative.product.name}</p>
                        <p className="truncate text-xs text-muted">{alternative.product.brand || t("unknownBrand")}</p>
                      </div>
                      <ScoreRing value={alternative.gree.global} size={56} label="" tone="neon" />
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <Button variant="soft" size="sm" onClick={() => onCompare(current, alternative.product)}>
                        <ArrowRightLeft className="h-4 w-4" /> {t("compare")}
                      </Button>
                      <Button variant="neon" size="sm" onClick={() => onReplace(current.barcode, alternative.product)}>
                        <CheckCircle2 className="h-4 w-4" /> {t("replaceInBasket")}
                      </Button>
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </section>
  );
}
