import { describe, expect, it } from "vitest";
import { countsByDate, countsByGroup, findReturningCustomerIds, topByValue } from "./aggregations";

describe("countsByDate", () => {
  it("buckets records by day and zero-fills days with no records", () => {
    const items = [{ createdAt: "2026-03-01" }, { createdAt: "2026-03-01" }, { createdAt: "2026-03-03" }];
    const result = countsByDate(items, (i) => i.createdAt, { start: "2026-03-01", end: "2026-03-03" }, "day");
    expect(result).toEqual([
      { date: "2026-03-01", count: 2 },
      { date: "2026-03-02", count: 0 },
      { date: "2026-03-03", count: 1 },
    ]);
  });

  it("ignores a record whose date falls outside the requested range", () => {
    const items = [{ createdAt: "2026-02-15" }, { createdAt: "2026-03-01" }];
    const result = countsByDate(items, (i) => i.createdAt, { start: "2026-03-01", end: "2026-03-01" }, "day");
    expect(result).toEqual([{ date: "2026-03-01", count: 1 }]);
  });

  it("groups records into week buckets", () => {
    // 2026-03-01 (Sun) and 2026-03-03 (Tue) fall in the same week bucket.
    const items = [{ createdAt: "2026-03-01" }, { createdAt: "2026-03-03" }, { createdAt: "2026-03-08" }];
    const result = countsByDate(items, (i) => i.createdAt, { start: "2026-03-01", end: "2026-03-14" }, "week");
    expect(result).toEqual([
      { date: "2026-03-01", count: 2 },
      { date: "2026-03-08", count: 1 },
    ]);
  });

  it("returns an empty array for an empty item list, still zero-filled", () => {
    const result = countsByDate<{ createdAt: string }>([], (i) => i.createdAt, { start: "2026-03-01", end: "2026-03-02" }, "day");
    expect(result).toEqual([
      { date: "2026-03-01", count: 0 },
      { date: "2026-03-02", count: 0 },
    ]);
  });
});

describe("countsByGroup", () => {
  it("counts records per group key", () => {
    const items = [{ status: "PENDING" }, { status: "CONFIRMED" }, { status: "PENDING" }];
    expect(countsByGroup(items, (i) => i.status)).toEqual([
      { group: "PENDING", count: 2 },
      { group: "CONFIRMED", count: 1 },
    ]);
  });

  it("returns an empty array for an empty item list", () => {
    expect(countsByGroup<{ status: string }>([], (i) => i.status)).toEqual([]);
  });
});

describe("topByValue", () => {
  it("sorts descending by value and takes the top N", () => {
    const items = [
      { key: "a", label: "A", value: 5 },
      { key: "b", label: "B", value: 20 },
      { key: "c", label: "C", value: 10 },
    ];
    expect(topByValue(items, 2)).toEqual([
      { key: "b", label: "B", value: 20 },
      { key: "c", label: "C", value: 10 },
    ]);
  });

  it("does not mutate the input array", () => {
    const items = [
      { key: "a", label: "A", value: 1 },
      { key: "b", label: "B", value: 2 },
    ];
    const original = [...items];
    topByValue(items, 1);
    expect(items).toEqual(original);
  });

  it("returns fewer than N items if the list is shorter than N", () => {
    expect(topByValue([{ key: "a", label: "A", value: 1 }], 5)).toHaveLength(1);
  });
});

describe("findReturningCustomerIds", () => {
  it("identifies a customer id appearing more than once", () => {
    expect(findReturningCustomerIds(["c1", "c2", "c1"])).toEqual(new Set(["c1"]));
  });

  it("ignores null (guest) submissions entirely", () => {
    expect(findReturningCustomerIds([null, null, null])).toEqual(new Set());
  });

  it("does not count a customer who only appears once", () => {
    expect(findReturningCustomerIds(["c1", "c2", "c3"])).toEqual(new Set());
  });

  it("handles a mix of guest and repeat logged-in submissions", () => {
    expect(findReturningCustomerIds(["c1", null, "c2", "c1", null, "c1"])).toEqual(new Set(["c1"]));
  });
});
