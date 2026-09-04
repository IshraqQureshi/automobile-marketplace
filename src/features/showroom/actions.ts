"use server";

import { logger } from "@/lib/logger";
import { fieldErrorsFrom } from "@/lib/validation/field-errors";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  ALLOWED_DOCUMENT_MIME_TYPES,
  MAX_DOCUMENTS_PER_SUBMISSION,
  MAX_DOCUMENT_SIZE_BYTES,
  registerShowroomSchema,
  type RegisterShowroomActionState,
} from "./schemas";

const BUSINESS_REGISTRATION_DOCUMENT_TYPE = "business_registration";

export async function registerShowroomAction(
  _prevState: RegisterShowroomActionState,
  formData: FormData,
): Promise<RegisterShowroomActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // The page itself is auth-gated (redirects signed-out visitors to
  // /login), so this shouldn't be reachable signed out — defensive, not the
  // primary control.
  if (!user) {
    return { status: "error", message: "You must be signed in to register a showroom." };
  }

  const parsed = registerShowroomSchema.safeParse({
    businessName: formData.get("businessName"),
    location: formData.get("location"),
    businessPhone: formData.get("businessPhone"),
    businessEmail: formData.get("businessEmail"),
  });
  if (!parsed.success) {
    return { status: "error", message: "Please fix the errors below.", fieldErrors: fieldErrorsFrom(parsed.error) };
  }

  const documents = formData.getAll("documents").filter((entry): entry is File => entry instanceof File && entry.size > 0);
  if (documents.length === 0) {
    return { status: "error", fieldErrors: { documents: "Upload at least one license/registration document." } };
  }
  if (documents.length > MAX_DOCUMENTS_PER_SUBMISSION) {
    return { status: "error", fieldErrors: { documents: `Upload at most ${MAX_DOCUMENTS_PER_SUBMISSION} documents.` } };
  }
  for (const file of documents) {
    if (!ALLOWED_DOCUMENT_MIME_TYPES.includes(file.type as (typeof ALLOWED_DOCUMENT_MIME_TYPES)[number])) {
      return { status: "error", fieldErrors: { documents: `"${file.name}" must be a PDF, JPG, or PNG file.` } };
    }
    if (file.size > MAX_DOCUMENT_SIZE_BYTES) {
      return { status: "error", fieldErrors: { documents: `"${file.name}" is larger than 10MB.` } };
    }
  }

  // One active (PENDING/APPROVED/SUSPENDED) showroom per owner — also
  // enforced at the database level by showrooms_owner_user_id_active_unique,
  // this check just gives a friendlier message than a raw constraint error.
  const { data: existing, error: existingError } = await supabase
    .from("showrooms")
    .select("id, status")
    .eq("owner_user_id", user.id)
    .in("status", ["PENDING", "APPROVED", "SUSPENDED"])
    .maybeSingle();
  if (existingError) {
    logger.error("Failed to check for an existing showroom", existingError, { userId: user.id });
    return { status: "error", message: "Something went wrong. Please try again." };
  }
  if (existing) {
    return {
      status: "error",
      message:
        existing.status === "APPROVED"
          ? "You already have an approved showroom."
          : "You already have a showroom registration pending review.",
    };
  }

  const { data: showroom, error: showroomError } = await supabase
    .from("showrooms")
    .insert({
      owner_user_id: user.id,
      business_name: parsed.data.businessName,
      city: parsed.data.location,
      phone: `+254${parsed.data.businessPhone}`,
      email: parsed.data.businessEmail,
    })
    .select("id")
    .single();
  if (showroomError || !showroom) {
    logger.error("Failed to create showroom", showroomError, { userId: user.id });
    return {
      status: "error",
      message:
        showroomError?.code === "23505" ? "You already have a showroom registration pending review." : "Failed to submit your application. Please try again.",
    };
  }

  const failedUploads: string[] = [];
  for (const file of documents) {
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-100);
    const storagePath = `${showroom.id}/${crypto.randomUUID()}-${safeName}`;

    const { error: uploadError } = await supabase.storage
      .from("showroom-documents")
      .upload(storagePath, file, { contentType: file.type, upsert: false });
    if (uploadError) {
      logger.error("Failed to upload showroom document", uploadError, { showroomId: showroom.id, fileName: file.name });
      failedUploads.push(file.name);
      continue;
    }

    const { error: documentError } = await supabase.from("showroom_documents").insert({
      showroom_id: showroom.id,
      document_type: BUSINESS_REGISTRATION_DOCUMENT_TYPE,
      storage_path: storagePath,
      uploaded_by: user.id,
    });
    if (documentError) {
      logger.error("Failed to record uploaded showroom document", documentError, { showroomId: showroom.id, fileName: file.name });
      failedUploads.push(file.name);
    }
  }

  // If every document failed, the applicant would otherwise be left with a
  // documentless PENDING showroom they have no way to fix themselves — RLS
  // only lets an admin delete a showroom (showrooms_delete_admin_only), and
  // there's no "add documents later" UI yet, so a stuck record here isn't
  // recoverable without manual support intervention. Roll it back via the
  // service-role client (this one narrow case only — every other write in
  // this action goes through the regular RLS-scoped client) so the one-
  // showroom-per-owner constraint doesn't block a clean retry.
  if (failedUploads.length === documents.length) {
    logger.error("Showroom registration failed: every document upload failed, rolling back", undefined, {
      showroomId: showroom.id,
      failedUploads,
    });
    const admin = createAdminClient();
    const { error: rollbackError } = await admin.from("showrooms").delete().eq("id", showroom.id);
    if (rollbackError) {
      logger.error("Failed to roll back showroom after total upload failure", rollbackError, { showroomId: showroom.id });
    }
    return { status: "error", message: "Failed to upload your documents. Please try again." };
  }

  // Deliberately no revalidatePath() here: it would refresh the parent
  // Server Component immediately, which would find the just-created
  // showroom and swap this form out for the page's "already registered"
  // status card before the client ever gets to render the message below
  // (including the partial-upload-failure warning, which would otherwise be
  // silently lost). The next real navigation to this page picks up the new
  // showroom naturally, since it's a dynamically-rendered route.
  if (failedUploads.length > 0) {
    logger.warn("Showroom registration submitted with partial document upload failure", {
      showroomId: showroom.id,
      failedUploads,
    });
    return {
      status: "success",
      message: `Application submitted, but ${failedUploads.length} document(s) failed to upload (${failedUploads.join(", ")}). Our team will follow up about re-submitting them.`,
    };
  }

  return { status: "success", message: "Application submitted. We'll review your business information and documents within 1–2 business days." };
}
