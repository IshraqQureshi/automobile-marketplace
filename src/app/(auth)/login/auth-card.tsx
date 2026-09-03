"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { signInAction, signInWithGoogleAction, signUpAction } from "@/features/auth/actions";
import { initialAuthActionState } from "@/features/auth/schemas";

type Tab = "login" | "signup";

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47a5.54 5.54 0 0 1-2.4 3.63v3.02h3.88c2.27-2.09 3.54-5.17 3.54-8.89z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.07 7.93-2.9l-3.87-3a7.4 7.4 0 0 1-11-3.9H1.1v3.1A12 12 0 0 0 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.06 14.2a7.2 7.2 0 0 1 0-4.6V6.5H1.1a12 12 0 0 0 0 11l3.96-3.3z"
      />
      <path
        fill="#EA4335"
        d="M12 4.77c1.76 0 3.34.6 4.58 1.79l3.44-3.44C17.94 1.19 15.24 0 12 0A12 12 0 0 0 1.1 6.5l3.96 3.1A7.15 7.15 0 0 1 12 4.77z"
      />
    </svg>
  );
}

function GoogleButton() {
  return (
    <form action={signInWithGoogleAction}>
      <Button type="submit" variant="outline">
        <GoogleIcon />
        Continue with Google
      </Button>
    </form>
  );
}

function LoginForm() {
  const [state, formAction, pending] = useActionState(signInAction, initialAuthActionState);

  return (
    <form action={formAction} className="space-y-4">
      {state.status === "error" && state.message && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.message}</p>
      )}
      <div>
        <label htmlFor="login-email" className="mb-1 block text-sm font-medium text-neutral-700">
          Email address
        </label>
        <Input id="login-email" name="email" type="email" placeholder="you@example.com" autoComplete="email" required />
        {state.fieldErrors?.email && <p className="mt-1 text-sm text-red-600">{state.fieldErrors.email}</p>}
      </div>
      <div>
        <div className="mb-1 flex items-center justify-between">
          <label htmlFor="login-password" className="block text-sm font-medium text-neutral-700">
            Password
          </label>
          <span className="text-sm text-neutral-400" title="Password reset isn't available yet">
            Forgot password?
          </span>
        </div>
        <Input id="login-password" name="password" type="password" autoComplete="current-password" required />
        {state.fieldErrors?.password && <p className="mt-1 text-sm text-red-600">{state.fieldErrors.password}</p>}
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Signing in…" : "Sign in to HarakaGari"}
      </Button>
    </form>
  );
}

function SignUpForm() {
  const [state, formAction, pending] = useActionState(signUpAction, initialAuthActionState);

  if (state.status === "confirmation_required") {
    return (
      <p className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">{state.message}</p>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      {state.status === "error" && state.message && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.message}</p>
      )}
      <div>
        <label htmlFor="signup-name" className="mb-1 block text-sm font-medium text-neutral-700">
          Full name
        </label>
        <Input id="signup-name" name="fullName" type="text" placeholder="e.g. John Kamau" autoComplete="name" required />
        {state.fieldErrors?.fullName && <p className="mt-1 text-sm text-red-600">{state.fieldErrors.fullName}</p>}
      </div>
      <div>
        <label htmlFor="signup-email" className="mb-1 block text-sm font-medium text-neutral-700">
          Email address
        </label>
        <Input id="signup-email" name="email" type="email" placeholder="you@example.com" autoComplete="email" required />
        {state.fieldErrors?.email && <p className="mt-1 text-sm text-red-600">{state.fieldErrors.email}</p>}
      </div>
      <div>
        <label htmlFor="signup-password" className="mb-1 block text-sm font-medium text-neutral-700">
          Password
        </label>
        <Input id="signup-password" name="password" type="password" autoComplete="new-password" required />
        {state.fieldErrors?.password && <p className="mt-1 text-sm text-red-600">{state.fieldErrors.password}</p>}
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Creating account…" : "Create your account"}
      </Button>
    </form>
  );
}

export function AuthCard() {
  const [tab, setTab] = useState<Tab>("login");

  return (
    <div className="mx-auto w-full max-w-sm">
      <div role="tablist" aria-label="Log in or sign up" className="mb-6 flex rounded-md bg-neutral-100 p-1">
        <button
          type="button"
          role="tab"
          aria-selected={tab === "login"}
          onClick={() => setTab("login")}
          className={tabClassName(tab === "login")}
        >
          Log in
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "signup"}
          onClick={() => setTab("signup")}
          className={tabClassName(tab === "signup")}
        >
          Sign up
        </button>
      </div>

      {tab === "login" ? (
        <>
          <h1 className="font-display text-2xl font-semibold text-neutral-900">Welcome back</h1>
          <p className="mt-1 text-sm text-neutral-500">Sign in to access your saved cars and watchlist.</p>
        </>
      ) : (
        <>
          <h1 className="font-display text-2xl font-semibold text-neutral-900">Create your account</h1>
          <p className="mt-1 text-sm text-neutral-500">Join HarakaGari to save cars and book viewings.</p>
        </>
      )}

      <div className="mt-6 space-y-4">
        <GoogleButton />
        <div className="flex items-center gap-3 text-xs text-neutral-400">
          <span className="h-px flex-1 bg-neutral-200" />
          or
          <span className="h-px flex-1 bg-neutral-200" />
        </div>

        {tab === "login" ? <LoginForm /> : <SignUpForm />}

        <p className="text-center text-sm text-neutral-500">
          {tab === "login" ? (
            <>
              Don&apos;t have an account?{" "}
              <button type="button" onClick={() => setTab("signup")} className="font-medium text-brand hover:underline">
                Sign up
              </button>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <button type="button" onClick={() => setTab("login")} className="font-medium text-brand hover:underline">
                Log in
              </button>
            </>
          )}
        </p>
      </div>
    </div>
  );
}

function tabClassName(active: boolean) {
  return cn(
    "flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors",
    active ? "bg-white text-neutral-900 shadow-sm" : "text-neutral-500 hover:text-neutral-700",
  );
}
