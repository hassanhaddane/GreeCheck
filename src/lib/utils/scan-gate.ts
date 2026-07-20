/**
 * Duplicate-scan gate — a small pure cooldown state machine.
 *
 * Rapid-scan sessions keep the camera live: the same barcode is redetected
 * many times per second, and shoppers legitimately re-scan the same product
 * a bit later (price check, second look). A TIME-based cooldown handles both:
 * a code is resolved at most once per window; after the window it may resolve
 * again. Fully unit-tested in scan-gate.test.ts.
 */

export interface ScanGate {
  /** True when this code should be resolved now (and marks it as seen). */
  shouldResolve(code: string, now?: number): boolean;
  /** True when the code is currently inside its cooldown window (no marking). */
  isCoolingDown(code: string, now?: number): boolean;
  /** Forget one code (e.g. after a failed resolution, to allow instant retry). */
  release(code: string): void;
  /** Forget everything (new session). */
  reset(): void;
}

export const DEFAULT_SCAN_COOLDOWN_MS = 6000;

export function createScanGate(cooldownMs: number = DEFAULT_SCAN_COOLDOWN_MS): ScanGate {
  const seenAt = new Map<string, number>();
  return {
    shouldResolve(code, now = Date.now()) {
      const t = seenAt.get(code);
      if (t !== undefined && now - t < cooldownMs) return false;
      seenAt.set(code, now);
      return true;
    },
    isCoolingDown(code, now = Date.now()) {
      const t = seenAt.get(code);
      return t !== undefined && now - t < cooldownMs;
    },
    release(code) {
      seenAt.delete(code);
    },
    reset() {
      seenAt.clear();
    }
  };
}
