import type { Metadata } from "next";
import { VehicleListingPageContent } from "@/components/vehicle/vehicle-listing-page-content";
import { fetchVehicleFilterOptions, fetchVehicleListingPage } from "@/features/vehicle/listing-query";
import { parseVehicleSearchFilters, vehicleSearchFiltersToParams, type VehicleSearchParamsInput } from "@/features/vehicle/search";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Browse Listing — HarakaGari",
  description: "Search and filter verified vehicle listings from certified showrooms across Kenya, by brand, model, price, year, fuel type and more.",
  alternates: { canonical: "/listing" },
};

interface VehiclesPageProps {
  searchParams: Promise<VehicleSearchParamsInput>;
}

export default async function VehiclesPage({ searchParams }: VehiclesPageProps) {
  const resolvedSearchParams = await searchParams;
  const filters = parseVehicleSearchFilters(resolvedSearchParams);
  const supabase = await createClient();

  const [options, { vehicles, totalCount }] = await Promise.all([
    fetchVehicleFilterOptions(supabase),
    fetchVehicleListingPage(supabase, filters),
  ]);

  return (
    <VehicleListingPageContent
      heading="Browse Listing"
      filters={filters}
      options={options}
      vehicles={vehicles}
      totalCount={totalCount}
      sortSelectBasePath="/listing"
      buildPaginationHref={(page) => {
        const params = vehicleSearchFiltersToParams({ ...filters, page });
        const query = params.toString();
        return query ? `/listing?${query}` : "/listing";
      }}
    />
  );
}
