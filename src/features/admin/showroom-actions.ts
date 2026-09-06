"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { logger } from "@/lib/logger";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { uploadShowroomDocuments } from "@/features/showroom/document-upload";
import { readShowroomProfileFormFields, updateShowroomProfile } from "@/features/showroom/profile";
import {
  ALLOWED_DOCUMENT_MIME_TYPES,
  BUSINESS_REGISTRATION_DOCUMENT_TYPE,
  MAX_DOCUMENTS_PER_SUBMISSION,
  MAX_DOCUMENT_SIZE_BYTES,
} from "@/features/showroom/schemas";
import { uploadEntityLogo, validateLogoFile } from "./logo-upload";
import { adminShowroomSchema, newOwnerSchema, ownerUserIdSchema } from "./showroom-schemas";

export interface ShowroomActionResult {
  error?: string;
  warning?: string;
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

// Shared by every action below that needs the service-role client (bypasses
// RLS entirely) — unlike the RLS-scoped createClient(), nothing stops a
// non-admin from invoking a Server Action directly, so those actions must
// check this explicitly instead of relying on RLS the way the rest of this
// file's actions safely do. See PR #21's code review finding on
// searchShowroomOwnerCandidatesAction for why this can't be skipped.
async function assertCallerIsAdmin(): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user: caller },
  } = await supabase.auth.getUser();
  if (!caller) return false;
  const { data: callerProfile } = await supabase.from("profiles").select("role").eq("id", caller.id).maybeSingle();
  return callerProfile?.role === "ADMIN";
}

function readDocumentFiles(formData: FormData): File[] {
  return formData.getAll("documents").filter((entry): entry is File => entry instanceof File && entry.size > 0);
}

function validateDocumentFiles(documents: File[]): string | null {
  if (documents.length > MAX_DOCUMENTS_PER_SUBMISSION) return `Upload at most ${MAX_DOCUMENTS_PER_SUBMISSION} documents.`;
  for (const file of documents) {
    if (!ALLOWED_DOCUMENT_MIME_TYPES.includes(file.type as (typeof ALLOWED_DOCUMENT_MIME_TYPES)[number])) {
      return `"${file.name}" must be a PDF, JPG, or PNG file.`;
    }
    if (file.size > MAX_DOCUMENT_SIZE_BYTES) return `"${file.name}" is larger than 10MB.`;
  }
  return null;
}

// Creates a brand-new user account for a showroom being registered on their
// behalf, via Supabase's real invite flow (a branded email with a link to
// set their own password — see supabase/templates/invite.html) rather than
// generating and emailing a plaintext password, which the invite flow makes
// unnecessary and which is poor practice regardless. Requires an explicit
// admin check (see assertCallerIsAdmin) since it needs the service-role
// client to create the auth user.
async function inviteNewShowroomOwner(formData: FormData): Promise<{ error?: string; ownerId?: string }> {
  const parsed = newOwnerSchema.safeParse({
    ownerFullName: formData.get("ownerFullName"),
    ownerEmail: formData.get("ownerEmail"),
    ownerPhone: formData.get("ownerPhone") ?? "",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid owner details." };

  if (!(await assertCallerIsAdmin())) return { error: "You must be signed in as an admin to do that." };

  const origin = (await headers()).get("origin");
  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.inviteUserByEmail(parsed.data.ownerEmail, {
    data: {
      full_name: parsed.data.ownerFullName,
      ...(parsed.data.ownerPhone ? { phone: `+254${parsed.data.ownerPhone}` } : {}),
    },
    // Not /auth/callback — see src/app/auth/invite-callback/page.tsx's
    // header comment for why an admin-triggered invite can't use the same
    // PKCE `?code=` handling every other auth email link in this app uses.
    redirectTo: `${origin}/auth/invite-callback`,
  });
  if (error || !data.user) {
    logger.error("Failed to invite a new showroom owner", error);
    return {
      error:
        error?.code === "email_exists"
          ? "A user with this email already exists — search for them as an existing owner instead."
          : "Failed to invite the new owner. Please try again.",
    };
  }

  return { ownerId: data.user.id };
}

// Admin-created/edited showrooms reuse the same INSERT/UPDATE RLS paths as
// self-registration/approval — the new showrooms_insert_admin policy (see
// supabase/migrations/20260905040000_add_showroom_admin_insert_policy.sql)
// is purely additive alongside showrooms_insert_own, so this doesn't touch
// the registration flow at all.
//
// ownerMode chooses between an existing user (ownerUserId, searched via
// searchShowroomOwnerCandidatesAction) and a brand-new one, invited on the
// spot (inviteNewShowroomOwner). Business-field validation runs first, and
// a new owner account is only created after that passes — minimizing (not
// eliminating; the showroom insert itself could still fail afterward) the
// window for a dangling invited-but-showroom-less account.
export async function createShowroomAction(formData: FormData): Promise<ShowroomActionResult> {
  const parsed = adminShowroomSchema.safeParse(readShowroomProfileFormFields(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid showroom details." };

  const documents = readDocumentFiles(formData);
  const documentsError = validateDocumentFiles(documents);
  if (documentsError) return { error: documentsError };

  const logoEntry = formData.get("logo");
  const logoFile = logoEntry instanceof File && logoEntry.size > 0 ? logoEntry : null;
  if (logoFile) {
    const logoError = validateLogoFile(logoFile);
    if (logoError) return { error: logoError };
  }

  const isNewOwner = formData.get("ownerMode") === "new";
  let ownerId: string;
  if (isNewOwner) {
    const invited = await inviteNewShowroomOwner(formData);
    if (invited.error || !invited.ownerId) return { error: invited.error ?? "Failed to invite the new owner." };
    ownerId = invited.ownerId;
  } else {
    const ownerParsed = ownerUserIdSchema.safeParse(formData.get("ownerUserId"));
    if (!ownerParsed.success) return { error: ownerParsed.error.issues[0]?.message ?? "Choose an owner." };
    ownerId = ownerParsed.data;
  }

  const supabase = await createClient();
  const {
    data: { user: caller },
  } = await supabase.auth.getUser();

  const { data: showroom, error } = await supabase
    .from("showrooms")
    .insert({
      owner_user_id: ownerId,
      business_name: parsed.data.businessName,
      city: parsed.data.location,
      phone: `+254${parsed.data.businessPhone}`,
      email: parsed.data.businessEmail,
      address: parsed.data.address ?? null,
      description: parsed.data.description ?? null,
      opening_hours: parsed.data.openingHours ?? null,
      youtube_channel_url: parsed.data.youtubeChannelUrl ?? null,
    })
    .select("id")
    .single();
  if (error || !showroom) {
    logger.error("Failed to create showroom", error);
    if (isNewOwner) {
      // The invite email has already been sent and can't be un-sent, but
      // there's no reason to leave a showroom-less account behind — same
      // "don't leave a dead-end record" reasoning as registerShowroomAction's
      // total-upload-failure rollback.
      const admin = createAdminClient();
      const { error: rollbackError } = await admin.auth.admin.deleteUser(ownerId);
      if (rollbackError) {
        logger.error("Failed to roll back an invited owner after showroom creation failed", rollbackError, { ownerId });
      }
    }
    // showrooms_owner_user_id_active_unique — the chosen owner already has
    // an active (PENDING/APPROVED/SUSPENDED) showroom. searchShowroomOwnerCandidatesAction
    // already excludes such users from the picker, so this is a defensive
    // fallback for a race (e.g. two admins acting on the same user at once),
    // not the primary control.
    return { error: error?.code === "23505" ? "This user already has an active showroom." : "Failed to create showroom." };
  }

  const warnings: string[] = [];
  if (documents.length > 0 && caller) {
    // uploaded_by records the admin performing this action, not the
    // showroom owner — the owner never touched these files.
    const { failedUploads } = await uploadShowroomDocuments(supabase, showroom.id, caller.id, documents, BUSINESS_REGISTRATION_DOCUMENT_TYPE);
    if (failedUploads.length > 0) {
      warnings.push(`${failedUploads.length} document(s) failed to upload (${failedUploads.join(", ")}).`);
    }
  }

  if (logoFile) {
    const { error: logoError } = await uploadEntityLogo(supabase, "showroom-logos", "showrooms", showroom.id, logoFile);
    if (logoError) {
      logger.error("Failed to upload showroom logo", logoError, { showroomId: showroom.id });
      warnings.push("The logo failed to upload — edit the showroom to try again.");
    }
  }

  revalidatePath("/admin/showrooms");
  revalidatePath("/admin");
  return warnings.length > 0 ? { warning: `Showroom created, but ${warnings.join(" ")}` } : {};
}

// Business-detail edits only — status/verified are untouched here (and are
// blocked for a non-admin by prevent_showroom_self_approval regardless),
// kept as a separate action from approve/reject so each stays focused.
export async function updateShowroomAction(formData: FormData): Promise<ShowroomActionResult> {
  const id = formData.get("id");
  if (typeof id !== "string" || !id) return { error: "Missing showroom id." };

  const parsed = adminShowroomSchema.safeParse(readShowroomProfileFormFields(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid showroom details." };

  const logoEntry = formData.get("logo");
  const logoFile = logoEntry instanceof File && logoEntry.size > 0 ? logoEntry : null;
  const removeLogo = formData.get("removeLogo") === "true";
  if (logoFile) {
    const logoError = validateLogoFile(logoFile);
    if (logoError) return { error: logoError };
  }

  const supabase = await createClient();
  const result = await updateShowroomProfile(supabase, id, parsed.data, logoFile, removeLogo);
  if (result.error) return result;

  revalidatePath("/admin/showrooms");
  revalidatePath("/admin");
  return result;
}

export async function deleteShowroomAction(id: string): Promise<ShowroomActionResult> {
  const supabase = await createClient();

  // showroom_documents rows cascade-delete with their parent showroom, but
  // the Storage objects they point at (documents and the logo) don't —
  // collect the paths first so they can be cleaned up after the row delete
  // succeeds, same reasoning as deleteBrandAction's logo cleanup.
  const [{ data: documents }, { data: showroom }] = await Promise.all([
    supabase.from("showroom_documents").select("storage_path").eq("showroom_id", id),
    supabase.from("showrooms").select("logo_storage_path").eq("id", id).maybeSingle(),
  ]);

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

  if (showroom?.logo_storage_path) {
    const { error: removeLogoError } = await supabase.storage.from("showroom-logos").remove([showroom.logo_storage_path]);
    if (removeLogoError) {
      logger.warn("Failed to remove a deleted showroom's logo file", { id, path: showroom.logo_storage_path, error: removeLogoError.message });
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

  // Unlike every other RLS-scoped action in this file, this one calls
  // createAdminClient() (service-role, bypasses RLS entirely) — so RLS's
  // own is_admin() checks provide no protection here regardless of who
  // invokes this Server Action. See assertCallerIsAdmin.
  if (!(await assertCallerIsAdmin())) return { users: [] };

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
