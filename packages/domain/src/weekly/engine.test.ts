/** Weekly progress — local, non-shaming progress metrics. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { computeWeeklyProgress, type WeeklyScan, type WeeklyReplacement } from "./engine";

const NOW = 1_000 * 24 * 3600 * 1000; // fixed reference
const DAY = 24 * 3600 * 1000;
const thisWeek = (d: number) => NOW - d * DAY;
const lastWeek = (d: number) => NOW - (7 + d) * DAY;

test("counts this week's scans and averages the GreeScore vs last week", () => {
  const scans: WeeklyScan[] = [
    { scannedAt: thisWeek(1), score: 80 },
    { scannedAt: thisWeek(2), score: 60 },
    { scannedAt: lastWeek(1), score: 50 }
  ];
  const w = computeWeeklyProgress(scans, [], NOW);
  assert.equal(w.weekScanCount, 2);
  assert.equal(w.averageScore.current, 70);
  assert.equal(w.averageScore.previous, 50);
  assert.equal(w.averageScore.delta, 20);
});

test("sugar improvement = a DROP week-over-week", () => {
  const scans: WeeklyScan[] = [
    { scannedAt: thisWeek(1), score: 70, sugars: 8 },
    { scannedAt: lastWeek(1), score: 60, sugars: 18 }
  ];
  const w = computeWeeklyProgress(scans, [], NOW);
  assert.equal(w.sugar.current, 8);
  assert.equal(w.sugar.previous, 18);
  assert.equal(w.sugar.delta, -10); // negative delta = improvement (UI frames it positively)
});

test("avoided risky additives: fewer per scan this week", () => {
  const scans: WeeklyScan[] = [
    { scannedAt: thisWeek(1), score: 70, riskyAdditives: 0 },
    { scannedAt: thisWeek(2), score: 70, riskyAdditives: 1 },
    { scannedAt: lastWeek(1), score: 60, riskyAdditives: 3 }
  ];
  const w = computeWeeklyProgress(scans, [], NOW);
  assert.equal(w.riskyAdditives.current, 0.5);
  assert.equal(w.riskyAdditives.previous, 3);
});

test("environmental grade improvement (lower rank = better)", () => {
  const scans: WeeklyScan[] = [
    { scannedAt: thisWeek(1), score: 70, envGrade: "b" }, // rank 1
    { scannedAt: lastWeek(1), score: 60, envGrade: "d" }  // rank 3
  ];
  const w = computeWeeklyProgress(scans, [], NOW);
  assert.equal(w.environment.current, 1);
  assert.equal(w.environment.previous, 3);
  assert.equal(w.environment.delta, -2);
});

test("replacements this week: count + points gained (never negative)", () => {
  const reps: WeeklyReplacement[] = [
    { at: thisWeek(1), fromScore: 30, toScore: 72 },
    { at: thisWeek(2), fromScore: 50, toScore: 55 },
    { at: lastWeek(1), fromScore: 40, toScore: 80 } // last week — excluded
  ];
  const w = computeWeeklyProgress([], reps, NOW);
  assert.equal(w.replacements.count, 2);
  assert.equal(w.replacements.pointsGained, 47); // 42 + 5
});

test("metrics with no data are 'available: false' (no shaming, no invented values)", () => {
  const w = computeWeeklyProgress([{ scannedAt: thisWeek(1), score: 70 }], [], NOW);
  assert.equal(w.sugar.available, false);          // no sugar captured
  assert.equal(w.environment.available, false);    // no env grade captured
  assert.equal(w.averageScore.available, true);
  assert.equal(w.averageScore.delta, undefined);   // no previous week → no delta
});

test("determinism", () => {
  const scans: WeeklyScan[] = [{ scannedAt: thisWeek(1), score: 70, sugars: 5 }];
  assert.deepEqual(computeWeeklyProgress(scans, [], NOW), computeWeeklyProgress(scans, [], NOW));
});
