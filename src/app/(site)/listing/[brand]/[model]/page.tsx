import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { VehicleListingPageContent } from "@/components/vehicle/vehicle-listing-page-content";
import { fetchVehicleFilterOptions, fetchVehicleListingPage } from "@/features/vehicle/listing-query";
import { resolveCanonicalMake, resolveCanonicalModel } from "@/features/vehicle/listing-slugs";
import { parseVehicleSearchFilters, vehicleSearchFiltersToParams, type VehicleSearchParamsInput } from "@/features/vehicle/search";
import { createClient } from "@/lib/supabase/server";

interface BrandModelListingPageProps {
  params: Promise<{ brand: string; model: string }>;
  searchParams: Promise<VehicleSearchParamsInput>;
}

/**
 * SEO-friendly landing page for a brand+model pair — /listing/toyota/camry
 * instead of /listing?make=Toyota&model=Camry (what the header's Model nav
 * dropdown and the homepage's "Popular Models" both used to link to). Model
 * resolution (resolveCanonicalModel) is scoped to the already-resolved
 * brand, matching the models catalog table's own brand_id FK.
 */
async function resolve(brand: string, model: string) {
  const canonicalMake = await resolveCanonicalMake(brand);
  if (!canonicalMake) return null;
  const canonicalModel = await resolveCanonicalModel(canonicalMake, model);
  if (!canonicalModel) return null;
  return { canonicalMake, canonicalModel };
}

export async function generateMetadata({ params }: BrandModelListingPageProps): Promise<Metadata> {
  const { brand, model } = await params;
  const resolved = await resolve(brand, model);
  if (!resolved) return { title: "Model not found — HarakaGari" };

  const { canonicalMake, canonicalModel } = resolved;
  const title = `${canonicalMake} ${canonicalModel} for Sale in Kenya — HarakaGari`;
  const description = `Browse verified ${canonicalMake} ${canonicalModel} listings from certified showrooms across Kenya — real prices, mileage, and dealer contact details.`;
  return { title, description, alternates: { canonical: `/listing/${brand}/${model}` } };
}

export default async function BrandModelListingPage({ params, searchParams }: BrandModelListingPageProps) {
  const { brand, model } = await params;
  const resolved = await resolve(brand, model);
  if (!resolved) notFound();
  const { canonicalMake, canonicalModel } = resolved;

  const resolvedSearchParams = await searchParams;
  const filters = { ...parseVehicleSearchFilters(resolvedSearchParams), make: canonicalMake, model: canonicalModel };
  const supabase = await createClient();

  const [options, { vehicles, totalCount }] = await Promise.all([
    fetchVehicleFilterOptions(supabase, canonicalMake),
    fetchVehicleListingPage(supabase, filters),
  ]);

  return (
    <VehicleListingPageContent
      heading={`${canonicalMake} ${canonicalModel} for Sale in Kenya`}
      filters={filters}
      options={options}
      vehicles={vehicles}
      totalCount={totalCount}
      basePath={`/listing/${brand}/${model}`}
      buildPaginationHref={(page) => {
        const params = vehicleSearchFiltersToParams({ ...filters, make: "", model: "", page });
        const query = params.toString();
        return query ? `/listing/${brand}/${model}?${query}` : `/listing/${brand}/${model}`;
      }}
    />
  );
}
