import { z } from "zod";
import { ownerFullNameSchema, registerShowroomFieldSchemas } from "@/features/showroom/schemas";
import { getYouTubePlaylistEmbedUrl } from "@/lib/video-embed";
import { kenyaLocalPhoneOptionalSchema } from "@/lib/validation/kenya-phone";

// Generic URL validation (not restricted to tiktok.com specifically) —
// TikTok itself serves videos from several domains depending on how a
// link was copied (tiktok.com, vm.tiktok.com, vt.tiktok.com short links),
// so a domain allowlist would reject legitimate links; the embed step
// (TikTokVideoGrid) is what actually determines whether a given URL
// renders, not this schema.
const showroomTiktokVideoUrlSchema = z
  .string()
  .trim()
  .url("Enter a valid URL")
  .or(z.literal(""))
  .optional()
  .transform((value) => value || undefined);

// Reuses the same business-name/location/phone/email validation the
// self-registration form uses (src/features/showroom/schemas.ts) rather
// than duplicating it — `location` maps to `showrooms.city`, same as
// there. `address`/`description` aren't collected at registration time, so
// there's no existing schema for them to reuse.
export const showroomFieldSchemas = {
  businessName: registerShowroomFieldSchemas.businessName,
  location: registerShowroomFieldSchemas.location,
  businessPhone: registerShowroomFieldSchemas.businessPhone,
  businessEmail: registerShowroomFieldSchemas.businessEmail,
  address: z
    .string()
    .trim()
    .max(200, "Address must be under 200 characters")
    .optional()
    .transform((value) => value || undefined),
  description: z
    .string()
    .trim()
    .max(1000, "Description must be under 1000 characters")
    .optional()
    .transform((value) => value || undefined),
  // Free-text display string (e.g. "Mon-Sat, 8am-6pm"), shown as-is on the
  // public showroom detail page — not a structured per-day schedule, since
  // nothing needs to compute "open now" from it, just display it.
  openingHours: z
    .string()
    .trim()
    .max(100, "Opening hours must be under 100 characters")
    .optional()
    .transform((value) => value || undefined),
  // Unlike youtubePlaylistUrlSchema below (admin-only — a curated playlist
  // from HarakaGari's own channel), this is the showroom's own TikTok
  // account — normal owner-editable profile info, same as businessEmail/
  // businessPhone/address above, not a separate admin-only concept.
  tiktokUrl: z
    .string()
    .trim()
    .url("Enter a valid URL")
    .or(z.literal(""))
    .optional()
    .transform((value) => value || undefined),
  // Up to 4 individual video URLs, embedded directly on the public
  // showroom page — same fixed-slot convention as the vehicle financing
  // form's Tracker 1/2-Year fields (src/features/vehicle/schemas.ts),
  // rather than a dynamic add/remove list, since the count is small and
  // fixed. True "pull the N latest videos automatically" would need
  // TikTok's OAuth Display API (per-showroom login/consent, token
  // storage) — out of scope per direct decision; this is the manual
  // alternative, same tradeoff already made for YouTube (a single
  // manually-set playlist URL, not an API-driven feed).
  tiktokVideoUrl1: showroomTiktokVideoUrlSchema,
  tiktokVideoUrl2: showroomTiktokVideoUrlSchema,
  tiktokVideoUrl3: showroomTiktokVideoUrlSchema,
  tiktokVideoUrl4: showroomTiktokVideoUrlSchema,
};

export const adminShowroomSchema = z.object(showroomFieldSchemas).transform((data) => ({
  ...data,
  tiktokVideoUrls: [data.tiktokVideoUrl1, data.tiktokVideoUrl2, data.tiktokVideoUrl3, data.tiktokVideoUrl4].filter(
    (url): url is string => url != null,
  ),
}));
export type AdminShowroomInput = z.infer<typeof adminShowroomSchema>;

// Deliberately NOT part of showroomFieldSchemas/adminShowroomSchema above —
// those are shared with updateShowroomProfile (src/features/showroom/profile.ts),
// which is also called from the showroom owner's own profile save. This
// field is admin-only (per direct request — showroom owners no longer
// manage their own YouTube content at all): a playlist URL from the real
// HarakaGari YouTube channel, embedded directly on this showroom's public
// detail page. Distinct from the homepage's own admin-wide TikTok/YouTube
// highlights (homepage-highlights-schemas.ts), which are a platform-level
// feature, not per-showroom. Enforced server-side too
// (prevent_showroom_youtube_playlist_self_edit trigger) — this schema
// alone isn't the real boundary, RLS/the trigger is.
export const youtubePlaylistUrlSchema = z
  .string()
  .trim()
  .url("Enter a valid URL")
  .or(z.literal(""))
  // A channel/video/watch URL passes plain .url() validation (it IS a
  // syntactically valid URL) but has no `list=` parameter, so it silently
  // saved with no error and rendered nothing on the public page — a real
  // bug found live: an admin can't tell the difference between "no
  // playlist configured" and "I pasted the wrong kind of YouTube link."
  // Reuses getYouTubePlaylistEmbedUrl (the same function that actually
  // renders the embed) as the single source of truth for "is this
  // resolvable," rather than a second, potentially-drifting check.
  .refine((value) => value === "" || getYouTubePlaylistEmbedUrl(value) !== null, {
    message: 'Enter a real YouTube playlist URL (it must include a "list=" parameter) — a channel or video link won\'t work here.',
  })
  .transform((value) => value || undefined);

export const ownerUserIdSchema = z.string().uuid("Choose an owner for this showroom.");

// Fields for inviting a brand-new user to own the showroom being created,
// as an alternative to picking an existing one via ownerUserIdSchema.
export const newOwnerFieldSchemas = {
  ownerFullName: ownerFullNameSchema,
  ownerEmail: z.string().trim().min(1, "Owner email is required").email("Enter a valid email address"),
  ownerPhone: kenyaLocalPhoneOptionalSchema,
};

export const newOwnerSchema = z.object(newOwnerFieldSchemas);
