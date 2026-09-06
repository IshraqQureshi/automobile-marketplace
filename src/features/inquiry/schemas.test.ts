import { describe, expect, it } from "vitest";
import { inquiryEmailSchema, inquiryMessageSchema, inquiryNameSchema, inquiryPhoneSchema } from "./schemas";

describe("inquiryNameSchema", () => {
  it("accepts a real name", () => {
    expect(inquiryNameSchema.safeParse("Jane Wanjiru").success).toBe(true);
  });

  it("rejects a name under 2 characters", () => {
    expect(inquiryNameSchema.safeParse("J").success).toBe(false);
  });

  it("rejects a blank/whitespace-only name", () => {
    expect(inquiryNameSchema.safeParse("   ").success).toBe(false);
  });
});

describe("inquiryEmailSchema", () => {
  it("accepts a valid email", () => {
    expect(inquiryEmailSchema.safeParse("jane@example.com").success).toBe(true);
  });

  it("rejects a malformed email", () => {
    expect(inquiryEmailSchema.safeParse("not-an-email").success).toBe(false);
  });

  it("rejects an empty email", () => {
    expect(inquiryEmailSchema.safeParse("").success).toBe(false);
  });
});

describe("inquiryPhoneSchema", () => {
  it("accepts a valid local Kenyan number", () => {
    expect(inquiryPhoneSchema.safeParse("712345678").success).toBe(true);
  });

  it("strips a leading 0 the way every other phone field in the app does", () => {
    const result = inquiryPhoneSchema.safeParse("0712345678");
    expect(result.success).toBe(true);
    if (result.success) expect(result.data).toBe("712345678");
  });

  it("rejects a too-short number", () => {
    expect(inquiryPhoneSchema.safeParse("712345").success).toBe(false);
  });

  it("rejects a non-Kenyan-looking number", () => {
    expect(inquiryPhoneSchema.safeParse("12345678901").success).toBe(false);
  });
});

describe("inquiryMessageSchema", () => {
  it("accepts a real message", () => {
    expect(inquiryMessageSchema.safeParse("Is this vehicle still available for viewing this weekend?").success).toBe(true);
  });

  it("rejects a message under 10 characters", () => {
    expect(inquiryMessageSchema.safeParse("too short").success).toBe(false);
  });

  it("rejects a message over 2000 characters", () => {
    expect(inquiryMessageSchema.safeParse("a".repeat(2001)).success).toBe(false);
  });

  it("trims whitespace before length-checking", () => {
    expect(inquiryMessageSchema.safeParse("   too short   ").success).toBe(false);
  });
});
