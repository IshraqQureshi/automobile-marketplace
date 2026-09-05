import type { createClient } from "@/lib/supabase/server";

// Plain module, not "use server" — shared by the dashboard layout (route
// guard) and src/features/vehicle/actions.ts (server-side ownership
// resolution), so the "which showroom does this signed-in user own" lookup
// isn't duplicated between them.

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export interface OwnerShowroom {
  id: string;
  business_name: string;
  status: "PENDING" | "APPROVED" | "REJECTED" | "SUSPENDED";
}

/**
 * Resolves the one showroom a signed-in user should see in their dashboard.
 * A user normally owns exactly one active (PENDING/APPROVED/SUSPENDED)
 * showroom at a time — enforced by the `showrooms_owner_user_id_active_unique`
 * partial unique index — but REJECTED doesn't block re-registration, so an
 * owner can accumulate an old REJECTED row alongside a newer active one.
 * Prefer the newest non-REJECTED row; fall back to the newest REJECTED row
 * (so a rejected owner still sees their rejection instead of nothing); null
 * if they've never registered a showroom at all.
 */
export async function getOwnerShowroom(supabase: SupabaseServerClient, userId: string): Promise<OwnerShowroom | null> {
  const { data } = await supabase
    .from("showrooms")
    .select("id, business_name, status")
    .eq("owner_user_id", userId)
    .order("created_at", { ascending: false });

  if (!data || data.length === 0) return null;
  return data.find((showroom) => showroom.status !== "REJECTED") ?? data[0] ?? null;
}
