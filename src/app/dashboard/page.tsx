import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getOwnerShowroom } from "@/features/showroom/my-showroom";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Dashboard — HarakaGari",
};

const STATUS_COPY: Record<string, { heading: string; body: string; tone: string }> = {
  PENDING: {
    heading: "Your showroom is under review",
    body: "Our team is reviewing your registration and submitted documents. You'll be able to add and publish vehicles once you're approved.",
    tone: "bg-amber-50 text-amber-800 border-amber-200",
  },
  REJECTED: {
    heading: "Your showroom registration was not approved",
    body: "Contact support for details, or submit a new registration.",
    tone: "bg-red-50 text-red-800 border-red-200",
  },
  SUSPENDED: {
    heading: "Your showroom is suspended",
    body: "Contact support for details on reinstating your account.",
    tone: "bg-neutral-100 text-neutral-700 border-neutral-200",
  },
};

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const showroom = await getOwnerShowroom(user.id);
  if (!showroom) redirect("/ready-to-sell");

  let vehicleCounts = { total: 0, active: 0, draft: 0 };
  if (showroom.status === "APPROVED") {
    const [{ count: total }, { count: active }, { count: draft }] = await Promise.all([
      supabase.from("vehicles").select("id", { count: "exact", head: true }).eq("showroom_id", showroom.id),
      supabase.from("vehicles").select("id", { count: "exact", head: true }).eq("showroom_id", showroom.id).eq("status", "ACTIVE"),
      supabase.from("vehicles").select("id", { count: "exact", head: true }).eq("showroom_id", showroom.id).eq("status", "DRAFT"),
    ]);
    vehicleCounts = { total: total ?? 0, active: active ?? 0, draft: draft ?? 0 };
  }

  const statusCopy = STATUS_COPY[showroom.status];

  return (
    <div className="flex flex-col gap-6 p-7">
      <div>
        <h1 className="font-display text-xl font-semibold text-neutral-900">{showroom.business_name}</h1>
        <p className="text-sm text-neutral-500">Welcome back, {user.email}</p>
      </div>

      {statusCopy && (
        <div className={`rounded-xl border px-5 py-4 ${statusCopy.tone}`}>
          <p className="font-medium">{statusCopy.heading}</p>
          <p className="mt-1 text-sm">{statusCopy.body}</p>
        </div>
      )}

      {showroom.status === "APPROVED" && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatTile label="Total listings" value={vehicleCounts.total} />
            <StatTile label="Published" value={vehicleCounts.active} />
            <StatTile label="Drafts" value={vehicleCounts.draft} />
          </div>
          <Link
            href="/dashboard/vehicles"
            className="w-fit rounded-md bg-brand px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-dark"
          >
            Manage vehicles
          </Link>
        </>
      )}
    </div>
  );
}

function StatTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-semibold tracking-wide text-neutral-400 uppercase">{label}</p>
      <p className="mt-1 font-display text-2xl font-semibold text-neutral-900 tabular-nums">{value}</p>
    </div>
  );
}
