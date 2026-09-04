"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { registerShowroomAction } from "@/features/showroom/actions";
import { useFieldValidation } from "@/features/auth/use-field-validation";
import { initialRegisterShowroomState, registerShowroomFieldSchemas } from "@/features/showroom/schemas";

interface RegisterShowroomFormProps {
  defaultEmail: string;
  defaultPhone: string;
}

// The account's own phone is stored with a "+254" prefix already (see
// signUpAction) — strip it back off for this form's local-number input,
// which supplies the same fixed "+254" prefix chip as the signup form.
function stripKenyaPrefix(phone: string) {
  return phone.startsWith("+254") ? phone.slice(4) : phone;
}

export function RegisterShowroomForm({ defaultEmail, defaultPhone }: RegisterShowroomFormProps) {
  const [state, formAction, pending] = useActionState(registerShowroomAction, initialRegisterShowroomState);
  const { validate, errorFor } = useFieldValidation(registerShowroomFieldSchemas);

  const [businessName, setBusinessName] = useState("");
  const [location, setLocation] = useState("");
  const [businessPhone, setBusinessPhone] = useState(stripKenyaPrefix(defaultPhone));
  const [businessEmail, setBusinessEmail] = useState(defaultEmail);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [fileInputKey, setFileInputKey] = useState(0);

  const businessNameError = errorFor("businessName", state.fieldErrors?.businessName);
  const locationError = errorFor("location", state.fieldErrors?.location);
  const businessPhoneError = errorFor("businessPhone", state.fieldErrors?.businessPhone);
  const businessEmailError = errorFor("businessEmail", state.fieldErrors?.businessEmail);
  const documentsError = state.fieldErrors?.documents;

  if (state.status === "success") {
    return (
      <div className="rounded-xl border border-neutral-200 bg-white p-8 shadow-sm">
        <h2 className="font-display text-lg font-semibold text-neutral-900">Application submitted</h2>
        <p className="mt-2 text-sm text-neutral-500">{state.message}</p>
      </div>
    );
  }

  return (
    <form action={formAction} className="rounded-xl border border-neutral-200 bg-white p-6 text-left shadow-sm">
      {state.status === "error" && state.message && (
        <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.message}</p>
      )}

      <div className="mb-4">
        <label htmlFor="businessName" className="mb-1 block text-xs font-semibold tracking-wide text-neutral-500 uppercase">
          Business name
        </label>
        <Input
          id="businessName"
          name="businessName"
          placeholder="e.g. AutoElite Motors"
          required
          error={!!businessNameError}
          value={businessName}
          onChange={(e) => setBusinessName(e.target.value)}
          onBlur={(e) => validate("businessName", e.target.value)}
        />
        {businessNameError && <p className="mt-1 text-sm text-red-600">{businessNameError}</p>}
      </div>

      <div className="mb-4">
        <label htmlFor="documents" className="mb-1 block text-xs font-semibold tracking-wide text-neutral-500 uppercase">
          License / Registration documents
        </label>
        <label
          htmlFor="documents"
          className="flex cursor-pointer flex-col items-center justify-center rounded-md border border-dashed border-neutral-300 px-4 py-6 text-center hover:border-brand"
        >
          <UploadIcon />
          <span className="mt-2 text-sm text-neutral-500">Upload PDF, JPG or PNG</span>
        </label>
        <input
          key={fileInputKey}
          id="documents"
          name="documents"
          type="file"
          multiple
          accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
          className="sr-only"
          onChange={(e) => setSelectedFiles(Array.from(e.target.files ?? []))}
        />
        {selectedFiles.length > 0 && (
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <ul className="flex flex-1 flex-wrap gap-2 text-xs text-neutral-600">
              {selectedFiles.map((file) => (
                <li key={file.name} className="rounded-md bg-neutral-100 px-2 py-1">
                  {file.name}
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={() => {
                setSelectedFiles([]);
                setFileInputKey((k) => k + 1);
              }}
              className="text-xs font-medium text-neutral-500 hover:underline"
            >
              Clear
            </button>
          </div>
        )}
        {documentsError && <p className="mt-1 text-sm text-red-600">{documentsError}</p>}
      </div>

      <div className="mb-4">
        <label htmlFor="location" className="mb-1 block text-xs font-semibold tracking-wide text-neutral-500 uppercase">
          Location
        </label>
        <Input
          id="location"
          name="location"
          placeholder="e.g. Westlands, Nairobi"
          required
          error={!!locationError}
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          onBlur={(e) => validate("location", e.target.value)}
        />
        {locationError && <p className="mt-1 text-sm text-red-600">{locationError}</p>}
      </div>

      <div className="mb-4">
        <label htmlFor="businessPhone" className="mb-1 block text-xs font-semibold tracking-wide text-neutral-500 uppercase">
          Business phone
        </label>
        <div className="flex gap-2">
          <span className="flex items-center rounded-md border border-neutral-300 bg-neutral-50 px-3 text-sm text-neutral-500">+254</span>
          <Input
            id="businessPhone"
            name="businessPhone"
            type="tel"
            inputMode="numeric"
            placeholder="7xx xxx xxx"
            autoComplete="tel-national"
            required
            error={!!businessPhoneError}
            value={businessPhone}
            onChange={(e) => setBusinessPhone(e.target.value)}
            onBlur={(e) => validate("businessPhone", e.target.value)}
            className="flex-1"
          />
        </div>
        {businessPhoneError && <p className="mt-1 text-sm text-red-600">{businessPhoneError}</p>}
      </div>

      <div className="mb-6">
        <label htmlFor="businessEmail" className="mb-1 block text-xs font-semibold tracking-wide text-neutral-500 uppercase">
          Business email
        </label>
        <Input
          id="businessEmail"
          name="businessEmail"
          type="email"
          autoComplete="email"
          required
          error={!!businessEmailError}
          value={businessEmail}
          onChange={(e) => setBusinessEmail(e.target.value)}
          onBlur={(e) => validate("businessEmail", e.target.value)}
        />
        {businessEmailError && <p className="mt-1 text-sm text-red-600">{businessEmailError}</p>}
      </div>

      <Button type="submit" disabled={pending} className="bg-brand hover:bg-brand-dark">
        {pending ? "Submitting…" : "Submit Application"}
      </Button>
    </form>
  );
}

function UploadIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true" className="text-neutral-400">
      <path d="M12 16V4M12 4 7 9M12 4l5 5" />
      <path d="M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" />
    </svg>
  );
}
