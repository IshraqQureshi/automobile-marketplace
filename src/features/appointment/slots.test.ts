import { describe, expect, it } from "vitest";
import { expandBookedRanges, generateTimeSlots, markSlotsForVehicleCount } from "./slots";

describe("generateTimeSlots", () => {
  it("generates back-to-back slots with no buffer", () => {
    const slots = generateTimeSlots({
      windowStartTime: "09:00",
      windowEndTime: "10:00",
      slotDurationMinutes: 30,
      bufferMinutes: 0,
      bookedStartTimes: [],
    });
    expect(slots).toEqual([
      { startTime: "09:00", endTime: "09:30", booked: false },
      { startTime: "09:30", endTime: "10:00", booked: false },
    ]);
  });

  it("spaces slots apart by the buffer time", () => {
    const slots = generateTimeSlots({
      windowStartTime: "09:00",
      windowEndTime: "10:00",
      slotDurationMinutes: 20,
      bufferMinutes: 10,
      bookedStartTimes: [],
    });
    // 09:00-09:20, then next starts at 09:30 (20+10), 09:30-09:50, next
    // would start at 10:00 but 10:00+20 > windowEnd (10:00), so excluded.
    expect(slots).toEqual([
      { startTime: "09:00", endTime: "09:20", booked: false },
      { startTime: "09:30", endTime: "09:50", booked: false },
    ]);
  });

  it("marks an already-booked slot, normalizing HH:MM:SS from the DB", () => {
    const slots = generateTimeSlots({
      windowStartTime: "09:00",
      windowEndTime: "10:00",
      slotDurationMinutes: 30,
      bufferMinutes: 0,
      bookedStartTimes: ["09:30:00"],
    });
    expect(slots.find((s) => s.startTime === "09:00")?.booked).toBe(false);
    expect(slots.find((s) => s.startTime === "09:30")?.booked).toBe(true);
  });

  it("excludes a slot that doesn't fully fit before the window ends", () => {
    const slots = generateTimeSlots({
      windowStartTime: "09:00",
      windowEndTime: "09:45",
      slotDurationMinutes: 30,
      bufferMinutes: 0,
      bookedStartTimes: [],
    });
    expect(slots).toEqual([{ startTime: "09:00", endTime: "09:30", booked: false }]);
  });

  it("filters out slots at or before the current time when nowMinutes is given", () => {
    const slots = generateTimeSlots({
      windowStartTime: "09:00",
      windowEndTime: "11:00",
      slotDurationMinutes: 30,
      bufferMinutes: 0,
      bookedStartTimes: [],
      nowMinutes: 9 * 60 + 45, // 09:45
    });
    expect(slots.map((s) => s.startTime)).toEqual(["10:00", "10:30"]);
  });

  it("returns an empty list for a non-positive slot duration", () => {
    expect(generateTimeSlots({ windowStartTime: "09:00", windowEndTime: "17:00", slotDurationMinutes: 0, bufferMinutes: 0, bookedStartTimes: [] })).toEqual(
      [],
    );
  });

  it("returns an empty list when the window is too short for even one slot", () => {
    expect(
      generateTimeSlots({ windowStartTime: "09:00", windowEndTime: "09:10", slotDurationMinutes: 30, bufferMinutes: 0, bookedStartTimes: [] }),
    ).toEqual([]);
  });
});

describe("expandBookedRanges", () => {
  it("reconstructs every individual slot start time a multi-slot appointment occupies", () => {
    // A 3-vehicle appointment booked 09:00-10:30 (three 30-min slots, no buffer).
    expect(expandBookedRanges([{ startTime: "09:00", endTime: "10:30" }], 30, 0)).toEqual(["09:00", "09:30", "10:00"]);
  });

  it("accounts for buffer time between reconstructed slots", () => {
    // A 2-vehicle appointment, 20-min slots + 10-min buffer: 09:00-09:20 and 09:30-09:50.
    expect(expandBookedRanges([{ startTime: "09:00", endTime: "09:50" }], 20, 10)).toEqual(["09:00", "09:30"]);
  });

  it("merges multiple appointments' occupied slots", () => {
    expect(
      expandBookedRanges(
        [
          { startTime: "09:00", endTime: "09:30" },
          { startTime: "11:00", endTime: "12:00" },
        ],
        30,
        0,
      ),
    ).toEqual(["09:00", "11:00", "11:30"]);
  });

  it("returns an empty list for a non-positive slot duration", () => {
    expect(expandBookedRanges([{ startTime: "09:00", endTime: "10:00" }], 0, 0)).toEqual([]);
  });
});

describe("markSlotsForVehicleCount", () => {
  const openSlots = generateTimeSlots({
    windowStartTime: "09:00",
    windowEndTime: "11:00",
    slotDurationMinutes: 30,
    bufferMinutes: 0,
    bookedStartTimes: [],
  });

  it("is a no-op for a single vehicle", () => {
    expect(markSlotsForVehicleCount(openSlots, 30, 0, 1)).toEqual(openSlots);
  });

  it("keeps a slot bookable when enough consecutive free slots follow it", () => {
    const marked = markSlotsForVehicleCount(openSlots, 30, 0, 3);
    // 09:00 has 09:30 and 10:00 free right after it — bookable for 3 cars.
    expect(marked.find((s) => s.startTime === "09:00")?.booked).toBe(false);
  });

  it("marks a slot unbookable when not enough consecutive free slots remain before the window ends", () => {
    const marked = markSlotsForVehicleCount(openSlots, 30, 0, 3);
    // 10:00 is the last slot in this window — only 1 slot available from there, not 3.
    expect(marked.find((s) => s.startTime === "10:00")?.booked).toBe(true);
  });

  it("marks a slot unbookable when one of the slots it would need is already booked", () => {
    const slotsWithGap = generateTimeSlots({
      windowStartTime: "09:00",
      windowEndTime: "11:00",
      slotDurationMinutes: 30,
      bufferMinutes: 0,
      bookedStartTimes: ["09:30"],
    });
    const marked = markSlotsForVehicleCount(slotsWithGap, 30, 0, 3);
    // 09:00 would need 09:00, 09:30, 10:00 — but 09:30 is already booked.
    expect(marked.find((s) => s.startTime === "09:00")?.booked).toBe(true);
    // 09:30 itself is (and stays) booked.
    expect(marked.find((s) => s.startTime === "09:30")?.booked).toBe(true);
    // 10:00 only needs itself + 10:30 (2 more slots) — both free, so it's fine for 3... wait,
    // this window only has 09:00/09:30/10:00/10:30 (4 slots) — 10:00 needs 10:00/10:30/11:00,
    // but 11:00 doesn't exist in an 09:00-11:00 window with 30-min slots (last slot is 10:30-11:00),
    // so 10:00 can't host 3 either.
    expect(marked.find((s) => s.startTime === "10:00")?.booked).toBe(true);
  });

  it("does not chain across a gap between two separate availability windows", () => {
    // Two windows same day: 09:00-10:00 and 14:00-15:00 (a lunch-break-style gap).
    const morning = generateTimeSlots({ windowStartTime: "09:00", windowEndTime: "10:00", slotDurationMinutes: 30, bufferMinutes: 0, bookedStartTimes: [] });
    const afternoon = generateTimeSlots({
      windowStartTime: "14:00",
      windowEndTime: "15:00",
      slotDurationMinutes: 30,
      bufferMinutes: 0,
      bookedStartTimes: [],
    });
    const combined = [...morning, ...afternoon];
    const marked = markSlotsForVehicleCount(combined, 30, 0, 2);
    // 09:30 (morning's last slot) can't chain into 14:00 (afternoon's first) for a 2nd car.
    expect(marked.find((s) => s.startTime === "09:30")?.booked).toBe(true);
    // 14:00 has its own window-mate (14:30) right after it — bookable for 2.
    expect(marked.find((s) => s.startTime === "14:00")?.booked).toBe(false);
  });
});
