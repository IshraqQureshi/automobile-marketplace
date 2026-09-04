import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { adminSignOutAction } from "@/features/admin/actions";
import { currentUserRole } from "@/features/auth/actions";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Admin — HarakaGari",
};

interface AdminPageProps {
  searchParams: Promise<{ error?: string }>;
}

export default async function AdminPage({ searchParams }: AdminPageProps) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/admin/login");
  }

  const role = await currentUserRole(supabase);
  if (role !== "ADMIN") {
    // Deliberately no signOut() here — Server Components can't reliably
    // write the cookie headers that would clear (see the note in
    // src/lib/supabase/server.ts). The redirect alone is what actually
    // protects this page; a stale non-admin session is otherwise harmless.
    redirect("/admin/login");
  }

  const { error } = await searchParams;

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="font-display text-2xl font-semibold text-neutral-900">Admin</h1>
      <p className="text-sm text-neutral-500">Signed in as {user.email}</p>
      {error === "sign_out_failed" && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          Logging out failed. Please try again.
        </p>
      )}
      <p className="text-sm text-neutral-400">Admin dashboard not yet implemented.</p>
      <form action={adminSignOutAction}>
        <Button type="submit" variant="outline">
          Log out
        </Button>
      </form>
    </main>
  );
}
