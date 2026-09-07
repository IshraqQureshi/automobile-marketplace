"use server";

import { revalidatePath } from "next/cache";
import { logger } from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";
import { availabilityFieldSchemas } from "./schemas";

export interface DayAvailabilityInput {
  dayOfWeek: number;
  isAvailable: boolean;
  startTime: string;
  endTime: string;
}

export interface AvailabilityActionResult {
  error?: string;
}

const TIME_REGEX = /^\d{2}:\d{2}$/;

/**
 * Replaces a showroom's entire weekly availability config in one save
 * (full-replace, not a per-day diff — simplest correct approach for a
 * 7-row config a showroom owner edits as one form) plus the flat
 * slot-duration/buffer-time settings on `showrooms` itself. Authorization
 * is enforced entirely by RLS (showroom_availability_*_owner_or_admin,
 * showrooms_update_owner_or_admin) — the caller-supplied showroomId is
 * never trusted beyond what those policies allow.
 */
export async function updateShowroomAvailabilityAction(showroomId: string, formData: FormData): Promise<AvailabilityActionResult> {
  const slotDurationResult = availabilityFieldSchemas.slotDurationMinutes.safeParse(formData.get("slotDurationMinutes"));
  if (!slotDurationResult.success) return { error: slotDurationResult.error.issues[0]?.message ?? "Enter a valid slot length." };
  const bufferResult = availabilityFieldSchemas.bufferMinutes.safeParse(formData.get("bufferMinutes"));
  if (!bufferResult.success) return { error: bufferResult.error.issues[0]?.message ?? "Enter a valid buffer time." };

  let days: DayAvailabilityInput[];
  try {
    days = JSON.parse(String(formData.get("days") ?? "[]"));
  } catch {
    return { error: "Invalid availability data." };
  }
  if (!Array.isArray(days)) return { error: "Invalid availability data." };

  const activeDays = days.filter((day) => day.isAvailable);
  for (const day of activeDays) {
    if (typeof day.dayOfWeek !== "number" || day.dayOfWeek < 0 || day.dayOfWeek > 6) {
      return { error: "Invalid day selected." };
    }
    if (!TIME_REGEX.test(day.startTime) || !TIME_REGEX.test(day.endTime)) {
      return { error: "Enter valid opening and closing times for every open day." };
    }
    if (day.startTime >= day.endTime) {
      return { error: "Closing time must be after opening time for every open day." };
    }
  }

  const supabase = await createClient();

  const { data: showroomUpdateData, error: showroomError } = await supabase
    .from("showrooms")
    .update({ slot_duration_minutes: slotDurationResult.data, buffer_minutes: bufferResult.data })
    .eq("id", showroomId)
    .select("id");
  if (showroomError) {
    logger.error("Failed to update showroom slot/buffer settings", showroomError, { showroomId });
    return { error: "Failed to save settings." };
  }
  if (!showroomUpdateData || showroomUpdateData.length === 0) {
    return { error: "Not found, or you don't have permission to do that." };
  }

  const { error: deleteError } = await supabase.from("showroom_availability").delete().eq("showroom_id", showroomId);
  if (deleteError) {
    logger.error("Failed to clear existing showroom availability", deleteError, { showroomId });
    return { error: "Failed to save availability." };
  }

  if (activeDays.length > 0) {
    const { error: insertError } = await supabase.from("showroom_availability").insert(
      activeDays.map((day) => ({
        showroom_id: showroomId,
        day_of_week: day.dayOfWeek,
        start_time: day.startTime,
        end_time: day.endTime,
        is_available: true,
      })),
    );
    if (insertError) {
      logger.error("Failed to save new showroom availability", insertError, { showroomId });
      return { error: "Failed to save availability." };
    }
  }

  revalidatePath("/dashboard/appointments");
  return {};
}
