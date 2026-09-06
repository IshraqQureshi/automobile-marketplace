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
