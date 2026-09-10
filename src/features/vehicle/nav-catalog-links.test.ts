import { describe, expect, it } from "vitest";
import { buildBrandCatalogLinks, buildModelCatalogLinks, buildTypeCatalogLinks } from "./nav-catalog-links";

describe("buildBrandCatalogLinks", () => {
  it("slugifies the brand name into /listing/{brand-slug}", () => {
    const links = buildBrandCatalogLinks([{ id: "1", name: "Mercedes-Benz" }]);
    expect(links).toEqual([{ id: "1", label: "Mercedes-Benz", href: "/listing/mercedes-benz" }]);
  });
});

describe("buildModelCatalogLinks", () => {
  it("builds /listing/{brand-slug}/{model-slug} when the model's brand is known", () => {
    const links = buildModelCatalogLinks([{ id: "1", name: "Camry", brandName: "Toyota" }]);
    expect(links).toEqual([{ id: "1", label: "Toyota Camry", href: "/listing/toyota/camry" }]);
  });

  it("falls back to the flat query form when the model has no resolvable brand", () => {
    const links = buildModelCatalogLinks([{ id: "1", name: "Unbranded Model", brandName: null }]);
    expect(links).toEqual([{ id: "1", label: "Unbranded Model", href: "/listing?model=Unbranded%20Model" }]);
  });
});

describe("buildTypeCatalogLinks", () => {
  it("routes a real body type to /listing/type/{slug}", () => {
    const links = buildTypeCatalogLinks([{ id: "1", name: "SUV" }]);
    expect(links).toEqual([{ id: "1", label: "SUV", href: "/listing/type/suv" }]);
  });

  it("routes a catalog entry matching a FUEL_TYPES value to /listing/fuel/{slug}, case-insensitively", () => {
    const links = buildTypeCatalogLinks([{ id: "1", name: "diesel" }]);
    expect(links).toEqual([{ id: "1", label: "diesel", href: "/listing/fuel/diesel" }]);
  });

  it("uses the canonical FUEL_TYPES casing in the href even when the catalog entry is cased differently", () => {
    const links = buildTypeCatalogLinks([{ id: "1", name: "ELECTRIC" }]);
    expect(links[0]?.href).toBe("/listing/fuel/electric");
  });
});
