// Pure parsing/validation for the public showroom directory (/showrooms) —
// same shape/reasoning as src/features/vehicle/search.ts (kept separate
// from the page so the parsing edge cases are unit-testable without
// rendering a page), deliberately mirroring its conventions rather than
// inventing a second pattern.
import { sanitizeSearchTerm } from "@/features/vehicle/search";

export type ShowroomSortKey = "newest" | "name-asc";

export interface ShowroomSortOption {
  value: ShowroomSortKey;
  label: string;
}

export const SHOWROOM_SORT_OPTIONS: ShowroomSortOption[] = [
  { value: "newest", label: "Newest" },
  { value: "name-asc", label: "Name: A to Z" },
];

const DEFAULT_SORT: ShowroomSortKey = "newest";
const VALID_SORT_KEYS = new Set<string>(SHOWROOM_SORT_OPTIONS.map((o) => o.value));

export const SHOWROOMS_PER_PAGE = 24;

export interface ShowroomSearchFilters {
  q: string;
  city: string;
  sort: ShowroomSortKey;
  page: number;
}

export type ShowroomSearchParamsInput = Record<string, string | string[] | undefined>;

function readString(params: ShowroomSearchParamsInput, key: string): string {
  const value = params[key];
  return typeof value === "string" ? value.trim() : "";
}

export function parseShowroomSearchFilters(params: ShowroomSearchParamsInput): ShowroomSearchFilters {
  const sortRaw = readString(params, "sort");
  const sort = VALID_SORT_KEYS.has(sortRaw) ? (sortRaw as ShowroomSortKey) : DEFAULT_SORT;

  const pageRaw = Number(readString(params, "page"));
  const page = Number.isInteger(pageRaw) && pageRaw > 0 ? pageRaw : 1;

  return {
    q: sanitizeSearchTerm(readString(params, "q")),
    city: readString(params, "city"),
    sort,
    page,
  };
}

export function showroomSearchFiltersToParams(filters: Partial<ShowroomSearchFilters>): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.city) params.set("city", filters.city);
  if (filters.sort && filters.sort !== DEFAULT_SORT) params.set("sort", filters.sort);
  if (filters.page && filters.page > 1) params.set("page", String(filters.page));
  return params;
}
