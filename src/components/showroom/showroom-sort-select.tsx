"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { SHOWROOM_SORT_OPTIONS, type ShowroomSortKey } from "@/features/showroom/search";

interface ShowroomSortSelectProps {
  value: ShowroomSortKey;
}

/** Same precedent as VehicleSortSelect — the one filter control on this page expected to apply immediately on change. */
export function ShowroomSortSelect({ value }: ShowroomSortSelectProps) {
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
    router.push(query ? `/showrooms?${query}` : "/showrooms");
  }

  return (
    <select
      value={value}
      onChange={(e) => handleChange(e.target.value)}
      aria-label="Sort showrooms"
      className="rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-700 outline-none focus:border-brand focus:ring-1 focus:ring-brand"
    >
      {SHOWROOM_SORT_OPTIONS.map((option) => (
        <option key={option.value} value={option.value}>
          Sort: {option.label}
        </option>
      ))}
    </select>
  );
}
