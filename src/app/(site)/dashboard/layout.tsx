import { redirect } from "next/navigation";
import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar";
import { ToastProvider } from "@/components/ui/toast";
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

  const showroom = await getOwnerShowroom(supabase, user.id);
  if (!showroom) {
    redirect("/ready-to-sell");
  }

  return (
    <ToastProvider>
      <div className="grid min-h-screen grid-cols-[248px_1fr] bg-white">
        <DashboardSidebar email={user.email ?? ""} showroom={showroom} />
        <div className="flex min-w-0 flex-col">{children}</div>
      </div>
    </ToastProvider>
  );
}
