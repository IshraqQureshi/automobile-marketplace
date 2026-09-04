"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { adminSignInAction } from "@/features/admin/actions";
import { initialAuthActionState, signInFieldSchemas } from "@/features/auth/schemas";
import { useFieldValidation } from "@/features/auth/use-field-validation";

export function AdminLoginForm() {
  const [state, formAction, pending] = useActionState(adminSignInAction, initialAuthActionState);
  const { validate, errorFor } = useFieldValidation(signInFieldSchemas);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Same field-value-preservation pattern as the customer/showroom login —
  // React resets uncontrolled fields after every action dispatch, so these
  // are controlled and only the password is cleared on a failed attempt.
  const [prevState, setPrevState] = useState(state);
  if (state !== prevState) {
    setPrevState(state);
    if (state.status === "error") setPassword("");
  }

  const emailError = errorFor("email", state.fieldErrors?.email);
  const passwordError = errorFor("password", state.fieldErrors?.password);

  return (
    <form action={formAction} className="space-y-4" noValidate>
      {state.status === "error" && state.message && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.message}</p>
      )}
      <div>
        <label htmlFor="admin-email" className="mb-1 block text-sm font-medium text-neutral-700">
          Email address
        </label>
        <Input
          id="admin-email"
          name="email"
          type="email"
          placeholder="admin@harakagari.local"
          autoComplete="email"
          required
          error={!!emailError}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onBlur={(e) => validate("email", e.target.value)}
        />
        {emailError && <p className="mt-1 text-sm text-red-600">{emailError}</p>}
      </div>
      <div>
        <label htmlFor="admin-password" className="mb-1 block text-sm font-medium text-neutral-700">
          Password
        </label>
        <PasswordInput
          id="admin-password"
          name="password"
          autoComplete="current-password"
          required
          error={!!passwordError}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onBlur={(e) => validate("password", e.target.value)}
        />
        {passwordError && <p className="mt-1 text-sm text-red-600">{passwordError}</p>}
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Signing in…" : "Sign in to admin"}
      </Button>
    </form>
  );
}
