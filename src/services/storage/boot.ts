"use client";
/**
 * Local-data boot sequence:
 *   1. one-time migration of V1 localStorage keys → IndexedDB (migrate-legacy),
 *   2. hydration of every feature store from its repository.
 *
 * Runs once per app load (client only) via <LocalDataBoot /> in the layout.
 * NEVER throws: a broken IndexedDB must not crash the app — the stores simply
 * keep their empty defaults and the UI shows its normal empty states.
 */
import { migrateLegacyLocalStorage } from "./migrate-legacy";
import {
  historyRepo, favoritesRepo, cartRepo, battleRepo,
  preferencesRepo, onboardingRepo
} from "./repositories";
import { useHistoryStore } from "@/domains/library/history-store";
import { useFavoritesStore } from "@/domains/library/favorites-store";
import { useCartStore } from "@/domains/cart/store";
import { useBattleStore } from "@/domains/battle/store";
import { usePreferencesStore } from "@/domains/criteria/store";
import { useOnboardingStore } from "@/domains/criteria/onboarding-store";

let booted = false;

function mergeByBarcode<T extends { barcode: string }>(current: T[], persisted: T[]): T[] {
  const seen = new Set(current.map((item) => item.barcode));
  return [...current, ...persisted.filter((item) => !seen.has(item.barcode))];
}

/** Test-only escape hatch (module state persists across app loads in tests). */
export function __resetBootForTests() {
  booted = false;
}

/** Idempotent: migration + store hydration. Called from <LocalDataBoot />. */
export async function bootLocalData(): Promise<void> {
  if (booted || typeof window === "undefined") return;
  booted = true;

  try {
    await migrateLegacyLocalStorage(); // never throws; "failed" retries next boot

    const [history, favorites, cart, battle, prefs, onboarding] = await Promise.all([
      historyRepo.all(),
      favoritesRepo.all(),
      cartRepo.all(),
      battleRepo.all(),
      preferencesRepo.get(),
      onboardingRepo.get()
    ]);

    // Reads can finish after an eager first user action. Merge instead of
    // replacing so a scan/favorite/cart/Battle action can never disappear.
    const currentHistory = useHistoryStore.getState().entries;
    const currentFavorites = useFavoritesStore.getState().items;
    const currentCart = useCartStore.getState().items;
    const currentBattle = useBattleStore.getState().items;
    useHistoryStore.getState().hydrate(mergeByBarcode(currentHistory, history));
    useFavoritesStore.getState().hydrate(mergeByBarcode(currentFavorites, favorites));
    useCartStore.getState().hydrate(mergeByBarcode(
      currentCart.map((item) => ({ ...item, barcode: item.product.barcode })),
      cart.map((item) => ({ ...item, barcode: item.product.barcode }))
    ).map(({ barcode: _barcode, ...item }) => item));
    useBattleStore.getState().hydrate(mergeByBarcode(currentBattle, battle.map((b) => b.product)));
    if (prefs) usePreferencesStore.getState().hydrate(prefs);
    if (onboarding) useOnboardingStore.getState().hydrate(onboarding);
  } catch {
    // Graceful degradation: no persistence, app still fully usable in-memory.
  }
}
