"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { FilterBar, SearchInput, StatusBadge, TableEmptyState, TableShell, filterSelectClassName } from "@/components/admin/admin-ui";
import { Dialog } from "@/components/ui/dialog";
import { markFinancingApplicationViewedAction } from "@/features/financing/actions";
import { EMPLOYMENT_STATUS_OPTIONS } from "@/features/financing/schemas";
import type { FinancingApplicationListItem } from "@/features/financing/queries";
import { currencyFormatter } from "@/features/vehicle/types";

interface FinancingApplicationListProps {
  items: FinancingApplicationListItem[];
  showShowroomColumn?: boolean;
}

const dateFormatter = new Intl.DateTimeFormat("en-KE", { dateStyle: "medium", timeStyle: "short" });

function employmentStatusLabel(value: string): string {
  return EMPLOYMENT_STATUS_OPTIONS.find((option) => option.value === value)?.label ?? value;
}

/**
 * Shared by the admin panel (every application, showShowroomColumn) and the
 * showroom dashboard (that showroom's own applications only) — mirrors
 * InquiryList exactly (same client-side filter/search over an
 * already-fetched array, same optimistic mark-viewed + router.refresh()
 * pattern for the sidebar badge count).
 */
export function FinancingApplicationList({ items, showShowroomColumn = false }: FinancingApplicationListProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [localItems, setLocalItems] = useState(items);
  const [selected, setSelected] = useState<FinancingApplicationListItem | null>(null);

  const filteredItems = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return localItems.filter((item) => {
      if (statusFilter && item.status !== statusFilter) return false;
      if (!query) return true;
      return (
        item.contactName.toLowerCase().includes(query) ||
        item.contactEmail.toLowerCase().includes(query) ||
        item.vehicleTitle.toLowerCase().includes(query) ||
        item.showroomName.toLowerCase().includes(query)
      );
    });
  }, [localItems, searchQuery, statusFilter]);

  function openApplication(item: FinancingApplicationListItem) {
    setSelected(item);
    if (item.status === "NEW") {
      setLocalItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, status: "VIEWED" } : i)));
      void markFinancingApplicationViewedAction(item.id).then(() => router.refresh());
    }
  }

  return (
    <>
      <FilterBar>
        <SearchInput value={searchQuery} onChange={setSearchQuery} placeholder="Search by name, email, or vehicle…" />
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={`${filterSelectClassName} w-36`}>
          <option value="">All Statuses</option>
          <option value="NEW">New</option>
          <option value="VIEWED">Viewed</option>
        </select>
      </FilterBar>

      <TableShell>
        {items.length === 0 ? (
          <TableEmptyState message="No financing applications yet." />
        ) : filteredItems.length === 0 ? (
          <TableEmptyState message="No applications match your search." />
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-neutral-200 text-xs font-semibold tracking-wide text-neutral-400 uppercase">
                <th className="px-5 py-3 font-semibold">Vehicle</th>
                {showShowroomColumn && <th className="px-5 py-3 font-semibold">Showroom</th>}
                <th className="px-5 py-3 font-semibold">Contact</th>
                <th className="px-5 py-3 font-semibold">Down Payment</th>
                <th className="px-5 py-3 font-semibold">Status</th>
                <th className="px-5 py-3 font-semibold">Received</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((item) => (
                <tr
                  key={item.id}
                  onClick={() => openApplication(item)}
                  className="cursor-pointer border-b border-neutral-100 last:border-b-0 hover:bg-neutral-50"
                >
                  <td className="px-5 py-3 font-medium text-neutral-800">{item.vehicleTitle}</td>
                  {showShowroomColumn && <td className="px-5 py-3 text-neutral-600">{item.showroomName}</td>}
                  <td className="px-5 py-3 text-neutral-600">
                    <div>{item.contactName}</div>
                    <div className="text-xs text-neutral-400">{item.contactEmail}</div>
                  </td>
                  <td className="px-5 py-3 text-neutral-600">{currencyFormatter.format(item.desiredDownPayment)}</td>
                  <td className="px-5 py-3">
                    <StatusBadge status={item.status} />
                  </td>
                  <td className="px-5 py-3 text-neutral-500">{dateFormatter.format(new Date(item.createdAt))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </TableShell>

      <Dialog open={selected != null} onClose={() => setSelected(null)} title="Financing Application" description={selected?.vehicleTitle}>
        {selected && (
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-xs font-semibold text-neutral-400 uppercase">Name</p>
                <p className="text-neutral-800">{selected.contactName}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-neutral-400 uppercase">Email</p>
                <p className="text-neutral-800">{selected.contactEmail}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-neutral-400 uppercase">Phone</p>
                <p className="text-neutral-800">{selected.contactPhone}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-neutral-400 uppercase">National ID</p>
                <p className="text-neutral-800">{selected.nationalId}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-neutral-400 uppercase">Employment</p>
                <p className="text-neutral-800">{employmentStatusLabel(selected.employmentStatus)}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-neutral-400 uppercase">Monthly Income</p>
                <p className="text-neutral-800">{currencyFormatter.format(selected.monthlyIncome)}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-neutral-400 uppercase">Desired Down Payment</p>
                <p className="text-neutral-800">{currencyFormatter.format(selected.desiredDownPayment)}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-neutral-400 uppercase">Desired Loan Term</p>
                <p className="text-neutral-800">{selected.desiredTenureMonths} months</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-neutral-400 uppercase">Received</p>
                <p className="text-neutral-800">{dateFormatter.format(new Date(selected.createdAt))}</p>
              </div>
              {showShowroomColumn && (
                <div>
                  <p className="text-xs font-semibold text-neutral-400 uppercase">Showroom</p>
                  <p className="text-neutral-800">{selected.showroomName}</p>
                </div>
              )}
            </div>
            {selected.notes && (
              <div>
                <p className="mb-1 text-xs font-semibold text-neutral-400 uppercase">Notes</p>
                <p className="rounded-md bg-neutral-50 p-3 text-sm whitespace-pre-line text-neutral-700">{selected.notes}</p>
              </div>
            )}
          </div>
        )}
      </Dialog>
    </>
  );
}
