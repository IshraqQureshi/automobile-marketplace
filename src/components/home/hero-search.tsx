import Image from "next/image";
import { SearchIcon, ShowroomIcon } from "@/components/admin/admin-ui";

export interface CertifiedShowroomItem {
  id: string;
  name: string;
  logoUrl: string | null;
}

interface HeroSearchProps {
  showroomCount: number;
  vehicleCount: number;
  showrooms: CertifiedShowroomItem[];
}

const numberFormatter = new Intl.NumberFormat("en-KE");

/**
 * Search is visually present per the design but not yet wired to a real
 * destination — public vehicle search/listing (MKT-002) doesn't exist yet,
 * same "designed but dependency not ready" reasoning as the header's own
 * disabled Brands/Model/Type nav and search icon (src/components/layout/header.tsx).
 *
 * The certified-showrooms marquee is part of this same section (not a
 * separate component) — it's visually one continuous dark band with the
 * search banner above it, confirmed against the real rendered design.
 */
export function HeroSearch({ showroomCount, vehicleCount, showrooms }: HeroSearchProps) {
  return (
    <section className="relative overflow-hidden bg-brand">
      <div
        className="absolute inset-0 opacity-[0.07]"
        style={{ backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)", backgroundSize: "24px 24px" }}
      />

      <div className="relative z-10 px-6 pt-10 pb-8 text-center">
        <p className="mb-2 text-xs font-semibold tracking-[0.2em] text-white/60 uppercase">The Premium Car Marketplace</p>
        <p className="mb-7 text-sm text-white/65">
          Search across {numberFormatter.format(showroomCount)}+ certified showrooms — {numberFormatter.format(vehicleCount)}+ verified listings.
        </p>

        <div className="mx-auto flex max-w-2xl flex-col gap-2 sm:flex-row sm:gap-0 sm:rounded-md sm:shadow-lg">
          <div className="flex flex-1 items-stretch overflow-hidden rounded-md sm:rounded-l-md sm:rounded-r-none">
            <div className="flex items-center bg-white pr-2 pl-4 text-neutral-400">
              <SearchIcon />
            </div>
            <input
              type="search"
              disabled
              title="Vehicle search — coming soon"
              placeholder="Search by make, model, or showroom…"
              className="w-full bg-white py-3.5 pr-3 pl-3 text-sm text-neutral-900 outline-none placeholder:text-neutral-400 disabled:cursor-not-allowed"
            />
          </div>
          <button
            type="button"
            disabled
            title="Vehicle search — coming soon"
            className="rounded-md bg-brand-dark px-7 py-3.5 text-sm font-semibold text-white sm:rounded-l-none sm:rounded-r-md disabled:cursor-not-allowed disabled:opacity-90"
          >
            Search
          </button>
        </div>

        <div className="flex items-center justify-center gap-2 pt-6 pb-2">
          <span className="text-[11px] font-medium text-white/50">Powered by</span>
          <Image src="/aresa-logo.jpg" alt="Arresa" width={64} height={30} className="h-4.5 w-auto rounded-[3px]" />
        </div>
      </div>

      {showrooms.length > 0 && (
        <div className="relative border-t border-white/10 bg-black/[0.18] py-3">
          <p className="mb-3 text-center text-[9px] font-semibold tracking-[0.22em] text-white/30 uppercase">Certified Showrooms</p>
          <div className="relative overflow-hidden">
            <div
              className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16"
              style={{ background: "linear-gradient(to right, rgba(0,79,75,0.95), transparent)" }}
            />
            <div
              className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16"
              style={{ background: "linear-gradient(to left, rgba(0,79,75,0.95), transparent)" }}
            />
            {/* Names are decorative here (not yet linkable — showroom detail pages don't
                exist), and the track duplicates every item to loop seamlessly, so the
                whole scroller is hidden from assistive tech to avoid announcing each
                name twice; the showroom/vehicle counts above already convey the same
                information in text. */}
            <div className="flex w-max animate-marquee items-center" aria-hidden="true">
              {[...showrooms, ...showrooms].map((showroom, index) => (
                <div key={`${showroom.id}-${index}`} className="mx-7 flex shrink-0 items-center gap-2.5">
                  {showroom.logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element -- tiny decorative marquee badge, no build-time-known dimensions
                    <img src={showroom.logoUrl} alt="" className="h-9 w-9 shrink-0 rounded-[5px] object-cover shadow-md" />
                  ) : (
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[5px] bg-white text-brand shadow-md">
                      <ShowroomIcon className="h-4 w-4" />
                    </span>
                  )}
                  <span className="text-[13px] font-medium whitespace-nowrap text-white/80">{showroom.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
