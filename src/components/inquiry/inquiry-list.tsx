"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { FilterBar, SearchInput, StatusBadge, TableEmptyState, TableShell, filterSelectClassName } from "@/components/admin/admin-ui";
import { Dialog } from "@/components/ui/dialog";
import { markInquiryViewedAction } from "@/features/inquiry/actions";
import type { InquiryListItem } from "@/features/inquiry/queries";

interface InquiryListProps {
  items: InquiryListItem[];
  showShowroomColumn?: boolean;
}

const dateFormatter = new Intl.DateTimeFormat("en-KE", { dateStyle: "medium", timeStyle: "short" });

/**
 * Shared by the admin panel (every inquiry, showShowroomColumn) and the
 * showroom dashboard (that showroom's own inquiries only) — same UI, the
 * rows are already scoped server-side before either page renders this.
 * Filtering/search is client-side over the already-fetched list, matching
 * this project's established admin/dashboard-scale convention (see
 * showroom-list.tsx/vehicle-list.tsx's own "no pagination at this scale"
 * comments) rather than the public marketplace's real server-side search.
 */
export function InquiryList({ items, showShowroomColumn = false }: InquiryListProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [localItems, setLocalItems] = useState(items);
  const [selected, setSelected] = useState<InquiryListItem | null>(null);

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

  function openInquiry(item: InquiryListItem) {
    setSelected(item);
    if (item.status === "NEW") {
      setLocalItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, status: "VIEWED" } : i)));
      // markInquiryViewedAction's revalidatePath alone only invalidates the
      // cache — it doesn't re-fetch anything on an already-rendered page
      // without a subsequent navigation. router.refresh() is what actually
      // makes the sidebar's server-fetched unread count reflect the change
      // immediately (confirmed live: without this, the badge only updated
      // after a real page navigation, not right after marking read).
      void markInquiryViewedAction(item.id).then(() => router.refresh());
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
          <TableEmptyState message="No inquiries yet." />
        ) : filteredItems.length === 0 ? (
          <TableEmptyState message="No inquiries match your search." />
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-neutral-200 text-xs font-semibold tracking-wide text-neutral-400 uppercase">
                <th className="px-5 py-3 font-semibold">Vehicle</th>
                {showShowroomColumn && <th className="px-5 py-3 font-semibold">Showroom</th>}
                <th className="px-5 py-3 font-semibold">Contact</th>
                <th className="px-5 py-3 font-semibold">Status</th>
                <th className="px-5 py-3 font-semibold">Received</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((item) => (
                <tr
                  key={item.id}
                  onClick={() => openInquiry(item)}
                  className="cursor-pointer border-b border-neutral-100 last:border-b-0 hover:bg-neutral-50"
                >
                  <td className="px-5 py-3 font-medium text-neutral-800">{item.vehicleTitle}</td>
                  {showShowroomColumn && <td className="px-5 py-3 text-neutral-600">{item.showroomName}</td>}
                  <td className="px-5 py-3 text-neutral-600">
                    <div>{item.contactName}</div>
                    <div className="text-xs text-neutral-400">{item.contactEmail}</div>
                  </td>
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

      <Dialog open={selected != null} onClose={() => setSelected(null)} title="Inquiry Details" description={selected?.vehicleTitle}>
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
            <div>
              <p className="mb-1 text-xs font-semibold text-neutral-400 uppercase">Message</p>
              <p className="rounded-md bg-neutral-50 p-3 text-sm whitespace-pre-line text-neutral-700">{selected.message}</p>
            </div>
          </div>
        )}
      </Dialog>
    </>
  );
}
