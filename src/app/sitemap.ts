import type { MetadataRoute } from "next";
import { getVehicleDetailPath } from "@/features/vehicle/slug";
import { publicEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

// Only routes that are genuinely public, real, and stable are listed here —
// no showroom detail pages yet (MKT-004 not built), so those aren't
// fabricated into the sitemap ahead of actually existing.
const STATIC_ROUTES = ["/", "/listing", "/ready-to-sell", "/register-showroom", "/privacy", "/terms", "/cookie-policy"];

// Real, currently-ACTIVE vehicle listings (MKT-002/003) — a cap keeps this
// from growing unbounded at real scale; revisit with a paginated sitemap
// index once listing volume ever approaches it.
const MAX_VEHICLES_IN_SITEMAP = 5000;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = publicEnv.NEXT_PUBLIC_SITE_URL;
  const supabase = await createClient();
  const { data: vehicles } = await supabase
    .from("vehicles")
    .select("id, make, model, variant, updated_at")
    .eq("status", "ACTIVE")
    .order("updated_at", { ascending: false })
    .limit(MAX_VEHICLES_IN_SITEMAP);

  const staticEntries = STATIC_ROUTES.map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
  }));

  const vehicleEntries = (vehicles ?? []).map((vehicle) => ({
    url: `${baseUrl}${getVehicleDetailPath(vehicle)}`,
    lastModified: new Date(vehicle.updated_at),
  }));

  return [...staticEntries, ...vehicleEntries];
}
