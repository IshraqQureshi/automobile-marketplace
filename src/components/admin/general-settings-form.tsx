"use client";

import { useState, useTransition } from "react";
import { FieldLabel, SectionHeader } from "@/components/admin/admin-ui";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { useFieldValidation } from "@/features/auth/use-field-validation";
import { updateGeneralSettingsAction } from "@/features/admin/settings-actions";
import { generalSettingsFieldSchemas } from "@/features/admin/settings-schemas";
import { stripKenyaPrefix } from "@/lib/validation/kenya-phone";

interface GeneralSettingsFormProps {
  whatsappContactNumber: string; // full "254712345678" digit string, or "" if unset
}

export function GeneralSettingsForm({ whatsappContactNumber }: GeneralSettingsFormProps) {
  const toast = useToast();
  const { validate, errorFor } = useFieldValidation(generalSettingsFieldSchemas);
  const [value, setValue] = useState(whatsappContactNumber ? stripKenyaPrefix(`+${whatsappContactNumber}`) : "");
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!generalSettingsFieldSchemas.whatsappContactNumber.safeParse(value).success) {
      validate("whatsappContactNumber", value);
      return;
    }

    startTransition(async () => {
      const formData = new FormData();
      formData.set("whatsappContactNumber", value);
      const result = await updateGeneralSettingsAction(formData);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Settings updated.");
      }
    });
  }

  return (
    <div>
      <SectionHeader icon={<GeneralIcon />} title="General" description="Site-wide settings, shared across every showroom." />

      <form onSubmit={handleSubmit} className="max-w-md rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
        <FieldLabel htmlFor="whatsapp-contact-number">WhatsApp contact number</FieldLabel>
        <div className="flex items-center gap-2">
          <span className="flex items-center rounded-md border border-neutral-300 bg-neutral-50 px-3 py-2.5 text-sm text-neutral-500">+254</span>
          <Input
            id="whatsapp-contact-number"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onBlur={(e) => validate("whatsappContactNumber", e.target.value)}
            placeholder="712345678"
            error={!!errorFor("whatsappContactNumber")}
          />
        </div>
        {errorFor("whatsappContactNumber") && <p className="mt-1 text-sm text-red-600">{errorFor("whatsappContactNumber")}</p>}
        <p className="mt-1.5 text-xs text-neutral-400">
          The &quot;Message&quot; button on every showroom&apos;s public page opens a WhatsApp chat to this number — not each showroom&apos;s own number.
        </p>

        <div className="mt-4 flex justify-end">
          <button
            type="submit"
            disabled={pending}
            className="rounded-md bg-brand px-3.5 py-2 text-sm font-medium text-white hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending ? "Saving…" : "Save changes"}
          </button>
        </div>
      </form>
    </div>
  );
}

function GeneralIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4.5 w-4.5" aria-hidden="true">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
    </svg>
  );
}
