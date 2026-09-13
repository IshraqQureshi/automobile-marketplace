"use client";

import { useMemo, useState } from "react";
import { FilterBar, RowIconButton, SearchInput, SectionHeader, TableEmptyState, TableShell, filterSelectClassName, PencilIcon } from "@/components/admin/admin-ui";
import { CommissionDialog, COMMISSION_STATUS_BADGE_CLASSES } from "@/components/admin/commission-dialog";
import type { SoldVehicleCommissionRow } from "@/features/admin/commission-queries";
import { currencyFormatter } from "@/features/vehicle/types";

interface CommissionListProps {
  rows: SoldVehicleCommissionRow[];
}

/**
 * Commission entry surface for /admin/payments — every currently SOLD
 * vehicle, platform-wide, with an Add/Edit action opening the same
 * CommissionDialog the vehicle moderation list already uses (see
 * src/components/admin/commission-dialog.tsx). Read-only otherwise: this
 * list itself never creates/deletes a vehicle, it only records the
 * commission owed/paid for one that's already sold.
 */
export function CommissionList({ rows }: CommissionListProps) {
  const [target, setTarget] = useState<SoldVehicleCommissionRow | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "PENDING" | "PAID" | "NOT_RECORDED">("ALL");

  const filteredRows = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return rows.filter((row) => {
      if (statusFilter === "NOT_RECORDED" && row.commission) return false;
      if (statusFilter === "PENDING" && row.commission?.status !== "PENDING") return false;
      if (statusFilter === "PAID" && row.commission?.status !== "PAID") return false;
      if (!query) return true;
      return row.vehicleTitle.toLowerCase().includes(query) || row.showroomName.toLowerCase().includes(query);
    });
  }, [rows, searchQuery, statusFilter]);

  return (
    <div className="mt-8">
      <SectionHeader
        icon={<CommissionIcon />}
        title="Vehicle commissions"
        description="Commission owed to HarakaGari for vehicles sold on behalf of a showroom, entered manually per sale."
      />

      {rows.length > 0 && (
        <FilterBar>
          <SearchInput value={searchQuery} onChange={setSearchQuery} placeholder="Search vehicle or showroom…" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
            className={`${filterSelectClassName} w-44`}
            aria-label="Filter by commission status"
          >
            <option value="ALL">All commissions</option>
            <option value="NOT_RECORDED">Not recorded yet</option>
            <option value="PENDING">Pending</option>
            <option value="PAID">Paid</option>
          </select>
        </FilterBar>
      )}

      <TableShell>
        {rows.length === 0 ? (
          <TableEmptyState message="No vehicles have been marked as sold yet." />
        ) : filteredRows.length === 0 ? (
          <TableEmptyState message="No commissions match your search." />
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-neutral-200 text-xs font-semibold tracking-wide text-neutral-400 uppercase">
                <th className="px-5 py-3 font-semibold">Vehicle</th>
                <th className="px-5 py-3 font-semibold">Showroom</th>
                <th className="px-5 py-3 font-semibold">Commission</th>
                <th className="px-5 py-3 font-semibold">Status</th>
                <th className="px-5 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((row) => (
                <tr key={row.vehicleId} className="border-b border-neutral-100 last:border-b-0 hover:bg-neutral-50">
                  <td className="px-5 py-3 font-medium text-neutral-800">{row.vehicleTitle}</td>
                  <td className="px-5 py-3 text-neutral-600">{row.showroomName}</td>
                  <td className="px-5 py-3 tabular-nums text-neutral-800">
                    {row.commission ? currencyFormatter.format(row.commission.amount) : <span className="text-neutral-300">—</span>}
                  </td>
                  <td className="px-5 py-3">
                    {row.commission ? (
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${COMMISSION_STATUS_BADGE_CLASSES[row.commission.status]}`}>
                        {row.commission.status === "PAID" ? "Paid" : "Pending"}
                      </span>
                    ) : (
                      <span className="text-xs text-neutral-400">Not recorded</span>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex justify-end gap-1">
                      <RowIconButton label={row.commission ? "Edit commission" : "Add commission"} onClick={() => setTarget(row)}>
                        <PencilIcon />
                      </RowIconButton>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </TableShell>

      {target && (
        <CommissionDialog
          vehicle={{ id: target.vehicleId, title: target.vehicleTitle }}
          existing={target.commission}
          onClose={() => setTarget(null)}
        />
      )}
    </div>
  );
}

function CommissionIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4.5 w-4.5" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 9a2.5 2.5 0 0 1 4.9-.7M9.5 15a2.5 2.5 0 0 0 4.9.7M12 6.5v11" />
    </svg>
  );
}
