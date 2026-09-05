import { z } from "zod";

export const highlightTitleSchema = z.string().trim().min(1, "Title is required").max(150, "Title must be under 150 characters");

export const highlightVideoUrlSchema = z
  .string()
  .trim()
  .min(1, "Video URL is required")
  .url("Enter a valid URL");

export const highlightPlatformSchema = z.enum(["TIKTOK", "YOUTUBE"], { message: "Choose a platform" });

// Wrapped as a shape object for useFieldValidation's Record<string, ZodType>
// contract, same convention as catalogFieldSchemas/showroomFieldSchemas.
export const highlightFieldSchemas = {
  title: highlightTitleSchema,
  videoUrl: highlightVideoUrlSchema,
  platform: highlightPlatformSchema,
};

export const socialLinkFieldSchemas = {
  tiktokProfileUrl: z.string().trim().url("Enter a valid URL").or(z.literal("")),
  youtubeChannelUrl: z.string().trim().url("Enter a valid URL").or(z.literal("")),
};
