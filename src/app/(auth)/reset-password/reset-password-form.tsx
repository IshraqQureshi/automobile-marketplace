"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/ui/password-input";
import { resetPasswordAction } from "@/features/auth/actions";
import { PASSWORD_MIN_LENGTH, initialAuthActionState } from "@/features/auth/schemas";

export function ResetPasswordForm() {
  const [state, formAction, pending] = useActionState(resetPasswordAction, initialAuthActionState);

  return (
    <form action={formAction} className="space-y-4" noValidate>
      {state.status === "error" && state.message && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.message}</p>
      )}
      <div>
        <label htmlFor="reset-password" className="mb-1 block text-sm font-medium text-neutral-700">
          New password
        </label>
        <PasswordInput
          id="reset-password"
          name="password"
          autoComplete="new-password"
          required
          error={!!state.fieldErrors?.password}
        />
        <p className="mt-1 text-xs text-neutral-400">At least {PASSWORD_MIN_LENGTH} characters.</p>
        {state.fieldErrors?.password && <p className="mt-1 text-sm text-red-600">{state.fieldErrors.password}</p>}
      </div>
      <div>
        <label htmlFor="reset-confirm-password" className="mb-1 block text-sm font-medium text-neutral-700">
          Confirm new password
        </label>
        <PasswordInput
          id="reset-confirm-password"
          name="confirmPassword"
          autoComplete="new-password"
          required
          error={!!state.fieldErrors?.confirmPassword}
        />
        {state.fieldErrors?.confirmPassword && (
          <p className="mt-1 text-sm text-red-600">{state.fieldErrors.confirmPassword}</p>
        )}
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Updating…" : "Update password"}
      </Button>
    </form>
  );
}
