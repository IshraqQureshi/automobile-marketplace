"use client";

import { useState, useTransition } from "react";
import { FieldLabel } from "@/components/admin/admin-ui";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { submitVehicleInquiryAction } from "@/features/inquiry/actions";
import { inquiryFieldSchemas } from "@/features/inquiry/schemas";
import { useFieldValidation } from "@/features/auth/use-field-validation";
import { stripKenyaPrefix } from "@/lib/validation/kenya-phone";

export interface InquiryInitialValues {
  fullName: string;
  email: string;
  phone: string;
}

interface VehicleInquiryButtonProps {
  vehicleId: string;
  vehicleTitle: string;
  initialValues: InquiryInitialValues | null;
}

const FORM_FIELD_SCHEMAS = { name: inquiryFieldSchemas.name, email: inquiryFieldSchemas.email, phone: inquiryFieldSchemas.phone, message: inquiryFieldSchemas.message };

/**
 * Real "Send Message" flow (previously a disabled placeholder) — works for
 * both a signed-in customer (name/email/phone pre-filled from their
 * account, still editable) and an anonymous visitor (blank, all three
 * required). Submission, emailing, and the admin/showroom inbox entries are
 * all handled by submitVehicleInquiryAction — this component is purely the
 * form/dialog UI.
 */
export function VehicleInquiryButton({ vehicleId, vehicleTitle, initialValues }: VehicleInquiryButtonProps) {
  const [open, setOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [name, setName] = useState(initialValues?.fullName ?? "");
  const [email, setEmail] = useState(initialValues?.email ?? "");
  const [phone, setPhone] = useState(initialValues ? stripKenyaPrefix(initialValues.phone) : "");
  const [message, setMessage] = useState("");
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
      ["message", message],
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
    formData.set("message", message);

    startTransition(async () => {
      const result = await submitVehicleInquiryAction(formData);
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
      setMessage("");
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={openDialog}
        className="flex w-full items-center justify-center gap-2 rounded-[7px] bg-brand py-3 text-sm font-semibold text-white hover:bg-brand-dark"
      >
        <MessageIcon />
        Send Message
      </button>

      <Dialog open={open} onClose={() => setOpen(false)} title="Send Message" description={vehicleTitle}>
        {submitted ? (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#f0fdf9] text-brand">
              <CheckIcon />
            </div>
            <p className="text-sm font-semibold text-neutral-900">Message sent!</p>
            <p className="text-sm text-neutral-500">
              The showroom has been notified and will contact you directly. We&apos;ve also sent a confirmation to your email.
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
            <div>
              <FieldLabel htmlFor="inquiry-name">Full Name</FieldLabel>
              <Input
                id="inquiry-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onBlur={(e) => validate("name", e.target.value)}
                placeholder="Jane Wanjiru"
                error={!!errorFor("name")}
              />
              {errorFor("name") && <p className="mt-1 text-sm text-red-600">{errorFor("name")}</p>}
            </div>

            <div>
              <FieldLabel htmlFor="inquiry-email">Email</FieldLabel>
              <Input
                id="inquiry-email"
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
              <FieldLabel htmlFor="inquiry-phone">Phone</FieldLabel>
              <div className="flex items-center gap-2">
                <span className="flex items-center rounded-md border border-neutral-300 bg-neutral-50 px-3 py-2.5 text-sm text-neutral-500">+254</span>
                <Input
                  id="inquiry-phone"
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
              <FieldLabel htmlFor="inquiry-message">Message</FieldLabel>
              <textarea
                id="inquiry-message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onBlur={(e) => validate("message", e.target.value)}
                rows={4}
                placeholder="I'm interested in this vehicle — is it still available?"
                className={`w-full rounded-md border px-3 py-2.5 text-sm outline-none placeholder:text-neutral-400 focus:border-brand focus:ring-1 focus:ring-brand ${errorFor("message") ? "border-red-400" : "border-neutral-300"}`}
              />
              {errorFor("message") && <p className="mt-1 text-sm text-red-600">{errorFor("message")}</p>}
            </div>

            {formError && <p className="text-sm text-red-600">{formError}</p>}

            <button
              type="submit"
              disabled={pending}
              className="w-full rounded-md bg-brand py-2.5 text-sm font-semibold text-white hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-70"
            >
              {pending ? "Sending…" : "Send Message"}
            </button>
          </form>
        )}
      </Dialog>
    </>
  );
}

function MessageIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}
