import { describe, expect, it } from "vitest";
import { bucketKeyFor, bucketKeysInRange, isValidDateOnly, pickGranularity, resolveDateRange } from "./date-range";

const FIXED_TODAY = new Date("2026-03-15T12:00:00Z");

describe("resolveDateRange", () => {
  it("resolves the 7d preset to a 7-day inclusive range ending today", () => {
    expect(resolveDateRange("7d", undefined, FIXED_TODAY)).toEqual({ start: "2026-03-09", end: "2026-03-15" });
  });

  it("resolves 'today' by its UTC calendar date, not the process's local timezone — code review finding", () => {
    // 23:30 UTC on 2026-03-15 is already 2026-03-16 in timezones ahead of
    // UTC by 1+ hour, and still 2026-03-15 in timezones behind UTC. If this
    // function used local-time getters (as it originally did), the result
    // here would depend on whatever timezone the test happened to run in —
    // it must not, since every report record it's compared against
    // (`created_at.slice(0, 10)`) is keyed by its UTC calendar date.
    const lateUtcInstant = new Date("2026-03-15T23:30:00Z");
    expect(resolveDateRange("7d", undefined, lateUtcInstant).end).toBe("2026-03-15");
  });

  it("resolves the 30d preset", () => {
    expect(resolveDateRange("30d", undefined, FIXED_TODAY)).toEqual({ start: "2026-02-14", end: "2026-03-15" });
  });

  it("resolves the 90d preset", () => {
    expect(resolveDateRange("90d", undefined, FIXED_TODAY)).toEqual({ start: "2025-12-16", end: "2026-03-15" });
  });

  it("uses the explicit start/end for a custom range", () => {
    expect(resolveDateRange("custom", { start: "2026-01-01", end: "2026-01-31" }, FIXED_TODAY)).toEqual({ start: "2026-01-01", end: "2026-01-31" });
  });

  it("clamps a custom range where start is after end, rather than producing an invalid range", () => {
    expect(resolveDateRange("custom", { start: "2026-02-01", end: "2026-01-01" }, FIXED_TODAY)).toEqual({ start: "2026-01-01", end: "2026-01-01" });
  });

  it("defaults a custom range's missing end to today", () => {
    expect(resolveDateRange("custom", { start: "2026-01-01" }, FIXED_TODAY)).toEqual({ start: "2026-01-01", end: "2026-03-15" });
  });
});

describe("pickGranularity", () => {
  it("picks day granularity for a range up to 31 days", () => {
    expect(pickGranularity({ start: "2026-03-01", end: "2026-03-15" })).toBe("day");
  });

  it("picks week granularity for a range between 32 and 180 days", () => {
    expect(pickGranularity({ start: "2026-01-01", end: "2026-03-15" })).toBe("week");
  });

  it("picks month granularity for a range beyond 180 days", () => {
    expect(pickGranularity({ start: "2025-01-01", end: "2026-03-15" })).toBe("month");
  });
});

describe("bucketKeyFor", () => {
  it("returns the date itself for day granularity", () => {
    expect(bucketKeyFor("2026-03-12", "day")).toBe("2026-03-12");
  });

  it("returns the Sunday-start of the week for week granularity", () => {
    // 2026-03-12 is a Thursday.
    expect(bucketKeyFor("2026-03-12", "week")).toBe("2026-03-08");
  });

  it("returns the first of the month for month granularity", () => {
    expect(bucketKeyFor("2026-03-12", "month")).toBe("2026-03-01");
  });
});

describe("bucketKeysInRange", () => {
  it("produces one key per day for day granularity", () => {
    expect(bucketKeysInRange({ start: "2026-03-01", end: "2026-03-04" }, "day")).toEqual(["2026-03-01", "2026-03-02", "2026-03-03", "2026-03-04"]);
  });

  it("produces one key per distinct week for week granularity, even spanning a partial week at each end", () => {
    // 2026-03-01 is a Sunday, 2026-03-14 is a Saturday — exactly 2 full weeks.
    expect(bucketKeysInRange({ start: "2026-03-01", end: "2026-03-14" }, "week")).toEqual(["2026-03-01", "2026-03-08"]);
  });

  it("produces one key per distinct month for month granularity", () => {
    expect(bucketKeysInRange({ start: "2026-01-15", end: "2026-03-05" }, "month")).toEqual(["2026-01-01", "2026-02-01", "2026-03-01"]);
  });
});

describe("isValidDateOnly", () => {
  it("accepts a well-formed YYYY-MM-DD string", () => {
    expect(isValidDateOnly("2026-03-15")).toBe(true);
  });

  it("rejects an empty string — a cleared date input submits this, not undefined", () => {
    expect(isValidDateOnly("")).toBe(false);
  });

  it("rejects undefined", () => {
    expect(isValidDateOnly(undefined)).toBe(false);
  });

  it("rejects a malformed date string", () => {
    expect(isValidDateOnly("not-a-date")).toBe(false);
    expect(isValidDateOnly("2026/03/15")).toBe(false);
    expect(isValidDateOnly("2026-3-15")).toBe(false);
  });
});
