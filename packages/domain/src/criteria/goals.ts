/** Boolean preference criteria shown in "Mes critères". */
export const PREF_KEYS = [
  "preferBio", "preferHalal", "preferVegan", "preferVegetarian",
  "reduceSugar", "reduceSalt", "reduceAdditives", "reduceUltraProcessed",
  "increaseProtein", "increaseFiber"
] as const;

export type PrefKey = (typeof PREF_KEYS)[number];
