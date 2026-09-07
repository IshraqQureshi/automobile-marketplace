// Pure slot-generation math for the "Schedule Test Drive" booking flow.
// Given a showroom's configured working-hours window for one day
// (showroom_availability), its flat slot-duration/buffer-time settings
// (showrooms.slot_duration_minutes/buffer_minutes), and the set of
// already-booked start times for that specific date, computes the list of
// bookable time slots — each already marked booked/available so the UI
// never needs to duplicate this logic. The real double-booking guard is
// the DB's own range-overlap exclusion constraint (appointments_no_double_booking,
// a `gist` exclusion constraint over each row's own generated timestamp
// range — see the 20260908010000 migration); this is what decides what to
// SHOW as open, not the source of truth for what's actually still free at
// submit time.
//
// One appointment can span MULTIPLE consecutive slots — one per attached
// vehicle (APT-003's "book 5 cars, consume 5 slots" requirement) — so a
// showroom's slot cadence (slotDurationMinutes + bufferMinutes, the "step")
// is also needed to (a) figure out which already-booked appointments
// occupy which individual slot start times (expandBookedRanges), and (b)
// determine which candidate start times have enough free CONSECUTIVE slots
// to actually host N vehicles (markSlotsForVehicleCount).

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

export interface GenerateSlotsInput {
  windowStartTime: string; // "HH:MM" — showroom_availability.start_time for that day
  windowEndTime: string; // "HH:MM" — showroom_availability.end_time for that day
  slotDurationMinutes: number;
  bufferMinutes: number;
  bookedStartTimes: string[]; // already-PENDING/CONFIRMED appointments' start_time for this date
  // When generating slots for today, minutes-since-midnight right now —
  // any slot starting at or before this is filtered out entirely (not
  // shown as booked, just not offered). Omit for a future date.
  nowMinutes?: number;
}

export function generateTimeSlots(input: GenerateSlotsInput): TimeSlot[] {
  const { windowStartTime, windowEndTime, slotDurationMinutes, bufferMinutes, bookedStartTimes, nowMinutes } = input;
  if (slotDurationMinutes <= 0) return [];

  const windowStart = toMinutes(windowStartTime);
  const windowEnd = toMinutes(windowEndTime);
  // Postgres `time` columns come back from Supabase as "HH:MM:SS" — booked
  // times are normalized to this function's own "HH:MM" output format so
  // Set membership actually matches, regardless of what precision the
  // caller passed in.
  const booked = new Set(bookedStartTimes.map((t) => toTimeString(toMinutes(t))));
  const step = slotDurationMinutes + Math.max(0, bufferMinutes);

  const slots: TimeSlot[] = [];
  for (let start = windowStart; start + slotDurationMinutes <= windowEnd; start += step) {
    if (nowMinutes != null && start <= nowMinutes) continue;
    const startTime = toTimeString(start);
    slots.push({
      startTime,
      endTime: toTimeString(start + slotDurationMinutes),
      booked: booked.has(startTime),
    });
  }
  return slots;
}

export interface BookedRange {
  startTime: string;
  endTime: string;
}

/**
 * Reconstructs every individual slot start time an existing appointment
 * occupies, from just its stored (possibly multi-slot) start_time/end_time
 * range — an appointment for N vehicles was originally booked as N
 * back-to-back slots at this same slot_duration+buffer cadence, so walking
 * the range in `step` increments recovers exactly those N start times
 * without needing to store them separately anywhere.
 */
export function expandBookedRanges(ranges: BookedRange[], slotDurationMinutes: number, bufferMinutes: number): string[] {
  if (slotDurationMinutes <= 0) return [];
  const step = slotDurationMinutes + Math.max(0, bufferMinutes);
  const result: string[] = [];
  for (const range of ranges) {
    const rangeStart = toMinutes(range.startTime);
    const rangeEnd = toMinutes(range.endTime);
    for (let t = rangeStart; t + slotDurationMinutes <= rangeEnd; t += step) {
      result.push(toTimeString(t));
    }
  }
  return result;
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
