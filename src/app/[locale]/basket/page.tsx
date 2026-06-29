"use client";
import { useTranslations } from "next-intl";
import { ShoppingBasket, Trash2 } from "lucide-react";
import { PageHeading } from "@/components/layout/page-heading";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScoreRing } from "@/components/score/score-ring";
import { useBasketStore } from "@/stores/basket-store";

export default function BasketPage() {
  const t = useTranslations("basket");
  const { items, remove, clear, averageScore } = useBasketStore();
  const avg = averageScore();
  const level = avg >= 75 ? t("level.good") : avg >= 50 ? t("level.ok") : t("level.bad");

  return (
    <div className="space-y-6">
      <PageHeading title={t("title")} subtitle={t("subtitle")} />

      {items.length === 0 ? (
        <Card className="flex flex-col items-center gap-3 p-10 text-center">
          <span className="grid h-14 w-14 place-items-center rounded-2xl bg-surface-2 text-natural">
            <ShoppingBasket className="h-6 w-6" />
          </span>
          <p className="text-sm text-muted">{t("empty")}</p>
        </Card>
      ) : (
        <>
          <Card>
            <CardContent className="flex items-center gap-5">
              <ScoreRing value={avg} size={120} label={level} />
              <div className="flex-1">
                <p className="text-sm font-semibold">{t("score")}</p>
                <p className="text-sm text-muted">{items.length} produits</p>
                <Button variant="ghost" size="sm" className="mt-2 text-score-e" onClick={clear}>
                  <Trash2 className="h-4 w-4" /> Vider
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-2">
            {items.map((it) => (
              <Card key={it.barcode} className="flex items-center gap-3 p-3">
                <div className="h-12 w-12 rounded-xl bg-surface-2" />
                <p className="flex-1 truncate text-sm font-semibold">{it.name}</p>
                <ScoreRing value={it.score} size={44} label="" />
                <button onClick={() => remove(it.barcode)} aria-label="remove" className="text-muted hover:text-score-e">
                  <Trash2 className="h-4 w-4" />
                </button>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
