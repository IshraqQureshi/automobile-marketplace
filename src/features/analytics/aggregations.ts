// Pure aggregation helpers shared by every report — every report query
// fetches plain rows within a date range (see each feature's own
// analytics-queries.ts) and hands them to one of these to turn into
// chart-ready shapes. Kept pure/framework-free so they're trivially unit
// testable, matching this codebase's established convention (finance
// calculator, appointment slot math) of not burying business logic inside
// a Server Component.

import { bucketKeyFor, bucketKeysInRange, type BucketGranularity, type DateRange } from "./date-range";

export interface TimeSeriesPoint {
  date: string; // bucket key, "YYYY-MM-DD"
  count: number;
}

/**
 * Buckets a list of dated records into a zero-filled time series covering
 * the whole range — a day/week/month with no records still appears as a
 * `count: 0` point, so a line/bar chart's x-axis never silently skips a
 * gap.
 */
export function countsByDate<T>(items: T[], getDate: (item: T) => string, range: DateRange, granularity: BucketGranularity): TimeSeriesPoint[] {
  const counts = new Map<string, number>();
  for (const key of bucketKeysInRange(range, granularity)) counts.set(key, 0);
  for (const item of items) {
    const key = bucketKeyFor(getDate(item), granularity);
    if (counts.has(key)) counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()].map(([date, count]) => ({ date, count }));
}

export interface GroupCount {
  group: string;
  count: number;
}

/** Groups a list of records by an arbitrary string key and counts each group — e.g. appointments by status, vehicles by status. */
export function countsByGroup<T>(items: T[], getGroup: (item: T) => string): GroupCount[] {
  const counts = new Map<string, number>();
  for (const item of items) {
    const key = getGroup(item);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()].map(([group, count]) => ({ group, count }));
}

export interface RankedItem {
  key: string;
  label: string;
  value: number;
}

/** Sorts descending by value and takes the top N — used for "top viewed cars," "top showrooms," etc. */
export function topByValue(items: RankedItem[], n: number): RankedItem[] {
  return [...items].sort((a, b) => b.value - a.value).slice(0, n);
}

/**
 * Given every submission's customer id (null for a guest/anonymous
 * submission, which can't be identity-matched — see the module docs in
 * queries.ts), returns the set of customer ids that appear more than
 * once. A logged-in customer submitting a second inquiry/appointment/
 * financing application, even for a different vehicle, counts as
 * "returning."
 */
export function findReturningCustomerIds(customerIds: (string | null)[]): Set<string> {
  const seenOnce = new Set<string>();
  const returning = new Set<string>();
  for (const id of customerIds) {
    if (!id) continue;
    if (seenOnce.has(id)) returning.add(id);
    else seenOnce.add(id);
  }
  return returning;
}
