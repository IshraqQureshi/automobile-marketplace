import { describe, expect, it } from "vitest";
import { commissionFieldSchemas } from "./commission-schemas";

describe("commissionFieldSchemas.amount", () => {
  it("accepts a valid positive amount", () => {
    expect(commissionFieldSchemas.amount.safeParse("50000").success).toBe(true);
  });

  it("accepts zero", () => {
    expect(commissionFieldSchemas.amount.safeParse("0").success).toBe(true);
  });

  it("rejects a negative amount", () => {
    expect(commissionFieldSchemas.amount.safeParse("-1").success).toBe(false);
  });

  it("rejects an unrealistically large amount", () => {
    expect(commissionFieldSchemas.amount.safeParse("9999999999").success).toBe(false);
  });

  it("rejects non-numeric input", () => {
    expect(commissionFieldSchemas.amount.safeParse("not-a-number").success).toBe(false);
  });
});

describe("commissionFieldSchemas.status", () => {
  it("accepts PENDING and PAID", () => {
    expect(commissionFieldSchemas.status.safeParse("PENDING").success).toBe(true);
    expect(commissionFieldSchemas.status.safeParse("PAID").success).toBe(true);
  });

  it("rejects an arbitrary status value", () => {
    expect(commissionFieldSchemas.status.safeParse("REFUNDED").success).toBe(false);
  });
});

describe("commissionFieldSchemas.notes", () => {
  it("accepts undefined (notes are optional)", () => {
    expect(commissionFieldSchemas.notes.safeParse(undefined).success).toBe(true);
  });

  it("rejects notes over 500 characters", () => {
    expect(commissionFieldSchemas.notes.safeParse("a".repeat(501)).success).toBe(false);
  });
});
