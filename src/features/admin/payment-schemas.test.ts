import { describe, expect, it } from "vitest";
import { editSubscriptionPaymentSchema, paymentAmountSchema, subscriptionPaymentSchema } from "./payment-schemas";

describe("paymentAmountSchema", () => {
  it("accepts a valid decimal amount", () => {
    const result = paymentAmountSchema.safeParse("60000");
    expect(result.success).toBe(true);
    if (result.success) expect(result.data).toBe(60000);
  });

  it("rejects zero and negative amounts", () => {
    expect(paymentAmountSchema.safeParse("0").success).toBe(false);
    expect(paymentAmountSchema.safeParse("-100").success).toBe(false);
  });

  it("rejects non-numeric input", () => {
    expect(paymentAmountSchema.safeParse("free").success).toBe(false);
  });
});

describe("subscriptionPaymentSchema", () => {
  const valid = {
    showroomId: "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    amount: "60000",
    paymentMethod: "MPESA",
    reference: "QWE123",
    notes: "Quarterly subscription",
    startDate: "2026-01-01",
    endDate: "2026-03-31",
  };

  it("accepts a fully valid payment", () => {
    expect(subscriptionPaymentSchema.safeParse(valid).success).toBe(true);
  });

  it("accepts empty reference/notes", () => {
    expect(subscriptionPaymentSchema.safeParse({ ...valid, reference: "", notes: "" }).success).toBe(true);
  });

  it("rejects an end date before the start date", () => {
    const result = subscriptionPaymentSchema.safeParse({ ...valid, startDate: "2026-03-31", endDate: "2026-01-01" });
    expect(result.success).toBe(false);
  });

  it("accepts an end date equal to the start date (a single-day period)", () => {
    expect(subscriptionPaymentSchema.safeParse({ ...valid, startDate: "2026-01-01", endDate: "2026-01-01" }).success).toBe(true);
  });

  it("rejects an invalid showroom id", () => {
    expect(subscriptionPaymentSchema.safeParse({ ...valid, showroomId: "not-a-uuid" }).success).toBe(false);
  });

  it("rejects a payment method outside the fixed list", () => {
    expect(subscriptionPaymentSchema.safeParse({ ...valid, paymentMethod: "CRYPTO" }).success).toBe(false);
  });

  it("rejects a malformed date", () => {
    expect(subscriptionPaymentSchema.safeParse({ ...valid, endDate: "31-03-2026" }).success).toBe(false);
  });
});

describe("editSubscriptionPaymentSchema", () => {
  it("accepts valid fields without a showroomId", () => {
    const result = editSubscriptionPaymentSchema.safeParse({
      amount: "60000",
      paymentMethod: "BANK_TRANSFER",
      reference: "",
      notes: "",
      startDate: "2026-04-01",
      endDate: "2026-06-30",
    });
    expect(result.success).toBe(true);
  });
});
