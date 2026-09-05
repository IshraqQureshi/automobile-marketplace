import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

// Plain module, not "use server" — shared by the dashboard layout (route
// guard), its child pages, and src/features/vehicle/actions.ts, so the
// "which showroom does this signed-in user own" lookup isn't duplicated
// between them.

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
 *
 * Wrapped in React's `cache()` (keyed by userId) so DashboardLayout's own
 * guard and every child Server Component under it (page.tsx, vehicles/page.tsx)
 * share one query per request instead of each re-running it — this is the
 * standard App Router pattern for exactly this "layout resolved it, page
 * needs it too" case, since a Client Component boundary would be needed to
 * pass the result down as a prop instead.
 */
export const getOwnerShowroom = cache(async (userId: string): Promise<OwnerShowroom | null> => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("showrooms")
    .select("id, business_name, status")
    .eq("owner_user_id", userId)
    .order("created_at", { ascending: false });

  if (!data || data.length === 0) return null;
  return data.find((showroom) => showroom.status !== "REJECTED") ?? data[0] ?? null;
});
