// Pure parsing/validation for the public vehicle marketplace listing
// (MKT-002) — kept separate from the page component so the filter/sort/page
// parsing logic (the part with real edge cases: invalid numbers, unknown
// sort keys, out-of-range pages) is unit-testable without rendering a page.

export type VehicleSortKey = "relevance" | "newest" | "price-asc" | "price-desc" | "year-desc" | "mileage-asc";

export interface VehicleSortOption {
  value: VehicleSortKey;
  label: string;
}

// "Relevance" is a required sort option per MVP_REQUIREMENTS.md §5, but this
// project has no full-text-search/ranking infrastructure — with a keyword
// present it falls back to the same ordering as "Newest" (real, honest data,
// just not a true relevance ranking). Documented in MVP_PROGRESS.md.
export const VEHICLE_SORT_OPTIONS: VehicleSortOption[] = [
  { value: "newest", label: "Newest" },
  { value: "relevance", label: "Relevance" },
  { value: "price-asc", label: "Price: Low to High" },
  { value: "price-desc", label: "Price: High to Low" },
  { value: "year-desc", label: "Year: Newest First" },
  { value: "mileage-asc", label: "Mileage: Low to High" },
];

const DEFAULT_SORT: VehicleSortKey = "newest";
const VALID_SORT_KEYS = new Set<string>(VEHICLE_SORT_OPTIONS.map((o) => o.value));

export const VEHICLES_PER_PAGE = 24;

const MIN_YEAR = 1900;
const MAX_YEAR = new Date().getFullYear() + 1;
const MAX_PRICE = 1_000_000_000_000; // 1 trillion KES ceiling — generous, just prevents absurd/overflow input
const MAX_SEARCH_TERM_LENGTH = 100;

export interface VehicleSearchFilters {
  q: string;
  make: string;
  model: string;
  bodyType: string;
  fuelType: string;
  minPrice: number | null;
  maxPrice: number | null;
  minYear: number | null;
  maxYear: number | null;
  sort: VehicleSortKey;
  page: number;
}

export type VehicleSearchParamsInput = Record<string, string | string[] | undefined>;

function readString(params: VehicleSearchParamsInput, key: string): string {
  const value = params[key];
  return typeof value === "string" ? value.trim() : "";
}

function readNumber(params: VehicleSearchParamsInput, key: string, min: number, max: number): number | null {
  const raw = readString(params, key);
  if (!raw) return null;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return null;
  return Math.min(Math.max(parsed, min), max);
}

/**
 * Strips characters that would otherwise corrupt the PostgREST `.or(...)`
 * filter expression built from this term (`,`/`(`/`)` are the combinator's
 * own syntax) or carry unintended `ilike` wildcard meaning (`%`/`_`). A
 * search box isn't the place to support real wildcard/regex input, so
 * stripping (not escaping) keeps the query builder simple and safe.
 */
export function sanitizeSearchTerm(term: string): string {
  return term
    .replace(/[,()%_]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_SEARCH_TERM_LENGTH);
}

export function parseVehicleSearchFilters(params: VehicleSearchParamsInput): VehicleSearchFilters {
  const sortRaw = readString(params, "sort");
  const sort = VALID_SORT_KEYS.has(sortRaw) ? (sortRaw as VehicleSortKey) : DEFAULT_SORT;

  const pageRaw = Number(readString(params, "page"));
  const page = Number.isInteger(pageRaw) && pageRaw > 0 ? pageRaw : 1;

  return {
    q: sanitizeSearchTerm(readString(params, "q")),
    make: readString(params, "make"),
    model: readString(params, "model"),
    bodyType: readString(params, "bodyType"),
    fuelType: readString(params, "fuelType"),
    minPrice: readNumber(params, "minPrice", 0, MAX_PRICE),
    maxPrice: readNumber(params, "maxPrice", 0, MAX_PRICE),
    minYear: readNumber(params, "minYear", MIN_YEAR, MAX_YEAR),
    maxYear: readNumber(params, "maxYear", MIN_YEAR, MAX_YEAR),
    sort,
    page,
  };
}

export function vehicleSearchFiltersToParams(filters: Partial<VehicleSearchFilters>): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.make) params.set("make", filters.make);
  if (filters.model) params.set("model", filters.model);
  if (filters.bodyType) params.set("bodyType", filters.bodyType);
  if (filters.fuelType) params.set("fuelType", filters.fuelType);
  if (filters.minPrice != null) params.set("minPrice", String(filters.minPrice));
  if (filters.maxPrice != null) params.set("maxPrice", String(filters.maxPrice));
  if (filters.minYear != null) params.set("minYear", String(filters.minYear));
  if (filters.maxYear != null) params.set("maxYear", String(filters.maxYear));
  if (filters.sort && filters.sort !== DEFAULT_SORT) params.set("sort", filters.sort);
  if (filters.page && filters.page > 1) params.set("page", String(filters.page));
  return params;
}
