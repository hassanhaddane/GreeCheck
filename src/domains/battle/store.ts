"use client";
/**
 * Scan Battle draft (max 3 contenders) — in-memory mirror of the IndexedDB
 * battle repository. Insertion order preserved via addedAt.
 */
import { create } from "zustand";
import type { Product } from "@/domains/product/model";
import { battleRepo } from "@/services/storage/repositories";

export const BATTLE_MAX = 3;

export type AddResult = "added" | "full" | "duplicate";

interface BattleState {
  items: Product[];
  hydrate: (items: Product[]) => void;
  add: (p: Product) => AddResult;
  remove: (barcode: string) => void;
  clear: () => void;
  has: (barcode: string) => boolean;
}

export const useBattleStore = create<BattleState>()((set, get) => ({
  items: [],
  hydrate: (items) => set({ items: items.slice(0, BATTLE_MAX) }),
  add: (p) => {
    const items = get().items;
    if (items.some((x) => x.barcode === p.barcode)) return "duplicate";
    if (items.length >= BATTLE_MAX) return "full";
    set({ items: [...items, p] });
    void battleRepo.put({ product: p, addedAt: Date.now() });
    return "added";
  },
  remove: (barcode) => {
    set((s) => ({ items: s.items.filter((x) => x.barcode !== barcode) }));
    void battleRepo.remove(barcode);
  },
  clear: () => {
    set({ items: [] });
    void battleRepo.clear();
  },
  has: (barcode) => get().items.some((x) => x.barcode === barcode)
}));
