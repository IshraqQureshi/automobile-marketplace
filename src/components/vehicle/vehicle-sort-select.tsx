"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { VEHICLE_SORT_OPTIONS, type VehicleSortKey } from "@/features/vehicle/search";

interface VehicleSortSelectProps {
  value: VehicleSortKey;
}

/**
 * The one filter control expected to apply immediately on change (every
 * other filter lives in vehicle-filters.tsx's plain GET form, submitted via
 * its own button) — small enough to justify being the sole "use client"
 * piece here rather than making the whole filter bar client-side.
 */
export function VehicleSortSelect({ value }: VehicleSortSelectProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function handleChange(sort: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (sort === "newest") {
      params.delete("sort");
    } else {
      params.set("sort", sort);
    }
    params.delete("page");
    const query = params.toString();
    router.push(query ? `/listing?${query}` : "/listing");
  }

  return (
    <select
      value={value}
      onChange={(e) => handleChange(e.target.value)}
      aria-label="Sort vehicles"
      className="rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-700 outline-none focus:border-brand focus:ring-1 focus:ring-brand"
    >
      {VEHICLE_SORT_OPTIONS.map((option) => (
        <option key={option.value} value={option.value}>
          Sort: {option.label}
        </option>
      ))}
    </select>
  );
}
