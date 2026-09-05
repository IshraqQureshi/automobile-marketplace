import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CarIcon, CheckIcon, PencilIcon, PlusIcon, TagIcon } from "@/components/admin/admin-ui";
import { DashboardTopbar } from "@/components/dashboard/dashboard-topbar";
import { ProfileIcon } from "@/components/dashboard/dashboard-sidebar";
import { getOwnerShowroom } from "@/features/showroom/my-showroom";
import { STATUS_BADGE_CLASSES, STATUS_LABELS, VEHICLE_SELECT_COLUMNS, currencyFormatter, vehicleRowToListItem } from "@/features/vehicle/types";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Dashboard — HarakaGari",
};

const STATUS_COPY: Record<string, { heading: string; body: string; tone: string; icon: React.JSX.Element }> = {
  PENDING: {
    heading: "Your showroom is under review",
    body: "Our team is reviewing your registration and submitted documents. You'll be able to add and publish vehicles once you're approved.",
    tone: "border-amber-200 bg-amber-50 text-amber-800",
    icon: <ClockIcon />,
  },
  REJECTED: {
    heading: "Your showroom registration was not approved",
    body: "Contact support for details, or submit a new registration.",
    tone: "border-red-200 bg-red-50 text-red-800",
    icon: <AlertIcon />,
  },
  SUSPENDED: {
    heading: "Your showroom is suspended",
    body: "Contact support for details on reinstating your account.",
    tone: "border-neutral-200 bg-neutral-100 text-neutral-700",
    icon: <AlertIcon />,
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

  let vehicleCounts = { total: 0, active: 0, draft: 0, sold: 0 };
  let recentVehicles: ReturnType<typeof vehicleRowToListItem>[] = [];

  if (showroom.status === "APPROVED") {
    const [{ count: total }, { count: active }, { count: draft }, { count: sold }, { data: recent }] = await Promise.all([
      supabase.from("vehicles").select("id", { count: "exact", head: true }).eq("showroom_id", showroom.id),
      supabase.from("vehicles").select("id", { count: "exact", head: true }).eq("showroom_id", showroom.id).eq("status", "ACTIVE"),
      supabase.from("vehicles").select("id", { count: "exact", head: true }).eq("showroom_id", showroom.id).eq("status", "DRAFT"),
      supabase.from("vehicles").select("id", { count: "exact", head: true }).eq("showroom_id", showroom.id).eq("status", "SOLD"),
      supabase
        .from("vehicles")
        .select(VEHICLE_SELECT_COLUMNS)
        .eq("showroom_id", showroom.id)
        .order("created_at", { ascending: false })
        .limit(5),
    ]);
    vehicleCounts = { total: total ?? 0, active: active ?? 0, draft: draft ?? 0, sold: sold ?? 0 };
    recentVehicles = (recent ?? []).map((vehicle) =>
      vehicleRowToListItem(vehicle, (storagePath) => supabase.storage.from("vehicle-media").getPublicUrl(storagePath).data.publicUrl),
    );
  }

  const statusCopy = STATUS_COPY[showroom.status];

  return (
    <>
      <DashboardTopbar title="Dashboard" showroom={showroom} />
      <main className="flex-1 px-7 py-6">
        <div className="flex flex-col gap-6">
          {statusCopy && (
            <div className={`flex items-start gap-3 rounded-xl border px-5 py-4 ${statusCopy.tone}`}>
              <span className="mt-0.5 shrink-0">{statusCopy.icon}</span>
              <div>
                <p className="font-medium">{statusCopy.heading}</p>
                <p className="mt-1 text-sm">{statusCopy.body}</p>
              </div>
            </div>
          )}

          {showroom.status !== "APPROVED" && (
            <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
              <h2 className="font-display text-base font-semibold text-neutral-900">While you wait</h2>
              <p className="mt-1 text-sm text-neutral-500">
                You can still review and update your business details — they&rsquo;ll be visible to admins during review.
              </p>
              <Link
                href="/dashboard/profile"
                className="mt-3 inline-flex items-center gap-1.5 rounded-md border border-neutral-300 px-3.5 py-2 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-50"
              >
                <ProfileIcon />
                Edit showroom profile
              </Link>
            </div>
          )}

          {showroom.status === "APPROVED" && (
            <>
              <div>
                <h2 className="font-display text-xl font-semibold text-neutral-900">{showroom.business_name}</h2>
                <p className="text-sm text-neutral-500">Here&rsquo;s what&rsquo;s happening with your listings today.</p>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatTile id="stat-total" label="Total listings" value={vehicleCounts.total} icon={<CarIcon />} />
                <StatTile id="stat-published" label="Published" value={vehicleCounts.active} icon={<CheckIcon />} />
                <StatTile id="stat-drafts" label="Drafts" value={vehicleCounts.draft} icon={<PencilIcon />} />
                <StatTile id="stat-sold" label="Sold" value={vehicleCounts.sold} icon={<TagIcon className="h-4.5 w-4.5" />} />
              </div>

              <div className="flex flex-wrap gap-3">
                <Link
                  href="/dashboard/vehicles/new"
                  className="flex items-center gap-1.5 rounded-md bg-brand px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-dark"
                >
                  <PlusIcon />
                  Add a vehicle
                </Link>
                <Link
                  href="/dashboard/vehicles"
                  className="flex items-center gap-1.5 rounded-md border border-neutral-300 px-4 py-2.5 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-50"
                >
                  <CarIcon />
                  Manage vehicles
                </Link>
                <Link
                  href="/dashboard/profile"
                  className="flex items-center gap-1.5 rounded-md border border-neutral-300 px-4 py-2.5 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-50"
                >
                  <ProfileIcon />
                  Edit showroom profile
                </Link>
              </div>

              <div className="rounded-xl border border-neutral-200 bg-white shadow-sm">
                <div className="flex items-center justify-between gap-3 border-b border-neutral-200 px-5 py-4">
                  <div>
                    <h2 className="font-display text-base font-semibold text-neutral-900">Recent listings</h2>
                    <p className="text-xs text-neutral-500">Your most recently added vehicles</p>
                  </div>
                  {recentVehicles.length > 0 && (
                    <Link href="/dashboard/vehicles" className="shrink-0 text-xs font-medium text-brand hover:underline">
                      View all
                    </Link>
                  )}
                </div>

                {recentVehicles.length > 0 ? (
                  <ul>
                    {recentVehicles.map((vehicle) => {
                      const primaryPhoto = vehicle.photos.find((p) => p.isPrimary) ?? vehicle.photos[0];
                      return (
                        <li key={vehicle.id} className="border-b border-neutral-100 last:border-b-0">
                          <Link
                            href={`/dashboard/vehicles/${vehicle.id}/edit`}
                            className="flex items-start gap-3 px-5 py-3 transition-colors hover:bg-neutral-50 sm:items-center"
                          >
                            <div className="flex h-10 w-14 shrink-0 items-center justify-center overflow-hidden rounded-md bg-neutral-100">
                              {primaryPhoto ? (
                                <Image src={primaryPhoto.url} alt="" width={56} height={40} unoptimized className="h-full w-full object-cover" />
                              ) : (
                                <CarIcon />
                              )}
                            </div>
                            <div className="flex min-w-0 flex-1 flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                              <div className="min-w-0">
                                <p className="truncate text-sm font-medium text-neutral-800">{vehicle.title}</p>
                                <p className="truncate text-xs text-neutral-400">
                                  {vehicle.year} · {vehicle.make} {vehicle.model}
                                </p>
                              </div>
                              <div className="flex shrink-0 items-center gap-2 sm:gap-3">
                                <p className="text-sm font-medium text-neutral-800 tabular-nums">{currencyFormatter.format(vehicle.price)}</p>
                                <span className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${STATUS_BADGE_CLASSES[vehicle.status]}`}>
                                  {STATUS_LABELS[vehicle.status]}
                                </span>
                              </div>
                            </div>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <div className="flex flex-col items-center justify-center gap-2 px-5 py-14 text-center">
                    <p className="text-sm font-medium text-neutral-500">No vehicles yet</p>
                    <p className="text-xs text-neutral-400">Add your first listing to get it in front of buyers.</p>
                    <Link
                      href="/dashboard/vehicles/new"
                      className="mt-2 flex items-center gap-1.5 rounded-md bg-brand px-3.5 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-dark"
                    >
                      <PlusIcon />
                      Add a vehicle
                    </Link>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </main>
    </>
  );
}

function StatTile({ id, label, value, icon }: { id: string; label: string; value: number; icon: React.JSX.Element }) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand">{icon}</span>
        <div>
          <p className="text-xs font-semibold tracking-wide text-neutral-400 uppercase">{label}</p>
          <p id={id} className="font-display text-2xl font-semibold text-neutral-900 tabular-nums">
            {value}
          </p>
        </div>
      </div>
    </div>
  );
}

function ClockIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 3" />
    </svg>
  );
}

function AlertIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5" aria-hidden="true">
      <path d="M12 9v4M12 17h.01" />
      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L14.71 3.86a2 2 0 0 0-3.42 0Z" />
    </svg>
  );
}
