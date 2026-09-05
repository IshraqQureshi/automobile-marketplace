import { SearchIcon } from "@/components/admin/admin-ui";

interface HeroSearchProps {
  showroomCount: number;
  vehicleCount: number;
}

const numberFormatter = new Intl.NumberFormat("en-KE");

/**
 * Search is visually present per the design but not yet wired to a real
 * destination — public vehicle search/listing (MKT-002) doesn't exist yet,
 * same "designed but dependency not ready" reasoning as the header's own
 * disabled Brands/Model/Type nav and search icon (src/components/layout/header.tsx).
 */
export function HeroSearch({ showroomCount, vehicleCount }: HeroSearchProps) {
  return (
    <section className="bg-brand px-4 py-14 text-center sm:px-6">
      <div className="mx-auto max-w-3xl">
        <p className="text-xs font-semibold tracking-[0.2em] text-white/70 uppercase">The premium car marketplace</p>
        <p className="mt-2 text-sm text-white/80">
          Search across {numberFormatter.format(showroomCount)}+ certified showrooms — {numberFormatter.format(vehicleCount)}+ verified listings.
        </p>

        <div className="mt-6 flex items-center gap-2 rounded-md bg-white p-1.5 shadow-lg">
          <span className="pl-2.5 text-neutral-400">
            <SearchIcon />
          </span>
          <input
            type="search"
            disabled
            title="Vehicle search — coming soon"
            placeholder="Search by make, model, or showroom…"
            className="w-full bg-transparent py-2 text-sm text-neutral-700 outline-none placeholder:text-neutral-400 disabled:cursor-not-allowed"
          />
          <button
            type="button"
            disabled
            title="Vehicle search — coming soon"
            className="shrink-0 rounded-md bg-brand-dark px-5 py-2.5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-80"
          >
            Search
          </button>
        </div>
      </div>
    </section>
  );
}
