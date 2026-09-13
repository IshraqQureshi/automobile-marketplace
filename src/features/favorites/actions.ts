"use server";

import { revalidatePath } from "next/cache";
import { logger } from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";

export interface ToggleFavoriteResult {
  favorited?: boolean;
  error?: string;
}

/**
 * Toggles one vehicle's favorite state for the signed-in customer (AUTH-005).
 * Authorization is entirely RLS (favorites_select_own/_insert_own/_delete_own,
 * all scoped to customer_id = auth.uid()) — this action only needs to check
 * that a session exists at all, not re-derive ownership itself.
 * favorites_unique_customer_vehicle (a real unique constraint, not just an
 * app-level check) is the actual duplicate-favorite guard.
 */
export async function toggleFavoriteAction(vehicleId: string): Promise<ToggleFavoriteResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sign in to save favorites." };

  const { data: existing } = await supabase.from("favorites").select("id").eq("customer_id", user.id).eq("vehicle_id", vehicleId).maybeSingle();

  if (existing) {
    const { error } = await supabase.from("favorites").delete().eq("id", existing.id);
    if (error) {
      logger.error("Failed to remove favorite", error, { vehicleId, userId: user.id });
      return { error: "Failed to remove favorite." };
    }
    revalidatePath("/account");
    return { favorited: false };
  }

  const { error } = await supabase.from("favorites").insert({ customer_id: user.id, vehicle_id: vehicleId });
  if (error) {
    logger.error("Failed to add favorite", error, { vehicleId, userId: user.id });
    return { error: "Failed to add favorite." };
  }
  revalidatePath("/account");
  return { favorited: true };
}
