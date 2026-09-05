"use server";

import { revalidatePath } from "next/cache";
import { logger } from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";
import { uploadEntityLogo, validateLogoFile } from "./logo-upload";
import { catalogNameSchema } from "./catalog-schemas";

export interface CatalogActionResult {
  error?: string;
}

// Admin-only writes are enforced by RLS (brands/models/vehicle_types insert/
// update/delete policies require public.is_admin() — see
// supabase/migrations/20260905010001_create_catalog_rls_policies.sql,
// verified by src/lib/supabase/catalog-rls.integration.test.ts), and the
// page these actions are called from is already behind the ADMIN-only
// /admin/(protected) layout guard. These actions don't duplicate the role
// check — they just need to fail gracefully, not silently, if RLS ever
// does reject a call.
//
// Unlike insert (which raises a real error when its WITH CHECK fails),
// update/delete's USING clause silently filters out rows the caller isn't
// allowed to touch — an RLS-blocked or already-deleted row just affects 0
// rows with no error. Every update/delete below chains .select("id") and
// checks the result so that case is reported as a failure instead of a
// false "success".
const NOT_FOUND_ERROR = "Not found, or you don't have permission to do that.";

export async function createBrandAction(formData: FormData): Promise<CatalogActionResult> {
  const parsed = catalogNameSchema.safeParse(formData.get("name"));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid name" };

  const logoEntry = formData.get("logo");
  const logoFile = logoEntry instanceof File && logoEntry.size > 0 ? logoEntry : null;
  if (logoFile) {
    const logoError = validateLogoFile(logoFile);
    if (logoError) return { error: logoError };
  }

  const supabase = await createClient();
  const { data: brand, error } = await supabase.from("brands").insert({ name: parsed.data }).select("id").single();
  if (error || !brand) {
    logger.error("Failed to create brand", error);
    return { error: error?.code === "23505" ? "A brand with this name already exists." : "Failed to create brand." };
  }

  if (logoFile) {
    const { error: logoError } = await uploadEntityLogo(supabase, "brand-logos", "brands", brand.id, logoFile);
    if (logoError) {
      logger.error("Failed to upload brand logo", logoError, { brandId: brand.id });
      revalidatePath("/admin/catalog");
      return { error: "Brand created, but the logo failed to upload. Edit the brand to try again." };
    }
  }

  revalidatePath("/admin/catalog");
  return {};
}

export async function updateBrandAction(formData: FormData): Promise<CatalogActionResult> {
  const id = formData.get("id");
  if (typeof id !== "string" || !id) return { error: "Missing brand id." };

  const parsed = catalogNameSchema.safeParse(formData.get("name"));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid name" };

  const logoEntry = formData.get("logo");
  const logoFile = logoEntry instanceof File && logoEntry.size > 0 ? logoEntry : null;
  const removeLogo = formData.get("removeLogo") === "true";
  if (logoFile) {
    const logoError = validateLogoFile(logoFile);
    if (logoError) return { error: logoError };
  }

  const supabase = await createClient();

  let previousLogoPath: string | null = null;
  if (logoFile || removeLogo) {
    const { data: existing } = await supabase.from("brands").select("logo_storage_path").eq("id", id).maybeSingle();
    previousLogoPath = existing?.logo_storage_path ?? null;
  }

  const { data, error } = await supabase
    .from("brands")
    .update({ name: parsed.data, ...(removeLogo && !logoFile ? { logo_storage_path: null } : {}) })
    .eq("id", id)
    .select("id");
  if (error) {
    logger.error("Failed to update brand", error, { id });
    return { error: error.code === "23505" ? "A brand with this name already exists." : "Failed to update brand." };
  }
  if (!data || data.length === 0) return { error: NOT_FOUND_ERROR };

  if (logoFile) {
    const { error: logoError } = await uploadEntityLogo(supabase, "brand-logos", "brands", id, logoFile);
    if (logoError) {
      logger.error("Failed to upload brand logo", logoError, { brandId: id });
      revalidatePath("/admin/catalog");
      return { error: "Name updated, but the new logo failed to upload. Try again." };
    }
  }

  if ((logoFile || removeLogo) && previousLogoPath) {
    const { error: removeError } = await supabase.storage.from("brand-logos").remove([previousLogoPath]);
    if (removeError) {
      logger.warn("Failed to remove a brand's previous logo file", { brandId: id, previousLogoPath, error: removeError.message });
    }
  }

  revalidatePath("/admin/catalog");
  return {};
}

export async function deleteBrandAction(id: string): Promise<CatalogActionResult> {
  const supabase = await createClient();

  const { data: existing } = await supabase.from("brands").select("logo_storage_path").eq("id", id).maybeSingle();

  const { data, error } = await supabase.from("brands").delete().eq("id", id).select("id");
  if (error) {
    logger.error("Failed to delete brand", error, { id });
    return { error: "Failed to delete brand." };
  }
  if (!data || data.length === 0) return { error: NOT_FOUND_ERROR };

  if (existing?.logo_storage_path) {
    const { error: removeError } = await supabase.storage.from("brand-logos").remove([existing.logo_storage_path]);
    if (removeError) {
      logger.warn("Failed to remove a deleted brand's logo file", { brandId: id, path: existing.logo_storage_path, error: removeError.message });
    }
  }

  revalidatePath("/admin/catalog");
  return {};
}

export async function createModelAction(brandId: string, name: string): Promise<CatalogActionResult> {
  const parsed = catalogNameSchema.safeParse(name);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid name" };
  if (!brandId) return { error: "Choose a brand." };

  const supabase = await createClient();
  const { error } = await supabase.from("models").insert({ brand_id: brandId, name: parsed.data });
  if (error) {
    logger.error("Failed to create model", error, { brandId });
    return { error: error.code === "23505" ? "This brand already has a model with this name." : "Failed to create model." };
  }

  revalidatePath("/admin/catalog");
  return {};
}

export async function updateModelAction(id: string, name: string, brandId: string): Promise<CatalogActionResult> {
  const parsed = catalogNameSchema.safeParse(name);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid name" };
  if (!brandId) return { error: "Choose a brand." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("models")
    .update({ name: parsed.data, brand_id: brandId })
    .eq("id", id)
    .select("id");
  if (error) {
    logger.error("Failed to update model", error, { id });
    return { error: error.code === "23505" ? "This brand already has a model with this name." : "Failed to update model." };
  }
  if (!data || data.length === 0) return { error: NOT_FOUND_ERROR };

  revalidatePath("/admin/catalog");
  return {};
}

export async function deleteModelAction(id: string): Promise<CatalogActionResult> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("models").delete().eq("id", id).select("id");
  if (error) {
    logger.error("Failed to delete model", error, { id });
    return { error: "Failed to delete model." };
  }
  if (!data || data.length === 0) return { error: NOT_FOUND_ERROR };

  revalidatePath("/admin/catalog");
  return {};
}

export async function createVehicleTypeAction(name: string): Promise<CatalogActionResult> {
  const parsed = catalogNameSchema.safeParse(name);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid name" };

  const supabase = await createClient();
  const { error } = await supabase.from("vehicle_types").insert({ name: parsed.data });
  if (error) {
    logger.error("Failed to create vehicle type", error);
    return { error: error.code === "23505" ? "A type with this name already exists." : "Failed to create type." };
  }

  revalidatePath("/admin/catalog");
  return {};
}

export async function updateVehicleTypeAction(id: string, name: string): Promise<CatalogActionResult> {
  const parsed = catalogNameSchema.safeParse(name);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid name" };

  const supabase = await createClient();
  const { data, error } = await supabase.from("vehicle_types").update({ name: parsed.data }).eq("id", id).select("id");
  if (error) {
    logger.error("Failed to update vehicle type", error, { id });
    return { error: error.code === "23505" ? "A type with this name already exists." : "Failed to update type." };
  }
  if (!data || data.length === 0) return { error: NOT_FOUND_ERROR };

  revalidatePath("/admin/catalog");
  return {};
}

export async function deleteVehicleTypeAction(id: string): Promise<CatalogActionResult> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("vehicle_types").delete().eq("id", id).select("id");
  if (error) {
    logger.error("Failed to delete vehicle type", error, { id });
    return { error: "Failed to delete type." };
  }
  if (!data || data.length === 0) return { error: NOT_FOUND_ERROR };

  revalidatePath("/admin/catalog");
  return {};
}
