"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface HistoryEntry {
  barcode: string;
  name: string;
  imageUrl?: string;
  score: number;
  verdict: string;
  scannedAt: number;
  favorite?: boolean;
}

interface HistoryState {
  entries: HistoryEntry[];
  add: (entry: HistoryEntry) => void;
  remove: (barcode: string) => void;
  clear: () => void;
}

export const useHistoryStore = create<HistoryState>()(
  persist(
    (set) => ({
      entries: [],
      add: (entry) =>
        set((s) => ({
          entries: [entry, ...s.entries.filter((e) => e.barcode !== entry.barcode)].slice(0, 100)
        })),
      remove: (barcode) => set((s) => ({ entries: s.entries.filter((e) => e.barcode !== barcode) })),
      clear: () => set({ entries: [] })
    }),
    { name: "greecheck.history" }
  )
);
