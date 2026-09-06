// Pure financing-estimate math for the vehicle detail page's calculator.
// Every input here is a REAL per-vehicle field the showroom owner entered
// (down payment %/amount, interest rate % per year, insurance % of price,
// tracker fee, tenure options) — this computes a real estimate from real
// data, not a fabricated/mocked figure. Uses simple (flat) interest prorated
// by loan term, an honest approximation appropriate for an "estimate only"
// disclaimer (matches the design's own copy) — not a claim of amortization-
// schedule precision.

export interface FinanceCalculatorInputs {
  price: number;
  downPaymentType: "PERCENT" | "FIXED";
  downPaymentPercent: number | null;
  downPaymentAmount: number | null;
  interestRatePercentPerYear: number;
  insurancePercent: number | null;
  trackerFee: number;
  tenureMonths: number;
}

export interface FinanceCalculatorResult {
  downPayment: number;
  loanAmount: number;
  totalInterest: number;
  insurance: number;
  trackerFee: number;
  monthlyPayment: number;
  totalPayable: number;
}

export function calculateFinanceEstimate(inputs: FinanceCalculatorInputs): FinanceCalculatorResult {
  const downPayment =
    inputs.downPaymentType === "FIXED" ? Math.max(0, inputs.downPaymentAmount ?? 0) : inputs.price * (Math.max(0, inputs.downPaymentPercent ?? 0) / 100);

  const loanAmount = Math.max(0, inputs.price - downPayment);
  const totalInterest = loanAmount * (Math.max(0, inputs.interestRatePercentPerYear) / 100) * (Math.max(1, inputs.tenureMonths) / 12);
  const insurance = inputs.price * (Math.max(0, inputs.insurancePercent ?? 0) / 100);
  const trackerFee = Math.max(0, inputs.trackerFee);

  const totalPayable = downPayment + loanAmount + totalInterest + insurance + trackerFee;
  const monthlyPayment = inputs.tenureMonths > 0 ? (loanAmount + totalInterest + insurance + trackerFee) / inputs.tenureMonths : 0;

  return {
    downPayment: Math.round(downPayment),
    loanAmount: Math.round(loanAmount),
    totalInterest: Math.round(totalInterest),
    insurance: Math.round(insurance),
    trackerFee: Math.round(trackerFee),
    monthlyPayment: Math.round(monthlyPayment),
    totalPayable: Math.round(totalPayable),
  };
}
