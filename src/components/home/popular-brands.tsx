import { InitialAvatar } from "@/components/admin/admin-ui";

export interface PopularBrandItem {
  id: string;
  name: string;
  logoUrl: string | null;
  listingCount: number;
}

interface PopularBrandsProps {
  brands: PopularBrandItem[];
}

export function PopularBrands({ brands }: PopularBrandsProps) {
  if (brands.length === 0) return null;

  return (
    <section className="bg-white px-4 py-12 sm:px-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="font-display text-2xl font-semibold text-neutral-900">Popular Brands</h2>
          <button type="button" disabled title="Coming soon" className="text-sm font-medium text-brand disabled:cursor-not-allowed disabled:opacity-60">
            All brands →
          </button>
        </div>

        <div className="grid grid-cols-3 gap-4 sm:grid-cols-5 lg:grid-cols-10">
          {brands.map((brand) => (
            <div key={brand.id} className="flex flex-col items-center gap-2 text-center">
              {brand.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- small decorative brand mark
                <img src={brand.logoUrl} alt="" className="h-12 w-12 rounded-full border border-neutral-200 object-contain p-2" />
              ) : (
                <InitialAvatar name={brand.name} />
              )}
              <div>
                <p className="text-xs font-medium text-neutral-800">{brand.name}</p>
                <p className="text-[11px] text-neutral-400 tabular-nums">{brand.listingCount} listings</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
