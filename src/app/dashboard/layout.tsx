import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { ToastProvider } from "@/components/ui/toast";
import { getPendingAppointmentCount } from "@/features/appointment/queries";
import { getUnreadFinancingCount } from "@/features/financing/queries";
import { getUnreadInquiryCount } from "@/features/inquiry/queries";
import { getOwnerShowroom } from "@/features/showroom/my-showroom";
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

  const [unreadInquiryCount, unreadFinancingCount, pendingAppointmentCount] =
    showroom.status === "APPROVED"
      ? await Promise.all([
          getUnreadInquiryCount(supabase, showroom.id),
          getUnreadFinancingCount(supabase, showroom.id),
          getPendingAppointmentCount(supabase, showroom.id),
        ])
      : [0, 0, 0];

  return (
    <ToastProvider>
      <DashboardShell
        email={user.email ?? ""}
        showroom={showroom}
        unreadInquiryCount={unreadInquiryCount}
        unreadFinancingCount={unreadFinancingCount}
        pendingAppointmentCount={pendingAppointmentCount}
      >
        {children}
      </DashboardShell>
    </ToastProvider>
  );
}
