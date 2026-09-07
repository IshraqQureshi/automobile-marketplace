"use client";

import { useState, useTransition } from "react";
import { FieldLabel } from "@/components/admin/admin-ui";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { updateShowroomAvailabilityAction, type DayAvailabilityInput } from "@/features/appointment/availability-actions";
import { DAY_NAMES } from "@/features/appointment/schemas";

export interface AvailabilitySettingsProps {
  showroomId: string;
  initialSlotDurationMinutes: number;
  initialBufferMinutes: number;
  initialDays: DayAvailabilityInput[];
}

const DEFAULT_START = "09:00";
const DEFAULT_END = "17:00";

/**
 * Lets a showroom owner configure their weekly test-drive availability —
 * which days they're open, opening/closing hours, and a flat slot-length +
 * buffer-time setting used to generate bookable time slots
 * (src/features/appointment/slots.ts). Saved as one form (full-replace of
 * the week), not per-day autosave — simplest correct approach for a 7-row
 * config edited together.
 */
export function AvailabilitySettings({ showroomId, initialSlotDurationMinutes, initialBufferMinutes, initialDays }: AvailabilitySettingsProps) {
  const toast = useToast();
  const [slotDurationMinutes, setSlotDurationMinutes] = useState(String(initialSlotDurationMinutes));
  const [bufferMinutes, setBufferMinutes] = useState(String(initialBufferMinutes));
  const [days, setDays] = useState<DayAvailabilityInput[]>(() =>
    Array.from({ length: 7 }, (_, dayOfWeek) => {
      const existing = initialDays.find((d) => d.dayOfWeek === dayOfWeek);
      return (
        existing ?? {
          dayOfWeek,
          isAvailable: false,
          startTime: DEFAULT_START,
          endTime: DEFAULT_END,
        }
      );
    }),
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function updateDay(dayOfWeek: number, patch: Partial<DayAvailabilityInput>) {
    setDays((prev) => prev.map((d) => (d.dayOfWeek === dayOfWeek ? { ...d, ...patch } : d)));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const formData = new FormData();
    formData.set("slotDurationMinutes", slotDurationMinutes);
    formData.set("bufferMinutes", bufferMinutes);
    formData.set("days", JSON.stringify(days));

    startTransition(async () => {
      const result = await updateShowroomAvailabilityAction(showroomId, formData);
      if (result.error) {
        setError(result.error);
        return;
      }
      toast.success("Availability saved.");
    });
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
      <h2 className="font-display text-lg font-semibold text-neutral-900">Test drive availability</h2>
      <p className="mt-0.5 text-sm text-neutral-500">Set the days and hours customers can book a test drive, and the slot length/buffer between bookings.</p>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <FieldLabel htmlFor="slot-duration">Slot length (minutes)</FieldLabel>
          <Input
            id="slot-duration"
            inputMode="numeric"
            value={slotDurationMinutes}
            onChange={(e) => setSlotDurationMinutes(e.target.value)}
            placeholder="30"
          />
        </div>
        <div>
          <FieldLabel htmlFor="buffer-time">Buffer time between bookings (minutes)</FieldLabel>
          <Input id="buffer-time" inputMode="numeric" value={bufferMinutes} onChange={(e) => setBufferMinutes(e.target.value)} placeholder="0" />
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-2.5 border-t border-neutral-100 pt-5">
        {days.map((day) => (
          <div key={day.dayOfWeek} className="flex flex-wrap items-center gap-3 rounded-md border border-neutral-200 p-3">
            <label className="flex w-32 shrink-0 items-center gap-2 text-sm font-medium text-neutral-700">
              <input type="checkbox" checked={day.isAvailable} onChange={(e) => updateDay(day.dayOfWeek, { isAvailable: e.target.checked })} />
              {DAY_NAMES[day.dayOfWeek]}
            </label>
            {day.isAvailable && (
              <div className="flex items-center gap-2">
                <Input
                  type="time"
                  aria-label={`${DAY_NAMES[day.dayOfWeek]} opening time`}
                  value={day.startTime}
                  onChange={(e) => updateDay(day.dayOfWeek, { startTime: e.target.value })}
                  className="w-32"
                />
                <span className="text-sm text-neutral-400">to</span>
                <Input
                  type="time"
                  aria-label={`${DAY_NAMES[day.dayOfWeek]} closing time`}
                  value={day.endTime}
                  onChange={(e) => updateDay(day.dayOfWeek, { endTime: e.target.value })}
                  className="w-32"
                />
              </div>
            )}
          </div>
        ))}
      </div>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      <div className="mt-5 flex justify-end">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-brand px-3.5 py-2 text-sm font-medium text-white hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? "Saving…" : "Save availability"}
        </button>
      </div>
    </form>
  );
}
