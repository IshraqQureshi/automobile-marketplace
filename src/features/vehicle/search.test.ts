import { describe, expect, it } from "vitest";
import { parseVehicleSearchFilters, sanitizeSearchTerm, vehicleSearchFiltersToParams } from "./search";

describe("sanitizeSearchTerm", () => {
  it("strips PostgREST-or-combinator and ilike-wildcard characters", () => {
    expect(sanitizeSearchTerm("bmw,or(evil%_)")).toBe("bmw or evil");
  });

  it("collapses whitespace and trims", () => {
    expect(sanitizeSearchTerm("  toyota   fielder  ")).toBe("toyota fielder");
  });

  it("truncates to 100 characters", () => {
    const long = "a".repeat(200);
    expect(sanitizeSearchTerm(long)).toHaveLength(100);
  });

  it("returns empty string unchanged", () => {
    expect(sanitizeSearchTerm("")).toBe("");
  });
});

describe("parseVehicleSearchFilters", () => {
  it("defaults to newest sort, page 1, and empty filters when nothing is provided", () => {
    expect(parseVehicleSearchFilters({})).toEqual({
      q: "",
      make: "",
      model: "",
      bodyType: "",
      fuelType: "",
      minPrice: null,
      maxPrice: null,
      minYear: null,
      maxYear: null,
      sort: "newest",
      page: 1,
    });
  });

  it("parses valid filters", () => {
    const result = parseVehicleSearchFilters({
      q: "hilux",
      make: "Toyota",
      model: "Hilux",
      bodyType: "Pickup",
      fuelType: "diesel",
      minPrice: "1000000",
      maxPrice: "5000000",
      minYear: "2018",
      maxYear: "2023",
      sort: "price-asc",
      page: "3",
    });
    expect(result).toEqual({
      q: "hilux",
      make: "Toyota",
      model: "Hilux",
      bodyType: "Pickup",
      fuelType: "diesel",
      minPrice: 1_000_000,
      maxPrice: 5_000_000,
      minYear: 2018,
      maxYear: 2023,
      sort: "price-asc",
      page: 3,
    });
  });

  it("falls back to newest for an unknown sort key", () => {
    expect(parseVehicleSearchFilters({ sort: "not-a-real-sort" }).sort).toBe("newest");
  });

  it("falls back to page 1 for invalid page values (zero, negative, non-integer, non-numeric)", () => {
    expect(parseVehicleSearchFilters({ page: "0" }).page).toBe(1);
    expect(parseVehicleSearchFilters({ page: "-5" }).page).toBe(1);
    expect(parseVehicleSearchFilters({ page: "2.5" }).page).toBe(1);
    expect(parseVehicleSearchFilters({ page: "not-a-number" }).page).toBe(1);
  });

  it("ignores non-numeric price/year values", () => {
    const result = parseVehicleSearchFilters({ minPrice: "abc", maxYear: "abc" });
    expect(result.minPrice).toBeNull();
    expect(result.maxYear).toBeNull();
  });

  it("clamps out-of-range price and year values instead of passing them through raw", () => {
    const result = parseVehicleSearchFilters({ minPrice: "-500", maxPrice: "999999999999999", minYear: "1800", maxYear: "3000" });
    expect(result.minPrice).toBe(0);
    expect(result.maxPrice).toBe(1_000_000_000_000);
    expect(result.minYear).toBe(1900);
    expect(result.maxYear).toBe(new Date().getFullYear() + 1);
  });

  it("sanitizes the search term through the same rules as sanitizeSearchTerm", () => {
    expect(parseVehicleSearchFilters({ q: "bmw,or(evil)" }).q).toBe("bmw or evil");
  });

  it("treats an array value (repeated query param) as absent rather than throwing", () => {
    expect(parseVehicleSearchFilters({ make: ["Toyota", "BMW"] }).make).toBe("");
  });
});

describe("vehicleSearchFiltersToParams", () => {
  it("omits defaults (empty strings, null numbers, default sort, page 1)", () => {
    const params = vehicleSearchFiltersToParams({ sort: "newest", page: 1 });
    expect(params.toString()).toBe("");
  });

  it("includes only the non-default fields provided", () => {
    const params = vehicleSearchFiltersToParams({ make: "Toyota", sort: "price-asc", page: 2 });
    expect(params.get("make")).toBe("Toyota");
    expect(params.get("sort")).toBe("price-asc");
    expect(params.get("page")).toBe("2");
    expect(params.has("q")).toBe(false);
  });
});
