import type { Metadata } from "next";
import Link from "next/link";
import { AdminTopbar } from "@/components/admin/admin-topbar";
import { logger } from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Admin — HarakaGari",
};

interface AdminDashboardPageProps {
  searchParams: Promise<{ error?: string }>;
}

function countOrError(result: { count: number | null; error: unknown }): { value: string; isError: boolean } {
  if (result.error) return { value: "—", isError: true };
  return { value: String(result.count ?? 0), isError: false };
}

export default async function AdminDashboardPage({ searchParams }: AdminDashboardPageProps) {
  const { error } = await searchParams;
  const supabase = await createClient();

  // Real counts, not placeholders — showroom/vehicle management (Day 2)
  // hasn't shipped yet, so these are honestly 0 right now. `is_admin()` is
  // OR'd into each table's SELECT policy, so an authenticated admin gets an
  // unrestricted count here through the regular (RLS-scoped) client —
  // verified against the actual policy SQL, no service-role client needed.
  const [pendingShowrooms, approvedShowrooms, activeVehicles, users, recentPendingShowrooms] = await Promise.all([
    supabase.from("showrooms").select("*", { count: "exact", head: true }).eq("status", "PENDING"),
    supabase.from("showrooms").select("*", { count: "exact", head: true }).eq("status", "APPROVED"),
    supabase.from("vehicles").select("*", { count: "exact", head: true }).eq("status", "ACTIVE"),
    supabase.from("profiles").select("*", { count: "exact", head: true }),
    supabase.from("showrooms").select("id, business_name, city, created_at").eq("status", "PENDING").order("created_at").limit(5),
  ]);

  for (const [label, result] of [
    ["pending showrooms", pendingShowrooms],
    ["approved showrooms", approvedShowrooms],
    ["active vehicles", activeVehicles],
    ["users", users],
    ["recent pending showrooms", recentPendingShowrooms],
  ] as const) {
    if (result.error) {
      logger.error(`Admin dashboard: failed to count ${label}`, result.error);
    }
  }

  // A failed query and a genuine zero must not look the same — an admin
  // reading "0 pending showrooms" needs that to mean zero, not "the count
  // query failed and we hid it behind a fallback."
  const stats = [
    { label: "Pending showrooms", ...countOrError(pendingShowrooms), hint: "Awaiting review" },
    { label: "Approved showrooms", ...countOrError(approvedShowrooms), hint: "Live on the marketplace" },
    { label: "Vehicles listed", ...countOrError(activeVehicles), hint: "Active listings" },
    { label: "Registered users", ...countOrError(users), hint: "Customers & showrooms" },
  ];

  return (
    <>
      <AdminTopbar title="Dashboard" />
      <main className="flex-1 px-7 py-6">
        <div className="flex flex-col gap-6">
          {error === "sign_out_failed" && (
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
              Logging out failed. Please try again.
            </p>
          )}

          <section className="grid grid-cols-4 gap-3.5">
            {stats.map((stat) => (
              <div key={stat.label} className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
                <p className="text-xs font-medium text-neutral-500">{stat.label}</p>
                <p
                  className={`mt-2 font-mono text-2xl font-semibold ${stat.isError ? "text-neutral-300" : "text-neutral-900"}`}
                >
                  {stat.value}
                </p>
                <p className="mt-1 text-xs text-neutral-400">{stat.isError ? "Couldn't load" : stat.hint}</p>
              </div>
            ))}
          </section>

          <section className="grid grid-cols-[2fr_300px] gap-4">
            <div className="rounded-xl border border-neutral-200 bg-white shadow-sm">
              <div className="flex items-center justify-between gap-3 border-b border-neutral-200 px-5 py-4">
                <div>
                  <h2 className="font-display text-base font-semibold text-neutral-900">Pending approvals</h2>
                  <p className="text-xs text-neutral-500">New showroom submissions</p>
                </div>
                {(recentPendingShowrooms.data?.length ?? 0) > 0 && (
                  <Link href="/admin/showrooms" className="shrink-0 text-xs font-medium text-brand hover:underline">
                    View all
                  </Link>
                )}
              </div>
              {recentPendingShowrooms.data && recentPendingShowrooms.data.length > 0 ? (
                <ul>
                  {recentPendingShowrooms.data.map((showroom) => (
                    <li key={showroom.id} className="flex items-center justify-between gap-3 border-b border-neutral-100 px-5 py-3 last:border-b-0">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-neutral-800">{showroom.business_name}</p>
                        <p className="text-xs text-neutral-400">{showroom.city ?? "—"}</p>
                      </div>
                      <Link
                        href="/admin/showrooms"
                        className="shrink-0 rounded-md border border-neutral-300 px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
                      >
                        Review
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="flex flex-col items-center justify-center gap-1 px-5 py-14 text-center">
                  <p className="text-sm font-medium text-neutral-500">No pending submissions</p>
                  <p className="text-xs text-neutral-400">New showroom registrations will show up here.</p>
                </div>
              )}
            </div>

            <div className="rounded-xl border border-neutral-200 bg-white shadow-sm">
              <div className="border-b border-neutral-200 px-5 py-4">
                <h2 className="font-display text-base font-semibold text-neutral-900">Recent activity</h2>
                <p className="text-xs text-neutral-500">Last 24 hours</p>
              </div>
              <div className="flex flex-col items-center justify-center gap-1 px-5 py-14 text-center">
                <p className="text-sm font-medium text-neutral-500">No activity yet</p>
              </div>
            </div>
          </section>
        </div>
      </main>
    </>
  );
}
