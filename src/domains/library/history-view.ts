/**
 * "Mes scans" — pure, deterministic filtering & sorting over local history.
 * No React, no I/O: testable in isolation. Default order is newest-first.
 */
import type { ScanHistoryItem } from "@/domains/library/model";

export type DatePreset = "all" | "today" | "week" | "month";
export type QualityPreset = "all" | "good" | "poor";

export interface HistoryFilters {
  date: DatePreset;
  quality: QualityPreset;
  minScore: number;
  maxScore: number;
  category?: string;
  favoritesOnly: boolean;
  organicOnly: boolean;
  alertsOnly: boolean;
}

export const DEFAULT_FILTERS: HistoryFilters = {
  date: "all",
  quality: "all",
  minScore: 0,
  maxScore: 100,
  category: undefined,
  favoritesOnly: false,
  organicOnly: false,
  alertsOnly: false
};

const DAY = 24 * 60 * 60 * 1000;
/** Good ≥ 65, Poor < 50 (aligned with the GreeScore grade bands). */
export const GOOD_THRESHOLD = 65;
export const POOR_THRESHOLD = 50;

function withinDate(item: ScanHistoryItem, preset: DatePreset, now: number): boolean {
  if (preset === "all") return true;
  const span = preset === "today" ? DAY : preset === "week" ? 7 * DAY : 30 * DAY;
  return now - item.scannedAt <= span;
}

/** Distinct categories present in the history (for the category filter UI). */
export function historyCategories(entries: ScanHistoryItem[]): string[] {
  return [...new Set(entries.map((e) => e.category).filter((c): c is string => Boolean(c)))].sort();
}

/**
 * Apply filters then sort newest-first. Pure: the input array is never mutated.
 * `now` is injectable for deterministic date-window tests.
 */
export function filterHistory(
  entries: ScanHistoryItem[],
  filters: HistoryFilters,
  isFavorite: (barcode: string) => boolean,
  now: number = Date.now()
): ScanHistoryItem[] {
  const out = entries.filter((e) => {
    if (!withinDate(e, filters.date, now)) return false;
    if (filters.quality === "good" && e.score < GOOD_THRESHOLD) return false;
    if (filters.quality === "poor" && e.score >= POOR_THRESHOLD) return false;
    if (e.score < filters.minScore || e.score > filters.maxScore) return false;
    if (filters.category && e.category !== filters.category) return false;
    if (filters.favoritesOnly && !isFavorite(e.barcode)) return false;
    if (filters.organicOnly && !e.isBio) return false;
    if (filters.alertsOnly && !e.critical) return false;
    return true;
  });
  return out.sort((a, b) => b.scannedAt - a.scannedAt);
}

/** Group entries by calendar day (for the timeline view). Newest day first. */
export function groupByDay(entries: ScanHistoryItem[]): { day: number; items: ScanHistoryItem[] }[] {
  const map = new Map<number, ScanHistoryItem[]>();
  for (const e of [...entries].sort((a, b) => b.scannedAt - a.scannedAt)) {
    const d = new Date(e.scannedAt);
    const key = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    (map.get(key) ?? map.set(key, []).get(key)!).push(e);
  }
  return [...map.entries()].sort((a, b) => b[0] - a[0]).map(([day, items]) => ({ day, items }));
}
