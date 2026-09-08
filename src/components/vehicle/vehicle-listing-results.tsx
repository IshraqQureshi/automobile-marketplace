import { Pagination } from "@/components/vehicle/pagination";
import { VehicleCard } from "@/components/vehicle/vehicle-card";
import { VehicleFilters } from "@/components/vehicle/vehicle-filters";
import { VehicleSortSelect } from "@/components/vehicle/vehicle-sort-select";
import type { VehicleFilterOptions } from "@/features/vehicle/listing-query";
import { VEHICLES_PER_PAGE, type VehicleSearchFilters } from "@/features/vehicle/search";
import type { VehicleWithShowroom } from "@/features/vehicle/types";

interface VehicleListingResultsProps {
  filters: VehicleSearchFilters;
  options: VehicleFilterOptions;
  vehicles: VehicleWithShowroom[];
  totalCount: number;
  // "/listing" for the flat filter UI, or "/listing/{brand-slug}" for the
  // SEO-friendly per-brand landing page — passed through to VehicleSortSelect
  // so an immediate sort change navigates relative to the right base path.
  sortSelectBasePath: string;
  buildPaginationHref: (page: number) => string;
}

/**
 * The filter sidebar + sort control + result grid + pagination shared by
 * /listing (src/app/(site)/listing/page.tsx) and /listing/[brand]
 * (the SEO-friendly per-brand landing page) — identical below the page's
 * own <h1>/metadata, which differ per page and stay page-specific.
 */
export function VehicleListingResults({
  filters,
  options,
  vehicles,
  totalCount,
  sortSelectBasePath,
  buildPaginationHref,
}: VehicleListingResultsProps) {
  return (
    <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-[260px_1fr]">
      <aside>
        <VehicleFilters filters={filters} options={options} />
      </aside>

      <div>
        <div className="mb-5 flex justify-end">
          <VehicleSortSelect value={filters.sort} basePath={sortSelectBasePath} />
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

        <Pagination currentPage={filters.page} totalCount={totalCount} perPage={VEHICLES_PER_PAGE} buildHref={buildPaginationHref} />
      </div>
    </div>
  );
}
