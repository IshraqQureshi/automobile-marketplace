import { describe, expect, it } from "vitest";
import { signInSchema, signUpSchema } from "./schemas";

describe("signUpSchema", () => {
  it("accepts valid input", () => {
    const result = signUpSchema.safeParse({
      fullName: "John Kamau",
      email: "john@example.com",
      password: "password123",
    });
    expect(result.success).toBe(true);
  });

  it("rejects an invalid email", () => {
    const result = signUpSchema.safeParse({
      fullName: "John Kamau",
      email: "not-an-email",
      password: "password123",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a password shorter than the configured minimum (6 — matches supabase/config.toml)", () => {
    const result = signUpSchema.safeParse({
      fullName: "John Kamau",
      email: "john@example.com",
      password: "12345",
    });
    expect(result.success).toBe(false);
  });

  it("accepts a password exactly at the minimum length", () => {
    const result = signUpSchema.safeParse({
      fullName: "John Kamau",
      email: "john@example.com",
      password: "123456",
    });
    expect(result.success).toBe(true);
  });

  it("rejects a blank full name", () => {
    const result = signUpSchema.safeParse({
      fullName: "   ",
      email: "john@example.com",
      password: "password123",
    });
    expect(result.success).toBe(false);
  });

  it("trims whitespace from email", () => {
    const result = signUpSchema.safeParse({
      fullName: "John Kamau",
      email: "  john@example.com  ",
      password: "password123",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe("john@example.com");
    }
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
