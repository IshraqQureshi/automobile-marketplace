import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AccountProfileForm } from "@/components/account/account-profile-form";
import { logger } from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "My Account — HarakaGari",
};

export default async function DashboardAccountPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // No showroom lookup needed here — the dashboard layout itself already
  // guarantees the signed-in user owns a showroom before any /dashboard/*
  // page is reachable at all (see src/app/dashboard/layout.tsx). This page
  // edits the owner's own personal identity, not the showroom's business
  // profile (see /dashboard/profile for that).
  const { data: profile, error } = await supabase.from("profiles").select("full_name, phone").eq("id", user.id).single();
  if (error) {
    logger.error("Dashboard account: failed to load own profile", error, { userId: user.id });
  }

  return (
    <div className="mx-auto max-w-2xl p-7">
      <Link href="/dashboard" className="text-sm font-medium text-neutral-500 hover:text-neutral-700">
        ← Back to dashboard
      </Link>
      <h1 className="mt-2 mb-6 font-display text-xl font-semibold text-neutral-900">My account</h1>
      <AccountProfileForm
        initialValues={{
          fullName: profile?.full_name ?? "",
          phone: profile?.phone ?? "",
          email: user.email ?? "",
        }}
      />
    </div>
  );
}
