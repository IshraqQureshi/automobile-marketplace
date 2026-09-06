import { describe, expect, it } from "vitest";
import { registerShowroomSchema } from "./schemas";

const valid = {
  ownerFullName: "Jane Wanjiru",
  businessName: "AutoElite Motors",
  location: "Westlands, Nairobi",
  businessPhone: "712345678",
  businessEmail: "sales@autoelite.co.ke",
};

describe("registerShowroomSchema", () => {
  it("accepts valid input", () => {
    const result = registerShowroomSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it("trims and rejects a blank business name", () => {
    const result = registerShowroomSchema.safeParse({ ...valid, businessName: "   " });
    expect(result.success).toBe(false);
  });

  it("rejects a business name over 150 characters", () => {
    const result = registerShowroomSchema.safeParse({ ...valid, businessName: "A".repeat(151) });
    expect(result.success).toBe(false);
  });

  it("rejects a blank owner full name", () => {
    const result = registerShowroomSchema.safeParse({ ...valid, ownerFullName: "  " });
    expect(result.success).toBe(false);
  });

  it("rejects an owner full name over 150 characters", () => {
    const result = registerShowroomSchema.safeParse({ ...valid, ownerFullName: "A".repeat(151) });
    expect(result.success).toBe(false);
  });

  it("rejects a blank location", () => {
    const result = registerShowroomSchema.safeParse({ ...valid, location: "" });
    expect(result.success).toBe(false);
  });

  it("accepts a phone number with a leading 0 and strips it", () => {
    const result = registerShowroomSchema.safeParse({ ...valid, businessPhone: "0712345678" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.businessPhone).toBe("712345678");
  });

  it("accepts a phone number with spaces", () => {
    const result = registerShowroomSchema.safeParse({ ...valid, businessPhone: "712 345 678" });
    expect(result.success).toBe(true);
  });

  it("rejects a phone number that isn't a valid Kenyan mobile prefix", () => {
    const result = registerShowroomSchema.safeParse({ ...valid, businessPhone: "212345678" });
    expect(result.success).toBe(false);
  });

  it("rejects a phone number with the wrong number of digits", () => {
    const result = registerShowroomSchema.safeParse({ ...valid, businessPhone: "71234567" });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid business email", () => {
    const result = registerShowroomSchema.safeParse({ ...valid, businessEmail: "not-an-email" });
    expect(result.success).toBe(false);
  });

  it("rejects a blank business email", () => {
    const result = registerShowroomSchema.safeParse({ ...valid, businessEmail: "" });
    expect(result.success).toBe(false);
  });
});
