import { z } from "zod";

// A showroom owner's own YouTube videos, shown as a grid on their public
// detail page — distinct from showroomFieldSchemas.youtubeChannelUrl
// (src/features/admin/showroom-schemas.ts), which is the single "View
// Channel" link, not an individual video.
export const showroomVideoFieldSchemas = {
  title: z.string().trim().min(1, "Title is required").max(100, "Title must be under 100 characters"),
  videoUrl: z
    .string()
    .trim()
    .min(1, "Video URL is required")
    .url("Enter a valid URL")
    .refine((value) => {
      try {
        return new URL(value).hostname.endsWith("youtube.com") || new URL(value).hostname.endsWith("youtu.be");
      } catch {
        return false;
      }
    }, "Enter a YouTube video URL"),
};

export const showroomVideoSchema = z.object(showroomVideoFieldSchemas);
export type ShowroomVideoInput = z.infer<typeof showroomVideoSchema>;
