"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { CarIcon, FilterBar, PencilIcon, SearchInput, SectionHeader, TableEmptyState, TableShell, filterSelectClassName } from "@/components/admin/admin-ui";
import { useToast } from "@/components/ui/toast";
import { updateVehicleStatusAction } from "@/features/vehicle/actions";
import {
  currencyFormatter,
  OWNER_STATUS_OPTIONS,
  STATUS_BADGE_CLASSES,
  STATUS_LABELS,
  type VehicleListItem,
  type VehicleStatus,
} from "@/features/vehicle/types";

export type { VehicleListItem, VehiclePhoto, VehicleStatus } from "@/features/vehicle/types";

interface VehicleListProps {
  vehicles: VehicleListItem[];
}

/**
 * The vehicle create/edit form used to live in a Dialog here — moved to its
 * own page (src/app/dashboard/vehicles/new, .../[id]/edit) once it grew
 * specification and financing sections; a 20+ field form in a modal was
 * genuinely hard to fill in. This component is now just the listing table
 * plus the one inline control (status) that's still simple enough to stay
 * on this page.
 */
export function VehicleList({ vehicles }: VehicleListProps) {
  const toast = useToast();
  const [, startTransition] = useTransition();
  const [statusPendingId, setStatusPendingId] = useState<string | null>(null);

  // Client-side only — a showroom's own vehicles are already fetched in one
  // shot server-side (no pagination at this scale), so filtering the
  // already-loaded array in memory is simplest; no new query/round-trip.
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | VehicleStatus>("ALL");

  const filteredVehicles = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return vehicles.filter((vehicle) => {
      if (statusFilter !== "ALL" && vehicle.status !== statusFilter) return false;
      if (!query) return true;
      return (
        vehicle.title.toLowerCase().includes(query) ||
        vehicle.make.toLowerCase().includes(query) ||
        vehicle.model.toLowerCase().includes(query) ||
        (vehicle.variant ?? "").toLowerCase().includes(query)
      );
    });
  }, [vehicles, searchQuery, statusFilter]);

  function handleStatusChange(vehicleId: string, status: VehicleStatus) {
    setStatusPendingId(vehicleId);
    startTransition(async () => {
      const result = await updateVehicleStatusAction(vehicleId, status);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(`Marked as ${STATUS_LABELS[status].toLowerCase()}.`);
      }
      setStatusPendingId(null);
    });
  }

  return (
    <div>
      <SectionHeader icon={<CarIcon />} title="Vehicles" description="Manage your showroom's vehicle listings." />
      <div className="mb-4 flex justify-end">
        <Link
          href="/dashboard/vehicles/new"
          className="flex items-center gap-1.5 rounded-md bg-brand px-3.5 py-2 text-sm font-medium text-white hover:bg-brand-dark"
        >
          New vehicle
        </Link>
      </div>

      <FilterBar>
        <SearchInput value={searchQuery} onChange={setSearchQuery} placeholder="Search title, make, or model…" />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
          className={`${filterSelectClassName} w-40`}
          aria-label="Filter by status"
        >
          <option value="ALL">All statuses</option>
          {(Object.keys(STATUS_LABELS) as VehicleStatus[]).map((status) => (
            <option key={status} value={status}>
              {STATUS_LABELS[status]}
            </option>
          ))}
        </select>
      </FilterBar>

      <TableShell>
        {vehicles.length === 0 ? (
          <TableEmptyState message="No vehicles yet. Add your first listing to get started." />
        ) : filteredVehicles.length === 0 ? (
          <TableEmptyState message="No vehicles match your search." />
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-neutral-200 text-xs font-semibold tracking-wide text-neutral-400 uppercase">
                <th className="px-5 py-3 font-semibold">Vehicle</th>
                <th className="px-5 py-3 font-semibold">Price</th>
                <th className="px-5 py-3 font-semibold">Status</th>
                <th className="px-5 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredVehicles.map((vehicle) => {
                const primaryPhoto = vehicle.photos.find((p) => p.isPrimary) ?? vehicle.photos[0];
                return (
                  <tr key={vehicle.id} className="border-b border-neutral-100 last:border-b-0 hover:bg-neutral-50">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-14 shrink-0 items-center justify-center overflow-hidden rounded-md bg-neutral-100">
                          {primaryPhoto ? (
                            <Image src={primaryPhoto.url} alt="" width={56} height={40} unoptimized className="h-full w-full object-cover" />
                          ) : (
                            <CarIcon />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate font-medium text-neutral-800">{vehicle.title}</p>
                          <p className="truncate text-xs text-neutral-400">
                            {vehicle.year} · {vehicle.make} {vehicle.model}
                            {vehicle.variant ? ` ${vehicle.variant}` : ""}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3 font-medium text-neutral-800 tabular-nums">{currencyFormatter.format(vehicle.price)}</td>
                    <td className="px-5 py-3">
                      {OWNER_STATUS_OPTIONS.includes(vehicle.status) ? (
                        <select
                          value={vehicle.status}
                          disabled={statusPendingId === vehicle.id}
                          onChange={(e) => handleStatusChange(vehicle.id, e.target.value as VehicleStatus)}
                          className={`rounded-full border-0 px-2.5 py-1 text-xs font-semibold capitalize outline-none disabled:opacity-60 ${STATUS_BADGE_CLASSES[vehicle.status]}`}
                        >
                          {OWNER_STATUS_OPTIONS.map((status) => (
                            <option key={status} value={status}>
                              {STATUS_LABELS[status]}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${STATUS_BADGE_CLASSES[vehicle.status]}`}>
                          {STATUS_LABELS[vehicle.status]}
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex justify-end gap-1">
                        <Link
                          href={`/dashboard/vehicles/${vehicle.id}/edit`}
                          title="Edit"
                          aria-label="Edit"
                          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-700"
                        >
                          <PencilIcon />
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </TableShell>
    </div>
  );
}
