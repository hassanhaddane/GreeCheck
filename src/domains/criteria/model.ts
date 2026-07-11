export type UserGoal =
  | "eat_healthier"
  | "go_organic"
  | "reduce_sugar"
  | "reduce_salt"
  | "reduce_additives"
  | "avoid_ultraprocessed"
  | "build_muscle"
  | "lose_weight"
  | "halal"
  | "vegetarian"
  | "vegan"
  | "high_fiber"
  | "high_protein"
  | "low_calorie"
  | "better_digestion";

export interface LocalPreferences {
  language: "fr" | "en" | "ar";
  goals: UserGoal[];
  avoidAllergens: string[];
  preferBio: boolean;
  preferHalal: boolean;
  preferVegan: boolean;
  preferVegetarian: boolean;
  reduceSugar: boolean;
  reduceSalt: boolean;
  reduceAdditives: boolean;
  reduceUltraProcessed: boolean;
  increaseProtein: boolean;
  increaseFiber: boolean;
}

/** Neutral defaults — shared by the store, tests and server-side demo computations. */
export const defaultPreferences: LocalPreferences = {
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
