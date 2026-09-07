// Pure slot-generation math for the "Schedule Test Drive" booking flow.
// Given a showroom's configured working-hours window for one day
// (showroom_availability), its flat slot-duration/buffer-time settings
// (showrooms.slot_duration_minutes/buffer_minutes), and the set of
// already-booked start times for that specific date, computes the list of
// bookable time slots — each already marked booked/available so the UI
// never needs to duplicate this logic. The real double-booking guard is
// the DB's own partial unique index (appointments_no_double_booking); this
// is what decides what to SHOW as open, not the source of truth for what's
// actually still free at submit time.

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
