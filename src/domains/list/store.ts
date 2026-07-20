"use client";
/**
 * Shopping list — in-memory mirror of the IndexedDB KV document.
 * Self-hydrating on first use (no boot dependency); every mutation writes
 * through. Local-only, deletable, no server anywhere.
 */
import { create } from "zustand";
import type { ShoppingListItem } from "@/domains/list/model";
import { shoppingListRepo } from "@/services/storage/repositories";

interface ShoppingListState {
  items: ShoppingListItem[];
  hydrated: boolean;
  ensureHydrated: () => void;
  add: (item: Omit<ShoppingListItem, "id" | "checked" | "addedAt"> & { id?: string }) => void;
  toggle: (id: string) => void;
  remove: (id: string) => void;
  clearChecked: () => void;
  clear: () => void;
}

let hydrating = false;

export const useShoppingListStore = create<ShoppingListState>()((set, get) => {
  const persist = () => void shoppingListRepo.set(get().items);
  return {
    items: [],
    hydrated: false,
    ensureHydrated: () => {
      if (get().hydrated || hydrating) return;
      hydrating = true;
      void shoppingListRepo.get().then((items) => {
        set({ items: items ?? [], hydrated: true });
        hydrating = false;
      });
    },
    add: (item) => {
      const id = item.id ?? item.barcode ?? `local-${Date.now()}`;
      set((s) => ({
        items: [
          { checked: false, addedAt: Date.now(), ...item, id },
          ...s.items.filter((i) => i.id !== id)
        ]
      }));
      persist();
    },
    toggle: (id) => {
      set((s) => ({ items: s.items.map((i) => (i.id === id ? { ...i, checked: !i.checked } : i)) }));
      persist();
    },
    remove: (id) => {
      set((s) => ({ items: s.items.filter((i) => i.id !== id) }));
      persist();
    },
    clearChecked: () => {
      set((s) => ({ items: s.items.filter((i) => !i.checked) }));
      persist();
    },
    clear: () => {
      set({ items: [] });
      void shoppingListRepo.clear();
    }
  };
});
