"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { requestPasswordResetAction } from "@/features/auth/actions";
import { initialAuthActionState } from "@/features/auth/schemas";

export function ForgotPasswordForm() {
  const [state, formAction, pending] = useActionState(requestPasswordResetAction, initialAuthActionState);

  if (state.status === "confirmation_required") {
    return (
      <div className="space-y-4">
        <p className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">{state.message}</p>
        <Link href="/login" className="text-sm font-medium text-brand hover:underline">
          Back to log in
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4" noValidate>
      {state.status === "error" && state.message && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.message}</p>
      )}
      <div>
        <label htmlFor="forgot-email" className="mb-1 block text-sm font-medium text-neutral-700">
          Email address
        </label>
        <Input
          id="forgot-email"
          name="email"
          type="email"
          placeholder="you@example.com"
          autoComplete="email"
          required
          error={!!state.fieldErrors?.email}
        />
        {state.fieldErrors?.email && <p className="mt-1 text-sm text-red-600">{state.fieldErrors.email}</p>}
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Sending…" : "Send reset link"}
      </Button>
      <p className="text-center text-sm text-neutral-500">
        <Link href="/login" className="font-medium text-brand hover:underline">
          Back to log in
        </Link>
      </p>
    </form>
  );
}
