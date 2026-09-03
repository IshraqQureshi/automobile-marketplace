import { describe, expect, it } from "vitest";
import { signInSchema, signUpSchema } from "./schemas";

const validSignUp = {
  fullName: "John Kamau",
  email: "john@example.com",
  phone: "712345678",
  password: "password123",
  termsAccepted: "true",
} as const;

describe("signUpSchema", () => {
  it("accepts valid input", () => {
    const result = signUpSchema.safeParse(validSignUp);
    expect(result.success).toBe(true);
  });

  it("rejects an invalid email", () => {
    const result = signUpSchema.safeParse({ ...validSignUp, email: "not-an-email" });
    expect(result.success).toBe(false);
  });

  it("rejects a password shorter than the configured minimum (6 — matches supabase/config.toml)", () => {
    const result = signUpSchema.safeParse({ ...validSignUp, password: "12345" });
    expect(result.success).toBe(false);
  });

  it("accepts a password exactly at the minimum length", () => {
    const result = signUpSchema.safeParse({ ...validSignUp, password: "123456" });
    expect(result.success).toBe(true);
  });

  it("rejects a blank full name", () => {
    const result = signUpSchema.safeParse({ ...validSignUp, fullName: "   " });
    expect(result.success).toBe(false);
  });

  it("trims whitespace from email", () => {
    const result = signUpSchema.safeParse({ ...validSignUp, email: "  john@example.com  " });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe("john@example.com");
    }
  });

  it("rejects a phone number with the wrong number of digits", () => {
    const result = signUpSchema.safeParse({ ...validSignUp, phone: "12345" });
    expect(result.success).toBe(false);
  });

  it("rejects a phone number that isn't a Safaricom/Airtel-style Kenyan mobile prefix", () => {
    const result = signUpSchema.safeParse({ ...validSignUp, phone: "212345678" });
    expect(result.success).toBe(false);
  });

  it("rejects when the terms checkbox isn't checked", () => {
    const result = signUpSchema.safeParse({ ...validSignUp, termsAccepted: undefined });
    expect(result.success).toBe(false);
  });
});

describe("signInSchema", () => {
  it("accepts valid input", () => {
    const result = signInSchema.safeParse({ email: "john@example.com", password: "anything" });
    expect(result.success).toBe(true);
  });

  it("rejects an empty password (no minimum-length rule — that's signUp's job)", () => {
    const result = signInSchema.safeParse({ email: "john@example.com", password: "" });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid email", () => {
    const result = signInSchema.safeParse({ email: "not-an-email", password: "anything" });
    expect(result.success).toBe(false);
  });
});
