"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { cn } from "@/lib/utils";
import { signInAction, signInWithGoogleAction, signUpAction } from "@/features/auth/actions";
import {
  PASSWORD_MIN_LENGTH,
  initialAuthActionState,
  signInFieldSchemas,
  signUpFieldSchemas,
} from "@/features/auth/schemas";
import { useFieldValidation } from "@/features/auth/use-field-validation";

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
  const { validate, errorFor } = useFieldValidation(signInFieldSchemas);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // React resets uncontrolled form fields after every action dispatch —
  // success or failure. These fields are controlled specifically so a
  // failed login doesn't silently wipe what the user typed; only the
  // password is deliberately cleared on failure (common security-conscious
  // convention), the email address is preserved. Reacting to the new
  // `state` during render (not in an effect) avoids an extra
  // render-then-effect cascade for what's really "derived from a prop".
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
        <label htmlFor="login-email" className="mb-1 block text-sm font-medium text-neutral-700">
          Email address
        </label>
        <Input
          id="login-email"
          name="email"
          type="email"
          placeholder="you@example.com"
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
        <div className="mb-1 flex items-center justify-between">
          <label htmlFor="login-password" className="block text-sm font-medium text-neutral-700">
            Password
          </label>
          <Link href="/forgot-password" className="text-sm text-brand hover:underline">
            Forgot password?
          </Link>
        </div>
        <PasswordInput
          id="login-password"
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
        {pending ? "Signing in…" : "Sign in to HarakaGari"}
      </Button>
    </form>
  );
}

function SignUpForm() {
  const [state, formAction, pending] = useActionState(signUpAction, initialAuthActionState);
  const { validate, errorFor } = useFieldValidation(signUpFieldSchemas);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [confirmTouched, setConfirmTouched] = useState(false);

  // React resets uncontrolled form fields after every action dispatch —
  // success or failure. All fields are controlled specifically so a failed
  // submission (e.g. re-checking the terms box after a validation error)
  // doesn't silently wipe the rest of what the user typed. On genuine
  // success, clear everything back to empty and keep the form visible
  // (rather than replacing it) so the success message reads as a status,
  // not a full-page takeover. Reacting to the new `state` during render
  // (not in an effect) avoids an extra render-then-effect cascade for
  // what's really "derived from a prop".
  const [prevState, setPrevState] = useState(state);
  const [dispatchCount, setDispatchCount] = useState(0);
  if (state !== prevState) {
    setPrevState(state);
    setDispatchCount((c) => c + 1);
    if (state.status === "confirmation_required") {
      setFullName("");
      setEmail("");
      setPhone("");
      setPassword("");
      setConfirmPassword("");
      setTermsAccepted(false);
      setConfirmTouched(false);
    }
  }

  const fullNameError = errorFor("fullName", state.fieldErrors?.fullName);
  const emailError = errorFor("email", state.fieldErrors?.email);
  const phoneError = errorFor("phone", state.fieldErrors?.phone);
  const passwordError = errorFor("password", state.fieldErrors?.password);
  const confirmPasswordError = confirmTouched
    ? password !== confirmPassword
      ? "Passwords do not match"
      : undefined
    : state.fieldErrors?.confirmPassword;

  return (
    <form action={formAction} className="space-y-4" noValidate>
      {state.status === "error" && state.message && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.message}</p>
      )}
      {state.status === "confirmation_required" && (
        <p className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">{state.message}</p>
      )}
      <div>
        <label htmlFor="signup-name" className="mb-1 block text-sm font-medium text-neutral-700">
          Full name
        </label>
        <Input
          id="signup-name"
          name="fullName"
          type="text"
          placeholder="e.g. John Kamau"
          autoComplete="name"
          required
          error={!!fullNameError}
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          onBlur={(e) => validate("fullName", e.target.value)}
        />
        {fullNameError && <p className="mt-1 text-sm text-red-600">{fullNameError}</p>}
      </div>
      <div>
        <label htmlFor="signup-email" className="mb-1 block text-sm font-medium text-neutral-700">
          Email address
        </label>
        <Input
          id="signup-email"
          name="email"
          type="email"
          placeholder="you@example.com"
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
        <label htmlFor="signup-phone" className="mb-1 block text-sm font-medium text-neutral-700">
          Phone number
        </label>
        <div className="flex gap-2">
          <span className="flex items-center rounded-md border border-neutral-300 bg-neutral-50 px-3 text-sm text-neutral-500">
            +254
          </span>
          <Input
            id="signup-phone"
            name="phone"
            type="tel"
            inputMode="numeric"
            placeholder="7xx xxx xxx"
            autoComplete="tel-national"
            required
            error={!!phoneError}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            onBlur={(e) => validate("phone", e.target.value)}
            className="flex-1"
          />
        </div>
        {phoneError && <p className="mt-1 text-sm text-red-600">{phoneError}</p>}
      </div>
      <div>
        <label htmlFor="signup-password" className="mb-1 block text-sm font-medium text-neutral-700">
          Password
        </label>
        <PasswordInput
          id="signup-password"
          name="password"
          autoComplete="new-password"
          required
          error={!!passwordError}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onBlur={(e) => validate("password", e.target.value)}
        />
        <p className="mt-1 text-xs text-neutral-400">At least {PASSWORD_MIN_LENGTH} characters.</p>
        {passwordError && <p className="mt-1 text-sm text-red-600">{passwordError}</p>}
      </div>
      <div>
        <label htmlFor="signup-confirm-password" className="mb-1 block text-sm font-medium text-neutral-700">
          Confirm password
        </label>
        <PasswordInput
          id="signup-confirm-password"
          name="confirmPassword"
          autoComplete="new-password"
          required
          error={!!confirmPasswordError}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          onBlur={() => setConfirmTouched(true)}
        />
        {confirmPasswordError && <p className="mt-1 text-sm text-red-600">{confirmPasswordError}</p>}
      </div>
      <div>
        <label className="flex items-start gap-2 text-sm text-neutral-600">
          <input
            // React calls the DOM form's native reset() after every action
            // dispatch, which force-unchecks this checkbox directly in the
            // DOM. Since our own `checked` prop value doesn't itself change
            // on a failed submission, React has no reason to re-apply it,
            // so the DOM and React's state silently desync — the box shows
            // unchecked even though `termsAccepted` is still true. Keying
            // on dispatchCount forces a fresh DOM node every dispatch,
            // which always reflects the current React state.
            key={dispatchCount}
            type="checkbox"
            name="termsAccepted"
            value="true"
            required
            className="mt-0.5"
            checked={termsAccepted}
            onChange={(e) => setTermsAccepted(e.target.checked)}
          />
          <span>
            I agree to the{" "}
            <Link href="/terms" target="_blank" className="text-brand hover:underline">
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link href="/privacy" target="_blank" className="text-brand hover:underline">
              Privacy Policy
            </Link>
          </span>
        </label>
        {state.fieldErrors?.termsAccepted && (
          <p className="mt-1 text-sm text-red-600">{state.fieldErrors.termsAccepted}</p>
        )}
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Creating account…" : "Create account"}
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
          <p className="mt-1 text-sm text-neutral-500">Join HarakaGari and find your perfect car today.</p>
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
