"use client";

import { useMemo, useState } from "react";
import { VehicleCard } from "@/components/vehicle/vehicle-card";
import type { VehicleWithShowroom } from "@/features/vehicle/types";

const INITIAL_VISIBLE_COUNT = 8;
const LOAD_MORE_INCREMENT = 8;

type SortOption = "newest" | "price-asc" | "price-desc" | "mileage";

const SORTERS: Record<SortOption, (a: VehicleWithShowroom, b: VehicleWithShowroom) => number> = {
  newest: (a, b) => b.createdAt.localeCompare(a.createdAt),
  "price-asc": (a, b) => a.price - b.price,
  "price-desc": (a, b) => b.price - a.price,
  mileage: (a, b) => (a.mileage ?? Infinity) - (b.mileage ?? Infinity),
};

interface ShowroomVehicleBrowserProps {
  vehicles: VehicleWithShowroom[];
}

/**
 * Every vehicle is already fetched server-side in one shot (a real dealer's
 * active inventory is small — no pagination convention at this scale,
 * matching every other admin/dashboard list in this codebase) — sort,
 * type-filter, and "Load more" are all pure client-side operations over
 * that same already-loaded array, not new network requests. "Load more"
 * is honest progressive disclosure (revealing more of what's already
 * loaded), not fake pagination.
 */
export function ShowroomVehicleBrowser({ vehicles }: ShowroomVehicleBrowserProps) {
  const [sort, setSort] = useState<SortOption>("newest");
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE_COUNT);

  // Real distinct types present in this showroom's own inventory — body
  // type and fuel type together, matching the design's own mixed pill row
  // (Sedan/SUV/Coupe alongside Electric/Hybrid) — never a fixed list that
  // could show an always-empty pill for a type this showroom doesn't carry.
  const availableTypes = useMemo(() => {
    const types = new Set<string>();
    for (const v of vehicles) {
      if (v.bodyType) types.add(v.bodyType);
      if (v.fuelType) types.add(v.fuelType);
    }
    return [...types].sort();
  }, [vehicles]);

  const filtered = useMemo(() => {
    const base = typeFilter ? vehicles.filter((v) => v.bodyType === typeFilter || v.fuelType === typeFilter) : vehicles;
    return [...base].sort(SORTERS[sort]);
  }, [vehicles, typeFilter, sort]);

  const visible = filtered.slice(0, visibleCount);

  function handleTypeChange(type: string | null) {
    setTypeFilter(type);
    setVisibleCount(INITIAL_VISIBLE_COUNT);
  }

  return (
    <div>
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <h2 className="font-display text-xl font-bold text-neutral-900">
          Available Cars<span className="ml-2 text-base font-normal text-neutral-400">({filtered.length})</span>
        </h2>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortOption)}
          aria-label="Sort listings"
          className="cursor-pointer rounded border border-neutral-300 bg-white px-3 py-1.5 text-sm text-neutral-700 outline-none"
        >
          <option value="newest">Newest First</option>
          <option value="price-asc">Price: Low → High</option>
          <option value="price-desc">Price: High → Low</option>
          <option value="mileage">Lowest Mileage</option>
        </select>
      </div>

      {availableTypes.length > 0 && (
        <div className="mb-7 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => handleTypeChange(null)}
            className={`rounded-full border px-4 py-1.5 text-xs font-semibold transition-all ${
              typeFilter === null ? "border-brand bg-brand text-white" : "border-neutral-300 bg-white text-neutral-700"
            }`}
          >
            All
          </button>
          {availableTypes.map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => handleTypeChange(type)}
              className={`rounded-full border px-4 py-1.5 text-xs font-semibold transition-all ${
                typeFilter === type ? "border-brand bg-brand text-white" : "border-neutral-300 bg-white text-neutral-700"
              }`}
            >
              {type}
            </button>
          ))}
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-neutral-300 bg-white px-6 py-16 text-center">
          <p className="text-sm font-medium text-neutral-500">No vehicles match this filter</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {visible.map((vehicle) => (
              <VehicleCard key={vehicle.id} vehicle={vehicle} />
            ))}
          </div>

          {visibleCount < filtered.length && (
            <div className="mt-10 flex justify-center">
              <button
                type="button"
                onClick={() => setVisibleCount((c) => c + LOAD_MORE_INCREMENT)}
                className="rounded-md border border-neutral-300 bg-white px-8 py-3 text-sm font-semibold text-neutral-700 hover:bg-neutral-50"
              >
                Load more listings
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
