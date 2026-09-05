import { describe, expect, it } from "vitest";
import { emailSchema, passwordSchema, profileSchema } from "./schemas";

// These schemas are thin compositions of src/features/auth/schemas.ts's
// existing rules (see that file's own schemas.test.ts for full phone/email/
// password edge-case coverage) — these tests just confirm the composition
// itself is correct, not re-testing every underlying rule a second time.

describe("profileSchema", () => {
  it("accepts a valid full name and phone", () => {
    const result = profileSchema.safeParse({ fullName: "Jane Wanjiru", phone: "712345678" });
    expect(result.success).toBe(true);
  });

  it("rejects a blank full name", () => {
    const result = profileSchema.safeParse({ fullName: "   ", phone: "712345678" });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid phone number", () => {
    const result = profileSchema.safeParse({ fullName: "Jane Wanjiru", phone: "12345" });
    expect(result.success).toBe(false);
  });

  it("accepts a blank phone — e.g. a Google OAuth signup, which never has one on file", () => {
    const result = profileSchema.safeParse({ fullName: "Jane Wanjiru", phone: "" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.phone).toBeUndefined();
    }
  });
});

describe("emailSchema", () => {
  it("accepts a valid email", () => {
    const result = emailSchema.safeParse({ email: "jane@example.com" });
    expect(result.success).toBe(true);
  });

  it("rejects an invalid email", () => {
    const result = emailSchema.safeParse({ email: "not-an-email" });
    expect(result.success).toBe(false);
  });
});

describe("passwordSchema", () => {
  it("accepts matching passwords at the minimum length", () => {
    const result = passwordSchema.safeParse({ password: "123456", confirmPassword: "123456" });
    expect(result.success).toBe(true);
  });

  it("rejects mismatched passwords", () => {
    const result = passwordSchema.safeParse({ password: "password123", confirmPassword: "different123" });
    expect(result.success).toBe(false);
  });

  it("rejects a password shorter than the configured minimum", () => {
    const result = passwordSchema.safeParse({ password: "12345", confirmPassword: "12345" });
    expect(result.success).toBe(false);
  });
});
