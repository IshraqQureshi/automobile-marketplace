// Pure financing-estimate math for the vehicle detail page's calculator.
// Every input here is a REAL per-vehicle field the showroom owner entered
// (down payment %/amount, interest rate % per year, insurance % of price,
// tracker fee, tenure options) — this computes a real estimate from real
// data, not a fabricated/mocked figure. Uses simple (flat) interest prorated
// by loan term, an honest approximation appropriate for an "estimate only"
// disclaimer (matches the design's own copy) — not a claim of amortization-
// schedule precision.

export type ExtraType = "PERCENT" | "FIXED" | "YEARLY";

// The showroom's Extra amount for a 1, 2 and 3 year term (YEARLY type).
export interface YearlyExtraAmounts {
  year1: number | null;
  year2: number | null;
  year3: number | null;
}

/**
 * The Extra amount for a loan term, or null when the showroom didn't enter
 * one for that year (or the term isn't 12/24/36 months). Loan terms are the
 * year choice: 12 months = 1 year, 24 = 2 years, 36 = 3 years.
 */
export function yearlyExtraForTenure(amounts: YearlyExtraAmounts, tenureMonths: number): number | null {
  const byMonths: Record<number, number | null> = { 12: amounts.year1, 24: amounts.year2, 36: amounts.year3 };
  return byMonths[tenureMonths] ?? null;
}

/**
 * Loan terms a buyer can pick. For a YEARLY extra only the years the
 * showroom actually priced are offered — a 2-year term with no 2-year Extra
 * would otherwise silently calculate with an Extra of 0.
 */
export function selectableTenuresForExtra(type: ExtraType, amounts: YearlyExtraAmounts, tenureOptionsMonths: number[]): number[] {
  if (type !== "YEARLY") return tenureOptionsMonths;
  return tenureOptionsMonths.filter((months) => yearlyExtraForTenure(amounts, months) != null);
}

export interface FinanceCalculatorInputs {
  price: number;
  downPaymentType: "PERCENT" | "FIXED";
  downPaymentPercent: number | null;
  downPaymentAmount: number | null;
  // FIXED is a flat total interest charge (same "literal amount, not a
  // formula input" semantics as downPaymentType FIXED) rather than a %/year
  // rate scaled by loan amount and tenure — optional/defaults to PERCENT so
  // every existing PERCENT-only caller keeps working unchanged.
  interestRateType?: ExtraType;
  interestRatePercentPerYear: number;
  interestRateAmount?: number | null;
  // Used when interestRateType is YEARLY — the amount for tenureMonths is picked.
  interestYearlyAmounts?: YearlyExtraAmounts;
  insurancePercent: number | null;
  trackerFee: number;
  // The selected tracker plan's OWN duration in months (e.g. a "3 Years"
  // plan is 36), independent of tenureMonths (the loan's own term). Used to
  // spread the tracker's real fee into a real monthly figure instead of
  // dividing it by an unrelated loan term. null/0 when no tracker is
  // selected.
  trackerDurationMonths?: number | null;
  tenureMonths: number;
}

export interface FinanceCalculatorResult {
  downPayment: number;
  loanAmount: number;
  totalInterest: number;
  insurance: number;
  trackerFee: number;
  trackerMonthlyFee: number;
  monthlyPayment: number;
  totalPayable: number;
}

// Parses the leading number out of a tracker duration label like "1 Year" /
// "2 Years" / "3 Years" (the exact strings produced by the fixed-slot
// tracker fields in schemas.ts) and converts to months. Returns 0 for an
// unrecognized/empty label so callers can safely skip the monthly-fee
// spread rather than divide by zero.
export function trackerDurationToMonths(duration: string | null | undefined): number {
  if (!duration) return 0;
  const years = Number.parseInt(duration, 10);
  return Number.isFinite(years) && years > 0 ? years * 12 : 0;
}

export function calculateFinanceEstimate(inputs: FinanceCalculatorInputs): FinanceCalculatorResult {
  const downPayment =
    inputs.downPaymentType === "FIXED" ? Math.max(0, inputs.downPaymentAmount ?? 0) : inputs.price * (Math.max(0, inputs.downPaymentPercent ?? 0) / 100);

  const loanAmount = Math.max(0, inputs.price - downPayment);
  const totalInterest =
    inputs.interestRateType === "FIXED"
      ? Math.max(0, inputs.interestRateAmount ?? 0)
      : inputs.interestRateType === "YEARLY"
        ? Math.max(0, (inputs.interestYearlyAmounts ? yearlyExtraForTenure(inputs.interestYearlyAmounts, inputs.tenureMonths) : null) ?? 0)
        : loanAmount * (Math.max(0, inputs.interestRatePercentPerYear) / 100) * (Math.max(1, inputs.tenureMonths) / 12);
  const insurance = inputs.price * (Math.max(0, inputs.insurancePercent ?? 0) / 100);
  const trackerFee = Math.max(0, inputs.trackerFee);
  const trackerDurationMonths = Math.max(0, inputs.trackerDurationMonths ?? 0);
  // The tracker's fee is a real recurring cost over its OWN plan duration,
  // not the loan's tenure — a 3-year tracker fee divided by a 12-month loan
  // tenure would overstate the effective monthly cost roughly 3x.
  const trackerMonthlyFee = trackerDurationMonths > 0 ? trackerFee / trackerDurationMonths : 0;

  const totalPayable = downPayment + loanAmount + totalInterest + insurance + trackerFee;
  const monthlyPayment = inputs.tenureMonths > 0 ? (loanAmount + totalInterest + insurance) / inputs.tenureMonths + trackerMonthlyFee : trackerMonthlyFee;

  return {
    downPayment: Math.round(downPayment),
    loanAmount: Math.round(loanAmount),
    totalInterest: Math.round(totalInterest),
    insurance: Math.round(insurance),
    trackerFee: Math.round(trackerFee),
    trackerMonthlyFee: Math.round(trackerMonthlyFee),
    monthlyPayment: Math.round(monthlyPayment),
    totalPayable: Math.round(totalPayable),
  };
}
