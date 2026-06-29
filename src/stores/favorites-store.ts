"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { HistoryEntry } from "./history-store";

interface FavoritesState {
  items: HistoryEntry[];
  toggle: (item: HistoryEntry) => void;
  has: (barcode: string) => boolean;
  clear: () => void;
}

export const useFavoritesStore = create<FavoritesState>()(
  persist(
    (set, get) => ({
      items: [],
      toggle: (item) =>
        set((s) => ({
          items: s.items.some((i) => i.barcode === item.barcode)
            ? s.items.filter((i) => i.barcode !== item.barcode)
            : [item, ...s.items]
        })),
      has: (barcode) => get().items.some((i) => i.barcode === barcode),
      clear: () => set({ items: [] })
    }),
    { name: "greecheck.favorites" }
  )
);
