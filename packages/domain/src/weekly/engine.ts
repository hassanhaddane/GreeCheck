/**
 * Weekly progress — computed LOCALLY from the user's scan history and their
 * local replacement log. Pure and deterministic.
 *
 * Framing rule (constitution: no shaming): this measures PROGRESS, never
 * failure. Metrics that lack data return `available: false` — the UI shows an
 * encouraging "keep scanning" state, never a red mark against the user. A
 * negative delta is reported factually and gently, never as a penalty.
 */

export type WeeklyGrade = "a" | "b" | "c" | "d" | "e";

/** Minimal shape the engine needs from a local history row (all optional
 *  fields degrade gracefully when older rows lack them). */
export interface WeeklyScan {
  scannedAt: number;
  score: number;
  /** Sugars per 100 g at scan time, when captured. */
  sugars?: number;
  /** Count of high/moderate-risk additives at scan time, when captured. */
  riskyAdditives?: number;
  /** Environmental grade at scan time, when captured. */
  envGrade?: WeeklyGrade;
}

/** One logged replacement of a product with a better-scoring alternative. */
export interface WeeklyReplacement {
  at: number;
  fromScore: number;
  toScore: number;
}

export interface WeeklyMetric {
  available: boolean;
  current?: number;
  previous?: number;
  /** current − previous (present when both weeks have data). */
  delta?: number;
}

export interface WeeklyProgress {
  weekScanCount: number;
  /** Average GreeScore this week vs last week. */
  averageScore: WeeklyMetric;
  /** Average sugar/100 g — a DROP is an improvement. */
  sugar: WeeklyMetric;
  /** Avoided high/moderate-risk additives: fewer risky additives per scan is better. */
  riskyAdditives: WeeklyMetric;
  /** Average environmental grade rank (0=a … 4=e) — a drop is an improvement. */
  environment: WeeklyMetric;
  /** Products replaced with a better alternative this week, and total points gained. */
  replacements: { count: number; pointsGained: number };
}

const WEEK_MS = 7 * 24 * 3600 * 1000;
const gradeRank: Record<WeeklyGrade, number> = { a: 0, b: 1, c: 2, d: 3, e: 4 };

const mean = (xs: number[]): number | undefined =>
  xs.length ? Math.round((xs.reduce((s, x) => s + x, 0) / xs.length) * 10) / 10 : undefined;

function metric(current?: number, previous?: number): WeeklyMetric {
  if (current === undefined) return { available: false };
  return {
    available: true,
    current,
    previous,
    delta: previous === undefined ? undefined : Math.round((current - previous) * 10) / 10
  };
}

export function computeWeeklyProgress(
  scans: WeeklyScan[],
  replacements: WeeklyReplacement[] = [],
  now = Date.now()
): WeeklyProgress {
  const thisWeek = scans.filter((s) => now - s.scannedAt < WEEK_MS);
  const lastWeek = scans.filter((s) => now - s.scannedAt >= WEEK_MS && now - s.scannedAt < 2 * WEEK_MS);

  const avg = (list: WeeklyScan[], pick: (s: WeeklyScan) => number | undefined) =>
    mean(list.map(pick).filter((v): v is number => v !== undefined));

  const envAvg = (list: WeeklyScan[]) =>
    mean(list.map((s) => (s.envGrade ? gradeRank[s.envGrade] : undefined)).filter((v): v is number => v !== undefined));

  const repThisWeek = replacements.filter((r) => now - r.at < WEEK_MS);

  return {
    weekScanCount: thisWeek.length,
    averageScore: metric(avg(thisWeek, (s) => s.score), avg(lastWeek, (s) => s.score)),
    sugar: metric(avg(thisWeek, (s) => s.sugars), avg(lastWeek, (s) => s.sugars)),
    riskyAdditives: metric(avg(thisWeek, (s) => s.riskyAdditives), avg(lastWeek, (s) => s.riskyAdditives)),
    environment: metric(envAvg(thisWeek), envAvg(lastWeek)),
    replacements: {
      count: repThisWeek.length,
      pointsGained: repThisWeek.reduce((s, r) => s + Math.max(0, r.toScore - r.fromScore), 0)
    }
  };
}
