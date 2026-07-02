"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Product } from "@/types/product";
import type { GreeScore } from "@/types/scoring";

export interface ShoppingItem {
  product: Product;
  score: number; // GreeScore snapshot
  checked: boolean;
  addedAt: number;
}

export interface ShoppingList {
  id: string;
  name: string;
  createdAt: number;
  items: ShoppingItem[];
}

export type ListAddResult = "added" | "duplicate";

const uid = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : Math.random().toString(36).slice(2);

interface ListState {
  lists: ShoppingList[];
  activeId: string | null;
  createList: (name: string) => string;
  removeList: (id: string) => void;
  renameList: (id: string, name: string) => void;
  setActive: (id: string) => void;
  /** Add to a given list (or the active one, auto-creating a default list if none). */
  addProduct: (product: Product, gree: GreeScore, listId?: string) => ListAddResult;
  removeItem: (listId: string, barcode: string) => void;
  toggleChecked: (listId: string, barcode: string) => void;
  clearList: (listId: string) => void;
  has: (barcode: string, listId?: string) => boolean;
}

// Smart shopping list — 100% local (localStorage). No AI, no backend.
export const useShoppingListStore = create<ListState>()(
  persist(
    (set, get) => ({
      lists: [],
      activeId: null,

      createList: (name) => {
        const id = uid();
        set((s) => ({
          lists: [...s.lists, { id, name: name.trim() || "Ma liste", createdAt: Date.now(), items: [] }],
          activeId: id
        }));
        return id;
      },

      removeList: (id) =>
        set((s) => {
          const lists = s.lists.filter((l) => l.id !== id);
          return { lists, activeId: s.activeId === id ? (lists[0]?.id ?? null) : s.activeId };
        }),

      renameList: (id, name) =>
        set((s) => ({ lists: s.lists.map((l) => (l.id === id ? { ...l, name: name.trim() || l.name } : l)) })),

      setActive: (id) => set({ activeId: id }),

      addProduct: (product, gree, listId) => {
        const state = get();
        let id = listId ?? state.activeId;
        let lists = state.lists;

        // Auto-create a default list on first add.
        if (!id || !lists.some((l) => l.id === id)) {
          id = uid();
          lists = [...lists, { id, name: "Ma liste", createdAt: Date.now(), items: [] }];
        }
        const list = lists.find((l) => l.id === id)!;
        if (list.items.some((i) => i.product.barcode === product.barcode)) {
          set({ lists, activeId: id });
          return "duplicate";
        }
        const item: ShoppingItem = { product, score: gree.global, checked: false, addedAt: Date.now() };
        set({
          lists: lists.map((l) => (l.id === id ? { ...l, items: [...l.items, item] } : l)),
          activeId: id
        });
        return "added";
      },

      removeItem: (listId, barcode) =>
        set((s) => ({
          lists: s.lists.map((l) => (l.id === listId ? { ...l, items: l.items.filter((i) => i.product.barcode !== barcode) } : l))
        })),

      toggleChecked: (listId, barcode) =>
        set((s) => ({
          lists: s.lists.map((l) =>
            l.id === listId
              ? { ...l, items: l.items.map((i) => (i.product.barcode === barcode ? { ...i, checked: !i.checked } : i)) }
              : l
          )
        })),

      clearList: (listId) =>
        set((s) => ({ lists: s.lists.map((l) => (l.id === listId ? { ...l, items: [] } : l)) })),

      has: (barcode, listId) => {
        const s = get();
        const id = listId ?? s.activeId;
        const list = s.lists.find((l) => l.id === id);
        return Boolean(list?.items.some((i) => i.product.barcode === barcode));
      }
    }),
    { name: "greecheck.shopping-lists" }
  )
);
