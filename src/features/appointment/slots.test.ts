import { describe, expect, it } from "vitest";
import { generateTimeSlots } from "./slots";

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
