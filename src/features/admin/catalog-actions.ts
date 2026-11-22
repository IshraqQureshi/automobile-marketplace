"use server";

import { revalidatePath } from "next/cache";
import { logger } from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";
import { uploadEntityLogo, validateLogoFile } from "./logo-upload";
import { catalogNameSchema } from "./catalog-schemas";
import { MAX_BULK_ROWS, type CatalogBulkKind, type CatalogBulkRow } from "./catalog-bulk";

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

export interface BulkImportResult {
  error?: string;
  added: number;
  skippedDuplicates: number;
  // Rows that failed server-side validation (e.g. a model whose brand doesn't exist).
  rejected: { name: string; brand?: string; reason: string }[];
}

const emptyBulk = (error: string): BulkImportResult => ({ error, added: 0, skippedDuplicates: 0, rejected: [] });

/**
 * Bulk-adds brands, models or types. The client already parsed the CSV, but
 * nothing from it is trusted: every row is re-validated here, rows that
 * already exist (compared case-insensitively, so "toyota" never sits next to
 * "Toyota") are skipped instead of failing the whole upload, and the insert
 * uses ON CONFLICT DO NOTHING as a last guard against a concurrent upload.
 * Admin-only writes are still enforced by RLS, same as the single-row actions.
 */
export async function bulkImportCatalogAction(kind: CatalogBulkKind, rows: CatalogBulkRow[]): Promise<BulkImportResult> {
  if (kind !== "brands" && kind !== "models" && kind !== "types") return emptyBulk("Unknown catalog type.");
  if (!Array.isArray(rows) || rows.length === 0) return emptyBulk("No rows to import.");
  if (rows.length > MAX_BULK_ROWS) return emptyBulk(`Too many rows — upload at most ${MAX_BULK_ROWS} at a time.`);

  const supabase = await createClient();
  const rejected: BulkImportResult["rejected"] = [];

  // Re-validate + dedupe within the payload.
  const valid: CatalogBulkRow[] = [];
  const seen = new Set<string>();
  for (const row of rows) {
    const name = catalogNameSchema.safeParse(row?.name);
    const brand = kind === "models" ? catalogNameSchema.safeParse(row?.brand) : null;
    if (!name.success || (brand && !brand.success)) {
      rejected.push({ name: String(row?.name ?? ""), brand: row?.brand, reason: "Invalid name or brand." });
      continue;
    }
    const key = `${brand?.data.toLowerCase() ?? ""}\u0000${name.data.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    valid.push(kind === "models" ? { brand: brand!.data, name: name.data } : { name: name.data });
  }

  let added = 0;
  let skippedDuplicates = 0;

  if (kind === "models") {
    const [{ data: brands, error: brandsError }, { data: models, error: modelsError }] = await Promise.all([
      supabase.from("brands").select("id, name"),
      supabase.from("models").select("brand_id, name"),
    ]);
    if (brandsError || modelsError) {
      logger.error("Bulk import: failed to load catalog", brandsError ?? modelsError);
      return emptyBulk("Failed to read the existing catalog.");
    }
    const brandIdByName = new Map((brands ?? []).map((b) => [b.name.toLowerCase(), b.id]));
    const existing = new Set((models ?? []).map((m) => `${m.brand_id}\u0000${m.name.toLowerCase()}`));

    const toInsert: { brand_id: string; name: string }[] = [];
    for (const row of valid) {
      const brandId = brandIdByName.get(row.brand!.toLowerCase());
      if (!brandId) {
        rejected.push({ name: row.name, brand: row.brand, reason: `Brand "${row.brand}" doesn't exist — add it first.` });
        continue;
      }
      if (existing.has(`${brandId}\u0000${row.name.toLowerCase()}`)) {
        skippedDuplicates++;
        continue;
      }
      toInsert.push({ brand_id: brandId, name: row.name });
    }
    if (toInsert.length > 0) {
      const { data, error } = await supabase
        .from("models")
        .upsert(toInsert, { onConflict: "brand_id,name", ignoreDuplicates: true })
        .select("id");
      if (error) {
        logger.error("Bulk import: failed to insert models", error);
        return emptyBulk("Failed to import models.");
      }
      added = data?.length ?? 0;
      skippedDuplicates += toInsert.length - added;
    }
  } else {
    const table = kind === "brands" ? "brands" : "vehicle_types";
    const { data: existingRows, error: readError } = await supabase.from(table).select("name");
    if (readError) {
      logger.error(`Bulk import: failed to load ${table}`, readError);
      return emptyBulk("Failed to read the existing catalog.");
    }
    const existing = new Set((existingRows ?? []).map((r) => r.name.toLowerCase()));
    const toInsert = valid.filter((row) => !existing.has(row.name.toLowerCase())).map((row) => ({ name: row.name }));
    skippedDuplicates = valid.length - toInsert.length;
    if (toInsert.length > 0) {
      const { data, error } = await supabase.from(table).upsert(toInsert, { onConflict: "name", ignoreDuplicates: true }).select("id");
      if (error) {
        logger.error(`Bulk import: failed to insert ${table}`, error);
        return emptyBulk(`Failed to import ${kind}.`);
      }
      added = data?.length ?? 0;
      skippedDuplicates += toInsert.length - added;
    }
  }

  revalidatePath("/admin/catalog");
  return { added, skippedDuplicates, rejected };
}
