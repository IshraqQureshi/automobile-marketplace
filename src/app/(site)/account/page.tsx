import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { VehicleCard } from "@/components/vehicle/vehicle-card";
import { signOutAction } from "@/features/auth/actions";
import { getCustomerAppointments } from "@/features/appointment/queries";
import { APPOINTMENT_STATUS_LABELS } from "@/features/appointment/schemas";
import { getCustomerFavorites } from "@/features/favorites/queries";
import { getOwnerShowroom } from "@/features/showroom/my-showroom";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";

export const metadata: Metadata = {
  title: "My Account — HarakaGari",
  // robots.txt already disallows crawling /account (a private, per-user
  // page); this is the real noindex signal for a URL discovered via an
  // external link rather than crawled directly.
  robots: { index: false, follow: false },
};

const dateFormatter = new Intl.DateTimeFormat("en-KE", { weekday: "short", year: "numeric", month: "short", day: "numeric" });
const memberSinceFormatter = new Intl.DateTimeFormat("en-KE", { year: "numeric", month: "long" });

const APPOINTMENT_STATUS_BADGE_CLASSES: Record<string, string> = {
  PENDING: "bg-amber-50 text-amber-700",
  CONFIRMED: "bg-emerald-50 text-emerald-700",
  RESCHEDULED: "bg-blue-50 text-blue-700",
  DECLINED: "bg-red-50 text-red-700",
  CANCELLED: "bg-neutral-100 text-neutral-500",
  COMPLETED: "bg-neutral-100 text-neutral-700",
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
    .select("full_name, phone, role, created_at")
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

  // A showroom owner already has their own dedicated dashboard
  // (/dashboard) — this customer dashboard (AUTH-004) is for the
  // non-showroom-owner majority of accounts, so it stops here rather than
  // duplicating appointment/favorite data that's really the showroom's own
  // business, not this person's as a car buyer.
  if (showroom) {
    return (
      <main className="mx-auto flex min-h-[70vh] max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
        <h1 className="font-display text-2xl font-semibold text-neutral-900">
          Welcome{profile?.full_name ? `, ${profile.full_name}` : ""}
        </h1>
        <p className="text-sm text-neutral-500">{user.email}</p>
        {error === "sign_out_failed" && (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">Logging out failed. Please try again.</p>
        )}
        <Link href="/dashboard" className="text-sm font-medium text-brand hover:text-brand-dark">
          Go to your showroom dashboard →
        </Link>
        <form action={signOutAction}>
          <Button type="submit" variant="outline">
            Log out
          </Button>
        </form>
      </main>
    );
  }

  const [appointments, favorites] = await Promise.all([getCustomerAppointments(supabase, user.id), getCustomerFavorites(supabase, user.id)]);

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold text-neutral-900">
            Welcome{profile?.full_name ? `, ${profile.full_name}` : ""}
          </h1>
          <p className="mt-1 text-sm text-neutral-500">
            {user.email}
            {profile?.phone ? ` · ${profile.phone}` : ""}
            {profile?.created_at ? ` · Member since ${memberSinceFormatter.format(new Date(profile.created_at))}` : ""}
          </p>
        </div>
        <form action={signOutAction}>
          <Button type="submit" variant="outline">
            Log out
          </Button>
        </form>
      </div>

      {error === "sign_out_failed" && (
        <p className="mb-6 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">Logging out failed. Please try again.</p>
      )}

      <section className="mb-10">
        <h2 className="font-display mb-4 text-lg font-semibold text-neutral-900">My Appointments</h2>
        {appointments.length === 0 ? (
          <div className="rounded-xl border border-dashed border-neutral-300 bg-white px-6 py-10 text-center">
            <p className="text-sm font-medium text-neutral-500">No appointments yet.</p>
            <p className="mt-1 text-xs text-neutral-400">Book a test drive from any vehicle&apos;s detail page to see it here.</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-neutral-200">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-neutral-200 bg-neutral-50 text-xs font-semibold tracking-wide text-neutral-400 uppercase">
                  <th className="px-5 py-3 font-semibold">Date</th>
                  <th className="px-5 py-3 font-semibold">Showroom</th>
                  <th className="px-5 py-3 font-semibold">Vehicle(s)</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {appointments.map((appointment) => (
                  <tr key={appointment.id} className="border-b border-neutral-100 last:border-b-0">
                    <td className="px-5 py-3 whitespace-nowrap text-neutral-700">
                      {dateFormatter.format(new Date(`${appointment.appointmentDate}T00:00:00`))}
                      <span className="ml-1.5 text-xs text-neutral-400">
                        {appointment.startTime}–{appointment.endTime}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-neutral-700">{appointment.showroomName}</td>
                    <td className="px-5 py-3 text-neutral-600">{appointment.vehicles.map((v) => v.title).join(", ") || "—"}</td>
                    <td className="px-5 py-3">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                          APPOINTMENT_STATUS_BADGE_CLASSES[appointment.status] ?? "bg-neutral-100 text-neutral-600"
                        }`}
                      >
                        {APPOINTMENT_STATUS_LABELS[appointment.status] ?? appointment.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section>
        <h2 className="font-display mb-4 text-lg font-semibold text-neutral-900">My Favorites</h2>
        {favorites.length === 0 ? (
          <div className="rounded-xl border border-dashed border-neutral-300 bg-white px-6 py-10 text-center">
            <p className="text-sm font-medium text-neutral-500">No favorites yet.</p>
            <p className="mt-1 text-xs text-neutral-400">
              Browse the{" "}
              <Link href="/listing" className="font-medium text-brand hover:underline">
                marketplace
              </Link>{" "}
              and tap the heart on a vehicle to save it here.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {favorites.map((vehicle) => (
              <VehicleCard key={vehicle.id} vehicle={vehicle} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
