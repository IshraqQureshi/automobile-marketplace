import { z } from "zod";
import { MAX_HEAD_SNIPPET_LENGTH, parseHeadSnippet } from "@/lib/head-scripts";
import { kenyaLocalPhoneOptionalSchema } from "@/lib/validation/kenya-phone";

// General site-wide settings (system_settings, category 'general'). The
// showroom detail page's "Message" button opens a WhatsApp chat to this one
// global number — configured once here, not per-showroom (see the
// migration comment on why: a single business contact line, not each
// showroom's own number). Reuses the same "+254 prefix chip + local 9-digit
// number" input shape as every other Kenyan phone field in this app
// (kenyaLocalPhoneOptionalSchema — optional since an admin may not have
// configured this yet, in which case the Message button stays disabled
// rather than linking nowhere).
export const generalSettingsFieldSchemas = {
  whatsappContactNumber: kenyaLocalPhoneOptionalSchema,
};

// Validated with the exact parser the root layout renders with, so a snippet
// that saves is guaranteed to render — and one that can't render is rejected
// here with a specific reason instead of silently vanishing from the site.
// Empty is valid (clears the setting).
export const customHeadScriptsSchema = z
  .string()
  .max(MAX_HEAD_SNIPPET_LENGTH, `Keep the snippet under ${MAX_HEAD_SNIPPET_LENGTH.toLocaleString("en-US")} characters.`)
  .superRefine((value, ctx) => {
    const result = parseHeadSnippet(value);
    if (!result.ok) ctx.addIssue({ code: "custom", message: result.error });
  });

export const headScriptsFieldSchemas = {
  customHeadScripts: customHeadScriptsSchema,
};
