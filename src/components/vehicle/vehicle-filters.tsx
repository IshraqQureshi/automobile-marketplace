import type { VehicleSearchFilters } from "@/features/vehicle/search";

export interface VehicleFilterOptions {
  makes: string[];
  models: string[];
  bodyTypes: string[];
  fuelTypes: string[];
}

interface VehicleFiltersProps {
  filters: VehicleSearchFilters;
  options: VehicleFilterOptions;
}

const selectClassName =
  "w-full rounded-md border border-neutral-300 px-3 py-2.5 text-sm text-neutral-700 outline-none focus:border-brand focus:ring-1 focus:ring-brand";

/**
 * Plain server-rendered GET form (no "use client", no JS required) — every
 * filter is just a named input, and submitting takes the browser straight to
 * `/vehicles?make=...&bodyType=...` etc. "Model" isn't dependent on the
 * selected "Make" (both list independently) since that would need client
 * state to filter live without JS; picking a mismatched pair just yields a
 * real empty state rather than a broken one — an intentional simplification.
 * Sort has its own small client component (vehicle-sort-select.tsx) since,
 * unlike these, it's expected to apply immediately on change.
 */
export function VehicleFilters({ filters, options }: VehicleFiltersProps) {
  return (
    <form method="GET" action="/listing" className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-1 lg:gap-4">
      <div className="col-span-2 sm:col-span-3 lg:col-span-1">
        <label htmlFor="vehicle-search-q" className="mb-1.5 block text-xs font-semibold text-neutral-600">
          Keyword
        </label>
        <input
          id="vehicle-search-q"
          type="search"
          name="q"
          defaultValue={filters.q}
          placeholder="e.g. Toyota Fielder"
          className={selectClassName}
        />
      </div>

      <FilterSelect label="Brand" name="make" value={filters.make} options={options.makes} />
      <FilterSelect label="Model" name="model" value={filters.model} options={options.models} />
      <FilterSelect label="Body Type" name="bodyType" value={filters.bodyType} options={options.bodyTypes} />
      <FilterSelect label="Fuel Type" name="fuelType" value={filters.fuelType} options={options.fuelTypes} />

      <div>
        <label htmlFor="vehicle-min-price" className="mb-1.5 block text-xs font-semibold text-neutral-600">
          Min Price (KSh)
        </label>
        <input
          id="vehicle-min-price"
          type="number"
          name="minPrice"
          min={0}
          defaultValue={filters.minPrice ?? ""}
          className={selectClassName}
        />
      </div>
      <div>
        <label htmlFor="vehicle-max-price" className="mb-1.5 block text-xs font-semibold text-neutral-600">
          Max Price (KSh)
        </label>
        <input
          id="vehicle-max-price"
          type="number"
          name="maxPrice"
          min={0}
          defaultValue={filters.maxPrice ?? ""}
          className={selectClassName}
        />
      </div>
      <div>
        <label htmlFor="vehicle-min-year" className="mb-1.5 block text-xs font-semibold text-neutral-600">
          Min Year
        </label>
        <input id="vehicle-min-year" type="number" name="minYear" defaultValue={filters.minYear ?? ""} className={selectClassName} />
      </div>
      <div>
        <label htmlFor="vehicle-max-year" className="mb-1.5 block text-xs font-semibold text-neutral-600">
          Max Year
        </label>
        <input id="vehicle-max-year" type="number" name="maxYear" defaultValue={filters.maxYear ?? ""} className={selectClassName} />
      </div>

      {/* Sort/page live outside this form's own concern (sort has its own auto-submitting
          control; page always resets to 1 on a new filter submission by simply not
          including a page field here), but preserving the current sort choice across a
          filter change is expected — carried through as a hidden field. */}
      {filters.sort !== "newest" && <input type="hidden" name="sort" value={filters.sort} />}

      <button type="submit" className="col-span-2 rounded-md bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark sm:col-span-3 lg:col-span-1">
        Apply Filters
      </button>
    </form>
  );
}

function FilterSelect({ label, name, value, options }: { label: string; name: string; value: string; options: string[] }) {
  return (
    <div>
      <label htmlFor={`vehicle-filter-${name}`} className="mb-1.5 block text-xs font-semibold text-neutral-600">
        {label}
      </label>
      <select id={`vehicle-filter-${name}`} name={name} defaultValue={value} className={selectClassName}>
        <option value="">All {label}</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </div>
  );
}
