import type { Metadata } from "next";
import { Pagination } from "@/components/vehicle/pagination";
import { VehicleCard } from "@/components/vehicle/vehicle-card";
import { VehicleFilters, type VehicleFilterOptions } from "@/components/vehicle/vehicle-filters";
import { VehicleSortSelect } from "@/components/vehicle/vehicle-sort-select";
import { parseVehicleSearchFilters, VEHICLES_PER_PAGE, type VehicleSearchParamsInput } from "@/features/vehicle/search";
import { VEHICLE_SELECT_COLUMNS, vehicleRowToListItem, type VehicleWithShowroom } from "@/features/vehicle/types";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Browse Vehicles — HarakaGari",
  description: "Search and filter verified vehicle listings from certified showrooms across Kenya, by make, model, price, year, fuel type and more.",
  alternates: { canonical: "/vehicles" },
};

// Filter dropdown options are derived from real currently-ACTIVE listings
// (not the separately admin-managed brands/models/vehicle_types catalog
// tables, which aren't FK'd to vehicles.make/model/body_type) — capped the
// same way the homepage's own aggregation is, so a dropdown option is never
// offered unless it can actually return a result.
const MAX_VEHICLES_FOR_FILTER_OPTIONS = 2000;

interface VehiclesPageProps {
  searchParams: Promise<VehicleSearchParamsInput>;
}

export default async function VehiclesPage({ searchParams }: VehiclesPageProps) {
  const resolvedSearchParams = await searchParams;
  const filters = parseVehicleSearchFilters(resolvedSearchParams);
  const supabase = await createClient();

  const [{ data: optionRows }, { data: vehicleRows, count }] = await Promise.all([
    supabase.from("vehicles").select("make, model, body_type, fuel_type").eq("status", "ACTIVE").limit(MAX_VEHICLES_FOR_FILTER_OPTIONS),
    buildVehicleQuery(supabase, filters),
  ]);

  const options: VehicleFilterOptions = {
    makes: uniqueSorted(optionRows?.map((r) => r.make)),
    models: uniqueSorted(optionRows?.map((r) => r.model)),
    bodyTypes: uniqueSorted(optionRows?.map((r) => r.body_type)),
    fuelTypes: uniqueSorted(optionRows?.map((r) => r.fuel_type)),
  };

  const getPhotoUrl = (storagePath: string) => supabase.storage.from("vehicle-media").getPublicUrl(storagePath).data.publicUrl;
  const vehicles: VehicleWithShowroom[] = (vehicleRows ?? []).map((row) => ({
    ...vehicleRowToListItem(row, getPhotoUrl),
    showroomId: row.showroom_id,
    showroomName: row.showrooms?.business_name ?? "Unknown showroom",
  }));

  const totalCount = count ?? 0;

  return (
    <div className="mx-auto max-w-7xl px-6 py-10 md:px-12">
      <h1 className="font-display text-3xl font-bold text-neutral-900">Browse Vehicles</h1>
      <p className="mt-1 text-sm text-neutral-500">
        {totalCount === 0 ? "No listings match your filters" : `${totalCount.toLocaleString("en-KE")} listing${totalCount === 1 ? "" : "s"} found`}
      </p>

      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-[260px_1fr]">
        <aside>
          <VehicleFilters filters={filters} options={options} />
        </aside>

        <div>
          <div className="mb-5 flex justify-end">
            <VehicleSortSelect value={filters.sort} />
          </div>

          {vehicles.length === 0 ? (
            <div className="rounded-xl border border-dashed border-neutral-300 bg-white px-6 py-16 text-center">
              <p className="text-sm font-medium text-neutral-500">No vehicles match your search</p>
              <p className="mt-1 text-xs text-neutral-400">Try adjusting or clearing your filters.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {vehicles.map((vehicle) => (
                <VehicleCard key={vehicle.id} vehicle={vehicle} />
              ))}
            </div>
          )}

          <Pagination filters={filters} totalCount={totalCount} perPage={VEHICLES_PER_PAGE} basePath="/vehicles" />
        </div>
      </div>
    </div>
  );
}

function uniqueSorted(values: (string | null | undefined)[] | undefined): string[] {
  return [...new Set((values ?? []).filter((v): v is string => Boolean(v)))].sort((a, b) => a.localeCompare(b));
}

function buildVehicleQuery(supabase: Awaited<ReturnType<typeof createClient>>, filters: ReturnType<typeof parseVehicleSearchFilters>) {
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
