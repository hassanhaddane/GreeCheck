/**
 * Goal compliance — pure rules mapping each user goal to a per-product
 * predicate, then aggregating over a set of products (shopping list, basket).
 * A goal counts as "respected" when ≥ 60% of assessable products match.
 * No AI: transparent thresholds shared with the scoring engine.
 */
import type { Product } from "@/types/product";
import type { GreeScore } from "@/types/scoring";
import type { UserGoal } from "@/types/user-preferences";
import { NUTRITION_THRESHOLDS as T } from "@/lib/nutrition/thresholds";

type Entry = { product: Product; gree: GreeScore };

/** True / false when assessable, null when the product lacks the data. */
const GOAL_RULES: Record<UserGoal, (e: Entry) => boolean | null> = {
  eat_healthier: (e) => e.gree.global >= 65,
  go_organic: (e) => !!e.product.isBio,
  reduce_sugar: (e) => (e.product.nutriments.sugars === undefined ? null : e.product.nutriments.sugars <= T.sugarHigh),
  reduce_salt: (e) => (e.product.nutriments.salt === undefined ? null : e.product.nutriments.salt <= T.saltHigh),
  reduce_additives: (e) => (e.product.additives === undefined ? null : e.product.additives.length <= 1),
  avoid_ultraprocessed: (e) => (e.product.novaGroup === undefined ? null : e.product.novaGroup <= 3),
  build_muscle: (e) => (e.product.nutriments.proteins === undefined ? null : e.product.nutriments.proteins >= T.proteinOk),
  lose_weight: (e) => (e.product.nutriments.energyKcal === undefined ? null : e.product.nutriments.energyKcal <= T.kcalHigh),
  halal: (e) => !!e.product.isHalal,
  vegetarian: (e) => !!(e.product.isVegetarian || e.product.isVegan),
  vegan: (e) => !!e.product.isVegan,
  high_fiber: (e) => (e.product.nutriments.fiber === undefined ? null : e.product.nutriments.fiber >= T.fiberOk),
  high_protein: (e) => (e.product.nutriments.proteins === undefined ? null : e.product.nutriments.proteins >= T.proteinOk),
  low_calorie: (e) => (e.product.nutriments.energyKcal === undefined ? null : e.product.nutriments.energyKcal <= T.kcalMid),
  better_digestion: (e) => (e.product.nutriments.fiber === undefined ? null : e.product.nutriments.fiber >= T.fiberOk)
};

export interface GoalCompliance {
  goal: UserGoal;
  matched: number;
  assessable: number;
  /** 0–1 share of assessable products matching the goal. */
  ratio: number;
  respected: boolean;
}

/** Evaluate every active goal against a set of scored products. */
export function assessGoalCompliance(goals: UserGoal[], entries: Entry[]): GoalCompliance[] {
  return goals.map((goal) => {
    const rule = GOAL_RULES[goal];
    let matched = 0;
    let assessable = 0;
    for (const e of entries) {
      const r = rule(e);
      if (r === null) continue;
      assessable++;
      if (r) matched++;
    }
    const ratio = assessable ? matched / assessable : 0;
    return { goal, matched, assessable, ratio, respected: assessable > 0 && ratio >= 0.6 };
  });
}
