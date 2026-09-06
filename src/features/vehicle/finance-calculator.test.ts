import { describe, expect, it } from "vitest";
import { calculateFinanceEstimate } from "./finance-calculator";

const BASE = {
  price: 2_000_000,
  downPaymentType: "PERCENT" as const,
  downPaymentPercent: 20,
  downPaymentAmount: null,
  interestRatePercentPerYear: 14,
  insurancePercent: 3.5,
  trackerFee: 15_000,
  tenureMonths: 24,
};

describe("calculateFinanceEstimate", () => {
  it("computes percent-based down payment, loan amount, interest, insurance, and monthly payment", () => {
    const result = calculateFinanceEstimate(BASE);
    // downPayment = 2,000,000 * 0.20 = 400,000
    expect(result.downPayment).toBe(400_000);
    // loanAmount = 2,000,000 - 400,000 = 1,600,000
    expect(result.loanAmount).toBe(1_600_000);
    // totalInterest = 1,600,000 * 0.14 * (24/12) = 448,000
    expect(result.totalInterest).toBe(448_000);
    // insurance = 2,000,000 * 0.035 = 70,000
    expect(result.insurance).toBe(70_000);
    expect(result.trackerFee).toBe(15_000);
    // monthlyPayment = (1,600,000 + 448,000 + 70,000 + 15,000) / 24
    expect(result.monthlyPayment).toBe(Math.round((1_600_000 + 448_000 + 70_000 + 15_000) / 24));
    expect(result.totalPayable).toBe(400_000 + 1_600_000 + 448_000 + 70_000 + 15_000);
  });

  it("uses a fixed down payment amount instead of a percentage when downPaymentType is FIXED", () => {
    const result = calculateFinanceEstimate({ ...BASE, downPaymentType: "FIXED", downPaymentAmount: 300_000, downPaymentPercent: null });
    expect(result.downPayment).toBe(300_000);
    expect(result.loanAmount).toBe(1_700_000);
  });

  it("halves total interest when the tenure is halved (interest scales with loan term)", () => {
    const full = calculateFinanceEstimate({ ...BASE, tenureMonths: 24 });
    const half = calculateFinanceEstimate({ ...BASE, tenureMonths: 12 });
    expect(half.totalInterest).toBe(Math.round(full.totalInterest / 2));
  });

  it("returns zero interest/insurance/tracker/down-payment for an all-zero/null input, not NaN or negative", () => {
    const result = calculateFinanceEstimate({
      price: 1_000_000,
      downPaymentType: "PERCENT",
      downPaymentPercent: 0,
      downPaymentAmount: null,
      interestRatePercentPerYear: 0,
      insurancePercent: null,
      trackerFee: 0,
      tenureMonths: 12,
    });
    expect(result.downPayment).toBe(0);
    expect(result.loanAmount).toBe(1_000_000);
    expect(result.totalInterest).toBe(0);
    expect(result.insurance).toBe(0);
    expect(result.monthlyPayment).toBeGreaterThan(0);
    expect(Number.isNaN(result.monthlyPayment)).toBe(false);
  });

  it("clamps a negative down payment percent/amount to zero rather than inflating the loan", () => {
    const result = calculateFinanceEstimate({ ...BASE, downPaymentPercent: -50 });
    expect(result.downPayment).toBe(0);
    expect(result.loanAmount).toBe(BASE.price);
  });

  it("never returns a negative loan amount when down payment exceeds price", () => {
    const result = calculateFinanceEstimate({ ...BASE, downPaymentType: "FIXED", downPaymentAmount: 5_000_000, downPaymentPercent: null });
    expect(result.loanAmount).toBe(0);
    expect(result.totalInterest).toBe(0);
  });

  it("handles decimal interest/insurance rates without rounding error blowing up", () => {
    const result = calculateFinanceEstimate({ ...BASE, interestRatePercentPerYear: 13.75, insurancePercent: 2.25 });
    expect(result.totalInterest).toBe(Math.round(1_600_000 * 0.1375 * 2));
    expect(result.insurance).toBe(Math.round(2_000_000 * 0.0225));
  });

  it("handles a large price without overflow/precision loss", () => {
    const result = calculateFinanceEstimate({ ...BASE, price: 60_000_000, downPaymentPercent: 40 });
    expect(result.downPayment).toBe(24_000_000);
    expect(result.loanAmount).toBe(36_000_000);
    expect(Number.isFinite(result.monthlyPayment)).toBe(true);
  });

  it("guards tenureMonths of zero from producing Infinity/NaN in monthlyPayment", () => {
    const result = calculateFinanceEstimate({ ...BASE, tenureMonths: 0 });
    expect(result.monthlyPayment).toBe(0);
    expect(Number.isFinite(result.monthlyPayment)).toBe(true);
  });
});
