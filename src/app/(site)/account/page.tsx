import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { signOutAction } from "@/features/auth/actions";
import { getOwnerShowroom } from "@/features/showroom/my-showroom";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";

export const metadata: Metadata = {
  title: "My Account — HarakaGari",
};

interface AccountPageProps {
  searchParams: Promise<{ error?: string }>;
}

export default async function AccountPage({ searchParams }: AccountPageProps) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { error } = await searchParams;
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("full_name, phone, role")
    .eq("id", user.id)
    .single();

  if (profileError) {
    // Genuinely unexpected — the handle_new_user trigger guarantees a
    // profile row exists for every auth user. Worth a real log entry, not
    // a silent fallback to "unknown".
    logger.error("Failed to load profile for authenticated user", profileError, { userId: user.id });
  }

  // profiles.role never actually becomes "SHOWROOM" (registering a showroom
  // doesn't change it — see the note in src/features/showroom/my-showroom.ts),
  // so whether this account owns a showroom has to be checked directly
  // rather than read off role.
  const showroom = await getOwnerShowroom(user.id);

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="font-display text-2xl font-semibold text-neutral-900">
        Welcome{profile?.full_name ? `, ${profile.full_name}` : ""}
      </h1>
      <p className="text-sm text-neutral-500">
        {user.email}
        {profile?.phone ? ` · ${profile.phone}` : ""} — role: {profile?.role ?? "unknown"}
      </p>
      {error === "sign_out_failed" && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          Logging out failed. Please try again.
        </p>
      )}
      {showroom ? (
        <Link href="/dashboard" className="text-sm font-medium text-brand hover:text-brand-dark">
          Go to your showroom dashboard →
        </Link>
      ) : (
        <p className="text-sm text-neutral-400">Full customer dashboard (AUTH-004) not yet implemented.</p>
      )}
      <form action={signOutAction}>
        <Button type="submit" variant="outline">
          Log out
        </Button>
      </form>
    </main>
  );
}
