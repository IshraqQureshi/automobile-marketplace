import { VehicleListingResults } from "@/components/vehicle/vehicle-listing-results";
import type { VehicleFilterOptions } from "@/features/vehicle/listing-query";
import type { VehicleSearchFilters } from "@/features/vehicle/search";
import type { VehicleWithShowroom } from "@/features/vehicle/types";

interface VehicleListingPageContentProps {
  heading: string;
  filters: VehicleSearchFilters;
  options: VehicleFilterOptions;
  vehicles: VehicleWithShowroom[];
  totalCount: number;
  basePath: string;
  buildPaginationHref: (page: number) => string;
}

/**
 * The <h1>/result-count line + filter/sort/grid/pagination shared by every
 * vehicle listing page: /listing (all filters via query string) and the
 * SEO-friendly landing pages /listing/[brand], /listing/[brand]/[model],
 * /listing/type/[bodyType], /listing/fuel/[fuelType] — each resolves its
 * own path segment(s) to a canonical filter value and picks its own
 * heading/canonical path, but renders through this one shared body.
 */
export function VehicleListingPageContent({
  heading,
  filters,
  options,
  vehicles,
  totalCount,
  basePath,
  buildPaginationHref,
}: VehicleListingPageContentProps) {
  return (
    <div className="mx-auto max-w-7xl px-6 py-10 md:px-12">
      <h1 className="font-display text-3xl font-bold text-neutral-900">{heading}</h1>
      <p className="mt-1 text-sm text-neutral-500">
        {totalCount === 0 ? "No cars match your filters" : `${totalCount.toLocaleString("en-KE")} car${totalCount === 1 ? "" : "s"} found`}
      </p>

      <VehicleListingResults
        filters={filters}
        options={options}
        vehicles={vehicles}
        totalCount={totalCount}
        basePath={basePath}
        buildPaginationHref={buildPaginationHref}
      />
    </div>
  );
}
