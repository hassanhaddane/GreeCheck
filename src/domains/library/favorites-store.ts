"use client";
/**
 * Favorites — in-memory mirror of the IndexedDB favorites repository.
 */
import { create } from "zustand";
import type { FavoriteItem } from "@/domains/library/model";
import { favoritesRepo } from "@/services/storage/repositories";

interface FavoritesState {
  items: FavoriteItem[];
  hydrate: (items: FavoriteItem[]) => void;
  toggle: (item: FavoriteItem) => void;
  has: (barcode: string) => boolean;
  clear: () => void;
}

export const useFavoritesStore = create<FavoritesState>()((set, get) => ({
  items: [],
  hydrate: (items) => set({ items }),
  toggle: (item) => {
    const exists = get().items.some((i) => i.barcode === item.barcode);
    set((s) => ({
      items: exists
        ? s.items.filter((i) => i.barcode !== item.barcode)
        : [item, ...s.items]
    }));
    void (exists ? favoritesRepo.remove(item.barcode) : favoritesRepo.put(item));
  },
  has: (barcode) => get().items.some((i) => i.barcode === barcode),
  clear: () => {
    set({ items: [] });
    void favoritesRepo.clear();
  }
}));
