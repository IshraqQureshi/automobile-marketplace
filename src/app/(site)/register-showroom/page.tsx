import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { RegisterShowroomForm } from "@/components/showroom/register-showroom-form";
import { logger } from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Register as a Showroom — HarakaGari",
};

export default async function RegisterShowroomPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [{ data: profile, error: profileError }, { data: existingShowroom, error: showroomError }] = await Promise.all([
    supabase.from("profiles").select("full_name, phone").eq("id", user.id).single(),
    supabase.from("showrooms").select("status").eq("owner_user_id", user.id).in("status", ["PENDING", "APPROVED", "SUSPENDED"]).maybeSingle(),
  ]);

  if (profileError) {
    logger.error("Failed to load profile for showroom registration", profileError, { userId: user.id });
  }
  if (showroomError) {
    logger.error("Failed to check for an existing showroom", showroomError, { userId: user.id });
  }

  return (
    <main className="bg-neutral-50 px-6 py-16">
      <div className="mx-auto max-w-lg text-center">
        <p className="text-xs font-semibold tracking-wide text-brand uppercase">Join HarakaGari</p>
        <h1 className="mt-2 font-display text-4xl font-bold text-neutral-900">Register as Showroom</h1>
        <p className="mt-2 text-sm text-neutral-500">List your vehicles in front of thousands of buyers across Kenya.</p>

        <div className="mt-8">
          {existingShowroom ? (
            <ExistingShowroomStatus status={existingShowroom.status} />
          ) : (
            <RegisterShowroomForm defaultOwnerName={profile?.full_name ?? ""} defaultEmail={user.email ?? ""} defaultPhone={profile?.phone ?? ""} />
          )}
        </div>

        {!existingShowroom && (
          <p className="mt-6 text-xs text-neutral-400">Your information is verified securely. We&apos;ll contact you within 1–2 business days.</p>
        )}
      </div>
    </main>
  );
}

// The page's own query filters to status in (PENDING, APPROVED, SUSPENDED),
// but the column's type is the full 4-value enum — REJECTED is handled
// defensively even though this component is never reached with it today.
function ExistingShowroomStatus({ status }: { status: "PENDING" | "APPROVED" | "REJECTED" | "SUSPENDED" }) {
  const copy = {
    PENDING: {
      heading: "Application pending review",
      body: "We're reviewing your business information and documents. We'll be in touch within 1–2 business days.",
    },
    APPROVED: {
      heading: "Your showroom is approved",
      body: "Your showroom is live on HarakaGari. The showroom dashboard for managing your listings is coming soon.",
    },
    SUSPENDED: {
      heading: "Showroom suspended",
      body: "Your showroom has been suspended. Please contact support for more information.",
    },
    REJECTED: {
      heading: "Application not approved",
      body: "Your previous application wasn't approved. Please contact support for details.",
    },
  }[status];

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-8 shadow-sm">
      <h2 className="font-display text-lg font-semibold text-neutral-900">{copy.heading}</h2>
      <p className="mt-2 text-sm text-neutral-500">{copy.body}</p>
    </div>
  );
}
