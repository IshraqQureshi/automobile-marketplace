import type { Metadata } from "next";
import { Pagination } from "@/components/vehicle/pagination";
import { ShowroomCard, type ShowroomCardData } from "@/components/showroom/showroom-card";
import { ShowroomFilters, type ShowroomFilterOptions } from "@/components/showroom/showroom-filters";
import { ShowroomSortSelect } from "@/components/showroom/showroom-sort-select";
import { getShowroomDetailPath } from "@/features/showroom/slug";
import { parseShowroomSearchFilters, SHOWROOMS_PER_PAGE, showroomSearchFiltersToParams, type ShowroomSearchParamsInput } from "@/features/showroom/search";
import { buildShowroomItemListJsonLd } from "@/lib/structured-data";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Certified Showrooms — HarakaGari",
  description: "Browse verified, certified vehicle showrooms across Kenya. Search by name or city to find a dealer near you.",
  alternates: { canonical: "/showrooms" },
};

// City dropdown options are derived from real currently-APPROVED showrooms
// (there's no separate admin-managed cities catalog table), same reasoning
// as the vehicle listing's own MAX_..._FOR_FILTER_OPTIONS cap.
const MAX_SHOWROOMS_FOR_FILTER_OPTIONS = 2000;

interface ShowroomsPageProps {
  searchParams: Promise<ShowroomSearchParamsInput>;
}

export default async function ShowroomsPage({ searchParams }: ShowroomsPageProps) {
  const resolvedSearchParams = await searchParams;
  const filters = parseShowroomSearchFilters(resolvedSearchParams);
  const supabase = await createClient();

  const [{ data: cityRows }, { data: showroomRows, count }] = await Promise.all([
    supabase.from("showrooms").select("city").eq("status", "APPROVED").limit(MAX_SHOWROOMS_FOR_FILTER_OPTIONS),
    buildShowroomQuery(supabase, filters),
  ]);

  const options: ShowroomFilterOptions = {
    cities: [...new Set((cityRows ?? []).map((r) => r.city).filter((c): c is string => Boolean(c)))].sort((a, b) => a.localeCompare(b)),
  };

  const showroomIds = (showroomRows ?? []).map((r) => r.id);
  const { data: activeVehicleRows } =
    showroomIds.length > 0 ? await supabase.from("vehicles").select("showroom_id").eq("status", "ACTIVE").in("showroom_id", showroomIds) : { data: [] };
  const vehicleCountByShowroom = new Map<string, number>();
  for (const row of activeVehicleRows ?? []) vehicleCountByShowroom.set(row.showroom_id, (vehicleCountByShowroom.get(row.showroom_id) ?? 0) + 1);

  const showrooms: ShowroomCardData[] = (showroomRows ?? []).map((row) => ({
    id: row.id,
    businessName: row.business_name,
    city: row.city,
    description: row.description,
    verified: row.verified,
    logoUrl: row.logo_storage_path ? supabase.storage.from("showroom-logos").getPublicUrl(row.logo_storage_path).data.publicUrl : null,
    activeVehicleCount: vehicleCountByShowroom.get(row.id) ?? 0,
  }));

  const totalCount = count ?? 0;

  const itemListJsonLd = buildShowroomItemListJsonLd(
    showrooms.map((showroom) => ({
      id: showroom.id,
      businessName: showroom.businessName,
      path: getShowroomDetailPath({ id: showroom.id, businessName: showroom.businessName }),
    })),
  );

  return (
    <div className="mx-auto max-w-7xl px-6 py-10 md:px-12">
      {showrooms.length > 0 && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }} />}
      <h1 className="font-display text-3xl font-bold text-neutral-900">Certified Showrooms</h1>
      <p className="mt-1 text-sm text-neutral-500">
        {totalCount === 0 ? "No showrooms match your search" : `${totalCount.toLocaleString("en-KE")} showroom${totalCount === 1 ? "" : "s"} found`}
      </p>

      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-[260px_1fr]">
        <aside>
          <ShowroomFilters filters={filters} options={options} />
        </aside>

        <div>
          <div className="mb-5 flex justify-end">
            <ShowroomSortSelect value={filters.sort} />
          </div>

          {showrooms.length === 0 ? (
            <div className="rounded-xl border border-dashed border-neutral-300 bg-white px-6 py-16 text-center">
              <p className="text-sm font-medium text-neutral-500">No showrooms match your search</p>
              <p className="mt-1 text-xs text-neutral-400">Try adjusting or clearing your filters.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              {showrooms.map((showroom) => (
                <ShowroomCard key={showroom.id} showroom={showroom} />
              ))}
            </div>
          )}

          <Pagination
            currentPage={filters.page}
            totalCount={totalCount}
            perPage={SHOWROOMS_PER_PAGE}
            buildHref={(page) => {
              const params = showroomSearchFiltersToParams({ ...filters, page });
              const query = params.toString();
              return query ? `/showrooms?${query}` : "/showrooms";
            }}
          />
        </div>
      </div>
    </div>
  );
}

function buildShowroomQuery(supabase: Awaited<ReturnType<typeof createClient>>, filters: ReturnType<typeof parseShowroomSearchFilters>) {
  let query = supabase
    .from("showrooms")
    .select("id, business_name, city, description, verified, logo_storage_path", { count: "exact" })
    .eq("status", "APPROVED");

  if (filters.q) {
    query = query.or(`business_name.ilike.%${filters.q}%,description.ilike.%${filters.q}%`);
  }
  if (filters.city) query = query.eq("city", filters.city);

  switch (filters.sort) {
    case "name-asc":
      query = query.order("business_name", { ascending: true });
      break;
    case "newest":
    default:
      query = query.order("created_at", { ascending: false });
      break;
  }

  const from = (filters.page - 1) * SHOWROOMS_PER_PAGE;
  const to = from + SHOWROOMS_PER_PAGE - 1;
  return query.range(from, to);
}
