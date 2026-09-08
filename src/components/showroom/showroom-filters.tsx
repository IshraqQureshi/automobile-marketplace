import type { ShowroomSearchFilters } from "@/features/showroom/search";

export interface ShowroomFilterOptions {
  cities: string[];
}

interface ShowroomFiltersProps {
  filters: ShowroomSearchFilters;
  options: ShowroomFilterOptions;
}

const inputClassName =
  "w-full rounded-md border border-neutral-300 px-3 py-2.5 text-sm text-neutral-700 outline-none focus:border-brand focus:ring-1 focus:ring-brand";

/**
 * Plain server-rendered GET form (no "use client", no JS required) — same
 * pattern as VehicleFilters, deliberately reused rather than inventing a
 * second one. Sort has its own small client component
 * (showroom-sort-select.tsx), same precedent as VehicleSortSelect.
 */
export function ShowroomFilters({ filters, options }: ShowroomFiltersProps) {
  return (
    <form method="GET" action="/showrooms" className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-1 lg:gap-4">
      <div className="col-span-2 sm:col-span-3 lg:col-span-1">
        <label htmlFor="showroom-search-q" className="mb-1.5 block text-xs font-semibold text-neutral-600">
          Keyword
        </label>
        <input
          id="showroom-search-q"
          type="search"
          name="q"
          defaultValue={filters.q}
          placeholder="e.g. Mr Carscout"
          className={inputClassName}
        />
      </div>

      <div>
        <label htmlFor="showroom-filter-city" className="mb-1.5 block text-xs font-semibold text-neutral-600">
          City
        </label>
        <select id="showroom-filter-city" name="city" defaultValue={filters.city} className={inputClassName}>
          <option value="">All Cities</option>
          {options.cities.map((city) => (
            <option key={city} value={city}>
              {city}
            </option>
          ))}
        </select>
      </div>

      {/* Sort lives outside this form's own concern (its own auto-submitting
          control), but preserving the current choice across a filter change
          is expected — carried through as a hidden field, same as
          VehicleFilters' own sort field. */}
      {filters.sort !== "newest" && <input type="hidden" name="sort" value={filters.sort} />}

      <button
        type="submit"
        className="col-span-2 rounded-md bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark sm:col-span-3 lg:col-span-1"
      >
        Apply Filters
      </button>
    </form>
  );
}
