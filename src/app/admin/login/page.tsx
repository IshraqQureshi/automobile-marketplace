import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { currentUserRole } from "@/features/auth/actions";
import { AdminLoginForm } from "./admin-login-form";

export const metadata: Metadata = {
  title: "Admin login — HarakaGari",
};

export default async function AdminLoginPage() {
  const supabase = await createClient();
  const role = await currentUserRole(supabase);

  if (role === "ADMIN") {
    redirect("/admin");
  }

  return (
    <main className="flex min-h-[70vh] items-center justify-center px-6 py-16">
      <div className="mx-auto w-full max-w-sm">
        <h1 className="font-display text-2xl font-semibold text-neutral-900">Admin sign in</h1>
        <p className="mt-1 text-sm text-neutral-500">
          This login is for HarakaGari administrators only.
        </p>
        <div className="mt-6">
          <AdminLoginForm />
        </div>
      </div>
    </main>
  );
}
