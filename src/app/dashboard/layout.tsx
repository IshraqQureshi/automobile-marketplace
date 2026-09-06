import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { ToastProvider } from "@/components/ui/toast";
import { getUnreadInquiryCount } from "@/features/inquiry/queries";
import { getOwnerShowroom } from "@/features/showroom/my-showroom";
import { createClient } from "@/lib/supabase/server";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

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

  const unreadInquiryCount = showroom.status === "APPROVED" ? await getUnreadInquiryCount(supabase, showroom.id) : 0;

  return (
    <ToastProvider>
      <DashboardShell email={user.email ?? ""} showroom={showroom} unreadInquiryCount={unreadInquiryCount}>
        {children}
      </DashboardShell>
    </ToastProvider>
  );
}
