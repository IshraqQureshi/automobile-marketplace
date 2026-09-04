import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ResetPasswordForm } from "./reset-password-form";

export const metadata: Metadata = {
  title: "Set a new password — HarakaGari",
};

export default async function ResetPasswordPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main className="flex min-h-[70vh] items-center justify-center px-6 py-16">
      <div className="mx-auto w-full max-w-sm">
        {user ? (
          <>
            <h1 className="font-display text-2xl font-semibold text-neutral-900">Set a new password</h1>
            <p className="mt-1 text-sm text-neutral-500">Choose a new password for your account.</p>
            <div className="mt-6">
              <ResetPasswordForm />
            </div>
          </>
        ) : (
          <>
            <h1 className="font-display text-2xl font-semibold text-neutral-900">Link expired or invalid</h1>
            <p className="mt-1 text-sm text-neutral-500">
              This password reset link is no longer valid. Request a new one below.
            </p>
            <Link
              href="/forgot-password"
              className="mt-6 inline-block font-medium text-brand hover:underline"
            >
              Request a new link
            </Link>
          </>
        )}
      </div>
    </main>
  );
}
