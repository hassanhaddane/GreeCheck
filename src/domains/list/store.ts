"use client";
/**
 * Shopping list — persistent local purchase checklist (IndexedDB KV mirror).
 * Distinct from GreeCart (which ANALYZES a basket): this is what you carry to
 * the shop. Self-hydrating; every mutation writes through. No account, offline.
 */
import { create } from "zustand";
import type { ShoppingListItem } from "@/domains/list/model";
import { shoppingListRepo } from "@/services/storage/repositories";

export interface AddListInput {
  id?: string;
  name: string;
  barcode?: string;
  imageUrl?: string;
  grade?: ShoppingListItem["grade"];
  quantity?: number;
  source?: ShoppingListItem["source"];
}

interface ShoppingListState {
  items: ShoppingListItem[];
  hydrated: boolean;
  ensureHydrated: () => Promise<void>;
  add: (item: AddListInput) => Promise<void>;
  /** Add several products at once (e.g. GreeCart improvement picks). */
  addMany: (items: AddListInput[]) => Promise<void>;
  setQuantity: (id: string, quantity: number) => void;
  toggle: (id: string) => void;
  remove: (id: string) => void;
  clearChecked: () => void;
  clear: () => void;
}

export const useShoppingListStore = create<ShoppingListState>()((set, get) => {
  let hydration: Promise<void> | undefined;
  const persist = () => shoppingListRepo.set(get().items);

  /** Merge one input into the list: bump quantity if it already exists. */
  const mergeInput = (list: ShoppingListItem[], input: AddListInput): ShoppingListItem[] => {
    const id = input.id ?? input.barcode ?? `local-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const existing = list.find((i) => i.id === id);
    if (existing) {
      return list.map((i) => (i.id === id ? { ...i, quantity: i.quantity + (input.quantity ?? 1), checked: false } : i));
    }
    const item: ShoppingListItem = {
      id,
      name: input.name,
      barcode: input.barcode,
      imageUrl: input.imageUrl,
      grade: input.grade,
      quantity: Math.max(1, input.quantity ?? 1),
      checked: false,
      addedAt: Date.now(),
      source: input.source ?? (input.barcode ? "product" : "manual")
    };
    return [item, ...list];
  };

  return {
    items: [],
    hydrated: false,
    ensureHydrated: () => {
      hydration ??= shoppingListRepo.get().then((items) => {
        // Backfill quantity for rows written before it existed.
        const safe = (items ?? []).map((i) => ({ ...i, quantity: i.quantity ?? 1 }));
        set({ items: safe, hydrated: true });
      });
      return hydration;
    },
    add: (input) => get().addMany([input]),
    addMany: async (inputs) => {
      // Compare and GreeCart can add before the list has ever been opened.
      if (!get().hydrated) await get().ensureHydrated();
      set((s) => ({ items: inputs.reduce(mergeInput, s.items) }));
      await persist();
    },
    setQuantity: (id, quantity) => {
      set((s) => ({ items: s.items.map((i) => (i.id === id ? { ...i, quantity: Math.max(1, quantity) } : i)) }));
      persist();
    },
    toggle: (id) => { set((s) => ({ items: s.items.map((i) => (i.id === id ? { ...i, checked: !i.checked } : i)) })); void persist(); },
    remove: (id) => { set((s) => ({ items: s.items.filter((i) => i.id !== id) })); void persist(); },
    clearChecked: () => { set((s) => ({ items: s.items.filter((i) => !i.checked) })); void persist(); },
    clear: () => { set({ items: [] }); void shoppingListRepo.clear(); }
  };
});
