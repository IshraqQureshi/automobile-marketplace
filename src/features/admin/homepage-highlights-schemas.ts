import { z } from "zod";

export const highlightTitleSchema = z.string().trim().min(1, "Title is required").max(150, "Title must be under 150 characters");

// Plain z.string().url() accepts any scheme zod recognizes as a valid URL,
// including javascript:/data: — these values get rendered straight into a
// real <a href> (homepage highlight cards, and every page's footer via
// socialUrlSchema below), so an admin account (the only one with write
// access, per system_settings' RLS) could otherwise persist a script-URL
// that fires for every visitor. http(s)-only closes that off.
const httpUrlSchema = z
  .string()
  .trim()
  .url("Enter a valid URL")
  .refine((value) => /^https?:\/\//i.test(value), "Enter a URL starting with http:// or https://");

export const highlightVideoUrlSchema = z.string().trim().min(1, "Video URL is required").pipe(httpUrlSchema);

export const highlightPlatformSchema = z.enum(["TIKTOK", "YOUTUBE"], { message: "Choose a platform" });

// Wrapped as a shape object for useFieldValidation's Record<string, ZodType>
// contract, same convention as catalogFieldSchemas/showroomFieldSchemas.
export const highlightFieldSchemas = {
  title: highlightTitleSchema,
  videoUrl: highlightVideoUrlSchema,
  platform: highlightPlatformSchema,
};

const socialUrlSchema = httpUrlSchema.or(z.literal(""));

export const socialLinkFieldSchemas = {
  tiktokProfileUrl: socialUrlSchema,
  youtubeChannelUrl: socialUrlSchema,
  facebookUrl: socialUrlSchema,
  instagramUrl: socialUrlSchema,
  xUrl: socialUrlSchema,
};
