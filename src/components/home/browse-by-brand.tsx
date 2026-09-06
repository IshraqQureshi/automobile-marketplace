import Link from "next/link";
import { InitialAvatar } from "@/components/admin/admin-ui";

export interface BrandTileItem {
  id: string;
  name: string;
  logoUrl: string | null;
}

interface BrowseByBrandProps {
  brands: BrandTileItem[];
}

/**
 * Each tile filters the marketplace vehicle listing (MKT-002, /vehicles) by
 * brand name — vehicles.make is a plain text column, not FK'd to the brands
 * catalog table, so this links on the brand's real name rather than its id.
 */
export function BrowseByBrand({ brands }: BrowseByBrandProps) {
  if (brands.length === 0) return null;

  return (
    <section className="border-b border-neutral-200 bg-white px-6 py-5 md:px-12">
      <div className="mx-auto max-w-7xl">
        <div className="mb-4 flex items-center gap-3">
          <span className="shrink-0 text-[10px] font-semibold tracking-[0.18em] text-neutral-400 uppercase">Browse by Brand</span>
          <div className="h-px flex-1 bg-neutral-100" />
        </div>
        <div className="grid grid-cols-4 gap-1 sm:grid-cols-8">
          {brands.map((brand) => (
            <Link
              key={brand.id}
              href={`/vehicles?make=${encodeURIComponent(brand.name)}`}
              className="flex flex-col items-center gap-1.5 rounded-lg py-2 no-underline hover:bg-neutral-50"
            >
              {brand.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- small decorative brand mark, dozens can render per grid
                <img
                  src={brand.logoUrl}
                  alt=""
                  className="h-10 w-10 rounded-full border border-neutral-200 bg-neutral-50 object-contain p-1.5"
                />
              ) : (
                <InitialAvatar name={brand.name} />
              )}
              <span className="text-center text-[10px] leading-tight font-medium text-neutral-600">{brand.name}</span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
