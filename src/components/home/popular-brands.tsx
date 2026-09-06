import Link from "next/link";
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
    <section className="bg-white px-6 py-12 md:px-12">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex items-end justify-between">
          <h2 className="font-display text-3xl font-bold text-neutral-900">Popular Brands</h2>
          <Link href="/vehicles" className="text-sm font-medium text-brand hover:text-brand-dark">
            All brands →
          </Link>
        </div>

        <div className="grid grid-cols-3 gap-4 sm:grid-cols-5 lg:grid-cols-10">
          {brands.map((brand) => (
            <Link
              key={brand.id}
              href={`/vehicles?make=${encodeURIComponent(brand.name)}`}
              className="flex flex-col items-center gap-2 text-center no-underline"
            >
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
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
