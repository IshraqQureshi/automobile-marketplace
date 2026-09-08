import type { MetadataRoute } from "next";
import { getShowroomDetailPath } from "@/features/showroom/slug";
import { FUEL_TYPES } from "@/features/vehicle/schemas";
import { getVehicleDetailPath, slugify } from "@/features/vehicle/slug";
import { publicEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

// Only routes that are genuinely public, real, and stable are listed here.
// privacy/terms/cookie-policy are deliberately excluded — they're noindexed
// (placeholder content pending real legal copy, B-006), and a noindexed URL
// has no business being advertised in a sitemap.
const STATIC_ROUTES = ["/", "/listing", "/showrooms", "/ready-to-sell", "/register-showroom"];

// Real, currently-ACTIVE vehicle listings (MKT-002/003) — a cap keeps this
// from growing unbounded at real scale; revisit with a paginated sitemap
// index once listing volume ever approaches it.
const MAX_VEHICLES_IN_SITEMAP = 5000;
const MAX_SHOWROOMS_IN_SITEMAP = 5000;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = publicEnv.NEXT_PUBLIC_SITE_URL;
  const supabase = await createClient();

  const [{ data: vehicles }, { data: showrooms }, { data: brands }, { data: models }, { data: vehicleTypes }] = await Promise.all([
    supabase
      .from("vehicles")
      .select("id, make, model, variant, updated_at")
      .eq("status", "ACTIVE")
      .order("updated_at", { ascending: false })
      .limit(MAX_VEHICLES_IN_SITEMAP),
    supabase
      .from("showrooms")
      .select("id, business_name, updated_at")
      .eq("status", "APPROVED")
      .order("updated_at", { ascending: false })
      .limit(MAX_SHOWROOMS_IN_SITEMAP),
    // The catalog tables back the SEO-friendly /listing/{brand} family of
    // routes (PR #65) — small (~10 rows each), so listing every one is
    // cheap and keeps these genuinely-built-for-SEO pages actually
    // discoverable, not just linked from the header nav.
    supabase.from("brands").select("name"),
    supabase.from("models").select("name, brands(name)"),
    supabase.from("vehicle_types").select("name"),
  ]);

  const staticEntries = STATIC_ROUTES.map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
  }));

  const vehicleEntries = (vehicles ?? []).map((vehicle) => ({
    url: `${baseUrl}${getVehicleDetailPath(vehicle)}`,
    lastModified: new Date(vehicle.updated_at),
  }));

  const showroomEntries = (showrooms ?? []).map((showroom) => ({
    url: `${baseUrl}${getShowroomDetailPath({ id: showroom.id, businessName: showroom.business_name })}`,
    lastModified: new Date(showroom.updated_at),
  }));

  const brandEntries = (brands ?? []).map((brand) => ({
    url: `${baseUrl}/listing/${slugify(brand.name)}`,
    lastModified: new Date(),
  }));

  const modelEntries = (models ?? [])
    .filter((model) => model.brands?.name)
    .map((model) => ({
      url: `${baseUrl}/listing/${slugify(model.brands!.name)}/${slugify(model.name)}`,
      lastModified: new Date(),
    }));

  // vehicle_types mixes real body shapes with FUEL_TYPES enum values in one
  // flat catalog table (see src/features/vehicle/listing-slugs.ts) — split
  // the same way those routes themselves resolve, so every sitemap entry
  // actually points at a route that resolves.
  const fuelTypeSlugs = new Set(FUEL_TYPES.map((f) => slugify(f)));
  const typeEntries = (vehicleTypes ?? []).map((type) => {
    const slug = slugify(type.name);
    const path = fuelTypeSlugs.has(slug) ? `/listing/fuel/${slug}` : `/listing/type/${slug}`;
    return { url: `${baseUrl}${path}`, lastModified: new Date() };
  });

  return [...staticEntries, ...vehicleEntries, ...showroomEntries, ...brandEntries, ...modelEntries, ...typeEntries];
}
