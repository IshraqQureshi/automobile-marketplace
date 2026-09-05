import { logger } from "@/lib/logger";
import type { createClient } from "@/lib/supabase/server";

// Plain module, deliberately not a "use server" file — every top-level
// export of a "use server" file becomes a directly client-invokable Server
// Action regardless of whether any UI actually calls it (see PR #21's code
// review finding on searchShowroomOwnerCandidatesAction). This helper is
// only ever called from within an existing action, so it must stay a
// normal internal function, not a second RPC entry point.

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

/**
 * Uploads each file to the showroom-documents bucket and records a
 * showroom_documents row for it. Shared by the customer self-registration
 * flow (registerShowroomAction) and the admin-created showroom flow
 * (createShowroomAction) — both need the exact same per-file
 * upload-then-record behavior, differing only in what they do with the
 * returned list of failures (registration rolls back on total failure
 * since a document is required there; admin creation treats documents as
 * optional and just surfaces a warning).
 */
export async function uploadShowroomDocuments(
  supabase: SupabaseServerClient,
  showroomId: string,
  uploadedBy: string,
  documents: File[],
  documentType: string,
): Promise<{ failedUploads: string[] }> {
  const failedUploads: string[] = [];

  for (const file of documents) {
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-100);
    const storagePath = `${showroomId}/${crypto.randomUUID()}-${safeName}`;

    const { error: uploadError } = await supabase.storage
      .from("showroom-documents")
      .upload(storagePath, file, { contentType: file.type, upsert: false });
    if (uploadError) {
      logger.error("Failed to upload showroom document", uploadError, { showroomId, fileName: file.name });
      failedUploads.push(file.name);
      continue;
    }

    const { error: documentError } = await supabase.from("showroom_documents").insert({
      showroom_id: showroomId,
      document_type: documentType,
      storage_path: storagePath,
      uploaded_by: uploadedBy,
    });
    if (documentError) {
      logger.error("Failed to record uploaded showroom document", documentError, { showroomId, fileName: file.name });
      failedUploads.push(file.name);
    }
  }

  return { failedUploads };
}
