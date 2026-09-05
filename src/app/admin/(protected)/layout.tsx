import { redirect } from "next/navigation";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { ToastProvider } from "@/components/ui/toast";
import { currentUserRole } from "@/features/auth/actions";
import { createClient } from "@/lib/supabase/server";

interface AdminProtectedLayoutProps {
  children: React.ReactNode;
}

export default async function AdminProtectedLayout({ children }: AdminProtectedLayoutProps) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/admin/login");
  }

  const role = await currentUserRole(supabase);
  if (role !== "ADMIN") {
    // Deliberately no signOut() here — Server Components can't reliably
    // write the cookie headers that would clear (see the note in
    // src/lib/supabase/server.ts). The redirect alone is what actually
    // protects every page under this layout; a stale non-admin session is
    // otherwise harmless.
    redirect("/admin/login");
  }

  return (
    <ToastProvider>
      <div className="grid min-h-screen grid-cols-[248px_1fr] bg-white">
        <AdminSidebar email={user.email ?? ""} />
        <div className="flex min-w-0 flex-col">{children}</div>
      </div>
    </ToastProvider>
  );
}
