import { describe, expect, it } from "vitest";
import { parseShowroomSearchFilters, showroomSearchFiltersToParams } from "./search";

describe("parseShowroomSearchFilters", () => {
  it("defaults to newest sort and page 1 with empty filters", () => {
    expect(parseShowroomSearchFilters({})).toEqual({ q: "", city: "", sort: "newest", page: 1 });
  });

  it("reads q and city, trimming whitespace", () => {
    expect(parseShowroomSearchFilters({ q: "  Mr Carscout  ", city: " Nairobi " })).toMatchObject({ q: "Mr Carscout", city: "Nairobi" });
  });

  it("sanitizes q using the shared vehicle sanitizer (strips filter-breaking characters)", () => {
    expect(parseShowroomSearchFilters({ q: "Test, (showroom)" }).q).toBe("Test showroom");
  });

  it("falls back to newest for an unrecognized sort key", () => {
    expect(parseShowroomSearchFilters({ sort: "bogus" }).sort).toBe("newest");
  });

  it("accepts a valid sort key", () => {
    expect(parseShowroomSearchFilters({ sort: "name-asc" }).sort).toBe("name-asc");
  });

  it("falls back to page 1 for a non-positive or non-integer page", () => {
    expect(parseShowroomSearchFilters({ page: "0" }).page).toBe(1);
    expect(parseShowroomSearchFilters({ page: "-3" }).page).toBe(1);
    expect(parseShowroomSearchFilters({ page: "abc" }).page).toBe(1);
    expect(parseShowroomSearchFilters({ page: "2.5" }).page).toBe(1);
  });

  it("accepts a valid page number", () => {
    expect(parseShowroomSearchFilters({ page: "3" }).page).toBe(3);
  });
});

describe("showroomSearchFiltersToParams", () => {
  it("omits default values (empty q/city, default sort, page 1)", () => {
    expect(showroomSearchFiltersToParams({ q: "", city: "", sort: "newest", page: 1 }).toString()).toBe("");
  });

  it("includes non-default values", () => {
    const params = showroomSearchFiltersToParams({ q: "test", city: "Mombasa", sort: "name-asc", page: 2 });
    expect(params.get("q")).toBe("test");
    expect(params.get("city")).toBe("Mombasa");
    expect(params.get("sort")).toBe("name-asc");
    expect(params.get("page")).toBe("2");
  });
});
