"use client";
/**
 * GreeCart items — in-memory mirror of the IndexedDB cart repository.
 * (GreeCart is a basket analyzer; analysis lives in domains/cart/engine.)
 */
import { create } from "zustand";
import type { Product } from "@greecheck/domain/product/model";
import type { GreeScore } from "@greecheck/domain/scoring/types";
import type { CartItem } from "@greecheck/domain/cart/model";
import { cartRepo } from "@/services/storage/repositories";

export type { CartItem };

export type CartAddResult = "added" | "duplicate";

interface CartState {
  items: CartItem[];
  hydrate: (items: CartItem[]) => void;
  addProduct: (product: Product, gree: GreeScore) => CartAddResult;
  remove: (barcode: string) => void;
  clear: () => void;
  has: (barcode: string) => boolean;
}

export const useCartStore = create<CartState>()((set, get) => ({
  items: [],
  hydrate: (items) => set({ items }),
  addProduct: (product, gree) => {
    if (get().items.some((i) => i.product.barcode === product.barcode)) return "duplicate";
    const item: CartItem = { product, score: gree.global, addedAt: Date.now() };
    set((s) => ({ items: [...s.items, item] }));
    void cartRepo.put(item);
    return "added";
  },
  remove: (barcode) => {
    set((s) => ({ items: s.items.filter((i) => i.product.barcode !== barcode) }));
    void cartRepo.remove(barcode);
  },
  clear: () => {
    set({ items: [] });
    void cartRepo.clear();
  },
  has: (barcode) => get().items.some((i) => i.product.barcode === barcode)
}));
