"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { DialogFormActions, FieldLabel, InitialAvatar, UploadIcon } from "@/components/admin/admin-ui";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { useFieldValidation } from "@/features/auth/use-field-validation";
import { showroomFieldSchemas } from "@/features/admin/showroom-schemas";
import { updateMyShowroomProfileAction } from "@/features/showroom/profile-actions";

const LOGO_ACCEPT = "image/jpeg,image/png,image/webp,image/svg+xml";

export interface ShowroomProfileInitialValues {
  businessName: string;
  location: string;
  businessPhone: string;
  businessEmail: string;
  address: string;
  description: string;
  logoUrl: string | null;
}

interface ShowroomProfileFormProps {
  initialValues: ShowroomProfileInitialValues;
}

export function ShowroomProfileForm({ initialValues }: ShowroomProfileFormProps) {
  const router = useRouter();
  const toast = useToast();
  const { validate, errorFor } = useFieldValidation(showroomFieldSchemas);
  const [form, setForm] = useState({
    businessName: initialValues.businessName,
    location: initialValues.location,
    businessPhone: initialValues.businessPhone,
    businessEmail: initialValues.businessEmail,
    address: initialValues.address,
    description: initialValues.description,
  });
  const [logo, setLogo] = useState<File | null>(null);
  const [logoInputKey, setLogoInputKey] = useState(0);
  const [removeLogo, setRemoveLogo] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function setField<K extends keyof typeof form>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    let hasError = false;
    for (const field of ["businessName", "location", "businessPhone", "businessEmail", "address", "description"] as const) {
      if (!showroomFieldSchemas[field].safeParse(form[field]).success) {
        validate(field, form[field]);
        hasError = true;
      }
    }
    if (hasError) return;

    const formData = new FormData();
    formData.set("businessName", form.businessName);
    formData.set("location", form.location);
    formData.set("businessPhone", form.businessPhone);
    formData.set("businessEmail", form.businessEmail);
    formData.set("address", form.address);
    formData.set("description", form.description);
    if (logo) formData.set("logo", logo);
    if (removeLogo) formData.set("removeLogo", "true");

    startTransition(async () => {
      const result = await updateMyShowroomProfileAction(formData);
      if (result.error) {
        setFormError(result.error);
        return;
      }
      if (result.warning) {
        toast.error(result.warning);
      } else {
        toast.success("Showroom profile updated.");
      }
      setLogo(null);
      setLogoInputKey((k) => k + 1);
      setRemoveLogo(false);
      // Re-fetch fresh server data (in particular the logo's public URL,
      // which this component reads straight from the initialValues prop
      // rather than local state) — without this, a just-uploaded logo
      // wouldn't show up here until a manual reload or navigation.
      router.refresh();
    });
  }

  const currentLogoUrl = logo ? null : initialValues.logoUrl;

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">
      {formError && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{formError}</p>}

      <section className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
        <h2 className="font-display text-lg font-semibold text-neutral-900">Showroom profile</h2>
        <p className="mt-0.5 text-sm text-neutral-500">
          This is what customers and admins see for your business. Approval status can only be changed by an admin.
        </p>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <FieldLabel htmlFor="showroom-business-name">Business name</FieldLabel>
            <Input
              id="showroom-business-name"
              value={form.businessName}
              onChange={(e) => setField("businessName", e.target.value)}
              onBlur={(e) => validate("businessName", e.target.value)}
              autoFocus
              required
              error={!!errorFor("businessName")}
            />
            {errorFor("businessName") && <p className="mt-1 text-sm text-red-600">{errorFor("businessName")}</p>}
          </div>

          <div className="sm:col-span-2">
            <FieldLabel htmlFor="showroom-logo">Logo (optional)</FieldLabel>
            <div className="flex items-center gap-3">
              {currentLogoUrl ? (
                <Image
                  src={currentLogoUrl}
                  alt="Current logo"
                  width={40}
                  height={40}
                  unoptimized
                  className="shrink-0 rounded-lg border border-neutral-200 object-contain p-0.5"
                />
              ) : (
                <InitialAvatar name={form.businessName || "?"} />
              )}
              <label
                htmlFor="showroom-logo"
                className="inline-flex max-w-full cursor-pointer items-center gap-1.5 rounded-md border border-dashed border-neutral-300 px-2.5 py-1.5 text-xs font-medium text-neutral-500 hover:border-brand hover:text-brand"
              >
                <UploadIcon />
                <span className="truncate">{logo ? logo.name : "Upload logo"}</span>
              </label>
              <input
                key={logoInputKey}
                id="showroom-logo"
                type="file"
                accept={LOGO_ACCEPT}
                onChange={(e) => {
                  setLogo(e.target.files?.[0] ?? null);
                  setRemoveLogo(false);
                }}
                className="sr-only"
              />
            </div>
            {initialValues.logoUrl && !logo && (
              <label className="mt-2 flex items-center gap-1.5 text-xs text-neutral-500">
                <input type="checkbox" checked={removeLogo} onChange={(e) => setRemoveLogo(e.target.checked)} />
                Remove current logo
              </label>
            )}
          </div>

          <div>
            <FieldLabel htmlFor="showroom-location">Location</FieldLabel>
            <Input
              id="showroom-location"
              value={form.location}
              onChange={(e) => setField("location", e.target.value)}
              onBlur={(e) => validate("location", e.target.value)}
              placeholder="e.g. Westlands, Nairobi"
              required
              error={!!errorFor("location")}
            />
            {errorFor("location") && <p className="mt-1 text-sm text-red-600">{errorFor("location")}</p>}
          </div>

          <div>
            <FieldLabel htmlFor="showroom-phone">Business phone</FieldLabel>
            <div className="flex items-center gap-2">
              <span className="flex items-center rounded-md border border-neutral-300 bg-neutral-50 px-3 py-2.5 text-sm text-neutral-500">+254</span>
              <Input
                id="showroom-phone"
                value={form.businessPhone}
                onChange={(e) => setField("businessPhone", e.target.value)}
                onBlur={(e) => validate("businessPhone", e.target.value)}
                placeholder="712345678"
                required
                error={!!errorFor("businessPhone")}
              />
            </div>
            {errorFor("businessPhone") && <p className="mt-1 text-sm text-red-600">{errorFor("businessPhone")}</p>}
          </div>

          <div>
            <FieldLabel htmlFor="showroom-email">Business email</FieldLabel>
            <Input
              id="showroom-email"
              type="email"
              value={form.businessEmail}
              onChange={(e) => setField("businessEmail", e.target.value)}
              onBlur={(e) => validate("businessEmail", e.target.value)}
              required
              error={!!errorFor("businessEmail")}
            />
            {errorFor("businessEmail") && <p className="mt-1 text-sm text-red-600">{errorFor("businessEmail")}</p>}
          </div>

          <div>
            <FieldLabel htmlFor="showroom-address">Address (optional)</FieldLabel>
            <Input
              id="showroom-address"
              value={form.address}
              onChange={(e) => setField("address", e.target.value)}
              onBlur={(e) => validate("address", e.target.value)}
              error={!!errorFor("address")}
            />
            {errorFor("address") && <p className="mt-1 text-sm text-red-600">{errorFor("address")}</p>}
          </div>

          <div className="sm:col-span-2">
            <FieldLabel htmlFor="showroom-description">Description (optional)</FieldLabel>
            <textarea
              id="showroom-description"
              value={form.description}
              onChange={(e) => setField("description", e.target.value)}
              onBlur={(e) => validate("description", e.target.value)}
              rows={4}
              placeholder="Tell customers what makes your showroom worth visiting…"
              className={`w-full rounded-md border px-3 py-2.5 text-sm outline-none placeholder:text-neutral-400 focus:border-brand focus:ring-1 focus:ring-brand ${errorFor("description") ? "border-red-400" : "border-neutral-300"}`}
            />
            {errorFor("description") && <p className="mt-1 text-sm text-red-600">{errorFor("description")}</p>}
          </div>
        </div>
      </section>

      <div className="border-t border-neutral-200 pt-4">
        <DialogFormActions pending={pending} submitLabel="Save changes" onCancel={() => router.push("/dashboard")} />
      </div>
    </form>
  );
}
