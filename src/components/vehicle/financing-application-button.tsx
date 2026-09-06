"use client";

import { useState, useTransition } from "react";
import { FieldLabel } from "@/components/admin/admin-ui";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useFieldValidation } from "@/features/auth/use-field-validation";
import { submitFinancingApplicationAction } from "@/features/financing/actions";
import { EMPLOYMENT_STATUS_OPTIONS, financingApplicationFieldSchemas } from "@/features/financing/schemas";
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
  defaultDesiredDownPayment: number;
  tenureOptionsMonths: number[];
}

const FORM_FIELD_SCHEMAS = financingApplicationFieldSchemas;

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
  defaultDesiredDownPayment,
  tenureOptionsMonths,
}: FinancingApplicationButtonProps) {
  const [open, setOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [name, setName] = useState(initialValues?.fullName ?? "");
  const [email, setEmail] = useState(initialValues?.email ?? "");
  const [phone, setPhone] = useState(initialValues ? stripKenyaPrefix(initialValues.phone) : "");
  const [employmentStatus, setEmploymentStatus] = useState("");
  const [monthlyIncome, setMonthlyIncome] = useState("");
  const [nationalId, setNationalId] = useState("");
  const [desiredDownPayment, setDesiredDownPayment] = useState(String(Math.round(defaultDesiredDownPayment)));
  const [desiredTenureMonths, setDesiredTenureMonths] = useState(String(tenureOptionsMonths[0] ?? ""));
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
      ["desiredDownPayment", desiredDownPayment],
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
    formData.set("desiredDownPayment", desiredDownPayment);
    formData.set("desiredTenureMonths", desiredTenureMonths);
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
              The showroom has been notified and will contact you within 24 hours. We&apos;ve also sent a confirmation to your email.
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
                <FieldLabel htmlFor="financing-down-payment">Desired Down Payment (KES)</FieldLabel>
                <Input
                  id="financing-down-payment"
                  inputMode="numeric"
                  value={desiredDownPayment}
                  onChange={(e) => setDesiredDownPayment(e.target.value)}
                  onBlur={(e) => validate("desiredDownPayment", e.target.value)}
                  error={!!errorFor("desiredDownPayment")}
                />
                {errorFor("desiredDownPayment") && <p className="mt-1 text-sm text-red-600">{errorFor("desiredDownPayment")}</p>}
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
