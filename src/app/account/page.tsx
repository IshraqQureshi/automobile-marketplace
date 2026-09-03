import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { signOutAction } from "@/features/auth/actions";
import { createClient } from "@/lib/supabase/server";

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
  const { data: profile } = await supabase.from("profiles").select("full_name, role").eq("id", user.id).single();

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="font-display text-2xl font-semibold text-neutral-900">
        Welcome{profile?.full_name ? `, ${profile.full_name}` : ""}
      </h1>
      <p className="text-sm text-neutral-500">
        {user.email} — role: {profile?.role ?? "unknown"}
      </p>
      {error === "sign_out_failed" && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          Logging out failed. Please try again.
        </p>
      )}
      <p className="text-sm text-neutral-400">
        Full customer dashboard (AUTH-004) not yet implemented.
      </p>
      <form action={signOutAction}>
        <Button type="submit" variant="outline">
          Log out
        </Button>
      </form>
    </main>
  );
}
