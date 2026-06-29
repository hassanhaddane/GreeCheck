"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface BattleItem {
  barcode: string;
  name: string;
  imageUrl?: string;
  score: number;
}

interface BattleState {
  items: BattleItem[];
  add: (item: BattleItem) => void;
  remove: (barcode: string) => void;
  clear: () => void;
}

// Up to 3 products compared head-to-head (Scan Battle). Local only.
export const useBattleStore = create<BattleState>()(
  persist(
    (set) => ({
      items: [],
      add: (item) =>
        set((s) =>
          s.items.some((x) => x.barcode === item.barcode) || s.items.length >= 3
            ? s
            : { items: [...s.items, item] }
        ),
      remove: (barcode) => set((s) => ({ items: s.items.filter((x) => x.barcode !== barcode) })),
      clear: () => set({ items: [] })
    }),
    { name: "greecheck.battle" }
  )
);
