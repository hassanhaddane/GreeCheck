"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface BasketItem {
  barcode: string;
  name: string;
  imageUrl?: string;
  score: number;
}

interface BasketState {
  items: BasketItem[];
  add: (item: BasketItem) => void;
  remove: (barcode: string) => void;
  clear: () => void;
  averageScore: () => number;
}

export const useBasketStore = create<BasketState>()(
  persist(
    (set, get) => ({
      items: [],
      add: (item) =>
        set((s) => ({
          items: s.items.some((i) => i.barcode === item.barcode) ? s.items : [...s.items, item]
        })),
      remove: (barcode) => set((s) => ({ items: s.items.filter((i) => i.barcode !== barcode) })),
      clear: () => set({ items: [] }),
      averageScore: () => {
        const items = get().items;
        if (!items.length) return 0;
        return Math.round(items.reduce((a, b) => a + b.score, 0) / items.length);
      }
    }),
    { name: "greecheck.basket" }
  )
);
