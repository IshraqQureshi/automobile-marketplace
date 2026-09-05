"use client";

import { useState, useTransition } from "react";
import { FieldLabel } from "@/components/admin/admin-ui";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { useFieldValidation } from "@/features/auth/use-field-validation";
import { updateMyEmailAction, updateMyPasswordAction, updateMyProfileAction } from "@/features/account/actions";
import { emailFieldSchemas, passwordFieldSchemas, profileFieldSchemas } from "@/features/account/schemas";
import { stripKenyaPrefix } from "@/lib/validation/kenya-phone";

export interface AccountProfileInitialValues {
  fullName: string;
  phone: string;
  email: string;
}

interface AccountProfileFormProps {
  initialValues: AccountProfileInitialValues;
}

/**
 * Personal-account self-service form — full name/phone, email, and
 * password, each its own independent save action/pending state, since
 * they're three unrelated operations (a profile-table update vs. two
 * separate Supabase Auth calls) rather than one combined submit. Shared by
 * the admin's own "My Profile" page and the showroom owner's "My Account"
 * page — this edits the signed-in user's own identity, never a showroom's
 * business profile (see ShowroomProfileForm for that).
 */
export function AccountProfileForm({ initialValues }: AccountProfileFormProps) {
  return (
    <div className="flex flex-col gap-6">
      <ProfileSection initialValues={initialValues} />
      <EmailSection initialEmail={initialValues.email} />
      <PasswordSection />
    </div>
  );
}

function ProfileSection({ initialValues }: { initialValues: AccountProfileInitialValues }) {
  const toast = useToast();
  const { validate, errorFor } = useFieldValidation(profileFieldSchemas);
  const [fullName, setFullName] = useState(initialValues.fullName);
  const [phone, setPhone] = useState(stripKenyaPrefix(initialValues.phone));
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    let hasError = false;
    for (const [field, value] of [
      ["fullName", fullName],
      ["phone", phone],
    ] as const) {
      if (!profileFieldSchemas[field].safeParse(value).success) {
        validate(field, value);
        hasError = true;
      }
    }
    if (hasError) return;

    const formData = new FormData();
    formData.set("fullName", fullName);
    formData.set("phone", phone);

    startTransition(async () => {
      const result = await updateMyProfileAction(formData);
      // Client-side validation above already mirrors the server's exact
      // schema, so fieldErrors shouldn't be reachable in practice — but
      // treat it as a failure too (not just result.error), so a future
      // server-only rule doesn't silently show a success toast on a
      // rejected write.
      if (result.error || result.fieldErrors) {
        setFormError(result.error ?? "Please fix the highlighted fields and try again.");
        return;
      }
      toast.success("Profile updated.");
    });
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
      <h2 className="font-display text-lg font-semibold text-neutral-900">Personal details</h2>
      <p className="mt-0.5 text-sm text-neutral-500">Your name and phone number, used to identify you internally.</p>

      {formError && <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{formError}</p>}

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <FieldLabel htmlFor="account-full-name">Full name</FieldLabel>
          <Input
            id="account-full-name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            onBlur={(e) => validate("fullName", e.target.value)}
            required
            error={!!errorFor("fullName")}
          />
          {errorFor("fullName") && <p className="mt-1 text-sm text-red-600">{errorFor("fullName")}</p>}
        </div>

        <div>
          <FieldLabel htmlFor="account-phone">Phone</FieldLabel>
          <div className="flex items-center gap-2">
            <span className="flex items-center rounded-md border border-neutral-300 bg-neutral-50 px-3 py-2.5 text-sm text-neutral-500">+254</span>
            <Input
              id="account-phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              onBlur={(e) => validate("phone", e.target.value)}
              placeholder="712345678"
              required
              error={!!errorFor("phone")}
            />
          </div>
          {errorFor("phone") && <p className="mt-1 text-sm text-red-600">{errorFor("phone")}</p>}
        </div>
      </div>

      <button
        type="submit"
        disabled={pending}
        className="mt-4 rounded-md bg-brand px-3.5 py-2 text-sm font-medium text-white hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "Saving…" : "Save changes"}
      </button>
    </form>
  );
}

function EmailSection({ initialEmail }: { initialEmail: string }) {
  const toast = useToast();
  const { validate, errorFor } = useFieldValidation(emailFieldSchemas);
  const [email, setEmail] = useState(initialEmail);
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmationSent, setConfirmationSent] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setConfirmationSent(false);

    if (!emailFieldSchemas.email.safeParse(email).success) {
      validate("email", email);
      return;
    }

    const formData = new FormData();
    formData.set("email", email);

    startTransition(async () => {
      const result = await updateMyEmailAction(formData);
      if (result.error || result.fieldErrors) {
        setFormError(result.error ?? "Please fix the highlighted fields and try again.");
        return;
      }
      setConfirmationSent(true);
      toast.success("Confirmation email sent.");
    });
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
      <h2 className="font-display text-lg font-semibold text-neutral-900">Email address</h2>
      <p className="mt-0.5 text-sm text-neutral-500">
        Changing this sends a confirmation link to both your current and new address — the change only takes effect once you click both.
      </p>

      {formError && <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{formError}</p>}
      {confirmationSent && (
        <p className="mt-4 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Check both {initialEmail} and {email} for a confirmation link — this email won&rsquo;t become active until you click both.
        </p>
      )}

      <div className="mt-4 max-w-sm">
        <FieldLabel htmlFor="account-email">Email</FieldLabel>
        <Input
          id="account-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onBlur={(e) => validate("email", e.target.value)}
          required
          error={!!errorFor("email")}
        />
        {errorFor("email") && <p className="mt-1 text-sm text-red-600">{errorFor("email")}</p>}
      </div>

      <button
        type="submit"
        disabled={pending || email === initialEmail}
        className="mt-4 rounded-md bg-brand px-3.5 py-2 text-sm font-medium text-white hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "Sending…" : "Change email"}
      </button>
    </form>
  );
}

function PasswordSection() {
  const toast = useToast();
  const { validate, errorFor, reset } = useFieldValidation(passwordFieldSchemas);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    let hasError = false;
    if (!passwordFieldSchemas.password.safeParse(password).success) {
      validate("password", password);
      hasError = true;
    }
    if (password !== confirmPassword) {
      setFormError("Passwords do not match.");
      hasError = true;
    }
    if (hasError) return;

    const formData = new FormData();
    formData.set("password", password);
    formData.set("confirmPassword", confirmPassword);

    startTransition(async () => {
      const result = await updateMyPasswordAction(formData);
      if (result.error || result.fieldErrors) {
        setFormError(result.error ?? "Please fix the highlighted fields and try again.");
        return;
      }
      setPassword("");
      setConfirmPassword("");
      reset();
      toast.success("Password updated.");
    });
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
      <h2 className="font-display text-lg font-semibold text-neutral-900">Password</h2>
      <p className="mt-0.5 text-sm text-neutral-500">Choose a new password for signing in.</p>

      {formError && <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{formError}</p>}

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <FieldLabel htmlFor="account-new-password">New password</FieldLabel>
          <Input
            id="account-new-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onBlur={(e) => validate("password", e.target.value)}
            required
            error={!!errorFor("password")}
          />
          {errorFor("password") && <p className="mt-1 text-sm text-red-600">{errorFor("password")}</p>}
        </div>
        <div>
          <FieldLabel htmlFor="account-confirm-password">Confirm new password</FieldLabel>
          <Input
            id="account-confirm-password"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={pending}
        className="mt-4 rounded-md bg-brand px-3.5 py-2 text-sm font-medium text-white hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "Saving…" : "Update password"}
      </button>
    </form>
  );
}
