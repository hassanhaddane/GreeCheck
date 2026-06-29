"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { LocalPreferences } from "@/types/user-preferences";

const defaults: LocalPreferences = {
  language: "fr",
  goals: [],
  avoidAllergens: [],
  preferBio: false,
  preferHalal: false,
  preferVegan: false,
  preferVegetarian: false,
  reduceSugar: false,
  reduceSalt: false,
  reduceAdditives: false,
  reduceUltraProcessed: false,
  increaseProtein: false,
  increaseFiber: false
};

interface PreferencesState extends LocalPreferences {
  setPreferences: (p: Partial<LocalPreferences>) => void;
  toggleGoal: (goal: LocalPreferences["goals"][number]) => void;
  reset: () => void;
}

// All preferences are stored ONLY on the device (privacy-first).
export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set) => ({
      ...defaults,
      setPreferences: (p) => set(p),
      toggleGoal: (goal) =>
        set((s) => ({
          goals: s.goals.includes(goal)
            ? s.goals.filter((g) => g !== goal)
            : [...s.goals, goal]
        })),
      reset: () => set(defaults)
    }),
    { name: "greecheck.preferences" }
  )
);
