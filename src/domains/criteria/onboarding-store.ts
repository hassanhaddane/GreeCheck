"use client";
/**
 * Onboarding state — optional and never blocking (V2 rule).
 * Mirrors the IndexedDB kv row; used by future onboarding surfaces.
 */
import { create } from "zustand";
import { onboardingRepo, type OnboardingState } from "@/services/storage/repositories";

interface OnboardingStoreState extends OnboardingState {
  hydrate: (s: OnboardingState) => void;
  markSeen: () => void;
}

export const useOnboardingStore = create<OnboardingStoreState>()((set) => ({
  seen: false,
  hydrate: (s) => set(s),
  markSeen: () => {
    const state: OnboardingState = { seen: true, completedAt: Date.now() };
    set(state);
    void onboardingRepo.set(state);
  }
}));
