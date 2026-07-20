"use client";
/**
 * "Mes critères" — user preferences, in-memory mirror of the IndexedDB
 * preferences repository. Criteria influence alerts, ranking, alternatives
 * and GreeCart — never the base health score.
 */
import { create } from "zustand";
import type { LocalPreferences } from "@greecheck/domain/criteria/model";
import { defaultPreferences } from "@greecheck/domain/criteria/model";

export { defaultPreferences };
import { preferencesRepo } from "@/services/storage/repositories";


interface PreferencesState extends LocalPreferences {
  hydrate: (p: LocalPreferences) => void;
  setPreferences: (p: Partial<LocalPreferences>) => void;
  toggleGoal: (goal: LocalPreferences["goals"][number]) => void;
  reset: () => void;
}

/** Extract only the persistable preference fields from the store state. */
function snapshot(s: PreferencesState): LocalPreferences {
  const { language, goals, avoidAllergens, preferBio, preferHalal, preferVegan, preferVegetarian,
    reduceSugar, reduceSalt, reduceAdditives, reduceUltraProcessed, increaseProtein, increaseFiber } = s;
  return { language, goals, avoidAllergens, preferBio, preferHalal, preferVegan, preferVegetarian,
    reduceSugar, reduceSalt, reduceAdditives, reduceUltraProcessed, increaseProtein, increaseFiber };
}

export const usePreferencesStore = create<PreferencesState>()((set, get) => ({
  ...defaultPreferences,
  hydrate: (p) => set({ ...defaultPreferences, ...p }),
  setPreferences: (p) => {
    set(p);
    void preferencesRepo.set(snapshot(get()));
  },
  toggleGoal: (goal) => {
    set((s) => ({
      goals: s.goals.includes(goal)
        ? s.goals.filter((g) => g !== goal)
        : [...s.goals, goal]
    }));
    void preferencesRepo.set(snapshot(get()));
  },
  reset: () => {
    set(defaultPreferences);
    void preferencesRepo.clear();
  }
}));
