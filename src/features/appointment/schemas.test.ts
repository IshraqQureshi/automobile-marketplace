import { describe, expect, it } from "vitest";
import {
  appointmentDateSchema,
  appointmentStartTimeSchema,
  appointmentVehicleIdsSchema,
  bufferMinutesSchema,
  slotDurationMinutesSchema,
} from "./schemas";

function isoDate(daysFromToday: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysFromToday);
  return d.toISOString().slice(0, 10);
}

describe("appointmentDateSchema", () => {
  it("accepts today", () => {
    expect(appointmentDateSchema.safeParse(isoDate(0)).success).toBe(true);
  });

  it("accepts a future date", () => {
    expect(appointmentDateSchema.safeParse(isoDate(10)).success).toBe(true);
  });

  it("rejects a past date", () => {
    expect(appointmentDateSchema.safeParse(isoDate(-1)).success).toBe(false);
  });

  it("rejects a malformed date string", () => {
    expect(appointmentDateSchema.safeParse("not-a-date").success).toBe(false);
  });
});

describe("appointmentStartTimeSchema", () => {
  it("accepts a valid HH:MM time", () => {
    expect(appointmentStartTimeSchema.safeParse("09:30").success).toBe(true);
  });

  it("rejects a blank value", () => {
    expect(appointmentStartTimeSchema.safeParse("").success).toBe(false);
  });

  it("rejects a malformed time", () => {
    expect(appointmentStartTimeSchema.safeParse("9:30am").success).toBe(false);
  });
});

describe("appointmentVehicleIdsSchema", () => {
  it("accepts one vehicle id", () => {
    expect(appointmentVehicleIdsSchema.safeParse(["3fa85f64-5717-4562-b3fc-2c963f66afa6"]).success).toBe(true);
  });

  it("accepts multiple vehicle ids", () => {
    expect(
      appointmentVehicleIdsSchema.safeParse(["3fa85f64-5717-4562-b3fc-2c963f66afa6", "3fa85f64-5717-4562-b3fc-2c963f66afa7"]).success,
    ).toBe(true);
  });

  it("rejects an empty list", () => {
    expect(appointmentVehicleIdsSchema.safeParse([]).success).toBe(false);
  });

  it("rejects a non-uuid entry", () => {
    expect(appointmentVehicleIdsSchema.safeParse(["not-a-uuid"]).success).toBe(false);
  });
});

describe("slotDurationMinutesSchema", () => {
  it("accepts a typical slot length", () => {
    const result = slotDurationMinutesSchema.safeParse("30");
    expect(result.success).toBe(true);
    if (result.success) expect(result.data).toBe(30);
  });

  it("rejects zero", () => {
    expect(slotDurationMinutesSchema.safeParse("0").success).toBe(false);
  });

  it("rejects a value over 480 minutes", () => {
    expect(slotDurationMinutesSchema.safeParse("481").success).toBe(false);
  });
});

describe("bufferMinutesSchema", () => {
  it("accepts zero", () => {
    expect(bufferMinutesSchema.safeParse("0").success).toBe(true);
  });

  it("accepts a positive buffer", () => {
    const result = bufferMinutesSchema.safeParse("15");
    expect(result.success).toBe(true);
    if (result.success) expect(result.data).toBe(15);
  });

  it("rejects a negative value string", () => {
    expect(bufferMinutesSchema.safeParse("-5").success).toBe(false);
  });
});
