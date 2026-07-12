/** Mes scans — pure filtering & sorting. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { filterHistory, groupByDay, historyCategories, DEFAULT_FILTERS, type HistoryFilters } from "./history-view";
import type { ScanHistoryItem } from "./model";

const NOW = 1_000_000_000_000;
const DAY = 24 * 60 * 60 * 1000;
function item(o: Partial<ScanHistoryItem> = {}): ScanHistoryItem {
  return { barcode: Math.random().toString().slice(2, 10), name: "P", score: 70, verdict: "ok", scannedAt: NOW, ...o };
}
const noFav = () => false;
const F = (o: Partial<HistoryFilters> = {}): HistoryFilters => ({ ...DEFAULT_FILTERS, ...o });

test("default: newest first, nothing filtered out", () => {
  const a = item({ barcode: "a", scannedAt: NOW - 2 * DAY });
  const b = item({ barcode: "b", scannedAt: NOW });
  const c = item({ barcode: "c", scannedAt: NOW - DAY });
  const out = filterHistory([a, b, c], DEFAULT_FILTERS, noFav, NOW);
  assert.deepEqual(out.map((e) => e.barcode), ["b", "c", "a"]);
});

test("date window filters older entries", () => {
  const recent = item({ barcode: "r", scannedAt: NOW - 2 * DAY });
  const old = item({ barcode: "o", scannedAt: NOW - 40 * DAY });
  const week = filterHistory([recent, old], F({ date: "week" }), noFav, NOW);
  assert.deepEqual(week.map((e) => e.barcode), ["r"]);
  const month = filterHistory([recent, old], F({ date: "month" }), noFav, NOW);
  assert.deepEqual(month.map((e) => e.barcode), ["r"]);
});

test("good / poor quality presets", () => {
  const good = item({ barcode: "g", score: 80 });
  const mid = item({ barcode: "m", score: 55 });
  const poor = item({ barcode: "p", score: 30 });
  assert.deepEqual(filterHistory([good, mid, poor], F({ quality: "good" }), noFav, NOW).map((e) => e.barcode), ["g"]);
  assert.deepEqual(filterHistory([good, mid, poor], F({ quality: "poor" }), noFav, NOW).map((e) => e.barcode), ["p"]);
});

test("score range, category, organic, alerts, favorites", () => {
  const entries = [
    item({ barcode: "x", score: 90, category: "cereals", isBio: true, critical: false }),
    item({ barcode: "y", score: 40, category: "sodas", isBio: false, critical: true }),
    item({ barcode: "z", score: 65, category: "cereals", isBio: false, critical: false })
  ];
  assert.deepEqual(filterHistory(entries, F({ minScore: 60, maxScore: 100 }), noFav, NOW).map((e) => e.barcode), ["x", "z"]);
  assert.deepEqual(filterHistory(entries, F({ category: "cereals" }), noFav, NOW).map((e) => e.barcode), ["x", "z"]);
  assert.deepEqual(filterHistory(entries, F({ organicOnly: true }), noFav, NOW).map((e) => e.barcode), ["x"]);
  assert.deepEqual(filterHistory(entries, F({ alertsOnly: true }), noFav, NOW).map((e) => e.barcode), ["y"]);
  const favs = new Set(["z"]);
  assert.deepEqual(filterHistory(entries, F({ favoritesOnly: true }), (b) => favs.has(b), NOW).map((e) => e.barcode), ["z"]);
});

test("historyCategories returns sorted distinct categories", () => {
  const entries = [item({ category: "sodas" }), item({ category: "cereals" }), item({ category: "sodas" }), item({})];
  assert.deepEqual(historyCategories(entries), ["cereals", "sodas"]);
});

test("groupByDay buckets by calendar day, newest day first", () => {
  const d1 = item({ barcode: "d1", scannedAt: NOW });
  const d1b = item({ barcode: "d1b", scannedAt: NOW - 60_000 });
  const d2 = item({ barcode: "d2", scannedAt: NOW - 2 * DAY });
  const groups = groupByDay([d2, d1, d1b]);
  assert.equal(groups.length, 2);
  assert.equal(groups[0].items.length, 2);
  assert.equal(groups[1].items[0].barcode, "d2");
});

test("filtering never mutates the input", () => {
  const entries = [item({ scannedAt: NOW - DAY }), item({ scannedAt: NOW })];
  const copy = [...entries];
  filterHistory(entries, DEFAULT_FILTERS, noFav, NOW);
  assert.deepEqual(entries, copy);
});
