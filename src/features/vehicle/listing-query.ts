// Shared Supabase query-building for the public vehicle marketplace listing
// (MKT-002) — used by both /listing (the full flat-query-string filter UI)
// and /listing/[brand] (the SEO-friendly per-brand landing page, e.g.
// /listing/toyota instead of /listing?make=Toyota). Kept separate from
// either page.tsx so this real query logic isn't duplicated between them.

import type { createClient } from "@/lib/supabase/server";
import type { VehicleSearchFilters } from "./search";
import { VEHICLE_SELECT_COLUMNS, vehicleRowToListItem, type VehicleWithShowroom } from "./types";
import { VEHICLES_PER_PAGE } from "./search";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

// Filter dropdown options are derived from real currently-ACTIVE listings
// (not the separately admin-managed brands/models/vehicle_types catalog
// tables, which aren't FK'd to vehicles.make/model/body_type) — capped so a
// dropdown option is never offered unless it can actually return a result,
// without scanning the whole table.
export const MAX_VEHICLES_FOR_FILTER_OPTIONS = 2000;

export interface VehicleFilterOptions {
  makes: string[];
  models: string[];
  bodyTypes: string[];
  fuelTypes: string[];
}

function uniqueSorted(values: (string | null | undefined)[] | undefined): string[] {
  return [...new Set((values ?? []).filter((v): v is string => Boolean(v)))].sort((a, b) => a.localeCompare(b));
}

/**
 * `scopedToMake`, when given, narrows the option lists to that make's own
 * real model/bodyType/fuelType values (used by /listing/[brand], where
 * showing every OTHER brand's models in the "Model" dropdown would be
 * actively unhelpful) rather than the whole marketplace's.
 */
export async function fetchVehicleFilterOptions(supabase: SupabaseServerClient, scopedToMake?: string): Promise<VehicleFilterOptions> {
  let query = supabase.from("vehicles").select("make, model, body_type, fuel_type").eq("status", "ACTIVE").limit(MAX_VEHICLES_FOR_FILTER_OPTIONS);
  if (scopedToMake) query = query.ilike("make", scopedToMake);
  const { data } = await query;

  return {
    makes: uniqueSorted(data?.map((r) => r.make)),
    models: uniqueSorted(data?.map((r) => r.model)),
    bodyTypes: uniqueSorted(data?.map((r) => r.body_type)),
    fuelTypes: uniqueSorted(data?.map((r) => r.fuel_type)),
  };
}

export function buildVehicleQuery(supabase: SupabaseServerClient, filters: VehicleSearchFilters) {
  let query = supabase
    .from("vehicles")
    .select(`${VEHICLE_SELECT_COLUMNS}, showroom_id, showrooms(business_name)`, { count: "exact" })
    .eq("status", "ACTIVE");

  if (filters.q) {
    query = query.or(`title.ilike.%${filters.q}%,make.ilike.%${filters.q}%,model.ilike.%${filters.q}%`);
  }
  if (filters.make) query = query.ilike("make", filters.make);
  if (filters.model) query = query.ilike("model", filters.model);
  if (filters.bodyType) query = query.eq("body_type", filters.bodyType);
  if (filters.fuelType) query = query.eq("fuel_type", filters.fuelType);
  if (filters.minPrice != null) query = query.gte("price", filters.minPrice);
  if (filters.maxPrice != null) query = query.lte("price", filters.maxPrice);
  if (filters.minYear != null) query = query.gte("year", filters.minYear);
  if (filters.maxYear != null) query = query.lte("year", filters.maxYear);

  switch (filters.sort) {
    case "price-asc":
      query = query.order("price", { ascending: true });
      break;
    case "price-desc":
      query = query.order("price", { ascending: false });
      break;
    case "year-desc":
      query = query.order("year", { ascending: false });
      break;
    case "mileage-asc":
      query = query.order("mileage", { ascending: true, nullsFirst: false });
      break;
    // "relevance" has no ranking infrastructure to back it (no full-text
    // search) — falls back to the same ordering as "newest" rather than
    // fabricating a scoring algorithm. Documented in MVP_PROGRESS.md.
    case "relevance":
    case "newest":
    default:
      query = query.order("created_at", { ascending: false });
      break;
  }

  const from = (filters.page - 1) * VEHICLES_PER_PAGE;
  const to = from + VEHICLES_PER_PAGE - 1;
  return query.range(from, to);
}

export async function fetchVehicleListingPage(
  supabase: SupabaseServerClient,
  filters: VehicleSearchFilters,
): Promise<{ vehicles: VehicleWithShowroom[]; totalCount: number }> {
  const { data: vehicleRows, count } = await buildVehicleQuery(supabase, filters);

  const getPhotoUrl = (storagePath: string) => supabase.storage.from("vehicle-media").getPublicUrl(storagePath).data.publicUrl;
  const vehicles: VehicleWithShowroom[] = (vehicleRows ?? []).map((row) => ({
    ...vehicleRowToListItem(row, getPhotoUrl),
    showroomId: row.showroom_id,
    showroomName: row.showrooms?.business_name ?? "Unknown showroom",
  }));

  return { vehicles, totalCount: count ?? 0 };
}
