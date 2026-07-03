"use client";
/**
 * Local-data management — privacy-first.
 *
 * Everything GreeCheck stores lives ON THE DEVICE:
 *   • preferences, goals, history, favorites, basket, battle → Zustand + localStorage
 *   • product cache → IndexedDB (Dexie)
 *   • theme/language → localStorage
 * These helpers let the user wipe any part of it. Nothing is ever sent to a server.
 */
import { usePreferencesStore } from "@/stores/preferences-store";
import { useHistoryStore } from "@/stores/history-store";
import { useFavoritesStore } from "@/stores/favorites-store";
import { useBasketStore } from "@/stores/basket-store";
import { useBattleStore } from "@/stores/battle-store";
import { db } from "@/lib/storage/db";

export function clearHistory() {
  useHistoryStore.getState().clear();
}

export function clearFavorites() {
  useFavoritesStore.getState().clear();
}

export function clearBasket() {
  useBasketStore.getState().clear();
}

/** Wipe the local IndexedDB product cache. */
export async function clearProductCache() {
  try {
    await db?.products.clear();
  } catch {
    /* Dexie unavailable — nothing to clear */
  }
}

/** Full reset: clears every store, the product cache and all local keys. */
export async function resetApp() {
  useHistoryStore.getState().clear();
  useFavoritesStore.getState().clear();
  useBasketStore.getState().clear();
  useBattleStore.getState().clear();
  usePreferencesStore.getState().reset();
  await clearProductCache();

  if (typeof window !== "undefined") {
    try {
      Object.keys(localStorage)
        .filter((k) => k.startsWith("greecheck"))
        .forEach((k) => localStorage.removeItem(k));
    } catch {
      /* storage unavailable */
    }
  }
}
