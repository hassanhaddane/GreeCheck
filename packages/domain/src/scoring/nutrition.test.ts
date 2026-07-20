import { test } from "node:test";
import assert from "node:assert/strict";
import { computeNutriScorePoints, nutritionScore100, gradeFallbackPoints } from "./nutrition";

/* ── published correspondence table (verbatim anchors) ── */

test("solid table matches the published correspondence values", () => {
  const anchors: Array<[number, number]> = [
    [-10, 100], [-4, 100], [-3, 100], [-2, 100], [-1, 90], [0, 80], [1, 75],
    [2, 70], [3, 65], [6, 50], [10, 30], [11, 15], [14, 9], [18, 1],
    [19, 0], [25, 0], [40, 0]
  ];
  for (const [pts, expected] of anchors) {
    assert.equal(nutritionScore100(pts, "solid", false), expected, `solid ${pts} pts`);
  }
});

test("liquid table matches the published correspondence values", () => {
  const anchors: Array<[number, number]> = [
    [-10, 80], [-4, 80], [-3, 77], [-2, 74], [-1, 71], [0, 68], [1, 65],
    [2, 57], [3, 49], [4, 41], [5, 33], [6, 15], [7, 11], [8, 7], [9, 3],
    [10, 0], [15, 0], [40, 0]
  ];
  for (const [pts, expected] of anchors) {
    assert.equal(nutritionScore100(pts, "beverage", false), expected, `liquid ${pts} pts`);
  }
});

test("only water reaches 100 among beverages; non-water liquid max is 80", () => {
  assert.equal(nutritionScore100(-10, "beverage", true), 100);
  assert.equal(nutritionScore100(-10, "beverage", false), 80);
});

test("tables are monotonically non-increasing (no threshold inversion)", () => {
  for (const kind of ["solid", "beverage"] as const) {
    let prev = Infinity;
    for (let p = -6; p <= 30; p++) {
      const v = nutritionScore100(p, kind, false);
      assert.ok(v <= prev, `${kind} ${p}: ${v} > ${prev}`);
      prev = v;
    }
  }
});

test("solid D grade never exceeds 15/100 ⇒ D/E products cap below 50 overall", () => {
  for (let p = 11; p <= 18; p++) assert.ok(nutritionScore100(p, "solid", false) <= 15);
});

/* ── original (2017) Nutri-Score points ── */

test("computed points: known solid example (sweetened cereal profile)", () => {
  // energy 400 kcal → 1673.6 kJ → 4 pts · sugars 25 → 5 · satFat 2 → 1 ·
  // salt 0.6 → sodium 240 mg → 2 ⇒ N=12 · fiber 5 → 5 · protein 8 → 4 (NOT
  // counted, N≥11) ⇒ total 12 − 5 = 7
  const r = computeNutriScorePoints(
    { energyKcal: 400, sugars: 25, saturatedFat: 2, salt: 0.6, fiber: 5, proteins: 8 },
    "solid"
  );
  assert.ok(r.ok);
  assert.equal(r.value.points, 7);
});

test("protein counted when negative points < 11", () => {
  // energy 100 kcal → 418.4 kJ → 1 · sugars 2 → 0 · satFat 0.5 → 0 ·
  // salt 0.1 → 40 mg → 0 ⇒ N=1 · fiber 3 → 3 · protein 8 → 4 ⇒ 1−7 = −6
  const r = computeNutriScorePoints(
    { energyKcal: 100, sugars: 2, saturatedFat: 0.5, salt: 0.1, fiber: 3, proteins: 8 },
    "solid"
  );
  assert.ok(r.ok);
  assert.equal(r.value.points, -6);
});

test("beverage thresholds are stricter: same sugars, higher points", () => {
  const n = { energyKcal: 40, sugars: 9, saturatedFat: 0, salt: 0 };
  const solid = computeNutriScorePoints(n, "solid");
  const bev = computeNutriScorePoints(n, "beverage");
  assert.ok(solid.ok && bev.ok);
  assert.ok(bev.value.points > solid.value.points);
  // sugars 9 → beverage 7 pts (thresholds 0,1.5,…,13.5) vs solid 1 pt (>4.5)
});

test("missing required fact ⇒ typed failure listing the missing fields", () => {
  const r = computeNutriScorePoints({ energyKcal: 100, sugars: 5 } as never, "solid");
  assert.ok(!r.ok);
  assert.deepEqual(r.missing.sort(), ["salt", "saturatedFat"].sort());
});

test("unknown fiber/protein count as ZERO and are reported (never a bonus)", () => {
  const r = computeNutriScorePoints({ energyKcal: 100, sugars: 2, saturatedFat: 0.5, salt: 0.1 }, "solid");
  assert.ok(r.ok);
  assert.ok(r.value.conservativeZeros.includes("fiber"));
  assert.ok(r.value.conservativeZeros.includes("proteins"));
  assert.ok(r.value.conservativeZeros.includes("fruitsVegetables"));
});

test("grade fallback points land inside the correct published band", () => {
  // solid bands: A ≤ −1 · B 0–2 · C 3–10 · D 11–18 · E ≥ 19
  assert.ok(gradeFallbackPoints("a", "solid") <= -1);
  assert.ok(gradeFallbackPoints("b", "solid") >= 0 && gradeFallbackPoints("b", "solid") <= 2);
  assert.ok(gradeFallbackPoints("c", "solid") >= 3 && gradeFallbackPoints("c", "solid") <= 10);
  assert.ok(gradeFallbackPoints("d", "solid") >= 11 && gradeFallbackPoints("d", "solid") <= 18);
  assert.ok(gradeFallbackPoints("e", "solid") >= 19);
});

test("determinism: identical input, identical output", () => {
  const n = { energyKcal: 250, sugars: 12, saturatedFat: 3, salt: 0.8, fiber: 2, proteins: 6 };
  assert.deepEqual(computeNutriScorePoints(n, "solid"), computeNutriScorePoints(n, "solid"));
});
