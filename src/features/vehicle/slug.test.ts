import { describe, expect, it } from "vitest";
import { getVehicleBrandSlug, getVehicleDetailPath, getVehicleNameSlug, parseVehicleIdFromSlug, slugify } from "./slug";

describe("slugify", () => {
  it("lowercases, replaces non-alphanumerics with hyphens, and trims edge hyphens", () => {
    expect(slugify("Mercedes-Benz")).toBe("mercedes-benz");
    expect(slugify("530i M Sport")).toBe("530i-m-sport");
    expect(slugify("  Rolls-Royce  ")).toBe("rolls-royce");
  });
});

describe("getVehicleBrandSlug / getVehicleNameSlug / getVehicleDetailPath", () => {
  const vehicle = { id: "3fa85f64-5717-4562-b3fc-2c963f66afa6", make: "BMW", model: "5 Series", variant: "530i M Sport" };

  it("builds the brand slug from make", () => {
    expect(getVehicleBrandSlug(vehicle.make)).toBe("bmw");
  });

  it("builds the name slug as {model-variant-slug}-{id}", () => {
    expect(getVehicleNameSlug(vehicle)).toBe("5-series-530i-m-sport-3fa85f64-5717-4562-b3fc-2c963f66afa6");
  });

  it("omits the variant when absent", () => {
    expect(getVehicleNameSlug({ ...vehicle, variant: null })).toBe("5-series-3fa85f64-5717-4562-b3fc-2c963f66afa6");
  });

  it("builds the full detail path", () => {
    expect(getVehicleDetailPath(vehicle)).toBe("/bmw/5-series-530i-m-sport-3fa85f64-5717-4562-b3fc-2c963f66afa6");
  });

  it("falls back to just the id when model/variant slugify to nothing (e.g. all-symbol input)", () => {
    expect(getVehicleNameSlug({ ...vehicle, model: "!!!", variant: null })).toBe(vehicle.id);
  });
});

describe("parseVehicleIdFromSlug", () => {
  it("recovers the id from the end of a real slug", () => {
    expect(parseVehicleIdFromSlug("5-series-530i-m-sport-3fa85f64-5717-4562-b3fc-2c963f66afa6")).toBe("3fa85f64-5717-4562-b3fc-2c963f66afa6");
  });

  it("recovers the id when the slug is just the bare id (no name prefix)", () => {
    expect(parseVehicleIdFromSlug("3fa85f64-5717-4562-b3fc-2c963f66afa6")).toBe("3fa85f64-5717-4562-b3fc-2c963f66afa6");
  });

  it("is case-insensitive but normalizes to lowercase", () => {
    expect(parseVehicleIdFromSlug("5-series-3FA85F64-5717-4562-B3FC-2C963F66AFA6")).toBe("3fa85f64-5717-4562-b3fc-2c963f66afa6");
  });

  it("returns null for a too-short slug", () => {
    expect(parseVehicleIdFromSlug("not-a-real-id")).toBeNull();
  });

  it("returns null when the trailing 36 characters aren't a well-formed UUID", () => {
    expect(parseVehicleIdFromSlug("5-series-zzzzzzzz-5717-4562-b3fc-2c963f66afa6")).toBeNull();
  });

  it("returns null for an empty string", () => {
    expect(parseVehicleIdFromSlug("")).toBeNull();
  });
});
