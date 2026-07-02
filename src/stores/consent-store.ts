"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";

export type AdMode = "non_personalized" | "personalized";

interface ConsentState {
  decided: boolean;
  adMode: AdMode; // default is privacy-first: non-personalized
  setMode: (m: AdMode) => void;
  reset: () => void;
}

// Ad-consent choice, stored ONLY on the device. GreeCheck never runs internal
// user tracking; personalized ads (if the user opts in) would be handled by an
// external ad SDK under this consent — never by profiling inside GreeCheck.
export const useConsentStore = create<ConsentState>()(
  persist(
    (set) => ({
      decided: false,
      adMode: "non_personalized",
      setMode: (m) => set({ adMode: m, decided: true }),
      reset: () => set({ decided: false, adMode: "non_personalized" })
    }),
    { name: "greecheck.consent" }
  )
);
