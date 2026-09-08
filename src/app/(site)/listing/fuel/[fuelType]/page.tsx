import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { VehicleListingPageContent } from "@/components/vehicle/vehicle-listing-page-content";
import { fetchVehicleFilterOptions, fetchVehicleListingPage } from "@/features/vehicle/listing-query";
import { resolveCanonicalFuelType } from "@/features/vehicle/listing-slugs";
import { parseVehicleSearchFilters, vehicleSearchFiltersToParams, type VehicleSearchParamsInput } from "@/features/vehicle/search";
import { createClient } from "@/lib/supabase/server";

interface FuelTypeListingPageProps {
  params: Promise<{ fuelType: string }>;
  searchParams: Promise<VehicleSearchParamsInput>;
}

/**
 * SEO-friendly landing page for a fuel type — /listing/fuel/diesel instead
 * of /listing?fuelType=Diesel. FUEL_TYPES is a small fixed app-level enum
 * (src/features/vehicle/schemas.ts), so resolution needs no DB query at
 * all — see resolveCanonicalFuelType.
 */
export async function generateMetadata({ params }: FuelTypeListingPageProps): Promise<Metadata> {
  const { fuelType } = await params;
  const canonicalFuelType = resolveCanonicalFuelType(fuelType);
  if (!canonicalFuelType) return { title: "Fuel type not found — HarakaGari" };

  const title = `${canonicalFuelType} Cars for Sale in Kenya — HarakaGari`;
  const description = `Browse verified ${canonicalFuelType.toLowerCase()} listings from certified showrooms across Kenya — real prices, mileage, and dealer contact details.`;
  return { title, description, alternates: { canonical: `/listing/fuel/${fuelType}` } };
}

export default async function FuelTypeListingPage({ params, searchParams }: FuelTypeListingPageProps) {
  const { fuelType } = await params;
  const canonicalFuelType = resolveCanonicalFuelType(fuelType);
  if (!canonicalFuelType) notFound();

  const resolvedSearchParams = await searchParams;
  const filters = { ...parseVehicleSearchFilters(resolvedSearchParams), fuelType: canonicalFuelType };
  const supabase = await createClient();

  const [options, { vehicles, totalCount }] = await Promise.all([
    fetchVehicleFilterOptions(supabase),
    fetchVehicleListingPage(supabase, filters),
  ]);

  return (
    <VehicleListingPageContent
      heading={`${canonicalFuelType} Cars for Sale in Kenya`}
      filters={filters}
      options={options}
      vehicles={vehicles}
      totalCount={totalCount}
      basePath={`/listing/fuel/${fuelType}`}
      buildPaginationHref={(page) => {
        const params = vehicleSearchFiltersToParams({ ...filters, fuelType: "", page });
        const query = params.toString();
        return query ? `/listing/fuel/${fuelType}?${query}` : `/listing/fuel/${fuelType}`;
      }}
    />
  );
}
