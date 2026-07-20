"use client";
import { motion } from "framer-motion";
import { Trophy } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import type { BattleEntry } from "@greecheck/domain/battle/engine";

const GRADE_BG: Record<string, string> = { A: "bg-score-a", B: "bg-score-b", C: "bg-score-c", D: "bg-score-d", E: "bg-score-e" };
const MEDAL = ["🥇", "🥈", "🥉"];
const PED_H = ["h-20", "h-14", "h-10"]; // 1st tallest

/** Classic podium: winner centered & tallest, runners on the sides. */
export function Podium({ ranking }: { ranking: BattleEntry[] }) {
  // Visual order: [2nd, 1st, 3rd] for three; [1st, 2nd] for two.
  const order = ranking.length === 3 ? [1, 0, 2] : ranking.map((_, i) => i);

  return (
    <div className="flex items-end justify-center gap-2 sm:gap-4">
      {order.map((idx) => {
        const e = ranking[idx];
        if (!e) return null;
        const isWinner = idx === 0;
        return (
          <motion.div
            key={e.product.barcode}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 * idx }}
            className="flex w-1/3 max-w-[8rem] flex-col items-center"
          >
            {/* avatar */}
            <div className="relative">
              <div className={cn("overflow-hidden rounded-full bg-surface-2", isWinner ? "h-16 w-16 ring-2 ring-neon shadow-glow" : "h-12 w-12")}>
                { }
                {e.product.imageUrl ? <img src={e.product.imageUrl} alt={e.product.name} className="h-full w-full object-contain" loading="lazy" /> : null}
              </div>
              <span className={cn("absolute -right-1 -top-1 grid place-items-center rounded-lg text-[0.6rem] font-extrabold text-white", isWinner ? "h-5 w-5" : "h-4 w-4 text-[0.55rem]", GRADE_BG[e.gree.grade])}>
                {e.gree.grade}
              </span>
            </div>

            <p className="mt-1.5 line-clamp-2 text-center text-[0.65rem] font-semibold leading-tight">{e.product.name}</p>
            <p className="text-sm font-extrabold tabular-nums" style={{ color: isWinner ? "rgb(var(--gc-natural))" : undefined }}>{e.gree.global}</p>

            {/* pedestal */}
            <div className={cn("mt-1 flex w-full items-start justify-center rounded-t-xl pt-1.5", PED_H[idx], isWinner ? "bg-neon-grad" : "bg-surface-2")}>
              <span className={cn("text-lg", isWinner && "drop-shadow")}>{MEDAL[idx]}</span>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
