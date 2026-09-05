import Image from "next/image";
import { CarIcon } from "@/components/admin/admin-ui";
import { currencyFormatter, type VehicleListItem } from "@/features/vehicle/types";

export interface HomeVehicleItem extends VehicleListItem {
  showroomName: string;
}

interface MostSearchedVehiclesProps {
  vehicles: HomeVehicleItem[];
  totalVehicleCount: number;
}

const mileageFormatter = new Intl.NumberFormat("en-KE");

// Distinct accent color per fuel type, matching the design's own per-badge
// palette, rather than one flat color for every badge regardless of type.
const FUEL_TYPE_BADGE_COLORS: Record<string, string> = {
  petrol: "#1a4731",
  diesel: "#007f77",
  hybrid: "#1a3a4f",
  electric: "#2d1a6b",
};

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
            <button
              type="button"
              disabled
              title="Vehicle listing — coming soon"
              className="hidden text-sm font-medium text-brand disabled:cursor-not-allowed disabled:opacity-70 md:block"
            >
              View all {mileageFormatter.format(totalVehicleCount)}+ →
            </button>
          )}
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
              const fuelBadgeColor = vehicle.fuelType ? (FUEL_TYPE_BADGE_COLORS[vehicle.fuelType.toLowerCase()] ?? "#1a4731") : null;
              return (
                <div
                  key={vehicle.id}
                  className="group flex flex-col overflow-hidden rounded-lg border border-neutral-200 bg-white transition-shadow hover:shadow-md"
                >
                  <div className="relative h-43.75 overflow-hidden bg-neutral-200">
                    {primaryPhoto ? (
                      <Image
                        src={primaryPhoto.url}
                        alt=""
                        fill
                        unoptimized
                        className="object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <CarIcon />
                      </div>
                    )}
                    {vehicle.bodyType && (
                      <span className="absolute top-2.5 left-2.5 rounded-[3px] bg-neutral-900 px-2 py-0.5 text-[10px] font-semibold tracking-wider text-white uppercase">
                        {vehicle.bodyType}
                      </span>
                    )}
                    {fuelBadgeColor && vehicle.fuelType && (
                      <span
                        className="absolute top-2.5 right-2.5 rounded-[3px] px-2 py-0.5 text-[10px] font-semibold tracking-wider text-white uppercase"
                        style={{ backgroundColor: fuelBadgeColor }}
                      >
                        {vehicle.fuelType}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-1 flex-col p-4">
                    <div className="mb-1 flex items-start justify-between">
                      <div className="min-w-0">
                        <p className="truncate text-[10px] font-semibold tracking-widest text-brand uppercase">{vehicle.make}</p>
                        <h3 className="truncate font-display text-base font-bold text-neutral-900">{vehicle.model}</h3>
                      </div>
                      <span className="shrink-0 text-xs font-medium text-neutral-400">{vehicle.year}</span>
                    </div>
                    <div className="mt-1.5 mb-3 flex items-center gap-2.5">
                      <span className="flex items-center gap-1 text-[11px] text-neutral-500">
                        <ClockIcon />
                        {vehicle.mileage != null ? `${mileageFormatter.format(vehicle.mileage)} km` : "Mileage n/a"}
                      </span>
                      <span className="text-[10px] text-neutral-300">·</span>
                      <span className="truncate text-[11px] text-neutral-500">{vehicle.showroomName}</span>
                    </div>

                    <div className="mb-3 flex flex-wrap items-center gap-2">
                      {vehicle.bankFinanceEnabled && (
                        <span className="flex items-center gap-1 rounded border border-[#99e6df] bg-[#f0fdf9] px-2 py-0.5 text-[10px] font-semibold text-brand">
                          <BankIcon />
                          Bank Finance
                        </span>
                      )}
                      {vehicle.installmentEnabled && (
                        <span className="flex items-center gap-1 rounded border border-amber-300 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                          <InstallmentIcon />
                          HP Installments
                        </span>
                      )}
                    </div>

                    <div className="mt-auto flex items-center justify-between border-t border-neutral-100 pt-3">
                      <div>
                        <p className="text-[9px] font-semibold tracking-wider text-neutral-400 uppercase">Price</p>
                        <p className="font-display text-lg font-bold text-neutral-900 tabular-nums">{currencyFormatter.format(vehicle.price)}</p>
                      </div>
                      <button
                        type="button"
                        disabled
                        title="Vehicle detail pages — coming soon"
                        className="rounded px-3 py-1.5 text-xs font-semibold text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-90"
                        style={{ backgroundColor: "#007f77" }}
                      >
                        View →
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

function ClockIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-2.5 w-2.5" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 8v4l3 3" />
    </svg>
  );
}

function BankIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-2.5 w-2.5" aria-hidden="true">
      <rect x="2" y="6" width="20" height="14" rx="2" />
      <path d="M2 10h20" />
    </svg>
  );
}

function InstallmentIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-2.5 w-2.5" aria-hidden="true">
      <path d="M12 2 2 7l10 5 10-5-10-5z" />
      <path d="M2 17l10 5 10-5" />
      <path d="M2 12l10 5 10-5" />
    </svg>
  );
}
