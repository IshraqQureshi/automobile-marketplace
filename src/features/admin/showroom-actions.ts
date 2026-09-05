"use server";

import { revalidatePath } from "next/cache";
import { logger } from "@/lib/logger";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { adminShowroomSchema, ownerUserIdSchema } from "./showroom-schemas";

export interface ShowroomActionResult {
  error?: string;
}

// Admin-only: showrooms.status/verified changes are blocked for anyone but
// an admin by the prevent_showroom_self_approval trigger (see
// supabase/migrations/20260903203102_create_showroom_approval_guard.sql),
// and this page is already behind the ADMIN-only /admin/(protected) layout
// guard — same "don't duplicate the role check, just fail gracefully if
// the DB ever rejects it" reasoning as src/features/admin/catalog-actions.ts.
//
// Two distinct rejection paths can occur here, and both are handled below:
// the trigger raises a real error when a non-admin tries to change status/
// verified, while RLS's UPDATE USING clause silently filters out rows the
// caller isn't allowed to touch at all (0 rows affected, no error) — e.g. a
// non-owner customer targeting someone else's showroom. Every update below
// chains .select("id") and checks the result so the silent-filter case is
// also reported as a failure instead of a false "success".
const NOT_FOUND_ERROR = "Not found, or you don't have permission to do that.";

export async function approveShowroomAction(id: string): Promise<ShowroomActionResult> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("showrooms").update({ status: "APPROVED", verified: true }).eq("id", id).select("id");
  if (error) {
    logger.error("Failed to approve showroom", error, { id });
    return { error: "Failed to approve showroom." };
  }
  if (!data || data.length === 0) return { error: NOT_FOUND_ERROR };

  revalidatePath("/admin/showrooms");
  revalidatePath("/admin");
  return {};
}

export async function rejectShowroomAction(id: string): Promise<ShowroomActionResult> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("showrooms").update({ status: "REJECTED" }).eq("id", id).select("id");
  if (error) {
    logger.error("Failed to reject showroom", error, { id });
    return { error: "Failed to reject showroom." };
  }
  if (!data || data.length === 0) return { error: NOT_FOUND_ERROR };

  revalidatePath("/admin/showrooms");
  revalidatePath("/admin");
  return {};
}

export interface ShowroomDocumentUrlResult {
  url?: string;
  error?: string;
}

// A signed URL is generated on demand (not pre-fetched for every document
// up front) — it's short-lived and there's no reason to mint one for a
// document the admin never opens.
const SIGNED_URL_EXPIRY_SECONDS = 60;

export async function getShowroomDocumentUrlAction(storagePath: string): Promise<ShowroomDocumentUrlResult> {
  const supabase = await createClient();
  const { data, error } = await supabase.storage.from("showroom-documents").createSignedUrl(storagePath, SIGNED_URL_EXPIRY_SECONDS);
  if (error || !data) {
    logger.error("Failed to create a signed URL for a showroom document", error, { storagePath });
    return { error: "Failed to open document." };
  }
  return { url: data.signedUrl };
}

interface ShowroomFormFields {
  businessName: FormDataEntryValue | null;
  location: FormDataEntryValue | null;
  businessPhone: FormDataEntryValue | null;
  businessEmail: FormDataEntryValue | null;
  address: FormDataEntryValue | null;
  description: FormDataEntryValue | null;
}

function readShowroomFormFields(formData: FormData): ShowroomFormFields {
  return {
    businessName: formData.get("businessName"),
    location: formData.get("location"),
    businessPhone: formData.get("businessPhone"),
    businessEmail: formData.get("businessEmail"),
    address: formData.get("address"),
    description: formData.get("description"),
  };
}

// Admin-created/edited showrooms reuse the same INSERT/UPDATE RLS paths as
// self-registration/approval — the new showrooms_insert_admin policy (see
// supabase/migrations/20260905040000_add_showroom_admin_insert_policy.sql)
// is purely additive alongside showrooms_insert_own, so this doesn't touch
// the registration flow at all.
export async function createShowroomAction(formData: FormData): Promise<ShowroomActionResult> {
  const ownerParsed = ownerUserIdSchema.safeParse(formData.get("ownerUserId"));
  if (!ownerParsed.success) return { error: ownerParsed.error.issues[0]?.message ?? "Choose an owner." };

  const parsed = adminShowroomSchema.safeParse(readShowroomFormFields(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid showroom details." };

  const supabase = await createClient();
  const { error } = await supabase.from("showrooms").insert({
    owner_user_id: ownerParsed.data,
    business_name: parsed.data.businessName,
    city: parsed.data.location,
    phone: `+254${parsed.data.businessPhone}`,
    email: parsed.data.businessEmail,
    address: parsed.data.address ?? null,
    description: parsed.data.description ?? null,
  });
  if (error) {
    logger.error("Failed to create showroom", error);
    // showrooms_owner_user_id_active_unique — the chosen owner already has
    // an active (PENDING/APPROVED/SUSPENDED) showroom. searchShowroomOwnerCandidatesAction
    // already excludes such users from the picker, so this is a defensive
    // fallback for a race (e.g. two admins acting on the same user at once),
    // not the primary control.
    return { error: error.code === "23505" ? "This user already has an active showroom." : "Failed to create showroom." };
  }

  revalidatePath("/admin/showrooms");
  revalidatePath("/admin");
  return {};
}

// Business-detail edits only — status/verified are untouched here (and are
// blocked for a non-admin by prevent_showroom_self_approval regardless),
// kept as a separate action from approve/reject so each stays focused.
export async function updateShowroomAction(formData: FormData): Promise<ShowroomActionResult> {
  const id = formData.get("id");
  if (typeof id !== "string" || !id) return { error: "Missing showroom id." };

  const parsed = adminShowroomSchema.safeParse(readShowroomFormFields(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid showroom details." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("showrooms")
    .update({
      business_name: parsed.data.businessName,
      city: parsed.data.location,
      phone: `+254${parsed.data.businessPhone}`,
      email: parsed.data.businessEmail,
      address: parsed.data.address ?? null,
      description: parsed.data.description ?? null,
    })
    .eq("id", id)
    .select("id");
  if (error) {
    logger.error("Failed to update showroom", error, { id });
    return { error: "Failed to update showroom." };
  }
  if (!data || data.length === 0) return { error: NOT_FOUND_ERROR };

  revalidatePath("/admin/showrooms");
  revalidatePath("/admin");
  return {};
}

export async function deleteShowroomAction(id: string): Promise<ShowroomActionResult> {
  const supabase = await createClient();

  // showroom_documents rows cascade-delete with their parent showroom, but
  // the Storage objects they point at don't — collect the paths first so
  // they can be cleaned up after the row delete succeeds, same reasoning as
  // deleteBrandAction's logo cleanup.
  const { data: documents } = await supabase.from("showroom_documents").select("storage_path").eq("showroom_id", id);

  const { data, error } = await supabase.from("showrooms").delete().eq("id", id).select("id");
  if (error) {
    logger.error("Failed to delete showroom", error, { id });
    return { error: "Failed to delete showroom." };
  }
  if (!data || data.length === 0) return { error: NOT_FOUND_ERROR };

  const paths = (documents ?? []).map((doc) => doc.storage_path);
  if (paths.length > 0) {
    const { error: removeError } = await supabase.storage.from("showroom-documents").remove(paths);
    if (removeError) {
      logger.warn("Failed to remove a deleted showroom's document files", { id, paths, error: removeError.message });
    }
  }

  revalidatePath("/admin/showrooms");
  revalidatePath("/admin");
  return {};
}

export interface ShowroomOwnerCandidate {
  id: string;
  email: string;
  fullName: string;
}

// Small, single-page (in-memory filtered) user search backing the "assign
// an existing user as this showroom's owner" picker in the create dialog.
// profiles has no email column (only Supabase's own auth.users does), so
// this needs the service-role client — a plain RLS-scoped client can't see
// other users' emails at all. A single listUsers() page (200) matches this
// project's actual current scale; a real search index is only worth
// building if the user base grows past that.
const OWNER_SEARCH_MIN_QUERY_LENGTH = 2;
const OWNER_SEARCH_RESULT_LIMIT = 8;
const OWNER_SEARCH_PAGE_SIZE = 200;

export async function searchShowroomOwnerCandidatesAction(query: string): Promise<{ users: ShowroomOwnerCandidate[] }> {
  const trimmed = query.trim().toLowerCase();
  if (trimmed.length < OWNER_SEARCH_MIN_QUERY_LENGTH) return { users: [] };

  const admin = createAdminClient();
  const [usersResult, activeShowroomsResult] = await Promise.all([
    admin.auth.admin.listUsers({ page: 1, perPage: OWNER_SEARCH_PAGE_SIZE }),
    admin.from("showrooms").select("owner_user_id").in("status", ["PENDING", "APPROVED", "SUSPENDED"]),
  ]);
  if (usersResult.error || activeShowroomsResult.error) {
    logger.error("Failed to search showroom owner candidates", usersResult.error ?? activeShowroomsResult.error);
    return { users: [] };
  }

  const matching = usersResult.data.users.filter((user) => user.email?.toLowerCase().includes(trimmed));
  if (matching.length === 0) return { users: [] };

  const { data: profiles, error: profilesError } = await admin
    .from("profiles")
    .select("id, full_name, role")
    .in(
      "id",
      matching.map((user) => user.id),
    );
  if (profilesError) {
    logger.error("Failed to load profiles for showroom owner candidates", profilesError);
    return { users: [] };
  }

  const activeOwnerIds = new Set(activeShowroomsResult.data.map((showroom) => showroom.owner_user_id));
  const profileById = new Map(profiles.map((profile) => [profile.id, profile]));

  return {
    users: matching
      .filter((user) => {
        const profile = profileById.get(user.id);
        return profile !== undefined && profile.role !== "ADMIN" && !activeOwnerIds.has(user.id);
      })
      .slice(0, OWNER_SEARCH_RESULT_LIMIT)
      .map((user) => ({
        id: user.id,
        email: user.email ?? "",
        fullName: profileById.get(user.id)?.full_name || "",
      })),
  };
}
