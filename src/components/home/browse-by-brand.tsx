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
    <section className="border-b border-neutral-200 bg-white px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-5xl">
        <p className="mb-6 text-center text-[10px] font-semibold tracking-[0.2em] text-neutral-400 uppercase">Browse by brand</p>
        <div className="grid grid-cols-4 gap-x-4 gap-y-6 sm:grid-cols-8">
          {brands.map((brand) => (
            <button
              key={brand.id}
              type="button"
              disabled
              title="Browse by brand — coming soon"
              className="flex flex-col items-center gap-2 disabled:cursor-not-allowed"
            >
              {brand.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- small decorative brand mark, dozens can render per grid
                <img src={brand.logoUrl} alt="" className="h-10 w-10 rounded-full border border-neutral-200 object-contain p-1.5" />
              ) : (
                <InitialAvatar name={brand.name} />
              )}
              <span className="text-xs font-medium text-neutral-600">{brand.name}</span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
