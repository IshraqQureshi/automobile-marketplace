"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { CarIcon, EyeIcon, FilterBar, SearchInput, SectionHeader, TableEmptyState, TableShell, filterSelectClassName } from "@/components/admin/admin-ui";
import { useToast } from "@/components/ui/toast";
import { updateVehicleStatusAsAdminAction } from "@/features/vehicle/actions";
import { getVehicleDetailPath } from "@/features/vehicle/slug";
import { currencyFormatter, STATUS_BADGE_CLASSES, STATUS_LABELS, type VehicleStatus, type VehicleWithShowroom } from "@/features/vehicle/types";

// ADM-004 (Vehicle Moderation). Deliberately its own component rather than
// reusing the showroom-owner's VehicleList (src/components/dashboard/vehicle-list.tsx):
// this one is platform-wide (every showroom, not just the caller's own),
// shows a Showroom column, offers the full six-status range (not just the
// owner-settable subset), and has no create/edit affordances — an admin
// moderates existing listings, it doesn't author them.
const ALL_STATUSES = Object.keys(STATUS_LABELS) as VehicleStatus[];

interface VehicleModerationListProps {
  vehicles: VehicleWithShowroom[];
}

export function VehicleModerationList({ vehicles }: VehicleModerationListProps) {
  const toast = useToast();
  const [, startTransition] = useTransition();
  const [statusPendingId, setStatusPendingId] = useState<string | null>(null);

  // Client-side search/filter over the already-loaded array — same "no
  // pagination at this scale" convention as every other admin/dashboard list
  // in this codebase (showroom-list.tsx, dashboard's vehicle-list.tsx).
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
        (vehicle.variant ?? "").toLowerCase().includes(query) ||
        vehicle.showroomName.toLowerCase().includes(query)
      );
    });
  }, [vehicles, searchQuery, statusFilter]);

  function handleStatusChange(vehicleId: string, status: VehicleStatus) {
    setStatusPendingId(vehicleId);
    startTransition(async () => {
      const result = await updateVehicleStatusAsAdminAction(vehicleId, status);
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
      <SectionHeader icon={<CarIcon />} title="Vehicles" description="Review and moderate every showroom's vehicle listings." />

      {vehicles.length > 0 && (
        <FilterBar>
          <SearchInput value={searchQuery} onChange={setSearchQuery} placeholder="Search title, make, model, or showroom…" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
            className={`${filterSelectClassName} w-44`}
            aria-label="Filter by status"
          >
            <option value="ALL">All statuses</option>
            {ALL_STATUSES.map((status) => (
              <option key={status} value={status}>
                {STATUS_LABELS[status]}
              </option>
            ))}
          </select>
        </FilterBar>
      )}

      <TableShell>
        {vehicles.length === 0 ? (
          <TableEmptyState message="No vehicles have been listed yet." />
        ) : filteredVehicles.length === 0 ? (
          <TableEmptyState message="No vehicles match your search." />
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-neutral-200 text-xs font-semibold tracking-wide text-neutral-400 uppercase">
                <th className="px-5 py-3 font-semibold">Vehicle</th>
                <th className="px-5 py-3 font-semibold">Showroom</th>
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
                    <td className="px-5 py-3 text-neutral-600">{vehicle.showroomName}</td>
                    <td className="px-5 py-3 font-medium text-neutral-800 tabular-nums">{currencyFormatter.format(vehicle.price)}</td>
                    <td className="px-5 py-3">
                      <select
                        value={vehicle.status}
                        disabled={statusPendingId === vehicle.id}
                        onChange={(e) => handleStatusChange(vehicle.id, e.target.value as VehicleStatus)}
                        aria-label={`Status for ${vehicle.title}`}
                        className={`rounded-full border-0 px-2.5 py-1 text-xs font-semibold capitalize outline-none disabled:opacity-60 ${STATUS_BADGE_CLASSES[vehicle.status]}`}
                      >
                        {ALL_STATUSES.map((status) => (
                          <option key={status} value={status}>
                            {STATUS_LABELS[status]}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex justify-end gap-1">
                        {vehicle.status === "ACTIVE" && (
                          <Link
                            href={getVehicleDetailPath(vehicle)}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="View live listing"
                            aria-label="View live listing"
                            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-700"
                          >
                            <EyeIcon />
                          </Link>
                        )}
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
