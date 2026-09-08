// Resolves the SEO-friendly /listing/{brand}[/{model}] and
// /listing/type/{bodyType} & /listing/fuel/{fuelType} route segments back to
// a real, canonically-cased filter value. Each resolver checks the
// relevant admin-managed catalog table first (so a real, curated
// brand/model/type always resolves to a valid page even with zero current
// ACTIVE listings — an honest "no cars found" empty state, not a 404), then
// falls back to real ACTIVE vehicles' own free-text make/model/body_type
// values (which aren't FK'd to any catalog table, so a genuinely-listed
// value that isn't catalogued yet should still resolve).

import { cache } from "react";
import { FUEL_TYPES } from "./schemas";
import { slugify } from "./slug";
import { MAX_VEHICLES_FOR_FILTER_OPTIONS } from "./listing-query";
import { createClient } from "@/lib/supabase/server";

export const resolveCanonicalMake = cache(async (brandSlug: string): Promise<string | null> => {
  const supabase = await createClient();
  const [{ data: brandRows }, { data: vehicleRows }] = await Promise.all([
    supabase.from("brands").select("name"),
    supabase.from("vehicles").select("make").eq("status", "ACTIVE").limit(MAX_VEHICLES_FOR_FILTER_OPTIONS),
  ]);

  const catalogMatch = (brandRows ?? []).map((row) => row.name).find((name) => slugify(name) === brandSlug);
  if (catalogMatch) return catalogMatch;

  return (vehicleRows ?? []).map((row) => row.make).find((make) => slugify(make) === brandSlug) ?? null;
});

export const resolveCanonicalModel = cache(async (canonicalMake: string, modelSlug: string): Promise<string | null> => {
  const supabase = await createClient();

  const { data: brandRow } = await supabase.from("brands").select("id").ilike("name", canonicalMake).maybeSingle();
  if (brandRow) {
    const { data: modelRows } = await supabase.from("models").select("name").eq("brand_id", brandRow.id);
    const catalogMatch = (modelRows ?? []).map((row) => row.name).find((name) => slugify(name) === modelSlug);
    if (catalogMatch) return catalogMatch;
  }

  const { data: vehicleRows } = await supabase
    .from("vehicles")
    .select("model")
    .eq("status", "ACTIVE")
    .ilike("make", canonicalMake)
    .limit(MAX_VEHICLES_FOR_FILTER_OPTIONS);
  return (vehicleRows ?? []).map((row) => row.model).find((model) => slugify(model) === modelSlug) ?? null;
});

// vehicle_types mixes real body shapes with FUEL_TYPES enum values in one
// flat catalog table (see header.tsx's own nav-dropdown routing for the
// same distinction) — excluded here so /listing/type/{slug} only ever
// resolves a genuine body shape, never a fuel type value that happens to
// also be catalogued.
export const resolveCanonicalBodyType = cache(async (bodyTypeSlug: string): Promise<string | null> => {
  const supabase = await createClient();
  const fuelTypeSlugs = new Set(FUEL_TYPES.map((f) => slugify(f)));

  const { data: typeRows } = await supabase.from("vehicle_types").select("name");
  const catalogMatch = (typeRows ?? [])
    .map((row) => row.name)
    .filter((name) => !fuelTypeSlugs.has(slugify(name)))
    .find((name) => slugify(name) === bodyTypeSlug);
  if (catalogMatch) return catalogMatch;

  const { data: vehicleRows } = await supabase.from("vehicles").select("body_type").eq("status", "ACTIVE").limit(MAX_VEHICLES_FOR_FILTER_OPTIONS);
  return (
    (vehicleRows ?? [])
      .map((row) => row.body_type)
      .filter((v): v is string => Boolean(v))
      .find((bodyType) => slugify(bodyType) === bodyTypeSlug) ?? null
  );
});

// FUEL_TYPES is a small fixed app-level enum (src/features/vehicle/schemas.ts),
// not a DB-backed catalog — resolving against it needs no query at all.
export function resolveCanonicalFuelType(fuelTypeSlug: string): string | null {
  return FUEL_TYPES.find((fuelType) => slugify(fuelType) === fuelTypeSlug) ?? null;
}
