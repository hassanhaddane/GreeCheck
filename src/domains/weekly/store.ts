"use client";
/**
 * Weekly progress — reads the LOCAL scan history and replacement log and
 * derives progress metrics with the pure domain engine. No account, no server,
 * no analytics; everything stays on the device.
 */
import { useEffect, useState } from "react";
import { computeWeeklyProgress, type WeeklyProgress, type WeeklyScan, type WeeklyReplacement } from "@greecheck/domain/weekly/engine";
import { useHistoryStore } from "@/domains/library/history-store";
import { replacementsRepo } from "@/services/storage/repositories";

/** Log a better-alternative replacement (called when the user swaps in GreeCart). */
export function logReplacement(fromScore: number, toScore: number): void {
  if (toScore <= fromScore) return; // only "better" swaps count
  void replacementsRepo.log({ at: Date.now(), fromScore, toScore });
}

/** Hook returning the locally-computed weekly progress (stable reference time). */
export function useWeeklyProgress(): WeeklyProgress {
  const entries = useHistoryStore((s) => s.entries);
  const [reps, setReps] = useState<WeeklyReplacement[]>([]);
  const [now] = useState(() => Date.now());

  useEffect(() => {
    void replacementsRepo.all().then((all) => setReps(all.map((r) => ({ at: r.at, fromScore: r.fromScore, toScore: r.toScore }))));
  }, []);

  const scans: WeeklyScan[] = entries.map((e) => ({
    scannedAt: e.scannedAt,
    score: e.score,
    sugars: e.sugars,
    riskyAdditives: e.riskyAdditives,
    envGrade: e.envGrade as WeeklyScan["envGrade"]
  }));

  return computeWeeklyProgress(scans, reps, now);
}
