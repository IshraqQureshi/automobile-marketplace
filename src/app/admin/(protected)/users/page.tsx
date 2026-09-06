import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AdminTopbar } from "@/components/admin/admin-topbar";
import { UserList } from "@/components/admin/user-list";
import { getAllUsersForAdmin } from "@/features/admin/user-queries";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Users — HarakaGari Admin",
};

export default async function AdminUsersPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");

  const users = await getAllUsersForAdmin(supabase);

  return (
    <>
      <AdminTopbar title="Users" />
      <main className="flex-1 px-7 py-6">
        <UserList users={users} currentUserId={user.id} />
      </main>
    </>
  );
}
