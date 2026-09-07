// Pure date-range/bucketing math shared by every report — resolving a
// preset ("last 30 days" etc.) or custom range into concrete start/end
// dates, picking a sensible chart granularity for that span, and bucketing
// arbitrary dated records into it (zero-filling buckets with no data, so a
// chart's x-axis is continuous rather than skipping gaps).

export type DateRangePreset = "7d" | "30d" | "90d" | "custom";

export interface DateRange {
  start: string; // "YYYY-MM-DD", inclusive
  end: string; // "YYYY-MM-DD", inclusive
}

// Local-time date components, not `.toISOString().slice(0, 10)` — every
// Date this module constructs (`new Date(\`${dateString}T00:00:00\`)`,
// `new Date(year, month, day)`) is already local-time, and mixing that
// with a UTC-based formatter here would shift the date by a day whenever
// the runtime's local timezone isn't UTC (the same day-boundary bug class
// already hit this codebase's E2E date-picker helpers).
function toDateOnly(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

const PRESET_DAYS: Record<Exclude<DateRangePreset, "custom">, number> = {
  "7d": 7,
  "30d": 30,
  "90d": 90,
};

/**
 * Resolves a preset (or an explicit custom start/end) into a concrete
 * inclusive date range. `today` is injectable for deterministic testing.
 */
export function resolveDateRange(preset: DateRangePreset, custom?: { start?: string; end?: string }, today: Date = new Date()): DateRange {
  const end = custom?.end && preset === "custom" ? custom.end : toDateOnly(today);
  if (preset === "custom") {
    const start = custom?.start ?? toDateOnly(today);
    return { start: start <= end ? start : end, end };
  }
  const days = PRESET_DAYS[preset];
  const startDate = new Date(`${end}T00:00:00`);
  startDate.setDate(startDate.getDate() - (days - 1));
  return { start: toDateOnly(startDate), end };
}

export type BucketGranularity = "day" | "week" | "month";

function daysBetween(range: DateRange): number {
  const start = new Date(`${range.start}T00:00:00`);
  const end = new Date(`${range.end}T00:00:00`);
  return Math.round((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)) + 1;
}

/** Day buckets for a short range, week buckets for a medium one, month buckets beyond that — keeps a chart from ever rendering hundreds of bars. */
export function pickGranularity(range: DateRange): BucketGranularity {
  const span = daysBetween(range);
  if (span <= 31) return "day";
  if (span <= 180) return "week";
  return "month";
}

function startOfWeek(date: Date): Date {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay()); // Sunday-start, matching showroom_availability's own day_of_week convention
  return d;
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

/** Maps an arbitrary "YYYY-MM-DD" date to the key of the bucket it falls into. */
export function bucketKeyFor(dateString: string, granularity: BucketGranularity): string {
  const date = new Date(`${dateString}T00:00:00`);
  if (granularity === "day") return dateString;
  if (granularity === "week") return toDateOnly(startOfWeek(date));
  return toDateOnly(startOfMonth(date));
}

/** Every bucket key covering the range, in order, even ones no data falls into — so a chart's x-axis stays continuous rather than skipping gaps. */
export function bucketKeysInRange(range: DateRange, granularity: BucketGranularity): string[] {
  const keys: string[] = [];
  const seen = new Set<string>();
  const end = new Date(`${range.end}T00:00:00`);
  const cursor = new Date(`${range.start}T00:00:00`);
  while (cursor <= end) {
    const key = bucketKeyFor(toDateOnly(cursor), granularity);
    if (!seen.has(key)) {
      seen.add(key);
      keys.push(key);
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return keys;
}
