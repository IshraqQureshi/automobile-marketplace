"use client";

import { useState, useTransition } from "react";
import { Dialog } from "@/components/ui/dialog";
import { getAvailableSlotsAction, rescheduleAppointmentAction } from "@/features/appointment/actions";
import type { AppointmentListItem } from "@/features/appointment/queries";
import type { TimeSlot } from "@/features/appointment/slots";

interface RescheduleDialogProps {
  open: boolean;
  appointment: AppointmentListItem;
  onClose: () => void;
  onRescheduled: (appointmentId: string, newDate: string, newStartTime: string) => void;
}

function todayDateString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatSlotLabel(startTime: string): string {
  return new Intl.DateTimeFormat("en-KE", { hour: "numeric", minute: "2-digit", hour12: true }).format(new Date(`2000-01-01T${startTime}`));
}

/**
 * APT-008 — lets the showroom/admin move an eligible appointment (Pending,
 * Confirmed, or already-Rescheduled) to a new date/time. Reuses the exact
 * getAvailableSlotsAction the customer-facing ScheduleTestDriveButton uses,
 * so what's shown as open here is computed by the same slot-generation
 * logic (including the "consumes one slot per attached vehicle" rule) — no
 * separate availability logic duplicated here. A plain date input (rather
 * than ScheduleTestDriveButton's month-grid calendar) is enough for this
 * admin-side dialog since it doesn't need the "which days are open" hint
 * that public calendar renders from a showroom's availableDaysOfWeek — that
 * data isn't fetched into AppointmentListItem, and an out-of-range date
 * simply comes back with zero slots.
 */
export function RescheduleDialog({ open, appointment, onClose, onRescheduled }: RescheduleDialogProps) {
  const [date, setDate] = useState("");
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotsError, setSlotsError] = useState<string | null>(null);
  const [selectedStartTime, setSelectedStartTime] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function resetAndClose() {
    setDate("");
    setSlots([]);
    setSlotsError(null);
    setSelectedStartTime(null);
    setError(null);
    onClose();
  }

  async function handleDateChange(newDate: string) {
    setDate(newDate);
    setSelectedStartTime(null);
    setError(null);
    if (!newDate) {
      setSlots([]);
      return;
    }
    setSlotsError(null);
    setSlotsLoading(true);
    const result = await getAvailableSlotsAction(appointment.showroomId, newDate, appointment.vehicles.length);
    setSlotsLoading(false);
    if (result.error) {
      setSlotsError(result.error);
      setSlots([]);
      return;
    }
    setSlots(result.slots);
  }

  function handleConfirm() {
    if (!date || !selectedStartTime) return;
    setError(null);
    startTransition(async () => {
      const result = await rescheduleAppointmentAction(appointment.id, date, selectedStartTime);
      if (result.error) {
        setError(result.error);
        return;
      }
      if (result.fieldErrors) {
        setError(Object.values(result.fieldErrors)[0] ?? "Please choose a valid date and time.");
        return;
      }
      onRescheduled(appointment.id, date, selectedStartTime);
      resetAndClose();
    });
  }

  return (
    <Dialog open={open} onClose={resetAndClose} title="Reschedule Appointment" description={appointment.bookingReference}>
      <div className="flex flex-col gap-4">
        <div>
          <label htmlFor="reschedule-date" className="mb-1 block text-xs font-semibold text-neutral-400 uppercase">
            New date
          </label>
          <input
            id="reschedule-date"
            type="date"
            min={todayDateString()}
            value={date}
            onChange={(e) => handleDateChange(e.target.value)}
            className="w-full rounded-md border border-neutral-300 px-3 py-2.5 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
          />
        </div>

        {date && (
          <div>
            <p className="mb-2 text-sm font-medium text-neutral-700">
              Available times{appointment.vehicles.length > 1 ? ` (for all ${appointment.vehicles.length} vehicles)` : ""}
            </p>
            {slotsLoading ? (
              <p className="text-sm text-neutral-400">Loading times…</p>
            ) : slotsError ? (
              <p className="text-sm text-red-600">{slotsError}</p>
            ) : slots.length === 0 ? (
              <p className="text-sm text-neutral-400">No open times on this date. Try another day.</p>
            ) : (
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {slots.map((slot) => (
                  <button
                    key={slot.startTime}
                    type="button"
                    disabled={slot.booked}
                    onClick={() => setSelectedStartTime(slot.startTime)}
                    className={`rounded-md border px-2 py-2 text-sm ${
                      slot.booked
                        ? "cursor-not-allowed border-neutral-200 text-neutral-300 line-through"
                        : selectedStartTime === slot.startTime
                          ? "border-brand bg-brand/10 text-brand"
                          : "border-neutral-300 text-neutral-700 hover:border-brand hover:text-brand"
                    }`}
                  >
                    {formatSlotLabel(slot.startTime)}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex gap-2 border-t border-neutral-200 pt-4">
          <button
            type="button"
            disabled={!date || !selectedStartTime || pending}
            onClick={handleConfirm}
            className="rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending ? "Rescheduling…" : "Confirm new time"}
          </button>
          <button
            type="button"
            onClick={resetAndClose}
            className="rounded-md border border-neutral-300 px-4 py-2 text-sm font-semibold text-neutral-600 hover:bg-neutral-100"
          >
            Cancel
          </button>
        </div>
      </div>
    </Dialog>
  );
}
