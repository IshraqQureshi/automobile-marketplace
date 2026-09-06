import { describe, expect, it } from "vitest";
import { adminShowroomSchema } from "./showroom-schemas";

const valid = {
  businessName: "AutoElite Motors",
  location: "Westlands, Nairobi",
  businessPhone: "712345678",
  businessEmail: "sales@autoelite.co.ke",
  address: "",
  description: "",
  openingHours: "",
  youtubeChannelUrl: "",
  youtubeVideoUrl: "",
};

describe("adminShowroomSchema — opening hours / YouTube fields", () => {
  it("accepts every optional field left blank", () => {
    expect(adminShowroomSchema.safeParse(valid).success).toBe(true);
  });

  it("accepts a real opening-hours display string", () => {
    const result = adminShowroomSchema.safeParse({ ...valid, openingHours: "Mon–Sat, 8am–6pm" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.openingHours).toBe("Mon–Sat, 8am–6pm");
  });

  it("rejects an opening-hours string over 100 characters", () => {
    expect(adminShowroomSchema.safeParse({ ...valid, openingHours: "a".repeat(101) }).success).toBe(false);
  });

  it("accepts valid YouTube channel/video URLs", () => {
    const result = adminShowroomSchema.safeParse({
      ...valid,
      youtubeChannelUrl: "https://www.youtube.com/@channel",
      youtubeVideoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    });
    expect(result.success).toBe(true);
  });

  it("rejects a malformed YouTube channel URL", () => {
    expect(adminShowroomSchema.safeParse({ ...valid, youtubeChannelUrl: "not-a-url" }).success).toBe(false);
  });

  it("rejects a malformed YouTube video URL", () => {
    expect(adminShowroomSchema.safeParse({ ...valid, youtubeVideoUrl: "not-a-url" }).success).toBe(false);
  });
});
