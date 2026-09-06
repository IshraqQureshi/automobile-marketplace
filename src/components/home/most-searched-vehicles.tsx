import Link from "next/link";
import { VehicleCard } from "@/components/vehicle/vehicle-card";
import type { VehicleWithShowroom } from "@/features/vehicle/types";

interface MostSearchedVehiclesProps {
  vehicles: VehicleWithShowroom[];
  totalVehicleCount: number;
}

const numberFormatter = new Intl.NumberFormat("en-KE");

/**
 * "Most Searched" is the design's own label (design/homepage.png) — no
 * search-analytics tracking exists yet to back that literally, so this is
 * backed by the most recently published ACTIVE listings instead: real,
 * dynamically-computed data, just not literally sorted by search frequency.
 * Documented in .claude/docs/MVP_PROGRESS.md's decisions log.
 */
export function MostSearchedVehicles({ vehicles, totalVehicleCount }: MostSearchedVehiclesProps) {
  return (
    <section className="bg-[#f8f9fa] px-6 py-12 md:px-12">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex items-end justify-between">
          <h2 className="font-display text-3xl font-bold text-neutral-900">Most Searched</h2>
          {totalVehicleCount > vehicles.length && (
            <Link href="/vehicles" className="hidden text-sm font-medium text-brand hover:text-brand-dark md:block">
              View all {numberFormatter.format(totalVehicleCount)}+ →
            </Link>
          )}
        </div>

        {vehicles.length === 0 ? (
          <div className="rounded-xl border border-dashed border-neutral-300 bg-white px-6 py-14 text-center">
            <p className="text-sm font-medium text-neutral-500">No listings yet</p>
            <p className="mt-1 text-xs text-neutral-400">Published vehicles from certified showrooms will appear here.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {vehicles.map((vehicle) => (
              <VehicleCard key={vehicle.id} vehicle={vehicle} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
