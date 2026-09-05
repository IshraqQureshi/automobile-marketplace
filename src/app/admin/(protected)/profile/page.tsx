import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AccountProfileForm } from "@/components/account/account-profile-form";
import { AdminTopbar } from "@/components/admin/admin-topbar";
import { logger } from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "My Profile — HarakaGari Admin",
};

export default async function AdminProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");

  const { data: profile, error } = await supabase.from("profiles").select("full_name, phone").eq("id", user.id).single();
  if (error) {
    // handle_new_user guarantees a profile row exists for every auth user —
    // genuinely unexpected, worth a real log entry rather than a silent
    // blank-fields fallback.
    logger.error("Admin profile: failed to load own profile", error, { userId: user.id });
  }

  return (
    <>
      <AdminTopbar title="My Profile" />
      <main className="flex-1 px-7 py-6">
        <div className="mx-auto max-w-2xl">
          <AccountProfileForm
            initialValues={{
              fullName: profile?.full_name ?? "",
              phone: profile?.phone ?? "",
              email: user.email ?? "",
            }}
          />
        </div>
      </main>
    </>
  );
}
