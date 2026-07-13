"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ScanHistoryItem } from "@/types/local-data";

// Back-compat alias (older imports used `HistoryEntry`).
export type HistoryEntry = ScanHistoryItem;

interface HistoryState {
  entries: ScanHistoryItem[];
  add: (entry: ScanHistoryItem) => void;
  remove: (barcode: string) => void;
  clear: () => void;
}

// Local scan history — capped at 100 entries, stored on-device only.
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
