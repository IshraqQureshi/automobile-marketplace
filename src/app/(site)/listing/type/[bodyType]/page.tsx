import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { VehicleListingPageContent } from "@/components/vehicle/vehicle-listing-page-content";
import { fetchVehicleFilterOptions, fetchVehicleListingPage } from "@/features/vehicle/listing-query";
import { resolveCanonicalBodyType } from "@/features/vehicle/listing-slugs";
import { parseVehicleSearchFilters, vehicleSearchFiltersToParams, type VehicleSearchParamsInput } from "@/features/vehicle/search";
import { createClient } from "@/lib/supabase/server";

interface BodyTypeListingPageProps {
  params: Promise<{ bodyType: string }>;
  searchParams: Promise<VehicleSearchParamsInput>;
}

/**
 * SEO-friendly landing page for a body shape — /listing/type/sedan instead
 * of /listing?bodyType=Sedan (what the header's Type nav dropdown used to
 * link to for a real body shape; a fuel-type-named entry from that same
 * dropdown goes to /listing/fuel/[fuelType] instead — see
 * resolveCanonicalBodyType's own reasoning for why the two are kept apart).
 * A literal "type" path segment (rather than reusing /listing/[brand]'s
 * single-segment slot) avoids any ambiguity with a brand slug.
 */
export async function generateMetadata({ params }: BodyTypeListingPageProps): Promise<Metadata> {
  const { bodyType } = await params;
  const canonicalBodyType = await resolveCanonicalBodyType(bodyType);
  if (!canonicalBodyType) return { title: "Body type not found — HarakaGari" };

  const title = `${canonicalBodyType} Cars for Sale in Kenya — HarakaGari`;
  const description = `Browse verified ${canonicalBodyType.toLowerCase()} listings from certified showrooms across Kenya — real prices, mileage, and dealer contact details.`;
  return { title, description, alternates: { canonical: `/listing/type/${bodyType}` } };
}

export default async function BodyTypeListingPage({ params, searchParams }: BodyTypeListingPageProps) {
  const { bodyType } = await params;
  const canonicalBodyType = await resolveCanonicalBodyType(bodyType);
  if (!canonicalBodyType) notFound();

  const resolvedSearchParams = await searchParams;
  const filters = { ...parseVehicleSearchFilters(resolvedSearchParams), bodyType: canonicalBodyType };
  const supabase = await createClient();

  const [options, { vehicles, totalCount }] = await Promise.all([
    fetchVehicleFilterOptions(supabase),
    fetchVehicleListingPage(supabase, filters),
  ]);

  return (
    <VehicleListingPageContent
      heading={`${canonicalBodyType} Cars for Sale in Kenya`}
      filters={filters}
      options={options}
      vehicles={vehicles}
      totalCount={totalCount}
      basePath={`/listing/type/${bodyType}`}
      buildPaginationHref={(page) => {
        const params = vehicleSearchFiltersToParams({ ...filters, bodyType: "", page });
        const query = params.toString();
        return query ? `/listing/type/${bodyType}?${query}` : `/listing/type/${bodyType}`;
      }}
    />
  );
}
