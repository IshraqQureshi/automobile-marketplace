import { FUEL_TYPES } from "@/features/vehicle/schemas";
import { slugify } from "@/features/vehicle/slug";

// Shared by the header's Brands/Model/Type dropdowns and the footer's
// Brands/Model/Type columns — both need the exact same SEO-friendly-URL
// resolution against the same admin-managed catalog tables, so this is the
// one place that logic lives rather than two copies that could drift.

export interface NavCatalogItem {
  id: string;
  name: string;
}

export interface NavCatalog {
  brands: NavCatalogItem[];
  models: (NavCatalogItem & { brandName: string | null })[];
  types: NavCatalogItem[];
}

export const EMPTY_NAV_CATALOG: NavCatalog = { brands: [], models: [], types: [] };

export interface CatalogLinkItem {
  id: string;
  label: string;
  href: string;
}

const canonicalFuelTypeByLowercase = new Map(FUEL_TYPES.map((f) => [f.toLowerCase(), f]));

// /listing/{brand-slug} is the SEO-friendly landing page (vs.
// /listing?make=Toyota) — same slugify() vehicle detail pages already use
// for their own brand URL segment.
export function buildBrandCatalogLinks(brands: NavCatalogItem[]): CatalogLinkItem[] {
  return brands.map((b) => ({ id: b.id, label: b.name, href: `/listing/${slugify(b.name)}` }));
}

// /listing/{brand-slug}/{model-slug} when the model's brand is known (the
// models catalog table is FK'd to brands, so this is normally always
// true) — falls back to the flat query form on the rare row with no
// resolvable brand, rather than link to a URL /listing/[brand]/[model]
// can't actually resolve.
export function buildModelCatalogLinks(models: NavCatalog["models"]): CatalogLinkItem[] {
  return models.map((m) => ({
    id: m.id,
    label: m.brandName ? `${m.brandName} ${m.name}` : m.name,
    href: m.brandName ? `/listing/${slugify(m.brandName)}/${slugify(m.name)}` : `/listing?model=${encodeURIComponent(m.name)}`,
  }));
}

// The vehicle_types catalog table (admin-managed, shared with the "add
// vehicle" form) mixes two different concepts under one flat list: real
// body shapes (Sedan, SUV, Hatchback, ...) alongside FUEL_TYPES enum
// values (Diesel/Hybrid/Electric today) — there's no schema-level
// distinction between them, and no casing constraint on catalog_name
// either (an admin could enter "diesel"), so match case-insensitively
// rather than relying on an admin always typing the exact enum casing.
// A catalog entry whose name is one of FUEL_TYPES routes to the
// /listing/fuel/{slug} SEO page; everything else routes to
// /listing/type/{slug} — the same split resolveCanonicalBodyType/
// resolveCanonicalFuelType (src/features/vehicle/listing-slugs.ts) make on
// the receiving end, so a link built here always resolves there.
export function buildTypeCatalogLinks(types: NavCatalogItem[]): CatalogLinkItem[] {
  return types.map((t) => {
    const canonicalFuelType = canonicalFuelTypeByLowercase.get(t.name.toLowerCase());
    const href = canonicalFuelType ? `/listing/fuel/${slugify(canonicalFuelType)}` : `/listing/type/${slugify(t.name)}`;
    return { id: t.id, label: t.name, href };
  });
}
