"use client";

import { useMemo, useState } from "react";
import { calculateFinanceEstimate } from "@/features/vehicle/finance-calculator";
import { currencyFormatter } from "@/features/vehicle/types";

export interface FinancingCalculatorProps {
  price: number;
  downPaymentType: "PERCENT" | "FIXED";
  downPaymentPercent: number | null;
  downPaymentAmount: number | null;
  interestRatePercentPerYear: number;
  insurancePercent: number | null;
  trackerOptions: { duration: string; price: number }[];
  tenureOptionsMonths: number[];
}

/**
 * Every input here is real per-vehicle data the showroom owner entered
 * (src/components/dashboard/vehicle-form.tsx's Financing section) — this
 * only renders when the showroom has actually configured financing for this
 * listing (see the caller in [brand]/[slug]/page.tsx), so it never computes
 * an estimate from fabricated defaults. Tenure/tracker selects recompute
 * instantly client-side since every input is already loaded — no server
 * round-trip needed for pure math.
 */
export function FinancingCalculator({
  price,
  downPaymentType,
  downPaymentPercent,
  downPaymentAmount,
  interestRatePercentPerYear,
  insurancePercent,
  trackerOptions,
  tenureOptionsMonths,
}: FinancingCalculatorProps) {
  const [tenureMonths, setTenureMonths] = useState(tenureOptionsMonths[0]!);
  const [trackerIndex, setTrackerIndex] = useState(trackerOptions.length > 0 ? 0 : -1);

  const selectedTracker = trackerIndex >= 0 ? trackerOptions[trackerIndex] : null;

  const result = useMemo(
    () =>
      calculateFinanceEstimate({
        price,
        downPaymentType,
        downPaymentPercent,
        downPaymentAmount,
        interestRatePercentPerYear,
        insurancePercent,
        trackerFee: selectedTracker?.price ?? 0,
        tenureMonths,
      }),
    [price, downPaymentType, downPaymentPercent, downPaymentAmount, interestRatePercentPerYear, insurancePercent, selectedTracker, tenureMonths],
  );

  const downPaymentLabel =
    downPaymentType === "PERCENT" ? `Deposit (${downPaymentPercent}%)` : "Deposit (fixed)";

  return (
    <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
      <div className="grid grid-cols-1 md:grid-cols-2">
        <div className="border-b border-neutral-200 p-6 md:border-r md:border-b-0">
          <div className="mb-5 rounded-lg bg-[#f8f9fa] p-4">
            <p className="mb-1 text-[10px] font-semibold tracking-widest text-neutral-400 uppercase">Car Amount</p>
            <p className="text-2xl font-bold text-neutral-900">{currencyFormatter.format(price)}</p>
          </div>

          <FinanceRow label={downPaymentLabel} sub="Paid upfront" value={currencyFormatter.format(result.downPayment)} />
          <FinanceRow label="Interest" sub={`${interestRatePercentPerYear}% per year, over the loan term`} value={currencyFormatter.format(result.totalInterest)} />
          {insurancePercent != null && (
            <FinanceRow label={`Insurance (${insurancePercent}%)`} sub="Annual comprehensive cover" value={currencyFormatter.format(result.insurance)} />
          )}

          {trackerOptions.length > 0 && (
            <div className="flex items-center justify-between border-b border-neutral-100 py-3.5">
              <div>
                <p className="text-sm font-medium text-neutral-700">Tracker</p>
                <p className="mt-0.5 text-[11px] text-neutral-400">Vehicle tracking subscription</p>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={trackerIndex}
                  onChange={(e) => setTrackerIndex(Number(e.target.value))}
                  aria-label="Tracker duration"
                  className="rounded-lg border border-neutral-300 px-2.5 py-1.5 text-xs font-semibold text-neutral-900 outline-none"
                >
                  {trackerOptions.map((option, index) => (
                    <option key={option.duration} value={index}>
                      {option.duration}
                    </option>
                  ))}
                </select>
                <span className="text-sm font-bold text-brand">{currencyFormatter.format(selectedTracker?.price ?? 0)}</span>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between pt-4">
            <p className="text-sm font-medium text-neutral-700">Loan Term</p>
            <select
              value={tenureMonths}
              onChange={(e) => setTenureMonths(Number(e.target.value))}
              aria-label="Loan term"
              className="rounded-lg border border-neutral-300 px-3 py-1.5 text-sm font-semibold text-neutral-900 outline-none"
            >
              {tenureOptionsMonths.map((months) => (
                <option key={months} value={months}>
                  {months} months
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-col justify-between bg-[#f8f9fa] p-6">
          <div>
            <p className="mb-5 text-xs font-semibold tracking-widest text-neutral-400 uppercase">Estimate Summary</p>
            <div className="space-y-3.5">
              <SummaryRow label="Car Price" value={currencyFormatter.format(price)} />
              <SummaryRow label={downPaymentLabel} value={currencyFormatter.format(result.downPayment)} />
              <SummaryRow label="Loan Amount" value={currencyFormatter.format(result.loanAmount)} />
              <SummaryRow label={`Interest (× ${tenureMonths} mo)`} value={currencyFormatter.format(result.totalInterest)} />
              {insurancePercent != null && <SummaryRow label="Insurance" value={currencyFormatter.format(result.insurance)} />}
              {selectedTracker && <SummaryRow label={`Tracker (${selectedTracker.duration})`} value={currencyFormatter.format(result.trackerFee)} />}
              <SummaryRow label="Loan Term" value={`${tenureMonths} months`} />
            </div>
          </div>

          <div className="mt-6 border-t border-neutral-200 pt-5">
            <p className="mb-1 text-sm font-medium text-neutral-700">Est. Monthly Payment</p>
            <p className="mb-1 text-3xl font-bold text-brand">{currencyFormatter.format(result.monthlyPayment)}</p>
            <p className="text-xs text-neutral-400">Total payable: {currencyFormatter.format(result.totalPayable)}</p>
            <p className="mt-3 text-[11px] leading-snug text-neutral-400">* Estimates only. Contact the showroom for exact rates and terms.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function FinanceRow({ label, sub, value }: { label: string; sub: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-neutral-100 py-3.5">
      <div>
        <p className="text-sm font-medium text-neutral-700">{label}</p>
        <p className="mt-0.5 text-[11px] text-neutral-400">{sub}</p>
      </div>
      <span className="text-sm font-bold text-brand">{value}</span>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-neutral-500">{label}</span>
      <span className="text-sm font-medium text-neutral-900">{value}</span>
    </div>
  );
}
