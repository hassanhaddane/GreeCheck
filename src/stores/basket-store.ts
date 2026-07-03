"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Product } from "@/types/product";
import type { GreeScore } from "@/types/scoring";
import type { BasketItem } from "@/types/local-data";

export type { BasketItem };

export type BasketAddResult = "added" | "duplicate";

interface BasketState {
  items: BasketItem[];
  addProduct: (product: Product, gree: GreeScore) => BasketAddResult;
  remove: (barcode: string) => void;
  clear: () => void;
  has: (barcode: string) => boolean;
}

// Smart basket — full products, 100% local (localStorage). Nothing leaves the device.
export const useBasketStore = create<BasketState>()(
  persist(
    (set, get) => ({
      items: [],
      addProduct: (product, gree) => {
        if (get().items.some((i) => i.product.barcode === product.barcode)) return "duplicate";
        set((s) => ({ items: [...s.items, { product, score: gree.global, addedAt: Date.now() }] }));
        return "added";
      },
      remove: (barcode) => set((s) => ({ items: s.items.filter((i) => i.product.barcode !== barcode) })),
      clear: () => set({ items: [] }),
      has: (barcode) => get().items.some((i) => i.product.barcode === barcode)
    }),
    { name: "greecheck.basket.v2" } // v2: stores full products
  )
);
