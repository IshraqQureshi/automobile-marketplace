"use server";

import { revalidatePath } from "next/cache";
import { logger } from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";
import { commissionFieldSchemas } from "./commission-schemas";

export interface CommissionActionResult {
  error?: string;
}

const NOT_FOUND_ERROR = "Not found, or you don't have permission to do that.";

/**
 * Records (or updates) the commission owed for one sold vehicle —
 * vehicle_id is unique on vehicle_commissions, so this is a real upsert:
 * an admin correcting a figure edits the same row rather than creating a
 * second one. Authorization is entirely RLS (vehicle_commissions_*_admin_only,
 * is_admin()) — this page already lives behind the ADMIN-only
 * /admin/(protected) layout guard, same "don't duplicate the role check"
 * reasoning as every other admin action in this codebase.
 */
export async function recordVehicleCommissionAction(formData: FormData): Promise<CommissionActionResult> {
  const vehicleId = formData.get("vehicleId");
  if (typeof vehicleId !== "string" || !vehicleId) return { error: "Missing vehicle id." };

  const amountParsed = commissionFieldSchemas.amount.safeParse(formData.get("amount"));
  const statusParsed = commissionFieldSchemas.status.safeParse(formData.get("status"));
  const notesParsed = commissionFieldSchemas.notes.safeParse(formData.get("notes") || undefined);
  if (!amountParsed.success) return { error: amountParsed.error.issues[0]?.message ?? "Invalid amount." };
  if (!statusParsed.success) return { error: statusParsed.error.issues[0]?.message ?? "Invalid status." };
  if (!notesParsed.success) return { error: notesParsed.error.issues[0]?.message ?? "Invalid notes." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: NOT_FOUND_ERROR };

  const { error } = await supabase.from("vehicle_commissions").upsert(
    {
      vehicle_id: vehicleId,
      amount: amountParsed.data,
      status: statusParsed.data,
      notes: notesParsed.data ?? null,
      recorded_by: user.id,
    },
    { onConflict: "vehicle_id" },
  );
  if (error) {
    logger.error("Failed to record vehicle commission", error, { vehicleId });
    return { error: "Failed to save commission." };
  }

  revalidatePath("/admin/vehicles");
  return {};
}
