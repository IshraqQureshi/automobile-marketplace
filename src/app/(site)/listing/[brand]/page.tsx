import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { VehicleListingPageContent } from "@/components/vehicle/vehicle-listing-page-content";
import { fetchVehicleFilterOptions, fetchVehicleListingPage } from "@/features/vehicle/listing-query";
import { resolveCanonicalMake } from "@/features/vehicle/listing-slugs";
import { parseVehicleSearchFilters, vehicleSearchFiltersToParams, type VehicleSearchParamsInput } from "@/features/vehicle/search";
import { createClient } from "@/lib/supabase/server";

interface BrandListingPageProps {
  params: Promise<{ brand: string }>;
  searchParams: Promise<VehicleSearchParamsInput>;
}

/**
 * SEO-friendly landing page for a single brand — /listing/toyota instead of
 * /listing?make=Toyota (the exact pattern the header's Brands nav dropdown,
 * the homepage's brand tiles, and the vehicle detail page's "browse this
 * brand" link all used to point at). See resolveCanonicalMake
 * (src/features/vehicle/listing-slugs.ts) for how the slug is resolved.
 */
export async function generateMetadata({ params }: BrandListingPageProps): Promise<Metadata> {
  const { brand } = await params;
  const canonicalMake = await resolveCanonicalMake(brand);
  if (!canonicalMake) return { title: "Brand not found — HarakaGari" };

  const title = `${canonicalMake} Cars for Sale in Kenya — HarakaGari`;
  const description = `Browse verified ${canonicalMake} listings from certified showrooms across Kenya — real prices, mileage, and dealer contact details.`;
  return { title, description, alternates: { canonical: `/listing/${brand}` } };
}

export default async function BrandListingPage({ params, searchParams }: BrandListingPageProps) {
  const { brand } = await params;
  const canonicalMake = await resolveCanonicalMake(brand);
  if (!canonicalMake) notFound();

  const resolvedSearchParams = await searchParams;
  // The brand is the path itself, not a query param — always the resolved
  // canonical value, regardless of whatever (if anything) a stray ?make=
  // query param says.
  const filters = { ...parseVehicleSearchFilters(resolvedSearchParams), make: canonicalMake };
  const supabase = await createClient();

  const [options, { vehicles, totalCount }] = await Promise.all([
    fetchVehicleFilterOptions(supabase, canonicalMake),
    fetchVehicleListingPage(supabase, filters),
  ]);

  return (
    <VehicleListingPageContent
      heading={`${canonicalMake} Cars for Sale in Kenya`}
      filters={filters}
      options={options}
      vehicles={vehicles}
      totalCount={totalCount}
      basePath={`/listing/${brand}`}
      buildPaginationHref={(page) => {
        // make deliberately omitted here — it's already encoded in the
        // path (/listing/{brand}), so re-adding it as a query param would
        // just produce a redundant, uglier URL for every paginated page.
        const params = vehicleSearchFiltersToParams({ ...filters, make: "", page });
        const query = params.toString();
        return query ? `/listing/${brand}?${query}` : `/listing/${brand}`;
      }}
    />
  );
}
