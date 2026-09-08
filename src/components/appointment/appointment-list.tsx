"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FilterBar, SearchInput, StatusBadge, TableEmptyState, TableShell, filterSelectClassName } from "@/components/admin/admin-ui";
import { Dialog } from "@/components/ui/dialog";
import { RescheduleDialog } from "@/components/appointment/reschedule-dialog";
import { confirmAppointmentAction, declineAppointmentAction } from "@/features/appointment/actions";
import type { AppointmentListItem } from "@/features/appointment/queries";

const RESCHEDULABLE_STATUSES: AppointmentListItem["status"][] = ["PENDING", "CONFIRMED", "RESCHEDULED"];
const FINALIZABLE_STATUSES: AppointmentListItem["status"][] = ["PENDING", "RESCHEDULED"];

function toMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

function addMinutesToTime(time: string, minutes: number): string {
  const [h, m] = time.split(":").map(Number);
  const total = (h ?? 0) * 60 + (m ?? 0) + minutes;
  const hours = Math.floor(total / 60) % 24;
  const mins = total % 60;
  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}:00`;
}

interface AppointmentListProps {
  items: AppointmentListItem[];
  showShowroomColumn?: boolean;
}

const dateFormatter = new Intl.DateTimeFormat("en-KE", { dateStyle: "medium" });
const dateTimeFormatter = new Intl.DateTimeFormat("en-KE", { dateStyle: "medium", timeStyle: "short" });

/**
 * Shared by the admin panel (every appointment, showShowroomColumn) and the
 * showroom dashboard (that showroom's own appointments only) — same
 * client-side filter/search-over-an-already-fetched-array pattern as
 * InquiryList/FinancingApplicationList, but appointments have a real
 * two-step lifecycle (PENDING → CONFIRMED/DECLINED) instead of a NEW/VIEWED
 * read-state, so this renders Confirm/Decline actions on a PENDING row
 * rather than a click-to-mark-viewed row.
 */
export function AppointmentList({ items, showShowroomColumn = false }: AppointmentListProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [localItems, setLocalItems] = useState(items);
  const [selected, setSelected] = useState<AppointmentListItem | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [actionError, setActionError] = useState<string | null>(null);
  const [rescheduling, setRescheduling] = useState<AppointmentListItem | null>(null);

  function handleRescheduled(appointmentId: string, newDate: string, newStartTime: string) {
    let updated: AppointmentListItem | null = null;
    setLocalItems((prev) =>
      prev.map((i) => {
        if (i.id !== appointmentId) return i;
        const durationMinutes = (toMinutes(i.endTime) - toMinutes(i.startTime) + 24 * 60) % (24 * 60);
        updated = {
          ...i,
          status: "RESCHEDULED",
          appointmentDate: newDate,
          startTime: `${newStartTime}:00`,
          endTime: addMinutesToTime(newStartTime, durationMinutes),
        };
        return updated;
      }),
    );
    setSelected((prev) => (prev && prev.id === appointmentId && updated ? updated : prev));
    router.refresh();
  }

  const filteredItems = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return localItems.filter((item) => {
      if (statusFilter && item.status !== statusFilter) return false;
      if (!query) return true;
      return (
        item.contactName.toLowerCase().includes(query) ||
        item.contactEmail.toLowerCase().includes(query) ||
        item.bookingReference.toLowerCase().includes(query) ||
        item.showroomName.toLowerCase().includes(query) ||
        item.vehicles.some((v) => v.title.toLowerCase().includes(query))
      );
    });
  }, [localItems, searchQuery, statusFilter]);

  function runTransition(id: string, nextStatus: "CONFIRMED" | "DECLINED", action: (id: string) => Promise<{ error?: string }>) {
    setActionError(null);
    setPendingId(id);
    startTransition(async () => {
      const result = await action(id);
      setPendingId(null);
      if (result.error) {
        setActionError(result.error);
        return;
      }
      setLocalItems((prev) => prev.map((i) => (i.id === id ? { ...i, status: nextStatus } : i)));
      setSelected((prev) => (prev && prev.id === id ? { ...prev, status: nextStatus } : prev));
      // revalidatePath alone doesn't re-fetch an already-rendered page's
      // server data without a real navigation — router.refresh() is what
      // makes the sidebar's pending-count badge reflect the change
      // immediately, same convention as InquiryList/FinancingApplicationList.
      router.refresh();
    });
  }

  return (
    <>
      <FilterBar>
        <SearchInput value={searchQuery} onChange={setSearchQuery} placeholder="Search by name, email, reference, or vehicle…" />
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={`${filterSelectClassName} w-40`}>
          <option value="">All Statuses</option>
          <option value="PENDING">Pending</option>
          <option value="CONFIRMED">Confirmed</option>
          <option value="RESCHEDULED">Rescheduled</option>
          <option value="DECLINED">Declined</option>
          <option value="CANCELLED">Cancelled</option>
          <option value="COMPLETED">Completed</option>
        </select>
      </FilterBar>

      <TableShell>
        {items.length === 0 ? (
          <TableEmptyState message="No appointments yet." />
        ) : filteredItems.length === 0 ? (
          <TableEmptyState message="No appointments match your search." />
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-neutral-200 text-xs font-semibold tracking-wide text-neutral-400 uppercase">
                <th className="px-5 py-3 font-semibold">Reference</th>
                {showShowroomColumn && <th className="px-5 py-3 font-semibold">Showroom</th>}
                <th className="px-5 py-3 font-semibold">Contact</th>
                <th className="px-5 py-3 font-semibold">Vehicles</th>
                <th className="px-5 py-3 font-semibold">When</th>
                <th className="px-5 py-3 font-semibold">Status</th>
                <th className="px-5 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((item) => (
                <tr key={item.id} className="border-b border-neutral-100 last:border-b-0 hover:bg-neutral-50">
                  <td className="cursor-pointer px-5 py-3 font-medium text-neutral-800" onClick={() => setSelected(item)}>
                    {item.bookingReference}
                  </td>
                  {showShowroomColumn && <td className="px-5 py-3 text-neutral-600">{item.showroomName}</td>}
                  <td className="px-5 py-3 text-neutral-600">
                    <div>{item.contactName}</div>
                    <div className="text-xs text-neutral-400">{item.contactEmail}</div>
                  </td>
                  <td className="px-5 py-3 text-neutral-600">{item.vehicles.map((v) => v.title).join(", ") || "—"}</td>
                  <td className="px-5 py-3 text-neutral-500">
                    {dateFormatter.format(new Date(`${item.appointmentDate}T00:00:00`))} · {item.startTime.slice(0, 5)}
                  </td>
                  <td className="px-5 py-3">
                    <StatusBadge status={item.status} />
                  </td>
                  <td className="px-5 py-3">
                    {RESCHEDULABLE_STATUSES.includes(item.status) ? (
                      <div className="flex flex-wrap gap-2">
                        {FINALIZABLE_STATUSES.includes(item.status) && (
                          <>
                            <button
                              type="button"
                              disabled={pending && pendingId === item.id}
                              onClick={() => runTransition(item.id, "CONFIRMED", confirmAppointmentAction)}
                              className="rounded-md bg-brand px-2.5 py-1 text-xs font-semibold text-white hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              Confirm
                            </button>
                            <button
                              type="button"
                              disabled={pending && pendingId === item.id}
                              onClick={() => runTransition(item.id, "DECLINED", declineAppointmentAction)}
                              className="rounded-md border border-neutral-300 px-2.5 py-1 text-xs font-semibold text-neutral-600 hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              Decline
                            </button>
                          </>
                        )}
                        <button
                          type="button"
                          disabled={pending && pendingId === item.id}
                          onClick={() => setRescheduling(item)}
                          className="rounded-md border border-neutral-300 px-2.5 py-1 text-xs font-semibold text-neutral-600 hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Reschedule
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-neutral-400">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </TableShell>

      {actionError && <p className="mt-3 text-sm text-red-600">{actionError}</p>}

      <Dialog open={selected != null} onClose={() => setSelected(null)} title="Appointment Details" description={selected?.bookingReference}>
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
                <p className="text-xs font-semibold text-neutral-400 uppercase">Status</p>
                <StatusBadge status={selected.status} />
              </div>
              <div>
                <p className="text-xs font-semibold text-neutral-400 uppercase">Date &amp; Time</p>
                <p className="text-neutral-800">
                  {dateTimeFormatter.format(new Date(`${selected.appointmentDate}T${selected.startTime}`))} – {selected.endTime.slice(0, 5)}
                </p>
              </div>
              {showShowroomColumn && (
                <div>
                  <p className="text-xs font-semibold text-neutral-400 uppercase">Showroom</p>
                  <p className="text-neutral-800">{selected.showroomName}</p>
                </div>
              )}
            </div>
            <div>
              <p className="mb-1 text-xs font-semibold text-neutral-400 uppercase">Vehicles</p>
              <ul className="list-inside list-disc text-sm text-neutral-700">
                {selected.vehicles.map((v) => (
                  <li key={v.id}>{v.title}</li>
                ))}
              </ul>
            </div>
            {selected.customerNotes && (
              <div>
                <p className="mb-1 text-xs font-semibold text-neutral-400 uppercase">Customer Notes</p>
                <p className="rounded-md bg-neutral-50 p-3 text-sm whitespace-pre-line text-neutral-700">{selected.customerNotes}</p>
              </div>
            )}
            {RESCHEDULABLE_STATUSES.includes(selected.status) && (
              <div className="flex flex-wrap gap-2 border-t border-neutral-200 pt-4">
                {FINALIZABLE_STATUSES.includes(selected.status) && (
                  <>
                    <button
                      type="button"
                      disabled={pending && pendingId === selected.id}
                      onClick={() => runTransition(selected.id, "CONFIRMED", confirmAppointmentAction)}
                      className="rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Confirm appointment
                    </button>
                    <button
                      type="button"
                      disabled={pending && pendingId === selected.id}
                      onClick={() => runTransition(selected.id, "DECLINED", declineAppointmentAction)}
                      className="rounded-md border border-neutral-300 px-4 py-2 text-sm font-semibold text-neutral-600 hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Decline
                    </button>
                  </>
                )}
                <button
                  type="button"
                  disabled={pending && pendingId === selected.id}
                  onClick={() => setRescheduling(selected)}
                  className="rounded-md border border-neutral-300 px-4 py-2 text-sm font-semibold text-neutral-600 hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Reschedule
                </button>
              </div>
            )}
          </div>
        )}
      </Dialog>

      {rescheduling && (
        <RescheduleDialog
          open={rescheduling != null}
          appointment={rescheduling}
          onClose={() => setRescheduling(null)}
          onRescheduled={handleRescheduled}
        />
      )}
    </>
  );
}
