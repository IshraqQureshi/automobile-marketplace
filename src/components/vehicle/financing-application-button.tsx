"use client";

import { useMemo, useState, useTransition } from "react";
import { FieldLabel } from "@/components/admin/admin-ui";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useFieldValidation } from "@/features/auth/use-field-validation";
import { submitFinancingApplicationAction } from "@/features/financing/actions";
import { EMPLOYMENT_STATUS_OPTIONS, financingApplicationFieldSchemas, financingDesiredDownPaymentPercentSchema } from "@/features/financing/schemas";
import { calculateFinanceEstimate, trackerDurationToMonths } from "@/features/vehicle/finance-calculator";
import { currencyFormatter } from "@/features/vehicle/types";
import { stripKenyaPrefix } from "@/lib/validation/kenya-phone";

export interface FinancingApplicationInitialValues {
  fullName: string;
  email: string;
  phone: string;
}

interface FinancingApplicationButtonProps {
  vehicleId: string;
  vehicleTitle: string;
  initialValues: FinancingApplicationInitialValues | null;
  price: number;
  downPaymentType: "PERCENT" | "FIXED";
  downPaymentPercent: number | null;
  defaultDesiredDownPayment: number;
  insurancePercentPsv: number | null;
  insurancePercentPrivate: number | null;
  tenureOptionsMonths: number[];
  trackerOptions: { duration: string; price: number }[];
}

// Extends the server-matching schema shape with one UI-only field —
// desiredDownPaymentPercent never itself reaches the server (it's converted
// to a KES amount before submit, see handleSubmit). Required, unlike the
// vehicle form's own (optional) down payment percent field — an admin may
// leave a vehicle's financing unconfigured, but an applicant filling out
// this form has no equivalent "leave it blank" case.
const FORM_FIELD_SCHEMAS = { ...financingApplicationFieldSchemas, desiredDownPaymentPercent: financingDesiredDownPaymentPercentSchema };

// Deliberately a fixed standard rate shown on every application,
// independent of the vehicle's own financingInterestRate/Type/Amount
// (which the Financing Calculator continues to show as-is) — direct
// client request: applications should quote this flat rate regardless of
// a specific listing's configured calculator rate.
const APPLICATION_INTEREST_RATE_PERCENT = 24;

/**
 * Real "Apply for Financing" flow (previously a disabled placeholder) —
 * works for both a signed-in customer (name/email/phone pre-filled from
 * their account, still editable) and an anonymous visitor (blank, all
 * three required), same pattern as VehicleInquiryButton. Submission,
 * emailing, and the admin/showroom inbox entries are all handled by
 * submitFinancingApplicationAction — this component is purely the
 * form/dialog UI. Only rendered when the vehicle actually has financing
 * configured (see the caller in [brand]/[slug]/page.tsx) — applying for
 * financing on a listing with no financing config makes no sense.
 */
export function FinancingApplicationButton({
  vehicleId,
  vehicleTitle,
  initialValues,
  price,
  downPaymentType,
  downPaymentPercent,
  defaultDesiredDownPayment,
  insurancePercentPsv,
  insurancePercentPrivate,
  tenureOptionsMonths,
  trackerOptions,
}: FinancingApplicationButtonProps) {
  const [open, setOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [name, setName] = useState(initialValues?.fullName ?? "");
  const [email, setEmail] = useState(initialValues?.email ?? "");
  const [phone, setPhone] = useState(initialValues ? stripKenyaPrefix(initialValues.phone) : "");
  const [employmentStatus, setEmploymentStatus] = useState("");
  const [monthlyIncome, setMonthlyIncome] = useState("");
  const [nationalId, setNationalId] = useState("");
  // Mirrors the vehicle's own financingDownPaymentType (same convention as
  // FinancingCalculator) — a PERCENT-configured vehicle collects the
  // applicant's desired down payment as a percentage too, not a KES amount
  // they'd have to compute by hand; converted to the equivalent KES amount
  // right before submit, since desired_down_payment is stored as an amount
  // regardless of how it was entered (same column the calculator's own
  // "Deposit" figure isn't tied to).
  const [desiredDownPaymentPercent, setDesiredDownPaymentPercent] = useState(String(downPaymentPercent ?? ""));
  const [desiredDownPaymentAmount, setDesiredDownPaymentAmount] = useState(String(Math.round(defaultDesiredDownPayment)));
  const [desiredTenureMonths, setDesiredTenureMonths] = useState(String(tenureOptionsMonths[0] ?? ""));
  const [desiredTrackerDuration, setDesiredTrackerDuration] = useState(trackerOptions[0]?.duration ?? "");
  const bothInsuranceTypesAvailable = insurancePercentPsv != null && insurancePercentPrivate != null;
  const hasInsurance = insurancePercentPsv != null || insurancePercentPrivate != null;
  // Same "PSV wins when both are configured" default as FinancingCalculator.
  const [insuranceType, setInsuranceType] = useState<"PSV" | "PRIVATE">(insurancePercentPsv != null ? "PSV" : "PRIVATE");
  const [notes, setNotes] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [serverFieldErrors, setServerFieldErrors] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();
  const { validate, errorFor: liveErrorFor, reset } = useFieldValidation(FORM_FIELD_SCHEMAS);

  function errorFor(field: keyof typeof FORM_FIELD_SCHEMAS) {
    return liveErrorFor(field, serverFieldErrors[field]);
  }

  function openDialog() {
    setSubmitted(false);
    setFormError(null);
    setServerFieldErrors({});
    reset();
    setOpen(true);
  }

  const desiredDownPaymentKes = useMemo(() => {
    if (downPaymentType !== "PERCENT") return Number(desiredDownPaymentAmount) || 0;
    const percent = Number(desiredDownPaymentPercent);
    return Number.isFinite(percent) ? Math.round(price * (percent / 100)) : 0;
  }, [downPaymentType, desiredDownPaymentPercent, desiredDownPaymentAmount, price]);

  const selectedTracker = trackerOptions.find((option) => option.duration === desiredTrackerDuration) ?? null;
  const insurancePercent = hasInsurance ? (insuranceType === "PSV" ? insurancePercentPsv : insurancePercentPrivate) : null;

  // Reuses the exact same formula the calculator itself uses (not a
  // reimplementation) so "Desired Insurance"/"Interest Rate" show real
  // computed amounts matching whatever the applicant has actually selected
  // above — except the rate itself, which is the fixed standard
  // APPLICATION_INTEREST_RATE_PERCENT rather than the vehicle's own
  // calculator rate (see that constant's own comment).
  const estimate = useMemo(
    () =>
      calculateFinanceEstimate({
        price,
        downPaymentType,
        downPaymentPercent: downPaymentType === "PERCENT" ? Number(desiredDownPaymentPercent) || 0 : null,
        downPaymentAmount: downPaymentType === "FIXED" ? Number(desiredDownPaymentAmount) || 0 : null,
        interestRateType: "PERCENT",
        interestRatePercentPerYear: APPLICATION_INTEREST_RATE_PERCENT,
        interestRateAmount: null,
        insurancePercent,
        trackerFee: selectedTracker?.price ?? 0,
        trackerDurationMonths: trackerDurationToMonths(selectedTracker?.duration),
        tenureMonths: Number(desiredTenureMonths) || 0,
      }),
    [price, downPaymentType, desiredDownPaymentPercent, desiredDownPaymentAmount, insurancePercent, selectedTracker, desiredTenureMonths],
  );

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    let hasError = false;
    for (const [field, value] of [
      ["name", name],
      ["email", email],
      ["phone", phone],
      ["employmentStatus", employmentStatus],
      ["monthlyIncome", monthlyIncome],
      ["nationalId", nationalId],
      [downPaymentType === "PERCENT" ? "desiredDownPaymentPercent" : "desiredDownPayment", downPaymentType === "PERCENT" ? desiredDownPaymentPercent : desiredDownPaymentAmount],
      ["desiredTenureMonths", desiredTenureMonths],
      ["notes", notes],
    ] as const) {
      if (!FORM_FIELD_SCHEMAS[field].safeParse(value).success) {
        validate(field, value);
        hasError = true;
      }
    }
    if (hasError) return;

    const formData = new FormData();
    formData.set("vehicleId", vehicleId);
    formData.set("name", name);
    formData.set("email", email);
    formData.set("phone", phone);
    formData.set("employmentStatus", employmentStatus);
    formData.set("monthlyIncome", monthlyIncome);
    formData.set("nationalId", nationalId);
    formData.set("desiredDownPayment", String(desiredDownPaymentKes));
    formData.set("desiredTenureMonths", desiredTenureMonths);
    formData.set("desiredTrackerDuration", desiredTrackerDuration);
    formData.set("desiredInsuranceType", hasInsurance ? insuranceType : "");
    formData.set("notes", notes);

    startTransition(async () => {
      const result = await submitFinancingApplicationAction(formData);
      if (result.error) {
        setFormError(result.error);
        return;
      }
      if (result.fieldErrors) {
        setServerFieldErrors(result.fieldErrors);
        setFormError("Please fix the errors below and try again.");
        return;
      }
      setSubmitted(true);
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={openDialog}
        className="shrink-0 rounded-md bg-white px-6 py-2.5 text-sm font-semibold text-brand hover:bg-neutral-50"
      >
        Apply for Financing
      </button>

      <Dialog open={open} onClose={() => setOpen(false)} title="Apply for Financing" description={vehicleTitle} size="lg">
        {submitted ? (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#f0fdf9] text-brand">
              <CheckIcon />
            </div>
            <p className="text-sm font-semibold text-neutral-900">Application submitted!</p>
            <p className="text-sm text-neutral-500">
              We have received your application successfully. Our team will contact you within 24 hours. A confirmation email has also been sent to
              you.
            </p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="mt-2 rounded-md bg-brand px-5 py-2 text-sm font-semibold text-white hover:bg-brand-dark"
            >
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <FieldLabel htmlFor="financing-name">Full Name</FieldLabel>
                <Input
                  id="financing-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onBlur={(e) => validate("name", e.target.value)}
                  placeholder="Jane Wanjiru"
                  error={!!errorFor("name")}
                />
                {errorFor("name") && <p className="mt-1 text-sm text-red-600">{errorFor("name")}</p>}
              </div>

              <div>
                <FieldLabel htmlFor="financing-email">Email</FieldLabel>
                <Input
                  id="financing-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onBlur={(e) => validate("email", e.target.value)}
                  placeholder="jane@example.com"
                  error={!!errorFor("email")}
                />
                {errorFor("email") && <p className="mt-1 text-sm text-red-600">{errorFor("email")}</p>}
              </div>

              <div>
                <FieldLabel htmlFor="financing-phone">Phone</FieldLabel>
                <div className="flex items-center gap-2">
                  <span className="flex items-center rounded-md border border-neutral-300 bg-neutral-50 px-3 py-2.5 text-sm text-neutral-500">+254</span>
                  <Input
                    id="financing-phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    onBlur={(e) => validate("phone", e.target.value)}
                    placeholder="712345678"
                    error={!!errorFor("phone")}
                  />
                </div>
                {errorFor("phone") && <p className="mt-1 text-sm text-red-600">{errorFor("phone")}</p>}
              </div>

              <div>
                <FieldLabel htmlFor="financing-national-id">National ID / Passport No.</FieldLabel>
                <Input
                  id="financing-national-id"
                  value={nationalId}
                  onChange={(e) => setNationalId(e.target.value)}
                  onBlur={(e) => validate("nationalId", e.target.value)}
                  placeholder="12345678"
                  error={!!errorFor("nationalId")}
                />
                {errorFor("nationalId") && <p className="mt-1 text-sm text-red-600">{errorFor("nationalId")}</p>}
              </div>

              <div>
                <FieldLabel htmlFor="financing-employment-status">Employment Status</FieldLabel>
                <select
                  id="financing-employment-status"
                  value={employmentStatus}
                  onChange={(e) => setEmploymentStatus(e.target.value)}
                  onBlur={(e) => validate("employmentStatus", e.target.value)}
                  className={`w-full rounded-md border px-3 py-2.5 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand ${errorFor("employmentStatus") ? "border-red-400" : "border-neutral-300"}`}
                >
                  <option value="">Select…</option>
                  {EMPLOYMENT_STATUS_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                {errorFor("employmentStatus") && <p className="mt-1 text-sm text-red-600">{errorFor("employmentStatus")}</p>}
              </div>

              <div>
                <FieldLabel htmlFor="financing-monthly-income">Monthly Income (KES)</FieldLabel>
                <Input
                  id="financing-monthly-income"
                  inputMode="numeric"
                  value={monthlyIncome}
                  onChange={(e) => setMonthlyIncome(e.target.value)}
                  onBlur={(e) => validate("monthlyIncome", e.target.value)}
                  placeholder="80000"
                  error={!!errorFor("monthlyIncome")}
                />
                {errorFor("monthlyIncome") && <p className="mt-1 text-sm text-red-600">{errorFor("monthlyIncome")}</p>}
              </div>

              <div>
                <FieldLabel htmlFor="financing-down-payment">
                  {downPaymentType === "PERCENT" ? "Desired Down Payment (%)" : "Desired Down Payment (KES)"}
                </FieldLabel>
                {downPaymentType === "PERCENT" ? (
                  <>
                    <Input
                      id="financing-down-payment"
                      inputMode="decimal"
                      value={desiredDownPaymentPercent}
                      onChange={(e) => setDesiredDownPaymentPercent(e.target.value)}
                      onBlur={(e) => validate("desiredDownPaymentPercent", e.target.value)}
                      placeholder="e.g. 20"
                      error={!!errorFor("desiredDownPaymentPercent")}
                    />
                    <p className="mt-1 text-xs text-neutral-400">≈ {currencyFormatter.format(desiredDownPaymentKes)}</p>
                  </>
                ) : (
                  <Input
                    id="financing-down-payment"
                    inputMode="numeric"
                    value={desiredDownPaymentAmount}
                    onChange={(e) => setDesiredDownPaymentAmount(e.target.value)}
                    onBlur={(e) => validate("desiredDownPayment", e.target.value)}
                    error={!!errorFor("desiredDownPayment")}
                  />
                )}
                {(errorFor("desiredDownPaymentPercent") || errorFor("desiredDownPayment")) && (
                  <p className="mt-1 text-sm text-red-600">{errorFor("desiredDownPaymentPercent") || errorFor("desiredDownPayment")}</p>
                )}
              </div>

              <div>
                <FieldLabel htmlFor="financing-tenure">Desired Loan Term</FieldLabel>
                <select
                  id="financing-tenure"
                  value={desiredTenureMonths}
                  onChange={(e) => setDesiredTenureMonths(e.target.value)}
                  onBlur={(e) => validate("desiredTenureMonths", e.target.value)}
                  className={`w-full rounded-md border px-3 py-2.5 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand ${errorFor("desiredTenureMonths") ? "border-red-400" : "border-neutral-300"}`}
                >
                  {tenureOptionsMonths.map((months) => (
                    <option key={months} value={months}>
                      {months} months
                    </option>
                  ))}
                </select>
                {errorFor("desiredTenureMonths") && <p className="mt-1 text-sm text-red-600">{errorFor("desiredTenureMonths")}</p>}
              </div>

              {trackerOptions.length > 0 && (
                <div>
                  <FieldLabel htmlFor="financing-tracker">Desired Tracker</FieldLabel>
                  <select
                    id="financing-tracker"
                    value={desiredTrackerDuration}
                    onChange={(e) => setDesiredTrackerDuration(e.target.value)}
                    className="w-full rounded-md border border-neutral-300 px-3 py-2.5 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
                  >
                    {trackerOptions.map((option) => (
                      <option key={option.duration} value={option.duration}>
                        {option.duration} — {currencyFormatter.format(option.price)}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {hasInsurance && (
                <div>
                  <FieldLabel htmlFor="financing-insurance-type">Desired Insurance</FieldLabel>
                  {bothInsuranceTypesAvailable ? (
                    <select
                      id="financing-insurance-type"
                      value={insuranceType}
                      onChange={(e) => setInsuranceType(e.target.value as "PSV" | "PRIVATE")}
                      className="w-full rounded-md border border-neutral-300 px-3 py-2.5 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
                    >
                      <option value="PSV">PSV — {insurancePercentPsv}%</option>
                      <option value="PRIVATE">Private — {insurancePercentPrivate}%</option>
                    </select>
                  ) : (
                    <p className="rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2.5 text-sm text-neutral-700">
                      {insurancePercentPsv != null ? `PSV — ${insurancePercentPsv}%` : `Private — ${insurancePercentPrivate}%`}
                    </p>
                  )}
                  <p className="mt-1 text-xs text-neutral-400">≈ {currencyFormatter.format(estimate.insurance)}</p>
                </div>
              )}

              {/* Interest isn't a choice the applicant makes, and — unlike
                  the calculator, which shows this vehicle's own configured
                  rate — the application always quotes the fixed standard
                  APPLICATION_INTEREST_RATE_PERCENT, shown read-only. */}
              <div>
                <FieldLabel htmlFor="financing-interest-rate">Interest Rate</FieldLabel>
                <p id="financing-interest-rate" className="rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2.5 text-sm text-neutral-700">
                  {APPLICATION_INTEREST_RATE_PERCENT}% per year
                </p>
                <p className="mt-1 text-xs text-neutral-400">≈ {currencyFormatter.format(estimate.totalInterest)} total interest</p>
              </div>
            </div>

            <div>
              <FieldLabel htmlFor="financing-notes">Additional Notes (optional)</FieldLabel>
              <textarea
                id="financing-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                onBlur={(e) => validate("notes", e.target.value)}
                rows={3}
                placeholder="Anything else the showroom should know…"
                className={`w-full rounded-md border px-3 py-2.5 text-sm outline-none placeholder:text-neutral-400 focus:border-brand focus:ring-1 focus:ring-brand ${errorFor("notes") ? "border-red-400" : "border-neutral-300"}`}
              />
              {errorFor("notes") && <p className="mt-1 text-sm text-red-600">{errorFor("notes")}</p>}
            </div>

            {formError && <p className="text-sm text-red-600">{formError}</p>}

            <button
              type="submit"
              disabled={pending}
              className="w-full rounded-md bg-brand py-2.5 text-sm font-semibold text-white hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-70"
            >
              {pending ? "Submitting…" : "Submit Application"}
            </button>
          </form>
        )}
      </Dialog>
    </>
  );
}

function CheckIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}
