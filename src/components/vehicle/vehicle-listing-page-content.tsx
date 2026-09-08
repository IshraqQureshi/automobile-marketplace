import { VehicleListingResults } from "@/components/vehicle/vehicle-listing-results";
import type { VehicleFilterOptions } from "@/features/vehicle/listing-query";
import type { VehicleSearchFilters } from "@/features/vehicle/search";
import { getVehicleDetailPath } from "@/features/vehicle/slug";
import type { VehicleWithShowroom } from "@/features/vehicle/types";
import { buildVehicleItemListJsonLd } from "@/lib/structured-data";

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
  // Only the current page's own results — matches what's actually visible
  // on this page, not the full unpaginated result set (schema.org's own
  // guidance: structured data should reflect real, visible page content).
  const itemListJsonLd = buildVehicleItemListJsonLd(
    vehicles.map((vehicle) => ({
      id: vehicle.id,
      year: vehicle.year,
      make: vehicle.make,
      model: vehicle.model,
      price: vehicle.price,
      path: getVehicleDetailPath(vehicle),
      imageUrl: vehicle.photos.find((p) => p.isPrimary)?.url ?? vehicle.photos[0]?.url,
    })),
  );

  return (
    <div className="mx-auto max-w-7xl px-6 py-10 md:px-12">
      {vehicles.length > 0 && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }} />}
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
