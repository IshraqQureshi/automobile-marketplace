import Image from "next/image";
import Link from "next/link";
import { CarIcon } from "@/components/admin/admin-ui";
import { currencyFormatter, type VehicleWithShowroom } from "@/features/vehicle/types";

const mileageFormatter = new Intl.NumberFormat("en-KE");

// Distinct accent color per fuel type, matching the design's own per-badge
// palette, rather than one flat color for every badge regardless of type.
const FUEL_TYPE_BADGE_COLORS: Record<string, string> = {
  petrol: "#1a4731",
  diesel: "#007f77",
  hybrid: "#1a3a4f",
  electric: "#2d1a6b",
};

interface VehicleCardProps {
  vehicle: VehicleWithShowroom;
}

/**
 * Shared vehicle listing card — used by the homepage's "Most Searched"
 * section, the public /vehicles marketplace grid, and a vehicle detail
 * page's "Similar Cars" section. Extracted from what was originally an
 * inline .map() in most-searched-vehicles.tsx once a second call site
 * (the marketplace listing page, MKT-002) needed the exact same markup.
 */
export function VehicleCard({ vehicle }: VehicleCardProps) {
  const primaryPhoto = vehicle.photos.find((p) => p.isPrimary) ?? vehicle.photos[0];
  const fuelBadgeColor = vehicle.fuelType ? (FUEL_TYPE_BADGE_COLORS[vehicle.fuelType.toLowerCase()] ?? "#1a4731") : null;

  return (
    <Link
      href={`/vehicles/${vehicle.id}`}
      className="group flex flex-col overflow-hidden rounded-lg border border-neutral-200 bg-white no-underline transition-shadow hover:shadow-md"
    >
      <div className="relative h-43.75 overflow-hidden bg-neutral-200">
        {primaryPhoto ? (
          <Image src={primaryPhoto.url} alt="" fill unoptimized className="object-cover transition-transform duration-300 group-hover:scale-105" />
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
          <span className="rounded px-3 py-1.5 text-xs font-semibold text-white" style={{ backgroundColor: "#007f77" }}>
            View →
          </span>
        </div>
      </div>
    </Link>
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
