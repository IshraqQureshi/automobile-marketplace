import type { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export interface AdminUserListItem {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
  role: "CUSTOMER" | "SHOWROOM" | "ADMIN";
  isActive: boolean;
  createdAt: string;
  showroomName: string | null;
}

/**
 * Every real user, platform-wide (ADM-003). `profiles` has no email column
 * (only auth.users does), so email is resolved via the service-role admin
 * API and joined in-memory — the same pattern src/features/inquiry/actions.ts
 * already uses to resolve real recipient emails. `listUsers` has no
 * "get many by id" call, only pagination, so every user is paged through
 * once and matched by id — fine at this project's real user counts (same
 * "no pagination at this scale" convention as every other admin list), and
 * still just one extra service-role round trip regardless of profile count.
 */
export async function getAllUsersForAdmin(supabase: SupabaseServerClient): Promise<AdminUserListItem[]> {
  const [{ data: profiles }, { data: showrooms }] = await Promise.all([
    supabase.from("profiles").select("id, full_name, phone, role, is_active, created_at").order("created_at", { ascending: false }),
    supabase.from("showrooms").select("owner_user_id, business_name"),
  ]);

  const showroomByOwner = new Map<string, string>();
  for (const showroom of showrooms ?? []) {
    showroomByOwner.set(showroom.owner_user_id, showroom.business_name);
  }

  const admin = createAdminClient();
  const emailById = new Map<string, string>();
  let page = 1;
  const perPage = 200;
  for (;;) {
    const { data } = await admin.auth.admin.listUsers({ page, perPage });
    for (const user of data.users) {
      if (user.email) emailById.set(user.id, user.email);
    }
    if (data.users.length < perPage) break;
    page += 1;
  }

  return (profiles ?? []).map((profile) => ({
    id: profile.id,
    email: emailById.get(profile.id) ?? "(no email on file)",
    fullName: profile.full_name || "(no name on file)",
    phone: profile.phone,
    role: profile.role,
    isActive: profile.is_active,
    createdAt: profile.created_at,
    showroomName: showroomByOwner.get(profile.id) ?? null,
  }));
}
