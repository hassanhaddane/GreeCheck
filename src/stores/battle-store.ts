"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Product } from "@/types/product";

export const BATTLE_MAX = 3;

export type AddResult = "added" | "full" | "duplicate";

interface BattleState {
  items: Product[];
  add: (p: Product) => AddResult;
  remove: (barcode: string) => void;
  clear: () => void;
  has: (barcode: string) => boolean;
}

// Up to 3 full products compared head-to-head. Local only, no backend.
export const useBattleStore = create<BattleState>()(
  persist(
    (set, get) => ({
      items: [],
      add: (p) => {
        const items = get().items;
        if (items.some((x) => x.barcode === p.barcode)) return "duplicate";
        if (items.length >= BATTLE_MAX) return "full";
        set({ items: [...items, p] });
        return "added";
      },
      remove: (barcode) => set((s) => ({ items: s.items.filter((x) => x.barcode !== barcode) })),
      clear: () => set({ items: [] }),
      has: (barcode) => get().items.some((x) => x.barcode === barcode)
    }),
    { name: "greecheck.battle.v2" } // v2: stores full products (old key discarded)
  )
);
