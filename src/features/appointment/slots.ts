// Pure slot-generation math for the "Schedule Test Drive" booking flow.
// Given a showroom's configured working-hours window for one day
// (showroom_availability), its flat slot-duration/buffer-time settings
// (showrooms.slot_duration_minutes/buffer_minutes), and the raw
// start_time/end_time ranges of already-booked appointments for that
// specific date, computes the list of bookable time slots — each already
// marked booked/available so the UI never needs to duplicate this logic.
// The real double-booking guard is the DB's own range-overlap exclusion
// constraint (appointments_no_double_booking, a `gist` exclusion
// constraint over each row's own generated timestamp range — see the
// 20260908010000 migration); this is what decides what to SHOW as open,
// not the source of truth for what's actually still free at submit time.
//
// One appointment can span MULTIPLE consecutive slots — one per attached
// vehicle (APT-003's "book 5 cars, consume 5 slots" requirement). A candidate
// slot is marked booked whenever it OVERLAPS any existing appointment's raw
// range (isSlotBooked) — never by comparing exact slot start times against
// each other. That distinction matters: a showroom can change its slot
// length/buffer at any time, and an appointment booked under the OLD
// cadence has no reason to land on any of the NEW cadence's exact slot
// boundaries. Exact-string matching would then silently miss the overlap
// entirely; checking real time overlap doesn't care what grid either side
// was computed against, so it stays correct across a cadence change with no
// need to record what cadence a past appointment was booked under.
//
// markSlotsForVehicleCount then determines which candidate start times have
// enough free CONSECUTIVE slots to actually host N vehicles.

export interface TimeSlot {
  startTime: string; // "HH:MM", 24-hour
  endTime: string; // "HH:MM", 24-hour
  booked: boolean;
}

function toMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return (hours ?? 0) * 60 + (minutes ?? 0);
}

function toTimeString(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60)
    .toString()
    .padStart(2, "0");
  const minutes = (totalMinutes % 60).toString().padStart(2, "0");
  return `${hours}:${minutes}`;
}

export interface BookedRange {
  startTime: string;
  endTime: string;
}

function isSlotBooked(slotStart: number, slotEnd: number, bookedRanges: { start: number; end: number }[]): boolean {
  // Standard end-exclusive interval overlap: two ranges overlap iff each
  // starts before the other ends. Back-to-back ranges (one's end exactly
  // equals the other's start) do NOT overlap — same semantics as the DB's
  // own `tsrange(..., '[)')` exclusion constraint.
  return bookedRanges.some((r) => slotStart < r.end && slotEnd > r.start);
}

export interface GenerateSlotsInput {
  windowStartTime: string; // "HH:MM" — showroom_availability.start_time for that day
  windowEndTime: string; // "HH:MM" — showroom_availability.end_time for that day
  slotDurationMinutes: number;
  bufferMinutes: number;
  bookedRanges: BookedRange[]; // already-PENDING/CONFIRMED appointments' raw start_time/end_time for this date
  // When generating slots for today, minutes-since-midnight right now —
  // any slot starting at or before this is filtered out entirely (not
  // shown as booked, just not offered). Omit for a future date.
  nowMinutes?: number;
}

export function generateTimeSlots(input: GenerateSlotsInput): TimeSlot[] {
  const { windowStartTime, windowEndTime, slotDurationMinutes, bufferMinutes, bookedRanges, nowMinutes } = input;
  if (slotDurationMinutes <= 0) return [];

  const windowStart = toMinutes(windowStartTime);
  const windowEnd = toMinutes(windowEndTime);
  const ranges = bookedRanges.map((r) => ({ start: toMinutes(r.startTime), end: toMinutes(r.endTime) }));
  const step = slotDurationMinutes + Math.max(0, bufferMinutes);

  const slots: TimeSlot[] = [];
  for (let start = windowStart; start + slotDurationMinutes <= windowEnd; start += step) {
    if (nowMinutes != null && start <= nowMinutes) continue;
    const end = start + slotDurationMinutes;
    slots.push({
      startTime: toTimeString(start),
      endTime: toTimeString(end),
      booked: isSlotBooked(start, end, ranges),
    });
  }
  return slots;
}

/**
 * Marks a slot as unavailable (booked) unless it can be the START of
 * `vehicleCount` consecutive, still-open slots — i.e. booking N vehicles
 * from this slot never needs more than what's actually free, and never
 * silently crosses into a different availability window (a gap between
 * two windows, e.g. a lunch break, breaks the `step`-spaced chain and
 * correctly stops the run there). `slots` must already be sorted ascending
 * by startTime. A no-op for the single-vehicle case.
 */
export function markSlotsForVehicleCount(slots: TimeSlot[], slotDurationMinutes: number, bufferMinutes: number, vehicleCount: number): TimeSlot[] {
  if (vehicleCount <= 1) return slots;
  const step = slotDurationMinutes + Math.max(0, bufferMinutes);

  return slots.map((slot, i) => {
    if (slot.booked) return slot;
    const baseStart = toMinutes(slot.startTime);
    for (let k = 1; k < vehicleCount; k++) {
      const next = slots[i + k];
      if (!next || next.booked || toMinutes(next.startTime) !== baseStart + k * step) {
        return { ...slot, booked: true };
      }
    }
    return slot;
  });
}
