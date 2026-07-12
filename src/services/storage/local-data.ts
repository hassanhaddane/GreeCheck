"use client";
/**
 * Local-data management — privacy-first.
 *
 * Everything GreeCheck stores lives ON THE DEVICE (IndexedDB behind the
 * repositories + theme/locale hints in localStorage). These helpers let the
 * user wipe any part of it. Nothing is ever sent to a server.
 */
import {
  historyRepo, favoritesRepo, cartRepo, battleRepo,
  productCacheRepo, preferencesRepo, onboardingRepo
} from "./repositories";
import { useHistoryStore } from "@/domains/library/history-store";
import { useFavoritesStore } from "@/domains/library/favorites-store";
import { useCartStore } from "@/domains/cart/store";
import { useBattleStore } from "@/domains/battle/store";
import { usePreferencesStore } from "@/domains/criteria/store";

export async function clearHistory() {
  useHistoryStore.getState().clear();
  await historyRepo.clear();
}

export async function clearFavorites() {
  useFavoritesStore.getState().clear();
  await favoritesRepo.clear();
}

export async function clearCart() {
  useCartStore.getState().clear();
  await cartRepo.clear();
}

/** Wipe the local IndexedDB product cache. */
export async function clearProductCache() {
  await productCacheRepo.clear();
}

/** Reset "Mes critères" back to the neutral defaults. */
export async function clearPreferences() {
  usePreferencesStore.getState().reset();
  await preferencesRepo.clear();
}

/** Full reset: clears every store, every repository and all local keys. */
export async function resetApp() {
  useHistoryStore.getState().clear();
  useFavoritesStore.getState().clear();
  useCartStore.getState().clear();
  useBattleStore.getState().clear();
  usePreferencesStore.getState().reset();

  await Promise.all([
    historyRepo.clear(),
    favoritesRepo.clear(),
    cartRepo.clear(),
    battleRepo.clear(),
    productCacheRepo.clear(),
    preferencesRepo.clear(),
    onboardingRepo.clear()
  ]);

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
