import { test } from "node:test";
import assert from "node:assert/strict";
import { computeGreeImpact } from "./engine";

test("valid Green-Score grade yields a valid, deterministic impact", () => {
  const r = computeGreeImpact({ greenScore: "b" });
  assert.equal(r.status, "valid");
  assert.equal(r.grade, "b");
  assert.equal(r.score, 80);
  assert.equal(r.labelCode, "impact_label_moderate");
  assert.deepEqual(r.reasons[0], {
    code: "impact_grade_source_green_score",
    params: { grade: "b" }
  });
  // determinism
  assert.deepEqual(r, computeGreeImpact({ greenScore: "b" }));
});

test("missing data is unavailable — never a default grade, never negative", () => {
  const r = computeGreeImpact({ greenScore: undefined });
  assert.equal(r.status, "unavailable");
  assert.equal(r.grade, undefined);
  assert.equal(r.score, undefined);
  assert.equal(r.labelCode, "impact_label_unavailable");
  assert.deepEqual(r.reasons, [{ code: "impact_no_data" }]);
});

test("grade extremes map to the shared base scale", () => {
  assert.equal(computeGreeImpact({ greenScore: "a" }).score, 95);
  assert.equal(computeGreeImpact({ greenScore: "e" }).score, 15);
  assert.equal(computeGreeImpact({ greenScore: "e" }).labelCode, "impact_label_very_high");
});
