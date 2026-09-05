"use server";

import { revalidatePath } from "next/cache";
import { logger } from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";
import { getOwnerShowroom } from "@/features/showroom/my-showroom";
import { uploadVehicleMedia, validateVehicleImageFile } from "./media-upload";
import { ownerVehicleStatusSchema, vehicleSchema } from "./schemas";

export interface VehicleActionResult {
  error?: string;
}

export interface CreateVehicleActionResult extends VehicleActionResult {
  id?: string;
}

// Ownership is enforced by RLS on every read/write below (vehicles_*_owner_*
// and vehicle_media_*_owner_* policies — see
// supabase/migrations/20260903203104_create_rls_policies.sql), using a
// plain RLS-scoped client, never the service-role client. Update/delete's
// USING clause silently filters out rows the caller doesn't own (0 rows
// affected, no error) rather than raising — every mutation below chains
// .select("id") and checks the result, same convention as
// src/features/admin/catalog-actions.ts.
const NOT_FOUND_ERROR = "Not found, or you don't have permission to do that.";
const NO_SHOWROOM_ERROR = "No showroom found for your account.";

function readVehicleFormData(formData: FormData) {
  const installmentEnabled = String(formData.get("installmentEnabled") ?? "");
  // The Financing section (and its own validation errors) is only rendered
  // in the UI while "Available on installment" is checked — a value left
  // over from before the owner unchecked it must not block saving, or the
  // server would reject a submission the user has no visible field left to
  // fix (confirmed live: an invalid financing value + installment
  // unchecked silently failed to save before this blanking was added).
  const financingFieldsActive = installmentEnabled === "true";

  return {
    title: String(formData.get("title") ?? ""),
    make: String(formData.get("make") ?? ""),
    model: String(formData.get("model") ?? ""),
    variant: String(formData.get("variant") ?? ""),
    year: String(formData.get("year") ?? ""),
    price: String(formData.get("price") ?? ""),
    mileage: String(formData.get("mileage") ?? ""),
    fuelType: String(formData.get("fuelType") ?? ""),
    transmission: String(formData.get("transmission") ?? ""),
    bodyType: String(formData.get("bodyType") ?? ""),
    color: String(formData.get("color") ?? ""),
    description: String(formData.get("description") ?? ""),
    engine: String(formData.get("engine") ?? ""),
    interior: String(formData.get("interior") ?? ""),
    doors: String(formData.get("doors") ?? ""),
    seats: String(formData.get("seats") ?? ""),
    countryOfOrigin: String(formData.get("countryOfOrigin") ?? ""),
    installmentEnabled,
    bankFinanceEnabled: String(formData.get("bankFinanceEnabled") ?? ""),
    financingDownPaymentType: String(formData.get("financingDownPaymentType") ?? "PERCENT"),
    financingDownPaymentPercent: financingFieldsActive ? String(formData.get("financingDownPaymentPercent") ?? "") : "",
    financingDownPaymentAmount: financingFieldsActive ? String(formData.get("financingDownPaymentAmount") ?? "") : "",
    financingInterestRate: financingFieldsActive ? String(formData.get("financingInterestRate") ?? "") : "",
    financingInsurancePercent: financingFieldsActive ? String(formData.get("financingInsurancePercent") ?? "") : "",
    financingPartner: financingFieldsActive ? String(formData.get("financingPartner") ?? "") : "",
    financingTenureMonths: financingFieldsActive ? formData.getAll("financingTenureMonths").map(String) : [],
    financingTracker1YearPrice: financingFieldsActive ? String(formData.get("financingTracker1YearPrice") ?? "") : "",
    financingTracker2YearPrice: financingFieldsActive ? String(formData.get("financingTracker2YearPrice") ?? "") : "",
  };
}

function vehicleRowFromParsed(parsed: ReturnType<typeof vehicleSchema.parse>) {
  return {
    title: parsed.title,
    make: parsed.make,
    model: parsed.model,
    variant: parsed.variant ?? null,
    year: parsed.year,
    price: parsed.price,
    mileage: parsed.mileage ?? null,
    fuel_type: parsed.fuelType ?? null,
    transmission: parsed.transmission ?? null,
    body_type: parsed.bodyType ?? null,
    color: parsed.color ?? null,
    description: parsed.description ?? null,
    engine: parsed.engine ?? null,
    interior: parsed.interior ?? null,
    doors: parsed.doors ?? null,
    seats: parsed.seats ?? null,
    country_of_origin: parsed.countryOfOrigin ?? null,
    installment_enabled: parsed.installmentEnabled,
    bank_finance_enabled: parsed.bankFinanceEnabled,
    financing_down_payment_type: parsed.financingDownPaymentType,
    financing_down_payment_percent: parsed.financingDownPaymentPercent ?? null,
    financing_down_payment_amount: parsed.financingDownPaymentAmount ?? null,
    financing_interest_rate: parsed.financingInterestRate ?? null,
    financing_insurance_percent: parsed.financingInsurancePercent ?? null,
    financing_partner: parsed.financingPartner ?? null,
    financing_tenure_options_months: parsed.financingTenureMonths ?? null,
    financing_tracker_options: parsed.financingTrackerOptions ?? null,
  };
}

export async function createVehicleAction(formData: FormData): Promise<CreateVehicleActionResult> {
  const parsed = vehicleSchema.safeParse(readVehicleFormData(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid vehicle details" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You must be signed in." };

  const showroom = await getOwnerShowroom(user.id);
  if (!showroom) return { error: NO_SHOWROOM_ERROR };

  const { data, error } = await supabase
    .from("vehicles")
    .insert({ showroom_id: showroom.id, status: "DRAFT", ...vehicleRowFromParsed(parsed.data) })
    .select("id")
    .single();
  if (error || !data) {
    logger.error("Failed to create vehicle", error, { showroomId: showroom.id });
    return { error: "Failed to create vehicle." };
  }

  revalidatePath("/dashboard/vehicles");
  return { id: data.id };
}

export async function updateVehicleAction(id: string, formData: FormData): Promise<VehicleActionResult> {
  const parsed = vehicleSchema.safeParse(readVehicleFormData(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid vehicle details" };

  const supabase = await createClient();
  const { data, error } = await supabase.from("vehicles").update(vehicleRowFromParsed(parsed.data)).eq("id", id).select("id");
  if (error) {
    logger.error("Failed to update vehicle", error, { id });
    return { error: "Failed to update vehicle." };
  }
  if (!data || data.length === 0) return { error: NOT_FOUND_ERROR };

  revalidatePath("/dashboard/vehicles");
  revalidatePath(`/dashboard/vehicles/${id}/edit`);
  return {};
}

/**
 * Owner-facing status changes only (publish/unpublish/mark sold/remove) —
 * PENDING_REVIEW and REJECTED are reserved for the Day 4 admin moderation
 * flow (ADM-004), which doesn't exist yet. Publishing (setting ACTIVE) is
 * additionally gated on the owning showroom being APPROVED: RLS doesn't
 * enforce this at write time (only at public SELECT time, per
 * vehicles_select_public_or_owner_or_admin), and the /dashboard/vehicles
 * page itself is already gated to APPROVED showrooms — but this action can
 * be called directly, so it re-checks rather than relying solely on the UI
 * being unreachable.
 */
export async function updateVehicleStatusAction(id: string, status: string): Promise<VehicleActionResult> {
  const parsedStatus = ownerVehicleStatusSchema.safeParse(status);
  if (!parsedStatus.success) return { error: "Invalid status." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You must be signed in." };

  if (parsedStatus.data === "ACTIVE") {
    const showroom = await getOwnerShowroom(user.id);
    if (!showroom) return { error: NO_SHOWROOM_ERROR };
    if (showroom.status !== "APPROVED") {
      return { error: "Your showroom must be approved before you can publish a listing." };
    }
  }

  const { data, error } = await supabase.from("vehicles").update({ status: parsedStatus.data }).eq("id", id).select("id");
  if (error) {
    logger.error("Failed to update vehicle status", error, { id, status: parsedStatus.data });
    return { error: "Failed to update vehicle status." };
  }
  if (!data || data.length === 0) return { error: NOT_FOUND_ERROR };

  revalidatePath("/dashboard/vehicles");
  return {};
}

export async function uploadVehiclePhotosAction(vehicleId: string, formData: FormData): Promise<VehicleActionResult> {
  const files = formData.getAll("photos").filter((entry): entry is File => entry instanceof File && entry.size > 0);
  if (files.length === 0) return { error: "Choose at least one photo." };
  for (const file of files) {
    const fileError = validateVehicleImageFile(file);
    if (fileError) return { error: fileError };
  }

  const supabase = await createClient();

  // RLS-scoped select: returns the row only if this user owns the vehicle's
  // showroom (or the vehicle doesn't exist) — either way, no row means
  // NOT_FOUND, never a silent write to someone else's vehicle.
  const { data: vehicle } = await supabase.from("vehicles").select("id, showroom_id").eq("id", vehicleId).maybeSingle();
  if (!vehicle) return { error: NOT_FOUND_ERROR };

  const { count } = await supabase
    .from("vehicle_media")
    .select("id", { count: "exact", head: true })
    .eq("vehicle_id", vehicleId);

  const { failedUploads } = await uploadVehicleMedia(supabase, vehicle.showroom_id, vehicleId, files, count ?? 0);

  revalidatePath("/dashboard/vehicles");
  if (failedUploads.length > 0) {
    return { error: `Failed to upload: ${failedUploads.join(", ")}` };
  }
  return {};
}

export async function setPrimaryVehiclePhotoAction(mediaId: string): Promise<VehicleActionResult> {
  const supabase = await createClient();

  const { data: media } = await supabase.from("vehicle_media").select("id, vehicle_id").eq("id", mediaId).maybeSingle();
  if (!media) return { error: NOT_FOUND_ERROR };

  const { error: clearError } = await supabase
    .from("vehicle_media")
    .update({ is_primary: false })
    .eq("vehicle_id", media.vehicle_id)
    .eq("is_primary", true);
  if (clearError) {
    logger.error("Failed to clear previous primary vehicle photo", clearError, { vehicleId: media.vehicle_id });
    return { error: "Failed to update primary photo." };
  }

  const { data, error } = await supabase.from("vehicle_media").update({ is_primary: true }).eq("id", mediaId).select("id");
  if (error) {
    logger.error("Failed to set primary vehicle photo", error, { mediaId });
    return { error: "Failed to update primary photo." };
  }
  if (!data || data.length === 0) return { error: NOT_FOUND_ERROR };

  revalidatePath("/dashboard/vehicles");
  return {};
}

export async function deleteVehiclePhotoAction(mediaId: string): Promise<VehicleActionResult> {
  const supabase = await createClient();

  const { data: media } = await supabase
    .from("vehicle_media")
    .select("id, vehicle_id, storage_path, is_primary")
    .eq("id", mediaId)
    .maybeSingle();
  if (!media) return { error: NOT_FOUND_ERROR };

  const { data, error } = await supabase.from("vehicle_media").delete().eq("id", mediaId).select("id");
  if (error) {
    logger.error("Failed to delete vehicle photo", error, { mediaId });
    return { error: "Failed to delete photo." };
  }
  if (!data || data.length === 0) return { error: NOT_FOUND_ERROR };

  const { error: removeError } = await supabase.storage.from("vehicle-media").remove([media.storage_path]);
  if (removeError) {
    logger.warn("Failed to remove a deleted vehicle photo's storage file", { mediaId, path: media.storage_path, error: removeError.message });
  }

  // Deleting a vehicle's only/primary photo would otherwise leave it with
  // no primary image at all — promote the next-lowest sort_order photo
  // (if any remain) so the listing still has a thumbnail.
  if (media.is_primary) {
    const { data: next } = await supabase
      .from("vehicle_media")
      .select("id")
      .eq("vehicle_id", media.vehicle_id)
      .order("sort_order", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (next) {
      await supabase.from("vehicle_media").update({ is_primary: true }).eq("id", next.id);
    }
  }

  revalidatePath("/dashboard/vehicles");
  return {};
}
