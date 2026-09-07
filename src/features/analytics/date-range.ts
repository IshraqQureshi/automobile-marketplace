// Pure date-range/bucketing math shared by every report — resolving a
// preset ("last 30 days" etc.) or custom range into concrete start/end
// dates, picking a sensible chart granularity for that span, and bucketing
// arbitrary dated records into it (zero-filling buckets with no data, so a
// chart's x-axis is continuous rather than skipping gaps).
//
// Every date this module touches is handled in UTC, consistently, end to
// end — not because UTC is inherently "more correct," but because the
// records being bucketed (appointments.created_at etc., timestamptz
// columns) come back from Supabase as UTC ISO strings, and every report
// query slices their calendar date via `.slice(0, 10)` on that UTC string
// (see showroom-report-queries.ts/admin-report-queries.ts). Resolving
// "today"/parsing "YYYY-MM-DD" via LOCAL time here, while the actual data
// being bucketed is keyed by its UTC calendar date, would silently
// misattribute records near a day boundary whenever the runtime's local
// timezone isn't UTC — code review caught exactly this inconsistency
// before merge (the module was internally local-time-consistent, but that
// consistency didn't survive contact with the UTC-keyed query layer).

export type DateRangePreset = "7d" | "30d" | "90d" | "custom";

export interface DateRange {
  start: string; // "YYYY-MM-DD", inclusive
  end: string; // "YYYY-MM-DD", inclusive
}

function toDateOnly(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// Parses a "YYYY-MM-DD" string as UTC midnight — never bare
// `new Date(dateString + "T00:00:00")`, which parses as LOCAL midnight.
function parseDateOnly(dateString: string): Date {
  return new Date(`${dateString}T00:00:00Z`);
}

const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/**
 * A defense-in-depth guard for a custom range's `start`/`end` query params
 * before they ever reach resolveDateRange — a cleared date input submits
 * as `""` rather than being omitted (see DateRangeForm's own client-side
 * guard for the same issue), and an empty/malformed string isn't
 * distinguishable from "no override" by a bare `??`. Format-only (doesn't
 * check the date is a real calendar date) — resolveDateRange's own
 * start<=end clamping handles the rest.
 */
export function isValidDateOnly(value: string | undefined): value is string {
  return !!value && DATE_ONLY_PATTERN.test(value);
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
  const startDate = parseDateOnly(end);
  startDate.setUTCDate(startDate.getUTCDate() - (days - 1));
  return { start: toDateOnly(startDate), end };
}

export type BucketGranularity = "day" | "week" | "month";

function daysBetween(range: DateRange): number {
  const start = parseDateOnly(range.start);
  const end = parseDateOnly(range.end);
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
  d.setUTCDate(d.getUTCDate() - d.getUTCDay()); // Sunday-start, matching showroom_availability's own day_of_week convention
  return d;
}

function startOfMonth(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

/** Maps an arbitrary "YYYY-MM-DD" date to the key of the bucket it falls into. */
export function bucketKeyFor(dateString: string, granularity: BucketGranularity): string {
  const date = parseDateOnly(dateString);
  if (granularity === "day") return dateString;
  if (granularity === "week") return toDateOnly(startOfWeek(date));
  return toDateOnly(startOfMonth(date));
}

/** Every bucket key covering the range, in order, even ones no data falls into — so a chart's x-axis stays continuous rather than skipping gaps. */
export function bucketKeysInRange(range: DateRange, granularity: BucketGranularity): string[] {
  const keys: string[] = [];
  const seen = new Set<string>();
  const end = parseDateOnly(range.end);
  const cursor = parseDateOnly(range.start);
  while (cursor <= end) {
    const key = bucketKeyFor(toDateOnly(cursor), granularity);
    if (!seen.has(key)) {
      seen.add(key);
      keys.push(key);
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return keys;
}
