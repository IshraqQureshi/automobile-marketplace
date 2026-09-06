import { describe, expect, it } from "vitest";
import { extractClientIp, hashClientIp } from "./view-tracking";

describe("hashClientIp", () => {
  it("returns a stable sha256 hex digest for the same IP", () => {
    const first = hashClientIp("41.90.12.34");
    const second = hashClientIp("41.90.12.34");
    expect(first).toBe(second);
    expect(first).toMatch(/^[0-9a-f]{64}$/);
  });

  it("returns different hashes for different IPs", () => {
    expect(hashClientIp("41.90.12.34")).not.toBe(hashClientIp("41.90.12.35"));
  });

  it("trims whitespace before hashing so trailing spaces don't create a distinct visitor", () => {
    expect(hashClientIp("41.90.12.34")).toBe(hashClientIp("  41.90.12.34  "));
  });
});

describe("extractClientIp", () => {
  it("takes the first address from a multi-hop x-forwarded-for chain", () => {
    const headers: Record<string, string> = { "x-forwarded-for": "41.90.12.34, 10.0.0.1, 10.0.0.2" };
    expect(extractClientIp((name) => headers[name] ?? null)).toBe("41.90.12.34");
  });

  it("trims whitespace around the first address", () => {
    const headers: Record<string, string> = { "x-forwarded-for": "  41.90.12.34  , 10.0.0.1" };
    expect(extractClientIp((name) => headers[name] ?? null)).toBe("41.90.12.34");
  });

  it("falls back to x-real-ip when x-forwarded-for is absent", () => {
    const headers: Record<string, string> = { "x-real-ip": "41.90.12.34" };
    expect(extractClientIp((name) => headers[name] ?? null)).toBe("41.90.12.34");
  });

  it("prefers x-forwarded-for over x-real-ip when both are present", () => {
    const headers: Record<string, string> = { "x-forwarded-for": "41.90.12.34", "x-real-ip": "9.9.9.9" };
    expect(extractClientIp((name) => headers[name] ?? null)).toBe("41.90.12.34");
  });

  it("returns null when neither header is present", () => {
    expect(extractClientIp(() => null)).toBeNull();
  });

  it("returns null for an empty x-forwarded-for value", () => {
    expect(extractClientIp((name) => (name === "x-forwarded-for" ? "" : null))).toBeNull();
  });

  it("returns null when x-forwarded-for is only whitespace/commas", () => {
    expect(extractClientIp((name) => (name === "x-forwarded-for" ? " , " : null))).toBeNull();
  });
});
