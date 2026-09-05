import Image from "next/image";
import { CarIcon } from "@/components/admin/admin-ui";
import { currencyFormatter, type VehicleListItem } from "@/features/vehicle/types";

export interface HomeVehicleItem extends VehicleListItem {
  showroomName: string;
}

interface MostSearchedVehiclesProps {
  vehicles: HomeVehicleItem[];
}

const mileageFormatter = new Intl.NumberFormat("en-KE");

/**
 * "Most Searched" is the design's own label (design/homepage.png) — no
 * search-analytics tracking exists yet to back that literally, so this is
 * backed by the most recently published ACTIVE listings instead: real,
 * dynamically-computed data, just not literally sorted by search frequency.
 * Documented in .claude/docs/MVP_PROGRESS.md's decisions log.
 */
export function MostSearchedVehicles({ vehicles }: MostSearchedVehiclesProps) {
  return (
    <section className="bg-neutral-50 px-4 py-12 sm:px-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="font-display text-2xl font-semibold text-neutral-900">Most Searched</h2>
        </div>

        {vehicles.length === 0 ? (
          <div className="rounded-xl border border-dashed border-neutral-300 bg-white px-6 py-14 text-center">
            <p className="text-sm font-medium text-neutral-500">No listings yet</p>
            <p className="mt-1 text-xs text-neutral-400">Published vehicles from certified showrooms will appear here.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {vehicles.map((vehicle) => {
              const primaryPhoto = vehicle.photos.find((p) => p.isPrimary) ?? vehicle.photos[0];
              return (
                <div key={vehicle.id} className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
                  <div className="relative flex h-40 items-center justify-center bg-neutral-100">
                    {primaryPhoto ? (
                      <Image src={primaryPhoto.url} alt="" fill unoptimized className="object-cover" />
                    ) : (
                      <CarIcon />
                    )}
                    {vehicle.bodyType && (
                      <span className="absolute top-2 left-2 rounded bg-black/70 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-white uppercase">
                        {vehicle.bodyType}
                      </span>
                    )}
                    {vehicle.fuelType && (
                      <span className="absolute top-2 right-2 rounded bg-brand px-2 py-0.5 text-[10px] font-semibold tracking-wide text-white uppercase">
                        {vehicle.fuelType}
                      </span>
                    )}
                  </div>

                  <div className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-xs font-semibold tracking-wide text-neutral-400 uppercase">{vehicle.make}</p>
                        <p className="truncate font-medium text-neutral-900">{vehicle.model}</p>
                      </div>
                      <span className="shrink-0 text-xs text-neutral-400">{vehicle.year}</span>
                    </div>
                    <p className="mt-1 truncate text-xs text-neutral-400">
                      {vehicle.mileage != null ? `${mileageFormatter.format(vehicle.mileage)} km` : "Mileage n/a"} · {vehicle.showroomName}
                    </p>

                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {vehicle.bankFinanceEnabled && (
                        <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700">Bank Finance</span>
                      )}
                      {vehicle.installmentEnabled && (
                        <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">HP Installments</span>
                      )}
                    </div>

                    <div className="mt-3 flex items-center justify-between">
                      <div>
                        <p className="text-[10px] font-semibold tracking-wide text-neutral-400 uppercase">Price</p>
                        <p className="font-display text-lg font-semibold text-neutral-900 tabular-nums">{currencyFormatter.format(vehicle.price)}</p>
                      </div>
                      <button
                        type="button"
                        disabled
                        title="Vehicle detail pages — coming soon"
                        className="rounded-md bg-brand px-3 py-1.5 text-xs font-medium text-white disabled:cursor-not-allowed disabled:opacity-70"
                      >
                        View
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
