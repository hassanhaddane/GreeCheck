"use client";
import { useTranslations } from "next-intl";
import { Plus, Swords, Trophy } from "lucide-react";
import { PageHeading } from "@/components/layout/page-heading";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScoreRing } from "@/components/score/score-ring";

export default function BattlePage() {
  const t = useTranslations("battle");
  const slots = [
    { id: 1, score: 64, filled: true },
    { id: 2, score: 81, filled: true, winner: true },
    { id: 3, filled: false }
  ];

  return (
    <div className="space-y-6">
      <PageHeading title={t("title")} subtitle={t("subtitle")} />

      <div className="grid grid-cols-3 gap-3">
        {slots.map((s) => (
          <Card
            key={s.id}
            className={`relative flex aspect-[3/4] flex-col items-center justify-center gap-3 p-3 text-center ${s.winner ? "border-natural shadow-glow" : ""}`}
          >
            {s.winner && (
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-neon-grad px-2.5 py-0.5 text-[0.6rem] font-bold text-deep shadow-glow">
                {t("winner")}
              </span>
            )}
            {s.filled ? (
              <>
                <div className="h-12 w-12 rounded-xl bg-surface-2" />
                <ScoreRing value={s.score!} size={64} label="" />
                <p className="text-xs font-semibold">Produit {s.id}</p>
              </>
            ) : (
              <button className="gc-pressable flex flex-col items-center gap-2 text-muted">
                <span className="grid h-11 w-11 place-items-center rounded-full border-2 border-dashed border-line">
                  <Plus className="h-5 w-5" />
                </span>
                <span className="text-xs font-medium">{t("addProduct")}</span>
              </button>
            )}
          </Card>
        ))}
      </div>

      {/* Verdict */}
      <Card className="bg-deep-grad p-6 text-white">
        <div className="flex items-center gap-2 text-sm font-semibold text-neon">
          <Trophy className="h-4 w-4" /> {t("verdict")}
        </div>
        <p className="mt-2 text-sm leading-relaxed text-white/85">
          Choisis le produit 2 : il est moins sucré, moins transformé, contient plus de fibres et correspond mieux à ton objectif.
        </p>
        <Button variant="neon" size="sm" className="mt-4">
          <Swords className="h-4 w-4" /> {t("replace")}
        </Button>
      </Card>

      {/* Comparison table */}
      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <tbody>
            {["Sucre", "Sel", "Gras sat.", "Protéines", "Fibres", "NOVA"].map((row, i) => (
              <tr key={row} className={i % 2 ? "bg-surface-2/50" : ""}>
                <td className="px-4 py-3 font-medium text-muted">{row}</td>
                <td className="px-4 py-3 text-center tabular-nums">—</td>
                <td className="px-4 py-3 text-center font-semibold text-natural tabular-nums">—</td>
                <td className="px-4 py-3 text-center tabular-nums">—</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
