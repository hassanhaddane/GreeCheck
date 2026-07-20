/** Duplicate-scan cooldown gate + camera permission classification. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { createScanGate, DEFAULT_SCAN_COOLDOWN_MS } from "./scan-gate";
import { classifyCameraError } from "@/hooks/use-barcode-scanner";

/* ── duplicate-scan cooldown ── */

test("first detection resolves; immediate re-detection is blocked", () => {
  const gate = createScanGate();
  assert.ok(gate.shouldResolve("3017620422003", 1000));
  assert.ok(!gate.shouldResolve("3017620422003", 1400));
  assert.ok(gate.isCoolingDown("3017620422003", 1400));
});

test("the same code resolves again AFTER the cooldown window", () => {
  const gate = createScanGate(6000);
  assert.ok(gate.shouldResolve("96385074", 0));
  assert.ok(!gate.shouldResolve("96385074", 5999));
  assert.ok(gate.shouldResolve("96385074", 6001));
});

test("different codes are independent (rapid-scan session)", () => {
  const gate = createScanGate();
  assert.ok(gate.shouldResolve("3017620422003", 0));
  assert.ok(gate.shouldResolve("96385074", 10));
  assert.ok(gate.shouldResolve("036000291452", 20));
});

test("release() reopens a code instantly (failed resolution retry path)", () => {
  const gate = createScanGate();
  assert.ok(gate.shouldResolve("3017620422003", 0));
  gate.release("3017620422003");
  assert.ok(gate.shouldResolve("3017620422003", 100));
});

test("reset() clears the whole session; default window is sane", () => {
  const gate = createScanGate();
  gate.shouldResolve("a", 0);
  gate.reset();
  assert.ok(gate.shouldResolve("a", 1));
  assert.ok(DEFAULT_SCAN_COOLDOWN_MS >= 2000 && DEFAULT_SCAN_COOLDOWN_MS <= 15000);
});

/* ── camera permission / error classification ── */

const err = (name: string) => Object.assign(new DOMException("", name), {});

test("permission and hardware errors map to explicit, recoverable states", () => {
  assert.equal(classifyCameraError(err("NotAllowedError")), "denied");
  assert.equal(classifyCameraError(err("SecurityError")), "denied");
  assert.equal(classifyCameraError(err("NotFoundError")), "no-camera");
  assert.equal(classifyCameraError(err("OverconstrainedError")), "no-camera");
  assert.equal(classifyCameraError(err("NotReadableError")), "in-use");
  assert.equal(classifyCameraError(err("AbortError")), "in-use");
  assert.equal(classifyCameraError(err("NotSupportedError")), "unsupported");
  assert.equal(classifyCameraError(new Error("anything else")), "error");
  assert.equal(classifyCameraError(undefined), "error");
});
