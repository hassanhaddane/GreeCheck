"use client";
/**
 * Local-data management — privacy-first.
 *
 * Everything GreeCheck stores lives ON THE DEVICE (IndexedDB behind the
 * repositories + theme/locale hints in localStorage). These helpers let the
 * user wipe any part of it. Nothing is ever sent to a server.
 */
import {
  historyRepo, favoritesRepo, cartRepo, productCacheRepo, preferencesRepo, clearLocalDatabase
} from "./repositories";
import { useHistoryStore } from "@/domains/library/history-store";
import { useFavoritesStore } from "@/domains/library/favorites-store";
import { useCartStore } from "@/domains/cart/store";
import { useBattleStore } from "@/domains/battle/store";
import { bootLocalData } from "./boot";
import { useShoppingListStore } from "@/domains/list/store";
import { useOnboardingStore } from "@/domains/criteria/onboarding-store";
import { defaultPreferences, usePreferencesStore } from "@/domains/criteria/store";

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
  await Promise.all([productCacheRepo.clear(), clearRuntimeCaches()]);
}

/** Reset "Mes critères" back to the neutral defaults. */
export async function clearPreferences() {
  usePreferencesStore.getState().reset();
  await preferencesRepo.clear();
}

/** Drop navigation and image copies while preserving the installed public shell. */
async function clearRuntimeCaches() {
  if (typeof caches === "undefined") return;
  const names = await caches.keys();
  await Promise.all(names.filter((name) => /^gc-v\d+(?:-[a-z0-9]+)?-runtime$/.test(name))
    .map((name) => caches.delete(name)));
}

export async function resetApp() {
  await bootLocalData();
  await clearLocalDatabase();
  await clearRuntimeCaches();

  useHistoryStore.getState().hydrate([]);
  useFavoritesStore.getState().hydrate([]);
  useCartStore.getState().hydrate([]);
  useBattleStore.getState().hydrate([]);
  usePreferencesStore.getState().hydrate(defaultPreferences);
  useOnboardingStore.getState().hydrate({ seen: false, completedAt: undefined });
  useShoppingListStore.setState({ items: [], hydrated: true });

  if (typeof window !== "undefined") {
    try {
      Object.keys(localStorage)
        .filter((key) => key.startsWith("greecheck"))
        .forEach((key) => localStorage.removeItem(key));
      sessionStorage.removeItem("gc.cacheRecovery");
      document.cookie = "NEXT_LOCALE=; Max-Age=0; Path=/; SameSite=Lax";
    } catch {
      // The browser can disable access to optional storage.
    }
  }
}
