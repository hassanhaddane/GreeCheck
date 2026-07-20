/**
 * @greecheck/domain — public surface.
 *
 * Pure, deterministic domain core. Forbidden dependencies (enforced by
 * purity.test.ts and tsconfig lib=ES2022): React, Next.js, browser globals,
 * IndexedDB, UI translations, network APIs.
 */

/* product */
export * from "./product/model";
export * from "./product/normalizer";

/* health score */
export * from "./scoring/types";
export { computeGreeScore, additiveSeverityOf } from "./scoring/gree-score";
export { NUTRITION_THRESHOLDS, clamp, round, nutriRank } from "./scoring/thresholds";
export { halalStatusOf } from "./scoring/detectors";

/* environmental impact (separate from health) */
export * from "./impact/types";
export { computeGreeImpact } from "./impact/engine";

/* user criteria & compatibility */
export * from "./criteria/model";
export * from "./criteria/goals";

/* engines */
export * from "./swap/engine";
export * from "./battle/model";
export * from "./battle/engine";
export * from "./cart/model";
export * from "./cart/engine";
export * from "./cart/what-if";
