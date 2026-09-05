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
 * Each tile would filter the vehicle listing by brand — that page (MKT-002)
 * doesn't exist yet, so these render as inert buttons ("coming soon"),
 * same convention as the header's own disabled Brands/Model/Type nav.
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
            <button
              key={brand.id}
              type="button"
              disabled
              title="Browse by brand — coming soon"
              className="flex flex-col items-center gap-1.5 rounded-lg py-2 disabled:cursor-not-allowed"
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
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
