import { describe, expect, it } from "vitest";
import { signInSchema, signUpSchema } from "./schemas";

const validSignUp = {
  fullName: "John Kamau",
  email: "john@example.com",
  phone: "712345678",
  password: "password123",
  confirmPassword: "password123",
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
    const result = signUpSchema.safeParse({ ...validSignUp, password: "123456", confirmPassword: "123456" });
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

  it("accepts a phone number formatted like the input's own placeholder ('7xx xxx xxx')", () => {
    const result = signUpSchema.safeParse({ ...validSignUp, phone: "712 345 678" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.phone).toBe("712345678");
    }
  });

  it("accepts a phone number typed with a leading 0, stripping it", () => {
    const result = signUpSchema.safeParse({ ...validSignUp, phone: "0712345678" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.phone).toBe("712345678");
    }
  });

  it("accepts a dash-separated phone number", () => {
    const result = signUpSchema.safeParse({ ...validSignUp, phone: "712-345-678" });
    expect(result.success).toBe(true);
  });

  it("rejects when confirmPassword doesn't match password", () => {
    const result = signUpSchema.safeParse({ ...validSignUp, confirmPassword: "different123" });
    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find((i) => i.path[0] === "confirmPassword");
      expect(issue?.message).toBe("Passwords do not match");
    }
  });

  it("rejects a blank confirmPassword", () => {
    const result = signUpSchema.safeParse({ ...validSignUp, confirmPassword: "" });
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
