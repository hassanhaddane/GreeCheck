"use client";
/**
 * "Mes scans" history — in-memory mirror of the IndexedDB history repository.
 * Hydrated once at boot (services/storage/boot); every mutation writes through.
 */
import { create } from "zustand";
import type { ScanHistoryItem } from "@/domains/library/model";
import { historyRepo } from "@/services/storage/repositories";

interface HistoryState {
  entries: ScanHistoryItem[];
  hydrate: (entries: ScanHistoryItem[]) => void;
  add: (entry: ScanHistoryItem) => void;
  remove: (barcode: string) => void;
  clear: () => void;
}

export const useHistoryStore = create<HistoryState>()((set) => ({
  entries: [],
  hydrate: (entries) => set({ entries }),
  add: (entry) => {
    set((s) => ({
      entries: [entry, ...s.entries.filter((e) => e.barcode !== entry.barcode)].slice(0, 500)
    }));
    void historyRepo.put(entry);
  },
  remove: (barcode) => {
    set((s) => ({ entries: s.entries.filter((e) => e.barcode !== barcode) }));
    void historyRepo.remove(barcode);
  },
  clear: () => {
    set({ entries: [] });
    void historyRepo.clear();
  }
}));
