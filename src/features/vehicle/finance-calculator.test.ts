import { describe, expect, it } from "vitest";
import { calculateFinanceEstimate, trackerDurationToMonths } from "./finance-calculator";

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
  it("computes percent-based down payment, loan amount, interest, and insurance", () => {
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
    // No trackerDurationMonths supplied → no tracker cost spread into the
    // monthly figure. monthlyPayment = (1,600,000 + 448,000 + 70,000) / 24
    expect(result.monthlyPayment).toBe(Math.round((1_600_000 + 448_000 + 70_000) / 24));
    expect(result.totalPayable).toBe(400_000 + 1_600_000 + 448_000 + 70_000 + 15_000);
  });

  it("uses a fixed down payment amount instead of a percentage when downPaymentType is FIXED", () => {
    const result = calculateFinanceEstimate({ ...BASE, downPaymentType: "FIXED", downPaymentAmount: 300_000, downPaymentPercent: null });
    expect(result.downPayment).toBe(300_000);
    expect(result.loanAmount).toBe(1_700_000);
  });

  it("uses a flat interest amount instead of a %/year rate when interestRateType is FIXED", () => {
    const result = calculateFinanceEstimate({ ...BASE, interestRateType: "FIXED", interestRateAmount: 50_000 });
    expect(result.totalInterest).toBe(50_000);
    // Unlike the PERCENT path, a FIXED amount doesn't scale with tenure.
    const shorterTenure = calculateFinanceEstimate({ ...BASE, interestRateType: "FIXED", interestRateAmount: 50_000, tenureMonths: 12 });
    expect(shorterTenure.totalInterest).toBe(50_000);
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
    expect(result.trackerMonthlyFee).toBe(0);
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

  describe("tracker fee spread over its own duration in months", () => {
    it("divides the tracker's fee by its OWN duration, not the loan's tenure", () => {
      // A 2-year (24-month) tracker fee of 24,000 on a 12-month loan —
      // spreading over the tracker's real 24-month plan gives 1,000/mo,
      // not 24,000/12 = 2,000/mo (the old, incorrect behavior that divided
      // by the unrelated loan tenure).
      const result = calculateFinanceEstimate({ ...BASE, tenureMonths: 12, trackerFee: 24_000, trackerDurationMonths: 24 });
      expect(result.trackerMonthlyFee).toBe(1_000);
    });

    it("adds the tracker's monthly fee on top of the loan-based monthly payment", () => {
      const withoutTracker = calculateFinanceEstimate({ ...BASE, trackerFee: 0, trackerDurationMonths: 0 });
      const withTracker = calculateFinanceEstimate({ ...BASE, trackerFee: 36_000, trackerDurationMonths: 36 });
      // 36,000 / 36 months = 1,000/mo
      expect(withTracker.trackerMonthlyFee).toBe(1_000);
      expect(withTracker.monthlyPayment).toBe(withoutTracker.monthlyPayment + 1_000);
    });

    it("keeps totalPayable as the full real tracker fee, unaffected by the loan tenure", () => {
      const shortTenure = calculateFinanceEstimate({ ...BASE, tenureMonths: 12, trackerFee: 40_000, trackerDurationMonths: 36 });
      const longTenure = calculateFinanceEstimate({ ...BASE, tenureMonths: 36, trackerFee: 40_000, trackerDurationMonths: 36 });
      expect(shortTenure.trackerFee).toBe(40_000);
      expect(longTenure.trackerFee).toBe(40_000);
    });

    it("treats a missing/zero trackerDurationMonths as no tracker selected — no divide-by-zero", () => {
      const result = calculateFinanceEstimate({ ...BASE, trackerFee: 15_000, trackerDurationMonths: 0 });
      expect(result.trackerMonthlyFee).toBe(0);
      expect(Number.isFinite(result.monthlyPayment)).toBe(true);
    });
  });
});

describe("trackerDurationToMonths", () => {
  it("parses '1 Year' as 12 months", () => {
    expect(trackerDurationToMonths("1 Year")).toBe(12);
  });

  it("parses '2 Years' as 24 months", () => {
    expect(trackerDurationToMonths("2 Years")).toBe(24);
  });

  it("parses '3 Years' as 36 months", () => {
    expect(trackerDurationToMonths("3 Years")).toBe(36);
  });

  it("returns 0 for null/undefined/empty (no tracker selected)", () => {
    expect(trackerDurationToMonths(null)).toBe(0);
    expect(trackerDurationToMonths(undefined)).toBe(0);
    expect(trackerDurationToMonths("")).toBe(0);
  });

  it("returns 0 for an unrecognized label rather than throwing", () => {
    expect(trackerDurationToMonths("lifetime")).toBe(0);
  });
});
