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
  // Real min/max price across the same (possibly brand-scoped) result set
  // above — the price range slider's own bounds, so it reflects an actually
  // achievable range rather than an arbitrary guessed ceiling. Falls back to
  // a generous static range when there's no data at all yet (fresh install).
  minPriceBound: number;
  maxPriceBound: number;
}

const FALLBACK_MIN_PRICE_BOUND = 0;
const FALLBACK_MAX_PRICE_BOUND = 20_000_000;

// PostgREST's or() mini-grammar treats a bare `,`, `(`, or `)` in a filter
// value as syntax (clause separator / grouping), so a raw user search term
// containing one of those could inject an unintended extra filter clause
// into the same or() list. Per PostgREST's own escaping convention,
// wrapping the value in double quotes (doubling any literal quotes inside
// it) makes it opaque to that grammar without changing what ilike matches.
function escapeForOrFilter(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

function uniqueSorted(values: (string | null | undefined)[] | undefined): string[] {
  return [...new Set((values ?? []).filter((v): v is string => Boolean(v)))].sort((a, b) => a.localeCompare(b));
}

/**
 * `scopedToMake`, when given, narrows the option lists (and price bounds) to
 * that make's own real model/bodyType/fuelType/price values (used by
 * /listing/[brand], where showing every OTHER brand's models in the "Model"
 * dropdown — or its price range in the slider — would be actively
 * unhelpful) rather than the whole marketplace's.
 */
export async function fetchVehicleFilterOptions(supabase: SupabaseServerClient, scopedToMake?: string): Promise<VehicleFilterOptions> {
  let query = supabase.from("vehicles").select("make, model, body_type, fuel_type, price").eq("status", "ACTIVE").limit(MAX_VEHICLES_FOR_FILTER_OPTIONS);
  if (scopedToMake) query = query.ilike("make", scopedToMake);
  const { data } = await query;

  const prices = (data ?? []).map((r) => r.price).filter((p): p is number => typeof p === "number");

  return {
    makes: uniqueSorted(data?.map((r) => r.make)),
    models: uniqueSorted(data?.map((r) => r.model)),
    bodyTypes: uniqueSorted(data?.map((r) => r.body_type)),
    fuelTypes: uniqueSorted(data?.map((r) => r.fuel_type)),
    minPriceBound: prices.length > 0 ? Math.min(...prices) : FALLBACK_MIN_PRICE_BOUND,
    maxPriceBound: prices.length > 0 ? Math.max(...prices) : FALLBACK_MAX_PRICE_BOUND,
  };
}

export async function buildVehicleQuery(supabase: SupabaseServerClient, filters: VehicleSearchFilters) {
  let query = supabase
    .from("vehicles")
    .select(`${VEHICLE_SELECT_COLUMNS}, showroom_id, showrooms(business_name)`, { count: "exact" })
    .eq("status", "ACTIVE");

  if (filters.q) {
    // Split into words and require EVERY word to match *something* (title,
    // make, model, or year) — previously the whole multi-word string was
    // tested as one contiguous ilike pattern against each field, so a
    // search like "2020 Toyota" only matched if a vehicle's title happened
    // to contain that literal two-word substring in that exact order,
    // which real listing titles (e.g. "Toyota Corolla 2020 XLI") almost
    // never do — a search combining a year with a brand/model effectively
    // always returned zero results. Each word gets its own OR-group across
    // fields; multiple such groups AND together (word1 matches something
    // AND word2 matches something AND ...), same semantics as a real
    // multi-word search engine, not a single-substring match.
    //
    // PostgREST's `or()` can't reference an embedded table's column
    // (confirmed live — it rejects `showrooms.business_name...` inside a
    // top-level `or` with a parse error), so a showroom-name match is a
    // separate lookup on the *whole* query string (not per-word — a
    // showroom name like "Rift Valley Motors" should match as a phrase),
    // folded in as an independent alternative: the vehicle either matches
    // every word itself, OR it belongs to a showroom whose name matches
    // the full search phrase.
    const words = filters.q.trim().split(/\s+/).filter(Boolean);
    const wordGroups = words.map((word) => {
      const escapedWord = escapeForOrFilter(`%${word}%`);
      const fieldMatches = [`title.ilike.${escapedWord}`, `make.ilike.${escapedWord}`, `model.ilike.${escapedWord}`];
      if (/^\d{4}$/.test(word)) fieldMatches.push(`year.eq.${word}`);
      return `or(${fieldMatches.join(",")})`;
    });

    const orParts = [`and(${wordGroups.join(",")})`];

    const { data: matchingShowrooms } = await supabase.from("showrooms").select("id").ilike("business_name", `%${filters.q}%`);
    if (matchingShowrooms && matchingShowrooms.length > 0) {
      orParts.push(`showroom_id.in.(${matchingShowrooms.map((s) => s.id).join(",")})`);
    }

    query = query.or(orParts.join(","));
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
