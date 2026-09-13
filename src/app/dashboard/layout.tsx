import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { ToastProvider } from "@/components/ui/toast";
import { getPendingAppointmentCount } from "@/features/appointment/queries";
import { getOwnerShowroom } from "@/features/showroom/my-showroom";
import { getCurrentSubscriptionStatus, getMyShowroomPayments } from "@/features/showroom/payment-queries";
import { createClient } from "@/lib/supabase/server";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

// robots.txt already disallows crawling /dashboard, but a disallow rule
// only blocks the crawl, not indexing a URL discovered via an external
// link — this is the real noindex signal.
//
// CAUTION for future pages: Next.js metadata objects for the same field
// (here, `robots`) are replaced wholesale by a child segment's own value,
// not deep-merged (see the equivalent note in src/app/admin/layout.tsx). If
// any future page under /dashboard ever adds its own `metadata.robots`
// without including `index: false`, it will silently un-noindex itself.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

/**
 * Showroom-owner dashboard guard (SHR-004). There is no "SHOWROOM" profile
 * role in practice — registering a showroom never changes profiles.role
 * (confirmed: it stays CUSTOMER) — so ownership, not role, is what
 * determines dashboard access: does this signed-in user own a showroom row
 * at all. A showroom that exists but isn't APPROVED still gets the
 * dashboard shell (so they can see their status), just not the
 * approved-only vehicle management pages — those pages check
 * showroom.status themselves.
 */
export default async function DashboardLayout({ children }: DashboardLayoutProps) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const showroom = await getOwnerShowroom(user.id);
  if (!showroom) {
    redirect("/ready-to-sell");
  }

  const pendingAppointmentCount = showroom.status === "APPROVED" ? await getPendingAppointmentCount(supabase, showroom.id) : 0;

  // Same badge convention as pendingAppointmentCount above (NavEntry.count),
  // but here it's a due/not-due flag rather than a literal count — a
  // showroom only ever has one *current* subscription period.
  let paymentDueCount = 0;
  if (showroom.status === "APPROVED") {
    const payments = await getMyShowroomPayments(supabase, showroom.id);
    const current = getCurrentSubscriptionStatus(payments);
    paymentDueCount = current && current.urgency !== "ACTIVE" ? 1 : 0;
  }

  return (
    <ToastProvider>
      <DashboardShell email={user.email ?? ""} showroom={showroom} pendingAppointmentCount={pendingAppointmentCount} paymentDueCount={paymentDueCount}>
        {children}
      </DashboardShell>
    </ToastProvider>
  );
}
